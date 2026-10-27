const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
 await page.goto('http://127.0.0.1:8766/creator-lab.html');
 const result=await page.evaluate(async()=>{
  const {renderWorldMap,handleWorldMapControllerInput}=await import('/src/panelWorldMap.js');
  document.body.innerHTML='<div id="map" class="active" style="height:800px"></div>';
  const stones=[{id:'a',name:'First',x:100,y:100},{id:'b',name:'Second',x:400,y:300},{id:'c',name:'Third',x:800,y:600},{id:'hidden',name:'Hidden',x:900,y:100}];
  const game={player:{x:100,y:100,hp:100,worldMemory:{stones:{a:true,b:true,c:true}}},world:{mode:'capital',name:'Test',width:40,height:30,tiles:Array.from({length:30},()=>Array.from({length:40},()=>({biome:'path',passable:true}))),navStones:stones},uiState:{activeMainTab:'map'},uiControllerState:{}};
  renderWorldMap(game.player,game);
  const state=()=>({focus:document.activeElement.dataset.selectStone,selected:game.mapSelectedStone,marker:document.querySelector('.survey-stone.selected')?.dataset.selectStone,outside:[...document.querySelectorAll('.game-ui-controller-focus')].some(b=>!b.closest('.survey-stone-list'))});
  const states=[state()];
  for(const input of [{downPressed:true},{downPressed:true},{downPressed:true},{upPressed:true},{rightPressed:true},{leftPressed:true},{confirmPressed:true}]){handleWorldMapControllerInput(game,input);states.push(state());}
  const blocked=!!document.querySelector('.survey-travel-status.travel-blocked');
  return {states,blocked,rows:document.querySelectorAll('.survey-stone-list button').length};
 });
 assert.equal(result.rows,3);assert.deepEqual(result.states.map(s=>s.focus),['a','b','c','a','c','c','c','c']);
 assert(result.states.every(s=>s.focus===s.selected&&s.selected===s.marker&&!s.outside));assert(result.blocked);
 console.log('PASS: only discovered stones receive selection; cycling updates map marker; left/right stay in list; blocked A shows feedback.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
