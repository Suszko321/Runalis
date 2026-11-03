import { getAbilityById } from './data.js';
import { abilityProgressionCategories } from './progressionProfiles.js';
import {resolveSubclassAbility} from './subclassVariants.js';
import {abilityTraining, wornTraining} from './trainingProfiles.js';
import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';

const actorIds = new WeakMap();
let nextActor = 1;
export function combatActorId(actor) {
  if (!actorIds.has(actor)) actorIds.set(actor, `combat-actor-${nextActor++}`);
  return actorIds.get(actor);
}
export function ensureContribution(enemy, actor) {
  const id = combatActorId(actor);
  enemy.combatContributors ||= {};
  const entry = enemy.combatContributors[id] ||= {
    actor, actorId: id, hits: 0, damage: 0, skills: {}, weapons: {}, abilities: {}, support: {},
    offenceTraining: {}, armourTraining: {}, actionTraining: {}, actionTotals: {},
    // Lock the encounter specialization at first contribution, not at death.
    hotbar: [...new Set((actor.loadout?.abilitySlots || []).slice(0,HOTBAR_SLOT_COUNT).map(id=>getAbilityById(id)?.id).filter(Boolean))].map(id=>resolveSubclassAbility(actor,getAbilityById(id))).filter(Boolean).map(a =>
      ({ id: a.id, summon: !!a.summonType || (a.subclassId?a.subclassMode==='spirits':/DeathEcho|Corpsebloom/.test(a.id)), categories: abilityProgressionCategories(a), training: abilityTraining(a) })),
    playerParticipation: false
  };
  return entry;
}

export function addTrainingEvidence(destination, profile, amount) {
  const total = Object.values(profile).reduce((sum, value) => sum + value, 0);
  if (!(total > 0 && amount > 0 && Number.isFinite(amount))) return;
  for (const [skill, weight] of Object.entries(profile)) destination[skill] = (destination[skill] || 0) + weight / total * amount;
}

export function recordDefensiveTraining(enemy, actor, action, amount) {
  if (!enemy || !actor || enemy.classId || enemy.friendly || enemy.trainingDummy || enemy.rewardSuppressed || enemy.combatSkillXpAwarded || !Number.isFinite(amount) || !(amount > 0)) return;
  const entry = ensureContribution(enemy, actor);
  const profile = action === 'dodge' ? {dexterity:60, stamina:40} : {defence:65, stamina:35};
  const cap = Math.max(1, Number(enemy.maxHp) || 30) * .5;
  const previous = entry.actionTotals[action] || 0;
  const useful = Math.min(amount, Math.max(0, cap - previous));
  entry.actionTotals[action] = previous + useful;
  addTrainingEvidence(entry.actionTraining, profile, useful);
  addTrainingEvidence(entry.armourTraining, wornTraining(actor), useful);
  entry.playerParticipation = true;
}
export function recordSupportContribution(actor, enemies, abilityId, effectiveAmount, purpose = 'support') {
  if (!(effectiveAmount > 0) || !actor || !getAbilityById(abilityId)) return;
  for (const enemy of enemies) {
    if (enemy.trainingDummy || enemy.friendly || enemy.combatSkillXpAwarded) continue;
    const entry = ensureContribution(enemy, actor);
    // Normalize useful support to encounter pressure, rather than action count.
    const cap = Math.max(1, Number(enemy.maxHp || 30)) * .5;
    const key = `${abilityId}:${purpose}`;
    const previous = entry.support[key] || 0;
    entry.support[key] = Math.min(cap, previous + effectiveAmount / Math.max(1, enemies.length));
    const credited = entry.support[key] - previous;
    const ability = resolveSubclassAbility(actor, getAbilityById(abilityId));
    addTrainingEvidence(entry.offenceTraining, abilityTraining(ability), credited);
    const actionProfile = purpose === 'mobility' ? {dexterity:60, stamina:40} : {warding:60, spirit:40};
    addTrainingEvidence(entry.actionTraining, actionProfile, credited);
    addTrainingEvidence(entry.armourTraining, wornTraining(actor), credited);
    entry.playerParticipation = true;
  }
}
