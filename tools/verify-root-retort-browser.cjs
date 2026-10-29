const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const out='docs/root-retort',base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],checks=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.rootRetortGame=()=>currentGame;'}));
  await page.goto(base+'/');
  await page.evaluate(async()=>{
   const {writeProfiles}=await import('/src/gameSave.js'),{createPlayer,chooseClass}=await import('/src/player.js');const p=createPlayer('Root & Retort review');chooseClass(p,'oathkeeper');p.characterCreationComplete=true;p.act1OpeningPending=true;
   writeProfiles({rootRetortReview:{id:'rootRetortReview',name:p.name,updated:1,state:{version:18,player:p,worldMode:'act1Opening',worldName:'The Zarynth Road'}}});
  });await page.reload();await page.locator('[data-load="rootRetortReview"]').click();await page.waitForFunction(()=>window.rootRetortGame?.()?.world?.mode==='act1Opening',null,{timeout:60000});
  await page.evaluate(async()=>{const {requestAct1OpeningSkip}=await import('/src/act1OpeningSystem.js');requestAct1OpeningSkip(rootRetortGame());});await page.waitForFunction(()=>rootRetortGame().world.mode==='maraHouse',null,{timeout:15000});
  await page.waitForFunction(()=>rootRetortGame().dialogue.active,null,{timeout:10000});
  const opening=await page.evaluate(async()=>{
   const g=rootRetortGame(),{getDialogue}=await import('/src/worldContent.js'),{updateDialogue,chooseDialogueOption,updateDialogueInput}=await import('/src/dialogueSystem.js');
   const pending=['where','caravan','who','next'];for(let i=0;i<250&&g.dialogue.active;i++){
    updateDialogue(g.dialogue,10);const index=g.dialogue.options.findIndex(o=>o.id===(pending[0]||'leave')&&!o.disabled);
    if(index>=0){if(!chooseDialogueOption(g.dialogue,g.player,g.world,index))throw Error('Opening choice failed');pending.shift();}else updateDialogueInput(g.dialogue,{confirmPressed:true,confirmHeld:false},g.player,g.world);
   }
   if(pending.length||g.dialogue.active)throw Error('Opening failed to conclude');return {name:g.world.name,stage:g.player.quests.active.mercy_in_orrakai.currentStageId,role:getDialogue('maraMercyOpening').options.find(o=>o.id==='who').response,down:g.world.objects.find(o=>o.id==='maraHouseDoor').name};
  });assert.match(opening.name,/Root & Retort/);assert.match(opening.role,/apothecary’s daughter/);assert.equal(opening.stage,'findWardenMael');checks.push('Actual ambush recovery and all opening questions');
  await page.waitForTimeout(400);await page.locator('#game').screenshot({path:out+'/upstairs.png'});
  const downstairs=await page.evaluate(async()=>{
   const g=rootRetortGame(),{interact,nearestObject}=await import('/src/gameInteraction.js'),{inBuilding,migrateOrrakaiPosition}=await import('/src/orrakaiLayout.js');
   const stairs=g.world.objects.find(o=>o.id==='maraHouseDoor');Object.assign(g.player,{x:stairs.x,y:stairs.y-24,moveTarget:null});if(nearestObject(g)?.id!==stairs.id)throw Error('Down stairs not selected');interact(g);
   if(migrateOrrakaiPosition(g.world,g.player))throw Error('Town migration displaced the shop arrival');return {mode:g.world.mode,inside:inBuilding(g.world.buildings.find(b=>b.id==='alchemist'),g.player.x,g.player.y),nearest:nearestObject(g)?.id,mara:g.world.objects.filter(o=>o.npcId==='maraVell').length};
  });assert.equal(downstairs.mode,'capital');assert(downstairs.inside);assert.equal(downstairs.nearest,'maraHomeEntrance');assert.equal(downstairs.mara,0);checks.push('Actual interaction descends into the shop without a duplicate Mara');
  await page.waitForTimeout(600);await page.locator('#game').screenshot({path:out+'/shop.png'});
  const service=await page.evaluate(async()=>{
   const g=rootRetortGame(),{interact}=await import('/src/gameInteraction.js'),{updateDialogue,chooseDialogueOption}=await import('/src/dialogueSystem.js'),{addItem,countItem}=await import('/src/player.js');
   const alchemist=g.world.objects.find(o=>o.npcId==='orenFenwick');if(!alchemist)throw Error('Oren missing');Object.assign(g.player,{x:alchemist.x,y:alchemist.y+24,moveTarget:null});interact(g);updateDialogue(g.dialogue,100);
   const index=g.dialogue.options.findIndex(o=>o.id==='mara-restorative');if(index<0)throw Error('No Oren restorative option');addItem(g.player,'gravecap',1);addItem(g.player,'paleEssence',1);const before=countItem(g.player,'shrineTonic');
   if(!chooseDialogueOption(g.dialogue,g.player,g.world,index))throw Error('Cannot choose service');const action=g.dialogue.pendingAction?.type;if(!g.handlePendingDialogueAction())throw Error('Real dialogue action handler failed');return {action,tonics:countItem(g.player,'shrineTonic')-before};
  });assert.equal(service.action,'maraApothecary');assert.equal(service.tonics,1);checks.push('Oren dialogue dispatches the real restorative service');
  const walk=await page.evaluate(async()=>{
   const g=rootRetortGame(),{isActorPositionPassable,moveActorWithCollision}=await import('/src/world.js');
   function follow(x,y){
    const start=[Math.floor(g.player.x/32),Math.floor(g.player.y/32)],key=(x,y)=>x+','+y,end=key(x,y),q=[start],parents=new Map([[key(...start),null]]);let found=false;
    for(let i=0;i<q.length;i++){const[a,b]=q[i],here=key(a,b);if(here===end){found=true;break;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,ny=b+dy,k=key(nx,ny);if(parents.has(k)||!isActorPositionPassable(g.world,(nx+.5)*32,(ny+.5)*32,12))continue;parents.set(k,here);q.push([nx,ny]);}}
    if(!found)throw Error('No physical route to '+end);const path=[];for(let step=end;step;step=parents.get(step))path.push(step.split(',').map(Number));path.reverse();
    for(const[a,b]of path){moveActorWithCollision(g.player,g.world,(a+.5)*32-g.player.x,(b+.5)*32-g.player.y,12);if(Math.hypot(g.player.x-(a+.5)*32,g.player.y-(b+.5)*32)>1)throw Error('Blocked at '+a+','+b);}return path.length;
   }
   window.rootRetortFollow=follow;const steps=follow(49,43);g.camera.x=g.player.x-g.canvas.width/2;g.camera.y=g.player.y-g.canvas.height/2;return {steps,mode:g.world.mode};
  });assert.equal(walk.mode,'capital');assert(walk.steps>=4);checks.push('Walk from the shop through its south door to the street');await page.waitForTimeout(600);await page.locator('#game').screenshot({path:out+'/street.png'});
  const revisit=await page.evaluate(async()=>{
   const g=rootRetortGame(),{interact,nearestObject}=await import('/src/gameInteraction.js'),{createSaveState,applySaveToGame}=await import('/src/gameSave.js');
   rootRetortFollow(55,40);const groundStage=g.player.quests.active.mercy_in_orrakai.currentStageId;let save=JSON.parse(JSON.stringify(createSaveState(g)));if(!applySaveToGame(g,save))throw Error('Shop save/load failed');
   if(nearestObject(g)?.id!=='maraHomeEntrance')throw Error('Return stairs unavailable after shop reload');interact(g);if(g.world.mode!=='maraHouse')throw Error('Upstairs interaction failed');
   save=JSON.parse(JSON.stringify(createSaveState(g)));if(!applySaveToGame(g,save))throw Error('Upstairs save/load failed');return {mode:g.world.mode,name:g.world.name,stage:g.player.quests.active.mercy_in_orrakai.currentStageId,groundStage,openingComplete:g.player.story.flags.opening.maraConversationComplete};
  });assert.equal(revisit.mode,'maraHouse');assert.match(revisit.name,/Root & Retort/);assert.equal(revisit.stage,revisit.groundStage);assert(revisit.openingComplete);checks.push('Walk back, return upstairs, and save/load on both floors');await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>rootRetortGame().dialogue.active),false);await page.locator('#game').screenshot({path:out+'/upstairs-return.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({checks,opening,downstairs,service,walk,revisit,errors,missing},null,2));console.log(JSON.stringify({checks:checks.length,opening,downstairs,service,walk,revisit,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
