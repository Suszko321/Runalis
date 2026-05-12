// world.js
// Runalis world bridge.
// This file should stay small.
//
// Responsibilities:
// - Create the active overworld through overworldMap.js.
// - Centralize tile lookup.
// - Centralize passability checks.
// - Keep world compatibility stable for main.js, dungeonSystem.js, render.js, and combat.
//
// New direction:
// - The first real overworld will live in overworldMap.js.
// - world.js should NOT become a giant map file.
// - Dungeon generation lives in dungeonSystem.js.

import { TILE, BIOMES } from './data.js';
import { createOverworldMap } from './overworldMap.js';

// -----------------------------------------------------------------------------
// WORLD CREATION
// -----------------------------------------------------------------------------

export function createWorld() {
  const world = createOverworldMap();

  return normalizeWorld(world);
}

export function normalizeWorld(world) {
  const safeWorld = world || {};

  safeWorld.mode = safeWorld.mode || 'overworld';
  safeWorld.name = safeWorld.name || 'Sol Land';

  safeWorld.tiles = Array.isArray(safeWorld.tiles) ? safeWorld.tiles : [];
  safeWorld.objects = Array.isArray(safeWorld.objects) ? safeWorld.objects : [];
  safeWorld.enemies = Array.isArray(safeWorld.enemies) ? safeWorld.enemies : [];
  safeWorld.drops = Array.isArray(safeWorld.drops) ? safeWorld.drops : [];
  safeWorld.effects = Array.isArray(safeWorld.effects) ? safeWorld.effects : [];
  safeWorld.combatEffects = Array.isArray(safeWorld.combatEffects) ? safeWorld.combatEffects : [];

  safeWorld.width = getWorldWidth(safeWorld);
  safeWorld.height = getWorldHeight(safeWorld);

  return safeWorld;
}

// -----------------------------------------------------------------------------
// TILE HELPERS
// -----------------------------------------------------------------------------

export function getWorldWidth(world) {
  if (!world?.tiles?.length) return 0;

  return world.tiles[0]?.length || 0;
}

export function getWorldHeight(world) {
  return world?.tiles?.length || 0;
}

export function getWorldPixelWidth(world) {
  return getWorldWidth(world) * TILE;
}

export function getWorldPixelHeight(world) {
  return getWorldHeight(world) * TILE;
}

export function worldToTile(value) {
  return Math.floor(value / TILE);
}

export function tileToWorld(value) {
  return value * TILE;
}

export function getTile(world, tileX, tileY) {
  if (!world?.tiles) return null;

  const x = Math.floor(tileX);
  const y = Math.floor(tileY);

  if (y < 0 || y >= world.tiles.length) return null;
  if (x < 0 || x >= (world.tiles[y]?.length || 0)) return null;

  return world.tiles[y][x] || null;
}

export function getTileAtWorld(world, worldX, worldY) {
  return getTile(world, worldToTile(worldX), worldToTile(worldY));
}

export function getBiomeIdAtWorld(world, worldX, worldY) {
  const tile = getTileAtWorld(world, worldX, worldY);

  return tile?.biome || null;
}

export function getBiomeAtWorld(world, worldX, worldY) {
  const biomeId = getBiomeIdAtWorld(world, worldX, worldY);

  return biomeId ? BIOMES[biomeId] || null : null;
}

// -----------------------------------------------------------------------------
// PASSABILITY
// -----------------------------------------------------------------------------

export function isPassable(world, worldX, worldY) {
  if (!world?.tiles?.length) return false;

  const tileX = worldToTile(worldX);
  const tileY = worldToTile(worldY);

  return isTilePassable(world, tileX, tileY);
}

export function isTilePassable(world, tileX, tileY) {
  const tile = getTile(world, tileX, tileY);

  if (!tile) return false;

  const biomeId = tile.biome;
  const biome = BIOMES?.[biomeId];

  // Unknown biome is treated as passable unless it is clearly intended as a wall.
  // This avoids old saves or newly-added visual biomes soft-locking the player.
  if (!biome) {
    return !isHardBlockedBiomeId(biomeId);
  }

  if (biome.passable === false) return false;

  if (tile.passable === false) return false;

  return true;
}

export function isHardBlockedBiomeId(biomeId) {
  return [
    'water',
    'wall',
    'deepWater',
    'void',
    'cliff',
    'mountain',
    'blocked'
  ].includes(biomeId);
}

export function clampToWorld(world, worldX, worldY, padding = 0) {
  const maxX = Math.max(0, getWorldPixelWidth(world) - padding);
  const maxY = Math.max(0, getWorldPixelHeight(world) - padding);

  return {
    x: clamp(worldX, padding, maxX),
    y: clamp(worldY, padding, maxY)
  };
}

