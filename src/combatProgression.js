import { recordAbilityDamage, recordEnemyAbilityStatistics } from './abilityMasterySystem.js';
import { onTechniqueDamage, notifyTechniqueDeath } from './combatExpansion.js';
import { ITEMS, getAbilityById } from './data.js';
import { addFloatingText } from './floatingText.js';
import { gainXp, getWeaponSkill } from './player.js';
import { addCombatXP, syncLegacySkills, COMBAT_SKILL_IDS } from './skills.js';
import { SURVIVAL_ATTRIBUTES, affinityMultiplier, abilityProgressionCategories } from './progressionProfiles.js';
import { ensureContribution, recordSupportContribution } from './encounterLedger.js';
import { safeXP } from './progressionMath.js';
import {restorePetalStormHealth} from './petalStormSustain.js';

export const XP_ALLOCATION = Object.freeze({ survival:.30, weapon:.25, hotbar:.35, participation:.10 });
function normalizeSkill(id, options = {}) {
  if (options.source === 'weapon' && options.weaponType === 'scythe') return 'scythe';
  if (COMBAT_SKILL_IDS.includes(id)) return id;
  return ITEMS[id]?.primarySkill || ITEMS[id]?.skill || null;
}
export function recordEnemyCombatContribution(enemy, actor, skillId, damage = 0, options = {}) {
  if (!enemy || !actor || enemy.combatSkillXpAwarded || !(damage > 0)) return;
  const amount = Math.max(0, Number(damage)), id = normalizeSkill(skillId || getWeaponSkill(actor), options);
  const entry = ensureContribution(enemy, actor), abilityId = options.sourceAbilityId || null;
  entry.hits++; entry.damage += amount;
  if (id) entry.skills[id] = (entry.skills[id] || 0) + amount;
  if (options.source === 'weapon' || !abilityId && options.source !== 'summon') {
    if (id) entry.weapons[id] = (entry.weapons[id] || 0) + amount;
  }
  if (abilityId) {
    entry.abilities[abilityId] = (entry.abilities[abilityId] || 0) + amount;
    recordAbilityDamage(actor, abilityId, amount);
  }
  if (options.source !== 'summon' || (enemy.combatTargetKind === 'player' &&
    [actor.id,actor.profileId,actor.slot,actor.playerNumber,actor.name].filter(v=>v!=null).some(v=>String(v)===String(enemy.combatTargetId)))) entry.playerParticipation = true;
  entry.lastAbilityId = abilityId;
  entry.lastSkillId = id;
  entry.lastWeaponType = options.weaponType || null;
  entry.lastHitAt = performance.now() / 1000;
  restorePetalStormHealth(actor,amount,enemy,entry.lastHitAt);
  enemy.lastDamagedByActorId = entry.actorId;
  enemy.lastDamagedByActorAt = entry.lastHitAt;
  onTechniqueDamage(actor, enemy, id, abilityId, amount, entry.lastHitAt);
}
function distribute(weights, ids, amount) {
  const unique = [...new Set(ids)].filter(id => COMBAT_SKILL_IDS.includes(id));
  if (!unique.length || !(amount > 0)) return;
  for (const id of unique) weights[id] = (weights[id] || 0) + amount / unique.length;
}
function weighted(weights, entries, amount) {
  const valid = Object.entries(entries).filter(([id, value]) => COMBAT_SKILL_IDS.includes(id) && value > 0);
  const total = valid.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return false;
  for (const [id, value] of valid) weights[id] = (weights[id] || 0) + amount * value / total;
  return true;
}
export function allocateEncounterXP(actor, contribution, budget) {
  budget = safeXP(budget);
  const weights = {};
  distribute(weights, SURVIVAL_ATTRIBUTES, XP_ALLOCATION.survival);
  if (!weighted(weights, contribution.weapons || {}, XP_ALLOCATION.weapon)) distribute(weights, SURVIVAL_ATTRIBUTES, XP_ALLOCATION.weapon);
  const hotbar = contribution.hotbar || [];
  const active = hotbar.map(a => ({ ...a, weight: (contribution.abilities?.[a.id] || 0) +
    Object.entries(contribution.support || {}).filter(([key]) => key.startsWith(a.id + ':')).reduce((sum, [, v]) => sum + v, 0) +
    (a.summon ? Math.max(1, contribution.damage * .12) : 0) }));
  const total = active.reduce((sum, a) => sum + a.weight, 0);
  if (total) for (const a of active) distribute(weights, a.categories, XP_ALLOCATION.hotbar * a.weight / total);
  else distribute(weights, SURVIVAL_ATTRIBUTES, XP_ALLOCATION.hotbar);
  const participation = {};
  for (const [id, amount] of Object.entries(contribution.abilities || {})) distribute(participation, abilityProgressionCategories(getAbilityById(id)), amount);
  for (const [key, amount] of Object.entries(contribution.support || {})) distribute(participation, abilityProgressionCategories(getAbilityById(key.split(':')[0])), amount);
  if (!weighted(weights, participation, XP_ALLOCATION.participation)) distribute(weights, SURVIVAL_ATTRIBUTES, XP_ALLOCATION.participation);
  return Object.entries(weights).map(([skillId, weight]) => ({ skillId, base:budget * weight, amount:budget * weight * affinityMultiplier(actor, skillId) }));
}
export function grantSharedCombatKillXp(finalActor, enemy, baseXp, log) {
  if (!enemy || enemy.combatSkillXpAwarded) return;
  if (enemy.trainingDummy || enemy.friendly) {enemy.combatSkillXpAwarded=true;return;}
  // A death-triggered pact becomes useful when its marked target dies, including a teammate's kill.
  const deathTime=performance.now()/1000;
  for(const mark of enemy.techniqueMarks||[])if(['echo','bloom'].includes(mark.kind)&&mark.owner&&mark.until>=deathTime&&mark.owner.loadout?.abilitySlots?.includes(mark.abilityId)) {
    recordSupportContribution(mark.owner,[enemy],mark.abilityId,Math.max(1,Number(enemy.maxHp||30)*.05),'deathTrigger');
  }
  enemy.combatSkillXpAwarded = true;
  const contributors = Object.values(enemy.combatContributors || {}).filter(c => c.actor && (c.damage > 0 || Object.values(c.support || {}).some(v => v > 0)));
  const qualifying = contributors.filter(c => c.playerParticipation && Math.hypot((c.actor.x || 0) - (enemy.x || 0), (c.actor.y || 0) - (enemy.y || 0)) <= 1000);
  const credited = contributors.find(c => c.actorId === enemy.lastDamagedByActorId)?.actor || finalActor;
  const reward = safeXP(enemy.baseCombatXp ?? baseXp ?? enemy.xp ?? 0);
  if (!reward) return;
  recordEnemyAbilityStatistics(enemy, qualifying, performance.now()/1000);
  notifyTechniqueDeath(enemy, contributors, performance.now()/1000);
  for (const contribution of qualifying) {
    const actor = contribution.actor, budget = reward * (actor === credited ? 1 : .5);
    const combat = addCombatXP(actor, budget, {log});
    const awards = allocateEncounterXP(actor, contribution, budget);
    // These proficiency shares distribute the victory XP already awarded above.
    // They must not award the same mastery XP a second time.
    for (const award of awards) gainXp(actor, award.skillId, award.amount, log, { skipClassXpMultiplier:true, skipHotbarMastery:true });
    syncLegacySkills(actor);
    actor.lastCombatReward = { combatXP:budget, allocationBudget:budget, awards, enemyName:enemy.name || enemy.kind || 'Enemy' };
    if (combat.leveledUp) log?.(`Level increased to ${combat.newLevel}.`);
    addFloatingText(actor, `+${budget} Combat XP`, { preset:'status', color:'#e7cd91', ttl:.9, size:12, offsetY:-68 });
  }
}
