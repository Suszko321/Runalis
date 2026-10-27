// combatAim.js
// Shared live aim resolution for cursor, touch and controller play.
//
// Priority:
// 1. Right stick, when meaningfully active.
// 2. Mouse / world-touch aim, when a caller marks pointer aim active.
// 3. Left stick movement as fallback aim.
// 4. Active charge aim / last valid combat aim.
// 5. Actor facing / south fallback.

export const RIGHT_STICK_AIM_DEADZONE = 0.28;
export const LEFT_STICK_AIM_FALLBACK_THRESHOLD = 0.25;

export function normalizeAimVector(x, y, threshold = 0.001) {
  const safeX = Number(x || 0);
  const safeY = Number(y || 0);
  const magnitude = Math.hypot(safeX, safeY);

  if (!Number.isFinite(magnitude) || magnitude <= threshold) {
    return {
      x: 0,
      y: 0,
      magnitude: 0,
      active: false
    };
  }

  return {
    x: safeX / magnitude,
    y: safeY / magnitude,
    magnitude,
    active: true
  };
}

export function resolveActorCombatAim(actor, input = {}) {
  const right = normalizeAimVector(
    input.rightStickAimX ?? input.rightStickX ?? input.rawAimX ?? (input.rightStickActive ? input.combatAimX ?? input.aimX : 0),
    input.rightStickAimY ?? input.rightStickY ?? input.rawAimY ?? (input.rightStickActive ? input.combatAimY ?? input.aimY : 0),
    RIGHT_STICK_AIM_DEADZONE
  );
  const left = normalizeAimVector(
    input.moveX,
    input.moveY,
    LEFT_STICK_AIM_FALLBACK_THRESHOLD
  );
  const mouse = resolveMouseAim(actor, input);

  let source = 'last';
  let aim = getActiveChargeAim(actor) || getLastActorAim(actor);
  let rightStickActive = false;

  if (right.active) {
    source = 'rightStick';
    aim = right;
    rightStickActive = true;
  } else if (mouse.active) {
    source = input.mobile ? 'touch' : 'mouse';
    aim = mouse;
  } else if (left.active) {
    source = 'leftStick';
    aim = left;
  }

  if (!aim.active) {
    aim = getActorFacingAim(actor);
    source = 'last';
  }

  const resolved = {
    x: aim.x,
    y: aim.y,
    source,
    rightStickMagnitude: right.magnitude,
    leftStickMagnitude: left.magnitude,
    rightStickActive,
    targetX: mouse.active && !rightStickActive ? Number(input.mouseWorldX) : null,
    targetY: mouse.active && !rightStickActive ? Number(input.mouseWorldY) : null
  };

  if (source === 'rightStick' || source === 'mouse' || source === 'touch' || source === 'leftStick') {
    actor.lastCombatAimX = resolved.x;
    actor.lastCombatAimY = resolved.y;
  }

  actor.combatAim = resolved;
  return resolved;
}

export function writeCombatAimToInput(input, actor, aim, distance = 160) {
  if (!input || !actor || !aim) return input;

  input.combatAimX = aim.x;
  input.combatAimY = aim.y;
  input.aimSource = aim.source;
  input.rightStickActive = !!aim.rightStickActive;
  input.rightStickAimX = aim.rightStickActive ? aim.x : 0;
  input.rightStickAimY = aim.rightStickActive ? aim.y : 0;
  input.rightStickMagnitude = aim.rightStickMagnitude || 0;
  input.leftStickMagnitude = aim.leftStickMagnitude || 0;
  input.hasAim = true;
  input.mobile = aim.source === 'touch';
  input.mouseAimActive = aim.source === 'mouse' || aim.source === 'touch';

  input.mouseWorldX = Number.isFinite(aim.targetX) ? aim.targetX : (actor.x || 0) + aim.x * distance;
  input.mouseWorldY = Number.isFinite(aim.targetY) ? aim.targetY : (actor.y || 0) + aim.y * distance;

  return input;
}

export function clearCombatAimInput(input) {
  if (!input) return input;

  input.combatAimX = null;
  input.combatAimY = null;
  input.aimSource = null;
  input.mouseAimActive = false;
  input.mobile = false;
  input.rightStickActive = false;
  input.rightStickAimX = input.rightStickAimY = 0;
  input.rightStickMagnitude = 0;
  input.leftStickMagnitude = 0;
  input.hasAim = false;

  return input;
}

export function applyCombatAimFacing(actor, aim, { onlyRightStick = false, onlyExplicitAim = false } = {}) {
  if (!actor || !aim) return false;
  if (onlyRightStick && aim.source !== 'rightStick') return false;
  if (onlyExplicitAim && !['rightStick','mouse','touch'].includes(aim.source)) return false;

  const resolved = normalizeAimVector(aim.x, aim.y);
  if (!resolved.active) return false;

  actor.dirX = resolved.x;
  actor.dirY = resolved.y;
  return true;
}

function getLastActorAim(actor) {
  const last = normalizeAimVector(actor?.lastCombatAimX, actor?.lastCombatAimY);
  if (last.active) return last;
  return getActorFacingAim(actor);
}

function getActiveChargeAim(actor) {
  if (!actor?.abilityCharge?.active) return null;

  const aim = normalizeAimVector(actor.abilityCharge.aimX, actor.abilityCharge.aimY);
  return aim.active ? aim : null;
}

function resolveMouseAim(actor, input) {
  if (!input?.mouseAimActive && input?.aimSource !== 'mouse') {
    return { x: 0, y: 0, magnitude: 0, active: false };
  }

  const mouseWorldX = Number(input.mouseWorldX);
  const mouseWorldY = Number(input.mouseWorldY);
  if (!Number.isFinite(mouseWorldX) || !Number.isFinite(mouseWorldY)) {
    return { x: 0, y: 0, magnitude: 0, active: false };
  }

  return normalizeAimVector(mouseWorldX - Number(actor?.x || 0), mouseWorldY - Number(actor?.y || 0));
}

function getActorFacingAim(actor) {
  const facing = normalizeAimVector(actor?.dirX, actor?.dirY);
  if (facing.active) return facing;

  return {
    x: 0,
    y: 1,
    magnitude: 1,
    active: true
  };
}
