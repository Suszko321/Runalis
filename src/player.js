import {HOTBAR_SLOT_COUNT,HOTBAR_LAYOUT_VERSION} from './hotbarConfig.js';
import {normalizeEquipmentProgression,createGearEntry,isTieredEquipment,getEquipmentTierBonus} from './equipmentProgressionSystem.js';
import {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';
import {migrateLichSummons} from './lichSummonSystem.js';
import {normalizeSubclassState} from './subclassSystem.js';
import {isClassAvailable} from './classData.js';
import { migrateLegendarySummonAccess } from './skillScrollSystem.js';
import { affinityMultiplier, getClassAffinities, weaponProficiency } from './progressionProfiles.js';
import { safeXP, levelStat, levelPower } from './progressionMath.js';
import { normalizeAbilityMastery, awardHotbarMasteryXp } from './abilityMasterySystem.js';
// player.js
// Player creation, inventory, equipment, XP, classes, derived stats,
// combat level and stat scaling.
//
// Updated:
// - HP now scales from Hitpoints + Level.
// - Stamina now scales from Stamina + Level.
// - Spirit now scales from Spirit + Level once awakened.
// - Removed old skill-specific max HP/Stamina/Spirit rewards.
// - Class ability IDs now match actual data.js IDs.
// - Class active abilities now unlock from skill-tree nodes after the starter.
// - Keeps save migration, legacy skill bridge, inventory, equipment, and class systems intact.

import { ITEMS, getAbilityById, normalizeAbilityId } from './data.js';

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
  getCombatLevelDetails,
  getProgressionSummary
} from './skills.js';

import {
  getEquipmentStatBonuses
} from './setBonusSystem.js';

import {
  normalizeSkillTreeState,
  getSkillTreeBonuses
} from './skillTreeSystem.js';

import {
  ensureStoryProgress
} from './storyProgress.js';

import {
  normalizeBloodlineState
} from './bloodlineSystem.js';

import {
  normalizeAbilityManagementState,
  unlockActiveAbility,
  assignAbilityToSlot
} from './abilityLoadoutSystem.js';

import {
  normalizeAbilityUseCharges
} from './abilityChargeSystem.js';

import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';

// -----------------------------------------------------------------------------
// BALANCE
// -----------------------------------------------------------------------------

const BASE_HP = 100;
const normalizedProgressionPlayers = new WeakSet();
function ensureProgressionPlayer(player) {
  if (!normalizedProgressionPlayers.has(player)) migratePlayer(player);
}
const HP_PER_COMBAT_LEVEL = 3;
const HP_PER_HITPOINTS_LEVEL = 10;

const BASE_STAMINA = 100;
const STAMINA_PER_COMBAT_LEVEL = 3;
const STAMINA_PER_STAMINA_LEVEL = 4;

const BASE_SPIRIT = 25;
const SPIRIT_PER_COMBAT_LEVEL = 1;
const SPIRIT_PER_SPIRIT_LEVEL = 4;
const NECROMANCER_SPIRIT_BONUS_PER_SPIRIT_LEVEL = 1;

const CLASS_ID_ALIASES = {
  templar: 'oathkeeper',
  necromancer: 'gravecaller',
  hydromancer: 'waverider',
  mercenary: 'fellhunter'
};

function normalizeClassId(classId) {
  if (!classId) return classId;
  const id = String(classId).trim();
  return CLASS_ID_ALIASES[id] || id;
}

export function isGravecallerClassId(classId) {
  return normalizeClassId(classId) === 'gravecaller';
}

function isOathkeeperClassId(classId) {
  return normalizeClassId(classId) === 'oathkeeper';
}

// -----------------------------------------------------------------------------
// CLASS DATA
// -----------------------------------------------------------------------------

export const RUNALIS_CLASSES = {
  classless: {
    id: 'classless',
    name: 'Classless',
    skill: null,
    xpMultiplier: 1.25,
    weaponType: 'sword',
    qAbility: null,
    eAbility: null,
    abilitySlots: [null, null, null, null, 'block'],
    instructorName: null
  },

  oathkeeper: {
    id: 'oathkeeper',
    name: 'Oathkeeper',
    skill: 'blunt',
    xpMultiplier: 1.25,
    weaponType: 'mace',
    qAbility: 'oathkeeperOathStrike',
    eAbility: 'oathkeeperDivineLeap',
    instructorName: 'Oathkeeper Elian'
  },

  fellhunter: {
    id: 'fellhunter',
    name: 'Fellhunter',
    skill: 'archery',
    xpMultiplier: 1.25,
    weaponType: 'bow',
    qAbility: 'fellhunterThrowingDaggers',
    eAbility: 'fellhunterBearTrap',
    abilitySlots: ['fellhunterThrowingDaggers', null, null, null, 'block'],
    instructorName: 'Bram'
  },

  gravecaller: {
    id: 'gravecaller',
    name: 'Gravecaller',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'scythe',
    qAbility: 'graveSpark',
    eAbility: 'summonLich',
    instructorName: 'Gravecaller'
  },

  thornbinder: {
    id: 'thornbinder',
    name: 'Thornbinder',
    skill: 'warding',
    xpMultiplier: 1.25,
    weaponType: 'staff',
    qAbility: 'thornbinderThornLash',
    eAbility: 'thornbinderBramblePatch',
    instructorName: 'Mara Vell'
  },

  waverider: {
    id: 'waverider',
    name: 'Waverider',
    skill: 'warding',
    xpMultiplier: 1.25,
    weaponType: 'sword',
    qAbility: 'hydromancerWaterTorrent',
    eAbility: 'hydromancerBubbleWard',
    instructorName: 'Tideglass Adept'
  },

  lightbringer: {
    id: 'lightbringer',
    name: 'Lightbringer',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'spiritFocus',
    qAbility: 'lightbringerGleamBolt',
    eAbility: 'lightbringerDawncarver',
    instructorName: 'Lumen Sable'
  },

  eldritch: {
    id: 'eldritch',
    name: 'Eldritch',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'eldritch',
    qAbility: 'voidstepBurst',
    eAbility: 'summonEldritchHorror',
    instructorName: 'The Red Door'
  }
};

