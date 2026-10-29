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
    description: 'The ruined noble bloodline tied to Castle Veyr.'
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
    name: 'Castle Veyr',
    kind: 'gothicCastle',
    factionId: 'castleCourt',
    tileX: 565,
    tileY: 105,
    radius: 96,
    recommendedLevel: 10,
    description:
      'A black-spired castle overlooking the broken chapel road. Its banners are gone, but candles still burn in the windows.',
    discoveredText: 'Castle Veyr discovered.',
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
    name: 'The Iron Mire Sink',
    kind: 'dungeonEntrance',
    factionId: 'gravecallers',
    tileX: 172,
    tileY: 198,
    radius: 34,
    recommendedLevel: 9,
    description: 'A flooded ruin below the mire where old mining chains vanish into black water.',
    discoveredText: 'Iron Mire Sink discovered.',
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
    questIds: ['act1HearthmereAshes', 'firstOath', 'roadsGoneQuiet'],
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
    questIds: ['ironForMara'],
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
    questIds: ['maraRootsInAsh'],
    description: 'The apothecary’s daughter, upstairs in the Root & Retort recovery room. A sharp healer who teaches survival magic with roots, thorns, poison, and care.'
  },

  orenFenwick: {
    id:'orenFenwick',objectId:'orenFenwickObject',name:'Oren Fenwick',
    factionId:'orrakai',disposition:'friendly',role:'Resident Alchemist',
    tileX:49,tileY:39,dialogueId:'orenFenwickShop',questIds:[],
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
    questIds: ['bramLanternDrill'],
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
    questIds: ['duskNamesForTheDead', 'act3Severance'],
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
    questIds: ['elianTheOathAndTheChain', 'act2AureateReckoning'],
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
    questIds: ['roadsGoneQuiet'],
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
    questIds: ['ashenOrchardLastHarvest'],
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
    questIds: ['candlesInTheChapel', 'ruinedChapelFireCouldNotErase'],
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
    questIds: ['ironMireSalvage'],
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
    questIds: ['ruinedChapelFireCouldNotErase', 'candlesInTheChapel', 'theVeyrBloodline'],
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
    name: 'Lord Veyr’s Shade',
    factionId: 'castleCourt',
    disposition: 'uncertain',
    role: 'Gothic Castle NPC',
    tileX: 276,
    tileY: 66,
    dialogueId: 'lordVeyrShadeIntro',
    questIds: ['theBlackSpire', 'vampireRedChalice'],
    description: 'A noble ghost bound to Castle Veyr by an oath he will not explain.'
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
    questIds: ['rootsRemember'],
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
    questIds: ['beneathTheRedSeal', 'cambionAshenPact'],
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
    questIds: ['roadlessJustice'],
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
    questIds: ['embersOnTheRoad'],
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
    questIds: ['lanternsInTheMire'],
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
    questIds: ['wrongByMorning'],
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
    questIds: ['facesInTheWater'],
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
    questIds: ['silverInTheRiver'],
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
    questIds: ['buriedName'],
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
    questIds: ['theRidgeLooksBack', 'nephilimBrokenHalo'],
    description: 'A wounded scout who survived Watcher Ridge by running blind.'
  }
};

// -----------------------------------------------------------------------------
// DIALOGUES
// -----------------------------------------------------------------------------

