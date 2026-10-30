import {ITEMS} from './data.js';
import {creatorClassInformationHtml} from './creatorClassInformation.js';
import {isClassAvailable} from './classData.js';
import {menuDirection,directionalMenuItem} from './menuNavigation.js';
// characterCreator.js
// Runalis character creation flow.
//
// Responsibilities:
// - Keep character appearance options data-driven.
// - Present a two-step creator: class identity first, appearance second.
// - Apply selected class and appearance to the player without changing the
//   public hooks used by the rest of the game.

import { renderUI } from './ui.js';
import {installMenuSheets,captureTouchMenuScroll} from './menuSheets.js';
import { drawLexiconShrine } from './lexiconPresentation.js';
import {
  chooseClass as chooseGameClass,
  CLASS_STARTER_GEAR
} from './gameInteraction.js';
import { drawHumanActor } from './humanRenderer.js?v=20260924b';
import {CLASS_PREVIEW_DEMOS,createClassPreviewDemo,drawClassPreviewDemo} from './classPreviewAnimation.js';

const CREATOR_SECRET_CODE = 'Sylvester11062';
const DEFAULT_CLASS_ID = 'gravecaller';
const CREATOR_HOLD_SECONDS = 0.85;
const CREATOR_HOLD_RESET_MS = 260;

const CREATOR_CLASS_DEFINITIONS = [
    {
      id: 'classless',
      name: 'Classless',
      role: 'Blank Slate / Challenge Start',
      difficulty: 'Very Hard',
      color: '#9facbf',
      origin: 'No order, no bloodline calling, no formal training',
      caravanReason: 'Travels because there is nowhere safer to stand, and because ordinary people still have to survive the same roads as heroes.',
      identity: 'A regular person with no class power. Classless characters have no class tree or passive. Blades and Stamina earn 25% extra XP; scroll and equipment skills remain available.',
      combatStyle: 'Rely on basic weapon attacks, dodging, gear, crafting, gathering, quest rewards, and player skill. Everything is earned the hard way.',
      strengths: ['True blank slate', 'Simple start', 'Challenge option'],
      tradeoffs: ['No class tree or passive', 'No starting active skill', 'Depends on weapons and learned scrolls'],
      startingGear: 'Novice Blade',
      startingAbility: 'No class skills'
    },
    {
      id: 'gravecaller',
      name: 'Gravecaller',
      role: 'Summoner / Necrotic Caster',
      difficulty: 'Moderate',
      color: '#b68cff',
      origin: 'Orrakai mortuary circles and outlaw bone rites',
      caravanReason: 'Travels with the caravan to keep dangerous relics moving and raise a protected bone coterie far from city law.',
      identity: 'A tactician who turns death into a disciplined escort. Gravecallers fight beside equipped skeletons, mark targets with spirit pressure, and win by making the battlefield feel crowded in their favor.',
      combatStyle: 'Build spirit pressure at range, command skeleton gear, and switch between support for the coterie and direct necrotic damage.',
      strengths: ['Persistent allies', 'Strong spirit scaling', 'Good control over priority targets'],
      tradeoffs: ['Needs setup time', 'Skeleton positioning matters', 'Less explosive without prepared coterie gear'],
      startingGear: 'Grave Scythe',
      startingAbility: 'Necrotic Bolt and Raise the Bound Dead'
    },
    {
      id: 'thornbinder',
      name: 'Thornbinder',
      role: 'Control / Sustained Damage / Support',
      difficulty: 'Easy to Moderate',
      color: '#6fae72',
      origin: 'Briar covens, living groves, and caravan hedge-witches',
      caravanReason: 'Joins the caravan to seed living wards through broken lands and study corruption where roots still survive.',
      identity: 'A patient battlefield shaper. Thornbinders lash enemies with vines, plant bramble hazards, soften damage with living growth, and let damage-over-time do quiet work.',
      combatStyle: 'Control space with thorns and roots, sustain allies lightly, and keep enemies slowed while poisons and briars finish the job.',
      strengths: ['Reliable crowd control', 'Steady damage-over-time', 'Flexible support tools'],
      tradeoffs: ['Less burst damage', 'Rewards careful placement', 'Effects are strongest when enemies stay in the kill zone'],
      startingGear: 'Root Staff',
      startingAbility: 'Thorn Lash'
    },
    {
      id: 'waverider',
      name: 'Waverider',
      role: 'Mobile Water Caster / Control / Sustain',
      difficulty: 'Easy to Moderate',
      color: '#59d7e8',
      origin: 'Tideglass channels and river-saint martial schools',
      caravanReason: 'Protects the caravan across ruined crossings and searches for old water shrines that can cleanse poisoned roads.',
      identity: 'A fluid caster who moves fights instead of standing still. Waveriders apply Soaked, slip through pressure, and turn water into both momentum and defense.',
      combatStyle: 'Flow between ranged torrents, wave control, mobility, and emergency sustain while keeping enemies off balance.',
      strengths: ['Strong mobility', 'Useful sustain', 'Good area control'],
      tradeoffs: ['Damage depends on rhythm', 'Can spend spirit quickly', 'Less durable when caught without movement tools'],
      startingGear: 'Tideglass Rapier',
      startingAbility: 'Water Torrent'
    },
    {
      id: 'lightbringer',
      name: 'Lightbringer',
      role: 'Ranged Damage / Beam Caster',
      difficulty: 'Moderate',
      color: '#fff1b8',
      origin: 'Sun-vow chapels and lens-bearing pilgrim orders',
      caravanReason: 'Rides with the caravan to burn back corruption where dawn cannot reach and recover broken light relics.',
      identity: 'A radiant channeler built around clear aim and commitment. Lightbringers build Lumens, line enemies up, and carve through groups with a focused Dawncarver beam.',
      combatStyle: 'Tag targets with gleam magic, manage Lumens, then channel radiant beams and shields at the right moment.',
      strengths: ['Strong beam attacks', 'Builds Lumens for stronger spells', 'Nearby ally shielding'],
      tradeoffs: ['Channels can expose you', 'Requires aim and positioning', 'Best damage comes from lining up multiple enemies'],
      startingGear: 'Cracked Dawnlens',
      startingAbility: 'Gleam Bolt'
    },
    {
      id: 'oathkeeper',
      name: 'Oathkeeper',
      role: 'Tank / Melee Bruiser / Holy Area Control',
      difficulty: 'Easy',
      color: '#ffcc66',
      origin: 'Vowforged shield halls and road-warden temples',
      caravanReason: 'Swears to hold the caravan line, protect travelers, and prove that an oath still means something in a failing world.',
      identity: 'A front-line anchor. Oathkeepers survive pressure, punish enemies up close, and create holy space where allies can breathe.',
      combatStyle: 'Close distance, block or absorb punishment, and answer with smites, leaps, and durable holy pressure.',
      strengths: ['High durability', 'Simple combat plan', 'Strong close-range presence'],
      tradeoffs: ['Slower pace', 'Shorter reach', 'Less flexible against spread enemies'],
      startingGear: 'Oathkeeper Mace and Cracked Vow Shield',
      startingAbility: 'Oath Strike'
    },
    {
      id: 'fellhunter',
      name: 'Fellhunter',
      role: 'Traps / Weapon Damage / Mobility',
      difficulty: 'Moderate to Hard',
      color: '#ef8b58',
      origin: 'Border scouts, monster trappers, and ash-road survivalists',
      caravanReason: 'Takes caravan work because the roads are full of things worth hunting, and because people who travel unprepared need someone ruthless nearby.',
      identity: 'A practical survivor who prepares every fight. Fellhunters combine any weapon with traps, throwing blades, hunting handbows, bombs and terrain.',
      combatStyle: 'Prepare a kill zone, kite with tools, punish movement, and use mobility to stay one step ahead.',
      strengths: ['Great trap utility', 'Good burst windows', 'Strong tactical movement'],
      tradeoffs: ['Setup-heavy', 'Less magical defense', 'Punished by poor spacing'],
      startingGear: 'Hunter Bow',
      startingAbility: 'Throwing Daggers'
    },
    {
      id: 'eldritch',
      name: 'Eldritch',
      role: 'Secret / Channeled Horror',
      difficulty: 'Hard',
      color: '#ef4056',
      origin: 'A path that should not be mapped',
      caravanReason: 'The caravan does not fully know what it has invited aboard.',
      identity: 'A forbidden channeler of red-black storms, void movement, and a summoned horror that looks back.',
      combatStyle: 'Warp through danger, channel destructive void magic, and lean into unstable spirit power.',
      strengths: ['Unusual mobility', 'High spirit pressure', 'Powerful summoned threat'],
      tradeoffs: ['Some channels drain health', 'Requires aim and positioning', 'Sustained casting spends Spirit quickly'],
      startingGear: 'Eldritch Conduit',
      startingAbility: 'Voidstep Burst',
      hidden: true
    }
];

