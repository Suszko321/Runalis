import assert from 'node:assert/strict';
import {ACT2_TERRACES,CONTINENT_ROADS,continentRoadAt} from '../src/continentDefinition.js';
import {captureContinentalState} from '../src/continentPersistence.js';
import {createContinentalWorld} from '../src/continentWorld.js';
import {buildPopulationAreas} from '../src/encounterPopulation.js';
import {claimWorldCache} from '../src/gameInteraction.js';
import {createPlayer} from '../src/player.js';
import {ITEMS,TILE} from '../src/data.js';
import {isActorPositionPassable,moveActorWithCollision} from '../src/world.js';

const player=createPlayer('Act II overworld verifier');
const world=createContinentalWorld({player});
const runtime=world.continentRuntime;
const point=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
const passable=({x,y},radius=12)=>isActorPositionPassable(world,x,y,radius);
const residents=runtime.allEnemies.filter(e=>e.id.startsWith('act2-overworld-'));

assert.equal(residents.length,75);
assert.equal(new Set(residents.map(e=>e.id)).size,residents.length);
assert.deepEqual([...new Set(residents.flatMap(e=>e.eliteModifiers))].sort(),['artillery','bulwark','regenerator','vortex']);
assert.ok(residents.every(e=>passable(e,e.radius)&&e.level>=18&&e.level<=42&&e.homeGuard));
assert.ok(residents.filter(e=>continentRoadAt(e.x/TILE,e.y/TILE,e.aggroRange/TILE)).length>=45);
for(const id of ['continent-saint-orvane','continent-zarynth-trade-ward']){
 const refuge=world.authoredLocations.find(site=>site.id===id);
 assert.ok(residents.every(e=>Math.hypot(e.x-refuge.x,e.y-refuge.y)>refuge.discoveryRadius+e.aggroRange),id);
}
console.log('PASS 75 authored residents, road pressure, elite roles and protected service courts');

const populationAreas=buildPopulationAreas(world);
for(const terrace of ACT2_TERRACES){
 const {id,x,y,w,h,north,south}=terrace;
 for(const [[left,right],edge,step] of [[north,y,1],[south,y+h-1,-1]]){
  const stairX=Math.floor((left+right)/2);
  const walker=point(stairX,edge-step*2);
  const target=point(stairX,edge+step*2);
  assert.ok(passable(walker),`${id} has a dry stair approach`);
  assert.ok(moveActorWithCollision(walker,world,0,target.y-walker.y,12));
 assert.ok(Math.abs(walker.y-target.y)<.01,`${id} stair is fully traversable`);
  assert.equal(walker.walkLevel,2);
  const wallX=left>x+2?left-2:right+2;
  const face=point(wallX,edge);
  assert.equal(passable(face),false,`${id} face blocks direct ascent`);
  assert.equal(world.tiles[edge][stairX].connector,id);
 }
 assert.equal(passable(point(x,y+Math.floor(h/2))),false,`${id} west retaining edge`);
 const site=world.authoredLocations.find(location=>location.id===`continent-${id}`);
 const cache=runtime.findObject(`${site.id}-cache`);
 assert.ok(site.authoredGarrison&&!populationAreas.some(area=>area.id===`site-population-${site.id}`));
 assert.ok(passable(cache)&&cache.rewards.every(([item])=>ITEMS[item]),`${id} cache is accessible with valid rewards`);
 assert.equal(world.tiles[Math.floor(site.y/TILE)][Math.floor(site.x/TILE)].elevation,2);
}
for(const road of CONTINENT_ROADS.filter(r=>['continental-pilgrim-road','imperial-highway','zarynth-outskirts'].includes(r.id)||r.id.startsWith('act2-road-'))){
 for(let i=1;i<road.points.length;i++){
  const [ax,ay]=road.points[i-1], [bx,by]=road.points[i];
  const steps=Math.ceil(Math.hypot(bx-ax,by-ay)*2);
  for(let k=0;k<=steps;k++){
   const x=ax+(bx-ax)*k/steps,y=ay+(by-ay)*k/steps;
   assert.ok(passable(point(x,y)),`${road.id} blocked at ${x}, ${y}`);
  }
 }
}
console.log('PASS both stair approaches on six terraces, blocked faces and continuous campaign roads');

const cache=runtime.findObject('continent-blueglass-overlook-cache');
const guards=residents.filter(e=>e.id.startsWith('act2-overworld-blueglass-headworks-'));
Object.assign(player,{x:cache.x,y:cache.y});
runtime.activate([player],player,true);
assert.ok(guards.every(e=>world.enemies.includes(e)));
const game={player,world,log(){}};
assert.equal(claimWorldCache(game,cache),false);
for(const guard of guards)Object.assign(guard,{hp:0,dead:true,deathHandled:true});
assert.equal(claimWorldCache(game,cache),true);
assert.equal(claimWorldCache(game,cache),false);
captureContinentalState(game);
const restored=createContinentalWorld({player});
restored.continentRuntime.update({world:restored,player});
assert.ok(guards.every(guard=>restored.continentRuntime.findObject(guard.id).dead));
assert.equal(claimWorldCache({player,world:restored,log(){}},restored.continentRuntime.findObject(cache.id)),false);
console.log('PASS guard streaming, guarded cache claim and persisted defeats and rewards');
