// overworldEntities.js
// Overworld objects, decorative props, resources, NPCs, POIs, and enemies.
//
// Used by overworldMap.js.
//
// This script owns:
// - decorative environment object placement
// - starter NPCs / class trainers
// - resource nodes
// - campfires / shrines
// - dungeon entrances
// - Gothic Castle POI content
// - Demon Cultist Lair content
// - friendly / neutral / hostile NPC placement
// - enemy clusters

import {
  REGION,
  START_TILE_X,
  START_TILE_Y,

  inBounds,
  sampleMask,

  makeObject,
  makeDecorObject,
  resourceRespawn,
  scatterObjects,

  makeEnemy,
  addEnemyCluster,
  scaleEnemyStats,

  noise01,
  distance,
  randomRangeFromNoise
} from './overworldUtils.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function createOverworldObjects(ctx) {
  const objects = [];

  addDecorativeEnvironmentObjects(ctx, objects);
  addStartingOutpostObjects(objects);
  addClassTrainerObjects(objects);
  addResourceObjects(objects);
  addPointOfInterestObjects(objects);
  addDungeonObjects(objects);
  addStoryContentObjects(objects);

  return objects;
}

export function createOverworldEnemies(ctx) {
  const enemies = [];

  addEarlyRoadEnemies(enemies);
  addThornwoodEnemies(enemies);
  addGravefieldEnemies(enemies);
  addChapelEnemies(enemies);
  addHunterReachEnemies(enemies);
  addIronMireEnemies(enemies);
  addOldHollowEnemies(enemies);

  addGothicCastleEnemies(enemies);
  addDemonCultEnemies(enemies);
  addBanditEnemies(enemies);

  return enemies;
}

// -----------------------------------------------------------------------------
// DECORATIVE ENVIRONMENT OBJECTS
// -----------------------------------------------------------------------------

function addDecorativeEnvironmentObjects(ctx, objects) {
  scatterOrganicDecor(ctx, objects, {
    kind: 'treeCluster',
    name: 'Tree Cluster',
    idPrefix: 'tree',
    regions: [REGION.THORNWOOD, REGION.RIVERLANDS, REGION.HUNTER_REACH],
    biome: 'grass',
    count: 210,
    spacing: 5,
    minDistanceFromSpawn: 18,
    scaleRange: [0.72, 1.15],
    chanceSeed: 'treeDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'pineCluster',
    name: 'Pine Cluster',
    idPrefix: 'pine',
    regions: [REGION.HUNTER_REACH, REGION.HIGH_DANGER],
    biome: 'grass',
    count: 85,
    spacing: 6,
    minDistanceFromSpawn: 24,
    scaleRange: [0.75, 1.18],
    chanceSeed: 'pineDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'shrub',
    name: 'Shrub',
    idPrefix: 'shrub',
    regions: [REGION.OUTPOST, REGION.HOLLOW_ROAD, REGION.THORNWOOD, REGION.RIVERLANDS, REGION.HUNTER_REACH],
    biome: 'grass',
    count: 260,
    spacing: 3,
    minDistanceFromSpawn: 8,
    scaleRange: [0.7, 1.15],
    chanceSeed: 'shrubDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'tallGrassPatch',
    name: 'Tall Grass',
    idPrefix: 'tallGrass',
    regions: [REGION.THORNWOOD, REGION.RIVERLANDS, REGION.HUNTER_REACH],
    biome: 'grass',
    count: 290,
    spacing: 2,
    minDistanceFromSpawn: 6,
    scaleRange: [0.72, 1.08],
    chanceSeed: 'grassDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'stump',
    name: 'Old Stump',
    idPrefix: 'stump',
    regions: [REGION.THORNWOOD, REGION.HUNTER_REACH, REGION.HOLLOW_ROAD],
    biome: 'grass',
    count: 45,
    spacing: 5,
    minDistanceFromSpawn: 14,
    scaleRange: [0.75, 1.05],
    chanceSeed: 'stumpDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'deadRoot',
    name: 'Dead Root',
    idPrefix: 'deadRoot',
    regions: [REGION.GRAVEFIELDS, REGION.OLD_HOLLOW, REGION.IRON_MIRE],
    biome: 'dead',
    count: 120,
    spacing: 4,
    minDistanceFromSpawn: 30,
    scaleRange: [0.72, 1.22],
    chanceSeed: 'deadRootDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'graveMarker',
    name: 'Grave Marker',
    idPrefix: 'graveMarker',
    regions: [REGION.GRAVEFIELDS, REGION.OLD_HOLLOW, REGION.CHAPEL_RUINS],
    biome: 'dead',
    count: 95,
    spacing: 4,
    minDistanceFromSpawn: 26,
    scaleRange: [0.72, 1.08],
    chanceSeed: 'graveDecor'
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'brokenWall',
    name: 'Broken Wall',
    idPrefix: 'brokenWall',
    regions: [REGION.CHAPEL_RUINS, REGION.OLD_HOLLOW, REGION.IRON_MIRE],
    biome: 'ruin',
    count: 85,
    spacing: 5,
    minDistanceFromSpawn: 22,
    scaleRange: [0.78, 1.12],
    chanceSeed: 'wallDecor',
    extraFactory: (x, y, index) => ({
      orientation: noise01(x, y, `wall-orientation-${index}`) > 0.5 ? 'vertical' : 'horizontal'
    })
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'ruinPillar',
    name: 'Ruin Pillar',
    idPrefix: 'pillar',
    regions: [REGION.CHAPEL_RUINS, REGION.OLD_HOLLOW, REGION.GRAVEFIELDS],
    biome: 'ruin',
    count: 70,
    spacing: 5,
    minDistanceFromSpawn: 22,
    scaleRange: [0.76, 1.1],
    chanceSeed: 'pillarDecor',
    extraFactory: (x, y, index) => ({
      broken: noise01(x, y, `pillar-broken-${index}`) > 0.35
    })
  });

  scatterOrganicDecor(ctx, objects, {
    kind: 'smallBoulder',
    name: 'Small Boulder',
    idPrefix: 'boulder',
    regions: [REGION.IRON_MIRE, REGION.CHAPEL_RUINS, REGION.HIGH_DANGER, REGION.OLD_HOLLOW],
    biome: null,
    count: 130,
    spacing: 4,
    minDistanceFromSpawn: 18,
    allowedBiomes: ['ruin', 'ore', 'dead', 'grass'],
    scaleRange: [0.68, 1.05],
    chanceSeed: 'boulderDecor',
    extraFactory: (x, y, index) => ({
      dark: noise01(x, y, `boulder-dark-${index}`) > 0.45
    })
  });

  addHandPlacedDecor(objects);
}

