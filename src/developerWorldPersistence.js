// Non-destructive persistence, validation, recovery, and runtime publishing for
// Runalis Developer Mode. Player profiles never share these storage keys.

import { validateWorldArt } from './modelRegistry.js';

export const DEVELOPER_OVERRIDE_VERSION = 1;
export const DEVELOPER_STORAGE_KEYS = Object.freeze({
  drafts: 'runalis.developerWorldDrafts.v1',
  backups: 'runalis.developerWorldBackups.v1',
  recovery: 'runalis.developerWorldRecovery.v1',
  published: 'runalis.runtimeWorldOverrides.v1',
  preferences: 'runalis.developerWorldPreferences.v1',
  prefabs: 'runalis.developerWorldPrefabs.v1'
});

const VOLATILE_FIELDS = new Set([
  'floatingTexts', 'combatEffects', 'cooldowns', 'abilityUseCharges', 'summons',
  'lastHitAt', 'lastAttackAt', 'lastDamagedAt', 'aggroTarget', 'target', 'path',
  'velocityX', 'velocityY', 'attackTimer', 'aiTimer', 'wanderTimer', 'remove'
]);

export function getEditorMapId(world, requestedId = null) {
  if (requestedId) return slug(requestedId);
  if (world?.editorMapId) return slug(world.editorMapId);
  if (/orrakai|capital gate district/i.test(String(world?.name || ''))) return 'orrakai';
  if (world?.regionId) {
    const region = slug(world.regionId);
    if (region === 'hearthmere-frontier') return 'echoryn';
    return region;
  }
  if (world?.dungeonState?.dungeonId) return slug(world.dungeonState.dungeonId);
  if (world?.routeId) return slug(world.routeId);
  return slug(world?.name || world?.mode || 'unknown-map');
}

export function ensureStableWorldIds(world, mapId = getEditorMapId(world)) {
  const used = new Set();
  let assigned = 0;

  for (const [collectionName, collection] of getEditableCollections(world)) {
    for (let index = 0; index < collection.length; index++) {
      const entity = collection[index];
      if (!entity) continue;
      let id = String(entity.id || '').trim();
      if (!id || used.has(id)) {
        const kind = slug(entity.kind || entity.type || collectionName.slice(0, -1) || 'entity');
        const base = `generated-${slug(mapId)}-${kind}-${index}`;
        id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        entity.id = id;
        entity.editorGeneratedId = true;
        assigned++;
      }
      used.add(id);
    }
  }

  return { assigned, total: used.size };
}

export function createEditorBaseSnapshot(world, mapId = getEditorMapId(world)) {
  ensureStableWorldIds(world, mapId);
  return {
    mapId,
    objects: mapById(world?.objects),
    enemies: mapById(world?.enemies),
    tiles: cloneTiles(world?.tiles),
    metadata: {
      worldName: world?.name || mapId,
      worldMode: world?.mode || 'overworld',
      capturedAt: Date.now()
    }
  };
}

export function buildEditorOverride(world, baseSnapshot, metadata = {}) {
  const mapId = getEditorMapId(world, baseSnapshot?.mapId);
  ensureStableWorldIds(world, mapId);
  const baseObjects = baseSnapshot?.objects || {};
  const baseEnemies = baseSnapshot?.enemies || {};
  const currentObjects = mapById(world?.objects);
  const currentEnemies = mapById(world?.enemies);

  return {
    version: DEVELOPER_OVERRIDE_VERSION,
    mapId,
    baseMapVersion: world?.mapMeta?.version ?? null,
    deletedObjectIds: Object.keys(baseObjects).filter(id => !currentObjects[id]),
    deletedEnemyIds: Object.keys(baseEnemies).filter(id => !currentEnemies[id]),
    addedObjects: Object.keys(currentObjects)
      .filter(id => !baseObjects[id])
      .map(id => cloneSerializable(currentObjects[id])),
    addedEnemies: Object.keys(currentEnemies)
      .filter(id => !baseEnemies[id])
      .map(id => cloneSerializable(currentEnemies[id])),
    modifiedObjects: buildModifications(baseObjects, currentObjects),
    modifiedEnemies: buildModifications(baseEnemies, currentEnemies),
    terrainEdits: buildTerrainEdits(baseSnapshot?.tiles, world?.tiles),
    metadata: {
      name: metadata.name || `${world?.name || mapId} Development Override`,
      author: metadata.author || 'Runalis Developer',
      notes: metadata.notes || '',
      mapName: world?.name || mapId,
      worldMode: world?.mode || 'overworld',
      savedAt: Date.now(),
      savedAtText: new Date().toLocaleString(),
      dirtyRevision: Number(metadata.dirtyRevision || 0)
    }
  };
}

