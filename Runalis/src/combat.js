// combat.js
// Runalis combat coordinator.
// Keeps old imports stable while delegating:
// - stamina movement/defense to combatActions.js
// - basic weapon attacks/combos/hitboxes/projectiles to combatMoves.js
//
// Updated:
// - Enemy AI now attacks the actual summon object instead of a copied object.
// - Enemies choose the closest valid target: player, skeleton, lich, thornbeast, etc.
// - Summons can now be damaged, killed, and removed properly.
// - Q class skills keep stronger resource identity.
// - Grave Spark / Necrotic Bolt is an actual projectile fired toward the mouse.
// - Vine Whip is a directional mid-range AoE aimed with the mouse.
// - Necrotic Bolt and Vine Whip cost Spirit and have shorter cooldowns.
// - Ability projectiles remain bridged into render.js through getCombatProjectiles().

import { ITEMS, ABILITIES, getAbilityById, rollEnemyLoot } from './data.js';

import {
  addItem,
  gainXp,
  getPower,
  getArmour,
  migratePlayer
} from './player.js';

import { addFloatingText } from './floatingText.js';

import {
  ensureActionState,
  updateStaminaActions,
  getMovementSpeedMultiplier,
  getDashVelocity,
  isBlocking,
  isDashing,
  applyDefensiveDamage,
  spendStamina
} from './combatActions.js';

import {
  ensureCombatState,
  requestBasicAttack,
  updateWeaponCombat,
  consumeAttackPressed,
  getCurrentAttackVisual,
  getProjectiles,
  getAimDirection
} from './combatMoves.js';

// -----------------------------------------------------------------------------
// Q ABILITY BALANCE OVERRIDES
// -----------------------------------------------------------------------------

const Q_ABILITY_OVERRIDES = {
  graveSpark: {
    aliases: ['graveSpark', 'necroticBolt', 'necrotic bolt', 'grave spark'],
    costType: 'spirit',
    cost: 12,
    cd: 0.4,
    range: 600
  },

  vineWhip: {
    aliases: ['vineWhip', 'vineLash', 'vine lash', 'thorn lash'],
    costType: 'spirit',
    cost: 9,
    cd: 0.4,
    range: 250
  }
};

// -----------------------------------------------------------------------------
// MAIN PUBLIC UPDATE HOOKS
// -----------------------------------------------------------------------------

export function attack(player, world, log, now, input = null) {
  migratePlayer(player);
  ensureActionState(player);
  ensureCombatState(player);

  const safeInput = input || buildFallbackInputFromPlayer(player);

  return requestBasicAttack(player, world, safeInput, log, now);
}

export function updateCombat(player, world, input, dt, now, log) {
  migratePlayer(player);
  ensureActionState(player);
  ensureCombatState(player);
  ensureAbilityProjectileState(player);

  const safeInput = input || buildFallbackInputFromPlayer(player);

  updateStaminaActions(player, safeInput, dt, now, log);

  if (consumeAttackPressed(safeInput)) {
    requestBasicAttack(player, world, safeInput, log, now);
  }

  updateWeaponCombat(player, world, safeInput, dt, now, log);
  updateAbilityProjectiles(player, world, dt, now, log);
}

export function updateEnemies(dt, player, world, log, now = performance.now() / 1000) {
  migratePlayer(player);

  const enemies = world?.enemies || [];

  for (const enemy of enemies) {
    if (!enemy) continue;

    ensureEnemyState(enemy);

    if (enemy.dead || enemy.hp <= 0) {
      handleEnemyDeath(enemy, player, log);
      continue;
    }

    updateEnemyTimers(enemy, dt);
    updateEnemyBehavior(enemy, player, world, dt, now, log);
  }

  world.enemies = enemies.filter(enemy => {
    return enemy && !enemy.remove;
  });
}

// -----------------------------------------------------------------------------
// ABILITIES
// -----------------------------------------------------------------------------

export function useAbility(index, player, world, log, now = performance.now() / 1000, input = null) {
  migratePlayer(player);
  ensureActionState(player);
  ensureCombatState(player);
  ensureAbilityProjectileState(player);

  const abilityId = resolveAbilityId(index, player);
  const ability = abilityId ? getAbilityById(abilityId) : ABILITIES[index];

  if (!ability) {
    log?.('No ability equipped there.');
    return false;
  }

  if (!canUseAbility(player, ability, log, now)) {
    return false;
  }

  if (ability.summonType) {
    return useSummonAbility(player, world, ability, log, now);
  }

  if (ability.damageReduction) {
    return useDefensiveAbility(player, ability, log, now);
  }

  if (ability.id === 'guard') {
    return useDefensiveAbility(player, ability, log, now);
  }

  return useDamageAbility(player, world, ability, log, now, input);
}

function resolveAbilityId(index, player) {
  if (Number.isInteger(index)) {
    return player.loadout?.abilitySlots?.[index] || null;
  }

  return index || null;
}

