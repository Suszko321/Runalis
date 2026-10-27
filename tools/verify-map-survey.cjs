const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/world-lab.html');await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);
 await page.evaluate(async()=>{
  for(const href of ['/style.css','/visual-polish.css','/lexicon.css']){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);} const {injectRunalisUiStyles}=await import('/src/uiStyles.js');injectRunalisUiStyles();
  const style=document.createElement('style');style.textContent='#map{position:fixed;inset:12px;max-width:none;background:#161c18;padding:18px;z-index:100}';document.head.append(style);
  const {worldMemory,updateWorldExploration,discoverStone}=await import('/src/worldExploration.js');
  const g=window.review,m=worldMemory(g.player);g.uiState.activeMainTab="map";g.world.enemies=[];
  for(const p of g.world.authoredLocations.slice(0,12)){Object.assign(g.player,{x:p.x,y:p.y});g.world.explorationTick=0;updateWorldExploration(g,.5);}
  for(const stone of g.world.navStones.slice(0,3)){Object.assign(g.player,{x:stone.x,y:stone.y});discoverStone(g,stone);}
  Object.assign(g.player,{x:g.world.navStones[0].x,y:g.world.navStones[0].y});m.lastDanger=-100;
  const {renderWorldMap}=await import('/src/panelWorldMap.js');renderWorldMap(g.player,g);
 });
 await page.screenshot({path:'docs/visual-production/map-survey-review.png'});
 assert.equal(await page.locator('.survey-stone-list button').count(),3);
 await page.locator('.survey-stone-list button').nth(1).click();
 assert.equal(await page.locator('[data-nav-stone]').isEnabled(),true);
 const target=await page.locator('[data-nav-stone]').getAttribute('data-nav-stone');await page.locator('[data-nav-stone]').click();
 assert(await page.evaluate(id=>{const g=window.review,s=g.world.navStones.find(s=>s.id===id);return g.player.x===s.x&&g.player.y===s.y;},target));
 await page.evaluate(async()=>{const {renderWorldMap}=await import('/src/panelWorldMap.js');window.review.uiState.activeMainTab="map";renderWorldMap(window.review.player,window.review);});
 await page.locator('[data-map-zoom="in"]').click();assert((await page.locator('.survey-surface').getAttribute('style')).includes('scale(1.4)'));
 await page.locator('[data-map-zoom="reset"]').click();
 await page.setViewportSize({width:760,height:700});await page.screenshot({path:'docs/visual-production/map-survey-small.png'});
 assert.deepEqual(errors,[]);console.log('PASS: map renders, destinations select, travel moves party, zoom works, no browser errors.');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});

