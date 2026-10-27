import { BIOMES, TILE } from './data.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';

const MINIMAP_SIZE_DESKTOP = 204;
const MINIMAP_SIZE_SMALL = 156;
const LOCAL_RADIUS_TILES = 28;
const DUNGEON_CELL_SIZE = 4;
const DUNGEON_REVEAL_RADIUS_CELLS = 2;
const MARKER_DISCOVERY_RADIUS_TILES = 7;

const PARTY_COLORS = ['#fff1b8', '#59d7e8', '#a86bd6', '#7e9d58'];

const SERVICE_KINDS = new Set([
  'navStone',
  'capitalExit',
  'travelRouteGate',
  'guildClerk',
  'noticeBoard',
  'marketStall',
  'bankService',
  'blacksmithService',
  'alchemistService',
  'classTrainerService',
  'shrine',
  'campfire',
  'towerEntrance',
  'dungeonEntrance'
]);

const DUNGEON_MARKER_KINDS = new Set([
  'dungeonExit',
  'dungeonStairs',
  'dungeonChest',
  'dungeonDoor',
  'dungeonKey',
  'dungeonPuzzle',
  'dungeonEvent',
  'campfire',
  'shrine',
  'herb',
  'emberleaf',
  'gravecap',
  'ashFruit',
  'lanternMoss',
  'reed',
  'riverReed',
  'forage',
  'bitterroot',
  'moonpetal',
  'bloodmoss',
  'thornsilkVine',
  'spiritFern',
  'dawnsage',
  'redSealPoppy',
  'ore',
  'stone',
  'crystal',
  'deepstone',
  'bone',
  'tree',
  'log',
  'deadwood',
  'rareTree',
  'runestone'
]);

export function updateMinimapExploration(game) {
  const world = game?.world;
  if (!world || world.mode !== 'dungeon') return;

  const party = getPartyActors(game);
  if (!party.length) return;

  const mapState = ensureDungeonMapState(world);
  const tileSize = world.tileSize || TILE;
  const revealKeys = party.map(actor => {
    const tx = Math.floor(Number(actor.x || 0) / tileSize);
    const ty = Math.floor(Number(actor.y || 0) / tileSize);
    return `${Math.floor(tx / mapState.cellSize)},${Math.floor(ty / mapState.cellSize)}`;
  }).join('|');
  const revealKey = `${world.dungeonId || world.name || 'dungeon'}:${world.floor || 1}:${revealKeys}`;

  if (world.__minimapRevealKey === revealKey && mapState.exploredCells.length) return;
  world.__minimapRevealKey = revealKey;

  for (const actor of party) {
    revealAroundActor(world, actor, mapState);
    discoverNearbyMarkers(world, actor, mapState);
  }
}

export function renderMinimapHud(game) {
  if (typeof document === 'undefined') return;

  let hud = document.getElementById('runalisMinimapHud');

  if (shouldHideMinimap(game)) {
    if (hud) hud.remove();
    document.documentElement.style.removeProperty('--runalis-minimap-size');
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'runalisMinimapHud';
    hud.innerHTML = `
      <div class="runalis-minimap-frame">
        <div class="runalis-minimap-title">
          <b></b>
          <span></span>
        </div>
        <canvas id="runalisMinimapCanvas"></canvas>
      </div>
    `;
    document.body.appendChild(hud);
  }

  const canvas = hud.querySelector('canvas');
  const title = hud.querySelector('.runalis-minimap-title b');
  const detail = hud.querySelector('.runalis-minimap-title span');
  const size = getMinimapSize();

  document.documentElement.style.setProperty('--runalis-minimap-size', `${size}px`);
  title.textContent = getWorldDisplayName(game.world);
  detail.textContent = getWorldFloorLabel(game.world);

  const ctx = prepareCanvas(canvas, size);
  drawMinimap(ctx, game, size);
}

