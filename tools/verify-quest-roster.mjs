import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PLAYABLE_QUEST_IDS,isQuestEnabled,retireRemovedQuestState,dialogueReferencesRemovedQuest} from '../src/questRoster.js';
import {getAllQuests,getQuest,DIALOGUES,NPCS} from '../src/worldContent.js';
import {STORY_DIALOGUE_TRIGGERS} from '../src/dialogueData.js';
import {CAMPAIGN_DIALOGUES} from '../src/act1CampaignData.js';
import {IRON_MIRE_DIALOGUES} from '../src/ironMireData.js';
import {createPlayer,addItem} from '../src/player.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {createWorld} from '../src/world.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {updateAct1Campaign,installCampaignWorld} from '../src/act1CampaignRuntime.js';
import {createDialogueState,openDialogue,closeDialogue,updateDialogue,chooseDialogueOption,startQuest,ensurePlayerDialogueAndQuestState,npcHasQuestInteraction,restoreDialogueState,serializeDialogueState} from '../src/dialogueSystem.js';
import {buildRadarQuestTargets,classifyRadarMarker,RADAR_COLORS} from '../src/minimapRadar.js';
import {isQuestObjectVisible} from '../src/questInteractables.js';
import {talkWarden} from '../src/gameInteraction.js';

const removed=['hollowCrown','solgateOath','firstOath','roadsGoneQuiet','ironForMara','candlesInTheChapel','theVeyrBloodline','theBlackSpire','rootsRemember','ironMireSalvage','beneathTheRedSeal','roadlessJustice','embersOnTheRoad','buriedName','wrongByMorning','silverInTheRiver','facesInTheWater','lanternsInTheMire','theRidgeLooksBack',
  ...Array.from({length:9},(_,i)=>`yourOrder${i+1}`),'maraRootsInAsh','bramLanternDrill','duskNamesForTheDead','elianTheOathAndTheChain','cambionAshenPact','nephilimBrokenHalo','ashenOrchardLastHarvest','ruinedChapelFireCouldNotErase','firstOathLegacy','hungryShrineLegacy','humanBeginningLegacy'];
const report={checks:[]};
function check(name,fn){fn();report.checks.push(name);console.log('PASS '+name);}
const game=()=>({player:createPlayer('Quest roster review'),world:createCapitalHubWorld(),dialogue:createDialogueState(),log(){},camera:{x:0,y:0},canvas:{width:1280,height:800}});

