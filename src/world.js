import {dressWorld} from './worldAuthorship.js';
import {createContinentalWorld} from './continentWorld.js';
import {reconstructEchoryn,nearbyEchorynTrees} from './echorynLayout.js';
import {orrakaiWalkLevel} from './orrakaiLayout.js';
import {applyAuthoredLandscapes} from './authoredLandscapes.js';
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
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import { applyCoopAggroRange } from './coopEnemyScaling.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';
import { applyPublishedWorldOverride } from './developerWorldPersistence.js';

// -----------------------------------------------------------------------------
// WORLD CREATION
// -----------------------------------------------------------------------------

export function createWorld(options = {}) {
  if (!options.legacy) return createContinentalWorld(options);
  const world = createOverworldMap();
  if (options.skipPublishedOverride) world.editorSkipPublishedOverride = true;

  return normalizeWorld(world);
}

export function normalizeWorld(world) {
  const safeWorld = world || {};
  if (safeWorld.continentId === 'runalis') return safeWorld;

  safeWorld.mode = safeWorld.mode || 'overworld';
  safeWorld.name = normalizePlayerFacingWorldName(safeWorld.name, ACT1_OVERWORLD_DISPLAY_NAME);

  safeWorld.tiles = Array.isArray(safeWorld.tiles) ? safeWorld.tiles : [];
  safeWorld.objects = Array.isArray(safeWorld.objects) ? safeWorld.objects : [];
  safeWorld.enemies = Array.isArray(safeWorld.enemies) ? safeWorld.enemies : [];
  safeWorld.drops = Array.isArray(safeWorld.drops) ? safeWorld.drops : [];
  safeWorld.effects = Array.isArray(safeWorld.effects) ? safeWorld.effects : [];
  safeWorld.combatEffects = Array.isArray(safeWorld.combatEffects) ? safeWorld.combatEffects : [];

  safeWorld.width = getWorldWidth(safeWorld);
  safeWorld.height = getWorldHeight(safeWorld);

  if (!safeWorld.editorSkipPublishedOverride) {
    applyPublishedWorldOverride(safeWorld);
  }

  return reconstructEchoryn(applyAuthoredLandscapes(dressWorld(safeWorld)));
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
  if(pointInsideEncounterBarrier(world.encounterBarriers,worldX,worldY)||pointInsideEncounterBarrier(world.arenaBarriers,worldX,worldY))return false;

  return isTilePassable(world, tileX, tileY)&&!nearbyEchorynTrees(world,worldX,worldY).some(t=>Math.hypot(worldX-t.x,worldY-t.y)<9*t.size)&&!world.continentRuntime?.blocksAt?.(worldX,worldY);
}

export function isActorPositionPassable(world, worldX, worldY, radius = 10) {
  if (!world?.tiles?.length) return false;

  const safeRadius = Math.max(0, Number(radius || 0));
  const points = [
    [worldX, worldY],
    [worldX - safeRadius, worldY],
    [worldX + safeRadius, worldY],
    [worldX, worldY - safeRadius],
    [worldX, worldY + safeRadius]
  ];

  return points.every(([x, y]) => isPassable(world, x, y));
}

export function hasLineOfSight(world, fromX, fromY, toX, toY, options = {}) {
  if (!world?.tiles?.length) return false;

  const startX = Number(fromX || 0);
  const startY = Number(fromY || 0);
  const endX = Number(toX || 0);
  const endY = Number(toY || 0);
  const distance = Math.hypot(endX - startX, endY - startY);

  if (!Number.isFinite(distance)) return false;
  if (distance <= Math.max(2, Number(options.nearDistance || 6))&&!world.encounterBarriers?.length&&!world.arenaBarriers?.length) return true;

  const step = Math.max(6, Math.min(TILE / 2, Number(options.step || TILE / 3)));
  const steps = Math.max(1, Math.ceil(distance / step));
  const startSkip = Math.max(0, Math.floor(Number(options.startSkip || 0)));
  const endSkip = Math.max(0, Math.floor(Number(options.endSkip || 0)));

  // Exact segment/rectangle clipping catches thin conjured walls even when a
  // fast projectile or a diagonal ray skips them between terrain samples.
  for(const b of [...(world.encounterBarriers||[]),...(world.arenaBarriers||[])]){
    let low=startSkip/steps,high=1-endSkip/steps;
    for(const [origin,delta,min,max] of [[startX,endX-startX,b.x,b.x+b.w],[startY,endY-startY,b.y,b.y+b.h]]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max){high=-1;break;}}
      else {const a=(min-origin)/delta,z=(max-origin)/delta;low=Math.max(low,Math.min(a,z));high=Math.min(high,Math.max(a,z));}
    }
    if(low<=high&&high>=0&&low<=1)return false;
  }

  for (let i = startSkip; i <= steps - endSkip; i++) {
    const t = i / steps;
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t;

    if (!isPassable(world, x, y)) return false;
  }

  return true;
}