export function drawMinimapPanel(ctx, game, viewport, options = {}) {
  if (!ctx || !game?.world || !viewport) return;

  const pad = 14;
  const titleHeight = 34;
  const mapSize = Math.max(96, Math.floor(Math.min(
    viewport.width - pad * 2,
    viewport.height - titleHeight - pad * 2
  )));
  const mapX = viewport.x + Math.floor((viewport.width - mapSize) / 2);
  const mapY = viewport.y + titleHeight + Math.floor((viewport.height - titleHeight - mapSize) / 2);
  const title = options.title || 'Party Map';
  const detail = getWorldDisplayName(game.world);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.fillStyle = 'rgba(3, 6, 12, 0.96)';
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.strokeStyle = 'rgba(255, 241, 184, 0.36)';
  ctx.lineWidth = 1;
  ctx.strokeRect(viewport.x + 0.5, viewport.y + 0.5, viewport.width - 1, viewport.height - 1);

  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff1b8';
  ctx.fillText(title, viewport.x + pad, viewport.y + 10);

  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c9b0dc';
  ctx.fillText(trimText(ctx, detail, Math.max(80, viewport.width * 0.48), 'bold 10px sans-serif'), viewport.x + viewport.width - pad, viewport.y + 13);

  ctx.save();
  ctx.beginPath();
  ctx.rect(mapX, mapY, mapSize, mapSize);
  ctx.clip();
  ctx.translate(mapX, mapY);
  drawMinimap(ctx, game, mapSize, {
    centerWorld: getPartyCenterWorld(game),
    radiusTiles: getPartyOverviewRadiusTiles(game),
    labelPlayers: true
  });
  ctx.restore();

  drawPartyLegend(ctx, game, viewport, mapY + mapSize + 8);
  ctx.restore();
}

function shouldHideMinimap(game) {
  if (!game?.started || !game?.world || !game?.player) return true;
  if (game.paused) return true;
  if (getActiveCoopActors(game).length > 0) return true;
  if (game.dialogue?.active && getActiveCoopActors(game).length === 0) return true;
  if (document.querySelector('.panel.open')) return true;
  if (document.getElementById('characterCreatorOverlay')?.classList.contains('active')) return true;
  if (document.getElementById('marketShopOverlay')?.classList.contains('active')) return true;
  if (document.getElementById('fishingMiniGameOverlay')?.classList.contains('active')) return true;
  if (document.getElementById('couchCoopJoinOverlay')?.classList.contains('active')) return true;
  return false;
}

function prepareCanvas(canvas, size) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const pixelSize = Math.round(size * dpr);

  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }

  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function drawMinimap(ctx, game, size, options = {}) {
  const world = game.world;
  const player = game.player;
  const tileSize = world.tileSize || TILE;
  const radiusTiles = Math.max(8, Number(options.radiusTiles || LOCAL_RADIUS_TILES));
  const centerWorld = options.centerWorld || player;
  const scale = size / (radiusTiles * 2);
  const centerTileX = Number(centerWorld.x || 0) / tileSize;
  const centerTileY = Number(centerWorld.y || 0) / tileSize;
  const minX = Math.max(0, Math.floor(centerTileX - radiusTiles));
  const maxX = Math.min(getWorldWidth(world) - 1, Math.ceil(centerTileX + radiusTiles));
  const minY = Math.max(0, Math.floor(centerTileY - radiusTiles));
  const maxY = Math.min(getWorldHeight(world) - 1, Math.ceil(centerTileY + radiusTiles));

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = world.mode === 'dungeon' ? '#050608' : '#07100c';
  ctx.fillRect(0, 0, size, size);

  if (world.mode === 'dungeon') {
    updateMinimapExploration(game);
  }

  for (let y = minY; y <= maxY; y++) {
    const row = world.tiles?.[y];
    if (!row) continue;

    for (let x = minX; x <= maxX; x++) {
      const tile = row[x];
      if (!tile) continue;
      if (world.mode === 'dungeon' && !isDungeonTileRevealed(world, x, y)) continue;

      const sx = size / 2 + (x - centerTileX) * scale;
      const sy = size / 2 + (y - centerTileY) * scale;
      ctx.fillStyle = getTileColor(tile, world);
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(scale + 0.5), Math.ceil(scale + 0.5));
    }
  }

  if (world.mode === 'dungeon') {
    drawExploredRoomOutlines(ctx, world, centerTileX, centerTileY, scale, size);
    drawDungeonFogGrid(ctx, world, centerTileX, centerTileY, scale, size);
  }

  drawObjectMarkers(ctx, world, centerTileX, centerTileY, scale, size, game.player.worldMemory);
  drawPartyMarkers(ctx, game, centerTileX, centerTileY, scale, size, {
    labelPlayers: !!options.labelPlayers
  });

  ctx.strokeStyle = 'rgba(255, 241, 184, 0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}

