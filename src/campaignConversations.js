import {CAMPAIGN_ID,ACT1_ROUTES,CAMPAIGN_DIALOGUES,CAMPAIGN_STAGES} from './act1CampaignData.js';
import {getStoryFlag} from './storyProgress.js';
import {GROVE_DIALOGUES,GROVE_QUEST} from './blightedGroveData.js';
import {ORCHARD_DIALOGUES,ORCHARD_QUEST} from './ashenOrchardData.js';
import {fieldConversation,campaignFollowup} from './campaignFieldConversations.js';

export function getCampaignConversation(npc,p,world){
 if(!p)return null;
 const progress=p.questOwner||p,id=npc.npcId,mercy=progress.quests?.active?.mercy_in_orrakai?.currentStageId;
 const select=key=>CAMPAIGN_DIALOGUES[key];
 const reminder=(key,text,options=[])=>({id:`campaign:${key}:${id}`,speaker:npc.name,speakerId:id,text,options,appendNpcQuestOptions:false});
 if(id==='orchardReliefEngineer'&&p.quests?.completed?.[ORCHARD_QUEST])return reminder('orchardEngineerAfter','“Tamsin’s report matches the pressure readings. We can reopen the clean channels a section at a time. We owe you a road that stays open, not another promise to burn the problem away.”',[
  {id:'repairs',label:'Can the camp use the water safely now?',response:'“The damaged returns stay isolated until we replace them. Clearing the cistern lets us repair the works without feeding the growth.”'}]);
 if(id==='orchardReliefEngineer'&&!p.quests?.completed?.[ORCHARD_QUEST]){const s=p.quests?.active?.[ORCHARD_QUEST]?.currentStageId;return ORCHARD_DIALOGUES[s==='report'?'orchardEngineerReport':s?'orchardEngineerWaiting':'orchardEngineerAssignment'];}
 if(id==='orchardTamsin'){
  if(p.quests?.completed?.[ORCHARD_QUEST]||p.completedDungeons?.ashenOrchard)return reminder('tamsinAfter','Tamsin eases her good hand away from the pipe. “The pressure has fallen. For the first time since I came down here, I can hear the camp above us.”',[
   {id:'rest',label:'You can go back to the healers now.',response:'“As soon as I have checked this last fitting. Yes, I know how that sounds. Thank you for coming down after me.”',closeAfterResponse:true}]);
  return ORCHARD_DIALOGUES[p.quests?.active?.[ORCHARD_QUEST]?.currentStageId==='attendant'?'orchardTamsin':'orchardTamsinWaiting'];
 }
 if(id==='groveRootkeeper'){const s=p.quests?.active?.[GROVE_QUEST]?.currentStageId;return GROVE_DIALOGUES[p.quests?.completed?.[GROVE_QUEST]?'groveEddaSilent':s==='listen'?'groveEdda':s==='rest'?'groveEddaRest':'groveEddaWaiting'];}
 if(id==='act1Regulator')return {id:'campaign:regulator',speaker:'Dawnspire Regulator',speakerId:'narration',text:getStoryFlag(progress,'act1.machineAligned')?'The three channels are aligned. The regulator points toward the prisonworks beneath Last Dawn Keep.':'The maintenance plate reads: DRAIN the pressure, ALIGN the channels, then admit LIGHT. Each wheel is labelled. A wrong sequence vents pressure and resets the mechanism.',options:getStoryFlag(progress,'act1.machineAligned')?[]:['drain','align','light'].map((word,i)=>({id:word,label:word.toUpperCase(),response:i===(progress.act1RegulatorStep||0)?i===2?'The channels align. The prisonworks diagram points to Last Dawn Keep.':'The wheel catches. Continue the sequence.':'Pressure vents harmlessly. Start again with DRAIN.',regulatorStep:i,closeAfterResponse:true}))};
 if(id==='malakarWitness')return getStoryFlag(progress,'story.malakarTruthHeard')?reminder('malakarHeard','Malakar’s warning remains with the evidence. The broken caravan reliquary lies beside the throne; take what survives to Mael.'):select('act1Malakar');
 if(id==='covenantHealingRite'&&mercy==='witnessHealingRite'){
  if(getStoryFlag(progress,'mercy.riteFinished'))return getStoryFlag(progress,'mercy.markedHeard')?reminder('riteAfter','“The patients need rest now,” Neria says. “Mael and Callworth are comparing the patrol lists.”'):select('act1Marked');
  if(getStoryFlag(progress,'mercy.riteStarted'))return reminder('riteUnderway','“Give them room to work,” Neria says. “We are watching their breathing. Stay nearby until the treatment is finished.”');
  return select('act1Rite');
 }
 if(id==='act1MarkedVillager'&&getStoryFlag(progress,'mercy.riteFinished'))return getStoryFlag(progress,'mercy.markedHeard')?
  reminder('markedRecovery','“Neria brought me water. I remember you helping, but not what I said. Is my family still waiting outside?”',[
   {id:'family',label:'I’ll make sure they know you’re resting.',response:'“Thank you. I would rather they heard that than another rumour.”',closeAfterResponse:true}]):select('act1Marked');
 if(mercy==='returnOldWellEvidence'&&['wardenMael','lightwardenCaelen'].includes(id))return getStoryFlag(progress,'mercy.evidenceReported')?
  reminder('evidenceFiled',id==='wardenMael'?'“The lantern account is preserved. Neria is gathering patients by the chapel lanterns; we can compare the patrol lists after the rite.”':'“You have given us something we can check. I will speak with Mael. Neria needs room for the patients now.”'):select(id==='wardenMael'?'wardenOldWellReturn':'callworthEvidence');
 if(mercy==='confrontEvidence'&&['wardenMael','lightwardenCaelen'].includes(id))return getStoryFlag(progress,'mercy.evidenceConfronted')?
  reminder('confronted',id==='wardenMael'?'“I have the names and dates. Go back to Mara upstairs; I’ll bring the manifests when I have checked them.”':'“Mael has the patrol lists. I should have brought them to him sooner. For tonight, go and rest.”'):select('act1Confront');
 if(mercy==='returnToMara'&&id==='maraVell'&&world?.mode==='maraHouse')return getStoryFlag(progress,'mercy.homeConclusion')?
  reminder('homeConcluded','“The bowl is still warm. Rest before you head back to the wreck.”'):select('act1MaraEvening');
 if(mercy==='witnessHealingRite'&&['wardenMael','lightwardenCaelen'].includes(id))return reminder('riteReminder',id==='wardenMael'?'“I have kept the lantern account. Neria is bringing the patients to the upper ward. I want to see the treatment before we speak again.”':'“Neria is gathering the patients by the chapel lanterns. I need to be with them; we will discuss the patrol evidence afterwards.”');
 if(mercy==='returnToMara'&&id==='maraVell')return reminder('maraHomeReminder','Come upstairs above the Root & Retort. You need rest. The stairs are in the eastern herb room, beside the back of the shop.');
 if(mercy)return null;
 const stage=progress.quests?.active?.[CAMPAIGN_ID]?.currentStageId||(!progress.quests?.completed?.[CAMPAIGN_ID]&&progress.quests?.completed?.mercy_in_orrakai?'aLanternInTheMud':undefined);
 const scene=fieldConversation(npc,p,progress,stage);if(scene)return scene;
 const passedChapel=progress.quests?.completed?.[CAMPAIGN_ID]||CAMPAIGN_STAGES.findIndex(s=>s.id===stage)>CAMPAIGN_STAGES.findIndex(s=>s.id==='theBrokenChapel');
 if(passedChapel&&['chapelHermit','sisterElyra'].includes(id))return fieldConversation(npc,p,progress,'theBrokenChapel',{completed:true});
 const passedKeep=progress.quests?.completed?.[CAMPAIGN_ID]||CAMPAIGN_STAGES.findIndex(s=>s.id===stage)>CAMPAIGN_STAGES.findIndex(s=>s.id==='theRedSeal');
 if(passedKeep&&id==='repentantCultist')return reminder('defectorAfter',getStoryFlag(progress,'story.malakarDefeated')?'“I heard the ritual stopped. I stayed where I said I would. The watch has my name, and I will answer for what I did.”':'“The watch has my name. You have the orders. I will stay here and give the same account when Mael’s people come.”',[
  {id:'testify',label:'The families will need your account too.',response:'“Then they will have it. I do not expect them to forgive me for telling the truth late.”',closeAfterResponse:true}]);
 if(id==='act1ReliefScout'&&(stage||progress.quests?.completed?.[CAMPAIGN_ID])){
  const cleared=!!progress.completedDungeons?.ashenOrchard;
  return reminder(`hessa:${cleared?'roadOpen':'orchard'}`,cleared?'“The cellar is clear. I have sent word to inspect the road before the next carts leave. The wreck is still secured; I will not have its evidence sold for firewood.”':'“I’ll keep the wreck secure. Check the household, irrigation and growing ground at Ashen Orchard, then clear the cellar beneath the farmhouse. Ask the camp engineer about the buried channels.”',[
   {id:'relief',label:cleared?'Are the relief carts moving again?':'What can I do for the relief camp?',response:cleared?'“Not at full strength. A passable road is the start; now we need drivers, animals and something to put in the wagons.”':'“Hear the engineer out, take medicine, and come back with something the crews can use. They have had enough brave promises.”'},
   {id:'route-ashenOrchard',label:'Show me the Orchard road again.',response:ACT1_ROUTES.ashenOrchard.route,learnRoute:'ashenOrchard'}]);
 }
 if(stage||progress.quests?.completed?.[CAMPAIGN_ID])return campaignFollowup(npc,p,progress,stage);
 // Bram and the hunter retain their authored training, work and personal
 // conversations. A blanket route guide must never replace those services.
 return null;
}
