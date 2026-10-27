import {getEquipmentTierBonus} from './equipmentProgressionSystem.js';
import { levelPower, levelStat, levelRefinement } from './progressionMath.js';
import { ITEMS } from './data.js';
import { getEquipmentStatBonuses } from './setBonusSystem.js';

export function progressionPower(player, proficiency = 'blade', purpose = 'offence') {
  const levels = player?.skillState?.skills || {};
  const attribute = purpose === 'defence' ? 'defence' : ['blade','blunt','scythe','archery'].includes(proficiency) ? 'dexterity' : 'spirit';
  const combat = player?.skillState?.combat?.level || player?.combatLevel || 1;
  // Offensive growth must keep pace with the geographic enemy health curve.
  // Compressed levels stay uncapped, with additive contributions rather than
  // multiplying three separate level curves. Defensive/resource growth is unchanged.
  if(purpose==='offence')return 1 + .14*levelStat(combat) + .06*levelStat(levels[proficiency]?.level) +
    .02*levelStat(levels[attribute]?.level);
  return 1 + .9 * (levelPower(combat) - 1) + .6 * (levelPower(levels[proficiency]?.level) - 1) +
    .2 * (levelPower(levels[attribute]?.level) - 1);
}
function armourSpiritPower(player){
  return ['helm','chest','legs'].reduce((sum,slot)=>{const item=ITEMS[player?.equipment?.[slot]];
    return sum+Number(item?.slot===slot?item.spirit||0:0);},0);
}
export function equipmentCombatPower(player) {
  const ref = player?.equipment?.weapon, id = typeof ref === 'object' ? ref?.id : ref;
  const weapon = ITEMS[id], trinket = ITEMS[player?.equipment?.trinket];
  return (weapon?.baseDamage || weapon?.power || 4) + (weapon?.spirit || 0) * .5 +
    (weapon?.focusPower || 0) * .85 + (trinket?.power || trinket?.spirit || 0) +
    (armourSpiritPower(player)+Number(getEquipmentStatBonuses(player).spirit||0))*.5 +
    getEquipmentTierBonus(player,'weapon') + getEquipmentTierBonus(player,'trinket');
}
export function attributeHandling(player, attribute) { return levelRefinement(player?.skillState?.skills?.[attribute]?.level, 80); }
export function summonEquipmentPower(player) {
  const ref=player?.equipment?.weapon,weapon=ITEMS[typeof ref==='object'?ref?.id:ref],trinket=ITEMS[player?.equipment?.trinket];
  return (weapon?.spirit||0)+(weapon?.focusPower||0)*.5+(trinket?.spirit||trinket?.power||0)+armourSpiritPower(player)+Number(getEquipmentStatBonuses(player).spirit||0)+getEquipmentTierBonus(player,'weapon')*.5+getEquipmentTierBonus(player,'trinket');
}
export function equipmentDamageMultiplier(player,enemy,element){
  const bonuses=getEquipmentStatBonuses(player);
  const elemental=({necrotic:'necroticDamage',nature:'natureDamage',holy:'holyDamage'})[element];
  return (1+Number(bonuses[elemental]||0))*(1+Number((enemy?.isBoss||enemy?.worldBoss||enemy?.bossId||enemy?.bossType)?bonuses.bossDamage||0:0));
}