function addHandPlacedDecor(objects) {
  // Starting outpost dressing.
  objects.push(makeDecorObject('signpost', 'signpost-outpost-1', 'Outpost Signpost', 17, 28, { scale: 0.9 }));
  objects.push(makeDecorObject('smallBoulder', 'outpost-boulder-1', 'Small Boulder', 6, 25, { scale: 0.8 }));
  objects.push(makeDecorObject('smallBoulder', 'outpost-boulder-2', 'Small Boulder', 27, 34, { scale: 0.75 }));
  objects.push(makeDecorObject('stump', 'outpost-stump-1', 'Old Stump', 30, 22, { scale: 0.85 }));
  objects.push(makeDecorObject('shrub', 'outpost-shrub-1', 'Shrub', 5, 32, { scale: 0.9 }));
  objects.push(makeDecorObject('shrub', 'outpost-shrub-2', 'Shrub', 25, 23, { scale: 0.8 }));

  // Trainer loop dressing.
  objects.push(makeDecorObject('brokenWall', 'templar-wall-1', 'Broken Wall', 32, 22, { scale: 0.85 }));
  objects.push(makeDecorObject('ruinPillar', 'templar-pillar-1', 'Ruin Pillar', 37, 22, { scale: 0.75 }));
  objects.push(makeDecorObject('treeCluster', 'thorn-trainer-tree-1', 'Tree Cluster', 24, 47, { scale: 0.85 }));
  objects.push(makeDecorObject('deadRoot', 'necro-root-1', 'Dead Root', 5, 45, { scale: 0.85 }));
  objects.push(makeDecorObject('graveMarker', 'necro-grave-1', 'Grave Marker', 9, 44, { scale: 0.8 }));

  // Thornroot dungeon dressing.
  objects.push(makeDecorObject('treeCluster', 'thornroot-tree-1', 'Tree Cluster', 52, 119, { scale: 1.1 }));
  objects.push(makeDecorObject('treeCluster', 'thornroot-tree-2', 'Tree Cluster', 65, 126, { scale: 1.0 }));
  objects.push(makeDecorObject('deadRoot', 'thornroot-root-1', 'Dead Root', 58, 129, { scale: 1.0 }));
  objects.push(makeDecorObject('shrub', 'thornroot-shrub-1', 'Shrub', 62, 116, { scale: 1.0 }));

  // Hungry shrine / gravefield dressing.
  objects.push(makeDecorObject('graveMarker', 'hungry-grave-1', 'Grave Marker', 146, 39, { scale: 0.9 }));
  objects.push(makeDecorObject('graveMarker', 'hungry-grave-2', 'Grave Marker', 157, 47, { scale: 0.8 }));
  objects.push(makeDecorObject('deadRoot', 'hungry-root-1', 'Dead Root', 151, 50, { scale: 1.0 }));
  objects.push(makeDecorObject('ruinPillar', 'hungry-pillar-1', 'Ruin Pillar', 145, 45, { scale: 0.8 }));

  // Chapel dressing.
  objects.push(makeDecorObject('ruinPillar', 'chapel-pillar-1', 'Ruin Pillar', 231, 42, { scale: 1.1 }));
  objects.push(makeDecorObject('ruinPillar', 'chapel-pillar-2', 'Ruin Pillar', 247, 44, { scale: 1.0 }));
  objects.push(makeDecorObject('brokenWall', 'chapel-wall-1', 'Broken Wall', 238, 55, { scale: 1.0, orientation: 'horizontal' }));
  objects.push(makeDecorObject('brokenWall', 'chapel-wall-2', 'Broken Wall', 254, 51, { scale: 0.9, orientation: 'vertical' }));
  objects.push(makeDecorObject('graveMarker', 'chapel-grave-1', 'Grave Marker', 224, 61, { scale: 0.8 }));
  objects.push(makeDecorObject('graveMarker', 'chapel-grave-2', 'Grave Marker', 259, 64, { scale: 0.85 }));

  // Hunter camp dressing.
  objects.push(makeDecorObject('pineCluster', 'hunter-pine-1', 'Pine Cluster', 238, 112, { scale: 0.95 }));
  objects.push(makeDecorObject('pineCluster', 'hunter-pine-2', 'Pine Cluster', 253, 126, { scale: 1.0 }));
  objects.push(makeDecorObject('signpost', 'hunter-sign-1', 'Hunter Signpost', 247, 116, { scale: 0.85 }));
  objects.push(makeDecorObject('stump', 'hunter-stump-1', 'Old Stump', 241, 124, { scale: 0.85 }));

  // Iron Mire dressing.
  objects.push(makeDecorObject('smallBoulder', 'mire-boulder-1', 'Small Boulder', 201, 198, { scale: 1.1, dark: true }));
  objects.push(makeDecorObject('smallBoulder', 'mire-boulder-2', 'Small Boulder', 213, 206, { scale: 1.0, dark: true }));
  objects.push(makeDecorObject('brokenWall', 'mire-wall-1', 'Broken Wall', 207, 195, { scale: 0.9 }));
  objects.push(makeDecorObject('ruinPillar', 'mire-pillar-1', 'Ruin Pillar', 198, 207, { scale: 0.8 }));

  // Old Hollow dressing.
  objects.push(makeDecorObject('graveMarker', 'oldhollow-grave-1', 'Grave Marker', 277, 199, { scale: 0.9 }));
  objects.push(makeDecorObject('graveMarker', 'oldhollow-grave-2', 'Grave Marker', 289, 212, { scale: 0.85 }));
  objects.push(makeDecorObject('deadRoot', 'oldhollow-root-1', 'Dead Root', 282, 211, { scale: 1.15 }));
  objects.push(makeDecorObject('brokenWall', 'oldhollow-wall-1', 'Broken Wall', 270, 203, { scale: 1.0 }));
  objects.push(makeDecorObject('ruinPillar', 'oldhollow-pillar-1', 'Ruin Pillar', 293, 202, { scale: 1.1 }));

  // Gothic Castle Veyr dressing.
  objects.push(makeDecorObject('gothicCastle', 'castle-veyr-poi', 'Castle Veyr', 292, 52, {
    scale: 1.25,
    r: 34,
    poiId: 'gothicCastle',
    blocksMovement: false
  }));

  objects.push(makeDecorObject('brokenWall', 'castle-veyr-wall-1', 'Broken Wall', 286, 56, {
    scale: 1.0,
    orientation: 'horizontal'
  }));

  objects.push(makeDecorObject('brokenWall', 'castle-veyr-wall-2', 'Broken Wall', 300, 57, {
    scale: 1.0,
    orientation: 'vertical'
  }));

  objects.push(makeDecorObject('ruinPillar', 'castle-veyr-pillar-1', 'Ruin Pillar', 284, 47, {
    scale: 1.1
  }));

  objects.push(makeDecorObject('ruinPillar', 'castle-veyr-pillar-2', 'Ruin Pillar', 300, 47, {
    scale: 1.0
  }));

  objects.push(makeDecorObject('graveMarker', 'castle-veyr-grave-1', 'Grave Marker', 288, 61, {
    scale: 0.9
  }));

  objects.push(makeDecorObject('graveMarker', 'castle-veyr-grave-2', 'Grave Marker', 297, 63, {
    scale: 0.85
  }));

  objects.push(makeDecorObject('deadRoot', 'castle-veyr-root-1', 'Dead Root', 294, 58, {
    scale: 1.05
  }));

  // Demon Cultist Lair dressing.
  objects.push(makeDecorObject('demonLair', 'ember-veil-lair-poi', 'The Ember Veil Lair', 306, 184, {
    scale: 1.2,
    r: 32,
    poiId: 'demonCultLair',
    blocksMovement: false
  }));

  objects.push(makeDecorObject('redSeal', 'ember-veil-red-seal', 'Red Seal', 306, 184, {
    scale: 1.0,
    r: 26,
    poiId: 'demonCultLair',
    blocksMovement: false
  }));

  objects.push(makeDecorObject('deadRoot', 'ember-veil-root-1', 'Dead Root', 301, 187, {
    scale: 1.0
  }));

  objects.push(makeDecorObject('deadRoot', 'ember-veil-root-2', 'Dead Root', 311, 181, {
    scale: 0.95
  }));

  objects.push(makeDecorObject('graveMarker', 'ember-veil-marker-1', 'Grave Marker', 300, 179, {
    scale: 0.75
  }));

  objects.push(makeDecorObject('brokenWall', 'ember-veil-wall-1', 'Broken Wall', 310, 188, {
    scale: 0.8,
    orientation: 'horizontal'
  }));
}

