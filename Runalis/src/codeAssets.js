// codeAssets.js
// Runalis code-drawn asset library.
// All summons, evolution stages, class gear overlays, and weapons are canvas code.
// No PNGs. No spritesheets.
//
// Updated:
// - Fixes scythe blade orientation for all directions.
// - Replaces unreliable mirrored arc scythe blade with facing-specific curve strokes.
// - Keeps summon evolution visuals.
// - Keeps gear visuals driven by equipped item IDs only.
// - ClassId should NOT force armour to appear.

import { ITEMS } from './data.js';

// -----------------------------------------------------------------------------
// SUMMON EVOLUTION HELPERS
// -----------------------------------------------------------------------------

export function getSummonEvolutionStage(kind, player) {
  const level = getRelevantSummonLevel(kind, player);

  if (isNecroSummonKind(kind)) {
    if (level >= 60) return 'lichLord';
    if (level >= 35) return 'lich';
    if (level >= 15) return 'skeletalKnight';
    return 'skeletonServant';
  }

  if (isThornSummonKind(kind)) {
    if (level >= 60) return 'thornTitan';
    if (level >= 35) return 'elderThornbeast';
    if (level >= 15) return 'thornbeast';
    return 'thornling';
  }

  return kind || 'unknown';
}

export function getSummonAssetHpOffset(kind, player) {
  const stage = getSummonEvolutionStage(kind, player);

  if (stage === 'lichLord') return 74;
  if (stage === 'lich') return 58;
  if (stage === 'skeletalKnight') return 56;
  if (stage === 'skeletonServant') return 50;

  if (stage === 'thornTitan') return 82;
  if (stage === 'elderThornbeast') return 72;
  if (stage === 'thornbeast') return 62;
  if (stage === 'thornling') return 48;

  return 30;
}

function getRelevantSummonLevel(kind, player) {
  const skills = player?.skillState?.skills || {};

  if (isNecroSummonKind(kind)) {
    return skills.spirit?.level || player?.classLevel || 1;
  }

  if (isThornSummonKind(kind)) {
    return skills.warding?.level || player?.classLevel || 1;
  }

  return 1;
}

function isNecroSummonKind(kind) {
  return [
    'lich',
    'skeleton',
    'skeletonServant',
    'skeletalKnight',
    'lichLord',
    'necromancerSummon'
  ].includes(kind);
}

function isThornSummonKind(kind) {
  return [
    'thornbeast',
    'thornling',
    'elderThornbeast',
    'thornTitan',
    'thornbinderSummon'
  ].includes(kind);
}

// -----------------------------------------------------------------------------
// SUMMON ENTRY POINT
// -----------------------------------------------------------------------------

export function drawSummonAsset(ctx, summon, player, x, y) {
  const stage = summon.evolutionStage || getSummonEvolutionStage(summon.kind, player);

  if (
    isNecroSummonKind(summon.kind) ||
    ['skeletonServant', 'skeletalKnight', 'lich', 'lichLord'].includes(stage)
  ) {
    drawNecromancerSummon(ctx, stage, summon, x, y);
    return;
  }

  if (
    isThornSummonKind(summon.kind) ||
    ['thornling', 'thornbeast', 'elderThornbeast', 'thornTitan'].includes(stage)
  ) {
    drawThornSummon(ctx, stage, summon, x, y);
    return;
  }

  drawSpectralHandAsset(ctx, summon, x, y);
}

// -----------------------------------------------------------------------------
// NECROMANCER SUMMON EVOLUTION
// -----------------------------------------------------------------------------

function drawNecromancerSummon(ctx, stage, summon, x, y) {
  if (stage === 'lichLord') {
    drawLichLord(ctx, summon, x, y);
  } else if (stage === 'lich') {
    drawLich(ctx, summon, x, y);
  } else if (stage === 'skeletalKnight') {
    drawSkeletalKnight(ctx, summon, x, y);
  } else {
    drawSkeletonServant(ctx, summon, x, y);
  }
}

