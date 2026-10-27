// Temporary, host-owned overworld encounter persistence for major POIs.
//
// Static overworlds are rebuilt instead of saved wholesale. This module stores
// only defeated defender IDs and derives a readable encounter phase from them.

const STANDARD_RESPAWN_MS = 15 * 60 * 1000;
const ELITE_RESPAWN_MS = 45 * 60 * 1000;

export function normalizePoiEncounters(player) {
  if (!player) return {};
  player.poiEncounters = player.poiEncounters && typeof player.poiEncounters === 'object'
    ? player.poiEncounters
    : {};
  return player.poiEncounters;
}

export function recordPoiEnemyDefeat(player, enemy, world, now = Date.now()) {
  if (!player || !enemy?.majorPoiId || !enemy.id) return null;

  const encounters = normalizePoiEncounters(player);
  const encounter = encounters[enemy.majorPoiId] && typeof encounters[enemy.majorPoiId] === 'object'
    ? encounters[enemy.majorPoiId]
    : {};

  encounter.defeated = encounter.defeated && typeof encounter.defeated === 'object'
    ? encounter.defeated
    : {};

  encounter.defeated[enemy.id] = {
    role: enemy.guardRole || 'defender',
    defeatedAt: now,
    respawnAt: now + (enemy.isBoss || enemy.namedExteriorElite ? ELITE_RESPAWN_MS : STANDARD_RESPAWN_MS)
  };
  encounter.lastDefeatAt = now;
  const remaining = (world?.enemies || []).filter(candidate => {
    return candidate?.majorPoiId === enemy.majorPoiId &&
      candidate.id !== enemy.id &&
      !candidate.dead &&
      !candidate.remove &&
      Number(candidate.hp || 0) > 0;
  });
  if (!remaining.length) {
    encounter.clearedUntil = Math.max(...Object.values(encounter.defeated).map(record => Number(record?.respawnAt || 0)));
  }
  encounter.phase = deriveEncounterPhase(encounter.defeated, now, encounter.clearedUntil);
  encounters[enemy.majorPoiId] = encounter;

  syncPoiObjects(world, enemy.majorPoiId, encounter.phase);
  return encounter;
}

export function recordPoiCacheClaim(player, cache, now = Date.now()) {
  if (!player || !cache?.majorPoiId || !cache.id) return;

  const encounters = normalizePoiEncounters(player);
  const encounter = encounters[cache.majorPoiId] && typeof encounters[cache.majorPoiId] === 'object'
    ? encounters[cache.majorPoiId]
    : {};

  encounter.claimedCaches = encounter.claimedCaches && typeof encounter.claimedCaches === 'object'
    ? encounter.claimedCaches
    : {};
  encounter.claimedCaches[cache.id] = now + ELITE_RESPAWN_MS;
  encounters[cache.majorPoiId] = encounter;
}

export function applyPoiEncounterState(player, world, now = Date.now()) {
  if (!player || !world) return;

  const encounters = normalizePoiEncounters(player);

  for (const [poiId, encounter] of Object.entries(encounters)) {
    if (!encounter || typeof encounter !== 'object') continue;

    encounter.defeated = encounter.defeated && typeof encounter.defeated === 'object'
      ? encounter.defeated
      : {};
    encounter.claimedCaches = encounter.claimedCaches && typeof encounter.claimedCaches === 'object'
      ? encounter.claimedCaches
      : {};

    for (const [enemyId, record] of Object.entries(encounter.defeated)) {
      if (!record || Number(record.respawnAt || 0) <= now) {
        delete encounter.defeated[enemyId];
      }
    }

    encounter.phase = deriveEncounterPhase(encounter.defeated, now, encounter.clearedUntil);
    syncPoiObjects(world, poiId, encounter.phase);
  }

  world.objects = (world.objects || []).filter(object => {
    if (!object?.majorPoiId || object.kind !== 'worldCache' || !object.id) return true;
    const claimedUntil = Number(encounters[object.majorPoiId]?.claimedCaches?.[object.id] || 0);
    return claimedUntil <= now;
  });

  world.enemies = (world.enemies || []).filter(enemy => {
    if (!enemy?.majorPoiId || !enemy.id) return true;
    const record = encounters[enemy.majorPoiId]?.defeated?.[enemy.id];
    return !record || Number(record.respawnAt || 0) <= now;
  });

  const roadOpen = Boolean(
    player.story?.flags?.act1Complete ||
    player.travel?.routes?.pilgrimRoad?.unlocked
  );
  if (roadOpen) syncPoiObjects(world, 'frontierRoadGate', 'entranceSecured');
}

export function getPoiEncounterPhase(player, poiId, now = Date.now()) {
  const encounter = normalizePoiEncounters(player)[poiId];
  return deriveEncounterPhase(encounter?.defeated || {}, now, encounter?.clearedUntil);
}

function deriveEncounterPhase(defeated, now, clearedUntil = 0) {
  const active = Object.values(defeated || {}).filter(record => {
    return record && Number(record.respawnAt || 0) > now;
  });

  if (!active.length) return 'hostile';
  if (Number(clearedUntil || 0) > now) return 'fullyCleared';

  const roles = new Set(active.map(record => record.role || 'defender'));
  if (roles.has('entranceGuard') || roles.has('gateCaptain')) return 'entranceSecured';
  if (roles.has('gateDefender')) return 'gateCleared';
  if (roles.has('approachPatrol') || roles.has('perimeterGuard')) return 'partiallyCleared';
  return 'partiallyCleared';
}

function syncPoiObjects(world, poiId, phase) {
  for (const object of world?.objects || []) {
    if (object?.majorPoiId !== poiId) continue;
    object.encounterState = phase;
  }
}
