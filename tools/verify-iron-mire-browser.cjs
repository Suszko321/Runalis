const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],out='docs/iron-mire';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.ironReviewGame=()=>currentGame;'}));
  await launch(page,process.env.RUNALIS_URL||'http://127.0.0.1:8766');await page.waitForFunction(()=>ironReviewGame()?.started);
  await page.evaluate(async()=>{
   const g=ironReviewGame(),{enterDungeon}=await import('/src/dungeonSystem.js');
   g.world=(await import('/src/world.js')).createWorld();
   const entrance=g.world.continentRuntime.allObjects.find(o=>o.id==='ironMireDungeonEntrance');if(!entrance)throw Error('Physical entrance missing');
   Object.assign(g.player,{x:entrance.x,y:entrance.y});if(!enterDungeon(g,entrance))throw Error('Entry rejected');g.paused=true;
   g.player.invulnerableUntil=performance.now()/1000+1000;
   const npc=g.world.objects.find(o=>o.npcId==='ironMireSurveyor');Object.assign(g.player,{x:npc.x,y:npc.y+32});g.camera.x=g.player.x-640;g.camera.y=g.player.y-450;
   const {interact}=await import('/src/gameInteraction.js'),{updateDialogue,chooseDialogueOption,closeDialogue}=await import('/src/dialogueSystem.js');
   interact(g);updateDialogue(g.dialogue,100);const i=g.dialogue.options.findIndex(o=>o.id==='plan');if(i<0||!chooseDialogueOption(g.dialogue,g.player,g.world,i))throw Error('Surveyor conversation failed');closeDialogue(g.dialogue,{immediate:true});
   (await import('/src/ironMireDungeon.js')).updateIronMire(g);
  });
  await page.waitForFunction(async()=>{const{asset}=await import('/src/spriteArt.js');return asset('dungeon-iron-foreman').ready&&asset('dungeon-iron-machinery').ready;});
  await page.waitForTimeout(200);await page.locator('#game').screenshot({path:out+'/receiving-refuge.png'});
  const progress=await page.evaluate(async()=>{
   const g=ironReviewGame(),{interact}=await import('/src/gameInteraction.js'),{updateEnemies}=await import('/src/combat.js'),{updateIronMire}=await import('/src/ironMireDungeon.js');
   const keys=g.world.objects.filter(o=>o.ironMireControl).map(o=>o.ironMireControl);
   for(const key of keys){const o=g.world.objects.find(o=>o.ironMireControl===key);Object.assign(g.player,{x:o.x,y:o.y+16});interact(g);if(g.world.dungeonState.ironMire.controls[key])throw Error('Guard bypass');for(const e of g.world.enemies.filter(e=>e.ironMireGuard===o.ironMireGuard))e.hp=0;updateEnemies(0,g.player,g.world,g.log,performance.now()/1000,g);interact(g);if(!g.world.dungeonState.ironMire.controls[key])throw Error('Control failed');}
   updateIronMire(g);const valve=g.world.objects.find(o=>o.ironMireControl==='eastPump');g.camera.x=valve.x-640;g.camera.y=valve.y-430;
   return {guardGates:true,pumps:true};
  });
  await page.waitForTimeout(150);await page.locator('#game').screenshot({path:out+'/pump-gallery.png'});
  await page.evaluate(async()=>{
   const g=ironReviewGame(),{transitionDungeonFloor}=await import('/src/dungeonSystem.js');if(!transitionDungeonFloor(g,g.world.objects.find(o=>o.direction==='down')))throw Error('First lift failed');
   const record=g.world.objects.find(o=>o.ironMireControl==='crew1');Object.assign(g.player,{x:record.x+80,y:record.y+100});g.camera.x=record.x-640;g.camera.y=record.y-420;
  });
  await page.waitForTimeout(150);await page.locator('#game').screenshot({path:out+'/drowned-shifts.png'});
  await page.evaluate(async()=>{
   const g=ironReviewGame(),{updateEnemies}=await import('/src/combat.js'),{handleIronMireInteraction,updateIronMire}=await import('/src/ironMireDungeon.js'),{transitionDungeonFloor}=await import('/src/dungeonSystem.js');
   for(const e of g.world.enemies)e.hp=0;updateEnemies(0,g.player,g.world,g.log,performance.now()/1000,g);
   for(const o of g.world.objects.filter(o=>o.ironMireControl))handleIronMireInteraction(g,o);
   if(!transitionDungeonFloor(g,g.world.objects.find(o=>o.direction==='down')))throw Error('Deep lift failed');updateIronMire(g);
   const boss=g.world.enemies.find(e=>e.ironMireForeman);Object.assign(g.player,{x:boss.x+200,y:boss.y+150});
   (await import('/src/dungeonArenaSystem.js')).updateDungeonArena(g.world,g.player,g);
   if(g.world.bossArena.phase!=='active')throw Error('Boss arena failed to seal');g.camera.x=boss.x-640;g.camera.y=boss.y-350;
  });
  await page.waitForTimeout(200);await page.locator('#game').screenshot({path:out+'/foreman.png'});
  for(const key of ['pick','chain','collapse','flood','bell']){
   await page.evaluate(async key=>{const g=ironReviewGame(),e=g.world.enemies.find(e=>e.ironMireForeman);e.ironMirePhase=3;e.hp=e.maxHp*.3;const a=(await import('/src/ironMireCombat.js')).beginIronMireMove(e,g.world,g.player,key);a.elapsed=.4;},key);
   await page.waitForTimeout(80);await page.locator('#game').screenshot({path:`${out}/tell-${key}.png`});
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=ironReviewGame(),e=g.world.enemies.find(e=>e.ironMireForeman);g.camera.x=e.x-g.canvas.width/2;g.camera.y=e.y-g.canvas.height*.76;});
  await page.waitForTimeout(150);await page.locator('#game').screenshot({path:out+'/compact-foreman.png'});
  const result=await page.evaluate(async()=>{
   const g=ironReviewGame(),{createSaveState,applySaveToGame}=await import('/src/gameSave.js');if(!applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))))throw Error('Reload failed');
   const e=g.world.enemies.find(e=>e.ironMireForeman);if(g.world.bossArena.phase!=='active'||e.ironMireAttack)throw Error('Unsafe attack or lost arena after reload');
   e.hp=0;(await import('/src/combat.js')).updateEnemies(0,g.player,g.world,g.log,performance.now()/1000,g);(await import('/src/ironMireDungeon.js')).updateIronMire(g);
   if(!g.world.dungeonState.cleared||g.player.quests.active.ironMireLastShift.currentStageId!=='report')throw Error('Victory did not advance quest');
   const portal=g.world.objects.find(o=>o.returnPortal);if(!(await import('/src/dungeonSystem.js')).exitDungeon(g,portal))throw Error('Victory portal failed');return {questReport:true,arenaReload:true,victory:true,surface:g.world.mode};
  });
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({progress,result,errors},null,2));console.log('PASS',JSON.stringify({progress,result,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