RUNALIS_CLASSES.necromancer = {
  ...RUNALIS_CLASSES.gravecaller,
  id: 'necromancer',
  aliasFor: 'gravecaller',
  hidden: true
};

RUNALIS_CLASSES.templar = {
  ...RUNALIS_CLASSES.oathkeeper,
  id: 'templar',
  aliasFor: 'oathkeeper',
  hidden: true
};

RUNALIS_CLASSES.hydromancer = {
  ...RUNALIS_CLASSES.waverider,
  id: 'hydromancer',
  aliasFor: 'waverider',
  hidden: true
};

RUNALIS_CLASSES.mercenary = {
  ...RUNALIS_CLASSES.fellhunter,
  id: 'mercenary',
  aliasFor: 'fellhunter',
  hidden: true
};

export function getClassDefinition(classId) {
  return RUNALIS_CLASSES[normalizeClassId(classId)] || null;
}

export function getClassDisplayName(player) {
  migratePlayer(player);
  return player.className || 'None';
}

export function getClassSkillDisplayName(player) {
  migratePlayer(player);

  return getClassAffinities(player).map(skillName).join(' / ');
}

export function getClassXpBonusDisplay(player) {
  migratePlayer(player);

  return '+25%';
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

  return {
    classId: player.classId || null,
    className: player.className || 'Classless',
    skillId: player.classSkill || null,
    skillName: player.classSkill ? skillName(player.classSkill) : null,
    level: 0,
    xp: 0,
    next: 0,
    percent: 0,
    rankName: 'Class level removed'
  };
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
    profileId: null,
    profileName: name,
    profileSlot: 'player1',
    playerNumber: 1,
    saveVersion: 15,

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
    level: 1,
    xp: 0,
    stats: {},
    currentZone: ACT1_OVERWORLD_DISPLAY_NAME,
    currentPosition: {
      x: 11 * 32,
      y: 27 * 32
    },
    lastSafeLocation: {
      worldMode: 'overworld',
      worldName: ACT1_OVERWORLD_DISPLAY_NAME,
      x: 11 * 32,
      y: 27 * 32,
      recordedAt: 0
    },

    // Infinite skill system
    skillState: createNewSkillState(),
    skillTree: {
      version: 1,
      spent: {}
    },

    // Temporary compatibility bridge for older scripts.
    skills: {},

    // Identity
    className: null,
    classId: null,
    abilityMorphs: {},
    abilityMorphVersion: 3,
    classSkill: null,
    classXpMultiplier: 1,
    hiddenClassUnlocks: {},

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
      abilitySlots: [null, null, null, null, 'block']
    },

    unlockedAbilities: [],
    knownAbilities: [],
    unlockedPassives: [],

    inventory: [],

    equipment: {
      weapon: null,
      helm: null,
      chest: null,
      legs: null,
      trinket: null
    },
    gearUpgrades: {},

    quest: {
      firstOath: 0,
      hungryShrine: 0,
      hollowlings: 0
    },
    quests: {
      active: {},
      completed: {}
    },
    questProgress: {},
    enteredDungeons: {},
    completedDungeons: {},
    bossKills: {},
    discoveredLocations: {},
    discoveredPois: {},
    poiEncounters: {},
    tower: {
      unlocked: false,
      highestFloor: 0,
      currentFloor: 0,
      rewardsClaimed: {}
    },
    infiniteDungeons: {
      hearthmereFrontier: {
        unlocked: true,
        highestFloor: 0,
        currentFloor: 0,
        rewardsClaimed: {}
      }
    },
    sideZones: {},
    crafting: {
      unlocked: true,
      knownRecipes: [],
      salvageCount: 0,
      upgradesPerformed: 0,
      craftCount: 0,
      cookedCount: 0,
      runecraftCount: 0,
      recipesCrafted: {},
      lastRecipeId: null
    },

    flags: {
      wardUntil: 0,
      guardUntil: 0,
      ironOathUntil: 0,
      oathguardUntil: 0,
      campPreparedUntil: 0,
      kingfinFeastUntil: 0,
      thornskinUntil: 0,
      guarding: false
    },

    cooldowns: {},
    abilityUseCharges: {},
    summonCooldowns: {},
    gravecaller: {
      path: null,
      commandMode: 'defend',
      skeletons: createDefaultGravecallerSkeletons()
    },
    lightbringer: {
      lumens: 0,
      lumenProgress: 0,
      maxLumens: 3,
      overbrightUntil: 0,
      firstSunriseUntil: 0,
      dawncarverChannel: null
    },
    bloodline: {},
    raceId: null,
    raceName: null,
    summons: [],
    traps: [],
    combatEffects: [],
    floatingTexts: []
  };

  normalizeAbilityMastery(player);

  refreshDerivedProgression(player, true);
  ensureStoryProgress(player);
  normalizedProgressionPlayers.add(player);
  return syncLegacySkills(player);
}

