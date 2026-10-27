// regionWorlds.js
// Runtime world builders for act regions and physical long-distance routes.

import { TILE } from './data.js';
import { createWorld, normalizeWorld } from './world.js';
import { getRegionData } from './regionData.js';
import { getTravelRoute } from './travelData.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import { applyCoopAggroRange } from './coopEnemyScaling.js';

export function createRegionWorld(regionId, options = {}) {
  return createWorld({...options,spawnRegionId:regionId});
}

export function createLegacyRegionWorld(regionId, options = {}) {
  const region = getRegionData(regionId) || getRegionData('hearthmereFrontier');
  const world = region?.id === 'hearthmereFrontier'
    ? createWorld({...options,legacy:true})
    : createCompactWorld(120, 64, region?.id || 'hearthmereFrontier');

  world.mode = 'overworld';
  world.regionId = region?.id || 'hearthmereFrontier';
  world.actId = region?.actId || 'act1';
  world.name = region?.name || 'The Orrakai Frontier';
  world.theme = region?.id || 'hearthmereFrontier';
  world.safeZone = false;
  if (options.skipPublishedOverride) world.editorSkipPublishedOverride = true;

  tintRegionTiles(world, region?.id);
  world.objects = region?.id === 'hearthmereFrontier'
    ? [...(world.objects || []), ...createRegionRouteObjects(region?.id)]
    : [
        ...createRegionLandmarkObjects(region?.id),
        ...createRegionResourceObjects(region?.id),
        ...createRegionRouteObjects(region?.id)
      ];
  world.enemies = region?.id === 'hearthmereFrontier'
    ? world.enemies
    : createRegionEnemies(region?.id);

  world.spawn = getRegionSpawn(region?.id);

  return normalizeWorld(world);
}

export function createTravelRouteWorld(routeId, options = {}) {
  return createWorld({...options,spawnRegionId:routeId});
}

export function createLegacyTravelRouteWorld(routeId, options = {}) {
  const route = getTravelRoute(routeId);
  const world = createCompactWorld(120, 56, routeId);

  world.mode = 'travelRoute';
  world.routeId = routeId;
  world.regionId = `${routeId}Route`;
  world.actId = route?.id === 'severedCauseway' ? 'act3' : 'act2';
  world.name = route?.name || 'Long Road';
  world.theme = routeId;
  world.safeZone = false;
  if (options.skipPublishedOverride) world.editorSkipPublishedOverride = true;

  shapeRouteTiles(world, routeId);
  world.objects = createTravelRouteObjects(routeId, route);
  world.enemies = createTravelRouteEnemies(routeId);
  world.drops = [];
  world.effects = [];
  world.combatEffects = [];
  world.spawn = {
    x: 8 * TILE,
    y: 28 * TILE
  };

  return normalizeWorld(world);
}

function createCompactWorld(width, height, seed) {
  const safeWidth = Math.max(48, Math.min(160, Math.floor(width || 120)));
  const safeHeight = Math.max(40, Math.min(80, Math.floor(height || 64)));
  const tiles = [];

  for (let y = 0; y < safeHeight; y++) {
    const row = [];

    for (let x = 0; x < safeWidth; x++) {
      const border = x < 2 || y < 2 || x >= safeWidth - 2 || y >= safeHeight - 2;
      const detail = hash01(x, y, seed);
      row.push({
        biome: border ? 'wall' : detail > 0.92 ? 'ruin' : detail < 0.08 ? 'dead' : 'grass',
        variant: Math.floor(detail * 4) % 4
      });
    }

    tiles.push(row);
  }

  return {
    mode: 'overworld',
    name: 'Runalis Region',
    width: safeWidth,
    height: safeHeight,
    tileSize: TILE,
    tiles,
    objects: [],
    enemies: [],
    drops: [],
    effects: [],
    combatEffects: [],
    mapMeta: {
      generated: true,
      seed,
      tileCount: safeWidth * safeHeight,
      tileBudget: 12800
    }
  };
}

function tintRegionTiles(world, regionId) {
  const tiles = world.tiles || [];

  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < (tiles[y] || []).length; x++) {
      const tile = tiles[y][x];
      if (!tile) continue;

      if (regionId === 'aureateMarches') {
        if (tile.biome === 'grass' && (x + y) % 5 === 0) tile.biome = 'path';
        if (tile.biome === 'dead') tile.biome = 'ruin';
        tile.variant = (x * 7 + y * 3) % 3;
      } else if (regionId === 'ascensionWastes') {
        if (tile.biome === 'grass') tile.biome = (x + y) % 4 === 0 ? 'ruin' : 'dead';
        if (tile.biome === 'path' && (x + y) % 3 === 0) tile.biome = 'ruin';
        if (tile.biome === 'water') tile.biome = 'wall';
        tile.variant = (x * 11 + y * 13) % 4;
      } else {
        tile.variant = tile.variant ?? ((x * 3 + y * 5) % 2);
      }
    }
  }
}

