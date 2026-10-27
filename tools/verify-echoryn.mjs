import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {createSaveState,migrateSaveState,applySaveToGame} from '../src/gameSave.js';
import {createOverworldReturnState,restoreOverworldFromState,enterDungeon,exitDungeon} from '../src/dungeonSystem.js';
import {createCapitalHubWorld,exitCapitalHub,enterCapitalHub} from '../src/hubSystem.js';
import {ACT1_LANDMARKS} from '../src/overworldUtils.js';
import {ECHORYN_REVISION,ECHORYN_ROADS,ECHORYN_RIVERS,ECHORYN_ESCARPMENTS,ECHORYN_FOREST_WALLS,alongRoute,echorynRegionAt} from '../src/echorynGeography.js';
import {reconstructEchoryn,migrateEchorynPosition} from '../src/echorynLayout.js';
import {ECHORYN_ENTRANCES} from '../src/echorynScenes.js';
import {ECHORYN_DISCOVERIES} from '../src/echorynDiscoveries.js';
import {ECOLOGIES,ecologyAt} from '../src/worldAuthorship.js';
import {applyPoiWorldState,resolvePoi} from '../src/poiStateSystem.js';
import {ITEMS} from '../src/data.js';

const t=performance.now(),w=createWorld({skipPublishedOverride:true}),baseline=JSON.parse(fs.readFileSync(new URL('../docs/echoryn-reconstruction/content-before.json',import.meta.url)));
const contract=o=>o.npcId||o.questId||o.poiId||o.majorPoiId||/Entrance|Gate|Investigation|worldCache|worldSecret|worldRelic|navStone|campfire|shrine/.test(o.kind);
for(const old of baseline.objects.filter(contract)){
 const o=w.objects.find(o=>o.id===old.id);assert(o,`lost ${old.id}`);
 for(const key of ['kind','npcId','dialogueId','questId','poiId','majorPoiId','dungeonId'])assert.equal(o[key],old[key],`${old.id}/${key}`);
}
for(const old of baseline.enemies.filter(e=>!/^far-|^outer-/.test(e.id)))assert(w.enemies.some(e=>e.id===old.id),`lost authored encounter ${old.id}`);
for(const old of baseline.objects.filter(o=>!o.decorative&&!o.id.startsWith('wild-')))assert(w.objects.some(o=>o.id===old.id),`lost named resource/content ${old.id}`);
for(const old of baseline.locations)assert(w.authoredLocations.some(s=>s.id===old.id),`lost ${old.name}`);
assert.equal(new Set(w.objects.map(o=>o.id)).size,w.objects.length,'unique IDs');
for(const discovery of ECHORYN_DISCOVERIES)assert(w.objects.filter(o=>o.discoveryId===discovery.marker).length>=3,`uncomposed discovery ${discovery.name}`);
const objectCount=w.objects.length,treeCount=w.echorynTrees.length;reconstructEchoryn(w);assert.equal(w.objects.length,objectCount);assert.equal(w.echorynTrees.length,treeCount);

// Flood the real actor footprint, including physical trunks, stairs, cliffs and walls.
const visited=new Uint8Array(w.width*w.height),queue=[Math.floor(w.spawn.y/32)*w.width+Math.floor(w.spawn.x/32)];visited[queue[0]]=1;
for(let i=0;i<queue.length;i++){
 const n=queue[i],x=n%w.width,y=Math.floor(n/w.width);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy,index=ny*w.width+nx;
  if(nx<0||ny<0||nx>=w.width||ny>=w.height||visited[index]||!isActorPositionPassable(w,(nx+.5)*32,(ny+.5)*32,12))continue;
  visited[index]=1;queue.push(index);
 }
}
const reachable=(x,y)=>visited[Math.floor(y/32)*w.width+Math.floor(x/32)];
const failures=w.objects.filter(o=>contract(o)&&o.kind!=='poiMarker'&&!o.decorative&&!reachable(o.x,o.y)).map(o=>o.id);
assert.deepEqual(failures,[],'all interaction anchors reachable');
for(const [id,p] of Object.entries(ACT1_LANDMARKS))assert(reachable((p[0]+.5)*32,(p[1]+.5)*32),`unreachable landmark ${id}`);
for(const stone of w.navStones)assert(reachable(stone.x,stone.y),stone.id);
for(const enemy of w.enemies)assert(isActorPositionPassable(w,enemy.x,enemy.y,enemy.radius||enemy.r||12)&&reachable(enemy.x,enemy.y),`stranded encounter ${enemy.id}`);
for(const road of ECHORYN_ROADS)alongRoute(road,2,(x,y)=>{
 // Beyond the expedition gate is a staged departure silhouette; Act II uses its existing travel trigger.
 if(road.id==='expedition-road'&&y<18)return;
 assert(reachable((x+.5)*32,(y+.5)*32),`unreachable ${road.id} at ${x},${y}`);
});

