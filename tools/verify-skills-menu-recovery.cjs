const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8775',out='docs/skills-menu-recovery';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{for(const [width,height,mobile]of [[844,390,true],[390,844,true],[1280,800,false],[800,600,false]]){
  const p=await browser.newPage({viewport:mobile?{width:844,height:390}:{width,height},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>Element.prototype.requestFullscreen=async()=>{throw Error('Test fullscreen unavailable');});
  await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.menuRecoveryGame=()=>currentGame;'}));
  await launch(p,base);await p.waitForFunction(()=>menuRecoveryGame()?.started&&!document.querySelector('#loadingScreen.active'));
  await p.setViewportSize({width,height});if(await p.locator('[data-mobile-portrait]').isVisible())await p.locator('[data-mobile-portrait]').tap();
  const click=async selector=>mobile?p.locator(selector).tap():p.locator(selector).click();
  const menu=async()=>mobile?click('[data-action="menu"]'):p.keyboard.press('Tab');
  const chooser=async()=>{
   assert(await p.locator('.panel.open.menu-chooser').isVisible());
   for(const id of ['skills','inventory','character','quests','map','log'])assert(await p.locator(`[data-tab="${id}"]`).isVisible(),`${width}: ${id} remains visible`);
   assert.equal(await p.locator('.tab-panel.active').count(),0);
   assert.equal(await p.locator('#skills .mobile-detail-open').count(),0,'Leaving Skills dismisses its detail sheet');
  };
  await menu();await click('[data-tab="skills"]');await click('[data-skills-subtab="abilities"]');
  const original=await p.evaluate(()=>[...menuRecoveryGame().player.loadout.abilitySlots]);
  // Reproduce: leave a skill detail sheet open, then return directly to Menus.
  await click('[data-select-ability-id="oathkeeperOathStrike"]');if(mobile)assert(await p.locator('.mobile-detail-open').isVisible());
  await menu();await chooser();await p.screenshot({path:out+`/recovered-${width}.png`});
  for(let i=0;i<3;i++){await menu();assert.equal(await p.locator('.panel.open').count(),0);await menu();await chooser();}
  await click('[data-tab="inventory"]');assert(await p.locator('#inventory.active').isVisible());await menu();await chooser();
  await click('[data-tab="skills"]');await click('[data-select-ability-id="oathkeeperOathStrike"]');
  // Changing a morph rebuilds the sheet; it must not poison the next menu.
  await p.evaluate(async()=>{const g=menuRecoveryGame();g.player.abilityMastery.oathkeeperOathStrike={level:10,xp:0};g.player.abilityMasteryVersion=1;(await import('/src/ui.js')).renderUI(g.player,g.logLines,g);});
  await click('[data-ability-morph="holyknight"]');await menu();await chooser();
  assert.equal(await p.evaluate(()=>menuRecoveryGame().player.abilityMorphs.oathkeeperOathStrike),'holyknight');
  assert.deepEqual(await p.evaluate(()=>menuRecoveryGame().player.loadout.abilitySlots),original);
  await click('[data-tab="skills"]');await click('[data-assign-selected-slot="2"]');await menu();await chooser();
  assert.equal(await p.evaluate(()=>menuRecoveryGame().uiState.hotbarTargetSlot),null);
  await click('[data-tab="skills"]');await click('[data-select-ability-id="oathkeeperOathStrike"]');await click('[data-clear-all-ability-slots]');await menu();await chooser();
  assert.deepEqual(await p.evaluate(()=>menuRecoveryGame().player.loadout.abilitySlots),[null,null,null,null,null]);
  // Hidden or stale skill markup cannot hide the chooser, even before a rerender.
  await p.evaluate(()=>document.querySelector('.ability-management-onepage').classList.add('mobile-detail-open'));
  assert(await p.locator('[data-tab="skills"]').isVisible(),'Chooser ignores hidden skill detail markup');assert(await p.locator('[data-tab="inventory"]').isVisible());
  await click('[data-tab="inventory"]');await menu();await chooser();
  checks.push({width,height,mobile,pass:true});await p.close();
 }
 assert.deepEqual(errors,[]);const report={checks,errors};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
