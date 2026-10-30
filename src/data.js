import {MYTHICAL_ITEMS} from './mythicalEquipmentData.js';
import { abilityProgressionCategories } from './progressionProfiles.js';
import { COMBAT_EXPANSION_ABILITIES } from './combatExpansionData.js';
import {ENEMY_EQUIPMENT_ITEMS} from './enemyEquipmentData.js';
// data.js
// Runalis core data: world constants, skills display compatibility,
// items, equipment, abilities, crafting recipes, enemy loot tables, quests, and biomes.
//
// RPG content expansion update:
// - Adds additional quest/support items used by the expanded world content.
// - Adds loot tables for Roadless Bandits, Ember Veil cultists, and Veyr Wraiths.
// - Keeps all required exports stable for player.js, combat.js, world.js,
//   terrainRenderer.js, dungeonSystem.js, overworldMap.js, and render.js.

export const TILE = 32;

// Legacy dungeon/world fallback dimensions.
// The massive overworld is controlled by overworldMap.js, not these values.
export const WORLD_W = 72;
export const WORLD_H = 48;

// True skill logic lives in skills.js.
// This is kept for display compatibility and older imports.
export const SKILLS = {
  blade: {
    name: 'Blade',
    desc: 'Melee weapons, close combat, pressure, and dueling.'
  },

  archery: {
    name: 'Archery',
    desc: 'Bows, ranged weapons, precision shots, and kiting.'
  },

  spirit: {
    name: 'Spirit',
    desc: 'Soul magic, curses, ghost-light, summons, and unnatural power.'
  },

  warding: {
    name: 'Warding',
    desc: 'Blocking, armour use, shields, survival, nature-binding, and resistance.'
  },

  defence: {
    name: 'Defence',
    desc: 'Armour use, blocking discipline, mitigation, and surviving heavy pressure.'
  },

  hitpoints: {
    name: 'Hitpoints',
    desc: 'Health, pain tolerance, recovery, and staying alive under pressure.'
  },

  stamina: {
    name: 'Stamina',
    desc: 'Dodging, sprinting, blocking endurance, and action economy.'
  },

  foraging: {
    name: 'Foraging',
    desc: 'Harvest herbs, roots, fungi, food, and wild reagents.'
  },

  mining: {
    name: 'Mining',
    desc: 'Break ore, stone, bone piles, and buried relic nodes.'
  },

  fishing: {
    name: 'Fishing',
    desc: 'Catch fish, river materials, and rare waterborne resources.'
  },

  woodcutting: {
    name: 'Woodcutting',
    desc: 'Fell trees, split logs, and gather rare woods, bark, roots, and resins.'
  },

  crafting: {
    name: 'Crafting',
    desc: 'Create tools, weapons, armour, charms, and survival supplies.'
  },

  cooking: {
    name: 'Cooking',
    desc: 'Prepare food, healing meals, stamina meals, and temporary buffs.'
  },

  runecraft: {
    name: 'Runecraft',
    desc: 'Shape essence into runes, charms, enchantments, and magical tools.'
  },

  renown: {
    name: 'Renown',
    desc: 'Your reputation, trust, and standing in Echoryn Forest.'
  }
};

export const RARITY = {
  common: {
    name: 'Common',
    color: '#b8c0cc'
  },

  uncommon: {
    name: 'Uncommon',
    color: '#73d18a'
  },

  rare: {
    name: 'Rare',
    color: '#6fa8ef'
  },

  occult: {
    name: 'Occult',
    color: '#b68cff'
  },

  epic: {
    name: 'Epic',
    color: '#b68cff'
  },

  relic: {
    name: 'Relic',
    color: '#d9ad4f'
  },

  legendary: {
    name: 'Legendary',
    color: '#ffcc66'
  },

  mythic: {
    name: 'Mythical',
    color: '#ff7ac8'
  },

  ancient: {
    name: 'Ancient',
    color: '#66f0ff'
  }
};

