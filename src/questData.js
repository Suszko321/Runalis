// questData.js
// Implementation-ready story and companion quests for the three-act Runalis arc.

import { MERCY_ENDING, CAMPAIGN_STAGES } from './act1CampaignData.js';
import { ORDER_QUESTS } from './yourOrder.js';

export const STORY_QUESTS = {
  mercy_in_orrakai: {
    id: 'mercy_in_orrakai',
    title: 'Mercy in Orrakai',
    giverNpcId: 'maraVell',
    recommendedLevel: 1,
    type: 'main',
    summary: 'Recover from the Last Dawn ambush and learn where Orrakai needs you next.',
    stages: [
      {
        id: 'speakWithMara', title: 'A Stranger\'s Roof',
        text: 'Speak with the healer who kept you alive.',
        objectives: [{ type: 'talk', npcId: 'maraVell', required: 1, label: 'Speak with Mara Vell' }]
      },
      {
        id: 'findWardenMael', title: 'The Covenant Infirmary',
        text: 'Find the warden responsible for Orrakai\'s defenses.',
        objectives: [{ type: 'talk', npcId: 'wardenMael', required: 1, label: 'Find Warden Mael near the Covenant infirmary' }]
      },
      {
        id: 'aidPlagueTents', title: 'Aid the Plague Tents',
        text: 'Help Orrakai\'s sick and displaced, and listen for anything Mael should know.',
        objectives: [
          { type: 'talk', npcId: 'orrakaiSickVillager', required: 1, label: 'Deliver medicine to a sick villager' },
          { type: 'talk', npcId: 'orrakaiWaterDistribution', required: 1, label: 'Bring clean water from the well stores' },
          { type: 'talk', npcId: 'orrakaiLowerGateGuard', required: 1, label: 'Ask the town guard about Last Dawn sightings' },
          { type: 'talk', npcId: 'orrakaiRefugeeParent', required: 1, label: 'Check on the refugee family near the chapel square' }
        ]
      },
      {
        id: 'reportToWardenMael', title: 'A Useful Account',
        text: 'Return to Mael with what you learned while helping Orrakai.',
        objectives: [{ type: 'talk', npcId: 'wardenMael', required: 1, label: 'Report to Warden Mael' }]
      },
      {
        id: 'speakWithCaelen', title: 'The Cardinal',
        text: 'Hear the Covenant relief leader\'s account of the crisis.',
        objectives: [{ type: 'talk', npcId: 'lightwardenCaelen', required: 1, label: 'Speak with Cardinal Callworth' }]
      },
      {
        id: 'investigateOldWell', title: 'The Old Well',
        text: 'Follow the lower road, survive the Last Dawn presence, and investigate the ritual site.',
        objectives: [
          { type: 'kill', enemyId: 'oldWellPlagueAnimal', required: 1, label: 'Defeat the plague-touched animal' },
          { type: 'kill', enemyId: 'oldWellLastDawnFighter', required: 1, label: 'Defeat the Last Dawn fighter' },
          { type: 'kill', enemyId: 'oldWellLastDawnRitualist', required: 1, label: 'Defeat the Blighted Beast beside the pumping house' },
          { type: 'investigatePoi', poiId: 'oldWellRitualSite', required: 5, label: 'Investigate the Old Well ritual site' }
        ]
      },
      {
        id: 'returnOldWellEvidence', title: 'Cold Light',
        text: 'Bring the Broken Covenant Lantern to Mael before deciding what it means.',
        objectives: [{ type: 'talk', npcId: 'wardenMael', required: 1, label: 'Return to Warden Mael' }]
      },
      {
        id: 'witnessHealingRite', title: 'Reasons to Believe',
        text: 'Observe why Orrakai places its faith in the Covenant of Light.',
        objectives: [{ type: 'talk', npcId: 'covenantHealingRite', required: 1, label: 'Witness the Covenant Healing Rite' }]
      }
    ]
  },
  act1HearthmereAshes: {
    id: 'act1HearthmereAshes',
    title: 'The Stolen Dawn',
    giverNpcId: 'wardenMael',
    recommendedLevel: 1,
    type: 'main',
    summary:
      'Recover in Orrakai, follow the Last Dawn through the spreading Rot, and learn why the Order needs Malakar alive.',
    stages: [
      {
        id: 'aLanternInTheMud',
        title: 'After the Road',
        text: 'Learn who carried you to Orrakai, see how the city holds back the Rot, and report the stolen artifact.',
        objectives: [
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Ask Mara Vell about your recovery' },
          { type: 'talk', npcId: 'bram', required: 1, label: 'Prepare with Bram at the training yard' },
          { type: 'talk', npcId: 'wardenMael', required: 1, label: 'Report the Last Dawn ambush to Warden Mael' }
        ],
        rewards: {
          xp: { renown: 15 },
          items: [['fieldRations', 2]]
        }
      },
      {
        id: 'handsThatStillWork',
        title: 'Hands That Still Work',
        text: 'Replace medicine, repair material, and rations lost in recent Last Dawn attacks on Orrakai relief wagons.',
        objectives: [
          { type: 'collect', itemId: 'emberleaf', required: 3, label: 'Gather Emberleaf for Mara' },
          { type: 'collect', itemId: 'ironScrap', required: 2, label: 'Recover repair-ready Iron Scrap' },
          { type: 'collect', itemId: 'fieldRations', required: 3, label: 'Secure Field Rations' }
        ],
        rewards: {
          xp: { foraging: 30, crafting: 20, renown: 20 },
          items: [['ashCoin', 15]]
        }
      },
      {
        id: 'bramsRoadLesson',
        title: 'The Relief Road',
        text: 'Escort the next supply movement by clearing Rot-touched creatures and finding the scout beyond Orrakai.',
        objectives: [
          { type: 'talk', npcId: 'bram', required: 1, label: 'Review the relief route with Bram' },
          { type: 'killAny', enemyKinds: ['hollowling', 'basicBeast', 'ashWolf'], required: 4, label: 'Clear Rot-touched creatures from Blighted Road' },
          { type: 'talk', npcId: 'hunterScout', required: 1, label: 'Find the Covenant relief scout' }
        ],
        rewards: {
          xp: { stamina: 30, renown: 35 },
          items: [['fieldRations', 3]]
        }
      },
      {
        id: 'theWoundSpreads',
        title: 'Where the Roots Turn',
        text: 'Follow the Rot beyond the safe road and determine why its roots bend toward ancient foundations.',
        objectives: [
          { type: 'killAny', enemyKinds: ['hollowling', 'basicBeast', 'ashWolf', 'cultist'], required: 4, label: 'Clear the spreading Rot' },
          { type: 'collect', itemId: 'gravecap', required: 2, label: 'Recover samples from the changed soil' },
          { type: 'talk', npcId: 'hunterScout', required: 1, label: 'Compare the root pattern with the scout' }
        ],
        rewards: {
          xp: { foraging: 35, renown: 40 },
          items: [['shrineTonic', 1]]
        }
      },
      {
        id: 'theCovenantBlessing',
        title: 'White Fire, Black Roots',
        text: 'Learn how Covenant purification protects settlements and why some Rot returns beneath older sites.',
        objectives: [
          { type: 'talk', npcId: 'sisterElian', required: 1, label: 'Ask Sister Elian how purification works' },
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Ask Mara why roots return beneath old stone' },
          { type: 'talk', npcId: 'wardenMael', required: 1, label: 'Learn how Orrakai contains failed sites' }
        ],
        rewards: {
          xp: { warding: 30, renown: 35 },
          storyFlags: ['story.covenantBlessingWitnessed']
        }
      },
      {
        id: 'failedPurificationSite',
        title: 'Ashen Orchard',
        text: 'Investigate a purification that held at the perimeter but failed above a buried Divine Age floor.',
        objectives: [
          { type: 'discoverPoi', poiId: 'ashenOrchard', required: 1, label: 'Find Ashen Orchard' },
          { type: 'collect', itemId: 'paleEssence', required: 1, label: 'Recover Pale Essence from the wound' },
          { type: 'killAny', enemyKinds: ['hollowling', 'basicBeast', 'ashWolf', 'wraith'], required: 5, label: 'Survive the failed purification site' }
        ],
        rewards: {
          xp: { foraging: 45, warding: 35, renown: 50 },
          items: [['emberleaf', 2]],
          storyFlags: ['story.failedPurificationInvestigated']
        }
      },
      {
        id: 'evidenceForMara',
        title: 'What the Roots Remember',
        text: 'Bring the Orchard evidence to Mara and learn what living roots can reveal about the buried foundation.',
        objectives: [
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Bring the Orchard evidence to Mara' }
        ],
        rewards: {
          xp: { spirit: 35, renown: 30 },
          items: [['shrineTonic', 1]],
          storyFlags: ['story.maraReceivedPurificationEvidence']
        }
      },
      {
        id: 'theBrokenChapel',
        title: 'The Burned Index',
        text: 'Reach the Broken Chapel, reconstruct the records burned by the Last Dawn, and identify the sealed witness below.',
        objectives: [
          { type: 'discoverPoi', poiId: 'brokenChapel', required: 1, label: 'Reach the Broken Chapel' },
          { type: 'talk', npcId: 'chapelHermit', required: 1, label: 'Question the witness to the archive fire' },
          { type: 'talk', npcId: 'sisterElyra', required: 1, label: 'Ask Sister Elyra what the missing index named' }
        ],
        rewards: {
          xp: { spirit: 55, warding: 45, renown: 70 },
          items: [['redSealFragment', 1]],
          storyFlags: ['story.dawnspireRootRevealed']
        }
      },
      {
        id: 'theRedSeal',
        title: 'The Last Dawn',
        text: 'Use a Last Dawn defector\'s route, secure Warden Mael\'s authority, and prepare to stop the summoning.',
        objectives: [
          { type: 'talk', npcId: 'repentantCultist', required: 1, label: 'Question the Last Dawn defector' },
          { type: 'talk', npcId: 'wardenMael', required: 1, label: "Receive Warden Mael's authority" },
          { type: 'collect', itemId: 'fieldRations', required: 5, label: 'Prepare Field Rations for the descent' },
          { type: 'collect', itemId: 'shrineTonic', required: 1, label: 'Prepare a Shrine Tonic' }
        ],
        rewards: {
          xp: { crafting: 45, cooking: 35, renown: 60 },
          items: [['fieldRations', 5]],
          storyFlags: ['story.dawnspireRootEntranceUnlocked']
        }
      },
      {
        id: 'descentBeneathHearthmere',
        title: 'Descent Beneath the Last Dawn',
        text: 'Enter Last Dawn Keep and fight through the Last Dawn as its summoning reaches completion.',
        objectives: [
          { type: 'enterDungeon', dungeonId: 'demonCultLair', required: 1, label: 'Enter the Last Dawn descent' },
          { type: 'killAny', enemyKinds: ['cultist', 'demonCultist', 'exploder', 'gravePriest', 'wraith'], required: 6, label: 'Break through the Last Dawn guard' }
        ],
        rewards: {
          xp: { spirit: 75, renown: 90 },
          items: [['fieldRations', 5]]
        }
      },
      {
        id: 'malakarAndTheRoot',
        title: 'The Witness Beneath',
        text: 'Defeat Malakar, the Primordial summoned as a Divine Age witness, and hear why the Last Dawn needed him.',
        objectives: [
          { type: 'clearDungeon', dungeonId: 'demonCultLair', required: 1, label: 'Defeat Malakar and survive his testimony' }
        ]
      }
    ],
    rewards: {
      xp: { renown: 720, spirit: 120, warding: 90 },
      items: [
        ['pilgrimRoadPermit', 1],
        ['bossCore', 1],
        ['fieldRations', 40],
        ['ashCoin', 250]
      ],
      storyFlags: ['story.act1Complete', 'travel.pilgrimRoad.unlocked']
    }
  },

  act2AureateReckoning: {
    id: 'act2AureateReckoning',
    title: 'The Beautiful Cage',
    giverNpcId: 'sisterElian',
    recommendedLevel: 10,
    type: 'main',
    summary:
      'Cross into Covenant-controlled territory, expose purification, and confront Seraphel the Uncrowned.',
    stages: [
      {
        id: 'reachAureateMarches',
        text: 'Prepare the Pilgrim Road expedition and reach the Aureate Marches.',
        objectives: [
          { type: 'discoverPoi', poiId: 'pilgrimBridge', required: 1 }
        ]
      },
      {
        id: 'confessionCountry',
        text: 'Investigate Covenant order in the Marches.',
        objectives: [
          { type: 'talk', npcId: 'sisterElian', required: 1 },
          { type: 'killAny', enemyKinds: ['shieldKnight', 'cultist', 'wraith'], required: 6 }
        ]
      },
      {
        id: 'shatteredChoir',
        text: 'Descend through the Shattered Choir and defeat Seraphel.',
        objectives: [
          { type: 'enterDungeon', dungeonId: 'shatteredChoir', required: 1 },
          { type: 'clearDungeon', dungeonId: 'shatteredChoir', required: 1 }
        ]
      }
    ],
    rewards: {
      xp: { renown: 1450, blade: 180, spirit: 180, warding: 180 },
      items: [
        ['severedCausewayChart', 1],
        ['lightstormWard', 2],
        ['fieldRations', 80],
        ['ashCoin', 600]
      ],
      storyFlags: ['story.act2Complete', 'travel.severedCauseway.unlocked']
    }
  },

  act3Severance: {
    id: 'act3Severance',
    title: 'Sever the Light',
    giverNpcId: 'kaelenDusk',
    recommendedLevel: 22,
    type: 'main',
    summary:
      'Cross the Severed Causeway, survive the Ascension Wastes, and decide the fate of Zephyr Light.',
    stages: [
      {
        id: 'crossCauseway',
        text: 'Prepare the Severed Causeway expedition and reach the Ascension Wastes.',
        objectives: [
          { type: 'killAny', enemyKinds: ['shieldKnight', 'cultist', 'wraith', 'brute'], required: 8 }
        ]
      },
      {
        id: 'networkRelays',
        text: 'Fight through Zephyr\'s network and open the Ascension Spire.',
        objectives: [
          { type: 'killAny', enemyKinds: ['shieldKnight', 'cultist', 'wraith', 'brute'], required: 12 }
        ]
      },
      {
        id: 'ascensionSpire',
        text: 'Clear the Ascension Spire and resist Zephyr Light.',
        objectives: [
          { type: 'enterDungeon', dungeonId: 'ascensionSpire', required: 1 },
          { type: 'clearDungeon', dungeonId: 'ascensionSpire', required: 1 }
        ]
      }
    ],
    rewards: {
      xp: { renown: 2800, spirit: 420, warding: 320, blade: 320 },
      items: [
        ['zephyrShard', 1],
        ['towerFragment', 5],
        ['ashCoin', 1200]
      ],
      storyFlags: ['story.act3Complete', 'ending.networkSeveredAvailable']
    }
  }
};

