// Visual-only attack and cast pose sampling for code-drawn player models.
// Combat timing remains authoritative in combatMoves.js and combat.js.

import { getSignatureAbilityProfile } from './animationProfiles.js';

const ATTACK_FAMILIES = Object.freeze({
  maceForehand: {
    anticipation:{angle:-1.08,forward:-2.4,lift:-2,handSweep:-6,handLift:-6,brace:.65},
    contact:{angle:.92,forward:5.4,lift:1,handSweep:8,handLift:2,brace:1.35},
    follow:{angle:1.25,forward:3,lift:2,handSweep:9,handLift:4,brace:1}
  },
  maceBackhand: {
    anticipation:{angle:1.05,forward:-2,lift:1,handSweep:6,handLift:2,brace:.65},
    contact:{angle:-.92,forward:5,lift:.4,handSweep:-8,handLift:-3,brace:1.25},
    follow:{angle:-1.25,forward:2.6,lift:-1,handSweep:-9,handLift:-5,brace:1}
  },
  maceSlam: {
    anticipation:{angle:-1.6,forward:-3,lift:-8,handSweep:-4,handLift:-12,brace:.9},
    contact:{angle:.18,forward:5.5,lift:4,handSweep:3,handLift:6,brace:1.6},
    follow:{angle:.38,forward:3,lift:5,handSweep:4,handLift:8,brace:1.2}
  },
  slash: {
    anticipation: { angle: -0.82, forward: -1.4, lift: -1.2, handSweep: -4, handLift: -5, brace: 0.35 },
    contact: { angle: 0.68, forward: 4.2, lift: 0.8, handSweep: 6, handLift: 1, brace: 1 },
    follow: { angle: 1.0, forward: 2.2, lift: 1.2, handSweep: 8, handLift: 4, brace: 0.72 }
  },
  reverseSlash: {
    anticipation: { angle: 0.78, forward: -1.2, lift: 0.2, handSweep: 5, handLift: 2, brace: 0.32 },
    contact: { angle: -0.72, forward: 4, lift: 0.6, handSweep: -6, handLift: -2, brace: 0.96 },
    follow: { angle: -1.0, forward: 2, lift: -0.5, handSweep: -8, handLift: -4, brace: 0.66 }
  },
  heavySlash: {
    anticipation: { angle: -1.22, forward: -2.8, lift: -4, handSweep: -7, handLift: -8, brace: 0.62 },
    contact: { angle: 0.82, forward: 6.2, lift: 1.4, handSweep: 8, handLift: 2, brace: 1.35 },
    follow: { angle: 1.28, forward: 3.4, lift: 3, handSweep: 10, handLift: 6, brace: 1.05 }
  },
  scytheSweep: {
    anticipation: { angle: -1.38, forward: -3.2, lift: -4.5, handSweep: -8, handLift: -8, brace: 0.76 },
    contact: { angle: 0.92, forward: 6.8, lift: 1.2, handSweep: 9, handLift: 1, brace: 1.42 },
    follow: { angle: 1.48, forward: 3.8, lift: 3.5, handSweep: 11, handLift: 7, brace: 1.12 }
  },
  thrust: {
    anticipation: { angle: -0.16, forward: -2.4, lift: -1, handSweep: -1, handLift: -1, brace: 0.42 },
    contact: { angle: 0.04, forward: 7.2, lift: 0, handSweep: 1, handLift: 0, brace: 1.1 },
    follow: { angle: 0.1, forward: 4, lift: 0.7, handSweep: 2, handLift: 1, brace: 0.72 }
  },
  slam: {
    anticipation: { angle: -1.42, forward: -2.2, lift: -8, handSweep: -3, handLift: -11, brace: 0.82 },
    contact: { angle: 0.08, forward: 4.5, lift: 4, handSweep: 2, handLift: 5, brace: 1.5 },
    follow: { angle: 0.36, forward: 2.2, lift: 5, handSweep: 3, handLift: 7, brace: 1.18 }
  },
  bow: {
    anticipation: { angle: -0.08, forward: -1, lift: -1, handSweep: 0, handLift: -2, brace: 0.5 },
    contact: { angle: 0.02, forward: 2, lift: 0, handSweep: 1, handLift: 0, brace: 0.82 },
    follow: { angle: 0.08, forward: 0.5, lift: 1, handSweep: 2, handLift: 1, brace: 0.45 }
  },
  channel: {
    anticipation: { angle: -0.22, forward: -1, lift: -3, handSweep: -2, handLift: -5, brace: 0.45 },
    contact: { angle: 0.14, forward: 3, lift: -1, handSweep: 3, handLift: -2, brace: 0.86 },
    follow: { angle: 0.04, forward: 1, lift: 0, handSweep: 1, handLift: 0, brace: 0.5 }
  },
  unarmed: {
    anticipation: { angle: -0.18, forward: -1.4, lift: 0, handSweep: -2, handLift: -1, brace: 0.35 },
    contact: { angle: 0.12, forward: 5, lift: 0, handSweep: 2, handLift: 0, brace: 0.88 },
    follow: { angle: 0.2, forward: 2, lift: 1, handSweep: 3, handLift: 1, brace: 0.52 }
  }
});

