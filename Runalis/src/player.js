// player.js
// Player creation, inventory, equipment, XP, classes, derived stats,
// combat level, class level, and stat scaling.
//
// Updated:
// - HP now scales from Combat Level + Class Level.
// - Stamina now scales from Combat Level + Class Level.
// - Spirit now scales from Combat Level + Class Level once awakened.
// - Removed old skill-specific max HP/Stamina/Spirit rewards.
// - Class ability IDs now match actual data.js IDs.
// - R/class second ability unlocks at class skill level 8.
// - Keeps save migration, legacy skill bridge, inventory, equipment, and class systems intact.

import { ITEMS } from './data.js';

import {
  createNewSkillState,
  addSkillXP,
  getSkillLevel,
  getSkillDefinition,
  getXPRequiredForNextLevel,
  migrateSkillState,
  syncLegacySkills,
  getCharacterBuildName,
  getCombatLevel,
  getClassCombatLevel,
  getCombatLevelDetails,
  getClassCombatLevelProgress,
  getProgressionSummary
} from './skills.js';

// -----------------------------------------------------------------------------
// BALANCE
// -----------------------------------------------------------------------------

const CLASS_SECOND_ABILITY_UNLOCK_LEVEL = 8;

const BASE_HP = 100;
const HP_PER_COMBAT_LEVEL = 8;
const HP_PER_CLASS_LEVEL = 4;

const BASE_STAMINA = 100;
const STAMINA_PER_COMBAT_LEVEL = 3;
const STAMINA_PER_CLASS_LEVEL = 2;

const BASE_SPIRIT = 25;
const SPIRIT_PER_COMBAT_LEVEL = 2;
const SPIRIT_PER_CLASS_LEVEL = 3;
const NECROMANCER_SPIRIT_BONUS_PER_CLASS_LEVEL = 3;

// -----------------------------------------------------------------------------
// CLASS DATA
// -----------------------------------------------------------------------------

export const RUNALIS_CLASSES = {
  templar: {
    id: 'templar',
    name: 'Templar',
    skill: 'blade',
    xpMultiplier: 1.5,
    weaponType: 'sword',
    qAbility: 'heavyCut',
    eAbility: 'cleavingStep',
    instructorName: 'Oathbound Templar'
  },

  mercenary: {
    id: 'mercenary',
    name: 'Mercenary',
    skill: 'archery',
    xpMultiplier: 1.5,
    weaponType: 'bow',
    qAbility: 'quickShot',
    eAbility: 'markedArrow',
    instructorName: 'Sellsword Ranger'
  },

  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    skill: 'spirit',
    xpMultiplier: 1.5,
    weaponType: 'scythe',
    qAbility: 'graveSpark',
    eAbility: 'summonLich',
    instructorName: 'Gravecaller'
  },

  thornbinder: {
    id: 'thornbinder',
    name: 'Thornbinder',
    skill: 'warding',
    xpMultiplier: 1.5,
    weaponType: 'staff',
    qAbility: 'vineWhip',
    eAbility: 'summonThornbeast',
    instructorName: 'Wild Oathkeeper'
  }
};

export function getClassDefinition(classId) {
  return RUNALIS_CLASSES[classId] || null;
}

export function getClassDisplayName(player) {
  migratePlayer(player);
  return player.className || 'None';
}

export function getClassSkillDisplayName(player) {
  migratePlayer(player);

  if (!player.classSkill) return '—';

  const def = getSkillDefinition(player.classSkill);
  return def?.name || player.classSkill;
}

export function getClassXpBonusDisplay(player) {
  migratePlayer(player);

  if (!player.classSkill || !player.classXpMultiplier || player.classXpMultiplier <= 1) {
    return '—';
  }

  const bonusPercent = Math.round((player.classXpMultiplier - 1) * 100);
  return `+${bonusPercent}%`;
}

