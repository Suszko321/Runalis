const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const dir='docs/minimap-lines';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:445}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8766/');
  const report=await page.evaluate(async()=>{
   const {drawEntityRadar}=await import('/src/minimapRadar.js'),{drawMinimapPanel,updateMinimapExploration}=await import('/src/minimapHud.js');
   const {createWorld}=await import('/src/world.js'),{createDungeonWorld}=await import('/src/dungeonSystem.js'),{createPlayer}=await import('/src/player.js');
   document.body.innerHTML='<main style="display:flex;gap:24px;padding:24px;font:16px Georgia;color:#ebd9b8;background:#101a1d;min-height:100vh;box-sizing:border-box"></main>';document.body.style.margin='0';
   const results=[],check=(ok,label)=>{if(!ok)throw Error(label);results.push(label);};
   const makeCanvas=title=>{const box=document.createElement('section');box.innerHTML=`<p>${title}</p><canvas width="168" height="168" style="width:300px;height:300px;image-rendering:pixelated"></canvas>`;document.querySelector('main').append(box);return box.querySelector('canvas');};
   const probe=document.createElement('canvas');probe.width=probe.height=168;const ctx=probe.getContext('2d');
   const actor={x:24*32,y:14*32,hp:100},roadWorld={mode:'overworld',tileSize:32,objects:[],enemies:[],terrainFeatures:{roads:[{points:[[0,14*32],[64*32,14*32]]}]},get tiles(){throw Error('Overworld lines read terrain');}};
   const road=drawEntityRadar(ctx,{world:roadWorld,player:actor},168);check(road.roadSegments===1&&road.terrainReads===0,'road crossing radar is drawn without reading overworld terrain');
   roadWorld.terrainFeatures.roads=[{points:[[0,10000],[1000,10000]]}];check(drawEntityRadar(ctx,{world:roadWorld,player:actor},168).roadSegments===0,'distant road segments are culled');
   let reads=0;const tiles=Array.from({length:64},(_,y)=>new Proxy(Array.from({length:64},(_,x)=>({biome:(y>=8&&y<20&&(x>=8&&x<20||x>=30&&x<42)||y>=13&&y<15&&x>=20&&x<30)?'ruin':'wall'})),{get(row,k){if(/^\d+$/.test(String(k)))reads++;return row[k];}}));
   // Use the actual passable floor biome supported by the game.
   const {BIOMES}=await import('/src/data.js');check(BIOMES.ruin?.passable===true,'fixture uses a passable dungeon floor');
   const world={mode:'dungeon',floor:1,width:64,height:64,tiles,objects:[],enemies:[]},game={world,player:actor};
   const cold=drawEntityRadar(ctx,game,168),warm=drawEntityRadar(ctx,game,168);
   check(cold.wallSegments===112,'wall contours follow rooms and connecting corridor, leaving doorways open');
   check(cold.terrainReads>0&&cold.terrainReads<8000&&warm.terrainReads===0,'local wall sections are cached after bounded initial reads');
   check(reads===cold.terrainReads,'warm radar performs no hidden terrain reads');
   check(drawEntityRadar(ctx,game,168,{isTerrainVisible:()=>false}).wallSegments===0,'unexplored walls stay hidden even after contour caching');
   const partial=drawEntityRadar(ctx,game,168,{isTerrainVisible:tx=>tx<24});check(partial.wallSegments>0&&partial.wallSegments<112,'exploration reveals only the appropriate wall sections');
   world.floor=2;check(drawEntityRadar(ctx,game,168).terrainReads>0,'floor changes invalidate old contour cache');
   const overworld=createWorld({skipPublishedOverride:true}),player=createPlayer('Road lines');
   const point=overworld.terrainFeatures.roads[0].points[1];Object.assign(player,{x:point[0],y:point[1]});
   const outdoor=drawEntityRadar(makeCanvas('Overworld · road routes').getContext('2d'),{world:overworld,player},168);check(outdoor.roadSegments>0,'production overworld exposes authored road geometry');
   const dungeon=createDungeonWorld({theme:'mine',seed:'minimap-line-review'});Object.assign(player,{x:dungeon.spawn.x,y:dungeon.spawn.y});const dg={world:dungeon,player};updateMinimapExploration(dg);
   const dungeonCanvas=makeCanvas('Dungeon · explored walls');drawMinimapPanel(dungeonCanvas.getContext('2d'),dg,{x:-14,y:-34,width:196,height:216});
   const fullCanvas=makeCanvas('Dungeon · room and corridor outline');Object.assign(actor,{x:24*32,y:14*32});drawEntityRadar(fullCanvas.getContext('2d'),game,168);
   const times=[];for(let i=0;i<80;i++){const start=performance.now();drawEntityRadar(ctx,game,168);times.push(performance.now()-start);}times.sort((a,b)=>a-b);
   return {pass:true,checks:results,cold,warm,partial,outdoor,warmMedianMs:times[40],warmP95Ms:times[76]};
  });
  await page.screenshot({path:dir+'/preview.png'});assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(dir+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
