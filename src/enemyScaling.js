import { ensureEnemyProgression } from './enemyProgression.js';
// enemyScaling.js
// Centralized enemy difficulty tuning so broad balance passes do not require
// hand-editing every overworld, dungeon, boss, and generated enemy definition.
//
// Intended balance order:
// 1. Base enemy stats.
// 2. Global enemy health/damage multipliers below.
// 3. Area, dungeon, route, and floor-depth scaling.
// 4. Elite, miniboss, boss, and phase modifiers.
// 5. Any temporary difficulty or encounter modifiers.
//
// In practice some builders pass already area/floor-scaled stats into this
// helper. The modifiers are multiplicative, so the final balance remains the
// same aside from normal integer rounding.

import { ensureHumanoidEnemyEquipment } from './humanoidEnemies.js';

export const GLOBAL_ENEMY_HEALTH_MULTIPLIER = 1.25;
export const GLOBAL_ENEMY_DAMAGE_MULTIPLIER = 1.25;

export const GLOBAL_ENEMY_STRENGTH_MULTIPLIER = GLOBAL_ENEMY_HEALTH_MULTIPLIER;
export const GLOBAL_ENEMY_BALANCE_VERSION = 'global-health-damage-1.25';
const LEGACY_ENEMY_STRENGTH_MULTIPLIER = 1.2;

export function applyEnemyStrengthScaling(
  enemy,
  multiplier = GLOBAL_ENEMY_STRENGTH_MULTIPLIER,
  damageMultiplier = GLOBAL_ENEMY_DAMAGE_MULTIPLIER
) {
  ensureHumanoidEnemyEquipment(enemy);
  ensureEnemyProgression(enemy);
  if (!enemy || enemy.runalisEnemyBalanceVersion === GLOBAL_ENEMY_BALANCE_VERSION) return enemy;

  const legacyUpgradeScale = enemy.runalisStrengthScaled && !enemy.runalisEnemyBalanceVersion
    ? LEGACY_ENEMY_STRENGTH_MULTIPLIER
    : 1;
  const healthScale = Math.max(0.1, Number(multiplier || 1)) / legacyUpgradeScale;
  const damageScale = Math.max(0.1, Number(damageMultiplier || 1)) / legacyUpgradeScale;
  const maxHp = scaleEnemyNumber(enemy.maxHp || enemy.hp || 1, healthScale);
  const previousMax = Math.max(1, Number(enemy.maxHp || enemy.hp || 1));
  const currentHp = Number(enemy.hp ?? previousMax);
  const hpRatio = Math.max(0, Math.min(1, currentHp / previousMax));
  const damage = scaleEnemyNumber(enemy.damage || enemy.dmg || 1, damageScale);

  enemy.maxHp = maxHp;
  enemy.hp = currentHp <= 0 ? 0 : Math.max(1, Math.ceil(maxHp * hpRatio));
  enemy.damage = damage;
  enemy.dmg = damage;
  enemy.runalisStrengthScaled = true;
  enemy.runalisEnemyBalanceVersion = GLOBAL_ENEMY_BALANCE_VERSION;

  return enemy;
}

export function applyGlobalEnemyDamageMultiplier(damage, multiplier = GLOBAL_ENEMY_DAMAGE_MULTIPLIER) {
  return scaleEnemyNumber(damage || 1, Math.max(0.1, Number(multiplier || 1)));
}

function scaleEnemyNumber(value, multiplier) {
  return Math.max(1, Math.ceil(Number(value || 1) * Number(multiplier || 1) - 1e-9));
}
