// Visual-only key-pose animation for code-drawn humanoids.
//
// This module reads authoritative movement/combat state but never changes it.
// Pose values are intentionally stepped so actions read like animated pixel art
// without delaying input, changing hitboxes, or altering combat timing.

import { ITEMS } from './data.js';
import {classMovementProfile} from './classMovementProfiles.js';
import { getSignatureAbilityProfile } from './animationProfiles.js';
import {
  pixelSnap,
  steppedPulse,
  steppedSine,
  steppedTime
} from './visualStyle.js';
import {
  sampleAbilityChargePose,
  sampleCastReleasePose,
  sampleSignatureAbilityPose,
  sampleWeaponAttackPose
} from './playerAttackAnimation.js';
import { sampleLocomotionCycle } from './locomotionProfiles.js';

const CLASS_MOTION = Object.freeze({
  oathkeeper: Object.freeze({
    idleBob: 0.18,
    walkBob: 0.34,
    walkStep: 1.22,
    runBob: 0.54,
    runStep: 1.84,
    sway: 0.52,
    attackLean: 0.72
  }),
  templar: Object.freeze({
    idleBob: 0.18,
    walkBob: 0.34,
    walkStep: 1.22,
    runBob: 0.54,
    runStep: 1.84,
    sway: 0.52,
    attackLean: 0.72
  }),
  mercenary: Object.freeze({
    idleBob: 0.24,
    walkBob: 0.55,
    walkStep: 1.9,
    runBob: 0.9,
    runStep: 2.7,
    sway: 1.1,
    attackLean: 1.25
  }),
  fellhunter: Object.freeze({
    idleBob: 0.23,
    walkBob: 0.54,
    walkStep: 1.9,
    runBob: 0.88,
    runStep: 2.7,
    sway: 1.05,
    attackLean: 1.24
  }),
  necromancer: Object.freeze({
    idleBob: 0.32,
    walkBob: 0.38,
    walkStep: 1.35,
    runBob: 0.62,
    runStep: 1.95,
    sway: 1.35,
    attackLean: 0.72
  }),
  gravecaller: Object.freeze({
    idleBob: 0.32,
    walkBob: 0.38,
    walkStep: 1.35,
    runBob: 0.62,
    runStep: 1.95,
    sway: 1.35,
    attackLean: 0.72
  }),
  thornbinder: Object.freeze({
    idleBob: 0.3,
    walkBob: 0.5,
    walkStep: 1.6,
    runBob: 0.75,
    runStep: 2.25,
    sway: 1.55,
    attackLean: 0.85
  }),
  hydromancer: Object.freeze({
    idleBob: 0.26,
    walkBob: 0.44,
    walkStep: 1.65,
    runBob: 0.72,
    runStep: 2.35,
    sway: 1.1,
    attackLean: 0.96
  }),
  waverider: Object.freeze({
    idleBob: 0.26,
    walkBob: 0.44,
    walkStep: 1.65,
    runBob: 0.72,
    runStep: 2.35,
    sway: 1.1,
    attackLean: 0.96
  }),
  eldritch: Object.freeze({
    idleBob: 0.28,
    walkBob: 0.34,
    walkStep: 1.5,
    runBob: 0.7,
    runStep: 2.3,
    sway: 0.45,
    attackLean: 1.05
  }),
  default: Object.freeze({
    idleBob: 0.25,
    walkBob: 0.5,
    walkStep: 1.75,
    runBob: 0.8,
    runStep: 2.4,
    sway: 1,
    attackLean: 1
  })
});

const WEAPON_MOTION = Object.freeze({
  sword: Object.freeze({ anticipation: -0.14, strike: 0.22, follow: 0.12, recoil: 1.25 }),
  dagger: Object.freeze({ anticipation: -0.1, strike: 0.14, follow: 0.06, recoil: 0.8 }),
  axe: Object.freeze({ anticipation: -0.18, strike: 0.28, follow: 0.14, recoil: 1.55 }),
  mace: Object.freeze({ anticipation: -0.16, strike: 0.24, follow: 0.12, recoil: 1.65 }),
  hammer: Object.freeze({ anticipation: -0.2, strike: 0.3, follow: 0.16, recoil: 1.9 }),
  spear: Object.freeze({ anticipation: -0.1, strike: 0.18, follow: 0.08, recoil: 1.2 }),
  bow: Object.freeze({ anticipation: -0.07, strike: 0.02, follow: 0.04, recoil: 2.6 }),
  crossbow: Object.freeze({ anticipation: -0.08, strike: 0.04, follow: 0.04, recoil: 2.8 }),
  scythe: Object.freeze({ anticipation: -0.22, strike: 0.32, follow: 0.2, recoil: 1.8 }),
  staff: Object.freeze({ anticipation: -0.1, strike: 0.16, follow: 0.08, recoil: 1.15 }),
  spiritFocus: Object.freeze({ anticipation: -0.06, strike: 0.12, follow: -0.02, recoil: 0.9 }),
  eldritch: Object.freeze({ anticipation: -0.06, strike: 0.1, follow: -0.04, recoil: 0.65 }),
  unarmed: Object.freeze({ anticipation: -0.08, strike: 0.1, follow: 0.04, recoil: 0.8 })
});

