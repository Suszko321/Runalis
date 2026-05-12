// combatMoves.js
// Runalis weapon moves, combos, aim direction, melee hitboxes, bow projectiles,
// weapon kill XP, hit feedback, knockback, and stagger.
// This file does not handle sprint/dash/block stamina logic; that lives in combatActions.js.
//
// Updated:
// - Weapon skills now gain XP mainly from enemy kills, not every hit.
// - Sword kills level Blade.
// - Bow kills level Archery.
// - Scythe kills level Spirit.
// - Staff kills level Warding.
// - Summon/class scaling can now rely on the correct skill actually growing.
// - Keeps heavier hit feedback, knockback, stagger, combos, and projectiles.

import { ITEMS } from './data.js';
import { gainXp } from './player.js';

import {
  addFloatingText,
  addDamageText,
  addStaggerText
} from './floatingText.js';

import {
  spendStamina,
  canStartAttack
} from './combatActions.js';

const DEFAULT_COMBAT_STATE = {
  attacking: false,
  attackId: 0,
  attackTimer: 0,
  attackElapsed: 0,
  attackMove: null,
  attackDirX: 0,
  attackDirY: 1,
  hitEnemyIds: [],

  comboIndex: 0,
  comboTimer: 0,
  comboQueued: false,

  attackPressedLock: false,
  projectileFiredForAttackId: null,

  projectiles: []
};

const COMBO_RESET_TIME = 0.82;

// XP should be meaningful but slow.
// This is kill-based, so the values can be higher than per-hit XP without exploding.
const KILL_XP_BASE = 28;
const KILL_XP_PER_ENEMY_XP = 0.9;
const KILL_XP_PER_ENEMY_MAX_HP = 0.08;
const KILL_XP_BOSS_MULTIPLIER = 4;

