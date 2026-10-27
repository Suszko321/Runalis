// Reuses the existing gameplay update/render loops with bounded resident lists.
// Chunk residency never owns rewards, deaths, discovery or resource timers.
import {TILE} from './data.js';
import {continentRegionAt,continentEcologyAt,continentRoadAt,CONTINENT_WIDTH,CONTINENT_HEIGHT} from './continentDefinition.js';
import {captureContinentalState,restoreContinentalState,applyContinentalEntityState,continentalGeneratedEntities,continentalDrops} from './continentPersistence.js';
import {updateContinentalTravelArrival} from './travelSystem.js';
import {worldEntityMemoryKey,worldEntityMemoryId} from './worldExploration.js';
export const ENTITY_CHUNK_TILES=24,ENTITY_CHUNK_SIZE=ENTITY_CHUNK_TILES*TILE;
export const ACTIVE_CHUNK_RADIUS=2,PRELOAD_CHUNK_RADIUS=3,MAX_DECORATION_CHUNKS=64;
const hash=(x,y)=>{let n=Math.imul(x+71,374761393)^Math.imul(y+13,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;};
const keyOf=(x,y)=>`${Math.floor(x/ENTITY_CHUNK_SIZE)},${Math.floor(y/ENTITY_CHUNK_SIZE)}`;
export function createContinentalRuntime(world,{objects,enemies,terrain}){
 const chunks=new Map(),decoration=new Map(),byId=new Map(),activeKeys=new Set();let playerRef=null,totalLoads=0,timer=0,signature='';
 const allObjects=objects,allEnemies=enemies;
 const treeBlocks=(o,x,y)=>['continentPine','continentWillow'].includes(o.propType)&&Math.hypot(x-o.x,y-o.y)<Math.max(7,Math.min(15,(o.artWidth||100)/10));
 const chunkAt=(x,y)=>{const key=keyOf(x,y);let chunk=chunks.get(key);if(!chunk){const [cx,cy]=key.split(',').map(Number);chunk={id:key,cx,cy,objects:[],enemies:[],drops:[],treeColliders:[]};chunks.set(key,chunk);}return chunk;};
 function register(entity,kind='objects'){
  if(!entity?.id||byId.has(entity.id))return;
  entity.sourceRegionId ||= continentRegionAt(entity.x/TILE,entity.y/TILE).id;
  entity.homeX ??=entity.x;entity.homeY ??=entity.y;
  const c=chunkAt(entity.homeX,entity.homeY);c[kind].push(entity);byId.set(entity.id,entity);
  if(['continentPine','continentWillow'].includes(entity.propType))c.treeColliders.push(entity);
  if(playerRef)applyContinentalEntityState(entity,playerRef,kind==='enemies'?'enemy':'object');
 }
 for(const o of objects)register(o);for(const e of enemies)register(e,'enemies');
 function hydrate(cx,cy,player){
  if(cx<0||cy<0||cx>=Math.ceil(CONTINENT_WIDTH/ENTITY_CHUNK_TILES)||cy>=Math.ceil(CONTINENT_HEIGHT/ENTITY_CHUNK_TILES))return null;
  const chunk=chunkAt(cx*ENTITY_CHUNK_SIZE,cy*ENTITY_CHUNK_SIZE),bounds={minX:cx*ENTITY_CHUNK_SIZE,minY:cy*ENTITY_CHUNK_SIZE,maxX:(cx+1)*ENTITY_CHUNK_SIZE,maxY:(cy+1)*ENTITY_CHUNK_SIZE};
  if(player){
   for(const e of continentalGeneratedEntities(player,'enemy',bounds))register(e,'enemies');
   for(const o of continentalGeneratedEntities(player,'object',bounds))register({...o,continentalHydrated:true});
   for(const d of continentalDrops(player,bounds))if(!chunk.drops.some(o=>o.id===d.id))chunk.drops.push(d);
  }
  return chunk;
 }
 function decorations(chunk){
  if(decoration.has(chunk.id)){const value=decoration.get(chunk.id);decoration.delete(chunk.id);decoration.set(chunk.id,value);return value;}
  const out=[];totalLoads++;
  for(let y=chunk.cy*ENTITY_CHUNK_TILES+3;y<(chunk.cy+1)*ENTITY_CHUNK_TILES;y+=7)for(let x=chunk.cx*ENTITY_CHUNK_TILES+3;x<(chunk.cx+1)*ENTITY_CHUNK_TILES;x+=7){
   if(x<640&&y<480)continue;
   const seed=hash(x,y),px=x+(seed-.5)*3,py=y+(hash(y,x)-.5)*3,t=terrain.get(Math.floor(px),Math.floor(py));
   if(!t||t.passable===false||t.continentClearing||t.roadId||t.bridge||world.continentClearings.some(c=>Math.hypot(px-c.x,py-c.y)<c.r+2))continue;
   const eco=continentEcologyAt(px,py),road=continentRoadAt(px,py);if(road)continue;
   let propType=eco==='highland'?'continentPine':eco==='marsh'?'continentReedBed':eco==='aureate'?'continentFarm':eco==='ascension'?'continentRuin':'continentPine';
   if(eco==='aureate'&&seed>.62)continue;if(eco==='ascension'&&seed>.38)continue;
   const region=continentRegionAt(px,py);
   // Fields surround the highway; bog plants follow the wet watershed; ruins
   // lean toward the broken network. Background variation is deterministic.
   out.push({id:`terrain-detail-${x}-${y}`,kind:'worldDressing',propType,x:Math.round(px*TILE),y:Math.round(py*TILE),artWidth:eco==='marsh'?95:eco==='aureate'?135:100+seed*55,artHeight:eco==='marsh'?74:eco==='aureate'?60:130+seed*80,variant:Math.floor(seed*4),style:eco==='highland'?'pass':eco==='marsh'?'fen':eco==='ascension'?'cosmic':region.id==='imperialHeartlands'?'imperial':'aureate',decorative:true,interactable:false,hideLabel:true,drawRadius:280});
  }
  decoration.set(chunk.id,out);if(decoration.size>MAX_DECORATION_CHUNKS)decoration.delete(decoration.keys().next().value);return out;
 }
 function collectInjected(){
  for(const e of world.enemies||[])if(!byId.has(e.id)){register(e,'enemies');if(!e.dynamicEncounter)allEnemies.push(e);}
  for(const o of world.objects||[])if(!o.id?.startsWith('terrain-detail-')&&!byId.has(o.id)){register(o);if(!o.dynamicEncounter)allObjects.push(o);}
  for(const d of world.drops||[])if(d?.id){const c=chunkAt(d.x,d.y);if(!c.drops.some(o=>o.id===d.id))c.drops.push(d);}
 }
 function retireTransient(actors){
  const now=Number(playerRef?.worldMemory?.elapsed)||0;
  for(const [key,c] of chunks){
   for(const kind of ['objects','enemies'])c[kind]=c[kind].filter(e=>{
    if(kind==='enemies'&&(e.dead||e.hp<=0)&&!e.deathHandled)return true;
    if(!e.dynamicEncounter&&!e.temporaryEncounter)return true;
    const expired=now-Number(e.spawnedAt||0)>Number(e.despawnAfter||240),near=actors.some(a=>Math.hypot(e.x-a.x,e.y-a.y)<=94*TILE);
    if(e.remove||e.dead||e.depleted||e.hp===0||expired&&!near){e.remove=true;byId.delete(e.id);return false;}return true;
   });
   c.drops=c.drops.filter(d=>!d.collected&&!d.remove&&!(d.age>=d.ttl&&d.ttl>0));
   if(!c.objects.length&&!c.enemies.length&&!c.drops.length&&!activeKeys.has(key))chunks.delete(key);
  }
 }
 function activate(actors,player,force=false){
  const centers=actors.filter(a=>a&&Number.isFinite(a.x)&&Number.isFinite(a.y)).map(a=>[Math.floor(a.x/ENTITY_CHUNK_SIZE),Math.floor(a.y/ENTITY_CHUNK_SIZE)]),next=centers.map(c=>c.join(',')).sort().join('|');
  if(!force&&next===signature&&player===playerRef)return false;
  signature=next;collectInjected();activeKeys.clear();
  if(player&&player!==playerRef){playerRef=player;for(const o of allObjects)applyContinentalEntityState(o,player);for(const e of allEnemies)applyContinentalEntityState(e,player,'enemy');}
  for(const [cx,cy] of centers)for(let dy=-PRELOAD_CHUNK_RADIUS;dy<=PRELOAD_CHUNK_RADIUS;dy++)for(let dx=-PRELOAD_CHUNK_RADIUS;dx<=PRELOAD_CHUNK_RADIUS;dx++){
   const chunk=hydrate(cx+dx,cy+dy,player);if(chunk&&Math.abs(dx)<=ACTIVE_CHUNK_RADIUS&&Math.abs(dy)<=ACTIVE_CHUNK_RADIUS)activeKeys.add(chunk.id);
  }
  const residentObjects=[],residentEnemies=[],residentDrops=[];
  for(const key of activeKeys){const c=chunks.get(key);
   for(const o of c.objects)if(o.depleted&&player){
    const memoryKey=`${worldEntityMemoryKey(world,o)}:${worldEntityMemoryId(o)}`,expiry=player.worldMemory?.harvests?.[memoryKey]??player.worldMemory?.continent?.entities?.[o.id]?.respawnAt;
    if(Number.isFinite(expiry)&&expiry<=Number(player.worldMemory?.elapsed||0)){o.depleted=false;o.respawn=0;}
   }
   residentObjects.push(...c.objects.filter(o=>!o.remove),...decorations(c));residentEnemies.push(...c.enemies.filter(e=>(!e.dead&&!e.remove&&e.hp>0)||((e.dead||e.hp<=0)&&!e.deathHandled)));residentDrops.push(...c.drops.filter(d=>!d.collected&&!d.remove&&d.ttl>0));
  }
  // An engaged enemy may pursue across a chunk boundary; never pop out in combat.
  for(const e of world.enemies||[])if(((e.dead||e.hp<=0)&&!e.deathHandled||e.hp>0&&!e.dead&&!e.remove&&(e.aggro||e.inCombat||e.alerted||e.combatTargetId))&&!residentEnemies.includes(e))residentEnemies.push(e);
  world.objects=[...new Set(residentObjects)];world.enemies=[...new Set(residentEnemies)];world.drops=[...new Set(residentDrops)];
  return true;
 }
 function previewAt(x,y,player){
  const cx=Math.floor(x/ENTITY_CHUNK_SIZE),cy=Math.floor(y/ENTITY_CHUNK_SIZE),result={objects:[],enemies:[]};
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const c=hydrate(cx+dx,cy+dy,player);if(c){result.objects.push(...c.objects);result.enemies.push(...c.enemies);}}
  return result;
 }
 function refresh(game){collectInjected();captureContinentalState(game);const p=game.player,party=[p,...(p?.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false)];activate(party,p,true);updateRegion(game);}
 function updateRegion(game){
  const p=game.player,r=continentRegionAt(p.x/TILE,p.y/TILE);world.regionId=r.id;p.regions ||= {};p.regions.currentRegionId=r.id;p.regions.visited ||= {};p.regions.visited[r.id]=true;p.currentZone=r.name;world.localRegion=r;
  updateContinentalTravelArrival(game);
 }
 function update(game,dt=0){
  if(game.world!==world)return;
  if(playerRef!==game.player){playerRef=game.player;restoreContinentalState(game);activate([game.player,...(game.player.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false)],game.player,true);}
  timer-=dt;if(timer<=0){timer=.5;const party=[game.player,...(game.player.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false)];collectInjected();captureContinentalState(game);retireTransient(party);activate(party,game.player);}
  updateRegion(game);
 }
 function blocksAt(x,y){const cx=Math.floor(x/ENTITY_CHUNK_SIZE),cy=Math.floor(y/ENTITY_CHUNK_SIZE);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const key=`${cx+dx},${cy+dy}`,c=chunks.get(key);if(c?.treeColliders.some(o=>!o.remove&&treeBlocks(o,x,y))||decoration.get(key)?.some(o=>treeBlocks(o,x,y)))return true;}return false;}
 return {chunks,allObjects,allEnemies,terrain,activate,previewAt,refresh,update,blocksAt,findObject:id=>byId.get(id),register,stats:()=>({activeEntityChunks:activeKeys.size,logicalChunks:chunks.size,registeredEntities:byId.size,decorationChunks:decoration.size,maxDecorationChunks:MAX_DECORATION_CHUNKS,activeObjects:world.objects.length,activeEnemies:world.enemies.length,totalAuthoredObjects:allObjects.length,totalAuthoredEnemies:allEnemies.length,detailLoads:totalLoads,...terrain.stats()})};
}
export function updateContinentalWorld(game,dt=0){game?.world?.continentRuntime?.update(game,dt);}
