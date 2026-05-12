// combatVisualsRenderer.js
// Runalis combat visuals renderer.
//
// Responsibilities:
// - Weapon attack visuals.
// - Combat projectiles.
// - Ability projectiles.
// - Player action-state visuals.
// - World combat effects.
// - Necrotic Bolt visuals.
// - Vine Whip visuals.
//
// This module intentionally does NOT render:
// - Terrain.
// - World objects.
// - NPCs.
// - World drops.
// - Player body.
// - Enemy body.
// - Summon body.
// - Minimap.
// - Floating text.

import {
  getAttackVisual,
  getCombatProjectiles,
  playerIsDashing
} from './combat.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function drawCombatProjectiles(ctx, player, camera) {
  if (!ctx || !player || !camera) return;

  const projectiles = getCombatProjectiles(player) || [];

  for (const projectile of projectiles) {
    if (!projectile || projectile.alive === false) continue;

    const x = projectile.x - camera.x;
    const y = projectile.y - camera.y;

    if (!isOnScreen(ctx, x, y, 100)) continue;

    if (projectile.kind === 'necroticBolt') {
      drawNecroticBoltProjectile(ctx, projectile, x, y);
      continue;
    }

    if (projectile.kind === 'arrow' || projectile.kind === 'powerArrow') {
      drawArrowProjectile(ctx, projectile, x, y);
      continue;
    }

    drawGenericProjectile(ctx, projectile, x, y);
  }
}

export function drawAttackVisual(ctx, player, camera) {
  if (!ctx || !player || !camera) return;

  const visual = getAttackVisual(player);
  if (!visual) return;

  const x = player.x - camera.x;
  const y = player.y - camera.y;

  const move = visual.move;
  if (!move) return;

  const progress = Math.max(0, Math.min(1, visual.elapsed / visual.duration));
  const activeAlpha = visual.active ? 0.55 : 0.22;

  if (move.kind === 'arc') {
    drawAttackArc(ctx, x, y, visual.dirX, visual.dirY, move, progress, activeAlpha);
    return;
  }

  if (move.kind === 'line') {
    drawAttackLine(ctx, x, y, visual.dirX, visual.dirY, move, progress, activeAlpha);
    return;
  }

  if (move.kind === 'circle') {
    drawAttackCircle(ctx, x, y, move, progress, activeAlpha);
    return;
  }

  if (move.kind === 'projectile') {
    drawRangedWindup(ctx, x, y, visual.dirX, visual.dirY, move, progress, activeAlpha);
  }
}

export function drawActionStateVisuals(ctx, player, camera) {
  if (!ctx || !player || !camera) return;

  const p = screen(player, camera);
  const state = player.actionState || {};

  if (playerIsDashing(player)) {
    drawDashVisual(ctx, player, p.x, p.y);
  }

  if (state.blocking) {
    drawBlockVisual(ctx, player, p.x, p.y);
  }

  if (state.guardBroken) {
    drawGuardBreakVisual(ctx, p.x, p.y);
  }

  if (state.sprinting && !state.dashing) {
    drawSprintVisual(ctx, player, p.x, p.y);
  }
}

export function drawWorldEffects(ctx, world, camera, layer) {
  if (!ctx || !world || !camera) return;

  for (const fx of world.effects || []) {
    if (!fx) continue;

    const fxLayer = fx.layer || 'front';
    if (fxLayer !== layer) continue;

    drawEffect(ctx, fx, camera);
  }

  for (const fx of world.combatEffects || []) {
    if (!fx) continue;

    const fxLayer = fx.layer || 'front';
    if (fxLayer !== layer) continue;

    drawEffect(ctx, fx, camera);
  }
}

// -----------------------------------------------------------------------------
// PROJECTILES
// -----------------------------------------------------------------------------

function drawNecroticBoltProjectile(ctx, projectile, x, y) {
  const t = projectile.age || performance.now() / 1000;
  const pulse = 1 + Math.sin(t * 18) * 0.12;

  ctx.save();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = projectile.glowColor || 'rgba(182,140,255,0.24)';
  circle(ctx, x, y, 19 * pulse);

  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#5f2c80';
  circle(ctx, x, y, 12 * pulse);

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#b68cff';
  circle(ctx, x, y, 7 * pulse);

  ctx.fillStyle = '#f0dcff';
  circle(ctx, x - 2, y - 2, 3);

  ctx.strokeStyle = 'rgba(240,220,255,0.65)';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, 10 * pulse);

  ctx.restore();
}

