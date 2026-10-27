import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {createOverworldMap} from '../src/overworldMap.js';
import {createTowerFloorWorld} from '../src/towerSystem.js';
import {createRegionWorld} from '../src/regionWorlds.js';
import {createDungeonWorld,createOverworldReturnState,restoreOverworldFromState} from '../src/dungeonSystem.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {createSaveState} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {ECOLOGIES,openTile,dressWorld} from '../src/worldAuthorship.js';
import {worldMemory,updateWorldExploration,discoverStone,travelAvailability,travelByStone,regionalHarvest,rememberHarvest,investigateSecret,soundWorldRelic} from '../src/worldExploration.js';
import {ITEMS,TILE} from '../src/data.js';
const start=performance.now(),w=createWorld(),p=createPlayer('World test'),game={world:w,player:p,camera:{x:0,y:0},log:()=>{}};
assert.equal(w.authoredLocations.length,36);assert.equal(w.navStones.length,9);assert.equal(w.landscapes.length,8);
const count=w.objects.length;dressWorld(w);assert.equal(w.objects.length,count,'idempotent dressing');
for(const s of w.navStones)assert(openTile(w,s.x/TILE,s.y/TILE),s.id);
for(const eco of Object.values(ECOLOGIES))for(const id of [...eco.forage,...eco.mineral])assert(ITEMS[id],`missing resource ${id}`);
const [a,b]=w.navStones;Object.assign(p,{x:a.x,y:a.y});
assert(!travelAvailability(game,b.id).ok,'locked destination');discoverStone(game,a);assert(!discoverStone(game,b),'discovery requires physical approach');Object.assign(p,{x:b.x,y:b.y});discoverStone(game,b);Object.assign(p,{x:a.x,y:a.y});
const enemies=w.enemies;w.enemies=[];assert(!travelAvailability(game,b.id).ok,'no rations');addItem(p,'fieldRations',3);
assert(travelAvailability(game,b.id).ok);p.combatState={attacking:true};assert(!travelAvailability(game,b.id).ok);p.combatState.attacking=false;
w.enemies=[{x:b.x,y:b.y,hp:10}];assert(!travelAvailability(game,b.id).ok,'destination danger');w.enemies=[];
assert(travelByStone(game,b.id));assert.equal(p.x,b.x);assert.equal(countItem(p,'fieldRations'),2);assert.equal(worldMemory(p).elapsed,120);
const ore=w.objects.find(o=>o.kind==='ore');rememberHarvest(game,ore);updateWorldExploration(game,.5);assert(ore.depleted);
const save=createSaveState(game),restored=normalizeProfileSave(JSON.parse(JSON.stringify(save.player)));assert(restored.worldMemory.stones[b.id]);assert(Object.keys(restored.worldMemory.harvests).length);assert.equal(save.worldObjects,null);
const at=regionalHarvest(w,ore,'mining',()=>0);assert(at.length===1&&ITEMS[at[0].id]);assert.deepEqual(regionalHarvest(w,ore,'mining',()=>.99),[]);
w.enemies=enemies;
const returnState=createOverworldReturnState(game,a);assert(returnState?.objects.length);
game.world=restoreOverworldFromState(returnState);updateWorldExploration(game,.5);assert.equal(game.world.navStones.length,9);assert.equal(game.world.authoredLocations.length,36);
const stable=createWorld();assert.deepEqual(stable.navStones.map(s=>[s.id,s.x,s.y]),w.navStones.map(s=>[s.id,s.x,s.y]),'stable geography');
const baseline=createOverworldMap();
for(const o of baseline.objects.filter(o=>/Entrance|Gate|Exit|npc|Service|Investigation|Quest|shrine/.test(o.kind||'')||o.questId||o.poiId)){
 const current=w.objects.find(c=>c.id===o.id);assert(current,`existing content lost: ${o.id}`);
 for(const key of ['kind','npcId','questId','poiId','majorPoiId'])assert.equal(current[key],o[key],`content contract changed: ${o.id}/${key}`);
 assert(openTile(w,current.x/TILE,current.y/TILE),`new terrain blocked ${o.id}`);
}
// Flood the real collision grid to ensure all Nav Stones are reachable from spawn.
const visited=new Uint8Array(w.width*w.height),queue=[Math.floor(w.spawn.y/TILE)*w.width+Math.floor(w.spawn.x/TILE)];visited[queue[0]]=1;
for(let index=0;index<queue.length;index++){const n=queue[index],x=n%w.width,y=Math.floor(n/w.width);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*w.width+nx;if(nx<0||ny<0||nx>=w.width||ny>=w.height||visited[j]||!openTile(w,nx,ny))continue;visited[j]=1;queue.push(j);}}
for(const s of w.navStones)assert(visited[Math.floor(s.y/TILE)*w.width+Math.floor(s.x/TILE)],`unreachable ${s.name}`);
for(const s of w.landscapes){assert(s.approach.length>1,`${s.id} needs a route`);assert(visited[Math.floor(s.y/TILE)*w.width+Math.floor(s.x/TILE)],`unreachable ${s.name}`);}
for(const o of w.objects.filter(o=>o.kind==='worldRelic'||o.id.startsWith('landmark-secret-')))assert(visited[Math.floor(o.y/TILE)*w.width+Math.floor(o.x/TILE)],`unreachable ${o.id}`);
game.world=w;const offering=w.objects.find(o=>o.id==='landmark-secret-bellwater'),beforeQuartz=countItem(p,'lumenQuartz');assert(offering);investigateSecret(game,offering);assert.equal(countItem(p,'lumenQuartz'),beforeQuartz);
for(const relic of w.objects.filter(o=>o.kind==='worldRelic'))soundWorldRelic(game,relic);
investigateSecret(game,offering);investigateSecret(game,offering);assert.equal(countItem(p,'lumenQuartz'),beforeQuartz+3,'bell puzzle pays once');
for(const theme of ['grave','mine','thorn','ruin','demon','holy','cosmic']){
 const d=createDungeonWorld({theme,dungeonId:'verify-'+theme,seed:'verify-world-'+theme});
 assert(d.rooms.every(r=>r.historicalPurpose));assert(d.objects.filter(o=>o.kind==='worldDressing').length>=d.rooms.length*3);
 const secret=d.objects.find(o=>o.kind==='worldSecret');assert(secret);game.world=d;const before=countItem(p,'arcaneDust');investigateSecret(game,secret);investigateSecret(game,secret);assert.equal(countItem(p,'arcaneDust'),before+2);
 const ids=d.objects.map(o=>o.id);assert.equal(new Set(ids).size,ids.length,'unique dungeon IDs');
 d.dungeonState.floorStates ||= {};d.dungeonState.floorStates[d.floor]={objects:d.objects,enemies:d.enemies,drops:d.drops};
 const resumed=createDungeonWorld({theme,dungeonId:'verify-'+theme,seed:'verify-world-'+theme,dungeonState:d.dungeonState});
 assert(resumed.rooms.every(r=>r.historicalPurpose),'resumed floor retains purpose');assert.equal(resumed.objects.length,d.objects.length,'resumed floor does not duplicate dressing');
}
for(const region of ['aureateMarches','ascensionWastes']){const r=createRegionWorld(region);assert.equal(r.navStones.length,2);assert.equal(r.authoredLocations.length,5);}
assert.equal(createCapitalHubWorld().authoredLocations.length,3);
assert(createTowerFloorWorld(1,p).objects.some(o=>o.kind==='worldDressing'));
console.log(JSON.stringify({result:'PASS',frontierObjects:count,frontierScenes:w.authoredLocations.length,stones:w.navStones.length,elapsedMs:Math.round(performance.now()-start)},null,2));
