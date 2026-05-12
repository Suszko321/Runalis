// overworldTerrain.js
// Hidden tile terrain generation + seamless terrainFeatures generation.
//
// Used by overworldMap.js.
//
// This script owns:
// - hidden gameplay terrain generation
// - water/path/landmark tile masks
// - terrain smoothing
// - seamless visual terrain features for terrainRenderer.js

import { TILE } from './data.js';

import {
  OVERWORLD_W,
  OVERWORLD_H,
  START_TILE_X,
  START_TILE_Y,
  REGION,

  forEachTile,
  setTile,
  inBounds,

  chooseHighestBiome,

  blurMaskToBiome,
  sampleMask,
  sampleMaskNeighborhood,

  paintOrganicRiver,
  paintOrganicTrail,
  paintOrganicBlob,

  layeredNoise,
  warpedNoise,
  noise01,
  noiseSigned,

  distance,
  lerp,
  clamp
} from './overworldUtils.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function buildOverworldTerrain(ctx) {
  buildOrganicBaseTerrain(ctx);
  carveWaterSystems(ctx);
  carveRoadNetwork(ctx);
  shapeMajorLandmarks(ctx);
  softenTerrain(ctx, 2);
  cleanSpawnArea(ctx);
  reinforceOuterBounds(ctx);

  return ctx;
}

export function createTerrainFeatures(ctx) {
  return {
    version: 1,

    base: {
      color: '#172a1b',
      shadowColor: '#0d1710',
      noiseSeed: 'sol-land-base'
    },

    biomeBlobs: createBiomeBlobFeatures(),
    roads: createRoadFeatures(),
    rivers: createRiverFeatures(),
    lakes: createLakeFeatures(),
    ruinFields: createRuinFieldFeatures(),
    forestMasses: createForestMassFeatures(),
    cliffs: createCliffFeatures(),
    detailFields: createDetailFieldFeatures(),

    worldPixelWidth: OVERWORLD_W * TILE,
    worldPixelHeight: OVERWORLD_H * TILE
  };
}

// -----------------------------------------------------------------------------
// HIDDEN TILE TERRAIN GENERATION
// -----------------------------------------------------------------------------

function buildOrganicBaseTerrain(ctx) {
  forEachTile(ctx, (x, y, tile) => {
    const region = ctx.regionMap[y][x];

    const continental = layeredNoise(x, y, 'continental', 0.006, 0.022);
    const local = layeredNoise(x, y, 'local', 0.022, 0.075);
    const moisture = layeredNoise(x + 50, y - 30, 'moisture', 0.012, 0.055);
    const corruption = layeredNoise(x - 80, y + 45, 'corruption', 0.014, 0.064);

    let grassScore = 0.62;
    let pathScore = 0.0;
    let deadScore = 0.0;
    let ruinScore = 0.0;
    let oreScore = 0.0;

    if (region === REGION.OUTPOST) {
      grassScore += 0.34;
      pathScore += 0.18;
      deadScore -= 0.18;
      ruinScore -= 0.08;
    }

    if (region === REGION.HOLLOW_ROAD) {
      grassScore += 0.18;
      deadScore += 0.14 + corruption * 0.15;
      pathScore += 0.10;
    }

    if (region === REGION.THORNWOOD) {
      grassScore += 0.28 + moisture * 0.16;
      deadScore += corruption > 0.66 ? 0.26 : 0.06;
      ruinScore -= 0.04;
    }

    if (region === REGION.RIVERLANDS) {
      grassScore += 0.34 + moisture * 0.25;
      pathScore += 0.06;
      deadScore -= 0.12;
    }

    if (region === REGION.GRAVEFIELDS) {
      grassScore -= 0.20;
      deadScore += 0.45 + corruption * 0.22;
      ruinScore += 0.17 + local * 0.18;
    }

    if (region === REGION.CHAPEL_RUINS) {
      grassScore -= 0.08;
      ruinScore += 0.40 + local * 0.22;
      deadScore += 0.20;
      pathScore += 0.05;
    }

    if (region === REGION.HUNTER_REACH) {
      grassScore += 0.26;
      pathScore += 0.08;
      deadScore += corruption > 0.78 ? 0.12 : 0.02;
    }

    if (region === REGION.IRON_MIRE) {
      grassScore -= 0.06;
      deadScore += 0.22;
      ruinScore += 0.22;
      oreScore += 0.30 + continental * 0.22;
    }

    if (region === REGION.OLD_HOLLOW) {
      grassScore -= 0.24;
      deadScore += 0.38 + corruption * 0.25;
      ruinScore += 0.34 + local * 0.20;
    }

    if (region === REGION.HIGH_DANGER) {
      grassScore -= 0.18;
      deadScore += 0.34;
      ruinScore += 0.22;
    }

    grassScore += moisture * 0.15;
    deadScore += corruption * 0.12;
    ruinScore += Math.max(0, local - 0.58) * 0.28;

    const vein = Math.abs(warpedNoise(x, y, 'vein', 0.018, 16) - 0.5);
    if (vein < 0.055) {
      deadScore += 0.12;
    }

    const ancientStone = Math.abs(warpedNoise(x + 100, y - 70, 'stoneVein', 0.015, 22) - 0.48);
    if (ancientStone < 0.045) {
      ruinScore += 0.16;
    }

    let biome = chooseHighestBiome({
      grass: grassScore,
      path: pathScore,
      dead: deadScore,
      ruin: ruinScore,
      ore: oreScore
    });

    const spawnDist = distance(x, y, START_TILE_X, START_TILE_Y);

    if (spawnDist < 20 && biome !== 'path') {
      biome = spawnDist < 10 ? 'grass' : biome === 'dead' ? 'grass' : biome;
    }

    tile.biome = biome;
    tile.variant = noise01(x, y, `variant-${biome}`) > 0.5 ? 1 : 0;
    tile.region = region;
    tile.elevation = continental;
    tile.moisture = moisture;
    tile.danger = corruption;
  });
}