function shapeRouteTiles(world, routeId) {
  const tiles = world.tiles || [];

  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < (tiles[y] || []).length; x++) {
      const tile = tiles[y][x];
      if (!tile) continue;

      const road = y >= 25 && y <= 31;
      const border = y < 4 || y > tiles.length - 5 || x < 3 || x > (tiles[y].length - 4);

      if (border) {
        tile.biome = 'wall';
      } else if (road) {
        tile.biome = 'path';
      } else if (routeId === 'severedCauseway') {
        tile.biome = (x + y) % 3 === 0 ? 'ruin' : 'dead';
      } else {
        tile.biome = (x + y) % 6 === 0 ? 'ruin' : 'grass';
      }

      tile.variant = (x * 5 + y * 9) % 4;
    }
  }
}

function createRegionRouteObjects(regionId) {
  if (regionId === 'hearthmereFrontier') {
    return [];
  }

  if (regionId === 'aureateMarches') {
    return [
      routeGate('severedCausewayGate', 'Severed Causeway', 'severedCauseway', 96, 22),
      routeGate('returnPilgrimRoadGate', 'Road Back to Orrakai', 'pilgrimRoad', 7, 28, { reverse: true })
    ];
  }

  if (regionId === 'ascensionWastes') {
    return [
      routeGate('returnSeveredCausewayGate', 'Causeway Back to Aureate Marches', 'severedCauseway', 7, 28, { reverse: true })
    ];
  }

  return [];
}

function createRegionLandmarkObjects(regionId) {
  if (regionId === 'aureateMarches') {
    return [
      landmark('campfire', 'saintOrvaneCamp', 'Pilgrim Rest Camp', 14, 28, { forceLabel: true }),
      landmark('marketStall', 'saintOrvaneMarket', 'Ration Quartermaster', 19, 28, { forceLabel: true }),
      landmark('npc', 'aureateElian', 'Sister Elian', 24, 26, {
        npcId: 'sisterElian',
        companionId: 'elian',
        dialogueId: 'elianFaithCracks',
        factionId: 'chapel',
        disposition: 'friendly',
        forceLabel: true
      }),
      landmark('npc', 'aureateDusk', 'Kaelen Dusk', 17, 31, {
        npcId: 'kaelenDusk',
        companionId: 'dusk',
        dialogueId: 'duskUnboundWarning',
        factionId: 'gravecallers',
        disposition: 'neutral',
        forceLabel: true
      }),
      landmark('shrine', 'confessionShrine', 'Confession Shrine', 31, 22, {
        forceLabel: true,
        structureVariant: 'holy'
      }),
      landmark('sideZoneEntrance', 'aureatePurificationSite', 'Failed Purification Site', 48, 39, {
        sideZoneType: 'failedPurificationSite',
        regionId,
        theme: 'holy',
        structureArchetype: 'ruin',
        structureVariant: 'holy',
        structureImportance: 'named',
        tier: 4,
        forceLabel: true
      }),
      landmark('towerEntrance', 'aureateInfiniteDungeon', 'The Confession Vaults', 70, 37, {
        infiniteDungeonRegionId: regionId,
        structureArchetype: 'tower',
        structureVariant: 'holy',
        structureImportance: 'major',
        forceLabel: true
      }),
      landmark('dungeonEntrance', 'shatteredChoirEntrance', 'The Shattered Choir', 86, 26, {
        forceLabel: true,
        dungeonId: 'shatteredChoir',
        theme: 'holy',
        structureArchetype: 'shrine',
        structureVariant: 'holy',
        structureImportance: 'major',
        tier: 4,
        depth: 3
      })
    ];
  }

  if (regionId === 'ascensionWastes') {
    return [
      landmark('campfire', 'lastLanternCamp', 'Last Lantern Camp', 14, 28, { forceLabel: true }),
      landmark('npc', 'wastesMara', 'Mara Vell', 19, 28, {
        npcId: 'maraVell',
        companionId: 'mara',
        dialogueId: 'maraTrainerDialogue',
        factionId: 'thornbound',
        disposition: 'friendly',
        forceLabel: true
      }),
      landmark('npc', 'wastesBram', 'Bram', 22, 31, {
        npcId: 'bram',
        companionId: 'bram',
        dialogueId: 'bramTrainerDialogue',
        factionId: 'outpost',
        disposition: 'friendly',
        forceLabel: true
      }),
      landmark('shrine', 'brokenNetworkShrine', 'Broken Network Shrine', 28, 31, {
        forceLabel: true,
        structureArchetype: 'ruin',
        structureVariant: 'cosmic'
      }),
      landmark('sideZoneEntrance', 'wastesLightstormScar', 'Lightstorm Scar', 51, 38, {
        sideZoneType: 'lightstormScar',
        regionId,
        theme: 'cosmic',
        structureArchetype: 'ruin',
        structureVariant: 'cosmic',
        structureImportance: 'named',
        tier: 7,
        forceLabel: true
      }),
      landmark('towerEntrance', 'wastesInfiniteDungeon', 'The Light Beneath Names', 72, 36, {
        infiniteDungeonRegionId: regionId,
        structureArchetype: 'tower',
        structureVariant: 'cosmic',
        structureImportance: 'major',
        forceLabel: true
      }),
      landmark('dungeonEntrance', 'ascensionSpireEntrance', 'The Ascension Spire', 91, 24, {
        forceLabel: true,
        dungeonId: 'ascensionSpire',
        theme: 'cosmic',
        structureArchetype: 'tower',
        structureVariant: 'cosmic',
        structureImportance: 'major',
        tier: 8,
        depth: 4
      })
    ];
  }

  return [];
}