function drawSkeletonServant(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.4) * 1.2;
  const step = Math.sin(t * 4.2) * 2;

  shadow(ctx, x, y + 15, 17, 5);

  fill(ctx, '#d9cfb8');
  rect(ctx, x - 10, y - 42 + bob, 20, 18);
  rect(ctx, x - 7, y - 45 + bob, 14, 4);

  fill(ctx, '#efe6d0');
  rect(ctx, x - 7, y - 41 + bob, 5, 4);
  rect(ctx, x + 2, y - 41 + bob, 5, 4);

  fill(ctx, '#16130f');
  rect(ctx, x - 6, y - 36 + bob, 4, 5);
  rect(ctx, x + 3, y - 36 + bob, 4, 5);
  rect(ctx, x - 2, y - 30 + bob, 4, 4);

  fill(ctx, '#c7bba5');
  rect(ctx, x - 3, y - 24 + bob, 6, 5);

  fill(ctx, '#d9cfb8');
  rect(ctx, x - 8, y - 20 + bob, 16, 4);
  rect(ctx, x - 7, y - 14 + bob, 14, 3);
  rect(ctx, x - 6, y - 8 + bob, 12, 3);

  stroke(ctx, '#d9cfb8', 3);
  line(ctx, x - 8, y - 20 + bob, x - 11, y - 2 + bob);
  line(ctx, x + 8, y - 20 + bob, x + 11, y - 2 + bob);
  line(ctx, x, y - 20 + bob, x, y + 2 + bob);

  fill(ctx, '#4b255d');
  rect(ctx, x - 8, y + 0 + bob, 16, 10);
  fill(ctx, '#7d36a4');
  rect(ctx, x - 4, y + 0 + bob, 8, 12);

  stroke(ctx, '#c7bba5', 4);
  line(ctx, x - 11, y - 18 + bob, x - 22, y - 5 + bob);
  line(ctx, x + 11, y - 18 + bob, x + 22, y - 5 + bob);

  stroke(ctx, '#d9cfb8', 3);
  line(ctx, x - 22, y - 5 + bob, x - 19, y + 8 + bob);
  line(ctx, x + 22, y - 5 + bob, x + 19, y + 8 + bob);

  stroke(ctx, '#c7bba5', 4);
  line(ctx, x - 5, y + 9 + bob, x - 10, y + 25 + step);
  line(ctx, x + 5, y + 9 + bob, x + 11, y + 25 - step);

  fill(ctx, '#c7bba5');
  rect(ctx, x - 14, y + 24 + step, 9, 3);
  rect(ctx, x + 7, y + 24 - step, 9, 3);

  stroke(ctx, '#bfc4c8', 3);
  line(ctx, x - 24, y + 0 + bob, x - 31, y + 13 + bob);
  stroke(ctx, '#7f858a', 2);
  line(ctx, x - 31, y + 13 + bob, x - 25, y + 18 + bob);
}

function drawSkeletalKnight(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.2) * 1;

  drawSkeletonServant(ctx, summon, x, y);

  fill(ctx, '#60666a');
  rect(ctx, x - 12, y - 48 + bob, 24, 7);
  rect(ctx, x - 9, y - 53 + bob, 18, 5);

  fill(ctx, '#35383c');
  rect(ctx, x - 4, y - 55 + bob, 8, 3);

  fill(ctx, '#6b7074');
  rect(ctx, x - 18, y - 22 + bob, 8, 6);
  rect(ctx, x + 10, y - 22 + bob, 8, 6);

  fill(ctx, '#4f565b');
  rect(ctx, x + 22, y - 18 + bob, 14, 22);
  stroke(ctx, '#c7bba5', 2);
  rectStroke(ctx, x + 22, y - 18 + bob, 14, 22);

  stroke(ctx, '#bfc4c8', 4);
  line(ctx, x - 26, y - 12 + bob, x - 37, y + 15 + bob);
  stroke(ctx, '#61422b', 3);
  line(ctx, x - 23, y - 7 + bob, x - 29, y + 1 + bob);
}

function drawLich(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.8;

  shadow(ctx, x, y + 17, 19, 6);

  fill(ctx, '#1f1629');
  poly(ctx, [
    [x - 17, y - 31 + bob],
    [x + 17, y - 31 + bob],
    [x + 22, y + 17 + bob],
    [x + 8, y + 8 + bob],
    [x, y + 21 + bob],
    [x - 8, y + 8 + bob],
    [x - 22, y + 17 + bob]
  ]);

  fill(ctx, '#4b255d');
  poly(ctx, [
    [x - 10, y - 25 + bob],
    [x + 10, y - 25 + bob],
    [x + 13, y + 10 + bob],
    [x, y + 17 + bob],
    [x - 13, y + 10 + bob]
  ]);

  fill(ctx, '#111018');
  rect(ctx, x - 14, y - 47 + bob, 28, 20);
  rect(ctx, x - 10, y - 52 + bob, 20, 6);

  fill(ctx, '#d9cfb8');
  rect(ctx, x - 8, y - 43 + bob, 16, 13);

  fill(ctx, '#16130f');
  rect(ctx, x - 6, y - 39 + bob, 4, 4);
  rect(ctx, x + 2, y - 39 + bob, 4, 4);
  rect(ctx, x - 2, y - 34 + bob, 4, 3);

  fill(ctx, '#a833ff');
  rect(ctx, x - 5, y - 38 + bob, 2, 2);
  rect(ctx, x + 4, y - 38 + bob, 2, 2);

  stroke(ctx, '#8b6f4e', 4);
  line(ctx, x + 20, y - 32 + bob, x + 29, y + 18 + bob);

  fill(ctx, '#a833ff');
  circle(ctx, x + 18, y - 36 + bob, 5);
  glow(ctx, x + 18, y - 36 + bob, 14, 'rgba(168,51,255,0.18)');
}