// Continuous traversal of the proof route, using the actual shared actor movement API.
const route=ECHORYN_ROADS.find(r=>r.id==='hollow-road');
for(const radius of [10,12,16]){
 const a={x:(route.points[0][0]+.5)*32,y:(route.points[0][1]+.5)*32};
 for(const [x,y] of route.points.slice(1)){const tx=(x+.5)*32,ty=(y+.5)*32,dx=tx-a.x,dy=ty-a.y,steps=Math.ceil(Math.hypot(dx,dy)/6);for(let i=0;i<steps;i++)moveActorWithCollision(a,w,dx/steps,dy/steps,radius);assert(Math.hypot(a.x-tx,a.y-ty)<1,`actor radius ${radius} cannot traverse proof corridor`);}
}
for(const e of ECHORYN_ESCARPMENTS){
 const block=Array.from({length:e.w},(_,dx)=>e.x+dx).find(x=>w.tiles[e.y][x].biome==='cliff');assert(block,`${e.id} has solid cliff`);
 assert(!isActorPositionPassable(w,(block+.5)*32,(e.y+.5)*32,12),'cliffs block movement');
 const stair=Array.from({length:e.w},(_,dx)=>e.x+dx).find(x=>w.tiles[e.y][x].connector&&w.tiles[e.y][x].passable);assert(stair,`${e.id} has a connector`);
}
assert(ECHORYN_RIVERS.find(r=>r.id==='lantern-river').points.some(([x,y])=>x===250&&y===100));
assert(w.tiles[100][250].bridge&&w.tiles[96][250].biome==='water','bridge over real water');
const crypt=w.objects.find(o=>o.id==='pilgrimCryptEntrance');assert(crypt.y>103*32&&crypt.x<241*32&&reachable(crypt.x,crypt.y),'crypt below west bridge bank');
for(const [id,e] of Object.entries(ECHORYN_ENTRANCES)){const o=w.objects.find(o=>o.id===id);assert.equal(o.echorynEntrance,e.type);}
assert.equal(echorynRegionAt(...ACT1_LANDMARKS.thornrootHollow).id,'thornwood');
assert.equal(ecologyAt(w,...ACT1_LANDMARKS.ironMire.map(v=>v*32)),'marsh');
assert.equal(ecologyAt(w,...ACT1_LANDMARKS.saltwellCamp.map(v=>v*32)),'river');
for(const mass of ECHORYN_FOREST_WALLS){
 const tree=w.echorynTrees.find(t=>t.mass===mass.id);assert(tree,`${mass.id} has visible forest`);
 assert(!isActorPositionPassable(w,tree.x,tree.y,12),`${mass.id} blocks travel`);
}
for(const eco of Object.values(ECOLOGIES))for(const id of [...eco.forage,...eco.mineral])assert(ITEMS[id],id);
for(const fish of w.objects.filter(o=>o.kind==='fish')){
 const x=Math.floor(fish.x/32),y=Math.floor(fish.y/32);let wet=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(w.tiles[y+dy]?.[x+dx]?.biome==='water')wet=true;assert(wet,`fishing away from water ${fish.id}`);
}