export const WEAPON_MOVESETS = {
  sword: {
    skill: 'blade',
    moves: [
      {
        id: 'sword_light_1',
        name: 'Sword Light I',
        kind: 'arc',
        comboType: 'light',
        duration: 0.34,
        startup: 0.07,
        activeStart: 0.08,
        activeEnd: 0.18,
        recovery: 0.16,
        staminaCost: 6,
        range: 48,
        arcDegrees: 78,
        damageMultiplier: 1.0,
        knockback: 20,
        stagger: 0.08,
        impact: 'slash',
        unlockLevel: 1
      },
      {
        id: 'sword_light_2',
        name: 'Sword Light II',
        kind: 'arc',
        comboType: 'light',
        duration: 0.37,
        startup: 0.07,
        activeStart: 0.08,
        activeEnd: 0.21,
        recovery: 0.16,
        staminaCost: 7,
        range: 52,
        arcDegrees: 88,
        damageMultiplier: 1.16,
        knockback: 24,
        stagger: 0.10,
        impact: 'slash',
        unlockLevel: 5
      },
      {
        id: 'sword_heavy_3',
        name: 'Sword Heavy',
        kind: 'arc',
        comboType: 'heavy',
        duration: 0.58,
        startup: 0.15,
        activeStart: 0.16,
        activeEnd: 0.33,
        recovery: 0.25,
        staminaCost: 14,
        range: 61,
        arcDegrees: 104,
        damageMultiplier: 1.78,
        knockback: 48,
        stagger: 0.32,
        impact: 'heavySlash',
        unlockLevel: 10
      }
    ]
  },

  scythe: {
    skill: 'spirit',
    moves: [
      {
        id: 'scythe_wide_1',
        name: 'Wide Reap',
        kind: 'arc',
        comboType: 'light',
        duration: 0.45,
        startup: 0.10,
        activeStart: 0.11,
        activeEnd: 0.28,
        recovery: 0.17,
        staminaCost: 8,
        range: 66,
        arcDegrees: 124,
        damageMultiplier: 1.08,
        knockback: 24,
        stagger: 0.10,
        impact: 'spiritSlash',
        unlockLevel: 1
      },
      {
        id: 'scythe_hook_2',
        name: 'Hook Slash',
        kind: 'arc',
        comboType: 'light',
        duration: 0.49,
        startup: 0.10,
        activeStart: 0.11,
        activeEnd: 0.29,
        recovery: 0.20,
        staminaCost: 9,
        range: 62,
        arcDegrees: 98,
        damageMultiplier: 1.28,
        knockback: 34,
        stagger: 0.14,
        impact: 'spiritSlash',
        unlockLevel: 5
      },
      {
        id: 'scythe_reap_3',
        name: 'Reaping Heavy',
        kind: 'arc',
        comboType: 'heavy',
        duration: 0.68,
        startup: 0.18,
        activeStart: 0.19,
        activeEnd: 0.40,
        recovery: 0.28,
        staminaCost: 17,
        range: 76,
        arcDegrees: 140,
        damageMultiplier: 1.95,
        knockback: 56,
        stagger: 0.40,
        impact: 'heavySpiritSlash',
        lifedrainRatio: 0.05,
        unlockLevel: 10
      }
    ]
  },

  staff: {
    skill: 'warding',
    moves: [
      {
        id: 'staff_jab_1',
        name: 'Staff Jab',
        kind: 'line',
        comboType: 'light',
        duration: 0.33,
        startup: 0.06,
        activeStart: 0.07,
        activeEnd: 0.18,
        recovery: 0.15,
        staminaCost: 5,
        range: 68,
        width: 24,
        damageMultiplier: 0.92,
        knockback: 20,
        stagger: 0.10,
        impact: 'staffHit',
        unlockLevel: 1
      },
      {
        id: 'staff_sweep_2',
        name: 'Staff Sweep',
        kind: 'arc',
        comboType: 'light',
        duration: 0.43,
        startup: 0.09,
        activeStart: 0.10,
        activeEnd: 0.26,
        recovery: 0.17,
        staminaCost: 8,
        range: 57,
        arcDegrees: 118,
        damageMultiplier: 1.08,
        knockback: 30,
        stagger: 0.18,
        impact: 'staffHit',
        unlockLevel: 5
      },
      {
        id: 'staff_slam_3',
        name: 'Staff Slam',
        kind: 'circle',
        comboType: 'heavy',
        duration: 0.62,
        startup: 0.17,
        activeStart: 0.18,
        activeEnd: 0.35,
        recovery: 0.27,
        staminaCost: 15,
        range: 50,
        radius: 45,
        damageMultiplier: 1.6,
        knockback: 44,
        stagger: 0.42,
        impact: 'groundSlam',
        unlockLevel: 10
      }
    ]
  },

  bow: {
    skill: 'archery',
    moves: [
      {
        id: 'bow_shot_1',
        name: 'Arrow Shot',
        kind: 'projectile',
        comboType: 'shot',
        duration: 0.40,
        startup: 0.10,
        activeStart: 0.11,
        activeEnd: 0.14,
        recovery: 0.26,
        staminaCost: 7,
        projectileSpeed: 410,
        projectileRange: 280,
        projectileRadius: 8,
        damageMultiplier: 1.0,
        knockback: 16,
        stagger: 0.08,
        impact: 'arrowHit',
        unlockLevel: 1
      },
      {
        id: 'bow_fast_2',
        name: 'Follow-Up Shot',
        kind: 'projectile',
        comboType: 'shot',
        duration: 0.36,
        startup: 0.08,
        activeStart: 0.09,
        activeEnd: 0.12,
        recovery: 0.24,
        staminaCost: 8,
        projectileSpeed: 455,
        projectileRange: 305,
        projectileRadius: 8,
        damageMultiplier: 1.12,
        knockback: 18,
        stagger: 0.10,
        impact: 'arrowHit',
        unlockLevel: 5
      },
      {
        id: 'bow_power_3',
        name: 'Power Shot',
        kind: 'projectile',
        comboType: 'heavy',
        duration: 0.61,
        startup: 0.19,
        activeStart: 0.20,
        activeEnd: 0.25,
        recovery: 0.36,
        staminaCost: 16,
        projectileSpeed: 535,
        projectileRange: 370,
        projectileRadius: 10,
        damageMultiplier: 1.82,
        knockback: 46,
        stagger: 0.36,
        impact: 'powerArrowHit',
        pierce: 1,
        unlockLevel: 10
      }
    ]
  },

  unarmed: {
    skill: 'blade',
    moves: [
      {
        id: 'unarmed_swing_1',
        name: 'Basic Swing',
        kind: 'arc',
        comboType: 'light',
        duration: 0.31,
        startup: 0.07,
        activeStart: 0.08,
        activeEnd: 0.17,
        recovery: 0.14,
        staminaCost: 3,
        range: 34,
        arcDegrees: 64,
        damageMultiplier: 0.65,
        knockback: 12,
        stagger: 0.06,
        impact: 'punch',
        unlockLevel: 1
      }
    ]
  }
};

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function ensureCombatState(player) {
  if (!player.combatState) {
    player.combatState = cloneDefaultCombatState();
  }

  for (const [key, value] of Object.entries(DEFAULT_COMBAT_STATE)) {
    if (player.combatState[key] === undefined) {
      player.combatState[key] = Array.isArray(value) ? [...value] : value;
    }
  }

  if (!Array.isArray(player.combatState.projectiles)) {
    player.combatState.projectiles = [];
  }

  return player.combatState;
}

