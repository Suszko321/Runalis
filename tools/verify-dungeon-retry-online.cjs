const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/dungeon-retry';
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


  await host.evaluate(async()=>{
   const g=onlineGame(),d=await import('/src/dungeonSystem.js'),{createWorld}=await import('/src/world.js');g.world=createWorld();window.retryEntrance={id:'castleVeyrOverworldEntrance',dungeonId:'castleVeyr',name:'Castle Veyreign',x:18096,y:3376};d.enterDungeon(g,retryEntrance,{partyEntryCommitted:true});
   for(let f=1;f<=4;f++)for(let i=0;i<2;i++)g.world.dungeonState.veyreign.seals[`${f}-${i}`]=true;
   g.world=d.createDungeonWorld({dungeonId:'castleVeyr',floor:5,dungeonState:g.world.dungeonState,playerCount:2});g.world.dungeonState.veyreign.seen[5]=true;g.world.bossArena.phase='active';
   for(const [i,a]of [g.player,...g.player.coop.players].entries())Object.assign(a,{x:g.world.bossRoomCenter.x+(i?32:-32),y:g.world.bossRoomCenter.y,hp:1,invulnerableUntil:0,lifeState:'alive'});
   (await import('/src/veyreignCombat.js')).beginVeyreignMove(g.world.enemies[0],g.world,g.player,'hearts');g.paused=false;
  });
  await host.locator('#deathScreenOverlay.active').waitFor({timeout:20000});await host.locator('[data-death-respawn]').waitFor({state:'visible'});await host.locator('[data-death-respawn]').click();
  await guest.waitForFunction(()=>onlineGame().world.mode==='overworld'&&onlineGame().player.hp>0);
  assert(await host.evaluate(()=>{const g=onlineGame(),s=g.world.navStones.find(s=>s.id==='nav-hearthmereFrontier-castleVeyr');return [g.player,...g.player.coop.players].every(a=>a.hp>0&&Math.hypot(a.x-s.x,a.y-s.y)<70)&&g.player.worldMemory.dungeonRuns.castleVeyr.bossRetry.floor===5;}));
  await guest.screenshot({path:out+'/online-party-nav-stone.png'});console.log('PASS real two-player lethal boss volley: full party wipe and shared return to Castle Nav Stone');
  await host.evaluate(async()=>{const g=onlineGame();(await import('/src/dungeonSystem.js')).enterDungeon(g,retryEntrance);});
  await host.locator('[data-entry-vote="0:true"]').click();await guest.locator('[data-entry-vote="1:true"]').tap();
  await guest.waitForFunction(()=>onlineGame().world.mode==='dungeon'&&onlineGame().world.floor===5);
  assert(await host.evaluate(()=>{const g=onlineGame(),a=g.world.bossArena;return a.phase==='dormant'&&[g.player,...g.player.coop.players].every(p=>p.y>a.y+a.h)&&g.world.enemies[0].hp===g.world.enemies[0].maxHp;}));
  await host.evaluate(()=>Object.assign(onlineGame().player,onlineGame().world.bossRoomCenter));
  await host.locator('[data-entry-vote="0:true"]').click();await guest.locator('[data-entry-vote="1:true"]').tap();
  await host.waitForFunction(()=>onlineGame().world.bossArena.phase==='active');await guest.waitForFunction(()=>onlineGame().world.bossArena.phase==='active');
  console.log('PASS real WebRTC retry: both players accept dungeon entry, arrive safely outside boss room, then separately accept the boss fight');
  assert.deepEqual(errors,[]);console.log('PASS online defeat/retry consent and no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
