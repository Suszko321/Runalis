import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCapitalHubWorld,useHubService,enterCapitalHub,exitCapitalHub,supplyBlacksmithMaterials} from '../src/hubSystem.js';
import {beginWorkshopSession,endWorkshopSession} from '../src/workshopAccess.js';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {migrateOrrakaiPosition,reconstructOrrakai,ORRAKAI_REVISION} from '../src/orrakaiLayout.js';
import {createSaveState,migrateSaveState} from '../src/gameSave.js';
import {nearestObject,shrine} from '../src/gameInteraction.js';
import {createDialogueState,openDialogue} from '../src/dialogueSystem.js';
import {createOverworldReturnState,restoreOverworldFromState} from '../src/dungeonSystem.js';
import {enterTower,exitTower} from '../src/towerSystem.js';
const w=createCapitalHubWorld({skipPublishedOverride:true});
const before=JSON.parse(fs.readFileSync(new URL('../docs/orrakai-reconstruction/content-before.json',import.meta.url)));
const protectedObject=o=>!o.decorative&&!['worldDressing','treeCluster','shrub','smallBoulder','brokenWall','ruinPillar','graveMarker'].includes(o.kind)||o.npcId||o.questId||o.poiId||o.kind==='poiInvestigation';
for(const old of before.filter(protectedObject)){
 const current=w.objects.find(o=>o.id===old.id);assert(current,`lost ${old.id}`);
 for(const key of ['kind','npcId','dialogueId','questId','poiId','majorPoiId'])assert.equal(current[key],old[key],`${old.id}: changed ${key}`);
}
assert.equal(w.enemies.length,0);assert(w.safeZone);assert.equal(new Set(w.objects.map(o=>o.id)).size,w.objects.length,'unique IDs');
const count=w.objects.length;reconstructOrrakai(w);assert.equal(w.objects.length,count,'idempotent reconstruction');
// Radius-aware flood fill: actors, not just point samples, must reach every retained interaction.
const visited=new Set(),queue=[{x:36,y:40}];visited.add('36,40');
for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(visited.has(key)||!isActorPositionPassable(w,(x+.5)*32,(y+.5)*32,12))continue;visited.add(key);queue.push({x,y});}}
const failures=[];
for(const o of w.objects.filter(o=>!o.decorative&&o.kind!=='poiMarker')){
 if(!visited.has(Math.floor(o.x/32)+','+Math.floor(o.y/32)))failures.push(o.id);
}
assert.deepEqual(failures,[],'all NPCs, services, evidence, resources and exits reachable');
for(const b of w.buildings){
 assert.equal(b.rooms.length,2);const x=(b.x+b.door+1)*32,y=(b.y+b.h)*32+16;
 const p={x,y,r:12};moveActorWithCollision(p,w,0,-96,12);assert(p.y<y-80,`${b.id} entry`);moveActorWithCollision(p,w,0,96,12);assert(p.y>y-4,`${b.id} exit`);
 const wall={x:(b.x+b.w-2.5)*32,y};moveActorWithCollision(wall,w,0,-128,12);assert(wall.y>=(b.y+b.h)*32+12,`${b.id} solid facade`);
}
for(const t of w.terraces){for(const [a,b] of t.stairs){const p={x:(a+b+1)*16,y:(t.y+t.h)*32+20};moveActorWithCollision(p,w,0,-t.h*32-40,12);assert(p.y<t.y*32,`${t.id} stair climb`);assert(Math.abs(p.walkLevel-t.level)<.01);}
 const p={x:26.5*32,y:(t.y+t.h)*32+20};moveActorWithCollision(p,w,0,-160,12);assert(p.y>=(t.y+t.h)*32+12,'cliff cannot be crossed');
}
for(const x of [12,26,50,63]){const actor={x:(x+.5)*32,y:43.5*32};moveActorWithCollision(actor,w,0,150,12);assert(actor.y<44*32,'south curtain wall blocks the cliff');}
const throughGate={x:36.5*32,y:42.5*32};moveActorWithCollision(throughGate,w,0,100,12);assert(throughGate.y>45*32,'south arch has a usable passage');
const p=createPlayer('Town regression');p.poiStates={orchard:{clues:{test:true}}};p.x=600;p.y=600;const story=JSON.stringify(p.poiStates);assert(migrateOrrakaiPosition(w,p));assert.equal(p.x,w.spawn.x);assert.equal(JSON.stringify(p.poiStates),story);assert.equal(p.orrakaiLayoutRevision,ORRAKAI_REVISION);
p.x=36.5*32;p.y=25.5*32;assert(!migrateOrrakaiPosition(w,p),'valid current save stays put');
p.x=17.5*32;p.y=22.5*32;assert(migrateOrrakaiPosition(w,p),'blocked current save recovers');
const g={world:w,player:p,canvas:{width:1100,height:700},camera:{x:0,y:0},log:()=>{}};
addItem(p,'ironOre',2);const scrap=countItem(p,'ironScrap'),smith=w.objects.find(o=>o.workshopService==='blacksmith');g.dialogue=createDialogueState();Object.assign(p,{x:smith.x,y:smith.y+32});assert(useHubService(g,w.objects.find(o=>o.kind==='blacksmithService')));assert.equal(countItem(p,'ironScrap'),scrap,'talking no longer silently refines ore');assert(beginWorkshopSession(g,smith,'blacksmith'));assert(supplyBlacksmithMaterials(g));assert.equal(countItem(p,'ironScrap'),scrap+3);endWorkshopSession(p);
p.gold=30;useHubService(g,w.objects.find(o=>o.kind==='bankService'));assert.equal(p.gold,5);assert.equal(p.storage.goldReserve,25);
useHubService(g,w.objects.find(o=>o.kind==='guildClerk'));assert(p.flags.capitalGuildStoryBriefing);assert(p.tower.unlocked);
addItem(p,'gravecap',1);addItem(p,'paleEssence',1);const tonic=countItem(p,'shrineTonic');useHubService(g,w.objects.find(o=>o.kind==='alchemistService'));assert.equal(countItem(p,'shrineTonic'),tonic+1);
p.classId='fellhunter';p.classSkill='archery';const xp=p.skills.archery.xp;useHubService(g,w.objects.find(o=>o.kind==='classTrainerService'));assert(p.skills.archery.xp>xp);
p.spiritAwakened=true;p.maxSpirit=100;p.spirit=0;shrine(g);assert.equal(p.spirit,100);
for(const npcId of ['wardenMael','maraSmith','maraVell','bram','kaelenDusk','sisterElian']){const npc=w.objects.find(o=>o.npcId===npcId);assert(openDialogue(createDialogueState(),npc,createPlayer('Dialogue review'),w),`${npcId} dialogue opens`);}
Object.assign(p,{x:20.5*32,y:27.5*32});assert.equal(nearestObject(g)?.id,'orrakaiBank','bank customer position routes to existing service');
const save=createSaveState(g);assert.equal(save.worldObjects,null);const loaded=migrateSaveState(JSON.parse(JSON.stringify(save)));assert.equal(loaded.player.x,p.x);assert.equal(loaded.player.orrakaiLayoutRevision,ORRAKAI_REVISION);assert.deepEqual(loaded.player.poiStates,p.poiStates);
delete save.player.orrakaiLayoutRevision;const legacy=migrateSaveState(save);assert.equal(legacy.player.x,w.spawn.x);assert.equal(legacy.player.y,w.spawn.y);
const blockedService={id:'wall-test',kind:'bankService',x:18.5*32,y:24.5*32,r:20};const interactionWorld={...w,objects:[blockedService]};assert.equal(nearestObject({world:interactionWorld,player:{x:16.5*32,y:24.5*32}}),null,'no interaction through exterior wall');
const entrance=w.objects.find(o=>o.id==='orrakaiTrialTower');
const returnState=createOverworldReturnState(g,entrance),restored=restoreOverworldFromState(JSON.parse(JSON.stringify(returnState)));
assert.equal(restored.mode,'capital');assert.equal(restored.buildings.length,7);assert.equal(restored.orrakaiRevision,ORRAKAI_REVISION);assert(restored.safeZone);
assert(enterTower(g,1,entrance));assert.equal(g.world.mode,'tower');assert(exitTower(g));assert.equal(g.world.mode,'capital');assert.equal(g.world.buildings.length,7);assert(isActorPositionPassable(g.world,p.x,p.y,12),'tower return is safe');
assert(exitCapitalHub(g));assert.equal(g.world.mode,'overworld');const frontierGate=g.world.objects.find(o=>o.kind==='capitalGate');assert(Math.hypot(p.x-frontierGate.x,p.y-frontierGate.y)<80,'missing return state uses actual frontier gate');assert(isActorPositionPassable(g.world,p.x,p.y,12));
assert(enterCapitalHub(g));assert.equal(g.world.buildings.length,7);assert.equal(g.world.enemies.length,0);assert(isActorPositionPassable(g.world,p.x,p.y,12));
console.log(JSON.stringify({result:'PASS',retained:before.filter(protectedObject).length,objects:w.objects.length,buildings:w.buildings.length,reachableCells:visited.size},null,2));
