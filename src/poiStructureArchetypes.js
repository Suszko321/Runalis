// poiStructureArchetypes.js
// Data-driven exterior structure selection for overworld POIs.
//
// Selection priority:
// 1. Named/unique override
// 2. Explicit structureArchetype / poiArchetype / tags
// 3. Name and identity keyword inference
// 4. Theme, region, and object-kind fallback
// 5. Generic stone entrance

export const POI_STRUCTURE_ARCHETYPES = Object.freeze({
  castle: { id: 'castle', labelOffset: 98, scale: 1.08 },
  fort: { id: 'fort', labelOffset: 78, scale: 1.02 },
  hollow: { id: 'hollow', labelOffset: 72, scale: 1.04 },
  cave: { id: 'cave', labelOffset: 62, scale: 1 },
  mine: { id: 'mine', labelOffset: 68, scale: 1.02 },
  crypt: { id: 'crypt', labelOffset: 74, scale: 1.02 },
  shrine: { id: 'shrine', labelOffset: 68, scale: 1 },
  ruin: { id: 'ruin', labelOffset: 72, scale: 1.02 },
  tower: { id: 'tower', labelOffset: 94, scale: 1.05 },
  cult: { id: 'cult', labelOffset: 78, scale: 1.05 },
  camp: { id: 'camp', labelOffset: 58, scale: 0.96 },
  generic: { id: 'generic', labelOffset: 62, scale: 1 }
});

export const POI_STRUCTURE_VARIANTS = Object.freeze({
  rural: {
    ground: '#514333',
    groundEdge: '#2d2924',
    dark: '#17181b',
    mid: '#4d5054',
    light: '#85888a',
    accent: '#d9ad4f',
    wood: '#634329',
    foliage: '#44623c'
  },
  forest: {
    ground: '#30452e',
    groundEdge: '#19271c',
    dark: '#111a13',
    mid: '#3e5639',
    light: '#718267',
    accent: '#8fcf68',
    wood: '#5c4028',
    foliage: '#567744'
  },
  haunted: {
    ground: '#34333a',
    groundEdge: '#1b1a20',
    dark: '#101016',
    mid: '#494952',
    light: '#85818e',
    accent: '#b68cff',
    wood: '#493a38',
    foliage: '#42483f'
  },
  swamp: {
    ground: '#384132',
    groundEdge: '#20271f',
    dark: '#111713',
    mid: '#4e5545',
    light: '#777d67',
    accent: '#c39b54',
    wood: '#52402d',
    foliage: '#56633e'
  },
  infernal: {
    ground: '#462b29',
    groundEdge: '#211314',
    dark: '#0d080a',
    mid: '#4b3033',
    light: '#7a5551',
    accent: '#d34a3f',
    wood: '#4b2925',
    foliage: '#3d302c'
  },
  holy: {
    ground: '#555346',
    groundEdge: '#302f2a',
    dark: '#171719',
    mid: '#68675f',
    light: '#aaa58e',
    accent: '#f0d978',
    wood: '#70583a',
    foliage: '#687453'
  },
  cosmic: {
    ground: '#302c38',
    groundEdge: '#17141e',
    dark: '#09080d',
    mid: '#474252',
    light: '#81788f',
    accent: '#ef5757',
    wood: '#493639',
    foliage: '#393b3d'
  },
  ruined: {
    ground: '#464541',
    groundEdge: '#252522',
    dark: '#171719',
    mid: '#55565a',
    light: '#8d8d88',
    accent: '#a8b1b8',
    wood: '#5a4430',
    foliage: '#4d5944'
  }
});

