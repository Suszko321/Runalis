// terrainRenderer.js
// Runalis terrain renderer.
//
// New direction:
// - If world.terrainFeatures exists, draw seamless feature-based terrain.
// - Tiles remain hidden gameplay logic.
// - Tile fallback still exists for dungeons / old maps.
// - Hybrid authored raster art and cached/code-drawn seamless terrain.
import {drawOrrakaiGround} from './orrakaiRenderer.js';
import {drawEchorynGround} from './echorynRenderer.js';
import {drawContinentalGround} from './continentRenderer.js';

import { TILE, BIOMES } from './data.js';
import { drawTerrainTile, terrainPattern } from './spriteArt.js';
import { getBiomeVisualPalette } from './visualStyle.js';
import {
  getEnvironmentBiomePalette,
  getEnvironmentVisualProfile
} from './environmentVisualStyle.js';

const BRIDGE_LAYOUT_CACHE = new WeakMap();

// -----------------------------------------------------------------------------
// WORLD DIMENSIONS
// -----------------------------------------------------------------------------

export function getWorldWidth(world) {
  return world?.tiles?.[0]?.length || 0;
}

export function getWorldHeight(world) {
  return world?.tiles?.length || 0;
}

export function getWorldPixelWidth(world) {
  if (world?.terrainFeatures?.worldPixelWidth) return world.terrainFeatures.worldPixelWidth;
  return getWorldWidth(world) * TILE;
}

export function getWorldPixelHeight(world) {
  if (world?.terrainFeatures?.worldPixelHeight) return world.terrainFeatures.worldPixelHeight;
  return getWorldHeight(world) * TILE;
}

// -----------------------------------------------------------------------------
// CAMERA TILE BOUNDS
// -----------------------------------------------------------------------------

export function getVisibleTileBounds(ctx, world, camera) {
  const worldW = getWorldWidth(world);
  const worldH = getWorldHeight(world);

  if (!ctx || !world || !camera || !worldW || !worldH) {
    return {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0
    };
  }

  const startX = clamp(
    Math.floor(camera.x / TILE) - 2,
    0,
    Math.max(0, worldW - 1)
  );

  const startY = clamp(
    Math.floor(camera.y / TILE) - 2,
    0,
    Math.max(0, worldH - 1)
  );

  const endX = clamp(
    startX + Math.ceil(ctx.canvas.width / TILE) + 6,
    0,
    worldW
  );

  const endY = clamp(
    startY + Math.ceil(ctx.canvas.height / TILE) + 6,
    0,
    worldH
  );

  return {
    startX,
    startY,
    endX,
    endY
  };
}

// -----------------------------------------------------------------------------
// PUBLIC TILE / TERRAIN DRAW
// -----------------------------------------------------------------------------

export function drawTiles(ctx, world, camera, bounds = null) {
  if (!ctx || !world || !camera) return;
  if (drawContinentalGround(ctx, world, camera)) return;
  if (drawOrrakaiGround(ctx, world, camera)) return;
  if (drawEchorynGround(ctx, world, camera)) return;

  if (world.terrainFeatures) {
    drawSeamlessTerrain(ctx, world, camera);
    return;
  }

  drawFallbackTileTerrain(ctx, world, camera, bounds);
}

// -----------------------------------------------------------------------------
// SEAMLESS FEATURE-BASED TERRAIN
// -----------------------------------------------------------------------------

function drawSeamlessTerrain(ctx, world, camera) {
  const features = world.terrainFeatures;
  if (!features) return;

  drawBaseWorld(ctx, world, camera, features);

  drawBiomeBlobs(ctx, camera, features.biomeBlobs || []);
  drawForestMasses(ctx, camera, features.forestMasses || []);

  drawLakes(ctx, camera, features.lakes || []);
  drawRivers(ctx, camera, features.rivers || []);

  // Roads render after water so every unavoidable crossing reads as a bridge
  // and matches the passable road bridge tiles used by collision.
  drawRoads(ctx, camera, features.roads || []);
  drawBridgeTiles(ctx, camera, features.bridgeTiles || []);

  drawRuinFields(ctx, camera, features.ruinFields || []);
  drawCliffs(ctx, camera, features.cliffs || []);

  drawDetailFields(ctx, world, camera, features.detailFields || []);

}

export function drawEnvironmentAtmosphere(ctx, world, camera, layer = 'back') {
  if (!ctx || !world || !camera) return;

  const profile = getEnvironmentVisualProfile(world);

  if (layer === 'front') {
    drawSubtleWorldVignette(ctx, profile.vignette);
    return;
  }

  ctx.save();
  ctx.fillStyle = profile.tint;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.restore();
}

function drawBaseWorld(ctx, world, camera, features) {
  const base = features.base || {};
  const baseColor = base.color || '#172a1b';

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const grassPattern = terrainPattern(ctx, 0, camera);
  if (grassPattern) {
    ctx.save();ctx.globalAlpha=.42;ctx.fillStyle=grassPattern;
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();
  }
  drawBaseNoise(ctx, world, camera, base);
}