function createRegionResourceObjects(regionId) {
  const configs = regionId === 'ascensionWastes'
    ? [
        ['runestone', 'wastesEssence1', 'Fractured Essence', 38, 18],
        ['runestone', 'wastesEssence2', 'Fractured Essence', 58, 42],
        ['ore', 'wastesOre1', 'Black Glass Seam', 82, 18],
        ['bone', 'wastesMemory1', 'Name-Eaten Remains', 94, 38]
      ]
    : [
        ['herb', 'aureateHerb1', 'Pilgrim Herb', 36, 18],
        ['runestone', 'aureateRune1', 'Choir Glass Fragment', 55, 42],
        ['ore', 'aureateOre1', 'Sanctified Iron Seam', 78, 18],
        ['bone', 'aureateRelic1', 'Confession Relics', 93, 39]
      ];

  return configs.map(([kind, id, name, x, y]) => landmark(kind, id, name, x, y, {
    itemId: kind === 'herb' ? 'emberleaf' : undefined,
    respawnTime: 120,
    depleted: false
  }));
}

function createTravelRouteObjects(routeId, route) {
  const checkpoint = routeId === 'severedCauseway'
    ? {
        id: `${routeId}LastLantern`,
        kind: 'npc',
        name: 'Last Lantern Echo',
        npcId: 'lastLanternEcho',
        dialogueId: 'lastLanternCrossingDialogue',
        x: 72 * TILE,
        y: 27 * TILE,
        r: 20,
        forceLabel: true,
        labelPriority: 9
      }
    : {
        id: `${routeId}Checkpoint`,
        kind: 'npc',
        name: 'Checkpoint Priest',
        npcId: 'checkpointPriest',
        dialogueId: 'pilgrimRoadCheckpointDialogue',
        factionId: 'chapel',
        x: 72 * TILE,
        y: 27 * TILE,
        r: 20,
        forceLabel: true,
        labelPriority: 9
      };

  return [
    {
      id: `${routeId}Camp`,
      kind: 'campfire',
      name: 'Expedition Camp',
      x: 12 * TILE,
      y: 28 * TILE,
      r: 18,
      forceLabel: true,
      labelPriority: 6
    },
    {
      id: `${routeId}SupplyCache`,
      kind: 'worldCache',
      name: routeId === 'severedCauseway' ? 'Broken Ward Cache' : 'Abandoned Caravan Cache',
      x: 37 * TILE,
      y: 30 * TILE,
      r: 20,
      forceLabel: true,
      labelPriority: 7,
      color: routeId === 'severedCauseway' ? '#b68cff' : '#d9ad4f',
      rewards: routeId === 'severedCauseway'
        ? [['lightstormWard', 1], ['towerFragment', 1]]
        : [['fieldRations', 18], ['ironScrap', 3]],
      xp: routeId === 'severedCauseway' ? 60 : 30,
      message: routeId === 'severedCauseway'
        ? 'Recovered a cracked ward cache from the broken road.'
        : 'Recovered supplies from an abandoned caravan cache.'
    },
    {
      id: `${routeId}Shrine`,
      kind: 'shrine',
      name: routeId === 'severedCauseway' ? 'Last Lantern Shrine' : 'Roadside Shrine',
      x: 55 * TILE,
      y: 26 * TILE,
      r: 18,
      forceLabel: true,
      labelPriority: 7
    },
    checkpoint,
    {
      id: `${routeId}Exit`,
      kind: 'travelRouteExit',
      name: route?.toRegionId === 'ascensionWastes' ? 'Enter the Wastes' : 'Enter the Marches',
      routeId,
      x: 106 * TILE,
      y: 28 * TILE,
      r: 30,
      forceLabel: true,
      labelPriority: 10
    }
  ];
}

