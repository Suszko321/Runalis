import { drawLexiconFrame } from './lexiconPresentation.js';
// presentationRenderer.js
// Final screen-space cohesion layer for Runalis.
//
// This module adds restrained ambient motion, combat framing, and boss
// presentation without changing gameplay state or allocating particle arrays.

import {
  getClassVisualPalette,
  getEffectVisualPalette,
  steppedSine
} from './visualStyle.js';
import { getEnvironmentVisualProfile } from './environmentVisualStyle.js';

const THREAT_CACHE = new WeakMap();

export function drawPresentationBack(ctx, world, player, camera, options = {}) {
  if (!ctx || !world || !player || !camera) return;

  const view = getView(ctx, options);
  const profile = getEnvironmentVisualProfile(world);
  const threat = getThreatState(world, player);

  drawAmbientMotes(ctx, profile, view);

  if (threat.count > 0) {
    drawCombatGroundFocus(ctx, player, camera, threat, getClassVisualPalette(player.classId));
  }
}

export function drawPresentationFront(ctx, world, player, camera, options = {}) {
  if (!ctx || !world || !player || !camera) return;

  const view = getView(ctx, options);
  const threat = getThreatState(world, player);
  const hpPct = Math.max(0, Math.min(1, (player.hp || 0) / Math.max(1, player.maxHp || 1)));

  if (threat.count > 0 || hpPct < 0.34) {
    drawDangerFrame(ctx, view, threat, hpPct);
  }

  if (threat.boss) {
    drawBossBanner(ctx, threat.boss, view);
  }

  drawPoiArrival(ctx, player, view);
  drawPoiTransitionText(ctx, player, view);
}

function drawPoiArrival(ctx, player, view) {
  const card = player?.poiArrival;
  if (!card) return;

  const now = globalThis.performance?.now?.() || Date.now();
  const elapsed = now - Number(card.shownAt || 0);
  const duration = Number(card.duration || 4200);
  if (elapsed < 0 || elapsed > duration) return;

  const fade = Math.min(1, elapsed / 320, (duration - elapsed) / 620);
  const width = Math.min(520, Math.max(300, view.width * 0.42));
  const x = Math.round((view.width - width) / 2);
  const y = Math.max(68, Math.round(view.height * 0.12));

  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.fillStyle = 'rgba(5, 7, 9, 0.74)';
  drawLexiconFrame(ctx, x, y, width, 92, true);
  ctx.strokeStyle = '#9f7a38';
  ctx.lineWidth = 1;
  line(ctx, x + 18, y + 8, x + width - 18, y + 8);
  line(ctx, x + 18, y + 83, x + width - 18, y + 83);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f3e2aa';
  ctx.font = '600 20px RunalisDisplay, Georgia';
  ctx.fillText(card.name || 'Unknown Location', view.width / 2, y + 32);
  ctx.fillStyle = '#d6d9de';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`${card.type || 'Location'}  |  ${card.danger || 'Uncharted'}`, view.width / 2, y + 51);
  ctx.fillStyle = '#aeb6c4';
  ctx.font = '11px sans-serif';
  ctx.fillText(card.subtitle || '', view.width / 2, y + 70);
  ctx.restore();
}

function drawPoiTransitionText(ctx, player, view) {
  const cue = player?.poiTransitionText;
  if (!cue) return;

  const now = globalThis.performance?.now?.() || Date.now();
  const elapsed = now - Number(cue.shownAt || 0);
  if (elapsed < 0 || elapsed > Number(cue.duration || 1200)) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, (Number(cue.duration || 1200) - elapsed) / 280);
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px sans-serif';
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4;
  ctx.strokeText(cue.text || '', view.width / 2, view.height * 0.72);
  ctx.fillStyle = cue.color || '#f3e2aa';
  ctx.fillText(cue.text || '', view.width / 2, view.height * 0.72);
  ctx.restore();
}

function drawAmbientMotes(ctx, profile, view) {
  const time = (globalThis.performance?.now?.() || 0) / 1000;
  const count = profile.id === 'hearthmere' ? 9 : 14;

  ctx.save();
  ctx.fillStyle = profile.accent;

  for (let i = 0; i < count; i++) {
    const phase = i * 1.731;
    const x = positiveModulo(i * 173 + time * (5 + i % 3), view.width + 120) - 60;
    const yBase = positiveModulo(i * 97, view.height + 80) - 40;
    const y = yBase + steppedSine(time, 0.8 + i * 0.07, 8 + i % 4, 5, phase);
    const size = i % 5 === 0 ? 2 : 1;

    ctx.globalAlpha = profile.id === 'eldritch'
      ? 0.12 + (i % 3) * 0.025
      : 0.06 + (i % 4) * 0.018;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);

    if (i % 4 === 0) {
      ctx.globalAlpha *= 0.42;
      ctx.fillRect(Math.round(x - 3), Math.round(y), size + 6, 1);
    }
  }

  ctx.restore();
}

function drawCombatGroundFocus(ctx, player, camera, threat, palette) {
  const x = Math.round(player.x - camera.x);
  const y = Math.round(player.y - camera.y + 18);
  const time = (globalThis.performance?.now?.() || 0) / 1000;
  const pulse = steppedSine(time, 4.6, 2, 8);
  const radiusX = 25 + pulse + Math.min(8, threat.count);
  const radiusY = 9 + pulse * 0.25;

  ctx.save();
  ctx.strokeStyle = threat.boss ? getEffectVisualPalette('hostile').light : palette.effect;
  ctx.lineWidth = threat.boss ? 2 : 1;
  ctx.globalAlpha = threat.boss ? 0.34 : 0.22;

  for (let i = 0; i < 4; i++) {
    const angle = i / 4 * Math.PI * 2 + time * 0.3;
    const sx = x + Math.cos(angle) * radiusX;
    const sy = y + Math.sin(angle) * radiusY;
    const tx = x + Math.cos(angle) * (radiusX + 7);
    const ty = y + Math.sin(angle) * (radiusY + 3);
    line(ctx, sx, sy, tx, ty);
  }

  ctx.restore();
}

