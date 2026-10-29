import {ACT1_ROUTES,CAMPAIGN_ID} from './act1CampaignData.js';
import {getStoryFlag} from './storyProgress.js';

// Keep the legacy scene/commit IDs so active quest objectives and old saves
// retain their identities. Spoken lines and optional topics belong to the NPC.
export const FIELD_CONVERSATIONS={
 handsThatStillWork:{act1ReliefScout:{
  text:'Hessa spreads the scorched manifest against a wagon wheel. “They left the provision sacks and took the crate. That is a search, not a robbery. I was watching the Ashen Orchard relief road when the animals bolted and the irrigation turned black. The farmhouse cellar sits over those channels. I need you to clear it before we send another cart through.”',
  again:'Hessa keeps one hand on the manifest. “The cellar is the part I cannot check from this wreck. Are you willing to go below?”',
  reported:'“You have the Orchard assignment. I’ll keep the wreck intact and warn the next relief crew.”',route:'ashenOrchard',
  commit:['I’ll investigate the Orchard and clear the cellar.','“Search the household, irrigation and growing ground before you descend. Bring the channel evidence to Callworth and Mara when the cellar is safe. I’ll hold the wreck for Mael.”'],
  topics:[['cargo','They ignored the food. What was in that crate?','“I can read a waybill, not a sealed reliquary. The empty cradle fits something carried carefully. Whatever it held mattered more to them than the people guarding it.”'],['survivors','Did anyone else get away?','“I found tracks leaving the road, but no one who could answer me. I won’t write people off because a wagon burned. If I find a survivor, Mael will hear their name.”'],['camp','The Covenant already has people at the Orchard. Why send me?','“They can hold the camp and tend the sick. They cannot spare the people to keep the road open and search every buried room. Ask their engineer what has already been tried.”']]
 }},
 theCovenantBlessing:{lightwardenCaelen:{
  text:'Callworth sets his medicine ledger aside. “The Orchard cellar is clear, then. We can send a crew to inspect the road. But white fire burned the infected growth once already. Tell me what you found beneath the burn.”',
  again:'“The question is why the roots survived our first treatment,” Callworth says. “The people we saved are real. So is the failure underneath their fields.”',
  reported:'“Mara should see the channel evidence herself. I have asked the relief crews to preserve the lower workings.”',
  commit:['Mara needs to see what the roots were growing around.','“Agreed. She watched the fields change before we reached the Orchard. Take her the channel findings; I’ll arrange the next supply carts.”'],
  topics:[['fire','Did the purification make the growth worse?','“It destroyed infected growth at the perimeter. That bought us time to evacuate. The channels remained, and roots returned through them. I cannot call that proof that the fire caused it.”'],['oath','The Custodian was still enforcing an old duty.','“A duty without anyone left to question it can become a cruelty. Our work must answer to the people it is meant to protect.”'],['patients','What happens to the people still living there?','“They remain under our care. Clearing the cellar does not restore a harvest or cure a fever. It gives us a chance to reach them without losing another wagon.”']]
 }},
 evidenceForMara:{maraVell:{
  text:'Mara turns the root sample beside the recovered channel sketch. “See the bend here? The root grew around the stonework, not straight through it. And this chapel page copies the same pattern. Someone knew where those buried channels went.”',
  again:'“The root and the drawing agree,” Mara says. “What we need now is the part of the drawing that survived at the Chapel.”',
  reported:'“The Broken Chapel is your next lead. Ask the survivors what was taken before you touch the sealed stair.”',route:'brokenChapel',
  commit:['I’ll find the missing part of that drawing at the Chapel.','“Speak to both survivors. A drawing can tell you where a passage runs; people may tell you why anyone wanted it.”'],
  topics:[['roots','You think someone guided the roots?','“I think they followed a structure older than the farm. That is what the sample shows. Whoever copied the pattern may have understood more, but I won’t invent their reasons.”'],['covenant','Callworth admitted the purification failed below ground.','“Good. He can help more by admitting a limit than by hiding it. I’ve seen his healers save people. I’ve also seen things they cannot explain.”'],['rest','You sound as though you expect me to disappear again.','“I carried water up these stairs while you lay there without waking. Bring back answers if you can. Bring yourself back first.”']]
 }},
 theBrokenChapel:{
  chapelHermit:{
   text:'The hermit lifts a scorched index leaf. “They burned the recent catalogue, then searched older shelves by lamplight. One of them kept saying, ‘The regulator, not their prayers.’ If you want their trail, look at what they bothered to carry away.”',
   again:'“You have heard what I saw. There may still be a mark among those shelves that I missed.”',
   reported:'“I have told you what I witnessed. Elyra was nearer the aisle; ask her before you decide what happened here.”',
   commit:['You heard them asking for a regulator. I’ll examine the sealed stair.','“Read its maintenance plate first. DRAIN, ALIGN, then LIGHT. The words belong to a machine, whatever the men carrying torches thought they meant.”'],
   topics:[['survived','How did you survive the fire?','“I knew the little store below the north wall. There was air at the floor. I listened to them searching while the shelves over my head burned.”'],['index','Why destroy the recent catalogue?','“To conceal what they removed, perhaps. Or because it did not tell them what they wanted. I saw them burn it. Their reason is yours to establish.”'],['other','Was Sister Elyra with you?','“She was carrying children out through the aisle. I could not have done that from my hiding place. Do not mistake my survival for courage.”']]
  },
  sisterElyra:{
   text:'Elyra folds a smoke-stained blanket. “Two children made it out with me. Our defenders held the aisle while the others searched below. The pages they took concerned a prison beneath the keep. I never saw what it held.”',
   again:'“The children are safe. If you need more than that, I’ll tell you what I remember of the search.”',
   reported:'“You have my account. Compare it with the hermit’s and the archive; none of us saw the whole attack.”',
   commit:['I’ll follow the prison records. Thank you for getting the children out.','“Then make that part of it matter. The regulator plate says drain, align, then admit light. Do not force the wheels out of order.”'],
   topics:[['children','Where are the children now?','“With the families sheltering away from the road. They wake when someone shuts a door too hard. Being out of the fire is only the first part of being safe.”'],['prison','Was the Covenant using that prison?','“I do not know. The records were old enough that the names meant little to me. I will not turn an unread page into an accusation.”'],['search','Did the attackers seem to know their way around?','“They argued over a drawing, then sent men toward the sealed stair. They knew what they wanted. Whether they knew what waited below is another question.”']]
  }
 },
 theRedSeal:{
  repentantCultist:{
   text:'The defector keeps his empty hands where you can see them. “They promised answers. Then they ordered us to kill caravan guards. Your crate fits the prison lock. The ritual orders are on the table beside this approach. There are occupied barracks, excavations and a vault below. If the orders still mean what I think they mean, they are already beginning.”',
   again:'“I can tell you about the approach. I cannot make what I did disappear.”',
   reported:'“The orders are beside the approach. Take them to Mael. He deserves more than the word of a deserter.”',route:'demonCultLair',
   commit:['I’ll take the ritual orders to Mael. Stay where the watch can find you.','“I’ll stay. Tell him I can name the guards who gave those orders. It will not bring your caravan back.”'],
   topics:[['belief','What answer was worth killing us for?','“They said a witness beneath the keep remembered the world before the Veiling. At first that sounded like a reason to dig. Then every person in our way became an acceptable price.”'],['escape','Why leave now?','“Because I saw the people chosen to stand at the ritual stations. They were being thanked as if they had already died. I finally understood what our leaders meant by sacrifice.”'],['trust','Give me one reason to believe you.','“Check the orders against what I told you. Do not trust me because I look frightened. I was frightened when I obeyed, too.”']]
  },
  wardenMael:{
   text:'Mael weighs down the ritual orders with a knife. “The manifest, the prison mechanism and these instructions point to the same place. That is enough to act. I cannot abandon the watch here, but I can make sure someone knows where you went.”',
   again:'“I have the orders in front of me. Tell me what you need before you go below.”',
   reported:'“Your destination is recorded and the watch knows it. Prepare for the descent; the keep is still occupied.”',route:'demonCultLair',
   commit:['I’m going beneath the keep to stop the ritual.','“Take medicine and food. The fortress road runs south from Watcher Ridge, beyond Hunter Camp. If you return, I want your account before anyone improves it for a sermon.”'],
   topics:[['reinforcements','Can you send anyone with me?','“Every patrol I move leaves a gate, a medicine cart or frightened families without protection. I can secure your route as far as our people can reach. I will not pretend that is the same as following you down.”'],['defector','What will happen to the defector?','“We take his statement and check the names. Leaving the Order does not erase what he did. It gives us a witness we can question.”'],['fear','What if I’m too late?','“Then you learn what has happened before you decide what can still be stopped. Panic is an excellent way to do your enemy’s work for him.”']]
  }
 },
 ashesOfOrrakai:{
  wardenMael:{
   text:'Mael sets a fresh sheet beside the patrol lists. “The ritual has stopped. That is what the watch can confirm. Now tell me about the people below, and the warning you brought back.”',
   again:'“I will separate what you witnessed from what Malakar claimed. Both belong in the account; they do not carry the same weight.”',
   reported:'“Your account is safe. Go upstairs to Mara. She has been asking which patrol would bring you back.”',
   commit:['Keep his warning with my account. I won’t treat it as proof.','“That will do. When you are ready, the Pilgrim Road leads east toward the Marches. Orrakai will still be here when you need a roof.”'],
   topics:[['dead','Will the caravan dead be remembered?','“By name where we can recover one. By the place they fell where we cannot. A patrol report is poor comfort, but being forgotten would be worse.”'],['seraphel','Malakar wanted me to doubt Seraphel.','“A brutal man can tell the truth. He can also choose the part that serves him. Keep the warning; find something you can test.”'],['town','Did stopping the ritual change anything here?','“The roads are still bad and the infirmary is still full. But no more lives will be fed to that ritual. Do not let unfinished work turn that into nothing.”']]
  },
  maraVell:{
   text:'Mara puts down the bowl she has been carrying. “You came back.” She looks at the bandages, then your face. “Sit. Whatever the vault told you can wait until you stop shaking.”',
   again:'“You do not have to explain it all at once. I have a chair, and for once nobody else is using it.”',
   reported:'“Rest while you can. The next road will still be there in the morning.”',
   commit:['I’ll rest here before I follow the next lead.','“Good. We can disagree about ancient mysteries after you have eaten. Orrakai is more than the place you leave between disasters.”'],
   topics:[['saved','We stopped it. Why doesn’t it feel finished?','“Because the people you helped still need food, and the people you lost are still gone. Doing something worthwhile does not always feel like winning.”'],['warning','What if the warning from the vault is true?','“Then find out carefully. You have seen the Covenant help people. You have seen things they did not understand. Neither fact gives you permission to stop looking.”'],['home','You kept a place for me?','“It was a recovery bed. I can find a less medicinal name for it if that makes you stay long enough to heal.”']]
  }
 }
};

