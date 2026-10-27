// travelData.js
// Long-distance act travel routes, costs, and state helpers.

export const TRAVEL_RESOURCE_IDS = {
  rations: 'fieldRations',
  gold: 'gold'
};

export const TRAVEL_ROUTES = {
  pilgrimRoad: {
    id: 'pilgrimRoad',
    name: 'The Pilgrim Road',
    fromRegionId: 'hearthmereFrontier',
    toRegionId: 'aureateMarches',
    type: 'mountain-road-and-covenant-checkpoint',
    description:
      'An old trade road rebuilt as a Covenant pilgrimage route. It is safer than the wild passes, but every gate records names, supplies, and sins.',
    physicalSegments: [
      {
        id: 'hearthmereCaravanMuster',
        name: 'Orrakai North Gate Muster',
        gameplay: 'Buy supplies in Orrakai, choose whether refugees travel with you, and confirm companion readiness at the north gate.'
      },
      {
        id: 'blackPinePass',
        name: 'Black Pine Pass',
        gameplay: 'Short combat route with beasts, ration checks, and a night camp dialogue scene.'
      },
      {
        id: 'saintOrvaneCheckpoint',
        name: 'Saint Orvane Checkpoint',
        gameplay: 'Covenant inspection, route permit check, class-specific dialogue, and possible bribe.'
      }
    ],
    requirements: {
      questCompleted: ['act1HearthmereAshes'],
      flags: ['story.act1Complete'],
      items: [['fieldRations', 320]],
      gold: 750,
      routeItems: ['pilgrimRoadPermit'],
      companionReadiness: ['mara', 'bram']
    },
    optionalModifiers: [
      {
        id: 'travelWithRefugees',
        label: 'Travel with refugees',
        extraRations: 80,
        relationshipGain: { mara: 2, bram: 2, elian: 1 },
        risk: 'More ambushes, but stronger moral payoff.'
      },
      {
        id: 'smugglerGuide',
        label: 'Hire a smuggler guide',
        extraGold: 300,
        bypasses: ['saintOrvaneCheckpointPermit'],
        risk: 'Dusk approves, Elian disapproves unless she has defected.'
      }
    ],
    unlocks: ['regions.aureateMarches.unlocked', 'story.act2Started']
  },

  severedCauseway: {
    id: 'severedCauseway',
    name: 'The Severed Causeway',
    fromRegionId: 'aureateMarches',
    toRegionId: 'ascensionWastes',
    type: 'broken-holy-road-through-lightstorm',
    description:
      'A shattered road leading into the Ascension-corrupted region. The stones still sing Covenant hymns, but the words have lost their meaning.',
    physicalSegments: [
      {
        id: 'aureateExpeditionCamp',
        name: 'Aureate Expedition Camp',
        gameplay: 'Craft wards, repair wagons, and settle companion doubts before leaving ordered territory.'
      },
      {
        id: 'choirBridgeRuins',
        name: 'Choir Bridge Ruins',
        gameplay: 'Platform-like route beats, lightstorm hazard checks, and purified enemy patrols.'
      },
      {
        id: 'lastLanternCrossing',
        name: 'Last Lantern Crossing',
        gameplay: 'Final Act 3 transition scene where Zephyr offers relief to each companion.'
      }
    ],
    requirements: {
      questCompleted: ['act2AureateReckoning'],
      flags: ['story.act2Complete'],
      items: [
        ['fieldRations', 520],
        ['lightstormWard', 3]
      ],
      gold: 1800,
      routeItems: ['severedCausewayChart'],
      companionReadiness: ['mara', 'bram', 'dusk', 'elian']
    },
    optionalModifiers: [
      {
        id: 'carryTheErased',
        label: 'Carry Essence memorials for erased families',
        extraRations: 120,
        relationshipGain: { dusk: 2, elian: 2 },
        risk: 'Zephyr whispers more often during travel.'
      },
      {
        id: 'militaryEscort',
        label: 'Pay deserter escort',
        extraGold: 650,
        reward: 'Extra route combat allies during the crossing.'
      }
    ],
    unlocks: ['regions.ascensionWastes.unlocked', 'story.act3Started']
  }
};

export function getTravelRoute(routeId) {
  return TRAVEL_ROUTES[routeId] || null;
}

export function getRouteRequirementStatus(player, routeId) {
  const route = getTravelRoute(routeId);
  if (!route || !player) {
    return { ok: false, missing: ['route or player missing'] };
  }

  const missing = [];
  const requirements = route.requirements || {};

  for (const flag of requirements.flags || []) {
    if (!readNestedFlag(player, flag)) missing.push(`flag:${flag}`);
  }

  for (const questId of requirements.questCompleted || []) {
    if (!player.questState?.completed?.[questId] && !player.quests?.completed?.[questId]) {
      missing.push(`quest:${questId}`);
    }
  }

  for (const [itemId, qty] of requirements.items || []) {
    if (countInventoryItem(player, itemId) < qty) missing.push(`item:${itemId}x${qty}`);
  }

  for (const itemId of requirements.routeItems || []) {
    if (countInventoryItem(player, itemId) <= 0 && !readNestedFlag(player, `items.${itemId}`)) {
      missing.push(`routeItem:${itemId}`);
    }
  }

  if ((player.gold || 0) < (requirements.gold || 0)) {
    missing.push(`gold:${requirements.gold}`);
  }

  return {
    ok: missing.length === 0,
    missing,
    route
  };
}

function countInventoryItem(player, itemId) {
  return (player.inventory || []).reduce((total, entry) => {
    return total + (entry?.id === itemId ? Number(entry.qty || 1) : 0);
  }, 0);
}

function readNestedFlag(player, path) {
  const roots = [player.storyFlags, player.story?.flags, player.flags, player];

  for (const root of roots) {
    const value = readPath(root, path);
    if (value) return value;

    if (String(path).startsWith('story.')) {
      const storyValue = readPath(root, String(path).slice('story.'.length));
      if (storyValue) return storyValue;
    }
  }

  return false;
}

function readPath(root, path) {
  if (!root || !path) return false;

  return String(path)
    .split('.')
    .reduce((current, key) => current && current[key], root);
}