export function getHumanAnimationPose(actor, options = {}) {
  const now = options.now ?? performance.now() / 1000;
  const classId = actor?.classId || options.classId || 'default';
  const classMotion = CLASS_MOTION[classId] || CLASS_MOTION.default;
  const weaponType = getActorWeaponType(actor);
  const weaponMotion = WEAPON_MOTION[weaponType] || WEAPON_MOTION.sword;
  const direction = getDirection(actor);
  const walkTime = actor?.walkTime || actor?.animTime || actor?.moveTime || 0;
  const actionState = actor?.actionState || {};
  const combatState = actor?.combatState || {};
  const moving = actor?.isMoving === undefined
    ? Boolean(options.moving)
    : !!actor.isMoving;
  const sprinting = moving && !!actionState.sprinting;
  const attacking = !!combatState.attacking && !!combatState.attackMove;
  const visualAction = getActiveVisualAction(actor, now);
  const hit = (actor?.visualHitUntil || 0) > now;
  const dead = !!actor?.dead || Number(actor?.hp ?? 1) <= 0;

  const pose = createBasePose({
    now,
    classId,
    classMotion,
    weaponType,
    direction,
    walkTime
  });

  if (dead) return applyDeathPose(pose, direction);
  if (hit) return applyHitPose(pose, direction, classId, now);
  if (actionState.dashing) return applyDashPose(pose, direction, classId);
  if (attacking) return applyAttackPose(pose, combatState, direction, classMotion, weaponMotion, classId);
  if (combatState.heavyChargeActive) return applyHeavyAttackChargePose(pose, combatState, direction, classId);
  if (actor?.abilityCharge?.active) return applyChargePose(pose, actor.abilityCharge, direction, classId);
  if (visualAction) return applyVisualActionPose(pose, visualAction, now, classId, direction);
  if (actionState.guardBroken) return applyGuardBrokenPose(pose, direction, now);
  if (actionState.blocking) return applyBlockPose(pose, direction, classId, now);
  if (sprinting) return applyRunPose(pose, walkTime, classMotion, classId, direction);
  if (moving) return applyWalkPose(pose, walkTime, classMotion, classId, direction);
  return applyIdlePose(pose, now, classMotion, classId);
}

function createBasePose(data) {
  return {
    state: 'idle',
    phase: 'hold',
    frame: Math.floor(steppedTime(data.now, 10) * 10),
    classId: data.classId,
    weaponType: data.weaponType,
    bob: 0,
    step: 0,
    gaitPhase: 0,
    gaitKey: 0,
    frontLegStride: 0,
    backLegStride: 0,
    frontFootLift: 0,
    backFootLift: 0,
    armSwing: 0,
    rootOffsetX: 0,
    rootOffsetY: 0,
    rootRotation: 0,
    rootScaleX: 1,
    rootScaleY: 1,
    weaponOffsetX: 0,
    weaponOffsetY: 0,
    weaponRotation: 0,
    weaponRecoil: 0,
    weaponGripOffsetX: 0,
    weaponGripOffsetY: 0,
    frontHandOffsetX: 0,
    frontHandOffsetY: 0,
    backHandOffsetX: 0,
    backHandOffsetY: 0,
    torsoCommitment: 0,
    trailIntensity: 0,
    castProgress: 0,
    chargeProgress: 0,
    releasePower: 0,
    castStyle: data.classId,
    cloakSway: 0,
    hairBounce: 0,
    auraPulse: 0,
    headLift: 0,
    attackProgress: 0,
    attacking: false,
    blocking: false
  };
}

