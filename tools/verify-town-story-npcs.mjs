import assert from 'node:assert/strict';
import {updateAct1Campaign} from '../src/act1CampaignRuntime.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {TILE} from '../src/data.js';
import {ensureOrrakaiStoryNpcPositions} from '../src/orrakaiLayout.js';
import {isActorPositionPassable,hasLineOfSight} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {nearestObject} from '../src/gameInteraction.js';
function reachable(w,start){const queue=[start],seen=new Set([start.join(',')]);for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const a=x+dx,b=y+dy,key=a+','+b;if(seen.has(key)||!isActorPositionPassable(w,(a+.5)*TILE,(b+.5)*TILE,12))continue;seen.add(key);queue.push([a,b]);}}return seen;}
for(const skipPublishedOverride of [false,true]){
 const w=createCapitalHubWorld({skipPublishedOverride}),mael=w.objects.find(o=>o.id==='warden'),cardinal=w.objects.find(o=>o.id==='lightwardenCaelenObject');
 updateAct1Campaign({player:createPlayer('Campaign placement'),world:w,log(){}});
 const visited=reachable(w,[49,43]);
 for(const npc of [mael,cardinal]){
  const tile=[Math.floor(npc.x/TILE),Math.floor(npc.y/TILE)];assert(visited.has(tile.join(',')),npc.name+' reachable with player radius');
  const nearby=w.objects.filter(o=>o!==npc&&o.kind==='npc'&&Math.hypot(o.x-npc.x,o.y-npc.y)<3*TILE);assert.equal(nearby.length,0,npc.name+' has clear space from other NPCs');
  assert(npc.forceLabel&&npc.stationary&&!npc.ambientWander);
  assert.equal(nearestObject({player:{x:npc.x+16,y:npc.y,r:12},world:w}).id,npc.id,'NPC is the nearest interactable from the approach');
 }
 assert(hasLineOfSight(w,49.5*TILE,43.5*TILE,mael.x,mael.y));assert(Math.hypot(mael.x-49.5*TILE,mael.y-43.5*TILE)<5*TILE);
 assert.equal(cardinal.npcId,'lightwardenCaelen');assert.equal(cardinal.dialogueId,'lightwardenCaelenMilestone');assert.equal(mael.npcId,'wardenMael');
 const sanctuary=w.buildings.find(b=>b.id==='shrine');assert.equal(Math.floor(cardinal.y/TILE),sanctuary.y+sanctuary.h);assert(cardinal.x>sanctuary.x*TILE&&cardinal.x<(sanctuary.x+sanctuary.w)*TILE);
 const old={...mael};mael.x=1;mael.y=1;mael.ambientWander=true;ensureOrrakaiStoryNpcPositions(w);assert.equal(mael.x,old.x);assert.equal(mael.y,old.y);const count=w.objects.length;ensureOrrakaiStoryNpcPositions(w);assert.equal(w.objects.length,count);
}
const world=createCapitalHubWorld(),player=createPlayer('Placement save check');Object.assign(player,world.spawn);const state=createSaveState({world,player});const game={player:createPlayer(),world:createCapitalHubWorld(),camera:{x:0,y:0},logLines:[]};applySaveToGame(game,state);assert.equal(game.world.objects.find(o=>o.id==='warden').x,45.5*TILE);assert.equal(game.world.objects.find(o=>o.id==='lightwardenCaelenObject').y,17.5*TILE);
console.log('PASS authored/published town placements, radius-aware routes, apothecary sightline, Covenant frontage, NPC separation, interaction targeting, stable identities, idempotence and saved-game reload');