export const RUNALIS_CLASSES = {
  classless: {
    id: 'classless',
    name: 'Classless',
    skill: null,
    xpMultiplier: 1.25,
    weaponType: 'sword',
    qAbility: null,
    rAbility: null
  },

  oathkeeper: {
    id: 'oathkeeper',
    name: 'Oathkeeper',
    skill: 'blunt',
    xpMultiplier: 1.25,
    weaponType: 'mace',
    qAbility: 'oathkeeperOathStrike',
    rAbility: 'oathkeeperDivineLeap'
  },

  fellhunter: {
    id: 'fellhunter',
    name: 'Fellhunter',
    skill: 'archery',
    xpMultiplier: 1.25,
    weaponType: 'bow',
    qAbility: 'fellhunterThrowingDaggers',
    rAbility: 'fellhunterBearTrap'
  },

  gravecaller: {
    id: 'gravecaller',
    name: 'Gravecaller',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'scythe',
    qAbility: 'graveSpark',
    rAbility: 'summonLich'
  },

  necromancer: {
    id: 'necromancer',
    aliasFor: 'gravecaller',
    hidden: true,
    name: 'Gravecaller',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'scythe',
    qAbility: 'graveSpark',
    rAbility: 'summonLich'
  },

  thornbinder: {
    id: 'thornbinder',
    name: 'Thornbinder',
    skill: 'warding',
    xpMultiplier: 1.25,
    weaponType: 'staff',
    qAbility: 'thornbinderThornLash',
    rAbility: 'thornbinderBramblePatch'
  },

  waverider: {
    id: 'waverider',
    name: 'Waverider',
    skill: 'warding',
    xpMultiplier: 1.25,
    weaponType: 'sword',
    qAbility: 'hydromancerWaterTorrent',
    rAbility: 'hydromancerBubbleWard'
  },

  lightbringer: {
    id: 'lightbringer',
    name: 'Lightbringer',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'spiritFocus',
    qAbility: 'lightbringerGleamBolt',
    rAbility: 'lightbringerDawncarver'
  },

  eldritch: {
    id: 'eldritch',
    name: 'Eldritch',
    skill: 'spirit',
    xpMultiplier: 1.25,
    weaponType: 'eldritch',
    qAbility: 'voidstepBurst',
    rAbility: 'summonEldritchHorror',
    hidden: true
  }
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

export const WEAPON_XP_PROFILES = {
  sword: {
    blade: 1.0
  },

  bow: {
    archery: 1.0
  },

  scythe: {
    spirit: 0.75,
    blade: 0.25
  },

  staff: {
    warding: 0.75,
    spirit: 0.25
  },

  spiritFocus: {
    spirit: 0.85,
    warding: 0.15
  },

  eldritch: {
    spirit: 1.0,
    warding: 0.2
  }
};

// -----------------------------------------------------------------------------
// ITEMS
// -----------------------------------------------------------------------------

export const ITEMS = {
  ...ENEMY_EQUIPMENT_ITEMS,
  ...MYTHICAL_ITEMS,
  // ---------------------------------------------------------------------------
  // REAGENTS / GATHERING
  // ---------------------------------------------------------------------------

  emberleaf: {
    id: 'emberleaf',
    name: 'Emberleaf',
    type: 'reagent',
    rarity: 'common',
    stack: true,
    value: 2,
    desc: 'A warm red herb used in salves and fire charms.'
  },

  gravecap: {
    id: 'gravecap',
    name: 'Gravecap',
    type: 'reagent',
    rarity: 'uncommon',
    stack: true,
    value: 4,
    desc: 'A pale fungal growth used in spirit tinctures.'
  },

  riverReed: {
    id: 'riverReed',
    name: 'River Reed',
    type: 'reagent',
    rarity: 'common',
    stack: true,
    value: 2,
    desc: 'A flexible reed used in simple bindings and fishing gear.'
  },

  lanternMoss: {
    id: 'lanternMoss',
    name: 'Lantern Moss',
    type: 'reagent',
    rarity: 'uncommon',
    stack: true,
    value: 6,
    desc: 'A faintly glowing marsh moss used in tonics and warding charms.'
  },

  ashFruit: {
    id: 'ashFruit',
    name: 'Ash Fruit',
    type: 'reagent',
    rarity: 'uncommon',
    stack: true,
    value: 7,
    desc: 'A fruit-shaped growth from burned orchard trees. It is not safe to eat raw.'
  },

  mirrorBark: {
    id: 'mirrorBark',
    name: 'Mirror Bark',
    type: 'reagent',
    rarity: 'rare',
    stack: true,
    value: 14,
    desc: 'Smooth reflective bark from Mirror Grove. It holds images longer than it should.'
  },

  // ---------------------------------------------------------------------------
  // FISH / FOOD
  // ---------------------------------------------------------------------------

  rawSunfish: {
    id: 'rawSunfish',
    name: 'Raw Sunfish',
    type: 'fish',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'A small fish from the safer rivers of Echoryn Forest.'
  },

  riverfish: {
    id: 'riverfish',
    name: 'Riverfish',
    type: 'fish',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'A common river fish. Useful for cooking.'
  },

  silverfin: {
    id: 'silverfin',
    name: 'Silverfin',
    type: 'fish',
    rarity: 'uncommon',
    stack: true,
    value: 9,
    desc: 'A rarer fish with shining scales. Good for better meals later.'
  },

  silverfinMinnow: {
    id: 'silverfinMinnow',
    name: 'Silverfin Minnow',
    type: 'fish',
    rarity: 'common',
    stack: true,
    value: 4,
    desc: 'A bright little river fish. Useful for early cooking and fish oil.'
  },

  echorynRiverperch: {
    id: 'echorynRiverperch',
    name: 'Echoryn Riverperch',
    type: 'fish',
    rarity: 'common',
    stack: true,
    value: 5,
    desc: 'A reliable forest river fish with firm white meat.'
  },

  mudscaleCarp: {
    id: 'mudscaleCarp',
    name: 'Mudscale Carp',
    type: 'fish',
    rarity: 'common',
    stack: true,
    value: 5,
    desc: 'A muddy but filling fish often caught near reed banks.'
  },

  lanternGill: {
    id: 'lanternGill',
    name: 'Lantern Gill',
    type: 'fish',
    rarity: 'uncommon',
    stack: true,
    value: 10,
    desc: 'A faintly glowing fish prized by alchemists and cooks.'
  },

  moonfinTrout: {
    id: 'moonfinTrout',
    name: 'Moonfin Trout',
    type: 'fish',
    rarity: 'rare',
    stack: true,
    value: 18,
    desc: 'A pale trout that shines under old shrine light.'
  },

  gravewaterEel: {
    id: 'gravewaterEel',
    name: 'Gravewater Eel',
    type: 'fish',
    rarity: 'occult',
    stack: true,
    value: 22,
    desc: 'A slick black eel found in cold, haunted water.'
  },

  ashbellyPike: {
    id: 'ashbellyPike',
    name: 'Ashbelly Pike',
    type: 'fish',
    rarity: 'rare',
    stack: true,
    value: 20,
    desc: 'An aggressive fish with smoky scales and rich meat.'
  },

  dawnscaleSalmon: {
    id: 'dawnscaleSalmon',
    name: 'Dawnscale Salmon',
    type: 'fish',
    rarity: 'rare',
    stack: true,
    value: 24,
    desc: 'A radiant salmon used in Lightbringer meals and tonics.'
  },

  tideglassKoi: {
    id: 'tideglassKoi',
    name: 'Tideglass Koi',
    type: 'fish',
    rarity: 'relic',
    stack: true,
    value: 38,
    desc: 'A glass-scaled fish valued by Waverider crafters.'
  },

  paleKingfin: {
    id: 'paleKingfin',
    name: 'The Pale Kingfin',
    type: 'fish',
    rarity: 'legendary',
    stack: true,
    value: 180,
    desc: 'A legendary river monarch. It is almost too valuable to cook, which is exactly why cooks want it.'
  },

  cookedSunfish: {
    id: 'cookedSunfish',
    name: 'Cooked Sunfish',
    type: 'food',
    rarity: 'common',
    stack: true,
    value: 5,
    heal: 18,
    stamina: 8,
    desc: 'Simple cooked fish. Restores health and a little stamina.'
  },

  fieldRations: {
    id: 'fieldRations',
    name: 'Field Rations',
    type: 'food',
    rarity: 'common',
    stack: true,
    value: 4,
    heal: 24,
    stamina: 14,
    desc: 'Dry travel food for dangerous roads. Restores health and stamina, and is consumed by long-distance expeditions.'
  },

  handScythe: {
    id: 'handScythe',
    name: 'Hand Scythe',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 36,
    skill: 'foraging',
    desc: 'A compact field blade for cutting reeds, herbs, thorns, and edible growth. Improves foraging yield and rare finds.'
  },

  ironPickaxe: {
    id: 'ironPickaxe',
    name: 'Iron Pickaxe',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 48,
    skill: 'mining',
    desc: 'A practical mining tool. Improves ore yield, scrap finds, and the chance to uncover arcane dust.'
  },

  fishingRod: {
    id: 'fishingRod',
    name: 'Fishing Rod',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 42,
    skill: 'fishing',
    desc: 'A sturdy river rod. Makes the fishing minigame easier and improves catch quality.'
  },

  fishingTackle: {
    id: 'fishingTackle',
    name: 'Fishing Tackle',
    type: 'tool',
    rarity: 'uncommon',
    stack: true,
    value: 8,
    skill: 'fishing',
    desc: 'Hooks, line, and bright lures. Improves fishing success and rare fish odds. Sometimes consumed on a catch.'
  },

  crudeFishingRod: {
    id: 'crudeFishingRod',
    name: 'Crude Fishing Rod',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 24,
    skill: 'fishing',
    toolTier: 1,
    desc: 'A crude but functional rod for basic river fishing.'
  },

  ironhookRod: {
    id: 'ironhookRod',
    name: 'Ironhook Rod',
    type: 'tool',
    rarity: 'uncommon',
    stack: false,
    value: 86,
    skill: 'fishing',
    toolTier: 2,
    desc: 'A sturdy rod with iron hooks and better line tension.'
  },

  tideglassRod: {
    id: 'tideglassRod',
    name: 'Tideglass Rod',
    type: 'tool',
    rarity: 'rare',
    stack: false,
    value: 170,
    skill: 'fishing',
    toolTier: 3,
    desc: 'A refined rod that steadies rare catches and opens legendary fishing odds.'
  },

  oldForagersKnife: {
    id: 'oldForagersKnife',
    name: 'Old Forager\'s Knife',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 24,
    skill: 'foraging',
    toolTier: 1,
    desc: 'A worn field knife for cutting herbs, roots, and mushrooms cleanly.'
  },

  ironSickle: {
    id: 'ironSickle',
    name: 'Iron Sickle',
    type: 'tool',
    rarity: 'uncommon',
    stack: false,
    value: 82,
    skill: 'foraging',
    toolTier: 2,
    desc: 'A sharp sickle that improves yield from herbs, vines, and rare plants.'
  },

  echorynHerbalistKit: {
    id: 'echorynHerbalistKit',
    name: 'Echoryn Herbalist Kit',
    type: 'tool',
    rarity: 'rare',
    stack: false,
    value: 165,
    skill: 'foraging',
    toolTier: 3,
    desc: 'A field kit for clean cuts, preserved samples, and rare plant extraction.'
  },

  crackedPickaxe: {
    id: 'crackedPickaxe',
    name: 'Cracked Pickaxe',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 26,
    skill: 'mining',
    toolTier: 1,
    desc: 'A cracked pickaxe good enough for fieldstone and soft ore.'
  },

  deepstonePickaxe: {
    id: 'deepstonePickaxe',
    name: 'Deepstone Pickaxe',
    type: 'tool',
    rarity: 'rare',
    stack: false,
    value: 185,
    skill: 'mining',
    toolTier: 3,
    desc: 'A heavy pickaxe that can bite into crystal, grave-silver, and deepstone.'
  },

  wornHatchet: {
    id: 'wornHatchet',
    name: 'Worn Hatchet',
    type: 'tool',
    rarity: 'common',
    stack: false,
    value: 24,
    skill: 'woodcutting',
    toolTier: 1,
    desc: 'A battered hatchet for softwood, branches, and fallen logs.'
  },

  ironwoodAxe: {
    id: 'ironwoodAxe',
    name: 'Ironwood Axe',
    type: 'tool',
    rarity: 'uncommon',
    stack: false,
    value: 96,
    skill: 'woodcutting',
    toolTier: 2,
    desc: 'A dependable axe with an ironwood haft and resin-set head.'
  },

  briarsteelLoggingAxe: {
    id: 'briarsteelLoggingAxe',
    name: 'Briarsteel Logging Axe',
    type: 'tool',
    rarity: 'rare',
    stack: false,
    value: 190,
    skill: 'woodcutting',
    toolTier: 3,
    desc: 'A rare logging axe for spiritwood, briarheart timber, and ancient roots.'
  },

  pilgrimRoadPermit: {
    id: 'pilgrimRoadPermit',
    name: 'Pilgrim Road Permit',
    type: 'quest',
    rarity: 'rare',
    stack: true,
    value: 0,
    desc: 'A stamped Covenant travel writ required to join an expedition into the Aureate Marches.'
  },

  severedCausewayChart: {
    id: 'severedCausewayChart',
    name: 'Severed Causeway Chart',
    type: 'quest',
    rarity: 'epic',
    stack: true,
    value: 0,
    desc: 'A dangerous route chart marking the last viable road into the Ascension Wastes.'
  },

  lightstormWard: {
    id: 'lightstormWard',
    name: 'Lightstorm Ward',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 45,
    desc: 'A warded charm that keeps the worst of the Ascension light from rewriting flesh and memory.'
  },

  seraphelFeather: {
    id: 'seraphelFeather',
    name: 'Seraphel Feather',
    type: 'material',
    rarity: 'legendary',
    stack: true,
    value: 120,
    desc: 'A broken radiant feather that still remembers rebellion.'
  },

  zephyrShard: {
    id: 'zephyrShard',
    name: 'Zephyr Shard',
    type: 'material',
    rarity: 'mythic',
    stack: true,
    value: 250,
    desc: 'A fragment of impossible light. It hums like a choir trying to become one voice.'
  },

  bitterStew: {
    id: 'bitterStew',
    name: 'Bitter Stew',
    type: 'food',
    rarity: 'uncommon',
    stack: true,
    value: 9,
    heal: 28,
    stamina: 16,
    desc: 'Ugly, bitter, and extremely useful.'
  },

  silverfinSkewer: {
    id: 'silverfinSkewer',
    name: 'Silverfin Skewer',
    type: 'food',
    rarity: 'uncommon',
    stack: true,
    value: 14,
    heal: 24,
    stamina: 22,
    desc: 'A clean river meal that restores stamina better than most field food.'
  },

  ashFruitStew: {
    id: 'ashFruitStew',
    name: 'Ash Fruit Stew',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 22,
    heal: 38,
    stamina: 14,
    spirit: 6,
    desc: 'A risky stew that tastes like smoke and old memories.'
  },

  shrineTonic: {
    id: 'shrineTonic',
    name: 'Shrine Tonic',
    type: 'food',
    rarity: 'occult',
    stack: true,
    value: 18,
    heal: 12,
    stamina: 8,
    spirit: 12,
    desc: 'A dangerous tonic made from grave fungus and pale essence.'
  },

  lanternTonic: {
    id: 'lanternTonic',
    name: 'Lantern Tonic',
    type: 'food',
    rarity: 'occult',
    stack: true,
    value: 26,
    heal: 20,
    stamina: 12,
    spirit: 18,
    desc: 'A marsh tonic that makes the world seem brighter for a short while.'
  },

  riverperchSkewer: {
    id: 'riverperchSkewer',
    name: 'Riverperch Skewer',
    type: 'food',
    rarity: 'common',
    stack: true,
    value: 8,
    heal: 24,
    stamina: 14,
    desc: 'A simple fish skewer seasoned with river herbs.'
  },

  herbalFishStew: {
    id: 'herbalFishStew',
    name: 'Herbal Fish Stew',
    type: 'food',
    rarity: 'uncommon',
    stack: true,
    value: 16,
    heal: 34,
    stamina: 22,
    desc: 'A warm stew that rewards good fishing and foraging routes.'
  },

  moonfinBroth: {
    id: 'moonfinBroth',
    name: 'Moonfin Broth',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 30,
    heal: 42,
    stamina: 28,
    spirit: 12,
    desc: 'A bright broth used before long dungeon pushes.'
  },

  ashbellyRoast: {
    id: 'ashbellyRoast',
    name: 'Ashbelly Roast',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 32,
    heal: 56,
    stamina: 18,
    desc: 'A rich roast that helps bruisers recover after hard fights.'
  },

  gravewaterEelSoup: {
    id: 'gravewaterEelSoup',
    name: 'Gravewater Eel Soup',
    type: 'food',
    rarity: 'occult',
    stack: true,
    value: 38,
    heal: 34,
    stamina: 18,
    spirit: 28,
    desc: 'An unsettling soup that restores awakened spirit with alarming efficiency.'
  },

  kingfinFeast: {
    id: 'kingfinFeast',
    name: 'Kingfin Feast',
    type: 'food',
    rarity: 'legendary',
    stack: true,
    value: 240,
    heal: 120,
    stamina: 90,
    spirit: 60,
    longBuff: 'kingfinFeast',
    buffDurationMs: 60 * 60 * 1000,
    desc: 'A legendary one-hour feast that fully prepares a party leader for serious exploration.'
  },

  spiritDraught: {
    id: 'spiritDraught',
    name: 'Spirit Draught',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 34,
    heal: 10,
    stamina: 10,
    spirit: 36,
    desc: 'A concentrated draught made from rare plants and radiant mineral dust.'
  },

  moonpetalElixir: {
    id: 'moonpetalElixir',
    name: 'Moonpetal Elixir',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 36,
    heal: 28,
    stamina: 20,
    spirit: 22,
    desc: 'A balanced elixir for casters and Lightbringers.'
  },

  bloodmossFortifier: {
    id: 'bloodmossFortifier',
    name: 'Bloodmoss Fortifier',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 34,
    heal: 64,
    stamina: 12,
    desc: 'A thick tonic that mends wounds and steadies the body.'
  },

  thornskinDraught: {
    id: 'thornskinDraught',
    name: 'Thornskin Draught',
    type: 'food',
    rarity: 'occult',
    stack: true,
    value: 42,
    heal: 30,
    stamina: 30,
    longBuff: 'thornskin',
    buffDurationMs: 12 * 60 * 1000,
    desc: 'A bitter defensive draught brewed from thorn fibers and resin.'
  },

  tideglassClarityPotion: {
    id: 'tideglassClarityPotion',
    name: 'Tideglass Clarity Potion',
    type: 'food',
    rarity: 'rare',
    stack: true,
    value: 40,
    heal: 18,
    stamina: 26,
    spirit: 24,
    desc: 'A blue potion for focus, flow, and long fights near water.'
  },

  // ---------------------------------------------------------------------------
  // MATERIALS / ESSENCE
  // ---------------------------------------------------------------------------

  ironOre: {
    id: 'ironOre',
    name: 'Black Iron Ore',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'Dense ore used for weapons and armour.'
  },

  ironScrap: {
    id: 'ironScrap',
    name: 'Iron Scrap',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 2,
    desc: 'Recovered metal used for basic gear upgrades.'
  },

  arcaneDust: {
    id: 'arcaneDust',
    name: 'Arcane Dust',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 7,
    desc: 'Glittering residue used for uncommon and rare upgrades.'
  },

  graveAsh: {
    id: 'graveAsh',
    name: 'Grave Ash',
    type: 'material',
    rarity: 'occult',
    stack: true,
    value: 11,
    desc: 'Cold ash used in necrotic and Graveborn work.'
  },

  briarRoot: {
    id: 'briarRoot',
    name: 'Briar Root',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 9,
    desc: 'Living root useful for Thornheart and Briarheart crafting.'
  },

  veyrglassShard: {
    id: 'veyrglassShard',
    name: 'Veyrglass Shard',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 24,
    desc: 'A dark reflective shard from Castle Veyreign.'
  },

  fieldstone: {
    id: 'fieldstone',
    name: 'Fieldstone',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 2,
    desc: 'Plain stone used for camp repairs, crude tools, and simple crafting.'
  },

  blackironOre: {
    id: 'blackironOre',
    name: 'Blackiron Ore',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 8,
    desc: 'A richer black ore used for sturdier gear and better tools.'
  },

  oathsteelShard: {
    id: 'oathsteelShard',
    name: 'Oathsteel Shard',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 24,
    desc: 'A pale metal shard that takes oaths better than edges.'
  },

  graveSilver: {
    id: 'graveSilver',
    name: 'Grave-Silver',
    type: 'material',
    rarity: 'occult',
    stack: true,
    value: 28,
    desc: 'Cold silver ore used in Gravecaller weapons and anti-undead craft.'
  },

  tideglassCrystal: {
    id: 'tideglassCrystal',
    name: 'Tideglass Crystal',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 26,
    desc: 'A blue-green crystal used in rods, rapiers, water foci, and charms.'
  },

  lumenQuartz: {
    id: 'lumenQuartz',
    name: 'Lumen Quartz',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 28,
    desc: 'Radiant quartz useful for Lightbringer foci and spirit tools.'
  },

  thornstone: {
    id: 'thornstone',
    name: 'Thornstone',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 22,
    desc: 'A green-veined stone that responds to living briar magic.'
  },

  hollowGem: {
    id: 'hollowGem',
    name: 'Blighted Gem',
    type: 'material',
    rarity: 'occult',
    stack: true,
    value: 30,
    desc: 'A gem that looks empty until held near a grave.'
  },

  deepstone: {
    id: 'deepstone',
    name: 'Deepstone',
    type: 'material',
    rarity: 'relic',
    stack: true,
    value: 42,
    desc: 'A dense stone used for master tools and heavy crafting.'
  },

  echorynSoftwood: {
    id: 'echorynSoftwood',
    name: 'Echoryn Softwood',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'Light forest wood used for handles, rods, and early craft.'
  },

  sturdyHardwood: {
    id: 'sturdyHardwood',
    name: 'Sturdy Hardwood',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 5,
    desc: 'Reliable wood for tool handles, shields, bows, and camp work.'
  },

  ashwoodLog: {
    id: 'ashwoodLog',
    name: 'Ashwood Log',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 8,
    desc: 'Dark ashwood favored by bowyers and road crafters.'
  },

  thornwoodBranch: {
    id: 'thornwoodBranch',
    name: 'Thornwood Branch',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 9,
    desc: 'A thorny branch used for Thornbinder staves, bows, and charms.'
  },

  ironwoodCore: {
    id: 'ironwoodCore',
    name: 'Ironwood Core',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 22,
    desc: 'A heavy wood core tough enough for axes, shields, and hafts.'
  },

  spiritwoodSplinter: {
    id: 'spiritwoodSplinter',
    name: 'Spiritwood Splinter',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 28,
    desc: 'A pale sliver of living spiritwood used for foci, rods, and charms.'
  },

  gravewoodRoot: {
    id: 'gravewoodRoot',
    name: 'Gravewood Root',
    type: 'material',
    rarity: 'occult',
    stack: true,
    value: 26,
    desc: 'A black root that grows best where no tree should.'
  },

  briarheartTimber: {
    id: 'briarheartTimber',
    name: 'Briarheart Timber',
    type: 'material',
    rarity: 'relic',
    stack: true,
    value: 44,
    desc: 'A rare thorn-infused timber used for top-tier nature gear.'
  },

  amberResin: {
    id: 'amberResin',
    name: 'Amber Resin',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 10,
    desc: 'Sticky golden resin used in tool craft, potions, and bow work.'
  },

  blackSap: {
    id: 'blackSap',
    name: 'Black Sap',
    type: 'material',
    rarity: 'occult',
    stack: true,
    value: 24,
    desc: 'A tar-like sap useful in poisons, occult oils, and dark tools.'
  },

  orrakaiMint: {
    id: 'orrakaiMint',
    name: 'Orrakai Mint',
    type: 'reagent',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'A clean mint used in meals, antidotes, and stamina tonics.'
  },

  echorynGreenleaf: {
    id: 'echorynGreenleaf',
    name: 'Echoryn Greenleaf',
    type: 'reagent',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'A broad green herb found throughout the forest edge.'
  },

  bitterroot: {
    id: 'bitterroot',
    name: 'Bitterroot',
    type: 'reagent',
    rarity: 'common',
    stack: true,
    value: 4,
    desc: 'A sharp root used in antidotes, stews, and fortifying tonics.'
  },

  moonpetal: {
    id: 'moonpetal',
    name: 'Moonpetal',
    type: 'reagent',
    rarity: 'rare',
    stack: true,
    value: 20,
    desc: 'A pale flower used in spirit elixirs and Lightbringer craft.'
  },

  bloodmoss: {
    id: 'bloodmoss',
    name: 'Bloodmoss',
    type: 'reagent',
    rarity: 'rare',
    stack: true,
    value: 18,
    desc: 'A red moss prized for healing tonics and stamina fortifiers.'
  },

  thornsilkVine: {
    id: 'thornsilkVine',
    name: 'Thornsilk Vine',
    type: 'reagent',
    rarity: 'rare',
    stack: true,
    value: 18,
    desc: 'A flexible vine used as binding, fiber, and thorn magic reagent.'
  },

  spiritFern: {
    id: 'spiritFern',
    name: 'Spirit Fern',
    type: 'reagent',
    rarity: 'occult',
    stack: true,
    value: 30,
    desc: 'A rare ruin fern that distills into powerful spirit reagents.'
  },

  ashrose: {
    id: 'ashrose',
    name: 'Ashrose',
    type: 'reagent',
    rarity: 'uncommon',
    stack: true,
    value: 9,
    desc: 'A grey-red flower used in fire tonics and hardy meals.'
  },

  dawnsage: {
    id: 'dawnsage',
    name: 'Dawnsage',
    type: 'reagent',
    rarity: 'rare',
    stack: true,
    value: 24,
    desc: 'A radiant herb used in Lightbringer potions and feast seasoning.'
  },

  redSealPoppy: {
    id: 'redSealPoppy',
    name: 'Last Dawn Poppy',
    type: 'reagent',
    rarity: 'occult',
    stack: true,
    value: 32,
    desc: 'A dangerous red flower used in late alchemy and demon-haunted craft.'
  },

  moonpetalEssence: {
    id: 'moonpetalEssence',
    name: 'Moonpetal Essence',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 28,
    desc: 'Refined moonpetal used in elixirs, charms, and radiant gear.'
  },

  bloodmossExtract: {
    id: 'bloodmossExtract',
    name: 'Bloodmoss Extract',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 26,
    desc: 'A red extract used in fortifiers and resilient armour work.'
  },

  thornsilkFiber: {
    id: 'thornsilkFiber',
    name: 'Thornsilk Fiber',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 24,
    desc: 'Prepared thorn fiber for bowstrings, bindings, and living gear.'
  },

  spiritFernDistillate: {
    id: 'spiritFernDistillate',
    name: 'Spirit Fern Distillate',
    type: 'material',
    rarity: 'occult',
    stack: true,
    value: 38,
    desc: 'A powerful spirit reagent for foci, draughts, and grave craft.'
  },

  fishOil: {
    id: 'fishOil',
    name: 'Fish Oil',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 5,
    desc: 'Rendered oil used in alchemy, cooking, and tool maintenance.'
  },

  fishboneHook: {
    id: 'fishboneHook',
    name: 'Fishbone Hook',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 10,
    desc: 'A polished hook carved from tough fish bone.'
  },

  bossCore: {
    id: 'bossCore',
    name: 'Boss Core',
    type: 'material',
    rarity: 'legendary',
    stack: true,
    value: 70,
    desc: 'A volatile core left by a powerful named enemy.'
  },

  towerFragment: {
    id: 'towerFragment',
    name: 'Tower Fragment',
    type: 'material',
    rarity: 'mythic',
    stack: true,
    value: 90,
    desc: 'A fragment from the Infinite Tower foundation.'
  },

  boneShard: {
    id: 'boneShard',
    name: 'Bone Shard',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'A brittle remnant that hums near ruins.'
  },

  wolfFang: {
    id: 'wolfFang',
    name: 'Ash Wolf Fang',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 8,
    desc: 'A blackened fang from an Ash Wolf.'
  },

  hollowEye: {
    id: 'hollowEye',
    name: 'Blighted Eye',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 7,
    desc: 'A glassy eye taken from a Blighted Corpse. It twitches in moonlight.'
  },

  paleEssence: {
    id: 'paleEssence',
    name: 'Pale Essence',
    type: 'essence',
    rarity: 'occult',
    stack: true,
    value: 10,
    desc: 'Condensed spirit residue. Useful for runecraft.'
  },

  knightPlate: {
    id: 'knightPlate',
    name: 'Gravebound Plate',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 14,
    desc: 'A broken plate fragment from a Gravebound Knight.'
  },

  cultAsh: {
    id: 'cultAsh',
    name: 'Cult Ash',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 9,
    desc: 'Grey-red ash used by Last Dawn seal-keepers to mark relic routes and burned archives.'
  },

  redSealFragment: {
    id: 'redSealFragment',
    name: 'Last Dawn Fragment',
    type: 'material',
    rarity: 'relic',
    stack: true,
    value: 38,
    desc: 'A hot fragment of a ritual seal. It feels like it is listening.'
  },

  veyrSigil: {
    id: 'veyrSigil',
    name: 'Veyr Sigil',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 30,
    desc: 'A broken noble sigil from House Veyr.'
  },

  watcherGlass: {
    id: 'watcherGlass',
    name: 'Watcher Glass',
    type: 'material',
    rarity: 'relic',
    stack: true,
    value: 45,
    desc: 'A shard of dark glass from Watcher Ridge. It reflects things behind you.'
  },

  banditToken: {
    id: 'banditToken',
    name: 'Roadless Token',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 5,
    desc: 'A crude token carried by Roadless Men.'
  },

  // ---------------------------------------------------------------------------
  // CURRENCY / LOOT
  // ---------------------------------------------------------------------------

  ashCoin: {
    id: 'ashCoin',
    name: 'Ash Coin',
    type: 'currency',
    rarity: 'common',
    stack: true,
    value: 1,
    desc: 'Local coinage of the ruined frontier.'
  },

  crackedRelic: {
    id: 'crackedRelic',
    name: 'Cracked Relic',
    type: 'loot',
    rarity: 'rare',
    stack: true,
    value: 22,
    desc: 'A fractured relic from the older Echoryn Forest. Someone will want this.'
  },

  buriedNameTablet: {
    id: 'buriedNameTablet',
    name: 'Buried Name Tablet',
    type: 'quest',
    rarity: 'occult',
    stack: false,
    value: 0,
    desc: 'A small ashwood tablet carved with a name that changes when ignored.'
  },

  cartographerMark: {
    id: 'cartographerMark',
    name: 'Cartographer Mark',
    type: 'quest',
    rarity: 'common',
    stack: true,
    value: 0,
    desc: 'A rough mark used by Sable Cartographer to confirm unstable landmarks.'
  },

  // ---------------------------------------------------------------------------
  // WEAPONS
  // ---------------------------------------------------------------------------

  oldKnife: {
    id: 'oldKnife',
    name: 'Old Knife',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 1.2,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 3,
    rarity: 'common',
    stack: false,
    value: 6,
    power: 1,
    desc: 'Barely a weapon, but better than bare hands.'
  },

  walkingStick: {
    id: 'walkingStick',
    name: 'Walking Stick',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 1.1,
    secondarySkill: 'spirit',
    secondaryMultiplier: 0.25,
    baseDamage: 3,
    rarity: 'common',
    stack: false,
    value: 5,
    power: 1,
    desc: 'A sturdy stick used by travelers and desperate fighters.'
  },

  eldritchConduit: {
    id: 'eldritchConduit',
    name: 'Starless Conduit',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'eldritch',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 2.45,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.35,
    baseDamage: 7,
    rarity: 'occult',
    stack: false,
    value: 0,
    power: 4,
    spirit: 4,
    traits: ['Secret Class', 'Red-Black Lightning'],
    desc: 'A hidden focus that does not hum, burn, or shine. It waits.'
  },

  crackedDawnlens: {
    id: 'crackedDawnlens',
    name: 'Cracked Dawnlens',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 1.85,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.35,
    baseDamage: 5,
    rarity: 'common',
    stack: false,
    value: 18,
    power: 2,
    spirit: 1,
    focusPower: 1,
    staminaCost: 8,
    range: 260,
    traits: ['Starter Focus', 'Lens Gauntlet'],
    desc: 'A fractured lens that still gathers enough light to cut the dark.'
  },

  pilgrimsFocus: {
    id: 'pilgrimsFocus',
    name: 'Pilgrim\'s Focus',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 2.1,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.35,
    baseDamage: 6,
    rarity: 'common',
    stack: false,
    value: 32,
    power: 2,
    spirit: 1,
    focusPower: 1,
    staminaCost: 8,
    range: 270,
    traits: ['Roadbound Focus'],
    desc: 'A small traveling focus carried by roadbound spellworkers.'
  },

  sealglassPrism: {
    id: 'sealglassPrism',
    name: 'Sealglass Prism',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 2.85,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.45,
    baseDamage: 8,
    rarity: 'uncommon',
    stack: false,
    value: 62,
    power: 4,
    spirit: 2,
    focusPower: 2,
    staminaCost: 7,
    range: 292,
    projectileSpeed: 455,
    traits: ['Stable Lens', 'Prism Edge'],
    desc: 'A prism cut from old sealglass, humming with contained force.'
  },

  moonlitReliquary: {
    id: 'moonlitReliquary',
    name: 'Moonlit Reliquary',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 3.45,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.6,
    baseDamage: 10,
    rarity: 'rare',
    stack: false,
    value: 110,
    power: 5,
    spirit: 3,
    focusPower: 3,
    staminaCost: 7,
    range: 305,
    traits: ['Spirit Conductor', 'Moonlit Core'],
    desc: 'A silver reliquary that drinks moonlight and exhales pale force.'
  },

  veyrGraveLens: {
    id: 'veyrGraveLens',
    name: 'Veyr Grave-Lens',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 4.2,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.55,
    baseDamage: 12,
    rarity: 'rare',
    stack: false,
    value: 150,
    power: 6,
    spirit: 4,
    focusPower: 4,
    staminaCost: 8,
    range: 315,
    traits: ['Graveglass', 'Undead Bane'],
    desc: 'A noble house lens recovered from the dead halls of Veyr.'
  },

  redSealConductor: {
    id: 'redSealConductor',
    name: 'Last Dawn Conductor',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 4.35,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.75,
    baseDamage: 12,
    rarity: 'rare',
    stack: false,
    value: 158,
    power: 6,
    spirit: 3,
    focusPower: 4,
    staminaCost: 6,
    range: 300,
    traits: ['Warded Frame', 'Sealbreaker'],
    desc: 'A compact conductor used to direct sealed energy through the hand.'
  },

  sunfractureGauntlet: {
    id: 'sunfractureGauntlet',
    name: 'Sunfracture Gauntlet',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 5.85,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.9,
    baseDamage: 16,
    rarity: 'legendary',
    stack: false,
    value: 450,
    power: 9,
    spirit: 5,
    focusPower: 6,
    staminaCost: 7,
    range: 330,
    traits: ['Radiant Core', 'Lumen-Friendly'],
    legendaryPassive: {
      id: 'sunfractureChannel',
      name: 'Sunfracture Channel',
      type: 'rangedBonus',
      bonusPct: 18,
      desc: 'Ranged and catalyst hits deal increased damage.'
    },
    desc: 'A splinter of impossible sunrise set into a battle gauntlet.'
  },

  uncrownedPrism: {
    id: 'uncrownedPrism',
    name: 'Uncrowned Prism',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 6.2,
    secondarySkill: 'warding',
    secondaryMultiplier: 1.1,
    baseDamage: 17,
    rarity: 'legendary',
    stack: false,
    value: 520,
    power: 10,
    spirit: 6,
    focusPower: 7,
    staminaCost: 8,
    range: 345,
    traits: ['Halo Prism', 'Future Relic'],
    legendaryPassive: {
      id: 'uncrownedEcho',
      name: 'Uncrowned Echo',
      type: 'cooldownFlatDamage',
      cooldown: 5,
      amount: 52,
      desc: 'Your next ready hit releases a second bent-light echo. Recharges every 5 seconds.'
    },
    desc: 'A beautiful and terrible prism that bends light as though obeying a fallen throne.'
  },

  noviceBlade: {
    id: 'noviceBlade',
    name: 'Novice Blade',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 2,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 6,
    rarity: 'common',
    stack: false,
    value: 15,
    power: 2,
    desc: 'Plain but reliable. A real beginning.'
  },

  oathkeepersMace: {
    id: 'oathkeepersMace',
    name: "Oathkeeper's Mace",
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'mace',
    skill: 'blunt',
    primarySkill: 'blunt',
    primaryMultiplier: 2.25,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.45,
    baseDamage: 7,
    rarity: 'common',
    stack: false,
    value: 22,
    power: 3,
    armour: 1,
    traits: ['Heavy Mace', 'Sacred Oath'],
    desc: 'A slow iron mace carried by oathbound wardens who expect to be hit back.'
  },

  crackedVowShield: {
    id: 'crackedVowShield',
    name: 'Cracked Vow Shield',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'common',
    stack: false,
    value: 18,
    armour: 3,
    spirit: 1,
    traits: ['Starter Shield', 'Block Focus'],
    desc: 'A battered vow-shield small enough to wear at the belt and raise when the oath is tested.'
  },

  tideglassRapier: {
    id: 'tideglassRapier',
    name: 'Tideglass Rapier',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 1.8,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.9,
    baseDamage: 6,
    rarity: 'uncommon',
    stack: false,
    value: 24,
    power: 2,
    spirit: 2,
    traits: ['Tideglass', 'Flowing Edge'],
    desc: 'A narrow blue-glass blade balanced for precise cuts and the shaping of living water.'
  },

  blackIronSword: {
    id: 'blackIronSword',
    name: 'Black Iron Sword',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 3,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 9,
    rarity: 'uncommon',
    stack: false,
    value: 40,
    power: 5,
    traits: ['Heavy Edge'],
    desc: 'A heavier blade forged from black iron.'
  },

  graveKnife: {
    id: 'graveKnife',
    name: 'Grave Knife',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 2.6,
    secondarySkill: 'spirit',
    secondaryMultiplier: 1.0,
    baseDamage: 8,
    rarity: 'occult',
    stack: false,
    value: 65,
    power: 4,
    spirit: 2,
    traits: ['Cold Edge', 'Spirit-Touched'],
    desc: 'A short blade that feels colder after every kill.'
  },

  veyrRapier: {
    id: 'veyrRapier',
    name: 'Veyr Rapier',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 3.8,
    secondarySkill: 'spirit',
    secondaryMultiplier: 0.8,
    baseDamage: 11,
    rarity: 'rare',
    stack: false,
    value: 105,
    power: 6,
    spirit: 2,
    traits: ['Noble Edge', 'Ghost-Forged'],
    desc: 'A narrow noble blade from Castle Veyreign.'
  },

  hunterBow: {
    id: 'hunterBow',
    name: 'Hunter Bow',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'bow',
    skill: 'archery',
    primarySkill: 'archery',
    primaryMultiplier: 2,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 6,
    rarity: 'common',
    stack: false,
    value: 18,
    power: 2,
    desc: 'A simple bow for hunting and cautious combat.'
  },

  ashwoodBow: {
    id: 'ashwoodBow',
    name: 'Ashwood Bow',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'bow',
    skill: 'archery',
    primarySkill: 'archery',
    primaryMultiplier: 3,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 9,
    rarity: 'uncommon',
    stack: false,
    value: 45,
    power: 5,
    traits: ['Flexible Draw'],
    desc: 'A flexible bow carved from dark ashwood.'
  },

  thornwoodBow: {
    id: 'thornwoodBow',
    name: 'Thornwood Bow',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'bow',
    skill: 'archery',
    primarySkill: 'archery',
    primaryMultiplier: 4,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.45,
    baseDamage: 12,
    rarity: 'rare',
    stack: false,
    value: 112,
    power: 7,
    armour: 1,
    traits: ['Thorn Draw', 'Living String'],
    desc: 'A bow grown from thornwood and bound with prepared thornsilk.'
  },

  oathsteelMace: {
    id: 'oathsteelMace',
    name: 'Oathsteel Mace',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'mace',
    skill: 'blunt',
    primarySkill: 'blunt',
    primaryMultiplier: 4.2,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.8,
    baseDamage: 13,
    rarity: 'rare',
    stack: false,
    value: 118,
    power: 7,
    armour: 2,
    traits: ['Oathsteel', 'Shieldbreaker'],
    desc: 'A heavy oathsteel weapon balanced for Oathkeepers and bruisers.'
  },

  spiritwoodFocus: {
    id: 'spiritwoodFocus',
    name: 'Spiritwood Focus',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 4.1,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.45,
    baseDamage: 9,
    range: 280,
    staminaCost: 8,
    rarity: 'rare',
    stack: false,
    value: 125,
    power: 5,
    spirit: 5,
    traits: ['Spiritwood', 'Living Lens'],
    desc: 'A focus carved from spiritwood and lumen quartz. It hums softly near old shrines.'
  },

  ironwoodShield: {
    id: 'ironwoodShield',
    name: 'Ironwood Shield',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'rare',
    stack: false,
    value: 110,
    armour: 4,
    stamina: 8,
    traits: ['Ironwood Guard'],
    desc: 'A compact ironwood shield charm carried by practical explorers.'
  },

  roadlessLongbow: {
    id: 'roadlessLongbow',
    name: 'Roadless Longbow',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'bow',
    skill: 'archery',
    primarySkill: 'archery',
    primaryMultiplier: 3.6,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 11,
    rarity: 'rare',
    stack: false,
    value: 88,
    power: 6,
    traits: ['Ambusher'],
    desc: 'A longbow used by bandits who prefer unfair fights.'
  },

  rootStaff: {
    id: 'rootStaff',
    name: 'Root Staff',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 2,
    secondarySkill: 'spirit',
    secondaryMultiplier: 0.5,
    baseDamage: 5,
    rarity: 'common',
    stack: false,
    value: 18,
    power: 2,
    armour: 1,
    desc: 'A living wooden staff used by new Thornbinders.'
  },

  briarStaff: {
    id: 'briarStaff',
    name: 'Briar Staff',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 3,
    secondarySkill: 'spirit',
    secondaryMultiplier: 0.75,
    baseDamage: 8,
    rarity: 'uncommon',
    stack: false,
    value: 48,
    power: 4,
    armour: 2,
    traits: ['Briar Focus'],
    desc: 'A thorn-wrapped staff that strengthens warding magic.'
  },

  heartrootStaff: {
    id: 'heartrootStaff',
    name: 'Heartroot Staff',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 4,
    secondarySkill: 'spirit',
    secondaryMultiplier: 1.1,
    baseDamage: 11,
    rarity: 'rare',
    stack: false,
    value: 90,
    power: 6,
    armour: 3,
    traits: ['Heartwood', 'Living Focus'],
    desc: 'A rare staff grown from old forest heartwood.'
  },

  mirrorRootStaff: {
    id: 'mirrorRootStaff',
    name: 'Mirror Root Staff',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 4.5,
    secondarySkill: 'spirit',
    secondaryMultiplier: 1.4,
    baseDamage: 12,
    rarity: 'relic',
    stack: false,
    value: 155,
    power: 7,
    armour: 4,
    spirit: 2,
    traits: ['Mirror Root', 'Living Ward'],
    desc: 'A polished staff from Mirror Grove. It bends light around the hand.'
  },

  graveScythe: {
    id: 'graveScythe',
    name: 'Grave Scythe',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 3,
    secondarySkill: 'blade',
    secondaryMultiplier: 0.75,
    baseDamage: 8,
    rarity: 'occult',
    stack: false,
    value: 72,
    power: 4,
    spirit: 3,
    traits: ['Soul Reaper'],
    desc: 'A curved spirit weapon used by Gravecallers.'
  },

  bonehookScythe: {
    id: 'bonehookScythe',
    name: 'Bonehook Scythe',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 2.5,
    secondarySkill: 'blade',
    secondaryMultiplier: 0.55,
    baseDamage: 7,
    rarity: 'uncommon',
    stack: false,
    value: 44,
    power: 3,
    spirit: 2,
    desc: 'A crude hooked scythe reinforced with bone.'
  },

  graveSilverScythe: {
    id: 'graveSilverScythe',
    name: 'Grave-Silver Scythe',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 4.4,
    secondarySkill: 'blade',
    secondaryMultiplier: 0.85,
    baseDamage: 12,
    rarity: 'rare',
    stack: false,
    value: 128,
    power: 6,
    spirit: 5,
    traits: ['Grave-Silver', 'Cold Reap'],
    desc: 'A scythe forged from grave-silver and gravewood root for spirit-heavy builds.'
  },

  unburiedCrescent: {
    id: 'unburiedCrescent',
    name: 'Unburied Crescent',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 5,
    secondarySkill: 'blade',
    secondaryMultiplier: 1.5,
    baseDamage: 13,
    rarity: 'relic',
    stack: false,
    value: 140,
    power: 7,
    spirit: 5,
    traits: ['Unburied', 'Crescent Reap'],
    desc: 'A relic scythe that hums near graves.'
  },

  redSealScythe: {
    id: 'redSealScythe',
    name: 'Last Dawn Scythe',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 5.4,
    secondarySkill: 'blade',
    secondaryMultiplier: 1.2,
    baseDamage: 14,
    rarity: 'legendary',
    stack: false,
    value: 220,
    power: 8,
    spirit: 6,
    traits: ['Last Dawn', 'Hungry Edge'],
    desc: 'A dangerous ritual scythe. It feels less like a weapon than a bargain.'
  },

  dawnwardAegis: {
    id: 'dawnwardAegis',
    name: 'Dawnward Aegis',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    stack: false,
    value: 420,
    armour: 4,
    spirit: 2,
    legendaryPassive: {
      id: 'dawnwardBarrier',
      name: 'Dawnward Barrier',
      type: 'damageShield',
      amount: 300,
      cooldown: 20,
      chargedCostReductionPct: 12,
      desc: 'When you take damage, conjures a 300 damage shield. Recharges every 20 seconds.'
    },
    desc: 'A palm-sized relic shield that opens like sunrise when blood is drawn.'
  },

  demonseedScythe: {
    id: 'demonseedScythe',
    name: 'Demonseed Scythe',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 6.1,
    secondarySkill: 'blade',
    secondaryMultiplier: 1.35,
    baseDamage: 16,
    rarity: 'legendary',
    stack: false,
    value: 440,
    power: 10,
    spirit: 7,
    legendaryPassive: {
      id: 'demonseedImp',
      name: 'Demonseed Imp',
      type: 'learnSummon',
      abilityId: 'summonDemon',
      desc: 'Acquiring this scythe reveals a Demonseed Pact in your inventory. Read it to learn Demon Summon. Activate it from your hotbar while this scythe is equipped; removing it dismisses the demon.'
    },
    desc: 'A black-red scythe with a seed of the Solgate still beating inside the haft.'
  },

  crownOfTheEndless: {
    id: 'crownOfTheEndless',
    name: 'Crown of the Endless',
    type: 'armour',
    slot: 'helm',
    rarity: 'legendary',
    stack: false,
    value: 410,
    armour: 5,
    spirit: 5,
    legendaryPassive: {
      id: 'endlessHarvest',
      name: 'Endless Harvest',
      type: 'killRestore',
      hp: 28,
      spirit: 18,
      desc: 'Kills restore health and Spirit.'
    },
    desc: 'A dark crown from a tower floor that refuses to be counted twice.'
  },

  veyrglassBlade: {
    id: 'veyrglassBlade',
    name: 'Veyrglass Blade',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 6,
    secondarySkill: 'spirit',
    secondaryMultiplier: 1.0,
    baseDamage: 16,
    rarity: 'legendary',
    stack: false,
    value: 435,
    power: 10,
    spirit: 3,
    legendaryPassive: {
      id: 'veyrExecution',
      name: 'Veyr Execution',
      type: 'executeBonus',
      thresholdPct: 0.25,
      bonusPct: 55,
      fullChargeDamagePct: 15,
      desc: 'Deals greatly increased damage to enemies below 25% health.'
    },
    desc: 'A translucent noble blade that brightens when an enemy begins to fear death.'
  },

  lichboneScythe: {
    id: 'lichboneScythe',
    name: 'Lichbone Scythe',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'scythe',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 5.9,
    secondarySkill: 'blade',
    secondaryMultiplier: 1.5,
    baseDamage: 15,
    rarity: 'legendary',
    stack: false,
    value: 430,
    power: 9,
    spirit: 8,
    legendaryPassive: {
      id: 'lichboneSiphon',
      name: 'Lichbone Siphon',
      type: 'lifestealDamage',
      lifestealPct: 6,
      bonusPct: 12,
      desc: 'Deals bonus damage and heals you for part of damage dealt.'
    },
    desc: 'A white-black scythe carved from something that continued thinking after death.'
  },

  thornheartStaffLegendary: {
    id: 'thornheartStaffLegendary',
    name: 'Thornheart Staff',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 6,
    secondarySkill: 'spirit',
    secondaryMultiplier: 1.1,
    baseDamage: 15,
    rarity: 'legendary',
    stack: false,
    value: 425,
    power: 9,
    armour: 5,
    spirit: 4,
    legendaryPassive: {
      id: 'thornheartBloom',
      name: 'Thornheart Bloom',
      type: 'damageNova',
      cooldown: 8,
      damage: 24,
      radius: 130,
      chargedDurationPct: 20,
      desc: 'Dealing damage periodically releases a poison thorn nova around the target.'
    },
    desc: 'A living staff with a heart of thorns, sap, and stubborn mercy.'
  },

  mercenarysLastMark: {
    id: 'mercenarysLastMark',
    name: 'Fellhunter\'s Last Mark',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'bow',
    skill: 'archery',
    primarySkill: 'archery',
    primaryMultiplier: 6,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 16,
    rarity: 'legendary',
    stack: false,
    value: 430,
    power: 10,
    legendaryPassive: {
      id: 'lastMark',
      name: 'Last Mark',
      type: 'rangedBonus',
      bonusPct: 22,
      desc: 'Ranged hits deal increased damage.'
    },
    desc: 'A longbow etched with one final name and no promise of mercy.'
  },

  oathplateOfTheLastDawn: {
    id: 'oathplateOfTheLastDawn',
    name: 'Oathplate of the Last Dawn',
    type: 'armour',
    slot: 'chest',
    rarity: 'legendary',
    stack: false,
    value: 460,
    armour: 11,
    spirit: 2,
    legendaryPassive: {
      id: 'radiantThorns',
      name: 'Radiant Thorns',
      type: 'reflectDamage',
      amount: 35,
      desc: 'Attackers take radiant retaliatory damage when they hurt you.'
    },
    desc: 'Plate armour for someone who understands that protection may still need teeth.'
  },

  ashboundMantle: {
    id: 'ashboundMantle',
    name: 'Ashbound Mantle',
    type: 'armour',
    slot: 'chest',
    rarity: 'legendary',
    stack: false,
    value: 405,
    armour: 7,
    spirit: 6,
    legendaryPassive: {
      id: 'ashboundDefiance',
      name: 'Ashbound Defiance',
      type: 'lowHpReduction',
      thresholdPct: 0.5,
      reductionPct: 25,
      desc: 'When below half health, incoming damage is reduced.'
    },
    desc: 'A cloak that smells of old campfires and refuses to let the wearer fall quietly.'
  },

  sunforgedHalo: {
    id: 'sunforgedHalo',
    name: 'Sunforged Halo',
    type: 'armour',
    slot: 'helm',
    rarity: 'legendary',
    stack: false,
    value: 390,
    armour: 4,
    spirit: 4,
    legendaryPassive: {
      id: 'sunforgedBurn',
      name: 'Sunforged Burn',
      type: 'flatDamage',
      amount: 14,
      desc: 'Hits deal additional holy-fire damage.'
    },
    desc: 'A cracked halo that burns without asking permission from the Covenant.'
  },

  briarCovenantGreaves: {
    id: 'briarCovenantGreaves',
    name: 'Briar Covenant Greaves',
    type: 'armour',
    slot: 'legs',
    rarity: 'legendary',
    stack: false,
    value: 385,
    armour: 7,
    spirit: 3,
    legendaryPassive: {
      id: 'rootSnare',
      name: 'Root Snare',
      type: 'snareAttacker',
      cooldown: 6,
      duration: 1.6,
      desc: 'Taking damage periodically snares the attacker.'
    },
    desc: 'Greaves grown around old vows. They root violence to the ground.'
  },

  runalisLantern: {
    id: 'runalisLantern',
    name: 'Runalis Lantern',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    stack: false,
    value: 500,
    armour: 1,
    spirit: 6,
    legendaryPassive: {
      id: 'smallMortalLight',
      name: 'Small Mortal Light',
      type: 'cheatDeath',
      cooldown: 120,
      heal: 90,
      desc: 'Fatal damage instead leaves you alive and heals you. Long cooldown.'
    },
    desc: 'Not the sun. Not a god. A small light carried by shaking hands.'
  },

  zephyrglassAmulet: {
    id: 'zephyrglassAmulet',
    name: 'Zephyrglass Amulet',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    stack: false,
    value: 460,
    spirit: 5,
    legendaryPassive: {
      id: 'echoBolt',
      name: 'Echo Bolt',
      type: 'cooldownFlatDamage',
      cooldown: 6,
      amount: 45,
      desc: 'Your hits periodically fire a second echo of light into the target.'
    },
    desc: 'A piece of bright glass that repeats your heartbeat half a second late.'
  },

  blackstarGreaves: {
    id: 'blackstarGreaves',
    name: 'Blackstar Greaves',
    type: 'armour',
    slot: 'legs',
    rarity: 'legendary',
    stack: false,
    value: 395,
    armour: 5,
    power: 2,
    legendaryPassive: {
      id: 'blackstarStep',
      name: 'Blackstar Step',
      type: 'dodgeChance',
      chance: 0.12,
      desc: 'You have a chance to completely avoid incoming damage.'
    },
    desc: 'Boots that step briefly through the shadow between one instant and the next.'
  },

  seraphsBrokenWing: {
    id: 'seraphsBrokenWing',
    name: 'Seraph\'s Broken Wing',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    stack: false,
    value: 440,
    armour: 2,
    spirit: 5,
    legendaryPassive: {
      id: 'brokenWingGuard',
      name: 'Broken Wing Guard',
      type: 'damageReductionAndStamina',
      reductionPct: 15,
      stamina: 12,
      desc: 'Incoming damage is reduced and restores stamina.'
    },
    desc: 'A broken angelic pinion. Beautiful, heavy, and no longer obedient.'
  },

  // ---------------------------------------------------------------------------
  // HELMS
  // ---------------------------------------------------------------------------

  clothHood: {
    id: 'clothHood',
    name: 'Cloth Hood',
    type: 'armour',
    slot: 'helm',
    rarity: 'common',
    stack: false,
    value: 8,
    armour: 1,
    desc: 'A simple hood. Keeps rain off your head more than blades.'
  },

  crackedIronCap: {
    id: 'crackedIronCap',
    name: 'Cracked Iron Cap',
    type: 'armour',
    slot: 'helm',
    rarity: 'common',
    stack: false,
    value: 16,
    armour: 2,
    desc: 'A dented iron cap that still has some life in it.'
  },

  graveboundHelm: {
    id: 'graveboundHelm',
    name: 'Gravebound Helm',
    type: 'armour',
    slot: 'helm',
    rarity: 'rare',
    stack: false,
    value: 70,
    armour: 4,
    spirit: 1,
    desc: 'A salvaged helm from a Gravebound Knight.'
  },

  knightHelm: {
    id: 'knightHelm',
    name: 'Knight Helm',
    type: 'armour',
    slot: 'helm',
    rarity: 'uncommon',
    stack: false,
    value: 42,
    armour: 3,
    desc: 'A sturdy helm worn by new Oathkeepers.'
  },

  necromancerHood: {
    id: 'necromancerHood',
    name: 'Gravecaller Hood',
    type: 'armour',
    slot: 'helm',
    rarity: 'occult',
    stack: false,
    value: 46,
    armour: 1,
    spirit: 2,
    desc: 'A dark hood that helps focus spirit magic.'
  },

  watcherHood: {
    id: 'watcherHood',
    name: 'Watcher Hood',
    type: 'armour',
    slot: 'helm',
    rarity: 'relic',
    stack: false,
    value: 120,
    armour: 3,
    spirit: 3,
    power: 2,
    desc: 'A hood threaded with dark glass. It makes distant things feel close.'
  },

  // ---------------------------------------------------------------------------
  // CHEST
  // ---------------------------------------------------------------------------

  patchedTunic: {
    id: 'patchedTunic',
    name: 'Patched Tunic',
    type: 'armour',
    slot: 'chest',
    rarity: 'common',
    stack: false,
    value: 10,
    armour: 1,
    desc: 'Thin protection. Better than nothing.'
  },

  leatherVest: {
    id: 'leatherVest',
    name: 'Leather Vest',
    type: 'armour',
    slot: 'chest',
    rarity: 'common',
    stack: false,
    value: 20,
    armour: 2,
    desc: 'A practical vest for fieldwork and trouble.'
  },

  wardedChest: {
    id: 'wardedChest',
    name: 'Warded Chestpiece',
    type: 'armour',
    slot: 'chest',
    rarity: 'uncommon',
    stack: false,
    value: 48,
    armour: 4,
    desc: 'Crude armour etched with oath marks.'
  },

  graveboundChest: {
    id: 'graveboundChest',
    name: 'Gravebound Chestplate',
    type: 'armour',
    slot: 'chest',
    rarity: 'rare',
    stack: false,
    value: 95,
    armour: 6,
    spirit: 1,
    desc: 'A heavy plate that remembers the shape of its former owner.'
  },

  knightChest: {
    id: 'knightChest',
    name: 'Knight Chestplate',
    type: 'armour',
    slot: 'chest',
    rarity: 'uncommon',
    stack: false,
    value: 62,
    armour: 5,
    desc: 'Reliable plate armour issued to Oathkeeper initiates.'
  },

  necromancerRobe: {
    id: 'necromancerRobe',
    name: 'Gravecaller Robe',
    type: 'armour',
    slot: 'chest',
    rarity: 'occult',
    stack: false,
    value: 65,
    armour: 2,
    spirit: 3,
    desc: 'A ritual robe stitched with pale thread.'
  },

  thornbinderGarb: {
    id: 'thornbinderGarb',
    name: 'Thornbinder Garb',
    type: 'armour',
    slot: 'chest',
    rarity: 'uncommon',
    stack: false,
    value: 58,
    armour: 3,
    spirit: 1,
    desc: 'Living green garb used by Thornbinder initiates.'
  },

  battleMageCoat: {
    id: 'battleMageCoat',
    name: 'Battlemage Coat',
    type: 'armour',
    slot: 'chest',
    rarity: 'rare',
    stack: false,
    value: 88,
    armour: 3,
    spirit: 3,
    desc: 'A reinforced coat for fighters who mix steel and magic.'
  },

  rogueLeathers: {
    id: 'rogueLeathers',
    name: 'Rogue Leathers',
    type: 'armour',
    slot: 'chest',
    rarity: 'uncommon',
    stack: false,
    value: 50,
    armour: 2,
    power: 1,
    desc: 'Flexible leathers for quick movement and dirty work.'
  },

  cultistMantle: {
    id: 'cultistMantle',
    name: 'Last Dawn Mantle',
    type: 'armour',
    slot: 'chest',
    rarity: 'occult',
    stack: false,
    value: 92,
    armour: 3,
    spirit: 4,
    desc: 'A red-black Order mantle. Inner stitches list relief routes; the outer hem is scorched clean of names.'
  },

  veyrCourtCoat: {
    id: 'veyrCourtCoat',
    name: 'Veyr Court Coat',
    type: 'armour',
    slot: 'chest',
    rarity: 'rare',
    stack: false,
    value: 110,
    armour: 4,
    spirit: 3,
    power: 1,
    desc: 'A ruined noble coat reinforced for dueling.'
  },

  // ---------------------------------------------------------------------------
  // LEGS
  // ---------------------------------------------------------------------------

  roughLegwraps: {
    id: 'roughLegwraps',
    name: 'Rough Legwraps',
    type: 'armour',
    slot: 'legs',
    rarity: 'common',
    stack: false,
    value: 12,
    armour: 1,
    desc: 'Travel-worn leg protection.'
  },

  ironGreaves: {
    id: 'ironGreaves',
    name: 'Iron Greaves',
    type: 'armour',
    slot: 'legs',
    rarity: 'uncommon',
    stack: false,
    value: 36,
    armour: 3,
    desc: 'Heavy enough to matter. Light enough to run in.'
  },

  graveboundGreaves: {
    id: 'graveboundGreaves',
    name: 'Gravebound Greaves',
    type: 'armour',
    slot: 'legs',
    rarity: 'rare',
    stack: false,
    value: 75,
    armour: 4,
    spirit: 1,
    desc: 'Cold metal leg armour taken from the restless dead.'
  },

  watcherGreaves: {
    id: 'watcherGreaves',
    name: 'Watcher Greaves',
    type: 'armour',
    slot: 'legs',
    rarity: 'relic',
    stack: false,
    value: 125,
    armour: 4,
    spirit: 2,
    power: 1,
    desc: 'Silent greaves that feel strangely light on high ground.'
  },

  // ---------------------------------------------------------------------------
  // JEWELRY / TRINKETS
  // ---------------------------------------------------------------------------

  thornCharm: {
    id: 'thornCharm',
    name: 'Thorn Charm',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'uncommon',
    stack: false,
    value: 35,
    spirit: 1,
    armour: 0,
    desc: 'A living charm that bites back.'
  },

  paleRune: {
    id: 'paleRune',
    name: 'Pale Rune',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'occult',
    stack: false,
    value: 60,
    spirit: 2,
    armour: 0,
    desc: 'A weak rune that stirs near the dead.'
  },

  ironOathRing: {
    id: 'ironOathRing',
    name: 'Iron Oath Ring',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'rare',
    stack: false,
    value: 80,
    spirit: 0,
    armour: 2,
    desc: 'A plain iron ring worn by frontier wardens.'
  },

  redSealRing: {
    id: 'redSealRing',
    name: 'Last Dawn Ring',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'relic',
    stack: false,
    value: 130,
    spirit: 4,
    armour: 1,
    desc: 'A hot ring marked with a red gate symbol.'
  },

  watcherGlassCharm: {
    id: 'watcherGlassCharm',
    name: 'Watcher Glass Charm',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'relic',
    stack: false,
    value: 145,
    spirit: 3,
    armour: 2,
    power: 1,
    desc: 'A shard of glass that reflects threats a moment before they strike.'
  }
};

Object.assign(ITEMS, {
  tornHide: {
    id: 'tornHide',
    name: 'Torn Hide',
    type: 'material',
    rarity: 'common',
    stack: true,
    value: 3,
    desc: 'Rough hide from frontier beasts. Useful for simple armour repairs.'
  },

  wildSinew: {
    id: 'wildSinew',
    name: 'Wild Sinew',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 8,
    desc: 'Tough sinew used for bowstrings, bindings, and reinforced gear.'
  },

  burialCloth: {
    id: 'burialCloth',
    name: 'Burial Cloth',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 8,
    desc: 'Cold cloth stripped from the restless dead. It still carries old rites.'
  },

  stolenPurse: {
    id: 'stolenPurse',
    name: 'Stolen Purse',
    type: 'loot',
    rarity: 'uncommon',
    stack: true,
    value: 12,
    desc: 'A small purse taken by road thieves. Most of the coin is still inside.'
  },

  livingBark: {
    id: 'livingBark',
    name: 'Living Bark',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 18,
    desc: 'Fresh bark that keeps growing after it is cut from the tree.'
  },

  thornSeed: {
    id: 'thornSeed',
    name: 'Thorn Seed',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 20,
    desc: 'A hard green seed that twitches when magic gathers nearby.'
  },

  waterglassDrop: {
    id: 'waterglassDrop',
    name: 'Waterglass Drop',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 22,
    desc: 'A bead of river-glass used by Waveriders to steady flowing enchantments.'
  },

  radiantSplinter: {
    id: 'radiantSplinter',
    name: 'Radiant Splinter',
    type: 'material',
    rarity: 'rare',
    stack: true,
    value: 24,
    desc: 'A sharp piece of old light. It is warm even in rain.'
  },

  shadowResidue: {
    id: 'shadowResidue',
    name: 'Shadow Residue',
    type: 'essence',
    rarity: 'occult',
    stack: true,
    value: 26,
    desc: 'A black powder left where magic failed to become light.'
  },

  dungeonRelicShard: {
    id: 'dungeonRelicShard',
    name: 'Dungeon Relic Shard',
    type: 'loot',
    rarity: 'relic',
    stack: true,
    value: 52,
    desc: 'A valuable relic shard from deeper dungeon floors.'
  },

  redGlassIchor: {
    id: 'redGlassIchor',
    name: 'Red Glass Ichor',
    type: 'material',
    rarity: 'relic',
    stack: true,
    value: 48,
    desc: 'A hot red fluid that hardens into glass when exposed to prayer.'
  },

  patchedRoadLeathers: {
    id: 'patchedRoadLeathers',
    name: 'Patched Road Leathers',
    type: 'armour',
    slot: 'chest',
    rarity: 'common',
    stack: false,
    value: 18,
    armour: 2,
    power: 1,
    desc: 'Layered travel leathers patched from half a dozen unlucky owners.'
  },

  scavengedIronHelm: {
    id: 'scavengedIronHelm',
    name: 'Scavenged Iron Helm',
    type: 'armour',
    slot: 'helm',
    rarity: 'common',
    stack: false,
    value: 16,
    armour: 2,
    desc: 'A dented iron helm that still remembers how to stop a blade.'
  },

  roadwardenCoat: {
    id: 'roadwardenCoat',
    name: 'Roadwarden Coat',
    type: 'armour',
    slot: 'chest',
    rarity: 'uncommon',
    stack: false,
    value: 42,
    armour: 4,
    spirit: 1,
    traits: ['Road Gear'],
    desc: 'A heavy coat reinforced for long patrols and bad weather.'
  },

  graveclothGreaves: {
    id: 'graveclothGreaves',
    name: 'Gravecloth Greaves',
    type: 'armour',
    slot: 'legs',
    rarity: 'uncommon',
    stack: false,
    value: 46,
    armour: 3,
    spirit: 2,
    traits: ['Burial Ward'],
    desc: 'Greaves wrapped in cold burial cloth and small warding knots.'
  },

  brigandMask: {
    id: 'brigandMask',
    name: 'Brigand Mask',
    type: 'armour',
    slot: 'helm',
    rarity: 'uncommon',
    stack: false,
    value: 38,
    armour: 1,
    power: 2,
    traits: ['Ambusher'],
    desc: 'A masked hood used by Roadless thieves who prefer not to be remembered.'
  },

  pilgrimsIronblade: {
    id: 'pilgrimsIronblade',
    name: 'Pilgrim Ironblade',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 2.55,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.4,
    baseDamage: 8,
    rarity: 'uncommon',
    stack: false,
    value: 44,
    power: 4,
    armour: 1,
    traits: ['Pilgrim Steel'],
    desc: 'A simple black-iron blade carried by frontier pilgrims and oathguards.'
  },

  thornhookStaff: {
    id: 'thornhookStaff',
    name: 'Thornhook Staff',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'staff',
    skill: 'warding',
    primarySkill: 'warding',
    primaryMultiplier: 3.35,
    secondarySkill: 'spirit',
    secondaryMultiplier: 0.8,
    baseDamage: 9,
    rarity: 'uncommon',
    stack: false,
    value: 58,
    power: 4,
    armour: 2,
    traits: ['Hooked Briar'],
    desc: 'A hooked living staff grown to pull enemies into bad ground.'
  },

  dawncarverLens: {
    id: 'dawncarverLens',
    name: 'Dawncarver Lens',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 4.2,
    secondarySkill: 'warding',
    secondaryMultiplier: 0.75,
    baseDamage: 12,
    rarity: 'rare',
    stack: false,
    value: 126,
    power: 6,
    spirit: 4,
    focusPower: 4,
    staminaCost: 7,
    range: 330,
    projectileSpeed: 520,
    traits: ['Beam Focus', 'Dawn Prism'],
    desc: 'A bright lens made to carve straight lines through clustered enemies.'
  },

  tideglassCutlass: {
    id: 'tideglassCutlass',
    name: 'Tideglass Cutlass',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 3.35,
    secondarySkill: 'warding',
    secondaryMultiplier: 1.05,
    baseDamage: 10,
    rarity: 'rare',
    stack: false,
    value: 112,
    power: 5,
    spirit: 3,
    traits: ['Flowing Edge', 'Waterglass'],
    desc: 'A curved Waverider blade that turns footwork into cutting force.'
  },

  waterSaintCharm: {
    id: 'waterSaintCharm',
    name: 'Water Saint Charm',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'rare',
    stack: false,
    value: 102,
    armour: 1,
    spirit: 3,
    traits: ['River Saint'],
    desc: 'A blue charm carried by river-saint duelists and Waveriders.'
  },

  ashRunnerDaggers: {
    id: 'ashRunnerDaggers',
    name: 'Ash Runner Daggers',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    primarySkill: 'blade',
    primaryMultiplier: 3.65,
    secondarySkill: null,
    secondaryMultiplier: 0,
    baseDamage: 11,
    rarity: 'rare',
    stack: false,
    value: 98,
    power: 6,
    traits: ['Quick Hands'],
    desc: 'A matched pair of practical blades for fast, unfair fights.'
  },

  oathboundBulwark: {
    id: 'oathboundBulwark',
    name: 'Oathbound Bulwark',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'rare',
    stack: false,
    value: 116,
    armour: 5,
    spirit: 1,
    traits: ['Guard Focus'],
    desc: 'A reinforced vow-shield that answers when its bearer refuses to move.'
  },

  veyrSilkMantle: {
    id: 'veyrSilkMantle',
    name: 'Veyr Silk Mantle',
    type: 'armour',
    slot: 'chest',
    rarity: 'rare',
    stack: false,
    value: 118,
    armour: 4,
    spirit: 4,
    traits: ['Noble Ward'],
    desc: 'A dark noble mantle lined with glass-thread and house sigils.'
  },

  everdawnCarver: {
    id: 'everdawnCarver',
    name: 'Everdawn Carver',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'spiritFocus',
    skill: 'spirit',
    primarySkill: 'spirit',
    primaryMultiplier: 6.2,
    secondarySkill: 'warding',
    secondaryMultiplier: 1.2,
    baseDamage: 17,
    rarity: 'legendary',
    stack: false,
    value: 470,
    power: 10,
    spirit: 7,
    focusPower: 7,
    staminaCost: 6,
    range: 380,
    projectileSpeed: 600,
    traits: ['Dawncarver', 'Beam Focus'],
    legendaryPassive: {
      id: 'everdawnLine',
      name: 'Everdawn Line',
      type: 'cooldownFlatDamage',
      cooldown: 5,
      amount: 42,
      chargedCostReductionPct: 10,
      desc: 'Your next hit while ready deals extra light damage. Charged abilities cost less resource.'
    },
    desc: 'A flawless Lightbringer focus that turns the hand into a sunrise blade.'
  },

  tideglassHeart: {
    id: 'tideglassHeart',
    name: 'Tideglass Heart',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    stack: false,
    value: 440,
    armour: 2,
    spirit: 6,
    legendaryPassive: {
      id: 'flowingSecondWind',
      name: 'Flowing Second Wind',
      type: 'damageReductionAndStamina',
      reductionPct: 8,
      stamina: 4,
      desc: 'Incoming hits are softened and restore a small amount of stamina.'
    },
    desc: 'A suspended blue heart of river-glass that beats faster when you keep moving.'
  },

  blackbriarCrown: {
    id: 'blackbriarCrown',
    name: 'Blackbriar Crown',
    type: 'armour',
    slot: 'helm',
    rarity: 'legendary',
    stack: false,
    value: 430,
    armour: 5,
    spirit: 5,
    legendaryPassive: {
      id: 'blackbriarSnare',
      name: 'Blackbriar Snare',
      type: 'snareAttacker',
      cooldown: 5,
      duration: 1.8,
      desc: 'Taking damage periodically roots the attacker.'
    },
    desc: 'A crown of black living thorns that hates anyone who gets too close.'
  },

  orrakaiFoundersSignet: {
    id: 'orrakaiFoundersSignet',
    name: 'Orrakai Founder’s Signet',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    stack: false,
    value: 455,
    armour: 3,
    spirit: 4,
    legendaryPassive: {
      id: 'foundersResolve',
      name: 'Founder\'s Resolve',
      type: 'killRestore',
      hp: 18,
      spirit: 12,
      desc: 'Kills restore health and Spirit.'
    },
    desc: 'The seal of Orrakai’s first water charter, recovered from the Grafted Custodian beneath Ashen Orchard. “No hearth shall thirst while the cistern holds.”'
  },

  livingAshSeed: {
    id: 'livingAshSeed',
    name: 'Living Ash Seed',
    type: 'reagent',
    rarity: 'occult',
    stack: true,
    value: 0,
    desc: 'A seed coaxed from the Orchard without curing its Rot. It remembers both blight and blossom.'
  },

  orchardWhitewashFormula: {
    id: 'orchardWhitewashFormula',
    name: 'Orchard Whitewash Formula',
    type: 'quest',
    rarity: 'uncommon',
    stack: false,
    value: 0,
    desc: 'A Covenant field recipe annotated with the exact point where the inner burn failed.'
  },

  preVeilingSluiceMap: {
    id: 'preVeilingSluiceMap',
    name: 'Pre-Veiling Sluice Rubbing',
    type: 'quest',
    rarity: 'occult',
    stack: false,
    value: 0,
    desc: 'A charcoal rubbing of water channels whose measurements disagree with every visible foundation.'
  },

  preservedOrchardTestimony: {
    id: 'preservedOrchardTestimony',
    name: 'Preserved Orchard Testimony',
    type: 'quest',
    rarity: 'rare',
    stack: false,
    value: 0,
    desc: 'Names, symptoms, and last statements saved from a record someone tried to burn.'
  },

  lastDawnCipherScrap: {
    id: 'lastDawnCipherScrap',
    name: 'Last Dawn Cipher Scrap',
    type: 'quest',
    rarity: 'occult',
    stack: false,
    value: 0,
    desc: 'The Order seal is genuine. The ink beneath it is older, and the corrections read like a warning.'
  },

  avarranTestimonyBlade: {
    id: 'avarranTestimonyBlade',
    name: 'Avarran Testimony Blade',
    type: 'weapon',
    slot: 'weapon',
    weaponType: 'sword',
    skill: 'blade',
    baseDamage: 12,
    rarity: 'rare',
    stack: false,
    value: 0,
    power: 3,
    spirit: 2,
    traits: ['Witnessed Oath', 'Civic Relic'],
    desc: 'An amber-edged civic blade once carried by the person appointed to challenge false testimony in public assembly.'
  },

  preservedNameCharm: {
    id: 'preservedNameCharm',
    name: 'Charm of the Preserved Name',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'rare',
    stack: false,
    value: 0,
    spirit: 3,
    armour: 1,
    desc: 'A funerary amber enclosing one name restored to its rightful grave. It grows warm near distorted Echoes.'
  },

  originalChapelPlan: {
    id: 'originalChapelPlan',
    name: 'Original Chapel Foundation Plan',
    type: 'quest',
    rarity: 'occult',
    stack: false,
    value: 0,
    desc: 'Nine foundation stations support an eightfold renovation. One station was removed from the legend, not the stone.'
  },

  riteOfFinalRefusal: {
    id: 'riteOfFinalRefusal',
    name: 'Rite of Final Refusal',
    type: 'quest',
    rarity: 'ancient',
    stack: false,
    value: 0,
    desc: 'A damaged Avarran rite requiring every summoned witness to receive one genuine opportunity to leave.'
  },

  covenantMedicalWrit: {
    id: 'covenantMedicalWrit',
    name: 'Covenant Roadside Medical Writ',
    type: 'quest',
    rarity: 'uncommon',
    stack: false,
    value: 0,
    desc: 'Grants treatment at restored Covenant road sanctuaries. The names of the Chapel dead are written along its margin.'
  },

  lastDawnArchiveKey: {
    id: 'lastDawnArchiveKey',
    name: 'Last Dawn Archive Key',
    type: 'quest',
    rarity: 'occult',
    stack: false,
    value: 0,
    desc: 'A red-sealed key to records stolen rather than burned. Possession is both invitation and accusation.'
  },

  neutralMemorialSeal: {
    id: 'neutralMemorialSeal',
    name: 'Seal of the Open Memorial',
    type: 'trinket',
    slot: 'trinket',
    rarity: 'rare',
    stack: false,
    value: 0,
    spirit: 2,
    stamina: 3,
    desc: 'A costly civic seal recognizing the Chapel as refuge, burial ground, and public archive under neither faction.'
  }
});

// -----------------------------------------------------------------------------
// ABILITIES
// -----------------------------------------------------------------------------

const MELEE_CHARGE = {
  canCharge: true,
  maxChargeTime: 0.9,
  chargeLevels: [0, 0.38, 0.78],
  chargeCostMultiplier: [1, 1.16, 1.34],
  damageMultiplierByCharge: [1, 1.26, 1.62],
  radiusMultiplierByCharge: [1, 1.12, 1.25],
  durationMultiplierByCharge: [1, 1.08, 1.18],
  staggerMultiplierByCharge: [1, 1.35, 1.85],
  releaseBehavior: 'cast'
};

const RANGED_CHARGE = {
  canCharge: true,
  maxChargeTime: 0.82,
  chargeLevels: [0, 0.4, 0.8],
  chargeCostMultiplier: [1, 1.14, 1.3],
  damageMultiplierByCharge: [1, 1.22, 1.55],
  radiusMultiplierByCharge: [1, 1.08, 1.18],
  durationMultiplierByCharge: [1, 1.12, 1.24],
  staggerMultiplierByCharge: [1, 1.2, 1.48],
  releaseBehavior: 'cast'
};

const SPELL_CHARGE = {
  canCharge: true,
  maxChargeTime: 1.0,
  chargeLevels: [0, 0.38, 0.78],
  chargeCostMultiplier: [1, 1.18, 1.4],
  damageMultiplierByCharge: [1, 1.28, 1.68],
  radiusMultiplierByCharge: [1, 1.16, 1.34],
  durationMultiplierByCharge: [1, 1.22, 1.48],
  staggerMultiplierByCharge: [1, 1.25, 1.62],
  releaseBehavior: 'cast'
};

Object.assign(ITEMS, {
  summonWolfScroll: { id:'summonWolfScroll', name:'Scroll: Summon Wolf', type:'scroll', learnsAbility:'summonWolf', stack:false, rarity:'common', value:12, desc:'A patient hand describes the pact of the roadside wolf. Read to permanently learn Summon Wolf. No class or level requirement.' },
  summonDemonScroll: { id:'summonDemonScroll', name:'Demonseed Pact', type:'scroll', learnsAbility:'summonDemon', legendaryUnlock:'demonseedScythe', stack:false, rarity:'legendary', value:0, desc:'The seed answers only an intentional pact. Read to permanently learn Demon Summon; the scythe must remain equipped to cast or sustain the demon.' },
  guardScroll: { id:'guardScroll', name:'Scroll: Guard', type:'scroll', learnsAbility:'guard', stack:false, rarity:'common', value:18, desc:'Read to learn a universal guarding technique.' }
});

export const ABILITIES = [
  {
    id:'block',name:'Block',key:'F',skill:'defence',tree:'defence',unlockLevel:1,
    role:'defence',heldBlock:true,costType:'stamina',cost:0,cd:0,damage:0,range:0,
    animationFamily:'guard',canCharge:false,noUseCharges:true,noChargeUpgrade:true,
    isChargeUpgradeEligible:false,maxCharges:1,progressionCategories:['defence'],
    desc:'Hold to block incoming attacks, reducing their damage by 62% before class bonuses. Holding drains Stamina and slows movement; absorbed hits cost extra Stamina and can break your guard. Keeping Block on your hotbar grants 25% more Defence XP, even when you do not use it.'
  },
  { id:'summonWolf', name:'Summon Wolf', skill:'summoning', tree:'summoning', unlockLevel:1, summonType:'wolf', cost:12, costType:'stamina', cd:8, range:180, animationFamily:'summon', progressionCategories:['summoning','spirit'], desc:'Call one roadside wolf. Activate again to dismiss it. Death or dismissal starts an 8 second recall. Every class may learn this pact.' },
  { id:'summonDemon', name:'Demon Summon', skill:'summoning', tree:'summoning', unlockLevel:1, summonType:'miniDemon', cost:20, costType:'spirit', cd:16, range:180, animationFamily:'summon', progressionCategories:['summoning','spirit','focus'], desc:'Invoke the Demonseed pact deliberately. One demon rends and scorches its foe. Knowledge and mastery persist; casting requires the equipped Demonseed Scythe.' },
  ...COMBAT_EXPANSION_ABILITIES,
  {
    ...MELEE_CHARGE,
    id: 'oathkeeperOathStrike',
    key: '1',
    name: 'Oath Strike',
    classId: 'oathkeeper',
    classSlot: 'Q',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 1,
    cd: 1.25,
    costType: 'stamina',
    cost: 9,
    damage: 11,
    damageMultiplier: 1.38,
    range: 48,
    desc: 'Strike with a blessed weapon, dealing heavy close-range melee damage and building Oathkeeper pressure.'
  },

  {
    ...MELEE_CHARGE,
    id: 'oathkeeperBastionBash',
    key: null,
    name: 'Bastion Bash',
    classId: 'oathkeeper',
    classSlot: 'R',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 1,
    cd: 5.2,
    costType: 'stamina',
    cost: 15,
    damage: 15,
    damageMultiplier: 1.28,
    range: 62,
    desc: 'Drive the shield forward, damaging, staggering, and knocking back enemies in front.'
  },

  {
    ...MELEE_CHARGE,
    id: 'oathkeeperDivineLeap',
    key: null,
    name: 'Divine Leap',
    classId: 'oathkeeper',
    classSlot: 'R',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 1,
    cd: 9.5,
    costType: 'stamina',
    cost: 22,
    damage: 18,
    damageMultiplier: 1.55,
    range: 118,
    desc: 'Leap forward and crash down with divine force, damaging and staggering enemies near the landing point.'
  },

  {
    ...MELEE_CHARGE,
    id: 'oathkeeperJudgmentSmite',
    key: null,
    name: 'Judgment Smite',
    classId: 'oathkeeper',
    classSlot: 'RT Branch',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 4,
    cd: 7.4,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 20,
    damage: 20,
    damageMultiplier: 1.62,
    range: 86,
    desc: 'Release a close-range holy smite around the Oathkeeper. Charged casts increase radius and impact.'
  },

  {
    ...SPELL_CHARGE,
    id: 'oathkeeperConsecratedGround',
    key: null,
    name: 'Consecrated Ground',
    classId: 'oathkeeper',
    classSlot: 'X',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 6,
    cd: 14.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 24,
    damage: 8,
    damageMultiplier: 0.85,
    range: 92,
    desc: 'Sanctify the ground nearby, damaging enemies over time and reducing incoming damage while you hold the zone.'
  },

  {
    ...MELEE_CHARGE,
    id: 'oathkeeperBulwarkOfLight',
    key: null,
    name: 'Bulwark of Light',
    classId: 'oathkeeper',
    classSlot: 'X',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 8,
    cd: 13.0,
    costType: 'stamina',
    cost: 18,
    damage: 0,
    damageReduction: 0.5,
    range: 0,
    desc: 'Raise a radiant shield that greatly improves block and reduces incoming damage for a short time.'
  },

  {
    ...SPELL_CHARGE,
    id: 'oathkeeperLastRite',
    key: null,
    name: 'Last Rite',
    classId: 'oathkeeper',
    classSlot: 'X',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 12,
    cd: 24.0,
    costType: 'spirit',
    cost: 42,
    damage: 0,
    range: 0,
    desc: 'Spend a large amount of Spirit to restore yourself with holy light. Powerful, expensive, and not spammable.'
  },

  {
    ...MELEE_CHARGE,
    id: 'oathkeeperHeavenbreakerJudgment',
    key: null,
    name: 'Heavenbreaker Judgment',
    classId: 'oathkeeper',
    classSlot: 'X',
    skill: 'blunt',
    tree: 'blade',
    unlockLevel: 18,
    cd: 28.0,
    costType: 'stamina',
    cost: 34,
    damage: 30,
    damageMultiplier: 2.05,
    range: 132,
    desc: 'Plant weapon and shield into the ground, releasing a massive divine shockwave and briefly fortifying yourself.'
  },

  {
    ...MELEE_CHARGE,
    id: 'fellhunterPracticalStrike',
    key: null,
    name: 'Practical Strike',
    classId: 'fellhunter',
    classSlot: 'Basic',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 1,
    cd: 1.05,
    costType: 'stamina',
    cost: 6,
    damage: 9,
    damageMultiplier: 1.12,
    range: 48,
    desc: 'A quick blade or hatchet strike for close-range emergencies. No tricks, just steel and timing.'
  },

  {
    id: 'fellhunterThrowingDaggers',
    key: '3',
    name: 'Throwing Daggers',
    classId: 'fellhunter',
    classSlot: 'Q',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 1,
    cd: 1.25,
    maxCharges: 2,
    maxChargeCap: 3,
    costType: 'stamina',
    cost: 7,
    damage: 9,
    damageMultiplier: 1.06,
    range: 210,
    desc: 'Throw steel daggers in the aimed direction. Reliable ranged pressure that hits harder against Exposed targets.'
  },

  {
    id: 'fellhunterBearTrap',
    key: null,
    name: 'Bear Trap',
    classId: 'fellhunter',
    classSlot: 'R',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 1,
    cd: 7.5,
    maxCharges: 1,
    maxChargeCap: 2,
    costType: 'stamina',
    cost: 12,
    damage: 15,
    damageMultiplier: 1.32,
    range: 96,
    desc: 'Place a mechanical trap ahead of you. It arms quickly, snaps on the first enemy, slows or roots them, and applies Exposed.'
  },

  {
    id: 'fellhunterCaltrops',
    key: null,
    name: 'Caltrops',
    classId: 'fellhunter',
    classSlot: 'RT Branch',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 4,
    cd: 8.0,
    maxChargeCap: 2,
    costType: 'stamina',
    cost: 12,
    damage: 5,
    damageMultiplier: 0.72,
    range: 90,
    desc: 'Scatter metal spikes across the ground, slowing enemies that cross them and briefly exposing them.'
  },

  {
    id: 'fellhunterBombToss',
    key: null,
    name: 'Bomb Toss',
    classId: 'fellhunter',
    classSlot: 'X',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 1,
    cd: 8.8,
    maxChargeCap: 2,
    costType: 'stamina',
    cost: 15,
    damage: 18,
    damageMultiplier: 1.36,
    range: 154,
    desc: 'Throw a handmade bomb with a short fuse. It bursts with smoke, sparks, and physical fire, exposing enemies caught in the blast.'
  },

  {
    id: 'fellhunterGrapplingHook',
    key: null,
    name: 'Grappling Hook',
    classId: 'fellhunter',
    classSlot: 'Mobility',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 4,
    cd: 6.5,
    costType: 'stamina',
    cost: 10,
    damage: 0,
    damageMultiplier: 1,
    range: 136,
    desc: 'Fire a hookline in the aimed direction and pull yourself forward. The pull stops at walls and solid terrain.'
  },

  {
    ...RANGED_CHARGE,
    id: 'fellhunterFlamingArrowVolley',
    key: null,
    name: 'Flaming Arrow Volley',
    classId: 'fellhunter',
    classSlot: 'RT Branch',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 6,
    cd: 10.0,
    costType: 'stamina',
    cost: 18,
    damage: 11,
    damageMultiplier: 1.02,
    range: 250,
    maxHits: 6,
    desc: 'Loose oiled arrows in a wide arc. The impacts burn through groups with practical fire and smoke.'
  },

  {
    id: 'fellhunterSmokeBomb',
    key: null,
    name: 'Smoke Bomb',
    classId: 'fellhunter',
    classSlot: 'X',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 4,
    cd: 9.0,
    maxChargeCap: 2,
    costType: 'stamina',
    cost: 15,
    damage: 7,
    damageMultiplier: 0.7,
    range: 118,
    desc: 'Drop a gray smoke burst that slows nearby enemies, disrupts pursuit, and exposes targets long enough to escape or punish.'
  },

  {
    ...RANGED_CHARGE,
    id: 'fellhunterMarkedShot',
    key: null,
    name: 'Marked Shot',
    classId: 'fellhunter',
    classSlot: 'R',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 8,
    cd: 4.6,
    costType: 'stamina',
    cost: 11,
    damage: 16,
    damageMultiplier: 1.45,
    range: 240,
    desc: 'Aim a careful arrow or crossbow shot that applies Exposed and sets up the next trap, dagger, or bomb hit.'
  },

  {
    id: 'fellhunterKillZone',
    key: null,
    name: 'Kill Zone',
    classId: 'fellhunter',
    classSlot: 'Signature',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 12,
    cd: 18.0,
    maxChargeCap: 1,
    costType: 'stamina',
    cost: 28,
    damage: 24,
    damageMultiplier: 1.72,
    range: 170,
    desc: 'Rapidly deploy traps, caltrops, fuses, and a finishing volley in a compact prepared area. Strong if enemies stay inside.'
  },

  {
    ...SPELL_CHARGE,
    id: 'graveSpark',
    key: null,
    name: 'Necrotic Bolt',
    classId: 'gravecaller',
    classSlot: 'Q',
    skill: 'spirit',
    tree: 'spirit',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 0.75,
    costType: 'spirit',
    cost: 12,
    damage: 15,
    damageMultiplier: 1.2,
    range: 600,
    desc: 'Fire a fast necrotic orb toward your aim. Direct impacts steal life from damage actually dealt.'
  },

  {
    id: 'summonLich',
    key: null,
    name: 'Raise the Bound Dead',
    classId: 'gravecaller',
    classSlot: 'R',
    skill: 'spirit',
    tree: 'spirit',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 12.0,
    noChargeUpgrade: true, noUseCharges: true,
    costType: 'spirit',
    cost: 18,
    damage: 0,
    range: 0,
    summonType: 'lich',
    desc: 'Raise a skeletal henchman whose attacks steal 4% of actual damage as health for you, before bonuses. Commander raises three; mastery unlocks specter and lesser goliath forms. All summons share their healing limit. Use again to dismiss the group.'
  },

  {
    id: 'gravecallerSummonLich',
    key: null,
    name: 'Summon Lich',
    classId: 'gravecaller',
    classSlot: 'Lichbound Reaper',
    skill: 'spirit', tree: 'spirit', unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 16, noChargeUpgrade: true, noUseCharges: true,
    costType: 'spirit', cost: 28, damage: 0, range: 0,
    summonType: 'greaterLich',
    desc: 'Call a durable ranged lich. Primary bolts steal 4% of actual damage as health for you, before bonuses; every third bolt bursts against up to three nearby enemies. All summons share their healing limit. Use again to dismiss it; Raise the Bound Dead remains separate.'
  },

  {
    ...SPELL_CHARGE,
    id: 'bloodLance',
    key: null,
    name: 'Blood Lance',
    classId: 'gravecaller',
    classSlot: 'RT Branch',
    skill: 'spirit',
    tree: 'spirit',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 4.8,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 20,
    damage: 24,
    damageMultiplier: 1.9,
    range: 280,
    desc: 'Pierce a target with a powerful necrotic lance. Direct damage steals life; the Acolyte morph trades this healing for its own effects.'
  },

  {
    ...SPELL_CHARGE,
    id: 'soulSiphon',
    key: null,
    name: 'Soul Siphon',
    classId: 'gravecaller',
    classSlot: 'X',
    skill: 'spirit',
    tree: 'spirit',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 7.2,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 18,
    damage: 12,
    damageMultiplier: 1.05,
    range: 126,
    desc: 'Drain nearby enemies with a short necrotic pulse. Direct damage steals life within your shared healing limit.'
  },

  {
    ...SPELL_CHARGE,
    id: 'thornbinderThornLash',
    key: null,
    name: 'Thorn Lash',
    classId: 'thornbinder',
    classSlot: 'Q',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 1,
    cd: 0.65,
    noChargeUpgrade: true,
    costType: 'spirit',
    cost: 7,
    damage: 7,
    damageMultiplier: 0.86,
    range: 245,
    maxHits: 5,
    desc: 'Lash forward with a thorny vine, damaging several enemies, slowing them, and opening Verdant Wounds.'
  },

  {
    ...SPELL_CHARGE,
    id: 'thornbinderBriarHook',
    key: null,
    name: 'Briar Hook',
    classId: 'thornbinder',
    classSlot: 'R',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 1,
    cd: 5.6,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 13,
    damage: 9,
    damageMultiplier: 0.82,
    range: 315,
    maxHits: 1,
    desc: 'Shoot a hooked vine that bites into a target, dealing light damage and applying a strong slow or brief root.'
  },

  {
    ...SPELL_CHARGE,
    id: 'thornbinderBramblePatch',
    key: null,
    name: 'Bramble Patch',
    classId: 'thornbinder',
    classSlot: 'R',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 1,
    cd: 8.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 18,
    damage: 8,
    damageMultiplier: 0.72,
    range: 145,
    desc: 'Grow a thorny ground patch that slows enemies, deals modest damage over time, and spreads Verdant Wounds.'
  },

  {
    ...SPELL_CHARGE,
    id: 'thornbinderRosebiteBurst',
    key: null,
    name: 'Rosebite Burst',
    classId: 'thornbinder',
    classSlot: 'RT Branch',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 4,
    cd: 7.2,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 17,
    damage: 13,
    damageMultiplier: 0.94,
    range: 118,
    desc: 'Raise rose-headed thorn mouths from the ground after a short snap, biting clustered enemies and slowing them.'
  },

  {
    ...SPELL_CHARGE,
    id: 'thornbinderLivingBriar',
    key: null,
    name: 'Living Briar',
    classId: 'thornbinder',
    classSlot: 'X',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 4,
    cd: 14.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 20,
    damage: 0,
    damageMultiplier: 0,
    range: 136,
    desc: 'Seed a brief regeneration aura. Offensive thorn magic also refreshes a smaller Briar Bloom aura during combat.'
  },

  {
    ...SPELL_CHARGE,
    id: 'thornbinderRootPrison',
    key: null,
    name: 'Root Prison',
    classId: 'thornbinder',
    classSlot: 'X',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 5,
    cd: 10.5,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 22,
    damage: 7,
    damageMultiplier: 0.58,
    range: 158,
    desc: 'Erupt thick roots around a target area, heavily slowing or briefly rooting enemies while adding Verdant Wounds.'
  },

  {
    id: 'thornbinderSummonThornlings',
    key: null,
    name: 'Summon Thornlings',
    classId: 'thornbinder',
    classSlot: 'X',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 8,
    cd: 15.0,
    noChargeUpgrade: true,
    costType: 'spirit',
    cost: 24,
    damage: 0,
    range: 0,
    summonType: 'thornbeast',
    desc: 'Summon three fragile rose-headed thornlings that harass, distract, and spread small slows and Verdant Wounds.'
  },

  {
    id: 'thornbinderSummonElderThornbeast',
    key: null,
    name: 'Summon Elder Thornbeast',
    classId: 'thornbinder',
    classSlot: 'X',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 8,
    cd: 18.0,
    noChargeUpgrade: true,
    costType: 'spirit',
    cost: 30,
    damage: 0,
    range: 0,
    summonType: 'thornbeast',
    desc: 'Summon one durable rosemaw beast with Elder Presence and a cooldown-based Rosemaw Devour bite.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hydromancerWaterTorrent',
    key: null,
    name: 'Water Torrent',
    classId: 'waverider',
    classSlot: 'Q',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 1.8,
    maxChargeCap: 3,
    costType: 'spirit',
    cost: 10,
    damage: 13,
    damageMultiplier: 1.2,
    range: 230,
    maxHits: 5,
    desc: 'Drive a charged torrent through a narrow cone. Repeated water hits apply Soaked and make enemies vulnerable to Waverider pressure.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hydromancerBubbleWard',
    key: null,
    name: 'Bubble Ward',
    classId: 'waverider',
    classSlot: 'R',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 8,
    requiresSpiritAwakened: true,
    cd: 8.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 17,
    damage: 0,
    range: 118,
    desc: 'Wrap yourself and nearby allies in a pressure ward that absorbs flat damage from each hit. Absorption scales with charge and Level; duration gains +1 second every 10 levels.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hydromancerMendingCurrent',
    key: null,
    name: 'Mending Current',
    classId: 'waverider',
    classSlot: 'Branch',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 7.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 18,
    damage: 0,
    range: 132,
    desc: 'Send a restorative current through nearby allies, healing more strongly when fully charged.'
  },

  {
    ...MELEE_CHARGE,
    id: 'hydromancerTidalCut',
    key: null,
    name: 'Tidal Cut',
    classId: 'waverider',
    classSlot: 'Branch',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 4,
    cd: 4.2,
    maxChargeCap: 2,
    costType: 'stamina',
    cost: 14,
    damage: 17,
    damageMultiplier: 1.45,
    range: 76,
    desc: 'Step through a sweeping Tideglass cut. The water edge deals extra pressure to Soaked enemies.'
  },

  {
    id: 'hydromancerRiptideStep',
    key: null,
    name: 'Riptide Step',
    classId: 'waverider',
    classSlot: 'Branch',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 6.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 13,
    damage: 9,
    damageMultiplier: 0.85,
    range: 138,
    desc: 'Ride a short current forward, leaving a slowing wake and bursting around your arrival.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hydromancerDrowningPressure',
    key: null,
    name: 'Drowning Pressure',
    classId: 'waverider',
    classSlot: 'Branch',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 6,
    requiresSpiritAwakened: true,
    cd: 6.5,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 18,
    damage: 18,
    damageMultiplier: 1.3,
    range: 190,
    desc: 'Collapse pressure around an aimed group, slowing and heavily Soaking every enemy caught inside.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hydromancerWellspring',
    key: null,
    name: 'Wellspring',
    classId: 'waverider',
    classSlot: 'Branch',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 8,
    requiresSpiritAwakened: true,
    cd: 12.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 24,
    damage: 0,
    range: 150,
    desc: 'Raise a generous wellspring that restores health, stamina, and spirit to nearby allies.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hydromancerDelugeCrown',
    key: null,
    name: 'Deluge Crown',
    classId: 'waverider',
    classSlot: 'Signature',
    skill: 'warding',
    tree: 'hydromancy',
    unlockLevel: 12,
    requiresSpiritAwakened: true,
    cd: 16.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 30,
    damage: 28,
    damageMultiplier: 1.75,
    range: 164,
    desc: 'Crown the battlefield in a violent deluge, crushing enemies while granting nearby allies a powerful pressure ward.'
  },

  {
    id: 'lightbringerGleamBolt',
    key: null,
    name: 'Gleam Bolt',
    classId: 'lightbringer',
    classSlot: 'Q',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 0.95,
    noChargeUpgrade: true,
    costType: 'spirit',
    cost: 5,
    damage: 8,
    damageMultiplier: 1.02,
    range: 310,
    desc: 'Fire a quick radiant bolt. Every few successful hits generate a Lumen; branded targets count faster.'
  },

  {
    id: 'lightbringerHaloBrand',
    key: null,
    name: 'Halo Brand',
    classId: 'lightbringer',
    classSlot: 'Starter',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 5.2,
    noChargeUpgrade: true,
    costType: 'spirit',
    cost: 9,
    damage: 5,
    damageMultiplier: 0.7,
    range: 285,
    desc: 'Mark a target with a fractured halo. Lightbringer attacks against branded enemies build Lumens faster.'
  },

  {
    ...SPELL_CHARGE,
    id: 'lightbringerRayOfRebuke',
    key: null,
    name: 'Ray of Rebuke',
    classId: 'lightbringer',
    classSlot: 'Branch',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 4.8,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 13,
    damage: 14,
    damageMultiplier: 1.1,
    range: 235,
    maxHits: 5,
    desc: 'Release a narrow radiant line. Generate a Lumen when it hits multiple enemies or a Halo Branded target.'
  },

  {
    ...SPELL_CHARGE,
    id: 'lightbringerPrismGuard',
    key: null,
    name: 'Prism Guard',
    classId: 'lightbringer',
    classSlot: 'Branch',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 8.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 16,
    damage: 0,
    range: 0,
    desc: 'Raise a short prism shield. The first absorbed hit grants one Lumen.'
  },

  {
    id: 'lightbringerDawncarver',
    key: null,
    name: 'Dawncarver',
    classId: 'lightbringer',
    classSlot: 'R',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 0,
    noChargeUpgrade: true,
    noUseCharges: true,
    channelProfile: {mode:'fixed',duration:3,movementMode:'slowed',movementMultiplier:.3,costPerSecond:18},
    costType: 'spirit',
    cost: 5,
    damage: 8,
    damageMultiplier: 0.82,
    range: 380,
    desc: 'Channel a 3-second steerable radiant beam with no cooldown. Drains Spirit while active; mastery reduces the cost. Available Lumens are consumed to increase width, reach, and damage.'
  },

  {
    ...SPELL_CHARGE,
    id: 'lightbringerSolarVerdict',
    key: null,
    name: 'Solar Verdict',
    classId: 'lightbringer',
    classSlot: 'Branch',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 8,
    requiresSpiritAwakened: true,
    cd: 10.5,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 22,
    damage: 18,
    damageMultiplier: 1.15,
    range: 190,
    desc: 'Spend all Lumens to call down a radiant verdict. More Lumens increase radius and damage.'
  },

  {
    ...SPELL_CHARGE,
    id: 'lightbringerHaloAegis',
    key: null,
    name: 'Halo Aegis',
    classId: 'lightbringer',
    classSlot: 'Branch',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 8,
    requiresSpiritAwakened: true,
    cd: 12.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 20,
    damage: 0,
    range: 145,
    desc: 'Spend all Lumens to shield yourself and nearby allies with a wingless halo barrier.'
  },

  {
    ...SPELL_CHARGE,
    id: 'lightbringerFirstSunrise',
    key: null,
    name: 'The First Sunrise',
    classId: 'lightbringer',
    classSlot: 'Signature',
    skill: 'spirit',
    tree: 'lightbringer',
    unlockLevel: 12,
    requiresSpiritAwakened: true,
    cd: 24.0,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 28,
    damage: 0,
    range: 0,
    desc: 'Signature: instantly fill Lumens and briefly empower Lumen generation and radiant spenders.'
  },

  {
    id: 'voidstepBurst',
    key: null,
    name: 'Voidstep Burst',
    classId: 'eldritch',
    classSlot: 'Q',
    skill: 'spirit',
    tree: 'eldritch',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 3.4,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 16,
    damage: 15,
    damageMultiplier: 1.28,
    range: 122,
    desc: 'Teleport forward and detonate in red-black lightning, damaging nearby enemies on arrival.'
  },

  {
    id: 'summonEldritchHorror',
    key: null,
    name: 'Summon Eldritch Horror',
    classId: 'eldritch',
    classSlot: 'R',
    skill: 'spirit',
    tree: 'eldritch',
    unlockLevel: 1,
    requiresSpiritAwakened: true,
    cd: 13.0,
    noChargeUpgrade: true,
    costType: 'spirit',
    cost: 24,
    damage: 0,
    range: 0,
    summonType: 'eldritchHorror',
    desc: 'Summons your full horror group at once. Press again to dismiss every survivor; the cooldown begins only when the group is gone.'
  },

  {
    ...SPELL_CHARGE,
    id: 'blackStarPulse',
    key: null,
    name: 'Black Star Pulse',
    classId: 'eldritch',
    classSlot: 'RT Branch',
    skill: 'spirit',
    tree: 'eldritch',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 5.8,
    costType: 'spirit',
    cost: 22,
    damage: 16,
    damageMultiplier: 1.15,
    range: 120,
    desc: 'Collapse a small star around you, slowing enemies and striking them with branching red-black lightning.'
  },

  {
    ...SPELL_CHARGE,
    id: 'redMawRift',
    key: null,
    name: 'Red Maw Rift',
    classId: 'eldritch',
    classSlot: 'X',
    skill: 'spirit',
    tree: 'eldritch',
    unlockLevel: 4,
    requiresSpiritAwakened: true,
    cd: 7.2,
    maxChargeCap: 2,
    costType: 'spirit',
    cost: 26,
    damage: 24,
    damageMultiplier: 1.55,
    range: 185,
    desc: 'Open a red-black rift at the aimed point, damaging and pulling clustered enemies.'
  },

  {
    id: 'guard',
    key: '2',
    name: 'Guard',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 1,
    cd: 0.5,
    costType: 'stamina',
    cost: 4,
    damage: 0,
    range: 0,
    desc: 'Brace yourself and reduce incoming damage briefly.'
  },

  {
    id: 'briarWard',
    key: null,
    name: 'Briar Ward',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 8,
    cd: 8.0,
    costType: 'stamina',
    cost: 14,
    damage: 0,
    range: 0,
    desc: 'Briefly reduces incoming damage.'
  },

  {
    id: 'ironOath',
    key: null,
    name: 'Iron Oath',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 20,
    cd: 16.0,
    costType: 'stamina',
    cost: 25,
    damage: 0,
    range: 0,
    desc: 'A stronger defensive oath that greatly reduces damage for a short time.'
  },

  {
    ...SPELL_CHARGE,
    id: 'hellfireBrand',
    key: null,
    name: 'Hellfire Brand',
    bloodline: 'cambion',
    classSlot: 'X',
    skill: 'spirit',
    tree: 'cambion',
    unlockLevel: 1,
    cd: 8.5,
    costType: 'stamina',
    cost: 18,
    damage: 24,
    damageMultiplier: 1.55,
    range: 170,
    desc: 'Detonate a red seal under the aimed enemy or ground. Strong AoE hellfire, but the Cambion path heals less from ordinary sources.'
  },

  {
    ...SPELL_CHARGE,
    id: 'seraphicAegis',
    key: null,
    name: 'Seraphic Aegis',
    bloodline: 'nephilim',
    classSlot: 'X',
    skill: 'warding',
    tree: 'nephilim',
    unlockLevel: 1,
    cd: 12.0,
    costType: 'stamina',
    cost: 20,
    damage: 13,
    damageMultiplier: 1.0,
    range: 96,
    desc: 'Raise an unowned halo: gain a short defensive ward and pulse holy damage around you.'
  },

  {
    ...MELEE_CHARGE,
    id: 'crimsonFeast',
    key: null,
    name: 'Crimson Feast',
    bloodline: 'vampire',
    classSlot: 'X',
    skill: 'blade',
    tree: 'vampire',
    unlockLevel: 1,
    cd: 7.5,
    costType: 'stamina',
    cost: 15,
    damage: 20,
    damageMultiplier: 1.4,
    range: 74,
    desc: 'A predatory blood strike that heavily heals from the damage dealt. Strong in duels, risky in prolonged fights.'
  }
];

for (const ability of ABILITIES) ability.progressionCategories = abilityProgressionCategories(ability);

export const ABILITY_ID_ALIASES = {
  heavyCut: 'oathkeeperOathStrike',
  radiantCleave: 'oathkeeperOathStrike',
  templarOathStrike: 'oathkeeperOathStrike',
  cleavingStep: 'oathkeeperDivineLeap',
  templarDivineLeap: 'oathkeeperDivineLeap',
  aegisBreaker: 'oathkeeperBastionBash',
  templarBastionBash: 'oathkeeperBastionBash',
  radiantSmite: 'oathkeeperJudgmentSmite',
  templarAoeSmite: 'oathkeeperJudgmentSmite',
  templarConsecratedGround: 'oathkeeperConsecratedGround',
  oathguard: 'oathkeeperBulwarkOfLight',
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
  mercenaryFlamingArrowVolley: 'fellhunterFlamingArrowVolley',
  mercenarySmokeBomb: 'fellhunterSmokeBomb',
  mercenaryMarkedShot: 'fellhunterMarkedShot',
  mercenaryKillZone: 'fellhunterKillZone',
  vineWhip: 'thornbinderThornLash',
  vineLash: 'thornbinderThornLash',
  thornLash: 'thornbinderThornLash',
  wildBloom: 'thornbinderLivingBriar',
  brambleSnare: 'thornbinderRootPrison',
  thornPatch: 'thornbinderBramblePatch',
  summonThornbeast: 'thornbinderSummonThornlings'
};

export function normalizeAbilityId(id) {
  if (!id) return id;
  const key = String(id).trim();
  return ABILITY_ID_ALIASES[key] || key;
}

function normalizeClassId(classId) {
  if (!classId) return classId;
  const key = String(classId).trim();
  if (key === 'templar') return 'oathkeeper';
  if (key === 'necromancer') return 'gravecaller';
  if (key === 'hydromancer') return 'waverider';
  if (key === 'mercenary') return 'fellhunter';
  return key;
}

export function getAbilityById(id) {
  const normalized = normalizeAbilityId(id);
  return ABILITIES.find(a => a.id === normalized) || null;
}

const SCROLL_SKILL_IDS = new Set(Object.values(ITEMS)
  .filter(item => item.type === 'scroll' && item.learnsAbility)
  .map(item => normalizeAbilityId(item.learnsAbility)));

export function getAbilitySkillRequirement(abilityOrId) {
  const ability = typeof abilityOrId === 'string' ? getAbilityById(abilityOrId) : abilityOrId;
  // Learning a class/tree skill is its unlock. Only scroll techniques retain
  // proficiency gates; old unlockLevel metadata also orders authored NPC kits.
  if (!ability || ability.classId || !SCROLL_SKILL_IDS.has(normalizeAbilityId(ability.id))) return 0;
  return Math.max(0, Math.floor(Number(ability.unlockLevel) || 0));
}

export function getAbilitiesForSkill(skillId) {
  return ABILITIES.filter(a => a.skill === skillId || a.tree === skillId);
}

export function getUnlockedAbilitiesForPlayer(player) {
  if (!player) return [];
  const known = new Set([...(player.knownAbilities || []), ...(player.unlockedAbilities || [])].map(normalizeAbilityId));

  return ABILITIES.filter(ability => {
    if (!known.has(ability.id)) return false;
    if (ability.bloodline) {
      return player.bloodline?.id === ability.bloodline && player.unlockedAbilities?.includes(ability.id);
    }

    if (ability.classId && normalizeClassId(player.classId) !== normalizeClassId(ability.classId)) {
      return false;
    }

    if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
      return false;
    }

    const requirement = getAbilitySkillRequirement(ability);
    return !requirement || (player.skillState?.skills?.[ability.skill]?.level || 1) >= requirement;
  });
}