function applyIdlePose(pose, now, motion, classId) {
  pose.state = 'idle';
  pose.bob = steppedSine(now, classId === 'eldritch' ? 2.1 : 1.25, motion.idleBob, 6);
  pose.cloakSway = steppedSine(now, 1.05, motion.sway * 0.45, 6, 0.8);
  pose.hairBounce = steppedSine(now, 1.25, 0.25, 6, 1.6);
  pose.auraPulse = steppedPulse(now, 0.12, 0.34, 6, 1.35);

  if (classId === 'oathkeeper' || classId === 'templar') {
    pose.rootScaleX = 1.01;
  } else if (classId === 'gravecaller' || classId === 'necromancer') {
    pose.rootOffsetY = -0.5;
    pose.armSwing = steppedSine(now, 0.9, 0.5, 5);
  } else if (classId === 'thornbinder') {
    pose.rootRotation = steppedSine(now, 0.75, 0.008, 5);
  } else if (classId === 'hydromancer' || classId === 'waverider') {
    pose.rootOffsetY = steppedSine(now, 1.1, 0.25, 6);
    pose.rootRotation = steppedSine(now, 0.9, 0.006, 6);
  } else if (classId === 'eldritch') {
    pose.rootOffsetX = steppedSine(now, 2.8, 0.5, 5);
    pose.rootRotation = steppedSine(now, 2.4, 0.012, 5);
  }

  return pose;
}

function applyWalkPose(pose, walkTime, motion, classId, direction) {
  const locomotion = sampleLocomotionCycle('walk', walkTime, direction, classId, pose.weaponType);
  pose.state = 'walk';
  pose.phase = `gait-${locomotion.gaitKey}`;
  return applyLocomotionSample(pose, locomotion, direction, classId, false);
}

function applyRunPose(pose, walkTime, motion, classId, direction) {
  const locomotion = sampleLocomotionCycle('run', walkTime, direction, classId, pose.weaponType);
  pose.state = 'run';
  pose.phase = `gait-${locomotion.gaitKey}`;
  return applyLocomotionSample(pose, locomotion, direction, classId, true);
}

function applyLocomotionSample(pose, sample, direction, classId, running) {
  pose.gaitPhase = sample.gaitPhase;
  pose.gaitKey = sample.gaitKey;
  pose.frontLegStride = sample.frontLegStride;
  pose.backLegStride = sample.backLegStride;
  pose.frontFootLift = sample.frontFootLift;
  pose.backFootLift = sample.backFootLift;
  pose.step = sample.step;
  // The old sub-half-pixel walk bob vanished when the sprite renderer rounded
  // it. A restrained one-pixel rise now reads consistently in every facing.
  pose.bob = -sample.bob * (running ? 1.5 : 2.7);
  pose.armSwing = sample.armSwing;
  pose.rootOffsetX = direction.x * sample.torsoShift * (running ? 0.58 : 0.35);
  pose.rootOffsetY = running ? -0.35 - sample.bob * 0.22 : -sample.bob * 0.08;
  // Walking needs subtle balance, not a chest-first rocking motion.
  pose.rootRotation = direction.x * sample.torsoCounter * (running ? 1 : 0.25);
  pose.rootScaleX = 1 + sample.brace * (running ? 0.016 : 0.009);
  pose.rootScaleY = 1 - sample.brace * (running ? 0.008 : 0.004);
  pose.cloakSway = sample.cloakSway * (running ? 1.12 : 0.82);
  pose.hairBounce = sample.hairBounce * (running ? 1 : 0.65);
  pose.weaponOffsetY = sample.weaponOffsetY - (running ? 0.38 : 0);
  pose.weaponRotation = direction.x * sample.weaponRotation;
  pose.frontHandOffsetX = direction.x * sample.weaponHandTravel;
  pose.backHandOffsetX = -direction.x * sample.weaponHandTravel * 0.55;

  if (classId === 'gravecaller' || classId === 'necromancer') {
    pose.rootOffsetY -= 0.5;
    pose.cloakSway *= 1.22;
  } else if (classId === 'thornbinder') {
    pose.rootRotation *= 0.72;
  } else if (classId === 'hydromancer' || classId === 'waverider') {
    pose.rootRotation *= 0.82;
    pose.cloakSway *= 1.08;
  } else if (classId === 'eldritch') {
    pose.rootOffsetX = pixelSnap(pose.rootOffsetX + direction.x * Math.sign(sample.step || 1) * 0.18, 0.5);
  }

  return pose;
}

