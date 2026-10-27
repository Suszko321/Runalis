// dungeon.js
// Runalis dungeon system.
// First dungeon: The Blighted Root Cellar.
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

import { TILE } from './data.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';

// -----------------------------------------------------------------------------
// DUNGEON IDS
// -----------------------------------------------------------------------------

export const DUNGEONS = {
  hollowRootCellar: {
    id: 'hollowRootCellar',
    name: 'Blighted Root Cellar',
    recommendedLevel: 3,
    desc: 'A root-choked ruin under Echoryn Forest. Good first test for dodging, blocking, and target priority.'
  }
};

const HOLLOW_ROOT_W = 176;
const HOLLOW_ROOT_H = 128;

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
      exit.talk = 'The cellar is quiet. You can return to Echoryn Forest.';
    }

    log?.('Dungeon cleared: Blighted Root Cellar.');

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
    width: HOLLOW_ROOT_W,
    height: HOLLOW_ROOT_H,
    tileSize: TILE,
    tiles,
    objects,
    enemies,
    drops: [],
    effects: [],

    dungeon: {
      active: true,
      id: 'hollowRootCellar',
      name: 'Blighted Root Cellar',
      cleared: false,
      timeInDungeon: 0,

      entranceX: 12 * TILE,
      entranceY: 64 * TILE,

      exitX: 162 * TILE,
      exitY: 64 * TILE,

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

  for (let y = 0; y < HOLLOW_ROOT_H; y++) {
    const row = [];

    for (let x = 0; x < HOLLOW_ROOT_W; x++) {
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
  // Entry room and first breathing space
  if (x >= 5 && x <= 24 && y >= 56 && y <= 72) return true;

  // Hallway 1
  if (x >= 22 && x <= 43 && y >= 62 && y <= 67) return true;

  // Quiet upper side room
  if (x >= 34 && x <= 59 && y >= 40 && y <= 56) return true;

  // Main resource room
  if (x >= 42 && x <= 70 && y >= 57 && y <= 79) return true;

  // Lower side resource loop
  if (x >= 54 && x <= 83 && y >= 84 && y <= 104) return true;
  if (x >= 63 && x <= 68 && y >= 78 && y <= 86) return true;

  // Hallway 2
  if (x >= 69 && x <= 85 && y >= 64 && y <= 69) return true;

  // Wolf den encounter room
  if (x >= 82 && x <= 114 && y >= 51 && y <= 81) return true;

  // Optional upper cache and connector
  if (x >= 102 && x <= 131 && y >= 30 && y <= 53) return true;
  if (x >= 112 && x <= 118 && y >= 52 && y <= 64) return true;

  // Main approach corridor
  if (x >= 113 && x <= 132 && y >= 63 && y <= 68) return true;

  // Boss approach room
  if (x >= 128 && x <= 151 && y >= 56 && y <= 77) return true;

  // Separate boss room
  if (x >= 148 && x <= 171 && y >= 47 && y <= 83) return true;

  // Lower loop back toward the wolf den
  if (x >= 80 && x <= 107 && y >= 94 && y <= 99) return true;
  if (x >= 102 && x <= 108 && y >= 79 && y <= 96) return true;

  return false;
}

function isRootedDeadPatch(x, y) {
  if (!isDungeonFloor(x, y)) return false;

  if (x >= 46 && x <= 66 && y >= 61 && y <= 75) return true;
  if (x >= 58 && x <= 80 && y >= 88 && y <= 100) return true;
  if (x >= 88 && x <= 109 && y >= 58 && y <= 77) return true;
  if (x >= 153 && x <= 167 && y >= 56 && y <= 78) return true;

  return false;
}

function isWaterSeep(x, y) {
  if (!isDungeonFloor(x, y)) return false;

  if (x >= 63 && x <= 68 && y === 78) return true;
  if (x >= 75 && x <= 82 && y === 101) return true;
  if (x >= 94 && x <= 101 && y === 80) return true;

  return false;
}

function createHollowRootObjects() {
  return [
    {
      id: 'hollowRootEntranceMarker',
      kind: 'dungeonEntrance',
      dungeonId: 'hollowRootCellar',
      name: 'Cellar Threshold',
      x: 12 * TILE,
      y: 64 * TILE,
      r: 22,
      talk: 'The air behind you still remembers sunlight.'
    },

    {
      id: 'hollowRootExit',
      kind: 'dungeonExit',
      name: 'Sealed Cellar Exit',
      x: 162 * TILE,
      y: 64 * TILE,
      r: 24,
      locked: true,
      talk: 'The roots hold the way shut. Something deeper must die first.'
    },

    {
      id: 'cellarWarningStone',
      kind: 'runestone',
      name: 'Warning Stone',
      x: 16 * TILE,
      y: 59 * TILE,
      r: 16,
      dungeonNote:
        'Red roots mean the room is not empty. Move slowly, keep stamina ready, and do not fight surrounded.'
    },

    {
      id: 'cellarCampRemains',
      kind: 'bone',
      name: 'Old Camp Remains',
      x: 43 * TILE,
      y: 46 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarGravecapA',
      kind: 'gravecap',
      name: 'Cellar Gravecap',
      x: 56 * TILE,
      y: 70 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarGravecapB',
      kind: 'gravecap',
      name: 'Cellar Gravecap',
      x: 72 * TILE,
      y: 92 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarOreA',
      kind: 'ore',
      name: 'Black Iron Seam',
      x: 106 * TILE,
      y: 36 * TILE,
      r: 16,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarRunestoneA',
      kind: 'runestone',
      name: 'Pale Rootstone',
      x: 136 * TILE,
      y: 62 * TILE,
      r: 16,
      depleted: false,
      respawn: 0
    },

    {
      id: 'cellarSideCache',
      kind: 'runestone',
      name: 'Root-Sealed Side Cache',
      x: 119 * TILE,
      y: 42 * TILE,
      r: 16,
      depleted: false,
      respawn: 0,
      dungeonNote: 'A side chamber cache. The old roots bent around it instead of breaking through.'
    },

    {
      id: 'cellarLowerBones',
      kind: 'bone',
      name: 'Lower Loop Bones',
      x: 63 * TILE,
      y: 95 * TILE,
      r: 14,
      depleted: false,
      respawn: 0
    }
  ];
}

function createHollowRootEnemies() {
  return [
    // Entry room: basic swarm
    dungeonEnemy('hollow-root-hollowling-1', 'hollowling', 'Cellar Blighted Corpse', 14, 65, {
      hp: 30,
      maxHp: 30,
      damage: 5,
      dmg: 5,
      xp: 12,
      speed: 54,
      aggroRange: 210,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-2', 'hollowling', 'Cellar Blighted Corpse', 20, 68, {
      hp: 30,
      maxHp: 30,
      damage: 5,
      dmg: 5,
      xp: 12,
      speed: 54,
      aggroRange: 210,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-3', 'hollowling', 'Cellar Blighted Corpse', 37, 64, {
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
    dungeonEnemy('hollow-root-hollowling-4', 'hollowling', 'Root-Fed Blighted Corpse', 52, 66, {
      hp: 38,
      maxHp: 38,
      damage: 6,
      dmg: 6,
      xp: 16,
      speed: 60,
      aggroRange: 230,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-5', 'hollowling', 'Root-Fed Blighted Corpse', 65, 73, {
      hp: 38,
      maxHp: 38,
      damage: 6,
      dmg: 6,
      xp: 16,
      speed: 60,
      aggroRange: 230,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-hollowling-6', 'hollowling', 'Root-Fed Blighted Corpse', 75, 92, {
      hp: 40,
      maxHp: 40,
      damage: 6,
      dmg: 6,
      xp: 17,
      speed: 58,
      aggroRange: 230,
      attackRange: 25
    }),

    // Wolf den: movement test
    dungeonEnemy('hollow-root-ashwolf-1', 'ashWolf', 'Cellar Ash Wolf', 90, 61, {
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

    dungeonEnemy('hollow-root-ashwolf-2', 'ashWolf', 'Cellar Ash Wolf', 108, 73, {
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

    dungeonEnemy('hollow-root-ashwolf-3', 'ashWolf', 'Cellar Ash Wolf', 104, 92, {
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

    dungeonEnemy('hollow-root-hollowling-7', 'hollowling', 'Cache Blighted Corpse', 123, 45, {
      hp: 42,
      maxHp: 42,
      damage: 7,
      dmg: 7,
      xp: 18,
      speed: 58,
      aggroRange: 230,
      attackRange: 25
    }),

    // Corridor and side-room pressure so the larger cellar does not feel empty.
    dungeonEnemy('hollow-root-patrol-1', 'hollowling', 'Cellar Patrol Blighted Corpse', 28, 75, {
      hp: 34,
      maxHp: 34,
      damage: 6,
      dmg: 6,
      xp: 14,
      speed: 58,
      aggroRange: 225,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-patrol-2', 'hollowling', 'Cellar Patrol Blighted Corpse', 46, 82, {
      hp: 34,
      maxHp: 34,
      damage: 6,
      dmg: 6,
      xp: 14,
      speed: 58,
      aggroRange: 225,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-cache-guard-1', 'ashWolf', 'Cache Ash Wolf', 115, 49, {
      hp: 46,
      maxHp: 46,
      damage: 8,
      dmg: 8,
      xp: 22,
      speed: 78,
      aggroRange: 250,
      attackRange: 28,
      attackRate: 0.95
    }),

    dungeonEnemy('hollow-root-cache-guard-2', 'hollowling', 'Cache Blighted Corpse', 129, 51, {
      hp: 40,
      maxHp: 40,
      damage: 7,
      dmg: 7,
      xp: 17,
      speed: 58,
      aggroRange: 235,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-lower-loop-1', 'hollowling', 'Lower Loop Blighted Corpse', 69, 101, {
      hp: 42,
      maxHp: 42,
      damage: 7,
      dmg: 7,
      xp: 18,
      speed: 60,
      aggroRange: 240,
      attackRange: 25
    }),

    dungeonEnemy('hollow-root-lower-loop-2', 'ashWolf', 'Lower Loop Ash Wolf', 86, 101, {
      hp: 50,
      maxHp: 50,
      damage: 8,
      dmg: 8,
      xp: 24,
      speed: 80,
      aggroRange: 260,
      attackRange: 28,
      attackRate: 0.95
    }),

    dungeonEnemy('hollow-root-boss-approach-1', 'gravebound', 'Rootbound Gatekeeper', 127, 66, {
      hp: 76,
      maxHp: 76,
      damage: 11,
      dmg: 11,
      xp: 45,
      speed: 42,
      aggroRange: 255,
      attackRange: 31,
      attackRate: 1.18
    }),

    dungeonEnemy('hollow-root-boss-approach-2', 'hollowling', 'Rootbound Attendant', 145, 82, {
      hp: 48,
      maxHp: 48,
      damage: 8,
      dmg: 8,
      xp: 22,
      speed: 60,
      aggroRange: 245,
      attackRange: 25
    }),

    // Boss room: block / stamina test
    dungeonEnemy('hollow-root-knight-1', 'gravebound', 'Rootbound Knight', 136, 66, {
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

    dungeonEnemy('hollow-root-knight-2', 'gravebound', 'Rootbound Knight', 153, 72, {
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

    dungeonEnemy('hollow-root-boss', 'gravebound', 'Blighted Root Warden', 162, 64, {
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
      bossName: 'Blighted Root Warden'
    })
  ];
}

function dungeonEnemy(id, kind, name, tx, ty, stats = {}) {
  return applyEnemyStrengthScaling({
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
  });
}