function drawDungeonFogGrid(ctx, world, centerTileX, centerTileY, scale, size) {
  const mapState = ensureDungeonMapState(world);
  const cellSize = mapState.cellSize || DUNGEON_CELL_SIZE;
  const set = getRuntimeSet(mapState, '__exploredSet', 'exploredCells');

  ctx.fillStyle = 'rgba(255, 241, 184, 0.05)';

  for (const key of set) {
    const [cellX, cellY] = key.split(',').map(Number);
    const sx = size / 2 + (cellX * cellSize - centerTileX) * scale;
    const sy = size / 2 + (cellY * cellSize - centerTileY) * scale;
    const cellPixels = cellSize * scale;

    if (sx + cellPixels < 0 || sy + cellPixels < 0 || sx > size || sy > size) continue;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cellPixels), Math.ceil(cellPixels));
  }
}

function drawExploredRoomOutlines(ctx, world, centerTileX, centerTileY, scale, size) {
  if (!Array.isArray(world.rooms)) return;

  ctx.strokeStyle = 'rgba(255, 241, 184, 0.22)';
  ctx.lineWidth = 1;

  for (const room of world.rooms) {
    if (!room || !isDungeonTileRevealed(world, room.cx, room.cy)) continue;

    const sx = size / 2 + (room.x - centerTileX) * scale;
    const sy = size / 2 + (room.y - centerTileY) * scale;
    const sw = room.w * scale;
    const sh = room.h * scale;

    if (sx + sw < 0 || sy + sh < 0 || sx > size || sy > size) continue;
    ctx.strokeRect(Math.floor(sx) + 0.5, Math.floor(sy) + 0.5, Math.ceil(sw), Math.ceil(sh));
  }
}

function drawObjectMarkers(ctx, world, centerTileX, centerTileY, scale, size, memory) {
  const tileSize = world.tileSize || TILE;

  for (const object of world.objects || []) {
    if (!object || object.depleted || object.collected) continue;
    if (!isMinimapMarker(object, world)) continue;
    if(world.echorynRevision&&object.kind==='poiMarker'){
      if(!memory?.locations?.[`overworld:${world.regionId}:${object.locationId||object.id}`]&&!memory?.locations?.['map:'+object.id.replace(/^poi-/, '')])continue;
    }

    const tileX = Number(object.x || 0) / tileSize;
    const tileY = Number(object.y || 0) / tileSize;

    if (world.mode === 'dungeon' && !isDungeonObjectMarkerVisible(world, object, tileX, tileY)) continue;

    const sx = size / 2 + (tileX - centerTileX) * scale;
    const sy = size / 2 + (tileY - centerTileY) * scale;
    if (sx < -8 || sy < -8 || sx > size + 8 || sy > size + 8) continue;

    drawMarker(ctx, sx, sy, getObjectMarkerColor(object));
  }
}

function drawPartyMarkers(ctx, game, centerTileX, centerTileY, scale, size, options = {}) {
  const tileSize = game.world?.tileSize || TILE;
  const party = getPartyActors(game);

  party.forEach((actor, index) => {
    const tileX = Number(actor.x || 0) / tileSize;
    const tileY = Number(actor.y || 0) / tileSize;
    const sx = size / 2 + (tileX - centerTileX) * scale;
    const sy = size / 2 + (tileY - centerTileY) * scale;

    if (sx < -8 || sy < -8 || sx > size + 8 || sy > size + 8) return;
    drawActorTriangle(ctx, sx, sy, actor, PARTY_COLORS[index % PARTY_COLORS.length]);
    if (options.labelPlayers) {
      drawActorLabel(ctx, sx, sy, actor, index);
    }
  });
}

function drawActorLabel(ctx, x, y, actor, index) {
  const label = `P${Math.max(1, Math.min(4, Number(actor?.slot || actor?.playerNumber || index + 1)))}`;

  ctx.save();
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.fillStyle = '#fff7ef';
  ctx.strokeText(label, Math.round(x), Math.round(y + 8));
  ctx.fillText(label, Math.round(x), Math.round(y + 8));
  ctx.restore();
}

