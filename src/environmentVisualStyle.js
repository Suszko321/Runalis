// environmentVisualStyle.js
// Shared, lightweight regional art direction for terrain and world props.
// Profiles are static so renderers can reuse them without per-frame allocation.

function freezeProfile(profile) {
  return Object.freeze(profile);
}

export const ENVIRONMENT_VISUAL_PROFILES = Object.freeze({
  hearthmere: freezeProfile({
    id: 'hearthmere',
    tint: 'rgba(35,48,31,0.045)',
    fog: 'rgba(174,185,156,0.035)',
    fogShadow: 'rgba(10,18,13,0.08)',
    vignette: 'rgba(4,7,5,0.18)',
    bark: '#4b3020',
    barkDark: '#25160f',
    leafDark: '#102918',
    leafMid: '#24512c',
    leafLight: '#66814b',
    stone: '#555a61',
    stoneLight: '#90928e',
    stoneDark: '#20232a',
    accent: '#a9854e'
  }),
  orrakai: freezeProfile({
    id: 'orrakai',
    tint: 'rgba(93,82,58,0.035)',
    fog: 'rgba(222,201,156,0.025)',
    fogShadow: 'rgba(20,17,12,0.055)',
    vignette: 'rgba(8,7,5,0.13)',
    bark: '#4b3020',
    barkDark: '#25160f',
    leafDark: '#18311d',
    leafMid: '#315534',
    leafLight: '#6e7f4f',
    stone: '#5b5750',
    stoneLight: '#9c9688',
    stoneDark: '#292720',
    accent: '#d5ad55'
  }),
  thorn: freezeProfile({
    id: 'thorn',
    tint: 'rgba(29,54,32,0.055)',
    fog: 'rgba(121,157,88,0.035)',
    fogShadow: 'rgba(8,16,10,0.095)',
    vignette: 'rgba(3,7,4,0.23)',
    bark: '#382817',
    barkDark: '#160e08',
    leafDark: '#0d2114',
    leafMid: '#24442a',
    leafLight: '#6f8753',
    stone: '#3f4840',
    stoneLight: '#7f8f80',
    stoneDark: '#131916',
    accent: '#73d18a'
  }),
  mine: freezeProfile({
    id: 'mine',
    tint: 'rgba(35,40,43,0.055)',
    fog: 'rgba(120,135,141,0.025)',
    fogShadow: 'rgba(2,5,7,0.13)',
    vignette: 'rgba(1,3,5,0.27)',
    bark: '#352719',
    barkDark: '#130d08',
    leafDark: '#111817',
    leafMid: '#263230',
    leafLight: '#5f7169',
    stone: '#3f464c',
    stoneLight: '#7e8b92',
    stoneDark: '#10151a',
    accent: '#d0b56d'
  }),
  grave: freezeProfile({
    id: 'grave',
    tint: 'rgba(47,32,55,0.055)',
    fog: 'rgba(173,151,184,0.04)',
    fogShadow: 'rgba(12,8,15,0.10)',
    vignette: 'rgba(5,3,7,0.22)',
    bark: '#3c2b2d',
    barkDark: '#1c1217',
    leafDark: '#17151d',
    leafMid: '#30263a',
    leafLight: '#665174',
    stone: '#4c4b57',
    stoneLight: '#89838f',
    stoneDark: '#1b1921',
    accent: '#9c6db0'
  }),
  infernal: freezeProfile({
    id: 'infernal',
    tint: 'rgba(78,20,14,0.06)',
    fog: 'rgba(151,61,43,0.035)',
    fogShadow: 'rgba(21,5,4,0.11)',
    vignette: 'rgba(9,2,2,0.24)',
    bark: '#47231c',
    barkDark: '#1c0907',
    leafDark: '#21100f',
    leafMid: '#4b211c',
    leafLight: '#7f3b2c',
    stone: '#4a3533',
    stoneLight: '#8d6258',
    stoneDark: '#1d0c0b',
    accent: '#c2523f'
  }),
  covenant: freezeProfile({
    id: 'covenant',
    tint: 'rgba(114,94,49,0.045)',
    fog: 'rgba(236,226,186,0.035)',
    fogShadow: 'rgba(25,22,15,0.07)',
    vignette: 'rgba(8,8,6,0.16)',
    bark: '#55432b',
    barkDark: '#2a2015',
    leafDark: '#30361f',
    leafMid: '#5a6333',
    leafLight: '#9b9b57',
    stone: '#777166',
    stoneLight: '#c3bda9',
    stoneDark: '#34312d',
    accent: '#d5ad55'
  }),
  eldritch: freezeProfile({
    id: 'eldritch',
    tint: 'rgba(65,0,7,0.075)',
    fog: 'rgba(127,21,31,0.035)',
    fogShadow: 'rgba(5,0,1,0.14)',
    vignette: 'rgba(3,0,1,0.27)',
    bark: '#270b0e',
    barkDark: '#080203',
    leafDark: '#0b0304',
    leafMid: '#2c080d',
    leafLight: '#711821',
    stone: '#281419',
    stoneLight: '#6c2931',
    stoneDark: '#070203',
    accent: '#d73545'
  }),
  dungeon: freezeProfile({
    id: 'dungeon',
    tint: 'rgba(18,18,24,0.05)',
    fog: 'rgba(135,139,151,0.025)',
    fogShadow: 'rgba(3,4,7,0.12)',
    vignette: 'rgba(2,3,5,0.25)',
    bark: '#39271d',
    barkDark: '#1a110d',
    leafDark: '#141b17',
    leafMid: '#29362d',
    leafLight: '#586657',
    stone: '#4a4e58',
    stoneLight: '#858b95',
    stoneDark: '#181a20',
    accent: '#8e929c'
  })
});

