import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {createTowerFloorWorld,updateTowerState,enterTower} from '../src/towerSystem.js';
import {createDungeonWorld,transitionDungeonFloor} from '../src/dungeonSystem.js';
import {interact,nearestObject} from '../src/gameInteraction.js';
const player=createPlayer('Floor regression');let logs=0;
const game={player,log:()=>logs++,camera:{x:0,y:0},canvas:{width:960,height:600}};
let treasureFloors=0,ordinaryFloors=0;
for(let floor=1;floor<=40;floor++){
 game.world=createTowerFloorWorld(floor,player);const stairs=game.world.objects.find(o=>o.kind==='towerStairs');
 if(game.world.floorType==='treasure'){
  treasureFloors++;assert(!stairs.locked,'Treasure floor must start unlocked');
  // Simulate a save produced before this fix.
  stairs.locked=true;const before=logs;updateTowerState(game);assert(!stairs.locked);assert.equal(logs,before,'Loaded clears must not repeat rewards');
 }else{
  assert(stairs.locked);updateTowerState(game);assert(stairs.locked,'Living enemies must keep stairs sealed');
  game.world.enemies.forEach(e=>{e.alive=false;});updateTowerState(game);assert(!stairs.locked,'Inactive enemies must not block clear');
  const before=logs;updateTowerState(game);assert.equal(logs,before);
 }
}
assert(treasureFloors>0);
game.world=createTowerFloorWorld(1,player);game.world.enemies.forEach(e=>{e.hp=0;});
const stairs=game.world.objects.find(o=>o.kind==='towerStairs');Object.assign(player,{x:stairs.x,y:stairs.y});
assert.equal(nearestObject(game),stairs);interact(game);assert.equal(game.world.floor,2,'Interact after last kill must advance without waiting for update');
for(const theme of ['grave','mine','demon','ruin','thorn','holy','cosmic'])for(let seed=0;seed<3;seed++){
 game.world=createDungeonWorld({theme,seed:`floor-regression-${seed}`});
 while(game.world.floor<game.world.totalFloors){
  const from=game.world.floor,s=game.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='down');assert(s);assert(transitionDungeonFloor(game,s));assert.equal(game.world.floor,from+1);ordinaryFloors++;
 }
 const last=game.world.floor,up=game.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='up');assert(transitionDungeonFloor(game,up));assert.equal(game.world.floor,last-1);
 const down=game.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='down');assert(transitionDungeonFloor(game,down));assert.equal(game.world.floor,last);
}
console.log(`PASS: 40 infinite floors (${treasureFloors} treasure floors); stale locks repaired; combat locks respected; immediate stair interaction; ${ordinaryFloors} ordinary dungeon transitions and return visits across seven themes.`);
