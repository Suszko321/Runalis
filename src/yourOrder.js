// Optional founding content and persistent social state. No campaign dependency.
import {countItem,removeItem,addItem} from './player.js';
import {getStoryFlag,setStoryFlag} from './storyProgress.js';
import {flagObjective} from './act1CampaignData.js';
export const ORDER_TITLES = ['The Forgotten Refuge','A Claim of Your Own','Stone and Bread','A Place at the Table','The First Recruits','The Work of Leadership','What We Believe','The Price of Shelter','The Weight of a Name'];
export const ORDER_FLAGS = ['surveyed','charter','restored','founded','staffed','operation','doctrine','shelter','recognized'];
export const ORDER_QUESTS = Object.fromEntries(ORDER_TITLES.map((title,i)=>[`yourOrder${i+1}`,{
  id:`yourOrder${i+1}`,title,type:'organization',hidden:true,giverNpcId:'tavinHolt',
  summary:'Your Order is optional. The main investigation can continue at any time.',
  stages:[{id:ORDER_FLAGS[i],title,text:[
    'Follow the western refuge track from the Old Well. Speak with Tavin, Iona and Pell in Greyhaven’s damaged hall.',
    'Ask Warden Mael in Orrakai about provisional stewardship. The occupants must not be displaced.',
    'Agree repairs with Tavin, supply food, clean the cistern and defeat both beasts in the storehouse. Talk to Iona about the residents’ future.',
    'Share a meal at the hall ledger and choose your organization’s name, banner, purpose and membership policy.',
    'Invite at least three willing people and assign their responsibilities at the ledger. Townspeople may affiliate while retaining their duties.',
    'Use the ledger to choose relief, security, recovery or trade. Complete a real undertaking and return to the hall.',
    'Hear Corven’s offer at the hall, then establish knowledge and leadership policies at the ledger.',
    'Speak with Derren and Lysa at the refuge gate. Make an intake decision, then discuss treatment with the Covenant attendant. Supplies and medical facilities matter.',
    'Speak with Mael on his visit to Greyhaven, then gather your actual members at the ledger.'
  ][i],objectives:[flagObjective(`order.${ORDER_FLAGS[i]}`,title)]}],rewards:{xp:{renown:20}}
}]));
export function ensureOrder(p){
  p.yourOrder ||= {members:{},relationships:{},rep:0,facilities:{},operations:{},policy:'voluntary',knowledge:'controlled',leadership:'council'};
  return p.yourOrder;
}
const names={tavinHolt:'Tavin Holt',ionaVey:'Iona Vey',pellRusk:'Pell Rusk',corvenDask:'Corven Dask',derrenHale:'Derren Hale',lysaHale:'Lysa Hale'};
const roles={tavinHolt:'workshop',ionaVey:'garden',pellRusk:'scouting',corvenDask:'research',maraVell:'medicine',bram:'guard'};
const option=(id,label,response,orderAction,extra={})=>({id,label,response,orderAction,closeAfterResponse:true,...extra});
const flag=(p,id)=>getStoryFlag(p,`order.${id}`);
function pay(p,cost){if(!cost.every(([id,n])=>(id==='ashCoin'?Number(p.gold||0):countItem(p,id))>=n))return false;for(const[id,n]of cost){if(id==='ashCoin')p.gold-=n;else removeItem(p,id,n);}return true;}
export function orderRecruitmentOptions(npc,p){
  if(!flag(p,'founded')||!npc?.npcId)return [];
  const o=ensureOrder(p),id=npc.npcId;
  if(npc.campaignFixture||npc.disposition==='hostile'||/malakar|regulator|ledger|child|rite|marked|maelEvening/i.test(id))return [];
  const candidates=new Set([...Object.keys(names),'wardenMael','lightwardenCaelen','greyhavenMael','maraVell','bram','maraSmith','sisterElian','kaelenDusk','hunterScout','act1ReliefScout','greyhavenMerchant']);
  if(!candidates.has(id))return [];
  if(o.members[id])return [option('orderMember','How is your assignment? ',`I am working on ${o.members[id].role || 'the next assignment'}. My existing responsibilities still matter.`,null)];
  const duty=['wardenMael','lightwardenCaelen','greyhavenMael'].includes(id);
  const trust=(o.relationships[id]||0)>=0;
  const response=duty?'My present duty comes first. We can cooperate, but I cannot join your organization.':!trust?'Not after how you treated us. Bring supplies to the hall and make things right before asking again.':id==='ionaVey'&&o.knowledge==='unrestricted'?'I will not join while dangerous research has no safeguards. Change that policy and ask again.':id==='corvenDask'&&o.knowledge==='restricted'?'There is no place for my research under your present policy.':`${names[id]||npc.name}: I can offer ${roles[id]||'local assistance'}, provided I keep my responsibilities here. I will join willingly on those terms.`;
  const willing=!duty&&trust&&!(id==='ionaVey'&&o.knowledge==='unrestricted')&&!(id==='corvenDask'&&o.knowledge==='restricted');
  return [option('recruitOrder','Would you join my Order?',response,willing?{type:'recruit',id,name:names[id]||npc.name,role:roles[id]||'trade',affiliate:!names[id]}:null)];
}
export function getOrderDialogue(npc,p,world){
  const id=npc.npcId,o=ensureOrder(p),opts=[];let text='';
  if(id==='tavinHolt'){
    text='“Higher.” “It is higher,” Pell answers. “Then explain why it’s still on my foot.” Tavin turns. “Unless you brought timber, food, or another pair of hands, this isn’t a good time.”';
    if(!flag(p,'met'))opts.push(option('help','I heard people were sheltering here.','People shelter wherever the rain doesn’t reach. Iona can tell you what we need. Mael may know who owns the place.',{type:'meet'}),option('threat','Mind your manners.','Then decide whether you came to help or threaten us.',{type:'threat'}),option('leave','I cannot take this on.','Wouldn’t be the first time. You can come back.',null));
    if(flag(p,'charter')&&!flag(p,'materials')){
      text='The charter looks official. I was hoping the roof would fix itself before someone started issuing paperwork. Timber, stone, nails. Do you want it standing a week, or a decade?';
      for(const [key,label,cost,quality,trust]of [
        ['durable','Make it last (12 timber, 8 stone, 4 scrap).',[['echorynSoftwood',12],['fieldstone',8],['ironScrap',4]],'durable',10],
        ['usable','Make it usable (6 timber, 4 stone, 2 scrap).',[['echorynSoftwood',6],['fieldstone',4],['ironScrap',2]],'usable',0],
        ['salvage','Use salvage (4 timber, 2 scrap).',[['echorynSoftwood',4],['ironScrap',2]],'salvaged',-5],
        ['pay','Buy materials and labour (80 coins).',[['ashCoin',80]],'usable',5]
      ])opts.push(option(key,label,'We can start once the storehouse is safe and the cistern clean.',{type:'materials',cost,quality,trust},{requiresItems:cost}));
    }
  } else if(id==='ionaVey'){
    if(!flag(p,'metIona'))opts.push(option('listen','What brought you here?','We need somewhere dry, clean water, food and a garden. Talk to Pell as well; he knows the road.',{type:'introduction',person:'Iona'}));
    text='The farm is gone. Orrakai needs food and medicine, not three more people asking for both. I can keep a garden and tend the sick. What happens to us when the repairs are done?';
    if(flag(p,'charter')&&!flag(p,'residents'))for(const[key,label,reply,trust]of [['welcome','Stay as long as you wish.','Even if we cannot pay? Thank you.',15],['shared','Everyone should contribute.','That is fair.',10],['demand','You must work for me to stay.','I thought this was a refuge.',-10],['undecided','I have not decided.','Tell us before we settle in.',0]])opts.push(option(key,label,reply,{type:'residents',policy:key,trust}));
    if(flag(p,'charter')&&!flag(p,'food'))opts.push(option('food','Donate six Field Rations.','That feeds us while we restore the kitchen.',{type:'food',cost:[['fieldRations',6]]},{requiresItems:[['fieldRations',6]]}));
    if(flag(p,'founded')&&!o.facilities.medicine)opts.push(option('medicine','Stock a treatment room (4 Emberleaf, 2 tonics).','Clean bedding, separate water and proper medicine. Now we can offer care here.',{type:'facility',facility:'medicine',cost:[['emberleaf',4],['shrineTonic',2]]},{requiresItems:[['emberleaf',4],['shrineTonic',2]]}));
  } else if(id==='pellRusk'){
    if(!flag(p,'metPell'))opts.push(option('listen','How can I help?','Hear Tavin and Iona out. Then ask Mael who owns the place. We cannot promise away someone else’s land.',{type:'introduction',person:'Pell'}));
    text='Tavin says I removed the door. I say it was broken. If this place is going to work, we need people. Ask in Orrakai; they can help without abandoning the town.';
  } else if(id==='wardenMael'&&world?.mode==='capital'&&flag(p,'surveyed')&&!flag(p,'charter')){
    text='Greyhaven reverted to the Crown when the fellowship dissolved. I can authorize provisional stewardship: restore the hall, maintain sanitation, do not displace its occupants. You are not above imperial law. What do you intend?';
    for(const[key,label]of [['protection','People need somewhere safe.'],['power','I want influence.'],['knowledge','I want to uncover hidden things.'],['wealth','A guild could make me wealthy.'],['independence','I want a home.'],['undetermined','I do not know yet.']])opts.push(option(key,label,'Then start with a roof that does not leak. Here is the provisional charter.',{type:'charter',purpose:key}));
  } else if(id==='corvenDask'&&flag(p,'operation')&&!flag(p,'researchDecision')){
    text='Iona: “Absolutely not.” Corven unwraps a dark ceremonial object. “Recovered from a burial vault. It responds to magic.” “You said people died near it,” Iona replies. “People die near all manner of things.” Tavin folds his arms. “Will it explode?” “I have no evidence of that.” “You haven’t evidence of much.”';
    for(const[key,label,reply]of [['controlled','Research under supervision.','It will stay away from the living quarters.'],['restricted','Take it elsewhere.','A disappointing answer. I will leave peacefully.'],['confiscate','Leave it here. You are not staying.','On what authority? No. I am taking my property with me.'],['unrestricted','No restrictions. Find out everything.','Then we understand each other. Iona looks uneasy.']])opts.push(option(key,label,reply,{type:'research',policy:key}));
    opts.push(option('hear','Hear everyone before deciding.','Iona wants separation from patients. Tavin wants fire precautions. Pell wants to know who will pay for a new roof.',{type:'consult'}));
  } else if(id==='derrenHale'&&flag(p,'doctrine')&&!flag(p,'intake')){
    text='We have walked for two days. Lysa only started coughing yesterday. Let her rest. The lower field went black, then the orchard. Our neighbours were sick before we left.';
    for(const[key,label]of [['admit','Let them in; separate the sick.'],['examine','Examine everyone first.'],['limited','Offer food, but no lodging.'],['reject','You must leave.']])opts.push(option(key,label,key==='reject'?'Then we will try elsewhere.':'Iona prepares a separate place while the Covenant attendant waits at the gate.',{type:'intake',decision:key}));
  } else if(id==='greyhavenAttendant'&&flag(p,'intake')&&!flag(p,'shelter')){
    text='Callworth sent us to find the family. We can examine Lysa here or offer care in Orrakai. I wish I could promise a cure. You can come with us and speak to the Cardinal.';
    for(const[key,label]of [['onsite','Examine her here.'],['transfer','Offer transfer to the infirmary.'],['choice','Ask Lysa what she wants.'],['refuse','She is under my protection. Leave.']])opts.push(option(key,label,key==='refuse'?'We are not here to arrest anyone. If her condition worsens, send word.':'Lysa asks whether Derren can accompany her. “Of course.” She agrees to care, at the refuge if equipped, otherwise in Orrakai.',{type:'shelter',decision:key}));
  } else if(id==='lysaHale')text=o.shelterOutcome==='covenant'?'The attendants helped my breathing. Derren stayed with me. I am still tired.':'I want treatment. If Derren can come with me, I will go to Orrakai. If there is a proper treatment room here, I would rather rest here.';
  else if(id==='greyhavenMael'&&flag(p,'shelter')&&!flag(p,'assessment')){
    text=`It is still standing. ${o.shelterOutcome==='rejected'?'People remember that you turned a sick family away.':o.shelterOutcome==='negligence'?'The sickroom needs urgent supplies. Promising shelter creates obligations.':'You have helped people the town could not accommodate.'} I have recorded your repairs, inhabitants and work. The stewardship stands. You still answer for what happens here.`;
    for(const[key,label,delta]of [['thanks','I appreciate your help.',10],['loyal','The Empire will not regret this.',15],['defy','I will not answer to anyone forever.',-15],['ambition','This is only the beginning.',0]])opts.push(option(key,label,'Then put the place to use. Your members are waiting at the hall.',{type:'assessment',delta}));
  } else if(id==='greyhavenLedger'){
    text='The Order Ledger records real supplies, consenting members, assignments and decisions. The fire warms the repaired hall. Pell has found cups; Tavin wants to know who will wash them.';
    if(flag(p,'restored')&&!flag(p,'founded'))opts.push(option('found','Name Your Order.','Choose a name, banner and founding terms.',null,{action:'foundOrder'}));
    if(flag(p,'founded')){
      opts.push(option('ledger','Open the Order Ledger.','Review your members, policies and supplies.',null,{action:'orderLedger'}));
      if(flag(p,'staffed')&&!flag(p,'operation'))for(const[key,label]of [['relief','Relief: deliver six rations to the family on the refuge track.'],['security','Security: clear the road-station beasts east of the refuge.'],['recovery','Recovery: retrieve the old records beside the road station.'],['trade','Trade: exchange four Emberleaf with the travelling merchant.']])opts.push(option(key,label,'The undertaking is recorded. Return here when the work is done.',{type:'operationSelect',operation:key}));
      if(o.operationReady&&!flag(p,'operation'))opts.push(option('report','Report the completed undertaking.','People outside Greyhaven have begun to know your name. Corven is waiting in the hall.',{type:'operationFinish'}));
      if(flag(p,'assessment')&&!flag(p,'recognized'))for(const[key,label]of [['service','To everyone who built this place.'],['ambition','To what we will accomplish.'],['power','To power, and those willing to seize it.'],['knowledge','To knowledge, whatever the cost.'],['freedom','To a future of our own choosing.']])opts.push(option(key,label,'The gathered members raise their cups. No revelation follows: only warmth, conversation, and work still to do.',{type:'gathering',toast:key}));
    }
    opts.push(option('donate','Donate four rations to rebuild trust.','The food goes into the common stores. Promises matter less than this.',{type:'donate',cost:[['fieldRations',4]]},{requiresItems:[['fieldRations',4]]}));
  } else if(id==='greyhavenFamily'){
    text='The Covenant brought enough for a few days. Nobody sent you? You are giving us those supplies?';
    if(o.operation==='relief'&&!o.operations.relief)opts.push(option('deliver','Deliver six rations with your assigned scout.','Thank you. I cannot leave my family to join you, but I will remember this.',{type:'operationDeliver',operation:'relief',cost:[['fieldRations',6]]},{requiresItems:[['fieldRations',6]],requiresFlags:['order.escortReady']}));
  } else if(id==='greyhavenMerchant'){
    text='Greyhaven used to be a good stop. Regular supplies is a strong promise from a business this young. Start with four Emberleaf and we can trade for building materials.';
    if(o.operation==='trade'&&!o.operations.trade)opts.push(option('trade','Trade four Emberleaf.','A fair exchange. I will bring a wagon to Greyhaven.',{type:'operationDeliver',operation:'trade',cost:[['emberleaf',4]]},{requiresItems:[['emberleaf',4]]}));
  }
  if(!text)return null;
  opts.push(...orderRecruitmentOptions(npc,p));
  return {id:`orderDialogue:${id}`,speaker:npc.name,speakerId:id,text,options:opts,appendNpcQuestOptions:false};
}
export function applyOrderChoice(p,a){
  if(!a)return;const o=ensureOrder(p),set=id=>setStoryFlag(p,`order.${id}`);
  if(a.type==='materials'&&flag(p,'materials')||a.type==='food'&&flag(p,'food')||a.type==='operationDeliver'&&o.operations[a.operation]||a.type==='facility'&&o.facilities[a.facility])return;
  if(a.cost&&!pay(p,a.cost))return;
  switch(a.type){
    case 'meet':set('met');break;
    case 'introduction':set('met'+a.person);break;
    case 'threat':o.relationships.tavinHolt=-20;o.relationships.ionaVey=-10;break;
    case 'charter':o.purpose=a.purpose;set('charter');break;
    case 'materials':if(flag(p,'materials'))break;o.quality=a.quality;o.relationships.tavinHolt=(o.relationships.tavinHolt||0)+a.trust;set('materials');break;
    case 'residents':o.residents=a.policy;o.relationships.ionaVey=(o.relationships.ionaVey||0)+a.trust;set('residents');break;
    case 'food':o.food=(o.food||0)+6;set('food');break;
    case 'facility':o.facilities[a.facility]=true;break;
    case 'recruit':o.members[a.id] ||= {id:a.id,name:a.name,role:a.role,affiliate:a.affiliate,consented:true,assigned:false};break;
    case 'donate':o.food=(o.food||0)+4;for(const id of ['tavinHolt','ionaVey','pellRusk'])o.relationships[id]=(o.relationships[id]||0)+10;break;
    case 'operationSelect':o.operation=a.operation;break;
    case 'operationDeliver':o.operations[a.operation]=true;o.operationReady=true;break;
    case 'operationFinish':if(o.operationReady){set('operation');o.rep+=10;addItem(p,'ashCoin',30);}break;
    case 'research':o.knowledge=a.policy==='confiscate'?'restricted':a.policy;o.corvenLeft=['restricted','confiscate'].includes(a.policy);o.relationships.corvenDask=a.policy==='confiscate'?-25:a.policy==='restricted'?-15:20;o.relationships.ionaVey=(o.relationships.ionaVey||0)+(a.policy==='unrestricted'?-10:5);set('researchDecision');break;
    case 'consult':if(!o.consulted){o.consulted=true;o.rep+=10;}break;
    case 'intake':o.intake=a.decision;set('intake');if(['reject','limited'].includes(a.decision)){o.shelterOutcome=a.decision==='reject'?'rejected':'limited';o.rep-=a.decision==='reject'?20:10;set('shelter');}break;
    case 'shelter':o.treatment=a.decision;o.shelterOutcome=a.decision==='transfer'||a.decision==='choice'&&!o.facilities.medicine?'covenant':o.facilities.medicine&&(o.food||0)>=2?'sheltered':a.decision==='refuse'?'negligence':'covenant';if(o.shelterOutcome==='sheltered')o.food-=2;o.rep+=o.shelterOutcome==='negligence'?-10:10;set('shelter');break;
    case 'assessment':p.factionReputation ||= {};p.factionReputation.wardens=(p.factionReputation.wardens||0)+a.delta;set('assessment');break;
    case 'gathering':o.toast=a.toast;set('recognized');break;
  }
}
export function openOrderLedger(game,founding=false){
  const p=game.player,o=ensureOrder(p);if(founding&&!flag(p,'restored'))return;
  const old=document.getElementById('yourOrderLedger');old?.remove();
  const overlay=document.createElement('div');overlay.id='yourOrderLedger';
  overlay.style.cssText='position:fixed;inset:6%;z-index:2000;background:#201d18;color:#eee2c6;padding:28px;border:2px solid #ad8b50;overflow:auto;font:17px Georgia';
  const title=document.createElement('h2');title.textContent=founding?'Name Your Order':o.name||'Your Order';overlay.append(title);
  const form=document.createElement('form');overlay.append(form);
  function field(label,value,choices){const row=document.createElement('label');row.style.cssText='display:block;margin:12px 0';row.append(document.createTextNode(label+' '));const el=document.createElement(choices?'select':'input');if(choices)for(const v of choices){const op=document.createElement('option');op.value=v;op.textContent=v;el.append(op);}else{el.maxLength=40;el.required=true;}el.value=value;row.append(el);form.append(row);return el;}
  const name=field('Organization name',o.name||'Greyhaven Fellowship'),leader=field('Leadership title',o.title||'Founder');
  const banner=field('Banner',o.banner||'lantern',['lantern','tree','shield','open hand']),color=field('Banner colour',o.color||'gold',['gold','green','blue','crimson']);
  const purpose=field('Purpose',o.purpose||'protection',['protection','power','knowledge','wealth','independence','undetermined']);
  const policy=field('Membership',o.policy,['voluntary','hierarchical','strict']);
  const knowledge=field('Knowledge policy',o.knowledge,['open','controlled','restricted','unrestricted']);
  const leadership=field('Leadership',o.leadership,['founder','advisors','council','autonomy']);
  const assignments=[];
  for(const m of Object.values(o.members)){const select=field(`${m.name}${m.affiliate?' (affiliate)':''}`,m.role,['workshop','garden','research','guard','scouting','trade','medicine']);assignments.push([m,select]);}
  const info=document.createElement('p');info.textContent=`Stores: ${o.food||0} rations. Reputation: ${o.rep}. Medical room: ${o.facilities.medicine?'stocked':'not stocked'}. ${o.shelterOutcome==='negligence'?'Patients need medicine: stock the treatment room with Iona and donate food.':''}`;form.append(info);
  const save=document.createElement('button');save.textContent=founding?'Found the Order':'Record decisions';save.type='submit';form.append(save);
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>overlay.remove();form.append(close);
  form.onsubmit=e=>{e.preventDefault();const clean=name.value.trim();if(!clean)return;Object.assign(o,{name:clean.slice(0,40),title:leader.value.trim().slice(0,24)||'Founder',banner:banner.value,color:color.value,purpose:purpose.value,policy:policy.value,knowledge:knowledge.value,leadership:leadership.value});for(const[m,s]of assignments){m.role=s.value;m.assigned=true;}if(founding)setStoryFlag(p,'order.founded');if(flag(p,'researchDecision'))setStoryFlag(p,'order.doctrine');overlay.remove();game.log?.(`Your Order: ${o.name}. Decisions recorded.`);};
  // Stop gameplay shortcuts while entering names; ordinary Tab/Enter work here.
  overlay.addEventListener('keydown',e=>e.stopPropagation());document.body.append(overlay);name.focus();
}
