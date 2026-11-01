// worldContent.js
// Runalis world content database.
//
// This file defines:
// - Character creator options.
// - Factions.
// - Points of interest.
// - NPCs.
// - Dialogue trees.
// - Quest definitions.
// - Hostile/friendly world content metadata.
//
// Keep this file data-heavy.
// Systems like overworldMap.js, overworldEntities.js, dialogueSystem.js,
// quest systems, and UI scripts can import this as the source of truth.

import { STORY_DIALOGUE_TRIGGERS } from './dialogueData.js';
import { CAMPAIGN_DIALOGUES } from './act1CampaignData.js';
import {
  ALL_RUNALIS_QUESTS,
  getRunalisQuest,
  getRunalisQuestsForNpc
} from './questData.js';

// -----------------------------------------------------------------------------
// CHARACTER CREATOR
// -----------------------------------------------------------------------------

export const CHARACTER_CREATOR = {
  bodyTypes: [
    {
      id: 'male',
      name: 'Male',
      description: 'Broader shoulders and slightly heavier frame.'
    },
    {
      id: 'female',
      name: 'Female',
      description: 'Narrower shoulders and slightly lighter frame.'
    }
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
  ],

  defaults: {
    bodyType: 'male',
    skinColor: 'fair',
    hairColor: 'black',
    eyeColor: 'hazel',
    shirtColor: 'wandererGold',
    pantsColor: 'travelerBlue',
    bootColor: 'brownLeather',
    accentColor: 'brass'
  }
};

// -----------------------------------------------------------------------------
// FACTIONS
// -----------------------------------------------------------------------------

export const FACTIONS = {
  outpost: {
    id: 'outpost',
    name: 'The Outpost Wardens',
    alignment: 'friendly',
    description: 'Practical frontier defenders trying to keep the roads open.'
  },

  chapel: {
    id: 'chapel',
    name: 'Covenant Ruin-Keepers',
    alignment: 'friendly',
    description: 'Covenant historians, priests, and relief workers assigned to damaged holy sites.'
  },

  covenantOfLight: {
    id: 'covenantOfLight',
    name: 'The Covenant',
    alignment: 'friendly',
    description: 'A civilization-spanning network of physicians, priests, teachers, historians, diplomats, and peacekeepers holding back the Rot.'
  },

  thornbound: {
    id: 'thornbound',
    name: 'The Thornbound',
    alignment: 'neutral',
    description: 'Wild oathkeepers who believe nature remembers every crime.'
  },

  gravecallers: {
    id: 'gravecallers',
    name: 'The Gravecallers',
    alignment: 'neutral',
    description: 'Spirit-touched wanderers who speak with the dead and are feared for it.'
  },

  demonCult: {
    id: 'demonCult',
    name: 'The Order of the Last Dawn',
    alignment: 'hostile',
    description: 'Militant heretics who attack relief caravans, burn records, steal Divine Age relics, and sabotage purification sites.'
  },

  castleCourt: {
    id: 'castleCourt',
    name: 'House Veyr',
    alignment: 'uncertain',
    description: 'The ruined noble bloodline tied to Castle Veyreign.'
  },

  bandits: {
    id: 'bandits',
    name: 'Roadless Men',
    alignment: 'hostile',
    description: 'Deserters, thieves, and oathbreakers haunting the roads.'
  },

  hunters: {
    id: 'hunters',
    name: 'The Saltwell Hunters',
    alignment: 'friendly',
    description: 'Fishers, scouts, and practical survivalists who live by the river.'
  },

  watchers: {
    id: 'watchers',
    name: 'The Ridge Watchers',
    alignment: 'uncertain',
    description: 'Old scouts who believe the high places of Echoryn Forest are not empty.'
  }
};

// -----------------------------------------------------------------------------
// POINTS OF INTEREST
// -----------------------------------------------------------------------------

