const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.densityProduction={get game(){return currentGame;},start:state=>startProfile({id:"enemy-density-review",name:"Encounter verification",state})};'}));
  await page.goto('http://127.0.0.1:8768/');await page.waitForFunction(()=>window.densityProduction);
  await page.evaluate(async()=>{
   const {createWorld}=await import('/src/world.js'),{createPlayer,chooseClass}=await import('/src/player.js'),{createSaveState}=await import('/src/gameSave.js');
   const p=createPlayer('Encounter verification');chooseClass(p,'gravecaller');p.story.flags.opening={introPlayed:true,wokeInOrrakai:true};p.act1OpeningPending=false;const w=createWorld();Object.assign(p,w.spawn);w.continentRuntime.refresh({world:w,player:p});densityProduction.start(createSaveState({world:w,player:p,logLines:[],camera:{x:0,y:0}}));
  });
  await page.waitForFunction(()=>densityProduction.game?.started);await page.waitForTimeout(1200);
  const report={environment:'Local headless Edge, 1440×900; automated sampling, not human playtesting.',scenarios:[],errors,failed};
  for(const scenario of [{name:'early-dungeon',id:'ashenOrchard',floor:1,tier:1,players:1},{name:'dense-story',id:'ascensionSpire',floor:4,tier:8,players:4}]){
   const initial=await page.evaluate(async scenario=>{
    const {createDungeonWorld}=await import('/src/dungeonSystem.js'),{findNearestActorPassablePoint,hasLineOfSight}=await import('/src/world.js');const g=densityProduction.game;
    const w=createDungeonWorld({dungeonId:scenario.id,floor:scenario.floor,tier:scenario.tier,depth:scenario.floor,seed:'density-performance',playerCount:scenario.players,skipPublishedOverride:true});
    const rooms=w.rooms.filter(r=>r.role!=='boss').sort((a,b)=>w.enemies.filter(e=>e.roomId===b.id).length-w.enemies.filter(e=>e.roomId===a.id).length);
    let room,elite;for(const r of rooms){const e=w.enemies.find(e=>e.roomId===r.id&&e.eliteModifiers?.some(m=>['shocker','freezer','molten','artillery','vortex'].includes(m)));if(e){room=r;elite=e;break;}}
    if(!elite)throw Error('No naturally modified occupied room');const p=findNearestActorPassablePoint(w,elite.x+100,elite.y,12);g.world=w;Object.assign(g.player,p);g.player.hp=g.player.maxHp=100000;g.player.summons=[];g.paused=false;
    for(const e of w.enemies.filter(e=>e.roomId===room.id))e.isInCombat=e.hasDetectedPlayer=true;
    g.camera={x:p.x-g.canvas.width/2,y:p.y-g.canvas.height/2};g.renderCamera={...g.camera};
    return {enemies:w.enemies.length,roomEnemies:w.enemies.filter(e=>e.roomId===room.id).length,naturalModifiers:elite.eliteModifiers,viewWidth:g.canvas.width,viewHeight:g.canvas.height,clearSight:hasLineOfSight(w,elite.x,elite.y,p.x,p.y)};
   },scenario);
   const timing=await page.evaluate(async()=>{
    const {getEliteHazards}=await import('/src/eliteEncounterSystem.js'),g=densityProduction.game,updates=[],renders=[],frames=[],originalUpdate=g.update.bind(g),originalDraw=g.drawWorld.bind(g);let peakHazards=0,peakEngaged=0,peakEffects=0;
    const expectedWorld=g.world;
    g.update=(...args)=>{g.player.hp=g.player.maxHp=100000;g.player.invulnerableUntil=performance.now()/1000+120;const t=performance.now(),v=originalUpdate(...args);updates.push(performance.now()-t);peakHazards=Math.max(peakHazards,getEliteHazards(g.world).length);peakEngaged=Math.max(peakEngaged,g.world.enemies.filter(e=>e.isInCombat||e.hasDetectedPlayer).length);peakEffects=Math.max(peakEffects,g.world.effects.length);return v;};
    g.drawWorld=(...args)=>{const t=performance.now(),v=originalDraw(...args);renders.push(performance.now()-t);return v;};
    let prior=performance.now();for(let i=0;i<900;i++)await new Promise(resolve=>requestAnimationFrame(now=>{frames.push(now-prior);prior=now;resolve();}));g.update=originalUpdate;g.drawWorld=originalDraw;
    const summarize=a=>{const b=[...a].sort((x,y)=>x-y);return {samples:a.length,meanMs:a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),p95Ms:b[Math.floor(b.length*.95)],maxMs:b.at(-1)};};return {frames:summarize(frames),updates:summarize(updates),renders:summarize(renders),peakHazards,peakEngaged,peakEffects,worldRetained:g.world===expectedWorld};
   });
   assert(timing.peakHazards>0,'actual modifier effects must be active during the benchmark');assert(timing.peakEngaged>0);assert(timing.peakHazards<=24);assert(timing.worldRetained);report.scenarios.push({...scenario,...initial,...timing,note:'Generated player-count density with one protected measurement actor; measures AI and rendering, not survival balance.'});
   await page.locator('#game').screenshot({path:`docs/enemy-density/production-${scenario.name}.png`});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);report.pass=true;fs.writeFileSync('docs/enemy-density/production-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
