import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {startQuest,ensurePlayerDialogueAndQuestState,markNpcTalkObjective} from '../src/dialogueSystem.js';
import {getQuest} from '../src/worldContent.js';

const id='mercy_in_orrakai',definition=getQuest(id);
const index=definition.stages.findIndex(s=>s.id==='aidPlagueTents'),stage=definition.stages[index];
assert.equal(stage.objectives.length,3);
assert(!stage.objectives.some(o=>o.npcId==='orrakaiRefugeeParent'));
for(const completed of [0,1,2,3]){
 const p=createPlayer('Legacy aid');startQuest(p,id);const q=p.quests.active[id];
 Object.assign(q,{stageIndex:index,currentStageId:stage.id,objectives:[
  ...stage.objectives.map((o,i)=>({...o,current:i<completed?1:0})),
  {type:'talk',npcId:'orrakaiRefugeeParent',required:1,current:0,label:'Check on the refugee family near the chapel square'}
 ]});
 const loaded=JSON.parse(JSON.stringify(p));ensurePlayerDialogueAndQuestState(loaded);
 const active=loaded.quests.active[id];
 assert(!active.objectives.some(o=>o.npcId==='orrakaiRefugeeParent'));
 if(completed===3)assert.equal(active.currentStageId,'reportToWardenMael');
 else{
  assert.equal(active.currentStageId,'aidPlagueTents');
  assert.deepEqual(active.objectives.map(o=>o.current),stage.objectives.map((_,i)=>i<completed?1:0));
  for(const o of stage.objectives.slice(completed))markNpcTalkObjective(loaded,o.npcId);
  assert.equal(active.currentStageId,'reportToWardenMael');
 }
 ensurePlayerDialogueAndQuestState(loaded);
 assert.equal(active.currentStageId,'reportToWardenMael','Repeated normalization preserves the next stage');
}
console.log('PASS legacy aid saves retain partial progress and advance after the three remaining tasks');
