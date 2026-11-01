import {makeEnemy} from './overworldUtils.js';
import {ENCOUNTER_VERSION} from './encounterData.js';
import {tuneDungeonBoss} from './dungeonBossDifficulty.js';
import {startQuest,updateQuestStageCompletion} from './dialogueSystem.js';
import {setStoryFlag,getStoryFlag} from './storyProgress.js';
import {resetIronMireCombat} from './ironMireCombat.js';
import {IRON_MIRE_QUEST,IRON_MIRE_VERSION,IRON_MIRE_CHAPTERS} from './ironMireData.js';
export const isIronMire=w=>w?.mode==='dungeon'&&w.dungeonId==='ironMireDungeon';
const point=(x,y)=>({x:(x+.5)*32,y:(y+.5)*32});
const living=e=>!e.dead&&!e.remove&&e.hp>0;
const keysByFloor={1:['westPump','eastPump'],2:['crew0','crew1','crew2','westBrake','eastBrake']};
export function installIronMire(w){
 if(!isIronMire(w))return;
 const state=w.dungeonState||={};
 const saved=w.objects?.some(o=>o.ironMireAuthored)?{objects:w.objects,enemies:w.enemies,drops:w.drops}:state.floorStates?.[w.floor];
 const current=saved?.objects?.some(o=>o.ironMireAuthored===IRON_MIRE_VERSION);
 const s=state.ironMire||={version:IRON_MIRE_VERSION,controls:{},defeated:!!state.cleared};s.controls||={};
 w.totalFloors=state.totalFloors=3;w.name=`Abandoned Iron Vault — ${IRON_MIRE_CHAPTERS[w.floor-1]}`;w.theme='mine';
 w.width=96;w.height=w.floor===3?86:112;
 w.tiles=Array.from({length:w.height},()=>Array.from({length:w.width},()=>({biome:'wall',passable:false})));
 w.rooms=[];w.halls=[];
 const carve=(x,y)=>{if(w.tiles[y]?.[x])w.tiles[y][x]={biome:'stone',passable:true,variant:(x*7+y*11)%4};};
 const specs=w.floor===3?[['refuge',38,66,20,12],['westGuard',6,43,24,18],['eastGuard',66,43,24,18],['boss',26,6,44,32]]:w.floor===2?
 [['refuge',38,94,20,12],['westYard',6,70,28,20],['eastForge',64,68,26,22],['westPump',8,36,24,20],['eastPump',64,30,26,24],['crossing',36,55,24,22],['archive',5,5,30,22],['lift',64,5,26,18],['heart',37,22,22,20]]:
 [['refuge',38,94,20,12],['westYard',6,72,26,18],['eastForge',64,72,26,18],['westPump',6,40,26,20],['eastPump',64,40,26,20],['crossing',37,50,22,18],['archive',6,10,26,20],['lift',64,10,26,20],['heart',37,14,22,20]];
 for(const[id,x,y,width,height]of specs){const r={id,role:id==='boss'?'boss':id==='refuge'?'entry':'combat',x,y,w:width,h:height,cx:x+Math.floor(width/2),cy:y+Math.floor(height/2)};w.rooms.push(r);for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++)carve(xx,yy);}
 const segment=(a,b)=>{let[x,y]=a;const ox=x,oy=y;while(true){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)carve(x+dx,y+dy);if(x===b[0]&&y===b[1])break;if(x!==b[0])x+=Math.sign(b[0]-x);else y+=Math.sign(b[1]-y);}w.halls.push({x1:ox,y1:oy,x2:x,y2:y});};
 const route=points=>{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];segment(a,[b[0],a[1]]);segment([b[0],a[1]],b);}};
 if(w.floor===3){route([[48,72],[48,22]]);route([[18,52],[78,52]]);}
 else if(w.floor===2){route([[48,100],[48,82],[19,82],[19,46],[19,16],[48,16],[77,16],[77,42],[77,79],[48,79]]);route([[19,64],[77,64]]);route([[48,64],[48,32]]);}
 else{route([[48,100],[48,81],[19,81],[19,50],[19,20],[48,20],[77,20],[77,50],[77,81],[48,81]]);route([[19,59],[77,59]]);route([[48,59],[48,24]]);}
 w.spawn=point(48,w.floor===3?74:102);w.bossRoomCenter=w.floor===3?point(48,22):null;
 w.dungeonScaleProfile={id:'ironMireAuthored',minPlayableTiles:0,playableTiles:w.tiles.flat().filter(t=>t.passable).length};
 if(current){w.objects=saved.objects;w.enemies=saved.enemies;w.drops=saved.drops||[];for(const e of w.enemies)if(e.ironMireForeman){resetIronMireCombat(e);tuneDungeonBoss(e,state.coopPlayerCount||1);}repairIronMireControls(w);return;}
 w.ironMireLayoutMigrated=true;w.objects=[];w.enemies=[];w.drops=(saved?.drops||w.drops||[]).map((d,i)=>({...d,x:w.spawn.x+(i%4)*20,y:w.spawn.y-40-Math.floor(i/4)*20}));
 const object=(kind,id,name,x,y,extra={})=>w.objects.push({kind,id,name,...point(x,y),r:20,ironMireAuthored:IRON_MIRE_VERSION,...extra});
 const prop=(id,index,x,y,scale=1)=>object('ironMireProp',id,'Iron Vault machinery',x,y,{ironMireProp:index,artScale:scale,decorative:true,interactable:false,hideLabel:true,blocksMovement:false});
 if(w.floor===1){
  object('dungeonExit','ironMireSurface','Return to Iron Mire',48,104);
  object('npc','ironMireSurveyor','Surveyor Mara Venn',44,99,{npcId:'ironMireSurveyor',dialogueId:'ironMireSurveyor',deferTalkObjective:true,bodyType:'female',hair:'#66564a',skin:'#c7ad8c',shirt:'#46545a',pants:'#302f2c',stationary:true,forceLabel:true});
 }
 if(w.floor>1)object('dungeonStairs',`ironMireUp${w.floor}`,'Ascend the Emergency Cage',48,w.floor===3?76:104,{direction:'up',targetFloor:w.floor-1});
 if(w.floor<3)object('dungeonStairs',`ironMireDown${w.floor}`,'Northern Cage Lift',48,17,{direction:'down',targetFloor:w.floor+1,locked:true,forceLabel:true});
 const controls=w.floor===1?[
  ['westPump','West Pump Bypass',19,50,'westPump',11,'The west bypass opens. Black water leaves the receiving works through the emergency trench.'],
  ['eastPump','East Boiler Return',77,50,'eastPump',1,'The boiler return vents. The two pumps no longer force water into the cage shaft.']
 ]:w.floor===2?[
  ['crew0','Receiving Crew Roll',19,81,'westYard',7,'Receiving crew: eleven names, one shift extended three times. Their final tally lists workers as equipment held below.'],
  ['crew1','Cutting Crew Roll',19,20,'archive',7,'Cutting crew: the foreman ordered the overflow sealed until the shipment was loaded. The emergency keys never reached the lower cage.'],
  ['crew2','Night-Shift Roll',77,81,'eastForge',7,'Night shift: the bell rang after the water reached the lamps. The last entry asks that someone tell their families they tried to leave.'],
  ['westBrake','West Cage Brake',19,50,'westPump',11,'The west brake releases. The old cage drops against its remaining chain.'],
  ['eastBrake','East Cage Brake',77,50,'eastPump',11,'The east brake releases. The descent to the Foreman’s Bell is ready.']
 ]:[];
 for(const[key,name,x,y,guard,index,message]of controls)object('dungeonPuzzle',`ironMire-${key}`,name,x,y,{ironMireControl:key,ironMireGuard:guard,ironMireProp:index,dungeonMechanism:true,forceLabel:true,interactable:true,message,questArt:'mechanism'});
 const count=Math.max(1,Math.min(4,state.coopPlayerCount||1)),mult=[1,1.3,1.55,1.8][count-1];
 for(const room of w.rooms.filter(r=>r.role==='combat')){
  const n=Math.ceil((w.floor===1?7:w.floor===2?9:10)*mult);
  for(let j=0;j<n;j++){
   const elite=j===0&&['westPump','eastPump','archive','westGuard','eastGuard'].includes(room.id);
   const kind=j%7===0?'brute':j%7===3?'archer':j%7===5?'gravePriest':j%3===0?'shieldKnight':'gravebound';
   const hp=(kind==='brute'?550:kind==='archer'?250:kind==='gravePriest'?310:370)+(w.floor-1)*65;
   const enemy=makeEnemy(kind,`ironMire-${w.floor}-${room.id}-${j}`,elite?'Ironbound Shift Captain':kind==='archer'?'Rivet Scavenger':kind==='gravePriest'?'Drowned Bell Tender':kind==='brute'?'Chain-Gang Hauler':'Drowned Mine Hand',room.x+4+(j%4)*5,room.y+4+Math.floor(j/4)*3,{hp:hp*(elite?2.1:1),maxHp:hp*(elite?2.1:1),damage:(kind==='archer'?22:kind==='gravePriest'?24:30)+(w.floor-1)*3,speed:kind==='brute'?43:kind==='archer'?58:52,level:14+w.floor,combatLevel:14+w.floor,xp:65+w.floor*12,noRespawn:true,homeGuard:true,leashRange:340,homeRadius:220,ironMireGuard:room.id,ironMireResident:true,elite,isElite:elite,eliteModifiers:elite?['bulwark']:[],skin:'#9b9f94',hair:'#303638',shirt:'#465052',pants:'#35312f'});
   enemy.encounterStatsVersion=ENCOUNTER_VERSION;enemy.encounterRegion='ironMire';enemy.encounterTier=elite?'elite':'ordinary';enemy.baseCombatXp=enemy.xp;w.enemies.push(enemy);
  }
 }
 if(w.floor===3){
  const boss=makeEnemy('brute','ironMireForeman','Garran Voss, the Drowned Iron Foreman',48,22,{hp:11200,maxHp:11200,damage:64,speed:0,r:34,radius:34,isBoss:true,isDungeonMainBoss:true,bossId:'drownedIronForeman',ironMireForeman:true,level:18,combatLevel:18,noRespawn:true,arenaDormant:true,xp:850});
  boss.encounterStatsVersion=ENCOUNTER_VERSION;boss.encounterTier='boss';boss.encounterRegion='ironMire';boss.eliteInitialized=true;boss.baseCombatXp=boss.xp;tuneDungeonBoss(boss,count);resetIronMireCombat(boss);
  if(s.defeated||state.cleared){boss.hp=0;boss.dead=true;boss.remove=true;boss.deathHandled=true;boss.bossRewardClaimed=true;}
  w.enemies.push(boss);
  object('signpost','ironMireBellWarning','Emergency Evacuation Plate',48,44,{talk:'The bell chamber seals when the company crosses its threshold. Raised pick: leave the marked lane. Chains: move between the lanes. Falling roof: leave the circles before each impact. Flood: find the dry half; in the final shift, use the central walkway. Bell: leave the ring or close inside it. The refuge and cage remain outside the arena.'});
  prop('ironMireBossWinch',0,29,10,2);prop('ironMireBossBoiler',2,66,10,2);prop('ironMireBossMemorial',9,30,35);
  object('dungeonChest','ironMireForemanCache','The Foreman’s Withheld Pay',48,31,{chestType:'boss',tier:3,locked:!state.cleared,unlockOnDungeonClear:true,ironMireProp:10});
 }
 for(const r of w.rooms){
  if(r.id==='boss')continue;
  prop(`ironMireDecor-${w.floor}-${r.id}-frame`,4,r.x+2,r.y+2,2);
  prop(`ironMireDecor-${w.floor}-${r.id}-machine`,r.id==='refuge'?7:r.id==='westPump'?1:r.id==='eastPump'?2:r.id==='lift'?0:3,r.x+r.w-4,r.y+4,r.id==='refuge'?1:2);
  prop(`ironMireDecor-${w.floor}-${r.id}-rails`,6,r.x+3,r.y+r.h-3);
 }
 if(w.floor<3){object('dungeonChest',`ironMireSalvage${w.floor}`,'Sealed Emergency Stores',77,20,{chestType:'sideTreasure',tier:3,locked:false});prop(`ironMireHoist${w.floor}`,0,48,28,2);}
 if(w.floor<3)for(const [i,r]of w.rooms.filter(r=>!['refuge','heart','crossing'].includes(r.id)).entries()){
  object('ore',`ironMireOre-${w.floor}-${i}`,'Black Iron Vein',r.x+3,r.y+r.h-4,{itemId:'ironOre',depleted:false,respawn:0,respawnTime:300});
  if(w.floor===2&&i%3===0)object('deepstone',`ironMireDeepstone-${i}`,'Deepstone Exposed by the Flood',r.x+r.w-4,r.y+r.h-4,{itemId:'deepstone',xp:58,requiredLevel:9,requiredToolTier:3,depleted:false,respawn:0,respawnTime:300});
 }
 state.mainBossEnemyId='ironMireForeman';state.requiredBossIds=['ironMireForeman'];delete state.arenas?.[w.floor];repairIronMireControls(w);
}
export function repairIronMireControls(w){
 const s=w.dungeonState.ironMire;if(!s)return;
 for(const o of w.objects){
  if(o.ironMireControl){o.activated=!!s.controls[o.ironMireControl];o.interactable=!o.activated;}
  if(o.kind==='dungeonStairs'&&o.direction==='down'){
   const keys=keysByFloor[w.floor]||[],n=keys.filter(k=>s.controls[k]).length;o.locked=n<keys.length;
   o.name=o.locked?`Cage Lift — Emergency Locks (${n}/${keys.length})`:'Cage Lift — Released';
   o.lockedMessage=w.floor===1?'Clear and open both pump bypasses in the western and eastern pump rooms.':'Recover all three crew rolls and release both cage brakes before descending.';
  }
 }
}
export function updateIronMire(game){
 const w=game?.world;if(!isIronMire(w)||!game.player)return;const p=game.player.questOwner||game.player,s=w.dungeonState.ironMire;
 if(!s)return;
 if(!p.quests?.active?.[IRON_MIRE_QUEST]&&!p.quests?.completed?.[IRON_MIRE_QUEST])startQuest(p,IRON_MIRE_QUEST);
 if(w.dungeonState.cleared)s.defeated=true;
 for(const[key,value]of Object.entries(s.controls))if(value&&!getStoryFlag(p,`ironMire.${key}`))setStoryFlag(p,`ironMire.${key}`);
 if(s.defeated)setStoryFlag(p,'ironMire.foremanReleased');
 repairIronMireControls(w);
 // Carry already recovered evidence through stages without granting repeat rewards.
 for(let i=0;i<5;i++){
  const q=p.quests?.active?.[IRON_MIRE_QUEST];if(!q)break;const before=q.stageIndex;
  for(const o of q.objectives||[])if(o.type==='storyFlag'&&getStoryFlag(p,o.flag))o.current=o.required;
  updateQuestStageCompletion(p,IRON_MIRE_QUEST);if(p.quests?.active?.[IRON_MIRE_QUEST]?.stageIndex===before)break;
 }
}
export function handleIronMireInteraction(game,o){
 if(!isIronMire(game.world)||!o.ironMireControl)return false;
 const w=game.world,s=w.dungeonState.ironMire,key=o.ironMireControl;
 if(s.controls[key])return true;
 if(w.enemies.some(e=>e.ironMireGuard===o.ironMireGuard&&living(e))){game.log?.('The drowned crew still guards this station. Clear its defenders first.');return true;}
 s.controls[key]=true;game.log?.(o.message);updateIronMire(game);return true;
}