export function getPlayerCombatLevelDisplay(player) {
  migratePlayer(player);

  const details = getCombatLevelDetails(player.skillState);

  return {
    level: player.combatLevel || details.level,
    rankName: details.rankName,
    highestSkill: details.highestSkill,
    averageCombatLevel: details.averageCombatLevel
  };
}

export function getPlayerClassLevelDisplay(player) {
  migratePlayer(player);

  return getClassCombatLevelProgress(player);
}

export function getPlayerProgressionSummary(player) {
  migratePlayer(player);

  return getProgressionSummary(player);
}

// -----------------------------------------------------------------------------
// PLAYER CREATION
// -----------------------------------------------------------------------------

export function createPlayer(name = 'Wayfarer') {
  const player = {
    name,

    // Position / movement
    x: 11 * 32,
    y: 27 * 32,
    r: 14,
    dirX: 1,
    dirY: 0,
    walkTime: 0,

    // Human starting state
    hp: BASE_HP,
    maxHp: BASE_HP,
    stamina: BASE_STAMINA,
    maxStamina: BASE_STAMINA,

    // Spirit begins dormant unless awakened by shrine/class.
    spirit: 0,
    maxSpirit: 0,
    spiritAwakened: false,

    gold: 0,

    // Infinite skill system
    skillState: createNewSkillState(),

    // Temporary compatibility bridge for older scripts.
    skills: {},

    // Identity
    className: null,
    classId: null,
    classSkill: null,
    classXpMultiplier: 1,

    // Derived progression
    combatLevel: 1,
    classLevel: 0,

    pathName: 'Human Wanderer',
    title: 'Wanderer',
    origin: 'Unknown',

    // Cosmetic model values used by humanRenderer.js
    skin: '#ffd1bd',
    hair: '#0b0d12',
    shirt: '#f2a51f',
    pants: '#293fba',
    boots: '#3a2a22',

    // Combat loadout
    loadout: {
      primarySkill: 'blade',
      blockSkill: 'warding',
      abilitySlots: [null, null, null, null]
    },

    unlockedAbilities: [],

    inventory: [],

    equipment: {
      weapon: null,
      helm: null,
      chest: null,
      legs: null,
      trinket: null
    },

    quest: {
      firstOath: 0,
      hungryShrine: 0,
      hollowlings: 0
    },

    flags: {
      wardUntil: 0,
      guardUntil: 0,
      ironOathUntil: 0,
      oathguardUntil: 0,
      guarding: false
    },

    cooldowns: {},
    summonCooldowns: {},
    summons: [],
    traps: [],
    combatEffects: [],
    floatingTexts: []
  };

  refreshDerivedProgression(player, true);
  return syncLegacySkills(player);
}

// -----------------------------------------------------------------------------
// MIGRATION
// -----------------------------------------------------------------------------