export function requestBasicAttack(player, world, input, log, now) {
  const state = ensureCombatState(player);

  if (!canStartAttack(player)) return false;

  if (state.attacking) {
    if (canQueueCombo(state)) {
      state.comboQueued = true;
    }

    return false;
  }

  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const moveset = WEAPON_MOVESETS[weaponType] || WEAPON_MOVESETS.unarmed;
  const skillLevel = getSkillLevel(player, moveset.skill);

  const move = selectComboMove(state, moveset, skillLevel);

  if (!move) {
    log?.('No usable attack move.');
    return false;
  }

  if (!spendStamina(player, move.staminaCost, 0.5)) {
    log?.('Not enough stamina to attack.');
    return false;
  }

  const aim = getAimDirection(player, input);

  state.attacking = true;
  state.attackId += 1;
  state.attackTimer = move.duration;
  state.attackElapsed = 0;
  state.attackMove = move;
  state.attackDirX = aim.x;
  state.attackDirY = aim.y;
  state.hitEnemyIds = [];
  state.comboQueued = false;
  state.projectileFiredForAttackId = null;

  player.dirX = aim.x;
  player.dirY = aim.y;

  spawnAttackStartEffect(world, player, move, state);

  return true;
}

export function updateWeaponCombat(player, world, input, dt, now, log) {
  const state = ensureCombatState(player);

  updateComboTimer(state, dt);
  updateProjectiles(player, world, dt, log);

  if (!state.attacking) {
    return;
  }

  const move = state.attackMove;

  state.attackElapsed += dt;
  state.attackTimer -= dt;

  if (isMoveActive(move, state.attackElapsed)) {
    if (move.kind === 'projectile') {
      maybeFireProjectile(player, move, state, world);
    } else {
      resolveMeleeHitbox(player, world, move, state, log);
    }
  }

  if (state.attackTimer <= 0) {
    finishAttack(player, world, input, now, log);
  }
}

export function consumeAttackPressed(input) {
  if (!input) return false;

  if (input.attackPressed) {
    input.attackPressed = false;
    return true;
  }

  return false;
}

export function getCurrentAttackVisual(player) {
  const state = ensureCombatState(player);

  if (!state.attacking || !state.attackMove) {
    return null;
  }

  return {
    move: state.attackMove,
    elapsed: state.attackElapsed,
    duration: state.attackMove.duration,
    dirX: state.attackDirX,
    dirY: state.attackDirY,
    active: isMoveActive(state.attackMove, state.attackElapsed)
  };
}

export function getProjectiles(player) {
  const state = ensureCombatState(player);
  return state.projectiles || [];
}

export function getWeaponTypeFromPlayer(player) {
  return getWeaponType(getEquippedWeapon(player));
}

// -----------------------------------------------------------------------------
// ATTACK FLOW
// -----------------------------------------------------------------------------

