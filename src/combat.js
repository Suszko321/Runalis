import {updateMalakarCombat} from './malakarCombat.js';
import {updateGroveCombat} from './blightedGroveCombat.js';
import {updateOrchardCombat} from './ashenOrchardCombat.js';
import {getAbilityEffectiveness} from './skillExpertiseSystem.js';
import {mitigateRoseMantle,roseMantleThorns} from './roseMantleSystem.js';
import {isGravecallerSustain,gravecallerSkillLifesteal,restoreGravecallerLifesteal,restoreGravecallerHealth,GRAVECALLER_SUSTAIN} from './gravecallerSustain.js';
import {recordRepeatableEnemyDeath} from './instanceEncounterMemory.js';
import {updateDungeonEvents} from './dungeonSystem.js';
import {updatePopulationPatrol} from './encounterPopulation.js';
import {separateEnemies} from './enemySeparation.js';
import {prepareEnemyTactics,updateEnemyTacticalMovement} from './enemyTactics.js';
import {updateClassMovement,presentClassMobility} from './classMovement.js';
import {updateEliteEncounters,mitigateEliteHit,clearEliteEncounters,getEliteControlMultiplier} from './eliteEncounterSystem.js';
import {updateDungeonArena} from './dungeonArenaSystem.js';
import {partyEntryPending} from './partyEntrySystem.js';
import {applyTargetDamage} from './enemyBehaviors.js';
import {getTierStatBonus} from './equipmentProgressionSystem.js';
import {applyMythicalAbilityModifiers,applyMythicalWolf,getMythicalSetCounts} from './mythicalEquipmentSystem.js';
import {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';
import { recordSupportContribution } from './encounterLedger.js';
import { progressionPower, equipmentCombatPower, summonEquipmentPower, equipmentDamageMultiplier } from './combatPower.js';
import {defensiveProtection,calculateBubbleWardDuration,calculateBubbleWardFlatAbsorb} from './protectionStats.js';
import { getEquipmentStatBonuses } from './setBonusSystem.js';
import { levelStat } from './progressionMath.js';
import { ensureEnemyProgression } from './enemyProgression.js';
import { CLASS_COMBAT_PALETTES } from './combatExpansionData.js';
import { HOTBAR_SLOT_COUNT } from './abilityLoadoutSystem.js';
import { applyAbilityMastery, recordAbilitySuccessfulUse, rewardMobilityMastery, rewardCombatPurpose, registerAbilitySupport, rewardAbilitySupport, getHostileCombatEnemies } from './abilityMasterySystem.js';
import { startAbilityChannel, stopAbilityChannel, updateAbilityChannel, getChannelMovementMultiplier } from './abilityChannelSystem.js';
import { executeCombatTechnique, updateCombatTechniques, mitigateTechniqueDamage, consumeOrbitalHalo, clearCombatTechniqueState } from './combatExpansion.js';
import { playAbilityAudioEvent } from './abilityAudio.js';
import { getBalancedAbility } from './abilityCombatProfiles.js';
import {applyCombatTempo,directHitMultiplier,attackRecoveryMultiplier,attackProjectileSpeed} from './combatTempo.js';
import {resolveSubclassAbility,resolveAbilityMorph} from './subclassVariants.js';
import {executeSubclassAbility,updateSubclassCombat,clearSubclassCombatState,mitigateSubclassDamage,getSubclassMovementMultiplier,onSubclassKill,applyFaeSummonHit,applyGardenCompanionHit} from './subclassCombat.js';
import {configureGardenSummon} from './gardenRecovery.js';
import {isSunkenDamage,sunkenDirectMultiplier,applySunkenPressure,updateSunkenPressure,clearSunkenPressure} from './sunkenPressureSystem.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
// combat.js
// Runalis combat coordinator.
// Keeps old imports stable while delegating:
// - stamina movement/defense to combatActions.js
// - basic weapon attacks/combos/hitboxes/projectiles to combatMoves.js
//
// Updated:
// - Enemy AI now attacks the actual summon object instead of a copied object.
// - Enemies choose the closest valid target: player, skeleton, lich, thornbeast, etc.
// - Summons can now be damaged, killed, and removed properly.
// - Q class skills keep stronger resource identity.
// - Grave Spark / Necrotic Bolt is an actual projectile fired toward the mouse.
// - Thorn Lash is a directional mid-range AoE aimed with the mouse.
// - Necrotic Bolt and Thorn Lash cost Spirit and have shorter cooldowns.
// - Ability projectiles remain bridged into render.js through getCombatProjectiles().

import { ITEMS, ABILITIES, getAbilityById, getAbilitySkillRequirement } from './data.js';
import {configureLichSummon,configureBoundDeadSummon,isBoundDeadMorph,onLichSummonHit,emitLichArrival} from './lichSummonSystem.js';
import {beginGravecallerMotion,finishGravecallerMotion} from './gravecallerSummonMotion.js';
import {beginPetalSummonMotion,finishPetalSummonMotion} from './petalknightSummonArt.js';
import {hellstalkerDamageInvestment} from './hellstalkerSkills.js';
import {fellhunterAbilityPower,fellhunterToolAnimation} from './fellhunterWeapons.js';
import {resolveSummonMovementSpeed} from './summonMovementSpeed.js';
import {assignCompanionFormation,companionFollowPoint,companionCombatPoint,findCompanionRoom,separateCompanions,summonTactics,companionNavigationPoint} from './summonPositioning.js';
import {updateOutOfCombatRecovery,refillExplorationStamina} from './outOfCombatRecovery.js';
import {beginBasicEnemyAttack,updateBasicEnemyAttack,cancelEnemyAttackPresentation,getBasicEnemyAttack,getEnemyCharge} from './enemyAttackPresentation.js';
import {completeDungeonAfterBoss} from './dungeonCompletion.js';
import {recordBossReturnVictory} from './bossReturnPortals.js';

import {
  gainXp,
  getPower,
  getArmour,
  migratePlayer
} from './player.js';

import { addFloatingText,updateFloatingTexts } from './floatingText.js';

import {
  ensureActionState,
  updateStaminaActions,
  getMovementSpeedMultiplier,
  getDashVelocity,
  isBlocking,
  isDashing,
  isDodgeInvulnerable,
  applyDefensiveDamage,
  spendStamina
} from './combatActions.js';

import {
  ensureCombatState,
  requestBasicAttack,
  updateBasicAttackInput,
  updateWeaponCombat,
  cancelHeavyAttackCharge,
  getCurrentAttackVisual,
  getProjectiles,
  getAimDirection
} from './combatMoves.js';

import {
  markKillObjective,
  markPartyDungeonClearedObjective
} from './dialogueSystem.js';

import {
  unlockDungeonMiniBossRewards
} from './dungeonSystem.js';

import {
  createEnemyLootDrops
} from './lootSystem.js';

import {
  updateBossFramework,
  applyBossDefeatRewards
} from './bossSystem.js';

import {
  hasPersistentDungeonAggro,
  hasEnemyPursuitAggro,
  markEnemyEngaged,
  isPersistentDungeonEnemy,
  markDungeonEnemyEngaged,
  updateAdvancedEnemyBehavior,
  updateHomeGuardBehavior
} from './enemyBehaviors.js';
import {updateEnemyApproachOnly} from './enemyBehaviors.js';
import {setEnemyCombatViews,enemyWithinTargetView,ENEMY_PURSUIT_MARGIN} from './enemyVisibility.js';
import { recordPoiEnemyDefeat } from './poiEncounterSystem.js';

import {
  getSkillTreeBonuses,
  getSkillTreeNodesByTree,
  isSkillTreeNodeUnlocked
} from './skillTreeSystem.js';

import {
  getAbilityUseChargeState,
  spendAbilityUseCharge
} from './abilityChargeSystem.js';

import {
  getAbilityAvailability
} from './abilityLoadoutSystem.js';

import {
  playSfx
} from './audioSystem.js';

import {
  hasLineOfSight,
  isPassable,
  moveActorWithCollision
} from './world.js';
import { getSignatureAbilityProfile } from './animationProfiles.js';

import {
  normalizeAimVector, resolveActorCombatAim
} from './combatAim.js';

import {
  applyEnemyStrengthScaling
} from './enemyScaling.js';

import {
  applyLegendaryIncomingDamage,
  applyLegendaryOutgoingDamage,
  onLegendaryEnemyKilled,
  getLegendaryLifestealPct,
  updateLegendarySummons
} from './legendarySystem.js';

import {
  isActorControlLockedByRevive
} from './coopReviveSystem.js';

import {
  isPvpActorEliminated,
  updatePvpCombatForActor
} from './pvpArenaSystem.js';

import {
  applyCoopAggroRange,
  getCoopAggroRange,
  getEnemyTargetId,
  getEnemyTargetablePlayers,
  getEnemyTargetThreatMultiplier
} from './coopEnemyScaling.js';

import {
  cycleHydromancerFlow,
  ensurePassiveState,
  onPlayerTookDamage
} from './classPassives.js';

import {
  applyAbilityCharge,
  beginAbilityCharge,
  canChargeAbility,
  cancelAbilityCharge,
  getChargeDurationMultiplier,
  getChargeStaggerMultiplier,
  releaseAbilityCharge,
  updateAbilityCharge
} from './chargeSystem.js';

import {
  getBloodlineCombatModifiers,
  getPlayerBloodlineId,
  modifyBloodlineHealing,
  modifyBloodlineIncomingDamage
} from './bloodlineSystem.js';
import {
  recordEnemyDeathVisual,
  recordEnemyHitReaction,
  recordEnemyContactImpact,
  SOUND_EVENT_KEYS
} from './combatFeedbackProfiles.js';
import {
  grantSharedCombatKillXp,
  recordEnemyCombatContribution
} from './combatProgression.js';

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

function isGravecaller(playerOrClassId) {
  const classId = typeof playerOrClassId === 'string'
    ? playerOrClassId
    : playerOrClassId?.classId;
  return normalizeClassId(classId) === 'gravecaller';
}

function isOathkeeper(playerOrClassId) {
  const classId = typeof playerOrClassId === 'string'
    ? playerOrClassId
    : playerOrClassId?.classId;
  return normalizeClassId(classId) === 'oathkeeper';
}

function isFellhunter(playerOrClassId) {
  const classId = typeof playerOrClassId === 'string'
    ? playerOrClassId
    : playerOrClassId?.classId;
  return normalizeClassId(classId) === 'fellhunter';
}

const UNIVERSAL_PLAYER_HEAL_INTERVAL = 10;
const UNIVERSAL_PLAYER_HEAL_AMOUNT = 1;
const FELLHUNTER_EXPOSED_DURATION = 4.0;
const FELLHUNTER_TACTICAL_ADVANTAGE_DURATION = 2.75;
const FELLHUNTER_MAX_GADGETS = 8;
const THORNBINDER_WOUND_CAP = 4;
const THORNBINDER_WOUND_DURATION = 6.5;
const THORNBINDER_WOUND_TICK_INTERVAL = 1.25;
const THORNBINDER_BRIAR_BLOOM_DURATION = 7.5;
const THORNBINDER_BRIAR_BLOOM_TICK = 2.2;
const THORNBINDER_BRIAR_BLOOM_RADIUS = 170;

// -----------------------------------------------------------------------------
// Q ABILITY BALANCE OVERRIDES
// -----------------------------------------------------------------------------

const Q_ABILITY_OVERRIDES = {
  graveSpark: {
    aliases: ['graveSpark', 'necroticBolt', 'necrotic bolt', 'grave spark'],
    costType: 'spirit',
    cost: 12,
    cd: 0.4,
    range: 600
  },

  vineWhip: {
    aliases: ['thornbinderThornLash', 'vineWhip', 'vineLash', 'vine lash', 'thorn lash'],
    costType: 'spirit',
    cost: 7,
    cd: 0.55,
    range: 250
  }
};

// -----------------------------------------------------------------------------
// MAIN PUBLIC UPDATE HOOKS
// -----------------------------------------------------------------------------

export function attack(player, world, log, now, input = null) {
  ensureCombatPlayer(player);
  ensureActionState(player);
  ensureCombatState(player);

  if (isActorControlLockedByRevive(player)) return false;

  const safeInput = input || buildFallbackInputFromPlayer(player);

  return requestBasicAttack(player, world, safeInput, log, now);
}

export function updateCombat(player, world, input, dt, now, log) {
  ensureCombatPlayer(player);
  ensureActionState(player);
  ensureCombatState(player);
  ensureAbilityProjectileState(player);

  if (isPvpActorEliminated(player, world)) {
    clearSunkenPressure(player);
    clearSubclassCombatState(player,'controlLocked');
    cancelHeavyAttackCharge(player, world);
    clearCombatTechniqueState(player, 'controlLocked');
    return;
  }

  if (isActorControlLockedByRevive(player)) {
    clearSunkenPressure(player);
    clearSubclassCombatState(player,'controlLocked');
    cancelHeavyAttackCharge(player, world);
    clearCombatTechniqueState(player, 'controlLocked');
    return;
  }

  const safeInput = input || buildFallbackInputFromPlayer(player);

  updateOutOfCombatRecovery(player,world,safeInput,dt,now);
  updateUniversalPlayerHeal(player, dt);
  updateStaminaActions(player, safeInput, dt, now, log);
  updateClassMovement(player,world,dt,now);

  const abilityInput = player.activeChannel ? {...safeInput,attackPressed:false,attackHeld:false} : safeInput;
  updateBasicAttackInput(player, world, abilityInput, dt, now, log);

  updateWeaponCombat(player, world, safeInput, dt, now, log);
  updateAbilityProjectiles(player, world, dt, now, log);
  updateFellhunterGadgets(player, world, dt, now, log);
  updateOathkeeperConsecratedGround(player, world, dt, now, log);
  updateThornbinderEffects(player, world, dt, now, log);
  updateSubclassCombat(player,world,safeInput,dt,now,combatTechniqueHooks(player,world,log,now,safeInput));
  updateLightbringerChannel(player, world, safeInput, dt, now, log);
  updateCombatTechniques(player,world,safeInput,dt,now,combatTechniqueHooks(player,world,log,now,safeInput));
  updateSunkenPressure(player,world,now,(enemy,damage,skill,options)=>damageEnemyDirect(player,world,enemy,damage,skill,log,{...options,now}),fx=>spawnWorldEffect(world,fx));
  updatePvpCombatForActor(player, world, safeInput, now, log);
  refillExplorationStamina(player);
}

function updateUniversalPlayerHeal(player, dt) {
  if (!player) return;

  const maxHp = Math.max(1, Number(player.maxHp || 1));
  const currentHp = Number(player.hp || 0);

  if (currentHp <= 0 || currentHp >= maxHp) {
    player.universalHealTimer = 0;
    return;
  }

  player.universalHealTimer = Math.max(0, Number(player.universalHealTimer || 0)) + Math.max(0, Number(dt || 0));

  if (player.universalHealTimer < UNIVERSAL_PLAYER_HEAL_INTERVAL) return;

  const ticks = Math.floor(player.universalHealTimer / UNIVERSAL_PLAYER_HEAL_INTERVAL);
  player.universalHealTimer -= ticks * UNIVERSAL_PLAYER_HEAL_INTERVAL;

  const missingHp = Math.max(0, maxHp - currentHp);
  const heal = Math.min(missingHp, ticks * UNIVERSAL_PLAYER_HEAL_AMOUNT);
  player.hp = Math.min(maxHp, currentHp + heal);

  if (player.hp >= maxHp) {
    player.universalHealTimer = 0;
  }
}

function ensureThornbinderState(player) {
  player.thornbinder = player.thornbinder && typeof player.thornbinder === 'object'
    ? player.thornbinder
    : {};

  player.thornbinder.briarBloomUntil = Math.max(0, Number(player.thornbinder.briarBloomUntil || 0));
  player.thornbinder.briarBloomNextTickAt = Math.max(0, Number(player.thornbinder.briarBloomNextTickAt || 0));
  player.thornbinder.briarBloomRadius = Math.max(0, Number(player.thornbinder.briarBloomRadius || THORNBINDER_BRIAR_BLOOM_RADIUS));
  return player.thornbinder;
}

function updateThornbinderEffects(player, world, dt, now, log) {
  if (!player || player.classId !== 'thornbinder') return;

  const state = ensureThornbinderState(player);
  updateThornbinderBramblePatch(player, world, state, now, log);
  updateThornbinderVerdantWounds(player, world, now);
  updateBriarBloomAura(player, world, state, now);
}

function grantBriarBloom(player, world, now, durationBonus = 0, options = {}) {
  if (!player || player.classId !== 'thornbinder') return;

  const state = ensureThornbinderState(player);
  const bonuses = getSkillTreeBonuses(player);
  const duration = options.active
    ? Math.max(4, Number(durationBonus || THORNBINDER_BRIAR_BLOOM_DURATION))
    : THORNBINDER_BRIAR_BLOOM_DURATION + Math.max(0, Number(durationBonus || 0));
  const healingBoost = Math.max(0, Number(bonuses.briarBloomHealingPct || 0)) / 100;

  state.briarBloomUntil = Math.max(state.briarBloomUntil || 0, now + duration);
  state.briarBloomNextTickAt = state.briarBloomNextTickAt > now ? state.briarBloomNextTickAt : now + 0.6;
  state.briarBloomRadius = Math.max(options.radius || 0, THORNBINDER_BRIAR_BLOOM_RADIUS * (1 + Math.max(0, bonuses.briarBloomRadiusPct || 0) / 100));
  state.briarBloomHealingScalar = 1 + healingBoost + (isNearElderThornbeast(player) ? 0.18 : 0);

  if (world && options.active) {
    spawnWorldEffect(world, {
      kind: 'thornbinderBriarBloom',
      layer: 'front',
      x: player.x,
      y: player.y,
      radius: state.briarBloomRadius,
      ttl: 0.52,
      active: true
    });
  }
}

function updateBriarBloomAura(player, world, state, now) {
  if (!state || Number(state.briarBloomUntil || 0) <= now) return;
  if (Number(state.briarBloomNextTickAt || 0) > now) return;

  state.briarBloomNextTickAt = now + THORNBINDER_BRIAR_BLOOM_TICK;

  const warding = getSkillLevel(player, 'warding');
  const baseHeal = Math.max(1, Math.floor(1 + warding * 0.045));
  const heal = Math.max(1, Math.floor(baseHeal * Number(state.briarBloomHealingScalar || 1)));
  const radius = Number(state.briarBloomRadius || THORNBINDER_BRIAR_BLOOM_RADIUS);

  forPartyNear(player, radius, member => {
    if (!member || member.hp <= 0) return;
    const finalAmount = modifyBloodlineHealing(member, heal);
    member.hp = Math.min(member.maxHp || member.hp || 1, (member.hp || 0) + finalAmount);
  });

  for (const summon of player.summons || []) {
    if (!summon || summon.alive === false || summon.hp <= 0 || summon.kind !== 'thornbeast') continue;
    const distance = Math.hypot((summon.x || 0) - player.x, (summon.y || 0) - player.y);
    if (distance > radius) continue;
    const summonHealScalar = summon.summonPath === 'evolved' ? 0.75 : 0.35;
    summon.hp = Math.min(summon.maxHp || summon.hp || 1, (summon.hp || 0) + Math.max(1, Math.floor(heal * summonHealScalar)));
  }

  if (world) {
    spawnWorldEffect(world, {
      kind: 'thornbinderBriarBloom',
      layer: 'front',
      x: player.x,
      y: player.y,
      radius,
      ttl: 0.48
    });
  }
}

function updateThornbinderBramblePatch(player, world, state, now, log) {
  const patch = state?.bramblePatch;
  if (!patch) return;

  if (now >= Number(patch.until || 0)) {
    state.bramblePatch = null;
    return;
  }

  if (Number(patch.nextTickAt || 0) > now) return;

  patch.nextTickAt = now + Math.max(0.45, Number(patch.tickInterval || 0.95));
  const targets = findEnemiesInRadius(world, patch.x, patch.y, patch.radius, 10);

  for (const info of targets) {
    const enemy = info.enemy;
    if(enemy.arenaDormant)continue;
    const scalar = getEnemyControlScalar(enemy);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.05 * scalar * getAbilityEffectiveness(player,patch.sourceAbilityId));
    applyVerdantWound(player, enemy, world, now, patch.woundStacks || 1, { sourceAbilityId: patch.sourceAbilityId, tickDamage: patch.damage });
    applyThornbinderDotDamage(player, enemy, world, Math.max(1, Number(patch.damage || 1)), 'Bramble Patch', now, patch.sourceAbilityId);
  }
}

function updateThornbinderVerdantWounds(player, world, now) {
  for (const enemy of world?.enemies || []) {
    const wound = enemy?.verdantWound;
    if (!wound || (wound.sources?.length ? !wound.sources.some(source=>source.owner===player) : wound.owner && wound.owner !== player)) continue;

    if (enemy.dead || enemy.hp <= 0 || enemy.remove || now >= Number(wound.until || 0)) {
      delete enemy.verdantWound;
      continue;
    }

    const scalar = getEnemyControlScalar(enemy);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.5 * scalar);

    if (Number(wound.nextTickAt || 0) > now) continue;

    wound.nextTickAt = now + THORNBINDER_WOUND_TICK_INTERVAL;
    const damage = Math.max(1, Math.ceil(Number(wound.tickDamage || 2) * Math.max(1, Number(wound.stacks || 1)) * 0.72));
    const sources=(wound.sources||[]).filter(source=>source.until>now);
    if(!sources.length)applyThornbinderDotDamage(player, enemy, world, damage, 'Verdant Wounds', now, wound.sourceAbilityId);
    else {
      const weight=sources.reduce((sum,source)=>sum+source.stacks*source.tickDamage,0)||1;
      let allocated=0;
      for(let i=0;i<sources.length;i++) {
        const source=sources[i],share=i===sources.length-1?damage-allocated:Math.floor(damage*source.stacks*source.tickDamage/weight);
        allocated+=share;
        if(share>0)applyThornbinderDotDamage(source.owner,enemy,world,share,'Verdant Wounds',now,source.sourceAbilityId);
      }
    }
  }
}

function applyVerdantWound(player, enemy, world, now, stacks = 1, options = {}) {
  if (!player || player.classId !== 'thornbinder' || !enemy || enemy.dead || enemy.hp <= 0 || enemy.arenaDormant) return;

  const bonuses = getSkillTreeBonuses(player);
  const existing = enemy.verdantWound && typeof enemy.verdantWound === 'object'
    ? enemy.verdantWound
    : {};
  const cap = Math.max(THORNBINDER_WOUND_CAP, THORNBINDER_WOUND_CAP + Math.floor(Math.max(0, bonuses.verdantWoundCap || 0)));
  const nextStacks = Math.min(cap, Math.max(0, Number(existing.stacks || 0)) + Math.max(1, Number(stacks || 1)));
  const tickDamage = Math.max(Number(existing.tickDamage || 0), Number(options.tickDamage || 2) + Math.max(0, bonuses.verdantWoundDamage || 0));
  const sourceAbilityId=options.sourceAbilityId||null;
  const sources=(existing.sources||[]).filter(source=>source.until>now);
  let source=sources.find(source=>source.owner===player && source.sourceAbilityId===sourceAbilityId);
  if(!source){source={owner:player,sourceAbilityId,stacks:0,tickDamage:0};if(sources.length>=8)sources.shift();sources.push(source);}
  source.stacks=Math.min(cap,source.stacks+Math.max(1,stacks));
  source.tickDamage=Math.max(source.tickDamage,Number(options.tickDamage||2));
  source.until=now+THORNBINDER_WOUND_DURATION*getEnemyControlScalar(enemy);

  enemy.verdantWound = {
    owner: player,
    sourceAbilityId,
    sources,
    stacks: nextStacks,
    until: Math.max(Number(existing.until || 0), now + THORNBINDER_WOUND_DURATION * getEnemyControlScalar(enemy)),
    nextTickAt: Number(existing.nextTickAt || 0) > now ? existing.nextTickAt : now + 0.75,
    tickDamage
  };

  grantBriarBloom(player, world, now, 0.75);

  if (world && (!existing.stacks || nextStacks > existing.stacks)) {
    spawnWorldEffect(world, {
      kind: 'thornbinderVerdantWound',
      layer: 'front',
      x: enemy.x,
      y: enemy.y,
      radius: Math.min(30, 12 + nextStacks * 3),
      stacks: nextStacks,
      ttl: 0.36
    });
  }
}

function applyThornbinderDotDamage(player, enemy, world, amount, sourceName, now, sourceAbilityId = null) {
  if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove || enemy.arenaDormant) return false;

  const damage = Math.min(enemy.hp, Math.max(1, Math.floor(Number(amount || 1))));
  enemy.hp = Math.max(0, (enemy.hp || 0) - damage);
  enemy.hitFlash = Math.max(enemy.hitFlash || 0, 0.05);
  recordEnemyCombatContribution(enemy, player, 'warding', damage, {
    source: 'thornbinderDot',
    sourceAbilityId: sourceAbilityId || resolveAbilitySourceName(sourceName),
    sourceName
  });
  recordEnemyHitReaction(enemy,{dot:true,dirX:enemy.x-player.x,dirY:enemy.y-player.y,color:'#96b47a'});
  recordEnemyContactImpact(enemy,player,world,{dot:true,element:'nature'});

  if (world) {
    spawnWorldEffect(world, {
      kind: 'thornbinderVerdantWound',
      layer: 'front',
      x: enemy.x,
      y: enemy.y,
      radius: Math.min(24, 10 + damage),
      ttl: 0.28,
      tick: true
    });
  }

  if (enemy.hp <= 0) {
    onSubclassKill(player,enemy,world,performance.now()/1000);
    enemy.dead = true;
  }

  return true;
}

function getEnemyControlScalar(enemy) {
  if (!enemy) return 1;
  if (enemy.worldBoss || enemy.isBoss) return 0.28;
  if (enemy.eliteModifier) return 0.58;
  return 1;
}

function isEnemyRooted(enemy, now) {
  return !!(
    enemy &&
    Number(enemy.rootUntil || 0) > now &&
    !enemy.isBoss &&
    !enemy.worldBoss &&
    !enemy.eliteModifier
  );
}

function ensureFellhunterState(player) {
  if (!player) return null;

  player.fellhunter = player.fellhunter && typeof player.fellhunter === 'object'
    ? player.fellhunter
    : {};
  player.traps = Array.isArray(player.traps) ? player.traps : [];

  return player.fellhunter;
}

function updateFellhunterGadgets(player, world, dt, now, log) {
  if (!player || !Array.isArray(player.traps)) return;

  const traps = player.traps;

  for (const trap of traps) {
    if (!trap || trap.remove) continue;

    if (Number(trap.expiresAt || 0) > 0 && now >= Number(trap.expiresAt || 0)) {
      trap.remove = true;
      continue;
    }

    if (trap.kind === 'fellhunterBearTrap') {
      updateFellhunterBearTrap(player, world, trap, now, log);
    } else if (trap.kind === 'fellhunterCaltrops') {
      updateFellhunterCaltrops(player, world, trap, now, log);
    } else if (trap.kind === 'fellhunterBomb') {
      updateFellhunterBomb(player, world, trap, now, log);
    } else if (trap.kind === 'fellhunterKillZone') {
      updateFellhunterKillZone(player, world, trap, now, log);
    }
  }

  player.traps = traps.filter(trap => trap && !trap.remove);
}

function updateFellhunterBearTrap(player, world, trap, now, log) {
  if (Number(trap.nextVisualAt || 0) <= now) {
    trap.nextVisualAt = now + 0.32;
    spawnWorldEffect(world, {
      kind: 'fellhunterBearTrap',
      layer: 'front',
      x: trap.x,
      y: trap.y,
      radius: trap.radius || 30,
      ttl: 0.38,
      armed: Number(trap.armedAt || 0) <= now
    });
  }

  if (Number(trap.armedAt || 0) > now) return;

  const target = findEnemiesInRadius(world, trap.x, trap.y, trap.radius || 30, 1)[0]?.enemy;
  if (!target) return;

  trap.remove = true;
  const scalar = getEnemyControlScalar(target);
  target.slowTimer = Math.max(target.slowTimer || 0, 2.1 * scalar);
  if (scalar >= 0.9) {
    target.rootUntil = Math.max(target.rootUntil || 0, now + 1.05);
  }
  markEnemyExposed(player, target, now, FELLHUNTER_EXPOSED_DURATION + 0.8, 16, { source: 'Bear Trap' });

  spawnWorldEffect(world, {
    kind: 'fellhunterTrapSnap',
    layer: 'front',
    x: trap.x,
    y: trap.y,
    radius: 34,
    ttl: 0.34
  });

  damageEnemyDirect(player, world, target, trap.damage || 8, 'archery', log, {
    sourceName: 'Bear Trap',
    color: '#ef8b58',
    xpMultiplier: 0.38,
    aoe: false,
    trap: true,
    fellhunter: true,
    stagger: true
  });
}

function updateFellhunterCaltrops(player, world, trap, now, log) {
  if (Number(trap.nextTickAt || 0) > now) return;

  trap.nextTickAt = now + Math.max(0.45, Number(trap.tickInterval || 0.75));
  const targets = findEnemiesInRadius(world, trap.x, trap.y, trap.radius || 64, 8);

  for (const info of targets) {
    const enemy = info.enemy;
    const scalar = getEnemyControlScalar(enemy);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.95 * scalar);
    markEnemyExposed(player, enemy, now, 2.1, 12, { source: 'Caltrops', quiet: true });
    damageEnemyDirect(player, world, enemy, trap.damage || 3, 'archery', log, {
      sourceName: 'Caltrops',
      color: '#c6ccd4',
      xpMultiplier: 0.14,
      aoe: true,
      trap: true,
      fellhunter: true
    });
  }

  if (targets.length) {
    spawnWorldEffect(world, {
      kind: 'fellhunterCaltropsStep',
      layer: 'front',
      x: trap.x,
      y: trap.y,
      radius: trap.radius || 64,
      ttl: 0.24
    });
  }
}

function updateFellhunterBomb(player, world, trap, now, log) {
  if (Number(trap.detonateAt || 0) > now) return;

  trap.remove = true;
  const radius = trap.radius || 74;
  const targets = findEnemiesInRadius(world, trap.x, trap.y, radius, 10);

  spawnWorldEffect(world, {
    kind: 'fellhunterExplosion',
    layer: 'front',
    x: trap.x,
    y: trap.y,
    radius,
    ttl: 0.48
  });

  for (const info of targets) {
    const enemy = info.enemy;
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.6 * getEnemyControlScalar(enemy));
    markEnemyExposed(player, enemy, now, 3.2, 15, { source: 'Bomb Toss', quiet: info.distance > radius * 0.55 });
    damageEnemyDirect(player, world, enemy, trap.damage || 12, 'archery', log, {
      sourceName: 'Bomb Toss',
      color: '#ff9a4d',
      xpMultiplier: 0.34,
      aoe: true,
      trap: true,
      fellhunter: true,
      element: 'fire',
      knockback: 0.35,
      stagger: true
    });
  }
}

function updateFellhunterKillZone(player, world, zone, now, log) {
  const radius = zone.radius || 92;
  const targets = findEnemiesInRadius(world, zone.x, zone.y, radius, 12);

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 0.55 * getEnemyControlScalar(info.enemy));
    markEnemyExposed(player, info.enemy, now, 2.2, 16, { source: 'Kill Zone', quiet: true });
  }

  if (Number(zone.nextBlastAt || 0) > now) return;

  zone.blastsRemaining = Math.max(0, Math.floor(zone.blastsRemaining || 0));
  if (zone.blastsRemaining <= 0) {
    zone.remove = true;
    return;
  }

  zone.blastsRemaining -= 1;
  zone.nextBlastAt = now + 0.48;
  const blastX = zone.x + Math.cos(now * 9.7 + zone.blastsRemaining) * radius * 0.28;
  const blastY = zone.y + Math.sin(now * 8.3 + zone.blastsRemaining) * radius * 0.22;

  spawnWorldEffect(world, {
    kind: 'fellhunterKillZoneBlast',
    layer: 'front',
    x: blastX,
    y: blastY,
    radius: radius * 0.7,
    ttl: 0.42
  });

  for (const info of findEnemiesInRadius(world, zone.x, zone.y, radius, 12)) {
    damageEnemyDirect(player, world, info.enemy, zone.damage || 16, 'archery', log, {
      sourceName: 'Kill Zone',
      color: '#ffb36c',
      xpMultiplier: 0.32,
      aoe: true,
      trap: true,
      fellhunter: true,
      element: 'fire',
      stagger: true
    });
  }

  if (zone.blastsRemaining <= 0) {
    zone.remove = true;
  }
}

