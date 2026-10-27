import {MYTHICAL_SETS} from './mythicalEquipmentData.js';
import {EQUIPMENT_SLOTS} from './equipmentProgressionSystem.js';
// setBonusSystem.js
// Armour and weapon set bonus foundation.

import { ITEMS } from './data.js';

export const ARMOUR_SETS = {
  ...MYTHICAL_SETS,
  graveborn: {
    id: 'graveborn',
    name: 'Graveborn Set',
    theme: 'Gravecaller / Spirit / Lifesteal',
    bonuses: {
      2: { spirit: 3, necroticDamage: 0.08 },
      3: { summonDamage: 0.12, summonHealth: 0.12 },
      4: { lifesteal: 0.04, necroticDamage: 0.08 }
    }
  },

  briarheart: {
    id: 'briarheart',
    name: 'Briarheart Set',
    theme: 'Thornbinder / Nature / Poison / Healing',
    bonuses: {
      2: { warding: 3, natureDamage: 0.08 },
      3: { poisonChance: 0.08, bleedChance: 0.05 },
      4: { healingPower: 0.12, thorns: 4 }
    }
  },

  oathplate: {
    id: 'oathplate',
    name: 'Oathplate Set',
    theme: 'Oathkeeper / Blocking / Survivability',
    bonuses: {
      2: { armour: 4 },
      3: { blockEfficiency: 0.1, dodgeCostReduction: 0.04 },
      4: { healingPower: 0.08, strength: 2 }
    }
  },

  blackbow: {
    id: 'blackbow',
    name: 'Blackbow Set',
    theme: 'Fellhunter / Archery / Crit / Mobility',
    bonuses: {
      2: { dexterity: 3 },
      3: { critChance: 0.06 },
      4: { critDamage: 0.18, dodgeCostReduction: 0.08 }
    }
  }
};

export const WEAPON_SETS = {
  veyrfang: {
    id: 'veyrfang',
    name: 'Veyrfang Weapons',
    bonuses: {
      1: { bossDamage: 0.08, bleedChance: 0.05 }
    }
  },

  thornheart: {
    id: 'thornheart',
    name: 'Thornheart Weapons',
    bonuses: {
      1: { natureDamage: 0.08, poisonChance: 0.08, healingPower: 0.04 }
    }
  },

  lichbone: {
    id: 'lichbone',
    name: 'Lichbone Weapons',
    bonuses: {
      1: { spirit: 2, summonDamage: 0.1, necroticDamage: 0.06 }
    }
  },

  sunforged: {
    id: 'sunforged',
    name: 'Sunforged Weapons',
    bonuses: {
      1: { holyDamage: 0.1, burnChance: 0.04 }
    }
  }
};

const ITEM_SET_OVERRIDES = {
  graveboundHelm: 'graveborn',
  graveboundChest: 'graveborn',
  graveboundGreaves: 'graveborn',
  necromancerHood: 'graveborn',
  necromancerRobe: 'graveborn',

  thornbinderGarb: 'briarheart',
  thornCharm: 'briarheart',
  rootStaff: 'briarheart',
  briarStaff: 'briarheart',
  heartrootStaff: 'briarheart',

  knightHelm: 'oathplate',
  knightChest: 'oathplate',
  ironGreaves: 'oathplate',
  ironOathRing: 'oathplate',

  leatherVest: 'blackbow',
  rogueLeathers: 'blackbow',
  hunterBow: 'blackbow',
  ashwoodBow: 'blackbow',
  roadlessLongbow: 'blackbow'
};

const ITEM_WEAPON_SET_OVERRIDES = {
  veyrRapier: 'veyrfang',
  graveKnife: 'veyrfang',
  briarStaff: 'thornheart',
  heartrootStaff: 'thornheart',
  mirrorRootStaff: 'thornheart',
  bonehookScythe: 'lichbone',
  graveScythe: 'lichbone',
  unburiedCrescent: 'lichbone',
  redSealScythe: 'lichbone',
  noviceBlade: 'sunforged',
  blackIronSword: 'sunforged'
};