export function migratePlayer(player) {
  if (!player) return player;

  migrateSkillState(player);

  // Class fields.
  player.className = player.className ?? null;
  player.classId = player.classId ?? getClassIdFromName(player.className);
  player.classSkill = player.classSkill ?? getClassSkillFromName(player.className);
  player.classXpMultiplier = player.classXpMultiplier ?? (player.classSkill ? 1.5 : 1);

  if (!player.className) {
    player.classId = null;
    player.classSkill = null;
    player.classXpMultiplier = 1;
  }

  // Fix bad/older class data where class name existed but id/skill was missing.
  if (player.className && !player.classId) {
    player.classId = getClassIdFromName(player.className);
  }

  if (player.classId && RUNALIS_CLASSES[player.classId]) {
    const classData = RUNALIS_CLASSES[player.classId];

    player.className = classData.name;
    player.classSkill = classData.skill;
    player.classXpMultiplier = classData.xpMultiplier || 1.5;
  }

  player.pathName = player.pathName ?? getCharacterBuildName(player.skillState);
  player.title = player.title ?? 'Wanderer';
  player.origin = player.origin ?? 'Unknown';

  player.x = player.x ?? 11 * 32;
  player.y = player.y ?? 27 * 32;
  player.r = player.r ?? 14;
  player.dirX = player.dirX ?? 1;
  player.dirY = player.dirY ?? 0;
  player.walkTime = player.walkTime ?? 0;

  player.hp = Number.isFinite(player.hp) ? player.hp : BASE_HP;
  player.maxHp = Number.isFinite(player.maxHp) ? player.maxHp : BASE_HP;
  player.stamina = Number.isFinite(player.stamina) ? player.stamina : BASE_STAMINA;
  player.maxStamina = Number.isFinite(player.maxStamina) ? player.maxStamina : BASE_STAMINA;

  player.spirit = Number.isFinite(player.spirit) ? player.spirit : 0;
  player.maxSpirit = Number.isFinite(player.maxSpirit) ? player.maxSpirit : 0;
  player.spiritAwakened = player.spiritAwakened ?? player.maxSpirit > 0;

  player.gold = player.gold ?? 0;

  player.skin = player.skin ?? '#ffd1bd';
  player.hair = player.hair ?? '#0b0d12';
  player.shirt = player.shirt ?? '#f2a51f';
  player.pants = player.pants ?? '#293fba';
  player.boots = player.boots ?? '#3a2a22';

  player.loadout = player.loadout ?? {
    primarySkill: 'blade',
    blockSkill: 'warding',
    abilitySlots: [null, null, null, null]
  };

  player.loadout.primarySkill = player.loadout.primarySkill ?? 'blade';
  player.loadout.blockSkill = player.loadout.blockSkill ?? 'warding';
  player.loadout.abilitySlots = player.loadout.abilitySlots ?? [null, null, null, null];

  while (player.loadout.abilitySlots.length < 4) {
    player.loadout.abilitySlots.push(null);
  }

  player.unlockedAbilities = player.unlockedAbilities ?? [];
  player.inventory = player.inventory ?? [];

  player.equipment = player.equipment ?? {};
  player.equipment.weapon = player.equipment.weapon ?? null;
  player.equipment.helm = player.equipment.helm ?? null;
  player.equipment.chest = player.equipment.chest ?? null;
  player.equipment.legs = player.equipment.legs ?? null;

  // Keep old trinket naming internally, but UI can display it as Charm/Jewelry.
  player.equipment.trinket = player.equipment.trinket ?? player.equipment.jewelry ?? null;
  delete player.equipment.jewelry;

  player.quest = player.quest ?? {
    firstOath: 0,
    hungryShrine: 0,
    hollowlings: 0
  };

  player.quest.firstOath = player.quest.firstOath ?? 0;
  player.quest.hungryShrine = player.quest.hungryShrine ?? 0;
  player.quest.hollowlings = player.quest.hollowlings ?? 0;

  player.flags = player.flags ?? {};
  player.flags.wardUntil = player.flags.wardUntil ?? 0;
  player.flags.guardUntil = player.flags.guardUntil ?? 0;
  player.flags.ironOathUntil = player.flags.ironOathUntil ?? 0;
  player.flags.oathguardUntil = player.flags.oathguardUntil ?? 0;
  player.flags.guarding = player.flags.guarding ?? false;

  player.cooldowns = player.cooldowns ?? {};
  player.summonCooldowns = player.summonCooldowns ?? {};
  player.summons = Array.isArray(player.summons) ? player.summons : [];
  player.traps = Array.isArray(player.traps) ? player.traps : [];
  player.combatEffects = Array.isArray(player.combatEffects) ? player.combatEffects : [];
  player.floatingTexts = Array.isArray(player.floatingTexts) ? player.floatingTexts : [];

  // Clean old impossible cooldown states from bad saves.
  for (const key of Object.keys(player.cooldowns)) {
    if (!Number.isFinite(player.cooldowns[key]) || player.cooldowns[key] < 0) {
      player.cooldowns[key] = 0;
    }
  }

  for (const key of Object.keys(player.summonCooldowns)) {
    if (!Number.isFinite(player.summonCooldowns[key]) || player.summonCooldowns[key] < 0) {
      delete player.summonCooldowns[key];
    }
  }

  // Make sure class abilities stay correct after loading old saves.
  refreshClassUnlocks(player);

  refreshDerivedProgression(player, false);

  return syncLegacySkills(player);
}