function drawLichLord(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2) * 1.6;

  drawLich(ctx, summon, x, y);

  fill(ctx, '#9c8a61');
  rect(ctx, x - 14, y - 58 + bob, 28, 5);
  rect(ctx, x - 13, y - 68 + bob, 5, 10);
  rect(ctx, x - 2, y - 70 + bob, 5, 12);
  rect(ctx, x + 9, y - 68 + bob, 5, 10);

  fill(ctx, '#a833ff');
  rect(ctx, x - 1, y - 66 + bob, 3, 3);

  stroke(ctx, '#7d36a4', 3);
  line(ctx, x - 21, y - 17 + bob, x - 29, y + 20 + bob);
  line(ctx, x + 21, y - 17 + bob, x + 29, y + 20 + bob);

  fill(ctx, 'rgba(168,51,255,0.75)');
  rect(ctx, x - 34, y - 20 + bob, 3, 3);
  rect(ctx, x + 34, y - 7 + bob, 2, 2);
  rect(ctx, x + 28, y - 34 + bob, 2, 2);
}

// -----------------------------------------------------------------------------
// THORNBINDER SUMMON EVOLUTION
// -----------------------------------------------------------------------------

function drawThornSummon(ctx, stage, summon, x, y) {
  if (stage === 'thornTitan') {
    drawThornTitan(ctx, summon, x, y);
  } else if (stage === 'elderThornbeast') {
    drawElderThornbeast(ctx, summon, x, y);
  } else if (stage === 'thornbeast') {
    drawThornbeastAsset(ctx, summon, x, y, 1);
  } else {
    drawThornling(ctx, summon, x, y);
  }
}

function drawThornling(ctx, summon, x, y) {
  drawThornbeastAsset(ctx, summon, x, y + 6, 0.68);
}

function drawElderThornbeast(ctx, summon, x, y) {
  drawThornbeastAsset(ctx, summon, x, y - 4, 1.28);

  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.2;

  fill(ctx, '#e2403c');
  triangle(ctx, x - 18, y - 3 + bob, x - 31, y - 12 + bob, x - 17, y - 15 + bob);
  triangle(ctx, x + 18, y + 0 + bob, x + 33, y - 7 + bob, x + 19, y - 13 + bob);
}

function drawThornTitan(ctx, summon, x, y) {
  drawThornbeastAsset(ctx, summon, x, y - 10, 1.55);

  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.1;

  stroke(ctx, '#2e572f', 8);
  line(ctx, x - 22, y + 12 + bob, x - 35, y + 38 + bob);
  line(ctx, x + 22, y + 12 + bob, x + 37, y + 38 + bob);

  fill(ctx, '#e2403c');
  triangle(ctx, x - 30, y + 4 + bob, x - 45, y - 3 + bob, x - 31, y - 9 + bob);
  triangle(ctx, x + 31, y + 4 + bob, x + 47, y - 2 + bob, x + 32, y - 9 + bob);
}

function drawThornbeastAsset(ctx, summon, x, y, scale = 1) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.4;
  const jaw = Math.sin(t * 3.8) * 1.8;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  shadow(ctx, 0, 20, 24, 7);

  stroke(ctx, '#305c2f', 7);
  line(ctx, -8, 12, -19, 28);
  line(ctx, 8, 12, 20, 28);

  stroke(ctx, '#4f8a3f', 5);
  line(ctx, -3, 11, -8, 29);
  line(ctx, 14, 8, 7, 29);

  stroke(ctx, '#2c4d28', 11);
  ctx.beginPath();
  ctx.moveTo(0, 17);
  ctx.quadraticCurveTo(-17, -2, -2, -22 + bob);
  ctx.quadraticCurveTo(11, -38 + bob, 4, -54 + bob);
  ctx.stroke();

  stroke(ctx, '#5f9d45', 7);
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.quadraticCurveTo(-13, -2, 0, -21 + bob);
  ctx.quadraticCurveTo(10, -36 + bob, 4, -51 + bob);
  ctx.stroke();

  fill(ctx, '#3d6f32');
  poly(ctx, [[-15, -1], [-39, -10], [-42, 8], [-24, 12], [-8, 5]]);

  fill(ctx, '#487d38');
  poly(ctx, [[10, -5], [34, -13], [42, 4], [24, 11], [11, 5]]);

  stroke(ctx, '#294a26', 2);
  line(ctx, -35, 0, -12, 4);
  line(ctx, 16, 4, 36, -1);

  ctx.save();
  ctx.translate(0, -54 + bob);
  ctx.rotate(-0.16);

  fill(ctx, '#d8272c');
  poly(ctx, [
    [-29, 5], [-51, -6], [-31, -8], [-49, -22], [-24, -17], [-30, -34],
    [-10, -21], [6, -31], [11, -15], [30, -18], [19, -3], [34, 8], [13, 9], [-4, 14]
  ]);

  fill(ctx, '#f05a53');
  poly(ctx, [
    [-24, 1], [-43, -7], [-22, -7], [-37, -18], [-14, -11], [-22, -27],
    [-5, -17], [8, -24], [8, -10], [25, -13], [14, -1], [27, 7], [8, 7], [-4, 11]
  ]);

  fill(ctx, '#a92128');
  poly(ctx, [[-25, 6], [-8, 18 + jaw], [16, 17 + jaw], [31, 8], [10, 7], [-8, 10], [-25, 6]]);

  fill(ctx, '#f06b65');
  poly(ctx, [[-13, 9], [-2, 14 + jaw], [12, 13 + jaw], [3, 10], [-9, 11]]);

  fill(ctx, '#090909');
  rect(ctx, 6, -11, 9, 9);
  fill(ctx, '#ffffff');
  rect(ctx, 11, -8, 2, 2);

  fill(ctx, '#e8dfc7');
  triangle(ctx, -18, 5, -13, 14, -8, 6);
  triangle(ctx, -4, 7, 0, 16, 5, 7);
  triangle(ctx, 13, 7, 17, 14, 22, 7);

  ctx.restore();

  fill(ctx, '#d8272c');
  triangle(ctx, -13, -24 + bob, -26, -31 + bob, -13, -35 + bob);
  triangle(ctx, 11, -18 + bob, 24, -23 + bob, 12, -30 + bob);
  triangle(ctx, -10, 3, -21, -3, -11, -9);
  triangle(ctx, 15, 8, 27, 3, 16, -4);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// SPECTRAL HAND
