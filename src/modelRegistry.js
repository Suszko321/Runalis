// Canonical visual/model registry for Runalis' code-drawn Canvas renderer.
//
// A "model" in this project is a named procedural renderer contract rather
// than a mesh file. Gameplay IDs remain stable; this registry supplies the
// art-facing identity, materials, scale, collision, and validation policy.

import {getEnemyBossVisual} from './enemyVisualProfiles.js';
export const ART_DIRECTION_VERSION = 'runalis-pixel-enemies-v2';

export const VISUAL_STATUS = Object.freeze({
  READY: 'ready',
  MISSING_MODEL: 'missing-model',
  PLACEHOLDER: 'placeholder',
  BROKEN_MATERIAL: 'broken-material',
  WRONG_SCALE: 'wrong-scale',
  NO_COLLISION: 'no-collision',
  DUPLICATE_ASSET: 'duplicate-asset',
  HIDDEN_LOGIC: 'hidden-logic-object',
  PRODUCTION_INVALID: 'production-invalid'
});

export const ART_BUDGETS = Object.freeze({
  player: Object.freeze({ shapeBudget: 42, drawCallBudget: 76, animationFps: 12 }),
  npc: Object.freeze({ shapeBudget: 38, drawCallBudget: 68, animationFps: 10 }),
  enemy: Object.freeze({ shapeBudget: 34, drawCallBudget: 62, animationFps: 10 }),
  boss: Object.freeze({ shapeBudget: 92, drawCallBudget: 148, animationFps: 12 }),
  prop: Object.freeze({ shapeBudget: 24, drawCallBudget: 42, animationFps: 8 }),
  structure: Object.freeze({ shapeBudget: 80, drawCallBudget: 126, animationFps: 0 }),
  vegetation: Object.freeze({ shapeBudget: 20, drawCallBudget: 34, animationFps: 8 }),
  logic: Object.freeze({ shapeBudget: 0, drawCallBudget: 0, animationFps: 0 })
});

export const MATERIAL_LIBRARY = Object.freeze({
  characterCloth: Object.freeze({ family: 'cloth', finish: 'matte', facets: 3 }),
  covenantIvory: Object.freeze({ family: 'cloth-gold', finish: 'soft-radiant', facets: 4 }),
  lastDawnIron: Object.freeze({ family: 'cloth-iron', finish: 'weathered', facets: 4 }),
  graveRot: Object.freeze({ family: 'bone-rot', finish: 'dry', facets: 4 }),
  beastHide: Object.freeze({ family: 'hide', finish: 'matte', facets: 3 }),
  demonIron: Object.freeze({ family: 'iron-ember', finish: 'scorched', facets: 5 }),
  spectralVeil: Object.freeze({ family: 'spectral', finish: 'translucent', facets: 3 }),
  timber: Object.freeze({ family: 'wood', finish: 'rough', facets: 3 }),
  ashWood: Object.freeze({ family: 'wood-ash', finish: 'charred', facets: 4 }),
  fieldStone: Object.freeze({ family: 'stone', finish: 'rough', facets: 4 }),
  ancientStone: Object.freeze({ family: 'stone-rune', finish: 'weathered', facets: 5 }),
  workedMetal: Object.freeze({ family: 'metal', finish: 'worn', facets: 4 }),
  livingPlant: Object.freeze({ family: 'foliage', finish: 'matte', facets: 3 }),
  rareFlora: Object.freeze({ family: 'foliage-arcane', finish: 'subtle-glow', facets: 4 }),
  waterClear: Object.freeze({ family: 'water', finish: 'layered', facets: 4 }),
  waterRot: Object.freeze({ family: 'water-rot', finish: 'oily', facets: 5 }),
  divineRelic: Object.freeze({ family: 'stone-gold', finish: 'restrained-radiant', facets: 5 }),
  dungeonMechanism: Object.freeze({ family: 'stone-metal', finish: 'worn', facets: 5 }),
  invisibleLogic: Object.freeze({ family: 'none', finish: 'editor-only', facets: 0 })
});

