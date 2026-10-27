import {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';
import { ITEMS, getAbilityById,getAbilitySkillRequirement } from './data.js';
import {normalizeClassId} from './classData.js';
import { unlockActiveAbility, normalizeAbilityManagementState } from './abilityLoadoutSystem.js';

export const SKILL_SCROLL_OFFERS = Object.freeze([
  { id:'summonWolfScroll', qty:1, price:12, label:'Scroll: Summon Wolf', detail:'Learn a loyal wolf companion. Every class, any level. Read from Inventory → Loot, then assign in Skills → Abilities.' },
  { id:'guardScroll', qty:1, price:18, label:'Scroll: Guard', detail:'Learn an ordinary protective technique. Train Warding through actual protection.' }
]);
export function purchaseSkillScroll(player, itemId) {
  const offer = SKILL_SCROLL_OFFERS.find(o => o.id === itemId), item = ITEMS[itemId];
  if (!player || !offer || !item) return { ok:false, reason:'Unknown scroll.' };
  normalizeAbilityManagementState(player);
  player.inventory ||= [];
  if (player.knownAbilities.includes(item.learnsAbility) || player.inventory.some(i => i.id === itemId && i.qty > 0)) return { ok:false, reason:'Already learned or in your inventory.' };
  if (!(Number(player.gold) >= offer.price)) return { ok:false, reason:'Not enough gold.' };
  player.gold -= offer.price;
  player.inventory.push({id:itemId, qty:1});
  return { ok:true, offer };
}
export function readSkillScroll(player, bagIndex) {
  const entry = player?.inventory?.[bagIndex], item = ITEMS[entry?.id], ability = getAbilityById(item?.learnsAbility);
  if (!ability || !(entry.qty > 0)) return { ok:false, reason:'This is not a readable skill scroll.' };
  if(ability.classId&&normalizeClassId(ability.classId)!==normalizeClassId(player.classId))return {ok:false,reason:'This technique belongs to another class. The scroll was kept.'};
  const requirement=getAbilitySkillRequirement(ability);
  if(requirement>(player.skillState?.skills?.[ability.skill]?.level||1))return {ok:false,reason:`${ability.skill} level ${requirement} required. The scroll was kept.`};
  normalizeAbilityManagementState(player);
  if (player.knownAbilities.includes(ability.id)) return { ok:false, reason:'Already learned. The scroll was kept.' };
  if (item.legendaryUnlock && !player.legendarySkillAccess?.[item.legendaryUnlock]) return { ok:false, reason:'Discover the associated legendary weapon first.' };
  if (!unlockActiveAbility(player, ability.id, {autoAssignEmpty:false})) return { ok:false, reason:'Could not learn this ability.' };
  player.independentAbilityUnlocks=[...new Set([...(player.independentAbilityUnlocks||[]),ability.id])];
  entry.qty--;
  if (entry.qty <= 0) player.inventory.splice(bagIndex,1);
  return { ok:true, ability, reason:`Learned ${ability.name}. Assign it in Skills → Abilities.` };
}
export function migrateLegendarySummonAccess(player) {
  if (!player) return;
  player.legendarySkillAccess ||= {};
  const equipment = Object.values(player.equipment || {}).map(ref => typeof ref === 'object' ? ref?.id : ref);
  const inventory = player.inventory || [], stored = Array.isArray(player.bank) ? player.bank : player.bank?.items || [];
  const earned = equipment.includes('demonseedScythe') || [...inventory,...stored].some(i => (typeof i === 'string' ? i : i?.id) === 'demonseedScythe') ||
    (player.summons || []).some(s => s.legendaryPassiveId === 'demonseedImp') || player.legendaryState?.cooldowns?.demonseedImp > 0;
  if (earned) player.legendarySkillAccess.demonseedScythe = true;
  if (player.legendarySkillAccess.demonseedScythe && !player.knownAbilities?.includes('summonDemon') && !inventory.some(i => i.id === 'summonDemonScroll')) {
    inventory.push({id:'summonDemonScroll',qty:1}); player.inventory = inventory;
  }
  synchronizeEquipmentBoundSkills(player);
  // Remove the old automatic entity while retaining earned knowledge and mastery.
  player.summons = (player.summons || []).filter(s => !(s.legendaryTemporary && s.legendaryPassiveId === 'demonseedImp'));
}