function drawArrowProjectile(ctx, projectile, x, y) {
  const angle = Math.atan2(projectile.dirY || 0, projectile.dirX || 1);
  const power = projectile.kind === 'powerArrow';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = power ? 'rgba(255,204,102,0.35)' : 'rgba(217,173,79,0.35)';
  ctx.lineWidth = power ? 7 : 5;
  line(ctx, -16, 0, 9, 0);

  ctx.strokeStyle = power ? '#ffcc66' : '#d9ad4f';
  ctx.lineWidth = power ? 3 : 2;
  line(ctx, -13, 0, 10, 0);

  ctx.fillStyle = '#e8edf5';
  triangle(ctx, 11, 0, 4, -5, 4, 5);

  ctx.fillStyle = '#8b6a42';
  rect(ctx, -16, -2, 5, 4);

  ctx.restore();
}

function drawGenericProjectile(ctx, projectile, x, y) {
  ctx.save();

  ctx.fillStyle = projectile.color || '#d9ad4f';
  circle(ctx, x, y, projectile.radius || 5);

  ctx.globalAlpha = 0.25;
  circle(ctx, x, y, (projectile.radius || 5) + 7);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// WEAPON ATTACK VISUALS
// -----------------------------------------------------------------------------

function drawAttackArc(ctx, x, y, dirX, dirY, move, progress, alpha) {
  const angle = Math.atan2(dirY, dirX);
  const range = move.range || 46;
  const arc = degreesToRadians(move.arcDegrees || 70);
  const swingProgress = easeOutCubic(progress);

  const start = angle - arc / 2 + arc * 0.2 * swingProgress;
  const end = angle + arc / 2 + arc * 0.2 * swingProgress;

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = getMoveColor(move);
  ctx.lineWidth = move.comboType === 'heavy' ? 9 : 6;

  ctx.beginPath();
  ctx.arc(x, y, range, start, end);
  ctx.stroke();

  ctx.globalAlpha = Math.min(0.9, alpha + 0.18);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = move.comboType === 'heavy' ? 2 : 1;

  ctx.beginPath();
  ctx.arc(x, y, range - 4, start, end);
  ctx.stroke();

  if (move.comboType === 'heavy') {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = getMoveColor(move);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, start, end);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawAttackLine(ctx, x, y, dirX, dirY, move, progress, alpha) {
  const range = move.range || 60;
  const width = move.width || 24;
  const reach = range * easeOutCubic(progress);

  const endX = x + dirX * reach;
  const endY = y + dirY * reach;

  const sideX = -dirY;
  const sideY = dirX;

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = getMoveColor(move);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  line(ctx, x + dirX * 10, y + dirY * 10, endX, endY);

  ctx.globalAlpha = Math.min(0.9, alpha + 0.16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  line(ctx, x + sideX * 3, y + sideY * 3, endX + sideX * 3, endY + sideY * 3);

  ctx.restore();
}

function drawAttackCircle(ctx, x, y, move, progress, alpha) {
  const radius = move.radius || move.range || 42;
  const pulse = radius * (0.65 + easeOutCubic(progress) * 0.35);

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = getMoveColor(move);
  ctx.lineWidth = move.comboType === 'heavy' ? 8 : 5;
  circleStroke(ctx, x, y, pulse);

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = getMoveColor(move);
  circle(ctx, x, y, pulse);

  ctx.restore();
}

function drawRangedWindup(ctx, x, y, dirX, dirY, move, progress, alpha) {
  const length = 34 + progress * 12;
  const endX = x + dirX * length;
  const endY = y + dirY * length;

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 3;
  line(ctx, x + dirX * 12, y + dirY * 12, endX, endY);

  ctx.fillStyle = '#ffcc66';
  circle(ctx, endX, endY, 3);

  ctx.restore();
}

function getMoveColor(move) {
  if (!move) return '#e8edf5';

  if (move.id?.includes('scythe')) return '#b68cff';
  if (move.id?.includes('staff')) return '#73d18a';
  if (move.id?.includes('bow')) return '#d9ad4f';

  if (move.comboType === 'heavy') return '#ffcc66';

  return '#e8edf5';
}

// -----------------------------------------------------------------------------
// PLAYER ACTION-STATE VISUALS
// -----------------------------------------------------------------------------

function drawDashVisual(ctx, player, x, y) {
  const dirX = player.actionState?.dashDirX || player.dirX || 0;
  const dirY = player.actionState?.dashDirY || player.dirY || 1;

  ctx.save();

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#6fa8ef';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  for (let i = 1; i <= 3; i++) {
    line(
      ctx,
      x - dirX * i * 12,
      y - dirY * i * 12,
      x - dirX * (i * 12 + 10),
      y - dirY * (i * 12 + 10)
    );
  }

  ctx.restore();
}

function drawBlockVisual(ctx, player, x, y) {
  const dirX = player.dirX || 0;
  const dirY = player.dirY || 1;

  const shieldX = x + dirX * 18;
  const shieldY = y + dirY * 18 - 16;

  ctx.save();

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#73d18a';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(shieldX, shieldY, 18, Math.PI * 0.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#73d18a';
  circle(ctx, shieldX, shieldY, 18);

  ctx.restore();
}

function drawGuardBreakVisual(ctx, x, y) {
  ctx.save();

  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = '#ffcc66';
  ctx.lineWidth = 3;

  line(ctx, x - 13, y - 44, x - 3, y - 34);
  line(ctx, x + 3, y - 34, x + 13, y - 44);
  line(ctx, x - 10, y - 34, x + 10, y - 34);

  ctx.restore();
}

function drawSprintVisual(ctx, player, x, y) {
  const dirX = player.dirX || 0;
  const dirY = player.dirY || 1;

  ctx.save();

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  line(ctx, x - dirX * 13 - 5, y - dirY * 13 + 10, x - dirX * 28 - 5, y - dirY * 28 + 10);
  line(ctx, x - dirX * 13 + 5, y - dirY * 13 + 14, x - dirX * 28 + 5, y - dirY * 28 + 14);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// WORLD EFFECT ROUTER
// -----------------------------------------------------------------------------

function drawEffect(ctx, fx, camera) {
  const x = fx.x - camera.x;
  const y = fx.y - camera.y;

  if (!isOnScreen(ctx, x, y, 180)) return;

  const age = fx.age || 0;
  const ttl = Math.max(0.001, fx.ttl || 0.3);
  const t = clamp(age / ttl, 0, 1);
  const alpha = 1 - t;

  if (fx.kind === 'necroticCast') {
    drawNecroticCastEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'necroticTrail') {
    drawNecroticTrailEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'necroticImpact') {
    drawNecroticImpactEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'necroticFade') {
    drawNecroticFadeEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'vineWhip') {
    drawVineWhipEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'vineSegment') {
    drawVineSegmentEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'vineImpact') {
    drawVineImpactEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'burst') {
    drawBurstEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'slash' || fx.kind === 'heavySlash') {
    drawSlashEffect(ctx, x, y, fx, alpha);
    return;
  }

  if (fx.kind === 'hitSpark') {
    drawHitSparkEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  drawGenericEffect(ctx, x, y, fx, alpha);
}

// -----------------------------------------------------------------------------
// NECROTIC EFFECTS
// -----------------------------------------------------------------------------

function drawNecroticCastEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 18) * (0.7 + t * 0.5);

  ctx.save();

  ctx.globalAlpha = alpha * 0.28;
  ctx.fillStyle = 'rgba(182,140,255,0.45)';
  circle(ctx, x, y, radius + 10);

  ctx.globalAlpha = alpha * 0.68;
  ctx.strokeStyle = '#b68cff';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, radius);

  ctx.strokeStyle = '#f0dcff';
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, Math.max(3, radius * 0.55));

  ctx.restore();
}

function drawNecroticTrailEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 8) * (1 - t * 0.35);

  ctx.save();

  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = 'rgba(182,140,255,0.35)';
  circle(ctx, x, y, radius + 7);

  ctx.globalAlpha = alpha * 0.62;
  ctx.fillStyle = '#7d36a4';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#d8bdff';
  circle(ctx, x - 1, y - 1, Math.max(2, radius * 0.35));

  ctx.restore();
}

function drawNecroticImpactEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 24) * (0.25 + t * 1.05);

  ctx.save();

  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = 'rgba(182,140,255,0.42)';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = '#b68cff';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = '#f0dcff';
  ctx.lineWidth = 1;

  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + t * 2;
    line(
      ctx,
      x + Math.cos(a) * radius * 0.25,
      y + Math.sin(a) * radius * 0.25,
      x + Math.cos(a) * radius,
      y + Math.sin(a) * radius
    );
  }

  ctx.restore();
}

function drawNecroticFadeEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 13) * (1 + t * 0.6);

  ctx.save();

  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#b68cff';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = '#d8bdff';
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, radius + 3);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// VINE EFFECTS
// -----------------------------------------------------------------------------

function drawVineWhipEffect(ctx, fx, camera, alpha, t) {
  const sx = fx.x - camera.x;
  const sy = fx.y - camera.y;
  const ex = fx.endX - camera.x;
  const ey = fx.endY - camera.y;

  const dirX = fx.dirX || 1;
  const dirY = fx.dirY || 0;
  const sideX = -dirY;
  const sideY = dirX;

  const pull = easeOutCubic(t);
  const currentEndX = sx + (ex - sx) * Math.min(1, pull * 1.15);
  const currentEndY = sy + (ey - sy) * Math.min(1, pull * 1.15);

  ctx.save();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = 'rgba(115,209,138,0.42)';
  ctx.lineWidth = 20;
  drawWavyLine(ctx, sx, sy, currentEndX, currentEndY, sideX, sideY, 13, 3);

  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = '#2e572f';
  ctx.lineWidth = 10;
  drawWavyLine(ctx, sx, sy, currentEndX, currentEndY, sideX, sideY, 10, 3);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#73d18a';
  ctx.lineWidth = 5;
  drawWavyLine(ctx, sx, sy, currentEndX, currentEndY, sideX, sideY, 7, 3);

  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = '#b7f2a2';

  for (let i = 1; i <= 5; i++) {
    const p = i / 6;
    const wobble = Math.sin(p * Math.PI * 2.3 + t * 2) * 8;

    const px = sx + (currentEndX - sx) * p + sideX * wobble;
    const py = sy + (currentEndY - sy) * p + sideY * wobble;

    leafDiamond(ctx, px, py, 5 - p * 1.4, dirX, dirY);
  }

  ctx.restore();
}