// -----------------------------------------------------------------------------
// DERIVED PROGRESSION / VITAL STATS
// -----------------------------------------------------------------------------

function refreshDerivedProgression(player, forceFullVitals = false) {
  if (!player) return player;

  player.combatLevel = getCombatLevel(player.skillState);
  player.classLevel = getClassCombatLevel(player);
  player.pathName = getCharacterBuildName(player.skillState);

  refreshDerivedVitals(player, forceFullVitals);

  return player;
}

function refreshDerivedVitals(player, forceFullVitals = false) {
  const oldMaxHp = Math.max(1, Number(player.maxHp || BASE_HP));
  const oldMaxStamina = Math.max(1, Number(player.maxStamina || BASE_STAMINA));
  const oldMaxSpirit = Math.max(0, Number(player.maxSpirit || 0));

  const newMaxHp = calculateMaxHp(player);
  const newMaxStamina = calculateMaxStamina(player);
  const newMaxSpirit = calculateMaxSpirit(player);

  const hpDelta = newMaxHp - oldMaxHp;
  const staminaDelta = newMaxStamina - oldMaxStamina;
  const spiritDelta = newMaxSpirit - oldMaxSpirit;

  player.maxHp = newMaxHp;
  player.maxStamina = newMaxStamina;
  player.maxSpirit = newMaxSpirit;

  if (forceFullVitals) {
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.spirit = player.spiritAwakened ? player.maxSpirit : 0;
    return;
  }

  if (hpDelta > 0) {
    player.hp = Math.min(player.maxHp, Math.max(1, Number(player.hp || 1) + hpDelta));
  } else {
    player.hp = Math.min(player.maxHp, Math.max(0, Number(player.hp || 0)));
  }

  if (staminaDelta > 0) {
    player.stamina = Math.min(player.maxStamina, Math.max(0, Number(player.stamina || 0) + staminaDelta));
  } else {
    player.stamina = Math.min(player.maxStamina, Math.max(0, Number(player.stamina || 0)));
  }

  if (!player.spiritAwakened) {
    player.maxSpirit = 0;
    player.spirit = 0;
    return;
  }

  if (spiritDelta > 0) {
    player.spirit = Math.min(player.maxSpirit, Math.max(0, Number(player.spirit || 0) + spiritDelta));
  } else {
    player.spirit = Math.min(player.maxSpirit, Math.max(0, Number(player.spirit || 0)));
  }
}

export function calculateMaxHp(player) {
  const combatLevel = Math.max(1, Number(player?.combatLevel || getCombatLevel(player?.skillState) || 1));
  const classLevel = Math.max(0, Number(player?.classLevel || getClassCombatLevel(player) || 0));

  return Math.floor(
    BASE_HP +
    Math.max(0, combatLevel - 1) * HP_PER_COMBAT_LEVEL +
    classLevel * HP_PER_CLASS_LEVEL
  );
}

export function calculateMaxStamina(player) {
  const combatLevel = Math.max(1, Number(player?.combatLevel || getCombatLevel(player?.skillState) || 1));
  const classLevel = Math.max(0, Number(player?.classLevel || getClassCombatLevel(player) || 0));

  return Math.floor(
    BASE_STAMINA +
    Math.max(0, combatLevel - 1) * STAMINA_PER_COMBAT_LEVEL +
    classLevel * STAMINA_PER_CLASS_LEVEL
  );
}

export function calculateMaxSpirit(player) {
  if (!player?.spiritAwakened) return 0;

  const combatLevel = Math.max(1, Number(player?.combatLevel || getCombatLevel(player?.skillState) || 1));
  const classLevel = Math.max(0, Number(player?.classLevel || getClassCombatLevel(player) || 0));

  const necroBonus = player.classId === 'necromancer'
    ? classLevel * NECROMANCER_SPIRIT_BONUS_PER_CLASS_LEVEL
    : 0;

  return Math.floor(
    BASE_SPIRIT +
    Math.max(0, combatLevel - 1) * SPIRIT_PER_COMBAT_LEVEL +
    classLevel * SPIRIT_PER_CLASS_LEVEL +
    necroBonus
  );
}

