// storyData.js
// Three-act narrative roadmap and implementation-facing story state for Runalis.

export const STORY_ACTS = {
  act1: {
    id: 'act1',
    title: 'Act I - The Stolen Dawn',
    regionId: 'hearthmereFrontier',
    thesis: 'The player trusts the Covenant, hunts the violent Last Dawn, and sees the Rot winning until Malakar reveals that Seraphel has withheld part of Divine Age history.',
    mainQuestlineId: 'act1HearthmereAshes',
    finalDungeonId: 'demonCultLair',
    finalBossId: 'malakar',
    actEnd:
      'Malakar falls and calmly reveals that the Last Dawn summoned him as a Divine Age witness, not a god, then warns the player to listen carefully when Seraphel speaks.'
  },

  act2: {
    id: 'act2',
    title: 'Act II - The Beautiful Cage',
    regionId: 'aureateMarches',
    thesis: 'The player enters Covenant territory and discovers that safety, order, and holiness can become instruments of control.',
    mainQuestlineId: 'act2AureateReckoning',
    finalDungeonId: 'shatteredChoir',
    finalBossId: 'seraphel',
    actEnd:
      'Seraphel reveals that the Covenant does not worship Light. It feeds it, and Zephyr Light is waking through the Dawnspire Network.'
  },

  act3: {
    id: 'act3',
    title: 'Act III - The Light That Eats Names',
    regionId: 'ascensionWastes',
    thesis: 'The conflict becomes freedom versus cosmic control as Zephyr offers peace by erasing individuality.',
    mainQuestlineId: 'act3Severance',
    finalDungeonId: 'ascensionSpire',
    finalBossId: 'zephyrLight',
    actEnd:
      'The player decides whether to destroy Zephyr, replace Zephyr, or sever the Dawnspire Network and leave Runalis dangerously free.'
  }
};

export const OPENING_TEN_MINUTES = [
  {
    id: 'ordinaryCaravanGuard',
    minute: '0-4',
    objective: 'Walk the Zarynth road as an ordinary caravan guard.',
    beats: [
      'Merchants, pilgrims, children, veterans, and travelers explain ordinary reasons for making the journey.',
      'A Covenant custodian guards a sealed Divine Age artifact without explaining it.',
      'Silence in the roadside birds provides the only warning.'
    ],
    flags: ['opening.caravanGuard', 'opening.artifactSeen']
  },
  {
    id: 'lastDawnAmbush',
    minute: '4-7',
    objective: 'Defend the caravan during a Last Dawn strike.',
    beats: [
      'The Last Dawn attacks civilians and prioritizes the sealed wagon.',
      'The player fights but is overwhelmed in a controlled narrative defeat.',
      'The artifact is stolen and the caravan burns.'
    ],
    flags: ['opening.caravanDestroyed', 'opening.artifactStolen']
  },
  {
    id: 'wakeInOrrakai',
    minute: '7-10',
    objective: 'Wake inside Orrakai and read the Rot crisis through the city before reporting in.',
    beats: [
      'Quarantine tents, sick wagons, funerals, fresh graves, masked children, and warning bells establish the cost of the Rot.',
      'Covenant physicians, relief workers, teachers, peacekeepers, and priests visibly keep ordinary life functioning.',
      'The player learns Covenant outriders recovered them and begins The Stolen Dawn.'
    ],
    flags: ['opening.recoveredInOrrakai', 'opening.sawCovenantRelief']
  }
];