function applyAttackPose(pose, combatState, direction, motion, weaponMotion, classId) {
  const move = combatState.attackMove || {};
  const elapsed = Math.max(0, Number(combatState.attackElapsed || 0));
  const duration = Math.max(0.001, Number(move.duration || 1));
  const attackDirection = normalizeDirection(
    combatState.attackDirX ?? direction.x,
    combatState.attackDirY ?? direction.y
  );
  const sampled = sampleWeaponAttackPose(move, pose.weaponType, elapsed, attackDirection, classId);

  pose.state = 'attack';
  pose.attacking = true;
  pose.attackProgress = keyProgress(elapsed / duration, 12);
  Object.assign(pose, sampled);
  pose.bob = sampled.heavy ? 0.5 : 0;
  pose.cloakSway = sampled.heavy ? sampled.torsoCommitment * 2.5 : sampled.torsoCommitment * 1.4;
  pose.hairBounce = sampled.heavy ? 0.8 : 0.5;
  pose.weaponRecoil = sampled.contactMoment ? weaponMotion.recoil : 0;

  if (pose.weaponType === 'bow') {
    pose.phase = sampled.phase === 'anticipation' ? 'draw' : sampled.phase === 'strike' ? 'release' : 'recover';
    pose.rootOffsetX *= 0.35;
    pose.rootOffsetY *= 0.35;
    pose.rootRotation *= 0.55;
    pose.backHandOffsetX -= attackDirection.x * (sampled.phase === 'anticipation' ? 6 : 2);
    pose.backHandOffsetY -= attackDirection.y * (sampled.phase === 'anticipation' ? 3 : 1);
  } else if (pose.weaponType === 'staff') {
    pose.weaponOffsetY -= pose.phase === 'strike' ? 2 : 0;
  } else if (pose.weaponType === 'scythe') {
    pose.cloakSway *= 1.35;
  } else if (pose.weaponType === 'spiritFocus') {
    pose.phase = sampled.phase === 'anticipation' ? 'focus' : sampled.phase === 'strike' ? 'release' : 'recover';
    pose.rootOffsetX *= 0.58;
    pose.rootOffsetY *= 0.58;
    pose.rootRotation *= 0.72;
    pose.weaponOffsetY -= sampled.phase === 'strike' ? 2 : 0;
    pose.auraPulse = sampled.phase === 'strike' ? 0.65 : 0.32;
  } else if (pose.weaponType === 'eldritch' || classId === 'eldritch') {
    pose.rootOffsetX = pixelSnap(pose.rootOffsetX, 1);
    pose.rootOffsetY = pixelSnap(pose.rootOffsetY, 1);
    pose.auraPulse = 0.8;
  }

  return pose;
}

function applyHeavyAttackChargePose(pose, combatState, direction, classId) {
  const chargeDirection = normalizeDirection(
    combatState.heavyChargeAimX ?? direction.x,
    combatState.heavyChargeAimY ?? direction.y
  );
  const progress = Math.max(
    0,
    Math.min(
      1,
      Number(combatState.heavyChargeTime || 0) / Math.max(0.001, Number(combatState.heavyChargeThreshold || 0.45))
    )
  );
  const sampled = sampleAbilityChargePose(classId, pose.weaponType, progress, chargeDirection);

  Object.assign(pose, sampled);
  pose.state = 'heavyCharge';
  pose.phase = combatState.heavyChargeReady ? 'ready' : sampled.phase || 'windup';
  pose.attacking = false;
  pose.bob = -sampled.chargeProgress * 0.55;
  pose.cloakSway = sampled.chargeProgress * (classId === 'eldritch' ? 2.3 : 1.55);
  pose.hairBounce = sampled.chargeProgress * 0.8;
  pose.weaponRecoil = 0;
  return pose;
}

function applyChargePose(pose, charge, direction, classId) {
  const sampled = sampleAbilityChargePose(classId, pose.weaponType, charge?.progress || 0, direction,charge?.animationFamily);
  Object.assign(pose, sampled);
  pose.attacking = false;
  pose.bob = -sampled.chargeProgress * 0.8;
  pose.cloakSway = sampled.chargeProgress * (classId === 'eldritch' ? 2.8 : 1.8);
  pose.hairBounce = sampled.chargeProgress;
  return pose;
}

