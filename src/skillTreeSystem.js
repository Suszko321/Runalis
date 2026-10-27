import { COMBAT_EXPANSION_ABILITIES } from './combatExpansionData.js';
import {getSubclassPassiveBonuses} from './subclassSystem.js';
import {getClassDefinition,isGravecallerClassId} from './classData.js';
import {createExpertiseNodes,normalizeExpertisePurchases} from './skillExpertiseSystem.js';
import {SUBCLASS_CLASS_TREES} from './subclassData.js';
// skillTreeSystem.js
// Passive skill tree foundation for Runalis progression.

import {
  normalizeAbilityManagementState,
  unlockActiveAbility,
  unlockPassive
} from './abilityLoadoutSystem.js';
import { ITEMS, getAbilityById, normalizeAbilityId } from './data.js';
import {createDisciplinePassives} from './skillTreePassives.js';
import {getCombatLevel} from './skills.js';

export const SKILL_TREE_VERSION = 16;
const removedOathNodes=new Set(['blade_execution','blade_guardian_oath']);

export const SKILL_TREE_NODES = {
  blade_root: {
    id: 'blade_root',
    tree: 'blade',
    role: 'Oathkeeper Core',
    name: 'Oathbound Vanguard',
    desc: '+3 power, +3 armour, and +4% max health. Opens the Oathkeeper shield, smite, and bruiser branches.',
    cost: 1,
    requires: [],
    bonuses: { power: 3, armour: 3, maxHpPct: 4 }
  },
  blade_combo: {
    id: 'blade_combo',
    tree: 'blade',
    role: 'Bruiser',
    name: 'Close Quarters',
    desc: '+5% ability damage, +6% wounded damage and +6% holy and necrotic damage. Opens the pressure route for either morph family.',
    cost: 1,
    requires: ['blade_root'],
    bonuses: { abilityDamagePct: 5, woundedDamagePct: 6, holyDamagePct: 6, necroticDamagePct: 6 }
  },
  blade_divine_leap: {
    id: 'blade_divine_leap',
    tree: 'blade',
    role: 'Mobility',
    name: 'Divine Leap',
    desc: 'Unlocks Divine Leap: crash forward with holy force, damaging and staggering enemies near the landing point.',
    cost: 2,
    requires: ['blade_root'],
    bonuses: { cleavingStepRangePct: 12, staggerPowerPct: 6, moveSpeedPct: 3 },
    unlocksAbility: 'oathkeeperDivineLeap'
  },
  blade_radiant_smite: {
    id: 'blade_radiant_smite',
    tree: 'blade',
    role: 'Smite / AoE',
    name: 'Judgment Smite',
    desc: 'Unlocks Judgment Smite: a holy burst, a Holyknight single-target hammer, or a Sinner sword impalement. +8% holy and necrotic damage and +5% ability damage.',
    cost: 2,
    requires: ['blade_combo'],
    bonuses: { holyDamagePct: 8, necroticDamagePct: 8, abilityDamagePct: 5, judgmentSmiteRadiusPct: 8 },
    unlocksAbility: 'oathkeeperJudgmentSmite'
  },
  blade_oathguard: {
    id: 'blade_oathguard',
    tree: 'blade',
    role: 'Shield Doctrine',
    name: 'Shield Doctrine',
    desc: 'Unlocks Bastion Bash, grants +6 armour, and lowers block stamina drain by 10%.',
    cost: 1,
    requires: ['blade_root'],
    bonuses: { armour: 6, blockCostReductionPct: 10 },
    unlocksAbility: 'oathkeeperBastionBash'
  },
  blade_bastion: {
    id: 'blade_bastion',
    tree: 'blade',
    role: 'Shield Doctrine',
    name: 'Bastion Training',
    desc: '+12 Stamina, +6 armour, +8% blocking movement speed and stagger, and stronger Conviction and ripostes. The guard route supports either morph family.',
    cost: 2,
    requires: ['blade_oathguard'],
    bonuses: { maxStamina: 12, armour: 6, blockMoveSpeedPct: 8, staggerPowerPct: 8, ripostePowerPct: 12, convictionPowerPct: 8 }
  },
  blade_sunbreaker: {
    id: 'blade_sunbreaker',
    tree: 'blade',
    role: 'Smite / AoE',
    name: "Smiter's Flame",
    desc: '+10% holy and necrotic damage, +8% ability damage, wider original Judgment Smite, and one additional Judgment Smite use charge.',
    cost: 3,
    requires: ['blade_radiant_smite'],
    bonuses: { holyDamagePct: 10, necroticDamagePct: 10, abilityDamagePct: 8, judgmentSmiteRadiusPct: 18, abilityCharge_oathkeeperJudgmentSmite: 1 }
  },
  blade_living_bastion: {
    id: 'blade_living_bastion',
    tree: 'blade',
    role: 'Shield Doctrine',
    name: 'Living Bastion',
    desc: '+10% max health, lower block cost, and an additional Bastion Bash use charge.',
    cost: 3,
    requires: ['blade_bastion'],
    bonuses: { maxHpPct: 10, blockCostReductionPct: 10, blockReflectPct: 8, abilityCharge_oathkeeperBastionBash: 1 }
  },
  blade_last_rite: {
    id: 'blade_last_rite',tree: 'blade',role: 'Recovery',name: 'Last Rite',
    desc: 'Unlocks Last Rite, Holyknight Second Wind and Sinner Reclaim the Forsaken. Recovery is available from either doctrine; morphs unlock at skill mastery 5 and 10.',
    cost: 2,requires: ['blade_root'],bonuses: {},unlocksAbility: 'oathkeeperLastRite'
  },
  blade_vow_of_protection: {
    id: 'blade_vow_of_protection',
    tree: 'blade',
    role: 'Consecrator',
    name: 'Consecrator',
    desc: 'Unlocks Consecrated Ground and improves the damage reduction gained while holding the holy zone.',
    cost: 2,
    requires: ['blade_bastion'],
    bonuses: { consecratedGroundDurationPct: 18, defenseBuffDurationPct: 18 },
    unlocksAbility: 'oathkeeperConsecratedGround'
  },
  blade_aegis_breaker: {
    id: 'blade_aegis_breaker',
    tree: 'blade',
    role: 'Bulwark',
    name: 'Bulwark of Light',
    desc: 'Unlocks Bulwark of Light: a radiant shield stance that sharply improves block and incoming damage reduction.',
    cost: 2,
    requires: ['blade_oathguard'],
    bonuses: { armour: 4, blockCostReductionPct: 6, staggerPowerPct: 10 },
    unlocksAbility: 'oathkeeperBulwarkOfLight'
  },
  blade_last_sanctuary: {
    id: 'blade_last_sanctuary',
    tree: 'blade',
    role: 'Capstone',
    name: 'Heavenbreaker Judgment',
    desc: 'Unlocks Heavenbreaker Judgment. Also improves armour, Last Rite efficiency, and Oathkeeper recharge flow.',
    cost: 3,
    requires: ['blade_sunbreaker', 'blade_living_bastion'],
    requirementMode: 'any',
    bonuses: {
      armour: 6,
      power: 6,
      lastRiteCostReductionPct: 8,
      judgmentSmiteRadiusPct: 10,
      abilityRechargePct_oathkeeperJudgmentSmite: 15,
      abilityRechargePct_oathkeeperBastionBash: 15
    },
    unlocksAbility: 'oathkeeperHeavenbreakerJudgment'
  },

  archery_root: {
    id: 'archery_root',
    tree: 'archery',
    role: 'Fellhunter Core',
    name: 'Prepared Survivor',
    desc: 'Unlocks Practical Strike, Bloodhound Barbed Shot and Hellstalker Hellfire Bolt. Also grants +2 power, stronger Exposed hits and faster trap setup.',
    cost: 1,
    requires: [],
    bonuses: { power: 2, exposedDamagePct: 8, trapArmSpeedPct: 10 },
    unlocksAbility: 'fellhunterPracticalStrike'
  },
  archery_focus: {
    id: 'archery_focus',
    tree: 'archery',
    role: 'Trap Setter',
    name: 'Reinforced Springs',
    desc: 'Unlocks Bear Trap, strengthens its snap damage, and keeps targets Exposed a little longer.',
    cost: 1,
    requires: ['archery_root'],
    choiceGroup: 'fellhunter_opening_path',
    bonuses: { trapDamagePct: 8, exposedDurationPct: 8 },
    unlocksAbility: 'fellhunterBearTrap'
  },
  archery_mobility: {
    id: 'archery_mobility',
    tree: 'archery',
    role: 'Mobility',
    name: 'Hookline Training',
    desc: 'Unlocks Grappling Hook and improves repositioning after using practical tools.',
    cost: 2,
    requires: ['archery_root'],
    bonuses: { moveSpeedPct: 4, grapplingHookRangePct: 12, dodgeCostReductionPct: 6 },
    unlocksAbility: 'fellhunterGrapplingHook'
  },
  archery_volley: {
    id: 'archery_volley',
    tree: 'archery',
    role: 'Area Denial',
    name: 'Caltrops',
    desc: 'Unlocks Caltrops: a grounded area-denial tool that slows enemies and makes them Exposed.',
    cost: 2,
    requires: ['archery_root'],
    bonuses: { trapDamagePct: 6, slowDurationPct: 8 },
    unlocksAbility: 'fellhunterCaltrops'
  },
  archery_trick_arrows: {
    id: 'archery_trick_arrows',
    tree: 'archery',
    role: 'Knife Work',
    name: 'Weighted Knives',
    desc: 'Throwing Daggers, Venom Fangs and Cinder Lance gain an additional use charge. Adds +8% damage to Bleed, Poison and Infernal Brand ticks.',
    cost: 2,
    requires: ['archery_root'],
    choiceGroup: 'fellhunter_opening_path',
    bonuses: { abilityDamagePct: 4, exposedDamagePct: 6, subclassDotPct: 8, abilityCharge_fellhunterThrowingDaggers: 1 }
  },
  archery_field_captain: {
    id: 'archery_field_captain',
    tree: 'archery',
    role: 'Dirty Fighting',
    name: 'Exploit the Opening',
    desc: '+4 power, +4 armour, and stronger hits against enemies made Exposed by traps, smoke, or marked shots.',
    cost: 3,
    requires: ['archery_trick_arrows', 'archery_mobility'],
    requirementMode: 'any',
    bonuses: { armour: 4, power: 4, exposedDamagePct: 10 }
  },
  archery_rapid_reload: {
    id: 'archery_rapid_reload',
    tree: 'archery',
    role: 'Trap Setter',
    name: 'Barbed Jaws',
    desc: 'Bear Trap and caltrops bite harder. Adds +8% Bleed, Poison and Infernal Brand tick damage; existing layers keep their lifetimes.',
    cost: 2,
    requires: ['archery_mobility'],
    choiceGroup: 'fellhunter_combat_method',
    bonuses: { trapDamagePct: 10, exposedDurationPct: 12, subclassDotPct: 8, abilityCharge_fellhunterBearTrap: 1 }
  },
  archery_broadside: {
    id: 'archery_broadside',
    tree: 'archery',
    role: 'Explosives',
    name: 'Fire and Oil',
    desc: 'Unlocks Flaming Arrow Volley, five-bolt Razor Rain and Infernal Barrage. Bombs and volleys cover a wider area.',
    cost: 3,
    requires: ['archery_volley'],
    choiceGroup: 'fellhunter_combat_method',
    bonuses: { volleyDamagePct: 10, volleyExtraHits: 1, volleyWidthPct: 18, bombRadiusPct: 12 },
    unlocksAbility: 'fellhunterFlamingArrowVolley'
  },
  archery_contract_mark: {
    id: 'archery_contract_mark',
    tree: 'archery',
    role: 'Precision',
    name: 'Marked Shot',
    desc: 'Unlocks Marked Shot: a careful arrow or crossbow shot that applies Exposed for a focused punish window.',
    cost: 2,
    requires: ['archery_root'],
    bonuses: { markedShotDamagePct: 14, exposedDamagePct: 6, markedTargetDamagePct: 8 },
    unlocksAbility: 'fellhunterMarkedShot'
  },
  archery_battlefield_medic: {
    id: 'archery_battlefield_medic',
    tree: 'archery',
    role: 'Gadget Belt',
    name: 'Quick Fuse Kit',
    desc: 'Unlocks Bomb Toss. Bomb Toss and Smoke Bomb gain extra readiness through better-packed tools and quick fuses.',
    cost: 2,
    requires: ['archery_trick_arrows'],
    bonuses: { gadgetCooldownPct: 8, abilityCharge_fellhunterBombToss: 1, abilityCharge_fellhunterSmokeBomb: 1 },
    unlocksAbility: 'fellhunterBombToss'
  },
  archery_smoke_bomb: {
    id: 'archery_smoke_bomb',
    tree: 'archery',
    role: 'Escape Tool',
    name: 'Smoke Bomb',
    desc: 'Unlocks Smoke Bomb: a gray smoke burst that slows pursuit and leaves enemies briefly Exposed.',
    cost: 2,
    requires: ['archery_trick_arrows'],
    bonuses: { moveSpeedPct: 3, dodgeCostReductionPct: 6, smokeDurationPct: 12 },
    unlocksAbility: 'fellhunterSmokeBomb'
  },
  archery_roving_captain: {
    id: 'archery_roving_captain',
    tree: 'archery',
    role: 'Capstone',
    name: 'Kill Zone',
    desc: 'Unlocks Kill Zone. Prepared traps, caltrops, fuses, and a finishing volley become the Fellhunter capstone.',
    cost: 3,
    requires: ['archery_field_captain', 'archery_rapid_reload', 'archery_broadside'],
    requirementMode: 'any',
    bonuses: {
      abilityDamagePct: 5,
      exposedDamagePct: 8,
      killZoneRadiusPct: 12,
      abilityRechargePct_fellhunterThrowingDaggers: 18,
      abilityRechargePct_fellhunterSmokeBomb: 18,
      abilityRechargePct_fellhunterBombToss: 12
    },
    unlocksAbility: 'fellhunterKillZone'
  },

  spirit_root: {
    id: 'spirit_root',
    tree: 'spirit',
    role: 'Gravecaller Core',
    name: 'Grave Initiate',
    desc: '+10 maximum Spirit and +2 power. Opens the shared rites before the Commander or Lichbound doctrine.',
    cost: 1,
    requires: [],
    bonuses: { maxSpirit: 10, power: 2 }
  },
  spirit_harvest: {
    id: 'spirit_harvest',
    tree: 'spirit',
    role: 'Shared Necromancy',
    name: "Death's Discipline",
    desc: '+2 percentage points of lifesteal on Gravecaller skills and summon attacks that already drain life. Does not add healing to other spells.',
    cost: 1,
    requires: ['spirit_root'],
    choiceGroup: 'gravecaller_opening_path',
    bonuses: { gravecallerLifestealPct: 2 }
  },
  spirit_blood_lance: {
    id: 'spirit_blood_lance',
    tree: 'spirit',
    role: 'Shared Necromancy',
    name: 'Blood Lance',
    desc: 'Unlocks Blood Lance: a piercing necrotic strike that steals life and prepares the Reaper side of the class.',
    cost: 2,
    requires: ['spirit_root'],
    choiceGroup: 'gravecaller_opening_path',
    bonuses: { singleTargetDamagePct: 10 },
    unlocksAbility: 'bloodLance'
  },
  spirit_soul_reaper: {
    id: 'spirit_soul_reaper',
    tree: 'spirit',
    role: 'Lichbound Reaper',
    name: "Reaper's Scythe",
    desc: '+12% single-target damage, a second Blood Lance use, and stronger execute pressure for the Lichbound scythe-caster path.',
    cost: 3,
    requires: ['spirit_soul_siphon'],
    choiceGroup: 'gravecaller_final_path',
    bonuses: { singleTargetDamagePct: 12, woundedDamagePct: 8, necroticDamagePct: 8, abilityCharge_bloodLance: 1 }
  },
  spirit_minions: {
    id: 'spirit_minions',
    tree: 'spirit',
    role: 'Doctrine Gate',
    name: 'Bound Servants',
    desc: '+8% summon damage and +8% summon health. Your bound henchmen can take specter or lesser goliath knight mastery forms in Abilities. Opens Commander of the Dead or Lichbound Reaper.',
    cost: 2,
    requires: ['spirit_blood_lance', 'spirit_harvest'],
    requirementMode: 'any',
    bonuses: { summonDamagePct: 8, summonHealthPct: 8 }
  },
  spirit_lich_ascension: {
    id: 'spirit_lich_ascension',
    tree: 'spirit',
    role: 'Lichbound Reaper',
    choiceGroup: 'gravecaller_summon_path',
    name: 'Lichbound Reaper',
    desc: 'Learn Summon Lich as a separate ability, with optional mastery morphs into a ghostly specter or goliath deathknight. Keep Raise the Bound Dead. Locks Commander of the Dead.',
    cost: 2,
    requires: ['spirit_minions'],
    bonuses: { summonDamagePct: 14, summonHealthPct: 10, gravecallerLichbound: 1, necroticDamagePct: 4 },
    unlocksAbility: 'gravecallerSummonLich'
  },
  spirit_bone_coterie: {
    id: 'spirit_bone_coterie',
    tree: 'spirit',
    role: 'Commander of the Dead',
    choiceGroup: 'gravecaller_summon_path',
    name: 'Commander of the Dead',
    desc: 'Raise the Bound Dead now calls three of its selected form: skeletal henchmen, specters or lesser goliath knights. Each keeps its Vanguard, Reaver or Marksman equipment bonuses. Locks Lichbound Reaper.',
    cost: 2,
    requires: ['spirit_minions'],
    bonuses: { summonDamagePct: 6, summonHealthPct: 6, summonCount: 2, gravecallerCommander: 1 }
  },
  spirit_vital_theft: {
    id: 'spirit_vital_theft',
    tree: 'spirit',
    role: 'Commander Support',
    name: 'Grave Repair',
    desc: '+10 maximum Spirit and another base Soul Siphon use. Expands your reserve and strengthens your dedicated recovery tool.',
    cost: 2,
    requires: ['spirit_soul_siphon'],
    choiceGroup: 'gravecaller_final_path',
    bonuses: { maxSpirit: 10, abilityCharge_soulSiphon: 1 }
  },
  spirit_soul_siphon: {
    id: 'spirit_soul_siphon',
    tree: 'spirit',
    role: 'Doctrine Tool',
    name: 'Soul Siphon',
    desc: 'Either doctrine unlocks Soul Siphon: drain nearby enemies and convert part of the damage into survival.',
    cost: 2,
    requires: ['spirit_bone_coterie', 'spirit_lich_ascension'],
    requirementMode: 'any',
    bonuses: { singleTargetDamagePct: 4, necroticDamagePct: 4 },
    unlocksAbility: 'soulSiphon'
  },
  spirit_grave_command: {
    id: 'spirit_grave_command',
    tree: 'spirit',
    role: 'Capstone',
    name: 'Sovereign of the Pale Court',
    desc: 'Capstone: +12% necrotic damage and summon damage. Blood Lance and Soul Siphon recharge 18% faster.',
    cost: 3,
    requires: ['spirit_soul_reaper', 'spirit_vital_theft'],
    requirementMode: 'any',
    bonuses: {
      necroticDamagePct: 12,
      summonDamagePct: 12,
      abilityRechargePct_bloodLance: 18,
      abilityRechargePct_soulSiphon: 18
    }
  },

  warding_root: {
    id: 'warding_root',
    tree: 'warding',
    role: 'Thornbinder Core',
    name: 'Briar-Touched',
    desc: '+6 Spirit and stronger Briar Bloom healing. Opens Thorn Lash and Living Roots branches.',
    cost: 1,
    requires: [],
    bonuses: { maxSpirit: 6, briarBloomHealingPct: 8 }
  },
  warding_block: {
    id: 'warding_block',
    tree: 'warding',
    role: 'Vine Lasher',
    name: 'Thorn Lash Mastery',
    desc: 'Unlocks Briar Hook. Thorn Lash gains +10% range, +5% damage, and longer slow duration.',
    cost: 1,
    requires: ['warding_root'],
    choiceGroup: 'thornbinder_primary_path',
    bonuses: { thornLashRangePct: 10, thornLashDamagePct: 5, slowDurationPct: 8 },
    unlocksAbility: 'thornbinderBriarHook'
  },
  warding_thorns: {
    id: 'warding_thorns',
    tree: 'warding',
    role: 'Verdant Wounds',
    name: 'Verdant Wounds',
    desc: 'Thorn abilities wound enemies harder, adding more slow pressure and slightly stronger Briar Bloom.',
    cost: 2,
    requires: ['warding_block'],
    bonuses: { verdantWoundDamage: 2, slowDurationPct: 8, briarBloomHealingPct: 6 }
  },
  warding_elder_beast: {
    id: 'warding_elder_beast',
    tree: 'warding',
    role: 'Evolved Summon',
    choiceGroup: 'thornbinder_summon_path',
    name: 'Elder Thornbeast',
    desc: 'Unlock Summon Elder Thornbeast: one durable rosemaw companion with Elder Presence and Rosemaw Devour.',
    cost: 2,
    requires: ['warding_thorns'],
    bonuses: { summonDamagePct: 10, summonHealthPct: 22, briarBloomHealingPct: 5 },
    unlocksAbility: 'thornbinderSummonElderThornbeast'
  },
  warding_thornling_grove: {
    id: 'warding_thornling_grove',
    tree: 'warding',
    role: 'Multiple Lesser Summons',
    choiceGroup: 'thornbinder_summon_path',
    name: 'Thornling Pack',
    desc: 'Unlock Summon Thornlings: three fragile rose-headed beasts that spread slows and wounds across groups.',
    cost: 2,
    requires: ['warding_thorns'],
    bonuses: { summonDamagePct: 4, summonHealthPct: 6, supportHealingPct: 5 },
    unlocksAbility: 'thornbinderSummonThornlings'
  },
  warding_guardian_compact: {
    id: 'warding_guardian_compact',
    tree: 'warding',
    role: 'Branch Merge',
    name: 'Pack or Rosemaw',
    desc: 'Whichever companion path you chose becomes better at holding enemies in Verdant Wounds and grants another Living Briar use.',
    cost: 2,
    requires: ['warding_elder_beast', 'warding_thornling_grove'],
    requirementMode: 'any',
    bonuses: { summonDamagePct: 6, summonHealthPct: 8, supportHealingPct: 5, abilityCharge_thornbinderLivingBriar: 1 }
  },
  warding_wild_bloom: {
    id: 'warding_wild_bloom',
    tree: 'warding',
    role: 'Living Briar',
    name: 'Living Briar',
    desc: 'Unlock Living Briar: an active, modest regeneration aura that stacks with the passive Briar Bloom rhythm.',
    cost: 2,
    requires: ['warding_block'],
    bonuses: { briarBloomHealingPct: 10, supportHealingPct: 8 },
    unlocksAbility: 'thornbinderLivingBriar'
  },
  warding_overgrowth: {
    id: 'warding_overgrowth',
    tree: 'warding',
    role: 'AoE Control',
    name: 'Living Roots',
    desc: 'Unlocks Bramble Patch, adds +12% AoE radius, +8% root duration, and strengthens bramble control.',
    cost: 2,
    requires: ['warding_root'],
    choiceGroup: 'thornbinder_primary_path',
    bonuses: { aoeRadiusPct: 12, rootDurationPct: 8, bramblePatchDurationPct: 8 },
    unlocksAbility: 'thornbinderBramblePatch'
  },
  warding_bramble_snare: {
    id: 'warding_bramble_snare',
    tree: 'warding',
    role: 'AoE Control',
    name: 'Root Prison',
    desc: 'Unlock Root Prison: a stronger control field that briefly roots normal enemies and wounds clustered targets.',
    cost: 2,
    requires: ['warding_overgrowth'],
    bonuses: { rootDurationPct: 8, aoeDamagePct: 4, natureDamagePct: 4 },
    unlocksAbility: 'thornbinderRootPrison'
  },
  warding_thornstorm: {
    id: 'warding_thornstorm',
    tree: 'warding',
    role: 'AoE Control',
    name: 'Rosebite Growth',
    desc: 'Unlock Rosebite Burst, widen rosebite eruptions, and grant another Root Prison use charge.',
    cost: 3,
    requires: ['warding_overgrowth', 'warding_wild_bloom'],
    requirementMode: 'any',
    bonuses: { aoeDamagePct: 7, rootDurationPct: 8, natureDamagePct: 6, rosebiteRadiusPct: 16, abilityCharge_thornbinderRootPrison: 1 },
    unlocksAbility: 'thornbinderRosebiteBurst'
  },
  warding_living_battlefield: {
    id: 'warding_living_battlefield',
    tree: 'warding',
    role: 'Capstone',
    name: 'Garden of Thorns',
    desc: 'Capstone: Verdant Wounds, Briar Bloom, and your chosen rose-beast path all improve while Root Prison and Living Briar recharge faster.',
    cost: 3,
    requires: ['warding_thornstorm', 'warding_guardian_compact'],
    requirementMode: 'any',
    bonuses: {
      natureDamagePct: 12,
      aoeRadiusPct: 10,
      supportHealingPct: 8,
      briarBloomHealingPct: 10,
      verdantWoundDamage: 2,
      abilityRechargePct_thornbinderRootPrison: 18,
      abilityRechargePct_thornbinderLivingBriar: 18
    }
  },

  cambion_root: {
    id: 'cambion_root',
    tree: 'cambion',
    role: 'Infernal Core',
    name: 'Brand That Failed',
    desc: '+6% hellfire damage and +3 power. The pact marks you, but cannot own you.',
    cost: 1,
    requires: [],
    bonuses: { fireDamagePct: 6, power: 3 }
  },
  cambion_wrath: {
    id: 'cambion_wrath',
    tree: 'cambion',
    role: 'Burst DPS',
    name: 'Cruel Ember',
    desc: '+8% ability damage and wider Hellfire Brand eruptions.',
    cost: 1,
    requires: ['cambion_root'],
    choiceGroup: 'cambion_first_choice',
    bonuses: { abilityDamagePct: 8, bloodlineRadiusPct: 8 }
  },
  cambion_iron_hide: {
    id: 'cambion_iron_hide',
    tree: 'cambion',
    role: 'Endurance',
    name: 'Iron Under the Skin',
    desc: 'Temper infernal heat into armour and stamina instead of feeding its first violent answer.',
    cost: 1,
    requires: ['cambion_root'],
    choiceGroup: 'cambion_first_choice',
    bonuses: { armour: 4, maxStamina: 8 }
  },
  cambion_chain: {
    id: 'cambion_chain',
    tree: 'cambion',
    role: 'Punisher',
    name: 'Broken Chain',
    desc: '+10% damage against elites and bosses. You learned what cages feel like.',
    cost: 2,
    requires: ['cambion_wrath', 'cambion_iron_hide'],
    requirementMode: 'any',
    bonuses: { bossDamagePct: 10, eliteDamagePct: 10 }
  },
  cambion_heart: {
    id: 'cambion_heart',
    tree: 'cambion',
    role: 'Dangerous Power',
    name: 'Ashen Heart',
    desc: '+10% max health and +6% fire damage, but the rite still resists healing.',
    cost: 2,
    requires: ['cambion_chain'],
    bonuses: { maxHpPct: 10, fireDamagePct: 6 }
  },
  cambion_unbowed: {
    id: 'cambion_unbowed',
    tree: 'cambion',
    role: 'Defiance',
    choiceGroup: 'cambion_second_choice',
    name: 'Unbowed Flame',
    desc: 'Gain stronger hellfire and elite damage while refusing every master.',
    cost: 2,
    requires: ['cambion_heart'],
    bonuses: { fireDamagePct: 9, eliteDamagePct: 8 }
  },
  cambion_tempered: {
    id: 'cambion_tempered',
    tree: 'cambion',
    role: 'Control',
    choiceGroup: 'cambion_second_choice',
    name: 'Tempered Brand',
    desc: 'Trade raw fury for a steadier body and more reliable ability pressure.',
    cost: 2,
    requires: ['cambion_heart'],
    bonuses: { armour: 5, abilityDamagePct: 6 }
  },
  cambion_chainbreaker: {
    id: 'cambion_chainbreaker',
    tree: 'cambion',
    role: 'Defiance',
    name: 'Chainbreaker',
    desc: 'Either infernal discipline opens a stronger, wider Hellfire Brand.',
    cost: 2,
    requires: ['cambion_unbowed', 'cambion_tempered'],
    requirementMode: 'any',
    bonuses: { bloodlineRadiusPct: 14, bossDamagePct: 6 }
  },
  cambion_crownless_inferno: {
    id: 'cambion_crownless_inferno',
    tree: 'cambion',
    role: 'Capstone',
    name: 'Crownless Inferno',
    desc: 'Capstone: infernal power belongs to you alone. Greatly empowers bloodline and ability damage.',
    cost: 3,
    requires: ['cambion_chainbreaker'],
    bonuses: { fireDamagePct: 12, abilityDamagePct: 10, bloodlineRadiusPct: 10 }
  },

  nephilim_root: {
    id: 'nephilim_root',
    tree: 'nephilim',
    role: 'Radiant Core',
    name: 'Unowned Halo',
    desc: '+4 armour and +6% holy damage. The Light answers, but does not command.',
    cost: 1,
    requires: [],
    bonuses: { armour: 4, holyDamagePct: 6 }
  },
  nephilim_aegis: {
    id: 'nephilim_aegis',
    tree: 'nephilim',
    role: 'Protector',
    name: 'Seraphic Bulwark',
    desc: '+15% defense buff duration and stronger Seraphic Aegis shielding.',
    cost: 1,
    requires: ['nephilim_root'],
    choiceGroup: 'nephilim_first_choice',
    bonuses: { defenseBuffDurationPct: 15, bloodlineShieldPct: 12 }
  },
  nephilim_mortal_flare: {
    id: 'nephilim_mortal_flare',
    tree: 'nephilim',
    role: 'Judgment',
    name: 'Mortal Flare',
    desc: 'Shape the first radiant answer into a precise mortal weapon instead of a sheltering halo.',
    cost: 1,
    requires: ['nephilim_root'],
    choiceGroup: 'nephilim_first_choice',
    bonuses: { holyDamagePct: 7, critChancePct: 3 }
  },
  nephilim_judgment: {
    id: 'nephilim_judgment',
    tree: 'nephilim',
    role: 'Judgment',
    name: 'Mercy With Edges',
    desc: '+9% single-target damage and +8% holy damage after you refuse obedience.',
    cost: 2,
    requires: ['nephilim_aegis', 'nephilim_mortal_flare'],
    requirementMode: 'any',
    bonuses: { singleTargetDamagePct: 9, holyDamagePct: 8 }
  },
  nephilim_lantern: {
    id: 'nephilim_lantern',
    tree: 'nephilim',
    role: 'Sustained Defense',
    name: 'Small Mortal Light',
    desc: '+8% max health and +5 healing power. A lantern, not a sun.',
    cost: 2,
    requires: ['nephilim_judgment'],
    bonuses: { maxHpPct: 8, healingPower: 5 }
  },
  nephilim_mercy: {
    id: 'nephilim_mercy',
    tree: 'nephilim',
    role: 'Mercy',
    choiceGroup: 'nephilim_second_choice',
    name: 'Mercy Before Judgment',
    desc: 'Strengthen healing and protective wards without surrendering your will.',
    cost: 2,
    requires: ['nephilim_lantern'],
    bonuses: { healingPower: 7, bloodlineShieldPct: 10 }
  },
  nephilim_verdict: {
    id: 'nephilim_verdict',
    tree: 'nephilim',
    role: 'Judgment',
    choiceGroup: 'nephilim_second_choice',
    name: 'Mortal Verdict',
    desc: 'Turn radiant burden outward through stronger holy and wounded-target damage.',
    cost: 2,
    requires: ['nephilim_lantern'],
    bonuses: { holyDamagePct: 10, woundedDamagePct: 8 }
  },
  nephilim_wingless_guard: {
    id: 'nephilim_wingless_guard',
    tree: 'nephilim',
    role: 'Protector',
    name: 'Wingless Guard',
    desc: 'Either interpretation of the light leads to a stronger defensive presence.',
    cost: 2,
    requires: ['nephilim_mercy', 'nephilim_verdict'],
    requirementMode: 'any',
    bonuses: { armour: 6, defenseBuffDurationPct: 12 }
  },
  nephilim_unowned_dawn: {
    id: 'nephilim_unowned_dawn',
    tree: 'nephilim',
    role: 'Capstone',
    name: 'Unowned Dawn',
    desc: 'Capstone: carry radiant power without becoming its instrument.',
    cost: 3,
    requires: ['nephilim_wingless_guard'],
    bonuses: { holyDamagePct: 12, bloodlineShieldPct: 14, supportHealingPct: 8 }
  },

  vampire_root: {
    id: 'vampire_root',
    tree: 'vampire',
    role: 'Blood Core',
    name: 'First Hunger',
    desc: '+5% lifesteal and +3 power. The chalice taught hunger; you kept the name.',
    cost: 1,
    requires: [],
    bonuses: { lifestealPct: 5, power: 3 }
  },
  vampire_stalker: {
    id: 'vampire_stalker',
    tree: 'vampire',
    role: 'Duelist',
    name: 'Red Step',
    desc: '+5% movement speed and +8% crit damage for predatory skirmishing.',
    cost: 1,
    requires: ['vampire_root'],
    choiceGroup: 'vampire_first_choice',
    bonuses: { moveSpeedPct: 5, critDamagePct: 8 }
  },
  vampire_grave_patience: {
    id: 'vampire_grave_patience',
    tree: 'vampire',
    role: 'Restraint',
    name: 'Grave Patience',
    desc: 'Hold the first hunger still, hardening body and will before the hunt begins.',
    cost: 1,
    requires: ['vampire_root'],
    choiceGroup: 'vampire_first_choice',
    bonuses: { armour: 4, maxHpPct: 5 }
  },
  vampire_feast: {
    id: 'vampire_feast',
    tree: 'vampire',
    role: 'Sustain',
    name: 'Deep Drink',
    desc: 'Crimson Feast heals harder and single-target strikes bite deeper.',
    cost: 2,
    requires: ['vampire_stalker', 'vampire_grave_patience'],
    requirementMode: 'any',
    bonuses: { bloodlineLifestealPct: 14, singleTargetDamagePct: 6 }
  },
  vampire_night: {
    id: 'vampire_night',
    tree: 'vampire',
    role: 'Execution',
    name: 'Night Sovereign',
    desc: '+12% wounded enemy damage and +6% crit chance. Finish fights before the hunger does.',
    cost: 2,
    requires: ['vampire_feast'],
    bonuses: { woundedDamagePct: 12, critChancePct: 6 }
  },
  vampire_restraint: {
    id: 'vampire_restraint',
    tree: 'vampire',
    role: 'Restraint',
    choiceGroup: 'vampire_second_choice',
    name: 'The Held Hunger',
    desc: 'Restraint hardens the body and makes stolen life last longer.',
    cost: 2,
    requires: ['vampire_night'],
    bonuses: { armour: 5, bloodlineLifestealPct: 10 }
  },
  vampire_predation: {
    id: 'vampire_predation',
    tree: 'vampire',
    role: 'Predation',
    choiceGroup: 'vampire_second_choice',
    name: 'The Open Thirst',
    desc: 'Embrace speed and execution without surrendering your name.',
    cost: 2,
    requires: ['vampire_night'],
    bonuses: { moveSpeedPct: 5, woundedDamagePct: 10 }
  },
  vampire_old_oath: {
    id: 'vampire_old_oath',
    tree: 'vampire',
    role: 'Deathless',
    name: 'Old Blood Oath',
    desc: 'Either answer to hunger deepens your deathless endurance.',
    cost: 2,
    requires: ['vampire_restraint', 'vampire_predation'],
    requirementMode: 'any',
    bonuses: { maxHpPct: 8, lifestealPct: 4 }
  },
  vampire_night_without_end: {
    id: 'vampire_night_without_end',
    tree: 'vampire',
    role: 'Capstone',
    name: 'Night Without End',
    desc: 'Capstone: become a relentless duelist sustained by every decisive strike.',
    cost: 3,
    requires: ['vampire_old_oath'],
    bonuses: { critDamagePct: 12, bloodlineLifestealPct: 14, singleTargetDamagePct: 8 }
  },

  hydromancy_root: {
    id: 'hydromancy_root',
    tree: 'hydromancy',
    role: 'Living Water Core',
    name: 'The Current Answers',
    desc: '+4 maximum Spirit and +4% ability damage. Opens the pressure and shelter branches.',
    cost: 1,
    requires: [],
    bonuses: { maxSpirit: 4, abilityDamagePct: 4 }
  },
  hydromancy_torrent_initiate: {
    id: 'hydromancy_torrent_initiate',
    tree: 'hydromancy',
    role: 'Pressure DPS',
    name: 'Torrent Initiate',
    desc: 'Water abilities hit harder and Soaked enemies become more vulnerable.',
    cost: 1,
    requires: ['hydromancy_root'],
    choiceGroup: 'hydromancy_first_current',
    bonuses: { waterDamagePct: 7, waterVulnerabilityPct: 4 }
  },
  hydromancy_bubble_adept: {
    id: 'hydromancy_bubble_adept',
    tree: 'hydromancy',
    role: 'Pressure Support',
    name: 'Bubble Adept',
    desc: 'Strengthen defensive wards and support healing.',
    cost: 1,
    requires: ['hydromancy_root'],
    choiceGroup: 'hydromancy_first_current',
    bonuses: { armour: 3, supportHealingPct: 6, defenseBuffDurationPct: 8 }
  },
  hydromancy_flow_discipline: {
    id: 'hydromancy_flow_discipline',
    tree: 'hydromancy',
    role: 'Branch Merge',
    name: 'Flow Discipline',
    desc: 'Unlocks Bubble Ward. Either first current deepens Living Water and improves charge recovery.',
    cost: 2,
    requires: ['hydromancy_torrent_initiate', 'hydromancy_bubble_adept'],
    requirementMode: 'any',
    bonuses: { maxSpirit: 6, abilityRechargePct_hydromancerWaterTorrent: 10 },
    unlocksAbility: 'hydromancerBubbleWard'
  },
  hydromancy_pressure_channel: {
    id: 'hydromancy_pressure_channel',
    tree: 'hydromancy',
    role: 'Debuff DPS',
    name: 'Pressure Channel',
    desc: 'Unlock Drowning Pressure. Strengthen water damage and frost damage, with deeper Soaked vulnerability for water skills.',
    cost: 2,
    requires: ['hydromancy_flow_discipline'],
    bonuses: { waterDamagePct: 8, waterVulnerabilityPct: 6 },
    unlocksAbility: 'hydromancerDrowningPressure'
  },
  hydromancy_mending_tide: {
    id: 'hydromancy_mending_tide',
    tree: 'hydromancy',
    role: 'Restoration',
    name: 'Mending Tide',
    desc: 'Unlock Mending Current and improve support healing.',
    cost: 2,
    requires: ['hydromancy_flow_discipline'],
    bonuses: { healingPower: 5, supportHealingPct: 8 },
    unlocksAbility: 'hydromancerMendingCurrent'
  },
  hydromancy_tideglass_form: {
    id: 'hydromancy_tideglass_form',
    tree: 'hydromancy',
    role: 'Branch Merge',
    name: 'Tideglass Form',
    desc: 'Unlock Tidal Cut and refine the balance between blade and current.',
    cost: 2,
    requires: ['hydromancy_pressure_channel', 'hydromancy_mending_tide'],
    requirementMode: 'any',
    bonuses: { abilityDamagePct: 6, moveSpeedPct: 3 },
    unlocksAbility: 'hydromancerTidalCut'
  },
  hydromancy_riptide_duelist: {
    id: 'hydromancy_riptide_duelist',
    tree: 'hydromancy',
    role: 'Mobile Duelist',
    name: 'Riptide Duelist',
    desc: 'Unlock Riptide Step. Improve movement, focused damage, and its recharge speed by 16%; works with all movement morphs.',
    cost: 2,
    requires: ['hydromancy_tideglass_form'],
    bonuses: { moveSpeedPct: 5, singleTargetDamagePct: 7, abilityRechargePct_hydromancerRiptideStep: 16 },
    unlocksAbility: 'hydromancerRiptideStep'
  },
  hydromancy_wellspring_keeper: {
    id: 'hydromancy_wellspring_keeper',
    tree: 'hydromancy',
    role: 'Party Support',
    name: 'Wellspring Keeper',
    desc: 'Unlock Wellspring and deepen restorative currents.',
    cost: 2,
    requires: ['hydromancy_tideglass_form'],
    bonuses: { healingPower: 7, supportHealingPct: 10, abilityCharge_hydromancerWellspring: 1 },
    unlocksAbility: 'hydromancerWellspring'
  },
  hydromancy_rising_tide: {
    id: 'hydromancy_rising_tide',
    tree: 'hydromancy',
    role: 'Branch Merge',
    name: 'The Rising Tide',
    desc: 'Either final current strengthens Flow, pressure, and party protection.',
    cost: 3,
    requires: ['hydromancy_riptide_duelist', 'hydromancy_wellspring_keeper'],
    requirementMode: 'any',
    bonuses: { waterDamagePct: 10, supportHealingPct: 6, abilityRechargePct_hydromancerBubbleWard: 12 }
  },
  hydromancy_deluge_crown: {
    id: 'hydromancy_deluge_crown',
    tree: 'hydromancy',
    role: 'Capstone',
    name: 'Deluge Crown',
    desc: 'Capstone: unlock the Waverider signature deluge and a second Water Torrent use.',
    cost: 3,
    requires: ['hydromancy_rising_tide'],
    bonuses: { abilityDamagePct: 10, maxSpirit: 10, abilityCharge_hydromancerWaterTorrent: 1 },
    unlocksAbility: 'hydromancerDelugeCrown'
  },

  lightbringer_root: {
    id: 'lightbringer_root',
    tree: 'lightbringer',
    role: 'Dawn Core',
    name: 'Dawn Initiate',
    desc: '+4 maximum Spirit and +5% Lightbringer radiant ability damage. Opens the Halo and Prism branches.',
    cost: 1,
    requires: [],
    bonuses: { maxSpirit: 4, lightbringerDamagePct: 5 }
  },
  lightbringer_halo_scribe: {
    id: 'lightbringer_halo_scribe',
    tree: 'lightbringer',
    role: 'Halo Setup',
    name: 'Halo Scribe',
    desc: 'Halo Brand lasts longer and branded targets feed Lumens more reliably.',
    cost: 1,
    requires: ['lightbringer_root'],
    choiceGroup: 'lightbringer_first_dawn',
    bonuses: { haloBrandDurationPct: 20, lumenGenerationPct: 10 }
  },
  lightbringer_prism_discipline: {
    id: 'lightbringer_prism_discipline',
    tree: 'lightbringer',
    role: 'Prism Defense',
    name: 'Prism Discipline',
    desc: 'Unlock Prism Guard and strengthen Lightbringer shields.',
    cost: 1,
    requires: ['lightbringer_root'],
    choiceGroup: 'lightbringer_first_dawn',
    bonuses: { lightbringerShieldPct: 12, armour: 2 },
    unlocksAbility: 'lightbringerPrismGuard'
  },
  lightbringer_lumen_vessel: {
    id: 'lightbringer_lumen_vessel',
    tree: 'lightbringer',
    role: 'Lumen Economy',
    name: 'Lumen Vessel',
    desc: 'Unlocks Halo Brand. Either first practice improves Lumen generation and spender damage.',
    cost: 2,
    requires: ['lightbringer_halo_scribe', 'lightbringer_prism_discipline'],
    requirementMode: 'any',
    bonuses: { lumenGenerationPct: 12, lightbringerDamagePct: 5 },
    unlocksAbility: 'lightbringerHaloBrand'
  },
  lightbringer_dawncarver_focus: {
    id: 'lightbringer_dawncarver_focus',
    tree: 'lightbringer',
    role: 'Beam DPS',
    name: 'Dawncarver Focus',
    desc: 'Unlocks Dawncarver. The beam hits harder and steers more comfortably while channeling.',
    cost: 2,
    requires: ['lightbringer_lumen_vessel'],
    choiceGroup: 'lightbringer_second_dawn',
    bonuses: { dawncarverDamagePct: 12, dawncarverTurnRatePct: 16 },
    unlocksAbility: 'lightbringerDawncarver'
  },
  lightbringer_solar_judgment: {
    id: 'lightbringer_solar_judgment',
    tree: 'lightbringer',
    role: 'Radiant AoE',
    name: 'Solar Judgment',
    desc: 'Unlock Solar Verdict and increase radiant AoE pressure.',
    cost: 2,
    requires: ['lightbringer_lumen_vessel'],
    choiceGroup: 'lightbringer_second_dawn',
    bonuses: { lightbringerDamagePct: 7, solarVerdictRadiusPct: 12 },
    unlocksAbility: 'lightbringerSolarVerdict'
  },
  lightbringer_overbright: {
    id: 'lightbringer_overbright',
    tree: 'lightbringer',
    role: 'Overflow',
    name: 'Overbright',
    desc: 'Generating Lumens while full grants a short Overbright state that improves the next Dawncarver.',
    cost: 2,
    requires: ['lightbringer_dawncarver_focus', 'lightbringer_solar_judgment'],
    requirementMode: 'any',
    bonuses: { overbrightDuration: 6, dawncarverDamagePct: 6 }
  },
  lightbringer_piercing_dawn: {
    id: 'lightbringer_piercing_dawn',
    tree: 'lightbringer',
    role: 'Beam DPS',
    name: 'Piercing Dawn',
    desc: 'Ray of Rebuke unlocks and full-Lumen Dawncarver pressures branded targets harder.',
    cost: 2,
    requires: ['lightbringer_overbright'],
    choiceGroup: 'lightbringer_final_dawn',
    bonuses: { dawncarverDamagePct: 10, brandedTargetDamagePct: 8 },
    unlocksAbility: 'lightbringerRayOfRebuke'
  },
  lightbringer_halo_bastion: {
    id: 'lightbringer_halo_bastion',
    tree: 'lightbringer',
    role: 'Party Support',
    name: 'Halo Bastion',
    desc: 'Unlock Halo Aegis and improve nearby ally shielding.',
    cost: 2,
    requires: ['lightbringer_overbright'],
    choiceGroup: 'lightbringer_final_dawn',
    bonuses: { lightbringerShieldPct: 14, supportHealingPct: 4 },
    unlocksAbility: 'lightbringerHaloAegis'
  },
  lightbringer_first_sunrise: {
    id: 'lightbringer_first_sunrise',
    tree: 'lightbringer',
    role: 'Capstone',
    name: 'The First Sunrise',
    desc: 'Capstone: unlock the signature sunrise, instantly filling Lumens and briefly empowering radiant abilities.',
    cost: 3,
    requires: ['lightbringer_piercing_dawn', 'lightbringer_halo_bastion'],
    requirementMode: 'any',
    bonuses: { lightbringerDamagePct: 10, lumenGenerationPct: 12, abilityRechargePct_lightbringerDawncarver: 12 },
    unlocksAbility: 'lightbringerFirstSunrise'
  },

  eldritch_root: {
    id: 'eldritch_root',
    tree: 'eldritch',
    role: 'Secret Core',
    name: 'Starless Conduit',
    desc: '+4 power and +10 maximum Spirit. Opens forbidden mobility, rift, and horror branches.',
    cost: 1,
    requires: [],
    bonuses: { power: 4, maxSpirit: 10 }
  },
  eldritch_storm_stride: {
    id: 'eldritch_storm_stride',
    tree: 'eldritch',
    role: 'Void Mobility',
    name: 'Storm Between Steps',
    desc: 'Voidstep Burst reaches farther, hits harder, and leaves a sharper lightning scar.',
    cost: 1,
    requires: ['eldritch_root'],
    bonuses: { moveSpeedPct: 4, abilityDamagePct: 5, voidstepRangePct: 18 }
  },
  eldritch_black_star: {
    id: 'eldritch_black_star',
    tree: 'eldritch',
    role: 'Collapse AoE',
    name: 'Black Star Pulse',
    desc: 'Unlocks Black Star Pulse as a hotbar choice: an AoE collapse of red-black lightning.',
    cost: 2,
    requires: ['eldritch_storm_stride'],
    bonuses: { aoeDamagePct: 8, spiritDamagePct: 6 },
    unlocksAbility: 'blackStarPulse'
  },
  eldritch_red_maw: {
    id: 'eldritch_red_maw',
    tree: 'eldritch',
    role: 'Rift Control',
    name: 'Red Maw Rift',
    desc: 'Unlocks Red Maw Rift for X: an aimed rift that punishes clustered enemies.',
    cost: 2,
    requires: ['eldritch_root'],
    bonuses: { abilityDamagePct: 7, riftRadiusPct: 14 },
    unlocksAbility: 'redMawRift'
  },
  eldritch_horror_bond: {
    id: 'eldritch_horror_bond',
    tree: 'eldritch',
    role: 'Summon Core',
    name: 'Thing That Answers',
    desc: 'Unlocks Summon Eldritch Horror, grants +8% summon damage and +10% summon health, and opens horror evolution choices.',
    cost: 1,
    requires: ['eldritch_root'],
    bonuses: { summonDamagePct: 8, summonHealthPct: 10 },
    unlocksAbility: 'summonEldritchHorror'
  },
  eldritch_old_horror: {
    id: 'eldritch_old_horror',
    tree: 'eldritch',
    role: 'Evolved Summon',
    name: 'Old Horror',
    desc: 'Your eldritch summon evolves into larger, stronger forms as Spirit grows.',
    cost: 2,
    requires: ['eldritch_horror_bond'],
    choiceGroup: 'eldritch_summon_path',
    bonuses: { summonDamagePct: 16, summonHealthPct: 14 }
  },
  eldritch_lesser_things: {
    id: 'eldritch_lesser_things',
    tree: 'eldritch',
    role: 'Multiple Summons',
    name: 'Lesser Things',
    desc: 'Summon several smaller horrors instead of evolving one ancient horror.',
    cost: 2,
    requires: ['eldritch_horror_bond'],
    choiceGroup: 'eldritch_summon_path',
    bonuses: { summonDamagePct: 7, summonHealthPct: 7, summonCount: 2 }
  },
  eldritch_worldsplinter: {
    id: 'eldritch_worldsplinter',
    tree: 'eldritch',
    role: 'Forbidden Mastery',
    name: 'Worldsplinter',
    desc: '+12% ability damage, stronger rifts, and your beam becomes nastier against elites and bosses.',
    cost: 3,
    requires: ['eldritch_black_star', 'eldritch_red_maw'],
    requirementMode: 'any',
    bonuses: { abilityDamagePct: 12, bossDamagePct: 8, eliteDamagePct: 8, riftRadiusPct: 10 }
  },
  eldritch_recoil_liturgy: {
    id: 'eldritch_recoil_liturgy',
    tree: 'eldritch',
    role: 'Controlled Ruin',
    choiceGroup: 'eldritch_final_method',
    name: 'Recoil Liturgy',
    desc: 'Turn the violence of release into a steadier rhythm with an additional Voidstep Burst use.',
    cost: 2,
    requires: ['eldritch_worldsplinter'],
    bonuses: { maxSpirit: 12, abilityDamagePct: 7, abilityCharge_voidstepBurst: 1 }
  },
  eldritch_rupture_oath: {
    id: 'eldritch_rupture_oath',
    tree: 'eldritch',
    role: 'Volatile Ruin',
    choiceGroup: 'eldritch_final_method',
    name: 'Rupture Oath',
    desc: 'Accept harsher instability for stronger boss pressure and an additional Red Maw Rift use.',
    cost: 2,
    requires: ['eldritch_worldsplinter'],
    bonuses: { bossDamagePct: 10, woundedDamagePct: 10, abilityCharge_redMawRift: 1 }
  },
  eldritch_namebreaker: {
    id: 'eldritch_namebreaker',
    tree: 'eldritch',
    role: 'Capstone',
    name: 'Namebreaker',
    desc: 'Capstone: either final method teaches the conduit to rupture imposed order. Voidstep Burst recharges faster.',
    cost: 3,
    requires: ['eldritch_recoil_liturgy', 'eldritch_rupture_oath'],
    requirementMode: 'any',
    bonuses: {
      abilityDamagePct: 14,
      spiritDamagePct: 12,
      riftRadiusPct: 12,
      abilityRechargePct_voidstepBurst: 18,
      abilityRechargePct_redMawRift: 18
    }
  }
};