function drawPartyLegend(ctx, game, viewport, y) {
  const party = getPartyActors(game).slice(0, 4);
  const startX = viewport.x + 14;

  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  party.forEach((actor, index) => {
    const x = startX + index * 54;
    if (x > viewport.x + viewport.width - 48) return;
    ctx.fillStyle = PARTY_COLORS[index % PARTY_COLORS.length];
    ctx.fillRect(x, y + 2, 9, 9);
    ctx.fillStyle = '#e8d8f3';
    ctx.fillText(`P${Math.max(1, Math.min(4, Number(actor?.slot || actor?.playerNumber || index + 1)))}`, x + 14, y);
  });

  ctx.restore();
}

function getPartyCenterWorld(game) {
  const party = getPartyActors(game);
  if (!party.length) return game?.player || { x: 0, y: 0 };

  const total = party.reduce((sum, actor) => {
    sum.x += Number(actor.x || 0);
    sum.y += Number(actor.y || 0);
    return sum;
  }, { x: 0, y: 0 });

  return {
    x: total.x / party.length,
    y: total.y / party.length
  };
}

function getPartyOverviewRadiusTiles(game) {
  const party = getPartyActors(game);
  const center = getPartyCenterWorld(game);
  const tileSize = game?.world?.tileSize || TILE;
  let radius = LOCAL_RADIUS_TILES;

  for (const actor of party) {
    const dx = Math.abs(Number(actor.x || 0) - center.x) / tileSize;
    const dy = Math.abs(Number(actor.y || 0) - center.y) / tileSize;
    radius = Math.max(radius, dx + 8, dy + 8);
  }

  const worldWidth = getWorldWidth(game?.world);
  const worldHeight = getWorldHeight(game?.world);
  const maxWorldRadius = Math.max(LOCAL_RADIUS_TILES, Math.min(Math.max(worldWidth, worldHeight), 96));
  return Math.min(maxWorldRadius, radius);
}

function trimText(ctx, text, maxWidth, font) {
  const value = String(text || '');
  if (!ctx || maxWidth <= 0) return '';

  const previousFont = ctx.font;
  if (font) ctx.font = font;

  if (ctx.measureText(value).width <= maxWidth) {
    ctx.font = previousFont;
    return value;
  }

  let output = value;
  while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  ctx.font = previousFont;
  return `${output}...`;
}