function getClassIdFromName(className) {
  if (!className) return null;

  const lower = String(className).toLowerCase();

  for (const classId of Object.keys(RUNALIS_CLASSES)) {
    if (RUNALIS_CLASSES[classId].name.toLowerCase() === lower) {
      return classId;
    }
  }

  return null;
}

function getClassSkillFromName(className) {
  const classId = getClassIdFromName(className);
  return classId ? RUNALIS_CLASSES[classId].skill : null;
}

// -----------------------------------------------------------------------------
// CLASS SELECTION
// -----------------------------------------------------------------------------

export function chooseClass(player, classId, log) {
  migratePlayer(player);

  if (player.className) {
    log?.(`You have already chosen the path of the ${player.className}.`);
    return false;
  }

  const classData = getClassDefinition(classId);

  if (!classData) {
    log?.('That class does not exist.');
    return false;
  }

  player.classId = classData.id;
  player.className = classData.name;
  player.classSkill = classData.skill;
  player.classXpMultiplier = classData.xpMultiplier || 1.5;

  // Make the class skill the default active combat skill.
  if (player.loadout) {
    player.loadout.primarySkill = classData.skill;
  }

  player.unlockedAbilities = player.unlockedAbilities || [];
  player.loadout = player.loadout || {};
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < 4) {
    player.loadout.abilitySlots.push(null);
  }

  // Unlock first class ability immediately.
  unlockAbility(player, classData.qAbility);
  player.loadout.abilitySlots[0] = classData.qAbility;

  // Spirit-based class should awaken spirit resource immediately.
  if (classData.id === 'necromancer') {
    player.spiritAwakened = true;
  }

  refreshDerivedProgression(player, false);
  refreshClassUnlocks(player, log);
  syncLegacySkills(player);

  log?.(`You chose the path of the ${classData.name}. ${skillName(classData.skill)} XP is now boosted by 50%.`);

  return true;
}

export function canUnlockClassSecondAbility(player) {
  migratePlayer(player);

  if (!player.classId || !player.classSkill) return false;

  return getSkillLevel(player.skillState, player.classSkill) >= CLASS_SECOND_ABILITY_UNLOCK_LEVEL;
}

export function refreshClassUnlocks(player, log) {
  if (!player) return false;

  player.unlockedAbilities = player.unlockedAbilities || [];
  player.loadout = player.loadout || {};
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < 4) {
    player.loadout.abilitySlots.push(null);
  }

  if (!player.classId) return false;

  const classData = getClassDefinition(player.classId);

  if (!classData) return false;

  if (classData.qAbility) {
    unlockAbility(player, classData.qAbility);

    if (!player.loadout.abilitySlots[0]) {
      player.loadout.abilitySlots[0] = classData.qAbility;
    }
  }

  if (!classData.eAbility) return false;

  if (!canUnlockClassSecondAbilityNoMigrate(player)) return false;

  if (player.unlockedAbilities.includes(classData.eAbility)) {
    if (!player.loadout.abilitySlots[1]) {
      player.loadout.abilitySlots[1] = classData.eAbility;
    }

    return false;
  }

  unlockAbility(player, classData.eAbility);

  if (!player.loadout.abilitySlots[1]) {
    player.loadout.abilitySlots[1] = classData.eAbility;
  }

  log?.(`${classData.name} technique unlocked.`);

  return true;
}

function canUnlockClassSecondAbilityNoMigrate(player) {
  if (!player.classId || !player.classSkill) return false;

  return getSkillLevel(player.skillState, player.classSkill) >= CLASS_SECOND_ABILITY_UNLOCK_LEVEL;
}

// -----------------------------------------------------------------------------
// SPIRIT AWAKENING
// -----------------------------------------------------------------------------