function scatterOrganicDecor(ctx, objects, config) {
  const placed = [];
  let attempts = 0;
  const maxAttempts = config.count * 35;

  while (placed.length < config.count && attempts < maxAttempts) {
    attempts++;

    const x = Math.floor(noise01(attempts, config.count, `${config.chanceSeed}-x`) * (ctx.width - 6)) + 3;
    const y = Math.floor(noise01(config.count, attempts, `${config.chanceSeed}-y`) * (ctx.height - 6)) + 3;

    if (!inBounds(ctx, x, y)) continue;
    if (!isValidDecorPlacement(ctx, x, y, config, placed)) continue;

    const scale = randomRangeFromNoise(
      config.scaleRange?.[0] ?? 0.8,
      config.scaleRange?.[1] ?? 1.1,
      x,
      y,
      `${config.chanceSeed}-scale`
    );

    const index = objects.length;
    const extra = config.extraFactory ? config.extraFactory(x, y, index) : {};

    placed.push([x, y]);

    objects.push(makeDecorObject(
      config.kind,
      `${config.idPrefix}-${x}-${y}-${index}`,
      config.name,
      x,
      y,
      {
        scale,
        ...extra
      }
    ));
  }
}

function isValidDecorPlacement(ctx, x, y, config, placed) {
  const tile = ctx.tiles[y]?.[x];
  if (!tile) return false;

  if (distance(x, y, START_TILE_X, START_TILE_Y) < (config.minDistanceFromSpawn || 0)) {
    return false;
  }

  if (config.regions && !config.regions.includes(tile.region)) {
    return false;
  }

  if (config.allowedBiomes) {
    if (!config.allowedBiomes.includes(tile.biome)) return false;
  } else if (config.biome && tile.biome !== config.biome) {
    return false;
  }

  if (tile.biome === 'water' || tile.biome === 'path') {
    return false;
  }

  if (sampleMask(ctx.masks.road, x, y) > 0.18) {
    return false;
  }

  if (sampleMask(ctx.masks.water, x, y) > 0.14) {
    return false;
  }

  if (sampleMask(ctx.masks.landmark, x, y) > 0.76) {
    return false;
  }

  const spacing = config.spacing || 3;

  for (const [px, py] of placed) {
    if (distance(x, y, px, py) < spacing) {
      return false;
    }
  }

  const localNoise = noise01(x, y, `${config.chanceSeed}-accept`);

  if (localNoise < 0.22) {
    return false;
  }

  return true;
}

