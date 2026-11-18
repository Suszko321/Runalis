import assert from 'node:assert/strict';
import {TILE} from '../src/data.js';
import {EASTERN_WAYSTATIONS} from '../src/easternWaystations.js';
import {createContinentalWorld} from '../src/continentWorld.js';
import {createPlayer,addItem} from '../src/player.js';
import {discoverStone,travelByStone} from '../src/worldExploration.js';
import {isActorPositionPassable} from '../src/world.js';
import {updateOverworldEncounters} from '../src/overworldEncounterSystem.js';
import {continentalMemory} from '../src/continentPersistence.js';
import {createSaveState,migrateSaveState} from '../src/gameSave.js';

const player=createPlayer('Waystation survey'),world=createContinentalWorld({player});
const game={world,player,camera:{x:0,y:0},logLines:[]};
addItem(player,'fieldRations',10);
const runtime=world.continentRuntime;
for(const {id,trail} of EASTERN_WAYSTATIONS){
 const prefix='continent-'+id,stone=runtime.findObject(prefix+'-nav');
 for(const suffix of ['resident-0','resident-1','stores','hearth','nav','sign']){
  const o=runtime.findObject(prefix+'-'+suffix);
  assert.ok(o&&isActorPositionPassable(world,o.x,o.y,12),prefix+'-'+suffix);
 }
 for(let i=1;i<trail.length;i++){
  const [ax,ay]=trail[i-1],[bx,by]=trail[i],steps=Math.ceil(Math.hypot(bx-ax,by-ay)*2);
  for(let j=0;j<=steps;j++){
   const tx=ax+(bx-ax)*j/steps,ty=ay+(by-ay)*j/steps;
   assert.ok(isActorPositionPassable(world,(tx+.5)*TILE,(ty+.5)*TILE,12),id+' track at '+tx+','+ty);
  }
 }
 Object.assign(player,{x:stone.x,y:stone.y});
 runtime.activate([player],player,true);
 assert.ok(discoverStone(game,stone));
}
for(const {id} of EASTERN_WAYSTATIONS)assert.ok(travelByStone(game,'continent-'+id+'-nav'),id);
console.log('PASS all five signed tracks, staffed sites, attunements and playable Nav Stone journeys');

function sample(seed){
 const p=createPlayer('Off-road survey'),w=createContinentalWorld({player:p}),g={player:p,world:w,camera:{x:0,y:0},logLines:[]};
 const mem=continentalMemory(p);mem.easternPopulationSeed=seed;p.worldMemory.elapsed=100;
 Object.assign(p,{x:1820*TILE,y:110*TILE});
 w.continentRuntime.activate([p],p,true);
 for(let i=0;i<15;i++)updateOverworldEncounters(g,1.3);
 const cast=Object.values(mem.generated).filter(e=>e.dynamicEncounterId?.startsWith('ow-wilds-'));
 assert.ok(cast.length>0);
 for(const e of cast){
  assert.ok(isActorPositionPassable(w,e.x,e.y,e.radius||12),e.id);
  assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>512);
 }
 return {g,mem,cast,signature:cast.map(e=>[e.id,e.name,e.x,e.y])};
}
const first=sample(127),other=sample(900);
assert.notDeepEqual(first.signature,other.signature);
assert.deepEqual(first.signature,sample(127).signature);
const witness=first.cast.find(e=>e.entityType==='enemy');
assert.ok(witness);
assert.ok(first.cast.some(e=>e.entityType==='object'&&['Slate Bearer','Glass Picker'].includes(e.name)));
const restored=migrateSaveState(createSaveState(first.g));
assert.equal(restored.player.worldMemory.continent.easternPopulationSeed,127);
assert.equal(restored.player.worldMemory.continent.generated[witness.id].name,witness.name);
assert.deepEqual(restored.player.worldMemory.continent.events,first.mem.events);
console.log('PASS seeded wilderness traffic varies between worlds and survives save migration');

// Revisit after the temporary group has retired and the area's cooldown has elapsed.
const old=witness.dynamicEncounterId,areaId=witness.populationAreaId;
const g={player:restored.player,world:restored.worldRuntime,camera:{x:0,y:0},logLines:[]};
const restoredMemory=continentalMemory(g.player);
Object.assign(g.player,{x:24*TILE,y:32*TILE});
g.player.worldMemory.elapsed+=1800;
g.world.continentRuntime.update(g,2);
Object.assign(g.player,{x:1820*TILE,y:110*TILE});
g.world.continentRuntime.activate([g.player],g.player,true);
for(let i=0;i<12;i++)updateOverworldEncounters(g,1.3);
g.player.worldMemory.elapsed+=1200;
for(let i=0;i<14;i++)updateOverworldEncounters(g,1.3);
assert.ok(restoredMemory.events[areaId].cycle>0);
assert.notEqual(restoredMemory.events[areaId].encounterId,old);
assert.equal(restoredMemory.easternPopulationSeed,127);
console.log('PASS a later visit rolls a fresh encounter cycle');