export const WORLD_POIS = {
  outpost: {
    id: 'outpost',
    name: 'Orrakai South Gate',
    kind: 'settlement',
    factionId: 'outpost',
    tileX: 14,
    tileY: 28,
    radius: 32,
    recommendedLevel: 1,
    description: 'The south approach to Orrakai. The full market, bank, smith, trainers, guild, and shrine are inside town.',
    discoveredText: 'Orrakai South Gate discovered.',
    mapIcon: 'camp',
    theme: 'frontier',
    tags: ['safe', 'starter', 'townGate']
  },

  thornrootHollow: {
    id: 'thornrootHollow',
    name: 'Thornroot Crypt',
    kind: 'dungeonEntrance',
    factionId: 'thornbound',
    tileX: 58,
    tileY: 124,
    radius: 30,
    recommendedLevel: 4,
    description: 'A root-choked hollow where the forest seems to breathe.',
    discoveredText: 'Thornroot Crypt discovered.',
    mapIcon: 'dungeon',
    theme: 'thorn',
    arrivalType: 'Root-Choked Descent',
    arrivalDanger: 'Danger: Moderate',
    arrivalSubtitle: 'The forest remembers every wound.',
    tags: ['dungeon', 'nature', 'thornbinder']
  },

  brokenChapel: {
    id: 'brokenChapel',
    name: 'The Broken Chapel',
    kind: 'ruin',
    factionId: 'chapel',
    tileX: 445,
    tileY: 72,
    radius: 92,
    recommendedLevel: 8,
    description: 'A recently burned Covenant refuge built through an older Avarran sanctuary. Survivors recover the dead while Rot alters the cemetery\'s names.',
    discoveredText: 'Broken Chapel discovered.',
    mapIcon: 'chapel',
    theme: 'ruin',
    arrivalType: 'Ruined Covenant Site',
    arrivalDanger: 'Danger: Moderate',
    arrivalSubtitle: 'The fire ended. The testimony did not.',
    tags: ['ruin', 'faith', 'undead', 'questHub', 'investigation', 'branchingPoi', 'avarran']
  },

  gothicCastle: {
    id: 'gothicCastle',
    name: 'Castle Veyreign',
    kind: 'gothicCastle',
    factionId: 'castleCourt',
    tileX: 565,
    tileY: 105,
    radius: 96,
    recommendedLevel: 25,
    description:
      'A black-spired castle overlooking the broken chapel road. Its banners are gone, but candles still burn in the windows.',
    discoveredText: 'Castle Veyreign discovered.',
    mapIcon: 'castle',
    theme: 'gothic',
    arrivalType: 'Cursed Noble Fortress',
    arrivalDanger: 'Danger: High',
    arrivalSubtitle: 'The dead still keep their oaths.',
    tags: ['castle', 'noble', 'undead', 'questHub']
  },

  demonCultLair: {
    id: 'demonCultLair',
    name: 'Last Dawn Keep',
    kind: 'demonLair',
    factionId: 'demonCult',
    tileX: 560,
    tileY: 390,
    radius: 92,
    recommendedLevel: 12,
    description: 'A severe Last Dawn fortress built around a burning red seal and a descent to the imprisoned Primordial Malakar.',
    discoveredText: 'Last Dawn Keep discovered.',
    mapIcon: 'demon',
    theme: 'demon',
    arrivalType: 'Fortified Seal Bastion',
    arrivalDanger: 'Danger: High',
    arrivalSubtitle: 'They did not come here to worship.',
    tags: ['lastDawn', 'primordial', 'dungeon', 'hostile']
  },

  pilgrimRoadGate: {
    id: 'pilgrimRoadGate',
    name: 'Frontier Road Gate',
    kind: 'travelRouteGate',
    factionId: 'outpost',
    tileX: 48,
    tileY: 18,
    radius: 54,
    recommendedLevel: 15,
    description: 'A fortified expedition checkpoint where Orrakai gives way to the Covenant road.',
    discoveredText: 'Frontier Road Gate discovered.',
    mapIcon: 'gate',
    theme: 'frontier',
    arrivalType: 'Act II Expedition Route',
    arrivalDanger: 'Travel Preparation',
    arrivalSubtitle: 'Beyond this road, Orrakai ends.',
    tags: ['travel', 'expedition', 'story']
  },

  infiniteTower: {
    id: 'infiniteTower',
    name: 'Infinite Tower',
    kind: 'towerEntrance',
    factionId: 'gravecallers',
    tileX: 44,
    tileY: 27,
    radius: 34,
    recommendedLevel: 5,
    description: 'A repeating trial whose upper floors refuse to stay in the same order.',
    discoveredText: 'Infinite Tower discovered.',
    mapIcon: 'tower',
    theme: 'grave',
    arrivalType: 'Endless Trial',
    arrivalDanger: 'Danger: Rising',
    arrivalSubtitle: 'Every floor remembers who fled.',
    tags: ['tower', 'infiniteDungeon', 'repeatable']
  },

  oldHollowDungeon: {
    id: 'oldHollowDungeon',
    name: 'Old Blighted Dungeon',
    kind: 'dungeonEntrance',
    factionId: 'gravecallers',
    tileX: 282,
    tileY: 205,
    radius: 34,
    recommendedLevel: 12,
    description: 'A dead gate leading beneath the oldest part of Echoryn Forest.',
    discoveredText: 'Old Blighted Dungeon discovered.',
    mapIcon: 'dungeon',
    theme: 'grave',
    arrivalType: 'Ancient Grave Descent',
    arrivalDanger: 'Danger: High',
    arrivalSubtitle: 'The oldest dead wait below.',
    tags: ['dungeon', 'grave', 'boss']
  },

  ironMireDungeon: {
    id: 'ironMireDungeon',
    name: 'Abandoned Iron Vault',
    kind: 'dungeonEntrance',
    factionId: 'gravecallers',
    tileX: 172,
    tileY: 198,
    radius: 34,
    recommendedLevel: 16,
    description: 'Three flooded industrial levels: emergency pumps, lost crew records and a deep bell still calling the drowned to work. A dangerous mid–Act I expedition.',
    discoveredText: 'Abandoned Iron Vault discovered.',
    mapIcon: 'dungeon',
    theme: 'mine',
    tags: ['dungeon', 'mire', 'mining']
  },

  ashenOrchard: {
    id: 'ashenOrchard',
    name: 'Ashen Orchard',
    kind: 'ruin',
    factionId: 'chapel',
    tileX: 110,
    tileY: 90,
    radius: 46,
    recommendedLevel: 3,
    description:
      'A family orchard turned relief camp and living quarantine. The outer Covenant burn still holds; black roots rise through an older floor inside it.',
    discoveredText: 'Ashen Orchard discovered.',
    mapIcon: 'ruin',
    theme: 'grave',
    tags: ['earlyDungeon', 'grave', 'questHub', 'investigation', 'branchingPoi']
  },

  pilgrimBridge: {
    id: 'pilgrimBridge',
    name: 'Pilgrim Bridge',
    kind: 'bridge',
    factionId: 'chapel',
    tileX: 184,
    tileY: 78,
    radius: 30,
    recommendedLevel: 7,
    description:
      'A cracked stone bridge used by pilgrims before the chapel road collapsed into undead territory.',
    discoveredText: 'Pilgrim Bridge discovered.',
    mapIcon: 'bridge',
    theme: 'ruin',
    tags: ['bridge', 'chapel', 'danger']
  },

  mirrorGrove: {
    id: 'mirrorGrove',
    name: 'Mirror Grove',
    kind: 'grove',
    factionId: 'thornbound',
    tileX: 90,
    tileY: 158,
    radius: 34,
    recommendedLevel: 6,
    description:
      'A quiet grove where bark shines like wet glass and voices echo before anyone speaks.',
    discoveredText: 'Mirror Grove discovered.',
    mapIcon: 'grove',
    theme: 'thorn',
    tags: ['thornbinder', 'shrine', 'dungeon']
  },

  lanternMarsh: {
    id: 'lanternMarsh',
    name: 'Lantern Marsh',
    kind: 'camp',
    factionId: 'outpost',
    tileX: 179,
    tileY: 198,
    radius: 34,
    recommendedLevel: 9,
    description:
      'A marshland waystation marked by weak lanterns, half-submerged stones, and things that copy voices.',
    discoveredText: 'Lantern Marsh discovered.',
    mapIcon: 'camp',
    theme: 'mire',
    tags: ['campfire', 'mire', 'survival']
  },

  saltwellCamp: {
    id: 'saltwellCamp',
    name: 'Saltwell Camp',
    kind: 'camp',
    factionId: 'hunters',
    tileX: 101,
    tileY: 211,
    radius: 32,
    recommendedLevel: 4,
    description:
      'A fishing and hunting camp where riverfolk trade food, rumours, and practical warnings.',
    discoveredText: 'Saltwell Camp discovered.',
    mapIcon: 'camp',
    theme: 'river',
    tags: ['fishing', 'food', 'safe']
  },

  watcherRidge: {
    id: 'watcherRidge',
    name: 'Watcher Ridge',
    kind: 'ridge',
    factionId: 'watchers',
    tileX: 272,
    tileY: 132,
    radius: 36,
    recommendedLevel: 14,
    description:
      'A high ridge of broken watch pillars. From below it looks abandoned. From above it feels occupied.',
    discoveredText: 'Watcher Ridge discovered.',
    mapIcon: 'ridge',
    theme: 'highland',
    tags: ['elite', 'wraith', 'vault']
  }
};

