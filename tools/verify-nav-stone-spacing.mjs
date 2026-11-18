import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {createSaveState,migrateSaveState} from '../src/gameSave.js';
import {SERAPH_DOMAINS} from '../src/act2CampaignData.js';
import {spaceNavStoneNetwork,MIN_NAV_STONE_SPACING} from '../src/navStoneNetwork.js';

const world=createWorld({skipPublishedOverride:true}),stones=world.navStones;
const campaignIds=new Set(['nav-hearthmereFrontier-ashenOrchard','nav-hearthmereFrontier-demonCultLair','nav-hearthmereFrontier-castleVeyr',
 ...Object.keys(SERAPH_DOMAINS).map(id=>`continent-${id}-nav`)]);
const regional=stones.filter(stone=>!campaignIds.has(stone.id));
assert.equal(regional.length,9);
for(const id of campaignIds)assert(stones.some(stone=>stone.id===id),id);
assert(stones.some(s=>s.name==='Saint Orvane Waystone'));
assert(!stones.some(s=>s.roadId));
const destinations=stones.map(stone=>{
 const nearest=Math.min(...stones.filter(other=>other!==stone).map(other=>Math.hypot(stone.x-other.x,stone.y-other.y)));
 return {name:stone.name,nearestGapTiles:Math.round(nearest/32)};
});
for(const a of regional)for(const b of regional)if(a!==b)assert(Math.hypot(a.x-b.x,a.y-b.y)>=MIN_NAV_STONE_SPACING);
const npc={id:'spacing-test-npc',kind:'npc',x:stones[0].x,y:stones[0].y};
const candidates=[npc,...stones,{id:'crowded-stone',kind:'navStone',x:stones[0].x+100,y:stones[0].y}];
spaceNavStoneNetwork(candidates);assert(candidates.includes(npc));assert.equal(candidates.length,stones.length+1);
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