const WEAPON_TREE_CONFIG = {
  blunt: {
    title:'Blunt Mastery', weaponType:'mace', weaponTypes:['mace','hammer','maul'],
    root:'Crushing Grip', branchA:'Driving Momentum', branchB:'Iron Brace',
    secondA:'Breaking Blow', secondB:'Quaking Impact', capstone:'Weight of the Oath',
    bonuses:{root:{power:2},branchA:{staggerPowerPct:5,critChancePct:3},
      branchB:{armour:3,blockCostReductionPct:5},merge:{abilityDamagePct:5},
      secondA:{woundedDamagePct:8,critDamagePct:6},secondB:{aoeDamagePct:7,staggerPowerPct:7},
      secondMerge:{power:4},capstone:{staggerPowerPct:6,abilityDamagePct:8,power:4}}
  },
  sword: {
    title: 'Sword Mastery',
    root: 'Measured Edge',
    branchA: 'Duelist Rhythm',
    branchB: 'Guarded Cuts',
    secondA: 'Execution Line',
    secondB: 'Cleaving Form',
    capstone: 'Perfect Measure',
    bonuses: {
      root: { power: 2 },
      branchA: { attackSpeedPct: 5, critChancePct: 3 },
      branchB: { armour: 3, blockCostReductionPct: 5 },
      merge: { abilityDamagePct: 5 },
      secondA: { woundedDamagePct: 8, critDamagePct: 6 },
      secondB: { aoeDamagePct: 7, staggerPowerPct: 7 },
      secondMerge: { power: 4 },
      capstone: { attackSpeedPct: 6, abilityDamagePct: 8, power: 4 }
    }
  },
  bow: {
    title: 'Bow Mastery',
    root: 'String Discipline',
    branchA: 'Patient Aim',
    branchB: 'Moving Shot',
    secondA: 'Killing Mark',
    secondB: 'Broad Volley',
    capstone: 'Arrow Without Waste',
    bonuses: {
      root: { power: 2 },
      branchA: { critChancePct: 4 },
      branchB: { moveSpeedPct: 4, dodgeCostReductionPct: 4 },
      merge: { abilityDamagePct: 5 },
      secondA: { markedTargetDamagePct: 8, critDamagePct: 7 },
      secondB: { volleyDamagePct: 8, volleyWidthPct: 10 },
      secondMerge: { power: 4 },
      capstone: { critChancePct: 5, abilityDamagePct: 9, moveSpeedPct: 3 }
    }
  },
  staff: {
    title: 'Staff Mastery',
    root: 'Living Focus',
    branchA: 'Rooted Channel',
    branchB: 'Warding Reach',
    secondA: 'Thorn Current',
    secondB: 'Sheltering Pulse',
    capstone: 'Worldroot Focus',
    bonuses: {
      root: { maxSpirit: 6 },
      branchA: { natureDamagePct: 6, rootDurationPct: 5 },
      branchB: { armour: 3, healingPower: 3 },
      merge: { abilityDamagePct: 5 },
      secondA: { aoeDamagePct: 7, natureDamagePct: 6 },
      secondB: { supportHealingPct: 8, defenseBuffDurationPct: 7 },
      secondMerge: { maxSpirit: 8 },
      capstone: { natureDamagePct: 10, healingPower: 6, abilityDamagePct: 7 }
    }
  },
  scythe: {
    title: 'Scythe Mastery',
    root: 'Harvest Stance',
    branchA: 'Grave Arc',
    branchB: 'Hungry Edge',
    secondA: 'Wide Reaping',
    secondB: 'Vital Severance',
    capstone: 'Last Harvest',
    bonuses: {
      root: { power: 2 },
      branchA: { aoeDamagePct: 6, staggerPowerPct: 5 },
      branchB: { lifestealPct: 3, woundedDamagePct: 5 },
      merge: { necroticDamagePct: 6 },
      secondA: { aoeRadiusPct: 8, abilityDamagePct: 6 },
      secondB: { lifestealPct: 4, singleTargetDamagePct: 7 },
      secondMerge: { power: 4 },
      capstone: { necroticDamagePct: 10, lifestealPct: 4, abilityDamagePct: 8 }
    }
  },
  spiritFocus: {
    title: 'Spirit Focus Mastery',
    root: 'Focus Initiate',
    branchA: 'Steady Hand',
    branchB: 'Efficient Channel',
    secondA: 'Prism Shot',
    secondB: 'Impact Pulse',
    capstone: 'Perfect Focus',
    bonuses: {
      root: { focusBoltDamagePct: 5 },
      branchA: { focusBoltRangePct: 8, focusBoltSpeedPct: 8 },
      branchB: { focusBoltCostReductionPct: 10 },
      merge: { maxSpirit: 6, focusBoltDamagePct: 4 },
      secondA: { focusBoltPierceChancePct: 18, critChancePct: 2 },
      secondB: { focusStaggerPct: 12, armour: 2 },
      secondMerge: { maxSpirit: 8, focusBoltDamagePct: 6 },
      capstone: { focusBoltDamagePct: 10, focusBoltCostReductionPct: 8, focusBoltRangePct: 6, focusStaggerPct: 8 }
    }
  },
  eldritchWeapon: {
    weaponType: 'eldritch',
    title: 'Conduit Mastery',
    root: 'Red Conduction',
    branchA: 'Controlled Scar',
    branchB: 'Violent Pulse',
    secondA: 'Mark Discipline',
    secondB: 'Rupture Current',
    capstone: 'Black-Red Circuit',
    bonuses: {
      root: { maxSpirit: 6 },
      branchA: { abilityDamagePct: 5, maxSpirit: 5 },
      branchB: { bossDamagePct: 5, woundedDamagePct: 5 },
      merge: { spiritDamagePct: 6 },
      secondA: { riftRadiusPct: 7, abilityDamagePct: 6 },
      secondB: { bossDamagePct: 7, eliteDamagePct: 7 },
      secondMerge: { maxSpirit: 8 },
      capstone: { spiritDamagePct: 12, abilityDamagePct: 9, bossDamagePct: 6 }
    }
  }
};

