import {mitigateEliteHit} from './eliteEncounterSystem.js';
import {getOathVisualFamily} from './oathbladeProfiles.js';
import {onOathkeeperMeleeContact,onFellhunterWeaponContact} from './subclassCombat.js';
import {isGravecallerSustain,restoreGravecallerLifesteal} from './gravecallerSustain.js';
import {getBloodlineCombatModifiers} from './bloodlineSystem.js';
import {getEquipmentStatBonuses} from './setBonusSystem.js';
import {applyMythicalMeleeModifiers} from './mythicalEquipmentSystem.js';
import {getEquipmentTierBonus} from './equipmentProgressionSystem.js';
import { progressionPower, attributeHandling, equipmentDamageMultiplier } from './combatPower.js';
import { weaponProficiency } from './progressionProfiles.js';
import { getMeleeLightCombo } from './meleeLightCombos.js';
// combatMoves.js
// Runalis weapon moves, combos, aim direction, melee hitboxes, bow projectiles,
// weapon kill attribution, hit feedback, knockback, and stagger.
// This file does not handle sprint/dash/block stamina logic; that lives in combatActions.js.
//
// Updated:
// - Weapon kills now mark the responsible weapon skill.
// - The central death handler splits kill XP into weapon, Defence, and HP.
// - Summon/class scaling can now rely on the correct skill actually growing.
// - Keeps heavier hit feedback, knockback, stagger, combos, and projectiles.

import { ITEMS } from './data.js';

import {
  addFloatingText,
  addDamageText,
  addStaggerText
} from './floatingText.js';

import {
  spendStamina,
  canStartAttack
} from './combatActions.js';

import {
  getSkillTreeBonuses
} from './skillTreeSystem.js';

import {
  applyOutgoingClassPassiveDamage,
  onEnemyKilledByPlayer
} from './classPassives.js';

import {
  playSfx
} from './audioSystem.js';

import {
  isPassable,
  hasLineOfSight,
  moveActorWithCollision
} from './world.js';

import {
  applyLegendaryOutgoingDamage,
  getLegendaryLifestealPct,
  onLegendaryEnemyKilled
} from './legendarySystem.js';

import {
  normalizeAimVector
} from './combatAim.js';

import {
  IMPACT_EFFECT_PROFILES,
  recordEnemyDeathVisual,
  recordEnemyHitReaction,
  recordEnemyContactImpact,
  SOUND_EVENT_KEYS
} from './combatFeedbackProfiles.js';
import {
  recordEnemyCombatContribution
} from './combatProgression.js';

export const PRIMARY_WEAPON_SPIRIT_ON_HIT = 6;

const DEFAULT_COMBAT_STATE = {
  attacking: false,
  attackId: 0,
  attackTimer: 0,
  attackElapsed: 0,
  attackMove: null,
  attackDirX: 0,
  attackDirY: 1,
  attackLungeRemaining: 0,
  hitEnemyIds: [],

  comboIndex: 0,
  comboTimer: 0,
  comboQueued: false,
  comboQueuedHeavy: false,
  comboSequence: '',
  lightComboIndex: 0,
  lightComboWeaponKey: '',
  lightComboRecoveryUntil: 0,

  attackPressedLock: false,
  heavyChargeActive: false,
  heavyChargeTime: 0,
  heavyChargeReady: false,
  heavyChargeThreshold: 0.45,
  heavyChargeMaxHold: 1.05,
  heavyChargeAimX: 0,
  heavyChargeAimY: 1,
  heavyChargeWeaponKey: '',
  heavyChargeVisualTimer: 0,
  heavyChargeColor: '#ffcc66',
  projectileFiredForAttackId: null,
  hitStopTimer: 0,

  projectiles: []
};

const COMBO_RESET_TIME = 0.82;
const HEAVY_DEFAULTS = {
  threshold: 0.45,
  maxHold: 1.05,
  damageMultiplier: 1.7,
  staminaCostMultiplier: 2,
  durationMultiplier: 1.18,
  rangeMultiplier: 1.1,
  widthMultiplier: 1.12,
  knockbackMultiplier: 1.45,
  staggerBonus: 0.16,
  lungeDistance: 22
};

const HEAVY_WEAPON_PROFILES = {
  dagger: { threshold: 0.36, maxHold: 0.85, damageMultiplier: 1.55, staminaCostMultiplier: 1.65, durationMultiplier: 1.08, lungeDistance: 24, knockbackMultiplier: 1.25, staggerBonus: 0.1 },
  sword: { threshold: 0.43, maxHold: 1.0, damageMultiplier: 1.7, staminaCostMultiplier: 2.0, durationMultiplier: 1.16, lungeDistance: 24 },
  axe: { threshold: 0.5, maxHold: 1.1, damageMultiplier: 1.85, staminaCostMultiplier: 2.15, durationMultiplier: 1.24, lungeDistance: 20, rangeMultiplier: 1.12, knockbackMultiplier: 1.65, staggerBonus: 0.22 },
  mace: { threshold: 0.52, maxHold: 1.1, damageMultiplier: 1.82, staminaCostMultiplier: 2.15, durationMultiplier: 1.24, lungeDistance: 18, rangeMultiplier: 1.08, knockbackMultiplier: 1.75, staggerBonus: 0.25 },
  hammer: { threshold: 0.55, maxHold: 1.15, damageMultiplier: 1.92, staminaCostMultiplier: 2.3, durationMultiplier: 1.3, lungeDistance: 17, rangeMultiplier: 1.1, knockbackMultiplier: 1.9, staggerBonus: 0.32 },
  spear: { threshold: 0.43, maxHold: 1.0, damageMultiplier: 1.65, staminaCostMultiplier: 1.95, durationMultiplier: 1.14, rangeMultiplier: 1.18, widthMultiplier: 1.08, lungeDistance: 28, knockbackMultiplier: 1.35, staggerBonus: 0.13 },
  staff: { threshold: 0.46, maxHold: 1.05, damageMultiplier: 1.62, staminaCostMultiplier: 1.95, durationMultiplier: 1.18, rangeMultiplier: 1.12, lungeDistance: 18, knockbackMultiplier: 1.45, staggerBonus: 0.18 },
  bow: { threshold: 0.5, maxHold: 1.1, damageMultiplier: 1.75, staminaCostMultiplier: 2.05, durationMultiplier: 1.2, rangeMultiplier: 1.14, widthMultiplier: 1.18, lungeDistance: 9, knockbackMultiplier: 1.45, staggerBonus: 0.16 },
  crossbow: { threshold: 0.52, maxHold: 1.15, damageMultiplier: 1.85, staminaCostMultiplier: 2.2, durationMultiplier: 1.24, rangeMultiplier: 1.16, widthMultiplier: 1.2, lungeDistance: 8, knockbackMultiplier: 1.55, staggerBonus: 0.2 },
  scythe: { threshold: 0.5, maxHold: 1.08, damageMultiplier: 1.78, staminaCostMultiplier: 2.1, durationMultiplier: 1.2, rangeMultiplier: 1.14, lungeDistance: 22, knockbackMultiplier: 1.55, staggerBonus: 0.2 },
  spiritFocus: { threshold: 0.5, maxHold: 1.08, damageMultiplier: 1.68, staminaCostMultiplier: 2.05, durationMultiplier: 1.16, rangeMultiplier: 1.12, widthMultiplier: 1.16, lungeDistance: 10, knockbackMultiplier: 1.35, staggerBonus: 0.16 },
  eldritch: { threshold: 0.48, maxHold: 1.05, damageMultiplier: 1.62, staminaCostMultiplier: 1.9, durationMultiplier: 1.14, rangeMultiplier: 1.08, widthMultiplier: 1.12, lungeDistance: 10, knockbackMultiplier: 1.3, staggerBonus: 0.14 },
  unarmed: { threshold: 0.4, maxHold: 0.92, damageMultiplier: 1.45, staminaCostMultiplier: 1.55, durationMultiplier: 1.1, rangeMultiplier: 1.08, lungeDistance: 16, knockbackMultiplier: 1.25, staggerBonus: 0.08 }
};

const WEAPON_MOVESET_ALIASES = {
  dagger: 'sword',
  axe: 'sword',
  mace: 'staff',
  hammer: 'staff',
  spear: 'staff',
  crossbow: 'bow'
};

