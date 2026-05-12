// render.js
// Runalis main renderer orchestration.
//
// This file should stay small compared to the old render.js.
//
// Split modules:
// - terrainRenderer.js handles terrain/tile rendering.
// - objectRenderer.js handles world objects, NPCs, resources, dungeon entrances, drops.
// - combatVisualsRenderer.js handles projectiles, attacks, action-state visuals, effects.
//
// This file still handles:
// - Render order.
// - Player body.
// - Enemy body.
// - Summon body.
// - Circular local minimap.
// - Floating text.

import { TILE } from './data.js';
import { drawHumanActor } from './humanRenderer.js';
import { drawSummonAsset } from './codeAssets.js';
import { drawFloatingTexts } from './floatingText.js';

import {
  getWorldWidth,
  getWorldHeight,
  getVisibleTileBounds,
  drawTiles
} from './terrainRenderer.js';

import {
  drawObjects,
  drawWorldDrops
} from './objectRenderer.js';

import {
  drawCombatProjectiles,
  drawAttackVisual,
  drawActionStateVisuals,
  drawWorldEffects
} from './combatVisualsRenderer.js';

// -----------------------------------------------------------------------------
// MAIN DRAW
// -----------------------------------------------------------------------------

export function draw(ctx, world, player, camera, options = {}) {
  if (!ctx || !world || !player || !camera) return;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;

  const bounds = getVisibleTileBounds(ctx, world, camera);

  drawTiles(ctx, world, camera, bounds);

  drawWorldEffects(ctx, world, camera, 'behind');

  drawObjects(ctx, world, camera);
  drawWorldDrops(ctx, world, camera);

  drawEnemies(ctx, world, camera);
  drawSummons(ctx, player, camera);

  drawCombatProjectiles(ctx, player, camera);

  drawPlayer(ctx, player, camera);
  drawAttackVisual(ctx, player, camera);
  drawActionStateVisuals(ctx, player, camera);

  drawWorldEffects(ctx, world, camera, 'front');

  drawFloatingTexts(ctx, player, camera);

  if (!options.hideHud) {
    drawCircularMinimap(ctx, world, player, camera);
  }
}

// -----------------------------------------------------------------------------
// PLAYER / SUMMONS
// -----------------------------------------------------------------------------

function drawPlayer(ctx, player, camera) {
  drawHumanActor(ctx, player, camera, {
    isPlayer: true,
    scale: 1.0,
    skin: player.skin || '#ffd1bd',
    hair: player.hair || '#0b0d12',
    shirt: player.shirt || '#f2a51f',
    pants: player.pants || '#293fba',
    boots: player.boots || '#3a2a22',
    classId: player.classId || null
  });

  const p = screen(player, camera);
  hp(ctx, p.x, p.y - 54, player.hp, player.maxHp);
}

function drawSummons(ctx, player, camera) {
  for (const summon of player.summons || []) {
    if (!summon || summon.alive === false) continue;

    const p = screen(summon, camera);
    if (!isOnScreen(ctx, p.x, p.y, 130)) continue;

    drawSummonAsset(ctx, summon, player, p.x, p.y);

    // Intentionally no summon HP bar.
  }
}

// -----------------------------------------------------------------------------
// ENEMIES
// -----------------------------------------------------------------------------

function drawEnemies(ctx, world, camera) {
  for (const enemy of world.enemies || []) {
    if (enemy && enemy.alive !== false && !enemy.remove) {
      drawEnemy(ctx, enemy, camera);
    }
  }
}