// -----------------------------------------------------------------------------
// WATER TILE MASKS
// -----------------------------------------------------------------------------

function carveWaterSystems(ctx) {
  paintOrganicRiver(ctx, [
    [0, 197],
    [30, 199],
    [66, 206],
    [104, 211],
    [145, 207],
    [184, 215],
    [225, 222],
    [280, 221],
    [319, 226]
  ], {
    width: 4.8,
    wobble: 2.2,
    seed: 'southRiver'
  });

  paintOrganicRiver(ctx, [
    [18, 77],
    [27, 97],
    [35, 119],
    [32, 145],
    [43, 170],
    [56, 196]
  ], {
    width: 2.9,
    wobble: 1.7,
    seed: 'thornCreek'
  });

  paintOrganicRiver(ctx, [
    [126, 4],
    [130, 22],
    [139, 42],
    [154, 62],
    [166, 84],
    [172, 108]
  ], {
    width: 2.1,
    wobble: 1.2,
    seed: 'graveStream'
  });

  paintOrganicBlob(ctx, 72, 205, 13, 7, 'water', {
    seed: 'riverPondA',
    softness: 0.45
  });

  paintOrganicBlob(ctx, 205, 213, 12, 8, 'water', {
    seed: 'mireWaterA',
    softness: 0.38,
    chance: 0.82
  });

  paintOrganicBlob(ctx, 33, 122, 8, 12, 'water', {
    seed: 'thornPondA',
    softness: 0.36,
    chance: 0.72
  });

  blurMaskToBiome(ctx, ctx.masks.water, 'water', 0.58);

  forEachTile(ctx, (x, y, tile) => {
    if (tile.biome === 'water') return;

    const waterNear = sampleMaskNeighborhood(ctx.masks.water, x, y, 2);

    if (waterNear > 0.26) {
      if (tile.region === REGION.IRON_MIRE && noise01(x, y, 'wetMire') > 0.42) {
        tile.biome = 'dead';
      } else if (tile.region === REGION.RIVERLANDS && noise01(x, y, 'wetGrass') > 0.25) {
        tile.biome = 'grass';
      }
    }
  });
}

// -----------------------------------------------------------------------------
// ROAD TILE MASKS
// -----------------------------------------------------------------------------

