export const ACT1_OVERWORLD_DISPLAY_NAME = 'Echoryn Forest';
export const ACT1_OVERWORLD_TITLE = 'The Echoryn Forest';

const LEGACY_ACT1_WORLD_NAMES = new Set([
  'sol land',
  'the sol land',
  'solland',
  'sol_land'
]);

export function isLegacyAct1WorldName(value) {
  return LEGACY_ACT1_WORLD_NAMES.has(normalizeNameKey(value));
}

export function normalizePlayerFacingWorldName(value, fallback = ACT1_OVERWORLD_DISPLAY_NAME) {
  const text = String(value || '').trim().replace(/Red Seal/g,'Last Dawn');

  if (!text) return fallback;
  if (isLegacyAct1WorldName(text)) return fallback;

  return text;
}

export function getDefaultWorldName(worldMode = 'overworld') {
  return worldMode === 'dungeon' ? 'Dungeon' : ACT1_OVERWORLD_DISPLAY_NAME;
}

function normalizeNameKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
