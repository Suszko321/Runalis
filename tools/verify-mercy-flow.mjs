import {answerMalakarReady,skipMalakarRitual,chooseMalakarIntroduction,updateMalakarEncounter} from '../src/malakarEncounter.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass} from '../src/player.js';
import {createMaraHouseWorld,leaveMaraHouse,updateAct1Opening} from '../src/act1OpeningSystem.js';
import {createWorld} from '../src/world.js';
import {createDialogueState,openDialogue,chooseDialogueOption,updateDialogue,updateDialogueInput,startQuest} from '../src/dialogueSystem.js';
import {updateAct1Campaign} from '../src/act1CampaignRuntime.js';
import {updateOrchardDungeon} from '../src/ashenOrchardDungeon.js';
import {updateOldWellQuest} from '../src/oldWellSystem.js';
import {updateEnemies} from '../src/combat.js';
import {interact} from '../src/gameInteraction.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {enterDungeon,transitionDungeonFloor,exitDungeon} from '../src/dungeonSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const g={player:createPlayer('Mercy flow'),world:createMaraHouseWorld(),dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},logLines:[],log(){},shake(){}};
const testClass=process.env.RUNALIS_TEST_CLASS||'oathkeeper',reportTo=process.env.RUNALIS_REPORT_TO||'wardenMael';
chooseClass(g.player,testClass);Object.assign(g.player,g.world.spawn);startQuest(g.player,'mercy_in_orrakai');
const stages=[];
const checkpoints=[];
function checkpoint(){
 tick();
 const mode=g.world.mode,stage=g.player.quests.active.mercy_in_orrakai?.currentStageId||g.player.quests.active.act1HearthmereAshes?.currentStageId||'complete';
 const snapshot=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,snapshot));assert.equal(g.world.mode,mode);tick();
 assert.equal(g.player.quests.active.mercy_in_orrakai?.currentStageId||g.player.quests.active.act1HearthmereAshes?.currentStageId||'complete',stage);
 checkpoints.push({mode,stage,dialogue:g.dialogue.active});
}
function tick(){updateAct1Opening(g,.3);updateOldWellQuest(g);updateAct1Campaign(g,.3);const s=g.player.quests.active.mercy_in_orrakai?.currentStageId;if(stages.at(-1)!==s)stages.push(s);}
function talk(id,choices){
 tick();const actor=g.world.objects.find(o=>o.npcId===id);assert(actor,`physical actor ${id}`);Object.assign(g.player,{x:actor.x,y:actor.y+24});assert(openDialogue(g.dialogue,actor,g.player,g.world));
 runChoices(choices,id);
}
function runChoices(choices,id='active'){
 const pending=[...choices];
 for(let i=0;i<250&&g.dialogue.active;i++){
  updateDialogue(g.dialogue,10);
  const index=g.dialogue.options.findIndex(o=>o.id===(pending[0]||'leave')&&!o.disabled);
  if(index>=0){const chosen=pending[0];assert(chooseDialogueOption(g.dialogue,g.player,g.world,index));pending.shift();if(['unknown','cooperate','warning'].includes(chosen))checkpoint();}
  else updateDialogueInput(g.dialogue,{confirmPressed:true,confirmHeld:false},g.player,g.world);
 }
 assert(!g.dialogue.active,`conversation failed to close: ${id}/${g.dialogue.currentNodeId}/${pending.join(',')}`);assert.deepEqual(pending,[],`unused choices for ${id}`);tick();checkpoint();
}
talk('maraVell',['where','caravan','who','next']);assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'findWardenMael');
assert(leaveMaraHouse(g));
talk('wardenMael',['mara','attack','order','missing','continue','grateful','unknown','searching','noCoin','acceptAid']);
assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'aidPlagueTents');
talk('orrakaiSickVillager',['deliver']);talk('orrakaiWellStoresAttendant',['collect']);talk('orrakaiWaterDistribution',['refugees']);talk('orrakaiLowerGateGuard',['record']);
assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'reportToWardenMael');
talk('wardenMael',['well','finish']);talk('lightwardenCaelen',['saved','thanks','payment','paid']);
assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'investigateOldWell');
g.world=createWorld();tick();
// Exercise actual death handling and evidence interactions. Combat balance is
// intentionally outside this dialogue/progression regression.
for(const id of ['oldWellPlagueAnimal','oldWellLastDawnFighter','oldWellLastDawnRitualist']){const e=g.world.enemies.find(e=>e.id===id);assert(e);e.hp=0;updateEnemies(0,g.player,g.world,g.log,1,g);tick();}
tick();
for(const id of ['oldWellRedWax','oldWellBurnedCloth','oldWellRitualMarking','oldWellPatrolEvidence','oldWellBrokenLantern']){
 const o=g.world.objects.find(o=>o.id===id);assert(o?.interactable,`${id}: present=${!!o}, stage=${g.player.quests.active.mercy_in_orrakai.currentStageId}, flags=${JSON.stringify(g.player.story.flags.mercy)}, objectives=${JSON.stringify(g.player.quests.active.mercy_in_orrakai.objectives)}`);Object.assign(g.player,{x:o.x,y:o.y});interact(g);tick();
}
assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'returnOldWellEvidence');
g.world=createCapitalHubWorld();talk(reportTo,[reportTo==='wardenMael'?'custody':'account']);talk('covenantHealingRite',['watch']);
for(let i=0;i<36;i++)tick();assert(!g.player.story.flags.mercy.riteFinished);checkpoint();
for(let i=0;i<44;i++)tick();assert(g.dialogue.active);runChoices(['record']);talk('lightwardenCaelen',['cooperate','returnHome']);
const door=g.world.objects.find(o=>o.id==='maraHomeEntrance');Object.assign(g.player,{x:door.x,y:door.y});interact(g);assert.equal(g.world.mode,'maraHouse');
talk('maraVell',['investigate','rest']);assert(g.player.quests.completed.mercy_in_orrakai);
const mainStages=[];
function stage(){tick();const s=g.player.quests.active.act1HearthmereAshes?.currentStageId;if(mainStages.at(-1)!==s)mainStages.push(s);return s;}
function surface(){g.world=createWorld();tick();}
function inspect(id){const o=(g.world.continentRuntime?.allObjects||g.world.objects).find(o=>o.id===id);assert(o,`physical evidence ${id}`);Object.assign(g.player,{x:o.x,y:o.y});g.world.continentRuntime?.activate([g.player],g.player,true);tick();interact(g);stage();checkpoint();}
function visit(id,choices){if(id==='maraVell'&&g.world.mode==='capital'){const stairs=g.world.objects.find(o=>o.id==='maraHomeEntrance');assert(stairs);Object.assign(g.player,{x:stairs.x,y:stairs.y});interact(g);assert.equal(g.world.mode,'maraHouse');tick();}const o=(g.world.continentRuntime?.allObjects||g.world.objects).find(o=>o.npcId===id);assert(o,id);Object.assign(g.player,{x:o.x,y:o.y});g.world.continentRuntime?.activate([g.player],g.player,true);talk(id,choices);stage();}
stage();surface();inspect('act1CargoManifest');inspect('act1RelicCradle');assert.equal(stage(),'handsThatStillWork');
visit('act1ReliefScout',['record']);
for(const o of g.world.continentRuntime.allObjects.filter(o=>o.kind==='poiInvestigation'&&o.poiId==='ashenOrchard').slice(0,3))inspect(o.id);
assert.equal(stage(),'failedPurificationSite');
function clearDungeon(id){
 const entrance=g.world.continentRuntime.allObjects.find(o=>o.dungeonId===id);assert(entrance,`entrance ${id}`);Object.assign(g.player,{x:entrance.x,y:entrance.y});assert(enterDungeon(g,entrance));stage();
 if(id==='ashenOrchard'){
  runChoices(['plan']);
  for(let i=0;i<2;i++){for(const e of g.world.enemies.filter(e=>e.orchardValveGuard===i))e.hp=0;updateEnemies(0,g.player,g.world,g.log,2,g);const valve=g.world.objects.find(o=>o.orchardValve===i);Object.assign(g.player,{x:valve.x,y:valve.y});interact(g);updateOrchardDungeon(g);}
 }
 while(g.world.floor<g.world.totalFloors){const stairs=g.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='down');if(id==='demonCultLair'&&stairs.targetFloor===g.world.totalFloors){g.world.enemies=[];transitionDungeonFloor(g,stairs);answerMalakarReady(g,0,true);skipMalakarRitual(g);chooseMalakarIntroduction(g,'relic');updateMalakarEncounter(g,3.1);}else assert(transitionDungeonFloor(g,stairs));}
 const boss=g.world.enemies.find(e=>e.isDungeonMainBoss);assert(boss);boss.hp=0;updateEnemies(0,g.player,g.world,g.log,2,g);if(id==='demonCultLair'){updateMalakarEncounter(g,4.1);updateEnemies(0,g.player,g.world,g.log,7,g);}tick();checkpoint();
 if(g.dialogue.active)runChoices(['warning']);
 if(id==='demonCultLair'){const relic=g.world.objects.find(o=>o.id==='malakarRelic');Object.assign(g.player,{x:relic.x,y:relic.y});interact(g);tick();}
 const exit=g.world.objects.find(o=>o.returnPortal);assert(exit,`return portal ${id}`);assert(exitDungeon(g,exit));stage();
}
clearDungeon('ashenOrchard');assert.equal(stage(),'theCovenantBlessing');g.world=createCapitalHubWorld();visit('lightwardenCaelen',['record']);visit('maraVell',['record']);surface();visit('chapelHermit',['record']);visit('sisterElyra',['record']);
for(const o of g.world.continentRuntime.allObjects.filter(o=>o.kind==='poiInvestigation'&&o.poiId==='brokenChapel').slice(0,3))inspect(o.id);
for(const word of ['drain','align','light'])visit('act1Regulator',[word]);assert.equal(stage(),'theRedSeal');inspect('act1RitualOrders');visit('repentantCultist',['record']);
g.world=createCapitalHubWorld();visit('wardenMael',['record']);surface();clearDungeon('demonCultLair');g.world=createCapitalHubWorld();visit('wardenMael',['record']);visit('maraVell',['record']);
assert(g.player.quests.completed.act1HearthmereAshes);
fs.writeFileSync(`docs/act1-campaign/flow-${testClass}.json`,JSON.stringify({pass:true,testClass,reportTo,stages,mainStages,checkpoints,realDialogueChoices:true,realDeathHandling:true,realEvidenceInteractions:true,limitations:'Travel is repositioned; enemy HP is set to zero to exercise death handling. This is not a combat or manual navigation playthrough.'},null,2));
console.log(`PASS ${testClass}, ${reportTo}: complete Mercy and Act I flow, ${checkpoints.length} save/load checkpoints, without quest-stage injection`);