export function sampleWeaponAttackPose(move, weaponType, elapsed, direction, classId = 'default') {
  const duration = Math.max(0.001, Number(move?.duration || 0.4));
  const activeStart = clamp01(Number(move?.activeStart ?? move?.startup ?? duration * 0.25) / duration);
  const activeEnd = clamp01(Number(move?.activeEnd ?? duration * 0.58) / duration);
  const progress = clamp01(Number(elapsed || 0) / duration);
  const familyId = resolveAttackFamily(move, weaponType);
  const family = ATTACK_FAMILIES[familyId] || ATTACK_FAMILIES.slash;
  const heavy = move?.comboType === 'heavy';
  const classWeight = getClassWeight(classId);
  const blunt=['mace','hammer'].includes(weaponType);
  // Arrive at the contact pose on the authoritative hit frame. Otherwise the
  // impact pause froze a mace overhead before its downward stroke had happened.
  const visualStrikeStart=blunt?Math.max(activeStart*.55,activeStart-.055/duration):activeStart;

  let phase = 'anticipation';
  let phaseProgress = 0;
  let from = family.anticipation;
  let to = family.anticipation;

  if (progress < visualStrikeStart) {
    phaseProgress = easeInOutCubic(progress / Math.max(0.001, visualStrikeStart));
    from = neutralPose();
    to = family.anticipation;
  } else if (progress <= activeEnd) {
    phase = 'strike';
    phaseProgress = easeOutCubic(
      clamp01((progress - visualStrikeStart) / Math.max(0.001, (blunt?activeStart:activeEnd) - visualStrikeStart))
    );
    from = family.anticipation;
    to = family.contact;
  } else {
    phase = 'followThrough';
    const recovery = clamp01((progress - activeEnd) / Math.max(0.001, 1 - activeEnd));
    if (recovery < 0.35) {
      phaseProgress = easeOutCubic(recovery / 0.35);
      from = family.contact;
      to = family.follow;
    } else {
      phase = 'settle';
      phaseProgress = easeInOutCubic((recovery - 0.35) / 0.65);
      from = family.follow;
      to = neutralPose();
    }
  }

  const sampled = mixPose(from, to, phaseProgress);
  const directionX = Number(direction?.x || 0);
  const directionY = Number(direction?.y || 0);
  const swingSign = getSwingSign(move, directionX, familyId);
  const commitment = heavy ? 1.18 : 1;
  const twoHanded = ['scythe', 'staff', 'hammer', 'bow'].includes(weaponType);

  return {
    phase,
    progress,
    phaseProgress,
    family: familyId,
    attackAimX:directionX,
    attackAimY:directionY,
    heavy,
    twoHanded,
    rootOffsetX: directionX * sampled.forward * commitment,
    rootOffsetY: directionY * sampled.forward * commitment + sampled.lift * 0.18,
    rootRotation: swingSign * sampled.angle * 0.19 * classWeight,
    rootScaleX: ['mace','hammer'].includes(weaponType)?1:1 + sampled.brace * 0.022,
    rootScaleY: ['mace','hammer'].includes(weaponType)?1:1 - sampled.brace * 0.014,
    step: sampled.brace * (heavy ? 2.1 : 1.35),
    armSwing: sampled.handSweep * 0.52,
    weaponRotation: swingSign * sampled.angle,
    weaponGripOffsetX: directionX * sampled.forward * 0.7 + swingSign * sampled.handSweep,
    weaponGripOffsetY: directionY * sampled.forward * 0.38 + sampled.handLift,
    frontHandOffsetX: directionX * sampled.forward * 0.62 + swingSign * sampled.handSweep,
    frontHandOffsetY: directionY * sampled.forward * 0.34 + sampled.handLift,
    backHandOffsetX: directionX * sampled.forward * 0.35 + swingSign * sampled.handSweep * (twoHanded ? 0.58 : -0.3),
    backHandOffsetY: directionY * sampled.forward * 0.2 + sampled.handLift * (twoHanded ? 0.72 : -0.18),
    torsoCommitment: sampled.brace,
    trailIntensity: phase === 'strike' ? (heavy ? 1.35 : 1) : phase === 'followThrough' ? 0.55 * (1-phaseProgress*.7) : 0,
    contactMoment: phase === 'strike' && phaseProgress >= 0.72 && (!blunt||progress>=activeStart)
  };
}