// -----------------------------------------------------------------------------
// MIGRATION
// -----------------------------------------------------------------------------

function normalizeLightbringerState(value) {
  const state = value && typeof value === 'object' ? value : {};
  const rawMaxLumens = Number(state.maxLumens || 3);
  const rawLumens = Number(state.lumens || 0);
  const rawProgress = Number(state.lumenProgress || 0);
  const maxLumens = Math.max(3, Math.min(3, Math.floor(Number.isFinite(rawMaxLumens) ? rawMaxLumens : 3)));
  const lumens = Math.max(0, Math.min(maxLumens, Math.floor(Number.isFinite(rawLumens) ? rawLumens : 0)));
  const lumenProgress = Math.max(0, Math.min(2.999, Number.isFinite(rawProgress) ? rawProgress : 0));

  return {
    lumens,
    lumenProgress,
    maxLumens,
    overbrightUntil: Math.max(0, Number(state.overbrightUntil || 0)),
    firstSunriseUntil: Math.max(0, Number(state.firstSunriseUntil || 0)),
    dawncarverChannel: state.dawncarverChannel && typeof state.dawncarverChannel === 'object'
      ? state.dawncarverChannel
      : null
  };
}

function createDefaultGravecallerSkeletons() {
  return [
    {
      id: 'vanguard',
      name: 'Skeleton Vanguard',
      role: 'Vanguard',
      equipment: { weapon: null, armour: null, charm: null }
    },
    {
      id: 'reaver',
      name: 'Skeleton Reaver',
      role: 'Reaver',
      equipment: { weapon: null, armour: null, charm: null }
    },
    {
      id: 'marksman',
      name: 'Skeleton Marksman',
      role: 'Marksman',
      equipment: { weapon: null, armour: null, charm: null }
    }
  ];
}

function normalizeGravecallerState(value, player) {
  const source = value && typeof value === 'object' ? value : {};
  const spent = player?.skillTree?.spent || player?.skillTreeProgress || {};
  let path = source.path || player?.gravecallerPath || null;

  if (spent.spirit_bone_coterie) path = 'commander';
  if (spent.spirit_lich_ascension) path = 'lichbound';
  if (!['commander', 'lichbound'].includes(path)) path = null;

  const defaults = createDefaultGravecallerSkeletons();
  const sourceSkeletons = Array.isArray(source.skeletons) ? source.skeletons : [];
  const skeletons = defaults.map((defaultSlot, index) => {
    const slot = sourceSkeletons[index] && typeof sourceSkeletons[index] === 'object'
      ? sourceSkeletons[index]
      : {};
    const equipment = slot.equipment && typeof slot.equipment === 'object' ? slot.equipment : {};

    return {
      ...defaultSlot,
      ...slot,
      id: defaultSlot.id,
      name: slot.name || defaultSlot.name,
      role: defaultSlot.role,
      equipment: {
        weapon: equipment.weapon || null,
        armour: equipment.armour || equipment.armor || null,
        charm: equipment.charm || equipment.trinket || null
      }
    };
  });

  return {
    path,
    commandMode: ['attack', 'defend', 'hold', 'regroup', 'spread'].includes(source.commandMode)
      ? source.commandMode
      : 'defend',
    skeletons
  };
}

