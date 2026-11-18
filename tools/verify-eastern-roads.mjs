import assert from 'node:assert/strict';
import {TILE,ITEMS} from '../src/data.js';
import {createPlayer,countItem} from '../src/player.js';
import {createContinentalWorld} from '../src/continentWorld.js';
import {captureContinentalState} from '../src/continentPersistence.js';
import {isActorPositionPassable} from '../src/world.js';
import {updatePopulationPatrol} from '../src/encounterPopulation.js';
import {navSanctuaryAt} from '../src/navStoneSanctuary.js';
import {applyBossDefeatRewards} from '../src/bossSystem.js';

const player=createPlayer('Road survey');
const world=createContinentalWorld({player}), runtime=world.continentRuntime;
const residents=runtime.allEnemies.filter(e=>e.id.startsWith('eastern-'));
const bosses=residents.filter(e=>e.worldBoss), workers=runtime.allObjects.filter(o=>o.npcId?.endsWith('-worker'));
assert.equal(bosses.length,4);
assert.equal(residents.filter(e=>e.namedExteriorElite).length,10);
assert.equal(residents.length,34);
assert.equal(workers.length,6);
for(const worker of workers){
 const supply=runtime.findObject(worker.id.replace(/-worker$/,'-supply'));
 assert.ok(worker.ambientWander&&worker.talk&&ITEMS[supply.itemId]);
 assert.ok(isActorPositionPassable(world,worker.x,worker.y,12));
 assert.ok(isActorPositionPassable(world,supply.x,supply.y,12));
}
for(const e of residents){
 assert.ok(isActorPositionPassable(world,e.x,e.y,e.radius),e.id);
 assert.ok(!navSanctuaryAt(world,e.x,e.y,e.aggroRange),e.id);
}
for(const boss of bosses){
 Object.assign(player,{x:boss.x-24*TILE,y:boss.y});
 runtime.activate([player],player,true);
 assert.ok(world.enemies.includes(boss));
 const notice=runtime.findObject('eastern-trail-'+boss.bossId+'-sign');
 assert.ok(isActorPositionPassable(world,notice.x,notice.y,12));
 const route=boss.patrolRoute,visited=new Set();
 for(let tick=0;tick<6000&&visited.size<route.length;tick++){
  const index=boss.patrolIndex;
  assert.ok(updatePopulationPatrol(boss,world,player,1/30));
  assert.ok(!navSanctuaryAt(world,boss.x,boss.y,boss.aggroRange));
  assert.ok(Math.hypot(boss.x-notice.x,boss.y-notice.y)>boss.aggroRange+64);
  if(index!==boss.patrolIndex){
   assert.ok(Math.hypot(boss.x-route[index].x,boss.y-route[index].y)<16,boss.name);
   visited.add(index);
  }
 }
 assert.equal(visited.size,route.length,boss.name);
 player.coop={players:[{hp:100,x:boss.x+32,y:boss.y}]};
 assert.equal(updatePopulationPatrol(boss,world,player,1/30),false);
 player.coop.players=[];
 applyBossDefeatRewards(boss,player,world);
 applyBossDefeatRewards(boss,player,world);
 assert.equal(player.bossKills[boss.bossId],1);
 assert.equal(countItem(player,boss.firstKillTrophy),1);
 assert.ok(!player.completedDungeons?.[world.name]);
 Object.assign(boss,{hp:0,dead:true,deathHandled:true});
}
captureContinentalState({player,world});
const restored=createContinentalWorld({player});
for(const boss of bosses)assert.ok(restored.continentRuntime.findObject(boss.id).dead);
console.log('PASS six workplaces, ten named packs, four complete patrol circuits, party proximity, first-kill credit and persisted defeats');
