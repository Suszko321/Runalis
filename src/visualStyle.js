// visualStyle.js
// Shared Runalis art direction for the code-drawn canvas renderer.
//
// This module owns palette identity and shared pixel rendering
// helpers. It intentionally contains no gameplay state and allocates nothing
// inside the common per-frame helpers.

function freezeRamp(ramp) {
  return Object.freeze(ramp);
}

export const MASTER_VISUAL_PALETTE = freezeRamp({
  void: '#050609',
  ink: '#0b0d12',
  outline: '#151821',
  deepShadow: '#101218',
  shadow: '#242833',
  mid: '#555d6a',
  light: '#c8ced6',
  paper: '#edf0f2',
  gold: '#d5ad55',
  warning: '#d86a4a',
  danger: '#c84845',
  success: '#6f9f61',
  groundShadow: 'rgba(4,6,9,0.42)',
  groundShadowDeep: 'rgba(2,3,5,0.58)'
});

// Factions use controlled material families, not a single uniform color. The
// contrast is deliberately readable at gameplay scale while staying weathered
// enough for Runalis' morally ambiguous world.
export const FACTION_VISUAL_PALETTES = Object.freeze({
  covenantOfLight: freezeRamp({
    ink: '#28261f', shadow: '#746946', base: '#d8cfb5', light: '#f4eedc',
    metal: '#b99442', accent: '#e1bd63', omen: '#fff0a8'
  }),
  lastDawn: freezeRamp({
    ink: '#151417', shadow: '#302c30', base: '#494044', light: '#82726b',
    metal: '#6f6966', accent: '#8f3f36', omen: '#c15a42'
  }),
  roadless: freezeRamp({
    ink: '#171513', shadow: '#342a22', base: '#61503b', light: '#9b8058',
    metal: '#747980', accent: '#a05b35', omen: '#d18a45'
  }),
  veyrRemnant: freezeRamp({
    ink: '#0c0c11', shadow: '#27232d', base: '#4c4656', light: '#8d8498',
    metal: '#626a76', accent: '#80619a', omen: '#b18acd'
  })
});

export const RUNALIS_ART_RULES = Object.freeze({
  shapeLanguage: 'base player proportions, crisp pixel silhouettes, connected shaded pixel clusters, restrained detail',
  lighting: 'single cool ambient world light with warm local practicals and restrained divine bloom',
  materials: 'matte cloth and stone, worn metal, rough timber, layered water, sparse emissive accents',
  readability: 'identity must survive at normal gameplay zoom without relying on labels',
  humanoids: 'all wearable gear shares the base player anatomy and four directional gait frames; equipment never substitutes a different body style',
  originality: 'original Runalis pixel art; no copied characters, symbols, locations, or assets'
});

export const CLASS_VISUAL_RULES = Object.freeze({
  oathkeeper: 'white, gold, pale yellow, silver, radiant shields, and holy impact rings',
  templar: 'white, gold, and steel',
  fellhunter: 'steel, leather, dark cloth, smoke, rope, traps, and red-orange practical fire',
  mercenary: 'steel, leather, dark cloth, and red-orange',
  gravecaller: 'purple and black; never green',
  necromancer: 'purple and black; never green',
  thornbinder: 'dark green, bark brown, muted amber-gold, and restrained rose-red accents',
  waverider: 'blue, cyan, teal, white water, wave trails, splashes, mist, and water rings',
  hydromancer: 'blue, cyan, teal, and white',
  eldritch: 'black and red only; never purple, blue, or green'
});

