import assert from 'node:assert/strict';
import {createWorld,isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {createCapitalHubWorld,exitCapitalHub,enterCapitalHub} from '../src/hubSystem.js';
import {createPlayer} from '../src/player.js';
import {TILE} from '../src/data.js';
import {ORRAKAI_SOUTH_ROAD,createOrrakaiExterior} from '../src/orrakaiExterior.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const game={player:createPlayer('South Gate route'),world:createCapitalHubWorld(),camera:{x:0,y:0},canvas:{width:1280,height:800},logLines:[],log(t){this.logLines.push(t);}};
Object.assign(game.player,game.world.spawn);assert(!game.world.objects.some(o=>o.id==='orrakaiEastGate'));assert(!game.world.tiles[28][66].passable);
assert(exitCapitalHub(game,{gateId:'east'}),'Legacy saved east exit safely falls back to South Gate');
assert(game.player.x<15*TILE&&game.player.y<8*TILE,'South exit lands in northwest corner');assert.equal(game.player.dirY,1);
const w=game.world,all=w.continentRuntime.allObjects,gate=all.find(o=>o.id==='capital-gate-prototype'),stone=all.find(o=>o.id==='nav-hearthmereFrontier-outpost');assert(!all.some(o=>o.gateId==='east'));assert(stone);assert(Math.hypot(stone.x-gate.x,stone.y-gate.y)<14*TILE);
for(let i=1;i<ORRAKAI_SOUTH_ROAD.points.length;i++){
const a=ORRAKAI_SOUTH_ROAD.points[i-1],b=ORRAKAI_SOUTH_ROAD.points[i],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
for(let n=0;n<=distance*4;n++){const t=n/(distance*4),x=(a[0]+(b[0]-a[0])*t)*TILE,y=(a[1]+(b[1]-a[1])*t)*TILE;if(y<4.5*TILE)continue;assert(isActorPositionPassable(w,x,y,12),`South road blocked at ${x/TILE},${y/TILE}`);assert.equal(w.tiles[Math.floor(y/TILE)][Math.floor(x/TILE)].biome,'path');}}
const visited=new Set(),queue=[[Math.floor(game.player.x/TILE),Math.floor(game.player.y/TILE)]];visited.add(queue[0].join(','));for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(a<3||a>35||b<3||b>38||visited.has(key)||!isActorPositionPassable(w,(a+.5)*TILE,(b+.5)*TILE,12))continue;visited.add(key);queue.push([a,b]);}}
for(const id of ['nav-hearthmereFrontier-outpost','orrakaiSouthGateGuard','orrakaiRoadScout','covenantRoadPhysician','roadCookMira','site-outpost-workyard']){const o=all.find(o=>o.id===id);assert(o,id+' retained');assert(visited.has(Math.floor(o.x/TILE)+','+Math.floor(o.y/TILE)),id+' reachable');}
const gateId=gate.id;assert(enterCapitalHub(game,gate));assert.equal(game.world.mode,'capital');assert(exitCapitalHub(game));assert.equal(game.world.continentRuntime.findObject(gateId).id,gateId);assert(game.player.y<8*TILE);
const state=createSaveState(game);const loaded={player:createPlayer('Reload'),camera:{x:0,y:0},canvas:game.canvas,logLines:[]};applySaveToGame(loaded,state);assert(loaded.world.continentRuntime.findObject(stone.id));assert(!loaded.world.continentRuntime.allObjects.some(o=>o.gateId==='east'));
assert(createOrrakaiExterior().objects.filter(o=>o.propType==='continentHouse').length===0);
console.log('PASS northwest South Gate arrival, retired East Gate/legacy fallback, continuous radius-safe main road, retained reachable services and Nav Stone, return/re-entry and save reload');