// XP should be meaningful but slow.
// This is kill-based, so the values can be higher than per-hit XP without exploding.
export const WEAPON_MOVESETS = {
  sword: {
    skill: 'blade',
    moves: [
      {
        id: 'sword_light_1',
        name: 'Sword Light I',
        kind: 'arc',
        comboType: 'light',
        duration: 0.34,
        startup: 0.07,
        activeStart: 0.08,
        activeEnd: 0.18,
        recovery: 0.16,
        staminaCost: 6,
        range: 48,
        arcDegrees: 78,
        damageMultiplier: 1.0,
        knockback: 20,
        stagger: 0.08,
        impact: 'slash',
        unlockLevel: 1
      },
      {
        id: 'sword_light_2',
        name: 'Sword Light II',
        kind: 'arc',
        comboType: 'light',
        duration: 0.37,
        startup: 0.07,
        activeStart: 0.08,
        activeEnd: 0.21,
        recovery: 0.16,
        staminaCost: 7,
        range: 52,
        arcDegrees: 88,
        damageMultiplier: 1.16,
        knockback: 24,
        stagger: 0.10,
        impact: 'slash',
        unlockLevel: 5
      },
      {
        id: 'sword_heavy_3',
        name: 'Sword Heavy',
        kind: 'arc',
        comboType: 'heavy',
        duration: 0.58,
        startup: 0.15,
        activeStart: 0.16,
        activeEnd: 0.33,
        recovery: 0.25,
        staminaCost: 14,
        range: 61,
        arcDegrees: 104,
        damageMultiplier: 1.78,
        knockback: 48,
        stagger: 0.32,
        impact: 'heavySlash',
        unlockLevel: 10
      }
    ]
  },

  scythe: {
    skill: 'scythe',
    moves: [
      {
        id: 'scythe_wide_1',
        name: 'Wide Reap',
        kind: 'arc',
        comboType: 'light',
        duration: 0.45,
        startup: 0.10,
        activeStart: 0.11,
        activeEnd: 0.28,
        recovery: 0.17,
        staminaCost: 8,
        range: 66,
        arcDegrees: 124,
        damageMultiplier: 1.08,
        knockback: 24,
        stagger: 0.10,
        impact: 'spiritSlash',
        unlockLevel: 1
      },
      {
        id: 'scythe_hook_2',
        name: 'Hook Slash',
        kind: 'arc',
        comboType: 'light',
        duration: 0.49,
        startup: 0.10,
        activeStart: 0.11,
        activeEnd: 0.29,
        recovery: 0.20,
        staminaCost: 9,
        range: 62,
        arcDegrees: 98,
        damageMultiplier: 1.28,
        knockback: 34,
        stagger: 0.14,
        impact: 'spiritSlash',
        unlockLevel: 5
      },
      {
        id: 'scythe_reap_3',
        name: 'Reaping Heavy',
        kind: 'arc',
        comboType: 'heavy',
        duration: 0.68,
        startup: 0.18,
        activeStart: 0.19,
        activeEnd: 0.40,
        recovery: 0.28,
        staminaCost: 17,
        range: 76,
        arcDegrees: 140,
        damageMultiplier: 1.95,
        knockback: 56,
        stagger: 0.40,
        impact: 'heavySpiritSlash',
        lifedrainRatio: 0.05,
        unlockLevel: 10
      }
    ]
  },

  staff: {
    skill: 'warding',
    moves: [
      {
        id: 'staff_swing_1',
        name: 'Staff Swing',
        kind: 'arc',
        comboType: 'light',
        duration: 0.40,
        startup: 0.11,
        activeStart: 0.12,
        activeEnd: 0.26,
        recovery: 0.14,
        staminaCost: 5,
        range: 58,
        arcDegrees: 100,
        damageMultiplier: 0.92,
        knockback: 20,
        stagger: 0.10,
        impact: 'staffHit',
        unlockLevel: 1
      },
      {
        id: 'staff_sweep_2',
        name: 'Staff Sweep',
        kind: 'arc',
        comboType: 'light',
        duration: 0.43,
        startup: 0.09,
        activeStart: 0.10,
        activeEnd: 0.26,
        recovery: 0.17,
        staminaCost: 8,
        range: 57,
        arcDegrees: 118,
        damageMultiplier: 1.08,
        knockback: 30,
        stagger: 0.18,
        impact: 'staffHit',
        unlockLevel: 5
      },
      {
        id: 'staff_slam_3',
        name: 'Staff Slam',
        kind: 'circle',
        comboType: 'heavy',
        duration: 0.62,
        startup: 0.17,
        activeStart: 0.18,
        activeEnd: 0.35,
        recovery: 0.27,
        staminaCost: 15,
        range: 50,
        radius: 45,
        damageMultiplier: 1.6,
        knockback: 44,
        stagger: 0.42,
        impact: 'groundSlam',
        unlockLevel: 10
      }
    ]
  },

  bow: {
    skill: 'archery',
    moves: [
      {
        id: 'bow_shot_1',
        name: 'Arrow Shot',
        kind: 'projectile',
        comboType: 'shot',
        duration: 0.40,
        startup: 0.10,
        activeStart: 0.11,
        activeEnd: 0.14,
        recovery: 0.26,
        staminaCost: 7,
        projectileSpeed: 410,
        projectileRange: 280,
        projectileRadius: 8,
        damageMultiplier: 1.0,
        knockback: 16,
        stagger: 0.08,
        impact: 'arrowHit',
        unlockLevel: 1
      },
      {
        id: 'bow_fast_2',
        name: 'Follow-Up Shot',
        kind: 'projectile',
        comboType: 'shot',
        duration: 0.36,
        startup: 0.08,
        activeStart: 0.09,
        activeEnd: 0.12,
        recovery: 0.24,
        staminaCost: 8,
        projectileSpeed: 455,
        projectileRange: 305,
        projectileRadius: 8,
        damageMultiplier: 1.12,
        knockback: 18,
        stagger: 0.10,
        impact: 'arrowHit',
        unlockLevel: 5
      },
      {
        id: 'bow_power_3',
        name: 'Power Shot',
        kind: 'projectile',
        comboType: 'heavy',
        duration: 0.61,
        startup: 0.19,
        activeStart: 0.20,
        activeEnd: 0.25,
        recovery: 0.36,
        staminaCost: 16,
        projectileSpeed: 535,
        projectileRange: 370,
        projectileRadius: 10,
        damageMultiplier: 1.82,
        knockback: 46,
        stagger: 0.36,
        impact: 'powerArrowHit',
        pierce: 1,
        unlockLevel: 10
      }
    ]
  },

  spiritFocus: {
    skill: 'spirit',
    moves: [
      {
        id: 'spirit_focus_bolt_1',
        name: 'Focus Bolt',
        kind: 'projectile',
        comboType: 'focus',
        duration: 0.38,
        startup: 0.08,
        activeStart: 0.09,
        activeEnd: 0.13,
        recovery: 0.25,
        staminaCost: 8,
        projectileKind: 'focusBolt',
        visualProfile: 'focusBolt',
        projectileSpeed: 430,
        projectileRange: 270,
        projectileRadius: 8,
        damageMultiplier: 0.92,
        knockback: 12,
        stagger: 0.07,
        impact: 'focusBoltHit',
        unlockLevel: 1
      },
      {
        id: 'spirit_focus_pulse_2',
        name: 'Focused Pulse',
        kind: 'projectile',
        comboType: 'focus',
        duration: 0.40,
        startup: 0.09,
        activeStart: 0.10,
        activeEnd: 0.14,
        recovery: 0.26,
        staminaCost: 9,
        projectileKind: 'focusPulse',
        visualProfile: 'focusBolt',
        projectileSpeed: 470,
        projectileRange: 295,
        projectileRadius: 9,
        damageMultiplier: 1.08,
        knockback: 16,
        stagger: 0.10,
        impact: 'focusBoltHit',
        unlockLevel: 5
      },
      {
        id: 'spirit_focus_lance_3',
        name: 'Prism Lance',
        kind: 'projectile',
        comboType: 'heavy',
        duration: 0.58,
        startup: 0.16,
        activeStart: 0.17,
        activeEnd: 0.23,
        recovery: 0.35,
        staminaCost: 15,
        projectileKind: 'focusLance',
        visualProfile: 'focusLance',
        projectileSpeed: 540,
        projectileRange: 345,
        projectileRadius: 10,
        damageMultiplier: 1.58,
        knockback: 34,
        stagger: 0.28,
        impact: 'focusBoltHit',
        pierce: 1,
        unlockLevel: 10
      }
    ]
  },

  eldritch: {
    skill: 'spirit',
    moves: [
      {
        id: 'eldritch_beam_1',
        name: 'Starless Beam',
        kind: 'line',
        comboType: 'channel',
        duration: 0.46,
        startup: 0.03,
        activeStart: 0.04,
        activeEnd: 0.39,
        recovery: 0.07,
        staminaCost: 4,
        range: 210,
        width: 22,
        damageMultiplier: 1.02,
        knockback: 9,
        stagger: 0.08,
        impact: 'eldritchBeam',
        unlockLevel: 1
      },
      {
        id: 'eldritch_beam_2',
        name: 'Forked Starless Beam',
        kind: 'line',
        comboType: 'channel',
        duration: 0.50,
        startup: 0.03,
        activeStart: 0.04,
        activeEnd: 0.42,
        recovery: 0.08,
        staminaCost: 5,
        range: 235,
        width: 26,
        damageMultiplier: 1.18,
        knockback: 13,
        stagger: 0.12,
        impact: 'eldritchBeam',
        unlockLevel: 5
      },
      {
        id: 'eldritch_beam_3',
        name: 'World-Splitting Beam',
        kind: 'line',
        comboType: 'heavy',
        duration: 0.64,
        startup: 0.05,
        activeStart: 0.06,
        activeEnd: 0.52,
        recovery: 0.12,
        staminaCost: 8,
        range: 275,
        width: 34,
        damageMultiplier: 1.55,
        knockback: 28,
        stagger: 0.28,
        impact: 'eldritchBeam',
        unlockLevel: 10
      }
    ]
  },

  unarmed: {
    skill: 'blade',
    moves: [
      {
        id: 'unarmed_swing_1',
        name: 'Basic Swing',
        kind: 'arc',
        comboType: 'light',
        duration: 0.31,
        startup: 0.07,
        activeStart: 0.08,
        activeEnd: 0.17,
        recovery: 0.14,
        staminaCost: 3,
        range: 34,
        arcDegrees: 64,
        damageMultiplier: 0.65,
        knockback: 12,
        stagger: 0.06,
        impact: 'punch',
        unlockLevel: 1
      }
    ]
  }
};

