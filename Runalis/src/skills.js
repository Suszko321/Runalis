// skills.js
// Runalis infinite skill + combat level system.
//
// Core rules:
// - All skills level infinitely.
// - Leveling is intentionally slow long-term.
// - Early levels move fast enough to feel rewarding.
// - Later levels become exponentially longer.
// - The player has an overall Combat Level.
// - Combat Level is calculated from Blade, Archery, Spirit, and Warding.
// - The player also has a Class Combat Level if they chose a class.
// - Class Combat Level is based only on the class-linked combat skill.
// - Class choice does NOT block other skills.
// - Class choice gives bonus XP to one linked combat skill.
// - Breakthroughs/caps are deprecated and no longer restrict leveling.

// -----------------------------------------------------------------------------
// SKILL DEFINITIONS
// -----------------------------------------------------------------------------

export const RUNALIS_SKILLS = {
  blade: {
    id: 'blade',
    name: 'Blade',
    shortName: 'BLD',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Melee mastery with swords, knives, scythes, close-range weapons, pressure, and dueling.',
    primaryVerb: 'Strike',
    combatWeight: 1,
    classLinkedTo: 'Templar',
    classIdLinkedTo: 'templar',
    classNote: 'Templars train Blade faster, but anyone can level Blade forever.'
  },

  archery: {
    id: 'archery',
    name: 'Archery',
    shortName: 'ARC',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Bow mastery, ranged pressure, precision shots, kiting, and fighting from distance.',
    primaryVerb: 'Shoot',
    combatWeight: 1,
    classLinkedTo: 'Mercenary',
    classIdLinkedTo: 'mercenary',
    classNote: 'Mercenaries train Archery faster, but anyone can level Archery forever.'
  },

  spirit: {
    id: 'spirit',
    name: 'Spirit',
    shortName: 'SPI',
    type: 'combat',
    dormantName: 'Dormant',
    description: 'Soul magic, necrotic force, curses, summons, lifedrain, ghosts, and unnatural power.',
    primaryVerb: 'Invoke',
    combatWeight: 1,
    classLinkedTo: 'Necromancer',
    classIdLinkedTo: 'necromancer',
    classNote: 'Necromancers train Spirit faster, but anyone can awaken and level Spirit forever.'
  },

  warding: {
    id: 'warding',
    name: 'Warding',
    shortName: 'WRD',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Defensive mastery, survival, blocking, protection, roots, shields, and resistance.',
    primaryVerb: 'Guard',
    combatWeight: 1,
    classLinkedTo: 'Thornbinder',
    classIdLinkedTo: 'thornbinder',
    classNote: 'Thornbinders train Warding faster, but anyone can level Warding forever.'
  },

  foraging: {
    id: 'foraging',
    name: 'Foraging',
    shortName: 'FOR',
    type: 'gathering',
    dormantName: 'Untrained',
    description: 'Gather herbs, fungi, roots, reeds, food, and wilderness reagents.',
    primaryVerb: 'Gather'
  },

  mining: {
    id: 'mining',
    name: 'Mining',
    shortName: 'MIN',
    type: 'gathering',
    dormantName: 'Untrained',
    description: 'Extract ore, stone, bone piles, relic fragments, and buried minerals.',
    primaryVerb: 'Mine'
  },

  fishing: {
    id: 'fishing',
    name: 'Fishing',
    shortName: 'FSH',
    type: 'gathering',
    dormantName: 'Untrained',
    description: 'Catch fish, river materials, and rare waterborne resources.',
    primaryVerb: 'Fish'
  },

  crafting: {
    id: 'crafting',
    name: 'Crafting',
    shortName: 'CRF',
    type: 'production',
    dormantName: 'Untrained',
    description: 'Create and improve tools, weapons, armour, charms, and useful supplies.',
    primaryVerb: 'Craft'
  },

  cooking: {
    id: 'cooking',
    name: 'Cooking',
    shortName: 'CKG',
    type: 'production',
    dormantName: 'Untrained',
    description: 'Prepare food, healing meals, stamina meals, tonics, and temporary buffs.',
    primaryVerb: 'Cook'
  },

  runecraft: {
    id: 'runecraft',
    name: 'Runecraft',
    shortName: 'RUN',
    type: 'production',
    dormantName: 'Dormant',
    description: 'Shape essence into runes, charms, enchantments, magical tools, and occult gear.',
    primaryVerb: 'Inscribe'
  },

  renown: {
    id: 'renown',
    name: 'Renown',
    shortName: 'REN',
    type: 'world',
    dormantName: 'Unknown',
    description: 'Reputation, trust, settlement standing, discoveries, and your name in the Sol Land.',
    primaryVerb: 'Earn'
  }
};

