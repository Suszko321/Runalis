import { attributeHandling } from './combatPower.js';
import {attackChargeTimeMultiplier} from './combatTempo.js';
// Reusable hold-to-charge runtime for active abilities.
// Ability definitions opt in with canCharge and multiplier arrays.

const DEFAULT_LEVELS = [0, 0.42, 0.78];

export function canChargeAbility(ability) {
  return !!(ability?.canCharge && Number(ability.maxChargeTime || 0) > 0);
}

export function beginAbilityCharge(player, slotIndex, ability, now = performance.now() / 1000) {
  if (!player || !ability || !canChargeAbility(ability)) return false;

  player.abilityCharge = {
    active: true,
    slotIndex,
    abilityId: ability.id,
    abilityName: ability.name,
    subclassId: ability.subclassId,
    animationFamily: ability.subclassId?ability.animationFamily:undefined,
    startedAt: now,
    elapsed: 0,
    progress: 0,
    level: 0,
    maxChargeTime: getAbilityChargeTime(player,ability),
    chargeLevels: normalizeLevels(ability.chargeLevels)
  };

  return true;
}

export function getAbilityChargeTime(player,ability) {
  return Math.max(0.2,Number(ability?.maxChargeTime||.9)*.72*(1-.12*attributeHandling(player,'focus'))*attackChargeTimeMultiplier(ability));
}

export function updateAbilityCharge(player, dt) {
  const state = player?.abilityCharge;
  if (!state?.active) return null;

  state.elapsed = Math.min(state.maxChargeTime, Math.max(0, state.elapsed + Math.max(0, dt || 0)));
  state.progress = clamp01(state.elapsed / state.maxChargeTime);
  state.level = getChargeLevel(state.progress, state.chargeLevels);
  return state;
}

export function releaseAbilityCharge(player) {
  const state = player?.abilityCharge;
  if (!state?.active) return null;

  const released = {
    ...state,
    active: false,
    progress: clamp01(state.progress),
    level: Math.max(0, Number(state.level || 0))
  };

  player.abilityCharge = null;
  return released;
}

export function cancelAbilityCharge(player) {
  if (!player) return;
  player.abilityCharge = null;
}

export function applyAbilityCharge(ability, charge) {
  if (!ability || !charge || !canChargeAbility(ability)) return ability;

  const level = Math.max(0, Number(charge.level || 0));
  const damageMultiplier = valueForLevel(ability.damageMultiplierByCharge, level, 1);
  const radiusMultiplier = valueForLevel(ability.radiusMultiplierByCharge, level, 1);
  const durationMultiplier = valueForLevel(ability.durationMultiplierByCharge, level, 1);
  const staggerMultiplier = valueForLevel(ability.staggerMultiplierByCharge, level, 1);
  const costMultiplier = valueForLevel(ability.chargeCostMultiplier, level, 1);
  const baseCost = Number(ability.baseCost ?? ability.cost ?? 0);

  return {
    ...ability,
    cost: Math.max(0, Math.ceil(baseCost * costMultiplier)),
    damageMultiplier: Number(ability.damageMultiplier || 1) * damageMultiplier,
    range: Number(ability.range || 0) * radiusMultiplier,
    maxHits: Math.max(ability.maxHits || 0, Math.ceil(Number(ability.maxHits || 0) * radiusMultiplier)),
    _charge: {
      ...charge,
      damageMultiplier,
      radiusMultiplier,
      durationMultiplier,
      staggerMultiplier,
      costMultiplier,
      releaseBehavior: ability.releaseBehavior || 'cast'
    }
  };
}

export function getChargeDurationMultiplier(ability) {
  return Math.max(1, Number(ability?._charge?.durationMultiplier || 1));
}

export function getChargeStaggerMultiplier(ability) {
  return Math.max(1, Number(ability?._charge?.staggerMultiplier || 1));
}

function normalizeLevels(levels) {
  const source = Array.isArray(levels) && levels.length ? levels : DEFAULT_LEVELS;
  return source
    .map(value => clamp01(Number(value || 0)))
    .sort((a, b) => a - b);
}

function getChargeLevel(progress, levels) {
  let level = 0;

  for (let index = 0; index < levels.length; index++) {
    if (progress >= levels[index]) level = index;
  }

  return level;
}

function valueForLevel(values, level, fallback) {
  if (Array.isArray(values) && values.length) {
    return Number(values[Math.min(level, values.length - 1)] ?? fallback);
  }

  if (values && typeof values === 'object') {
    return Number(values[level] ?? values[String(level)] ?? fallback);
  }

  return fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}
