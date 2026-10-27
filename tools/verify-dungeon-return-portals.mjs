import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {migrateEchorynPosition} from '../src/echorynLayout.js';
import {enterDungeon,exitDungeon,transitionDungeonFloor,sanitizeDungeonSaveState,restoreDungeonFromSaveState} from '../src/dungeonSystem.js';
import {syncDungeonCompletion} from '../src/dungeonCompletion.js';
import {updateEnemies} from '../src/combat.js';
import {nearestObject} from '../src/gameInteraction.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const surface=createWorld();let runs=0;
for(const theme of ['grave','mine','demon','ruin','thorn','holy','cosmic']){
 const player=createPlayer('Return portal regression');Object.assign(player,surface.spawn);migrateEchorynPosition(surface,player);
 const game={world:surface,player,camera:{x:0,y:0},canvas:{width:960,height:600},log:()=>{},shake:()=>{}};
 const entrance={id:`return-test-${theme}`,name:`${theme} dungeon`,theme,x:surface.navStones[0].x,y:surface.navStones[0].y};
 assert(enterDungeon(game,entrance));const returnPoint={...game.overworldState.returnPoint};
 assert(!game.world.objects.some(o=>o.returnPortal));
 assert(!exitDungeon(game,{locked:false}),'An unlocked or stale object must not bypass boss completion');
 game.world.enemies.push({id:'floor-guardian',isBoss:true,hp:0,maxHp:10,x:player.x,y:player.y,kind:'hollowling',alive:false});
 updateEnemies(0,player,game.world,game.log,0,game);
 assert(!game.world.dungeonState.cleared,'An earlier floor boss must not finish the dungeon');
 while(game.world.floor<game.world.totalFloors)assert(transitionDungeonFloor(game,game.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='down')));
 const world=game.world,boss=world.enemies.find(e=>e.isDungeonMainBoss);assert(boss);
 const decoy={id:'extra-boss',isBoss:true,hp:0,maxHp:10,x:player.x,y:player.y,kind:'hollowling',alive:false};
 world.enemies.push(decoy,{...decoy,id:'mini-boss',miniBoss:true,miniBossId:'test-guardian'});
 updateEnemies(0,player,world,game.log,0,game);
 assert(!world.dungeonState.cleared);assert(world.objects.filter(o=>o.kind==='dungeonExit').every(o=>o.locked));
 // Repair a legacy false clear while the actual final boss is still alive.
 world.dungeonState.cleared=true;world.dungeonState.finalBossDefeated=true;
 world.objects.find(o=>o.kind==='dungeonExit').locked=false;syncDungeonCompletion(world);
 assert(!world.dungeonState.cleared);
 boss.hp=0;updateEnemies(0,player,world,game.log,0,game);
 assert(world.dungeonState.cleared&&world.dungeonState.finalBossDefeated);
 const portal=world.objects.find(o=>o.returnPortal);assert(portal&&!portal.locked);
 assert(Math.hypot(portal.x-world.bossRoomCenter.x,portal.y-world.bossRoomCenter.y)<160,'Portal must open beside the final encounter');
 assert(isActorPositionPassable(world,portal.x,portal.y,12),'Portal must be reachable');
 assert(world.enemies.some(e=>!e.isBoss&&!e.miniBoss&&e.hp>0),'Ordinary surviving enemies must not prevent return');
 updateEnemies(0,player,world,game.log,0,game);assert.equal(world.objects.filter(o=>o.returnPortal).length,1);
 const saved=sanitizeDungeonSaveState(world);saved.objects=saved.objects.filter(o=>!o.returnPortal);
 const restored=restoreDungeonFromSaveState(saved);assert.equal(restored.objects.filter(o=>o.returnPortal).length,1,'Cleared saves must reconstruct one portal');
 game.world=restored;
 if(runs===0){
  const save=createSaveState(game),loaded={...game,world:surface,player:createPlayer('Load regression')};
  assert(applySaveToGame(loaded,save));assert(loaded.world.objects.some(o=>o.returnPortal));
  assert.deepEqual(loaded.overworldState.returnPoint,returnPoint);
 }
 const exit=restored.objects.find(o=>o.returnPortal);Object.assign(player,{x:exit.x,y:exit.y});
 assert.equal(nearestObject(game),exit);assert(exitDungeon(game,exit));
 assert.equal(game.world.mode,'overworld');
 assert(Math.hypot(player.x-returnPoint.x,player.y-returnPoint.y)<64,'Return must be at the entrance used, not a default spawn');
 assert.equal(game.overworldState,null);runs++;
}
console.log(`PASS: ${runs} dungeon themes; only the final boss opens one reachable portal; miniboss/floor/extra bosses cannot unlock it; surviving mobs allowed; portal and entrance survive saves; return is at the used entrance.`);
