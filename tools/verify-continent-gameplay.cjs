const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.productionReview={get game(){return currentGame;},start:state=>startProfile({id:"world-rebuild-verification",name:"Continental verification",state})};'}));
  await page.goto('http://127.0.0.1:8768/');
  await page.waitForFunction(()=>window.productionReview);
  await page.evaluate(async()=>{
   const {createWorld}=await import('/src/world.js'),{createPlayer,chooseClass}=await import('/src/player.js'),{createSaveState}=await import('/src/gameSave.js');
   const player=createPlayer('Continental verification');chooseClass(player,'fellhunter');player.story.flags.opening={introPlayed:true,wokeInOrrakai:true};player.act1OpeningPending=false;
   const world=createWorld();Object.assign(player,world.spawn);player.lastSafeLocation={worldMode:'capital',worldName:'Orrakai',x:1168,y:1296};world.continentRuntime.refresh({world,player});const save=createSaveState({world,player,logLines:[],camera:{x:0,y:0}});productionReview.start(save);
  });
  await page.waitForFunction(()=>productionReview.game?.started&&productionReview.game.world.continentId==='runalis');await page.waitForTimeout(2500);
  const opening=await page.evaluate(()=>({mode:productionReview.game.world.mode,region:productionReview.game.world.regionId,position:{x:productionReview.game.player.x,y:productionReview.game.player.y}}));
  assert.equal(opening.mode,'overworld');assert.equal(opening.region,'hearthmereFrontier');
  const report={opening,views:[],errors,failed};
  for(const [name,x,y] of [['orrakai',18,37],['black-pine',715,209],['blackfen',727,507],['aureate',995,196],['ascension',1656,224],['imperial-road',2124,514],['zarynth',2732,436]]){
   await page.evaluate(({x,y})=>{const g=productionReview.game;g.player.x=(x+.5)*32;g.player.y=(y+.5)*32;g.world.continentRuntime.refresh(g);},{x,y});await page.waitForTimeout(450);
   const timing=await page.evaluate(async()=>{
    const g=productionReview.game,deltas=[],updates=[];const original=g.update.bind(g);g.update=(...args)=>{const start=performance.now();const value=original(...args);updates.push(performance.now()-start);return value;};
    let previous=performance.now();for(let i=0;i<40;i++)await new Promise(resolve=>requestAnimationFrame(now=>{deltas.push(now-previous);previous=now;resolve();}));g.update=original;
    const sorted=[...deltas].sort((a,b)=>a-b),stats=g.world.continentRuntime.stats();return {frameMeanMs:deltas.reduce((a,b)=>a+b,0)/deltas.length,frameP95Ms:sorted[Math.floor(sorted.length*.95)],updateMeanMs:updates.reduce((a,b)=>a+b,0)/Math.max(1,updates.length),stats,region:g.world.regionId};
   });report.views.push({name,...timing});
   await page.locator('#game').screenshot({path:`docs/world-rebuild/screenshots/gameplay-${name}.png`});
  }
  const walk=await page.evaluate(()=>({x:productionReview.game.player.x,y:productionReview.game.player.y}));await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
  const walked=await page.evaluate(()=>productionReview.game.player.x);assert(walked>walk.x+10,'Production keyboard walking must work at distant capital coordinates');
  await page.evaluate(()=>productionReview.game.save());
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);report.pass=true;report.hardwareNote='Headless Edge on the local host; timings are evidence for this environment, not a universal frame-rate guarantee.';
  fs.writeFileSync('docs/world-rebuild/gameplay-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
