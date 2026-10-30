// majorPoiStructures.js
// Large, authored overworld compositions for important dungeon POIs.
//
// Each definition keeps presentation, collision, entrance placement, and exterior
// guards together. Add new structures by defining pieces, blockers, an entrance,
// and spawn anchors using offsets from a shared overworld landmark.

import { TILE } from './data.js';
import {
  ACT1_LANDMARKS,
  makeDecorObject,
  makeEnemy,
  makeObject,
  scaleEnemyStats
} from './overworldUtils.js';

const RESOURCE_KINDS = new Set([
  'herb',
  'emberleaf',
  'ashFruit',
  'gravecap',
  'ore',
  'bone',
  'reed',
  'riverReed',
  'fish',
  'runestone',
  'lanternMoss'
]);

export const MAJOR_POI_STRUCTURES = Object.freeze({
  castleVeyr: {
    id: 'castleVeyr',
    name: 'Castle Veyreign',
    anchor: ACT1_LANDMARKS.castleVeyr,
    style: 'veyr',
    footprint: Object.freeze({ width: 30, height: 22 }),
    approachDirection: 'south',
    layerRules: Object.freeze({ courtyardUnderlay: true, depthSortPieces: true }),
    collisionHints: Object.freeze({ keepGateLaneOpen: true, wallTilesBlock: true }),
    cleanupRadius: 22,
    entrance: {
      id: 'castleVeyrOverworldEntrance',
      name: 'Castle Veyreign',
      dungeonName: 'Castle Veyreign: The Oathbound Court',
      poiId: 'gothicCastle',
      dungeonId: 'castleVeyr',
      theme: 'ruin',
      tier: 3,
      recommendedLevel: 25,
      offset: [0, 0],
      labelOffset: 92,
      talk: 'The dead gate of Castle Veyreign stands open just wide enough to invite the living inside.'
    },
    pieces: [
      piece('courtyard', 0, -9, { width: 25, height: 16 }),
      piece('wall', 0, -18, { orientation: 'horizontal', length: 24 }),
      piece('wall', -14, -13, { orientation: 'vertical', length: 8 }),
      piece('wall', -14, -6, { orientation: 'vertical', length: 7 }),
      piece('wall', 14, -13, { orientation: 'vertical', length: 8 }),
      piece('wall', 14, -6, { orientation: 'vertical', length: 7 }),
      piece('wall', -9, -1, { orientation: 'horizontal', length: 8 }),
      piece('wall', 9, -1, { orientation: 'horizontal', length: 8 }),
      piece('tower', -14, -18, { scale: 1.3, roof: 'spire' }),
      piece('tower', 14, -18, { scale: 1.3, roof: 'spire' }),
      piece('tower', -14, -1, { scale: 1.18, roof: 'spire' }),
      piece('tower', 14, -1, { scale: 1.18, roof: 'spire' }),
      piece('gatehouse', 0, -2, { scale: 1.35 }),
      piece('keep', 0, -12, { scale: 1.55 }),
      piece('keepWing', -8, -12, { scale: 1.05 }),
      piece('keepWing', 8, -12, { scale: 1.05 }),
      piece('statue', -6, -7, { variant: 'mourner' }),
      piece('statue', 6, -7, { variant: 'mourner' }),
      piece('brazier', -5, -3, { scale: 1.1 }),
      piece('brazier', 5, -3, { scale: 1.1 }),
      piece('banner', -12, -9, { scale: 1.15 }),
      piece('banner', 12, -9, { scale: 1.15 })
    ],
    blockers: [
      [-15, -19, 30, 3],
      [-15, -17, 3, 17],
      [12, -17, 3, 17],
      [-15, -3, 11, 3],
      [4, -3, 11, 3],
      [-7, -16, 14, 7]
    ],
    gateLane: [-3, -9, 6, 14],
    spawnAnchors: [
      guard('veyrWraith', 'Veyr Approach Wraith', -8, 4, 3, { guardRole: 'approachPatrol' }),
      guard('veyrWraith', 'Veyr Approach Wraith', 8, 4, 3, { guardRole: 'approachPatrol' }),
      guard('shieldKnight', 'Veyr Oathguard', -5, -5, 3, { guardRole: 'gateDefender' }),
      guard('shieldKnight', 'Veyr Oathguard', 5, -5, 3, { guardRole: 'gateDefender' }),
      guard('archer', 'Veyr Wall Watcher', -17, -9, 3, { guardRole: 'wallSentry' }),
      guard('archer', 'Veyr Wall Watcher', 17, -9, 3, { guardRole: 'wallSentry' }),
      guard('gravePriest', 'Veyr Court Cantor', 0, -8, 4, { guardRole: 'courtyardGroup' }),
      guard('veyrWraith', 'Veyr Gatekeeper', 0, 5, 4, {
        id: 'castleVeyrGatekeeper',
        guardRole: 'entranceGuard',
        namedExteriorElite: true,
        eliteModifier: 'armoured',
        hp: 420,
        maxHp: 420,
        damage: 31,
        dmg: 31,
        xp: 220
      })
    ],
    interactables: [
      interactable('worldCache', 'castleVeyrRelicCache', 'Veyrbound Relic Cache', -10, -11, {
        rewards: [['veyrSigil', 2], ['veyrglassShard', 1], ['paleEssence', 2]],
        xp: 45,
        color: '#b68cff',
        message: 'An oathbound cache yields relics from the silent Veyr court.'
      })
    ]
  },

  redSealKeep: {
    id: 'redSealKeep',
    name: 'Last Dawn Keep',
    anchor: ACT1_LANDMARKS.demonCultLair,
    style: 'redSeal',
    footprint: Object.freeze({ width: 28, height: 21 }),
    approachDirection: 'north',
    layerRules: Object.freeze({ courtyardUnderlay: true, depthSortPieces: true }),
    collisionHints: Object.freeze({ keepGateLaneOpen: true, wallTilesBlock: true }),
    cleanupRadius: 21,
    entrance: {
      id: 'emberVeilLairEntrance',
      name: 'Last Dawn Keep',
      dungeonName: 'Last Dawn Keep: Last Dawn Descent',
      poiId: 'demonCultLair',
      dungeonId: 'demonCultLair',
      theme: 'demon',
      tier: 4,
      recommendedLevel: 12,
      offset: [0, 0],
      labelOffset: 88,
      talk: 'Last Dawn Keep guards the Last Dawn descent to Malakar\'s Divine Age prison.'
    },
    pieces: [
      piece('courtyard', 0, 8, { width: 23, height: 17 }),
      piece('wall', 0, 17, { orientation: 'horizontal', length: 22 }),
      piece('wall', -13, 6, { orientation: 'vertical', length: 10 }),
      piece('wall', -13, 14, { orientation: 'vertical', length: 6 }),
      piece('wall', 13, 6, { orientation: 'vertical', length: 10 }),
      piece('wall', 13, 14, { orientation: 'vertical', length: 6 }),
      piece('wall', -8, 1, { orientation: 'horizontal', length: 7 }),
      piece('wall', 8, 1, { orientation: 'horizontal', length: 7 }),
      piece('bastion', -13, 1, { scale: 1.25 }),
      piece('bastion', 13, 1, { scale: 1.25 }),
      piece('bastion', -13, 17, { scale: 1.25 }),
      piece('bastion', 13, 17, { scale: 1.25 }),
      piece('gatehouse', 0, 1, { scale: 1.35 }),
      piece('keep', 0, 13, { scale: 1.5, roof: 'battlement' }),
      piece('sealObelisk', 0, 7, { scale: 1.2 }),
      piece('barricade', -7, -4, { orientation: 'diagonalLeft' }),
      piece('barricade', 7, -4, { orientation: 'diagonalRight' }),
      piece('brazier', -5, 4, { scale: 1.15 }),
      piece('brazier', 5, 4, { scale: 1.15 }),
      piece('banner', -11, 8, { scale: 1.2 }),
      piece('banner', 11, 8, { scale: 1.2 })
    ],
    blockers: [
      [-14, 16, 28, 3],
      [-14, 1, 3, 18],
      [11, 1, 3, 18],
      [-14, 0, 10, 3],
      [4, 0, 10, 3],
      [-7, 10, 14, 7]
    ],
    gateLane: [-3, -6, 6, 15],
    spawnAnchors: [
      guard('demonCultist', 'Last Dawn Road Guard', -8, -6, 4, { guardRole: 'approachPatrol' }),
      guard('demonCultist', 'Last Dawn Road Guard', 8, -6, 4, { guardRole: 'approachPatrol' }),
      guard('shieldKnight', 'Last Dawn Shieldbearer', -5, 5, 4, { guardRole: 'gateDefender' }),
      guard('shieldKnight', 'Last Dawn Shieldbearer', 5, 5, 4, { guardRole: 'gateDefender' }),
      guard('archer', 'Last Dawn Crossbowman', -16, 8, 4, { guardRole: 'wallSentry' }),
      guard('archer', 'Last Dawn Crossbowman', 16, 8, 4, { guardRole: 'wallSentry' }),
      guard('cultist', 'Red Banner Hexer', -8, 9, 4, { guardRole: 'courtyardGroup' }),
      guard('brute', 'Red Banner Enforcer', 8, 9, 4, { guardRole: 'courtyardGroup' }),
      guard('demonCultist', 'Last Dawn Seal-Keeper', 0, -6, 5, {
        id: 'emberVeilSealkeeper',
        guardRole: 'gateCaptain',
        namedExteriorElite: true,
        eliteModifier: 'burning',
        hp: 520,
        maxHp: 520,
        damage: 36,
        dmg: 36,
        xp: 285
      })
    ],
    interactables: [
      interactable('worldCache', 'redSealBastionCache', 'Last Dawn Cache', 9, 11, {
        rewards: [['redSealFragment', 2], ['cultAsh', 3], ['ironScrap', 3]],
        xp: 55,
        color: '#ef6f5e',
        message: 'The bastion cache holds disciplined stores of seal-metal and cult ash.'
      })
    ]
  },

  brokenChapel: {
    id: 'brokenChapel',
    name: 'The Broken Chapel',
    anchor: ACT1_LANDMARKS.brokenChapel,
    style: 'chapel',
    footprint: Object.freeze({ width: 27, height: 22 }),
    approachDirection: 'south',
    cleanupRadius: 22,
    legacyIds: ['chapel-pillar-1', 'chapel-pillar-2', 'chapel-wall-1', 'chapel-wall-2', 'chapel-grave-1', 'chapel-grave-2'],
    pieces: [
      piece('courtyard', 0, -4, { width: 23, height: 18 }),
      piece('ruinWall', 0, -14, { orientation: 'horizontal', length: 19 }),
      piece('ruinWall', -11, -7, { orientation: 'vertical', length: 12 }),
      piece('ruinWall', 11, -7, { orientation: 'vertical', length: 12 }),
      piece('ruinWall', -7, 3, { orientation: 'horizontal', length: 6 }),
      piece('ruinWall', 7, 3, { orientation: 'horizontal', length: 6 }),
      piece('column', -7, -9, { scale: 1.15 }),
      piece('column', 7, -9, { scale: 1.15 }),
      piece('column', -7, -2, { scale: 0.95 }),
      piece('column', 7, -2, { scale: 0.95 }),
      piece('altar', 0, -10, { scale: 1.25 }),
      piece('machine', -4, -7, { scale: 1.05 }),
      piece('sealEngine', 4, -7, { scale: 1.05 }),
      piece('cable', 0, -6, { length: 8 }),
      piece('statue', -9, -12, { scale: 0.8 }),
      piece('statue', 9, -12, { scale: 0.8 })
    ],
    blockers: [
      [-12, -15, 24, 3],
      [-12, -13, 3, 18],
      [9, -13, 3, 18],
      [-12, 2, 8, 3],
      [4, 2, 8, 3]
    ],
    gateLane: [-3, 0, 6, 12],
    spawnAnchors: [
      guard('gravebound', 'Chapel Oath Remnant', -8, 6, 3, { guardRole: 'approachPatrol' }),
      guard('gravebound', 'Chapel Oath Remnant', 8, 6, 3, { guardRole: 'approachPatrol' }),
      guard('gravePriest', 'Failed Purifier', -6, -4, 4, { guardRole: 'courtyardGroup' }),
      guard('cultist', 'Seal Listener', 6, -4, 4, { guardRole: 'courtyardGroup' }),
      guard('shieldKnight', 'Chapel Threshold Warden', 0, 1, 4, { guardRole: 'entranceGuard' })
    ],
    interactables: [
      interactable('poiInvestigation', 'chapelCrackedAltar', 'Cracked Altar', 0, -10, {
        poiId: 'brokenChapel',
        message: 'The altar is hollow. Last Dawn conduits run beneath the Covenant stone.'
      }),
      interactable('poiInvestigation', 'chapelConfessionDevice', 'Broken Confession Device', -5, -7, {
        poiId: 'brokenChapel',
        message: 'The device did not absolve its subjects. It measured and redirected them.'
      }),
      interactable('poiInvestigation', 'chapelLedger', 'Chapel Ledger', 8, -10, {
        poiId: 'brokenChapel',
        message: 'The ledger calls every failed purification a successful containment.'
      }),
      interactable('poiInvestigation', 'chapelSealedStair', 'Sealed Descent', 0, -13, {
        poiId: 'brokenChapel',
        message: 'The sealed stair descends toward the same machinery that answers from Last Dawn Keep.'
      })
    ]
  },

  frontierRoadGate: {
    id: 'frontierRoadGate',
    name: 'Frontier Road Gate',
    anchor: ACT1_LANDMARKS.pilgrimRoadGate,
    style: 'frontier',
    footprint: Object.freeze({ width: 24, height: 17 }),
    approachDirection: 'south',
    cleanupRadius: 17,
    legacyIds: ['hearthmere-pilgrim-road-gate'],
    pieces: [
      piece('courtyard', 0, -2, { width: 21, height: 13 }),
      piece('wall', -8, -7, { orientation: 'horizontal', length: 7 }),
      piece('wall', 8, -7, { orientation: 'horizontal', length: 7 }),
      piece('gatehouse', 0, -7, { scale: 1.05 }),
      piece('watchPost', -11, -7, { scale: 1.05 }),
      piece('watchPost', 11, -7, { scale: 1.05 }),
      piece('barricade', -7, 4, { orientation: 'diagonalLeft' }),
      piece('barricade', 7, 4, { orientation: 'diagonalRight' }),
      piece('crate', -8, -1, { scale: 1.1 }),
      piece('crate', -5, 1, { scale: 0.9 }),
      piece('wagon', 8, 0, { scale: 1.0 }),
      piece('mapTable', 4, -3, { scale: 0.9 }),
      piece('banner', -10, -3, { scale: 1.0 }),
      piece('banner', 10, -3, { scale: 1.0 }),
      piece('brazier', -3, -5, { scale: 0.9 }),
      piece('brazier', 3, -5, { scale: 0.9 })
    ],
    blockers: [
      [-13, -9, 9, 3],
      [4, -9, 9, 3],
      [-13, -8, 3, 7],
      [10, -8, 3, 7]
    ],
    gateLane: [-4, -10, 8, 19],
    travelGate: {
      id: 'hearthmere-pilgrim-road-gate',
      name: 'Frontier Road Gate',
      routeId: 'pilgrimRoad',
      offset: [0, -5],
      talk: 'Beyond this road, Orrakai ends. The Covenant calls it the Pilgrim Road.'
    },
    spawnAnchors: [],
    interactables: [
      interactable('npc', 'frontierRoadQuartermaster', 'Frontier Road Quartermaster', -6, -2, {
        npcId: 'frontierRoadQuartermaster',
        factionId: 'outpost',
        disposition: 'friendly',
        role: 'roadGuide',
        talk: 'Quartermaster: "Past this gate, Orrakai stops forgiving poor preparation. Check the board before you leave."'
      }),
      interactable('npc', 'frontierRoadWatch', 'Frontier Road Watch', 6, -3, {
        npcId: 'frontierRoadWatch',
        factionId: 'outpost',
        disposition: 'friendly',
        role: 'guard',
        talk: 'Road Watch: "The Covenant calls it the Pilgrim Road. We call it the road that does not bring everyone back."'
      }),
      interactable('noticeBoard', 'frontierRoadNoticeBoard', 'Frontier Road Requirements', -8, 2, {
        talk: 'Expeditions require a permit, rations, and enough coin to survive the road.'
      })
    ]
  }
});

