const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const launch=require('./browser-game-smoke.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/quest-roster');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((request,response)=>{
 let relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname);if(relative.endsWith('/'))relative+='index.html';
 const file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
 response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],checks=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')console.error('BROWSER '+message.text());});
  try{await launch(page,origin);}catch(error){
   await page.screenshot({path:out+'/startup-failure.png'});
   console.error(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(0,2400)}));throw error;
  }
  await page.waitForFunction(()=>document.getElementById('pauseOverlay')?.__runalisGame?.started);
  const result=await page.evaluate(async()=>{
   const game=document.getElementById('pauseOverlay').__runalisGame;
   const {createPlayer,chooseClass}=await import('/src/player.js'),{createDialogueState,openDialogue,updateDialogue,updateDialogueInput,chooseDialogueOption,closeDialogue,startQuest}=await import('/src/dialogueSystem.js');
   const {drawObjects}=await import('/src/objectRenderer.js'),{drawEntityRadar,RADAR_COLORS,buildRadarQuestTargets,classifyRadarMarker}=await import('/src/minimapRadar.js');
   const {createCapitalHubWorld}=await import('/src/hubSystem.js'),{renderUI}=await import('/src/ui.js');
   const p=createPlayer('Visual roster check'),town=createCapitalHubWorld();
   chooseClass(p,'oathkeeper');p.characterCreationComplete=true;p.act1OpeningPending=false;p.capitalUnlocked=true;p.story.flags.opening={introPlayed:true,maraConversationComplete:true};
   const bram={...town.objects.find(o=>o.npcId==='bram'),x:220,y:180};
   const d=createDialogueState();openDialogue(d,bram,p,town);updateDialogue(d,100);
   if(d.options.some(o=>o.startsQuest||o.orderAction))throw Error('Bram offers a retired quest');
   if(!d.options.some(o=>o.id==='train'))throw Error('Training was lost');
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=420;canvas.id='rosterReview';document.body.append(canvas);Object.assign(canvas.style,{position:'fixed',left:'0',top:'0',zIndex:100000});
   const ctx=canvas.getContext('2d'),world={mode:'capital',objects:[bram],enemies:[],effects:[]},cam={x:0,y:0};
   let marks=0;const fill=ctx.fillText.bind(ctx);ctx.fillText=(text,...args)=>{if(text==='!')marks++;return fill(text,...args);};
   p.x=220;p.y=230;drawObjects(ctx,world,cam,p);if(marks)throw Error('Retired quest draws overhead exclamation marks');
   const raw=classifyRadarMarker(bram,'object',buildRadarQuestTargets(p,[bram]));if(raw.color!==RADAR_COLORS.friendly)throw Error('Retired quest giver is blue');
   const radar=document.createElement('canvas');radar.width=radar.height=168;const radarCtx=radar.getContext('2d');
   drawEntityRadar(radarCtx,{player:p,world},168);
   const blue=Array.from(radarCtx.getImageData(0,0,168,168).data).some((v,i,a)=>i%4===0&&v===89&&a[i+1]===173&&a[i+2]===255&&a[i+3]>0);
   if(blue)throw Error('Blue NPC pixels remain on the real radar');
   ctx.drawImage(radar,480,70);ctx.fillStyle='#e8d7af';ctx.font='16px Georgia';ctx.fillText('Training remains; removed errands have no ! or blue marker.',28,350);
   const trainingNpc=bram;game.world=town;game.player=p;game.dialogue=d;
   openDialogue(d,trainingNpc,p,town);updateDialogue(d,100);chooseDialogueOption(d,p,town,d.options.findIndex(o=>o.id==='train'));updateDialogue(d,100);
   for(let i=0;i<4&&!d.fullText.includes('stamina');i++){updateDialogueInput(d,{confirmPressed:true,confirmHeld:false},p,town);updateDialogue(d,100);}
   const trainingReply=d.fullText;if(!trainingReply.includes('stamina'))throw Error('Training response failed');closeDialogue(d,{immediate:true});
   startQuest(p,'mercy_in_orrakai');const mara={...town.objects.find(o=>o.npcId==='maraVell'),id:'visualMara',npcId:'maraVell',kind:'npc',name:'Mara Vell',x:220,y:180};
   const control=document.createElement('canvas');control.width=720;control.height=420;const controlCtx=control.getContext('2d');let mainMarks=0;const controlFill=controlCtx.fillText.bind(controlCtx);controlCtx.fillText=(text,...args)=>{if(text==='!')mainMarks++;return controlFill(text,...args);};
   drawObjects(controlCtx,{...world,objects:[mara]},cam,p);if(!mainMarks)throw Error('Current main-quest overhead marker was lost');
   const mainMarker=classifyRadarMarker(mara,'object',buildRadarQuestTargets(p,[mara]));if(mainMarker.color!==RADAR_COLORS.quest)throw Error('Current main-quest radar marker was lost');
   // Both legacy numeric tutorials used to be regenerated by opening the journal.
   p.quest.firstOath=3;p.quest.hungryShrine=1;p.quests.active.bramLanternDrill={id:'bramLanternDrill',title:'The Lantern Drill',objectives:[]};
   game.uiState.activeMainTab='quests';renderUI(p,[],game,{force:true});
   const journal=document.querySelector('#quests').textContent;
   if(/First Oath|Hungry Shrine|Lantern Drill/.test(journal))throw Error('Retired task returned in rendered journal');
   if(!journal.includes('Mercy in Orrakai'))throw Error('Current main quest missing from rendered journal');
   return {noRetiredOffers:true,trainingReply,noRetiredOverheadMarks:true,noBlueRadarPixels:true,currentMainMarkers:true,renderedJournal:true};
  });
  checks.push(result);await page.locator('#rosterReview').screenshot({path:out+'/markers.png'});
  // Seed a genuine old profile directly, bypassing current save normalization.
  await page.evaluate(async()=>{
   const g=document.getElementById('pauseOverlay').__runalisGame,{createSaveState}=await import('/src/gameSave.js');
   const state=createSaveState(g);state.player.gold=417;state.player.quest.firstOath=3;state.player.quest.hungryShrine=1;
   state.player.quests.active.bramLanternDrill={id:'bramLanternDrill',title:'The Lantern Drill',objectives:[{type:'talk',npcId:'bram',current:0,required:1}]};
   state.player.questState.active.bramLanternDrill={id:'bramLanternDrill',title:'The Lantern Drill'};state.player.questState.activeQuestId='bramLanternDrill';
   localStorage.setItem('runalis-profiles-v7-slim-save',JSON.stringify({oldRoster:{id:'oldRoster',name:'Old roster save',updated:1,state}}));
  });
  await page.reload();await page.locator('[data-load="oldRoster"]').click();await page.waitForFunction(()=>document.getElementById('pauseOverlay')?.__runalisGame?.started);
  const restored=await page.evaluate(()=>{const p=document.getElementById('pauseOverlay').__runalisGame.player;return {gold:p.gold,active:Object.keys(p.quests.active),tracked:p.questState.activeQuestId};});
  assert.equal(restored.gold,417);assert(!restored.active.includes('bramLanternDrill'));assert.notEqual(restored.tracked,'bramLanternDrill');assert(restored.active.includes('mercy_in_orrakai'));checks.push({legacyProfileRestored:true,...restored});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{server.close();console.error(error);process.exitCode=1;});