function drawMarker(ctx, x, y, color) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 5);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawActorTriangle(ctx, x, y, actor, color) {
  const dirX = Number(actor.dirX || 0);
  const dirY = Number(actor.dirY || 1);
  const angle = Math.atan2(dirY, dirX) + Math.PI / 2;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function revealAroundActor(world, actor, mapState) {
  const tileSize = world.tileSize || TILE;
  const tileX = Math.floor(Number(actor.x || 0) / tileSize);
  const tileY = Math.floor(Number(actor.y || 0) / tileSize);
  const cellSize = mapState.cellSize || DUNGEON_CELL_SIZE;
  const cellX = Math.floor(tileX / cellSize);
  const cellY = Math.floor(tileY / cellSize);

  for (let y = -DUNGEON_REVEAL_RADIUS_CELLS; y <= DUNGEON_REVEAL_RADIUS_CELLS; y++) {
    for (let x = -DUNGEON_REVEAL_RADIUS_CELLS; x <= DUNGEON_REVEAL_RADIUS_CELLS; x++) {
      if (Math.hypot(x, y) > DUNGEON_REVEAL_RADIUS_CELLS + 0.35) continue;
      addExploredCell(mapState, cellX + x, cellY + y);
    }
  }

  const room = getRoomContainingTile(world, tileX, tileY);
  if (!room) return;

  const minCellX = Math.floor((room.x - 1) / cellSize);
  const maxCellX = Math.floor((room.x + room.w + 1) / cellSize);
  const minCellY = Math.floor((room.y - 1) / cellSize);
  const maxCellY = Math.floor((room.y + room.h + 1) / cellSize);

  for (let y = minCellY; y <= maxCellY; y++) {
    for (let x = minCellX; x <= maxCellX; x++) {
      addExploredCell(mapState, x, y);
    }
  }
}

function discoverNearbyMarkers(world, actor, mapState) {
  const tileSize = world.tileSize || TILE;
  const actorX = Number(actor.x || 0);
  const actorY = Number(actor.y || 0);
  const radius = MARKER_DISCOVERY_RADIUS_TILES * tileSize;

  for (const object of world.objects || []) {
    if (!object?.id || !DUNGEON_MARKER_KINDS.has(object.kind)) continue;
    const distance = Math.hypot(Number(object.x || 0) - actorX, Number(object.y || 0) - actorY);
    if (distance > radius) continue;
    addDiscoveredMarker(mapState, object.id);
  }
}

function ensureDungeonMapState(world) {
  world.dungeonState = world.dungeonState && typeof world.dungeonState === 'object'
    ? world.dungeonState
    : {};
  world.dungeonState.floorStates = world.dungeonState.floorStates || {};

  const floor = String(world.floor || world.dungeonState.currentFloor || 1);
  const floorState = world.dungeonState.floorStates[floor] || world.dungeonState.floorStates[Number(floor)] || {};
  world.dungeonState.floorStates[floor] = floorState;

  const mapState = floorState.mapState && typeof floorState.mapState === 'object'
    ? floorState.mapState
    : {};

  mapState.dungeonId = mapState.dungeonId || world.dungeonId || world.name || 'dungeon';
  mapState.floorId = mapState.floorId || floor;
  mapState.cellSize = Math.max(2, Number(mapState.cellSize || DUNGEON_CELL_SIZE));
  mapState.exploredCells = Array.isArray(mapState.exploredCells) ? mapState.exploredCells : [];
  mapState.discoveredMarkers = Array.isArray(mapState.discoveredMarkers) ? mapState.discoveredMarkers : [];
  floorState.mapState = mapState;

  return mapState;
}

function addExploredCell(mapState, cellX, cellY) {
  if (cellX < 0 || cellY < 0) return;

  const set = getRuntimeSet(mapState, '__exploredSet', 'exploredCells');
  const key = `${cellX},${cellY}`;

  if (set.has(key)) return;
  set.add(key);
  mapState.exploredCells.push(key);
}

function addDiscoveredMarker(mapState, markerId) {
  const set = getRuntimeSet(mapState, '__markerSet', 'discoveredMarkers');

  if (set.has(markerId)) return;
  set.add(markerId);
  mapState.discoveredMarkers.push(markerId);
}

function getRuntimeSet(target, property, sourceProperty) {
  if (!target[property]) {
    Object.defineProperty(target, property, {
      value: new Set(target[sourceProperty] || []),
      enumerable: false,
      configurable: true
    });
  }

  return target[property];
}

function isDungeonTileRevealed(world, tileX, tileY) {
  const mapState = ensureDungeonMapState(world);
  const cellSize = mapState.cellSize || DUNGEON_CELL_SIZE;
  const key = `${Math.floor(tileX / cellSize)},${Math.floor(tileY / cellSize)}`;
  return getRuntimeSet(mapState, '__exploredSet', 'exploredCells').has(key);
}

function isDungeonObjectMarkerVisible(world, object, tileX, tileY) {
  const mapState = ensureDungeonMapState(world);
  const markerSet = getRuntimeSet(mapState, '__markerSet', 'discoveredMarkers');

  if (markerSet.has(object.id)) return true;
  if (object.kind === 'dungeonChest' && object.claimed) return false;
  return isDungeonTileRevealed(world, tileX, tileY);
}

function isMinimapMarker(object, world) {
  if (world.mode === 'dungeon') return DUNGEON_MARKER_KINDS.has(object.kind);
  if (world.mode === 'capital' || world.mode === 'hub' || world.mode === 'town') {
    return SERVICE_KINDS.has(object.kind);
  }

  return SERVICE_KINDS.has(object.kind) || object.kind === 'poiMarker' || object.kind === 'worldCache';
}

function getObjectMarkerColor(object) {
  if (object.markerColor) return object.markerColor;
  if (object.color) return object.color;

  switch (object.kind) {
    case 'capitalExit':
    case 'travelRouteGate':
    case 'dungeonExit':
    case 'dungeonStairs':
      return '#73d18a';
    case 'dungeonChest':
    case 'bankService':
    case 'marketStall':
    case 'noticeBoard':
      return '#d9ad4f';
    case 'dungeonDoor':
      return '#f08a62';
    case 'dungeonKey':
      return '#fff1b8';
    case 'dungeonPuzzle':
      return '#66f0ff';
    case 'dungeonEvent':
      return '#ef6f6c';
    case 'blacksmithService':
    case 'classTrainerService':
      return '#a86bd6';
    case 'alchemistService':
    case 'shrine':
      return '#59d7e8';
    case 'herb':
    case 'emberleaf':
    case 'gravecap':
    case 'ashFruit':
    case 'lanternMoss':
    case 'reed':
    case 'riverReed':
    case 'forage':
    case 'bitterroot':
    case 'moonpetal':
    case 'bloodmoss':
    case 'thornsilkVine':
    case 'spiritFern':
    case 'dawnsage':
    case 'redSealPoppy':
    case 'tree':
    case 'log':
    case 'deadwood':
    case 'rareTree':
      return '#73d18a';
    case 'ore':
    case 'stone':
    case 'crystal':
    case 'deepstone':
    case 'bone':
    case 'runestone':
      return '#9facbf';
    default:
      return '#e3cef2';
  }
}

function getTileColor(tile, world) {
  const biomeId = tile.biome || tile.type || 'grass';
  const biome = BIOMES[biomeId] || BIOMES.grass;
  const passable = tile.passable ?? biome.passable;
  if(tile.forestWall)return '#2b4635';
  if(world.terrainFeatures?.echorynRevision){
    if(biomeId==='water')return '#315d65';
    if(biomeId==='cliff'||!passable)return '#777663';
  }

  if (!passable) {
    return world.mode === 'dungeon' ? '#10131b' : '#0d1720';
  }

  if (world.mode === 'dungeon') {
    if (biomeId === 'path') return tile.variant ? '#4d4031' : '#403629';
    if (biomeId === 'ruin') return tile.variant ? '#343542' : '#282a34';
    if (biomeId === 'dead') return tile.variant ? '#2c262b' : '#221e21';
    return tile.variant ? '#32333b' : '#272a31';
  }

  if (biomeId === 'path') return tile.variant ? '#5b4a35' : '#483b2c';
  if (biomeId === 'water') return '#14304b';
  if (biomeId === 'ruin') return tile.variant ? '#383a47' : '#292c35';
  if (biomeId === 'dead') return tile.variant ? '#30282b' : '#211d20';

  return tile.variant ? (biome.alt || '#213722') : (biome.color || '#172a1b');
}

function getRoomContainingTile(world, tileX, tileY) {
  if (!Array.isArray(world.rooms)) return null;

  return world.rooms.find(room => {
    return tileX >= room.x - 1 &&
      tileX <= room.x + room.w + 1 &&
      tileY >= room.y - 1 &&
      tileY <= room.y + room.h + 1;
  }) || null;
}

function getPartyActors(game) {
  return [game?.player, ...getActiveCoopActors(game)].filter(Boolean);
}

function getActiveCoopActors(game) {
  return (game?.player?.coop?.players || []).filter(ally => ally && ally.active !== false);
}

function getWorldDisplayName(world) {
  if (world.mode === 'dungeon') return world.name || 'Dungeon';
  if (world.mode === 'capital') return world.name || 'Orrakai';
  return normalizePlayerFacingWorldName(world.name, ACT1_OVERWORLD_DISPLAY_NAME);
}

function getWorldFloorLabel(world) {
  if (world.mode === 'dungeon') {
    return `Floor ${world.floor || 1}/${world.totalFloors || 1}`;
  }

  if (world.mode === 'travelRoute') return 'Route';
  if (world.mode === 'capital' || world.mode === 'hub' || world.mode === 'town') return 'Town';
  return 'Map';
}

function getWorldWidth(world) {
  return world.width || world.tiles?.[0]?.length || 0;
}

function getWorldHeight(world) {
  return world.height || world.tiles?.length || 0;
}

function getMinimapSize() {
  if (typeof window === 'undefined') return MINIMAP_SIZE_DESKTOP;
  return window.innerWidth <= 760 ? MINIMAP_SIZE_SMALL : MINIMAP_SIZE_DESKTOP;
}
