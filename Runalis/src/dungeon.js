// dungeon.js
// Runalis dungeon system.
// First dungeon: The Hollow Root Cellar.
//
// This file creates an instanced combat dungeon using the same world shape
// expected by render.js, combat.js, and main.js:
//
// {
//   tiles,
//   objects,
//   enemies,
//   drops,
//   effects,
//   dungeon
// }
//
// The main game will later swap this.world to a dungeon world when the player
// interacts with a dungeon entrance, then restore the overworld when they leave.
//
// No PNGs. No spritesheets. Everything remains code-driven.

import { TILE, WORLD_W, WORLD_H } from './data.js';

// -----------------------------------------------------------------------------
// DUNGEON IDS
// -----------------------------------------------------------------------------

export const DUNGEONS = {
  hollowRootCellar: {
    id: 'hollowRootCellar',
    name: 'Hollow Root Cellar',
    recommendedLevel: 3,
    desc: 'A root-choked ruin under the Sol Land. Good first test for dodging, blocking, and target priority.'
  }
};

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function createDungeonWorld(dungeonId = 'hollowRootCellar', options = {}) {
  if (dungeonId === 'hollowRootCellar') {
    return createHollowRootCellar(options);
  }

  return createHollowRootCellar(options);
}

export function isDungeonWorld(world) {
  return Boolean(world?.dungeon?.active);
}

export function getDungeonDisplayName(world) {
  return world?.dungeon?.name || 'Dungeon';
}

export function getDungeonExitObject(world) {
  return (world?.objects || []).find(o => o.kind === 'dungeonExit') || null;
}

export function getDungeonEntranceObject(world) {
  return (world?.objects || []).find(o => o.kind === 'dungeonEntrance') || null;
}

export function dungeonIsCleared(world) {
  if (!isDungeonWorld(world)) return false;

  const bossAlive = (world.enemies || []).some(enemy => {
    return enemy && enemy.isBoss && !enemy.dead && enemy.hp > 0 && !enemy.remove;
  });

  if (bossAlive) return false;

  const livingEnemies = (world.enemies || []).filter(enemy => {
    return enemy && !enemy.dead && enemy.hp > 0 && !enemy.remove;
  });

  return livingEnemies.length === 0;
}

export function updateDungeonState(world, player, log) {
  if (!isDungeonWorld(world)) return;

  world.dungeon.timeInDungeon = (world.dungeon.timeInDungeon || 0) + 1 / 60;

  if (!world.dungeon.cleared && dungeonIsCleared(world)) {
    world.dungeon.cleared = true;

    const exit = getDungeonExitObject(world);

    if (exit) {
      exit.locked = false;
      exit.name = 'Open Cellar Exit';
      exit.talk = 'The cellar is quiet. You can return to the Sol Land.';
    }

    log?.('Dungeon cleared: Hollow Root Cellar.');

    if (player) {
      player.quest = player.quest || {};
      player.quest.hollowRootCellarCleared = true;
    }
  }
}

// -----------------------------------------------------------------------------
// HOLLOW ROOT CELLAR
// -----------------------------------------------------------------------------

function createHollowRootCellar(options = {}) {
  const tiles = createDungeonTiles();
  const objects = createHollowRootObjects();
  const enemies = createHollowRootEnemies();

  return {
    tiles,
    objects,
    enemies,
    drops: [],
    effects: [],

    dungeon: {
      active: true,
      id: 'hollowRootCellar',
      name: 'Hollow Root Cellar',
      cleared: false,
      timeInDungeon: 0,

      entranceX: 8 * TILE,
      entranceY: 24 * TILE,

      exitX: 63 * TILE,
      exitY: 24 * TILE,

      returnX: options.returnX ?? 31 * TILE,
      returnY: options.returnY ?? 29 * TILE,
      returnCamera: options.returnCamera || null,

      recommendedLevel: 3,
      bossId: 'hollow-root-boss'
    }
  };
}