export function applyEditorOverride(world, override) {
  if (!world || !override) return { applied: false, reason: 'Missing world or override.' };
  ensureStableWorldIds(world, override.mapId || getEditorMapId(world));

  const deletedObjects = new Set(override.deletedObjectIds || []);
  const deletedEnemies = new Set(override.deletedEnemyIds || []);
  world.objects = (world.objects || []).filter(entity => entity && !deletedObjects.has(entity.id));
  world.enemies = (world.enemies || []).filter(entity => entity && !deletedEnemies.has(entity.id));

  applyModifications(world.objects, override.modifiedObjects);
  applyModifications(world.enemies, override.modifiedEnemies);
  addMissingEntities(world.objects, override.addedObjects);
  addMissingEntities(world.enemies, override.addedEnemies);
  applyTerrainEdits(world.tiles, override.terrainEdits);

  world.editorOverrideMetadata = cloneSerializable(override.metadata || {});
  return {
    applied: true,
    objectsDeleted: deletedObjects.size,
    enemiesDeleted: deletedEnemies.size,
    objectsAdded: (override.addedObjects || []).length,
    enemiesAdded: (override.addedEnemies || []).length,
    terrainEdits: (override.terrainEdits || []).length
  };
}

export function applyPublishedWorldOverride(world) {
  const mapId = getEditorMapId(world);
  const published = readStorageObject(DEVELOPER_STORAGE_KEYS.published);
  const override = published[mapId];
  if (!override) return { applied: false, reason: 'No published override.' };
  return applyEditorOverride(world, override);
}

export function saveDeveloperDraft(override, options = {}) {
  if (!override?.mapId) return { ok: false, errors: ['Override has no map ID.'] };
  const validation = validateEditorOverride(override, options.world || null);
  if (validation.errors.length && !options.force) {
    return { ok: false, validation, errors: validation.errors };
  }

  const drafts = readStorageObject(DEVELOPER_STORAGE_KEYS.drafts);
  const previous = drafts[override.mapId];
  if (previous) createDeveloperBackup(previous, 'automatic-before-save');
  drafts[override.mapId] = cloneSerializable(override);
  writeStorageObject(DEVELOPER_STORAGE_KEYS.drafts, drafts);
  clearDeveloperRecovery(override.mapId);
  return { ok: true, validation, override };
}

export function loadDeveloperDraft(mapId) {
  return cloneSerializable(readStorageObject(DEVELOPER_STORAGE_KEYS.drafts)[slug(mapId)] || null);
}

export function createDeveloperBackup(override, reason = 'manual') {
  if (!override?.mapId) return null;
  const backups = readStorageObject(DEVELOPER_STORAGE_KEYS.backups);
  const list = Array.isArray(backups[override.mapId]) ? backups[override.mapId] : [];
  const entry = {
    id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reason,
    createdAt: Date.now(),
    createdAtText: new Date().toLocaleString(),
    override: cloneSerializable(override)
  };
  list.unshift(entry);
  backups[override.mapId] = list.slice(0, 10);
  writeStorageObject(DEVELOPER_STORAGE_KEYS.backups, backups);
  return entry;
}

export function listDeveloperBackups(mapId) {
  const backups = readStorageObject(DEVELOPER_STORAGE_KEYS.backups);
  return cloneSerializable(Array.isArray(backups[slug(mapId)]) ? backups[slug(mapId)] : []);
}

export function saveDeveloperRecovery(override) {
  if (!override?.mapId) return false;
  const recovery = readStorageObject(DEVELOPER_STORAGE_KEYS.recovery);
  recovery[override.mapId] = {
    savedAt: Date.now(),
    savedAtText: new Date().toLocaleString(),
    override: cloneSerializable(override)
  };
  return writeStorageObject(DEVELOPER_STORAGE_KEYS.recovery, recovery);
}

export function loadDeveloperRecovery(mapId) {
  return cloneSerializable(readStorageObject(DEVELOPER_STORAGE_KEYS.recovery)[slug(mapId)] || null);
}

export function clearDeveloperRecovery(mapId) {
  const recovery = readStorageObject(DEVELOPER_STORAGE_KEYS.recovery);
  delete recovery[slug(mapId)];
  return writeStorageObject(DEVELOPER_STORAGE_KEYS.recovery, recovery);
}

export function publishRuntimeOverride(override, world = null, force = false) {
  const validation = validateEditorOverride(override, world);
  if (validation.errors.length && !force) return { ok: false, validation };
  const published = readStorageObject(DEVELOPER_STORAGE_KEYS.published);
  published[override.mapId] = cloneSerializable(override);
  writeStorageObject(DEVELOPER_STORAGE_KEYS.published, published);
  return { ok: true, validation };
}

