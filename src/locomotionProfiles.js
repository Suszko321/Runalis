// Reusable four-pose locomotion cycles for every code-drawn player actor.
//
// New classes and weapons should tune these profiles rather than adding
// renderer-specific movement branches.

export const WALK_CYCLE_PROFILES = Object.freeze({
  walk: Object.freeze({
    id: 'walk',
    phaseRate: 0.5,
    stride: 2.1,
    lift: 1.35,
    bob: 0.28,
    arm: 2.15,
    plantHold: 0.24
  }),
  run: Object.freeze({
    id: 'run',
    phaseRate: 0.72,
    stride: 3.55,
    lift: 2.45,
    bob: 0.58,
    arm: 3.45,
    plantHold: 0.16
  })
});

export const PLAYER_LOCOMOTION_PROFILES = Object.freeze({
  oathkeeper: Object.freeze({ stride: 0.78, lift: 0.72, bob: 0.66, arm: 0.68, sway: 0.52, brace: 0.72 }),
  templar: Object.freeze({ stride: 0.78, lift: 0.72, bob: 0.66, arm: 0.68, sway: 0.52, brace: 0.72 }),
  mercenary: Object.freeze({ stride: 1.06, lift: 1.04, bob: 0.96, arm: 1.06, sway: 0.9, brace: 0.15 }),
  fellhunter: Object.freeze({ stride: 1.06, lift: 1.04, bob: 0.96, arm: 1.06, sway: 0.9, brace: 0.15 }),
  necromancer: Object.freeze({ stride: 0.92, lift: 0.86, bob: 0.76, arm: 0.8, sway: 1.08, brace: 0.3 }),
  gravecaller: Object.freeze({ stride: 0.92, lift: 0.86, bob: 0.76, arm: 0.8, sway: 1.08, brace: 0.3 }),
  thornbinder: Object.freeze({ stride: 1, lift: 0.96, bob: 0.9, arm: 0.94, sway: 1.12, brace: 0.18 }),
  waverider: Object.freeze({ stride: 1.02, lift: 0.94, bob: 0.82, arm: 0.96, sway: 1.02, brace: 0.2 }),
  hydromancer: Object.freeze({ stride: 1.02, lift: 0.94, bob: 0.82, arm: 0.96, sway: 1.02, brace: 0.2 }),
  eldritch: Object.freeze({ stride: 1, lift: 0.9, bob: 0.72, arm: 0.84, sway: 0.62, brace: 0.2 }),
  default: Object.freeze({ stride: 1, lift: 1, bob: 0.9, arm: 1, sway: 0.9, brace: 0.2 })
});

export const EQUIPPED_MOVEMENT_PROFILES = Object.freeze({
  sword: Object.freeze({ carryTilt: 0.016, bob: 0.42, handTravel: 0.52 }),
  dagger: Object.freeze({ carryTilt: 0.025, bob: 0.55, handTravel: 0.68 }),
  bow: Object.freeze({ carryTilt: 0.008, bob: 0.28, handTravel: 0.34 }),
  scythe: Object.freeze({ carryTilt: 0.026, bob: 0.2, handTravel: 0.28 }),
  staff: Object.freeze({ carryTilt: 0.022, bob: 0.23, handTravel: 0.32 }),
  eldritch: Object.freeze({ carryTilt: 0.032, bob: 0.32, handTravel: 0.44 }),
  unarmed: Object.freeze({ carryTilt: 0, bob: 0, handTravel: 0.72 })
});

const KEY_POSES = Object.freeze([
  Object.freeze({ frontStride: 1, backStride: -1, frontLift: 0, backLift: 0, contact: 0 }),
  Object.freeze({ frontStride: 0.28, backStride: -0.18, frontLift: 0, backLift: 1, contact: -1 }),
  Object.freeze({ frontStride: -1, backStride: 1, frontLift: 0, backLift: 0, contact: 1 }),
  Object.freeze({ frontStride: -0.18, backStride: 0.28, frontLift: 1, backLift: 0, contact: -1 })
]);

