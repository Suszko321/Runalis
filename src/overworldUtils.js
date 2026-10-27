import {LEGACY_ENEMY_CLUSTER_NAMES} from './enemyIdentityAliases.js';
// overworldUtils.js
// Shared overworld constants, region logic, map context creation,
// noise helpers, mask helpers, factories, and metadata.
//
// Used by:
// - overworldMap.js
// - overworldTerrain.js
// - overworldEntities.js

import { TILE } from './data.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import {echorynRegionAt} from './echorynGeography.js';

// -----------------------------------------------------------------------------
// MAP CONFIG
// -----------------------------------------------------------------------------

export const BASE_OVERWORLD_W = 320;
export const BASE_OVERWORLD_H = 240;
export const OVERWORLD_W = BASE_OVERWORLD_W * 2;
export const OVERWORLD_H = BASE_OVERWORLD_H * 2;
export const OVERWORLD_AREA_SCALE = (OVERWORLD_W * OVERWORLD_H) / (BASE_OVERWORLD_W * BASE_OVERWORLD_H);

export const START_TILE_X = 11;
export const START_TILE_Y = 27;

// Shared authored anchors for the expanded Act I frontier. Systems that place
// entrances, quest givers, terrain clearings, and roads should use these points
// so the larger map remains coherent.
export const ACT1_LANDMARKS = {
  outpost: [14, 28],
  infiniteTower: [44, 27],
  pilgrimRoadGate: [48, 18],
  hollowGrove: [76, 51],
  ashenOrchard: [110, 90],
  hungryShrine: [235, 55],
  pilgrimBridge: [250, 100],
  brokenChapel: [445, 72],
  castleVeyr: [565, 105],
  thornrootHollow: [82, 165],
  riverbendCamp: [72, 204],
  mirrorGrove: [112, 270],
  saltwellCamp: [105, 355],
  abandonedMine: [233, 315],
  lanternMarsh: [245, 325],
  ironMire: [285, 345],
  hunterCamp: [395, 160],
  watcherRidge: [510, 190],
  oldHollow: [385, 340],
  demonCultLair: [560, 390]
};

export const REGION = {
  OUTPOST: 'outpost',
  HOLLOW_ROAD: 'hollowRoad',
  THORNWOOD: 'thornwood',
  GRAVEFIELDS: 'gravefields',
  CHAPEL_RUINS: 'chapelRuins',
  HUNTER_REACH: 'hunterReach',
  RIVERLANDS: 'riverlands',
  IRON_MIRE: 'ironMire',
  OLD_HOLLOW: 'oldHollow',
  HIGH_DANGER: 'highDanger'
};

// -----------------------------------------------------------------------------
// MAP CONTEXT
// -----------------------------------------------------------------------------

export function createMapContext() {
  const tiles = [];

  for (let y = 0; y < OVERWORLD_H; y++) {
    const row = [];

    for (let x = 0; x < OVERWORLD_W; x++) {
      row.push(makeTile('grass', noise01(x, y, 'baseVariant') > 0.5 ? 1 : 0, {
        region: getRegionForTile(x, y),
        elevation: 0,
        moisture: 0,
        danger: 0
      }));
    }

    tiles.push(row);
  }

  return {
    width: OVERWORLD_W,
    height: OVERWORLD_H,
    tiles,
    masks: {
      road: createNumberGrid(0),
      water: createNumberGrid(0),
      landmark: createNumberGrid(0)
    }
  };
}

export function createRegionMap() {
  const regionMap = [];

  for (let y = 0; y < OVERWORLD_H; y++) {
    const row = [];

    for (let x = 0; x < OVERWORLD_W; x++) {
      row.push(getRegionForTile(x, y));
    }

    regionMap.push(row);
  }

  return regionMap;
}

export function getRegionForTile(x, y) {
  return echorynRegionAt(x,y).id;
}

// -----------------------------------------------------------------------------
// REGION METADATA
// -----------------------------------------------------------------------------