function drawEnemy(ctx, enemy, camera) {
  if (enemy.remove) return;

  const p = screen(enemy, camera);
  if (!isOnScreen(ctx, p.x, p.y, 130)) return;

  if (enemy.kind === 'ashWolf') {
    drawAshWolf(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'gravebound') {
    drawGraveboundKnight(ctx, enemy, p.x, p.y);
  } else {
    drawHollowling(ctx, enemy, p.x, p.y);
  }

  drawEnemyStatus(ctx, enemy, p.x, p.y);

  if (!enemy.dead && enemy.hp > 0) {
    hp(ctx, p.x, p.y - getEnemyHpOffset(enemy), enemy.hp, enemy.maxHp);
  }

  if (enemy.isBoss) {
    label(ctx, enemy.bossName || enemy.name || 'Elite', p.x, p.y - getEnemyHpOffset(enemy) - 10);
  }
}

function drawHollowling(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2.5) * 1.5;

  drawShadow(ctx, x + 2, y + 12, 16, 6);

  ctx.fillStyle = enemy.hitFlash > 0 ? '#c77b88' : '#6b3b43';
  roundedBody(ctx, x, y + bob, 15, 18);

  ctx.fillStyle = enemy.hitFlash > 0 ? '#e09aaa' : '#8a4a55';
  circle(ctx, x, y - 14 + bob, 11);

  ctx.fillStyle = '#25151b';
  rect(ctx, x - 7, y - 17 + bob, 14, 8);

  ctx.fillStyle = '#ff8c8c';
  rect(ctx, x - 5, y - 15 + bob, 3, 3);
  rect(ctx, x + 2, y - 15 + bob, 3, 3);

  ctx.strokeStyle = '#3c2228';
  ctx.lineWidth = 4;
  line(ctx, x - 11, y - 2 + bob, x - 20, y + 8 + bob);
  line(ctx, x + 11, y - 2 + bob, x + 20, y + 8 + bob);

  ctx.strokeStyle = '#a35a65';
  ctx.lineWidth = 2;
  line(ctx, x - 19, y + 8 + bob, x - 24, y + 5 + bob);
  line(ctx, x + 19, y + 8 + bob, x + 24, y + 5 + bob);
}

function drawAshWolf(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const run = Math.sin(t * 4) * 2.2;
  const lift = Math.sin(t * 2.5) * 0.8;
  const flash = enemy.hitFlash > 0;

  drawShadow(ctx, x + 4, y + 15, 24, 7);

  ctx.strokeStyle = flash ? '#8795a8' : '#242a32';
  ctx.lineWidth = 5;
  line(ctx, x - 18, y - 3 + lift, x - 35, y - 12 + lift);

  ctx.strokeStyle = flash ? '#b8c8dc' : '#56616f';
  ctx.lineWidth = 3;
  line(ctx, x - 17, y - 4 + lift, x - 32, y - 11 + lift);

  ctx.fillStyle = flash ? '#8795a8' : '#3f4853';
  poly(ctx, [
    [x - 19, y + 3 + lift],
    [x - 12, y - 9 + lift],
    [x + 8, y - 11 + lift],
    [x + 24, y - 4 + lift],
    [x + 20, y + 9 + lift],
    [x - 10, y + 11 + lift]
  ]);

  ctx.fillStyle = flash ? '#c2d2e4' : '#5f6c7a';
  poly(ctx, [
    [x - 12, y - 8 + lift],
    [x + 8, y - 10 + lift],
    [x + 21, y - 4 + lift],
    [x + 7, y - 2 + lift],
    [x - 11, y - 1 + lift]
  ]);

  ctx.fillStyle = flash ? '#a5b4c7' : '#4e5966';
  poly(ctx, [
    [x + 11, y - 10 + lift],
    [x + 24, y - 15 + lift],
    [x + 31, y - 5 + lift],
    [x + 21, y + 2 + lift]
  ]);

  ctx.fillStyle = flash ? '#c9d8e9' : '#667483';
  poly(ctx, [
    [x + 23, y - 17 + lift],
    [x + 39, y - 12 + lift],
    [x + 42, y - 4 + lift],
    [x + 33, y + 2 + lift],
    [x + 22, y - 2 + lift]
  ]);

  ctx.fillStyle = flash ? '#576173' : '#242a32';
  poly(ctx, [
    [x + 36, y - 9 + lift],
    [x + 47, y - 6 + lift],
    [x + 42, y + 0 + lift],
    [x + 34, y - 2 + lift]
  ]);

  ctx.fillStyle = '#11151a';
  rect(ctx, x + 44, y - 6 + lift, 4, 3);

  ctx.fillStyle = flash ? '#394150' : '#1f242c';
  triangle(ctx, x + 22, y - 17 + lift, x + 25, y - 30 + lift, x + 31, y - 16 + lift);
  triangle(ctx, x + 11, y - 11 + lift, x + 13, y - 25 + lift, x + 20, y - 12 + lift);

  ctx.fillStyle = '#ffcc66';
  rect(ctx, x + 31, y - 12 + lift, 3, 3);

  ctx.strokeStyle = flash ? '#576173' : '#222832';
  ctx.lineWidth = 4;
  line(ctx, x - 11, y + 8 + lift, x - 17, y + 22 + run);
  line(ctx, x - 2, y + 9 + lift, x - 5, y + 23 - run);
  line(ctx, x + 10, y + 9 + lift, x + 14, y + 23 - run);
  line(ctx, x + 19, y + 7 + lift, x + 24, y + 21 + run);

  ctx.fillStyle = '#1b2028';
  rect(ctx, x - 21, y + 21 + run, 8, 3);
  rect(ctx, x - 8, y + 22 - run, 8, 3);
  rect(ctx, x + 11, y + 22 - run, 8, 3);
  rect(ctx, x + 21, y + 20 + run, 8, 3);
}

