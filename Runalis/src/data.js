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
    desc: 'Your reputation, trust, and standing in the Sol Land.'
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

  relic: {
    name: 'Relic',
    color: '#d9ad4f'
  },

  legendary: {
    name: 'Legendary',
    color: '#ffcc66'
  }
};

export const RUNALIS_CLASSES = {
  templar: {
    id: 'templar',
    name: 'Templar',
    skill: 'blade',
    xpMultiplier: 1.5,
    weaponType: 'sword',
    qAbility: 'heavyCut',
    rAbility: 'cleavingStep'
  },

  mercenary: {
    id: 'mercenary',
    name: 'Mercenary',
    skill: 'archery',
    xpMultiplier: 1.5,
    weaponType: 'bow',
    qAbility: 'quickShot',
    rAbility: 'markedArrow'
  },

  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    skill: 'spirit',
    xpMultiplier: 1.5,
    weaponType: 'scythe',
    qAbility: 'graveSpark',
    rAbility: 'summonLich'
  },

  thornbinder: {
    id: 'thornbinder',
    name: 'Thornbinder',
    skill: 'warding',
    xpMultiplier: 1.5,
    weaponType: 'staff',
    qAbility: 'vineWhip',
    rAbility: 'summonThornbeast'
  }
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
  }
};

// -----------------------------------------------------------------------------
// ITEMS
// -----------------------------------------------------------------------------