// -----------------------------------------------------------------------------
// CRAFTING
// -----------------------------------------------------------------------------

export const RECIPES = {
  wardedChest: {
    id: 'wardedChest',
    title: 'Warded Chestpiece',
    skill: 'crafting',
    requiredLevel: 4,
    xp: 35,
    output: 'wardedChest',
    outputQty: 1,
    materials: [['ironOre', 3], ['boneShard', 2]]
  },

  roughLegwraps: {
    id: 'roughLegwraps',
    title: 'Rough Legwraps',
    skill: 'crafting',
    requiredLevel: 2,
    xp: 28,
    output: 'roughLegwraps',
    outputQty: 1,
    materials: [['riverReed', 2], ['boneShard', 1]]
  },

  thornCharm: {
    id: 'thornCharm',
    title: 'Thorn Charm',
    skill: 'crafting',
    requiredLevel: 3,
    xp: 35,
    output: 'thornCharm',
    outputQty: 1,
    materials: [['emberleaf', 2], ['gravecap', 2]]
  },

  cookedSunfish: {
    id: 'cookedSunfish',
    title: 'Cook Sunfish',
    skill: 'cooking',
    requiredLevel: 1,
    xp: 25,
    output: 'cookedSunfish',
    outputQty: 1,
    materials: [['rawSunfish', 1]]
  },

  fieldRationsPack: {
    id: 'fieldRationsPack',
    title: 'Prepare Field Rations',
    skill: 'cooking',
    requiredLevel: 2,
    xp: 28,
    output: 'fieldRations',
    outputQty: 4,
    materials: [['riverfish', 1], ['riverReed', 1]]
  },

  fishingTackleBundle: {
    id: 'fishingTackleBundle',
    title: 'Craft Fishing Tackle',
    skill: 'crafting',
    requiredLevel: 2,
    xp: 18,
    output: 'fishingTackle',
    outputQty: 3,
    materials: [['riverReed', 2], ['ironScrap', 1]]
  },

  fieldHandScythe: {
    id: 'fieldHandScythe',
    title: 'Forge Hand Scythe',
    skill: 'crafting',
    requiredLevel: 3,
    xp: 34,
    output: 'handScythe',
    outputQty: 1,
    materials: [['ironScrap', 3], ['riverReed', 1]]
  },

  ironPickaxeTool: {
    id: 'ironPickaxeTool',
    title: 'Forge Iron Pickaxe',
    skill: 'crafting',
    requiredLevel: 5,
    xp: 38,
    output: 'ironPickaxe',
    outputQty: 1,
    materials: [['ironScrap', 4], ['ironOre', 1]]
  },

  riverFishingRod: {
    id: 'riverFishingRod',
    title: 'Build Fishing Rod',
    skill: 'crafting',
    requiredLevel: 3,
    xp: 30,
    output: 'fishingRod',
    outputQty: 1,
    materials: [['riverReed', 4], ['ironScrap', 1]]
  },

  crudeFishingRod: {
    id: 'crudeFishingRod',
    title: 'Crude Fishing Rod',
    skill: 'crafting',
    requiredLevel: 1,
    xp: 20,
    output: 'crudeFishingRod',
    outputQty: 1,
    materials: [['echorynSoftwood', 2], ['riverReed', 2]]
  },

  ironhookRod: {
    id: 'ironhookRod',
    title: 'Ironhook Rod',
    skill: 'crafting',
    requiredLevel: 6,
    xp: 55,
    output: 'ironhookRod',
    outputQty: 1,
    materials: [['sturdyHardwood', 3], ['fishboneHook', 1], ['ironScrap', 2]]
  },

  tideglassRod: {
    id: 'tideglassRod',
    title: 'Tideglass Rod',
    skill: 'crafting',
    requiredLevel: 12,
    xp: 115,
    output: 'tideglassRod',
    outputQty: 1,
    materials: [['spiritwoodSplinter', 2], ['tideglassCrystal', 2], ['fishboneHook', 2], ['amberResin', 1]]
  },

  oldForagersKnife: {
    id: 'oldForagersKnife',
    title: 'Old Forager\'s Knife',
    skill: 'crafting',
    requiredLevel: 1,
    xp: 20,
    output: 'oldForagersKnife',
    outputQty: 1,
    materials: [['ironScrap', 1], ['echorynSoftwood', 1]]
  },

  ironSickle: {
    id: 'ironSickle',
    title: 'Iron Sickle',
    skill: 'crafting',
    requiredLevel: 6,
    xp: 55,
    output: 'ironSickle',
    outputQty: 1,
    materials: [['blackironOre', 2], ['sturdyHardwood', 2], ['amberResin', 1]]
  },

  echorynHerbalistKit: {
    id: 'echorynHerbalistKit',
    title: 'Echoryn Herbalist Kit',
    skill: 'crafting',
    requiredLevel: 12,
    xp: 115,
    output: 'echorynHerbalistKit',
    outputQty: 1,
    materials: [['ironSickle', 1], ['spiritFernDistillate', 1], ['thornsilkFiber', 2], ['amberResin', 2]]
  },

  crackedPickaxe: {
    id: 'crackedPickaxe',
    title: 'Cracked Pickaxe',
    skill: 'crafting',
    requiredLevel: 1,
    xp: 20,
    output: 'crackedPickaxe',
    outputQty: 1,
    materials: [['fieldstone', 2], ['echorynSoftwood', 1]]
  },

  deepstonePickaxe: {
    id: 'deepstonePickaxe',
    title: 'Deepstone Pickaxe',
    skill: 'crafting',
    requiredLevel: 13,
    xp: 125,
    output: 'deepstonePickaxe',
    outputQty: 1,
    materials: [['deepstone', 2], ['ironwoodCore', 2], ['oathsteelShard', 1], ['amberResin', 1]]
  },

  wornHatchet: {
    id: 'wornHatchet',
    title: 'Worn Hatchet',
    skill: 'crafting',
    requiredLevel: 1,
    xp: 20,
    output: 'wornHatchet',
    outputQty: 1,
    materials: [['ironScrap', 1], ['echorynSoftwood', 2]]
  },

  ironwoodAxe: {
    id: 'ironwoodAxe',
    title: 'Ironwood Axe',
    skill: 'crafting',
    requiredLevel: 7,
    xp: 65,
    output: 'ironwoodAxe',
    outputQty: 1,
    materials: [['ironwoodCore', 1], ['blackironOre', 2], ['amberResin', 1]]
  },

  briarsteelLoggingAxe: {
    id: 'briarsteelLoggingAxe',
    title: 'Briarsteel Logging Axe',
    skill: 'crafting',
    requiredLevel: 14,
    xp: 130,
    output: 'briarsteelLoggingAxe',
    outputQty: 1,
    materials: [['briarheartTimber', 1], ['oathsteelShard', 1], ['thornsilkFiber', 2], ['blackSap', 1]]
  },

  renderFishOil: {
    id: 'renderFishOil',
    title: 'Render Fish Oil',
    skill: 'cooking',
    requiredLevel: 2,
    xp: 24,
    output: 'fishOil',
    outputQty: 2,
    materials: [['silverfinMinnow', 2]]
  },

  carveFishboneHooks: {
    id: 'carveFishboneHooks',
    title: 'Carve Fishbone Hooks',
    skill: 'crafting',
    requiredLevel: 4,
    xp: 32,
    output: 'fishboneHook',
    outputQty: 2,
    materials: [['mudscaleCarp', 1], ['ironScrap', 1]]
  },

  moonpetalEssence: {
    id: 'moonpetalEssence',
    title: 'Extract Moonpetal Essence',
    skill: 'runecraft',
    requiredLevel: 8,
    xp: 70,
    output: 'moonpetalEssence',
    outputQty: 1,
    materials: [['moonpetal', 2], ['fishOil', 1]]
  },

  bloodmossExtract: {
    id: 'bloodmossExtract',
    title: 'Extract Bloodmoss',
    skill: 'cooking',
    requiredLevel: 7,
    xp: 58,
    output: 'bloodmossExtract',
    outputQty: 1,
    materials: [['bloodmoss', 2], ['bitterroot', 1]]
  },

  thornsilkFiber: {
    id: 'thornsilkFiber',
    title: 'Prepare Thornsilk Fiber',
    skill: 'crafting',
    requiredLevel: 8,
    xp: 70,
    output: 'thornsilkFiber',
    outputQty: 1,
    materials: [['thornsilkVine', 2], ['amberResin', 1]]
  },

  spiritFernDistillate: {
    id: 'spiritFernDistillate',
    title: 'Distill Spirit Fern',
    skill: 'runecraft',
    requiredLevel: 11,
    xp: 95,
    output: 'spiritFernDistillate',
    outputQty: 1,
    materials: [['spiritFern', 2], ['lumenQuartz', 1]]
  },

  riverperchSkewer: {
    id: 'riverperchSkewer',
    title: 'Riverperch Skewer',
    skill: 'cooking',
    requiredLevel: 2,
    xp: 26,
    output: 'riverperchSkewer',
    outputQty: 1,
    materials: [['echorynRiverperch', 1], ['orrakaiMint', 1]]
  },

  herbalFishStew: {
    id: 'herbalFishStew',
    title: 'Herbal Fish Stew',
    skill: 'cooking',
    requiredLevel: 5,
    xp: 48,
    output: 'herbalFishStew',
    outputQty: 1,
    materials: [['riverfish', 1], ['echorynGreenleaf', 1], ['bitterroot', 1]]
  },

  moonfinBroth: {
    id: 'moonfinBroth',
    title: 'Moonfin Broth',
    skill: 'cooking',
    requiredLevel: 9,
    xp: 82,
    output: 'moonfinBroth',
    outputQty: 1,
    materials: [['moonfinTrout', 1], ['moonpetalEssence', 1], ['orrakaiMint', 1]]
  },

  ashbellyRoast: {
    id: 'ashbellyRoast',
    title: 'Ashbelly Roast',
    skill: 'cooking',
    requiredLevel: 9,
    xp: 82,
    output: 'ashbellyRoast',
    outputQty: 1,
    materials: [['ashbellyPike', 1], ['ashrose', 1], ['amberResin', 1]]
  },

  gravewaterEelSoup: {
    id: 'gravewaterEelSoup',
    title: 'Gravewater Eel Soup',
    skill: 'cooking',
    requiredLevel: 12,
    xp: 110,
    output: 'gravewaterEelSoup',
    outputQty: 1,
    materials: [['gravewaterEel', 1], ['spiritFernDistillate', 1], ['gravecap', 2]]
  },

  kingfinFeast: {
    id: 'kingfinFeast',
    title: 'Kingfin Feast',
    skill: 'cooking',
    requiredLevel: 16,
    xp: 240,
    output: 'kingfinFeast',
    outputQty: 1,
    materials: [['paleKingfin', 1], ['dawnsage', 2], ['moonpetalEssence', 1], ['spiritFernDistillate', 1], ['amberResin', 1]]
  },

  spiritDraught: {
    id: 'spiritDraught',
    title: 'Spirit Draught',
    skill: 'runecraft',
    requiredLevel: 9,
    xp: 78,
    output: 'spiritDraught',
    outputQty: 1,
    materials: [['spiritFernDistillate', 1], ['lumenQuartz', 1], ['fishOil', 1]]
  },

  moonpetalElixir: {
    id: 'moonpetalElixir',
    title: 'Moonpetal Elixir',
    skill: 'runecraft',
    requiredLevel: 8,
    xp: 72,
    output: 'moonpetalElixir',
    outputQty: 1,
    materials: [['moonpetalEssence', 1], ['lanternGill', 1], ['dawnsage', 1]]
  },

  bloodmossFortifier: {
    id: 'bloodmossFortifier',
    title: 'Bloodmoss Fortifier',
    skill: 'cooking',
    requiredLevel: 8,
    xp: 72,
    output: 'bloodmossFortifier',
    outputQty: 1,
    materials: [['bloodmossExtract', 1], ['bitterroot', 2], ['fieldRations', 1]]
  },

  thornskinDraught: {
    id: 'thornskinDraught',
    title: 'Thornskin Draught',
    skill: 'runecraft',
    requiredLevel: 12,
    xp: 105,
    output: 'thornskinDraught',
    outputQty: 1,
    materials: [['thornsilkFiber', 1], ['amberResin', 2], ['thornstone', 1]]
  },

  tideglassClarityPotion: {
    id: 'tideglassClarityPotion',
    title: 'Tideglass Clarity Potion',
    skill: 'runecraft',
    requiredLevel: 12,
    xp: 105,
    output: 'tideglassClarityPotion',
    outputQty: 1,
    materials: [['tideglassCrystal', 1], ['tideglassKoi', 1], ['fishOil', 1]]
  },

  silverfinSkewer: {
    id: 'silverfinSkewer',
    title: 'Silverfin Skewer',
    skill: 'cooking',
    requiredLevel: 5,
    xp: 45,
    output: 'silverfinSkewer',
    outputQty: 1,
    materials: [['silverfin', 1], ['riverReed', 1]]
  },

  bitterStew: {
    id: 'bitterStew',
    title: 'Bitter Stew',
    skill: 'cooking',
    requiredLevel: 3,
    xp: 28,
    output: 'bitterStew',
    outputQty: 1,
    materials: [['emberleaf', 1], ['riverReed', 1]]
  },

  ashFruitStew: {
    id: 'ashFruitStew',
    title: 'Ash Fruit Stew',
    skill: 'cooking',
    requiredLevel: 8,
    xp: 65,
    output: 'ashFruitStew',
    outputQty: 1,
    materials: [['ashFruit', 1], ['gravecap', 1], ['riverReed', 1]]
  },

  paleRune: {
    id: 'paleRune',
    title: 'Pale Rune',
    skill: 'runecraft',
    requiredLevel: 4,
    xp: 40,
    output: 'paleRune',
    outputQty: 1,
    materials: [['paleEssence', 2], ['boneShard', 1]]
  },

  lightstormWard: {
    id: 'lightstormWard',
    title: 'Lightstorm Ward',
    skill: 'runecraft',
    requiredLevel: 12,
    xp: 85,
    output: 'lightstormWard',
    outputQty: 1,
    materials: [['paleRune', 1], ['lanternMoss', 3], ['arcaneDust', 2]]
  },

  blackIronSword: {
    id: 'blackIronSword',
    title: 'Black Iron Sword',
    skill: 'crafting',
    requiredLevel: 8,
    xp: 60,
    output: 'blackIronSword',
    outputQty: 1,
    materials: [['ironOre', 5], ['boneShard', 1]]
  },

  ashwoodBow: {
    id: 'ashwoodBow',
    title: 'Ashwood Bow',
    skill: 'crafting',
    requiredLevel: 7,
    xp: 55,
    output: 'ashwoodBow',
    outputQty: 1,
    materials: [['riverReed', 4], ['wolfFang', 1]]
  },

  thornwoodBow: {
    id: 'thornwoodBow',
    title: 'Thornwood Bow',
    skill: 'crafting',
    requiredLevel: 13,
    xp: 115,
    output: 'thornwoodBow',
    outputQty: 1,
    materials: [['thornwoodBranch', 4], ['thornsilkFiber', 2], ['moonpetalEssence', 1]]
  },

  oathsteelMace: {
    id: 'oathsteelMace',
    title: 'Oathsteel Mace',
    skill: 'crafting',
    requiredLevel: 13,
    xp: 115,
    output: 'oathsteelMace',
    outputQty: 1,
    materials: [['oathsteelShard', 2], ['sturdyHardwood', 2], ['lumenQuartz', 1]]
  },

  graveSilverScythe: {
    id: 'graveSilverScythe',
    title: 'Grave-Silver Scythe',
    skill: 'runecraft',
    requiredLevel: 14,
    xp: 130,
    output: 'graveSilverScythe',
    outputQty: 1,
    materials: [['graveSilver', 2], ['gravewoodRoot', 2], ['spiritFernDistillate', 1]]
  },

  spiritwoodFocus: {
    id: 'spiritwoodFocus',
    title: 'Spiritwood Focus',
    skill: 'runecraft',
    requiredLevel: 13,
    xp: 120,
    output: 'spiritwoodFocus',
    outputQty: 1,
    materials: [['spiritwoodSplinter', 2], ['lumenQuartz', 2], ['moonpetalEssence', 1]]
  },

  ironwoodShield: {
    id: 'ironwoodShield',
    title: 'Ironwood Shield',
    skill: 'crafting',
    requiredLevel: 11,
    xp: 95,
    output: 'ironwoodShield',
    outputQty: 1,
    materials: [['ironwoodCore', 2], ['amberResin', 2], ['blackironOre', 1]]
  },

  shrineTonic: {
    id: 'shrineTonic',
    title: 'Shrine Tonic',
    skill: 'cooking',
    requiredLevel: 6,
    xp: 45,
    output: 'shrineTonic',
    outputQty: 1,
    materials: [['gravecap', 2], ['paleEssence', 1]]
  },

  lanternTonic: {
    id: 'lanternTonic',
    title: 'Lantern Tonic',
    skill: 'cooking',
    requiredLevel: 10,
    xp: 70,
    output: 'lanternTonic',
    outputQty: 1,
    materials: [['lanternMoss', 2], ['paleEssence', 1], ['silverfin', 1]]
  },

  rootStaff: {
    id: 'rootStaff',
    title: 'Root Staff',
    skill: 'crafting',
    requiredLevel: 5,
    xp: 40,
    output: 'rootStaff',
    outputQty: 1,
    materials: [['riverReed', 3], ['emberleaf', 1]]
  },

  briarStaff: {
    id: 'briarStaff',
    title: 'Briar Staff',
    skill: 'crafting',
    requiredLevel: 10,
    xp: 70,
    output: 'briarStaff',
    outputQty: 1,
    materials: [['riverReed', 5], ['gravecap', 2], ['wolfFang', 1]]
  },

  heartrootStaff: {
    id: 'heartrootStaff',
    title: 'Heartroot Staff',
    skill: 'crafting',
    requiredLevel: 18,
    xp: 110,
    output: 'heartrootStaff',
    outputQty: 1,
    materials: [['mirrorBark', 2], ['riverReed', 5], ['paleEssence', 2]]
  },

  bonehookScythe: {
    id: 'bonehookScythe',
    title: 'Bonehook Scythe',
    skill: 'crafting',
    requiredLevel: 10,
    xp: 75,
    output: 'bonehookScythe',
    outputQty: 1,
    materials: [['boneShard', 5], ['paleEssence', 2], ['ironOre', 2]]
  },

  graveScythe: {
    id: 'graveScythe',
    title: 'Grave Scythe',
    skill: 'runecraft',
    requiredLevel: 16,
    xp: 105,
    output: 'graveScythe',
    outputQty: 1,
    materials: [['boneShard', 4], ['paleEssence', 4], ['gravecap', 3]]
  },

  knightHelm: {
    id: 'knightHelm',
    title: 'Knight Helm',
    skill: 'crafting',
    requiredLevel: 10,
    xp: 50,
    output: 'knightHelm',
    outputQty: 1,
    materials: [['ironOre', 4], ['knightPlate', 1]]
  },

  knightChest: {
    id: 'knightChest',
    title: 'Knight Chestplate',
    skill: 'crafting',
    requiredLevel: 14,
    xp: 80,
    output: 'knightChest',
    outputQty: 1,
    materials: [['ironOre', 6], ['knightPlate', 2]]
  },

  necromancerHood: {
    id: 'necromancerHood',
    title: 'Gravecaller Hood',
    skill: 'runecraft',
    requiredLevel: 10,
    xp: 55,
    output: 'necromancerHood',
    outputQty: 1,
    materials: [['gravecap', 2], ['paleEssence', 2]]
  },

  necromancerRobe: {
    id: 'necromancerRobe',
    title: 'Gravecaller Robe',
    skill: 'runecraft',
    requiredLevel: 14,
    xp: 85,
    output: 'necromancerRobe',
    outputQty: 1,
    materials: [['gravecap', 4], ['paleEssence', 3], ['riverReed', 2]]
  },

  thornbinderGarb: {
    id: 'thornbinderGarb',
    title: 'Thornbinder Garb',
    skill: 'crafting',
    requiredLevel: 12,
    xp: 70,
    output: 'thornbinderGarb',
    outputQty: 1,
    materials: [['riverReed', 5], ['emberleaf', 3], ['gravecap', 1]]
  },

  cultistMantle: {
    id: 'cultistMantle',
    title: 'Last Dawn Mantle',
    skill: 'runecraft',
    requiredLevel: 18,
    xp: 100,
    output: 'cultistMantle',
    outputQty: 1,
    materials: [['cultAsh', 4], ['paleEssence', 3], ['redSealFragment', 1]]
  },

  watcherGlassCharm: {
    id: 'watcherGlassCharm',
    title: 'Watcher Glass Charm',
    skill: 'runecraft',
    requiredLevel: 22,
    xp: 120,
    output: 'watcherGlassCharm',
    outputQty: 1,
    materials: [['watcherGlass', 1], ['paleEssence', 3], ['crackedRelic', 2]]
  }
};

