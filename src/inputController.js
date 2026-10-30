// inputController.js
// Gamepad/controller input normalization for Runalis.
//
// Goal:
// - Every connected controller can control gameplay and UI.
// - Controller input is normalized into one predictable object.
// - Menus are operated with the D-pad, A, B, Start, and Back.
// - Gameplay movement is handled by the left stick.
// - Right Trigger, Y, X, Left Bumper and Left Trigger map to five ability slots (RT, Y, X, LB, LT).
// - Right Bumper taps attack with the primary weapon; holding charges its heavy attack.
// - Typing names can still be done with keyboard.

const BUTTON = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  LEFT_STICK: 10,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15
};

const DEADZONE = 0.22;
const RIGHT_STICK_AIM_DEADZONE = 0.28;
const LEFT_STICK_AIM_FALLBACK_THRESHOLD = 0.25;
const TRIGGER_THRESHOLD = 0.35;
const MAX_CONTROLLERS = 4;

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function createControllerManager() {
  return {
    slots: Array.from({ length: MAX_CONTROLLERS }, (_, index) => createSlot(index)),
    supported: typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
  };
}

export function updateControllerManager(manager) {
  if (!manager?.supported) return manager;

  const pads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (const slot of manager.slots) {
    const pad = pads?.[slot.index] || null;

    slot.connected = !!pad;
    slot.id = pad?.id || null;

    slot.prevButtons = slot.buttons;
    slot.prevAxes = slot.axes;

    slot.buttons = pad ? readButtons(pad) : [];
    slot.axes = pad ? readAxes(pad) : [0, 0, 0, 0];
  }

  return manager;
}

