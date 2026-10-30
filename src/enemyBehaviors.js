import { getArmour } from './player.js';
import { rewardAbilitySupport } from './abilityMasterySystem.js';
import { mitigateTechniqueDamage } from './combatExpansion.js';
import {mitigateSubclassDamage} from './subclassCombat.js';
import {mitigateRoseMantle} from './roseMantleSystem.js';
import {modifyBloodlineIncomingDamage} from './bloodlineSystem.js';
import {applyLegendaryIncomingDamage} from './legendarySystem.js';
import {onPlayerTookDamage} from './classPassives.js';
import {applyLightbringerShieldAbsorb,grantOathkeeperConviction,cancelActiveHeavyAttackCharge,applySummonThornRetaliation} from './combat.js';
// enemyBehaviors.js
// Readable enemy archetype behavior layered over the existing combat system.

import { addFloatingText, addStatusText } from './floatingText.js';
import { findNearestPassablePoint, hasLineOfSight, isPassable, moveActorWithCollision } from './world.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import { getEnemyAttackProfile } from './animationProfiles.js';
import {enemyAttackIdentity,beginBasicEnemyAttack,updateBasicEnemyAttack,beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation,beginEnemyCharge,getEnemyCharge,syncEnemyCharge,finishEnemyCharge} from './enemyAttackPresentation.js';
import {enemyTelegraphGeometry,telegraphContainsPoint} from './enemyTelegraphGeometry.js';
import { playSfx } from './audioSystem.js';
import { SOUND_EVENT_KEYS } from './combatFeedbackProfiles.js';
import {enemyWithinTargetView,ENEMY_PURSUIT_MARGIN} from './enemyVisibility.js';
import {updateEnemyTacticalMovement,mayEnemyKite,waitForAlliedMajorAttack} from './enemyTactics.js';
import { applyDefensiveDamage, isDodgeInvulnerable } from './combatActions.js';
import {
  applyCoopAggroRange,
  getCoopAggroRange,
  getEnemyTargetId,
  getEnemyTargetablePlayers,
  getEnemyTargetThreatMultiplier
} from './coopEnemyScaling.js';

const ADVANCED_KINDS = new Set([
  'basicBeast',
  'stalkerWolf',
  'shieldKnight',
  'archer',
  'cultist',
  'gravePriest',
  'brute',
  'wraith',
  'exploder'
]);

const DEFAULT_WAKE_RANGE = 280;
const MAX_WAKE_RANGE = 360;
const DEFAULT_LEASH_RANGE = 620;
const BOSS_LEASH_RANGE = 1400;
const SAFE_MODE_IDS = new Set(['capital', 'hub', 'town']);
const combatParties=new WeakMap();
const CHARGE_TELEGRAPH_KINDS = new Set([
  'chargeRush',
  'shieldCharge',
  'duelistThrust',
  'spectralLunge',
  'infernalRush',
  'rootBurrowCharge',
  'judgmentCharge'
]);

export function isDungeonWorld(world) {
  return !!(
    world?.mode === 'dungeon' ||
    world?.dungeon?.active ||
    world?.dungeonState ||
    world?.dungeonClassification ||
    world?.rooms && world?.halls && world?.depth
  );
}

export function isPersistentDungeonEnemy(enemy, world) {
  if (!enemy || enemy.dead || enemy.remove) return false;
  if (!isDungeonWorld(world)) return false;
  if (enemy.safeZoneNpc || enemy.npc || enemy.nonCombatant) return false;
  return true;
}

export function hasPersistentDungeonAggro(enemy) {
  return !!(
    enemy?.persistentDungeonAggro ||
    enemy?.hasDetectedPlayer ||
    enemy?.isInCombat ||
    enemy?.awakened ||
    enemy?.aggro ||
    enemy?.alerted ||
    enemy?.lastDamagedByPlayer ||
    enemy?.hitFlash > 0 ||
    wasRecentlyDamaged(enemy)
  );
}

export function hasEnemyPursuitAggro(enemy) {
  return !!(enemy?.awakened || enemy?.aggro || enemy?.alerted || enemy?.isInCombat || enemy?.hasDetectedPlayer);
}

export function markEnemyEngaged(enemy) {
  enemy.awakened=true;enemy.alerted=true;enemy.isInCombat=true;enemy.hasDetectedPlayer=true;enemy.returningHome=false;
}

function disengageEnemy(enemy) {
  enemy.awakened=false;enemy.alerted=false;enemy.aggro=0;enemy.isInCombat=false;enemy.hasDetectedPlayer=false;
  enemy.lastDamagedByPlayer=false;enemy.telegraph=null;enemy.bossTell=null;
  cancelEnemyAttackPresentation(enemy);
  if(enemy.boss)enemy.boss.pendingSpecial=null;
  clearEnemyCombatTarget(enemy);
  enemy.returningHome=!!(enemy.homeGuard&&Number.isFinite(enemy.homeX)&&Number.isFinite(enemy.homeY)&&Math.hypot(enemy.x-enemy.homeX,enemy.y-enemy.homeY)>14);
  enemy.enemyState=enemy.returningHome?'returningHome':'idle';
}

export function markDungeonEnemyEngaged(enemy, targetInfo = null, state = 'pursuing') {
  if (!enemy) return enemy;

  enemy.awakened = true;
  enemy.alerted = true;
  enemy.hasDetectedPlayer = true;
  enemy.isInCombat = true;
  enemy.persistentDungeonAggro = true;
  enemy.ignoreLeash = true;
  enemy.homeReturnDisabled = true;
  enemy.returningHome = false;
  enemy.enemyState = state;
  enemy.lastDungeonAggroAt = getNowSeconds();

  const target = targetInfo?.target || null;
  if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
    enemy.lastKnownTargetPosition = {
      x: target.x,
      y: target.y
    };
  }

  return enemy;
}

export function updateAdvancedEnemyBehavior(enemy, player, world, dt, now, log, attackCooldownHandled=false) {
  if (!enemy || enemy.dead || enemy.hp <= 0) return false;
  combatParties.set(enemy,player);

  const archetype = enemy.archetype || enemy.kind;
  const eliteModifier = enemy.eliteModifier || null;
  const advanced = ADVANCED_KINDS.has(archetype) || eliteModifier;

  if (!advanced) return false;

  ensureAdvancedState(enemy, archetype, eliteModifier);
  updateAdvancedTimers(enemy, dt, attackCooldownHandled);
  applyEliteAura(enemy, world, dt, now);

  const targetInfo = chooseEnemyTarget(enemy, player, world);
  if (!targetInfo?.target) {enemy.telegraph=null;cancelEnemyAttackPresentation(enemy);return true;}

  if (shouldRemainDormant(enemy, world, targetInfo, archetype)) {
    cancelEnemyAttackPresentation(enemy);
    return true;
  }
  if(updateEnemyApproachOnly(enemy,player,world,dt,targetInfo))return true;
  if(updateChargeTravel(enemy,world,dt,now,log))return true;

  if(updateBasicEnemyAttack(enemy,world,dt,now,(target,multiplier)=>{
    if(canEnemyHitTarget(enemy,target,world))applyTargetDamage(enemy,target,Math.max(1,Math.ceil((enemy.damage||enemy.dmg||5)*multiplier)),world,log);
  }))return true;

  if (enemy.telegraph?.time > 0) {
    updateTelegraph(enemy, targetInfo.target, world, dt, now, log);
    return true;
  }

  if (enemy.telegraphRecoveryTimer > 0) {enemy.enemyState='recovering';return true;}

  if(updateEnemyTacticalMovement(enemy,targetInfo.target,world,dt,now))return true;
  if(waitForAlliedMajorAttack(enemy,world,now))return true;

  if (eliteModifier === 'fleeing') return updateFleeingRare(enemy, targetInfo, world, dt, now, log);
  if (eliteModifier === 'blink') {
    tryEliteBlink(enemy, targetInfo, world, now, log);
  }
  if (archetype === 'archer') return updateArcher(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'cultist') return updateCultist(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'gravePriest') return updateGravePriest(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'brute') return updateBrute(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'wraith') return updateWraith(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'exploder') return updateExploder(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'shieldKnight') return updateShieldKnight(enemy, targetInfo, world, dt, now, log);
  if (archetype === 'stalkerWolf') return updateStalkerWolf(enemy, targetInfo, world, dt, now, log);

  return updateBasicBeast(enemy, targetInfo, world, dt, now, log);
}

