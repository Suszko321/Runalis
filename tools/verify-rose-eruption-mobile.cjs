const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const out='docs/rose-eruption-mobile';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
 try{
  const p=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   // Reproduce a browser interruption: physical touchend arrives, but the
   // pointerup/lost-capture notifications do not reach the control owner.
   for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,e=>{if(window.dropSkillPointerEnd&&e.target.closest?.('[data-hold="ability0"]'))e.stopImmediatePropagation();},true);
  });
  await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.roseMobileGame=()=>currentGame;'}));
  await launch(p,process.env.RUNALIS_URL||'http://127.0.0.1:8774');await p.waitForFunction(()=>roseMobileGame()?.mobileControls);
  await p.evaluate(async()=>{
   const g=roseMobileGame(),p=g.player,{createPlayer,chooseClass,migratePlayer}=await import('/src/player.js'),{unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{createDungeonWorld}=await import('/src/dungeonSystem.js');
   Object.assign(p,createPlayer('Rose mobile'));chooseClass(p,'thornbinder');p.skillState.combat.level=33;migratePlayer(p);p.spiritAwakened=true;unlockActiveAbility(p,'thornbinderThornLash',{autoAssignEmpty:false});getAbilityMastery(p,'thornbinderThornLash',true).level=20;
   const morph=selectAbilityMorph(p,'thornbinderThornLash','petalknight',performance.now()/1000);if(!morph.ok)throw Error(morph.reason);p.loadout.abilitySlots=['thornbinderThornLash',null,null,null,'block'];
   g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:1});g.world.dungeonState.veyreign.seen[1]=true;const r=g.world.rooms.find(r=>r.id==='reception');Object.assign(p,{x:r.cx*32,y:r.cy*32,dirX:1,dirY:0});
   g.world.enemies=[{id:'rose-target',kind:'brute',x:p.x+90,y:p.y,r:14,radius:14,hp:100000,maxHp:100000,trainingDummy:true}];g.renderOwnedUI();
  });
  await p.waitForTimeout(300);const cdp=await p.context().newCDPSession(p);
  async function point(selector,id){const b=await p.locator(selector).boundingBox();return {id,x:b.x+b.width/2,y:b.y+b.height/2};}
  const touch=async(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  async function ready(){await p.evaluate(()=>{const p=roseMobileGame().player;p.cooldowns.thornbinderThornLash=-100;p.spirit=p.maxSpirit;});}
  async function state(){return p.evaluate(()=>{const g=roseMobileGame();return {charge:!!g.player.abilityCharge,level:g.player.abilityCharge?.level,held:!!g.mobileControls.input.ability0Held,cooldown:g.player.cooldowns.thornbinderThornLash,spirit:g.player.spirit,moving:Math.hypot(g.mobileControls.input.moveX,g.mobileControls.input.moveY)>0};});}
  async function cast(label,hold=.02,drop=false,move=false){
   await ready();const finger=await point('[data-hold="ability0"]',1),stick=await point('#mobileStick',2);stick.x+=25;
   const before=await state();await p.evaluate(drop=>window.dropSkillPointerEnd=drop,drop);
   await touch('touchStart',[finger,...(move?[stick]:[])]);await p.waitForFunction(()=>!!roseMobileGame().player.abilityCharge);await p.waitForTimeout(hold*1000);
   await touch('touchEnd',move?[finger]:[]);await p.waitForTimeout(100);const after=await state();
   assert(!after.charge&&!after.held,JSON.stringify({label,before,after}));assert(after.cooldown>before.cooldown,JSON.stringify({label,after}));if(move)assert(after.moving,'Skill release must not release the other movement finger');
   if(move)await touch('touchEnd');await p.evaluate(()=>window.dropSkillPointerEnd=false);checks.push(label);
  }
  await cast('ordinary tap');assert(await p.evaluate(()=>{const w=roseMobileGame().world;return w.effects.some(f=>f.geometry==='roseEruption'&&f.subclassId==='petalknight')&&w.enemies[0].hp<w.enemies[0].maxHp;}));await cast('normal fully charged release',1.1);
  await cast('missing pointerup and lost capture: real touchend clears full charge',1.1,true);
  await cast('missing pointer termination while a movement finger stays down',1.1,true,true);
  await ready();await p.evaluate(()=>window.dropSkillPointerEnd=true);const finger=await point('[data-hold="ability0"]',3),before=await state();await touch('touchStart',[finger]);await p.waitForFunction(()=>!!roseMobileGame().player.abilityCharge);await touch('touchCancel');await p.waitForTimeout(100);const cancelled=await state();assert(!cancelled.charge&&!cancelled.held);assert.equal(cancelled.cooldown,before.cooldown);assert.equal(cancelled.spirit,before.spirit);await p.evaluate(()=>window.dropSkillPointerEnd=false);checks.push('missing pointercancel: physical cancellation unlocks without casting or paying resources');
  await p.evaluate(()=>{window.realPointerCapture=Element.prototype.setPointerCapture;Element.prototype.setPointerCapture=()=>{throw Error('Contact ended before capture');};});
  await cast('pointer-capture failure still releases through the window');await p.evaluate(()=>Element.prototype.setPointerCapture=window.realPointerCapture);
  await ready();await p.evaluate(()=>{const b=document.querySelector('[data-hold="ability0"]');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:988,clientX:600,clientY:260}));});await p.waitForFunction(()=>!!roseMobileGame().player.abilityCharge);
  await p.evaluate(()=>document.querySelector('#mobileStick').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:988,clientX:80,clientY:300})));await p.waitForTimeout(100);assert(!(await state()).charge&&!(await state()).held);await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:988})));checks.push('reused pointer identifier cancels its old skill ownership');
  await ready();await touch('touchStart',[await point('[data-hold="ability0"]',6)]);await p.waitForFunction(()=>roseMobileGame().player.abilityCharge?.level===2);await p.evaluate(()=>roseMobileGame().player.spirit=0);await touch('touchEnd');await p.waitForTimeout(100);const poor=await state();assert(!poor.charge&&!poor.held&&poor.cooldown===-100);await cast('a release refused for insufficient resources cannot lock subsequent casts');
  for(let i=0;i<8;i++)await cast('repeat cast '+i,i%2?1.1:.02);
  await ready();await touch('touchStart',[await point('[data-hold="ability0"]',4)]);await p.waitForFunction(()=>!!roseMobileGame().player.abilityCharge);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await touch('touchEnd');assert(!(await state()).charge);await cast('casting recovers after interrupted focus');
  await ready();await touch('touchStart',[await point('[data-hold="ability0"]',5)]);await p.waitForFunction(()=>!!roseMobileGame().player.abilityCharge);await p.setViewportSize({width:915,height:412});await touch('touchEnd');await cast('casting recovers after rotation/resize');
  fs.mkdirSync(out,{recursive:true});await p.screenshot({path:out+'/working-cast.png'});assert.deepEqual(errors,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
