// travelSystem.js
// Continuous roads and optional, story-gated escorted expeditions.

import {
  countItem,
  removeItem,
  migratePlayer
} from './player.js';

import {
  addQuestText,
  addStatusText
} from './floatingText.js';

import {
  getTravelRoute,
  getRouteRequirementStatus
} from './travelData.js';

import {
  createRegionWorld,
  createTravelRouteWorld
} from './regionWorlds.js';
import { getRegionData } from './regionData.js';

import {
  ensureStoryProgress,
  setCurrentRegion,
  setRegionUnlocked,
  setRouteState,
  setStoryFlag,
  getStoryFlag
} from './storyProgress.js';

import {
  markTravelStoryProgress
} from './storyRuntime.js';

import {
  getQuestOwner
} from './dialogueSystem.js';

import {
  applyCoopEnemyCountScalingToWorld
} from './coopEnemyScaling.js';

export function startTravelRoute(game, routeId, options = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const player = getQuestOwner(actor) || hostGame?.player;
  const route = getTravelRoute(routeId);

  if (!hostGame || !player || !route) return false;

  // Gates are signposts on the shared continent. Expedition preparation is an
  // explicit service, never a prerequisite or an automatic toll for walking.
  if (!options.storyExpedition && (hostGame.world?.continentId || hostGame.world?.mode === 'capital')) {
    return describeContinuousRoute(hostGame, actor || player, route);
  }

  migratePlayer(player);
  ensureStoryProgress(player);

  const currentRegionId = hostGame.world?.continentId
    ? hostGame.world.regionId : player.regions?.currentRegionId || 'hearthmereFrontier';
  if (currentRegionId !== route.fromRegionId) {
    const originName = getRegionData(route.fromRegionId)?.name || route.fromRegionId;
    hostGame.log?.(`${route.name} begins in ${originName}. Return there before preparing this expedition.`);
    addStatusText(actor || player, 'Wrong Region for Route', { color: '#9facbf' });
    return true;
  }

  if (player.travel.activeRoute?.id === routeId) {
    hostGame.log?.(`${route.name}: your escorted expedition is already prepared. Follow the road toward ${getRegionData(route.toRegionId)?.name || route.toRegionId}.`);
    return true;
  }

  const status = getRouteRequirementStatus(player, routeId);

  if (!status.ok) {
    const readable = describeMissingRequirements(player, status.missing);
    const storyLocked = status.missing.some(entry => {
      return String(entry).startsWith('flag:') || String(entry).startsWith('quest:');
    });
    const prefix = storyLocked
      ? `${route.name}: the escorted expedition needs further story progress.`
      : `${route.name}: the escorted expedition needs supplies.`;

    hostGame.log?.(`${prefix} ${readable}`);
    addStatusText(actor || player, 'Expedition Not Ready', { color: '#ffcc66' });
    return true;
  }

  consumeRouteCosts(player, route);

  player.travel.activeRoute = {
    id: routeId,
    fromRegionId: route.fromRegionId,
    toRegionId: route.toRegionId,
    startedAt: Date.now()
  };

  setRouteState(player, routeId, {
    unlocked: true,
    prepared: true,
    startedAt: Date.now()
  });

  if (hostGame.world?.continentId) {
    hostGame.log?.(`Escorted expedition prepared: ${route.name}. Follow the road to ${getRegionData(route.toRegionId)?.name || route.toRegionId}.`);
    addQuestText(actor || player, 'Expedition Prepared', { color: '#ffcc66', ttl: 1.4 });
    hostGame.save?.();
    return true;
  }

  const world = createTravelRouteWorld(routeId);
  applyCoopEnemyCountScalingToWorld(world, hostGame.player, {
    context: 'travelRoute',
    maxTotalEnemies: 14,
    minPlayerDistance: 150
  });
  world.effects = Array.isArray(world.effects) ? world.effects : [];
  world.effects.push({
    kind: 'enemyPulse',
    layer: 'front',
    x: world.spawn?.x || 0,
    y: world.spawn?.y || 0,
    color: '#d9ad4f',
    radius: 72,
    ttl: 0.75,
    age: 0
  });
  hostGame.world = world;
  placePlayerAtSpawn(hostGame, world);
  placePartyNearHost(hostGame);

  hostGame.overworldState = null;
  hostGame.log?.(`Expedition started: ${route.name}. Cross the route and reach the far gate.`);
  addQuestText(player, route.name, { color: '#ffcc66', ttl: 1.4, size: 16 });

  return true;
}