function applyVisualActionPose(pose, visualAction, now, classId, direction) {
  pose.visualReleasePoint=Number(visualAction.releasePoint??getSignatureAbilityProfile(visualAction.abilityId)?.releasePoint??.4);
  const signaturePose = sampleSignatureAbilityPose(visualAction, now, classId, pose.weaponType, direction);
  if (signaturePose) {
    Object.assign(pose, signaturePose);
    pose.state = signaturePose.state || 'signature';
    pose.cloakSway = Number(signaturePose.torsoCommitment || signaturePose.releasePower || 0) * 2.2;
    pose.hairBounce = Number(signaturePose.torsoCommitment || signaturePose.releasePower || 0) * 0.7;
    return pose;
  }

  if (visualAction.animationFamily === 'melee' || visualAction.animationFamily === 'ranged') {
    const duration = Math.max(0.12, Number(visualAction.duration || 0.55));
    const elapsed = Math.max(0, now - Number(visualAction.startedAt ?? now));
    const ranged = visualAction.animationFamily === 'ranged';
    const chargeLevel = Math.max(0, Number(visualAction.chargeLevel || 0));
    const move = {
      id: visualAction.abilityId || 'ability_release',
      kind: ranged ? 'projectile' : 'arc',
      comboType: chargeLevel > 0 ? 'heavy' : ranged ? 'shot' : 'light',
      duration,
      activeStart: duration * Number(visualAction.releasePoint || 0.34),
      activeEnd: duration * (ranged ? 0.48 : 0.62)
    };
    const sampledAttack = sampleWeaponAttackPose(
      move,
      ranged ? 'bow' : pose.weaponType,
      elapsed,
      direction,
      classId
    );

    Object.assign(pose, sampledAttack);
    pose.state = ranged ? 'abilityShot' : 'abilityAttack';
    pose.auraPulse = 0.45 + chargeLevel * 0.22;
    pose.weaponRecoil = sampledAttack.contactMoment ? (chargeLevel >= 2 ? 2.5 : 1.5) : 0;
    pose.cloakSway = sampledAttack.torsoCommitment * (chargeLevel >= 2 ? 3 : 1.8);
    pose.hairBounce = sampledAttack.torsoCommitment * 0.7;
    return pose;
  }

  const sampled = sampleCastReleasePose(visualAction, now, classId, direction);
  Object.assign(pose, sampled);
  pose.bob = -pixelSnap(sampled.releasePower * (visualAction.kind === 'summon' ? 1.5 : 1), 0.5);
  pose.cloakSway = sampled.releasePower * (visualAction.kind === 'summon' ? 2.8 : 1.8);
  pose.hairBounce = sampled.releasePower;
  pose.headLift = sampled.releasePower;
  return pose;
}

function applyBlockPose(pose, direction, classId, now) {
  pose.state = 'block';
  pose.phase = 'hold';
  pose.blocking = true;
  pose.bob = (classId === 'oathkeeper' || classId === 'templar') ? 0.75 : 0.5;
  pose.step = 0.75;
  pose.armSwing = -1.5;
  pose.rootOffsetX = -direction.x;
  pose.rootOffsetY = 1;
  pose.rootScaleX = (classId === 'oathkeeper' || classId === 'templar') ? 1.04 : 1.02;
  pose.rootScaleY = 0.98;
  pose.weaponRotation = -direction.x * 0.04;
  pose.auraPulse = steppedPulse(now, 0.2, 0.42, 5, 2);
  return pose;
}

function applyGuardBrokenPose(pose, direction, now) {
  pose.state = 'guardBroken';
  pose.phase = 'stagger';
  pose.bob = 1.5;
  pose.step = -1;
  pose.armSwing = 3;
  pose.rootOffsetX = -direction.x * 2;
  pose.rootOffsetY = 2;
  pose.rootRotation = -direction.x * 0.08 + steppedSine(now, 18, 0.018, 10);
  pose.weaponRotation = -direction.x * 0.12;
  pose.cloakSway = 1.5;
  return pose;
}

function applyDashPose(pose, direction, classId) {
  pose.state = 'dash';
  pose.phase = 'burst';
  pose.bob = -1;
  pose.step = 2.5;
  pose.armSwing = -2.5;
  pose.rootOffsetX = direction.x * 2;
  pose.rootOffsetY = direction.y * 1.5;
  pose.rootRotation = direction.x * (classId === 'eldritch' ? 0.1 : 0.06);
  pose.rootScaleX = Math.abs(direction.x) > 0.5 ? 1.06 : 0.98;
  pose.rootScaleY = Math.abs(direction.y) > 0.5 ? 1.04 : 0.97;
  pose.weaponOffsetX = -direction.x * 2;
  pose.weaponOffsetY = 1;
  pose.weaponRotation = -direction.x * 0.08;
  pose.cloakSway = -direction.x * 3;
  pose.hairBounce = 1.25;
  pose.auraPulse = classId === 'eldritch' ? 0.9 : 0.25;
  const identity=classMovementProfile(classId);
  if(identity){pose.bob=identity.bob;pose.rootRotation=direction.x*identity.lean;pose.armSwing=identity.arm;pose.cloakSway=-direction.x*identity.cloak;pose.rootScaleX=pose.rootScaleY=1;}
  return pose;
}

