from pathlib import Path
def edit(name,changes,imports=''):
 p=Path('src')/name;s=p.read_text(encoding='utf-8')
 for old,new in changes:
  assert old in s,(name,old[:95]);s=s.replace(old,new)
 p.write_text(imports+s,encoding='utf-8')
edit('player.js',[("  normalizeEquipmentProgression(player);\n  synchronizeEquipmentBoundSkills(player);","  normalizeEquipmentProgression(player);")])
edit('combat.js',[("  synchronizeEquipmentBoundSkills(player);\n  player.summons", "  synchronizeEquipmentBoundSkills(player,now);\n  player.summons")])
edit('panelInventory.js',[
 ("${itemStatBlock(player, item)}\n\n      ${options.includeComparison", "${itemStatBlock(player, item)}\n      ${tierIdentityBlock(player,item,entry)}\n\n      ${options.includeComparison"),
 ("      ${itemStatBlock(player, item)}\n      ${upgradeCostBlock", "      ${itemStatBlock(player, item)}\n      ${tierIdentityBlock(player,item,player.equippedGear?.[slot])}\n      ${upgradeCostBlock"),
 ("${upgradeLevel ? ` +${upgradeLevel}` : ''}", " · Tier ${upgradeLevel+1}/20"),
 ("          <b>${escapeHtml(describeBonusMap(bonus.bonus))}</b>", "          <b>${escapeHtml([describeBonusMap(bonus.bonus),bonus.effect].filter(Boolean).join(' · '))}</b>"),
 ("  document.querySelectorAll('[data-equipment-action]').forEach(btn => {\n    btn.onclick", "  document.querySelectorAll('[data-equipment-action]').forEach(btn => {\n    if(btn.dataset.equipmentAction==='upgrade'){const quote=makeUpgradeQuote(player,btn.dataset.equipmentSlot);btn.disabled=!quote;btn.textContent=!quote?'Tier 20 · Maximum':game.uiState?.pendingGearUpgrade===`${quote.instanceId}:${quote.currentTier}`?'Confirm Upgrade':'Upgrade';}\n    btn.onclick"),
 ("  document.querySelectorAll('[data-upgrade-slot]').forEach(btn => {\n    btn.onclick", "  document.querySelectorAll('[data-upgrade-slot]').forEach(btn => {\n    const quote=makeUpgradeQuote(player,btn.dataset.upgradeSlot);btn.disabled=!quote;btn.textContent=!quote?'Tier 20 · Maximum':game.uiState?.pendingGearUpgrade===`${quote.instanceId}:${quote.currentTier}`?'Confirm Upgrade':'Upgrade';\n    btn.onclick"),
 ("    ? compactItemSummary(player, item)", "    ? `${compactItemSummary(player, item)} · Tier ${upgradeLevel+1}/20`"),
 ("${item.type==='weapon'?'Weapon power':'Protection'}: ${getTierStatBonus(item,current+1).toFixed(2)} → ${getTierStatBonus(item,current+2).toFixed(2)} from upgrades.", "${item.type==='weapon'?'Weapon base + upgrade':'Armour + upgrade'}: ${(Number(item.type==='weapon'?(item.baseDamage||item.power||0):(item.armour||0))+getTierStatBonus(item,current+1)).toFixed(2)} → ${(Number(item.type==='weapon'?(item.baseDamage||item.power||0):(item.armour||0))+getTierStatBonus(item,current+2)).toFixed(2)}.")
],"import {MYTHICAL_SETS} from './mythicalEquipmentData.js';\nimport {getMythicalSetCounts} from './mythicalEquipmentSystem.js';\n")
p=Path('src/panelInventory.js');s=p.read_text(encoding='utf-8');s+='''
function tierIdentityBlock(player,item,entry) {
  if(!isUpgradable(item))return '';
  const tier=entry?.upgradeTier || 1,bonus=getTierStatBonus(item,tier),set=MYTHICAL_SETS[item.setId];
  const count=set?getMythicalSetCounts(player)[set.id] || 0:0;
  const cost=tier<20?getUpgradeCost(item,tier):null;
  return `<section class="item-stats"><div class="stat-row"><span>Upgrade Tier</span><b>${tier}/20</b></div>
    <div class="stat-row"><span>Upgrade ${item.type==='weapon'?'weapon power':item.type==='trinket'?'protection / focus':'armour'}</span><b>+${bonus.toFixed(2)}</b></div>
    <p class="tag">New gear begins at Tier 1. Combat Level and mastery provide your main growth.</p>
    ${item.id==='demonseedScythe'?'<p class="tag">Equipment skill: Demon Summon. Read the Demonseed Pact, assign it in Abilities, and keep this scythe equipped. Removing it dismisses the demon; knowledge and mastery remain.</p>':''}
    ${set?`<h3>${escapeHtml(set.name)} · ${count}/3 equipped</h3><p class="tag">${escapeHtml(set.theme)}</p><p>${set.pieces.map(id=>`${escapeHtml(ITEMS[id].name)} (${escapeHtml(ITEMS[id].slot)})`).join(' · ')}</p>${[1,2,3].map(n=>`<p class="${count>=n?'good-text':'tag'}">${n} piece${n>1?'s':''} · ${count>=n?'Active':'Inactive'}: ${escapeHtml(set.effects[n])}</p>`).join('')}<p class="tag">Mix compatible sets in your five slots. Bonuses add within caps; Drowned Convergence takes priority over Blighted Star on water beams. Changing a transformed channel or wolf's set interrupts it.</p>`:''}
    ${cost?`<p class="tag">Next: Tier ${tier+1}/20 · ${cost.gold} Ash Coins · ${cost.materials.map(([id,n])=>`${escapeHtml(ITEMS[id].name)} ${countItem(player,id)}/${n}`).join(' · ')}</p>`:'<p class="tag">Maximum upgrade tier reached.</p>'}
  </section>`;
}
''';p.write_text(s,encoding='utf-8')
edit('ui.js',[
 ("  const effective=applyAbilityMastery(player,ability);", "  const effective=applyMythicalAbilityModifiers(player,applyAbilityMastery(player,ability));"),
 ("  ability=applyAbilityMastery(player,ability);", "  ability=applyMythicalAbilityModifiers(player,applyAbilityMastery(player,ability));"),
 ("${ability.channelProfile ? `<div class=\"stat-row\"><span>Sustained cost</span>", "${effective.channelProfile ? `<div class=\"stat-row\"><span>Sustained cost</span>"),
 ("${ability.channelProfile.healthPerSecond?' + 1 HP/sec':''}", "${effective.channelProfile.healthPerSecond?' + 1 HP/sec':''}"),
 ("${ability.cd || 0}s", "${effective.cd || 0}s"),
 ("${ability.channelProfile ? 'Starting cost' : 'Cost'}", "${effective.channelProfile ? 'Starting cost' : 'Cost'}"),
 ("Read Demonseed Pact", "Equip Demonseed Scythe and read its Pact")
],"import {applyMythicalAbilityModifiers} from './mythicalEquipmentSystem.js';\n")
# Updated assertions reflect the requested save schema and equipment-bound pact.
p=Path('tools/verify-skill-morphs.mjs');s=p.read_text(encoding='utf-8').replace('assert.equal(SAVE_SCHEMA_VERSION,15)','assert.equal(SAVE_SCHEMA_VERSION,16)');p.write_text(s,encoding='utf-8')
p=Path('tools/verify-progression-overhaul.mjs');s=p.read_text(encoding='utf-8');s=s.replace('give a deliberate permanent pact','give deliberate equipment-bound knowledge');s=s.replace("p.equipment.weapon='oldKnife';assert.ok(assignAbilityToSlot(p,3,'summonDemon').ok);", "p.equipment.weapon='oldKnife';assert.equal(assignAbilityToSlot(p,3,'summonDemon').ok,false);p.equipment.weapon='demonseedScythe';assert.ok(assignAbilityToSlot(p,3,'summonDemon').ok);");s=s.replace("addItem(p,'demonseedScythe');readSkillScroll(p,p.inventory", "addItem(p,'demonseedScythe');p.equipment.weapon='demonseedScythe';readSkillScroll(p,p.inventory");p.write_text(s,encoding='utf-8')
print('Tier, set and ability UI applied.')
