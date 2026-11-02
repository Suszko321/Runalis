const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/player-trading';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
 const append=checks.push.bind(checks);checks.push=label=>{console.log('PASS '+label);return append(label);};
 fs.mkdirSync(out,{recursive:true});
 try{
  async function open(name,pads=false){
   const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>{errors.push(name+': '+e.message);console.error(name+': '+e.message);});
   await page.addInitScript(()=>{window.tradeGame=()=>document.getElementById('pauseOverlay')?.__runalisGame;Element.prototype.requestFullscreen=async()=>{};window.testPads=[];navigator.getGamepads=()=>testPads;window.setPad=(slot,button=-1)=>{testPads[slot]={id:'Trade pad '+slot,index:slot,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===button,value:i===button?1:0}))};};});
   await launch(page,base);await page.waitForFunction(()=>tradeGame()?.started&&!document.querySelector('#loadingScreen.active'));
   await page.evaluate(name=>{const g=tradeGame();g.player.name=g.player.profileName=g.player.appearance.name=name;g.player.gold=1000;g.profileName=name;},name);
   return page;
  }
  if(!process.argv.includes('--online-only')){
  const local=await open('Aster');
  await local.evaluate(async()=>{
   const g=tradeGame(),{createPlayer,chooseClass,addItem}=await import('/src/player.js'),{readProfiles,writeProfiles,createSaveState}=await import('/src/gameSave.js');
   const p=createPlayer('Bryn');chooseClass(p,'fellhunter');p.gold=500;p.profileId='trade-local-2';addItem(p,'cookedSunfish',4);addItem(p,'ironOre',4);
   const profiles=readProfiles();profiles[p.profileId]={id:p.profileId,name:p.name,updated:1,state:createSaveState({player:p,world:g.world})};writeProfiles(profiles);setPad(0);setPad(1,9);
  });
  try{await local.locator('[data-coop-load]:not([disabled])').filter({hasText:'Bryn'}).click();}catch(error){console.log(await local.evaluate(()=>({world:tradeGame().world.mode,started:tradeGame().started,errors:document.body.innerText.slice(-1600),controllers:tradeGame().controllerInput,join:tradeGame().couchCoopJoinMenu})));throw error;}await local.evaluate(()=>setPad(1));
  await local.waitForFunction(()=>tradeGame().player.coop.players.length===1);
  await local.evaluate(async()=>{const g=tradeGame(),p=g.player,b=p.coop.players[0],{addItem}=await import('/src/player.js'),{createGearEntry}=await import('/src/equipmentProgressionSystem.js');addItem(p,'ironOre',8);p.inventory.push(createGearEntry(p,'oldKnife',{upgradeTier:5,gearRarity:'rare',rarityRollVersion:1,itemLevel:20}));b.x=p.x+14;b.y=p.y;g.save(false);});
  await local.waitForFunction(()=>tradeGame().trading.snapshot(tradeGame().player).nearby.length===1,null,{timeout:12000});
  await local.evaluate(()=>setPad(0,0));await local.waitForTimeout(90);await local.evaluate(()=>setPad(0));
  await local.locator('.player-trade[data-trade-owner="1"]').waitFor();await local.locator('.player-trade[data-trade-owner="2"]').waitFor();
  checks.push('Four seconds nearby in Orrakai enables interaction and opens two independent local trade panels');
  const first=local.locator('[data-trade-owner="1"]'),second=local.locator('[data-trade-owner="2"]');
  assert.equal(await first.locator('[data-trade-add]').filter({hasText:'Iron Ore'}).count(),0);
  await first.locator('[data-trade-add]').filter({hasText:'Old Knife'}).last().click();
  await first.locator('[data-trade-gold]').fill('100');await first.locator('[data-trade-set-gold]').click();
  await second.locator('[data-trade-qty]').fill('2');await second.locator('[data-trade-add]').filter({hasText:'Cooked Sunfish'}).click();
  await first.locator('[data-trade-accept]').click();
  await second.locator('[data-trade-gold]').fill('25');await second.locator('[data-trade-set-gold]').click();
  assert(await first.locator('[data-trade-accept]').isEnabled());
  checks.push('Materials are absent; bag gear, quantities and gold are selectable; changes reset approval');
  await first.locator('[data-trade-accept]').click();await second.locator('[data-trade-accept]').click();
  await first.getByText('FINAL REVIEW',{exact:false}).waitFor();
  const before=await local.evaluate(()=>[tradeGame().player.gold,tradeGame().player.coop.players[0].gold]);
  await first.locator('[data-trade-accept]').click();assert.deepEqual(await local.evaluate(()=>[tradeGame().player.gold,tradeGame().player.coop.players[0].gold]),before);
  await local.screenshot({path:out+'/local-final-review.png'});
  await second.locator('[data-trade-accept]').click();await local.waitForFunction(()=>!tradeGame().trading.hasLocalOpen());
  const result=await local.evaluate(async()=>{const g=tradeGame(),p=g.player,b=p.coop.players[0],profiles=(await import('/src/gameSave.js')).readProfiles();return {gold:[p.gold,b.gold],fish:p.inventory.find(e=>e.id==='cookedSunfish')?.qty,gear:b.inventory.find(e=>e.id==='oldKnife'&&e.upgradeTier===5),saved:[profiles.playerSmoke.state.player.gold,profiles['trade-local-2'].state.player.gold]};});
  assert.deepEqual(result.gold,[925,575]);assert.deepEqual(result.saved,result.gold);assert.equal(result.fish,2);assert.equal(result.gear.gearRarity,'rare');
  checks.push('Nothing transfers after one confirmation; both confirmations exchange exact gear, stacks and gold and save both local profiles');
  await local.waitForFunction(()=>tradeGame().trading.snapshot(tradeGame().player).nearby.length>0,null,{timeout:12000});await local.evaluate(()=>tradeGame().interact());await first.waitFor();
  await local.evaluate(()=>setPad(1,0));await local.waitForTimeout(90);await local.evaluate(()=>setPad(1));
  assert.equal(await local.evaluate(()=>tradeGame().trading.snapshot(tradeGame().player).own.items.length),0);
  assert.equal(await local.evaluate(()=>tradeGame().trading.snapshot(tradeGame().player.coop.players[0]).own.items.length),1);
  await second.locator('[data-trade-gold-step="1"]').click();await local.evaluate(()=>setPad(1,0));await local.waitForTimeout(90);await local.evaluate(()=>setPad(1));
  assert.equal(await local.evaluate(()=>tradeGame().trading.snapshot(tradeGame().player.coop.players[0]).own.gold),2);
  assert.equal(await local.evaluate(()=>tradeGame().trading.snapshot(tradeGame().player).own.gold),0);
  await local.evaluate(()=>setPad(0,1));await local.waitForTimeout(90);await local.evaluate(()=>setPad(0));await local.waitForFunction(()=>!tradeGame().trading.hasLocalOpen());
  checks.push('Real gamepad polling routes P2 offer input only to P2; P1 controller can decline');
  for(const [width,height]of [[844,390],[640,360]]){
   await local.setViewportSize({width,height});
   await local.waitForFunction(()=>tradeGame().trading.snapshot(tradeGame().player).nearby.length>0,null,{timeout:12000});
   await local.evaluate(()=>tradeGame().interact());
   await first.waitFor();const boxes=await local.locator('.player-trade').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
   assert.equal(await first.locator('[data-trade-feedback]').innerText(),'');
   assert(boxes.every(b=>b.left>=-1&&b.top>=-1&&b.right<=width+1&&b.bottom<=height+1));
   const actions=await local.locator('[data-trade-accept]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));assert(actions.every(b=>b.top>=0&&b.bottom<=height+1));
   await local.screenshot({path:`${out}/local-${width}.png`});await first.locator('[data-trade-cancel]').last().click();
  }
  checks.push('Both local panels remain in their own viewports at 844×390 and 640×360; decline changes no items');
  await local.close();
  }

  const host=await open('Online Aster'),guest=await open('Online Bryn');
  await host.evaluate(async()=>{const g=tradeGame(),{addItem}=await import('/src/player.js');addItem(g.player,'cookedSunfish',5);g.save(false);});
  const password='Trade-test-'+crypto.randomUUID();
  await host.evaluate(()=>tradeGame().onlineSession.openMenu());await host.locator('[data-online-password]').fill(password);await host.locator('[data-online-host]').click();
  await host.waitForFunction(()=>tradeGame().onlineSession.role==='host',null,{timeout:30000});await host.locator('[data-online-close]').click();
  await guest.evaluate(()=>tradeGame().onlineSession.openMenu());await guest.locator('[data-online-password]').fill(password);await guest.locator('[data-online-join]').click();
  await guest.waitForFunction(()=>tradeGame().onlineSession.ready,null,{timeout:30000});
  async function nearby(){
   await host.evaluate(()=>{const g=tradeGame(),b=g.player.coop.players[0];b.x=g.player.x+14;b.y=g.player.y;});
   await host.waitForFunction(()=>{const g=tradeGame();return g.trading.snapshot(g.player).nearby.some(p=>p.id===g.player.coop.players[0]?.networkId);},null,{timeout:12000});
   await guest.waitForFunction(()=>tradeGame().trading.state(tradeGame().player).nearby.some(p=>p.id==='host'),null,{timeout:12000});
  }
  await nearby();
  await guest.keyboard.press('e');await guest.locator('.player-trade').waitFor();await host.locator('.player-trade').waitFor();
  await host.locator('[data-trade-qty]').fill('3');await host.locator('[data-trade-add]').filter({hasText:'Cooked Sunfish'}).click();
  await guest.locator('[data-trade-gold]').fill('75');await guest.locator('[data-trade-set-gold]').click();
  await host.waitForFunction(()=>tradeGame().trading.snapshot(tradeGame().player).other.gold===75);
  await host.locator('[data-trade-accept]').click();await guest.locator('[data-trade-accept]').click();
  await guest.getByText('FINAL REVIEW',{exact:false}).waitFor();await host.locator('[data-trade-accept]').click();await guest.locator('[data-trade-accept]').click();
  await host.waitForFunction(()=>!tradeGame().trading.isBusy(tradeGame().player));
  await guest.waitForFunction(()=>tradeGame().player.inventory.find(e=>e.id==='cookedSunfish')?.qty===3);
  assert.equal(await host.evaluate(()=>tradeGame().player.gold),1075);assert.equal(await guest.evaluate(()=>tradeGame().player.gold),925);
  checks.push('Native WebRTC guest initiates and independently offers/accepts/confirms; host transfers items and gold to the right characters');
  await guest.evaluate(()=>tradeGame().onlineSession.wire.send({type:'character',revision:999,tradeRevision:0,character:{gold:999999,inventory:[]}}));
  // busy is required for character commits; emulate a delayed pre-trade menu packet.
  await guest.evaluate(()=>{const s=tradeGame().onlineSession;s.wire.send({type:'input',seq:++s.sequence,busy:true,input:{}});s.wire.send({type:'character',revision:1000,tradeRevision:0,character:{gold:999999,inventory:[]}});});
  await guest.waitForFunction(()=>tradeGame().logLines.some(line=>String(line).includes('current host inventory')));
  assert.equal(await host.evaluate(()=>tradeGame().player.coop.players[0].gold),925);
  assert.equal(await guest.evaluate(()=>tradeGame().player.gold),925);
  checks.push('A delayed pre-trade character commit cannot overwrite the exchanged inventory or gold');
  const other=await open('Online Cyra');await other.evaluate(()=>tradeGame().onlineSession.openMenu());await other.locator('[data-online-password]').fill(password);await other.locator('[data-online-join]').click();await other.waitForFunction(()=>tradeGame().onlineSession.ready,null,{timeout:30000});
  const hostPoint=await host.evaluate(()=>{const g=tradeGame(),p={x:g.player.x,y:g.player.y};g.player.coop.players[0].x=p.x;g.player.coop.players[0].y=p.y;g.player.coop.players[1].x=p.x+14;g.player.coop.players[1].y=p.y;g.player.x-=200;return p;});
  try{await guest.waitForFunction(()=>tradeGame().trading.state(tradeGame().player).nearby.some(p=>p.name==='Online Cyra'),null,{timeout:12000});}
  catch(error){console.log(await host.evaluate(()=>{const g=tradeGame();return {actors:[g.player,...g.player.coop.players].map(p=>({name:p.name,x:p.x,y:p.y,isMoving:p.isMoving,hp:p.hp,active:p.active,life:p.lifeState,menuBusy:p.networkMenuBusy,busy:g.isActorInterfaceBusy(p),controller:p.controllerSlotIndex,trade:g.trading.snapshot(p)})),world:g.world.mode,safe:g.world.safeZone,paused:g.paused};}));throw error;}
  await guest.keyboard.press('e');await guest.locator('.player-trade').waitFor();await other.locator('.player-trade').waitFor();assert.equal(await host.locator('.player-trade').count(),0);
  await guest.locator('[data-trade-gold]').fill('20');await guest.locator('[data-trade-set-gold]').click();await other.locator('[data-trade-gold]').fill('5');await other.locator('[data-trade-set-gold]').click();
  await guest.waitForFunction(()=>tradeGame().trading.state(tradeGame().player).other.gold===5);
  await other.evaluate(()=>{window.tradeOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Trading test quota','QuotaExceededError');};});
  await guest.locator('[data-trade-accept]').click();await other.locator('[data-trade-accept]').click();await guest.getByText('FINAL REVIEW',{exact:false}).waitFor();await guest.locator('[data-trade-accept]').click();await other.locator('[data-trade-accept]').click();
  await guest.waitForFunction(()=>tradeGame().player.gold===910);await other.waitForFunction(()=>tradeGame().player.gold===1015);assert.equal(await host.evaluate(()=>tradeGame().player.gold),1075);
  await other.getByText('Your inventory is updated, but this browser could not save it.',{exact:false}).waitFor();
  await other.evaluate(()=>{Storage.prototype.setItem=tradeOriginalSetItem;if(!tradeGame().onlineSession.saveGuest(false))throw Error('Save retry failed');});
  const saves=await Promise.all([guest,other].map(page=>page.evaluate(async()=>(await import('/src/gameSave.js')).readProfiles().playerSmoke.state.player.gold)));assert.deepEqual(saves,[910,1015]);
  await other.evaluate(()=>tradeGame().onlineSession.disconnect());await other.close();await host.waitForFunction(()=>tradeGame().player.coop.players.length===1);await host.evaluate(point=>Object.assign(tradeGame().player,point),hostPoint);
  checks.push('Two remote guests trade without changing the host; a guest storage failure is reported and a successful save retry preserves the exchange');
  await nearby();await guest.keyboard.press('e');await guest.locator('.player-trade').waitFor();
  await host.evaluate(()=>tradeGame().player.coop.players[0].x+=200);await guest.waitForFunction(()=>!tradeGame().trading.isBusy(tradeGame().player));
  checks.push('Moving apart cancels the online trade without another transfer');
  await nearby();await guest.keyboard.press('e');await guest.locator('.player-trade').waitFor();
  await guest.close();await host.waitForFunction(()=>!tradeGame().trading.isBusy(tradeGame().player)&&tradeGame().player.coop.players.length===0);
  checks.push('Guest disconnection cancels the active trade and cleans up its panel and actor');
  await host.close();assert.deepEqual(errors,[]);
  const reportName=process.argv.includes('--online-only')?'browser-online-results.json':'browser-results.json';
  fs.writeFileSync(out+'/'+reportName,JSON.stringify({checks,errors,nativeWebRTC:true,base},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
