import {hasEquippedBlock,BLOCK_DEFENCE_XP_MULTIPLIER} from './hotbarConfig.js';
import { normalizeClassId } from './classData.js';
import {isTauntAbility,supportProgression} from './supportProgression.js';
// Affinities change earning speed, never combat effectiveness.
export const CLASS_XP_AFFINITIES = Object.freeze({
  classless: ['blade', 'stamina'], oathkeeper: ['blunt', 'defence'],
  fellhunter: ['archery', 'dexterity'], gravecaller: ['scythe', 'summoning'],
  thornbinder: ['warding', 'summoning'], waverider: ['blade', 'warding'],
  lightbringer: ['spirit', 'warding'], eldritch: ['spirit', 'focus']
});
export const SURVIVAL_ATTRIBUTES = ['hitpoints', 'stamina', 'defence', 'spirit'];
export const CORE_ATTRIBUTES = [...SURVIVAL_ATTRIBUTES, 'focus', 'dexterity'];
export const COMBAT_PROFICIENCIES = ['blade', 'blunt', 'scythe', 'archery', 'warding', 'summoning','grimoire','lightArmour','mediumArmour','heavyArmour','channeling','closeCombat','areaControl','healing','taunting'];
export const getClassAffinities = player => CLASS_XP_AFFINITIES[normalizeClassId(player?.classId) || 'classless'] || CLASS_XP_AFFINITIES.classless;
export const affinityMultiplier = (player, id) => (getClassAffinities(player).includes(id) ? 1.25 : 1)*(id==='defence'&&hasEquippedBlock(player)?BLOCK_DEFENCE_XP_MULTIPLIER:1);
export function weaponProficiency(weapon, fallback = 'blade') {
  if(weapon?.weaponType==='grimoire')return 'grimoire';
  if (['mace','hammer','maul'].includes(weapon?.weaponType)) return 'blunt';
  if (weapon?.weaponType === 'scythe') return 'scythe';
  return weapon?.primarySkill || weapon?.skill || fallback;
}
export function abilityProgressionCategories(ability) {
  if (!ability) return [];
  const support = supportProgression(ability);
  if (support === 'healing') return isTauntAbility(ability) ? ['healing','taunting','spirit'] : ['healing','spirit'];
  if (support === 'taunting') return ability.id==='oathkeeperBulwarkOfLight' ? ['taunting','warding','defence'] : ['taunting','defence'];
  if (support === 'warding') return ['warding','defence','spirit'];
  if (ability.progressionCategories) return ability.progressionCategories;
  if (ability.summonType || /DeathEcho|Corpsebloom/.test(ability.id)) return ['summoning', 'spirit'];
  const physical = ['blade', 'blunt', 'archery', 'scythe'].includes(ability.skill);
  if (ability.mobilityProfile || /step|walk|stride|vault|retreat|leap/i.test(ability.id)) return ['dexterity', 'stamina'];
  return physical ? [ability.skill, 'stamina', 'dexterity'] : [ability.skill === 'warding' ? 'spirit' : ability.skill || 'spirit', 'spirit', 'focus'];
}