export function fieldConversation(npc,actor,progress,stage,{completed=false}={}){
 const scene=FIELD_CONVERSATIONS[stage]?.[npc.npcId];if(!scene)return null;
 const key=`${stage}_${npc.npcId}`,seen=`campaignSeen.${key}`,reported=`campaignReported.${key}`;
 const q=progress.quests?.active?.[CAMPAIGN_ID],done=completed||getStoryFlag(actor,reported)||(q?.objectives||[]).some(o=>o.type==='talk'&&o.npcId===npc.npcId&&o.current>=(o.required||1));
 const options=scene.topics.map(([id,label,response])=>({id:`topic-${id}`,label,response,actorOnlyFlags:true,flagsSet:[seen,`campaignAsked.${key}_${id}`],excludesFlags:[`campaignAsked.${key}_${id}`]}));
 if(!done)options.push({id:'record',label:scene.commit[0],response:scene.commit[1],completesTalkObjective:npc.npcId,
  flagsSet:[seen,reported],learnRoute:scene.route,closeAfterResponse:true});
 if(scene.route)options.push({id:`route-${scene.route}`,label:`Which road takes me to ${ACT1_ROUTES[scene.route].name}?`,response:ACT1_ROUTES[scene.route].route,learnRoute:scene.route});
 if(npc.npcId==='maraVell')options.push({id:'training',label:'Can we talk about Thornbinding?',nextNodeId:'maraTrainerDialogue'});
 return {id:`campaign:${stage}:${npc.npcId}`,speaker:npc.name,speakerId:npc.npcId,appendNpcQuestOptions:false,ambientCampaign:!!done,
  text:done?scene.reported:getStoryFlag(actor,seen)?scene.again:scene.text,options};
}