// -----------------------------------------------------------------------------

function drawSpectralHandAsset(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 3) * 1.5;

  shadow(ctx, x, y + 9, 10, 4);

  fill(ctx, 'rgba(182,140,255,0.78)');
  rect(ctx, x - 5, y - 4 + bob, 10, 10);

  rect(ctx, x - 7, y - 14 + bob, 3, 10);
  rect(ctx, x - 3, y - 17 + bob, 3, 13);
  rect(ctx, x + 1, y - 16 + bob, 3, 12);
  rect(ctx, x + 5, y - 12 + bob, 3, 9);

  fill(ctx, 'rgba(182,140,255,0.45)');
  rect(ctx, x - 3, y + 6 + bob, 6, 7);

  stroke(ctx, 'rgba(182,140,255,0.9)', 2);
  line(ctx, x - 2, y + 13 + bob, x - 7, y + 21 + bob);
  line(ctx, x + 2, y + 13 + bob, x + 7, y + 21 + bob);
}

// -----------------------------------------------------------------------------
// PLAYER / GEAR ASSETS
// -----------------------------------------------------------------------------

export function drawCodeGear(ctx, actor, camera, options = {}) {
  const equipment = actor.equipment || {};

  const facing = options.facing || getFacing(actor.dirX || 0, actor.dirY || 1);
  const bob = options.bob || 0;
  const step = options.step || 0;
  const armSwing = options.armSwing || 0;

  if (options.local) {
    drawOutfitOverlay(ctx, actor, 0, 0, equipment, {
      ...options,
      facing,
      bob,
      step,
      armSwing
    });

    drawWeaponAsset(ctx, actor, 0, 0, equipment.weapon, {
      ...options,
      facing,
      bob,
      step,
      armSwing
    });

    return;
  }

  const x = actor.x - camera.x;
  const y = actor.y - camera.y;

  drawOutfitOverlay(ctx, actor, x, y, equipment, {
    ...options,
    facing,
    bob,
    step,
    armSwing
  });

  drawWeaponAsset(ctx, actor, x, y, equipment.weapon, {
    ...options,
    facing,
    bob,
    step,
    armSwing
  });
}

function drawOutfitOverlay(ctx, actor, x, y, equipment, options = {}) {
  const chest = normalizeItemId(equipment.chest);
  const helm = normalizeItemId(equipment.helm);
  const legs = normalizeItemId(equipment.legs);

  const facing = options.facing || 'down';
  const bob = options.bob || 0;
  const step = options.step || 0;

  if (facing === 'up') {
    drawBackOutfit(ctx, x, y, { chest, helm, legs, bob, step });
    return;
  }

  if (facing === 'left' || facing === 'right') {
    drawSideOutfit(ctx, x, y, {
      chest,
      helm,
      legs,
      bob,
      step,
      side: facing === 'left' ? -1 : 1
    });
    return;
  }

  drawFrontOutfit(ctx, x, y, { chest, helm, legs, bob, step });
}