export function updateEnemyApproachOnly(enemy,player,world,dt,chosen=null){
  const info=chosen||chooseEnemyTarget(enemy,player,world);
  if(!info?.target)return false;
  const target=info.target,visible=enemyWithinTargetView(enemy,target,world);
  const archetype=enemy.archetype||enemy.kind;
  const ranged=['archer','cultist','gravePriest'].includes(archetype);
  const reach=enemy.isBoss||enemy.worldBoss?Math.max(320,enemy.attackRange||0):Math.min(360,Math.max(ranged?230:250,enemy.attackRange||0));
  const persistent=isPersistentDungeonEnemy(enemy,world)&&hasPersistentDungeonAggro(enemy);
  const engaged=hasEnemyPursuitAggro(enemy);
  const sight=canEnemyHitTarget(enemy,target,world);
  const nearScreen=enemyWithinTargetView(enemy,target,world,engaged?ENEMY_PURSUIT_MARGIN:80);
  if(!persistent&&(!nearScreen||!engaged&&!sight)){
    disengageEnemy(enemy);return true;
  }
  if(isPersistentDungeonEnemy(enemy,world))markDungeonEnemyEngaged(enemy,info);
  else markEnemyEngaged(enemy);
  if(visible&&info.distance<=reach)return false;
  // Cancel a windup that left the target's screen. It must be shown anew once
  // the attacker approaches; re-entering cannot instantly release an old cast.
  enemy.telegraph=null;
  cancelEnemyAttackPresentation(enemy);
  if(enemy.boss)enemy.boss.pendingSpecial=null;
  enemy.enemyState='pursuing';
  advanceToward(enemy,target,enemy.speed*(enemy.slowTimer>0?.45:1)*dt,world,info);
  return true;
}

export function updateHomeGuardBehavior(enemy, player, world, dt) {
  if (!enemy?.homeGuard || !Number.isFinite(enemy.homeX) || !Number.isFinite(enemy.homeY)) {
    return false;
  }

  if (isPersistentDungeonEnemy(enemy, world) && hasPersistentDungeonAggro(enemy)) {
    markDungeonEnemyEngaged(enemy, null, enemy.enemyState === 'attacking' ? 'attacking' : 'pursuing');
    return false;
  }

  const engaged=hasEnemyPursuitAggro(enemy);
  if(engaged||enemy.returningHome){
    const info=chooseEnemyTarget(enemy,player,world);
    if(info && (engaged&&enemyWithinTargetView(enemy,info.target,world,ENEMY_PURSUIT_MARGIN) || enemy.returningHome&&enemyWithinTargetView(enemy,info.target,world,80)&&canEnemyHitTarget(enemy,info.target,world))){
      markEnemyEngaged(enemy);return false;
    }
    if(engaged)disengageEnemy(enemy);
  }

  const party = [
    player,
    ...(player?.coop?.players || []).filter(ally => ally && ally.active !== false)
  ].filter(Boolean);
  const nearestPartyDistance = party.reduce((best, member) => {
    return Math.min(best, Math.hypot((member.x || 0) - enemy.x, (member.y || 0) - enemy.y));
  }, Infinity);
  const leashRadius = Math.max(180, Number(enemy.leashRadius || 520));
  const homeDistance = Math.hypot(enemy.homeX - enemy.x, enemy.homeY - enemy.y);

  if (!enemy.returningHome && nearestPartyDistance <= leashRadius && homeDistance <= leashRadius) return false;

  disengageEnemy(enemy);
  enemy.returningHome = homeDistance > 14;
  enemy.enemyState = 'returningHome';
  clearEnemyCombatTarget(enemy);

  if (!enemy.returningHome) {
    enemy.x = enemy.homeX;
    enemy.y = enemy.homeY;
    enemy.enemyState = 'idle';
    return true;
  }

  moveToward(enemy, { x: enemy.homeX, y: enemy.homeY }, Math.max(18, enemy.speed * 0.78) * dt, world);
  return true;
}

