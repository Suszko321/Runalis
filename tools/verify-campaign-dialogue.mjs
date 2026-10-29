import assert from 'node:assert/strict';
import {createPlayer,migratePlayer} from '../src/player.js';
import {createDialogueState,openDialogue,closeDialogue,chooseDialogueOption,updateDialogue,updateDialogueInput,startQuest,serializeDialogueState,restoreDialogueState} from '../src/dialogueSystem.js';
import {CAMPAIGN_ID,CAMPAIGN_STAGES,CAMPAIGN_DIALOGUES} from '../src/act1CampaignData.js';
import {FIELD_CONVERSATIONS} from '../src/campaignFieldConversations.js';
import {getCampaignConversation} from '../src/campaignConversations.js';
import {getStoryFlag,setStoryFlag} from '../src/storyProgress.js';
const check=(name,fn)=>{fn();console.log('PASS',name);};
function setup(stage,npcId){
 const p=createPlayer('Dialogue regression');p.quests.completed.mercy_in_orrakai={};startQuest(p,CAMPAIGN_ID);const q=p.quests.active[CAMPAIGN_ID],index=CAMPAIGN_STAGES.findIndex(s=>s.id===stage),def=CAMPAIGN_STAGES[index];Object.assign(q,{stageIndex:index,currentStageId:stage,objectives:def.objectives.map(o=>({...o,current:0}))});
 const npc={id:'test-'+npcId,kind:'npc',npcId,name:npcId,dialogueId:'bramTrainerDialogue',x:400,y:400},w={mode:'maraHouse',objects:[npc],enemies:[]},d=createDialogueState();return {p,w,d,npc,open(){assert(openDialogue(d,npc,p,w));updateDialogue(d,100);},choose(id){updateDialogue(d,100);const i=d.options.findIndex(o=>o.id===id&&!o.disabled);assert(i>=0,`${stage}/${npcId}: ${id} unavailable (${d.options.map(o=>o.id)})`);assert(chooseDialogueOption(d,p,w,i));},reply(){for(let i=0;i<8&&d.active&&d.speakerId==='player';i++){updateDialogue(d,100);updateDialogueInput(d,{confirmPressed:true,confirmHeld:false},p,w);}updateDialogue(d,100);},close(){closeDialogue(d,{immediate:true});}};
}
check('every mandatory field scene has distinct player lines, substantive questions and remembered follow-ups',()=>{
 const commitments=new Set();let scenes=0;
 for(const [stage,npcs]of Object.entries(FIELD_CONVERSATIONS))for(const [npcId,scene]of Object.entries(npcs)){
  const c=setup(stage,npcId);c.open();const opening=c.d.fullText;assert.equal(opening,scene.text);assert(scene.topics.length>=3);assert(!c.d.options.some(o=>/Record the account|Remind me how to reach/.test(o.label||'')));assert(!commitments.has(scene.commit[0]));commitments.add(scene.commit[0]);
  c.choose('topic-'+scene.topics[0][0]);assert.equal(c.d.speakerId,'player');assert.equal(c.d.fullText,scene.topics[0][1]);c.reply();assert.equal(c.d.speakerId,npcId);assert.equal(c.d.fullText,scene.topics[0][2]);assert(!c.d.options.some(o=>o.id==='topic-'+scene.topics[0][0]));assert.equal(c.p.quests.active[CAMPAIGN_ID].currentStageId,stage);
  c.close();const copy=JSON.parse(JSON.stringify(c.p));migratePlayer(copy);const reopened=getCampaignConversation(c.npc,copy,c.w);assert.equal(reopened.text,scene.again);assert(!reopened.options.filter(o=>!o.excludesFlags?.some(f=>getStoryFlag(copy,f))).some(o=>o.id==='topic-'+scene.topics[0][0]));
  c.open();c.choose('record');c.reply();c.close();const followup=getCampaignConversation(c.npc,c.p,c.w);if(c.p.quests.active[CAMPAIGN_ID]?.currentStageId===stage)assert.equal(followup.text,scene.reported);else assert.notEqual(followup.text,scene.text);assert(!followup.options.some(o=>o.id==='record'));scenes++;
 }
 assert.equal(scenes,9);
});
check('co-op actors use the shared main-quest stage and can advance it without generic fallback dialogue',()=>{
 const c=setup('handsThatStillWork','act1ReliefScout'),guest=createPlayer('Guest');guest.questOwner=c.p;const d=createDialogueState();assert(openDialogue(d,c.npc,guest,c.w));assert.equal(d.dialogueId,'campaign:handsThatStillWork:act1ReliefScout');updateDialogue(d,100);const i=d.options.findIndex(o=>o.id==='record');assert(chooseDialogueOption(d,guest,c.w,i));assert(c.p.quests.active[CAMPAIGN_ID].currentStageId!=='handsThatStillWork'||c.p.quests.active[CAMPAIGN_ID].objectives.find(o=>o.type==='talk').current===1);assert(c.p.locationKnowledge.ashenOrchard&&guest.locationKnowledge.ashenOrchard);
});
check('co-op regulator dialogue remembers the shared sequence and completes it for the host',()=>{
 const c=setup('theBrokenChapel','act1Regulator'),guest=createPlayer('Guest');guest.questOwner=c.p;const d=createDialogueState();for(const word of ['drain','align','light']){assert(openDialogue(d,c.npc,guest,c.w));updateDialogue(d,100);assert(chooseDialogueOption(d,guest,c.w,d.options.findIndex(o=>o.id===word)));closeDialogue(d,{immediate:true});}assert(getStoryFlag(c.p,'act1.machineAligned'));assert(getStoryFlag(guest,'act1.machineAligned'));
});
check('a host asking optional questions does not erase an unread guest’s responses',()=>{
 const c=setup('theBrokenChapel','chapelHermit');for(const [id]of FIELD_CONVERSATIONS.theBrokenChapel.chapelHermit.topics)setStoryFlag(c.p,`campaignAsked.theBrokenChapel_chapelHermit_${id}`);const guest=createPlayer('Guest');guest.questOwner=c.p;const d=createDialogueState();assert(openDialogue(d,c.npc,guest,c.w));assert.equal(d.options.filter(o=>o.id?.startsWith('topic-')).length,3);
});
check('a second chapel visit acknowledges an existing account while other objectives are unfinished',()=>{
 const c=setup('theBrokenChapel','chapelHermit');c.p.quests.active[CAMPAIGN_ID].objectives.find(o=>o.npcId==='chapelHermit').current=1;c.open();assert.equal(c.d.fullText,FIELD_CONVERSATIONS.theBrokenChapel.chapelHermit.reported);assert(!c.d.options.some(o=>o.id==='record'));
});
check('Bram keeps training and work choices; Mara retains access to Thornbinding',()=>{
 const c=setup('aLanternInTheMud','bram');assert.equal(getCampaignConversation(c.npc,c.p,c.w),null);c.open();assert(c.d.options.some(o=>o.id==='train'));assert(c.d.options.some(o=>o.id==='quest'));
 const m=setup('failedPurificationSite','maraVell');m.open();assert(m.d.options.some(o=>o.id==='training'));m.choose('training');m.reply();assert.equal(m.d.currentNodeId,'maraTrainerDialogue');
});
check('the marked patient and completed campaign do not replay earlier introductions',()=>{
 const c=setup('aLanternInTheMud','act1MarkedVillager');setStoryFlag(c.p,'mercy.riteFinished');setStoryFlag(c.p,'mercy.markedHeard');c.open();assert(!c.d.fullText.includes('The gate opens'));assert(!c.d.options.some(o=>o.id==='record'));
 const m=setup('ashesOfOrrakai','wardenMael');delete m.p.quests.active[CAMPAIGN_ID];m.p.quests.completed[CAMPAIGN_ID]={};m.open();assert(m.d.dialogueId.includes('followup:aftermath'));assert(!m.d.fullText.includes('caravan survivor'));
});
check('Mara remembers recovery questions and keeps the next step behind those answers',()=>{
 const p=createPlayer('Opening'),npc={id:'mara',npcId:'maraVell',name:'Mara Vell',dialogueId:'maraMercyOpening'},w={mode:'maraHouse',objects:[npc]},d=createDialogueState();assert(openDialogue(d,npc,p,w));assert(!d.options.some(o=>o.id==='next'&&!o.disabled));updateDialogue(d,100);assert(chooseDialogueOption(d,p,w,d.options.findIndex(o=>o.id==='where')));closeDialogue(d,{immediate:true});assert(openDialogue(d,npc,p,w));assert(!d.options.some(o=>o.id==='where'&&!o.disabled));
});
check('a reply follows the actual speaker after Mael enters Mara’s conversation',()=>{
 const c=setup('aLanternInTheMud','maraVell');delete c.p.quests.active[CAMPAIGN_ID];delete c.p.quests.completed.mercy_in_orrakai;startQuest(c.p,'mercy_in_orrakai');c.p.quests.active.mercy_in_orrakai.currentStageId='returnToMara';c.open();c.choose('investigate');c.reply();updateDialogueInput(c.d,{confirmPressed:true,confirmHeld:false},c.p,c.w);updateDialogue(c.d,100);assert.equal(c.d.speakerId,'wardenMael');c.choose('rest');c.reply();assert.equal(c.d.speakerId,'wardenMael');assert.equal(c.d.speakerName,'Warden Mael');
});
check('persistent effects use the authored choice identity rather than an ephemeral reply node',()=>{
 const id='dialogueRepeatRegression';CAMPAIGN_DIALOGUES[id]={id,speaker:'Witness',speakerId:'testWitness',appendNpcQuestOptions:false,text:'Ask your questions.',options:[{id:'question',label:'What happened?',response:'A cart left before dawn.'},{id:'thanks',label:'Thank you.',response:'You are welcome.',karma:{wardens:5}}]};
 try{const p=createPlayer('Reward regression'),npc={id:'witness',npcId:'testWitness',dialogueId:id},w={mode:'capital',objects:[npc]},d=createDialogueState();
  const choose=id=>{updateDialogue(d,100);assert(chooseDialogueOption(d,p,w,d.options.findIndex(o=>o.id===id)));while(d.speakerId==='player'){updateDialogue(d,100);updateDialogueInput(d,{confirmPressed:true,confirmHeld:false},p,w);}updateDialogue(d,100);};
  openDialogue(d,npc,p,w);choose('question');choose('thanks');const rep=p.factionReputation.wardens;closeDialogue(d,{immediate:true});openDialogue(d,npc,p,w);choose('thanks');assert.equal(p.factionReputation.wardens,rep);
 }finally{delete CAMPAIGN_DIALOGUES[id];}
});
check('legacy saved placeholder conversations refresh without granting quest credit',()=>{
 const c=setup('theCovenantBlessing','lightwardenCaelen');c.open();const save=JSON.parse(JSON.stringify(serializeDialogueState(c.d)));save.transientNodes[save.dialogueId].options=[{id:'record',label:'Record the account.',response:'You keep the account with the evidence in your journal.'}];const d=createDialogueState();assert(restoreDialogueState(d,save,c.p,c.w));assert(d.options.some(o=>o.id==='topic-fire'));assert(!d.options.some(o=>o.label==='Record the account.'));assert.equal(c.p.quests.active[CAMPAIGN_ID].currentStageId,'theCovenantBlessing');
});
