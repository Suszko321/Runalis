const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/live-aim';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{
  async function setup(options){
   const page=await browser.newPage(options);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
   await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unsupported in test');};});
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.aimGame=()=>currentGame;'}));
   await launch(page,base);await page.waitForFunction(()=>window.aimGame?.()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
   await page.evaluate(async()=>{
    const g=aimGame(),{createPlayer,chooseClass,migratePlayer}=await import('/src/player.js'),{unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');
    const {x,y,story}=g.player;Object.assign(g.player,createPlayer('Live aim review'),{x,y,story,characterCreationComplete:true,act1OpeningPending:false});
    chooseClass(g.player,'waverider');g.player.skillState.combat.level=33;for(const s of Object.values(g.player.skillState.skills))s.level=33;migratePlayer(g.player);
    g.player.spiritAwakened=true;g.player.maxStamina=g.player.stamina=g.player.maxSpirit=g.player.spirit=10000;
    unlockActiveAbility(g.player,'hydromancerWaterTorrent',{autoAssignEmpty:false});g.player.loadout.abilitySlots=['hydromancerWaterTorrent',null,null,null,'block'];
   });return page;
  }
  async function worldPoint(page,dx,dy){return page.evaluate(({dx,dy})=>{const g=aimGame(),r=g.canvas.getBoundingClientRect();return {x:r.left+(g.player.x-g.camera.x)*r.width/g.canvas.width+dx,y:r.top+(g.player.y-g.camera.y)*r.height/g.canvas.height+dy};},{dx,dy});}
  const desktop=await setup({viewport:{width:1280,height:800}});
  let point=await worldPoint(desktop,180,0);await desktop.mouse.move(point.x,point.y);await desktop.keyboard.down('q');await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.active);
  point=await worldPoint(desktop,0,-160);await desktop.mouse.move(point.x,point.y);await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimY<-.95);
  await desktop.keyboard.down('s');await desktop.waitForFunction(()=>aimGame().input.moveY>.9&&aimGame().player.dirY<-.9);await desktop.keyboard.up('s');checks.push('Desktop mouse steers a held charge and facing while walking the opposite way');
  const cameraResult=await desktop.evaluate(()=>{
   const g=aimGame();g.camera.x+=120;g.camera.y+=35;g.updateInputMovement();const r=g.canvas.getBoundingClientRect();
   return {x:g.input.mouseWorldX,y:g.input.mouseWorldY,expectedX:(g.mouseAimPosition.x-r.left)*g.canvas.width/r.width+g.camera.x,expectedY:(g.mouseAimPosition.y-r.top)*g.canvas.height/r.height+g.camera.y};
  });assert(Math.abs(cameraResult.x-cameraResult.expectedX)<1e-7&&Math.abs(cameraResult.y-cameraResult.expectedY)<1e-7);checks.push('Stationary cursor world target refreshes when camera moves');
  point=await worldPoint(desktop,-180,0);await desktop.mouse.move(point.x,point.y);await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimX<-.95);await desktop.keyboard.up('q');await desktop.waitForFunction(()=>!aimGame().player.abilityCharge);assert(await desktop.evaluate(()=>aimGame().player.lastCombatAimX<-.9));checks.push('Desktop release follows latest cursor direction');
  await desktop.evaluate(()=>{
   const g=aimGame();g.blur();g.player.cooldowns={};g.player.activeChannel=null;g.player.spirit=g.player.maxSpirit;
   window.aimPad={id:'Live aim pad',index:0,connected:true,axes:[1,0,0,-1],buttons:Array.from({length:17},(_,i)=>({pressed:i===7,value:i===7?1:0}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[aimPad]});
  });await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimY<-.9);
  await desktop.evaluate(()=>{aimPad.axes=[0,1,-1,0];});await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimX<-.9);
  await desktop.evaluate(()=>{aimPad.axes=[0,1,0,0];});await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimY>.9&&aimGame().input.aimSource==='leftStick');
  checks.push('Controller right stick steers charge; neutral right stick immediately falls back to movement');
  await desktop.evaluate(()=>{aimPad.axes=[0,0,0,0];});point=await worldPoint(desktop,0,-160);await desktop.mouse.move(point.x,point.y);
  await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimY<-.9&&aimGame().input.aimSource==='mouse');
  await desktop.evaluate(()=>{aimPad.axes=[0,0,-1,0];});await desktop.waitForFunction(()=>aimGame().player.abilityCharge?.aimX<-.9&&aimGame().input.aimSource==='rightStick');
  checks.push('Fresh mouse aim works with an idle gamepad; stick input restores controller priority');await desktop.evaluate(()=>{delete navigator.getGamepads;});
  const mobile=await setup({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1}),client=await mobile.context().newCDPSession(mobile);
  const touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  async function buttonPoint(selector,id){const r=await mobile.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2,id};}
  await mobile.waitForFunction(()=>!document.querySelector('[data-hold="ability0"]').disabled);
  const stick=await buttonPoint('#mobileStick',1),moving={...stick,x:stick.x+38},skill=await buttonPoint('[data-hold="ability0"]',2);
  await touch('touchStart',[stick]);await touch('touchMove',[moving]);await touch('touchStart',[moving,skill]);await mobile.waitForFunction(()=>aimGame().player.abilityCharge?.active);
  let aim={...await worldPoint(mobile,0,-110),id:3};await touch('touchStart',[moving,skill,aim]);await mobile.waitForFunction(()=>aimGame().player.abilityCharge?.aimY<-.9&&aimGame().input.aimSource==='touch'&&aimGame().player.dirY<-.9);checks.push('Separate world touch aims a charged skill while movement and skill fingers remain held');
  aim={...await worldPoint(mobile,-140,0),id:3};await touch('touchMove',[moving,skill,aim]);await mobile.waitForFunction(()=>aimGame().player.abilityCharge?.aimX<-.9);checks.push('Dragging a held world touch continuously steers the charge');
  await mobile.screenshot({path:out+'/touch-aim.png'});
  await touch('touchEnd',[aim]);await mobile.waitForFunction(()=>aimGame().input.aimSource==='leftStick'&&aimGame().player.abilityCharge?.aimX>.9);checks.push('Releasing aim touch immediately restores movement aim during charge');
  await touch('touchEnd',[moving]);await mobile.waitForFunction(()=>aimGame().input.moveX===0);
  const tap={...await worldPoint(mobile,0,-110),id:4};await touch('touchStart',[skill,tap]);await touch('touchEnd',[tap]);await mobile.waitForFunction(()=>aimGame().player.abilityCharge?.aimY<-.9);checks.push('Quick world tap is consumed even between frames and retained when stationary');
  await touch('touchEnd',[]);await mobile.waitForFunction(()=>!aimGame().player.abilityCharge);assert(await mobile.evaluate(()=>aimGame().player.lastCombatAimY<-.9));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={checks,errors,missing};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