const OBJECT_GROUPS = Object.freeze({
  npc: ['npc'],
  vegetation: ['treeCluster', 'pineCluster', 'shrub', 'tallGrassPatch', 'stump', 'deadRoot', 'tree', 'log', 'deadwood', 'rareTree'],
  resourcePlant: ['herb', 'forage', 'bitterroot', 'moonpetal', 'bloodmoss', 'thornsilkVine', 'spiritFern', 'dawnsage', 'redSealPoppy', 'emberleaf', 'lanternMoss', 'ashFruit', 'gravecap', 'reed', 'riverReed'],
  resourceMineral: ['ore', 'stone', 'crystal', 'deepstone', 'runestone', 'bone', 'fish'],
  structure: ['shrine', 'dungeonEntrance', 'dungeonExit', 'dungeonStairs', 'dungeonDoor', 'sideZoneEntrance', 'sideZoneExit', 'towerEntrance', 'towerStairs', 'towerExit', 'capitalGate', 'capitalExit', 'travelRouteGate', 'travelRouteExit', 'travelRouteReturnGate', 'palaceGate', 'gothicCastle', 'demonLair', 'demonCultLair', 'redSeal', 'majorPoiPiece', 'brokenWall', 'ruinPillar'],
  interactive: ['campfire', 'dungeonChest', 'dungeonKey', 'dungeonPuzzle', 'dungeonEvent', 'dungeonSetpiece', 'towerRewardChest', 'worldCache', 'poiInvestigation', 'marketStall', 'blacksmithService', 'alchemistService', 'guildClerk', 'bankService', 'classTrainerService', 'arenaGate', 'noticeBoard'],
  prop: ['smallBoulder', 'graveMarker', 'signpost', 'townProp'],
  runtimeSurface: ['editorPath', 'editorWater'],
  logic: ['editorTrigger', 'editorSpawn', 'editorLight', 'editorAudio', 'editorWeather', 'editorNavBlocker', 'poiMarker']
});

const ENEMY_KINDS = Object.freeze([
  'hollowling', 'ashWolf', 'stalkerWolf', 'gravebound', 'shieldKnight', 'roadlessBandit',
  'demonCultist', 'cultist', 'wraith', 'veyrWraith', 'brute', 'gravePriest', 'archer',
  'exploder', 'basicBeast'
]);

const BOSS_TYPES = Object.freeze(['veyrWarden', 'hollowElk', 'demonLord', 'seraphel', 'zephyrLight','redSealExecutioner','graveMawBear','briarTitan']);

const MODEL_ALIASES = Object.freeze({
  'object:demonCultLair': 'object:demonLair',
  'object:stone': 'object:ore',
  'object:riverReed': 'object:reed',
  'enemy:stalkerWolf': 'enemy:ashWolf',
  'enemy:shieldKnight': 'enemy:gravebound',
  'enemy:cultist': 'enemy:demonCultist',
  'enemy:veyrWraith': 'enemy:wraith'
});