export function getRecipeById(id) {
  return RECIPES[id] || null;
}

export function getAllRecipes() {
  return Object.values(RECIPES);
}

// -----------------------------------------------------------------------------
// ENEMY LOOT TABLES
// -----------------------------------------------------------------------------

export const ENEMY_LOOT_TABLES = {
  basicBeast: [
    { item: 'wolfFang', chance: 0.28, min: 1, max: 1 },
    { item: 'boneShard', chance: 0.3, min: 1, max: 2 },
    { item: 'leatherVest', chance: 0.035, min: 1, max: 1 }
  ],

  stalkerWolf: [
    { item: 'wolfFang', chance: 0.42, min: 1, max: 2 },
    { item: 'boneShard', chance: 0.32, min: 1, max: 2 },
    { item: 'hunterBow', chance: 0.035, min: 1, max: 1 },
    { item: 'mirrorBark', chance: 0.04, min: 1, max: 1 }
  ],

  shieldKnight: [
    { item: 'ironScrap', chance: 0.5, min: 1, max: 2 },
    { item: 'knightPlate', chance: 0.32, min: 1, max: 1 },
    { item: 'crackedIronCap', chance: 0.075, min: 1, max: 1 },
    { item: 'graveboundHelm', chance: 0.025, min: 1, max: 1 }
  ],

  archer: [
    { item: 'ashCoin', chance: 0.48, min: 2, max: 8 },
    { item: 'banditToken', chance: 0.36, min: 1, max: 2 },
    { item: 'hunterBow', chance: 0.055, min: 1, max: 1 },
    { item: 'roadlessLongbow', chance: 0.018, min: 1, max: 1 }
  ],

  cultist: [
    { item: 'cultAsh', chance: 0.46, min: 1, max: 2 },
    { item: 'paleEssence', chance: 0.32, min: 1, max: 2 },
    { item: 'redSealFragment', chance: 0.075, min: 1, max: 1 },
    { item: 'cultistMantle', chance: 0.02, min: 1, max: 1 }
  ],

  gravePriest: [
    { item: 'paleEssence', chance: 0.42, min: 1, max: 2 },
    { item: 'graveAsh', chance: 0.32, min: 1, max: 2 },
    { item: 'arcaneDust', chance: 0.12, min: 1, max: 1 },
    { item: 'shrineTonic', chance: 0.04, min: 1, max: 1 },
    { item: 'moonlitReliquary', chance: 0.014, min: 1, max: 1 }
  ],

  brute: [
    { item: 'ironScrap', chance: 0.55, min: 1, max: 3 },
    { item: 'knightPlate', chance: 0.3, min: 1, max: 2 },
    { item: 'bossCore', chance: 0.025, min: 1, max: 1 },
    { item: 'graveboundChest', chance: 0.018, min: 1, max: 1 }
  ],

  wraith: [
    { item: 'paleEssence', chance: 0.46, min: 1, max: 3 },
    { item: 'veyrSigil', chance: 0.24, min: 1, max: 1 },
    { item: 'crackedRelic', chance: 0.16, min: 1, max: 2 },
    { item: 'veyrRapier', chance: 0.015, min: 1, max: 1 },
    { item: 'moonlitReliquary', chance: 0.01, min: 1, max: 1 }
  ],

  exploder: [
    { item: 'arcaneDust', chance: 0.34, min: 1, max: 2 },
    { item: 'boneShard', chance: 0.28, min: 1, max: 2 },
    { item: 'cultAsh', chance: 0.16, min: 1, max: 1 }
  ],

  hollowling: [
    { item: 'paleEssence', chance: 0.32, min: 1, max: 1 },
    { item: 'hollowEye', chance: 0.18, min: 1, max: 1 },
    { item: 'gravecap', chance: 0.12, min: 1, max: 1 },
    { item: 'pilgrimsFocus', chance: 0.012, min: 1, max: 1 },
    { item: 'bonehookScythe', chance: 0.025, min: 1, max: 1 },
    { item: 'crackedRelic', chance: 0.04, min: 1, max: 1 },
    { item: 'ashFruit', chance: 0.06, min: 1, max: 1 }
  ],

  ashWolf: [
    { item: 'wolfFang', chance: 0.35, min: 1, max: 1 },
    { item: 'boneShard', chance: 0.28, min: 1, max: 2 },
    { item: 'leatherVest', chance: 0.05, min: 1, max: 1 },
    { item: 'hunterBow', chance: 0.04, min: 1, max: 1 },
    { item: 'briarStaff', chance: 0.02, min: 1, max: 1 },
    { item: 'mirrorBark', chance: 0.035, min: 1, max: 1 }
  ],

  gravebound: [
    { item: 'boneShard', chance: 0.45, min: 1, max: 2 },
    { item: 'paleEssence', chance: 0.35, min: 1, max: 2 },
    { item: 'knightPlate', chance: 0.28, min: 1, max: 1 },
    { item: 'crackedIronCap', chance: 0.08, min: 1, max: 1 },
    { item: 'graveboundHelm', chance: 0.04, min: 1, max: 1 },
    { item: 'graveboundChest', chance: 0.025, min: 1, max: 1 },
    { item: 'graveboundGreaves', chance: 0.025, min: 1, max: 1 },
    { item: 'graveKnife', chance: 0.02, min: 1, max: 1 },
    { item: 'graveScythe', chance: 0.018, min: 1, max: 1 },
    { item: 'unburiedCrescent', chance: 0.006, min: 1, max: 1 }
  ],

  roadlessBandit: [
    { item: 'ashCoin', chance: 0.55, min: 3, max: 12 },
    { item: 'banditToken', chance: 0.45, min: 1, max: 2 },
    { item: 'fieldRations', chance: 0.22, min: 1, max: 1 },
    { item: 'hunterBow', chance: 0.055, min: 1, max: 1 },
    { item: 'roadlessLongbow', chance: 0.018, min: 1, max: 1 },
    { item: 'rogueLeathers', chance: 0.035, min: 1, max: 1 },
    { item: 'graveKnife', chance: 0.012, min: 1, max: 1 }
  ],

  demonCultist: [
    { item: 'cultAsh', chance: 0.48, min: 1, max: 2 },
    { item: 'paleEssence', chance: 0.35, min: 1, max: 2 },
    { item: 'redSealFragment', chance: 0.08, min: 1, max: 1 },
    { item: 'sealglassPrism', chance: 0.016, min: 1, max: 1 },
    { item: 'cultistMantle', chance: 0.025, min: 1, max: 1 },
    { item: 'redSealRing', chance: 0.012, min: 1, max: 1 },
    { item: 'redSealConductor', chance: 0.006, min: 1, max: 1 },
    { item: 'redSealScythe', chance: 0.004, min: 1, max: 1 }
  ],

  veyrWraith: [
    { item: 'paleEssence', chance: 0.42, min: 1, max: 3 },
    { item: 'veyrSigil', chance: 0.28, min: 1, max: 1 },
    { item: 'crackedRelic', chance: 0.18, min: 1, max: 2 },
    { item: 'veyrRapier', chance: 0.018, min: 1, max: 1 },
    { item: 'veyrGraveLens', chance: 0.012, min: 1, max: 1 },
    { item: 'veyrCourtCoat', chance: 0.022, min: 1, max: 1 },
    { item: 'watcherGlass', chance: 0.05, min: 1, max: 1 },
    { item: 'watcherHood', chance: 0.01, min: 1, max: 1 },
    { item: 'watcherGreaves', chance: 0.01, min: 1, max: 1 }
  ]
};

