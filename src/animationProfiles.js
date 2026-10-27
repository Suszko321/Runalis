// Bespoke animation/effect profiles layered over the shared key-pose system.
import { getCombatTechniqueMotionProfile } from './combatTechniqueMotionProfiles.js';
//
// To add a signature ability:
// 1. Add a profile below with a reusable poseType and effectKind.
// 2. Map the ability id in ABILITY_SIGNATURE_PROFILE_IDS.
// 3. Add a compact renderer branch only when effectKind needs unique geometry.

export const CLASS_SIGNATURE_PROFILES = Object.freeze({
  oathkeeperHolyStrike: Object.freeze({
    id: 'oathkeeperHolyStrike',
    classId: 'oathkeeper',
    poseType: 'holyStrike',
    animationFamily: 'melee',
    effectKind: 'holySlashRelease',
    trailStyle: 'radiantArc',
    duration: 0.7,
    releasePoint: 0.36,
    colors: ['#fff1b8', '#d9ad4f', '#4d5661']
  }),
  oathkeeperGuardCounter: Object.freeze({
    id: 'oathkeeperGuardCounter',
    classId: 'oathkeeper',
    poseType: 'guardCounter',
    animationFamily: 'guard',
    effectKind: 'holyGuardRelease',
    trailStyle: 'impactRing',
    duration: 0.58,
    releasePoint: 0.3,
    colors: ['#fff1b8', '#d9ad4f', '#77818d']
  }),
  oathkeeperDivineSlam: Object.freeze({
    id: 'oathkeeperDivineSlam',
    classId: 'oathkeeper',
    poseType: 'groundSlam',
    animationFamily: 'melee',
    effectKind: 'holyImpactRelease',
    trailStyle: 'impactRing',
    duration: 0.82,
    releasePoint: 0.48,
    colors: ['#ffffff', '#fff1b8', '#d9ad4f']
  }),
  mercenaryPracticalShot: Object.freeze({
    id: 'mercenaryPracticalShot',
    classId: 'fellhunter',
    poseType: 'practicalShot',
    animationFamily: 'ranged',
    effectKind: 'mercenaryShotRelease',
    trailStyle: 'steelLine',
    duration: 0.42,
    releasePoint: 0.3,
    colors: ['#ffc078', '#d45f3f', '#9facbf']
  }),
  mercenaryExecuteShot: Object.freeze({
    id: 'mercenaryExecuteShot',
    classId: 'fellhunter',
    poseType: 'executeShot',
    animationFamily: 'ranged',
    effectKind: 'mercenaryExecuteRelease',
    trailStyle: 'redOrangeLine',
    duration: 0.64,
    releasePoint: 0.48,
    colors: ['#ffd39a', '#ef6f4f', '#bac3ce']
  }),
  necromancerCurseGrasp: Object.freeze({
    id: 'necromancerCurseGrasp',
    classId: 'necromancer',
    poseType: 'curseGrasp',
    animationFamily: 'cast',
    effectKind: 'necromancerCurseRelease',
    trailStyle: 'purpleBlackRune',
    duration: 0.62,
    releasePoint: 0.42,
    colors: ['#c69cff', '#7d36a4', '#140b1a']
  }),
  necromancerRitualRise: Object.freeze({
    id: 'necromancerRitualRise',
    classId: 'necromancer',
    poseType: 'ritualRise',
    animationFamily: 'ritual',
    effectKind: 'necromancerRitualRelease',
    trailStyle: 'purpleBlackPillars',
    duration: 0.82,
    releasePoint: 0.52,
    colors: ['#c69cff', '#6d2c91', '#100714']
  }),
  thornbinderRootSweep: Object.freeze({
    id: 'thornbinderRootSweep',
    classId: 'thornbinder',
    poseType: 'rootSweep',
    animationFamily: 'cast',
    effectKind: 'thornbinderRootRelease',
    trailStyle: 'growthArc',
    duration: 0.58,
    releasePoint: 0.38,
    colors: ['#d8b86a', '#5e9b4b', '#3d2b18']
  }),
  thornbinderThornPatch: Object.freeze({
    id: 'thornbinderThornPatch',
    classId: 'thornbinder',
    poseType: 'thornPatch',
    animationFamily: 'cast',
    effectKind: 'thornbinderPatchRelease',
    trailStyle: 'thornRing',
    duration: 0.72,
    releasePoint: 0.46,
    colors: ['#e1c579', '#4f8a42', '#342516']
  }),
  hydromancerTorrentCast: Object.freeze({
    id: 'hydromancerTorrentCast',
    classId: 'hydromancer',
    poseType: 'waterSweep',
    animationFamily: 'cast',
    effectKind: 'hydromancerTorrentRelease',
    trailStyle: 'cyanCurrent',
    duration: 0.62,
    releasePoint: 0.4,
    colors: ['#d7fbfa', '#35b9d0', '#102d3b']
  }),
  hydromancerBubbleCast: Object.freeze({
    id: 'hydromancerBubbleCast',
    classId: 'hydromancer',
    poseType: 'waterWard',
    animationFamily: 'guard',
    effectKind: 'hydromancerWardRelease',
    trailStyle: 'bubbleRing',
    duration: 0.64,
    releasePoint: 0.42,
    colors: ['#d7fbfa', '#59d7e8', '#102d3b']
  }),
  hydromancerMendingCast: Object.freeze({
    id: 'hydromancerMendingCast',
    classId: 'hydromancer',
    poseType: 'waterMend',
    animationFamily: 'cast',
    effectKind: 'hydromancerMendingRelease',
    trailStyle: 'mendingRipple',
    duration: 0.7,
    releasePoint: 0.46,
    colors: ['#e8ffff', '#8feaf2', '#1e667a']
  }),
  hydromancerTidalCut: Object.freeze({
    id: 'hydromancerTidalCut',
    classId: 'hydromancer',
    poseType: 'tideglassCut',
    animationFamily: 'melee',
    effectKind: 'hydromancerTidalCutRelease',
    trailStyle: 'tidalBladeArc',
    duration: 0.58,
    releasePoint: 0.36,
    colors: ['#d7fbfa', '#35b9d0', '#102d3b']
  }),
  hydromancerDelugeCrown: Object.freeze({
    id: 'hydromancerDelugeCrown',
    classId: 'hydromancer',
    poseType: 'waterCrown',
    animationFamily: 'cast',
    effectKind: 'hydromancerDelugeRelease',
    trailStyle: 'delugeCrown',
    duration: 0.88,
    releasePoint: 0.56,
    colors: ['#ffffff', '#59d7e8', '#0b3448']
  }),
  lightbringerQuickRay: Object.freeze({
    id: 'lightbringerQuickRay',
    classId: 'lightbringer',
    poseType: 'radiantRay',
    animationFamily: 'cast',
    effectKind: 'lightbringerRayRelease',
    trailStyle: 'goldPrismLine',
    duration: 0.5,
    releasePoint: 0.34,
    colors: ['#fff7d8', '#d9ad4f', '#5f4a24']
  }),
  lightbringerDawnChannel: Object.freeze({
    id: 'lightbringerDawnChannel',
    classId: 'lightbringer',
    poseType: 'dawnChannel',
    animationFamily: 'channel',
    effectKind: 'lightbringerBeamRelease',
    trailStyle: 'radiantBeam',
    duration: 1.2,
    releasePoint: 0.12,
    colors: ['#ffffff', '#fff1b8', '#d9ad4f']
  }),
  lightbringerPrismGuard: Object.freeze({
    id: 'lightbringerPrismGuard',
    classId: 'lightbringer',
    poseType: 'prismGuard',
    animationFamily: 'guard',
    effectKind: 'lightbringerPrismRelease',
    trailStyle: 'prismFacets',
    duration: 0.64,
    releasePoint: 0.38,
    colors: ['#fff7d8', '#d9ad4f', '#5f4a24']
  }),
  lightbringerFirstSunrise: Object.freeze({
    id: 'lightbringerFirstSunrise',
    classId: 'lightbringer',
    poseType: 'firstSunrise',
    animationFamily: 'ritual',
    effectKind: 'lightbringerSunriseRelease',
    trailStyle: 'sunriseHalo',
    duration: 0.9,
    releasePoint: 0.52,
    colors: ['#ffffff', '#fff1b8', '#d9ad4f']
  }),
  eldritchRedMark: Object.freeze({
    id: 'eldritchRedMark',
    classId: 'eldritch',
    poseType: 'redMark',
    animationFamily: 'cast',
    effectKind: 'eldritchMarkRelease',
    trailStyle: 'blackRedSigil',
    duration: 0.58,
    releasePoint: 0.4,
    colors: ['#ff8a98', '#ef4056', '#090306']
  }),
  eldritchBlackRedBurst: Object.freeze({
    id: 'eldritchBlackRedBurst',
    classId: 'eldritch',
    poseType: 'blackRedBurst',
    animationFamily: 'cast',
    effectKind: 'eldritchBurstRelease',
    trailStyle: 'blackRedDistortion',
    duration: 0.7,
    releasePoint: 0.5,
    colors: ['#ff8a98', '#d92f48', '#070205']
  })
});

