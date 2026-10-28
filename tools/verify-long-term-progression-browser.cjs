const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),launch=require('./browser-game-smoke.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];try{
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.progressGame=()=>currentGame;'}));
 await launch(p,process.env.RUNALIS_URL||'http://127.0.0.1:8774');await p.waitForFunction(()=>progressGame()?.started&&!document.querySelector('#loadingScreen.active'));
 const before=await p.evaluate(async()=>{
  const math=await import('/src/progressionMath.js'),skills=await import('/src/skills.js'),mastery=await import('/src/abilityMasterySystem.js'),g=progressGame(),entry=g.player.skillState.combat;
  const award=math.xpForLevels(entry.level,30-entry.level,math.XP_CURVES.combat)-entry.xp+250;
  skills.addCombatXP(g.player,award);g.renderOwnedUI();if(!g.save(false))throw Error('Save failed');
  const id=g.player.loadout.abilitySlots.find(Boolean),m=mastery.getMasteryProgress(g.player,id);
  return {level:skills.getCombatLevel(g.player),xp:g.player.skillState.combat.xp,next:skills.getCombatLevelProgress(g.player).next,id,masteryLevel:m.level,masteryXP:m.xp,masteryNext:m.next};
 });
 assert.equal(before.level,30);assert(before.next>16000);assert.match(await p.locator('.player-unit-frame').innerText(),/Level 30/);
 await p.reload();await p.locator('[data-load="playerSmoke"]').click();await p.waitForFunction(()=>progressGame()?.started&&!document.querySelector('#loadingScreen.active'));
 const after=await p.evaluate(async id=>{const s=await import('/src/skills.js'),m=(await import('/src/abilityMasterySystem.js')).getMasteryProgress(progressGame().player,id);return{level:s.getCombatLevel(progressGame().player),xp:progressGame().player.skillState.combat.xp,next:s.getCombatLevelProgress(progressGame().player).next,id,masteryLevel:m.level,masteryXP:m.xp,masteryNext:m.next};},before.id);
 assert.deepEqual(after,before);await p.keyboard.press('Tab');await p.locator('[data-tab="skills"]') .click();await p.locator('button[data-skills-subtab="abilities"]') .click();await p.evaluate(id=>{progressGame().uiState.selectedAbilityId=id;progressGame().renderOwnedUI();},after.id);assert((await p.locator('[data-ability-detail-pane]').innerText()).includes(Math.ceil(after.masteryNext)+' XP'));assert.match(await p.locator('.player-unit-frame').innerText(),/Level 30/);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,checks:['Real game XP award updates player level and HUD','Assigned hotbar skills gain mastery from the same award','Player/mastery levels, XP and next thresholds survive reload'],snapshot:after,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

