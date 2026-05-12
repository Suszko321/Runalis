// humanRenderer.js
// Runalis code-drawn humanoid renderer.
//
// Updated:
// - Removes weird visible side-facing hands.
// - Keeps improved less-blocky humanoid body.
// - Keeps cleaner front, side, and back views.
// - Gear still renders through drawCodeGear() after the body.
// - Body remains simple canvas code with no image assets.

import { drawCodeGear } from './codeAssets.js';

export function drawHumanActor(ctx, actor, camera, options = {}) {
  const scale = options.scale ?? actor.scale ?? 1;

  const x = actor.x - camera.x;
  const y = actor.y - camera.y;

  const dirX = actor.dirX ?? 0;
  const dirY = actor.dirY ?? 1;

  const facing = getFacing(dirX, dirY);

  const walkTime = actor.walkTime || actor.animTime || actor.moveTime || 0;
  const moving = Math.abs(dirX) > 0.05 || Math.abs(dirY) > 0.05;

  const cycle = walkTime * 3.85;
  const idleCycle = walkTime * 1.25;

  const bob = moving
    ? Math.sin(cycle) * 0.65
    : Math.sin(idleCycle) * 0.18;

  const step = moving
    ? Math.sin(cycle) * 1.85
    : 0;

  const armSwing = moving
    ? Math.sin(cycle) * 1.45
    : 0;

  const skin = options.skin || actor.skin || '#ffd1bd';
  const hair = options.hair || actor.hair || '#111111';
  const shirt = options.shirt || actor.shirt || '#f2a51f';
  const pants = options.pants || actor.pants || '#293fba';
  const boots = options.boots || actor.boots || '#3a2a22';

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  drawActorShadow(ctx, 0, 18, 16, 5);

  if (facing === 'up') {
    drawBackBody(ctx, {
      bob,
      step,
      armSwing,
      skin,
      hair,
      shirt,
      pants,
      boots
    });
  } else {
    drawFrontOrSideBody(ctx, {
      bob,
      step,
      armSwing,
      skin,
      hair,
      shirt,
      pants,
      boots,
      facing
    });
  }

  drawCodeGear(ctx, actor, camera, {
    local: true,
    facing,
    bob,
    step,
    armSwing,
    scale,
    classId: options.classId || actor.classId || null,
    isPlayer: !!options.isPlayer
  });

  ctx.restore();

  if (options.name) {
    drawNameLabel(ctx, options.name, x, y - 48 * scale);
  }
}

// -----------------------------------------------------------------------------
// BODY DRAWING
// -----------------------------------------------------------------------------

function drawFrontOrSideBody(ctx, parts) {
  const {
    bob,
    step,
    armSwing,
    skin,
    hair,
    shirt,
    pants,
    boots,
    facing
  } = parts;

  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';

  const frontLegOffset = step;
  const backLegOffset = -step;

  const frontArmOffset = -armSwing;
  const backArmOffset = armSwing;

  if (isSide) {
    drawSideBody(ctx, {
      bob,
      side,
      frontLegOffset,
      backLegOffset,
      frontArmOffset,
      backArmOffset,
      skin,
      hair,
      shirt,
      pants,
      boots
    });

    return;
  }

  drawFrontBody(ctx, {
    bob,
    frontLegOffset,
    backLegOffset,
    frontArmOffset,
    backArmOffset,
    skin,
    hair,
    shirt,
    pants,
    boots
  });
}

function drawFrontBody(ctx, parts) {
  const {
    bob,
    frontLegOffset,
    backLegOffset,
    frontArmOffset,
    backArmOffset,
    skin,
    hair,
    shirt,
    pants,
    boots
  } = parts;

  drawLimbSegment(ctx, {
    x1: -11,
    y1: -20 + bob + backArmOffset * 0.32,
    x2: -15,
    y2: -6 + bob + backArmOffset * 0.38,
    width: 5,
    color: skin
  });

  drawLimbSegment(ctx, {
    x1: 11,
    y1: -20 + bob + frontArmOffset * 0.32,
    x2: 15,
    y2: -6 + bob + frontArmOffset * 0.38,
    width: 5,
    color: skin
  });

  drawLeg(ctx, -6, 0 + bob + frontLegOffset * 0.24, frontLegOffset, pants, boots);
  drawLeg(ctx, 5, 0 + bob + backLegOffset * 0.24, backLegOffset, pants, boots);

  fill(ctx, darken(skin, 0.04));
  roundedRect(ctx, -4, -29 + bob, 8, 8, 3);

  fill(ctx, darken(shirt, 0.08));
  polygon(ctx, [
    [-12, -25 + bob],
    [12, -25 + bob],
    [10, 1 + bob],
    [-10, 1 + bob]
  ]);

  fill(ctx, shirt);
  polygon(ctx, [
    [-10, -24 + bob],
    [10, -24 + bob],
    [8, 0 + bob],
    [-8, 0 + bob]
  ]);

  fill(ctx, lighten(shirt, 0.13));
  polygon(ctx, [
    [-7, -22 + bob],
    [-2, -22 + bob],
    [-3, -1 + bob],
    [-8, -1 + bob]
  ]);

  fill(ctx, darken(shirt, 0.16));
  rect(ctx, -1, -22 + bob, 2, 21);

  fill(ctx, skin);
  roundedRect(ctx, -18, -8 + bob + backArmOffset * 0.38, 6, 6, 3);
  roundedRect(ctx, 12, -8 + bob + frontArmOffset * 0.38, 6, 6, 3);

  drawFrontHead(ctx, {
    bob,
    skin,
    hair
  });
}

