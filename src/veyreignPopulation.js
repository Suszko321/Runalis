import {makeEnemy} from './overworldUtils.js';
import {configureEncounterEnemy,dungeonEncounterProfile,ELITE_MODIFIERS} from './encounterData.js';
const VERSION=2;
const MODIFIERS=['freezer','waller','regenerator','shocker','molten','bulwark','artillery','vortex'];
const alive=e=>!e.dead&&!e.remove&&e.alive!==false&&e.hp>0;
const roomGuard=(w,r)=>r.id==='westVault'?`${w.floor}-0`:r.id==='eastVault'?`${w.floor}-1`:`patrol-${w.floor}-${r.id}`;
function configure(w,e,role,modifier){
 if(e.veyreignPopulationVersion===VERSION)return;
 const ratio=Math.max(0,Math.min(1,(e.hp||0)/Math.max(1,e.maxHp||1))),dead=!alive(e),reserve=e.eliteHealRemaining;
 const size=Math.max(1,Math.min(4,w.dungeonState.coopPlayerCount||1)),scale=1+(size-1)*.55,floor=w.floor;
 // Use the actual framework for rank, seeded rewards, modifier state and range.
 // Then apply the castle's authored role balance to the resulting enemy.
 delete e.encounterStatsVersion;
 configureEncounterEnemy(e,{...dungeonEncounterProfile(w),levels:[24+floor*2,24+floor*2]},`${w.seed}:${e.id}`,{dungeon:true,rank:role==='elite'?'elite':'ordinary',confined:false});
 const hp=Math.round((role==='elite'?650+floor*100:role==='fodder'?85+floor*15:220+floor*35)*scale);
 e.maxHp=hp;e.hp=dead?0:Math.max(1,Math.round(hp*ratio));e.damage=e.dmg=role==='elite'?28+floor*4:role==='fodder'?9+floor*2:17+floor*3;
 e.elite=e.isElite=role==='elite';e.eliteModifiers=role==='elite'?[modifier]:[];e.eliteModifier=e.eliteModifiers[0]||null;e.encounterTier=role==='elite'?'elite':'ordinary';
 e.xp=e.baseCombatXp=Math.max(1,Math.round(e.xp*(role==='fodder'?.4:1)));e.veyreignPopulationRole=role;e.veyreignPopulationVersion=VERSION;
 if(reserve!=null)e.eliteHealRemaining=Math.min(reserve,e.maxHp*.3);
 if(role==='fodder')e.name=e.batBeast?'Lesser Bat Beast':'Fledgling Vampire Spawn';
}
export function initializeVeyreignPopulation(w){
 if(w.dungeonId!=='castleVeyr'||w.floor>=5)return;
 const state=w.dungeonState.veyreign;state.populationFloors||={};const addReinforcements=state.populationFloors[w.floor]!==VERSION;
 const rooms=w.rooms.filter(r=>!['entry','heart'].includes(r.id));
 for(const [index,r]of rooms.entries()){
  const guard=roomGuard(w,r),core=w.enemies.filter(e=>e.veyreignGuard===guard&&!e.veyreignFodder&&!e.coopScaledClone);
  const captain=core.find(e=>e.vampire&&!e.batBeast),modifier=MODIFIERS[(index+w.floor-1)%MODIFIERS.length];
  if(!ELITE_MODIFIERS[modifier])throw Error('Unknown Veyreign elite modifier');
  for(const e of w.enemies.filter(e=>e.veyreignGuard===guard))configure(w,e,e.veyreignFodder?'fodder':e===captain?'elite':'ordinary',modifier);
  const sealBroken=state.seals[guard];
  if(!addReinforcements||sealBroken||!core.some(alive))continue;
  const candidates=[[6,r.h-4],[r.w-6,6],[r.w-7,r.h-5],[10,r.h-5],[6,Math.floor(r.h/2)],[r.w-6,Math.floor(r.h/2)],[Math.floor(r.w/2),r.h-4],[Math.floor(r.w/2),4]];
  let added=0;
  for(const [dx,dy]of candidates){
   if(added>=4)break;const x=(r.x+dx+.5)*32,y=(r.y+dy+.5)*32;
   if(!w.tiles[r.y+dy]?.[r.x+dx]?.passable||w.enemies.some(e=>alive(e)&&Math.hypot(e.x-x,e.y-y)<40)||w.objects.some(o=>(o.veyreignSeal||o.kind==='dungeonStairs'||o.kind==='dungeonChest')&&Math.hypot(o.x-x,o.y-y)<80))continue;
   const id=`veyreign-fodder-${w.floor}-${r.id}-${added}`;if(w.enemies.some(e=>e.id===id)){added++;continue;}
   const bat=added===1,e=makeEnemy(bat?'basicBeast':'bandit',id,bat?'Lesser Bat Beast':'Fledgling Vampire Spawn',r.x+dx,r.y+dy,{hp:100,maxHp:100,damage:12,speed:bat?85:65,xp:20,batBeast:bat,vampire:!bat,veyreignSpawn:!bat,veyreignFodder:true,veyreignGuard:guard,noRespawn:true,homeGuard:true,leashRange:320,skin:'#d2b9aa',hair:'#241e26',shirt:'#492b38',equipment:{weapon:'oldKnife',helm:null,chest:'patchedTunic',legs:'roughLegwraps'}});
   configure(w,e,'fodder');w.enemies.push(e);added++;
  }
 }
 state.populationFloors[w.floor]=VERSION;
}