function finishAttack(player, world, input, now, log) {
  const state = ensureCombatState(player);
  const move = state.attackMove;
  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const moveset = WEAPON_MOVESETS[weaponType] || WEAPON_MOVESETS.unarmed;
  const skillLevel = getSkillLevel(player, moveset.skill);

  state.attacking = false;
  state.attackTimer = 0;
  state.attackElapsed = 0;
  state.attackMove = null;
  state.hitEnemyIds = [];

  const hasNextMove = getNextUnlockedMove(state.comboIndex, moveset, skillLevel);

  if (state.comboQueued && hasNextMove) {
    state.comboIndex += 1;
    state.comboTimer = COMBO_RESET_TIME;
    state.comboQueued = false;
    requestBasicAttack(player, world, input, log, now);
    return;
  }

  if (move) {
    state.comboIndex += 1;
    state.comboTimer = COMBO_RESET_TIME;

    if (!getNextUnlockedMove(state.comboIndex, moveset, skillLevel)) {
      state.comboIndex = 0;
    }
  }
}

function canQueueCombo(state) {
  const move = state.attackMove;
  if (!move) return false;

  const queueStart = move.activeEnd;
  const queueEnd = move.duration - 0.04;

  return state.attackElapsed >= queueStart && state.attackElapsed <= queueEnd;
}

function updateComboTimer(state, dt) {
  if (state.comboTimer <= 0) {
    state.comboIndex = 0;
    state.comboQueued = false;
    return;
  }

  state.comboTimer -= dt;

  if (state.comboTimer <= 0) {
    state.comboIndex = 0;
    state.comboQueued = false;
  }
}

function selectComboMove(state, moveset, skillLevel) {
  const moves = getUnlockedMoves(moveset, skillLevel);

  if (!moves.length) return null;

  if (state.comboTimer <= 0) {
    state.comboIndex = 0;
  }

  const index = Math.max(0, Math.min(state.comboIndex, moves.length - 1));
  return moves[index] || moves[0];
}

function getNextUnlockedMove(index, moveset, skillLevel) {
  const moves = getUnlockedMoves(moveset, skillLevel);
  return moves[index] || null;
}

function getUnlockedMoves(moveset, skillLevel) {
  return moveset.moves.filter(move => skillLevel >= (move.unlockLevel || 1));
}

function isMoveActive(move, elapsed) {
  if (!move) return false;
  return elapsed >= move.activeStart && elapsed <= move.activeEnd;
}

// -----------------------------------------------------------------------------
// MELEE HITBOXES
// -----------------------------------------------------------------------------

function resolveMeleeHitbox(player, world, move, state, log) {
  const enemies = world?.enemies || [];

  for (const enemy of enemies) {
    if (!enemy || enemy.hp <= 0) continue;

    const enemyId = getEnemyId(enemy);
    if (state.hitEnemyIds.includes(enemyId)) continue;

    if (!enemyInHitbox(player, enemy, move, state)) continue;

    const damagePacket = calculateMoveDamage(player, move);
    applyEnemyDamage(player, world, enemy, damagePacket, move, state, log);

    state.hitEnemyIds.push(enemyId);
  }
}

function enemyInHitbox(player, enemy, move, state) {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const distance = Math.hypot(dx, dy);
  const enemyRadius = enemy.radius || enemy.r || 14;

  if (move.kind === 'circle') {
    const radius = move.radius || move.range || 40;
    return distance <= radius + enemyRadius;
  }

  if (move.kind === 'line') {
    return pointInDirectionalCapsule(
      dx,
      dy,
      state.attackDirX,
      state.attackDirY,
      move.range || 56,
      move.width || 24,
      enemyRadius
    );
  }

  return pointInArc(
    dx,
    dy,
    state.attackDirX,
    state.attackDirY,
    move.range || 46,
    move.arcDegrees || 70,
    enemyRadius
  );
}

