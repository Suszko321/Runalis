// combatActions.js
// Runalis stamina-based movement/defense actions.
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

const DEFAULT_ACTION_STATE = {
  sprinting: false,
  blocking: false,
  dashing: false,
  guardBroken: false,

  dashTimer: 0,
  dashCooldown: 0,
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
    speed: 420,
    duration: 0.16,
    cooldown: 0.55,
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

export function updateStaminaActions(player, input, dt, now, log) {
  const state = ensureActionState(player);

  updateTimers(state, dt);

  if (state.guardBreakTimer <= 0) {
    state.guardBroken = false;
  }

  const wantsBlock = Boolean(input?.blockHeld);
  const wantsSprint = Boolean(input?.sprintHeld);
  const wantsDash = Boolean(input?.dashPressed);

  if (wantsDash) {
    tryStartDash(player, input, now, log);
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

  if (state.blocking) {
    return 0.42;
  }

  if (state.sprinting) {
    return STAMINA_ACTIONS.sprint.speedMultiplier;
  }

  return 1;
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
  return state.blocking && !state.guardBroken && player.stamina > 0;
}

export function isDashing(player) {
  const state = ensureActionState(player);
  return state.dashing;
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

  if (!isBlocking(player)) {
    return {
      hpDamage: damage,
      staminaDamage: 0,
      blocked: false,
      guardBroken: false
    };
  }

  const staminaDamage = Math.max(
    1,
    Math.ceil(damage * STAMINA_ACTIONS.block.staminaDamageMultiplier)
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
    hpDamage: Math.ceil(damage * (1 - STAMINA_ACTIONS.block.damageReduction)),
    staminaDamage,
    blocked: true,
    guardBroken: false
  };

  onPlayerBlockedDamage(player, result, attacker, world, log, now);

  return result;
}

export function spendStamina(player, amount, regenDelay = 0.45) {
  ensureActionState(player);

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

  if (player.stamina < STAMINA_ACTIONS.dash.staminaCost) {
    log?.('Not enough stamina to dash.');
    return false;
  }

  const dir = getDashDirection(player, input);

  if (!spendStamina(player, STAMINA_ACTIONS.dash.staminaCost, STAMINA_ACTIONS.dash.regenDelay)) {
    return false;
  }

  state.dashing = true;
  state.dashTimer = STAMINA_ACTIONS.dash.duration;
  state.dashCooldown = STAMINA_ACTIONS.dash.cooldown;
  state.dashDirX = dir.x;
  state.dashDirY = dir.y;
  state.lastDashTime = now || 0;

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
    y = Number(player.dirY || 1);
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

  const drain = STAMINA_ACTIONS.block.staminaPerSecond * dt;
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

  const drain = STAMINA_ACTIONS.sprint.staminaPerSecond * dt;
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

  player.stamina = Math.min(
    player.maxStamina,
    player.stamina + STAMINA_ACTIONS.regen.staminaPerSecond * dt
  );
}

function updateTimers(state, dt) {
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  state.staminaRegenDelay = Math.max(0, state.staminaRegenDelay - dt);
  state.guardBreakTimer = Math.max(0, state.guardBreakTimer - dt);
}

function clampStamina(player) {
  player.stamina = Math.max(0, Math.min(player.maxStamina || 100, player.stamina || 0));
}