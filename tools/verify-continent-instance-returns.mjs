import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {TILE} from '../src/data.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {enterSideZone,exitSideZone,updateSideZoneState} from '../src/sideZoneSystem.js';
import {enterTower,exitTower} from '../src/towerSystem.js';
import {createSaveState,applySaveToGame,slimOverworldState} from '../src/gameSave.js';
import {CONTINENT_VERSION} from '../src/continentDefinition.js';

function gameWithVirtualSurface() {
  const tileView = new Proxy([], {get(target,key) {
    if (key === 'toJSON' || key === 'map' || key === 'forEach' || key === Symbol.iterator || /^\d+$/.test(String(key))) throw new Error('Surface tiles must not be cloned or enumerated for an instance transition');
    if(key === 'length') return 960;
    return Reflect.get(target,key);
  }});
  const player=createPlayer('Instance return regression');Object.assign(player,{x:58*TILE,y:124*TILE,geographyVersion:CONTINENT_VERSION});
  return {player,world:{mode:'overworld',continentId:'runalis',geographyVersion:CONTINENT_VERSION,name:'Runalis',regionId:'hearthmereFrontier',tiles:tileView,width:2880,height:960,objects:[],enemies:[],drops:[],continentRuntime:{chunks:new Map()}},camera:{x:0,y:0},canvas:{width:960,height:600},log:()=>{},shake:()=>{}};
}
const actualSurface=createWorld();
assert.equal(actualSurface.continentId,'runalis','continental factory must be integrated before these checks pass');
const allObjects=actualSurface.continentRuntime.allObjects;
const side=gameWithVirtualSurface(),entrance=allObjects.find(o=>o.kind==='sideZoneEntrance'&&o.sourceRegionId==='hearthmereFrontier');
assert(entrance,'an existing early side-zone entrance must remain');
Object.assign(side.player,{x:entrance.x,y:entrance.y});
assert(enterSideZone(side,entrance));assert.equal(side.world.mode,'sideZone');assert.equal(side.overworldState.entranceId,entrance.id);assert(!side.overworldState.tiles&&!side.overworldState.objects&&!side.overworldState.enemies);
assert.equal(slimOverworldState(side.overworldState).geographyVersion,CONTINENT_VERSION);
for(const enemy of side.world.enemies){enemy.hp=0;enemy.dead=true;}
const chest=side.world.objects.find(o=>o.kind==='dungeonChest'||o.kind==='worldCache');if(chest){chest.claimed=true;chest.depleted=true;}
updateSideZoneState(side);assert(side.world.cleared);
const xpAfterClear=JSON.stringify(side.player.skills.renown);
const sideSave=JSON.parse(JSON.stringify(createSaveState(side)));
assert(sideSave.worldTiles?.length);assert.equal(sideSave.worldCleared,true);assert(sideSave.enemies.every(e=>e.dead||e.hp===0));
assert(applySaveToGame(side,sideSave));assert.equal(side.world.mode,'sideZone');assert.equal(side.world.cleared,true);assert(side.world.enemies.every(e=>e.dead||e.hp===0));
if(chest)assert(side.world.objects.find(o=>o.id===chest.id).claimed,'claimed side-zone chest must survive active expedition reload');
updateSideZoneState(side);assert.equal(JSON.stringify(side.player.skills.renown),xpAfterClear,'a loaded cleared side zone cannot grant renown twice');

const tower=gameWithVirtualSurface(),towerEntrance=allObjects.find(o=>o.kind==='towerEntrance'&&o.sourceRegionId==='hearthmereFrontier');
assert(towerEntrance,'an existing early infinite dungeon must remain');
Object.assign(tower.player,{x:towerEntrance.x,y:towerEntrance.y});
assert(enterTower(tower,1,towerEntrance));assert.equal(tower.overworldState.entranceId,towerEntrance.id);assert(!tower.overworldState.tiles);
const towerReturn=JSON.stringify(tower.overworldState);
assert(enterTower(tower,2,{infiniteDungeonRegionId:'hearthmereFrontier'}));assert.equal(JSON.stringify(tower.overworldState),towerReturn,'new tower floors must retain the actual surface entrance');
const towerSave=JSON.parse(JSON.stringify(createSaveState(tower)));
assert.equal(towerSave.overworldState.entranceId,towerEntrance.id);assert(applySaveToGame(tower,towerSave));assert.equal(tower.world.mode,'tower');assert.equal(tower.world.floor,2);
assert.equal(tower.overworldState.entranceId,towerEntrance.id);

// This final section exercises the coordinated factory rather than virtual stubs.
assert.equal(createWorld().continentId,'runalis','continental factory must be integrated before these checks pass');
const sideExpected={...side.overworldState.returnPoint};assert(exitSideZone(side));assert.equal(side.world.continentId,'runalis');
assert(Math.hypot(side.player.x-sideExpected.x,side.player.y-sideExpected.y)<128,JSON.stringify({actual:{x:side.player.x,y:side.player.y},expected:sideExpected}));assert(isActorPositionPassable(side.world,side.player.x,side.player.y,12));assert.equal(side.player.dirY,1);
const towerExpected={...tower.overworldState.returnPoint};assert(exitTower(tower));assert.equal(tower.world.continentId,'runalis');
assert(Math.hypot(tower.player.x-towerExpected.x,tower.player.y-towerExpected.y)<128);assert(isActorPositionPassable(tower.world,tower.player.x,tower.player.y,12));assert.equal(tower.player.dirY,1);assert.equal(tower.player.infiniteDungeons.hearthmereFrontier.currentFloor,0);
console.log(JSON.stringify({result:'PASS',checks:'virtual tile views never cloned, stable source region and entrance identity, side-zone killed enemies/claimed chest/clear state survive reload, no duplicate clear XP, floor advancement retains entry, tower reload retains floor and return, actor-safe surface arrivals facing south'},null,2));
