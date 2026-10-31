const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],checks=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});fs.mkdirSync('docs/local-player-menus',{recursive:true});try{
 await page.addInitScript(()=>{window.testPads=[];navigator.getGamepads=()=>testPads;window.setPad=(slot,axis=0,button=-1)=>{testPads[slot]={id:'Test '+slot,index:slot,connected:true,mapping:'standard',axes:[axis,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===button,value:i===button?1:0}))};};});
 await page.addInitScript(()=>{window.menuGame=()=>document.getElementById('pauseOverlay')?.__runalisGame;});
 const append=checks.push.bind(checks);checks.push=(label)=>{console.log('PASS '+label);return append(label);};
 await launch(page,process.env.RUNALIS_URL||'http://127.0.0.1:8768');await page.waitForFunction(()=>menuGame()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
 await page.evaluate(async()=>{const {createPlayer,chooseClass}=await import('/src/player.js'),{readProfiles,writeProfiles,createSaveState}=await import('/src/gameSave.js'),p=createPlayer('Menu P2');chooseClass(p,'fellhunter');p.profileId='menuP2';const profiles=readProfiles();profiles.menuP2={id:'menuP2',name:p.name,updated:2,state:createSaveState({player:p,world:menuGame().world})};writeProfiles(profiles);setPad(0);setPad(1,0,9);});
 await page.locator('#couchCoopJoinOverlay.active').waitFor();await page.evaluate(()=>setPad(1));await page.locator('[data-coop-load]:not([disabled])').filter({hasText:'Menu P2'}).click();
 await page.waitForFunction(()=>menuGame().player.coop.players.length===1);
 page.on('dialog',d=>{errors.push('Unexpected blocking dialog: '+d.message());d.dismiss();});
 await page.evaluate(()=>{window.setPad=(slot,axis=0,buttons=[])=>{if(!Array.isArray(buttons))buttons=[buttons];testPads[slot]={id:'Test '+slot,index:slot,connected:true,mapping:'standard',axes:[axis,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))};};});
 const press=async(slot,buttons)=>{await page.evaluate(([s,b])=>setPad(s,0,b),[slot,buttons]);await page.waitForTimeout(90);await page.evaluate(s=>setPad(s),slot);};
 const frame=slot=>page.frameLocator(`.local-player-menu[data-owner-slot="${slot}"]`);
 const skills=await page.evaluate(async()=>{
  const g=menuGame(),{getAbilityMorphOptions}=await import('/src/abilityMorphSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js');
  window.realPerformanceNow=performance.now.bind(performance);Object.defineProperty(performance,'now',{configurable:true,value:()=>1000000});
  g.uiAbilityControllerState={region:'ability',abilityIndex:0,parentSentinel:true};
  return [g.player,g.player.coop.players[0]].map(p=>{const id=p.knownAbilities.find(id=>getAbilityMorphOptions(p,id).length>1);getAbilityMastery(p,id,true).level=20;p.cooldowns[id]=900;p.activeChannel=null;p.abilityCharge=null;return {id,morph:getAbilityMorphOptions(p,id)[1].id};});
 });
 for(let i=0;i<2;i++){
  await press(i,8);await frame(i+1).locator('.panel.open').waitFor();await frame(i+1).locator('[data-tab="skills"]').click();await frame(i+1).locator('button[data-skills-subtab="abilities"]').click();await frame(i+1).locator(`[data-select-ability-id="${skills[i].id}"]`).click();
  if(i===0)await frame(1).locator(`[data-ability-morph="${skills[0].morph}"]`).click();
  else {await press(1,2);await press(1,13);await press(1,0);}
  assert.equal(await page.evaluate(([i,id])=>[menuGame().player,...menuGame().player.coop.players][i].abilityMorphs[id],[i,skills[i].id]),skills[i].morph);
 }
 assert(await page.evaluate(()=>menuGame().uiAbilityControllerState.parentSentinel));
 assert.equal(await page.evaluate(()=>menuGame().uiAbilityControllerState.region),'ability');
 await page.evaluate(id=>{menuGame().player.coop.players[0].cooldowns[id]=999.9;},skills[1].id);
 await frame(2).locator('[data-ability-morph="base"]').click();assert.equal(await page.evaluate(id=>menuGame().player.coop.players[0].abilityMorphs[id],skills[1].id),skills[1].morph);
 assert((await frame(2).locator('.ability-morph-picker [role="status"]').innerText()).includes('recovering'));
 console.log('PASS genuine recovery still prevents morph switching and explains why inside the menu');
 console.log('PASS P1 pointer morph and P2 X/D-pad/A morph use host session clock; parent menu state stays isolated');
 await page.evaluate(()=>{Object.defineProperty(performance,'now',{configurable:true,value:realPerformanceNow});for(const p of [menuGame().player,...menuGame().player.coop.players]){p.cooldowns={};p.abilityUseCharges={};}});
 await frame(1).locator('#localMenuClose').click();await frame(2).locator('#localMenuSections').click();await frame(2).locator('[data-menu-action="dropout"]').click();await page.waitForFunction(()=>menuGame().player.coop.players.length===0);
 const rejoin=async()=>{await press(1,9);await page.locator('#couchCoopJoinOverlay.active').waitFor();await page.locator('[data-coop-load]:not([disabled])').filter({hasText:'Menu P2'}).click();await page.waitForFunction(()=>menuGame().player.coop.players.length===1);assert.equal(await page.evaluate(()=>menuGame().player.coop.players[0].abilityMorphs[Object.keys(menuGame().player.coop.players[0].abilityMorphs)[0]]),skills[1].morph);};
 await rejoin();console.log('PASS P2 menu drop-out saves progression and profile can rejoin');
 for(const order of [[9,8],[8,9]]){
  await press(1,8);await frame(2).locator('.panel.open').waitFor();
  await page.evaluate(b=>setPad(1,0,[b]),order[0]);await page.waitForTimeout(80);await page.evaluate(b=>setPad(1,0,b),order);await page.waitForFunction(()=>menuGame().player.coop.players.length===0);await page.evaluate(()=>setPad(1));await rejoin();
 }
 console.log('PASS Start+Back drop-out works in either order even with P2 menu open, with successful rejoin');
 await page.evaluate(()=>{const g=menuGame();g.world={mode:'test',name:'Controller arena',tileSize:32,width:64,height:64,objects:[],enemies:[],effects:[],drops:[],tiles:Array.from({length:64},()=>Array.from({length:64},()=>({biome:'grass',passable:true})))};g.player.x=512;g.player.y=512;g.player.coop.players[0].x=560;g.player.coop.players[0].y=512;const a=testPads[0],b=testPads[1];a.index=1;b.index=0;testPads[0]=b;testPads[1]=a;a.axes[0]=1;b.axes[0]=-1;});
 await page.waitForFunction(()=>menuGame().player.x>525&&menuGame().player.coop.players[0].x<547);
 assert.equal(await page.evaluate(()=>menuGame().getPrimaryControllerInput().id),'Test 0');
 await page.evaluate(()=>{for(const p of testPads)p.axes[0]=0;testPads[1]=null;testPads[0].axes[0]=1;});const before=await page.evaluate(()=>menuGame().player.x);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>menuGame().player.x),before);
 console.log('PASS physical browser gamepad index swap retains P1/P2 identity; losing P1 device does not hand P1 to P2');
 assert.deepEqual(errors,[]);console.log('PASS co-op reported-session browser regressions; zero page errors');
 }catch(e){await page.screenshot({path:'docs/local-player-menus/session-failure.png'});throw e;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
