// floatingText.js
// Runalis floating text and feedback renderer.
//
// Updated:
// - Adds consistent presets for damage, crit, heavy hits, stagger, healing, loot,
//   quest updates, level-ups, spirit feedback, and status messages.
// - Supports stronger action-RPG feedback without needing image assets.
// - Supports screen-space polish: drift, pop scale, fade, slight wobble.
// - Keeps passive effects invisible unless the caller explicitly creates text.

const DEFAULT_MAX_TEXTS = 42;

const PRESETS = {
  damage: {
    color: '#ef6f6c',
    ttl: 0.7,
    size: 13,
    velocityY: -28,
    velocityX: 0,
    gravity: 18,
    scaleStart: 1.15,
    scaleEnd: 0.92,
    weight: 'bold'
  },

  crit: {
    color: '#ffcc66',
    ttl: 0.85,
    size: 18,
    velocityY: -38,
    velocityX: 0,
    gravity: 22,
    scaleStart: 1.45,
    scaleEnd: 1,
    weight: '900',
    shake: 1.4
  },

  heavy: {
    color: '#f2f4f8',
    ttl: 0.78,
    size: 16,
    velocityY: -34,
    velocityX: 0,
    gravity: 18,
    scaleStart: 1.32,
    scaleEnd: 0.98,
    weight: '900',
    shake: 1.0
  },

  stagger: {
    color: '#ffcc66',
    ttl: 0.75,
    size: 14,
    velocityY: -30,
    velocityX: 0,
    gravity: 12,
    scaleStart: 1.25,
    scaleEnd: 1,
    weight: '900',
    shake: 1.1
  },

  block: {
    color: '#73d18a',
    ttl: 0.6,
    size: 12,
    velocityY: -24,
    velocityX: 0,
    gravity: 12,
    scaleStart: 1.1,
    scaleEnd: 0.94,
    weight: 'bold'
  },

  heal: {
    color: '#73d18a',
    ttl: 0.72,
    size: 13,
    velocityY: -28,
    velocityX: 0,
    gravity: 10,
    scaleStart: 1.15,
    scaleEnd: 0.95,
    weight: 'bold'
  },

  spirit: {
    color: '#b68cff',
    ttl: 0.95,
    size: 14,
    velocityY: -30,
    velocityX: 0,
    gravity: 9,
    scaleStart: 1.2,
    scaleEnd: 1,
    weight: '900'
  },

  loot: {
    color: '#d9ad4f',
    ttl: 1.0,
    size: 12,
    velocityY: -26,
    velocityX: 0,
    gravity: 6,
    scaleStart: 1.08,
    scaleEnd: 0.96,
    weight: 'bold'
  },

  quest: {
    color: '#ffcc66',
    ttl: 1.25,
    size: 16,
    velocityY: -28,
    velocityX: 0,
    gravity: 4,
    scaleStart: 1.24,
    scaleEnd: 1,
    weight: '900'
  },

  level: {
    color: '#ffcc66',
    ttl: 1.45,
    size: 17,
    velocityY: -34,
    velocityX: 0,
    gravity: 4,
    scaleStart: 1.38,
    scaleEnd: 1,
    weight: '900',
    glow: true
  },

  classLevel: {
    color: '#b68cff',
    ttl: 1.35,
    size: 15,
    velocityY: -32,
    velocityX: 0,
    gravity: 4,
    scaleStart: 1.28,
    scaleEnd: 1,
    weight: '900',
    glow: true
  },

  status: {
    color: '#9facbf',
    ttl: 0.85,
    size: 12,
    velocityY: -24,
    velocityX: 0,
    gravity: 8,
    scaleStart: 1.08,
    scaleEnd: 0.95,
    weight: 'bold'
  }
};

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function addFloatingText(target, text, options = {}) {
  if (!target || text === undefined || text === null) return null;

  target.floatingTexts = Array.isArray(target.floatingTexts)
    ? target.floatingTexts
    : [];

  const preset = getPreset(options.preset);

  const item = {
    id: `ft-${Date.now()}-${Math.random().toString(16).slice(2)}`,

    text: String(text),

    x: Number(options.x ?? target.x ?? 0),
    y: Number(options.y ?? target.y ?? 0) + Number(options.offsetY ?? -34),

    baseX: Number(options.x ?? target.x ?? 0),
    baseY: Number(options.y ?? target.y ?? 0) + Number(options.offsetY ?? -34),

    vx: Number(options.velocityX ?? preset.velocityX ?? randomRange(-8, 8)),
    vy: Number(options.velocityY ?? preset.velocityY ?? -26),

    gravity: Number(options.gravity ?? preset.gravity ?? 10),

    age: 0,
    ttl: Math.max(0.1, Number(options.ttl ?? preset.ttl ?? 0.8)),

    color: options.color || preset.color || '#e8edf5',
    outline: options.outline || 'rgba(0,0,0,0.78)',

    size: Number(options.size ?? preset.size ?? 12),
    weight: options.weight || preset.weight || 'bold',
    font: options.font || 'sans-serif',

    align: options.align || 'center',

    scaleStart: Number(options.scaleStart ?? preset.scaleStart ?? 1),
    scaleEnd: Number(options.scaleEnd ?? preset.scaleEnd ?? 0.95),

    alphaStart: Number(options.alphaStart ?? 1),
    alphaEnd: Number(options.alphaEnd ?? 0),

    shake: Number(options.shake ?? preset.shake ?? 0),
    wobble: Number(options.wobble ?? 0.6),

    glow: Boolean(options.glow ?? preset.glow ?? false),

    layer: options.layer || 'world'
  };

  target.floatingTexts.push(item);

  if (target.floatingTexts.length > DEFAULT_MAX_TEXTS) {
    target.floatingTexts.splice(0, target.floatingTexts.length - DEFAULT_MAX_TEXTS);
  }

  return item;
}