const KIND_LOOT_FAMILIES = Object.freeze({
  basicBeast: ['beast', 'hollow'],
  hollowling: ['hollow', 'beast'],
  stalkerWolf: ['beast', 'thorn'],
  ashWolf: ['beast', 'thorn'],
  shieldKnight: ['armoured'],
  gravebound: ['armoured', 'grave'],
  archer: ['bandit', 'ranged'],
  roadlessBandit: ['bandit', 'ranged'],
  cultist: ['cult'],
  demonCultist: ['cult', 'demon'],
  gravePriest: ['spirit', 'grave'],
  brute: ['armoured'],
  wraith: ['spirit'],
  veyrWraith: ['spirit', 'veyr'],
  exploder: ['cult']
});

const LOOT_FAMILY_TABLES = Object.freeze({
  frontier: [
    { item: 'ashCoin', chance: 0.18, min: 1, max: 6 },
    { item: 'fieldRations', chance: 0.08, min: 1, max: 1 },
    { item: 'ironScrap', chance: 0.11, min: 1, max: 1 },
    { item: 'patchedRoadLeathers', chance: 0.012, min: 1, max: 1 },
    { item: 'scavengedIronHelm', chance: 0.012, min: 1, max: 1 }
  ],

  beast: [
    { item: 'tornHide', chance: 0.42, min: 1, max: 2 },
    { item: 'wildSinew', chance: 0.18, min: 1, max: 1 },
    { item: 'wolfFang', chance: 0.22, min: 1, max: 1 },
    { item: 'leatherVest', chance: 0.025, min: 1, max: 1 }
  ],

  hollow: [
    { item: 'hollowEye', chance: 0.2, min: 1, max: 1 },
    { item: 'boneShard', chance: 0.24, min: 1, max: 2 },
    { item: 'gravecap', chance: 0.1, min: 1, max: 1 },
    { item: 'burialCloth', chance: 0.14, min: 1, max: 1 },
    { item: 'graveclothGreaves', chance: 0.012, min: 1, max: 1 }
  ],

  armoured: [
    { item: 'ironScrap', chance: 0.34, min: 1, max: 2 },
    { item: 'knightPlate', chance: 0.18, min: 1, max: 1 },
    { item: 'scavengedIronHelm', chance: 0.035, min: 1, max: 1 },
    { item: 'pilgrimsIronblade', chance: 0.018, min: 1, max: 1 },
    { item: 'oathboundBulwark', chance: 0.008, min: 1, max: 1 }
  ],

  bandit: [
    { item: 'ashCoin', chance: 0.44, min: 2, max: 10 },
    { item: 'banditToken', chance: 0.24, min: 1, max: 2 },
    { item: 'stolenPurse', chance: 0.16, min: 1, max: 1 },
    { item: 'fieldRations', chance: 0.16, min: 1, max: 1 },
    { item: 'brigandMask', chance: 0.025, min: 1, max: 1 },
    { item: 'ashRunnerDaggers', chance: 0.009, min: 1, max: 1 }
  ],

  ranged: [
    { item: 'hunterBow', chance: 0.035, min: 1, max: 1 },
    { item: 'ashwoodBow', chance: 0.018, min: 1, max: 1 },
    { item: 'roadlessLongbow', chance: 0.008, min: 1, max: 1 },
    { item: 'wildSinew', chance: 0.16, min: 1, max: 1 }
  ],

  cult: [
    { item: 'cultAsh', chance: 0.36, min: 1, max: 2 },
    { item: 'shadowResidue', chance: 0.12, min: 1, max: 1 },
    { item: 'arcaneDust', chance: 0.1, min: 1, max: 1 },
    { item: 'sealglassPrism', chance: 0.009, min: 1, max: 1 },
    { item: 'cultistMantle', chance: 0.014, min: 1, max: 1 }
  ],

  demon: [
    { item: 'redSealFragment', chance: 0.08, min: 1, max: 1, eliteBonus: 0.06 },
    { item: 'redGlassIchor', chance: 0.055, min: 1, max: 1, eliteBonus: 0.05 },
    { item: 'redSealRing', chance: 0.008, min: 1, max: 1 },
    { item: 'redSealConductor', chance: 0.004, min: 1, max: 1 }
  ],

  spirit: [
    { item: 'paleEssence', chance: 0.3, min: 1, max: 2 },
    { item: 'graveAsh', chance: 0.2, min: 1, max: 1 },
    { item: 'burialCloth', chance: 0.13, min: 1, max: 1 },
    { item: 'paleRune', chance: 0.014, min: 1, max: 1 },
    { item: 'moonlitReliquary', chance: 0.006, min: 1, max: 1 }
  ],

  grave: [
    { item: 'boneShard', chance: 0.28, min: 1, max: 2 },
    { item: 'graveAsh', chance: 0.24, min: 1, max: 2 },
    { item: 'graveclothGreaves', chance: 0.022, min: 1, max: 1 },
    { item: 'graveScythe', chance: 0.01, min: 1, max: 1 },
    { item: 'dungeonRelicShard', chance: 0.018, min: 1, max: 1, eliteBonus: 0.03 }
  ],

  veyr: [
    { item: 'veyrSigil', chance: 0.16, min: 1, max: 1 },
    { item: 'veyrglassShard', chance: 0.1, min: 1, max: 1 },
    { item: 'watcherGlass', chance: 0.04, min: 1, max: 1 },
    { item: 'veyrSilkMantle', chance: 0.015, min: 1, max: 1 },
    { item: 'veyrRapier', chance: 0.008, min: 1, max: 1 }
  ],

  thorn: [
    { item: 'briarRoot', chance: 0.22, min: 1, max: 2 },
    { item: 'livingBark', chance: 0.08, min: 1, max: 1 },
    { item: 'thornSeed', chance: 0.055, min: 1, max: 1 },
    { item: 'thornCharm', chance: 0.018, min: 1, max: 1 },
    { item: 'thornhookStaff', chance: 0.012, min: 1, max: 1 }
  ],

  holy: [
    { item: 'radiantSplinter', chance: 0.14, min: 1, max: 1 },
    { item: 'lanternMoss', chance: 0.18, min: 1, max: 1 },
    { item: 'watcherGlass', chance: 0.045, min: 1, max: 1 },
    { item: 'dawncarverLens', chance: 0.012, min: 1, max: 1 },
    { item: 'everdawnCarver', chance: 0.0015, min: 1, max: 1, bossBonus: 0.012 }
  ],

  water: [
    { item: 'waterglassDrop', chance: 0.12, min: 1, max: 1 },
    { item: 'riverReed', chance: 0.18, min: 1, max: 2 },
    { item: 'tideglassCutlass', chance: 0.01, min: 1, max: 1 },
    { item: 'waterSaintCharm', chance: 0.01, min: 1, max: 1 },
    { item: 'tideglassHeart', chance: 0.0015, min: 1, max: 1, bossBonus: 0.01 }
  ],

  dungeon: [
    { item: 'ashCoin', chance: 0.28, min: 3, max: 14 },
    { item: 'crackedRelic', chance: 0.12, min: 1, max: 1 },
    { item: 'dungeonRelicShard', chance: 0.07, min: 1, max: 1 },
    { item: 'arcaneDust', chance: 0.12, min: 1, max: 1 },
    { item: 'shrineTonic', chance: 0.025, min: 1, max: 1 }
  ]
});