export function awakenSpirit(player, log) {
  migratePlayer(player);

  if (player.spiritAwakened) {
    log?.('Your spirit is already awake.');
    return false;
  }

  player.spiritAwakened = true;
  refreshDerivedProgression(player, false);
  player.spirit = Math.max(player.spirit, Math.min(player.maxSpirit, Math.max(25, Math.floor(player.maxSpirit * 0.5))));

  gainXp(player, 'spirit', 20, log);
  log?.('Something inside you wakes. Spirit is no longer dormant.');

  return true;
}

// -----------------------------------------------------------------------------
// INVENTORY
// -----------------------------------------------------------------------------

export function addItem(player, id, qty = 1) {
  const item = ITEMS[id];

  if (!item) {
    console.warn(`Unknown item: ${id}`);
    return false;
  }

  migratePlayer(player);

  const safeQty = Math.max(1, Math.floor(qty || 1));

  if (item.stack) {
    const found = player.inventory.find(i => i.id === id);

    if (found) {
      found.qty += safeQty;
    } else {
      player.inventory.push({ id, qty: safeQty });
    }
  } else {
    for (let i = 0; i < safeQty; i++) {
      player.inventory.push({ id, qty: 1 });
    }
  }

  return true;
}

export function removeItem(player, id, qty = 1) {
  if (!player) return false;

  migratePlayer(player);

  const safeQty = Math.max(1, Math.floor(qty || 1));
  const found = player.inventory.find(i => i.id === id);

  if (!found || found.qty < safeQty) return false;

  found.qty -= safeQty;

  if (found.qty <= 0) {
    player.inventory = player.inventory.filter(i => i !== found);
  }

  return true;
}

export function countItem(player, id) {
  if (!player) return 0;

  migratePlayer(player);

  return player.inventory.find(i => i.id === id)?.qty || 0;
}

// -----------------------------------------------------------------------------
// XP
// -----------------------------------------------------------------------------

export function gainXp(player, skillId, amount, log) {
  migratePlayer(player);

  const def = getSkillDefinition(skillId);

  if (!def) {
    console.warn(`Unknown skill: ${skillId}`);
    return false;
  }

  const previousCombatLevel = player.combatLevel || getCombatLevel(player.skillState);
  const previousClassLevel = player.classLevel || getClassCombatLevel(player);

  let adjustedAmount = Math.max(0, Math.floor(amount || 0));

  if (
    adjustedAmount > 0 &&
    player.classSkill &&
    skillId === player.classSkill &&
    player.classXpMultiplier &&
    player.classXpMultiplier > 1
  ) {
    adjustedAmount = Math.floor(adjustedAmount * player.classXpMultiplier);
  }

  const result = addSkillXP(player.skillState, skillId, adjustedAmount);

  refreshDerivedProgression(player, false);
  syncLegacySkills(player);

  if (result.leveledUp) {
    const newLevel = getSkillLevel(player.skillState, skillId);

    log?.(`${def.name} reached level ${newLevel}.`);

    if (player.combatLevel > previousCombatLevel) {
      log?.(`Combat Level increased to ${player.combatLevel}.`);
    }

    if (player.classLevel > previousClassLevel && skillId === player.classSkill) {
      log?.(`${player.className} Level increased to ${player.classLevel}.`);
    }

    refreshClassUnlocks(player, log);
  }

  return result.leveledUp;
}

export function skillName(skillId) {
  const def = getSkillDefinition(skillId);
  if (def) return def.name;

  return String(skillId)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase());
}

// -----------------------------------------------------------------------------
// DERIVED STATS
// -----------------------------------------------------------------------------