Object.assign(SKILL_TREE_NODES, createWeaponTreeNodes());
// New techniques form two parallel branches after each existing core. Existing
// doctrine choices and capstones are retained unchanged.
for (const tree of ['blade','archery','spirit','warding','hydromancy','lightbringer','eldritch']) {
  const additions=COMBAT_EXPANSION_ABILITIES.filter(a=>a.tree===tree);
  additions.forEach((a,i)=>{
    const id=`technique_${a.id}`;
    SKILL_TREE_NODES[id]={id,tree,name:a.name,role:a.role.toUpperCase(),desc:a.desc,
      cost:i<2?2:3,requires:[i<2?`${tree}_root`:`technique_${additions[i-2].id}`],
      bonuses:{},unlocksAbility:a.id};
  });
}


// Either early melee doctrine may unlock the swords; no subclass commitment.
Object.assign(SKILL_TREE_NODES.technique_oathkeeperHallowedBlades,{cost:2,requires:['blade_combo','blade_bastion'],requirementMode:'any'});
Object.assign(SKILL_TREE_NODES, createDisciplinePassives(describeSkillTreeBonuses));
Object.assign(SKILL_TREE_NODES, createExpertiseNodes(SKILL_TREE_NODES));

// Preserve the first-match behavior of the legacy migration without scanning
// every tree node for every known ability on every UI/progression query.
const abilityUnlockNodes = new Map();
for (const node of Object.values(SKILL_TREE_NODES)) {
  const id = normalizeAbilityId(node.unlocksAbility);
  if (id && !abilityUnlockNodes.has(id)) abilityUnlockNodes.set(id, node);
}