function drawFrontOutfit(ctx, x, y, data) {
  const { chest, helm, legs, bob, step } = data;

  if (chest === 'necromancerRobe') {
    fill(ctx, '#17111f');
    rect(ctx, x - 12, y - 25 + bob, 24, 29);
    fill(ctx, '#5a2c74');
    rect(ctx, x - 9, y - 23 + bob, 18, 24);
    fill(ctx, '#2d1739');
    rect(ctx, x - 13, y - 21 + bob, 4, 23);
    rect(ctx, x + 9, y - 21 + bob, 4, 23);
  }

  if (chest === 'thornbinderGarb') {
    fill(ctx, '#365b2e');
    rect(ctx, x - 10, y - 24 + bob, 20, 24);
    fill(ctx, '#75a957');
    rect(ctx, x - 4, y - 24 + bob, 8, 24);
    stroke(ctx, '#2e572f', 2);
    line(ctx, x - 9, y - 12 + bob, x + 9, y - 19 + bob);
  }

  if (chest === 'knightChest' || chest === 'wardedChest') {
    fill(ctx, '#8c9297');
    rect(ctx, x - 12, y - 24 + bob, 24, 20);
    fill(ctx, '#b8bec4');
    rect(ctx, x - 9, y - 22 + bob, 18, 4);
    fill(ctx, '#6f777d');
    rect(ctx, x - 15, y - 21 + bob, 5, 8);
    rect(ctx, x + 10, y - 21 + bob, 5, 8);
  }

  if (chest === 'battleMageCoat') {
    fill(ctx, '#1e3f8a');
    rect(ctx, x - 11, y - 24 + bob, 22, 28);
    stroke(ctx, '#d9ad4f', 2);
    line(ctx, x - 8, y - 18 + bob, x - 8, y + 3 + bob);
    line(ctx, x + 8, y - 18 + bob, x + 8, y + 3 + bob);
  }

  if (chest === 'rogueLeathers') {
    fill(ctx, '#263d2a');
    rect(ctx, x - 10, y - 24 + bob, 20, 22);
    fill(ctx, '#111611');
    rect(ctx, x - 7, y - 11 + bob, 14, 7);
  }

  drawHelmetFront(ctx, x, y, helm, bob);
  drawLegArmourFront(ctx, x, y, legs, bob, step);
}

function drawBackOutfit(ctx, x, y, data) {
  const { chest, helm, legs, bob, step } = data;

  if (chest === 'necromancerRobe') {
    fill(ctx, '#120c18');
    rect(ctx, x - 12, y - 25 + bob, 24, 29);
    fill(ctx, '#3d1f4f');
    rect(ctx, x - 8, y - 23 + bob, 16, 25);
  }

  if (chest === 'thornbinderGarb') {
    fill(ctx, '#294a26');
    rect(ctx, x - 10, y - 24 + bob, 20, 24);
    fill(ctx, '#487d38');
    rect(ctx, x - 3, y - 24 + bob, 6, 24);
  }

  if (chest === 'knightChest' || chest === 'wardedChest') {
    fill(ctx, '#737b82');
    rect(ctx, x - 12, y - 24 + bob, 24, 20);
    fill(ctx, '#a5acb2');
    rect(ctx, x - 8, y - 22 + bob, 16, 4);
  }

  if (chest === 'battleMageCoat') {
    fill(ctx, '#142f6b');
    rect(ctx, x - 11, y - 24 + bob, 22, 28);
    stroke(ctx, '#b69251', 2);
    line(ctx, x, y - 20 + bob, x, y + 4 + bob);
  }

  if (chest === 'rogueLeathers') {
    fill(ctx, '#1d2e20');
    rect(ctx, x - 10, y - 24 + bob, 20, 22);
  }

  drawHelmetBack(ctx, x, y, helm, bob);
  drawLegArmourFront(ctx, x, y, legs, bob, step);
}

function drawSideOutfit(ctx, x, y, data) {
  const { chest, helm, legs, bob, step, side } = data;

  if (chest === 'necromancerRobe') {
    fill(ctx, '#17111f');
    rect(ctx, x - 9, y - 25 + bob, 18, 29);
    fill(ctx, '#5a2c74');
    rect(ctx, x - 6, y - 23 + bob, 12, 24);
    fill(ctx, '#2d1739');

    if (side === 1) {
      rect(ctx, x + 7, y - 21 + bob, 4, 23);
    } else {
      rect(ctx, x - 11, y - 21 + bob, 4, 23);
    }
  }

  if (chest === 'thornbinderGarb') {
    fill(ctx, '#365b2e');
    rect(ctx, x - 9, y - 24 + bob, 18, 24);
    fill(ctx, '#75a957');
    rect(ctx, x - 3, y - 24 + bob, 6, 24);
    stroke(ctx, '#2e572f', 2);
    line(ctx, x - side * 5, y - 12 + bob, x + side * 7, y - 19 + bob);
  }

  if (chest === 'knightChest' || chest === 'wardedChest') {
    fill(ctx, '#8c9297');
    rect(ctx, x - 10, y - 24 + bob, 20, 20);
    fill(ctx, '#b8bec4');
    rect(ctx, x - 7, y - 22 + bob, 14, 4);
    fill(ctx, '#6f777d');

    if (side === 1) {
      rect(ctx, x + 8, y - 21 + bob, 5, 8);
    } else {
      rect(ctx, x - 13, y - 21 + bob, 5, 8);
    }
  }

  if (chest === 'battleMageCoat') {
    fill(ctx, '#1e3f8a');
    rect(ctx, x - 9, y - 24 + bob, 18, 28);
    stroke(ctx, '#d9ad4f', 2);
    line(ctx, x + side * 5, y - 18 + bob, x + side * 5, y + 3 + bob);
  }

  if (chest === 'rogueLeathers') {
    fill(ctx, '#263d2a');
    rect(ctx, x - 9, y - 24 + bob, 18, 22);
    fill(ctx, '#111611');
    rect(ctx, x - 5, y - 11 + bob, 10, 7);
  }

  drawHelmetSide(ctx, x, y, helm, bob, side);
  drawLegArmourSide(ctx, x, y, legs, bob, step);
}

