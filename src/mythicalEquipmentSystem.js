import { ITEMS } from './data.js';
import { MYTHICAL_SETS } from './mythicalEquipmentData.js';
import { EQUIPMENT_SLOTS } from './equipmentProgressionSystem.js';

export function getMythicalSetCounts(player) {
 const counts={},seen=new Set();
 for(const slot of EQUIPMENT_SLOTS){const id=player?.equipment?.[slot],item=ITEMS[id];if(!item||item.slot!==slot||seen.has(id)||!MYTHICAL_SETS[item.setId])continue;seen.add(id);counts[item.setId]=(counts[item.setId]||0)+1;}
 return counts;
}
export function applyMythicalAbilityModifiers(player,ability) {
 if(!ability)return ability;
 const counts=getMythicalSetCounts(player),a={...ability};
 const water=a.id==='hydromancerWaterTorrent'||a.id==='waveriderMaelstrom'||a.element==='water';
 const beam=a.effectProfile==='conduit'||a.subclassMode==='beam';
 let cost=1;
 if(water && counts.drownedConvergence){cost*=.95;if(counts.drownedConvergence>=2){a.range*=1.1;a._mythWidth=1.25;}
  if(counts.drownedConvergence>=3){
   if(a.id==='hydromancerWaterTorrent'&&(!a.subclassId||a.sunkenBase)){a.effectProfile='mythicTorrent';a.channelProfile={mode:'hold',duration:12,tickInterval:.4,movementMode:'slowed',movementMultiplier:.3,costPerSecond:12.5,turnRate:2.4};a.noUseCharges=true;a.cd=0;a.cost=4;a._mythChannel='torrentSweep';}
   else if(beam)a._mythChannel='torrentSweep';
  }
 }
 if(a.id==='summonWolf' && counts.beastSovereign){cost*=.95;if(counts.beastSovereign>=3)cost*=1.25;}
 if(beam && counts.blightedStar){cost*=.95;a.range*=counts.blightedStar>=2?1.15:1;a._mythTurn=counts.blightedStar>=2?1.2:1.1;
  // Drowned Convergence wins when both apply to the same water beam.
  if(counts.blightedStar>=3&&!a._mythChannel)a._mythChannel='starChain';
 }
 if(a.id==='guard'&&counts.pilgrimVigil>=2)a.damageReduction=(a.damageReduction||.35)+.06;
 if(a.id==='guard'&&counts.pilgrimVigil>=3){cost*=1.2;a.duration=(a.duration||4)*1.25;a._mythGuard=true;}
 a.cost=Number(a.cost||0)*cost;
 if(a.channelProfile){a.channelProfile={...a.channelProfile,costPerSecond:a.channelProfile.costPerSecond*cost*(a._mythChannel==='starChain'?1.2:a._mythChannel==='torrentSweep'&&a.effectProfile!=='mythicTorrent'?1.25:1),turnRate:(a.channelProfile.turnRate||3)*(a._mythTurn||1)};}
 return a;
}
export function mythicalChannelGeometry(player,channel) {
 const a=channel.ability||{},counts=getMythicalSetCounts(player);
 const mode=channel.mythicalMode || a._mythChannel;
 const required=mode==='torrentSweep'?'drownedConvergence':mode==='starChain'?'blightedStar':null;
 // Removing a transforming set interrupts it instead of preserving a snapshot exploit.
 if(required && counts[required]<3)return {invalid:true};
 const sweep=mode==='torrentSweep'?Math.sin(Number(channel.elapsed||0)*2.8)*.42:0;
 const angle=Math.atan2(channel.dirY,channel.dirX)+sweep;
 return {mode,dirX:Math.cos(angle),dirY:Math.sin(angle),width:mode==='torrentSweep'?77:22,damageMultiplier:mode==='torrentSweep'?.7:mode==='starChain'?.78:1,maxTargets:mode==='torrentSweep'?8:undefined};
}
export function applyMythicalMeleeModifiers(player,move,weaponType) {
 const n=getMythicalSetCounts(player).ashenExecutioner || 0;
 if(!n || ['bow','crossbow','spiritFocus','unarmed'].includes(weaponType))return move;
 const result={...move,staminaCost:move.staminaCost*.95};
 if(n>=2&&move.finisher&&move.comboType==='heavy'){result.arcDegrees=Math.min(180,(move.arcDegrees||70)+15);result.stagger=Math.min(.55,(move.stagger||0)+.06);}
 if(n>=3&&move.sequence==='LLH'){
  result.mythicalAsh=true;result.arcDegrees=180;result.range=(move.range||65)*1.2;
  result.damageMultiplier=move.damageMultiplier*.8;result.staminaCost*=1.25;
  const recovery=(move.duration||1)-(move.activeEnd||.6);result.duration=(move.duration||1)+Math.max(0,recovery)*.18;
 }
 return result;
}
export function applyMythicalWolf(player,summon) {
 if(summon.kind!=='wolf')return summon;
 const count=getMythicalSetCounts(player).beastSovereign || 0;
 summon.mythicalSetPieces=count;
 if(count){summon.speed*=1.1;}
 if(count>=2){summon.artVariant='sovereignWolf';summon.attackRange+=8;}
 if(count>=3){summon.direWolf=true;summon.displayName='Dire Wolf';summon.maxHp=Math.ceil(summon.maxHp*1.35);summon.hp=summon.maxHp;summon.speed*=.85;summon.attackRate*=1.15;summon.attackRange+=8;summon.direBites=0;}
 return summon;
}