const LOOT_TIER_TABLES = Object.freeze({
  elite: [
    { item: 'ashCoin', chance: 0.55, min: 5, max: 18 },
    { item: 'crackedRelic', chance: 0.14, min: 1, max: 1 },
    { item: 'dungeonRelicShard', chance: 0.06, min: 1, max: 1 },
    { item: 'bossCore', chance: 0.018, min: 1, max: 1 }
  ],

  boss: [
    { item: 'ashCoin', chance: 0.95, min: 14, max: 36 },
    { item: 'bossCore', chance: 0.72, min: 1, max: 1 },
    { item: 'dungeonRelicShard', chance: 0.32, min: 1, max: 2 },
    { item: 'crackedRelic', chance: 0.28, min: 1, max: 2 },
    { item: 'redGlassIchor', chance: 0.1, min: 1, max: 1 },
    { item: 'orrakaiFoundersSignet', chance: 0.01, min: 1, max: 1 }
  ]
});

const LOOT_RARITY_PRIORITY = Object.freeze({
  ancient: 9,
  mythic: 8,
  legendary: 7,
  relic: 6,
  epic: 5,
  occult: 4,
  rare: 3,
  uncommon: 2,
  common: 1
});

export const ENEMY_ITEM_DROP_RATE_SCALAR = 0.4;