function drawBaseNoise(ctx, world, camera, base) {
  const seed = base.noiseSeed || 'base';
  const step = 32;

  const startX = Math.floor(camera.x / step) * step;
  const startY = Math.floor(camera.y / step) * step;

  ctx.save();

  for (let wy = startY - step; wy < camera.y + ctx.canvas.height + step; wy += step) {
    for (let wx = startX - step; wx < camera.x + ctx.canvas.width + step; wx += step) {
      const sx = Math.floor(wx - camera.x);
      const sy = Math.floor(wy - camera.y);

      const n = valueNoise(Math.floor(wx / step), Math.floor(wy / step), seed);

      if (n > 0.72) {
        ctx.globalAlpha = 0.045;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 6, sy + 8, 18, 5);
      } else if (n < 0.18) {
        ctx.globalAlpha = 0.055;
        ctx.fillStyle = base.shadowColor || '#0d1710';
        ctx.fillRect(sx + 9, sy + 17, 24, 6);
      }

      if (n > 0.36 && n < 0.43) {
        ctx.globalAlpha = 0.035;
        ctx.fillStyle = '#000000';
        ctx.fillRect(sx + 21, sy + 3, 7, 3);
      }
    }
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// BIOME BLOBS
// -----------------------------------------------------------------------------

function drawBiomeBlobs(ctx, camera, blobs) {
  for (const blob of blobs) {
    if (!blob || !ellipseIntersectsViewport(blob.x, blob.y, blob.rx, blob.ry, camera, ctx, 160)) continue;

    drawOrganicBlob(ctx, camera, blob, {
      fill: blob.color,
      edge: blob.edgeColor,
      highlight: blob.highlightColor,
      alpha: blob.alpha ?? 0.7,
      rings: blob.kind === 'water' ? 0 : 2
    });
  }
}

function drawOrganicBlob(ctx, camera, blob, options = {}) {
  const x = blob.x - camera.x;
  const y = blob.y - camera.y;

  const rx = blob.rx || 200;
  const ry = blob.ry || 140;

  ctx.save();

  ctx.globalAlpha = options.alpha ?? 0.7;
  ctx.fillStyle = options.fill || blob.color || '#1d3521';

  beginOrganicEllipsePath(ctx, x, y, rx, ry, blob.seed || blob.id, 44, 0.12);
  ctx.fill();

  if (options.edge) {
    ctx.globalAlpha = Math.min(0.45, (options.alpha ?? 0.7) * 0.55);
    ctx.strokeStyle = options.edge;
    ctx.lineWidth = 18;
    beginOrganicEllipsePath(ctx, x, y, rx, ry, `${blob.seed || blob.id}-edge`, 44, 0.10);
    ctx.stroke();
  }

  if (options.highlight) {
    ctx.globalAlpha = Math.min(0.18, (options.alpha ?? 0.7) * 0.22);
    ctx.strokeStyle = options.highlight;
    ctx.lineWidth = 4;
    beginOrganicEllipsePath(ctx, x, y, rx * 0.72, ry * 0.65, `${blob.seed || blob.id}-inner`, 36, 0.18);
    ctx.stroke();
  }

  if (options.rings > 0) {
    for (let i = 0; i < options.rings; i++) {
      ctx.globalAlpha = 0.035;
      ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : '#000000';
      ctx.lineWidth = 2;
      beginOrganicEllipsePath(
        ctx,
        x,
        y,
        rx * (0.42 + i * 0.18),
        ry * (0.38 + i * 0.16),
        `${blob.seed || blob.id}-ring-${i}`,
        28,
        0.16
      );
      ctx.stroke();
    }
  }

  ctx.restore();
}

function beginOrganicEllipsePath(ctx, x, y, rx, ry, seed, points = 40, wobble = 0.12) {
  ctx.beginPath();

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const angle = t * Math.PI * 2;

    const n = valueNoise(i, 0, seed) * 2 - 1;
    const n2 = valueNoise(i, 13, `${seed}-b`) * 2 - 1;
    const rMod = 1 + n * wobble + n2 * wobble * 0.45;

    const px = x + Math.cos(angle) * rx * rMod;
    const py = y + Math.sin(angle) * ry * rMod;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
}

// -----------------------------------------------------------------------------
// ROADS
// -----------------------------------------------------------------------------

function drawRoads(ctx, camera, roads) {
  for (const road of roads) {
    if (!pathIntersectsViewport(road.points, road.width, camera, ctx)) continue;

    drawSmoothRoad(ctx, camera, road);
  }
}

function drawSmoothRoad(ctx, camera, road) {
  const points = screenPoints(road.points, camera);
  const width = road.width || 80;

  ctx.save();

  // Outer irregular dirt shoulder.
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = road.edgeColor || '#2f241b';
  ctx.lineWidth = width * 1.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawSmoothPath(ctx, points);
  ctx.stroke();

  // Main road body.
  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = terrainPattern(ctx, 1, camera) || road.color || '#4b392a';
  ctx.lineWidth = width;
  drawSmoothPath(ctx, points);
  ctx.stroke();

  // Soft highlight down the center, broken by dash pattern.
  ctx.globalAlpha = 0.17;
  ctx.strokeStyle = road.lightColor || '#8c6b42';
  ctx.lineWidth = Math.max(4, width * 0.13);
  ctx.setLineDash([18, 22]);
  drawSmoothPath(ctx, jitteredPoints(points, road.seed, 6));
  ctx.stroke();
  ctx.setLineDash([]);

  // Dark worn grooves.
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#15100c';
  ctx.lineWidth = Math.max(3, width * 0.07);

  const sideA = offsetPath(points, width * 0.24);
  const sideB = offsetPath(points, -width * 0.22);

  drawSmoothPath(ctx, jitteredPoints(sideA, `${road.seed}-groove-a`, 4));
  ctx.stroke();

  drawSmoothPath(ctx, jitteredPoints(sideB, `${road.seed}-groove-b`, 4));
  ctx.stroke();

  drawRoadDebris(ctx, points, width, road);

  ctx.restore();
}

function drawRoadDebris(ctx, points, width, road) {
  ctx.setLineDash([]);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let j = 1; j <= 2; j++) {
      const t = j / 3;
      const side = valueNoise(i, j, `${road.seed}-debris`) > 0.5 ? 1 : -1;
      const offset = width * (0.30 + valueNoise(j, i, road.seed) * 0.12) * side;
      const x = a[0] + dx * t + nx * offset;
      const y = a[1] + dy * t + ny * offset;

      ctx.globalAlpha = 0.25;
      ctx.fillStyle = j % 2 === 0 ? road.lightColor || '#8c6b42' : road.edgeColor || '#2f241b';
      ctx.fillRect(Math.round(x), Math.round(y), 3 + (i % 3), 2);
    }
  }
}