function markEnemyExposed(player, enemy, now, duration = FELLHUNTER_EXPOSED_DURATION, bonusPct = 14, options = {}) {
  if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) return false;

  const bonuses = getSkillTreeBonuses(player);
  const scalar = getEnemyControlScalar(enemy);
  const durationBonus = 1 + Math.max(0, Number(bonuses.exposedDurationPct || 0)) / 100;
  const finalDuration = Math.max(0.75, Number(duration || FELLHUNTER_EXPOSED_DURATION) * durationBonus * Math.max(0.45, scalar));
  const until = now + finalDuration;

  enemy.fellhunterExposedUntil = Math.max(enemy.fellhunterExposedUntil || 0, until);
  enemy.fellhunterExposedBonusPct = Math.max(enemy.fellhunterExposedBonusPct || 0, Math.max(0, Number(bonusPct || 0)));
  enemy.fellhunterExposedSource = options.source || enemy.fellhunterExposedSource || 'Fellhunter';
  enemy.exposedAppliedAt = now;

  // Legacy fields remain populated so older render/debug hooks read a valid mark.
  enemy.mercenaryMarkedUntil = Math.max(enemy.mercenaryMarkedUntil || 0, enemy.fellhunterExposedUntil);
  enemy.mercenaryMarkBonusPct = Math.max(enemy.mercenaryMarkBonusPct || 0, enemy.fellhunterExposedBonusPct);

  if (!options.quiet) {
    addFloatingText(enemy, 'Exposed', {
      preset: 'status',
      color: '#ffb36c',
      ttl: 0.68,
      size: 11
    });
  }

  return true;
}

function isEnemyExposed(enemy, now = performance.now() / 1000) {
  return Math.max(
    Number(enemy?.fellhunterExposedUntil || 0),
    Number(enemy?.mercenaryMarkedUntil || 0)
  ) > now;
}

function getEnemyExposedBonusPct(enemy) {
  return Math.max(
    Number(enemy?.fellhunterExposedBonusPct || 0),
    Number(enemy?.mercenaryMarkBonusPct || 0),
    10
  );
}

function grantFellhunterTacticalAdvantage(player, now, stacks = 1) {
  if (!isFellhunter(player)) return;

  const state = ensurePassiveState(player);
  if (!state) return;

  state.combatReloadUntil = Math.max(state.combatReloadUntil || 0, now + FELLHUNTER_TACTICAL_ADVANTAGE_DURATION);
  state.combatReloadStacks = Math.min(3, Math.max(state.combatReloadStacks || 0, 0) + Math.max(1, stacks));
  player.flags = player.flags || {};
  player.flags.combatReloadUntil = state.combatReloadUntil;
  player.flags.combatReloadStacks = state.combatReloadStacks;

  addFloatingText(player, 'Tactical Advantage', {
    preset: 'status',
    color: '#ef8b58',
    offsetY: -58,
    ttl: 0.72,
    size: 11
  });
}

function getFellhunterPlacementPoint(player, world, aim, range) {
  const distance = Math.max(24, Number(range || 64));
  const originX = Number(player.x || 0);
  const originY = Number(player.y || 0);

  for (let step = 1; step >= 0.2; step -= 0.2) {
    const x = originX + aim.x * distance * step;
    const y = originY + aim.y * distance * step;
    if (!world?.tiles?.length || isPassable(world, x, y)) {
      return { x, y };
    }
  }

  return {
    x: originX,
    y: originY
  };
}

function pruneFellhunterGadgets(player, kinds = []) {
  ensureFellhunterState(player);
  const allowedKinds = new Set(kinds);
  player.traps = player.traps.filter(trap => {
    if (!trap || trap.remove) return false;
    return allowedKinds.size ? !allowedKinds.has(trap.kind) : true;
  });

  if (player.traps.length > FELLHUNTER_MAX_GADGETS) {
    player.traps.splice(0, player.traps.length - FELLHUNTER_MAX_GADGETS);
  }
}

function isNearElderThornbeast(player) {
  return (player?.summons || []).some(summon => {
    return summon &&
      summon.kind === 'thornbeast' &&
      summon.summonPath === 'evolved' &&
      summon.alive !== false &&
      summon.hp > 0 &&
      Math.hypot((summon.x || 0) - (player.x || 0), (summon.y || 0) - (player.y || 0)) <= 180;
  });
}

export function updateAbilityInput(player, world, input, dt, now, log) {
  if (!player || !input) return false;

  if (player.hp <= 0 || isActorControlLockedByRevive(player)) return false;
  if (player.activeChannel && (input.dashPressed || Array.from({length:HOTBAR_SLOT_COUNT},(_,i)=>i).some(i=>input[`ability${i}Pressed`] && i !== player.activeChannel.slot))) stopAbilityChannel(player, 'cancelled');
  const activeCharge = player.abilityCharge;
  if (activeCharge?.active) {
    if (input.dashPressed) {
      cancelAbilityCharge(player);
      addFloatingText(player, 'Charge cancelled', {
        color: '#9facbf',
        ttl: 0.45,
        size: 10
      });
      return false;
    }

    updateActiveChargeAim(player, input);

    const slot = Math.max(0, Math.min(HOTBAR_SLOT_COUNT - 1, Number(activeCharge.slotIndex || 0)));
    const held = !!input[`ability${slot}Held`];
    const released = !!input[`ability${slot}Released`];

    const previousLevel = Number(activeCharge.level || 0);
    const updatedCharge = updateAbilityCharge(player, dt);
    if (updatedCharge && updatedCharge.level > previousLevel) {
      playSfx('ability', {
        volume: updatedCharge.level >= 2 ? 0.82 : 0.48,
        throttle: 0.08
      });
    }

    if (released || !held) {
      const charge = releaseAbilityCharge(player);
      return useAbility(slot, player, world, log, now, input, charge);
    }

    return true;
  }

  for (let slot = 0; slot < HOTBAR_SLOT_COUNT; slot++) {
    if (!input[`ability${slot}Pressed`]) continue;

    const abilityId = resolveAbilityId(slot, player);
    const ability = abilityId ? resolveSubclassAbility(player,abilityId) : null;
    if (!ability) return useAbility(slot, player, world, log, now, input);

    if (canChargeAbility(ability)) {
      if (!canUseAbility(player, ability, log, now)) {
        addFloatingText(player, 'Not ready', {
          color: '#9facbf',
          ttl: 0.42,
          size: 10
        });
        return false;
      }

      const began = beginAbilityCharge(player, slot, ability, now);
      if (began) {
        updateActiveChargeAim(player, input);
        playSfx(SOUND_EVENT_KEYS.SPELL_BUILDUP, { volume: 0.42, throttle: 0.12 });
      }
      return began;
    }

    return useAbility(slot, player, world, log, now, input);
  }

  return false;
}

function updateActiveChargeAim(player, input) {
  const charge = player?.abilityCharge;
  if (!charge?.active) return null;

  const aim = getSafeAimDirection(player, input);
  charge.aimX = aim.x;
  charge.aimY = aim.y;
  charge.aimSource = input?.rightStickActive
    ? 'rightStick'
    : input?.aimSource || (input?.hasAim ? 'aim' : 'fallback');
  player.lastCombatAimX = aim.x;
  player.lastCombatAimY = aim.y;
  return aim;
}

export function cancelActiveAbilityCharge(player) {
  stopAbilityChannel(player);
  cancelAbilityCharge(player);
}

export function cancelActiveHeavyAttackCharge(player, world = null) {
  cancelHeavyAttackCharge(player, world);
}

export function updateEnemies(dt, player, world, log, now = performance.now() / 1000, game = null) {
  ensureCombatPlayer(player);
  setEnemyCombatViews(world,game);
  updateDungeonEvents(world,player,dt,log);
  updateDungeonArena(world,player,game);
  if(partyEntryPending(game))return;
  if(world?.mode==='dungeon'&&world.dungeonState){player.worldMemory ||= {};player.worldMemory.dungeonRuns ||= {};player.worldMemory.dungeonRuns[world.dungeonId]=world.dungeonState;}
  if(world.dungeonState?.malakar)world.enemies=(world.enemies||[]).filter(e=>e.malakarSolo);
  else updateEliteEncounters(world,player,dt,now,applyTargetDamage,log);

  const enemies = world?.enemies || [];

  if (world?.safeZone || world?.mode === 'capital' || world?.mode === 'hub' || world?.mode === 'town') {
    world.enemies = enemies.filter(enemy => enemy && !enemy.remove && !enemy.dead && enemy.hp > 0);
    return;
  }

  prepareEnemyTactics(world,now);
  for (const enemy of enemies) {
    if (!enemy) continue;

    ensureEnemyState(enemy);
    if((enemy.groveMother||enemy.orchardCustodian)&&enemy.hp>0){updateEnemyTimers(enemy,dt);updateFloatingTexts(enemy,dt);}
    if(enemy.groveMother&&updateGroveCombat(enemy,world,player,dt,now,game))continue;
    if(enemy.orchardCustodian&&updateOrchardCombat(enemy,world,player,dt,now,game))continue;
    if(enemy.malakarSolo&&updateMalakarCombat(enemy,world,player,dt,now,game))continue;
    updateFloatingTexts(enemy,dt);
    if(enemy.arenaDormant&&enemy.hp>0)continue;

    if (enemy.dead || enemy.hp <= 0) {
      handleEnemyDeath(enemy, player, world, log);
      continue;
    }

    if (shouldSkipFarEnemyUpdate(enemy, player)) {
      enemy.dormant = true;
      continue;
    }

    enemy.dormant = false;
    if(updatePopulationPatrol(enemy,world,player,dt))continue;
    if (updateHomeGuardBehavior(enemy, player, world, dt)) continue;
    updateEnemyTimers(enemy, dt);
    enemy.eliteAttackPauseTimer=Math.max(0,(enemy.eliteAttackPauseTimer||0)-dt);
    if(enemy.eliteHealing||enemy.eliteAttackPauseTimer>0)continue;
    if(!enemy.isBoss&&!enemy.worldBoss && enemy.subclassFrozenUntil>now){
      cancelEnemyAttackPresentation(enemy);enemy.telegraph=null;if(enemy.boss){enemy.boss.pendingSpecial=null;enemy.bossTell=null;}continue;
    }
    if(!enemy.isBoss&&!enemy.worldBoss && enemy.subclassSilencedUntil>now && /archer|cultist|priest|mage|wraith|caster/i.test(`${enemy.kind} ${enemy.archetype}`)){
      cancelEnemyAttackPresentation(enemy);enemy.telegraph=null;enemy.bossTell=null;if(enemy.boss)enemy.boss.pendingSpecial=null;
      enemy.attackCooldown=Math.max(enemy.attackCooldown||0,.2);
      updateEnemyBehavior(enemy,player,world,dt,now,log);continue;
    }
    // Hit-stop is cosmetic; only existing authoritative crowd control cancels attacks.
    if (enemy.staggerTimer > 0 && !enemy.isBoss && !enemy.worldBoss && !enemy.eliteModifier) {
      enemy.telegraph=null;if(enemy.boss){enemy.boss.pendingSpecial=null;enemy.bossTell=null;}
      cancelEnemyAttackPresentation(enemy);enemy.enemyState='staggered';continue;
    }
    if (isEnemyRooted(enemy, now)) {
      cancelEnemyAttackPresentation(enemy);enemy.telegraph=null;enemy.bossTell=null;if(enemy.boss)enemy.boss.pendingSpecial=null;
      moveActorWithCollision(enemy, world, 0, 0);
      continue;
    }
    moveActorWithCollision(enemy, world, 0, 0);
    if(updateEnemyApproachOnly(enemy,player,world,dt))continue;
    updateBossFramework(enemy, world, player, dt, now, log, !getBasicEnemyAttack(enemy)&&!enemy.telegraph&&!getEnemyCharge(enemy)&&!(enemy.telegraphRecoveryTimer>0));
    if (enemy?.boss?.pendingSpecial || Number(enemy?.boss?.recoveryUntil || 0) > now) continue;
    if (updateAdvancedEnemyBehavior(enemy, player, world, dt, now, log, true)) continue;
    updateEnemyBehavior(enemy, player, world, dt, now, log);
  }

  separateEnemies(world,dt,now);
  world.enemies = enemies.filter(enemy => {
    return enemy && !enemy.remove;
  });
}

function shouldSkipFarEnemyUpdate(enemy, player) {
  if (!enemy || enemy.isBoss || enemy.worldBoss || enemy.awakened || enemy.aggro || enemy.alerted) return false;

  const party = [
    player,
    ...(player?.coop?.players || []).filter(ally => ally && ally.active !== false)
  ];

  return party.every(member => {
    return Math.hypot((member.x || 0) - (enemy.x || 0), (member.y || 0) - (enemy.y || 0)) > 1200;
  });
}

// -----------------------------------------------------------------------------
// ABILITIES
// -----------------------------------------------------------------------------

export function useAbility(index, player, world, log, now = performance.now() / 1000, input = null, charge = null) {
  if (!player || player.hp <= 0 || isActorControlLockedByRevive(player)) return false;
  ensureCombatPlayer(player);
  ensureActionState(player);
  ensureCombatState(player);
  ensureAbilityProjectileState(player);

  const abilityId = resolveAbilityId(index, player);
  const baseAbility = abilityId ? resolveSubclassAbility(player,abilityId) : null;
  const ability = applyMythicalAbilityModifiers(player,applyEquippedChargeBonuses(player, applyAbilityMastery(player, applyAbilityCharge(getBalancedAbility(baseAbility), charge))));

  if (!ability) {
    log?.('No ability equipped there.');
    return false;
  }

  if (!canUseAbility(player, ability, log, now)) {
    return false;
  }

  if ((ability.subclassId || ability.effectProfile || ['summonWolf','summonDemon'].includes(ability.id)) && world?.mode === 'pvpArena') { log?.('This technique is not yet available in the arena.'); return false; }
  // Block is a held stamina action, not a timed ward or paid spell.
  if(ability.heldBlock){recordAbilitySuccessfulUse(player,ability.id);return true;}
  let used = false;
  let visualKind = 'cast';

  const beforeUse = {x:player.x,y:player.y,hp:player.hp};
  const controls=(world.enemies||[]).filter(e=>e.hp>0&&!e.trainingDummy&&!e.friendly).map(e=>({e,root:Math.max(e.rootUntil||0,e.rootTimer||0),slow:e.slowTimer||0,exposed:e.fellhunterExposedUntil||0}));
  const partyHealth = [player,...(player.coop?.players || [])].map(actor=>({actor,hp:actor.hp,buffs:{...actor.buffs}}));
  const effectStart=world.effects?.length||0;
  if(ability.oathBlades){
    used=executeCombatTechnique(player,world,ability,index,combatTechniqueHooks(player,world,log,now,input,ability));
    visualKind='cast';
  } else if (ability.subclassId && !ability.sunkenBase && !ability.summonType) {
    used=executeSubclassAbility(player,world,ability,index,combatTechniqueHooks(player,world,log,now,input,ability));
    visualKind=ability.channelProfile?'channel':ability.mobilityProfile?'mobility':['ward','retaliation'].includes(ability.subclassMode)?'guard':'cast';
  } else if (ability.effectProfile) {
    used = executeCombatTechnique(player,world,ability,index,combatTechniqueHooks(player,world,log,now,input,ability));
    visualKind = ability.channelProfile ? 'channel' : ability.mobilityProfile ? 'mobility' : 'cast';
  } else if (ability.summonType) {
    visualKind = 'summon';
    used = useSummonAbility(player, world, ability, log, now);
  } else if (ability.id === 'oathkeeperBulwarkOfLight') {
    visualKind = 'guard';
    used = useOathkeeperBulwarkOfLight(player, world, ability, log, now);
  } else if (ability.damageReduction || ability.id === 'guard') {
    visualKind = 'guard';
    used = useDefensiveAbility(player, ability, log, now);
    if(used&&ability._mythGuard){for(const ally of (player.coop?.players||[]).filter(p=>p.hp>0&&Math.hypot(p.x-player.x,p.y-player.y)<=120))ally.buffs={...ally.buffs,defense:{...player.buffs.defense,reduction:player.buffs.defense.reduction*.75}};spawnWorldEffect(world,{kind:'combatTechnique',profile:'litany',x:player.x,y:player.y,colors:['#dfd3a1','#fff2ca','#606658'],radius:120,ttl:.5});}
  } else {
    used = useDamageAbility(player, world, ability, log, now, input);
  }

  if (used) {
    if(ability.sunkenBase)for(const fx of (world.effects||[]).slice(effectStart)){
      if(['waterTorrent','bubbleWard','mendingCurrent','tidalCut','riptideStep','drowningPressure','wellspring','delugeCrown','combatTechnique'].includes(fx.kind)){
        fx.profile=fx.profile||fx.kind;fx.kind='sunkenSkill';fx.subclassId='sunken';fx.abilityId=ability.id;fx.colors=ability.colors;
      }
    }
    if(ability.sunkenBase)spawnWorldEffect(world,{kind:'sunkenSkill',subclassId:'sunken',profile:'cast',abilityId:ability.id,x:player.x,y:player.y-8,radius:25,ttl:.3,layer:'front'});
    recordAbilitySuccessfulUse(player,ability.id);
    // Original controls scale here; recurring morph/technique pulses scale
    // inside their own handlers, once per effect.
    if((!ability.subclassId||ability.sunkenBase)&&!ability.effectProfile)for(const c of controls){
      const scalar=getAbilityEffectiveness(player,ability);
      if((c.e.rootUntil||0)>c.root)c.e.rootUntil=Math.max(c.root,now+Math.max(0,c.e.rootUntil-now)*scalar);
      if((c.e.slowTimer||0)>c.slow)c.e.slowTimer=Math.max(c.slow,c.e.slowTimer*scalar);
      if((c.e.fellhunterExposedUntil||0)>c.exposed)c.e.fellhunterExposedUntil=Math.max(c.exposed,now+Math.max(0,c.e.fellhunterExposedUntil-now)*scalar);
    }
    const usefulControls=controls.filter(c=>c.e.hp>0&&(Math.max(c.e.rootUntil||0,c.e.rootTimer||0)>c.root||(c.e.slowTimer||0)>c.slow||(c.e.fellhunterExposedUntil||0)>c.exposed));
    if(usefulControls.length)recordSupportContribution(player,usefulControls.map(c=>c.e),ability.id,4,'control');
    if(!ability.oathMorph)for(const entry of partyHealth)for(const key of ['defense','bubbleWard','prismGuard','haloAegis']) {
      const buff=entry.actor.buffs?.[key];
      if(buff && buff!==entry.buffs[key]) {
        const potency=(ability._mastery?.damage||1)*progressionPower(player,'warding','defence')*(buff.expertiseScaled?1:getAbilityEffectiveness(player,ability));
        if(buff.flatAbsorb)buff.flatAbsorb=Math.ceil(buff.flatAbsorb*potency);
        if(buff.reduction)buff.reduction=Math.max(entry.buffs[key]?.reduction||0,Math.min(ability.hunterWard ? .3 : .72,buff.reduction*potency));
        registerAbilitySupport(buff,player,ability.id);
      }
    }
    if (!ability.mobilityProfile) rewardMobilityMastery(player,world,ability.id,Math.hypot(player.x-beforeUse.x,player.y-beforeUse.y),now,log);
    // Class drains already scale through actual damage, and the Acolyte rite
    // handles mastery inside its explicit percentage cap. Do not boost twice.
    if(!ability.oathMorph&&!ability.roseMantle&&!(isGravecallerSustain(player)&&(ability.classId==='gravecaller'||ability.bloodline==='vampire')))
    for(const entry of partyHealth)if(entry.actor.hp>0) {
      const healing=Math.max(0,entry.actor.hp-entry.hp);
      entry.actor.hp=Math.min(entry.actor.maxHp,entry.actor.hp+Math.floor(healing*((ability._mastery?.damage||1)*progressionPower(player,'warding','defence')*(ability.subclassId&&!ability.sunkenBase?1:getAbilityEffectiveness(player,ability))-1)));
    }
    const effectiveHeal = partyHealth.reduce((sum,entry)=>sum+Math.max(0,entry.actor.hp-entry.hp),0);
    if (effectiveHeal&&!ability.subclassId) rewardCombatPurpose(player,world,ability.id,effectiveHeal*.12,now,log);
    playAbilityAudioEvent('cast',ability);
    if (!ability.effectProfile&&!ability.subclassId) spawnWorldEffect(world,{kind:'combatTechnique',profile:'release',abilityId:ability.id,classId:ability.classId||player.classId,colors:CLASS_COMBAT_PALETTES[ability.classId||player.classId],masteryTier:ability._mastery?.tier||0,x:player.x,y:player.y-6,radius:24+(ability._mastery?.tier||0)*2,ttl:.3});
    if (ability.id === 'lightbringerDawncarver' && ability.channelProfile) {
      visualKind = 'channel';
    }
    startVisualAbilityAction(player, world, ability, visualKind, now);
    if (visualKind === 'cast' || visualKind === 'summon' || visualKind === 'channel') {
      playSfx(SOUND_EVENT_KEYS.SPELL_RELEASE, { volume: visualKind === 'summon' ? 0.72 : 0.54, throttle: 0.06 });
    }
    if(!ability.subclassId)applyChargedClassPayoff(player, ability, now);
    if (ability._charge?.level > 0) {
      spawnWorldEffect(world, {
        kind: 'chargedRelease',
        layer: 'front',
        x: player.x + (player.dirX || 0) * 10,
        y: player.y + (player.dirY ?? 1) * 10 - 10,
        ttl: ability._charge.level >= 2 ? 0.34 : 0.24,
        radius: ability._charge.level >= 2 ? 42 : 30,
        color: ability.colors?.[0]||getChargeFeedbackColor(player.classId),
        dirX: player.dirX || 0,
        dirY: player.dirY ?? 1
      });
      addFloatingText(player, ability._charge.level >= 2 ? 'Full Charge' : 'Charged', {
        color: ability.colors?.[0]||getChargeFeedbackColor(player.classId),
        ttl: 0.55,
        size: ability._charge.level >= 2 ? 13 : 11
      });
    }
  }

  return used;
}

function applyChargedClassPayoff(player, ability, now) {
  if (!player || ability?._charge?.level < 2) return;

  if (isOathkeeper(player)) {
    player.buffs = player.buffs || {};
    player.buffs.defense = {
      timer: Math.max(player.buffs.defense?.timer || 0, 1.25),
      reduction: Math.max(player.buffs.defense?.reduction || 0, 0.12)
    };
    return;
  }

  if (isFellhunter(player)) {
    player.passiveState = player.passiveState || {};
    player.passiveState.combatReloadStacks = Math.max(player.passiveState.combatReloadStacks || 0, 1);
    player.passiveState.combatReloadUntil = Math.max(player.passiveState.combatReloadUntil || 0, now + FELLHUNTER_TACTICAL_ADVANTAGE_DURATION);
    return;
  }

  if (isGravecaller(player)) {
    for (const summon of player.summons || []) {
      if (!summon || summon.alive === false) continue;
      summon.chargedEmpoweredUntil = Math.max(summon.chargedEmpoweredUntil || 0, now + 5);
    }
    return;
  }

  if (player.classId === 'thornbinder') {
    player.hp = Math.min(player.maxHp || player.hp || 1, (player.hp || 0) + 4);
    return;
  }

  if (normalizeClassId(player.classId) === 'waverider') {
    player.spirit = Math.min(player.maxSpirit || player.spirit || 1, (player.spirit || 0) + 8);
    player.stamina = Math.min(player.maxStamina || player.stamina || 1, (player.stamina || 0) + 8);
    return;
  }

  if (player.classId === 'eldritch') {
    player.hp = Math.max(1, (player.hp || 1) - 2);
    player.spirit = Math.min(player.maxSpirit || player.spirit || 0, (player.spirit || 0) + 5);
  }
}

function resolveAbilityId(index, player) {
  if (Number.isInteger(index)) {
    return player.loadout?.abilitySlots?.[index] || null;
  }

  return index || null;
}

function canUseAbility(player, ability, log, now) {
  if (player.activeChannel) { log?.('Finish or release your channel first.'); return false; }
  if (ability.effectProfile && player.currentZone === 'PvP Arena') { log?.('New techniques are not yet available in the arena.'); return false; }
  const skillLevel = getSkillLevel(player, ability.skill);
  const activeDawncarver = player?.lightbringer?.dawncarverChannel;

  if (activeDawncarver && Number(activeDawncarver.until || 0) > now && ability.id !== 'lightbringerDawncarver') {
    log?.('Dawncarver is still channeling.');
    return false;
  }

  const availability = getAbilityAvailability(player, ability);
  if (!availability.usable) {
    log?.(availability.reason === 'Not unlocked.'
      ? `${ability.name} is locked. Unlock it from your skill tree first.`
      : `${ability.name}: ${availability.reason}`);
    return false;
  }

  if (ability.classId && normalizeClassId(player.classId) !== normalizeClassId(ability.classId)) {
    log?.(`${ability.name} requires the ${skillLabel(ability.classId)} path.`);
    return false;
  }

  if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
    log?.('Your spirit has not awakened yet.');
    return false;
  }

  if (ability.bloodline && getPlayerBloodlineId(player) !== ability.bloodline) {
    log?.(`${ability.name} belongs to another bloodline.`);
    return false;
  }

  const requirement = getAbilitySkillRequirement(ability);
  if (requirement && skillLevel < requirement) {
    log?.(`${ability.name} requires ${skillLabel(ability.skill)} level ${requirement}.`);
    return false;
  }

  // Active summon abilities are always available as a dismiss command.
  // Their resummon cooldown begins only after the entire summoned group is gone.
  if (ability.summonType && hasActiveSummonGroup(player, ability.summonType)) {
    return true;
  }

  if (ability.summonType) {
    startEndedSummonGroupCooldowns(player, log, now);
  }

  player.cooldowns = player.cooldowns || {};

  const useChargeState = getAbilityUseChargeState(player, ability, now);

  if (useChargeState.maxCharges > 1) {
    if (useChargeState.charges <= 0) {
      log?.(`${ability.name} is recharging (${useChargeState.remaining.toFixed(1)}s).`);
      return false;
    }
  } else {
    const lastUsed = player.cooldowns[ability.id] ?? -Infinity;
    const cooldown = getEffectiveAbilityCooldown(ability);

    if (cooldown > 0 && now - lastUsed < cooldown) {
      const remaining = Math.max(0, cooldown - (now - lastUsed));
      log?.(`${ability.name} is cooling down (${remaining.toFixed(1)}s).`);
      return false;
    }
  }

  const cost = getEffectiveAbilityCost(ability);
  const costType = getEffectiveAbilityCostType(ability);

  if (costType === 'spirit') {
    ensureClassSpiritAvailable(player, ability);

    if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
      log?.('Your spirit is dormant.');
      return false;
    }

    if (player.spirit < cost) {
      log?.('Not enough spirit.');
      return false;
    }
  } else if (player.stamina < cost) {
    log?.('Not enough stamina.');
    return false;
  }

  return true;
}

function payAbilityCost(player, ability) {
  const cost = getEffectiveAbilityCost(ability);
  const costType = getEffectiveAbilityCostType(ability);

  if (costType === 'spirit') {
    ensureClassSpiritAvailable(player, ability);
    player.spirit = Math.max(0, player.spirit - cost);
    return true;
  }

  return spendStamina(player, cost, 0.55);
}

function getChargeFeedbackColor(classId) {
  if (isOathkeeper(classId)) return '#ffecb0';
  if (isFellhunter(classId)) return '#ef8b58';
  if (isGravecaller(classId)) return '#b68cff';
  if (classId === 'thornbinder') return '#73d18a';
  if (normalizeClassId(classId) === 'waverider') return '#59d7e8';
  if (classId === 'eldritch') return '#ef4056';
  return '#ffcc66';
}

function applyEquippedChargeBonuses(player, ability) {
  if (!player || !ability?._charge || ability._charge.level <= 0) return ability;

  let costReductionPct = 0;
  let fullChargeDamagePct = 0;
  let chargeDurationPct = 0;

  for (const itemId of Object.values(player.equipment || {})) {
    const passive = ITEMS[itemId]?.legendaryPassive;
    if (!passive) continue;

    costReductionPct += Math.max(0, Number(passive.chargedCostReductionPct || 0));
    chargeDurationPct += Math.max(0, Number(passive.chargedDurationPct || 0));
    if (ability._charge.level >= 2) {
      fullChargeDamagePct += Math.max(0, Number(passive.fullChargeDamagePct || 0));
    }
  }

  return {
    ...ability,
    cost: Math.max(0, Math.ceil(Number(ability.cost || 0) * (1 - Math.min(0.45, costReductionPct / 100)))),
    damageMultiplier: Number(ability.damageMultiplier || 1) * (1 + fullChargeDamagePct / 100),
    _charge: {
      ...ability._charge,
      durationMultiplier: Number(ability._charge.durationMultiplier || 1) * (1 + chargeDurationPct / 100)
    }
  };
}

function startAbilityCooldown(player, ability, now) {
  player.cooldowns = player.cooldowns || {};
  if (ability.channelProfile) {
    delete player.cooldowns[ability.id];
    return;
  }

  const useChargeState = getAbilityUseChargeState(player, ability, now);
  if (useChargeState.maxCharges > 1) {
    spendAbilityUseCharge(player, ability, now);
  }

  player.cooldowns[ability.id] = now;
}

function startVisualAbilityAction(player, world, ability, kind, now) {
  if (!player || !ability) return;

  const signature = ability.classId==='fellhunter'||ability.subclassId&&!ability.sunkenBase?null:getSignatureAbilityProfile(ability.id);
  const chargeLevel = Math.max(0, Number(ability?._charge?.level || 0));
  const channel = player.activeChannel?.abilityId === ability.id ? player.activeChannel : null;
  const baseDuration = channel
    ? Math.max(0.7, Number(channel.duration || 1.1))
    : kind === 'summon'
    ? 0.76 + chargeLevel * 0.05
    : kind === 'guard'
      ? 0.46
      : 0.54 + chargeLevel * 0.05;
  const duration = Math.max(baseDuration, Number(signature?.duration || 0)) * (channel ? 1 : attackRecoveryMultiplier(ability));
  const releasePoint = channel
    ? 0.12
    : Number(signature?.releasePoint ?? (kind === 'guard' ? 0.24 : 0.34));
  const visualLead = kind === 'guard' ? 0.02 : 0.045;
  const facingX = Number.isFinite(Number(player.dirX)) ? Number(player.dirX) : 0;
  const facingY = Number.isFinite(Number(player.dirY)) ? Number(player.dirY) : 1;

  player.visualAction = {
    kind,
    abilityId: ability.id,
    subclassId: ability.subclassId,
    signatureProfileId: signature?.id || null,
    toolkitPose:ability.classId==='fellhunter',
    animationFamily: ability.classId==='fellhunter'?(fellhunterToolAnimation(player,ability)||inferAbilityAnimationFamily(player,ability,kind)):(signature?.animationFamily||ability.animationFamily||inferAbilityAnimationFamily(player,ability,kind)),
    startedAt: channel ? now : now - duration * (releasePoint + visualLead),
    duration,
    releasePoint,
    chargeLevel,
    chargeProgress: Number(ability?._charge?.progress || 0),
    classId: player.classId || null
  };

  if(!ability.subclassId)spawnWorldEffect(world, {
    kind:'abilityPresentation',abilityId:ability.id,layer:'front',
    x:player.x,y:player.y-9,dirX:facingX,dirY:facingY,
    ttl:Math.min(.95,Math.max(.5,duration*.85)),radius:28+chargeLevel*5,
    chargeLevel,masteryTier:ability._mastery?.tier||0
  });

  if (signature && !signature.productionTechnique && !ability.subclassId) {
    spawnWorldEffect(world, {
      kind: 'signatureAbilityRelease',
      layer: 'front',
      x: player.x + facingX * 12,
      y: player.y + facingY * 12 - 10,
      ttl: chargeLevel >= 2 ? 0.42 : 0.3,
      radius: 30 + chargeLevel * 7,
      profileId: signature.id,
      effectKind: signature.effectKind,
      colors: signature.colors,
      dirX: facingX,
      dirY: facingY,
      chargeLevel
    });
  }
}