const REGION_BIOME_PALETTES = Object.freeze({
  orrakai: Object.freeze({
    grass: freezeProfile({ base: '#213d26', base2: '#28472d', base3: '#315332', light: '#6d8f5e', dark: '#111b13', accent: '#8ca15f' }),
    path: freezeProfile({ base: '#5a4934', base2: '#63543c', base3: '#746347', light: '#b79b62', dark: '#241d14', accent: '#d5ad55' }),
    ruin: freezeProfile({ base: '#4b4842', base2: '#57534b', base3: '#666157', light: '#aaa292', dark: '#24221d', accent: '#d5ad55' }),
    wall: freezeProfile({ base: '#171b21', base2: '#20252d', base3: '#2b3038', light: '#7b818b', dark: '#07090d', accent: '#9facbf' })
  }),
  thorn: Object.freeze({
    grass: freezeProfile({ base: '#172517', base2: '#1e311f', base3: '#2a3f27', light: '#708d58', dark: '#070d08', accent: '#73d18a' }),
    path: freezeProfile({ base: '#31291e', base2: '#3e3324', base3: '#4b402c', light: '#917b52', dark: '#120e09', accent: '#9a7c4a' }),
    ruin: freezeProfile({ base: '#242b24', base2: '#30382d', base3: '#3e4738', light: '#829079', dark: '#0b0f0b', accent: '#73d18a' }),
    dead: freezeProfile({ base: '#201b18', base2: '#2b241f', base3: '#3a3028', light: '#7b6045', dark: '#090706', accent: '#8f6b45' }),
    wall: freezeProfile({ base: '#101610', base2: '#171f17', base3: '#202b20', light: '#63715d', dark: '#040604', accent: '#73d18a' })
  }),
  mine: Object.freeze({
    ore: freezeProfile({ base: '#22282c', base2: '#2b3338', base3: '#354047', light: '#8d9aa2', dark: '#090d10', accent: '#d0b56d' }),
    ruin: freezeProfile({ base: '#25292c', base2: '#30363a', base3: '#3a4248', light: '#8b9298', dark: '#0b0e11', accent: '#d0b56d' }),
    path: freezeProfile({ base: '#332c24', base2: '#40362b', base3: '#4d4132', light: '#9e8053', dark: '#120f0b', accent: '#d0b56d' }),
    water: freezeProfile({ base: '#102532', base2: '#143142', base3: '#183b4f', light: '#6fa0b4', dark: '#03090d', accent: '#9fc4d0' }),
    wall: freezeProfile({ base: '#0e1215', base2: '#171c20', base3: '#20272c', light: '#69747b', dark: '#020405', accent: '#8d9aa2' })
  }),
  grave: Object.freeze({
    grass: freezeProfile({ base: '#17141a', base2: '#211b25', base3: '#302539', light: '#70547d', dark: '#08070a', accent: '#a17bb0' }),
    dead: freezeProfile({ base: '#161116', base2: '#211821', base3: '#302232', light: '#765278', dark: '#070507', accent: '#a176a3' }),
    ruin: freezeProfile({ base: '#24222b', base2: '#302c39', base3: '#403949', light: '#91889a', dark: '#0b0a0e', accent: '#b9acbe' })
  }),
  infernal: Object.freeze({
    grass: freezeProfile({ base: '#1d1412', base2: '#2a1916', base3: '#3b211b', light: '#7d4032', dark: '#080403', accent: '#b35d43' }),
    dead: freezeProfile({ base: '#1b0d0d', base2: '#2b1110', base3: '#421916', light: '#8e342e', dark: '#060202', accent: '#c2523f' }),
    ruin: freezeProfile({ base: '#251b1a', base2: '#332321', base3: '#49302b', light: '#946258', dark: '#090404', accent: '#c77a64' }),
    wall: freezeProfile({ base: '#100707', base2: '#1b0b0b', base3: '#2b1111', light: '#662b27', dark: '#030101', accent: '#9b4236' })
  }),
  covenant: Object.freeze({
    grass: freezeProfile({ base: '#30351f', base2: '#3b4225', base3: '#4c512d', light: '#94945b', dark: '#17190e', accent: '#c4b66b' }),
    path: freezeProfile({ base: '#4b4030', base2: '#5a4e38', base3: '#6b5e43', light: '#c1a86d', dark: '#211c15', accent: '#dfc682' }),
    ruin: freezeProfile({ base: '#504b42', base2: '#625c50', base3: '#746e60', light: '#d2cab5', dark: '#22201c', accent: '#e2c878' }),
    wall: freezeProfile({ base: '#26251f', base2: '#35332a', base3: '#464338', light: '#a7a18e', dark: '#0f0f0c', accent: '#d5ad55' })
  }),
  eldritch: Object.freeze({
    grass: freezeProfile({ base: '#0b0304', base2: '#140507', base3: '#20080b', light: '#5a141b', dark: '#020101', accent: '#a72735' }),
    path: freezeProfile({ base: '#1a0a0b', base2: '#281013', base3: '#38151a', light: '#7a2931', dark: '#050102', accent: '#bd3441' }),
    dead: freezeProfile({ base: '#090203', base2: '#130406', base3: '#24070b', light: '#64141e', dark: '#010000', accent: '#d73545' }),
    ruin: freezeProfile({ base: '#110609', base2: '#1d090d', base3: '#2e0c12', light: '#70212a', dark: '#020001', accent: '#c93140' }),
    ore: freezeProfile({ base: '#14070a', base2: '#220a0f', base3: '#35101a', light: '#831f2d', dark: '#020001', accent: '#e34451' }),
    wall: freezeProfile({ base: '#070203', base2: '#0d0305', base3: '#180509', light: '#4f1018', dark: '#000000', accent: '#b52230' }),
    water: freezeProfile({ base: '#0b0204', base2: '#150307', base3: '#21050a', light: '#6b1722', dark: '#010000', accent: '#c62a39' })
  })
});