function canUseAbility(player, ability, log, now) {
  const skillLevel = getSkillLevel(player, ability.skill);

  if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
    log?.('Your spirit has not awakened yet.');
    return false;
  }

  if (ability.unlockLevel && skillLevel < ability.unlockLevel) {
    log?.(`${ability.name} requires ${skillLabel(ability.skill)} level ${ability.unlockLevel}.`);
    return false;
  }

  player.cooldowns = player.cooldowns || {};

  const lastUsed = player.cooldowns[ability.id] || 0;
  const cooldown = getEffectiveAbilityCooldown(ability);

  if (now - lastUsed < cooldown) {
    const remaining = Math.max(0, cooldown - (now - lastUsed));
    log?.(`${ability.name} is cooling down (${remaining.toFixed(1)}s).`);
    return false;
  }

  const cost = getEffectiveAbilityCost(ability);
  const costType = getEffectiveAbilityCostType(ability);

  if (costType === 'spirit') {
    ensureClassSpiritAvailable(player, ability);

    if (!player.spiritAwakened) {
      log?.('Your spirit is dormant.');
      return false;
    }

    if (player.spirit < cost) {
      log?.('Not enough spirit.');
      return false;
    }
  } else if (player.stamina < cost) {
    log?.('Not enough stamina.');
    return false;
  }

  return true;
}

function payAbilityCost(player, ability) {
  const cost = getEffectiveAbilityCost(ability);
  const costType = getEffectiveAbilityCostType(ability);

  if (costType === 'spirit') {
    ensureClassSpiritAvailable(player, ability);
    player.spirit = Math.max(0, player.spirit - cost);
    return true;
  }

  return spendStamina(player, cost, 0.55);
}

function startAbilityCooldown(player, ability, now) {
  player.cooldowns = player.cooldowns || {};
  player.cooldowns[ability.id] = now;
}

