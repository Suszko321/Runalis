const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const dir='docs/map-cursor';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),map=await import('/src/panelWorldMap.js'),input=await import('/src/inputController.js');
   const {createWorld}=await import('/src/world.js'),{createPlayer,addItem,countItem}=await import('/src/player.js');
   const {worldMemory,worldEntityMemoryKey,worldEntityMemoryId}=await import('/src/worldExploration.js'),{getSurvey}=await import('/src/mapSurvey.js');
   const world=createWorld({skipPublishedOverride:true}),player=createPlayer('Cursor review');Object.assign(player,{x:world.navStones[0].x,y:world.navStones[0].y});addItem(player,'fieldRations',5);
   const game={world,player,camera:{x:0,y:0},canvas:document.querySelector('#game'),logLines:[],log(){},save(){},keys:{},input:{}};
   const memory=worldMemory(player);for(const stone of world.navStones)memory.stones[stone.id]={name:stone.name};memory.lastDanger=-100;
   for(const site of world.authoredLocations)memory.locations[`${worldEntityMemoryKey(world,site)}:${worldEntityMemoryId(site)}`]={name:site.name,x:site.x,y:site.y};
   const survey=getSurvey(memory,world);for(let y=0;y<world.height/8;y++)for(let x=0;x<world.width/8;x++)survey.cells[x+','+y]=true;survey.revision++;
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);ui.renderUI(player,[],game);
   const manager=input.createControllerManager();manager.slots[0].connected=true;
   window.cursorReview={ui,map,input,game,survey,countItem,manager};
  });
  await page.locator('[data-tab="map"]').evaluate(e=>e.click());
  const report=await page.evaluate(()=>{
   const r=cursorReview,g=r.game,el=document.querySelector('#map'),viewport=el.querySelector('.survey-viewport'),checks=[];
   const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
   const tick=(axes=[0,0,0,0],buttons=[],frames=1)=>{for(let i=0;i<frames;i++){const slot=r.manager.slots[0];slot.prevButtons=slot.buttons;slot.buttons=Array.from({length:16},(_,b)=>buttons.includes(b));slot.axes=axes;const input=r.input.getControllerInput(r.manager,0);r.map.handleWorldMapControllerInput(g,input,1/60);}};
   tick([.1,.1,.1,.1]);check(!el.surveyCursor.active,'stick deadzone keeps cursor idle');
   tick([.8,0,0,0],[],20);const leftX=el.surveyCursor.x;check(leftX>.05,'left stick moves visible cursor');check(!el.querySelector('.survey-controller-cursor').hidden,'cursor is visible');
   const oldY=el.surveyCursor.y;tick([0,0,0,.6],[],15);check(el.surveyCursor.y>oldY,'right stick also moves cursor');
   const start=el.surveyCursor.x;tick([.3,0,0,0]);const slow=el.surveyCursor.x-start;const mid=el.surveyCursor.x;tick([.9,0,0,0]);check(el.surveyCursor.x-mid>slow*2.5,'stick deflection controls cursor precision');
   r.ui.handleGameUiControllerInput(g,{connected:true,mapCursorX:.5,mapCursorY:0});check(g.uiState.lastInputMode==='controller','map stick input switches actual UI ownership mode');
   el.querySelector('[data-map-zoom="reset"]').click();el.surveyCursor.x=.5;el.surveyCursor.y=.5;
   tick([0,0,0,0],[7],60);check(el.surveyView.zoom>4,'held RT zooms continuously');
   const point=()=>{const v=viewport.getBoundingClientRect(),s=el.querySelector('.survey-surface').getBoundingClientRect();return {x:(v.left+el.surveyCursor.x*v.width-s.left)/s.width,y:(v.top+el.surveyCursor.y*v.height-s.top)/s.height};};
   const anchor=point();tick([0,0,0,0],[7],10);const after=point();check(Math.abs(after.x-anchor.x)<.001&&Math.abs(after.y-anchor.y)<.001,'trigger zoom holds geography under cursor');
   tick([0,0,0,0],[7],200);check(el.surveyView.zoom===18,'zoom in clamps at continental maximum');
   const icon=el.querySelector('.survey-stone.selected'),style=getComputedStyle(icon),img=getComputedStyle(icon.querySelector('img'));
   check(style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.backgroundImage==='none'&&style.borderTopWidth==='0px'&&style.boxShadow==='none','selected marker has no box, border or panel shadow');
   check(parseFloat(img.width)===14&&parseFloat(img.height)===20&&icon.getBoundingClientRect().width<23,'small icon keeps screen size at maximum zoom');
   el.surveyCursor.x=.96;const pan=el.surveyView.panX;tick([1,0,0,0],[],30);check(el.surveyView.panX<pan,'pushing cursor against map edge pans geography');
   const saved={...el.surveyCursor},view={...el.surveyView};r.survey.revision++;r.map.renderWorldMap(g.player,g);
   check(el.surveyCursor.active&&el.surveyCursor.x===saved.x&&el.surveyCursor.y===saved.y&&el.surveyView.zoom===view.zoom,'cursor and zoom persist through HUD refresh');
   tick([0,0,0,0],[6],400);check(el.surveyView.zoom===1,'held LT zooms back to fit and clamps');
   el.surveyCursor.x=.5;el.surveyCursor.y=.1;tick();const before={x:g.player.x,y:g.player.y};tick([0,0,0,0],[0]);check(g.player.x===before.x&&g.player.y===before.y,'A over empty map does not travel to stale selection');
   tick();
   const target=g.world.navStones.find(s=>s.id==='nav-hearthmereFrontier-hunterCamp');
   for(let i=0;i<300;i++){
    const v=viewport.getBoundingClientRect(),b=el.querySelector(`.survey-surface [data-select-stone="${target.id}"]`).getBoundingClientRect();
    const dx=(b.left+b.right)/2-v.left-el.surveyCursor.x*v.width,dy=(b.top+b.bottom)/2-v.top-el.surveyCursor.y*v.height,d=Math.hypot(dx,dy);if(d<3)break;
    const speed=Math.max(.25,Math.min(.8,d/30));tick([dx/d*speed,dy/d*speed,0,0]);
   }
   check(el.surveyCursor.hoveredId===target.id,'cursor hit tests the discovered stone');
   const oldPan=el.surveyView.panX;tick([0,0,0,0],[0]);check(g.mapSelectedStone===target.id&&g.player.x===before.x,'first A selects cursor target without travel');check(el.surveyView.panX===oldPan,'cursor selection does not recenter map');
   tick();window.cursorReview.tick=tick;window.cursorReview.target=target;
   return {checks,iconWidth:parseFloat(img.width),iconHeight:parseFloat(img.height)};
  });
  await page.screenshot({path:dir+'/cursor-selection.png'});
  const travelled=await page.evaluate(()=>{const r=cursorReview,g=r.game;g.world.enemies=[];g.world.continentRuntime.previewAt=()=>({enemies:[]});const before=r.countItem(g.player,'fieldRations');r.tick([0,0,0,0],[0]);return {moved:g.player.x===r.target.x&&g.player.y===r.target.y,cost:before-r.countItem(g.player,'fieldRations'),closed:g.uiState.activeMainTab===null};});
  assert(travelled.moved&&travelled.closed);assert.equal(travelled.cost,1);report.checks.push('second A travels to cursor-selected stone, spends one ration and closes map');
  assert.deepEqual(errors,[]);report.errors=errors;report.pass=true;fs.writeFileSync(dir+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
