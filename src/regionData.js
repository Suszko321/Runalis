// regionData.js
// Full overworld region definitions for Runalis acts.

export const RUNALIS_REGIONS = {
  hearthmereFrontier: {
    id: 'hearthmereFrontier',
    actId: 'act1',
    name: 'Echoryn Forest',
    mapRole: 'act-full-overworld',
    currentWorldUpgrade: true,
    recommendedLevelRange: [1, 18],
    safeSpawn: { x: 39, y: 29, hubId: 'hearthmereVillage' },
    sideZones: ['hollowGrove', 'abandonedMine', 'ashenFarmstead', 'graveyardCellar'],
    infiniteDungeon: {
      id: 'hearthmereDepths',
      name: 'The Root Below',
      theme: 'grave'
    },
    environmentalMessages: [
      'The frontier road is quiet enough to hear Rot-touched things moving beyond the relief markers.',
      'Black roots bend toward Divine Age stone beneath the ruined farms.'
    ],
    tone: 'A layered frontier where faith, preparation, and organized relief hold back a spreading ecological and historical wound.',
    visualStyle: {
      palette: ['wet pine green', 'mud brown', 'Covenant cream and gold', 'old chapel stone', 'Last Dawn red'],
      terrain: ['forests', 'relief roads', 'quarantine camps', 'ruined farms', 'tainted groves', 'layered ancient shrines'],
      weather: ['rain', 'purification smoke', 'fog over farms', 'Rot ash near failed sites']
    },
    safeHubs: [
      {
        id: 'hearthmereVillage',
        name: 'Orrakai',
        role: 'quarantine city, relief hub, and emotional home'
      },
      {
        id: 'frontierCamp',
        name: 'Lantern Camp',
        role: 'mobile Covenant relief camp beyond Orrakai'
      }
    ],
    majorLocations: [
      'Orrakai',
      'Burned Caravan Road',
      'Corrupted Old Road',
      'Mara\'s Herb Cellar',
      'Bram\'s Training Yard',
      'Failed Purification Grove',
      'Ruined Chapel',
      'Last Dawn Keep',
      'Malakar\'s Witness Vault'
    ],
    enemies: [
      'hollowling',
      'corruptedBeast',
      'cultist',
      'gravePriest',
      'wraith',
      'demonHound',
      'infernalBrute'
    ],
    resources: [
      'fieldRations',
      'emberleaf',
      'ironScrap',
      'graveAsh',
      'briarRoot',
      'arcaneDust'
    ],
    craftingMaterials: ['ironOre', 'ironScrap', 'emberleaf', 'graveAsh', 'paleEssence'],
    dungeons: ['dawnspireRoot', 'failedPurificationCellar', 'thornrootHollow'],
    worldBosses: ['hollowElk'],
    routeExits: ['pilgrimRoad'],
    environmentalStory:
      'Demonic corruption and failed Covenant purification are visually similar until the player learns to tell them apart.'
  },

  aureateMarches: {
    id: 'aureateMarches',
    actId: 'act2',
    name: 'The Aureate Marches',
    mapRole: 'act-full-overworld',
    recommendedLevelRange: [18, 42],
    safeSpawn: { x: 10, y: 28, hubId: 'pilgrimRest' },
    sideZones: ['failedPurificationSite', 'confessionVault', 'choirReliquary'],
    infiniteDungeon: {
      id: 'aureateReliquary',
      name: 'The Confession Vaults',
      theme: 'holy'
    },
    environmentalMessages: [
      'The white roads are clean. The confession walls are not.',
      'Every bell promises safety and asks for obedience.'
    ],
    tone: 'Beautiful, safe, holy territory where control is polished until it looks like mercy.',
    visualStyle: {
      palette: ['white stone', 'polished gold', 'wheat field amber', 'blue holy glass', 'cold shadow'],
      terrain: [
        'golden fields',
        'white-stone roads',
        'fortified abbeys',
        'public confession plazas',
        'purification halls',
        'sky-touched ruins'
      ],
      weather: ['clear holy dawn', 'gold haze', 'silent nights', 'unnatural calm after confession bells']
    },
    safeHubs: [
      {
        id: 'saintOrvane',
        name: 'Saint Orvane',
        role: 'Covenant-controlled city hub with strict checkpoints'
      },
      {
        id: 'pilgrimRest',
        name: 'Pilgrim\'s Rest',
        role: 'roadside hub where refugees and pilgrims quietly disagree'
      }
    ],
    majorLocations: [
      'Pilgrim Road Checkpoint',
      'Saint Orvane Confession Plaza',
      'The Gilded Granary',
      'Abbey of Clean Hands',
      'Purification Hall Seven',
      'Sky-Touched Aqueduct',
      'The Shattered Choir'
    ],
    enemies: [
      'covenantPatrol',
      'purifierAcolyte',
      'oathboundKnight',
      'confessorMage',
      'radiantWraith',
      'brokenSeraphEcho'
    ],
    resources: [
      'fieldRations',
      'aureateWheat',
      'sanctifiedIron',
      'confessorWax',
      'skyglass',
      'arcaneDust'
    ],
    craftingMaterials: ['arcaneDust', 'veyrglassShard', 'towerFragment', 'fieldRations'],
    dungeons: ['shatteredChoir', 'purificationHallSeven', 'abbeyCatacombs'],
    worldBosses: ['saintOfHollowMercy'],
    routeEntrances: ['pilgrimRoad'],
    routeExits: ['severedCauseway'],
    environmentalStory:
      'The region looks safer than the frontier, but the cost of that safety is recorded on every confession wall.'
  },

  ascensionWastes: {
    id: 'ascensionWastes',
    actId: 'act3',
    name: 'The Ascension Wastes',
    alternateName: 'The Veiled Expanse',
    mapRole: 'act-full-overworld',
    recommendedLevelRange: [42, 80],
    safeSpawn: { x: 10, y: 28, hubId: 'lastLanternCamp' },
    sideZones: ['lightstormScar', 'namelessVault', 'worldrootRift'],
    infiniteDungeon: {
      id: 'ascensionRift',
      name: 'The Light Beneath Names',
      theme: 'cosmic'
    },
    environmentalMessages: [
      'The lightstorm speaks in voices that no longer remember their names.',
      'The road remains only because reality has not finished erasing it.'
    ],
    tone: 'Holy-cosmic horror where control has become reality-level assimilation.',
    visualStyle: {
      palette: ['pale gold', 'dead white', 'void violet', 'fractured blue', 'black glass'],
      terrain: [
        'floating ruins',
        'fractured roads',
        'pale light storms',
        'Essence scars',
        'warped temples',
        'impossible geometry'
      ],
      weather: ['lightstorms', 'silent snow of ash-white motes', 'gravity glitches', 'memory echoes']
    },
    safeHubs: [
      {
        id: 'lastLanternCamp',
        name: 'Last Lantern Camp',
        role: 'final mortal camp before the Ascension Spire'
      },
      {
        id: 'brokenCausewayHold',
        name: 'Causeway Hold',
        role: 'dangerous foothold held by deserters, refugees, and companion allies'
      }
    ],
    majorLocations: [
      'Severed Causeway',
      'The City Without Names',
      'Dawnspire Relay Field',
      'The Pale Storm Basin',
      'Erased Market',
      'Worldroot Scar',
      'Ascension Spire'
    ],
    enemies: [
      'purifiedCitizen',
      'networkKnight',
      'zephyrEcho',
      'lightboundAngel',
      'essenceHusk',
      'innerCircleGovernor'
    ],
    resources: [
      'fieldRations',
      'towerFragment',
      'veyrglassShard',
      'bossCore',
      'ascensionThread',
      'memoryAsh'
    ],
    craftingMaterials: ['towerFragment', 'veyrglassShard', 'bossCore', 'arcaneDust'],
    dungeons: ['ascensionSpire', 'relayCathedral', 'cityWithoutNamesVault'],
    worldBosses: ['theChoirThatWalks'],
    routeEntrances: ['severedCauseway'],
    environmentalStory:
      'Every object is losing its identity. Houses, signs, statues, and people become clean, bright, and indistinguishable.'
  }
};

export function getRegionData(regionId) {
  return RUNALIS_REGIONS[regionId] || null;
}

export function getRegionsByAct(actId) {
  return Object.values(RUNALIS_REGIONS).filter(region => region.actId === actId);
}

export function getRegionInfiniteDungeon(regionId) {
  return getRegionData(regionId)?.infiniteDungeon || getRegionData('hearthmereFrontier').infiniteDungeon;
}