function inferAbilityAnimationFamily(player, ability, kind) {
  if (ability.animationFamily) return ability.animationFamily;
  if (kind === 'summon') return 'ritual';
  if (kind === 'guard') return 'guard';
  if (isOathkeeper(player) && ability?.damage) return 'melee';
  if (isFellhunter(player) && ability?.damage) return 'ranged';
  if (ability?.id === 'hydromancerTidalCut') return 'melee';
  if (ability?.id === 'hydromancerRiptideStep') return 'cast';
  if (ability?.id === 'hellfireBrand' || ability?.id === 'crimsonFeast') return 'melee';
  return 'cast';
}

function useDamageAbility(player, world, ability, log, now, input = null) {
  playSfx('ability', { volume: 0.82, throttle: 0.06 });

  if (ability.id === 'oathkeeperOathStrike' || ability.id === 'heavyCut') {
    return useOathkeeperOathStrike(player, world, ability, log, now, input);
  }

  if (ability.id === 'oathkeeperBastionBash' || ability.id === 'aegisBreaker') {
    return useOathkeeperBastionBash(player, world, ability, log, now, input);
  }

  if (ability.id === 'oathkeeperDivineLeap' || ability.id === 'cleavingStep') {
    return useOathkeeperDivineLeap(player, world, ability, log, now, input);
  }

  if (ability.id === 'oathkeeperJudgmentSmite' || ability.id === 'radiantSmite') {
    return useOathkeeperJudgmentSmite(player, world, ability, log, now, input);
  }

  if (ability.id === 'oathkeeperConsecratedGround') {
    return useOathkeeperConsecratedGround(player, world, ability, log, now, input);
  }

  if (ability.id === 'oathkeeperBulwarkOfLight') {
    return useOathkeeperBulwarkOfLight(player, world, ability, log, now);
  }

  if (ability.id === 'oathkeeperLastRite') {
    return useOathkeeperLastRite(player, world, ability, log, now);
  }

  if (ability.id === 'oathkeeperHeavenbreakerJudgment') {
    return useOathkeeperHeavenbreakerJudgment(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterPracticalStrike' || ability.id === 'mercenaryPracticalStrike') {
    return useFellhunterPracticalStrike(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterThrowingDaggers' || ability.id === 'quickShot' || ability.id === 'mercenaryThrowingDaggers') {
    return useFellhunterThrowingDaggers(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterBearTrap' || ability.id === 'snareTrap' || ability.id === 'mercenaryBearTrap') {
    return useFellhunterBearTrap(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterCaltrops' || ability.id === 'mercenaryCaltrops') {
    return useFellhunterCaltrops(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterBombToss' || ability.id === 'mercenaryBombToss') {
    return useFellhunterBombToss(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterGrapplingHook' || ability.id === 'mercenaryGrapplingHook') {
    return useFellhunterGrapplingHook(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterFlamingArrowVolley' || ability.id === 'arrowVolley' || ability.id === 'mercenaryFlamingArrowVolley') {
    return useFellhunterFlamingArrowVolley(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterSmokeBomb' || ability.id === 'smokeBomb' || ability.id === 'mercenarySmokeBomb') {
    return useFellhunterSmokeBomb(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterMarkedShot' || ability.id === 'markedArrow' || ability.id === 'mercenaryMarkedShot') {
    return useFellhunterMarkedShot(player, world, ability, log, now, input);
  }

  if (ability.id === 'fellhunterKillZone' || ability.id === 'mercenaryKillZone') {
    return useFellhunterKillZone(player, world, ability, log, now, input);
  }

  if (ability.id === 'bloodLance') {
    return useBloodLance(player, world, ability, log, now, input);
  }

  if (ability.id === 'soulSiphon') {
    return useSoulSiphon(player, world, ability, log, now);
  }

  if (ability.id === 'thornbinderThornLash' || ability.id === 'vineWhip') {
    return useThornbinderThornLash(player, world, ability, log, now, input);
  }

  if (ability.id === 'thornbinderBriarHook') {
    return useThornbinderBriarHook(player, world, ability, log, now, input);
  }

  if (ability.id === 'thornbinderBramblePatch') {
    return useThornbinderBramblePatch(player, world, ability, log, now, input);
  }

  if (ability.id === 'thornbinderRosebiteBurst') {
    return useThornbinderRosebiteBurst(player, world, ability, log, now, input);
  }

  if (ability.id === 'thornbinderLivingBriar' || ability.id === 'wildBloom') {
    return useThornbinderLivingBriar(player, world, ability, log, now);
  }

  if (ability.id === 'thornbinderRootPrison' || ability.id === 'brambleSnare') {
    return useThornbinderRootPrison(player, world, ability, log, now, input);
  }

  if (ability.id === 'wildBloom') {
    return useWildBloom(player, world, ability, log, now);
  }

  if (ability.id === 'brambleSnare') {
    return useBrambleSnare(player, world, ability, log, now, input);
  }

  if (ability.id === 'hydromancerWaterTorrent') {
    return useHydromancerWaterTorrent(player, world, ability, log, now, input);
  }

  if (ability.id === 'hydromancerBubbleWard') {
    return useHydromancerBubbleWard(player, world, ability, log, now);
  }

  if (ability.id === 'hydromancerMendingCurrent') {
    return useHydromancerMendingCurrent(player, world, ability, log, now);
  }

  if (ability.id === 'hydromancerTidalCut') {
    return useHydromancerTidalCut(player, world, ability, log, now, input);
  }

  if (ability.id === 'hydromancerRiptideStep') {
    return useHydromancerRiptideStep(player, world, ability, log, now, input);
  }

  if (ability.id === 'hydromancerDrowningPressure') {
    return useHydromancerDrowningPressure(player, world, ability, log, now, input);
  }

  if (ability.id === 'hydromancerWellspring') {
    return useHydromancerWellspring(player, world, ability, log, now);
  }

  if (ability.id === 'hydromancerDelugeCrown') {
    return useHydromancerDelugeCrown(player, world, ability, log, now);
  }

  if (ability.id === 'lightbringerGleamBolt') {
    return useLightbringerGleamBolt(player, world, ability, log, now, input);
  }

  if (ability.id === 'lightbringerHaloBrand') {
    return useLightbringerHaloBrand(player, world, ability, log, now, input);
  }

  if (ability.id === 'lightbringerRayOfRebuke') {
    return useLightbringerRayOfRebuke(player, world, ability, log, now, input);
  }

  if (ability.id === 'lightbringerPrismGuard') {
    return useLightbringerPrismGuard(player, world, ability, log, now);
  }

  if (ability.id === 'lightbringerDawncarver') {
    return useLightbringerDawncarver(player, world, ability, log, now, input);
  }

  if (ability.id === 'lightbringerSolarVerdict') {
    return useLightbringerSolarVerdict(player, world, ability, log, now, input);
  }

  if (ability.id === 'lightbringerHaloAegis') {
    return useLightbringerHaloAegis(player, world, ability, log, now);
  }

  if (ability.id === 'lightbringerFirstSunrise') {
    return useLightbringerFirstSunrise(player, world, ability, log, now);
  }

  if (ability.id === 'voidstepBurst') {
    return useVoidstepBurst(player, world, ability, log, now, input);
  }

  if (ability.id === 'blackStarPulse') {
    return useBlackStarPulse(player, world, ability, log, now);
  }

  if (ability.id === 'redMawRift') {
    return useRedMawRift(player, world, ability, log, now, input);
  }

  if (ability.id === 'hellfireBrand') {
    return useHellfireBrand(player, world, ability, log, now, input);
  }

  if (ability.id === 'seraphicAegis') {
    return useSeraphicAegis(player, world, ability, log, now);
  }

  if (ability.id === 'crimsonFeast') {
    return useCrimsonFeast(player, world, ability, log, now, input);
  }

  if (isNecroticBoltAbility(ability)) {
    return useNecroticBoltProjectile(player, world, ability, log, now, input);
  }

  if (isVineWhipAbility(ability)) {
    return useDirectionalVineWhip(player, world, ability, log, now, input);
  }

  if (!payAbilityCost(player, ability)) {
    log?.('Not enough resources.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const target = findTargetInDirection(player, world, ability.range || 120, input);

  if (!target) {
    log?.(`${ability.name} found no target.`);

    addFloatingText(player, 'Miss', {
      color: '#9facbf'
    });

    return true;
  }

  const damage = calculateAbilityDamage(player, ability);

  damageEnemyDirect(player, world, target, damage, ability.skill || 'blade', log, {
    sourceAbilityId: ability.id,
    sourceName: ability.name,
    color: ability.skill === 'spirit' ? '#b68cff' : '#ffcc66',
    xpMultiplier: 0.35
  });

  log?.(`${ability.name} hit ${target.name || 'enemy'} for ${damage}.`);
  return true;
}

function useOathkeeperOathStrike(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 50;
  const width = 36;
  const targets = findEnemiesInCone(player, world, aim, range, width, 3);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Oath Empowered',
    scalar: 1.16 + Math.max(0, bonuses.convictionPowerPct || 0) / 200
  });

  spawnWorldEffect(world, {
    kind: 'oathkeeperOathStrike',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    dirX: aim.x,
    dirY: aim.y,
    range,
    width,
    color: '#ffcc66',
    ttl: 0.26
  });

  if (!targets.length) {
    addFloatingText(player, 'Oath Strike', { color: '#ffcc66', ttl: 0.5, size: 11 });

    return true;
  }

  let hits = 0;
  for (const info of targets) {
    const damage = calculateAbilityDamage(player, {
      ...ability,
      damageMultiplier: (ability.damageMultiplier || 1.35) * convictionScalar * (hits === 0 ? 1 : 0.68)
    });

    damageEnemyDirect(player, world, info.enemy, damage, 'blunt', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Oath Strike',
      color: '#ffcc66',
      xpMultiplier: 0.38,
      singleTarget: hits === 0,
      melee: true,
      element: 'holy',
      stagger: ability._charge?.level >= 1
    });

    hits += 1;
  }

  grantOathkeeperConviction(player, now, targets.length > 1 ? 2 : 1, 'Conviction');

  if (bonuses.blockReflectPct) {
    player.buffs = player.buffs || {};
    player.buffs.defense = {
    sourceAbilityId: ability.id,
      timer: Math.max(player.buffs.defense?.timer || 0, 1.4),
      reduction: Math.max(player.buffs.defense?.reduction || 0, 0.12)
    };
  }

  log?.(`Oath Strike hit ${hits} target${hits === 1 ? '' : 's'}.`);
  return true;
}

function useOathkeeperBastionBash(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 62;
  const targets = findEnemiesInCone(player, world, aim, range, 52, 4);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Bastion Conviction',
    scalar: 1.12 + Math.max(0, bonuses.convictionPowerPct || 0) / 240
  });

  spawnWorldEffect(world, {
    kind: 'oathkeeperBastionBash',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    dirX: aim.x,
    dirY: aim.y,
    range,
    width: 54,
    color: '#fff4c7',
    ttl: 0.34
  });

  if (!targets.length) {
    addFloatingText(player, 'Bastion Bash', { color: '#fff0b8', ttl: 0.52, size: 11 });

    return true;
  }

  for (const info of targets) {
    const damage = calculateAbilityDamage(player, {
      ...ability,
      damageMultiplier: (ability.damageMultiplier || 1.25) * convictionScalar
    });
    const knockback = 10 + Math.min(16, range * 0.18);
    moveActorWithCollision(info.enemy, world, aim.x * knockback, aim.y * knockback, info.enemy.radius || info.enemy.r || 12);
    info.enemy.staggerTimer = Math.max(info.enemy.staggerTimer || 0, (0.5 + Math.max(0, bonuses.staggerPowerPct || 0) / 100) * getChargeStaggerMultiplier(ability));
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 0.85 * getChargeDurationMultiplier(ability));

    damageEnemyDirect(player, world, info.enemy, damage, 'blunt', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Bastion Bash',
      color: '#fff0b8',
      xpMultiplier: 0.36,
      aoe: targets.length > 1,
      element: 'holy',
      stagger: true,
      knockback: true,
      dirX: aim.x,
      dirY: aim.y
    });
  }

  const duration = 1.6 * (1 + Math.max(0, bonuses.defenseBuffDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);
  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, duration),
    reduction: Math.max(player.buffs.defense?.reduction || 0, 0.22)
  };
  grantOathkeeperConviction(player, now, 1, 'Radiant Guard');

  log?.(`Bastion Bash staggered ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useOathkeeperDivineLeap(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const distance = Math.min(ability.range || 118, 128);
  const startX = player.x;
  const startY = player.y;
  moveActorWithCollision(player, world, aim.x * distance, aim.y * distance, player.radius || 12);
  presentClassMobility(player,world,{x:startX,y:startY},ability,now);

  const radius = (58 + Math.max(0, bonuses.divineLeapRadiusPct || 0) * 0.4) * Number(ability._charge?.radiusMultiplier || 1);
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 8);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Leaping Conviction',
    scalar: 1.14 + Math.max(0, bonuses.convictionPowerPct || 0) / 220
  });
  const damage = Math.ceil(calculateAbilityDamage(player, {
    ...ability,
    damageMultiplier: (ability.damageMultiplier || 1.5) * convictionScalar
  }) * (1 + Math.max(0, bonuses.holyDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'oathkeeperDivineLeap',
    layer: 'front',
    x: startX,
    y: startY - 8,
    targetX: player.x,
    targetY: player.y - 8,
    dirX: aim.x,
    dirY: aim.y,
    radius,
    color: '#fff1b8',
    ttl: 0.5
  });

  spawnWorldEffect(world, {
    kind: 'oathkeeperJudgmentSmite',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#ffcc66',
    ttl: 0.48
  });

  for (const info of targets) {
    info.enemy.staggerTimer = Math.max(info.enemy.staggerTimer || 0, 0.42 * getChargeStaggerMultiplier(ability));
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 0.9 * getChargeDurationMultiplier(ability));
    damageEnemyDirect(player, world, info.enemy, damage, 'blunt', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Divine Leap',
      color: '#fff1b8',
      xpMultiplier: 0.42,
      aoe: true,
      element: 'holy',
      stagger: true
    });
  }

  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, 1.4 + Math.min(1.2, targets.length * 0.18)),
    reduction: Math.max(player.buffs.defense?.reduction || 0, 0.2)
  };
  grantOathkeeperConviction(player, now, targets.length > 1 ? 2 : 1, 'Conviction');

  log?.(`Divine Leap crashed into ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useOathkeeperJudgmentSmite(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 86) *
    Number(ability._charge?.radiusMultiplier || 1) *
    (1 + Math.max(0, bonuses.judgmentSmiteRadiusPct || bonuses.smiteWidthPct || 0) / 100);
  const centerX = player.x + aim.x * Math.min(24, radius * 0.24);
  const centerY = player.y + aim.y * Math.min(24, radius * 0.24);
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 10);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Judgment Conviction',
    scalar: 1.2 + Math.max(0, bonuses.convictionPowerPct || 0) / 180
  });
  const damage = Math.ceil(calculateAbilityDamage(player, {
    ...ability,
    damageMultiplier: (ability.damageMultiplier || 1.6) * convictionScalar
  }) * (1 + Math.max(0, bonuses.holyDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'oathkeeperJudgmentSmite',
    layer: 'front',
    x: centerX,
    y: centerY - 6,
    dirX: aim.x,
    dirY: aim.y,
    radius,
    color: '#ffcc66',
    ttl: 0.58
  });

  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: 2.2 * (1 + Math.max(0, bonuses.defenseBuffDurationPct || 0) / 100) * getChargeDurationMultiplier(ability),
    reduction: 0.18 + Math.min(0.12, (bonuses.armour || 0) * 0.006)
  };

  if (!targets.length) {
    addFloatingText(player, 'Judgment', { color: '#ffcc66', ttl: 0.65, size: 12 });

    return true;
  }

  for (const info of targets) {
    info.enemy.staggerTimer = Math.max(info.enemy.staggerTimer || 0, 0.2 * getChargeStaggerMultiplier(ability));

    damageEnemyDirect(player, world, info.enemy, damage, 'blunt', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Judgment Smite',
      color: '#ffcc66',
      xpMultiplier: 0.4,
      aoe: true,
      element: 'holy',
      magic: true,
      stagger: ability._charge?.level >= 1
    });
  }

  grantOathkeeperConviction(player, now, targets.length > 2 ? 2 : 1, 'Conviction');
  log?.(`Judgment Smite hit ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useOathkeeperConsecratedGround(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 92) *
    Number(ability._charge?.radiusMultiplier || 1) *
    (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100);
  const duration = 5.4 *
    (1 + Math.max(0, bonuses.consecratedGroundDurationPct || 0) / 100) *
    getChargeDurationMultiplier(ability);
  const centerX = player.x + aim.x * 22;
  const centerY = player.y + aim.y * 22;
  const tickDamage = Math.max(3, Math.ceil(calculateAbilityDamage(player, ability) * 0.42));

  spawnWorldEffect(world, {
    kind: 'oathkeeperConsecratedGround',
    layer: 'behind',
    x: centerX,
    y: centerY,
    radius,
    duration,
    color: '#fff1b8',
    ttl: duration
  });

  player.oathkeeper = player.oathkeeper && typeof player.oathkeeper === 'object' ? player.oathkeeper : {};
  player.oathkeeper.consecratedGround = {
    sourceAbilityId: ability.id,
    x: centerX,
    y: centerY,
    radius,
    until: now + duration,
    nextTick: now,
    tickInterval: 0.85,
    damage: tickDamage
  };

  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, duration),
    reduction: Math.max(player.buffs.defense?.reduction || 0, 0.24)
  };

  updateOathkeeperConsecratedGround(player, world, 0, now, log);
  addFloatingText(player, 'Consecrated', { color: '#fff1b8', ttl: 0.8, size: 13 });

  log?.('Consecrated Ground sanctifies the fight.');
  return true;
}

function useOathkeeperBulwarkOfLight(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const bonuses = getSkillTreeBonuses(player);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Bulwark Conviction',
    scalar: 1.1 + Math.max(0, bonuses.convictionPowerPct || 0) / 260
  });
  const duration = 4.6 * convictionScalar * getChargeDurationMultiplier(ability);

  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, duration),
    reduction: Math.max(player.buffs.defense?.reduction || 0, 0.48)
  };
  player.oathkeeper = player.oathkeeper && typeof player.oathkeeper === 'object' ? player.oathkeeper : {};
  player.oathkeeper.bulwarkUntil = Math.max(player.oathkeeper.bulwarkUntil || 0, now + duration);

  spawnWorldEffect(world, {
    kind: 'oathkeeperBulwark',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    dirX: player.dirX || 0,
    dirY: player.dirY ?? 1,
    radius: 54,
    color: '#fff1b8',
    ttl: 0.76
  });

  addFloatingText(player, 'Bulwark', { color: '#fff1b8', ttl: 0.8, size: 13 });

  log?.('Bulwark of Light raised.');
  return true;
}

function useOathkeeperLastRite(player, world, ability, log, now) {
  const bonuses = getSkillTreeBonuses(player);
  const adjustedAbility = {
    ...ability,
    cost: Math.max(24, Math.ceil(Number(ability.cost || 42) * (1 - Math.max(0, bonuses.lastRiteCostReductionPct || 0) / 100)))
  };

  if (!payAbilityCost(player, adjustedAbility)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Rite Conviction',
    scalar: 1.18 + Math.max(0, bonuses.convictionPowerPct || 0) / 200
  });
  const missing = Math.max(0, (player.maxHp || 100) - (player.hp || 0));
  const heal = Math.max(
    22,
    Math.ceil(Math.min(player.maxHp || 100, 30 + getPlayerCombatLevel(player) * 0.55 + missing * 0.34) * convictionScalar)
  );
  player.hp = Math.min(player.maxHp || 100, (player.hp || 0) + heal);
  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, 1.8),
    reduction: Math.max(player.buffs.defense?.reduction || 0, 0.22)
  };

  spawnWorldEffect(world, {
    kind: 'oathkeeperLastRite',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    radius: 62,
    color: '#fff1b8',
    ttl: 0.88
  });
  addFloatingText(player, `+${heal}`, { color: '#fff1b8', ttl: 0.85, size: 14 });

  log?.(`Last Rite restored ${heal} health.`);
  return true;
}

function useOathkeeperHeavenbreakerJudgment(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 132) *
    Number(ability._charge?.radiusMultiplier || 1) *
    (1 + Math.max(0, bonuses.judgmentSmiteRadiusPct || 0) / 160);
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 14);
  const convictionScalar = consumeOathkeeperConviction(player, now, {
    label: 'Heavenbreaker Conviction',
    scalar: 1.24 + Math.max(0, bonuses.convictionPowerPct || 0) / 160
  });
  const damage = Math.ceil(calculateAbilityDamage(player, {
    ...ability,
    damageMultiplier: (ability.damageMultiplier || 2.0) * convictionScalar
  }) * (1 + Math.max(0, bonuses.holyDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'oathkeeperHeavenbreaker',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#fff1b8',
    ttl: 0.92
  });

  for (const info of targets) {
    info.enemy.staggerTimer = Math.max(info.enemy.staggerTimer || 0, 0.7 * getChargeStaggerMultiplier(ability));
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.4 * getChargeDurationMultiplier(ability));
    damageEnemyDirect(player, world, info.enemy, damage, 'blunt', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Heavenbreaker Judgment',
      color: '#fff1b8',
      xpMultiplier: 0.5,
      aoe: true,
      element: 'holy',
      magic: true,
      stagger: true
    });
  }

  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, 3.0),
    reduction: Math.max(player.buffs.defense?.reduction || 0, 0.34)
  };

  addFloatingText(player, 'Heavenbreaker', { color: '#fff1b8', ttl: 1.0, size: 15 });


  log?.(`Heavenbreaker Judgment shattered through ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

export function grantOathkeeperConviction(player, now = performance.now() / 1000, stacks = 1, label = 'Conviction') {
  if (!isOathkeeper(player)) return false;

  const state = ensurePassiveState(player);
  if (!state) return false;

  const bonusStacks = Math.max(1, Math.floor(stacks || 1));
  state.oathboundRiposteStacks = Math.min(3, Math.max(state.oathboundRiposteStacks || 0, 0) + bonusStacks);
  state.oathboundRiposteUntil = Math.max(state.oathboundRiposteUntil || 0, now + 4.2);

  player.flags = player.flags || {};
  player.flags.oathboundRiposteStacks = state.oathboundRiposteStacks;
  player.flags.oathboundRiposteUntil = state.oathboundRiposteUntil;

  addFloatingText(player, `${label} x${state.oathboundRiposteStacks}`, {
    preset: 'status',
    color: '#ffcc66',
    offsetY: -58,
    ttl: 0.7,
    size: 11
  });

  return true;
}

function consumeOathkeeperConviction(player, now = performance.now() / 1000, options = {}) {
  if (!isOathkeeper(player)) return 1;
  const state = ensurePassiveState(player);
  if (!state || state.oathboundRiposteStacks <= 0 || state.oathboundRiposteUntil <= now) return 1;

  const stacks = Math.max(1, Math.min(3, Math.floor(state.oathboundRiposteStacks || 0)));
  state.oathboundRiposteStacks = Math.max(0, state.oathboundRiposteStacks - 1);
  if (state.oathboundRiposteStacks <= 0) {
    state.oathboundRiposteUntil = 0;
  }

  player.flags = player.flags || {};
  player.flags.oathboundRiposteStacks = state.oathboundRiposteStacks;
  player.flags.oathboundRiposteUntil = state.oathboundRiposteUntil;

  addFloatingText(player, options.label || 'Conviction', {
    preset: 'status',
    color: '#fff1b8',
    offsetY: -68,
    ttl: 0.72,
    size: 12
  });

  return Number(options.scalar || 1.16) + Math.max(0, stacks - 1) * 0.08;
}

function updateOathkeeperConsecratedGround(player, world, dt, now, log) {
  if (!isOathkeeper(player)) return false;
  const ground = player?.oathkeeper?.consecratedGround;
  if (!ground || Number(ground.until || 0) <= now) {
    if (player?.oathkeeper) delete player.oathkeeper.consecratedGround;
    return false;
  }

  const distance = Math.hypot((player.x || 0) - (ground.x || 0), (player.y || 0) - (ground.y || 0));
  if (distance <= Number(ground.radius || 0)) {
    player.buffs = player.buffs || {};
    player.buffs.defense = {
      timer: Math.max(player.buffs.defense?.timer || 0, 0.35),
      reduction: Math.max(player.buffs.defense?.reduction || 0, 0.24)
    };
  }

  if (Number(ground.nextTick || 0) > now) return true;
  ground.nextTick = now + Math.max(0.35, Number(ground.tickInterval || 0.85));

  const targets = findEnemiesInRadius(world, ground.x, ground.y, ground.radius || 86, 12);
  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 0.35);
    damageEnemyDirect(player, world, info.enemy, ground.damage || 5, 'blunt', log, {
      sourceName: 'Consecrated Ground',
      sourceAbilityId: ground.sourceAbilityId,
      color: '#fff1b8',
      xpMultiplier: 0.18,
      aoe: true,
      element: 'holy',
      magic: true
    });
  }

  if (targets.length > 1) {
    grantOathkeeperConviction(player, now, 1, 'Conviction');
  }

  return true;
}

function useFellhunterPracticalStrike(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 52;
  const targets = findEnemiesInCone(player, world, aim, range, 36, 2);

  spawnWorldEffect(world, {
    kind: 'fellhunterPracticalStrike',
    layer: 'front',
    x: player.x + aim.x * 20,
    y: player.y + aim.y * 20 - 4,
    dirX: aim.x,
    dirY: aim.y,
    range:Math.max(18,range-20),
    color: '#c6ccd4',
    ttl: 0.22
  });

  if (!targets.length) {
    addFloatingText(player, 'Steel Ready', { color: '#c6ccd4', ttl: 0.45, size: 11 });

    return true;
  }

  for (const info of targets) {
    const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.exposedDamagePct || 0) / 180));
    damageEnemyDirect(player, world, info.enemy, damage, 'blade', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Practical Strike',
      color: '#d6dde5',
      xpMultiplier: 0.3,
      melee: true,
      singleTarget: targets.length === 1,
      fellhunter: true,
      dirX: aim.x,
      dirY: aim.y
    });
  }

  log?.(`Practical Strike caught ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useFellhunterThrowingDaggers(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 210;
  const fan = bonuses.abilityCharge_fellhunterThrowingDaggers ? 3 : 2;
  const targets = findEnemiesInCone(player, world, aim, range, fan > 2 ? 46 : 34, fan);
  const target = targets[0]?.enemy || null;
  const endX = target?.x || player.x + aim.x * range;
  const endY = target?.y || player.y + aim.y * range;

  spawnWorldEffect(world, {
    kind: 'fellhunterDaggers',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    targetX: endX,
    targetY: endY - (target ? 8 : 0),
    dirX: aim.x,
    dirY: aim.y,
    count: Math.max(1, targets.length || fan),
    color: '#c6ccd4',
    ttl: 0.24
  });

  if (!targets.length) {
    addFloatingText(player, 'Daggers', { color: '#c6ccd4', ttl: 0.48, size: 11 });

    return true;
  }

  let hitCount = 0;
  for (const info of targets) {
    const crit = Math.random() < 0.08 + Math.min(0.14, Math.max(0, bonuses.critChancePct || 0) / 100);
    const exposedScalar = isEnemyExposed(info.enemy, now) ? 1.12 : 1;
    const damage = Math.ceil(calculateAbilityDamage(player, ability) * exposedScalar * (1 - hitCount * 0.08));

    damageEnemyDirect(player, world, info.enemy, crit ? Math.ceil(damage * 1.42) : damage, 'archery', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Throwing Daggers',
      color: crit ? '#ffcc66' : '#d6dde5',
      xpMultiplier: 0.32,
      crit,
      ranged: true,
      projectile: true,
      singleTarget: targets.length === 1,
      fellhunter: true
    });

    hitCount += 1;
  }

  log?.(`Throwing Daggers hit ${hitCount} target${hitCount === 1 ? '' : 's'}.`);
  return true;
}

function useFellhunterBearTrap(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const placement = getFellhunterPlacementPoint(player, world, aim, Math.min(ability.range || 86, 96));
  const armSpeed = 1 + Math.max(0, Number(bonuses.trapArmSpeedPct || 0)) / 100;
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.trapDamagePct || 0) / 100));

  pruneFellhunterGadgets(player, ['fellhunterBearTrap']);
  player.traps.push({
    ownerId: player.profileId || player.id || player.slot || 1,
    sourceAbilityId: ability.id,
    kind: 'fellhunterBearTrap',
    x: placement.x,
    y: placement.y,
    radius: 30,
    armedAt: now + 0.42 / armSpeed,
    nextVisualAt: now,
    expiresAt: now + 18,
    damage
  });
  pruneFellhunterGadgets(player);

  spawnWorldEffect(world, {
    kind: 'fellhunterBearTrap',
    layer: 'front',
    x: placement.x,
    y: placement.y,
    radius: 30,
    ttl: 0.55,
    armedAt: now + 0.42 / armSpeed
  });

  grantFellhunterTacticalAdvantage(player, now, 1);

  log?.('Bear Trap set.');
  return true;
}

function useFellhunterCaltrops(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const placement = getFellhunterPlacementPoint(player, world, aim, ability.range || 82);
  const radius = 62;
  const damage = Math.max(1, Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.trapDamagePct || 0) / 100) * 0.46));

  pruneFellhunterGadgets(player);
  player.traps.push({
    ownerId: player.profileId || player.id || player.slot || 1,
    sourceAbilityId: ability.id,
    kind: 'fellhunterCaltrops',
    x: placement.x,
    y: placement.y,
    radius,
    nextTickAt: now + 0.18,
    tickInterval: 0.72,
    expiresAt: now + 7,
    damage
  });
  pruneFellhunterGadgets(player);

  spawnWorldEffect(world, {
    kind: 'fellhunterCaltrops',
    layer: 'front',
    x: placement.x,
    y: placement.y,
    radius,
    ttl: 7
  });

  grantFellhunterTacticalAdvantage(player, now, 1);

  log?.('Caltrops scattered.');
  return true;
}

function useFellhunterBombToss(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const placement = getFellhunterPlacementPoint(player, world, aim, ability.range || 154);
  const radius = 72 * (1 + Math.max(0, Number(bonuses.bombRadiusPct || 0)) / 100) * getChargeStaggerMultiplier(ability, 1);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.trapDamagePct || 0) / 160));

  pruneFellhunterGadgets(player);
  player.traps.push({
    ownerId: player.profileId || player.id || player.slot || 1,
    sourceAbilityId: ability.id,
    kind: 'fellhunterBomb',
    x: placement.x,
    y: placement.y,
    radius,
    detonateAt: now + 0.58,
    expiresAt: now + 2.2,
    damage
  });
  pruneFellhunterGadgets(player);

  spawnWorldEffect(world, {
    kind: 'fellhunterBombFuse',
    layer: 'front',
    x: placement.x,
    y: placement.y,
    radius,
    ttl: 0.62
  });

  grantFellhunterTacticalAdvantage(player, now, 1);

  log?.('Bomb tossed.');
  return true;
}

function useFellhunterGrapplingHook(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = (ability.range || 136) * (1 + Math.max(0, Number(bonuses.grapplingHookRangePct || 0)) / 100);
  const startX = player.x;
  const startY = player.y;
  const moved = moveActorWithCollision(player, world, aim.x * range, aim.y * range, player.r || 12);
  presentClassMobility(player,world,{x:startX,y:startY},ability,now);
  const endX = player.x;
  const endY = player.y;

  spawnWorldEffect(world, {
    kind: 'fellhunterGrapple',
    layer: 'front',
    x: startX,
    y: startY - 8,
    targetX: endX,
    targetY: endY - 8,
    dirX: aim.x,
    dirY: aim.y,
    range: Math.hypot(endX - startX, endY - startY),
    ttl: 0.34
  });

  player.actionState = player.actionState || {};
  player.actionState.staminaRegenDelay = Math.max(player.actionState.staminaRegenDelay || 0, 0.55);
  grantFellhunterTacticalAdvantage(player, now, moved ? 1 : 0);

  log?.(moved ? 'Grappling Hook pulled you forward.' : 'Grappling Hook caught on nothing useful.');
  return true;
}

function useFellhunterSmokeBomb(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 118) * 0.58;
  const centerX = player.x + aim.x * 42;
  const centerY = player.y + aim.y * 42;
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 7);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * 0.74);

  spawnWorldEffect(world, {
    kind: 'fellhunterSmokeBomb',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    color: '#aeb8ca',
    ttl: 1.05 * (1 + Math.max(0, Number(bonuses.smokeDurationPct || 0)) / 100)
  });

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.6 * getEnemyControlScalar(info.enemy));
    markEnemyExposed(player, info.enemy, now, 2.8, 12, { source: 'Smoke Bomb', quiet: true });

    damageEnemyDirect(player, world, info.enemy, damage, 'archery', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Smoke Bomb',
      color: '#cfd6e6',
      xpMultiplier: 0.32,
      aoe: true,
      fellhunter: true
    });
  }

  grantFellhunterTacticalAdvantage(player, now, 1);

  log?.(`Smoke Bomb caught ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useFellhunterMarkedShot(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 240;
  const target = findTargetInDirection(player, world, range, input);
  const endX = target?.x || player.x + aim.x * range;
  const endY = target?.y || player.y + aim.y * range;

  spawnWorldEffect(world, {
    kind: 'fellhunterMarkedShot',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    targetX: endX,
    targetY: endY - (target ? 8 : 0),
    dirX: aim.x,
    dirY: aim.y,
    color: '#ffb36c',
    ttl: 0.3
  });

  if (!target) {
    addFloatingText(player, 'No Mark', { color: '#9facbf', ttl: 0.55, size: 11 });

    return true;
  }

  target.slowTimer = Math.max(target.slowTimer || 0, 0.8 * getEnemyControlScalar(target));

  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.markedShotDamagePct || 0) / 100));

  damageEnemyDirect(player, world, target, damage, 'archery', log, {
    sourceAbilityId: ability.id,
    sourceName: 'Marked Shot',
    color: '#ffb36c',
    xpMultiplier: 0.4,
    ranged: true,
    projectile: true,
    singleTarget: true,
    fellhunter: true
  });
  markEnemyExposed(player, target, now, 5.2 * getChargeDurationMultiplier(ability), 14 + Math.max(0, bonuses.markedTargetDamagePct || 0), { source: 'Marked Shot' });

  log?.(`Marked Shot exposed ${target.name || 'enemy'}.`);
  return true;
}