export function validateEditorWorld(world, override = null) {
  const errors = [];
  const warnings = [];
  const info = [];
  const seen = new Map();

  for (const [collectionName, collection] of getEditableCollections(world)) {
    for (const entity of collection) {
      if (!entity) continue;
      if (!entity.id) errors.push(issue('error', 'missing-id', `${collectionName} entry is missing an ID.`, entity));
      if (entity.id && seen.has(entity.id)) {
        errors.push(issue('error', 'duplicate-id', `Duplicate ID “${entity.id}”.`, entity));
      } else if (entity.id) {
        seen.set(entity.id, entity);
      }
      if (!entity.kind && collectionName === 'objects') warnings.push(issue('warning', 'missing-kind', `${entity.id || 'Object'} has no kind.`, entity));
      if (!Number.isFinite(Number(entity.x)) || !Number.isFinite(Number(entity.y))) {
        errors.push(issue('error', 'invalid-transform', `${entity.id || 'Entity'} has an invalid position.`, entity));
      }
      if (Number(entity.scale || 1) <= 0 || !Number.isFinite(Number(entity.scale || 1))) {
        errors.push(issue('error', 'invalid-scale', `${entity.id || 'Entity'} has an invalid scale.`, entity));
      }
      const maxX = Math.max(1, Number(world?.width || world?.tiles?.[0]?.length || 1)) * Number(world?.tileSize || 32);
      const maxY = Math.max(1, Number(world?.height || world?.tiles?.length || 1)) * Number(world?.tileSize || 32);
      if (Number(entity.x) < 0 || Number(entity.y) < 0 || Number(entity.x) > maxX || Number(entity.y) > maxY) {
        warnings.push(issue('warning', 'outside-bounds', `${entity.id || 'Entity'} is outside map bounds.`, entity));
      }
      if (entity.kind === 'editorPath' && (!Array.isArray(entity.points) || entity.points.length < 2)) {
        warnings.push(issue('warning', 'invalid-path', `${entity.id} needs at least two path points.`, entity));
      }
      if (entity.kind === 'editorWater' && (Number(entity.width || 0) <= 0 || Number(entity.height || 0) <= 0)) {
        errors.push(issue('error', 'invalid-water', `${entity.id} has an invalid water volume.`, entity));
      }
      if (entity.unique && [...seen.values()].filter(other => other !== entity && other?.npcId && other.npcId === entity.npcId).length) {
        warnings.push(issue('warning', 'duplicate-unique', `Unique NPC ${entity.name || entity.id} appears more than once.`, entity));
      }
    }
  }

  const spawn = world?.spawn;
  if (!spawn || !Number.isFinite(Number(spawn.x)) || !Number.isFinite(Number(spawn.y))) {
    errors.push(issue('error', 'missing-spawn', 'The map has no valid player spawn.'));
  }

  const hasExit = (world?.objects || []).some(entity => /exit|entrance|gate|travel/i.test(String(entity?.kind || '')));
  if (!hasExit && !['capital', 'sandbox'].includes(world?.mode)) {
    warnings.push(issue('warning', 'missing-exit', 'No map exit or transition object was found.'));
  }

  if (override) {
    const criticalDeleted = [...(override.deletedObjectIds || []), ...(override.deletedEnemyIds || [])]
      .filter(id => /spawn|exit|entrance|warden|mara|mael|boss|quest/i.test(id));
    for (const id of criticalDeleted) {
      warnings.push(issue('warning', 'critical-deletion', `Deleted ID “${id}” may be progression-critical.`, { id }));
    }
  }

  const artValidation = validateWorldArt(world);
  errors.push(...artValidation.errors);
  warnings.push(...artValidation.warnings);
  info.push(...artValidation.info);

  info.push(issue('info', 'summary', `${seen.size} persistent entities checked.`));
  return { valid: errors.length === 0, errors, warnings, info };
}

export function validateEditorOverride(override, world = null) {
  if (!override) return { valid: false, errors: [issue('error', 'missing-override', 'No override data.')], warnings: [], info: [] };
  const result = world ? validateEditorWorld(world, override) : { valid: true, errors: [], warnings: [], info: [] };
  if (Number(override.version) !== DEVELOPER_OVERRIDE_VERSION) {
    result.warnings.push(issue('warning', 'version', `Override version ${override.version} differs from ${DEVELOPER_OVERRIDE_VERSION}.`));
  }
  if (!override.mapId) result.errors.push(issue('error', 'missing-map-id', 'Override has no map ID.'));
  result.valid = result.errors.length === 0;
  return result;
}