export function createEnemyArchetype(kind, name, tx, ty, options = {}) {
  const stats = getArchetypeStats(kind, options);

  return applyCoopAggroRange(applyEnemyStrengthScaling({
    id: options.id || `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    archetype: kind,
    name: name || stats.name,
    x: tx * 32,
    y: ty * 32,
    r: stats.r,
    radius: stats.r,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    dmg: stats.damage,
    xp: stats.xp,
    speed: stats.speed,
    aggroRange: stats.aggroRange,
    attackRange: stats.attackRange,
    attackRate: stats.attackRate,
    attackCooldown: 0,
    eliteModifier: options.eliteModifier || null,
    tier: options.tier || 1,
    dead: false,
    remove: false,
    ...options
  }), stats.aggroRange);
}

function ensureAdvancedState(enemy, archetype, eliteModifier) {
  applyEnemyStrengthScaling(enemy);
  applyCoopAggroRange(enemy, getArchetypeWakeRange(archetype));
  enemy.archetype = archetype;
  enemy.attackCooldown = enemy.attackCooldown ?? 0;
  enemy.specialCooldown = enemy.specialCooldown ?? randomRange(0.4, 1.3);
  enemy.telegraph = enemy.telegraph || null;
  enemy.behaviorTimer = enemy.behaviorTimer || 0;
  enemy.telegraphRecoveryTimer = enemy.telegraphRecoveryTimer || 0;
  enemy.chargeCooldown = enemy.chargeCooldown ?? randomRange(1.2, 2.8);
  enemy.pursuitBurstCooldown = enemy.pursuitBurstCooldown ?? randomRange(0.8, 2.4);
  enemy.pursuitBurstTimer = enemy.pursuitBurstTimer ?? 0;
  enemy.eliteModifier = eliteModifier || enemy.eliteModifier || null;

  if (enemy.eliteModifier && !enemy.eliteInitialized) {
    applyEliteStats(enemy);
    enemy.eliteInitialized = true;
  }
}

function updateAdvancedTimers(enemy, dt, attackCooldownHandled=false) {
  if(!attackCooldownHandled)enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - dt);
  enemy.specialCooldown = Math.max(0, (enemy.specialCooldown || 0) - dt);
  enemy.chargeCooldown = Math.max(0, (enemy.chargeCooldown || 0) - dt);
  enemy.pursuitBurstCooldown = Math.max(0, (enemy.pursuitBurstCooldown || 0) - dt);
  enemy.pursuitBurstTimer = Math.max(0, (enemy.pursuitBurstTimer || 0) - dt);
  enemy.behaviorTimer = Math.max(0, (enemy.behaviorTimer || 0) - dt);
  enemy.telegraphRecoveryTimer = Math.max(0, (enemy.telegraphRecoveryTimer || 0) - dt);
  enemy.eliteBlinkCooldown = Math.max(0, (enemy.eliteBlinkCooldown || 0) - dt);
}

function updateBasicBeast(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (tryStartChargeAttack(enemy, targetInfo, world, 'chargeRush', { minDistance: 70, maxDistance: 190 })) {
    return true;
  }

  if (targetInfo.distance > 28) {
    advanceToward(enemy, target, enemy.speed * dt, world, targetInfo);
    return true;
  }

  meleeHit(enemy, target, world, log, 1, now);
  return true;
}

function updateStalkerWolf(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (enemy.behaviorTimer > 0) {
    moveAway(enemy, target, enemy.speed * 0.72 * dt, world);
    return true;
  }

  if (tryStartChargeAttack(enemy, targetInfo, world, 'chargeRush', { minDistance: 72, maxDistance: 220, cooldown: 3.2 })) {
    return true;
  }

  if (targetInfo.distance > 64) {
    advanceToward(enemy, target, enemy.speed * dt, world, targetInfo);
    return true;
  }

  if (enemy.specialCooldown <= 0) {
    startTelegraph(enemy, 'lunge', target, 0.45, 64, '#ffcc66');
    enemy.specialCooldown = 2.6;
    return true;
  }

  circleTarget(enemy, target, enemy.speed * 0.45 * dt, world);
  return true;
}

function updateShieldKnight(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (tryStartChargeAttack(enemy, targetInfo, world, 'shieldCharge', { minDistance: 76, maxDistance: 210, cooldown: 4.2 })) {
    return true;
  }

  if (targetInfo.distance > 34) {
    advanceToward(enemy, target, enemy.speed * dt, world, targetInfo);
    return true;
  }

  if (enemy.specialCooldown <= 0) {
    startTelegraph(enemy, 'guardBreak', target, 0.75, 46, '#ffcc66');
    enemy.specialCooldown = 3.8;
    return true;
  }

  meleeHit(enemy, target, world, log, 0.85, now);
  return true;
}

function updateArcher(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (shouldAdvanceRangedEnemyForSight(enemy, target, world) && targetInfo.distance > 42) {
    enemy.enemyState = 'pursuing';
    advanceToward(enemy, target, enemy.speed * 0.72 * dt, world, targetInfo);
    return true;
  }

  if (targetInfo.distance < 96 && mayEnemyKite(enemy,now)) {
    moveAway(enemy, target, enemy.speed * getDungeonMovementPressure(enemy, targetInfo.distance) * dt, world);
    return true;
  }

  if (targetInfo.distance > 230) {
    advanceToward(enemy, target, enemy.speed * 0.65 * dt, world, targetInfo);
    return true;
  }

  if (enemy.attackCooldown <= 0) {
    startTelegraph(enemy, 'arrowShot', target, 0.42, 220, '#d9ad4f');
    enemy.attackCooldown = 1.64;
  }

  return true;
}

function updateCultist(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (shouldAdvanceRangedEnemyForSight(enemy, target, world) && targetInfo.distance > 42) {
    enemy.enemyState = 'pursuing';
    advanceToward(enemy, target, enemy.speed * 0.72 * dt, world, targetInfo);
    return true;
  }

  if (targetInfo.distance < 82 && mayEnemyKite(enemy,now)) {
    moveAway(enemy, target, enemy.speed * 0.8 * getDungeonMovementPressure(enemy, targetInfo.distance) * dt, world);
    return true;
  }

  if (tryStartChargeAttack(enemy, targetInfo, world, resolveCasterChargeKind(enemy), { minDistance: 86, maxDistance: 210, cooldown: 5.6 })) {
    return true;
  }

  if (enemy.specialCooldown <= 0) {
    enemy.castPatternIndex = (enemy.castPatternIndex || 0) + 1;
    const cursedGround = enemy.castPatternIndex % 2 === 0;
    startTelegraph(enemy, cursedGround ? 'cursedGround' : 'summonMinion', target, cursedGround ? 0.72 : 0.8, cursedGround ? 82 : 70, '#b68cff');
    enemy.specialCooldown = cursedGround ? 5.4 : 7.5;
    return true;
  }

  if (enemy.attackCooldown <= 0) {
    startTelegraph(enemy, 'curseBolt', target, 0.55, 200, '#b68cff');
    enemy.attackCooldown = 1.886;
  }

  return true;
}

function updateFleeingRare(enemy, targetInfo, world, dt, now, log) {
  enemy.escapeTimer = Number.isFinite(enemy.escapeTimer) ? enemy.escapeTimer - dt : 11;

  if (enemy.escapeTimer <= 0) {
    enemy.remove = true;
    log?.(`${enemy.name || 'A relic-bearer'} escaped with its prize.`);
    return true;
  }

  if (enemy.escapeNoticeTimer <= 0 || !Number.isFinite(enemy.escapeNoticeTimer)) {
    enemy.escapeNoticeTimer = 1.2;
    addStatusText(enemy, enemy.escapeTimer < 3.5 ? 'Escaping!' : 'Relic-bearer', {
      color: '#ffcc66',
      ttl: 0.8
    });
    spawnPulse(world, enemy.x, enemy.y, '#ffcc66', 28, 'enemyPulse');
  }

  enemy.escapeNoticeTimer -= dt;
  moveAway(enemy, targetInfo.target, enemy.speed * 1.18 * dt, world);
  return true;
}

function updateGravePriest(enemy, targetInfo, world, dt, now, log) {
  if (enemy.specialCooldown <= 0) {
    const healed = healNearbyEnemies(enemy, world);
    enemy.specialCooldown = healed ? 4.8 : 2.0;
    if (healed) return true;
  }

  return updateCultist(enemy, targetInfo, world, dt, now, log);
}

function updateBrute(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (tryStartChargeAttack(enemy, targetInfo, world, resolveBruteChargeKind(enemy), { minDistance: 82, maxDistance: 230, cooldown: 4.4 })) {
    return true;
  }

  if (targetInfo.distance > 42) {
    advanceToward(enemy, target, enemy.speed * dt, world, targetInfo);
    return true;
  }

  if (enemy.attackCooldown <= 0) {
    startTelegraph(enemy, 'slam', target, 0.9, 74, '#ef6f6c');
    enemy.attackCooldown = 2.624;
  }

  return true;
}

function updateWraith(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (enemy.specialCooldown <= 0 && targetInfo.distance > 74 && targetInfo.distance <= 260) {
    if (tryStartChargeAttack(enemy, targetInfo, world, 'spectralLunge', { minDistance: 90, maxDistance: 260, cooldown: 4.2, force: true })) {
      enemy.specialCooldown = Math.max(enemy.specialCooldown || 0, 1.2);
      return true;
    }
    teleportNear(enemy, target, world);
    enemy.specialCooldown = 4.8;
    return true;
  }

  if (targetInfo.distance > 36) {
    advanceToward(enemy, target, enemy.speed * dt, world, targetInfo);
    return true;
  }

  if (enemy.attackCooldown <= 0) {
    startTelegraph(enemy, 'phaseStrike', target, 0.38, 48, '#b68cff');
    enemy.attackCooldown = 1.435;
  }

  return true;
}

function updateExploder(enemy, targetInfo, world, dt, now, log) {
  const target = targetInfo.target;

  if (targetInfo.distance > 46) {
    advanceToward(enemy, target, enemy.speed * 1.18 * dt, world, targetInfo);
    return true;
  }

  if (!enemy.exploding || enemy.telegraph?.kind!=='detonate') {
    enemy.exploding = true;
    startTelegraph(enemy, 'detonate', target, 1.0, 72, '#ef6f6c');
  }

  return true;
}

function startTelegraph(enemy, kind, target, time, radius, color, options = {}) {
  if(['curseBolt','cursedGround','summonMinion'].includes(kind))color=enemyAttackIdentity(enemy).color;
  const profile = getEnemyAttackProfile(kind);
  const windup = Math.max(Number(time || 0), Number(profile?.windup || 0));
  enemy.telegraph = {
    kind,
    profileId: profile?.id || kind,
    pose: profile?.pose || null,
    shape: profile?.shape || 'circle',
    recovery: Number(profile?.recovery || 0),
    time: windup,
    maxTime: windup,
    targetId: target.id || target.name || 'target',
    sourceX: enemy.x,
    sourceY: enemy.y,
    x: target.x,
    y: target.y,
    radius,
    color,
    locked: !!options.locked,
    chargePower: Number(options.chargePower || 1),
    chargeWidth: Number(options.chargeWidth || radius * 0.34 || 22),
    chargeTravel: Number(options.chargeTravel || radius || 120),
    blockStagger: Number(options.blockStagger || 0.85)
  };
  beginEnemyAttackPresentation(enemy,enemy.telegraph);
  enemy.enemyState='preparing';
  if(!['arrowShot','curseBolt'].includes(kind))playSfx('bossWindup',{volume:enemy.isBoss?.48:.24,throttle:.18});
}

function updateTelegraph(enemy, target, world, dt, now, log) {
  enemy.telegraph.time -= dt;
  if (!enemy.telegraph.locked && enemy.telegraph.kind !== 'cursedGround') {
    enemy.telegraph.x = target.x;
    enemy.telegraph.y = target.y;
  }

  syncEnemyAttackPresentation(enemy,enemy.telegraph,now);
  enemy.enemyState='telegraphing';

  if (enemy.telegraph.time > 0) return;

  releaseEnemyAttackPresentation(enemy,now);
  resolveTelegraph(enemy, target, world, log);
  enemy.enemyState='recovering';
  enemy.telegraph = null;
}

function resolveTelegraph(enemy, target, world, log) {
  enemy.telegraph.geometry=enemyTelegraphGeometry(enemy,enemy.telegraph);
  const kind = enemy.telegraph.kind;
  const radius = enemy.telegraph.radius || 42;
  enemy.behaviorTimer = Math.max(enemy.behaviorTimer || 0, Number(enemy.telegraph.recovery || 0));
  enemy.telegraphRecoveryTimer = Math.max(enemy.telegraphRecoveryTimer || 0, Number(enemy.telegraph.recovery || 0));
  if(!CHARGE_TELEGRAPH_KINDS.has(kind))spawnTellRelease(world, enemy, enemy.telegraph);

  if (kind === 'arrowShot' || kind === 'curseBolt') {
    const shotDistance = Math.hypot((target.x || 0) - enemy.x, (target.y || 0) - enemy.y);
    const maxRange = Math.max(radius || 0, enemy.attackRange || 0) + 60;

    if (shotDistance > maxRange) {
      spawnProjectileTrail(world, enemy.x, enemy.y, target.x, target.y, '#9facbf', 'missedShot');
      playSfx(SOUND_EVENT_KEYS.PROJECTILE_LAUNCH, { volume: 0.42, throttle: 0.05 });
      return;
    }

    if (!canEnemyHitTarget(enemy, target, world)) {
      playSfx(SOUND_EVENT_KEYS.PROJECTILE_LAUNCH, { volume: 0.28, throttle: 0.05 });
      return;
    }

    spawnProjectileTrail(world, enemy.x, enemy.y, target.x, target.y, enemy.telegraph.color, kind);
    playSfx(SOUND_EVENT_KEYS.PROJECTILE_LAUNCH, { volume: 0.48, throttle: 0.05 });
    rangedHit(enemy, target, world, log, kind === 'curseBolt' ? 1.15 : 1);
    playSfx(SOUND_EVENT_KEYS.PROJECTILE_IMPACT, { volume: 0.46, throttle: 0.05 });
    spawnImpact(world, target.x, target.y, enemy.telegraph.color, 14);
    return;
  }

  if (kind === 'summonMinion') {
    spawnMinion(enemy, world);
    return;
  }

  if (kind === 'cursedGround') {
    areaHit(enemy, target, radius, world, log, 1.2, 'Cursed Ground');
    spawnPulse(world, enemy.telegraph.x, enemy.telegraph.y, '#b68cff', radius, 'cursedGround');
    return;
  }

  if (kind === 'lunge') {
    moveToward(enemy, target, 56, world);
    areaHit(enemy, target, radius, world, log, 1.2);
    enemy.behaviorTimer = 0.65;
    return;
  }

  if (CHARGE_TELEGRAPH_KINDS.has(kind)) {
    resolveChargeAttack(enemy, target, world, log);
    return;
  }

  if (kind === 'guardBreak') {
    areaHit(enemy, target, radius, world, log, 1.45, 'Guard Break');
    return;
  }

  if (kind === 'slam') {
    areaHit(enemy, target, radius, world, log, 1.6, 'Slam');
    spawnImpact(world, enemy.x, enemy.y, '#ef6f6c', radius);
    return;
  }

  if (kind === 'phaseStrike') {
    areaHit(enemy, target, radius, world, log, 1.35, 'Phase Strike');
    return;
  }

  if (kind === 'detonate') {
    areaHit(enemy, target, radius, world, log, 1.9, 'Explosion');
    spawnImpact(world, enemy.x, enemy.y, '#ef6f6c', radius);
    enemy.hp = 0;
    enemy.dead = true;
  }
}

function spawnTellRelease(world, enemy, telegraph) {
  if(['arrowShot','curseBolt'].includes(telegraph.kind))return;
  if(telegraph.kind==='summonMinion'){
    world.effects||=[];world.effects.push({kind:'bossFlourish',x:enemy.x,y:enemy.y,color:telegraph.color,radius:24,ttl:.3,age:0});return;
  }
  const sourceCentered = isSourceCenteredTelegraph(telegraph.kind);
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'enemyTellRelease',
    layer: 'front',
    x: sourceCentered ? enemy.x : telegraph.x,
    y: sourceCentered ? enemy.y : telegraph.y,
    sourceX: enemy.x,
    sourceY: enemy.y,
    radius: telegraph.radius,
    color: telegraph.color,
    telegraphKind: telegraph.kind,
    telegraphShape: telegraph.shape,
    geometry:telegraph.geometry,
    ttl: telegraph.kind === 'slam' || telegraph.kind === 'detonate' ? 0.28 : 0.2,
    age: 0
  });
}

function isSourceCenteredTelegraph(kind) {
  return kind === 'lunge'
    || kind === 'guardBreak'
    || kind === 'slam'
    || kind === 'detonate'
    || kind === 'summonMinion'
    || kind === 'phaseStrike';
}

function chooseEnemyTarget(enemy, player, world=null) {
  const candidates = [];

  for (const member of getEnemyTargetablePlayers(player)) {
    addCandidate(candidates, member, 'player', enemy);
  }

  for (const summon of player?.summons || []) {
    if (summon?.alive !== false) addCandidate(candidates, summon, 'summon', enemy, 0.85);
  }

  for (const ally of player?.coop?.players || []) {
    if (!ally || ally.active === false) continue;
    for (const summon of ally.summons || []) {
      if (summon?.alive !== false) addCandidate(candidates, summon, 'summon', enemy, 0.85);
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  // Preserve threat ordering among targets still in pursuit range. One player
  // escaping must not make an enemy ignore another nearby party member.
  const targetInfo = (world&&!isPersistentDungeonEnemy(enemy,world)&&hasEnemyPursuitAggro(enemy)
    ?candidates.find(info=>enemyWithinTargetView(enemy,info.target,world,ENEMY_PURSUIT_MARGIN)):null) || candidates[0] || null;

  enemy.combatTargetId = getEnemyTargetId(targetInfo?.target) || null;
  enemy.combatTargetKind = targetInfo?.kind || null;

  return targetInfo;
}

function shouldRemainDormant(enemy, world, targetInfo, archetype) {
  if (SAFE_MODE_IDS.has(world?.mode) || world?.safeZone) {
    enemy.awakened = false;
    enemy.aggro = 0;
    enemy.alerted = false;
    enemy.hasDetectedPlayer = false;
    enemy.isInCombat = false;
    enemy.persistentDungeonAggro = false;
    enemy.ignoreLeash = false;
    enemy.homeReturnDisabled = false;
    enemy.returningHome = false;
    enemy.enemyState = 'idle';
    enemy.telegraph = null;
    clearEnemyCombatTarget(enemy);
    return true;
  }

  if (enemy.summonedBy || enemy.summonedByBoss) {
    enemy.awakened = true;
    return false;
  }

  const aggroRange = getWakeRange(enemy, archetype);
  const leashRange = getLeashRange(enemy, aggroRange);
  const provoked =
    enemy.awakened ||
    enemy.aggro ||
    enemy.alerted ||
    enemy.lastDamagedByPlayer ||
    enemy.hitFlash > 0 ||
    wasRecentlyDamaged(enemy);

  const hasSight = canEnemyHitTarget(enemy, targetInfo.target, world);
  const persistentDungeonEnemy = isPersistentDungeonEnemy(enemy, world);

  if (persistentDungeonEnemy) {
    const alreadyEngaged = hasPersistentDungeonAggro(enemy);

    if (!alreadyEngaged && ((!enemyWithinTargetView(enemy,targetInfo.target,world,80)) || !hasSight)) {
      enemy.telegraph = null;
      enemy.enemyState = 'idle';
      clearEnemyCombatTarget(enemy);
      return true;
    }

    markDungeonEnemyEngaged(
      enemy,
      targetInfo,
      targetInfo.distance <= (enemy.attackRange || 34) ? 'attacking' : 'pursuing'
    );
    return false;
  }

  if (!provoked && (!enemyWithinTargetView(enemy,targetInfo.target,world,80) || !hasSight)) {
    enemy.telegraph = null;
    clearEnemyCombatTarget(enemy);
    return true;
  }

  if (!hasEnemyPursuitAggro(enemy) && !enemy.isBoss && !enemy.worldBoss && targetInfo.distance > leashRange) {
    enemy.awakened = false;
    enemy.aggro = 0;
    enemy.alerted = false;
    enemy.telegraph = null;
    clearEnemyCombatTarget(enemy);
    return true;
  }

  markEnemyEngaged(enemy);
  return false;
}

function clearEnemyCombatTarget(enemy) {
  enemy.combatTargetId = null;
  enemy.combatTargetKind = null;
}

function getWakeRange(enemy, archetype) {
  if (enemy.isBoss || enemy.worldBoss) {
    return Math.max(getCoopAggroRange(enemy, DEFAULT_WAKE_RANGE), 1040);
  }

  return Math.min(MAX_WAKE_RANGE * 2, getCoopAggroRange(enemy, getArchetypeWakeRange(archetype)));
}

function getLeashRange(enemy, aggroRange) {
  if (enemy.isBoss || enemy.worldBoss) return BOSS_LEASH_RANGE;
  if (Number.isFinite(enemy.leashRadius)) return Math.max(180, enemy.leashRadius);
  return Math.max(DEFAULT_LEASH_RANGE, aggroRange + 260);
}

function shouldAdvanceRangedEnemyForSight(enemy, target, world) {
  return (isPersistentDungeonEnemy(enemy, world)?hasPersistentDungeonAggro(enemy):hasEnemyPursuitAggro(enemy)) &&
    !canEnemyHitTarget(enemy, target, world);
}

function wasRecentlyDamaged(enemy, windowSeconds = 4.5) {
  const lastDamagedAt = Number(enemy?.lastDamagedByActorAt || enemy?.lastDamagedAt || enemy?.lastHitAt || 0);
  if (!Number.isFinite(lastDamagedAt) || lastDamagedAt <= 0) return false;
  return getNowSeconds() - lastDamagedAt <= windowSeconds;
}

function getNowSeconds() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now() / 1000;
  }

  return Date.now() / 1000;
}

function addCandidate(candidates, target, kind, enemy, threatMultiplier = 1) {
  if (!target || (target.hp || 0) <= 0) return;

  const distance = Math.hypot((target.x || 0) - enemy.x, (target.y || 0) - enemy.y);
  candidates.push({
    target,
    kind,
    distance,
    score: distance * getEnemyTargetThreatMultiplier(enemy, target, kind, threatMultiplier)
  });
}

function getArchetypeWakeRange(archetype) {
  return {
    archer: 310,
    cultist: 300,
    gravePriest: 290,
    wraith: 280,
    stalkerWolf: 270,
    exploder: 245,
    brute: 245,
    shieldKnight: 245,
    basicBeast: 230
  }[archetype] || DEFAULT_WAKE_RANGE;
}

function meleeHit(enemy, target, world, log, multiplier = 1, now=performance.now()/1000) {
  if ((enemy.attackCooldown || 0) > 0) return false;
  if (!canEnemyHitTarget(enemy, target, world)) return false;

  if(!beginBasicEnemyAttack(enemy,target,now,enemy.attackRange||34,multiplier))return false;
  enemy.attackCooldown = enemy.attackRate || 1.05;

  return true;
}

function rangedHit(enemy, target, world, log, multiplier = 1) {
  if (!canEnemyHitTarget(enemy, target, world)) return false;

  const damage = Math.max(1, Math.ceil((enemy.damage || enemy.dmg || 5) * multiplier));
  applyTargetDamage(enemy, target, damage, world, log, {
    color: enemy.archetype === 'cultist' || enemy.archetype === 'gravePriest' ? '#b68cff' : '#d9ad4f',
    silentImpact:true,
    ttl: 0.75
  });
}

function areaHit(enemy, target, radius, world, log, multiplier = 1, label = null) {
  const geometry=enemy.telegraph.geometry||enemyTelegraphGeometry(enemy,enemy.telegraph);
  const damage = Math.max(1, Math.ceil((enemy.damage || enemy.dmg || 5) * multiplier));
  let hit=false;
  for(const victim of areaTargets(enemy,target)){
    if(!telegraphContainsPoint(geometry,victim.x,victim.y)||!canEnemyHitTarget(enemy,victim,world))continue;
    applyTargetDamage(enemy,victim,damage,world,log,{label,heavy:['slam','guardBreak','detonate'].includes(enemy.telegraph?.kind),color:'#ef6f6c',ttl:.85});hit=true;
  }
  return hit;
}

function areaTargets(enemy,fallback){
 const root=combatParties.get(enemy);if(!root)return [fallback];
 const party=getEnemyTargetablePlayers(root),targets=party.flatMap(p=>[p,...(p.summons||[]).filter(s=>s.alive!==false&&s.hp>0)]);
 return [...new Set(targets)].filter(t=>t&&t.hp>0&&t.active!==false&&t.joined!==false);
}

function resolveChargeAttack(enemy, target, world, log) {
  const telegraph = enemy.telegraph || {};
  const sourceX = Number(telegraph.sourceX ?? enemy.x);
  const sourceY = Number(telegraph.sourceY ?? enemy.y);
  const targetX = Number(telegraph.x ?? target.x ?? enemy.x);
  const targetY = Number(telegraph.y ?? target.y ?? enemy.y);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy) || 1;
  const dirX = dx / distance;
  const dirY = dy / distance;
  const travel = Math.min(distance, Number(telegraph.chargeTravel || telegraph.radius || 120));
  const endX = sourceX + dirX * travel;
  const endY = sourceY + dirY * travel;
  const width = Math.max(14, Number(telegraph.chargeWidth || 22));

  enemy.dirX = dirX;
  enemy.dirY = dirY;
  beginEnemyCharge(enemy,{telegraph:{...telegraph},target,sourceX,sourceY,endX,endY,dirX,dirY,width,travel,duration:Math.max(.2,Math.min(.42,travel/600)),elapsed:0,hit:false,hitTargets:new Set()});
  return true;
}

function updateChargeTravel(enemy,world,dt,now,log){
  const state=getEnemyCharge(enemy);if(!state)return false;
  const {target,telegraph,dirX,dirY,width}=state;
  const previousX=enemy.x,previousY=enemy.y;
  state.elapsed=Math.min(state.duration,state.elapsed+dt);
  const step=Math.min(state.travel/state.duration*dt,Math.hypot(state.endX-enemy.x,state.endY-enemy.y));
  moveActorWithCollision(enemy,world,dirX*step,dirY*step);
  syncEnemyCharge(enemy,state.elapsed,now);enemy.enemyState='charging';
  const blocked=Math.hypot(enemy.x-previousX,enemy.y-previousY)<step*.3;
  const geometry={shape:'line',x:previousX,y:previousY,endX:enemy.x,endY:enemy.y,width};
  for(const victim of areaTargets(enemy,target)){
    if(state.hitTargets.has(victim))continue;
    if(telegraphContainsPoint(geometry,victim.x,victim.y,Math.max(8,victim.r||victim.radius||10))&&canEnemyHitTarget(enemy,victim,world)){
      state.hit=true;state.hitTargets.add(victim);applyChargeImpact(enemy,victim,world,log,telegraph,dirX,dirY);
    }
  }
  if(state.elapsed>=state.duration||blocked){
    syncEnemyCharge(enemy,state.duration,now);
    finishEnemyCharge(enemy);enemy.enemyState='recovering';
    enemy.telegraphRecoveryTimer=Math.max(enemy.telegraphRecoveryTimer||0,Number(telegraph.recovery||.85)+(state.hit?0:.28));
    spawnImpact(world,enemy.x,enemy.y,telegraph.color||'#ef6f6c',Math.max(18,width));
    if(!state.hit)addStatusText(enemy,'Overextended',{color:'#ffcc66',ttl:.7});
  }
  return true;
}

function applyChargeImpact(enemy,target,world,log,telegraph,dirX,dirY){
  spawnImpact(world,target.x-dirX*8,target.y-18,telegraph.color||'#ef6f6c',22);

  // Clip both collision and the release trail to the distance actually travelled.
  const multiplier = getChargeDamageMultiplier(enemy, telegraph.kind) * Number(telegraph.chargePower || 1);
  const damage = Math.max(1, Math.ceil((enemy.damage || enemy.dmg || 5) * multiplier));
  const result = applyTargetDamage(enemy, target, damage, world, log, {
    label: getChargeLabel(telegraph.kind),
    heavy:true,
    color: telegraph.color || '#ef6f6c',
    ttl: 0.9
  });

  if (result?.blocked) {
    enemy.telegraphRecoveryTimer = Math.max(enemy.telegraphRecoveryTimer || 0, Number(telegraph.recovery || 0.85) + Number(telegraph.blockStagger || 0.85));
    enemy.staggerTimer = Math.max(enemy.staggerTimer || 0, 0.35);
    enemy.hitFlash = Math.max(enemy.hitFlash || 0, 0.18);
    addStatusText(enemy, 'Charge Blocked', {
      color: '#73d18a',
      ttl: 0.72
    });
    playSfx('block', { volume: 0.72, throttle: 0.08 });
  } else if ((result?.hpDamage || 0) > 0) {
    moveActorWithCollision(target, world, dirX * 22, dirY * 22);
  }

  return true;
}

export function applyTargetDamage(enemy, target, damage, world, log, options = {}) {
  if(!enemyWithinTargetView(enemy,target,world)&&!(options.arenaImpact&&world?.bossArena?.phase==='active'))return {hpDamage:0};
  const rawDamage = Math.max(1, Math.ceil(Number(damage || 1)));
  const targetIsSummon = target?.kindTag === 'summon' || target?.displayName && target?.alive !== undefined && !target?.classId;
  const now = options.now ?? performance.now() / 1000;
  // A ground impact keeps its own position for geometry and cover, while
  // retaliation, reflection and attacker control affect the actual caster.
  const damageSource = enemy.combatSource || enemy;
  let hpDamage = rawDamage;
  let blocked = false;
  let guardBroken = false;
  let bubbleAbsorbed = 0;

  if (!targetIsSummon && Number(target?.invulnerableUntil || 0) > now) {
    addFloatingText(target, 'Protected', {
      color: '#fff1b8',
      ttl: 0.48,
      size: 12
    });
    playSfx('block', { volume: 0.42, throttle: 0.08 });
    return { hpDamage: 0, blocked: false, guardBroken: false, bubbleAbsorbed: 0, protected: true };
  }

  if (!targetIsSummon && isDodgeInvulnerable(target)) {
    addFloatingText(target, 'Evade', {
      color: '#d9f7ff',
      ttl: 0.48,
      size: 12
    });
    playSfx('block', { volume: 0.42, throttle: 0.08 });
    return { hpDamage: 0, blocked: false, guardBroken: false, bubbleAbsorbed: 0, dodged: true };
  }

  if (world && !canEnemyHitTarget(enemy, target, world)) {
    return { hpDamage: 0, blocked: false, guardBroken: false, bubbleAbsorbed: 0, blockedByWall: true };
  }

  if (!targetIsSummon && target?.stamina !== undefined) {
    const result = applyDefensiveDamage(target, rawDamage, log, damageSource, world, now);
    hpDamage = result.hpDamage;
    blocked = !!result.blocked;
    guardBroken = !!result.guardBroken;
  }

  if (targetIsSummon) hpDamage = mitigateRoseMantle(target,Math.max(1,Math.ceil(hpDamage*(1-Math.min(.45,(target.armour||0)/100)))),now,world);
  else {
    if(target.buffs?.defense?.timer>0) {
      const before=hpDamage;hpDamage=Math.ceil(hpDamage*(1-Math.min(.72,target.buffs.defense.reduction||0)));
      rewardAbilitySupport(target.buffs.defense,world,before-hpDamage,now,log);
    }
    hpDamage=Math.max(1,Math.ceil(hpDamage-getArmour(target)*.18));
  }
  if (!targetIsSummon) {
    hpDamage = modifyBloodlineIncomingDamage(target, hpDamage);
    hpDamage = applyLegendaryIncomingDamage(target, hpDamage, damageSource, world, log, now);
  }
  const bubbleWard = !targetIsSummon ? getActiveBubbleWard(target, now) : null;
  if (bubbleWard && hpDamage > 0) {
    bubbleAbsorbed = Math.min(hpDamage, bubbleWard.flatAbsorb);
    rewardAbilitySupport(target.buffs.bubbleWard,world,bubbleAbsorbed,now,log);
    hpDamage = Math.max(0, hpDamage - bubbleAbsorbed);
    addFloatingText(target, `Bubble -${bubbleAbsorbed}`, {
      color: '#8feaf2',
      ttl: 0.62,
      size: 11
    });
  }

  const lightAbsorb = !targetIsSummon ? applyLightbringerShieldAbsorb(target,hpDamage,now,world,log) : {absorbed:0,remainingDamage:hpDamage};
  hpDamage = lightAbsorb.remainingDamage;
  if (lightAbsorb.absorbed > 0) addFloatingText(target,`${lightAbsorb.label} -${lightAbsorb.absorbed}`,{color:'#fff1b8',ttl:.62,size:11});
  if (!targetIsSummon) hpDamage = mitigateTechniqueDamage(target,enemy,hpDamage,now,world,log);
  if (!targetIsSummon) hpDamage = mitigateSubclassDamage(target,enemy,hpDamage,now);
  const healthLost=Math.min(Math.max(0,target.hp||0),hpDamage);
  target.hp = Math.max(0, (target.hp || 0) - hpDamage);
  if(targetIsSummon&&healthLost>0){
    target.lastHitAt=now;target.hitFlash=Math.max(target.hitFlash||0,.12);
    applySummonThornRetaliation(target,damageSource,world,healthLost,now,log,options.rootPlayer||combatParties.get(damageSource)||combatParties.get(enemy));
  }
  if(targetIsSummon&&target.hp<=0){target.alive=false;target.dead=true;target.dismissed=false;}
  if (!targetIsSummon && hpDamage > 0) {
    cancelActiveHeavyAttackCharge(target,world);
    onPlayerTookDamage(target,hpDamage,damageSource,world,log,now);
    grantOathkeeperConviction(target,now,1,'Conviction');
  }
  target.visualHitUntil = now + 0.16;

  const label = options.label
    ? hpDamage <= 0 && bubbleAbsorbed > 0
      ? `${options.label} Absorbed`
      : `${options.label} -${hpDamage}`
    : hpDamage <= 0
      ? bubbleAbsorbed > 0 ? 'Absorbed' : 'Blocked'
      : blocked
        ? `Blocked ${hpDamage}`
        : `-${hpDamage}`;

  addFloatingText(target, label, {
    color: hpDamage <= 0 && bubbleAbsorbed > 0 ? '#8feaf2' : blocked ? '#73d18a' : options.color || '#ef6f6c',
    ttl: options.ttl || 0.65,
    size: 12
  });

  if (guardBroken) {
    addFloatingText(target, 'Guard Break', {
      color: '#ffcc66',
      ttl: 0.8,
      size: 13
    });
  }
  if(!options.silentImpact&&(hpDamage>0||blocked))playSfx(blocked?'block':options.heavy?'heavyHit':'hit',{volume:options.heavy?.58:.38,throttle:.08});

  return { hpDamage, blocked, guardBroken, bubbleAbsorbed, lightAbsorbed:lightAbsorb.absorbed };
}

function canEnemyHitTarget(enemy, target, world) {
  if (!world || !enemy || !target) return true;

  return hasLineOfSight(world, enemy.x, enemy.y, target.x, target.y, {
    startSkip: 1,
    endSkip: 1
  });
}

function getActiveBubbleWard(target, now = performance.now() / 1000) {
  const ward = target?.buffs?.bubbleWard;
  if (!ward) return null;

  const until = Number(ward.until || 0);
  if (!Number.isFinite(until) || until <= now) {
    delete target.buffs.bubbleWard;
    return null;
  }

  const flatAbsorb = Math.max(0, Number(ward.flatAbsorb || 0));
  if (flatAbsorb <= 0) return null;

  return {
    until,
    flatAbsorb
  };
}

function healNearbyEnemies(enemy, world) {
  let healed = false;

  for (const ally of world?.enemies || []) {
    if (!ally || ally === enemy || ally.dead || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;

    const distance = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
    if (distance > 145) continue;

    const heal = Math.max(6, Math.ceil((enemy.damage || 8) * 0.9));
    ally.hp = Math.min(ally.maxHp || ally.hp, ally.hp + heal);
    healed = true;

    addFloatingText(ally, `+${heal}`, {
      color: '#73d18a',
      ttl: 0.75,
      size: 12
    });
  }

  if (healed) {
    spawnPulse(world, enemy.x, enemy.y, '#73d18a', 78, 'healPulse');
    addStatusText(enemy, 'Prayer', {
      color: '#73d18a',
      ttl: 0.9
    });
  }

  return healed;
}

function spawnMinion(enemy, world) {
  if((world.enemies||[]).filter(e=>e.summonedBy===enemy.id&&e.hp>0&&!e.dead).length>=3)return;
  world.enemies = world.enemies || [];
  const spawn = findNearestPassablePoint(world, enemy.x + 45, enemy.y + 45, 8);

  world.enemies.push(createEnemyArchetype('basicBeast', 'Summoned Blighted Beast', spawn.x / 32, spawn.y / 32, {
    id: `cult-summon-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    hp: 28,
    maxHp: 28,
    damage: 5,
    dmg: 5,
    xp: 6,
    speed: 64,
    summonedBy: enemy.id,
    rewardSuppressed:true,
    combatLevel:enemy.combatLevel
  }));

  spawnPulse(world, enemy.x, enemy.y, '#b68cff', 64, 'summonPulse');

  addStatusText(enemy, 'Summoned', {
    color: '#b68cff',
    ttl: 0.9
  });
}

