import { TILE } from './data.js';

export const COOP_ENEMY_SCALING_VERSION = 'coop-enemy-scaling-v1';
export const COOP_AGGRO_RANGE_MULTIPLIER = 2;

const ENEMY_COUNT_MULTIPLIERS = {
  1: 1,
  2: 1.35,
  3: 1.65,
  4: 2
};

const BOSS_HEALTH_MULTIPLIERS = {
  1: 1,
  2: 1.35,
  3: 1.7,
  4: 2.1
};

const IMPASSABLE_BIOMES = new Set(['wall', 'water', 'void']);

export function getCoopEnemyScalingPlayerCount(hostPlayer) {
  if (!hostPlayer) return 1;

  const party = [
    hostPlayer,
    ...(Array.isArray(hostPlayer.coop?.players) ? hostPlayer.coop.players : [])
  ];

  const count = party.filter(member => {
    if (!member || member.active === false) return false;
    if (member.lifeState === 'dead' || member.lifeState === 'respawning') return false;
    return true;
  }).length;

  return clampPlayerCount(count);
}

export function getCoopEnemyCountMultiplier(playerCount = 1) {
  return ENEMY_COUNT_MULTIPLIERS[clampPlayerCount(playerCount)] || 1;
}

export function getCoopBossHealthMultiplier(playerCount = 1) {
  return BOSS_HEALTH_MULTIPLIERS[clampPlayerCount(playerCount)] || 1;
}

export function getScaledEnemyCount(baseCount, playerCount = 1, options = {}) {
  const base = Math.max(0, Math.floor(Number(baseCount || 0)));
  if (base <= 0) return 0;

  const multiplier = getCoopEnemyCountMultiplier(playerCount);
  const scaled = Math.max(base, Math.round(base * multiplier));
  const cap = Number.isFinite(Number(options.cap))
    ? Math.max(base, Math.floor(Number(options.cap)))
    : scaled;
  const min = Number.isFinite(Number(options.min))
    ? Math.max(0, Math.floor(Number(options.min)))
    : base;

  return Math.max(min, Math.min(cap, scaled));
}

export function getScaledBossAddCount(baseCount, playerCount = 1, cap = 8) {
  return getScaledEnemyCount(baseCount, playerCount, {
    min: baseCount,
    cap
  });
}

export function applyCoopAggroRange(enemy, fallbackRange = 230) {
  if (!enemy) return enemy;

  if (enemy.runalisCoopAggroVersion === COOP_ENEMY_SCALING_VERSION) {
    return enemy;
  }

  const baseRange = Math.max(
    1,
    Number(enemy.baseAggroRange || enemy.originalAggroRange || enemy.aggroRange || fallbackRange || 230)
  );

  enemy.originalAggroRange = enemy.originalAggroRange || baseRange;
  enemy.baseAggroRange = enemy.baseAggroRange || baseRange;
  enemy.aggroRange = Math.ceil(baseRange * COOP_AGGRO_RANGE_MULTIPLIER);
  enemy.runalisCoopAggroVersion = COOP_ENEMY_SCALING_VERSION;

  return enemy;
}

export function getCoopAggroRange(enemy, fallbackRange = 230) {
  applyCoopAggroRange(enemy, fallbackRange);
  return Math.max(1, Number(enemy?.aggroRange || fallbackRange || 230));
}

export function applyCoopBossHealthScaling(enemy, playerCount = 1) {
  if (!enemy || !isBossEnemy(enemy)) return enemy;
  if (enemy.runalisCoopBossScalingVersion === COOP_ENEMY_SCALING_VERSION) return enemy;

  const multiplier = getCoopBossHealthMultiplier(playerCount);
  if (multiplier <= 1) {
    enemy.runalisCoopBossScalingVersion = COOP_ENEMY_SCALING_VERSION;
    enemy.runalisCoopBossPlayerCount = clampPlayerCount(playerCount);
    return enemy;
  }

  const previousMax = Math.max(1, Number(enemy.maxHp || enemy.hp || 1));
  const currentHp = Math.max(0, Number(enemy.hp ?? previousMax));
  const ratio = Math.max(0, Math.min(1, currentHp / previousMax));
  const scaledMax = Math.max(1, Math.ceil(previousMax * multiplier));

  enemy.maxHp = scaledMax;
  enemy.hp = currentHp <= 0 ? 0 : Math.max(1, Math.ceil(scaledMax * ratio));
  enemy.runalisCoopBossScalingVersion = COOP_ENEMY_SCALING_VERSION;
  enemy.runalisCoopBossPlayerCount = clampPlayerCount(playerCount);
  enemy.runalisCoopBossHealthMultiplier = multiplier;

  return enemy;
}