function pointInArc(dx, dy, dirX, dirY, range, arcDegrees, targetRadius = 0) {
  const distance = Math.hypot(dx, dy);

  if (distance > range + targetRadius) return false;
  if (distance <= 6 + targetRadius) return true;

  const nx = dx / distance;
  const ny = dy / distance;

  const dot = clamp(nx * dirX + ny * dirY, -1, 1);
  const angle = Math.acos(dot);
  const maxAngle = degreesToRadians(arcDegrees / 2);

  return angle <= maxAngle;
}

function pointInDirectionalCapsule(dx, dy, dirX, dirY, length, width, targetRadius = 0) {
  const forward = dx * dirX + dy * dirY;

  if (forward < -targetRadius) return false;
  if (forward > length + targetRadius) return false;

  const closestX = dirX * forward;
  const closestY = dirY * forward;

  const sideDistance = Math.hypot(dx - closestX, dy - closestY);

  return sideDistance <= width / 2 + targetRadius;
}

// -----------------------------------------------------------------------------
// PROJECTILES / BOW
// -----------------------------------------------------------------------------

function maybeFireProjectile(player, move, state, world) {
  if (state.projectileFiredForAttackId === state.attackId) {
    return;
  }

  state.projectileFiredForAttackId = state.attackId;
  state.projectiles = state.projectiles || [];

  const spawnOffset = 24;

  state.projectiles.push({
    id: `arrow-${state.attackId}-${Date.now()}`,
    kind: move.comboType === 'heavy' ? 'powerArrow' : 'arrow',
    x: player.x + state.attackDirX * spawnOffset,
    y: player.y + state.attackDirY * spawnOffset,
    startX: player.x,
    startY: player.y,
    dirX: state.attackDirX,
    dirY: state.attackDirY,
    speed: move.projectileSpeed || 380,
    range: move.projectileRange || 260,
    radius: move.projectileRadius || 8,
    damageMultiplier: move.damageMultiplier || 1,
    knockback: move.knockback || 10,
    stagger: move.stagger || 0,
    skill: 'archery',
    comboType: move.comboType,
    impact: move.impact || 'arrowHit',
    pierceRemaining: move.pierce || 0,
    hitEnemyIds: [],
    alive: true
  });

  spawnWorldEffect(world, {
    kind: 'slash',
    layer: 'front',
    x: player.x + state.attackDirX * 18,
    y: player.y + state.attackDirY * 18,
    ttl: 0.12,
    color: move.comboType === 'heavy' ? '#ffcc66' : '#d9ad4f',
    dirX: state.attackDirX,
    dirY: state.attackDirY
  });
}

function updateProjectiles(player, world, dt, log) {
  const state = ensureCombatState(player);

  state.projectiles = state.projectiles || [];

  for (const projectile of state.projectiles) {
    if (!projectile.alive) continue;

    projectile.x += projectile.dirX * projectile.speed * dt;
    projectile.y += projectile.dirY * projectile.speed * dt;

    const traveled = Math.hypot(projectile.x - projectile.startX, projectile.y - projectile.startY);

    if (traveled >= projectile.range) {
      projectile.alive = false;
      continue;
    }

    resolveProjectileHits(player, world, projectile, log);
  }

  state.projectiles = state.projectiles.filter(p => p.alive);
}

function resolveProjectileHits(player, world, projectile, log) {
  const enemies = world?.enemies || [];

  for (const enemy of enemies) {
    if (!enemy || enemy.hp <= 0) continue;

    const enemyId = getEnemyId(enemy);
    if (projectile.hitEnemyIds.includes(enemyId)) continue;

    const radius = projectile.radius + (enemy.radius || enemy.r || 14);
    const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);

    if (distance > radius) continue;

    const damagePacket = calculateMoveDamage(player, projectile);

    applyEnemyDamage(player, world, enemy, damagePacket, projectile, {
      attackDirX: projectile.dirX,
      attackDirY: projectile.dirY
    }, log);

    projectile.hitEnemyIds.push(enemyId);

    if (projectile.pierceRemaining > 0) {
      projectile.pierceRemaining -= 1;
    } else {
      projectile.alive = false;
      return;
    }
  }
}

// -----------------------------------------------------------------------------
// DAMAGE / KILL XP
// -----------------------------------------------------------------------------