export function moveActorWithCollision(actor, world, deltaX, deltaY, radius = null) {
  if (!actor || !world?.tiles?.length) return false;

  const safeRadius = Math.max(4, Number(radius ?? actor.radius ?? actor.r ?? 10));
  const totalDx = Number(deltaX || 0);
  const totalDy = Number(deltaY || 0);
  const distance = Math.hypot(totalDx, totalDy);
  const maxStep = Math.max(6, Math.min(TILE / 3, safeRadius * 0.75));
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  let movedAny = false;

  for (let i = 0; i < steps; i++) {
    movedAny = moveActorCollisionStep(actor, world, totalDx / steps, totalDy / steps, safeRadius) || movedAny;
  }
  if (world.orrakaiRevision) actor.walkLevel = orrakaiWalkLevel(actor.x, actor.y);
  else if (world.echorynRevision) actor.walkLevel=getTileAtWorld(world,actor.x,actor.y)?.elevation||0;

  return movedAny;
}

function moveActorCollisionStep(actor, world, deltaX, deltaY, safeRadius) {
  const start = clampToWorld(world, Number(actor.x || 0), Number(actor.y || 0), safeRadius);

  if (!isActorPositionPassable(world, start.x, start.y, safeRadius)) {
    const nearest = findNearestActorPassablePoint(world, start.x, start.y, safeRadius, 10);
    actor.x = nearest.x;
    actor.y = nearest.y;
    return false;
  }

  let moved = false;
  const nextX = start.x + Number(deltaX || 0);
  const nextY = start.y + Number(deltaY || 0);
  const clampedFull = clampToWorld(world, nextX, nextY, safeRadius);

  if (isActorPositionPassable(world, clampedFull.x, clampedFull.y, safeRadius)) {
    actor.x = clampedFull.x;
    actor.y = clampedFull.y;
    return true;
  }

  const clampedX = clampToWorld(world, nextX, start.y, safeRadius);
  if (isActorPositionPassable(world, clampedX.x, clampedX.y, safeRadius)) {
    actor.x = clampedX.x;
    actor.y = clampedX.y;
    moved = true;
  }

  const clampedY = clampToWorld(world, actor.x, nextY, safeRadius);
  if (isActorPositionPassable(world, clampedY.x, clampedY.y, safeRadius)) {
    actor.x = clampedY.x;
    actor.y = clampedY.y;
    moved = true;
  }

  return moved;
}

function pointInsideEncounterBarrier(barriers,x,y){if(!barriers)return false;for(const b of barriers)if(x>=b.x&&y>=b.y&&x<=b.x+b.w&&y<=b.y+b.h)return true;return false;}
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

export function findNearestActorPassablePoint(world, worldX, worldY, radius = 10, maxRadiusTiles = 8) {
  if (isActorPositionPassable(world, worldX, worldY, radius)) {
    return {
      x: worldX,
      y: worldY
    };
  }

  const startTileX = worldToTile(worldX);
  const startTileY = worldToTile(worldY);

  for (let searchRadius = 1; searchRadius <= maxRadiusTiles; searchRadius++) {
    for (let oy = -searchRadius; oy <= searchRadius; oy++) {
      for (let ox = -searchRadius; ox <= searchRadius; ox++) {
        if (Math.abs(ox) !== searchRadius && Math.abs(oy) !== searchRadius) continue;

        const x = (startTileX + ox) * TILE + TILE / 2;
        const y = (startTileY + oy) * TILE + TILE / 2;

        if (!isActorPositionPassable(world, x, y, radius)) continue;

        return { x, y };
      }
    }
  }

  return findNearestPassablePoint(world, worldX, worldY, maxRadiusTiles);
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

  return applyCoopAggroRange(applyEnemyStrengthScaling({
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
  }), stats.aggroRange || 220);
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