function drawWavyLine(ctx, sx, sy, ex, ey, sideX, sideY, wobble, waves) {
  ctx.beginPath();
  ctx.moveTo(sx, sy);

  const segments = 12;

  for (let i = 1; i <= segments; i++) {
    const p = i / segments;
    const wave = Math.sin(p * Math.PI * waves) * wobble * (1 - p * 0.35);

    const x = sx + (ex - sx) * p + sideX * wave;
    const y = sy + (ey - sy) * p + sideY * wave;

    ctx.lineTo(x, y);
  }

  ctx.stroke();
}

function drawVineSegmentEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 8) * (1 - t * 0.28);

  ctx.save();

  ctx.globalAlpha = alpha * 0.36;
  ctx.fillStyle = 'rgba(115,209,138,0.25)';
  circle(ctx, x, y, radius + 8);

  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = '#2e572f';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#73d18a';
  circle(ctx, x - 1, y - 1, Math.max(2, radius * 0.45));

  ctx.restore();
}

function drawVineImpactEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 18) * (0.35 + t * 0.85);

  ctx.save();

  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = 'rgba(115,209,138,0.38)';
  circle(ctx, x, y, radius + 8);

  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = '#73d18a';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#2e572f';
  ctx.lineWidth = 3;

  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const inner = radius * 0.25;
    const outer = radius * 0.85;

    line(
      ctx,
      x + Math.cos(a) * inner,
      y + Math.sin(a) * inner,
      x + Math.cos(a + 0.3) * outer,
      y + Math.sin(a + 0.3) * outer
    );
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// GENERIC EFFECTS
// -----------------------------------------------------------------------------

function drawBurstEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 20) * (0.4 + t * 0.8);

  ctx.save();

  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = fx.color || '#ffcc66';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = fx.color || '#ffcc66';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, radius + 2);

  ctx.restore();
}

function drawSlashEffect(ctx, x, y, fx, alpha) {
  const dirX = fx.dirX || 1;
  const dirY = fx.dirY || 0;

  const sideX = -dirY;
  const sideY = dirX;

  ctx.save();

  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = fx.color || '#e8edf5';
  ctx.lineWidth = fx.kind === 'heavySlash' ? 7 : 4;
  ctx.lineCap = 'round';

  line(
    ctx,
    x - sideX * 16 - dirX * 6,
    y - sideY * 16 - dirY * 6,
    x + sideX * 16 + dirX * 6,
    y + sideY * 16 + dirY * 6
  );

  ctx.restore();
}

function drawHitSparkEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 10) * (1 + t * 0.4);

  ctx.save();

  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = fx.color || '#ffffff';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, radius + 3);

  ctx.restore();
}

function drawGenericEffect(ctx, x, y, fx, alpha) {
  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = fx.color || '#e8edf5';
  circle(ctx, x, y, fx.radius || 8);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// LOW-LEVEL HELPERS
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

function leafDiamond(ctx, x, y, r, dirX, dirY) {
  const sideX = -dirY;
  const sideY = dirX;

  ctx.beginPath();
  ctx.moveTo(x + dirX * r * 1.4, y + dirY * r * 1.4);
  ctx.lineTo(x + sideX * r, y + sideY * r);
  ctx.lineTo(x - dirX * r * 1.2, y - dirY * r * 1.2);
  ctx.lineTo(x - sideX * r, y - sideY * r);
  ctx.closePath();
  ctx.fill();
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

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function easeOutCubic(t) {
  const n = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - n, 3);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}