import assert from 'node:assert/strict';
import {createMaraHouseWorld} from '../src/act1OpeningSystem.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {interact,nearestObject} from '../src/gameInteraction.js';
import {isTravelInteraction} from '../src/interactionTargets.js';
import {drawWorldInteractionIndicators} from '../src/objectRenderer.js';
import {createPlayer} from '../src/player.js';
import {isActorPositionPassable} from '../src/world.js';

globalThis.document = {
  documentElement:{style:{removeProperty(){}}},
  body:{dataset:{},classList:{toggle(){},contains:() => false}},
  getElementById:() => null,
  querySelector:() => null,
  querySelectorAll:() => []
};

const camera = {x:0,y:0};
const calls = [];
const ctx = new Proxy({}, {
  get: (state,key) => state[key] ?? ((...args) => calls.push([key,...args]))
});
function paint(world,...actors) {
  calls.length = 0;
  drawWorldInteractionIndicators(ctx,world,camera,actors);
  return calls.filter(([key]) => key === 'translate').map(([,x,y]) => [x,y]);
}
const fixture = world => ({world,player:createPlayer('Explorer'),camera:{...camera},canvas:{width:960,height:600},log(){}});
const marker = (target, offset = 20) => [Math.round(target.x),Math.round(target.y-offset)];

const gate = {kind:'dungeonEntrance',x:100,y:100,r:10};
const npc = {kind:'npc',x:100,y:100};
const edge = {x:160,y:100};
const inRange = {x:159,y:100};
assert.deepEqual(paint({objects:[gate]},edge),[]);
assert.deepEqual(paint({objects:[gate]},inRange,inRange),[marker(gate)]);
assert.deepEqual(paint({objects:[gate,npc]},{x:100,y:100}),[marker(npc,86)]);
assert.deepEqual(paint({objects:[{...gate,interactable:false}]},inRange),[]);
assert.deepEqual(paint({objects:[{...gate,questVisibility:[['test','stage']]}]},inRange),[]);
const wallWorld = {orrakaiRevision:1,objects:[gate],tiles:Array.from({length:6},() => Array.from({length:6},(_,x) => ({passable:x !== 4,biome:x === 4 ? 'wall' : 'grass'})))};
assert.deepEqual(paint(wallWorld,{x:150,y:100}),[]);

for (const kind of ['dungeonEntrance','dungeonExit','dungeonStairs','sideZoneEntrance','sideZoneExit','towerEntrance','towerStairs','towerExit','capitalGate','capitalExit','arenaGate','travelRouteGate','travelRouteExit','travelRouteReturnGate']) {
  assert(isTravelInteraction({kind}),kind);
}
assert(isTravelInteraction({kind:'dungeonDoor',sideRoomTarget:{x:100,y:100}}));
assert(!isTravelInteraction({kind:'dungeonDoor'}));

const game = fixture(createMaraHouseWorld());
const ally = createPlayer('Second player');
game.player.coop = {players:[ally]};
const view = Object.assign(Object.create(game),{hostGame:game,player:ally});
for (const [id,mode] of [['maraHouseDoor','capital'],['maraHomeEntrance','maraHouse']]) {
  const stairs = game.world.objects.find(o => o.id === id);
  assert(stairs,id);
  const approach = [[0,-24],[0,24],[-24,0],[24,0]].some(([dx,dy]) => {
    Object.assign(ally,{x:stairs.x+dx,y:stairs.y+dy});
    return isActorPositionPassable(game.world,ally.x,ally.y) && nearestObject(view) === stairs;
  });
  assert(approach,`A passable approach must select ${id}`);
  assert.equal(nearestObject(view),stairs);
  assert.deepEqual(paint(game.world,ally),[marker(stairs)]);
  interact(view);
  assert.equal(game.world.mode,mode);
  assert.equal(ally.currentZone,game.world.name);
  assert.equal(Object.hasOwn(view,'world'),false);
}

const dungeon = fixture(createDungeonWorld({theme:'mine',depth:2}));
const stairs = dungeon.world.objects.find(o => o.kind === 'dungeonStairs' && o.direction === 'down');
assert(stairs);
Object.assign(dungeon.player,{x:stairs.x,y:stairs.y});
stairs.locked = true;
assert.deepEqual(paint(dungeon.world,dungeon.player),[marker(stairs)]);
assert(calls.some(([key]) => key === 'strokeRect'),'Sealed stair renders a lock shackle');
interact(dungeon);
assert.equal(dungeon.world.floor,1);
stairs.locked = false;
interact(dungeon);
assert.equal(dungeon.world.floor,2);
console.log('PASS: travel prompt range, visibility, line of sight, NPC competition, both Mara stairs via a party actor, and sealed/open dungeon stairs.');
