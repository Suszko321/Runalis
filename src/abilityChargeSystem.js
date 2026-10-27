import {resolveSubclassAbility} from './subclassVariants.js';
import {applyCombatTempo,mobilityUseCharges} from './combatTempo.js';
import {getBalancedAbility} from './abilityCombatProfiles.js';
// Independent ability-use charges.
//
// Hold-to-charge attacks remain owned by chargeSystem.js. This module only
// tracks how many times a cooldown ability may be used before it must recover.

import { getAbilityById, normalizeAbilityId } from './data.js';
import { getSkillTreeBonuses } from './skillTreeSystem.js';

const MAX_ABILITY_USE_CHARGES = 3;
const MAX_RECHARGE_REDUCTION_PCT = 60;

export function getAbilityUseChargeProfile(player, abilityOrId) {
  const ability = applyCombatTempo(resolveSubclassAbility(player,getBalancedAbility(resolveAbility(abilityOrId))));
  const mobilityCharges = mobilityUseCharges(ability);
  const cooldown = Math.max(0, Number(ability?.cd || 0));
  const summonEligible = !ability?.summonType || ability?.allowUseCharges === true;
  const eligible = !!ability &&
    !ability.channelProfile &&
    cooldown > 0 &&
    summonEligible &&
    (mobilityCharges > 0 || (ability.noUseCharges !== true &&
    ability.noChargeUpgrade !== true &&
    ability.isChargeUpgradeEligible !== false));

  if (!eligible) {
    return {
      ability,
      eligible: false,
      maxCharges: 1,
      rechargeTime: cooldown,
      rechargeReductionPct: 0,
      startsFullCharges: true
    };
  }

  const bonuses = getSkillTreeBonuses(player);
  const extraCharges = Math.max(0, Math.floor(Number(bonuses[`abilityCharge_${ability.id}`] || 0)));
  const baseMaxCharges = Math.max(mobilityCharges, 1, Math.floor(Number(ability.maxCharges || 1)));
  const chargeCap = Math.max(1, Math.min(
    MAX_ABILITY_USE_CHARGES,
    Math.max(mobilityCharges,Math.floor(Number(ability.maxChargeCap || ability.useChargeCap || MAX_ABILITY_USE_CHARGES)))
  ));
  const maxCharges = Math.max(1, Math.min(chargeCap, baseMaxCharges + extraCharges));
  const rechargeReductionPct = Math.max(0, Math.min(
    MAX_RECHARGE_REDUCTION_PCT,
    Number(bonuses[`abilityRechargePct_${ability.id}`] || 0)
  ));

  return {
    ability,
    eligible: true,
    maxCharges,
    rechargeTime: Math.max(0.1, Number(ability.rechargeTime || cooldown) * (1 - rechargeReductionPct / 100)),
    rechargeReductionPct,
    startsFullCharges: ability.startsFullCharges !== false
  };
}

export function getAbilityUseChargeState(player, abilityOrId, now = performance.now() / 1000) {
  const profile = getAbilityUseChargeProfile(player, abilityOrId);

  if (!player || !profile.ability || profile.maxCharges <= 1) {
    return {
      ...profile,
      charges: 1,
      recharging: false,
      remaining: 0,
      rechargeProgress: 1
    };
  }

  normalizeAbilityUseCharges(player);
  const abilityId = profile.ability.id;
  const entry = player.abilityUseCharges[abilityId] || createChargeEntry(player, profile, now);
  entry.rechargeQueue = entry.rechargeQueue
    .filter(readyAt => Number.isFinite(readyAt) && readyAt > now)
    .sort((a, b) => a - b)
    .slice(0, profile.maxCharges);
  player.abilityUseCharges[abilityId] = entry;

  const nextReadyAt = entry.rechargeQueue[0] || 0;
  const remaining = nextReadyAt ? Math.max(0, nextReadyAt - now) : 0;

  return {
    ...profile,
    charges: Math.max(0, profile.maxCharges - entry.rechargeQueue.length),
    recharging: entry.rechargeQueue.length > 0,
    remaining,
    rechargeProgress: nextReadyAt
      ? Math.max(0, Math.min(1, 1 - remaining / profile.rechargeTime))
      : 1
  };
}

export function spendAbilityUseCharge(player, abilityOrId, now = performance.now() / 1000) {
  const state = getAbilityUseChargeState(player, abilityOrId, now);
  if (!player || !state.ability || state.maxCharges <= 1 || state.charges <= 0) return false;

  const entry = player.abilityUseCharges[state.ability.id];
  entry.rechargeQueue.push(now + state.rechargeTime);
  entry.rechargeQueue.sort((a, b) => a - b);
  return true;
}

export function normalizeAbilityUseCharges(player) {
  if (!player) return {};

  const source = player.abilityUseCharges && typeof player.abilityUseCharges === 'object'
    ? player.abilityUseCharges
    : {};
  const normalized = {};

  for (const [abilityId, entry] of Object.entries(source)) {
    const normalizedAbilityId = normalizeAbilityId(abilityId);
    if (!getAbilityById(normalizedAbilityId) || !entry || typeof entry !== 'object') continue;
    const rechargeQueue = Array.isArray(entry.rechargeQueue)
      ? entry.rechargeQueue
        .map(Number)
        .filter(value => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b)
        .slice(0, MAX_ABILITY_USE_CHARGES)
      : [];
    normalized[normalizedAbilityId] = { rechargeQueue };
  }

  player.abilityUseCharges = normalized;
  return normalized;
}

function createChargeEntry(player, profile, now) {
  const entry = { rechargeQueue: [] };

  if (!profile.startsFullCharges) {
    for (let index = 0; index < profile.maxCharges; index++) {
      entry.rechargeQueue.push(now + profile.rechargeTime * (index + 1));
    }
    return entry;
  }

  const savedLastUse = Math.max(0, Number(player?.cooldowns?.[profile.ability.id] || 0));
  const legacyLastUse = savedLastUse > now ? 0 : savedLastUse;
  const legacyReadyAt = legacyLastUse + profile.rechargeTime;

  // When a character learns an extra-charge node while the ability is cooling
  // down, preserve that one recovering use and grant the newly unlocked use.
  if (legacyLastUse > 0 && legacyReadyAt > now) {
    entry.rechargeQueue.push(legacyReadyAt);
  }

  return entry;
}

function resolveAbility(abilityOrId) {
  if (!abilityOrId) return null;
  if (typeof abilityOrId === 'string') return getAbilityById(abilityOrId);
  return abilityOrId.id ? abilityOrId : null;
}
