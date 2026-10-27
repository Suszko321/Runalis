// floatingText.js
// Improved world-space floating text feedback for Runalis.
// Backward compatible with existing addFloatingText(player, text, options) calls.

const DEFAULT_PRESET = {
  color: '#d9ad4f',
  outline: 'rgba(0,0,0,0.92)',
  shadow: 'rgba(0,0,0,0.45)',
  size: 13,
  weight: 800,
  ttl: 1.15,
  rise: 28,
  driftX: 0,
  driftY: 0,
  scaleFrom: 1.18,
  scaleTo: 1.0,
  arc: 0,
  jitter: 0,
  important: false
};

const TEXT_PRESETS = {
  loot: {
    color: '#d9ad4f',
    size: 13,
    ttl: 1.2,
    rise: 24,
    scaleFrom: 1.14,
    scaleTo: 1
  },

  xp: {
    color: '#73d18a',
    size: 13,
    ttl: 1.2,
    rise: 24,
    scaleFrom: 1.12,
    scaleTo: 1
  },

  damage: {
    color: '#ff8c8c',
    size: 14,
    ttl: 0.95,
    rise: 32,
    scaleFrom: 1.26,
    scaleTo: 1.02
  },

  crit: {
    color: '#ffcc66',
    size: 18,
    ttl: 1.05,
    rise: 36,
    scaleFrom: 1.45,
    scaleTo: 1.05,
    important: true
  },

  heal: {
    color: '#73d18a',
    size: 14,
    ttl: 1.0,
    rise: 30,
    scaleFrom: 1.24,
    scaleTo: 1.02
  },

  spirit: {
    color: '#b68cff',
    size: 14,
    ttl: 1.25,
    rise: 26,
    scaleFrom: 1.18,
    scaleTo: 1
  },

  status: {
    color: '#9facbf',
    size: 13,
    ttl: 1.2,
    rise: 22,
    scaleFrom: 1.1,
    scaleTo: 1
  },

  quest: {
    color: '#ffcc66',
    size: 15,
    ttl: 1.35,
    rise: 22,
    scaleFrom: 1.22,
    scaleTo: 1.02,
    important: true
  }
};

// -----------------------------------------------------------------------------
// CORE
// -----------------------------------------------------------------------------

