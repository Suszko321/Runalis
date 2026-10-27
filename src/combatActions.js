import {isBlockSkillHeld,hasEquippedBlock} from './hotbarConfig.js';
import { attributeHandling } from './combatPower.js';
import {getEquipmentStatBonuses} from './setBonusSystem.js';
// combatActions.js
// Runalis stamina-based movement/defense actions.
import {hasUnlimitedStamina} from './outOfCombatRecovery.js';
// Handles sprint, dash, block, stamina drain, regen delay, and guard breaks.
// This file does not handle weapon attacks or abilities.
//
// Updated:
// - Dash now triggers class passive hook.
// - Successful blocks now trigger class passive hook.
// - Thornbinder damage/block passive can now activate through defensive damage.
// - Backward compatible public API preserved.

import {
  onPlayerDash,
  onPlayerBlockedDamage
} from './classPassives.js';

import {
  getSkillTreeBonuses
} from './skillTreeSystem.js';

const DEFAULT_ACTION_STATE = {
  sprinting: false,
  blocking: false,
  dashing: false,
  guardBroken: false,

  dashTimer: 0,
  dashCooldown: 0,
  dodgeIFrameDelay: 0,
  dodgeIFrameTimer: 0,
  dashDirX: 0,
  dashDirY: 1,

  staminaRegenDelay: 0,
  guardBreakTimer: 0,

  lastBlockTime: 0,
  lastDashTime: 0
};

export const STAMINA_ACTIONS = {
  sprint: {
    speedMultiplier: 1.45,
    staminaPerSecond: 13,
    minStamina: 3,
    regenDelay: 0.45
  },

  dash: {
    speed: 520,
    duration: 0.16,
    iframeDelay: 0.01,
    iframeDuration: 0.18,
    cooldown: 0.42,
    staminaCost: 22,
    regenDelay: 0.7
  },

  block: {
    staminaPerSecond: 4,
    damageReduction: 0.62,
    staminaDamageMultiplier: 0.55,
    minStamina: 2,
    guardBreakDuration: 0.75,
    regenDelay: 0.65
  },

  regen: {
    staminaPerSecond: 11
  }
};

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

