import {getPlayerExpertise} from './skillExpertiseSystem.js';
export const OATH_BLADE_ID='oathkeeperHallowedBlades';
export function getOathVisualFamily(player){
 if(!['oathkeeper','templar'].includes(player?.classId))return 'base';
 const chosen=getPlayerExpertise(player);if(chosen?.classId==='oathkeeper')return chosen.family;
 const families=['base','holyknight','sinner'],counts=Object.fromEntries(families.map(f=>[f,0]));
 for(const id of player?.loadout?.abilitySlots||[])if(String(id).startsWith('oathkeeper'))counts[player.abilityMorphs?.[id]||'base']++;
 return families.reduce((best,f)=>counts[f]>counts[best]?f:best,'base');
}
export const OATH_BLADE_PROFILES=Object.freeze({
 base:{name:'Hallowed Blades',count:3,duration:8,cost:24,cd:18,range:240,ratio:.56,interval:.8,speed:620,element:'holy',
  desc:'Conjure three floating oath-swords for eight seconds. They wind up, strike nearby visible enemies one at a time, then return. Walls block their attacks; casting again replaces the formation.'},
 holyknight:{name:'Swords of the Radiant Host',count:4,duration:8,cost:27,cd:19,range:225,ratio:.5,interval:.8,speed:600,element:'holy',splash:.2,splashRadius:44,weaken:true,
  desc:'Conjure four radiant broadswords for eight seconds. Each committed strike weakens its victim and releases a small holy shockwave that can catch two nearby foes. Walls block attacks; the formation cannot stack.'},
 sinner:{name:'Swords of the Forsaken Vow',count:3,duration:8,cost:25,cd:18,range:220,ratio:.34,interval:.8,speed:680,element:'necrotic',healthCost:.02,splash:.6,splashRadius:70,
  desc:'Sacrifice 2% of current health, leaving at least one, to conjure three black grave-swords for eight seconds. Each strike sends necrotic splinters into up to two nearby foes. Lower focused damage, greater pack pressure. Walls block attacks; the formation cannot stack.'}
});
export function tuneOathBlades(ability,family='base'){
 const c=OATH_BLADE_PROFILES[family];if(!c)return ability;
 return {...ability,name:c.name,desc:c.desc,oathBlades:true,oathBladeFamily:family,subclassMode:family==='base'?undefined:'oathBlades',subclassSecondary:undefined,
 effectProfile:'oathBlades',role:'damage',animationFamily:'ritual',damage:14,damageMultiplier:c.ratio,costType:'spirit',cost:c.cost,cd:c.cd,rechargeTime:c.cd,range:c.range,duration:c.duration,
 element:c.element,canCharge:false,maxChargeTime:0,noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,maxCharges:1,
 channelProfile:undefined,mobilityProfile:undefined,subclassHealthCost:c.healthCost||0,subclassRadius:c.splashRadius||28};
}
