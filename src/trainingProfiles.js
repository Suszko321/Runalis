import {ITEMS} from './data.js';
import {abilityProgressionCategories} from './progressionProfiles.js';

export const TRAINING_PRIORITIES = ['hitpoints','defence','stamina','spirit','focus','dexterity'];
export function trainingPriority(actor) {
  const selected = actor?.skillState?.trainingPriority;
  return TRAINING_PRIORITIES.includes(selected) ? selected : 'stamina';
}

export function weaponTraining(skill, family) {
  const profiles = {
    grimoire: {grimoire:22, spirit:12, focus:6},
    spiritFocus: {spirit:20, focus:12, stamina:8},
    eldritch: {spirit:20, focus:12, stamina:8},
    staff: {warding:20, spirit:14, stamina:6}
  };
  if (profiles[family]) return profiles[family];
  if (skill === 'blunt') return {blunt:22, stamina:10, defence:8};
  return {[skill]:22, dexterity:10, stamina:8};
}

export function armourTraining(item) {
  if (!item || item.type !== 'armour') return null;
  const style = `${item.visualSilhouette || ''} ${item.name || ''}`.toLowerCase();
  if (item.armourWeight === 'heavy' || (!item.armourWeight && /plate|mail|steel|iron|greathelm|sabatons/.test(style))) {
    return {heavyArmour:50, defence:30, hitpoints:20};
  }
  if (/robe|cloth|silk|vestment|ritual/.test(style) || (item.spirit || 0) > (item.armour || 0)) {
    return {lightArmour:50, spirit:30, focus:20};
  }
  return {lightArmour:50, dexterity:30, stamina:20};
}

function equippedBase(actor, slot) {
  const ref = actor?.equipment?.[slot];
  return ITEMS[typeof ref === 'object' ? ref?.id : ref];
}

export function wornTraining(actor) {
  const weights = {};
  for (const [slot, weight] of [['chest',4], ['legs',2], ['helm',1]]) {
    const profile = armourTraining(equippedBase(actor, slot));
    for (const [skill, share] of Object.entries(profile || {})) weights[skill] = (weights[skill] || 0) + share * weight;
  }
  const charm = equippedBase(actor, 'trinket');
  if (charm && Object.keys(weights).length) {
    const skill = charm.spirit > (charm.armour || 0) ? 'spirit' : charm.armour ? 'defence' : 'stamina';
    weights[skill] = (weights[skill] || 0) + 35;
  }
  return weights;
}

export function abilityDisciplines(ability) {
  if (!ability) return [];
  if (ability.disciplines) return ability.disciplines;
  const disciplines = [];
  if (ability.summonType) return ['summoning'];
  if (ability.channelProfile) disciplines.push('channeling');
  if (ability.radius || ability.aoe || /area|aoe|field|storm|pulse|maelstrom/i.test(`${ability.role} ${ability.effectProfile}`)) disciplines.push('areaControl');
  if (ability.kind === 'melee' || (ability.range > 0 && ability.range <= 120 && /blade|blunt|scythe/.test(ability.skill))) disciplines.push('closeCombat');
  return disciplines.slice(0, 2);
}

export function abilityTraining(ability) {
  const categories = [...new Set(abilityProgressionCategories(ability))];
  const disciplines = abilityDisciplines(ability);
  const weights = {};
  for (const skill of categories) weights[skill] = (disciplines.length ? 60 : 100) / categories.length;
  for (const skill of disciplines) weights[skill] = (weights[skill] || 0) + 40 / disciplines.length;
  return weights;
}

export function armourHandling(actor) {
  const weights = wornTraining(actor);
  const light = weights.lightArmour || 0;
  const heavy = weights.heavyArmour || 0;
  const total = Math.max(350, light + heavy);
  const level = id => Math.max(0, (actor?.skillState?.skills?.[id]?.level || 1) - 1);
  const proficiency = id => level(id) / (level(id) + 40);
  return {
    protection: 3 * heavy / total + 8 * heavy / total * proficiency('heavyArmour'),
    dodgeCost: 1 + .18 * heavy / total - light / total * (.08 + .12 * proficiency('lightArmour')),
    channelCost: 1 + .12 * heavy / total - light / total * .08 * proficiency('lightArmour')
  };
}
