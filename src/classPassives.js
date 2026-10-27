import {getPlayerSubclass} from './subclassSystem.js';
import {fellhunterTrainingLevel} from './fellhunterWeapons.js';
import {onSubclassKill,onSubclassDamaged,onSubclassBlocked,subclassWeaponDamage,getSubclassResourceLabel} from './subclassCombat.js';
// classPassives.js
// Runalis class passive system.
//
// This file gives each class a lightweight identity boost without bloating
// the active ability system.
//
// Current passives:
// - Oathkeeper: blocking damage builds Conviction for the next melee, smite, shield, or heal.
// - Fellhunter: dashing or using tools prepares melee or ranged weapon follow-ups.
// - Gravecaller: kills restore HP and spirit.
// - Thornbinder: thorn/root pressure opens Briar Bloom regeneration while old guard hooks remain compatible.
// - Waverider: water casts build Flow toward the next empowered current.
// - Eldritch: conduit attacks slightly overcharge spirit damage.
//
// This file is intentionally defensive. If another script calls these hooks
// before the player is fully migrated, nothing should crash.

import { addFloatingText } from './floatingText.js';
import { getSkillLevel } from './skills.js';
import { getClassDefinition } from './classData.js';
import { getSkillTreeBonuses } from './skillTreeSystem.js';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const PASSIVE_TIMERS = {
  oathkeeperConvictionDuration: 4.2,
  mercenaryReloadDuration: 2.75,
  thornbinderBulwarkDuration: 3.0,
  thornbinderBulwarkCooldown: 6.0,
  hydromancerFlowDuration: 9.0
};

const PASSIVE_TEXT = {
  oathkeeperReady: 'Conviction',
  mercenaryReady: 'Tactical Advantage',
  necroHarvest: 'Death Harvest',
  thornbinderBulwark: 'Briar Guard',
  thornRetaliation: 'Thorns',
  hydromancerFlow: 'Flow',
  hydromancerFlowRelease: 'Living Water'
};

// -----------------------------------------------------------------------------
// PUBLIC STATE
// -----------------------------------------------------------------------------

export function ensurePassiveState(player) {
  if (!player) return null;

  player.passiveState = player.passiveState || {
    lastClassId: null,

    oathboundRiposteUntil: 0,
    oathboundRiposteStacks: 0,

    combatReloadUntil: 0,
    combatReloadStacks: 0,

    livingBulwarkUntil: 0,
    livingBulwarkCooldown: 0,

    deathHarvestKills: 0,

    hydromancerFlowStacks: 0,
    hydromancerFlowUntil: 0
  };

  const state = player.passiveState;

  state.lastClassId = state.lastClassId ?? null;

  state.oathboundRiposteUntil = state.oathboundRiposteUntil ?? 0;
  state.oathboundRiposteStacks = state.oathboundRiposteStacks ?? 0;

  state.combatReloadUntil = state.combatReloadUntil ?? 0;
  state.combatReloadStacks = state.combatReloadStacks ?? 0;

  state.livingBulwarkUntil = state.livingBulwarkUntil ?? 0;
  state.livingBulwarkCooldown = state.livingBulwarkCooldown ?? 0;

  state.deathHarvestKills = state.deathHarvestKills ?? 0;
  state.hydromancerFlowStacks = state.hydromancerFlowStacks ?? 0;
  state.hydromancerFlowUntil = state.hydromancerFlowUntil ?? 0;

  // Mirror to old player.flags too, because some UI/debug code may inspect flags.
  player.flags = player.flags || {};
  player.flags.oathboundRiposteUntil = player.flags.oathboundRiposteUntil ?? state.oathboundRiposteUntil;
  player.flags.oathboundRiposteStacks = player.flags.oathboundRiposteStacks ?? state.oathboundRiposteStacks;
  player.flags.combatReloadUntil = player.flags.combatReloadUntil ?? state.combatReloadUntil;
  player.flags.combatReloadStacks = player.flags.combatReloadStacks ?? state.combatReloadStacks;
  player.flags.livingBulwarkUntil = player.flags.livingBulwarkUntil ?? state.livingBulwarkUntil;
  player.flags.livingBulwarkCooldown = player.flags.livingBulwarkCooldown ?? state.livingBulwarkCooldown;
  player.flags.deathHarvestKills = player.flags.deathHarvestKills ?? state.deathHarvestKills;
  player.flags.hydromancerFlowStacks = player.flags.hydromancerFlowStacks ?? state.hydromancerFlowStacks;
  player.flags.hydromancerFlowUntil = player.flags.hydromancerFlowUntil ?? state.hydromancerFlowUntil;

  return state;
}