export const CORE_SKILL_TREE_ORDER = ['blade', 'archery', 'spirit', 'warding', 'hydromancy', 'lightbringer', 'eldritch'];
export const BLOODLINE_SKILL_TREE_ORDER = ['cambion', 'nephilim', 'vampire'];
export const WEAPON_SKILL_TREE_ORDER = ['sword', 'blunt', 'bow', 'staff', 'scythe', 'spiritFocus', 'eldritchWeapon'];
export const SKILL_TREE_ORDER = [...CORE_SKILL_TREE_ORDER, ...BLOODLINE_SKILL_TREE_ORDER, ...WEAPON_SKILL_TREE_ORDER];
const warnedSkillTreeCycles = new Set();

export const CLASS_SKILL_TREE_LOCKS = {
  oathkeeper: 'blade',
  templar: 'blade',
  fellhunter: 'archery',
  mercenary: 'archery',
  gravecaller: 'spirit',
  necromancer: 'spirit',
  thornbinder: 'warding',
  waverider: 'hydromancy',
  hydromancer: 'hydromancy',
  lightbringer: 'lightbringer',
  eldritch: 'eldritch'
};

function normalizeClassId(classId) {
  if (!classId) return classId;
  const key = String(classId).trim();
  if (key === 'templar') return 'oathkeeper';
  if (key === 'necromancer') return 'gravecaller';
  if (key === 'hydromancer') return 'waverider';
  if (key === 'mercenary') return 'fellhunter';
  return key;
}