function spawnImpact(world, x, y, color, radius) {
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'hitSpark',
    layer: 'front',
    x,
    y,
    color,
    radius,
    ttl: 0.22,
    age: 0
  });
}

function spawnPulse(world, x, y, color, radius, kind = 'enemyPulse') {
  world.effects = world.effects || [];
  world.effects.push({
    kind,
    layer: 'front',
    x,
    y,
    color,
    radius,
    ttl: 0.48,
    age: 0
  });
}

function spawnProjectileTrail(world, x, y, targetX, targetY, color, projectileKind) {
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'enemyProjectile',
    layer: 'front',
    x,
    y,
    targetX,
    targetY,
    color,
    projectileKind,
    visualProfile: projectileKind === 'curseBolt' ? 'enemyCurse' : 'enemyArrow',
    ttl: 0.26,
    age: 0
  });
}

function applyEliteStats(enemy) {
  if(enemy.encounterStatsVersion){enemy.eliteInitialized=true;return;}
  const label = eliteLabel(enemy.eliteModifier);
  if (!String(enemy.name || '').startsWith(label)) {
    enemy.name = `${label} ${enemy.name || 'Enemy'}`;
  }
  enemy.maxHp = Math.ceil((enemy.maxHp || enemy.hp || 30) * 1.45);
  enemy.hp = Math.max(enemy.hp || 1, enemy.maxHp);
  enemy.damage = Math.ceil((enemy.damage || enemy.dmg || 5) * 1.25);
  enemy.dmg = enemy.damage;
  enemy.xp = Math.ceil((enemy.xp || 10) * 1.8);

  if (enemy.eliteModifier === 'swift') enemy.speed = (enemy.speed || 50) * 1.25;
  if (enemy.eliteModifier === 'blink') enemy.speed = (enemy.speed || 50) * 1.12;
  if (enemy.eliteModifier === 'charger') {
    enemy.speed = (enemy.speed || 50) * 1.18;
    enemy.chargeCooldown = Math.min(enemy.chargeCooldown || 1.6, 1.4);
  }
  if (enemy.eliteModifier === 'summoner') {
    enemy.specialCooldown = Math.min(enemy.specialCooldown || 1.8, 1.2);
  }
  if (enemy.eliteModifier === 'armoured') enemy.maxHp = Math.ceil(enemy.maxHp * 1.25);
  if (enemy.eliteModifier === 'fleeing') {
    enemy.speed = (enemy.speed || 50) * 1.38;
    enemy.xp = Math.ceil((enemy.xp || 10) * 1.55);
  }
}