function carveRoadNetwork(ctx) {
  const roads = [
    {
      seed: 'mainRoad',
      width: 3.1,
      points: [[11, 27], [35, 28], [66, 35], [96, 52], [132, 63], [166, 62], [205, 70], [242, 92]]
    },
    {
      seed: 'southTrail',
      width: 2.55,
      points: [[29, 35], [43, 65], [50, 94], [46, 130], [52, 166], [72, 203]]
    },
    {
      seed: 'graveRoad',
      width: 2.4,
      points: [[82, 43], [108, 34], [135, 35], [160, 45]]
    },
    {
      seed: 'chapelRoad',
      width: 2.65,
      points: [[165, 62], [194, 50], [225, 42], [258, 48], [292, 60]]
    },
    {
      seed: 'hollowRoad',
      width: 2.7,
      points: [[150, 65], [165, 100], [187, 135], [215, 165], [248, 187], [282, 205]]
    },
    {
      seed: 'hunterTrail',
      width: 2.15,
      points: [[205, 102], [224, 108], [245, 118], [266, 138], [285, 154]]
    },
    {
      seed: 'mineTrack',
      width: 2.2,
      points: [[112, 173], [140, 180], [166, 190], [193, 202], [216, 214]]
    },
    {
      seed: 'trainerLoop',
      width: 2.2,
      points: [[10, 27], [20, 26], [34, 24], [35, 33], [22, 44], [7, 42], [10, 27]]
    }
  ];

  for (const road of roads) {
    paintOrganicTrail(ctx, road.points, road.width, road.seed);
  }

  blurMaskToBiome(ctx, ctx.masks.road, 'path', 0.42);

  forEachTile(ctx, (x, y, tile) => {
    if (tile.biome === 'water') return;

    const roadNear = sampleMaskNeighborhood(ctx.masks.road, x, y, 2);

    if (roadNear > 0.22 && roadNear <= 0.42 && tile.biome !== 'path') {
      const n = noise01(x, y, 'roadShoulder');

      if (n > 0.56) {
        tile.biome = tile.region === REGION.GRAVEFIELDS || tile.region === REGION.OLD_HOLLOW ? 'dead' : 'grass';
      }
    }
  });
}

// -----------------------------------------------------------------------------
// LANDMARK TILE PAINTING
// -----------------------------------------------------------------------------