export function applyMajorPoiStructures(ctx, objects, enemies) {
  if (!ctx || !Array.isArray(objects) || !Array.isArray(enemies)) return;

  for (const structure of Object.values(MAJOR_POI_STRUCTURES)) {
    clearLegacyFootprint(objects, enemies, structure);
    paintStructureCollision(ctx, structure);
    addStructureObjects(objects, structure);
    addStructureGuards(enemies, structure);
  }
}

function addStructureObjects(objects, structure) {
  const [anchorX, anchorY] = structure.anchor;

  for (let index = 0; index < structure.pieces.length; index++) {
    const definition = structure.pieces[index];
    const [offsetX, offsetY] = definition.offset;
    const drawRadius = Math.max(
      180,
      Number(definition.length || definition.width || 1) * TILE * 0.65
    );

    objects.push(makeDecorObject(
      'majorPoiPiece',
      `${structure.id}-piece-${index}`,
      structure.name,
      anchorX + offsetX,
      anchorY + offsetY,
      {
        majorPoiId: structure.id,
        majorPoiStyle: structure.style,
        pieceType: definition.type,
        hideLabel: true,
        drawRadius,
        sortY: definition.type === 'courtyard' ? (anchorY - 30) * TILE : undefined,
        depthOverlay: isTallDepthPiece(definition.type),
        depthY: (anchorY + offsetY) * TILE + TILE * 0.78,
        depthWidth: getDepthWidth(definition),
        depthBehind: getDepthBehind(definition),
        ...definition
      }
    ));
  }

  const entrance = structure.entrance;
  if (entrance) {
    const [entranceX, entranceY] = entrance.offset;
    objects.push(makeObject(
      'dungeonEntrance',
      entrance.id,
      entrance.name,
      anchorX + entranceX,
      anchorY + entranceY,
      {
        r: 56,
        poiId: entrance.poiId,
        dungeonId: entrance.dungeonId,
        dungeonName: entrance.dungeonName,
        theme: entrance.theme,
        tier: entrance.tier,
        recommendedLevel: entrance.recommendedLevel,
        structureArchetype: structure.style === 'veyr' ? 'castle' : 'fort',
        structureVariant: structure.style === 'veyr' ? 'haunted' : 'infernal',
        structureImportance: 'major',
        structurePresentation: 'anchorOnly',
        structureLabelOffset: entrance.labelOffset,
        majorPoiId: structure.id,
        embeddedEntrance: true,
        forceLabel: true,
        labelPriority: 10,
        talk: entrance.talk
      }
    ));
  }

  if (structure.travelGate) {
    const gate = structure.travelGate;
    objects.push(makeObject('travelRouteGate', gate.id, gate.name, anchorX + gate.offset[0], anchorY + gate.offset[1], {
      r: 46,
      routeId: gate.routeId,
      poiId: 'pilgrimRoadGate',
      majorPoiId: structure.id,
      embeddedEntrance: true,
      forceLabel: true,
      labelPriority: 10,
      structureArchetype: 'fort',
      structureVariant: 'rural',
      structureImportance: 'major',
      structurePresentation: 'anchorOnly',
      talk: gate.talk
    }));
  }

  for (const definition of structure.interactables || []) {
    objects.push(makeObject(
      definition.kind,
      definition.id,
      definition.name,
      anchorX + definition.offset[0],
      anchorY + definition.offset[1],
      {
        majorPoiId: structure.id,
        r: definition.kind === 'worldCache' ? 22 : 18,
        ...definition.extra
      }
    ));
  }
}