function isClasslessPlayer(player) {
  return normalizeClassId(player?.classId) === 'classless';
}

export function normalizeSkillTreeState(player) {
  if (!player) return null;

  const state = player.skillTree && typeof player.skillTree === 'object'
    ? player.skillTree
    : {};

  state.version = SKILL_TREE_VERSION;
  const legacySpent = player.skillTreeProgress && typeof player.skillTreeProgress === 'object'
    ? player.skillTreeProgress
    : {};
  const currentSpent = state.spent && typeof state.spent === 'object'
    ? state.spent
    : {};
  state.spent = {
    ...legacySpent,
    ...currentSpent
  };

  // Collapse the two former stat-only gates. Their missing costs naturally
  // return to the available pool. A purchased Living Bastion keeps its heal
  // unlock by moving the old Guardian Oath investment into the recovery node.
  if(!state.oathIdentityVersion&&['oathkeeper','templar'].includes(player.classId)){
    if(state.spent.blade_living_bastion)state.spent.blade_last_rite=1;
    state.oathIdentityVersion=1;
  }
  if(player.unlockedPassives?.some(id=>removedOathNodes.has(id)))player.unlockedPassives=player.unlockedPassives.filter(id=>!removedOathNodes.has(id));

  if (state.lockedClassId === 'necromancer') {
    state.lockedClassId = 'gravecaller';
  }

  if (state.lockedClassId === 'templar') {
    state.lockedClassId = 'oathkeeper';
  }

  if (state.lockedClassId === 'hydromancer') {
    state.lockedClassId = 'waverider';
  }

  if (state.lockedClassId === 'mercenary') {
    state.lockedClassId = 'fellhunter';
  }

  if (state.lockedTree && !CORE_SKILL_TREE_ORDER.includes(state.lockedTree)) {
    delete state.lockedTree;
    delete state.lockedClassId;
  }

  if (isClasslessPlayer(player)) {
    delete state.lockedTree;
    delete state.lockedClassId;
  }

  if (!state.lockedTree && player.classId && CLASS_SKILL_TREE_LOCKS[player.classId]) {
    state.lockedClassId = player.classId;
    state.lockedTree = CLASS_SKILL_TREE_LOCKS[player.classId];
  }

  for (const nodeId of Object.keys(state.spent)) {
    if (!SKILL_TREE_NODES[nodeId]) delete state.spent[nodeId];
  }
  const obsoleteExpertise=id=>typeof id==='string'&&id.includes('_expertise_')&&!SKILL_TREE_NODES[id];
  if(Array.isArray(player.unlockedPassives)&&player.unlockedPassives.some(obsoleteExpertise))player.unlockedPassives=player.unlockedPassives.filter(id=>!obsoleteExpertise(id));

  if(!state.bluntMasteryVersion) {
    if(player.skillState?.bluntMigratedFromBlade&&['oathkeeper','templar'].includes(player.classId)) {
      const refs=[player.equipment?.weapon,...(player.inventory||[])];
      const hasSword=refs.some(ref=>ITEMS[typeof ref==='string'?ref:ref?.id||ref?.itemId]?.weaponType==='sword');
      // Copying the old shared proficiency must not award its historical point
      // credit a second time when a character owns both weapon families.
      if(hasSword)state.bluntMigrationPointOffset=Math.max(0,Math.floor(((player.skillState.skills.blunt?.level||1)-1)/2));
      // Old mace-only characters bought Sword Mastery because their mace was
      // incorrectly a sword. Move equivalent ranks; retain genuine sword builds.
      if(!hasSword) {
        for(const id of Object.keys(state.spent))if(id.startsWith('sword_')) {
          const next=id.replace('sword_','blunt_');
          if(SKILL_TREE_NODES[next]){state.spent[next]=Math.max(state.spent[next]||0,state.spent[id]);delete state.spent[id];}
        }
        player.unlockedPassives=(player.unlockedPassives||[]).map(id=>id.startsWith('sword_')&&SKILL_TREE_NODES[id.replace('sword_','blunt_')]?id.replace('sword_','blunt_'):id);
        state.unlockedWeaponTrees=(state.unlockedWeaponTrees||[]).filter(tree=>tree!=='sword');
      }
    }
    state.bluntMasteryVersion=1;
  }
  normalizeExpertisePurchases(state.spent);
  player.skillTree = state;
  player.skillTreeProgress = state.spent;
  normalizeAbilityManagementState(player);
  migrateKnownAbilityUnlockNodes(player, state);

  for (const nodeId of Object.keys(state.spent)) {
    applyNodeUnlock(player, SKILL_TREE_NODES[nodeId]);
  }

  return state;
}