function useDamageAbility(player, world, ability, log, now, input = null) {
  if (isNecroticBoltAbility(ability)) {
    return useNecroticBoltProjectile(player, world, ability, log, now, input);
  }

  if (isVineWhipAbility(ability)) {
    return useDirectionalVineWhip(player, world, ability, log, now, input);
  }

  if (!payAbilityCost(player, ability)) {
    log?.('Not enough resources.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const target = findTargetInDirection(player, world, ability.range || 120, input);

  if (!target) {
    log?.(`${ability.name} found no target.`);

    addFloatingText(player, 'Miss', {
      color: '#9facbf'
    });

    return true;
  }

  const damage = calculateAbilityDamage(player, ability);

  damageEnemyDirect(player, world, target, damage, ability.skill || 'blade', log, {
    sourceName: ability.name,
    color: ability.skill === 'spirit' ? '#b68cff' : '#ffcc66',
    xpMultiplier: 0.35
  });

  log?.(`${ability.name} hit ${target.name || 'enemy'} for ${damage}.`);
  return true;
}

// -----------------------------------------------------------------------------
// NECROTIC BOLT
// -----------------------------------------------------------------------------

function useNecroticBoltProjectile(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);

  const damage = calculateAbilityDamage(player, {
    ...ability,
    skill: 'spirit',
    damage: Math.max(ability.damage || 0, 15),
    damageMultiplier: ability.damageMultiplier || 1.2
  });

  const range = getQOverride(ability)?.range || ability.range || 210;

  player.abilityProjectiles.push({
    id: `necrotic-bolt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'necroticBolt',
    sourceAbilityId: ability.id,
    x: player.x + aim.x * 21,
    y: player.y + aim.y * 21 - 8,
    startX: player.x,
    startY: player.y,
    dirX: aim.x,
    dirY: aim.y,
    speed: 330,
    range,
    travelled: 0,
    radius: 7,
    damage,
    skill: 'spirit',
    color: '#b68cff',
    glowColor: 'rgba(182,140,255,0.24)',
    alive: true,
    age: 0,
    ttl: 1.05
  });

  spawnWorldEffect(world, {
    kind: 'necroticCast',
    x: player.x + aim.x * 18,
    y: player.y + aim.y * 18 - 8,
    dirX: aim.x,
    dirY: aim.y,
    ttl: 0.22,
    color: '#b68cff',
    radius: 18
  });

  gainXp(player, 'spirit', 2, log);

  log?.('Necrotic Bolt released.');
  return true;
}

function updateAbilityProjectiles(player, world, dt, now, log) {
  ensureAbilityProjectileState(player);

  for (const projectile of player.abilityProjectiles) {
    if (!projectile || projectile.alive === false) continue;

    projectile.age = (projectile.age || 0) + dt;

    if (projectile.age > projectile.ttl) {
      projectile.alive = false;
      continue;
    }

    const move = (projectile.speed || 260) * dt;

    projectile.x += projectile.dirX * move;
    projectile.y += projectile.dirY * move;
    projectile.travelled = (projectile.travelled || 0) + move;

    if (projectile.travelled >= projectile.range) {
      projectile.alive = false;

      spawnWorldEffect(world, {
        kind: 'necroticFade',
        x: projectile.x,
        y: projectile.y,
        ttl: 0.18,
        color: projectile.color || '#b68cff',
        radius: 13
      });

      continue;
    }

    if (projectile.kind === 'necroticBolt') {
      spawnProjectileTrail(world, projectile);
      updateNecroticBoltCollision(player, world, projectile, log);
    }
  }

  player.abilityProjectiles = player.abilityProjectiles.filter(p => p && p.alive !== false);
}

function updateNecroticBoltCollision(player, world, projectile, log) {
  const target = findProjectileCollision(projectile, world);

  if (!target) return;

  projectile.alive = false;

  const damage = Math.max(1, Math.floor(projectile.damage || 1));

  damageEnemyDirect(player, world, target, damage, 'spirit', log, {
    sourceName: 'Necrotic Bolt',
    color: '#b68cff',
    xpMultiplier: 0.42
  });

  const heal = Math.max(2, Math.ceil(damage * 0.16));
  player.hp = Math.min(player.maxHp, player.hp + heal);

  addFloatingText(player, `+${heal}`, {
    color: '#b68cff',
    ttl: 0.65,
    size: 12
  });

  spawnWorldEffect(world, {
    kind: 'necroticImpact',
    x: target.x,
    y: target.y - 8,
    ttl: 0.28,
    color: '#b68cff',
    radius: 24
  });

  log?.(`Necrotic Bolt hit ${target.name || 'enemy'} for ${damage}.`);
}

function findProjectileCollision(projectile, world) {
  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const radius = (enemy.radius || enemy.r || 14) + (projectile.radius || 6);
    const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);

    if (distance <= radius) {
      return enemy;
    }
  }

  return null;
}

function spawnProjectileTrail(world, projectile) {
  if (!world) return;

  world.effects = world.effects || [];

  world.effects.push({
    kind: 'necroticTrail',
    x: projectile.x - projectile.dirX * 6,
    y: projectile.y - projectile.dirY * 6,
    ttl: 0.16,
    age: 0,
    color: projectile.color || '#b68cff',
    radius: 8
  });

  if (world.effects.length > 160) {
    world.effects.splice(0, world.effects.length - 160);
  }
}

// -----------------------------------------------------------------------------
// VINE WHIP
// -----------------------------------------------------------------------------

function useDirectionalVineWhip(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const range = getQOverride(ability)?.range || ability.range || 135;
  const width = 42;
  const maxHits = ability.maxHits || 4;

  const targets = findVineWhipTargets(player, world, aim, range, width, maxHits);

  spawnVineWhipEffects(player, world, aim, range, width, targets);

  if (!targets.length) {
    addFloatingText(player, 'Whiff', {
      color: '#9facbf',
      ttl: 0.55,
      size: 11
    });

    gainXp(player, 'warding', 1, log);
    log?.('Vine Whip tears through empty air.');
    return true;
  }

  let hits = 0;

  for (const targetInfo of targets) {
    const target = targetInfo.enemy;
    const crit = hits === 0 && Math.random() < 0.12;

    const baseAbility = {
      ...ability,
      skill: 'warding',
      damage: Math.max(ability.damage || 0, 8),
      damageMultiplier: ability.damageMultiplier || 0.95
    };

    let damage = calculateAbilityDamage(player, baseAbility);

    if (targetInfo.softLockBonus) {
      damage = Math.ceil(damage * 1.12);
    }

    if (crit) {
      damage = Math.ceil(damage * 1.45);
    }

    target.slowTimer = Math.max(target.slowTimer || 0, 1.4);
    target.rootUntil = Math.max(target.rootUntil || 0, now + (hits === 0 ? 0.42 : 0.18));

    damageEnemyDirect(player, world, target, damage, 'warding', log, {
      sourceName: 'Vine Whip',
      color: crit ? '#ffcc66' : '#73d18a',
      xpMultiplier: 0.38,
      crit
    });

    hits += 1;
  }

  gainXp(player, 'warding', 2 + hits, log);
  log?.(`Vine Whip struck ${hits} target${hits === 1 ? '' : 's'}.`);

  return true;
}

function findVineWhipTargets(player, world, aim, range, width, maxHits) {
  const candidates = [];

  const startX = player.x;
  const startY = player.y - 4;
  const endX = startX + aim.x * range;
  const endY = startY + aim.y * range;

  let closestToAimPoint = null;
  let closestAimDistance = Infinity;

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const dx = enemy.x - startX;
    const dy = enemy.y - startY;

    const forward = dx * aim.x + dy * aim.y;

    if (forward < 14 || forward > range + 26) continue;

    const closestX = startX + aim.x * forward;
    const closestY = startY + aim.y * forward;

    const perpendicular = Math.hypot(enemy.x - closestX, enemy.y - closestY);
    const aimPointDistance = Math.hypot(enemy.x - endX, enemy.y - endY);

    const nearLine = perpendicular <= width;
    const nearAimPoint = aimPointDistance <= 58;

    if (!nearLine && !nearAimPoint) continue;

    const softLockBonus = nearAimPoint || perpendicular <= width * 0.55;

    const score =
      perpendicular * 1.25 +
      Math.abs(forward - range * 0.72) * 0.20 -
      (softLockBonus ? 22 : 0);

    candidates.push({
      enemy,
      forward,
      perpendicular,
      aimPointDistance,
      softLockBonus,
      score
    });

    if (aimPointDistance < closestAimDistance) {
      closestToAimPoint = enemy;
      closestAimDistance = aimPointDistance;
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  const selected = candidates.slice(0, maxHits);

  if (closestToAimPoint && closestAimDistance <= 72 && !selected.some(t => t.enemy === closestToAimPoint)) {
    selected.pop();

    selected.unshift({
      enemy: closestToAimPoint,
      forward: range,
      perpendicular: 0,
      aimPointDistance: closestAimDistance,
      softLockBonus: true,
      score: -50
    });
  }

  return selected.filter(Boolean);
}

function spawnVineWhipEffects(player, world, aim, range, width, targets) {
  if (!world) return;

  world.effects = world.effects || [];

  const startX = player.x;
  const startY = player.y - 8;

  const focusTarget = targets?.[0]?.enemy || null;

  const endX = focusTarget
    ? startX + aim.x * range * 0.62 + (focusTarget.x - startX) * 0.38
    : startX + aim.x * range;

  const endY = focusTarget
    ? startY + aim.y * range * 0.62 + (focusTarget.y - startY) * 0.38
    : startY + aim.y * range;

  world.effects.push({
    kind: 'vineWhip',
    x: startX,
    y: startY,
    endX,
    endY,
    dirX: aim.x,
    dirY: aim.y,
    width,
    range,
    ttl: 0.24,
    age: 0,
    color: '#73d18a',
    radius: width
  });

  const segmentCount = 7;

  for (let i = 1; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const wobble = Math.sin(t * Math.PI * 2.4) * 10;
    const sideX = -aim.y;
    const sideY = aim.x;

    const sx = startX + (endX - startX) * t + sideX * wobble;
    const sy = startY + (endY - startY) * t + sideY * wobble;

    world.effects.push({
      kind: 'vineSegment',
      x: sx,
      y: sy,
      ttl: 0.18 + t * 0.08,
      age: 0,
      color: '#73d18a',
      radius: Math.max(5, 11 - t * 4)
    });
  }

  for (const targetInfo of targets || []) {
    world.effects.push({
      kind: 'vineImpact',
      x: targetInfo.enemy.x,
      y: targetInfo.enemy.y - 8,
      ttl: 0.26,
      age: 0,
      color: '#73d18a',
      radius: targetInfo.softLockBonus ? 24 : 18
    });
  }

  if (world.effects.length > 170) {
    world.effects.splice(0, world.effects.length - 170);
  }
}

// -----------------------------------------------------------------------------
// DEFENSIVE / SUMMON ABILITIES
// -----------------------------------------------------------------------------

function useDefensiveAbility(player, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  player.buffs = player.buffs || {};

  const duration = ability.id === 'ironOath' ? 5.5 : ability.id === 'briarWard' ? 4.0 : 1.2;
  const reduction = ability.id === 'ironOath' ? 0.58 : ability.damageReduction || 0.35;

  player.buffs.defense = {
    timer: duration,
    reduction
  };

  addFloatingText(player, ability.name, {
    color: '#73d18a',
    ttl: 0.85,
    size: 13
  });

  log?.(`${ability.name} active.`);
  return true;
}

function useSummonAbility(player, world, ability, log, now) {
  player.summons = player.summons || [];

  const existing = player.summons.find(s => {
    return s.kind === ability.summonType && s.alive !== false;
  });

  if (existing) {
    existing.alive = false;
    existing.dismissed = true;

    startAbilityCooldown(player, ability, now);

    log?.(`${existing.displayName || summonName(existing.kind)} dismissed.`);

    addFloatingText(player, 'Summon dismissed', {
      color: '#9facbf'
    });

    return true;
  }

  if (!payAbilityCost(player, ability)) {
    log?.('Not enough resources.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const summon = createSummon(player, ability.summonType);

  player.summons.push(summon);

  log?.(`${summon.displayName} summoned.`);

  addFloatingText(player, summon.displayName, {
    color: ability.summonType === 'lich' ? '#b68cff' : '#73d18a',
    ttl: 1.0,
    size: 13
  });

  return true;
}

// -----------------------------------------------------------------------------
// ENEMY BEHAVIOR
// -----------------------------------------------------------------------------

function ensureEnemyState(enemy) {
  if (!enemy.maxHp) enemy.maxHp = enemy.hp || 30;
  if (!enemy.speed) enemy.speed = defaultEnemySpeed(enemy);
  if (!enemy.damage) enemy.damage = defaultEnemyDamage(enemy);
  if (!enemy.radius) enemy.radius = enemy.r || 14;

  enemy.attackCooldown = enemy.attackCooldown ?? 0;
  enemy.hitFlash = enemy.hitFlash ?? 0;
  enemy.slowTimer = enemy.slowTimer ?? 0;
  enemy.deathHandled = enemy.deathHandled ?? false;
}

function updateEnemyTimers(enemy, dt) {
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
}

function updateEnemyBehavior(enemy, player, world, dt, now, log) {
  const targetInfo = chooseEnemyTarget(enemy, player);

  if (!targetInfo || !targetInfo.target) return;

  const target = targetInfo.target;
  const distance = targetInfo.distance;

  const aggroRange = enemy.aggroRange || 230;
  const attackRange = enemy.attackRange || 25;

  if (distance > aggroRange) return;

  const dirX = distance > 0 ? (target.x - enemy.x) / distance : 0;
  const dirY = distance > 0 ? (target.y - enemy.y) / distance : 1;

  if (distance > attackRange) {
    const slowMultiplier = enemy.slowTimer > 0 ? 0.45 : 1;
    const speed = enemy.speed * slowMultiplier;

    enemy.x += dirX * speed * dt;
    enemy.y += dirY * speed * dt;
    enemy.dirX = dirX;
    enemy.dirY = dirY;

    return;
  }

  if (enemy.attackCooldown <= 0) {
    if (targetInfo.kind === 'summon') {
      enemyAttackSummon(enemy, target, player, log);
    } else {
      enemyAttackPlayer(enemy, player, log);
    }

    enemy.attackCooldown = enemy.attackRate || 1.05;
  }
}

function chooseEnemyTarget(enemy, player) {
  if (!enemy || !player) return null;

  const candidates = [];

  if (player.hp > 0) {
    candidates.push({
      target: player,
      kind: 'player',
      distance: Math.hypot(player.x - enemy.x, player.y - enemy.y)
    });
  }

  for (const summon of player.summons || []) {
    if (!summon) continue;
    if (summon.alive === false) continue;
    if ((summon.hp || 0) <= 0) continue;

    candidates.push({
      target: summon,
      kind: 'summon',
      distance: Math.hypot(summon.x - enemy.x, summon.y - enemy.y)
    });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.distance - b.distance);

  return candidates[0];
}

function enemyAttackPlayer(enemy, player, log) {
  const rawDamage = Math.max(1, enemy.damage || enemy.dmg || 5);

  let result = {
    hpDamage: rawDamage,
    staminaDamage: 0,
    blocked: false,
    guardBroken: false
  };

  if (isBlocking(player)) {
    result = applyDefensiveDamage(player, rawDamage, log, enemy, null);
  }

  let hpDamage = result.hpDamage;

  if (player.buffs?.defense?.timer > 0) {
    const reduction = player.buffs.defense.reduction || 0;
    hpDamage = Math.ceil(hpDamage * (1 - reduction));
  }

  const armour = Math.max(0, getArmour(player) || 0);
  hpDamage = Math.max(1, Math.ceil(hpDamage - armour * 0.18));

  player.hp = Math.max(0, player.hp - hpDamage);

  addFloatingText(player, result.blocked ? `Blocked ${hpDamage}` : `-${hpDamage}`, {
    color: result.blocked ? '#73d18a' : '#ef6f6c',
    ttl: 0.65,
    size: 12
  });

  if (result.guardBroken) {
    addFloatingText(player, 'Guard Break', {
      color: '#ffcc66',
      ttl: 0.8,
      size: 13
    });
  }
}

function enemyAttackSummon(enemy, summon, player, log) {
  if (!summon || summon.alive === false || summon.hp <= 0) return;

  const rawDamage = Math.max(1, enemy.damage || enemy.dmg || 5);
  const damage = Math.max(1, Math.ceil(rawDamage));

  summon.hp = Math.max(0, summon.hp - damage);
  summon.lastHitAt = performance.now() / 1000;
  summon.hitFlash = 0.12;

  addFloatingText(summon, `-${damage}`, {
    color: '#ef6f6c',
    ttl: 0.6,
    size: 11
  });

  if (summon.hp <= 0) {
    summon.hp = 0;
    summon.alive = false;
    summon.dismissed = false;
    summon.dead = true;

    addFloatingText(player, `${summon.displayName || summon.kind} fallen`, {
      color: '#ff8c8c',
      ttl: 0.8,
      size: 12
    });

    log?.(`${enemy.name || 'Enemy'} destroyed ${summon.displayName || summon.kind}.`);
  }
}

// -----------------------------------------------------------------------------
// ENEMY DEATH / LOOT
// -----------------------------------------------------------------------------

function handleEnemyDeath(enemy, player, log) {
  if (enemy.deathHandled) {
    enemy.removeTimer = (enemy.removeTimer ?? 0.35) - 0.016;

    if (enemy.removeTimer <= 0) {
      enemy.remove = true;
    }

    return;
  }

  enemy.deathHandled = true;
  enemy.dead = true;
  enemy.hp = 0;
  enemy.removeTimer = 0.35;

  const xp = enemy.xp || defaultEnemyXp(enemy);
  gainXp(player, 'renown', xp, log);

  const drops = rollEnemyLootSafe(enemy.kind || enemy.type || enemy.id);

  for (const drop of drops) {
    addItem(player, drop.item, drop.qty);

    const itemName = ITEMS[drop.item]?.name || drop.item;

    log?.(`Looted ${drop.qty}x ${itemName}.`);

    addFloatingText(player, `Loot: ${itemName}`, {
      color: getItemFloatingColor(drop.item),
      ttl: 0.75,
      size: 11
    });
  }

  log?.(`${enemy.name || enemy.kind || 'Enemy'} defeated.`);
}

function rollEnemyLootSafe(kind) {
  try {
    if (typeof rollEnemyLoot === 'function') {
      return rollEnemyLoot(kind) || [];
    }
  } catch {
    return [];
  }

  return [];
}

// -----------------------------------------------------------------------------
// SUMMONS
// -----------------------------------------------------------------------------

function createSummon(player, kind) {
  const level = kind === 'lich'
    ? getSkillLevel(player, 'spirit')
    : getSkillLevel(player, 'warding');

  const maxHp = kind === 'lich'
    ? 42 + level * 4
    : 62 + level * 6;

  const displayName = kind === 'lich'
    ? level >= 60
      ? 'Lich Lord'
      : level >= 35
        ? 'Lich'
        : level >= 15
          ? 'Skeletal Knight'
          : 'Skeleton'
    : level >= 60
      ? 'Thorn Titan'
      : level >= 35
        ? 'Elder Thornbeast'
        : level >= 15
          ? 'Thornbeast'
          : 'Thornling';

  return {
    id: `summon-${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    kindTag: 'summon',
    displayName,

    x: player.x - 28,
    y: player.y + 24,

    dirX: player.dirX || 0,
    dirY: player.dirY || 1,

    hp: maxHp,
    maxHp,

    damage: kind === 'lich'
      ? 6 + Math.floor(level * 0.55)
      : 4 + Math.floor(level * 0.42),

    speed: kind === 'lich' ? 92 : 105,
    attackRange: kind === 'lich' ? 135 : 34,
    attackCooldown: 0,
    attackRate: kind === 'lich' ? 1.4 : 1.0,

    alive: true,
    dead: false,
    dismissed: false,
    walkTime: 0
  };
}

export function updateSummons(dt, player, world, log, now = performance.now() / 1000) {
  player.summons = player.summons || [];

  for (const summon of player.summons) {
    if (!summon || summon.alive === false) continue;

    updateSummon(summon, player, world, dt, now, log);
  }

  player.summons = player.summons.filter(summon => {
    return summon && summon.alive !== false;
  });
}

function updateSummon(summon, player, world, dt, now, log) {
  summon.kindTag = 'summon';
  summon.attackCooldown = Math.max(0, (summon.attackCooldown || 0) - dt);
  summon.walkTime = (summon.walkTime || 0) + dt * 5;

  if (summon.hp <= 0) {
    summon.hp = 0;
    summon.alive = false;
    summon.dismissed = false;
    summon.dead = true;
    log?.(`${summon.displayName || summon.kind} was destroyed.`);
    return;
  }

  applyThornbeastPassiveHeal(summon, player, dt);

  const target = findNearestEnemy(summon, world, 230);

  if (target) {
    summonFightTarget(summon, target, player, dt, log);
    return;
  }

  followPlayer(summon, player, dt);
}

function applyThornbeastPassiveHeal(summon, player, dt) {
  if (summon.kind !== 'thornbeast') return;

  summon.healPulseTimer = (summon.healPulseTimer ?? 1.5) - dt;

  if (summon.healPulseTimer > 0) return;

  summon.healPulseTimer = 2.75;

  const distance = Math.hypot(player.x - summon.x, player.y - summon.y);
  if (distance > 145) return;

  const warding = getSkillLevel(player, 'warding');
  const heal = Math.max(1, Math.floor(1 + warding * 0.08));

  player.hp = Math.min(player.maxHp, player.hp + heal);

  // No visual cue by design.
}

function followPlayer(summon, player, dt) {
  const desiredX = player.x - 30;
  const desiredY = player.y + 28;

  const dx = desiredX - summon.x;
  const dy = desiredY - summon.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 24) return;

  const dirX = dx / (dist || 1);
  const dirY = dy / (dist || 1);

  summon.x += dirX * summon.speed * dt;
  summon.y += dirY * summon.speed * dt;
  summon.dirX = dirX;
  summon.dirY = dirY;
}

function summonFightTarget(summon, target, player, dt, log) {
  const dx = target.x - summon.x;
  const dy = target.y - summon.y;
  const dist = Math.hypot(dx, dy);

  const dirX = dx / (dist || 1);
  const dirY = dy / (dist || 1);

  summon.dirX = dirX;
  summon.dirY = dirY;

  if (dist > summon.attackRange) {
    summon.x += dirX * summon.speed * dt;
    summon.y += dirY * summon.speed * dt;
    return;
  }

  if (summon.attackCooldown > 0) return;

  const damage = summon.damage || 5;

  target.hp = Math.max(0, target.hp - damage);
  target.hitFlash = 0.12;
  target.aggro = Math.max(target.aggro || 0, 2.8);

  addFloatingText(target, String(damage), {
    color: summon.kind === 'lich' ? '#b68cff' : '#73d18a',
    ttl: 0.65,
    size: 12
  });

  gainXp(player, summon.kind === 'lich' ? 'spirit' : 'warding', Math.max(2, Math.ceil(damage * 0.25)), log);

  if (target.hp <= 0) {
    target.dead = true;
  }

  summon.attackCooldown = summon.attackRate || 1.1;
}

function findNearestEnemy(actor, world, range) {
  let best = null;
  let bestDistance = Infinity;

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const distance = Math.hypot(enemy.x - actor.x, enemy.y - actor.y);

    if (distance < range && distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }

  return best;
}

// -----------------------------------------------------------------------------
// TARGETING / DAMAGE HELPERS
// -----------------------------------------------------------------------------

function findTargetInDirection(player, world, range, input = null) {
  const aim = getSafeAimDirection(player, input);

  let best = null;
  let bestScore = Infinity;

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > range) continue;

    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const dot = nx * aim.x + ny * aim.y;

    if (dot < 0.45) continue;

    const score = dist - dot * 40;

    if (score < bestScore) {
      best = enemy;
      bestScore = score;
    }
  }

  return best;
}