function drawBridgeTiles(ctx, camera, bridgeTiles) {
  if (!bridgeTiles?.length) return;

  const layout = getBridgeLayout(bridgeTiles);

  ctx.save();
  for (let i = 0; i < bridgeTiles.length; i++) {
    const bridge = bridgeTiles[i];
    const x = Math.round(bridge.x - camera.x);
    const y = Math.round(bridge.y - camera.y);
    if (!isOnScreen(ctx, x, y, TILE * 2)) continue;
    const horizontal = layout[i] === 'horizontal';

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#3a281b';
    ctx.fillRect(x - TILE / 2 - 1, y - TILE / 2 - 1, TILE + 2, TILE + 2);

    ctx.fillStyle = '#6e4a2c';
    for (let offset = -TILE / 2 + 3; offset < TILE / 2; offset += 7) {
      if (horizontal) {
        ctx.fillRect(x + offset, y - TILE / 2 + 1, 5, TILE - 2);
      } else {
        ctx.fillRect(x - TILE / 2 + 1, y + offset, TILE - 2, 5);
      }

      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#c09055';
      if (horizontal) {
        ctx.fillRect(x + offset, y - TILE / 2 + 3, 1, TILE - 7);
      } else {
        ctx.fillRect(x - TILE / 2 + 3, y + offset, TILE - 7, 1);
      }

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#6e4a2c';
    }

    ctx.fillStyle = '#21150f';
    if (horizontal) {
      ctx.fillRect(x - TILE / 2, y - TILE / 2 + 2, TILE, 3);
      ctx.fillRect(x - TILE / 2, y + TILE / 2 - 5, TILE, 3);
    } else {
      ctx.fillRect(x - TILE / 2 + 2, y - TILE / 2, 3, TILE);
      ctx.fillRect(x + TILE / 2 - 5, y - TILE / 2, 3, TILE);
    }
  }
  ctx.restore();
}

function getBridgeLayout(bridgeTiles) {
  const cached = BRIDGE_LAYOUT_CACHE.get(bridgeTiles);
  if (cached) return cached;

  const occupied = new Set(bridgeTiles.map(bridge => `${Math.round(bridge.x / TILE)},${Math.round(bridge.y / TILE)}`));
  const layout = bridgeTiles.map(bridge => {
    const tx = Math.floor(bridge.x / TILE);
    const ty = Math.floor(bridge.y / TILE);
    const horizontalNeighbors = Number(occupied.has(`${tx - 1},${ty}`)) + Number(occupied.has(`${tx + 1},${ty}`));
    const verticalNeighbors = Number(occupied.has(`${tx},${ty - 1}`)) + Number(occupied.has(`${tx},${ty + 1}`));
    return horizontalNeighbors > verticalNeighbors ? 'horizontal' : 'vertical';
  });

  BRIDGE_LAYOUT_CACHE.set(bridgeTiles, layout);
  return layout;
}

// -----------------------------------------------------------------------------
// WATER
// -----------------------------------------------------------------------------

function drawRivers(ctx, camera, rivers) {
  for (const river of rivers) {
    if (!pathIntersectsViewport(river.points, river.width, camera, ctx)) continue;

    drawSmoothRiver(ctx, camera, river);
  }
}

function drawSmoothRiver(ctx, camera, river) {
  const points = screenPoints(river.points, camera);
  const width = river.width || 120;
  const rippleShift = Math.floor((globalThis.performance?.now?.() || 0) / 180) % 54;

  ctx.save();

  // Shore / wet bank.
  ctx.globalAlpha = 0.58;
  ctx.strokeStyle = river.shoreColor || '#1f3340';
  ctx.lineWidth = width * 1.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawSmoothPath(ctx, jitteredPoints(points, `${river.seed}-shore`, 9));
  ctx.stroke();

  // Main water.
  ctx.globalAlpha = 0.98;
  ctx.strokeStyle = river.color || '#10253b';
  ctx.lineWidth = width;
  drawSmoothPath(ctx, points);
  ctx.stroke();

  // Deep center.
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = river.deepColor || '#071522';
  ctx.lineWidth = width * 0.45;
  drawSmoothPath(ctx, jitteredPoints(points, `${river.seed}-deep`, 5));
  ctx.stroke();

  // Highlights / ripples.
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = river.highlightColor || '#83b7d4';
  ctx.lineWidth = Math.max(3, width * 0.035);
  ctx.setLineDash([26, 28]);
  ctx.lineDashOffset = -rippleShift;

  const rippleA = offsetPath(points, -width * 0.18);
  const rippleB = offsetPath(points, width * 0.15);

  drawSmoothPath(ctx, jitteredPoints(rippleA, `${river.seed}-ripple-a`, 4));
  ctx.stroke();

  ctx.globalAlpha = 0.16;
  drawSmoothPath(ctx, jitteredPoints(rippleB, `${river.seed}-ripple-b`, 4));
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.restore();
}

function drawLakes(ctx, camera, lakes) {
  for (const lake of lakes) {
    if (!ellipseIntersectsViewport(lake.x, lake.y, lake.rx, lake.ry, camera, ctx, 120)) continue;

    drawOrganicLake(ctx, camera, lake);
  }
}