function useFellhunterFlamingArrowVolley(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 240;
  const width = 118 * (1 + Math.max(0, bonuses.volleyWidthPct || 0) / 100);
  const maxHits = (ability.maxHits || 6) + Math.max(0, Math.floor(bonuses.volleyExtraHits || 0));
  const targets = findEnemiesInCone(player, world, aim, range, width, maxHits);

  spawnWorldEffect(world, {
    kind: 'fellhunterFlamingArrowVolley',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    dirX: aim.x,
    dirY: aim.y,
    range,
    width,
    color: '#ff9a4d',
    ttl: 0.42
  });

  if (!targets.length) {
    addFloatingText(player, 'Volley', { color: '#ff9a4d', ttl: 0.55, size: 12 });

    return true;
  }

  let hits = 0;

  for (const info of targets) {
    const falloff = 1 - Math.min(0.35, hits * 0.06);
    const exposedScalar = isEnemyExposed(info.enemy, now) ? 1.08 : 1;
    const damage = Math.ceil(calculateAbilityDamage(player, ability) * falloff * exposedScalar * (1 + (bonuses.volleyDamagePct || 0) / 100));
    const crit = Math.random() < 0.08 + Math.min(0.12, (bonuses.critChancePct || 0) / 100);
    markEnemyExposed(player, info.enemy, now, 2.0, 10, { source: 'Flaming Arrow Volley', quiet: true });

    damageEnemyDirect(player, world, info.enemy, crit ? Math.ceil(damage * 1.45) : damage, 'archery', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Flaming Arrow Volley',
      color: crit ? '#ffcc66' : '#ff9a4d',
      xpMultiplier: 0.34,
      crit,
      aoe: true,
      ranged: true,
      projectile: true,
      fellhunter: true,
      element: 'fire'
    });

    hits += 1;
  }

  log?.(`Flaming Arrow Volley struck ${hits} target${hits === 1 ? '' : 's'}.`);
  return true;
}

function useFellhunterKillZone(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const placement = getFellhunterPlacementPoint(player, world, aim, ability.range || 170);
  const radius = 88 * (1 + Math.max(0, Number(bonuses.killZoneRadiusPct || 0)) / 100);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.trapDamagePct || 0) / 140));

  pruneFellhunterGadgets(player);
  player.traps.push({
    ownerId: player.profileId || player.id || player.slot || 1,
    sourceAbilityId: ability.id,
    kind: 'fellhunterKillZone',
    x: placement.x,
    y: placement.y,
    radius,
    nextBlastAt: now + 0.52,
    blastsRemaining: 3,
    expiresAt: now + 4.2,
    damage
  });
  pruneFellhunterGadgets(player);

  spawnWorldEffect(world, {
    kind: 'fellhunterKillZone',
    layer: 'front',
    x: placement.x,
    y: placement.y,
    radius,
    ttl: 4.2
  });

  for (const info of findEnemiesInRadius(world, placement.x, placement.y, radius, 12)) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.1 * getEnemyControlScalar(info.enemy));
    markEnemyExposed(player, info.enemy, now, 3.4, 16, { source: 'Kill Zone', quiet: false });
  }

  grantFellhunterTacticalAdvantage(player, now, 2);

  log?.('Kill Zone prepared.');
  return true;
}

function useMercenaryQuickShot(player, world, ability, log, now, input = null) {
  return useFellhunterThrowingDaggers(player, world, ability, log, now, input);
}

function useMercenaryMarkedArrow(player, world, ability, log, now, input = null) {
  return useFellhunterMarkedShot(player, world, ability, log, now, input);
}

function useSmokeBomb(player, world, ability, log, now, input = null) {
  return useFellhunterSmokeBomb(player, world, ability, log, now, input);
}

function useArrowVolley(player, world, ability, log, now, input = null) {
  return useFellhunterFlamingArrowVolley(player, world, ability, log, now, input);
}

function useBloodLance(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const target = findTargetInDirection(player, world, ability.range || 280, input);
  const aim = target
    ? normalizeVector(target.x - player.x, target.y - player.y)
    : getSafeAimDirection(player, input);

  spawnWorldEffect(world, {
    kind: 'bloodLance',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    targetX: target?.x || player.x + aim.x * (ability.range || 240),
    targetY: target?.y || player.y + aim.y * (ability.range || 240),
    color: '#b68cff',
    ttl: 0.34
  });

  if (!target) {
    addFloatingText(player, 'No soul', { color: '#9facbf', ttl: 0.55, size: 12 });

    return true;
  }

  const bonuses = getSkillTreeBonuses(player);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + (bonuses.singleTargetDamagePct || 0) / 100));

  damageEnemyDirect(player, world, target, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
    sourceName: 'Blood Lance',
    color: '#b68cff',
    xpMultiplier: 0.46,
    singleTarget: true,
    lifestealBonusPct: 12
  });

  log?.(`Blood Lance pierced ${target.name || 'enemy'}.`);
  return true;
}

function useSoulSiphon(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const bonuses = getSkillTreeBonuses(player);
  const radius = ability.range || 126;
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 6);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.necroticDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'healPulse',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#b68cff',
    ttl: 0.5
  });

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Soul Siphon',
      color: '#b68cff',
      xpMultiplier: 0.36,
      aoe: true,
      lifestealBonusPct: 18
    });
  }

  log?.(`Soul Siphon drained ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useThornbinderThornLash(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = (ability.range || 245) * (1 + Math.max(0, bonuses.thornLashRangePct || 0) / 100);
  const width = 34 * Number(ability._charge?.radiusMultiplier || 1);
  const maxHits = ability.maxHits || 5;
  const targets = findEnemiesInCone(player, world, aim, range, width, maxHits);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.natureDamagePct || 0) / 100 + Math.max(0, bonuses.thornLashDamagePct || 0) / 100));
  const slow = 1.05 * (1 + Math.max(0, bonuses.slowDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);

  spawnWorldEffect(world, {
    kind: 'thornbinderThornLash',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    endX: player.x + aim.x * range,
    endY: player.y + aim.y * range - 8,
    dirX: aim.x,
    dirY: aim.y,
    width,
    color: '#5e9b4b',
    ttl: 0.26
  });

  for (const info of targets) {
    const enemy = info.enemy;
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, slow * getEnemyControlScalar(enemy));
    damageEnemyDirect(player, world, enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Thorn Lash',
      color: '#7e9d58',
      xpMultiplier: 0.28,
      aoe: true
    });
    applyVerdantWound(player, enemy, world, now, 1, { sourceAbilityId: 'thornbinderThornLash', tickDamage: 2 + Math.floor(damage * 0.18) });
  }

  if (targets.length) grantBriarBloom(player, world, now, 1.0);

  log?.(`Thorn Lash caught ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useThornbinderBriarHook(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const target = findTargetInDirection(player, world, ability.range || 315, input);
  const aim = getSafeAimDirection(player, input);
  const endX = target?.x || player.x + aim.x * (ability.range || 315);
  const endY = target?.y || player.y + aim.y * (ability.range || 315);

  spawnWorldEffect(world, {
    kind: 'thornbinderBriarHook',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    endX,
    endY: endY - 6,
    dirX: aim.x,
    dirY: aim.y,
    ttl: 0.32
  });

  if (!target) {
    addFloatingText(player, 'No hold', { color: '#9facbf', ttl: 0.5, size: 11 });

    return true;
  }

  const scalar = getEnemyControlScalar(target);
  const rootTime = (target.isBoss || target.worldBoss) ? 0 : 0.7 * scalar * getChargeDurationMultiplier(ability);
  target.slowTimer = Math.max(target.slowTimer || 0, 2.4 * scalar * getChargeDurationMultiplier(ability));
  if (rootTime > 0) target.rootUntil = Math.max(target.rootUntil || 0, now + rootTime);

  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, getSkillTreeBonuses(player).natureDamagePct || 0) / 100));
  damageEnemyDirect(player, world, target, damage, 'warding', log, {
    sourceAbilityId: ability.id,
    sourceName: 'Briar Hook',
    color: '#8aa05b',
    xpMultiplier: 0.3,
    singleTarget: true
  });
  applyVerdantWound(player, target, world, now, 2, { sourceAbilityId: ability.id, tickDamage: 2 + Math.floor(damage * 0.16) });
  grantBriarBloom(player, world, now, 1.5);

  log?.(`Briar Hook snared ${target.name || 'enemy'}.`);
  return true;
}

function useThornbinderBramblePatch(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = 62 * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100) * Number(ability._charge?.radiusMultiplier || 1);
  const centerX = player.x + aim.x * Math.min(ability.range || 145, 120);
  const centerY = player.y + aim.y * Math.min(ability.range || 145, 120);
  const tickDamage = Math.max(2, Math.ceil(calculateAbilityDamage(player, ability) * (0.34 + Math.max(0, bonuses.natureDamagePct || 0) / 260)));
  const duration = 5.4 * getChargeDurationMultiplier(ability) * (1 + Math.max(0, bonuses.bramblePatchDurationPct || 0) / 100);

  player.thornbinder = ensureThornbinderState(player);
  player.thornbinder.bramblePatch = {
    sourceAbilityId: ability.id,
    x: centerX,
    y: centerY,
    radius,
    until: now + duration,
    nextTickAt: now + 0.25,
    tickInterval: 0.95,
    damage: tickDamage,
    woundStacks: 1
  };

  spawnWorldEffect(world, {
    kind: 'thornbinderBramblePatch',
    layer: 'ground',
    x: centerX,
    y: centerY,
    radius,
    color: '#5e9b4b',
    ttl: duration
  });

  grantBriarBloom(player, world, now, 1.5);

  log?.('Bramble Patch takes root.');
  return true;
}

function useThornbinderRosebiteBurst(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = 54 * (1 + Math.max(0, bonuses.rosebiteRadiusPct || bonuses.aoeRadiusPct || 0) / 100) * Number(ability._charge?.radiusMultiplier || 1);
  const centerX = player.x + aim.x * Math.min(ability.range || 118, 104);
  const centerY = player.y + aim.y * Math.min(ability.range || 118, 104);
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 7);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.natureDamagePct || 0) / 100 + Math.max(0, bonuses.aoeDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'thornbinderRosebiteBurst',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    ttl: 0.62
  });

  for (const info of targets) {
    const scalar = getEnemyControlScalar(info.enemy);
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.35 * scalar * getChargeDurationMultiplier(ability));
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Rosebite Burst',
      color: '#b5534f',
      xpMultiplier: 0.32,
      aoe: true
    });
    applyVerdantWound(player, info.enemy, world, now, 1, { sourceAbilityId: ability.id, tickDamage: 2 + Math.floor(damage * 0.14) });
  }

  grantBriarBloom(player, world, now, 1.25);

  log?.(`Rosebite Burst snapped at ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useThornbinderLivingBriar(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const bonuses = getSkillTreeBonuses(player);
  const duration = 9.5 * getChargeDurationMultiplier(ability);
  const radius = (ability.range || THORNBINDER_BRIAR_BLOOM_RADIUS) * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 220);
  grantBriarBloom(player, world, now, duration, { radius, active: true });

  spawnWorldEffect(world, {
    kind: 'thornbinderBriarBloom',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    ttl: 0.6,
    active: true
  });

  log?.('Living Briar begins to mend nearby allies.');
  return true;
}

function useThornbinderRootPrison(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = 66 * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100) * Number(ability._charge?.radiusMultiplier || 1);
  const centerX = player.x + aim.x * Math.min(ability.range || 158, 132);
  const centerY = player.y + aim.y * Math.min(ability.range || 158, 132);
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 8);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.natureDamagePct || 0) / 100));
  const rootBase = 1.25 * (1 + Math.max(0, bonuses.rootDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);

  spawnWorldEffect(world, {
    kind: 'thornbinderRootPrison',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    ttl: 0.72
  });

  for (const info of targets) {
    const scalar = getEnemyControlScalar(info.enemy);
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 2.1 * scalar * getChargeDurationMultiplier(ability));
    if (!(info.enemy.isBoss || info.enemy.worldBoss)) {
      info.enemy.rootUntil = Math.max(info.enemy.rootUntil || 0, now + rootBase * scalar);
    }

    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Root Prison',
      color: '#8c6d3d',
      xpMultiplier: 0.28,
      aoe: true
    });
    applyVerdantWound(player, info.enemy, world, now, 2, { sourceAbilityId: ability.id, tickDamage: 2 + Math.floor(damage * 0.12) });
  }

  grantBriarBloom(player, world, now, 1.5);

  log?.(`Root Prison bound ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useWildBloom(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 110) * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100);
  const heal = Math.max(5, Math.ceil(8 + (bonuses.healingPower || 0)));
  const supportMultiplier = 1 + Math.max(0, bonuses.supportHealingPct || 0) / 100;
  const finalHeal = Math.ceil(heal * supportMultiplier * (1 + (getChargeDurationMultiplier(ability) - 1) * 0.6));

  healPartyNear(player, finalHeal, radius);

  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 8);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + (bonuses.aoeDamagePct || 0) / 100 + (bonuses.natureDamagePct || 0) / 100));
  const rootTime = 0.45 * (1 + Math.max(0, bonuses.rootDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.5);
    info.enemy.rootUntil = Math.max(info.enemy.rootUntil || 0, now + rootTime);
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Living Briar',
      color: '#73d18a',
      xpMultiplier: 0.34,
      aoe: true
    });
  }

  spawnWorldEffect(world, {
    kind: 'thornbinderBriarBloom',
    layer: 'front',
    x: player.x,
    y: player.y,
    color: '#73d18a',
    radius,
    ttl: 0.58
  });

  addFloatingText(player, `+${finalHeal}`, { color: '#73d18a', ttl: 0.72, size: 13 });

  log?.(`Living Briar healed allies and struck ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useBrambleSnare(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = 58 * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100) * Number(ability._charge?.radiusMultiplier || 1);
  const centerX = player.x + aim.x * Math.min(ability.range || 145, 118);
  const centerY = player.y + aim.y * Math.min(ability.range || 145, 118);
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 8);
  const rootTime = 1.1 * (1 + Math.max(0, bonuses.rootDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.natureDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'vineImpact',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    color: '#73d18a',
    ttl: 0.52
  });

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.6);
    info.enemy.rootUntil = Math.max(info.enemy.rootUntil || 0, now + rootTime);

    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Root Prison',
      color: '#73d18a',
      xpMultiplier: 0.34,
      aoe: true
    });
  }

  log?.(`Root Prison rooted ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useHydromancerWaterTorrent(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = (ability.range || 230) * (flow.empowered ? 1.16 : 1);
  const width = 32 * (ability._mythWidth || 1) * Number(ability._charge?.radiusMultiplier || 1) * (flow.empowered ? 1.3 : 1);
  const targets = findEnemiesInCone(player, world, aim, range, width, flow.empowered ? 8 : ability.maxHits || 5);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (flow.empowered ? 1.32 : 1));

  spawnWorldEffect(world, {
    kind: 'waterTorrent',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    dirX: aim.x,
    dirY: aim.y,
    range,
    width,
    radius: width,
    color: '#59d7e8',
    ttl: 0.48
  });

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Water Torrent',
      color: '#59d7e8',
      xpMultiplier: 0.38,
      magic: true,
      element: 'water',
      aoe: targets.length > 1
    });
    markEnemySoaked(info.enemy, now, flow.empowered ? 7 : 5, 10 + Math.max(0, bonuses.waterVulnerabilityPct || 0));
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, flow.empowered ? 1.2 : 0.7);
  }

  log?.(`Water Torrent struck ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useHydromancerBubbleWard(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const combatLevel = getPlayerCombatLevel(player);
  const chargeDuration = getChargeDurationMultiplier(ability);
  const duration = calculateBubbleWardDuration(combatLevel, chargeDuration, flow);
  const flatAbsorb = calculateBubbleWardFlatAbsorb(player, ability, flow);
  const radius = (ability.range || 118) * (flow.empowered ? 1.25 : 1);

  forPartyNear(player, radius, member => {
    member.buffs = member.buffs || {};
    const existingWard = member.buffs.bubbleWard || null;
    const existingWardActive = Number(existingWard?.until || 0) > now;
    const existingVisualActive = Number(member.visuals?.bubbleWardUntil || 0) > now;
    member.buffs.bubbleWard = {
      until: Math.max(Number(member.buffs.bubbleWard?.until || 0), now + duration),
      flatAbsorb: existingWardActive
        ? Math.max(Number(existingWard.flatAbsorb || 0), flatAbsorb)
        : flatAbsorb,
      combatLevel,
      duration,
      sourceClassId: player.classId || 'waverider'
    };
    member.visuals = member.visuals || {};
    member.visuals.bubbleWardMorph=ability.subclassId||'base';
    member.visuals.bubbleWardUntil = Math.max(
      Number(member.visuals.bubbleWardUntil || 0),
      now + duration
    );
    member.visuals.bubbleWardFlatAbsorb = existingVisualActive
      ? Math.max(Number(member.visuals.bubbleWardFlatAbsorb || 0), flatAbsorb)
      : flatAbsorb;
  });

  spawnWorldEffect(world, {
    kind: 'bubbleWard',
    layer: 'front',
    x: player.x,
    y: player.y - 4,
    radius,
    color: '#8feaf2',
    ttl: 0.72
  });

  log?.(flow.empowered
    ? `Living Water reinforced the Bubble Ward (${flatAbsorb} damage absorbed per hit for ${duration.toFixed(1)}s).`
    : `Bubble Ward surrounds the party (${flatAbsorb} damage absorbed per hit for ${duration.toFixed(1)}s).`);
  return true;
}

function useHydromancerMendingCurrent(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 132) * (flow.empowered ? 1.28 : 1);
  const heal = Math.ceil(
    (11 + Math.max(0, bonuses.healingPower || 0)) *
    (1 + Math.max(0, bonuses.supportHealingPct || 0) / 100) *
    getChargeDurationMultiplier(ability) *
    (flow.empowered ? 1.4 : 1)
  );

  healPartyNear(player, heal, radius);
  spawnWorldEffect(world, {
    kind: 'mendingCurrent',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#aef7f5',
    ttl: 0.72
  });
  addFloatingText(player, `+${heal}`, { color: '#aef7f5', ttl: 0.75, size: 13 });


  log?.('Mending Current restores the party.');
  return true;
}

function useHydromancerTidalCut(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const aim = getSafeAimDirection(player, input);
  moveActorWithCollision(player, world, aim.x * 24, aim.y * 24, player.radius || 12);
  const range = (ability.range || 76) * Number(ability._charge?.radiusMultiplier || 1) * (flow.empowered ? 1.2 : 1);
  const targets = findEnemiesInCone(player, world, aim, range, 54, flow.empowered ? 6 : 4);

  spawnWorldEffect(world, {
    kind: 'tidalCut',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    dirX: aim.x,
    dirY: aim.y,
    range,
    radius: range,
    color: '#59d7e8',
    ttl: 0.38
  });

  for (const info of targets) {
    const soaked = isEnemySoaked(info.enemy, now);
    const damage = Math.ceil(calculateAbilityDamage(player, ability) * (soaked ? 1.24 : 1) * (flow.empowered ? 1.22 : 1));
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Tidal Cut',
      color: '#8feaf2',
      xpMultiplier: 0.4,
      melee: true,
      element: 'water',
      charged: Number(ability._charge?.level || 0) > 0,
      aoe: targets.length > 1
    });
    markEnemySoaked(info.enemy, now, 4, 10);
  }

  log?.(`Tidal Cut swept through ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useHydromancerRiptideStep(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const aim = getSafeAimDirection(player, input);
  const startX = player.x;
  const startY = player.y;
  const distance = (ability.range || 138) * (flow.empowered ? 1.22 : 1);
  moveActorWithCollision(player, world, aim.x * distance, aim.y * distance, player.radius || 12);
  presentClassMobility(player,world,{x:startX,y:startY},ability,now);
  const radius = flow.empowered ? 82 : 64;
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 8);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (flow.empowered ? 1.25 : 1));

  spawnWorldEffect(world, {
    kind: 'riptideStep',
    layer: 'front',
    x: startX,
    y: startY - 8,
    targetX: player.x,
    targetY: player.y - 8,
    radius,
    color: '#59d7e8',
    ttl: 0.48
  });

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, flow.empowered ? 2.2 : 1.4);
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Riptide Step',
      color: '#59d7e8',
      xpMultiplier: 0.3,
      magic: true,
      element: 'water',
      aoe: true
    });
    markEnemySoaked(info.enemy, now, 4.5, 10);
  }

  log?.('Riptide Step carries you through the fight.');
  return true;
}