function migrateKnownAbilityUnlockNodes(player, state) {
  if (!player || !state) return;
  if (state.respecVersion) return;

  state.migratedAbilityUnlocks = state.migratedAbilityUnlocks && typeof state.migratedAbilityUnlocks === 'object'
    ? state.migratedAbilityUnlocks
    : {};

  const known = Array.isArray(player.knownAbilities)
    ? player.knownAbilities
    : Array.isArray(player.unlockedAbilities)
      ? player.unlockedAbilities
      : [];
  const lockedTree = state.lockedTree || (player.classId ? CLASS_SKILL_TREE_LOCKS[normalizeClassId(player.classId)] : null);
  const bloodlineId = player?.bloodline?.id || player?.raceId || null;

  for (const rawAbilityId of known) {
    const abilityId = normalizeAbilityId(rawAbilityId);
    const ability = getAbilityById(abilityId);
    if (!ability) continue;

    if (ability.classId && normalizeClassId(ability.classId) !== normalizeClassId(player.classId)) {
      continue;
    }

    if (ability.bloodline && ability.bloodline !== bloodlineId) {
      continue;
    }

    const node = abilityUnlockNodes.get(abilityId);

    if (!node || state.spent[node.id]) continue;
    if (CORE_SKILL_TREE_ORDER.includes(node.tree) && lockedTree && node.tree !== lockedTree) continue;
    if (BLOODLINE_SKILL_TREE_ORDER.includes(node.tree) && node.tree !== bloodlineId) continue;

    state.spent[node.id] = 1;
    state.migratedAbilityUnlocks[node.id] = abilityId;
  }
}

export function getLockedSkillTreeForPlayer(player) {
  const state = normalizeSkillTreeState(player);
  return state?.lockedTree || null;
}

export function isSkillTreeAllowedForPlayer(player, tree) {
  if (isClasslessPlayer(player) && CORE_SKILL_TREE_ORDER.includes(tree)) {
    return false;
  }

  if (BLOODLINE_SKILL_TREE_ORDER.includes(tree)) {
    const bloodlineId = player?.bloodline?.id || player?.raceId || null;
    return bloodlineId === tree;
  }

  if (WEAPON_SKILL_TREE_ORDER.includes(tree)) {
    return getAvailableWeaponSkillTrees(player).includes(tree);
  }

  const lockedTree = getLockedSkillTreeForPlayer(player);
  return !lockedTree || tree === lockedTree;
}

export function getAvailableWeaponSkillTrees(player) {
  if (!player) return [];
  player.skillTree = player.skillTree && typeof player.skillTree === 'object' ? player.skillTree : {};
  player.skillTree.unlockedWeaponTrees = Array.isArray(player.skillTree.unlockedWeaponTrees)
    ? player.skillTree.unlockedWeaponTrees.filter(tree => WEAPON_SKILL_TREE_ORDER.includes(tree))
    : [];

  const itemRefs = [
    player?.equipment?.weapon,
    ...(Array.isArray(player?.inventory) ? player.inventory.map(entry => entry?.id || entry?.itemId) : [])
  ];
  const weaponTypes = new Set(itemRefs.map(ref => {
    const id = typeof ref === 'string' ? ref : ref?.id || ref?.itemId;
    return id ? ITEMS[id]?.weaponType || null : null;
  }).filter(Boolean));

  for (const tree of WEAPON_SKILL_TREE_ORDER) {
    const expected = WEAPON_TREE_CONFIG[tree]?.weaponType || tree;
    if ((WEAPON_TREE_CONFIG[tree]?.weaponTypes || [expected]).some(type=>weaponTypes.has(type)) && !player.skillTree.unlockedWeaponTrees.includes(tree)) {
      player.skillTree.unlockedWeaponTrees.push(tree);
    }
  }

  return [...player.skillTree.unlockedWeaponTrees];
}