// -----------------------------------------------------------------------------
// STARTER / CLASS NPCS
// -----------------------------------------------------------------------------

function addStartingOutpostObjects(objects) {
  objects.push(makeObject('npc', 'warden', 'Warden Mael', 11, 25, {
    npcId: 'wardenMael',
    dialogueId: 'wardenMaelIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    talk: 'Warden Mael: "The roads are open, but that does not mean they are safe."'
  }));

  objects.push(makeObject('npc', 'smith', 'Mara the Smith', 20, 25, {
    npcId: 'maraSmith',
    dialogueId: 'maraSmithIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    talk: 'Mara the Smith: "Bring me ore and coin, and I can keep you alive a little longer."'
  }));

  objects.push(makeObject('campfire', 'outpostCampfire', 'Outpost Campfire', 13, 30, {
    r: 18
  }));

  objects.push(makeObject('shrine', 'outpostShrine', 'Weathered Shrine', 24, 31, {
    r: 18
  }));

  objects.push(makeObject('herb', 'outpostHerb1', 'Emberleaf', 7, 36, resourceRespawn()));
  objects.push(makeObject('herb', 'outpostHerb2', 'Emberleaf', 22, 38, resourceRespawn()));
  objects.push(makeObject('reed', 'outpostReed1', 'River Reed', 32, 47, resourceRespawn()));
}

