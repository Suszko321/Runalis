const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),player=await import('/src/player.js'),loadout=await import('/src/abilityLoadoutSystem.js'),data=await import('/src/data.js');
   const p=player.createPlayer('Class skill review');player.chooseClass(p,'waverider');loadout.unlockActiveAbility(p,'hydromancerBubbleWard',{autoAssignEmpty:false});
   const game={player:p,world:{mode:'overworld',objects:[],enemies:[],width:640,height:480},camera:{x:0,y:0},logLines:[],log(){},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);
   game.renderOwnedUI=()=>ui.renderUI(game.player,[],game);game.uiState.skillsSubtab='abilities';game.uiState.selectedAbilityId='hydromancerBubbleWard';game.renderOwnedUI();window.gateReview={game,ui,player,loadout,data};
  });
  await page.locator('[data-tab="skills"]').evaluate(e=>e.click());
  const detail=await page.locator('.ability-detail-pane').innerText();assert.doesNotMatch(detail,/Warding 8|Warding level 8|Requires.*level/i);
  assert(await page.evaluate(()=>gateReview.loadout.assignAbilityToSlot(gateReview.game.player,1,'hydromancerBubbleWard').ok));
  await page.evaluate(()=>gateReview.game.renderOwnedUI());assert.doesNotMatch(await page.locator('#combatSkillHud').innerText(),/Warding 1\/8/);
  await page.locator('[data-skills-subtab="trees"]').click();
  await page.evaluate(()=>{const g=gateReview.game;g.uiState.selectedSkillTreeId='hydromancy';g.uiState.selectedSkillTreeNodeId='hydromancy_bubble_ward';g.renderOwnedUI();});
  assert.doesNotMatch(await page.locator('[data-skill-tree-detail]').innerText(),/Warding 8|Warding level 8/);
  await page.evaluate(()=>{const r=gateReview;r.game.player=r.player.createPlayer('Scroll requirement review');r.player.chooseClass(r.game.player,'classless');r.loadout.unlockActiveAbility(r.game.player,'guard',{autoAssignEmpty:false});r.data.getAbilityById('guard').unlockLevel=7;r.game.uiState.skillsSubtab='abilities';r.game.uiState.selectedAbilityId='guard';r.game.renderOwnedUI();});
  assert.match(await page.locator('.ability-detail-pane').innerText(),/Warding 7|Warding level 7/);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks:'class ability panel, tree detail and HUD at proficiency one; scroll requirement remains visible',errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