export function rollEnemyLoot(enemyOrKind, context = {}) {
  const enemy = enemyOrKind && typeof enemyOrKind === 'object' ? enemyOrKind : null;
  const enemyKind = normalizeLootKey(enemy?.kind || enemy?.type || enemy?.archetype || enemyOrKind);
  const rng=context.rng||Math.random;
  const tables = getLootTablesForEnemy(enemy, enemyKind, context);
  const drops = [];

  for (const table of tables) {
    for (const entry of table) {
      if (!entry?.item || !ITEMS[entry.item]) continue;
      if(enemy?.encounterStatsVersion&&enemy.combatLevel<20&&['legendary','mythic','ancient'].includes(ITEMS[entry.item].rarity)&&!entry.guaranteed)continue;

      if (rng() <= getLootChance(entry, enemy)) {
        addRolledDrop(drops, {
          item: entry.item,
          qty: Math.floor(entry.min+rng()*(entry.max-entry.min+1)),
          guaranteed: entry.guaranteed
        });
      }
    }
  }

  const trimmed=trimLootDrops(drops,enemy),gear=trimmed.filter(d=>['weapon','armour','trinket'].includes(ITEMS[d.item]?.type));
  const best=gear.sort((a,b)=>(LOOT_RARITY_PRIORITY[ITEMS[b.item]?.rarity]||0)-(LOOT_RARITY_PRIORITY[ITEMS[a.item]?.rarity]||0))[0];
  return trimmed.filter(d=>!['weapon','armour','trinket'].includes(ITEMS[d.item]?.type)||d===best).map(d=>['weapon','armour','trinket'].includes(ITEMS[d.item]?.type)?{...d,qty:1,upgradeTier:1}:d);
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function normalizeLootKey(value) {
  return String(value || '').trim();
}

function getLootTablesForEnemy(enemy, enemyKind, context) {
  const tables = [];
  const exact = ENEMY_LOOT_TABLES[enemyKind];

  if (exact) tables.push(exact);

  for (const family of getLootFamilies(enemy, enemyKind, context)) {
    const table = LOOT_FAMILY_TABLES[family];
    if (table) tables.push(table);
  }

  if (isEliteLootEnemy(enemy)) {
    tables.push(LOOT_TIER_TABLES.elite);
  }

  if (isBossLootEnemy(enemy)) {
    tables.push(LOOT_TIER_TABLES.boss);
  }

  if (!tables.length) tables.push(LOOT_FAMILY_TABLES.frontier);
  return tables.filter(Boolean);
}

function getLootFamilies(enemy, enemyKind, context) {
  const families = [];
  const add = family => {
    if (family && !families.includes(family)) families.push(family);
  };

  add('frontier');
  (KIND_LOOT_FAMILIES[enemyKind] || []).forEach(add);

  const text = [
    enemyKind,
    enemy?.archetype,
    enemy?.name,
    enemy?.bossName,
    enemy?.bossType,
    enemy?.poiLootProfile,
    enemy?.majorPoiId,
    context?.world?.dungeonId || context?.dungeonId,
    context?.world?.poiId || context?.poiId,
    context?.world?.theme || context?.theme
  ].filter(Boolean).join(' ').toLowerCase();

  if (/wolf|beast|elk|hide|stalker/.test(text)) add('beast');
  if (/hollow|eye/.test(text)) add('hollow');
  if (/knight|shield|warden|plate|armou?r|brute|guard/.test(text)) add('armoured');
  if (/bandit|roadless|archer|bow|cutthroat|robber/.test(text)) {
    add('bandit');
    add('ranged');
  }
  if (/cult|seal|demon|ember veil|malakar|solgate/.test(text)) add('cult');
  if (/demon|red seal|solgate|malakar/.test(text)) add('demon');
  if (/grave|wraith|spirit|ghost|crypt|dead|burial/.test(text)) {
    add('spirit');
    add('grave');
  }
  if (/veyr|castle|noble|court/.test(text)) add('veyr');
  if (/thorn|briar|root|grove|forest/.test(text)) add('thorn');
  if (/holy|light|dawn|seraphel|radiant|chapel|reliquary/.test(text)) add('holy');
  if (/water|river|tide|waverider|marsh/.test(text)) add('water');
  if (context?.world?.dungeonState || context?.dungeonState || /dungeon|floor|vault|crypt|keep|tower/.test(text)) add('dungeon');

  return families;
}

function getLootChance(entry, enemy) {
  let chance = Math.max(0, Number(entry.chance || 0));

  if (isEliteLootEnemy(enemy)) {
    chance += Math.max(0, Number(entry.eliteBonus || 0));
  }

  if (isBossLootEnemy(enemy)) {
    chance += Math.max(0, Number(entry.bossBonus || 0));
  }

  if (!entry.guaranteed) {
    chance *= ENEMY_ITEM_DROP_RATE_SCALAR * ({rare:1.35,champion:1.6}[enemy?.encounterTier]||1);
  }

  if(['weapon','armour','trinket'].includes(ITEMS[entry.item]?.type)){
    chance*=isBossLootEnemy(enemy)?.35:isEliteLootEnemy(enemy)?.2:.08;
    if(['legendary','mythic','ancient'].includes(ITEMS[entry.item].rarity))chance*=.04;
  }
  return Math.min(1, chance);
}

function addRolledDrop(drops, drop) {
  const item = ITEMS[drop.item];
  const qty = Math.max(1, Number(drop.qty || 1));

  if (item?.stack) {
    const existing = drops.find(entry => entry.item === drop.item);
    if (existing) {
      existing.qty += qty;
      existing.guaranteed = existing.guaranteed || drop.guaranteed;
      return;
    }
  }

  drops.push({
    item: drop.item,
    qty,
    guaranteed: Boolean(drop.guaranteed)
  });
}

function trimLootDrops(drops, enemy) {
  const maxDrops = isBossLootEnemy(enemy) ? 8 : isEliteLootEnemy(enemy) ? 5 : 4;
  if (drops.length <= maxDrops) return drops.map(({ item, qty }) => ({ item, qty }));

  return drops
    .slice()
    .sort((a, b) => getDropPriority(b) - getDropPriority(a))
    .slice(0, maxDrops)
    .map(({ item, qty }) => ({ item, qty }));
}

function getDropPriority(drop) {
  const item = ITEMS[drop.item];
  const rarityPriority = LOOT_RARITY_PRIORITY[item?.rarity] || 0;
  return (drop.guaranteed ? 100 : 0) + rarityPriority * 10 + Math.min(9, Number(drop.qty || 1));
}

function isEliteLootEnemy(enemy) {
  return Boolean(enemy?.elite || enemy?.isElite || enemy?.eliteModifier || enemy?.namedExteriorElite || enemy?.miniBoss || enemy?.worldBoss || enemy?.isBoss);
}

function isBossLootEnemy(enemy) {
  return Boolean(enemy?.isBoss || enemy?.worldBoss || enemy?.bossType || enemy?.roomRole === 'miniBoss');
}

// -----------------------------------------------------------------------------
// QUEST DISPLAY FALLBACKS
// -----------------------------------------------------------------------------
// The real expanded quest database now lives in worldContent.js.
// This export remains for older UI helpers that still import QUESTS from data.js.

export const QUESTS = {
  firstOath: {
    title: 'First Oath of Runalis',
    stages: [
      'Speak with Warden Mael at the outpost.',
      'Gather 3 Emberleaf and 2 Black Iron Ore.',
      'Defeat 3 Blighted Corpses near the deadwood.',
      'Return to Warden Mael.'
    ]
  },

  hungryShrine: {
    title: 'The Hungry Shrine',
    stages: [
      'Find the shrine north-east of camp.',
      'Offer 2 Gravecap and 1 Bone Shard.',
      'Survive what answers.'
    ]
  },

  humanBeginning: {
    title: 'Human Beginning',
    stages: [
      'You entered Echoryn Forest with no class, no oath, and no chosen path.',
      'Use skills to shape what you become.',
      'At level 50, only two combat skills may break past human limits.'
    ]
  },

  roadsGoneQuiet: {
    title: 'The Roads Went Quiet',
    stages: [
      'Push east along the Blighted Road.',
      'Clear Blighted Corpses from the road.',
      'Investigate the Ashen Orchard.'
    ]
  },

  embersOnTheRoad: {
    title: 'Embers on the Road',
    stages: [
      'Gather Emberleaf along the old road.',
      'Defeat Blighted Corpses between the outpost and orchard.',
      'Find the Ashen Orchard campfire.'
    ]
  },

  buriedName: {
    title: 'The Buried Name',
    stages: [
      'Find the Ashen Orchard Cellar.',
      'Defeat the Orchard Keeper.',
      'Return to the Blighted Pilgrim.'
    ]
  },

  wrongByMorning: {
    title: 'Wrong by Morning',
    stages: [
      'Discover Pilgrim Bridge.',
      'Discover Castle Veyreign.',
      'Discover Mirror Grove.'
    ]
  },

  silverInTheRiver: {
    title: 'Silver in the River',
    stages: [
      'Collect River Reed.',
      'Catch Silverfin.',
      'Return to Fenrick Salt.'
    ]
  },

  facesInTheWater: {
    title: 'Faces in the Water',
    stages: [
      'Collect Bone Shards and Pale Essence.',
      'Defeat Gravebound in the Lantern Marsh.',
      'Return to the Mire Widow.'
    ]
  },

  lanternsInTheMire: {
    title: 'Lanterns in the Mire',
    stages: [
      'Discover Lantern Marsh.',
      'Defeat Gravebound in the Iron Mire.',
      'Return to Lumen Sable.'
    ]
  },

  theRidgeLooksBack: {
    title: 'The Ridge Looks Back',
    stages: [
      'Discover Watcher Ridge.',
      'Defeat the Watcher Above the Road.',
      'Return to Watcher Ivo.'
    ]
  }
};

// -----------------------------------------------------------------------------
// BIOMES
// -----------------------------------------------------------------------------

export const BIOMES = {
  grass: {
    color: '#172a1b',
    alt: '#1d3320',
    passable: true
  },

  path: {
    color: '#403529',
    alt: '#4c4032',
    passable: true
  },

  ruin: {
    color: '#282a34',
    alt: '#333542',
    passable: true
  },

  dead: {
    color: '#211d20',
    alt: '#2b2427',
    passable: true
  },

  ore: {
    color: '#252b31',
    alt: '#343b43',
    passable: true
  },

  water: {
    color: '#102235',
    alt: '#14304b',
    passable: false
  },

  wall: {
    color: '#11131a',
    alt: '#181b25',
    passable: false
  }
};