export const COMPANION_QUESTS = {
  maraRootsInAsh: {
    id: 'maraRootsInAsh',
    title: 'Roots in Ash',
    giverNpcId: 'maraVell',
    recommendedLevel: 4,
    type: 'companion',
    summary:
      'Help Mara prove the frontier can heal without Covenant purification.',
    stages: [
      {
        id: 'livingMedicine',
        text: 'Gather living medicine from the frontier.',
        objectives: [
          { type: 'collect', itemId: 'emberleaf', required: 5 },
          { type: 'collect', itemId: 'briarRoot', required: 2 }
        ]
      },
      {
        id: 'poisonedGrove',
        text: 'Clear beasts from a failed purification grove.',
        objectives: [
          { type: 'killAny', enemyKinds: ['hollowling', 'basicBeast', 'ashWolf'], required: 6 }
        ]
      }
    ],
    rewards: {
      xp: { warding: 260, foraging: 160 },
      items: [['shrineTonic', 2], ['briarRoot', 2]],
      storyFlags: ['companion.mara.personalQuestComplete']
    }
  },

  bramLanternDrill: {
    id: 'bramLanternDrill',
    title: 'The Lantern Drill',
    giverNpcId: 'bram',
    recommendedLevel: 3,
    type: 'companion',
    summary:
      'Help Bram train ordinary people to survive when heroes are too late.',
    stages: [
      {
        id: 'practiceWeapons',
        text: 'Gather training supplies for Bram.',
        objectives: [
          { type: 'collect', itemId: 'ironScrap', required: 4 },
          { type: 'collect', itemId: 'fieldRations', required: 4 }
        ]
      },
      {
        id: 'holdTheLine',
        text: 'Hold the road while Bram leads the drill.',
        objectives: [
          { type: 'killAny', enemyKinds: ['hollowling', 'basicBeast', 'roadlessBandit'], required: 6 }
        ]
      }
    ],
    rewards: {
      xp: { archery: 260, renown: 160 },
      items: [['banditToken', 2], ['fieldRations', 12]],
      storyFlags: ['companion.bram.personalQuestComplete']
    }
  },

  duskNamesForTheDead: {
    id: 'duskNamesForTheDead',
    title: 'Names for the Dead',
    giverNpcId: 'kaelenDusk',
    recommendedLevel: 8,
    type: 'companion',
    summary:
      'Help Dusk recover names before the Dawnspire Network erases the last echoes of the dead.',
    stages: [
      {
        id: 'graveEchoes',
        text: 'Recover occult remains and listen before commanding.',
        objectives: [
          { type: 'collect', itemId: 'boneShard', required: 4 },
          { type: 'collect', itemId: 'paleEssence', required: 2 }
        ]
      },
      {
        id: 'unquietDead',
        text: 'Defeat spirits without letting the Covenant claim their names.',
        objectives: [
          { type: 'killAny', enemyKinds: ['wraith', 'veyrWraith', 'gravebound'], required: 5 }
        ]
      }
    ],
    rewards: {
      xp: { spirit: 340, runecraft: 140 },
      items: [['graveAsh', 4], ['paleRune', 1]],
      storyFlags: ['companion.dusk.personalQuestComplete']
    }
  },

  elianTheOathAndTheChain: {
    id: 'elianTheOathAndTheChain',
    title: 'The Oath and the Chain',
    giverNpcId: 'sisterElian',
    recommendedLevel: 12,
    type: 'companion',
    requiresTurnIn: true,
    summary:
      'Help Elian decide whether her vows belong to the Covenant or to the people those vows were meant to shield.',
    stages: [
      {
        id: 'forbiddenText',
        text: 'Find evidence that purification removes more than corruption, and force the Covenant guard to reveal where the records were taken.',
        objectives: [
          { type: 'killAny', enemyKinds: ['shieldKnight', 'cultist'], required: 5 }
        ]
      },
      {
        id: 'enterTheChoir',
        text: 'Enter the Shattered Choir and find the chain hall where obedience was made into machinery.',
        objectives: [
          { type: 'enterDungeon', dungeonId: 'shatteredChoir', required: 1, label: 'Enter the Shattered Choir' }
        ]
      },
      {
        id: 'breakTheChainGuard',
        text: 'Break through the Choir guard and expose the oath-engine beneath the reliquary.',
        objectives: [
          { type: 'killAny', enemyKinds: ['shieldKnight', 'cultist', 'gravePriest', 'wraith'], required: 8, label: 'Defeat the Choir chain guard' }
        ]
      },
      {
        id: 'faithWithHands',
        text: 'Clear the Shattered Choir, then return to Elian so she can decide what her oath is meant to protect.',
        objectives: [
          { type: 'clearDungeon', dungeonId: 'shatteredChoir', required: 1, label: 'Clear the Shattered Choir' }
        ]
      }
    ],
    rewards: {
      xp: { blade: 340, warding: 220 },
      items: [['lightstormWard', 1], ['bossCore', 1]],
      storyFlags: ['companion.elian.personalQuestComplete', 'trainer.elian.doubtAwakened']
    }
  }
};