export function getPower(player) {
  migratePlayer(player);

  const weapon = player.equipment.weapon ? ITEMS[player.equipment.weapon] : null;
  const trinket = player.equipment.trinket ? ITEMS[player.equipment.trinket] : null;

  const primarySkill =
    weapon?.primarySkill ||
    weapon?.skill ||
    player.loadout?.primarySkill ||
    'blade';

  const primaryLevel = getSkillLevel(player.skillState, primarySkill);

  let base = 4;

  if (primarySkill === 'blade') {
    base += primaryLevel * 1.35;
  } else if (primarySkill === 'archery') {
    base += primaryLevel * 1.2;
  } else if (primarySkill === 'spirit') {
    base += primaryLevel * 1.05;
  } else if (primarySkill === 'warding') {
    base += primaryLevel * 0.95;
  } else {
    base += primaryLevel * 0.8;
  }

  const oldWeaponPower = weapon?.power || 0;
  const newWeaponBase = weapon?.baseDamage || 0;
  const trinketPower = trinket?.spirit || trinket?.power || 0;

  return base + oldWeaponPower + newWeaponBase + trinketPower;
}

export function getArmour(player) {
  migratePlayer(player);

  const helm = player.equipment.helm ? ITEMS[player.equipment.helm] : null;
  const chest = player.equipment.chest ? ITEMS[player.equipment.chest] : null;
  const legs = player.equipment.legs ? ITEMS[player.equipment.legs] : null;
  const trinket = player.equipment.trinket ? ITEMS[player.equipment.trinket] : null;

  const combatLevel = Math.max(1, player.combatLevel || 1);
  const classLevel = Math.max(0, player.classLevel || 0);

  return (
    combatLevel * 0.25 +
    classLevel * 0.18 +
    (helm?.armour || 0) +
    (chest?.armour || 0) +
    (legs?.armour || 0) +
    (trinket?.armour || 0)
  );
}

export function getSkillProgressForLegacyUI(player, skillId) {
  migratePlayer(player);

  const skill = player.skillState.skills[skillId];

  if (!skill) {
    return {
      level: 1,
      xp: 0,
      next: getXPRequiredForNextLevel(1),
      used: false,
      breakthrough: false
    };
  }

  return {
    level: skill.level,
    xp: skill.xp,
    next: getXPRequiredForNextLevel(skill.level),
    used: skill.used,
    breakthrough: false
  };
}

// -----------------------------------------------------------------------------
// LOADOUT
// -----------------------------------------------------------------------------

export function setPrimarySkill(player, skillId) {
  migratePlayer(player);

  if (!getSkillDefinition(skillId)) return false;

  player.loadout.primarySkill = skillId;
  syncLegacySkills(player);
  refreshDerivedProgression(player, false);

  return true;
}

export function setBlockSkill(player, skillId) {
  migratePlayer(player);

  if (!getSkillDefinition(skillId)) return false;

  player.loadout.blockSkill = skillId;
  syncLegacySkills(player);
  refreshDerivedProgression(player, false);

  return true;
}

export function unlockAbility(player, abilityId) {
  if (!player || !abilityId) return false;

  player.unlockedAbilities = player.unlockedAbilities || [];

  if (!player.unlockedAbilities.includes(abilityId)) {
    player.unlockedAbilities.push(abilityId);
    return true;
  }

  return false;
}

export function equipAbility(player, slotIndex, abilityId) {
  migratePlayer(player);

  if (slotIndex < 0 || slotIndex >= player.loadout.abilitySlots.length) {
    return false;
  }

  if (!player.unlockedAbilities.includes(abilityId)) {
    return false;
  }

  player.loadout.abilitySlots[slotIndex] = abilityId;
  return true;
}

// -----------------------------------------------------------------------------
// EQUIPMENT HELPERS
// -----------------------------------------------------------------------------

export function getEquippedItem(player, slot) {
  migratePlayer(player);

  const itemId = player.equipment?.[slot];
  return itemId ? ITEMS[itemId] || null : null;
}

export function getEquippedWeapon(player) {
  return getEquippedItem(player, 'weapon');
}

export function getWeaponSkill(player) {
  const weapon = getEquippedWeapon(player);

  return (
    weapon?.primarySkill ||
    weapon?.skill ||
    player.loadout?.primarySkill ||
    'blade'
  );
}