function tryEliteBlink(enemy, targetInfo, world, now, log) {
  const target = targetInfo?.target;
  if (!target || !world) return false;
  if (Number(enemy.eliteBlinkCooldown || 0) > 0) return false;
  if (targetInfo.distance < 72 || targetInfo.distance > 310) return false;

  const dx = (target.x || 0) - (enemy.x || 0);
  const dy = (target.y || 0) - (enemy.y || 0);
  const len = Math.max(1, Math.hypot(dx, dy));
  const side = ((enemy.id || '').length + Math.floor(now || 0)) % 2 === 0 ? 1 : -1;
  const desiredX = (target.x || 0) - dx / len * 46 + -dy / len * side * 32;
  const desiredY = (target.y || 0) - dy / len * 46 + dx / len * side * 32;
  const point = findNearestPassablePoint(world, desiredX, desiredY, 8);

  if (!isPassable(world, point.x, point.y)) return false;

  world.effects = world.effects || [];
  world.effects.push({
    kind: 'enemyPulse',
    layer: 'front',
    x: enemy.x,
    y: enemy.y,
    color: '#b68cff',
    radius: 30,
    ttl: 0.28,
    age: 0
  });

  enemy.x = point.x;
  enemy.y = point.y;
  enemy.eliteBlinkCooldown = 3.2 + Math.random() * 1.4;
  enemy.specialCooldown = Math.max(enemy.specialCooldown || 0, 0.45);

  world.effects.push({
    kind: 'enemyPulse',
    layer: 'front',
    x: enemy.x,
    y: enemy.y,
    color: '#b68cff',
    radius: 42,
    ttl: 0.38,
    age: 0
  });

  addStatusText(enemy, 'Blink', {
    color: '#b68cff',
    ttl: 0.45
  });
  playSfx('bossWindup', { volume: 0.34, throttle: 0.16 });
  return true;
}

