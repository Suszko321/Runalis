// Shared generated gear art direction for canvas models and HTML inventory UI.
//
// Profiles are inferred from existing item data and IDs. They are visual-only:
// item stats, slots, equipment behavior, combat, and saves remain untouched.

import { artIconMarkup, itemArtIconIndex, equipmentIconMarkup } from './artIcons.js';
import {FACTION_STYLES} from './enemyVisualProfiles.js';
import {
  getClassVisualPalette,
  getMaterialVisualPalette,
  MASTER_VISUAL_PALETTE
} from './visualStyle.js';

const SPECIAL_PALETTES = Object.freeze({
  veyr: Object.freeze({
    ink: '#0b111a',
    shadow: '#243849',
    base: '#4f7184',
    mid: '#9fc4d0',
    light: '#d8f3f2',
    accent: '#9fc4d0'
  }),
  grave: Object.freeze({
    ink: '#0b0910',
    shadow: '#25202a',
    base: '#514b57',
    mid: '#857b8e',
    light: '#d7d0d9',
    accent: '#a86bd6'
  }),
  frontier: Object.freeze({
    ink: '#15120f',
    shadow: '#30251d',
    base: '#66503b',
    mid: '#997956',
    light: '#d0b17c',
    accent: '#c65f38'
  })
});

const GEAR_PROFILE_CACHE = new Map();

export function getGearVisualProfile(itemId, item = {}, classId = null) {
  const cacheKey = [
    itemId || item?.id || '',
    item?.name || '',
    item?.slot || '',
    item?.type || '',
    item?.weaponType || '',
    classId || ''
  ].join('|');
  const cached = GEAR_PROFILE_CACHE.get(cacheKey);
  if (cached) return cached;

  const text = `${itemId || ''} ${item?.name || ''} ${(item?.traits || []).join(' ')}`.toLowerCase();
  const slot = item?.slot || inferSlot(text, item?.type);
  const weaponType = inferVisualWeaponType(text, item?.weaponType);
  const archetype = inferArchetype(text, classId);
  const material = inferMaterial(text, slot, weaponType);
  const palette = getArchetypePalette(archetype);
  const materialPalette = getMaterialVisualPalette(material);

  const factionStyle=FACTION_STYLES[item.visualFactionId];
  const profile = Object.freeze({
    itemId: itemId || item?.id || '',
    slot,
    weaponType,
    archetype,
    material,
    silhouette: item.visualSilhouette || inferSilhouette(text, slot, weaponType, archetype),
    rarity: item?.rarity || 'common',
    outline: palette.ink || MASTER_VISUAL_PALETTE.outline,
    deep: palette.shadow || materialPalette.shadow,
    base: palette.base || materialPalette.base,
    mid: palette.mid || materialPalette.light,
    light: palette.light || materialPalette.accent,
    accent: palette.accent || materialPalette.accent,
    classId: archetype === 'frontier' ? classId : archetype,
    ...(item.visualPalette?{...item.visualPalette,faction:'mythical',mythical:true}:{}),
    ...(factionStyle?{faction:item.visualFactionId,visualPart:item.visualPart,silhouette:item.visualSilhouette||inferSilhouette(text,slot,weaponType,archetype),
      base:factionStyle.base,mid:factionStyle.mid,light:factionStyle.light,accent:factionStyle.accent,deep:'#211e22',outline:'#121419'}:{})
  });

  GEAR_PROFILE_CACHE.set(cacheKey, profile);
  return profile;
}

export function itemIconMarkup(item, options = {}) {
  if (!item) {
    return '<span class="pixel-item-art empty" aria-hidden="true"><span class="pixel-item-shape"></span></span>';
  }
  if(item.type==='scroll'&&item.learnsAbility)return `<img src="assets/combat-icons/${String(item.learnsAbility).replace(/[^a-zA-Z0-9_-]/g,'')}.svg" class="inventory-art-icon" width="32" height="32" alt="" aria-hidden="true">`;

  const profile = getGearVisualProfile(item.id, item, options.classId);
  const equipmentArt=equipmentIconMarkup(item,profile);
  if(equipmentArt)return equipmentArt;
  const rasterIndex = itemArtIconIndex(item, profile);
  if (rasterIndex !== null) return artIconMarkup(rasterIndex, 'inventory-art-icon');
  const type = iconType(item, profile);
  const classes = [
    'pixel-item-art',
    `pixel-item-${safeToken(type)}`,
    `pixel-item-${safeToken(profile.silhouette)}`,
    `pixel-item-theme-${safeToken(profile.archetype)}`,
    `pixel-item-material-${safeToken(profile.material)}`
  ].join(' ');

  const style = [
    `--gear-outline:${profile.outline}`,
    `--gear-deep:${profile.deep}`,
    `--gear-base:${profile.base}`,
    `--gear-mid:${profile.mid}`,
    `--gear-light:${profile.light}`,
    `--gear-accent:${profile.accent}`
  ].join(';');

  return `<span class="${classes}" style="${style}" aria-hidden="true"><span class="pixel-item-shape"></span><span class="pixel-item-detail"></span><span class="pixel-item-accent"></span></span>`;
}