export const CHARACTER_CREATOR_OPTIONS = {
  classes: CREATOR_CLASS_DEFINITIONS.filter(option=>isClassAvailable(option.id)),
  bodyTypes: [
    { id: 'male', name: 'Male' },
    { id: 'female', name: 'Female' }
  ],

  hairStyles: [
    { id: 'short', name: 'Short' },
    { id: 'tied', name: 'Tied' },
    { id: 'long', name: 'Long' },
    { id: 'shaved', name: 'Shaved' }
  ],

  skinColors: [
    { id: 'porcelain', name: 'Porcelain', value: '#f4d8cd' },
    { id: 'fair', name: 'Fair', value: '#ffd1bd' },
    { id: 'rose', name: 'Rose Warm', value: '#e8b49f' },
    { id: 'warm', name: 'Warm', value: '#d79b73' },
    { id: 'golden', name: 'Golden', value: '#c98f5f' },
    { id: 'tan', name: 'Tan', value: '#b97854' },
    { id: 'olive', name: 'Olive', value: '#9a7458' },
    { id: 'brown', name: 'Brown', value: '#7a4a35' },
    { id: 'mahogany', name: 'Mahogany', value: '#5b3326' },
    { id: 'deep', name: 'Deep', value: '#3f261d' },
    { id: 'ebony', name: 'Ebony', value: '#21140f' },
    { id: 'ashen', name: 'Ashen', value: '#b8b0a8' },
    { id: 'paleAsh', name: 'Pale Ash', value: '#d0c9c0' }
  ],

  hairColors: [
    { id: 'black', name: 'Black', value: '#0b0d12' },
    { id: 'blueBlack', name: 'Blue Black', value: '#101725' },
    { id: 'brown', name: 'Brown', value: '#4a2b18' },
    { id: 'darkBrown', name: 'Dark Brown', value: '#25150d' },
    { id: 'chestnut', name: 'Chestnut', value: '#6b3b22' },
    { id: 'auburn', name: 'Auburn', value: '#7c3723' },
    { id: 'copper', name: 'Copper', value: '#b35b2a' },
    { id: 'red', name: 'Red', value: '#9e2f2a' },
    { id: 'blonde', name: 'Blonde', value: '#d8c891' },
    { id: 'straw', name: 'Straw', value: '#e6d38b' },
    { id: 'white', name: 'White', value: '#e8edf5' },
    { id: 'silver', name: 'Silver', value: '#b8c0ca' },
    { id: 'violet', name: 'Occult Violet', value: '#482f55' },
    { id: 'midnightBlue', name: 'Midnight Blue', value: '#1d2e5f' },
    { id: 'mossGreen', name: 'Moss Green', value: '#314c35' },
    { id: 'rose', name: 'Rose', value: '#b85b7a' }
  ],

  eyeColors: [
    { id: 'black', name: 'Black', value: '#050507' },
    { id: 'hazel', name: 'Hazel', value: '#b38a46' },
    { id: 'brown', name: 'Brown', value: '#53341d' },
    { id: 'amber', name: 'Amber', value: '#d8952e' },
    { id: 'green', name: 'Green', value: '#6da06e' },
    { id: 'paleGreen', name: 'Pale Green', value: '#a9d38e' },
    { id: 'teal', name: 'Teal', value: '#4fc1b7' },
    { id: 'blue', name: 'Blue', value: '#74a7d8' },
    { id: 'cyan', name: 'Cyan', value: '#70e8ff' },
    { id: 'gray', name: 'Gray', value: '#9aa1ab' },
    { id: 'silver', name: 'Silver', value: '#d6dce5' },
    { id: 'gold', name: 'Gold', value: '#ffd86b' },
    { id: 'violet', name: 'Violet', value: '#b58cff' },
    { id: 'red', name: 'Red', value: '#e34b56' }
  ],

  faceStyles: [
    { id: 'balanced', name: 'Balanced' },
    { id: 'sharp', name: 'Sharp' },
    { id: 'soft', name: 'Soft' },
    { id: 'weathered', name: 'Weathered' }
  ],

  facialHair: [
    { id: 'none', name: 'None' },
    { id: 'stubble', name: 'Stubble' },
    { id: 'shortBeard', name: 'Short Beard' },
    { id: 'fullBeard', name: 'Full Beard' }
  ],

  shirtColors: [
    { id: 'wandererGold', name: 'Wanderer Gold', value: '#f2a51f' },
    { id: 'sunGold', name: 'Sun Gold', value: '#ffd15c' },
    { id: 'ivory', name: 'Ivory', value: '#e8dfc7' },
    { id: 'white', name: 'White', value: '#f0f3f6' },
    { id: 'forestGreen', name: 'Forest Green', value: '#446b42' },
    { id: 'sage', name: 'Sage', value: '#758f66' },
    { id: 'teal', name: 'Teal', value: '#25706a' },
    { id: 'deepBlue', name: 'Deep Blue', value: '#293fba' },
    { id: 'steelBlue', name: 'Steel Blue', value: '#405d78' },
    { id: 'indigo', name: 'Indigo', value: '#3f347e' },
    { id: 'wineRed', name: 'Wine Red', value: '#7a2e35' },
    { id: 'crimson', name: 'Crimson', value: '#a6313e' },
    { id: 'rust', name: 'Rust', value: '#9a4e2c' },
    { id: 'charcoal', name: 'Charcoal', value: '#2b2f38' },
    { id: 'black', name: 'Black', value: '#101116' },
    { id: 'ashGray', name: 'Ash Gray', value: '#666d78' },
    { id: 'necroticPurple', name: 'Necrotic Purple', value: '#482f55' }
  ],

  pantsColors: [
    { id: 'travelerBlue', name: 'Traveler Blue', value: '#263145' },
    { id: 'denim', name: 'Denim', value: '#334c6f' },
    { id: 'navy', name: 'Navy', value: '#151f37' },
    { id: 'darkBrown', name: 'Dark Brown', value: '#3a2a22' },
    { id: 'tan', name: 'Tan', value: '#806549' },
    { id: 'khaki', name: 'Khaki', value: '#8d8163' },
    { id: 'black', name: 'Black', value: '#151515' },
    { id: 'olive', name: 'Olive', value: '#37402d' },
    { id: 'deepGreen', name: 'Deep Green', value: '#1e3a2b' },
    { id: 'burgundy', name: 'Burgundy', value: '#4d1f2a' },
    { id: 'purple', name: 'Purple', value: '#3b2b55' },
    { id: 'bone', name: 'Bone', value: '#b7aa8a' },
    { id: 'gray', name: 'Gray', value: '#464b55' }
  ],

  bootColors: [
    { id: 'brownLeather', name: 'Brown Leather', value: '#3a2a22' },
    { id: 'tanLeather', name: 'Tan Leather', value: '#7b5334' },
    { id: 'redBrownLeather', name: 'Red Brown Leather', value: '#5a2f22' },
    { id: 'blackLeather', name: 'Black Leather', value: '#111111' },
    { id: 'darkSteel', name: 'Dark Steel', value: '#2d333b' },
    { id: 'grayWraps', name: 'Gray Wraps', value: '#4b4f58' },
    { id: 'whiteWraps', name: 'White Wraps', value: '#d8d3c7' },
    { id: 'oliveWraps', name: 'Olive Wraps', value: '#4f5b3b' },
    { id: 'burgundyLeather', name: 'Burgundy Leather', value: '#4a1d28' }
  ],

  accessories: [
    { id: 'none', name: 'None' },
    { id: 'earring', name: 'Earring' },
    { id: 'amulet', name: 'Amulet' },
    { id: 'mask', name: 'Half Mask' },
    { id: 'headband', name: 'Headband' }
  ],

  cloaks: [
    { id: 'none', name: 'None' },
    { id: 'shortCape', name: 'Short Cape' },
    { id: 'shoulderMantle', name: 'Shoulder Mantle' },
    { id: 'travelCloak', name: 'Travel Cloak' }
  ],

  markings: [
    { id: 'none', name: 'None' },
    { id: 'scar', name: 'Scar' },
    { id: 'freckles', name: 'Freckles' },
    { id: 'briarMark', name: 'Briar Mark' },
    { id: 'sunMark', name: 'Sun Mark' },
    { id: 'tideMark', name: 'Tide Mark' }
  ],

  accentColors: [
    { id: 'brass', name: 'Brass', value: '#c89145' },
    { id: 'gold', name: 'Gold', value: '#ffd15c' },
    { id: 'silver', name: 'Silver', value: '#cbd3dd' },
    { id: 'white', name: 'White', value: '#f2f4f7' },
    { id: 'black', name: 'Black', value: '#101116' },
    { id: 'bone', name: 'Bone', value: '#d6c8a6' },
    { id: 'rose', name: 'Rose', value: '#d66b8f' },
    { id: 'seaGlass', name: 'Seaglass', value: '#61d1c6' },
    { id: 'teal', name: 'Teal', value: '#2fd0bd' },
    { id: 'sapphire', name: 'Sapphire', value: '#4f8dff' },
    { id: 'emerald', name: 'Emerald', value: '#54c46b' },
    { id: 'ruby', name: 'Ruby', value: '#e0445f' },
    { id: 'sun', name: 'Sun', value: '#ffcf4f' },
    { id: 'ember', name: 'Ember', value: '#e7663c' },
    { id: 'violet', name: 'Violet', value: '#a57dff' },
    { id: 'shadow', name: 'Shadow', value: '#3a3146' }
  ]
};

export const DEFAULT_APPEARANCE = {
  name: '',
  bodyType: 'male',
  skinColor: 'fair',
  hairStyle: 'short',
  hairColor: 'black',
  eyeColor: 'hazel',
  faceStyle: 'balanced',
  facialHair: 'none',
  shirtColor: 'wandererGold',
  pantsColor: 'travelerBlue',
  bootColor: 'brownLeather',
  accessory: 'none',
  cloak: 'none',
  marking: 'none',
  accentColor: 'brass'
};