export function sampleAbilityChargePose(classId, weaponType, progress, direction, abilityFamily=null) {
  const t = easeInOutCubic(clamp01(progress));
  const spellLike = abilityFamily?abilityFamily!=='melee'&&abilityFamily!=='ranged':['gravecaller', 'necromancer', 'thornbinder', 'waverider', 'hydromancer', 'lightbringer', 'eldritch'].includes(classId) || ['staff', 'spiritFocus', 'eldritch'].includes(weaponType);
  const directionX = Number(direction?.x || 0);
  const directionY = Number(direction?.y || 0);

  if (weaponType === 'bow' && (!abilityFamily || abilityFamily==='ranged')) {
    return {
      state: 'charge',
      phase: 'draw',
      castStyle: classId || 'fellhunter',
      castProgress: t,
      chargeProgress: t,
      rootOffsetX: -directionX * (0.5 + t),
      rootOffsetY: -directionY * 0.5,
      rootRotation: -directionX * 0.035 * t,
      rootScaleX: 1 + t * 0.012,
      rootScaleY: 1 - t * 0.008,
      step: 0.8 + t * 0.7,
      armSwing: -1.5 - t * 1.5,
      weaponRotation: -directionX * 0.08 * t,
      weaponGripOffsetX: directionX * 2 * t,
      weaponGripOffsetY: -2 * t,
      frontHandOffsetX: directionX * 3 * t,
      frontHandOffsetY: -2 * t,
      backHandOffsetX: -directionX * (4 + t * 4),
      backHandOffsetY: -directionY * (2 + t * 2) - t,
      auraPulse: 0.18 + t * 0.48,
      torsoCommitment: 0.35 + t * 0.48
    };
  }

  if (spellLike) {
    const ritualSign = classId === 'eldritch' ? -1 : 1;
    return {
      state: 'charge',
      phase: 'buildup',
      castStyle: classId || 'default',
      castProgress: t,
      chargeProgress: t,
      rootOffsetX: -directionX * t,
      rootOffsetY: -1.5 * t,
      rootRotation: ritualSign * directionX * 0.035 * t,
      rootScaleX: 1 + t * 0.018,
      rootScaleY: 1 - t * 0.012,
      armSwing: 1.5 + t * 2,
      weaponRotation: directionX * -0.22 * t,
      weaponGripOffsetX: directionX * 2 * t,
      weaponGripOffsetY: -5 * t,
      frontHandOffsetX: directionX * 3 * t,
      frontHandOffsetY: -6 * t,
      backHandOffsetX: -directionX * 3 * t,
      backHandOffsetY: -3 * t,
      auraPulse: 0.28 + t * 0.72,
      torsoCommitment: 0.4 + t * 0.6
    };
  }

  const sampled = mixPose(neutralPose(), ATTACK_FAMILIES.heavySlash.anticipation, t);
  const swingSign = directionX < -0.1 ? -1 : 1;
  return {
    state: 'charge',
    phase: 'windUp',
    castStyle: classId || 'default',
    castProgress: t,
    chargeProgress: t,
    rootOffsetX: -directionX * (2 + t * 2),
    rootOffsetY: -directionY * (1 + t),
    rootRotation: -swingSign * 0.12 * t,
    rootScaleX: 1 + t * 0.025,
    rootScaleY: 1 - t * 0.016,
    step: 1 + t * 1.4,
    armSwing: sampled.handSweep * 0.5,
    weaponRotation: swingSign * sampled.angle,
    weaponGripOffsetX: swingSign * sampled.handSweep,
    weaponGripOffsetY: sampled.handLift,
    frontHandOffsetX: swingSign * sampled.handSweep,
    frontHandOffsetY: sampled.handLift,
    backHandOffsetX: swingSign * sampled.handSweep * 0.45,
    backHandOffsetY: sampled.handLift * 0.65,
    auraPulse: 0.2 + t * 0.55,
    torsoCommitment: 0.5 + t * 0.75
  };
}

export function sampleCastReleasePose(action, now, classId, direction) {
  const duration = Math.max(0.12, Number(action?.duration || 0.5));
  const progress = clamp01((now - Number(action?.startedAt ?? now)) / duration);
  const releasePoint = clamp01(Number(action?.releasePoint ?? 0.36));
  const directionX = Number(direction?.x || 0);
  const directionY = Number(direction?.y || 0);
  const chargeLevel = Math.max(0, Number(action?.chargeLevel || 0));
  const summon = action?.kind === 'summon';
  const guard = action?.kind === 'guard';
  const intensity = 1 + chargeLevel * 0.22;

  if (action?.kind === 'channel') {
    const elapsed=Math.max(0,now-Number(action.startedAt || 0));
    const envelope=Math.min(1,elapsed/.15,Math.max(0,(duration-elapsed)/.15));
    const pulse=(.8+Math.sin(elapsed*7)*.06)*envelope;
    return {state:'channel',phase:'hold',castStyle:classId,castProgress:progress,
      releasePower:pulse,rootOffsetX:directionX*pulse,rootOffsetY:-pulse,
      rootRotation:directionX*.035*pulse,rootScaleX:1+.02*pulse,rootScaleY:1-.01*pulse,
      armSwing:pulse,weaponRotation:directionX*.12*pulse,weaponGripOffsetX:directionX*4*pulse,
      weaponGripOffsetY:-5*pulse,frontHandOffsetX:directionX*6*pulse,frontHandOffsetY:-6*pulse,
      backHandOffsetX:-directionX*3*pulse,backHandOffsetY:-3*pulse,auraPulse:pulse,torsoCommitment:pulse};
  }
  if (action?.animationFamily === 'mobility' || action?.animationFamily === 'throw') {
    const envelope=poseEnvelope(progress),throwing=action.animationFamily==='throw';
    return {state:throwing?'throw':'mobility',phase:progress<.35?'buildup':'release',castStyle:classId,castProgress:progress,
      releasePower:envelope,rootOffsetX:directionX*envelope*(throwing?3:6),rootOffsetY:throwing?-envelope:-3*envelope,
      rootRotation:directionX*(throwing?.08:.12)*envelope,rootScaleX:1+.03*envelope,rootScaleY:1-.035*envelope,
      armSwing:envelope*4,weaponRotation:directionX*.35*envelope,weaponGripOffsetX:directionX*8*envelope,
      weaponGripOffsetY:-4*envelope,frontHandOffsetX:directionX*10*envelope,frontHandOffsetY:-5*envelope,
      backHandOffsetX:-directionX*5*envelope,backHandOffsetY:2*envelope,auraPulse:envelope,torsoCommitment:envelope};
  }

  if (guard) {
    const envelope = poseEnvelope(progress);
    return {
      state: 'guard',
      phase: 'release',
      castStyle: classId,
      castProgress: progress,
      releasePower: envelope,
      rootOffsetX: directionX * 1.5 * envelope,
      rootOffsetY: directionY * envelope,
      frontHandOffsetX: directionX * 4 * envelope,
      frontHandOffsetY: -2 * envelope,
      backHandOffsetX: -directionX * 2 * envelope,
      backHandOffsetY: -envelope,
      auraPulse: 0.7 * envelope
    };
  }

  const beforeRelease = progress < releasePoint;
  const phaseProgress = beforeRelease
    ? easeInOutCubic(progress / Math.max(0.001, releasePoint))
    : easeOutCubic((progress - releasePoint) / Math.max(0.001, 1 - releasePoint));
  const releasePower = beforeRelease ? phaseProgress : 1 - phaseProgress;
  const ritual = ['gravecaller', 'necromancer', 'thornbinder'].includes(classId) || summon;
  const harsh = classId === 'eldritch';

  return {
    state: summon ? 'summon' : 'cast',
    phase: beforeRelease ? 'buildup' : 'release',
    castStyle: classId || 'default',
    castProgress: progress,
    chargeProgress: clamp01(Number(action?.chargeProgress || chargeLevel / 2)),
    releasePower,
    rootOffsetX: directionX * releasePower * (harsh ? 3 : 1.8),
    rootOffsetY: -releasePower * (summon ? 2.4 : 1.4),
    rootRotation: directionX * releasePower * (harsh ? 0.075 : ritual ? 0.04 : 0.025),
    rootScaleX: 1 + releasePower * 0.025,
    rootScaleY: 1 - releasePower * 0.015,
    armSwing: releasePower * (summon ? 4.8 : 3.6),
    weaponRotation: directionX * releasePower * (harsh ? 0.34 : -0.18),
    weaponGripOffsetX: directionX * releasePower * 3,
    weaponGripOffsetY: -releasePower * 5,
    frontHandOffsetX: directionX * releasePower * 6,
    frontHandOffsetY: -releasePower * (ritual ? 7 : 5),
    backHandOffsetX: -directionX * releasePower * (ritual ? 5 : 2),
    backHandOffsetY: -releasePower * (ritual ? 5 : 2),
    auraPulse: clamp01(0.45 + releasePower * 0.55 * intensity),
    torsoCommitment: releasePower * intensity
  };
}