export const DIALOGUES = {
  wardenMaelIntro: {
    id: 'wardenMaelIntro',
    speaker: 'Warden Mael',
    text:
      'The Covenant physicians say you can walk. That makes you luckier than most of your caravan. Orrakai will help you recover. In return, tell us why the Last Dawn chose your wagon.',
    nextNodeId: 'wardenMaelRoadWarning'
  },

  wardenMaelRoadWarning: {
    id: 'wardenMaelRoadWarning',
    speakerId: 'wardenMael',
    speaker: 'Warden Mael',
    text:
      'The Rot drove the wildlife first. Then Last Dawn cells began cutting relief routes and burning patient records. A quiet road means someone has removed the witnesses.',
    appendNpcQuestOptions: false,
    options: [
      {
        id: 'solgateOath',
        label: 'What should I do first?',
        response:
          'Start with the people still breathing. Mara needs medicine, Bram knows the relief road, and the Covenant tents need supplies. We follow the stolen artifact when you can survive the path.',
        startsQuest: 'act1HearthmereAshes',
        revealsPoi: 'ashenOrchard'
      },
      {
        id: 'chapelDescent',
        label: 'What lies beneath the Broken Chapel?',
        response:
          'The Last Dawn burned the chapel index and carried its surviving pages to Last Dawn Keep. Find the witnesses and their defector. Bring me a route, and I will authorize the descent.',
        revealsPoi: 'brokenChapel',
        flagsSet: ['story.wardenNamedChapelDescent'],
        requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theBrokenChapel' }
      },
      {
        id: 'firstOath',
        label: 'I am ready for work.',
        response:
          'Then start small. Gather supplies, kill Blighted Corpses, and come back with proof you can survive without someone carrying you.',
        startsQuest: 'firstOath',
        revealsPoi: 'outpost'
      },
      {
        id: 'advice',
        label: 'Any advice?',
        response:
          'Do not hoard courage. Spend stamina wisely. Camp before you think you need to. Run from anything that has a name until you earn one too.'
      },
      {
        id: 'roadsGoneQuiet',
        label: 'I will find out why the roads went quiet.',
        response:
          'Start at the relief markers east of Orrakai. If the route is empty, look for what someone wanted the missing travelers to witness.',
        startsQuest: 'roadsGoneQuiet',
        revealsPoi: 'brokenChapel',
        requiresQuestCompleted: 'firstOath'
      },
      {
        id: 'afterFirstOath',
        label: 'What comes after the first oath?',
        response:
          'The first oath proves you can return alive. The next work proves someone else can return because you were there.',
        requiresQuestCompleted: 'firstOath'
      },
      {
        id: 'afterMalakar',
        label: 'Malakar is dead. What waits beyond the Pilgrim Road?',
        response:
          'A cleaner road, brighter walls, and people who call obedience safety. Take supplies. The Marches are gentler than Orrakai only when watched from far away.',
        requiresQuestCompleted: 'act1HearthmereAshes'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  maraSmithIntro: {
    id: 'maraSmithIntro',
    speaker: 'Aren the Smith',
    text:
      'Weapons do not save fools. Good iron only helps the person holding it make fewer excuses.',
    options: [
      {
        id: 'ironForMara',
        label: 'Need materials?',
        response:
          'Always. Bring ore from the old road or mire. If you bring me useful metal, I will make sure you are not swinging scrap.',
        startsQuest: 'ironForMara'
      },
      {
        id: 'askGear',
        label: 'What gear should I use?',
        response:
          'Use what matches how you fight. Sword for pressure. Bow for distance. Scythe if you like ghosts staring back. Staff if you trust roots more than people.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  orchardPhysicianDialogue: {
    id: 'orchardPhysicianDialogue',
    speaker: 'Physician Ilyen Vale',
    text:
      'If you came to accuse us, take a basin and accuse while you wash instruments. The outer white-fire line held. Something below the inner trees taught the Rot another way in. I need evidence before I spend lives on an answer.',
    options: [
      {
        id: 'beginLastHarvest',
        label: 'I will reconstruct what happened here.',
        response: 'Start with what people left behind. Then follow the water. Do not mistake an Order seal for a complete answer.',
        startsQuest: 'ashenOrchardLastHarvest',
        revealsPoi: 'ashenOrchard'
      },
      {
        id: 'orchardSituation',
        label: 'Why not burn the whole Orchard now?',
        response: 'Because there are families in these tents, names in those houses, and something ancient below the roots. Fire can save the living and erase the only proof we have.'
      },
      {
        id: 'resolvePurification',
        label: 'Evacuate everyone, then complete the Covenant burn.',
        response: 'We save every patient we can and surrender the Orchard. Necessary is not the same word as clean.',
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClueCount: 6,
        poiResolution: { poiId: 'ashenOrchard', id: 'evacuateAndBurn' },
        rewardItems: [['orchardWhitewashFormula', 1]],
        rewardXp: { warding: 35, renown: 25 },
        flagsSet: ['poi.ashenOrchard.burned', 'recipe.orchardWhitewashKnown']
      },
      {
        id: 'resolveLivingRoot',
        label: '[Thornbinder] Graft clean roots into the blight and keep it alive.',
        response: 'Then we preserve the land by preserving part of its sickness. Mara will call that honest. The Covenant will call it dangerous.',
        classAny: ['thornbinder'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['rootPulse', 'keeperHeart'],
        poiResolution: { poiId: 'ashenOrchard', id: 'livingRootGraft' },
        rewardItems: [['livingAshSeed', 2]],
        rewardXp: { foraging: 45, warding: 25 },
        flagsSet: ['poi.ashenOrchard.livingGraft', 'future.maraLivingAshOption']
      },
      {
        id: 'resolveTestimonyGravecaller',
        label: '[Gravecaller] Ask the dead where the first sickness entered.',
        response: 'I will let the testimony stand, even when it condemns our work. The dead deserve better than becoming convenient witnesses.',
        classAny: ['gravecaller'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['burnedLedger', 'freshGraves'],
        poiResolution: { poiId: 'ashenOrchard', id: 'testimonyOfDead' },
        rewardItems: [['preservedOrchardTestimony', 1]],
        rewardXp: { spirit: 45, renown: 25 },
        flagsSet: ['poi.ashenOrchard.testimonyPreserved', 'future.orchardWitnessAvailable']
      },
      {
        id: 'resolveTestimonyVampire',
        label: '[Vampire] Read the illness still carried in the buried blood.',
        response: 'You found sequence where our records found only bodies. We will preserve it—and we will record exactly how you learned it.',
        raceAny: ['vampire'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['burnedLedger', 'freshGraves'],
        poiResolution: { poiId: 'ashenOrchard', id: 'testimonyOfDead' },
        rewardItems: [['preservedOrchardTestimony', 1]],
        rewardXp: { spirit: 45, renown: 25 },
        flagsSet: ['poi.ashenOrchard.testimonyPreserved', 'future.orchardWitnessAvailable']
      },
      {
        id: 'resolveIrrigation',
        label: '[Waverider] Reverse the buried sluices and starve the inner roots.',
        response: 'The lower chambers flood and the farms downstream inherit tainted water. We gain the Orchard and make a debt of the river.',
        classAny: ['waverider'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['ancientSluice', 'blackIrrigation'],
        poiResolution: { poiId: 'ashenOrchard', id: 'irrigationDiversion' },
        rewardItems: [['preVeilingSluiceMap', 1]],
        rewardXp: { warding: 40, foraging: 25 },
        flagsSet: ['poi.ashenOrchard.sluicesReversed', 'future.ancientWaterRouteKnown']
      },
      {
        id: 'resolveIrrigationPrepared',
        label: 'Use the recovered sluice rubbing and field tools to divert the black water.',
        response: 'No gift of water, only a map, six exhausted volunteers, and leverage. The lower chambers flood and the farms downstream inherit our tainted water.',
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['ancientSluice', 'blackIrrigation', 'familyTable'],
        poiResolution: { poiId: 'ashenOrchard', id: 'irrigationDiversion' },
        rewardItems: [['preVeilingSluiceMap', 1]],
        rewardXp: { stamina: 30, foraging: 30, renown: 20 },
        flagsSet: ['poi.ashenOrchard.sluicesReversed', 'future.ancientWaterRouteKnown', 'future.orchardCivilianEngineers']
      },
      {
        id: 'resolveFoundation',
        label: '[Lightbringer / Nephilim] Seal the ancient floor with living radiance.',
        response: 'It will hold, but the light will bleach every carving it touches. We preserve lives by spending history.',
        classAny: ['lightbringer'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['missingFoundation', 'purificationSlate'],
        poiResolution: { poiId: 'ashenOrchard', id: 'radiantFoundationSeal' },
        rewardItems: [['orchardWhitewashFormula', 1]],
        rewardXp: { spirit: 45, warding: 30 },
        flagsSet: ['poi.ashenOrchard.foundationSealed', 'future.preVeilingSealSeen']
      },
      {
        id: 'resolveFoundationNephilim',
        label: '[Nephilim] Make the old stone answer to its missing harmony.',
        response: 'The stone accepts your light as if it remembers a chord our rites omit. I will not call that miracle until I understand the omission.',
        raceAny: ['nephilim'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['missingFoundation', 'purificationSlate'],
        poiResolution: { poiId: 'ashenOrchard', id: 'radiantFoundationSeal' },
        rewardItems: [['orchardWhitewashFormula', 1]],
        rewardXp: { spirit: 45, warding: 30 },
        flagsSet: ['poi.ashenOrchard.foundationSealed', 'future.preVeilingSealSeen']
      },
      {
        id: 'resolveWard',
        label: '[Oathkeeper] Bind every relief shift into a single defended oath.',
        response: 'A human answer: shifts, rope, clean water, and people keeping promises. It saves this camp today and leaves the wound for tomorrow.',
        classAny: ['oathkeeper'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClueCount: 6,
        poiResolution: { poiId: 'ashenOrchard', id: 'oathboundContainment' },
        rewardItems: [['orchardWhitewashFormula', 1]],
        rewardXp: { stamina: 35, renown: 35 },
        flagsSet: ['poi.ashenOrchard.contained', 'future.covenantVolunteerTrust']
      },
      {
        id: 'resolveWardHuman',
        label: '[Human] Organize the families into a permanent watch and relief rota.',
        response: 'No miracle, then. Just shifts, rope, clean water, and people keeping promises. It saves this camp today and leaves the wound for tomorrow.',
        raceAny: ['human'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClueCount: 6,
        poiResolution: { poiId: 'ashenOrchard', id: 'oathboundContainment' },
        rewardItems: [['orchardWhitewashFormula', 1]],
        rewardXp: { stamina: 35, renown: 35 },
        flagsSet: ['poi.ashenOrchard.contained', 'future.covenantVolunteerTrust']
      },
      {
        id: 'resolveBargain',
        label: '[Fellhunter] Follow the saboteur trail and trade silence for their counteragent.',
        response: 'The medicine arrives. So does the knowledge that we let an Order cell walk away. I will save the patients; I will not bless the bargain.',
        classAny: ['fellhunter'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['lastDawnSatchel', 'deadHealers'],
        poiResolution: { poiId: 'ashenOrchard', id: 'lastDawnBargain' },
        rewardItems: [['lastDawnCipherScrap', 1]],
        rewardXp: { archery: 35, renown: 25 },
        flagsSet: ['poi.ashenOrchard.orderBargain', 'future.lastDawnCounteragentKnown']
      },
      {
        id: 'resolveBargainCambion',
        label: '[Cambion] Answer the binding heat hidden beneath the Order cipher.',
        response: 'The counteragent arrives through fire that does not burn. So does the knowledge that we let an Order cell walk away. I will save the patients; I will not bless the bargain.',
        raceAny: ['cambion'],
        requiresQuestStage: { questId: 'ashenOrchardLastHarvest', stageId: 'whatWillRemain' },
        requiresPoiUnresolved: 'ashenOrchard',
        requiresPoiClues: ['lastDawnSatchel', 'deadHealers'],
        poiResolution: { poiId: 'ashenOrchard', id: 'lastDawnBargain' },
        rewardItems: [['lastDawnCipherScrap', 1]],
        rewardXp: { spirit: 35, renown: 25 },
        flagsSet: ['poi.ashenOrchard.orderBargain', 'future.lastDawnCounteragentKnown']
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  hunterScoutIntro: {
    id: 'hunterScoutIntro',
    speaker: 'Hunter Scout',
    text:
      'The relief road is alive in the wrong way. Blighted Corpses move like lost people, and every black root turns toward stone older than Orrakai.',
    options: [
      {
        id: 'askRoad',
        label: 'What should I watch for?',
        response:
          'Groups. One Blighted Corpse is practice. Three is a lesson. Anything standing still in the road is waiting.'
      },
      {
        id: 'help',
        label: 'I can clear the road.',
        response:
          'Then start before the outpost starts burying scouts.',
        startsQuest: 'roadsGoneQuiet'
      },
      {
        id: 'orchard',
        label: 'Where is the corruption spreading?',
        response:
          'Ashen Orchard. The Covenant perimeter burn held, but the inner roots returned beneath an ancient floor. The Blighted guard it like something below is feeding them instructions.',
        revealsPoi: 'ashenOrchard',
        flagsSet: ['story.hollowRoadScouted'],
        requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theWoundSpreads' }
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  chapelHermitIntro: {
    id: 'chapelHermitIntro',
    speaker: 'Chapel Hermit',
    text:
      'The chapel is broken, not dead. Careful. Broken things cut deeper because people stop respecting them.',
    options: [
      {
        id: 'candles',
        label: 'Why are candles still burning?',
        response:
          'Because the Chapel remembers thousands of public promises and funerals. Now the Rot makes those memories contradict one another. Help Elyra record what remains before choosing which voices should survive.',
        startsQuest: 'ruinedChapelFireCouldNotErase',
        revealsPoi: 'brokenChapel'
      },
      {
        id: 'machinery',
        label: 'What is moving beneath the chapel?',
        response:
          'Not machinery. A prison, perhaps. The Last Dawn broke the lower seal after burning the archive that named what sleeps there. Sister Elyra saved half the index.',
        revealsPoi: 'demonCultLair',
        flagsSet: ['story.dawnspireMachineryFound'],
        requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theBrokenChapel' }
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  mineDrifterIntro: {
    id: 'mineDrifterIntro',
    speaker: 'Mine Drifter',
    text:
      'Iron Mire swallowed a mine, three crews, and one very expensive foreman. The foreman is the only part nobody misses.',
    options: [
      {
        id: 'salvage',
        label: 'Can anything be salvaged?',
        response:
          'Ore, chains, old tools. Maybe bones. Do not bring me bones unless they are carrying iron.',
        startsQuest: 'ironMireSalvage',
        revealsPoi: 'ironMireDungeon'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  sisterElyraIntro: {
    id: 'sisterElyraIntro',
    speaker: 'Sister Elyra',
    text:
      'The chapel roof fell. The vows did not. If you came seeking safety, you are late. If you came seeking purpose, perhaps not.',
    options: [
      {
        id: 'candles',
        label: 'Tell me what happened here. I will help recover the truth.',
        response:
          'The Last Dawn attacked. They killed our defenders and took the reliquary key. That is true. Begin in the courtyard, find Tomas and the children, and record what the fire left before deciding what else is true.',
        startsQuest: 'ruinedChapelFireCouldNotErase',
        revealsPoi: 'brokenChapel'
      },
      {
        id: 'purification',
        label: 'Was the chapel purified?',
        response:
          'Repeatedly. The outer graves quieted and the water cleared. Only the roots beneath the Divine Age foundation returned. Our rite is working; something older is working against it.',
        flagsSet: ['story.dawnspireMachineryFound'],
        requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theCovenantBlessing' }
      },
      {
        id: 'restoreCovenantSanctuary',
        label: 'Restore the Covenant sanctuary and reseal the lower chamber.',
        response: 'We will reopen the road refuge, treat pilgrims, and remember everyone we lost. The sealed testimony goes to Covenant custody. I will not pretend that cost is nothing.',
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClueCount: 9,
        requiresPoiClues: ['damagedPurificationLantern', 'fallenCovenantDefenders', 'covenantSealOrder'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'covenantSanctuary', safeZone: true,
          mapName: 'Restored Chapel Sanctuary',
          journalDescription: 'Sister Elyra and the Covenant survivors restored the roadside sanctuary. Pilgrims have medicine and shelter again, while the altered archive and lower chamber remain under Covenant seal.'
        },
        rewardItems: [['covenantMedicalWrit', 1]],
        rewardXp: { warding: 60, renown: 55 },
        flagsSet: ['poi.brokenChapel.covenantSanctuary', 'service.covenantRoadMedicine', 'future.covenantChapelTrust']
      },
      {
        id: 'restoreOathkeeper',
        label: '[Oathkeeper] Renew the refuge oath without endorsing the altered archive.',
        response: 'Then our service remains witnessed and our silence remains named as a debt. That is harder than obedience and more honest than abandonment.',
        classAny: ['oathkeeper'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['authorizedWardOpening', 'avarranWitnessStone', 'covenantSealOrder'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'covenantSanctuary', safeZone: true,
          mapName: 'Witnessed Chapel Sanctuary',
          journalDescription: 'The Chapel reopened under a renewed public refuge oath. Its healers serve the road, and its sealed history is now recorded as an explicit Covenant debt rather than erased fact.'
        },
        rewardItems: [['covenantMedicalWrit', 1], ['preservedNameCharm', 1]],
        rewardXp: { blade: 35, warding: 55, renown: 55 },
        flagsSet: ['poi.brokenChapel.covenantSanctuary', 'future.avarranRefugeOathRenewed']
      },
      {
        id: 'preserveForbiddenTestimony',
        label: 'Copy and seal the forbidden testimony beyond either faction\'s control.',
        response: 'The road loses a sanctuary and the archive survives. The Echoes will remain unstable around it. Knowledge is not weightless merely because ignorance is worse.',
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClueCount: 12,
        requiresPoiClues: ['originalNineStationPlan', 'selectiveArchiveBurn', 'missingRelicSocket'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'sealedArchive', safeZone: false,
          mapName: 'Sealed Testimony Archive',
          journalDescription: 'The surviving testimony was copied and hidden from both Covenant and Last Dawn control. The Chapel remains an unstable ruin, and pilgrims lost the sanctuary it might have become.'
        },
        rewardItems: [['originalChapelPlan', 1], ['avarranTestimonyBlade', 1]],
        rewardXp: { spirit: 65, runecraft: 60, renown: 45 },
        flagsSet: ['poi.brokenChapel.sealedArchive', 'future.malakarForbiddenTestimony', 'future.lastDawnSeeksPlayerArchive']
      },
      {
        id: 'preserveNephilim',
        label: '[Nephilim] Open the erased station and copy what answers before the defenses reject you.',
        response: 'The foundation recognized you as divine and unauthorized in the same breath. We saved the words. We also taught the old defenses that beings like you have returned.',
        raceAny: ['nephilim'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['originalNineStationPlan', 'missingRelicSocket', 'erasedRestorationOrder'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'sealedArchive', safeZone: false,
          mapName: 'Awakened Testimony Archive',
          journalDescription: 'The Nephilim resonance exposed the Chapel\'s erased station long enough to preserve its testimony. Ancient defenses now recognize that divine Essence returned without authorization.'
        },
        rewardItems: [['originalChapelPlan', 1], ['avarranTestimonyBlade', 1]],
        rewardXp: { spirit: 75, runecraft: 50 },
        flagsSet: ['poi.brokenChapel.sealedArchive', 'future.preVeilingDefenseRecognizedPlayer']
      },
      {
        id: 'layDeadToRest',
        label: 'Restore the missing names and give every Chapel Echo the right to leave.',
        response: 'Then we stop asking the dead to remain useful. Their final testimony will be brief. What they take into silence will belong to them.',
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClueCount: 12,
        requiresPoiClues: ['shiftingMemorialNames', 'interruptedFuneralEcho', 'rightOfFinalRefusal'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'restoredCemetery', safeZone: true,
          mapName: 'Chapel of Restored Names',
          journalDescription: 'The missing names were restored and the ritual Echoes received a genuine opportunity to leave. The cemetery is safe; testimony that departed with the dead is gone forever.'
        },
        rewardItems: [['preservedNameCharm', 1], ['riteOfFinalRefusal', 1]],
        rewardXp: { spirit: 70, renown: 45 },
        flagsSet: ['poi.brokenChapel.restoredCemetery', 'future.oneSpiritMayRefuseSummoning']
      },
      {
        id: 'layDeadGravecaller',
        label: '[Gravecaller] Divide the true dead from the ritual Echoes, then release both.',
        response: 'You did not command them to speak. You asked which memories were theirs. Dusk will understand why that distinction matters.',
        classAny: ['gravecaller'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['shiftingMemorialNames', 'contradictoryHealerEcho'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'restoredCemetery', safeZone: true,
          mapName: 'Chapel of Restored Names',
          journalDescription: 'The Gravecaller separated dead souls from accumulated ritual Echoes and released both. The cemetery is safe, but the testimony no spirit chose to preserve is lost.'
        },
        rewardItems: [['preservedNameCharm', 1], ['riteOfFinalRefusal', 1]],
        rewardXp: { spirit: 85, renown: 40 },
        flagsSet: ['poi.brokenChapel.restoredCemetery', 'future.oneSpiritMayRefuseSummoning']
      },
      {
        id: 'layDeadThornbinder',
        label: '[Thornbinder] Separate every grave-root and carry the distorted grief into a contained grove.',
        response: 'The graves are clean, but the forest will dream fragments of these names. Mara will insist we tend that grove rather than call the work finished.',
        classAny: ['thornbinder'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['cemeteryRootMemory', 'shiftingMemorialNames'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'restoredCemetery', safeZone: true,
          mapName: 'Chapel of Restored Names',
          journalDescription: 'The cemetery roots were separated and the Chapel dead released. Distorted fragments of their grief now persist in a guarded grove that will require future care.'
        },
        rewardItems: [['preservedNameCharm', 1], ['livingAshSeed', 1]],
        rewardXp: { warding: 70, foraging: 45 },
        flagsSet: ['poi.brokenChapel.restoredCemetery', 'future.chapelMemoryGrove']
      },
      {
        id: 'layDeadVampire',
        label: '[Vampire] Recover the death sequence from blood in the stones, then return every name.',
        response: 'The civilians feared how you learned it. They also watched you return the knowledge to the dead instead of keeping it. Both memories will survive.',
        raceAny: ['vampire'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['preservedBloodSequence', 'shiftingMemorialNames'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'restoredCemetery', safeZone: true,
          mapName: 'Chapel of Restored Names',
          journalDescription: 'Blood-memory restored the true death sequence, after which every Chapel name was returned and released. The cemetery is safe, though some civilians now fear its savior.'
        },
        rewardItems: [['preservedNameCharm', 1], ['riteOfFinalRefusal', 1]],
        rewardXp: { spirit: 80, renown: 35 },
        flagsSet: ['poi.brokenChapel.restoredCemetery', 'future.chapelVampireWitness']
      },
      {
        id: 'breakFoundation',
        label: 'Evacuate the survivors and collapse the sealed foundation.',
        response: 'It is the safest answer for the living and the final answer for everything below. We will carry the names we know. The rest become rubble.',
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClueCount: 9,
        requiresPoiClues: ['civilianEscapeRoute', 'misalignedLowerDoor', 'missingRelicSocket'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'collapsedFoundation', safeZone: false,
          mapName: 'Collapsed Chapel Foundation',
          journalDescription: 'The survivors were evacuated and the supernatural threshold destroyed beneath a controlled collapse. The immediate danger ended along with the oldest records and the road sanctuary.'
        },
        rewardItems: [['ironScrap', 6], ['crackedRelic', 1]],
        rewardXp: { stamina: 55, mining: 45, renown: 35 },
        flagsSet: ['poi.brokenChapel.collapsedFoundation', 'future.chapelUndergroundRouteDestroyed']
      },
      {
        id: 'breakFoundationWaverider',
        label: '[Waverider] Flood the lower threshold, then collapse it beneath the current.',
        response: 'The cemetery survives and the foundation drowns. The black water now travels toward an older road. We traded a known danger for one we can follow.',
        classAny: ['waverider'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['purificationWaterMemory', 'misalignedLowerDoor'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'collapsedFoundation', safeZone: false,
          mapName: 'Flooded Chapel Foundation',
          journalDescription: 'The lower threshold was flooded and collapsed while the cemetery remained standing. Contaminated water now marks a dangerous route toward an older road beneath Echoryn.'
        },
        rewardItems: [['originalChapelPlan', 1]],
        rewardXp: { warding: 75, foraging: 30 },
        flagsSet: ['poi.brokenChapel.collapsedFoundation', 'future.oldRoadWaterTrail']
      },
      {
        id: 'breakFoundationLightbringer',
        label: '[Lightbringer] Overload the lantern and burn the forbidden threshold out of the stone.',
        response: 'The light obeyed you as Covenant authority and destroyed everything it classified as forbidden. That ended the threat. It also proved why authority deserves witnesses.',
        classAny: ['lightbringer'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['damagedPurificationLantern', 'erasedRestorationOrder'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'collapsedFoundation', safeZone: false,
          mapName: 'Scoured Chapel Foundation',
          journalDescription: 'A radiant overload destroyed the lower threat and every record the Chapel classified as forbidden. The survivors escaped; certainty was purchased by erasure.'
        },
        rewardItems: [['covenantMedicalWrit', 1]],
        rewardXp: { spirit: 80, warding: 45 },
        flagsSet: ['poi.brokenChapel.collapsedFoundation', 'future.lightbringerWitnessedCensorship']
      },
      {
        id: 'neutralMemorial',
        label: 'Spend supplies to establish an independent memorial, refuge, and public archive.',
        response: 'Neither faction will forgive being denied control. The road receives shelter and the dead keep their names. Now neutrality must be defended every season.',
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClueCount: 12,
        requiresItems: [['ironScrap', 6], ['fieldRations', 6], ['emberleaf', 4]],
        poiResolution: {
          poiId: 'brokenChapel', id: 'neutralMemorial', safeZone: true,
          mapName: 'Open Chapel Memorial',
          journalDescription: 'The player funded a neutral refuge, burial ground, and public archive. Civilians control the site, both factions remain dissatisfied, and maintaining its independence will require future defense.'
        },
        rewardItems: [['neutralMemorialSeal', 1], ['originalChapelPlan', 1]],
        rewardXp: { crafting: 55, renown: 80 },
        flagsSet: ['poi.brokenChapel.neutralMemorial', 'future.neutralChapelDefenseQuest', 'future.civilianArchiveSupport']
      },
      {
        id: 'neutralMemorialHuman',
        label: '[Human] Put the surviving families—not either faction—in charge of the memorial.',
        response: 'Tomas has the families\' trust, but trust is not timber, medicine, or guards. You supplied those. The factions will test whether ordinary people can keep what they built.',
        raceAny: ['human'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClueCount: 10,
        requiresItems: [['ironScrap', 5], ['fieldRations', 5], ['emberleaf', 3]],
        poiResolution: {
          poiId: 'brokenChapel', id: 'neutralMemorial', safeZone: true,
          mapName: 'Open Chapel Memorial',
          journalDescription: 'The surviving families now govern a neutral memorial, road refuge, and public archive. Its legitimacy is local, its resources are thin, and both major factions intend to influence it.'
        },
        rewardItems: [['neutralMemorialSeal', 1]],
        rewardXp: { renown: 85, crafting: 40 },
        flagsSet: ['poi.brokenChapel.neutralMemorial', 'future.neutralChapelDefenseQuest']
      },
      {
        id: 'veyr',
        label: 'Tell me about Castle Veyr.',
        response:
          'House Veyr guarded the chapel before pride hollowed them out. Their shade remains, wearing duty like a chain.',
        startsQuest: 'theVeyrBloodline',
        revealsPoi: 'gothicCastle'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  chapelCivilianDialogue: {
    id: 'chapelCivilianDialogue',
    speaker: 'Tomas Venn',
    text:
      'We came for fever medicine. Then the bell rang without moving and the red-cloaks came through the south wall. Sister Elyra put the children in the crypt before she took up a shield.',
    options: [
      {
        id: 'civilianSequence',
        label: 'What did you see before the attack?',
        response: 'The memorial names changed first. My wife\'s stone showed a stranger. Then a Covenant archivist opened the old cabinet alone. The attackers arrived after sunset.'
      },
      {
        id: 'civilianHumanTrust',
        label: '[Human] Show Tomas the Orrakai refugee procedures and ask where the children hid.',
        response: 'You know the questions because you have answered them yourself. The children found an older witness room behind the crypt. It has nine benches, though the Chapel teaches eight stations.',
        raceAny: ['human'],
        flagsSet: ['poi.brokenChapel.humanCivilianTrust', 'future.chapelHiddenChildRoom']
      },
      {
        id: 'civilianVampireFear',
        label: '[Vampire] Ask permission to read the preserved blood on the crypt threshold.',
        response: 'Tomas gives permission and moves the children farther away. The blood carries the true order of deaths; his fear of you remains equally true.',
        raceAny: ['vampire'],
        flagsSet: ['poi.brokenChapel.vampirePermissionGiven']
      },
      { id: 'leave', label: 'Leave.', close: true }
    ]
  },

  chapelLastDawnDialogue: {
    id: 'chapelLastDawnDialogue',
    speaker: 'Ash-Captain Rusk',
    text:
      'Do not call me innocent. I ordered the south breach. Covenant defenders died because I wanted the reliquary socket before they could move it. I did not order civilians killed. One of mine ignored that distinction.',
    options: [
      {
        id: 'ruskArchive',
        label: 'Why attack an archive that was already altered?',
        response: 'Because altered is not empty. The Covenant covered the ninth station and removed the refusal clause, but the relic still fit the absence. We burned pursuit records and stole older testimony. We also killed people who stood between us and it.'
      },
      {
        id: 'ruskWard',
        label: 'Who opened the ward from inside?',
        response: 'Archivist Pell. Covenant office, Order sympathies, terrified of both. Pell opened it before we arrived and died trying to close it when the Echoes woke. Make of that what your clean histories permit.'
      },
      {
        id: 'bargainLastDawn',
        label: 'Trade the copied records for the rite that contains the Chapel disturbance.',
        response: 'I leave with testimony and blood on my hands. You receive the binding sequence and a quieter cemetery. Do not confuse a useful bargain with forgiveness.',
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['lastDawnAssaultPlan', 'authorizedWardOpening', 'selectiveArchiveBurn'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'lastDawnCache', safeZone: false,
          mapName: 'Abandoned Chapel Cache',
          journalDescription: 'Ash-Captain Rusk escaped with copied testimony after trading the Order\'s containment sequence. The immediate Echo disturbance quieted, Covenant survivors consider the player complicit, and a Last Dawn cache now occupies the lower route.'
        },
        rewardItems: [['lastDawnArchiveKey', 1], ['riteOfFinalRefusal', 1]],
        rewardXp: { runecraft: 65, renown: 30 },
        flagsSet: ['poi.brokenChapel.lastDawnCache', 'future.ruskSurvived', 'future.covenantDistrustChapelBargain']
      },
      {
        id: 'bargainFellhunter',
        label: '[Fellhunter] Secure Rusk\'s escape tunnel, then demand the counter-rite as passage price.',
        response: 'You found my second route and the ally waiting at its end. That makes this negotiation coercion, not trust. Good. Trust would insult the dead.',
        classAny: ['fellhunter'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['lastDawnAssaultPlan', 'attackerTunnelTrail'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'lastDawnCache', safeZone: false,
          mapName: 'Last Dawn Chapel Cache',
          journalDescription: 'The Fellhunter controlled Rusk\'s escape route and forced an exchange for the counter-rite. The attacker survived, the Covenant lost the testimony, and the player gained access to an Order archive trail.'
        },
        rewardItems: [['lastDawnArchiveKey', 1]],
        rewardXp: { archery: 70, renown: 35 },
        flagsSet: ['poi.brokenChapel.lastDawnCache', 'future.ruskSurvived', 'future.lastDawnTunnelKnown']
      },
      {
        id: 'bargainCambion',
        label: '[Cambion] Cross the oath-fire restraint and take the counter-rite Rusk cannot reach.',
        response: 'The restraint marked you as a war-made thing and failed to make you obey. Rusk keeps the relic; you keep the rite. Covenant survivors now wonder what else answered your blood.',
        raceAny: ['cambion'],
        requiresQuestStage: { questId: 'ruinedChapelFireCouldNotErase', stageId: 'commitment' },
        requiresPoiUnresolved: 'brokenChapel',
        requiresPoiClues: ['warEraRestraint', 'lastDawnAssaultPlan'],
        poiResolution: {
          poiId: 'brokenChapel', id: 'lastDawnCache', safeZone: false,
          mapName: 'Last Dawn Chapel Cache',
          journalDescription: 'The Cambion crossed a war-era restraint to recover the Order counter-rite. Rusk escaped with the relic, the Echo disturbance quieted, and Covenant suspicion of the player increased.'
        },
        rewardItems: [['lastDawnArchiveKey', 1], ['cultAsh', 2]],
        rewardXp: { spirit: 65, renown: 30 },
        flagsSet: ['poi.brokenChapel.lastDawnCache', 'future.ruskSurvived', 'future.varkanRestraintRejected']
      },
      { id: 'leave', label: 'Leave.', close: true }
    ]
  },

  chapelOutcomeDialogue: {
    id: 'chapelOutcomeDialogue',
    speaker: 'Chapel Witness',
    text:
      'Walk the site once before you leave. What remains here is not the correct answer. It is the responsibility created by the answer you chose.',
    options: [
      {
        id: 'acceptConsequence',
        label: 'I understand what was preserved—and what was sacrificed.',
        response: 'Then carry both. Certainty that forgets its cost is how this place became a ruin.'
      },
      { id: 'leave', label: 'Leave.', close: true }
    ]
  },

  lordVeyrShadeIntro: {
    id: 'lordVeyrShadeIntro',
    speaker: 'Lord Veyr’s Shade',
    text:
      'You stand beneath my ruined house and still cast a living shadow. Either you are brave, ignorant, or sent.',
    options: [
      {
        id: 'blackSpire',
        label: 'What happened here?',
        response:
          'We made a vow to keep the lower dark sealed. Then my bloodline learned vows can be inherited by cowards.',
        startsQuest: 'theBlackSpire',
        revealsPoi: 'gothicCastle'
      },
      {
        id: 'askHouse',
        label: 'Are you trapped?',
        response:
          'Trapped is a word the living use when duty becomes inconvenient.'
      },
      {
        id: 'redChalice',
        label: 'Ask about the sealed red chalice.',
        response:
          'That cup was not made to drink blood. It was made to teach blood obedience. If you are truly Unbound, perhaps it will fail properly for once.',
        startsQuest: 'vampireRedChalice',
        revealsPoi: 'oldHollowDungeon'
      },
      {
        id: 'chaliceCost',
        label: 'What happens if I drink?',
        response:
          'You will live beyond the shape of ordinary life and hunger beyond ordinary need. The chalice offers no second sip that makes you human again.',
        requiresQuestActive: 'vampireRedChalice'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  thornboundSeerIntro: {
    id: 'thornboundSeerIntro',
    speaker: 'Thornbound Seer',
    text:
      'Step lightly. Roots remember weight. Leaves remember blood. The land has a better memory than any court.',
    options: [
      {
        id: 'rootsRemember',
        label: 'What do the roots remember?',
        response:
          'A wound under Thornroot Crypt. Something cut the forest and never apologized.',
        startsQuest: 'rootsRemember',
        revealsPoi: 'thornrootHollow'
      },
      {
        id: 'thornbinder',
        label: 'What is the Thornbound oath?',
        response:
          'To defend what cannot beg. To punish what cuts without need. To heal when healing still matters.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  repentantCultistIntro: {
    id: 'repentantCultistIntro',
    speaker: 'Last Dawn Defector',
    text:
      'The Order finished the invocation. You are already too late to stop Malakar waking. You may still stop what happens after he answers.',
    options: [
      {
        id: 'redSeal',
        label: 'What is beneath the seal?',
        response:
          'A prison keyed to old testimony. Bring rations and a tonic. The Order holds the upper chambers, and Malakar will kill anyone who reaches the last one.',
        startsQuest: 'beneathTheRedSeal',
        revealsPoi: 'demonCultLair',
        flagsSet: ['story.redSealKnown'],
        requiresQuestStageAtLeast: { questId: 'act1HearthmereAshes', stageId: 'theRedSeal' }
      },
      {
        id: 'cult',
        label: 'Why did you join the Last Dawn?',
        response:
          'Because the Rot took my village while the archives called it an ordinary blight. The Order promised the testimony of someone who watched the Divine War. Then it taught me what promises cost.'
      },
      {
        id: 'ashenPact',
        label: 'Show me the pact the cult feared.',
        response:
          'No. I will show you where it was written, and you can decide whether your bones are foolish enough to read it.',
        startsQuest: 'cambionAshenPact',
        revealsPoi: 'demonCultLair'
      },
      {
        id: 'chainbreaker',
        label: 'Can the infernal fire be taken without a pact?',
        response:
          'The cult said no because obedience was the only miracle they understood. Break every chain first. If even one remains, the fire will use your blood as a leash.',
        requiresQuestActive: 'cambionAshenPact'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  cultistWarning: {
    id: 'cultistWarning',
    speaker: 'Last Dawn Seal-Keeper',
    text:
      'Turn away. The witness is awake, the records are ash, and Orrakai will believe whatever survives us.',
    options: [
      {
        id: 'threaten',
        label: 'Stand aside.',
        response:
          'Then bleed at the threshold.',
        hostileNpcObjectId: 'emberVeilAcolyte'
      },
      {
        id: 'askSeal',
        label: 'What seal?',
        response:
          'The prison beneath the keep. You will hear its witness soon enough—if your faith survives the sound.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  roadlessCaptainIntro: {
    id: 'roadlessCaptainIntro',
    speaker: 'Roadless Captain',
    text:
      'Roads belong to whoever can hold them. The outpost forgot that. I did not.',
    options: [
      {
        id: 'justice',
        label: 'The road is not yours.',
        response:
          'Then take it back with something sharper than opinion.',
        startsQuest: 'roadlessJustice',
        hostileNpcObjectId: 'roadlessCaptain'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  oldTarinIntro: {
    id: 'oldTarinIntro',
    speaker: 'Old Tarin',
    text:
      'The safest path is never the shortest one. The dead usually picked shortcuts. The missing picked pride.',
    options: [
      {
        id: 'embers',
        label: 'Teach me the road.',
        response:
          'Gather emberleaf, clear Blighted Corpses, and rest at the Ashen Orchard. That is the rhythm: gather, fight, breathe, move.',
        startsQuest: 'embersOnTheRoad',
        revealsPoi: 'ashenOrchard'
      },
      {
        id: 'askSurvival',
        label: 'How did you survive this long?',
        response:
          'I ran early, slept often, and never fought anything that looked patient.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  lumenSableIntro: {
    id: 'lumenSableIntro',
    speaker: 'Lumen Sable',
    text:
      'Follow the lanterns. Ignore anything that copies your voice. Especially if it sounds relieved to find you.',
    options: [
      {
        id: 'lanterns',
        label: 'The marsh needs clearing?',
        response:
          'Yes. Travelers vanish when the lantern route goes dark. Kill what gathers there before the path learns new names.',
        startsQuest: 'lanternsInTheMire',
        revealsPoi: 'lanternMarsh'
      },
      {
        id: 'askLights',
        label: 'Are all lanterns safe?',
        response:
          'No. Safe lanterns flicker in wind. Bad ones flicker when you think.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  sableCartographerIntro: {
    id: 'sableCartographerIntro',
    speaker: 'Sable Cartographer',
    text:
      'Every map of this place becomes wrong by morning. Roads shift, ruins lean, and someone keeps adding bridges I did not draw.',
    options: [
      {
        id: 'mapWork',
        label: 'I can confirm landmarks.',
        response:
          'Good. Mark Pilgrim Bridge, Castle Veyr, and Mirror Grove before the land changes its mind.',
        startsQuest: 'wrongByMorning',
        revealsPoi: 'pilgrimBridge'
      },
      {
        id: 'askMap',
        label: 'Why does the map change?',
        response:
          'Because Echoryn Forest is either wounded, haunted, or alive. None of those are cartographically convenient.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  mireWidowIntro: {
    id: 'mireWidowIntro',
    speaker: 'Mire Widow',
    text:
      'The water showed me faces tonight. Some are dead. Some are not dead yet. One looked like you.',
    options: [
      {
        id: 'faces',
        label: 'What do the faces want?',
        response:
          'Names. Bones. Proof that the living still remember who they stepped over.',
        startsQuest: 'facesInTheWater',
        revealsPoi: 'lanternMarsh'
      },
      {
        id: 'askSpirit',
        label: 'Are you a Gravecaller?',
        response:
          'No. Gravecallers choose to listen. I was answered first.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  fenrickSaltIntro: {
    id: 'fenrickSaltIntro',
    speaker: 'Fenrick Salt',
    text:
      'People think fishing is peaceful because fish do not scream. That is a failure of imagination.',
    options: [
      {
        id: 'fishWork',
        label: 'Any work here?',
        response:
          'Bring me silverfin and river reeds. I will feed you better than the outpost does.',
        startsQuest: 'silverInTheRiver',
        revealsPoi: 'saltwellCamp'
      },
      {
        id: 'askRiver',
        label: 'Is the river dangerous?',
        response:
          'Everything is dangerous. The river is at least honest enough to be wet.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  hollowPilgrimIntro: {
    id: 'hollowPilgrimIntro',
    speaker: 'Blighted Pilgrim',
    text:
      'I buried my name under the orchard. Something keeps digging it up and whispering it back wrong.',
    options: [
      {
        id: 'buriedName',
        label: 'What do you need?',
        response:
          'Go below the orchard. If you find a name carved into ashwood, break it before it learns to walk.',
        startsQuest: 'buriedName',
        revealsPoi: 'ashenOrchard'
      },
      {
        id: 'askName',
        label: 'Why bury your name?',
        response:
          'Some vows are lighter when nobody can call you back to them.'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  },

  watcherIvoIntro: {
    id: 'watcherIvoIntro',
    speaker: 'Watcher Ivo',
    text:
      'The ridge looks back. I know how that sounds. I also know what happened to the scouts who laughed.',
    options: [
      {
        id: 'ridge',
        label: 'What is on the ridge?',
        response:
          'A vault, old watch pillars, and something that hates being seen before it sees you.',
        startsQuest: 'theRidgeLooksBack',
        revealsPoi: 'watcherRidge'
      },
      {
        id: 'askSurvive',
        label: 'How did you survive?',
        response:
          'I dropped my torch and ran blind. Bravery is useful. Cowardice is underrated.'
      },
      {
        id: 'brokenHalo',
        label: 'What did the sky leave behind?',
        response:
          'A feather with no bird. A hymn with no mercy. If it calls you beautiful, run until you understand why.',
        startsQuest: 'nephilimBrokenHalo',
        revealsPoi: 'brokenChapel'
      },
      {
        id: 'haloCost',
        label: 'What happens if I carry the halo?',
        response:
          'You become harder to break and easier for the sky to notice. It may call that a blessing. Ask whether it still knows your name before you agree.',
        requiresQuestActive: 'nephilimBrokenHalo'
      },
      {
        id: 'leave',
        label: 'Leave.',
        close: true
      }
    ]
  }
};

// -----------------------------------------------------------------------------
// QUESTS
// -----------------------------------------------------------------------------

export const QUESTS = {
  hollowCrown: {
    id: 'hollowCrown',
    title: 'The Blighted Crown',
    giverNpcId: 'wardenMael',
    recommendedLevel: 1,
    type: 'main',
    summary:
      'Castle Veyr has awakened beyond Orrakai, and the frontier disappearances point toward a history the council buried.',
    stages: [
      {
        id: 'findYourLead',
        text: 'Start in Orrakai: speak with the guild clerk or Warden Mael before taking the south road.',
        objectives: [{ type: 'talk', npcId: 'wardenMael', required: 1 }]
      },
      {
        id: 'oldRoadCorruption',
        text: 'Investigate the old road corruption by defeating 3 Blighted Corpses beyond the safe gates.',
        objectives: [{ type: 'kill', enemyKind: 'hollowling', required: 3 }]
      },
      {
        id: 'findCastleVeyr',
        text: 'Find the evidence that points back to Castle Veyr and the sealed history of Runalis.',
        objectives: [{ type: 'discoverPoi', poiId: 'gothicCastle', required: 1 }]
      },
      {
        id: 'enterCastleVeyr',
        text: 'Enter Castle Veyr through the old frontier road.',
        objectives: [{ type: 'enterDungeon', dungeonId: 'castleVeyr', required: 1 }]
      },
      {
        id: 'defeatVeyrWarden',
        text: 'Defeat The Veyr Warden and claim proof that the old crown still has teeth.',
        objectives: [{ type: 'clearDungeon', dungeonId: 'castleVeyr', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 220, blade: 70, archery: 70, spirit: 70, warding: 70 },
      items: [['ashCoin', 80], ['veyrRapier', 1], ['crackedRelic', 1]]
    }
  },

  solgateOath: {
    id: 'solgateOath',
    title: 'The Solgate Oath',
    giverNpcId: 'wardenMael',
    recommendedLevel: 1,
    type: 'mainStory',
    summary:
      'The seals under Echoryn Forest are waking. Follow Warden Mael from the orchard cellar to Castle Veyr, then break the Ember Veil cult before they summon Malakar through the Solgate.',
    stages: [
      {
        id: 'surviveTheRoad',
        text: 'Prove yourself on the Blighted Road by defeating 3 Blighted Corpses.',
        objectives: [{ type: 'kill', enemyKind: 'hollowling', required: 3 }]
      },
      {
        id: 'orchardSeal',
        text: 'Find and clear the Ashen Orchard Cellar.',
        objectives: [
          { type: 'discoverPoi', poiId: 'ashenOrchard', required: 1 },
          { type: 'clearDungeon', dungeonId: 'ashenOrchard', required: 1 }
        ]
      },
      {
        id: 'thornSeal',
        text: 'Break the root-seal in Thornroot Crypt.',
        objectives: [{ type: 'clearDungeon', dungeonId: 'thornrootHollow', required: 1 }]
      },
      {
        id: 'ironSeal',
        text: 'Break the drowned iron-seal below the Iron Mire.',
        objectives: [{ type: 'clearDungeon', dungeonId: 'ironMireDungeon', required: 1 }]
      },
      {
        id: 'veyrBlood',
        text: 'Reach Castle Veyr and speak with Lord Veyr Shade.',
        objectives: [
          { type: 'discoverPoi', poiId: 'gothicCastle', required: 1 },
          { type: 'talk', npcId: 'lordVeyrShade', required: 1 }
        ]
      },
      {
        id: 'veyrSeal',
        text: 'Clear Castle Veyr and take the black-spire seal.',
        objectives: [{ type: 'clearDungeon', dungeonId: 'castleVeyr', required: 1 }]
      },
      {
        id: 'redSeal',
        text: 'Find the Ember Veil Lair through the endgame story route and stop the cult before Malakar takes form.',
        objectives: [{ type: 'clearDungeon', dungeonId: 'demonCultLair', required: 1 }]
      },
      {
        id: 'oldHollow',
        text: 'Descend into Old Blighted Dungeon and break the last Solgate anchor before another demon can answer the call.',
        objectives: [{ type: 'clearDungeon', dungeonId: 'oldHollowDungeon', required: 1 }]
      },
      {
        id: 'returnToMael',
        text: 'Return to Warden Mael.',
        objectives: [{ type: 'talk', npcId: 'wardenMael', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 500, blade: 120, archery: 120, spirit: 120, warding: 120 },
      items: [['ironOathRing', 1], ['ashCoin', 120], ['shrineTonic', 3]]
    }
  },

  firstOath: {
    id: 'firstOath',
    title: 'First Oath',
    giverNpcId: 'wardenMael',
    recommendedLevel: 1,
    type: 'starter',
    requiresTurnIn: true,
    summary:
      'Warden Mael wants proof that you can survive Echoryn Forest before trusting you with harder work.',
    stages: [
      {
        id: 'gatherSupplies',
        text: 'Collect 3 Emberleaf.',
        objectives: [{ type: 'collect', itemId: 'emberleaf', required: 3 }]
      },
      {
        id: 'killHollowlings',
        text: 'Defeat 3 Blighted Corpses.',
        objectives: [{ type: 'kill', enemyKind: 'hollowling', required: 3 }]
      },
      {
        id: 'returnToMael',
        text: 'Speak with Warden Mael.',
        objectives: [{ type: 'talk', npcId: 'wardenMael', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 50, blade: 20, foraging: 20 },
      items: [['fieldRations', 2], ['ashCoin', 10]]
    }
  },

  roadsGoneQuiet: {
    id: 'roadsGoneQuiet',
    title: 'The Roads Went Quiet',
    giverNpcId: 'wardenMael',
    recommendedLevel: 2,
    type: 'combat',
    summary:
      'The Blighted Road has stopped sending back scouts. Clear the road and find what is drawing Blighted Corpses together.',
    stages: [
      {
        id: 'discoverRoad',
        text: 'Push east along the Blighted Road.',
        objectives: [{ type: 'discoverPoi', poiId: 'ashenOrchard', required: 1 }]
      },
      {
        id: 'clearRoad',
        text: 'Defeat 5 Blighted Corpses on the road.',
        objectives: [{ type: 'kill', enemyKind: 'hollowling', required: 5 }]
      }
    ],
    rewards: {
      xp: { renown: 65, blade: 30 },
      items: [['ashCoin', 15], ['fieldRations', 1]]
    }
  },

  ironForMara: {
    id: 'ironForMara',
    title: 'Iron for Aren',
    giverNpcId: 'maraSmith',
    recommendedLevel: 2,
    type: 'gathering',
    summary:
      'Aren needs ore to keep the outpost armed.',
    stages: [
      {
        id: 'collectOre',
        text: 'Collect 4 Iron Ore.',
        objectives: [{ type: 'collect', itemId: 'ironOre', required: 4 }]
      },
      {
        id: 'returnToMara',
        text: 'Speak with Aren the Smith.',
        objectives: [{ type: 'talk', npcId: 'maraSmith', required: 1 }]
      }
    ],
    rewards: {
      xp: { mining: 60, crafting: 35, renown: 20 },
      items: [['blackIronSword', 1]]
    }
  },

  candlesInTheChapel: {
    id: 'candlesInTheChapel',
    title: 'Candles in the Chapel',
    giverNpcId: 'sisterElyra',
    recommendedLevel: 8,
    type: 'exploration',
    hidden: true,
    summary:
      'The Broken Chapel still burns with unexplained candlelight.',
    stages: [
      {
        id: 'discoverChapel',
        text: 'Discover the Broken Chapel.',
        objectives: [{ type: 'discoverPoi', poiId: 'brokenChapel', required: 1 }]
      },
      {
        id: 'gatherGravecaps',
        text: 'Collect 3 Gravecap near the chapel ruins.',
        objectives: [{ type: 'collect', itemId: 'gravecap', required: 3 }]
      }
    ],
    rewards: {
      xp: { renown: 75, spirit: 45 },
      items: [['shrineTonic', 1], ['paleEssence', 1]]
    }
  },

  theVeyrBloodline: {
    id: 'theVeyrBloodline',
    title: 'The Veyr Bloodline',
    giverNpcId: 'sisterElyra',
    recommendedLevel: 10,
    type: 'story',
    summary:
      'Sister Elyra believes Castle Veyr is tied to the chapel’s continuing unrest.',
    stages: [
      {
        id: 'discoverCastle',
        text: 'Discover Castle Veyr.',
        objectives: [{ type: 'discoverPoi', poiId: 'gothicCastle', required: 1 }]
      },
      {
        id: 'speakShade',
        text: 'Speak with Lord Veyr’s Shade.',
        objectives: [{ type: 'talk', npcId: 'lordVeyrShade', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 120, spirit: 60 },
      items: [['crackedRelic', 1], ['ashCoin', 25]]
    }
  },

  theBlackSpire: {
    id: 'theBlackSpire',
    title: 'The Black Spire',
    giverNpcId: 'lordVeyrShade',
    recommendedLevel: 12,
    type: 'story',
    summary:
      'Lord Veyr’s Shade speaks of a sealed darkness beneath his ruined house.',
    stages: [
      {
        id: 'holdCastle',
        text: 'Defeat 3 Veyr Wraiths near Castle Veyr.',
        objectives: [{ type: 'kill', enemyKind: 'veyrWraith', required: 3 }]
      },
      {
        id: 'findLair',
        text: 'Discover the Ember Veil Lair.',
        objectives: [{ type: 'discoverPoi', poiId: 'demonCultLair', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 160, spirit: 90 },
      items: [['crackedRelic', 2], ['paleEssence', 2]]
    }
  },

  rootsRemember: {
    id: 'rootsRemember',
    title: 'Roots Remember',
    giverNpcId: 'thornboundSeer',
    recommendedLevel: 5,
    type: 'nature',
    summary:
      'The Thornbound Seer says the forest has recorded an old wound below Thornroot Crypt.',
    stages: [
      {
        id: 'discoverThornroot',
        text: 'Discover Thornroot Crypt.',
        objectives: [{ type: 'discoverPoi', poiId: 'thornrootHollow', required: 1 }]
      },
      {
        id: 'clearWolves',
        text: 'Defeat 4 Ash Wolves in Thornwood.',
        objectives: [{ type: 'kill', enemyKind: 'ashWolf', required: 4 }]
      }
    ],
    rewards: {
      xp: { warding: 80, renown: 50 },
      items: [['thornCharm', 1], ['emberleaf', 3]]
    }
  },

  ironMireSalvage: {
    id: 'ironMireSalvage',
    title: 'Iron Mire Salvage',
    giverNpcId: 'mineDrifter',
    recommendedLevel: 9,
    type: 'gathering',
    summary:
      'The Mine Drifter wants useful salvage from the mire.',
    stages: [
      {
        id: 'discoverMire',
        text: 'Discover the Iron Mire Sink.',
        objectives: [{ type: 'discoverPoi', poiId: 'ironMireDungeon', required: 1 }]
      },
      {
        id: 'collectIron',
        text: 'Collect 5 Iron Ore from the Iron Mire.',
        objectives: [{ type: 'collect', itemId: 'ironOre', required: 5 }]
      }
    ],
    rewards: {
      xp: { mining: 100, crafting: 60, renown: 45 },
      items: [['blackIronSword', 1], ['ashCoin', 20]]
    }
  },

  beneathTheRedSeal: {
    id: 'beneathTheRedSeal',
    title: 'Beneath the Last Dawn',
    giverNpcId: 'repentantCultist',
    recommendedLevel: 12,
    type: 'cult',
    summary:
      'A repentant cultist fears the Ember Veil has opened something below Echoryn Forest.',
    stages: [
      {
        id: 'discoverLair',
        text: 'Discover the Ember Veil Lair.',
        objectives: [{ type: 'discoverPoi', poiId: 'demonCultLair', required: 1 }]
      },
      {
        id: 'killCultists',
        text: 'Defeat 4 Ember Veil cultists.',
        objectives: [{ type: 'kill', enemyKind: 'demonCultist', required: 4 }]
      }
    ],
    rewards: {
      xp: { renown: 150, spirit: 75, warding: 40 },
      items: [['paleEssence', 3], ['crackedRelic', 1]]
    }
  },

  roadlessJustice: {
    id: 'roadlessJustice',
    title: 'Roadless Justice',
    giverNpcId: 'roadlessCaptain',
    recommendedLevel: 7,
    type: 'bandit',
    summary:
      'The Roadless Captain has claimed the old road. Take it back.',
    stages: [
      {
        id: 'killBandits',
        text: 'Defeat 5 Roadless Men.',
        objectives: [{ type: 'kill', enemyKind: 'roadlessBandit', required: 5 }]
      }
    ],
    rewards: {
      xp: { renown: 85, blade: 45, archery: 45 },
      items: [['ashCoin', 35], ['fieldRations', 2]]
    }
  },

  embersOnTheRoad: {
    id: 'embersOnTheRoad',
    title: 'Embers on the Road',
    giverNpcId: 'oldTarin',
    recommendedLevel: 2,
    type: 'travel',
    summary:
      'Old Tarin wants you to learn the rhythm of road survival: gather, fight, rest, repeat.',
    stages: [
      {
        id: 'gatherRoadSupplies',
        text: 'Gather 4 Emberleaf along the old road.',
        objectives: [{ type: 'collect', itemId: 'emberleaf', required: 4 }]
      },
      {
        id: 'clearForagers',
        text: 'Defeat 4 Blighted Corpses between the outpost and the Ashen Orchard.',
        objectives: [{ type: 'kill', enemyKind: 'hollowling', required: 4 }]
      },
      {
        id: 'restAtOrchard',
        text: 'Find the Ashen Orchard.',
        objectives: [{ type: 'discoverPoi', poiId: 'ashenOrchard', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 55, foraging: 35, blade: 20 },
      items: [['fieldRations', 2], ['ashCoin', 12]]
    }
  },

  buriedName: {
    id: 'buriedName',
    title: 'The Buried Name',
    giverNpcId: 'hollowPilgrim',
    recommendedLevel: 3,
    type: 'dungeon',
    summary:
      'A hollow pilgrim believes something beneath the Ashen Orchard is learning to wear stolen names.',
    stages: [
      {
        id: 'findCellar',
        text: 'Find the Ashen Orchard Cellar.',
        objectives: [{ type: 'discoverPoi', poiId: 'ashenOrchard', required: 1 }]
      },
      {
        id: 'defeatKeeper',
        text: 'Defeat the Orchard Keeper.',
        objectives: [{ type: 'kill', enemyKind: 'hollowling', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 85, spirit: 35 },
      items: [['paleEssence', 2], ['crackedRelic', 1]]
    }
  },

  wrongByMorning: {
    id: 'wrongByMorning',
    title: 'Wrong by Morning',
    giverNpcId: 'sableCartographer',
    recommendedLevel: 7,
    type: 'exploration',
    summary:
      'Sable Cartographer wants landmarks confirmed before the land changes again.',
    stages: [
      {
        id: 'confirmBridge',
        text: 'Discover Pilgrim Bridge.',
        objectives: [{ type: 'discoverPoi', poiId: 'pilgrimBridge', required: 1 }]
      },
      {
        id: 'confirmCastle',
        text: 'Discover Castle Veyr.',
        objectives: [{ type: 'discoverPoi', poiId: 'gothicCastle', required: 1 }]
      },
      {
        id: 'confirmGrove',
        text: 'Discover Mirror Grove.',
        objectives: [{ type: 'discoverPoi', poiId: 'mirrorGrove', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 90, runecraft: 25 },
      items: [['ashCoin', 25], ['crackedRelic', 1]]
    }
  },

  silverInTheRiver: {
    id: 'silverInTheRiver',
    title: 'Silver in the River',
    giverNpcId: 'fenrickSalt',
    recommendedLevel: 4,
    type: 'gathering',
    summary:
      'Fenrick Salt needs river supplies from Saltwell Camp.',
    stages: [
      {
        id: 'gatherRiverSupplies',
        text: 'Collect 3 River Reed and 2 Silverfin.',
        objectives: [
          { type: 'collect', itemId: 'riverReed', required: 3 },
          { type: 'collect', itemId: 'silverfin', required: 2 }
        ]
      }
    ],
    rewards: {
      xp: { fishing: 80, cooking: 35, renown: 35 },
      items: [['cookedSunfish', 3], ['ashCoin', 18]]
    }
  },

  facesInTheWater: {
    id: 'facesInTheWater',
    title: 'Faces in the Water',
    giverNpcId: 'mireWidow',
    recommendedLevel: 9,
    type: 'occult',
    summary:
      'The Mire Widow wants gravebound remains taken from the Lantern Marsh before the water remembers too much.',
    stages: [
      {
        id: 'collectBone',
        text: 'Collect 4 Bone Shards and 2 Pale Essence in the Iron Mire.',
        objectives: [
          { type: 'collect', itemId: 'boneShard', required: 4 },
          { type: 'collect', itemId: 'paleEssence', required: 2 }
        ]
      },
      {
        id: 'thinGravebound',
        text: 'Defeat 3 Gravebound in the Lantern Marsh.',
        objectives: [{ type: 'kill', enemyKind: 'gravebound', required: 3 }]
      }
    ],
    rewards: {
      xp: { spirit: 90, renown: 70 },
      items: [['shrineTonic', 2], ['paleEssence', 2]]
    }
  },

  lanternsInTheMire: {
    id: 'lanternsInTheMire',
    title: 'Lanterns in the Mire',
    giverNpcId: 'lumenSable',
    recommendedLevel: 9,
    type: 'survival',
    summary:
      'Lumen Sable needs the marsh lantern route cleared before travelers vanish again.',
    stages: [
      {
        id: 'reachLanterns',
        text: 'Discover Lantern Marsh.',
        objectives: [{ type: 'discoverPoi', poiId: 'lanternMarsh', required: 1 }]
      },
      {
        id: 'clearMire',
        text: 'Defeat 4 Gravebound in the Iron Mire.',
        objectives: [{ type: 'kill', enemyKind: 'gravebound', required: 4 }]
      }
    ],
    rewards: {
      xp: { renown: 95, mining: 45, warding: 35 },
      items: [['blackIronSword', 1], ['ashCoin', 30]]
    }
  },

  theRidgeLooksBack: {
    id: 'theRidgeLooksBack',
    title: 'The Ridge Looks Back',
    giverNpcId: 'watcherIvo',
    recommendedLevel: 14,
    type: 'elite',
    summary:
      'Watcher Ivo believes something on the ridge is choosing who gets to leave.',
    stages: [
      {
        id: 'discoverRidge',
        text: 'Discover Watcher Ridge.',
        objectives: [{ type: 'discoverPoi', poiId: 'watcherRidge', required: 1 }]
      },
      {
        id: 'killWatcher',
        text: 'Defeat the Watcher Above the Road.',
        objectives: [{ type: 'kill', enemyKind: 'veyrWraith', required: 1 }]
      }
    ],
    rewards: {
      xp: { renown: 180, spirit: 90, warding: 60 },
      items: [['crackedRelic', 2], ['ashCoin', 60]]
    }
  }
};

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
