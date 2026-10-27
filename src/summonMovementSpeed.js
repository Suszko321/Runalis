// Shared travel floor for persistent companions and short-lived summoned spirits.
// Keep authored faster speeds, but always outrun the owner's current movement.
export const SUMMON_SPEED_MARGIN = 1.2;
export const PLAYER_BASE_MOVEMENT_SPEED = 205;
export function resolveSummonMovementSpeed(authoredSpeed, ownerMultiplier = 1, ownerDashSpeed = 0) {
  const finite = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const ownerSpeed = Math.max(PLAYER_BASE_MOVEMENT_SPEED,
    PLAYER_BASE_MOVEMENT_SPEED * finite(ownerMultiplier), finite(ownerDashSpeed));
  return Math.max(finite(authoredSpeed), ownerSpeed * SUMMON_SPEED_MARGIN);
}