function createDungeonTiles() {
  const tiles = [];

  for (let y = 0; y < WORLD_H; y++) {
    const row = [];

    for (let x = 0; x < WORLD_W; x++) {
      let biome = 'wall';

      if (isDungeonFloor(x, y)) {
        biome = 'ruin';
      }

      if (isRootedDeadPatch(x, y)) {
        biome = 'dead';
      }

      if (isWaterSeep(x, y)) {
        biome = 'water';
      }

      row.push({
        biome,
        variant: ((x * 17 + y * 31) % 5) > 2 ? 1 : 0
      });
    }

    tiles.push(row);
  }

  return tiles;
}

function isDungeonFloor(x, y) {
  // Entry room
  if (x >= 5 && x <= 15 && y >= 20 && y <= 29) return true;

  // Hallway 1
  if (x >= 14 && x <= 24 && y >= 23 && y <= 26) return true;

  // Resource room
  if (x >= 23 && x <= 34 && y >= 17 && y <= 31) return true;

  // Hallway 2
  if (x >= 33 && x <= 43 && y >= 23 && y <= 26) return true;

  // Wolf den
  if (x >= 41 && x <= 51 && y >= 15 && y <= 32) return true;

  // Hallway 3
  if (x >= 50 && x <= 58 && y >= 23 && y <= 26) return true;

  // Boss room
  if (x >= 57 && x <= 68 && y >= 18 && y <= 30) return true;

  return false;
}

function isRootedDeadPatch(x, y) {
  if (!isDungeonFloor(x, y)) return false;

  if (x >= 25 && x <= 32 && y >= 20 && y <= 28) return true;
  if (x >= 44 && x <= 49 && y >= 18 && y <= 29) return true;
  if (x >= 60 && x <= 66 && y >= 20 && y <= 28) return true;

  return false;
}

function isWaterSeep(x, y) {
  if (!isDungeonFloor(x, y)) return false;

  if (x >= 30 && x <= 33 && y === 30) return true;
  if (x >= 45 && x <= 48 && y === 31) return true;

  return false;
}

function createHollowRootObjects() {
  return [
    {
      id: 'hollowRootEntranceMarker',
      kind: 'dungeonEntrance',
      dungeonId: 'hollowRootCellar',
      name: 'Cellar Threshold',
      x: 8 * TILE,
      y: 24 * TILE,
      r: 22,
      talk: 'The air behind you still remembers sunlight.'
    },

    {
      id: 'hollowRootExit',
      kind: 'dungeonExit',
      name: 'Sealed Cellar Exit',
      x: 64 * TILE,
      y: 24 * TILE,
      r: 24,
      locked: true,
      talk: 'The roots hold the way shut. Something deeper must die first.'
    },

    {
      id: 'cellarWarningStone',
      kind: 'runestone',
      name: 'Warning Stone',
      x: 12 * TILE,
      y: 22 * TILE,
      r: 16,
      dungeonNote:
        'Red roots mean the room is not empty. Move slowly, keep stamina ready, and do not fight surrounded.'
    },

    {
      id: 'cellarCampRemains',
      kind: 'bone',
      name: 'Old Camp Remains',
      x: 27 * TILE,
      y: 20 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarGravecapA',
      kind: 'gravecap',
      name: 'Cellar Gravecap',
      x: 30 * TILE,
      y: 27 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarGravecapB',
      kind: 'gravecap',
      name: 'Cellar Gravecap',
      x: 33 * TILE,
      y: 25 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarOreA',
      kind: 'ore',
      name: 'Black Iron Seam',
      x: 47 * TILE,
      y: 17 * TILE,
      r: 16,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarRunestoneA',
      kind: 'runestone',
      name: 'Pale Rootstone',
      x: 60 * TILE,
      y: 21 * TILE,
      r: 16,
      depleted: false,
      respawn: 0
    }
  ];
}