export const MAIN_QUESTLINES = {
  act1HearthmereAshes: {
    id: 'act1HearthmereAshes',
    actId: 'act1',
    title: 'The Stolen Dawn',
    summary:
      'Follow the stolen artifact through the Rot-stricken frontier, stop the Last Dawn summoning, and survive Malakar\'s testimony.',
    stages: [
      {
        id: 'aLanternInTheMud',
        title: 'After the Road',
        objectives: ['Ask Mara about recovery', 'Prepare with Bram', 'Report the Last Dawn ambush to Warden Mael']
      },
      {
        id: 'handsThatStillWork',
        title: 'Hands That Still Work',
        objectives: ['Gather living medicine', 'Recover repair scrap', 'Secure field rations']
      },
      {
        id: 'bramsRoadLesson',
        title: 'The Relief Road',
        objectives: ['Review the route with Bram', 'Clear Rot-touched creatures', 'Reach the relief scout']
      },
      {
        id: 'theWoundSpreads',
        title: 'Where the Roots Turn',
        objectives: ['Scout beyond the safe road', 'Recover Rot samples', 'Trace roots toward ancient foundations']
      },
      {
        id: 'theCovenantBlessing',
        title: 'White Fire, Black Roots',
        objectives: ['Learn Covenant purification', 'Question Mara', 'Ask Warden Mael how failed sites are contained']
      },
      {
        id: 'failedPurificationSite',
        title: 'Ashen Orchard',
        objectives: ['Discover Ashen Orchard', 'Recover pale essence', 'Survive the failed purification site']
      },
      {
        id: 'evidenceForMara',
        title: 'What the Roots Remember',
        objectives: ['Bring the Orchard evidence to Mara']
      },
      {
        id: 'theBrokenChapel',
        title: 'The Burned Index',
        objectives: ['Discover the Broken Chapel', 'Question the archive witnesses', 'Identify the sealed Divine Age witness']
      },
      {
        id: 'theRedSeal',
        title: 'The Last Dawn',
        objectives: ['Learn how to open the descent', 'Receive Warden Mael\'s authority', 'Prepare rations and a tonic']
      },
      {
        id: 'descentBeneathHearthmere',
        title: 'Descent Beneath the Last Dawn',
        objectives: ['Enter Last Dawn Keep', 'Fight through the Last Dawn guard']
      },
      {
        id: 'malakarAndTheRoot',
        title: 'The Witness Beneath',
        objectives: ['Defeat Malakar', 'Survive the Dawnspire Root awakening', 'Unlock the Pilgrim Road']
      }
    ],
    rewards: {
      gold: 450,
      xp: { renown: 600, classSkill: 320 },
      unlocks: ['travelRoute.pilgrimRoad', 'region.aureateMarches.prep']
    }
  },

  act2AureateReckoning: {
    id: 'act2AureateReckoning',
    actId: 'act2',
    title: 'The Beautiful Cage',
    summary:
      'Cross into Covenant territory, expose purification, and confront Seraphel the Uncrowned.',
    stages: [
      {
        id: 'pilgrimRoad',
        title: 'The Pilgrim Road',
        objectives: ['Prepare rations and gold', 'Choose a caravan route', 'Pass the Covenant checkpoint']
      },
      {
        id: 'cityOfCleanHands',
        title: 'City of Clean Hands',
        objectives: ['Enter Aureate territory', 'Witness public confession', 'Meet Elian in doubt']
      },
      {
        id: 'missingImpure',
        title: 'The Quiet Names',
        objectives: ['Investigate disappearances', 'Find a failed purification hall', 'Protect an Essence-damaged refugee']
      },
      {
        id: 'fallenTruth',
        title: 'The Fallen Truth',
        objectives: ['Reach sky-touched ruins', 'Find Seraphel lore rooms', 'Decide whether to trust a rebel angel']
      },
      {
        id: 'shatteredChoir',
        title: 'The Shattered Choir',
        objectives: ['Clear all 3 floors of Seraphel dungeon', 'Defeat Seraphel', 'Learn Zephyr is waking']
      }
    ],
    rewards: {
      gold: 900,
      xp: { renown: 1200, classSkill: 700 },
      unlocks: ['travelRoute.severedCauseway', 'region.ascensionWastes.prep']
    }
  },

  act3Severance: {
    id: 'act3Severance',
    actId: 'act3',
    title: 'Sever the Light',
    summary:
      'Enter the Ascension-corrupted region and decide the fate of the Dawnspire Network.',
    stages: [
      {
        id: 'severedCauseway',
        title: 'The Severed Causeway',
        objectives: ['Gather extreme expedition supplies', 'Craft lightstorm wards', 'Cross the broken holy road']
      },
      {
        id: 'namesInTheWind',
        title: 'Names in the Wind',
        objectives: ['Hear erased Essence echoes', 'Find broken cities', 'Protect companions from Zephyr whispers']
      },
      {
        id: 'networkHeart',
        title: 'The Network Heart',
        objectives: ['Disable Dawnspire relays', 'Confront purified former allies', 'Open the Ascension Spire']
      },
      {
        id: 'oneLightOneWill',
        title: 'One Light, One Will',
        objectives: ['Clear the Ascension Spire', 'Reject Zephyr assimilation', 'Choose an ending']
      }
    ],
    rewards: {
      gold: 1600,
      xp: { renown: 2400, classSkill: 1400 },
      unlocks: ['ending.choice', 'endgame.infiniteTower.ascensionModifiers']
    }
  }
};

