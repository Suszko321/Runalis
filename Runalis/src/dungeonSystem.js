// dungeonSystem.js
// Runalis dungeon system.
// New standalone module.
//
// Purpose:
// - Removes dungeon generation/entry/exit logic from main.js.
// - Creates generated dungeon maps.
// - Handles dungeon entry, exit, surface return state, dungeon enemies,
//   dungeon resources, dungeon save/restore helpers, and dev-test dungeon entry.
//
// Current design:
// - Uses the existing tile/biome system.
// - Uses "water" temporarily as impassable dungeon boundary if no wall biome exists.
// - Once data.js has a real "wall" biome, this file will automatically prefer it.
// - Dungeons are intentionally simple but structured: rooms, halls, resources, enemies,
//   exit, campfire, and boss/elite encounter.
//
// Expected game object:
// The functions assume they are called with the active RunalisGame instance,
// usually as `game` or `this` from main.js.
//
// Required game fields:
// - game.world
// - game.player
// - game.camera
// - game.canvas
// - game.log(message)
// - game.shake(amount, duration)
// - game.overworldState
//
// Required external functions passed in by main.js are intentionally avoided.
// This file owns dungeon construction and transition data.

import { createWorld } from './world.js';
import { TILE, WORLD_W, WORLD_H, BIOMES } from './data.js';

import {
  addStatusText,
  addSpiritText
} from './floatingText.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function enterDungeon(game, entrance, options = {}) {
  if (!game || !game.world || !game.player) return false;

  if (game.world.mode === 'dungeon') {
    game.log?.('You are already inside a dungeon.');
    return false;
  }

  const safeEntrance = entrance || {
    id: 'unknownDungeonEntrance',
    name: 'Old Hollow Dungeon',
    x: game.player.x,
    y: game.player.y
  };

  game.overworldState = createOverworldReturnState(game, safeEntrance);

  const dungeon = createDungeonWorld({
    entranceId: safeEntrance.id || 'dungeon',
    name: safeEntrance.name || options.name || 'Old Hollow Dungeon',
    seed: safeEntrance.seed || safeEntrance.id || options.seed || 'runalis-dungeon',
    depth: options.depth || safeEntrance.depth || 1,
    tier: options.tier || safeEntrance.tier || 1,
    theme: options.theme || safeEntrance.theme || inferDungeonTheme(safeEntrance)
  });

  game.world = dungeon;

  game.player.x = dungeon.spawn.x;
  game.player.y = dungeon.spawn.y;
  game.player.dirX = 0;
  game.player.dirY = 1;

  game.camera.x = game.player.x - game.canvas.width / 2;
  game.camera.y = game.player.y - game.canvas.height / 2;

  game.log?.(`Entered ${dungeon.name}.`);
  game.shake?.(7, 0.18);

  addStatusText(game.player, 'Dungeon Entered', {
    color: getThemeColor(dungeon.theme),
    ttl: 1.2
  });

  return true;
}

export function exitDungeon(game, exit = {}) {
  if (!game || !game.player) return false;

  if (exit.locked) {
    game.log?.('The exit is sealed.');

    addStatusText(game.player, 'Sealed', {
      color: '#b68cff'
    });

    return false;
  }

  if (!game.overworldState) {
    game.log?.('No surface return point found.');
    return false;
  }

  const returnPoint = game.overworldState.returnPoint || {
    x: 11 * TILE,
    y: 27 * TILE
  };

  game.world = restoreOverworldFromState(game.overworldState);

  game.player.x = returnPoint.x;
  game.player.y = returnPoint.y;
  game.player.dirX = 0;
  game.player.dirY = 1;

  game.camera = game.overworldState.camera || {
    x: game.player.x - game.canvas.width / 2,
    y: game.player.y - game.canvas.height / 2
  };

  game.overworldState = null;

  game.log?.('You return to the surface.');
  game.shake?.(5, 0.14);

  addStatusText(game.player, 'Surface', {
    color: '#73d18a'
  });

  return true;
}

export function devEnterTestDungeon(game) {
  if (!game || !game.player) return false;

  return enterDungeon(game, {
    id: 'devDungeonEntrance',
    kind: 'dungeonEntrance',
    name: 'Dev Hollow Dungeon',
    x: game.player.x,
    y: game.player.y,
    seed: `dev-${Date.now()}`,
    theme: 'grave',
    depth: 1,
    tier: 1
  });
}

