const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/orrakai-watch',errors=[];fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.watchReviewGame=()=>currentGame;'}));
  await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const {writeProfiles}=await import('/src/gameSave.js'),{createPlayer,chooseClass}=await import('/src/player.js');const p=createPlayer('Orrakai watch review');chooseClass(p,'oathkeeper');p.characterCreationComplete=true;p.story.flags.opening={introPlayed:true,maraConversationComplete:true};
   writeProfiles({watchReview:{id:'watchReview',name:p.name,updated:1,state:{version:18,player:p,worldMode:'capital',worldName:'Orrakai'}}});
  });await page.reload();
  try{await page.locator('[data-load="watchReview"]').click();}catch(e){await page.screenshot({path:out+'/launch-failure.png'});console.error(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(0,1500)}));throw e;}
  await page.waitForFunction(()=>watchReviewGame()?.world.mode==='capital');
  const posts=await page.evaluate(async()=>{const {ORRAKAI_WATCH_POSTS}=await import('/src/orrakaiLayout.js');return ORRAKAI_WATCH_POSTS;});
  const checks=[];
  for(const post of posts){
   await page.evaluate(async id=>{
    const g=watchReviewGame(),{getQuest}=await import('/src/worldContent.js'),{startQuest,closeDialogue,npcHasQuestInteraction}=await import('/src/dialogueSystem.js');closeDialogue(g.dialogue,{immediate:true});
    startQuest(g.player,'mercy_in_orrakai');const q=g.player.quests.active.mercy_in_orrakai,def=getQuest(q.id),i=def.stages.findIndex(s=>s.id==='aidPlagueTents');Object.assign(q,{stageIndex:i,currentStageId:def.stages[i].id,objectives:def.stages[i].objectives.map(o=>({...o,current:0}))});g.player.story.flags.mercy||={};delete g.player.story.flags.mercy.guardReportHeard;
    const guard=g.world.objects.find(o=>o.id===id);if(!npcHasQuestInteraction(g.player,guard))throw Error('Missing guard quest marker');Object.assign(g.player,{x:guard.x+48,y:guard.y,moveTarget:null});g.camera.x=g.player.x-g.canvas.width/2;g.camera.y=g.player.y-g.canvas.height/2;
   },post.id);
   await page.waitForTimeout(650);await page.locator('#game').screenshot({path:out+'/'+post.npcId+'.png'});
   checks.push(await page.evaluate(async id=>{
    const g=watchReviewGame(),{interact,nearestObject}=await import('/src/gameInteraction.js'),{updateDialogue,chooseDialogueOption,closeDialogue,npcHasQuestInteraction}=await import('/src/dialogueSystem.js');const nearest=nearestObject(g);if(nearest?.id!==id)throw Error('Guard cannot be selected: '+id+' / '+nearest?.id);interact(g);updateDialogue(g.dialogue,100);const i=g.dialogue.options.findIndex(o=>o.id==='record'&&!o.disabled);if(i<0||!chooseDialogueOption(g.dialogue,g.player,g.world,i))throw Error('Guard report failed');closeDialogue(g.dialogue,{immediate:true});
    if(!g.player.story.flags.mercy.guardReportHeard)throw Error('Report not persisted');if(g.world.objects.filter(o=>o.orrakaiWatch).some(o=>npcHasQuestInteraction(g.player,o)))throw Error('Stale guard markers');return {id,realInteraction:true,reportComplete:true};
   },post.id));
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
