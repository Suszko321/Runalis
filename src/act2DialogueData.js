import {ACT2_FLAGS as F, SERAPH_DOMAINS, domainFlag} from './act2CampaignData.js';
import {SERAPH_TRIALS,SERAPH_PROOFS} from './seraphTrialData.js';

const node = (id, speaker, text, options) => ({id, speaker, text, options, appendNpcQuestOptions:false});
const option = (id, label, response, act2Action, requiresFlags = [], excludesFlags = []) =>
  ({id, label, response, act2Action, requiresFlags, excludesFlags, closeAfterResponse:true});
const leave = {id:'leave',label:'Leave',close:true};
const topic = (id,label,response) => ({id,label,response});
const d = (domain,key) => domainFlag(domain,key);
const trialAccord=(id,result,label)=>option(result,label,null,`accord:${id}:${result}`,SERAPH_PROOFS[id][result].map(key=>d(id,key)),[d(id,'relic'),d(id,'challenged')]);

const bastion = 'lastStandBastion';
const ossuary = 'forgottenOssuary';
const hour = 'unfinishedHour';
function guardian(id, text, options, endings) {
  const {guardian:name,relic} = SERAPH_DOMAINS[id];
  return node(`act2-${id}-keeper`,name,text,[
    ...options,
    option('duel',`Challenge the custodian for ${relic}.`,null,`challenge:${id}`,[],[d(id,'relic'),d(id,'challenged')]),
    {...topic('allied','Speak about our agreement.',endings[0]),requiresFlags:[d(id,'accord')]},
    {...topic('rival','Speak about our duel.',endings[1]),requiresFlags:[d(id,'force')]},
    leave
  ]);
}