export function addDamageText(target, amount, options = {}) {
  const value = Math.max(0, Math.floor(amount || 0));

  return addFloatingText(target, String(value), {
    preset: options.crit ? 'crit' : options.heavy ? 'heavy' : 'damage',
    ...options
  });
}

export function addHealText(target, amount, options = {}) {
  const value = Math.max(0, Math.floor(amount || 0));

  return addFloatingText(target, `+${value}`, {
    preset: 'heal',
    ...options
  });
}

export function addLootText(target, text, options = {}) {
  return addFloatingText(target, text, {
    preset: 'loot',
    offsetY: options.offsetY ?? -48,
    ...options
  });
}

export function addQuestText(target, text, options = {}) {
  return addFloatingText(target, text, {
    preset: 'quest',
    offsetY: options.offsetY ?? -64,
    ...options
  });
}

export function addLevelText(target, text, options = {}) {
  return addFloatingText(target, text, {
    preset: 'level',
    offsetY: options.offsetY ?? -72,
    ...options
  });
}

export function addClassLevelText(target, text, options = {}) {
  return addFloatingText(target, text, {
    preset: 'classLevel',
    offsetY: options.offsetY ?? -88,
    ...options
  });
}

export function addStatusText(target, text, options = {}) {
  return addFloatingText(target, text, {
    preset: 'status',
    offsetY: options.offsetY ?? -46,
    ...options
  });
}

export function addSpiritText(target, text, options = {}) {
  return addFloatingText(target, text, {
    preset: 'spirit',
    offsetY: options.offsetY ?? -58,
    ...options
  });
}

export function addStaggerText(target, options = {}) {
  return addFloatingText(target, options.text || 'Stagger', {
    preset: 'stagger',
    offsetY: options.offsetY ?? -52,
    ...options
  });
}

export function updateFloatingTexts(target, dt) {
  if (!target || !Array.isArray(target.floatingTexts)) return;

  const safeDt = Math.max(0, Math.min(0.05, dt || 0));

  for (const item of target.floatingTexts) {
    if (!item) continue;

    item.age += safeDt;

    item.vy += item.gravity * safeDt;
    item.x += item.vx * safeDt;
    item.y += item.vy * safeDt;

    item.vx *= Math.pow(0.08, safeDt);
  }

  target.floatingTexts = target.floatingTexts.filter(item => {
    return item && item.age < item.ttl;
  });
}

export function drawFloatingTexts(ctx, target, camera) {
  if (!target || !Array.isArray(target.floatingTexts)) return;

  for (const item of target.floatingTexts) {
    drawFloatingText(ctx, item, camera);
  }
}

// Optional helper if later you want to draw multiple actors’ texts from one call.
export function drawFloatingTextList(ctx, texts, camera) {
  if (!Array.isArray(texts)) return;

  for (const item of texts) {
    drawFloatingText(ctx, item, camera);
  }
}

// -----------------------------------------------------------------------------
// DRAWING
// -----------------------------------------------------------------------------

function drawFloatingText(ctx, item, camera) {
  if (!item || !camera) return;

  const progress = Math.max(0, Math.min(1, item.age / Math.max(0.001, item.ttl)));
  const eased = easeOutCubic(progress);
  const fade = 1 - easeInCubic(progress);

  const alpha = lerp(item.alphaStart, item.alphaEnd, progress) * fade;
  if (alpha <= 0.01) return;

  const scale = lerp(item.scaleStart, item.scaleEnd, eased);
  const wobble = Math.sin((item.age + stableNoise(item.id)) * 18) * item.wobble;
  const shakeX = item.shake ? randomRange(-item.shake, item.shake) : 0;
  const shakeY = item.shake ? randomRange(-item.shake, item.shake) : 0;

  const x = item.x - camera.x + wobble + shakeX;
  const y = item.y - camera.y + shakeY;

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  ctx.font = `${item.weight} ${item.size}px ${item.font}`;
  ctx.textAlign = item.align;
  ctx.textBaseline = 'middle';

  if (item.glow) {
    ctx.globalAlpha = alpha * 0.34;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(22, item.size * 1.55), Math.max(8, item.size * 0.58), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha;
  }

  ctx.lineWidth = Math.max(3, Math.floor(item.size / 4));
  ctx.strokeStyle = item.outline;
  ctx.strokeText(item.text, 0, 0);

  ctx.fillStyle = item.color;
  ctx.fillText(item.text, 0, 0);

  // A tiny highlight makes larger level/quest text read cleaner.
  if (item.size >= 15) {
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(item.text, 0, -1);
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// MASS HELPERS
// -----------------------------------------------------------------------------

export function clearFloatingTexts(target) {
  if (!target) return;

  target.floatingTexts = [];
}

export function clearExpiredFloatingTexts(target) {
  if (!target || !Array.isArray(target.floatingTexts)) return;

  target.floatingTexts = target.floatingTexts.filter(item => {
    return item && item.age < item.ttl;
  });
}

// -----------------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------------

function getPreset(name) {
  if (!name) return PRESETS.status;

  return PRESETS[name] || PRESETS.status;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function stableNoise(id) {
  const str = String(id || 'x');
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }

  return Math.abs(hash % 1000) / 1000;
}