function drawDangerFrame(ctx, view, threat, hpPct) {
  const danger = getEffectVisualPalette('hostile');
  const boss = !!threat.boss;
  const lowHealth = hpPct < 0.34;
  const intensity = Math.min(0.24, (boss ? 0.12 : 0.045 + threat.count * 0.012) + (lowHealth ? (0.34 - hpPct) * 0.34 : 0));
  const depth = boss ? 48 : 32;

  ctx.save();
  ctx.fillStyle = danger.shadow;
  ctx.globalAlpha = intensity;

  ctx.fillRect(0, 0, view.width, depth);
  ctx.fillRect(0, view.height - depth, view.width, depth);
  ctx.fillRect(0, depth, depth, view.height - depth * 2);
  ctx.fillRect(view.width - depth, depth, depth, view.height - depth * 2);

  if (boss) {
    ctx.globalAlpha = 0.56;
    ctx.strokeStyle = danger.base;
    ctx.lineWidth = 2;
    drawCornerBrackets(ctx, view.width, view.height, 24, 38);
  }

  ctx.restore();
}

function drawBossBanner(ctx, boss, view) {
  const width = Math.min(440, Math.max(240, view.width * 0.42));
  const x = Math.round((view.width - width) / 2);
  const y = 18;
  const hpPct = Math.max(0, Math.min(1, (boss.hp || 0) / Math.max(1, boss.maxHp || 1)));
  const name = boss.bossName || boss.name || 'Runalis Warden';
  const danger = getEffectVisualPalette('hostile');

  ctx.save();

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#08090d';
  polygon(ctx, [
    [x + 13, y],
    [x + width - 13, y],
    [x + width, y + 13],
    [x + width - 9, y + 43],
    [x + 9, y + 43],
    [x, y + 13]
  ]);

  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = '#9f7a38';
  ctx.lineWidth = 1;
  line(ctx, x + 13, y + 42, x + width - 13, y + 42);
  line(ctx, x + 22, y + 7, x + width - 22, y + 7);

  ctx.globalAlpha = 1;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#050609';
  ctx.fillText(name, view.width / 2 + 1, y + 20);
  ctx.fillStyle = '#edf0f2';
  ctx.fillText(name, view.width / 2, y + 19);

  const barX = x + 24;
  const barY = y + 27;
  const barWidth = width - 48;
  ctx.fillStyle = '#181014';
  ctx.fillRect(barX, barY, barWidth, 7);
  ctx.fillStyle = danger.shadow;
  ctx.fillRect(barX + 1, barY + 1, barWidth - 2, 5);
  ctx.fillStyle = danger.base;
  ctx.fillRect(barX + 1, barY + 1, Math.round((barWidth - 2) * hpPct), 5);
  ctx.fillStyle = danger.light;
  ctx.globalAlpha = 0.62;
  ctx.fillRect(barX + 1, barY + 1, Math.round((barWidth - 2) * hpPct), 1);

  ctx.restore();
}

function getThreatState(world, player) {
  const now = globalThis.performance?.now?.() || 0;
  const cached = THREAT_CACHE.get(player);
  if (cached?.world === world && now - cached.stamp < 24) return cached.state;

  let count = 0;
  let boss = null;
  let bossDistance = Infinity;

  for (const enemy of world.enemies || []) {
    if(enemy?.malakarSolo&&world.dungeonState?.malakar?.mode!=='active')continue;
    if (!enemy || enemy.alive === false || enemy.dead || enemy.remove || (enemy.hp || 0) <= 0) continue;

    const dx = (enemy.x || 0) - (player.x || 0);
    const dy = (enemy.y || 0) - (player.y || 0);
    const distance = Math.hypot(dx, dy);
    const active = enemy.awakened || enemy.aggro || enemy.alerted || enemy.combatTargetId || enemy.telegraph;

    if (active && distance < 620) count++;

    if ((enemy.isBoss || enemy.worldBoss || enemy.bossName) && active && distance < 820 && distance < bossDistance) {
      boss = enemy;
      bossDistance = distance;
    }
  }

  const state = { count, boss };
  THREAT_CACHE.set(player, { world, stamp: now, state });
  return state;
}

function getView(ctx, options) {
  return {
    width: Math.max(1, options.viewport?.width || ctx.canvas.width),
    height: Math.max(1, options.viewport?.height || ctx.canvas.height)
  };
}

function drawCornerBrackets(ctx, width, height, inset, length) {
  line(ctx, inset, inset, inset + length, inset);
  line(ctx, inset, inset, inset, inset + length);
  line(ctx, width - inset, inset, width - inset - length, inset);
  line(ctx, width - inset, inset, width - inset, inset + length);
  line(ctx, inset, height - inset, inset + length, height - inset);
  line(ctx, inset, height - inset, inset, height - inset - length);
  line(ctx, width - inset, height - inset, width - inset - length, height - inset);
  line(ctx, width - inset, height - inset, width - inset, height - inset - length);
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }
  ctx.closePath();
  ctx.fill();
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
