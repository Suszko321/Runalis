const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
let b;
(async()=>{b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage();
 await p.route('**/src/minimapHud.js?original',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('backups/twilight-hud-2026-10-25/minimapHud.js','utf8')}));
 await p.goto('http://127.0.0.1:8766/');
 const results=await p.evaluate(async()=>{
  const old=await import('/src/minimapHud.js?original'),current=await import('/src/minimapHud.js');
  let reads=0;const tiles=Array.from({length:96},()=>new Proxy(Array.from({length:96},()=>({biome:'grass',passable:true})),{get(t,k){if(/^\d+$/.test(String(k)))reads++;return t[k];}}));
  const world={width:96,height:96,tiles,mode:'overworld',name:'Radar benchmark',objects:Array.from({length:120},(_,i)=>({id:'npc-'+i,kind:i%2?'npc':'dungeonEntrance',x:(30+i%15)*32,y:(30+Math.floor(i/15))*32})),enemies:Array.from({length:60},(_,i)=>({id:'e'+i,hp:10,x:(30+i%12)*32,y:(30+Math.floor(i/12))*32}))};
  const game={world,player:{x:45*32,y:45*32,coop:{players:[]},summons:[]}},canvas=document.createElement('canvas');canvas.width=canvas.height=240;const ctx=canvas.getContext('2d');const rows=[];
  for(const [name,api] of [['original',old],['radar',current]]){
   for(let i=0;i<10;i++)api.drawMinimapPanel(ctx,game,{x:0,y:0,width:240,height:240});reads=0;const times=[];
   for(let i=0;i<80;i++){const t=performance.now();api.drawMinimapPanel(ctx,game,{x:0,y:0,width:240,height:240});times.push(performance.now()-t);}times.sort((a,b)=>a-b);rows.push({name,medianMs:times[40],p95Ms:times[76],tileReadsPerDraw:reads/80});
  }
  const dungeon={mode:'dungeon',width:96,height:96,name:'Fog test',floor:1,rooms:[],objects:[],tiles,enemies:[{hp:1,x:game.player.x+20*32,y:game.player.y}]};
  const dg={world:dungeon,player:game.player};
  const redPixels=()=>{const pixels=ctx.getImageData(0,0,240,240).data;let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]===239&&pixels[i+1]===85&&pixels[i+2]===84)count++;return count;};
  current.drawMinimapPanel(ctx,dg,{x:0,y:0,width:240,height:240});const hiddenRed=redPixels();dungeon.enemies[0].x=game.player.x+3*32;current.drawMinimapPanel(ctx,dg,{x:0,y:0,width:240,height:240});const revealedRed=redPixels();
  rows.push({name:'dungeon-fog',hiddenRed,revealedRed,exploredCells:dungeon.dungeonState.floorStates['1'].mapState.exploredCells.length});return rows;
 });assert.equal(results[1].tileReadsPerDraw,0);assert(results[0].tileReadsPerDraw>1000);assert.equal(results[2].hiddenRed,0);assert(results[2].revealedRed>0);fs.writeFileSync('docs/twilight-hud/radar-performance.json',JSON.stringify(results,null,2));console.log(results);await b.close();
})().catch(async e=>{console.error(e);await b?.close();process.exitCode=1;});