export function sampleSignatureAbilityPose(action, now, classId, weaponType, direction) {
  if(action?.subclassId||action?.toolkitPose)return null;
  const pose=sampleSignaturePoseRaw(action,now,classId,weaponType,direction);
  if(!pose)return null;
  const profile=getSignatureAbilityProfile(action?.abilityId);
  const duration=Math.max(.12,Number(action?.duration||profile?.duration||.6));
  const progress=clamp01((now-Number(action?.startedAt??now))/duration);
  const envelope=poseEnvelope(progress);
  const dx=Number(direction?.x||0),dy=Number(direction?.y||0);
  const weight=profile?.gesture?.weight||1;
  // A defined hand spread and a small recoil keep front/back views articulated.
  const spread=['ritualRise','horrorRitual','haloLift','waterCrown','firstSunrise'].includes(profile?.poseType)?4:1.4;
  pose.frontHandOffsetX=(pose.frontHandOffsetX||0)-dy*spread;
  pose.backHandOffsetX=(pose.backHandOffsetX||0)+dy*spread;
  pose.frontHandOffsetY=(pose.frontHandOffsetY||0)+dy*2;
  pose.backHandOffsetY=(pose.backHandOffsetY||0)-dy;
  pose.rootRotation=(pose.rootRotation||0)*weight;
  pose.rootOffsetX=(pose.rootOffsetX||0)*weight;
  pose.weaponRotation=(pose.weaponRotation||0)*weight;
  // Ease additive presentation offsets into and out of the underlying stance.
  // Timing, release events and combat state stay authoritative in the simulation.
  for(const key of Object.keys(pose)){
    if(typeof pose[key]!=='number')continue;
    if(/Offset|Rotation|armSwing|^step$|torsoCommitment|auraPulse/.test(key))pose[key]*=envelope;
    else if(key==='rootScaleX'||key==='rootScaleY')pose[key]=1+(pose[key]-1)*envelope;
  }
  return pose;
}

function poseEnvelope(progress){
  const smooth=t=>{t=clamp01(t);return t*t*(3-2*t);};
  return Math.min(smooth(progress/.12),smooth((1-progress)/.23));
}