export const ACT2_DIALOGUES = {
  act2MaelCommission: node('act2MaelCommission','Warden Mael',
    'I have the keep reports. The court will ask whether I saw Malakar, and I did not. You did. Come to Zarynth and tell them what you saw. Tell them what he said, too. If we leave out the part that troubles us, we are writing the answer before we ask the question.',[
      option('commission','I’ll testify in Zarynth.','Take the Pilgrim Road to Saint Orvane and ask for Examiner Sera. Callworth has written you a letter. He also sent clean bandages and food. I’d take both.', 'commission'),
      leave
    ]),
  act2Examiner: node('act2Examiner','Examiner Sera',
    'The seal on your letter is genuine. The light gathering around your hand is why I called you back. You were standing close when a Primordial manifestation collapsed, weren’t you?',[
      option('witnesses','Explain how I can enter Zarynth.','The Concordant Ward reads what Malakar left on you. It takes three relics to vouch for that signature: Kaedros’s Iron Vow, Morisyl’s Mourning Bell and Elyndra’s Lucid Mirror. Follow the imperial highway. The watchfires, the burial stones and the broken observatory mark their roads.', 'ward',[F.commission],[F.ward]),
      topic('law','Why would the Ward accept relics won in a duel?','It was built to recognize their authority. It has no way to ask how you came by it. Even Seraphel cannot stand in for the three.'),
      topic('map','Where are their domains?','The Bastion is above the highway west of Longwater. The Ossuary is down the burial road from the South Bank. For the Unfinished Hour, look for the observatory above Eastwind Caravan Yard.'),
      leave
    ]),
  [`act2-${bastion}-keeper`]: guardian(bastion,
    'Captain Iria would shelter every wagon. Marshal Denn would shut the gate. There are sick people in that caravan, and there are children inside my walls. I answer for both.',
    [
      trialAccord(bastion,'freightConvoy','The freight cradle is ready and stocked. Send Iria along the river shelf.'),
      topic('reliefRoad','Is there another way to reach the wagons?',SERAPH_TRIALS[bastion].hint),
      topic('commanders','What do your commanders need?','Iria needs the road cleared. Denn needs clean water brought from the east stores and a separate place for the sick. Go to them. I will hear a plan you are willing to help carry out.'),
      option('refuge','I cleared the road and secured clean water. Open the outer refuge.',null,`accord:${bastion}:outerRefuge`,[d(bastion,'road'),d(bastion,'water')],[d(bastion,'relic'),d(bastion,'challenged')]),
      option('escort','Set up a screened shelter and have the watch escort every wagon.',null,`accord:${bastion}:screenedEscort`,[d(bastion,'road'),d(bastion,'watch'),d(bastion,'water')],[d(bastion,'relic'),d(bastion,'challenged')])
    ],['The wagons reached the refuge. If your own gates ever close, send word to my watch.','Our duel is entered in the muster roll. I will remember how you stood, and what you came to take.']),
  act2Iria: node('act2Iria','Captain Iria','The blighted pack has cut off the refugee wagons in the western yard. I have two sound horses and four riders. Clear the yard and I can bring everyone up in one pass.',[
    option('greyhaven','Ask Greyhaven to bring water to the outer refuge.','Your riders already carry water to frontier camps. I can show them where to leave the barrels so the two supplies stay separate.',`order:${bastion}:water`,['order.founded'],[d(bastion,'water'),d(bastion,'relic')]),
    option('watch','The yard is clear. Can you escort people through a screened shelter?','If Denn can keep the shelter separate, yes. I’ll ride in the first wagon.',`proof:${bastion}:watch`,[d(bastion,'road')],[d(bastion,'watch')]),
    leave
  ]),
  act2Denn: node('act2Denn','Marshal Denn','The old well feeds the whole Bastion. The east cistern is separate. Clear the stores and release that supply, and I can keep the sick somewhere we know the spillage won’t reach the well.',[leave]),
  [`act2-${ossuary}-keeper`]: guardian(ossuary,
    'I know the names of everyone buried here down to the child whose marker was set yesterday. Something has rooted beneath the memorial. It feeds on what I am sworn to keep.',
    [
      trialAccord(ossuary,'keeperOfRites','I sounded the three chimes and read the unmarked alcove. Will you perform the final rites?'),
      topic('oldRite','Can I quiet the dead without cutting my way through them?',SERAPH_TRIALS[ossuary].hint),
      option('greyhaven','Compare the copy of the court record held at Greyhaven.','The copy preserves the order beneath the seal. Keep it here with the original testimony. Now we need the flooded record and a place to read them.',`order:${ossuary}:archive`,['order.founded'],[d(ossuary,'archive'),d(ossuary,'relic')]),
      topic('records','What should I look for?','Two accounts of the same reign. One lies in the flooded vault, one in the archive. Bring them through the silt and clear the growth from the central memorial.'),
      option('publish','Preserve both accounts. Read the testimony publicly.',null,`accord:${ossuary}:publicRecord`,['crypt','archive','memorial'].map(k=>d(ossuary,k)),[d(ossuary,'relic'),d(ossuary,'challenged')]),
      option('seal','Preserve both accounts. Let the families decide when to release the names.',null,`accord:${ossuary}:sealedRecord`,['crypt','archive','memorial'].map(k=>d(ossuary,k)),[d(ossuary,'relic'),d(ossuary,'challenged')])
    ],['The original testimony will survive. I can promise that, even where I cannot remember the person who spoke it.','I remember our contest. I will remember it when you come to ask for something the Ward cannot give.']),
  [`act2-${hour}-keeper`]: guardian(hour,
    'There is a life here where your caravan reached the city without losing a single wheel. I could show you where you slept that night. Would you take that life if I offered it?',
    [
      trialAccord(hour,'anchorReality','I followed the still star. My own road is still visible in the glass.'),
      topic('star','What is that unmoving star above the islands?',SERAPH_TRIALS[hour].hint),
      topic('visions','What am I supposed to see in here?','Walk the three islands. In each one, someone has made a choice for somebody else. I am curious which choice you will keep.'),
      option('refuse','Keep the life I have. The survivors get to choose what they do with theirs.',null,`accord:${hour}:keepMyLife`,['caravan','orrakai','covenant'].map(k=>d(hour,k)),[d(hour,'relic'),d(hour,'challenged')]),
      option('accept','I would take a second chance, if the people in it could still refuse me.',null,`accord:${hour}:anotherChance`,['caravan','orrakai','covenant'].map(k=>d(hour,k)),[d(hour,'relic'),d(hour,'challenged')])
    ],['I will leave that door where you found it. The next choice is yours to make when you get there.','You chose a very definite way of asking. I am still curious what you will do when strength buys you nothing.']),
  act2Vara: node('act2Vara','Quartermaster Vara',
    'I can move a wagon quietly or I can move it fast. The old freight cradle gives us a third choice, if the watch remembers the signal.',[
      topic('charter','Show me the relief route.',SERAPH_TRIALS[bastion].hint),
      option('pledge','Commit eight field rations to the convoy.','Eight rations on the tally. Tell Kaedros he can send the families down the relief road. Vara will see them fed.',`pledge:${bastion}`,[d(bastion,'supplyLine')],[d(bastion,'reliefPledge'),d(bastion,'relic'),d(bastion,'challenged')])
    ]),
  act2Nin: node('act2Nin','Nin, Last Ossuary Scribe',
    'A blank marker is still a grave. If the chimes quiet the halls, carry that lesson to the unmarked alcove.',[
      topic('rite','In what order do the chimes sound?',SERAPH_TRIALS[ossuary].hint)
    ]),
  act2Astronomer: node('act2Astronomer','An Astronomer Who Never Was',
    'The station log puts dawn to the east and dusk to the west. Midnight is the one direction the instrument cannot point by itself.',[
      topic('constellation','Tell me how to align the glasses.',SERAPH_TRIALS[hour].hint)
    ]),
  act2NinRest: node('act2NinRest','Nin, Last Ossuary Scribe','Morisyl finished the rite herself. She read every name, even the ones for which our stone has no letters. Nothing stirred in the water. I thought you should know that.',[]),
  act2AstronomerRest: node('act2AstronomerRest','An Astronomer Who Never Was','I used to draw three stars in the same place. The middle glass shows only one now. I have been looking at it for nearly an hour. For once that is how long it has been.',[]),
  act2Zephyr: node('act2Zephyr','Zephyr Light',
    'They said there were twelve in the wagon. I count thirteen. Bring the last stretcher closer. You there, hold his hand until the shaking stops.',[
      option('miracle','Stay with the patient.','There. Breathe as slowly as I do. Good. Ask the ones who can walk to carry water to the others. You must be Mael’s witness. I’d like to hear how you got past the Ward when we have a quieter room.', 'miracle',[F.admitted],[F.miracle]),
      topic('people','What happens to the people you healed?','They need beds, food and someone to tell their families where they are. We can still fail them after the fever breaks.'),
      leave
    ]),
  act2Seraphel: node('act2Seraphel','Seraphel',
    'The woman at the fountain has been waiting for word of her son. I told her I would find him. I intend to keep that promise. Come. We can talk while they look through the rolls.',[
      option('audience','Malakar told me to be careful of you.','I imagine he did. He remembered much that others have forgotten. He also believed every terrible thing he did was preventing something worse. I would hear what he said in his own words, if you remember them.', 'audience',[F.miracle],[F.seraphel]),
      topic('ward','Did you choose the three custodians?','I witnessed their charge. After the Divine War, there were good reasons to keep any one of us from opening the gate alone. Those reasons have aged well.'),
      leave
    ]),
  act2Cassian: node('act2Cassian','Emperor Cassian',
    'If I close our borders, our neighbours starve. If I open them, the Blight reaches my people. And every morning the Covenant finds another hundred lives my government could not save. How long before people decide they no longer need an emperor?',[
      option('commission','Tell me what you need done now.','Roots have split an aqueduct beneath the refuge. My engineers cannot agree with the Covenant on how far to let their people go. Take the eastern stairs below the market. I need someone who will tell me what is actually down there.', 'cassian',[F.seraphel],[F.cassian]),
      leave
    ]),
  act2Sluice: node('act2Sluice','Engineer Tavia',
    'There are families in the lateral tunnels. Captain Renn wants the arches dropped before the roots reach the refuge above. Sister Neve says she knows exactly where the families are. The emergency bypass could buy us time, but someone would have to clear both valve galleries.',[
      option('evacuate','Hold the arches. Get the families out first.',null,'respond:evacuate',[F.entered],['act2.responsePlan']),
      option('seal','Drop the arches now. Protect the refuge above.',null,'respond:seal',[F.entered],['act2.responsePlan']),
      option('divert','I’ll clear both valve galleries. Use the bypass and evacuate.',null,'respond:divert',[F.entered],['act2.responsePlan']),
      leave
    ]),
  act2Aftermath: node('act2Aftermath','Zephyr Light',
    'The roots have stopped moving. The fever hasn’t. It is running along the water toward the refuge. Open the grating. I need to reach the water before it gets there.',[
      option('intervention','Open the grating and stay with the evacuation crew.','The surface light reaches the water; then the water itself gives off light. Above you, someone calls for more stretchers. A second voice calls back that the patients have started waking up.', 'intervention',[F.behemoth],[F.intervention]),
      topic('families','Have you heard from the families?','The refuge has a list. Let the healers finish it before anyone promises that a name will be on it.'),
      leave
    ]),
  act2MaelReports: node('act2MaelReports','Warden Mael',
    'Close the door. The maintenance office kept a second ledger. This one begins before the first recorded infection. Three entries were sent to an office with no name. The first page that might tell us why is gone.',[
      option('reports','You’ve investigated this disease for years. What changes now?','I think we have been asking the wrong question. We know more about how the Blight spreads than we did a year ago. Now I want to know where it begins.', 'reports',[F.intervention],[F.reports]),
      leave
    ])
};
