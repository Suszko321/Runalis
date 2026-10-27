const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const out='docs/enemy-density';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/enemy-density-lab.html');await page.waitForFunction(()=>window.enemyDensityLab?.player);await page.evaluate(()=>enemyDensityLab.setPaused(true));
  await page.waitForFunction(()=>enemyDensityLab.spriteArtStatus().some(a=>a.ready)&&enemyDensityLab.spriteArtStatus().every(a=>a.ready||a.failed));
  const report=[];
  for(const mod of ['waller','shocker','freezer','molten','vortex','artillery','bulwark','regenerator']){
   await page.selectOption('#encounter',mod);await page.evaluate(()=>{enemyDensityLab.setPaused(true);});
   const state=await page.evaluate(mod=>{
    for(let i=0;i<360;i++){enemyDensityLab.step(1/60);if(enemyDensityLab.hazards.some(h=>h.age<h.warning)||enemyDensityLab.enemy.eliteHealing||enemyDensityLab.enemy.eliteGuardActive)break;}
    enemyDensityLab.render();return {mod,hazards:enemyDensityLab.hazards.length,healing:!!enemyDensityLab.enemy.eliteHealing,guard:!!enemyDensityLab.enemy.eliteGuardActive,assets:enemyDensityLab.spriteArtStatus().filter(a=>a.failed)};
   },mod);
   assert(state.hazards||state.healing||state.guard,mod);assert.equal(state.assets.length,0,'all displayed pixel art assets load');
   await page.locator('#stage').screenshot({path:`${out}/${mod}-warning.png`});
   await page.evaluate(()=>enemyDensityLab.advance(1.5));await page.locator('#stage').screenshot({path:`${out}/${mod}-active.png`});report.push(state);
  }
  await page.selectOption('#encounter','arena');await page.evaluate(()=>{enemyDensityLab.advance(.1);enemyDensityLab.render();});
  const arena=await page.evaluate(()=>{const l=enemyDensityLab,a=l.world.bossArena;l.player.x=a.x+80;l.player.y=a.y+80;l.advance(.1);return {phase:a.phase,seals:l.world.arenaBarriers.length};});assert.equal(arena.phase,'active');assert.equal(arena.seals,4);
  await page.locator('#stage').screenshot({path:`${out}/boss-arena.png`});
  await page.selectOption('#encounter','regenerator');const before=await page.evaluate(()=>{const l=enemyDensityLab;l.advance(4);l.player.x=l.enemy.x+50;l.player.y=l.enemy.y;return l.enemy.hp;});await page.keyboard.press('e');await page.evaluate(()=>enemyDensityLab.advance(3));assert((await page.evaluate(()=>enemyDensityLab.enemy.hp))<=before,'actual keyboard attack/close counter prevents healing');
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser-verification.json`,JSON.stringify({result:'PASS',modifiers:report,arena,errors},null,2));console.log('PASS: eight rendered modifier warnings and strikes, loaded pixel art, sealed arena, real keyboard healing counter and no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