const p=createPlayer('Echoryn verification');Object.assign(p,{x:110.5*32,y:90.5*32,currentZone:'Echoryn Forest',act1OpeningPending:false});p.poiStates={ashenOrchard:{clues:{proof:{id:'proof'}},resolution:null}};
const story=JSON.stringify(p.poiStates);assert(migrateEchorynPosition(w,p));assert.equal(JSON.stringify(p.poiStates),story);assert.equal(p.echorynLayoutRevision,ECHORYN_REVISION);assert(isActorPositionPassable(w,p.x,p.y,12));assert(!migrateEchorynPosition(w,p));
const cliff=ECHORYN_ESCARPMENTS[0];p.x=(cliff.x+.5)*32;p.y=(cliff.y+.5)*32;assert(migrateEchorynPosition(w,p));assert(isActorPositionPassable(w,p.x,p.y,12));
const game={world:w,player:p,canvas:{width:1100,height:700},camera:{x:0,y:0},log:()=>{}};
const save=createSaveState(game),loaded=migrateSaveState(JSON.parse(JSON.stringify(save)));assert.equal(save.worldObjects,null);assert(loaded.worldRuntime.echorynTreeBuckets instanceof Map);assert.deepEqual(loaded.player.poiStates,p.poiStates);
const loadGame={...game};assert(applySaveToGame(loadGame,JSON.parse(JSON.stringify(save))));assert(loadGame.world.echorynTreeBuckets instanceof Map);assert.equal(loadGame.world.echorynRevision,ECHORYN_REVISION);
const state=createOverworldReturnState(game,crypt),restored=restoreOverworldFromState(JSON.parse(JSON.stringify(state)));assert.equal(restored.echorynTrees.length,treeCount);assert.equal(restored.authoredLocations.length,w.authoredLocations.length);assert.equal(restored.objects.length,w.objects.length);
const legacy=JSON.parse(JSON.stringify(state));delete legacy.terrainFeatures.echorynRevision;const upgraded=restoreOverworldFromState(legacy);assert.equal(upgraded.echorynRevision,ECHORYN_REVISION);
assert(enterDungeon(game,w.objects.find(o=>o.id==='ashenOrchardCellarEntrance')));assert(exitDungeon(game));assert(game.world.echorynTreeBuckets instanceof Map);assert(isActorPositionPassable(game.world,p.x,p.y,12));
game.world=createCapitalHubWorld();assert(exitCapitalHub(game));assert(game.world.echorynTreeBuckets instanceof Map);assert(isActorPositionPassable(game.world,p.x,p.y,12));assert(enterCapitalHub(game));assert(exitCapitalHub(game));assert(game.world.echorynTreeBuckets instanceof Map);
const statePlayer=createPlayer('Orchard state');resolvePoi(statePlayer,'ashenOrchard','evacuateAndBurn');applyPoiWorldState(statePlayer,w);assert(w.objects.find(o=>o.id==='orchardAfterLivingTree').depleted);assert(!w.objects.find(o=>o.id==='orchardAfterBurnMemorial').depleted);
for(const poiId of ['ashenOrchard','brokenChapel']){
 const props=w.objects.filter(o=>o.poiStateCondition?.poiId===poiId&&o.poiStateCondition.resolutionAny);
 for(const resolution of new Set(props.flatMap(o=>o.poiStateCondition.resolutionAny))){
  const p=createPlayer('Branch visibility');resolvePoi(p,poiId,resolution);delete w.poiStateRevisionApplied;applyPoiWorldState(p,w);
  for(const o of props)assert.equal(!o.depleted,o.poiStateCondition.resolutionAny.includes(resolution),`${o.id} overlaps another outcome`);
 }
}
const report={result:'PASS',protectedContracts:baseline.objects.filter(contract).length,authoredEncounters:baseline.enemies.filter(e=>!/^far-|^outer-/.test(e.id)).length,objects:w.objects.length,trees:treeCount,forestWalls:ECHORYN_FOREST_WALLS.length,reachableActorCells:queue.length,roads:ECHORYN_ROADS.length,waterways:ECHORYN_RIVERS.length,ms:Math.round(performance.now()-t)};
fs.writeFileSync(new URL('../docs/echoryn-reconstruction/verification.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
