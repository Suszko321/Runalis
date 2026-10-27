const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),{createWorld}=await import('/src/world.js'),{createPlayer}=await import('/src/player.js'),{updateWorldExploration}=await import('/src/worldExploration.js');
   const world=createWorld({skipPublishedOverride:true}),player=createPlayer('Opening test');Object.assign(player,{x:world.navStones[0].x,y:world.navStones[0].y});
   const game={world,player,camera:{x:0,y:0},canvas:document.querySelector('#game'),logLines:[],log(){},save(){},keys:{},input:{}};
   updateWorldExploration(game,.5);document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);ui.renderUI(player,[],game);window.openingReview={game,ui,updateWorldExploration};
  });
  const report=[];
  for(const [name,position] of [['western edge',null],['middle of continent',[1400*32,450*32]],['eastern edge',[2870*32,940*32]]]){
   await page.evaluate(position=>{const r=openingReview;if(position)Object.assign(r.game.player,{x:position[0],y:position[1]});r.updateWorldExploration(r.game,.5);document.querySelector('[data-tab="map"]').click();},position);
   await page.evaluate(()=>new Promise(requestAnimationFrame));
   const result=await page.evaluate(()=>{const el=document.querySelector('#map'),p=el.querySelector('.survey-player').getBoundingClientRect(),v=el.querySelector('.survey-viewport').getBoundingClientRect();return {zoom:el.surveyView.zoom,centerErrorX:Math.abs((p.left+p.right-v.left-v.right)/2),centerErrorY:Math.abs((p.top+p.bottom-v.top-v.bottom)/2)};});
   assert.equal(result.zoom,4);assert(result.centerErrorX<1&&result.centerErrorY<1,JSON.stringify(result));report.push({name,...result});
   await page.evaluate(()=>{
    const r=openingReview,el=document.querySelector('#map');el.querySelector('[data-map-zoom="out"]').click();const before=JSON.stringify(el.surveyView);r.ui.renderUI(r.game.player,[],r.game);if(JSON.stringify(el.surveyView)!==before)throw Error('HUD refresh reset manual view');
    r.ui.handleGameUiControllerInput(r.game,{connected:true,cancelPressed:true});
   });
  }
  await page.evaluate(()=>{const r=openingReview;Object.assign(r.game.player,{x:368.5*32,y:189.5*32});r.updateWorldExploration(r.game,.5);document.querySelector('[data-tab="map"]').click();});
  await page.evaluate(()=>new Promise(requestAnimationFrame));fs.mkdirSync('docs/map-cursor',{recursive:true});await page.screenshot({path:'docs/map-cursor/player-centered-opening.png'});
  await page.locator('[data-map-zoom="reset"]').click();assert.equal(await page.evaluate(()=>document.querySelector('#map').surveyView.zoom),1);
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/map-cursor/opening-verification.json',JSON.stringify({pass:true,report,manualViewPreserved:true,fitMap:true,errors},null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