function useHydromancerDrowningPressure(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const aim = getSafeAimDirection(player, input);
  const radius = 68 * Number(ability._charge?.radiusMultiplier || 1) * (flow.empowered ? 1.3 : 1);
  const distance = Math.min(ability.range || 190, 160);
  const centerX = player.x + aim.x * distance;
  const centerY = player.y + aim.y * distance;
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 9);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (flow.empowered ? 1.28 : 1));

  spawnWorldEffect(world, {
    kind: 'drowningPressure',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    color: '#35b9d0',
    ttl: 0.7
  });

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Drowning Pressure',
      color: '#35b9d0',
      xpMultiplier: 0.42,
      magic: true,
      element: 'water',
      aoe: true,
      stagger: flow.empowered
    });
    markEnemySoaked(info.enemy, now, flow.empowered ? 10 : 7, flow.empowered ? 22 : 16);
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 2.4 * getChargeDurationMultiplier(ability));
  }

  log?.(`Drowning Pressure caught ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useHydromancerWellspring(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 150) * (flow.empowered ? 1.25 : 1);
  const heal = Math.ceil((12.5 + Math.max(0, bonuses.healingPower || 0)) * (flow.empowered ? 1.35 : 1));
  const restore = flow.empowered ? 18 : 12;

  healPartyNear(player, heal, radius);
  forPartyNear(player, radius, member => {
    member.stamina = Math.min(member.maxStamina || member.stamina || 1, (member.stamina || 0) + restore);
    if (member.maxSpirit > 0) {
      member.spirit = Math.min(member.maxSpirit || member.spirit || 1, (member.spirit || 0) + restore);
    }
  });

  spawnWorldEffect(world, {
    kind: 'wellspring',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#aef7f5',
    ttl: 1.05
  });

  log?.('Wellspring restores health and resolve.');
  return true;
}

function useHydromancerDelugeCrown(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const flow = cycleHydromancerFlow(player, now);
  const radius = (ability.range || 164) * Number(ability._charge?.radiusMultiplier || 1) * (flow.empowered ? 1.2 : 1);
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 12);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (flow.empowered ? 1.3 : 1));
  const wardDuration = 4.2 * getChargeDurationMultiplier(ability);

  spawnWorldEffect(world, {
    kind: 'delugeCrown',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    radius,
    color: '#59d7e8',
    ttl: 1.0
  });

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Deluge Crown',
      color: '#aef7f5',
      xpMultiplier: 0.5,
      magic: true,
      element: 'water',
      aoe: true,
      charged: true,
      stagger: true
    });
    markEnemySoaked(info.enemy, now, 10, 24);
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 3);
  }

  forPartyNear(player, radius, member => {
    member.buffs = member.buffs || {};
    member.buffs.defense = {
    sourceAbilityId: ability.id,
      timer: Math.max(member.buffs.defense?.timer || 0, wardDuration),
      reduction: Math.max(member.buffs.defense?.reduction || 0, flow.empowered ? 0.32 : 0.25)
    };
  });

  log?.(`Deluge Crown broke over ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

// -----------------------------------------------------------------------------
// LIGHTBRINGER
// -----------------------------------------------------------------------------

const LIGHTBRINGER_COLORS = {
  base: '#d9ad4f',
  light: '#fff1b8',
  pale: '#fff7d8',
  shadow: '#5f4a24'
};
const DAWNCARVER_CHANNEL_DURATION = 3.0;
const DAWNCARVER_BEAM_STEP = 14;
const DAWNCARVER_BASE_WIDTH = 32;
const DAWNCARVER_WIDTH_PER_LUMEN = 14;
const DAWNCARVER_MAX_TARGETS = 14;

function ensureLightbringerState(player) {
  player.lightbringer = player.lightbringer && typeof player.lightbringer === 'object'
    ? player.lightbringer
    : {};
  const rawLumens = Number(player.lightbringer.lumens || 0);
  const rawProgress = Number(player.lightbringer.lumenProgress || 0);
  player.lightbringer.maxLumens = 3;
  player.lightbringer.lumens = Math.max(0, Math.min(3, Math.floor(Number.isFinite(rawLumens) ? rawLumens : 0)));
  player.lightbringer.lumenProgress = Math.max(0, Math.min(2.999, Number.isFinite(rawProgress) ? rawProgress : 0));
  player.lightbringer.overbrightUntil = Math.max(0, Number(player.lightbringer.overbrightUntil || 0));
  player.lightbringer.firstSunriseUntil = Math.max(0, Number(player.lightbringer.firstSunriseUntil || 0));
  return player.lightbringer;
}

function getLightbringerLumens(player) {
  return ensureLightbringerState(player).lumens;
}

function isFirstSunriseActive(player, now = performance.now() / 1000) {
  return Number(ensureLightbringerState(player).firstSunriseUntil || 0) > now;
}

function gainLightbringerLumenProgress(player, amount, now, world, log, reason = 'Lumen') {
  if (player?.classId !== 'lightbringer') return 0;

  const state = ensureLightbringerState(player);
  const bonuses = getSkillTreeBonuses(player);
  const generationScalar = 1 + Math.max(0, Number(bonuses.lumenGenerationPct || 0)) / 100 + (isFirstSunriseActive(player, now) ? 0.5 : 0);
  const progressGain = Math.max(0, Number(amount || 0) * generationScalar);
  let gained = 0;

  if (progressGain <= 0) return 0;

  if (state.lumens >= state.maxLumens) {
    const overbrightDuration = Math.max(0, Number(bonuses.overbrightDuration || 0));
    if (overbrightDuration > 0) {
      state.overbrightUntil = Math.max(state.overbrightUntil || 0, now + overbrightDuration);
      addFloatingText(player, 'Overbright', {
        color: LIGHTBRINGER_COLORS.light,
        ttl: 0.75,
        size: 12
      });
    }
    state.lumenProgress = 0;
    return 0;
  }

  state.lumenProgress += progressGain;

  while (state.lumenProgress >= 3 && state.lumens < state.maxLumens) {
    state.lumenProgress -= 3;
    state.lumens = Math.min(state.maxLumens, state.lumens + 1);
    gained += 1;
    spawnWorldEffect(world, {
      kind: 'lumenGain',
      layer: 'front',
      x: player.x,
      y: player.y - 18,
      radius: 24 + state.lumens * 5,
      color: LIGHTBRINGER_COLORS.light,
      ttl: 0.36
    });
    addFloatingText(player, `Lumen ${state.lumens}/${state.maxLumens}`, {
      color: LIGHTBRINGER_COLORS.light,
      ttl: 0.65,
      size: 12
    });
  }

  if (state.lumens >= state.maxLumens) {
    state.lumenProgress = 0;
  }

  if (gained > 0) {
    log?.(`${reason}: gained ${gained} Lumen${gained === 1 ? '' : 's'}.`);
  }

  return gained;
}

function spendLightbringerLumens(player) {
  const state = ensureLightbringerState(player);
  const spent = Math.max(0, Math.min(state.maxLumens, Math.floor(Number(state.lumens || 0))));
  state.lumens = 0;
  state.lumenProgress = 0;
  return spent;
}

function requireLightbringerLumen(player, log, message = 'Requires at least 1 Lumen.') {
  if (getLightbringerLumens(player) >= 1) return true;
  addFloatingText(player, 'Requires Lumen', {
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.62,
    size: 12
  });
  log?.(message);
  return false;
}

function isHaloBranded(enemy, now = performance.now() / 1000) {
  return Number(enemy?.lightbringerHaloBrandUntil || 0) > now;
}

function useLightbringerGleamBolt(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  ensureLightbringerState(player);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = (ability.range || 310) * (1 + Math.max(0, Number(bonuses.gleamBoltRangePct || 0)) / 100);
  const speed = 380;
  const damage = calculateAbilityDamage(player, ability);

  player.abilityProjectiles = Array.isArray(player.abilityProjectiles)
    ? player.abilityProjectiles
    : [];
  player.abilityProjectiles.push({
    ownerId: player.profileId || player.id || player.slot || 1,
    sourceAbilityId: ability.id,
    id: `gleam-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'gleamBolt',
    visualProfileId: 'gleamBolt',
    x: player.x + aim.x * 14,
    y: player.y + aim.y * 14 - 10,
    dirX: aim.x,
    dirY: aim.y,
    speed,
    range,
    radius: 7,
    damage,
    ttl: range / speed + 0.15,
    age: 0,
    travelled: 0,
    color: LIGHTBRINGER_COLORS.light,
    alive: true
  });

  spawnWorldEffect(world, {
    kind: 'gleamMuzzle',
    layer: 'front',
    x: player.x + aim.x * 14,
    y: player.y + aim.y * 14 - 12,
    dirX: aim.x,
    dirY: aim.y,
    color: LIGHTBRINGER_COLORS.light,
    radius: 18,
    ttl: 0.2
  });
  playSfx(SOUND_EVENT_KEYS.PROJECTILE_LAUNCH, { volume: 0.45, throttle: 0.04 });

  log?.('Gleam Bolt released.');
  return true;
}

function useLightbringerHaloBrand(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  ensureLightbringerState(player);
  const target = findTargetInDirection(player, world, ability.range || 285, input);
  const aim = target
    ? normalizeVector(target.x - player.x, target.y - player.y)
    : getSafeAimDirection(player, input);

  spawnWorldEffect(world, {
    kind: 'haloBrandCast',
    layer: 'front',
    x: player.x,
    y: player.y - 12,
    targetX: target?.x || player.x + aim.x * Math.min(ability.range || 285, 160),
    targetY: target?.y || player.y + aim.y * Math.min(ability.range || 285, 160) - 14,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.34
  });

  if (!target || !canRadiantLineHit(world, player.x, player.y - 8, target.x, target.y - 8)) {
    addFloatingText(player, 'No mark', { color: '#9facbf', ttl: 0.55, size: 12 });

    return true;
  }

  const bonuses = getSkillTreeBonuses(player);
  const duration = 9 * (1 + Math.max(0, Number(bonuses.haloBrandDurationPct || 0)) / 100) * getChargeDurationMultiplier(ability);
  target.lightbringerHaloBrandUntil = Math.max(Number(target.lightbringerHaloBrandUntil || 0), now + duration);
  target.lightbringerHaloBrandOwnerId = player.profileId || player.playerNumber || player.id || 'player';

  const damage = Math.max(1, Math.ceil(calculateAbilityDamage(player, ability) * 0.55));
  damageEnemyDirect(player, world, target, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
    sourceName: 'Halo Brand',
    color: LIGHTBRINGER_COLORS.light,
    xpMultiplier: 0.28,
    magic: true,
    singleTarget: true,
    element: 'holy',
    lightbringer: true,
    dirX: aim.x,
    dirY: aim.y
  });

  spawnWorldEffect(world, {
    kind: 'haloBrand',
    layer: 'front',
    x: target.x,
    y: target.y - 22,
    color: LIGHTBRINGER_COLORS.light,
    radius: 26,
    ttl: 0.72
  });
  gainLightbringerLumenProgress(player, 1, now, world, log, 'Halo Brand');
  log?.(`${target.name || 'Enemy'} is Halo Branded.`);
  return true;
}

function useLightbringerRayOfRebuke(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const aim = getSafeAimDirection(player, input);
  const range = (ability.range || 235) * Number(ability._charge?.durationMultiplier || 1);
  const width = 26 * Number(ability._charge?.radiusMultiplier || 1);
  const candidates = findEnemiesInCone(player, world, aim, range, width, ability.maxHits || 5)
    .filter(info => canRadiantLineHit(world, player.x, player.y - 8, info.enemy.x, info.enemy.y - 8));
  const damage = calculateAbilityDamage(player, ability);

  spawnWorldEffect(world, {
    kind: 'rayOfRebuke',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    dirX: aim.x,
    dirY: aim.y,
    range,
    width,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.28
  });

  let brandedHit = false;
  for (const info of candidates) {
    brandedHit = brandedHit || isHaloBranded(info.enemy, now);
    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Ray of Rebuke',
      color: LIGHTBRINGER_COLORS.light,
      xpMultiplier: 0.38,
      magic: true,
      aoe: candidates.length > 1,
      element: 'holy',
      lightbringer: true,
      dirX: aim.x,
      dirY: aim.y
    });
  }

  if (candidates.length >= 2 || brandedHit) {
    gainLightbringerLumenProgress(player, 3, now, world, log, 'Ray of Rebuke');
  } else {
    gainLightbringerLumenProgress(player, candidates.length ? 1 : 0, now, world, log, 'Ray of Rebuke');
  }

  log?.(`Ray of Rebuke struck ${candidates.length} target${candidates.length === 1 ? '' : 's'}.`);
  return true;
}

function useLightbringerPrismGuard(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const bonuses = getSkillTreeBonuses(player);
  const combatLevel = getPlayerCombatLevel(player);
  const duration = 4.2 * getChargeDurationMultiplier(ability);
  const flatAbsorb = Math.max(
    4,
    Math.ceil(5.5 * Number(ability._charge?.durationMultiplier || 1) * (1 + Math.max(0, Number(bonuses.lightbringerShieldPct || 0)) / 100))
  );

  player.buffs = player.buffs || {};
  player.buffs.prismGuard = {
    until: now + duration,
    flatAbsorb,
    lumenGranted: false,
    sourceClassId: 'lightbringer'
  };
  player.visuals = player.visuals || {};
  player.visuals.prismGuardUntil = now + duration;
  player.visuals.prismGuardFlatAbsorb = flatAbsorb;

  spawnWorldEffect(world, {
    kind: 'prismGuard',
    layer: 'front',
    x: player.x,
    y: player.y - 4,
    radius: 48,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.62
  });

  log?.(`Prism Guard will absorb ${flatAbsorb} damage from each hit.`);
  return true;
}

function useLightbringerDawncarver(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const state = ensureLightbringerState(player);
  const spent = spendLightbringerLumens(player);
  const bonuses = getSkillTreeBonuses(player);
  const overbright = Number(state.overbrightUntil || 0) > now;
  const aim = getSafeAimDirection(player, input);
  const duration = DAWNCARVER_CHANNEL_DURATION;
  const width = (consumeOrbitalHalo(player) ? 12 : 0) + DAWNCARVER_BASE_WIDTH + spent * DAWNCARVER_WIDTH_PER_LUMEN + (overbright ? 8 : 0);
  const range = (ability.range || 380) + spent * 42;
  const tickInterval = spent >= 3 || overbright ? 0.14 : 0.17;
  const damageScalar = 0.62 + spent * 0.24 + Math.max(0, Number(bonuses.dawncarverDamagePct || 0)) / 100 + (overbright ? 0.14 : 0);
  const origin = getDawncarverBeamOrigin(player, aim.x, aim.y);

  const tickDamage = Math.ceil(calculateAbilityDamage(player, ability) * damageScalar);

  const runtimeState = ensureLightbringerState(player);
  runtimeState.overbrightUntil = 0;
  runtimeState.dawncarverChannel = startAbilityChannel(player, {...ability, channelProfile:{...ability.channelProfile,mode:'fixed',duration,movementMode:'slowed',movementMultiplier:.3}}, player.loadout.abilitySlots.indexOf(ability.id), now, aim, {
    until: now + duration,
    startedAt: now,
    duration,
    lumens: spent,
    dirX: aim.x,
    dirY: aim.y,
    range,
    visualRange: getDawncarverBeamReach(world, origin.x, origin.y, aim.x, aim.y, range),
    width,
    tickInterval,
    nextTickAt: now,
    nextVisualAt: now,
    damage: tickDamage,
    maxTargets: DAWNCARVER_MAX_TARGETS + spent * 2,
    hitIds: {},
    turnRate: 3.2 * (1 + Math.max(0, Number(bonuses.dawncarverTurnRatePct || 0)) / 100)
  });

  player.visualAction = {
    kind: 'channel',
    abilityId: ability.id,
    animationFamily: 'channel',
    startedAt: now,
    duration,
    releasePoint: 0.06,
    chargeLevel: spent - 1,
    chargeProgress: spent / 3,
    classId: 'lightbringer'
  };

  spawnWorldEffect(world, {
    kind: 'dawncarverStart',
    layer: 'front',
    x: player.x,
    y: player.y - 12,
    dirX: aim.x,
    dirY: aim.y,
    radius: 36 + spent * 10,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.4
  });
  addFloatingText(player, `Dawncarver ${spent}`, {
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.75,
    size: 13
  });
  log?.(`Dawncarver spends ${spent} Lumen${spent === 1 ? '' : 's'}.`);
  return true;
}

function updateLightbringerChannel(player, world, input, dt, now, log) {
  if (player.activeChannel?.abilityId !== 'lightbringerDawncarver' || player.activeChannel.subclassId) return;
  const channel=player.activeChannel;
  updateAbilityChannel(player,input,dt,now,{
    onEnd:c=>{endLightbringerChannel(player,world,c);playAbilityAudioEvent('channelEnd',getAbilityById(c.abilityId));},
    onTick:c=>{
      const origin=getDawncarverBeamOrigin(player,c.dirX,c.dirY);
      c.visualRange=getDawncarverBeamReach(world,origin.x,origin.y,c.dirX,c.dirY,c.range);
      c.originX=origin.x;c.originY=origin.y;
      const targets=findEnemiesInBeam(world,origin.x,origin.y,c.dirX,c.dirY,c.visualRange,c.width,c.maxTargets);
      for(const info of targets) damageEnemyDirect(player,world,info.enemy,c.damage,'spirit',log,{
        sourceAbilityId:c.sourceAbilityId,sourceName:'Dawncarver',color:LIGHTBRINGER_COLORS.light,
        magic:true,aoe:true,element:'holy',lightbringer:true,ranged:true,channelTick:true,quiet:true,dirX:c.dirX,dirY:c.dirY
      });
    }
  });
  if(player.activeChannel===channel){
    const origin=getDawncarverBeamOrigin(player,channel.dirX,channel.dirY);
    channel.originX=origin.x;channel.originY=origin.y;
    channel.visualRange=getDawncarverBeamReach(world,origin.x,origin.y,channel.dirX,channel.dirY,channel.range);
  }
}

function endLightbringerChannel(player, world, channel) {
  if (!player || !channel) return;

  const originX = Number(channel.originX || player.x);
  const originY = Number(channel.originY || player.y - 12);
  const aim = normalizeAimVector(channel.dirX, channel.dirY);
  const dirX = aim.active ? aim.x : 0;
  const dirY = aim.active ? aim.y : 1;
  const range = Number(channel.visualRange ?? channel.range ?? 0);

  spawnWorldEffect(world, {
    kind: 'dawncarverEnd',
    layer: 'front',
    x: originX + dirX * range,
    y: originY + dirY * range,
    radius: 18 + Math.max(1, Number(channel.lumens || 1)) * 7,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.28
  });
}

function getDawncarverBeamOrigin(player, dirX = 0, dirY = 1) {
  return {
    x: (player?.x || 0) + Number(dirX || 0) * 16,
    y: (player?.y || 0) + Number(dirY || 0) * 14 - 13
  };
}

function getDawncarverBeamReach(world, originX, originY, dirX, dirY, range) {
  const safeRange = Math.max(0, Number(range || 0));
  if (!world?.tiles?.length) return safeRange;

  let lastPassable = 0;
  for (let distance = DAWNCARVER_BEAM_STEP; distance <= safeRange; distance += DAWNCARVER_BEAM_STEP) {
    const x = originX + dirX * distance;
    const y = originY + dirY * distance;
    if (!isPassable(world, x, y)) return Math.max(0, lastPassable);
    lastPassable = distance;
  }

  return safeRange;
}

function findEnemiesInBeam(world, originX, originY, dirX, dirY, range, width, maxHits = 6) {
  const candidates = [];
  const length = Math.max(0, Number(range || 0));
  const halfWidth = Math.max(10, Number(width || 28) * 0.5);
  const aim = normalizeVector(dirX, dirY);

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const dx = enemy.x - originX;
    const dy = (enemy.y - 8) - originY;
    const forward = dx * aim.x + dy * aim.y;
    const enemyRadius = Math.max(8, Number(enemy.radius || enemy.r || 12));

    if (forward < -enemyRadius || forward > length + enemyRadius) continue;

    const perpendicular = Math.abs(dx * aim.y - dy * aim.x);
    if (perpendicular > halfWidth + enemyRadius) continue;

    candidates.push({
      enemy,
      forward,
      perpendicular,
      score: forward + perpendicular * 0.25
    });
  }

  candidates.sort((a, b) => a.score - b.score);
  const safeMaxHits = Number(maxHits);
  if (!Number.isFinite(safeMaxHits) || safeMaxHits <= 0) return candidates;
  return candidates.slice(0, Math.max(1, Math.floor(safeMaxHits)));
}

function getLightbringerChannelSteerAim(player, input = null) {
  if (!input) return null;

  if (input.aimSource === 'rightStick' || input.rightStickActive) {
    const aim = normalizeAimVector(input.combatAimX, input.combatAimY);
    return aim.active ? aim : null;
  }

  if (input.aimSource === 'leftStick') return null;

  if (input.aimSource === 'mouse' || input.mouseAimActive || input.aimSource == null) {
    const mouseWorldX = Number(input.mouseWorldX);
    const mouseWorldY = Number(input.mouseWorldY);
    const hasMousePoint = Number.isFinite(mouseWorldX) &&
      Number.isFinite(mouseWorldY) &&
      (Math.abs(mouseWorldX) > 0.001 || Math.abs(mouseWorldY) > 0.001);

    if (hasMousePoint) {
      const aim = normalizeAimVector(mouseWorldX - player.x, mouseWorldY - player.y);
      if (aim.active) return aim;
    }
  }

  const explicit = normalizeAimVector(input.combatAimX, input.combatAimY);
  if (explicit.active) return explicit;

  const last = normalizeAimVector(player?.lastCombatAimX, player?.lastCombatAimY);
  if (last.active) return last;

  return null;
}

function useLightbringerSolarVerdict(player, world, ability, log, now, input = null) {
  if (!requireLightbringerLumen(player, log, 'Solar Verdict requires at least 1 Lumen.')) return false;

  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const spent = spendLightbringerLumens(player);
  const bonuses = getSkillTreeBonuses(player);
  const aim = getSafeAimDirection(player, input);
  const centerX = player.x + aim.x * Math.min(ability.range || 190, 165);
  const centerY = player.y + aim.y * Math.min(ability.range || 190, 165);
  const radius = (46 + spent * 20) * Number(ability._charge?.radiusMultiplier || 1) * (1 + Math.max(0, Number(bonuses.solarVerdictRadiusPct || 0)) / 100);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + (spent - 1) * 0.34));
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 12)
    .filter(info => canRadiantLineHit(world, centerX, centerY, info.enemy.x, info.enemy.y));

  spawnWorldEffect(world, {
    kind: 'solarVerdict',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    lumens: spent,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.78
  });

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Solar Verdict',
      color: LIGHTBRINGER_COLORS.light,
      xpMultiplier: 0.44,
      magic: true,
      aoe: true,
      element: 'holy',
      lightbringer: true,
      stagger: spent >= 2
    });
  }

  log?.(`Solar Verdict struck ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useLightbringerHaloAegis(player, world, ability, log, now) {
  if (!requireLightbringerLumen(player, log, 'Halo Aegis requires at least 1 Lumen.')) return false;

  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const spent = spendLightbringerLumens(player);
  const bonuses = getSkillTreeBonuses(player);
  const combatLevel = getPlayerCombatLevel(player);
  const radius = (ability.range || 145) + spent * 18;
  const duration = (4.2 + spent * 0.75) * getChargeDurationMultiplier(ability);
  const flatAbsorb = Math.ceil((6.5 + spent * 4) * (1 + Math.max(0, Number(bonuses.lightbringerShieldPct || 0)) / 100));

  forPartyNear(player, radius, member => {
    member.buffs = member.buffs || {};
    member.buffs.haloAegis = {
      until: now + duration,
      flatAbsorb,
      sourceClassId: 'lightbringer'
    };
    member.visuals = member.visuals || {};
    member.visuals.haloAegisUntil = now + duration;
    member.visuals.haloAegisFlatAbsorb = flatAbsorb;
  });

  spawnWorldEffect(world, {
    kind: 'haloAegis',
    layer: 'front',
    x: player.x,
    y: player.y - 6,
    radius,
    lumens: spent,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 0.84
  });

  log?.(`Halo Aegis shields nearby allies for ${duration.toFixed(1)}s.`);
  return true;
}

function useLightbringerFirstSunrise(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);
  const state = ensureLightbringerState(player);
  const duration = 10 * getChargeDurationMultiplier(ability);
  state.lumens = state.maxLumens;
  state.lumenProgress = 0;
  state.firstSunriseUntil = now + duration;
  state.overbrightUntil = Math.max(state.overbrightUntil || 0, now + Math.min(duration, 6));

  spawnWorldEffect(world, {
    kind: 'firstSunrise',
    layer: 'front',
    x: player.x,
    y: player.y - 10,
    radius: 86,
    color: LIGHTBRINGER_COLORS.light,
    ttl: 1.1
  });
  addFloatingText(player, 'First Sunrise', {
    color: LIGHTBRINGER_COLORS.light,
    ttl: 1.0,
    size: 15
  });

  log?.('The First Sunrise fills your Lumens.');
  return true;
}

function canRadiantLineHit(world, x1, y1, x2, y2) {
  if (!world?.tiles?.length) return true;
  return hasLineOfSight(world, x1, y1, x2, y2, {
    startSkip: 1,
    endSkip: 1
  });
}

function clampAngle(value, min, max) {
  let angle = Number(value || 0);
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return Math.max(min, Math.min(max, angle));
}

function useVoidstepBurst(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const distance = Math.min(170, (ability.range || 122) * (1 + Math.max(0, bonuses.voidstepRangePct || 0) / 100));
  const startX = player.x;
  const startY = player.y;

  moveActorWithCollision(player, world, aim.x * distance, aim.y * distance, player.radius || 12);

  const radius = 72;
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 8);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.spiritDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'eldritchBlink',
    layer: 'front',
    x: startX,
    y: startY - 8,
    targetX: player.x,
    targetY: player.y - 8,
    color: '#ef4056',
    ttl: 0.34
  });

  spawnWorldEffect(world, {
    kind: 'eldritchBurst',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#ef4056',
    ttl: 0.52
  });

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 0.75);

    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Voidstep Burst',
      color: '#ef4056',
      xpMultiplier: 0.38,
      aoe: targets.length > 1
    });
  }

  addFloatingText(player, 'Voidstep', { color: '#ef4056', ttl: 0.62, size: 12 });

  log?.(`Voidstep Burst struck ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useBlackStarPulse(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const bonuses = getSkillTreeBonuses(player);
  const radius = (ability.range || 104) * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100);
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 10);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.aoeDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'eldritchBurst',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#ef4056',
    ttl: 0.62
  });

  for (const info of targets) {
    info.enemy.slowTimer = Math.max(info.enemy.slowTimer || 0, 1.4 * getChargeDurationMultiplier(ability));
    info.enemy.staggerTimer = Math.max(info.enemy.staggerTimer || 0, 0.22 * getChargeStaggerMultiplier(ability));

    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Black Star Pulse',
      color: '#ef4056',
      xpMultiplier: 0.42,
      aoe: true
    });
  }

  log?.(`Black Star Pulse collapsed through ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useRedMawRift(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = 66 * (1 + Math.max(0, bonuses.riftRadiusPct || 0) / 100) * Number(ability._charge?.radiusMultiplier || 1);
  const distance = Math.min(ability.range || 185, 160);
  const centerX = player.x + aim.x * distance;
  const centerY = player.y + aim.y * distance;
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 9);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.abilityDamagePct || 0) / 140));

  spawnWorldEffect(world, {
    kind: 'eldritchRift',
    layer: 'front',
    x: centerX,
    y: centerY,
    radius,
    color: '#ef4056',
    ttl: 0.72
  });

  for (const info of targets) {
    const pullX = (centerX - info.enemy.x) * 0.16;
    const pullY = (centerY - info.enemy.y) * 0.16;
    moveActorWithCollision(info.enemy, world, pullX, pullY, info.enemy.radius || info.enemy.r || 12);

    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Red Maw Rift',
      color: '#ef4056',
      xpMultiplier: 0.44,
      aoe: true
    });
  }

  log?.(`Red Maw Rift tore at ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useHellfireBrand(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const target = findTargetInDirection(player, world, ability.range || 170, input);
  const bonuses = getSkillTreeBonuses(player);
  const radius = 74 * (1 + Math.max(0, bonuses.bloodlineRadiusPct || 0) / 100) * Number(ability._charge?.radiusMultiplier || 1);
  const centerX = target?.x || player.x + aim.x * Math.min(ability.range || 170, 132);
  const centerY = target?.y || player.y + aim.y * Math.min(ability.range || 170, 132);
  const targets = findEnemiesInRadius(world, centerX, centerY, radius, 8);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.fireDamagePct || 0) / 100));

  spawnWorldEffect(world, {
    kind: 'burst',
    layer: 'front',
    x: centerX,
    y: centerY - 4,
    radius,
    color: '#ef6f6c',
    ttl: 0.5
  });

  if (!targets.length) {
    addFloatingText(player, 'Brand Ignites', { color: '#ef6f6c', ttl: 0.62, size: 12 });

    return true;
  }

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'spirit', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Hellfire Brand',
      color: '#ef6f6c',
      xpMultiplier: 0.42,
      aoe: true,
      element: 'fire'
    });
  }

  log?.(`Hellfire Brand erupted under ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useSeraphicAegis(player, world, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const bonuses = getSkillTreeBonuses(player);
  const radius = ability.range || 96;
  const shieldScalar = 1 + Math.max(0, bonuses.bloodlineShieldPct || 0) / 100;
  const duration = 3.4 * (1 + Math.max(0, bonuses.defenseBuffDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);
  const targets = findEnemiesInRadius(world, player.x, player.y, radius, 10);
  const damage = Math.ceil(calculateAbilityDamage(player, ability) * (1 + Math.max(0, bonuses.holyDamagePct || 0) / 100));

  player.buffs = player.buffs || {};
  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: Math.max(player.buffs.defense?.timer || 0, duration),
    reduction: Math.max(player.buffs.defense?.reduction || 0, Math.min(0.48, 0.26 * shieldScalar))
  };

  spawnWorldEffect(world, {
    kind: 'radiantSmite',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    dirX: 0,
    dirY: 1,
    range: radius,
    width: radius,
    color: '#ffecb0',
    ttl: 0.46
  });

  spawnWorldEffect(world, {
    kind: 'healPulse',
    layer: 'front',
    x: player.x,
    y: player.y,
    radius,
    color: '#ffecb0',
    ttl: 0.58
  });

  for (const info of targets) {
    damageEnemyDirect(player, world, info.enemy, damage, 'blade', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Seraphic Aegis',
      color: '#ffecb0',
      xpMultiplier: 0.34,
      aoe: true,
      element: 'holy'
    });
  }

  addFloatingText(player, 'Aegis', { color: '#ffecb0', ttl: 0.8, size: 13 });

  log?.(`Seraphic Aegis raised a ward and struck ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

function useCrimsonFeast(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const range = ability.range || 74;
  const targets = findEnemiesInCone(player, world, aim, range, 62, 2);

  spawnWorldEffect(world, {
    kind: 'bloodLance',
    layer: 'front',
    x: player.x,
    y: player.y - 8,
    targetX: player.x + aim.x * range,
    targetY: player.y + aim.y * range - 8,
    color: '#c44762',
    ttl: 0.28
  });

  if (!targets.length) {
    addFloatingText(player, 'Hungry', { color: '#c44762', ttl: 0.58, size: 12 });

    return true;
  }

  let totalDamage = 0;
  for (const info of targets) {
    const damage = Math.ceil(calculateAbilityDamage(player, ability) * (targets.indexOf(info) === 0 ? 1 : 0.62));
    const before = info.enemy.hp || 0;

    damageEnemyDirect(player, world, info.enemy, damage, 'blade', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Crimson Feast',
      color: '#c44762',
      xpMultiplier: 0.42,
      singleTarget: targets.length === 1,
      lifestealBonusPct: 22 + Math.max(0, bonuses.bloodlineLifestealPct || 0)
    });

    totalDamage += Math.max(0, before - (info.enemy.hp || 0));
  }

  const feastHeal = isGravecallerSustain(player)?restoreGravecallerHealth(player,totalDamage*.18,{source:'spell',now}):modifyBloodlineHealing(player, Math.ceil(totalDamage * 0.18), { source: 'lifesteal' });
  if (feastHeal > 0) {
    if(!isGravecallerSustain(player))player.hp = Math.min(player.maxHp || player.hp || 1, (player.hp || 0) + feastHeal);
    addFloatingText(player, `+${feastHeal}`, { color: '#c44762', ttl: 0.72, size: 13 });
  }

  log?.(`Crimson Feast drew blood from ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  return true;
}

// -----------------------------------------------------------------------------
// NECROTIC BOLT
// -----------------------------------------------------------------------------

function useNecroticBoltProjectile(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);

  const damage = calculateAbilityDamage(player, {
    ...ability,
    skill: 'spirit',
    damage: Math.max(ability.damage || 0, 15),
    damageMultiplier: ability.damageMultiplier || 1.2
  });

  const range = ability._charge || ability._mastery ? ability.range : getQOverride(ability)?.range || ability.range || 210;

  player.abilityProjectiles.push({
    ownerId: player.profileId || player.id || player.slot || 1,
    sourceAbilityId: ability.id,
    id: `necrotic-bolt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'necroticBolt',
    visualProfile: 'necromancerBolt',
    x: player.x + aim.x * 21,
    y: player.y + aim.y * 21 - 8,
    startX: player.x,
    startY: player.y,
    dirX: aim.x,
    dirY: aim.y,
    speed: attackProjectileSpeed(ability,330),
    range,
    travelled: 0,
    radius: 7,
    damage,
    skill: 'spirit',
    color: '#b68cff',
    glowColor: 'rgba(182,140,255,0.24)',
    alive: true,
    age: 0,
    ttl: 1.05
  });
  playSfx(SOUND_EVENT_KEYS.PROJECTILE_LAUNCH, { volume: 0.75, throttle: 0.035 });

  spawnWorldEffect(world, {
    kind: 'necroticCast',
    x: player.x + aim.x * 18,
    y: player.y + aim.y * 18 - 8,
    dirX: aim.x,
    dirY: aim.y,
    ttl: 0.22,
    color: '#b68cff',
    radius: 18
  });

  log?.('Necrotic Bolt released.');
  return true;
}

function updateAbilityProjectiles(player, world, dt, now, log) {
  ensureAbilityProjectileState(player);

  for (const projectile of player.abilityProjectiles) {
    if (!projectile || projectile.alive === false) continue;

    projectile.age = (projectile.age || 0) + dt;

    if (projectile.age > projectile.ttl) {
      projectile.alive = false;
      continue;
    }

    const move = Math.min((projectile.speed || 260) * dt,Math.max(0,projectile.range-(projectile.travelled||0)));
    const previousX=projectile.x,previousY=projectile.y;
    projectile.previousX=previousX;projectile.previousY=previousY;
    projectile.x += projectile.dirX * move;
    projectile.y += projectile.dirY * move;
    projectile.travelled = (projectile.travelled || 0) + move;

    if (world?.tiles?.length && (!isPassable(world, projectile.x, projectile.y)||!hasLineOfSight(world,previousX,previousY,projectile.x,projectile.y))) {
      projectile.alive = false;
      spawnWorldEffect(world, {
        kind: projectile.kind === 'gleamBolt' ? 'gleamImpact' : 'necroticFade',
        x: projectile.x,
        y: projectile.y,
        ttl: 0.18,
        color: projectile.color || '#b68cff',
        radius: 13
      });
      playSfx(SOUND_EVENT_KEYS.PROJECTILE_IMPACT, { volume: 0.38, throttle: 0.05 });
      continue;
    }

    if (projectile.kind === 'necroticBolt') {
      spawnProjectileTrail(world, projectile);
      updateNecroticBoltCollision(player, world, projectile, log);
    } else if (projectile.kind === 'gleamBolt') {
      spawnProjectileTrail(world, projectile);
      updateGleamBoltCollision(player, world, projectile, log);
    }

    if (projectile.alive !== false && projectile.travelled >= projectile.range) {
      projectile.alive = false;

      spawnWorldEffect(world, {
        kind: projectile.kind === 'gleamBolt' ? 'gleamImpact' : 'necroticFade',
        x: projectile.x,
        y: projectile.y,
        ttl: 0.18,
        color: projectile.color || '#b68cff',
        radius: 13
      });

      continue;
    }

  }

  player.abilityProjectiles = player.abilityProjectiles.filter(p => p && p.alive !== false);
}

function updateNecroticBoltCollision(player, world, projectile, log) {
  const target = findProjectileCollision(projectile, world);

  if (!target) return;

  projectile.alive = false;

  const damage = Math.max(1, Math.floor(projectile.damage || 1));

  damageEnemyDirect(player, world, target, damage, 'spirit', log, {
    sourceName: 'Necrotic Bolt',
    sourceAbilityId: projectile.sourceAbilityId,
    color: '#b68cff',
    xpMultiplier: 0.42,
    projectile: true,
    magic: true,
    dirX: projectile.dirX,
    dirY: projectile.dirY
  });
  playSfx(SOUND_EVENT_KEYS.PROJECTILE_IMPACT, { volume: 0.78, throttle: 0.035 });

  // Gravecaller lifesteal is already resolved from actual damage by the hit
  // coordinator. Retain the legacy projectile behaviour for other actors.
  const heal = isGravecallerSustain(player)?0:Math.max(2, Math.ceil(damage * 0.16));
  if(heal)player.hp = Math.min(player.maxHp, player.hp + heal);

  if(heal)addFloatingText(player, `+${heal}`, {
    color: '#b68cff',
    ttl: 0.65,
    size: 12
  });

  spawnWorldEffect(world, {
    kind: 'necroticImpact',
    x: target.x,
    y: target.y - 8,
    ttl: 0.28,
    color: '#b68cff',
    radius: 24
  });

  log?.(`Necrotic Bolt hit ${target.name || 'enemy'} for ${damage}.`);
}

function updateGleamBoltCollision(player, world, projectile, log) {
  const target = findProjectileCollision(projectile, world);

  if (!target) return;

  projectile.alive = false;

  const now = performance.now() / 1000;
  const branded = isHaloBranded(target, now);
  const damage = Math.max(1, Math.ceil((projectile.damage || 1) * (branded ? 1.12 : 1)));

  damageEnemyDirect(player, world, target, damage, 'spirit', log, {
    sourceName: 'Gleam Bolt',
    sourceAbilityId: projectile.sourceAbilityId,
    color: LIGHTBRINGER_COLORS.light,
    xpMultiplier: 0.34,
    projectile: true,
    ranged: true,
    magic: true,
    singleTarget: true,
    element: 'holy',
    lightbringer: true,
    dirX: projectile.dirX,
    dirY: projectile.dirY
  });
  gainLightbringerLumenProgress(player, branded ? 2 : 1, now, world, log, 'Gleam Bolt');
  playSfx(SOUND_EVENT_KEYS.PROJECTILE_IMPACT, { volume: 0.62, throttle: 0.035 });

  spawnWorldEffect(world, {
    kind: 'gleamImpact',
    x: target.x,
    y: target.y - 10,
    ttl: 0.24,
    color: LIGHTBRINGER_COLORS.light,
    radius: branded ? 28 : 20
  });

  log?.(`Gleam Bolt hit ${target.name || 'enemy'} for ${damage}.`);
}

function findProjectileCollision(projectile, world) {
  const startX=projectile.previousX??projectile.x,startY=projectile.previousY??projectile.y;
  const dx=projectile.x-startX,dy=projectile.y-startY,lengthSquared=dx*dx+dy*dy;
  let target=null,nearest=Infinity;
  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const radius = (enemy.radius || enemy.r || 14) + (projectile.radius || 6);
    const along=lengthSquared>0?Math.max(0,Math.min(1,((enemy.x-startX)*dx+(enemy.y-startY)*dy)/lengthSquared)):0;
    const distance = Math.hypot(enemy.x-(startX+dx*along),enemy.y-(startY+dy*along));

    if (distance <= radius && along<nearest) {
      target=enemy;nearest=along;
    }
  }

  return target;
}

function spawnProjectileTrail(world, projectile) {
  if (!world) return;

  world.effects = world.effects || [];

  world.effects.push({
    kind: projectile.kind === 'gleamBolt' ? 'gleamTrail' : 'necroticTrail',
    x: projectile.x - projectile.dirX * 6,
    y: projectile.y - projectile.dirY * 6,
    dirX: projectile.dirX,
    dirY: projectile.dirY,
    ttl: 0.16,
    age: 0,
    color: projectile.color || '#b68cff',
    radius: 8
  });

  if (world.effects.length > 160) {
    world.effects.splice(0, world.effects.length - 160);
  }
}

// -----------------------------------------------------------------------------
// VINE WHIP
// -----------------------------------------------------------------------------

function useDirectionalVineWhip(player, world, ability, log, now, input = null) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough spirit.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  const aim = getSafeAimDirection(player, input);
  const bonuses = getSkillTreeBonuses(player);
  const baseRange = ability._charge || ability._mastery ? ability.range : getQOverride(ability)?.range || ability.range || 135;
  const range = baseRange * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 100);
  const width = 42 * (1 + Math.max(0, bonuses.aoeRadiusPct || 0) / 140) * Number(ability._charge?.radiusMultiplier || 1);
  const maxHits = ability.maxHits || 4;

  const targets = findVineWhipTargets(player, world, aim, range, width, maxHits);

  spawnVineWhipEffects(player, world, aim, range, width, targets);

  if (!targets.length) {
    addFloatingText(player, 'Whiff', {
      color: '#9facbf',
      ttl: 0.55,
      size: 11
    });

    log?.('Thorn Lash tears through empty air.');
    return true;
  }

  let hits = 0;

  for (const targetInfo of targets) {
    const target = targetInfo.enemy;
    const crit = hits === 0 && Math.random() < 0.12;

    const baseAbility = {
      ...ability,
      skill: 'warding',
      damage: Math.max(ability.damage || 0, 8),
      damageMultiplier: ability.damageMultiplier || 0.95
    };

    let damage = calculateAbilityDamage(player, baseAbility);
    damage = Math.ceil(damage * (1 + Math.max(0, (bonuses.aoeDamagePct || 0) + (bonuses.natureDamagePct || 0)) / 100));

    if (targetInfo.softLockBonus) {
      damage = Math.ceil(damage * 1.12);
    }

    if (crit) {
      damage = Math.ceil(damage * 1.45);
    }

    target.slowTimer = Math.max(target.slowTimer || 0, 1.4);
    const rootMultiplier = (1 + Math.max(0, bonuses.rootDurationPct || 0) / 100) * getChargeDurationMultiplier(ability);
    target.rootUntil = Math.max(target.rootUntil || 0, now + (hits === 0 ? 0.42 : 0.18) * rootMultiplier);

    damageEnemyDirect(player, world, target, damage, 'warding', log, {
    sourceAbilityId: ability.id,
      sourceName: 'Thorn Lash',
      color: crit ? '#ffcc66' : '#73d18a',
      xpMultiplier: 0.38,
      crit
    });

    hits += 1;
  }

  log?.(`Thorn Lash struck ${hits} target${hits === 1 ? '' : 's'}.`);

  return true;
}

function findVineWhipTargets(player, world, aim, range, width, maxHits) {
  const candidates = [];

  const startX = player.x;
  const startY = player.y - 4;
  const endX = startX + aim.x * range;
  const endY = startY + aim.y * range;

  let closestToAimPoint = null;
  let closestAimDistance = Infinity;

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const dx = enemy.x - startX;
    const dy = enemy.y - startY;

    const forward = dx * aim.x + dy * aim.y;

    if (forward < 14 || forward > range + 26) continue;

    const closestX = startX + aim.x * forward;
    const closestY = startY + aim.y * forward;

    const perpendicular = Math.hypot(enemy.x - closestX, enemy.y - closestY);
    const aimPointDistance = Math.hypot(enemy.x - endX, enemy.y - endY);

    const nearLine = perpendicular <= width;
    const nearAimPoint = aimPointDistance <= 58;

    if (!nearLine && !nearAimPoint) continue;

    const softLockBonus = nearAimPoint || perpendicular <= width * 0.55;

    const score =
      perpendicular * 1.25 +
      Math.abs(forward - range * 0.72) * 0.20 -
      (softLockBonus ? 22 : 0);

    candidates.push({
      enemy,
      forward,
      perpendicular,
      aimPointDistance,
      softLockBonus,
      score
    });

    if (aimPointDistance < closestAimDistance) {
      closestToAimPoint = enemy;
      closestAimDistance = aimPointDistance;
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  const selected = candidates.slice(0, maxHits);

  if (closestToAimPoint && closestAimDistance <= 72 && !selected.some(t => t.enemy === closestToAimPoint)) {
    selected.pop();

    selected.unshift({
      enemy: closestToAimPoint,
      forward: range,
      perpendicular: 0,
      aimPointDistance: closestAimDistance,
      softLockBonus: true,
      score: -50
    });
  }

  return selected.filter(Boolean);
}

function spawnVineWhipEffects(player, world, aim, range, width, targets) {
  if (!world) return;

  world.effects = world.effects || [];

  const startX = player.x;
  const startY = player.y - 8;

  const focusTarget = targets?.[0]?.enemy || null;

  const endX = focusTarget
    ? startX + aim.x * range * 0.62 + (focusTarget.x - startX) * 0.38
    : startX + aim.x * range;

  const endY = focusTarget
    ? startY + aim.y * range * 0.62 + (focusTarget.y - startY) * 0.38
    : startY + aim.y * range;

  world.effects.push({
    kind: 'vineWhip',
    x: startX,
    y: startY,
    endX,
    endY,
    dirX: aim.x,
    dirY: aim.y,
    width,
    range,
    ttl: 0.24,
    age: 0,
    color: '#73d18a',
    radius: width
  });

  const segmentCount = 7;

  for (let i = 1; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const wobble = Math.sin(t * Math.PI * 2.4) * 10;
    const sideX = -aim.y;
    const sideY = aim.x;

    const sx = startX + (endX - startX) * t + sideX * wobble;
    const sy = startY + (endY - startY) * t + sideY * wobble;

    world.effects.push({
      kind: 'vineSegment',
      x: sx,
      y: sy,
      ttl: 0.18 + t * 0.08,
      age: 0,
      color: '#73d18a',
      radius: Math.max(5, 11 - t * 4)
    });
  }

  for (const targetInfo of targets || []) {
    world.effects.push({
      kind: 'vineImpact',
      x: targetInfo.enemy.x,
      y: targetInfo.enemy.y - 8,
      ttl: 0.26,
      age: 0,
      color: '#73d18a',
      radius: targetInfo.softLockBonus ? 24 : 18
    });
  }

  if (world.effects.length > 170) {
    world.effects.splice(0, world.effects.length - 170);
  }
}

// -----------------------------------------------------------------------------
// DEFENSIVE / SUMMON ABILITIES
// -----------------------------------------------------------------------------

function useDefensiveAbility(player, ability, log, now) {
  if (!payAbilityCost(player, ability)) {
    log?.('Not enough stamina.');
    return false;
  }

  startAbilityCooldown(player, ability, now);

  player.buffs = player.buffs || {};

  const {duration,reduction}=defensiveProtection(player,ability);

  player.buffs.defense = {
    sourceAbilityId: ability.id,
    timer: duration,
    reduction
  };

  addFloatingText(player, ability.name, {
    color: '#73d18a',
    ttl: 0.85,
    size: 13
  });

  log?.(`${ability.name} active.`);
  playSfx('block', { volume: 0.85, throttle: 0.08 });
  return true;
}

function useSummonAbility(player, world, ability, log, now) {
  player.summons = player.summons || [];

  const elderFae=(ability.faeSummon||ability.gardenSummon)&&ability.id==='thornbinderSummonElderThornbeast';
  const summonRules = ability.faeSummon||ability.gardenSummon
    ? {path:elderFae?'evolved':'swarm',evolve:!!elderFae,maxCount:elderFae?1:3,stage:elderFae?'elderThornbeast':'thornling'}
    : getSummonRules(player, ability.summonType, ability.id);
  const ownGroup=s=>ability.summonType!=='thornbeast'||(s.sourceAbilityId||s.summonAbilityId||'thornbinderSummonThornlings')===ability.id;
  const existingSummons = getActiveSummonGroup(player, ability.summonType).filter(ownGroup);

  if (existingSummons.length) {
    for (const existing of player.summons) {
      if (!existing || existing.kind !== ability.summonType || existing.legendaryTemporary || !ownGroup(existing)) continue;
      existing.alive = false;
      existing.dismissed = true;
      existing.dead = true;
      existing.cooldownStarted = true;
    }

    startAbilityCooldown(player, ability, now);

    log?.(`${getSummonGroupName(ability.summonType, existingSummons.length, existingSummons)} dismissed.`);

    addFloatingText(player, existingSummons.length > 1 ? 'Squad dismissed' : 'Summon dismissed', {
      color: '#9facbf'
    });

    playSfx('menuBack', { volume: 0.7, throttle: 0.08 });
    return true;
  }

  const livingCount = player.summons.filter(s=>s.alive!==false&&s.hp>0).length;
  if (livingCount + summonRules.maxCount > 8) { log?.('Eight active companions is the limit.'); return false; }
  if (!payAbilityCost(player, ability)) { log?.('Not enough resources.'); return false; }
  recordSupportContribution(player,getHostileCombatEnemies(player,world),ability.id,1,'summonCommand');
  const summoned = [];

  for (let index = 0; index < summonRules.maxCount; index++) {
    const summon = createSummon(player, ability.summonType, summonRules, index);
    if(ability.summonType==='greaterLich')configureLichSummon(summon,ability);
    if(ability.id==='summonLich')configureBoundDeadSummon(summon,ability);
    if(ability.gardenSummon)configureGardenSummon(summon,ability);
    summon.expertiseBaseMaxHp=Math.ceil(summon.maxHp*(ability._mastery?.damage||1));
    summon.expertiseHealthMultiplier=getAbilityEffectiveness(player,ability);
    summon.maxHp=Math.ceil(summon.expertiseBaseMaxHp*summon.expertiseHealthMultiplier);summon.hp=summon.maxHp;
    // Spawn inside real terrain; no pets trapped in blocked furniture/walls.
    if (!isPassable(world,summon.x,summon.y)) { summon.x=player.x; summon.y=player.y; }
    summon.summonMorph=ability.subclassId||'base';
    summon.summonAbilityId = ability.id;
    summon.sourceAbilityId = ability.id;
    if(ability.faeSummon){summon.summonMorph='fae';summon.displayName=`Fae ${summon.displayName}`;}
    summon.ownerId = player.profileId || player.id || player.slot || 1;
    summon.cooldownStarted = false;
    player.summons.push(summon);
    summoned.push(summon);
  }
  assignCompanionFormation(player,now);
  for(const summon of summoned){
    const position=findCompanionRoom(summon,player,world,companionFollowPoint(summon,player),now);
    summon.x=position.x;summon.y=position.y;
    if(summon.kind==='greaterLich'||isBoundDeadMorph(summon))emitLichArrival(summon,{effect:fx=>spawnWorldEffect(world,fx)});
    if(summon.gardenSummon)spawnWorldEffect(world,{kind:'subclassAbility',subclassId:summon.summonMorph,geometry:'arrival',x:summon.x,y:summon.y+8,radius:summon.summonPath==='evolved'?42:24,ttl:.65});
  }

  const groupName = getSummonGroupName(ability.summonType, summoned.length, summoned);

  log?.(`${groupName} summoned.`);

  addFloatingText(player, summoned.length > 1 ? `${groupName} assembled` : summoned[0]?.displayName || groupName, {
    color: ability.summonType === 'eldritchHorror' ? '#ef4056' : ability.summonType === 'lich' ? '#b68cff' : '#73d18a',
    ttl: 1.0,
    size: 13
  });

  playSfx('summon', { volume: 0.9, throttle: 0.08 });
  return true;
}

// -----------------------------------------------------------------------------
// ENEMY BEHAVIOR
// -----------------------------------------------------------------------------

function ensureEnemyState(enemy) {
  applyEnemyStrengthScaling(enemy);
  ensureEnemyProgression(enemy);
  applyCoopAggroRange(enemy);
  if (!enemy.maxHp) enemy.maxHp = enemy.hp || 30;
  if (!enemy.speed) enemy.speed = defaultEnemySpeed(enemy);
  if (!enemy.damage) enemy.damage = defaultEnemyDamage(enemy);
  if (!enemy.fastCombatVersion) {
    enemy.speed *= enemy.isBoss || enemy.worldBoss ? 1.18 : 1.28;
    enemy.attackRate = Math.max(.35, Number(enemy.attackRate || 1.1) * (enemy.isBoss || enemy.worldBoss ? .86 : .78));
    enemy.fastCombatVersion = 1;
  }
  if (!enemy.radius) enemy.radius = enemy.r || 14;

  enemy.attackCooldown = enemy.attackCooldown ?? 0;
  enemy.hitFlash = enemy.hitFlash ?? 0;
  enemy.slowTimer = enemy.slowTimer ?? 0;
  enemy.staggerTimer = enemy.staggerTimer ?? 0;
  enemy.deathHandled = enemy.deathHandled ?? false;
}

function updateEnemyTimers(enemy, dt) {
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  enemy.hitStopTimer = Math.max(0, (enemy.hitStopTimer || 0) - dt);
  enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
  enemy.staggerTimer = Math.max(0, (enemy.staggerTimer || 0) - dt);
}

function updateEnemyBehavior(enemy, player, world, dt, now, log) {
  if (enemy.trainingDummy) return;
  if(updateBasicEnemyAttack(enemy,world,dt,now,target=>{
    if(!hasLineOfSight(world,enemy.x,enemy.y,target.x,target.y)||!enemyWithinTargetView(enemy,target,world))return;
    if(target.kindTag==='summon'||target.alive!==undefined&&!target.classId)enemyAttackSummon(enemy,target,player,log,world);
    else enemyAttackPlayer(enemy,target,world,log);
  }))return;
  const targetInfo = chooseEnemyTarget(enemy, player, world);

  if (!targetInfo || !targetInfo.target) {
    if (isPersistentDungeonEnemy(enemy, world) && hasPersistentDungeonAggro(enemy)) {
      enemy.enemyState = 'alerted';
      enemy.isInCombat = true;
      enemy.returningHome = false;
    }
    return;
  }

  const target = targetInfo.target;
  const distance = targetInfo.distance;

  const aggroRange = getCoopAggroRange(enemy, 230);
  const attackRange = enemy.attackRange || 25;

  const persistentDungeonEnemy = isPersistentDungeonEnemy(enemy, world);
  const persistentDungeonAggro = persistentDungeonEnemy && hasPersistentDungeonAggro(enemy);
  const provoked = enemy.awakened ||
    enemy.aggro ||
    enemy.alerted ||
    enemy.hitFlash > 0 ||
    enemy.lastDamagedByPlayer ||
    wasEnemyRecentlyDamaged(enemy, now);
  const hasSight = hasLineOfSight(world, enemy.x, enemy.y, target.x, target.y, {
    startSkip: 1,
    endSkip: 1
  });

  if (persistentDungeonEnemy) {
    const detectedNow = persistentDungeonAggro || (enemyWithinTargetView(enemy,target,world,80) && (provoked || hasSight));

    if (!detectedNow) {
      enemy.enemyState = 'idle';
      rememberEnemyCombatTarget(enemy, null);
      return;
    }

    markDungeonEnemyEngaged(enemy, targetInfo, distance > attackRange ? 'pursuing' : 'attacking');
  } else if (!enemyWithinTargetView(enemy,target,world,hasEnemyPursuitAggro(enemy)?ENEMY_PURSUIT_MARGIN:80) || !provoked && !hasSight) {
    rememberEnemyCombatTarget(enemy, null);
    return;
  }

  if(!persistentDungeonEnemy)markEnemyEngaged(enemy);
  else enemy.awakened = true;

  if(updateEnemyTacticalMovement(enemy,target,world,dt,now))return;

  const dirX = distance > 0 ? (target.x - enemy.x) / distance : 0;
  const dirY = distance > 0 ? (target.y - enemy.y) / distance : 1;

  if (distance > attackRange) {
    const slowMultiplier = enemy.slowTimer > 0 ? 0.45 : 1;
    const speed = enemy.speed * slowMultiplier;

    enemy.enemyState = 'pursuing';
    moveActorWithCollision(enemy, world, dirX * speed * dt, dirY * speed * dt);
    enemy.dirX = dirX;
    enemy.dirY = dirY;

    return;
  }

  if (!hasSight) {
    if (persistentDungeonEnemy) {
      const speed = enemy.speed * (enemy.slowTimer > 0 ? 0.35 : 0.68);

      enemy.enemyState = 'pursuing';
      moveActorWithCollision(enemy, world, dirX * speed * dt, dirY * speed * dt);
      enemy.dirX = dirX;
      enemy.dirY = dirY;
      return;
    }

    enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 0.18);
    return;
  }

  enemy.enemyState = 'attacking';

  if (enemy.attackCooldown <= 0) {
    beginBasicEnemyAttack(enemy,target,now,attackRange);
    enemy.attackCooldown = enemy.attackRate || 1.05;
  }
}

function chooseEnemyTarget(enemy, player, world=null) {
  if (!enemy || !player) return null;

  const candidates = [];

  for (const member of getEnemyTargetablePlayers(player)) {
    candidates.push({
      target: member,
      kind: 'player',
      distance: Math.hypot(member.x - enemy.x, member.y - enemy.y)
    });
  }

  for (const summon of player.summons || []) {
    if (!summon) continue;
    if (summon.alive === false) continue;
    if ((summon.hp || 0) <= 0) continue;

    const distance = Math.hypot(summon.x - enemy.x, summon.y - enemy.y);
    candidates.push({
      target: summon,
      kind: 'summon',
      distance
    });
  }

  for (const ally of player.coop?.players || []) {
    if (!ally || ally.active === false) continue;

    for (const summon of ally.summons || []) {
      if (!summon) continue;
      if (summon.alive === false) continue;
      if ((summon.hp || 0) <= 0) continue;

      const distance = Math.hypot(summon.x - enemy.x, summon.y - enemy.y);
      candidates.push({
        target: summon,
        kind: 'summon',
        distance
      });
    }
  }

  if (!candidates.length) {
    rememberEnemyCombatTarget(enemy, null);
    return null;
  }

  for (const candidate of candidates) {
    candidate.score = candidate.distance * getEnemyTargetThreatMultiplier(enemy, candidate.target, candidate.kind);
    if(candidate.kind==='summon'&&candidate.target.id===enemy.targetSummonId&&enemy.summonThreatUntil>performance.now()/1000)candidate.score*=.35;
  }

  candidates.sort((a, b) => a.score - b.score);

  const targetInfo = (world&&!isPersistentDungeonEnemy(enemy,world)&&hasEnemyPursuitAggro(enemy)
    ?candidates.find(info=>enemyWithinTargetView(enemy,info.target,world,ENEMY_PURSUIT_MARGIN)):null) || candidates[0];
  rememberEnemyCombatTarget(enemy, targetInfo);
  return targetInfo;
}

function rememberEnemyCombatTarget(enemy, targetInfo) {
  if (!enemy) return;

  enemy.combatTargetId = getEnemyTargetId(targetInfo?.target) || null;
  enemy.combatTargetKind = targetInfo?.kind || null;

  const target = targetInfo?.target || null;
  if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
    enemy.lastKnownTargetPosition = {
      x: target.x,
      y: target.y
    };
  }
}

function wasEnemyRecentlyDamaged(enemy, now = performance.now() / 1000, windowSeconds = 4.5) {
  const lastDamagedAt = Number(enemy?.lastDamagedByActorAt || enemy?.lastDamagedAt || enemy?.lastHitAt || 0);
  if (!Number.isFinite(lastDamagedAt) || lastDamagedAt <= 0) return false;
  return now - lastDamagedAt <= windowSeconds;
}

function enemyAttackPlayer(enemy, player, world, log) {
  if(!enemyWithinTargetView(enemy,player,world))return;
  if (!player || (player.hp || 0) <= 0) return;

  const now = performance.now() / 1000;

  if (Number(player.invulnerableUntil || 0) > now) {
    addFloatingText(player, 'Protected', {
      color: '#fff1b8',
      ttl: 0.48,
      size: 12
    });
    playSfx('block', { volume: 0.42, throttle: 0.08 });
    return;
  }

  if (isDodgeInvulnerable(player)) {
    addFloatingText(player, 'Evade', {
      color: '#d9f7ff',
      ttl: 0.48,
      size: 12
    });
    playSfx('block', { volume: 0.42, throttle: 0.08 });
    return;
  }

  if (world && !hasLineOfSight(world, enemy.x, enemy.y, player.x, player.y, {
    startSkip: 1,
    endSkip: 1
  })) {
    return;
  }

  const rawDamage = Math.max(1, enemy.damage || enemy.dmg || 5);

  let result = {
    hpDamage: rawDamage,
    staminaDamage: 0,
    blocked: false,
    guardBroken: false
  };

  if (isBlocking(player)) {
    result = applyDefensiveDamage(player, rawDamage, log, enemy, null);
  }

  let hpDamage = result.hpDamage;

  if (player.buffs?.defense?.timer > 0) {
    const reduction = player.buffs.defense.reduction || 0;
    const beforeDefense=hpDamage;
    hpDamage = Math.ceil(hpDamage * (1 - reduction));
    rewardAbilitySupport(player.buffs.defense,world,beforeDefense-hpDamage,now,log);
  }

  const armour = Math.max(0, getArmour(player) || 0);
  hpDamage = Math.max(1, Math.ceil(hpDamage - armour * 0.18));
  hpDamage = modifyBloodlineIncomingDamage(player, hpDamage);
  hpDamage = applyLegendaryIncomingDamage(player, hpDamage, enemy, null, log);

  const bubbleWard = getActiveBubbleWard(player, now);
  const bubbleAbsorbed = bubbleWard && hpDamage > 0
    ? Math.min(hpDamage, bubbleWard.flatAbsorb)
    : 0;

  if (bubbleAbsorbed > 0) {
    rewardAbilitySupport(player.buffs.bubbleWard,world,bubbleAbsorbed,now,log);
    hpDamage = Math.max(0, hpDamage - bubbleAbsorbed);
    addFloatingText(player, `Bubble -${bubbleAbsorbed}`, {
      color: '#8feaf2',
      ttl: 0.62,
      size: 11
    });
  }

  const lightAbsorb = applyLightbringerShieldAbsorb(player, hpDamage, now, world, log);
  if (lightAbsorb.absorbed > 0) {
    hpDamage = lightAbsorb.remainingDamage;
    addFloatingText(player, `${lightAbsorb.label} -${lightAbsorb.absorbed}`, {
      color: LIGHTBRINGER_COLORS.light,
      ttl: 0.62,
      size: 11
    });
  }

  hpDamage = mitigateTechniqueDamage(player,enemy,hpDamage,now,world,log);
  hpDamage = mitigateSubclassDamage(player,enemy,hpDamage,now);
  player.hp = Math.max(0, player.hp - hpDamage);
  if (hpDamage > 0) {
    cancelHeavyAttackCharge(player, world);
    player.visualHitUntil = now + 0.18;
    onPlayerTookDamage(player, hpDamage, enemy, world, log);
    grantOathkeeperConviction(player, now, 1, 'Conviction');
  }
  playSfx(result.guardBroken ? 'guardBreak' : result.blocked || ((bubbleAbsorbed > 0 || lightAbsorb.absorbed > 0) && hpDamage <= 0) ? 'block' : 'playerHit', {
    volume: result.guardBroken ? 1 : 0.82,
    throttle: 0.05
  });

  addFloatingText(player, hpDamage <= 0 ? 'Absorbed' : result.blocked ? `Blocked ${hpDamage}` : `-${hpDamage}`, {
    color: hpDamage <= 0 && lightAbsorb.absorbed > 0 ? LIGHTBRINGER_COLORS.light : hpDamage <= 0 && bubbleAbsorbed > 0 ? '#8feaf2' : result.blocked ? '#73d18a' : '#ef6f6c',
    ttl: 0.65,
    size: 12
  });

  if (result.guardBroken) {
    addFloatingText(player, 'Guard Break', {
      color: '#ffcc66',
      ttl: 0.8,
      size: 13
    });
  }
}

function getActiveBubbleWard(player, now = performance.now() / 1000) {
  const ward = player?.buffs?.bubbleWard;
  if (!ward) return null;

  const until = Number(ward.until || 0);
  if (!Number.isFinite(until) || until <= now) {
    delete player.buffs.bubbleWard;
    return null;
  }

  const flatAbsorb = Math.max(0, Number(ward.flatAbsorb || 0));
  if (flatAbsorb <= 0) return null;

  return {
    until,
    flatAbsorb
  };
}

export function applyLightbringerShieldAbsorb(player, damage, now, world, log) {
  let remainingDamage = Math.max(0, Math.ceil(Number(damage || 0)));
  let absorbed = 0;
  let label = 'Halo';

  const prismGuard = getActiveLightbringerShield(player, 'prismGuard', now);
  if (prismGuard && remainingDamage > 0) {
    const value = Math.min(remainingDamage, prismGuard.flatAbsorb);
    remainingDamage -= value;
    absorbed += value;
    rewardAbilitySupport(prismGuard.raw,world,value,now,log);
    label = 'Prism';

    if (!prismGuard.raw.lumenGranted && player?.classId === 'lightbringer') {
      prismGuard.raw.lumenGranted = true;
      gainLightbringerLumenProgress(player, 3, now, world, log, 'Prism Guard');
    }
  }

  const haloAegis = getActiveLightbringerShield(player, 'haloAegis', now);
  if (haloAegis && remainingDamage > 0) {
    const value = Math.min(remainingDamage, haloAegis.flatAbsorb);
    remainingDamage -= value;
    absorbed += value;
    rewardAbilitySupport(haloAegis.raw,world,value,now,log);
    label = label === 'Prism' ? 'Prism/Halo' : 'Halo';
  }

  return {
    absorbed,
    remainingDamage,
    label
  };
}

function getActiveLightbringerShield(player, key, now) {
  const shield = player?.buffs?.[key];
  if (!shield) return null;

  const until = Number(shield.until || 0);
  if (!Number.isFinite(until) || until <= now) {
    delete player.buffs[key];
    return null;
  }

  const flatAbsorb = Math.max(0, Math.ceil(Number(shield.flatAbsorb || 0)));
  if (flatAbsorb <= 0) return null;

  return {
    until,
    flatAbsorb,
    raw: shield
  };
}

const summonOwners=new WeakMap();
export function applySummonThornRetaliation(summon,attacker,world,healthLost,now=performance.now()/1000,log=null,rootPlayer=null){
  // Hazard origins can be copies; thorns must hit and credit the real attacker.
  const enemy=attacker?.combatSource||attacker;
  const mantle=roseMantleThorns(summon,healthLost,now,world),native=summon?.summonMorph==='petalknight'&&summon.gardenSummon;
  if(!world||!(healthLost>0)||(!native&&!mantle)||
    !enemy||enemy.hp<=0||enemy.dead||enemy.friendly||now<(summon.nextRoseReply||0)||
    Math.hypot(enemy.x-summon.x,enemy.y-summon.y)>125||
    !hasLineOfSight(world,summon.x,summon.y,enemy.x,enemy.y,{startSkip:0,endSkip:0}))return 0;
  const mapped=summonOwners.get(summon);
  const player=mantle?.owner||(mapped?.summons?.includes(summon)?mapped:
    (rootPlayer?getEnemyTargetablePlayers(rootPlayer):world.players||[]).find(p=>p?.summons?.includes(summon)));
  if(!player)return 0;
  summon.nextRoseReply=now+.75;
  const nativeAbility=resolveAbilityMorph(player,summon.sourceAbilityId||summon.summonAbilityId,'petalknight');
  const nativeValue=native?Math.min((summon.damage||10)*.65,healthLost*.35*getAbilityEffectiveness(player,nativeAbility)):0;
  const a=mantle&&mantle.damage>nativeValue?mantle.a:nativeAbility,value=Math.max(nativeValue,mantle?.damage||0);
  damageEnemyDirect(player,world,enemy,value,'summoning',log,{now,source:'summon',sourceAbilityId:a.id,sourceName:'Rose Thorns',sourceMorph:'petalknight',element:'nature',magic:true,quiet:true,proc:true,subclassApplied:true});
  spawnWorldEffect(world,{kind:'subclassAbility',subclassId:'petalknight',geometry:'roseReflection',x:summon.x,y:summon.y-10,endX:enemy.x,endY:enemy.y-10,radius:24,ttl:.3});
  return value;
}
function enemyAttackSummon(enemy, summon, player, log,world) {
  if (!summon || summon.alive === false || summon.hp <= 0) return;

  const rawDamage = Math.max(1, enemy.damage || enemy.dmg || 5);
  const damage = mitigateRoseMantle(summon,Math.max(1, Math.ceil(rawDamage * (1 - Math.min(.45,(summon.armour||0)/100)))),performance.now()/1000,world);

  const healthLost=Math.min(summon.hp,damage);
  summon.hp = Math.max(0, summon.hp - damage);
  summon.lastHitAt = performance.now() / 1000;
  summon.hitFlash = 0.12;
  applySummonThornRetaliation(summon,enemy,world,healthLost,summon.lastHitAt,log,player);
  playSfx('hit', { volume: 0.45, throttle: 0.06 });

  addFloatingText(summon, `-${damage}`, {
    color: '#ef6f6c',
    ttl: 0.6,
    size: 11
  });

  if (summon.hp <= 0) {
    summon.hp = 0;
    summon.alive = false;
    summon.dismissed = false;
    summon.dead = true;

    addFloatingText(player, `${summon.displayName || summon.kind} fallen`, {
      color: '#ff8c8c',
      ttl: 0.8,
      size: 12
    });

    log?.(`${enemy.name || 'Enemy'} destroyed ${summon.displayName || summon.kind}.`);
  }
}

// -----------------------------------------------------------------------------
// ENEMY DEATH / LOOT
// -----------------------------------------------------------------------------

function handleEnemyDeath(enemy, player, world, log) {
  if (enemy.deathHandled) {
    enemy.removeTimer = (enemy.removeTimer ?? 0.35) - 0.016;

    if (enemy.removeTimer <= 0) {
      enemy.remove = true;
    }

    return;
  }

  enemy.deathHandled = true;
  cancelEnemyAttackPresentation(enemy);enemy.telegraph=null;enemy.bossTell=null;
  if(enemy.boss)enemy.boss.pendingSpecial=null;
  recordRepeatableEnemyDeath(world,player,enemy);
  enemy.dead = true;
  enemy.hp = 0;
  enemy.removeTimer = enemy.groveMother||enemy.orchardCustodian?1.05:0.35;
  recordEnemyDeathVisual(enemy, {
    classId: player?.classId,
    skill: enemy.pendingWeaponSkillId || player?.classSkill,
    dirX: (enemy.x || 0) - (player?.x || 0),
    dirY: (enemy.y || 0) - (player?.y || 0)
  });

  spawnWorldEffect(world, {
    kind: 'enemyPulse',
    layer: 'front',
    x: enemy.x,
    y: enemy.y - 8,
    color: enemy.isBoss ? '#ffcc66' : enemy.archetype === 'cultist' || enemy.archetype === 'wraith' ? '#b68cff' : '#ef6f6c',
    radius: enemy.isBoss ? 72 : 34,
    ttl: enemy.isBoss ? 0.72 : 0.38
  });

  if(enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss)return;
  const questPlayer = player.questOwner || player;
  recordPoiEnemyDefeat(questPlayer, enemy, world);
  markKillObjective(player, enemy);

  if (enemy.isBoss && !enemy.miniBoss) {
    if (completeDungeonAfterBoss(world,enemy)) {
      markPartyDungeonClearedObjective(player, world.dungeonId || world.poiId || world.entranceId || world.name);
      log?.(`${world.name || 'Dungeon'} cleared. A portal opens back to the entrance.`);
    }

    applyBossDefeatRewards(enemy, questPlayer, world, log);
    playSfx('boss', { volume: 1, throttle: 0.2 });
  } else if (enemy.miniBoss && world?.mode === 'dungeon') {
    if (unlockDungeonMiniBossRewards(world, enemy)) {
      log?.(`${enemy.name || 'Mini boss'} defeated. A guarded reward unlocks.`);
      addFloatingText(player, 'Guardian Spoils Unlocked', {
        color: '#ffcc66',
        ttl: 1.1,
        size: 12
      });
    }
  }

  recordBossReturnVictory(world,enemy);
  const xp = enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss ? 0 : enemy.xp ?? defaultEnemyXp(enemy);
  gainXp(player, 'renown', xp, log);
  grantSharedCombatKillXp(player, enemy, xp, log);

  const drops = createEnemyLootDrops(enemy, player, world);
  playSfx(enemy.isBoss ? 'boss' : 'enemyDeath', {
    volume: enemy.isBoss ? 1 : 0.65,
    throttle: 0.06
  });

  for (const drop of drops) {
    const itemName = drop.name || ITEMS[drop.itemId]?.name || drop.itemId;

    log?.(`${drop.ownerLabel || 'P1'} loot dropped: ${drop.qty}x ${itemName}.`);

    addFloatingText(player, `Loot: ${itemName}`, {
      color: getItemFloatingColor(drop.itemId),
      ttl: 0.75,
      size: 11
    });
  }

  if (drops.length) {
    playSfx('loot', { volume: Math.min(1, 0.55 + drops.length * 0.08), throttle: 0.08 });
  }

  log?.(`${enemy.name || enemy.kind || 'Enemy'} defeated.`);
}

// -----------------------------------------------------------------------------
// SUMMONS
// -----------------------------------------------------------------------------

function createSummon(player, kind, rules = null, index = 0) {
  const summonRules = rules || getSummonRules(player, kind);
  const level = 1 + levelStat(getSkillLevel(player, 'summoning'));
  // Health keeps its established curve; damage has its own offensive curve.
  const summoningPower = progressionPower(player,'summoning','vitality');
  const magicGear=summonEquipmentPower(player),equipmentBonuses=getEquipmentStatBonuses(player);

  const treeBonuses = getSkillTreeBonuses(player);
  const combatLevel = 1 + levelStat(getPlayerCombatLevel(player));
  const swarmPenalty = summonRules.maxCount > 1 ? 0.58 : 1;
  const summonHealthMultiplier = (1 + Math.max(0, treeBonuses.summonHealthPct || 0) / 100) * (1+Math.max(0,equipmentBonuses.summonHealth||0)) * swarmPenalty;

  const baseHp = kind === 'greaterLich' ? (70+magicGear*.8+combatLevel*2)*summoningPower : kind === 'wolf' ? (65+magicGear*1.2) * summoningPower : kind === 'miniDemon' ? (135+magicGear*1.6) * summoningPower : kind === 'lich'
    ? 42 + level * 3.6 + combatLevel * 1.8
    : kind === 'eldritchHorror'
      ? 54 + level * 4.4 + combatLevel * 2.0
      : 62 + level * 5.2 + combatLevel * 2.2;

  const maxHp = Math.max(18, Math.floor(baseHp * summonHealthMultiplier));

  const displayName = kind === 'wolf' ? 'Roadside Wolf' : kind === 'miniDemon' ? 'Demonseed Ravager' : getSummonDisplayName(kind, summonRules, getSkillLevel(player,'summoning'), index);
  const spawnAngle = (Math.PI * 2 / Math.max(1, summonRules.maxCount)) * index - Math.PI / 2;
  const spawnRadius = summonRules.maxCount > 1 ? 46 : 34;

  const summon = {
    id: `summon-${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    kindTag: 'summon',
    displayName,

    x: player.x + Math.cos(spawnAngle) * spawnRadius,
    y: player.y + Math.sin(spawnAngle) * spawnRadius,

    dirX: player.dirX || 0,
    dirY: player.dirY ?? 1,

    hp: maxHp,
    maxHp,

    damage: calculateSummonBaseDamage(player,kind,summonRules),

    speed: kind === 'wolf' ? 225 : kind === 'miniDemon' ? 185 : kind === 'lich' ? 155 : kind === 'eldritchHorror' ? 165 : 175,
    armour: Math.min(45,3 + levelStat(getSkillLevel(player,'summoning')) * .25),
    attackRange: kind === 'lich'
      ? (summonRules.maxCount > 1 ? 74 : 135)
      : kind === 'eldritchHorror'
        ? (summonRules.maxCount > 1 ? 66 : 118)
        : 34,
    attackCooldown: 0,
    attackRate: kind === 'wolf' ? .58 : kind === 'miniDemon' ? .72 : kind === 'lich'
      ? (summonRules.maxCount > 1 ? 1.08 : 1.4)
      : kind === 'eldritchHorror'
        ? (summonRules.maxCount > 1 ? 0.98 : 1.22)
        : (summonRules.maxCount > 1 ? 0.86 : 1.0),
    evolutionStage: summonRules.stage,
    summonPath: summonRules.path,
    formationIndex: index,
    formationCount: summonRules.maxCount,
    formationSeed: index * 0.73 + (kind === 'lich' ? 0.2 : 0.55),

    alive: true,
    dead: false,
    dismissed: false,
    walkTime: 0
  };

  applyMythicalWolf(player,summon);
  summonOwners.set(summon,player);
  if(kind==='miniDemon')summon.requiredEquipmentId='demonseedScythe';
  return applyThornbeastSummonRole(
    applyGravecallerSkeletonRole(summon, player, kind, summonRules, index),
    player,
    kind,
    summonRules,
    index
  );
}

function calculateSummonBaseDamage(player,kind,rules){
  const tree=getSkillTreeBonuses(player),equipment=getEquipmentStatBonuses(player);
  const base=({greaterLich:8.3,wolf:7,miniDemon:15,lich:6,eldritchHorror:7,thornbeast:4})[kind]||4;
  const gear=summonEquipmentPower(player)*(kind==='miniDemon'?.22:.15);
  return Math.max(2,Math.floor((base+gear)*progressionPower(player,'summoning')*
    (1+Math.max(0,tree.summonDamagePct||0)/100)*(1+Math.max(0,equipment.summonDamage||0))*(rules.maxCount>1?.64:1)));
}
const summonOffenceCache=new WeakMap();
function refreshSummonOffence(player){
  const skills=player.skillState?.skills||{};
  const key=JSON.stringify([player.skillState?.combat?.level,skills.summoning?.level,skills.spirit?.level,
    player.equipment,Object.entries(player.equippedGear||{}).map(([slot,e])=>[slot,e?.id,e?.upgradeTier]),
    player.skillTree?.spent,player.gravecaller?.skeletons?.map(s=>[s.equipment,s.equippedGear])]);
  let cache=summonOffenceCache.get(player);
  if(!cache||cache.key!==key){cache={key,actors:new WeakSet()};summonOffenceCache.set(player,cache);}
  for(const s of player.summons||[]){
    if(!s||s.hp<=0||s.alive===false||s.legendaryTemporary||s.techniqueTemporary||cache.actors.has(s))continue;
    // Rebuild only offensive stats on a progression/gear change or save load.
    // Preserve health, identity, gait, formation, cooldowns and active morphs.
    const rules={path:s.summonPath,stage:s.evolutionStage,maxCount:s.formationCount||1};
    const fresh=createSummon(player,s.kind,rules,s.formationIndex||0);
    if(s.kind==='greaterLich')configureLichSummon(fresh,{subclassId:s.summonMorph});
    if(s.kind==='lich')configureBoundDeadSummon(fresh,{subclassId:s.summonMorph});
    if(s.gardenSummon)configureGardenSummon(fresh,{gardenSummon:true,subclassId:s.summonMorph});
    s.damage=fresh.damage;cache.actors.add(s);
  }
}
function applyThornbeastSummonRole(summon, player, kind, summonRules, index) {
  if (kind !== 'thornbeast') return summon;

  if (summonRules.path === 'swarm') {
    summon.displayName = `Thornling ${index + 1}`;
    summon.evolutionStage = 'thornling';
    summon.maxHp = Math.max(16, Math.floor(Number(summon.maxHp || 1) * 0.82));
    summon.hp = summon.maxHp;
    summon.damage = Math.max(2, Math.floor(Number(summon.damage || 2) * 0.82));
    summon.speed = 200;
    summon.attackRange = 32;
    summon.attackRate = .78;
    summon.thornlingRole = index === 0 ? 'harrier' : index === 1 ? 'snarer' : 'flanker';
    return summon;
  }

  if (summonRules.path === 'evolved') {
    summon.displayName = 'Elder Thornbeast';
    summon.evolutionStage = 'elderThornbeast';
    summon.maxHp = Math.max(80, Math.ceil(Number(summon.maxHp || 1) * 1.62));
    summon.hp = summon.maxHp;
    summon.damage = Math.max(7, Math.ceil(Number(summon.damage || 4) * 1.42));
    summon.speed = 150;
    summon.attackRange = 42;
    summon.attackRate = .92;
    summon.elderPresenceRadius = 108;
    summon.elderDevourCooldown = 2.2;
  }

  return summon;
}

const GRAVECALLER_SKELETON_ROLES = [
  {
    id: 'vanguard',
    name: 'Skeleton Vanguard',
    role: 'Vanguard',
    hpMultiplier: 1.22,
    damageMultiplier: 0.9,
    attackRange: 38,
    attackRate: 1.08
  },
  {
    id: 'reaver',
    name: 'Skeleton Reaver',
    role: 'Reaver',
    hpMultiplier: 1.0,
    damageMultiplier: 1.12,
    attackRange: 42,
    attackRate: 0.9
  },
  {
    id: 'marksman',
    name: 'Skeleton Marksman',
    role: 'Marksman',
    hpMultiplier: 0.86,
    damageMultiplier: 1.02,
    attackRange: 118,
    attackRate: 1.18
  }
];

function getGravecallerSkeletonRole(index = 0) {
  return GRAVECALLER_SKELETON_ROLES[index] || GRAVECALLER_SKELETON_ROLES[0];
}

function applyGravecallerSkeletonRole(summon, player, kind, summonRules, index) {
  if (kind !== 'lich' || summonRules.maxCount <= 1) return summon;

  const role = getGravecallerSkeletonRole(index);
  const gear = getGravecallerSkeletonGearBonuses(player, index);
  const gearSlot = player?.gravecaller?.skeletons?.[index]?.equipment || {};
  summon.displayName = role.name;
  summon.skeletonRole = role.id;
  summon.skeletonRoleName = role.role;
  summon.maxHp = Math.max(1, Math.ceil(Number(summon.maxHp || 1) * role.hpMultiplier + gear.maxHp));
  summon.hp = summon.maxHp;
  summon.damage = Math.max(1, Math.ceil(Number(summon.damage || 1) * role.damageMultiplier + gear.damage));
  summon.armour = Math.max(0, Number(summon.armour || 0) + gear.armour);
  summon.attackRange = role.attackRange;
  summon.attackRate = role.attackRate * .78;
  summon.commandMode = 'defend';
  summon.evolutionStage = 'skeletonServant';
  summon.equipmentSummary = gear.summary;
  summon.coterieEquipment = {
    weapon: gearSlot.weapon || null,
    armour: gearSlot.armour || null,
    charm: gearSlot.charm || null
  };

  return summon;
}

function getGravecallerSkeletonGearBonuses(player, index = 0) {
  const slot = player?.gravecaller?.skeletons?.[index];
  const equipment = slot?.equipment && typeof slot.equipment === 'object' ? slot.equipment : {};
  const ids = [equipment.weapon, equipment.armour, equipment.charm].filter(Boolean);
  let damage = 0;
  let armour = 0;
  let maxHp = 0;
  const summary = [];

  for (const itemId of ids) {
    const item = ITEMS[itemId];
    if (!item) continue;
    const entry=Object.values(slot.equippedGear || {}).find(e=>e.id===itemId),bonus=getTierStatBonus(item,entry?.upgradeTier);
    damage+=item.type==='weapon'?bonus*.55:item.type==='trinket'?bonus*.2:0;
    if(item.type!=='weapon'){armour+=bonus*.55;maxHp+=bonus*2.2;}
    const weaponPower = Number(item.baseDamage || item.damage || item.power || 0);
    const armourPower = Number(item.armour || item.armor || 0);
    const spiritPower = Number(item.spirit || 0);
    damage += weaponPower * 0.55 + spiritPower * 0.2;
    armour += armourPower * 0.55;
    maxHp += armourPower * 2.2 + spiritPower * 0.7;
    summary.push(item.name || itemId);
  }

  return {
    damage,
    armour,
    maxHp,
    summary
  };
}

function getSummonDisplayName(kind, summonRules, level, index) {
  if (kind === 'lich') {
    return summonRules.path === 'evolved' && level >= 60
      ? 'Lich Lord'
      : summonRules.path === 'evolved'
        ? 'Lich'
        : summonRules.maxCount > 1
          ? getGravecallerSkeletonRole(index).name
          : 'Skeleton Servant';
  }

  if (kind === 'eldritchHorror') {
    return summonRules.evolve && level >= 60
      ? 'Old Horror'
      : summonRules.evolve && level >= 35
        ? 'Many-Eyed Horror'
        : summonRules.evolve && level >= 15
          ? 'Starless Horror'
          : summonRules.maxCount > 1
            ? `Lesser Horror ${index + 1}`
            : 'Eldritch Horror';
  }

  return summonRules.evolve && level >= 60
    ? 'Thorn Titan'
    : summonRules.evolve && level >= 35
      ? 'Elder Thornbeast'
      : summonRules.evolve && level >= 15
        ? 'Thornbeast'
        : summonRules.maxCount > 1
          ? `Thornling ${index + 1}`
          : 'Thornling';
}

function getSummonRules(player, kind, abilityId = null) {
  const gravecallerPath = player?.gravecaller?.path || player?.gravecallerPath || null;
  const necroSwarm = kind === 'lich' && (
    gravecallerPath === 'commander' ||
    isSkillTreeNodeUnlocked(player, 'spirit_bone_coterie')
  );
  // Raise the Bound Dead keeps its skeleton identity even on the Lichbound path.
  if(kind==='greaterLich')return {path:'lichbound',evolve:false,maxCount:1,stage:'lich'};
  const thornlingPathUnlocked = kind === 'thornbeast' && isSkillTreeNodeUnlocked(player, 'warding_thornling_grove');
  const elderPathUnlocked = kind === 'thornbeast' && isSkillTreeNodeUnlocked(player, 'warding_elder_beast');
  const thornSwarm = kind === 'thornbeast' && (
    thornlingPathUnlocked ||
    (abilityId === 'thornbinderSummonThornlings' && !elderPathUnlocked)
  );
  const thornEvolve = kind === 'thornbeast' && (
    elderPathUnlocked ||
    abilityId === 'thornbinderSummonElderThornbeast'
  );
  const eldritchSwarm = kind === 'eldritchHorror' && isSkillTreeNodeUnlocked(player, 'eldritch_lesser_things');
  const eldritchEvolve = kind === 'eldritchHorror' && isSkillTreeNodeUnlocked(player, 'eldritch_old_horror');
  const treeBonuses = getSkillTreeBonuses(player);
  const extraCount = Math.max(0, Math.floor(treeBonuses.summonCount || 0));

  if (necroSwarm) {
    return {
      path: 'swarm',
      evolve: false,
      maxCount: 3,
      stage: 'skeletonServant'
    };
  }

  if (thornSwarm) {
    return {
      path: 'swarm',
      evolve: false,
      maxCount: 3,
      stage: 'thornling'
    };
  }

  if (eldritchSwarm) {
    return {
      path: 'swarm',
      evolve: false,
      maxCount: Math.min(4, 1 + extraCount),
      stage: 'lesserHorror'
    };
  }

  const evolves = thornEvolve || eldritchEvolve;

  return {
    path: evolves ? 'evolved' : 'default',
    evolve: evolves,
    maxCount: 1,
    stage: evolves ? null : getBaseSummonStage(kind)
  };
}

function getBaseSummonStage(kind) {
  if (kind === 'wolf') return 'wolf';
  if (kind === 'miniDemon') return 'miniDemon';
  if (kind === 'lich') return 'skeletonServant';
  if (kind === 'thornbeast') return 'thornling';
  if (kind === 'eldritchHorror') return 'lesserHorror';
  return null;
}

function getActiveSummonGroup(player, kind) {
  return (player.summons || []).filter(summon => {
    return summon &&
      !summon.legendaryTemporary &&
      summon.kind === kind &&
      summon.alive !== false &&
      summon.hp > 0;
  });
}

function hasActiveSummonGroup(player, kind) {
  return getActiveSummonGroup(player, kind).length > 0;
}

function getSummonAbilityIdForKind(kind) {
  if (kind === 'wolf') return 'summonWolf';
  if (kind === 'miniDemon') return 'summonDemon';
  if (kind === 'lich') return 'summonLich';
  if (kind === 'greaterLich') return 'gravecallerSummonLich';
  if (kind === 'thornbeast') return 'thornbinderSummonThornlings';
  if (kind === 'eldritchHorror') return 'summonEldritchHorror';
  return null;
}

function getSummonGroupName(kind, count = 1, summons = []) {
  if (count <= 1) return summons[0]?.displayName || summonName(kind);
  if (kind === 'lich') return 'Bone Coterie';
  if (kind === 'thornbeast') return 'Thornling pack';
  if (kind === 'eldritchHorror') return 'Lesser horror brood';
  return 'Summon squad';
}

export function updateSummons(dt, player, world, log, now = performance.now() / 1000) {
  synchronizeEquipmentBoundSkills(player,now);
  player.summons = player.summons || [];
  if (player.hp <= 0 || ['downed','dead','respawning'].includes(player.lifeState)) {
    for (const summon of player.summons) if (summon) summon.alive = false;
    startEndedSummonGroupCooldowns(player, log, now);
    player.summons = [];
    return;
  }
  updateLegendarySummons(player, now);
  refreshSummonOffence(player);
  assignCompanionFormation(player,now);

  const graveMotion = new Map();
  const petalMotion = new Map();
  for (const summon of player.summons) {
    if (!summon || summon.alive === false) continue;
    const before = beginGravecallerMotion(summon);
    if (before) graveMotion.set(summon, before);
    const petalBefore=beginPetalSummonMotion(summon);
    if(petalBefore)petalMotion.set(summon,petalBefore);

    if (summon.expiresAt && summon.expiresAt <= now) { summon.alive=false; continue; }
    if(summon.kind==='wolf' && (summon.mythicalSetPieces||0)!==(getMythicalSetCounts(player).beastSovereign||0)){summon.alive=false;summon.dismissed=true;continue;}
    updateSummon(summon, player, world, dt, now, log);
  }

  separateCompanions(player,world,dt,now);
  for (const [summon, before] of graveMotion) {
    if (summon.alive !== false) finishGravecallerMotion(summon, before, dt);
  }
  for(const [summon,before] of petalMotion)if(summon.alive!==false)finishPetalSummonMotion(summon,before,dt);
  startEndedSummonGroupCooldowns(player, log, now);

  player.summons = player.summons.filter(summon => {
    return summon && summon.alive !== false;
  });
}

function startEndedSummonGroupCooldowns(player, log, now) {
  const managedGroups = new Map();

  for (const summon of player.summons || []) {
    if (!summon || summon.legendaryTemporary) continue;

    const abilityId = summon.summonAbilityId || getSummonAbilityIdForKind(summon.kind);
    if (!abilityId) continue;

    summon.summonAbilityId = abilityId;

    if (!managedGroups.has(abilityId)) managedGroups.set(abilityId, []);
    managedGroups.get(abilityId).push(summon);
  }

  for (const [abilityId, group] of managedGroups) {
    if (group.some(summon => summon.alive !== false && summon.hp > 0)) continue;
    if (group.every(summon => summon.cooldownStarted)) continue;

    const ability = getAbilityById(abilityId);
    if (!ability) continue;

    startAbilityCooldown(player, ability, now);

    for (const summon of group) {
      summon.cooldownStarted = true;
    }

    log?.(`${ability.name} begins cooling down.`);
  }
}

function updateSummon(summon, player, world, dt, now, log) {
  summonOwners.set(summon,player);
  summon.kindTag = 'summon';
  summon.moving=false;
  summon.attackCooldown = Math.max(0, (summon.attackCooldown || 0) - dt);
  summon.elderDevourCooldown = Math.max(0, Number(summon.elderDevourCooldown || 0) - dt);
  summon.walkTime = (summon.walkTime || 0) + dt * 5;
  moveActorWithCollision(summon, world, 0, 0);

  if (summon.hp <= 0) {
    summon.hp = 0;
    summon.alive = false;
    summon.dismissed = false;
    summon.dead = true;
    log?.(`${summon.displayName || summon.kind} was destroyed.`);
    return;
  }

  const source=resolveAbilityMorph(player,summon.sourceAbilityId||summon.summonAbilityId,summon.summonMorph==='base'?null:summon.summonMorph);
  const effectiveness=getAbilityEffectiveness(player,source);
  if(effectiveness!==(summon.expertiseHealthMultiplier||1)){
    const ratio=summon.hp/summon.maxHp;
    summon.expertiseBaseMaxHp??=summon.maxHp/(summon.expertiseHealthMultiplier||1);
    summon.maxHp=Math.ceil(summon.expertiseBaseMaxHp*effectiveness);
    summon.hp=Math.min(summon.maxHp,summon.maxHp*ratio);
    summon.expertiseHealthMultiplier=effectiveness;
  }
  applyThornbeastPassiveHeal(summon, player, world, dt, now, log);
  updateElderThornbeastPresence(summon, player, world, dt, now);

  if (Math.hypot(summon.x-player.x,summon.y-player.y)>650) {
    const point=findCompanionRoom(summon,player,world,companionFollowPoint(summon,player),now);
    summon.x=point.x;summon.y=point.y;summon.targetEnemyId=null;
  }
  const target = findSummonCombatTarget(summon, world);

  if (target) {
    summon.targetEnemyId = target.id || null;
    summonFightTarget(summon, target, player, world, dt, log, now);
    return;
  }

  summon.targetEnemyId = null;
  followPlayer(summon, player, world, dt, now);
}

function applyThornbeastPassiveHeal(summon, player, world, dt, now, log) {
  if (summon.kind !== 'thornbeast') return;
  if(summon.gardenSummon)return;
  if (summon.summonPath === 'swarm' && Number(summon.formationIndex || 0) > 0) return;

  summon.healPulseTimer = (summon.healPulseTimer ?? 1.5) - dt;

  if (summon.healPulseTimer > 0) return;

  summon.healPulseTimer = 2.75;

  const distance = Math.hypot(player.x - summon.x, player.y - summon.y);
  if (distance > 145) return;

  const warding = 1 + levelStat(getSkillLevel(player,'warding'));
  const pathScalar = summon.summonPath === 'evolved' ? 1.35 : summon.summonPath === 'swarm' ? 0.45 : 0.75;
  const summonAbility=resolveAbilityMorph(player,summon.sourceAbilityId||summon.summonAbilityId,summon.summonMorph==='base'?null:summon.summonMorph);
  const heal = Math.max(1, Math.floor((1 + warding * 0.08) * pathScalar))*getAbilityEffectiveness(player,summonAbility);

  const before=player.hp;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  if(player.hp>before && player.loadout?.abilitySlots?.includes(summon.summonAbilityId)) rewardCombatPurpose(player,world,summon.summonAbilityId,(player.hp-before)*.12,now,log);

  // Two small motes at the owner's feet, with no number, ring or healing sound.
  if(player.hp>before&&summon.summonMorph==='fae')spawnWorldEffect(world,{kind:'subclassAbility',subclassId:'fae',geometry:'faeMend',x:player.x,y:player.y+7,ttl:.28});
}

function updateElderThornbeastPresence(summon, player, world, dt, now) {
  if (summon.kind !== 'thornbeast' || summon.summonPath !== 'evolved') return;

  const radius = Number(summon.elderPresenceRadius || 108);

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;
    const distance = Math.hypot((enemy.x || 0) - (summon.x || 0), (enemy.y || 0) - (summon.y || 0));
    if (distance > radius) continue;

    const scalar = getEnemyControlScalar(enemy);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.45 * scalar * getAbilityEffectiveness(player,resolveAbilityMorph(player,summon.sourceAbilityId,summon.summonMorph==='base'?null:summon.summonMorph)));

    if (!summon.gardenSummon&&summon.summonMorph!=='fae' && (!enemy.verdantWound || Number(enemy.verdantWound.until || 0) <= now + 0.8)) {
      applyVerdantWound(player, enemy, world, now, 1, { sourceAbilityId:summon.sourceAbilityId,tickDamage: 2 * getAbilityEffectiveness(player,resolveAbilityMorph(player,summon.sourceAbilityId,summon.summonMorph==='base'?null:summon.summonMorph)) });
    }
  }

  const distanceToPlayer = Math.hypot((player.x || 0) - (summon.x || 0), (player.y || 0) - (summon.y || 0));
  if (distanceToPlayer <= 165) {
    const state = ensureThornbinderState(player);
    state.briarBloomHealingScalar = Math.max(Number(state.briarBloomHealingScalar || 1), 1.18);
  }
}