function drawGraveboundKnight(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2) * 1;
  const flash = enemy.hitFlash > 0;

  drawShadow(ctx, x + 2, y + 14, 18, 6);

  ctx.fillStyle = flash ? '#8f82a0' : '#332b3a';
  rect(ctx, x - 11, y - 25 + bob, 22, 31);

  ctx.fillStyle = flash ? '#b3a7c2' : '#6e617b';
  rect(ctx, x - 9, y - 23 + bob, 18, 24);

  ctx.fillStyle = '#8a7d96';
  rect(ctx, x - 7, y - 21 + bob, 14, 4);

  ctx.fillStyle = flash ? '#9c90aa' : '#5b5265';
  rect(ctx, x - 7, y - 36 + bob, 14, 13);

  ctx.fillStyle = '#c9b37b';
  rect(ctx, x - 6, y - 31 + bob, 12, 2);

  ctx.fillStyle = '#16141a';
  rect(ctx, x - 5, y - 29 + bob, 10, 3);

  ctx.strokeStyle = '#c9b37b';
  ctx.lineWidth = 3;
  line(ctx, x + 12, y - 19 + bob, x + 26, y + 3 + bob);

  ctx.strokeStyle = '#3a2618';
  ctx.lineWidth = 4;
  line(ctx, x + 8, y - 22 + bob, x + 14, y - 15 + bob);

  ctx.fillStyle = flash ? '#8a8094' : '#4a4353';
  poly(ctx, [
    [x - 15, y - 18 + bob],
    [x - 24, y - 13 + bob],
    [x - 21, y - 1 + bob],
    [x - 14, y + 3 + bob]
  ]);

  ctx.strokeStyle = '#8a7d96';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#211d20';
  rect(ctx, x - 10, y + 4 + bob, 7, 4);
  rect(ctx, x + 3, y + 4 - bob, 7, 4);

  if (enemy.isBoss) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#b68cff';
    circle(ctx, x, y - 16 + bob, 30);
    ctx.restore();
  }
}

function drawEnemyStatus(ctx, enemy, x, y) {
  if ((enemy.slowTimer || 0) > 0 || (enemy.slowUntil || 0) > performance.now() / 1000) {
    ctx.strokeStyle = 'rgba(115,209,138,0.35)';
    ctx.lineWidth = 2;
    line(ctx, x - 18, y + 15, x + 18, y + 15);
  }

  if ((enemy.rootUntil || 0) > performance.now() / 1000) {
    ctx.strokeStyle = 'rgba(115,209,138,0.75)';
    ctx.lineWidth = 3;
    line(ctx, x - 14, y + 11, x + 14, y - 2);
    line(ctx, x + 14, y + 11, x - 14, y - 2);
  }
}