export function updateClassPassives(player, dt, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) return;

  if (state.livingBulwarkCooldown > 0) {
    state.livingBulwarkCooldown = Math.max(0, state.livingBulwarkCooldown - dt);
  }

  if (state.oathboundRiposteUntil > 0 && now > state.oathboundRiposteUntil) {
    state.oathboundRiposteUntil = 0;
    state.oathboundRiposteStacks = 0;
  }

  if (state.combatReloadUntil > 0 && now > state.combatReloadUntil) {
    state.combatReloadUntil = 0;
    state.combatReloadStacks = 0;
  }

  if (state.livingBulwarkUntil > 0 && now > state.livingBulwarkUntil) {
    state.livingBulwarkUntil = 0;
  }

  if (state.hydromancerFlowUntil > 0 && now > state.hydromancerFlowUntil) {
    state.hydromancerFlowUntil = 0;
    state.hydromancerFlowStacks = 0;
  }

  syncPassiveFlags(player);
}

// Waverider casts build Flow. Once three stacks are ready, the next water
// ability consumes them and receives its bespoke empowered payoff.
export function cycleHydromancerFlow(player, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state || normalizeClassId(player?.classId) !== 'waverider') return { empowered: false, stacks: 0 };

  if (state.hydromancerFlowStacks >= 3 && state.hydromancerFlowUntil > now) {
    state.hydromancerFlowStacks = 0;
    state.hydromancerFlowUntil = 0;
    addFloatingText(player, PASSIVE_TEXT.hydromancerFlowRelease, {
      preset: 'status',
      color: '#59d7e8',
      offsetY: -58,
      ttl: 0.9,
      size: 12
    });
    syncPassiveFlags(player);
    return { empowered: true, stacks: 0 };
  }

  state.hydromancerFlowStacks = Math.min(3, (state.hydromancerFlowStacks || 0) + 1);
  state.hydromancerFlowUntil = now + PASSIVE_TIMERS.hydromancerFlowDuration;
  addFloatingText(player, state.hydromancerFlowStacks >= 3 ? 'Flow Ready' : `Flow x${state.hydromancerFlowStacks}`, {
    preset: 'status',
    color: '#8feaf2',
    offsetY: -58,
    ttl: 0.65,
    size: 11
  });
  syncPassiveFlags(player);
  return { empowered: false, stacks: state.hydromancerFlowStacks };
}

// -----------------------------------------------------------------------------
// DASH / BLOCK / DAMAGE HOOKS
// -----------------------------------------------------------------------------

export function onPlayerDash(player, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) return;

  if (normalizeClassId(player?.classId) !== 'fellhunter') return;

  const archeryLevel = fellhunterTrainingLevel(player);
  const stacks = archeryLevel >= 25 ? 2 : 1;

  state.combatReloadUntil = now + PASSIVE_TIMERS.mercenaryReloadDuration;
  state.combatReloadStacks = Math.max(state.combatReloadStacks || 0, stacks);

  addFloatingText(player, PASSIVE_TEXT.mercenaryReady, {
    preset: 'status',
    color: '#ef8b58',
    offsetY: -54,
    ttl: 0.8,
    size: 12
  });

  syncPassiveFlags(player);
}