export function addFloatingText(player, text, options = {}) {
  if (!player) return null;

  player.floatingTexts = player.floatingTexts || [];

  const presetName = options.preset || null;
  const preset = presetName ? (TEXT_PRESETS[presetName] || {}) : {};

  const cfg = {
    ...DEFAULT_PRESET,
    ...preset,
    ...options
  };

  const now = performance.now() / 1000;

  const originX = options.x ?? player.x ?? 0;
  const originY = options.y ?? ((player.y ?? 0) - 42);

  const stackOffset = getStackOffset(player.floatingTexts, text, originX, originY);

  const ft = {
    id: `ft-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    text: String(text ?? ''),
    x: originX + (cfg.offsetX ?? 0),
    y: originY + (cfg.offsetY ?? -42) - stackOffset,
    baseX: originX + (cfg.offsetX ?? 0),
    baseY: originY + (cfg.offsetY ?? -42) - stackOffset,
    age: 0,
    ttl: cfg.ttl,
    rise: cfg.rise,
    driftX: cfg.driftX + randomRange(-0.35, 0.35),
    driftY: cfg.driftY,
    color: cfg.color,
    outline: cfg.outline,
    shadow: cfg.shadow,
    size: cfg.size,
    weight: cfg.weight,
    scaleFrom: cfg.scaleFrom,
    scaleTo: cfg.scaleTo,
    important: !!cfg.important,
    arc: cfg.arc,
    jitter: cfg.jitter,
    createdAt: now
  };

  player.floatingTexts.push(ft);
  trimFloatingTexts(player);

  return ft;
}

function trimFloatingTexts(player) {
  if (!player?.floatingTexts) return;

  // Prevent runaway spam.
  const maxTexts = 40;

  if (player.floatingTexts.length > maxTexts) {
    player.floatingTexts.splice(0, player.floatingTexts.length - maxTexts);
  }
}

function getStackOffset(floatingTexts, text, x, y) {
  if (!Array.isArray(floatingTexts) || !floatingTexts.length) return 0;

  let overlapCount = 0;

  for (const ft of floatingTexts) {
    const nearSameSpot =
      Math.abs((ft.baseX ?? ft.x) - x) < 48 &&
      Math.abs((ft.baseY ?? ft.y) - y) < 28;

    if (!nearSameSpot) continue;

    overlapCount += 1;
  }

  return Math.min(overlapCount * 14, 70);
}

// -----------------------------------------------------------------------------
// HELPERS FOR OTHER SCRIPTS
// -----------------------------------------------------------------------------

export function addDamageText(target, amount, options = {}) {
  if (!target) return null;

  const value = Math.max(0, Math.floor(amount || 0));
  const crit = !!options.crit;

  return addFloatingText(target, `-${value}`, {
    preset: crit ? 'crit' : 'damage',
    offsetY: -36,
    x: options.x ?? target.x,
    y: options.y ?? target.y,
    ...options
  });
}


export function addXpText(target, skillName, amount, options = {}) {
  if (!target) return null;

  const value = Math.max(0, Math.floor(amount || 0));
  const skillLabel = skillName ? `${skillName} XP` : 'XP';

  return addFloatingText(target, `+${value} ${skillLabel}`, {
    preset: 'xp',
    offsetY: -46,
    ...options
  });
}

export function addLootText(target, itemName, options = {}) {
  if (!target) return null;

  return addFloatingText(target, `Obtained ${itemName}`, {
    preset: 'loot',
    offsetY: -44,
    ...options
  });
}

export function addStatusText(target, text, options = {}) {
  if (!target) return null;

  return addFloatingText(target, text, {
    preset: 'status',
    offsetY: -44,
    ...options
  });
}

export function addQuestText(target, text, options = {}) {
  if (!target) return null;

  return addFloatingText(target, text, {
    preset: 'quest',
    offsetY: -48,
    ...options
  });
}

export function addSpiritText(target, text, options = {}) {
  if (!target) return null;

  return addFloatingText(target, text, {
    preset: 'spirit',
    offsetY: -48,
    ...options
  });
}

// -----------------------------------------------------------------------------
// UPDATE / DRAW
// -----------------------------------------------------------------------------

export function updateFloatingTexts(player, dt) {
  if (!player?.floatingTexts?.length) return;

  for (const ft of player.floatingTexts) {
    ft.age += dt;

    const lifeT = clamp01(ft.age / ft.ttl);
    const easedRise = easeOutCubic(lifeT);

    ft.y = ft.baseY - ft.rise * easedRise;

    // Slight sideways drift for life and readability.
    ft.x = ft.baseX + ft.driftX * 18 * easedRise;

    if (ft.arc) {
      ft.x += Math.sin(lifeT * Math.PI) * ft.arc;
    }
  }

  player.floatingTexts = player.floatingTexts.filter(ft => ft.age < ft.ttl);
}

export function drawFloatingTexts(ctx, player, camera) {
  if (!player?.floatingTexts?.length) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const ft of player.floatingTexts) {
    const t = clamp01(ft.age / ft.ttl);

    const alpha = t < 0.72
      ? 1
      : 1 - ((t - 0.72) / 0.28);

    const scale = lerp(ft.scaleFrom, ft.scaleTo, easeOutCubic(t));

    const x = Math.round(ft.x - camera.x);
    const y = Math.round(ft.y - camera.y);

    const jitterX = ft.jitter ? randomRange(-ft.jitter, ft.jitter) : 0;
    const jitterY = ft.jitter ? randomRange(-ft.jitter, ft.jitter) : 0;

    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    ctx.translate(x + jitterX, y + jitterY);
    ctx.scale(scale, scale);

    ctx.font = `${ft.weight} ${ft.size}px sans-serif`;

    // Shadow layer
    ctx.fillStyle = ft.shadow;
    ctx.fillText(ft.text, 1.5, 2);

    // Strong outline for readability
    ctx.lineWidth = ft.important ? 4 : 3;
    ctx.strokeStyle = ft.outline;
    ctx.strokeText(ft.text, 0, 0);

    // Fill
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);

    ctx.restore();
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------------

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t) {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}