export const COMBAT_SKILL_IDS = ['blade', 'archery', 'spirit', 'warding'];

export const CLASS_SKILL_LINKS = {
  templar: {
    classId: 'templar',
    className: 'Templar',
    skillId: 'blade',
    skillName: 'Blade'
  },

  mercenary: {
    classId: 'mercenary',
    className: 'Mercenary',
    skillId: 'archery',
    skillName: 'Archery'
  },

  necromancer: {
    classId: 'necromancer',
    className: 'Necromancer',
    skillId: 'spirit',
    skillName: 'Spirit'
  },

  thornbinder: {
    classId: 'thornbinder',
    className: 'Thornbinder',
    skillId: 'warding',
    skillName: 'Warding'
  }
};

// -----------------------------------------------------------------------------
// DEPRECATED BREAKTHROUGH EXPORTS
// -----------------------------------------------------------------------------
// These remain only so older imports do not crash.

export const BREAKTHROUGH_LEVEL_CAP = Infinity;
export const MAX_BREAKTHROUGH_POINTS = 0;

// -----------------------------------------------------------------------------
// CREATION / BASIC ACCESS
// -----------------------------------------------------------------------------

export function createNewSkillState() {
  const skills = {};

  for (const skillId of Object.keys(RUNALIS_SKILLS)) {
    skills[skillId] = {
      level: 1,
      xp: 0,
      used: false
    };
  }

  return { skills };
}

export function getSkillDefinition(skillId) {
  return RUNALIS_SKILLS[skillId] || null;
}

export function getAllSkillDefinitions() {
  return Object.values(RUNALIS_SKILLS);
}

export function getSkillIds() {
  return Object.keys(RUNALIS_SKILLS);
}

export function getCombatSkillIds() {
  return [...COMBAT_SKILL_IDS];
}

export function getClassSkillLink(classId) {
  return CLASS_SKILL_LINKS[classId] || null;
}

export function getClassSkillId(classId) {
  return CLASS_SKILL_LINKS[classId]?.skillId || null;
}

export function getClassNameForClassId(classId) {
  return CLASS_SKILL_LINKS[classId]?.className || null;
}

export function getSkillLevel(skillState, skillId) {
  const skill = skillState?.skills?.[skillId];

  return Math.max(1, Math.floor(skill?.level || 1));
}

export function getSkillXP(skillState, skillId) {
  const skill = skillState?.skills?.[skillId];

  return Math.max(0, Math.floor(skill?.xp || 0));
}

export function hasUsedSkill(skillState, skillId) {
  return !!skillState?.skills?.[skillId]?.used;
}

// -----------------------------------------------------------------------------
// SKILL TYPE HELPERS
// -----------------------------------------------------------------------------

export function isCombatSkill(skillId) {
  const def = getSkillDefinition(skillId);
  return !!def && def.type === 'combat';
}

export function isGatheringSkill(skillId) {
  const def = getSkillDefinition(skillId);
  return !!def && def.type === 'gathering';
}

export function isProductionSkill(skillId) {
  const def = getSkillDefinition(skillId);
  return !!def && def.type === 'production';
}

export function isWorldSkill(skillId) {
  const def = getSkillDefinition(skillId);
  return !!def && def.type === 'world';
}

export function getSkillTypeLabel(skillId) {
  const def = getSkillDefinition(skillId);
  if (!def) return 'Unknown';

  if (def.type === 'combat') return 'Combat';
  if (def.type === 'gathering') return 'Gathering';
  if (def.type === 'production') return 'Production';
  if (def.type === 'world') return 'World';

  return 'Skill';
}

