// runalisContentExpansion.js
// Runalis RPG content expansion pack.
//
// Purpose:
// - Adds a denser RPG overworld layer without bloating overworldMap.js.
// - Adds new settlements, camps, shrines, dungeon entrances, NPCs, resources,
//   landmarks, enemy patrols, mini-bosses, and hand-authored encounter spaces.
// - Uses existing object/enemy kinds so the current render/combat/interact systems
//   keep working without a major rewrite.

import {
  makeObject,
  makeDecorObject,
  resourceRespawn,
  scatterObjects,
  makeEnemy,
  addEnemyCluster,
  scaleEnemyStats
} from './overworldUtils.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function applyRunalisContentExpansion(ctx, objects, enemies) {
  if (!objects || !enemies) return;

  addExpandedLandmarkDressing(objects);
  addExpandedResourceRoutes(objects);
  addExpandedRpgNpcs(objects);
  addExpandedDungeonEntrances(objects);
  addExpandedAmbientWorldObjects(objects);

  addExpandedEnemyEncounters(enemies);
  addExpandedMiniBosses(enemies);
}

// -----------------------------------------------------------------------------
// LANDMARK / POI DRESSING
// -----------------------------------------------------------------------------

function addExpandedLandmarkDressing(objects) {
  // Ashen Orchard - a corrupted farm/orchard between the outpost and gravefields.
  objects.push(makeDecorObject('deadRoot', 'ashen-orchard-root-1', 'Ashen Orchard Root', 116, 69, { scale: 1.25 }));
  objects.push(makeDecorObject('deadRoot', 'ashen-orchard-root-2', 'Ashen Orchard Root', 123, 74, { scale: 1.05 }));
  objects.push(makeDecorObject('stump', 'ashen-orchard-stump-1', 'Burned Stump', 118, 78, { scale: 0.9 }));
  objects.push(makeDecorObject('graveMarker', 'ashen-orchard-marker-1', 'Field Grave', 126, 70, { scale: 0.8 }));
  objects.push(makeDecorObject('brokenWall', 'ashen-orchard-wall-1', 'Collapsed Orchard Wall', 113, 75, {
    scale: 0.92,
    orientation: 'horizontal'
  }));

  // Pilgrim Bridge - narrative crossing on the road to the chapel.
  objects.push(makeDecorObject('signpost', 'pilgrim-bridge-sign', 'Pilgrim Bridge Sign', 181, 76, { scale: 0.9 }));
  objects.push(makeDecorObject('brokenWall', 'pilgrim-bridge-wall-1', 'Old Bridge Stone', 178, 80, { scale: 0.85 }));
  objects.push(makeDecorObject('brokenWall', 'pilgrim-bridge-wall-2', 'Old Bridge Stone', 187, 78, { scale: 0.85 }));
  objects.push(makeDecorObject('ruinPillar', 'pilgrim-bridge-pillar-1', 'Pilgrim Pillar', 183, 73, { scale: 0.8 }));

  // Lantern Marsh - safer rest area inside Iron Mire.
  objects.push(makeDecorObject('signpost', 'lantern-marsh-sign', 'Lantern Marsh Sign', 176, 194, { scale: 0.88 }));
  objects.push(makeDecorObject('smallBoulder', 'lantern-marsh-stone-1', 'Wet Stone', 172, 198, { scale: 0.92, dark: true }));
  objects.push(makeDecorObject('smallBoulder', 'lantern-marsh-stone-2', 'Wet Stone', 183, 202, { scale: 0.82, dark: true }));
  objects.push(makeDecorObject('deadRoot', 'lantern-marsh-root-1', 'Marsh Root', 180, 198, { scale: 1.0 }));
  objects.push(makeDecorObject('shrub', 'lantern-marsh-reed-1', 'Lantern Reed', 174, 191, { scale: 1.05 }));

  // Mirror Grove - strange quiet forest shrine.
  objects.push(makeDecorObject('treeCluster', 'mirror-grove-tree-1', 'Mirror Grove Trees', 86, 151, { scale: 1.18 }));
  objects.push(makeDecorObject('treeCluster', 'mirror-grove-tree-2', 'Mirror Grove Trees', 94, 158, { scale: 1.05 }));
  objects.push(makeDecorObject('shrub', 'mirror-grove-shrub-1', 'Silver Shrub', 91, 151, { scale: 0.9 }));
  objects.push(makeDecorObject('graveMarker', 'mirror-grove-marker-1', 'Nameless Stone', 89, 162, { scale: 0.75 }));

  // Saltwell Camp - hunter/fishing stop in the riverlands.
  objects.push(makeDecorObject('signpost', 'saltwell-sign', 'Saltwell Camp Sign', 101, 211, { scale: 0.86 }));
  objects.push(makeDecorObject('stump', 'saltwell-stump-1', 'Camp Stump', 97, 214, { scale: 0.82 }));
  objects.push(makeDecorObject('shrub', 'saltwell-shrub-1', 'River Shrub', 106, 216, { scale: 0.92 }));

  // Watcher Ridge - dangerous highland encounter site.
  objects.push(makeDecorObject('ruinPillar', 'watcher-ridge-pillar-1', 'Watcher Pillar', 268, 128, { scale: 1.15 }));
  objects.push(makeDecorObject('ruinPillar', 'watcher-ridge-pillar-2', 'Watcher Pillar', 275, 132, { scale: 0.95 }));
  objects.push(makeDecorObject('brokenWall', 'watcher-ridge-wall-1', 'Ridge Wall', 271, 136, {
    scale: 1.0,
    orientation: 'horizontal'
  }));
}