const followupText={
 road:{wardenMael:'“The wreck is still evidence,” Mael says. “Hessa is there to protect it, not send you back here for another signature. Find out what your cargo was meant to open.”',maraVell:'“You do not have to remember the whole attack at once. Start with what is still at the wreck. A surviving mark on a crate may be less confused than either of us.”',lightwardenCaelen:'“The lantern account is with Mael now. I will keep the attendants’ families informed. Your caravan may tell us why the Last Dawn were using that road.”'},
 orchard:{wardenMael:'“Hessa has the wreck covered. Give her relief road a chance before you chase the keep. A town with no food cannot wait for us to solve every mystery.”',maraVell:'“If you find roots below the Orchard, bring a sealed sample and something that shows where it grew. A blackened field tells us too little on its own.”',lightwardenCaelen:'“Our camp is still treating the Orchard families. Speak with the engineer before going below; knowing what failed may keep you from trying the same thing.”'},
 chapel:{wardenMael:'“The Chapel has two surviving witnesses. Question them separately, then compare what they say with the archive. We have enough enemies without inventing another.”',maraVell:'“That chapel drawing is a lead, not an answer. Find its missing context before you decide who is responsible for the roots.”',lightwardenCaelen:'“The Chapel was a place people ran to for shelter. I need to know why the Order searched it, but first I need the survivors kept out of another fight.”'},
 keep:{wardenMael:'“The watch knows you are going beneath the keep. We can keep the roads watched; what you find in the vault will have to come from you.”',maraVell:'“You have enough evidence to be afraid of what is below the keep. Take that seriously. Prepare, and come back before you spend the life we just saved.”',lightwardenCaelen:'“The Last Dawn are gathering lives around a prison lock. Whatever they believe, people are being made to pay for it. Stop the ritual if you can.”'},
 aftermath:{wardenMael:'“The watch is checking the reopened routes. Your statement is kept with the original evidence. I will add to it when we learn more, not rewrite it to make us look wiser.”',maraVell:'“There is soup downstairs and a dry blanket up here. You are allowed to need both, even if somebody has started calling you a hero.”',lightwardenCaelen:'“The ritual has stopped. I will not use that to claim the frontier is healed. We still have patients, missing people and a great deal to answer for.”'}
};
const personalTopics={
 wardenMael:[['watch','How is the watch holding up?','“Tired people make mistakes. I rotate the posts when I can, and I ask the ones who come back what they actually saw. It is slower than issuing speeches.”'],['certainty','How do you decide whom to trust?','“I start by asking what they could know. If a witness tells me what was behind a closed door, I ask where they were standing.”']],
 maraVell:[['healing','Are the patients upstairs improving?','“Some. I remember each small improvement because it is easy to remember only the failures. Ask me again after I have slept.”'],['help','Do you regret taking me in?','“Ask the same question after you have helped wash the blankets. No. I wanted you to wake up. What you do with that is still yours.”']],
 lightwardenCaelen:[['accountability','Will you keep Mael informed this time?','“Yes. Names, dates and what we have failed to find. Protecting a family from worry is not a reason to leave the watch ignorant.”'],['faith','Does doubt change how you help people?','“It ought to change how carefully I listen. The person waiting for medicine does not become less important because I cannot explain everything that has happened.”']]
};
export function campaignFollowup(npc,actor,progress,stage){
 const phase=progress.quests?.completed?.[CAMPAIGN_ID]||stage==='ashesOfOrrakai'?'aftermath':
  ['aLanternInTheMud','handsThatStillWork'].includes(stage)?'road':
  ['theWoundSpreads','failedPurificationSite'].includes(stage)?'orchard':
  ['theCovenantBlessing','evidenceForMara','theBrokenChapel'].includes(stage)?'chapel':'keep';
 const text=followupText[phase]?.[npc.npcId];if(!text)return null;
 const options=personalTopics[npc.npcId].map(([id,label,response])=>({id:`personal-${id}`,label,response,actorOnlyFlags:true,
  flagsSet:[`campaignAsked.${phase}_${npc.npcId}_${id}`],excludesFlags:[`campaignAsked.${phase}_${npc.npcId}_${id}`]}));
 if(npc.npcId==='maraVell')options.push({id:'training',label:'I’d like to practise Thornbinding.',nextNodeId:'maraTrainerDialogue'});
 return {id:`campaign:followup:${phase}:${npc.npcId}`,speaker:npc.name,speakerId:npc.npcId,text,options,ambientCampaign:true};
}