function drawSideBody(ctx, parts) {
  const {
    bob,
    side,
    frontLegOffset,
    backLegOffset,
    frontArmOffset,
    backArmOffset,
    skin,
    hair,
    shirt,
    pants,
    boots
  } = parts;

  // Back arm behind torso.
  drawLimbSegment(ctx, {
    x1: -side * 4,
    y1: -20 + bob + backArmOffset * 0.32,
    x2: -side * 9,
    y2: -5 + bob + backArmOffset * 0.38,
    width: 5,
    color: darken(skin, 0.04)
  });

  drawSideLeg(ctx, -side * 1, 0 + bob + backLegOffset * 0.24, backLegOffset, pants, boots, true);
  drawSideLeg(ctx, side * 3, 0 + bob + frontLegOffset * 0.24, frontLegOffset, pants, boots, false);

  fill(ctx, darken(skin, 0.04));
  roundedRect(ctx, -4, -29 + bob, 8, 8, 3);

  fill(ctx, darken(shirt, 0.1));
  polygon(ctx, [
    [-9, -25 + bob],
    [8, -25 + bob],
    [7, 0 + bob],
    [-7, 0 + bob]
  ]);

  fill(ctx, shirt);
  polygon(ctx, [
    [-7, -24 + bob],
    [7, -24 + bob],
    [6, -1 + bob],
    [-6, -1 + bob]
  ]);

  fill(ctx, lighten(shirt, 0.1));
  rect(ctx, -side * 5, -21 + bob, 4, 19);

  // Front arm only. No visible side hand.
  // The old side hand looked like a detached nub when moving sideways.
  // Weapons still draw from the hand position through codeAssets.js.
  drawLimbSegment(ctx, {
    x1: side * 7,
    y1: -20 + bob + frontArmOffset * 0.3,
    x2: side * 12,
    y2: -4 + bob + frontArmOffset * 0.36,
    width: 5,
    color: skin
  });

  drawSideHead(ctx, {
    bob,
    side,
    skin,
    hair
  });
}

function drawBackBody(ctx, parts) {
  const {
    bob,
    step,
    armSwing,
    skin,
    hair,
    shirt,
    pants,
    boots
  } = parts;

  const leftLegOffset = step;
  const rightLegOffset = -step;

  const leftArmOffset = -armSwing;
  const rightArmOffset = armSwing;

  drawLimbSegment(ctx, {
    x1: -11,
    y1: -20 + bob + leftArmOffset * 0.3,
    x2: -15,
    y2: -6 + bob + leftArmOffset * 0.36,
    width: 5,
    color: darken(skin, 0.06)
  });

  drawLimbSegment(ctx, {
    x1: 11,
    y1: -20 + bob + rightArmOffset * 0.3,
    x2: 15,
    y2: -6 + bob + rightArmOffset * 0.36,
    width: 5,
    color: darken(skin, 0.06)
  });

  drawLeg(ctx, -6, 0 + bob + leftLegOffset * 0.24, leftLegOffset, pants, boots);
  drawLeg(ctx, 5, 0 + bob + rightLegOffset * 0.24, rightLegOffset, pants, boots);

  fill(ctx, darken(skin, 0.08));
  roundedRect(ctx, -4, -29 + bob, 8, 8, 3);

  fill(ctx, darken(shirt, 0.18));
  polygon(ctx, [
    [-12, -25 + bob],
    [12, -25 + bob],
    [10, 1 + bob],
    [-10, 1 + bob]
  ]);

  fill(ctx, darken(shirt, 0.06));
  polygon(ctx, [
    [-9, -23 + bob],
    [9, -23 + bob],
    [7, 0 + bob],
    [-7, 0 + bob]
  ]);

  drawBackHead(ctx, {
    bob,
    skin,
    hair
  });
}

// -----------------------------------------------------------------------------
// BODY PARTS
// -----------------------------------------------------------------------------