export function getControllerInput(manager, slotIndex = 0) {
  const slot = manager?.slots?.[slotIndex] || createSlot(slotIndex);
  const axes = slot.axes || [0, 0, 0, 0];

  // Gameplay movement is LEFT STICK ONLY.
  // D-pad is reserved for menus/dialogue/UI navigation.
  let moveX = applyDeadzone(axes[0] || 0);
  let moveY = applyDeadzone(axes[1] || 0);
  const leftStickMagnitude = Math.hypot(moveX, moveY);

  if (moveX || moveY) {
    const magnitude = Math.hypot(moveX, moveY) || 1;
    moveX /= magnitude;
    moveY /= magnitude;
  }

  const rightStick = normalizeStick(axes[2] || 0, axes[3] || 0, RIGHT_STICK_AIM_DEADZONE);
  const hasRightStickAim = rightStick.active;
  const hasMoveAim = leftStickMagnitude > LEFT_STICK_AIM_FALLBACK_THRESHOLD;
  const finalAimX = hasRightStickAim ? rightStick.x : hasMoveAim ? moveX : 0;
  const finalAimY = hasRightStickAim ? rightStick.y : hasMoveAim ? moveY : 0;
  const aimSource = hasRightStickAim ? 'rightStick' : hasMoveAim ? 'leftStick' : 'none';

  // UI navigation is D-PAD ONLY.
  // Do not use left stick for menus.
  const upPressed = pressed(slot, BUTTON.UP);
  const downPressed = pressed(slot, BUTTON.DOWN);
  const leftPressed = pressed(slot, BUTTON.LEFT);
  const rightPressed = pressed(slot, BUTTON.RIGHT);

  const upHeld = held(slot, BUTTON.UP);
  const downHeld = held(slot, BUTTON.DOWN);
  const leftHeld = held(slot, BUTTON.LEFT);
  const rightHeld = held(slot, BUTTON.RIGHT);

  const confirmPressed = pressed(slot, BUTTON.A);
  const confirmReleased = released(slot, BUTTON.A);
  const cancelPressed = pressed(slot, BUTTON.B);
  const pausePressed = pressed(slot, BUTTON.START);
  const backPressed = pressed(slot, BUTTON.BACK);

  return {
    slotIndex,
    connected: !!slot.connected,
    id: slot.id,

    // Movement / aim
    moveX,
    moveY,
    aimX: finalAimX,
    aimY: finalAimY,
    hasAim: hasRightStickAim || hasMoveAim,
    aimSource,
    leftStickMagnitude,
    rightStickMagnitude: rightStick.magnitude,
    rightStickActive: hasRightStickAim,
    rightStickAimX: hasRightStickAim ? rightStick.x : 0,
    rightStickAimY: hasRightStickAim ? rightStick.y : 0,
    rawRightStickX: Number(axes[2] || 0),
    rawRightStickY: Number(axes[3] || 0),

    // World map only: retain stick deflection for precise cursor movement.
    mapCursorX: hasRightStickAim ? rightStick.x*Math.min(1,rightStick.magnitude) : moveX*Math.min(1,leftStickMagnitude),
    mapCursorY: hasRightStickAim ? rightStick.y*Math.min(1,rightStick.magnitude) : moveY*Math.min(1,leftStickMagnitude),
    mapZoomOutHeld: held(slot, BUTTON.LT),
    mapZoomInHeld: held(slot, BUTTON.RT),

    // Universal UI controls
    confirmPressed,
    confirmHeld: held(slot, BUTTON.A),
    confirmReleased,

    cancelPressed,
    cancelHeld: held(slot, BUTTON.B),

    pausePressed,
    pauseHeld: held(slot, BUTTON.START),

    backPressed,
    backHeld: held(slot, BUTTON.BACK),

    // D-pad UI navigation
    upPressed,
    downPressed,
    leftPressed,
    rightPressed,

    upHeld,
    downHeld,
    leftHeld,
    rightHeld,

    // D-pad is spatial navigation; bumpers switch tabs, triggers switch sheets.
    menuPreviousPressed: leftPressed,
    menuNextPressed: rightPressed,
    tabLeftPressed: pressed(slot, BUTTON.LB),
    tabRightPressed: pressed(slot, BUTTON.RB),

    pageLeftPressed: pressed(slot, BUTTON.LT),
    pageRightPressed: pressed(slot, BUTTON.RT),

    // Gameplay controls
    interactPressed: confirmPressed,

    attackPressed: pressed(slot, BUTTON.RB),
    attackHeld: held(slot, BUTTON.RB),
    attackReleased: released(slot, BUTTON.RB),

    sprintHeld: held(slot, BUTTON.LEFT_STICK),

    blockHeld: false,

    dashPressed: cancelPressed,

    // Five equippable abilities; LT starts with Block.
    // RT is the swappable first hotbar ability.
    // Y is the second class ability.
    // X is the replaceable tree-earned / bloodline ability.
    // A remains dedicated to interaction and menu confirmation.
    ability0Pressed: pressed(slot, BUTTON.RT),
    ability0Held: held(slot, BUTTON.RT),
    ability0Released: released(slot, BUTTON.RT),
    ability1Pressed: pressed(slot, BUTTON.Y),
    ability1Held: held(slot, BUTTON.Y),
    ability1Released: released(slot, BUTTON.Y),
    ability2Pressed: pressed(slot, BUTTON.X),
    ability2Held: held(slot, BUTTON.X),
    ability2Released: released(slot, BUTTON.X),
    ability3Pressed: pressed(slot, BUTTON.LB),
    ability3Held: held(slot, BUTTON.LB),
    ability3Released: released(slot, BUTTON.LB),
    ability4Pressed: pressed(slot, BUTTON.LT),
    ability4Held: held(slot, BUTTON.LT),
    ability4Released: released(slot, BUTTON.LT),

    customizePressed: backPressed,

    // Hold Start + Back to drop Player 2 out.
    dropOutPressed: backPressed && held(slot, BUTTON.START),

    // Extra raw button aliases for future menus/gameplay.
    xPressed: pressed(slot, BUTTON.X),
    xHeld: held(slot, BUTTON.X),
    yPressed: pressed(slot, BUTTON.Y),
    yHeld: held(slot, BUTTON.Y),
    lbPressed: pressed(slot, BUTTON.LB),
    rbPressed: pressed(slot, BUTTON.RB),
    ltPressed: pressed(slot, BUTTON.LT),
    rtPressed: pressed(slot, BUTTON.RT)
  };
}

export function getAllControllerInputs(manager) {
  const slots = manager?.slots || [];

  return slots.map(slot => {
    return getControllerInput(manager, slot.index);
  });
}

export function getConnectedControllerInputs(manager) {
  return getAllControllerInputs(manager).filter(input => input.connected);
}

