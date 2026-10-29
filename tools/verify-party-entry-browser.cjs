const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/party-entry';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{
  async function open(name,mobile=false){
   const p=await browser.newPage({viewport:{width:mobile?844:1280,height:mobile?390:800},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(name+': '+e.message));
   await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.entryGame=()=>currentGame;'}));
   await launch(p,base);await p.waitForFunction(()=>window.entryGame?.()?.started);await p.evaluate(name=>{entryGame().player.name=name;},name);return p;
  }
  async function connect(p,kind,password){await p.evaluate(()=>entryGame().onlineSession.openMenu());await p.locator('[data-online-password]').fill(password);await p.locator(kind==='host'?'[data-online-host]':'[data-online-join]').click();await p.waitForFunction(kind=>entryGame().onlineSession.role===kind&&(kind==='host'||entryGame().onlineSession.ready),kind,{timeout:35000});if(kind==='host')await p.locator('[data-online-close]').click();}
  const host=await open('Ready host'),guests=[],password='Runalis-entry-'+crypto.randomUUID();await connect(host,'host',password);
  for(let i=0;i<3;i++){const p=await open('Ready guest '+(i+1),i===0);await connect(p,'guest',password);guests.push(p);}
  const pages=[host,...guests];await host.waitForFunction(()=>entryGame().player.coop.players.length===3&&[...entryGame().onlineSession.clients.values()].every(c=>c.ready));
  async function request(){await host.evaluate(()=>entryGame().enterDungeon({id:'ready-review-orchard',dungeonId:'ashenOrchard',name:'Ashen Orchard',x:entryGame().player.x,y:entryGame().player.y}));for(const p of pages)await p.locator('#partyEntryPanel').waitFor();}
  await request();for(const p of pages)assert.equal(await p.locator('#partyEntryPanel button').count(),2,'Each browser may answer only for itself');
  assert.match(await host.locator('#partyEntryPanel').innerText(),/10s remaining|9s remaining/);await guests[0].screenshot({path:out+'/online-mobile-prompt.png'});await host.screenshot({path:out+'/four-player-prompt.png'});
  for(const button of await guests[0].locator('#partyEntryPanel button').all()){const b=await button.boundingBox();assert(b&&b.y>=0&&b.y+b.height<=390,'Mobile accept/reject choices must fit without scrolling');}
  await guests[1].locator('#partyEntryPanel button').filter({hasText:'Reject'}).click();for(const p of pages)await p.locator('#partyEntryPanel').waitFor({state:'detached'});assert.notEqual(await host.evaluate(()=>entryGame().world.mode),'dungeon');checks.push('Four real WebRTC players see their own accept/reject prompt; any guest can reject without moving the party');
  await request();await host.keyboard.press('Enter');for(const p of guests.slice(0,2))await p.locator('#partyEntryPanel button').filter({hasText:'Accept'}).click();assert.notEqual(await host.evaluate(()=>entryGame().world.mode),'dungeon');
  await guests[2].locator('#partyEntryPanel button').filter({hasText:'Accept'}).click();for(const p of pages)await p.waitForFunction(()=>entryGame().world.mode==='dungeon'&&(entryGame().onlineSession.role==='host'||entryGame().onlineSession.ready));await host.waitForFunction(()=>[...entryGame().onlineSession.clients.values()].every(c=>c.ready));checks.push('Entry waits for all four explicit votes, then synchronizes the dungeon and gathers everyone');
  // Use the actual authored final arena so the normal update loop triggers consent.
  await host.evaluate(async()=>{const g=entryGame(),{createDungeonWorld}=await import('/src/dungeonSystem.js');g.world=createDungeonWorld({dungeonId:'ashenOrchard',floor:2,playerCount:4});for(const p of [g.player,...g.player.coop.players])Object.assign(p,g.world.spawn);});
  for(const p of guests)await p.waitForFunction(()=>entryGame().world.floor===2&&entryGame().onlineSession.ready);await host.waitForFunction(()=>[...entryGame().onlineSession.clients.values()].every(c=>c.ready));
  await host.evaluate(()=>{const g=entryGame(),a=g.world.bossArena;g.player.x=a.x+a.w/2;g.player.y=a.y+a.h/2;});for(const p of pages)await p.locator('#partyEntryPanel').waitFor();
  assert.equal(await host.evaluate(()=>entryGame().world.bossArena.phase),'dormant');await host.evaluate(()=>{entryGame().paused=true;});await host.locator('#partyEntryPanel').waitFor({state:'detached',timeout:13000});for(const p of guests)await p.locator('#partyEntryPanel').waitFor({state:'detached'});assert.equal(await host.evaluate(()=>entryGame().world.bossArena.phase),'dormant');checks.push('Boss-room prompt has a real ten-second timeout even while paused; expiry does not start combat');
  await host.evaluate(()=>{const g=entryGame(),a=g.world.bossArena;g.paused=false;g.player.x=a.x-100;g.player.y=a.y-100;});await host.waitForTimeout(200);await host.evaluate(()=>{const g=entryGame(),a=g.world.bossArena;g.player.x=a.x+a.w/2;g.player.y=a.y+a.h/2;});for(const p of pages)await p.locator('#partyEntryPanel').waitFor();
  await host.keyboard.press('Enter');for(const p of guests)await p.locator('#partyEntryPanel button').filter({hasText:'Accept'}).click();await host.waitForFunction(()=>entryGame().world.bossArena.phase==='active');
  assert(await host.evaluate(()=>{const g=entryGame(),a=g.world.bossArena;return [g.player,...g.player.coop.players].every(p=>p.x>a.x&&p.x<a.x+a.w&&p.y>a.y&&p.y<a.y+a.h)&&g.world.arenaBarriers.length>0;}));checks.push('Unanimous boss consent pulls all four into the sealed arena');
  await host.evaluate(()=>entryGame().onlineSession.disconnect());assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