export const CLASS_VISUAL_PALETTES = Object.freeze({
  oathkeeper: freezeRamp({
    ink: '#16171b',
    shadow: '#414852',
    base: '#858f9b',
    mid: '#c4c9cb',
    light: '#f1eee4',
    accent: '#d5ad55',
    effect: '#f1cf72',
    effectLight: '#fff1b8',
    effectSoft: 'rgba(213,173,85,0.18)'
  }),
  templar: freezeRamp({
    ink: '#16171b',
    shadow: '#414852',
    base: '#858f9b',
    mid: '#c4c9cb',
    light: '#f1eee4',
    accent: '#d5ad55',
    effect: '#f1cf72',
    effectLight: '#fff1b8',
    effectSoft: 'rgba(213,173,85,0.18)'
  }),
  mercenary: freezeRamp({
    ink: '#141619',
    shadow: '#292b2d',
    base: '#4d5358',
    mid: '#7a6651',
    light: '#b8a07d',
    accent: '#c65f38',
    effect: '#dd7641',
    effectLight: '#f4b36c',
    effectSoft: 'rgba(198,95,56,0.18)'
  }),
  fellhunter: freezeRamp({
    ink: '#141619',
    shadow: '#292b2d',
    base: '#4d5358',
    mid: '#7a6651',
    light: '#b8a07d',
    accent: '#c65f38',
    effect: '#dd7641',
    effectLight: '#f4b36c',
    effectSoft: 'rgba(198,95,56,0.18)'
  }),
  necromancer: freezeRamp({
    ink: '#0b0910',
    shadow: '#211827',
    base: '#4b2d59',
    mid: '#76508b',
    light: '#c6a8dc',
    accent: '#a86bd6',
    effect: '#b67ae0',
    effectLight: '#e3cef2',
    effectSoft: 'rgba(168,107,214,0.18)'
  }),
  gravecaller: freezeRamp({
    ink: '#0b0910',
    shadow: '#211827',
    base: '#4b2d59',
    mid: '#76508b',
    light: '#c6a8dc',
    accent: '#a86bd6',
    effect: '#b67ae0',
    effectLight: '#e3cef2',
    effectSoft: 'rgba(168,107,214,0.18)'
  }),
  thornbinder: freezeRamp({
    ink: '#10140e',
    shadow: '#2b2418',
    base: '#3f6038',
    mid: '#71845a',
    light: '#b6bf86',
    accent: '#a84a4a',
    effect: '#5e9b4b',
    effectLight: '#d8b86a',
    effectSoft: 'rgba(94,155,75,0.14)'
  }),
  hydromancer: freezeRamp({
    ink: '#07131b',
    shadow: '#102d3b',
    base: '#1e667a',
    mid: '#43a9bc',
    light: '#d7fbfa',
    accent: '#59d7e8',
    effect: '#35b9d0',
    effectLight: '#aef7f5',
    effectSoft: 'rgba(53,185,208,0.18)'
  }),
  waverider: freezeRamp({
    ink: '#07131b',
    shadow: '#102d3b',
    base: '#1e667a',
    mid: '#43a9bc',
    light: '#d7fbfa',
    accent: '#59d7e8',
    effect: '#35b9d0',
    effectLight: '#aef7f5',
    effectSoft: 'rgba(53,185,208,0.18)'
  }),
  eldritch: freezeRamp({
    ink: '#050304',
    shadow: '#17080b',
    base: '#2b0d12',
    mid: '#681c25',
    light: '#cf5960',
    accent: '#d73545',
    effect: '#ef4056',
    effectLight: '#ff9099',
    effectSoft: 'rgba(215,53,69,0.18)'
  }),
  default: freezeRamp({
    ink: '#0b0d12',
    shadow: '#242833',
    base: '#59616d',
    mid: '#9099a5',
    light: '#e8edf2',
    accent: '#d5ad55',
    effect: '#d5ad55',
    effectLight: '#f1d690',
    effectSoft: 'rgba(213,173,85,0.18)'
  })
});

export const BIOME_VISUAL_PALETTES = Object.freeze({
  grass: freezeRamp({
    base: '#182c1c',
    base2: '#1d3521',
    base3: '#263f29',
    light: '#668d4a',
    dark: '#0d1b11',
    accent: '#91a65e'
  }),
  path: freezeRamp({
    base: '#3c3024',
    base2: '#493b2c',
    base3: '#574734',
    light: '#a78553',
    dark: '#1d1610',
    accent: '#c2a06a'
  }),
  water: freezeRamp({
    base: '#10253b',
    base2: '#123050',
    base3: '#163a5f',
    light: '#78a8c2',
    dark: '#061421',
    accent: '#a2c4d5'
  }),
  dead: freezeRamp({
    base: '#211b1f',
    base2: '#2a2227',
    base3: '#35272d',
    light: '#704149',
    dark: '#0c080b',
    accent: '#9c6468'
  }),
  ruin: freezeRamp({
    base: '#282b35',
    base2: '#303440',
    base3: '#3b3f4d',
    light: '#9d9688',
    dark: '#101119',
    accent: '#c2b8a6'
  }),
  ore: freezeRamp({
    base: '#252b31',
    base2: '#303841',
    base3: '#3b4650',
    light: '#aeb9c6',
    dark: '#0f1419',
    accent: '#d0b56d'
  }),
  wall: freezeRamp({
    base: '#11131a',
    base2: '#171a24',
    base3: '#1e2330',
    light: '#6d7382',
    dark: '#05060a',
    accent: '#9299aa'
  }),
  default: freezeRamp({
    base: '#1f2f24',
    base2: '#263d2a',
    base3: '#2c4630',
    light: '#6d8f5e',
    dark: '#111a14',
    accent: '#9aaa78'
  })
});

export const MATERIAL_VISUAL_PALETTES = Object.freeze({
  cloth: freezeRamp({ shadow: '#24212a', base: '#4d4857', light: '#81798c', accent: '#b1a7bc' }),
  leather: freezeRamp({ shadow: '#2c1d16', base: '#5b3d2b', light: '#946b47', accent: '#c39a67' }),
  steel: freezeRamp({ shadow: '#303640', base: '#65707c', light: '#b8c0c7', accent: '#e3e6e7' }),
  bone: freezeRamp({ shadow: '#625b4f', base: '#b4aa94', light: '#e2d9c5', accent: '#f4eedf' }),
  wood: freezeRamp({ shadow: '#2f2118', base: '#5d412b', light: '#8c6540', accent: '#b28b56' }),
  stone: freezeRamp({ shadow: '#2a2b31', base: '#535660', light: '#878a92', accent: '#b8b9b5' }),
  gold: freezeRamp({ shadow: '#68471d', base: '#a77932', light: '#d5ad55', accent: '#f0d987' }),
  veyrglass: freezeRamp({ shadow: '#243849', base: '#4f7184', light: '#9fc4d0', accent: '#d8f3f2' })
});