const UNIQUE_OVERRIDES = Object.freeze([
  { keys: ['castleveyr', 'gothiccastle', 'capitalgate'], archetype: 'castle', variant: 'haunted', importance: 'major' },
  { keys: ['emberveillair', 'demoncultlair'], archetype: 'cult', variant: 'infernal', importance: 'major' },
  { keys: ['brokenchapel'], archetype: 'ruin', variant: 'haunted', importance: 'major' },
  { keys: ['oldhollowdungeon'], archetype: 'crypt', variant: 'haunted', importance: 'major' },
  { keys: ['thornroothollow', 'mirrorgroveunderroot', 'hollowgrove'], archetype: 'hollow', variant: 'forest', importance: 'named' },
  { keys: ['abandonedironhollow', 'ironmiredungeon'], archetype: 'mine', variant: 'swamp', importance: 'named' },
  { keys: ['ashenorchardcellar'], archetype: 'crypt', variant: 'haunted', importance: 'named' },
  { keys: ['pilgrimcrypt'], archetype: 'crypt', variant: 'haunted', importance: 'named' },
  { keys: ['watcherridgevault'], archetype: 'mine', variant: 'ruined', importance: 'named' },
  { keys: ['failedpurificationsite'], archetype: 'ruin', variant: 'holy', importance: 'named' },
  { keys: ['shatteredchoir'], archetype: 'shrine', variant: 'holy', importance: 'major' },
  { keys: ['ascensionspire'], archetype: 'tower', variant: 'cosmic', importance: 'major' },
  { keys: ['confessionvaults'], archetype: 'tower', variant: 'holy', importance: 'major' },
  { keys: ['lightbeneathnames'], archetype: 'tower', variant: 'cosmic', importance: 'major' },
  { keys: ['lightstormscar'], archetype: 'ruin', variant: 'cosmic', importance: 'named' },
  { keys: ['infinitetower'], archetype: 'tower', variant: 'haunted', importance: 'major' },
  { keys: ['pilgrimroadexpedition'], archetype: 'fort', variant: 'rural', importance: 'major' }
]);

const TAG_ARCHETYPES = Object.freeze({
  castle: 'castle',
  citadel: 'castle',
  keep: 'castle',
  fort: 'fort',
  gate: 'fort',
  outpost: 'fort',
  hollow: 'hollow',
  grove: 'hollow',
  cave: 'cave',
  cavern: 'cave',
  lair: 'cave',
  den: 'cave',
  mine: 'mine',
  quarry: 'mine',
  pit: 'mine',
  crypt: 'crypt',
  tomb: 'crypt',
  barrow: 'crypt',
  mausoleum: 'crypt',
  vault: 'crypt',
  cellar: 'crypt',
  grave: 'crypt',
  shrine: 'shrine',
  temple: 'shrine',
  chapel: 'shrine',
  sanctum: 'shrine',
  ruin: 'ruin',
  broken: 'ruin',
  tower: 'tower',
  spire: 'tower',
  cult: 'cult',
  demon: 'cult',
  ritual: 'cult',
  camp: 'camp'
});

const NAME_KEYWORD_PRIORITY = Object.freeze([
  'castle', 'citadel', 'keep',
  'fort', 'gate',
  'mine', 'quarry', 'pit',
  'crypt', 'tomb', 'barrow', 'mausoleum', 'vault', 'cellar', 'grave',
  'shrine', 'temple', 'sanctum', 'chapel',
  'outpost',
  'ruin', 'broken',
  'tower', 'spire',
  'cult', 'demon', 'ritual',
  'hollow', 'grove',
  'cave', 'cavern', 'lair', 'den',
  'camp'
]);

const THEME_VARIANTS = Object.freeze({
  thorn: 'forest',
  forest: 'forest',
  grave: 'haunted',
  undead: 'haunted',
  mine: 'ruined',
  ruin: 'ruined',
  demon: 'infernal',
  infernal: 'infernal',
  holy: 'holy',
  covenant: 'holy',
  cosmic: 'cosmic',
  ascension: 'cosmic',
  mire: 'swamp',
  swamp: 'swamp'
});

const profileCache = new WeakMap();