// -----------------------------------------------------------------------------
// RESOURCES
// -----------------------------------------------------------------------------

function addExpandedResourceRoutes(objects) {
  // Early-game foraging loop north/east of the outpost.
  scatterObjects(objects, 'emberleaf', 'Emberleaf', 'exp-emberleaf-road', [
    [39, 44], [46, 49], [51, 54], [59, 58], [66, 64], [76, 69]
  ]);

  // Thornwood reagent loop.
  scatterObjects(objects, 'emberleaf', 'Wild Emberleaf', 'exp-emberleaf-thornwood', [
    [49, 111], [64, 116], [72, 129], [87, 143], [95, 154]
  ]);

  scatterObjects(objects, 'gravecap', 'Pale Gravecap', 'exp-gravecap-thornwood', [
    [53, 132], [68, 140], [91, 166]
  ]);

  // Gravefield / chapel occult loop.
  scatterObjects(objects, 'gravecap', 'Ashen Gravecap', 'exp-gravecap-gravefields', [
    [131, 54], [147, 48], [166, 58], [196, 61], [225, 68], [252, 70]
  ]);

  // Iron Mire mining loop.
  scatterObjects(objects, 'ore', 'Black Iron Vein', 'exp-iron-mire-ore', [
    [151, 182], [162, 190], [179, 205], [192, 213], [211, 216]
  ]);

  // Riverland material loop.
  scatterObjects(objects, 'riverReed', 'River Reed', 'exp-river-reed', [
    [56, 197], [67, 209], [83, 218], [103, 221], [119, 215]
  ]);

  // Make these slower so resource routes feel meaningful.
  for (const object of objects) {
    if (!object?.id?.startsWith('exp-')) continue;

    if (object.kind === 'ore') Object.assign(object, resourceRespawn(95));
    if (object.kind === 'gravecap') Object.assign(object, resourceRespawn(80));
    if (object.kind === 'emberleaf') Object.assign(object, resourceRespawn(55));
    if (object.kind === 'riverReed') Object.assign(object, resourceRespawn(65));
  }
}

// -----------------------------------------------------------------------------
// NPCS / QUEST GIVERS / WORLD FLAVOR
// -----------------------------------------------------------------------------

