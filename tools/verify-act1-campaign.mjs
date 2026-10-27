import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createMaraHouseWorld} from '../src/act1OpeningSystem.js';
import {createDialogueState,openDialogue,chooseDialogueOption,closeDialogue,startQuest,markNpcTalkObjective,markKillObjective,markPoiInvestigationObjective,markDungeonClearedObjective,markDungeonEnteredObjective,serializeDialogueState,restoreDialogueState} from '../src/dialogueSystem.js';
import {updateAct1Campaign,handleCampaignInteraction} from '../src/act1CampaignRuntime.js';
import {updateOldWellQuest} from '../src/oldWellSystem.js';
import {getQuest,getDialogue} from '../src/worldContent.js';
import {recordPoiClue} from '../src/poiStateSystem.js';
import {getStoryFlag,setStoryFlag} from '../src/storyProgress.js';
import {applyBossStoryProgress} from '../src/storyRuntime.js';
import {applyOrderChoice,ensureOrder} from '../src/yourOrder.js';
import {createSaveState,migrateSaveState} from '../src/gameSave.js';
import {CAMPAIGN_DIALOGUES} from '../src/act1CampaignData.js';
const report={checks:[],failures:[]};
function check(name,fn){try{fn();report.checks.push(name);console.log('PASS',name);}catch(e){report.failures.push({name,error:e.stack});console.error('FAIL',name,e.message);}}
const world=createWorld();
function game(){return {player:createPlayer('Campaign verification'),world:createCapitalHubWorld(),dialogue:createDialogueState(),canvas:{width:1280,height:720},camera:{x:0,y:0},log(){},logLines:[]};}
function tick(g,n=2){for(let i=0;i<n;i++)updateAct1Campaign(g,.3);}
function choose(g,npcId,optionId,nodeId){closeDialogue(g.dialogue,{immediate:true});const actor={id:npcId,npcId,name:npcId,dialogueId:nodeId,deferTalkObjective:true};assert(openDialogue(g.dialogue,actor,g.player,g.world));const index=g.dialogue.options.findIndex(o=>o.id===optionId);assert(index>=0,`${npcId}/${nodeId}: missing ${optionId}; available ${g.dialogue.options.map(o=>o.id)}`);assert(chooseDialogueOption(g.dialogue,g.player,g.world,index));closeDialogue(g.dialogue,{immediate:true});tick(g);}
function evidence(g,poi,ids){for(const id of ids){recordPoiClue(g.player,poi,id);markPoiInvestigationObjective(g.player,poi,id);}tick(g);}
function setStage(g,qid,id){startQuest(g.player,qid);const q=g.player.quests.active[qid],def=getQuest(qid),i=def.stages.findIndex(s=>s.id===id);Object.assign(q,{stageIndex:i,currentStageId:id,objectives:def.stages[i].objectives.map(o=>({...o,current:0}))});g.player.act1CampaignVersion=1;}
check('all authored dialogue destinations resolve',()=>{for(const node of Object.values(CAMPAIGN_DIALOGUES))for(const o of node.options||[])if(o.nextNodeId)assert(getDialogue(o.nextNodeId),o.nextNodeId);});
check('Orrakai quest actors are reachable from Mara’s door',()=>{
 const g=game();tick(g);const w=g.world,width=w.tiles[0].length,height=w.tiles.length,seen=new Set(['8,31']),queue=[[8,31]];
 for(let n=0;n<queue.length;n++){const [x,y]=queue[n];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(a<0||b<0||a>=width||b>=height||seen.has(k)||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,10))continue;seen.add(k);queue.push([a,b]);}}
 for(const id of ['wardenMael','lightwardenCaelen','bram','maraVell','orrakaiSickVillager','orrakaiWellStoresAttendant','orrakaiWaterDistribution','orrakaiLowerGateGuard','orrakaiRefugeeParent','covenantHealingRite']){const o=w.objects.find(o=>o.npcId===id);assert(o,id);let reached=false;for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(seen.has(`${Math.floor(o.x/32)+x},${Math.floor(o.y/32)+y}`))reached=true;assert(reached,`${id} unreachable`);}
});
check('new physical content registers once and survives chunk activation',()=>{const g=game();g.world=world;tick(g);const before=world.continentRuntime.allObjects.length;tick(g,10);assert.equal(world.continentRuntime.allObjects.length,before);world.continentRuntime.activate([{x:35*32,y:88*32}],g.player,true);assert(world.objects.some(o=>o.id==='tavinHolt'));world.continentRuntime.activate([{x:450*32,y:70*32}],g.player,true);world.continentRuntime.activate([{x:35*32,y:88*32}],g.player,true);assert(world.objects.some(o=>o.id==='tavinHolt'));});
check('new quest actors and clues have walkable interaction positions',()=>{const ids=['tavinHolt','ionaVey','pellRusk','greyhavenLedger','greyhavenCistern','act1CargoManifest','act1RelicCradle','act1ReliefScout','act1Regulator','act1RitualOrders'];for(const id of ids){const o=world.continentRuntime.allObjects.find(o=>o.id===id);assert(o,id);let reachable=false;for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(isActorPositionPassable(world,o.x+x*24,o.y+y*24,12))reachable=true;assert(reachable,id);}});
for(const who of ['wardenMael','lightwardenCaelen'])check(`evidence branch ${who}, rite timing and Mercy conclusion`,()=>{
  const g=game();setStage(g,'mercy_in_orrakai','returnOldWellEvidence');setStoryFlag(g.player,'mercy.brokenLanternAcquired');setStoryFlag(g.player,'mercy.brokenLanternHeld');
  choose(g,who,who==='wardenMael'?'custody':'account');assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'witnessHealingRite');
  const rep=JSON.stringify(g.player.factionReputation);assert.equal(getStoryFlag(g.player,'mercy.riteWitnessed'),undefined);
  choose(g,'covenantHealingRite','watch');g.player.x=18.5*32;g.player.y=15.5*32;
  tick(g,40);assert(!getStoryFlag(g.player,'mercy.riteFinished'),'rite cannot complete early');tick(g,40);
  assert(getStoryFlag(g.player,'mercy.riteFinished'));choose(g,'act1MarkedVillager','record');tick(g);assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'confrontEvidence');
  choose(g,'lightwardenCaelen','cooperate');
  // Continue authored conversation at its explicit final node.
  choose(g,'sceneNarrator','returnHome','act1ConfrontEnd');assert.equal(g.player.quests.active.mercy_in_orrakai.currentStageId,'returnToMara');
  g.world=createMaraHouseWorld();choose(g,'maraVell','investigate');choose(g,'sceneNarrator','rest','act1MaelEvening');
  assert(g.player.quests.completed.mercy_in_orrakai);assert(g.player.quests.active.act1HearthmereAshes);assert(g.player.locationKnowledge.caravanWreck);assert.notEqual(JSON.stringify(g.player.factionReputation),rep);
});
for(const classId of ['oathkeeper','fellhunter','gravecaller','lightbringer','thornbinder','waverider'])check(`mandatory progression events for ${classId}`,()=>{
  const g=game();g.player.classId=classId;g.player.quests.completed.mercy_in_orrakai={id:'mercy_in_orrakai'};tick(g);
  evidence(g,'caravanWreck',['act1CargoManifest','act1RelicCradle']);choose(g,'bram','record');choose(g,'act1ReliefScout','record');
  evidence(g,'ashenOrchard',['familyTable','blackIrrigation','rootPulse']);choose(g,'lightwardenCaelen','record');choose(g,'maraVell','record');
  markDungeonClearedObjective(g.player,'ashenOrchard');tick(g);choose(g,'maraVell','record');
  choose(g,'chapelHermit','record');choose(g,'sisterElyra','record');evidence(g,'brokenChapel',['chapelLedger','chapelCrackedAltar','act1ChapelBurnedIndex']);
  choose(g,'act1Regulator','light');assert(!getStoryFlag(g.player,'act1.machineAligned'));for(const word of ['drain','align','light'])choose(g,'act1Regulator',word);
  evidence(g,'lastDawnOrders',['act1RitualOrders']);choose(g,'repentantCultist','record');choose(g,'wardenMael','record');
  markDungeonEnteredObjective(g.player,'demonCultLair');tick(g);
  applyBossStoryProgress({id:'archiveCaptain',isBoss:true,miniBoss:true},g.player,{dungeonId:'demonCultLair'});assert(!getStoryFlag(g.player,'story.malakarDefeated'));
  applyBossStoryProgress({id:'malakar',isBoss:true,isDungeonMainBoss:true},g.player,{dungeonId:'demonCultLair'});assert(!g.player.quests.completed.act1HearthmereAshes);tick(g);
  choose(g,'malakarWitness','warning');setStoryFlag(g.player,'act1.relicSecured');tick(g);choose(g,'wardenMael','record');choose(g,'maraVell','record');
  assert(g.player.quests.completed.act1HearthmereAshes);assert(getStoryFlag(g.player,'story.act1Complete'));assert(!getStoryFlag(g.player,'order.founded'));
});
check('Order founding requires resources, real kills, consent, assignments and work',()=>{
  const g=game();g.world=world;g.player.quests.completed.mercy_in_orrakai={id:'mercy_in_orrakai'};tick(g);
  choose(g,'tavinHolt','help');choose(g,'ionaVey','listen');choose(g,'pellRusk','listen');g.world=createCapitalHubWorld();choose(g,'wardenMael','protection');g.world=world;
  assert(!getStoryFlag(g.player,'order.materials'));applyOrderChoice(g.player,{type:'materials',cost:[['ashCoin',80]],quality:'usable',trust:5});assert(!getStoryFlag(g.player,'order.materials'));
  addItem(g.player,'ashCoin',100);addItem(g.player,'fieldRations',20);choose(g,'tavinHolt','pay');choose(g,'ionaVey','shared');choose(g,'ionaVey','food');handleCampaignInteraction(g,{campaignAction:'cistern'});tick(g);assert(!getStoryFlag(g.player,'order.restored'));
  for(const id of ['greyhavenBeastA','greyhavenBeastB'])markKillObjective(g.player,{id,questEncounter:'greyhaven'});tick(g);assert(getStoryFlag(g.player,'order.restored'));
  // The DOM founding form calls this same persisted state, covered in browser test.
  const o=ensureOrder(g.player);Object.assign(o,{name:'Test Fellowship',banner:'tree',color:'green'});setStoryFlag(g.player,'order.founded');tick(g);
  for(const id of ['tavinHolt','ionaVey','pellRusk'])choose(g,id,'recruitOrder');assert.equal(Object.keys(o.members).length,3);assert(!getStoryFlag(g.player,'order.staffed'));
  for(const m of Object.values(o.members))m.assigned=true;tick(g);assert(getStoryFlag(g.player,'order.staffed'));
  choose(g,'greyhavenLedger','trade');addItem(g.player,'emberleaf',4);choose(g,'greyhavenMerchant','trade');choose(g,'greyhavenLedger','report');choose(g,'corvenDask','controlled');setStoryFlag(g.player,'order.doctrine');tick(g);
  choose(g,'derrenHale','examine');choose(g,'greyhavenAttendant','choice');assert.equal(o.shelterOutcome,'covenant');choose(g,'greyhavenMael','thanks');choose(g,'greyhavenLedger','service');tick(g,12);
  for(let i=1;i<=9;i++)assert(g.player.quests.completed[`yourOrder${i}`],`quest ${i}`);
  const saved=createSaveState(g),restored=migrateSaveState(JSON.parse(JSON.stringify(saved)),world,createPlayer('Fallback')).player;
  assert.equal(restored.yourOrder.name,'Test Fellowship');assert.equal(Object.keys(restored.yourOrder.members).length,3);assert(getStoryFlag(restored,'order.recognized'));assert(restored.campaignKills.greyhavenBeastA);
});
check('transient contextual dialogue survives save and restore',()=>{const g=game();setStage(g,'act1HearthmereAshes','handsThatStillWork');openDialogue(g.dialogue,{id:'bram',npcId:'bram',name:'Bram'},g.player,g.world);const snapshot=JSON.parse(JSON.stringify(serializeDialogueState(g.dialogue))),d=createDialogueState();assert(restoreDialogueState(d,snapshot,g.player,g.world));assert(d.options.some(o=>o.id==='record'));});
check('custody cannot be duplicated by legacy evidence recovery',()=>{
 const g=game();g.world=world;setStage(g,'mercy_in_orrakai','returnOldWellEvidence');setStoryFlag(g.player,'mercy.evidenceReported');setStoryFlag(g.player,'mercy.lanternWithMael');updateOldWellQuest(g);assert(!getStoryFlag(g.player,'mercy.brokenLanternHeld'));
});
check('lantern is guaranteed at the defeated beast and cannot be collected twice',()=>{
 const g=game();g.world=createWorld();setStage(g,'mercy_in_orrakai','investigateOldWell');updateOldWellQuest(g);
 const beast=g.world.enemies.find(e=>e.id==='oldWellLastDawnRitualist');assert.equal(beast.name,'Blighted Beast');
 const lantern=g.world.objects.find(o=>o.id==='oldWellBrokenLantern');assert(!lantern.interactable);
 Object.assign(beast,{x:54*32,y:67*32});markKillObjective(g.player,beast);updateOldWellQuest(g);assert(lantern.interactable);assert.equal(lantern.x,beast.x);assert.equal(lantern.y,beast.y);
 setStoryFlag(g.player,'mercy.brokenLanternAcquired');updateOldWellQuest(g);assert(!lantern.interactable);
});
for(const operation of ['relief','security','recovery','trade'])check(`Order undertaking ${operation}`,()=>{
 const g=game();g.world=world;setStoryFlag(g.player,'order.founded');setStoryFlag(g.player,'order.staffed');const o=ensureOrder(g.player);o.members.pellRusk={id:'pellRusk',name:'Pell',consented:true,assigned:true,role:'scouting'};tick(g);
 choose(g,'greyhavenLedger',operation);
 if(operation==='relief'){addItem(g.player,'fieldRations',6);choose(g,'greyhavenFamily','deliver');assert.equal(countItem(g.player,'fieldRations'),0);}
 if(operation==='security'){for(const id of ['greyhavenRoadBeastA','greyhavenRoadBeastB'])markKillObjective(g.player,{id,questEncounter:'greyhaven'});tick(g);}
 if(operation==='recovery')handleCampaignInteraction(g,{campaignAction:'archive'});
 if(operation==='trade'){addItem(g.player,'emberleaf',4);choose(g,'greyhavenMerchant','trade');}
 assert(o.operationReady);choose(g,'greyhavenLedger','report');assert(getStoryFlag(g.player,'order.operation'));
});
for(const [decision,medical,outcome]of [['transfer',false,'covenant'],['choice',true,'sheltered'],['onsite',false,'covenant'],['refuse',false,'negligence']])check(`shelter ${decision}, stocked=${medical}`,()=>{
 const g=game(),o=ensureOrder(g.player);o.facilities.medicine=medical;o.food=6;setStoryFlag(g.player,'order.doctrine');choose(g,'derrenHale','examine');choose(g,'greyhavenAttendant',decision);assert.equal(o.shelterOutcome,outcome);
 if(outcome==='covenant'){tick(g);assert(g.world.objects.some(a=>a.npcId==='lysaHale'));}
 if(outcome==='negligence'){o.facilities.medicine=true;tick(g);assert.equal(o.shelterOutcome,'sheltered');assert.equal(o.food,4);}
});
check('hostile recruitment is refused, supplies can repair trust, duties remain',()=>{
 const g=game();setStoryFlag(g.player,'order.founded');const o=ensureOrder(g.player);o.relationships.tavinHolt=-10;choose(g,'tavinHolt','recruitOrder');assert(!o.members.tavinHolt);addItem(g.player,'fieldRations',4);choose(g,'greyhavenLedger','donate');choose(g,'tavinHolt','recruitOrder');assert(o.members.tavinHolt);choose(g,'wardenMael','recruitOrder');assert(!o.members.wardenMael);
});
check('unrelated demon boss cannot trigger Malakar story',()=>{
 const g=game();applyBossStoryProgress({id:'ordinaryDemon',bossId:'malakarSolgateDemonLord',isBoss:true,isDungeonMainBoss:true},g.player,{dungeonId:'randomDemonCave'});assert(!getStoryFlag(g.player,'story.malakarDefeated'));
});
fs.mkdirSync('docs/act1-campaign',{recursive:true});fs.writeFileSync('docs/act1-campaign/verification.json',JSON.stringify(report,null,2));if(report.failures.length)process.exitCode=1;