function damageEnemyDirect(player, world, enemy, damage, skill, log, options = {}) {
  if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) return false;

  const finalDamage = Math.max(1, Math.floor(damage || 1));

  enemy.hp = Math.max(0, enemy.hp - finalDamage);
  enemy.hitFlash = 0.16;
  enemy.lastHitAt = performance.now() / 1000;
  enemy.aggro = Math.max(enemy.aggro || 0, 2.8);

  addFloatingText(enemy, options.crit ? `Crit ${finalDamage}` : String(finalDamage), {
    color: options.color || '#ffcc66',
    ttl: 0.75,
    size: options.crit ? 15 : 14
  });

  spawnWorldEffect(world, {
    kind: 'hitSpark',
    x: enemy.x,
    y: enemy.y - 8,
    ttl: 0.14,
    color: options.color || '#ffffff',
    radius: 10
  });

  const xp = Math.max(3, Math.ceil(finalDamage * (options.xpMultiplier ?? 0.35)));
  gainXp(player, skill || 'blade', xp, log);

  if (enemy.hp <= 0) {
    enemy.dead = true;
  }

  return true;
}

function calculateAbilityDamage(player, ability) {
  const skillLevel = getSkillLevel(player, ability.skill);
  const power = getPower(player) || 1;
  const base = ability.damage || 6;
  const multiplier = ability.damageMultiplier || 1;

  return Math.max(1, Math.round((base + power * 0.65 + skillLevel * 0.5) * multiplier));
}

