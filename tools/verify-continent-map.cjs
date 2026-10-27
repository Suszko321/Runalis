const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const dir='docs/world-rebuild/map';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],report={layouts:[],checks:[]};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),p=await import('/src/player.js'),worlds=await import('/src/world.js'),map=await import('/src/panelWorldMap.js'),survey=await import('/src/mapSurvey.js'),exploration=await import('/src/worldExploration.js');
   const world=worlds.createWorld({skipPublishedOverride:true});if(world.continentId!=='runalis')throw Error('Continuous root world not integrated yet');
   const player=p.createPlayer('Continent map review');Object.assign(player,{x:world.spawn.x,y:world.spawn.y});p.addItem(player,'fieldRations',5);
   const game={player,world,camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   const memory=exploration.worldMemory(player),west=world.navStones.find(s=>s.id==='nav-hearthmereFrontier-outpost'),east=world.navStones.find(s=>s.id==='continent-zarynth-trade-ward-nav');if(!west||!east)throw Error('Required west/east stones absent');
   Object.assign(player,{x:west.x,y:west.y});memory.stones[west.id]={name:west.name};memory.stones[east.id]={name:east.name};memory.locations['map:orrakai']={name:'Orrakai'};
   const visited=world.authoredLocations.find(s=>s.sourceRegionId==='aureateMarches');if(visited)memory.locations[`${exploration.worldEntityMemoryKey(world,visited)}:${exploration.worldEntityMemoryId(visited)}`]={name:visited.name,x:visited.x,y:visited.y};
   memory.surveys['overworld:hearthmereFrontier']={cells:{'3,3':true,'3,4':true},biomes:{woodland:{x:28,y:28,name:'Echoryn Woodland'}}};
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);game.renderOwnedUI();
   window.continentMapReview={game,ui,p,map,survey,exploration,west,east,visited};
  });
  await page.locator('[data-tab="map"]').evaluate(e=>e.click());
  assert.equal(await page.locator('[data-survey-macro="continent"]').count(),1);assert.match(await page.locator('#map').innerText(),/Continental survey/i);
  assert.equal(await page.locator('.survey-stone-list [data-select-stone]').count(),2,'Undiscovered stones leaked into destination list');
  assert.equal(await page.locator('[data-map-return]').count(),1);assert.equal(await page.locator('[data-map-zoom="nearby"]').count(),1);
  const visible=await page.evaluate(()=>{const r=continentMapReview,shown=[...document.querySelectorAll('[data-map-place]')].map(e=>e.dataset.mapPlace);return {known:shown,visited:r.visited?.id,all:r.game.world.authoredLocations.length,cells:Object.keys(r.game.player.worldMemory.surveys['overworld:runalis'].cells).length};});
  assert.ok(visible.cells>2,'Legacy survey was not merged');if(visible.visited)assert.ok(visible.known.includes(visible.visited));assert.ok(visible.known.length<visible.all/2,'Unvisited global sites leaked into map');report.checks.push('discovered-only global locations and attuned destinations');
  await page.screenshot({path:dir+'/continental-fog.png'});
  await page.locator('[data-map-zoom="nearby"]').click();assert.equal(await page.evaluate(()=>document.querySelector('#map').surveyView.zoom),12);
  const markerSize=await page.locator('.survey-surface .survey-stone.selected').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));assert.ok(markerSize.width<=40&&markerSize.height<=44,'Nearby zoom enlarged the Nav Stone button over the map');report.checks.push('map markers retain readable screen size at nearby zoom');
  await page.screenshot({path:dir+'/nearby-orrakai.png'});
  const before=await page.evaluate(()=>document.querySelector('#map').surveyView);
  await page.evaluate(()=>{const r=continentMapReview;r.game.player.worldMemory.surveys['overworld:runalis'].revision+=1;r.map.renderWorldMap(r.game.player,r.game);});
  const after=await page.evaluate(()=>document.querySelector('#map').surveyView);assert.equal(after.zoom,before.zoom);assert.ok(Math.abs(after.panX-before.panX)<.05);report.checks.push('nearby zoom and pan survive map refresh');
  await page.locator('[data-map-zoom="reset"]').click();assert.equal(await page.evaluate(()=>document.querySelector('#map').surveyView.zoom),1);
  for(const [width,height] of [[1440,900],[1280,720],[800,700]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(requestAnimationFrame));
   const fit=await page.evaluate(()=>{const map=document.querySelector('#map'),surface=map.querySelector('.survey-surface'),viewport=map.querySelector('.survey-viewport');return {mapWidth:map.clientWidth,mapScrollWidth:map.scrollWidth,viewportWidth:viewport.clientWidth,viewportHeight:viewport.clientHeight,surfaceWidth:surface.offsetWidth,surfaceHeight:surface.offsetHeight,svgBytes:map.querySelector('.survey-art').outerHTML.length};});
   assert.ok(fit.surfaceWidth<=fit.viewportWidth+1);assert.ok(fit.surfaceHeight<=fit.viewportHeight+1);assert.ok(fit.mapScrollWidth<=fit.mapWidth+2,'Map horizontally overflows at '+width);assert.ok(fit.svgBytes<100000);report.layouts.push({width,height,...fit});await page.screenshot({path:dir+`/map-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  const danger=await page.evaluate(()=>{
   const r=continentMapReview,w=r.game.world,original=w.continentRuntime.previewAt,qty=r.p.countItem(r.game.player,'fieldRations'),position={x:r.game.player.x,y:r.game.player.y};
   w.continentRuntime.previewAt=(x,y)=>({objects:[],enemies:[{id:'qa-remote-guard',x,y,hp:100}]});r.game.mapSelectedStone=r.east.id;r.map.renderWorldMap(r.game.player,r.game);
   const blocked=document.querySelector(`[data-nav-stone="${r.east.id}"]`).disabled,text=document.querySelector('.survey-travel-status').textContent;
   const travelled=r.exploration.travelByStone(r.game,r.east.id),afterQty=r.p.countItem(r.game.player,'fieldRations');w.continentRuntime.previewAt=original;
   return {blocked,text,travelled,qty,afterQty,samePosition:r.game.player.x===position.x&&r.game.player.y===position.y};
  });
  assert.ok(danger.blocked);assert.match(danger.text,/Danger/);assert.equal(danger.travelled,false);assert.equal(danger.qty,danger.afterQty);assert.ok(danger.samePosition);report.checks.push('remote guard rejects travel with no cost or movement');
  await page.evaluate(()=>{const r=continentMapReview,world=r.game.world,sv=r.survey.getSurvey(r.game.player.worldMemory,world);for(let y=0;y<Math.ceil(world.height/8);y++)for(let x=0;x<Math.ceil(world.width/8);x++)sv.cells[`${x},${y}`]=true;sv.revision+=1;r.map.renderWorldMap(r.game.player,r.game);});
  await page.locator('[data-map-zoom="reset"]').click();await page.screenshot({path:dir+'/macro-terrain-full-qa.png'});
  const travelled=await page.evaluate(()=>{
   const r=continentMapReview,qty=r.p.countItem(r.game.player,'fieldRations');
   r.map.handleWorldMapControllerInput(r.game,{upPressed:true});const up=r.game.mapSelectedStone;
   r.map.handleWorldMapControllerInput(r.game,{downPressed:true});const down=r.game.mapSelectedStone;
   r.map.handleWorldMapControllerInput(r.game,{confirmPressed:true});
   return {up,down,source:r.west.id,target:r.east.id,x:r.game.player.x,y:r.game.player.y,targetX:r.east.x,targetY:r.east.y,region:r.game.world.regionId,before:qty,after:r.p.countItem(r.game.player,'fieldRations'),open:r.game.uiState.activeMainTab};
  });
  assert.equal(travelled.up,travelled.source);assert.equal(travelled.down,travelled.target);assert.equal(travelled.x,travelled.targetX);assert.equal(travelled.y,travelled.targetY);assert.equal(travelled.region,'zarynth');assert.equal(travelled.after,travelled.before-1);assert.equal(travelled.open,null);report.checks.push('controller selects global stones and travels to Zarynth with one ration');
  await page.locator('[data-tab="map"]').evaluate(e=>e.click());await page.locator('[data-map-return]').click();
  assert.equal(await page.evaluate(()=>continentMapReview.game.world.mode),'capital');assert.equal(await page.evaluate(()=>continentMapReview.game.uiState.activeMainTab),null);report.checks.push('Return to Orrakai works from the far continental arrival ward');
  report.errors=errors;assert.deepEqual(errors,[]);report.pass=true;fs.writeFileSync(dir+'/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
