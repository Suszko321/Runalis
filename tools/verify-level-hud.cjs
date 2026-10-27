const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),player=await import('/src/player.js'),tree=await import('/src/skillTreeSystem.js');
   const p=player.createPlayer('Thorn level review');player.chooseClass(p,'thornbinder');
   p.skillState.combat={level:5,xp:0};p.combatLevel=5;p.skillState.skills.warding.level=3;
   const game={player:p,world:{mode:'overworld',objects:[],enemies:[],width:640,height:480},camera:{x:0,y:0},logLines:[],log(){},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
   ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,[],game);game.renderOwnedUI();window.levelReview={game,ui,player,tree};
  });
  const frame=await page.locator('.player-unit-frame').innerText();
  assert.match(frame,/Level 5/);assert.doesNotMatch(frame,/Combat Lv|Combat Level|Warding/);
  assert.match(await page.locator('#combatSkillHud').innerText(),/Level 5/);
  fs.mkdirSync('docs/level-points-fix',{recursive:true});
  await page.locator('.player-unit-frame').screenshot({path:'docs/level-points-fix/hud.png'});
  await page.locator('[data-tab="character"]').evaluate(e=>e.click());
  await page.locator('[data-character-subtab="sheet"]').click();
  assert.equal(await page.locator('[data-character-stat="Level"]').count(),1);
  await page.evaluate(()=>{levelReview.game.uiState.selectedCharacterStat='Combat Level';levelReview.game.renderOwnedUI();});
  assert.doesNotMatch(await page.locator('#character').innerText(),/Combat Level/);
  await page.locator('[data-tab="skills"]').evaluate(e=>e.click());
  await page.locator('[data-skills-subtab="trees"]').click();
  assert.match(await page.locator('#skills').innerText(),/Gain 1 skill point each level/);
  const points=await page.evaluate(()=>({earned:levelReview.tree.getEarnedSkillTreePoints(levelReview.game.player),available:levelReview.tree.getAvailableSkillTreePoints(levelReview.game.player)}));
  assert(points.earned>=4);
  await page.evaluate(()=>{const r=levelReview;r.game.player=r.player.createPlayer('Classless level review');r.player.chooseClass(r.game.player,'classless');r.game.player.skillState.combat={level:5,xp:0};r.game.player.combatLevel=5;r.game.renderOwnedUI();});
  assert.match(await page.locator('.skill-tree-status-chips').innerText(),/4 Available/);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,points,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