function getSafeAimDirection(player, input = null) {
  const safeInput = input || buildFallbackInputFromPlayer(player);

  let aim;

  try {
    aim = getAimDirection(player, safeInput);
  } catch {
    aim = null;
  }

  if (!aim || !Number.isFinite(aim.x) || !Number.isFinite(aim.y)) {
    const dx = safeInput.mouseWorldX - player.x;
    const dy = safeInput.mouseWorldY - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0.001) {
      return {
        x: dx / distance,
        y: dy / distance
      };
    }

    return {
      x: player.dirX || 0,
      y: player.dirY || 1
    };
  }

  const distance = Math.hypot(aim.x, aim.y) || 1;

  return {
    x: aim.x / distance,
    y: aim.y / distance
  };
}

// -----------------------------------------------------------------------------
// ABILITY OVERRIDE HELPERS
// -----------------------------------------------------------------------------

function isNecroticBoltAbility(ability) {
  return matchesAbility(ability, Q_ABILITY_OVERRIDES.graveSpark.aliases);
}

function isVineWhipAbility(ability) {
  return matchesAbility(ability, Q_ABILITY_OVERRIDES.vineWhip.aliases);
}

function matchesAbility(ability, aliases) {
  if (!ability) return false;

  const id = String(ability.id || '').toLowerCase();
  const name = String(ability.name || '').toLowerCase();

  return aliases.some(alias => {
    const key = String(alias).toLowerCase();
    return id === key || name === key || id.includes(key) || name.includes(key);
  });
}