function createRegionEnemies(regionId) {
  if (regionId === 'aureateMarches') {
    return [
      regionEnemy('aureateKnight1', 'shieldKnight', 'Oathbound Knight', 39, 25, 185, 19),
      regionEnemy('aureateAcolyte1', 'cultist', 'Purifier Acolyte', 53, 33, 125, 17),
      regionEnemy('aureateWraith1', 'wraith', 'Radiant Wraith', 72, 23, 145, 21),
      regionEnemy('aureateKnight2', 'shieldKnight', 'Checkpoint Knight', 84, 32, 205, 21)
    ];
  }

  if (regionId === 'ascensionWastes') {
    return [
      regionEnemy('wastesKnight1', 'shieldKnight', 'Network Knight', 34, 26, 265, 27),
      regionEnemy('wastesEcho1', 'wraith', 'Zephyr Echo', 52, 20, 215, 31),
      regionEnemy('wastesAcolyte1', 'cultist', 'Purified Confessor', 67, 34, 205, 29),
      regionEnemy('wastesBrute1', 'brute', 'Unity Brute', 86, 27, 340, 34)
    ];
  }

  return [];
}

function createTravelRouteEnemies(routeId) {
  const kinds = routeId === 'severedCauseway'
    ? ['shieldKnight', 'cultist', 'wraith', 'brute', 'cultist', 'wraith']
    : ['shieldKnight', 'hollowling', 'basicBeast', 'archer', 'hollowling', 'shieldKnight'];

  const names = routeId === 'severedCauseway'
    ? ['Network Knight', 'Choir-Made Confessor', 'Zephyr Echo', 'Unity Brute', 'Purified Citizen', 'Assimilated Echo']
    : ['Covenant Patrol', 'Road Blighted Corpse', 'Corrupted Beast', 'Checkpoint Archer', 'Pale Blighted Corpse', 'Armoured Roadguard'];

  return kinds.map((kind, index) => applyCoopAggroRange(applyEnemyStrengthScaling({
    id: `${routeId}-${kind}-${index}`,
    kind,
    archetype: kind,
    name: names[index] || (routeId === 'severedCauseway' ? 'Route Warden' : 'Road Ambusher'),
    x: (34 + index * 18) * TILE,
    y: (index % 2 ? 31 : 25) * TILE,
    r: 14,
    radius: 14,
    hp: routeId === 'severedCauseway' ? 130 : 72,
    maxHp: routeId === 'severedCauseway' ? 130 : 72,
    damage: routeId === 'severedCauseway' ? 18 : 10,
    dmg: routeId === 'severedCauseway' ? 18 : 10,
    xp: routeId === 'severedCauseway' ? 60 : 28,
    speed: routeId === 'severedCauseway' ? 58 : 48,
    aggroRange: 260,
    attackRange: 28,
    attackRate: 1.05,
    attackCooldown: 0,
    dead: false,
    remove: false
  }), 260));
}

function landmark(kind, id, name, tileX, tileY, extra = {}) {
  return {
    id,
    kind,
    name,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    r: extra.r || 22,
    labelPriority: 8,
    ...extra
  };
}

function regionEnemy(id, kind, name, tileX, tileY, hp, damage) {
  return applyCoopAggroRange(applyEnemyStrengthScaling({
    id,
    kind,
    archetype: kind,
    name,
    x: tileX * TILE,
    y: tileY * TILE,
    r: 14,
    radius: 14,
    hp,
    maxHp: hp,
    damage,
    dmg: damage,
    xp: Math.max(40, Math.floor(hp * 0.35)),
    speed: kind === 'brute' ? 38 : 54,
    aggroRange: 270,
    attackRange: kind === 'cultist' ? 170 : 30,
    attackRate: kind === 'brute' ? 0.55 : 1,
    attackCooldown: 0,
    dead: false,
    remove: false
  }), 270);
}

function routeGate(id, name, routeId, tileX, tileY, extra = {}) {
  return {
    id,
    kind: extra.reverse ? 'travelRouteReturnGate' : 'travelRouteGate',
    name,
    routeId,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    r: 28,
    forceLabel: true,
    labelPriority: 9,
    ...extra
  };
}

function getRegionSpawn(regionId) {
  if (regionId === 'aureateMarches') {
    return { x: 10 * TILE, y: 28 * TILE };
  }

  if (regionId === 'ascensionWastes') {
    return { x: 10 * TILE, y: 28 * TILE };
  }

  return { x: 39 * TILE, y: 29 * TILE };
}

function hash01(x, y, seed) {
  let hash = 2166136261;
  const text = `${seed}:${x}:${y}`;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}