export function findEntityDependencies(world, entityId) {
  const dependencies = [];
  if (!entityId) return dependencies;
  for (const [collectionName, collection] of getEditableCollections(world)) {
    for (const entity of collection) {
      if (!entity || entity.id === entityId) continue;
      const paths = [];
      findValuePaths(entity, entityId, '', paths, new Set());
      for (const path of paths) {
        dependencies.push({ collection: collectionName, entityId: entity.id, entityName: entity.name || entity.id, path });
      }
    }
  }
  return dependencies;
}

export function exportEditorJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return json;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'runalis-editor-export.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return json;
}

export function generatePersistentEditorId(mapId, kind, existingIds = []) {
  const used = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
  const prefix = `dev-${slug(mapId)}-${slug(kind || 'object')}`;
  let id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let suffix = 2;
  while (used.has(id)) id = `${prefix}-${Date.now().toString(36)}-${suffix++}`;
  return id;
}

export function cloneSerializable(value) {
  return sanitizeClone(value, new WeakSet());
}

function buildModifications(baseMap, currentMap) {
  const result = {};
  for (const [id, current] of Object.entries(currentMap)) {
    const base = baseMap[id];
    if (!base) continue;
    if (stableStringify(base) !== stableStringify(current)) result[id] = cloneSerializable(current);
  }
  return result;
}

function buildTerrainEdits(baseTiles, currentTiles) {
  const edits = [];
  if (!Array.isArray(baseTiles) || !Array.isArray(currentTiles)) return edits;
  const height = Math.min(baseTiles.length, currentTiles.length);
  for (let y = 0; y < height; y++) {
    const width = Math.min(baseTiles[y]?.length || 0, currentTiles[y]?.length || 0);
    for (let x = 0; x < width; x++) {
      const base = baseTiles[y]?.[x] || {};
      const current = currentTiles[y]?.[x] || {};
      if (stableStringify(base) !== stableStringify(current)) edits.push({ x, y, tile: cloneSerializable(current) });
    }
  }
  return edits;
}

function applyTerrainEdits(tiles, edits) {
  for (const edit of edits || []) {
    if (!tiles?.[edit.y]?.[edit.x]) continue;
    tiles[edit.y][edit.x] = { ...tiles[edit.y][edit.x], ...cloneSerializable(edit.tile || {}) };
  }
}

function applyModifications(collection, modifications) {
  const map = new Map((collection || []).filter(Boolean).map(entity => [entity.id, entity]));
  for (const [id, data] of Object.entries(modifications || {})) {
    const target = map.get(id);
    if (target) Object.assign(target, cloneSerializable(data));
  }
}

function addMissingEntities(collection, additions) {
  const ids = new Set((collection || []).filter(Boolean).map(entity => entity.id));
  for (const entity of additions || []) {
    if (!entity?.id || ids.has(entity.id)) continue;
    collection.push(cloneSerializable(entity));
    ids.add(entity.id);
  }
}

function mapById(collection) {
  const result = {};
  for (const entity of collection || []) {
    if (!entity?.id) continue;
    result[entity.id] = cloneSerializable(entity);
  }
  return result;
}

function cloneTiles(tiles) {
  return Array.isArray(tiles) ? tiles.map(row => Array.isArray(row) ? row.map(tile => cloneSerializable(tile)) : []) : [];
}

function sanitizeClone(value, seen) {
  if (value === null || value === undefined) return value ?? null;
  const type = typeof value;
  if (type === 'number') return Number.isFinite(value) ? value : null;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'function' || type === 'symbol') return undefined;
  if (type !== 'object') return String(value);
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map(item => sanitizeClone(item, seen)).filter(item => item !== undefined);
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (VOLATILE_FIELDS.has(key) || key.startsWith('__')) continue;
    const cloned = sanitizeClone(item, seen);
    if (cloned !== undefined) result[key] = cloned;
  }
  seen.delete(value);
  return result;
}

function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortObject(value[key]);
    return result;
  }, {});
}

function findValuePaths(value, target, path, results, seen) {
  if (value === target) {
    results.push(path || '(value)');
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    findValuePaths(child, target, path ? `${path}.${key}` : key, results, seen);
  }
}

function getEditableCollections(world) {
  return [
    ['objects', Array.isArray(world?.objects) ? world.objects : []],
    ['enemies', Array.isArray(world?.enemies) ? world.enemies : []]
  ];
}

function readStorageObject(key) {
  if (typeof localStorage === 'undefined') return {};
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    console.warn(`Developer storage read failed for ${key}:`, error);
    return {};
  }
}

function writeStorageObject(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Developer storage write failed for ${key}:`, error);
    return false;
  }
}

function issue(severity, code, message, entity = null) {
  return { severity, code, message, entityId: entity?.id || null };
}

function slug(value) {
  return String(value || 'unknown')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}
