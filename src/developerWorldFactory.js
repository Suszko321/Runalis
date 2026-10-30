import { TILE } from './data.js';
import { createWorld, normalizeWorld } from './world.js';
import { createLegacyRegionWorld as createRegionWorld, createLegacyTravelRouteWorld as createTravelRouteWorld } from './regionWorlds.js';
import { createCapitalHubWorld } from './hubSystem.js';
import { createDungeonWorld } from './dungeonSystem.js';

export const DEVELOPER_MAP_OPTIONS = Object.freeze([
  { id: 'orrakai', name: 'Orrakai', type: 'hub' },
  { id: 'echoryn', name: 'Echoryn Forest / Orrakai Frontier', type: 'overworld' },
  { id: 'ashen-orchard', name: 'Ashen Orchard', type: 'overworld-poi', poiId: 'ashenOrchard' },
  { id: 'ruined-chapel', name: 'Ruined Chapel', type: 'overworld-poi', poiId: 'brokenChapel' },
  { id: 'castle-veyr', name: 'Castle Veyreign', type: 'dungeon', dungeonId: 'castleVeyr', theme: 'castle' },
  { id: 'aureate-marches', name: 'Aureate Marches', type: 'region', regionId: 'aureateMarches' },
  { id: 'ascension-wastes', name: 'Ascension Wastes', type: 'region', regionId: 'ascensionWastes' },
  { id: 'pilgrim-road', name: 'Pilgrim Road', type: 'route', routeId: 'pilgrimRoad' },
  { id: 'hollow-root-cellar', name: 'Blighted Root Cellar', type: 'dungeon', dungeonId: 'hollowRootCellar', theme: 'root' },
  { id: 'shattered-choir', name: 'Shattered Choir', type: 'dungeon', dungeonId: 'shatteredChoir', theme: 'holy' },
  { id: 'test-arena', name: 'Test Arena', type: 'arena' },
  { id: 'empty-sandbox', name: 'Empty Sandbox', type: 'sandbox' }
]);

export const DEVELOPER_CAMERA_MODES = Object.freeze([
  'Free Fly', 'Orbit Selection', 'Top-Down', 'Orthographic', 'Player Camera', 'Cinematic Preview'
]);

export function createDeveloperWorld(options = {}) {
  const config = DEVELOPER_MAP_OPTIONS.find(entry => entry.id === options.mapId) || DEVELOPER_MAP_OPTIONS[1];
  // The existing editor authors finite source maps and publishes ID-based
  // overrides. Gameplay incorporates those sources into the streamed continent;
  // never feed its virtual multi-million-cell view into the editor's deep clone.
  const factoryOptions = { legacy:true,skipPublishedOverride: ['fresh', 'default'].includes(options.worldState) };
  let world;

  if (config.type === 'hub') {
    world = createCapitalHubWorld(factoryOptions);
  } else if (config.type === 'region') {
    world = createRegionWorld(config.regionId, factoryOptions);
  } else if (config.type === 'route') {
    world = createTravelRouteWorld(config.routeId, factoryOptions);
  } else if (config.type === 'dungeon') {
    world = createDungeonWorld({
      dungeonId: config.dungeonId,
      entranceId: `developer-${config.dungeonId}`,
      name: config.name,
      theme: config.theme,
      depth: 2,
      tier: 3,
      seed: `developer-${config.dungeonId}-stable-seed`,
      playerCount: 1,
      skipPublishedOverride: factoryOptions.skipPublishedOverride
    });
  } else if (config.type === 'arena') {
    world = createSandboxWorld(72, 52, 'Test Arena', true);
  } else if (config.type === 'sandbox') {
    world = createSandboxWorld(72, 52, 'Empty Sandbox', false);
  } else {
    world = createWorld(factoryOptions);
  }

  world = normalizeWorld(world);
  world.editorMapId = config.type === 'overworld-poi' ? 'echoryn' : config.id;
  world.editorMapName = config.name;
  world.editorSourceType = config.type;
  world.editorSetup = { ...options };
  delete world.editorSkipPublishedOverride;

  if (config.poiId) {
    const target = findPoiAnchor(world, config.poiId);
    if (target) world.spawn = { x: target.x, y: target.y };
  }

  if (options.startingLocation === 'center') {
    world.spawn = { x: world.width * TILE / 2, y: world.height * TILE / 2 };
  }

  return world;
}

function createSandboxWorld(width, height, name, arena) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const border = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      const arenaRing = arena && Math.hypot(x - width / 2, y - height / 2) > Math.min(width, height) * 0.38;
      row.push({ biome: border || arenaRing ? 'wall' : arena && (x + y) % 9 === 0 ? 'ruin' : 'grass', variant: (x * 7 + y * 11) % 4 });
    }
    tiles.push(row);
  }

  const objects = arena ? [
    { id: 'test-arena-spawn', kind: 'editorSpawn', name: 'Test Spawn', x: width * TILE / 2, y: height * TILE / 2, r: 18, editorCritical: true },
    { id: 'test-arena-campfire', kind: 'campfire', name: 'Test Campfire', x: (width / 2 - 5) * TILE, y: height * TILE / 2, r: 18 }
  ] : [
    { id: 'empty-sandbox-spawn', kind: 'editorSpawn', name: 'Sandbox Spawn', x: width * TILE / 2, y: height * TILE / 2, r: 18, editorCritical: true }
  ];

  return {
    mode: arena ? 'testArena' : 'sandbox',
    name,
    theme: arena ? 'ruin' : 'grass',
    width,
    height,
    tileSize: TILE,
    tiles,
    objects,
    enemies: [],
    drops: [],
    effects: [],
    combatEffects: [],
    spawn: { x: width * TILE / 2, y: height * TILE / 2 },
    mapMeta: { generated: true, editorNative: true, version: 1 }
  };
}

function findPoiAnchor(world, poiId) {
  return (world?.objects || []).find(object => object?.poiId === poiId)
    || (world?.enemies || []).find(enemy => enemy?.poiId === poiId || enemy?.majorPoiId === poiId)
    || null;
}