function shapeMajorLandmarks(ctx) {
  // Outpost
  paintOrganicBlob(ctx, 14, 28, 24, 16, 'path', {
    seed: 'outpostClearing',
    softness: 0.52,
    chance: 0.86
  });

  paintOrganicBlob(ctx, 14, 28, 16, 10, 'grass', {
    seed: 'outpostGrass',
    softness: 0.55,
    chance: 0.62
  });

  paintOrganicBlob(ctx, 10, 24, 5, 4, 'ruin', { seed: 'wardenFoundation', chance: 0.95 });
  paintOrganicBlob(ctx, 19, 25, 5, 4, 'ruin', { seed: 'smithFoundation', chance: 0.95 });
  paintOrganicBlob(ctx, 13, 31, 4, 3, 'path', { seed: 'campfireFloor', chance: 0.95 });
  paintOrganicBlob(ctx, 24, 31, 5, 4, 'ruin', { seed: 'outpostShrineFloor', chance: 0.9 });

  // Class trainer areas
  paintOrganicBlob(ctx, 34, 24, 7, 5, 'ruin', { seed: 'templarTrainerFloor', chance: 0.9 });
  paintOrganicBlob(ctx, 35, 33, 7, 5, 'path', { seed: 'mercTrainerFloor', chance: 0.9 });
  paintOrganicBlob(ctx, 7, 42, 8, 5, 'dead', { seed: 'necroTrainerFloor', chance: 0.88 });
  paintOrganicBlob(ctx, 22, 44, 8, 5, 'grass', { seed: 'thornTrainerFloor', chance: 0.88 });

  // Thornwood
  paintOrganicBlob(ctx, 58, 124, 21, 18, 'grass', {
    seed: 'thornwoodGroveOuter',
    softness: 0.55,
    chance: 0.88
  });

  paintOrganicBlob(ctx, 58, 124, 10, 8, 'dead', {
    seed: 'thornwoodGroveHeart',
    softness: 0.52,
    chance: 0.82
  });

  // Gravefields
  paintOrganicBlob(ctx, 151, 42, 28, 23, 'dead', {
    seed: 'gravefieldCore',
    softness: 0.50,
    chance: 0.92
  });

  paintOrganicBlob(ctx, 151, 42, 12, 8, 'ruin', {
    seed: 'gravefieldStone',
    softness: 0.50,
    chance: 0.82
  });

  // Chapel
  paintOrganicBlob(ctx, 238, 45, 29, 20, 'ruin', {
    seed: 'chapelRuinMain',
    softness: 0.48,
    chance: 0.93
  });

  paintOrganicBlob(ctx, 239, 56, 10, 8, 'path', {
    seed: 'chapelFrontPath',
    softness: 0.48,
    chance: 0.82
  });

  // Hunter camp
  paintOrganicBlob(ctx, 245, 118, 20, 15, 'path', {
    seed: 'hunterCampTrail',
    softness: 0.55,
    chance: 0.80
  });

  paintOrganicBlob(ctx, 245, 118, 12, 9, 'grass', {
    seed: 'hunterCampGreen',
    softness: 0.50,
    chance: 0.72
  });

  // Iron Mire
  paintOrganicBlob(ctx, 206, 199, 24, 19, 'ruin', {
    seed: 'ironMineRuin',
    softness: 0.50,
    chance: 0.90
  });

  paintOrganicBlob(ctx, 206, 201, 8, 6, 'ore', {
    seed: 'ironOreCore',
    softness: 0.46,
    chance: 0.84
  });

  // Old Hollow
  paintOrganicBlob(ctx, 282, 205, 31, 25, 'ruin', {
    seed: 'oldHollowApproach',
    softness: 0.48,
    chance: 0.94
  });

  paintOrganicBlob(ctx, 282, 205, 13, 10, 'dead', {
    seed: 'oldHollowMouth',
    softness: 0.50,
    chance: 0.88
  });

  // Hungry shrine
  paintOrganicBlob(ctx, 151, 43, 10, 8, 'ruin', {
    seed: 'hungryShrineRuin',
    softness: 0.45,
    chance: 0.82
  });

  // New content terrain prep: Castle Veyr
  paintOrganicBlob(ctx, 292, 52, 26, 18, 'ruin', {
    seed: 'castleVeyrGrounds',
    softness: 0.46,
    chance: 0.92
  });

  paintOrganicBlob(ctx, 292, 52, 12, 8, 'dead', {
    seed: 'castleVeyrDeadCourtyard',
    softness: 0.42,
    chance: 0.76
  });

  // New content terrain prep: Demon Cultist Lair
  paintOrganicBlob(ctx, 306, 184, 18, 15, 'dead', {
    seed: 'emberVeilLairGround',
    softness: 0.50,
    chance: 0.90
  });

  paintOrganicBlob(ctx, 306, 184, 8, 6, 'ruin', {
    seed: 'emberVeilSealStone',
    softness: 0.40,
    chance: 0.82
  });
}

// -----------------------------------------------------------------------------
// SPAWN / BOUNDS
// -----------------------------------------------------------------------------

function cleanSpawnArea(ctx) {
  paintOrganicBlob(ctx, START_TILE_X, START_TILE_Y, 12, 9, 'grass', {
    seed: 'spawnSafetyGrass',
    softness: 0.6,
    chance: 0.95
  });

  paintOrganicTrail(ctx, [[START_TILE_X, START_TILE_Y], [13, 30], [20, 25], [24, 31], [35, 33]], 2.4, 'spawnPaths');

  blurMaskToBiome(ctx, ctx.masks.road, 'path', 0.48);

  for (let y = START_TILE_Y - 5; y <= START_TILE_Y + 5; y++) {
    for (let x = START_TILE_X - 5; x <= START_TILE_X + 5; x++) {
      if (!inBounds(ctx, x, y)) continue;

      if (ctx.tiles[y][x].biome === 'water') {
        setTile(ctx, x, y, 'grass');
      }
    }
  }
}

function reinforceOuterBounds(ctx) {
  for (let y = 0; y < ctx.height; y++) {
    for (let x = 0; x < ctx.width; x++) {
      const border = x <= 1 || y <= 1 || x >= ctx.width - 2 || y >= ctx.height - 2;

      if (border) {
        setTile(ctx, x, y, 'water');
      }
    }
  }
}

// -----------------------------------------------------------------------------
// TERRAIN SOFTENING
// -----------------------------------------------------------------------------