export const UNBOUND_REVEAL_TRACK = [
  {
    id: 'failedBlessing',
    actId: 'act1',
    reveal: 'A Covenant blessing breaks into static around the player instead of purifying them.',
    flag: 'unbound.blessingDistorted'
  },
  {
    id: 'malakarRecognition',
    actId: 'act1',
    reveal: 'Malakar says, "You carry no brand of Heaven, yet the Light follows your blood."',
    flag: 'unbound.malakarRecognized'
  },
  {
    id: 'covenantClassification',
    actId: 'act1',
    reveal: 'The Covenant names the player Unbound and tries to classify them as asset, threat, and miracle at once.',
    flag: 'unbound.namedByCovenant'
  },
  {
    id: 'seraphelRecognition',
    actId: 'act2',
    reveal: 'Seraphel realizes the player can resist both demonic possession and holy rewriting.',
    flag: 'unbound.seraphelConfirmed'
  },
  {
    id: 'zephyrInvitation',
    actId: 'act3',
    reveal: 'Zephyr can speak to the player clearly because their soul cannot be absorbed without consent.',
    flag: 'unbound.zephyrDirectVoice'
  }
];

export const COVENANT_OF_LIGHT = {
  id: 'covenantOfLight',
  publicFace:
    'Healers, road-wardens, refugee kitchens, demon hunters, shrine keepers, and priests promising peace.',
  trueProject:
    'Ascension, a Dawnspire Network that absorbs and rewrites mortal Essence into Zephyr Light.',
  argument:
    'Freedom made demons, betrayal, famine, and war. The Covenant offers peace by ending the choices that create suffering.',
  hierarchy: [
    {
      tier: 1,
      name: 'Lower Members',
      knowledge: 'Mostly sincere. They heal, feed, patrol, and genuinely risk their lives.',
      gameplayUse: 'Friendly patrols, conflicted soldiers, optional mercy choices.'
    },
    {
      tier: 2,
      name: 'Middle Leadership',
      knowledge: 'Know purification damages people but justify it as necessary triage.',
      gameplayUse: 'Confession halls, permit officers, purification wardens.'
    },
    {
      tier: 3,
      name: 'High Leadership',
      knowledge: 'Know Ascension erases individuality and believe individuality is the disease.',
      gameplayUse: 'Act 2 antagonists, holy courts, oppressive city governors.'
    },
    {
      tier: 4,
      name: 'Inner Circle',
      knowledge: 'Intend to survive Ascension as chosen minds inside Zephyr.',
      gameplayUse: 'Act 3 mini-bosses, spire administrators, final dungeon lieutenants.'
    }
  ]
};