export function isInDungeon(world) {
  return world?.mode === 'dungeon';
}

export function getDungeonExitObject(world) {
  if (!world?.objects) return null;

  return world.objects.find(o => o.kind === 'dungeonExit') || null;
}

export function canUseDungeonExit(exit) {
  return !!exit && !exit.locked;
}

export function handlePlayerDefeatedInDungeon(game) {
  if (!game || !game.player) return false;

  const exited = exitDungeon(game, {
    name: 'Emergency Return',
    locked: false,
    force: true
  });

  if (exited) {
    game.player.hp = Math.max(1, Math.floor(game.player.maxHp * 0.45));
    game.player.stamina = Math.max(35, Math.floor(game.player.maxStamina * 0.35));

    if (game.player.spiritAwakened) {
      game.player.spirit = Math.max(0, Math.floor(game.player.maxSpirit * 0.25));
    }

    addSpiritText(game.player, 'Returned to safety', {
      ttl: 1.2,
      size: 14
    });
  }

  return exited;
}

// -----------------------------------------------------------------------------
// SAVE / RESTORE HELPERS
// -----------------------------------------------------------------------------

export function createOverworldReturnState(game, entrance) {
  return {
    tiles: sanitizeForSave(game.world.tiles || []),
    objects: sanitizeForSave(game.world.objects || []),
    enemies: sanitizeForSave(game.world.enemies || []),
    drops: sanitizeForSave(game.world.drops || []),
    effects: [],
    combatEffects: [],

    mode: game.world.mode || 'overworld',
    name: game.world.name || 'Sol Land',

    camera: {
      x: Number(game.camera.x || 0),
      y: Number(game.camera.y || 0)
    },

    returnPoint: {
      x: entrance.x,
      y: entrance.y + TILE * 1.35
    }
  };
}

export function restoreOverworldFromState(overworldState) {
  const fallbackWorld = createWorld();

  return {
    mode: 'overworld',
    name: overworldState?.name || 'Sol Land',
    tiles: Array.isArray(overworldState?.tiles) && overworldState.tiles.length
      ? overworldState.tiles
      : fallbackWorld.tiles,
    objects: Array.isArray(overworldState?.objects)
      ? overworldState.objects
      : fallbackWorld.objects || [],
    enemies: Array.isArray(overworldState?.enemies)
      ? overworldState.enemies
      : fallbackWorld.enemies || [],
    drops: Array.isArray(overworldState?.drops)
      ? overworldState.drops
      : [],
    effects: [],
    combatEffects: []
  };
}

export function sanitizeDungeonSaveState(world) {
  if (!world) return null;

  return {
    mode: world.mode || 'dungeon',
    name: world.name || 'Dungeon',
    theme: world.theme || 'grave',
    depth: world.depth || 1,
    tier: world.tier || 1,
    tiles: sanitizeForSave(world.tiles || []),
    objects: sanitizeForSave(world.objects || []),
    enemies: sanitizeForSave(world.enemies || []),
    drops: sanitizeForSave(world.drops || [])
  };
}

export function restoreDungeonFromSaveState(saveState) {
  if (!saveState) return null;

  return {
    mode: 'dungeon',
    name: saveState.name || 'Dungeon',
    theme: saveState.theme || 'grave',
    depth: saveState.depth || 1,
    tier: saveState.tier || 1,
    tiles: Array.isArray(saveState.tiles) ? saveState.tiles : [],
    objects: Array.isArray(saveState.objects) ? saveState.objects : [],
    enemies: Array.isArray(saveState.enemies) ? saveState.enemies : [],
    drops: Array.isArray(saveState.drops) ? saveState.drops : [],
    effects: [],
    combatEffects: []
  };
}

// -----------------------------------------------------------------------------
// DUNGEON GENERATION
// -----------------------------------------------------------------------------