function addClassTrainerObjects(objects) {
  objects.push(makeObject('npc', 'templarTrainer', 'Oathbound Templar', 34, 24, {
    instructorType: 'class',
    classId: 'templar',
    factionId: 'chapel',
    disposition: 'friendly',
    talk: 'Oathbound Templar: "A blade is not a weapon until it is bound to discipline."'
  }));

  objects.push(makeObject('npc', 'mercenaryTrainer', 'Sellsword Ranger', 35, 33, {
    instructorType: 'class',
    classId: 'mercenary',
    factionId: 'outpost',
    disposition: 'friendly',
    talk: 'Sellsword Ranger: "Distance is not cowardice. It is leverage."'
  }));

  objects.push(makeObject('npc', 'necromancerTrainer', 'Gravecaller', 7, 42, {
    instructorType: 'class',
    classId: 'necromancer',
    factionId: 'gravecallers',
    disposition: 'neutral',
    talk: 'Gravecaller: "The dead do not sleep. They wait to be asked."'
  }));

  objects.push(makeObject('npc', 'thornbinderTrainer', 'Wild Oathkeeper', 22, 44, {
    instructorType: 'class',
    classId: 'thornbinder',
    factionId: 'thornbound',
    disposition: 'neutral',
    talk: 'Wild Oathkeeper: "Roots remember what men try to bury."'
  }));
}

// -----------------------------------------------------------------------------
// RESOURCES
// -----------------------------------------------------------------------------