function getEnemyHpOffset(enemy) {
  if (enemy.kind === 'gravebound') return enemy.isBoss ? 52 : 43;
  if (enemy.kind === 'ashWolf') return 34;
  return 33;
}

// -----------------------------------------------------------------------------
// CIRCULAR LOCAL MINIMAP
// -----------------------------------------------------------------------------

function drawCircularMinimap(ctx, world, player, camera) {
  const radius = 82;
  const margin = 18;
  const cx = ctx.canvas.width - radius - margin;
  const cy = radius + margin;

  const worldW = getWorldWidth(world);
  const worldH = getWorldHeight(world);

  if (!worldW || !worldH) return;

  const visibleTilesX = Math.ceil(ctx.canvas.width / TILE);
  const visibleTilesY = Math.ceil(ctx.canvas.height / TILE);

  const localRadiusTiles = Math.max(
    28,
    Math.ceil(Math.max(visibleTilesX, visibleTilesY) * 0.85)
  );

  const playerTileX = Math.floor(player.x / TILE);
  const playerTileY = Math.floor(player.y / TILE);

  const startX = clamp(playerTileX - localRadiusTiles, 0, worldW - 1);
  const endX = clamp(playerTileX + localRadiusTiles, 0, worldW - 1);
  const startY = clamp(playerTileY - localRadiusTiles, 0, worldH - 1);
  const endY = clamp(playerTileY + localRadiusTiles, 0, worldH - 1);

  const rangeX = Math.max(1, endX - startX);
  const rangeY = Math.max(1, endY - startY);

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(139,166,214,0.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = 'rgba(5,8,14,0.92)';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  drawLocalMinimapTiles(
    ctx,
    world,
    cx,
    cy,
    radius,
    startX,
    startY,
    endX,
    endY,
    rangeX,
    rangeY
  );

  drawLocalMinimapObjects(
    ctx,
    world,
    cx,
    cy,
    radius,
    startX,
    startY,
    rangeX,
    rangeY
  );

  drawLocalMinimapEnemies(
    ctx,
    world,
    cx,
    cy,
    radius,
    startX,
    startY,
    rangeX,
    rangeY
  );

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);

  ctx.strokeStyle = '#11151a';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 2, cy - 2, 4, 4);

  const dirX = player.dirX || 0;
  const dirY = player.dirY || 1;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  line(ctx, cx, cy, cx + dirX * 10, cy + dirY * 10);

  ctx.restore();

  ctx.save();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8edf5';
  ctx.fillText(world.mode === 'dungeon' ? 'Dungeon' : 'Local Map', cx, cy - radius - 10);

  ctx.restore();
}

function drawLocalMinimapTiles(ctx, world, cx, cy, radius, startX, startY, endX, endY, rangeX, rangeY) {
  const tilePixelW = (radius * 2) / Math.max(1, rangeX);
  const tilePixelH = (radius * 2) / Math.max(1, rangeY);

  const step = Math.max(1, Math.ceil(Math.max(rangeX, rangeY) / 90));

  for (let ty = startY; ty <= endY; ty += step) {
    for (let tx = startX; tx <= endX; tx += step) {
      const tile = world.tiles[ty]?.[tx];
      if (!tile) continue;

      const px = cx - radius + ((tx - startX) / rangeX) * radius * 2;
      const py = cy - radius + ((ty - startY) / rangeY) * radius * 2;

      ctx.fillStyle = minimapBiomeColor(tile.biome);
      ctx.fillRect(
        Math.floor(px),
        Math.floor(py),
        Math.max(1, Math.ceil(tilePixelW * step)),
        Math.max(1, Math.ceil(tilePixelH * step))
      );
    }
  }
}