function drawHelmetFront(ctx, x, y, helm, bob) {
  if (helm === 'clothHood' || helm === 'necromancerHood') {
    fill(ctx, '#111018');
    rect(ctx, x - 13, y - 43 + bob, 26, 13);
    fill(ctx, '#24152e');
    rect(ctx, x - 10, y - 40 + bob, 20, 5);
  }

  if (helm === 'knightHelm') {
    fill(ctx, '#9ba1a6');
    rect(ctx, x - 12, y - 43 + bob, 24, 10);
    fill(ctx, '#34383d');
    rect(ctx, x - 8, y - 38 + bob, 16, 3);
  }
}

function drawHelmetBack(ctx, x, y, helm, bob) {
  if (helm === 'clothHood' || helm === 'necromancerHood') {
    fill(ctx, '#0c0b12');
    rect(ctx, x - 13, y - 43 + bob, 26, 15);
    fill(ctx, '#211327');
    rect(ctx, x - 10, y - 37 + bob, 20, 9);
  }

  if (helm === 'knightHelm') {
    fill(ctx, '#858d94');
    rect(ctx, x - 12, y - 43 + bob, 24, 11);
    fill(ctx, '#656d74');
    rect(ctx, x - 8, y - 35 + bob, 16, 4);
  }
}

function drawHelmetSide(ctx, x, y, helm, bob, side) {
  if (helm === 'clothHood' || helm === 'necromancerHood') {
    fill(ctx, '#111018');
    rect(ctx, x - 11, y - 43 + bob, 22, 13);

    if (side === 1) {
      rect(ctx, x + 1, y - 39 + bob, 8, 5);
    } else {
      rect(ctx, x - 9, y - 39 + bob, 8, 5);
    }
  }

  if (helm === 'knightHelm') {
    fill(ctx, '#9ba1a6');
    rect(ctx, x - 11, y - 43 + bob, 22, 10);
    fill(ctx, '#34383d');

    if (side === 1) {
      rect(ctx, x + 1, y - 38 + bob, 8, 3);
    } else {
      rect(ctx, x - 9, y - 38 + bob, 8, 3);
    }
  }
}

function drawLegArmourFront(ctx, x, y, legs, bob, step) {
  if (legs === 'ironGreaves' || legs === 'graveboundGreaves') {
    fill(ctx, '#7f858a');
    rect(ctx, x - 9, y + 1 + bob + step * 0.2, 7, 17);
    rect(ctx, x + 2, y + 1 + bob - step * 0.2, 7, 17);
  }
}

function drawLegArmourSide(ctx, x, y, legs, bob, step) {
  if (legs === 'ironGreaves' || legs === 'graveboundGreaves') {
    fill(ctx, '#7f858a');
    rect(ctx, x - 5, y + 1 + bob + step * 0.2, 7, 17);
    rect(ctx, x + 2, y + 1 + bob - step * 0.2, 7, 17);
  }
}

// -----------------------------------------------------------------------------
// WEAPONS
// -----------------------------------------------------------------------------

function drawWeaponAsset(ctx, actor, x, y, weaponRef, options = {}) {
  const weaponId = normalizeItemId(weaponRef);
  if (!weaponId) return;

  const item = ITEMS[weaponId] || {};
  const type = item.weaponType || inferWeaponType(weaponId, item);

  const facing = options.facing || getFacing(actor.dirX || 0, actor.dirY || 1);
  const bob = options.bob || 0;
  const armSwing = options.armSwing || 0;

  if (facing === 'up') {
    drawBackWeapon(ctx, x, y, weaponId, item, type, bob);
    return;
  }

  const side = facing === 'left' ? -1 : 1;

  if (facing === 'down') {
    drawFrontWeapon(ctx, x, y, weaponId, item, type, bob, armSwing);
    return;
  }

  drawSideWeapon(ctx, x, y, weaponId, item, type, bob, armSwing, side);
}