function applyEliteAura(enemy, world, dt, now) {
  if (!enemy.eliteModifier || enemy.encounterStatsVersion) return;

  enemy.eliteAuraTimer = (enemy.eliteAuraTimer || 0) - dt;
  if (enemy.eliteAuraTimer > 0) return;

  enemy.eliteAuraTimer = 0.55;
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'eliteMarker',
    layer: 'front',
    x: enemy.x,
    y: enemy.y,
    color: eliteColor(enemy.eliteModifier),
    radius: (enemy.r || enemy.radius || 15) + 8,
    ttl: 0.5,
    age: 0
  });
}

function tryStartChargeAttack(enemy, targetInfo, world, fallbackKind = 'chargeRush', options = {}) {
  if (!targetInfo?.target) return false;
  if (!options.force && !enemyCanUseCharge(enemy)) return false;
  if ((enemy.chargeCooldown || 0) > 0 || (enemy.specialCooldown || 0) > 0.25) return false;

  const minDistance = Number(options.minDistance || 78);
  const maxDistance = Number(options.maxDistance || getChargeRange(enemy));
  if (targetInfo.distance < minDistance || targetInfo.distance > maxDistance) return false;
  if (countNearbyChargingEnemies(enemy, world) >= getNearbyChargeLimit(enemy)) return false;

  const target = targetInfo.target;
  const chargeKind = enemy.chargeAttackKind || fallbackKind || resolveChargeKindForEnemy(enemy);
  const color = enemy.chargeColor || getChargeColor(enemy, chargeKind);
  const windup = Number(options.windup || getChargeWindup(enemy, chargeKind));
  const radius = Number(options.radius || getChargeRange(enemy));
  const travel = Math.min(radius, Math.max(84, targetInfo.distance + 18));

  if (!canEnemyHitTarget(enemy, target, world)) return false;
  if (!hasReasonableChargeLane(enemy, target, world, travel)) return false;

  startTelegraph(enemy, chargeKind, target, windup, radius, color, {
    locked: true,
    chargePower: Number(options.power || getChargePower(enemy, chargeKind)),
    chargeWidth: Number(options.width || getChargeWidth(enemy, chargeKind)),
    chargeTravel: travel,
    blockStagger: Number(options.blockStagger || (enemy.eliteModifier || enemy.miniBoss ? 1.15 : 0.85))
  });

  enemy.chargeCooldown = Number(options.cooldown || getChargeCooldown(enemy, chargeKind));
  enemy.specialCooldown = Math.max(enemy.specialCooldown || 0, windup + 0.25);
  addStatusText(enemy, getChargeTellText(chargeKind), {
    color,
    ttl: Math.max(0.45, windup)
  });
  playSfx(SOUND_EVENT_KEYS.BOSS_WINDUP || 'bossWindup', {
    volume: enemy.eliteModifier || enemy.miniBoss ? 0.56 : 0.42,
    throttle: 0.12
  });
  return true;
}

