import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../src/world.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createPlayer} from '../src/player.js';
import {installCampaignWorld} from '../src/act1CampaignRuntime.js';
import {updateOldWellQuest} from '../src/oldWellSystem.js';
import {ALL_RUNALIS_QUESTS} from '../src/questData.js';
import {startQuest,createDialogueState} from '../src/dialogueSystem.js';
import {isQuestObjectVisible} from '../src/questInteractables.js';
import {getQuestEvidenceArt,QUEST_EVIDENCE_ART} from '../src/questObjectArt.js';
import {nearestObject} from '../src/gameInteraction.js';
import {buildRadarQuestTargets,classifyRadarMarker} from '../src/minimapRadar.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const p=createPlayer('Evidence audit'),w=createWorld();installCampaignWorld(w);updateOldWellQuest({player:p,world:w});
const evidence=[...w.continentRuntime.allObjects,...w.objects,...createCapitalHubWorld().objects].filter((o,i,a)=>o.kind==='poiInvestigation'&&a.findIndex(v=>v.id===o.id)===i);
const audit=[];
for(const o of evidence){
 assert(!isQuestObjectVisible(o,p),`${o.id}: visible without a relevant quest`);
 const actor={...p,x:o.x,y:o.y};assert.equal(nearestObject({player:actor,world:{objects:[o]}}),null);assert.equal(classifyRadarMarker(o,'object',buildRadarQuestTargets(p,[o])),null);
 const stages=[];
 for(const q of Object.values(ALL_RUNALIS_QUESTS))for(const s of q.stages||[]){
  const sample={...p,quests:{active:{[q.id]:{id:q.id,currentStageId:s.id,objectives:s.objectives}},completed:{}}};
  if(isQuestObjectVisible({...o,interactable:true},sample))stages.push(`${q.id}/${s.id}`);
 }
 assert(stages.length,`${o.id}: no reachable quest step`);const art=getQuestEvidenceArt(o);assert(QUEST_EVIDENCE_ART.includes(art));audit.push({id:o.id,art,stages});
}
console.log(`PASS all ${audit.length} overworld/town evidence objects have art and reachable quest gates; no early scene, prompt or radar visibility`);
const setStage=(p,id,stage)=>{startQuest(p,id);const q=p.quests.active[id],i=ALL_RUNALIS_QUESTS[id].stages.findIndex(s=>s.id===stage),s=ALL_RUNALIS_QUESTS[id].stages[i];Object.assign(q,{stageIndex:i,currentStageId:s.id,objectives:s.objectives.map(o=>({...o,current:0}))});};
const manifest=evidence.find(o=>o.id==='act1CargoManifest');setStage(p,'act1HearthmereAshes','aLanternInTheMud');assert(isQuestObjectVisible(manifest,p));setStage(p,'act1HearthmereAshes','handsThatStillWork');assert(!isQuestObjectVisible(manifest,p));
const orchard=evidence.find(o=>o.id==='familyTable');setStage(p,'act1HearthmereAshes','theWoundSpreads');assert(isQuestObjectVisible(orchard,p));setStage(p,'act1HearthmereAshes','failedPurificationSite');assert(!isQuestObjectVisible(orchard,p));startQuest(p,'ashenOrchardLastHarvest');assert(isQuestObjectVisible(orchard,p));setStage(p,'ashenOrchardLastHarvest','whatWillRemain');assert(!isQuestObjectVisible(orchard,p));
const chapel=evidence.find(o=>o.id==='chapelLedger');setStage(p,'act1HearthmereAshes','theBrokenChapel');assert(isQuestObjectVisible(chapel,p));setStage(p,'act1HearthmereAshes','theRedSeal');assert(!isQuestObjectVisible(chapel,p));startQuest(p,'ruinedChapelFireCouldNotErase');assert(isQuestObjectVisible(chapel,p));setStage(p,'ruinedChapelFireCouldNotErase','commitment');assert(!isQuestObjectVisible(chapel,p));console.log('PASS main/side quest stage changes expose evidence only while an investigation needs it');
const g={player:createPlayer('Well evidence'),world:w,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){}};setStage(g.player,'mercy_in_orrakai','investigateOldWell');updateOldWellQuest(g);
const lantern=w.objects.find(o=>o.id==='oldWellBrokenLantern');assert(!isQuestObjectVisible(lantern,g.player));g.player.campaignKills={oldWellLastDawnRitualist:true};updateOldWellQuest(g);assert(isQuestObjectVisible(lantern,g.player));g.player.story.flags.mercy={brokenLanternAcquired:true};updateOldWellQuest(g);assert(!isQuestObjectVisible(lantern,g.player));console.log('PASS protected lantern appears after the beast and disappears on collection');
const before=evidence.filter(o=>isQuestObjectVisible(o,p)).map(o=>o.id);const saved={player:p,world:createCapitalHubWorld(),dialogue:createDialogueState(),canvas:g.canvas,camera:g.camera,log(){}};assert(applySaveToGame(saved,JSON.parse(JSON.stringify(createSaveState(saved)))));assert.deepEqual(evidence.filter(o=>isQuestObjectVisible(o,saved.player)).map(o=>o.id),before);
const guest={questOwner:p,quests:{active:{},completed:{}}};assert.equal(isQuestObjectVisible(chapel,guest),isQuestObjectVisible(chapel,p));assert(isQuestObjectVisible({id:'maraHomeEntrance',campaignAction:'maraHome'},p));assert(isQuestObjectVisible({kind:'npc',npcId:'orrakaiLowerGateGuard'},p));console.log('PASS visibility survives save/load and follows shared quest ownership; stairs and residents remain available');
fs.mkdirSync('docs/quest-interactables',{recursive:true});fs.writeFileSync('docs/quest-interactables/audit.json',JSON.stringify(audit,null,2));
