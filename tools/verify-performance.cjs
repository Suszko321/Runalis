const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/performance';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
 const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+"\nwindow.perfReview={get game(){return currentGame;},start:state=>startProfile({id:'performance-regression',name:'Performance regression',state}),startNew:()=>startProfile({id:'performance-new',name:'Performance regression'})};"}));
 await p.route('**/src/world.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/world.js','utf8').replace('export function createWorld(options = {}) {','export function createWorld(options = {}) { window.__worldCreates=(window.__worldCreates||0)+1;')}));
 await p.route('**/src/*?reference',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(`${out}/original-src/${new URL(r.request().url()).pathname.split('/').at(-1)}`,'utf8')}));
 try{
  await p.goto(base+'/');await p.waitForFunction(()=>window.perfReview);
  await p.evaluate(()=>perfReview.startNew());await p.waitForFunction(()=>perfReview.game?.started);
  const opening=await p.evaluate(()=>({creates:window.__worldCreates||0,mode:perfReview.game.world.mode}));assert.equal(opening.creates,0);assert.equal(opening.mode,'act1Opening');checks.push({name:'new journey avoids unused continent',...opening});
  await p.evaluate(()=>perfReview.game.destroy());
  const pixels=await p.evaluate(async()=>{
   const current=await import('/src/terrainRenderer.js'),reference=await import('/src/terrainRenderer.js?reference'),mini=await import('/src/minimapHud.js'),oldMini=await import('/src/minimapHud.js?reference');
   const {asset,spriteArtStatus}=await import('/src/spriteArt.js');asset('terrain-core');while(spriteArtStatus().some(s=>!s.ready&&!s.failed))await new Promise(r=>setTimeout(r,20));
   const result=[];const canvas=()=>{const c=document.createElement('canvas');c.width=640;c.height=480;c.getContext('2d').miterLimit=2;return c;};
   function compare(name,w,camera){const a=canvas(),b=canvas();current.drawTiles(a.getContext('2d'),w,camera);reference.drawTiles(b.getContext('2d'),w,camera);const x=a.getContext('2d').getImageData(0,0,640,480).data,y=b.getContext('2d').getImageData(0,0,640,480).data;let different=0,maxDelta=0;for(let i=0;i<x.length;i++){if(x[i]!==y[i])different++;maxDelta=Math.max(maxDelta,Math.abs(x[i]-y[i]));}result.push({name,different,maxDelta,cache:current.fallbackGroundStats(w)});}
   for(const theme of ['crypt','mine','thorn','cult','holy','cellar','cosmic']){
    const tiles=Array.from({length:48},(_,y)=>Array.from({length:64},(_,x)=>({biome:x%11===0?'wall':y%13===0?'water':(x+y)%5===0?'path':(x+y)%7===0?'dead':'ruin',variant:(x+y)%3})));
    const w={mode:'dungeon',name:theme,theme,tiles,objects:[]};
    compare(theme+'-integer',w,{x:250,y:245});compare(theme+'-fractional',w,{x:503.7,y:255.2});
    tiles[8][16].biome='water';compare(theme+'-mutation',w,{x:503.7,y:255.2});
    for(let y=0;y<48*32;y+=160)for(let x=0;x<64*32;x+=160)current.drawTiles(canvas().getContext('2d'),w,{x,y});
    const stats=current.fallbackGroundStats(w);result.push({name:theme+'-bound',...stats});
   }
   const {createDungeonWorld}=await import('/src/dungeonSystem.js');const d=createDungeonWorld({dungeonId:'ascensionSpire',floor:4,tier:8,depth:4,seed:'density-performance',playerCount:4,skipPublishedOverride:true});
   compare('production-dungeon',d,{x:d.spawn.x-100.25,y:d.spawn.y-200.7});
   const terrainAsset=asset('terrain-core');terrainAsset.ready=false;
   compare('atlas-not-ready',d,{x:d.spawn.x-100.25,y:d.spawn.y-200.7});terrainAsset.ready=true;
   compare('atlas-ready-invalidates-cache',d,{x:d.spawn.x-100.25,y:d.spawn.y-200.7});
   const {createWorld}=await import('/src/world.js'),{createPlayer}=await import('/src/player.js');const w=createWorld(),player=createPlayer('Pixel test');Object.assign(player,w.spawn);const game={world:w,player};
   for(const [x,y] of [[18,37],[715,209],[995,196],[2730,430]]){player.x=(x+.4)*32;player.y=(y+.7)*32;w.continentRuntime.refresh(game);const a=canvas(),b=canvas();mini.drawMinimapPanel(a.getContext('2d'),game,{x:0,y:0,width:640,height:480});oldMini.drawMinimapPanel(b.getContext('2d'),game,{x:0,y:0,width:640,height:480});const aa=a.getContext('2d').getImageData(0,0,640,480).data,bb=b.getContext('2d').getImageData(0,0,640,480).data;result.push({name:`minimap-${x}-${y}`,different:aa.reduce((s,v,i)=>s+(v!==bb[i]),0)});}
   window.__testSave=(await import('/src/gameSave.js')).createSaveState({...game,logLines:[],camera:{x:0,y:0}});return result;
  });
  const profiles=await p.evaluate(async()=>{
   const current=await import('/src/enemyVisualProfiles.js'),original=await import('/src/enemyVisualProfiles.js?reference');
   const cases=current.ENEMY_KINDS.map((kind,i)=>({id:'profile-'+i,kind,name:kind}));
   cases.push({id:'boss',isBoss:true,bossType:'demonLord',name:'Malakar',boss:{phase:1}});
   const mutations=[['name','Last Dawn Sentinel'],['kind','shieldKnight'],['visualFactionId','covenant'],['enemyVisualFactionInferred',true],['name','Veyr Wall Watcher'],['species','skeleton'],['visualVictim','soldier'],['bossType','zephyrLight'],['isBoss',true],['faction','network'],['dungeonThreatProfile','cult'],['humanoid',true],['archetype','wraith'],['majorPoiId','aureate'],['infiniteDungeonRegionId','ascension']];let checks=0;
   for(const enemy of cases){for(const [field,value] of mutations){enemy[field]=value;for(const phase of [1,2,3]){enemy.boss={phase};if(JSON.stringify(current.getEnemyVisualProfile(enemy))!==JSON.stringify(original.getEnemyVisualProfile(enemy)))throw Error('visual cache stale after '+field);checks++;}}}
   const {createDungeonWorld}=await import('/src/dungeonSystem.js'),world=createDungeonWorld({dungeonId:'ascensionSpire',floor:4,tier:8,seed:'density-performance',playerCount:4,skipPublishedOverride:true});
   const timings=[];for(const [label,module] of [['original',original],['optimized',current],['original',original],['optimized',current]]){let count=0;const t=performance.now();for(let i=0;i<100;i++)for(const e of world.enemies){if(module.getEnemyVisualProfile(e).family)count++;}timings.push({label,durationMs:performance.now()-t,lookups:count});}
   return {name:'enemy visual cache preserves classification and boss-phase changes',checks,timings};
  });checks.push(profiles);
  const art=await p.evaluate(async()=>{
   const current=await import('/src/spriteArt.js'),original=await import('/src/spriteArt.js?reference'),equipment=await import('/src/humanEquipmentSprites.js'),oldEquipment=await import('/src/humanEquipmentSprites.js?reference');
   for(const module of [current,original])for(const name of ['human-male','human-female'])module.asset(name);
   while([current,original].some(m=>m.spriteArtStatus().some(s=>!s.ready&&!s.failed)))await new Promise(r=>setTimeout(r,20));let poses=0,different=0,armour=0;
   for(const bodyType of ['male','female'])for(const facing of ['down','right','up','left'])for(const frame of [0,1,2,3]){
    const parts={bodyType,facing,skin:'#e2b99d',hair:'#5c4330',shirt:'#4c4640',pants:'#393732',boots:'#302c27',animationPose:{state:'walk',gaitKey:frame,walkCycle:frame*.25,sideLocomotion:true}};
    const draw=module=>{const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d');ctx.translate(64,72);module.drawHumanSprite(ctx,parts);return ctx.getImageData(0,0,128,128).data;};const a=draw(current),b=draw(original);different+=a.reduce((n,v,i)=>n+(v!==b[i]),0);poses++;
   }
   for(const bodyType of ['male','female'])for(const family of ['plate','leather','cloth'])for(const faction of ['roadless','lastDawn','covenant']){
    const profile={faction,slot:'chest',base:'#554433',accent:'#ab8877',silhouette:family},a=equipment.humanArmorImage(profile,family,bodyType),b=oldEquipment.humanArmorImage(profile,family,bodyType);const aa=a.getContext('2d').getImageData(0,0,a.width,a.height).data,bb=b.getContext('2d').getImageData(0,0,b.width,b.height).data;different+=aa.reduce((n,v,i)=>n+(v!==bb[i]),0);armour++;
   }
   return {name:'neutral leg readback and armour palette keep exact atlas pixels',poses,armour,different};
  });checks.push(art);assert.equal(art.different,0);
  const geography=await p.evaluate(async()=>{
   const current=await import('/src/continentTiles.js'),original=await import('/src/continentTiles.js?reference'),{createWorld}=await import('/src/world.js'),{CONTINENT_ROADS}=await import('/src/continentDefinition.js');
   const w=createWorld(),packed=current.packAuthoredTiles(Array.from({length:64},()=>Array.from({length:64},()=>({biome:'grass',region:'hearthmereFrontier',variant:0,passable:true})))),options={clearings:w.continentClearings,structures:w.continentStructures};
   const a=current.createContinentalTiles(packed,options),b=original.createContinentalTiles(packed,options);let checked=0;
   const compare=(x,y)=>{if(JSON.stringify(a.get(x,y))!==JSON.stringify(b.get(x,y)))throw Error('Clearing index changes terrain at '+x+','+y);checked++;};
   for(let i=0;i<10000;i++)compare((i*197)%2880,(i*43)%960);
   for(const c of options.clearings)for(const dx of [-c.r-1,-c.r,0,c.r,c.r+1])for(const dy of [-c.r-1,0,c.r+1])compare(Math.floor(c.x+dx),Math.floor(c.y+dy));
   for(const road of CONTINENT_ROADS)for(const [x,y] of road.points)for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)compare(Math.floor(x+dx),Math.floor(y+dy));
   a.clear();compare(715,209);return {name:'clearing spatial index retains exact roads, landings and collision cells',checked,currentStats:a.stats(),originalStats:b.stats()};
  });checks.push(geography);
  const ground=await p.evaluate(async()=>{
   const current=await import('/src/terrainRenderer.js'),original=await import('/src/terrainRenderer.js?reference'),{createDungeonWorld}=await import('/src/dungeonSystem.js');
   const w=createDungeonWorld({dungeonId:'ascensionSpire',floor:4,tier:8,depth:4,seed:'density-performance',playerCount:4,skipPublishedOverride:true}),canvas=document.createElement('canvas');canvas.width=960;canvas.height=600;const c=canvas.getContext('2d');c.miterLimit=2;const camera={x:w.spawn.x-200.3,y:w.spawn.y-200.7};
   for(let i=0;i<10;i++){current.drawTiles(c,w,camera);original.drawTiles(c,w,camera);}
   const timings=[];for(const [label,module] of [['original',original],['optimized',current],['original',original],['optimized',current]]){const t=performance.now();for(let i=0;i<100;i++){c.clearRect(0,0,960,600);module.drawTiles(c,w,camera);}timings.push({label,meanMs:(performance.now()-t)/100});}
   const calls=[],proto=CanvasRenderingContext2D.prototype,names=['drawImage','fillRect','save','restore','beginPath','stroke','fill'],methods=Object.fromEntries(names.map(k=>[k,proto[k]]));
   try{for(const [label,module] of [['original',original],['optimized',current]]){const counts={};for(const k of names){counts[k]=0;proto[k]=function(...args){counts[k]++;return methods[k].apply(this,args);};}module.drawTiles(c,w,camera);calls.push({label,counts});}}
   finally{for(const k of names)proto[k]=methods[k];}
   return {name:'same-world fixed-camera ground benchmark after warmup',timings,calls,cache:current.fallbackGroundStats(w)};
  });checks.push(ground);assert(ground.calls[1].counts.drawImage<ground.calls[0].counts.drawImage);assert.equal(ground.calls[1].counts.fillRect,0);
  fs.writeFileSync(`${out}/pixel-comparison.json`,JSON.stringify(pixels,null,2));
  checks.push(...pixels);for(const r of pixels){if(r.different!==undefined){if(r.name.startsWith('minimap-'))assert.equal(r.different,0,`unchanged minimap pixels: ${r.name}`);else assert((r.maxDelta||0)<=1&&r.different<640*480*.01,`terrain pixels within one channel level: ${r.name} (${r.different}, max delta ${r.maxDelta})`);}if(r.cachedChunks!==undefined)assert(r.cachedChunks<=r.maxChunks);}
  await p.evaluate(()=>{window.__worldCreates=0;perfReview.start(__testSave);});await p.waitForFunction(()=>perfReview.game?.started&&!perfReview.game.destroyed);await p.waitForTimeout(100);
  const saved=await p.evaluate(()=>({creates:__worldCreates,mode:perfReview.game.world.mode}));assert.equal(saved.creates,1);checks.push({name:'save constructs destination once',...saved});
  const hud=await p.evaluate(async()=>{const g=perfReview.game;g.paused=true;const {renderUI}=await import('/src/ui.js');const root=document.getElementById('skills').firstElementChild;const observer=new MutationObserver(()=>{});observer.observe(document.getElementById('skills'),{childList:true,subtree:true});for(let i=0;i<10;i++)renderUI(g.player,g.logLines,g,{hudOnly:true});const mutations=observer.takeRecords().length;observer.disconnect();const sameRoot=root===document.getElementById('skills').firstElementChild;g.player.inventory=[{id:'fieldRations',qty:17}];g.uiState.inventorySubtab='bag';document.querySelector('[data-tab="inventory"]').click();return {mutations,sameRoot,visible:document.querySelector('.panel.open #inventory.active')!==null,text:document.getElementById('inventory').textContent.includes('x17')};});console.log('HUD',hud);assert.equal(hud.mutations,0);assert(hud.sameRoot&&hud.visible&&hud.text);checks.push({name:'HUD skips hidden menu DOM; opening shows current inventory',...hud});
  const cdp=await p.context().newCDPSession(p),heaps=[];
  for(let i=0;i<5;i++){await p.evaluate(()=>{perfReview.game.destroy();perfReview.start(__testSave);});await p.waitForFunction(()=>perfReview.game?.started&&!perfReview.game.destroyed);await p.evaluate(()=>perfReview.game.paused=true);await cdp.send('HeapProfiler.collectGarbage');heaps.push(await cdp.send('Runtime.getHeapUsage'));}
  checks.push({name:'five load/destroy cycles after forced GC',heaps});assert(heaps.at(-1).usedSize<heaps[1].usedSize+4*1024*1024,'retained JS heap must stay within 4 MiB of second loaded session');
  await p.evaluate(()=>{perfReview.game.destroy();window.__worldCreates=0;const save=JSON.parse(JSON.stringify(__testSave));save.worldMode='capital';save.worldName='Orrakai';save.player.x=1168;save.player.y=1296;perfReview.start(save);});await p.waitForFunction(()=>perfReview.game?.started&&!perfReview.game.destroyed);
  const capital=await p.evaluate(()=>({creates:__worldCreates,mode:perfReview.game.world.mode,objects:perfReview.game.world.objects.length}));assert.equal(capital.creates,0);assert.equal(capital.mode,'capital');assert(capital.objects>100);checks.push({name:'Orrakai save avoids unused continent and retains town content',...capital});
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/regression.json`,JSON.stringify({pass:true,checks,errors},null,2));console.log('PASS:',checks.length,'performance regression checks; terrain within one channel level, exact minimap pixels and bounded caches/retained JS heap.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