export function getSkillsByType(type) {
  return Object.values(RUNALIS_SKILLS).filter(skill => skill.type === type);
}

// -----------------------------------------------------------------------------
// INFINITE XP CURVE
// -----------------------------------------------------------------------------
//
// This curve is intentionally slower than the previous version.
//
// Goal:
// - 1 to 10: visible progress during a prototype test session.
// - 10 to 20: takes meaningful repeated combat.
// - 20 to 30: should feel like a real grind.
// - 30+: increasingly long-term mastery.
// - Later content can add XP sources, quests, multipliers, dungeons, rested XP, etc.
//
// Formula:
//   base + linear + power curve
//
// The level exponent is high enough to make high levels expensive,
// but not so high that the numbers become impossible to tune later.

export function getXPRequiredForNextLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level || 1));

  const base = 90;
  const linear = safeLevel * 55;
  const curve = Math.pow(safeLevel, 2.18) * 42;

  return Math.floor(base + linear + curve);
}

export function getTotalXPRequiredToReachLevel(targetLevel) {
  const safeTarget = Math.max(1, Math.floor(targetLevel || 1));

  let total = 0;

  for (let level = 1; level < safeTarget; level++) {
    total += getXPRequiredForNextLevel(level);
  }

  return total;
}

export function getEstimatedLevelFromTotalXP(totalXp) {
  let xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;

  while (xp >= getXPRequiredForNextLevel(level)) {
    xp -= getXPRequiredForNextLevel(level);
    level += 1;

    if (level > 100000) break;
  }

  return {
    level,
    xpIntoLevel: xp,
    next: getXPRequiredForNextLevel(level)
  };
}

export function getSkillProgress(skillState, skillId) {
  const skill = skillState?.skills?.[skillId];

  if (!skill) {
    return {
      level: 1,
      xp: 0,
      next: getXPRequiredForNextLevel(1),
      percent: 0
    };
  }

  const level = Math.max(1, Math.floor(skill.level || 1));
  const xp = Math.max(0, Math.floor(skill.xp || 0));
  const next = getXPRequiredForNextLevel(level);

  return {
    level,
    xp,
    next,
    percent: Math.max(0, Math.min(100, (xp / next) * 100))
  };
}

export function getSkillDisplayStatus(skillState, skillId) {
  const def = getSkillDefinition(skillId);
  if (!def) return 'Unknown';

  const skill = skillState?.skills?.[skillId];

  if (!skill || !skill.used) {
    return def.dormantName;
  }

  return `Level ${Math.max(1, Math.floor(skill.level || 1))}`;
}

export function addSkillXP(skillState, skillId, amount) {
  const def = getSkillDefinition(skillId);

  if (!def || !skillState?.skills?.[skillId]) {
    return {
      success: false,
      leveledUp: false,
      capped: false,
      oldLevel: 1,
      newLevel: 1,
      levelsGained: 0,
      xpAdded: 0,
      message: 'Skill not found.'
    };
  }

  const skill = skillState.skills[skillId];
  const oldLevel = Math.max(1, Math.floor(skill.level || 1));
  const xpAdded = Math.max(0, Math.floor(amount || 0));

  skill.level = oldLevel;
  skill.xp = Math.max(0, Math.floor(skill.xp || 0));
  skill.used = true;

  if (xpAdded <= 0) {
    return {
      success: true,
      leveledUp: false,
      capped: false,
      oldLevel,
      newLevel: skill.level,
      levelsGained: 0,
      xpAdded: 0,
      message: null
    };
  }

  skill.xp += xpAdded;

  let levelsGained = 0;

  while (skill.xp >= getXPRequiredForNextLevel(skill.level)) {
    skill.xp -= getXPRequiredForNextLevel(skill.level);
    skill.level += 1;
    levelsGained += 1;

    // Safety guard against corrupted data creating runaway loops.
    if (levelsGained > 1000) {
      skill.xp = 0;
      break;
    }
  }

  const leveledUp = levelsGained > 0;

  return {
    success: true,
    leveledUp,
    capped: false,
    oldLevel,
    newLevel: skill.level,
    levelsGained,
    xpAdded,
    message: leveledUp ? `${def.name} reached level ${skill.level}.` : null
  };
}