export const ENDINGS = {
  destroyZephyr: {
    id: 'destroyZephyr',
    title: 'Freedom at Any Cost',
    description:
      'Zephyr is destroyed. Freedom survives, but the world remains wounded, dangerous, and without a unifying protection.'
  },
  replaceZephyr: {
    id: 'replaceZephyr',
    title: 'The Better Chain',
    description:
      'The player becomes the new guiding consciousness. It begins as mercy and risks repeating the Covenant mistake.'
  },
  severNetwork: {
    id: 'severNetwork',
    title: 'The Lantern Ending',
    description:
      'The Dawnspire Network is severed. Zephyr survives but can no longer claim mortal souls. No god saves the world. Mortals must carry freedom themselves.',
    preferredCanon: true
  }
};

export const RECURRING_SYMBOLS = {
  lantern: {
    id: 'lantern',
    theme: 'Mortal-made light versus overwhelming divine light.',
    uses: [
      'Bram carries a lantern during the opening attack.',
      'The camp lantern marks companion conversations and rest.',
      'Lanterns guide optional side routes in dangerous dungeons.',
      'The final march to Zephyr uses small lanterns instead of holy beams.',
      'The sever-network ending leaves one lantern burning in a dangerous dawn.'
    ]
  },
  runalisName: {
    id: 'runalisName',
    reveal:
      'Runalis was the first mortal who refused Ascension and the first soul the Light could not claim. The Covenant erased the person and kept only the place name.',
    lateGameUse: 'Act 3 lore rooms, final dungeon memory echoes, ending dialogue.'
  }
};

export const SIDE_QUEST_THEMES = [
  {
    id: 'blessingOrRefusal',
    title: 'The Blessing Line',
    theme: 'Accept a Covenant blessing for immediate help, or refuse and keep spiritual autonomy.',
    flags: ['choice.acceptedBlessing', 'choice.refusedBlessing']
  },
  {
    id: 'necromancerMercy',
    title: 'Grave Without Chains',
    theme: 'Turn in a hunted Gravecaller for gold, or learn they are preserving erased memories.',
    flags: ['choice.sparedNecromancer', 'choice.reportedNecromancer']
  },
  {
    id: 'rationsForRefugees',
    title: 'The Hungry Road',
    theme: 'Spend scarce rations on refugees, slowing act travel but strengthening relationships.',
    flags: ['choice.sharedRations', 'choice.keptRations']
  },
  {
    id: 'ordersAndMercy',
    title: 'Only Following Light',
    theme: 'Spare a Covenant soldier who obeyed cruel orders, or execute them as part of the system.',
    flags: ['choice.sparedCovenantSoldier', 'choice.killedCovenantSoldier']
  }
];

export const ENVIRONMENTAL_STORYTELLING = [
  {
    actId: 'act1',
    ideas: [
      'Failed purification circles misidentified as demon scorch marks.',
      'Farm doors scratched from inside after "cleansing."',
      'Old lantern posts where villagers gathered before the Covenant chapel was built.',
      'Dawnspire machinery hidden beneath shrines and chapel floors.'
    ]
  },
  {
    actId: 'act2',
    ideas: [
      'Confession sites with identical written sins.',
      'Beautiful roads patrolled by polite soldiers who record every traveler.',
      'Purification halls where personal belongings are catalogued, then discarded.',
      'Families smiling without recognizing missing relatives.'
    ]
  },
  {
    actId: 'act3',
    ideas: [
      'Road signs rewritten into the same word: Ascend.',
      'Statues with many faces smoothed into one expression.',
      'Echoes of erased citizens repeating unfinished sentences.',
      'Floating ruins arranged like neural pathways around the Dawnspire Network.'
    ]
  }
];