export function createDungeonWorld(options = {}) {
  const theme = options.theme || 'grave';
  const depth = Math.max(1, Math.floor(options.depth || 1));
  const tier = Math.max(1, Math.floor(options.tier || depth || 1));
  const name = options.name || getDungeonName(theme, depth);
  const seed = String(options.seed || `${name}-${Date.now()}`);

  const layout = createDungeonLayout({
    seed,
    theme,
    depth,
    tier
  });

  return {
    mode: 'dungeon',
    name,
    theme,
    depth,
    tier,
    seed,

    tiles: layout.tiles,
    objects: layout.objects,
    enemies: layout.enemies,
    drops: [],
    effects: [],
    combatEffects: [],

    spawn: layout.spawn,
    bossRoomCenter: layout.bossRoomCenter,
    exit: layout.exit
  };
}

function createDungeonLayout(config) {
  const width = WORLD_W;
  const height = WORLD_H;

  const wallBiome = getWallBiomeId();
  const floorBiome = getThemeFloorBiome(config.theme);
  const secondaryFloorBiome = getThemeSecondaryFloorBiome(config.theme);

  const tiles = createFilledTiles(width, height, wallBiome, config.seed);

  const rooms = createDungeonRooms(width, height, config.seed);
  const halls = connectRoomsWithHalls(rooms);

  carveRooms(tiles, rooms, floorBiome, secondaryFloorBiome, config);
  carveHalls(tiles, halls, floorBiome, secondaryFloorBiome, config);
  addDungeonFloorDetails(tiles, rooms, halls, floorBiome, secondaryFloorBiome, config);
  reinforceDungeonBorders(tiles, wallBiome);

  const spawnRoom = rooms[0];
  const bossRoom = rooms[rooms.length - 1];

  const spawn = {
    x: Math.floor(spawnRoom.cx * TILE),
    y: Math.floor(spawnRoom.cy * TILE)
  };

  const bossRoomCenter = {
    x: Math.floor(bossRoom.cx * TILE),
    y: Math.floor(bossRoom.cy * TILE)
  };

  const exit = {
    x: Math.floor(spawnRoom.cx * TILE),
    y: Math.floor((spawnRoom.cy - 2) * TILE)
  };

  const objects = createDungeonObjects(rooms, config, exit);
  const enemies = createDungeonEnemies(rooms, config);

  return {
    tiles,
    objects,
    enemies,
    spawn,
    bossRoomCenter,
    exit
  };
}

function createFilledTiles(width, height, biome, seed) {
  const tiles = [];

  for (let y = 0; y < height; y++) {
    const row = [];

    for (let x = 0; x < width; x++) {
      row.push({
        biome,
        variant: dungeonNoise(x, y, seed) > 0.5 ? 1 : 0
      });
    }

    tiles.push(row);
  }

  return tiles;
}

function createDungeonRooms(width, height, seed) {
  // The first dungeon layout is semi-authored, not fully random.
  // This is deliberate: the first dungeon should be readable and easy to test.
  const roomTemplates = [
    { x: 8, y: 11, w: 17, h: 14, role: 'entrance' },
    { x: 34, y: 8, w: 24, h: 14, role: 'eastHall' },
    { x: 15, y: 30, w: 22, h: 12, role: 'southCrypt' },
    { x: 42, y: 29, w: 18, h: 13, role: 'boss' }
  ];

  return roomTemplates.map((room, index) => ({
    ...room,
    id: `room-${index}`,
    cx: room.x + Math.floor(room.w / 2),
    cy: room.y + Math.floor(room.h / 2)
  }));
}

function connectRoomsWithHalls(rooms) {
  const halls = [];

  for (let i = 0; i < rooms.length - 1; i++) {
    halls.push(createHallBetweenRooms(rooms[i], rooms[i + 1], i));
  }

  // Extra shortcut between room 1 and room 3.
  if (rooms[1] && rooms[3]) {
    halls.push(createHallBetweenRooms(rooms[1], rooms[3], 99));
  }

  return halls;
}

function createHallBetweenRooms(a, b, index) {
  return {
    id: `hall-${index}`,
    ax: a.cx,
    ay: a.cy,
    bx: b.cx,
    by: b.cy,
    width: index === 99 ? 3 : 4,
    bendFirst: index % 2 === 0
  };
}