export const BLOODLINE_QUESTS = {
  cambionAshenPact: {
    id: 'cambionAshenPact',
    title: 'The Ashen Pact',
    giverNpcId: 'repentantCultist',
    recommendedLevel: 14,
    type: 'bloodline',
    hidden: true,
    exclusiveGroup: 'act1Bloodline',
    bloodline: 'cambion',
    requiresTurnIn: true,
    summary:
      'Follow Last Dawn seal fragments into a rite built around stolen Primordial mantle-fire and decide whether to claim it as a Cambion.',
    stages: [
      {
        id: 'redSealInvitation',
        title: 'A Heat That Answers',
        text: 'Find the red seal, recover its broken language, and ask why its fire answers you.',
        objectives: [
          { type: 'discoverPoi', poiId: 'demonCultLair', required: 1, label: 'Find Last Dawn Keep and the Last Dawn descent' },
          { type: 'collect', itemId: 'redSealFragment', required: 2, label: 'Recover Last Dawn Fragments' },
          { type: 'talk', npcId: 'repentantCultist', required: 1, label: 'Question the Last Dawn Defector' }
        ],
        rewards: {
          xp: { spirit: 35, renown: 35 },
          items: [['fieldRations', 3]]
        }
      },
      {
        id: 'pactNeverSigned',
        title: 'The Pact That Was Never Signed',
        text: 'Learn whether infernal power can be claimed without kneeling to its source.',
        objectives: [
          { type: 'talk', npcId: 'kaelenDusk', required: 1, label: 'Ask Kaelen Dusk about pactless power' },
          { type: 'killAny', enemyKinds: ['demonCultist', 'cultist', 'exploder'], required: 6, label: 'Defeat infernal creatures drawn to you' }
        ],
        rewards: {
          xp: { spirit: 55, renown: 45 },
          items: [['redSealFragment', 1]]
        }
      },
      {
        id: 'cultFireTrial',
        title: 'Trial of Defiance',
        text: 'Break the Last Dawn guard and return to the seal without accepting ownership from anything below.',
        objectives: [
          { type: 'killAny', enemyKinds: ['demonCultist', 'cultist', 'exploder'], required: 8, label: 'Break the Last Dawn guard' },
          { type: 'talk', npcId: 'repentantCultist', required: 1, label: 'Reject the pact before its witness' }
        ],
        rewards: {
          xp: { blade: 45, spirit: 65, renown: 60 },
          items: [['shrineTonic', 1]],
          storyFlags: ['bloodline.cambion.pactRejected']
        }
      },
      {
        id: 'bloodOfRebelFlame',
        title: 'Blood of the Rebel Flame',
        text: 'Descend through the infernal wound and take its strongest fire without becoming its servant.',
        objectives: [
          { type: 'enterDungeon', dungeonId: 'demonCultLair', required: 1, label: 'Enter the infernal descent' },
          { type: 'clearDungeon', dungeonId: 'demonCultLair', required: 1, label: 'Claim the fire beyond the Last Dawn' },
          { type: 'collect', itemId: 'bossCore', required: 1, label: 'Secure an Infernal Core' }
        ],
        rewards: {
          xp: { spirit: 110, runecraft: 75, renown: 90 },
          items: [['graveAsh', 2]]
        }
      },
      {
        id: 'unboundInfernalRite',
        title: 'Chainbreaker Rite',
        text: 'Prepare a rite that makes the infernal fire yours and leaves no chain for it to pull.',
        objectives: [
          { type: 'collect', itemId: 'graveAsh', required: 6 },
          { type: 'collect', itemId: 'redSealFragment', required: 3 },
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Hear Mara warn what power consumes' },
          { type: 'talk', npcId: 'repentantCultist', required: 1, label: 'Prepare the Chainbreaker Rite' }
        ],
        rewards: {
          xp: { crafting: 90, runecraft: 110, renown: 75 },
          items: [['fieldRations', 8]],
          storyFlags: ['bloodline.cambion.ritePrepared']
        }
      },
      {
        id: 'chooseTheAshenPact',
        title: 'The Ember Under the Skin',
        text: 'Return to the Last Dawn Defector. The fire will wait until you willingly claim it.',
        objectives: [
          { type: 'talk', npcId: 'repentantCultist', required: 1, label: 'Face the permanent Cambion choice' }
        ]
      }
    ],
    rewards: {
      xp: { spirit: 520, renown: 360, runecraft: 260 },
      items: [['redSealFragment', 1], ['fieldRations', 25]],
      storyFlags: ['bloodline.quest.cambionComplete'],
      bloodline: 'cambion',
      bloodlineSkillPoints: 2
    }
  },

  nephilimBrokenHalo: {
    id: 'nephilimBrokenHalo',
    title: 'A Feather Without a Choir',
    giverNpcId: 'watcherIvo',
    recommendedLevel: 15,
    type: 'bloodline',
    hidden: true,
    exclusiveGroup: 'act1Bloodline',
    bloodline: 'nephilim',
    requiresTurnIn: true,
    summary:
      'Trace forbidden Watcher signs from the ridge to the chapel and accept radiant blood without surrendering your will.',
    stages: [
      {
        id: 'unseenChoir',
        title: 'A Light That Does Not Warm',
        text: 'Stand where the sky blinked and follow its cold radiance back to the Broken Chapel.',
        objectives: [
          { type: 'discoverPoi', poiId: 'watcherRidge', required: 1, label: 'Reach Watcher Ridge' },
          { type: 'discoverPoi', poiId: 'brokenChapel', required: 1, label: 'Follow the cold light to the Broken Chapel' },
          { type: 'talk', npcId: 'watcherIvo', required: 1, label: 'Tell Watcher Ivo what you saw' }
        ],
        rewards: {
          xp: { warding: 40, renown: 40 },
          items: [['lanternMoss', 2]]
        }
      },
      {
        id: 'witnessAtTheChapel',
        title: 'The Witness at the Chapel',
        text: 'Question those who call the light a blessing and those who have seen what it removes.',
        objectives: [
          { type: 'talk', npcId: 'sisterElyra', required: 1, label: 'Question Sister Elyra' },
          { type: 'talk', npcId: 'sisterElian', required: 1, label: 'Ask Sister Elian about radiant judgment' },
          { type: 'collect', itemId: 'paleEssence', required: 2, label: 'Recover cold radiant residue' }
        ],
        rewards: {
          xp: { spirit: 45, warding: 55, renown: 45 },
          items: [['shrineTonic', 1]]
        }
      },
      {
        id: 'trialOfMercy',
        title: 'Trial of Mercy',
        text: 'Prove the light will protect through you before you ask it to punish.',
        objectives: [
          { type: 'collect', itemId: 'emberleaf', required: 5, label: 'Gather medicine for the wounded' },
          { type: 'collect', itemId: 'shrineTonic', required: 1, label: 'Prepare a Shrine Tonic' },
          { type: 'killAny', enemyKinds: ['hollowling', 'basicBeast', 'ashWolf'], required: 6, label: 'Protect the road from corrupted creatures' },
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Return to Mara after the trial' }
        ],
        rewards: {
          xp: { foraging: 70, warding: 70, renown: 65 },
          items: [['fieldRations', 6]],
          storyFlags: ['bloodline.nephilim.mercyProven']
        }
      },
      {
        id: 'haloUnderTheHollow',
        title: 'Judgment Beneath the Root',
        text: 'Enter the old hollow and witness what divine machinery does when judgment forgets mercy.',
        objectives: [
          { type: 'enterDungeon', dungeonId: 'oldHollowDungeon', required: 1, label: 'Enter the Old Blighted Dungeon' },
          { type: 'killAny', enemyKinds: ['shieldKnight', 'cultist', 'gravePriest', 'wraith'], required: 8, label: 'Defeat the hollow instruments of judgment' },
          { type: 'clearDungeon', dungeonId: 'oldHollowDungeon', required: 1, label: 'Survive Judgment Beneath the Root' }
        ],
        rewards: {
          xp: { blade: 80, warding: 110, renown: 95 },
          items: [['paleRune', 1]]
        }
      },
      {
        id: 'choirMaterials',
        title: 'The Unburned Name',
        text: 'Prepare a vessel that can carry radiant judgment without surrendering your name to it.',
        objectives: [
          { type: 'collect', itemId: 'lightstormWard', required: 1, label: 'Acquire a Lightstorm Ward' },
          { type: 'collect', itemId: 'paleRune', required: 1 },
          { type: 'collect', itemId: 'lanternMoss', required: 6 },
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Ask Mara how to keep your name' },
          { type: 'talk', npcId: 'watcherIvo', required: 1, label: 'Prepare the broken halo with Watcher Ivo' }
        ],
        rewards: {
          xp: { crafting: 85, spirit: 90, warding: 110 },
          items: [['fieldRations', 8]],
          storyFlags: ['bloodline.nephilim.vesselPrepared']
        }
      },
      {
        id: 'chooseTheBrokenHalo',
        title: 'The Weight of Wings',
        text: 'Return to Watcher Ivo. The broken halo will wait until you willingly carry its judgment.',
        objectives: [
          { type: 'talk', npcId: 'watcherIvo', required: 1, label: 'Face the permanent Nephilim choice' }
        ]
      }
    ],
    rewards: {
      xp: { blade: 440, warding: 360, renown: 360 },
      items: [['lightstormWard', 1], ['fieldRations', 25]],
      storyFlags: ['bloodline.quest.nephilimComplete'],
      bloodline: 'nephilim',
      bloodlineSkillPoints: 2
    }
  },

  vampireRedChalice: {
    id: 'vampireRedChalice',
    title: 'The Red Chalice Under Veyr',
    giverNpcId: 'lordVeyrShade',
    recommendedLevel: 15,
    type: 'bloodline',
    hidden: true,
    exclusiveGroup: 'act1Bloodline',
    bloodline: 'vampire',
    requiresTurnIn: true,
    summary:
      'Uncover the secret Veyr blood rite, descend into the oldest hollow, and drink without becoming a servant.',
    stages: [
      {
        id: 'veyrBloodDoor',
        title: 'The Body Refuses the Grave',
        text: 'Find Castle Veyr and ask its dead lord why his bloodline still refuses the grave.',
        objectives: [
          { type: 'discoverPoi', poiId: 'gothicCastle', required: 1, label: 'Discover Castle Veyr' },
          { type: 'talk', npcId: 'lordVeyrShade', required: 1, label: 'Question Lord Veyr\'s Shade' },
          { type: 'talk', npcId: 'sisterElyra', required: 1, label: 'Ask Sister Elyra about the bloodless dead' }
        ],
        rewards: {
          xp: { spirit: 40, renown: 40 },
          items: [['graveAsh', 2]]
        }
      },
      {
        id: 'invitationInTheDark',
        title: 'Invitation in the Dark',
        text: 'Learn what the Red Chalice offers and what hunger takes from those who accept it.',
        objectives: [
          { type: 'talk', npcId: 'kaelenDusk', required: 1, label: 'Ask Kaelen Dusk about deathless hunger' },
          { type: 'collect', itemId: 'graveAsh', required: 4 },
          { type: 'collect', itemId: 'veyrSigil', required: 1, label: 'Recover a Veyr Sigil' }
        ],
        rewards: {
          xp: { spirit: 65, runecraft: 40, renown: 50 },
          items: [['boneShard', 3]]
        }
      },
      {
        id: 'trialOfRestraint',
        title: 'Trial of Restraint',
        text: 'Face the blood-drunk dead and prove hunger can remain a command rather than a master.',
        objectives: [
          { type: 'killAny', enemyKinds: ['wraith', 'veyrWraith', 'gravebound'], required: 8, label: 'Defeat the blood-drunk dead' },
          { type: 'collect', itemId: 'hollowEye', required: 2, label: 'Recover Blighted Eyes as restraint tokens' },
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Hear Mara\'s warning about endless hunger' }
        ],
        rewards: {
          xp: { blade: 65, spirit: 80, renown: 70 },
          items: [['shrineTonic', 1]],
          storyFlags: ['bloodline.vampire.restraintProven']
        }
      },
      {
        id: 'hungerTrial',
        title: 'The Sealed Crypt',
        text: 'Enter the oldest hollow, uncover the Veyr inheritance, and defeat what immortality made feral.',
        objectives: [
          { type: 'discoverPoi', poiId: 'oldHollowDungeon', required: 1, label: 'Find the Old Blighted Dungeon' },
          { type: 'enterDungeon', dungeonId: 'oldHollowDungeon', required: 1, label: 'Enter the Sealed Crypt' },
          { type: 'clearDungeon', dungeonId: 'oldHollowDungeon', required: 1, label: 'Defeat the crypt guardian' }
        ],
        rewards: {
          xp: { blade: 95, spirit: 110, renown: 100 },
          items: [['crackedRelic', 1]]
        }
      },
      {
        id: 'chaliceOffering',
        title: 'The Last Warm Breath',
        text: 'Prepare the Crimson Vessel, then hear both the dead lord and the living healer before choosing.',
        objectives: [
          { type: 'collect', itemId: 'graveAsh', required: 8 },
          { type: 'collect', itemId: 'boneShard', required: 8 },
          { type: 'collect', itemId: 'crackedRelic', required: 1, label: 'Acquire a vessel for the old blood' },
          { type: 'talk', npcId: 'maraVell', required: 1, label: 'Speak with Mara before leaving ordinary life' },
          { type: 'talk', npcId: 'lordVeyrShade', required: 1, label: 'Prepare the Red Chalice with Lord Veyr' }
        ],
        rewards: {
          xp: { crafting: 85, spirit: 115, renown: 80 },
          items: [['fieldRations', 8]],
          storyFlags: ['bloodline.vampire.chalicePrepared']
        }
      },
      {
        id: 'chooseTheRedChalice',
        title: 'The Thirst Behind the Veil',
        text: 'Return to Lord Veyr\'s Shade. The Red Chalice will wait until you willingly surrender your last warm breath.',
        objectives: [
          { type: 'talk', npcId: 'lordVeyrShade', required: 1, label: 'Face the permanent Vampire choice' }
        ]
      }
    ],
    rewards: {
      xp: { spirit: 420, blade: 300, renown: 360 },
      items: [['graveAsh', 3], ['fieldRations', 25]],
      storyFlags: ['bloodline.quest.vampireComplete'],
      bloodline: 'vampire',
      bloodlineSkillPoints: 2
    }
  }
};