// -----------------------------------------------------------------------------
// XP MULTIPLIERS / CLASS BOOSTS
// -----------------------------------------------------------------------------

export function isClassBoostedSkill(player, skillId) {
  return !!player?.classSkill && player.classSkill === skillId;
}

export function getSkillXpMultiplier(player, skillId) {
  const base = 1;

  if (!player || !skillId) return base;

  const classBoost = isClassBoostedSkill(player, skillId)
    ? Number(player.classXpMultiplier || 1.5)
    : 1;

  return Math.max(0, base * classBoost);
}

export function calculateSkillXpGain(player, skillId, baseAmount) {
  const base = Math.max(0, Math.floor(baseAmount || 0));
  const multiplier = getSkillXpMultiplier(player, skillId);

  return Math.max(0, Math.floor(base * multiplier));
}

export function addPlayerSkillXP(player, skillId, amount) {
  if (!player) {
    return {
      success: false,
      leveledUp: false,
      oldLevel: 1,
      newLevel: 1,
      levelsGained: 0,
      xpAdded: 0,
      message: 'Player not found.'
    };
  }

  migrateSkillState(player);

  const adjusted = calculateSkillXpGain(player, skillId, amount);

  return addSkillXP(player.skillState, skillId, adjusted);
}

// -----------------------------------------------------------------------------
// COMBAT LEVEL SYSTEM
// -----------------------------------------------------------------------------

export function getCombatSkillLevels(skillState) {
  return COMBAT_SKILL_IDS.map(skillId => {
    const def = RUNALIS_SKILLS[skillId];

    return {
      id: skillId,
      name: def.name,
      shortName: def.shortName,
      level: getSkillLevel(skillState, skillId),
      xp: getSkillXP(skillState, skillId),
      used: hasUsedSkill(skillState, skillId)
    };
  });
}

export function getCombatLevel(skillStateOrPlayer) {
  const skillState = normalizeSkillStateInput(skillStateOrPlayer);
  const combat = getCombatSkillLevels(skillState);

  if (!combat.length) return 1;

  const highest = Math.max(...combat.map(s => s.level));
  const average = combat.reduce((sum, s) => sum + s.level, 0) / combat.length;

  // One strong combat style matters, but broad mastery still helps.
  const level = Math.floor(highest * 0.62 + average * 0.38);

  return Math.max(1, level);
}

export function getCombatLevelDetails(skillStateOrPlayer) {
  const skillState = normalizeSkillStateInput(skillStateOrPlayer);
  const combat = getCombatSkillLevels(skillState);
  const level = getCombatLevel(skillState);

  const highest = combat.reduce((best, skill) => {
    if (!best) return skill;
    if (skill.level > best.level) return skill;
    if (skill.level === best.level && skill.xp > best.xp) return skill;
    return best;
  }, null);

  const average = combat.length
    ? combat.reduce((sum, s) => sum + s.level, 0) / combat.length
    : 1;

  return {
    level,
    rankName: getCombatRankName(level),
    highestSkill: highest,
    averageCombatLevel: average,
    skills: combat
  };
}

export function getCombatLevelProgress(skillStateOrPlayer) {
  const skillState = normalizeSkillStateInput(skillStateOrPlayer);
  const combat = getCombatSkillLevels(skillState);
  const currentLevel = getCombatLevel(skillState);

  // Since Combat Level is derived, not directly XP-based, this is an approximate
  // progress bar based on the average progress of combat skills at their current levels.
  const progresses = combat.map(skill => getSkillProgress(skillState, skill.id));
  const percent = progresses.length
    ? progresses.reduce((sum, p) => sum + p.percent, 0) / progresses.length
    : 0;

  return {
    level: currentLevel,
    nextLevel: currentLevel + 1,
    percent: Math.max(0, Math.min(100, percent)),
    skills: progresses
  };
}