export function createRegionMetadata() {
  return [
    {
      id: REGION.OUTPOST,
      name: 'Starting Outpost',
      recommendedLevel: 1,
      description: 'Safe starting hub with class trainers, campfire, smith, and first quest.'
    },
    {
      id: REGION.HOLLOW_ROAD,
      name: 'Blighted Road',
      recommendedLevel: 1,
      description: 'Early combat road with Blighted Corpses and basic gathering resources.'
    },
    {
      id: REGION.THORNWOOD,
      name: 'Thornwood Grove',
      recommendedLevel: 4,
      description: 'Wilder forest zone connected to Thornbinder resources and beasts.'
    },
    {
      id: REGION.GRAVEFIELDS,
      name: 'The Gravefields',
      recommendedLevel: 6,
      description: 'Gravecaller-themed region with gravecaps, bones, and gravebound.'
    },
    {
      id: REGION.CHAPEL_RUINS,
      name: 'Broken Chapel Ruins',
      recommendedLevel: 8,
      description: 'Oathkeeper-flavored ruins with stone, runes, and stronger gravebound.'
    },
    {
      id: REGION.HUNTER_REACH,
      name: 'Hunter Reach',
      recommendedLevel: 6,
      description: 'Fellhunter-flavored wildlands with wolves, camps, traps, and trail resources.'
    },
    {
      id: REGION.RIVERLANDS,
      name: 'Riverlands',
      recommendedLevel: 3,
      description: 'Fishing, reeds, and safer southern exploration.'
    },
    {
      id: REGION.IRON_MIRE,
      name: 'Iron Mire',
      recommendedLevel: 10,
      description: 'Mining region with ore, bones, and tougher enemies.'
    },
    {
      id: REGION.OLD_HOLLOW,
      name: 'Old Blighted',
      recommendedLevel: 12,
      description: 'First major dungeon approach and higher-risk gravebound territory.'
    },
    {
      id: REGION.HIGH_DANGER,
      name: 'Outer Wilds',
      recommendedLevel: 14,
      description: 'Unstable frontier territory for later expansion.'
    }
  ];
}

// -----------------------------------------------------------------------------
// TILE HELPERS
// -----------------------------------------------------------------------------

export function makeTile(biome, variant = 0, extra = {}) {
  return {
    biome,
    variant,
    ...extra
  };
}

export function setTile(ctx, x, y, biome, variant = null) {
  if (!ctx?.tiles?.[y]?.[x]) return;

  ctx.tiles[y][x].biome = biome;

  if (variant !== null) {
    ctx.tiles[y][x].variant = variant;
  } else {
    ctx.tiles[y][x].variant = noise01(x, y, `variant-${biome}`) > 0.5 ? 1 : 0;
  }
}

export function inBounds(ctx, x, y) {
  return x >= 0 && y >= 0 && x < ctx.width && y < ctx.height;
}

export function forEachTile(ctx, fn) {
  for (let y = 0; y < ctx.height; y++) {
    for (let x = 0; x < ctx.width; x++) {
      fn(x, y, ctx.tiles[y][x]);
    }
  }
}

export function chooseHighestBiome(scores) {
  let best = 'grass';
  let bestScore = -Infinity;

  for (const [biome, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = biome;
      bestScore = score;
    }
  }

  return best;
}

// -----------------------------------------------------------------------------
// MASK HELPERS
// -----------------------------------------------------------------------------

export function createNumberGrid(fill = 0) {
  const grid = [];

  for (let y = 0; y < OVERWORLD_H; y++) {
    const row = [];

    for (let x = 0; x < OVERWORLD_W; x++) {
      row.push(fill);
    }

    grid.push(row);
  }

  return grid;
}

export function addSoftCircleToMask(mask, cx, cy, radius, strength = 1) {
  const minX = Math.floor(cx - radius - 2);
  const maxX = Math.ceil(cx + radius + 2);
  const minY = Math.floor(cy - radius - 2);
  const maxY = Math.ceil(cy + radius + 2);

  for (let y = minY; y <= maxY; y++) {
    if (!mask[y]) continue;

    for (let x = minX; x <= maxX; x++) {
      if (mask[y][x] === undefined) continue;

      const d = distance(x, y, cx, cy);
      if (d > radius + 1.5) continue;

      const falloff = clamp(1 - d / Math.max(0.001, radius), 0, 1);
      const amount = smoothstep(0, 1, falloff) * strength;

      mask[y][x] = clamp(mask[y][x] + amount, 0, 1);
    }
  }
}

export function blurMaskToBiome(ctx, mask, biome, threshold) {
  const blurred = blurMask(mask, 1);

  for (let y = 0; y < ctx.height; y++) {
    for (let x = 0; x < ctx.width; x++) {
      const value = blurred[y][x];

      if (value >= threshold) {
        setTile(ctx, x, y, biome);
      }
    }
  }
}