export const COMBAT_TIMING_BASELINE = Object.fromEntries(Object.entries(WEAPON_MOVESETS).map(([id,set])=>[id,set.moves.map(m=>({id:m.id,duration:m.duration,startup:m.startup,activeStart:m.activeStart,activeEnd:m.activeEnd,recovery:m.recovery}))]));
for (const set of Object.values(WEAPON_MOVESETS)) for (const move of set.moves) {
  const tell = move.comboType==='heavy' ? .80 : .70;
  const active = .82, recover = move.comboType==='heavy' ? .70 : .62;
  const activeDuration = (move.activeEnd-move.activeStart)*active;
  move.startup *= tell; move.activeStart *= tell;
  move.activeEnd = move.activeStart + activeDuration;
  move.recovery *= recover; move.duration = move.activeEnd+move.recovery;
}
for (const profile of [HEAVY_DEFAULTS,...Object.values(HEAVY_WEAPON_PROFILES)]) {
  profile.threshold *= .72; profile.maxHold *= .72;
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function ensureCombatState(player) {
  if (!player.combatState) {
    player.combatState = cloneDefaultCombatState();
  }

  for (const [key, value] of Object.entries(DEFAULT_COMBAT_STATE)) {
    if (player.combatState[key] === undefined) {
      player.combatState[key] = Array.isArray(value) ? [...value] : value;
    }
  }

  if (!Array.isArray(player.combatState.projectiles)) {
    player.combatState.projectiles = [];
  }

  return player.combatState;
}

export function requestBasicAttack(player, world, input, log, now) {
  return requestWeaponAttack(player, world, input, log, now, { heavy: false });
}

export function requestHeavyAttack(player, world, input, log, now) {
  return requestWeaponAttack(player, world, input, log, now, { heavy: true });
}

export function updateBasicAttackInput(player, world, input, dt, now, log) {
  const state = ensureCombatState(player);
  const pressed = consumeAttackPressed(input);
  const released = consumeAttackReleased(input);
  const held = !!input?.attackHeld;

  if (!player || Number(player.hp ?? 1) <= 0 || input?.suppressAttackInput) {
    cancelHeavyAttackCharge(player, world);
    return false;
  }

  if (inputHasAbilityIntent(input) && state.heavyChargeActive) {
    cancelHeavyAttackCharge(player, world);
    return false;
  }

  if (!canStartAttack(player)) {
    cancelHeavyAttackCharge(player, world);
    return false;
  }

  if (state.attacking) {
    if (pressed && canQueueCombo(state)) {
      state.comboQueued = true; state.comboQueuedHeavy = false;
    }
    if (state.comboQueued && held) {
      state.bufferHold=(state.bufferHold||0)+dt;
      if(state.bufferHold>=.24)state.comboQueuedHeavy=true;
    } else state.bufferHold=0;
    return false;
  }

  // Finisher recovery cannot be skipped by fresh presses or weapon swaps.
  if (now < state.lightComboRecoveryUntil) return false;

  let acted = false;

  if (pressed && !state.heavyChargeActive) {
    beginHeavyAttackCharge(player, world, input, now);

    if (!held) {
      acted = releaseHeavyAttackCharge(player, world, input, log, now, { forceNormal: true }) || acted;
    }
  }

  if (state.heavyChargeActive) {
    const weaponKey = getWeaponChargeKey(player);
    if (weaponKey !== state.heavyChargeWeaponKey) {
      cancelHeavyAttackCharge(player, world);
      return acted;
    }

    if (held) {
      updateHeavyAttackCharge(player, world, input, dt);

      if (state.heavyChargeTime >= state.heavyChargeMaxHold) {
        acted = releaseHeavyAttackCharge(player, world, input, log, now, { forceHeavy: true }) || acted;
      }
    } else if (released || state.heavyChargeTime > 0) {
      acted = releaseHeavyAttackCharge(player, world, input, log, now) || acted;
    }
  }

  return acted;
}

export function cancelHeavyAttackCharge(player, world = null) {
  const state = ensureCombatState(player);

  if (!state.heavyChargeActive) return false;

  const x = Number(player?.x || 0);
  const y = Number(player?.y || 0);
  const dirX = Number(state.heavyChargeAimX || player?.dirX || 0);
  const dirY = Number(state.heavyChargeAimY || player?.dirY || 1);
  const ready = !!state.heavyChargeReady;

  resetHeavyChargeState(state);

  if (world && ready) {
    spawnWorldEffect(world, {
      kind: 'weaponWindup',
      layer: 'behind',
      x,
      y: y - 8,
      ttl: 0.1,
      radius: 20,
      color: '#8f98a8',
      dirX,
      dirY
    });
  }

  return true;
}

function requestWeaponAttack(player, world, input, log, now, options = {}) {
  const state = ensureCombatState(player);
  const heavyRequested = !!options.heavy;

  if (!canStartAttack(player)) return false;

  if (state.attacking) {
    if (canQueueCombo(state)) {
      state.comboQueued = true; state.comboQueuedHeavy = heavyRequested;
    }

    return false;
  }

  if (now < state.lightComboRecoveryUntil) return false;

  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const moveset = getMovesetForWeaponType(weaponType);
  const skillLevel = getSkillLevel(player, moveset.skill);
  const lightCombo = getMeleeLightCombo(weaponType);
  const weaponKey = getWeaponChargeKey(player);
  if (state.lightComboWeaponKey && state.lightComboWeaponKey !== weaponKey) {
    state.comboSequence = '';
    state.comboIndex = 0;
  }
  if (state.lightComboWeaponKey !== weaponKey || state.comboTimer <= 0) state.lightComboIndex = 0;

  const baseMove = heavyRequested
    ? selectUniversalHeavySourceMove(moveset, skillLevel)
    : lightCombo?.moves[state.lightComboIndex] || selectComboMove(state, moveset, skillLevel);

  if (!baseMove) {
    log?.('No usable attack move.');
    return false;
  }

  if (state.comboTimer <= 0) state.comboSequence = '';
  const sequence = (state.comboSequence || '') + (heavyRequested ? 'H' : 'L');
  const modifiedBaseMove = applyWeaponMoveModifiers(player, baseMove, weapon, weaponType);
  let move = heavyRequested ? buildUniversalHeavyMove(player, modifiedBaseMove, weapon, weaponType) : modifiedBaseMove;
  move = applyMythicalMeleeModifiers(player,applyCombinationFinisher(move,weaponType,sequence),weaponType);

  if (!spendStamina(player, move.staminaCost, 0.5)) {
    log?.(heavyRequested ? 'Not enough stamina for a heavy attack.' : 'Not enough stamina to attack.');
    return false;
  }
  state.comboSequence = sequence.length>=3 ? '' : sequence;
  state.comboTimer=COMBO_RESET_TIME;

  const aim = getAimDirection(player, input);

  state.attacking = true;
  state.attackId += 1;
  const speedMultiplier = getAttackSpeedMultiplier(player);

  state.attackTimer = move.duration / speedMultiplier;
  state.attackElapsed = 0;
  state.attackMove = scaleMoveTiming(move, speedMultiplier);
  state.lightComboWeaponKey = weaponKey;
  if (move.lightCombo && move.finisher) {
    state.lightComboRecoveryUntil = now + state.attackMove.duration + move.comboRestartDelay;
  }
  state.attackDirX = aim.x;
  state.attackDirY = aim.y;
  state.attackLungeRemaining = Math.max(0, Number(state.attackMove.lungeDistance || 0));
  state.hitEnemyIds = [];
  state.comboQueued = false;
  state.projectileFiredForAttackId = null;
  resetHeavyChargeState(state);

  player.dirX = aim.x;
  player.dirY = aim.y;

  playSfx(['mace','hammer'].includes(weaponType)?'bluntLift':weaponType === 'spiritFocus' ? SOUND_EVENT_KEYS.SPELL_RELEASE : move.kind === 'projectile' ? 'bow' : 'attack', {
    volume: move.comboType === 'heavy' ? 1 : 0.82,
    throttle: 0.035
  });

  spawnAttackStartEffect(world, player, state.attackMove, state);
  if (move.comboType === 'heavy') {
    spawnHeavyAttackReleaseEffect(world, player, state.attackMove, state);
  }

  return true;
}

export function updateWeaponCombat(player, world, input, dt, now, log) {
  const state = ensureCombatState(player);

  updateComboTimer(state, dt);
  updateProjectiles(player, world, dt, log);

  if (state.hitStopTimer > 0) {
    state.hitStopTimer = Math.max(0, state.hitStopTimer - dt);
    return;
  }

  if (!state.attacking) {
    return;
  }

  const move = state.attackMove;

  const previousElapsed = state.attackElapsed;
  state.attackElapsed += dt;
  state.attackTimer -= dt;

  if(previousElapsed<move.activeStart&&state.attackElapsed>=move.activeStart&&['mace','hammer'].includes(getWeaponTypeFromPlayer(player)))
    playSfx('bluntSwing',{heavy:move.comboType==='heavy'||move.finisher,volume:.65,throttle:.05});

  updateAttackLunge(player, world, move, state, dt);

  if (previousElapsed <= move.activeEnd && state.attackElapsed >= move.activeStart) {
    if (move.kind === 'projectile') {
      maybeFireProjectile(player, move, state, world);
    } else {
      resolveMeleeHitbox(player, world, move, state, log);
    }
  }

  if (state.attackTimer <= 0) {
    finishAttack(player, world, input, now, log);
  }
}

export function consumeAttackPressed(input) {
  if (!input) return false;

  if (input.attackPressed) {
    input.attackPressed = false;
    return true;
  }

  return false;
}

export function consumeAttackReleased(input) {
  if (!input) return false;

  if (input.attackReleased) {
    input.attackReleased = false;
    return true;
  }

  return false;
}

export function getCurrentAttackVisual(player) {
  const state = ensureCombatState(player);

  if (!state.attacking || !state.attackMove) {
    return null;
  }

  return {
    move: state.attackMove,
    elapsed: state.attackElapsed,
    duration: state.attackMove.duration,
    dirX: state.attackDirX,
    dirY: state.attackDirY,
    active: isMoveActive(state.attackMove, state.attackElapsed),
    weaponType: getWeaponType(getEquippedWeapon(player))
  };
}

export function getProjectiles(player) {
  const state = ensureCombatState(player);
  return state.projectiles || [];
}

export function getWeaponTypeFromPlayer(player) {
  return getWeaponType(getEquippedWeapon(player));
}

// -----------------------------------------------------------------------------
// ATTACK FLOW
// -----------------------------------------------------------------------------

function beginHeavyAttackCharge(player, world, input, now) {
  const state = ensureCombatState(player);
  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const profile = getHeavyAttackProfile(weaponType, weapon);
  const aim = getAimDirection(player, input);
  const previewMove = getUniversalHeavyPreviewMove(player, weapon, weaponType);

  state.heavyChargeActive = true;
  state.heavyChargeTime = 0;
  state.heavyChargeReady = false;
  state.heavyChargeThreshold = profile.threshold;
  state.heavyChargeMaxHold = profile.maxHold;
  state.heavyChargeAimX = aim.x;
  state.heavyChargeAimY = aim.y;
  state.heavyChargeWeaponKey = getWeaponChargeKey(player);
  state.heavyChargeVisualTimer = 0;
  state.heavyChargeColor = getMoveEffectColor(previewMove);
  state.comboQueued = false;

  player.dirX = aim.x;
  player.dirY = aim.y;

  spawnHeavyChargeEffect(world, player, state, { ready: false, ttl: 0.12, radius: 18 });
}

function updateHeavyAttackCharge(player, world, input, dt) {
  const state = ensureCombatState(player);
  const safeDt = Math.max(0, Number(dt || 0));
  const aim = getAimDirection(player, input);

  state.heavyChargeTime = Math.max(0, Number(state.heavyChargeTime || 0)) + safeDt;
  state.heavyChargeAimX = aim.x;
  state.heavyChargeAimY = aim.y;
  player.dirX = aim.x;
  player.dirY = aim.y;

  const wasReady = !!state.heavyChargeReady;
  state.heavyChargeReady = state.heavyChargeTime >= state.heavyChargeThreshold;
  state.heavyChargeVisualTimer = Math.max(0, Number(state.heavyChargeVisualTimer || 0) - safeDt);

  if (state.heavyChargeReady && !wasReady) {
    spawnHeavyChargeEffect(world, player, state, { ready: true, ttl: 0.18, radius: 30 });
    state.heavyChargeVisualTimer = 0.14;
    return;
  }

  if (state.heavyChargeVisualTimer <= 0) {
    const progress = Math.min(1, state.heavyChargeTime / Math.max(0.001, state.heavyChargeThreshold));
    spawnHeavyChargeEffect(world, player, state, {
      ready: state.heavyChargeReady,
      ttl: state.heavyChargeReady ? 0.16 : 0.1,
      radius: 18 + progress * 14
    });
    state.heavyChargeVisualTimer = state.heavyChargeReady ? 0.16 : 0.2;
  }
}

function releaseHeavyAttackCharge(player, world, input, log, now, options = {}) {
  const state = ensureCombatState(player);
  if (!state.heavyChargeActive) return false;
  const aim = getAimDirection(player, input);
  state.heavyChargeAimX = aim.x;
  state.heavyChargeAimY = aim.y;

  const heavy = !options.forceNormal && (
    !!options.forceHeavy ||
    state.heavyChargeReady ||
    state.heavyChargeTime >= state.heavyChargeThreshold
  );
  const releaseInput = {
    ...(input || {}),
    combatAimX: state.heavyChargeAimX,
    combatAimY: state.heavyChargeAimY,
    mouseWorldX: Number(player?.x || 0) + state.heavyChargeAimX * 160,
    mouseWorldY: Number(player?.y || 0) + state.heavyChargeAimY * 160
  };

  resetHeavyChargeState(state);

  return heavy
    ? requestHeavyAttack(player, world, releaseInput, log, now)
    : requestBasicAttack(player, world, releaseInput, log, now);
}

function resetHeavyChargeState(state) {
  if (!state) return;

  state.heavyChargeActive = false;
  state.heavyChargeTime = 0;
  state.heavyChargeReady = false;
  state.heavyChargeThreshold = HEAVY_DEFAULTS.threshold;
  state.heavyChargeMaxHold = HEAVY_DEFAULTS.maxHold;
  state.heavyChargeAimX = 0;
  state.heavyChargeAimY = 1;
  state.heavyChargeWeaponKey = '';
  state.heavyChargeVisualTimer = 0;
  state.heavyChargeColor = '#ffcc66';
}

function inputHasAbilityIntent(input) {
  return !!(
    input?.ability0Pressed ||
    input?.ability1Pressed ||
    input?.ability2Pressed ||
    input?.ability3Pressed ||
    input?.ability4Pressed
  );
}

function finishAttack(player, world, input, now, log) {
  const state = ensureCombatState(player);
  const move = state.attackMove;
  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const moveset = getMovesetForWeaponType(weaponType);
  const skillLevel = getSkillLevel(player, moveset.skill);

  state.attacking = false;
  state.attackTimer = 0;
  state.attackElapsed = 0;
  state.attackMove = null;
  state.attackLungeRemaining = 0;
  state.hitEnemyIds = [];

  const queued = state.comboQueued, heavy = state.comboQueuedHeavy;
  state.comboQueued = false;
  state.comboQueuedHeavy = false;
  state.bufferHold = 0;
  if (move?.lightCombo) {
    state.lightComboIndex = move.lightComboStep % 3;
    state.comboTimer = COMBO_RESET_TIME;
    if (move.finisher) {
      state.lightComboIndex = 0;
      state.comboSequence = '';
      state.lightComboRecoveryUntil = Math.max(state.lightComboRecoveryUntil, now + move.comboRestartDelay);
      // Drop buffered taps at the end of the chain. Restart requires a fresh
      // press after the pause, rather than an indefinitely queued fourth hit.
      return;
    }
    if (queued) requestWeaponAttack(player,world,input,log,now,{heavy});
    return;
  }
  state.lightComboIndex = 0;
  if (queued) {
    state.comboIndex=(state.comboIndex+1)%Math.max(1,getUnlockedMoves(moveset,skillLevel).length);
    state.comboTimer=COMBO_RESET_TIME;state.comboQueued=false;state.comboQueuedHeavy=false;
    requestWeaponAttack(player,world,input,log,now,{heavy});
    return;
  }

  if (move) {
    state.comboIndex += 1;
    state.comboTimer = COMBO_RESET_TIME;

    if (!getNextUnlockedMove(state.comboIndex, moveset, skillLevel)) {
      state.comboIndex = 0;
    }
  }
}

export function applyCombinationFinisher(move,type,sequence) {
  if (sequence.length<3) return {...move,sequence};
  const heavyCount=[...sequence].filter(c=>c==='H').length;
  const result={...move,id:move.id+'_'+sequence,sequence,finisher:true,
    damageMultiplier:move.damageMultiplier*(1.10+heavyCount*.04),staminaCost:move.staminaCost+2,
    stagger:Math.min(.5,(move.stagger||0)+.06+heavyCount*.025)};
  if (['sword','scythe','axe'].includes(type)) result.arcDegrees=Math.min(165,(move.arcDegrees||70)+18);
  if (['dagger','spear'].includes(type)) result.lungeDistance=(move.lungeDistance||0)+12;
  if (['mace','hammer','staff'].includes(type)) result.knockback=(move.knockback||0)+14;
  if (['bow','crossbow','spiritFocus'].includes(type)) result.projectileSpeed=(move.projectileSpeed||300)*1.15;
  return result;
}

function canQueueCombo(state) {
  const move = state.attackMove;
  if (!move) return false;
  if (move.lightCombo && move.finisher) return false;

  const queueStart = move.lightCombo ? move.activeStart : Math.max(0,move.activeStart - .06);
  const queueEnd = move.duration;

  return state.attackElapsed >= queueStart && state.attackElapsed <= queueEnd;
}

function updateComboTimer(state, dt) {
  if (state.attacking) return;
  if (state.comboTimer <= 0) {
    state.comboIndex = 0;
    state.lightComboIndex = 0;
    state.comboSequence = '';
    state.comboQueued = false;
    return;
  }

  state.comboTimer -= dt;

  if (state.comboTimer <= 0) {
    state.comboIndex = 0;
    state.lightComboIndex = 0;
    state.comboSequence = '';
    state.comboQueued = false;
  }
}

function selectComboMove(state, moveset, skillLevel) {
  const moves = getUnlockedMoves(moveset, skillLevel);

  if (!moves.length) return null;

  if (state.comboTimer <= 0) {
    state.comboIndex = 0;
  }

  const index = Math.max(0, Math.min(state.comboIndex, moves.length - 1));
  return moves[index] || moves[0];
}

function getNextUnlockedMove(index, moveset, skillLevel) {
  const moves = getUnlockedMoves(moveset, skillLevel);
  return moves[index] || null;
}

function getUnlockedMoves(moveset, skillLevel) {
  return moveset.moves.filter(move => skillLevel >= (move.unlockLevel || 1));
}

function selectUniversalHeavySourceMove(moveset, skillLevel) {
  const moves = getUnlockedMoves(moveset, skillLevel);
  if (!moves.length) return null;

  return moves.find(move => move.comboType !== 'heavy' && move.comboType !== 'channel')
    || moves.find(move => move.comboType !== 'heavy')
    || moves[0];
}

function getMovesetForWeaponType(weaponType) {
  // Spears share the higher-level staff combos, but retain a thrust opener.
  if (weaponType === 'spear') return {
    ...WEAPON_MOVESETS.staff,
    moves: [{ ...WEAPON_MOVESETS.staff.moves[0], id:'spear_jab_1', name:'Spear Jab',
      kind:'line', duration:.33, startup:.06, activeStart:.07, activeEnd:.18,
      recovery:.15, range:68, width:24 }, ...WEAPON_MOVESETS.staff.moves.slice(1)]
  };
  if(['mace','hammer'].includes(weaponType))return {...WEAPON_MOVESETS.staff,skill:'blunt',moves:WEAPON_MOVESETS.staff.moves.map(move=>({...move,skill:'blunt'}))};
  return WEAPON_MOVESETS[weaponType]
    || WEAPON_MOVESETS[WEAPON_MOVESET_ALIASES[weaponType]]
    || WEAPON_MOVESETS.unarmed;
}

function getUniversalHeavyPreviewMove(player, weapon, weaponType) {
  const moveset = getMovesetForWeaponType(weaponType);
  const skillLevel = getSkillLevel(player, moveset.skill);
  const source = selectUniversalHeavySourceMove(moveset, skillLevel) || moveset.moves?.[0] || WEAPON_MOVESETS.unarmed.moves[0];
  const modifiedSource = applyWeaponMoveModifiers(player, source, weapon, weaponType);
  return buildUniversalHeavyMove(player, modifiedSource, weapon, weaponType);
}

function applyWeaponMoveModifiers(player, move, weapon, weaponType) {
  if (!move || weaponType !== 'spiritFocus') return move;

  const bonuses = getSkillTreeBonuses(player);
  const traits = Array.isArray(weapon?.traits) ? weapon.traits.map(trait => String(trait).toLowerCase()) : [];
  const modified = { ...move };

  const damagePct =
    Math.max(0, Number(bonuses.focusBoltDamagePct || 0)) +
    (traits.includes('radiant core') ? 10 : 0) +
    (traits.includes('sealbreaker') ? 6 : 0);
  const costReductionPct =
    Math.max(0, Number(bonuses.focusBoltCostReductionPct || 0)) +
    (traits.includes('stable lens') ? 8 : 0) +
    (traits.includes('warded frame') ? 8 : 0) +
    (traits.includes('spirit conductor') ? 4 : 0);
  const rangePct =
    Math.max(0, Number(bonuses.focusBoltRangePct || 0)) +
    Math.max(0, Number(weapon?.range || 0) > 0 ? 0 : 0);
  const speedPct =
    Math.max(0, Number(bonuses.focusBoltSpeedPct || 0)) +
    (Number(weapon?.projectileSpeed || 0) > 0 ? 0 : 0);
  const staggerPct = Math.max(0, Number(bonuses.focusStaggerPct || 0));
  const pierceChance =
    Math.max(0, Number(bonuses.focusBoltPierceChancePct || 0)) / 100 +
    (traits.includes('prism edge') ? 0.12 : 0);

  const itemStaminaCost = Number(weapon?.staminaCost || 0);
  const moveBaseCost = Number(modified.staminaCost || 8);
  const weaponAdjustedCost = itemStaminaCost > 0
    ? Math.max(3, itemStaminaCost + moveBaseCost - 8)
    : moveBaseCost;

  modified.damageMultiplier = Number(modified.damageMultiplier || 1) * (1 + damagePct / 100);
  modified.staminaCost = Math.max(3, Math.ceil(weaponAdjustedCost * (1 - Math.min(0.55, costReductionPct / 100))));
  modified.projectileRange = Math.max(
    Number(modified.projectileRange || 260),
    Number(weapon?.range || 0) || 0
  ) * (1 + rangePct / 100);
  modified.projectileSpeed = Math.max(
    Number(modified.projectileSpeed || 400),
    Number(weapon?.projectileSpeed || 0) || 0
  ) * (1 + speedPct / 100);
  modified.stagger = Number(modified.stagger || 0) * (1 + staggerPct / 100);

  if ((modified.pierce || 0) <= 0 && pierceChance > 0 && Math.random() < pierceChance) {
    modified.pierce = 1;
    modified.empoweredFocusBolt = true;
  }

  return modified;
}

function buildUniversalHeavyMove(player, move, weapon, weaponType) {
  const profile = getHeavyAttackProfile(weaponType, weapon);
  const duration = Math.max(0.28, Number(move.duration || 0.4) * profile.durationMultiplier);
  const sourceActiveStart = Number(move.activeStart ?? move.startup ?? duration * 0.28);
  const sourceActiveEnd = Number(move.activeEnd ?? sourceActiveStart + 0.08);
  const activeStart = Math.max(0.08, Math.min(duration * 0.68, sourceActiveStart * profile.durationMultiplier + 0.04));
  const activeEnd = Math.min(duration - 0.05, activeStart + Math.max(0.07, (sourceActiveEnd - sourceActiveStart) * 1.15));
  const projectile = move.kind === 'projectile';
  const focus = weaponType === 'spiritFocus' || weaponType === 'eldritch';

  const heavy = {
    ...move,
    id: ['mace','hammer'].includes(weaponType)?`${weaponType}_heavy_impact`:`${move.id || weaponType || 'weapon'}_universal_heavy`,
    name: ['mace','hammer'].includes(weaponType)?`Heavy ${weaponType==='mace'?'Mace':'Hammer'} Blow`:`Heavy ${move.name || 'Attack'}`,
    comboType: 'heavy',
    universalHeavy: true,
    duration,
    startup: Math.min(activeStart, Math.max(0.08, Number(move.startup || activeStart * 0.8) * 1.12)),
    activeStart,
    activeEnd,
    recovery: Math.max(0.09, duration - activeEnd),
    staminaCost: Math.max(1, Math.ceil(Number(move.staminaCost || 6) * profile.staminaCostMultiplier)),
    damageMultiplier: Number(move.damageMultiplier || 1) * profile.damageMultiplier,
    knockback: Math.max(0, Math.round(Number(move.knockback || 0) * profile.knockbackMultiplier + (projectile ? 2 : 6))),
    stagger: Math.max(0, Number(move.stagger || 0) + profile.staggerBonus),
    lungeDistance: Math.max(0, Number(profile.lungeDistance || 0)),
    skill: move.skill || getSkillForWeaponType(weaponType)
  };

  if (heavy.kind === 'arc') {
    heavy.range = Math.max(Number(move.range || 44), Math.round(Number(move.range || 44) * profile.rangeMultiplier));
    heavy.arcDegrees = Math.min(150, Math.round(Number(move.arcDegrees || 72) + (weaponType === 'scythe' ? 12 : 8)));
  } else if (heavy.kind === 'line') {
    heavy.range = Math.max(Number(move.range || 56), Math.round(Number(move.range || 56) * (profile.rangeMultiplier + (weaponType === 'spear' ? 0.08 : 0))));
    heavy.width = Math.max(Number(move.width || 22), Math.round(Number(move.width || 22) * profile.widthMultiplier));
  } else if (heavy.kind === 'circle') {
    heavy.radius = Math.max(Number(move.radius || move.range || 40), Math.round(Number(move.radius || move.range || 40) * profile.rangeMultiplier));
    heavy.range = Math.max(Number(move.range || 40), Math.round(Number(move.range || 40) * profile.rangeMultiplier));
  } else if (projectile) {
    heavy.projectileSpeed = Math.round(Number(move.projectileSpeed || 380) * (weaponType === 'crossbow' ? 1.16 : 1.08));
    heavy.projectileRange = Math.round(Number(move.projectileRange || 260) * profile.rangeMultiplier);
    heavy.projectileRadius = Math.max(Number(move.projectileRadius || 8), Math.round(Number(move.projectileRadius || 8) * profile.widthMultiplier + 1));
    heavy.projectileKind = focus ? 'focusLance' : 'powerArrow';
    heavy.visualProfile = focus ? 'focusLance' : 'powerArrow';
    heavy.pierce = Math.max(Number(move.pierce || 0), weaponType === 'crossbow' || focus ? 1 : 0);
  }

  heavy.impact = getHeavyImpact(move, weaponType);
  heavy.color = getMoveEffectColor(heavy);

  return heavy;
}

function getHeavyAttackProfile(weaponType, weapon) {
  const base = {
    ...HEAVY_DEFAULTS,
    ...(HEAVY_WEAPON_PROFILES[weaponType] || {})
  };
  const custom = weapon?.heavyAttack && typeof weapon.heavyAttack === 'object'
    ? weapon.heavyAttack
    : {};

  const threshold = clamp(Number(custom.threshold ?? base.threshold), 0.25, 0.75);
  const maxHold = Math.max(threshold + 0.12, clamp(Number(custom.maxHold ?? base.maxHold), 0.45, 1.6));

  return {
    threshold,
    maxHold,
    damageMultiplier: Math.max(1, Number(custom.damageMultiplier ?? base.damageMultiplier)),
    staminaCostMultiplier: Math.max(1, Number(custom.staminaCostMultiplier ?? base.staminaCostMultiplier)),
    durationMultiplier: Math.max(0.8, Number(custom.durationMultiplier ?? base.durationMultiplier)),
    rangeMultiplier: Math.max(1, Number(custom.rangeMultiplier ?? base.rangeMultiplier)),
    widthMultiplier: Math.max(1, Number(custom.widthMultiplier ?? base.widthMultiplier)),
    knockbackMultiplier: Math.max(1, Number(custom.knockbackMultiplier ?? base.knockbackMultiplier)),
    staggerBonus: Math.max(0, Number(custom.staggerBonus ?? base.staggerBonus)),
    lungeDistance: Math.max(0, Number(custom.lungeDistance ?? base.lungeDistance))
  };
}

function getHeavyImpact(move, weaponType) {
  if (weaponType === 'scythe') return 'heavySpiritSlash';
  if (weaponType === 'spiritFocus') return 'focusBoltHit';
  if (weaponType === 'eldritch') return 'eldritchBeam';
  if (weaponType === 'bow' || weaponType === 'crossbow') return 'powerArrowHit';
  if (weaponType === 'mace' || weaponType === 'hammer' || move.kind === 'circle') return 'groundSlam';
  if (move.impact === 'spiritSlash') return 'heavySpiritSlash';
  if (move.impact === 'arrowHit') return 'powerArrowHit';
  return move.impact || 'heavySlash';
}

function isMoveActive(move, elapsed) {
  if (!move) return false;
  return elapsed >= move.activeStart && elapsed <= move.activeEnd;
}

function updateAttackLunge(player, world, move, state, dt) {
  const remaining = Math.max(0, Number(state.attackLungeRemaining || 0));
  if (!move || remaining <= 0) return;

  const lungeStart = Math.max(0, Number(move.lungeStart || 0));
  const lungeEnd = Math.max(lungeStart + 0.06, Number(move.activeEnd || move.activeStart || move.duration || 0.3));
  if (state.attackElapsed < lungeStart || state.attackElapsed > lungeEnd) return;

  const lungeWindow = Math.max(0.06, lungeEnd - lungeStart);
  const speed = Math.max(0, Number(move.lungeDistance || 0)) / lungeWindow;
  const step = Math.min(remaining, speed * Math.max(0, Number(dt || 0)));
  if (step <= 0) return;

  const dirX = Number(state.attackDirX || 0);
  const dirY = Number(state.attackDirY || 1);
  const nextX = Number(player.x || 0) + dirX * step;
  const nextY = Number(player.y || 0) + dirY * step;

  if (lungeWouldOverlapEnemy(player, world, nextX, nextY)) {
    state.attackLungeRemaining = 0;
    return;
  }

  const moved = moveActorWithCollision(player, world, dirX * step, dirY * step, player.radius || player.r || 10);
  state.attackLungeRemaining = moved ? Math.max(0, remaining - step) : 0;
}

function lungeWouldOverlapEnemy(player, world, nextX, nextY) {
  const playerRadius = Math.max(8, Number(player?.radius || player?.r || 10));

  return (world?.enemies || []).some(enemy => {
    if (!enemy || enemy.hp <= 0 || enemy.dead || enemy.alive === false) return false;
    const enemyRadius = Math.max(8, Number(enemy.radius || enemy.r || 14));
    return Math.hypot(Number(enemy.x || 0) - nextX, Number(enemy.y || 0) - nextY) < playerRadius + enemyRadius - 2;
  });
}

// -----------------------------------------------------------------------------
// MELEE HITBOXES
// -----------------------------------------------------------------------------

function resolveMeleeHitbox(player, world, move, state, log) {
  const enemies = world?.enemies || [];

  for (const enemy of enemies) {
    if (!enemy || enemy.hp <= 0) continue;

    const enemyId = getEnemyId(enemy);
    if (state.hitEnemyIds.includes(enemyId)) continue;

    if (!enemyInHitbox(player, enemy, move, state)) continue;

    const damagePacket = calculateMoveDamage(player, move);
    applyEnemyDamage(player, world, enemy, damagePacket, move, state, log);

    state.hitEnemyIds.push(enemyId);
  }
}

function enemyInHitbox(player, enemy, move, state) {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const distance = Math.hypot(dx, dy);
  const enemyRadius = enemy.radius || enemy.r || 14;

  if (move.kind === 'circle') {
    const radius = move.radius || move.range || 40;
    return distance <= radius + enemyRadius;
  }

  if (move.kind === 'line') {
    return pointInDirectionalCapsule(
      dx,
      dy,
      state.attackDirX,
      state.attackDirY,
      move.range || 56,
      move.width || 24,
      enemyRadius
    );
  }

  return pointInArc(
    dx,
    dy,
    state.attackDirX,
    state.attackDirY,
    move.range || 46,
    move.arcDegrees || 70,
    enemyRadius
  );
}

function pointInArc(dx, dy, dirX, dirY, range, arcDegrees, targetRadius = 0) {
  const distance = Math.hypot(dx, dy);

  if (distance > range + targetRadius) return false;
  if (distance <= 6 + targetRadius) return true;

  const nx = dx / distance;
  const ny = dy / distance;

  const dot = clamp(nx * dirX + ny * dirY, -1, 1);
  const angle = Math.acos(dot);
  const maxAngle = degreesToRadians(arcDegrees / 2);

  return angle <= maxAngle;
}

function pointInDirectionalCapsule(dx, dy, dirX, dirY, length, width, targetRadius = 0) {
  const forward = dx * dirX + dy * dirY;

  if (forward < -targetRadius) return false;
  if (forward > length + targetRadius) return false;

  const closestX = dirX * forward;
  const closestY = dirY * forward;

  const sideDistance = Math.hypot(dx - closestX, dy - closestY);

  return sideDistance <= width / 2 + targetRadius;
}

// -----------------------------------------------------------------------------
// PROJECTILES / BOW
// -----------------------------------------------------------------------------

function maybeFireProjectile(player, move, state, world) {
  if (state.projectileFiredForAttackId === state.attackId) {
    return;
  }

  state.projectileFiredForAttackId = state.attackId;
  state.projectiles = state.projectiles || [];

  const spawnOffset = 24;

  const projectileKind = move.projectileKind || (move.comboType === 'heavy' ? 'powerArrow' : 'arrow');
  const visualProfile = move.visualProfile || projectileKind;
  const projectileColor = move.color || getMoveEffectColor(move);

  state.projectiles.push({
    id: `${projectileKind}-${state.attackId}-${Date.now()}`,
    kind: projectileKind,
    visualProfile,
    x: player.x + state.attackDirX * spawnOffset,
    y: player.y + state.attackDirY * spawnOffset - 9,
    startX: player.x,
    startY: player.y,
    dirX: state.attackDirX,
    dirY: state.attackDirY,
    speed: move.projectileSpeed || 380,
    range: move.projectileRange || 260,
    radius: move.projectileRadius || 8,
    damageMultiplier: move.damageMultiplier || 1,
    knockback: move.knockback || 10,
    stagger: move.stagger || 0,
    skill: move.skill || getSkillForWeaponType(getWeaponType(getEquippedWeapon(player))) || 'archery',
    comboType: move.comboType,
    impact: move.impact || 'arrowHit',
    pierceRemaining: move.pierce || 0,
    color: projectileColor,
    hitEnemyIds: [],
    age: 0,
    alive: true
  });

  playSfx(SOUND_EVENT_KEYS.PROJECTILE_LAUNCH, {
    volume: move.comboType === 'heavy' ? 0.9 : 0.68,
    throttle: 0.035
  });

  spawnWorldEffect(world, {
    kind: 'slash',
    layer: 'front',
    x: player.x + state.attackDirX * 18,
    y: player.y + state.attackDirY * 18,
    ttl: 0.12,
    color: projectileColor,
    dirX: state.attackDirX,
    dirY: state.attackDirY
  });
}

function updateProjectiles(player, world, dt, log) {
  const state = ensureCombatState(player);

  state.projectiles = state.projectiles || [];

  for (const projectile of state.projectiles) {
    if (!projectile.alive) continue;

    projectile.age = (projectile.age || 0) + dt;
    const previousX=projectile.x,previousY=projectile.y;
    projectile.x += projectile.dirX * projectile.speed * dt;
    projectile.y += projectile.dirY * projectile.speed * dt;

    if (world?.tiles?.length && (!isPassable(world, projectile.x, projectile.y)||!hasLineOfSight(world,previousX,previousY,projectile.x,projectile.y))) {
      projectile.alive = false;
      spawnWorldEffect(world, {
        kind: 'projectileDissipate',
        layer: 'front',
        x: projectile.x,
        y: projectile.y,
        ttl: 0.16,
        radius: projectile.kind === 'powerArrow' || projectile.kind === 'focusLance' ? 18 : 12,
        visualProfile: projectile.visualProfile,
        color: projectile.color || (projectile.kind === 'powerArrow' ? '#ef6f4f' : getMoveEffectColor(projectile))
      });
      playSfx(SOUND_EVENT_KEYS.PROJECTILE_IMPACT, {
        volume: 0.38,
        throttle: 0.05
      });
      continue;
    }

    const traveled = Math.hypot(projectile.x - projectile.startX, projectile.y - projectile.startY);

    if (traveled >= projectile.range) {
      projectile.alive = false;
      spawnWorldEffect(world, {
        kind: 'projectileDissipate',
        layer: 'front',
        x: projectile.x,
        y: projectile.y,
        ttl: 0.16,
        radius: projectile.kind === 'powerArrow' || projectile.kind === 'focusLance' ? 18 : 12,
        visualProfile: projectile.visualProfile,
        color: projectile.color || (projectile.kind === 'powerArrow' ? '#ef6f4f' : getMoveEffectColor(projectile))
      });
      continue;
    }

    resolveProjectileHits(player, world, projectile, log);
  }

  state.projectiles = state.projectiles.filter(p => p.alive);
}

function resolveProjectileHits(player, world, projectile, log) {
  const enemies = world?.enemies || [];

  for (const enemy of enemies) {
    if (!enemy || enemy.hp <= 0) continue;

    const enemyId = getEnemyId(enemy);
    if (projectile.hitEnemyIds.includes(enemyId)) continue;

    const radius = projectile.radius + (enemy.radius || enemy.r || 14);
    const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);

    if (distance > radius) continue;

    const damagePacket = calculateMoveDamage(player, projectile);

    applyEnemyDamage(player, world, enemy, damagePacket, projectile, {
      attackDirX: projectile.dirX,
      attackDirY: projectile.dirY
    }, log);
    playSfx(SOUND_EVENT_KEYS.PROJECTILE_IMPACT, {
      volume: projectile.kind === 'powerArrow' ? 0.95 : 0.72,
      throttle: 0.035
    });

    projectile.hitEnemyIds.push(enemyId);

    if (projectile.pierceRemaining > 0) {
      projectile.pierceRemaining -= 1;
    } else {
      projectile.alive = false;
      return;
    }
  }
}