export const IMPLEMENTATION_STATE_KEYS = {
  questFlags: [
    'story.act',
    'story.mainQuestline',
    'story.openingStage',
    'story.hearthmereAttackSurvived',
    'story.dawnspireRootRevealed',
    'story.act1Complete',
    'story.act2Complete',
    'story.act3Complete'
  ],
  unboundFlags: [
    'unbound.echoesHeard',
    'unbound.blessingDistorted',
    'unbound.namedByCovenant',
    'unbound.malakarRecognized',
    'unbound.seraphelConfirmed',
    'unbound.zephyrDirectVoice'
  ],
  regionState: [
    'regions.hearthmereFrontier.unlocked',
    'regions.aureateMarches.unlocked',
    'regions.ascensionWastes.unlocked',
    'regions.currentRegionId'
  ],
  travelState: [
    'travel.pilgrimRoad.unlocked',
    'travel.pilgrimRoad.prepared',
    'travel.pilgrimRoad.completed',
    'travel.severedCauseway.unlocked',
    'travel.severedCauseway.prepared',
    'travel.severedCauseway.completed'
  ],
  companionState: [
    'companions.mara.relationship',
    'companions.bram.relationship',
    'companions.dusk.relationship',
    'companions.elian.relationship',
    'companions.mara.personalQuestStage',
    'companions.bram.personalQuestStage',
    'companions.dusk.personalQuestStage',
    'companions.elian.personalQuestStage'
  ],
  dungeonState: [
    'dungeons.dawnspireRoot.floor',
    'dungeons.dawnspireRoot.shortcutUnlocked',
    'dungeons.shatteredChoir.floor',
    'dungeons.shatteredChoir.shortcutUnlocked',
    'dungeons.ascensionSpire.floor',
    'dungeons.ascensionSpire.shortcutUnlocked'
  ],
  bossState: [
    'boss.malakar.phase',
    'boss.malakar.form',
    'boss.seraphel.phase',
    'boss.seraphel.form',
    'boss.zephyrLight.phase',
    'boss.zephyrLight.form'
  ]
};

export const DEVELOPMENT_CHECKLIST = [
  {
    phase: 1,
    title: 'Story Data Foundation',
    tasks: [
      'Add story, region, travel, companion, dungeon, boss, and dialogue data modules.',
      'Expose state key constants for save migration and quest flags.',
      'Keep current vertical slice stable.'
    ]
  },
  {
    phase: 2,
    title: 'Opening Hearthmere Slice',
    tasks: [
      'Spawn new profiles at Hearthmere opening instead of directly in full hub after intro toggle is enabled.',
      'Add Mara and Bram opening dialogue and short tutorial quests.',
      'Add sunset attack encounter and Malakar first appearance.'
    ]
  },
  {
    phase: 3,
    title: 'Travel Resource Loop',
    tasks: [
      'Add ration counter to travel UI.',
      'Add route gate objects for Pilgrim Road and Severed Causeway.',
      'Gate travel by quest flags, rations, gold, and route permits.'
    ]
  },
  {
    phase: 4,
    title: 'Three Region Expansion',
    tasks: [
      'Promote current overworld into Hearthmere Frontier.',
      'Create Aureate Marches as a second full overworld map.',
      'Create Ascension Wastes as a third full overworld map.'
    ]
  },
  {
    phase: 5,
    title: 'Act Dungeon Milestones',
    tasks: [
      'Build Dawnspire Root as a 3-floor dungeon.',
      'Build Shattered Choir as a 3-floor dungeon.',
      'Build Ascension Spire as a 3-plus-floor final dungeon.'
    ]
  },
  {
    phase: 6,
    title: 'Legendary Boss Framework',
    tasks: [
      'Convert boss framework to read phase definitions from bossData.js.',
      'Add transformation events, dialogue barks, music intensity, and exclusive hazards.',
      'Tune bosses around learnable difficulty instead of raw HP only.'
    ]
  },
  {
    phase: 7,
    title: 'Companion Camp and Class Trainer Depth',
    tasks: [
      'Add camp dialogue state by act and relationship.',
      'Add small class-specific reaction hooks.',
      'Add companion personal quests tied to each class identity.'
    ]
  }
];

export function getStoryAct(actId) {
  return STORY_ACTS[actId] || null;
}

export function getMainQuestline(id) {
  return MAIN_QUESTLINES[id] || null;
}