function addExpandedRpgNpcs(objects) {
  objects.push(makeObject('npc', 'oldTarin', 'Old Tarin', 40, 45, {
    npcId: 'oldTarin',
    dialogueId: 'oldTarinIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'roadGuide',
    talk: 'Old Tarin: "The safest path is never the shortest one."'
  }));

  objects.push(makeObject('npc', 'lumenSable', 'Lumen Sable', 181, 196, {
    npcId: 'lumenSable',
    dialogueId: 'lumenSableIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'marshGuide',
    talk: 'Lumen Sable: "Follow the lanterns. Ignore anything that copies your voice."'
  }));

  objects.push(makeObject('npc', 'sableCartographer', 'Sable Cartographer', 182, 77, {
    npcId: 'sableCartographer',
    dialogueId: 'sableCartographerIntro',
    factionId: 'chapel',
    disposition: 'neutral',
    role: 'cartographer',
    talk: 'Sable Cartographer: "Every map of this place becomes wrong by morning."'
  }));

  objects.push(makeObject('npc', 'mireWidow', 'Mire Widow', 176, 201, {
    npcId: 'mireWidow',
    dialogueId: 'mireWidowIntro',
    factionId: 'gravecallers',
    disposition: 'uncertain',
    role: 'questGiver',
    classId: 'necromancer',
    talk: 'Mire Widow: "Do not look into the water unless you are ready to be recognized."'
  }));

  objects.push(makeObject('npc', 'fenrickSalt', 'Fenrick Salt', 101, 211, {
    npcId: 'fenrickSalt',
    dialogueId: 'fenrickSaltIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'fisher',
    talk: 'Fenrick Salt: "Fish bite better after a fight. Do not ask me why."'
  }));

  objects.push(makeObject('npc', 'hollowPilgrim', 'Hollow Pilgrim', 121, 74, {
    npcId: 'hollowPilgrim',
    dialogueId: 'hollowPilgrimIntro',
    factionId: 'chapel',
    disposition: 'uncertain',
    role: 'wanderingQuest',
    talk: 'Hollow Pilgrim: "I buried my name under the orchard. Something keeps digging it up."'
  }));

  objects.push(makeObject('npc', 'watcherIvo', 'Watcher Ivo', 269, 130, {
    npcId: 'watcherIvo',
    dialogueId: 'watcherIvoIntro',
    factionId: 'outpost',
    disposition: 'wounded',
    role: 'warningNpc',
    talk: 'Watcher Ivo: "Do not climb the ridge unless you want everything below to see you."'
  }));
}

// -----------------------------------------------------------------------------
// DUNGEON ENTRANCES / REST SITES / SHRINES
// -----------------------------------------------------------------------------

function addExpandedDungeonEntrances(objects) {
  objects.push(makeObject('dungeonEntrance', 'ashenOrchardCellarEntrance', 'Ashen Orchard Cellar', 121, 76, {
    r: 24,
    poiId: 'ashenOrchard',
    seed: 'ashen-orchard-cellar-01',
    theme: 'grave',
    depth: 1,
    tier: 1,
    recommendedLevel: 3,
    talk: 'A root-choked cellar descends beneath the burned orchard.'
  }));

  objects.push(makeObject('dungeonEntrance', 'mirrorGroveUnderrootEntrance', 'Mirror Grove Underroot', 90, 158, {
    r: 24,
    poiId: 'mirrorGrove',
    seed: 'mirror-grove-underroot-01',
    theme: 'thorn',
    depth: 1,
    tier: 2,
    recommendedLevel: 6,
    talk: 'A living tunnel opens between roots polished smooth as glass.'
  }));

  objects.push(makeObject('dungeonEntrance', 'pilgrimCryptEntrance', 'Pilgrim Crypt', 184, 79, {
    r: 24,
    poiId: 'pilgrimBridge',
    seed: 'pilgrim-crypt-01',
    theme: 'grave',
    depth: 2,
    tier: 2,
    recommendedLevel: 8,
    talk: 'A narrow stair vanishes beneath the bridge stones.'
  }));

  objects.push(makeObject('dungeonEntrance', 'watcherRidgeVaultEntrance', 'Watcher Ridge Vault', 272, 134, {
    r: 26,
    poiId: 'watcherRidge',
    seed: 'watcher-ridge-vault-01',
    theme: 'mine',
    depth: 2,
    tier: 3,
    recommendedLevel: 14,
    talk: 'A sealed vault hums under the ridge.'
  }));
}

function addExpandedAmbientWorldObjects(objects) {
  objects.push(makeObject('campfire', 'ashenOrchardCampfire', 'Ashen Orchard Campfire', 116, 72, { r: 18 }));
  objects.push(makeObject('campfire', 'lanternMarshCampfire', 'Lantern Marsh Campfire', 180, 196, { r: 18 }));
  objects.push(makeObject('campfire', 'saltwellCampfire', 'Saltwell Campfire', 101, 212, { r: 18 }));
  objects.push(makeObject('campfire', 'pilgrimBridgeCampfire', 'Pilgrim Bridge Campfire', 182, 76, { r: 18 }));

  objects.push(makeObject('shrine', 'mirrorGroveShrine', 'Mirror Grove Shrine', 90, 156, { r: 20 }));
  objects.push(makeObject('shrine', 'lanternMarshShrine', 'Lantern Marsh Shrine', 176, 198, { r: 20 }));
  objects.push(makeObject('shrine', 'watcherRidgeShrine', 'Watcher Ridge Shrine', 272, 131, { r: 20 }));
}