export function migratePlayer(player) {
  if (!player) return player;

  migrateSkillState(player);

  // Class fields.
  player.className = player.className ?? null;
  player.classId = player.classId ?? getClassIdFromName(player.className);
  player.classId = normalizeClassId(player.classId);
  normalizeSubclassState(player);
  if (String(player.className || '').trim().toLowerCase() === 'necromancer') {
    player.className = 'Gravecaller';
  }
  if (String(player.className || '').trim().toLowerCase() === 'templar') {
    player.className = 'Oathkeeper';
  }
  if (String(player.className || '').trim().toLowerCase() === 'hydromancer') {
    player.className = 'Waverider';
  }
  if (String(player.className || '').trim().toLowerCase() === 'mercenary') {
    player.className = 'Fellhunter';
  }
  player.classSkill = player.classSkill ?? getClassSkillFromName(player.className);
  player.classXpMultiplier = player.classXpMultiplier ?? (player.classSkill ? 1.5 : 1);
  player.hiddenClassUnlocks = player.hiddenClassUnlocks && typeof player.hiddenClassUnlocks === 'object'
    ? player.hiddenClassUnlocks
    : {};

  if (
    player.classSkill &&
    (!Number.isFinite(Number(player.classXpMultiplier)) ||
      player.classXpMultiplier < 1 ||
      player.classXpMultiplier > 2)
  ) {
    player.classXpMultiplier = 1.25;
  }

  if (!player.className && player.classId && getClassDefinition(player.classId)) {
    player.className = getClassDefinition(player.classId).name;
  }

  if (!player.className) {
    player.classId = null;
    player.classSkill = null;
    player.classXpMultiplier = 1;
  }

  // Fix bad/older class data where class name existed but id/skill was missing.
  if (player.className && !player.classId) {
    player.classId = getClassIdFromName(player.className);
  }

  if (player.classId && getClassDefinition(player.classId)) {
    const classData = getClassDefinition(player.classId);

    player.className = classData.name;
    player.classId = classData.id;
    player.classSkill = classData.skill;
    player.classXpMultiplier = classData.xpMultiplier || 1.25;
  }

  player.pathName = player.pathName ?? getCharacterBuildName(player.skillState);
  normalizeSkillTreeState(player);
  player.gravecaller = normalizeGravecallerState(player.gravecaller, player);
  player.gravecallerPath = player.gravecaller.path;
  player.title = player.title ?? 'Wanderer';
  player.origin = player.origin ?? 'Unknown';
  player.profileId = player.profileId ?? null;
  player.profileName = player.profileName ?? player.name ?? 'Wayfarer';
  player.profileSlot = player.profileSlot ?? (player.slot === 2 ? 'player2' : 'player1');
  player.playerNumber = player.playerNumber ?? player.slot ?? 1;
  player.saveVersion = 15;

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
  player.level = Math.max(1, Number(player.level || player.combatLevel || 1));
  player.xp = Math.max(0, Number(player.xp || 0));
  player.stats = player.stats && typeof player.stats === 'object' ? player.stats : {};
  player.currentZone = normalizePlayerFacingWorldName(player.currentZone, ACT1_OVERWORLD_DISPLAY_NAME);
  player.currentPosition = {
    x: Number.isFinite(Number(player.x)) ? Number(player.x) : 11 * 32,
    y: Number.isFinite(Number(player.y)) ? Number(player.y) : 27 * 32
  };
  player.lastSafeLocation = normalizeSafeLocation(player.lastSafeLocation, player);

  player.skin = player.skin ?? '#ffd1bd';
  player.hair = player.hair ?? '#0b0d12';
  player.shirt = player.shirt ?? '#f2a51f';
  player.pants = player.pants ?? '#293fba';
  player.boots = player.boots ?? '#3a2a22';

  player.loadout = player.loadout ?? {
    primarySkill: 'blade',
    blockSkill: 'warding',
    abilitySlots: [null, null, null, null, 'block']
  };

  player.loadout.primarySkill = player.loadout.primarySkill ?? 'blade';
  player.loadout.blockSkill = player.loadout.blockSkill ?? 'warding';
  player.loadout.abilitySlots = player.loadout.abilitySlots ?? [null, null, null, null];
  normalizeAbilityManagementState(player);

  while (player.loadout.abilitySlots.length < HOTBAR_SLOT_COUNT) {
    player.loadout.abilitySlots.push(null);
  }

  player.unlockedAbilities = player.unlockedAbilities ?? [];
  normalizeAbilityManagementState(player);
  migrateAbilitySlotLayout(player);
  normalizeAbilityManagementState(player);
  player.inventory = player.inventory ?? [];

  player.equipment = player.equipment ?? {};
  player.equipment.weapon = player.equipment.weapon ?? null;
  player.equipment.helm = player.equipment.helm ?? null;
  player.equipment.chest = player.equipment.chest ?? null;
  player.equipment.legs = player.equipment.legs ?? null;

  // Keep old trinket naming internally, but UI can display it as Charm/Jewelry.
  player.equipment.trinket = player.equipment.trinket ?? player.equipment.jewelry ?? null;
  delete player.equipment.jewelry;
  player.gearUpgrades = player.gearUpgrades && typeof player.gearUpgrades === 'object'
    ? player.gearUpgrades
    : {};

  normalizeEquipmentProgression(player);

  player.quest = player.quest ?? {
    firstOath: 0,
    hungryShrine: 0,
    hollowlings: 0
  };

  player.quest.firstOath = player.quest.firstOath ?? 0;
  player.quest.hungryShrine = player.quest.hungryShrine ?? 0;
  player.quest.hollowlings = player.quest.hollowlings ?? 0;
  player.quests = player.quests ?? { active: {}, completed: {} };
  player.quests.active = player.quests.active ?? {};
  player.quests.completed = player.quests.completed ?? {};
  player.questProgress = player.questProgress ?? {};
  player.enteredDungeons = normalizeMap(player.enteredDungeons);
  player.completedDungeons = normalizeMap(player.completedDungeons);
  player.bossKills = normalizeMap(player.bossKills);
  player.discoveredLocations = normalizeMap(player.discoveredLocations || player.discoveredPois);
  player.discoveredPois = normalizeMap(player.discoveredPois || player.discoveredLocations);
  player.poiEncounters = normalizeMap(player.poiEncounters);
  player.tower = normalizeTower(player.tower);
  player.infiniteDungeons = normalizeInfiniteDungeons(player.infiniteDungeons, player.tower);
  player.sideZones = normalizeMap(player.sideZones);
  player.crafting = normalizeCrafting(player.crafting);

  player.flags = player.flags ?? {};
  player.flags.wardUntil = player.flags.wardUntil ?? 0;
  player.flags.guardUntil = player.flags.guardUntil ?? 0;
  player.flags.ironOathUntil = player.flags.ironOathUntil ?? 0;
  player.flags.oathguardUntil = player.flags.oathguardUntil ?? 0;
  player.flags.campPreparedUntil = player.flags.campPreparedUntil ?? 0;
  player.flags.kingfinFeastUntil = player.flags.kingfinFeastUntil ?? 0;
  player.flags.thornskinUntil = player.flags.thornskinUntil ?? 0;
  player.flags.guarding = player.flags.guarding ?? false;

  player.cooldowns = player.cooldowns ?? {};
  migrateAbilityIdMap(player.cooldowns);
  normalizeAbilityUseCharges(player);
  normalizeAbilityMastery(player);
  migrateAbilityIdMap(player.abilityUseCharges);
  player.summonCooldowns = player.summonCooldowns ?? {};
  player.legendaryState = player.legendaryState && typeof player.legendaryState === 'object'
    ? player.legendaryState
    : {};
  player.legendaryState.cooldowns = player.legendaryState.cooldowns || {};
  player.legendaryState.shields = player.legendaryState.shields || {};
  player.lightbringer = normalizeLightbringerState(player.lightbringer);
  normalizeBloodlineState(player);
  player.summons = Array.isArray(player.summons) ? player.summons : [];
  migrateLichSummons(player);
  migrateLegendarySummonAccess(player);
  player.traps = Array.isArray(player.traps) ? player.traps : [];
  player.combatEffects = Array.isArray(player.combatEffects) ? player.combatEffects : [];
  player.floatingTexts = Array.isArray(player.floatingTexts) ? player.floatingTexts : [];
  ensureStoryProgress(player);

  // Clean old impossible cooldown states from bad saves.
  for (const key of Object.keys(player.cooldowns)) {
    if (!Number.isFinite(player.cooldowns[key])) {
      player.cooldowns[key] = 0;
    }
  }

  for (const key of Object.keys(player.summonCooldowns)) {
    if (!Number.isFinite(player.summonCooldowns[key])) {
      delete player.summonCooldowns[key];
    }
  }

  // Make sure class abilities stay correct after loading old saves.
  refreshClassUnlocks(player);

  refreshDerivedProgression(player, false);

  normalizedProgressionPlayers.add(player);
  return syncLegacySkills(player);
}