export function getCombatRankName(level) {
  const safeLevel = Math.max(1, Math.floor(level || 1));

  if (safeLevel >= 100) return 'Mythic Combatant';
  if (safeLevel >= 80) return 'Legendary Combatant';
  if (safeLevel >= 60) return 'Master Combatant';
  if (safeLevel >= 45) return 'Veteran Combatant';
  if (safeLevel >= 30) return 'Seasoned Combatant';
  if (safeLevel >= 20) return 'Battle-Tested';
  if (safeLevel >= 10) return 'Trained Combatant';
  if (safeLevel >= 5) return 'Novice Combatant';

  return 'Unproven Combatant';
}

// -----------------------------------------------------------------------------
// CLASS COMBAT LEVEL SYSTEM
// -----------------------------------------------------------------------------

export function getClassCombatSkillId(player) {
  if (!player) return null;

  if (player.classSkill) return player.classSkill;

  const link = getClassSkillLink(player.classId);
  return link?.skillId || null;
}

export function getClassCombatLevel(player) {
  if (!player) return 0;

  const skillId = getClassCombatSkillId(player);
  if (!skillId) return 0;

  return getSkillLevel(player.skillState, skillId);
}

export function getClassCombatLevelProgress(player) {
  if (!player) {
    return {
      classId: null,
      className: 'Classless',
      skillId: null,
      skillName: null,
      level: 0,
      xp: 0,
      next: 0,
      percent: 0,
      rankName: 'Classless'
    };
  }

  migrateSkillState(player);

  const skillId = getClassCombatSkillId(player);

  if (!skillId) {
    return {
      classId: null,
      className: 'Classless',
      skillId: null,
      skillName: null,
      level: 0,
      xp: 0,
      next: 0,
      percent: 0,
      rankName: 'Classless'
    };
  }

  const progress = getSkillProgress(player.skillState, skillId);
  const className = player.className || getClassNameForClassId(player.classId) || 'Class';
  const skillName = getSkillDefinition(skillId)?.name || skillId;
  const rankName = getClassRankName(player.classId, progress.level);

  return {
    classId: player.classId || null,
    className,
    skillId,
    skillName,
    level: progress.level,
    xp: progress.xp,
    next: progress.next,
    percent: progress.percent,
    rankName
  };
}

export function getClassRankName(classId, level) {
  const safeLevel = Math.max(0, Math.floor(level || 0));
  const className = getClassNameForClassId(classId) || 'Class';

  if (safeLevel <= 0) return 'Classless';

  const tiers = getClassRankTierNames(classId);

  if (safeLevel >= 100) return tiers.mythic;
  if (safeLevel >= 80) return tiers.legendary;
  if (safeLevel >= 60) return tiers.master;
  if (safeLevel >= 45) return tiers.veteran;
  if (safeLevel >= 30) return tiers.adept;
  if (safeLevel >= 20) return tiers.initiatePlus;
  if (safeLevel >= 10) return tiers.initiate;

  return `${className} Novice`;
}

function getClassRankTierNames(classId) {
  if (classId === 'templar') {
    return {
      initiate: 'Templar Initiate',
      initiatePlus: 'Sworn Templar',
      adept: 'Templar Adept',
      veteran: 'Oathblade',
      master: 'Oathbound Master',
      legendary: 'Radiant Champion',
      mythic: 'Mythic Seraphblade'
    };
  }

  if (classId === 'mercenary') {
    return {
      initiate: 'Mercenary Initiate',
      initiatePlus: 'Trail Mercenary',
      adept: 'Deadeye Adept',
      veteran: 'Veteran Ranger',
      master: 'Master Marksman',
      legendary: 'Legendary Deadeye',
      mythic: 'Mythic Horizon Stalker'
    };
  }

  if (classId === 'necromancer') {
    return {
      initiate: 'Necromancer Initiate',
      initiatePlus: 'Gravecaller',
      adept: 'Pale Adept',
      veteran: 'Deathbinder',
      master: 'Lichmaster',
      legendary: 'Legendary Grave Sovereign',
      mythic: 'Mythic Lord of the Pale'
    };
  }

  if (classId === 'thornbinder') {
    return {
      initiate: 'Thornbinder Initiate',
      initiatePlus: 'Rootsworn',
      adept: 'Briar Adept',
      veteran: 'Wild Warden',
      master: 'Heartroot Master',
      legendary: 'Legendary Thornwarden',
      mythic: 'Mythic Verdant Titan'
    };
  }

  return {
    initiate: `${className} Initiate`,
    initiatePlus: `${className} Adept`,
    adept: `${className} Veteran`,
    veteran: `${className} Master`,
    master: `${className} Grandmaster`,
    legendary: `${className} Legend`,
    mythic: `${className} Mythic`
  };
}