function sampleSignaturePoseRaw(action, now, classId, weaponType, direction) {
  const profile = getSignatureAbilityProfile(action?.abilityId);
  if (!profile) return null;

  const duration = Math.max(0.12, Number(action?.duration || profile.duration || 0.6));
  const elapsed = Math.max(0, now - Number(action?.startedAt ?? now));
  const progress = clamp01(elapsed / duration);
  const releasePoint = clamp01(Number(action?.releasePoint ?? profile.releasePoint ?? 0.4));
  const chargeLevel = Math.max(0, Number(action?.chargeLevel || 0));
  const directionX = Number(direction?.x || 0);
  const directionY = Number(direction?.y || 0);
  const intensity = 1 + chargeLevel * 0.18;

  if (profile.poseType === 'holyStrike') {
    const move = {
      id: `${action.abilityId}_signature`,
      kind: 'arc',
      comboType: 'heavy',
      duration,
      activeStart: duration * releasePoint,
      activeEnd: duration * Math.min(0.72, releasePoint + 0.2)
    };
    const pose = sampleWeaponAttackPose(move, weaponType, elapsed, direction, classId);
    if(!['mace','hammer'].includes(weaponType))pose.rootScaleX += 0.015;
    pose.step *= 1.18;
    pose.auraPulse = 0.65 + chargeLevel * 0.14;
    return pose;
  }

  if(profile.poseType==='groundSlam'&&classId==='oathkeeper'&&['mace','hammer'].includes(weaponType)){
    const move={id:action.abilityId+'_slam',kind:'arc',comboType:'heavy',attackFamily:'maceSlam',duration,
      activeStart:duration*releasePoint,activeEnd:duration*Math.min(.78,releasePoint+.16)};
    return {...sampleWeaponAttackPose(move,weaponType,elapsed,direction,classId),auraPulse:.8+chargeLevel*.12};
  }

  if (profile.poseType === 'guardCounter') {
    const pulse = signaturePulse(progress, releasePoint);
    return {
      state: 'signature',
      phase: progress < releasePoint ? 'brace' : 'counter',
      rootOffsetX: -directionX * (1.5 - pulse * 3),
      rootOffsetY: directionY,
      rootRotation: directionX * pulse * 0.07,
      rootScaleX: 1.04,
      rootScaleY: 0.975,
      step: 2,
      weaponRotation: -directionX * 0.16 + directionX * pulse * 0.35,
      frontHandOffsetX: directionX * (4 + pulse * 4),
      frontHandOffsetY: -3,
      backHandOffsetX: directionX * (7 + pulse * 2),
      backHandOffsetY: -4,
      auraPulse: 0.75 + pulse * 0.25,
      torsoCommitment: 1
    };
  }

  if (profile.poseType === 'practicalShot' || profile.poseType === 'executeShot') {
    const move = {
      id: `${action.abilityId}_signature`,
      kind: 'projectile',
      comboType: profile.poseType === 'executeShot' ? 'heavy' : 'shot',
      duration,
      activeStart: duration * releasePoint,
      activeEnd: duration * Math.min(0.64, releasePoint + 0.08)
    };
    const pose = sampleWeaponAttackPose(move, 'bow', elapsed, direction, classId);
    if (profile.poseType === 'executeShot') {
      pose.backHandOffsetX -= directionX * 4;
      pose.rootOffsetX -= directionX * 1.5;
      pose.auraPulse = 0.72 + chargeLevel * 0.12;
    }
    return pose;
  }

  if (profile.poseType === 'tideglassCut') {
    const move = {
      id: `${action.abilityId}_signature`,
      kind: 'arc',
      comboType: 'heavy',
      duration,
      activeStart: duration * releasePoint,
      activeEnd: duration * Math.min(0.68, releasePoint + 0.18)
    };
    const pose = sampleWeaponAttackPose(move, weaponType || 'sword', elapsed, direction, classId);
    pose.step *= 1.12;
    pose.rootRotation *= 0.86;
    pose.auraPulse = 0.62 + chargeLevel * 0.14;
    return pose;
  }

  const base = sampleCastReleasePose({...action,releasePoint}, now, classId, direction);
  const release = Number(base.releasePower || 0);

  if(profile.productionTechnique) {
    const pulse=signaturePulse(progress,releasePoint);
    if(['groundPlant','groundSet','groundSlam','bloomRise'].includes(profile.poseType)) {
      const slam=profile.poseType==='groundSlam',plant=profile.poseType==='groundPlant';
      const load=Math.sin(Math.min(1,progress/releasePoint)*Math.PI*.5);
      base.frontHandOffsetX=directionX*(5+pulse*6);base.backHandOffsetX=plant?-directionX*5:directionX*3;
      base.frontHandOffsetY=slam?-16+pulse*21:plant?-5+pulse*11:-9+pulse*13;
      base.backHandOffsetY=slam?-13+pulse*17:plant?-4+pulse*10:-4;
      base.rootOffsetY=slam?pulse*3:profile.poseType==='bloomRise'?-pulse*2:load*1.7;
      base.rootRotation=directionX*(slam?.07:.035)*pulse;base.rootScaleY=1-.04*pulse;
      base.weaponRotation=directionX*(slam?-1+1.5*pulse:.12+pulse*.24);return base;
    }
    if(['shieldDrive','lanceCast','compressCast','brandTrace','harvestPull','riftTear','haloLift','horrorRitual','scatterCast','volleyDraw','waterStride','fountainRise'].includes(profile.poseType)) {
      const type=profile.poseType;
      if(type==='shieldDrive'){base.frontHandOffsetX=directionX*(7+9*pulse);base.backHandOffsetX=directionX*(3+4*pulse);base.rootOffsetX=directionX*pulse*3;base.frontHandOffsetY=-4;base.weaponRotation=-directionX*.18;}
      if(type==='lanceCast'){base.frontHandOffsetX=directionX*(-3+16*pulse);base.backHandOffsetX=-directionX*6;base.frontHandOffsetY=-7;base.rootOffsetX=-directionX*pulse*1.6;}
      if(type==='compressCast'){base.frontHandOffsetX=directionX*(11-8*pulse);base.backHandOffsetX=-directionX*(11-8*pulse);base.frontHandOffsetY=-9+3*pulse;base.backHandOffsetY=-9+3*pulse;base.rootScaleX=1-.04*pulse;}
      if(type==='brandTrace'){base.frontHandOffsetX=directionX*(7+4*Math.sin(progress*Math.PI*2));base.frontHandOffsetY=-12+progress*10;base.backHandOffsetY=-3;base.weaponRotation=directionX*.16;}
      if(type==='harvestPull'){base.frontHandOffsetX=directionX*(13-11*pulse);base.backHandOffsetX=-directionX*(9-6*pulse);base.frontHandOffsetY=-5-pulse*2;base.backHandOffsetY=-5;base.rootOffsetX=-directionX*pulse*2;}
      if(type==='riftTear'){base.frontHandOffsetX=directionX*(3+11*pulse);base.backHandOffsetX=-directionX*(3+9*pulse);base.frontHandOffsetY=-8;base.backHandOffsetY=-6;base.rootRotation=directionX*pulse*.09;}
      if(type==='haloLift'||type==='horrorRitual'||type==='fountainRise'){base.frontHandOffsetX=directionX*(6+3*pulse);base.backHandOffsetX=-directionX*(6+3*pulse);base.frontHandOffsetY=-7-10*pulse;base.backHandOffsetY=-7-9*pulse;base.rootOffsetY=-pulse*2;base.rootRotation=type==='horrorRitual'?-directionX*.06*pulse:0;}
      if(type==='scatterCast'){base.frontHandOffsetX=directionX*(4+9*pulse);base.frontHandOffsetY=-4+3*pulse;base.backHandOffsetX=-directionX*5;base.weaponRotation=directionX*(-.5+progress*1.1);base.rootRotation=directionX*pulse*.07;}
      if(type==='volleyDraw'){base.frontHandOffsetX=directionX*12;base.backHandOffsetX=-directionX*(3+7*(1-pulse));base.frontHandOffsetY=-6;base.backHandOffsetY=-6;base.rootOffsetX=-directionX*(1-pulse)*2;}
      if(type==='waterStride'){base.rootOffsetX=directionX*pulse*4;base.rootOffsetY=-pulse*2;base.frontHandOffsetX=directionX*9;base.backHandOffsetX=-directionX*7;base.frontHandOffsetY=-7;base.backHandOffsetY=-5;}
      return base;
    }
    if(profile.poseType.startsWith('held')) {
      const breath=Math.sin(elapsed*6)*.4;
      base.rootScaleY=.985;base.torsoCommitment=1;
      if(profile.poseType==='heldIron'){base.frontHandOffsetX=directionX*9;base.backHandOffsetX=directionX*5;base.frontHandOffsetY=-5;base.backHandOffsetY=-4;}
      if(profile.poseType==='heldHost'){base.frontHandOffsetX=directionX*8;base.backHandOffsetX=-directionX*8;base.frontHandOffsetY=-10+breath;base.backHandOffsetY=-9-breath;}
      if(profile.poseType==='heldThorns'){base.rootScaleX=1.04;base.frontHandOffsetX=directionX*10;base.frontHandOffsetY=-3;base.backHandOffsetY=-5;}
      if(profile.poseType==='heldWater'){base.frontHandOffsetX=directionX*9;base.backHandOffsetX=-directionX*7;base.frontHandOffsetY=-6+breath;base.backHandOffsetY=-6-breath;}
      if(profile.poseType==='heldConduit'){base.frontHandOffsetX=directionX*13;base.backHandOffsetX=-directionX*4;base.frontHandOffsetY=-6+breath;base.backHandOffsetY=-3;base.rootRotation=-directionX*.035;}
      base.auraPulse=.7;return base;
    }
    if(['steelThrow','vesselThrow','seedThrow'].includes(profile.poseType)){
      base.frontHandOffsetX=directionX*(-5+pulse*17);base.frontHandOffsetY=-13+pulse*10;
      base.backHandOffsetX=-directionX*5;base.rootRotation=directionX*(-.07+pulse*.12);
      base.weaponRotation=directionX*(profile.poseType==='steelThrow'?-.5+pulse: .3-pulse*.4);
      return base;
    }
    if(['evasiveVault','spectralGlide','rootStride','radiantStride','fracturedStride'].includes(profile.poseType)){
      const backward=profile.poseType==='evasiveVault'?-1:1;
      base.rootOffsetX=directionX*pulse*4*backward;base.rootRotation=-directionX*pulse*(profile.poseType==='fracturedStride'?.13:.06);
      base.rootOffsetY-=pulse*(profile.poseType==='evasiveVault'?4:profile.poseType==='spectralGlide'?2:.8);
      base.frontHandOffsetX=directionX*(5+pulse*5);base.backHandOffsetX=-directionX*(4+pulse*3);
      return base;
    }
    if(profile.poseType==='oathPull'){
      base.frontHandOffsetX=directionX*(12-pulse*8);base.frontHandOffsetY=-6;
      base.backHandOffsetX=directionX*(4-pulse*7);base.rootRotation=-directionX*pulse*.08;return base;
    }
  }

  if (profile.poseType === 'curseGrasp') {
    base.frontHandOffsetY = -8 + release * 11;
    base.frontHandOffsetX = directionX * (4 + release * 5);
    base.backHandOffsetX = -directionX * 4;
    base.backHandOffsetY = -5;
    base.weaponRotation = -directionX * 0.28 + directionX * release * 0.12;
    base.rootRotation = directionX * 0.04;
  } else if (profile.poseType === 'ritualRise') {
    base.frontHandOffsetY = -9 - release * 5;
    base.backHandOffsetY = -9 - release * 4;
    base.frontHandOffsetX = directionX * 7;
    base.backHandOffsetX = -directionX * 7;
    base.rootOffsetY -= release * 2;
  } else if (profile.poseType === 'rootSweep') {
    const curve = Math.sin(progress * Math.PI);
    base.weaponRotation = directionX * (-0.62 + progress * 1.24);
    base.frontHandOffsetX = directionX * (3 + curve * 6);
    base.frontHandOffsetY = -4 + curve * 3;
    base.backHandOffsetX = -directionX * 3 + directionX * curve * 3;
    base.rootRotation = directionX * curve * 0.08;
  } else if (profile.poseType === 'thornPatch') {
    const curve = Math.sin(progress * Math.PI);
    base.weaponRotation = directionX * (-0.32 + curve * 0.68);
    base.frontHandOffsetX = directionX * (5 + curve * 4);
    base.frontHandOffsetY = -6 + release * 8;
    base.rootOffsetY += release * 1.5;
  } else if (profile.poseType === 'waterSweep') {
    const curve = Math.sin(progress * Math.PI);
    base.weaponRotation = directionX * (-0.35 + progress * 0.72);
    base.frontHandOffsetX = directionX * (5 + release * 7);
    base.frontHandOffsetY = -5 + curve * 2;
    base.backHandOffsetX = -directionX * (3 + curve * 2);
    base.rootRotation = directionX * curve * 0.055;
  } else if (profile.poseType === 'waterWard') {
    const pulse = Math.sin(progress * Math.PI);
    base.frontHandOffsetX = directionX * (4 + pulse * 4);
    base.backHandOffsetX = -directionX * (4 + pulse * 4);
    base.frontHandOffsetY = -7;
    base.backHandOffsetY = -7;
    base.rootScaleX = 1.02 + pulse * 0.02;
    base.auraPulse = 0.78 + pulse * 0.2;
  } else if (profile.poseType === 'waterMend') {
    const rise = Math.sin(progress * Math.PI);
    base.frontHandOffsetX = directionX * 6;
    base.backHandOffsetX = -directionX * 6;
    base.frontHandOffsetY = -5 - rise * 6;
    base.backHandOffsetY = -5 - rise * 5;
    base.rootOffsetY -= rise * 1.5;
  } else if (profile.poseType === 'waterCrown') {
    const rise = Math.sin(progress * Math.PI);
    base.frontHandOffsetX = directionX * (7 + rise * 2);
    base.backHandOffsetX = -directionX * (7 + rise * 2);
    base.frontHandOffsetY = -9 - rise * 8;
    base.backHandOffsetY = -9 - rise * 8;
    base.rootOffsetY -= rise * 2.5;
    base.auraPulse = 0.85 + rise * 0.15;
  } else if (profile.poseType === 'radiantRay') {
    const snap = signaturePulse(progress, releasePoint);
    base.frontHandOffsetX = directionX * (6 + snap * 5);
    base.frontHandOffsetY = -5 - snap * 1.5;
    base.backHandOffsetX = -directionX * (3 + snap * 2);
    base.backHandOffsetY = -4;
    base.weaponRotation = directionX * (-0.12 + snap * 0.22);
    base.rootRotation = directionX * snap * 0.035;
    base.auraPulse = 0.58 + snap * 0.34;
  } else if (profile.poseType === 'dawnChannel') {
    const brace = Math.sin(Math.min(1, progress * 1.3) * Math.PI * 0.5);
    base.rootOffsetX = -directionX * (1.2 - release * 2.2);
    base.rootOffsetY = -1.5 * brace;
    base.rootRotation = directionX * 0.025 * brace;
    base.rootScaleX = 1.025 + brace * 0.012;
    base.rootScaleY = 0.985;
    base.frontHandOffsetX = directionX * (7 + release * 5);
    base.backHandOffsetX = directionX * (4 + release * 4);
    base.frontHandOffsetY = -7;
    base.backHandOffsetY = -6;
    base.weaponRotation = directionX * -0.18;
    base.auraPulse = 0.82 + brace * 0.18;
    base.torsoCommitment = 1.05;
  } else if (profile.poseType === 'prismGuard') {
    const pulse = Math.sin(progress * Math.PI);
    base.frontHandOffsetX = directionX * (4 + pulse * 5);
    base.backHandOffsetX = -directionX * (4 + pulse * 5);
    base.frontHandOffsetY = -6 - pulse;
    base.backHandOffsetY = -6 - pulse;
    base.rootScaleX = 1.02 + pulse * 0.018;
    base.rootScaleY = 0.985;
    base.auraPulse = 0.76 + pulse * 0.22;
  } else if (profile.poseType === 'firstSunrise') {
    const rise = Math.sin(progress * Math.PI);
    base.frontHandOffsetX = directionX * (6 + rise * 3);
    base.backHandOffsetX = -directionX * (6 + rise * 3);
    base.frontHandOffsetY = -8 - rise * 8;
    base.backHandOffsetY = -8 - rise * 7;
    base.rootOffsetY -= rise * 2.4;
    base.rootScaleX = 1.02 + rise * 0.02;
    base.rootScaleY = 0.98;
    base.auraPulse = 0.85 + rise * 0.15;
  } else if (profile.poseType === 'redMark') {
    base.frontHandOffsetX = directionX * (8 + release * 7);
    base.frontHandOffsetY = -5;
    base.backHandOffsetX = -directionX * 5;
    base.weaponRotation = directionX * (0.45 + release * 0.28);
    base.rootRotation = -directionX * 0.055;
  } else if (profile.poseType === 'blackRedBurst') {
    base.rootOffsetX = -directionX * (2 - release * 7);
    base.rootRotation = -directionX * 0.12 + directionX * release * 0.24;
    base.weaponRotation = -directionX * 0.58 + directionX * release * 1.05;
    base.frontHandOffsetX = directionX * (3 + release * 9);
    base.frontHandOffsetY = -8 + release * 5;
    base.backHandOffsetX = -directionX * 6;
    base.backHandOffsetY = -6;
  }

  base.signatureProfileId = profile.id;
  base.auraPulse = clamp01(Number(base.auraPulse || 0.5) * intensity);
  return base;
}