// -----------------------------------------------------------------------------
// DERIVED PROGRESSION / VITAL STATS
// -----------------------------------------------------------------------------

function refreshDerivedProgression(player, forceFullVitals = false) {
  if (!player) return player;

  player.combatLevel = getCombatLevel(player.skillState);
  player.classLevel = 0;
  player.pathName = getCharacterBuildName(player.skillState);

  refreshDerivedVitals(player, forceFullVitals);

  return player;
}

function migrateAbilitySlotLayout(player) {
  const slots = player?.loadout?.abilitySlots;
  if (!Array.isArray(slots)) return;
  // Preserve existing assignments, including a deliberately cleared LT slot.
  // The one-time Block default is handled by normalizeAbilityManagementState.
  player.loadout.abilitySlots = Array.from({length: HOTBAR_SLOT_COUNT}, (_, i) => normalizeAbilityId(slots[i]) || null);
  player.abilityLayoutVersion = HOTBAR_LAYOUT_VERSION;
}

function migrateAbilityIdMap(map) {
  if (!map || typeof map !== 'object') return map;

  for (const key of Object.keys(map)) {
    const normalized = normalizeAbilityId(key);
    if (!normalized || normalized === key) continue;
    map[normalized] = Math.max(Number(map[normalized] || 0), Number(map[key] || 0));
    delete map[key];
  }

  return map;
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
    player.spirit = player.maxSpirit;
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



  if (spiritDelta > 0) {
    player.spirit = Math.min(player.maxSpirit, Math.max(0, Number(player.spirit || 0) + spiritDelta));
  } else {
    player.spirit = Math.min(player.maxSpirit, Math.max(0, Number(player.spirit || 0)));
  }
}

export function calculateMaxHp(player) {
  const combatLevel = Math.max(1, Number(player?.combatLevel || getCombatLevel(player?.skillState) || 1));
  const hitpointsLevel = Math.max(1, getSkillLevel(player?.skillState, 'hitpoints'));
  const treeBonuses = getSkillTreeBonuses(player);
  const baseHp =
    BASE_HP +
    levelStat(combatLevel) * HP_PER_COMBAT_LEVEL +
    levelStat(hitpointsLevel) * HP_PER_HITPOINTS_LEVEL;
  const classScalar = isGravecallerClassId(player?.classId)
    ? 0.88
    : isOathkeeperClassId(player?.classId)
      ? 1.16
      : 1;

  return Math.max(80, Math.floor(baseHp * classScalar * (1 + Math.max(0, treeBonuses.maxHpPct || 0) / 100)));
}

