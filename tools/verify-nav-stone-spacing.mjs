import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {createSaveState,migrateSaveState} from '../src/gameSave.js';
import {spaceNavStoneNetwork,MIN_NAV_STONE_SPACING} from '../src/navStoneNetwork.js';

const world=createWorld({skipPublishedOverride:true}),stones=world.navStones;
assert.equal(stones.length,9);
assert(stones.some(s=>s.name==='Saint Orvane Waystone'));
assert(!stones.some(s=>s.roadId));
const destinations=stones.map(stone=>{
 const nearest=Math.min(...stones.filter(other=>other!==stone).map(other=>Math.hypot(stone.x-other.x,stone.y-other.y)));
 return {name:stone.name,nearestGapTiles:Math.round(nearest/32)};
});
for(const a of stones)for(const b of stones)if(a!==b)assert(Math.hypot(a.x-b.x,a.y-b.y)>=MIN_NAV_STONE_SPACING);
const npc={id:'spacing-test-npc',kind:'npc',x:stones[0].x,y:stones[0].y};
const candidates=[npc,...stones,{id:'crowded-stone',kind:'navStone',x:stones[0].x+100,y:stones[0].y}];
spaceNavStoneNetwork(candidates);assert(candidates.includes(npc));assert.equal(candidates.length,10);
const before=candidates.map(o=>o.id);spaceNavStoneNetwork(candidates);assert.deepEqual(candidates.map(o=>o.id),before);
const player=createPlayer('Spacing test');player.x=stones[0].x;player.y=stones[0].y;
player.worldMemory={stones:Object.fromEntries(stones.map(s=>[s.id,{name:s.name,x:s.x,y:s.y}])),locations:{'map:orrakai':{name:'Orrakai'}}};
player.worldMemory.stones['nav-road-retired-90']={name:'Retired road stone',x:5000,y:5000};
const restored=migrateSaveState(createSaveState({world,player,camera:{x:0,y:0},logLines:[]}));
assert.deepEqual(restored.worldRuntime.navStones.map(s=>s.id),stones.map(s=>s.id));
for(const stone of stones)assert(restored.player.worldMemory.stones[stone.id]);
assert(restored.player.worldMemory.locations['map:orrakai']);
assert(!restored.worldRuntime.continentRuntime.allObjects.some(s=>s.id==='nav-road-retired-90'));
console.log(JSON.stringify({pass:true,total:stones.length,destinations,checks:['minimum spacing','major town destination','no roadside filler','stable retained IDs','nearby candidate removed','other objects preserved','idempotent rebuild','save reload keeps attunements and location discoveries','retired stones stay out of streaming']},null,2));