function drawFrontWeapon(ctx, x, y, weaponId, item, type, bob, armSwing) {
  const handX = x + 16;
  const handY = y - 16 + bob - armSwing * 0.35;

  if (type === 'sword') {
    drawSword(ctx, handX, handY, 1, weaponId, item);
  } else if (type === 'staff') {
    drawStaff(ctx, handX, handY, 1, weaponId, item);
  } else if (type === 'scythe') {
    drawScytheFacing(ctx, handX, handY, 1, weaponId, item, 'down');
  } else if (type === 'bow') {
    drawBow(ctx, handX, handY, 1, item);
  }
}

function drawSideWeapon(ctx, x, y, weaponId, item, type, bob, armSwing, side) {
  const handX = x + side * 15;
  const handY = y - 16 + bob - armSwing * 0.35;

  if (type === 'sword') {
    drawSword(ctx, handX, handY, side, weaponId, item);
  } else if (type === 'staff') {
    drawStaff(ctx, handX, handY, side, weaponId, item);
  } else if (type === 'scythe') {
    drawScytheFacing(ctx, handX, handY, side, weaponId, item, side === 1 ? 'right' : 'left');
  } else if (type === 'bow') {
    drawBow(ctx, handX, handY, side, item);
  }
}

function drawBackWeapon(ctx, x, y, weaponId, item, type, bob) {
  const side = -1;
  const handX = x - 15;
  const handY = y - 17 + bob;

  if (type === 'sword') {
    stroke(ctx, '#7b4b28', 4);
    line(ctx, handX, handY + 12, handX - 4, handY + 19);
    stroke(ctx, item.rarity === 'occult' || item.rarity === 'relic' ? '#b68cff' : '#c9d1d9', 5);
    line(ctx, handX, handY + 8, handX - 4, handY - 22);
  } else if (type === 'staff') {
    drawStaff(ctx, handX, handY, side, weaponId, item);
  } else if (type === 'scythe') {
    drawScytheFacing(ctx, handX, handY, side, weaponId, item, 'up');
  } else if (type === 'bow') {
    drawBow(ctx, handX, handY, side, item);
  }
}

function drawSword(ctx, x, y, side, weaponId, item) {
  const magic = item.rarity === 'occult' || item.rarity === 'relic' || weaponId === 'graveKnife';

  stroke(ctx, '#7b4b28', 4);
  line(ctx, x, y + 12, x + side * 4, y + 19);

  stroke(ctx, magic ? '#b68cff' : '#d9dfe8', 6);
  line(ctx, x, y + 8, x + side * 2, y - 22);

  stroke(ctx, '#f2f4f8', 2);
  line(ctx, x + side * 1, y + 5, x + side * 2, y - 18);
}

function drawStaff(ctx, x, y, side, weaponId, item) {
  stroke(ctx, '#7b4b28', 5);
  line(ctx, x, y + 18, x + side * 3, y - 26);

  fill(ctx, weaponId === 'heartrootStaff' || weaponId === 'briarStaff' || item.rarity === 'uncommon'
    ? '#6cab4d'
    : '#8b6a42'
  );
  rect(ctx, x + side * -3, y - 30, 8, 8);

  if (weaponId === 'heartrootStaff' || item.rarity === 'rare') {
    glow(ctx, x, y - 27, 15, 'rgba(115,209,138,0.2)');
  }
}

function drawScytheFacing(ctx, x, y, side, weaponId, item, facing = 'right') {
  const occult = item.rarity === 'occult' || weaponId === 'unburiedCrescent' || weaponId === 'graveScythe';
  const blade = occult ? '#b68cff' : '#d9dfe8';
  const highlight = occult ? '#e2ccff' : '#f2f4f8';

  stroke(ctx, '#6b4a2a', 5);

  if (facing === 'right') {
    line(ctx, x - 2, y + 20, x + 5, y - 30);
  } else if (facing === 'left') {
    line(ctx, x + 2, y + 20, x - 5, y - 30);
  } else if (facing === 'down') {
    line(ctx, x - 1, y + 20, x + 4, y - 30);
  } else {
    line(ctx, x + 1, y + 20, x - 4, y - 30);
  }

  drawScytheBlade(ctx, x, y, facing, blade, highlight);

  if (occult) {
    const glowPoint = getScytheBladeGlowPoint(x, y, facing);
    glow(ctx, glowPoint.x, glowPoint.y, 14, 'rgba(182,140,255,0.16)');
  }
}