function carveRooms(tiles, rooms, floorBiome, secondaryFloorBiome, config) {
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!tiles[y]?.[x]) continue;

        const edge =
          x === room.x ||
          y === room.y ||
          x === room.x + room.w - 1 ||
          y === room.y + room.h - 1;

        if (edge) {
          continue;
        }

        const noise = dungeonNoise(x, y, `${config.seed}-room-detail`);

        tiles[y][x] = {
          biome: noise > 0.84 ? secondaryFloorBiome : floorBiome,
          variant: noise > 0.5 ? 1 : 0
        };
      }
    }
  }
}

function carveHalls(tiles, halls, floorBiome, secondaryFloorBiome, config) {
  for (const hall of halls) {
    if (hall.bendFirst) {
      carveHorizontalHall(tiles, hall.ax, hall.bx, hall.ay, hall.width, floorBiome, secondaryFloorBiome, config);
      carveVerticalHall(tiles, hall.ay, hall.by, hall.bx, hall.width, floorBiome, secondaryFloorBiome, config);
    } else {
      carveVerticalHall(tiles, hall.ay, hall.by, hall.ax, hall.width, floorBiome, secondaryFloorBiome, config);
      carveHorizontalHall(tiles, hall.ax, hall.bx, hall.by, hall.width, floorBiome, secondaryFloorBiome, config);
    }
  }
}

function carveHorizontalHall(tiles, x1, x2, y, width, floorBiome, secondaryFloorBiome, config) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const half = Math.floor(width / 2);

  for (let x = minX; x <= maxX; x++) {
    for (let oy = -half; oy <= half; oy++) {
      const ty = y + oy;

      if (!tiles[ty]?.[x]) continue;

      const noise = dungeonNoise(x, ty, `${config.seed}-hall-h`);

      tiles[ty][x] = {
        biome: noise > 0.88 ? secondaryFloorBiome : floorBiome,
        variant: noise > 0.55 ? 1 : 0
      };
    }
  }
}

function carveVerticalHall(tiles, y1, y2, x, width, floorBiome, secondaryFloorBiome, config) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const half = Math.floor(width / 2);

  for (let y = minY; y <= maxY; y++) {
    for (let ox = -half; ox <= half; ox++) {
      const tx = x + ox;

      if (!tiles[y]?.[tx]) continue;

      const noise = dungeonNoise(tx, y, `${config.seed}-hall-v`);

      tiles[y][tx] = {
        biome: noise > 0.88 ? secondaryFloorBiome : floorBiome,
        variant: noise > 0.55 ? 1 : 0
      };
    }
  }
}

function addDungeonFloorDetails(tiles, rooms, halls, floorBiome, secondaryFloorBiome, config) {
  for (let y = 2; y < tiles.length - 2; y++) {
    for (let x = 2; x < tiles[y].length - 2; x++) {
      const tile = tiles[y][x];

      if (!isDungeonFloor(tile.biome)) continue;

      const n = dungeonNoise(x, y, `${config.seed}-floor-cracks`);

      if (n > 0.94) {
        tile.biome = secondaryFloorBiome;
        tile.variant = 1;
      }

      if (config.theme === 'grave' && n < 0.035) {
        tile.biome = 'dead';
      }

      if (config.theme === 'thorn' && n < 0.035) {
        tile.biome = 'grass';
      }

      if (config.theme === 'ruin' && n < 0.04) {
        tile.biome = 'path';
      }
    }
  }
}

function reinforceDungeonBorders(tiles, wallBiome) {
  const h = tiles.length;
  const w = tiles[0]?.length || 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const border = x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2;

      if (border) {
        tiles[y][x] = {
          biome: wallBiome,
          variant: (x + y) % 2
        };
      }
    }
  }
}

// -----------------------------------------------------------------------------
// DUNGEON OBJECTS
// -----------------------------------------------------------------------------

