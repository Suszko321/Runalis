// classPassives.js
// Runalis class passive system.
//
// This file gives each class a lightweight identity boost without bloating
// the active ability system.
//
// Current passives:
// - Templar: blocking damage empowers the next melee hit.
// - Mercenary: dashing empowers the next ranged hit.
// - Necromancer: kills restore HP and spirit.
// - Thornbinder: blocking/taking damage can trigger regen and thorn retaliation.
//
// This file is intentionally defensive. If another script calls these hooks
// before the player is fully migrated, nothing should crash.

import { addFloatingText } from './floatingText.js';
import { getSkillLevel } from './skills.js';
import { getClassDefinition } from './classData.js';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const PASSIVE_TIMERS = {
  templarRiposteDuration: 3.5,
  mercenaryReloadDuration: 2.75,
  thornbinderBulwarkDuration: 3.0,
  thornbinderBulwarkCooldown: 6.0
};

const PASSIVE_TEXT = {
  templarReady: 'Riposte Ready',
  mercenaryReady: 'Loaded Shot',
  necroHarvest: 'Death Harvest',
  thornbinderBulwark: 'Living Bulwark',
  thornRetaliation: 'Thorns'
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

    deathHarvestKills: 0
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

  // Mirror to old player.flags too, because some UI/debug code may inspect flags.
  player.flags = player.flags || {};
  player.flags.oathboundRiposteUntil = player.flags.oathboundRiposteUntil ?? state.oathboundRiposteUntil;
  player.flags.oathboundRiposteStacks = player.flags.oathboundRiposteStacks ?? state.oathboundRiposteStacks;
  player.flags.combatReloadUntil = player.flags.combatReloadUntil ?? state.combatReloadUntil;
  player.flags.combatReloadStacks = player.flags.combatReloadStacks ?? state.combatReloadStacks;
  player.flags.livingBulwarkUntil = player.flags.livingBulwarkUntil ?? state.livingBulwarkUntil;
  player.flags.livingBulwarkCooldown = player.flags.livingBulwarkCooldown ?? state.livingBulwarkCooldown;
  player.flags.deathHarvestKills = player.flags.deathHarvestKills ?? state.deathHarvestKills;

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

  syncPassiveFlags(player);
}

// -----------------------------------------------------------------------------
// DASH / BLOCK / DAMAGE HOOKS
// -----------------------------------------------------------------------------

export function onPlayerDash(player, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) return;

  if (player?.classId !== 'mercenary') return;

  const archeryLevel = getSafeSkillLevel(player, 'archery');
  const stacks = archeryLevel >= 25 ? 2 : 1;

  state.combatReloadUntil = now + PASSIVE_TIMERS.mercenaryReloadDuration;
  state.combatReloadStacks = Math.max(state.combatReloadStacks || 0, stacks);

  addFloatingText(player, PASSIVE_TEXT.mercenaryReady, {
    preset: 'status',
    color: '#6fa8ef',
    offsetY: -54,
    ttl: 0.8,
    size: 12
  });

  syncPassiveFlags(player);
}

export function onPlayerBlockedDamage(player, result, attacker = null, world = null, log = null, now = performance.now() / 1000) {
  const state = ensurePassiveState(player);
  if (!state) return;

  if (player?.classId === 'templar' && result?.blocked && !result?.guardBroken) {
    const bladeLevel = getSafeSkillLevel(player, 'blade');
    const stacks = bladeLevel >= 25 ? 2 : 1;

    state.oathboundRiposteUntil = now + PASSIVE_TIMERS.templarRiposteDuration;
    state.oathboundRiposteStacks = Math.max(state.oathboundRiposteStacks || 0, stacks);

    addFloatingText(player, PASSIVE_TEXT.templarReady, {
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

  let damage = Math.max(0, Math.floor(baseDamage || 0));
  let consumedPassive = null;

  const weaponType = context.weaponType || context.kind || null;
  const skill = context.skill || null;
  const isRanged =
    context.ranged === true ||
    weaponType === 'bow' ||
    context.projectile === true ||
    skill === 'archery';

  const isMelee =
    context.melee === true ||
    ['sword', 'scythe', 'staff'].includes(weaponType) ||
    ['blade', 'spirit', 'warding'].includes(skill);

  if (
    player.classId === 'templar' &&
    isMelee &&
    state.oathboundRiposteStacks > 0 &&
    state.oathboundRiposteUntil > now
  ) {
    const bladeLevel = getSafeSkillLevel(player, 'blade');
    const bonus = 1.25 + Math.min(0.35, bladeLevel * 0.006);

    damage = Math.ceil(damage * bonus);
    state.oathboundRiposteStacks -= 1;
    consumedPassive = 'oathboundRiposte';

    if (state.oathboundRiposteStacks <= 0) {
      state.oathboundRiposteStacks = 0;
      state.oathboundRiposteUntil = 0;
    }

    if (target) {
      addFloatingText(target, 'Riposte', {
        preset: 'status',
        color: '#ffcc66',
        offsetY: -58,
        ttl: 0.75,
        size: 12
      });
    }
  }

  if (
    player.classId === 'mercenary' &&
    isRanged &&
    state.combatReloadStacks > 0 &&
    state.combatReloadUntil > now
  ) {
    const archeryLevel = getSafeSkillLevel(player, 'archery');
    const bonus = 1.2 + Math.min(0.3, archeryLevel * 0.005);

    damage = Math.ceil(damage * bonus);
    state.combatReloadStacks -= 1;
    consumedPassive = 'combatReload';

    if (state.combatReloadStacks <= 0) {
      state.combatReloadStacks = 0;
      state.combatReloadUntil = 0;
    }

    if (target) {
      addFloatingText(target, 'Loaded Shot', {
        preset: 'status',
        color: '#6fa8ef',
        offsetY: -58,
        ttl: 0.75,
        size: 12
      });
    }
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
  const state = ensurePassiveState(player);
  if (!state) return;

  if (player?.classId !== 'necromancer') return;

  const spiritLevel = getSafeSkillLevel(player, 'spirit');

  const heal = Math.max(2, Math.ceil(3 + spiritLevel * 0.08));
  const spiritRestore = Math.max(2, Math.ceil(4 + spiritLevel * 0.12));

  player.hp = Math.min(player.maxHp || 100, (player.hp || 0) + heal);

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

  addFloatingText(player, `+${heal} HP`, {
    preset: 'heal',
    color: '#73d18a',
    offsetY: -72,
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
      id: 'oathboundRiposte',
      label: `Riposte x${state.oathboundRiposteStacks}`,
      color: '#ffcc66'
    });
  }

  if (state.combatReloadStacks > 0 && state.combatReloadUntil > now) {
    labels.push({
      id: 'combatReload',
      label: `Loaded Shot x${state.combatReloadStacks}`,
      color: '#6fa8ef'
    });
  }

  if (state.livingBulwarkUntil > now) {
    labels.push({
      id: 'livingBulwark',
      label: 'Living Bulwark',
      color: '#73d18a'
    });
  }

  return labels;
}

export function getClassPassiveDescription(player) {
  const classDef = getClassDefinition(player?.classId);
  return classDef?.passive?.desc || 'No class passive selected.';
}

export function getClassPassiveName(player) {
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

  const heal = Math.max(2, Math.ceil(2 + wardingLevel * 0.06));
  const thornDamage = Math.max(2, Math.ceil(3 + wardingLevel * 0.12));

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
}