// Keep stage identifiers for migration while completing the formerly unfinished arc.
STORY_QUESTS.mercy_in_orrakai.stages.splice(6, 2, ...MERCY_ENDING);
STORY_QUESTS.mercy_in_orrakai.stages[4].title = 'Cardinal Callworth';
STORY_QUESTS.mercy_in_orrakai.stages[4].objectives[0].label = 'Speak with Cardinal Callworth';
STORY_QUESTS.mercy_in_orrakai.rewards = {xp:{renown:80},items:[['fieldRations',5]],storyFlags:['mercy.complete']};
STORY_QUESTS.act1HearthmereAshes.title = 'Ashes of Orrakai';
STORY_QUESTS.act1HearthmereAshes.summary = 'Follow the stolen cargo through the stricken frontier and stop the ritual beneath Last Dawn Keep.';
STORY_QUESTS.act1HearthmereAshes.stages = CAMPAIGN_STAGES;

export const ALL_RUNALIS_QUESTS = {
  ...ORDER_QUESTS,
  ...STORY_QUESTS,
  ...COMPANION_QUESTS,
  ...BLOODLINE_QUESTS,
  ashenOrchardLastHarvest: {
    id: 'ashenOrchardLastHarvest',
    title: 'The Last Harvest',
    giverNpcId: 'orchardFieldPhysician',
    recommendedLevel: 3,
    type: 'poiSideQuest',
    summary:
      'Read the Orchard as a crime scene, learn why the outer purification held, and choose what the relief camp must risk to save it.',
    stages: [
      {
        id: 'whatTheFamiliesLeft',
        title: 'What the Families Left',
        text: 'Reconstruct the evacuation from household remains, relief work, and the first signs of Rot.',
        objectives: [
          { type: 'investigatePoi', poiId: 'ashenOrchard', required: 3, label: 'Record three Orchard clues' }
        ],
        rewards: { xp: { foraging: 18, renown: 12 } }
      },
      {
        id: 'whatCameThroughWater',
        title: 'What Came Through Water',
        text: 'Link the failed burn, the irrigation channels, the Last Dawn attack, and the older floor below the roots.',
        objectives: [
          { type: 'investigatePoi', poiId: 'ashenOrchard', required: 6, label: 'Link six pieces of evidence' }
        ],
        rewards: { xp: { warding: 22, renown: 18 } }
      },
      {
        id: 'whatWillRemain',
        title: 'What Will Remain',
        text: 'Choose an imperfect intervention. Every answer preserves something and abandons something else.',
        objectives: [
          { type: 'resolvePoi', poiId: 'ashenOrchard', required: 1, label: 'Choose the Orchard response' }
        ]
      }
    ],
    rewards: {
      xp: { renown: 45 },
      storyFlags: ['poi.ashenOrchard.resolved']
    }
  },
  ruinedChapelFireCouldNotErase: {
    id: 'ruinedChapelFireCouldNotErase',
    title: 'What the Fire Could Not Erase',
    giverNpcId: 'sisterElyra',
    recommendedLevel: 8,
    type: 'poiSideQuest',
    summary:
      'The Last Dawn attacked the old chapel, killed its defenders, and stole a relic. Covenant survivors are recovering their dead while Rot spreads through the cemetery and its damaged memories.',
    stages: [
      {
        id: 'discovery',
        title: 'Discovery',
        text: 'Establish the recent sequence of the attack, find the sheltered civilians, and determine whether the damaged purification line can still hold.',
        objectives: [
          { type: 'discoverPoi', poiId: 'brokenChapel', required: 1, label: 'Reach the Broken Chapel' },
          { type: 'talk', npcId: 'chapelCivilianWitness', required: 1, label: 'Locate the civilians hidden near the crypt' },
          { type: 'investigatePoi', poiId: 'brokenChapel', required: 4, label: 'Establish four facts about the attack' }
        ],
        rewards: { xp: { renown: 18, warding: 15 } }
      },
      {
        id: 'investigation',
        title: 'Investigation',
        text: 'Compare physical, historical, spiritual, and faction evidence. The Last Dawn attack is real; the history it targeted is less certain.',
        objectives: [
          { type: 'investigatePoi', poiId: 'brokenChapel', required: 9, label: 'Link nine Chapel clues' },
          { type: 'talk', npcId: 'chapelLastDawnRemnant', required: 1, label: 'Confront the surviving Last Dawn attacker' },
          { type: 'talk', npcId: 'chapelHermit', required: 1, label: 'Compare the caretaker\'s memory with the archive' }
        ],
        rewards: { xp: { spirit: 30, runecraft: 24, renown: 25 } }
      },
      {
        id: 'commitment',
        title: 'Commitment',
        text: 'Decide who controls the Chapel, which testimony survives, and what danger the road must inherit.',
        objectives: [
          { type: 'resolvePoi', poiId: 'brokenChapel', required: 1, label: 'Choose the permanent fate of the Ruined Chapel' }
        ]
      },
      {
        id: 'consequence',
        title: 'Consequence',
        text: 'Walk the changed site and hear what your decision preserved—and what it cost.',
        objectives: [
          { type: 'talk', npcId: 'chapelOutcomeWitness', required: 1, label: 'Witness the Chapel\'s new state' }
        ]
      }
    ],
    rewards: {
      xp: { renown: 85 },
      storyFlags: ['poi.brokenChapel.resolved', 'future.malakarChapelEvidenceKnown']
    }
  }
};

export function getRunalisQuest(id) {
  return ALL_RUNALIS_QUESTS[id] || null;
}

export function getRunalisQuestsForNpc(npcId) {
  return Object.values(ALL_RUNALIS_QUESTS).filter(quest => quest.giverNpcId === npcId);
}