// -----------------------------------------------------------------------------
// DAMAGE / KILL XP
// -----------------------------------------------------------------------------

function calculateMoveDamage(player, move) {
  const weapon = getEquippedWeapon(player);
  const weaponType = getWeaponType(weapon);
  const moveset = WEAPON_MOVESETS[weaponType] || WEAPON_MOVESETS.unarmed;
  const skillId = ['mace','hammer'].includes(weaponType)?'blunt':move.skill || moveset.skill || weapon?.primarySkill || weapon?.skill || 'blade';

  const base = calculateWeaponDamage(player, weapon, weaponType);
  const multiplier = Number(move.damageMultiplier || 1);

  const critChance = getCritChance(player, weapon, move);
  const crit = Math.random() < critChance;
  const treeBonuses = getSkillTreeBonuses(player);
  const critMultiplier = (move.comboType === 'heavy' ? 1.65 : 1.45) + (treeBonuses.critDamagePct || 0) / 100;

  let damage = Math.round(base * multiplier);

  if (crit) {
    damage = Math.round(damage * critMultiplier);
  }

  if (move.comboType !== 'projectile' && treeBonuses.woundedDamagePct && player?.lastTargetHpPct <= 0.35) {
    damage = Math.round(damage * (1 + treeBonuses.woundedDamagePct / 100));
  }

  return {
    amount: Math.max(1, damage),
    crit,
    skillId,
    weaponType,
    comboType: move.comboType || 'light'
  };
}