// -----------------------------------------------------------------------------
// NPC DEFINITIONS
// -----------------------------------------------------------------------------

export const NPCS = {
  wardenMael: {
    id: 'wardenMael',
    objectId: 'warden',
    name: 'Warden Mael',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Quest Giver',
    tileX: 11,
    tileY: 25,
    dialogueId: 'wardenMaelIntro',
    questIds: ['act1HearthmereAshes'],
    description: 'A tired frontier warden who has seen too many new wanderers die on the road.'
  },

  maraSmith: {
    id: 'maraSmith',
    objectId: 'smith',
    name: 'Aren the Smith',
    bodyType: 'male',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Smith',
    tileX: 20,
    tileY: 25,
    dialogueId: 'maraSmithIntro',
    questIds: [],
    description: 'A practical smith who judges people by whether they bring useful materials.'
  },

  maraVell: {
    id: 'maraVell',
    objectId: 'maraVellOpening',
    name: 'Mara Vell',
    factionId: 'thornbound',
    disposition: 'neutral',
    role: 'Apothecary’s Daughter / Thornbinder Trainer',
    tileX: 7,
    tileY: 5,
    dialogueId: 'maraTrainerDialogue',
    questIds: [],
    description: 'The apothecary’s daughter, upstairs in the Root & Retort recovery room. A sharp healer who teaches survival magic with roots, thorns, poison, and care.'
  },

  orenFenwick: {
    id:'orenFenwick',objectId:'orenFenwickObject',name:'Oren Fenwick',
    factionId:'orrakai',disposition:'friendly',role:'Resident Alchemist',
    tileX:49,tileY:39,dialogueId:'orenFenwickShop',questIds: [],
    description:'The Root & Retort’s resident alchemist. Grey-haired and dressed in an ochre work tunic, Oren brews medicines and serves travellers at the downstairs counter.'
  },

  bram: {
    id: 'bram',
    objectId: 'mercenaryTrainer',
    name: 'Bram',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Fellhunter Trainer',
    tileX: 35,
    tileY: 33,
    dialogueId: 'bramTrainerDialogue',
    questIds: [],
    description: 'A young guard learning to turn fear into practical protection.'
  },

  kaelenDusk: {
    id: 'kaelenDusk',
    objectId: 'necromancerTrainer',
    name: 'Kaelen Dusk',
    factionId: 'gravecallers',
    disposition: 'neutral',
    role: 'Gravecaller Trainer',
    tileX: 7,
    tileY: 42,
    dialogueId: 'duskTrainerDialogue',
    questIds: ['act3Severance'],
    description: 'A demon-touched survivor of purification who teaches that death magic is not the same as evil.'
  },

  sisterElian: {
    id: 'sisterElian',
    objectId: 'templarTrainer',
    name: 'Sister Elian',
    factionId: 'covenantOfLight',
    disposition: 'friendly',
    role: 'Oathkeeper Trainer',
    tileX: 34,
    tileY: 24,
    dialogueId: 'elianTrainerDialogue',
    questIds: ['act2AureateReckoning'],
    description: 'A sincere Covenant priestess and relief defender who treats protection as the first obligation of faith.'
  },

  hunterScout: {
    id: 'hunterScout',
    objectId: 'hunterScout',
    name: 'Hunter Scout',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Scout',
    tileX: 70,
    tileY: 72,
    dialogueId: 'hunterScoutIntro',
    questIds: [],
    description: 'A road scout watching the Blighted Road.'
  },

  orchardFieldPhysician: {
    id: 'orchardFieldPhysician',
    objectId: 'orchardFieldPhysician',
    name: 'Physician Ilyen Vale',
    factionId: 'covenantOfLight',
    disposition: 'friendly',
    role: 'Covenant Field Physician',
    tileX: 103,
    tileY: 88,
    dialogueId: 'orchardPhysicianDialogue',
    questIds: [],
    description: 'A Covenant doctor directing triage while refusing to pretend that purification has no cost.'
  },

  chapelHermit: {
    id: 'chapelHermit',
    objectId: 'chapelHermit',
    name: 'Chapel Hermit',
    factionId: 'chapel',
    disposition: 'neutral',
    role: 'Hermit',
    tileX: 230,
    tileY: 50,
    dialogueId: 'chapelHermitIntro',
    questIds: [],
    description: 'The Chapel\'s long-serving caretaker, exhausted by Echoes that revise his honest memories.'
  },

  mineDrifter: {
    id: 'mineDrifter',
    objectId: 'mineDrifter',
    name: 'Mine Drifter',
    factionId: 'gravecallers',
    disposition: 'neutral',
    role: 'Miner',
    tileX: 168,
    tileY: 188,
    dialogueId: 'mineDrifterIntro',
    questIds: ['ironMireLastShift'],
    description: 'A drifter who knows where the mire swallowed the old mining road.'
  },

  sisterElyra: {
    id: 'sisterElyra',
    objectId: 'sisterElyra',
    name: 'Sister Elyra',
    factionId: 'covenantOfLight',
    disposition: 'friendly',
    role: 'Covenant Chapel Survivor',
    tileX: 237,
    tileY: 47,
    dialogueId: 'sisterElyraIntro',
    questIds: [],
    description: 'A grieving Covenant keeper recovering patients, friends, and records without confusing institutional certainty for faith.'
  },

  chapelCivilianWitness: {
    id: 'chapelCivilianWitness',
    objectId: 'chapelCivilianWitness',
    name: 'Tomas Venn',
    factionId: 'chapel',
    disposition: 'fearful',
    role: 'Pilgrim Survivor',
    dialogueId: 'chapelCivilianDialogue',
    questIds: [],
    description: 'A pilgrim sheltering two children in the damaged crypt. His testimony changes where Rot has touched the memorial wall.'
  },

  chapelLastDawnRemnant: {
    id: 'chapelLastDawnRemnant',
    objectId: 'chapelLastDawnRemnant',
    name: 'Ash-Captain Rusk',
    factionId: 'demonCult',
    disposition: 'uncertain',
    role: 'Wounded Last Dawn Attacker',
    dialogueId: 'chapelLastDawnDialogue',
    questIds: [],
    description: 'A wounded Order captain who helped plan the Chapel assault, killed defenders, and knows why its archive was already altered.'
  },

  chapelOutcomeWitness: {
    id: 'chapelOutcomeWitness',
    objectId: 'chapelOutcomeWitness',
    name: 'Chapel Witness',
    factionId: 'chapel',
    disposition: 'friendly',
    role: 'Consequence Witness',
    dialogueId: 'chapelOutcomeDialogue',
    questIds: [],
    description: 'The person responsible for naming the permanent cost of the player\'s Chapel decision.'
  },

  lordVeyrShade: {
    id: 'lordVeyrShade',
    objectId: 'lordVeyrShade',
    name: 'Castellan Edrik’s Echo',
    factionId: 'castleCourt',
    disposition: 'uncertain',
    role: 'Gothic Castle NPC',
    tileX: 276,
    tileY: 66,
    dialogueId: 'lordVeyrShadeIntro',
    questIds: ['vampireRedChalice'],
    description: 'A noble ghost bound to Castle Veyreign by an oath he will not explain.'
  },

  thornboundSeer: {
    id: 'thornboundSeer',
    objectId: 'thornboundSeer',
    name: 'Thornbound Seer',
    factionId: 'thornbound',
    disposition: 'neutral',
    role: 'Seer',
    tileX: 58,
    tileY: 124,
    dialogueId: 'thornboundSeerIntro',
    questIds: [],
    description: 'A wild oathkeeper who believes every wound left on the land is recorded in roots.'
  },

  repentantCultist: {
    id: 'repentantCultist',
    objectId: 'repentantCultist',
    name: 'Last Dawn Defector',
    factionId: 'demonCult',
    disposition: 'fearful',
    role: 'Order Defector',
    tileX: 286,
    tileY: 169,
    dialogueId: 'repentantCultistIntro',
    questIds: [],
    description: 'A frightened Last Dawn defector who knows the route into Last Dawn Keep but refuses to explain the Order\'s full design.'
  },

  emberVeilAcolyte: {
    id: 'emberVeilAcolyte',
    objectId: 'emberVeilAcolyte',
    name: 'Last Dawn Seal-Keeper',
    factionId: 'demonCult',
    disposition: 'hostile',
    role: 'Order Militant',
    tileX: 302,
    tileY: 181,
    dialogueId: 'cultistWarning',
    questIds: [],
    description: 'A hostile Last Dawn militant guarding the descent into Last Dawn Keep.'
  },

  roadlessCaptain: {
    id: 'roadlessCaptain',
    objectId: 'roadlessCaptain',
    name: 'Roadless Captain',
    factionId: 'bandits',
    disposition: 'hostile',
    role: 'Bandit Captain',
    tileX: 232,
    tileY: 118,
    dialogueId: 'roadlessCaptainIntro',
    questIds: [],
    description: 'A deserter captain who claims the old roads belong to no law.'
  },

  oldTarin: {
    id: 'oldTarin',
    objectId: 'oldTarin',
    name: 'Old Tarin',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Road Guide',
    tileX: 40,
    tileY: 45,
    dialogueId: 'oldTarinIntro',
    questIds: [],
    description: 'A stubborn road guide who survived by never mistaking confidence for preparation.'
  },

  lumenSable: {
    id: 'lumenSable',
    objectId: 'lumenSable',
    name: 'Lumen Sable',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Marsh Guide',
    tileX: 181,
    tileY: 196,
    dialogueId: 'lumenSableIntro',
    questIds: [],
    description: 'A lantern keeper who knows which lights in the mire are safe and which are pretending.'
  },

  sableCartographer: {
    id: 'sableCartographer',
    objectId: 'sableCartographer',
    name: 'Sable Cartographer',
    factionId: 'chapel',
    disposition: 'neutral',
    role: 'Cartographer',
    tileX: 182,
    tileY: 77,
    dialogueId: 'sableCartographerIntro',
    questIds: [],
    description: 'A mapmaker whose maps of Echoryn Forest keep becoming inaccurate.'
  },

  mireWidow: {
    id: 'mireWidow',
    objectId: 'mireWidow',
    name: 'Mire Widow',
    factionId: 'gravecallers',
    disposition: 'uncertain',
    role: 'Spirit-Touched Quest Giver',
    tileX: 176,
    tileY: 201,
    dialogueId: 'mireWidowIntro',
    questIds: [],
    description: 'A woman who claims the marsh water shows faces before people die.'
  },

  fenrickSalt: {
    id: 'fenrickSalt',
    objectId: 'fenrickSalt',
    name: 'Fenrick Salt',
    factionId: 'hunters',
    disposition: 'friendly',
    role: 'Fisher',
    tileX: 101,
    tileY: 211,
    dialogueId: 'fenrickSaltIntro',
    questIds: [],
    description: 'A blunt river fisher who treats danger as part of the weather.'
  },

  hollowPilgrim: {
    id: 'hollowPilgrim',
    objectId: 'hollowPilgrim',
    name: 'Blighted Pilgrim',
    factionId: 'chapel',
    disposition: 'uncertain',
    role: 'Wandering Quest Giver',
    tileX: 121,
    tileY: 74,
    dialogueId: 'hollowPilgrimIntro',
    questIds: [],
    description: 'A pilgrim who buried their name beneath the orchard and now regrets surviving it.'
  },

  watcherIvo: {
    id: 'watcherIvo',
    objectId: 'watcherIvo',
    name: 'Watcher Ivo',
    factionId: 'watchers',
    disposition: 'wounded',
    role: 'Warning NPC',
    tileX: 264,
    tileY: 128,
    dialogueId: 'watcherIvoIntro',
    questIds: [],
    description: 'A wounded scout who survived Watcher Ridge by running blind.'
  }
};