function addResourceObjects(objects) {
  scatterObjects(objects, 'herb', 'Emberleaf', 'emberleaf', [
    [45, 38], [52, 41], [61, 48], [74, 53], [88, 58],
    [42, 64], [57, 72], [76, 76]
  ]);

  scatterObjects(objects, 'herb', 'Emberleaf', 'thornwoodHerb', [
    [39, 99], [48, 108], [63, 117], [70, 131], [53, 145],
    [82, 151], [31, 137], [78, 101], [92, 126]
  ]);

  scatterObjects(objects, 'reed', 'River Reed', 'thornwoodReed', [
    [29, 99], [34, 121], [35, 145], [45, 171], [57, 196]
  ]);

  scatterObjects(objects, 'gravecap', 'Pale Gravecap', 'gravecap', [
    [126, 27], [137, 36], [146, 49], [158, 41], [166, 58],
    [121, 65], [151, 73], [174, 78], [110, 52]
  ]);

  scatterObjects(objects, 'bone', 'Old Bone Pile', 'bonePile', [
    [133, 31], [142, 42], [155, 47], [166, 35], [176, 60],
    [113, 70], [129, 80], [160, 82]
  ]);

  scatterObjects(objects, 'runestone', 'Cracked Runestone', 'chapelRune', [
    [226, 39], [236, 46], [247, 38], [253, 52], [221, 62]
  ]);

  scatterObjects(objects, 'ore', 'Old Iron Deposit', 'chapelOre', [
    [213, 71], [230, 69], [257, 73], [276, 80]
  ]);

  scatterObjects(objects, 'herb', 'Trail Herb', 'hunterHerb', [
    [225, 100], [239, 108], [252, 116], [265, 132], [281, 149],
    [214, 124], [244, 143], [287, 130]
  ]);

  scatterObjects(objects, 'fish', 'Fishing Spot', 'riverFish', [
    [33, 198], [66, 205], [105, 211], [143, 207], [184, 214],
    [226, 223], [279, 221]
  ]);

  scatterObjects(objects, 'reed', 'River Reed', 'riverReed', [
    [41, 194], [85, 203], [126, 215], [168, 209], [204, 219],
    [249, 225], [296, 218]
  ]);

  scatterObjects(objects, 'ore', 'Iron Ore Vein', 'ironOre', [
    [171, 182], [185, 192], [204, 200], [217, 207], [195, 216],
    [150, 176], [132, 188], [165, 211]
  ]);

  scatterObjects(objects, 'bone', 'Buried Bone Pile', 'mireBone', [
    [144, 164], [160, 170], [181, 181], [202, 188], [224, 202]
  ]);

  scatterObjects(objects, 'gravecap', 'Hollow Gravecap', 'hollowGravecap', [
    [252, 176], [268, 188], [283, 199], [297, 211], [272, 219],
    [240, 204], [305, 188]
  ]);

  scatterObjects(objects, 'runestone', 'Hollow Runestone', 'hollowRune', [
    [276, 202], [287, 208], [293, 197], [263, 213]
  ]);

  // New content area resources.
  scatterObjects(objects, 'gravecap', 'Castle Gravecap', 'castleGravecap', [
    [286, 59], [294, 61], [301, 55], [289, 47]
  ]);

  scatterObjects(objects, 'runestone', 'Veyr Runestone', 'castleRunestone', [
    [284, 51], [300, 49], [296, 58]
  ]);

  scatterObjects(objects, 'bone', 'Scorched Bone Pile', 'cultBone', [
    [300, 182], [311, 187], [305, 191]
  ]);

  scatterObjects(objects, 'gravecap', 'Ashen Gravecap', 'cultGravecap', [
    [298, 176], [310, 179], [313, 191]
  ]);
}

// -----------------------------------------------------------------------------
// POINTS OF INTEREST / DUNGEONS
// -----------------------------------------------------------------------------

function addPointOfInterestObjects(objects) {
  objects.push(makeObject('shrine', 'hungryShrine', 'Hungry Shrine', 151, 43, {
    r: 20
  }));

  objects.push(makeObject('campfire', 'hunterCampfire', 'Hunter Campfire', 245, 118, {
    r: 18
  }));

  objects.push(makeObject('campfire', 'thornwoodCampfire', 'Hidden Grove Campfire', 58, 124, {
    r: 18
  }));

  objects.push(makeObject('campfire', 'riverCampfire', 'Riverbend Campfire', 72, 204, {
    r: 18
  }));

  objects.push(makeObject('shrine', 'chapelShrine', 'Broken Chapel Shrine', 239, 49, {
    r: 20
  }));

  objects.push(makeObject('shrine', 'oldHollowShrine', 'Hollow Shrine', 282, 205, {
    r: 20
  }));

  objects.push(makeObject('npc', 'hunterScout', 'Hunter Scout', 243, 116, {
    npcId: 'hunterScout',
    factionId: 'outpost',
    disposition: 'friendly',
    talk: 'Hunter Scout: "Past this camp, the beasts start watching you back."'
  }));

  objects.push(makeObject('npc', 'chapelHermit', 'Chapel Hermit', 237, 47, {
    npcId: 'chapelHermit',
    factionId: 'chapel',
    disposition: 'neutral',
    talk: 'Chapel Hermit: "Stone remembers vows better than people do."'
  }));

  objects.push(makeObject('npc', 'mineDrifter', 'Mine Drifter', 205, 198, {
    npcId: 'mineDrifter',
    factionId: 'outpost',
    disposition: 'neutral',
    talk: 'Mine Drifter: "The mine breathes at night. I would not sleep near it."'
  }));
}

