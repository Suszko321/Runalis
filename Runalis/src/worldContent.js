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
    {
      id: 'fair',
      name: 'Fair',
      value: '#ffd1bd'
    },
    {
      id: 'warm',
      name: 'Warm',
      value: '#d79b73'
    },
    {
      id: 'tan',
      name: 'Tan',
      value: '#b97854'
    },
    {
      id: 'brown',
      name: 'Brown',
      value: '#7a4a35'
    },
    {
      id: 'deep',
      name: 'Deep',
      value: '#3f261d'
    },
    {
      id: 'ashen',
      name: 'Ashen',
      value: '#b8b0a8'
    }
  ],

  hairColors: [
    {
      id: 'black',
      name: 'Black',
      value: '#0b0d12'
    },
    {
      id: 'brown',
      name: 'Brown',
      value: '#4a2b18'
    },
    {
      id: 'auburn',
      name: 'Auburn',
      value: '#7c3723'
    },
    {
      id: 'blonde',
      name: 'Blonde',
      value: '#d8c891'
    },
    {
      id: 'white',
      name: 'White',
      value: '#e8edf5'
    },
    {
      id: 'violet',
      name: 'Occult Violet',
      value: '#482f55'
    }
  ],

  shirtColors: [
    {
      id: 'wandererGold',
      name: 'Wanderer Gold',
      value: '#f2a51f'
    },
    {
      id: 'forestGreen',
      name: 'Forest Green',
      value: '#446b42'
    },
    {
      id: 'deepBlue',
      name: 'Deep Blue',
      value: '#293fba'
    },
    {
      id: 'wineRed',
      name: 'Wine Red',
      value: '#7a2e35'
    },
    {
      id: 'charcoal',
      name: 'Charcoal',
      value: '#2b2f38'
    },
    {
      id: 'necroticPurple',
      name: 'Necrotic Purple',
      value: '#482f55'
    }
  ],

  pantsColors: [
    {
      id: 'travelerBlue',
      name: 'Traveler Blue',
      value: '#263145'
    },
    {
      id: 'darkBrown',
      name: 'Dark Brown',
      value: '#3a2a22'
    },
    {
      id: 'black',
      name: 'Black',
      value: '#151515'
    },
    {
      id: 'olive',
      name: 'Olive',
      value: '#37402d'
    },
    {
      id: 'gray',
      name: 'Gray',
      value: '#464b55'
    }
  ],

  bootColors: [
    {
      id: 'brownLeather',
      name: 'Brown Leather',
      value: '#3a2a22'
    },
    {
      id: 'blackLeather',
      name: 'Black Leather',
      value: '#111111'
    },
    {
      id: 'grayWraps',
      name: 'Gray Wraps',
      value: '#4b4f58'
    }
  ],

  defaults: {
    bodyType: 'male',
    skinColor: 'fair',
    hairColor: 'black',
    shirtColor: 'wandererGold',
    pantsColor: 'travelerBlue',
    bootColor: 'brownLeather'
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
    name: 'The Broken Chapel',
    alignment: 'neutral',
    description: 'A scattered religious order guarding the remains of an older faith.'
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
    name: 'The Ember Veil',
    alignment: 'hostile',
    description: 'A demon-worshipping cult seeking to open old gates beneath the Sol Land.'
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
    description: 'Old scouts who believe the high places of Sol Land are not empty.'
  }
};

// -----------------------------------------------------------------------------
// POINTS OF INTEREST
// -----------------------------------------------------------------------------