function softenTerrain(ctx, passes = 1) {
  for (let pass = 0; pass < passes; pass++) {
    const next = cloneTileBiomes(ctx);

    for (let y = 1; y < ctx.height - 1; y++) {
      for (let x = 1; x < ctx.width - 1; x++) {
        const tile = ctx.tiles[y][x];

        if (tile.biome === 'water') continue;
        if (sampleMask(ctx.masks.road, x, y) > 0.52) continue;
        if (sampleMask(ctx.masks.landmark, x, y) > 0.65) continue;

        const counts = countNeighborBiomes(ctx, x, y);
        const dominant = getDominantBiome(counts);

        if (!dominant || dominant === tile.biome) continue;

        const dominantCount = counts[dominant] || 0;
        const n = noise01(x, y, `soften-${pass}`);

        if (dominantCount >= 6 && n > 0.24) {
          next[y][x] = dominant;
        } else if (dominantCount >= 5 && n > 0.72) {
          next[y][x] = dominant;
        }
      }
    }

    for (let y = 0; y < ctx.height; y++) {
      for (let x = 0; x < ctx.width; x++) {
        ctx.tiles[y][x].biome = next[y][x];
      }
    }
  }
}

function cloneTileBiomes(ctx) {
  return ctx.tiles.map(row => row.map(tile => tile.biome));
}

function countNeighborBiomes(ctx, x, y) {
  const counts = {};

  for (let yy = y - 1; yy <= y + 1; yy++) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
      if (!inBounds(ctx, xx, yy)) continue;
      if (xx === x && yy === y) continue;

      const biome = ctx.tiles[yy][xx].biome;
      counts[biome] = (counts[biome] || 0) + 1;
    }
  }

  return counts;
}

function getDominantBiome(counts) {
  let best = null;
  let bestCount = 0;

  for (const [biome, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = biome;
      bestCount = count;
    }
  }

  return best;
}

// -----------------------------------------------------------------------------
// SEAMLESS TERRAIN FEATURE DEFINITIONS
// -----------------------------------------------------------------------------

function createRoadFeatures() {
  return [
    makeRoadFeature('main-road', [
      [11, 27],
      [35, 28],
      [66, 35],
      [96, 52],
      [132, 63],
      [166, 62],
      [205, 70],
      [242, 92]
    ], {
      width: 96,
      color: '#4b392a',
      edgeColor: '#2f241b',
      lightColor: '#8c6b42'
    }),

    makeRoadFeature('south-trail', [
      [29, 35],
      [43, 65],
      [50, 94],
      [46, 130],
      [52, 166],
      [72, 203]
    ], {
      width: 72,
      color: '#443324',
      edgeColor: '#2a2018',
      lightColor: '#7f623e'
    }),

    makeRoadFeature('grave-road', [
      [82, 43],
      [108, 34],
      [135, 35],
      [160, 45]
    ], {
      width: 76,
      color: '#3c3029',
      edgeColor: '#211b18',
      lightColor: '#746051'
    }),

    makeRoadFeature('chapel-road', [
      [165, 62],
      [194, 50],
      [225, 42],
      [258, 48],
      [292, 60]
    ], {
      width: 84,
      color: '#4a3b30',
      edgeColor: '#28211c',
      lightColor: '#8a745b'
    }),

    makeRoadFeature('old-hollow-road', [
      [150, 65],
      [165, 100],
      [187, 135],
      [215, 165],
      [248, 187],
      [282, 205]
    ], {
      width: 82,
      color: '#3a2d29',
      edgeColor: '#1e1717',
      lightColor: '#725d50'
    }),

    makeRoadFeature('hunter-trail', [
      [205, 102],
      [224, 108],
      [245, 118],
      [266, 138],
      [285, 154]
    ], {
      width: 64,
      color: '#463827',
      edgeColor: '#2a2219',
      lightColor: '#7e653f'
    }),

    makeRoadFeature('mine-track', [
      [112, 173],
      [140, 180],
      [166, 190],
      [193, 202],
      [216, 214]
    ], {
      width: 68,
      color: '#3f352e',
      edgeColor: '#211d19',
      lightColor: '#76685b'
    }),

    makeRoadFeature('trainer-loop', [
      [10, 27],
      [20, 26],
      [34, 24],
      [35, 33],
      [22, 44],
      [7, 42],
      [10, 27]
    ], {
      width: 62,
      color: '#493725',
      edgeColor: '#2c2118',
      lightColor: '#8b6d42'
    }),

    makeRoadFeature('castle-approach-road', [
      [242, 92],
      [260, 78],
      [278, 63],
      [292, 52]
    ], {
      width: 74,
      color: '#3e3330',
      edgeColor: '#1c1716',
      lightColor: '#75635b'
    }),

    makeRoadFeature('ember-veil-hidden-track', [
      [282, 205],
      [291, 195],
      [299, 190],
      [306, 184]
    ], {
      width: 54,
      color: '#332421',
      edgeColor: '#170d0d',
      lightColor: '#7a3a32'
    })
  ];
}

