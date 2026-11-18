import assert from 'node:assert/strict';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {ACT1_LANDMARKS} from '../src/overworldUtils.js';
import {navSanctuaryAt,protectNavSanctuary} from '../src/navStoneSanctuary.js';
import {populationPositionSafe} from '../src/encounterPopulation.js';
import {travelAvailability,travelByStone} from '../src/worldExploration.js';
import {continentalMemory,restoreContinentalState} from '../src/continentPersistence.js';

const w=createWorld({skipPublishedOverride:true}),p=createPlayer('Keep sanctuary regression');
const s=w.navStones.find(s=>s.id==='nav-hearthmereFrontier-demonCultLair');
assert.ok(s);
assert.equal(s.y,(ACT1_LANDMARKS.demonCultLair[1]-21+.5)*32);
assert.equal(s.navSafeRadius,800);
for(const [dx,dy] of [[0,0],[32,0],[-32,0],[0,32],[0,-32]])assert.ok(isActorPositionPassable(w,s.x+dx,s.y+dy,14),'landing footprint');
assert.ok(!w.continentRuntime.allEnemies.some(e=>e.hp>0&&!e.dead&&navSanctuaryAt(w,e.x,e.y)===s),'authored enemies excluded');
for(let radius=0;radius<960;radius+=80)for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
 assert.equal(populationPositionSafe(w,[],s.x+Math.cos(angle)*radius,s.y+Math.sin(angle)*radius),false,'spawn and respawn excluded');
}

const source=w.navStones.find(stone=>stone.id==='nav-hearthmereFrontier-outpost');
Object.assign(p,{x:source.x,y:source.y});
p.worldMemory={stones:{[source.id]:{name:source.name,x:source.x,y:source.y},[s.id]:{name:s.name,x:s.x,y:s.y+192}},elapsed:100};
addItem(p,'fieldRations',2);
w.continentRuntime.activate([p],p,true);
const game={player:p,world:w,loading:false,transitioning:false};
assert.ok(travelAvailability(game,s.id).ok,'previous attunement resolves live destination');

const injected={id:'keep-sanctuary-injected',kind:'ashWolf',x:s.x,y:s.y,homeX:s.x,homeY:s.y,hp:31,maxHp:70,xp:25,aggro:3,combatTargetId:'player',deathHandled:false};
w.continentRuntime.register(injected,'enemies');
assert.ok(!navSanctuaryAt(w,injected.x,injected.y),'newly registered enemy relocated');
assert.equal(injected.hp,31);
assert.equal(injected.xp,25);
const memory=continentalMemory(p);
memory.entities[injected.id]={kind:'enemy',x:s.x+40,y:s.y,homeX:s.x,homeY:s.y,hp:23,maxHp:70,dead:false,remove:false};
restoreContinentalState(game);
assert.ok(!navSanctuaryAt(w,injected.x,injected.y),'legacy saved position relocated');
assert.equal(injected.hp,23);
assert.equal(injected.dead,false);
assert.ok(travelAvailability(game,s.id).ok,'remote preview remains usable after old enemy restore');

Object.assign(injected,{x:s.x+60,y:s.y+10,aggro:2,combatTargetId:'player'});
w.enemies.push(injected);
w.continentRuntime.update(game,0);
assert.ok(!navSanctuaryAt(w,injected.x,injected.y),'incoming enemy is removed from landing bay');

const home={x:injected.homeX,y:injected.homeY};
assert.ok(!navSanctuaryAt(w,home.x,home.y,128));
assert.equal(protectNavSanctuary(w,injected),false,'repeat protection is stable');
const allies=Array.from({length:3},(_,index)=>Object.assign(createPlayer('Traveller '+index),{x:source.x,y:source.y,active:true,joined:true}));
p.coop={players:allies};
assert.ok(travelByStone(game,s.id),'actual party teleport succeeds');
assert.equal(countItem(p,'fieldRations'),1);
assert.equal(p.x,s.x);assert.equal(p.y,s.y);
for(const member of [p,...allies])assert.ok(isActorPositionPassable(w,member.x,member.y,14),'four-player landing passable');
console.log('PASS Keep stone northward position, passable landing, authored and new enemies, spawn/respawn exclusion, restored saves, incoming enemies and remote travel.');
