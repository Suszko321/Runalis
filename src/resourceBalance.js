// Shared resource balance constants and helpers.

export const BASE_SPIRIT_RECOVERY_PER_SECOND = 4;
export const SPIRIT_RECOVERY_MULTIPLIER = 0.25;

export function getPassiveSpiritRecoveryPerSecond() {
  return BASE_SPIRIT_RECOVERY_PER_SECOND * SPIRIT_RECOVERY_MULTIPLIER;
}

export function recoverPassiveSpirit(player, dt) {
  if (!player) return 0;

  if (!player.spiritAwakened) {
    player.spirit = 0;
    return 0;
  }

  const maxSpirit = Math.max(0, Number(player.maxSpirit || 0));
  const before = Math.min(maxSpirit, Math.max(0, Number(player.spirit || 0)));
  const recovery = getPassiveSpiritRecoveryPerSecond() * Math.max(0, Number(dt || 0));
  player.spirit = Math.min(maxSpirit, before + recovery);

  return player.spirit - before;
}