export function calculateWeaponDamage(player, weapon, fallbackWeaponType = 'unarmed') {
  if (!weapon) {
    const blade = getSkillLevel(player, 'blade');
    return Math.floor(3.15*progressionPower(player,'blade'));
  }

  const primarySkill = weaponProficiency(weapon,getDefaultSkillForWeaponType(fallbackWeaponType));
  const secondarySkill = weapon.secondarySkill || null;

  const baseDamage = Number(weapon.baseDamage || weapon.power || 4);
  const primaryMultiplier = Number(weapon.primaryMultiplier || getRarityScalingMultiplier(weapon.rarity));
  const secondaryMultiplier = Number(weapon.secondaryMultiplier || 0);

  const legacyPower = Number(weapon.power || 0) * 0.75;
  const spiritPower = Number(weapon.spirit || 0) * 0.5;
  const focusPower = weapon?.weaponType === 'spiritFocus'
    ? Number(weapon.focusPower || 0) * 0.85
    : 0;

  const treeBonuses = getSkillTreeBonuses(player);

  return Math.floor((baseDamage + legacyPower + spiritPower + focusPower + (treeBonuses.power || 0) + (weapon.id===player.equipment?.weapon?getEquipmentTierBonus(player,'weapon'):0) + primaryMultiplier*.55 + secondaryMultiplier*.55) * progressionPower(player,primarySkill));
}

