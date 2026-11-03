import {armourTraining, weaponTraining} from './trainingProfiles.js';
import {vampireOutsideHealing} from './vampireRules.js';
import {weaponSpiritRecoveryLabel} from './weaponSpiritRecovery.js';
import {instanceGearItem,GEAR_RARITIES} from './gearRarity.js';
import {gearBagCount,canCarryGear,gearEquipReason} from './gearItemization.js';
import {isGearInstanceEquipped,isItemLocked,setItemLocked,inventoryDisposalKey} from './gearServices.js';
﻿import {equipmentPurpose,equipmentScaling,abilitySummary,abilityRequirements} from './uiInformation.js';
import {equipGearEntry,unequipGearEntry,getTierStatBonus,getEquipmentTier,makeUpgradeQuote,upgradeEntryPreview} from './equipmentProgressionSystem.js';
import {synchronizeEquipmentBoundSkills,dismissCoterieForEquipmentChange} from './equipmentBoundSkills.js';
import { calculateWeaponDamage } from './combatMoves.js';
import { readSkillScroll } from './skillScrollSystem.js';
// panelInventory.js
// Inventory management, equipment inspection, consumables, and item stats.

import {
  ITEMS,
  RARITY,
  getAbilityById
} from './data.js';

import {
  countItem,
  addItem,
  migratePlayer
} from './player.js';

import {
  getSkillLevel
} from './skills.js';

import {
  getActiveSetBonuses,
  getItemSetInfo,
  describeBonusMap
} from './setBonusSystem.js';

import {
  salvageInventoryItem,
  getGearUpgradeLevel,
  getUpgradeCost,
  isSalvageable,
  isUpgradable
} from './craftingSystem.js';

import {
  useRationFromBag
} from './survivalSkills.js';

import {
  getLegendaryEffectDetails
} from './legendarySystem.js';

import {
  getGearVisualProfile,
  itemIconMarkup,
  slotIconMarkup
} from './gearVisualStyle.js';

import {
  drawHumanActor
} from './humanRenderer.js';

const EQUIPMENT_SLOT_ORDER = [
  ['weapon', 'Weapon'],
  ['helm', 'Helm'],
  ['chest', 'Chest'],
  ['legs', 'Legs'],
  ['trinket', 'Charm']
];

const COTERIE_SLOT_ORDER = [
  ['weapon', 'Weapon'],
  ['armour', 'Armour'],
  ['charm', 'Charm']
];

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function ensureEquipmentShape(player) {
  player.equipment = player.equipment || {};
  player.equipment.weapon = player.equipment.weapon ?? null;
  player.equipment.helm = player.equipment.helm ?? null;
  player.equipment.chest = player.equipment.chest ?? null;
  player.equipment.legs = player.equipment.legs ?? null;
  player.equipment.trinket = player.equipment.trinket ?? player.equipment.jewelry ?? null;
  delete player.equipment.jewelry;
}

export function renderInventory(player, game) {
  const el = document.getElementById('inventory');
  if (!el) return;

  ensureEquipmentShape(player);
  game.uiState.inventoryPageBySubtab = game.uiState.inventoryPageBySubtab || {};

  const coterieAvailable = isGravecallerCommander(player);
  let subtab = game.uiState.inventorySubtab || 'equipment';
  if (['resources','loot'].includes(subtab)) subtab = 'bag';
  if (!['equipment','bag','coterie'].includes(subtab)) subtab = 'equipment';
  game.uiState.inventorySubtab = subtab;
  if (subtab === 'coterie' && !coterieAvailable) {
    subtab = 'equipment';
    game.uiState.inventorySubtab = subtab;
  }
  el.dataset.inventorySubtab = subtab;

  el.innerHTML = `
    <div class="subtab-bar">
      <button class="subtab ${subtab === 'equipment' ? 'active' : ''}" data-inventory-subtab="equipment">Equipment</button>
      ${coterieAvailable ? `<button class="subtab ${subtab === 'coterie' ? 'active' : ''}" data-inventory-subtab="coterie">Coterie</button>` : ''}
      <button class="subtab ${subtab === 'bag' ? 'active' : ''}" data-inventory-subtab="bag">Bag</button>
    </div>

    <p class="gear-bag-capacity">Gear bag: ${gearBagCount(player)} / 20<span class="gear-bag-help"> · Materials and consumables do not use gear slots. Mythical and Primordial drops unlock at Combat Level 50.</span></p>
    ${subtab === 'equipment' ? renderInventoryEquipment(player, game) : ''}
    ${subtab === 'coterie' ? renderInventoryCoterie(player, game) : ''}
    ${subtab === 'bag' ? renderInventoryBag(player, game) : ''}
  `;
}

export function bindInventoryButtons(player, game, rerender) {
  document.querySelectorAll('[data-bag-filter]').forEach(button => button.onclick = () => {
    game.uiState.inventoryBagFilter = button.dataset.bagFilter;
    rerender();
  });
  bindInventoryPreviewRows(player, game, rerender);
  bindScrollReadButtons(document,player,game,rerender);
  bindEquipmentSlotRows(player, game, rerender);
  bindCoterieRows(player, game, rerender);
  bindEquipmentActionButtons(player, game, rerender);
  bindCoterieActionButtons(player, game, rerender);
  renderEquipmentPreviewCanvases(player);


}

function bindScrollReadButtons(root,player,game,rerender) {
  root.querySelectorAll('[data-read-skill-scroll]').forEach(button=>{
    button.onclick=()=>useBagItem(player,Number(button.dataset.readSkillScroll),game,rerender);
  });
}
function bindInventoryPreviewRows(player, game, rerender) {
  document.querySelectorAll('.inventory-list-row[data-inventory-item-index]:not([data-coterie-inventory-row])').forEach(row => {
    const selectItem = () => {
      const index = Number(row.dataset.inventoryItemIndex);
      const subtab = row.dataset.inventorySubtab || game.uiState.inventorySubtab || 'equipment';
      const pane = document.querySelector('[data-inventory-detail]');
      const entry = player.inventory?.[index];

      if (!pane || !entry) return;

      game.uiState.selectedInventoryBagIndexBySubtab = game.uiState.selectedInventoryBagIndexBySubtab || {};
      game.uiState.selectedInventoryBagIndexBySubtab[subtab] = index;
      if (subtab === 'equipment') {
        game.uiState.equipmentFocusRegion = 'inventory';
        updateEquipmentFocusRegionDom(game);
      }

      document.querySelectorAll('.inventory-list-row[data-inventory-item-index]').forEach(itemRow => {
        itemRow.classList.toggle('active', itemRow === row);
        itemRow.setAttribute('aria-selected', itemRow === row ? 'true' : 'false');
      });

      pane.innerHTML = inventoryItemDetail(player, entry, {
        includeComparison: subtab === 'equipment'
      });
      bindScrollReadButtons(pane,player,game,rerender);
      bindEquipmentActionButtons(player, game, rerender);
    };

    row.onfocus = selectItem;
    row.onclick = selectItem;
    row.ondblclick = () => {
      performInventoryPrimaryAction(player, row, game, rerender);
    };
  });


}

export function performInventoryPrimaryAction(player, row, game, rerender) {
  if (!player || !row) return false;

  const recipeId = row.dataset?.inventoryRecipeId;

  if (recipeId) {
    game?.log?.('Visit Corin’s workshop in Orrakai to craft items.');return false;
  }

  const bagIndex = Number(row.dataset?.inventoryItemIndex);
  const entry = player.inventory?.[bagIndex];
  const item = entry ? instanceGearItem(ITEMS[entry.id],entry) : null;

  if (!entry || !item) return false;

  if (item.slot) {
    equipBagItem(player, bagIndex, game, rerender);
    return true;
  }

  if (isUsable(item)) {
    useBagItem(player, bagIndex, game, rerender);
    return true;
  }

  game?.log?.(`${item.name} has no direct action.`);
  return false;
}

export function performInventorySalvageAction(player, row, game, rerender) {
  const bagIndex = Number(row?.dataset?.inventoryItemIndex);
  const entry = player?.inventory?.[bagIndex];
  const item = entry ? instanceGearItem(ITEMS[entry.id],entry) : null;
  const coterieOwner = getCoterieGearOwnerLabel(player, item?.id);

  if(isItemLocked(entry)){game?.log?.('This item is locked. Unlock it in your inventory before deconstructing it.');return false;}
  if (!entry || !item || !isSalvageable(item) || isGearInstanceEquipped(player,entry)) {
    game?.log?.(coterieOwner
      ? `${item.name} is ${coterieOwner.toLowerCase()} and cannot be salvaged.`
      : item
        ? `${item.name} cannot be salvaged.`
        : 'That item cannot be salvaged.');
    return false;
  }

  const confirmationKey = inventoryDisposalKey(entry,bagIndex);
  if (salvageNeedsConfirmation(item) && game?.uiState?.pendingInventorySalvageKey !== confirmationKey) {
    game.uiState = game.uiState || {};
    game.uiState.pendingInventorySalvageKey = confirmationKey;
    game?.log?.(`Hold X again to confirm salvaging ${item.name}.`);
    return false;
  }

  if (game?.uiState) {
    game.uiState.pendingInventorySalvageKey = null;
  }

  const salvaged = salvageInventoryItem(player, bagIndex, game);
  if (salvaged) rerender?.();
  return salvaged;
}

export function bindCharacterButtons(player, game, rerender) {
  bindEquipmentActionButtons(player, game, rerender);
  document.querySelectorAll('[data-unequip-slot]').forEach(btn => {
    btn.onclick = () => {
      const slot = btn.dataset.unequipSlot;
      unequipSlot(player, slot, game, rerender);
    };
  });

}

// -----------------------------------------------------------------------------
// INVENTORY PANELS
// -----------------------------------------------------------------------------

function renderInventoryEquipment(player, game) {
  const items = (player.inventory || [])
    .map((entry, index) => ({ entry, index, def: ITEMS[entry.id] }))
    .filter(x => x.def?.slot);

  game.uiState.equipmentFocusRegion = game.uiState.equipmentFocusRegion || 'inventory';
  const paged = inventoryList(items);
  const selectedInventory = resolveSelectedInventoryItem(game, 'equipment', paged.items);
  const selectedSlot = resolveSelectedEquipmentSlot(game);
  const detailMarkup = game.uiState.equipmentFocusRegion === 'slots'
    ? equipmentSlotDetail(player, selectedSlot)
    : selectedInventory
      ? inventoryItemDetail(player, selectedInventory.entry, { includeComparison: true })
      : inventoryEmptyDetail('No equippable items in your bag.');

  return `
    <div class="equipment-workstation" data-equipment-workstation data-equipment-focus-region="${escapeHtml(game.uiState.equipmentFocusRegion)}">
      <section class="equipment-inventory-pane" aria-label="Inventory equipment list">
        <div class="inventory-list-heading">
          <div>
            <h2>Armory</h2>
            ${renderActiveSetBonusSummary(player)}
          </div>
          ${inventoryListSummary(paged)}
        </div>
        <div class="inventory-name-list equipment-inventory-list" role="listbox" aria-label="Equippable inventory items">
          ${paged.items.length
            ? paged.items.map(x => inventoryItemRow(player, x.entry, x.index, 'equipment', selectedInventory?.index === x.index)).join('')
            : `<p class="tag equipment-empty-list">No equippable items in your bag.</p>`
          }
        </div>
      </section>

      <section class="equipment-character-pane" aria-label="Equipped character gear">
        <h2 class="equipment-compact-heading">Equipped</h2>
        <div class="equipment-preview-card">
          <canvas
            class="equipment-preview-canvas"
            width="260"
            height="320"
            data-equipment-preview-canvas
            aria-label="${escapeHtml(player.name || 'Wayfarer')} equipment preview"
          ></canvas>
          <div class="equipment-preview-caption">
            <h2>${escapeHtml(player.name || 'Wayfarer')}</h2>
            <p class="tag">${escapeHtml(player.className || 'Classless')}</p>
          </div>
        </div>

        <div class="equipment-slot-grid" role="listbox" aria-label="Equipped gear slots">
          ${EQUIPMENT_SLOT_ORDER.map(([slot, label]) => equipmentSlotButton(player, slot, label, selectedSlot === slot)).join('')}
        </div>
      </section>

      <section class="equipment-detail-pane inventory-detail-pane" data-inventory-detail aria-live="polite">
        ${detailMarkup}
      </section>
    </div>
  `;
}

