const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/veyreign-online';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{
  async function open(name,touch=false){
   const page=await browser.newPage({viewport:{width:touch?844:1280,height:touch?390:800},isMobile:touch,hasTouch:touch});
   page.on('pageerror',e=>errors.push(name+': '+e.message));
   await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unavailable in browser test');};});
   if(process.env.RUNALIS_SIGNAL_PORT)await page.addInitScript(port=>{window.RUNALIS_NETWORK_CONFIG={host:'127.0.0.1',port:Number(port),path:'/',secure:false,config:{iceServers:[]}};},process.env.RUNALIS_SIGNAL_PORT);
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.onlineGame=()=>currentGame;'}));
   await launch(page,base);await page.waitForFunction(()=>window.onlineGame?.()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
   await page.evaluate(name=>{onlineGame().player.name=name;onlineGame().profileName=name;},name);return page;
  }
  async function menu(page){await page.evaluate(()=>onlineGame().onlineSession.openMenu());}
  const host=await open('Online host'),guest=await open('Online guest',true),password='Runalis-test-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  await host.keyboard.press('Tab');await host.locator('[data-menu-action="multiplayer"]').click();await host.locator('[data-online-password]').fill(password);await host.locator('[data-online-host]').click();
  try{await host.waitForFunction(()=>onlineGame().onlineSession.role==='host',null,{timeout:30000});}catch(e){throw Error('Hosting failed: '+await host.locator('[data-online-status]').innerText());}
  await host.screenshot({path:out+'/open-world.png'});await host.locator('[data-online-close]').click();checks.push('Real Open World menu registers password room');
  await menu(guest);await guest.locator('[data-online-password]').fill(password);await guest.locator('[data-online-join]').click();
  try{await guest.waitForFunction(()=>onlineGame().onlineSession.role==='guest'&&onlineGame().onlineSession.ready,null,{timeout:30000});}catch(e){throw Error('Joining failed: '+await guest.locator('[data-online-status]').innerText());}
  await host.waitForFunction(()=>[...onlineGame().onlineSession.clients.values()].some(c=>c.actor&&c.ready));await guest.waitForFunction(()=>onlineGame().player.coop.players.some(p=>p.name==='Online host'));
  await guest.waitForFunction(()=>!document.body.classList.contains('couch-coop-active')&&getComputedStyle(document.querySelector('#unitFramesHud')).display!=='none');
  checks.push('Separate browser profiles connect over native WebRTC and join the same host world');

  await host.evaluate(async()=>{const g=onlineGame(),{createDungeonWorld}=await import('/src/dungeonSystem.js'),{updateVeyreign}=await import('/src/veyreignDungeon.js'),{updateEnemies}=await import('/src/combat.js'),{closeDialogue}=await import('/src/dialogueSystem.js');g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:5,playerCount:2});const guest=g.player.coop.players[0];for(const a of [g.player,guest]){Object.assign(a,g.world.spawn);a.hp=a.maxHp=100000;}g.world.bossArena.phase='active';updateVeyreign(g);closeDialogue(g.dialogue,{immediate:true});g.world.enemies[0].hp=0;updateEnemies(0,g.player,g.world,g.log,1,g);if(g.world.dungeonState.cleared)throw Error('Early first-bar completion');(await import('/src/veyreignCombat.js')).updateVeyreignCombat(g.world.enemies[0],g.world,g.player,4.1,2,g);g.world.enemies[0].hp=0;updateEnemies(0,g.player,g.world,g.log,3,g);updateVeyreign(g);const npc=g.world.objects.find(o=>o.npcId==='veyreignAlistair');Object.assign(guest,{x:npc.x,y:npc.y+25});g.player.x=npc.x+150;g.player.y=npc.y+25;guest.dialogueSettings={instantText:true};});
  await guest.waitForFunction(()=>onlineGame().world.objects.some(o=>o.npcId==='veyreignAlistair'));
  const interact=await guest.locator('[data-hold="interact"]').boundingBox();await guest.touchscreen.tap(interact.x+interact.width/2,interact.y+interact.height/2);
  await guest.locator('#mobileDialogue').waitFor();if(await guest.locator('[data-mobile-dialogue-next]').isVisible())await guest.locator('[data-mobile-dialogue-next]').tap();await guest.locator('[data-mobile-dialogue-choice="1"]').waitFor();await guest.locator('[data-mobile-dialogue-choice="1"]').tap();
  await host.waitForFunction(()=>onlineGame().player.coop.players[0].bloodline?.id==='vampire');await guest.waitForFunction(()=>onlineGame().player.bloodline?.id==='vampire');assert(!await host.evaluate(()=>!!onlineGame().player.bloodline?.id));
  const save=await guest.evaluate(()=>onlineGame().onlineSession.guestSaveState());assert.equal(save.player.bloodline.id,'vampire');assert(save.player.veyreignCompleted);await guest.screenshot({path:out+'/guest-curse.png'});assert.deepEqual(errors,[]);console.log('PASS real WebRTC guest interacts with defeated Alistair, accepts via mobile button, host applies curse only to guest, profile persists completion and vampire bloodline');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