function addStructureGuards(enemies, structure) {
  const [anchorX, anchorY] = structure.anchor;

  for (let index = 0; index < structure.spawnAnchors.length; index++) {
    const definition = structure.spawnAnchors[index];
    const stats = {
      tier: definition.tier,
      ...scaleEnemyStats(definition.kind, definition.tier),
      patrolRadius: definition.extra?.isBoss ? 95 : 70,
      homeGuard: true,
      majorPoiId: structure.id,
      poiLootProfile: structure.id,
      guardRole: definition.extra?.guardRole || 'perimeterGuard',
      homeX: (anchorX + definition.offset[0]) * TILE + TILE / 2,
      homeY: (anchorY + definition.offset[1]) * TILE + TILE / 2,
      leashRadius: definition.extra?.leashRadius || (definition.extra?.isBoss ? 560 : 420),
      ...definition.extra
    };

    enemies.push(makeEnemy(
      definition.kind,
      definition.extra?.id || `${structure.id}-guard-${index}`,
      definition.name,
      anchorX + definition.offset[0],
      anchorY + definition.offset[1],
      stats
    ));
  }
}

function clearLegacyFootprint(objects, enemies, structure) {
  const [anchorX, anchorY] = structure.anchor;
  const radius = structure.cleanupRadius;

  const legacyIds = structure.legacyIds
    ? new Set(structure.legacyIds)
    : structure.id === 'castleVeyr'
    ? new Set([
        'castle-veyr-poi',
        'castle-veyr-wall-1',
        'castle-veyr-wall-2',
        'castle-veyr-pillar-1',
        'castle-veyr-pillar-2',
        'castle-veyr-grave-1',
        'castle-veyr-grave-2',
        'castle-veyr-root-1'
      ])
    : structure.id === 'redSealKeep' ? new Set([
        'ember-veil-lair-poi',
        'ember-veil-red-seal',
        'ember-veil-root-1',
        'ember-veil-root-2',
        'ember-veil-marker-1',
        'ember-veil-wall-1',
        'emberVeilLairEntrance'
      ]) : new Set();

  const keptObjects = objects.filter(object => {
    if (!object) return false;
    if (legacyIds.has(object.id)) return false;
    if (!isWithinTileRadius(object, anchorX, anchorY, radius)) return true;
    return !object.decorative && !RESOURCE_KINDS.has(object.kind);
  });

  objects.splice(0, objects.length, ...keptObjects);

  const keptEnemies = enemies.filter(enemy => {
    if (!enemy) return false;
    return !isWithinTileRadius(enemy, anchorX, anchorY, radius);
  });

  enemies.splice(0, enemies.length, ...keptEnemies);
}