export function onPlayerBlockedDamage(player, result, attacker = null, world = null, log = null, now = performance.now() / 1000) {
  onSubclassBlocked(player,result,attacker,world,now);
  const state = ensurePassiveState(player);
  if (!state) return;

  if (isOathkeeper(player) && result?.blocked && !result?.guardBroken) {
    const bladeLevel = getSafeSkillLevel(player, 'blunt');
    const treeBonuses = getSkillTreeBonuses(player);
    const stacks = bladeLevel >= 25 || (treeBonuses.ripostePowerPct || 0) >= 10 ? 2 : 1;

    state.oathboundRiposteUntil = now + PASSIVE_TIMERS.oathkeeperConvictionDuration;
    state.oathboundRiposteStacks = Math.min(3, Math.max(state.oathboundRiposteStacks || 0, stacks));

    addFloatingText(player, `${PASSIVE_TEXT.oathkeeperReady} x${state.oathboundRiposteStacks}`,
    {
      preset: 'status',
      color: '#ffcc66',
      offsetY: -54,
      ttl: 0.8,
      size: 12
    });
  }

  if (player?.classId === 'thornbinder') {
    triggerLivingBulwark(player, attacker, world, log, now);
  }

  syncPassiveFlags(player);
}

export function onPlayerTookDamage(player, amount, attacker = null, world = null, log = null, now = performance.now() / 1000) {
  const damage = Math.max(0, Math.floor(amount || 0));
  if (damage <= 0) return;
  onSubclassDamaged(player,damage,attacker,world,now);

  if (player?.classId !== 'thornbinder') return;

  triggerLivingBulwark(player, attacker, world, log, now);
}

// -----------------------------------------------------------------------------
// ATTACK DAMAGE HOOKS
// -----------------------------------------------------------------------------
// Call before damage is applied. Returns adjusted damage and passive metadata.

export function applyOutgoingClassPassiveDamage(player, target, baseDamage, context = {}, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) {
    return {
      damage: Math.max(0, Math.floor(baseDamage || 0)),
      consumedPassive: null
    };
  }

  let damage = Math.max(0, Math.floor(subclassWeaponDamage(player,target,baseDamage||0,now)));
  let consumedPassive = null;

  const weaponType = context.weaponType || context.kind || null;
  const skill = context.skill || null;
  const isRanged =
    context.ranged === true ||
    weaponType === 'bow' ||
    context.projectile === true ||
    skill === 'archery';

  const isMelee =
    !isRanged && (
      context.melee === true ||
      ['sword', 'mace', 'hammer', 'scythe', 'staff'].includes(weaponType) ||
      weaponType === 'eldritch' ||
      ['blade', 'blunt', 'spirit', 'warding'].includes(skill)
    );

  if (
    isOathkeeper(player) &&
    isMelee &&
    state.oathboundRiposteStacks > 0 &&
    state.oathboundRiposteUntil > now
  ) {
    const bladeLevel = getSafeSkillLevel(player, 'blunt');
    const treeBonuses = getSkillTreeBonuses(player);
    const bonus = 1.25 + Math.min(0.35, bladeLevel * 0.006) + Math.min(0.2, (treeBonuses.ripostePowerPct || 0) / 100);

    damage = Math.ceil(damage * bonus);
    state.oathboundRiposteStacks -= 1;
    consumedPassive = 'oathboundRiposte';

    if (state.oathboundRiposteStacks <= 0) {
      state.oathboundRiposteStacks = 0;
      state.oathboundRiposteUntil = 0;
    }

    if (target) {
      addFloatingText(target, 'Conviction', {
        preset: 'status',
        color: '#ffcc66',
        offsetY: -58,
        ttl: 0.75,
        size: 12
      });
    }
  }

  if (
    normalizeClassId(player.classId) === 'fellhunter' &&
    (isRanged || isMelee) &&
    state.combatReloadStacks > 0 &&
    state.combatReloadUntil > now
  ) {
    const archeryLevel = fellhunterTrainingLevel(player);
    const bonus = 1.2 + Math.min(0.3, archeryLevel * 0.005);

    damage = Math.ceil(damage * bonus);
    state.combatReloadStacks -= 1;
    consumedPassive = 'combatReload';

    if (state.combatReloadStacks <= 0) {
      state.combatReloadStacks = 0;
      state.combatReloadUntil = 0;
    }

    if (target) {
      addFloatingText(target, 'Tactical Advantage', {
        preset: 'status',
        color: '#ef8b58',
        offsetY: -58,
        ttl: 0.75,
        size: 12
      });
    }
  }

  if (
    normalizeClassId(player.classId) === 'fellhunter' &&
    target &&
    Math.max(Number(target.fellhunterExposedUntil || 0), Number(target.mercenaryMarkedUntil || 0)) > now
  ) {
    const treeBonuses = getSkillTreeBonuses(player);
    const exposedBonus = Math.max(
      0,
      Number(target.fellhunterExposedBonusPct || target.mercenaryMarkBonusPct || 10) +
      Number(treeBonuses.exposedDamagePct || 0)
    );
    damage = Math.ceil(damage * (1 + Math.min(36, exposedBonus) / 100));
  }

  if (
    player.classId === 'eldritch' &&
    (weaponType === 'eldritch' || skill === 'spirit')
  ) {
    const spiritLevel = getSafeSkillLevel(player, 'spirit');
    const treeBonuses = getSkillTreeBonuses(player);
    const bonus = 1.08 + Math.min(0.22, spiritLevel * 0.004) + Math.min(0.12, (treeBonuses.spiritDamagePct || 0) / 100);

    damage = Math.ceil(damage * bonus);
  }

  syncPassiveFlags(player);

  return {
    damage,
    consumedPassive
  };
}