const APPEARANCE_GROUPS = [
  {
    id: 'identity',
    title: 'Identity',
    fields: [
      { id: 'bodyType', label: 'Build', groupId: 'bodyTypes' },
      { id: 'skinColor', label: 'Complexion', groupId: 'skinColors', color: true },
      { id: 'faceStyle', label: 'Face', groupId: 'faceStyles' },
      { id: 'eyeColor', label: 'Eyes', groupId: 'eyeColors', color: true }
    ]
  },
  {
    id: 'hair',
    title: 'Hair',
    fields: [
      { id: 'hairStyle', label: 'Hair Style', groupId: 'hairStyles' },
      { id: 'hairColor', label: 'Hair Color', groupId: 'hairColors', color: true },
      { id: 'facialHair', label: 'Facial Hair', groupId: 'facialHair' }
    ]
  },
  {
    id: 'outfit',
    title: 'Outfit',
    fields: [
      { id: 'shirtColor', label: 'Tunic', groupId: 'shirtColors', color: true },
      { id: 'pantsColor', label: 'Legwear', groupId: 'pantsColors', color: true },
      { id: 'bootColor', label: 'Boots', groupId: 'bootColors', color: true },
      { id: 'accentColor', label: 'Accent', groupId: 'accentColors', color: true }
    ]
  }
];

const APPEARANCE_FIELD_BY_ID = APPEARANCE_GROUPS
  .flatMap(group => group.fields.map(field => ({ ...field, sectionId: group.id })))
  .reduce((map, field) => {
    map[field.id] = field;
    return map;
  }, {});

export function ensurePlayerAppearance(player) {
  if (!player) return DEFAULT_APPEARANCE;

  player.appearance = normalizeAppearance({
    ...DEFAULT_APPEARANCE,
    ...(player.appearance || {}),
    name: player.appearance?.name || player.name || ''
  });

  return player.appearance;
}

export function applyAppearanceToPlayer(player, appearance = {}) {
  if (!player) return;

  const safeAppearance = normalizeAppearance(appearance);
  player.appearance = safeAppearance;

  if (safeAppearance.name) {
    player.name = safeAppearance.name;
  }

  player.bodyType = safeAppearance.bodyType;
  player.hairStyle = safeAppearance.hairStyle;
  player.skin = getOptionValue('skinColors', safeAppearance.skinColor);
  player.hair = getOptionValue('hairColors', safeAppearance.hairColor);
  player.shirt = getOptionValue('shirtColors', safeAppearance.shirtColor);
  player.pants = getOptionValue('pantsColors', safeAppearance.pantsColor);
  player.boots = getOptionValue('bootColors', safeAppearance.bootColor);
  player.eyeColor = getOptionValue('eyeColors', safeAppearance.eyeColor);
  player.faceStyle = safeAppearance.faceStyle;
  player.facialHair = safeAppearance.facialHair;
  player.accessory = safeAppearance.accessory;
  player.cloak = safeAppearance.cloak;
  player.marking = safeAppearance.marking;
  player.outfitAccent = getOptionValue('accentColors', safeAppearance.accentColor);
}

export function getAppearanceColors(appearance = {}) {
  const normalized = normalizeAppearance(appearance);

  return {
    bodyType: normalized.bodyType,
    hairStyle: normalized.hairStyle,
    skin: getOptionValue('skinColors', normalized.skinColor),
    hair: getOptionValue('hairColors', normalized.hairColor),
    shirt: getOptionValue('shirtColors', normalized.shirtColor),
    pants: getOptionValue('pantsColors', normalized.pantsColor),
    boots: getOptionValue('bootColors', normalized.bootColor),
    eyes: getOptionValue('eyeColors', normalized.eyeColor),
    accent: getOptionValue('accentColors', normalized.accentColor)
  };
}

export function openCharacterCreator(game) {
  if (!game?.player) return;

  ensureCharacterCreatorStyles();
  ensurePlayerAppearance(game.player);

  let overlay = document.getElementById('characterCreatorOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'characterCreatorOverlay';
    overlay.className = 'character-creator-overlay';
    document.body.appendChild(overlay);
  }

  const classLocked = !!game.player.classId;
  const state = {
    currentStep: classLocked ? 'appearance' : 'class',
    classId: normalizeCreatorClassId(game.player.classId) || DEFAULT_CLASS_ID,
    classLocked,
    eldritchUnlocked: isEldritchClassUnlocked(game.player),
    focusedId: '',
    holdYProgress: 0,
    statusText: classLocked
      ? `${game.player.className || selectedClassName(game.player.classId)} is already chosen.`
      : 'Choose the path your character starts with.'
  };

  if (!classLocked&&!getAvailableClassOptions(state).some(option => option.id === state.classId)) {
    state.classId = DEFAULT_CLASS_ID;
  }

  state.focusedId = classLocked ? firstAppearanceFocusId() : `class-${state.classId}`;

  overlay.__runalisGame = game;
  overlay.__creatorWorkingState = state;
  overlay.__creatorDemo = createClassPreviewDemo(state.classId, getNow() / 1000);
  overlay.__creatorWorkingAppearance = normalizeAppearance({
    ...game.player.appearance,
    name: game.player.appearance?.name || game.player.name || game.profileName || ''
  });

  overlay.dataset.requiresClassChoice = classLocked ? 'false' : 'true';
  overlay.dataset.ownerSlot = String(game.player.slot || game.player.playerNumber || 1);
  applyCreatorOwnerViewport(overlay, game);

  if (game.player.controllerSlotIndex !== null && game.player.controllerSlotIndex !== undefined) {
    overlay.dataset.controllerSlotIndex = String(game.player.controllerSlotIndex);
  } else {
    delete overlay.dataset.controllerSlotIndex;
  }

  overlay.classList.add('active');
  renderCharacterCreator(overlay);
}

export function closeCharacterCreator() {
  const overlay = document.getElementById('characterCreatorOverlay');

  if (overlay) {
    stopCreatorPreview(overlay);
    overlay.classList.remove('active');
    overlay.__runalisGame = null;
    overlay.__creatorWorkingState = null;
    overlay.__creatorDemo = null;
    overlay.__creatorWorkingAppearance = null;
    delete overlay.dataset.ownerSlot;
    delete overlay.dataset.compactViewport;
    delete overlay.dataset.controllerSlotIndex;
    delete overlay.dataset.creatorLastInputAt;
    delete overlay.dataset.creatorLastHoldAt;
    overlay.style.removeProperty('--owner-viewport-left');
    overlay.style.removeProperty('--owner-viewport-top');
    overlay.style.removeProperty('--owner-viewport-width');
    overlay.style.removeProperty('--owner-viewport-height');
  }
}

function applyCreatorOwnerViewport(overlay, game) {
  const hostGame = game?.hostGame || game;

  if (typeof hostGame?.applyOwnedMenuViewport === 'function') {
    hostGame.applyOwnedMenuViewport(overlay, game.player);
    return;
  }

  overlay.dataset.compactViewport = 'false';
  overlay.style.removeProperty('--owner-viewport-left');
  overlay.style.removeProperty('--owner-viewport-top');
  overlay.style.removeProperty('--owner-viewport-width');
  overlay.style.removeProperty('--owner-viewport-height');
}

export function handleCharacterCreatorControllerInput(input) {
  const overlay = document.getElementById('characterCreatorOverlay');

  if (!overlay?.classList.contains('active')) return false;


  updateCreatorHold(overlay, !!(input?.yHeld || input?.ability1Held));

  if (input?.lbPressed) {
    handleCreatorBackStep(overlay, 'lb');
  }

  if (input?.rbPressed) {
    handleCreatorForwardStep(overlay, 'rb');
  }

  if (input?.upPressed) moveCreatorFocus(overlay, 'up');
  if (input?.downPressed) moveCreatorFocus(overlay, 'down');

  if (input?.leftPressed || input?.rightPressed) {
    const direction = input.leftPressed ? -1 : 1;
    const focused = getFocusedCreatorItem(overlay);

    if (focused?.kind === 'appearance-row') {
      changeAppearanceField(overlay, focused.el.dataset.creatorField, direction);
    } else {
      moveCreatorFocus(overlay, input.leftPressed ? 'left' : 'right');
    }
  }

  if (input?.confirmPressed) {
    confirmCreatorFocus(overlay);
  }

  if (input?.xPressed) {
    randomizeCreatorFocusedSection(overlay);
  }

  if (input?.cancelPressed || input?.backPressed) {
    handleCreatorBackStep(overlay, 'b');
  }

  return true;
}

function renderCharacterCreator(overlay, options = {}) {
  if (!overlay?.classList.contains('active')) return;

  const state = getCreatorState(overlay);
  const appearance = getCreatorAppearance(overlay);
  const game = overlay.__runalisGame;
  const selectedClass = getClassOption(state.classId);
  const restoreScroll=overlay.dataset.creatorStep===state.currentStep?captureTouchMenuScroll(overlay):()=>{};

  stopCreatorPreview(overlay);
  overlay.dataset.creatorStep = state.currentStep;

  overlay.innerHTML = state.currentStep === 'class'
    ? classStepHtml(state, selectedClass)
    : appearanceStepHtml(state, appearance, selectedClass, game);

  bindCharacterCreatorEvents(overlay);
  startCreatorPreview(overlay);
  updateCreatorHoldVisual(overlay);
  restoreScroll();

  requestAnimationFrame(() => {
    if (!overlay.classList.contains('active')) return;

    if (!options.keepFocus && state.currentStep === 'appearance' && !state.focusedId) {
      state.focusedId = firstAppearanceFocusId();
    }

    applyCreatorFocus(overlay, state.focusedId);
  });
}

