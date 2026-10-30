import {hasSkillEquipment,equipmentSkillReason} from './equipmentBoundSkills.js';
import {resolveSubclassAbility} from './subclassVariants.js';
// Persistent ability ownership and explicit hotbar assignment.
//
// Ability ownership is independent from the hotbar:
// - knownAbilities/unlockedAbilities contain every learned active ability.
// - unlockedPassives contains passive IDs and never feeds the hotbar.
// - loadout.abilitySlots contains explicit assignments only.
// Unlocking may fill an empty slot, but never replaces an occupied slot.

import { ABILITIES, ITEMS, getAbilityById, normalizeAbilityId, getAbilitySkillRequirement } from './data.js';
import { getSkillLevel } from './skills.js';

import {HOTBAR_SLOT_COUNT,HOTBAR_LAYOUT_VERSION,BLOCK_ABILITY_ID} from './hotbarConfig.js';
export {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';

const ACTIVE_ABILITY_IDS = new Set(ABILITIES.map(ability => ability.id));

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

export function normalizeAbilityManagementState(player) {
  if (!player) return null;

  const known = uniqueValidAbilityIds([
    ...(Array.isArray(player.knownAbilities) ? player.knownAbilities : []),
    ...(Array.isArray(player.unlockedAbilities) ? player.unlockedAbilities : [])
  ]);

  if(!known.includes(BLOCK_ABILITY_ID))known.push(BLOCK_ABILITY_ID);

  player.loadout = player.loadout && typeof player.loadout === 'object'
    ? player.loadout
    : {};

  const sourceSlots = Array.isArray(player.loadout.abilitySlots)
    ? player.loadout.abilitySlots
    : [];
  const assignedIds=new Set();
  const slots = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) => {
    const initialBlock=index===HOTBAR_SLOT_COUNT-1&&sourceSlots[index]===undefined&&Number(player.abilityLayoutVersion||0)<HOTBAR_LAYOUT_VERSION;
    const id = normalizeAbilityId(initialBlock?BLOCK_ABILITY_ID:sourceSlots[index]);
    if(!ACTIVE_ABILITY_IDS.has(id)||assignedIds.has(id))return null;
    assignedIds.add(id);return id;
  });

  // Old saves sometimes had assigned abilities missing from unlockedAbilities,
  // including a legacy fourth slot. Preserve every valid assignment in the
  // learned pool. Duplicate assignments retain their first slot.
  for (const id of sourceSlots) {
    const normalized = normalizeAbilityId(id);
    if (normalized && ACTIVE_ABILITY_IDS.has(normalized) && !known.includes(normalized)) known.push(normalized);
  }

  player.knownAbilities = known;
  player.unlockedAbilities = [...known];
  player.unlockedPassives = uniqueStrings(player.unlockedPassives);
  player.loadout.abilitySlots = slots;
  player.abilityLayoutVersion = HOTBAR_LAYOUT_VERSION;

  return {
    knownAbilities: player.knownAbilities,
    unlockedPassives: player.unlockedPassives,
    hotbarSlots: player.loadout.abilitySlots
  };
}

export function unlockActiveAbility(player, abilityId, options = {}) {
  abilityId = normalizeAbilityId(abilityId);
  if (!player || !ACTIVE_ABILITY_IDS.has(abilityId)) return false;

  normalizeAbilityManagementState(player);
  const newlyUnlocked = !player.knownAbilities.includes(abilityId);

  if (newlyUnlocked) {
    player.knownAbilities.push(abilityId);
    player.unlockedAbilities.push(abilityId);
  }

  if (newlyUnlocked && options.autoAssignEmpty !== false) {
    assignAbilityToFirstEmptySlot(player, abilityId);
  }

  return newlyUnlocked;
}

export function unlockPassive(player, passiveId) {
  if (!player || !passiveId) return false;

  normalizeAbilityManagementState(player);
  if (player.unlockedPassives.includes(passiveId)) return false;
  player.unlockedPassives.push(passiveId);
  return true;
}