// -----------------------------------------------------------------------------
// ENEMIES
// -----------------------------------------------------------------------------

function addExpandedEnemyEncounters(enemies) {
  // Early road threats, deliberately spaced out so new players get practice.
  addEnemyCluster(enemies, 'hollowling', 'Hollowling Forager', [
    [52, 50], [63, 60], [75, 67], [91, 72]
  ], 1);

  // Ashen Orchard pocket dungeon overworld guard.
  addEnemyCluster(enemies, 'hollowling', 'Orchard Hollowling', [
    [115, 71], [123, 78], [129, 73]
  ], 2);

  // Chapel approach / pilgrim bridge.
  addEnemyCluster(enemies, 'gravebound', 'Pilgrim Gravebound', [
    [176, 73], [188, 82], [196, 76]
  ], 2);

  // Thornwood / Mirror Grove.
  addEnemyCluster(enemies, 'ashWolf', 'Thornwood Ash Wolf', [
    [78, 137], [88, 150], [98, 158], [73, 160]
  ], 2);

  addEnemyCluster(enemies, 'hollowling', 'Root-Hollowed Wanderer', [
    [88, 154], [92, 162], [97, 150]
  ], 2);

  // Iron Mire.
  addEnemyCluster(enemies, 'gravebound', 'Mire Gravebound', [
    [165, 187], [177, 201], [195, 206], [213, 212]
  ], 3);

  // Hunter reach roadless patrols.
  addEnemyCluster(enemies, 'roadlessBandit', 'Roadless Cutthroat', [
    [228, 111], [238, 122], [252, 134]
  ], 2);

  // Old Hollow / late-game pressure.
  addEnemyCluster(enemies, 'veyrWraith', 'Hollow Wraith', [
    [246, 179], [263, 192], [286, 213], [301, 221]
  ], 3);

  // Demon cult outer ring.
  addEnemyCluster(enemies, 'demonCultist', 'Ember Veil Zealot', [
    [292, 174], [300, 188], [314, 180], [310, 195]
  ], 3);
}

function addExpandedMiniBosses(enemies) {
  enemies.push(makeEnemy('hollowling', 'ashenOrchardKeeper', 'The Orchard Keeper', 123, 73, {
    tier: 2,
    ...scaleEnemyStats('hollowling', 2),
    hp: 165,
    maxHp: 165,
    damage: 12,
    dmg: 12,
    xp: 130,
    speed: 38,
    r: 19,
    radius: 19,
    aggroRange: 260,
    attackRange: 30,
    attackRate: 1.15,
    isBoss: true,
    bossName: 'The Orchard Keeper'
  }));

  enemies.push(makeEnemy('ashWolf', 'mirrorGroveWhiteWolf', 'White Ash Wolf', 91, 158, {
    tier: 2,
    ...scaleEnemyStats('ashWolf', 2),
    hp: 185,
    maxHp: 185,
    damage: 15,
    dmg: 15,
    xp: 155,
    speed: 86,
    r: 18,
    radius: 18,
    aggroRange: 285,
    attackRate: 0.82,
    isBoss: true,
    bossName: 'White Ash Wolf'
  }));

  enemies.push(makeEnemy('gravebound', 'pilgrimBridgeWarden', 'Warden of the Bridge', 184, 80, {
    tier: 3,
    ...scaleEnemyStats('gravebound', 3),
    hp: 260,
    maxHp: 260,
    damage: 18,
    dmg: 18,
    xp: 230,
    speed: 44,
    r: 20,
    radius: 20,
    aggroRange: 285,
    attackRange: 31,
    attackRate: 1.05,
    isBoss: true,
    bossName: 'Warden of the Bridge'
  }));

  enemies.push(makeEnemy('veyrWraith', 'watcherRidgeWraith', 'Watcher Above the Road', 272, 132, {
    tier: 4,
    ...scaleEnemyStats('veyrWraith', 4),
    hp: 330,
    maxHp: 330,
    damage: 24,
    dmg: 24,
    xp: 360,
    speed: 58,
    r: 21,
    radius: 21,
    aggroRange: 320,
    attackRange: 32,
    attackRate: 0.95,
    isBoss: true,
    bossName: 'Watcher Above the Road'
  }));
}