function drawFrontHead(ctx, parts) {
  const { bob, skin, hair } = parts;

  fill(ctx, skin);
  roundedRect(ctx, -10, -45 + bob, 20, 19, 6);

  fill(ctx, darken(skin, 0.05));
  rect(ctx, -7, -29 + bob, 14, 3);

  fill(ctx, hair);
  roundedRect(ctx, -11, -48 + bob, 22, 8, 5);
  rect(ctx, -11, -43 + bob, 5, 9);
  rect(ctx, 6, -43 + bob, 5, 9);

  fill(ctx, '#1b1714');
  rect(ctx, -5, -37 + bob, 3, 3);
  rect(ctx, 3, -37 + bob, 3, 3);

  fill(ctx, darken(skin, 0.18));
  rect(ctx, -1, -32 + bob, 2, 2);
}

function drawSideHead(ctx, parts) {
  const { bob, side, skin, hair } = parts;

  fill(ctx, skin);
  roundedRect(ctx, -8, -45 + bob, 16, 19, 6);

  fill(ctx, skin);
  roundedRect(ctx, side * 5, -38 + bob, 5, 5, 2);

  fill(ctx, darken(skin, 0.05));
  rect(ctx, -5, -29 + bob, 11, 3);

  fill(ctx, hair);
  roundedRect(ctx, -9, -48 + bob, 18, 8, 5);
  rect(ctx, -side * 9, -42 + bob, 5, 12);

  fill(ctx, '#1b1714');
  rect(ctx, side * 3, -37 + bob, 3, 3);
}

function drawBackHead(ctx, parts) {
  const { bob, skin, hair } = parts;

  fill(ctx, darken(skin, 0.03));
  roundedRect(ctx, -10, -45 + bob, 20, 19, 6);

  fill(ctx, hair);
  roundedRect(ctx, -12, -48 + bob, 24, 9, 5);
  roundedRect(ctx, -11, -41 + bob, 22, 15, 5);
}

function drawLeg(ctx, x, y, step, pants, boots) {
  fill(ctx, darken(pants, 0.08));
  roundedRect(ctx, x - 4, y, 8, 17, 3);

  fill(ctx, pants);
  roundedRect(ctx, x - 3, y + 1, 6, 15, 2);

  fill(ctx, boots);
  roundedRect(ctx, x - 5, y + 16, 10, 5, 2);

  if (step > 0.6) {
    rect(ctx, x - 6, y + 18, 3, 3);
  }
}

function drawSideLeg(ctx, x, y, step, pants, boots, backLeg) {
  const shade = backLeg ? darken(pants, 0.14) : pants;

  fill(ctx, shade);
  roundedRect(ctx, x - 4, y, 8, 17, 3);

  fill(ctx, backLeg ? darken(boots, 0.12) : boots);
  roundedRect(ctx, x - 5, y + 16, 10, 5, 2);

  if (Math.abs(step) > 0.8) {
    rect(ctx, x + (step > 0 ? 2 : -5), y + 18, 5, 3);
  }
}

function drawLimbSegment(ctx, opts) {
  const {
    x1,
    y1,
    x2,
    y2,
    width,
    color
  } = opts;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// LABEL / EFFECTS
// -----------------------------------------------------------------------------

function drawNameLabel(ctx, text, x, y) {
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillText(text, x + 1, y + 1);

  ctx.fillStyle = '#e8edf5';
  ctx.fillText(text, x, y);
}

function drawActorShadow(ctx, x, y, rx, ry) {
  fill(ctx, 'rgba(0,0,0,0.36)');
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// -----------------------------------------------------------------------------
// FACING
// -----------------------------------------------------------------------------

function getFacing(dirX, dirY) {
  if (Math.abs(dirX) > Math.abs(dirY)) {
    return dirX < 0 ? 'left' : 'right';
  }

  if (dirY < -0.15) return 'up';
  return 'down';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL HELPERS
// -----------------------------------------------------------------------------

function fill(ctx, color) {
  ctx.fillStyle = color;
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function roundedRect(ctx, x, y, w, h, r = 3) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  const rr = Math.max(0, Math.min(r, Math.min(rw, rh) / 2));

  ctx.beginPath();
  ctx.moveTo(rx + rr, ry);
  ctx.lineTo(rx + rw - rr, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
  ctx.lineTo(rx + rw, ry + rh - rr);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
  ctx.lineTo(rx + rr, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
  ctx.lineTo(rx, ry + rr);
  ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
  ctx.closePath();
  ctx.fill();
}

function polygon(ctx, points) {
  if (!points.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const clean = String(hex || '#ffffff').replace('#', '');

  if (clean.length !== 6) {
    return {
      r: 255,
      g: 255,
      b: 255
    };
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${clamp255(r).toString(16).padStart(2, '0')}${clamp255(g).toString(16).padStart(2, '0')}${clamp255(b).toString(16).padStart(2, '0')}`;
}

function lighten(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);

  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount
  });
}

function darken(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);

  return rgbToHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount)
  });
}