function paintStructureCollision(ctx, structure) {
  const [anchorX, anchorY] = structure.anchor;

  for (const [offsetX, offsetY, width, height] of structure.blockers) {
    forEachRectTile(ctx, anchorX + offsetX, anchorY + offsetY, width, height, tile => {
      tile.passable = false;
    });
  }

  if (structure.gateLane) {
    const [laneX, laneY, laneWidth, laneHeight] = structure.gateLane;
    forEachRectTile(ctx, anchorX + laneX, anchorY + laneY, laneWidth, laneHeight, tile => {
      tile.passable = true;
      tile.biome = 'path';
    });
  }
}

function forEachRectTile(ctx, startX, startY, width, height, callback) {
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      const tile = ctx.tiles?.[y]?.[x];
      if (tile) callback(tile, x, y);
    }
  }
}

function isWithinTileRadius(entity, tileX, tileY, radius) {
  const entityTileX = Number(entity.x || 0) / TILE - 0.5;
  const entityTileY = Number(entity.y || 0) / TILE - 0.5;
  return Math.hypot(entityTileX - tileX, entityTileY - tileY) <= radius;
}

function piece(type, offsetX, offsetY, extra = {}) {
  return Object.freeze({
    type,
    offset: Object.freeze([offsetX, offsetY]),
    ...extra
  });
}

function guard(kind, name, offsetX, offsetY, tier, extra = {}) {
  return Object.freeze({
    kind,
    name,
    offset: Object.freeze([offsetX, offsetY]),
    tier,
    extra: Object.freeze(extra)
  });
}

function interactable(kind, id, name, offsetX, offsetY, extra = {}) {
  return Object.freeze({
    kind,
    id,
    name,
    offset: Object.freeze([offsetX, offsetY]),
    extra: Object.freeze(extra)
  });
}

function isTallDepthPiece(type) {
  return ['wall', 'ruinWall', 'tower', 'bastion', 'gatehouse', 'keep', 'keepWing', 'column', 'watchPost'].includes(type);
}

function getDepthWidth(definition) {
  if (definition.orientation === 'horizontal') return Math.max(64, Number(definition.length || 5) * TILE);
  if (definition.type === 'keep') return 240 * Number(definition.scale || 1);
  if (definition.type === 'gatehouse') return 180 * Number(definition.scale || 1);
  return 92 * Number(definition.scale || 1);
}

function getDepthBehind(definition) {
  if (definition.orientation === 'vertical') return Math.max(90, Number(definition.length || 5) * TILE);
  if (definition.type === 'keep' || definition.type === 'keepWing') return 190;
  return 125;
}