export function calculateMaxStamina(player) {
  const combatLevel = Math.max(1, Number(player?.combatLevel || getCombatLevel(player?.skillState) || 1));
  const staminaLevel = Math.max(1, getSkillLevel(player?.skillState, 'stamina'));
  const treeBonuses = getSkillTreeBonuses(player);

  return Math.floor(
    BASE_STAMINA +
    levelStat(combatLevel) * STAMINA_PER_COMBAT_LEVEL +
    levelStat(staminaLevel) * STAMINA_PER_STAMINA_LEVEL +
    (treeBonuses.maxStamina || 0) +
    (isOathkeeperClassId(player?.classId) ? 8 : 0)
  );
}

export function calculateMaxSpirit(player) {

  const combatLevel = Math.max(1, Number(player?.combatLevel || getCombatLevel(player?.skillState) || 1));
  const spiritLevel = Math.max(1, getSkillLevel(player?.skillState, 'spirit'));

  const necroBonus = isGravecallerClassId(player.classId)
    ? levelStat(spiritLevel) * NECROMANCER_SPIRIT_BONUS_PER_SPIRIT_LEVEL
    : 0;
  const eldritchBonus = player.classId === 'eldritch'
    ? 19 + levelStat(spiritLevel) * 0.75
    : 0;
  const hydromancerBonus = normalizeClassId(player.classId) === 'waverider'
    ? 8 + levelStat(getSkillLevel(player?.skillState, 'warding')) * 0.65
    : 0;
  const oathkeeperBonus = isOathkeeperClassId(player.classId)
    ? 12 + levelStat(getSkillLevel(player?.skillState, 'blunt')) * 0.35
    : 0;
  const treeBonuses = getSkillTreeBonuses(player);

  return Math.floor(
    BASE_SPIRIT +
    levelStat(combatLevel) * SPIRIT_PER_COMBAT_LEVEL +
    levelStat(spiritLevel) * SPIRIT_PER_SPIRIT_LEVEL +
    necroBonus +
    eldritchBonus +
    hydromancerBonus +
    oathkeeperBonus +
    (treeBonuses.maxSpirit || 0)
  );
}

function getClassIdFromName(className) {
  if (!className) return null;

  const lower = String(className).toLowerCase();
  if (lower === 'necromancer') return 'gravecaller';
  if (lower === 'templar') return 'oathkeeper';
  if (lower === 'hydromancer') return 'waverider';
  if (lower === 'mercenary') return 'fellhunter';

  for (const classId of Object.keys(RUNALIS_CLASSES)) {
    if (RUNALIS_CLASSES[classId].aliasFor) continue;
    if (RUNALIS_CLASSES[classId].name.toLowerCase() === lower) {
      return classId;
    }
  }

  return null;
}

function getClassSkillFromName(className) {
  const classId = getClassIdFromName(className);
  return classId ? getClassDefinition(classId)?.skill || null : null;
}

function normalizeMap(value) {
  if (!value || typeof value !== 'object') return {};

  if (Array.isArray(value)) {
    return value.reduce((map, id) => {
      if (id) map[id] = true;
      return map;
    }, {});
  }

  return value;
}

function normalizeSafeLocation(value, player) {
  const source = value && typeof value === 'object' ? value : {};
  const x = Number(source.x);
  const y = Number(source.y);

  return {
    worldMode: source.worldMode || source.mode || 'overworld',
    worldName: normalizePlayerFacingWorldName(source.worldName || source.name || player?.currentZone, ACT1_OVERWORLD_DISPLAY_NAME),
    regionId: source.regionId || null,
    x: Number.isFinite(x) ? x : Number(player?.x || 11 * 32),
    y: Number.isFinite(y) ? y : Number(player?.y || 27 * 32),
    recordedAt: Number(source.recordedAt || 0),
    reason: source.reason || null
  };
}

function normalizeTower(tower) {
  const source = tower && typeof tower === 'object' ? tower : {};

  return {
    unlocked: !!source.unlocked,
    highestFloor: Math.max(0, Number(source.highestFloor || source.record || 0)),
    currentFloor: Math.max(0, Number(source.currentFloor || 0)),
    rewardsClaimed: normalizeMap(source.rewardsClaimed)
  };
}

function normalizeInfiniteDungeons(value, legacyTower) {
  const source = value && typeof value === 'object' ? value : {};
  const normalized = {};

  for (const [regionId, state] of Object.entries(source)) {
    normalized[regionId] = normalizeTower(state);
  }

  const legacy = normalizeTower(legacyTower);
  const hearthmere = normalizeTower(normalized.hearthmereFrontier);
  normalized.hearthmereFrontier = {
    ...legacy,
    ...hearthmere,
    unlocked: true,
    highestFloor: Math.max(legacy.highestFloor, hearthmere.highestFloor),
    currentFloor: Math.max(legacy.currentFloor, hearthmere.currentFloor),
    rewardsClaimed: {
      ...(legacy.rewardsClaimed || {}),
      ...(hearthmere.rewardsClaimed || {})
    }
  };

  return normalized;
}