function drawOrganicLake(ctx, camera, lake) {
  const x = lake.x - camera.x;
  const y = lake.y - camera.y;
  const rx = lake.rx || 220;
  const ry = lake.ry || 140;
  const ripplePhase = Math.floor((globalThis.performance?.now?.() || 0) / 280) % 12;

  ctx.save();

  // Wet shore.
  ctx.globalAlpha = 0.46;
  ctx.fillStyle = lake.edgeColor || '#1f3340';
  beginOrganicEllipsePath(ctx, x, y, rx * 1.08, ry * 1.08, `${lake.seed}-shore`, 46, 0.15);
  ctx.fill();

  // Main water.
  ctx.globalAlpha = lake.alpha ?? 0.92;
  ctx.fillStyle = lake.color || '#10253b';
  beginOrganicEllipsePath(ctx, x, y, rx, ry, `${lake.seed}-water`, 48, 0.13);
  ctx.fill();

  // Deep center.
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#071522';
  beginOrganicEllipsePath(ctx, x, y, rx * 0.56, ry * 0.48, `${lake.seed}-deep`, 34, 0.16);
  ctx.fill();

  // Ripples.
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = lake.highlightColor || '#83b7d4';
  ctx.lineWidth = 2;

  for (let i = 0; i < 4; i++) {
    const ox = (valueNoise(i, 0, lake.seed) - 0.5) * rx * 0.55;
    const oy = (valueNoise(i, 4, lake.seed) - 0.5) * ry * 0.55;
    const rw = rx * (0.18 + i * 0.075) + ripplePhase;
    const rh = ry * (0.045 + i * 0.025) + ripplePhase * 0.22;

    ctx.beginPath();
    ctx.ellipse(x + ox, y + oy, rw, rh, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// FOREST MASSES
// -----------------------------------------------------------------------------

function drawForestMasses(ctx, camera, masses) {
  for (const mass of masses) {
    if (!ellipseIntersectsViewport(mass.x, mass.y, mass.rx, mass.ry, camera, ctx, 120)) continue;

    drawForestMass(ctx, camera, mass);
  }
}

function drawForestMass(ctx, camera, mass) {
  const x = mass.x - camera.x;
  const y = mass.y - camera.y;

  ctx.save();

  ctx.globalAlpha = mass.alpha || 0.25;
  ctx.fillStyle = mass.darkColor || '#102515';
  beginOrganicEllipsePath(ctx, x, y, mass.rx, mass.ry, mass.seed, 48, 0.20);
  ctx.fill();

  ctx.globalAlpha = (mass.alpha || 0.25) * 0.55;
  ctx.fillStyle = mass.midColor || '#1f4528';
  beginOrganicEllipsePath(ctx, x, y, mass.rx * 0.76, mass.ry * 0.72, `${mass.seed}-inner`, 42, 0.22);
  ctx.fill();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// RUINS
// -----------------------------------------------------------------------------

function drawRuinFields(ctx, camera, ruinFields) {
  for (const field of ruinFields) {
    if (!ellipseIntersectsViewport(field.x, field.y, field.rx, field.ry, camera, ctx, 180)) continue;

    drawRuinField(ctx, camera, field);
  }
}

function drawRuinField(ctx, camera, field) {
  ctx.save();

  for (const piece of field.pieces || []) {
    const x = piece.x - camera.x;
    const y = piece.y - camera.y;

    if (!isOnScreen(ctx, x, y, 160)) continue;

    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(piece.angle || 0);

    ctx.globalAlpha = 0.46;
    ctx.fillStyle = field.darkColor || '#1c1d24';
    roundedRect(ctx, -piece.w / 2 - 3, -piece.h / 2 - 3, piece.w + 6, piece.h + 6, 6);
    ctx.fill();

    ctx.globalAlpha = 0.52;
    ctx.fillStyle = piece.color || field.color || '#494b57';
    roundedRect(ctx, -piece.w / 2, -piece.h / 2, piece.w, piece.h, 5);
    ctx.fill();

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-piece.w / 2 + 6, -piece.h / 2 + 3, piece.w * 0.35, 3);

    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = field.darkColor || '#1c1d24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-piece.w / 2 + 7, piece.h / 2 - 3);
    ctx.lineTo(piece.w / 2 - 7, -piece.h / 2 + 3);
    ctx.stroke();

    ctx.globalAlpha = 0.34;
    ctx.fillStyle = field.darkColor || '#1c1d24';
    ctx.fillRect(piece.w / 2 - 8, piece.h / 2 - 4, 5, 3);

    ctx.restore();
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// CLIFFS / RIDGES
// -----------------------------------------------------------------------------

function drawCliffs(ctx, camera, cliffs) {
  for (const cliff of cliffs) {
    if (!pathIntersectsViewport(cliff.points, cliff.width, camera, ctx)) continue;

    drawCliff(ctx, camera, cliff);
  }
}

function drawCliff(ctx, camera, cliff) {
  const points = screenPoints(cliff.points, camera);
  const width = cliff.width || 80;

  ctx.save();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shadow base.
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = cliff.shadowColor || '#05060a';
  ctx.lineWidth = width * 1.05;
  drawSmoothPath(ctx, jitteredPoints(points, `${cliff.seed}-shadow`, 7));
  ctx.stroke();

  // Main ridge.
  ctx.globalAlpha = 0.88;
  ctx.strokeStyle = cliff.color || '#1b1d26';
  ctx.lineWidth = width * 0.78;
  drawSmoothPath(ctx, points);
  ctx.stroke();

  // Light top edge.
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = cliff.lightColor || '#555966';
  ctx.lineWidth = Math.max(4, width * 0.12);
  drawSmoothPath(ctx, offsetPath(jitteredPoints(points, `${cliff.seed}-top`, 4), -width * 0.20));
  ctx.stroke();

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = cliff.lightColor || '#555966';
  ctx.lineWidth = Math.max(2, width * 0.045);
  drawSmoothPath(ctx, offsetPath(jitteredPoints(points, `${cliff.seed}-strata`, 5), width * 0.03));
  ctx.stroke();

  // Broken cracks.
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 16]);
  drawSmoothPath(ctx, offsetPath(points, width * 0.18));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// DETAIL FIELDS
// -----------------------------------------------------------------------------

function drawDetailFields(ctx, world, camera, detailFields) {
  const step = 32;
  const startX = Math.floor(camera.x / step) * step - step;
  const startY = Math.floor(camera.y / step) * step - step;
  const endX = camera.x + ctx.canvas.width + step;
  const endY = camera.y + ctx.canvas.height + step;

  for (const field of detailFields) {
    drawDetailField(ctx, world, camera, field, startX, startY, endX, endY, step);
  }
}

function drawDetailField(ctx, world, camera, field, startX, startY, endX, endY, step) {
  ctx.save();

  for (let wy = startY; wy < endY; wy += step) {
    for (let wx = startX; wx < endX; wx += step) {
      const tileX = Math.floor(wx / TILE);
      const tileY = Math.floor(wy / TILE);
      const tile = world.tiles?.[tileY]?.[tileX];

      if (!tile) continue;
      if (!detailFieldAppliesToBiome(field.kind, tile.biome)) continue;

      const n = valueNoise(tileX, tileY, field.seed);
      if (n > field.density) continue;

      const sx = wx - camera.x;
      const sy = wy - camera.y;

      ctx.globalAlpha = field.alpha || 0.12;

      if (field.kind === 'grassNoise') {
        drawGrassTuft(ctx, sx + 10, sy + 20, field.color);
      } else if (field.kind === 'pathSpeckles') {
        drawPathSpeckles(ctx, sx, sy, field.color, field.darkColor);
      } else if (field.kind === 'deadlandAsh') {
        drawDeadAsh(ctx, sx, sy, field.color, field.darkColor);
      } else if (field.kind === 'ruinCracks') {
        drawRuinCrack(ctx, sx, sy, field.darkColor);
      }
    }
  }

  ctx.restore();
}

function detailFieldAppliesToBiome(kind, biome) {
  if (kind === 'grassNoise') return biome === 'grass';
  if (kind === 'pathSpeckles') return biome === 'path';
  if (kind === 'deadlandAsh') return biome === 'dead';
  if (kind === 'ruinCracks') return biome === 'ruin' || biome === 'ore';
  return true;
}

function drawGrassTuft(ctx, x, y, color) {
  ctx.strokeStyle = color || '#5f8b45';
  ctx.lineWidth = 1;

  line(ctx, x, y, x + 1, y - 7);
  line(ctx, x + 3, y, x + 6, y - 6);
  line(ctx, x - 3, y, x - 5, y - 5);

  ctx.fillStyle = '#9aa861';
  ctx.fillRect(Math.round(x + 4), Math.round(y - 8), 2, 2);
}

function drawPathSpeckles(ctx, x, y, lightColor, darkColor) {
  ctx.fillStyle = lightColor || '#a78553';
  ctx.fillRect(x + 6, y + 7, 6, 2);
  ctx.fillRect(x + 19, y + 23, 4, 2);

  ctx.fillStyle = darkColor || '#1e1711';
  ctx.fillRect(x + 15, y + 14, 10, 2);
}

function drawDeadAsh(ctx, x, y, lightColor, darkColor) {
  ctx.strokeStyle = darkColor || '#0d090c';
  ctx.lineWidth = 1;
  line(ctx, x + 5, y + 21, x + 24, y + 15);

  ctx.fillStyle = lightColor || '#6d3d45';
  ctx.fillRect(x + 11, y + 8, 9, 3);
  ctx.fillRect(x + 25, y + 23, 3, 2);
}

function drawRuinCrack(ctx, x, y, color) {
  ctx.strokeStyle = color || '#101119';
  ctx.lineWidth = 1;
  line(ctx, x + 5, y + 25, x + 16, y + 17);
  line(ctx, x + 16, y + 17, x + 25, y + 20);
  line(ctx, x + 16, y + 17, x + 13, y + 11);
}

// -----------------------------------------------------------------------------
// TILE FALLBACK TERRAIN
// -----------------------------------------------------------------------------

function drawFallbackTileTerrain(ctx, world, camera, bounds = null) {
  if (!ctx || !world?.tiles || !camera) return;

  const safeBounds = bounds || getVisibleTileBounds(ctx, world, camera);

  drawFallbackBaseLayer(ctx, world, camera, safeBounds);
  drawFallbackTransitionLayer(ctx, world, camera, safeBounds);
  drawFallbackDetailLayer(ctx, world, camera, safeBounds);
}

function drawFallbackBaseLayer(ctx, world, camera, bounds) {
  const { startX, startY, endX, endY } = bounds;
  const style = getFallbackEnvironmentStyle(world);

  for (let y = startY; y < endY; y++) {
    const row = world.tiles[y];
    if (!row) continue;

    for (let x = startX; x < endX; x++) {
      const tile = row[x];
      if (!tile) continue;

      const sx = Math.floor(x * TILE - camera.x);
      const sy = Math.floor(y * TILE - camera.y);

      const visualBiome = getFallbackVisualBiome(world, tile);
      const palette = getTerrainPalette(world, visualBiome);
      const n = smoothedTileNoise(x, y, `${style.id}-fallback-${visualBiome}`);

      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.base;
      ctx.fillRect(sx, sy, TILE, TILE);

      if (drawTerrainTile(ctx, world, tile, x, y, sx, sy)) continue;

      if (style.isDungeon && tile.biome === 'wall') {
        drawFallbackWallBase(ctx, sx, sy, palette, n);
        continue;
      }

      if (tile.biome === 'water') continue;

      if (n > 0.72) {
        ctx.globalAlpha = style.baseNoiseAlpha;
        ctx.fillStyle = palette.base2 || palette.base;
        roundedRect(ctx, sx + 4, sy + 5, TILE - 8, TILE - 11, 4);
        ctx.fill();
      } else if (n < 0.16) {
        ctx.globalAlpha = style.baseShadowAlpha;
        ctx.fillStyle = palette.dark || palette.base;
        roundedRect(ctx, sx + 7, sy + 9, TILE - 13, TILE - 16, 4);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
}

function drawFallbackTransitionLayer(ctx, world, camera, bounds) {
  const { startX, startY, endX, endY } = bounds;

  for (let y = startY; y < endY; y++) {
    const row = world.tiles[y];
    if (!row) continue;

    for (let x = startX; x < endX; x++) {
      const tile = row[x];
      if (!tile) continue;

      const sx = Math.floor(x * TILE - camera.x);
      const sy = Math.floor(y * TILE - camera.y);

      drawFallbackTileTransitions(ctx, world, tile, sx, sy, x, y);
    }
  }
}

function drawFallbackTileTransitions(ctx, world, tile, sx, sy, tx, ty) {
  const current = tile.biome;
  const neighbors = getNeighborBiomes(world, tx, ty);
  const style = getFallbackEnvironmentStyle(world);

  for (const side of CARDINAL_SIDES) {
    const neighbor = neighbors[side.key];
    if (!neighbor || neighbor === current) continue;

    if (style.isDungeon && current !== 'wall' && neighbor === 'wall') {
      drawWallFloorShadow(ctx, sx, sy, side.key);
      continue;
    }

    if (style.isDungeon && current === 'wall' && neighbor !== 'wall') {
      drawWallEdgeHighlight(ctx, sx, sy, side.key);
      continue;
    }

    const palette = getTerrainPalette(world, getFallbackVisualBiome(world, { biome: neighbor }));

    ctx.save();
    ctx.globalAlpha = style.transitionAlpha;
    ctx.fillStyle = palette.base;
    drawSideBlend(ctx, sx, sy, side.key, style.transitionDepth);
    ctx.restore();
  }
}

function drawFallbackDetailLayer(ctx, world, camera, bounds) {
  const { startX, startY, endX, endY } = bounds;
  const style = getFallbackEnvironmentStyle(world);

  ctx.save();

  for (let y = startY; y < endY; y++) {
    const row = world.tiles[y];
    if (!row) continue;

    for (let x = startX; x < endX; x++) {
      const tile = row[x];
      if (!tile) continue;

      const sx = Math.floor(x * TILE - camera.x);
      const sy = Math.floor(y * TILE - camera.y);

      const visualBiome = getFallbackVisualBiome(world, tile);
      const palette = getTerrainPalette(world, visualBiome);
      const n = valueNoise(x, y, `${style.id}-detail-${tile.biome}`);
      const n2 = valueNoise(x, y, `${style.id}-detail-b`);

      if (style.isDungeon) {
        drawDungeonFallbackTileDetail(ctx, world, tile, sx, sy, x, y, palette, n, n2);
      } else if (style.isTown) {
        drawTownFallbackTileDetail(ctx, tile, sx, sy, palette, n, n2);
      } else {
        drawWorldFallbackTileDetail(ctx, tile, sx, sy, palette, n, n2);
      }

      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

function getFallbackEnvironmentStyle(world) {
  const theme = getDungeonThemeId(world);
  const isDungeon = Boolean(world?.mode === 'dungeon' || world?.mode === 'tower' || world?.dungeon?.active);
  const isTown = Boolean(world?.mode === 'capital' || world?.mode === 'hub' || world?.mode === 'town');

  return {
    id: isDungeon ? `dungeon-${theme}` : isTown ? 'orrakai-town' : String(world?.mode || world?.theme || 'fallback'),
    theme,
    isDungeon,
    isTown,
    baseNoiseAlpha: isDungeon ? 0.035 : isTown ? 0.03 : 0.04,
    baseShadowAlpha: isDungeon ? 0.045 : isTown ? 0.035 : 0.05,
    transitionAlpha: isDungeon ? 0.14 : isTown ? 0.16 : 0.20,
    transitionDepth: isDungeon ? 5 : isTown ? 6 : 8
  };
}

function getFallbackVisualBiome(world, tile) {
  const biome = tile?.biome || 'grass';

  if (!isDungeonLike(world)) return biome;
  if (biome === 'wall' || biome === 'water') return biome;

  const theme = getDungeonThemeId(world);
  if (theme === 'mine' || theme === 'cave') return 'ore';
  if (theme === 'thorn') return 'grass';
  if (theme === 'cult' || theme === 'demon') return 'dead';
  if (theme === 'cellar') return 'path';
  return 'ruin';
}

function isDungeonLike(world) {
  return Boolean(world?.mode === 'dungeon' || world?.mode === 'tower' || world?.dungeon?.active);
}

function getDungeonThemeId(world) {
  const text = [
    world?.theme,
    world?.name,
    world?.dungeonId,
    world?.entranceId,
    world?.poiId,
    world?.dungeon?.id,
    world?.dungeon?.name
  ].filter(Boolean).join(' ').toLowerCase();

  if (/cult|demon|red seal|ember|malakar|solgate/.test(text)) return 'cult';
  if (/grave|crypt|veyr|necrom|burial|bone/.test(text)) return 'grave';
  if (/thorn|root|hollow|forest|briar|grove/.test(text)) return 'thorn';
  if (/mine|mire|ore|iron|cave/.test(text)) return 'mine';
  if (/holy|choir|covenant|aureate|chapel|seraphel/.test(text)) return 'holy';
  if (/cosmic|zephyr|ascension|eldritch|void/.test(text)) return 'cosmic';
  if (/ruin|castle|roadwork|tower|vault/.test(text)) return 'ruin';
  if (/cellar|basement|storehouse/.test(text)) return 'cellar';
  return 'cellar';
}

function drawFallbackWallBase(ctx, sx, sy, palette, n) {
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = palette.dark || '#05060a';
  ctx.fillRect(sx, sy + TILE - 5, TILE, 5);

  if (n > 0.64) {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette.light || '#6d7382';
    ctx.lineWidth = 1;
    line(ctx, sx + 4, sy + 8, sx + 15, sy + 8);
    line(ctx, sx + 19, sy + 18, sx + 28, sy + 18);
  } else if (n < 0.22) {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette.dark || '#05060a';
    ctx.lineWidth = 1;
    line(ctx, sx + 8, sy + 6, sx + 14, sy + 16);
    line(ctx, sx + 14, sy + 16, sx + 22, sy + 13);
  }
}

function drawWallFloorShadow(ctx, sx, sy, side) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000000';
  drawSideBlend(ctx, sx, sy, side, 7);
  ctx.restore();
}

function drawWallEdgeHighlight(ctx, sx, sy, side) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#8e929c';
  ctx.lineWidth = 1;

  if (side === 'n') line(ctx, sx + 2, sy + 1, sx + TILE - 2, sy + 1);
  if (side === 's') line(ctx, sx + 2, sy + TILE - 2, sx + TILE - 2, sy + TILE - 2);
  if (side === 'w') line(ctx, sx + 1, sy + 2, sx + 1, sy + TILE - 2);
  if (side === 'e') line(ctx, sx + TILE - 2, sy + 2, sx + TILE - 2, sy + TILE - 2);

  ctx.restore();
}

function drawDungeonFallbackTileDetail(ctx, world, tile, sx, sy, tx, ty, palette, n, n2) {
  if (tile.biome === 'wall') return;

  if (tile.biome === 'water') {
    drawFallbackWaterDetail(ctx, sx, sy, palette, n);
    return;
  }

  const theme = getDungeonThemeId(world);

  if ((tx + ty) % 4 === 0 && n > 0.48) {
    ctx.globalAlpha = 0.055;
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 1;
    line(ctx, sx + 1, sy + TILE - 1, sx + TILE - 3, sy + TILE - 1);
  }

  if (n > 0.82) {
    ctx.globalAlpha = 0.18;
    drawSubtleCrack(ctx, sx, sy, palette.dark, n2);
  } else if (n < 0.12) {
    ctx.globalAlpha = 0.12;
    drawPebbleCluster(ctx, sx, sy, palette.light, palette.dark, n2);
  }

  if (tile.biome !== getFallbackVisualBiome(world, tile) && n2 > 0.55) {
    ctx.globalAlpha = 0.08;
    drawSoftStain(ctx, sx, sy, getBiomeAccentColor(tile.biome, palette), n);
  }

  if (theme === 'grave' && n2 > 0.84) {
    ctx.globalAlpha = 0.16;
    drawBoneOrCandleFleck(ctx, sx, sy, n);
  } else if (theme === 'thorn' && n2 > 0.74) {
    ctx.globalAlpha = 0.17;
    drawRootDetail(ctx, sx, sy, palette.dark, palette.light, n);
  } else if (theme === 'mine' && n2 > 0.78) {
    ctx.globalAlpha = 0.16;
    drawMineralFleck(ctx, sx, sy, palette.accent || palette.light, n);
  } else if (theme === 'cult' && n2 > 0.82) {
    ctx.globalAlpha = 0.14;
    drawCultScrawl(ctx, sx, sy);
  } else if (theme === 'holy' && n2 > 0.82) {
    ctx.globalAlpha = 0.12;
    drawSlabInset(ctx, sx, sy, palette.light);
  } else if (theme === 'cellar' && n2 > 0.78) {
    ctx.globalAlpha = 0.10;
    drawDampScuff(ctx, sx, sy, palette.dark, n);
  }
}

function drawTownFallbackTileDetail(ctx, tile, sx, sy, palette, n, n2) {
  if (tile.biome === 'wall') {
    if (n > 0.55) {
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = palette.light;
      ctx.lineWidth = 1;
      line(ctx, sx + 5, sy + 11, sx + 17, sy + 11);
      line(ctx, sx + 20, sy + 22, sx + 29, sy + 22);
    }
    return;
  }

  if (tile.biome === 'water') {
    drawFallbackWaterDetail(ctx, sx, sy, palette, n);
    return;
  }

  if (tile.biome === 'path') {
    if (n > 0.70) {
      ctx.globalAlpha = 0.11;
      drawDirtScuff(ctx, sx, sy, palette.dark, n2);
    } else if (n < 0.20) {
      ctx.globalAlpha = 0.12;
      drawPebbleCluster(ctx, sx, sy, palette.light, palette.dark, n2);
    }
    return;
  }

  if (tile.biome === 'ruin') {
    if (n > 0.50) {
      ctx.globalAlpha = 0.10;
      drawSlabInset(ctx, sx, sy, palette.dark);
    }
    if (n2 > 0.78) {
      ctx.globalAlpha = 0.16;
      drawSubtleCrack(ctx, sx, sy, palette.dark, n);
    }
    return;
  }

  if (tile.biome === 'grass' && n > 0.72) {
    ctx.globalAlpha = 0.18;
    drawGrassTuft(ctx, sx + 10 + Math.floor(n2 * 12), sy + 20, palette.light);
  }
}

function drawWorldFallbackTileDetail(ctx, tile, sx, sy, palette, n, n2) {
  if (tile.biome === 'water') {
    drawFallbackWaterDetail(ctx, sx, sy, palette, n);
    return;
  }

  if (tile.biome === 'grass' && n > 0.72) {
    ctx.globalAlpha = 0.18;
    drawGrassTuft(ctx, sx + 15, sy + 24, palette.light);
  } else if (tile.biome === 'path' && n < 0.24) {
    ctx.globalAlpha = 0.13;
    drawDirtScuff(ctx, sx, sy, palette.dark, n2);
  } else if (tile.biome === 'dead' && n > 0.66) {
    ctx.globalAlpha = 0.13;
    drawDeadAsh(ctx, sx, sy, palette.light, palette.dark);
  } else if ((tile.biome === 'ruin' || tile.biome === 'ore') && n > 0.62) {
    ctx.globalAlpha = 0.15;
    drawSubtleCrack(ctx, sx, sy, palette.dark, n2);
  }
}

function drawFallbackWaterDetail(ctx, sx, sy, palette, n) {
  if (n <= 0.32) return;

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = palette.light;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + 5, sy + 15);
  ctx.quadraticCurveTo(sx + 14, sy + 11, sx + 25, sy + 15);
  ctx.stroke();
}

function drawSoftStain(ctx, sx, sy, color, n) {
  ctx.fillStyle = color;
  roundedRect(
    ctx,
    sx + 7 + Math.floor(n * 5),
    sy + 8 + Math.floor(n * 4),
    12,
    7,
    4
  );
  ctx.fill();
}

function drawSubtleCrack(ctx, sx, sy, color, n) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const ox = Math.floor(n * 8);
  line(ctx, sx + 7 + ox, sy + 22, sx + 14 + ox, sy + 16);
  line(ctx, sx + 14 + ox, sy + 16, sx + 21 + ox, sy + 18);
  if (n > 0.56) line(ctx, sx + 14 + ox, sy + 16, sx + 12 + ox, sy + 10);
}

function drawPebbleCluster(ctx, sx, sy, lightColor, darkColor, n) {
  const ox = Math.floor(n * 14);
  ctx.fillStyle = darkColor;
  ctx.fillRect(sx + 7 + ox, sy + 18, 2, 2);
  ctx.fillStyle = lightColor;
  ctx.fillRect(sx + 13 + ox, sy + 21, 2, 1);
  ctx.fillRect(sx + 4 + Math.floor(n * 7), sy + 11, 1, 1);
}

function drawDirtScuff(ctx, sx, sy, color, n) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const ox = Math.floor(n * 8);
  line(ctx, sx + 7 + ox, sy + 12, sx + 21 + ox, sy + 13);
  line(ctx, sx + 5 + ox, sy + 20, sx + 15 + ox, sy + 21);
}

function drawSlabInset(ctx, sx, sy, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 5, sy + 5, TILE - 10, TILE - 10);
}

function drawBoneOrCandleFleck(ctx, sx, sy, n) {
  const candle = n > 0.62;
  if (candle) {
    ctx.fillStyle = '#d9cfae';
    ctx.fillRect(sx + 15, sy + 12, 2, 5);
    ctx.fillStyle = '#d9ad4f';
    ctx.fillRect(sx + 15, sy + 10, 2, 2);
    return;
  }

  ctx.strokeStyle = '#b8ad94';
  ctx.lineWidth = 1;
  line(ctx, sx + 11, sy + 19, sx + 19, sy + 17);
}

function drawRootDetail(ctx, sx, sy, darkColor, lightColor, n) {
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  const oy = Math.floor(n * 6);
  line(ctx, sx + 4, sy + 20 + oy, sx + 13, sy + 16 + oy);
  line(ctx, sx + 13, sy + 16 + oy, sx + 25, sy + 19 + oy);

  if (n > 0.58) {
    ctx.strokeStyle = lightColor;
    line(ctx, sx + 18, sy + 15 + oy, sx + 21, sy + 12 + oy);
  }
}

function drawMineralFleck(ctx, sx, sy, color, n) {
  ctx.fillStyle = color;
  ctx.fillRect(sx + 9 + Math.floor(n * 12), sy + 12, 2, 2);
  ctx.fillRect(sx + 17, sy + 22 - Math.floor(n * 5), 1, 2);
}

function drawCultScrawl(ctx, sx, sy) {
  ctx.strokeStyle = '#c2523f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(sx + 16, sy + 16, 7, 0.25, Math.PI * 1.35);
  ctx.stroke();
  line(ctx, sx + 16, sy + 9, sx + 18, sy + 17);
}

function drawDampScuff(ctx, sx, sy, color, n) {
  ctx.fillStyle = color;
  roundedRect(ctx, sx + 8, sy + 17, 12 + Math.floor(n * 5), 4, 3);
  ctx.fill();
}

function getBiomeAccentColor(biome, fallbackPalette) {
  if (biome === 'dead') return '#6d3d45';
  if (biome === 'grass') return '#3f6946';
  if (biome === 'path') return '#8f7651';
  if (biome === 'ore') return '#7f91a0';
  return fallbackPalette.accent || fallbackPalette.light || '#e3cef2';
}

// -----------------------------------------------------------------------------
// PATH GEOMETRY HELPERS
// -----------------------------------------------------------------------------

function drawSmoothPath(ctx, points) {
  if (!points || points.length < 2) return;

  ctx.beginPath();

  ctx.moveTo(points[0][0], points[0][1]);

  if (points.length === 2) {
    ctx.lineTo(points[1][0], points[1][1]);
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    const midX = (current[0] + next[0]) / 2;
    const midY = (current[1] + next[1]) / 2;

    ctx.quadraticCurveTo(current[0], current[1], midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
}

function screenPoints(points, camera) {
  return (points || []).map(point => [
    point[0] - camera.x,
    point[1] - camera.y
  ]);
}

function jitteredPoints(points, seed, amount = 5) {
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point;

    const nX = valueNoise(index, 0, seed) * 2 - 1;
    const nY = valueNoise(index, 9, seed) * 2 - 1;

    return [
      point[0] + nX * amount,
      point[1] + nY * amount
    ];
  });
}

function offsetPath(points, offset) {
  if (!points || points.length < 2) return points || [];

  const result = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];

    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];

    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    result.push([
      points[i][0] + nx * offset,
      points[i][1] + ny * offset
    ]);
  }

  return result;
}

function pathIntersectsViewport(points, width, camera, ctx) {
  if (!points?.length) return false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }

  const margin = (width || 80) + 180;

  return !(
    maxX < camera.x - margin ||
    maxY < camera.y - margin ||
    minX > camera.x + ctx.canvas.width + margin ||
    minY > camera.y + ctx.canvas.height + margin
  );
}