function getQOverride(ability) {
  if (isNecroticBoltAbility(ability)) return Q_ABILITY_OVERRIDES.graveSpark;
  if (isVineWhipAbility(ability)) return Q_ABILITY_OVERRIDES.vineWhip;
  return null;
}

function getEffectiveAbilityCooldown(ability) {
  const override = getQOverride(ability);
  return override?.cd ?? ability.cd ?? 0;
}

function getEffectiveAbilityCost(ability) {
  const override = getQOverride(ability);
  return override?.cost ?? ability.cost ?? 0;
}

function getEffectiveAbilityCostType(ability) {
  const override = getQOverride(ability);
  return override?.costType ?? ability.costType ?? 'stamina';
}

function ensureClassSpiritAvailable(player, ability) {
  if (!isNecroticBoltAbility(ability) && !isVineWhipAbility(ability)) return;

  if (player.classId && !player.spiritAwakened) {
    player.spiritAwakened = true;
    player.maxSpirit = Math.max(player.maxSpirit || 0, 35);
    player.spirit = Math.max(player.spirit || 0, Math.min(player.maxSpirit, 24));
  }

  if (player.classId && player.maxSpirit <= 0) {
    player.maxSpirit = 35;
    player.spirit = Math.max(player.spirit || 0, 24);
  }
}