export function slotIconMarkup(slot) {
  const safeSlot = safeToken(slot || 'empty');
  return `<span class="pixel-item-art pixel-item-slot pixel-item-${safeSlot} empty" aria-hidden="true"><span class="pixel-item-shape"></span></span>`;
}

export function paperDollGearMarkup(player) {
  const equipment = player?.equipment || {};
  const entries = [
    ['helm', equipment.helm],
    ['chest', equipment.chest],
    ['legs', equipment.legs],
    ['weapon', equipment.weapon],
    ['trinket', equipment.trinket || equipment.jewelry]
  ];

  return entries
    .filter(([, itemId]) => !!itemId)
    .map(([slot, itemId]) => {
      const profile = getGearVisualProfile(itemId, { id: itemId, slot }, player?.classId);
      const classes = [
        'paper-doll-gear',
        `paper-doll-gear-${safeToken(slot)}`,
        `paper-doll-gear-${safeToken(profile.silhouette)}`,
        `paper-doll-gear-theme-${safeToken(profile.archetype)}`
      ].join(' ');
      const style = [
        `--gear-outline:${profile.outline}`,
        `--gear-deep:${profile.deep}`,
        `--gear-base:${profile.base}`,
        `--gear-mid:${profile.mid}`,
        `--gear-light:${profile.light}`,
        `--gear-accent:${profile.accent}`
      ].join(';');

      return `<div class="${classes}" style="${style}" aria-hidden="true"></div>`;
    })
    .join('');
}

function getArchetypePalette(archetype) {
  if (archetype === 'veyr') return SPECIAL_PALETTES.veyr;
  if (archetype === 'grave') return SPECIAL_PALETTES.grave;
  if (archetype === 'frontier') return SPECIAL_PALETTES.frontier;
  return getClassVisualPalette(archetype);
}

function inferArchetype(text, classId) {
  if (includesAny(text, ['dawnlens', 'sunfracture', 'uncrowned', 'pilgrim\'s focus', 'pilgrims focus'])) return 'oathkeeper';
  if (includesAny(text, ['eldritch', 'starless', 'red seal', 'redseal', 'cultist', 'blackstar', 'demon'])) return 'eldritch';
  if (includesAny(text, ['necro', 'lich', 'pale rune', 'palerune', 'grave scythe', 'bonehook', 'unburied', 'crown of the endless'])) return 'necromancer';
  if (includesAny(text, ['thorn', 'briar', 'root staff', 'rootstaff', 'heartroot', 'mirror root'])) return 'thornbinder';
  if (includesAny(text, ['tideglass', 'waverider', 'hydromancer', 'riptide', 'wellspring', 'deluge'])) return 'waverider';
  if (includesAny(text, ['knight', 'warded', 'oath', 'sunforged', 'dawnward', 'seraph', 'iron oath'])) return 'oathkeeper';
  if (includesAny(text, ['fellhunter', 'mercenary', 'roadless', 'hunter bow', 'ashwood', 'rogue', 'leather', 'ashbound'])) return 'mercenary';
  if (includesAny(text, ['veyr', 'watcher', 'mirror'])) return 'veyr';
  if (includesAny(text, ['gravebound', 'grave knife'])) return 'grave';
  return classId && getClassVisualPalette(classId) ? classId : 'frontier';
}