function createRiverFeatures() {
  return [
    makeRiverFeature('south-river', [
      [0, 197],
      [30, 199],
      [66, 206],
      [104, 211],
      [145, 207],
      [184, 215],
      [225, 222],
      [280, 221],
      [319, 226]
    ], {
      width: 150,
      color: '#10253b',
      deepColor: '#071522',
      highlightColor: '#83b7d4',
      shoreColor: '#1f3340'
    }),

    makeRiverFeature('thorn-creek', [
      [18, 77],
      [27, 97],
      [35, 119],
      [32, 145],
      [43, 170],
      [56, 196]
    ], {
      width: 92,
      color: '#10283d',
      deepColor: '#081722',
      highlightColor: '#88bdd2',
      shoreColor: '#203940'
    }),

    makeRiverFeature('grave-stream', [
      [126, 4],
      [130, 22],
      [139, 42],
      [154, 62],
      [166, 84],
      [172, 108]
    ], {
      width: 68,
      color: '#111f32',
      deepColor: '#070d17',
      highlightColor: '#687f9c',
      shoreColor: '#232b38'
    })
  ];
}

function createLakeFeatures() {
  return [
    makeBlobFeature('river-pond-a', 'water', 72, 205, 420, 235, {
      color: '#10253b',
      edgeColor: '#1f3340',
      highlightColor: '#83b7d4',
      alpha: 0.95
    }),

    makeBlobFeature('mire-pool-a', 'water', 205, 213, 380, 250, {
      color: '#111f32',
      edgeColor: '#2b2d34',
      highlightColor: '#697b93',
      alpha: 0.88
    }),

    makeBlobFeature('thorn-pond-a', 'water', 33, 122, 260, 360, {
      color: '#10283d',
      edgeColor: '#203940',
      highlightColor: '#88bdd2',
      alpha: 0.86
    })
  ];
}

