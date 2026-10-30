const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/mobile-controls';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});fs.mkdirSync(out,{recursive:true});
 const errors=[],failed=[],checks=[];
 try {
  const context=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  // Exercise unsupported orientation/fullscreen without changing the test viewport.
  await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{window.fullscreenAttempts=(window.fullscreenAttempts||0)+1;throw new Error('Unsupported test browser');};});
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.mobileGame=()=>currentGame;'}));
  await launch(page,base);await page.waitForFunction(()=>window.mobileGame?.()?.started&&document.querySelector('#mobileControls [data-hold="ability0"] span')?.textContent!=='Skill 1');
  await page.waitForFunction(()=>!document.querySelector('#loadingScreen')?.classList.contains('active'));
  assert(await page.evaluate(()=>document.body.classList.contains('mobile-input')));
  assert.equal(await page.locator('#mobileControls [data-hold^="ability"]').count(),5);
  assert(await page.evaluate(()=>fullscreenAttempts>0));checks.push('Automatic touch detection; five skill slots; fullscreen rejection handled');
  await page.screenshot({path:out+'/initial.png'});const client=await context.newCDPSession(page);
  async function touch(type,points){await client.send('Input.dispatchTouchEvent',{type,touchPoints:points});}
  async function point(selector,id){const b=await page.locator(selector).boundingBox();assert(b,selector+' not visible');return {x:b.x+b.width/2,y:b.y+b.height/2,id};}
  const stick=await point('#mobileStick',1),attack=await point('[data-hold="attack"]',2);
  const before=await page.evaluate(()=>({x:mobileGame().player.x,y:mobileGame().player.y}));
  await touch('touchStart',[stick]);const moving={...stick,x:stick.x+38};await touch('touchMove',[moving]);
  await page.waitForFunction(()=>mobileGame().input.moveX>.9);
  await touch('touchStart',[moving,attack]);await page.waitForFunction(()=>mobileGame().input.attackHeld);
  assert(await page.evaluate(()=>mobileGame().input.combatAimX>.9));
  await page.waitForTimeout(250);assert(await page.evaluate(()=>mobileGame().input.moveX>.9&&mobileGame().input.attackHeld));
  await touch('touchEnd',[attack]);await page.waitForFunction(()=>!mobileGame().input.attackHeld);
  await touch('touchEnd',[]);await page.waitForFunction(()=>mobileGame().input.moveX===0);
  assert(await page.evaluate(()=>mobileGame().input.combatAimX>.9));
  const after=await page.evaluate(()=>({x:mobileGame().player.x,y:mobileGame().player.y}));assert(after.x>before.x);checks.push('Native multitouch movement + held attack; release; remembered movement aim');
  // A held skill is passed through the actual combat input path, not a keyboard event.
  const skill=await point('[data-hold="ability0"]',3);await touch('touchStart',[skill]);await page.waitForFunction(()=>mobileGame().input.ability0Held);
  await touch('touchEnd',[]);await page.waitForFunction(()=>!mobileGame().input.ability0Held);checks.push('Skill press/hold/release reaches gameplay');
  const block=await point('[data-hold="ability4"]',4);await touch('touchStart',[block]);await page.waitForFunction(()=>mobileGame().player.actionState?.blocking);
  await touch('touchCancel',[]);await page.waitForFunction(()=>!mobileGame().input.ability4Held);checks.push('Equipped Block and touch cancellation');
  const slots=await page.evaluate(()=>{const g=mobileGame(),slots=[...g.player.loadout.abilitySlots];g.player.loadout.abilitySlots=Array(5).fill('block');return slots;});
  await page.waitForFunction(()=>[...document.querySelectorAll('#mobileControls [data-hold^="ability"]')].every(b=>!b.disabled));
  for(let i=0;i<5;i++){
   await touch('touchStart',[await point(`[data-hold="ability${i}"]`,10+i)]);
   await page.waitForFunction(i=>mobileGame().input[`ability${i}Held`]&&mobileGame().player.actionState?.blocking,i);
   await touch('touchEnd',[]);await page.waitForFunction(()=>!mobileGame().player.actionState?.blocking);
  }
  await page.evaluate(slots=>{mobileGame().player.loadout.abilitySlots=slots;},slots);checks.push('Every hotbar slot performs its equipped action');
  await page.locator('[data-action="menu"]').tap();await page.waitForSelector('.panel.open');assert(!(await page.locator('#mobileStick').isVisible()));
  await page.locator('[data-menu-action="multiplayer"]').tap();await page.waitForSelector('#onlineMultiplayerOverlay.active');
  assert(await page.locator('[data-online-host]').isVisible());assert(await page.locator('[data-online-join]').isVisible());
  await page.locator('[data-online-close]').tap();await page.locator('[data-action="menu"]').tap();checks.push('Mobile Menus exposes Multiplayer with Open World and Join World');
  for(const tab of ['inventory','skills','quests','map','log','character']){
   await page.locator(`.tab[data-tab="${tab}"]`).tap();await page.waitForFunction(tab=>document.querySelector('#'+tab)?.classList.contains('active'),tab);
   assert(await page.locator('#'+tab).isVisible());
  }
  await page.screenshot({path:out+'/menus.png'});checks.push('Touch menu opens inventory, skills, quests, map, log and character');
  // Menus button first returns to the chooser, then closes it.
  await page.locator('[data-action="menu"]').tap();await page.locator('[data-action="menu"]').tap();await page.waitForFunction(()=>!document.querySelector('.panel.open'));
  await page.locator('[data-action="pause"]').tap();assert(await page.evaluate(()=>mobileGame().paused));assert(await page.locator('#pauseFullscreenBtn').isVisible());await page.locator('#pauseFullscreenBtn').tap();await page.locator('[data-fullscreen-error]').waitFor();assert(await page.evaluate(()=>mobileGame().paused));await page.locator('#resumeBtn').tap();assert(!(await page.evaluate(()=>mobileGame().paused)));checks.push('Pause fullscreen fallback stays available; rejected requests preserve pause/resume');
  assert.equal(await page.locator('#mobileControls [data-action="multiplayer"],#mobileControls [data-action="fullscreen"]').count(),0);
  await page.locator('[data-action="pause"]').tap();await page.locator('#pauseMultiplayerBtn').tap();await page.waitForSelector('#onlineMultiplayerOverlay.active');assert(!(await page.evaluate(()=>mobileGame().paused)));await page.locator('[data-online-close]').tap();checks.push('HUD omits Multiplayer/fullscreen shortcuts; Pause still opens Multiplayer');
  await page.screenshot({path:out+'/landscape.png'});
  await page.evaluate(()=>Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{id:'Mobile test pad',index:0,connected:true,axes:[0,-1,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}]}));
  await page.waitForFunction(()=>mobileGame().primaryControllerActive&&mobileGame().input.moveY<-.9);await page.locator('#mobileControls').waitFor({state:'hidden'});
  await page.evaluate(()=>{delete navigator.getGamepads;});await page.waitForFunction(()=>!mobileGame().primaryControllerActive);await page.locator('#mobileStick').waitFor({state:'visible'});checks.push('Physical controller takes priority and touch returns on disconnect');
  await touch('touchStart',[await point('#mobileStick',1)]);await touch('touchMove',[moving]);
  await page.evaluate(()=>dispatchEvent(new Event('blur')));assert(await page.evaluate(()=>mobileGame().mobileControls.input.moveX===0&&!mobileGame().mobileControls.input.attackHeld));await touch('touchCancel',[]);checks.push('Focus loss clears held controls');
  await page.setViewportSize({width:390,height:844});await page.waitForSelector('#mobileRotate',{state:'visible'});await page.locator('[data-mobile-portrait]').tap();await page.waitForSelector('#mobileRotate',{state:'hidden'});
  assert(await page.locator('#mobileStick').isVisible());await page.screenshot({path:out+'/portrait.png'});checks.push('Portrait prompt and playable fallback');
  await page.setViewportSize({width:844,height:390});
  // Real opening and dialogue use a fresh isolated profile.
  await launch(page,base,'act1Opening');await page.waitForSelector('#mobileControls.opening');await page.locator('[data-action="skip"]').tap();await page.waitForFunction(()=>mobileGame().world.mode==='maraHouse');await page.waitForFunction(()=>mobileGame().dialogue.active);
  await page.locator('#mobileStick').waitFor({state:'hidden'});checks.push('Touch opening skip preserves recovery dialogue');
  await page.waitForFunction(()=>mobileGame().dialogue.phase==='TYPING'&&mobileGame().dialogue.transitionLock<=0);
  const dialoguePoint=await page.evaluate(async()=>{
   const g=mobileGame(),{getDialoguePointerTarget}=await import('/src/dialogueUi.js'),rect=g.canvas.getBoundingClientRect();
   for(let y=80;y<g.canvas.height-20;y+=20)for(let x=160;x<g.canvas.width-160;x+=20){
    const t=getDialoguePointerTarget(g.ctx,g.dialogue,{x,y},{viewport:g.getDialogueViewport(g.player)});
    if(t?.type==='confirm')return {x:rect.left+x*rect.width/g.canvas.width,y:rect.top+y*rect.height/g.canvas.height};
   }
  });assert(dialoguePoint);await page.touchscreen.tap(dialoguePoint.x,dialoguePoint.y);
  await page.waitForFunction(()=>mobileGame().dialogue.lineComplete);assert(await page.evaluate(()=>mobileGame().dialogue.revealedTokenCount===mobileGame().dialogue.tokens.length));checks.push('Native canvas touch reveals dialogue');
  await page.screenshot({path:out+'/dialogue.png'});
  await page.locator('[data-action="pause"]').tap();await page.locator('#saveQuitBtn').tap();await page.waitForSelector('#mainMenu.active');assert.equal(await page.locator('#mobileControls').count(),0);checks.push('Save & Quit removes touch controls');
  await page.locator('#createProfileBtn').tap();await page.waitForSelector('#characterCreatorOverlay.active');
  await page.locator('[data-creator-class="oathkeeper"]').tap();await page.locator('[data-creator-proceed]').tap();
  const appearanceButtons=page.locator('[data-creator-next]');assert((await appearanceButtons.first().boundingBox()).height>=44);
  const beforeAppearance=await page.locator('[data-creator-row]').first().innerText();await appearanceButtons.first().tap();assert.notEqual(await page.locator('[data-creator-row]').first().innerText(),beforeAppearance);
  await page.screenshot({path:out+'/creator.png'});await page.locator('[data-creator-start]').tap();await page.waitForFunction(()=>!document.querySelector('#characterCreatorOverlay.active'));assert.equal(await page.locator('#mobileControls').count(),1);checks.push('Touch character creation with thumb-sized controls and clean session restart');
  // A desktop profile must retain the original input and UI.
  const desktop=await browser.newPage({viewport:{width:1280,height:800}});desktop.on('pageerror',e=>errors.push(e.message));await launch(desktop,base);assert.equal(await desktop.locator('#mobileControls').count(),0);assert(!(await desktop.evaluate(()=>document.body.classList.contains('mobile-input'))));checks.push('Desktop controls unchanged');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={checks,errors,failed,physicalDeviceTestingRequired:true};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