function classStepHtml(state, selectedClass) {
  const availableClasses = getAvailableClassOptions(state);

  return `
    <div class="character-creator-panel creator-step-class" role="dialog" aria-modal="true" aria-label="Character creation class selection">
      ${creatorHeaderHtml('Class Selection', 'Step 1 of 2', state.statusText)}
      <div class="creator-class-layout">
        <section class="creator-class-list-panel">
          <div class="creator-section-kicker">Choose Class</div>
          <div class="creator-class-list" aria-label="Playable classes">
            ${availableClasses.map((option, index) => classCardHtml(option, state, index)).join('')}
          </div>
          ${classUnlockHtml(state)}
        </section>
        ${previewPanelHtml(selectedClass, state, CLASS_PREVIEW_DEMOS[state.classId]?.caption || 'Your starting appearance and weapon.')}
        <section class="creator-info-panel" data-creator-class-detail>
          ${classDetailHtml(selectedClass,state)}
          <div class="creator-action-row">
            <button type="button" class="creator-secondary" data-creator-back data-focus-id="class-back" data-focus-kind="button" data-focus-row="90" data-focus-col="1">Back</button>
            <button type="button" class="creator-primary" data-creator-proceed data-focus-id="class-next" data-focus-kind="button" data-focus-row="90" data-focus-col="2">Continue</button>
          </div>
        </section>
      </div>
      ${creatorHelpBarHtml(state, 'class')}
    </div>
  `;
}

function appearanceStepHtml(state, appearance, selectedClass, game) {
  return `
    <div class="character-creator-panel creator-step-appearance" role="dialog" aria-modal="true" aria-label="Character appearance creator">
      ${creatorHeaderHtml('Appearance Creator', 'Step 2 of 2', state.statusText)}
      <div class="creator-appearance-layout">
        ${previewPanelHtml(selectedClass, state, 'Tune the character model before the journey begins.')}
        <section class="creator-appearance-panel">
          <div class="creator-name-card">
            <label for="creatorNameInput">Name</label>
            <input
              id="creatorNameInput"
              type="text"
              maxlength="22"
              value="${escapeHtml(appearance.name || game?.player?.name || '')}"
              autocomplete="off"
              spellcheck="false"
              data-creator-name
              data-focus-id="appearance-name"
              data-focus-kind="name-field"
              data-focus-row="0"
              data-focus-col="1"
            />
          </div>
          <div class="creator-appearance-groups">
            ${appearanceGroupsHtml(appearance)}
          </div>
          <div class="creator-action-row appearance-actions">
            <button type="button" class="creator-secondary" data-creator-back data-focus-id="appearance-back" data-focus-kind="button" data-focus-row="90" data-focus-col="1">Back</button>
            <button type="button" class="creator-secondary" data-creator-randomize data-focus-id="appearance-randomize" data-focus-kind="button" data-focus-row="90" data-focus-col="2">Random Look</button>
            <button type="button" class="creator-primary" data-creator-start data-focus-id="appearance-start" data-focus-kind="button" data-focus-row="90" data-focus-col="3">Start Game</button>
          </div>
        </section>
      </div>
      ${creatorHelpBarHtml(state, 'appearance')}
    </div>
  `;
}

function creatorHeaderHtml(title, stepLabel, statusText) {
  return `
    <header class="creator-topbar">
      <div>
        <span class="creator-eyebrow">Runalis</span>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="creator-step-badge">${escapeHtml(stepLabel)}</div>
      <p class="creator-status" data-creator-status>${escapeHtml(statusText || '')}</p>
    </header>
  `;
}

function classCardHtml(option, state, index) {
  const active = option.id === state.classId;
  const locked = state.classLocked && !active;

  return `
    <button
      type="button"
      class="creator-class-card ${active ? 'active' : ''}"
      style="--class-color:${escapeHtml(option.color || '#cdb9ff')}"
      data-creator-class="${escapeHtml(option.id)}"
      data-focus-id="class-${escapeHtml(option.id)}"
      data-focus-kind="class-card"
      data-focus-row="${index}"
      data-focus-col="0"
      ${locked ? 'disabled' : ''}
    >
      <span>
        <strong>${escapeHtml(option.name)}</strong>
        <small>${escapeHtml(option.role)}</small>
      </span>
      <i>${escapeHtml(option.difficulty || 'Normal')}</i>
    </button>
  `;
}

function classUnlockHtml(state) {
  if (state.eldritchUnlocked) {
    return '<p class="creator-secret-status">Hidden class unlocked.</p>';
  }

  return `
    <div class="creator-secret">
      <input type="password" placeholder="Unlock code" autocomplete="off" data-creator-code-input />
      <button type="button" data-creator-code-submit>Unlock</button>
      <p data-creator-code-status></p>
    </div>
  `;
}

function previewPanelHtml(selectedClass, state, caption) {
  return `
    <section class="creator-preview-panel" style="--class-color:${escapeHtml(selectedClass?.color || '#cdb9ff')}">
      <div class="creator-preview-heading">
        <span>${escapeHtml(selectedClass?.role || 'Class Preview')}</span>
        <h2>${escapeHtml(selectedClass?.name || 'Wayfarer')}</h2>
      </div>
      <div class="creator-canvas-shell">
        <canvas width="380" height="440" data-creator-preview aria-label="Character appearance preview" role="img"></canvas>
      </div>
      <div class="creator-preview-footer">
        <b>${escapeHtml(ITEMS[CLASS_STARTER_GEAR[selectedClass?.id]?.weapon]?.name || selectedClass?.startingGear || 'Starter Gear')}</b>
        <span>${escapeHtml(caption || '')}</span>
      </div>
      ${state.classLocked ? '<p class="creator-lock-note">Class is locked for existing characters. Appearance can still be changed.</p>' : ''}
    </section>
  `;
}

function classDetailHtml(option) {
  return creatorClassInformationHtml(option, CLASS_STARTER_GEAR[option?.id] || {});
}

function appearanceGroupsHtml(appearance) {
  return APPEARANCE_GROUPS.flatMap(group=>group.fields)
    .map((field,index)=>appearanceFieldRowHtml(field,appearance,index+1)).join('');
}

function appearanceFieldRowHtml(field, appearance, row) {
  const option = getOption(field.groupId, appearance[field.id]);

  return `
    <div
      class="creator-selector-row"
      role="button"
      tabindex="0"
      data-creator-row
      data-creator-field="${escapeHtml(field.id)}"
      data-focus-id="appearance-${escapeHtml(field.id)}"
      data-focus-kind="appearance-row"
      data-focus-row="${row}"
      data-focus-col="1"
    >
      <button type="button" tabindex="-1" aria-label="Previous ${escapeHtml(field.label)}" data-creator-prev="${escapeHtml(field.id)}">&lt;</button>
      <div class="selector-copy">
        <span>${escapeHtml(field.label)}</span>
        <strong>
          ${field.color ? `<i class="creator-color-dot" style="--dot:${escapeHtml(option?.value || '#fff')}"></i>` : ''}
          ${escapeHtml(option?.name || 'None')}
        </strong>
      </div>
      <button type="button" tabindex="-1" aria-label="Next ${escapeHtml(field.label)}" data-creator-next="${escapeHtml(field.id)}">&gt;</button>
    </div>
  `;
}

function creatorHelpBarHtml(state, step) {
  const holdLabel = step === 'class' ? 'Continue' : 'Start Game';
  const hints = step === 'class'
    ? ['D-pad Choose Class', 'B Back', `Hold Y ${holdLabel}`]
    : ['D-pad Up/Down Rows', 'D-pad Left/Right Change', 'LB Class', 'RB Section', 'B Back', `Hold Y ${holdLabel}`];

  return `
    <footer class="creator-helpbar">
      <div class="creator-hint-row">
        ${hints.map(hint => `<span>${escapeHtml(hint)}</span>`).join('')}
      </div>
      <div class="creator-hold-meter" data-creator-hold>
        <div><i data-creator-hold-fill style="width:${Math.round((state.holdYProgress || 0) * 100)}%"></i></div>
        <b>${escapeHtml(`Hold Y - ${holdLabel}`)}</b>
      </div>
    </footer>
  `;
}