function createBiomeBlobFeatures() {
  return [
    makeBlobFeature('outpost-clearing', 'path', 14, 28, 720, 470, {
      color: '#443424',
      edgeColor: '#26351f',
      highlightColor: '#8c6b42',
      alpha: 0.78
    }),

    makeBlobFeature('outpost-green-heart', 'grass', 14, 28, 500, 320, {
      color: '#1d3521',
      edgeColor: '#172a1b',
      highlightColor: '#5f8b45',
      alpha: 0.72
    }),

    makeBlobFeature('thornwood-grove', 'grass', 58, 124, 720, 600, {
      color: '#1c3920',
      edgeColor: '#102015',
      highlightColor: '#57894a',
      alpha: 0.72
    }),

    makeBlobFeature('thornwood-corruption-heart', 'dead', 58, 124, 350, 280, {
      color: '#2a2227',
      edgeColor: '#181115',
      highlightColor: '#6d3d45',
      alpha: 0.60
    }),

    makeBlobFeature('gravefield-deadland', 'dead', 151, 42, 920, 720, {
      color: '#211b1f',
      edgeColor: '#0d090c',
      highlightColor: '#6d3d45',
      alpha: 0.82
    }),

    makeBlobFeature('gravefield-stone', 'ruin', 151, 42, 420, 290, {
      color: '#303440',
      edgeColor: '#101119',
      highlightColor: '#9d9688',
      alpha: 0.70
    }),

    makeBlobFeature('chapel-ruin-field', 'ruin', 238, 45, 950, 640, {
      color: '#303440',
      edgeColor: '#101119',
      highlightColor: '#9d9688',
      alpha: 0.78
    }),

    makeBlobFeature('hunter-camp-clearing', 'path', 245, 118, 650, 440, {
      color: '#443827',
      edgeColor: '#1d321f',
      highlightColor: '#7e653f',
      alpha: 0.62
    }),

    makeBlobFeature('iron-mire-stonefield', 'ruin', 206, 199, 780, 620, {
      color: '#2d333c',
      edgeColor: '#10151a',
      highlightColor: '#aeb9c6',
      alpha: 0.72
    }),

    makeBlobFeature('iron-mire-ore-core', 'ore', 206, 201, 300, 220, {
      color: '#303841',
      edgeColor: '#10151a',
      highlightColor: '#aeb9c6',
      alpha: 0.70
    }),

    makeBlobFeature('old-hollow-approach', 'ruin', 282, 205, 980, 760, {
      color: '#282b35',
      edgeColor: '#0d0d13',
      highlightColor: '#7c7685',
      alpha: 0.80
    }),

    makeBlobFeature('old-hollow-mouth', 'dead', 282, 205, 420, 320, {
      color: '#211b1f',
      edgeColor: '#09070a',
      highlightColor: '#6d3d45',
      alpha: 0.75
    }),

    makeBlobFeature('castle-veyr-grounds', 'ruin', 292, 52, 780, 560, {
      color: '#252733',
      edgeColor: '#090a10',
      highlightColor: '#77717f',
      alpha: 0.82
    }),

    makeBlobFeature('castle-veyr-courtyard', 'dead', 292, 52, 360, 250, {
      color: '#201a21',
      edgeColor: '#09070a',
      highlightColor: '#6d3d45',
      alpha: 0.72
    }),

    makeBlobFeature('ember-veil-lair-field', 'dead', 306, 184, 520, 420, {
      color: '#241819',
      edgeColor: '#080405',
      highlightColor: '#8e342e',
      alpha: 0.78
    }),

    makeBlobFeature('ember-veil-red-seal-stone', 'ruin', 306, 184, 250, 190, {
      color: '#2d2526',
      edgeColor: '#0a0505',
      highlightColor: '#b94a3d',
      alpha: 0.70
    })
  ];
}

function createRuinFieldFeatures() {
  return [
    makeRuinField('chapel-ruin-pieces', 238, 45, 850, 530, 26, '#494b57', '#1c1d24'),
    makeRuinField('gravefield-stones', 151, 43, 600, 420, 18, '#3c3a43', '#18171d'),
    makeRuinField('iron-mire-slabs', 206, 200, 690, 500, 22, '#3d444d', '#15191f'),
    makeRuinField('old-hollow-slabs', 282, 205, 850, 620, 30, '#34343e', '#111118'),
    makeRuinField('castle-veyr-slabs', 292, 52, 760, 480, 24, '#30313d', '#101018'),
    makeRuinField('ember-veil-stones', 306, 184, 420, 340, 16, '#3a2828', '#120707')
  ];
}

function createForestMassFeatures() {
  return [
    makeForestMass('thornwood-canopy-mass', 58, 124, 920, 780, '#102515', '#1f4528', 0.34),
    makeForestMass('hunter-reach-canopy-mass', 245, 118, 820, 560, '#122716', '#23502d', 0.28),
    makeForestMass('riverland-green-mass', 72, 205, 920, 400, '#17351d', '#2d6335', 0.24),
    makeForestMass('castle-veyr-blackwood', 292, 52, 720, 500, '#0d1115', '#1d252a', 0.22)
  ];
}

function createCliffFeatures() {
  return [
    makeCliffFeature('chapel-north-cliff', [
      [185, 16],
      [205, 12],
      [236, 14],
      [268, 18],
      [300, 26]
    ], {
      width: 92,
      color: '#1b1d26',
      lightColor: '#555966',
      shadowColor: '#05060a'
    }),

    makeCliffFeature('old-hollow-east-cliff', [
      [306, 160],
      [300, 182],
      [304, 205],
      [310, 228]
    ], {
      width: 86,
      color: '#191720',
      lightColor: '#4f485a',
      shadowColor: '#050407'
    }),

    makeCliffFeature('iron-mire-south-ridge', [
      [132, 224],
      [160, 218],
      [190, 224],
      [222, 230]
    ], {
      width: 78,
      color: '#20272f',
      lightColor: '#596372',
      shadowColor: '#090d11'
    }),

    makeCliffFeature('castle-veyr-ridge', [
      [266, 35],
      [282, 30],
      [300, 33],
      [316, 43]
    ], {
      width: 92,
      color: '#151720',
      lightColor: '#56515f',
      shadowColor: '#040408'
    })
  ];
}