function applyEnemyDamage(player, world, enemy, damagePacket, move, state, log) {
  const passiveResult = applyOutgoingClassPassiveDamage(player, enemy, damagePacket.amount, {
    weaponType: damagePacket.weaponType,
    skill: damagePacket.skillId,
    comboType: damagePacket.comboType,
    ranged: move.kind === 'projectile',
    melee: move.kind !== 'projectile',
    projectile: move.kind === 'projectile'
  });

  const adjustedPacket = {
    ...damagePacket,
    amount: passiveResult.damage || damagePacket.amount,
    consumedPassive: passiveResult.consumedPassive || null
  };

  let damage = applyLegendaryOutgoingDamage(player, enemy, adjustedPacket.amount, {
    weaponType: damagePacket.weaponType,
    skill: damagePacket.skillId,
    comboType: damagePacket.comboType,
    ranged: move.kind === 'projectile',
    melee: move.kind !== 'projectile',
    projectile: move.kind === 'projectile'
  }, world, log);
  damage=Math.ceil(damage*equipmentDamageMultiplier(player,enemy,damagePacket.element||move.element||
    (damagePacket.weaponType==='scythe'?'necrotic':damagePacket.skillId==='warding'?'nature':null)));
  damage=mitigateEliteHit(enemy,player,damage,{heavy:damagePacket.comboType==='heavy'});
  if(move.mythicalAsh && state.mythicalAshAttackId!==state.attackId){
    state.mythicalAshAttackId=state.attackId;
    spawnWorldEffect(world,{kind:'slash',x:enemy.x,y:enemy.y-6,radius:72,ttl:.35,color:'#f49b58',dirX:state.attackDirX,dirY:state.attackDirY});
    for(const foe of (world.enemies||[]).filter(e=>e.hp>0&&!e.dead&&!e.friendly&&Math.hypot(e.x-enemy.x,e.y-enemy.y)<72&&hasLineOfSight(world,enemy.x,enemy.y,e.x,e.y)).slice(0,8)){
      if(foe.arenaDormant)continue;const aftershock=Math.min(foe.hp,Math.ceil(damage*.25));foe.hp-=aftershock;
      recordEnemyCombatContribution(foe,player,damagePacket.skillId,aftershock,{source:'weapon',comboType:'heavy',weaponType:damagePacket.weaponType});
      if(foe.hp<=0)foe.dead=true;foe.hitFlash=.12;
    }
  }
  player.lastTargetHpPct = enemy.maxHp ? enemy.hp / enemy.maxHp : 1;

  const contributionDamage = Math.min(enemy.hp,damage);
  enemy.wasWoundedOnLastHit = enemy.hp / Math.max(1,enemy.maxHp) < .35;
  enemy.hp = Math.max(0, enemy.hp - damage);
  // Both melee swings and weapon projectiles reach this once per target hit.
  // Ability, summon and damage-over-time hits use separate damage paths.
  if (contributionDamage > 0) {
    player.spirit = Math.min(Math.max(0, player.maxSpirit || 0),
      Math.max(0, player.spirit || 0) + PRIMARY_WEAPON_SPIRIT_ON_HIT);
    if(move.kind!=='projectile')onOathkeeperMeleeContact(player,enemy,world,performance.now()/1000);
    onFellhunterWeaponContact(player,enemy,world,contributionDamage,performance.now()/1000);
  }
  recordEnemyCombatContribution(enemy, player, damagePacket.skillId, contributionDamage, {
    weaponType: damagePacket.weaponType,
    comboType: damagePacket.comboType,
    source: 'weapon'
  });

  const dirX = state.attackDirX || 0;
  const dirY = state.attackDirY ?? 1;
  const knockback = move.knockback || 0;

  if (knockback > 0) {
    moveActorWithCollision(enemy, world, dirX * knockback, dirY * knockback);
  }

  enemy.hitFlash = move.comboType === 'heavy' ? 0.18 : 0.12;
  enemy.hitStopTimer = Math.max(enemy.hitStopTimer || 0, adjustedPacket.crit ? 0.08 : move.comboType === 'heavy' ? 0.065 : ['mace','hammer'].includes(damagePacket.weaponType)&&move.finisher?.045:.025);
  state.hitStopTimer = Math.max(state.hitStopTimer || 0, adjustedPacket.crit ? 0.065 : move.comboType === 'heavy' ? 0.05 : ['mace','hammer'].includes(damagePacket.weaponType)?(move.finisher?.045:.028):.018);
  enemy.lastHitAt = performance.now() / 1000;
  enemy.lastDamagedByPlayer = true;
  const blunt=['mace','hammer'].includes(damagePacket.weaponType);
  const heavy = move.comboType === 'heavy' || blunt && move.finisher;
  const staggered = heavy && move.stagger > 0;
  recordEnemyHitReaction(enemy, {
    crit: adjustedPacket.crit,
    heavy,
    stagger: staggered,
    knockback: knockback > 30,
    magic: damagePacket.skillId === 'spirit' || damagePacket.skillId === 'warding',
    dirX,
    dirY,
    color: getDamageColor(move, adjustedPacket)
  });
  recordEnemyContactImpact(enemy,player,world,{heavy,crit:adjustedPacket.crit,dirX,dirY,skill:damagePacket.skillId,
    weaponType:damagePacket.weaponType,finisher:move.finisher,element:damagePacket.element||move.element,projectile:move.kind==='projectile'});
  playSfx(blunt ? 'bluntImpact' : adjustedPacket.crit ? SOUND_EVENT_KEYS.CRITICAL_HIT : heavy ? SOUND_EVENT_KEYS.HEAVY_HIT : SOUND_EVENT_KEYS.LIGHT_HIT, {
    heavy,finisher:move.finisher,
    volume: move.comboType === 'heavy' ? 1 : 0.82,
    throttle: adjustedPacket.crit ? 0.02 : 0.035
  });

  if (move.stagger && move.stagger > 0) {
    const staggerResistance = Math.max(0, Math.min(0.85, Number(enemy.staggerResistance || 0)));
    const staggerDuration = Math.max(0.04, move.stagger * (1 - staggerResistance));
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, staggerDuration);

    if (move.comboType === 'heavy') {
      enemy.staggerTimer = Math.max(enemy.staggerTimer || 0, staggerDuration);
      spawnWorldEffect(world, {
        kind: 'combatStateFeedback',
        layer: 'front',
        x: enemy.x,
        y: enemy.y - 10,
        ttl: enemy.isBoss || enemy.eliteModifier ? 0.2 : 0.28,
        radius: enemy.isBoss || enemy.eliteModifier ? 18 : 25,
        stateKind: enemy.isBoss || enemy.eliteModifier ? 'resistant' : 'stagger',
        color: enemy.isBoss || enemy.eliteModifier ? '#9facbf' : '#ffcc66'
      });
      playSfx(enemy.isBoss || enemy.eliteModifier ? SOUND_EVENT_KEYS.INTERRUPT : SOUND_EVENT_KEYS.ENEMY_STAGGER, {
        volume: enemy.isBoss || enemy.eliteModifier ? 0.42 : 0.66,
        throttle: 0.08
      });
      addStaggerText(enemy, {
        text: staggerResistance >= 0.18 ? 'Resisted' : 'Stagger',
        color: '#ffcc66',
        ttl: 0.55,
        size: 12,
        offsetY: -48
      });
    }
  }

  addDamageText(enemy, damage, {
    crit: adjustedPacket.crit,
    heavy: move.comboType === 'heavy',
    color: getDamageColor(move, adjustedPacket),
    ttl: adjustedPacket.crit ? 0.88 : move.comboType === 'heavy' ? 0.78 : 0.62,
    size: adjustedPacket.crit ? 18 : move.comboType === 'heavy' ? 16 : 12
  });

  applyMoveSpecials(player, enemy, adjustedPacket, move,contributionDamage);

  spawnHitEffect(world, enemy, move, state, adjustedPacket,player);

  if (enemy.hp <= 0) {
    enemy.dead = true;
    recordEnemyDeathVisual(enemy, {
      classId: player.classId,
      skill: damagePacket.skillId,
      heavy,
      knockback: knockback > 30,
      magic: damagePacket.skillId === 'spirit' || damagePacket.skillId === 'warding',
      dirX,
      dirY,
      color: getDamageColor(move, adjustedPacket)
    });
    playSfx(enemy.isBoss ? 'boss' : 'enemyDeath', {
      volume: enemy.isBoss ? 1 : 0.82,
      throttle: 0.05
    });
    onEnemyKilledByPlayer(player, enemy, world, log);
    onLegendaryEnemyKilled(player, enemy, world, log);
    awardWeaponKillXp(player, enemy, damagePacket.weaponType, log);
  }
}

