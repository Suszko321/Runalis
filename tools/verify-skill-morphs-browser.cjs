const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],layouts=[],base=process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8768';fs.mkdirSync('docs/skill-morphs',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto(base+'/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),p=await import('/src/player.js'),tree=await import('/src/skillTreeSystem.js'),morph=await import('/src/abilityMorphSystem.js');
   const {createWorld}=await import('/src/world.js');
   const game={player:p.createPlayer('Morph review'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   p.chooseClass(game.player,'waverider');game.player.gold=20;game.player.skillTree.bloodlineBonusPoints=100;
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
   ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);window.morphReview={game,ui,p,tree,morph};game.renderOwnedUI();
  });
  await page.locator('[data-tab="skills"]').evaluate(e=>e.click());await page.locator('button.subtab[data-skills-subtab="trees"]').click();
  assert.equal(await page.locator('[data-subclass-choice]').count(),0);assert(await page.locator('.prerequisite-tree').isVisible());
  await page.evaluate(()=>{const {game,tree}=morphReview;if(!tree.spendSkillTreeNode(game.player,'hydromancy_root').ok)throw Error('Original tree root failed');game.renderOwnedUI();});
  await page.screenshot({path:'docs/skill-morphs/original-tree.png'});
  await page.locator('button.subtab[data-skills-subtab="abilities"]').click();
  const id='hydromancerWaterTorrent';await page.locator(`[data-select-ability-id="${id}"]`).click();
  assert.equal(await page.locator('[data-ability-morph]').count(),3);assert.equal(await page.locator('[data-ability-morph="base"]').getAttribute('aria-pressed'),'true');
  assert(await page.locator('[data-ability-morph="sunken"]').isDisabled());assert(await page.locator('[data-ability-morph="cryomancer"]').isDisabled());
  await page.evaluate(()=>{const p=morphReview.game.player;p.abilityMastery.hydromancerWaterTorrent={level:5,xp:0};morphReview.game.renderOwnedUI();});
  await page.locator('[data-ability-morph="sunken"]').click();
  assert.deepEqual(await page.evaluate(()=>morphReview.game.player.abilityMorphs),{hydromancerWaterTorrent:'sunken'});
  assert.equal(await page.locator('[data-ability-morph="sunken"]').getAttribute('aria-pressed'),'true');
  assert(await page.locator('[data-ability-morph="cryomancer"]').isDisabled());
  // Hovering refreshes the detail pane, so its newly created controls must work.
  await page.locator(`[data-select-ability-id="${id}"]`).dispatchEvent('mouseenter');await page.locator('[data-ability-morph="base"]').click();
  assert.deepEqual(await page.evaluate(()=>morphReview.game.player.abilityMorphs),{});
  await page.evaluate(()=>{morphReview.game.player.abilityMastery.hydromancerWaterTorrent.level=10;morphReview.game.renderOwnedUI();});
  await page.evaluate(()=>{const {game,ui}=morphReview;game.uiState.abilityAssignmentMode=false;game.uiAbilityControllerState={region:'ability',abilityIndex:0,hotbarIndex:0};ui.handleGameUiControllerInput(game,{connected:true,xPressed:true});ui.handleGameUiControllerInput(game,{connected:true,downPressed:true});ui.handleGameUiControllerInput(game,{connected:true,confirmPressed:true});});
  assert.equal(await page.evaluate(()=>morphReview.game.player.abilityMorphs.hydromancerWaterTorrent),'sunken','Controller selects individual form');
  await page.locator('[data-assign-selected-slot="2"]').click();
  assert.equal(await page.evaluate(()=>morphReview.game.player.loadout.abilitySlots[2]),id);assert.equal(await page.locator('[data-ability-morph="sunken"]').getAttribute('aria-pressed'),'true');
  for(const [width,height] of [[1440,900],[1280,720],[800,700]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>morphReview.game.renderOwnedUI());
   await page.evaluate(()=>document.querySelector('.ability-detail-pane').scrollTop=0);await page.screenshot({path:`docs/skill-morphs/abilities-${width}.png`});
   layouts.push(await page.evaluate(()=>{const root=document.querySelector('.ability-detail-pane'),b=root.getBoundingClientRect();const rows=[...root.querySelectorAll('[data-ability-morph]')];return {width:innerWidth,height:innerHeight,morphCount:rows.length,detailWidth:b.width,horizontalClipping:rows.filter(e=>{const r=e.getBoundingClientRect();return r.left<b.left-1||r.right>b.right+1;}).map(e=>e.dataset.abilityMorph)};}));
   assert.equal(layouts.at(-1).morphCount,3);assert.deepEqual(layouts.at(-1).horizontalClipping,[]);
   await page.locator('[data-ability-morph="sunken"]').click();assert.equal(await page.evaluate(()=>morphReview.game.player.abilityMorphs.hydromancerWaterTorrent),'sunken');
   await page.locator('[data-ability-morph="base"]').click();assert.deepEqual(await page.evaluate(()=>morphReview.game.player.abilityMorphs),{});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(async()=>{const {game}=morphReview;const {unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');unlockActiveAbility(game.player,'waveriderUndertow');game.player.abilityMastery.waveriderUndertow={level:10,xp:0};const id='hydromancerWaterTorrent';morphReview.morph.selectAbilityMorph(game.player,id,'cryomancer');morphReview.morph.selectAbilityMorph(game.player,'waveriderUndertow','sunken');game.renderOwnedUI();});
  assert.deepEqual(await page.evaluate(()=>morphReview.game.player.abilityMorphs),{hydromancerWaterTorrent:'cryomancer',waveriderUndertow:'sunken'});
  await page.locator('button.subtab[data-skills-subtab="trees"]').click();await page.locator('[data-skill-respec]').click();await page.locator('[data-skill-respec]').click();
  assert.equal(await page.evaluate(()=>morphReview.game.player.gold),19);assert.equal(await page.evaluate(()=>morphReview.tree.getSpentSkillTreePoints(morphReview.game.player)),0);
  const arena=await browser.newPage({viewport:{width:1440,height:900}});arena.on('pageerror',e=>errors.push(e.message));
  await arena.goto(base+'/combat-overhaul-lab.html?skill=hydromancerWaterTorrent&morph=sunken');await arena.waitForFunction(()=>window.combatReview?.game.player?.abilityMorphs?.hydromancerWaterTorrent==='sunken');
  assert.equal(await arena.locator('#subclass').count(),0);await arena.locator('#morph').selectOption('base');
  assert.equal(await arena.evaluate(()=>combatReview.game.player.classId),'waverider');assert.equal(await arena.evaluate(()=>combatReview.game.player.abilityMorphs.hydromancerWaterTorrent),undefined);
  await arena.locator('#morph').selectOption('sunken');
  await arena.evaluate(async()=>{const {useAbility,updateCombat}=await import('/src/combat.js');const g=combatReview.game,t=performance.now()/1000,input={hasAim:true,combatAimX:1,combatAimY:0,ability3Held:true};useAbility(3,g.player,g.world,g.log,t,input);updateCombat(g.player,g.world,input,.45,t+.45,g.log);g.world.effects.forEach(f=>f.age=.03);combatReview.draw();});
  assert(!(await arena.evaluate(()=>combatReview.game.player.activeChannel)));assert(await arena.evaluate(()=>combatReview.game.world.effects.some(f=>f.kind==='sunkenSkill')));await arena.locator('#arena').screenshot({path:'docs/skill-morphs/optional-sunken-channel.png'});
  const smoke=await browser.newPage({viewport:{width:1280,height:720}});smoke.on('pageerror',e=>errors.push(e.message));await require('./browser-game-smoke.cjs')(smoke,base);
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/skill-morphs/browser-checks.json',JSON.stringify({layouts,errors,checks:['Original tree accessible without calling','Mastery gates and optional original restoration','Mouse, refreshed detail controls and controller morph selection','Canonical hotbar assignment and independent selections','One gold point reset preserves choices','Review arena per-skill channel','Full game new-character smoke']},null,2));
  console.log(JSON.stringify({pass:true,layouts,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

