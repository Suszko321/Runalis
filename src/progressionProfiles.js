import {hasEquippedBlock,BLOCK_DEFENCE_XP_MULTIPLIER} from './hotbarConfig.js';
import { normalizeClassId } from './classData.js';
// Affinities change earning speed, never combat effectiveness.
export const CLASS_XP_AFFINITIES = Object.freeze({
  classless: ['blade', 'stamina'], oathkeeper: ['blunt', 'defence'],
  fellhunter: ['archery', 'dexterity'], gravecaller: ['scythe', 'summoning'],
  thornbinder: ['warding', 'summoning'], waverider: ['blade', 'warding'],
  lightbringer: ['spirit', 'warding'], eldritch: ['spirit', 'focus']
});
export const SURVIVAL_ATTRIBUTES = ['hitpoints', 'stamina', 'defence', 'spirit'];
export const CORE_ATTRIBUTES = [...SURVIVAL_ATTRIBUTES, 'focus', 'dexterity'];
export const COMBAT_PROFICIENCIES = ['blade', 'blunt', 'scythe', 'archery', 'warding', 'summoning'];
export const getClassAffinities = player => CLASS_XP_AFFINITIES[normalizeClassId(player?.classId) || 'classless'] || CLASS_XP_AFFINITIES.classless;
export const affinityMultiplier = (player, id) => (getClassAffinities(player).includes(id) ? 1.25 : 1)*(id==='defence'&&hasEquippedBlock(player)?BLOCK_DEFENCE_XP_MULTIPLIER:1);
export function weaponProficiency(weapon, fallback = 'blade') {
  if (['mace','hammer','maul'].includes(weapon?.weaponType)) return 'blunt';
  if (weapon?.weaponType === 'scythe') return 'scythe';
  return weapon?.primarySkill || weapon?.skill || fallback;
}
export function abilityProgressionCategories(ability) {
  if (!ability) return [];
  if (ability.progressionCategories) return ability.progressionCategories;
  if (ability.summonType || /DeathEcho|Corpsebloom/.test(ability.id)) return ['summoning', 'spirit'];
  const physical = ['blade', 'blunt', 'archery', 'scythe'].includes(ability.skill);
  const protective = /heal|ward|aegis|guard|shield|litany|mend|protection/i.test(ability.id);
  if (protective) return ['warding', 'defence', 'spirit'];
  if (ability.mobilityProfile || /step|walk|stride|vault|retreat|leap/i.test(ability.id)) return ['dexterity', 'stamina'];
  return physical ? [ability.skill, 'stamina', 'dexterity'] : [ability.skill || 'spirit', 'spirit', 'focus'];
}