export function getEarnedSkillTreePoints(player) {
  const skills = player?.skillState?.skills || {};
  let total = 0;

  for (const tree of SKILL_TREE_ORDER) {
    if (!isSkillTreeAllowedForPlayer(player, tree)) continue;
    const level = Math.max(1, Math.floor(skills[getProgressionSkillForTree(tree)]?.level || 1));
    total += Math.max(0, Math.floor((level - 1) / 2));
  }

  // Derive the entitlement from the saved level so older characters recover
  // missed points, multi-level awards count fully, and loading cannot grant twice.
  const combatLevel = player?.skillState?.combat
    ? getCombatLevel(player.skillState)
    : Math.max(1, Math.floor(Number(player?.combatLevel) || 1));
  total += combatLevel - 1;
  total += Math.max(0, Math.floor(player?.skillTree?.bloodlineBonusPoints || 0));

  return Math.max(0,total-Math.max(0,Number(player?.skillTree?.bluntMigrationPointOffset)||0));
}

export function getSpentSkillTreePoints(player) {
  const state = normalizeSkillTreeState(player);
  if (!state) return 0;

  return Object.entries(state.spent).reduce((sum, [nodeId, rank]) => {
    const node = SKILL_TREE_NODES[nodeId];
    if (!node || !isSkillTreeAllowedForPlayer(player, node.tree)) return sum;
    return sum + (node ? Math.max(0, Math.floor(rank || 0)) * node.cost : 0);
  }, 0);
}

export function getAvailableSkillTreePoints(player) {
  return Math.max(0, getEarnedSkillTreePoints(player) - getSpentSkillTreePoints(player));
}

export function isSkillTreeNodeUnlocked(player, nodeId) {
  const state = normalizeSkillTreeState(player);
  return !!state?.spent?.[nodeId];
}

export function canSpendSkillTreeNode(player, nodeId) {
  const node = SKILL_TREE_NODES[nodeId];
  if (!node) return { ok: false, reason: 'Unknown node.' };

  if (hasSkillTreeDependencyCycle(nodeId)) {
    return { ok: false, reason: 'Invalid tree dependency.' };
  }

  normalizeSkillTreeState(player);

  if (!isSkillTreeAllowedForPlayer(player, node.tree)) {
    if (BLOODLINE_SKILL_TREE_ORDER.includes(node.tree)) {
      const bloodlineId = player?.bloodline?.id || player?.raceId || null;
      return {
        ok: false,
        reason: bloodlineId ? `${treeDisplayName(bloodlineId)} bloodline locked.` : 'Requires bloodline quest.'
      };
    }

    const lockedTree = getLockedSkillTreeForPlayer(player);
    return { ok: false, reason: `${treeDisplayName(lockedTree)} path locked.` };
  }

  if (isSkillTreeNodeUnlocked(player, nodeId)) {
    return { ok: false, reason: 'Already learned.' };
  }

  if (node.choiceGroup) {
    const conflict = Object.values(SKILL_TREE_NODES).find(other => {
      return other.id !== node.id &&
        other.choiceGroup === node.choiceGroup &&
        isSkillTreeNodeUnlocked(player, other.id);
    });

    if (conflict) {
      return { ok: false, reason: `Choice locked by ${conflict.name}.` };
    }
  }

  const requirements = (node.requires || [])
    .filter(req => req !== node.id && SKILL_TREE_NODES[req]);
  const metRequirements = requirements.filter(req => isSkillTreeNodeUnlocked(player, req));

  if (requirements.length && node.requirementMode === 'any' && !metRequirements.length) {
    return { ok: false, reason: 'Requires either previous branch.' };
  }

  if (requirements.length && node.requirementMode !== 'any' && metRequirements.length !== requirements.length) {
    return { ok: false, reason: 'Requires previous node.' };
  }

  if (getAvailableSkillTreePoints(player) < node.cost) {
    return { ok: false, reason: `Needs ${node.cost} point${node.cost === 1 ? '' : 's'}.` };
  }

  return { ok: true, reason: 'Available' };
}

export function spendSkillTreeNode(player, nodeId) {
  const check = canSpendSkillTreeNode(player, nodeId);
  if (!check.ok) return check;

  const state = normalizeSkillTreeState(player);
  state.spent[nodeId] = 1;

  applyNodeUnlock(player, SKILL_TREE_NODES[nodeId]);

  return {
    ok: true,
    reason: 'Learned',
    node: SKILL_TREE_NODES[nodeId]
  };
}

export function respecSkillTree(player) {
  const state=normalizeSkillTreeState(player),refunded=getSpentSkillTreePoints(player);
  if(!refunded)return {ok:false,reason:'No spent skill points to refund.'};
  if(!(Number(player.gold)>=1))return {ok:false,reason:'Respec costs 1 gold.'};
  if(!(player.hp>0)||player.activeChannel||player.abilityCharge?.active)return {ok:false,reason:'Finish your current action before resetting skills.'};
  const classDef=getClassDefinition(player.classId),starters=new Set([classDef?.qAbility,...(isGravecallerClassId(player.classId)?[classDef?.rAbility]:[])]);
  const independent=new Set(player.independentAbilityUnlocks||[]);
  const revoked=new Set(Object.keys(state.spent).map(id=>SKILL_TREE_NODES[id]?.unlocksAbility).filter(id=>id&&!starters.has(id)&&!independent.has(id)).map(normalizeAbilityId));
  player.knownAbilities=(player.knownAbilities||[]).filter(id=>!revoked.has(id));
  player.unlockedAbilities=[...player.knownAbilities];
  player.unlockedPassives=(player.unlockedPassives||[]).filter(id=>!SKILL_TREE_NODES[id]);
  player.loadout.abilitySlots=player.loadout.abilitySlots.map(id=>revoked.has(id)?null:id);
  // Clear both aliases atomically. Otherwise legacy unlock migration re-buys
  // refunded active nodes at the next render or load.
  state.spent={};state.migratedAbilityUnlocks={};state.respecVersion=1;
  player.skillTreeProgress=state.spent;player.gold-=1;
  player.abilityUseCharges={};player.traps=[];player.combatEffects=[];
  player.buffs={};player.gravecallerPath='unbound';if(player.gravecaller)player.gravecaller.path='unbound';
  player.summons=(player.summons||[]).filter(s=>!revoked.has(s.sourceAbilityId||s.summonAbilityId));
  bonusCache.delete(player);
  return {ok:true,refunded,reason:`Refunded ${refunded} skill points for 1 gold. Mastery and skill morph choices are kept.`};
}

export function getSkillTreeNodesByTree(tree) {
  return Object.values(SKILL_TREE_NODES).filter(node => node.tree === tree);
}

export function getSkillTreeLayout(tree) {
  const nodes = getSkillTreeNodesByTree(tree);
  const nodeIds = new Set(nodes.map(node => node.id));
  const depths = new Map();
  const visiting = new Set();

  const getDepth = node => {
    if (depths.has(node.id)) return depths.get(node.id);
    if (visiting.has(node.id)) {
      if (!warnedSkillTreeCycles.has(node.id)) {
        warnedSkillTreeCycles.add(node.id);
        console.warn(`Skill tree dependency cycle detected at node ${node.id}.`);
      }
      depths.set(node.id, 0);
      return 0;
    }

    visiting.add(node.id);
    const requirements = (node.requires || [])
      .filter(id => nodeIds.has(id))
      .map(id => SKILL_TREE_NODES[id])
      .filter(Boolean);
    const depth = requirements.length ? 1 + Math.max(...requirements.map(getDepth)) : 0;
    visiting.delete(node.id);
    depths.set(node.id, depth);
    return depth;
  };

  nodes.forEach(getDepth);
  // The final calling sits below every old branch, including optional ones.
  const finalRow=1+Math.max(0,...nodes.filter(n=>!n.expertise).map(n=>depths.get(n.id)||0));
  for(const node of nodes.filter(n=>n.expertise))depths.set(node.id,finalRow);
  const rows = new Map();

  for (const node of nodes) {
    const row = depths.get(node.id) || 0;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(node);
  }

  const layoutNodes = [];
  // Keep declaration order as the stable tie-breaker, then align children
  // with their actual parents. Alphabetical sorting scattered each branch.
  const order = new Map(nodes.map((node,index)=>[node.id,index]));
  const columns = new Map();
  const mainColumns = Math.max(1,...[...rows.values()].map(row=>row.filter(n=>!n.foundationTier).length));
  const columnCount = mainColumns + (nodes.some(n=>n.foundationTier) ? 1 : 0);
  const rowCount = rows.size;
  const width = 40 + columnCount * 156;
  const height = rowCount * 80;

  for (const [row, rowNodes] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const parentColumn = node => {
      const parents=(node.requires||[]).map(id=>columns.get(id)).filter(Number.isFinite);
      return parents.length ? parents.reduce((a,b)=>a+b,0)/parents.length : mainColumns/2;
    };
    const main=rowNodes.filter(n=>!n.foundationTier);
    main.sort((a,b)=>parentColumn(a)-parentColumn(b)||order.get(a.id)-order.get(b.id));
    main.forEach((node,index)=>columns.set(node.id,(index+.5)*mainColumns/main.length));
    rowNodes.filter(n=>n.foundationTier).forEach(node=>columns.set(node.id,mainColumns+.5));
    [...main,...rowNodes.filter(n=>n.foundationTier)].forEach(node => {
      const mutuallyExclusiveWith = node.choiceGroup
        ? nodes.filter(other => other.id !== node.id && other.choiceGroup === node.choiceGroup).map(other => other.id)
        : [];

      layoutNodes.push({
        ...node,
        type: node.expertise ? 'expertise' : node.unlocksAbility ? 'activeAbility' : node.role === 'Capstone' ? 'capstone' : 'passive',
        branchGroupId: node.choiceGroup || null,
        mutuallyExclusiveWith,
        position: {
          row,
          column: columns.get(node.id),
          x: 40 + columns.get(node.id) * 156,
          y: row * 80 + 40
        }
      });
    });
  }

  return {
    tree,
    width, height, rowCount, columnCount,
    nodes: layoutNodes,
    connections: layoutNodes.flatMap(node => (node.requires || [])
      .filter(from => nodeIds.has(from))
      .map(from => ({
        from,
        to: node.id,
        merge: node.requirementMode === 'any'
      })))
  };
}

const bonusCache = new WeakMap();
function bonusCacheKey(player) {
  const weapon=player.equipment?.weapon;
  return JSON.stringify([player.classId,player.bloodline?.id,player.raceId,
    player.skillTree?.lockedTree,player.skillTree?.spent || player.skillTreeProgress || {},
    player.knownAbilities,player.unlockedAbilities,weapon,player.loadout?.primarySkill,
    player.skillTree?.unlockedWeaponTrees,player.inventory?.map(item=>item?.id||item?.itemId)]);
}
export function getSkillTreeBonuses(player) {
  const key=bonusCacheKey(player),cached=bonusCache.get(player);
  if(cached?.key===key)return {...cached.bonuses};
  const state = normalizeSkillTreeState(player);
  const bonuses = {};

  for (const [nodeId, rank] of Object.entries(state?.spent || {})) {
    const node = SKILL_TREE_NODES[nodeId];
    if (!node) continue;
    if (!isSkillTreeAllowedForPlayer(player, node.tree)) continue;

    const safeRank = Math.max(0, Math.floor(rank || 0));

    for (const [key, value] of Object.entries(getSubclassPassiveBonuses(player,node))) {
      bonuses[key] = (bonuses[key] || 0) + Number(value || 0) * safeRank;
    }
  }

  bonusCache.set(player,{key:bonusCacheKey(player),bonuses});
  return bonuses;
}

