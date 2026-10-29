// Canonical Act I additions. Legacy IDs remain stable for existing profiles.
export const CAMPAIGN_ID = 'act1HearthmereAshes';
export const MERCY_ID = 'mercy_in_orrakai';
export function getCampaignStageId(player,stageId){
  if(stageId==='bramsRoadLesson')return 'theWoundSpreads';
  // The old town consultation preceded the cellar. Do not skip that dungeon
  // when a save resumes at the same consultation in the new sequence.
  if(stageId==='theCovenantBlessing'&&(player.act1CampaignVersion||0)<3&&!player.completedDungeons?.ashenOrchard)return 'failedPurificationSite';
  return stageId;
}
export const flagObjective = (flag, label) => ({type:'storyFlag', flag, required:1, label});
const stage = (id,title,text,objectives) => ({id,title,text,objectives});
const evidence = (poiId, required, label) => ({type:'investigatePoi',poiId,required,label});
const talk = (npcId,label) => ({type:'talk',npcId,required:1,label});
export const MERCY_ENDING = [
  stage('returnOldWellEvidence','Cold Light','Return through the south gate. Mael works beside the infirmary; Callworth receives reports there. Choose who sees the lantern first.',[flagObjective('mercy.evidenceReported','Report to Mael or Cardinal Callworth')]),
  stage('witnessHealingRite','Reasons to Believe','Speak with Sister Neria beside the chapel lanterns on the upper ward. Stay nearby while the patients receive treatment.',[flagObjective('mercy.riteWitnessed','Witness the healing rite')]),
  stage('confrontEvidence','Names and Dates','Return to Cardinal Callworth at the infirmary. Mael will join the discussion. The lantern remains in its recorded custody.',[flagObjective('mercy.evidenceConfronted','Discuss the missing patrol together')]),
  stage('returnToMara','A Stranger’s Hearth','Return to the Root & Retort in Orrakai’s lower ward. Enter its south-facing shop door, then take the stairs in the eastern herb room to Mara’s recovery room.',[flagObjective('mercy.homeConclusion','Return to Mara upstairs at the Root & Retort')])
];
export const CAMPAIGN_STAGES = [
  stage('aLanternInTheMud','The Cargo Left Behind','Mael’s road report: leave the south gate, follow the lower road to the damaged cart, then take the signed east fork to the burned caravan. Examine the manifest and empty reliquary cradle.',[evidence('caravanWreck',2,'Recover the cargo record and examine the cradle')]),
  stage('handsThatStillWork','Five Missing Wagons','Scout Hessa is examining the burned wagons beside the empty reliquary cradle. Show her the manifest and ask how Ashen Orchard connects to the missing cargo.',[talk('act1ReliefScout','Speak with Scout Hessa at the caravan wreck')]),
  stage('theWoundSpreads','Where the Roots Turn','Hessa needs the Ashen Orchard Cellar cleared before the relief road can reopen. Follow the lower road south past the Old Well, then the eastern farm track. First search the abandoned household, contaminated irrigation, and ruined growing ground for the source of the roots.',[evidence('ashenOrchard',3,'Examine three distinct Orchard clues')]),
  stage('failedPurificationSite','Ashen Orchard Cellar','The surface clues lead beneath the collapsed farmhouse. Fulfil Hessa’s request: enter Ashen Orchard Cellar, defeat what feeds the growth, and recover evidence of the buried channels. Clear the cellar before returning to Orrakai.',[{type:'clearDungeon',dungeonId:'ashenOrchard',required:1,label:'Clear Ashen Orchard Cellar'}]),
  stage('theCovenantBlessing','White Fire, Black Roots','With the Orchard cellar cleared, return to the infirmary in Orrakai. Show Callworth what survived beneath the purification burn and ask why the roots returned.',[talk('lightwardenCaelen','Discuss the cleared Orchard and failed purification with Callworth')]),
  stage('evidenceForMara','What the Roots Remember','Bring the cellar findings to Mara upstairs above the Root & Retort. Take the stairs in the shop’s eastern herb room. She can compare the living roots with the channel sketches recovered in the Orchard.',[talk('maraVell','Bring the cellar findings to Mara upstairs at the Root & Retort')]),
  stage('theBrokenChapel','The Burned Index','Follow the signed forest road east from the Orchard to Pilgrim Bridge. Cross the river and follow the north-eastern chapel road. Question both surviving witnesses and inspect the archive.',[talk('chapelHermit','Question the Chapel Hermit'),talk('sisterElyra','Question Sister Elyra'),evidence('brokenChapel',3,'Inspect three surviving records or mechanisms'),flagObjective('act1.machineAligned','Operate the Dawnspire regulator beside the sealed stair')]),
  stage('theRedSeal','The Last Dawn Offensive','The regulator and stolen manifest point to Last Dawn Keep. Retrace the Chapel road west to the signed fork just east of Pilgrim Bridge. Take the south-east road past Hunter Camp to Watcher Ridge, then follow the fortress road south. A defector waits outside the gate. Return to Mael with the ritual orders.',[evidence('lastDawnOrders',1,'Recover the ritual orders at the keep approach'),talk('repentantCultist','Question the Last Dawn defector'),talk('wardenMael','Report the ritual preparations to Mael')]),
  stage('descentBeneathHearthmere','Beneath Last Dawn Keep','Enter the fortress descent beyond the defector. Explore the occupied chambers, prisonworks and witness vault. The ritual is already underway.',[{type:'enterDungeon',dungeonId:'demonCultLair',required:1,label:'Enter the Last Dawn descent'}]),
  stage('malakarAndTheRoot','The Witness Beneath','Stop Malakar in the deepest vault. Survive his attacks, then listen to what he says before deciding what to believe.',[flagObjective('story.malakarDefeated','Defeat Malakar'),flagObjective('story.malakarTruthHeard','Hear Malakar’s final testimony'),flagObjective('act1.relicSecured','Secure the broken caravan reliquary beside the throne')]),
  stage('ashesOfOrrakai','Ashes of Orrakai','Return to Mael in Orrakai, then visit Mara upstairs above the Root & Retort; the shop’s eastern herb room leads to her stairs. The roads and refuge remain open; the Pilgrim Road is your next lead, when you are ready.',[talk('wardenMael','Report the outcome to Mael'),talk('maraVell','Return to Mara upstairs at the Root & Retort')])
];
export const ACT1_ROUTES = {
  oldWellRitualSite:{name:'Old Well',route:'Leave the south gate; follow the lower road past the damaged cart and boundary stone. Follow the ditch to the ruined pumping house; the well is behind it.'},
  caravanWreck:{name:'Caravan Ambush Site',route:'From the damaged cart on the lower road, take the signed east fork. The burned wagons stand in a clearing at the end of the track.'},
  ashenOrchard:{name:'Ashen Orchard',route:'Follow the lower road south past the Old Well, then the farm track east. Blackened fruit trees surround the ruined farmhouse. The root-choked cellar entrance is beneath the collapsed farmhouse.'},
  brokenChapel:{name:'Broken Chapel',route:'From Ashen Orchard follow the signed forest road east to Pilgrim Bridge. Cross the river, then take the north-eastern chapel road to the broken bell tower.'},
  demonCultLair:{name:'Last Dawn Keep',route:'From the Broken Chapel retrace the road west to the fork just east of Pilgrim Bridge. Take the south-east road to Hunter Camp and Watcher Ridge. Continue south along the fortress road. Look for the occupied walls and divided-sun banners.'},
  greyhaven:{name:'Greyhaven',route:'Take the lower road south from Orrakai. At the Old Well, follow the western refuge track to the hall with the torn banner.'}
};
const node = (speaker,speakerId,text,options=[]) => ({speaker,speakerId,text,options,appendNpcQuestOptions:false});
const choice = (id,label,response,extra={}) => ({id,label,response,...extra});
const finish = (flag,extra={}) => ({flagsSet:[flag],closeAfterResponse:true,...extra});
const rep = (covenant=0,wardens=0,orrakai=0) => ({covenant,wardens,orrakai});
export const CAMPAIGN_DIALOGUES = {
  maraMercyOpening:node('Mara Vell','maraVell','Thank goodness—you’re awake. I feared Orun had claimed another soul. It seems you’re through the worst of it now, friend.',[
    choice('caravan','What happened?','Your caravan was ambushed by the Order of the Last Dawn. They recently occupied an abandoned keep. Mael heard the commotion and went to investigate. You were the only one within a husk’s spine of surviving. He and the Covenant patrol carried you here.',{flagsSet:['opening.maraAskedCaravan']}),
    choice('where','Where am I?','Orrakai, upstairs above the Root & Retort. The infirmary was full, so we made you a recovery bed above the family apothecary. Most here are fur traders, harvesters or craftspeople, a minor detour between Lumora and Zarynth.',{flagsSet:['opening.maraAskedWhere']}),
    choice('who','Who are you?','Mara Vell, the apothecary’s daughter. I help with the Root & Retort downstairs. Mael asked me to watch over you; the Covenant healers have their hands full.',{flagsSet:['opening.maraAskedSurvival']}),
    choice('next','What should I do now?','If you’re steady enough, take the stairs down into the Root & Retort. Leave through the shop’s south door, then head west along the lower ward to the Covenant infirmary. Warden Mael is beside the tents at his paper-covered table.',{flagsSet:['opening.maraConversationComplete','opening.metMara'],completesTalkObjective:'maraVell',closeAfterResponse:true})]),
  lightwardenCaelenMilestone:node('Cardinal Callworth','lightwardenCaelen','The western tents need bedding, and the southern farms have stopped sending produce. We are treating everyone we can.'),
  lightwardenCaelenIntroduction:node('Cardinal Callworth','lightwardenCaelen','“Then we’ll write them again,” Callworth tells an exhausted attendant. “Go and eat something. I’ll find someone to help you.” He turns. “Ah. Our wandering patient. Mara said you’d recovered enough to walk.”',[
    choice('saved','You helped save me?','I played a small part. A patrol helped carry you back, Mara saw to your wounds, and our sisters brought down your fever. You owe us nothing.',{karma:rep(10),nextNodeId:'callworthRelief'}),
    choice('mael','Warden Mael sent me.','Of course he did. I believe that man would investigate the Eight themselves if someone gave him enough parchment.',{nextNodeId:'callworthRelief'}),
    choice('known','You know who I am?','The sole survivor of a caravan ambush? Yes. News travels quickly in a place this small.',{nextNodeId:'callworthRelief'})]),
  callworthRelief:node('Cardinal Callworth','lightwardenCaelen','I understand you’ve already been helping at the plague tents.',[
    choice('thanks','The people here are lucky to have you.','They deserve better than luck. I’d like to think we’re making a difference. Some mornings, I’m not certain.',{karma:rep(10),nextNodeId:'callworthRequest'}),
    choice('control','You seem to have the town under control.','The western tents need clean bedding. The farms have stopped sending produce. But people are cooperating. That’s something.',{nextNodeId:'callworthRequest'}),
    choice('criticism','Some people still aren’t receiving treatment.','I know. Do you think I don’t know? …Forgive me. Every day I must decide where the medicine goes first.',{nextNodeId:'callworthCriticism'}),
    choice('indifferent','I’m only helping because Mael asked.','Then I’m grateful he asked. Those people still benefited.',{nextNodeId:'callworthRequest'})]),
  callworthCriticism:node('Cardinal Callworth','lightwardenCaelen','It is not a decision I enjoy making.',[
    choice('apology','I wasn’t accusing you.','I understand.',{karma:rep(5),nextNodeId:'callworthRequest'}),
    choice('help','Then perhaps you need more help.','We do. There is something you could investigate.',{karma:rep(5),nextNodeId:'callworthRequest'}),
    choice('neglect','Being overwhelmed doesn’t excuse neglect.','No. It doesn’t.',{karma:rep(-10,0,5),nextNodeId:'callworthRequest'})]),
  callworthRequest:node('Cardinal Callworth','lightwardenCaelen','The lower road runs south from the old gate, beside the irrigation ditch. Beyond the damaged cart and boundary stone is a ruined pumping house. The Old Well sits behind it. A supply party found burned cloth, red wax and ritual markings there three days ago. Those channels still connect to the southern farms. I don’t know what the Last Dawn are doing, but I would rather learn before another water source is lost.',[
    choice('accept','I’ll investigate it.','Look for anything unusual. Defend yourself if you meet armed scouts, and retreat if you must.',{...finish('mercy.caelenAssignmentAccepted'),karma:rep(10),learnRoute:'oldWellRitualSite',completesTalkObjective:'lightwardenCaelen'}),
    choice('mael','I’ll speak to Mael first.','A sensible precaution. He has better maps than we do.',{...finish('mercy.caelenAssignmentAccepted'),karma:rep(0,5),learnRoute:'oldWellRitualSite',completesTalkObjective:'lightwardenCaelen'}),
    choice('payment','What will you give me?','A little coin from our security allowance. Not as much as the risk deserves.',{nextNodeId:'callworthPayment'}),
    choice('soldiers','Why don’t your soldiers handle it?','Two patrols guard the northern road, another escorts medicine carts. I’m reluctant to leave the infirmary unprotected. If you’d rather not go, I understand.'),
    choice('decline','Not yet.','Come back when you are ready.',{closeAfterResponse:true})]),
  callworthPayment:node('Cardinal Callworth','lightwardenCaelen','I can authorize twenty coins. The choice is yours.',[
    choice('paid','That’ll do.','Return with what you find.',{...finish('mercy.paymentRequested'),learnRoute:'oldWellRitualSite',completesTalkObjective:'lightwardenCaelen'}),
    choice('waive','Keep the coin. Buy medicine with it.','Thank you. We will.',{...finish('mercy.paymentWaived'),karma:rep(10,0,10),learnRoute:'oldWellRitualSite',completesTalkObjective:'lightwardenCaelen'}),
    choice('insult','You expect people to risk their lives for scraps?','It is what we can spare. You are free to refuse.',{karma:rep(-10),nextNodeId:'callworthRequest'})]),
  wardenOldWellReturn:node('Warden Mael','wardenMael','A Covenant lantern at a Last Dawn gathering site. That tells us where it ended up, not who caused the Blight. I would rather know why before accusing anyone.',[
    choice('custody','Keep the lantern. Investigate it.','I’ll document the markings. Then we’ll ask Callworth whether he recognizes it.',{...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedMaelFirst','mercy.lanternWithMael'],flagsCleared:['mercy.brokenLanternHeld'],karma:rep(0,15)}),
    choice('keep','I want Callworth to explain it.','Fair. He might be telling you the truth. He might be telling you what he believes to be the truth.',{...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedMaelFirst'],karma:rep(0,5)}),
    choice('suspicion','Something isn’t adding up.','Then find out what. Suspicion is useful until it becomes certainty without evidence.',{...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedMaelFirst'],karma:rep(0,10)}),
    choice('dismiss','The Last Dawn are obviously responsible.','They may be. But investigating only people you dislike won’t make you useful to me.',{...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedMaelFirst'],karma:rep(0,-10)})]),
  callworthEvidence:node('Cardinal Callworth','lightwardenCaelen','“This is one of ours.” Callworth examines the torn strap. “I sent two attendants with a patrol last week. They were searching the southern farms for missing patients. Not all returned. I should have told you. Their families are still waiting for news.”',[
    choice('compassion','I’m sorry. I didn’t know.','I’ll inform their families that we found something.',{karma:rep(15),...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedCallworthFirst','mercy.lanternWithCallworth'],flagsCleared:['mercy.brokenLanternHeld']}),
    choice('account','You should have told Mael.','You’re right. Keeping it quiet doesn’t help us find them. I’ll speak with him.',{karma:rep(5,10),...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedCallworthFirst','mercy.lanternWithCallworth'],flagsCleared:['mercy.brokenLanternHeld']}),
    choice('anger','You sent me where your soldiers disappeared?','Yes. I warned you about the road. I should also have told you about the patrol. That was poor judgment.',{karma:rep(-10,0,5),...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedCallworthFirst']}),
    choice('accuse','The Last Dawn killed them.','It is what I fear. But I won’t declare them dead without finding their remains.',{karma:rep(5),...finish('mercy.evidenceReported'),flagsSet:['mercy.evidenceReported','mercy.reportedCallworthFirst']})]),
  act1Rite:node('Sister Neria','covenantHealingRite','We are bringing forward those with the worst breathing. Callworth says we will stay until everyone has been seen. A mother struggles to lift her daughter.',[
    choice('carry','Help carry the child.','Neria makes room beneath the awning. The child clings to her mother’s sleeve.',{karma:rep(10,0,10),...finish('mercy.riteStarted')}),
    choice('medicine','Offer an Emberleaf dose.','Neria checks the dose and thanks you.',{requiresItems:[['emberleaf',1]],costItems:[['emberleaf',1]],karma:rep(5,0,15),...finish('mercy.riteStarted')}),
    choice('priority','Why are they going first?','Those are the patients with the worst breathing. If someone else worsens, we will bring them forward too.'),
    choice('watch','Stay and observe.','The lanterns brighten. Callworth kneels beside the elderly patient.',finish('mercy.riteStarted'))]),
  act1Marked:node('Marked Villager','act1MarkedVillager','“The gate opens where the light falls.” When you approach, the man looks confused. “Did I say something? I must have been dreaming again.” Mael quietly opens his notebook.',[
    choice('help','Bring him water.','His hands stop trembling. He thanks you, embarrassed.',{karma:rep(0,0,10),...finish('mercy.markedHeard')}),
    choice('healer','Ask a healer to check on him.','Neria checks his fever and brings water.',{karma:rep(5),...finish('mercy.markedHeard')}),
    choice('record','Ask Mael to record the words.','“Already done. I don’t know what they mean.”',finish('mercy.markedHeard')),
    choice('accuse','Accuse the Covenant of changing his mind.','“You saw a sick man,” Mael says. “That is not evidence for your accusation.”',{karma:rep(-15,0,-5),...finish('mercy.markedHeard')}),
    choice('ignore','Let him rest.','Mael records the words without drawing a conclusion.',finish('mercy.markedHeard'))]),
  act1Confront:node('Cardinal Callworth','lightwardenCaelen','Mael lays out the recorded lantern evidence. “Two attendants and three guards. Six days ago. You reported two missing guards.” Callworth answers, “Those were from an earlier patrol. Seven missing in the past month; two returned wounded.” Mael looks up. “Your people are disappearing on imperial roads.” “You’re right. I should have informed you. You’ll have the names and dates.”',[
    choice('cooperate','We need to work together.','“Then perhaps we can begin again,” Callworth says.',{karma:rep(10,10,5),nextNodeId:'act1ConfrontEnd'}),
    choice('account','Callworth endangered people by withholding information.','“It wasn’t wise,” Mael says. “No,” Callworth answers. “It wasn’t.”',{karma:rep(-10,15),nextNodeId:'act1ConfrontEnd'}),
    choice('support','Mael should stop interfering with the Covenant.','“The Warden has a legitimate duty here,” Callworth says. “As do we.”',{karma:rep(10,-15),nextNodeId:'act1ConfrontEnd'}),
    choice('impatient','The Last Dawn are still out there.','“All the more reason to get our facts straight.”',{nextNodeId:'act1ConfrontEnd'})]),
  act1ConfrontEnd:node('Warden Mael','wardenMael','The Last Dawn are moving supplies toward the keep. They ignored coin and food in your caravan. Callworth has heard of ancient relics moving through the frontier. Possible is not certain. I’ll review the road manifests. For tonight, return to Mara upstairs above the Root & Retort in the lower ward.',[choice('returnHome','I’ll return to Mara.','“And send your patrol reports to me this time, Cardinal.” “You have my word.”',finish('mercy.evidenceConfronted'))]),
  act1MaraEvening:node('Mara Vell','maraVell','You look terrible. Sit before you fall down. …The healing went well? Good. They’ve helped people I couldn’t. My neighbour’s boy is asking for bread every hour now. But people go into those rooms below the chapel, and I don’t always see them come out. I don’t know what to think.',[
    choice('trust','The Covenant are doing their best.','I hope so. Fear makes it hard to ask questions when someone offers hope.',{karma:rep(5),nextNodeId:'act1MaelEvening'}),
    choice('investigate','I’ll find out what’s happening.','Carefully. There are sick people who still need them.',{relationships:{mara:10},nextNodeId:'act1MaelEvening'}),
    choice('dismiss','You’re worrying over nothing.','Perhaps. I would rather you listened before deciding that.',{relationships:{mara:-10},nextNodeId:'act1MaelEvening'}),
    choice('mael','Maybe Mael is right to investigate.','Then give him something he can verify.',{karma:rep(0,5),nextNodeId:'act1MaelEvening'})]),
  act1MaelEvening:node('Warden Mael','wardenMael','A knock interrupts you. Mael enters with his map. “The Last Dawn are searching ruins, stopping caravans, gathering supplies. Rest first. Then examine your caravan. The lower road’s damaged cart marks the east fork to the wreck. You survived them once. That makes you lucky or useful.”',[
    choice('rest','Which do you need me to be?','“Both.” Mara pushes a bowl toward you.',{...finish('mercy.homeConclusion'),learnRoute:'caravanWreck'})]),
  act1Malakar:node('Malakar','malakar','My methods were brutal. Unforgivable. Your dead will not return because I can name my reasons. The Order sought me because I remember what came before the Veiling. They needed a witness, and paid for one with other people’s lives. You stopped this violence. Do not assume that makes every answer you were given true.',[
    choice('warning','What are you trying to tell me?','When you meet Seraphel, do not mistake kindness for innocence. The brightest lights cast the darkest shadows.',finish('story.malakarTruthHeard'))])
};
for(const [id,n] of Object.entries(CAMPAIGN_DIALOGUES)) n.id=id;
// These opening questions are remembered across visits; the canonical campaign
// catalogue must retain the same gating as the original recovery conversation.
for(const option of CAMPAIGN_DIALOGUES.maraMercyOpening.options){
 if(option.id==='next')option.requiresFlags=['opening.maraAskedWhere','opening.maraAskedCaravan','opening.maraAskedSurvival'];
 else option.excludesFlags=[...option.flagsSet];
}
