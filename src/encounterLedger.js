import { getAbilityById } from './data.js';
import { abilityProgressionCategories } from './progressionProfiles.js';
import {resolveSubclassAbility} from './subclassVariants.js';

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
    // Lock the encounter specialization at first contribution, not at death.
    hotbar: [...new Set((actor.loadout?.abilitySlots || []).filter(Boolean))].map(id=>resolveSubclassAbility(actor,getAbilityById(id))).filter(Boolean).map(a =>
      ({ id: a.id, summon: !!a.summonType || (a.subclassId?a.subclassMode==='spirits':/DeathEcho|Corpsebloom/.test(a.id)), categories: abilityProgressionCategories(a) })),
    playerParticipation: false
  };
  return entry;
}
export function recordSupportContribution(actor, enemies, abilityId, effectiveAmount, purpose = 'support') {
  if (!(effectiveAmount > 0) || !actor || !getAbilityById(abilityId)) return;
  for (const enemy of enemies) {
    if (enemy.trainingDummy || enemy.friendly || enemy.combatSkillXpAwarded) continue;
    const entry = ensureContribution(enemy, actor);
    // Normalize useful support to encounter pressure, rather than action count.
    const cap = Math.max(1, Number(enemy.maxHp || 30)) * .5;
    const key = `${abilityId}:${purpose}`;
    entry.support[key] = Math.min(cap, (entry.support[key] || 0) + effectiveAmount / Math.max(1, enemies.length));
    entry.playerParticipation = true;
  }
}