export function getSkillTreeRoleSummary(player) {
  const state = normalizeSkillTreeState(player);
  const roles = {};

  for (const nodeId of Object.keys(state?.spent || {})) {
    const node = SKILL_TREE_NODES[nodeId];
    if (!node?.role) continue;
    if (!isSkillTreeAllowedForPlayer(player, node.tree)) continue;
    roles[node.role] = (roles[node.role] || 0) + 1;
  }

  return Object.entries(roles)
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({ role, count }));
}

function treeDisplayName(tree) {
  const names = {
    blade: 'Oathkeeper',
    archery: 'Fellhunter',
    spirit: 'Gravecaller',
    warding: 'Thornbinder',
    hydromancy: 'Waverider',
    lightbringer: 'Lightbringer',
    eldritch: 'Eldritch',
    cambion: 'Cambion',
    nephilim: 'Nephilim',
    vampire: 'Vampire',
    blunt: 'Blunt Mastery',
    sword: 'Sword Mastery',
    bow: 'Bow Mastery',
    staff: 'Staff Mastery',
    scythe: 'Scythe Mastery',
    spiritFocus: 'Spirit Focus Mastery',
    eldritchWeapon: 'Conduit Mastery'
  };

  return names[tree] || 'Class';
}

function getProgressionSkillForTree(tree) {
  const map = {
    sword: 'blade',
    blade: 'blunt',
    blunt: 'blunt',
    bow: 'archery',
    staff: 'warding',
    hydromancy: 'warding',
    lightbringer: 'spirit',
    scythe: 'spirit',
    spiritFocus: 'spirit',
    eldritchWeapon: 'spirit'
  };
  return map[tree] || tree;
}

function hasSkillTreeDependencyCycle(nodeId, visiting = new Set(), visited = new Set()) {
  if (visited.has(nodeId)) return false;
  if (visiting.has(nodeId)) {
    if (!warnedSkillTreeCycles.has(nodeId)) {
      warnedSkillTreeCycles.add(nodeId);
      console.warn(`Skill tree dependency cycle detected at node ${nodeId}.`);
    }
    return true;
  }

  const node = SKILL_TREE_NODES[nodeId];
  if (!node) return false;

  visiting.add(nodeId);
  for (const req of node.requires || []) {
    if (req === nodeId) return true;
    const reqNode = SKILL_TREE_NODES[req];
    if (!reqNode || reqNode.tree !== node.tree) continue;
    if (hasSkillTreeDependencyCycle(req, visiting, visited)) return true;
  }
  visiting.delete(nodeId);
  visited.add(nodeId);
  return false;
}

function createWeaponTreeNodes() {
  const nodes = {};

  for (const [tree, config] of Object.entries(WEAPON_TREE_CONFIG)) {
    const id = suffix => `${tree}_${suffix}`;
    const choiceOne = `${tree}_first_choice`;
    const choiceTwo = `${tree}_second_choice`;
    const entries = [
      ['root', config.root, 'Weapon Core', 1, [], null, config.bonuses.root],
      ['branch_a', config.branchA, 'Technique', 1, [id('root')], choiceOne, config.bonuses.branchA],
      ['branch_b', config.branchB, 'Technique', 1, [id('root')], choiceOne, config.bonuses.branchB],
      ['merge', `${config.title} Discipline`, 'Weapon Discipline', 2, [id('branch_a'), id('branch_b')], null, config.bonuses.merge, 'any'],
      ['second_a', config.secondA, 'Specialization', 2, [id('merge')], choiceTwo, config.bonuses.secondA],
      ['second_b', config.secondB, 'Specialization', 2, [id('merge')], choiceTwo, config.bonuses.secondB],
      ['second_merge', `${config.title} Mastery`, 'Weapon Mastery', 2, [id('second_a'), id('second_b')], null, config.bonuses.secondMerge, 'any'],
      ['capstone', config.capstone, 'Capstone', 3, [id('second_merge')], null, config.bonuses.capstone]
    ];

    for (const [suffix, name, role, cost, requires, choiceGroup, bonuses, requirementMode] of entries) {
      nodes[id(suffix)] = {
        id: id(suffix),
        tree,
        role,
        name,
        desc: role === 'Capstone'
          ? `Capstone for ${config.title}. Defines the final shape of this weapon style.`
          : `${name} develops the ${config.title.toLowerCase()} path.`,
        cost,
        requires,
        choiceGroup,
        requirementMode,
        weaponRequirement: config.weaponType || tree,
        bonuses
      };
    }
  }

  return nodes;
}

export function describeSkillTreeBonuses(bonuses) {
  const labels = {
    power: 'Power',
    subclassFocusPct: 'Morphed ability damage',
    subclassControlPct: 'Morphed control strength',
    subclassWardPct: 'Morphed barrier strength',
    subclassRangePct: 'Morphed ability range',
    subclassDurationPct: 'Morphed effect duration',
    subclassDotPct: 'Morphed damage over time',
    armour: 'Armour',
    maxHpPct: 'Max Health',
    maxStamina: 'Stamina',
    maxSpirit: 'Spirit',
    attackSpeedPct: 'Attack Speed',
    critChancePct: 'Crit Chance',
    critDamagePct: 'Crit Damage',
    woundedDamagePct: 'Wounded Damage',
    moveSpeedPct: 'Move Speed',
    lifestealPct: 'Lifesteal',
    gravecallerLifestealPct: 'Eligible Gravecaller lifesteal',
    summonDamagePct: 'Summon Damage',
    summonHealthPct: 'Summon Health',
    blockCostReductionPct: 'Block Cost Reduction',
    blockMoveSpeedPct: 'Block Move Speed',
    thornsPct: 'Thorns',
    healingPower: 'Healing Power',
    summonCount: 'Extra Summons',
    abilityDamagePct: 'Ability Damage',
    singleTargetDamagePct: 'Single Target Damage',
    aoeDamagePct: 'Area Damage',
    aoeRadiusPct: 'Area Radius',
    supportHealingPct: 'Support Healing',
    holyDamagePct: 'Holy Damage',
    fireDamagePct: 'Hellfire Damage',
    necroticDamagePct: 'Necrotic Damage',
    natureDamagePct: 'Nature Damage',
    bloodlineRadiusPct: 'Bloodline Radius',
    bloodlineShieldPct: 'Bloodline Shield',
    bloodlineLifestealPct: 'Bloodline Lifesteal',
    bossDamagePct: 'Boss Damage',
    eliteDamagePct: 'Elite Damage',
    volleyDamagePct: 'Volley Damage',
    volleyExtraHits: 'Volley Extra Hits',
    volleyWidthPct: 'Volley Width',
    quickShotCritPct: 'Quick Shot Crit',
    quickShotStaminaRefund: 'Quick Shot Stamina Refund',
    markedArrowDamagePct: 'Marked Arrow Damage',
    markedTargetDamagePct: 'Marked Target Damage',
    exposedDamagePct: 'Exposed Damage',
    exposedDurationPct: 'Exposed Duration',
    trapDamagePct: 'Trap Damage',
    trapArmSpeedPct: 'Trap Setup Speed',
    gadgetCooldownPct: 'Gadget Readiness',
    bombRadiusPct: 'Bomb Radius',
    grapplingHookRangePct: 'Grappling Hook Range',
    smokeDurationPct: 'Smoke Duration',
    markedShotDamagePct: 'Marked Shot Damage',
    killZoneRadiusPct: 'Kill Zone Radius',
    dashShotDamagePct: 'Dodge Shot Damage',
    smiteWidthPct: 'Smite Width',
    judgmentSmiteRadiusPct: 'Judgment Smite Radius',
    consecratedGroundDurationPct: 'Consecrated Ground Duration',
    convictionPowerPct: 'Conviction Power',
    lastRiteCostReductionPct: 'Last Rite Cost Reduction',
    cleavingStepRangePct: 'Cleaving Step Range',
    voidstepRangePct: 'Voidstep Range',
    riftRadiusPct: 'Rift Radius',
    spiritDamagePct: 'Spirit Damage',
    waterDamagePct: 'Water Damage',
    waterVulnerabilityPct: 'Soak Vulnerability',
    lightbringerDamagePct: 'Lightbringer Damage',
    lumenGenerationPct: 'Lumen Generation',
    haloBrandDurationPct: 'Halo Brand Duration',
    dawncarverDamagePct: 'Dawncarver Damage',
    dawncarverTurnRatePct: 'Dawncarver Steering',
    solarVerdictRadiusPct: 'Solar Verdict Radius',
    lightbringerShieldPct: 'Lightbringer Shield',
    brandedTargetDamagePct: 'Branded Target Damage',
    overbrightDuration: 'Overbright Duration',
    focusBoltDamagePct: 'Focus Bolt Damage',
    focusBoltCostReductionPct: 'Focus Bolt Cost Reduction',
    focusBoltRangePct: 'Focus Bolt Range',
    focusBoltSpeedPct: 'Focus Bolt Speed',
    focusBoltPierceChancePct: 'Focus Bolt Pierce Chance',
    focusStaggerPct: 'Focus Impact',
    defenseBuffDurationPct: 'Defense Buff Duration',
    blockReflectPct: 'Block Reflect',
    rootDurationPct: 'Root Duration',
    slowDurationPct: 'Slow Duration',
    thornLashRangePct: 'Thorn Lash Range',
    thornLashDamagePct: 'Thorn Lash Damage',
    bramblePatchDurationPct: 'Bramble Patch Duration',
    rosebiteRadiusPct: 'Rosebite Radius',
    briarBloomHealingPct: 'Briar Bloom Healing',
    briarBloomRadiusPct: 'Briar Bloom Radius',
    verdantWoundDamage: 'Verdant Wound Damage',
    verdantWoundCap: 'Verdant Wound Cap',
    ripostePowerPct: 'Riposte Power',
    staggerPowerPct: 'Stagger Power',
    dodgeCostReductionPct: 'Dodge Cost Reduction'
  };

  return Object.entries(bonuses || {})
    .filter(([, value]) => Number(value || 0) !== 0)
    .map(([key, value]) => {
      const choices={gravecallerCommander:'Commander: raise three of your chosen henchman form; keep Coterie gear bonuses',gravecallerLichbound:'Lichbound: learn Summon Lich; keep Raise the Bound Dead',eldritchBrood:'Call an Eldritch brood',eldritchColossus:'Call one stronger Eldritch horror'};
      if(choices[key])return choices[key];
      if (key.startsWith('abilityCharge_')) {
        const abilityId = key.slice('abilityCharge_'.length);
        const abilityName = getAbilityById(abilityId)?.name || abilityId;
        return `${abilityName} Uses: +${value}`;
      }

      if (key.startsWith('abilityRechargePct_')) {
        const abilityId = key.slice('abilityRechargePct_'.length);
        const abilityName = getAbilityById(abilityId)?.name || abilityId;
        return `${abilityName} Recharge Speed: +${value}%`;
      }

      const pct = key.endsWith('Pct');
      const sign = value > 0 ? '+' : '';
      const label=labels[key] || key.replace(/Pct$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
      return `${label}: ${sign}${value}${pct ? '%' : ''}`;
    });
}

function applyNodeUnlock(player, node) {
  if (!player || !node) return;

  if (node.id === 'spirit_bone_coterie' || node.id === 'spirit_lich_ascension') {
    player.gravecaller = player.gravecaller && typeof player.gravecaller === 'object'
      ? player.gravecaller
      : {};
    player.gravecaller.path = node.id === 'spirit_bone_coterie' ? 'commander' : 'lichbound';
    player.gravecallerPath = player.gravecaller.path;
  }

  if (node.unlocksAbility) {
    unlockActiveAbility(player, node.unlocksAbility, { autoAssignEmpty: false });
  } else {
    unlockPassive(player, node.id);
  }
}