check('registry contains exactly the approved campaign and four optional quest IDs',()=>{
 assert.deepEqual(getAllQuests().map(q=>q.id).sort(),[...PLAYABLE_QUEST_IDS].sort());
 for(const id of removed)assert.equal(getQuest(id),null,id);
 for(const npc of Object.values(NPCS))for(const id of npc.questIds||[])assert(isQuestEnabled(id),`${npc.id}: ${id}`);
});
check('retired quests cannot be started, including saved organization and other bloodline paths',()=>{
 const p=createPlayer('Retired offers');const before=JSON.stringify({inventory:p.inventory,gold:p.gold,story:p.story});
 for(const id of removed)assert.equal(startQuest(p,id),false,id);
 assert.equal(JSON.stringify({inventory:p.inventory,gold:p.gold,story:p.story}),before);
});
check('authored dialogue contains no retired quest references or organization assignments',()=>{
 for(const [id,node] of Object.entries({...DIALOGUES,...STORY_DIALOGUE_TRIGGERS,...CAMPAIGN_DIALOGUES,...IRON_MIRE_DIALOGUES})){
  for(const option of node.options||[])assert(!dialogueReferencesRemovedQuest(option),`${id}/${option.id}`);
 }
});
function seedOldQuests(p){
 p.questState ||= {};
 for(const collection of ['active','completed','failed']){
  p.quests[collection] ||= {};p.questState[collection] ||= {};
  for(const id of removed){const q={id,title:'Removed quest',objectives:[{type:'talk',npcId:'bram',required:1,current:0}],readyToTurnIn:true};p.quests[collection][id]=q;p.questState[collection][id]={...q};}
 }
 p.questState.activeQuestId='bramLanternDrill';p.questState.recentlyUpdated=[{questId:'firstOath',text:'Old task'},{questId:'mercy_in_orrakai',text:'Current task'}];p.questState.recentlyCompleted=[{id:'hungryShrineLegacy'}];p.questProgress={firstOath:2,groveLastLullaby:{stage:'unbind'}};
 p.quest.firstOath=3;p.quest.hungryShrine=1;
}
check('save normalization removes old logs/trackers without mutating source or character rewards',()=>{
 const g=game(),p=g.player;startQuest(p,'mercy_in_orrakai');const stage=structuredClone(p.quests.active.mercy_in_orrakai);seedOldQuests(p);
 p.gold=297;addItem(p,'ironScrap',7);p.spiritAwakened=true;p.bloodline={id:'vampire'};p.yourOrder={name:'Existing refuge',members:{pellRusk:{consented:true}},shelterOutcome:'covenant'};
 const owned=()=>({quests:p.quests,questState:p.questState,questProgress:p.questProgress,inventory:p.inventory,gold:p.gold,yourOrder:p.yourOrder});
 const before=structuredClone(owned()),clean=normalizeProfileSave(p);
 assert.deepEqual(owned(),before,'retiring saved tasks mutated live quest or reward records');
 for(const collection of ['active','completed','failed'])for(const id of Object.keys(clean.quests[collection]||{}))assert(isQuestEnabled(id));
 assert.deepEqual(clean.quests.active.mercy_in_orrakai,stage);assert.equal(clean.questState.activeQuestId,null);assert.deepEqual(clean.questState.recentlyUpdated,[{questId:'mercy_in_orrakai',text:'Current task'}]);assert.deepEqual(clean.questState.recentlyCompleted,[]);assert.deepEqual(clean.questProgress,{groveLastLullaby:{stage:'unbind'}});
 assert.equal(clean.gold,297);assert(clean.inventory.some(i=>i.id==='ironScrap'&&i.qty===7));assert.equal(clean.spiritAwakened,true);assert.equal(clean.bloodline.id,'vampire');assert.deepEqual(clean.yourOrder,p.yourOrder);
 const saved=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,saved));assert.deepEqual(g.player.quests.active.mercy_in_orrakai,stage);
 for(let i=0;i<3;i++){ensurePlayerDialogueAndQuestState(g.player);retireRemovedQuestState(g.player);}
 assert(!g.player.quests.active.firstOathLegacy);assert(!g.player.quests.active.hungryShrineLegacy);
});
check('retired NPCs have no overhead quest predicate or blue radar even before old logs are migrated',()=>{
 const g=game();seedOldQuests(g.player);const objects=g.world.objects;
 const bram=objects.find(o=>o.npcId==='bram');assert(bram);
 assert.equal(npcHasQuestInteraction(g.player,bram),false);
 const targets=buildRadarQuestTargets(g.player,objects);
 assert.equal(classifyRadarMarker(bram,'object',targets)?.color,RADAR_COLORS.friendly);
 for(const id of removed)assert(!targets.questIds.has(id));
 const stale={id:'old-giver',kind:'npc',npcId:'old-giver',disposition:'friendly',questRelated:true,isQuestGiver:true,questIds:['firstOath','maraRootsInAsh']};
 assert.equal(classifyRadarMarker(stale,'object',targets)?.color,RADAR_COLORS.friendly);
 const personal=createPlayer('P2');personal.questOwner=g.player;seedOldQuests(personal);assert(!npcHasQuestInteraction(personal,bram));assert.equal(classifyRadarMarker(bram,'object',buildRadarQuestTargets(personal,objects))?.color,RADAR_COLORS.friendly);
});
check('current NPC markers, Grove/Orchard/Iron Mine/Veyreign offers and workshop service survive',()=>{
 const g=game(),p=g.player;startQuest(p,'mercy_in_orrakai');const mara={id:'mara',npcId:'maraVell',kind:'npc'};assert(npcHasQuestInteraction(p,mara));
 const surface=createWorld();installCampaignWorld(surface);const objects=surface.continentRuntime.allObjects;
 for(const [npcId,questId] of [['mineDrifter','ironMireLastShift'],['orchardReliefEngineer','orchardBelowTheBurn'],['lordVeyrShade','vampireRedChalice']]){
  const npc=objects.find(o=>o.npcId===npcId);assert(npc,npcId);assert(openDialogue(g.dialogue,npc,p,surface));assert(g.dialogue.options.some(o=>o.startsQuest===questId),npcId);assert(!g.dialogue.options.some(o=>dialogueReferencesRemovedQuest(o)));
  updateDialogue(g.dialogue,100);assert(chooseDialogueOption(g.dialogue,p,surface,g.dialogue.options.findIndex(o=>o.startsQuest===questId)));assert(p.quests.active[questId],`${npcId}: acceptance must actually start the retained quest`);
 }
 const smith=g.world.objects.find(o=>o.workshopService==='blacksmith');assert(smith);assert(openDialogue(g.dialogue,smith,p,g.world));assert(g.dialogue.options.some(o=>o.action==='workshopWeapons'));assert(!g.dialogue.options.some(o=>o.startsQuest));
 assert.equal(getQuest('groveLastLullaby').giverNpcId,'groveRootkeeper');
});
check('old saved conversations reopen current dialogue; stale choices cannot grant rewards or assignments',()=>{
 const g=game(),bram=g.world.objects.find(o=>o.npcId==='bram');const snapshot={active:true,dialogueId:'old:bram',currentNodeId:'old:bram',npcObjectId:bram.id,npcId:'bram',lineComplete:true,history:[{text:'Bring supplies for the Lantern Drill'}],transientNodes:{'old:bram':{id:'old:bram',text:'Collect supplies for my drill.',options:[{id:'quest',label:'Accept old task',startsQuest:'bramLanternDrill'}]}}};
 assert(restoreDialogueState(g.dialogue,snapshot,g.player,g.world));assert(!g.dialogue.fullText.includes('Collect supplies'));assert(!g.dialogue.options.some(o=>o.startsQuest==='bramLanternDrill'));assert(!JSON.stringify(g.dialogue.history).includes('Lantern Drill'));assert(g.dialogue.options.some(o=>o.id==='train'));
 g.dialogue.options=[{id:'stale',startsQuest:'bramLanternDrill',rewardItems:[['ashCoin',500]]}];const gold=g.player.gold;assert.equal(chooseDialogueOption(g.dialogue,g.player,g.world,0),false);assert.equal(g.player.gold,gold);
 g.dialogue.options=[{id:'staleOrder',orderAction:{type:'charter'}}];assert.equal(chooseDialogueOption(g.dialogue,g.player,g.world,0),false);
 closeDialogue(g.dialogue,{immediate:true});assert.equal(serializeDialogueState(g.dialogue),null);
});
check('saved organization flags never restart the removed chain, while past world outcomes remain',()=>{
 const g=game();g.world=createWorld();g.player.quests.completed.mercy_in_orrakai={id:'mercy_in_orrakai'};g.player.story.flags.order={met:true,metIona:true,metPell:true,founded:true,recognized:true};
 g.player.yourOrder={name:'Kept Refuge',banner:'tree',color:'green',members:{},relationships:{},facilities:{medicine:true},operations:{},food:6};
 for(let i=0;i<4;i++)updateAct1Campaign(g,.3);
 assert(g.player.quests.active.act1HearthmereAshes);assert(!Object.keys(g.player.quests.active).some(id=>id.startsWith('yourOrder')));
 for(const id of ['greyhavenLedger','greyhavenCistern','greyhavenRecords']){const o=g.world.continentRuntime.allObjects.find(o=>o.id===id);assert(o);assert(o.interactable===false||!isQuestObjectVisible(o,g.player));}
 assert.equal(g.player.yourOrder.name,'Kept Refuge');assert(g.player.story.flags.order.recognized);
 for(const id of ['tavinHolt','ionaVey','pellRusk']){const npc=g.world.continentRuntime.allObjects.find(o=>o.npcId===id);assert(openDialogue(g.dialogue,npc,g.player,g.world));assert(!g.dialogue.options.some(o=>o.orderAction||['foundOrder','orderLedger'].includes(o.action)));}
});
check('legacy direct Warden interaction never reintroduces First Oath or spends materials',()=>{
 const g=game();g.player.quest.firstOath=1;g.player.quest.hollowlings=3;addItem(g.player,'emberleaf',3);addItem(g.player,'ironOre',2);const inventory=JSON.stringify(g.player.inventory),gold=g.player.gold;
 talkWarden(g);assert.equal(JSON.stringify(g.player.inventory),inventory);assert.equal(g.player.gold,gold);assert.equal(g.player.quest.firstOath,1);assert(!g.player.quests.active.firstOath);
});
fs.mkdirSync('docs/quest-roster',{recursive:true});fs.writeFileSync('docs/quest-roster/verification.json',JSON.stringify(report,null,2));
console.log(`Verified ${report.checks.length} quest-roster groups.`);