function ellipseIntersectsViewport(x, y, rx, ry, camera, ctx, margin = 80) {
  return !(
    x + rx < camera.x - margin ||
    y + ry < camera.y - margin ||
    x - rx > camera.x + ctx.canvas.width + margin ||
    y - ry > camera.y + ctx.canvas.height + margin
  );
}

// -----------------------------------------------------------------------------
// PALETTE / TILE HELPERS
// -----------------------------------------------------------------------------

export function getBiome(biomeId) {
  return BIOMES?.[biomeId] || {
    color: '#1f2f24',
    alt: '#263d2a',
    passable: true
  };
}

function getTerrainPalette(world, biomeId) {
  return getEnvironmentBiomePalette(world, biomeId, getBiomeVisualPalette(biomeId));
}

function getNeighborBiomes(world, x, y) {
  return {
    n: getBiomeAt(world, x, y - 1),
    s: getBiomeAt(world, x, y + 1),
    w: getBiomeAt(world, x - 1, y),
    e: getBiomeAt(world, x + 1, y),
    nw: getBiomeAt(world, x - 1, y - 1),
    ne: getBiomeAt(world, x + 1, y - 1),
    sw: getBiomeAt(world, x - 1, y + 1),
    se: getBiomeAt(world, x + 1, y + 1)
  };
}