function isOathkeeper(player) {
  return normalizeClassId(player?.classId) === 'oathkeeper';
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function ensureActionState(player) {
  if (!player) return { ...DEFAULT_ACTION_STATE };

  if (!player.actionState) {
    player.actionState = { ...DEFAULT_ACTION_STATE };
  }

  for (const [key, value] of Object.entries(DEFAULT_ACTION_STATE)) {
    if (player.actionState[key] === undefined) {
      player.actionState[key] = value;
    }
  }

  return player.actionState;
}

const dashBuffers=new WeakMap();
export function updateStaminaActions(player, input, dt, now, log) {
  const state = ensureActionState(player);

  updateTimers(state, dt);

  if (state.guardBreakTimer <= 0) {
    state.guardBroken = false;
  }

  const wantsBlock = isBlockSkillHeld(player,input)&&!player.activeChannel&&!player.abilityCharge?.active&&player.hp>0;
  const wantsSprint = Boolean(input?.sprintHeld);
  const wantsDash = Boolean(input?.dashPressed);

  if(wantsDash&&state.dashCooldown>0&&state.dashCooldown<=.1&&!state.blocking&&!state.guardBroken)
    dashBuffers.set(player,{state,until:now+.1,input:{moveX:input.moveX,moveY:input.moveY}});
  const buffered=dashBuffers.get(player);
  if(buffered&&(buffered.state!==state||now>buffered.until||state.blocking||state.guardBroken||!(player.hp>0)))dashBuffers.delete(player);

  if (wantsDash) {
    if(tryStartDash(player, input, now, log))dashBuffers.delete(player);
  } else if(dashBuffers.has(player)&&!state.dashing&&state.dashCooldown<=0){
    tryStartDash(player,dashBuffers.get(player).input,now,log);dashBuffers.delete(player);
  }

  updateDash(player, dt);
  updateBlock(player, wantsBlock, dt, now, log);
  updateSprint(player, wantsSprint, dt);

  updateStaminaRegen(player, dt);

  clampStamina(player);
}

export function getMovementSpeedMultiplier(player) {
  const state = ensureActionState(player);

  if (state.dashing) {
    return 0;
  }

  if (isBlocking(player)) {
    const bonuses = getSkillTreeBonuses(player);
    const oathkeeperBonus = isOathkeeper(player) ? 0.04 : 0;
    return 0.42 + oathkeeperBonus + Math.min(0.12, (bonuses.blockMoveSpeedPct || 0) / 100);
  }

  if (state.sprinting) {
    const bonuses = getSkillTreeBonuses(player);
    const classScalar = isOathkeeper(player) ? 0.92 : 1;
    return STAMINA_ACTIONS.sprint.speedMultiplier * classScalar * (1 + Math.max(0, bonuses.moveSpeedPct || 0) / 100);
  }

  const bonuses = getSkillTreeBonuses(player);
  return (isOathkeeper(player) ? 0.92 : 1) * (1 + Math.max(0, bonuses.moveSpeedPct || 0) / 100);
}

export function getDashVelocity(player) {
  const state = ensureActionState(player);

  if (!state.dashing) {
    return { x: 0, y: 0 };
  }

  return {
    x: state.dashDirX * STAMINA_ACTIONS.dash.speed,
    y: state.dashDirY * STAMINA_ACTIONS.dash.speed
  };
}

export function isBlocking(player) {
  const state = ensureActionState(player);
  return hasEquippedBlock(player) && state.blocking && !state.guardBroken && player.stamina > 0;
}

export function isDashing(player) {
  const state = ensureActionState(player);
  return state.dashing;
}

export function isDodgeInvulnerable(player) {
  const state = ensureActionState(player);
  return state.dodgeIFrameDelay <= 0 && state.dodgeIFrameTimer > 0;
}

export function isSprinting(player) {
  const state = ensureActionState(player);
  return state.sprinting;
}

export function canStartAttack(player) {
  const state = ensureActionState(player);

  if (state.dashing) return false;
  if (state.guardBroken) return false;

  return true;
}

export function applyDefensiveDamage(player, incomingDamage, log, attacker = null, world = null, now = performance.now() / 1000) {
  const state = ensureActionState(player);
  const damage = Math.max(0, Number(incomingDamage || 0));
  const thornskinActive = Number(player?.flags?.thornskinUntil || 0) > Date.now();

  if (!isBlocking(player)) {
    return {
      hpDamage: Math.ceil(damage * (thornskinActive ? 0.9 : 1)),
      staminaDamage: 0,
      blocked: false,
      guardBroken: false
    };
  }

  const bulwarkActive = isOathkeeper(player) && Number(player?.oathkeeper?.bulwarkUntil || 0) > now;
  const oathkeeperStaminaScalar = isOathkeeper(player) ? (bulwarkActive ? 0.62 : 0.78) : 1;
  const staminaDamage = Math.max(
    1,
    Math.ceil(damage * STAMINA_ACTIONS.block.staminaDamageMultiplier * oathkeeperStaminaScalar * (1-(getEquipmentStatBonuses(player).blockEfficiency||0)))
  );

  player.stamina = Math.max(0, player.stamina - staminaDamage);
  state.staminaRegenDelay = STAMINA_ACTIONS.block.regenDelay;

  if (player.stamina <= 0) {
    triggerGuardBreak(player, log);

    const result = {
      hpDamage: Math.ceil(damage * 0.75),
      staminaDamage,
      blocked: true,
      guardBroken: true
    };

    // Still call the hook so Thornbinder can react to desperate guard breaks.
    onPlayerBlockedDamage(player, result, attacker, world, log, now);

    return result;
  }

  const result = {
    hpDamage: Math.ceil(damage * (1 - Math.min(0.86, STAMINA_ACTIONS.block.damageReduction + (isOathkeeper(player) ? 0.1 : 0) + (bulwarkActive ? 0.12 : 0) + (thornskinActive ? 0.06 : 0)))),
    staminaDamage,
    blocked: true,
    guardBroken: false
  };

  onPlayerBlockedDamage(player, result, attacker, world, log, now);
  applyBlockReflect(player, result, attacker, world, log, now);

  return result;
}

function applyBlockReflect(player, result, attacker, world, log, now) {
  const bonuses = getSkillTreeBonuses(player);
  const reflectPct = Math.max(0, bonuses.blockReflectPct || 0);
  if (!reflectPct || !attacker || attacker.dead || attacker.hp <= 0) return;

  const amount = Math.max(1, Math.ceil((result.staminaDamage || 1) * reflectPct / 10));
  attacker.hp = Math.max(0, (attacker.hp || 0) - amount);
  attacker.hitFlash = Math.max(attacker.hitFlash || 0, 0.14);
  attacker.aggro = Math.max(attacker.aggro || 0, 2.4);

  if (attacker.hp <= 0) {
    attacker.dead = true;
  }

  log?.(`Radiant guard reflected ${amount} damage.`);
}

export function spendStamina(player, amount, regenDelay = 0.45) {
  ensureActionState(player);
  if(hasUnlimitedStamina(player))return true;

  const cost = Math.max(0, Number(amount || 0));

  if (player.stamina < cost) {
    return false;
  }

  player.stamina -= cost;
  player.actionState.staminaRegenDelay = Math.max(
    player.actionState.staminaRegenDelay,
    regenDelay
  );

  clampStamina(player);
  return true;
}

// -----------------------------------------------------------------------------
// DASH
// -----------------------------------------------------------------------------

function tryStartDash(player, input, now, log) {
  const state = ensureActionState(player);

  if (state.dashing) return false;
  if (state.dashCooldown > 0) return false;
  if (state.blocking) return false;
  if (state.guardBroken) return false;

  const treeBonuses = getSkillTreeBonuses(player);
  const dashCost = STAMINA_ACTIONS.dash.staminaCost * (1 - .15 * attributeHandling(player,'dexterity')) * (1 - Math.max(0, treeBonuses.dodgeCostReductionPct || 0) / 100) * (1-(getEquipmentStatBonuses(player).dodgeCostReduction||0));

  if (player.stamina < dashCost) {
    log?.('Not enough stamina to dash.');
    return false;
  }

  const dir = getDashDirection(player, input);

  if (!spendStamina(player, dashCost, STAMINA_ACTIONS.dash.regenDelay)) {
    return false;
  }

  state.dashing = true;
  state.dashTimer = STAMINA_ACTIONS.dash.duration;
  state.dashCooldown = STAMINA_ACTIONS.dash.cooldown;
  state.dodgeIFrameDelay = STAMINA_ACTIONS.dash.iframeDelay;
  state.dodgeIFrameTimer = STAMINA_ACTIONS.dash.iframeDuration;
  state.dashDirX = dir.x;
  state.dashDirY = dir.y;
  state.lastDashTime = now || 0;

  // A successful stamina dodge cracks elite ice using the usual cost and window.
  if(player.eliteFrozenUntil>now){player.eliteFrozenUntil=0;player.eliteFrost=0;player.eliteFrostRecoveryUntil=now+7;}

  onPlayerDash(player, now || performance.now() / 1000);

  return true;
}

function updateDash(player, dt) {
  const state = ensureActionState(player);

  if (!state.dashing) return;

  state.dashTimer -= dt;

  if (state.dashTimer <= 0) {
    state.dashing = false;
    state.dashTimer = 0;
  }
}

function getDashDirection(player, input) {
  let x = Number(input?.moveX || 0);
  let y = Number(input?.moveY || 0);

  if (!x && !y) {
    x = Number(player.dirX || 0);
    y = Number(player.dirY ?? 1);
  }

  const length = Math.hypot(x, y) || 1;

  return {
    x: x / length,
    y: y / length
  };
}

// -----------------------------------------------------------------------------
// BLOCK
// -----------------------------------------------------------------------------

function updateBlock(player, wantsBlock, dt, now, log) {
  const state = ensureActionState(player);

  if (state.dashing) {
    state.blocking = false;
    return;
  }

  if (state.guardBroken) {
    state.blocking = false;
    return;
  }

  if (!wantsBlock) {
    state.blocking = false;
    return;
  }

  if (player.stamina < STAMINA_ACTIONS.block.minStamina) {
    state.blocking = false;
    return;
  }

  state.blocking = true;
  state.lastBlockTime = now || 0;

  const bonuses = getSkillTreeBonuses(player);
  const reduction = Math.max(0, Math.min(0.5, (bonuses.blockCostReductionPct || 0) / 100));
  const drain = hasUnlimitedStamina(player)?0:STAMINA_ACTIONS.block.staminaPerSecond * (1 - reduction) * dt;
  player.stamina = Math.max(0, player.stamina - drain);
  state.staminaRegenDelay = Math.max(
    state.staminaRegenDelay,
    STAMINA_ACTIONS.block.regenDelay
  );

  if (player.stamina <= 0) {
    triggerGuardBreak(player, log);
  }
}

function triggerGuardBreak(player, log) {
  const state = ensureActionState(player);

  state.blocking = false;
  state.guardBroken = true;
  state.guardBreakTimer = STAMINA_ACTIONS.block.guardBreakDuration;
  state.staminaRegenDelay = STAMINA_ACTIONS.block.regenDelay;

  log?.('Guard broken.');
}

// -----------------------------------------------------------------------------
// SPRINT
// -----------------------------------------------------------------------------

function updateSprint(player, wantsSprint, dt) {
  const state = ensureActionState(player);

  if (state.dashing || state.blocking || state.guardBroken) {
    state.sprinting = false;
    return;
  }

  if (!wantsSprint) {
    state.sprinting = false;
    return;
  }

  if (player.stamina < STAMINA_ACTIONS.sprint.minStamina) {
    state.sprinting = false;
    return;
  }

  state.sprinting = true;

  const drain = hasUnlimitedStamina(player)?0:STAMINA_ACTIONS.sprint.staminaPerSecond * dt;
  player.stamina = Math.max(0, player.stamina - drain);
  state.staminaRegenDelay = Math.max(
    state.staminaRegenDelay,
    STAMINA_ACTIONS.sprint.regenDelay
  );

  if (player.stamina <= 0) {
    state.sprinting = false;
  }
}

// -----------------------------------------------------------------------------
// STAMINA REGEN / TIMERS
// -----------------------------------------------------------------------------

function updateStaminaRegen(player, dt) {
  const state = ensureActionState(player);

  if (state.staminaRegenDelay > 0) return;
  if (state.sprinting) return;
  if (state.blocking) return;
  if (state.dashing) return;

  const campPrepared = Number(player.flags?.campPreparedUntil || 0) > Date.now();
  const preparationMultiplier = campPrepared ? 1.15 : 1;

  player.stamina = Math.min(
    player.maxStamina,
    player.stamina + STAMINA_ACTIONS.regen.staminaPerSecond * preparationMultiplier * dt
  );
}

function updateTimers(state, dt) {
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  state.dodgeIFrameDelay = Math.max(0, state.dodgeIFrameDelay - dt);
  if (state.dodgeIFrameDelay <= 0) {
    state.dodgeIFrameTimer = Math.max(0, state.dodgeIFrameTimer - dt);
  }
  state.staminaRegenDelay = Math.max(0, state.staminaRegenDelay - dt);
  state.guardBreakTimer = Math.max(0, state.guardBreakTimer - dt);
}

function clampStamina(player) {
  player.stamina = Math.max(0, Math.min(player.maxStamina || 100, player.stamina || 0));
}