export function getSummonMovementSpeed(summon,player) {
  const dash=getDashVelocity(player);
  return resolveSummonMovementSpeed(summon?.speed,getPlayerMovementMultiplier(player),Math.hypot(dash.x,dash.y));
}

function moveSummonToward(summon,player,world,dx,dy,dt,remaining=Infinity) {
  summon.moving=true;
  const distance = Math.min(remaining,getSummonMovementSpeed(summon,player) * getEliteControlMultiplier(summon) * Math.min(.05,Math.max(0,dt)));
  const x=summon.x,y=summon.y;
  moveActorWithCollision(summon,world,dx*distance,dy*distance);
  if (Math.hypot(summon.x-x,summon.y-y)<distance*.25) {
    for (const angle of [.65,-.65,1.2,-1.2]) {
      const c=Math.cos(angle),s=Math.sin(angle),nx=dx*c-dy*s,ny=dx*s+dy*c;
      if (!isPassable(world,x+nx*28,y+ny*28))continue;
      moveActorWithCollision(summon,world,nx*distance,ny*distance);break;
    }
  }
}

function followPlayer(summon, player, world, dt, now) {
  const room=findCompanionRoom(summon,player,world,companionFollowPoint(summon,player),now);
  const point=companionNavigationPoint(summon,world,room,now);
  const desiredX=point.x,desiredY=point.y;

  const dx = desiredX - summon.x;
  const dy = desiredY - summon.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 8) return;

  const dirX = dx / (dist || 1);
  const dirY = dy / (dist || 1);

    moveSummonToward(summon,player,world,dirX,dirY,dt,dist);
    summon.dirX = dirX;
    summon.dirY = dirY;
}

