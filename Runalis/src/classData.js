// classData.js
// Runalis shared class data.
// This is the single source of truth for class identity, linked skills,
// class abilities, preferred weapon types, instructor names, and class passives.
//
// Goal:
// - Prevent data.js and player.js from drifting apart.
// - Keep class selection, UI display, abilities, passives, and future dungeon logic consistent.
// - Preserve older save compatibility through legacy ability aliases.

export const RUNALIS_CLASSES = {
  templar: {
    id: 'templar',
    name: 'Templar',

    skill: 'blade',
    xpMultiplier: 1.5,
    weaponType: 'sword',

    instructorName: 'Oathbound Templar',

    qAbility: 'heavyCut',
    rAbility: 'cleavingStep',

    abilitySlots: ['heavyCut', 'cleavingStep', null, null],

    passive: {
      id: 'oathboundRiposte',
      name: 'Oathbound Riposte',
      desc: 'Blocking damage briefly empowers your next melee strike.'
    },

    flavor:
      'A disciplined melee path built around Blade training, blocking, and punishing openings.'
  },

  mercenary: {
    id: 'mercenary',
    name: 'Mercenary',

    skill: 'archery',
    xpMultiplier: 1.5,
    weaponType: 'bow',

    instructorName: 'Sellsword Ranger',

    qAbility: 'quickShot',
    rAbility: 'markedArrow',

    abilitySlots: ['quickShot', 'markedArrow', null, null],

    passive: {
      id: 'combatReload',
      name: 'Combat Reload',
      desc: 'Dashing briefly empowers your next arrow or ranged weapon hit.'
    },

    flavor:
      'A mobile ranged path built around Archery training, spacing, kiting, and burst shots.'
  },

  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',

    skill: 'spirit',
    xpMultiplier: 1.5,
    weaponType: 'scythe',

    instructorName: 'Gravecaller',

    qAbility: 'graveSpark',
    rAbility: 'summonLich',

    abilitySlots: ['graveSpark', 'summonLich', null, null],

    passive: {
      id: 'deathHarvest',
      name: 'Death Harvest',
      desc: 'Enemy kills restore a small amount of health and spirit.'
    },

    flavor:
      'A spirit path built around necrotic pressure, lifedrain, curses, and undead allies.'
  },

  thornbinder: {
    id: 'thornbinder',
    name: 'Thornbinder',

    skill: 'warding',
    xpMultiplier: 1.5,
    weaponType: 'staff',

    instructorName: 'Wild Oathkeeper',

    qAbility: 'vineWhip',
    rAbility: 'summonThornbeast',

    abilitySlots: ['vineWhip', 'summonThornbeast', null, null],

    passive: {
      id: 'livingBulwark',
      name: 'Living Bulwark',
      desc: 'Blocking or taking damage can trigger minor regeneration and thorn retaliation.'
    },

    flavor:
      'A defensive nature path built around Warding training, roots, survival, and living summons.'
  }
};

// -----------------------------------------------------------------------------
// LEGACY ABILITY ALIASES
// -----------------------------------------------------------------------------
// Older versions of Runalis used different ability IDs in player.js.
// These aliases let old saves migrate cleanly to the current data.js ability IDs.

export const LEGACY_ABILITY_ALIASES = {
  radiantCleave: 'heavyCut',
  oathguard: 'cleavingStep',

  piercingShot: 'quickShot',
  snareTrap: 'markedArrow',

  necroticBolt: 'graveSpark',

  vineLash: 'vineWhip'
};

// -----------------------------------------------------------------------------
// PUBLIC HELPERS
// -----------------------------------------------------------------------------

export function getAllClassDefinitions() {
  return Object.values(RUNALIS_CLASSES);
}

export function getClassDefinition(classId) {
  return RUNALIS_CLASSES[classId] || null;
}

export function getClassIdFromName(className) {
  if (!className) return null;

  const normalized = String(className).trim().toLowerCase();

  for (const classData of Object.values(RUNALIS_CLASSES)) {
    if (classData.name.toLowerCase() === normalized) {
      return classData.id;
    }
  }

  return null;
}

export function getClassSkillFromName(className) {
  const classId = getClassIdFromName(className);
  return RUNALIS_CLASSES[classId]?.skill || null;
}

export function getClassName(classId) {
  return RUNALIS_CLASSES[classId]?.name || 'None';
}

export function getClassSkill(classId) {
  return RUNALIS_CLASSES[classId]?.skill || null;
}

export function getClassWeaponType(classId) {
  return RUNALIS_CLASSES[classId]?.weaponType || null;
}

export function getClassInstructorName(classId) {
  return RUNALIS_CLASSES[classId]?.instructorName || null;
}

export function getClassPassive(classId) {
  return RUNALIS_CLASSES[classId]?.passive || null;
}

export function normalizeAbilityId(abilityId) {
  if (!abilityId) return abilityId;
  return LEGACY_ABILITY_ALIASES[abilityId] || abilityId;
}

export function normalizeAbilitySlots(slots) {
  const safeSlots = Array.isArray(slots) ? [...slots] : [null, null, null, null];

  while (safeSlots.length < 4) {
    safeSlots.push(null);
  }

  return safeSlots.slice(0, 4).map(slot => normalizeAbilityId(slot));
}

export function getClassAbilitySlots(classId) {
  const classData = getClassDefinition(classId);

  if (!classData) {
    return [null, null, null, null];
  }

  return normalizeAbilitySlots(classData.abilitySlots);
}

export function getClassPrimaryAbility(classId) {
  const classData = getClassDefinition(classId);
  return normalizeAbilityId(classData?.qAbility || null);
}

export function getClassSecondaryAbility(classId) {
  const classData = getClassDefinition(classId);
  return normalizeAbilityId(classData?.rAbility || null);
}

export function classOwnsAbility(classId, abilityId) {
  const normalizedAbilityId = normalizeAbilityId(abilityId);
  const slots = getClassAbilitySlots(classId);

  return slots.includes(normalizedAbilityId);
}

export function getClassByAbility(abilityId) {
  const normalizedAbilityId = normalizeAbilityId(abilityId);

  for (const classData of Object.values(RUNALIS_CLASSES)) {
    if (getClassAbilitySlots(classData.id).includes(normalizedAbilityId)) {
      return classData;
    }
  }

  return null;
}

export function getClassDisplaySummary(classId) {
  const classData = getClassDefinition(classId);

  if (!classData) {
    return {
      name: 'None',
      skill: null,
      weaponType: null,
      xpMultiplier: 1,
      passiveName: 'None',
      passiveDesc: 'No class passive selected.'
    };
  }

  return {
    name: classData.name,
    skill: classData.skill,
    weaponType: classData.weaponType,
    xpMultiplier: classData.xpMultiplier || 1.5,
    passiveName: classData.passive?.name || 'Class Passive',
    passiveDesc: classData.passive?.desc || '',
    flavor: classData.flavor || ''
  };
}