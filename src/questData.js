// questData.js
// Implementation-ready story and companion quests for the three-act Runalis arc.

import { MERCY_ENDING, CAMPAIGN_STAGES } from './act1CampaignData.js';
import {VEYREIGN_QUEST_DATA} from './veyreignData.js';
import {GROVE_QUEST,GROVE_QUEST_DATA} from './blightedGroveData.js';
import {ORCHARD_QUEST,ORCHARD_QUEST_DATA} from './ashenOrchardData.js';
import {IRON_MIRE_QUEST,IRON_MIRE_QUEST_DATA} from './ironMireData.js';

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
        text: 'Help Orrakai\'s sick and displaced, and listen for anything Mael should know. Any town watch guard can give the road report. Look in the open square below the Market Steps or beside the infirmary’s west side.',
        objectives: [
          { type: 'talk', npcId: 'orrakaiSickVillager', required: 1, label: 'Deliver medicine to a sick villager' },
          { type: 'talk', npcId: 'orrakaiWaterDistribution', required: 1, label: 'Bring clean water from the well stores' },
          { type: 'talk', npcId: 'orrakaiLowerGateGuard', required: 1, label: 'Ask any Orrakai town watch guard about Last Dawn sightings' }
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

// Compatibility exports: these optional chains are no longer playable.
export const COMPANION_QUESTS = {};
export const BLOODLINE_QUESTS = {vampireRedChalice: VEYREIGN_QUEST_DATA};

// Keep stage identifiers for migration while completing the formerly unfinished arc.
STORY_QUESTS.mercy_in_orrakai.stages.splice(6, 2, ...MERCY_ENDING);
STORY_QUESTS.mercy_in_orrakai.stages[4].title = 'Cardinal Callworth';
STORY_QUESTS.mercy_in_orrakai.stages[4].objectives[0].label = 'Speak with Cardinal Callworth';
STORY_QUESTS.mercy_in_orrakai.rewards = {xp:{renown:80},items:[['fieldRations',5]],storyFlags:['mercy.complete']};
STORY_QUESTS.act1HearthmereAshes.title = 'Ashes of Orrakai';
STORY_QUESTS.act1HearthmereAshes.summary = 'Follow the stolen cargo through the stricken frontier and stop the ritual beneath Last Dawn Keep.';
STORY_QUESTS.act1HearthmereAshes.stages = CAMPAIGN_STAGES;

export const ALL_RUNALIS_QUESTS = {
  ...STORY_QUESTS,
  vampireRedChalice: VEYREIGN_QUEST_DATA,
  [GROVE_QUEST]: GROVE_QUEST_DATA,
  [ORCHARD_QUEST]: ORCHARD_QUEST_DATA,
  [IRON_MIRE_QUEST]: IRON_MIRE_QUEST_DATA
};

export function getRunalisQuest(id) {
  return ALL_RUNALIS_QUESTS[id] || null;
}

export function getRunalisQuestsForNpc(npcId) {
  return Object.values(ALL_RUNALIS_QUESTS).filter(quest => quest.giverNpcId === npcId);
}