function summonFightTarget(summon, target, player, world, dt, log, now) {
  const targetDx = target.x - summon.x;
  const targetDy = target.y - summon.y;
  const targetDistance = Math.hypot(targetDx, targetDy);
  const targetDirX = targetDx / (targetDistance || 1);
  const targetDirY = targetDy / (targetDistance || 1);

  const tactics=summonTactics(summon);
  if(tactics.ranged){
    // Casters keep firing while making room, including when they hold aggro.
    summon.dirX=targetDirX;summon.dirY=targetDirY;
    let escapeX=0,escapeY=0;
    for(const enemy of world.enemies||[]){
      if(!isLivingEnemy(enemy)||enemy.friendly)continue;
      const ex=summon.x-enemy.x,ey=summon.y-enemy.y,distance=Math.hypot(ex,ey);
      if(distance>=tactics.minimum||!hasLineOfSight(world,summon.x,summon.y,enemy.x,enemy.y))continue;
      const weight=1-distance/tactics.minimum;
      escapeX+=(distance>.01?ex/distance:-targetDirX||-1)*weight;
      escapeY+=(distance>.01?ey/distance:-targetDirY)*weight;
    }
    const escapeLength=Math.hypot(escapeX,escapeY);
    if(escapeLength>.01)moveSummonToward(summon,player,world,escapeX/escapeLength,escapeY/escapeLength,dt);
    else if(targetDistance>tactics.range*.9||!hasLineOfSight(world,summon.x,summon.y,target.x,target.y)){
      const room=findCompanionRoom(summon,player,world,companionCombatPoint(summon,target,player),now,target);
      const point=companionNavigationPoint(summon,world,room,now);
      const dx=point.x-summon.x,dy=point.y-summon.y,distance=Math.hypot(dx,dy);
      if(distance>8)moveSummonToward(summon,player,world,dx/distance,dy/distance,dt,distance);
    }
    // Face the spell's target, independently of the direction of travel.
    const distance=Math.hypot(target.x-summon.x,target.y-summon.y)||1;
    summon.dirX=(target.x-summon.x)/distance;summon.dirY=(target.y-summon.y)/distance;
    attackSummonTarget(summon,target,player,world,log,now);
    return;
  }
  // Melee companions holding aggro plant themselves and trade blows.
  if (isEnemyTargetingSummon(target, summon)) {
    summon.dirX = targetDirX;
    summon.dirY = targetDirY;

    if (targetDistance > Math.max(18, summon.attackRange - 4)) {
      moveSummonToward(summon,player,world,targetDirX,targetDirY,dt);
      return;
    }

    attackSummonTarget(summon, target, player, world, log, now);
    return;
  }

  const desired=companionCombatPoint(summon,target,player);
  const room=findCompanionRoom(summon,player,world,desired,now,target);
  const point=companionNavigationPoint(summon,world,room,now);
  const desiredX=point.x,desiredY=point.y;
  const dx = desiredX - summon.x;
  const dy = desiredY - summon.y;
  const dist = Math.hypot(dx, dy);

  const dirX = dx / (dist || 1);
  const dirY = dy / (dist || 1);

  summon.dirX = dirX;
  summon.dirY = dirY;

  const reach=(summon.attackRange||34)+(target.radius||0);
  if (targetDistance > reach || (dist > 18 && summon.attackCooldown>0)) {
    if(dist>1)moveSummonToward(summon,player,world,dirX,dirY,dt,dist);
    return;
  }

  if(summon.kind==='greaterLich'||isBoundDeadMorph(summon)){summon.dirX=targetDirX;summon.dirY=targetDirY;}
  attackSummonTarget(summon, target, player, world, log, now);
}

function attackSummonTarget(summon, target, player, world, log, now = performance.now()/1000) {
  if (summon.attackCooldown > 0 || Math.hypot(target.x-summon.x,target.y-summon.y) > (summon.attackRange || 34) + (target.radius || 0)) return;
  if (!hasLineOfSight(world,summon.x,summon.y,target.x,target.y)) return;

  const empowered = Number(summon.chargedEmpoweredUntil || 0) > performance.now() / 1000;
  const elderDevour = summon.kind === 'thornbeast' &&
    summon.summonPath === 'evolved' &&
    Number(summon.elderDevourCooldown || 0) <= 0;
  const summonAbility=resolveAbilityMorph(player,summon.sourceAbilityId||summon.summonAbilityId||getSummonAbilityIdForKind(summon.kind),summon.summonMorph==='base'?null:summon.summonMorph);
  const summonMastery=(applyAbilityMastery(player,summonAbility)?._mastery?.damage||1)*getAbilityEffectiveness(player,summonAbility);
  let damage = Math.ceil((summon.damage || 5) * (1 + Number(getBloodlineCombatModifiers(player).abilityDamagePct || 0)/100) * summonMastery * (empowered ? 1.25 : 1) * (elderDevour ? 1.75 : 1));
  const procPower=damage;
  damage=Math.ceil(damage*equipmentDamageMultiplier(player,target,
    ['greaterLich','lich'].includes(summon.kind)?'necrotic':summon.kind==='thornbeast'?'nature':null));
  damage=mitigateEliteHit(target,summon,damage);
  const summonSkill = 'summoning';

  const actualDamage = Math.min(target.hp,damage);
  target.hp = Math.max(0, target.hp - damage);
  if(isGravecallerSustain(player)){
    const rate=summon.summonMorph==='acolyte'?GRAVECALLER_SUSTAIN.specter:GRAVECALLER_SUSTAIN.summon;
    const modifiers=getBloodlineCombatModifiers(player);
    restoreGravecallerLifesteal(player,actualDamage,rate,{source:'summon',now,
      bonusPct:gravecallerLifestealBonus(player),healingPct:modifiers.lifestealHealingPct||0});
  }
  if(actualDamage>0){
    recordEnemyHitReaction(target,{heavy:elderDevour,magic:summon.kind==='greaterLich',dirX:target.x-summon.x,dirY:target.y-summon.y});
    recordEnemyContactImpact(target,summon,world,{heavy:elderDevour,skill:'summoning'});
  }
  recordEnemyCombatContribution(target, player, summonSkill, actualDamage, {
    source: 'summon',
    sourceAbilityId: summon.sourceAbilityId || summon.summonAbilityId || getSummonAbilityIdForKind(summon.kind),
    summonKind: summon.kind
  });
  summon.attackAnimationUntil = performance.now()/1000 + .22;
  if (summon.kind === 'wolf' || summon.kind === 'miniDemon') {
    spawnWorldEffect(world,{kind:summon.kind==='wolf'?'slash':'hitSpark',x:target.x,y:target.y-6,dirX:target.x-summon.x,dirY:target.y-summon.y,ttl:.2,radius:summon.kind==='wolf'?12:22,color:summon.kind==='wolf'?'#dbf5f1':'#68f4df'});
    target.staggerTimer=Math.max(target.staggerTimer||0,summon.kind==='miniDemon'?.13:.06);
    playSfx(summon.kind==='wolf'?'attack':'fire',{volume:.35,throttle:.18});
  }
  if(summon.kind==='wolf' && summon.mythicalSetPieces>=2)target.staggerTimer=Math.max(target.staggerTimer||0,.12);
  if(summon.direWolf){
    summon.direBites=(summon.direBites||0)+1;
    target.targetSummonId=summon.id;target.summonThreatUntil=performance.now()/1000+2.5;
    if(summon.direBites%3===0){
      for(const foe of (world.enemies||[]).filter(e=>e!==target && e.hp>0 && !e.friendly && Math.hypot(e.x-target.x,e.y-target.y)<64 && hasLineOfSight(world,summon.x,summon.y,e.x,e.y)).slice(0,4))damageEnemyDirect(player,world,foe,procPower*.45,'summoning',log,{source:'summon',sourceAbilityId:'summonWolf',summonKind:'wolf',aoe:true,quiet:true});
      spawnWorldEffect(world,{kind:'slash',x:target.x,y:target.y-6,dirX:target.x-summon.x,dirY:target.y-summon.y,radius:64,ttl:.25,color:'#edcf87'});
    }
  }
  onLichSummonHit(summon,player,world,target,procPower,actualDamage,now,{effect:fx=>spawnWorldEffect(world,fx),damage:(e,value,skill,options)=>damageEnemyDirect(player,world,e,value,skill,log,options)});
  target.hitFlash = 0.12;
  target.aggro = Math.max(target.aggro || 0, 2.8);

  addFloatingText(target, String(damage), {
    color: getSummonDamageColor(summon.kind),
    ttl: 0.65,
    size: 12
  });

  if (summon.kind === 'thornbeast') {
    target.slowTimer = Math.max(target.slowTimer || 0, (summon.summonPath === 'evolved' ? 1.35 : 0.75)*getAbilityEffectiveness(player,summonAbility));
    if(summon.summonMorph==='fae'){
      const now=performance.now()/1000,a=resolveAbilityMorph(player,summon.sourceAbilityId||summon.summonAbilityId,'fae');
      applyFaeSummonHit(player,world,a,target,now);
      spawnWorldEffect(world,{kind:'subclassAbility',subclassId:'fae',geometry:'faerieFire',x:target.x,y:target.y-9,radius:12,ttl:.25});
    }else if(summon.gardenSummon){
      const a=resolveAbilityMorph(player,summon.sourceAbilityId,summon.summonMorph);applyGardenCompanionHit(player,world,a,target,procPower,now);
      spawnWorldEffect(world,{kind:'subclassAbility',subclassId:summon.summonMorph,geometry:'impact',x:target.x,y:target.y-9,radius:16,ttl:.24});
    }else{
      applyVerdantWound(player, target, world, performance.now() / 1000, summon.summonPath === 'evolved' ? 2 : 1, {
        sourceAbilityId: summon.sourceAbilityId || summon.summonAbilityId,
        tickDamage: Math.max(1, Math.floor(procPower * 0.12))
      });
    }
  }

  if (elderDevour) {
    const heal = Math.max(3, Math.ceil(damage * 0.34));
    summon.hp = Math.min(summon.maxHp || summon.hp || 1, (summon.hp || 0) + heal);
    summon.elderDevourCooldown = 5.8;

    if (world) {
      spawnWorldEffect(world, {
        kind: summon.summonMorph==='fae'||summon.gardenSummon?'subclassAbility':'thornbinderRosebiteBurst',
        ...(summon.summonMorph==='fae'?{subclassId:'fae',geometry:'faerieFire'}:summon.gardenSummon?{subclassId:summon.summonMorph,geometry:'burst'}:{}),
        layer: 'front',
        x: target.x,
        y: target.y,
        radius: 34,
        ttl: 0.42,
        elder: true
      });
    }
  }

  if (target.hp <= 0) {
    target.dead = true;
  }

  summon.attackCooldown = summon.attackRate || 1.1;
}