function renderInventoryCoterie(player, game) {
  migratePlayer(player);

  if (!isGravecallerCommander(player)) {
    return `
      <div class="card">
        <h2>Bone Coterie</h2>
        <p class="tag">Commander of the Dead is required.</p>
      </div>
    `;
  }

  const skeletons = getCoterieSkeletons(player);
  const placement = resolveCoteriePlacement(player, game);
  game.uiState.coterieFocusRegion = placement ? 'skeletons' : (game.uiState.coterieFocusRegion || 'inventory');

  const selectedSkeletonIndex = resolveSelectedCoterieSkeletonIndex(game, skeletons);
  const selectedSlot = resolveSelectedCoterieSlot(game);
  const gearItems = getCoterieInventoryGearItems(player);
  const paged = inventoryList(gearItems);
  const selectedInventory = resolveSelectedInventoryItem(game, 'coterie', paged.items);
  const previewEntry = placement?.entry || selectedInventory?.entry || null;
  const previewItem = previewEntry ? instanceGearItem(ITEMS[previewEntry.id],previewEntry) : null;
  const detailMarkup = previewEntry
    ? coterieInventoryItemDetail(player, previewEntry, selectedSkeletonIndex, selectedSlot, { placing: !!placement })
    : inventoryEmptyDetail('No skeleton-compatible gear in your bag.');

  return `
    <div
      class="coterie-workstation"
      data-coterie-workstation
      data-coterie-focus-region="${escapeHtml(game.uiState.coterieFocusRegion)}"
      data-coterie-placing="${placement ? 'true' : 'false'}"
    >
      <section class="coterie-inventory-pane" aria-label="Bone Coterie inventory gear">
        <div class="inventory-list-heading">
          <div>
            <h2>Coterie Gear</h2>
            <p class="tag">${placement
              ? `Choose a skeleton slot for ${escapeHtml(previewItem?.name || 'this gear')}.`
              : 'A picks gear, then choose a skeleton slot on the right.'}</p>
          </div>
          ${inventoryListSummary(paged)}
        </div>
        <div class="inventory-name-list coterie-inventory-list" role="listbox" aria-label="Skeleton-compatible inventory gear">
          ${paged.items.length
            ? paged.items.map(x => coterieInventoryItemRow(
              player,
              x.entry,
              x.index,
              selectedInventory?.index === x.index,
              placement?.bagIndex === x.index
            )).join('')
            : `<p class="tag equipment-empty-list">No skeleton-compatible gear in your bag.</p>`
          }
        </div>
        <div class="coterie-inline-detail inventory-detail-pane" data-coterie-detail aria-live="polite">
          ${detailMarkup}
        </div>
      </section>

      <section class="coterie-squad-pane" aria-label="Bone Coterie skeleton equipment">
        <div class="inventory-list-heading">
          <div>
            <h2>Bone Coterie</h2>
            <p class="tag">${placement ? 'Move to a slot and press A to place gear.' : 'Skeleton slots receive gear from the selected inventory item.'}</p>
          </div>
        </div>
        <div class="coterie-skeleton-list" role="listbox" aria-label="Skeleton gear slots">
          ${skeletons.map((skeleton, index) => coterieSkeletonCard(
            player,
            skeleton,
            index,
            selectedSkeletonIndex,
            selectedSlot,
            previewItem,
            !!placement
          )).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderInventoryBag(player, game) {
  const filters = ['all','resources','supplies','scrolls','tools'];
  const requested = game.uiState.inventoryBagFilter || 'all';
  const filter = filters.includes(requested) ? requested : 'all';
  const matches = def => filter === 'all' || (filter === 'resources' ? isResourceType(def.type)
    : filter === 'scrolls' ? def.type === 'scroll' : filter === 'tools' ? def.type === 'tool'
    : !isResourceType(def.type) && !['scroll','tool'].includes(def.type));
  const items = (player.inventory || []).map((entry,index)=>({entry,index,def:ITEMS[entry.id]}))
    .filter(x=>x.def && !x.def.slot && matches(x.def));
  const summary = `<div class="bag-filters" aria-label="Bag filters">${filters.map(id=>`<button type="button" data-bag-filter="${id}" aria-pressed="${filter===id}">${id==='all'?'All items':id[0].toUpperCase()+id.slice(1)}</button>`).join('')}</div>`;
  return inventoryBrowser(player,game,'bag','Bag',inventoryList(items),{summary});
}

// -----------------------------------------------------------------------------
// LIST / DETAIL INVENTORY
// -----------------------------------------------------------------------------

function inventoryBrowser(player, game, subtab, title, paged, options = {}) {
  const selected = resolveSelectedInventoryItem(game, subtab, paged.items);

  return `
    <div class="inventory-browser-layout">
      <section class="inventory-list-pane">
        <div class="inventory-list-heading">
          <div>
            <h2>${escapeHtml(title)}</h2>
            ${options.summary || ''}
          </div>
          ${inventoryListSummary(paged)}
        </div>
        <div class="inventory-name-list" role="listbox" aria-label="${escapeHtml(title)}">
          ${paged.items.map(x => inventoryItemRow(player, x.entry, x.index, subtab, selected?.index === x.index)).join('')}
        </div>
      </section>
      <section class="inventory-detail-pane" data-inventory-detail aria-live="polite">
        ${selected
          ? inventoryItemDetail(player, selected.entry)
          : inventoryEmptyDetail('No item selected.')
        }
      </section>
    </div>
  `;
}

function inventoryItemRow(player, entry, index, subtab, selected) {
  const item = instanceGearItem(ITEMS[entry.id],entry);
  const rarity = RARITY?.[item?.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const coterieOwner = getCoterieGearOwnerLabel(player, item?.id);

  if (!item) {
    return `
      <button
        class="inventory-list-row ${selected ? 'active' : ''}"
        data-inventory-item-index="${index}"
        data-inventory-subtab="${escapeHtml(subtab)}"
        ${subtab === 'equipment' ? 'data-equipment-focus-region="inventory"' : ''}
      >
        <span class="inventory-list-rarity" style="--rarity:#b8c0cc"></span>
        <span class="item-icon inventory-list-icon">${slotIconMarkup('empty')}</span>
        <span class="inventory-list-name">Unknown Item</span>
      </button>
    `;
  }

  return `
    <button
      class="inventory-list-row ${selected ? 'active' : ''}"
      data-inventory-item-index="${index}"
      data-inventory-subtab="${escapeHtml(subtab)}"
      ${subtab === 'equipment' ? 'data-equipment-focus-region="inventory"' : ''}
      role="option"
      aria-selected="${selected ? 'true' : 'false'}"
    >
      <span class="inventory-list-rarity" style="--rarity:${rarityColor}"></span>
      <span class="item-icon inventory-list-icon" style="--rarity:${rarityColor}">${itemIconMarkup(item, { classId: player.classId })}</span>
      <span class="inventory-list-name inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)}</span>
      ${isItemLocked(entry)?'<span class="inventory-lock-badge">Locked</span>':''}
      ${entry.qty > 1 || coterieOwner ? `
        <span class="inventory-list-meta">
          ${entry.qty > 1 ? `<b class="inventory-list-quantity">x${entry.qty}</b>` : ''}
          ${coterieOwner ? `<b class="inventory-list-owner">${escapeHtml(coterieOwner)}</b>` : ''}
        </span>
      ` : ''}
    </button>
  `;
}

function inventoryItemDetail(player, entry, options = {}) {
  const item = instanceGearItem(ITEMS[entry.id],entry);

  if (!item) {
    return inventoryEmptyDetail(`Unknown item: ${entry.id}`);
  }

  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const qty = entry.qty > 1 ? ` x${entry.qty}` : '';
  const playerEquipped = Object.values(player.equippedGear || {}).some(ref=>ref?.instanceId && ref.instanceId===entry.instanceId);
  const coterieOwner = getCoterieGearOwnerLabel(player, item.id,entry);
  const equipped = playerEquipped || !!coterieOwner;
  const primaryHint = item.slot ? 'A Equip' : item.type==='scroll' ? 'A Read · double-click to learn' : isUsable(item) ? 'A Use' : '';
  const salvageHint = isItemLocked(entry)?'Locked · Cannot sell or deconstruct':isSalvageable(item) && !equipped ? 'Blacksmith: Deconstruct' : '';
  const bagIndex = findInventoryEntryIndex(player, entry);

  return `
    <div class="inventory-detail-content">
      <div class="inventory-detail-header">
        <div class="item-icon inventory-detail-icon" style="--rarity:${rarityColor}">
          ${itemIconMarkup(item, { classId: player.classId })}
        </div>
        <div>
          <h2 class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)}${qty}</h2>
          <p class="tag">${escapeHtml(rarity?.name || item.rarity || 'Item')}${item.slot?` · ${escapeHtml(slotLabel(item.slot))}`:''}${isUpgradable(item)?` · Tier ${entry.upgradeTier||1}/20`:''}${playerEquipped ? ' · Equipped' : coterieOwner ? ` · ${escapeHtml(coterieOwner)}` : ''}</p>
        </div>
      </div>

      <div class="inventory-primary-actions">
        ${options.includeComparison ? equipmentActionButtons({bagIndex,slot:normalizeEquipmentSlot(item.slot),item,entry,equipped,disposal:false}) : ''}
        ${inventoryLockControls(entry,{bagIndex})}
      </div>
      ${options.includeComparison ? equipmentComparisonBlock(player, item,entry) : ''}
      ${itemStatBlock(player, item,entry)}
      <details class="inventory-extended-details" ${options.includeComparison?'':'open'}><summary tabindex="0">More details</summary>
      ${equipmentDescriptionMarkup(item)}
      ${tierIdentityBlock(player,item,entry)}


      ${legendaryEffectBlock(item)}

      ${item.type==='scroll' ? `<button type="button" data-read-skill-scroll="${bagIndex}">Read and learn</button>` : ''}

      ${options.includeComparison ? equipmentActionButtons({
        bagIndex,
        slot: normalizeEquipmentSlot(item.slot),
        item,
        entry,
        equipped,
        disposalOnly:true
      }) : ''}
      </details>

      ${inventoryControllerHints([primaryHint, salvageHint].filter(Boolean))}
    </div>
  `;
}

function inventoryControllerHints(hints) {
  if (!hints.length) return '';

  return `
    <div class="inventory-controller-hints">
      ${hints.map(hint => `<span>${escapeHtml(hint)}</span>`).join('')}
    </div>
  `;
}

function equipmentDescriptionMarkup(item){
 if(item.type==='scroll'){
  const ability=getAbilityById(item.learnsAbility),requirements=abilityRequirements(ability||{});
  return `<p class="inventory-detail-description">Learn ${escapeHtml(ability?.name||'this technique')}: ${escapeHtml(abilitySummary(ability))}</p>${requirements?`<p class="tag">Requires ${escapeHtml(requirements)}.</p>`:''}`;
 }
 const purpose=equipmentPurpose(item);
 return `<p class="inventory-detail-description">${escapeHtml(purpose)}</p>${item.legendaryPassive&&item.desc&&!item.setId?`<details class="information-extra"><summary>Item lore</summary><p>${escapeHtml(item.desc)}</p></details>`:''}`;
}

function legendaryEffectBlock(item) {
  const effect = getLegendaryEffectDetails(item);
  if (!effect) return '';

  return `
    <section class="inventory-legendary-effect">
      <h3>${escapeHtml(effect.name)}</h3>
      <p>${escapeHtml(effect.description)}</p>
    </section>
  `;
}

function inventoryEmptyDetail(message) {
  return `
    <div class="inventory-detail-empty">
      <h2>Details</h2>
      <p class="tag">${escapeHtml(message)}</p>
    </div>
  `;
}

function resolveSelectedInventoryItem(game, subtab, items) {
  game.uiState.selectedInventoryBagIndexBySubtab = game.uiState.selectedInventoryBagIndexBySubtab || {};
  const storedIndex = Number(game.uiState.selectedInventoryBagIndexBySubtab[subtab]);
  const selected = items.find(item => item.index === storedIndex) || items[0] || null;

  if (selected) game.uiState.selectedInventoryBagIndexBySubtab[subtab] = selected.index;
  return selected;
}

function resolveSelectedEquipmentSlot(game) {
  const fallback = EQUIPMENT_SLOT_ORDER[0][0];
  const requested = game?.uiState?.selectedEquipmentSlot || fallback;
  const valid = EQUIPMENT_SLOT_ORDER.some(([slot]) => slot === requested)
    ? requested
    : fallback;

  if (game?.uiState) game.uiState.selectedEquipmentSlot = valid;
  return valid;
}

function equipmentSlotButton(player, slot, label, selected) {
  const itemId = player.equipment?.[slot];
  const item = itemId ? instanceGearItem(ITEMS[itemId],player.equippedGear?.[slot]) : null;
  const rarity = RARITY?.[item?.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const upgradeLevel = item ? getGearUpgradeLevel(player, slot) : 0;
  const summary = item
    ? compactItemSummary(player, item)
    : 'Empty';

  return `
    <button
      class="equipment-slot-button ${selected ? 'active' : ''} ${item ? '' : 'empty'}"
      data-equipment-slot="${escapeHtml(slot)}"
      data-equipment-focus-region="slots"
      role="option"
      aria-selected="${selected ? 'true' : 'false'}"
    >
      <span class="item-icon equipment-slot-button-icon" style="--rarity:${rarityColor}">
        ${item ? itemIconMarkup(item, { classId: player.classId }) : slotIconMarkup(slot)}
      </span>
      <span class="equipment-slot-button-copy">
        <span class="equipment-slot-button-label">${escapeHtml(label)}</span>
        <b class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${item ? `${escapeHtml(item.name)} · Tier ${upgradeLevel+1}/20` : 'Empty'}</b>
        ${isItemLocked(player.equippedGear?.[slot])?'<small>Locked</small>':''}
        <small>${escapeHtml(summary)}</small>
      </span>
    </button>
  `;
}

function equipmentSlotDetail(player, slot) {
  const label = slotLabel(slot);
  const itemId = player.equipment?.[slot];
  const item = itemId ? instanceGearItem(ITEMS[itemId],player.equippedGear?.[slot]) : null;

  if (!item) {
    return `
      <div class="inventory-detail-empty">
        <h2>${escapeHtml(label)}</h2>
        <p class="tag">This slot is empty.</p>
        <p class="inventory-detail-description">Hold Y to switch to the inventory list, then press A on a compatible item to equip it.</p>
        ${equipmentActionButtons({ slot })}
        ${inventoryControllerHints(['Hold Y Inventory'])}
      </div>
    `;
  }

  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const upgradeLevel = getGearUpgradeLevel(player, slot);

  return `
    <div class="inventory-detail-content">
      <div class="inventory-detail-header">
        <div class="item-icon inventory-detail-icon" style="--rarity:${rarityColor}">
          ${itemIconMarkup(item, { classId: player.classId })}
        </div>
        <div>
          <h2 class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)} · Tier ${upgradeLevel+1}/20</h2>
          <p class="tag">${escapeHtml(label)} / ${escapeHtml(rarity?.name || item.rarity || 'Item')} / Equipped</p>
        </div>
      </div>

      <div class="inventory-primary-actions">
        ${equipmentActionButtons({ slot, item, entry:player.equippedGear?.[slot], equipped:true,disposal:false })}
        ${inventoryLockControls(player.equippedGear?.[slot],{slot})}
      </div>
      <p class="equipment-comparison-summary" data-comparison="equipped">Currently equipped</p>
      ${itemStatBlock(player, item)}
      <details class="inventory-extended-details"><summary tabindex="0">Effects & upgrades</summary>
      ${equipmentDescriptionMarkup(item)}
      ${tierIdentityBlock(player,item,player.equippedGear?.[slot])}
      ${upgradeCostBlock(player, slot, item)}
      ${legendaryEffectBlock(item)}

      ${equipmentActionButtons({ slot, item, entry:player.equippedGear?.[slot], equipped: true,disposalOnly:true })}
      </details>
      ${inventoryControllerHints(['A Unequip', 'Hold Y Inventory'])}
    </div>
  `;
}

function coterieSkeletonCard(player, skeleton, skeletonIndex, selectedSkeletonIndex, selectedSlot, pendingItem = null, placing = false) {
  const role = skeleton?.role || `Skeleton ${skeletonIndex + 1}`;
  const summary = coterieSkeletonStatSummary(player, skeletonIndex);

  return `
    <section class="coterie-skeleton-card ${selectedSkeletonIndex === skeletonIndex ? 'active' : ''}">
      <div class="coterie-skeleton-heading">
        <div>
          <h3>${escapeHtml(role)}</h3>
          <p class="tag">${escapeHtml(summary)}</p>
        </div>
      </div>
      <div class="coterie-skeleton-body">
        ${coterieSkeletonVisual(player, skeleton)}
        <div class="coterie-slot-list">
          ${COTERIE_SLOT_ORDER.map(([slot, label]) => {
            const itemId = skeleton?.equipment?.[slot] || null;
            const item = itemId ? instanceGearItem(ITEMS[itemId],skeleton.equippedGear?.[slot]) : null;
            const rarity = RARITY?.[item?.rarity];
            const rarityColor = rarity?.color || '#b8c0cc';
            const active = selectedSkeletonIndex === skeletonIndex && selectedSlot === slot;
            const compatible = pendingItem ? isItemCompatibleWithCoterieSlot(pendingItem, slot) : true;
            return `
              <button
                class="coterie-slot-button ${active ? 'active' : ''} ${item ? '' : 'empty'} ${placing ? 'placement-target' : ''} ${placing && compatible ? 'placement-compatible' : ''} ${placing && !compatible ? 'placement-incompatible' : ''}"
                data-coterie-skeleton-index="${skeletonIndex}"
                data-coterie-slot="${escapeHtml(slot)}"
                data-coterie-focus-region="skeletons"
                data-coterie-compatible="${compatible ? 'true' : 'false'}"
                role="option"
                aria-selected="${active ? 'true' : 'false'}"
              >
                <span class="item-icon equipment-slot-button-icon" style="--rarity:${rarityColor}">
                  ${item ? itemIconMarkup(item, { classId: player.classId }) : slotIconMarkup(coterieSlotIcon(slot))}
                </span>
                <span class="equipment-slot-button-copy">
                  <span class="equipment-slot-button-label">${escapeHtml(label)}</span>
                  <b class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${item ? escapeHtml(item.name) : 'Empty'}</b>
                  <small>${escapeHtml(item ? compactItemSummary(player, item) : 'Ready for gear')}</small>
                </span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function coterieSkeletonVisual(player, skeleton) {
  const equipment = skeleton?.equipment || {};
  const weapon = equipment.weapon ? instanceGearItem(ITEMS[equipment.weapon],skeleton.equippedGear?.weapon) : null;
  const armour = equipment.armour ? instanceGearItem(ITEMS[equipment.armour],skeleton.equippedGear?.armour) : null;
  const charm = equipment.charm ? instanceGearItem(ITEMS[equipment.charm],skeleton.equippedGear?.charm) : null;
  const weaponRarity = RARITY?.[weapon?.rarity]?.color || '#b8c0cc';
  const armourRarity = RARITY?.[armour?.rarity]?.color || '#6f7480';
  const charmRarity = RARITY?.[charm?.rarity]?.color || '#b68cff';

  return `
    <div class="coterie-skeleton-visual" aria-hidden="true">
      <div class="coterie-skeleton-figure ${armour ? 'has-armour' : ''} ${charm ? 'has-charm' : ''}">
        <span class="coterie-bone coterie-skull"></span>
        <span class="coterie-bone coterie-neck"></span>
        <span class="coterie-bone coterie-ribcage" style="--armour:${armourRarity}"></span>
        <span class="coterie-bone coterie-arm left"></span>
        <span class="coterie-bone coterie-arm right"></span>
        <span class="coterie-bone coterie-leg left"></span>
        <span class="coterie-bone coterie-leg right"></span>
        ${weapon ? `
          <span class="coterie-held-weapon" style="--weapon:${weaponRarity}">
            ${itemIconMarkup(weapon, { classId: player.classId })}
          </span>
        ` : ''}
        ${charm ? `
          <span class="coterie-worn-charm" style="--charm:${charmRarity}">
            ${itemIconMarkup(charm, { classId: player.classId })}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

function coterieInventoryItemRow(player, entry, index, selected, placing) {
  const item = instanceGearItem(ITEMS[entry.id],entry);
  const rarity = RARITY?.[item?.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const slot = firstCompatibleCoterieSlot(item);
  const slotText = slot ? coterieSlotLabel(slot) : itemTypeLabel(item?.type || 'Gear');

  if (!item) {
    return inventoryItemRow(player, entry, index, 'coterie', selected);
  }

  return `
    <button
      class="inventory-list-row ${selected ? 'active' : ''} ${placing ? 'pending-placement' : ''}"
      data-inventory-item-index="${index}"
      data-inventory-subtab="coterie"
      data-coterie-inventory-row="true"
      data-coterie-focus-region="inventory"
      role="option"
      aria-selected="${selected ? 'true' : 'false'}"
    >
      <span class="inventory-list-rarity" style="--rarity:${rarityColor}"></span>
      <span class="item-icon inventory-list-icon" style="--rarity:${rarityColor}">${itemIconMarkup(item, { classId: player.classId })}</span>
      <span class="inventory-list-name inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)}</span>
      <b class="inventory-list-quantity">${escapeHtml(slotText)}</b>
      ${isItemLocked(entry)?'<span class="inventory-lock-badge">Locked</span>':''}
      ${entry.qty > 1 ? `<b class="inventory-list-quantity">x${entry.qty}</b>` : ''}
    </button>
  `;
}

function coterieSlotDetail(player, skeletonIndex, slot, pendingItem = null, pendingBagIndex = null) {
  const skeleton = getCoterieSkeletons(player)[skeletonIndex] || getCoterieSkeletons(player)[0];
  const itemId = skeleton?.equipment?.[slot] || null;
  const item = itemId ? instanceGearItem(ITEMS[itemId],skeleton.equippedGear?.[slot]) : null;
  const role = skeleton?.role || `Skeleton ${skeletonIndex + 1}`;
  const label = coterieSlotLabel(slot);
  const canPlace = pendingItem && isItemCompatibleWithCoterieSlot(pendingItem, slot);

  if (pendingItem) {
    const rarity = RARITY?.[pendingItem.rarity];
    const rarityColor = rarity?.color || '#b8c0cc';

    return `
      <div class="inventory-detail-content">
        <div class="inventory-detail-header">
          <div class="item-icon inventory-detail-icon" style="--rarity:${rarityColor}">
            ${itemIconMarkup(pendingItem, { classId: player.classId })}
          </div>
          <div>
            <h2 class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(pendingItem.name)}</h2>
            <p class="tag">${canPlace ? `Place in ${role} ${label}` : `Cannot fit ${role} ${label}`}</p>
          </div>
        </div>

        ${coterieGearContributionBlock(pendingItem,player.inventory[pendingBagIndex])}
        ${coterieComparisonBlock(player, pendingItem, item,player.inventory[pendingBagIndex],skeleton.equippedGear?.[slot])}
        ${canPlace ? coterieActionButtons({ bagIndex: pendingBagIndex, skeletonIndex, slot, item: pendingItem, placing: true }) : ''}
        ${inventoryControllerHints([canPlace ? 'A Place Gear' : 'Choose a compatible slot'])}
      </div>
    `;
  }

  if (!item) {
    return `
      <div class="inventory-detail-empty">
        <h2>${escapeHtml(role)} ${escapeHtml(label)}</h2>
        <p class="tag">This skeleton slot is empty.</p>
        <p class="inventory-detail-description">Choose gear from the left list, then place it here.</p>
        ${inventoryControllerHints(['A Select Slot'])}
      </div>
    `;
  }

  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';

  return `
    <div class="inventory-detail-content">
      <div class="inventory-detail-header">
        <div class="item-icon inventory-detail-icon" style="--rarity:${rarityColor}">
          ${itemIconMarkup(item, { classId: player.classId })}
        </div>
        <div>
          <h2 class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)}</h2>
          <p class="tag">${escapeHtml(role)} ${escapeHtml(label)} · ${escapeHtml(rarity?.name || item.rarity || 'Item')} · Tier ${skeleton.equippedGear?.[slot]?.upgradeTier||1}/20</p>
        </div>
      </div>

      <p class="inventory-detail-description">Adds the contribution below to this skeleton. Its overall strength also grows with your Level, Summoning and skill mastery.</p>
      ${coterieGearContributionBlock(item,skeleton.equippedGear?.[slot])}
      ${coterieSpecialEffectNote(item)}

      ${coterieActionButtons({ skeletonIndex, slot, item, equipped: true })}
      ${inventoryLockControls(skeleton.equippedGear?.[slot],{slot,skeletonIndex})}
      ${inventoryControllerHints(['A Unequip'])}
    </div>
  `;
}

function coterieInventoryItemDetail(player, entry, skeletonIndex, slot, options = {}) {
  const item = instanceGearItem(ITEMS[entry.id],entry);

  if (!item) {
    return inventoryEmptyDetail(`Unknown item: ${entry.id}`);
  }

  const skeleton = getCoterieSkeletons(player)[skeletonIndex] || getCoterieSkeletons(player)[0];
  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const qty = entry.qty > 1 ? ` x${entry.qty}` : '';
  const bagIndex = findInventoryEntryIndex(player, entry);
  const canCompare = isItemCompatibleWithCoterieSlot(item, slot);
  const currentItem = canCompare && skeleton?.equipment?.[slot] ? ITEMS[skeleton.equipment[slot]] : null;

  return `
    <div class="inventory-detail-content">
      <div class="inventory-detail-header">
        <div class="item-icon inventory-detail-icon" style="--rarity:${rarityColor}">
          ${itemIconMarkup(item, { classId: player.classId })}
        </div>
        <div>
          <h2 class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)}${qty}</h2>
          <p class="tag">Tier ${entry.upgradeTier||1}/20 · ${options.placing
            ? `Choose a slot for ${escapeHtml(item.name)}`
            : `A chooses this gear for placement`}</p>
        </div>
      </div>

      <p class="inventory-detail-description">Equip this on a compatible skeleton slot to add the contribution below.</p>
      ${coterieGearContributionBlock(item,entry)}
      ${canCompare ? coterieComparisonBlock(player, item, currentItem,entry,skeleton.equippedGear?.[slot]) : ''}
      ${coterieSpecialEffectNote(item)}

      ${coterieActionButtons({ bagIndex, skeletonIndex, slot, item, choosing: true })}
      ${inventoryLockControls(entry,{bagIndex})}
      ${inventoryControllerHints([options.placing ? 'A Place on Right' : 'A Choose Gear'])}
    </div>
  `;
}

function coterieActionButtons({ bagIndex = null, skeletonIndex = 0, slot = 'weapon', item = null, equipped = false, choosing = false, placing = false } = {}) {
  const actions = [];

  if (bagIndex !== null && item && choosing) {
    actions.push(`
      <button
        data-coterie-action="choose"
        data-inventory-item-index="${bagIndex}"
      >Choose Slot</button>
    `);
  }

  if (bagIndex !== null && item && placing) {
    actions.push(`
      <button
        data-coterie-action="equip"
        data-inventory-item-index="${bagIndex}"
        data-coterie-skeleton-index="${skeletonIndex}"
        data-coterie-slot="${escapeHtml(slot)}"
      >Equip to Skeleton</button>
    `);
  }

  if (equipped && item) {
    actions.push(`
      <button
        data-coterie-action="unequip"
        data-coterie-skeleton-index="${skeletonIndex}"
        data-coterie-slot="${escapeHtml(slot)}"
      >Return to Bag</button>
    `);
  }

  if (!actions.length) return '';

  return `
    <div class="equipment-action-row">
      ${actions.join('')}
    </div>
  `;
}

function coterieGearContributionBlock(item,entry=null) {
  const bonus = getCoterieGearBonus(item,entry);

  return `
    <section class="equipment-comparison-block">
      <h3>Skeleton Contribution</h3>
      <div class="stat-row"><span>Damage</span><b>${formatSignedNumber(bonus.damage)}</b></div>
      <div class="stat-row"><span>Armour</span><b>${formatSignedNumber(bonus.armour)}</b></div>
      <div class="stat-row"><span>Health</span><b>${formatSignedNumber(bonus.maxHp)}</b></div>
    </section>
  `;
}

function coterieSpecialEffectNote(item) {
 const info=getItemSetInfo(item);
 return item.legendaryPassive||info.set||info.weaponSet?'<p class="tag">Skeleton gear contributes damage, armour and health. Player set bonuses and legendary effects require equipping the item on your character.</p>':'';
}

function coterieComparisonBlock(player, item, currentItem,entry=null,currentEntry=null) {
  if (!item) return '';
  if (!currentItem) return '<p class="tag">Selected skeleton slot is empty.</p>';

  const next = getCoterieGearBonus(item,entry);
  const current = getCoterieGearBonus(currentItem,currentEntry);
  const rows = [
    ['Damage', next.damage - current.damage],
    ['Armour', next.armour - current.armour],
    ['Health', next.maxHp - current.maxHp]
  ];

  return `
    <section class="equipment-comparison-block">
      <h3>Compared With Skeleton Slot</h3>
      <div class="stat-row">
        <span>Equipped</span>
        <b>${currentItem ? escapeHtml(currentItem.name) : 'Empty'}</b>
      </div>
      ${rows.map(([label, delta]) => `
        <div class="stat-row">
          <span>${escapeHtml(label)}</span>
          <b class="${delta > 0 ? 'good-text' : delta < 0 ? 'bad-text' : ''}">${formatSignedNumber(delta)}</b>
        </div>
      `).join('')}
    </section>
  `;
}

function bindCoterieRows(player, game, rerender) {
  document.querySelectorAll('[data-coterie-slot][data-coterie-focus-region="skeletons"]').forEach(row => {
    const selectSlot = () => {
      const skeletonIndex = Number(row.dataset.coterieSkeletonIndex || 0);
      const slot = row.dataset.coterieSlot || 'weapon';
      const placement = resolveCoteriePlacement(player, game);
      const pane = document.querySelector('[data-coterie-detail]');
      if (!pane) return;

      game.uiState.selectedCoterieSkeletonIndex = skeletonIndex;
      game.uiState.selectedCoterieSlot = slot;
      game.uiState.coterieFocusRegion = 'skeletons';

      document.querySelectorAll('[data-coterie-slot][data-coterie-focus-region="skeletons"]').forEach(slotRow => {
        const active = slotRow === row;
        slotRow.classList.toggle('active', active);
        slotRow.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      pane.innerHTML = placement
        ? coterieSlotDetail(player, skeletonIndex, slot, placement.item, placement.bagIndex)
        : coterieSlotDetail(player, skeletonIndex, slot);
      bindCoterieActionButtons(player, game, rerender);
      updateCoterieFocusRegionDom(game);
    };

    row.onmouseenter = () => {
      if (!game.localMenuFrame && document.body.dataset.menuInputMode !== 'controller') selectSlot();
    };
    row.onfocus = selectSlot;
    row.onclick = () => {
      const placement = resolveCoteriePlacement(player, game);
      selectSlot();
      if (placement) {
        performCoterieSlotPrimaryAction(player, row.dataset.coterieSkeletonIndex, row.dataset.coterieSlot, game, rerender);
      }
    };
    row.ondblclick = () => {
      performCoterieSlotPrimaryAction(player, row.dataset.coterieSkeletonIndex, row.dataset.coterieSlot, game, rerender);
    };
  });

  document.querySelectorAll('[data-coterie-inventory-row]').forEach(row => {
    const selectItem = () => {
      const bagIndex = Number(row.dataset.inventoryItemIndex);
      const entry = player.inventory?.[bagIndex];
      const pane = document.querySelector('[data-coterie-detail]');
      if (!pane || !entry) return;

      game.uiState.selectedInventoryBagIndexBySubtab = game.uiState.selectedInventoryBagIndexBySubtab || {};
      game.uiState.selectedInventoryBagIndexBySubtab.coterie = bagIndex;
      game.uiState.coterieFocusRegion = 'inventory';
      game.uiState.coteriePlacementBagIndex = null;

      document.querySelectorAll('[data-coterie-inventory-row]').forEach(itemRow => {
        const active = itemRow === row;
        itemRow.classList.toggle('active', active);
        itemRow.classList.remove('pending-placement');
        itemRow.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      pane.innerHTML = coterieInventoryItemDetail(
        player,
        entry,
        Number(game.uiState.selectedCoterieSkeletonIndex || 0),
        game.uiState.selectedCoterieSlot || 'weapon'
      );
      bindCoterieActionButtons(player, game, rerender);
      updateCoterieFocusRegionDom(game);
    };

    row.onmouseenter = () => {
      if (!game.localMenuFrame && document.body.dataset.menuInputMode !== 'controller') selectItem();
    };
    row.onfocus = selectItem;
    row.onclick = selectItem;
    row.ondblclick = () => {
      performCoterieInventoryPrimaryAction(player, row, game, rerender);
    };
  });
}

function bindCoterieActionButtons(player, game, rerender) {
  document.querySelectorAll('[data-coterie-action]').forEach(btn => {
    btn.onclick = () => performCoterieActionButton(player, btn, game, rerender);
  });
}

function updateCoterieFocusRegionDom(game) {
  const root = document.querySelector('[data-coterie-workstation]');
  if (!root) return;
  root.dataset.coterieFocusRegion = game?.uiState?.coterieFocusRegion || 'inventory';
  root.dataset.coteriePlacing = game?.uiState?.coteriePlacementBagIndex !== null &&
    game?.uiState?.coteriePlacementBagIndex !== undefined
    ? 'true'
    : 'false';
}

function bindEquipmentSlotRows(player, game, rerender) {
  document.querySelectorAll('[data-equipment-slot][data-equipment-focus-region="slots"]').forEach(row => {
    const selectSlot = () => {
      const slot = row.dataset.equipmentSlot;
      const pane = document.querySelector('[data-inventory-detail]');
      if (!slot || !pane) return;

      game.uiState.selectedEquipmentSlot = slot;
      game.uiState.equipmentFocusRegion = 'slots';

      document.querySelectorAll('[data-equipment-slot][data-equipment-focus-region="slots"]').forEach(slotRow => {
        slotRow.classList.toggle('active', slotRow === row);
        slotRow.setAttribute('aria-selected', slotRow === row ? 'true' : 'false');
      });

      pane.innerHTML = equipmentSlotDetail(player, slot);
      bindEquipmentActionButtons(player, game, rerender);
      updateEquipmentFocusRegionDom(game);
    };

    row.onfocus = selectSlot;
    row.onclick = selectSlot;
    row.ondblclick = () => {
      performEquipmentSlotPrimaryAction(player, row.dataset.equipmentSlot, game, rerender);
    };
  });
}

function bindEquipmentActionButtons(player, game, rerender) {
  document.querySelectorAll('[data-equipment-action]').forEach(btn => {
    btn.onclick = () => performEquipmentActionButton(player, btn, game, rerender);
  });
}

function updateEquipmentFocusRegionDom(game) {
  const root = document.querySelector('[data-equipment-workstation]');
  if (!root) return;
  root.dataset.equipmentFocusRegion = game?.uiState?.equipmentFocusRegion || 'inventory';
}

export function equipmentSlotCard(player, slot, label, itemId, options = {}) {
  const compact = !!options.compact;
  const item = itemId ? instanceGearItem(ITEMS[itemId],player.equippedGear?.[slot]) : null;

  if (!item) {
    return `
      <div class="equipment-slot empty ${compact ? 'compact' : ''}">
      <div class="equipment-slot-frame">
        <div class="item-icon ghost">${slotIconMarkup(slot)}</div>
      </div>
      <h3>${escapeHtml(label)}</h3>
      <p class="tag">Empty</p>
    </div>
  `;
  }

  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const upgradeLevel = getGearUpgradeLevel(player, slot);
  const nextQuote=makeUpgradeQuote(player,slot);
  const costText=nextQuote?`${GEAR_RARITIES[nextQuote.targetRarity].name} +${nextQuote.targetTier}: ${nextQuote.cost.gold} gold, ${nextQuote.cost.materials.map(([id,qty])=>`${ITEMS[id]?.name||id} x${qty}`).join(', ')}`:'Primordial +20 · Maximum';

  return `
    <div class="equipment-slot ${compact ? 'compact' : ''}">
      <div class="equipment-slot-frame">
        <div class="item-icon" style="--rarity:${rarityColor}">
          ${itemIconMarkup(item, { classId: player.classId })}
        </div>
      </div>
      <h3>${escapeHtml(label)}</h3>
      <b class="inventory-rarity-name" style="--item-rarity:${rarityColor};color:${rarityColor}">${escapeHtml(item.name)} · Tier ${upgradeLevel+1}/20</b>
      <p class="tag">${escapeHtml(rarity?.name || item.rarity || 'Item')}</p>

      ${compact ? compactItemStatBlock(player, item) : itemStatBlock(player, item)}

      ${compact ? '' : `<p class="tag">${escapeHtml(item.desc || '')}</p>`}
      ${compact ? '' : `<p class="tag">Upgrade: ${escapeHtml(costText)}</p>`}
      <div class="equipment-slot-actions">
        <button data-unequip-slot="${slot}">Unequip</button>
        ${inventoryLockControls(player.equippedGear?.[slot],{slot})}
      </div>
    </div>
  `;
}

export function itemStatBlock(player, item, entry = null) {
  entry ||= player.equipment?.[item.slot]===item.id?player.equippedGear?.[item.slot]:null;
  item=instanceGearItem(item,entry);
  const upgradeBonus=entry?getTierStatBonus(item,entry.upgradeTier,entry):0;
  const rows = [];

  if(item.type==='weapon'){
    rows.push(['Strike power',calculateDisplayWeaponDamage(player,item,entry)]);
    rows.push(['Spirit on enemy hit',weaponSpiritRecoveryLabel(item.weaponType)]);
    rows.push(['Scales with',equipmentScaling(item)]);
    if(item.weaponType==='grimoire')rows.push(['First light shot',`${item.spiritCost??8} Mana (Spirit) before bonuses`]);
    if(item.weaponType==='spiritFocus')rows.push(['First light shot',`${item.staminaCost??8} Stamina before bonuses`]);
    if(item.range)rows.push(['Reach',`${Number((item.range/32).toFixed(1))} tiles`]);
  }
  const training = item.type === 'weapon' ? weaponTraining(item.primarySkill || item.skill || 'blade',item.weaponType) : armourTraining(item);
  if (training) rows.push(['Training',Object.keys(training).map(skillLabel).join(' · ')]);
  if (item.type === 'armour') rows.push(['Handling',training?.heavyArmour ? 'More protection · higher dodge and channel costs' : 'Lower dodge cost · light training improves channel economy']);
  if (item.power && item.type !== 'weapon') rows.push(['Power', item.power]);
  if (item.armour !== undefined && item.type!=='weapon' && Number(item.armour)+upgradeBonus>0) rows.push(['Armour', (Number(item.armour)+upgradeBonus).toFixed(2)]);
  if(item.type==='trinket'&&upgradeBonus>0)rows.push(['Tier power',`+${upgradeBonus.toFixed(2)} offensive power`]);
  if (item.spirit !== undefined) rows.push(['Spirit', item.spirit]);
  if (item.focusPower !== undefined) rows.push(['Focus Power', item.focusPower]);
  if (item.heal !== undefined) rows.push(['Heal', item.heal]);
  if (item.stamina !== undefined) rows.push(['Stamina', item.stamina]);
  if (item.value !== undefined) rows.push(['Value', `${item.value} Ash Coins`]);

  if (item.awakening) {
    const wakeText = Object.keys(item.awakening)
      .map(level => `${level}: ${item.awakening[level]}`)
      .join(' / ');

    rows.push(['Awakening', wakeText]);
  }

  return `
    <div class="item-stats information-facts">
      ${rows.map(([k, v]) => `
        <div class="stat-row">
          <span>${escapeHtml(k)}</span>
          <b>${escapeHtml(v)}</b>
        </div>
      `).join('')}
    </div>
  `;
}

export function compactItemStatBlock(player, item) {
  const rows = [];

  if (item.type === 'weapon') {
    rows.push(['Damage', calculateDisplayWeaponDamage(player, item)]);
    if (item.primarySkill) rows.push(['Scaling', skillLabel(item.primarySkill)]);
    rows.push(['Spirit on enemy hit',weaponSpiritRecoveryLabel(item.weaponType)]);
    if(item.weaponType==='grimoire')rows.push(['Attack','Grimoire Shot']);
    if (item.weaponType === 'spiritFocus') rows.push(['Attack', 'Focus Bolt']);
    rows.push(['Heavy', 'Hold Attack']);
  } else {
    if (item.power !== undefined) rows.push(['Power', item.power]);
    if (item.armour !== undefined) rows.push(['Armour', item.armour]);
    if (item.spirit !== undefined) rows.push(['Spirit', item.spirit]);
    if (item.focusPower !== undefined) rows.push(['Focus', item.focusPower]);
    if (item.heal !== undefined) rows.push(['Heal', item.heal]);
    if (item.stamina !== undefined) rows.push(['Stamina', item.stamina]);
  }

  const setInfo = getItemSetInfo(item);
  if (setInfo.set) rows.push(['Set', setInfo.set.name]);
  if (setInfo.weaponSet) rows.push(['Set', setInfo.weaponSet.name]);

  if (!rows.length && item.value !== undefined) rows.push(['Value', `${item.value} Ash`]);

  return `
    <div class="item-stats compact-stats">
      ${rows.slice(0, 3).map(([k, v]) => `
        <div class="stat-row">
          <span>${escapeHtml(k)}</span>
          <b>${escapeHtml(v)}</b>
        </div>
      `).join('')}
    </div>
  `;
}

function renderActiveSetBonusSummary(player) {
  const active = getActiveSetBonuses(player);

  if (!active.length) {
    return `<p class="tag">No active set bonuses.</p>`;
  }

  const sets=[...new Map(active.map(b=>[b.setId,b])).values()];
  return `<p class="tag">Active sets: ${sets.map(b=>`${escapeHtml(b.name)} (${b.count} pieces)`).join(' · ')}</p>`;
}

function inventoryList(items) {
  return {items,totalItems:items.length};
}

function inventoryListSummary(list) {
  return `<p class="tag">${list.totalItems} item${list.totalItems === 1 ? '' : 's'}</p>`;
}

function equipmentActionButtons({ bagIndex = null, slot = null, item = null, entry = null, equipped = false,disposal=true,disposalOnly=false } = {}) {
  const actions = [];

  if (!disposalOnly && bagIndex !== null && item?.slot) {
    actions.push(`<button data-equipment-action="equip" data-inventory-item-index="${bagIndex}">Equip</button>`);
  }

  if (!disposalOnly && slot && equipped) {
    actions.push(`<button data-equipment-action="unequip" data-equipment-slot="${escapeHtml(slot)}">Unequip</button>`);
  }


  if (disposal && bagIndex !== null && item && isSalvageable(item) && !equipped) {
    actions.push(`<button data-equipment-action="salvage" data-inventory-item-index="${bagIndex}" ${isItemLocked(entry)?'disabled':''}>${isItemLocked(entry)?'Locked · Deconstruction Protected':'Deconstruct (Blacksmith)'}</button>`);
  } else if (disposal && slot && item && isSalvageable(item)) {
    actions.push(`<button data-equipment-action="salvage-equipped" data-equipment-slot="${escapeHtml(slot)}">Protected Salvage</button>`);
  }

  if (!actions.length) return '';

  return `
    <div class="equipment-action-row">
      ${actions.join('')}
    </div>
  `;
}

function inventoryLockControls(entry,{bagIndex=null,slot=null,skeletonIndex=null}={}){
  if(!entry)return '';
  const locked=isItemLocked(entry);
  return `<div class="inventory-lock-controls"><button type="button" data-equipment-action="toggle-lock" data-lock-item-id="${escapeHtml(entry.id)}" ${entry.instanceId?`data-lock-instance-id="${escapeHtml(entry.instanceId)}"`:''} ${bagIndex!==null?`data-inventory-item-index="${bagIndex}"`:''} ${slot?`data-equipment-slot="${escapeHtml(slot)}"`:''} ${skeletonIndex!==null?`data-lock-skeleton-index="${skeletonIndex}"`:''} aria-pressed="${locked}">${locked?'Unlock Item':'Lock Item'}</button><small>${locked?'Locked: protected from sale and deconstruction.':'Lock to protect from sale and deconstruction.'}</small></div>`;
}

function equipmentComparisonBlock(player, item,entry=null) {
  const slot = normalizeEquipmentSlot(item?.slot);
  if (!slot) return '';

  const equippedEntry=player.equippedGear?.[slot];
  const equippedItem = player.equipment?.[slot] ? instanceGearItem(ITEMS[player.equipment[slot]],equippedEntry) : null;
  if (!equippedItem) return `<p class="equipment-comparison-summary good-text" data-comparison="empty">+ Empty ${escapeHtml(slotLabel(slot).toLowerCase())} slot</p>`;
  const rows = getComparisonRows(player, item, equippedItem,entry);
  const up=rows.some(r=>r.delta>0),down=rows.some(r=>r.delta<0);
  const verdict=up&&down?'mixed':up?'better':down?'worse':'equal';
  const summary={better:'▲ Higher stats',worse:'▼ Lower stats',mixed:'↕ Stat trade-off',equal:'= Same core stats'}[verdict];

  return `
    <section class="equipment-comparison-block">
      <p class="equipment-comparison-summary ${verdict==='better'?'good-text':verdict==='worse'?'bad-text':''}" data-comparison="${verdict}">${summary}</p>
      <h3>Selected vs equipped</h3>
      <div class="stat-row">
        <span>Equipped</span>
        <b>${equippedItem ? escapeHtml(equippedItem.name) : 'Empty'}</b>
      </div>
      ${rows.map(row => `
        <div class="stat-row">
          <span>${escapeHtml(row.label)} <small>${row.selected} / ${row.equipped}</small></span>
          <b class="${row.delta > 0 ? 'good-text' : row.delta < 0 ? 'bad-text' : ''}">
            ${row.delta > 0 ? '+' : ''}${escapeHtml(row.delta)}
          </b>
        </div>
      `).join('')}
    </section>
  `;
}

function getComparisonRows(player, item, equippedItem,entry) {
  const rows = [];
  const damage = item?.type === 'weapon' ? calculateDisplayWeaponDamage(player, item,entry) : 0;
  const equippedDamage = equippedItem?.type === 'weapon' ? calculateDisplayWeaponDamage(player, equippedItem,player.equippedGear?.weapon) : 0;

  if (item?.type === 'weapon' || equippedItem?.type === 'weapon') {
    rows.push({ label: 'Damage', selected:damage,equipped:equippedDamage,delta: Number((damage - equippedDamage).toFixed(2)) });
  }

  for (const key of ['armour', 'spirit', 'power', 'focusPower', 'maxHp', 'maxStamina', 'maxSpirit', 'strength', 'dexterity', 'essence', 'heal', 'stamina']) {
    const value = Number(item?.[key] || 0)+(key==='armour'&&item?.type!=='weapon'&&item?.armour!==undefined?getTierStatBonus(item,entry?.upgradeTier,entry):0);
    const equippedValue = Number(equippedItem?.[key] || 0)+(key==='armour'&&equippedItem?.type!=='weapon'&&equippedItem?.armour!==undefined?getTierStatBonus(equippedItem,player.equippedGear?.[equippedItem.slot]?.upgradeTier,player.equippedGear?.[equippedItem.slot]):0);
    if (value || equippedValue) {
      rows.push({ label: titleCase(key.replace(/([A-Z])/g,' $1')), selected:Number(value.toFixed(2)),equipped:Number(equippedValue.toFixed(2)),delta: Number((value-equippedValue).toFixed(2)) });
    }
  }

  if(item?.type==='trinket'||equippedItem?.type==='trinket'){
    const selected=item?.type==='trinket'?getTierStatBonus(item,entry?.upgradeTier,entry):0,equipped=equippedItem?.type==='trinket'?getTierStatBonus(equippedItem,player.equippedGear?.trinket?.upgradeTier,player.equippedGear?.trinket):0;
    if(selected||equipped)rows.push({label:'Tier power',selected:Number(selected.toFixed(2)),equipped:Number(equipped.toFixed(2)),delta:Number((selected-equipped).toFixed(2))});
  }
  return rows.length ? rows : [{ label: 'Core Stats', selected:0,equipped:0,delta: 0 }];
}

function upgradeCostBlock(player, slot, item) {
  if (!item || !isUpgradable(item)) return '';
  const quote=makeUpgradeQuote(player,slot);
  if(!quote)return '<section class="equipment-upgrade-cost"><h3>Primordial +20 · Maximum</h3></section>';
  const entry=player.equippedGear[slot],preview=upgradeEntryPreview(entry,quote);
  const materials=quote.cost.materials.map(([id,qty])=>`<div class="stat-row"><span>${escapeHtml(ITEMS[id]?.name||id)}</span><b class="${countItem(player,id)>=qty?'good-text':'bad-text'}">${countItem(player,id)} / ${qty}</b></div>`).join('');
  return `<section class="equipment-upgrade-cost"><h3>Blacksmith · ${GEAR_RARITIES[quote.targetRarity].name} +${quote.targetTier}/20</h3>
    ${item.type==='weapon'?`<p>Strike power: ${calculateDisplayWeaponDamage(player,ITEMS[item.id],entry)} → ${calculateDisplayWeaponDamage(player,ITEMS[item.id],preview)}</p>`:''}
    <p>${quote.promotion?'Ascend rarity at the forge. Completed upgrade strength is retained.':'Bring this piece to the blacksmith to upgrade it.'}</p>
    <p class="bad-text">${escapeHtml(quote.blockedReason)}</p><div class="stat-row"><span>Ash Coins</span><b>${player.gold||0} / ${quote.cost.gold}</b></div>${materials}</section>`;
}
function compactItemSummary(player, item) {
  if (!item) return 'Empty';
  if (item.type === 'weapon') return `${weaponTypeLabel(item.weaponType)} / ${calculateDisplayWeaponDamage(player, item)} dmg`;
  if (item.armour !== undefined && item.type==='armour') return `Armour ${informationArmour(player,item)}`;
  if (item.spirit !== undefined) return `Spirit ${item.spirit}`;
  if (item.power !== undefined) return `Power ${item.power}`;
  return itemTypeLabel(item.type || 'gear');
}

function isGravecallerCommander(player) {
  const classId = player?.classId === 'necromancer' ? 'gravecaller' : player?.classId;
  return classId === 'gravecaller' && (
    player?.gravecaller?.path === 'commander' ||
    player?.gravecallerPath === 'commander' ||
    !!player?.skillTree?.spent?.spirit_bone_coterie ||
    !!player?.skillTreeProgress?.spirit_bone_coterie
  );
}

function getCoterieSkeletons(player) {
  migratePlayer(player);
  return Array.isArray(player?.gravecaller?.skeletons)
    ? player.gravecaller.skeletons
    : [];
}

function resolveSelectedCoterieSkeletonIndex(game, skeletons) {
  const max = Math.max(0, skeletons.length - 1);
  const requested = Number(game?.uiState?.selectedCoterieSkeletonIndex || 0);
  const valid = Math.max(0, Math.min(max, Number.isFinite(requested) ? requested : 0));

  if (game?.uiState) game.uiState.selectedCoterieSkeletonIndex = valid;
  return valid;
}

function resolveSelectedCoterieSlot(game) {
  const requested = game?.uiState?.selectedCoterieSlot || COTERIE_SLOT_ORDER[0][0];
  const valid = normalizeCoterieSlot(requested) || COTERIE_SLOT_ORDER[0][0];

  if (game?.uiState) game.uiState.selectedCoterieSlot = valid;
  return valid;
}

function normalizeCoterieSlot(slot) {
  if (slot === 'armor') return 'armour';
  if (slot === 'trinket' || slot === 'jewelry') return 'charm';
  return COTERIE_SLOT_ORDER.some(([id]) => id === slot) ? slot : null;
}

function coterieSlotLabel(slot) {
  return COTERIE_SLOT_ORDER.find(([id]) => id === slot)?.[1] || titleCase(slot || 'slot');
}

function coterieSlotIcon(slot) {
  if (slot === 'armour') return 'chest';
  if (slot === 'charm') return 'trinket';
  return slot || 'empty';
}

function getCoterieInventoryGearItems(player) {
  return (player.inventory || [])
    .map((entry, index) => ({ entry, index, def: ITEMS[entry.id] }))
    .filter(x => x.def && firstCompatibleCoterieSlot(x.def));
}

function getCompatibleCoterieInventoryItems(player, slot) {
  return (player.inventory || [])
    .map((entry, index) => ({ entry, index, def: ITEMS[entry.id] }))
    .filter(x => x.def && isItemCompatibleWithCoterieSlot(x.def, slot));
}

function resolveCoteriePlacement(player, game) {
  const rawIndex = game?.uiState?.coteriePlacementBagIndex;

  if (rawIndex === null || rawIndex === undefined || rawIndex === '') return null;

  const bagIndex = Number(rawIndex);
  const entry = Number.isInteger(bagIndex) ? player?.inventory?.[bagIndex] : null;
  const item = entry ? instanceGearItem(ITEMS[entry.id],entry) : null;

  if (!entry || !item || !firstCompatibleCoterieSlot(item)) {
    if (game?.uiState) game.uiState.coteriePlacementBagIndex = null;
    return null;
  }

  return { bagIndex, entry, item };
}

function firstCompatibleCoterieSlot(item) {
  return COTERIE_SLOT_ORDER.find(([slot]) => isItemCompatibleWithCoterieSlot(item, slot))?.[0] || null;
}

function isItemCompatibleWithCoterieSlot(item, slot) {
  const normalized = normalizeCoterieSlot(slot);
  if (!item || !normalized) return false;

  if (normalized === 'weapon') {
    return item.type === 'weapon' || item.slot === 'weapon';
  }

  if (normalized === 'armour') {
    return item.type === 'armour' || ['helm', 'chest', 'legs', 'armour', 'armor'].includes(item.slot);
  }

  if (normalized === 'charm') {
    return item.type === 'trinket' || ['trinket', 'jewelry', 'charm'].includes(item.slot);
  }

  return false;
}

function getCoterieGearBonus(item,entry=null) {
  if (!item) return { damage: 0, armour: 0, maxHp: 0 };

  const upgrade=getTierStatBonus(item,entry?.upgradeTier,entry);
  const weaponPower = Number(item.baseDamage || item.damage || item.power || 0);
  const armourPower = Number(item.armour || item.armor || 0);
  const spiritPower = Number(item.spirit || 0);

  return {
    damage: weaponPower * 0.55 + spiritPower * 0.2 + (item.type==='weapon'?upgrade*.55:item.type==='trinket'?upgrade*.2:0),
    armour: armourPower * 0.55 + (item.type!=='weapon'?upgrade*.55:0),
    maxHp: armourPower * 2.2 + spiritPower * 0.7 + (item.type!=='weapon'?upgrade*2.2:0)
  };
}

function coterieSkeletonStatSummary(player, skeletonIndex) {
  const skeleton = getCoterieSkeletons(player)[skeletonIndex];
  const equipment = skeleton?.equipment || {};
  const ids = [equipment.weapon, equipment.armour, equipment.charm].filter(Boolean);
  const totals = ids.reduce((acc, itemId) => {
    const item=ITEMS[itemId],entry=Object.values(skeleton.equippedGear || {}).find(e=>e.id===itemId);
    const bonus = getCoterieGearBonus(item,entry);
    acc.damage += bonus.damage;
    acc.armour += bonus.armour;
    acc.maxHp += bonus.maxHp;
    return acc;
  }, { damage: 0, armour: 0, maxHp: 0 });

  if (!ids.length) return 'No gear assigned';

  return `DMG ${formatCompactBonus(totals.damage)} / ARM ${formatCompactBonus(totals.armour)} / HP ${formatCompactBonus(totals.maxHp)}`;
}

function getCoterieGearOwnerLabel(player, itemId,entry=null) {
  if (!itemId) return '';

  const roles = [];
  for (const skeleton of player?.gravecaller?.skeletons || []) {
    const equipment = skeleton?.equipment || {};
    if (entry?.instanceId?Object.values(skeleton.equippedGear || {}).some(ref=>ref?.instanceId===entry.instanceId):equipment.weapon === itemId || equipment.armour === itemId || equipment.charm === itemId) {
      roles.push(skeleton.role || skeleton.name || 'Skeleton');
    }
  }

  if (!roles.length) return '';
  return `Equipped by ${roles.join(', ')}`;
}

function formatCompactBonus(value) {
  const rounded = Math.round(Number(value || 0));
  return rounded > 0 ? `+${rounded}` : '0';
}

function formatSignedNumber(value) {
  const rounded = Math.round(Number(value || 0));
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

// -----------------------------------------------------------------------------
// EQUIP / USE / CRAFT ACTIONS
// -----------------------------------------------------------------------------

export function performEquipmentActionButton(player, button, game, rerender) {
  const action = button?.dataset?.equipmentAction;
  if (!action) return false;
  if(action==='toggle-lock'){
    const data=button.dataset;
    const owned=[...(player.inventory||[]),...Object.values(player.equippedGear||{}),...(player.gravecaller?.skeletons||[]).flatMap(s=>Object.values(s.equippedGear||{}))];
    const entry=data.lockInstanceId?owned.find(e=>e?.instanceId===data.lockInstanceId):data.inventoryItemIndex!==undefined?player.inventory?.[Number(data.inventoryItemIndex)]:null;
    if(!entry||entry.id!==data.lockItemId||!setItemLocked(player,entry,!isItemLocked(entry)))return false;
    if(game?.uiState)game.uiState.pendingInventorySalvageKey=null;
    game?.log?.(`${ITEMS[entry.id]?.name||entry.id} ${isItemLocked(entry)?'locked':'unlocked'}.`);rerender?.();return true;
  }

  if (action === 'equip') {
    const bagIndex = Number(button.dataset.inventoryItemIndex);
    return equipBagItem(player, bagIndex, game, rerender);
  }

  if (action === 'unequip') {
    return performEquipmentSlotPrimaryAction(player, button.dataset.equipmentSlot, game, rerender);
  }

  if (action === 'upgrade') {
    return performEquipmentSlotUpgradeAction(player, button.dataset.equipmentSlot, game, rerender);
  }

  if (action === 'upgrade-bag') {
    return performInventoryUpgradeAction(player, button, game, rerender);
  }

  if (action === 'salvage') {
    return performInventorySalvageAction(player, button, game, rerender);
  }

  if (action === 'salvage-equipped') {
    game?.log?.('Equipped gear is protected. Unequip it before salvaging.');
    return false;
  }

  return false;
}

export function performCoterieActionButton(player, button, game, rerender) {
  const action = button?.dataset?.coterieAction;
  if (!action) return false;

  if (action === 'choose') {
    return beginCoteriePlacement(
      player,
      Number(button.dataset.inventoryItemIndex),
      game,
      rerender
    );
  }

  if (action === 'equip') {
    return equipCoterieBagItem(
      player,
      Number(button.dataset.inventoryItemIndex),
      Number(button.dataset.coterieSkeletonIndex || 0),
      button.dataset.coterieSlot || 'weapon',
      game,
      rerender
    );
  }

  if (action === 'unequip') {
    return unequipCoterieSlot(
      player,
      Number(button.dataset.coterieSkeletonIndex || 0),
      button.dataset.coterieSlot || 'weapon',
      game,
      rerender
    );
  }

  return false;
}

export function performCoterieSlotPrimaryAction(player, skeletonIndex, slot, game, rerender) {
  const safeIndex = Number(skeletonIndex || 0);
  const safeSlot = normalizeCoterieSlot(slot);
  const skeleton = getCoterieSkeletons(player)[safeIndex];
  const placement = resolveCoteriePlacement(player, game);

  if (!skeleton || !safeSlot) return false;

  if (placement) {
    return equipCoterieBagItem(player, placement.bagIndex, safeIndex, safeSlot, game, rerender);
  }

  if (!skeleton.equipment?.[safeSlot]) {
    game.uiState = game.uiState || {};
    game.uiState.selectedCoterieSkeletonIndex = safeIndex;
    game.uiState.selectedCoterieSlot = safeSlot;
    game.uiState.coterieFocusRegion = 'skeletons';
    game?.log?.(`${skeleton.role || 'Skeleton'} ${coterieSlotLabel(safeSlot)} selected.`);
    rerender?.();
    return true;
  }

  return unequipCoterieSlot(player, safeIndex, safeSlot, game, rerender);
}

export function performCoterieInventoryPrimaryAction(player, row, game, rerender) {
  if (!row) return false;

  return beginCoteriePlacement(
    player,
    Number(row.dataset.inventoryItemIndex),
    game,
    rerender
  );
}

export function performEquipmentSlotPrimaryAction(player, slot, game, rerender) {
  if (!slot) return false;
  if (!player?.equipment?.[slot]) {
    game?.log?.(`${slotLabel(slot)} is empty.`);
    return false;
  }

  return unequipSlot(player, slot, game, rerender);
}

export function performEquipmentSlotUpgradeAction(player, slot, game, rerender) {
  game?.log?.('Visit Mara’s forge in Orrakai to upgrade equipment.');return false;
}

export function performInventoryUpgradeAction(player, row, game, rerender) {
  const bagIndex = Number(row?.dataset?.inventoryItemIndex);
  const entry = player?.inventory?.[bagIndex];
  const item = entry ? instanceGearItem(ITEMS[entry.id],entry) : null;
  const slot = normalizeEquipmentSlot(item?.slot);

  if (!item || !slot) return false;

  game?.log?.('Visit Mara’s forge in Orrakai to upgrade equipment.');
  return false;
}

function equipBagItem(player, bagIndex, game, rerender) {
  migratePlayer(player);
  ensureEquipmentShape(player);

  const entry = player.inventory?.[bagIndex];
  if (!entry) return false;

  const item = instanceGearItem(ITEMS[entry.id],entry);
  if (!item?.slot) return false;

  const slot = item.slot === 'jewelry' ? 'trinket' : item.slot;

  const reason=gearEquipReason(player,entry.id,entry);if(reason){game?.log?.(reason);return false;}
  if(!equipGearEntry(player,bagIndex))return false;
  if(game?.uiState){game.uiState.equipmentFocusRegion='slots';game.uiState.selectedEquipmentSlot=slot;}
  synchronizeEquipmentBoundSkills(player);
  if(game?.uiState)game.uiState.pendingGearUpgrade=null;

  game?.log?.(`Equipped ${item.name}.`);
  rerender?.();
  return true;
}

function beginCoteriePlacement(player, bagIndex, game, rerender) {
  migratePlayer(player);

  if (!isGravecallerCommander(player)) {
    game?.log?.('Only a Gravecaller Commander can equip the Bone Coterie.');
    return false;
  }

  const entry = player.inventory?.[bagIndex];
  const item = entry ? instanceGearItem(ITEMS[entry.id],entry) : null;
  const firstSlot = firstCompatibleCoterieSlot(item);

  if (!entry || !item || !firstSlot) {
    game?.log?.('That item cannot be assigned to the Bone Coterie.');
    return false;
  }

  game.uiState = game.uiState || {};
  game.uiState.selectedInventoryBagIndexBySubtab = game.uiState.selectedInventoryBagIndexBySubtab || {};
  game.uiState.selectedInventoryBagIndexBySubtab.coterie = bagIndex;
  game.uiState.coteriePlacementBagIndex = bagIndex;
  game.uiState.coterieFocusRegion = 'skeletons';

  if (!isItemCompatibleWithCoterieSlot(item, game.uiState.selectedCoterieSlot)) {
    game.uiState.selectedCoterieSlot = firstSlot;
  }

  game.uiState.selectedCoterieSkeletonIndex = Math.max(0, Number(game.uiState.selectedCoterieSkeletonIndex || 0));
  game?.log?.(`Choose a skeleton slot for ${item.name}.`);
  rerender?.();
  return true;
}

function equipCoterieBagItem(player, bagIndex, skeletonIndex, slot, game, rerender) {
  migratePlayer(player);

  if (!isGravecallerCommander(player)) {
    game?.log?.('Only a Gravecaller Commander can equip the Bone Coterie.');
    return false;
  }

  const safeSlot = normalizeCoterieSlot(slot);
  const skeletons = getCoterieSkeletons(player);
  const safeIndex = Math.max(0, Math.min(skeletons.length - 1, Number(skeletonIndex || 0)));
  const skeleton = skeletons[safeIndex];
  const entry = player.inventory?.[bagIndex];
  const item = entry ? instanceGearItem(ITEMS[entry.id],entry) : null;

  if (!skeleton || !safeSlot || !entry || !item) return false;

  if (!isItemCompatibleWithCoterieSlot(item, safeSlot)) {
    game?.log?.(`${item.name} cannot fit the ${coterieSlotLabel(safeSlot)} skeleton slot.`);
    return false;
  }

  skeleton.equipment = skeleton.equipment || { weapon: null, armour: null, charm: null };
  skeleton.equippedGear ||= {};
  const previousItemId=skeleton.equipment[safeSlot] || null;
  const previousEntry=skeleton.equippedGear[safeSlot];
  skeleton.equipment[safeSlot]=item.id;skeleton.equippedGear[safeSlot]=entry;
  if(previousEntry)player.inventory.push(previousEntry);else if(previousItemId)addItem(player,previousItemId,1);

  player.inventory.splice(bagIndex, 1);
  entry.qty=1;
  dismissCoterieForEquipmentChange(player);

  game.uiState = game.uiState || {};
  game.uiState.selectedInventoryBagIndexBySubtab = game.uiState.selectedInventoryBagIndexBySubtab || {};
  const nextBagIndex = player.inventory?.[bagIndex]
    ? bagIndex
    : Math.max(0, Math.min(player.inventory.length - 1, bagIndex));
  if (player.inventory?.[nextBagIndex]) {
    game.uiState.selectedInventoryBagIndexBySubtab.coterie = nextBagIndex;
  }
  game.uiState.selectedCoterieSkeletonIndex = safeIndex;
  game.uiState.selectedCoterieSlot = safeSlot;
  game.uiState.coterieFocusRegion = 'inventory';
  game.uiState.coteriePlacementBagIndex = null;
  game.uiState.pendingInventorySalvageKey = null;

  const role = skeleton.role || `Skeleton ${safeIndex + 1}`;
  game?.log?.(`Equipped ${item.name} to ${role}.`);
  rerender?.();
  return true;
}

function unequipCoterieSlot(player, skeletonIndex, slot, game, rerender) {
  migratePlayer(player);

  const safeSlot = normalizeCoterieSlot(slot);
  const skeletons = getCoterieSkeletons(player);
  const safeIndex = Math.max(0, Math.min(skeletons.length - 1, Number(skeletonIndex || 0)));
  const skeleton = skeletons[safeIndex];
  const itemId = skeleton?.equipment?.[safeSlot] || null;

  if (!skeleton || !safeSlot || !itemId) {
    game?.log?.('That skeleton slot is empty.');
    return false;
  }

  const item = ITEMS[itemId];
  if(!canCarryGear(player,itemId)){game?.log?.('Gear bag full. Sell or deconstruct gear before retrieving equipment.');return false;}
  skeleton.equipment[safeSlot]=null;
  if(skeleton.equippedGear?.[safeSlot]){player.inventory.push(skeleton.equippedGear[safeSlot]);delete skeleton.equippedGear[safeSlot];}else addItem(player,itemId,1);
  dismissCoterieForEquipmentChange(player);

  game.uiState = game.uiState || {};
  game.uiState.selectedCoterieSkeletonIndex = safeIndex;
  game.uiState.selectedCoterieSlot = safeSlot;
  game.uiState.coterieFocusRegion = 'inventory';
  game.uiState.coteriePlacementBagIndex = null;
  game.uiState.pendingInventorySalvageKey = null;

  const role = skeleton.role || `Skeleton ${safeIndex + 1}`;
  game?.log?.(`Returned ${item?.name || itemId} from ${role} to your bag.`);
  rerender?.();
  return true;
}

function unequipSlot(player, slot, game, rerender) {
  migratePlayer(player);
  ensureEquipmentShape(player);

  const itemId = player.equipment?.[slot];
  if (!itemId) return false;

  const item = ITEMS[itemId];
  const instanceId=player.equippedGear?.[slot]?.instanceId;

  if(!unequipGearEntry(player,slot))return false;
  if(game?.uiState){
    game.uiState.equipmentFocusRegion='inventory';
    game.uiState.selectedInventoryBagIndexBySubtab||={};
    game.uiState.selectedInventoryBagIndexBySubtab.equipment=player.inventory.findIndex(e=>instanceId?e.instanceId===instanceId:e.id===itemId);
  }
  synchronizeEquipmentBoundSkills(player);
  if(game?.uiState)game.uiState.pendingGearUpgrade=null;

  game?.log?.(`Unequipped ${item?.name || itemId}.`);
  rerender?.();
  return true;
}

function useBagItem(player, bagIndex, game, rerender) {
  migratePlayer(player);

  const entry = player.inventory?.[bagIndex];
  if (!entry) return;

  const item = instanceGearItem(ITEMS[entry.id],entry);
  if (!item) return;

  if (item.type === 'scroll') {
    const result = readSkillScroll(player, bagIndex);
    game?.log?.(result.reason);
    rerender?.();
    return;
  }
  let used = false;

  if (item.type === 'food') {
    used = useRationFromBag(player, entry, item, game);
  } else if (item.heal) {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + vampireOutsideHealing(player,item.heal));
    used = player.hp > before;
  }

  if (item.type !== 'food' && item.stamina) {
    const before = player.stamina;
    player.stamina = Math.min(player.maxStamina, player.stamina + item.stamina);
    used = player.stamina > before || used;
  }

  if (item.type !== 'food' && item.spirit && player.maxSpirit > 0) {
    const before = player.spirit;
    player.spirit = Math.min(player.maxSpirit, player.spirit + item.spirit);
    used = player.spirit > before || used;
  }

  if (!used) {
    game?.log?.(`${item.name} cannot be used right now.`);
    return;
  }

  entry.qty -= 1;

  if (entry.qty <= 0) {
    player.inventory.splice(bagIndex, 1);
  }

  game?.log?.(`Used ${item.name}.`);
  rerender?.();
}

// -----------------------------------------------------------------------------
// CALCULATIONS
// -----------------------------------------------------------------------------

export function calculateDisplayWeaponDamage(player, weapon, entry=null) {
  if(!weapon)return 0;
  if(entry)player={...player,equipment:{...player.equipment,weapon:weapon.id},equippedGear:{...player.equippedGear,weapon:entry},equipmentProgressionVersion:1};
  return calculateWeaponDamage(player,weapon,weapon.weaponType);
}

export function calculateInventoryValue(player) {
  return (player.inventory || []).reduce((total, entry) => {
    const item = instanceGearItem(ITEMS[entry.id],entry);
    return total + (item?.value || 0) * (entry.qty || 1);
  }, 0);
}

export function calculateEquippedValue(player) {
  return Object.values(player.equipment || {}).reduce((total, itemId) => {
    const item = itemId ? instanceGearItem(ITEMS[itemId],Object.values(player.equippedGear||{}).find(e=>e.id===itemId)) : null;
    return total + (item?.value || 0);
  }, 0);
}

export function renderEquipmentPreviewCanvases(player) {
  document.querySelectorAll('[data-equipment-preview-canvas]').forEach(canvas => {
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;

    const cssWidth = canvas.clientWidth || Number(canvas.width || 260);
    const cssHeight = canvas.clientHeight || Number(canvas.height || 320);
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const actor = {
      ...player,
      x: 0,
      y: 0,
      dirX: 0.35,
      dirY: 1,
      vx: 0,
      vy: 0,
      attacking: false,
      blocking: false,
      moving: false,
      scale: 1
    };

    drawHumanActor(ctx, actor, {
      x: -cssWidth / 2,
      y: -cssHeight * 0.68
    }, {
      isPlayer: true,
      scale: Math.max(1.65, Math.min(2.25, cssHeight / 145)),
      skin: player.skin || '#ffd1bd',
      hair: player.hair || '#0b0d12',
      shirt: player.shirt || '#f2a51f',
      pants: player.pants || '#293fba',
      boots: player.boots || '#3a2a22',
      classId: player.classId || null
    });

    ctx.restore();
  });
}

function fallbackMultiplierFromRarity(rarity) {
  if (rarity === 'common') return 2;
  if (rarity === 'uncommon') return 3;
  if (rarity === 'rare') return 4;
  if (rarity === 'occult') return 5;
  if (rarity === 'epic') return 5.5;
  if (rarity === 'legendary') return 7;
  if (rarity === 'relic') return 8;
  return 2;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function isItemEquipped(player, itemId) {
  return isItemEquippedByPlayer(player, itemId) || !!getCoterieGearOwnerLabel(player, itemId);
}

function isItemEquippedByPlayer(player, itemId) {
  return Object.values(player?.equipment || {}).includes(itemId);
}

function isUsable(item) {
  return item.type === 'scroll' || !!(item.heal || item.stamina || item.spirit);
}

function salvageNeedsConfirmation(item) {
  const protectedRarities = new Set(['rare', 'occult', 'epic', 'relic', 'legendary', 'mythic', 'ancient', 'primordial']);
  return protectedRarities.has(item?.rarity) || Number(item?.value || 0) >= 100;
}

function findInventoryEntryIndex(player, entry) {
  const index = (player.inventory || []).indexOf(entry);
  return index >= 0 ? index : null;
}

function normalizeEquipmentSlot(slot) {
  if (!slot) return null;
  return slot === 'jewelry' ? 'trinket' : slot;
}

function isResourceType(type) {
  return ['reagent', 'material', 'tool'].includes(type);
}

function isLootType(type) {
  return ['food', 'fish', 'currency', 'essence', 'loot', 'scroll'].includes(type);
}

function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'hydromancy') return 'Hydromancy';
  if (skillId === 'lightbringer') return 'Lightbringer';
  if (skillId === 'foraging') return 'Foraging';
  if (skillId === 'mining') return 'Mining';
  if (skillId === 'fishing') return 'Fishing';
  if (skillId === 'woodcutting') return 'Woodcutting';
  if (skillId === 'crafting') return 'Crafting';
  if (skillId === 'cooking') return 'Cooking';
  if (skillId === 'runecraft') return 'Runecraft';
  if (skillId === 'renown') return 'Renown';

  return String(skillId || 'Unknown');
}

function slotLabel(slot) {
  if (slot === 'weapon') return 'Weapon';
  if (slot === 'helm') return 'Helm';
  if (slot === 'chest') return 'Chest';
  if (slot === 'legs') return 'Legs';
  if (slot === 'trinket') return 'Charm';
  if (slot === 'jewelry') return 'Charm';
  return slot;
}

function itemTypeLabel(type) {
  if (type === 'weapon') return 'Weapon';
  if (type === 'armour') return 'Armour';
  if (type === 'trinket') return 'Charm';
  if (type === 'reagent') return 'Reagent';
  if (type === 'material') return 'Material';
  if (type === 'tool') return 'Tool';
  if (type === 'food') return 'Food';
  if (type === 'fish') return 'Fish';
  if (type === 'currency') return 'Currency';
  if (type === 'essence') return 'Essence';
  if (type === 'loot') return 'Loot';
  return type || 'Item';
}

function weaponTypeLabel(type) {
  if (type === 'sword') return 'Sword';
  if (type === 'dagger') return 'Dagger';
  if (type === 'axe') return 'Axe';
  if (type === 'mace') return 'Mace';
  if (type === 'hammer') return 'Hammer';
  if (type === 'spear') return 'Spear';
  if (type === 'bow') return 'Bow';
  if (type === 'crossbow') return 'Crossbow';
  if (type === 'scythe') return 'Scythe';
  if (type === 'staff') return 'Staff';
  if(type==='grimoire')return 'Grimoires';
  if (type === 'spiritFocus') return 'Foci';
  if (type === 'eldritch') return 'Eldritch Conduit';
  return type ? String(type) : 'Unknown';
}

function formatTrait(trait) {
  return String(trait || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function titleCase(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[c]));
}

function tierIdentityBlock(player,item,entry) {
  if(!isUpgradable(item))return '';
  const info=getItemSetInfo(item),sets=[info.set,info.weaponSet].filter((s,i,list)=>s&&list.findIndex(other=>other?.id===s.id)===i);
  return sets.map(set=>{
  const belongs=candidate=>{const meta=getItemSetInfo(candidate);return meta.setId===set.id||meta.weaponSetId===set.id;};
  const worn=new Set(Object.entries(player.equipment||{}).filter(([slot,id])=>ITEMS[id]&&(ITEMS[id].slot==='jewelry'?'trinket':ITEMS[id].slot)===slot&&belongs(ITEMS[id])).map(([,id])=>id));
  const count=worn.size;
  const pieces=set.pieces || Object.values(ITEMS).filter(belongs).map(i=>i.id);
  const total=set.pieces?.length || Math.max(1,...Object.keys(set.bonuses||{}).map(Number));
  return `<section class="information-set gear-tier-identity"><h3>${escapeHtml(set.name)} · ${count}/${total} equipped</h3>
   ${Object.entries(set.bonuses||{}).map(([n,bonus])=>`<p class="${count>=Number(n)?'good-text':'tag'}"><b>${n} piece${Number(n)>1?'s':''} · ${count>=Number(n)?'Active':'Inactive'}:</b> ${escapeHtml([describeBonusMap(bonus),set.effects?.[n]].filter(Boolean).join(' · '))}</p>`).join('')}
   <details class="information-extra"><summary>Set pieces</summary><p>${pieces.map(id=>`${escapeHtml(ITEMS[id]?.name||id)} (${escapeHtml(slotLabel(ITEMS[id]?.slot))})`).join(' · ')}</p></details>
  </section>`;
  }).join('');
}

function informationArmour(player,item) {
  const slot=item.slot==='jewelry'?'trinket':item.slot;
  const tier=player.equipment?.[slot]===item.id?getEquipmentTier(player,slot):1;
  return Number((Number(item.armour||0)+getTierStatBonus(item,tier,player.equippedGear?.[slot])).toFixed(2));
}