export function findNearestPassablePoint(world, worldX, worldY, maxRadiusTiles = 8) {
  if (isPassable(world, worldX, worldY)) {
    return {
      x: worldX,
      y: worldY
    };
  }

  const startTileX = worldToTile(worldX);
  const startTileY = worldToTile(worldY);

  for (let radius = 1; radius <= maxRadiusTiles; radius++) {
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        if (Math.abs(ox) !== radius && Math.abs(oy) !== radius) continue;

        const tx = startTileX + ox;
        const ty = startTileY + oy;

        if (!isTilePassable(world, tx, ty)) continue;

        return {
          x: tx * TILE + TILE / 2,
          y: ty * TILE + TILE / 2
        };
      }
    }
  }

  return {
    x: worldX,
    y: worldY
  };
}

// -----------------------------------------------------------------------------
// OBJECT HELPERS
// -----------------------------------------------------------------------------

export function getObjectsNear(world, worldX, worldY, range) {
  if (!world?.objects) return [];

  const safeRange = Math.max(0, range || 0);

  return world.objects.filter(object => {
    if (!object || object.depleted) return false;

    const distance = Math.hypot(object.x - worldX, object.y - worldY);
    return distance <= safeRange;
  });
}

export function getNearestObject(world, worldX, worldY, range, filter = null) {
  const objects = getObjectsNear(world, worldX, worldY, range);

  let best = null;
  let bestDistance = Infinity;

  for (const object of objects) {
    if (filter && !filter(object)) continue;

    const distance = Math.hypot(object.x - worldX, object.y - worldY);

    if (distance < bestDistance) {
      best = object;
      bestDistance = distance;
    }
  }

  return best;
}

export function addWorldObject(world, object) {
  if (!world || !object) return null;

  world.objects = Array.isArray(world.objects) ? world.objects : [];
  world.objects.push(object);

  return object;
}

export function removeWorldObject(world, objectOrId) {
  if (!world?.objects) return false;

  const id = typeof objectOrId === 'string' ? objectOrId : objectOrId?.id;

  const before = world.objects.length;

  world.objects = world.objects.filter(object => {
    if (!object) return false;
    if (id) return object.id !== id;
    return object !== objectOrId;
  });

  return world.objects.length !== before;
}

// -----------------------------------------------------------------------------
// ENEMY HELPERS
// -----------------------------------------------------------------------------

export function addEnemy(world, enemy) {
  if (!world || !enemy) return null;

  world.enemies = Array.isArray(world.enemies) ? world.enemies : [];
  world.enemies.push(enemy);

  return enemy;
}

export function removeEnemy(world, enemyOrId) {
  if (!world?.enemies) return false;

  const id = typeof enemyOrId === 'string' ? enemyOrId : enemyOrId?.id;

  const before = world.enemies.length;

  world.enemies = world.enemies.filter(enemy => {
    if (!enemy) return false;
    if (id) return enemy.id !== id;
    return enemy !== enemyOrId;
  });

  return world.enemies.length !== before;
}

export function getEnemiesNear(world, worldX, worldY, range) {
  if (!world?.enemies) return [];

  const safeRange = Math.max(0, range || 0);

  return world.enemies.filter(enemy => {
    if (!enemy || enemy.dead || enemy.hp <= 0) return false;

    const distance = Math.hypot(enemy.x - worldX, enemy.y - worldY);
    return distance <= safeRange;
  });
}

// -----------------------------------------------------------------------------
// SPAWN HELPERS
// -----------------------------------------------------------------------------

export function makeWorldObject(kind, id, name, tileX, tileY, extra = {}) {
  return {
    id,
    kind,
    name,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    r: extra.r || 14,
    ...extra
  };
}

export function makeEnemy(kind, id, name, tileX, tileY, stats = {}) {
  const hp = stats.hp || stats.maxHp || 30;
  const damage = stats.damage || stats.dmg || 5;

  return {
    id,
    kind,
    name,

    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,

    r: stats.r || stats.radius || 14,
    radius: stats.radius || stats.r || 14,

    hp,
    maxHp: stats.maxHp || hp,

    damage,
    dmg: damage,

    xp: stats.xp || 10,
    speed: stats.speed || 50,

    aggroRange: stats.aggroRange || 220,
    attackRange: stats.attackRange || 24,
    attackRate: stats.attackRate || 1.05,
    attackCooldown: 0,
    attackCd: 0,

    slowTimer: 0,
    hitFlash: 0,
    dead: false,
    remove: false,

    ...stats
  };
}

export function makeTile(biome, variant = 0, extra = {}) {
  return {
    biome,
    variant,
    ...extra
  };
}

// -----------------------------------------------------------------------------
// UTILITY
// -----------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}