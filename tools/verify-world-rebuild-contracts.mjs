import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createWorld} from '../src/world.js';
import {createRegionWorld,createTravelRouteWorld} from '../src/regionWorlds.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createCaravanOpeningWorld,createMaraHouseWorld} from '../src/act1OpeningSystem.js';
import {getAllQuests,NPCS} from '../src/worldContent.js';
import {ACT1_LANDMARKS} from '../src/overworldUtils.js';
import {TILE,ITEMS} from '../src/data.js';
import {updateOldWellQuest} from '../src/oldWellSystem.js';
import {CONTINENT_REGIONS,CONTINENT_SPAWNS,migrateContinentalPosition} from '../src/continentDefinition.js';
import {poiContentConditionsMatch} from '../src/poiStateSystem.js';

const baseline=JSON.parse(fs.readFileSync(new URL('../docs/world-rebuild/quest-dependency-audit.json',import.meta.url),'utf8'));
const report={baseline:baseline.counts,checks:[],failures:[],populations:{},warnings:[]};
function check(name,fn){try{const detail=fn();report.checks.push({name,detail});console.log('PASS '+name);}catch(error){report.failures.push({name,error:error.message});console.error('FAIL '+name+': '+error.message);}}
const root=createWorld({skipPublishedOverride:true});
if(root.continentId!=='runalis'||!root.continentRuntime?.allObjects||!root.continentRuntime?.allEnemies){
 throw new Error('The final continuous-world factory is not integrated yet. Run this verifier after createWorld returns continentRuntime.allObjects/allEnemies.');
}
const fullObjects=root.continentRuntime.allObjects,fullEnemies=root.continentRuntime.allEnemies;
const instances=[createCapitalHubWorld({skipPublishedOverride:true}),createMaraHouseWorld(),createCaravanOpeningWorld()];
const currentQuests=getAllQuests(),quests=new Map(currentQuests.map(q=>[q.id,q]));
const oldWellQuest=quests.get('mercy_in_orrakai'),oldWellStage=oldWellQuest.stages.find(s=>s.id==='investigateOldWell');
updateOldWellQuest({world:root,player:{x:OLD_WELL_POSITION()[0],y:OLD_WELL_POSITION()[1],quests:{active:{mercy_in_orrakai:{currentStageId:oldWellStage.id,objectives:structuredClone(oldWellStage.objectives)}}}}});
function OLD_WELL_POSITION(){const o=fullObjects.find(o=>o.poiId==='oldWellRitualSite');return o?[o.x,o.y]:[53.5*TILE,67.5*TILE];}
function dedupe(array){return [...new Map(array.map(o=>[o.id,o])).values()];}
const surfaceObjects=dedupe([...fullObjects,...root.objects]);
const surfaceEnemies=dedupe([...fullEnemies,...root.enemies]);
const objects=[...surfaceObjects,...instances.flatMap(w=>w.objects||[])];
const enemies=[...surfaceEnemies,...instances.flatMap(w=>w.enemies||[])];
const byId=new Map(surfaceObjects.map(o=>[o.id,o]));
const retainedObject=old=>surfaceObjects.find(o=>(o.id===old.id||o.sourceEntityId===old.id)&&(!o.sourceRegionId||o.sourceRegionId===old.regionId));
const objectiveShape=q=>({id:q.id,giverNpcId:q.giverNpcId,requiresTurnIn:q.requiresTurnIn,stages:(q.stages||[]).map(s=>({id:s.id,objectives:(s.objectives||[]).map(o=>({type:o.type,npcId:o.npcId,poiId:o.poiId,dungeonId:o.dungeonId,entranceId:o.entranceId,enemyId:o.enemyId,enemyKind:o.enemyKind,enemyKinds:o.enemyKinds,itemId:o.itemId,required:o.required}))}))});
check('all 32 captured quests retain their stage and objective contracts',()=>{
 for(const old of baseline.quests){assert.ok(quests.has(old.id),'Missing quest '+old.id);assert.deepEqual(objectiveShape(quests.get(old.id)),objectiveShape(old),'Changed progress contract '+old.id);}
 return {quests:baseline.quests.length,objectives:baseline.counts.objectives};
});
check('every required and quest-giver NPC has a physical occurrence',()=>{
 for(const id of baseline.stableIdentityKeys.npcIds)assert.ok(objects.some(o=>o.npcId===id||o.id===id||NPCS[id]?.objectId===o.id),'Missing NPC '+id);
 return {identities:baseline.stableIdentityKeys.npcIds.length};
});
check('every objective POI has a physical identity, including Lantern Marsh',()=>{
 for(const id of baseline.stableIdentityKeys.poiIds)assert.ok(objects.some(o=>o.poiId===id),'Missing physical POI '+id);
 return {identities:baseline.stableIdentityKeys.poiIds.length};
});
check('all eight quest dungeons and all legacy surface entrances survive',()=>{
 const entrances=surfaceObjects.filter(o=>o.kind==='dungeonEntrance');
 for(const id of baseline.stableIdentityKeys.dungeonIds)assert.ok(entrances.some(o=>(o.dungeonId||o.poiId||o.id)===id),'Missing dungeon identity '+id);
 let retained=0;
 for(const old of baseline.entrances.filter(o=>o.worldMode==='overworld'&&o.kind==='dungeonEntrance')){
  const now=retainedObject(old);assert.ok(now,'Missing entrance '+old.id);assert.equal(now.dungeonId||now.poiId||now.sourceEntityId||now.id,old.dungeonId||old.poiId||old.id,'Changed entrance dungeon '+old.id);retained++;
 }
 return {questDungeons:baseline.stableIdentityKeys.dungeonIds.length,retainedEntrances:retained};
});
check('Old Well retains exact kill IDs, five distinct clues and beginner placement',()=>{
 for(const id of baseline.stableIdentityKeys.enemyIds)assert.ok(enemies.some(e=>e.id===id),'Missing named quest enemy '+id);
 const clues=surfaceObjects.filter(o=>o.kind==='poiInvestigation'&&o.poiId==='oldWellRitualSite');
 const unique=new Set(clues.map(o=>o.clueId||o.id));assert.equal(unique.size,5);
 for(const id of ['oldWellRedWax','oldWellBurnedCloth','oldWellRitualMarking','oldWellPatrolEvidence','oldWellBrokenLantern'])assert.ok(unique.has(id),'Missing Well clue '+id);
 for(const clue of clues)assert.ok(Math.hypot(clue.x/TILE-53.5,clue.y/TILE-67.5)<8,'Old Well evidence separated from early scene');
 return {namedEnemies:baseline.stableIdentityKeys.enemyIds.length,distinctClues:unique.size};
});
check('all captured investigation identities and persistent Nav Stones survive',()=>{
 for(const old of baseline.investigationClues){const list=old.worldMode==='overworld'||old.worldMode==='travelRoute'?surfaceObjects:instances.find(w=>w.mode===old.worldMode)?.objects||[];const now=list.find(o=>o.id===old.id);assert.ok(now,'Missing clue object '+old.id);assert.equal(now.poiId,old.poiId);assert.equal(now.clueId,old.clueId);}
 for(const old of baseline.navigation){const now=byId.get(old.id);assert.ok(now,'Missing attuned stone '+old.id);assert.equal(now.kind,'navStone');}
 return {clues:baseline.investigationClues.length,stones:baseline.navigation.length};
});
check('resolved Chapel still exposes both mandatory main-story witnesses',()=>{
 const player={classId:'fellhunter',bloodline:{id:'human'},poiStates:{brokenChapel:{clues:{},resolution:{id:'covenantSanctuary'}}},quests:{active:{act1HearthmereAshes:{currentStageId:'theBrokenChapel'}}}};
 for(const id of ['chapelHermit','sisterElyra']){
  const actor=surfaceObjects.find(o=>o.npcId===id);assert.ok(actor,'Missing witness '+id);
  assert.ok(poiContentConditionsMatch(actor.poiStateCondition,player),'Resolved Chapel hides main quest witness '+id);
 }
});
const resourceOutput=o=>o.itemId||({herb:'emberleaf',emberleaf:'emberleaf',gravecap:'gravecap',ore:'ironOre',bone:'boneShard',reed:'riverReed',riverReed:'riverReed',runestone:'paleEssence',ashFruit:'ashFruit',lanternMoss:'lanternMoss',tree:'echorynSoftwood',log:'echorynSoftwood',deadwood:'echorynSoftwood',rareTree:'echorynSoftwood'})[o.kind];
check('physical gathering output types and original resource identities survive',()=>{
 const requiredOutputs=new Set(),nodes=baseline.resourcePopulations.filter(r=>r.mode==='overworld'||r.mode==='travelRoute').flatMap(r=>r.nodes);
 for(const old of nodes){const id=resourceOutput(old);if(id)requiredOutputs.add(id);assert.ok(retainedObject(old),'Missing persistent gather node '+old.regionId+':'+old.id);}
 const available=new Set(surfaceObjects.map(resourceOutput).filter(Boolean));
 for(const id of requiredOutputs){assert.ok(ITEMS[id],'Unknown gather item '+id);assert.ok(available.has(id),'Missing physical gather output '+id);}
 assert.ok(surfaceObjects.some(o=>o.kind==='fish'),'No physical fishing nodes for Silverfin quest');
 return {retainedNodes:nodes.length,outputs:[...requiredOutputs].sort()};
});
check('fixed region identity mapping and all Act I anchors remain valid',()=>{
 for(const id of ['hearthmereFrontier','aureateMarches','ascensionWastes']){const region=CONTINENT_REGIONS.find(r=>r.id===id);assert.ok(region,'Missing region '+id);assert.ok(Array.isArray(region.levels)&&region.levels.length===2&&region.levels.every(Number.isFinite),'No fixed levels for '+id);}
 for(const [id,tile]of Object.entries(baseline.landmarks)){
  const now=ACT1_LANDMARKS[id];assert.ok(now,'Missing Act I anchor '+id);
  assert.ok(Math.hypot(now[0]-tile[0],now[1]-tile[1])<=(id==='outpost'?3:0),'Act I anchor moved unexpectedly '+id);
 }
 for(const o of surfaceObjects){assert.ok(Number.isFinite(o.x)&&Number.isFinite(o.y),'Invalid position '+o.id);assert.ok(o.x>=0&&o.y>=0&&o.x<root.width*TILE&&o.y<root.height*TILE,'Outside continent '+o.id);}
 return {fixedRegions:CONTINENT_REGIONS.length,anchors:Object.keys(baseline.landmarks).length};
});
check('legacy later-region entrance coordinates map into the physical continent',()=>{
 for(const old of baseline.entrances.filter(o=>o.worldMode==='overworld'&&o.regionId!=='hearthmereFrontier')){
  const now=retainedObject(old);assert.ok(now,'Missing later entrance '+old.id);
  const expected=migrateContinentalPosition(old.regionId,old.tile[0]*TILE,old.tile[1]*TILE);
  assert.ok(Math.hypot(now.x-expected.x,now.y-expected.y)<TILE*32,'Entrance lost regional migration '+old.id);
 }
});
check('global runtime populations and retained instances contain no duplicate identities',()=>{
 for(const [name,list]of [['allObjects',fullObjects],['allEnemies',fullEnemies],...instances.map(w=>[w.mode,w.objects])]){
  const ids=list.map(o=>o.id);assert.ok(ids.every(id=>typeof id==='string'&&id),'Anonymous persistent entity in '+name);
  const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];assert.deepEqual(duplicates,[],'Duplicate '+name+' identities');
 }
 report.populations={objects:fullObjects.length,enemies:fullEnemies.length,locations:root.continentLocations?.length||0};return report.populations;
});
function populationHash(world){
 const objects=world.continentRuntime.allObjects.map(o=>({id:o.id,kind:o.kind,x:o.x,y:o.y,npcId:o.npcId,poiId:o.poiId,itemId:o.itemId,dungeonId:o.dungeonId})).sort((a,b)=>a.id.localeCompare(b.id));
 const enemies=world.continentRuntime.allEnemies.map(e=>({id:e.id,kind:e.kind,x:e.x,y:e.y,level:e.level,tier:e.tier,hp:e.hp,maxHp:e.maxHp,damage:e.damage})).sort((a,b)=>a.id.localeCompare(b.id));
 return crypto.createHash('sha256').update(JSON.stringify({objects,enemies})).digest('hex');
}
check('repeat world builds preserve stable seeded populations without player scaling',()=>{
 const weak=createWorld({skipPublishedOverride:true,seed:'contract-seed',player:{combatLevel:1,level:1,gearPower:0}});
 const strong=createWorld({skipPublishedOverride:true,seed:'contract-seed',player:{combatLevel:100,level:100,gearPower:10000}});
 const first=populationHash(weak),second=populationHash(strong);assert.equal(first,second,'Population or difficulty depends on player/current build randomness');
 return {populationSha256:first};
});
check('all region and route compatibility factories return the shared continent',()=>{
 for(const id of ['hearthmereFrontier','aureateMarches','ascensionWastes']){
  const w=createRegionWorld(id,{skipPublishedOverride:true});assert.equal(w.continentId,'runalis','Region factory '+id+' is still isolated');
  assert.equal(w.width,root.width);assert.equal(w.height,root.height);
  const p=CONTINENT_SPAWNS[id];assert.ok(Math.hypot(w.spawn.x/TILE-p[0],w.spawn.y/TILE-p[1])<32,'Incorrect region arrival '+id);
 }
 for(const id of ['pilgrimRoad','severedCauseway']){
  const w=createTravelRouteWorld(id,{skipPublishedOverride:true});assert.equal(w.continentId,'runalis','Route factory '+id+' is still isolated');
  const p=CONTINENT_SPAWNS[id];assert.ok(Math.hypot(w.spawn.x/TILE-p[0],w.spawn.y/TILE-p[1])<32,'Incorrect route arrival '+id);
 }
});
fs.mkdirSync('docs/world-rebuild',{recursive:true});fs.writeFileSync('docs/world-rebuild/contract-verification.json',JSON.stringify(report,null,2));
assert.equal(report.failures.length,0,JSON.stringify(report.failures,null,2));
console.log(`Verified ${report.checks.length} world rebuild contract groups against ${baseline.counts.quests} quests and ${baseline.counts.objectives} objectives.`);