function normalizeCrafting(crafting) {
  const source = crafting && typeof crafting === 'object' ? crafting : {};

  return {
    unlocked: source.unlocked !== false,
    knownRecipes: Array.isArray(source.knownRecipes) ? source.knownRecipes : [],
    salvageCount: Math.max(0, Number(source.salvageCount || 0)),
    upgradesPerformed: Math.max(0, Number(source.upgradesPerformed || 0)),
    craftCount: Math.max(0, Number(source.craftCount || 0)),
    cookedCount: Math.max(0, Number(source.cookedCount || 0)),
    runecraftCount: Math.max(0, Number(source.runecraftCount || 0)),
    recipesCrafted: normalizeMap(source.recipesCrafted),
    lastRecipeId: source.lastRecipeId || null
  };
}

function getGearUpgradeStatBonus(player, slot) {
  return getEquipmentTierBonus(player,slot);
}

// -----------------------------------------------------------------------------
// CLASS SELECTION
// -----------------------------------------------------------------------------

export function chooseClass(player, classId, log) {
  migratePlayer(player);
  classId = normalizeClassId(classId);

  if (player.className) {
    log?.(`You have already chosen the path of the ${player.className}.`);
    return false;
  }

  const classData = getClassDefinition(classId);

  if (!classData) {
    log?.('That class does not exist.');
    return false;
  }

  if(!isClassAvailable(classId)){log?.('That class is currently unavailable.');return false;}

  player.classId = classData.id;
  player.className = classData.name;
  player.classSkill = classData.skill || null;
  player.classXpMultiplier = classData.xpMultiplier || 1.25;

  // Make the class skill the default active combat skill.
  if (player.loadout && classData.skill) {
    player.loadout.primarySkill = classData.skill;
  }

  // Spirit-based class should awaken spirit resource before starter assignment
  // so the availability gate accepts the starter ability.
  if (isGravecallerClassId(classData.id) || classData.id === 'oathkeeper' || classData.id === 'waverider' || classData.id === 'lightbringer' || classData.id === 'eldritch') {
    player.spiritAwakened = true;
  }

  player.unlockedAbilities = player.unlockedAbilities || [];
  player.loadout = player.loadout || {};
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < HOTBAR_SLOT_COUNT) {
    player.loadout.abilitySlots.push(null);
  }

  player.loadout.abilitySlots = [null, null, null, null, player.loadout.abilitySlots[4] || null];

  // Gravecallers begin with their basic spell and one bound skeleton. Other
  // classes retain their existing single starter ability.
  const starterAbilities = getStarterClassAbilityIds(classData);
  for (let index = 0; index < starterAbilities.length; index++) {
    const abilityId = starterAbilities[index];
    unlockActiveAbility(player, abilityId, { autoAssignEmpty: false });
    assignAbilityToSlot(player, index, abilityId);
  }

  refreshDerivedProgression(player, false);
  refreshClassUnlocks(player, log);
  syncLegacySkills(player);

  if (classData.id === 'classless') {
    log?.('You remain Classless. Blades and Stamina earn 25% extra XP; ordinary disciplines and learned scrolls remain open to you.');
  } else {
    log?.(`You chose the path of the ${classData.name}. ${getClassAffinities(player).map(skillName).join(' and ')} earn 25% extra XP.`);
  }

  return true;
}

export function canUnlockClassSecondAbility(player) {
  migratePlayer(player);
  return false;
}

export function refreshClassUnlocks(player, log) {
  if (!player) return false;

  player.unlockedAbilities = player.unlockedAbilities || [];
  player.loadout = player.loadout || {};
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < HOTBAR_SLOT_COUNT) {
    player.loadout.abilitySlots.push(null);
  }

  if (!player.classId) return false;

  const classData = getClassDefinition(player.classId);

  if (!classData) return false;

  const starterAbilities = getStarterClassAbilityIds(classData);
  let changed = false;

  for (let index = 0; index < starterAbilities.length; index++) {
    const abilityId = starterAbilities[index];
    const newlyUnlocked=unlockActiveAbility(player, abilityId, { autoAssignEmpty: false });
    changed = newlyUnlocked || changed;
    // A cleared starter stays learned and unassigned through refresh/save/load.
    if(!newlyUnlocked)continue;
    if (player.loadout.abilitySlots.includes(abilityId)) continue;

    // Preserve custom loadouts and old saves: prefer the canonical starter
    // slot, then an empty slot, but never replace a learned assignment.
    const preferredSlot = !player.loadout.abilitySlots[index]
      ? index
      : player.loadout.abilitySlots.findIndex(slot => !slot);
    if (preferredSlot >= 0) assignAbilityToSlot(player, preferredSlot, abilityId);
  }

  return changed;
}

function getStarterClassAbilityIds(classData) {
  if (!classData) return [];
  const abilities = [classData.qAbility].filter(Boolean);
  if (isGravecallerClassId(classData.id)) abilities.push('summonLich');
  return [...new Set(abilities)];
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
  if(id==='ashCoin'){player.gold=(Number(player.gold)||0)+safeQty;return true;}

  if (item.stack) {
    const found = player.inventory.find(i => i.id === id);

    if (found) {
      found.qty += safeQty;
    } else {
      player.inventory.push({ id, qty: safeQty });
    }
  } else {
    for (let i = 0; i < safeQty; i++) {
      player.inventory.push(isTieredEquipment(item) ? createGearEntry(player,id) : { id, qty: 1 });
    }
  }

  if (id === 'demonseedScythe') migrateLegendarySummonAccess(player);
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

  return player.inventory.reduce((total,entry)=>total+(entry.id===id ? Number(entry.qty)||0 : 0),0);
}