function createDetailFieldFeatures() {
  return [
    {
      id: 'grass-noise',
      kind: 'grassNoise',
      color: '#5f8b45',
      darkColor: '#0e1c12',
      density: 0.38,
      alpha: 0.16,
      seed: 'grass-noise'
    },

    {
      id: 'path-speckles',
      kind: 'pathSpeckles',
      color: '#a78553',
      darkColor: '#1e1711',
      density: 0.24,
      alpha: 0.15,
      seed: 'path-speckles'
    },

    {
      id: 'deadland-ash',
      kind: 'deadlandAsh',
      color: '#6d3d45',
      darkColor: '#0d090c',
      density: 0.30,
      alpha: 0.14,
      seed: 'deadland-ash'
    },

    {
      id: 'ruin-cracks',
      kind: 'ruinCracks',
      color: '#9d9688',
      darkColor: '#101119',
      density: 0.22,
      alpha: 0.17,
      seed: 'ruin-cracks'
    }
  ];
}

// -----------------------------------------------------------------------------
// FEATURE FACTORIES
// -----------------------------------------------------------------------------

function makeRoadFeature(id, tilePoints, options = {}) {
  return {
    id,
    kind: 'road',
    points: tilePointsToWorld(tilePoints),
    width: options.width || 80,
    color: options.color || '#4b392a',
    edgeColor: options.edgeColor || '#2f241b',
    lightColor: options.lightColor || '#8c6b42',
    seed: id
  };
}

function makeRiverFeature(id, tilePoints, options = {}) {
  return {
    id,
    kind: 'river',
    points: tilePointsToWorld(tilePoints),
    width: options.width || 120,
    color: options.color || '#10253b',
    deepColor: options.deepColor || '#071522',
    highlightColor: options.highlightColor || '#83b7d4',
    shoreColor: options.shoreColor || '#1f3340',
    seed: id
  };
}

function makeBlobFeature(id, kind, tileX, tileY, rx, ry, options = {}) {
  return {
    id,
    kind,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    rx,
    ry,
    color: options.color || '#1d3521',
    edgeColor: options.edgeColor || '#0e1c12',
    highlightColor: options.highlightColor || '#5f8b45',
    alpha: options.alpha ?? 0.7,
    seed: id
  };
}

function makeRuinField(id, tileX, tileY, rx, ry, count, color, darkColor) {
  const pieces = [];

  for (let i = 0; i < count; i++) {
    const px = tileX * TILE + noiseSigned(i, tileX, `${id}-x`) * rx;
    const py = tileY * TILE + noiseSigned(tileY, i, `${id}-y`) * ry;

    pieces.push({
      x: px,
      y: py,
      w: 30 + noise01(i, tileY, `${id}-w`) * 78,
      h: 10 + noise01(tileX, i, `${id}-h`) * 28,
      angle: noiseSigned(i, tileX + tileY, `${id}-a`) * 0.6,
      color: noise01(i, tileX, `${id}-c`) > 0.5 ? color : darkColor
    });
  }

  return {
    id,
    kind: 'ruinField',
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    rx,
    ry,
    color,
    darkColor,
    pieces
  };
}

function makeForestMass(id, tileX, tileY, rx, ry, darkColor, midColor, alpha) {
  return {
    id,
    kind: 'forestMass',
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    rx,
    ry,
    darkColor,
    midColor,
    alpha,
    seed: id
  };
}

function makeCliffFeature(id, tilePoints, options = {}) {
  return {
    id,
    kind: 'cliff',
    points: tilePointsToWorld(tilePoints),
    width: options.width || 80,
    color: options.color || '#1b1d26',
    lightColor: options.lightColor || '#555966',
    shadowColor: options.shadowColor || '#05060a',
    seed: id
  };
}

function tilePointsToWorld(points) {
  return points.map(([x, y]) => [
    x * TILE + TILE / 2,
    y * TILE + TILE / 2
  ]);
}