export function startStoryExpedition(game, routeId) {
  return startTravelRoute(game, routeId, { storyExpedition: true });
}

export function completeTravelRoute(game, routeId) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const player = getQuestOwner(actor) || hostGame?.player;
  const route = getTravelRoute(routeId);

  if (!hostGame || !player || !route) return false;

  if (hostGame.world?.continentId) {
    updateContinentalTravelArrival(hostGame);
    return describeContinuousRoute(hostGame, actor || player, route);
  }

  migratePlayer(player);
  ensureStoryProgress(player);

  const destinationId = route.toRegionId;
  const region = getRegionData(destinationId);
  const world = createRegionWorld(destinationId);
  applyCoopEnemyCountScalingToWorld(world, hostGame.player, {
    context: 'region',
    maxTotalEnemies: 14,
    minPlayerDistance: 160
  });

  hostGame.world = world;
  placePlayerAtSpawn(hostGame, world);
  placePartyNearHost(hostGame);

  setCurrentRegion(player, destinationId);
  setRouteState(player, routeId, {
    completed: true,
    completedAt: Date.now()
  });

  player.travel.activeRoute = null;
  player.currentZone = world.name;
  player.lastSafeLocation = {
    worldMode: 'overworld',
    worldName: world.name,
    regionId: destinationId,
    x: world.spawn.x,
    y: world.spawn.y,
    recordedAt: Date.now(),
    reason: 'regionArrival'
  };

  if (destinationId === 'aureateMarches') {
    player.story.act = 'act2';
    setStoryFlag(player, 'act2Started', true);
  } else if (destinationId === 'ascensionWastes') {
    player.story.act = 'act3';
    setStoryFlag(player, 'act3Started', true);
  }

  markTravelStoryProgress(player, routeId, destinationId, hostGame.log);

  hostGame.log?.(`Arrived in ${world.name}. A new full region is now unlocked.`);
  if (region?.environmentalMessages?.[0]) hostGame.log?.(region.environmentalMessages[0]);
  addQuestText(player, world.name, { color: '#73d18a', ttl: 1.5, size: 16 });

  return true;
}

export function returnAlongRoute(game, routeId) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const player = getQuestOwner(actor) || hostGame?.player;
  const route = getTravelRoute(routeId);

  if (!hostGame || !player || !route) return false;

  if (hostGame.world?.continentId || hostGame.world?.mode === 'capital') {
    return describeContinuousRoute(hostGame, actor || player, route, true);
  }

  migratePlayer(player);
  ensureStoryProgress(player);

  const world = createRegionWorld(route.fromRegionId);
  applyCoopEnemyCountScalingToWorld(world, hostGame.player, {
    context: 'region',
    maxTotalEnemies: 14,
    minPlayerDistance: 160
  });
  hostGame.world = world;
  placePlayerAtSpawn(hostGame, world);
  placePartyNearHost(hostGame);

  setCurrentRegion(player, route.fromRegionId);
  player.travel.activeRoute = null;
  player.currentZone = world.name;
  player.lastSafeLocation = {
    worldMode: 'overworld',
    worldName: world.name,
    regionId: route.fromRegionId,
    x: world.spawn.x,
    y: world.spawn.y,
    recordedAt: Date.now(),
    reason: 'routeReturn'
  };

  hostGame.log?.(`Returned to ${world.name}.`);
  addQuestText(player, world.name, { color: '#9facbf', ttl: 1.25 });

  return true;
}

// Called after streaming assigns the party's physical region. A visit can
// complete the story journey only once its preceding act is actually complete.
export function updateContinentalTravelArrival(game) {
  const hostGame = getWorldTransitionGame(game);
  const world = hostGame?.world;
  const player = getQuestOwner(hostGame?.player) || hostGame?.player;
  if (!world?.continentId || !player) return false;
  ensureStoryProgress(player);
  const arrivals = [
    ['pilgrimRoad', 'aureateMarches', 'act1HearthmereAshes', 'act1Complete', 'act2Started'],
    ['severedCauseway', 'ascensionWastes', 'act2AureateReckoning', 'act2Complete', 'act3Started']
  ];
  for (const [routeId, destinationId, questId, completedFlag, startedFlag] of arrivals) {
    if (world.regionId !== destinationId || getStoryFlag(player, startedFlag)) continue;
    const completed = player.questState?.completed?.[questId] || player.quests?.completed?.[questId];
    if (!completed || !getStoryFlag(player, completedFlag)) continue;
    setRouteState(player, routeId, { completed: true, completedAt: Date.now(), arrivedOnFoot: true });
    if (player.travel.activeRoute?.id === routeId) player.travel.activeRoute = null;
    setCurrentRegion(player, destinationId);
    markTravelStoryProgress(player, routeId, destinationId, hostGame.log);
    hostGame.save?.();
    return true;
  }
  return false;
}

