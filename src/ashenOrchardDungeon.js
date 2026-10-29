import {makeEnemy} from './overworldUtils.js';
import {configureEncounterEnemy,dungeonEncounterProfile} from './encounterData.js';
import {startQuest,openDialogue,updateQuestStageCompletion} from './dialogueSystem.js';
import {getStoryFlag} from './storyProgress.js';
import {ORCHARD_QUEST} from './ashenOrchardData.js';
import {tuneDungeonBoss} from './dungeonBossDifficulty.js';
export const isOrchardDungeon=w=>w?.dungeonId==='ashenOrchard';
const pt=(x,y)=>({x:(x+.5)*32,y:(y+.5)*32});
export function installOrchardDungeon(w){
 if(!isOrchardDungeon(w))return;
 const saved=w.objects?.some(o=>o.orchardAuthored)?{objects:w.objects,enemies:w.enemies,drops:w.drops}:w.dungeonState.floorStates?.[w.floor],current=saved?.objects?.some(o=>o.orchardAuthored);
 w.dungeonState.orchard ||= {version:1};w.dungeonState.totalFloors=w.totalFloors=2;w.width=64;w.height=58;
 w.tiles=Array.from({length:58},()=>Array.from({length:64},()=>({biome:'wall',passable:false})));
 const carve=(x,y)=>{if(w.tiles[y]?.[x])w.tiles[y][x]={biome:'ruin',passable:true,variant:(x*5+y*3)%3};};
 w.rooms=[];w.halls=[];
 const rooms=w.floor===1?[['triage',25,45,14,10],['settling',5,28,17,12],['pumps',41,28,17,12],['gallery',25,10,14,12]]:[['approach',25,42,14,10],['boss',16,7,32,26]];
 for(const[id,x,y,rw,rh]of rooms){w.rooms.push({id,role:id==='boss'?'boss':'combat',x,y,w:rw,h:rh,cx:x+Math.floor(rw/2),cy:y+Math.floor(rh/2)});for(let j=y;j<y+rh;j++)for(let i=x;i<x+rw;i++)carve(i,j);}
 const path=points=>{for(let n=1;n<points.length;n++){const[a,b]=points[n-1],[c,d]=points[n],steps=Math.max(Math.abs(c-a),Math.abs(d-b));for(let t=0;t<=steps;t++){const x=Math.round(a+(c-a)*t/steps),y=Math.round(b+(d-b)*t/steps);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)carve(x+dx,y+dy);}}};
 if(w.floor===1){path([[32,48],[32,42],[13,42],[13,34]]);path([[13,30],[13,23],[49,23],[49,34]]);path([[49,29],[49,7],[32,7],[32,16]]);}else path([[32,46],[32,36],[32,30]]);
 w.spawn=pt(32,w.floor===1?51:47);w.bossRoomCenter=w.floor===2?pt(32,19):null;
 if(current){w.objects=saved.objects;w.enemies=saved.enemies;w.drops=saved.drops||[];return;}
 w.objects=[];w.enemies=[];w.drops=[];
 const object=(kind,id,name,x,y,extra={})=>w.objects.push({kind,id,name,...pt(x,y),r:20,orchardAuthored:true,...extra});
 if(w.floor===1){
  object('dungeonExit','orchardSurface','Return to the Relief Camp',32,53);
  object('npc','orchardTamsin','Sister Tamsin',29,49,{npcId:'orchardTamsin',dialogueId:'orchardTamsin',deferTalkObjective:true,disposition:'friendly',factionId:'covenantOfLight',stationary:true,bodyType:'female',hair:'#977f59',shirt:'#e7dcc1',pants:'#887849',forceLabel:true});
  object('dungeonStairs','orchardDown','Descend to the Founders’ Cistern',32,14,{direction:'down',targetFloor:2,arrivalRole:'fromDownstairs',locked:true});
  for(const[i,[x,y]]of [[13,33],[49,33]].entries()){
   object('poiInvestigation',`orchardReturn${i}`,i?'East Return Wheel':'West Return Wheel',x,y,{orchardValve:i,questArt:'mechanism',questVisibility:[[ORCHARD_QUEST,'returns']],poiId:'orchardCistern',clueId:`return${i}`,storyFlags:[`orchard.return${i}`],message:i?'The east return closes. Beneath the dead roots, a clean bypass still leads to the relief camp.':'The west return closes. White-and-gold residue stops flowing toward the ancient cistern. Red-sealed cutting tools remain beside the severed spindle.'});
   for(let j=0;j<3;j++)w.enemies.push(makeEnemy(j===2?'gravebound':'hollowling',`orchard-cellar-${i}-${j}`,i?'Rootbound Pump Tender':'Silt-Soaked Dead',x+(j-1)*4,y-3,{tier:1,hp:110,maxHp:110,damage:12,speed:43,orchardValveGuard:i,noRespawn:true,homeGuard:true,homeX:(x+(j-1)*4+.5)*32,homeY:(y-2.5)*32,homeRadius:130,leashRange:200}));
  }
 }else{
  object('dungeonStairs','orchardUp','Return to the Triage Cellar',32,49,{direction:'up',targetFloor:1,arrivalRole:'fromUpstairs'});
  object('signpost','orchardCharter','The First Water Charter',29,37,{talk:'“No hearth shall thirst while the cistern holds.” Beyond this charter the pressure doors seal until the Custodian falls. Prepare before entering.'});
  w.enemies.push(makeEnemy('gravebound','orchardCustodian','Alder Verran, the Grafted Custodian',32,19,{hp:2800,maxHp:2800,damage:29,speed:0,r:34,radius:34,isBoss:true,isDungeonMainBoss:true,bossId:'alderVerranCustodian',orchardCustodian:true,arenaDormant:true,noRespawn:true,xp:220}));
 }
 for(const r of w.rooms){for(const[i,type]of (r.id==='triage'?['infirmaryCot','medicineCrates']:r.id==='settling'?['rotIrrigation','deadRoot']:r.id==='pumps'?['ancientSluice','cable']:r.id==='gallery'?['mapTable','prayerRibbons']:['column','sealEngine']).entries())object('townProp',`orchard-decor-${r.id}-${i}`,type,r.x+3+i*(r.w-6),r.y+3,{propType:type,decorative:true,interactable:false,hideLabel:true,scale:1});}
 for(const e of w.enemies)configureEncounterEnemy(e,dungeonEncounterProfile(w),`${w.seed}:${e.id}`,{dungeon:true,rank:e.orchardCustodian?'boss':'ordinary'});
 for(const e of w.enemies)if(e.orchardCustodian)tuneDungeonBoss(e,w.dungeonState.coopPlayerCount||1);
 // Replace generic final-boss identities retained by older floor records.
 w.dungeonState.mainBossEnemyId='orchardCustodian';w.dungeonState.requiredBossIds=['orchardCustodian'];delete w.dungeonState.arenas?.[w.floor];
}
export function updateOrchardDungeon(game){
 const w=game.world,p=game.player;if(!isOrchardDungeon(w))return;
 if(!p.quests?.active?.[ORCHARD_QUEST]&&!p.quests?.completed?.[ORCHARD_QUEST])startQuest(p,ORCHARD_QUEST);
 const ready=[0,1].every(i=>getStoryFlag(p,`orchard.return${i}`));
 for(const o of w.objects){if(o.id==='orchardDown')o.locked=!ready;if(o.orchardValve!=null)o.interactable=!getStoryFlag(p,`orchard.return${o.orchardValve}`);}
 const q=p.quests?.active?.[ORCHARD_QUEST];for(const o of q?.objectives||[])if(o.type==='storyFlag'&&getStoryFlag(p,o.flag)||o.type==='clearDungeon'&&p.completedDungeons?.ashenOrchard)o.current=o.required;
 updateQuestStageCompletion(p,ORCHARD_QUEST);
}
export function beginOrchardDungeon(game){if(!isOrchardDungeon(game.world))return;updateOrchardDungeon(game);const npc=game.world.objects.find(o=>o.npcId==='orchardTamsin');if(npc&&game.player.quests?.active?.[ORCHARD_QUEST]?.currentStageId==='attendant')openDialogue(game.dialogue,npc,game.player,game.world);}
export function handleOrchardInteraction(game,o){
 if(o.orchardValve==null)return false;
 if(game.world.enemies.some(e=>e.orchardValveGuard===o.orchardValve&&!e.dead&&e.hp>0)){game.log?.('The return wheel is tangled in living roots. Clear its pump tenders first.');return true;}return false;
}