function addDungeonObjects(objects) {
  objects.push(makeObject('dungeonEntrance', 'oldHollowDungeonEntrance', 'Old Hollow Dungeon', 282, 205, {
    r: 26,
    poiId: 'oldHollowDungeon',
    seed: 'old-hollow-dungeon-01',
    theme: 'grave',
    depth: 1,
    tier: 1
  }));

  objects.push(makeObject('dungeonEntrance', 'thornrootDungeonEntrance', 'Thornroot Hollow', 58, 124, {
    r: 24,
    poiId: 'thornrootHollow',
    seed: 'thornroot-hollow-01',
    theme: 'thorn',
    depth: 1,
    tier: 1
  }));

  objects.push(makeObject('dungeonEntrance', 'ironMireDungeonEntrance', 'Abandoned Iron Hollow', 208, 203, {
    r: 24,
    poiId: 'ironMireDungeon',
    seed: 'iron-mire-hollow-01',
    theme: 'mine',
    depth: 1,
    tier: 2
  }));

  objects.push(makeObject('dungeonEntrance', 'emberVeilLairEntrance', 'The Ember Veil Lair', 306, 184, {
    r: 28,
    poiId: 'demonCultLair',
    seed: 'ember-veil-lair-01',
    theme: 'demon',
    depth: 1,
    tier: 2,
    recommendedLevel: 12
  }));
}

// -----------------------------------------------------------------------------
// STORY CONTENT OBJECTS
// -----------------------------------------------------------------------------

function addStoryContentObjects(objects) {
  // Broken Chapel quest giver.
  objects.push(makeObject('npc', 'sisterElyra', 'Sister Elyra', 237, 47, {
    npcId: 'sisterElyra',
    dialogueId: 'sisterElyraIntro',
    factionId: 'chapel',
    disposition: 'friendly',
    role: 'questGiver',
    talk: 'Sister Elyra: "Mind your step. The chapel floor remembers everyone who died praying here."'
  }));

  // Castle Veyr gothic NPC.
  objects.push(makeObject('npc', 'lordVeyrShade', 'Lord Veyr’s Shade', 292, 52, {
    npcId: 'lordVeyrShade',
    dialogueId: 'lordVeyrShadeIntro',
    factionId: 'castleCourt',
    disposition: 'uncertain',
    role: 'questGiver',
    classId: 'necromancer',
    talk: 'Lord Veyr’s Shade: "The living cross my threshold with warm blood and loud questions."'
  }));

  // Thornwood quest giver.
  objects.push(makeObject('npc', 'thornboundSeer', 'Thornbound Seer', 55, 121, {
    npcId: 'thornboundSeer',
    dialogueId: 'thornboundSeerIntro',
    factionId: 'thornbound',
    disposition: 'neutral',
    role: 'questGiver',
    classId: 'thornbinder',
    talk: 'Thornbound Seer: "The roots beneath you know your weight."'
  }));

  // Demon cult content.
  objects.push(makeObject('npc', 'repentantCultist', 'Repentant Cultist', 289, 172, {
    npcId: 'repentantCultist',
    dialogueId: 'repentantCultistIntro',
    factionId: 'demonCult',
    disposition: 'fearful',
    role: 'questGiver',
    classId: 'necromancer',
    talk: 'Repentant Cultist: "Do not go near the red seal."'
  }));

  objects.push(makeObject('npc', 'emberVeilAcolyte', 'Ember Veil Acolyte', 302, 181, {
    npcId: 'emberVeilAcolyte',
    dialogueId: 'cultistWarning',
    factionId: 'demonCult',
    disposition: 'hostile',
    role: 'hostileNpc',
    classId: 'necromancer',
    talk: 'Ember Veil Acolyte: "Turn away. The red seal opens only for those willing to burn."'
  }));

  // Bandit / unfriendly NPC.
  objects.push(makeObject('npc', 'roadlessCaptain', 'Roadless Captain', 213, 132, {
    npcId: 'roadlessCaptain',
    dialogueId: 'roadlessCaptainIntro',
    factionId: 'bandits',
    disposition: 'hostile',
    role: 'hostileNpc',
    classId: 'mercenary',
    talk: 'Roadless Captain: "This road belongs to people with knives."'
  }));
}

// -----------------------------------------------------------------------------
// ENEMY CLUSTERS
// -----------------------------------------------------------------------------

function addEarlyRoadEnemies(enemies) {
  addEnemyCluster(enemies, 'hollowling', 'Hollowling', [
    [49, 39], [55, 42], [64, 48], [71, 54], [83, 58],
    [89, 66], [73, 72], [59, 69]
  ], 1);
}

function addThornwoodEnemies(enemies) {
  addEnemyCluster(enemies, 'ashWolf', 'Ash Wolf', [
    [43, 101], [53, 111], [68, 120], [76, 132], [61, 145],
    [41, 139], [87, 154], [92, 116]
  ], 1);

  addEnemyCluster(enemies, 'hollowling', 'Root-Hollowed', [
    [55, 124], [62, 127], [50, 132], [69, 137]
  ], 1);
}