function drawScytheBlade(ctx, x, y, facing, blade, highlight) {
  const points = getScytheBladePoints(x, y, facing);

  fill(ctx, '#4a2f1b');
  rect(ctx, points.collarX - 4, points.collarY - 2, 8, 5);

  stroke(ctx, blade, 5);
  ctx.beginPath();
  ctx.moveTo(points.rootX, points.rootY);
  ctx.quadraticCurveTo(points.midX, points.midY, points.tipX, points.tipY);
  ctx.quadraticCurveTo(points.innerX, points.innerY, points.innerTipX, points.innerTipY);
  ctx.stroke();

  stroke(ctx, highlight, 2);
  ctx.beginPath();
  ctx.moveTo(points.rootX, points.rootY - 1);
  ctx.quadraticCurveTo(points.midX, points.midY + points.highlightYOffset, points.tipX, points.tipY);
  ctx.stroke();

  fill(ctx, blade);
  triangle(
    ctx,
    points.tipX,
    points.tipY,
    points.tipWingAX,
    points.tipWingAY,
    points.tipWingBX,
    points.tipWingBY
  );
}

function getScytheBladePoints(x, y, facing) {
  if (facing === 'right') {
    return {
      collarX: x + 5,
      collarY: y - 30,

      rootX: x + 4,
      rootY: y - 30,
      midX: x + 23,
      midY: y - 43,
      tipX: x + 31,
      tipY: y - 25,

      innerX: x + 18,
      innerY: y - 30,
      innerTipX: x + 10,
      innerTipY: y - 27,

      tipWingAX: x + 22,
      tipWingAY: y - 23,
      tipWingBX: x + 26,
      tipWingBY: y - 34,

      highlightYOffset: 2
    };
  }

  if (facing === 'left') {
    return {
      collarX: x - 5,
      collarY: y - 30,

      rootX: x - 4,
      rootY: y - 30,
      midX: x - 23,
      midY: y - 43,
      tipX: x - 31,
      tipY: y - 25,

      innerX: x - 18,
      innerY: y - 30,
      innerTipX: x - 10,
      innerTipY: y - 27,

      tipWingAX: x - 22,
      tipWingAY: y - 23,
      tipWingBX: x - 26,
      tipWingBY: y - 34,

      highlightYOffset: 2
    };
  }

  if (facing === 'up') {
    return {
      collarX: x - 4,
      collarY: y - 30,

      rootX: x - 4,
      rootY: y - 30,
      midX: x - 24,
      midY: y - 42,
      tipX: x - 30,
      tipY: y - 23,

      innerX: x - 16,
      innerY: y - 28,
      innerTipX: x - 9,
      innerTipY: y - 26,

      tipWingAX: x - 21,
      tipWingAY: y - 22,
      tipWingBX: x - 25,
      tipWingBY: y - 34,

      highlightYOffset: 2
    };
  }

  return {
    collarX: x + 5,
    collarY: y - 30,

    rootX: x + 4,
    rootY: y - 30,
    midX: x + 24,
    midY: y - 42,
    tipX: x + 30,
    tipY: y - 23,

    innerX: x + 16,
    innerY: y - 28,
    innerTipX: x + 9,
    innerTipY: y - 26,

    tipWingAX: x + 21,
    tipWingAY: y - 22,
    tipWingBX: x + 25,
    tipWingBY: y - 34,

    highlightYOffset: 2
  };
}

function getScytheBladeGlowPoint(x, y, facing) {
  if (facing === 'left' || facing === 'up') {
    return {
      x: x - 22,
      y: y - 32
    };
  }

  return {
    x: x + 22,
    y: y - 32
  };
}

function drawBow(ctx, x, y, side) {
  stroke(ctx, '#8b5a2b', 4);
  ctx.beginPath();
  ctx.arc(x + side * 4, y - 2, 20, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  stroke(ctx, '#d9dfe8', 1);
  line(ctx, x + side * 4, y - 22, x + side * 4, y + 18);
}

// -----------------------------------------------------------------------------
// GENERAL HELPERS
// -----------------------------------------------------------------------------

function normalizeItemId(itemRef) {
  if (!itemRef) return null;
  if (typeof itemRef === 'string') return itemRef;
  return itemRef.id || null;
}

function inferWeaponType(weaponId, item) {
  const text = `${weaponId} ${item.name || ''}`.toLowerCase();

  if (text.includes('bow')) return 'bow';
  if (text.includes('staff')) return 'staff';
  if (text.includes('scythe') || text.includes('crescent')) return 'scythe';

  return 'sword';
}

function getFacing(dirX, dirY) {
  if (Math.abs(dirX) > Math.abs(dirY)) {
    return dirX < 0 ? 'left' : 'right';
  }

  if (dirY < -0.15) return 'up';
  return 'down';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAW HELPERS
// -----------------------------------------------------------------------------

function fill(ctx, color) {
  ctx.fillStyle = color;
}

function stroke(ctx, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function rectStroke(ctx, x, y, w, h) {
  ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.lineTo(Math.round(x3), Math.round(y3));
  ctx.closePath();
  ctx.fill();
}

function poly(ctx, points) {
  if (!points.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function shadow(ctx, x, y, rx, ry) {
  fill(ctx, 'rgba(0,0,0,0.35)');
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function glow(ctx, x, y, r, color) {
  fill(ctx, color);
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}