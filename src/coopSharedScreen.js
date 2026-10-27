import { TILE } from './data.js';
import { addStatusText } from './floatingText.js';
import { isActorAliveForCoop } from './coopReviveSystem.js';

const SHARED_PARTY_WORLD_MODES = new Set(['dungeon', 'sidezone', 'tower', 'pvparena', 'sharedparty']);
const DEFAULT_TETHER_DISTANCE = TILE * 10.5;
const TETHER_FEEDBACK_SECONDS = 1.15;

export function isSharedPartyCameraWorld(world) {
  if (!world) return false;

  const modes = [world.cameraMode, world.zoneType, world.mode]
    .map(normalizeCameraMode)
    .filter(Boolean);

  if (modes.some(mode => SHARED_PARTY_WORLD_MODES.has(mode))) return true;

  return !!(
    world.dungeonState ||
    world.dungeonClassification ||
    world.bossRoom ||
    world.isDungeon
  );
}

function normalizeCameraMode(value) {
  return String(value || '').replace(/[\s_-]/g, '').toLowerCase();
}

export function getSharedPartyMembers(player) {
  if (!player) return [];

  return [
    player,
    ...((player.coop?.players || []).filter(ally => ally && ally.active !== false))
  ].filter(member => member && member.active !== false).slice(0, 4);
}

export function getLivingSharedPartyMembers(player) {
  const living = getSharedPartyMembers(player).filter(member => isActorAliveForCoop(member));

  return living.length ? living : getSharedPartyMembers(player);
}

export function getSharedPartyCameraFocus(player) {
  const members = getLivingSharedPartyMembers(player);

  if (!members.length) {
    return {
      x: Number(player?.x || 0),
      y: Number(player?.y || 0)
    };
  }

  const bounds = members.reduce((box, member) => {
    const x = Number(member.x || 0);
    const y = Number(member.y || 0);

    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
    return box;
  }, {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity
  });

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };
}

export function applyDungeonPartyTether(game, actor, nextX, nextY) {
  if (!game || !actor || !isSharedPartyCameraWorld(game.world)) {
    return { x: nextX, y: nextY, limited: false };
  }

  if (String(game.world?.mode || '').toLowerCase() === 'pvparena') {
    return { x: nextX, y: nextY, limited: false };
  }

  const living = getLivingSharedPartyMembers(game.player).filter(member => isActorAliveForCoop(member));
  if (living.length <= 1 || !isActorAliveForCoop(actor)) {
    return { x: nextX, y: nextY, limited: false };
  }

  const center = getPartyCenter(living);
  const currentDistance = Math.hypot(Number(actor.x || 0) - center.x, Number(actor.y || 0) - center.y);
  const nextDistance = Math.hypot(Number(nextX || 0) - center.x, Number(nextY || 0) - center.y);
  const maxDistance = getDungeonTetherDistance(game.world);

  if (nextDistance <= maxDistance || nextDistance <= currentDistance + 0.5) {
    return { x: nextX, y: nextY, limited: false };
  }

  const angle = Math.atan2(Number(nextY || 0) - center.y, Number(nextX || 0) - center.x);
  const limited = {
    x: center.x + Math.cos(angle) * maxDistance,
    y: center.y + Math.sin(angle) * maxDistance,
    limited: true
  };

  showTetherFeedback(actor);
  return limited;
}

function getPartyCenter(members) {
  const total = members.reduce((sum, member) => {
    sum.x += Number(member.x || 0);
    sum.y += Number(member.y || 0);
    return sum;
  }, { x: 0, y: 0 });

  return {
    x: total.x / members.length,
    y: total.y / members.length
  };
}

function getDungeonTetherDistance(world) {
  const configured = Number(world?.partyTetherDistance);
  return Number.isFinite(configured) && configured > TILE * 4
    ? configured
    : DEFAULT_TETHER_DISTANCE;
}

function showTetherFeedback(actor) {
  const now = typeof performance !== 'undefined'
    ? performance.now() / 1000
    : Date.now() / 1000;

  if (now < Number(actor.partyTetherFeedbackAt || 0)) return;

  actor.partyTetherFeedbackAt = now + TETHER_FEEDBACK_SECONDS;
  addStatusText(actor, 'Stay with your party', {
    color: '#ffe58a',
    ttl: 0.85,
    size: 12,
    offsetY: -58
  });
}
