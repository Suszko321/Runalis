import {ITEMS} from './data.js';
import {weaponProficiency} from './progressionProfiles.js';
import {levelStat} from './progressionMath.js';

// Class-tree IDs and saves remain Archery. A trained melee hunter can use their
// equipped melee proficiency instead, without adding two proficiency curves.
export function fellhunterProficiency(player){
 const ref=player?.equipment?.weapon,item=ITEMS[typeof ref==='object'?ref?.id:ref],weapon=weaponProficiency(item);
 if(item&&!['sword','dagger','axe','mace','hammer','maul','spear','staff','scythe'].includes(item.weaponType))return 'archery';
 return Number(player?.skillState?.skills?.[weapon]?.level||1)>Number(player?.skillState?.skills?.archery?.level||1)?weapon:'archery';
}
export function fellhunterTrainingLevel(player){return Math.max(1,Number(player?.skillState?.skills?.[fellhunterProficiency(player)]?.level||1));}
export function fellhunterAbilityPower(player){return 1+.14*levelStat(player?.skillState?.combat?.level||player?.combatLevel||1)+.06*levelStat(fellhunterTrainingLevel(player))+.02*levelStat(player?.skillState?.skills?.dexterity?.level);}
export function fellhunterToolAnimation(player,ability){
 if(ability?.classId!=='fellhunter')return ability?.animationFamily;
 const ref=player?.equipment?.weapon,type=ITEMS[typeof ref==='object'?ref?.id:ref]?.weaponType;
 return ability.animationFamily==='ranged'&&!['bow','crossbow'].includes(type)?'throw':ability.animationFamily;
}