function bindCharacterCreatorEvents(overlay) {
  installMenuSheets();
  const game = overlay.__runalisGame;
  const state = getCreatorState(overlay);
  const appearance = getCreatorAppearance(overlay);

  overlay.tabIndex = -1;
  overlay.focus({ preventScroll: true });

  overlay.querySelectorAll('[data-creator-class]').forEach(button => {
    button.onpointermove = () => selectCreatorClass(overlay, button.dataset.creatorClass, { render: true });
    button.onclick = () => selectCreatorClass(overlay, button.dataset.creatorClass, { render: true });
    button.ondblclick = () => goToAppearanceStep(overlay);
  });

  overlay.querySelector('[data-creator-proceed]')?.addEventListener('click', () => goToAppearanceStep(overlay));
  overlay.querySelector('[data-creator-start]')?.addEventListener('click', () => finishCharacterCreation(overlay));
  overlay.querySelectorAll('[data-creator-back]').forEach(button => {
    button.onclick = () => handleCreatorBackStep(overlay, 'button');
  });

  overlay.querySelectorAll('[data-creator-prev]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      changeAppearanceField(overlay, button.dataset.creatorPrev, -1);
    };
  });

  overlay.querySelectorAll('[data-creator-next]').forEach(button => {
    if (!button.dataset.creatorNext) return;
    button.onclick = event => {
      event.stopPropagation();
      changeAppearanceField(overlay, button.dataset.creatorNext, 1);
    };
  });

  overlay.querySelectorAll('[data-creator-row]').forEach(row => {
    row.onclick = event => {
      if (event.target?.matches?.('button')) return;
      changeAppearanceField(overlay, row.dataset.creatorField, 1);
    };
  });

  const nameInput = overlay.querySelector('[data-creator-name]');
  if (nameInput) {
    nameInput.oninput = () => {
      appearance.name = sanitizeCharacterName(nameInput.value);
      overlay.__creatorWorkingAppearance = normalizeAppearance(appearance);
    };
    nameInput.onfocus = () => setCreatorFocusedId(overlay, 'appearance-name');
  }

  overlay.querySelector('[data-creator-randomize]')?.addEventListener('click', () => {
    overlay.__creatorWorkingAppearance = normalizeAppearance({
      ...overlay.__creatorWorkingAppearance,
      ...randomAppearance(),
      name: overlay.__creatorWorkingAppearance?.name || game?.player?.name || ''
    });
    state.statusText = 'New look rolled. Adjust any row before starting.';
    renderCharacterCreator(overlay, { keepFocus: true });
  });

  const codeInput = overlay.querySelector('[data-creator-code-input]');
  const codeSubmit = overlay.querySelector('[data-creator-code-submit]');
  const codeStatus = overlay.querySelector('[data-creator-code-status]');

  if (codeInput && codeSubmit) {
    const submitSecretCode = () => {
      const code = String(codeInput.value || '').trim();

      if (code !== CREATOR_SECRET_CODE) {
        if (codeStatus) codeStatus.textContent = 'The code does not answer.';
        return;
      }

      unlockEldritchClass(game.player);
      state.eldritchUnlocked = true;
      state.classId = 'eldritch';
      state.focusedId = 'class-eldritch';
      state.statusText = 'A hidden path opened: Eldritch.';
      game.log?.('A hidden path opened: Eldritch.');
      renderCharacterCreator(overlay);
    };

    codeSubmit.onclick = submitSecretCode;
    codeInput.onkeydown = event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitSecretCode();
      }
    };
  }

  overlay.querySelectorAll('[data-focus-id]').forEach(control => {
    control.onfocus = () => {
      setCreatorFocusedId(overlay, control.dataset.focusId);
      if (control.dataset.creatorClass) selectCreatorClass(overlay, control.dataset.creatorClass, { render: true });
    };
  });

  overlay.onkeydown = event => {
    if (state.currentStep === 'class' && ['PageDown', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCreatorBackStep(overlay, 'keyboard');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      confirmCreatorFocus(overlay);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key.replace('Arrow', '').toLowerCase();
      if ((direction === 'left' || direction === 'right') && getFocusedCreatorItem(overlay)?.kind === 'appearance-row') {
        changeAppearanceField(overlay, getFocusedCreatorItem(overlay)?.el?.dataset?.creatorField, direction === 'left' ? -1 : 1);
      } else {
        moveCreatorFocus(overlay, direction);
      }
    }
  };
}


function selectCreatorClass(overlay, classId, options = {}) {
  const state = getCreatorState(overlay);
  const nextClassId = normalizeCreatorClassId(classId);

  if (!nextClassId || state.classLocked) return;
  if (!getAvailableClassOptions(state).some(option => option.id === nextClassId)) return;

  // Hovering or confirming the current card must not continually reset its cast.
  if (state.classId === nextClassId) {
    if (options.advance) goToAppearanceStep(overlay);
    return;
  }
  overlay.__creatorDemo = createClassPreviewDemo(nextClassId, getNow() / 1000);
  state.classId = nextClassId;
  state.focusedId = `class-${nextClassId}`;
  state.statusText = `${selectedClassName(nextClassId)} selected.`;
  state.holdYProgress = 0;

  if (options.advance) {
    goToAppearanceStep(overlay);
  } else if (options.render) {
    renderCharacterCreator(overlay, { keepFocus: true });
  }
}

function goToAppearanceStep(overlay) {
  const state = getCreatorState(overlay);

  state.currentStep = 'appearance';
  state.focusedId = firstAppearanceFocusId();
  state.statusText = 'Choose a name and appearance details.';
  state.holdYProgress = 0;
  renderCharacterCreator(overlay);
}

function handleCreatorForwardStep(overlay, source) {
  const state = getCreatorState(overlay);

  if (state.currentStep === 'class') {
    goToAppearanceStep(overlay);
    return;
  }

  if (state.currentStep === 'appearance' && source === 'rb') {
    focusNextAppearanceSection(overlay);
  }
}

function handleCreatorBackStep(overlay) {
  const state = getCreatorState(overlay);

  state.holdYProgress = 0;

  if (state.currentStep === 'appearance') {
    if (state.classLocked) {
      state.statusText = 'Class is locked, but appearance can still be changed.';
      closeCharacterCreator();
      return;
    }

    state.currentStep = 'class';
    overlay.__creatorDemo = createClassPreviewDemo(state.classId, getNow() / 1000);
    state.focusedId = `class-${state.classId || DEFAULT_CLASS_ID}`;
    state.statusText = 'Back to class selection.';
    renderCharacterCreator(overlay);
    return;
  }

  if (state.classLocked) {
    closeCharacterCreator();
    return;
  }

  state.statusText = 'Choose a class before starting the journey.';
  renderCharacterCreator(overlay, { keepFocus: true });
}

function finishCharacterCreation(overlay) {
  const game = overlay.__runalisGame;
  const state = getCreatorState(overlay);
  const appearance = normalizeAppearance(getCreatorAppearance(overlay));

  if (!game?.player) return;

  const hadClass = !!game.player.classId;
  applyAppearanceToPlayer(game.player, appearance);

  if (!game.player.classId) {
    chooseGameClass(game, state.classId || DEFAULT_CLASS_ID);
  }

  game.log?.(hadClass ? 'Appearance updated.' : 'Character ready.');
  game.save?.(false);
  closeCharacterCreator();
  renderUI(game.player, game.logLines || [], game);
}

function changeAppearanceField(overlay, fieldId, direction = 1) {
  const field = APPEARANCE_FIELD_BY_ID[fieldId];
  const appearance = getCreatorAppearance(overlay);
  const state = getCreatorState(overlay);

  if (!field) return;

  const options = CHARACTER_CREATOR_OPTIONS[field.groupId] || [];
  const currentIndex = Math.max(0, options.findIndex(option => option.id === appearance[field.id]));
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  const nextOption = options[nextIndex];

  if (!nextOption) return;

  appearance[field.id] = nextOption.id;
  overlay.__creatorWorkingAppearance = normalizeAppearance(appearance);
  state.focusedId = `appearance-${field.id}`;
  state.statusText = `${field.label}: ${nextOption.name}`;
  state.holdYProgress = 0;
  renderCharacterCreator(overlay, { keepFocus: true });
}

function randomizeCreatorFocusedSection(overlay) {
  const state = getCreatorState(overlay);
  const focused = getFocusedCreatorItem(overlay);
  const appearance = getCreatorAppearance(overlay);

  if (focused?.kind === 'appearance-row') {
    const fieldId = focused.el.dataset.creatorField;
    const field = APPEARANCE_FIELD_BY_ID[fieldId];
    if (!field) return;

    appearance[fieldId] = randomOptionId(field.groupId);
    overlay.__creatorWorkingAppearance = normalizeAppearance(appearance);
    state.statusText = `${field.label} randomized.`;
    renderCharacterCreator(overlay, { keepFocus: true });
    return;
  }

  if (state.currentStep === 'class' && !state.classLocked) {
    const classes = getAvailableClassOptions(state);
    const option = classes[Math.floor(Math.random() * classes.length)];
    if (option) selectCreatorClass(overlay, option.id, { render: true });
  }
}

function focusNextAppearanceSection(overlay) {
  const state = getCreatorState(overlay);
  const current = getFocusedCreatorItem(overlay);
  const fieldId = current?.el?.dataset?.creatorField;
  const currentSection = APPEARANCE_FIELD_BY_ID[fieldId]?.sectionId || 'identity';
  const sectionIds = APPEARANCE_GROUPS.map(group => group.id);
  const currentIndex = Math.max(0, sectionIds.indexOf(currentSection));
  const nextSection = sectionIds[(currentIndex + 1) % sectionIds.length];
  const nextField = APPEARANCE_GROUPS.find(group => group.id === nextSection)?.fields?.[0];

  if (nextField) {
    state.focusedId = `appearance-${nextField.id}`;
    state.statusText = `${APPEARANCE_GROUPS.find(group => group.id === nextSection)?.title || 'Appearance'} selected.`;
    applyCreatorFocus(overlay, state.focusedId);
  }
}

function confirmCreatorFocus(overlay) {
  const item = getFocusedCreatorItem(overlay);
  const state = getCreatorState(overlay);

  if (!item) {
    applyCreatorFocus(overlay, state.focusedId || firstCreatorFocusId(overlay));
    return;
  }

  if (item.kind === 'class-card') {
    selectCreatorClass(overlay, item.el.dataset.creatorClass, { render: true });
    return;
  }

  if (item.kind === 'appearance-row') {
    changeAppearanceField(overlay, item.el.dataset.creatorField, 1);
    return;
  }

  if (item.kind === 'name-field') {
    item.el.focus({ preventScroll: true });
    return;
  }

  item.el.click?.();
}

function moveCreatorFocus(overlay, direction) {
  const items = getCreatorFocusItems(overlay);
  if (!items.length) return;

  const current = getFocusedCreatorItem(overlay) || items[0];
  const vertical=getCreatorState(overlay).currentStep==='appearance'&&['up','down'].includes(direction);
  const next = vertical
    ? items[Math.max(0,Math.min(items.length-1,items.findIndex(item=>item.id===current.id)+(direction==='down'?1:-1)))]
    : findDirectionalCreatorItem(items, current, direction) || current;

  applyCreatorFocus(overlay, next.id);
  syncClassSelectionToFocusedCard(overlay, next);
}

function syncClassSelectionToFocusedCard(overlay, item) {
  const state = getCreatorState(overlay);

  if (state.currentStep !== 'class') return;
  if (state.classLocked) return;
  if (item?.kind !== 'class-card') return;

  const classId = item.el?.dataset?.creatorClass;
  if (!classId || classId === state.classId) return;

  selectCreatorClass(overlay, classId, { render: true });
}

