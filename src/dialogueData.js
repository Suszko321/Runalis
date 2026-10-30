// dialogueData.js
// Story dialogue trigger data for major companions, Covenant beats, and Unbound reveals.

import {GROVE_DIALOGUES} from './blightedGroveData.js';
import {ORCHARD_DIALOGUES} from './ashenOrchardData.js';
export const STORY_DIALOGUE_TRIGGERS = {
  ...GROVE_DIALOGUES,
  ...ORCHARD_DIALOGUES,
  orenFenwickShop: {
    id:'orenFenwickShop',speaker:'Oren Fenwick',speakerId:'orenFenwick',
    text:'Oren sets a stoppered bottle on the counter and wipes his stained hands. “Welcome to the Root & Retort. Oren Fenwick, resident alchemist. If you need something for the road, I keep the fresh batches here.”',
    options:[
      {id:'work',label:'What do you make here?',response:'Tonics, poultices, and enough fever draught to keep this room smelling of bitterroot. Bring Gravecap and Pale Essence and I can brew a Shrine Tonic. Eight gold buys a basic travel restorative if you have no reagents.'},
      {id:'mara',label:'Where can I find Mara?',response:'Upstairs, tending the recovery room and her root samples. Through the herb room to the east, then up the stairs. She still teaches Thornbinding, if that is what brings you here.'},
      {id:'shop',label:'Do you run the apothecary?',response:'I work for the Vells. Someone has to keep the batches measured and the counter open while Mara tends patients. She knows the living roots; I know how long a draught keeps in a traveller’s pack.'},
      {id:'leave',label:'Goodbye.',close:true}
    ]
  },
  maraMercyOpening: {
    id: 'maraMercyOpening', speaker: 'Mara Vell', speakerId: 'maraVell', appendNpcQuestOptions: false,
    text: 'Easy. You are upstairs above the Root & Retort in Orrakai, and alive despite your best effort. I am Mara Vell, the apothecary’s daughter. Before you stand, ask what you need to ask.',
    options: [
      { id: 'where', label: 'Where am I?', response: 'Orrakai. The Covenant infirmary was full, so we made you a recovery bed upstairs above the family apothecary. The Root & Retort’s shop is downstairs.', flagsSet: ['opening.maraAskedWhere'], excludesFlags: ['opening.maraAskedWhere'], showWhenUnavailable: true, requirementText: 'Asked' },
      { id: 'caravan', label: 'What happened to the caravan?', response: 'The Order of the Last Dawn took it apart with purpose. They stole the sealed artifact. Some travelers escaped. Most did not.', flagsSet: ['opening.maraAskedCaravan'], excludesFlags: ['opening.maraAskedCaravan'], showWhenUnavailable: true, requirementText: 'Asked' },
      { id: 'survived', label: 'How did I survive?', response: 'You held on until Covenant outriders found the wreck. They brought you to Orrakai. I treated the wound. Survival was a joint act of stubbornness.', flagsSet: ['opening.maraAskedSurvival'], excludesFlags: ['opening.maraAskedSurvival'], showWhenUnavailable: true, requirementText: 'Asked' },
      { id: 'next', label: 'What should I do now?', response: 'Take the stairs down into the Root & Retort, leave through the shop’s south door, and head west along the lower ward to Warden Mael beside the Covenant infirmary. He needs your account of the attack.', requiresFlags: ['opening.maraAskedWhere','opening.maraAskedCaravan','opening.maraAskedSurvival'], showWhenUnavailable: true, requirementText: 'Ask the three questions first', flagsSet: ['opening.maraConversationComplete'], completesTalkObjective: 'maraVell', closeAfterResponse: true }
    ],
    flagsSet: ['opening.metMara']
  },

  wardenMercyIntroduction: {
    id: 'wardenMercyIntroduction', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'So. You\'re the caravan survivor.',
    options: [
      { id: 'asking', label: 'That depends. Who\'s asking?', response: 'Warden Mael, appointed by Zarynth\'s Outer Office. I was sent to determine what the Rot Blight has done to Orrakai and the surrounding settlements.', nextNodeId: 'maelInvestigationQuestion' },
      { id: 'mara', label: 'Mara told me to find you.', response: 'She told me you had awakened. Considering the state in which we found you, that is better news than I expected. I am Warden Mael. Zarynth sent me to investigate the condition of Orrakai and the surrounding settlements.', nextNodeId: 'maelInvestigationQuestion' },
      { id: 'known', label: 'You already know who I am?', response: 'You are the only known survivor of a missing caravan. That makes you difficult to overlook. I am Warden Mael, appointed by Zarynth\'s Outer Office to investigate what is happening throughout this region.', nextNodeId: 'maelInvestigationQuestion' }
    ]
  },
  maelInvestigationQuestion: { id: 'maelInvestigationQuestion', speaker: 'You', speakerId: 'player', text: 'What exactly are you investigating?', nextNodeId: 'maelInvestigationAnswer' },
  maelInvestigationAnswer: {
    id: 'maelInvestigationAnswer', speaker: 'Warden Mael', speakerId: 'wardenMael',
    text: 'Disease. Failed harvests. Closed roads. Displaced families. Armed groups appearing where no armed groups should be. Cultural damage, economic collapse and military instability—the sort of suffering officials in Zarynth prefer summarized neatly after someone else has endured it.',
    nextNodeId: 'maelLastDawnQuestions'
  },
  maelLastDawnQuestions: {
    id: 'maelLastDawnQuestions', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'Ask what you need. I would rather work from your questions than my assumptions.',
    options: [
      { id: 'attack', label: 'Mara said the Last Dawn attacked my caravan.', response: 'That is what the evidence suggests. Witnesses saw their colours near the road, and we found their markings among the wreckage. They have occupied an abandoned keep near the Echoryn Forest. Since then, hunters have disappeared, shrines have been defaced and travellers have reported armed patrols moving through the woods.', flagsSet: ['mercy.maelAskedAttack'], excludesFlags: ['mercy.maelAskedAttack'], showWhenUnavailable: true, requirementText: 'Asked' },
      { id: 'order', label: 'What do you know about the Last Dawn?', response: 'They claim the Rot Blight is only a symptom of some greater corruption. Until recently, they confined themselves to warnings, damaged shrines and symbols carved into trees. Now they have taken a keep and begun appearing along the trade roads. Whatever restraint they once possessed appears to be gone.', flagsSet: ['mercy.maelAskedOrder'], excludesFlags: ['mercy.maelAskedOrder'], showWhenUnavailable: true, requirementText: 'Asked' },
      { id: 'missing', label: 'Are there other missing caravans?', response: 'Five in the past two months. Merchants, medicine shipments and even a refugee wagon bound for Zarynth. Yours was merely the first to leave someone alive.', flagsSet: ['mercy.maelAskedCaravans'], excludesFlags: ['mercy.maelAskedCaravans'], showWhenUnavailable: true, requirementText: 'Asked' },
      { id: 'continue', label: 'Why would they leave me alive?', requiresFlags: ['mercy.maelAskedAttack','mercy.maelAskedOrder','mercy.maelAskedCaravans'], showWhenUnavailable: true, requirementText: 'Ask all three questions', response: 'That is one of several questions I hoped you might answer.', nextNodeId: 'maelMemoryAdmission' }
    ]
  },
  maelMemoryAdmission: { id: 'maelMemoryAdmission', speaker: 'You', speakerId: 'player', text: 'I don\'t remember much of the attack.', nextNodeId: 'maelMemoryAdvice' },
  maelMemoryAdvice: { id: 'maelMemoryAdvice', speaker: 'Warden Mael', speakerId: 'wardenMael', text: 'Then begin with what you do remember. A voice. A symbol. Something unusual on the road. Small details have a habit of becoming important.', nextNodeId: 'maelCovenantStatement' },
  maelCovenantStatement: { id: 'maelCovenantStatement', speaker: 'You', speakerId: 'player', text: 'Mara said the Covenant helped save me.', nextNodeId: 'maelCovenantAnswer' },
  maelCovenantAnswer: {
    id: 'maelCovenantAnswer', speaker: 'Warden Mael', speakerId: 'wardenMael',
    text: 'They did. Their medicine brought down your fever, and their soldiers helped carry you into town. They have saved many people here. Orrakai would be considerably worse off without them.',
    options: [
      { id: 'grateful', label: 'You don\'t sound grateful.', response: 'Gratitude and scrutiny are not enemies. The Covenant deserves credit for the lives it has saved. That does not place it beyond examination.', flagsSet: ['mercy.covenantAnswerGratitude'], nextNodeId: 'maelCovenantTrust' },
      { id: 'watching', label: 'Then why are you watching them?', response: 'Because saving lives earns trust. Trust grants access. Access becomes influence. That does not make them guilty of anything. It simply makes their presence part of my investigation.', flagsSet: ['mercy.covenantAnswerInfluence'], nextNodeId: 'maelCovenantTrust' },
      { id: 'cure', label: 'Can they cure the Rot Blight?', response: 'They can ease the fever, slow the corruption and keep some victims alive. That is not the same as curing it. If the Covenant possessed a true cure, these tents would already be empty.', flagsSet: ['mercy.covenantAnswerCure'], nextNodeId: 'maelCovenantTrust' }
    ]
  },
  maelCovenantTrust: { id: 'maelCovenantTrust', speaker: 'Warden Mael', speakerId: 'wardenMael', text: 'I trust what I can verify. Their medicine helps. Their soldiers have made the roads safer. Their priests give frightened people something to hold on to.', nextNodeId: 'maelCargoQuestion' },
  maelCargoQuestion: {
    id: 'maelCargoQuestion', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'Before we discuss what happens next, I need to know more about your caravan. What was it transporting?',
    options: [
      { id: 'ordinary', label: 'Food, medicine and ordinary trade goods.', spokenText: 'Food, medicine and ordinary trade goods. Most of it was bound for settlements along the road.', response: 'Useful cargo, but hardly unusual. Common raiders would have taken everything they could carry. The Last Dawn searched the wreck and left valuable goods behind.', flagsSet: ['caravan_cargo_ordinary'], nextNodeId: 'maelAttackMemory' },
      { id: 'unknown', label: 'I was only a guard. I never saw the manifest.', response: 'Then we will need to find whoever arranged the shipment. If a copy of the manifest survives, it may explain why your caravan was chosen.', flagsSet: ['caravan_cargo_unknown'], nextNodeId: 'maelAttackMemory' },
      { id: 'concealed', label: 'Some of the cargo was kept hidden from us.', spokenText: 'Some of the cargo was kept hidden from us. There were reinforced crates marked for delivery in Zarynth.', response: 'Then either your merchants were protecting something valuable or they were being paid not to ask questions.', flagsSet: ['caravan_cargo_concealed'], nextNodeId: 'maelAttackMemory' }
    ]
  },
  maelAttackMemory: {
    id: 'maelAttackMemory', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'What do you remember about the attack itself? Did they make any demands?',
    options: [
      { id: 'cargo', label: 'They asked about the cargo.', response: 'Then this was not an attack of opportunity. They selected your caravan because of something aboard it.', flagsSet: ['caravan_attack_asked_about_cargo'], nextNodeId: 'maelDebtOpening' },
      { id: 'searching', label: 'They were searching for something.', response: 'That agrees with what I found. They left coin, food and tools scattered around the wreck. Whatever they wanted, it was specific.', flagsSet: ['caravan_attack_searching'], nextNodeId: 'maelDebtOpening' },
      { id: 'unclear', label: 'I couldn\'t hear them clearly.', response: 'Questioning the caravan master, you think. That is more than we knew before.', flagsSet: ['caravan_attack_unclear'], nextNodeId: 'maelDebtOpening' },
      { id: 'forgotten', label: 'I don\'t remember.', response: 'Do not force it. Memory has a habit of returning when something familiar gives it purchase.', flagsSet: ['caravan_attack_forgotten'], nextNodeId: 'maelDebtOpening' }
    ]
  },
  maelDebtOpening: {
    id: 'maelDebtOpening', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'Perhaps you can help investigate. First, I need to determine whether you can cross Orrakai without collapsing. Mara gave you her bed, used her medicine and watched over you while half the town competed for her attention. Hospitality like that creates an obligation.',
    options: [
      { id: 'amount', label: 'How much do I owe her?', response: 'More than you presently have, I expect. Medicine has become expensive, and Mara refuses to charge the sick what it is worth.', nextNodeId: 'maelAidOffer' },
      { id: 'noCoin', label: 'I don\'t have any coin.', response: 'I assumed as much. Anything you owned was lost with the caravan.', nextNodeId: 'maelAidOffer' },
      { id: 'noPayment', label: 'She never asked for payment.', response: 'She would not. That does not erase the debt.', nextNodeId: 'maelAidOffer' }
    ]
  },
  maelAidOffer: {
    id: 'maelAidOffer', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'Help with my work in Orrakai and I will cover what you owe her from my field allowance. Deliver Mara\'s medicine to one of the sick villagers. Bring clean water from the well stores. Ask any town watch guard about recent Last Dawn sightings; one stands in the open square below the Market Steps, and another watches the infirmary’s west side. Complete those tasks and your debt to Mara will be settled.',
    options: [{ id: 'acceptAid', label: 'I will return with something useful.', response: 'Listen, observe, and do not make the plague tents regret letting you stand.', flagsSet: ['mercy.maelIntroductionComplete','mercy.medicineParcelHeld','orrakai_extra_supply_unassigned'], completesTalkObjective: 'wardenMael', closeAfterResponse: true }]
  },
  wardenMercyAidIncomplete: {
    id: 'wardenMercyAidIncomplete', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'I asked you to help with the medicine, water and guard report. Finish the work before we discuss what comes next.'
  },
  orrakaiSickVillagerAid: {
    id: 'orrakaiSickVillagerAid', speaker: 'Sick Villager', speakerId: 'orrakaiSickVillager', appendNpcQuestOptions: false,
    text: 'The Cardinal blessed me last night. I slept for the first time in days.',
    options: [
      { id: 'deliver', label: 'I brought medicine from Mara Vell.', response: 'That sounds good. It was. But in the dream, I saw a door made of light. Something was knocking from the other side.', requiresFlags: ['mercy.medicineParcelHeld'], excludesFlags: ['mercy.medicineDelivered'], flagsSet: ['mercy.medicineDelivered','mercy.sickVillagerDreamHeard'], flagsCleared: ['mercy.medicineParcelHeld'], completesTalkObjective: 'orrakaiSickVillager', closeAfterResponse: true },
      { id: 'done', label: 'How are you feeling now?', response: 'The fever is lower. The dream is already beginning to feel foolish.', requiresFlags: ['mercy.medicineDelivered'] }
    ]
  },
  orrakaiWellStoresAid: {
    id: 'orrakaiWellStoresAid', speaker: 'Well Stores Attendant', speakerId: 'orrakaiWellStoresAttendant', appendNpcQuestOptions: false,
    text: 'The sealed barrels are tested each morning. Nothing leaves unmarked.',
    options: [
      { id: 'collect', label: 'Mael sent me for clean water.', response: 'Take this sealed container to the Covenant steward by the plague tents. I have added one spare flask; decide where it is needed.', requiresQuestStage: { questId: 'mercy_in_orrakai', stageId: 'aidPlagueTents' }, excludesFlags: ['mercy.cleanWaterHeld','mercy.cleanWaterDelivered'], flagsSet: ['mercy.cleanWaterHeld'] },
      { id: 'carrying', label: 'I have the sealed container.', response: 'Then keep the seal intact until the steward receives it.', requiresFlags: ['mercy.cleanWaterHeld'] }
    ]
  },
  orrakaiWaterDistributionAid: {
    id: 'orrakaiWaterDistributionAid', speaker: 'Covenant Water Steward', speakerId: 'orrakaiWaterDistribution', appendNpcQuestOptions: false,
    text: 'Clean water goes to the fever ward first. The spare flask is yours to allocate.',
    options: [
      { id: 'sick', label: 'Give the extra flask to the plague-tent workers.', response: 'We will reserve it for the sickest patient. The workers give a tired nod and add it to the marked supplies.', requiresFlags: ['mercy.cleanWaterHeld','orrakai_extra_supply_unassigned'], flagsSet: ['mercy.cleanWaterDelivered','orrakai_extra_supply_sick'], flagsCleared: ['mercy.cleanWaterHeld','orrakai_extra_supply_unassigned'], completesTalkObjective: 'orrakaiWaterDistribution', closeAfterResponse: true },
      { id: 'refugees', label: 'Give the extra flask to the refugee family.', response: 'They have children near the chapel square. I will see that it reaches them with the next ration crate.', requiresFlags: ['mercy.cleanWaterHeld','orrakai_extra_supply_unassigned'], flagsSet: ['mercy.cleanWaterDelivered','orrakai_extra_supply_refugees'], flagsCleared: ['mercy.cleanWaterHeld','orrakai_extra_supply_unassigned'], completesTalkObjective: 'orrakaiWaterDistribution', closeAfterResponse: true },
      { id: 'needWater', label: 'Where do I collect the water?', response: 'The well stores are west of the central square. Ask the attendant for a sealed container.', excludesFlags: ['mercy.cleanWaterHeld','mercy.cleanWaterDelivered'] }
    ]
  },
  orrakaiLowerGateGuardAid: {
    id: 'orrakaiLowerGateGuardAid', speaker: 'Orrakai Town Guard', speakerId: 'orrakaiLowerGateGuard', appendNpcQuestOptions: false,
    text: 'Last Dawn markings were found along the lower road three nights ago. We thought it was another warning until a hunter disappeared. Blood near the old well. Burned cloth. No body. Callworth sent a patrol, but I never heard what they found.',
    options: [
      { id: 'record', label: 'I will report that to Mael.', response: 'Tell him we have watch posts through town now. More eyes here, but still too few people to search the lower road safely.', requiresQuestStage:{questId:'mercy_in_orrakai',stageId:'aidPlagueTents'}, excludesFlags: ['mercy.guardReportHeard'], flagsSet: ['mercy.guardReportHeard'], completesTalkObjective: 'orrakaiLowerGateGuard', closeAfterResponse: true },
      { id:'directions',label:'Where can I find Mael and the other watch posts?',response:'Mael works beside the infirmary, west of the Root & Retort. Our South Road Guard stands in the open square below the Market Steps. Other posts watch the market, the infirmary’s west side, Warden’s Hall and the north gate. The north gate’s quartermaster explains the permit, coin and ration requirements for the Frontier Road.'},
      { id:'recorded',label:'I have the report for Mael.',response:'Good. He needs to hear about the lower road. Keep to the marked paths if you leave town.',requiresFlags:['mercy.guardReportHeard'],closeAfterResponse:true}
    ]
  },
  orrakaiRefugeeFamilyAid: {
    id: 'orrakaiRefugeeFamilyAid', speaker: 'Displaced Farmer', speakerId: 'orrakaiRefugeeParent', appendNpcQuestOptions: false,
    text: 'We came from the eastern farms. The roots reached the well before anyone understood what was happening. The Covenant gave us food when we arrived. Orrakai barely has enough for its own people, but they made room.',
    options: [{ id: 'check', label: 'Do you have somewhere to go?', response: 'Not anymore.', excludesFlags: ['mercy.refugeeFamilyChecked'], flagsSet: ['mercy.refugeeFamilyChecked'], completesTalkObjective: 'orrakaiRefugeeParent', closeAfterResponse: true }]
  },
  wardenMercyAidReport: {
    id: 'wardenMercyAidReport', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'You are still standing. That is encouraging. What did you learn?',
    options: [
      { id: 'well', label: 'The Last Dawn were seen near the old well.', response: 'The old well was abandoned before the outbreak reached Orrakai. If the Last Dawn are using it now, I need to know why.', flagsSet: ['mercy.reportedWell'], excludesFlags: ['mercy.reportedWell'], showWhenUnavailable: true, requirementText: 'Reported' },
      { id: 'covenant', label: 'The Covenant is doing more for Orrakai than anyone else.', response: 'They deserve credit for what they have done here. Just remember that good deeds and unanswered questions can exist together.', flagsSet: ['mercy.reportedCovenant'], excludesFlags: ['mercy.reportedCovenant'], showWhenUnavailable: true, requirementText: 'Reported' },
      { id: 'refugees', label: 'The refugees have nowhere left to return to.', response: 'That is becoming common. A settlement fails, its people move west, and the next settlement inherits a crisis it cannot support.', flagsSet: ['mercy.reportedRefugees'], excludesFlags: ['mercy.reportedRefugees'], showWhenUnavailable: true, requirementText: 'Reported' },
      { id: 'dream', label: 'One of the sick villagers described a strange dream.', response: 'Fever creates strange dreams. Write it down anyway.', flagsSet: ['mercy.reportedDream'], excludesFlags: ['mercy.reportedDream'], showWhenUnavailable: true, requirementText: 'Reported' },
      { id: 'finish', label: 'That is everything useful.', response: 'You listened. That is more valuable than swinging a sword at the first thing someone calls dangerous. Cardinal Callworth asked to speak with you. Find him near the chapel. Hear what he has to say, but remember what you have seen.', requiresAnyFlags: ['mercy.reportedWell','mercy.reportedCovenant','mercy.reportedRefugees','mercy.reportedDream'], showWhenUnavailable: true, requirementText: 'Report at least one observation', flagsSet: ['mercy.reportedToMael','mercy.debtToMaraSettled'], completesTalkObjective: 'wardenMael', closeAfterResponse: true }
    ]
  },
  lightwardenCaelenMilestone: {
    id: 'lightwardenCaelenMilestone', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen', appendNpcQuestOptions: false,
    text: 'This quest continues in the next implementation milestone.'
  },

  lightwardenCaelenIntroduction: {
    id: 'lightwardenCaelenIntroduction', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen', appendNpcQuestOptions: false,
    text: 'You are awake. That is a mercy.',
    options: [
      { id: 'saved', label: 'You helped save me?', response: 'One of our patrols found you near the caravan road. Warden Mael brought you back, and our healers helped bring down your fever. Many who contract the Rot Blight are not granted the same fortune.', flagsSet: ['mercy.caelenOpeningSaved'], nextNodeId: 'caelenLastDawnOpening' },
      { id: 'mael', label: 'Mael said you wanted to speak with me.', response: 'I did. Few people have survived an encounter with the Order of the Last Dawn, and fewer still have returned able to speak of it. Orrakai may benefit from whatever you remember.', flagsSet: ['mercy.caelenOpeningMael'], nextNodeId: 'caelenLastDawnOpening' },
      { id: 'known', label: 'You know who I am?', response: 'You are the survivor everyone has been discussing. In a town surrounded by death, survival rarely goes unnoticed.', flagsSet: ['mercy.caelenOpeningKnown'], nextNodeId: 'caelenLastDawnOpening' }
    ]
  },
  caelenLastDawnOpening: {
    id: 'caelenLastDawnOpening', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen',
    text: 'The Covenant found you wounded, fevered and alone. The Last Dawn left little behind after the ambush. They believe the Rot Blight proves the foundations of our world corrupt. Rather than help the suffering, they use that suffering to justify violence.',
    options: [
      { id: 'bolder', label: 'Mael says they are becoming bolder.', response: 'Warden Mael sees numbers, reports and trade routes. Useful things. But the Last Dawn are not merely a civic problem. Their doctrine turns fear into devotion and suffering into permission.', flagsSet: ['mercy.caelenAskedBoldness'], nextNodeId: 'caelenOldWellAssignment' },
      { id: 'searching', label: 'They appeared to be searching my caravan.', response: 'Then something aboard it attracted them. They do not raid for ordinary wealth. They seek relics, records and objects associated with the buried world.', flagsSet: ['mercy.caelenToldSearch'], nextNodeId: 'caelenOldWellAssignment' },
      { id: 'keep', label: 'Do you know why they occupied the old keep?', response: 'They believe the ruins beneath it contain something that should be awakened. Whether that belief is true matters less than how many people they are willing to sacrifice testing it.', flagsSet: ['mercy.caelenAskedKeep'], nextNodeId: 'caelenOldWellAssignment' }
    ]
  },
  caelenOldWellAssignment: {
    id: 'caelenOldWellAssignment', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen', appendNpcQuestOptions: false,
    text: 'There is another matter. Our attendants found fresh Last Dawn markings near the Old Well beyond Orrakai\'s lower road. One of our patrols investigated. It did not return. I want to know whether the Last Dawn are preparing another attack. If any of our people still live, bring them home. If they do not, learn what happened.',
    options: [
      { id: 'whyMe', label: 'Why send me?', response: 'Because you have already seen the Last Dawn at their most violent and survived. And because Orrakai has few people left who can hold a weapon.', flagsSet: ['mercy.caelenReasonSurvivor'], nextNodeId: 'caelenOldWellConclusion' },
      { id: 'plague', label: 'Mael thinks the well may be connected to the plague.', response: 'Then our purposes align. He seeks a cause. I seek to prevent another victim.', flagsSet: ['mercy.caelenReasonPlague'], nextNodeId: 'caelenOldWellConclusion' },
      { id: 'recovered', label: 'I just recovered from nearly dying.', response: 'Then you understand what awaits those who cannot defend themselves. I will not command you. But if you have strength enough to hold a blade, help us protect those who do not.', flagsSet: ['mercy.caelenReasonRecovery'], nextNodeId: 'caelenOldWellConclusion' }
    ]
  },
  caelenOldWellConclusion: {
    id: 'caelenOldWellConclusion', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen', appendNpcQuestOptions: false,
    text: 'Follow the lower road beyond the gate. The Old Well stands where the forest begins to overtake the fields. Look for red wax, burned cloth or symbols cut into the stone. And do not mistake desperation for weakness. The Last Dawn are most dangerous when they believe they are saving the world.',
    options: [{ id: 'accept', label: 'I will investigate the Old Well.', response: 'Lumora guide your steps—and your judgment.', flagsSet: ['mercy.caelenIntroductionComplete','mercy.oldWellAssigned'], completesTalkObjective: 'lightwardenCaelen', closeAfterResponse: true }]
  },
  lightwardenCaelenOldWellReminder: {
    id: 'lightwardenCaelenOldWellReminder', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen', appendNpcQuestOptions: false,
    text: 'The Old Well lies beyond the lower gate. If our patrol still lives, time will not favor them.'
  },
  lightwardenCaelenReturnReminder: {
    id: 'lightwardenCaelenReturnReminder', speaker: 'Cardinal Callworth', speakerId: 'lightwardenCaelen', appendNpcQuestOptions: false,
    text: 'You have returned. Speak with Warden Mael. He has taken responsibility for coordinating the investigation.'
  },
  wardenOldWellCheckIn: {
    id: 'wardenOldWellCheckIn', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'Callworth sent you to the Old Well. Nothing remains private in a settlement this frightened.',
    options: [
      { id: 'preparing', label: 'He thinks the Last Dawn are preparing something.', response: 'He may be right. That does not mean his explanation is complete.', flagsSet: ['mercy.maelOldWellTheory'], nextNodeId: 'wardenOldWellCheckInConclusion' },
      { id: 'patrol', label: 'He lost a patrol.', response: 'I was not informed that the Covenant had sent anyone. Find out when they went and what they were carrying.', flagsSet: ['mercy.maelOldWellPatrol'], nextNodeId: 'wardenOldWellCheckInConclusion' },
      { id: 'plague', label: 'You think the well is connected to the plague.', response: 'The earliest cases in Orrakai came from households using water from the lower road. The well was closed, but no one established whether it was the source or merely another victim.', flagsSet: ['mercy.maelOldWellPlague'], nextNodeId: 'wardenOldWellCheckInConclusion' }
    ]
  },
  wardenOldWellCheckInConclusion: {
    id: 'wardenOldWellCheckInConclusion', speaker: 'Warden Mael', speakerId: 'wardenMael',
    text: 'Bring evidence back to me before giving it to anyone else. I am not asking you to conceal it. I am asking you to let someone examine it before it becomes part of a sermon.',
    flagsSet: ['mercy.maelOldWellCheckInComplete']
  },
  wardenOldWellIncomplete: {
    id: 'wardenOldWellIncomplete', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'Search the Old Well properly. Symbols tell us who wanted to be seen. Equipment, tracks and bodies tell us what actually happened.'
  },
  wardenOldWellReturn: {
    id: 'wardenOldWellReturn', speaker: 'You', speakerId: 'player', appendNpcQuestOptions: false,
    text: 'The Last Dawn were at the Old Well. There was a ritual circle, red wax markings, and this.',
    nextNodeId: 'wardenLanternReaction'
  },
  wardenLanternReaction: {
    id: 'wardenLanternReaction', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'A Broken Covenant Lantern. Where did you find that? Did Callworth say the Covenant had already sent a patrol?',
    options: [
      { id: 'disappeared', label: 'He said a patrol disappeared.', response: 'Then he knew Covenant equipment might be present.', flagsSet: ['mercy.lanternAnswerDisappeared'], nextNodeId: 'wardenLanternMeaning' },
      { id: 'when', label: 'He did not explain when they went.', response: 'That omission may be innocent. It is still an omission.', flagsSet: ['mercy.lanternAnswerTiming'], nextNodeId: 'wardenLanternMeaning' },
      { id: 'guard', label: 'The guard said Callworth sent them.', response: 'Then the guard knew more about the investigation than the official responsible for documenting it.', flagsSet: ['mercy.lanternAnswerGuard'], nextNodeId: 'wardenLanternMeaning' }
    ]
  },
  wardenLanternMeaning: {
    id: 'wardenLanternMeaning', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'The damage could have occurred during a fight. It could have been stolen. It could have been planted. I think Orrakai is drowning, and the people handing out rope are asking us not to look too closely at where they tied the other end.',
    options: [
      { id: 'accusation', label: 'That sounds like an accusation.', response: 'No. An accusation requires evidence. This is a reason to keep looking.', flagsSet: ['mercy.lanternResponseEvidence'], nextNodeId: 'wardenHealingRiteConclusion' },
      { id: 'saving', label: 'They are still saving people.', response: 'Yes. That is precisely why careless suspicion would be as dangerous as blind trust.', flagsSet: ['mercy.lanternResponseRelief'], nextNodeId: 'wardenHealingRiteConclusion' },
      { id: 'lantern', label: 'What do we do with the lantern?', response: 'We determine who carried it, when the patrol left and why Callworth\'s account omitted details already known to the guard. Until then, we do not decide what the evidence means merely because one explanation is satisfying.', flagsSet: ['mercy.lanternResponseCustody'], nextNodeId: 'wardenHealingRiteConclusion' }
    ]
  },
  wardenHealingRiteConclusion: {
    id: 'wardenHealingRiteConclusion', speaker: 'Warden Mael', speakerId: 'wardenMael', appendNpcQuestOptions: false,
    text: 'The Covenant is beginning its evening healing rite. You should see it—because they have saved lives here, and because understanding what people believe requires seeing why they believe it.',
    options: [{ id: 'go', label: 'I will go to the chapel square.', response: 'Watch before you judge.', flagsSet: ['mercy.brokenLanternShownToMael','mercy.healingRiteInvited'], flagsCleared: ['mercy.brokenLanternHeld'], completesTalkObjective: 'wardenMael', closeAfterResponse: true }]
  },
  covenantHealingRiteMilestone: {
    id: 'covenantHealingRiteMilestone', speaker: 'Covenant Attendant', speakerId: 'covenantHealingRite', appendNpcQuestOptions: false,
    text: 'The healing rite gathers at the chapel square. This sequence continues in the next implementation milestone.'
  },
  maraTrainerDialogue: {
    id: 'maraTrainerDialogue',
    speaker: 'Mara Vell',
    text:
      'Welcome to the Root & Retort. I’m the apothecary’s daughter; I help with the remedies and anyone who needs them. Survival needs more than medicine, though. Roots split stone and keep growing. You can learn that stubbornness too.',
    options: [
      { id: 'train', label: 'Teach me Thornbinder survival.', response: 'Healing needs teeth. Vines, thorns, poison, roots. Learn all of it, then decide when mercy should bite back.', flagsSet: ['trainer.mara.introduced'] },
      { id: 'quest', label: 'How can I help Orrakai heal?', response: 'Bring living medicine. The Covenant tents have bandages and discipline; I can help them learn what the forest is changing underneath us.', startsQuest: 'maraRootsInAsh' },
      { id: 'wound', label: 'What is wrong with Echoryn?', response: 'The soil flinches near Divine Age stone. Blighted flesh is a symptom. Something beneath us keeps teaching the Rot where to return.', flagsSet: ['story.maraNamedHearthmereWound'] },
      { id: 'covenant', label: 'What do you think of the Covenant?', response: 'They kept you alive and keep Rot outside Orrakai. Their rites fail above certain old foundations, so I want roots from those sites before anyone wastes more medicine treating the wrong cause.', flagsSet: ['story.maraPurificationWarning'], requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theCovenantBlessing' } },
      { id: 'awakenedBlood', label: 'What do awakened bloodlines cost?', response: 'They cost the future version of you that might have chosen differently. Nephilim, Cambion, Vampire: each can be survived. None can be undone. Choose only when the loss feels as real as the power.' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['trainer.mara.introduced']
  },

  bramTrainerDialogue: {
    id: 'bramTrainerDialogue',
    speaker: 'Bram',
    text:
      'I still get scared before every fight. That is the secret nobody writes on a training dummy. You move anyway.',
    options: [
      { id: 'train', label: 'Teach me practical combat.', response: 'Watch stamina. Keep your feet. If one arrow is good, a volley is better, but only if you live long enough to loose it.', flagsSet: ['trainer.bram.introduced'] },
      { id: 'quest', label: 'Can the village defend itself?', response: 'Not yet. But we can teach hands to stop shaking after the first swing.', startsQuest: 'bramLanternDrill' },
      { id: 'roadLesson', label: 'Teach me how to survive the old road.', response: 'Do not spend every breath attacking. Block what you understand, dodge what you do not, and leave enough stamina to run when the road answers back.', flagsSet: ['story.bramRoadLesson'] },
      { id: 'lantern', label: 'Why keep the lantern?', response: 'Because it is small. That sounds stupid, but small lights are the ones people can carry.' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['trainer.bram.introduced']
  },

  duskTrainerDialogue: {
    id: 'duskTrainerDialogue',
    speaker: 'Kaelen Dusk',
    text:
      'If you came for forbidden power, listen first. Death is not evil. Using the dead like tools because you are lonely is.',
    options: [
      { id: 'train', label: 'Teach me death magic.', response: 'Names before bones. Consent before command. Lifesteal only teaches hunger unless you learn restraint.', flagsSet: ['trainer.dusk.introduced'] },
      { id: 'quest', label: 'What did purification take?', response: 'Names. Mine was nearly one of them. Help me recover the ones that have no mouths left.', startsQuest: 'duskNamesForTheDead' },
      { id: 'survivor', label: 'Why did I survive?', response: 'I cannot answer that. Mael found you and Mara kept you alive. Survival does not make you chosen. What you do next is your responsibility.' },
      { id: 'pactless', label: 'Can infernal blood exist without a pact?', response: 'Yes. Fire does not require worship. But power enjoys being mistaken for freedom. If you take it, make certain every chain is broken before it reaches your blood.', requiresQuestActive: 'cambionAshenPact' },
      { id: 'deathless', label: 'Can hunger be mastered?', response: 'For a while. Perhaps for a lifetime. The danger is not that a vampire must feed. It is that one day feeding may feel more honest than restraint.', requiresQuestActive: 'vampireRedChalice' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['trainer.dusk.introduced']
  },

  elianTrainerDialogue: {
    id: 'elianTrainerDialogue',
    speaker: 'Sister Elian',
    text:
      'A shield is a promise made visible. The Covenant gave me mine; the people behind it give that promise meaning.',
    options: [
      { id: 'train', label: 'Teach me the Oathkeeper path.', response: 'Guard first. Strike second. Faith that cannot protect a frightened stranger is decoration, not an oath.', flagsSet: ['trainer.elian.introduced'] },
      { id: 'quest', label: 'How can I serve?', response: 'The quarantine lanes need calm hands more than glorious ones. Learn who is afraid, then stand where their fear would otherwise spread.', startsQuest: 'elianTheOathAndTheChain' },
      { id: 'purification', label: 'Why does the Covenant purify?', response: 'Because the Rot spreads through soil, water, flesh, and memory. White fire, clean water, and careful records have saved thousands. At ancient foundations, we need to learn why those measures sometimes fail.', flagsSet: ['story.covenantBlessingWitnessed'], requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theCovenantBlessing' } },
      { id: 'covenant', label: 'What is the Covenant?', response: 'Physicians, teachers, historians, peacekeepers, priests—ordinary hands sharing one promise: civilization should outlive this darkness.' },
      { id: 'brokenHalo', label: 'What would a broken halo demand?', response: 'Judgment. Protection. Obedience, if you let it. A Nephilim must carry the light without becoming the hand of whatever first cast it.', requiresQuestActive: 'nephilimBrokenHalo' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['trainer.elian.introduced']
  },

  pilgrimRoadCheckpointDialogue: {
    id: 'pilgrimRoadCheckpointDialogue',
    speaker: 'Checkpoint Priest',
    text:
      'Names, rations, sins, destination. The Covenant records all pilgrims so the road may remain safe.',
    options: [
      { id: 'safe', label: 'The road seems safer than the frontier.', response: 'Safety is obedience made visible. Most people call that mercy when wolves are near.' },
      { id: 'unbound', label: 'What if someone cannot be blessed?', response: 'Then they are either miracle, threat, or paperwork. Pray you are the first.' , flagsSet: ['unbound.blessingDistorted'] },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['region.aureateMarches.firstCheckpoint']
  },

  lastLanternCrossingDialogue: {
    id: 'lastLanternCrossingDialogue',
    speaker: 'Last Lantern Echo',
    text:
      'Small light. Mortal light. Carried by hands that shake. Zephyr cannot understand why that matters.',
    options: [
      { id: 'listen', label: 'Listen to the echo.', response: 'Runalis was not first a world. Runalis was the first name the Light could not keep.', flagsSet: ['lore.runalisFirstUnbound'] },
      { id: 'zephyr', label: 'What does Zephyr want?', response: 'To end loneliness by ending the lonely. To end grief by ending the grieving.', flagsSet: ['unbound.zephyrDirectVoice'] },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['symbol.lantern.carriedToAct3']
  },

  maraOpeningHeal: {
    id: 'maraOpeningHeal',
    speakerId: 'mara',
    trigger: 'opening.wokeInOrrakai',
    text:
      'Hold still. If you die after I wasted good medicine, I am billing your ghost.',
    options: [
      { id: 'whoAreYou', label: 'Who are you?', response: 'Mara Vell, the apothecary’s daughter at the Root & Retort, and apparently the only person here willing to argue with death before breakfast.' },
      { id: 'whatHappened', label: 'What happened?', response: 'The Last Dawn hit your caravan, stole the sealed artifact, and burned the wagons. Covenant outriders found you before the Rot did.' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['opening.metMara', 'trainer.mara.introduced']
  },

  bramFirstDrill: {
    id: 'bramFirstDrill',
    speakerId: 'bram',
    trigger: 'opening.metMara',
    text:
      'Mara says you can stand. That means she likes you, or she wants someone else to carry boxes. Either way, I can show you the yard.',
    options: [
      { id: 'train', label: 'Teach me to fight.', response: 'Good. First lesson: stamina is courage with a number attached.' },
      { id: 'village', label: 'Tell me about Orrakai.', response: 'Crowded, muddy, stubborn. It has survived by making exhaustion look like a civic duty.' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['opening.metBram', 'trainer.bram.introduced']
  },

  duskUnboundWarning: {
    id: 'duskUnboundWarning',
    speakerId: 'dusk',
    trigger: 'unbound.blessingDistorted',
    text:
      'The blessing broke around you. That is not luck. That is a sentence waiting for the right judge.',
    options: [
      { id: 'whatAmI', label: 'What am I?', response: 'Unbound, if the old stories are not lying. Hard to claim. Harder to forgive.' },
      { id: 'darkMagic', label: 'Are you corrupted?', response: 'No. Damaged. There is a difference, though priests charge extra to ignore it.' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['trainer.dusk.introduced']
  },

  elianFaithCracks: {
    id: 'elianFaithCracks',
    speakerId: 'elian',
    trigger: 'story.purificationTruthSeen',
    text:
      'I watched a woman forget her child and call it peace. I have prayed all night and no prayer has made that holy.',
    options: [
      { id: 'protectPeople', label: 'Faith should protect people.', response: 'Yes. That was the first vow. How did we bury it under obedience?' },
      { id: 'leaveCovenant', label: 'Then leave them.', response: 'A vow broken carelessly is vanity. A vow kept blindly is cruelty. I need to know which I am doing.' },
      { id: 'leave', label: 'Leave.', close: true }
    ],
    flagsSet: ['trainer.elian.doubtAwakened']
  },

  malakarRootReveal: {
    id: 'malakarRootReveal',
    speakerId: 'malakar',
    trigger: 'boss.malakar.postFight',
    text:
      'The Order needed me. It did not worship me. Only someone who remembers the Divine Age can name what was removed from it. When you stand before Seraphel... listen carefully. He has not lied for thousands of years. He has simply never told all of the truth.',
    flagsSet: ['unbound.malakarRecognized', 'story.malakarTruthHeard', 'story.lastDawnNeededMalakar', 'lore.malakarPrimordialWitness']
  },

  seraphelTruth: {
    id: 'seraphelTruth',
    speakerId: 'seraphel',
    trigger: 'boss.seraphel.preFight',
    text:
      'The Covenant does not worship Light. It feeds it. Every confession, every cleansing, every empty smile is another mouthful.',
    flagsSet: ['story.zephyrNamed', 'unbound.seraphelConfirmed']
  },

  zephyrOffer: {
    id: 'zephyrOffer',
    speakerId: 'zephyrLight',
    trigger: 'boss.zephyr.preFight',
    text:
      'You have carried them all. Their fear. Their grief. Their hope. Let me carry it now.',
    flagsSet: ['unbound.zephyrDirectVoice', 'zephyr.personalOffersHeard']
  }
};

export const CLASS_SPECIFIC_REACTION_TRIGGERS = {
  oathkeeper: [
    {
      trigger: 'region.aureateMarches.firstCheckpoint',
      speakerId: 'elian',
      line: 'They will call your shield proof that you belong to them. Make it proof that you do not.'
    }
  ],
  templar: [
    {
      trigger: 'region.aureateMarches.firstCheckpoint',
      speakerId: 'elian',
      line: 'They will call your shield proof that you belong to them. Make it proof that you do not.'
    }
  ],
  gravecaller: [
    {
      trigger: 'region.aureateMarches.firstCheckpoint',
      speakerId: 'dusk',
      line: 'Stand tall. They hate bowed Gravecallers less because fear looks like confession.'
    }
  ],
  necromancer: [
    {
      trigger: 'region.aureateMarches.firstCheckpoint',
      speakerId: 'dusk',
      line: 'Stand tall. They hate bowed Gravecallers less because fear looks like confession.'
    }
  ],
  thornbinder: [
    {
      trigger: 'story.failedPurificationGrove',
      speakerId: 'mara',
      line: 'See that? Roots growing through their clean stone. Nature has no respect for doctrine.'
    }
  ],
  fellhunter: [
    {
      trigger: 'travel.pilgrimRoad.firstCamp',
      speakerId: 'bram',
      line: 'We count rations, sharpen blades, and sleep in shifts. Heroism is mostly inventory with better posture.'
    }
  ],
  mercenary: [
    {
      trigger: 'travel.pilgrimRoad.firstCamp',
      speakerId: 'bram',
      line: 'We count rations, sharpen blades, and sleep in shifts. Heroism is mostly inventory with better posture.'
    }
  ]
};

export function getStoryDialogueTrigger(id) {
  return STORY_DIALOGUE_TRIGGERS[id] || null;
}