function createDungeonObjects(rooms, config, exit) {
  const objects = [];

  const entranceRoom = rooms[0];
  const eastRoom = rooms[1];
  const southRoom = rooms[2];
  const bossRoom = rooms[3] || rooms[rooms.length - 1];

  objects.push({
    id: 'dungeonExit',
    kind: 'dungeonExit',
    name: 'Surface Exit',
    x: exit.x,
    y: exit.y,
    r: 24,
    locked: false
  });

  objects.push({
    id: 'dungeonCampfire',
    kind: 'campfire',
    name: 'Cold Campfire',
    x: (entranceRoom.cx + 2) * TILE,
    y: (entranceRoom.cy + 2) * TILE,
    r: 18
  });

  objects.push({
    id: 'dungeonRune1',
    kind: 'runestone',
    name: 'Buried Runestone',
    x: eastRoom.cx * TILE,
    y: eastRoom.cy * TILE,
    r: 16,
    depleted: false,
    respawn: 0,
    respawnTime: 120
  });

  objects.push({
    id: 'dungeonBone1',
    kind: 'bone',
    name: 'Old Bone Pile',
    x: (southRoom.cx - 4) * TILE,
    y: (southRoom.cy + 1) * TILE,
    r: 14,
    depleted: false,
    respawn: 0,
    respawnTime: 120
  });

  objects.push({
    id: 'dungeonGravecap1',
    kind: 'gravecap',
    name: 'Pale Gravecap',
    x: (southRoom.cx + 5) * TILE,
    y: (southRoom.cy + 2) * TILE,
    r: 14,
    depleted: false,
    respawn: 0,
    respawnTime: 120
  });

  objects.push({
    id: 'dungeonOre1',
    kind: 'ore',
    name: 'Cracked Iron Vein',
    x: (eastRoom.cx + 7) * TILE,
    y: (eastRoom.cy - 2) * TILE,
    r: 14,
    depleted: false,
    respawn: 0,
    respawnTime: 120
  });

  objects.push({
    id: 'dungeonBossMarker',
    kind: 'runestone',
    name: 'Sealed Grave Sigil',
    x: bossRoom.cx * TILE,
    y: (bossRoom.cy - 4) * TILE,
    r: 18,
    depleted: false,
    respawn: 0,
    respawnTime: 300
  });

  return objects;
}

// -----------------------------------------------------------------------------
// DUNGEON ENEMIES
// -----------------------------------------------------------------------------

function createDungeonEnemies(rooms, config) {
  const enemies = [];
  const entranceRoom = rooms[0];
  const eastRoom = rooms[1];
  const southRoom = rooms[2];
  const bossRoom = rooms[3] || rooms[rooms.length - 1];

  enemies.push(makeDungeonEnemy('hollowling', 'Dungeon Hollowling', eastRoom.cx - 6, eastRoom.cy - 2, 0, config));
  enemies.push(makeDungeonEnemy('hollowling', 'Dungeon Hollowling', eastRoom.cx + 2, eastRoom.cy + 1, 1, config));
  enemies.push(makeDungeonEnemy('hollowling', 'Dungeon Hollowling', eastRoom.cx + 7, eastRoom.cy - 1, 2, config));

  enemies.push(makeDungeonEnemy('ashWolf', 'Ash Wolf', southRoom.cx - 3, southRoom.cy, 3, config));
  enemies.push(makeDungeonEnemy('ashWolf', 'Ash Wolf', southRoom.cx + 4, southRoom.cy + 2, 4, config));

  enemies.push(makeDungeonEnemy('gravebound', 'Gravebound Warden', bossRoom.cx, bossRoom.cy, 5, {
    ...config,
    boss: true
  }));

  if (config.tier >= 2) {
    enemies.push(makeDungeonEnemy('gravebound', 'Gravebound Knight', bossRoom.cx - 5, bossRoom.cy + 2, 6, config));
  }

  if (config.tier >= 3) {
    enemies.push(makeDungeonEnemy('ashWolf', 'Ash Wolf', entranceRoom.cx + 6, entranceRoom.cy + 3, 7, config));
  }

  return enemies;
}

function makeDungeonEnemy(kind, name, tx, ty, index, config = {}) {
  const tier = Math.max(1, Math.floor(config.tier || 1));
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const scale = 1 + (tier - 1) * 0.35 + (depth - 1) * 0.18;

  const baseStats = getDungeonEnemyBaseStats(kind);
  const boss = !!config.boss || baseStats.isBoss;

  const bossScale = boss ? 1.75 : 1;

  const maxHp = Math.floor(baseStats.maxHp * scale * bossScale);
  const damage = Math.floor(baseStats.damage * scale * (boss ? 1.25 : 1));
  const xp = Math.floor(baseStats.xp * scale * (boss ? 2.5 : 1));

  return {
    id: `dungeon-${kind}-${index}`,
    kind,
    name: boss ? baseStats.bossName || name : name,

    x: tx * TILE,
    y: ty * TILE,

    r: baseStats.r,
    radius: baseStats.r,

    hp: maxHp,
    maxHp,
    dmg: damage,
    damage,
    xp,
    speed: baseStats.speed,

    aggro: 0,
    aggroRange: baseStats.aggroRange,
    attackRange: baseStats.attackRange,
    attackRate: baseStats.attackRate,
    attackCd: 0,
    attackCooldown: 0,

    slowUntil: 0,
    rootUntil: 0,
    alive: true,
    dead: false,
    remove: false,

    isBoss: boss,
    bossName: boss ? baseStats.bossName || name : null
  };
}