function getCreatorFocusItems(overlay) {
  const selector=getCreatorState(overlay).currentStep==='class'?'[data-creator-class][data-focus-id]':'[data-focus-id]';
  return Array.from(overlay.querySelectorAll(selector))
    .filter(el => {
      if (el.disabled) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map(el => ({
      id: el.dataset.focusId,
      kind: el.dataset.focusKind || 'button',
      row: Number(el.dataset.focusRow || 0),
      col: Number(el.dataset.focusCol || 0),
      el,
      rect: el.getBoundingClientRect()
    }));
}

function getFocusedCreatorItem(overlay) {
  const state = getCreatorState(overlay);
  const items = getCreatorFocusItems(overlay);
  const active = document.activeElement;

  return items.find(item => item.el === active)
    || items.find(item => item.id === state.focusedId)
    || null;
}

function findDirectionalCreatorItem(items, current, direction) {
  const next=directionalMenuItem(items.map(item=>item.el),current.el,direction);
  return items.find(item=>item.el===next)||current;
}

function applyCreatorFocus(overlay, focusId) {
  const state = getCreatorState(overlay);
  const items = getCreatorFocusItems(overlay);
  const target = items.find(item => item.id === focusId) || items[0];

  overlay.querySelectorAll('.controller-focus').forEach(el => el.classList.remove('controller-focus'));

  if (!target) return;

  state.focusedId = target.id;
  target.el.classList.add('controller-focus');
  target.el.focus?.({ preventScroll: true });
}

function setCreatorFocusedId(overlay, focusId) {
  const state = getCreatorState(overlay);
  state.focusedId = focusId;
  overlay.querySelectorAll('.controller-focus').forEach(el => {
    el.classList.toggle('controller-focus', el.dataset.focusId === focusId);
  });
}

function updateCreatorHold(overlay, held) {
  const state = getCreatorState(overlay);
  const now = getNow();
  const lastInput = Number(overlay.dataset.creatorLastInputAt || now);
  const dt = Math.min(0.08, Math.max(0, (now - lastInput) / 1000));
  const lastHold = Number(overlay.dataset.creatorLastHoldAt || 0);

  overlay.dataset.creatorLastInputAt = String(now);

  if (!held) {
    if (state.holdYProgress !== 0) {
      state.holdYProgress = 0;
      updateCreatorHoldVisual(overlay);
    }
    return;
  }

  if (lastHold && now - lastHold > CREATOR_HOLD_RESET_MS) {
    state.holdYProgress = 0;
  }

  overlay.dataset.creatorLastHoldAt = String(now);
  state.holdYProgress = Math.min(1, (state.holdYProgress || 0) + dt / CREATOR_HOLD_SECONDS);
  updateCreatorHoldVisual(overlay);

  if (state.holdYProgress >= 1) {
    state.holdYProgress = 0;
    if (state.currentStep === 'class') {
      goToAppearanceStep(overlay);
    } else {
      finishCharacterCreation(overlay);
    }
  }
}

function updateCreatorHoldVisual(overlay) {
  const state = getCreatorState(overlay);
  const fill = overlay.querySelector('[data-creator-hold-fill]');
  const meter = overlay.querySelector('[data-creator-hold]');

  if (fill) fill.style.width = `${Math.round((state.holdYProgress || 0) * 100)}%`;
  if (meter) meter.classList.toggle('active', (state.holdYProgress || 0) > 0);
}

function startCreatorPreview(overlay) {
  const draw = () => {
    if (!overlay.classList.contains('active')) return;
    drawCreatorModelPreview(overlay);
    overlay.__creatorPreviewFrame = requestAnimationFrame(draw);
  };

  drawCreatorModelPreview(overlay);
  overlay.__creatorPreviewFrame = requestAnimationFrame(draw);
}

function stopCreatorPreview(overlay) {
  if (overlay?.__creatorPreviewFrame) {
    cancelAnimationFrame(overlay.__creatorPreviewFrame);
    overlay.__creatorPreviewFrame = null;
  }
}

function drawCreatorModelPreview(overlay) {
  const canvas = overlay.querySelector('[data-creator-preview]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const state = getCreatorState(overlay);
  const appearance = getCreatorAppearance(overlay);
  const selectedClass = getClassOption(state.classId);
  const colors = getAppearanceColors(appearance);
  const width = canvas.width;
  const height = canvas.height;
  const classColor = selectedClass?.color || '#cdb9ff';
  const weapon = CLASS_STARTER_GEAR[state.classId]?.weapon || null;
  const time = getNow() / 1000;

  ctx.clearRect(0, 0, width, height);

  drawLexiconShrine(ctx, width, height);

  drawPreviewBackdrop(ctx, width, height, classColor, state.classId, time);

  const actor = {
    // Center the full silhouette, leaving room for the Gravecaller's wide scythe.
    x: width / 2 - (state.classId === 'gravecaller' ? 64 : 0),
    y: height * 0.70,
    dirX: 0,
    dirY: 1,
    classId: state.classId,
    bodyType: appearance.bodyType,
    hairStyle: appearance.hairStyle,
    skin: colors.skin,
    hair: colors.hair,
    shirt: colors.shirt,
    pants: colors.pants,
    boots: colors.boots,
    appearance,
    equipment: { weapon, helm: null, chest: null, legs: null, trinket: CLASS_STARTER_GEAR[state.classId]?.trinket || null },
    hp: 100,
    maxHp: 100,
    actionState: {},
    combatState: {}
  };

  const appearanceOptions = {
    classId: state.classId, isPlayer: true, bodyType: appearance.bodyType,
    hairStyle: appearance.hairStyle, skin: colors.skin, hair: colors.hair,
    shirt: colors.shirt, pants: colors.pants, boots: colors.boots
  };
  if (state.currentStep === 'class') {
    if (overlay.__creatorDemo?.classId !== state.classId) overlay.__creatorDemo = createClassPreviewDemo(state.classId, time);
    const demo = overlay.__creatorDemo;
    drawClassPreviewDemo(ctx, actor, demo, time, appearanceOptions);
    return;
  }

  drawHumanActor(ctx, actor, { x: 0, y: 0 }, {
    scale: 4.2,
    classId: state.classId,
    isPlayer: true,
    bodyType: appearance.bodyType,
    hairStyle: appearance.hairStyle,
    skin: colors.skin,
    hair: colors.hair,
    shirt: colors.shirt,
    pants: colors.pants,
    boots: colors.boots
  });
}

function drawPreviewBackdrop(ctx, width, height, classColor, classId, time) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = classColor;
  ctx.lineWidth = 2;

  for (let i = 0; i < 5; i += 1) {
    const radius = 44 + i * 30 + Math.sin(time * 1.2 + i) * 2;
    ctx.globalAlpha = 0.18 - i * 0.02;
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.54, radius * 1.45, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = classColor;

  if (classId === 'lightbringer') {
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + time * 0.25;
      ctx.fillRect(width / 2 + Math.cos(angle) * 86 - 2, height * 0.34 + Math.sin(angle) * 40 - 8, 4, 16);
    }
  } else if (classId === 'thornbinder') {
    for (let i = 0; i < 9; i += 1) {
      ctx.fillRect(40 + i * 36, height - 60 - Math.sin(time + i) * 7, 3, 28);
    }
  } else if (classId === 'gravecaller') {
    ctx.font = '28px serif';
    ctx.fillText('x', width / 2 - 95, height * 0.33);
    ctx.fillText('x', width / 2 + 78, height * 0.42);
  }

  ctx.restore();
}

function drawPreviewBackCosmetics(ctx, actor, appearance, colors, classColor) {
  if (!appearance.cloak || appearance.cloak === 'none') return;

  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.scale(3.15, 3.15);
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = mix(colors.shirt, '#07080d', 0.42);
  ctx.strokeStyle = classColor;
  ctx.lineWidth = 1;

  if (appearance.cloak === 'shortCape') {
    roundedPreviewPath(ctx, [[-14, -26], [14, -26], [11, 5], [-11, 5]], 4);
  } else if (appearance.cloak === 'shoulderMantle') {
    roundedPreviewPath(ctx, [[-18, -27], [18, -27], [13, -12], [-13, -12]], 5);
  } else {
    roundedPreviewPath(ctx, [[-17, -27], [17, -27], [15, 14], [-15, 14]], 5);
  }

  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.restore();
}

function drawPreviewFrontCosmetics(ctx, actor, appearance, colors, classColor) {
  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.scale(3.15, 3.15);

  const accent = colors.accent || classColor;

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-2, -7, 4, 3);

  if (appearance.eyeColor) {
    ctx.fillStyle = colors.eyes;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-5, -35, 2, 1.4);
    ctx.fillRect(3, -35, 2, 1.4);
  }

  drawPreviewMarking(ctx, appearance.marking, classColor, accent);
  drawPreviewFacialHair(ctx, appearance.facialHair, colors.hair);
  drawPreviewAccessory(ctx, appearance.accessory, accent, classColor);
  ctx.restore();
}