function ensureAbilityProjectileState(player) {
  player.abilityProjectiles = Array.isArray(player.abilityProjectiles)
    ? player.abilityProjectiles
    : [];
}

function spawnWorldEffect(world, effect) {
  if (!world) return;

  world.effects = world.effects || [];

  world.effects.push({
    age: 0,
    ...effect
  });

  if (world.effects.length > 180) {
    world.effects.splice(0, world.effects.length - 180);
  }
}

// -----------------------------------------------------------------------------
// FALLBACK / SMALL HELPERS
// -----------------------------------------------------------------------------

function buildFallbackInputFromPlayer(player) {
  return {
    mouseWorldX: player.x + (player.dirX || 0) * 100,
    mouseWorldY: player.y + (player.dirY || 1) * 100,
    moveX: player.dirX || 0,
    moveY: player.dirY || 1,
    attackPressed: false,
    sprintHeld: false,
    blockHeld: false,
    dashPressed: false
  };
}

function getSkillLevel(player, skillId) {
  return player?.skillState?.skills?.[skillId]?.level || 1;
}

function defaultEnemySpeed(enemy) {
  if (enemy.kind === 'ashWolf') return 82;
  if (enemy.kind === 'gravebound') return 46;
  if (enemy.kind === 'demonCultist') return 62;
  if (enemy.kind === 'roadlessBandit') return 66;
  if (enemy.kind === 'veyrWraith') return 54;
  return 58;
}

