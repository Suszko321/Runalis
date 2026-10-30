const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/veyreign-population';
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


  for(const modifier of ['freezer','waller','regenerator']){
   const before=await host.evaluate(async modifier=>{
    const g=onlineGame(),{createDungeonWorld}=await import('/src/dungeonSystem.js');g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:1,playerCount:2});g.world.dungeonState.veyreign.seen[1]=true;
    const e=g.world.enemies.find(e=>e.eliteModifier===modifier),r=g.world.rooms.find(r=>e.x>=r.x*32&&e.x<(r.x+r.w)*32&&e.y>=r.y*32&&e.y<(r.y+r.h)*32);g.world.enemies=[e];e.x=e.homeX=r.cx*32-160;e.y=e.homeY=r.cy*32;e.isInCombat=true;e.hp=Math.floor(e.maxHp/2);
    Object.assign(g.player,{x:r.cx*32+250,y:r.cy*32,hp:100000,maxHp:100000,invulnerableUntil:1e9});Object.assign(g.player.coop.players[0],{x:r.cx*32,y:r.cy*32,hp:100000,maxHp:100000,invulnerableUntil:1e9});g.paused=false;
    window.eliteQA=await import('/src/eliteEncounterSystem.js');return e.hp;
   },modifier);
   await host.waitForFunction(modifier=>{const g=onlineGame(),e=g.world.enemies[0],ready=modifier==='regenerator'?e.eliteHealing&&eliteQA.getEliteStatePresentation(e).healProgress>.1:eliteQA.getEliteHazards(g.world).some(h=>h.kind===modifier&&h.age>=h.warning+.05&&(modifier!=='waller'||h.segments?.length));if(ready)g.paused=true;return ready;},modifier,{timeout:20000});
   await guest.evaluate(async()=>window.eliteQA=await import('/src/eliteEncounterSystem.js'));
   await guest.waitForFunction(modifier=>{const g=onlineGame(),e=g.world.enemies[0];return g.world.networkGuest&&e?.eliteModifier===modifier&&(modifier==='regenerator'?e.eliteHealing&&eliteQA.getEliteStatePresentation(e).healProgress>.1:eliteQA.getEliteHazards(g.world).some(h=>h.kind===modifier&&h.age>=h.warning&&h.owner===e&&(modifier!=='waller'||h.segments?.length)))&&eliteQA.getEliteActors(g.world).includes(g.player);},modifier,{timeout:20000});
   await guest.screenshot({path:out+'/online-'+modifier+'.png'});
   if(modifier==='regenerator'){await host.evaluate(()=>onlineGame().paused=false);await guest.waitForFunction(hp=>onlineGame().world.enemies[0].hp>hp,before);await host.evaluate(()=>onlineGame().paused=true);}
   assert(await guest.evaluate(()=>!('networkPresentation' in onlineGame().onlineSession.guestSaveState().player)));
   console.log('PASS real WebRTC mobile guest sees authored '+modifier+' cast, live caster/party references and host-owned healing');
  }
  assert.deepEqual(errors,[]);console.log('PASS online modifier visuals and no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
