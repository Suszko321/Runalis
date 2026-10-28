import { XP_CURVES, xpRequired, xpForLevels, advanceProgression, safeXP, safeLevel } from './progressionMath.js';
import { affinityMultiplier, getClassAffinities } from './progressionProfiles.js';
import { awardHotbarMasteryXp } from './abilityMasterySystem.js';
// skills.js
// Runalis infinite skill + combat level system.
//
// Core rules:
// - Skills have no authored level cap, within finite numeric storage limits.
// - Leveling is intentionally slow long-term.
// - Early levels move fast enough to feel rewarding.
// - Later levels ease into exponentially increasing XP.
// - The player has an overall Combat Level.
// - Combat Level owns a separate XP pool fed by qualifying encounters.
// - Class choice does NOT block other skills.
// - Each identity has exactly two +25% XP affinities.
// - Breakthroughs/caps are deprecated and no longer restrict leveling.

// -----------------------------------------------------------------------------
// SKILL DEFINITIONS
// -----------------------------------------------------------------------------

export const RUNALIS_SKILLS = {
  blunt: {
    id:'blunt', name:'Blunt Weapons', shortName:'BLT', type:'combat', dormantName:'Untrained',
    description:'Crushing force with maces and hammers. Strengthens blunt weapon attacks and Oathkeeper techniques.',
    primaryVerb:'Crush', combatWeight:1, classLinkedTo:'Oathkeeper', classIdLinkedTo:'oathkeeper',
    classNote:'Oathkeepers train Blunt Weapons 25% faster.'
  },
  blade: {
    id: 'blade',
    name: 'Blades',
    shortName: 'BLD',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Melee mastery with swords, knives, staves, axes, spears, and dueling. Scythes train their own proficiency.',
    primaryVerb: 'Strike',
    combatWeight: 1,
    classNote: 'Anyone can train Blades. Maces and hammers use Blunt Weapons.'
  },

  archery: {
    id: 'archery',
    name: 'Archery',
    shortName: 'ARC',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Bow mastery, ranged pressure, throwing weapons, traps, prepared shots, and fighting from distance.',
    primaryVerb: 'Shoot',
    combatWeight: 1,
    classLinkedTo: 'Fellhunter',
    classIdLinkedTo: 'fellhunter',
    classNote: 'Fellhunters train Archery faster, but anyone can level Archery forever.'
  },

  spirit: {
    id: 'spirit',
    name: 'Spirit',
    shortName: 'SPI',
    type: 'combat',
    dormantName: 'Dormant',
    description: 'Spirit reserves and magical force: soul magic, curses, lifedrain, ghosts, and unnatural power. Summoned creatures train Summoning separately.',
    primaryVerb: 'Invoke',
    combatWeight: 1,
    classLinkedTo: 'Lightbringer / Eldritch',
    classIdLinkedTo: 'lightbringer',
    classNote: 'Lightbringers and Eldritch train Spirit 25% faster. Every identity has Spirit reserves and can learn universal Spirit techniques.'
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

  defence: {
    id: 'defence',
    name: 'Defence',
    shortName: 'DEF',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Armour use, bracing, blocking discipline, damage reduction, and surviving pressure.',
    primaryVerb: 'Brace',
    combatWeight: 1
  },

  hitpoints: {
    id: 'hitpoints',
    name: 'Health',
    shortName: 'HP',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Raw durability, pain tolerance, recovery, and the ability to keep fighting through wounds.',
    primaryVerb: 'Endure',
    combatWeight: 1
  },

  stamina: {
    id: 'stamina',
    name: 'Stamina',
    shortName: 'STA',
    type: 'combat',
    dormantName: 'Untrained',
    description: 'Action economy, sprinting, dodging, blocking endurance, and staying dangerous while tired.',
    primaryVerb: 'Exert',
    combatWeight: 1
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

  woodcutting: {
    id: 'woodcutting',
    name: 'Woodcutting',
    shortName: 'WDC',
    type: 'gathering',
    dormantName: 'Untrained',
    description: 'Fell trees, split fallen logs, gather rare woods, bark, roots, and resins for tools and gear.',
    primaryVerb: 'Chop'
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
    description: 'Reputation, trust, settlement standing, discoveries, and your name in Echoryn Forest.',
    primaryVerb: 'Earn'
  }
};

Object.assign(RUNALIS_SKILLS, {
  scythe: { id:'scythe', name:'Scythes', shortName:'SCY', type:'combat', dormantName:'Untrained', description:'Reaping arcs, hooked attacks and momentum with scythes.', primaryVerb:'Reap' },
  summoning: { id:'summoning', name:'Summoning', shortName:'SUM', type:'combat', dormantName:'Untrained', description:'Universal companion proficiency. Sustained summon loadouts and useful companion combat train this discipline.', primaryVerb:'Call' },
  focus: { id:'focus', name:'Focus', shortName:'FOC', type:'combat', dormantName:'Untrained', description:'Magical control: faster charge buildup and more efficient sustained channels.', primaryVerb:'Concentrate' },
  dexterity: { id:'dexterity', name:'Dexterity', shortName:'DEX', type:'combat', dormantName:'Untrained', description:'Physical handling: modest attack cadence and dodge efficiency.', primaryVerb:'React' }
});

export const WEAPON_COMBAT_SKILL_IDS = ['blade', 'blunt', 'scythe', 'archery', 'spirit', 'warding', 'summoning'];
export const SURVIVAL_COMBAT_SKILL_IDS = ['defence', 'hitpoints', 'stamina', 'focus', 'dexterity'];
export const COMBAT_SKILL_IDS = [...WEAPON_COMBAT_SKILL_IDS, ...SURVIVAL_COMBAT_SKILL_IDS];

export const CLASS_SKILL_LINKS = {
  oathkeeper: {
    classId: 'oathkeeper',
    className: 'Oathkeeper',
    skillId: 'blunt',
    skillName: 'Blunt Weapons'
  },

  templar: {
    classId: 'templar',
    className: 'Oathkeeper',
    skillId: 'blunt',
    skillName: 'Blunt Weapons'
  },

  fellhunter: {
    classId: 'fellhunter',
    className: 'Fellhunter',
    skillId: 'archery',
    skillName: 'Archery'
  },

  mercenary: {
    classId: 'mercenary',
    className: 'Fellhunter',
    skillId: 'archery',
    skillName: 'Archery'
  },

  gravecaller: {
    classId: 'gravecaller',
    className: 'Gravecaller',
    skillId: 'spirit',
    skillName: 'Spirit'
  },

  necromancer: {
    classId: 'necromancer',
    className: 'Gravecaller',
    skillId: 'spirit',
    skillName: 'Spirit'
  },

  eldritch: {
    classId: 'eldritch',
    className: 'Eldritch',
    skillId: 'spirit',
    skillName: 'Spirit'
  },

  thornbinder: {
    classId: 'thornbinder',
    className: 'Thornbinder',
    skillId: 'warding',
    skillName: 'Warding'
  },

  waverider: {
    classId: 'waverider',
    className: 'Waverider',
    skillId: 'warding',
    skillName: 'Warding'
  },

  hydromancer: {
    classId: 'hydromancer',
    className: 'Waverider',
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

  return { skills, combat: { level: 1, xp: 0 }, progressionVersion: 2, bluntProgressionVersion: 1 };
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
//   Original polynomial through level 10, then a smooth exponential tail.
//   See progressionMath.js for the shared player / skill / mastery curves.
//
// Closed-form totals keep large awards efficient and retain remainders.

export function getXPRequiredForNextLevel(level) { return xpRequired(level); }
export function getTotalXPRequiredToReachLevel(targetLevel) { return xpForLevels(1, safeLevel(targetLevel) - 1); }
export function getEstimatedLevelFromTotalXP(totalXp) {
  const entry = { level:1, xp:0 }; advanceProgression(entry,totalXp);
  return { level:entry.level, xpIntoLevel:entry.xp, next:xpRequired(entry.level) };
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
  const def = getSkillDefinition(skillId), entry = skillState?.skills?.[skillId];
  if (!def || !entry) return { success:false, leveledUp:false, levelsGained:0, xpAdded:0, message:'Skill not found.' };
  const result = advanceProgression(entry, amount);
  if (result.xpAdded > 0) entry.used = true;
  return { ...result, success:true, capped:false, message:result.leveledUp ? `${def.name} reached level ${entry.level}.` : null };
}


export function isClassBoostedSkill(player, skillId) { return getClassAffinities(player).includes(skillId); }
export function getSkillXpMultiplier(player, skillId) { return affinityMultiplier(player, skillId); }


export function calculateSkillXpGain(player, skillId, baseAmount) {
  const base = safeXP(baseAmount);
  const multiplier = getSkillXpMultiplier(player, skillId);

  return safeXP(base * multiplier);
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

  const result = addSkillXP(player.skillState, skillId, adjusted);
  awardHotbarMasteryXp(player,result.xpAdded);
  return result;
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

function getLegacyCombatLevel(skillStateOrPlayer) {
  const skillState = normalizeSkillStateInput(skillStateOrPlayer);
  const weaponLevels = ['blade', 'archery', 'spirit', 'warding'].map(skillId => getSkillLevel(skillState, skillId));
  const highestWeapon = Math.max(...weaponLevels, 1);
  const weaponAverage = weaponLevels.reduce((sum, level) => sum + level, 0) / weaponLevels.length;
  const defenceLevel = getSkillLevel(skillState, 'defence');
  const hitpointsLevel = getSkillLevel(skillState, 'hitpoints');
  const staminaLevel = getSkillLevel(skillState, 'stamina');
  const survivalAverage = (defenceLevel + hitpointsLevel + staminaLevel) / 3;
  const combinedAverage = (weaponLevels.reduce((sum, level) => sum + level, 0) + defenceLevel + hitpointsLevel + staminaLevel) / 7;

  // Combat level should represent the whole fighter, not only the active weapon.
  // The highest weapon still matters, but broad combat training now visibly counts.
  const level = Math.floor(
    highestWeapon * 0.28 +
    weaponAverage * 0.22 +
    survivalAverage * 0.28 +
    combinedAverage * 0.22
  );

  return Math.max(1, level);
}

export function getCombatLevel(skillStateOrPlayer) {
  const state = normalizeSkillStateInput(skillStateOrPlayer);
  return state?.combat ? safeLevel(state.combat.level) : getLegacyCombatLevel(state);
}
export function addCombatXP(player, amount, options = {}) {
  migrateSkillState(player);
  const result = advanceProgression(player.skillState.combat, amount, XP_CURVES.combat);
  player.combatLevel = player.skillState.combat.level;
  awardHotbarMasteryXp(player,result.xpAdded,performance.now()/1000,options.log);
  return result;
}

export function getCombatLevelDetails(skillStateOrPlayer) {
  const skillState = normalizeSkillStateInput(skillStateOrPlayer);
  const combat = getCombatSkillLevels(skillState);
  const level = getCombatLevel(skillState);
  const weaponSkills = WEAPON_COMBAT_SKILL_IDS.map(skillId => ({
    id: skillId,
    name: RUNALIS_SKILLS[skillId].name,
    shortName: RUNALIS_SKILLS[skillId].shortName,
    level: getSkillLevel(skillState, skillId),
    xp: getSkillXP(skillState, skillId),
    used: hasUsedSkill(skillState, skillId)
  }));

  const highest = combat.reduce((best, skill) => {
    if (!best) return skill;
    if (skill.level > best.level) return skill;
    if (skill.level === best.level && skill.xp > best.xp) return skill;
    return best;
  }, null);

  const average = combat.length
    ? combat.reduce((sum, s) => sum + s.level, 0) / combat.length
    : 1;

  const highestWeaponSkill = weaponSkills.reduce((best, skill) => {
    if (!best) return skill;
    if (skill.level > best.level) return skill;
    if (skill.level === best.level && skill.xp > best.xp) return skill;
    return best;
  }, null);

  const weaponAverageLevel = weaponSkills.length
    ? weaponSkills.reduce((sum, s) => sum + s.level, 0) / weaponSkills.length
    : 1;

  return {
    level,
    rankName: getCombatRankName(level),
    highestSkill: highest,
    highestWeaponSkill,
    weaponAverageLevel,
    defenceLevel: getSkillLevel(skillState, 'defence'),
    hitpointsLevel: getSkillLevel(skillState, 'hitpoints'),
    staminaLevel: getSkillLevel(skillState, 'stamina'),
    averageCombatLevel: average,
    skills: combat
  };
}

export function getCombatLevelProgress(skillStateOrPlayer) {
  const state = normalizeSkillStateInput(skillStateOrPlayer), level = getCombatLevel(state);
  const xp = safeXP(state?.combat?.xp), next = xpRequired(level, XP_CURVES.combat);
  return { level, nextLevel:level + 1, xp, next, percent:Math.min(100,100*xp/next), skills:[] };
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
  return 0;
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

  const className = player.className || getClassNameForClassId(player.classId) || 'Class';
  const skillName = getSkillDefinition(skillId)?.name || skillId;

  return {
    classId: player.classId || null,
    className,
    skillId,
    skillName,
    level: 0,
    xp: 0,
    next: 0,
    percent: 0,
    rankName: 'Class level removed'
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
  if (classId === 'oathkeeper' || classId === 'templar') {
    return {
      initiate: 'Oathkeeper Initiate',
      initiatePlus: 'Sworn Oathkeeper',
      adept: 'Oathkeeper Adept',
      veteran: 'Oathforged Warden',
      master: 'Oathbound Master',
      legendary: 'Radiant Champion',
      mythic: 'Mythic Vowhammer'
    };
  }

  if (classId === 'fellhunter' || classId === 'mercenary') {
    return {
      initiate: 'Fellhunter Initiate',
      initiatePlus: 'Prepared Fellhunter',
      adept: 'Trapline Adept',
      veteran: 'Veteran Fellhunter',
      master: 'Master Kill Zone',
      legendary: 'Legendary Fellhunter',
      mythic: 'Mythic Nightmare Stalker'
    };
  }

  if (classId === 'gravecaller' || classId === 'necromancer') {
    return {
      initiate: 'Gravecaller Initiate',
      initiatePlus: 'Pale Caller',
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

  if (classId === 'waverider' || classId === 'hydromancer') {
    return {
      initiate: 'Waverider Initiate',
      initiatePlus: 'Current Shaper',
      adept: 'Tideglass Adept',
      veteran: 'Riptide Warden',
      master: 'Wellspring Master',
      legendary: 'Legendary Tidecaller',
      mythic: 'Mythic Crown of Deluge'
    };
  }

  if (classId === 'eldritch') {
    return {
      initiate: 'Eldritch Initiate',
      initiatePlus: 'Starless Vessel',
      adept: 'Rift Adept',
      veteran: 'Red Storm Savant',
      master: 'Old Door Harbinger',
      legendary: 'Legendary Void Conduit',
      mythic: 'Mythic Starless Horror'
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
  if (top.id === 'defence') return 'Ironbound Wanderer';
  if (top.id === 'hitpoints') return 'Battle-Scarred Wanderer';
  if (top.id === 'stamina') return 'Restless Wanderer';

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
      buildName: 'Human Wanderer',
      weaponSkillName: 'Weapon',
      weaponSkillLevel: 1,
      defenceLevel: 1,
      hitpointsLevel: 1,
      staminaLevel: 1
    };
  }

  migrateSkillState(player);

  const combatLevel = getCombatLevel(player.skillState);
  const details = getCombatLevelDetails(player.skillState);
  const classProgress = getClassCombatLevelProgress(player);
  const displayWeaponSkill = getDisplayedWeaponSkill(player, details.highestWeaponSkill);

  return {
    combatLevel,
    combatRank: getCombatRankName(combatLevel),
    combatProgress: getCombatLevelProgress(player.skillState),
    classLevel: 0,
    classRank: 'Class level removed',
    className: classProgress.className,
    classSkill: classProgress.skillId,
    classSkillName: classProgress.skillName,
    classProgress,
    weaponSkill: displayWeaponSkill?.id || null,
    weaponSkillName: displayWeaponSkill?.name || 'Weapon',
    weaponSkillLevel: displayWeaponSkill?.level || 1,
    defenceLevel: details.defenceLevel,
    hitpointsLevel: details.hitpointsLevel,
    staminaLevel: details.staminaLevel,
    buildName: getCharacterBuildName(player.skillState)
  };
}

function getDisplayedWeaponSkill(player, highestWeaponSkill) {
  const preferredSkillId = player?.loadout?.primarySkill || player?.classSkill || null;

  if (!preferredSkillId || !WEAPON_COMBAT_SKILL_IDS.includes(preferredSkillId)) {
    return highestWeaponSkill || null;
  }

  const preferred = {
    id: preferredSkillId,
    name: RUNALIS_SKILLS[preferredSkillId]?.name || preferredSkillId,
    shortName: RUNALIS_SKILLS[preferredSkillId]?.shortName || preferredSkillId.toUpperCase(),
    level: getSkillLevel(player.skillState, preferredSkillId),
    xp: getSkillXP(player.skillState, preferredSkillId),
    used: hasUsedSkill(player.skillState, preferredSkillId)
  };

  if (!highestWeaponSkill) return preferred;
  if (preferred.level > highestWeaponSkill.level) return preferred;
  if (preferred.level === highestWeaponSkill.level && preferred.xp >= highestWeaponSkill.xp) return preferred;

  return highestWeaponSkill;
}

// -----------------------------------------------------------------------------
// MIGRATION
// -----------------------------------------------------------------------------

export function migrateSkillState(player) {
  if (!player) return player;

  if (!player.skillState) {
    player.skillState = createNewSkillState();
    if(player.skills?.blade)delete player.skillState.bluntProgressionVersion;
  }

  if (!player.skillState.skills) {
    player.skillState.skills = {};
  }

  const legacyProgression = !player.skillState.progressionVersion || player.skillState.progressionVersion < 2;
  if (!player.skillState.combat) {
    // Preserve the old derived level once. Subsequent skill gains cannot recalculate it.
    player.skillState.combat = { level: Math.max(getLegacyCombatLevel(player.skillState), safeLevel(player.combatLevel)), xp:0 };
  }
  player.skillState.combat.level = safeLevel(player.skillState.combat.level);
  player.skillState.combat.xp = safeXP(player.skillState.combat.xp);
  player.skillState.progressionVersion = 2;
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

    newSkill.level = safeLevel(newSkill.level);
    newSkill.xp = safeXP(newSkill.xp);
    newSkill.used = !!newSkill.used;

    delete newSkill.breakthrough;

    if (!player.skillState.legacySkillsImported && player.skills?.[skillId]) {
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

  if (legacyProgression) {
    const skills=player.skillState.skills;
    const learned=[...(player.knownAbilities||[]),...(player.unlockedAbilities||[])];
    const oldSummoner=learned.some(id=>/summon|Thornlings|Thornbeast|DeathEcho/i.test(id)) || (player.summons||[]).length>0;
    if (oldSummoner) { const source=skills.spirit.level>=skills.warding.level?skills.spirit:skills.warding; skills.summoning={...source}; }
    const weaponId=typeof player.equipment?.weapon==='string'?player.equipment.weapon:player.equipment?.weapon?.id;
    if (/scythe/i.test(weaponId||'') || ['gravecaller','necromancer'].includes(player.classId)) skills.scythe={...skills.spirit};
  }
  // Preserve old mace proficiency once; Blade remains valid for actual blades.
  if (!player.skillState.bluntProgressionVersion) {
    const ref=player.equipment?.weapon, id=typeof ref==='object'?ref?.id:ref;
    const wasBlunt=['oathkeeper','templar'].includes(player.classId)||/oathkeeper|templar/i.test(player.className||'')||/mace|hammer|maul/i.test(id||'')||['mace','hammer','maul'].includes(ref?.weaponType);
    const old=player.skillState.skills.blade,current=player.skillState.skills.blunt;
    if(wasBlunt)player.skillState.bluntMigratedFromBlade=true;
    if(wasBlunt && old && (old.level>current.level || old.level===current.level && old.xp>current.xp))player.skillState.skills.blunt={...old};
    player.skillState.bluntProgressionVersion=1;
  }
  if(['oathkeeper','templar'].includes(player.classId)) {
    player.classSkill='blunt';
    if(player.loadout?.primarySkill==='blade' && /mace|hammer|maul/i.test(String(player.equipment?.weapon?.id||player.equipment?.weapon||'')))player.loadout.primarySkill='blunt';
  }
  player.skillState.legacySkillsImported = true;

  // Class migration and cleanup.
  if (player.classId && CLASS_SKILL_LINKS[player.classId]) {
    const link = CLASS_SKILL_LINKS[player.classId];

    player.className = player.className || link.className;
    player.classSkill = player.classSkill || link.skillId;
    player.classXpMultiplier = 1.25;
  }

  if (!player.classId) {
    player.className = player.className || null;
    player.classSkill = player.classSkill || null;
    player.classXpMultiplier = Number(player.classXpMultiplier || 1);
  }

  player.combatLevel = getCombatLevel(player.skillState);
  player.classLevel = 0;

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
  player.classLevel = 0;

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
