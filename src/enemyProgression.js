import { safeLevel, safeXP } from './progressionMath.js';
export function enemyCombatLevel(enemy) {
  return safeLevel(enemy?.combatLevel || enemy?.level || Math.max(1, Number(enemy?.tier || 1) * 5 - 4));
}
export function enemyXPForLevel(level, difficulty = 1) {
  return safeXP(Math.round(50 * Math.pow(1 + (safeLevel(level) - 1) / 5, 1.35) * difficulty));
}
export function ensureEnemyProgression(enemy) {
  if (!enemy) return enemy;
  if(!(enemy.combatLevel>0||enemy.level>0||enemy.tier>0||enemy.dungeonTier>0))enemy.progressionFallback=true;
  enemy.combatLevel = enemyCombatLevel(enemy);
  if(enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss){enemy.baseCombatXp=enemy.xp=0;return enemy;}
  if (!Number.isFinite(enemy.baseCombatXp) || enemy.baseCombatXp <= 0) {
    const difficulty = enemy.isBoss || enemy.worldBoss || enemy.bossId ? 2.5 : enemy.elite || enemy.eliteModifier || enemy.modifier ? 1.4 : 1;
    enemy.baseCombatXp = Math.max(safeXP(enemy.xp), enemyXPForLevel(enemy.combatLevel, difficulty));
    enemy.xp = enemy.baseCombatXp;
  }
  return enemy;
}