export function sampleLocomotionCycle(mode, walkTime, direction, classId = 'default', weaponType = 'unarmed') {
  const cycle = WALK_CYCLE_PROFILES[mode] || WALK_CYCLE_PROFILES.walk;
  const normalizedClassId = classId === 'templar' ? 'oathkeeper' : classId;
  const classProfile = PLAYER_LOCOMOTION_PROFILES[normalizedClassId] || PLAYER_LOCOMOTION_PROFILES.default;
  const weapon = EQUIPPED_MOVEMENT_PROFILES[weaponType] || EQUIPPED_MOVEMENT_PROFILES.unarmed;
  const rawPhase = positiveModulo(Number(walkTime || 0) * cycle.phaseRate, 4);
  const keyIndex = Math.floor(rawPhase);
  const nextIndex = (keyIndex + 1) % 4;
  const local = smoothStep(applyPlantHold(rawPhase - keyIndex, cycle.plantHold));
  const from = KEY_POSES[keyIndex];
  const to = KEY_POSES[nextIndex];
  const frontStride = lerp(from.frontStride, to.frontStride, local) * cycle.stride * classProfile.stride;
  const backStride = lerp(from.backStride, to.backStride, local) * cycle.stride * classProfile.stride;
  const frontLift = lerp(from.frontLift, to.frontLift, local) * cycle.lift * classProfile.lift;
  const backLift = lerp(from.backLift, to.backLift, local) * cycle.lift * classProfile.lift;
  const sideFacing = Math.abs(Number(direction?.x || 0)) > Math.abs(Number(direction?.y || 0)) * 1.15;
  const diagonal = Math.abs(Number(direction?.x || 0)) > 0.25 && Math.abs(Number(direction?.y || 0)) > 0.25;
  const strideSignal = (frontStride - backStride) * 0.5;
  const contactIndex = rawPhase < 0.42 || rawPhase > 3.58 ? 0 : rawPhase > 1.58 && rawPhase < 2.42 ? 1 : -1;

  return {
    gaitPhase: rawPhase,
    gaitKey: keyIndex,
    contactIndex,
    sideFacing,
    diagonal,
    frontLegStride: frontStride,
    backLegStride: backStride,
    frontFootLift: frontLift,
    backFootLift: backLift,
    step: strideSignal,
    bob: Math.abs(Math.sin(rawPhase * Math.PI)) * cycle.bob * classProfile.bob,
    armSwing: -strideSignal * (cycle.arm / Math.max(1, cycle.stride)) * classProfile.arm,
    torsoShift: Math.sin(rawPhase * Math.PI) * (sideFacing ? 0.34 : 0.22) * classProfile.stride,
    torsoCounter: -strideSignal * 0.007 * classProfile.arm,
    cloakSway: -strideSignal * 0.22 * classProfile.sway,
    hairBounce: Math.max(frontLift, backLift) * 0.14,
    weaponRotation: strideSignal * weapon.carryTilt,
    weaponOffsetY: -Math.max(frontLift, backLift) * weapon.bob * 0.2,
    weaponHandTravel: -strideSignal * weapon.handTravel * 0.32,
    brace: classProfile.brace
  };
}

export function getLocomotionContactIndex(mode, walkTime) {
  return sampleLocomotionCycle(mode, walkTime, { x: 1, y: 0 }).contactIndex;
}

function applyPlantHold(value, hold) {
  const safeHold = Math.max(0, Math.min(0.4, Number(hold || 0)));
  if (value <= safeHold) return 0;
  if (value >= 1 - safeHold) return 1;
  return (value - safeHold) / Math.max(0.001, 1 - safeHold * 2);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function smoothStep(value) {
  const t = Math.max(0, Math.min(1, Number(value || 0)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