function defaultEnemyDamage(enemy) {
  if (enemy.kind === 'ashWolf') return 7;
  if (enemy.kind === 'gravebound') return 10;
  if (enemy.kind === 'demonCultist') return 9;
  if (enemy.kind === 'roadlessBandit') return 8;
  if (enemy.kind === 'veyrWraith') return 12;
  return 5;
}

function defaultEnemyXp(enemy) {
  if (enemy.kind === 'ashWolf') return 16;
  if (enemy.kind === 'gravebound') return 24;
  if (enemy.kind === 'demonCultist') return 28;
  if (enemy.kind === 'roadlessBandit') return 20;
  if (enemy.kind === 'veyrWraith') return 34;
  return 10;
}

function summonName(kind) {
  if (kind === 'lich') return 'Lich';
  if (kind === 'thornbeast') return 'Thornbeast';
  return 'Summon';
}

function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  return String(skillId || 'Unknown');
}

function getItemFloatingColor(itemId) {
  const rarity = ITEMS[itemId]?.rarity;

  if (rarity === 'common') return '#d9ad4f';
  if (rarity === 'uncommon') return '#73d18a';
  if (rarity === 'rare') return '#6fa8ef';
  if (rarity === 'occult') return '#b68cff';
  if (rarity === 'relic') return '#d9ad4f';
  if (rarity === 'legendary') return '#ffcc66';

  return '#d9ad4f';
}

// -----------------------------------------------------------------------------
// RENDER HELPERS FOR render.js
// -----------------------------------------------------------------------------

export function getAttackVisual(player) {
  return getCurrentAttackVisual(player);
}

export function getCombatProjectiles(player) {
  const weaponProjectiles = getProjectiles(player) || [];

  const abilityProjectiles = Array.isArray(player.abilityProjectiles)
    ? player.abilityProjectiles.filter(projectile => projectile && projectile.alive !== false)
    : [];

  return [
    ...weaponProjectiles,
    ...abilityProjectiles
  ];
}

export function getPlayerMovementMultiplier(player) {
  return getMovementSpeedMultiplier(player);
}

export function getPlayerDashVelocity(player) {
  return getDashVelocity(player);
}

export function playerIsDashing(player) {
  return isDashing(player);
}