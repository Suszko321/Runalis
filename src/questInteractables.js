// One read-only visibility rule for rendering, radar and interaction. Never
// mutate depleted/collected: those fields belong to persistent world state.
import {getStoryFlag} from './storyProgress.js';

const MAIN='act1HearthmereAshes',MERCY='mercy_in_orrakai';
const RULES={
 act1CargoManifest:[[MAIN,'aLanternInTheMud']],act1RelicCradle:[[MAIN,'aLanternInTheMud']],
 act1RitualOrders:[[MAIN,'theRedSeal']],act1Regulator:[[MAIN,'theBrokenChapel']],
 act1RefugeeFootprints:[[MERCY,'investigateOldWell']],
 act1RootsUnderRoad:[[MAIN,'theWoundSpreads']],
 act1BridgeRedSealEvidence:[[MAIN,'theBrokenChapel']],
 act1KeepSummoningPlan:[[MAIN,'theRedSeal']],act1KeepAncientFoundation:[[MAIN,'theRedSeal']],
 orrakaiCaravanMemorial:[[MERCY,'findWardenMael']],
 orrakaiBurnedLedger:[[MAIN,'aLanternInTheMud']],
 malakarRelic:[[MAIN,'malakarAndTheRoot']]
};
function at(p,id,stage){const q=p?.quests?.active?.[id];return !!q&&(!stage||q.currentStageId===stage);}
function objectiveMatches(o,object){
 if(o.type==='investigatePoi')return !!object.poiId&&o.poiId===object.poiId;
 if(o.type==='storyFlag')return object.storyFlags?.includes(o.flag);
 return ['objectId','targetId','clueId'].some(key=>o[key]&&o[key]===(object[key]||object.id));
}
export function isQuestInteractable(object){
 return !!object&&(object.kind==='poiInvestigation'||object.questVisibility||object.campaignFixture||['cistern','archive'].includes(object.campaignAction));
}
export function isQuestObjectVisible(object,player){
 if(!isQuestInteractable(object))return true;
 if(object.interactable===false)return false;
 if(!player)return false;
 const owner=player.questOwner||player;
 // Shared campaign objects follow the host, including in split-screen play.
 const p=owner,id=object.id;
 if(id==='greyhavenLedger')return getStoryFlag(p,'order.founded')||[4,5,6,7,8,9].some(n=>at(p,`yourOrder${n}`));
 if(object.campaignAction==='cistern')return at(p,'yourOrder3')&&!getStoryFlag(p,'order.cistern');
 if(object.campaignAction==='archive')return at(p,'yourOrder6')&&p.yourOrder?.operation==='recovery'&&!p.yourOrder?.operations?.recovery;
 if(id==='act1Regulator'&&getStoryFlag(p,'act1.machineAligned'))return false;
 if(id==='malakarRelic'&&getStoryFlag(p,'act1.relicSecured'))return false;
 if(object.poiId==='oldWellRitualSite')return at(p,MERCY,'investigateOldWell')&&(id!=='oldWellBrokenLantern'||!getStoryFlag(p,'mercy.brokenLanternAcquired'));
 if(object.poiId==='lastDawnDescent')return at(p,MAIN,'descentBeneathHearthmere')||at(p,MAIN,'malakarAndTheRoot');
 const rules=object.questVisibility||RULES[id];
 if(rules)return rules.some(([quest,stage])=>at(p,quest,stage));
 for(const source of owner===player?[player]:[owner,player]){
  for(const q of Object.values(source.quests?.active||{})){
   const objectives=q.objectives||q.stages?.[q.currentStageIndex||0]?.objectives||[];
   if(objectives.some(o=>objectiveMatches(o,object)))return true;
  }
 }
 return false;
}