function enemyCanUseCharge(enemy) {
  if (!enemy || enemy.summonedBy || enemy.summonedByBoss) return false;
  if (enemy.chargeThreat || enemy.eliteModifier || enemy.miniBoss || enemy.roomRole === 'bossGuard') return true;
  if (!enemy.dungeonEnemy && !enemy.dungeonThreatLevel) return false;

  const archetype = enemy.archetype || enemy.kind;
  return archetype === 'brute'
    || archetype === 'shieldKnight'
    || archetype === 'stalkerWolf'
    || archetype === 'wraith'
    || archetype === 'basicBeast';
}

function resolveChargeKindForEnemy(enemy) {
  const archetype = enemy?.archetype || enemy?.kind;
  const profile = enemy?.dungeonThreatProfile || '';
  if (profile === 'redSeal' || profile === 'dawnspire') {
    if (archetype === 'cultist' || enemy?.kind === 'demonCultist') return 'infernalRush';
    if (archetype === 'shieldKnight') return 'shieldCharge';
  }
  if (profile === 'castleVeyr' || archetype === 'wraith') return 'spectralLunge';
  if (profile === 'nephilim') return 'judgmentCharge';
  if (profile === 'vampire') return 'duelistThrust';
  if (archetype === 'shieldKnight') return 'shieldCharge';
  if (archetype === 'brute') return 'chargeRush';
  if (archetype === 'stalkerWolf' || archetype === 'basicBeast') return 'chargeRush';
  return 'chargeRush';
}

function resolveCasterChargeKind(enemy) {
  const profile = enemy?.dungeonThreatProfile || '';
  if (profile === 'redSeal' || profile === 'dawnspire' || enemy?.kind === 'demonCultist') return 'infernalRush';
  if (profile === 'nephilim') return 'judgmentCharge';
  if (profile === 'vampire') return 'duelistThrust';
  return 'spectralLunge';
}

function resolveBruteChargeKind(enemy) {
  const profile = enemy?.dungeonThreatProfile || '';
  if (profile === 'redSeal' || profile === 'dawnspire') return 'infernalRush';
  if (profile === 'thorn') return 'rootBurrowCharge';
  return 'chargeRush';
}

function getChargeColor(enemy, chargeKind) {
  if (chargeKind === 'shieldCharge') return enemy?.dungeonThreatProfile === 'redSeal' ? '#ef6f6c' : '#d9ad4f';
  if (chargeKind === 'duelistThrust') return '#b8c7d8';
  if (chargeKind === 'spectralLunge') return '#8fb6ff';
  if (chargeKind === 'infernalRush') return '#ef6f3e';
  if (chargeKind === 'rootBurrowCharge') return '#73d18a';
  if (chargeKind === 'judgmentCharge') return '#fff1b8';
  return enemy?.eliteModifier ? '#ffcc66' : '#ef8b58';
}

function getChargeTellText(chargeKind) {
  if (chargeKind === 'shieldCharge') return 'Shield Rush';
  if (chargeKind === 'duelistThrust') return 'Dash Thrust';
  if (chargeKind === 'spectralLunge') return 'Ghost Lunge';
  if (chargeKind === 'infernalRush') return 'Infernal Rush';
  if (chargeKind === 'rootBurrowCharge') return 'Root Rush';
  if (chargeKind === 'judgmentCharge') return 'Judgment Line';
  return 'Charge';
}

function getChargeLabel(chargeKind) {
  if (chargeKind === 'shieldCharge') return 'Shield Rush';
  if (chargeKind === 'duelistThrust') return 'Thrust';
  if (chargeKind === 'spectralLunge') return 'Lunge';
  if (chargeKind === 'infernalRush') return 'Rush';
  if (chargeKind === 'rootBurrowCharge') return 'Root Rush';
  if (chargeKind === 'judgmentCharge') return 'Judgment';
  return 'Charge';
}

