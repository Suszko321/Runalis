const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();await page.goto('http://127.0.0.1:8766/world-lab.html');await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);
 const result=await page.evaluate(async()=>{
  const {renderWorldMap,handleWorldMapControllerInput}=await import('/src/panelWorldMap.js');const {worldMemory}=await import('/src/worldExploration.js');const {countItem}=await import('/src/player.js');
  const g=window.review,source=g.world.navStones[0],target=g.world.navStones.find(s=>s.id!==source.id);g.world.enemies=[];
  // Isolate confirmation from guards in unloaded destination chunks as well.
  if(g.world.continentRuntime)g.world.continentRuntime.previewAt=()=>({enemies:[]});
  const m=worldMemory(g.player);m.stones[source.id]=true;m.stones[target.id]=true;m.lastDanger=-100;
  g.player.x=0;g.player.y=0;g.uiState.activeMainTab='map';document.querySelector('#map').classList.add('active');g.mapSelectedStone=target.id;renderWorldMap(g.player,g);
  handleWorldMapControllerInput(g,{confirmPressed:true});const blocked=!!document.querySelector('.survey-travel-status.travel-blocked'),reason=document.querySelector('.survey-travel-status').textContent;
  const before=countItem(g.player,'fieldRations'),elapsed=m.elapsed;
  g.player.x=source.x;g.player.y=source.y;
  // The detail button is still disabled from the previous check. A must check
  // live availability rather than silently ignoring that stale DOM state.
  handleWorldMapControllerInput(g,{confirmPressed:true});
  return {blocked,reason,moved:g.player.x===target.x&&g.player.y===target.y,cost:before-countItem(g.player,'fieldRations'),time:m.elapsed-elapsed,closed:g.uiState.activeMainTab===null};
 });
 assert(result.blocked&&result.reason.includes('Stand beside'));assert(result.moved&&result.closed);assert.equal(result.cost,1);assert.equal(result.time,120);
 console.log('PASS: A explains blocked travel and rechecks live state; successful travel moves player, spends one ration, advances time and closes map.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