export const ABILITY_SIGNATURE_PROFILE_IDS = Object.freeze({
  oathkeeperOathStrike: 'oathkeeperHolyStrike',
  oathkeeperBastionBash: 'oathkeeperGuardCounter',
  oathkeeperDivineLeap: 'oathkeeperDivineSlam',
  oathkeeperJudgmentSmite: 'oathkeeperDivineSlam',
  oathkeeperConsecratedGround: 'oathkeeperGuardCounter',
  oathkeeperBulwarkOfLight: 'oathkeeperGuardCounter',
  oathkeeperLastRite: 'oathkeeperGuardCounter',
  oathkeeperHeavenbreakerJudgment: 'oathkeeperDivineSlam',
  heavyCut: 'oathkeeperHolyStrike',
  cleavingStep: 'oathkeeperDivineSlam',
  radiantSmite: 'oathkeeperDivineSlam',
  aegisBreaker: 'oathkeeperGuardCounter',

  quickShot: 'mercenaryPracticalShot',
  markedArrow: 'mercenaryExecuteShot',
  arrowVolley: 'mercenaryExecuteShot',
  smokeBomb: 'mercenaryPracticalShot',
  fellhunterPracticalStrike: 'mercenaryPracticalShot',
  fellhunterThrowingDaggers: 'mercenaryPracticalShot',
  fellhunterBearTrap: 'mercenaryPracticalShot',
  fellhunterCaltrops: 'mercenaryPracticalShot',
  fellhunterBombToss: 'mercenaryExecuteShot',
  fellhunterGrapplingHook: 'mercenaryPracticalShot',
  fellhunterFlamingArrowVolley: 'mercenaryExecuteShot',
  fellhunterSmokeBomb: 'mercenaryPracticalShot',
  fellhunterMarkedShot: 'mercenaryExecuteShot',
  fellhunterKillZone: 'mercenaryExecuteShot',

  graveSpark: 'necromancerCurseGrasp',
  bloodLance: 'necromancerCurseGrasp',
  soulSiphon: 'necromancerCurseGrasp',
  summonLich: 'necromancerRitualRise',
  gravecallerSummonLich: 'necromancerRitualRise',

  thornbinderThornLash: 'thornbinderRootSweep',
  thornbinderBriarHook: 'thornbinderRootSweep',
  thornbinderBramblePatch: 'thornbinderThornPatch',
  thornbinderRosebiteBurst: 'thornbinderThornPatch',
  thornbinderLivingBriar: 'thornbinderThornPatch',
  thornbinderRootPrison: 'thornbinderThornPatch',
  thornbinderSummonThornlings: 'thornbinderRootSweep',
  thornbinderSummonElderThornbeast: 'thornbinderRootSweep',
  vineWhip: 'thornbinderRootSweep',
  wildBloom: 'thornbinderThornPatch',
  brambleSnare: 'thornbinderThornPatch',
  summonThornbeast: 'thornbinderRootSweep',

  hydromancerWaterTorrent: 'hydromancerTorrentCast',
  hydromancerBubbleWard: 'hydromancerBubbleCast',
  hydromancerMendingCurrent: 'hydromancerMendingCast',
  hydromancerTidalCut: 'hydromancerTidalCut',
  hydromancerRiptideStep: 'hydromancerTorrentCast',
  hydromancerDrowningPressure: 'hydromancerTorrentCast',
  hydromancerWellspring: 'hydromancerMendingCast',
  hydromancerDelugeCrown: 'hydromancerDelugeCrown',

  lightbringerGleamBolt: 'lightbringerQuickRay',
  lightbringerHaloBrand: 'lightbringerQuickRay',
  lightbringerRayOfRebuke: 'lightbringerQuickRay',
  lightbringerPrismGuard: 'lightbringerPrismGuard',
  lightbringerDawncarver: 'lightbringerDawnChannel',
  lightbringerSolarVerdict: 'lightbringerFirstSunrise',
  lightbringerHaloAegis: 'lightbringerPrismGuard',
  lightbringerFirstSunrise: 'lightbringerFirstSunrise',

  redMawRift: 'eldritchRedMark',
  blackStarPulse: 'eldritchBlackRedBurst',
  voidstepBurst: 'eldritchBlackRedBurst',
  summonEldritchHorror: 'eldritchBlackRedBurst'
});

