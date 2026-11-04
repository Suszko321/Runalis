import {playerPartyXpRate} from './adventurerPartyXp.js';
import {rememberAdventurer} from './adventurerMind.js';
import {trainingPriority, weaponTraining, wornTraining, abilityTraining} from './trainingProfiles.js';
import { recordAbilityDamage, recordEnemyAbilityStatistics, grantAbilityMasteryXp } from './abilityMasterySystem.js';
import { onTechniqueDamage, notifyTechniqueDeath } from './combatExpansion.js';
import { ITEMS, getAbilityById } from './data.js';
import { addFloatingText } from './floatingText.js';
import { gainXp, getWeaponSkill } from './player.js';
import { addCombatXP, syncLegacySkills, COMBAT_SKILL_IDS } from './skills.js';
import { affinityMultiplier } from './progressionProfiles.js';
import {resolveSubclassAbility} from './subclassVariants.js';
import { ensureContribution, recordSupportContribution, addTrainingEvidence } from './encounterLedger.js';
import { safeXP } from './progressionMath.js';
import {restorePetalStormHealth} from './petalStormSustain.js';

export const XP_ALLOCATION = Object.freeze({ offence:.40, armour:.25, actions:.20, priority:.15 });
function normalizeSkill(id, options = {}) {
  if (options.source === 'weapon' && options.weaponType === 'scythe') return 'scythe';
  if (COMBAT_SKILL_IDS.includes(id)) return id;
  return ITEMS[id]?.primarySkill || ITEMS[id]?.skill || null;
}
export function recordEnemyCombatContribution(enemy, actor, skillId, damage = 0, options = {}) {
  if (!enemy || !actor || enemy.combatSkillXpAwarded || !Number.isFinite(damage) || !(damage > 0)) return;
  const amount = Math.max(0, Number(damage)), id = normalizeSkill(skillId || getWeaponSkill(actor), options);
  const entry = ensureContribution(enemy, actor), abilityId = options.sourceAbilityId || null;
  entry.hits++; entry.damage += amount;
  const ability = abilityId && getAbilityById(abilityId);
  const committed = entry.hotbar.find(a => a.id === abilityId);
  if (options.source !== 'summon' || committed) {
    const profile = ability ? committed?.training || abilityTraining(resolveSubclassAbility(actor,ability)) : weaponTraining(id || 'blade', options.weaponType);
    addTrainingEvidence(entry.offenceTraining, profile, amount);
    addTrainingEvidence(entry.armourTraining, wornTraining(actor), amount);
  }
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
function weighted(weights, entries, amount) {
  const valid = Object.entries(entries).filter(([id, value]) => COMBAT_SKILL_IDS.includes(id) && value > 0);
  const total = valid.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return false;
  for (const [id, value] of valid) weights[id] = (weights[id] || 0) + amount * value / total;
  return true;
}
export function allocateEncounterXP(actor, contribution, budget) {
  budget = safeXP(budget);
  const groups = {};
  const priority = trainingPriority(actor);
  let directed = XP_ALLOCATION.priority;
  const offence = contribution.offenceTraining || {};
  const weapons = contribution.weapons || {};
  const oldOffence = {};
  for (const [skill, damage] of Object.entries(weapons)) {
    addTrainingEvidence(oldOffence, weaponTraining(skill), damage);
  }
  const hotbar = {};
  for (const ability of contribution.hotbar || []) addTrainingEvidence(hotbar, ability.training, 1);
  const assignedShare = Object.keys(hotbar).length ? .02 : 0;
  for (const [name, evidence, share] of [
    ['Offence', Object.keys(offence).length ? offence : oldOffence, XP_ALLOCATION.offence - assignedShare],
    ['Hotbar', hotbar, assignedShare],
    ['Armour', contribution.armourTraining || wornTraining(actor), XP_ALLOCATION.armour],
    ['Actions', contribution.actionTraining || {}, XP_ALLOCATION.actions]
  ]) {
    groups[name] = {};
    if (!weighted(groups[name], evidence, share)) directed += share;
  }
  groups.Priority = {[priority]:directed};
  const bySkill = {};
  for (const [source, weights] of Object.entries(groups)) {
    for (const [skill, weight] of Object.entries(weights)) (bySkill[skill] ||= {})[source] = weight;
  }
  const affinities = Object.entries(bySkill).map(([skillId, sources]) => {
    const weight = Object.values(sources).reduce((sum,value)=>sum+value,0);
    return {skillId, weight, adjusted:weight * affinityMultiplier(actor,skillId), sources:Object.keys(sources)};
  });
  const total = affinities.reduce((sum, item) => sum + item.adjusted, 0);
  return affinities.map(({skillId, weight, adjusted, sources}) =>
    ({skillId, base:budget * weight, amount:budget * adjusted / total, sources}));
}

export function allocateEncounterMastery(contribution, budget) {
  const evidence = {...contribution.abilities};
  for (const [key, amount] of Object.entries(contribution.support || {})) {
    const id = key.split(':')[0];
    evidence[id] = (evidence[id] || 0) + amount;
  }
  const eligible = Object.entries(evidence).filter(([id, amount]) =>
    amount > 0 && getAbilityById(id) && (!getAbilityById(id).summonType || contribution.hotbar?.some(a => a.id === id)));
  const total = eligible.reduce((sum, [, amount]) => sum + amount, 0);
  const xp = safeXP(budget);
  const assigned = new Set((contribution.hotbar || []).map(ability => ability.id));
  const awards = new Map();
  for (const id of assigned) awards.set(id, xp * .02 / assigned.size);
  for (const [id, amount] of eligible) {
    awards.set(id, (awards.get(id) || 0) + xp * .18 * amount / total);
  }
  return [...awards].map(([id, amount]) => ({id, amount}));
}

export function resolveEnemyKillActor(enemy, fallback) {
  return Object.values(enemy?.combatContributors || {}).find(c => c.actorId === enemy.lastDamagedByActorId)?.actor || fallback;
}
export function grantSharedCombatKillXp(finalActor, enemy, baseXp, log) {
  if (!enemy || enemy.combatSkillXpAwarded) return;
  if (enemy.trainingDummy || enemy.friendly || enemy.rewardSuppressed || enemy.summonedByBoss || enemy.summonedBy) {enemy.combatSkillXpAwarded=true;return;}
  // A death-triggered pact becomes useful when its marked target dies, including a teammate's kill.
  const deathTime=performance.now()/1000;
  for(const mark of enemy.techniqueMarks||[])if(['echo','bloom'].includes(mark.kind)&&mark.owner&&mark.until>=deathTime&&mark.owner.loadout?.abilitySlots?.includes(mark.abilityId)) {
    recordSupportContribution(mark.owner,[enemy],mark.abilityId,Math.max(1,Number(enemy.maxHp||30)*.05),'deathTrigger');
  }
  enemy.combatSkillXpAwarded = true;
  const contributors = Object.values(enemy.combatContributors || {}).filter(c => c.actor && (c.damage > 0 || Object.values(c.support || {}).some(v => v > 0) || Object.keys(c.actionTraining || {}).length > 0));
  const qualifying = contributors.filter(c => !c.actor.livingAdventurer && c.playerParticipation && Math.hypot((c.actor.x || 0) - (enemy.x || 0), (c.actor.y || 0) - (enemy.y || 0)) <= 1000);
  const credited = resolveEnemyKillActor(enemy, finalActor);
  const reward = safeXP(enemy.baseCombatXp ?? baseXp ?? enemy.xp ?? 0);
  if (!reward) return;
  recordEnemyAbilityStatistics(enemy, qualifying, performance.now()/1000);
  notifyTechniqueDeath(enemy, contributors, performance.now()/1000);
  // The companion receives a full enemy award only on their final hit.
  const recipients=credited?.livingAdventurer?[...qualifying,{actor:credited}]:qualifying;
  for (const contribution of recipients) {
    const actor = contribution.actor, budget = reward * (actor === credited ? 1 : .5);
    const combat = addCombatXP(actor, budget, {log});
    if(actor.livingAdventurer){
      if(enemy.isBoss||combat.leveledUp)rememberAdventurer(actor.adventurerMind,'event',
        'Helped defeat '+(enemy.name||enemy.kind||'an enemy')+(combat.leveledUp?' and reached level '+combat.newLevel:'')+'.');
      const armour=wornTraining(actor);
      const weight=['lightArmour','mediumArmour','heavyArmour'].sort((a,b)=>(armour[b]||0)-(armour[a]||0))[0];
      if(armour[weight])gainXp(actor,weight,budget*.5,undefined,{skipClassXpMultiplier:true});
      gainXp(actor,getWeaponSkill(actor),budget*.5,undefined,{skipClassXpMultiplier:true});
      syncLegacySkills(actor);
      continue;
    }
    const awards = allocateEncounterXP(actor, contribution, budget);
    // These proficiency shares distribute the victory XP already awarded above.
    // They must not award the same mastery XP a second time.
    for (const award of awards) gainXp(actor, award.skillId, award.amount, log, { skipClassXpMultiplier:true, allocated:true });
    for (const mastery of allocateEncounterMastery(contribution,budget)) grantAbilityMasteryXp(actor,mastery.id,mastery.amount,performance.now()/1000,log,{allocated:true});
    syncLegacySkills(actor);
    const rate=playerPartyXpRate(actor);
    actor.lastCombatReward = { combatXP:combat.xpAdded, allocationBudget:budget*rate, awards:awards.map(award=>({...award,amount:award.amount*rate})), enemyName:enemy.name || enemy.kind || 'Enemy' };
    if (combat.leveledUp) log?.(`Level increased to ${combat.newLevel}.`);
    addFloatingText(actor, `+${Math.round(combat.xpAdded*10)/10} Combat XP`, { preset:'status', color:'#e7cd91', ttl:.9, size:12, offsetY:-68 });
  }
}