export const ITEMS = {
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
    desc: 'A small fish from the safer rivers of the Sol Land.'
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
    heal: 12,
    stamina: 5,
    desc: 'Dry travel food. Restores a little health and stamina.'
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
    name: 'Hollow Eye',
    type: 'material',
    rarity: 'uncommon',
    stack: true,
    value: 7,
    desc: 'A glassy eye taken from a Hollowling. It twitches in moonlight.'
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
    desc: 'Grey-red ash carried by Ember Veil cultists.'
  },

  redSealFragment: {
    id: 'redSealFragment',
    name: 'Red Seal Fragment',
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
    desc: 'A fractured relic from the older Sol Land. Someone will want this.'
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
    desc: 'A narrow noble blade from Castle Veyr.'
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
    desc: 'A curved spirit weapon used by Necromancers.'
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
    name: 'Red Seal Scythe',
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
    traits: ['Red Seal', 'Hungry Edge'],
    desc: 'A dangerous ritual scythe. It feels less like a weapon than a bargain.'
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
    desc: 'A sturdy helm worn by new Templars.'
  },

  necromancerHood: {
    id: 'necromancerHood',
    name: 'Necromancer Hood',
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
    desc: 'Reliable plate armour issued to Templar initiates.'
  },

  necromancerRobe: {
    id: 'necromancerRobe',
    name: 'Necromancer Robe',
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
    name: 'Cultist Mantle',
    type: 'armour',
    slot: 'chest',
    rarity: 'occult',
    stack: false,
    value: 92,
    armour: 3,
    spirit: 4,
    desc: 'A red-black mantle stitched with false prayers.'
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
    name: 'Red Seal Ring',
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

// -----------------------------------------------------------------------------
// ABILITIES
// -----------------------------------------------------------------------------

export const ABILITIES = [
  {
    id: 'heavyCut',
    key: '1',
    name: 'Heavy Cut',
    classId: 'templar',
    classSlot: 'Q',
    skill: 'blade',
    tree: 'blade',
    unlockLevel: 1,
    cd: 1.1,
    costType: 'stamina',
    cost: 8,
    damage: 9,
    damageMultiplier: 1.25,
    range: 44,
    desc: 'A committed melee hit.'
  },

  {
    id: 'cleavingStep',
    key: null,
    name: 'Cleaving Step',
    classId: 'templar',
    classSlot: 'R',
    skill: 'blade',
    tree: 'blade',
    unlockLevel: 8,
    cd: 4.5,
    costType: 'stamina',
    cost: 16,
    damage: 18,
    damageMultiplier: 1.75,
    range: 55,
    desc: 'Step forward and cut through the nearest enemy.'
  },

  {
    id: 'quickShot',
    key: '3',
    name: 'Quick Shot',
    classId: 'mercenary',
    classSlot: 'Q',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 1,
    cd: 1.4,
    costType: 'stamina',
    cost: 7,
    damage: 8,
    damageMultiplier: 1.1,
    range: 180,
    desc: 'A fast ranged shot from a bow.'
  },

  {
    id: 'markedArrow',
    key: null,
    name: 'Marked Arrow',
    classId: 'mercenary',
    classSlot: 'R',
    skill: 'archery',
    tree: 'archery',
    unlockLevel: 8,
    cd: 5.0,
    costType: 'stamina',
    cost: 13,
    damage: 20,
    damageMultiplier: 1.85,
    range: 220,
    desc: 'A careful shot that hits harder at range.'
  },

  {
    id: 'graveSpark',
    key: null,
    name: 'Necrotic Bolt',
    classId: 'necromancer',
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
    desc: 'Fire a fast necrotic orb toward the cursor. It damages on impact and restores a little health.'
  },

  {
    id: 'summonLich',
    key: null,
    name: 'Summon Lich',
    classId: 'necromancer',
    classSlot: 'R',
    skill: 'spirit',
    tree: 'spirit',
    unlockLevel: 8,
    requiresSpiritAwakened: true,
    cd: 12.0,
    costType: 'spirit',
    cost: 18,
    damage: 0,
    range: 0,
    summonType: 'lich',
    desc: 'Summons a permanent undead ally until dismissed or killed.'
  },

  {
    id: 'vineWhip',
    key: null,
    name: 'Vine Whip',
    classId: 'thornbinder',
    classSlot: 'Q',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 1,
    cd: 0.0,
    costType: 'spirit',
    cost: 9,
    damage: 8,
    damageMultiplier: 0.95,
    range: 250,
    maxHits: 4,
    desc: 'Unleash a directional mid-range vine lash toward the cursor, striking enemies in a soft-targeted area.'
  },

  {
    id: 'summonThornbeast',
    key: null,
    name: 'Summon Thornbeast',
    classId: 'thornbinder',
    classSlot: 'R',
    skill: 'warding',
    tree: 'warding',
    unlockLevel: 8,
    cd: 12.0,
    costType: 'stamina',
    cost: 14,
    damage: 0,
    range: 0,
    summonType: 'thornbeast',
    desc: 'Summons a permanent Thornbeast ally until dismissed or killed.'
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
  }
];

export function getAbilityById(id) {
  return ABILITIES.find(a => a.id === id) || null;
}

export function getAbilitiesForSkill(skillId) {
  return ABILITIES.filter(a => a.skill === skillId || a.tree === skillId);
}

export function getUnlockedAbilitiesForPlayer(player) {
  if (!player?.skillState?.skills) return [];

  return ABILITIES.filter(ability => {
    const skill = player.skillState.skills[ability.skill];
    if (!skill) return false;

    if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
      return false;
    }

    return skill.used && skill.level >= ability.unlockLevel;
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
    xp: 35,
    output: 'wardedChest',
    outputQty: 1,
    materials: [['ironOre', 3], ['boneShard', 2]]
  },

  roughLegwraps: {
    id: 'roughLegwraps',
    title: 'Rough Legwraps',
    skill: 'crafting',
    xp: 28,
    output: 'roughLegwraps',
    outputQty: 1,
    materials: [['riverReed', 2], ['boneShard', 1]]
  },

  thornCharm: {
    id: 'thornCharm',
    title: 'Thorn Charm',
    skill: 'crafting',
    xp: 35,
    output: 'thornCharm',
    outputQty: 1,
    materials: [['emberleaf', 2], ['gravecap', 2]]
  },

  cookedSunfish: {
    id: 'cookedSunfish',
    title: 'Cook Sunfish',
    skill: 'cooking',
    xp: 25,
    output: 'cookedSunfish',
    outputQty: 1,
    materials: [['rawSunfish', 1]]
  },

  silverfinSkewer: {
    id: 'silverfinSkewer',
    title: 'Silverfin Skewer',
    skill: 'cooking',
    xp: 45,
    output: 'silverfinSkewer',
    outputQty: 1,
    materials: [['silverfin', 1], ['riverReed', 1]]
  },

  bitterStew: {
    id: 'bitterStew',
    title: 'Bitter Stew',
    skill: 'cooking',
    xp: 28,
    output: 'bitterStew',
    outputQty: 1,
    materials: [['emberleaf', 1], ['riverReed', 1]]
  },

  ashFruitStew: {
    id: 'ashFruitStew',
    title: 'Ash Fruit Stew',
    skill: 'cooking',
    xp: 65,
    output: 'ashFruitStew',
    outputQty: 1,
    materials: [['ashFruit', 1], ['gravecap', 1], ['riverReed', 1]]
  },

  paleRune: {
    id: 'paleRune',
    title: 'Pale Rune',
    skill: 'runecraft',
    xp: 40,
    output: 'paleRune',
    outputQty: 1,
    materials: [['paleEssence', 2], ['boneShard', 1]]
  },

  blackIronSword: {
    id: 'blackIronSword',
    title: 'Black Iron Sword',
    skill: 'crafting',
    xp: 60,
    output: 'blackIronSword',
    outputQty: 1,
    materials: [['ironOre', 5], ['boneShard', 1]]
  },

  ashwoodBow: {
    id: 'ashwoodBow',
    title: 'Ashwood Bow',
    skill: 'crafting',
    xp: 55,
    output: 'ashwoodBow',
    outputQty: 1,
    materials: [['riverReed', 4], ['wolfFang', 1]]
  },

  shrineTonic: {
    id: 'shrineTonic',
    title: 'Shrine Tonic',
    skill: 'cooking',
    xp: 45,
    output: 'shrineTonic',
    outputQty: 1,
    materials: [['gravecap', 2], ['paleEssence', 1]]
  },

  lanternTonic: {
    id: 'lanternTonic',
    title: 'Lantern Tonic',
    skill: 'cooking',
    xp: 70,
    output: 'lanternTonic',
    outputQty: 1,
    materials: [['lanternMoss', 2], ['paleEssence', 1], ['silverfin', 1]]
  },

  rootStaff: {
    id: 'rootStaff',
    title: 'Root Staff',
    skill: 'crafting',
    xp: 40,
    output: 'rootStaff',
    outputQty: 1,
    materials: [['riverReed', 3], ['emberleaf', 1]]
  },

  briarStaff: {
    id: 'briarStaff',
    title: 'Briar Staff',
    skill: 'crafting',
    xp: 70,
    output: 'briarStaff',
    outputQty: 1,
    materials: [['riverReed', 5], ['gravecap', 2], ['wolfFang', 1]]
  },

  heartrootStaff: {
    id: 'heartrootStaff',
    title: 'Heartroot Staff',
    skill: 'crafting',
    xp: 110,
    output: 'heartrootStaff',
    outputQty: 1,
    materials: [['mirrorBark', 2], ['riverReed', 5], ['paleEssence', 2]]
  },

  bonehookScythe: {
    id: 'bonehookScythe',
    title: 'Bonehook Scythe',
    skill: 'crafting',
    xp: 75,
    output: 'bonehookScythe',
    outputQty: 1,
    materials: [['boneShard', 5], ['paleEssence', 2], ['ironOre', 2]]
  },

  graveScythe: {
    id: 'graveScythe',
    title: 'Grave Scythe',
    skill: 'runecraft',
    xp: 105,
    output: 'graveScythe',
    outputQty: 1,
    materials: [['boneShard', 4], ['paleEssence', 4], ['gravecap', 3]]
  },

  knightHelm: {
    id: 'knightHelm',
    title: 'Knight Helm',
    skill: 'crafting',
    xp: 50,
    output: 'knightHelm',
    outputQty: 1,
    materials: [['ironOre', 4], ['knightPlate', 1]]
  },

  knightChest: {
    id: 'knightChest',
    title: 'Knight Chestplate',
    skill: 'crafting',
    xp: 80,
    output: 'knightChest',
    outputQty: 1,
    materials: [['ironOre', 6], ['knightPlate', 2]]
  },

  necromancerHood: {
    id: 'necromancerHood',
    title: 'Necromancer Hood',
    skill: 'runecraft',
    xp: 55,
    output: 'necromancerHood',
    outputQty: 1,
    materials: [['gravecap', 2], ['paleEssence', 2]]
  },

  necromancerRobe: {
    id: 'necromancerRobe',
    title: 'Necromancer Robe',
    skill: 'runecraft',
    xp: 85,
    output: 'necromancerRobe',
    outputQty: 1,
    materials: [['gravecap', 4], ['paleEssence', 3], ['riverReed', 2]]
  },

  thornbinderGarb: {
    id: 'thornbinderGarb',
    title: 'Thornbinder Garb',
    skill: 'crafting',
    xp: 70,
    output: 'thornbinderGarb',
    outputQty: 1,
    materials: [['riverReed', 5], ['emberleaf', 3], ['gravecap', 1]]
  },

  cultistMantle: {
    id: 'cultistMantle',
    title: 'Cultist Mantle',
    skill: 'runecraft',
    xp: 100,
    output: 'cultistMantle',
    outputQty: 1,
    materials: [['cultAsh', 4], ['paleEssence', 3], ['redSealFragment', 1]]
  },

  watcherGlassCharm: {
    id: 'watcherGlassCharm',
    title: 'Watcher Glass Charm',
    skill: 'runecraft',
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
  hollowling: [
    { item: 'paleEssence', chance: 0.32, min: 1, max: 1 },
    { item: 'hollowEye', chance: 0.18, min: 1, max: 1 },
    { item: 'gravecap', chance: 0.12, min: 1, max: 1 },
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
    { item: 'cultistMantle', chance: 0.025, min: 1, max: 1 },
    { item: 'redSealRing', chance: 0.012, min: 1, max: 1 },
    { item: 'redSealScythe', chance: 0.004, min: 1, max: 1 }
  ],

  veyrWraith: [
    { item: 'paleEssence', chance: 0.42, min: 1, max: 3 },
    { item: 'veyrSigil', chance: 0.28, min: 1, max: 1 },
    { item: 'crackedRelic', chance: 0.18, min: 1, max: 2 },
    { item: 'veyrRapier', chance: 0.018, min: 1, max: 1 },
    { item: 'veyrCourtCoat', chance: 0.022, min: 1, max: 1 },
    { item: 'watcherGlass', chance: 0.05, min: 1, max: 1 },
    { item: 'watcherHood', chance: 0.01, min: 1, max: 1 },
    { item: 'watcherGreaves', chance: 0.01, min: 1, max: 1 }
  ]
};

export function rollEnemyLoot(enemyKind) {
  const table = ENEMY_LOOT_TABLES[enemyKind] || [];
  const drops = [];

  for (const entry of table) {
    if (Math.random() <= entry.chance) {
      drops.push({
        item: entry.item,
        qty: randomInt(entry.min, entry.max)
      });
    }
  }

  return drops;
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// -----------------------------------------------------------------------------
// QUEST DISPLAY FALLBACKS
// -----------------------------------------------------------------------------
// The real expanded quest database now lives in worldContent.js.
// This export remains for older UI/dev tools that still import QUESTS from data.js.

export const QUESTS = {
  firstOath: {
    title: 'First Oath of Runalis',
    stages: [
      'Speak with Warden Mael at the outpost.',
      'Gather 3 Emberleaf and 2 Black Iron Ore.',
      'Defeat 3 Hollowlings near the deadwood.',
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
      'You entered the Sol Land with no class, no oath, and no chosen path.',
      'Use skills to shape what you become.',
      'At level 50, only two combat skills may break past human limits.'
    ]
  },

  roadsGoneQuiet: {
    title: 'The Roads Went Quiet',
    stages: [
      'Push east along the Hollow Road.',
      'Clear Hollowlings from the road.',
      'Investigate the Ashen Orchard.'
    ]
  },

  embersOnTheRoad: {
    title: 'Embers on the Road',
    stages: [
      'Gather Emberleaf along the old road.',
      'Defeat Hollowlings between the outpost and orchard.',
      'Find the Ashen Orchard campfire.'
    ]
  },

  buriedName: {
    title: 'The Buried Name',
    stages: [
      'Find the Ashen Orchard Cellar.',
      'Defeat the Orchard Keeper.',
      'Return to the Hollow Pilgrim.'
    ]
  },

  wrongByMorning: {
    title: 'Wrong by Morning',
    stages: [
      'Discover Pilgrim Bridge.',
      'Discover Castle Veyr.',
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