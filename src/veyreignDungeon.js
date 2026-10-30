import {prepareVeyreignTransformation} from './veyreignTransformation.js';
import {ENCOUNTER_VERSION} from './encounterData.js';
import {makeEnemy} from './overworldUtils.js';
import {startQuest,openDialogue,updateQuestStageCompletion} from './dialogueSystem.js';
import {setStoryFlag} from './storyProgress.js';
import {isVeyreign,veyreignParty,veyreignActorKey,chooseVeyreignFate} from './veyreignRules.js';
import {VEYREIGN_CHAPTERS,VEYREIGN_QUEST} from './veyreignData.js';
const point=(x,y)=>({x:(x+.5)*32,y:(y+.5)*32});
export function installVeyreign(w){
 if(!isVeyreign(w))return;
 if(!w.dungeonState.veyreign){w.dungeonState.cleared=false;w.dungeonState.finalBossDefeated=false;w.dungeonState.floorStates={};w.dungeonState.bossReturns={};w.dungeonState.arenas={};}
 const s=w.dungeonState.veyreign||={version:1,firstVisit:true,seals:{},choices:{},seen:{}};w.totalFloors=w.dungeonState.totalFloors=5;w.name=`Castle Veyreign — ${VEYREIGN_CHAPTERS[w.floor-1][1]}`;
 const saved=w.objects?.some(o=>o.veyreignAuthored)?{objects:w.objects,enemies:w.enemies,drops:w.drops}:w.dungeonState.floorStates?.[w.floor];
 const oldAuthored=saved?.objects?.some(o=>o.veyreignAuthored),restored=oldAuthored&&(w.floor===5||saved.objects.some(o=>o.veyreignLayoutVersion===2));
 const priorObjects=new Map((saved?.objects||[]).map(o=>[o.id,o])),priorEnemies=new Map((saved?.enemies||[]).map(e=>[e.id,e]));
 w.width=w.floor===5?96:144;w.height=w.floor===5?90:140;w.tiles=Array.from({length:w.height},()=>Array.from({length:w.width},()=>({biome:'wall',passable:false})));w.rooms=[];w.halls=[];
 const carve=(x,y)=>{if(w.tiles[y]?.[x])w.tiles[y][x]={biome:'stone',passable:true};};
 const specs=w.floor===5?[['vestibule',38,67,20,16],['boss',26,12,44,40]]:[['entry',62,116,20,14],['reception',57,91,30,18],['westApproach',12,90,27,20],['westVault',8,48,31,24],['crossing',53,48,32,22],['eastCourt',104,80,31,23],['eastVault',104,32,30,24],['heart',54,12,34,22],['treasury',8,10,30,23]];
 for(const[id,x,y,width,height]of specs){const r={id,role:id==='boss'?'boss':'combat',x,y,w:width,h:height,cx:x+width/2,cy:y+height/2};w.rooms.push(r);for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++)carve(xx,yy);}
 const line=(a,b)=>{let[x,y]=a;while(x!==b[0]||y!==b[1]){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)carve(x+dx,y+dy);if(x!==b[0])x+=Math.sign(b[0]-x);else y+=Math.sign(b[1]-y);}};
 const route=points=>{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];line(a,[b[0],a[1]]);line([b[0],a[1]],b);}};
 if(w.floor===5)route([[48,75],[48,32]]);
 else{route([[72,123],[72,100],[25,100],[23,100],[23,60],[69,60],[90,60],[90,91],[119,91],[138,91],[138,44],[119,44],[90,44],[90,23],[71,23]]);route([[71,23],[23,23]]);}

 w.spawn=w.floor===5?point(48,79):point(72,125);w.bossRoomCenter=w.floor===5?point(48,32):null;
 if(restored){w.objects=saved.objects;w.enemies=saved.enemies;w.drops=saved.drops||[];repairVeyreignMechanisms(w);return;}
 if(oldAuthored&&w.floor<5)w.veyreignLayoutMigrated=true;
 w.objects=[];w.enemies=[];w.drops=oldAuthored?(saved.drops||[]).map((d,i)=>({...d,x:w.spawn.x+(i%4)*20,y:w.spawn.y-40-Math.floor(i/4)*20})):[];
 const object=(kind,id,name,x,y,extra={})=>w.objects.push({kind,id,name,...point(x,y),r:20,veyreignAuthored:true,veyreignLayoutVersion:2,...extra});
 if(w.floor>1)object('dungeonStairs',`veyreign-up-${w.floor}`,'Return to the Previous Court',w.floor===5?48:72,w.floor===5?81:127,{direction:'up',targetFloor:w.floor-1,arrivalRole:'fromDownstairs'});
 if(w.floor<5)object('dungeonStairs',`veyreign-down-${w.floor}`,'Descend through the Blood Stair',71,17,{direction:'down',targetFloor:w.floor+1,arrivalRole:'fromDownstairs',locked:true});
 const count=Math.max(1,w.dungeonState.coopPlayerCount||1);
 if(w.floor<5){
  for(const r of w.rooms.filter(r=>!['entry','heart'].includes(r.id))){
   const sealIndex=r.id==='westVault'?0:r.id==='eastVault'?1:null,guard=sealIndex==null?`patrol-${w.floor}-${r.id}`:`${w.floor}-${sealIndex}`;
   if(sealIndex!=null)object('poiInvestigation',`veyreign-seal-${w.floor}-${sealIndex}`,sealIndex?'East Blood Seal — Inherited Debt':'West Blood Seal — Household Tithe',r.cx,r.cy,{veyreignSeal:guard,dungeonMechanism:true,questArt:'bloodSeal',forceLabel:true,hideLabel:false,labelPriority:12,message:VEYREIGN_CHAPTERS[w.floor-1][2],poiId:'veyreignCourt',clueId:`seal-${w.floor}-${sealIndex}`});
   const total=sealIndex==null?4:6;
   for(let j=0;j<total;j++){const bat=(j+w.floor)%3===0,id=sealIndex==null?`veyreign-${w.floor}-${r.id}-${j}`:`veyreign-${w.floor}-${sealIndex}-${j}`,enemy=makeEnemy(bat?'basicBeast':'bandit',id,bat?'Bat Beast':'Vampire Spawn',r.x+4+(j%3)*7,r.y+4+Math.floor(j/3)*7,{hp:(340+w.floor*90)*(1+(count-1)*.55),maxHp:(340+w.floor*90)*(1+(count-1)*.55),damage:25+w.floor*5,speed:bat?85:65,xp:55+w.floor*12,veyreignSpawn:!bat,batBeast:bat,vampire:!bat,veyreignGuard:guard,noRespawn:true,level:24+w.floor*2,combatLevel:24+w.floor*2,homeGuard:true,leashRange:320,skin:'#d2b9aa',hair:'#241e26',shirt:'#572936',equipment:{weapon:'blackIronSword',helm:null,chest:'patchedTunic',legs:'roughLegwraps'}});
    const old=priorEnemies.get(id);if(old){for(const key of ['hp','maxHp','dead','remove','alive','deathHandled','enemyWorldLootGenerated','enemyEquipmentLootRolled','xp'])if(old[key]!=null)enemy[key]=old[key];}w.enemies.push(enemy);
   }
  }
  object('signpost',`veyreign-route-${w.floor}`,'The Blood Stair’s Bindings',75,122,{talk:'Two red seal pedestals bind the upper stair. West: cross the reception hall and climb through the western guard wing to the tithe archive. East: follow the connecting gallery through the eastern court and around the outer passage into the blood chapel. Defeat each seal’s guardians, then interact with the pedestal. The stair is in the north gallery; the treasury branches west from there.'});
  object('dungeonChest',`veyreign-treasury-${w.floor}`,'The Court’s Confiscated Wealth',23,20,{chestType:'sideTreasure',tier:w.tier||3,locked:false});

 }else{
  const hp=14000*[1,2,3.1,4.2][Math.min(3,count-1)];w.enemies.push(makeEnemy('bandit','veyreign-lord',s.firstVisit?'Alistair Veyreign, Vampire Lord':'Greater Vampire',48,32,{hp,maxHp:hp,damage:68*(1+(count-1)*.08),speed:0,r:18,radius:18,isBoss:true,isDungeonMainBoss:true,bossId:'alistairVeyreign',veyreignLord:true,vampire:true,level:35,combatLevel:35,bodyType:'male',noRespawn:true,skin:'#d2b9aa',hair:'#24202a',shirt:'#632937',pants:'#211e2b',equipment:{weapon:'blackIronSword',helm:null,chest:'patchedTunic',legs:'roughLegwraps'},xp:1200}));
  object('signpost','veyreign-threshold','The Last Heartbeat',48,60,{interactable:!!s.firstVisit,hideLabel:!s.firstVisit,talk:'The throne chamber will seal around the whole company. Alistair hunts the outer ring, marks each heartbeat, and sweeps the court with blood. Read his tells. There are no borrowed hearts left.'});
 }
 for(const r of w.rooms){for(let i=0;i<4;i++)object('townProp',`veyreign-decor-${w.floor}-${r.id}-${i}`,'Court of Veyreign',r.x+2+(i%2)*(r.w-5),r.y+2+Math.floor(i/2)*(r.h-5),{propType:w.floor===1?'contractTable':w.floor===2?'graveMarker':w.floor===3?'column':w.floor===4?'purificationBrazier':'memorialStone',decorative:true,interactable:false,hideLabel:true});}
 for(const e of w.enemies){e.encounterStatsVersion=ENCOUNTER_VERSION;e.encounterRegion='castleVeyr';e.encounterTier=e.veyreignLord?'boss':'ordinary';e.eliteInitialized=true;e.baseCombatXp=e.xp;}
 for(const o of w.objects){const old=priorObjects.get(o.id);if(old)for(const key of ['claimed','depleted','opened','looted','rewardClaimed'])if(old[key]!=null)o[key]=old[key];}
 repairVeyreignMechanisms(w);
 w.dungeonState.mainBossEnemyId='veyreign-lord';w.dungeonState.requiredBossIds=['veyreign-lord'];delete w.dungeonState.arenas?.[w.floor];
}
export function updateVeyreign(game){
 const w=game.world;if(!isVeyreign(w))return;const p=game.player,owner=p.questOwner||p,s=w.dungeonState.veyreign;if(!s)return;
 for(const e of w.enemies||[])prepareVeyreignTransformation(w,e);
 if(s.firstVisit&&!owner.quests?.active?.[VEYREIGN_QUEST]&&!owner.quests?.completed?.[VEYREIGN_QUEST])startQuest(owner,VEYREIGN_QUEST);
 repairVeyreignMechanisms(w);
 if(s.firstVisit&&game.dialogue&&!s.seen[w.floor]&&!game.dialogue.active){s.seen[w.floor]=true;const c=VEYREIGN_CHAPTERS[w.floor-1];openDialogue(game.dialogue,{npcId:`veyreignChapter${w.floor}`,name:w.floor===5?'Alistair Veyreign':'The Castellan’s Echo',dialogueId:`veyreignChapter${w.floor}`,talk:`${c[0]}. ${c[2]} ${w.floor===5?'“I once opened these gates to save my people. Now I cannot remember their faces. Come. Let us see whether your mercy is stronger than mine.”':''}`},p,w);}
 if(w.bossArena?.phase==='active'&&!s.eligible)s.eligible=veyreignParty(owner).filter(a=>a.hp>0).map(veyreignActorKey);
 if(s.firstVisit&&s.defeated){
  if(!w.objects.some(o=>o.npcId==='veyreignAlistair')&&!s.finalized)w.objects.push({id:'veyreign-offer',kind:'npc',npcId:'veyreignAlistair',name:'Alistair Veyreign — The Last Choice',...point(48,30),vampire:true,skin:'#d2b9aa',shirt:'#632937',hair:'#24202a',r:20,stationary:true,forceLabel:true,veyreignAuthored:true});
  if(!s.finalized&&s.eligible?.every(k=>s.choices[k])){s.finalized=true;w.effects||=[];w.effects.push({kind:'enemyPulse',layer:'front',...point(48,30),color:'#a52e49',radius:100,age:0,ttl:1.2});game.log?.('The last heartbeat leaves Castle Veyreign. The court belongs to the dead, and the valley to the living.');w.objects=w.objects.filter(o=>o.npcId!=='veyreignAlistair');}
 }
 const q=owner.quests?.active?.[VEYREIGN_QUEST];for(const o of q?.objectives||[])if(o.type==='storyFlag'&&owner.story?.flags?.veyreign?.[o.flag.split('.').at(-1)])o.current=o.required;updateQuestStageCompletion(owner,VEYREIGN_QUEST);
}
export function veyreignVictory(w,p){
 if(!isVeyreign(w)||!w.dungeonState.veyreign||!w.enemies.some(e=>e.veyreignLord&&e.veyreignFeral&&e.hp<=0))return;const s=w.dungeonState.veyreign;s.defeated=true;s.eligible||=veyreignParty(p).map(veyreignActorKey);for(const a of veyreignParty(p)){a.veyreignCompleted=true;a.worldMemory||={};a.worldMemory.veyreignCompleted=true;}
}
export function handleVeyreignInteraction(game,o){
 if(!o.veyreignSeal)return false;const w=game.world,s=w.dungeonState.veyreign;
 if(w.enemies.some(e=>e.veyreignGuard===o.veyreignSeal&&!e.dead&&!e.remove&&e.hp>0)){game.log?.('The blood tithe still has living guardians. Defeat the Vampire Spawns and Bat Beasts first.');return true;}
 s.seals[o.veyreignSeal]=true;o.interactable=false;o.activated=true;game.log?.('The blood seal breaks. A heartbeat falls silent in the walls.');
 if([0,1].every(i=>s.seals[`${w.floor}-${i}`]))setStoryFlag(game.player.questOwner||game.player,`veyreign.floor${w.floor}`);updateVeyreign(game);return true;
}
export function leaveVeyreign(w,p){if(!isVeyreign(w))return;for(const a of veyreignParty(p))chooseVeyreignFate(a,w,'kill');}

export function repairVeyreignMechanisms(w){
 const s=w.dungeonState.veyreign;s.seals||={};const broken=[0,1].filter(i=>s.seals[`${w.floor}-${i}`]).length;
 for(const o of w.objects){
  if(o.veyreignSeal){o.dungeonMechanism=true;o.questArt='bloodSeal';o.forceLabel=true;o.hideLabel=false;o.labelPriority=12;o.interactable=!s.seals[o.veyreignSeal];o.activated=!!s.seals[o.veyreignSeal];}
  if(o.kind==='dungeonStairs'&&o.direction==='down'){o.locked=broken<2;o.name=broken<2?`Blood Stair — Break the Seals (${broken}/2)`:'Blood Stair — Unsealed';o.lockedMessage='Break both red blood-seal pedestals in the western archive and eastern chapel. Clear each pedestal’s guardians, then interact with it.';}
 }
}