function awardWeaponKillXp(player, enemy, weaponType, log) {
  if (!enemy) return;

  const skillId = getSkillForWeaponType(weaponType);
  if (!skillId) return;

  enemy.pendingWeaponSkillId = skillId;
}

function applyMoveSpecials(player, enemy, damagePacket, move,actualDamage) {
  const weapon = getEquippedWeapon(player);
  const traits = weapon?.traits || [];
  const treeBonuses = getSkillTreeBonuses(player);

  const isLifedrain =
    traits.includes('lifedrain') ||
    move.lifedrainRatio ||
    weapon?.id === 'unburiedCrescent';

  if(isGravecallerSustain(player)){
    const modifiers=getBloodlineCombatModifiers(player);
    const weaponRate=(isLifedrain?Number(move.lifedrainRatio||.035)*100:0)+Math.max(0,treeBonuses.lifestealPct||0)+getLegendaryLifestealPct(player)+Number(getEquipmentStatBonuses(player).lifesteal||0)*100;
    const healed=restoreGravecallerLifesteal(player,actualDamage,Math.max(0,weaponRate+(modifiers.lifestealPct||0)),{source:'weapon',
      healingPct:modifiers.lifestealHealingPct||0});
    if(healed>=1)addFloatingText(player,`+${Math.round(healed)}`,{preset:'heal',color:'#b68cff',ttl:.5,size:10,offsetY:-40});
    return;
  }

  if (isLifedrain && damagePacket.skillId === 'spirit') {
    const ratio = Number(move.lifedrainRatio || 0.035);
    const heal = Math.max(1, Math.floor(damagePacket.amount * ratio));

    player.hp = Math.min(player.maxHp, player.hp + heal);

    // Visible because this is an active hit effect, not the Thornbeast passive.
    addFloatingText(player, `+${heal}`, {
      preset: 'heal',
      color: '#b68cff',
      ttl: 0.55,
      size: 11,
      offsetY: -46
    });
  }

  const treeLifesteal = Math.max(0, treeBonuses.lifestealPct || 0);

  if (treeLifesteal > 0) {
    const heal = Math.max(1, Math.floor(damagePacket.amount * treeLifesteal / 100));
    player.hp = Math.min(player.maxHp, player.hp + heal);

    addFloatingText(player, `+${heal}`, {
      preset: 'heal',
      color: damagePacket.skillId === 'spirit' ? '#b68cff' : '#73d18a',
      ttl: 0.5,
      size: 10,
      offsetY: -40
    });
  }
}

function getCritChance(player, weapon, move) {
  let chance = 0.04;
  const treeBonuses = getSkillTreeBonuses(player);

  if (move.comboType === 'heavy') chance += 0.03;
  if (weapon?.rarity === 'rare') chance += 0.02;
  if (weapon?.rarity === 'legendary') chance += 0.04;
  if (weapon?.rarity === 'relic') chance += 0.05;

  if (weapon?.weaponType === 'bow') {
    chance += Math.min(0.08, getSkillLevel(player, 'archery') * 0.0008);
  }

  if (weapon?.weaponType === 'spiritFocus') {
    chance += Math.min(0.06, getSkillLevel(player, 'spirit') * 0.0006);
  }

  chance += (treeBonuses.critChancePct || 0) / 100;

  return clamp(chance, 0, 0.35);
}

function getAttackSpeedMultiplier(player) {
  const bonuses = getSkillTreeBonuses(player);
  return 1 + Math.max(0, Math.min(35, bonuses.attackSpeedPct || 0)) / 100 + .12 * attributeHandling(player,'dexterity');
}

function scaleMoveTiming(move, speedMultiplier) {
  if (!move || speedMultiplier <= 1) return move;

  return {
    ...move,
    duration: move.duration / speedMultiplier,
    startup: move.startup / speedMultiplier,
    activeStart: move.activeStart / speedMultiplier,
    activeEnd: move.activeEnd / speedMultiplier,
    recovery: move.recovery / speedMultiplier
  };
}