function drawLocalMinimapObjects(ctx, world, cx, cy, radius, startX, startY, rangeX, rangeY) {
  for (const object of world.objects || []) {
    if (!object || object.depleted) continue;

    const tileX = object.x / TILE;
    const tileY = object.y / TILE;

    if (tileX < startX || tileY < startY || tileX > startX + rangeX || tileY > startY + rangeY) {
      continue;
    }

    const px = cx - radius + ((tileX - startX) / rangeX) * radius * 2;
    const py = cy - radius + ((tileY - startY) / rangeY) * radius * 2;

    if (object.kind === 'dungeonEntrance') {
      ctx.fillStyle = '#b68cff';
      diamond(ctx, px, py, 4);
      continue;
    }

    if (object.kind === 'dungeonExit') {
      ctx.fillStyle = '#73d18a';
      diamond(ctx, px, py, 4);
      continue;
    }

    if (object.kind === 'npc') {
      ctx.fillStyle = object.classId ? classColor(object.classId) : '#d9ad4f';
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      continue;
    }

    if (object.kind === 'campfire') {
      ctx.fillStyle = '#ffcc66';
      ctx.fillRect(px - 1, py - 1, 2, 2);
      continue;
    }

    if (object.kind === 'shrine') {
      ctx.fillStyle = '#e2ccff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }
}

function drawLocalMinimapEnemies(ctx, world, cx, cy, radius, startX, startY, rangeX, rangeY) {
  for (const enemy of world.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const tileX = enemy.x / TILE;
    const tileY = enemy.y / TILE;

    if (tileX < startX || tileY < startY || tileX > startX + rangeX || tileY > startY + rangeY) {
      continue;
    }

    const px = cx - radius + ((tileX - startX) / rangeX) * radius * 2;
    const py = cy - radius + ((tileY - startY) / rangeY) * radius * 2;

    ctx.fillStyle = enemy.isBoss ? '#ffcc66' : '#ef6f6c';
    ctx.fillRect(px - 1, py - 1, enemy.isBoss ? 4 : 2, enemy.isBoss ? 4 : 2);
  }
}

function minimapBiomeColor(biomeId) {
  if (biomeId === 'water') return '#263b54';
  if (biomeId === 'path') return '#8b6a42';
  if (biomeId === 'dead') return '#3d2d2d';
  if (biomeId === 'ruin') return '#55505a';
  if (biomeId === 'grass') return '#2f5b36';
  if (biomeId === 'wall') return '#171923';
  if (biomeId === 'ore') return '#333b43';

  return '#263d2a';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAWING HELPERS
// -----------------------------------------------------------------------------

function screen(object, camera) {
  return {
    x: object.x - camera.x,
    y: object.y - camera.y
  };
}

function isOnScreen(ctx, x, y, margin = 60) {
  return (
    x >= -margin &&
    y >= -margin &&
    x <= ctx.canvas.width + margin &&
    y <= ctx.canvas.height + margin
  );
}

function hp(ctx, x, y, value, max) {
  const safeMax = Math.max(1, max || 1);
  const pct = Math.max(0, Math.min(1, (value || 0) / safeMax));

  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(Math.round(x - 18), Math.round(y), 36, 5);

  ctx.fillStyle = '#ef6f6c';
  ctx.fillRect(Math.round(x - 18), Math.round(y), Math.round(36 * pct), 5);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(x - 18), Math.round(y), 36, 5);
}

function label(ctx, text, x, y) {
  if (!text) return;

  ctx.save();

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0,0,0,.75)';
  ctx.fillText(text, x + 1, y + 1);

  ctx.fillStyle = '#e8edf5';
  ctx.fillText(text, x, y);

  ctx.restore();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

function circleStroke(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.lineTo(Math.round(x3), Math.round(y3));
  ctx.closePath();
  ctx.fill();
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function poly(ctx, points) {
  if (!points?.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function diamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y - r));
  ctx.lineTo(Math.round(x + r), Math.round(y));
  ctx.lineTo(Math.round(x), Math.round(y + r));
  ctx.lineTo(Math.round(x - r), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

function drawShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundedBody(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function classColor(classId) {
  if (classId === 'templar') return '#ffcc66';
  if (classId === 'mercenary') return '#73d18a';
  if (classId === 'necromancer') return '#b68cff';
  if (classId === 'thornbinder') return '#6fae72';

  return '#d9ad4f';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}