export function assignAbilityToSlot(player, slotIndex, abilityId) {
  normalizeAbilityManagementState(player);
  abilityId = normalizeAbilityId(abilityId);

  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= HOTBAR_SLOT_COUNT) {
    return { ok: false, reason: 'Unknown hotbar slot.' };
  }

  if (!player.knownAbilities.includes(abilityId)) {
    return { ok: false, reason: 'Ability has not been unlocked.' };
  }

  const ability = getAbilityById(abilityId);
  if (!ability) return { ok: false, reason: 'Unknown active ability.' };

  const availability = getAbilityAvailability(player, ability);
  if (!availability.usable) {
    return { ok: false, reason: availability.reason };
  }

  const previousSlot=player.loadout.abilitySlots.indexOf(abilityId);
  player.loadout.abilitySlots=player.loadout.abilitySlots.map((id,index)=>index===slotIndex?abilityId:id===abilityId?null:id);
  return { ok: true, reason: 'Assigned', ability, slotIndex, movedFromSlot:previousSlot>=0&&previousSlot!==slotIndex?previousSlot:null };
}

export function assignAbilityToFirstEmptySlot(player, abilityId) {
  normalizeAbilityManagementState(player);
  const assignedSlot=player.loadout.abilitySlots.indexOf(normalizeAbilityId(abilityId));
  if(assignedSlot>=0)return {ok:true,reason:'Already assigned',ability:getAbilityById(abilityId),slotIndex:assignedSlot};
  const emptySlot = player.loadout.abilitySlots.findIndex(id => !id);
  if (emptySlot < 0) return { ok: false, reason: 'Unlocked but unassigned.' };
  return assignAbilityToSlot(player, emptySlot, abilityId);
}

export function clearAbilitySlot(player, slotIndex) {
  normalizeAbilityManagementState(player);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= HOTBAR_SLOT_COUNT) {
    return false;
  }

  player.loadout.abilitySlots[slotIndex] = null;
  return true;
}

export function clearAllAbilitySlots(player) {
  if(!player)return false;
  normalizeAbilityManagementState(player);
  player.loadout.abilitySlots=Array(HOTBAR_SLOT_COUNT).fill(null);
  return true;
}

export function getKnownActiveAbilities(player) {
  normalizeAbilityManagementState(player);
  return player.knownAbilities
    .map(id=>resolveSubclassAbility(player,id))
    .filter(Boolean);
}

export function getAbilityAvailability(player, abilityOrId) {
  const ability = typeof abilityOrId === 'string'
    ? getAbilityById(abilityOrId)
    : abilityOrId;

  if (!ability) return { usable: false, reason: 'Unknown ability.' };
  normalizeAbilityManagementState(player);

  if (!player.knownAbilities.includes(ability.id)) {
    return { usable: false, reason: 'Not unlocked.' };
  }

  if (!hasSkillEquipment(player,ability)) return {usable:false,reason:equipmentSkillReason(ability)};

  if (ability.classId && normalizeClassId(player.classId) !== normalizeClassId(ability.classId)) {
    return { usable: false, reason: `Requires ${formatId(ability.classId)} class.` };
  }

  const bloodlineId = player?.bloodline?.id || player?.raceId || null;
  if (ability.bloodline && bloodlineId !== ability.bloodline) {
    return { usable: false, reason: `Requires ${formatId(ability.bloodline)} bloodline.` };
  }

  if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
    return { usable: false, reason: 'Requires awakened Spirit.' };
  }

  const skillLevel = getSkillLevel(player.skillState, ability.skill);
  const requirement = getAbilitySkillRequirement(ability);
  if (requirement && skillLevel < requirement) {
    return {
      usable: false,
      reason: `Requires ${formatId(ability.skill)} level ${requirement}.`
    };
  }

  const requiredWeapon = ability.requiresWeaponType || ability.weaponType || null;
  if (requiredWeapon) {
    const weaponType = getEquippedWeaponType(player);
    if (weaponType !== requiredWeapon) {
      return {
        usable: false,
        reason: `Requires ${formatId(requiredWeapon)}.`,
        requiredWeapon
      };
    }
  }

  return { usable: true, reason: 'Ready' };
}

export function getAbilityCategory(ability) {
  if (ability?.bloodline) return 'bloodline';
  if (ability?.weaponType || ability?.requiresWeaponType) return 'weapon';
  if (ability?.classId) return 'class';
  return 'utility';
}

function getEquippedWeaponType(player) {
  const ref = player?.equipment?.weapon;
  const id = typeof ref === 'string' ? ref : ref?.id || ref?.itemId;
  return id ? ITEMS[id]?.weaponType || ITEMS[id]?.type || null : null;
}

function uniqueValidAbilityIds(values) {
  return [...new Set(uniqueStrings(values)
    .map(normalizeAbilityId)
    .filter(id => ACTIVE_ABILITY_IDS.has(id)))];
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value))];
}

function formatId(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}