function signaturePulse(progress, releasePoint) {
  if (progress < releasePoint) return easeInOutCubic(progress / Math.max(0.001, releasePoint));
  return 1 - easeOutCubic((progress - releasePoint) / Math.max(0.001, 1 - releasePoint));
}

export function getClassEffectStyle(classId) {
  if (classId === 'oathkeeper' || classId === 'templar') return { base: '#d9ad4f', light: '#fff1b8', dark: '#5f4a24' };
  if (classId === 'fellhunter' || classId === 'mercenary') return { base: '#d45f3f', light: '#ffc078', dark: '#3a2522' };
  if (classId === 'gravecaller' || classId === 'necromancer') return { base: '#7d36a4', light: '#c69cff', dark: '#140b1a' };
  if (classId === 'thornbinder') return { base: '#5e9b4b', light: '#d8b86a', dark: '#263719' };
  if (classId === 'hydromancer' || classId === 'waverider') return { base: '#35b9d0', light: '#d7fbfa', dark: '#102d3b' };
  if (classId === 'lightbringer') return { base: '#d9ad4f', light: '#fff7d8', dark: '#5f4a24' };
  if (classId === 'eldritch') return { base: '#ef4056', light: '#ff8a98', dark: '#090306' };
  return { base: '#c9d1d9', light: '#ffffff', dark: '#20252d' };
}