export function resolveControllerPlayerAssignments(inputs, preferredHostSlotIndex = null) {
  const connected = (Array.isArray(inputs) ? inputs : [])
    .filter(input => input?.connected && Number.isFinite(Number(input.slotIndex)))
    .slice()
    .sort((a, b) => Number(a.slotIndex) - Number(b.slotIndex));

  const preferredSlot = preferredHostSlotIndex == null ? NaN : Number(preferredHostSlotIndex);
  const player1 = Number.isFinite(preferredSlot)
    ? connected.find(input => Number(input.slotIndex) === preferredSlot) || null
    : connected[0] || null;

  return {
    player1,
    additionalPlayers: connected.filter(input => Number(input.slotIndex) !== (player1 ? Number(player1.slotIndex) : preferredSlot))
  };
}

export function getFirstActiveControllerInput(manager) {
  const inputs = getConnectedControllerInputs(manager);

  return inputs[0] || getControllerInput(manager, 0);
}

export function anyControllerPressed(manager, predicate) {
  const inputs = getConnectedControllerInputs(manager);

  for (const input of inputs) {
    if (predicate(input)) return input;
  }

  return null;
}

export function createDialogueInputFromController(input) {
  return {
    controller: true,
    inputDevice: 'controller',
    confirmPressed: !!input?.confirmPressed,
    confirmHeld: !!input?.confirmHeld,
    confirmReleased: !!input?.confirmReleased,
    cancelPressed: !!input?.cancelPressed,
    upPressed: !!input?.upPressed,
    downPressed: !!input?.downPressed,
    historyPressed: !!input?.backPressed,
    justPressed: {
      ArrowUp: !!input?.upPressed,
      ArrowDown: !!input?.downPressed,
      ArrowLeft: !!input?.leftPressed,
      ArrowRight: !!input?.rightPressed,

      Enter: !!input?.confirmPressed,
      Space: !!input?.confirmPressed,
      KeyE: !!input?.confirmPressed,
      e: !!input?.confirmPressed,

      Escape: !!input?.cancelPressed,
      esc: !!input?.cancelPressed
    }
  };
}

export function createMenuInputFromController(input) {
  return {
    connected: !!input?.connected,
    slotIndex: input?.slotIndex ?? 0,

    confirmPressed: !!input?.confirmPressed,
    cancelPressed: !!input?.cancelPressed,
    pausePressed: !!input?.pausePressed,
    backPressed: !!input?.backPressed,

    upPressed: !!input?.upPressed,
    downPressed: !!input?.downPressed,
    leftPressed: !!input?.leftPressed,
    rightPressed: !!input?.rightPressed,

    upHeld: !!input?.upHeld,
    downHeld: !!input?.downHeld,
    leftHeld: !!input?.leftHeld,
    rightHeld: !!input?.rightHeld,

    previousPressed: !!input?.menuPreviousPressed,
    nextPressed: !!input?.menuNextPressed,
    tabLeftPressed: !!input?.tabLeftPressed,
    tabRightPressed: !!input?.tabRightPressed,
    pageLeftPressed: !!input?.pageLeftPressed,
    pageRightPressed: !!input?.pageRightPressed
  };
}

// -----------------------------------------------------------------------------
// INTERNAL SLOT / PAD READING
// -----------------------------------------------------------------------------

function createSlot(index) {
  return {
    index,
    connected: false,
    id: null,
    buttons: [],
    prevButtons: [],
    prevAxes: [0, 0, 0, 0],
    axes: [0, 0, 0, 0]
  };
}

function readButtons(pad) {
  return Array.from(pad.buttons || []).map(button => {
    return !!button?.pressed || Number(button?.value || 0) > TRIGGER_THRESHOLD;
  });
}

function readAxes(pad) {
  return [
    Number(pad.axes?.[0] || 0),
    Number(pad.axes?.[1] || 0),
    Number(pad.axes?.[2] || 0),
    Number(pad.axes?.[3] || 0)
  ];
}

function held(slot, button) {
  return !!slot.buttons?.[button];
}

function pressed(slot, button) {
  return !!slot.buttons?.[button] && !slot.prevButtons?.[button];
}

function released(slot, button) {
  return !slot.buttons?.[button] && !!slot.prevButtons?.[button];
}

function applyDeadzone(value) {
  const n = Math.max(-1, Math.min(1, Number(value || 0)));

  return Math.abs(n) < DEADZONE ? 0 : n;
}

function normalizeStick(x, y, threshold) {
  const safeX = Math.max(-1, Math.min(1, Number(x || 0)));
  const safeY = Math.max(-1, Math.min(1, Number(y || 0)));
  const magnitude = Math.hypot(safeX, safeY);

  if (!Number.isFinite(magnitude) || magnitude < threshold) {
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
