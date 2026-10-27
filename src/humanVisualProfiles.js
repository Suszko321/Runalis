// humanVisualProfiles.js
// Small, gameplay-neutral posture profiles for code-drawn humanoids.
//
// Values here only affect rendering. They do not change collision, attack
// reach, movement speed, equipment, or saved player data.

const DEFAULT_PROFILE = Object.freeze({
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  sideLean: 0,
  shoulderBias: 0,
  stanceWidth: 0,
  headLift: 0,
  outlineAlpha: 1
});

const CLASS_POSTURES = Object.freeze({
  oathkeeper: Object.freeze({
    scaleX: 1.035,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0.25,
    sideLean: 0,
    shoulderBias: 1.2,
    stanceWidth: 1.25,
    headLift: 0,
    outlineAlpha: 1
  }),
  templar: Object.freeze({
    scaleX: 1.025,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
    sideLean: 0,
    shoulderBias: 1,
    stanceWidth: 1,
    headLift: 0,
    outlineAlpha: 1
  }),
  mercenary: Object.freeze({
    scaleX: 1,
    scaleY: 0.995,
    offsetX: 0,
    offsetY: 0.25,
    sideLean: 0.018,
    shoulderBias: 0.5,
    stanceWidth: 1,
    headLift: 0,
    outlineAlpha: 1
  }),
  fellhunter: Object.freeze({
    scaleX: 1,
    scaleY: 0.995,
    offsetX: 0,
    offsetY: 0.25,
    sideLean: 0.018,
    shoulderBias: 0.5,
    stanceWidth: 1,
    headLift: 0,
    outlineAlpha: 1
  }),
  necromancer: Object.freeze({
    scaleX: 0.99,
    scaleY: 1.01,
    offsetX: 0,
    offsetY: -0.5,
    sideLean: -0.012,
    shoulderBias: -0.5,
    stanceWidth: 0,
    headLift: 0,
    outlineAlpha: 0.98
  }),
  gravecaller: Object.freeze({
    scaleX: 0.99,
    scaleY: 1.01,
    offsetX: 0,
    offsetY: -0.5,
    sideLean: -0.012,
    shoulderBias: -0.5,
    stanceWidth: 0,
    headLift: 0,
    outlineAlpha: 0.98
  }),
  thornbinder: Object.freeze({
    scaleX: 0.985,
    scaleY: 1.01,
    offsetX: 0,
    offsetY: -0.5,
    sideLean: -0.008,
    shoulderBias: -0.5,
    stanceWidth: 0,
    headLift: 0,
    outlineAlpha: 0.98
  }),
  waverider: Object.freeze({
    scaleX: 0.995,
    scaleY: 1.005,
    offsetX: 0,
    offsetY: -0.25,
    sideLean: 0.008,
    shoulderBias: 0,
    stanceWidth: 0.5,
    headLift: 0,
    outlineAlpha: 1
  }),
  hydromancer: Object.freeze({
    scaleX: 0.995,
    scaleY: 1.005,
    offsetX: 0,
    offsetY: -0.25,
    sideLean: 0.008,
    shoulderBias: 0,
    stanceWidth: 0.5,
    headLift: 0,
    outlineAlpha: 1
  }),
  eldritch: Object.freeze({
    scaleX: 0.99,
    scaleY: 1.015,
    offsetX: 0,
    offsetY: -0.75,
    sideLean: -0.018,
    shoulderBias: 0,
    stanceWidth: 0,
    headLift: 0,
    outlineAlpha: 1
  })
});

export function getHumanVisualProfile(actor, options = {}, facing = 'down') {
  const classId = normalizeClassId(options.classId || actor?.classId || null);
  const bodyType = options.bodyType || actor?.bodyType || actor?.appearance?.bodyType || 'male';
  const classProfile = CLASS_POSTURES[classId] || DEFAULT_PROFILE;
  const isSide = facing === 'left' || facing === 'right';
  const side = facing === 'left' ? -1 : 1;
  const bodyScaleX = bodyType === 'female' ? 0.985 : 1;

  return {
    ...classProfile,
    scaleX: classProfile.scaleX * bodyScaleX,
    rotation: isSide ? classProfile.sideLean * side : 0,
    isPlayer: !!options.isPlayer
  };
}

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

export function applyHumanVisualProfile(ctx, profile) {
  if (!ctx || !profile) return;
  ctx.translate(profile.offsetX || 0, profile.offsetY || 0);
  if (profile.rotation) ctx.rotate(profile.rotation);
  ctx.scale(profile.scaleX || 1, profile.scaleY || 1);
}