function calculateMoveDamage(player, move) {
  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const moveset = WEAPON_MOVESETS[weaponType] || WEAPON_MOVESETS.unarmed;
  const skillId = move.skill || moveset.skill || weapon?.primarySkill || weapon?.skill || 'blade';

  const base = calculateWeaponDamage(player, weapon, weaponType);
  const multiplier = Number(move.damageMultiplier || 1);

  const critChance = getCritChance(player, weapon, move);
  const crit = Math.random() < critChance;
  const critMultiplier = move.comboType === 'heavy' ? 1.65 : 1.45;

  let damage = Math.round(base * multiplier);

  if (crit) {
    damage = Math.round(damage * critMultiplier);
  }

  return {
    amount: Math.max(1, damage),
    crit,
    skillId,
    weaponType,
    comboType: move.comboType || 'light'
  };
}

function calculateWeaponDamage(player, weapon, fallbackWeaponType = 'unarmed') {
  if (!weapon) {
    const blade = getSkillLevel(player, 'blade');
    return Math.floor(2 + Math.pow(blade, 0.78) * 1.15);
  }

  const primarySkill = weapon.primarySkill || weapon.skill || getDefaultSkillForWeaponType(fallbackWeaponType);
  const secondarySkill = weapon.secondarySkill || null;

  const primaryLevel = getSkillLevel(player, primarySkill);
  const secondaryLevel = secondarySkill ? getSkillLevel(player, secondarySkill) : 0;

  const baseDamage = Number(weapon.baseDamage || weapon.power || 4);
  const primaryMultiplier = Number(weapon.primaryMultiplier || getRarityScalingMultiplier(weapon.rarity));
  const secondaryMultiplier = Number(weapon.secondaryMultiplier || 0);

  const primaryPower = Math.pow(primaryLevel, 0.85) * primaryMultiplier * 0.55;
  const secondaryPower = secondarySkill
    ? Math.pow(secondaryLevel, 0.85) * secondaryMultiplier * 0.55
    : 0;

  const legacyPower = Number(weapon.power || 0) * 0.75;
  const spiritPower = Number(weapon.spirit || 0) * 0.5;

  return Math.floor(baseDamage + primaryPower + secondaryPower + legacyPower + spiritPower);
}

function applyEnemyDamage(player, world, enemy, damagePacket, move, state, log) {
  const damage = damagePacket.amount;

  enemy.hp = Math.max(0, enemy.hp - damage);

  const dirX = state.attackDirX || 0;
  const dirY = state.attackDirY || 1;
  const knockback = move.knockback || 0;

  if (knockback > 0) {
    enemy.x += dirX * knockback;
    enemy.y += dirY * knockback;
  }

  enemy.hitFlash = move.comboType === 'heavy' ? 0.18 : 0.12;
  enemy.lastHitAt = performance.now() / 1000;
  enemy.lastDamagedByPlayer = true;

  if (move.stagger && move.stagger > 0) {
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, move.stagger);

    if (move.comboType === 'heavy') {
      addStaggerText(enemy, {
        text: 'Stagger',
        color: '#ffcc66',
        ttl: 0.55,
        size: 12,
        offsetY: -48
      });
    }
  }

  addDamageText(enemy, damage, {
    crit: damagePacket.crit,
    heavy: move.comboType === 'heavy',
    color: getDamageColor(move, damagePacket),
    ttl: damagePacket.crit ? 0.88 : move.comboType === 'heavy' ? 0.78 : 0.62,
    size: damagePacket.crit ? 18 : move.comboType === 'heavy' ? 16 : 12
  });

  applyMoveSpecials(player, enemy, damagePacket, move);

  spawnHitEffect(world, enemy, move, state, damagePacket);

  if (enemy.hp <= 0) {
    enemy.dead = true;
    awardWeaponKillXp(player, enemy, damagePacket.weaponType, log);
  }
}