function inferMaterial(text, slot, weaponType) {
  if (includesAny(text, ['veyrglass', 'tideglass', 'watcher glass', 'mirror'])) return 'veyrglass';
  if (weaponType === 'spiritFocus') return includesAny(text, ['dawn', 'sun', 'halo', 'uncrowned']) ? 'stone' : 'steel';
  if (includesAny(text, ['bone', 'lich'])) return 'bone';
  if (includesAny(text, ['robe', 'hood', 'mantle', 'tunic', 'coat', 'garb', 'wrap'])) return 'cloth';
  if (includesAny(text, ['leather', 'hunter', 'roadless', 'rogue'])) return 'leather';
  if (includesAny(text, ['staff', 'bow', 'stick', 'root'])) return 'wood';
  if (slot === 'trinket') return includesAny(text, ['ring', 'iron']) ? 'steel' : 'stone';
  if (slot === 'weapon' && weaponType === 'eldritch') return 'stone';
  return 'steel';
}

function inferVisualWeaponType(text, explicit) {
  if (includesAny(text, ['old knife', 'grave knife', 'dagger'])) return 'dagger';
  if (explicit === 'spiritFocus' || includesAny(text, ['dawnlens', 'spirit focus', 'pilgrim\'s focus', 'pilgrims focus', 'sealglass prism', 'moonlit reliquary', 'grave-lens', 'red seal conductor', 'sunfracture gauntlet', 'uncrowned prism'])) return 'spiritFocus';
  if (includesAny(text, ['eldritch', 'conduit', 'starless'])) return 'eldritch';
  if (text.includes('scythe') || text.includes('crescent')) return 'scythe';
  if (text.includes('bow')) return 'bow';
  if (text.includes('staff') || text.includes('wand') || text.includes('stick')) return 'staff';
  if (explicit === 'shield') return 'shield';
  return explicit || 'sword';
}

function inferSilhouette(text, slot, weaponType, archetype) {
  if (slot === 'weapon') {
    if (weaponType === 'dagger') return 'dagger';
    if (weaponType === 'bow') return text.includes('longbow') ? 'longbow' : 'bow';
    if (weaponType === 'staff') return archetype === 'thornbinder' ? 'branchstaff' : 'staff';
    if (weaponType === 'scythe') return 'scythe';
    if (weaponType === 'spiritFocus') return text.includes('gauntlet') ? 'focusgauntlet' : text.includes('reliquary') ? 'reliquaryfocus' : 'spiritfocus';
    if (weaponType === 'eldritch') return 'conduit';
    return text.includes('rapier') ? 'rapier' : text.includes('black iron') ? 'greatsword' : 'sword';
  }

  if (slot === 'helm') {
    if (text.includes('halo')) return 'halo';
    if (text.includes('crown')) return 'crown';
    if (text.includes('hood')) return 'hood';
    return archetype === 'oathkeeper' || archetype === 'templar' || text.includes('helm') || text.includes('cap') ? 'helmet' : 'hood';
  }

  if (slot === 'chest') {
    if (includesAny(text, ['robe', 'mantle', 'garb'])) return 'robe';
    if (includesAny(text, ['coat', 'leather', 'tunic', 'vest'])) return 'coat';
    return 'plate';
  }

  if (slot === 'legs') return includesAny(text, ['wrap', 'cloth']) ? 'legwraps' : 'greaves';
  if (slot === 'trinket') return text.includes('ring') ? 'ring' : text.includes('lantern') ? 'lantern' : 'charm';
  if (itemTypeIsFood(text)) return 'food';
  return 'material';
}

function iconType(item, profile) {
  if (profile.slot) return profile.slot;
  if (item.type === 'tool') return item.skill === 'mining' ? 'pickaxe' : item.skill === 'fishing' ? 'rod' : 'sickle';
  if (item.type === 'food' || item.type === 'fish') return 'food';
  if (item.type === 'currency') return 'coin';
  if (item.type === 'quest') return 'quest';
  if (item.type === 'essence') return 'essence';
  if (item.type === 'reagent') return 'reagent';
  if (item.type === 'material' || item.type === 'crafting') return 'material';
  return item.type || 'material';
}

function inferSlot(text, type) {
  if (type === 'weapon' || includesAny(text, ['sword', 'knife', 'bow', 'staff', 'scythe', 'conduit', 'focus', 'dawnlens', 'prism', 'reliquary'])) return 'weapon';
  return null;
}

function itemTypeIsFood(text) {
  return includesAny(text, ['ration', 'stew', 'fish', 'tonic', 'fruit']);
}

function includesAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function safeToken(value) {
  return String(value || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '');
}
