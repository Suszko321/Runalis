// Numeric keys and letter aliases enter the same press/hold/release pipeline.
// Optional per-character rebinding uses inputBindings.abilityKeys.
export const DEFAULT_ABILITY_KEYS = Object.freeze(['q', 'r', 'x', '4', 'f']);
export const ABILITY_GAMEPAD_LABELS = Object.freeze(['RT', 'Y', 'X', 'LB', 'LT']);
function abilityKeys(player) {
  const bindings=player?.inputBindings?.abilityKeys;
  return Array.isArray(bindings)?DEFAULT_ABILITY_KEYS.map((fallback,i)=>typeof bindings[i]==='string'&&bindings[i].trim()?bindings[i].trim().toLowerCase():fallback):DEFAULT_ABILITY_KEYS;
}
export function getKeyboardAbilitySlot(key, player = null) {
  const value = String(key || '').toLowerCase();
  const bindings = abilityKeys(player);
  const rebound = bindings.findIndex(binding => String(binding).toLowerCase() === value);
  if (rebound >= 0 && rebound < DEFAULT_ABILITY_KEYS.length) return rebound;
  return /^[1-5]$/.test(value) ? Number(value) - 1 : -1;
}
export function getAbilityBindingLabel(player, slot) {
  return `${String(abilityKeys(player)[slot] || slot + 1).toUpperCase()} / ${ABILITY_GAMEPAD_LABELS[slot]}`;
}
