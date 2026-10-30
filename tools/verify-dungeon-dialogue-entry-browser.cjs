const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8775';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true}),errors=[];try{
 for(const mobile of [false,true]){
  const p=await b.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>Element.prototype.requestFullscreen=async()=>{throw Error('test');});
  await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.entryGame=()=>currentGame;'}));
  await launch(p,base);await p.waitForFunction(()=>entryGame()?.started&&!document.querySelector('#loadingScreen.active'));
  for(const type of ['grove','orchard','veyreign']){
   await p.evaluate(async type=>{
    const g=entryGame(),{closeDialogue}=await import('/src/dialogueSystem.js');closeDialogue(g.dialogue,{immediate:true});
    if(type==='grove'){const m=await import('/src/blightedGrove.js');g.world=m.createBlightedGrove();m.beginBlightedGrove(g);}
    else{g.world=(await import('/src/dungeonSystem.js')).createDungeonWorld({dungeonId:type==='orchard'?'ashenOrchard':'castleVeyr',floor:1});if(type==='orchard')(await import('/src/ashenOrchardDungeon.js')).beginOrchardDungeon(g);else(await import('/src/veyreignDungeon.js')).updateVeyreign(g);}
    Object.assign(g.player,g.world.spawn);g.player.moveTarget=null;g.player.invulnerableUntil=performance.now()/1000+100;g.camera={x:g.player.x-g.canvas.width/2,y:g.player.y-g.canvas.height/2};g.renderOwnedUI();
   },type);
   await p.waitForTimeout(500);assert(!await p.evaluate(()=>entryGame().dialogue.active),'Arrival remains quiet');
   await p.evaluate(type=>{const g=entryGame(),npc=g.world.objects.find(o=>type==='grove'?o.groveSkull:type==='orchard'?o.npcId==='orchardTamsin':o.veyreignChapter===1);Object.assign(g.player,{x:npc.x,y:npc.y+24});g.player.moveTarget=null;},type);
   if(mobile)await p.locator('[data-hold="interact"]').tap();else await p.keyboard.press('e');
   await p.waitForFunction(()=>entryGame().dialogue.active);
   assert.match(await p.evaluate(()=>entryGame().dialogue.speakerName),type==='grove'?/Edda/:type==='orchard'?/Tamsin/:/Edrik/);
   console.log('PASS '+(mobile?'touch':'keyboard')+' '+type+': explore first, interact to talk');
  }
  await p.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