function getBiomeAt(world, x, y) {
  return world?.tiles?.[y]?.[x]?.biome || null;
}

function drawSideBlend(ctx, sx, sy, side, depth) {
  if (side === 'n') {
    ctx.fillRect(sx, sy, TILE, depth);
    return;
  }

  if (side === 's') {
    ctx.fillRect(sx, sy + TILE - depth, TILE, depth);
    return;
  }

  if (side === 'w') {
    ctx.fillRect(sx, sy, depth, TILE);
    return;
  }

  if (side === 'e') {
    ctx.fillRect(sx + TILE - depth, sy, depth, TILE);
  }
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAWING
// -----------------------------------------------------------------------------

function isOnScreen(ctx, x, y, margin = 60) {
  return (
    x >= -margin &&
    y >= -margin &&
    x <= ctx.canvas.width + margin &&
    y <= ctx.canvas.height + margin
  );
}

function drawSubtleWorldVignette(ctx, edgeColor = 'rgba(0,0,0,0.16)') {
  const gradient = ctx.createRadialGradient(
    ctx.canvas.width / 2,
    ctx.canvas.height / 2,
    Math.min(ctx.canvas.width, ctx.canvas.height) * 0.25,
    ctx.canvas.width / 2,
    ctx.canvas.height / 2,
    Math.max(ctx.canvas.width, ctx.canvas.height) * 0.75
  );

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, edgeColor);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function valueNoise(x, y, seed = 'seed') {
  let h = hashString(seed);
  h ^= Math.floor(x) * 374761393;
  h ^= Math.floor(y) * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);

  return ((h >>> 0) % 10000) / 10000;
}

function smoothedTileNoise(x, y, seed = 'seed') {
  const center = valueNoise(x, y, seed);
  const north = valueNoise(x, y - 1, seed);
  const south = valueNoise(x, y + 1, seed);
  const west = valueNoise(x - 1, y, seed);
  const east = valueNoise(x + 1, y, seed);

  return center * 0.46 + (north + south + west + east) * 0.135;
}

function hashString(str) {
  let h = 2166136261;

  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const CARDINAL_SIDES = [
  { key: 'n' },
  { key: 's' },
  { key: 'w' },
  { key: 'e' }
];