// -----------------------------------------------------------------------------
// KILL HOOK
// -----------------------------------------------------------------------------

export function onEnemyKilledByPlayer(player, enemy, world = null, log = null, now = performance.now() / 1000) {
  onSubclassKill(player,enemy,world,now);
  const state = ensurePassiveState(player);
  if (!state) return;

  if (player?.classId !== 'gravecaller' && player?.classId !== 'necromancer') return;

  const spiritLevel = getSafeSkillLevel(player, 'spirit');
  const spiritRestore = Math.max(2, Math.ceil(4 + spiritLevel * 0.12));

  if (player.spiritAwakened) {
    player.spirit = Math.min(player.maxSpirit || 0, (player.spirit || 0) + spiritRestore);
  }

  state.deathHarvestKills += 1;

  addFloatingText(player, PASSIVE_TEXT.necroHarvest, {
    preset: 'spirit',
    color: '#b68cff',
    offsetY: -58,
    ttl: 0.9,
    size: 12
  });

  if (player.spiritAwakened) {
    addFloatingText(player, `+${spiritRestore} Spirit`, {
      preset: 'spirit',
      color: '#b68cff',
      offsetY: -88,
      ttl: 0.9,
      size: 12
    });
  }

  syncPassiveFlags(player);
}

// -----------------------------------------------------------------------------
// PASSIVE DISPLAY HELPERS
// -----------------------------------------------------------------------------

export function getActivePassiveLabels(player, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) return [];

  const labels = [];

  if (state.oathboundRiposteStacks > 0 && state.oathboundRiposteUntil > now) {
    labels.push({
      id: 'oathkeeperConviction',
      label: `Conviction x${state.oathboundRiposteStacks}`,
      color: '#ffcc66'
    });
  }

  if (state.combatReloadStacks > 0 && state.combatReloadUntil > now) {
    labels.push({
      id: 'combatReload',
      label: `Tactical Advantage x${state.combatReloadStacks}`,
      color: '#ef8b58'
    });
  }

  if (state.livingBulwarkUntil > now) {
    labels.push({
      id: 'livingBulwark',
      label: 'Briar Guard',
      color: '#73d18a'
    });
  }

  if (Number(player?.thornbinder?.briarBloomUntil || 0) > now) {
    labels.push({
      id: 'briarBloom',
      label: 'Briar Bloom',
      color: '#d8b86a'
    });
  }

  if (state.hydromancerFlowStacks > 0 && state.hydromancerFlowUntil > now) {
    labels.push({
      id: 'hydromancerFlow',
      label: state.hydromancerFlowStacks >= 3 ? 'Flow Ready' : `Flow x${state.hydromancerFlowStacks}`,
      color: '#59d7e8'
    });
  }

  const morphResources=getSubclassResourceLabel(player);
  if(morphResources)labels.push(morphResources);
  return labels;
}