export function isEnemyTargetablePlayer(actor) {
  if (!actor || actor.active === false) return false;
  if ((actor.hp || 0) <= 0) return false;
  if (actor.lifeState === 'downed' || actor.lifeState === 'beingRevived') return false;
  if (actor.lifeState === 'dead' || actor.lifeState === 'respawning') return false;
  return true;
}

const simulatedActors=new WeakMap();
export function setSimulatedCombatActors(hostPlayer,actors){if(hostPlayer)simulatedActors.set(hostPlayer,actors||[]);}
export function getEnemyTargetablePlayers(hostPlayer) {
  if (!hostPlayer) return [];

  return [
    hostPlayer,
    ...(Array.isArray(hostPlayer.coop?.players) ? hostPlayer.coop.players : []),
    ...(simulatedActors.get(hostPlayer)||[])
  ].filter(isEnemyTargetablePlayer);
}

export function getEnemyTargetId(target) {
  if (!target) return null;
  return String(target.id || target.profileId || target.sessionSlot || target.slot || target.playerNumber || target.name || '');
}

export function getEnemyTargetThreatMultiplier(enemy, target, kind = 'player', baseMultiplier = 1) {
  let multiplier = Math.max(0.1, Number(baseMultiplier || 1));
  const targetId = getEnemyTargetId(target);
  const contributionTargetId = getCombatContributionTargetId(target);
  const recentDamagerId = String(enemy?.lastDamagedByActorId || '');
  const lastDamagedAt = Number(enemy?.lastDamagedByActorAt || 0);
  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now() / 1000
    : Date.now() / 1000;

  if (target?.reviveAction?.active) {
    multiplier *= 0.82;
  }

  if (
    recentDamagerId &&
    now - lastDamagedAt <= 4.5 &&
    (targetId === recentDamagerId || contributionTargetId === recentDamagerId)
  ) {
    multiplier *= 0.62;
  }

  if (targetId && String(enemy?.combatTargetId || '') === targetId) {
    multiplier *= 0.86;
  }

  if (kind === 'summon') {
    multiplier *= 0.96;
  }

  return multiplier;
}

function getCombatContributionTargetId(actor) {
  if (!actor) return '';
  if (actor.profileId) return `profile:${actor.profileId}`;
  if ((actor.slot || actor.playerNumber) && Number(actor.slot || actor.playerNumber) > 1) {
    return `slot:${actor.slot || actor.playerNumber}`;
  }
  if (actor.profileSlot) return `profile-slot:${actor.profileSlot}`;
  return 'player:1';
}

export function applyCoopEnemyCountScalingToWorld(world, hostPlayer, options = {}) {
  if (!world || !Array.isArray(world.enemies) || !world.enemies.length) {
    return {
      playerCount: getCoopEnemyScalingPlayerCount(hostPlayer),
      multiplier: 1,
      added: 0
    };
  }

  const playerCount = getCoopEnemyScalingPlayerCount(hostPlayer);
  const multiplier = getCoopEnemyCountMultiplier(playerCount);

  for (const enemy of world.enemies) {
    applyCoopAggroRange(enemy);
    applyCoopBossHealthScaling(enemy, playerCount);
  }

  if (playerCount <= 1 || world.coopEnemyCountScalingVersion === COOP_ENEMY_SCALING_VERSION) {
    return { playerCount, multiplier, added: 0 };
  }

  if (world.safeZone || ['capital', 'hub', 'town'].includes(world.mode)) {
    world.coopEnemyCountScalingVersion = COOP_ENEMY_SCALING_VERSION;
    return { playerCount, multiplier, added: 0 };
  }

  const candidates = world.enemies.filter(enemy => {
    if (!enemy || enemy.dead || enemy.remove || (enemy.hp || 0) <= 0) return false;
    if (enemy.coopScaledClone || enemy.summonedBy || enemy.summonedByBoss) return false;
    if (isBossEnemy(enemy) || enemy.miniBoss || enemy.bossType || enemy.bossId) return false;
    return true;
  });

  if (!candidates.length) {
    world.coopEnemyCountScalingVersion = COOP_ENEMY_SCALING_VERSION;
    return { playerCount, multiplier, added: 0 };
  }

  const baseCount = candidates.length;
  const context = options.context || world.mode || 'world';
  const maxTotal = Math.max(baseCount, Math.floor(Number(options.maxTotalEnemies || getDefaultWorldEnemyCap(world, context))));
  const desiredTotal = Math.min(maxTotal, getScaledEnemyCount(baseCount, playerCount, { cap: maxTotal }));
  const existingScaled = world.enemies.filter(enemy => enemy && !enemy.dead && !enemy.remove && enemy.coopScaledClone).length;
  const additions = Math.max(0, desiredTotal - baseCount - existingScaled);
  let added = 0;

  for (let i = 0; i < additions; i++) {
    const source = candidates[i % candidates.length];
    const point = findScaledEnemySpawnPoint(world, source, hostPlayer, i, options);
    if (!point) continue;

    const clone = cloneScaledEnemy(source, point, i, playerCount, context);
    world.enemies.push(clone);
    added++;
  }

  world.coopEnemyCountScalingVersion = COOP_ENEMY_SCALING_VERSION;
  world.coopEnemyScaling = {
    version: COOP_ENEMY_SCALING_VERSION,
    playerCount,
    multiplier,
    added,
    context
  };

  return { playerCount, multiplier, added };
}