function applyHitPose(pose, direction, classId, now) {
  pose.state = 'hit';
  pose.phase = 'impact';
  pose.bob = 1;
  pose.step = -1;
  pose.armSwing = 2.5;
  pose.rootOffsetX = -direction.x * 2.5;
  pose.rootOffsetY = -direction.y + 1;
  pose.rootRotation = -direction.x * 0.09 + steppedSine(now, 20, 0.015, 12);
  pose.rootScaleX = 1.025;
  pose.rootScaleY = 0.975;
  pose.weaponOffsetX = -direction.x * 1.5;
  pose.weaponRotation = -direction.x * 0.12;
  pose.cloakSway = 2;
  pose.auraPulse = classId === 'eldritch' ? 0.7 : 0;
  return pose;
}

function applyDeathPose(pose, direction) {
  pose.state = 'death';
  pose.phase = 'hold';
  pose.bob = 4;
  pose.step = 2;
  pose.armSwing = 4;
  pose.rootOffsetX = -direction.x * 5;
  pose.rootOffsetY = 9;
  pose.rootRotation = direction.x >= 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
  pose.rootScaleX = 1.04;
  pose.rootScaleY = 0.9;
  pose.weaponOffsetY = 3;
  pose.weaponRotation = -direction.x * 0.2;
  pose.cloakSway = 2;
  return pose;
}

function getActiveVisualAction(actor, now) {
  const action = actor?.visualAction;
  if (!action || !Number.isFinite(action.startedAt)) return null;
  return now <= action.startedAt + Math.max(0.1, action.duration || 0.5) ? action : null;
}

function getActorWeaponType(actor) {
  const weaponRef = actor?.equipment?.weapon;
  const weaponId = typeof weaponRef === 'string' ? weaponRef : weaponRef?.id;
  if (!weaponId) return 'unarmed';

  const item = ITEMS[weaponId] || {};
  const explicit = normalizeWeaponType(item.weaponType);
  if (WEAPON_MOTION[explicit]) return explicit;

  const text = `${weaponId} ${item.name || ''}`.toLowerCase();
  if (text.includes('crossbow')) return 'crossbow';
  if (text.includes('dagger') || text.includes('knife')) return 'dagger';
  if (text.includes('axe')) return 'axe';
  if (text.includes('mace')) return 'mace';
  if (text.includes('hammer') || text.includes('maul')) return 'hammer';
  if (text.includes('spear') || text.includes('lance') || text.includes('pike')) return 'spear';
  if (text.includes('bow')) return 'bow';
  if (text.includes('staff') || text.includes('wand')) return 'staff';
  if (text.includes('focus') || text.includes('dawnlens') || text.includes('prism') || text.includes('reliquary') || text.includes('gauntlet')) return 'spiritFocus';
  if (text.includes('scythe') || text.includes('crescent')) return 'scythe';
  if (text.includes('eldritch') || text.includes('conduit') || text.includes('starless')) return 'eldritch';
  return 'sword';
}

function normalizeWeaponType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'spiritfocus' || normalized === 'focus' || normalized === 'spirit_focus') return 'spiritFocus';
  if (normalized === 'blade') return 'sword';
  if (normalized === 'knife') return 'dagger';
  if (normalized === 'maul') return 'hammer';
  return normalized;
}

function getDirection(actor) {
  return normalizeDirection(actor?.dirX ?? 0, actor?.dirY ?? 1);
}

function normalizeDirection(x, y) {
  const length = Math.hypot(x || 0, y || 0);
  if (length < 0.01) return { x: 0, y: 1 };
  return { x: (x || 0) / length, y: (y || 0) / length };
}

function facingSign(direction) {
  return direction.x < -0.1 ? -1 : 1;
}

function keyProgress(value, fps) {
  return clamp01(steppedTime(clamp01(value), fps));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}