export const WORLD_POIS = {
  outpost: {
    id: 'outpost',
    name: 'Warden Outpost',
    kind: 'settlement',
    factionId: 'outpost',
    tileX: 14,
    tileY: 28,
    radius: 32,
    recommendedLevel: 1,
    description: 'A small frontier outpost where new wanderers find their footing.',
    discoveredText: 'Warden Outpost discovered.',
    mapIcon: 'camp',
    theme: 'frontier',
    tags: ['safe', 'starter', 'questHub']
  },

  thornrootHollow: {
    id: 'thornrootHollow',
    name: 'Thornroot Hollow',
    kind: 'dungeonEntrance',
    factionId: 'thornbound',
    tileX: 58,
    tileY: 124,
    radius: 30,
    recommendedLevel: 4,
    description: 'A root-choked hollow where the forest seems to breathe.',
    discoveredText: 'Thornroot Hollow discovered.',
    mapIcon: 'dungeon',
    theme: 'thorn',
    tags: ['dungeon', 'nature', 'thornbinder']
  },

  brokenChapel: {
    id: 'brokenChapel',
    name: 'The Broken Chapel',
    kind: 'ruin',
    factionId: 'chapel',
    tileX: 238,
    tileY: 45,
    radius: 38,
    recommendedLevel: 8,
    description: 'A chapel whose roof collapsed decades ago. Its altar is still polished clean.',
    discoveredText: 'Broken Chapel discovered.',
    mapIcon: 'chapel',
    theme: 'ruin',
    tags: ['ruin', 'faith', 'undead', 'questHub']
  },

  gothicCastle: {
    id: 'gothicCastle',
    name: 'Castle Veyr',
    kind: 'gothicCastle',
    factionId: 'castleCourt',
    tileX: 292,
    tileY: 52,
    radius: 44,
    recommendedLevel: 10,
    description:
      'A black-spired castle overlooking the broken chapel road. Its banners are gone, but candles still burn in the windows.',
    discoveredText: 'Castle Veyr discovered.',
    mapIcon: 'castle',
    theme: 'gothic',
    tags: ['castle', 'noble', 'undead', 'questHub']
  },

  demonCultLair: {
    id: 'demonCultLair',
    name: 'The Ember Veil Lair',
    kind: 'demonLair',
    factionId: 'demonCult',
    tileX: 306,
    tileY: 184,
    radius: 38,
    recommendedLevel: 12,
    description: 'A concealed underground shrine where cultists gather around a burning red seal.',
    discoveredText: 'Demon Cultist Lair discovered.',
    mapIcon: 'demon',
    theme: 'demon',
    tags: ['cult', 'demon', 'dungeon', 'hostile']
  },

  oldHollowDungeon: {
    id: 'oldHollowDungeon',
    name: 'Old Hollow Dungeon',
    kind: 'dungeonEntrance',
    factionId: 'gravecallers',
    tileX: 282,
    tileY: 205,
    radius: 34,
    recommendedLevel: 12,
    description: 'A dead gate leading beneath the oldest part of the Sol Land.',
    discoveredText: 'Old Hollow Dungeon discovered.',
    mapIcon: 'dungeon',
    theme: 'grave',
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
    tileX: 121,
    tileY: 74,
    radius: 34,
    recommendedLevel: 3,
    description:
      'A burned orchard where the trees still grow fruit-shaped knots of ash. Something under the roots remembers names.',
    discoveredText: 'Ashen Orchard discovered.',
    mapIcon: 'ruin',
    theme: 'grave',
    tags: ['earlyDungeon', 'grave', 'questHub']
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
    questIds: ['firstOath', 'roadsGoneQuiet'],
    description: 'A tired frontier warden who has seen too many new wanderers die on the road.'
  },

  maraSmith: {
    id: 'maraSmith',
    objectId: 'smith',
    name: 'Mara the Smith',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'Smith',
    tileX: 20,
    tileY: 25,
    dialogueId: 'maraSmithIntro',
    questIds: ['ironForMara'],
    description: 'A practical smith who judges people by whether they bring useful materials.'
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
    description: 'A road scout watching the Hollow Road.'
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
    questIds: ['candlesInTheChapel'],
    description: 'A half-mad caretaker living near the broken chapel.'
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
    factionId: 'chapel',
    disposition: 'friendly',
    role: 'Quest Giver',
    tileX: 237,
    tileY: 47,
    dialogueId: 'sisterElyraIntro',
    questIds: ['candlesInTheChapel', 'theVeyrBloodline'],
    description: 'A chapel keeper who refuses to abandon the ruins.'
  },

  lordVeyrShade: {
    id: 'lordVeyrShade',
    objectId: 'lordVeyrShade',
    name: 'Lord Veyr’s Shade',
    factionId: 'castleCourt',
    disposition: 'uncertain',
    role: 'Gothic Castle NPC',
    tileX: 292,
    tileY: 52,
    dialogueId: 'lordVeyrShadeIntro',
    questIds: ['theBlackSpire'],
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
    name: 'Repentant Cultist',
    factionId: 'demonCult',
    disposition: 'fearful',
    role: 'Quest Giver',
    tileX: 289,
    tileY: 172,
    dialogueId: 'repentantCultistIntro',
    questIds: ['beneathTheRedSeal'],
    description: 'A former cultist hiding near the road, terrified of what waits below.'
  },

  emberVeilAcolyte: {
    id: 'emberVeilAcolyte',
    objectId: 'emberVeilAcolyte',
    name: 'Ember Veil Acolyte',
    factionId: 'demonCult',
    disposition: 'hostile',
    role: 'Cultist',
    tileX: 302,
    tileY: 181,
    dialogueId: 'cultistWarning',
    questIds: [],
    description: 'A hostile cultist watching the lair entrance.'
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
    description: 'A mapmaker whose maps of Sol Land keep becoming inaccurate.'
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
    name: 'Hollow Pilgrim',
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
    tileX: 269,
    tileY: 130,
    dialogueId: 'watcherIvoIntro',
    questIds: ['theRidgeLooksBack'],
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
      'Another wanderer. Good. The road keeps eating the brave ones and boring holes through the careful ones. If you want to live, learn work before glory.',
    options: [
      {
        id: 'firstOath',
        label: 'I am ready for work.',
        response:
          'Then start small. Gather supplies, kill hollowlings, and come back with proof you can survive without someone carrying you.',
        startsQuest: 'firstOath',
        revealsPoi: 'outpost'
      },
      {
        id: 'roadsGoneQuiet',
        label: 'What happened to the roads?',
        response:
          'They went quiet. That is worse than screaming. Scouts are missing, carts are abandoned, and the chapel road is lighting candles by itself.',
        startsQuest: 'roadsGoneQuiet',
        revealsPoi: 'brokenChapel'
      },
      {
        id: 'advice',
        label: 'Any advice?',
        response:
          'Do not hoard courage. Spend stamina wisely. Camp before you think you need to. Run from anything that has a name until you earn one too.'
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
    speaker: 'Mara the Smith',
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

  hunterScoutIntro: {
    id: 'hunterScoutIntro',
    speaker: 'Hunter Scout',
    text:
      'Road ahead is alive in the wrong way. Hollowlings move like lost people until they notice you.',
    options: [
      {
        id: 'askRoad',
        label: 'What should I watch for?',
        response:
          'Groups. One hollowling is practice. Three is a lesson. Anything standing still in the road is waiting.'
      },
      {
        id: 'help',
        label: 'I can clear the road.',
        response:
          'Then start before the outpost starts burying scouts.',
        startsQuest: 'roadsGoneQuiet'
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
          'Because someone keeps lighting them from below. I have stopped asking whether they are praying or warning us.',
        startsQuest: 'candlesInTheChapel',
        revealsPoi: 'brokenChapel'
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
        label: 'The candles still burn?',
        response:
          'Yes. And not all flames are comfort. Some are invitations.',
        startsQuest: 'candlesInTheChapel',
        revealsPoi: 'brokenChapel'
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
          'A wound under Thornroot Hollow. Something cut the forest and never apologized.',
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
    speaker: 'Repentant Cultist',
    text:
      'Do not go to the red seal. Do not listen if it speaks kindly. It learned kindness from people it ate.',
    options: [
      {
        id: 'redSeal',
        label: 'What is beneath the seal?',
        response:
          'A gate. Or a mouth. We called it a gate because that made us feel less like food.',
        startsQuest: 'beneathTheRedSeal',
        revealsPoi: 'demonCultLair'
      },
      {
        id: 'cult',
        label: 'Why did you join them?',
        response:
          'Because fear makes cowards religious. Then the thing we prayed to answered.'
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
    speaker: 'Ember Veil Acolyte',
    text:
      'Turn away. The seal opens only for the chosen, and closes only on the screaming.',
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
          'The red one under the world. The one your bones already know.'
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
          'Gather emberleaf, clear hollowlings, and rest at the Ashen Orchard. That is the rhythm: gather, fight, breathe, move.',
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
          'Because the Sol Land is either wounded, haunted, or alive. None of those are cartographically convenient.'
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
    speaker: 'Hollow Pilgrim',
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
  firstOath: {
    id: 'firstOath',
    title: 'First Oath',
    giverNpcId: 'wardenMael',
    recommendedLevel: 1,
    type: 'starter',
    summary:
      'Warden Mael wants proof that you can survive the Sol Land before trusting you with harder work.',
    stages: [
      {
        id: 'gatherSupplies',
        text: 'Collect 3 Emberleaf.',
        objectives: [{ type: 'collect', itemId: 'emberleaf', required: 3 }]
      },
      {
        id: 'killHollowlings',
        text: 'Defeat 3 Hollowlings.',
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
      'The Hollow Road has stopped sending back scouts. Clear the road and find what is drawing hollowlings together.',
    stages: [
      {
        id: 'discoverRoad',
        text: 'Push east along the Hollow Road.',
        objectives: [{ type: 'discoverPoi', poiId: 'ashenOrchard', required: 1 }]
      },
      {
        id: 'clearRoad',
        text: 'Defeat 5 Hollowlings on the road.',
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
    title: 'Iron for Mara',
    giverNpcId: 'maraSmith',
    recommendedLevel: 2,
    type: 'gathering',
    summary:
      'Mara needs ore to keep the outpost armed.',
    stages: [
      {
        id: 'collectOre',
        text: 'Collect 4 Ore.',
        objectives: [{ type: 'collect', itemId: 'ore', required: 4 }]
      },
      {
        id: 'returnToMara',
        text: 'Speak with Mara the Smith.',
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
      'The Thornbound Seer says the forest has recorded an old wound below Thornroot Hollow.',
    stages: [
      {
        id: 'discoverThornroot',
        text: 'Discover Thornroot Hollow.',
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
        text: 'Collect 5 Ore from the Iron Mire.',
        objectives: [{ type: 'collect', itemId: 'ore', required: 5 }]
      }
    ],
    rewards: {
      xp: { mining: 100, crafting: 60, renown: 45 },
      items: [['blackIronSword', 1], ['ashCoin', 20]]
    }
  },

  beneathTheRedSeal: {
    id: 'beneathTheRedSeal',
    title: 'Beneath the Red Seal',
    giverNpcId: 'repentantCultist',
    recommendedLevel: 12,
    type: 'cult',
    summary:
      'A repentant cultist fears the Ember Veil has opened something below the Sol Land.',
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
        text: 'Defeat 4 Hollowlings between the outpost and the Ashen Orchard.',
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
  return DIALOGUES[id] || null;
}

export function getQuest(id) {
  return QUESTS[id] || null;
}

export function getQuestsForNpc(npcId) {
  return Object.values(QUESTS).filter(quest => quest.giverNpcId === npcId);
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
  return Object.values(QUESTS);
}