function awardWeaponKillXp(player, enemy, weaponType, log) {
  if (!enemy || enemy.weaponKillXpAwarded) return;

  const skillId = getSkillForWeaponType(weaponType);
  if (!skillId) return;

  enemy.weaponKillXpAwarded = true;

  const enemyXp = Number(enemy.xp || 0);
  const maxHp = Number(enemy.maxHp || enemy.hp || 1);

  let amount = KILL_XP_BASE;
  amount += enemyXp * KILL_XP_PER_ENEMY_XP;
  amount += maxHp * KILL_XP_PER_ENEMY_MAX_HP;

  if (enemy.isBoss) {
    amount *= KILL_XP_BOSS_MULTIPLIER;
  }

  amount = Math.max(12, Math.floor(amount));

  gainXp(player, skillId, amount, log);

  addFloatingText(player, `+${amount} ${skillLabel(skillId)} XP`, {
    preset: 'status',
    color: getSkillColor(skillId),
    ttl: 0.72,
    size: 11,
    offsetY: -58
  });
}

function applyMoveSpecials(player, enemy, damagePacket, move) {
  const weapon = getEquippedWeapon(player);
  const traits = weapon?.traits || [];

  const isLifedrain =
    traits.includes('lifedrain') ||
    move.lifedrainRatio ||
    weapon?.id === 'unburiedCrescent';

  if (isLifedrain && damagePacket.skillId === 'spirit') {
    const ratio = Number(move.lifedrainRatio || 0.035);
    const heal = Math.max(1, Math.floor(damagePacket.amount * ratio));

    player.hp = Math.min(player.maxHp, player.hp + heal);

    // Visible because this is an active hit effect, not the Thornbeast passive.
    addFloatingText(player, `+${heal}`, {
      preset: 'heal',
      color: '#b68cff',
      ttl: 0.55,
      size: 11,
      offsetY: -46
    });
  }
}

function getCritChance(player, weapon, move) {
  let chance = 0.04;

  if (move.comboType === 'heavy') chance += 0.03;
  if (weapon?.rarity === 'rare') chance += 0.02;
  if (weapon?.rarity === 'legendary') chance += 0.04;
  if (weapon?.rarity === 'relic') chance += 0.05;

  if (weapon?.weaponType === 'bow') {
    chance += Math.min(0.08, getSkillLevel(player, 'archery') * 0.0008);
  }

  return clamp(chance, 0, 0.22);
}

function getDamageColor(move, damagePacket) {
  if (damagePacket?.crit) return '#ffcc66';
  if (damagePacket?.skillId === 'spirit') return '#b68cff';
  if (damagePacket?.skillId === 'warding') return '#73d18a';
  if (move.kind === 'projectile') return '#d9ad4f';
  if (move.comboType === 'heavy') return '#ffcc66';

  return '#e8edf5';
}

function getDefaultSkillForWeaponType(weaponType) {
  return getSkillForWeaponType(weaponType) || 'blade';
}

function getSkillForWeaponType(weaponType) {
  if (weaponType === 'bow') return 'archery';
  if (weaponType === 'scythe') return 'spirit';
  if (weaponType === 'staff') return 'warding';
  if (weaponType === 'sword') return 'blade';
  if (weaponType === 'unarmed') return 'blade';

  return 'blade';
}

function getRarityScalingMultiplier(rarity) {
  if (rarity === 'common') return 2;
  if (rarity === 'uncommon') return 3;
  if (rarity === 'rare') return 4;
  if (rarity === 'epic') return 5.5;
  if (rarity === 'legendary') return 7;
  if (rarity === 'relic') return 8;

  return 2;
}

// -----------------------------------------------------------------------------
// WORLD HIT EFFECTS
// -----------------------------------------------------------------------------

function spawnAttackStartEffect(world, player, move, state) {
  if (!world) return;

  if (move.kind === 'projectile') return;

  spawnWorldEffect(world, {
    kind: move.comboType === 'heavy' ? 'heavySlash' : 'slash',
    layer: 'front',
    x: player.x + state.attackDirX * 20,
    y: player.y + state.attackDirY * 20,
    ttl: move.comboType === 'heavy' ? 0.2 : 0.14,
    color: getMoveEffectColor(move),
    dirX: state.attackDirX,
    dirY: state.attackDirY
  });
}