function getDamageColor(move, damagePacket) {
  if (damagePacket?.crit) return '#ffcc66';
  if (damagePacket?.weaponType === 'spiritFocus' || move.impact === 'focusBoltHit') return '#fff1b8';
  if (damagePacket?.skillId === 'spirit') return '#b68cff';
  if (damagePacket?.skillId === 'warding') return '#73d18a';
  if (move.kind === 'projectile') return '#d9ad4f';
  if (move.comboType === 'heavy') return '#ffcc66';

  return '#e8edf5';
}

function getDefaultSkillForWeaponType(weaponType) {
  return getSkillForWeaponType(weaponType) || 'blade';
}

function getSkillForWeaponType(weaponType) {
  if (weaponType === 'bow') return 'archery';
  if (weaponType === 'crossbow') return 'archery';
  if (weaponType === 'scythe') return 'spirit';
  if (weaponType === 'eldritch') return 'spirit';
  if (weaponType === 'spiritFocus') return 'spirit';
  if (weaponType === 'staff') return 'warding';
  if (weaponType === 'spear') return 'blade';
  if (weaponType === 'dagger') return 'blade';
  if (weaponType === 'axe') return 'blade';
  if (weaponType === 'mace') return 'blunt';
  if (weaponType === 'hammer') return 'blunt';
  if (weaponType === 'sword') return 'blade';
  if (weaponType === 'unarmed') return 'blade';

  return 'blade';
}

function getRarityScalingMultiplier(rarity) {
  if (rarity === 'common') return 2;
  if (rarity === 'uncommon') return 3;
  if (rarity === 'rare') return 4;
  if (rarity === 'epic') return 5.5;
  if (rarity === 'legendary') return 7;
  if (rarity === 'relic') return 8;

  return 2;
}

// -----------------------------------------------------------------------------
// WORLD HIT EFFECTS
// -----------------------------------------------------------------------------

function spawnHeavyChargeEffect(world, player, state, options = {}) {
  if (!world || !player || !state) return;

  spawnWorldEffect(world, {
    kind: 'weaponWindup',
    layer: 'behind',
    x: player.x,
    y: player.y - 8,
    ttl: Number(options.ttl || 0.12),
    radius: Math.max(14, Number(options.radius || 22)),
    color: options.ready ? state.heavyChargeColor || '#ffcc66' : '#b8c0ca',
    dirX: state.heavyChargeAimX || player.dirX || 0,
    dirY: state.heavyChargeAimY || player.dirY || 1
  });
}

function spawnHeavyAttackReleaseEffect(world, player, move, state) {
  if (!world || !player || !move || !state) return;

  const color = getMoveEffectColor(move);

  spawnWorldEffect(world, {
    kind: 'chargedRelease',
    layer: 'front',
    x: player.x + state.attackDirX * 10,
    y: player.y + state.attackDirY * 10 - 7,
    ttl: 0.18,
    radius: Math.max(24, Number(move.range || move.radius || move.projectileRange || 46) * 0.42),
    color,
    dirX: state.attackDirX,
    dirY: state.attackDirY
  });

  if (move.lungeDistance > 0) {
    spawnWorldEffect(world, {
      kind: 'burst',
      layer: 'behind',
      x: player.x - state.attackDirX * 4,
      y: player.y - state.attackDirY * 4 + 8,
      ttl: 0.14,
      radius: 16,
      color: '#6f6256'
    });
  }
}

function spawnAttackStartEffect(world, player, move, state) {
  if (!world) return;

  if (move.kind === 'projectile' || move.comboType !== 'heavy') return;

  spawnWorldEffect(world, {
    kind: 'weaponWindup',
    layer: 'behind',
    x: player.x,
    y: player.y - 8,
    ttl: Math.max(0.12, Number(move.activeStart || move.startup || 0.16)),
    radius: Math.max(24, Number(move.range || 48) * 0.62),
    color: getMoveEffectColor(move),
    dirX: state.attackDirX,
    dirY: state.attackDirY
  });
}

function spawnHitEffect(world, enemy, move, state, damagePacket,player) {
  if (!world || !enemy) return;

  if(['mace','hammer'].includes(damagePacket.weaponType)){
    if(move.comboType==='heavy'||move.finisher||damagePacket.crit)spawnWorldEffect(world,{
      kind:'bluntGroundImpact',layer:'behind',x:enemy.x,y:enemy.y+2,
      heavy:true,radius:move.comboType==='heavy'?36:26,ttl:.38,classId:player?.classId,subclassId:player?.classId==='oathkeeper'?getOathVisualFamily(player):undefined});
    return;
  }

  const heavy = move.comboType === 'heavy';
  const crit = damagePacket.crit;
  // The shared contact effect already supplies light/projectile material feedback.
  if(!heavy&&!crit)return;
  const dirX=state.attackDirX??1,dirY=state.attackDirY??0;
  const contactX=enemy.x-dirX*Math.min(20,enemy.r||enemy.radius||14)*.65,contactY=enemy.y-22-dirY*5;
  const impact = IMPACT_EFFECT_PROFILES[crit ? 'critical' : heavy ? 'heavy' : move.kind === 'projectile' ? 'projectile' : 'light'];

  spawnWorldEffect(world, {
    kind: 'burst',
    layer: 'front',
    x: contactX,
    y: contactY,
    ttl: impact.ttl,
    radius: impact.radius,
    color: crit ? '#ffcc66' : getMoveEffectColor(move)
  });

  if (heavy || crit) {
    spawnWorldEffect(world, {
      kind: heavy ? 'heavySlash' : 'slash',
      layer: 'front',
      x: contactX,
      y: contactY,
      ttl: 0.16,
      color: crit ? '#ffcc66' : getMoveEffectColor(move),
      dirX: state.attackDirX || 1,
      dirY: state.attackDirY || 0
    });
  }
}

function spawnWorldEffect(world, effect) {
  if (!world) return;

  world.effects = Array.isArray(world.effects) ? world.effects : [];
  world.effects.push({
    age: 0,
    ...effect
  });
}

function getMoveEffectColor(move) {
  if(/^(mace|hammer)_/.test(move.id||''))return '#ddc58b';
  if (move.impact === 'spiritSlash' || move.impact === 'heavySpiritSlash') return '#b68cff';
  if (move.impact === 'focusBoltHit' || move.visualProfile === 'focusBolt' || move.visualProfile === 'focusLance') return '#fff1b8';
  if (move.impact === 'eldritchBeam') return '#ef4056';
  if (move.impact === 'staffHit' || move.impact === 'groundSlam') return '#73d18a';
  if (move.impact === 'arrowHit' || move.impact === 'powerArrowHit') return '#d9ad4f';
  if (move.comboType === 'heavy') return '#ffcc66';

  return '#e8edf5';
}

// -----------------------------------------------------------------------------
// AIM / WEAPON HELPERS
// -----------------------------------------------------------------------------

export function getAimDirection(player, input) {
  const explicitAim = normalizeAimVector(input?.combatAimX, input?.combatAimY);

  if (explicitAim.active) {
    return {
      x: explicitAim.x,
      y: explicitAim.y
    };
  }

  const mouseWorldX = input?.mouseWorldX;
  const mouseWorldY = input?.mouseWorldY;

  if (Number.isFinite(mouseWorldX) && Number.isFinite(mouseWorldY)) {
    const dx = mouseWorldX - player.x;
    const dy = mouseWorldY - player.y;
    const length = Math.hypot(dx, dy);

    if (length > 0.001) {
      return {
        x: dx / length,
        y: dy / length
      };
    }
  }

  const rawFallbackX = Number(player?.dirX);
  const rawFallbackY = Number(player?.dirY);
  const fallbackX = Number.isFinite(rawFallbackX) ? rawFallbackX : 0;
  const fallbackY = Number.isFinite(rawFallbackY) ? rawFallbackY : 1;
  const fallbackLength = Math.hypot(fallbackX, fallbackY);

  if (fallbackLength <= 0.001) {
    return {
      x: 0,
      y: 1
    };
  }

  return {
    x: fallbackX / fallbackLength,
    y: fallbackY / fallbackLength
  };
}

function getEquippedWeapon(player) {
  const weaponId = player?.equipment?.weapon;
  return weaponId ? ITEMS[weaponId] : null;
}

function getWeaponType(weapon) {
  if (!weapon) return 'unarmed';

  if (weapon.weaponType) return normalizeWeaponType(weapon.weaponType);

  const text = `${weapon.id || ''} ${weapon.name || ''}`.toLowerCase();

  if (text.includes('crossbow')) return 'crossbow';
  if (text.includes('bow')) return 'bow';
  if (text.includes('dagger') || text.includes('knife')) return 'dagger';
  if (text.includes('axe')) return 'axe';
  if (text.includes('mace')) return 'mace';
  if (text.includes('hammer') || text.includes('maul')) return 'hammer';
  if (text.includes('spear') || text.includes('lance') || text.includes('pike')) return 'spear';
  if (text.includes('staff')) return 'staff';
  if (text.includes('focus') || text.includes('dawnlens') || text.includes('prism') || text.includes('reliquary') || text.includes('grave-lens') || text.includes('gauntlet')) return 'spiritFocus';
  if (text.includes('eldritch') || text.includes('conduit') || text.includes('starless')) return 'eldritch';
  if (text.includes('scythe') || text.includes('crescent')) return 'scythe';
  if (text.includes('sword') || text.includes('blade') || text.includes('rapier')) return 'sword';

  return 'sword';
}

function normalizeWeaponType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (!normalized) return 'sword';
  if (normalized === 'spiritfocus' || normalized === 'focus' || normalized === 'spirit_focus') return 'spiritFocus';
  if (normalized === 'blade') return 'sword';
  if (normalized === 'knife') return 'dagger';
  if (normalized === 'maul') return 'hammer';
  return normalized;
}

function getWeaponChargeKey(player) {
  const weapon = getEquippedWeapon(player);
  return `${player?.equipment?.weapon || 'unarmed'}:${getWeaponType(weapon)}`;
}

function getSkillLevel(player, skillId) {
  return player?.skillState?.skills?.[skillId]?.level || 1;
}

function getPlayerCombatLevel(player) { return Math.max(1,player?.skillState?.combat?.level || player?.combatLevel || 1); }

function getEnemyId(enemy) {
  if (!enemy.__combatId) {
    enemy.__combatId = `enemy-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  return enemy.__combatId;
}

// -----------------------------------------------------------------------------
// UTILITY
// -----------------------------------------------------------------------------

function cloneDefaultCombatState() {
  const clone = {};

  for (const [key, value] of Object.entries(DEFAULT_COMBAT_STATE)) {
    clone[key] = Array.isArray(value) ? [...value] : value;
  }

  return clone;
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
