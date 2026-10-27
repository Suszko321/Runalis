const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/world-lab.html');await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);
 const results=await page.evaluate(async()=>{
  const {discoverStone,worldMemory}=await import('/src/worldExploration.js');
  const {saveGameProfile,PROFILE_KEY}=await import('/src/gameSave.js');
  const {renderWorldMap}=await import('/src/panelWorldMap.js');
  const g=window.review,world=g.world,tiles=world.tiles,objects=world.objects,enemies=world.enemies;
  g.profileId='nav-performance-test';g.profileName='Nav performance test';
  let rebuilds=0,saves=0;g.finalizeLoadedState=()=>{rebuilds++;throw new Error('Saving rebuilt live world');};
  g.save=()=>{saves++;return saveGameProfile(g,false).saved;};
  const stone=world.navStones[0];Object.assign(g.player,{x:stone.x,y:stone.y});
  let t=performance.now();const discovered=discoverStone(g,stone),discoveryMs=performance.now()-t;
  const duplicate=discoverStone(g,stone);
  const saved=JSON.parse(localStorage.getItem(PROFILE_KEY))[g.profileId];
  const host=document.querySelector('#map');host.innerHTML='';g.uiState.activeMainTab=null;
  t=performance.now();for(let i=0;i<100;i++)renderWorldMap(g.player,g);const hiddenMs=performance.now()-t,hiddenNodes=host.childElementCount;
  g.uiState.activeMainTab='map';t=performance.now();renderWorldMap(g.player,g);const firstMapMs=performance.now()-t,root=host.firstElementChild;
  t=performance.now();for(let i=0;i<100;i++)renderWorldMap(g.player,g);const cachedMapMs=performance.now()-t,sameRoot=root===host.firstElementChild;
  const landNodes=host.querySelector('svg.survey-art > g')?.childElementCount;
  return {discovered,duplicate,rebuilds,saves,persisted:!!saved?.state?.player?.worldMemory?.stones?.[stone.id],worldUnchanged:g.world===world&&world.tiles===tiles&&world.objects===objects&&world.enemies===enemies,hiddenNodes,sameRoot,landNodes,discoveryMs,hiddenMs,firstMapMs,cachedMapMs};
 });
 assert(results.discovered&&!results.duplicate);assert.equal(results.rebuilds,0);assert.equal(results.saves,1);assert(results.persisted);assert(results.worldUnchanged);
 assert.equal(results.hiddenNodes,0);assert(results.sameRoot);assert(results.landNodes<=9);assert.deepEqual(errors,[]);
 console.log('PASS: discovery persists once without rebuilding world; hidden map does no DOM work; unchanged map retains DOM; terrain uses at most nine land paths.',results);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