// -----------------------------------------------------------------------------
// DIALOGUES
// -----------------------------------------------------------------------------

export const DIALOGUES = {
  "wardenMaelIntro": {
    "id": "wardenMaelIntro",
    "speaker": "Warden Mael",
    "text": "The Covenant physicians say you can walk. That makes you luckier than most of your caravan. Orrakai will help you recover. In return, tell us why the Last Dawn chose your wagon.",
    "nextNodeId": "wardenMaelRoadWarning",
    "options": []
  },
  "wardenMaelRoadWarning": {
    "id": "wardenMaelRoadWarning",
    "speakerId": "wardenMael",
    "speaker": "Warden Mael",
    "text": "The Rot drove the wildlife first. Then Last Dawn cells began cutting relief routes and burning patient records. A quiet road means someone has removed the witnesses.",
    "appendNpcQuestOptions": false,
    "options": [
      {
        "id": "solgateOath",
        "label": "What should I do first?",
        "response": "Start with the caravan wreck. Hessa is keeping the evidence safe. Examine the cargo manifest and the empty reliquary cradle, then compare what you find with her account.",
        "startsQuest": "act1HearthmereAshes",
        "revealsPoi": "ashenOrchard"
      },
      {
        "id": "chapelDescent",
        "label": "What lies beneath the Broken Chapel?",
        "response": "The Last Dawn burned the chapel index and carried its surviving pages to Last Dawn Keep. Find the witnesses and their defector. Bring me a route, and I will authorize the descent.",
        "revealsPoi": "brokenChapel",
        "flagsSet": [
          "story.wardenNamedChapelDescent"
        ],
        "requiresQuestStageAtLeast": {
          "questId": "act1HearthmereAshes",
          "stageId": "theBrokenChapel"
        }
      },
      {
        "id": "advice",
        "label": "Any advice?",
        "response": "Do not hoard courage. Spend stamina wisely. Camp before you think you need to. Run from anything that has a name until you earn one too."
      },
      {
        "id": "afterMalakar",
        "label": "Malakar is dead. What waits beyond the Pilgrim Road?",
        "response": "A cleaner road, brighter walls, and people who call obedience safety. Take supplies. The Marches are gentler than Orrakai only when watched from far away.",
        "requiresQuestCompleted": "act1HearthmereAshes"
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "maraSmithIntro": {
    "id": "maraSmithIntro",
    "speaker": "Aren the Smith",
    "text": "Weapons do not save fools. Good iron only helps the person holding it make fewer excuses.",
    "options": [
      {
        "id": "askGear",
        "label": "What gear should I use?",
        "response": "Use what matches how you fight. Sword for pressure. Bow for distance. Scythe if you like ghosts staring back. Staff if you trust roots more than people."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "orchardPhysicianDialogue": {
    "id": "orchardPhysicianDialogue",
    "speaker": "Physician Ilyen Vale",
    "text": "If you came to accuse us, take a basin and accuse while you wash instruments. The outer white-fire line held. Something below the inner trees taught the Rot another way in. I need evidence before I spend lives on an answer.",
    "options": [
      {
        "id": "orchardSituation",
        "label": "Why not burn the whole Orchard now?",
        "response": "Because there are families in these tents, names in those houses, and something ancient below the roots. Fire can save the living and erase the only proof we have."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "hunterScoutIntro": {
    "id": "hunterScoutIntro",
    "speaker": "Hunter Scout",
    "text": "The relief road is alive in the wrong way. Blighted Corpses move like lost people, and every black root turns toward stone older than Orrakai.",
    "options": [
      {
        "id": "askRoad",
        "label": "What should I watch for?",
        "response": "Groups. One Blighted Corpse is practice. Three is a lesson. Anything standing still in the road is waiting."
      },
      {
        "id": "orchard",
        "label": "Where is the corruption spreading?",
        "response": "Ashen Orchard. The Covenant perimeter burn held, but the inner roots returned beneath an ancient floor. The Blighted guard it like something below is feeding them instructions.",
        "revealsPoi": "ashenOrchard",
        "flagsSet": [
          "story.hollowRoadScouted"
        ],
        "requiresQuestStageAtLeast": {
          "questId": "act1HearthmereAshes",
          "stageId": "theWoundSpreads"
        }
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "chapelHermitIntro": {
    "id": "chapelHermitIntro",
    "speaker": "Chapel Hermit",
    "text": "The chapel is broken, not dead. Careful. Broken things cut deeper because people stop respecting them.",
    "options": [
      {
        "id": "machinery",
        "label": "What is moving beneath the chapel?",
        "response": "Not machinery. A prison, perhaps. The Last Dawn broke the lower seal after burning the archive that named what sleeps there. Sister Elyra saved half the index.",
        "revealsPoi": "demonCultLair",
        "flagsSet": [
          "story.dawnspireMachineryFound"
        ],
        "requiresQuestStageAtLeast": {
          "questId": "act1HearthmereAshes",
          "stageId": "theBrokenChapel"
        }
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "mineDrifterIntro": {
    "id": "mineDrifterIntro",
    "speaker": "Mine Drifter",
    "text": "Iron Mire swallowed a mine, three crews, and one very expensive foreman. The foreman is the only part nobody misses.",
    "options": [
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "sisterElyraIntro": {
    "id": "sisterElyraIntro",
    "speaker": "Sister Elyra",
    "text": "The chapel roof fell. The vows did not. If you came seeking safety, you are late. If you came seeking purpose, perhaps not.",
    "options": [
      {
        "id": "purification",
        "label": "Was the chapel purified?",
        "response": "Repeatedly. The outer graves quieted and the water cleared. Only the roots beneath the Divine Age foundation returned. Our rite is working; something older is working against it.",
        "flagsSet": [
          "story.dawnspireMachineryFound"
        ],
        "requiresQuestStageAtLeast": {
          "questId": "act1HearthmereAshes",
          "stageId": "theCovenantBlessing"
        }
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "chapelCivilianDialogue": {
    "id": "chapelCivilianDialogue",
    "speaker": "Tomas Venn",
    "text": "We came for fever medicine. Then the bell rang without moving and the red-cloaks came through the south wall. Sister Elyra put the children in the crypt before she took up a shield.",
    "options": [
      {
        "id": "civilianSequence",
        "label": "What did you see before the attack?",
        "response": "The memorial names changed first. My wife's stone showed a stranger. Then a Covenant archivist opened the old cabinet alone. The attackers arrived after sunset."
      },
      {
        "id": "civilianHumanTrust",
        "label": "[Human] Show Tomas the Orrakai refugee procedures and ask where the children hid.",
        "response": "You know the questions because you have answered them yourself. The children found an older witness room behind the crypt. It has nine benches, though the Chapel teaches eight stations.",
        "raceAny": [
          "human"
        ],
        "flagsSet": [
          "poi.brokenChapel.humanCivilianTrust",
          "future.chapelHiddenChildRoom"
        ]
      },
      {
        "id": "civilianVampireFear",
        "label": "[Vampire] Ask permission to read the preserved blood on the crypt threshold.",
        "response": "Tomas gives permission and moves the children farther away. The blood carries the true order of deaths; his fear of you remains equally true.",
        "raceAny": [
          "vampire"
        ],
        "flagsSet": [
          "poi.brokenChapel.vampirePermissionGiven"
        ]
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "chapelLastDawnDialogue": {
    "id": "chapelLastDawnDialogue",
    "speaker": "Ash-Captain Rusk",
    "text": "Do not call me innocent. I ordered the south breach. Covenant defenders died because I wanted the reliquary socket before they could move it. I did not order civilians killed. One of mine ignored that distinction.",
    "options": [
      {
        "id": "ruskArchive",
        "label": "Why attack an archive that was already altered?",
        "response": "Because altered is not empty. The Covenant covered the ninth station and removed the refusal clause, but the relic still fit the absence. We burned pursuit records and stole older testimony. We also killed people who stood between us and it."
      },
      {
        "id": "ruskWard",
        "label": "Who opened the ward from inside?",
        "response": "Archivist Pell. Covenant office, Order sympathies, terrified of both. Pell opened it before we arrived and died trying to close it when the Echoes woke. Make of that what your clean histories permit."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "chapelOutcomeDialogue": {
    "id": "chapelOutcomeDialogue",
    "speaker": "Chapel Witness",
    "text": "The surviving families keep watch over the cemetery. There are still names to put on the stones.",
    "options": []
  },
  "lordVeyrShadeIntro": {
    "id": "lordVeyrShadeIntro",
    "speaker": "Castellan Edrik’s Echo",
    "text": "Alistair Veyreign still holds court within the castle. The names on its invitations belong to people who never came home.",
    "options": [
      {
        "id": "redChalice",
        "label": "I will bring Alistair’s court to an end.",
        "response": "Break the banquet seals, recover the servants’ names, silence the aviary, then shatter his borrowed hearts. Decide what his blood will cost before you accept it.",
        "startsQuest": "vampireRedChalice",
        "revealsPoi": "gothicCastle"
      }
    ]
  },
  "thornboundSeerIntro": {
    "id": "thornboundSeerIntro",
    "speaker": "Thornbound Seer",
    "text": "Step lightly. Roots remember weight. Leaves remember blood. The land has a better memory than any court.",
    "options": [
      {
        "id": "thornbinder",
        "label": "What is the Thornbound oath?",
        "response": "To defend what cannot beg. To punish what cuts without need. To heal when healing still matters."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "repentantCultistIntro": {
    "id": "repentantCultistIntro",
    "speaker": "Last Dawn Defector",
    "text": "The Order finished the invocation. You are already too late to stop Malakar waking. You may still stop what happens after he answers.",
    "options": [
      {
        "id": "cult",
        "label": "Why did you join the Last Dawn?",
        "response": "Because the Rot took my village while the archives called it an ordinary blight. The Order promised the testimony of someone who watched the Divine War. Then it taught me what promises cost."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "cultistWarning": {
    "id": "cultistWarning",
    "speaker": "Last Dawn Seal-Keeper",
    "text": "Turn away. The witness is awake, the records are ash, and Orrakai will believe whatever survives us.",
    "options": [
      {
        "id": "threaten",
        "label": "Stand aside.",
        "response": "Then bleed at the threshold.",
        "hostileNpcObjectId": "emberVeilAcolyte"
      },
      {
        "id": "askSeal",
        "label": "What seal?",
        "response": "The prison beneath the keep. You will hear its witness soon enough—if your faith survives the sound."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "roadlessCaptainIntro": {
    "id": "roadlessCaptainIntro",
    "speaker": "Roadless Captain",
    "text": "Roads belong to whoever can hold them. The outpost forgot that. I did not.",
    "options": [
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "oldTarinIntro": {
    "id": "oldTarinIntro",
    "speaker": "Old Tarin",
    "text": "The safest path is never the shortest one. The dead usually picked shortcuts. The missing picked pride.",
    "options": [
      {
        "id": "askSurvival",
        "label": "How did you survive this long?",
        "response": "I ran early, slept often, and never fought anything that looked patient."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "lumenSableIntro": {
    "id": "lumenSableIntro",
    "speaker": "Lumen Sable",
    "text": "Follow the lanterns. Ignore anything that copies your voice. Especially if it sounds relieved to find you.",
    "options": [
      {
        "id": "askLights",
        "label": "Are all lanterns safe?",
        "response": "No. Safe lanterns flicker in wind. Bad ones flicker when you think."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "sableCartographerIntro": {
    "id": "sableCartographerIntro",
    "speaker": "Sable Cartographer",
    "text": "Every map of this place becomes wrong by morning. Roads shift, ruins lean, and someone keeps adding bridges I did not draw.",
    "options": [
      {
        "id": "askMap",
        "label": "Why does the map change?",
        "response": "Because Echoryn Forest is either wounded, haunted, or alive. None of those are cartographically convenient."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "mireWidowIntro": {
    "id": "mireWidowIntro",
    "speaker": "Mire Widow",
    "text": "The water showed me faces tonight. Some are dead. Some are not dead yet. One looked like you.",
    "options": [
      {
        "id": "askSpirit",
        "label": "Are you a Gravecaller?",
        "response": "No. Gravecallers choose to listen. I was answered first."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "fenrickSaltIntro": {
    "id": "fenrickSaltIntro",
    "speaker": "Fenrick Salt",
    "text": "People think fishing is peaceful because fish do not scream. That is a failure of imagination.",
    "options": [
      {
        "id": "askRiver",
        "label": "Is the river dangerous?",
        "response": "Everything is dangerous. The river is at least honest enough to be wet."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  },
  "hollowPilgrimIntro": {
    "id": "hollowPilgrimIntro",
    "speaker": "Blighted Pilgrim",
    "text": "My home stood near the Orchard. When you walk among those walls, remember that people lived there.",
    "options": [
      {
        "id": "home",
        "label": "What was it like before?",
        "response": "Fruit trees along the ditch. Smoke from the kitchen. Children who never stopped asking when the harvest would be ready."
      }
    ]
  },
  "watcherIvoIntro": {
    "id": "watcherIvoIntro",
    "speaker": "Watcher Ivo",
    "text": "The ridge looks back. I know how that sounds. I also know what happened to the scouts who laughed.",
    "options": [
      {
        "id": "askSurvive",
        "label": "How did you survive?",
        "response": "I dropped my torch and ran blind. Bravery is useful. Cowardice is underrated."
      },
      {
        "id": "leave",
        "label": "Leave.",
        "close": true
      }
    ]
  }
};

// -----------------------------------------------------------------------------
// QUESTS
// -----------------------------------------------------------------------------

// Retained export for older tools; live quests are composed in questData.js.
export const QUESTS = {};

// -----------------------------------------------------------------------------
// HOSTILE NPC CONVERSION DATA
// -----------------------------------------------------------------------------

export const HOSTILE_NPCS = {
  emberVeilAcolyte: {
    objectId: 'emberVeilAcolyte',
    enemyKind: 'demonCultist',
    name: 'Ember Veil Acolyte',
    level: 3,
    hp: 145,
    damage: 15,
    xp: 90
  },

  roadlessCaptain: {
    objectId: 'roadlessCaptain',
    enemyKind: 'roadlessBandit',
    name: 'Roadless Captain',
    level: 3,
    hp: 190,
    damage: 16,
    xp: 120
  }
};

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

export function getCharacterCreatorOption(groupId, optionId) {
  const group = CHARACTER_CREATOR[groupId];
  if (!Array.isArray(group)) return null;

  return group.find(option => option.id === optionId) || null;
}

export function getCharacterCreatorColor(groupId, optionId) {
  const option = getCharacterCreatorOption(groupId, optionId);
  return option?.value || null;
}

export function getFaction(id) {
  return FACTIONS[id] || null;
}

export function getPoi(id) {
  return WORLD_POIS[id] || null;
}

export function getNpc(id) {
  return NPCS[id] || null;
}

export function getNpcByObjectId(objectId) {
  if (!objectId) return null;

  return Object.values(NPCS).find(npc => {
    return npc.objectId === objectId || npc.id === objectId;
  }) || null;
}

export function getDialogue(id) {
  return CAMPAIGN_DIALOGUES[id] || DIALOGUES[id] || STORY_DIALOGUE_TRIGGERS[id] || null;
}

export function getQuest(id) {
  return QUESTS[id] || getRunalisQuest(id) || null;
}

export function getQuestsForNpc(npcId) {
  return [
    ...Object.values(QUESTS).filter(quest => quest.giverNpcId === npcId),
    ...getRunalisQuestsForNpc(npcId)
  ];
}

export function getHostileNpc(id) {
  return HOSTILE_NPCS[id] || null;
}

export function getAllPois() {
  return Object.values(WORLD_POIS);
}

export function getAllNpcs() {
  return Object.values(NPCS);
}

export function getAllQuests() {
  return [
    ...Object.values(QUESTS),
    ...Object.values(ALL_RUNALIS_QUESTS)
  ];
}
