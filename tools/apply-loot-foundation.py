from pathlib import Path

def edit(name, changes, imports=''):
    path=Path('src')/name
    source=path.read_text(encoding='utf-8')
    for old,new in changes:
        assert old in source, (name,old[:100])
        source=source.replace(old,new)
    path.write_text(imports+source,encoding='utf-8')

edit('player.js',[
 ("  player.quest = player.quest ?? {", "  normalizeEquipmentProgression(player);\n  synchronizeEquipmentBoundSkills(player);\n\n  player.quest = player.quest ?? {"),
 ("      player.inventory.push({ id, qty: 1 });", "      player.inventory.push(isTieredEquipment(item) ? createGearEntry(player,id) : { id, qty: 1 });"),
 ("  const level = Math.max(0, Number(player?.gearUpgrades?.[slot] || 0));\n  return level > 0 ? level * 1.5 : 0;", "  return getEquipmentTierBonus(player,slot);"),
 ("  return player.inventory.find(i => i.id === id)?.qty || 0;", "  return player.inventory.reduce((total,entry)=>total+(entry.id===id ? Number(entry.qty)||0 : 0),0);")
], "import {normalizeEquipmentProgression,createGearEntry,isTieredEquipment,getEquipmentTierBonus} from './equipmentProgressionSystem.js';\nimport {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';\n")

p=Path('src/craftingSystem.js');s=p.read_text(encoding='utf-8')
start=s.index('export function upgradeEquippedSlot(');end=s.index('export function getRecipeRequiredLevel',start)
s=s[:start]+'''export function upgradeEquippedSlot(player, slot, game, quote = null) {
  const result=commitGearUpgrade(player,quote || makeUpgradeQuote(player,slot));
  if(!result.ok){game?.log?.(result.reason);return false;}
  player.crafting ||= {};
  player.crafting.upgradesPerformed=(player.crafting.upgradesPerformed || 0)+1;
  gainXp(player,'crafting',18+(result.targetTier-1)*6,game?.log);
  game?.log?.(`Upgraded ${ITEMS[result.itemId].name} to Tier ${result.targetTier}/20.`);
  addStatusText(player,`Tier ${result.targetTier}/20`,{color:'#ffcc66',ttl:1.25});
  return true;
}

'''+s[end:]
start=s.index('export function getGearUpgradeLevel');end=s.index('export function isSalvageable',start)
s=s[:start]+'''// Compatibility: the old +N label is Tier N+1. Costs take the old
// next-level argument, while the authoritative system takes a target tier.
export function getGearUpgradeLevel(player,slot){return getEquipmentTier(player,slot)-1;}
export function getGearUpgradeStatBonus(player,slot){return getEquipmentTierBonus(player,slot);}
export function getUpgradeCost(item,nextLevel){return getTierUpgradeCost(item,Number(nextLevel)+1) || {gold:0,materials:[],capped:true};}

'''+s[end:]
s=s.replace('  removeItem(player, item.id, 1);','  player.inventory.splice(bagIndex,1);',1)
p.write_text("import {commitGearUpgrade,makeUpgradeQuote,getEquipmentTier,getEquipmentTierBonus,getTierUpgradeCost} from './equipmentProgressionSystem.js';\n"+s,encoding='utf-8')

edit('abilityLoadoutSystem.js',[("  if (ability.classId &&", "  if (!hasSkillEquipment(player,ability)) return {usable:false,reason:equipmentSkillReason(ability)};\n\n  if (ability.classId &&")],"import {hasSkillEquipment,equipmentSkillReason} from './equipmentBoundSkills.js';\n")
edit('combat.js',[("  player.summons = player.summons || [];\n  if (player.hp <= 0", "  synchronizeEquipmentBoundSkills(player);\n  player.summons = player.summons || [];\n  if (player.hp <= 0")],"import {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';\n")
edit('skillScrollSystem.js',[("  // Remove the old automatic entity while retaining the permanent earned unlock.","  synchronizeEquipmentBoundSkills(player);\n  // Remove the old automatic entity while retaining earned knowledge and mastery.")],"import {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';\n")
edit('data.js',[("name: 'Mythic'","name: 'Mythical'"),("Permanent once learned, even without the scythe.","Knowledge and mastery persist; casting requires the equipped Demonseed Scythe."),("the scythe need not remain equipped.","the scythe must remain equipped to cast or sustain the demon."),("permanently learn Demon Summon, then activate it from your hotbar.","learn Demon Summon. Activate it from your hotbar while this scythe is equipped; removing it dismisses the demon.")])
edit('saveProfiles.js',[("export const SAVE_SCHEMA_VERSION = 15;","export const SAVE_SCHEMA_VERSION = 16;")])
edit('combatPower.js',[("(trinket?.power || trinket?.spirit || 0);","(trinket?.power || trinket?.spirit || 0) + getEquipmentTierBonus(player,'weapon') + getEquipmentTierBonus(player,'trinket');"),("+Number(getEquipmentStatBonuses(player).spirit||0);","+Number(getEquipmentStatBonuses(player).spirit||0)+getEquipmentTierBonus(player,'weapon')*.5+getEquipmentTierBonus(player,'trinket');")],"import {getEquipmentTierBonus} from './equipmentProgressionSystem.js';\n")