export function blurMask(mask, passes = 1) {
  let current = mask.map(row => row.slice());

  for (let pass = 0; pass < passes; pass++) {
    const next = current.map(row => row.slice());

    for (let y = 1; y < current.length - 1; y++) {
      for (let x = 1; x < current[y].length - 1; x++) {
        let sum = 0;
        let count = 0;

        for (let yy = y - 1; yy <= y + 1; yy++) {
          for (let xx = x - 1; xx <= x + 1; xx++) {
            sum += current[yy][xx];
            count++;
          }
        }

        next[y][x] = sum / count;
      }
    }

    current = next;
  }

  return current;
}

export function sampleMask(mask, x, y) {
  return mask?.[y]?.[x] || 0;
}

export function sampleMaskNeighborhood(mask, x, y, radius = 1) {
  let sum = 0;
  let count = 0;

  for (let yy = y - radius; yy <= y + radius; yy++) {
    for (let xx = x - radius; xx <= x + radius; xx++) {
      if (mask?.[yy]?.[xx] === undefined) continue;

      sum += mask[yy][xx];
      count++;
    }
  }

  return count ? sum / count : 0;
}

// -----------------------------------------------------------------------------
// TERRAIN PAINTING HELPERS
// -----------------------------------------------------------------------------

export function paintOrganicRiver(ctx, points, options = {}) {
  const width = options.width || 4;
  const seed = options.seed || 'river';
  const wobble = options.wobble || 1.5;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const steps = Math.max(8, Math.ceil(distance(a[0], a[1], b[0], b[1]) * 1.8));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = lerp(a[0], b[0], t);
      const y = lerp(a[1], b[1], t);

      const wx = noiseSigned(x, y, `${seed}-x-${i}`) * wobble;
      const wy = noiseSigned(x, y, `${seed}-y-${i}`) * wobble;

      const localWidth = width + noiseSigned(x, y, `${seed}-width-${i}`) * 1.25;

      addSoftCircleToMask(ctx.masks.water, x + wx, y + wy, localWidth, 1.0);
    }
  }
}

export function paintOrganicTrail(ctx, points, width, seed) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const steps = Math.max(10, Math.ceil(distance(a[0], a[1], b[0], b[1]) * 2.2));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = lerp(a[0], b[0], t);
      const y = lerp(a[1], b[1], t);

      const bend = Math.sin(t * Math.PI) * 1.4;
      const wx = noiseSigned(x, y, `${seed}-trail-x-${i}`) * bend;
      const wy = noiseSigned(x, y, `${seed}-trail-y-${i}`) * bend;

      const localWidth = width + noiseSigned(x, y, `${seed}-trail-w-${i}`) * 0.75;

      addSoftCircleToMask(ctx.masks.road, x + wx, y + wy, localWidth, 1.0);
    }
  }
}

export function paintOrganicBlob(ctx, cx, cy, rx, ry, biome, options = {}) {
  const seed = options.seed || `${biome}-${cx}-${cy}`;
  const chance = options.chance ?? 1;
  const softness = options.softness ?? 0.5;

  const minX = Math.floor(cx - rx - 3);
  const maxX = Math.ceil(cx + rx + 3);
  const minY = Math.floor(cy - ry - 3);
  const maxY = Math.ceil(cy + ry + 3);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!inBounds(ctx, x, y)) continue;

      const dx = (x - cx) / Math.max(1, rx);
      const dy = (y - cy) / Math.max(1, ry);

      const dist = Math.sqrt(dx * dx + dy * dy);
      const edgeNoise = noiseSigned(x, y, `${seed}-edge`) * softness;
      const threshold = 1 + edgeNoise;

      if (dist > threshold) continue;

      const inner = 1 - dist;
      const n = noise01(x, y, `${seed}-paint`);

      if (n > chance * clamp(inner + 0.55, 0.25, 1)) continue;

      setTile(ctx, x, y, biome);

      if (options.markLandmark !== false) {
        ctx.masks.landmark[y][x] = Math.max(
          ctx.masks.landmark[y][x],
          clamp(inner + 0.25, 0, 1)
        );
      }
    }
  }
}

// -----------------------------------------------------------------------------
// OBJECT / ENEMY FACTORIES
// -----------------------------------------------------------------------------

