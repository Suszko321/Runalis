import {getChargeDurationMultiplier} from './chargeSystem.js';
import {levelStat} from './progressionMath.js';

// Shared base values; combat applies Warding, Defence and mastery afterward.
export function defensiveProtection(player,ability) {
 const level=Math.max(1,Number(player.combatLevel||1));
 return {
  duration:(ability.id==='ironOath'?5.5:ability.id==='briarWard'?4:1.2)*(1+Math.min(.28,level*.004))*getChargeDurationMultiplier(ability)*(ability._mythGuard?1.25:1),
  reduction:Math.min(.72,(ability.id==='ironOath'?.58:ability.damageReduction||.35)+Math.min(.08,level*.0015))
 };
}
export function calculateBubbleWardDuration(combatLevel,chargeDuration=1,flow=null) {
 const level=Math.max(1,Math.floor(Number(combatLevel||1)));
 const base=4.5+Math.min(10,Math.floor(levelStat(level)*1.5/10));
 return Math.max(3,Number((base+Math.max(0,Number(chargeDuration||1)-1)*1.15+(flow?.empowered?1.25:0)).toFixed(2)));
}
export function calculateBubbleWardFlatAbsorb(player,ability,flow) {
 const chargeLevel=Math.max(0,Number(ability?._charge?.level||0));
 const progress=Math.max(0,Math.min(1,Number(ability?._charge?.progress||0)));
 return Math.max(4,Math.ceil(5.5*(1+progress*.65+chargeLevel*.24)*(flow?.empowered?1.25:1)));
}
