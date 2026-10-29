import assert from 'node:assert/strict';
import {createDungeonWorld,sanitizeDungeonSaveState,restoreDungeonFromSaveState,exitDungeon} from '../src/dungeonSystem.js';
import {createContinentalWorld} from '../src/continentWorld.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {createDialogueState} from '../src/dialogueSystem.js';
import {updateEnemies} from '../src/combat.js';
import {syncDungeonCompletion} from '../src/dungeonCompletion.js';
import {syncBossReturnPortals,canUseBossReturnPortal,recordBossReturnVictory} from '../src/bossReturnPortals.js';
import {beginMalakarArrival,skipMalakarRitual,chooseMalakarIntroduction,updateMalakarEncounter} from '../src/malakarEncounter.js';
import {isActorPositionPassable} from '../src/world.js';
import {TILE} from '../src/data.js';
const options={dungeonId:'demonCultLair',seed:'last-dawn-portal-regression'};
const portals=w=>w.objects.filter(o=>o.returnPortal||o.kind==='dungeonExit');
const saved=w=>JSON.parse(JSON.stringify(sanitizeDungeonSaveState(w)));
function game(w){const p=createPlayer('Keep exits');chooseClass(p,'oathkeeper');Object.assign(p,w.spawn);return {world:w,player:p,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){},shake(){}};}
function check(name,fn){fn();console.log('PASS',name);}
check('Keep stone is due north, retained, clear of interactions and walkable for four players',()=>{
 const w=createContinentalWorld(),s=w.navStones.find(s=>s.id==='nav-hearthmereFrontier-demonCultLair'),entrance=w.continentRuntime.allObjects.find(o=>o.id==='emberVeilLairEntrance');
 assert(s);assert.equal(s.x,entrance.x);assert.equal(s.y,entrance.y-15*TILE);
 assert(!w.continentRuntime.allObjects.some(o=>o!==s&&Math.hypot(o.x-s.x,o.y-s.y)<100));
 for(const [dx,dy]of [[0,0],[32,0],[0,32],[32,32]])assert(isActorPositionPassable(w,s.x+dx,s.y+dy,12));
});
for(const dungeonId of ['demonCultLair','dawnspireRoot','emberveil'])check(`${dungeonId}: no early floor/miniboss portals; stale saved portals are removed`,()=>{
 const first=createDungeonWorld({...options,dungeonId}),total=first.totalFloors;
 for(let floor=1;floor<total;floor++){
  const w=createDungeonWorld({...options,dungeonId,floor}),g=game(w);assert.equal(portals(w).length,0);
  const mini=w.enemies.find(e=>e.miniBoss);if(mini){mini.hp=0;updateEnemies(0,g.player,w,g.log,0,g);assert.equal(portals(w).length,0);}
  const ghost={id:'old-guard',isBoss:true,miniBoss:true,hp:0,dead:true,x:w.spawn.x,y:w.spawn.y};
  assert.equal(recordBossReturnVictory(w,ghost),false);
  w.dungeonState.bossReturns['old-guard']={floor,ids:[ghost.id],point:{...w.spawn}};
  w.objects.push({id:'old-portal',kind:'dungeonExit',returnPortal:true,bossVictoryPortal:true,returnRecordKey:'old-guard',...w.spawn,locked:false});
  assert(!canUseBossReturnPortal(w,w.objects.at(-1)));syncDungeonCompletion(w);assert.equal(portals(w).length,0);
  const restored=restoreDungeonFromSaveState(saved(w));assert.equal(portals(restored).length,0);
 }
});
check('ritual, active battle and death animation have no exit; victory creates exactly one in the sanctum',()=>{
 const w=createDungeonWorld({...options,floor:4}),g=game(w);beginMalakarArrival(g);assert.equal(portals(w).length,0);skipMalakarRitual(g);chooseMalakarIntroduction(g,'relic');updateMalakarEncounter(g,3.1);
 const boss=w.enemies[0];assert.equal(w.dungeonState.malakar.mode,'active');assert.equal(portals(w).length,0);
 boss.hp=0;updateEnemies(.1,g.player,w,g.log,1,g);assert.equal(w.dungeonState.malakar.mode,'dying');syncDungeonCompletion(w);assert.equal(portals(w).length,0);
 const dying=restoreDungeonFromSaveState(saved(w));assert.equal(dying.dungeonState.malakar.mode,'dying');assert.equal(portals(dying).length,0);
 updateMalakarEncounter(g,4.1);updateEnemies(.1,g.player,w,g.log,5,g);assert(w.dungeonState.cleared);assert.equal(portals(w).length,1);
 const portal=portals(w)[0];assert(canUseBossReturnPortal(w,portal));assert(Math.hypot(portal.x-w.bossRoomCenter.x,portal.y-w.bossRoomCenter.y)<100);assert(isActorPositionPassable(w,portal.x,portal.y,12));
 // Remove all transient evidence of the portal and corpse: the persisted victory
 // must reconstruct the exit, rather than requiring the death callback again.
 const save=saved(w);save.objects=save.objects.filter(o=>o.kind!=='dungeonExit');save.enemies=[];delete save.dungeonState.bossReturns;
 const restored=restoreDungeonFromSaveState(save);syncDungeonCompletion(restored);syncBossReturnPortals(restored);assert.equal(portals(restored).length,1);assert(canUseBossReturnPortal(restored,portals(restored)[0]));
 // Cleared run state is shared across floors; it must not create an approach exit.
 const approach=createDungeonWorld({...options,floor:3,dungeonState:JSON.parse(JSON.stringify(w.dungeonState))});assert.equal(portals(approach).length,0);
 assert(!exitDungeon({...g,world:approach},{locked:false}));
});
check('a stale cleared save cannot turn a living Malakar into a victory',()=>{
 const w=createDungeonWorld({...options,floor:4}),save=saved(w);save.dungeonState.cleared=true;save.dungeonState.finalBossDefeated=true;save.dungeonState.malakar.mode='victory';
 const restored=restoreDungeonFromSaveState(save);assert(!restored.dungeonState.cleared);assert.equal(restored.dungeonState.malakar.mode,'arrival');assert.equal(portals(restored).length,0);
});