function getDungeonEnemyBaseStats(kind) {
  if (kind === 'ashWolf') {
    return {
      maxHp: 58,
      damage: 8,
      xp: 32,
      speed: 76,
      r: 15,
      aggroRange: 250,
      attackRange: 26,
      attackRate: 0.95
    };
  }

  if (kind === 'gravebound') {
    return {
      maxHp: 96,
      damage: 13,
      xp: 62,
      speed: 42,
      r: 16,
      aggroRange: 235,
      attackRange: 27,
      attackRate: 1.18,
      isBoss: true,
      bossName: 'Gravebound Warden'
    };
  }

  return {
    maxHp: 42,
    damage: 6,
    xp: 20,
    speed: 50,
    r: 14,
    aggroRange: 220,
    attackRange: 24,
    attackRate: 1.05
  };
}

// -----------------------------------------------------------------------------
// THEME / TILE HELPERS
// -----------------------------------------------------------------------------

function inferDungeonTheme(entrance) {
  const text = `${entrance?.id || ''} ${entrance?.name || ''} ${entrance?.theme || ''}`.toLowerCase();

  if (text.includes('thorn') || text.includes('grove') || text.includes('root')) return 'thorn';
  if (text.includes('mine') || text.includes('iron') || text.includes('stone')) return 'mine';
  if (text.includes('ruin') || text.includes('chapel') || text.includes('fort')) return 'ruin';

  return 'grave';
}

function getDungeonName(theme, depth) {
  if (theme === 'thorn') return depth > 1 ? `Deep Thornroot Hollow ${depth}` : 'Thornroot Hollow';
  if (theme === 'mine') return depth > 1 ? `Lower Iron Hollow ${depth}` : 'Abandoned Iron Hollow';
  if (theme === 'ruin') return depth > 1 ? `Buried Ruin ${depth}` : 'Buried Ruin';

  return depth > 1 ? `Old Hollow Crypt ${depth}` : 'Old Hollow Crypt';
}

function getThemeColor(theme) {
  if (theme === 'thorn') return '#73d18a';
  if (theme === 'mine') return '#d9ad4f';
  if (theme === 'ruin') return '#9facbf';
  return '#b68cff';
}

function getThemeFloorBiome(theme) {
  if (theme === 'thorn') return 'grass';
  if (theme === 'mine') return 'dead';
  if (theme === 'ruin') return 'ruin';
  return 'ruin';
}

function getThemeSecondaryFloorBiome(theme) {
  if (theme === 'thorn') return 'dead';
  if (theme === 'mine') return 'ruin';
  if (theme === 'ruin') return 'path';
  return 'dead';
}

function getWallBiomeId() {
  // If data.js already has a real wall biome, use it.
  // Otherwise, water remains the temporary impassable placeholder.
  if (BIOMES?.wall) return 'wall';
  return 'water';
}

function isDungeonFloor(biome) {
  return biome !== getWallBiomeId() && biome !== 'water';
}

// -----------------------------------------------------------------------------
// UTILS
// -----------------------------------------------------------------------------

function dungeonNoise(x, y, seed = 'runalis') {
  let hash = 0;
  const text = `${seed}:${x}:${y}`;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  const n = Math.sin(hash * 12.9898) * 43758.5453123;
  return n - Math.floor(n);
}

function sanitizeForSave(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => {
    if (key === 'floatingTexts') return [];
    if (key === 'combatEffects') return [];
    if (key === 'effects') return [];

    if (typeof val === 'function') return undefined;
    if (typeof val === 'number' && !Number.isFinite(val)) return 0;

    return val;
  }));
}