export function getItemSetId(itemOrId) {
  const item = resolveItem(itemOrId);
  if (!item) return null;

  return item.setId || ITEM_SET_OVERRIDES[item.id] || null;
}

export function getItemWeaponSetId(itemOrId) {
  const item = resolveItem(itemOrId);
  if (!item) return null;

  return item.weaponSetId || ITEM_WEAPON_SET_OVERRIDES[item.id] || null;
}

export function getSetDefinition(setId) {
  return ARMOUR_SETS[setId] || WEAPON_SETS[setId] || null;
}

export function getItemSetInfo(itemOrId) {
  const setId = getItemSetId(itemOrId);
  const weaponSetId = getItemWeaponSetId(itemOrId);

  return {
    setId,
    set: setId ? ARMOUR_SETS[setId] || null : null,
    weaponSetId,
    weaponSet: weaponSetId ? WEAPON_SETS[weaponSetId] || null : null
  };
}

export function getActiveSetBonuses(player) {
  const equipment = player?.equipment || {};
  const armourCounts = {};
  const weaponCounts = {};

  const seen=new Set();
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId=equipment[slot],item=ITEMS[itemId];
    if(!item || (item.slot==='jewelry'?'trinket':item.slot)!==slot || seen.has(itemId))continue;seen.add(itemId);

    const setId = getItemSetId(itemId);
    if (setId) armourCounts[setId] = (armourCounts[setId] || 0) + 1;

    const weaponSetId = getItemWeaponSetId(itemId);
    if (weaponSetId) weaponCounts[weaponSetId] = (weaponCounts[weaponSetId] || 0) + 1;
  }

  const active = [];

  for (const [setId, count] of Object.entries(armourCounts)) {
    const set = ARMOUR_SETS[setId];
    if (!set) continue;

    for (const [pieces, bonus] of Object.entries(set.bonuses || {})) {
      if (count >= Number(pieces)) {
        active.push({
          kind: 'armour',
          setId,
          name: set.name,
          pieces: Number(pieces),
          count,
          bonus,
          effect:set.effects?.[pieces] || ''
        });
      }
    }
  }

  for (const [setId, count] of Object.entries(weaponCounts)) {
    const set = WEAPON_SETS[setId];
    if (!set) continue;

    for (const [pieces, bonus] of Object.entries(set.bonuses || {})) {
      if (count >= Number(pieces)) {
        active.push({
          kind: 'weapon',
          setId,
          name: set.name,
          pieces: Number(pieces),
          count,
          bonus,
          effect:set.effects?.[pieces] || ''
        });
      }
    }
  }

  return active;
}

export function getEquipmentStatBonuses(player) {
  const totals = {};

  for (const active of getActiveSetBonuses(player)) {
    for (const [stat, value] of Object.entries(active.bonus || {})) {
      totals[stat] = (totals[stat] || 0) + Number(value || 0);
    }
  }

  const caps={summonDamage:.5,summonHealth:.6,critChance:.3,critDamage:.6,blockEfficiency:.35,dodgeCostReduction:.3,lifesteal:.12,bossDamage:.3,necroticDamage:.4,holyDamage:.4,natureDamage:.4};
  for(const [key,cap] of Object.entries(caps))if(totals[key])totals[key]=Math.min(cap,totals[key]);
  return totals;
}

export function describeBonusMap(bonus) {
  return Object.entries(bonus || {})
    .map(([stat, value]) => `${formatStatName(stat)} ${formatBonusValue(stat,value)}`)
    .join(', ');
}

export function formatStatName(stat) {
  return String(stat || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase());
}

function formatBonusValue(stat,value) {
  const n = Number(value || 0);
  if(/Chance$|Reduction$|Efficiency$|Damage$|^lifesteal$|^healingPower$|^summonHealth$/.test(stat))return `+${Math.round(n*100)}%`;
  return `+${Number(n.toFixed(2))}`;
}

function resolveItem(itemOrId) {
  if (!itemOrId) return null;
  if (typeof itemOrId === 'string') return ITEMS[itemOrId] || null;
  return itemOrId;
}