export function getPoiStructureProfile(object = {}) {
  if (!object || typeof object !== 'object') {
    return buildProfile({}, 'generic', 'rural', 'minor', 'generic:no-object');
  }

  const signature = [
    object.id,
    object.name,
    object.poiId,
    object.dungeonId,
    object.kind,
    object.theme,
    object.regionId,
    object.structureArchetype,
    object.structureVariant,
    object.structureImportance,
    object.structureScale,
    object.structureLabelOffset,
    object.structurePresentation,
    Array.isArray(object.tags) ? object.tags.join(',') : object.tags
  ].join('|');

  const cached = profileCache.get(object);
  if (cached?.signature === signature) return cached.profile;

  const identity = getIdentityText(object);
  const normalizedIdentity = normalize(identity);
  const unique = UNIQUE_OVERRIDES.find(override => override.keys.some(key => normalizedIdentity.includes(key)));

  let archetype = unique?.archetype || null;
  let variant = unique?.variant || null;
  let importance = unique?.importance || null;
  let reason = unique ? `unique:${unique.keys.find(key => normalizedIdentity.includes(key))}` : '';

  if (!archetype && isKnownArchetype(object.structureArchetype || object.poiArchetype || object.exteriorArchetype)) {
    archetype = object.structureArchetype || object.poiArchetype || object.exteriorArchetype;
    reason = 'explicit:archetype';
  }

  if (!archetype) {
    const explicitTags = toTokens(object.tags || object.poiTags || object.type);
    const tag = explicitTags.find(token => TAG_ARCHETYPES[token]);
    if (tag) {
      archetype = TAG_ARCHETYPES[tag];
      reason = `explicit:tag:${tag}`;
    }
  }

  if (!archetype) {
    const identityTokens = toTokens(identity);
    const keyword = NAME_KEYWORD_PRIORITY.find(token => identityTokens.includes(token));
    if (keyword) {
      archetype = TAG_ARCHETYPES[keyword];
      reason = `inferred:name:${keyword}`;
    }
  }

  if (!archetype) {
    archetype = inferFromThemeAndKind(object);
    reason = archetype === 'generic' ? 'generic:fallback' : 'fallback:theme-or-kind';
  }

  variant = object.structureVariant || object.biomeVariant || variant || inferVariant(object);
  importance = object.structureImportance || importance || inferImportance(object);

  const profile = buildProfile(object, archetype, variant, importance, reason);
  profileCache.set(object, { signature, profile });
  return profile;
}

export function describePoiStructure(object) {
  const profile = getPoiStructureProfile(object);
  return `${profile.archetype}/${profile.variant} (${profile.reason})`;
}

function buildProfile(object, archetypeId, variantId, importance, reason) {
  const archetype = POI_STRUCTURE_ARCHETYPES[archetypeId] || POI_STRUCTURE_ARCHETYPES.generic;
  const variant = POI_STRUCTURE_VARIANTS[variantId] ? variantId : 'rural';
  const importanceScale = importance === 'major' ? 1.14 : importance === 'named' ? 1.04 : 0.88;

  return Object.freeze({
    archetype: archetype.id,
    variant,
    importance,
    reason,
    palette: POI_STRUCTURE_VARIANTS[variant],
    scale: Number(object.structureScale || archetype.scale * importanceScale),
    labelOffset: Number(object.structureLabelOffset || archetype.labelOffset * importanceScale),
    entranceAnchor: Object.freeze({ x: 0, y: 12 })
  });
}

function inferFromThemeAndKind(object) {
  if (object.kind === 'towerEntrance') return 'tower';
  if (object.kind === 'travelRouteGate' || object.kind === 'capitalGate' || object.kind === 'palaceGate') return 'fort';
  if (object.kind === 'shrine') return 'shrine';
  if (object.theme === 'thorn') return 'hollow';
  if (object.theme === 'mine') return 'mine';
  if (object.theme === 'grave') return 'crypt';
  if (object.theme === 'demon') return 'cult';
  if (object.theme === 'holy') return 'shrine';
  if (object.theme === 'cosmic') return 'tower';
  if (object.kind === 'sideZoneEntrance') return 'cave';
  return 'generic';
}

function inferVariant(object) {
  const explicit = normalize(object.theme || object.biome || object.regionTheme);
  if (THEME_VARIANTS[explicit]) return THEME_VARIANTS[explicit];
  const region = normalize(object.regionId);
  if (region.includes('aureate')) return 'holy';
  if (region.includes('ascension')) return 'cosmic';
  if (region.includes('hearthmere')) return 'rural';
  return 'rural';
}

function inferImportance(object) {
  if (object.forceLabel || object.labelPriority >= 8 || object.tier >= 4 || object.recommendedLevel >= 12) return 'major';
  if (object.poiId || object.dungeonId || object.labelPriority >= 6) return 'named';
  return 'minor';
}

function getIdentityText(object) {
  return [
    object.id,
    object.name,
    object.poiId,
    object.dungeonId,
    object.sideZoneType,
    object.infiniteDungeonRegionId,
    object.routeId,
    object.kind,
    object.theme,
    ...(Array.isArray(object.tags) ? object.tags : [object.tags])
  ].filter(Boolean).join(' ');
}

function toTokens(value) {
  const text = Array.isArray(value) ? value.join(' ') : String(value || '');
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isKnownArchetype(value) {
  return Boolean(value && POI_STRUCTURE_ARCHETYPES[value]);
}
