// dungeonData.js
// Massive act-ending dungeon concepts and implementation-ready floor data.

export const ACT_BOSS_DUNGEONS = {
  dawnspireRoot: {
    id: 'dawnspireRoot',
    actId: 'act1',
    regionId: 'hearthmereFrontier',
    name: 'The Last Dawn Descent',
    entrance: 'beneath Last Dawn Keep',
    bossId: 'malakar',
    massiveSprawling: true,
    minimumFloors: 3,
    requiredQuestFlags: ['story.dawnspireRootEntranceUnlocked'],
    recommendedPreparation: {
      rations: 80,
      gold: 250,
      notes: ['Bring burn resistance or healing food.', 'Clear side rooms for shortcut keys.']
    },
    floors: [
      {
        id: 'chapelUndercroft',
        floorNumber: 1,
        name: 'Chapel Undercroft',
        theme: 'A burned Covenant archive occupied by the Last Dawn.',
        rooms: ['entrance crypt', 'burned index vault', 'sealed baptistry', 'relief survivor cache', 'first shortcut lift'],
        enemies: ['cultist', 'hollowling', 'gravePriest'],
        secrets: ['The Last Dawn burned modern records but stole Divine Age testimony.', 'A relief ledger records genuine Covenant lives saved here.'],
        miniBoss: 'Last Dawn Archive-Burner'
      },
      {
        id: 'redRootWorks',
        floorNumber: 2,
        name: 'Primordial Prisonworks',
        theme: 'Rot-entangled Divine Age containment tunnels wrapped around a Last Dawn summoning route.',
        rooms: ['chain hall', 'corruption cistern', 'mantle kennel', 'prison overlook', 'hidden testimony archive'],
        enemies: ['demonHound', 'infernalBrute', 'cultist', 'wraith'],
        secrets: ['Malakar is labeled WITNESS and PRISONER rather than deity.', 'The Rot follows the prison conduits without damaging them.'],
        miniBoss: 'The Chained Maw'
      },
      {
        id: 'rootHeart',
        floorNumber: 3,
        name: 'The Witness Vault',
        theme: 'A Divine Age prison opened by people willing to die for forbidden testimony.',
        rooms: ['testimony hall', 'broken seal gallery', 'Malakar approach', 'Final Siege arena'],
        enemies: ['infernalBrute', 'gravePriest', 'demonHound'],
        secrets: ['Malakar is a Mantled Primordial, not a Primearch.', 'The Order\'s summoning geometry was built to compel answers, not receive worship.'],
        miniBoss: 'The Last Interrogator',
        finalBossArena: 'The Witness Crown'
      }
    ],
    shortcuts: ['chapelLift', 'chainGate', 'rootHeartReturnSeal'],
    completionFlags: ['story.act1Complete', 'dungeons.dawnspireRoot.completed']
  },

  shatteredChoir: {
    id: 'shatteredChoir',
    actId: 'act2',
    regionId: 'aureateMarches',
    name: 'The Shattered Choir',
    entrance: 'a fallen sky-temple suspended above the Aureate Marches',
    bossId: 'seraphel',
    massiveSprawling: true,
    minimumFloors: 3,
    requiredQuestFlags: ['story.seraphelRouteUnlocked'],
    recommendedPreparation: {
      rations: 120,
      gold: 500,
      notes: ['Bring shadow and holy mitigation.', 'Expect precision dodge checks and vertical routes.']
    },
    floors: [
      {
        id: 'pilgrimAscent',
        floorNumber: 1,
        name: 'Pilgrim Ascent',
        theme: 'Beautiful broken stairs through floating cathedral debris.',
        rooms: ['wind bridge', 'choir reliquary', 'confession balcony', 'pilgrim grave walk'],
        enemies: ['oathboundKnight', 'purifierAcolyte', 'radiantWraith'],
        secrets: ['Seraphel fought demons in the ancient war.', 'The Covenant rewrote records to call rebellion "falling."'],
        miniBoss: 'Choir Warden'
      },
      {
        id: 'battlefieldOfHalos',
        floorNumber: 2,
        name: 'Battlefield of Halos',
        theme: 'Ancient angelic battlefield where holy and shadow scars overlap.',
        rooms: ['broken halo field', 'spearfall bridge', 'ash storm cloister', 'memory court'],
        enemies: ['brokenSeraphEcho', 'confessorMage', 'radiantWraith'],
        secrets: ['Seraphel discovered forced Ascension and rebelled.', 'His rebellion saved some mortals and doomed others.'],
        miniBoss: 'The Mourning Spear'
      },
      {
        id: 'uncrownedSanctum',
        floorNumber: 3,
        name: 'Uncrowned Sanctum',
        theme: 'A tragic celestial throne room built from exile, guilt, and wrath.',
        rooms: ['uncrowned throne', 'wing vault', 'last testimony chamber', 'void-suspended arena'],
        enemies: ['brokenSeraphEcho', 'lightboundKnight', 'radiantWraith'],
        secrets: ['The Covenant does not worship Light. It feeds it.', 'Zephyr is not controlled by the Covenant.'],
        miniBoss: 'Seraphel\'s Mercy',
        finalBossArena: 'The Last Judgment Vault'
      }
    ],
    shortcuts: ['windLift', 'haloGate', 'sanctumReturnSeal'],
    completionFlags: ['story.act2Complete', 'dungeons.shatteredChoir.completed']
  },

  ascensionSpire: {
    id: 'ascensionSpire',
    actId: 'act3',
    regionId: 'ascensionWastes',
    name: 'The Ascension Spire',
    entrance: 'the Covenant holy capital and the living interior of the Dawnspire Network',
    bossId: 'zephyrLight',
    massiveSprawling: true,
    minimumFloors: 3,
    preferredFloors: 5,
    requiredQuestFlags: ['story.ascensionSpireUnlocked'],
    recommendedPreparation: {
      rations: 180,
      gold: 900,
      notes: ['Bring top-tier gear, crafted wards, and full companion readiness.', 'This is the longest story dungeon.']
    },
    floors: [
      {
        id: 'holyCapitalGate',
        floorNumber: 1,
        name: 'Holy Capital Gate',
        theme: 'Covenant-controlled city streets under perfect light.',
        rooms: ['checkpoint avenue', 'public confession rotunda', 'governor court', 'refugee silence ward'],
        enemies: ['networkKnight', 'purifierAcolyte', 'innerCircleGovernor'],
        secrets: ['Citizens are alive but internally synchronized.', 'The Inner Circle expected to remain themselves after Ascension.'],
        miniBoss: 'Governor of Gentle Chains'
      },
      {
        id: 'essenceHarvest',
        floorNumber: 2,
        name: 'Essence Harvest',
        theme: 'Machinery under holy architecture, harvesting grief, memory, doubt, and love.',
        rooms: ['memory vats', 'name mill', 'purification engine', 'companion temptation chambers'],
        enemies: ['essenceHusk', 'networkKnight', 'zephyrEcho'],
        secrets: ['Ascension is not healing. It is edited personhood.', 'Zephyr learned compassion from stolen pain.'],
        miniBoss: 'The Name-Miller'
      },
      {
        id: 'relayMind',
        floorNumber: 3,
        name: 'Relay Mind',
        theme: 'Surreal cosmic architecture where roads behave like thoughts.',
        rooms: ['thought bridge', 'many-eyed chapel', 'identity fracture maze', 'Dawnspire relay core'],
        enemies: ['zephyrEcho', 'lightboundAngel', 'purifiedCitizen'],
        secrets: ['Runalis was the first Unbound.', 'Zephyr cannot absorb the player without consent.'],
        miniBoss: 'Runalis Erasure Echo'
      },
      {
        id: 'unityThreshold',
        floorNumber: 4,
        name: 'Unity Threshold',
        theme: 'Entering the body and will of Zephyr Light.',
        rooms: ['choir of one', 'lantern bridge', 'companion memory gauntlet', 'network severance door'],
        enemies: ['zephyrEcho', 'innerCircleGovernor', 'lightboundAngel'],
        secrets: ['Each companion receives a personal offer from Zephyr.', 'The lantern motif becomes the counter-symbol to divine light.'],
        miniBoss: 'The Choir That Was Everyone'
      },
      {
        id: 'worldDevouringUnity',
        floorNumber: 5,
        name: 'World-Devouring Unity',
        theme: 'The final arena inside cosmic light and mortal fear.',
        rooms: ['quiet offer', 'network heart', 'final arena'],
        enemies: ['zephyrEcho'],
        secrets: ['The ending choice is prepared here: destroy, replace, or sever.'],
        finalBossArena: 'The Heart of One Light'
      }
    ],
    shortcuts: ['capitalGateLift', 'harvestReturnSeal', 'relayBridge', 'unityLanternPath'],
    completionFlags: ['story.act3Complete', 'dungeons.ascensionSpire.completed']
  }
};

export function getActBossDungeon(id) {
  return ACT_BOSS_DUNGEONS[id] || null;
}

export function getDungeonsForAct(actId) {
  return Object.values(ACT_BOSS_DUNGEONS).filter(dungeon => dungeon.actId === actId);
}