function createHollowRootEnemies() {
  return [
    // Entry room: basic swarm
    dungeonEnemy('hollow-root-hollowling-1', 'hollowling', 'Cellar Hollowling', 10, 23, {
      hp: 30,
      maxHp: 30,
      damage: 5,
      dmg: 5,
      xp: 12,
      speed: 54,
      aggroRange: 210,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-2', 'hollowling', 'Cellar Hollowling', 11, 26, {
      hp: 30,
      maxHp: 30,
      damage: 5,
      dmg: 5,
      xp: 12,
      speed: 54,
      aggroRange: 210,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-3', 'hollowling', 'Cellar Hollowling', 14, 24, {
      hp: 34,
      maxHp: 34,
      damage: 6,
      dmg: 6,
      xp: 14,
      speed: 58,
      aggroRange: 220,
      attackRange: 25
    }),

    // Resource room: ambush
    dungeonEnemy('hollow-root-hollowling-4', 'hollowling', 'Root-Fed Hollowling', 27, 24, {
      hp: 38,
      maxHp: 38,
      damage: 6,
      dmg: 6,
      xp: 16,
      speed: 60,
      aggroRange: 230,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-5', 'hollowling', 'Root-Fed Hollowling', 32, 22, {
      hp: 38,
      maxHp: 38,
      damage: 6,
      dmg: 6,
      xp: 16,
      speed: 60,
      aggroRange: 230,
      attackRange: 25
    }),

    // Wolf den: movement test
    dungeonEnemy('hollow-root-ashwolf-1', 'ashWolf', 'Cellar Ash Wolf', 45, 22, {
      hp: 48,
      maxHp: 48,
      damage: 8,
      dmg: 8,
      xp: 24,
      speed: 82,
      aggroRange: 260,
      attackRange: 28,
      attackRate: 0.95
    }),

    dungeonEnemy('hollow-root-ashwolf-2', 'ashWolf', 'Cellar Ash Wolf', 49, 27, {
      hp: 48,
      maxHp: 48,
      damage: 8,
      dmg: 8,
      xp: 24,
      speed: 82,
      aggroRange: 260,
      attackRange: 28,
      attackRate: 0.95
    }),

    // Boss room: block / stamina test
    dungeonEnemy('hollow-root-knight-1', 'gravebound', 'Rootbound Knight', 59, 25, {
      hp: 84,
      maxHp: 84,
      damage: 12,
      dmg: 12,
      xp: 55,
      speed: 42,
      aggroRange: 255,
      attackRange: 31,
      attackRate: 1.15
    }),

    dungeonEnemy('hollow-root-boss', 'gravebound', 'Hollow Root Warden', 64, 24, {
      hp: 155,
      maxHp: 155,
      damage: 15,
      dmg: 15,
      xp: 120,
      speed: 36,
      aggroRange: 290,
      attackRange: 34,
      attackRate: 1.05,
      isBoss: true,
      bossName: 'Hollow Root Warden'
    })
  ];
}

function dungeonEnemy(id, kind, name, tx, ty, stats = {}) {
  return {
    id,
    kind,
    name,
    x: tx * TILE,
    y: ty * TILE,
    r: stats.r || 15,
    radius: stats.radius || stats.r || 15,

    hp: stats.hp || 35,
    maxHp: stats.maxHp || stats.hp || 35,

    damage: stats.damage || stats.dmg || 5,
    dmg: stats.dmg || stats.damage || 5,

    xp: stats.xp || 10,
    speed: stats.speed || 50,

    aggroRange: stats.aggroRange || 230,
    attackRange: stats.attackRange || 25,
    attackRate: stats.attackRate || 1.05,
    attackCooldown: 0,

    slowTimer: 0,
    hitFlash: 0,
    alive: true,
    dead: false,
    remove: false,
    removeTimer: 0,
    deathHandled: false,

    dirX: 0,
    dirY: 1,
    walkTime: 0,

    isBoss: Boolean(stats.isBoss),
    bossName: stats.bossName || null
  };
}