export function makeObject(kind, id, name, tileX, tileY, extra = {}) {
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

export function makeDecorObject(kind, id, name, tileX, tileY, extra = {}) {
  return {
    id,
    kind,
    name,
    decorative: true,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    r: extra.r || 12,
    blocksMovement: false,
    ...extra
  };
}

export function resourceRespawn(respawnTime = 45) {
  return {
    depleted: false,
    respawn: 0,
    respawnTime
  };
}

export function scatterObjects(objects, kind, name, idPrefix, points) {
  points.forEach(([x, y], index) => {
    objects.push(makeObject(kind, `${idPrefix}-${index}`, name, x, y, resourceRespawn()));
  });
}

export function makeEnemy(kind, id, name, tileX, tileY, stats = {}) {
  const defaults = getEnemyDefaults(kind, stats.tier || 1);
  const hp = stats.hp || stats.maxHp || defaults.hp;
  const damage = stats.damage || stats.dmg || defaults.damage;

  return applyEnemyStrengthScaling({
    id,
    kind,
    name,

    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,

    r: stats.r || defaults.r,
    radius: stats.radius || stats.r || defaults.r,

    hp,
    maxHp: stats.maxHp || hp,

    damage,
    dmg: damage,

    xp: stats.xp || defaults.xp,
    speed: stats.speed || defaults.speed,

    aggroRange: stats.aggroRange || defaults.aggroRange,
    attackRange: stats.attackRange || defaults.attackRange,
    attackRate: stats.attackRate || defaults.attackRate,
    attackCooldown: 0,
    attackCd: 0,

    slowTimer: 0,
    hitFlash: 0,
    dead: false,
    remove: false,

    ...stats
  });
}

export function addEnemyCluster(enemies, kind, name, points, tier = 1) {
  points.forEach(([x, y], index) => {
    const id = `${kind}-${slugify(LEGACY_ENEMY_CLUSTER_NAMES[name] || name)}-${x}-${y}-${index}`;

    enemies.push(makeEnemy(kind, id, name, x, y, {
      tier,
      ...scaleEnemyStats(kind, tier)
    }));
  });
}

export function getEnemyDefaults(kind, tier = 1) {
  const scale = 1 + (tier - 1) * 0.38;

  if (kind === 'basicBeast') {
    return {
      hp: Math.floor(54 * scale),
      damage: Math.floor(7 * scale),
      xp: Math.floor(28 * scale),
      speed: 72,
      r: 15,
      aggroRange: 245,
      attackRange: 27,
      attackRate: 0.95
    };
  }

  if (kind === 'stalkerWolf') {
    return {
      hp: Math.floor(62 * scale),
      damage: Math.floor(9 * scale),
      xp: Math.floor(36 * scale),
      speed: 84,
      r: 15,
      aggroRange: 285,
      attackRange: 34,
      attackRate: 1.05
    };
  }

  if (kind === 'shieldKnight') {
    return {
      hp: Math.floor(118 * scale),
      damage: Math.floor(13 * scale),
      xp: Math.floor(70 * scale),
      speed: 40,
      r: 17,
      aggroRange: 255,
      attackRange: 34,
      attackRate: 1.25
    };
  }

  if (kind === 'archer') {
    return {
      hp: Math.floor(58 * scale),
      damage: Math.floor(9 * scale),
      xp: Math.floor(46 * scale),
      speed: 63,
      r: 14,
      aggroRange: 360,
      attackRange: 250,
      attackRate: 1.35
    };
  }

  if (kind === 'gravePriest') {
    return {
      hp: Math.floor(84 * scale),
      damage: Math.floor(8 * scale),
      xp: Math.floor(68 * scale),
      speed: 42,
      r: 15,
      aggroRange: 310,
      attackRange: 190,
      attackRate: 1.55
    };
  }

  if (kind === 'brute') {
    return {
      hp: Math.floor(160 * scale),
      damage: Math.floor(17 * scale),
      xp: Math.floor(82 * scale),
      speed: 34,
      r: 21,
      aggroRange: 255,
      attackRange: 45,
      attackRate: 1.7
    };
  }

  if (kind === 'wraith') {
    return {
      hp: Math.floor(72 * scale),
      damage: Math.floor(15 * scale),
      xp: Math.floor(72 * scale),
      speed: 74,
      r: 15,
      aggroRange: 330,
      attackRange: 34,
      attackRate: 1.05
    };
  }

  if (kind === 'exploder') {
    return {
      hp: Math.floor(50 * scale),
      damage: Math.floor(18 * scale),
      xp: Math.floor(40 * scale),
      speed: 92,
      r: 15,
      aggroRange: 300,
      attackRange: 50,
      attackRate: 1.0
    };
  }

  if (kind === 'ashWolf') {
    return {
      hp: Math.floor(58 * scale),
      damage: Math.floor(8 * scale),
      xp: Math.floor(32 * scale),
      speed: 76,
      r: 15,
      aggroRange: 245,
      attackRange: 26,
      attackRate: 0.95
    };
  }

  if (kind === 'gravebound') {
    return {
      hp: Math.floor(96 * scale),
      damage: Math.floor(13 * scale),
      xp: Math.floor(62 * scale),
      speed: 42,
      r: 16,
      aggroRange: 235,
      attackRange: 27,
      attackRate: 1.18
    };
  }

  if (kind === 'demonCultist' || kind === 'cultist') {
    return {
      hp: Math.floor(74 * scale),
      damage: Math.floor(11 * scale),
      xp: Math.floor(48 * scale),
      speed: 54,
      r: 15,
      aggroRange: 230,
      attackRange: 26,
      attackRate: 1.05
    };
  }

  if (kind === 'roadlessBandit') {
    return {
      hp: Math.floor(68 * scale),
      damage: Math.floor(9 * scale),
      xp: Math.floor(38 * scale),
      speed: 62,
      r: 15,
      aggroRange: 220,
      attackRange: 25,
      attackRate: 1.0
    };
  }

  if (kind === 'veyrWraith') {
    return {
      hp: Math.floor(92 * scale),
      damage: Math.floor(13 * scale),
      xp: Math.floor(70 * scale),
      speed: 52,
      r: 16,
      aggroRange: 250,
      attackRange: 28,
      attackRate: 1.15
    };
  }

  return {
    hp: Math.floor(42 * scale),
    damage: Math.floor(6 * scale),
    xp: Math.floor(20 * scale),
    speed: 50,
    r: 14,
    aggroRange: 220,
    attackRange: 24,
    attackRate: 1.05
  };
}

export function scaleEnemyStats(kind, tier) {
  const defaults = getEnemyDefaults(kind, tier);

  return {
    hp: defaults.hp,
    maxHp: defaults.hp,
    damage: defaults.damage,
    dmg: defaults.damage,
    xp: defaults.xp,
    speed: defaults.speed,
    r: defaults.r,
    radius: defaults.r,
    aggroRange: defaults.aggroRange,
    attackRange: defaults.attackRange,
    attackRate: defaults.attackRate
  };
}

// -----------------------------------------------------------------------------
// NOISE
// -----------------------------------------------------------------------------

export function layeredNoise(x, y, seed, lowFreq = 0.015, highFreq = 0.06) {
  const a = smoothNoise(x * lowFreq, y * lowFreq, seed);
  const b = smoothNoise(x * highFreq, y * highFreq, `${seed}-detail`);
  const c = smoothNoise(x * highFreq * 2.1, y * highFreq * 2.1, `${seed}-fine`);

  return clamp(a * 0.58 + b * 0.30 + c * 0.12, 0, 1);
}

export function warpedNoise(x, y, seed, freq = 0.02, warp = 12) {
  const wx = smoothNoise(x * freq, y * freq, `${seed}-warp-x`) * warp;
  const wy = smoothNoise(x * freq, y * freq, `${seed}-warp-y`) * warp;

  return smoothNoise((x + wx) * freq, (y + wy) * freq, seed);
}

export function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = smoothstep(0, 1, x - x0);
  const sy = smoothstep(0, 1, y - y0);

  const n00 = noise01(x0, y0, seed);
  const n10 = noise01(x1, y0, seed);
  const n01 = noise01(x0, y1, seed);
  const n11 = noise01(x1, y1, seed);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);

  return lerp(ix0, ix1, sy);
}

export function noise01(x, y, seed = 'seed') {
  let h = hashString(seed);
  h ^= Math.floor(x) * 374761393;
  h ^= Math.floor(y) * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);

  return ((h >>> 0) % 10000) / 10000;
}

export function noiseSigned(x, y, seed = 'seed') {
  return noise01(x, y, seed) * 2 - 1;
}

export function hashString(str) {
  let h = 2166136261;

  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

// -----------------------------------------------------------------------------
// GENERAL HELPERS
// -----------------------------------------------------------------------------

export function randomRangeFromNoise(min, max, x, y, seed) {
  return min + (max - min) * noise01(x, y, seed);
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function slugify(value) {
  return String(value || 'enemy')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