export const ENEMY_ATTACK_PROFILES = Object.freeze({
  lunge: Object.freeze({ id: 'lunge', pose: 'lean', shape: 'cone', windup: 0.45, recovery: 0.65 }),
  guardBreak: Object.freeze({ id: 'guardBreak', pose: 'heavyCleave', shape: 'arc', windup: 0.75, recovery: 0.72 }),
  slam: Object.freeze({ id: 'slam', pose: 'overhead', shape: 'circle', windup: 0.9, recovery: 0.9 }),
  detonate: Object.freeze({ id: 'detonate', pose: 'swell', shape: 'circle', windup: 1, recovery: 0 }),
  arrowShot: Object.freeze({ id: 'arrowShot', pose: 'aim', shape: 'line', windup: 0.42, recovery: 0.48 }),
  curseBolt: Object.freeze({ id: 'curseBolt', pose: 'channel', shape: 'line', windup: 0.55, recovery: 0.58 }),
  cursedGround: Object.freeze({ id: 'cursedGround', pose: 'channel', shape: 'circle', windup: 0.72, recovery: 0.7 }),
  summonMinion: Object.freeze({ id: 'summonMinion', pose: 'ritual', shape: 'sigil', windup: 0.8, recovery: 0.85 }),
  phaseStrike: Object.freeze({ id: 'phaseStrike', pose: 'phase', shape: 'arc', windup: 0.38, recovery: 0.5 }),
  chargeRush: Object.freeze({ id: 'chargeRush', pose: 'lean', shape: 'line', windup: 0.72, recovery: 0.82 }),
  shieldCharge: Object.freeze({ id: 'shieldCharge', pose: 'guardCounter', shape: 'line', windup: 0.78, recovery: 1.0 }),
  duelistThrust: Object.freeze({ id: 'duelistThrust', pose: 'aim', shape: 'line', windup: 0.52, recovery: 0.68 }),
  spectralLunge: Object.freeze({ id: 'spectralLunge', pose: 'phase', shape: 'line', windup: 0.58, recovery: 0.78 }),
  infernalRush: Object.freeze({ id: 'infernalRush', pose: 'lean', shape: 'cone', windup: 0.7, recovery: 0.92 }),
  rootBurrowCharge: Object.freeze({ id: 'rootBurrowCharge', pose: 'ritual', shape: 'line', windup: 0.82, recovery: 0.95 }),
  judgmentCharge: Object.freeze({ id: 'judgmentCharge', pose: 'bossSlam', shape: 'line', windup: 0.76, recovery: 0.96 }),
  bossShockwave: Object.freeze({ id: 'bossShockwave', pose: 'bossSlam', shape: 'circle', windup: 0.82, recovery: 0.9 }),
  bossRoots: Object.freeze({ id: 'bossRoots', pose: 'ritual', shape: 'sigil', windup: 0.9, recovery: 0.88 }),
  bossJudgment: Object.freeze({ id: 'bossJudgment', pose: 'bossSlam', shape: 'cross', windup: 0.86, recovery: 0.96 }),
  bossRift: Object.freeze({ id: 'bossRift', pose: 'ritual', shape: 'sigil', windup: 0.9, recovery: 0.9 })
});

export function getSignatureAbilityProfile(abilityId) {
  const technique=getCombatTechniqueMotionProfile(abilityId);
  if(technique)return technique;
  const profileId = ABILITY_SIGNATURE_PROFILE_IDS[abilityId];
  return profileId ? CLASS_SIGNATURE_PROFILES[profileId] || null : null;
}

export function getEnemyAttackProfile(kind) {
  return ENEMY_ATTACK_PROFILES[kind] || null;
}