function resolveAttackFamily(move, weaponType) {
  if (move?.attackFamily && ATTACK_FAMILIES[move.attackFamily]) return move.attackFamily;
  if (weaponType === 'spiritFocus') return 'channel';
  if (weaponType === 'bow' || weaponType === 'crossbow' || move?.kind === 'projectile') return 'bow';
  if (weaponType === 'eldritch' || move?.comboType === 'channel') return 'channel';
  if (weaponType === 'spear') return 'thrust';
  if (weaponType === 'mace' || weaponType === 'hammer') return 'slam';
  if (move?.kind === 'line') return weaponType === 'staff' ? 'thrust' : 'channel';
  if (move?.kind === 'circle') return 'slam';
  if (weaponType === 'scythe') return 'scytheSweep';
  if (move?.comboType === 'heavy') return 'heavySlash';
  if (weaponType === 'unarmed') return 'unarmed';
  if (String(move?.id || '').includes('_2')) return 'reverseSlash';
  return 'slash';
}

function getSwingSign(move, directionX, family) {
  const facingSign = directionX < -0.1 ? -1 : 1;
  if (move?.lightCombo) return facingSign * (move.swingDirection || 1);
  // The reverse-slash key poses already reverse the arc. Do not negate them twice.
  if(family==='reverseSlash')return facingSign;
  return String(move?.id || '').includes('_2') ? -facingSign : facingSign;
}

function getClassWeight(classId) {
  if (classId === 'oathkeeper' || classId === 'templar') return 0.82;
  if (classId === 'fellhunter' || classId === 'mercenary') return 1.08;
  if (classId === 'gravecaller' || classId === 'necromancer') return 1.02;
  if (classId === 'thornbinder') return 0.96;
  if (classId === 'hydromancer' || classId === 'waverider') return 1.02;
  if (classId === 'lightbringer') return 0.98;
  if (classId === 'eldritch') return 1.14;
  return 1;
}

function neutralPose() {
  return { angle: 0, forward: 0, lift: 0, handSweep: 0, handLift: 0, brace: 0 };
}

function mixPose(from, to, t) {
  return {
    angle: mix(from.angle, to.angle, t),
    forward: mix(from.forward, to.forward, t),
    lift: mix(from.lift, to.lift, t),
    handSweep: mix(from.handSweep, to.handSweep, t),
    handLift: mix(from.handLift, to.handLift, t),
    brace: mix(from.brace, to.brace, t)
  };
}

function mix(a, b, t) {
  return Number(a || 0) + (Number(b || 0) - Number(a || 0)) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

function easeInOutCubic(t) {
  const value = clamp01(t);
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}