function spawnHitEffect(world, enemy, move, state, damagePacket) {
  if (!world || !enemy) return;

  const heavy = move.comboType === 'heavy';
  const crit = damagePacket.crit;

  spawnWorldEffect(world, {
    kind: 'burst',
    layer: 'front',
    x: enemy.x,
    y: enemy.y - 8,
    ttl: crit ? 0.28 : heavy ? 0.22 : 0.16,
    radius: crit ? 32 : heavy ? 25 : 16,
    color: crit ? '#ffcc66' : getMoveEffectColor(move)
  });

  if (heavy || crit) {
    spawnWorldEffect(world, {
      kind: heavy ? 'heavySlash' : 'slash',
      layer: 'front',
      x: enemy.x,
      y: enemy.y - 4,
      ttl: 0.16,
      color: crit ? '#ffcc66' : getMoveEffectColor(move),
      dirX: state.attackDirX || 1,
      dirY: state.attackDirY || 0
    });
  }
}

function spawnWorldEffect(world, effect) {
  if (!world) return;

  world.effects = Array.isArray(world.effects) ? world.effects : [];
  world.effects.push({
    age: 0,
    ...effect
  });
}

function getMoveEffectColor(move) {
  if (move.impact === 'spiritSlash' || move.impact === 'heavySpiritSlash') return '#b68cff';
  if (move.impact === 'staffHit' || move.impact === 'groundSlam') return '#73d18a';
  if (move.impact === 'arrowHit' || move.impact === 'powerArrowHit') return '#d9ad4f';
  if (move.comboType === 'heavy') return '#ffcc66';

  return '#e8edf5';
}

// -----------------------------------------------------------------------------
// AIM / WEAPON HELPERS
// -----------------------------------------------------------------------------

export function getAimDirection(player, input) {
  const mouseWorldX = input?.mouseWorldX;
  const mouseWorldY = input?.mouseWorldY;

  if (Number.isFinite(mouseWorldX) && Number.isFinite(mouseWorldY)) {
    const dx = mouseWorldX - player.x;
    const dy = mouseWorldY - player.y;
    const length = Math.hypot(dx, dy);

    if (length > 0.001) {
      return {
        x: dx / length,
        y: dy / length
      };
    }
  }

  const fallbackX = Number(player.dirX || 0);
  const fallbackY = Number(player.dirY || 1);
  const fallbackLength = Math.hypot(fallbackX, fallbackY) || 1;

  return {
    x: fallbackX / fallbackLength,
    y: fallbackY / fallbackLength
  };
}

function getEquippedWeapon(player) {
  const weaponId = player?.equipment?.weapon;
  return weaponId ? ITEMS[weaponId] : null;
}

function getWeaponType(weapon) {
  if (!weapon) return 'unarmed';

  if (weapon.weaponType) return weapon.weaponType;

  const text = `${weapon.id || ''} ${weapon.name || ''}`.toLowerCase();

  if (text.includes('bow')) return 'bow';
  if (text.includes('staff')) return 'staff';
  if (text.includes('scythe') || text.includes('crescent')) return 'scythe';
  if (text.includes('knife') || text.includes('sword') || text.includes('blade')) return 'sword';

  return 'sword';
}

function getSkillLevel(player, skillId) {
  return player?.skillState?.skills?.[skillId]?.level || 1;
}

function getEnemyId(enemy) {
  if (!enemy.__combatId) {
    enemy.__combatId = `enemy-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  return enemy.__combatId;
}

function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';

  return String(skillId || 'Skill');
}

function getSkillColor(skillId) {
  if (skillId === 'blade') return '#ffcc66';
  if (skillId === 'archery') return '#d9ad4f';
  if (skillId === 'spirit') return '#b68cff';
  if (skillId === 'warding') return '#73d18a';

  return '#e8edf5';
}

// -----------------------------------------------------------------------------
// UTILITY
// -----------------------------------------------------------------------------

function cloneDefaultCombatState() {
  const clone = {};

  for (const [key, value] of Object.entries(DEFAULT_COMBAT_STATE)) {
    clone[key] = Array.isArray(value) ? [...value] : value;
  }

  return clone;
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}