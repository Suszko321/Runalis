const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8766')+'/creator-lab.html');
  const portalResult=await page.evaluate(async()=>{
   const {createWorld}=await import('/src/world.js');const {createPlayer}=await import('/src/player.js');
   const {enterDungeon,transitionDungeonFloor}=await import('/src/dungeonSystem.js');
   const {updateEnemies}=await import('/src/combat.js');const {interact}=await import('/src/gameInteraction.js');
   const {draw}=await import('/src/render.js');const {spriteArtStatus}=await import('/src/spriteArt.js');
   document.body.innerHTML='<h2>Final boss return portal</h2><canvas id="portalCanvas" width="960" height="600"></canvas><div class="panel open"><div class="tabs"><button class="tab" data-tab="map">Map</button></div><div id="map" class="tab-panel active"></div></div>';
   const canvas=document.querySelector('#portalCanvas'),world=createWorld(),player=createPlayer('Portal browser review');
   const g=window.portalReview={world,player,canvas,camera:{x:0,y:0},log:()=>{},logLines:[],uiState:{},uiControllerState:{},renderOwnedUI:()=>{}};
   const entrance={...world.objects.find(o=>o.kind==='dungeonEntrance'),theme:'mine'};
   enterDungeon(g,entrance);const used={...g.overworldState.returnPoint};
   while(g.world.floor<g.world.totalFloors)transitionDungeonFloor(g,g.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='down'));
   const boss=g.world.enemies.find(e=>e.isDungeonMainBoss),before=g.world.objects.some(o=>o.returnPortal);boss.hp=0;updateEnemies(0,player,g.world,g.log,0,g);
   const portal=g.world.objects.find(o=>o.returnPortal);player.x=portal.x-64;player.y=portal.y;
   g.camera={x:portal.x-480,y:portal.y-320};draw(canvas.getContext('2d'),g.world,player,g.camera);
   for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
   draw(canvas.getContext('2d'),g.world,player,g.camera);
   window.portalUse=()=>{Object.assign(player,{x:portal.x,y:portal.y});interact(g);return {mode:g.world.mode,distance:Math.hypot(player.x-used.x,player.y-used.y)};};
   return {before,after:!!portal,cleared:g.world.dungeonState.cleared};
  });
  assert(!portalResult.before&&portalResult.after&&portalResult.cleared);
  await page.locator('#portalCanvas').screenshot({path:'docs/visual-production/dungeon-boss-return-portal.png'});
  const used=await page.evaluate(()=>{const result=window.portalUse();document.querySelector('#portalCanvas').style.display='none';return result;});assert.equal(used.mode,'overworld');assert(used.distance<64);
  const modes=await page.evaluate(async()=>{
   const {enterDungeon}=await import('/src/dungeonSystem.js');const {getMapReturnAvailability,renderWorldMap}=await import('/src/panelWorldMap.js');
   const g=window.portalReview,mode=g.world.mode;g.paused=true;
   const results=['overworld','travelRoute','sideZone','dungeon','tower','maraHouse','pvpArena'].map(mode=>{g.world.mode=mode;return {mode,allowed:getMapReturnAvailability(g).allowed};});g.world.mode=mode;
   enterDungeon(g,{id:'map-return-dungeon',name:'Map return dungeon',theme:'grave',x:g.player.x,y:g.player.y});
   g.world.enemies.push({id:'nearby-boss',hp:100,isBoss:true,x:g.player.x,y:g.player.y,alive:true});
   g.uiState.activeMainTab='map';
   const {renderUI}=await import('/src/ui.js');renderUI(g.player,g.logLines,g);renderWorldMap(g.player,g);
   return results;
  });
  assert(modes.every(m=>m.allowed),'Map return must work in every playable mode, even when paused');
  assert(await page.locator('[data-map-return]').isEnabled());await page.locator('[data-map-return]').click();
  const clicked=await page.evaluate(()=>({mode:window.portalReview.world.mode,surface:window.portalReview.overworldState.mode,closed:window.portalReview.uiState.activeMainTab===null}));
  assert.deepEqual(clicked,{mode:'capital',surface:'overworld',closed:true});
  const held=await page.evaluate(async()=>{
   const {exitCapitalHub}=await import('/src/hubSystem.js');const {enterTower}=await import('/src/towerSystem.js');
   const {renderWorldMap,handleWorldMapControllerInput}=await import('/src/panelWorldMap.js');
   const g=window.portalReview;exitCapitalHub(g);const surface=g.world.mode;
   enterTower(g,{x:g.player.x,y:g.player.y},1);g.uiState.activeMainTab='map';
   const {renderUI}=await import('/src/ui.js');renderUI(g.player,g.logLines,g);renderWorldMap(g.player,g);
   handleWorldMapControllerInput(g,{yHeld:true});await new Promise(r=>setTimeout(r,1100));handleWorldMapControllerInput(g,{yHeld:true});
   return {surface,mode:g.world.mode,closed:g.uiState.activeMainTab===null};
  });
  assert.deepEqual(held,{surface:'overworld',mode:'capital',closed:true});assert.deepEqual(errors,[]);
  console.log('PASS: final-boss portal renders and real interaction returns to the entrance; all playable modes allow map return; clicking returns from an uncleared dungeon near a boss; held Y returns from the tower; Orrakai exit restores surface rather than dungeon geometry; no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