export function getEnvironmentVisualProfile(world) {
  const identity = [
    world?.regionId,
    world?.theme,
    world?.mode,
    world?.name,
    world?.dungeonId,
    world?.routeId
  ].filter(Boolean).join(' ').toLowerCase();

  if (world?.mode === 'capital' || world?.mode === 'hub' || world?.mode === 'town' || identity.includes('orrakai')) {
    return ENVIRONMENT_VISUAL_PROFILES.orrakai;
  }

  if (identity.includes('ascension') || identity.includes('cosmic') || identity.includes('eldritch') || identity.includes('zephyr')) {
    return ENVIRONMENT_VISUAL_PROFILES.eldritch;
  }

  if (identity.includes('aureate') || identity.includes('holy') || identity.includes('choir') || identity.includes('covenant')) {
    return ENVIRONMENT_VISUAL_PROFILES.covenant;
  }

  if (identity.includes('demon') || identity.includes('ember') || identity.includes('infernal') || identity.includes('malakar')) {
    return ENVIRONMENT_VISUAL_PROFILES.infernal;
  }

  if (identity.includes('grave') || identity.includes('crypt') || identity.includes('veyr') || identity.includes('necrom')) {
    return ENVIRONMENT_VISUAL_PROFILES.grave;
  }

  if (identity.includes('thorn') || identity.includes('root') || identity.includes('hollow') || identity.includes('briar') || identity.includes('forest')) {
    return ENVIRONMENT_VISUAL_PROFILES.thorn;
  }

  if (identity.includes('mine') || identity.includes('mire') || identity.includes('cave') || identity.includes('iron')) {
    return ENVIRONMENT_VISUAL_PROFILES.mine;
  }

  if (identity.includes('dungeon') || identity.includes('tower')) {
    return ENVIRONMENT_VISUAL_PROFILES.dungeon;
  }

  return ENVIRONMENT_VISUAL_PROFILES.hearthmere;
}

export function getEnvironmentBiomePalette(world, biomeId, fallback) {
  const profile = getEnvironmentVisualProfile(world);
  return REGION_BIOME_PALETTES[profile.id]?.[biomeId] || fallback;
}
