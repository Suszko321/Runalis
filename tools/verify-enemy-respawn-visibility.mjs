import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {updateAuthoredPopulation,populationPositionSafe} from '../src/encounterPopulation.js';
import {continentalMemory} from '../src/continentPersistence.js';
import {recordEnemyDeathVisual,recordEnemyHitReaction,sampleEnemyVisualState} from '../src/combatFeedbackProfiles.js';
import {isHumanoidEnemy} from '../src/humanoidEnemies.js';

// Living actors with stale presentation state must remain visible, including
// objects that were already respawned before this fix was loaded.
const stale={kind:'hollowling',hp:82,maxHp:82,alive:true,dead:false,remove:false};
recordEnemyDeathVisual(stale);
stale.visualDeath.startedAt-=10;
assert.equal(sampleEnemyVisualState(stale),null,'stale death animation hides a living enemy');
recordEnemyHitReaction(stale);
assert.equal(sampleEnemyVisualState(stale).kind,'hit','live hit reaction should supersede stale death');
assert.equal(sampleEnemyVisualState(stale).alpha,1);

// Actual corpses still use the original death profile and fade timing.
Object.assign(stale,{hp:0,dead:true});
const death=stale.visualDeath;
assert.equal(sampleEnemyVisualState(stale,death.startedAt).alpha,1);
assert(Math.abs(sampleEnemyVisualState(stale,death.startedAt+death.duration/2).alpha-.5)<1e-9);
assert(sampleEnemyVisualState(stale,death.startedAt+death.duration).alpha<1e-9);

const world=createWorld(),player=createPlayer('Respawn visibility regression');
Object.assign(player,world.spawn);player.worldMemory={elapsed:1000};
const game={world,player},runtime=world.continentRuntime,memory=continentalMemory(player);
// Exercise resident respawning without adding unrelated dynamic packs.
world.populationAreas=[];
const eligible=e=>!e.isBoss&&!e.worldBoss&&!e.miniBoss&&!e.questCritical&&!e.namedExteriorElite&&!e.majorPoiId&&!e.poiId&&!e.bossId&&!e.dynamicEncounter;
const residents=[false,true].map(human=>runtime.allEnemies.find(e=>eligible(e)&&isHumanoidEnemy(e)===human&&populationPositionSafe(world,[player],e.homeX,e.homeY,e.radius||12)));
assert(residents.every(Boolean),'fixture needs both creature and humanoid residents');
const count=runtime.allEnemies.length;
for(const enemy of residents){
 for(let cycle=0;cycle<2;cycle++){
  Object.assign(player,world.spawn);runtime.activate([player],player,true);
  Object.assign(enemy,{hp:0,dead:true,remove:true,alive:false,deathHandled:true});
  recordEnemyHitReaction(enemy);recordEnemyDeathVisual(enemy);
  const previous=enemy.visualDeath;previous.startedAt-=10;
  memory.entities[enemy.id]={kind:'enemy',hp:0,dead:true,remove:true,respawnAt:player.worldMemory.elapsed-1};
  updateAuthoredPopulation(game,1.3,()=>assert.fail('resident respawn must not create a new pack'));
  assert.equal(enemy.hp,enemy.maxHp);assert.equal(enemy.dead,false);assert.equal(enemy.remove,false);assert.equal(enemy.alive,true);
  assert.equal(enemy.visualDeath,undefined,'respawn retained its previous death');
  assert.equal(enemy.visualReaction,undefined,'respawn retained its previous hit');
  assert.equal(sampleEnemyVisualState(enemy),null);
  assert(!memory.entities[enemy.id]?.dead,'respawn remains dead in world memory');
  player.x=enemy.x+96;player.y=enemy.y;runtime.activate([player],player,true);
  assert(world.enemies.includes(enemy),'revived resident is missing after returning to its chunk');
  Object.assign(player,world.spawn);runtime.activate([player],player,true);
  assert(!world.enemies.includes(enemy),'fixture did not unload the resident chunk');
  player.x=enemy.x+96;player.y=enemy.y;runtime.activate([player],player,true);
  assert(world.enemies.includes(enemy));assert.equal(sampleEnemyVisualState(enemy),null);
  // The next death must start a new animation, rather than reuse the expired one.
  Object.assign(enemy,{hp:0,dead:true});recordEnemyDeathVisual(enemy);
  assert.notEqual(enemy.visualDeath,previous);
  assert.equal(sampleEnemyVisualState(enemy,enemy.visualDeath.startedAt).alpha,1);
 }
 console.log(`PASS ${enemy.kind}: two respawns, streaming re-entry and subsequent death animation`);
}
assert.equal(runtime.allEnemies.length,count,'resident count changed');
// Respawn presentation is reset only when the existing respawn rules permit it.
const blocked=residents[0];Object.assign(player,world.spawn);runtime.activate([player],player,true);
Object.assign(blocked,{hp:0,dead:true,remove:true,alive:false});
const retained=blocked.visualDeath;
memory.entities[blocked.id]={kind:'enemy',dead:true,hp:0,respawnAt:1001};
updateAuthoredPopulation(game,1.3,()=>assert.fail('unexpected dynamic pack'));
assert.equal(blocked.hp,0);assert.equal(blocked.visualDeath,retained,'timer should retain corpse animation');
memory.entities[blocked.id].respawnAt=999;player.x=blocked.homeX;player.y=blocked.homeY;
updateAuthoredPopulation(game,1.3,()=>assert.fail('unexpected dynamic pack'));
assert.equal(blocked.hp,0);assert.equal(blocked.visualDeath,retained,'in-view corpse must not respawn');
Object.assign(player,world.spawn);blocked.isBoss=true;
updateAuthoredPopulation(game,1.3,()=>assert.fail('unexpected dynamic pack'));
assert.equal(blocked.hp,0);assert.equal(blocked.visualDeath,retained,'boss must not enter resident respawn');
console.log('PASS respawn timer, in-view protection, boss exclusion and resident count');
console.log('PASS living-state safeguard, hit reactions and original corpse fade timing');