export const EFFECT_VISUAL_PALETTES = Object.freeze({
  radiant: freezeRamp({ shadow: '#6b5320', base: '#d5ad55', light: '#fff1b8', soft: 'rgba(213,173,85,0.20)' }),
  projectile: freezeRamp({ shadow: '#6b4b27', base: '#c78c43', light: '#f0d987', soft: 'rgba(199,140,67,0.18)' }),
  necrotic: CLASS_VISUAL_PALETTES.necromancer,
  nature: CLASS_VISUAL_PALETTES.thornbinder,
  water: CLASS_VISUAL_PALETTES.waverider,
  eldritch: CLASS_VISUAL_PALETTES.eldritch,
  hostile: freezeRamp({ shadow: '#3b1518', base: '#a83e42', light: '#e07b6c', soft: 'rgba(168,62,66,0.18)' }),
  spectral: freezeRamp({ shadow: '#26333e', base: '#648292', light: '#b5d4d8', soft: 'rgba(100,130,146,0.18)' })
});

export const UI_VISUAL_PALETTE = freezeRamp({
  ink: '#080a0e',
  panel: 'rgba(8,10,14,0.76)',
  panelStrong: 'rgba(8,10,14,0.90)',
  outline: 'rgba(235,238,240,0.22)',
  text: '#edf0f2',
  muted: '#a9b0b8',
  focus: '#e2bd62',
  danger: '#d86a4a'
});

export function getClassVisualPalette(classId) {
  const normalized = classId === 'templar'
    ? 'oathkeeper'
    : classId === 'hydromancer'
      ? 'waverider'
      : classId === 'mercenary'
        ? 'fellhunter'
      : classId;
  return CLASS_VISUAL_PALETTES[normalized] || CLASS_VISUAL_PALETTES.default;
}

export function getFactionVisualPalette(factionId) {
  return FACTION_VISUAL_PALETTES[factionId] || null;
}

export function getClassAccentColor(classId) {
  return getClassVisualPalette(classId).accent;
}

export function getBiomeVisualPalette(biomeId) {
  return BIOME_VISUAL_PALETTES[biomeId] || BIOME_VISUAL_PALETTES.default;
}

export function getMaterialVisualPalette(materialId) {
  return MATERIAL_VISUAL_PALETTES[materialId] || MATERIAL_VISUAL_PALETTES.steel;
}

export function getEffectVisualPalette(effectId) {
  return EFFECT_VISUAL_PALETTES[effectId] || EFFECT_VISUAL_PALETTES.projectile;
}

export function applyPixelArtContext(ctx) {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
}

export function pixelSnap(value, quantum = 1) {
  const safeQuantum = Math.max(0.001, quantum || 1);
  return Math.round(value / safeQuantum) * safeQuantum;
}

export function steppedTime(timeSeconds, fps = 8) {
  const safeFps = Math.max(1, fps || 8);
  return Math.floor((timeSeconds || 0) * safeFps) / safeFps;
}

export function steppedSine(timeSeconds, angularSpeed = 1, amplitude = 1, fps = 8, phase = 0) {
  return pixelSnap(Math.sin(steppedTime(timeSeconds, fps) * angularSpeed + phase) * amplitude, 0.25);
}

export function steppedPulse(timeSeconds, min = 0, max = 1, fps = 8, angularSpeed = 1) {
  const unit = (steppedSine(timeSeconds, angularSpeed, 1, fps) + 1) * 0.5;
  return min + (max - min) * unit;
}

export function drawPixelGroundShadow(ctx, x, y, rx, ry, options = {}) {
  if (!ctx) return;

  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = options.color || MASTER_VISUAL_PALETTE.groundShadow;
  ctx.beginPath();
  ctx.ellipse(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(rx)),
    Math.max(1, Math.round(ry)),
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  if (options.contact !== false) {
    ctx.globalAlpha = (options.alpha ?? 1) * 0.42;
    ctx.fillStyle = MASTER_VISUAL_PALETTE.groundShadowDeep;
    ctx.fillRect(
      Math.round(x - rx * 0.45),
      Math.round(y - 1),
      Math.max(2, Math.round(rx * 0.9)),
      Math.max(1, Math.round(ry * 0.45))
    );
  }

  ctx.restore();
}

export function drawOutlinedText(ctx, text, x, y, options = {}) {
  if (!ctx || !text) return;

  ctx.save();
  ctx.font = options.font || 'bold 12px sans-serif';
  ctx.textAlign = options.align || 'center';
  ctx.textBaseline = options.baseline || 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = options.outlineWidth || 3;
  ctx.strokeStyle = options.outline || 'rgba(5,6,9,0.9)';
  ctx.strokeText(text, Math.round(x), Math.round(y));
  ctx.fillStyle = options.color || UI_VISUAL_PALETTE.text;
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}