function cloneScaledEnemy(source, point, index, playerCount, context) {
  const clone = structuredCloneSafe(source);
  const sourceId = source.id || `${source.kind || 'enemy'}-${Math.round(source.x || 0)}-${Math.round(source.y || 0)}`;

  clone.id = `${sourceId}-coop-${playerCount}-${index}`;
  clone.x = point.x;
  clone.y = point.y;
  clone.homeX = point.x;
  clone.homeY = point.y;
  clone.hp = Math.max(1, Number(clone.maxHp || clone.hp || 1));
  clone.dead = false;
  clone.remove = false;
  clone.attackCooldown = 0;
  clone.attackCd = 0;
  clone.hitFlash = 0;
  clone.awakened = false;
  clone.aggro = 0;
  clone.alerted = false;
  clone.telegraph = null;
  clone.combatTargetId = null;
  clone.combatTargetKind = null;
  clone.coopScaledClone = true;
  clone.coopScaledFromId = sourceId;
  clone.coopScaledContext = context;
  clone.coopScaledPlayerCount = playerCount;

  applyCoopAggroRange(clone);

  return clone;
}

function findScaledEnemySpawnPoint(world, source, hostPlayer, index, options = {}) {
  const minPlayerDistance = Math.max(48, Number(options.minPlayerDistance || 118));
  const minEnemyDistance = Math.max(18, Number(options.minEnemyDistance || 28));
  const playerPositions = getPartyPositions(hostPlayer);
  const spawn = world.spawn || null;

  for (let attempt = 0; attempt < 16; attempt++) {
    const angle = ((index * 1.618 + attempt * 0.37) % 1) * Math.PI * 2;
    const radius = 42 + (attempt % 4) * 18 + Math.floor(index / 4) * 10;
    const x = Number(source.x || 0) + Math.cos(angle) * radius;
    const y = Number(source.y || 0) + Math.sin(angle) * radius;

    if (!isWorldPointSpawnable(world, x, y)) continue;
    if (spawn && Math.hypot(x - spawn.x, y - spawn.y) < minPlayerDistance) continue;
    if (playerPositions.some(point => Math.hypot(x - point.x, y - point.y) < minPlayerDistance)) continue;
    if ((world.enemies || []).some(enemy => {
      if (!enemy || enemy === source || enemy.dead || enemy.remove) return false;
      return Math.hypot(x - Number(enemy.x || 0), y - Number(enemy.y || 0)) < minEnemyDistance;
    })) continue;

    return { x, y };
  }

  return null;
}

function isWorldPointSpawnable(world, x, y) {
  if (!world || !Number.isFinite(x) || !Number.isFinite(y)) return false;

  const tileSize = world.tileSize || TILE;
  const tx = Math.floor(x / tileSize);
  const ty = Math.floor(y / tileSize);
  const tile = world.tiles?.[ty]?.[tx];

  if (!tile || IMPASSABLE_BIOMES.has(String(tile.biome || '').toLowerCase())) return false;

  return !(world.objects || []).some(object => {
    if (!object || object.blocksMovement === false || object.passable === true) return false;
    const radius = Math.max(12, Number(object.r || object.radius || 14) + 18);
    return Math.hypot(x - Number(object.x || 0), y - Number(object.y || 0)) < radius;
  });
}

function getPartyPositions(hostPlayer) {
  if (!hostPlayer) return [];

  return [
    hostPlayer,
    ...(Array.isArray(hostPlayer.coop?.players) ? hostPlayer.coop.players : [])
  ]
    .filter(member => member && member.active !== false)
    .map(member => ({ x: Number(member.x || 0), y: Number(member.y || 0) }));
}

function getDefaultWorldEnemyCap(world, context) {
  if (context === 'travelRoute') return 14;
  if (context === 'region') return 14;
  if (context === 'ambush') return 8;
  if (world?.mode === 'tower') return 16;
  if (world?.mode === 'sideZone') return 44;
  if (world?.mode === 'dungeon') return 72;
  return 160;
}

function isBossEnemy(enemy) {
  return !!(enemy?.isBoss || enemy?.worldBoss || enemy?.miniBoss || enemy?.boss || enemy?.bossName && !enemy?.coopScaledClone);
}

function clampPlayerCount(value) {
  return Math.max(1, Math.min(4, Math.floor(Number(value || 1))));
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}