// -----------------------------------------------------------------------------
// DISPLAY / BUILD IDENTITY
// -----------------------------------------------------------------------------

export function getHighestCombatSkills(skillState) {
  if (!skillState?.skills) return [];

  return Object.keys(skillState.skills)
    .filter(isCombatSkill)
    .map(skillId => ({
      id: skillId,
      name: RUNALIS_SKILLS[skillId].name,
      shortName: RUNALIS_SKILLS[skillId].shortName,
      level: getSkillLevel(skillState, skillId),
      xp: getSkillXP(skillState, skillId),
      used: hasUsedSkill(skillState, skillId)
    }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp);
}

export function getCharacterBuildName(skillStateOrPlayer) {
  const skillState = normalizeSkillStateInput(skillStateOrPlayer);
  const combat = getHighestCombatSkills(skillState).filter(s => s.used);

  if (!combat.length) {
    return 'Human Wanderer';
  }

  const combatLevel = getCombatLevel(skillState);
  const top = combat[0];

  if (combatLevel < 10) {
    return 'Human Wanderer';
  }

  const second = combat[1];

  if (second && second.used && second.level >= Math.max(10, top.level * 0.75)) {
    const hybrid = getHybridBuildName(top.id, second.id);
    if (hybrid) return hybrid;
  }

  if (top.id === 'blade') return 'Blade Wanderer';
  if (top.id === 'archery') return 'Trail Archer';
  if (top.id === 'spirit') return 'Spirit-Touched Wanderer';
  if (top.id === 'warding') return 'Warden Wanderer';

  return 'Skilled Wanderer';
}

function getHybridBuildName(a, b) {
  const key = [a, b].sort().join('+');

  const names = {
    'archery+blade': 'Weapon Master',
    'blade+spirit': 'Soulblade',
    'blade+warding': 'Oathguard',
    'archery+spirit': 'Hex Archer',
    'archery+warding': 'Sentinel',
    'spirit+warding': 'Occult Bulwark'
  };

  return names[key] || null;
}

export function getSkillClassLink(skillId) {
  return RUNALIS_SKILLS[skillId]?.classLinkedTo || null;
}

export function getSkillClassNote(skillId) {
  return RUNALIS_SKILLS[skillId]?.classNote || '';
}

export function getProgressionSummary(player) {
  if (!player) {
    return {
      combatLevel: 1,
      combatRank: 'Unproven Combatant',
      classLevel: 0,
      classRank: 'Classless',
      className: 'Classless',
      classSkill: null,
      buildName: 'Human Wanderer'
    };
  }

  migrateSkillState(player);

  const combatLevel = getCombatLevel(player.skillState);
  const classProgress = getClassCombatLevelProgress(player);

  return {
    combatLevel,
    combatRank: getCombatRankName(combatLevel),
    combatProgress: getCombatLevelProgress(player.skillState),
    classLevel: classProgress.level,
    classRank: classProgress.rankName,
    className: classProgress.className,
    classSkill: classProgress.skillId,
    classSkillName: classProgress.skillName,
    classProgress,
    buildName: getCharacterBuildName(player.skillState)
  };
}

// -----------------------------------------------------------------------------
// MIGRATION
// -----------------------------------------------------------------------------

export function migrateSkillState(player) {
  if (!player) return player;

  if (!player.skillState) {
    player.skillState = createNewSkillState();
  }

  if (!player.skillState.skills) {
    player.skillState.skills = {};
  }

  delete player.skillState.breakthroughPointsTotal;
  delete player.skillState.breakthroughPointsSpent;

  for (const skillId of Object.keys(RUNALIS_SKILLS)) {
    if (!player.skillState.skills[skillId]) {
      player.skillState.skills[skillId] = {
        level: 1,
        xp: 0,
        used: false
      };
    }

    const newSkill = player.skillState.skills[skillId];

    newSkill.level = Math.max(1, Math.floor(newSkill.level || 1));
    newSkill.xp = Math.max(0, Math.floor(newSkill.xp || 0));
    newSkill.used = !!newSkill.used;

    delete newSkill.breakthrough;

    if (player.skills?.[skillId]) {
      const oldSkill = player.skills[skillId];

      newSkill.level = Math.max(
        newSkill.level,
        Math.max(1, Math.floor(oldSkill.level || 1))
      );

      newSkill.xp = Math.max(
        newSkill.xp,
        Math.max(0, Math.floor(oldSkill.xp || 0))
      );

      newSkill.used =
        newSkill.used ||
        !!oldSkill.used ||
        oldSkill.xp > 0 ||
        oldSkill.level > 1;
    }
  }

  for (const skillId of Object.keys(player.skillState.skills)) {
    if (!RUNALIS_SKILLS[skillId]) {
      delete player.skillState.skills[skillId];
    }
  }

  // Class migration and cleanup.
  if (player.classId && CLASS_SKILL_LINKS[player.classId]) {
    const link = CLASS_SKILL_LINKS[player.classId];

    player.className = player.className || link.className;
    player.classSkill = player.classSkill || link.skillId;
    player.classXpMultiplier = Number(player.classXpMultiplier || 1.5);
  }

  if (!player.classId) {
    player.className = player.className || null;
    player.classSkill = player.classSkill || null;
    player.classXpMultiplier = Number(player.classXpMultiplier || 1.5);
  }

  player.combatLevel = getCombatLevel(player.skillState);
  player.classLevel = getClassCombatLevel(player);

  return player;
}

// -----------------------------------------------------------------------------
// LEGACY COMPATIBILITY BRIDGE
// -----------------------------------------------------------------------------
// This lets older files still read player.skills.blade.level while the project
// is being upgraded script-by-script.

export function syncLegacySkills(player) {
  if (!player) return player;

  migrateSkillState(player);

  player.skills = player.skills || {};

  for (const skillId of Object.keys(RUNALIS_SKILLS)) {
    const s = player.skillState.skills[skillId];

    player.skills[skillId] = {
      level: s.level,
      xp: s.xp,
      next: getXPRequiredForNextLevel(s.level),
      used: s.used,

      // Deprecated compatibility only.
      breakthrough: false
    };
  }

  player.combatLevel = getCombatLevel(player.skillState);
  player.classLevel = getClassCombatLevel(player);

  return player;
}

// -----------------------------------------------------------------------------
// NORMALIZATION HELPERS
// -----------------------------------------------------------------------------

function normalizeSkillStateInput(skillStateOrPlayer) {
  if (!skillStateOrPlayer) return createNewSkillState();

  if (skillStateOrPlayer.skills && !skillStateOrPlayer.skillState) {
    return skillStateOrPlayer;
  }

  if (skillStateOrPlayer.skillState) {
    return skillStateOrPlayer.skillState;
  }

  return skillStateOrPlayer;
}

// -----------------------------------------------------------------------------
// DEPRECATED BREAKTHROUGH COMPATIBILITY FUNCTIONS
// -----------------------------------------------------------------------------
// These intentionally do nothing meaningful now.
// They exist only so older imports continue working until all files are clean.

export function hasBreakthrough(skillState, skillId) {
  return false;
}

export function getAvailableBreakthroughPoints(skillState) {
  return 0;
}

export function isSkillCapped(skillState, skillId) {
  return false;
}

export function spendBreakthroughPoint(skillState, skillId) {
  const def = getSkillDefinition(skillId);

  return {
    success: false,
    message: def
      ? `${def.name} no longer requires breakthroughs. Skills now level infinitely.`
      : 'Skills now level infinitely.'
  };
}

export function getBrokenThroughCombatSkills(skillState) {
  return [];
}