edit('panelInventory.js',[
 ("      upgradeEquippedSlot(player, btn.dataset.upgradeSlot, game);", "      performEquipmentSlotUpgradeAction(player,btn.dataset.upgradeSlot,game,rerender);"),
 ("  const upgraded = upgradeEquippedSlot(player, slot, game);", "  const quote=makeUpgradeQuote(player,slot);\n  if(!quote){game?.log?.('Maximum Tier 20 reached.');return false;}\n  game.uiState ||= {};\n  const key=`${quote.instanceId}:${quote.currentTier}`;\n  if(game.uiState.pendingGearUpgrade!==key){\n    game.uiState.pendingGearUpgrade=key;\n    game?.log?.(`Confirm upgrade of ${ITEMS[quote.itemId].name} to Tier ${quote.targetTier}/20: ${quote.cost.gold} Ash Coins and ${quote.cost.materials.map(([id,n])=>`${ITEMS[id].name} x${n}`).join(', ')}. Select Confirm Upgrade to proceed.`);\n    rerender?.();return false;\n  }\n  game.uiState.pendingGearUpgrade=null;\n  const upgraded = upgradeEquippedSlot(player, slot, game,quote);"),
 ("  if (player.equipment[slot]) {\n    addItem(player, player.equipment[slot], 1);\n  }\n\n  player.equipment[slot] = item.id;\n\n  entry.qty -= 1;\n\n  if (entry.qty <= 0) {\n    player.inventory.splice(bagIndex, 1);\n  }", "  if(!equipGearEntry(player,bagIndex))return false;\n  synchronizeEquipmentBoundSkills(player);\n  if(game?.uiState)game.uiState.pendingGearUpgrade=null;"),
 ("  addItem(player, itemId, 1);\n  player.equipment[slot] = null;", "  if(!unequipGearEntry(player,slot))return false;\n  synchronizeEquipmentBoundSkills(player);\n  if(game?.uiState)game.uiState.pendingGearUpgrade=null;"),
 ("  const previousItemId = skeleton.equipment[safeSlot] || null;\n  skeleton.equipment[safeSlot] = item.id;\n\n  if (previousItemId) {\n    addItem(player, previousItemId, 1);\n  }", "  skeleton.equippedGear ||= {};\n  const previousItemId=skeleton.equipment[safeSlot] || null;\n  const previousEntry=skeleton.equippedGear[safeSlot];\n  skeleton.equipment[safeSlot]=item.id;skeleton.equippedGear[safeSlot]=entry;\n  if(previousEntry)player.inventory.push(previousEntry);else if(previousItemId)addItem(player,previousItemId,1);"),
 ("  skeleton.equipment[safeSlot] = null;\n  addItem(player, itemId, 1);", "  skeleton.equipment[safeSlot]=null;\n  if(skeleton.equippedGear?.[safeSlot]){player.inventory.push(skeleton.equippedGear[safeSlot]);delete skeleton.equippedGear[safeSlot];}else addItem(player,itemId,1);"),
 ("      <h3>Upgrade +${current + 1}</h3>", "      <h3>Tier ${current+1}/20 → ${current+2}/20</h3>\n      <p>${item.type==='weapon'?'Weapon power':'Protection'}: ${getTierStatBonus(item,current+1).toFixed(2)} → ${getTierStatBonus(item,current+2).toFixed(2)} from upgrades. Special effects retain their own rules.</p>\n      <p>Select Upgrade, then Confirm Upgrade to spend these materials.</p>"),
 ("  const cost = getUpgradeCost(item, current + 1);\n  const materials", "  if(current>=19)return '<section class=\"equipment-upgrade-cost\"><h3>Tier 20/20 · Maximum</h3></section>';\n  const cost = getUpgradeCost(item, current + 1);\n  const materials")
],"import {equipGearEntry,unequipGearEntry,makeUpgradeQuote,getTierStatBonus,getEquipmentTier} from './equipmentProgressionSystem.js';\nimport {synchronizeEquipmentBoundSkills} from './equipmentBoundSkills.js';\n")
print('Loot foundation applied.')
