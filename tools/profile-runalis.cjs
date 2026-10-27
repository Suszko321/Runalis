// Repeatable production-loop benchmark. No player profiles are read or written.
// RUNALIS_NODE_MODULES must point to a directory containing Playwright.
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const label=process.argv[2]||'current',frames=Number(process.env.RUNALIS_PROFILE_FRAMES||360);
const reference=process.env.RUNALIS_REFERENCE==='1';
const streamOnly=process.env.RUNALIS_STREAM_ONLY==='1';
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768';
const out=path.resolve('docs/performance',label);fs.mkdirSync(out,{recursive:true});
const summary=a=>{const s=[...a].sort((x,y)=>x-y);return {samples:a.length,meanMs:a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),p50Ms:s[Math.floor(s.length*.5)]||0,p95Ms:s[Math.floor(s.length*.95)]||0,p99Ms:s[Math.floor(s.length*.99)]||0,maxMs:s.at(-1)||0};};
function cpuSummary(profile){
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map(),totals=new Map();
 for(const n of profile.nodes)for(const c of n.children||[])parents.set(c,n.id);
 for(let i=0;i<(profile.samples||[]).length;i++){
  let id=profile.samples[i],self=true,dt=(profile.timeDeltas?.[i]||1000)/1000;
  while(id){const n=nodes.get(id),f=n.callFrame,key=`${f.functionName||'(anonymous)'} ${f.url.replace(base,'')}:${f.lineNumber+1}`;
   const v=totals.get(key)||{function:key,selfMs:0,totalMs:0};if(self)v.selfMs+=dt;v.totalMs+=dt;totals.set(key,v);id=parents.get(id);self=false;}
 }
 return {self:[...totals.values()].sort((a,b)=>b.selfMs-a.selfMs).slice(0,30),inclusive:[...totals.values()].sort((a,b)=>b.totalMs-a.totalMs).slice(0,35)};
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:process.env.RUNALIS_HEADFUL!=='1'});
 const report={label,reference,date:new Date().toISOString(),browser:browser.version(),environment:'Local Edge, isolated contexts, 1440x900, deviceScaleFactor 1; headless unless RUNALIS_HEADFUL=1. CPU sampling separate from frame timings. No GPU frame-time claim.',frames,startups:[],scenarios:[],errors:[],failed:[]};
 const browserCdp=await browser.newBrowserCDPSession();
 const system=await browserCdp.send('SystemInfo.getInfo');report.gpu=system.gpu;
 await browserCdp.detach();
 async function page(){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.failed.push(r.url());});
  await p.addInitScript(()=>{let seed=42637;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};window.__longTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});});
  if(reference)await p.route('**/src/*.js*',route=>{const file=new URL(route.request().url()).pathname.split('/').at(-1),original=path.join('docs/performance/original-src',file);return fs.existsSync(original)&&file!=='main.js'?route.fulfill({contentType:'text/javascript',body:fs.readFileSync(original,'utf8')}):route.continue();});
  await p.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(reference?'docs/performance/original-src/main.js':'src/main.js','utf8')+`\nwindow.perfReview={get game(){return currentGame;},start:state=>startProfile({id:'performance-isolated',name:'Performance review',state}),startNew:()=>startProfile({id:'performance-new',name:'Performance review'}),destroy:()=>currentGame?.destroy()};`}));
  await p.goto(base+'/');
  try { await p.waitForFunction(()=>window.perfReview); }
  catch(error) { report.bootFailure=await p.evaluate(()=>({url:location.href,readyState:document.readyState,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration})).slice(-20)}));throw error; }
  return p;
 }
 async function profile(p,name,fn){const cdp=await p.context().newCDPSession(p);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await fn();const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(path.join(out,name+'.cpuprofile'),JSON.stringify(profile));await cdp.detach();return cpuSummary(profile);}
 async function heap(p){const c=await p.context().newCDPSession(p);await c.send('HeapProfiler.collectGarbage');const h=await c.send('Runtime.getHeapUsage');await c.detach();return h;}
 try{
  // Seed in a separate context, so cold starts do not inherit the blueprint cache.
  const seedPage=await page();const save=await seedPage.evaluate(async()=>{const {createWorld}=await import('/src/world.js'),{createPlayer,chooseClass}=await import('/src/player.js'),{createSaveState}=await import('/src/gameSave.js');const p=createPlayer('Performance review');chooseClass(p,'gravecaller');p.story.flags.opening={introPlayed:true,wokeInOrrakai:true};p.act1OpeningPending=false;const w=createWorld();Object.assign(p,w.spawn);w.continentRuntime.refresh({world:w,player:p});return createSaveState({world:w,player:p,logLines:[],camera:{x:0,y:0}});});await seedPage.context().close();
  let gameplayPage;
  for(const kind of (streamOnly?['saved']:['new','saved','capital']))for(let repeat=0;repeat<(streamOnly?1:3);repeat++){
   const p=await page();const begin=()=>p.evaluate(({kind,save})=>{window.__start=performance.now();if(kind==='new')perfReview.startNew();else{if(kind==='capital'){save.worldMode='capital';save.worldName='Orrakai';save.player.x=1168;save.player.y=1296;}perfReview.start(save);}},{kind,save});
   const done=async()=>{await begin();await p.waitForFunction(()=>perfReview.game?.started);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>{window.__firstFrame=performance.now();r();})));};
   let cpu;if(repeat===0)cpu=await profile(p,'startup-'+kind,done);else await done();
   const metrics=await p.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0],resources=performance.getEntriesByType('resource');return {loadMs:__firstFrame-__start,navigationMs:nav.domContentLoadedEventEnd,resources:resources.length,images:resources.filter(r=>/\.(png|webp)$/.test(r.name)).length,imageBytes:resources.filter(r=>/\.(png|webp)$/.test(r.name)).reduce((s,r)=>s+r.decodedBodySize,0),transferBytes:resources.reduce((s,r)=>s+r.transferSize,0),longTasks:__longTasks,mode:perfReview.game.world.mode};});
   await p.evaluate(()=>perfReview.game.paused=true);report.startups.push({kind,repeat,...metrics,heap:await heap(p),cpu});console.log(kind,repeat,metrics.loadMs.toFixed(1)+'ms');
   if(kind==='saved'&&(streamOnly||repeat===2))gameplayPage=p;else await p.context().close();
  }
  const p=gameplayPage;
  for(const scenario of (streamOnly?[]:[{name:'orrakai',x:18,y:37},{name:'traversal',x:995,y:196},{name:'dense-combat',dungeon:'ascensionSpire',floor:4,tier:8,players:4}])){
   const initial=await p.evaluate(async s=>{const g=perfReview.game;g.paused=true;g.dialogue.active=false;g.player.summons=[];g.player.hp=g.player.maxHp=100000;g.player.invulnerable=true;g.player.invulnerableUntil=performance.now()/1000+3600;
    if(s.dungeon){const {createDungeonWorld}=await import('/src/dungeonSystem.js'),{findNearestActorPassablePoint}=await import('/src/world.js');g.world=createDungeonWorld({dungeonId:s.dungeon,floor:s.floor,tier:s.tier,depth:s.floor,seed:'density-performance',playerCount:s.players,skipPublishedOverride:true});const rooms=g.world.rooms.filter(r=>r.role!=='boss').sort((a,b)=>g.world.enemies.filter(e=>e.roomId===b.id).length-g.world.enemies.filter(e=>e.roomId===a.id).length);const r=rooms.find(r=>g.world.enemies.some(e=>e.roomId===r.id&&e.eliteModifiers?.some(m=>['shocker','freezer','molten','artillery','vortex'].includes(m))))||rooms[0];const e=g.world.enemies.find(e=>e.roomId===r.id);Object.assign(g.player,findNearestActorPassablePoint(g.world,e.x+100,e.y,12));for(const e of g.world.enemies.filter(e=>e.roomId===r.id))e.isInCombat=e.hasDetectedPlayer=true;
    }else{g.player.x=(s.x+.5)*32;g.player.y=(s.y+.5)*32;g.world.continentRuntime.refresh(g);}
    g.camera={x:g.player.x-g.canvas.width/2,y:g.player.y-g.canvas.height/2};g.renderCamera={...g.camera};g.paused=false;return {objects:g.world.objects.length,enemies:g.world.enemies.length,width:g.canvas.width,height:g.canvas.height};},scenario);
   await p.waitForTimeout(1000);
   const timing=await p.evaluate(async n=>{const g=perfReview.game,expected=g.world,frames=[],times={},originals={};
    for(const name of ['update','drawWorld','updateControllerInputs','updateAudioState','renderOwnedUI','updateAmbientNpcs','updateRespawns','refreshPoiWorldState']){originals[name]=g[name];times[name]=[];g[name]=function(...args){const t=performance.now();const r=originals[name].apply(this,args);times[name].push(performance.now()-t);return r;};}
    let previous;let peakEffects=0,peakEngaged=0,peakHazards=0;const {getEliteHazards}=await import('/src/eliteEncounterSystem.js');const start=performance.now();
    for(let i=0;i<n;i++)await new Promise(resolve=>requestAnimationFrame(now=>{if(previous!==undefined)frames.push(now-previous);previous=now;peakEffects=Math.max(peakEffects,g.world.effects.length);peakEngaged=Math.max(peakEngaged,g.world.enemies.filter(e=>e.isInCombat||e.hasDetectedPlayer).length);peakHazards=Math.max(peakHazards,getEliteHazards(g.world).length);if(g.world.mode!=='dungeon'){g.keys.add(i%240<120?'d':'a');g.keys.delete(i%240<120?'a':'d');}resolve();}));
    g.keys.clear();for(const name in originals)g[name]=originals[name];return {frames,times,peakEffects,peakEngaged,peakHazards,worldRetained:g.world===expected,longTasks:__longTasks.filter(t=>t.start>=start),stats:g.world.continentRuntime?.stats()};},frames);
   const cpu=await profile(p,scenario.name,()=>p.waitForTimeout(5000));
   if(process.env.RUNALIS_TRACE==='1'&&scenario.dungeon){
    const c=await p.context().newCDPSession(p),events=[];c.on('Tracing.dataCollected',v=>events.push(...v.value));
    await c.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline',transferMode:'ReportEvents'});await p.waitForTimeout(5000);
    const finished=new Promise(r=>c.once('Tracing.tracingComplete',r));await c.send('Tracing.end');await finished;
    fs.writeFileSync(path.join(out,'dense-combat-trace.json'),JSON.stringify({traceEvents:events}));
    const totals={};for(const e of events)if(e.ph==='X'){const v=totals[e.name]||{count:0,totalMs:0,maxMs:0};v.count++;v.totalMs+=(e.dur||0)/1000;v.maxMs=Math.max(v.maxMs,(e.dur||0)/1000);totals[e.name]=v;}
    report.traceSummary=Object.fromEntries(Object.entries(totals).filter(([k])=>/GC|Paint|Raster|Draw|Layout|Composite|FunctionCall|AnimationFrame/.test(k)));await c.detach();
   }
   await p.evaluate(()=>perfReview.game.paused=true);
   const memory=await heap(p);await p.locator('#game').screenshot({path:path.join(out,scenario.name+'.png')});
   report.scenarios.push({...scenario,...initial,frames:summary(timing.frames),fps:1000/summary(timing.frames).meanMs,systems:Object.fromEntries(Object.entries(timing.times).map(([k,v])=>[k,summary(v)])),peakEffects:timing.peakEffects,peakEngaged:timing.peakEngaged,peakHazards:timing.peakHazards,worldRetained:timing.worldRetained,longTasks:timing.longTasks,stats:timing.stats,heap:memory,cpu});console.log(scenario.name,JSON.stringify({frames:report.scenarios.at(-1).frames,update:report.scenarios.at(-1).systems.update,draw:report.scenarios.at(-1).systems.drawWorld}));
   assert(timing.worldRetained);if(scenario.dungeon)assert(timing.peakHazards>0&&timing.peakEngaged>0,'dense encounter must actually engage enemies and hazards');
  }
  if(streamOnly){
   report.streamingCpu=await profile(p,'streaming',async()=>{report.streaming=await p.evaluate(async()=>{
    const g=perfReview.game;g.paused=true;const {renderMinimapHud}=await import('/src/minimapHud.js');const samples=[];
    for(const [name,x,y] of [['hollow-road',60,64],['orchard',110,90],['bridge',250,100],['veyr',400,250],['black-pine',715,209],['blackfen',727,507],['aureate',995,196],['ascension',1656,224],['imperial-road',2124,514],['zarynth',2732,436]]){
     g.player.x=(x+.5)*32;g.player.y=(y+.5)*32;const begin=performance.now();g.world.continentRuntime.refresh(g);const refreshMs=performance.now()-begin;g.camera={x:g.player.x-g.canvas.width/2,y:g.player.y-g.canvas.height/2};g.renderCamera={...g.camera};
     const first=performance.now();g.drawWorld();renderMinimapHud(g);const firstDrawMs=performance.now()-first;await new Promise(r=>requestAnimationFrame(r));const warmed=performance.now();for(let i=0;i<20;i++){g.drawWorld();renderMinimapHud(g);}samples.push({name,refreshMs,firstDrawMs,warmDrawMs:(performance.now()-warmed)/20,stats:g.world.continentRuntime.stats()});
    }return samples;
   });});report.streamingHeap=await heap(p);console.log(JSON.stringify(report.streaming.map(s=>({name:s.name,refreshMs:s.refreshMs,firstDrawMs:s.firstDrawMs,warmDrawMs:s.warmDrawMs}))));
   for(const s of report.streaming){assert(s.stats.residentChunks<=s.stats.maxChunks);assert(s.stats.decorationChunks<=s.stats.maxDecorationChunks);}
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failed,[]);report.pass=true;
 }finally{fs.writeFileSync(path.join(out,'benchmark.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