function titleCase(value) {
  return String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function budgetFor(category) {
  return ART_BUDGETS[category] || ART_BUDGETS.prop;
}

function define(id, options = {}) {
  const category = options.category || 'prop';
  const budget = budgetFor(category);
  return Object.freeze({
    id,
    name: options.name || titleCase(id.split(':').at(-1)),
    category,
    rendererId: options.rendererId || id,
    modelPath: options.modelPath || `code://${id}`,
    materialSet: options.materialSet || 'fieldStone',
    collisionProfile: options.collisionProfile || 'entity-default',
    lodProfile: options.lodProfile || (category === 'structure' ? 'structure-3-tier' : 'canvas-distance-cull'),
    editorThumbnail: options.editorThumbnail || `glyph://${category}`,
    tags: Object.freeze([category, ...(options.tags || [])]),
    shapeBudget: options.shapeBudget ?? budget.shapeBudget,
    drawCallBudget: options.drawCallBudget ?? budget.drawCallBudget,
    animationFps: options.animationFps ?? budget.animationFps,
    expectedScale: Object.freeze(options.expectedScale || [0.55, 1.8]),
    logicOnly: !!options.logicOnly,
    runtimeVisible: options.runtimeVisible !== false,
    placeholder: !!options.placeholder,
    productionValid: options.productionValid !== false,
    artDirectionVersion: ART_DIRECTION_VERSION
  });
}

const entries = [];

for (const [group, kinds] of Object.entries(OBJECT_GROUPS)) {
  for (const kind of kinds) {
    const registryId = `object:${kind}`;
    const canonicalRendererId = MODEL_ALIASES[registryId] || registryId;
    const logicOnly = group === 'logic';
    const category = group === 'npc' ? 'npc'
      : group === 'vegetation' || group === 'resourcePlant' ? 'vegetation'
        : group === 'structure' ? 'structure'
          : logicOnly ? 'logic' : 'prop';
    const materialSet = logicOnly ? 'invisibleLogic'
      : group === 'npc' ? 'characterCloth'
        : group === 'vegetation' ? (kind === 'deadRoot' || kind === 'deadwood' ? 'ashWood' : 'livingPlant')
          : group === 'resourcePlant' ? 'rareFlora'
            : group === 'resourceMineral' ? (kind === 'bone' ? 'graveRot' : kind === 'fish' ? 'waterClear' : 'ancientStone')
              : group === 'runtimeSurface' ? (kind === 'editorWater' ? 'waterClear' : 'fieldStone')
                : group === 'structure' ? 'ancientStone' : 'timber';
    entries.push(define(registryId, {
      category,
      rendererId: canonicalRendererId,
      modelPath: `code://${canonicalRendererId}`,
      materialSet,
      collisionProfile: logicOnly || ['fish', 'herb', 'forage', 'reed', 'riverReed'].includes(kind) ? 'none' : 'world-prop',
      logicOnly,
      runtimeVisible: !logicOnly,
      expectedScale: category === 'structure' ? [0.35, 3.25] : [0.45, 2.1],
      tags: [group, kind]
    }));
  }
}

for (const kind of ENEMY_KINDS) {
  const registryId = `enemy:${kind}`;
  const canonicalRendererId = MODEL_ALIASES[registryId] || registryId;
  const materialSet = /wraith/i.test(kind) ? 'spectralVeil'
    : /cultist|exploder/i.test(kind) ? 'demonIron'
      : /wolf|beast/i.test(kind) ? 'beastHide' : 'graveRot';
  entries.push(define(registryId, {
    category: 'enemy', rendererId: canonicalRendererId, modelPath: `code://${canonicalRendererId}`,
    materialSet, collisionProfile: 'hostile-body', expectedScale: [0.55, 2.35], tags: ['enemy', kind]
  }));
}

for (const bossType of BOSS_TYPES) {
  entries.push(define(`boss:${bossType}`, {
    category: 'boss',
    materialSet: bossType === 'seraphel' || bossType === 'zephyrLight' ? 'divineRelic' : bossType === 'demonLord' ? 'demonIron' : 'graveRot',
    collisionProfile: 'boss-body',
    lodProfile: 'boss-always-detailed',
    expectedScale: [0.65, 3.5],
    tags: ['boss', bossType]
  }));
}

for(const kind of ['worldDressing','navStone','worldSecret','worldRelic'])entries.push(define(`object:${kind}`,{
  category:kind==='worldDressing'?'prop':'structure',rendererId:'worldAtmosphereRenderer',
  materialSet:'fieldStone',expectedScale:[.5,4.5],collisionProfile:kind==='worldDressing'?'decorative':'interaction',tags:['authored-world']
}));
export const VISUAL_MODEL_REGISTRY = Object.freeze(Object.fromEntries(entries.map(entry => [entry.id, entry])));

export function getBossVisualType(entity) {
  return getEnemyBossVisual(entity);
}

export function getVisualModelId(entity, collection = 'objects') {
  if (!entity) return null;
  if (entity.modelId) return String(entity.modelId);
  if (collection === 'enemies' || collection === 'enemy') {
    const bossType = getBossVisualType(entity);
    if (bossType) return `boss:${bossType}`;
    return entity.kind ? `enemy:${entity.kind}` : null;
  }
  return entity.kind ? `object:${entity.kind}` : null;
}

export function resolveVisualDefinition(entity, collection = 'objects') {
  const requestedId = getVisualModelId(entity, collection);
  if (!requestedId) return null;
  const direct = VISUAL_MODEL_REGISTRY[requestedId];
  if (direct) return direct;
  const aliasId = MODEL_ALIASES[requestedId];
  return aliasId ? VISUAL_MODEL_REGISTRY[aliasId] || null : null;
}

export function getVisualStatus(entity, collection = 'objects') {
  const modelId = getVisualModelId(entity, collection);
  const definition = resolveVisualDefinition(entity, collection);
  if (!definition) return Object.freeze({ code: VISUAL_STATUS.MISSING_MODEL, modelId, definition: null, productionValid: false });
  if (definition.logicOnly) return Object.freeze({ code: VISUAL_STATUS.HIDDEN_LOGIC, modelId, definition, productionValid: true });
  if (definition.placeholder) return Object.freeze({ code: VISUAL_STATUS.PLACEHOLDER, modelId, definition, productionValid: false });
  if (!MATERIAL_LIBRARY[definition.materialSet]) return Object.freeze({ code: VISUAL_STATUS.BROKEN_MATERIAL, modelId, definition, productionValid: false });
  const scale = Number(entity?.scale || 1);
  if (!Number.isFinite(scale) || scale < definition.expectedScale[0] || scale > definition.expectedScale[1]) {
    return Object.freeze({ code: VISUAL_STATUS.WRONG_SCALE, modelId, definition, productionValid: false });
  }
  if (!definition.productionValid) return Object.freeze({ code: VISUAL_STATUS.PRODUCTION_INVALID, modelId, definition, productionValid: false });
  return Object.freeze({ code: VISUAL_STATUS.READY, modelId, definition, productionValid: true });
}

export function shouldRenderVisual(entity, collection = 'objects', developerMode = false) {
  const status = getVisualStatus(entity, collection);
  if (status.code === VISUAL_STATUS.HIDDEN_LOGIC) return false;
  if (status.code === VISUAL_STATUS.WRONG_SCALE) return true;
  if (status.productionValid) return true;
  return !!developerMode;
}

export function isDeveloperArtMode() {
  return typeof document !== 'undefined' && !!document.body?.classList?.contains('developer-mode');
}

export function validateWorldArt(world) {
  const errors = [];
  const warnings = [];
  const info = [];
  const modelCounts = new Map();
  let checked = 0;
  let hiddenLogic = 0;

  for (const [collection, entities] of [['objects', world?.objects || []], ['enemies', world?.enemies || []]]) {
    for (const entity of entities) {
      if (!entity) continue;
      checked += 1;
      const status = getVisualStatus(entity, collection);
      const countKey = status.modelId || `${collection}:missing`;
      modelCounts.set(countKey, (modelCounts.get(countKey) || 0) + 1);
      if (status.code === VISUAL_STATUS.HIDDEN_LOGIC) {
        hiddenLogic += 1;
        continue;
      }
      if (status.code === VISUAL_STATUS.MISSING_MODEL) {
        errors.push(artIssue('error', status.code, `${entity.id || entity.name || 'Entity'} has no registered visual model (${status.modelId || 'no model ID'}).`, entity, status));
      } else if ([VISUAL_STATUS.PLACEHOLDER, VISUAL_STATUS.BROKEN_MATERIAL, VISUAL_STATUS.PRODUCTION_INVALID].includes(status.code)) {
        errors.push(artIssue('error', status.code, `${entity.id || entity.name || 'Entity'} is not production-valid: ${status.code}.`, entity, status));
      } else if (status.code === VISUAL_STATUS.WRONG_SCALE) {
        warnings.push(artIssue('warning', status.code, `${entity.id || entity.name || 'Entity'} scale ${entity.scale} is outside ${status.definition.expectedScale.join('–')}.`, entity, status));
      }
      if (status.definition?.collisionProfile !== 'none' && entity.collision === false && !entity.interactable) {
        warnings.push(artIssue('warning', VISUAL_STATUS.NO_COLLISION, `${entity.id || entity.name || 'Entity'} disables its expected collision.`, entity, status));
      }
    }
  }

  info.push(artIssue('info', 'art-summary', `${checked} entities checked; ${hiddenLogic} intentional logic-only objects; ${modelCounts.size} visual model IDs used.`));
  return { valid: errors.length === 0, errors, warnings, info, counts: Object.fromEntries(modelCounts) };
}

function artIssue(severity, code, message, entity = null, status = null) {
  return { severity, code, message, entityId: entity?.id || null, modelId: status?.modelId || null };
}