// -----------------------------------------------------------------------------
// XP
// -----------------------------------------------------------------------------

export function gainXp(player, skillId, amount, log, options = {}) {
  ensureProgressionPlayer(player);

  const def = getSkillDefinition(skillId);

  if (!def) {
    console.warn(`Unknown skill: ${skillId}`);
    return false;
  }

  const previousCombatLevel = player.combatLevel || getCombatLevel(player.skillState);

  const adjustedAmount = safeXP(amount) * (options.skipClassXpMultiplier ? 1 : affinityMultiplier(player, skillId));

  const result = addSkillXP(player.skillState, skillId, adjustedAmount);
  if (!options.skipHotbarMastery) awardHotbarMasteryXp(player,result.xpAdded,performance.now()/1000,log);

  refreshDerivedProgression(player, false);
  syncLegacySkills(player);

  if (result.leveledUp) {
    const newLevel = getSkillLevel(player.skillState, skillId);

    log?.(`${def.name} reached level ${newLevel}.`);

    if (player.combatLevel > previousCombatLevel) {
      log?.(`Level increased to ${player.combatLevel}.`);
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
  ensureProgressionPlayer(player);

  const weapon = player.equipment.weapon ? ITEMS[player.equipment.weapon] : null;
  const trinket = player.equipment.trinket ? ITEMS[player.equipment.trinket] : null;

  const primarySkill = weaponProficiency(weapon, player.loadout?.primarySkill || 'blade');

  const primaryLevel = getSkillLevel(player.skillState, primarySkill);

  let base = 4;

  if (primarySkill === 'blade' || primarySkill === 'blunt') {
    base += (1 + levelStat(primaryLevel)) * 1.35;
  } else if (primarySkill === 'archery') {
    base += (1 + levelStat(primaryLevel)) * 1.2;
  } else if (primarySkill === 'spirit') {
    base += (1 + levelStat(primaryLevel)) * 1.05;
  } else if (primarySkill === 'warding') {
    base += (1 + levelStat(primaryLevel)) * 0.95;
  } else {
    base += (1 + levelStat(primaryLevel)) * 0.8;
  }

  const oldWeaponPower = weapon?.power || 0;
  const newWeaponBase = weapon?.baseDamage || 0;
  const focusPower = weapon?.weaponType === 'spiritFocus'
    ? Number(weapon.focusPower || 0) * 1.2
    : 0;
  const trinketPower = trinket?.spirit || trinket?.power || 0;
  const setBonuses = getEquipmentStatBonuses(player);
  const treeBonuses = getSkillTreeBonuses(player);
  const offensiveSetPower =
    (setBonuses.strength || 0) +
    (setBonuses.dexterity || 0) +
    (setBonuses.essence || 0) +
    (setBonuses.spirit || 0);

  return base + oldWeaponPower + newWeaponBase + focusPower + trinketPower + offensiveSetPower + (treeBonuses.power || 0) + getGearUpgradeStatBonus(player, 'weapon') + getGearUpgradeStatBonus(player,'trinket');
}

export function getArmour(player) {
  ensureProgressionPlayer(player);

  const helm = player.equipment.helm ? ITEMS[player.equipment.helm] : null;
  const chest = player.equipment.chest ? ITEMS[player.equipment.chest] : null;
  const legs = player.equipment.legs ? ITEMS[player.equipment.legs] : null;
  const trinket = player.equipment.trinket ? ITEMS[player.equipment.trinket] : null;

  const combatLevel = Math.max(1, player.combatLevel || 1);
  const defenceLevel = Math.max(1, getSkillLevel(player.skillState, 'defence'));
  const setBonuses = getEquipmentStatBonuses(player);
  const treeBonuses = getSkillTreeBonuses(player);

  return (
    (1 + levelStat(combatLevel)) * 0.15 +
    (1 + levelStat(defenceLevel)) * 0.55 +
    (helm?.armour || 0) +
    (chest?.armour || 0) +
    (legs?.armour || 0) +
    (trinket?.armour || 0) +
    getGearUpgradeStatBonus(player, 'helm') +
    getGearUpgradeStatBonus(player, 'chest') +
    getGearUpgradeStatBonus(player, 'legs') +
    getGearUpgradeStatBonus(player, 'trinket') +
    (setBonuses.armour || 0) +
    (setBonuses.warding || 0) * 0.45 +
    (treeBonuses.armour || 0) +
    (isOathkeeperClassId(player.classId) ? 4 : 0)
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
  return unlockActiveAbility(player, abilityId, { autoAssignEmpty: true });
}

export function equipAbility(player, slotIndex, abilityId) {
  migratePlayer(player);
  return assignAbilityToSlot(player, slotIndex, abilityId).ok;
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
  const weapon=getEquippedWeapon(player);
  return weaponProficiency(weapon,player.loadout?.primarySkill||'blade');
}