function drawPreviewMarking(ctx, marking, classColor, accent) {
  if (!marking || marking === 'none') return;

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = marking === 'scar' ? '#e7c0aa' : accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 1;

  if (marking === 'scar') {
    ctx.beginPath();
    ctx.moveTo(5, -39);
    ctx.lineTo(-1, -31);
    ctx.stroke();
  } else if (marking === 'freckles') {
    [-5, -2, 3, 6].forEach((x, index) => ctx.fillRect(x, -33 + (index % 2), 1, 1));
  } else if (marking === 'briarMark') {
    ctx.strokeStyle = '#6fae72';
    ctx.beginPath();
    ctx.moveTo(-6, -37);
    ctx.quadraticCurveTo(-10, -34, -7, -30);
    ctx.stroke();
  } else if (marking === 'sunMark') {
    ctx.strokeStyle = classColor;
    ctx.beginPath();
    ctx.arc(0, -39, 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (marking === 'tideMark') {
    ctx.strokeStyle = '#59d7e8';
    ctx.beginPath();
    ctx.moveTo(-6, -32);
    ctx.quadraticCurveTo(0, -36, 6, -32);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPreviewFacialHair(ctx, facialHair, hairColor) {
  if (!facialHair || facialHair === 'none') return;

  ctx.save();
  ctx.fillStyle = hairColor;
  ctx.globalAlpha = facialHair === 'stubble' ? 0.42 : 0.82;

  if (facialHair === 'stubble') {
    ctx.fillRect(-5, -30, 10, 2);
  } else if (facialHair === 'shortBeard') {
    ctx.fillRect(-5, -30, 10, 4);
    ctx.fillRect(-3, -27, 6, 2);
  } else if (facialHair === 'fullBeard') {
    ctx.fillRect(-6, -31, 12, 6);
    ctx.fillRect(-4, -25, 8, 4);
  }

  ctx.restore();
}

function drawPreviewAccessory(ctx, accessory, accent, classColor) {
  if (!accessory || accessory === 'none') return;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1;

  if (accessory === 'earring') {
    ctx.beginPath();
    ctx.arc(9, -31, 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (accessory === 'amulet') {
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(0, -14);
    ctx.lineTo(5, -20);
    ctx.stroke();
    ctx.fillRect(-2, -15, 4, 4);
  } else if (accessory === 'mask') {
    ctx.fillStyle = mix(classColor, '#06070a', 0.55);
    ctx.fillRect(-8, -37, 16, 4);
  } else if (accessory === 'headband') {
    ctx.fillRect(-8, -40, 16, 2);
  }

  ctx.restore();
}

function roundedPreviewPath(ctx, points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
}

function getCreatorState(overlay) {
  overlay.__creatorWorkingState = overlay.__creatorWorkingState || {
    currentStep: 'class',
    classId: DEFAULT_CLASS_ID,
    classLocked: false,
    eldritchUnlocked: false,
    focusedId: `class-${DEFAULT_CLASS_ID}`,
    holdYProgress: 0,
    statusText: ''
  };

  return overlay.__creatorWorkingState;
}

function getCreatorAppearance(overlay) {
  overlay.__creatorWorkingAppearance = normalizeAppearance(overlay.__creatorWorkingAppearance || DEFAULT_APPEARANCE);
  return overlay.__creatorWorkingAppearance;
}

function firstCreatorFocusId(overlay) {
  return getCreatorFocusItems(overlay)[0]?.id || '';
}

function firstAppearanceFocusId() {
  return 'appearance-name';
}

function getAvailableClassOptions(state) {
  return CHARACTER_CREATOR_OPTIONS.classes.filter(option => {
    return !option.hidden || state.eldritchUnlocked || state.classId === option.id;
  });
}

function getClassOption(classId) {
  const normalized = normalizeCreatorClassId(classId) || DEFAULT_CLASS_ID;
  return CREATOR_CLASS_DEFINITIONS.find(option => option.id === normalized)
    || CREATOR_CLASS_DEFINITIONS.find(option => option.id === DEFAULT_CLASS_ID);
}

function selectedClassName(classId) {
  return getClassOption(classId)?.name || 'Class';
}

function normalizeCreatorClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId || null;
}

function normalizeAppearance(appearance = {}) {
  const normalized = {
    ...DEFAULT_APPEARANCE,
    ...(appearance || {})
  };

  normalized.name = sanitizeCharacterName(normalized.name);
  normalized.accessory='none';
  normalized.marking='none';
  normalized.cloak='none';

  for (const field of Object.values(APPEARANCE_FIELD_BY_ID)) {
    normalized[field.id] = validOptionId(field.groupId, normalized[field.id], DEFAULT_APPEARANCE[field.id]);
  }

  return normalized;
}

function validOptionId(groupId, id, fallback) {
  const group = CHARACTER_CREATOR_OPTIONS[groupId] || [];
  return group.some(option => option.id === id) ? id : fallback;
}

function getOption(groupId, optionId) {
  return (CHARACTER_CREATOR_OPTIONS[groupId] || []).find(entry => entry.id === optionId)
    || (CHARACTER_CREATOR_OPTIONS[groupId] || [])[0]
    || null;
}

function getOptionValue(groupId, optionId) {
  const option = getOption(groupId, optionId);
  return option?.value || '#ffffff';
}

function randomAppearance() {
  const appearance = {};

  for (const field of Object.values(APPEARANCE_FIELD_BY_ID)) {
    appearance[field.id] = randomOptionId(field.groupId);
  }

  return appearance;
}

function randomOptionId(groupId) {
  const group = CHARACTER_CREATOR_OPTIONS[groupId] || [];
  const index = Math.floor(Math.random() * group.length);
  return group[index]?.id || '';
}

function sanitizeCharacterName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 22);
}

function isEldritchClassUnlocked(player) {
  return !!(
    player?.hiddenClassUnlocks?.eldritch ||
    player?.secretClassUnlocks?.eldritch ||
    player?.classId === 'eldritch'
  );
}

function unlockEldritchClass(player) {
  if (!player) return;

  player.hiddenClassUnlocks = player.hiddenClassUnlocks && typeof player.hiddenClassUnlocks === 'object'
    ? player.hiddenClassUnlocks
    : {};

  player.hiddenClassUnlocks.eldritch = true;
}

function classGlyph(classId) {
  const glyphs = {
    classless: 'CL',
    gravecaller: 'GC',
    thornbinder: 'TB',
    waverider: 'WR',
    lightbringer: 'LB',
    oathkeeper: 'OK',
    fellhunter: 'FH',
    eldritch: 'ED'
  };

  return glyphs[classId] || 'RW';
}

function mix(a, b, amount = 0.5) {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  const r = Math.round(colorA.r + (colorB.r - colorA.r) * t);
  const g = Math.round(colorA.g + (colorB.g - colorA.g) * t);
  const blue = Math.round(colorA.b + (colorB.b - colorA.b) * t);
  return `rgb(${r}, ${g}, ${blue})`;
}

function hexToRgb(hex) {
  const safe = String(hex || '#ffffff').replace('#', '');
  const full = safe.length === 3
    ? safe.split('').map(char => char + char).join('')
    : safe.padEnd(6, 'f').slice(0, 6);

  return {
    r: Number.parseInt(full.slice(0, 2), 16) || 255,
    g: Number.parseInt(full.slice(2, 4), 16) || 255,
    b: Number.parseInt(full.slice(4, 6), 16) || 255
  };
}

function getNow() {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[c]));
}

export function ensureCharacterCreatorStyles() {
  if (document.getElementById('runalisCharacterCreatorStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisCharacterCreatorStyles';
  style.textContent = `
    .character-creator-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(3, 4, 8, 0.78);
      backdrop-filter: blur(5px);
      color: #f7edf8;
      font-family: inherit;
    }

    .character-creator-overlay.active {
      display: flex;
    }

    .character-creator-overlay[data-compact-viewport="true"],
    body.couch-coop-active .character-creator-overlay[data-owner-slot] {
      left: var(--owner-viewport-left, 0vw) !important;
      top: var(--owner-viewport-top, 0vh) !important;
      right: auto !important;
      bottom: auto !important;
      width: var(--owner-viewport-width, 100vw) !important;
      height: var(--owner-viewport-height, 100vh) !important;
      padding: 8px !important;
      align-items: stretch;
      justify-content: stretch;
    }

    .character-creator-panel {
      width: min(1480px, 98vw);
      height: min(880px, 96vh);
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 14px;
      border: 1px solid rgba(192, 126, 255, 0.46);
      background:
        linear-gradient(135deg, rgba(20, 17, 29, 0.98), rgba(8, 10, 15, 0.98)),
        #11131a;
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.58);
      padding: 18px;
    }

    .creator-topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(280px, 0.8fr);
      gap: 14px;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
    }

    .creator-eyebrow,
    .creator-section-kicker {
      display: block;
      color: #c9b0dc;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .creator-topbar h1 {
      margin: 2px 0 0;
      font-size: 28px;
      line-height: 1.05;
    }

    .creator-step-badge {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.07);
      padding: 8px 12px;
      font-weight: 900;
      color: #f4dfff;
      white-space: nowrap;
    }

    .creator-status {
      margin: 0;
      color: #c4bbc9;
      font-size: 14px;
      text-align: right;
    }

    .creator-class-layout {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(250px, 0.82fr) minmax(360px, 1fr) minmax(420px, 1.28fr);
      gap: 14px;
    }

    .creator-appearance-layout {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(390px, 0.9fr) minmax(650px, 1.35fr);
      gap: 14px;
    }

    .creator-class-list-panel,
    .creator-preview-panel,
    .creator-info-panel,
    .creator-appearance-panel {
      min-height: 0;
      background: rgba(5, 7, 12, 0.64);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 14px;
    }

    .creator-class-list-panel,
    .creator-info-panel,
    .creator-appearance-panel {
      overflow: hidden;
    }

    .creator-class-list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }

    .creator-class-card {
      width: 100%;
      min-height: 78px;
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr) auto;
      gap: 11px;
      align-items: center;
      text-align: left;
      border: 1px solid rgba(255, 255, 255, 0.11);
      background: rgba(255, 255, 255, 0.04);
      color: #eee8f1;
      padding: 10px;
      cursor: pointer;
    }

    .creator-class-card.active,
    .creator-class-card.controller-focus,
    .creator-selector-row.controller-focus,
    .creator-name-card input.controller-focus,
    .creator-action-row button.controller-focus {
      border-color: var(--class-color, #bd7cff);
      box-shadow: 0 0 0 2px rgba(188, 117, 255, 0.24), inset 0 0 22px rgba(188, 117, 255, 0.12);
      outline: none;
    }

    .class-card-glyph {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 1px solid color-mix(in srgb, var(--class-color, #bd7cff), white 20%);
      color: var(--class-color, #bd7cff);
      background: color-mix(in srgb, var(--class-color, #bd7cff), transparent 84%);
      font-weight: 1000;
      font-size: 12px;
    }

    .creator-class-card strong,
    .creator-preview-footer b {
      display: block;
      color: #fff8f2;
      font-size: 15px;
    }

    .creator-class-card small {
      display: block;
      color: #bcb4c4;
      line-height: 1.25;
      margin-top: 3px;
    }

    .creator-class-card i {
      font-style: normal;
      color: #d9c0e8;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      text-align: right;
    }

    .creator-secret {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      margin-top: 12px;
    }

    .creator-secret input,
    .creator-name-card input {
      min-width: 0;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(0, 0, 0, 0.28);
      color: #fff;
      padding: 10px;
      font: inherit;
    }

    .creator-secret button,
    .creator-action-row button,
    .creator-selector-row button {
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #f4edf8;
      background: rgba(255, 255, 255, 0.07);
      font: inherit;
      font-weight: 900;
      cursor: pointer;
    }

    .creator-secret button {
      padding: 0 12px;
    }

    .creator-secret-status,
    .creator-secret p {
      grid-column: 1 / -1;
      margin: 0;
      color: #bfb4c7;
      font-size: 12px;
    }

    .creator-preview-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      gap: 10px;
      overflow: hidden;
    }

    .creator-preview-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: end;
    }

    .creator-preview-heading span {
      color: var(--class-color, #d5adff);
      font-weight: 900;
      font-size: 12px;
    }

    .creator-preview-heading h2 {
      margin: 0;
      font-size: 24px;
      color: #fff7f0;
    }

    .creator-canvas-shell {
      min-height: 0;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--class-color, #d5adff), transparent 80%), rgba(0, 0, 0, 0.25));
    }

    .creator-canvas-shell canvas {
      width: min(100%, 390px);
      height: auto;
      image-rendering: pixelated;
    }

    .creator-preview-footer {
      display: grid;
      gap: 4px;
      color: #bdb3c4;
      font-size: 13px;
    }

    .creator-lock-note {
      margin: 0;
      color: #d2c2da;
      font-size: 12px;
    }

    .creator-info-panel {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto auto;
      gap: 12px;
    }

    .creator-detail-title {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
    }

    .creator-detail-title > span {
      width: 50px;
      height: 50px;
      display: grid;
      place-items: center;
      border: 1px solid var(--class-color, #d5adff);
      color: var(--class-color, #d5adff);
      font-weight: 1000;
      background: color-mix(in srgb, var(--class-color, #d5adff), transparent 84%);
    }

    .creator-detail-title h2 {
      margin: 0;
      font-size: 26px;
    }

    .creator-detail-title p,
    .creator-class-identity {
      margin: 0;
      color: #c7bfca;
      line-height: 1.45;
    }

    .creator-class-identity {
      font-size: 15px;
      color: #eee6f0;
    }

    .creator-detail-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .creator-detail-block,
    .creator-list-block {
      border-top: 1px solid rgba(255, 255, 255, 0.11);
      padding-top: 9px;
    }

    .creator-detail-block span,
    .creator-list-block span {
      display: block;
      color: #d9c2ec;
      font-size: 12px;
      font-weight: 1000;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .creator-detail-block p,
    .creator-list-block ul {
      margin: 0;
      color: #c9c1ca;
      line-height: 1.38;
      font-size: 13px;
    }

    .creator-strength-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .creator-list-block ul {
      padding-left: 18px;
    }

    .creator-action-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      align-items: center;
    }

    .creator-action-row button {
      min-height: 42px;
      padding: 0 16px;
    }

    .creator-action-row .creator-primary {
      border-color: rgba(255, 228, 165, 0.45);
      color: #1b1410;
      background: linear-gradient(180deg, #ffe7a6, #c99042);
    }

    .creator-appearance-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
    }

    .creator-name-card {
      display: grid;
      grid-template-columns: 84px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      padding: 10px;
    }

    .creator-name-card label {
      color: #d9c2ec;
      font-weight: 1000;
      text-transform: uppercase;
      font-size: 12px;
    }

    .creator-appearance-groups {
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-content: start;
      overflow: hidden;
    }

    .creator-appearance-group {
      display: grid;
      gap: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.035);
      padding: 10px;
    }

    .creator-appearance-group h3 {
      margin: 0;
      color: #f0e5f6;
      font-size: 14px;
    }

    .creator-selector-row {
      min-height: 48px;
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr) 38px;
      gap: 8px;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.18);
      padding: 5px;
      cursor: pointer;
    }

    .creator-selector-row button {
      height: 36px;
      padding: 0;
    }

    .selector-copy {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    .selector-copy span {
      color: #a9a0b0;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .selector-copy strong {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff7ef;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .creator-color-dot {
      width: 14px;
      height: 14px;
      flex: 0 0 14px;
      display: inline-block;
      border: 1px solid rgba(255, 255, 255, 0.55);
      background: var(--dot, #fff);
    }

    .creator-helpbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
      gap: 14px;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 12px;
    }

    .creator-hint-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .creator-hint-row span {
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.055);
      color: #ded4e4;
      padding: 6px 9px;
      font-size: 12px;
      font-weight: 900;
    }

    .creator-hold-meter {
      display: grid;
      grid-template-columns: minmax(80px, 1fr) auto;
      gap: 10px;
      align-items: center;
      color: #e8d8f3;
      font-size: 12px;
      font-weight: 1000;
    }

    .creator-hold-meter > div {
      height: 10px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .creator-hold-meter i {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #c07dff, #ffe7a6);
      transition: width 60ms linear;
    }

    .creator-hold-meter.active {
      color: #fff4c2;
    }

    .character-creator-overlay[data-compact-viewport="true"] .character-creator-panel {
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      gap: 8px;
      padding: 10px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-topbar {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      padding-bottom: 8px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-topbar h1 {
      font-size: 20px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-status {
      grid-column: 1 / -1;
      text-align: left;
      font-size: 11px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-layout {
      grid-template-columns: minmax(210px, 0.82fr) minmax(0, 1.18fr);
      grid-template-rows: minmax(0, 1fr) minmax(112px, 0.45fr);
      gap: 8px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-appearance-layout {
      grid-template-columns: minmax(230px, 0.78fr) minmax(0, 1.22fr);
      gap: 8px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-list-panel,
    .character-creator-overlay[data-compact-viewport="true"] .creator-preview-panel,
    .character-creator-overlay[data-compact-viewport="true"] .creator-info-panel,
    .character-creator-overlay[data-compact-viewport="true"] .creator-appearance-panel {
      padding: 9px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-info-panel {
      grid-column: 1 / -1;
      grid-row: 2;
      display: grid;
      grid-template-columns: minmax(210px, 0.78fr) minmax(0, 1.22fr) auto;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 8px 12px;
      overflow: hidden;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-info-panel .creator-detail-title {
      grid-row: 1 / -1;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: 8px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-detail-title > span {
      width: 34px;
      height: 34px;
      font-size: 11px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-detail-title h2 {
      font-size: 17px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-identity {
      grid-column: 2;
      font-size: 12px;
      line-height: 1.3;
      overflow: hidden;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-detail-grid,
    .character-creator-overlay[data-compact-viewport="true"] .creator-strength-grid {
      display: none;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-action-row {
      grid-column: 3;
      grid-row: 1 / -1;
      align-self: center;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-action-row button {
      min-height: 34px;
      padding: 0 10px;
      font-size: 13px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-card {
      min-height: 52px;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 8px;
      padding: 7px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-card i {
      display: none;
    }

    .character-creator-overlay[data-compact-viewport="true"] .class-card-glyph {
      width: 30px;
      height: 30px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-card strong,
    .character-creator-overlay[data-compact-viewport="true"] .creator-preview-footer b {
      font-size: 14px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-class-card small,
    .character-creator-overlay[data-compact-viewport="true"] .creator-preview-footer {
      font-size: 12px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-preview-heading h2 {
      font-size: 18px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-canvas-shell canvas {
      width: min(100%, 260px);
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-helpbar {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
      padding-top: 8px;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-hold-meter {
      display: none;
    }

    .character-creator-overlay[data-compact-viewport="true"] .creator-hint-row span {
      padding: 4px 6px;
      font-size: 12px;
    }

    @media (max-width: 1180px) {
      .character-creator-panel {
        height: min(940px, 96vh);
      }

      .creator-class-layout,
      .creator-appearance-layout {
        grid-template-columns: minmax(300px, 0.85fr) minmax(420px, 1fr);
      }

      .creator-info-panel {
        grid-column: 1 / -1;
        grid-template-rows: auto auto auto auto;
      }

      .creator-detail-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .character-creator-overlay {
        padding: 8px;
      }

      .character-creator-panel {
        width: 100vw;
        height: 100vh;
        padding: 10px;
        gap: 10px;
      }

      .creator-topbar {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .creator-status {
        text-align: left;
      }

      .creator-class-layout,
      .creator-appearance-layout,
      .creator-appearance-groups,
      .creator-detail-grid,
      .creator-strength-grid {
        grid-template-columns: 1fr;
      }

      .creator-preview-panel {
        min-height: 280px;
      }

      .creator-helpbar {
        grid-template-columns: 1fr;
      }

      .creator-hint-row span {
        font-size: 11px;
        padding: 5px 7px;
      }
    }
  `;

  document.head.appendChild(style);
}

