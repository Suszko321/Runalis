// bossData.js
// Data-driven major boss phase definitions for Runalis.

export const MAJOR_BOSSES = {
  malakar: {
    id: 'malakar',
    name: 'Malakar',
    actId: 'act1',
    dungeonId: 'demonCultLair',
    role: 'Act 1 final boss',
    theme: 'An ancient Primordial weapon summoned by the Last Dawn as a hostile witness to the Divine Age.',
    truth:
      'Malakar is not a Primearch and holds no divine office. His value to the Last Dawn is memory: he survived the history Seraphel helped curate.',
    preFightLine: 'Your Order woke a weapon and expected a witness. Let us discover which one survives.',
    tests: ['stamina management', 'panic control', 'mobility', 'close-range survival', 'corruption hazard awareness'],
    rewards: ['malakarCore', 'infernalRelic', 'act1LegendaryChoice'],
    phases: [
      {
        id: 'infernalWarden',
        phase: 1,
        formName: 'Authority',
        healthThreshold: 1,
        transformationTrigger: 'fightStart',
        visualDescription:
          'A towering Primordial warlord in black-red armor, war-grown horns, broken binding chains, and controlled mantle-fire.',
        attackPatterns: ['Royal Cleave', 'Thronebreaker', 'Infernal Decree', 'Brand of the Last Dawn', 'Sovereign’s Rupture'],
        arenaHazards: ['directly controlled attacks only; no persistent pools or adds'],
        dialogueLines: ['They summoned memory and sent you to silence it. Neither of us should be flattered.'],
        musicIntensity: 1,
        nextPhaseCondition: 'hp <= 70%'
      },
      {
        id: 'brokenSeal',
        phase: 2,
        formName: 'Wrath',
        healthThreshold: 0.7,
        transformationTrigger: 'The Last Dawn binding reacts to Malakar blood',
        visualDescription:
          'Armor shatters, mantle-fire exposes the heart-core, and an ancient siege-form tears through the Last Dawn chains.',
        attackPatterns: ['wide claw sweeps', 'floor eruptions', 'corruption waves', 'rushing impale'],
        arenaHazards: ['serial brand–cleave and charge–rupture combinations'],
        dialogueLines: ['I broke cities before your Covenant learned to write mercy on its wagons.'],
        musicIntensity: 2,
        nextPhaseCondition: 'hp <= 35%'
      },
      {
        id: 'abyssalCataclysm',
        phase: 3,
        formName: 'Ruin',
        healthThreshold: 0.35,
        transformationTrigger: 'Malakar tears free of the summoning geometry',
        visualDescription:
          'Malakar resumes the colossal siege-body he wore during the Divine War, all mantle-fire, torn chains, and weaponized memory.',
        attackPatterns: ['cataclysm slam', 'wing furnace', 'arena cleave', 'The Final Siege fractures', 'desperation roar'],
        arenaHazards: ['three telegraphed floor-fracture volleys with stable safe lanes'],
        dialogueLines: ['Primearchs served purpose. I survived it. Learn the difference before Seraphel names me liar.'],
        musicIntensity: 3,
        rewardUnlocks: ['story.act1Complete', 'travelRoute.pilgrimRoad'],
        nextPhaseCondition: 'defeat'
      }
    ]
  },

  seraphel: {
    id: 'seraphel',
    name: 'Seraphel the Uncrowned',
    actId: 'act2',
    dungeonId: 'shatteredChoir',
    role: 'Act 2 final boss',
    theme: 'A fallen angel who rejected forced Ascension but lost compassion in exile.',
    truth:
      'Seraphel proves angels and holy beings are not automatically good, and truth without mercy becomes destruction.',
    preFightLine: 'Mortals begged for chains and called them blessings.',
    tests: ['timing', 'precision dodging', 'pattern reading', 'holy and shadow pressure', 'discipline'],
    rewards: ['seraphelFeather', 'uncrownedRelic', 'act2LegendaryChoice'],
    phases: [
      {
        id: 'exiledLuminary',
        phase: 1,
        formName: 'The Exiled Luminary',
        healthThreshold: 1,
        transformationTrigger: 'fightStart',
        visualDescription:
          'An angelic knight in radiant armor with a broken halo and damaged wings, solemn and precise.',
        attackPatterns: ['holy spear combo', 'light lance', 'teleporting thrust', 'wing parry'],
        arenaHazards: ['delayed light marks'],
        dialogueLines: ['I remember when Light meant shield, not leash.'],
        musicIntensity: 1,
        nextPhaseCondition: 'hp <= 70%'
      },
      {
        id: 'uncrownedRuin',
        phase: 2,
        formName: 'The Uncrowned Ruin',
        healthThreshold: 0.7,
        transformationTrigger: 'restraint collapses',
        visualDescription:
          'Wings fray and darken, halo splinters, armor cracks, and holy light mixes with shadow and radiant ash.',
        attackPatterns: ['holy-shadow chain combo', 'shattered light bursts', 'radiant ash storm', 'grief dash'],
        arenaHazards: ['alternating holy and shadow safe zones'],
        dialogueLines: ['I saw the truth. Then I mistook wrath for courage.'],
        musicIntensity: 2,
        nextPhaseCondition: 'hp <= 35%'
      },
      {
        id: 'lastJudgment',
        phase: 3,
        formName: 'Seraphel, Last Judgment',
        healthThreshold: 0.35,
        transformationTrigger: 'truth loses mercy',
        visualDescription:
          'A massive seraphic horror with many wings, many eyes, radiant fractures, and unbearable angelic anatomy.',
        attackPatterns: ['sky-cleaving beam', 'judgment bombardment', 'broken angel echoes', 'halo collapse'],
        arenaHazards: ['falling platforms', 'light-shadow storm rotation'],
        dialogueLines: ['If mercy cannot save them, judgment will end them.'],
        musicIntensity: 3,
        rewardUnlocks: ['story.act2Complete', 'travelRoute.severedCauseway'],
        nextPhaseCondition: 'defeat'
      }
    ]
  },

  zephyrLight: {
    id: 'zephyrLight',
    name: 'Zephyr Light',
    actId: 'act3',
    dungeonId: 'ascensionSpire',
    role: 'Act 3 final boss',
    theme: 'An Eldritch Demi-God of cosmic control, born from worship, machinery, Essence, and something older.',
    truth:
      'Zephyr is compassionate and terrifying. He wants to end loneliness by ending the self.',
    preFightLine: 'You will never be alone again, because there will be no you left to suffer.',
    tests: [
      'total mastery',
      'positioning',
      'adaptability',
      'pattern recognition',
      'survivability',
      'build optimization',
      'long-fight endurance'
    ],
    rewards: ['endingChoice', 'zephyrShard', 'networkSeveranceRelic'],
    phases: [
      {
        id: 'gentleLight',
        phase: 1,
        formName: 'The Gentle Light',
        healthThreshold: 1,
        transformationTrigger: 'fightStart',
        visualDescription:
          'A beautiful humanoid divine figure, serene, elegant, softly radiant, and unsettlingly perfect.',
        attackPatterns: ['light spear', 'delayed inevitability marks', 'echo copy attack', 'soft field control'],
        arenaHazards: ['calm light zones that become spears after delay'],
        dialogueLines: ['I will end loneliness.', 'Let me carry what you cannot.'],
        musicIntensity: 1,
        nextPhaseCondition: 'hp <= 70%'
      },
      {
        id: 'ascendantNetwork',
        phase: 2,
        formName: 'The Ascendant Network',
        healthThreshold: 0.7,
        transformationTrigger: 'player resists assimilation',
        visualDescription:
          'The humanoid body opens into non-human geometry, halos multiply, and cosmic roots, threads, eyes, and structures connect through the arena.',
        attackPatterns: ['projection summons', 'multi-point beams', 'movement distortion', 'Essence pressure pulses'],
        arenaHazards: ['rotating network nodes', 'identity pressure zones'],
        dialogueLines: ['You are tired of being separate. All mortals are.', 'Resistance is a wound asking to close.'],
        musicIntensity: 2,
        nextPhaseCondition: 'hp <= 35%'
      },
      {
        id: 'worldDevouringUnity',
        phase: 3,
        formName: 'Zephyr Light, World-Devouring Unity',
        healthThreshold: 0.35,
        transformationTrigger: 'network exposes its end-state',
        visualDescription:
          'A colossal eldritch demi-god of impossible geometry, many eyes, wings, cosmic roots, divine masks, and heaven fused with horror.',
        attackPatterns: ['world beam', 'memory echo summons', 'many-face judgment', 'network collapse', 'lantern safe-zone test'],
        arenaHazards: ['shifting arena quadrants', 'companion echo pressure', 'severance channel windows'],
        dialogueLines: ['No more grief. No more hunger. No more you.', 'One Light. One wound closed forever.'],
        musicIntensity: 3,
        rewardUnlocks: ['ending.choice'],
        nextPhaseCondition: 'endingChoice'
      }
    ]
  }
};

export const BOSS_DIFFICULTY_RULES = {
  goodDifficulty: [
    'Every lethal attack has a readable telegraph.',
    'Every phase introduces a new mechanic before combining it with older ones.',
    'Damage is punishing but avoidable through positioning, dodge, block, or preparation.',
    'Bosses have openings after dangerous patterns.',
    'Consumables and build choices matter without replacing skill.'
  ],
  avoid: [
    'Random one-shots without warning.',
    'Visual clutter that hides the safe response.',
    'Attack spam with no openings.',
    'Inflated HP as the only source of difficulty.'
  ]
};

export function getMajorBoss(id) {
  return MAJOR_BOSSES[id] || null;
}

export function getBossPhaseDefinition(bossId, phase) {
  return getMajorBoss(bossId)?.phases?.find(p => p.phase === phase) || null;
}