export function getClassPassiveDescription(player) {
  if(getPlayerSubclass(player))return getPlayerSubclass(player).mechanic;
  const classDef = getClassDefinition(player?.classId);
  return classDef?.passive?.desc || 'No class passive selected.';
}

export function getClassPassiveName(player) {
  if(getPlayerSubclass(player))return getPlayerSubclass(player).name;
  const classDef = getClassDefinition(player?.classId);
  return classDef?.passive?.name || 'None';
}

// -----------------------------------------------------------------------------
// INTERNAL PASSIVE LOGIC
// -----------------------------------------------------------------------------

function triggerLivingBulwark(player, attacker = null, world = null, log = null, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) return false;

  if (state.livingBulwarkCooldown > 0) {
    return false;
  }

  const wardingLevel = getSafeSkillLevel(player, 'warding');
  const treeBonuses = getSkillTreeBonuses(player);

  const heal = Math.max(2, Math.ceil(2 + wardingLevel * 0.06 + (treeBonuses.healingPower || 0) * 0.25));
  const thornDamage = Math.max(2, Math.ceil(3 + wardingLevel * 0.12 + (treeBonuses.thornsPct || 0) * 0.18));

  player.hp = Math.min(player.maxHp || 100, (player.hp || 0) + heal);

  state.livingBulwarkUntil = now + PASSIVE_TIMERS.thornbinderBulwarkDuration;
  state.livingBulwarkCooldown = PASSIVE_TIMERS.thornbinderBulwarkCooldown;

  addFloatingText(player, PASSIVE_TEXT.thornbinderBulwark, {
    preset: 'heal',
    color: '#73d18a',
    offsetY: -58,
    ttl: 0.9,
    size: 12
  });

  addFloatingText(player, `+${heal}`, {
    preset: 'heal',
    color: '#73d18a',
    offsetY: -72,
    ttl: 0.75,
    size: 12
  });

  if (attacker && !attacker.dead && attacker.hp > 0) {
    attacker.hp = Math.max(0, attacker.hp - thornDamage);
    attacker.hitFlash = 0.12;

    addFloatingText(attacker, `${thornDamage}`, {
      preset: 'damage',
      color: '#73d18a',
      offsetY: -42,
      ttl: 0.8,
      size: 13
    });

    addFloatingText(attacker, PASSIVE_TEXT.thornRetaliation, {
      preset: 'status',
      color: '#73d18a',
      offsetY: -58,
      ttl: 0.7,
      size: 11
    });
  }

  syncPassiveFlags(player);
  return true;
}

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

function isOathkeeper(player) {
  return normalizeClassId(player?.classId) === 'oathkeeper';
}

function getSafeSkillLevel(player, skillId) {
  try {
    return getSkillLevel(player?.skillState, skillId) || 1;
  } catch {
    return 1;
  }
}

function syncPassiveFlags(player) {
  if (!player?.passiveState) return;

  player.flags = player.flags || {};

  player.flags.oathboundRiposteUntil = player.passiveState.oathboundRiposteUntil;
  player.flags.oathboundRiposteStacks = player.passiveState.oathboundRiposteStacks;

  player.flags.combatReloadUntil = player.passiveState.combatReloadUntil;
  player.flags.combatReloadStacks = player.passiveState.combatReloadStacks;

  player.flags.livingBulwarkUntil = player.passiveState.livingBulwarkUntil;
  player.flags.livingBulwarkCooldown = player.passiveState.livingBulwarkCooldown;

  player.flags.deathHarvestKills = player.passiveState.deathHarvestKills;
  player.flags.hydromancerFlowStacks = player.passiveState.hydromancerFlowStacks;
  player.flags.hydromancerFlowUntil = player.passiveState.hydromancerFlowUntil;
}
