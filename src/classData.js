import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
// classData.js
// Runalis shared class data.
// This is the single source of truth for class identity, linked skills,
// class abilities, preferred weapon types, instructor names, and class passives.
//
// Goal:
// - Prevent data.js and player.js from drifting apart.
// - Keep class selection, UI display, abilities, passives, and future dungeon logic consistent.
// - Preserve older save compatibility through legacy ability aliases.

export const CLASS_ID_ALIASES = {
  templar: 'oathkeeper',
  necromancer: 'gravecaller',
  hydromancer: 'waverider',
  mercenary: 'fellhunter'
};

export function normalizeClassId(classId) {
  if (!classId) return classId;
  const id = String(classId).trim();
  return CLASS_ID_ALIASES[id] || id;
}

export function isGravecallerClassId(classId) {
  return normalizeClassId(classId) === 'gravecaller';
}

export const RUNALIS_CLASSES = {
  classless: {
    id: 'classless',
    name: 'Classless',

    skill: null,
    xpMultiplier: 1.25,
    weaponType: 'sword',

    instructorName: null,

    qAbility: null,
    rAbility: null,

    abilitySlots: [null, null, null, null, 'block'],

    passive: null,

    flavor:
      'An independent adventurer with no order, class tree, or class passive. Starts with a sword; Blades and Stamina earn 25% extra XP. Learn ordinary disciplines and scrolls freely.'
  },

  oathkeeper: {
    id: 'oathkeeper',
    name: 'Oathkeeper',

    skill: 'blunt',
    xpMultiplier: 1.25,
    weaponType: 'mace',

    instructorName: 'Oathkeeper Elian',

    qAbility: 'oathkeeperOathStrike',
    rAbility: 'oathkeeperDivineLeap',

    abilitySlots: ['oathkeeperOathStrike', null, null, null, 'block'],

    passive: {
      id: 'conviction',
      name: 'Conviction',
      desc: 'Blocking, taking hits, and landing melee blows build divine momentum that empowers your next smite, heal, or shield technique.'
    },

    flavor:
      'A slow, durable melee bruiser who keeps sacred oaths through shields, smites, divine leaps, and holy AoE.'
  },

  fellhunter: {
    id: 'fellhunter',
    name: 'Fellhunter',

    skill: 'archery',
    xpMultiplier: 1.25,
    weaponType: 'bow',

    instructorName: 'Bram',

    qAbility: 'fellhunterThrowingDaggers',
    rAbility: 'fellhunterBearTrap',

    abilitySlots: ['fellhunterThrowingDaggers', null, null, null, 'block'],

    passive: {
      id: 'tacticalAdvantage',
      name: 'Tactical Advantage',
      desc: 'Dodge and tools prepare Tactical Advantage for melee or ranged weapon attacks. Traps and gadgets Expose enemies for stronger follow-ups.'
    },

    flavor:
      'A grounded human survivor who wins with traps, throwing blades, bombs, smoke, grappling tools, and prepared kill zones.'
  },

  gravecaller: {
    id: 'gravecaller',
    name: 'Gravecaller',

    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'scythe',

    instructorName: 'Gravecaller',

    qAbility: 'graveSpark',
    rAbility: 'summonLich',

    abilitySlots: ['graveSpark', 'summonLich', null, null, 'block'],

    passive: {
      id: 'deathHarvest',
      name: 'Death Harvest',
      desc: 'Enemy kills restore Spirit. Necrotic Bolt and summon attacks steal life; healing bonuses strengthen eligible attacks instead of every spell.'
    },

    flavor:
      'A fragile spirit path that forks into Commander of the Dead skeleton leadership or Lichbound Reaper necrotic scythe-casting.'
  },

  thornbinder: {
    id: 'thornbinder',
    name: 'Thornbinder',

    skill: 'warding',
    xpMultiplier: 1.25,
    weaponType: 'staff',

    instructorName: 'Mara Vell',

    qAbility: 'thornbinderThornLash',
    rAbility: 'thornbinderBramblePatch',

    abilitySlots: ['thornbinderThornLash', null, null, null, 'block'],

    passive: {
      id: 'briarBloom',
      name: 'Briar Bloom',
      desc: 'Thorn and root magic opens Verdant Wounds, slowing enemies and sustaining nearby allies with a modest regeneration aura.'
    },

    flavor:
      'A flexible plant-magic caster who lashes enemies with thorny vines, slows the battlefield, calls rose-headed beasts, and wins through attrition.'
  },

  waverider: {
    id: 'waverider',
    name: 'Waverider',

    skill: 'warding',
    xpMultiplier: 1.25,
    weaponType: 'sword',

    instructorName: 'Tideglass Adept',

    qAbility: 'hydromancerWaterTorrent',
    rAbility: 'hydromancerBubbleWard',

    abilitySlots: ['hydromancerWaterTorrent', null, null, null, 'block'],

    passive: {
      id: 'livingWater',
      name: 'Living Water',
      desc: 'Water abilities build Flow. At three Flow, your next Waverider ability is empowered.'
    },

    flavor:
      'A fast, fluid water fighter who controls space with waves, applies Soaked to enemies, and flows between damage, mobility, and sustain.'
  },

  lightbringer: {
    id: 'lightbringer',
    name: 'Lightbringer',

    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'spiritFocus',

    instructorName: 'Lumen Sable',

    qAbility: 'lightbringerGleamBolt',
    rAbility: 'lightbringerDawncarver',

    abilitySlots: ['lightbringerGleamBolt', null, null, null, 'block'],

    passive: {
      id: 'lumenVessel',
      name: 'Lumen Vessel',
      desc: 'Build up to three Lumens with radiant attacks, then spend them on beams, verdicts, and halo shields.'
    },

    flavor:
      'A ranged radiant battle-caster built around Spirit Focus weapons, Halo Brand setup, Lumens, and Dawncarver beam payoffs.'
  },

  eldritch: {
    id: 'eldritch',
    name: 'Eldritch',

    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'eldritch',
    hidden: true,

    instructorName: 'The Red Door',

    qAbility: 'voidstepBurst',
    rAbility: 'summonEldritchHorror',

    abilitySlots: ['voidstepBurst', null, null, null, 'block'],

    passive: {
      id: 'starlessConduit',
      name: 'Starless Conduit',
      desc: 'Channeled red-black lightning scales with Spirit and rewards dangerous positioning.'
    },

    flavor:
      'A forbidden hidden path built around channeled lightning, void movement, and impossible summons.'
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

// -----------------------------------------------------------------------------
// LEGACY ABILITY ALIASES
// -----------------------------------------------------------------------------
// Older versions of Runalis used different ability IDs in player.js.
// These aliases let old saves migrate cleanly to the current data.js ability IDs.

export const LEGACY_ABILITY_ALIASES = {
  heavyCut: 'oathkeeperOathStrike',
  cleavingStep: 'oathkeeperDivineLeap',
  radiantSmite: 'oathkeeperJudgmentSmite',
  aegisBreaker: 'oathkeeperBastionBash',
  radiantCleave: 'oathkeeperOathStrike',
  oathguard: 'oathkeeperBulwarkOfLight',
  templarOathStrike: 'oathkeeperOathStrike',
  templarBastionBash: 'oathkeeperBastionBash',
  templarDivineLeap: 'oathkeeperDivineLeap',
  templarAoeSmite: 'oathkeeperJudgmentSmite',
  templarConsecratedGround: 'oathkeeperConsecratedGround',
  templarBulwarkOfLight: 'oathkeeperBulwarkOfLight',
  templarLastRite: 'oathkeeperLastRite',
  templarHeavenbreakerJudgment: 'oathkeeperHeavenbreakerJudgment',

  quickShot: 'fellhunterThrowingDaggers',
  markedArrow: 'fellhunterMarkedShot',
  arrowVolley: 'fellhunterFlamingArrowVolley',
  smokeBomb: 'fellhunterSmokeBomb',
  piercingShot: 'fellhunterThrowingDaggers',
  snareTrap: 'fellhunterBearTrap',
  mercenaryPracticalStrike: 'fellhunterPracticalStrike',
  mercenaryThrowingDaggers: 'fellhunterThrowingDaggers',
  mercenaryBearTrap: 'fellhunterBearTrap',
  mercenaryCaltrops: 'fellhunterCaltrops',
  mercenaryBombToss: 'fellhunterBombToss',
  mercenaryGrapplingHook: 'fellhunterGrapplingHook',
  mercenarySmokeBomb: 'fellhunterSmokeBomb',
  mercenaryFlamingArrowVolley: 'fellhunterFlamingArrowVolley',
  mercenaryMarkedShot: 'fellhunterMarkedShot',
  mercenaryKillZone: 'fellhunterKillZone',

  necroticBolt: 'graveSpark',

  vineLash: 'thornbinderThornLash',
  vineWhip: 'thornbinderThornLash',
  thornLash: 'thornbinderThornLash',
  wildBloom: 'thornbinderLivingBriar',
  brambleSnare: 'thornbinderRootPrison',
  thornPatch: 'thornbinderBramblePatch',
  summonThornbeast: 'thornbinderSummonThornlings'
};

// -----------------------------------------------------------------------------
// PUBLIC HELPERS
// -----------------------------------------------------------------------------

export function getAllClassDefinitions() {
  return Object.values(RUNALIS_CLASSES).filter(classData => !classData.aliasFor && !classData.hidden);
}

export function getClassDefinition(classId) {
  return RUNALIS_CLASSES[normalizeClassId(classId)] || null;
}

// Temporary roster exclusions. Keep the definitions/aliases available to
// saved characters; all new class-selection entry points use this gate.
export const TEMPORARILY_UNAVAILABLE_CLASSES=Object.freeze(['classless']);
export function isClassAvailable(classId){
  const definition=getClassDefinition(classId);
  return !!definition&&!TEMPORARILY_UNAVAILABLE_CLASSES.includes(definition.id);
}
export function getSelectableClassDefinitions({includeHidden=false}={}){
  return Object.values(RUNALIS_CLASSES).filter(c=>!c.aliasFor&&isClassAvailable(c.id)&&(includeHidden||!c.hidden));
}

export function getClassIdFromName(className) {
  if (!className) return null;

  const normalized = String(className).trim().toLowerCase();

  if (normalized === 'necromancer') return 'gravecaller';
  if (normalized === 'templar') return 'oathkeeper';
  if (normalized === 'hydromancer') return 'waverider';
  if (normalized === 'mercenary') return 'fellhunter';

  for (const classData of getAllClassDefinitions()) {
    if (classData.name.toLowerCase() === normalized) {
      return classData.id;
    }
  }

  return null;
}

export function getClassSkillFromName(className) {
  const classId = getClassIdFromName(className);
  return getClassDefinition(classId)?.skill || null;
}

export function getClassName(classId) {
  return getClassDefinition(classId)?.name || 'None';
}

export function getClassSkill(classId) {
  return getClassDefinition(classId)?.skill || null;
}

export function getClassWeaponType(classId) {
  return getClassDefinition(classId)?.weaponType || null;
}

export function getClassInstructorName(classId) {
  return getClassDefinition(classId)?.instructorName || null;
}

export function getClassPassive(classId) {
  return getClassDefinition(classId)?.passive || null;
}

export function normalizeAbilityId(abilityId) {
  if (!abilityId) return abilityId;
  return LEGACY_ABILITY_ALIASES[abilityId] || abilityId;
}

export function normalizeAbilitySlots(slots) {
  const safeSlots = Array.isArray(slots) ? [...slots] : [null, null, null, null, 'block'];

  while (safeSlots.length < HOTBAR_SLOT_COUNT) {
    safeSlots.push(safeSlots.length===HOTBAR_SLOT_COUNT-1?'block':null);
  }

  return safeSlots.slice(0, HOTBAR_SLOT_COUNT).map(slot => normalizeAbilityId(slot));
}

export function getClassAbilitySlots(classId) {
  const classData = getClassDefinition(classId);

  if (!classData) {
    return [null, null, null, null, 'block'];
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

  for (const classData of getAllClassDefinitions()) {
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
      xpMultiplier: 1.25,
      passiveName: 'None',
      passiveDesc: 'No class passive selected.'
    };
  }

  if (classData.id === 'classless') {
    return {
      name: classData.name,
      skill: null,
      weaponType: classData.weaponType,
      xpMultiplier: 1.25,
      passiveName: 'None',
      passiveDesc: 'Classless has no class passive or class tree. Blades and Stamina earn 25% extra XP.',
      flavor: classData.flavor || ''
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
