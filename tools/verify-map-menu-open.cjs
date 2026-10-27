const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/world-lab.html');await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);
 const result=await page.evaluate(async()=>{
  const {initUI}=await import('/src/ui.js');const {renderWorldMap}=await import('/src/panelWorldMap.js');
  const {discoverStone}=await import('/src/worldExploration.js');const g=window.review;
  for(const stone of g.world.navStones.slice(0,2)){g.player.x=stone.x;g.player.y=stone.y;discoverStone(g,stone);}
  const map=document.querySelector('#map');map.className='tab-panel';map.innerHTML='';
  const root=document.createElement('div');root.className='panel';root.innerHTML='<div class="tabs"><button class="tab" data-tab="map">Map</button></div>';document.body.append(root);root.append(map);
  g.uiState.activeMainTab=null;initUI(g);renderWorldMap(g.player,g);const hiddenEmpty=!map.querySelector('.survey-art');
  document.querySelector('[data-tab="map"]').click();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const surface=map.querySelector('.survey-surface'),rect=surface?.getBoundingClientRect();
  const first={art:!!map.querySelector('.survey-art'),fog:!!map.querySelector('mask[id$="-fog"]'),stones:map.querySelectorAll('.survey-stone-list button').length,width:rect?.width,height:rect?.height};
  document.querySelector('[data-tab="map"]').click();document.querySelector('[data-tab="map"]').click();
  return {hiddenEmpty,first,reopened:!!map.querySelector('.survey-art')&&map.classList.contains('active')};
 });
 assert(result.hiddenEmpty);assert(result.first.art&&result.first.fog);assert.equal(result.first.stones,2);assert(result.first.width>0&&result.first.height>0);assert(result.reopened);assert.deepEqual(errors,[]);
 console.log('PASS: opening the actual Map menu renders terrain, fog and discovered stones; visible viewport has size; reopening works; closed map stays lazy.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
