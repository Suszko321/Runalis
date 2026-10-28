// Developer-only field review. Uses the production world, streaming, collision
// and draw orchestration; no profiles are loaded or saved by this page.
import {TILE,BIOMES} from './data.js';
import {createContinentalWorld} from './continentWorld.js';
import {createPlayer,chooseClass,addItem} from './player.js';
import {moveActorWithCollision,isActorPositionPassable} from './world.js';
import {draw} from './render.js';
import {updateWorldExploration,worldMemory} from './worldExploration.js';
import {CONTINENT_ROADS,continentRegionAt} from './continentDefinition.js';
import {createContinentalScenes} from './continentScenes.js';
import {continentalGroundStats} from './continentRenderer.js';
import {spriteArtStatus} from './spriteArt.js';

const canvas=document.querySelector('#field'),ctx=canvas.getContext('2d'),select=document.querySelector('#scene'),routeSelect=document.querySelector('#route'),status=document.querySelector('#status'),description=document.querySelector('#description');
const player=createPlayer('Continental survey');chooseClass(player,'fellhunter');addItem(player,'fieldRations',25);
const world=createContinentalWorld({skipPublishedOverride:true,player});
const game={player,world,canvas,camera:{x:0,y:0},uiState:{},keys:{},logLines:[],log(line){this.logLines.push(String(line));if(this.logLines.length>10)this.logLines.shift();},save(){},input:{}};
const scenes=createContinentalScenes();
const choices=[
 {id:'orrakai-south',name:'Orrakai · South exterior',x:10.5,y:6,lore:'Orrakai continues beyond the northwest boundary; the south road leads directly to its Nav Stone.'},
 {id:'orrakai-farms',name:'Orrakai · Farms and relief road',x:20,y:18,lore:'A compact relief apron and small kitchen plot sit beside the south road.'},
 ...scenes.locations.map(s=>({id:s.id,name:s.name,x:s.tileX,y:s.tileY,lore:s.lore})),
 {id:'pilgrim-road-crossing',name:'Pass · Pinewater bridge',x:750,y:208,lore:'A real road crossing carries the pilgrim route over the Pinewater watershed.'},
 {id:'aureate-arrival',name:'Aureate · Arrival services',x:970,y:201,lore:'Retained Pilgrim Rest services and companions are beside the Saint Orvane south court.'},
 {id:'aureate-choir',name:'Aureate · Shattered Choir approach',x:1244,y:192,lore:'The existing Shattered Choir entrance remains a physical destination in the white-stone province.'},
 {id:'ascension-arrival',name:'Ascension · Last Lantern Camp',x:1656,y:224,lore:'Retained companions, camp and shrine form a foothold in the Wastes.'},
 {id:'ascension-spire',name:'Ascension · Spire approach',x:1964,y:204,lore:'The existing Spire dungeon is reached through fractured civic terrain.'},
 {id:'heartland-open-road',name:'Heartlands · Quiet freight road',x:1985,y:595,lore:'A quiet stretch separates provincial activity from the next river crossing.'},
 {id:'zarynth-west-entrance',name:'Zarynth · West arrival entrance',x:2697,y:441,lore:'The long western highway enters the inhabited arrival ward through its open west toll passage.'}
];
select.replaceChildren(...choices.map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.name;return option;}));
const routes=CONTINENT_ROADS.filter(r=>['hollow-road','continental-pilgrim-road','black-pine-ridge','blackfen-crossing','fen-river-loop','severed-causeway','causeway-maintenance','imperial-highway','heartland-river-road','west-lantern-road','zarynth-outskirts'].includes(r.id));
routeSelect.replaceChildren(...routes.map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.name;return option;}));
let journey=null,overlay=false,lastFailure=null,lastDraw=0;
function landing(x,y){
 const p={x:(x+.5)*TILE,y:(y+.5)*TILE};if(isActorPositionPassable(world,p.x,p.y,12))return p;
 for(let radius=1;radius<=12;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===radius){const q={x:(Math.floor(x)+dx+.5)*TILE,y:(Math.floor(y)+dy+.5)*TILE};if(isActorPositionPassable(world,q.x,q.y,12))return q;}
 return p;
}
function activate(){world.continentRuntime.activate([player],player,true);world.continentRuntime.update(game,0);updateWorldExploration(game,0);}
function load(id){
 const s=choices.find(s=>s.id===id)||choices[0];select.value=s.id;journey=null;lastFailure=null;
 Object.assign(player,landing(s.x,s.y),{vx:0,vy:0,dirX:0,dirY:1,moving:false});player.floatingTexts=[];world.effects=[];activate();description.textContent=s.lore;canvas.focus();
}
function startWalk(id){
 const route=routes.find(r=>r.id===id)||routes[0],p=route.points[0];Object.assign(player,landing(p[0],p[1]));journey={route,index:1,blocked:0,distance:0};lastFailure=null;description.textContent=`Following ${route.name} through its authored road points. This walks with the same collision as gameplay.`;activate();canvas.focus();
}
function collisionOverlay(){
 const startX=Math.floor(game.camera.x/TILE),startY=Math.floor(game.camera.y/TILE);ctx.save();
 for(let y=startY;y<startY+Math.ceil(canvas.height/TILE)+1;y++)for(let x=startX;x<startX+Math.ceil(canvas.width/TILE)+1;x++){const t=world.tiles[y]?.[x];if(!t)continue;const sx=x*TILE-game.camera.x,sy=y*TILE-game.camera.y;if(t.passable===false||BIOMES[t.biome]?.passable===false){ctx.fillStyle='rgba(222,87,67,.25)';ctx.fillRect(sx,sy,TILE,TILE);}else if(t.bridge||t.connector){ctx.fillStyle='rgba(124,220,204,.2)';ctx.fillRect(sx,sy,TILE,TILE);}ctx.strokeStyle='rgba(226,226,180,.07)';ctx.strokeRect(sx,sy,TILE,TILE);}
 ctx.restore();
}
select.addEventListener('change',()=>load(select.value));document.querySelector('#walk').addEventListener('click',()=>startWalk(routeSelect.value));
document.querySelector('#night').addEventListener('click',()=>{const m=worldMemory(player);m.elapsed=m.elapsed%1200>780?0:900;updateWorldExploration(game,0);});
document.querySelector('#geometry').addEventListener('click',()=>overlay=!overlay);
const keys=new Set();window.addEventListener('keydown',e=>{if(e.target.matches('select,button'))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(key==='escape')journey=null;keys.add(key);});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
let previous=performance.now();
function frame(now){
 const dt=Math.min(.045,(now-previous)/1000);previous=now;
 const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 let mx=0,my=0;
 if(dx||dy){journey=null;const d=Math.hypot(dx,dy),speed=keys.has('shift')?420:170;mx=dx/d*speed*dt;my=dy/d*speed*dt;}
 if(journey){const p=journey.route.points[journey.index],tx=(p[0]+.5)*TILE,ty=(p[1]+.5)*TILE,d=Math.hypot(tx-player.x,ty-player.y),step=Math.min(d,170*dt);if(d<2){journey.index++;if(journey.index>=journey.route.points.length){description.textContent=`Completed ${journey.route.name}: ${(journey.distance/TILE).toFixed(0)} tiles walked.`;journey=null;}}else {mx=(tx-player.x)/d*step;my=(ty-player.y)/d*step;}}
 const oldX=player.x,oldY=player.y;if(mx||my){moveActorWithCollision(player,world,mx,my,12);player.dirX=mx/Math.max(.001,Math.hypot(mx,my));player.dirY=my/Math.max(.001,Math.hypot(mx,my));player.facingX=player.dirX;player.facingY=player.dirY;}
 const moved=Math.hypot(player.x-oldX,player.y-oldY);player.moving=moved>.01;player.isMoving=player.moving;player.anim=(player.anim||0)+dt*(player.moving?1:0);player.moveTime=(player.moveTime||0)+dt;
 if(journey){journey.distance+=moved;journey.blocked=moved<.01?journey.blocked+dt:0;if(journey.blocked>.8){lastFailure=`Route blocked at tile ${(player.x/TILE).toFixed(1)}, ${(player.y/TILE).toFixed(1)} on ${journey.route.name}.`;journey=null;}}
 world.continentRuntime.update(game,dt);updateWorldExploration(game,dt);game.camera.x=Math.max(0,player.x-canvas.width/2);game.camera.y=Math.max(0,player.y-canvas.height/2);
 const before=performance.now();try{draw(ctx,world,player,game.camera);if(overlay)collisionOverlay();}catch(error){lastFailure=error.stack;}
 lastDraw=performance.now()-before;
 const region=continentRegionAt(player.x/TILE,player.y/TILE),stats=world.continentRuntime.stats();status.classList.toggle('error',!!lastFailure);status.textContent=lastFailure||`${region.name} · Tile ${Math.floor(player.x/TILE)}, ${Math.floor(player.y/TILE)} · ${lastDraw.toFixed(1)} ms draw · ${stats.activeEntityChunks} active areas · ${stats.activeObjects} nearby objects${journey?' · Walking '+journey.route.name:''}`;
 requestAnimationFrame(frame);
}
window.continentReview={game,choices,routes,scenes,load,startWalk,landing,activate,get failure(){return lastFailure;},get drawMs(){return lastDraw;},get journey(){return journey;},get statistics(){return {...world.continentRuntime.stats(),...continentalGroundStats(world),readyAtlases:spriteArtStatus().filter(a=>a.ready).length};}};
const requested=new URLSearchParams(location.search).get('scene');load(requested||choices[0].id);requestAnimationFrame(frame);
