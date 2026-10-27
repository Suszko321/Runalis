import {TILE} from './data.js';
import {makeEnemy,makeObject} from './overworldUtils.js';
import {getStoryFlag,setStoryFlag} from './storyProgress.js';
import {getQuest} from './worldContent.js';
import {startQuest,updateQuestStageCompletion,openDialogue} from './dialogueSystem.js';
import {getPoiClueCount} from './poiStateSystem.js';
import {enterMaraHouse} from './act1OpeningSystem.js';
import {CAMPAIGN_ID,MERCY_ID} from './act1CampaignData.js';
import {ensureOrder} from './yourOrder.js';
import {addItem} from './player.js';

const pxy=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
const prop=(id,type,x,y,extra={})=>makeObject(type==='campfire'?'campfire':type.startsWith('continent')?'worldDressing':'townProp',id,id,x,y,{propType:type,decorative:true,interactable:false,hideLabel:true,drawRadius:300,...extra});
const npc=(id,name,x,y,extra={})=>makeObject('npc',id,name,x,y,{npcId:id,disposition:'friendly',stationary:true,shirt:'#787151',pants:'#4d433b',boots:'#29231e',r:14,deferTalkObjective:true,...extra});
const clue=(id,name,x,y,poiId,message)=>makeObject('poiInvestigation',id,name,x,y,{poiId,clueId:id,message,reviewMessage:message,r:17});
export const CAMPAIGN_PATHS=[
  [[17,35],[37,52],[44,57],[53,67]],
  [[37,52],[61,51],[71,54]],
  [[53,67],[62,78],[92,87],[110,90]],
  [[53,67],[35,75],[35,88]],
  [[35,75],[45,76]],
  [[35,88],[55,94],[65,94]],
];
function writeTile(w,x,y,patch){const old=w.tiles[y]?.[x];if(!old)return;if(w.continentRuntime)w.continentRuntime.terrain.set(x,y,{...old,...patch});else Object.assign(old,patch);}
function carve(w,points,width=2){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let j=0;j<=steps;j++){const x=Math.round(a[0]+(b[0]-a[0])*j/steps),y=Math.round(a[1]+(b[1]-a[1])*j/steps);for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++)writeTile(w,x+dx,y+dy,{passable:true,biome:'path',campaignPath:true});}}}
function register(w,o,enemy=false){
  const runtime=w.continentRuntime,all=runtime?(enemy?runtime.allEnemies:runtime.allObjects):(enemy?w.enemies:w.objects);
  if(all.some(v=>v.id===o.id))return all.find(v=>v.id===o.id);
  all.push(o);runtime?.register(o,enemy?'enemies':'objects');
  if(runtime)(enemy?w.enemies:w.objects).push(o);
  return o;
}
export function installCampaignWorld(w){
  if(w.act1CampaignLayer||w.mode!=='overworld')return;
  w.act1CampaignLayer=true;
  for(const path of CAMPAIGN_PATHS)carve(w,path);
  for(let y=78;y<=103;y++)for(let x=24;x<=47;x++)writeTile(w,x,y,{passable:true,biome:'grass',campaignPath:true});
  for(let y=48;y<=58;y++)for(let x=64;x<=76;x++)writeTile(w,x,y,{passable:true,biome:'dead',campaignPath:true});
  // Remove only tree colliders crossing newly authored roads/rooms.
  if(w.echorynTreeBuckets)for(const[key,trees]of w.echorynTreeBuckets)w.echorynTreeBuckets.set(key,trees.filter(t=>!w.tiles[Math.floor(t.y/TILE)]?.[Math.floor(t.x/TILE)]?.campaignPath));
  const objects=[
    prop('act1WagonA','supplyWagon',68,52,{accent:'#513025'}),prop('act1WagonB','woodPile',72,55),
    clue('act1CargoManifest','Scorched Cargo Manifest',70,53,'caravanWreck','Food, tools and medicine remain listed against Ashen Orchard. A separate sealed relic consignment was bound for Zarynth. The receiver’s name has burned away; the road-station stamp survives.'),
    clue('act1RelicCradle','Empty Reliquary Cradle',72,53,'caravanWreck','Reinforced bands were cut deliberately. Coin lies untouched beneath the wagon. A rubbing of the cradle’s three-channel fitting could identify the stolen cargo later.'),
    makeObject('signpost','act1WreckFork','Caravan Road',38,51,{talk:'East fork: caravan wreck. South: Old Well and southern farms.'}),
    makeObject('signpost','act1FarmFork','Farm and Refuge Tracks',52,71,{talk:'East: Ashen Orchard. West: Greyhaven refuge. North: Orrakai.'}),
    prop('oldWellPumpingHouse','continentRuin',51,64,{artWidth:160,artHeight:130}),prop('oldWellPump','anvil',50,65),
    prop('oldWellBoundaryMarker','stoneMarker',38,53),prop('oldWellDamagedCart','supplyWagon',36,52),
    npc('act1ReliefScout','Scout Hessa',98,87,{poiId:'ashenOrchard'}),prop('act1ScoutShelter','tent',97,85),
    makeObject('signpost','act1OrchardSign','Forest Road',123,89,{talk:'Pilgrim Bridge east. Across the bridge, north-east for the Broken Chapel.'}),
    makeObject('signpost','act1BridgeSign','Chapel Road',254,98,{talk:'Broken Chapel: north-east. Hunter Camp: south-east.'}),
    makeObject('signpost','act1ChapelSign','Southern Forest Road',444,85,{talk:'Retrace the chapel road west to the fork east of Pilgrim Bridge. Take the south-east road to Hunter Camp and Watcher Ridge; follow the ridge road south for Last Dawn Keep.'}),
    makeObject('signpost','act1RidgeSign','Fortress Road',511,194,{talk:'Last Dawn Keep: follow the road south. Beware armed patrols.'}),
    clue('act1RitualOrders','Last Dawn Ritual Orders',552,386,'lastDawnOrders','The sealed cargo is to be carried through the fortress barracks into the prisonworks. Three channels must be aligned before the binding breaks. “The witness must wake before the next relief convoy reaches Orrakai.”'),
    npc('act1Regulator','Dawnspire Regulator',444,69,{kind:'townProp',propType:'stoneMarker',campaignFixture:true,talk:'Maintenance plate: DRAIN the pressure, ALIGN the channels, then admit LIGHT. The wheels bear those words.',poiId:'brokenChapel'}),
    prop('greyhavenHall','continentHouse',34,89,{artWidth:360,artHeight:340,openFront:true,ruined:true,fadeBehind:true,poiId:'greyhaven',name:'Greyhaven'}),
    prop('greyhavenHomeA','continentRuin',27,91,{artWidth:140,artHeight:130}),prop('greyhavenHomeB','continentRuin',43,91,{artWidth:140,artHeight:130}),
    prop('greyhavenWorkshop','continentRuin',27,81,{artWidth:130,artHeight:135}),prop('greyhavenStorehouse','continentRuin',43,100,{artWidth:140,artHeight:130}),
    prop('greyhavenGarden','continentFarm',27,99,{artWidth:140,artHeight:90}),prop('greyhavenBanner','banner',30,89,{color:'#666053',orderBanner:true,scale:1.6}),
    prop('greyhavenMedicine','medicineCrates',42,91),prop('greyhavenPatientCot','infirmaryCot',44,92),prop('greyhavenWash','washBasin',42,93),prop('greyhavenFood','sacks',34,84),prop('greyhavenTools','anvil',28,82),
    prop('greyhavenBench','bench',32,87),prop('greyhavenHearth','campfire',32,83),
    npc('tavinHolt','Tavin Holt',32,85,{poiId:'greyhaven',hair:'#b9b2a4',shirt:'#79634b'}),npc('ionaVey','Iona Vey',36,85,{bodyType:'female',hair:'#674332',shirt:'#526a47'}),npc('pellRusk','Pell Rusk',36,88,{hair:'#9c6c3f',shirt:'#68808b'}),
    npc('greyhavenLedger','Order Ledger',34,87,{kind:'townProp',propType:'contractTable',campaignFixture:true}),
    makeObject('townProp','greyhavenCistern','Overgrown Cistern',29,93,{propType:'well',interactable:true,campaignAction:'cistern',talk:'Clear the moss, replace the cover and flush the old water. Tavin has left the tools here.'}),
    npc('greyhavenFamily','Renn, Displaced Farmer',45,76),npc('greyhavenMerchant','Merchant Sella',58,94),
    prop('greyhavenRoadStation','continentRuin',64,93,{artWidth:140,artHeight:130}),
    makeObject('townProp','greyhavenRecords','Fellowship Archive Chest',65,95,{propType:'bankChest',interactable:true,campaignAction:'archive',talk:'Repair accounts and road charters. These are civic records, not forbidden revelations.'}),
    npc('corvenDask','Corven Dask',38,84),npc('derrenHale','Derren Hale',36,93),npc('lysaHale','Lysa Hale',37,94,{bodyType:'female',hair:'#77513f'}),
    npc('greyhavenAttendant','Covenant Attendant',38,95,{shirt:'#eee2c6'}),npc('greyhavenMael','Warden Mael',33,91),
  ];
  for(let i=0;i<8;i++)objects.push(prop(`oldWellDitch${i}`,'roadRuts',41+i,55+i,{length:2}));
  for(const o of objects)register(w,o);
  for(const [id,x,y]of [['greyhavenBeastA',42,98],['greyhavenBeastB',45,100],['greyhavenRoadBeastA',62,93],['greyhavenRoadBeastB',66,94]])register(w,makeEnemy('ashWolf',id,'Blight-Touched Wolf',x,y,{tier:1,hp:65,maxHp:65,damage:7,speed:48,noRespawn:true,questEncounter:'greyhaven',homeGuard:true,homeX:(x+.5)*TILE,homeY:(y+.5)*TILE,homeRadius:80,leashRange:130,aggroRange:120}),true);
}
export function recordCampaignKill(p,enemy){if(!enemy?.id)return;p.campaignKills ||= {};if(enemy.questEncounter||enemy.id.startsWith('greyhaven'))p.campaignKills[enemy.id]=true;}
function allObjects(w){return w.continentRuntime?.allObjects||w.objects||[];}
function move(o,x,y){if(o)Object.assign(o,pxy(x,y),{homeX:(x+.5)*TILE,homeY:(y+.5)*TILE});}
export function updateAct1Campaign(game,dt=0){
  const p=game.player,w=game.world;if(!p||!w)return;
  game.act1CampaignClock=(game.act1CampaignClock||0)-dt;
  if(game.act1CampaignWorld===w&&game.act1CampaignClock>0)return;
  game.act1CampaignWorld=w;game.act1CampaignClock=.25;
  migrateCampaign(p);
  if(w.mode==='overworld')installCampaignWorld(w);
  if(w.mode==='capital'){
    const mael=w.objects.find(o=>o.npcId==='wardenMael'),callworth=w.objects.find(o=>o.npcId==='lightwardenCaelen');
    const atRite=getStoryFlag(p,'mercy.riteStarted')&&!getStoryFlag(p,'mercy.riteWitnessed');
    move(mael,atRite?22:30,atRite?17:39);move(callworth,atRite?17:29,atRite?15:38);if(callworth)callworth.name='Cardinal Callworth';
    if(!w.objects.some(o=>o.id==='act1RiteChild'))w.objects.push(npc('act1RiteChild','Sick Child',18,15,{scale:.65}),npc('act1RiteElder','Elderly Patient',20,15),npc('act1MarkedVillager','Marked Villager',21,16));
    if(!w.objects.some(o=>o.id==='act1RiteMother'))w.objects.push(npc('act1RiteMother','Child’s Mother',18,16),npc('act1RiteWife','Patient’s Wife',20,16));
    const neria=w.objects.find(o=>o.npcId==='covenantHealingRite');if(atRite)move(neria,19,15);
    if(getStoryFlag(p,'mercy.riteFinished'))for(const [id,name]of [['act1RiteChild','Recovering Child'],['act1RiteElder','Relieved Elder']]){const patient=w.objects.find(o=>o.id===id);if(patient)patient.name=name;}
    if(p.yourOrder?.shelterOutcome==='covenant'&&!w.objects.some(o=>o.id==='lysaHale'))w.objects.push(npc('lysaHale','Lysa Hale',28,40,{bodyType:'female',hair:'#77513f'}),npc('derrenHale','Derren Hale',29,40));
    updateRite(game,.25);
    const returnStage=p.quests?.active?.[MERCY_ID]?.currentStageId==='returnToMara';
    const mara=w.objects.find(o=>o.npcId==='maraVell');if(mara&&returnStage){mara.talk='Come upstairs above the Root & Retort. You need rest.';}
  }
  if(w.mode==='maraHouse'&&p.quests?.active?.[MERCY_ID]?.currentStageId==='returnToMara'){
    const mara=w.objects.find(o=>o.npcId==='maraVell');if(mara)mara.dialogueId='act1MaraEvening';
    if(!w.objects.some(o=>o.id==='maelEveningVisitor'))w.objects.push(npc('maelEveningVisitor','Warden Mael',9,6));
  }
  if(p.quests?.completed?.[MERCY_ID]&&!p.quests?.completed?.[CAMPAIGN_ID]&&!p.quests?.active?.[CAMPAIGN_ID])startQuest(p,CAMPAIGN_ID);
  if(p.quests?.completed?.[MERCY_ID]&&getStoryFlag(p,'order.met')&&!p.quests?.active?.yourOrder1&&!p.quests?.completed?.yourOrder1)startQuest(p,'yourOrder1');
  for(let i=1;i<9;i++)if(p.quests?.completed?.[`yourOrder${i}`]&&!p.quests?.active?.[`yourOrder${i+1}`]&&!p.quests?.completed?.[`yourOrder${i+1}`])startQuest(p,`yourOrder${i+1}`);
  if(p.quests?.completed?.[MERCY_ID]&&getStoryFlag(p,'mercy.paymentRequested')&&!getStoryFlag(p,'mercy.paymentPaid')){addItem(p,'ashCoin',20);setStoryFlag(p,'mercy.paymentPaid');}
  updateOrderWorld(game);
  // Reconcile only persistent facts. Talking and fighting never complete by proximity.
  for(const q of Object.values(p.quests?.active||{})){
    for(const objective of q.objectives||[]){
      if(objective.type==='storyFlag'&&getStoryFlag(p,objective.flag))objective.current=objective.required;
      if(objective.type==='investigatePoi')objective.current=Math.max(objective.current||0,Math.min(objective.required,getPoiClueCount(p,objective.poiId)));
      if(objective.type==='clearDungeon'&&p.completedDungeons?.[objective.dungeonId])objective.current=objective.required;
    }
    updateQuestStageCompletion(p,q.id);
  }
  const known=p.locationKnowledge||{};
  for(const[id,r]of Object.entries(known))if(p.discoveredPois?.[id])r.state='discovered';
  if(getStoryFlag(p,'story.malakarDefeated')&&!getStoryFlag(p,'story.malakarTruthHeard')&&!game.dialogue?.active){
    const witness=npc('malakarWitness','Malakar',0,0);Object.assign(witness,{x:p.x,y:p.y,dialogueId:'act1Malakar'});openDialogue(game.dialogue,witness,p,w);
  }
  if(p.quests?.completed?.[CAMPAIGN_ID]){setStoryFlag(p,'story.act1Complete');setStoryFlag(p,'travel.pilgrimRoad.unlocked');}
}
function migrateCampaign(p){
  if(p.act1CampaignVersion===2)return;
  for(const q of Object.values(p.quests?.active||{})){
    if(![CAMPAIGN_ID,MERCY_ID].includes(q.id))continue;
    const definition=getQuest(q.id),index=definition.stages.findIndex(s=>s.id===q.currentStageId);
    if(index<0)continue;const s=definition.stages[index],old=q.objectives||[];
    Object.assign(q,{stageIndex:index,currentStageTitle:s.title,currentStageText:s.text,objectives:s.objectives.map(o=>({...o,current:old.find(a=>a.type===o.type&&a.npcId===o.npcId&&a.poiId===o.poiId&&a.enemyId===o.enemyId&&a.flag===o.flag)?.current||0}))});
  }
  p.act1CampaignVersion=2;
}
function updateRite(game,dt){
  const p=game.player,w=game.world;if(!getStoryFlag(p,'mercy.riteStarted')||getStoryFlag(p,'mercy.riteWitnessed'))return;
  if(game.dialogue?.active)return;
  const center=pxy(18,15);if(Math.hypot(p.x-center.x,p.y-center.y)>TILE*8)return;
  p.healingRite ||= {elapsed:0,beat:0};const s=p.healingRite;s.elapsed+=dt;
  const beats=[[0,'Callworth: “There is food for those who have not eaten. We will stay until everyone has been seen.”'],[5,'Neria places her hand on the child’s forehead. The coughing gradually subsides.'],[10,'The elderly man draws an easier breath. “I can speak again.” His wife begins to cry.'],[15,'The marked villager whispers: “The gate opens where the light falls.” Mael opens his notebook.']];
  if(s.beat<beats.length&&s.elapsed>=beats[s.beat][0]){game.log?.(beats[s.beat][1]);s.beat++;w.effects ||= [];w.effects.push({kind:'enemyPulse',layer:'front',...center,color:'#f5d78a',radius:110,ttl:2,age:0});}
  for(const id of ['act1RiteChild','act1RiteElder']){const actor=w.objects.find(o=>o.id===id);if(actor&&s.elapsed>10){actor.shirt='#d8be78';actor.name=id==='act1RiteChild'?'Recovering Child':'Relieved Elder';}}
  if(s.elapsed>=17){setStoryFlag(p,'mercy.riteFinished');if(!getStoryFlag(p,'mercy.markedHeard')){const actor=w.objects.find(o=>o.id==='act1MarkedVillager');openDialogue(game.dialogue,actor,p,w);}else setStoryFlag(p,'mercy.riteWitnessed');}
}
function updateOrderWorld(game){
  const p=game.player,w=game.world,o=ensureOrder(p),has=id=>getStoryFlag(p,`order.${id}`),kills=p.campaignKills||{};
  if(has('met')&&has('metIona')&&has('metPell'))setStoryFlag(p,'order.surveyed');
  if(has('materials')&&has('food')&&has('cistern')&&has('residents')&&kills.greyhavenBeastA&&kills.greyhavenBeastB)setStoryFlag(p,'order.restored');
  if(Object.values(o.members).filter(m=>m.consented&&m.assigned).length>=3)setStoryFlag(p,'order.staffed');
  const scout=Object.values(o.members).find(m=>m.assigned&&['scouting','guard'].includes(m.role));
  if(scout)setStoryFlag(p,'order.escortReady');
  if(has('staffed')&&o.operation==='security'&&kills.greyhavenRoadBeastA&&kills.greyhavenRoadBeastB){o.operations.security=true;o.operationReady=true;}
  if(o.shelterOutcome==='negligence'&&o.facilities.medicine&&o.food>=2){o.food-=2;o.shelterOutcome='sheltered';game.log?.('The stocked treatment room contains the fever. Lysa is recovering.');}
  if(w.mode!=='overworld')return;
  const objects=allObjects(w);
  for(const e of w.continentRuntime?.allEnemies||w.enemies)if(kills[e.id]){e.dead=true;e.remove=true;e.hp=0;e.deathHandled=true;}
  const visibility={corvenDask:has('operation')&&!o.corvenLeft,derrenHale:has('doctrine')&&!['rejected','limited','covenant'].includes(o.shelterOutcome),lysaHale:has('doctrine')&&!['rejected','limited','covenant'].includes(o.shelterOutcome),greyhavenAttendant:has('intake')&&!has('shelter'),greyhavenMael:has('shelter')&&!has('recognized')};
  for(const [id,visible]of Object.entries(visibility)){const actor=objects.find(a=>a.id===id);if(actor){actor.depleted=!visible;actor.interactable=visible;actor.hideLabel=!visible;}}
  for(const id of ['greyhavenHall','greyhavenHomeA','greyhavenHomeB','greyhavenWorkshop','greyhavenStorehouse']){const b=objects.find(a=>a.id===id);if(b&&has('restored')){b.propType='continentHouse';b.ruined=false;}}
  for(const id of ['greyhavenMedicine','greyhavenPatientCot','greyhavenWash']){const fixture=objects.find(a=>a.id===id);if(fixture)fixture.depleted=!o.facilities.medicine;}
  const food=objects.find(a=>a.id==='greyhavenFood');if(food)food.depleted=!(o.food>0);
  const tools=objects.find(a=>a.id==='greyhavenTools');if(tools)tools.depleted=!has('materials');
  const garden=objects.find(a=>a.id==='greyhavenGarden');if(garden)garden.depleted=!has('restored');
  const cistern=objects.find(a=>a.id==='greyhavenCistern');if(cistern&&has('cistern'))cistern.name='Clean Covered Cistern';
  const banner=objects.find(a=>a.id==='greyhavenBanner');if(banner&&has('founded')){banner.color={gold:'#d9ad4f',green:'#78a65c',blue:'#629bd1',crimson:'#b84e46'}[o.color]||'#d9ad4f';banner.symbol=o.banner;banner.name=o.name;banner.hideLabel=false;}
  const member=objects.find(a=>a.npcId===scout?.id);
  if(member&&o.operation==='relief'&&!o.operations.relief&&Math.hypot(p.x-35*TILE,p.y-85*TILE)<24*TILE){member.x=p.x-36;member.y=p.y+24;}
  if(o.operations.trade){const merchant=objects.find(a=>a.id==='greyhavenMerchant');if(merchant)move(merchant,38,88);}
}
export function handleCampaignInteraction(game,object){
  if(object.campaignFixture){openDialogue(game.dialogue,object,game.player,game.world);return true;}
  if(!object.campaignAction)return false;
  const p=game.player,o=ensureOrder(p);
  if(object.campaignAction==='maraHome'){
    return enterMaraHouse(game);
  }
  if(object.campaignAction==='cistern'){setStoryFlag(p,'order.cistern');game.log?.('You clear the cistern, flush the foul water and secure its cover.');return true;}
  if(object.campaignAction==='archive'){
    if(o.operation==='recovery'&&getStoryFlag(p,'order.staffed')){o.operations.recovery=true;o.operationReady=true;game.log?.('You recover the fellowship’s repair accounts and civic charters. Return to the hall ledger.');}else game.log?.(object.talk);return true;
  }
  return false;
}