function describeContinuousRoute(game, actor, route, reverse = false) {
  const destinationId = reverse ? route.fromRegionId : route.toRegionId;
  const destination = getRegionData(destinationId)?.name || destinationId;
  const directions = route.id === 'pilgrimRoad'
    ? 'Follow the eastern pilgrim road through Black Pine Pass'
    : 'Follow the broken causeway or the lower maintenance trail east';
  const capitalExit = game.world?.mode === 'capital' ? ' Leave Orrakai through the South Town Gate to reach the open roads.' : '';
  game.log?.(`${route.name}: ${reverse ? 'Follow the road west' : directions} toward ${destination}. You can walk this road at any level without a permit or travel fee.${capitalExit}`);
  addStatusText(actor, `Road to ${destination}`, { color: '#9facbf', ttl: 1.5 });
  return true;
}

export function unlockRouteDestination(player, routeId) {
  const route = getTravelRoute(routeId);
  if (!player || !route) return false;

  ensureStoryProgress(player);
  setRegionUnlocked(player, route.toRegionId, true);
  setRouteState(player, routeId, { unlocked: true });
  return true;
}

function consumeRouteCosts(player, route) {
  const requirements = route.requirements || {};

  for (const [itemId, qty] of requirements.items || []) {
    removeItem(player, itemId, qty);
  }

  player.gold = Math.max(0, Number(player.gold || 0) - Number(requirements.gold || 0));
}

function placePlayerAtSpawn(game, world) {
  const player = game.player;
  const spawn = world?.spawn || { x: 12 * 32, y: 28 * 32 };

  player.x = spawn.x;
  player.y = spawn.y;
  player.currentPosition = { x: player.x, y: player.y };
  player.currentZone = world?.name || player.currentZone || 'Runalis';

  if (game.camera && game.canvas) {
    game.camera.x = player.x - game.canvas.width / 2;
    game.camera.y = player.y - game.canvas.height / 2;
  }
}

function getWorldTransitionGame(game) {
  return game?.hostGame || game;
}

function placePartyNearHost(game) {
  const host = game?.player;
  if (!host) return;

  const allies = Array.isArray(host.coop?.players)
    ? host.coop.players.filter(ally => ally && ally.active !== false)
    : [];
  const offsets = [
    { x: -32, y: 0 },
    { x: 32, y: 0 },
    { x: 0, y: 32 }
  ];

  for (let i = 0; i < allies.length; i++) {
    const ally = allies[i];
    const offset = offsets[i] || { x: (i - 1) * 32, y: 32 };

    ally.x = host.x + offset.x;
    ally.y = host.y + offset.y;
    ally.dirX = host.dirX;
    ally.dirY = host.dirY;
    ally.currentZone = host.currentZone;
  }
}

function describeMissingRequirements(player, missing = []) {
  if (!missing.length) return 'Requirements are incomplete.';

  const labels = missing.map(entry => {
    const [type, value] = String(entry).split(':');

    if (type === 'gold') {
      const needed = Number(value || 0);
      const have = Number(player.gold || 0);
      return `${Math.max(0, needed - have)} more gold`;
    }

    if (type === 'item') {
      const match = String(value || '').match(/^(.+)x(\d+)$/);
      const itemId = match?.[1] || value;
      const qty = Number(match?.[2] || 1);
      const have = countItem(player, itemId);
      return `${Math.max(0, qty - have)} more ${readableItemName(itemId)}`;
    }

    if (type === 'routeItem') return `${readableItemName(value)} required`;
    if (type === 'quest') return `complete ${readableQuestName(value)}`;
    if (type === 'flag') return 'advance the main story';

    return entry;
  });

  return labels.join(', ') + '.';
}

function readableItemName(id) {
  return String(id || 'item')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase());
}

function readableQuestName(id) {
  if (id === 'act1HearthmereAshes') return 'Act 1: The Stolen Dawn';
  if (id === 'act2AureateReckoning') return 'Act 2: Aureate Reckoning';
  return readableItemName(id);
}
