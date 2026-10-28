const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8774';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
 try{
  const p=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.treeGame=()=>currentGame;'}));
  await launch(p,base);await p.waitForFunction(()=>treeGame()?.started&&!document.querySelector('#loadingScreen.active'));
  await p.evaluate(()=>treeGame().player.skillTree.bloodlineBonusPoints=20);
  await p.locator('[data-action="menu"]').tap();await p.locator('[data-tab="skills"]').tap();await p.locator('button[data-skills-subtab="trees"]').tap();
  await p.locator('[data-skill-tree-select="blade"]').tap();
  const root=p.locator('[data-select-skill-tree-node="blade_root"]'),pane=p.locator('[data-skill-tree-detail]');
  const state=()=>p.evaluate(async()=>{const t=await import('/src/skillTreeSystem.js');return {points:t.getAvailableSkillTreePoints(treeGame().player),learned:t.isSkillTreeNodeUnlocked(treeGame().player,'blade_root')};});
  const before=await state();assert(!(await pane.isVisible()));
  await root.tap();await p.waitForTimeout(420);assert(await pane.isVisible());assert.deepEqual(await state(),before);
  assert(await p.locator('[data-mobile-tree-close]').isVisible());assert(await p.locator('[data-tab="inventory"]').isVisible());
  await p.screenshot({path:'tmp/mobile-tree-description-landscape.png'});const box=await pane.boundingBox();assert(box.height<=390*.48+1);await p.locator('[data-mobile-tree-close]').tap();assert(!(await pane.isVisible()));
  checks.push('Single tap shows a dismissible description without spending points or blocking navigation');
  await root.scrollIntoViewIfNeeded();const point=await root.boundingBox();
  await p.touchscreen.tap(point.x+point.width/2,point.y+point.height/2);await p.waitForTimeout(70);await p.touchscreen.tap(point.x+point.width/2,point.y+point.height/2);
  await p.waitForTimeout(450);const after=await state();assert(after.learned);assert.equal(before.points-after.points,1);assert(!(await pane.isVisible()));
  checks.push('Two real touch taps purchase once without opening a sheet over the second tap');
  async function doubleTap(loc){await loc.scrollIntoViewIfNeeded();const b=await loc.boundingBox();await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await p.waitForTimeout(70);await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await p.waitForTimeout(400);}
  await doubleTap(root);assert.deepEqual(await state(),after);
  const locked=p.locator('[data-select-skill-tree-node].locked').first(),lockedId=await locked.getAttribute('data-select-skill-tree-node');await doubleTap(locked);
  assert.equal((await state()).points,after.points);assert(!(await p.evaluate(async id=>(await import('/src/skillTreeSystem.js')).isSkillTreeNodeUnlocked(treeGame().player,id),lockedId)));
  checks.push('Learned and locked nodes cannot consume extra points');
  const saved=await p.evaluate(async()=>(await import('/src/gameSave.js')).readProfiles().playerSmoke.state.player.skillTree.spent.blade_root);assert(saved);
  await p.setViewportSize({width:390,height:844});await p.locator('[data-mobile-portrait]').tap();await root.tap();await p.waitForTimeout(420);assert(await pane.isVisible());await p.screenshot({path:'tmp/mobile-tree-description-portrait.png'});await p.locator('[data-mobile-tree-close]').tap();
  await p.locator('[data-tab="inventory"]').tap();assert(await p.locator('#inventory.active').isVisible());
  checks.push('Purchase persists in the save; portrait popup closes and another menu remains reachable');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,pass:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