function getChargeDamageMultiplier(enemy, chargeKind) {
  const eliteBonus = enemy?.eliteModifier || enemy?.miniBoss ? 0.28 : 0;
  if (chargeKind === 'shieldCharge') return 2.05 + eliteBonus;
  if (chargeKind === 'duelistThrust') return 1.85 + eliteBonus;
  if (chargeKind === 'spectralLunge') return 1.9 + eliteBonus;
  if (chargeKind === 'infernalRush') return 2.2 + eliteBonus;
  if (chargeKind === 'rootBurrowCharge') return 2.0 + eliteBonus;
  if (chargeKind === 'judgmentCharge') return 2.15 + eliteBonus;
  return 1.95 + eliteBonus;
}

function getChargePower(enemy, chargeKind) {
  return Math.min(1.35, 1 + Math.max(0, Number(enemy?.dungeonThreatLevel || 0) - 1) * 0.045);
}

function getChargeWindup(enemy, chargeKind) {
  const profile = getEnemyAttackProfile(chargeKind);
  const base = Number(profile?.windup || 0.72);
  return Math.max(0.46, base - Math.min(0.14, Math.max(0, Number(enemy?.dungeonDepth || 1) - 1) * 0.025));
}

function getChargeCooldown(enemy, chargeKind) {
  const depth = Math.max(1, Number(enemy?.dungeonDepth || 1));
  const elite = enemy?.eliteModifier || enemy?.miniBoss ? -0.55 : 0;
  return Math.max(2.25, 5.4 - depth * 0.32 + elite + randomRange(0.2, 1.1));
}

function getChargeRange(enemy) {
  const depth = Math.max(1, Number(enemy?.dungeonDepth || 1));
  return Math.min(260, 150 + depth * 18 + Math.max(0, Number(enemy?.dungeonThreatLevel || 0)) * 6);
}

function getChargeWidth(enemy, chargeKind) {
  if (chargeKind === 'shieldCharge') return 30;
  if (chargeKind === 'infernalRush' || chargeKind === 'rootBurrowCharge') return 28;
  if (chargeKind === 'duelistThrust') return 18;
  return enemy?.eliteModifier || enemy?.miniBoss ? 27 : 23;
}

function getNearbyChargeLimit(enemy) {
  return enemy?.miniBoss || enemy?.eliteModifier ? 2 : 1;
}

function countNearbyChargingEnemies(enemy, world) {
  let count = 0;
  for (const other of world?.enemies || []) {
    if (!other || other === enemy || other.dead || other.hp <= 0) continue;
    if (!other.telegraph || !CHARGE_TELEGRAPH_KINDS.has(other.telegraph.kind)) continue;
    if (Math.hypot((other.x || 0) - enemy.x, (other.y || 0) - enemy.y) <= 260) count++;
  }
  return count;
}

function hasReasonableChargeLane(enemy, target, world, travel) {
  if (!world) return true;
  const dx = (target.x || 0) - enemy.x;
  const dy = (target.y || 0) - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const dirX = dx / distance;
  const dirY = dy / distance;
  const checkDistance = Math.min(distance, travel || distance);

  for (let i = 1; i <= 4; i++) {
    const px = enemy.x + dirX * checkDistance * (i / 4);
    const py = enemy.y + dirY * checkDistance * (i / 4);
    if (!isPassable(world, px, py)) return false;
  }

  return true;
}

function advanceToward(enemy, target, amount, world, targetInfo = null) {
  const pressure = getDungeonMovementPressure(enemy, targetInfo?.distance ?? Math.hypot((target.x || 0) - enemy.x, (target.y || 0) - enemy.y));
  moveToward(enemy, target, amount * pressure, world);
}

function getDungeonMovementPressure(enemy, distance) {
  if (!enemy?.dungeonEnemy && !enemy?.dungeonThreatLevel && !enemy?.eliteModifier) return 1;

  if ((enemy.pursuitBurstCooldown || 0) <= 0 && distance > 96) {
    enemy.pursuitBurstTimer = 0.38 + Math.random() * 0.22;
    enemy.pursuitBurstCooldown = randomRange(2.6, 4.8);
  }

  const threat = Math.max(0, Number(enemy.dungeonThreatLevel || 0));
  const base = 1.08 + Math.min(0.24, threat * 0.035);
  const elite = enemy.eliteModifier || enemy.miniBoss ? 0.08 : 0;
  const burst = enemy.pursuitBurstTimer > 0 ? 0.28 : 0;
  return base + elite + burst;
}

function moveToward(actor, target, amount, world = null) {
  const dx = (target.x || 0) - actor.x;
  const dy = (target.y || 0) - actor.y;
  const distance = Math.hypot(dx, dy) || 1;

  const dirX = dx / distance;
  const dirY = dy / distance;
  moveActorWithCollision(actor, world, dirX * amount, dirY * amount);
  actor.dirX = dirX;
  actor.dirY = dirY;
}

function moveAway(actor, target, amount, world = null) {
  const dx = actor.x - (target.x || 0);
  const dy = actor.y - (target.y || 0);
  const distance = Math.hypot(dx, dy) || 1;

  const dirX = dx / distance;
  const dirY = dy / distance;
  moveActorWithCollision(actor, world, dirX * amount, dirY * amount);
  actor.dirX = dirX;
  actor.dirY = dirY;
}

function circleTarget(actor, target, amount, world = null) {
  const dx = actor.x - (target.x || 0);
  const dy = actor.y - (target.y || 0);
  const distance = Math.hypot(dx, dy) || 1;
  const sideX = -dy / distance;
  const sideY = dx / distance;

  moveActorWithCollision(actor, world, sideX * amount, sideY * amount);
  actor.dirX = -dx / distance;
  actor.dirY = -dy / distance;
}

function teleportNear(enemy, target, world) {
  const angle = Math.random() * Math.PI * 2;
  const oldX = enemy.x;
  const oldY = enemy.y;
  const desiredX = target.x + Math.cos(angle) * 54;
  const desiredY = target.y + Math.sin(angle) * 54;
  const safe = findNearestPassablePoint(world, desiredX, desiredY, 8);
  enemy.x = safe.x;
  enemy.y = safe.y;
  spawnPulse(world, oldX, oldY, '#b68cff', 28, 'phasePulse');
  spawnImpact(world, enemy.x, enemy.y, '#b68cff', 20);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function getArchetypeStats(kind, options = {}) {
  const tier = Math.max(1, Number(options.tier || 1));
  const scale = 1 + (tier - 1) * 0.32;
  const base = {
    basicBeast: ['Basic Beast', 42, 7, 72, 15, 26, 210, 1.0, 15],
    stalkerWolf: ['Wolf Stalker', 54, 8, 86, 15, 32, 255, 0.95, 22],
    shieldKnight: ['Shield Knight', 92, 11, 42, 16, 32, 235, 1.15, 42],
    archer: ['Archer', 58, 9, 64, 14, 190, 290, 1.6, 34],
    cultist: ['Cultist', 62, 10, 54, 14, 190, 285, 1.7, 42],
    gravePriest: ['Grave Priest', 72, 8, 46, 14, 175, 270, 1.8, 54],
    brute: ['Brute', 150, 16, 34, 21, 42, 250, 1.8, 72],
    wraith: ['Wraith', 68, 13, 74, 15, 36, 300, 1.1, 58],
    exploder: ['Exploder', 46, 18, 86, 15, 46, 280, 1.0, 28]
  }[kind] || ['Enemy', 44, 7, 58, 14, 26, 220, 1.05, 14];

  return {
    name: base[0],
    hp: Math.ceil((options.hp || base[1]) * scale),
    damage: Math.ceil((options.damage || base[2]) * scale),
    speed: options.speed || base[3],
    r: options.r || base[4],
    attackRange: options.attackRange || base[5],
    aggroRange: options.aggroRange || base[6],
    attackRate: options.attackRate || base[7],
    xp: Math.ceil((options.xp || base[8]) * scale)
  };
}

function eliteLabel(modifier) {
  if (modifier === 'burning') return 'Burning';
  if (modifier === 'frozen') return 'Frozen';
  if (modifier === 'vampiric') return 'Vampiric';
  if (modifier === 'armoured') return 'Armoured';
  if (modifier === 'blink') return 'Blink';
  if (modifier === 'charger') return 'Charging';
  if (modifier === 'summoner') return 'Rune-Mad';
  if (modifier === 'swift') return 'Swift';
  if (modifier === 'poisoned') return 'Poisoned';
  if (modifier === 'fleeing') return 'Relic-Bearer';
  return 'Elite';
}

function eliteColor(modifier) {
  if (modifier === 'burning') return '#ef6f6c';
  if (modifier === 'frozen') return '#66f0ff';
  if (modifier === 'vampiric') return '#b68cff';
  if (modifier === 'armoured') return '#d9ad4f';
  if (modifier === 'blink') return '#b68cff';
  if (modifier === 'charger') return '#ffcc66';
  if (modifier === 'summoner') return '#66f0ff';
  if (modifier === 'swift') return '#73d18a';
  if (modifier === 'poisoned') return '#6fae72';
  if (modifier === 'fleeing') return '#ffcc66';
  return '#ffcc66';
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