function findSummonCombatTarget(summon, world) {
  const enemies = (world?.enemies || []).filter(e=>isLivingEnemy(e)&&(!['greaterLich','lich'].includes(summon.kind)||!e.friendly));

  const focusedEnemy = findClosestEnemyMatching(summon, enemies, enemy => {
    return isEnemyTargetingSummon(enemy, summon);
  }, 320);

  if (focusedEnemy) return focusedEnemy;

  const lockedEnemy = summon.targetEnemyId
    ? enemies.find(enemy => enemy.id === summon.targetEnemyId)
    : null;

  if (lockedEnemy && Math.hypot(lockedEnemy.x - summon.x, lockedEnemy.y - summon.y) <= 280) {
    return lockedEnemy;
  }

  return findClosestEnemyMatching(summon, enemies, null, Math.max(230,(summon.attackRange||34)+40));
}

function findClosestEnemyMatching(summon, enemies, predicate, range) {
  let best = null;
  let bestDistance = Infinity;

  for (const enemy of enemies) {
    if (predicate && !predicate(enemy)) continue;

    const distance = Math.hypot(enemy.x - summon.x, enemy.y - summon.y);
    if (distance >= range || distance >= bestDistance) continue;

    best = enemy;
    bestDistance = distance;
  }

  return best;
}

function isEnemyTargetingSummon(enemy, summon) {
  return !!(
    enemy &&
    summon?.id &&
    enemy.combatTargetKind === 'summon' &&
    enemy.combatTargetId === summon.id
  );
}

function isLivingEnemy(enemy) {
  return !!(enemy && !enemy.dead && enemy.hp > 0 && !enemy.remove);
}

function getSummonDamageColor(kind) {
  if (kind === 'lich' || kind === 'greaterLich') return '#b68cff';
  if (kind === 'eldritchHorror') return '#ef4056';
  return '#73d18a';
}

// -----------------------------------------------------------------------------
// TARGETING / DAMAGE HELPERS
// -----------------------------------------------------------------------------

function findTargetInDirection(player, world, range, input = null) {
  const aim = getSafeAimDirection(player, input);

  let best = null;
  let bestScore = Infinity;

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > range) continue;

    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const dot = nx * aim.x + ny * aim.y;

    if (dot < 0.45) continue;

    const score = dist - dot * 40;

    if (score < bestScore) {
      best = enemy;
      bestScore = score;
    }
  }

  return best;
}

function findEnemiesInCone(player, world, aim, range, width, maxHits = 6) {
  const candidates = [];
  const startX = player.x;
  const startY = player.y - 6;

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const dx = enemy.x - startX;
    const dy = enemy.y - startY;
    const distance = Math.hypot(dx, dy);

    if (distance > range) continue;

    const forward = dx * aim.x + dy * aim.y;
    if (forward < 10) continue;

    const closestX = startX + aim.x * forward;
    const closestY = startY + aim.y * forward;
    const perpendicular = Math.hypot(enemy.x - closestX, enemy.y - closestY);
    const allowedWidth = width * (0.45 + forward / Math.max(1, range) * 0.65);

    if (perpendicular > allowedWidth) continue;

    candidates.push({
      enemy,
      distance,
      forward,
      score: forward + perpendicular * 0.45
    });
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, maxHits);
}

function findEnemiesInRadius(world, x, y, radius, maxHits = 10) {
  const candidates = [];

  for (const enemy of world?.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance > radius) continue;

    candidates.push({ enemy, distance, score: distance });
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, maxHits);
}

function healPartyNear(player, amount, radius) {
  const members = [
    player,
    ...(player?.coop?.players || []).filter(ally => ally && ally.active !== false)
  ];

  for (const member of members) {
    const distance = Math.hypot((member.x || 0) - player.x, (member.y || 0) - player.y);
    if (distance > radius) continue;

    const finalAmount = modifyBloodlineHealing(member, amount);
    member.hp = Math.min(member.maxHp || member.hp || 1, (member.hp || 0) + finalAmount);

    if (member !== player) {
      addFloatingText(member, `+${finalAmount}`,
      {
        color: '#73d18a',
        ttl: 0.72,
        size: 12
      });
    }
  }
}

function forPartyNear(player, radius, callback) {
  const members = [
    player,
    ...(player?.coop?.players || []).filter(ally => ally && ally.active !== false)
  ];

  for (const member of members) {
    const distance = Math.hypot((member.x || 0) - player.x, (member.y || 0) - player.y);
    if (distance <= radius) callback(member);
  }
}

function markEnemySoaked(enemy, now, duration = 5, vulnerabilityPct = 10) {
  if (!enemy) return;
  const until = Math.max(getEnemySoakedUntil(enemy), now + duration);
  const vulnerability = Math.max(
    enemy.waveriderWaterVulnerabilityPct || 0,
    enemy.hydromancerWaterVulnerabilityPct || 0,
    vulnerabilityPct
  );

  enemy.waveriderSoakedUntil = until;
  enemy.hydromancerSoakedUntil = until;
  enemy.waveriderWaterVulnerabilityPct = vulnerability;
  enemy.hydromancerWaterVulnerabilityPct = vulnerability;
  enemy.soakedAppliedAt = now;
}

function getEnemySoakedUntil(enemy) {
  return Math.max(
    Number(enemy?.waveriderSoakedUntil || 0),
    Number(enemy?.hydromancerSoakedUntil || 0)
  );
}

function isEnemySoaked(enemy, now = performance.now() / 1000) {
  return getEnemySoakedUntil(enemy) > now;
}

function damageEnemyDirect(player, world, enemy, damage, skill, log, options = {}) {
  options.sourceAbilityId = options.sourceAbilityId || resolveAbilitySourceName(options.sourceName);
  if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) return false;
  const sunken=isSunkenDamage(player,options),sunkenNow=options.now??performance.now()/1000,sunkenPower=damage;
  if(options.sourceAbilityId&&!options.dot&&!options.proc&&!options.sunkenBurn&&!options.oathBlade&&options.source!=='summon'){
    const sourceAbility=resolveAbilityMorph(player,getAbilityById(options.sourceAbilityId),options.sourceMorph||options.subclassId||getSelectedAbilityMorph(player,options.sourceAbilityId));
    damage*=directHitMultiplier(sourceAbility,options);
  }
  if(sunken)damage*=sunkenDirectMultiplier(player,world,enemy,sunkenNow);

  const treeBonuses = getSkillTreeBonuses(player);
  let finalDamage = Math.max(1, Math.floor(damage || 1));

  if (options.singleTarget) {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.singleTargetDamagePct || 0) / 100));
  }

  if (options.aoe) {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.aoeDamagePct || 0) / 100));
  }

  if (skill === 'spirit') {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.necroticDamagePct || 0) / 100));
  }

  if (skill === 'warding') {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.natureDamagePct || 0) / 100));
  }

  if (options.sourceName === 'Judgment Smite' || options.sourceName === 'Heavenbreaker Judgment' || options.sourceName === 'Radiant Smite') {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.holyDamagePct || 0) / 100));
  }

  if (options.lightbringer || options.element === 'holy') {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.lightbringerDamagePct || 0) / 100));
  }

  if (
    options.lightbringer &&
    enemy.lightbringerHaloBrandUntil &&
    enemy.lightbringerHaloBrandUntil > performance.now() / 1000
  ) {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(8, treeBonuses.brandedTargetDamagePct || 0) / 100));
  }

  const bloodlineModifiers = getBloodlineCombatModifiers(player);

  if (bloodlineModifiers.abilityDamagePct && options.sourceName) {
    finalDamage = Math.ceil(finalDamage * (1 + Number(bloodlineModifiers.abilityDamagePct || 0) / 100));
  }

  if (options.element === 'fire') {
    finalDamage = Math.ceil(finalDamage * (1 + Number(bloodlineModifiers.fireDamagePct || 0) / 100));
  }

  if (options.element === 'holy') {
    finalDamage = Math.ceil(finalDamage * (1 + Number(bloodlineModifiers.holyDamagePct || 0) / 100));
  }

  if (options.element === 'water') {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.waterDamagePct || 0) / 100));
  }

  if (
    options.element === 'water' &&
    isEnemySoaked(enemy)
  ) {
    const vulnerability = Math.max(
      0,
      enemy.waveriderWaterVulnerabilityPct || enemy.hydromancerWaterVulnerabilityPct || 10
    );
    finalDamage = Math.ceil(finalDamage * (1 + vulnerability / 100));
  }

  if (skill === 'spirit' && bloodlineModifiers.necroticDamagePct) {
    finalDamage = Math.ceil(finalDamage * (1 + Number(bloodlineModifiers.necroticDamagePct || 0) / 100));
  }

  if ((enemy.isBoss || enemy.bossId) && treeBonuses.bossDamagePct) {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.bossDamagePct || 0) / 100));
  }

  if ((enemy.elite || enemy.modifier) && treeBonuses.eliteDamagePct) {
    finalDamage = Math.ceil(finalDamage * (1 + Math.max(0, treeBonuses.eliteDamagePct || 0) / 100));
  }

  if (
    (isFellhunter(player) || options.fellhunter || options.exploitExposed) &&
    isEnemyExposed(enemy)
  ) {
    const exposedBonus = Math.max(
      0,
      getEnemyExposedBonusPct(enemy) + Math.max(0, Number(treeBonuses.exposedDamagePct || 0))
    );
    finalDamage = Math.ceil(finalDamage * (1 + Math.min(38, exposedBonus) / 100));
  }

  finalDamage = applyLegendaryOutgoingDamage(player, enemy, finalDamage, {
    skill,
    sourceName: options.sourceName,
    ranged: options.ranged,
    projectile: options.projectile,
    aoe: options.aoe,
    singleTarget: options.singleTarget
  }, world, log);

  if(!options.equipmentScaled)finalDamage=Math.ceil(finalDamage*equipmentDamageMultiplier(player,enemy,
    options.element||(skill==='spirit'?'necrotic':skill==='warding'?'nature':null)));
  finalDamage=mitigateEliteHit(enemy,player,finalDamage,options);
  if(finalDamage<=0)return 0;
  const actualDamage = Math.min(enemy.hp,finalDamage);
  enemy.hp = Math.max(0, enemy.hp - finalDamage);
  if(sunken&&actualDamage>0)applySunkenPressure(player,world,enemy,sunkenPower,skill,options,sunkenNow);
  recordEnemyCombatContribution(enemy, player, skill || 'blade', actualDamage, {
    sourceAbilityId: options.sourceAbilityId,
    source: options.sourceName || 'ability',
    element: options.element,
    magic: options.magic,
    projectile: options.projectile,
    aoe: options.aoe
  });
  if(options.sourceAbilityId && !options.subclassApplied && !options.channelTick && !options.quiet) {
    const source=getAbilityById(options.sourceAbilityId);
    spawnWorldEffect(world,{kind:'abilityPresentation',abilityId:source?.id,phase:'impact',
      x:enemy.x,y:enemy.y-5,dirX:enemy.x-player.x,dirY:enemy.y-player.y,radius:22,ttl:.24});
    playAbilityAudioEvent('impact',source);
  }
  enemy.hitFlash = 0.16;
  enemy.hitStopTimer = Math.max(enemy.hitStopTimer || 0, options.channelTick ? 0 : options.crit ? 0.06 : 0.025);
  enemy.lastHitAt = performance.now() / 1000;
  enemy.aggro = Math.max(enemy.aggro || 0, 2.8);
  const hitDirection = normalizeVector(
    Number(options.dirX ?? (enemy.x || 0) - (player.x || 0)),
    Number(options.dirY ?? (enemy.y || 0) - (player.y || 0))
  );
  const sourceText = String(options.sourceName || '').toLowerCase();
  const charged = !!options.charged || /heavy|cleav|smite|breaker|lance|rift|burst|volley|feast|brand/.test(sourceText);
  const sustained=!!(options.channelTick||options.dot);
  const heavy = !sustained&&!!(options.heavy || charged || options.stagger);
  if (!options.channelTick || !enemy.lastChannelFeedbackAt || performance.now()/1000-enemy.lastChannelFeedbackAt>.3) {
  enemy.lastChannelFeedbackAt = performance.now()/1000;
  recordEnemyHitReaction(enemy, {
    crit: options.crit,
    heavy,
    charged:!sustained&&charged,
    dot:sustained,
    stagger: options.stagger,
    knockback: options.knockback,
    magic: options.magic || skill === 'spirit' || skill === 'warding',
    dirX: hitDirection.x,
    dirY: hitDirection.y,
    color: options.color || '#ffcc66'
  });
  recordEnemyContactImpact(enemy,player,world,{...options,heavy,skill,dirX:hitDirection.x,dirY:hitDirection.y});
  if(!options.oathBlade&&String(options.sourceAbilityId||'').startsWith('oathkeeper')&&(options.subclassApplied||options.quiet||options.channelTick))
    playSfx('oathMiracle',{phase:'impact',family:options.subclassId||'base',heavy,volume:sustained?.25:.6,
      throttleKey:'oath:impact',throttle:sustained?.3:.14});
  }

  if (!options.quiet || performance.now()/1000-(enemy.lastAbilityNumberAt || 0)>.45) {
  enemy.lastAbilityNumberAt = performance.now()/1000;
  addFloatingText(enemy, options.crit ? `Crit ${finalDamage}` : String(finalDamage), {
    color: options.color || '#ffcc66',
    ttl: 0.75,
    size: options.crit ? 15 : options.quiet ? 10 : 14
  });
  }


  const xp = Math.max(3, Math.ceil(finalDamage * (options.xpMultiplier ?? 0.35)));

  const lifestealPct = Math.max(
    0,
    (treeBonuses.lifestealPct || 0) +
    (getBloodlineCombatModifiers(player).lifestealPct || 0) +
    (options.lifestealBonusPct || 0)
  );

  if(isGravecallerSustain(player)){
    const source=getAbilityById(options.sourceAbilityId);
    const rate=gravecallerSkillLifesteal(source,options.subclassId||options.sourceMorph)||
      (source?.bloodline||!source?.classId?Math.max(0,options.lifestealBonusPct||0):0);
    if(!options.dot&&!options.proc&&options.source!=='summon'){
      const healed=restoreGravecallerLifesteal(player,actualDamage,rate,{source:'spell',now:options.now??performance.now()/1000,
        bonusPct:gravecallerLifestealBonus(player,treeBonuses),healingPct:getBloodlineCombatModifiers(player).lifestealHealingPct||0});
      if(healed>=1)addFloatingText(player,`+${Math.round(healed)}`,{color:'#b68cff',ttl:.58,size:11});
    }
  }else if (lifestealPct > 0) {
    const heal = Math.max(1, modifyBloodlineHealing(player, Math.floor(finalDamage * lifestealPct / 100), { source: 'lifesteal' }));
    player.hp = Math.min(player.maxHp || player.hp || 1, (player.hp || 0) + heal);

    addFloatingText(player, `+${heal}`, {
      color: skill === 'spirit' ? '#b68cff' : '#73d18a',
      ttl: 0.58,
      size: 11
    });
  }

  if (enemy.hp <= 0) {
    enemy.dead = true;
    recordEnemyDeathVisual(enemy, {
      classId: player.classId,
      skill,
      element: options.element,
      heavy,
      knockback: options.knockback,
      magic: options.magic || skill === 'spirit' || skill === 'warding',
      dirX: hitDirection.x,
      dirY: hitDirection.y,
      color: options.color
    });
    onSubclassKill(player,enemy,world,performance.now()/1000);
    onLegendaryEnemyKilled(player, enemy, world, log);
  }

  return true;
}

function normalizeVector(x, y) {
  const distance = Math.hypot(x, y) || 1;
  return {
    x: x / distance,
    y: y / distance
  };
}

function gravecallerLifestealBonus(player,bonuses=getSkillTreeBonuses(player)){
 const bloodlineLifesteal=getPlayerBloodlineId(player)==='vampire'?getSkillTreeNodesByTree('vampire').reduce((sum,node)=>
   sum+Number(node.bonuses?.lifestealPct||0)*Math.max(0,Math.floor(player.skillTree?.spent?.[node.id]||0)),0):0;
 return Number(bonuses.gravecallerLifestealPct||0)+bloodlineLifesteal+Number(getBloodlineCombatModifiers(player).lifestealPct||0)+
  Number(getEquipmentStatBonuses(player).lifesteal||0)*100+getLegendaryLifestealPct(player);
}
export function calculateAbilityDamage(player, ability) {
  const bonuses = getSkillTreeBonuses(player), bloodline = getBloodlineCombatModifiers(player);
  const base = Number(ability.damage || 6) + equipmentCombatPower(player) * .52;
  return Math.max(1, Math.round(base * (ability.damageMultiplier || 1) * (ability.hellSkill||ability.hunterMorph?hellstalkerDamageInvestment(ability,bonuses):1) * getAbilityEffectiveness(player,ability) *
    (ability.classId==='fellhunter'?fellhunterAbilityPower(player):progressionPower(player,ability.skill)) * (1 + Math.max(0,bonuses.abilityDamagePct || 0)/100) *
    (ability.bloodline ? 1 + Number(bloodline.abilityDamagePct || 0)/100 : 1)));
}

function getSafeAimDirection(player, input = null) {
  const safeInput = input || buildFallbackInputFromPlayer(player);
  if(safeInput.rightStickActive || safeInput.mouseAimActive || Math.hypot(safeInput.rightStickAimX||0,safeInput.rightStickAimY||0)>.28) {
    const aim=resolveActorCombatAim(player,safeInput);
    player.dirX=aim.x;player.dirY=aim.y;
    return {x:aim.x,y:aim.y};
  }
  const explicitAim = normalizeAimVector(safeInput?.combatAimX, safeInput?.combatAimY);

  if (explicitAim.active) {
    player.dirX = explicitAim.x;
    player.dirY = explicitAim.y;
    return {
      x: explicitAim.x,
      y: explicitAim.y
    };
  }

  let aim;

  try {
    aim = getAimDirection(player, safeInput);
  } catch {
    aim = null;
  }

  if (!aim || !Number.isFinite(aim.x) || !Number.isFinite(aim.y)) {
    const dx = safeInput.mouseWorldX - player.x;
    const dy = safeInput.mouseWorldY - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0.001) {
      return {
        x: dx / distance,
        y: dy / distance
      };
    }

    const fallbackX = Number.isFinite(Number(player?.dirX)) ? Number(player.dirX) : 0;
    const fallbackY = Number.isFinite(Number(player?.dirY)) ? Number(player.dirY) : 1;
    const fallbackDistance = Math.hypot(fallbackX, fallbackY);

    if (fallbackDistance > 0.001) {
      return {
        x: fallbackX / fallbackDistance,
        y: fallbackY / fallbackDistance
      };
    }

    return {
      x: 0,
      y: 1
    };
  }

  const distance = Math.hypot(aim.x, aim.y) || 1;

  const resolved = {
    x: aim.x / distance,
    y: aim.y / distance
  };

  player.dirX = resolved.x;
  player.dirY = resolved.y;
  return resolved;
}

// -----------------------------------------------------------------------------
// ABILITY OVERRIDE HELPERS
// -----------------------------------------------------------------------------

function isNecroticBoltAbility(ability) {
  return matchesAbility(ability, Q_ABILITY_OVERRIDES.graveSpark.aliases);
}

function isVineWhipAbility(ability) {
  return matchesAbility(ability, Q_ABILITY_OVERRIDES.vineWhip.aliases);
}

function matchesAbility(ability, aliases) {
  if (!ability) return false;

  const id = String(ability.id || '').toLowerCase();
  const name = String(ability.name || '').toLowerCase();

  return aliases.some(alias => {
    const key = String(alias).toLowerCase();
    return id === key || name === key || id.includes(key) || name.includes(key);
  });
}

function getQOverride(ability) {
  if(ability?.subclassId)return null;
  if (isNecroticBoltAbility(ability)) return Q_ABILITY_OVERRIDES.graveSpark;
  if (isVineWhipAbility(ability)) return Q_ABILITY_OVERRIDES.vineWhip;
  return null;
}

function getEffectiveAbilityCooldown(ability) {
  if (ability.channelProfile) return 0;
  if (ability._combatTempo) return ability.cd || 0;
  const override = getQOverride(ability);
  return applyCombatTempo({...ability,cd:override?.cd ?? ability.cd ?? 0}).cd || 0;
}

function getEffectiveAbilityCost(ability) {
  if (ability?._mastery) return ability.cost ?? 0;
  if (ability?._charge) return ability.cost ?? 0;
  const override = getQOverride(ability);
  return override?.cost ?? ability.cost ?? 0;
}

function getEffectiveAbilityCostType(ability) {
  const override = getQOverride(ability);
  return override?.costType ?? ability.costType ?? 'stamina';
}

function ensureClassSpiritAvailable(player, ability) {
  const classSpiritAbility =
    isNecroticBoltAbility(ability) ||
    isVineWhipAbility(ability) ||
    ability?.costType === 'spirit' ||
    ability?.skill === 'spirit' ||
    ability?.id === 'wildBloom';

  if (!classSpiritAbility || !ability?.classId) return;

  if (player.classId && !player.spiritAwakened) {
    player.spiritAwakened = true;
    player.maxSpirit = Math.max(player.maxSpirit || 0, 35);
    player.spirit = Math.max(player.spirit || 0, Math.min(player.maxSpirit, 24));
  }

  if (player.classId && player.maxSpirit <= 0) {
    player.maxSpirit = 35;
    player.spirit = Math.max(player.spirit || 0, 24);
  }
}

function ensureAbilityProjectileState(player) {
  player.abilityProjectiles = Array.isArray(player.abilityProjectiles)
    ? player.abilityProjectiles
    : [];
}

function spawnWorldEffect(world, effect) {
  if (!world) return;

  world.effects = world.effects || [];

  world.effects.push({
    age: 0,
    ...effect
  });

  if (world.effects.length > 180) {
    world.effects.splice(0, world.effects.length - 180);
  }
}

// -----------------------------------------------------------------------------
// FALLBACK / SMALL HELPERS
// -----------------------------------------------------------------------------

function buildFallbackInputFromPlayer(player) {
  const rawDirX = Number(player?.dirX);
  const rawDirY = Number(player?.dirY);
  const dirX = Number.isFinite(rawDirX) ? rawDirX : 0;
  const dirY = Number.isFinite(rawDirY) ? rawDirY : 1;
  const directionLength = Math.hypot(dirX, dirY);
  const fallbackX = directionLength > 0.001 ? dirX / directionLength : 0;
  const fallbackY = directionLength > 0.001 ? dirY / directionLength : 1;

  return {
    mouseWorldX: player.x + fallbackX * 100,
    mouseWorldY: player.y + fallbackY * 100,
    moveX: fallbackX,
    moveY: fallbackY,
    attackPressed: false,
    attackHeld: false,
    attackReleased: false,
    sprintHeld: false,
    blockHeld: false,
    dashPressed: false
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function getSkillLevel(player, skillId) {
  return player?.skillState?.skills?.[skillId]?.level || 1;
}

function getPlayerCombatLevel(player) { return Math.max(1, player?.skillState?.combat?.level || player?.combatLevel || 1); }

function defaultEnemySpeed(enemy) {
  if (enemy.kind === 'ashWolf') return 82;
  if (enemy.kind === 'gravebound') return 46;
  if (enemy.kind === 'demonCultist') return 62;
  if (enemy.kind === 'roadlessBandit') return 66;
  if (enemy.kind === 'veyrWraith') return 54;
  return 58;
}

function defaultEnemyDamage(enemy) {
  if (enemy.kind === 'ashWolf') return 7;
  if (enemy.kind === 'gravebound') return 10;
  if (enemy.kind === 'demonCultist') return 9;
  if (enemy.kind === 'roadlessBandit') return 8;
  if (enemy.kind === 'veyrWraith') return 12;
  return 5;
}

function defaultEnemyXp(enemy) {
  if (enemy.kind === 'ashWolf') return 16;
  if (enemy.kind === 'gravebound') return 24;
  if (enemy.kind === 'demonCultist') return 28;
  if (enemy.kind === 'roadlessBandit') return 20;
  if (enemy.kind === 'veyrWraith') return 34;
  return 10;
}

function summonName(kind) {
  if (kind === 'lich') return 'Lich';
  if (kind === 'thornbeast') return 'Thornbeast';
  if (kind === 'eldritchHorror') return 'Eldritch Horror';
  return 'Summon';
}

function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'oathkeeper' || skillId === 'templar') return 'Oathkeeper';
  if (skillId === 'fellhunter' || skillId === 'mercenary') return 'Fellhunter';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'hydromancy') return 'Hydromancy';
  if (skillId === 'lightbringer') return 'Lightbringer';
  if (skillId === 'eldritch') return 'Eldritch';
  if (skillId === 'defence') return 'Defence';
  if (skillId === 'hitpoints') return 'Hitpoints';
  if (skillId === 'stamina') return 'Stamina';
  return String(skillId || 'Unknown');
}

function getItemFloatingColor(itemId) {
  const rarity = ITEMS[itemId]?.rarity;

  if (rarity === 'common') return '#d9ad4f';
  if (rarity === 'uncommon') return '#73d18a';
  if (rarity === 'rare') return '#6fa8ef';
  if (rarity === 'occult') return '#b68cff';
  if (rarity === 'relic') return '#d9ad4f';
  if (rarity === 'legendary') return '#ffcc66';
  if (rarity === 'mythic') return '#ff7ac8';
  if (rarity === 'ancient') return '#66f0ff';

  return '#d9ad4f';
}

// -----------------------------------------------------------------------------
// RENDER HELPERS FOR render.js
// -----------------------------------------------------------------------------

export function getAttackVisual(player) {
  return getCurrentAttackVisual(player);
}

export function getCombatProjectiles(player) {
  const weaponProjectiles = getProjectiles(player) || [];

  const abilityProjectiles = Array.isArray(player.abilityProjectiles)
    ? player.abilityProjectiles.filter(projectile => projectile && projectile.alive !== false)
    : [];

  return [
    ...weaponProjectiles,
    ...abilityProjectiles
  ];
}

export function getPlayerMovementMultiplier(player) {
  return getMovementSpeedMultiplier(player) * getChannelMovementMultiplier(player) * getSubclassMovementMultiplier(player) * getEliteControlMultiplier(player) * (player.slowTimer>0&&!player.eliteFrost?.7:1);
}

export function getPlayerDashVelocity(player) {
  return getDashVelocity(player);
}

export function playerIsDashing(player) {
  return isDashing(player);
}

function resolveAbilitySourceName(name) {
  if(name==='Necrotic Bolt')return 'graveSpark';
  return ABILITIES.find(a=>a.name===name)?.id || null;
}
function combatTechniqueHooks(player,world,log,now,input=null,ability=null) {
  return {now,log,aim:getSafeAimDirection(player,input),power:ability?calculateAbilityDamage(player,ability):0,
    bonuses:()=>getSkillTreeBonuses(player),
    flow:()=>cycleHydromancerFlow(player,now),
    pay:a=>payAbilityCost(player,a),cooldown:a=>startAbilityCooldown(player,a,now),
    payResource:(type,amount)=>{if((player[type]||0)<amount)return false;player[type]-=amount;return true;},
    effect:fx=>{
      if(ability?.sunkenBase||fx.abilityId&&getSelectedAbilityMorph(player,fx.abilityId)==='sunken')fx={...fx,kind:'sunkenSkill',subclassId:'sunken'};
      spawnWorldEffect(world,fx);
    },audio:(event,a)=>playAbilityAudioEvent(event,a),
    summonMoveSpeed:speed=>getSummonMovementSpeed({speed},player),
    damage:(enemy,damage,skill,options)=>damageEnemyDirect(player,world,enemy,damage,skill,log,{now,sourceMorph:ability?.subclassId??getSelectedAbilityMorph(player,options?.sourceAbilityId)??'base',...options}),
    wound:(enemy,id,damage)=>applyVerdantWound(player,enemy,world,now,1,{sourceAbilityId:id,tickDamage:damage}),
    summon:(a,x,y,lifetime)=>{
      if((player.summons||[]).filter(s=>s.techniqueTemporary&&s.alive!==false).length>=6)return;
      const rules=getSummonRules(player,'lich','summonLich');
      const summon=createSummon(player,'lich',rules,0);
      Object.assign(summon,{x,y,sourceAbilityId:a.id,summonAbilityId:a.id,ownerId:player.profileId||player.id||player.slot||1,
        expiresAt:now+lifetime,legendaryTemporary:true,techniqueTemporary:true,summonMorph:a.subclassId||'base',displayName:'Death Echo',damage:Math.round(9*progressionPower(player,'summoning'))});
      player.summons.push(summon);
    }
  };
}

const combatPlayers = new WeakSet();
function ensureCombatPlayer(player) {
  if (!combatPlayers.has(player)) { migratePlayer(player); combatPlayers.add(player); }
}