function addGravefieldEnemies(enemies) {
  addEnemyCluster(enemies, 'gravebound', 'Gravebound', [
    [128, 36], [137, 43], [148, 49], [160, 52], [170, 63],
    [119, 68], [143, 75], [165, 80]
  ], 1);

  addEnemyCluster(enemies, 'hollowling', 'Pale Hollowling', [
    [132, 27], [154, 33], [176, 51], [111, 59]
  ], 1);
}

function addChapelEnemies(enemies) {
  addEnemyCluster(enemies, 'gravebound', 'Chapel Gravebound', [
    [221, 41], [231, 48], [244, 42], [255, 55], [236, 63],
    [267, 72], [288, 76]
  ], 2);
}

function addHunterReachEnemies(enemies) {
  addEnemyCluster(enemies, 'ashWolf', 'Ridge Wolf', [
    [215, 103], [228, 112], [252, 121], [272, 139], [286, 151],
    [239, 145], [268, 116], [296, 136]
  ], 1);

  addEnemyCluster(enemies, 'hollowling', 'Road Hollowling', [
    [219, 132], [236, 134], [253, 151]
  ], 1);
}

function addIronMireEnemies(enemies) {
  addEnemyCluster(enemies, 'gravebound', 'Iron Gravebound', [
    [142, 172], [158, 180], [176, 188], [197, 202], [217, 213],
    [189, 219]
  ], 2);

  addEnemyCluster(enemies, 'ashWolf', 'Mire Wolf', [
    [134, 188], [155, 204], [181, 174], [229, 196]
  ], 2);
}

function addOldHollowEnemies(enemies) {
  addEnemyCluster(enemies, 'gravebound', 'Old Hollow Gravebound', [
    [245, 176], [260, 184], [275, 196], [290, 207], [304, 216],
    [253, 218], [296, 188]
  ], 2);

  addEnemyCluster(enemies, 'ashWolf', 'Hollow Wolf', [
    [236, 198], [264, 211], [286, 222], [310, 200]
  ], 2);

  enemies.push(makeEnemy('gravebound', 'oldHollowGatekeeper', 'Old Hollow Gatekeeper', 282, 201, {
    hp: 160,
    maxHp: 160,
    damage: 17,
    dmg: 17,
    xp: 110,
    speed: 38,
    r: 17,
    radius: 17,
    isBoss: true,
    bossName: 'Old Hollow Gatekeeper',
    aggroRange: 260,
    attackRange: 28,
    attackRate: 1.15
  }));
}

// -----------------------------------------------------------------------------
// NEW CONTENT ENEMIES
// -----------------------------------------------------------------------------

function addGothicCastleEnemies(enemies) {
  addEnemyCluster(enemies, 'veyrWraith', 'Veyr Wraith', [
    [282, 47], [287, 55], [296, 48], [302, 57], [291, 63],
    [307, 49], [279, 60]
  ], 2);

  enemies.push(makeEnemy('gravebound', 'castleVeyrGatekeeper', 'Veyr Gatekeeper', 292, 58, {
    hp: 175,
    maxHp: 175,
    damage: 18,
    dmg: 18,
    xp: 125,
    speed: 40,
    r: 17,
    radius: 17,
    isBoss: true,
    bossName: 'Veyr Gatekeeper',
    aggroRange: 260,
    attackRange: 28,
    attackRate: 1.12
  }));
}

function addDemonCultEnemies(enemies) {
  addEnemyCluster(enemies, 'demonCultist', 'Demon Cultist', [
    [296, 178], [301, 184], [309, 179], [313, 188], [305, 193],
    [316, 181], [298, 190]
  ], 2);

  enemies.push(makeEnemy('demonCultist', 'emberVeilSealkeeper', 'Ember Veil Sealkeeper', 306, 184, {
    hp: 180,
    maxHp: 180,
    damage: 19,
    dmg: 19,
    xp: 135,
    speed: 46,
    r: 17,
    radius: 17,
    isBoss: true,
    bossName: 'Ember Veil Sealkeeper',
    aggroRange: 280,
    attackRange: 30,
    attackRate: 1.0
  }));
}

function addBanditEnemies(enemies) {
  addEnemyCluster(enemies, 'roadlessBandit', 'Roadless Bandit', [
    [206, 126], [214, 129], [221, 134], [229, 139], [236, 145],
    [218, 145], [203, 137]
  ], 1);
}