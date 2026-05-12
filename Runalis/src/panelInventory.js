// panelInventory.js
// Inventory, equipment, crafting, consumables, and item stat rendering.

import {
  ITEMS,
  RARITY,
  getAllRecipes,
  getRecipeById
} from './data.js';

import {
  countItem,
  removeItem,
  addItem,
  gainXp,
  migratePlayer
} from './player.js';

import {
  getSkillLevel
} from './skills.js';

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

  const subtab = game.uiState.inventorySubtab || 'equipment';

  el.innerHTML = `
    <div class="subtab-bar">
      <button class="subtab ${subtab === 'equipment' ? 'active' : ''}" data-inventory-subtab="equipment">Equipment</button>
      <button class="subtab ${subtab === 'resources' ? 'active' : ''}" data-inventory-subtab="resources">Resources</button>
      <button class="subtab ${subtab === 'loot' ? 'active' : ''}" data-inventory-subtab="loot">Loot</button>
      <button class="subtab ${subtab === 'crafting' ? 'active' : ''}" data-inventory-subtab="crafting">Survival Crafting</button>
    </div>

    ${subtab === 'equipment' ? renderInventoryEquipment(player) : ''}
    ${subtab === 'resources' ? renderInventoryResources(player) : ''}
    ${subtab === 'loot' ? renderInventoryLoot(player) : ''}
    ${subtab === 'crafting' ? renderInventoryCrafting(player) : ''}
  `;
}

export function bindInventoryButtons(player, game, rerender) {
  document.querySelectorAll('[data-equip-bag-index]').forEach(btn => {
    btn.onclick = () => {
      equipBagItem(player, Number(btn.dataset.equipBagIndex), game, rerender);
    };
  });

  document.querySelectorAll('[data-use-bag-index]').forEach(btn => {
    btn.onclick = () => {
      useBagItem(player, Number(btn.dataset.useBagIndex), game, rerender);
    };
  });

  document.querySelectorAll('[data-craft-id]').forEach(btn => {
    btn.onclick = () => {
      const recipeId = btn.dataset.craftId;
      runRecipe(recipeId, player, game, rerender);
    };
  });
}

export function bindCharacterButtons(player, game, rerender) {
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

function renderInventoryEquipment(player) {
  const items = (player.inventory || [])
    .map((entry, index) => ({ entry, index, def: ITEMS[entry.id] }))
    .filter(x => x.def?.slot);

  if (!items.length) {
    return `
      <div class="card">
        <h2>Equipment</h2>
        <p class="tag">No equippable items in your bag.</p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>Equipment</h2>
      <div class="item-list">
        ${items.map(x => inventoryItemCard(player, x.entry, x.index, true)).join('')}
      </div>
    </div>
  `;
}

function renderInventoryResources(player) {
  const items = (player.inventory || [])
    .map((entry, index) => ({ entry, index, def: ITEMS[entry.id] }))
    .filter(x => x.def && isResourceType(x.def.type));

  if (!items.length) {
    return `
      <div class="card">
        <h2>Resources</h2>
        <p class="tag">No resources yet.</p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>Resources</h2>
      <div class="item-list">
        ${items.map(x => inventoryItemCard(player, x.entry, x.index, false)).join('')}
      </div>
    </div>
  `;
}

function renderInventoryLoot(player) {
  const items = (player.inventory || [])
    .map((entry, index) => ({ entry, index, def: ITEMS[entry.id] }))
    .filter(x => x.def && isLootType(x.def.type));

  if (!items.length) {
    return `
      <div class="card">
        <h2>Loot / Food / Currency</h2>
        <p class="tag">No loot, food, fish, essence, or currency in your bag.</p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>Loot / Food / Currency</h2>
      <div class="item-list">
        ${items.map(x => inventoryItemCard(player, x.entry, x.index, false)).join('')}
      </div>
    </div>
  `;
}

function renderInventoryCrafting(player) {
  const recipes = safeRecipes();

  if (!recipes.length) {
    return `
      <div class="card">
        <h2>Crafting</h2>
        <p class="tag">No recipes found.</p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>Survival Crafting</h2>
      <p class="tag">Crafting, cooking, and runecraft all level infinitely.</p>
      <div class="item-list">
        ${recipes.map(recipe => recipeCard(recipe, player)).join('')}
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// ITEM CARDS
// -----------------------------------------------------------------------------

function inventoryItemCard(player, entry, index, canEquip) {
  const item = ITEMS[entry.id];

  if (!item) {
    return `
      <div class="item-card">
        <b>Unknown Item</b>
        <p class="tag">${escapeHtml(entry.id)}</p>
      </div>
    `;
  }

  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';
  const qty = entry.qty > 1 ? ` x${entry.qty}` : '';
  const usable = isUsable(item);
  const equipped = isItemEquipped(player, item.id);

  return `
    <div class="item-card">
      <div class="stat-row">
        <span><b style="color:${rarityColor}">${escapeHtml(item.name)}${qty}</b></span>
        <b>${escapeHtml(rarity?.name || item.rarity || 'Item')}</b>
      </div>

      ${itemStatBlock(player, item)}

      <p class="tag">${escapeHtml(item.desc || '')}</p>

      <div class="button-row">
        ${canEquip && item.slot && !equipped
          ? `<button data-equip-bag-index="${index}">Equip</button>`
          : ''
        }

        ${equipped
          ? `<span class="tag gold">Equipped</span>`
          : ''
        }

        ${usable
          ? `<button data-use-bag-index="${index}">Use</button>`
          : ''
        }
      </div>
    </div>
  `;
}

export function equipmentSlotCard(player, slot, label, itemId) {
  const item = itemId ? ITEMS[itemId] : null;

  if (!item) {
    return `
      <div class="equipment-slot">
        <h3>${escapeHtml(label)}</h3>
        <p class="tag">Empty</p>
      </div>
    `;
  }

  const rarity = RARITY?.[item.rarity];
  const rarityColor = rarity?.color || '#b8c0cc';

  return `
    <div class="equipment-slot">
      <h3>${escapeHtml(label)}</h3>
      <b style="color:${rarityColor}">${escapeHtml(item.name)}</b>
      <p class="tag">${escapeHtml(rarity?.name || item.rarity || 'Item')}</p>

      ${itemStatBlock(player, item)}

      <p class="tag">${escapeHtml(item.desc || '')}</p>
      <button data-unequip-slot="${slot}">Unequip</button>
    </div>
  `;
}

export function itemStatBlock(player, item) {
  const rows = [];

  if (item.type) rows.push(['Type', itemTypeLabel(item.type)]);
  if (item.slot) rows.push(['Slot', slotLabel(item.slot)]);
  if (item.weaponType) rows.push(['Weapon Type', weaponTypeLabel(item.weaponType)]);

  if (item.type === 'weapon') {
    rows.push(['Current Damage', calculateDisplayWeaponDamage(player, item)]);

    if (item.baseDamage !== undefined) {
      rows.push(['Base Damage', item.baseDamage]);
    }

    if (item.primarySkill) {
      rows.push(['Primary Scaling', `${skillLabel(item.primarySkill)} x${item.primaryMultiplier ?? 1}`]);
    }

    if (item.secondarySkill) {
      rows.push(['Secondary Scaling', `${skillLabel(item.secondarySkill)} x${item.secondaryMultiplier ?? 0}`]);
    }
  }

  if (item.power !== undefined && item.type !== 'weapon') rows.push(['Power', item.power]);
  if (item.armour !== undefined) rows.push(['Armour', item.armour]);
  if (item.spirit !== undefined) rows.push(['Spirit', item.spirit]);
  if (item.heal !== undefined) rows.push(['Heal', item.heal]);
  if (item.stamina !== undefined) rows.push(['Stamina', item.stamina]);
  if (item.value !== undefined) rows.push(['Value', `${item.value} Ash Coins`]);

  if (item.traits?.length) {
    rows.push(['Traits', item.traits.map(formatTrait).join(', ')]);
  }

  if (item.awakening) {
    const wakeText = Object.keys(item.awakening)
      .map(level => `${level}: ${item.awakening[level]}`)
      .join(' / ');

    rows.push(['Awakening', wakeText]);
  }

  return `
    <div class="item-stats">
      ${rows.map(([k, v]) => `
        <div class="stat-row">
          <span>${escapeHtml(k)}</span>
          <b>${escapeHtml(v)}</b>
        </div>
      `).join('')}
    </div>
  `;
}

function recipeCard(recipe, player) {
  const output = ITEMS[recipe.output];
  const canCraft = recipe.materials.every(([id, qty]) => countItem(player, id) >= qty);

  const materialText = recipe.materials
    .map(([id, qty]) => {
      const item = ITEMS[id];
      const have = countItem(player, id);
      return `${item?.name || id} ${have}/${qty}`;
    })
    .join(', ');

  return `
    <div class="item-card">
      <div class="stat-row">
        <span><b>${escapeHtml(recipe.title || output?.name || recipe.id)}</b></span>
        <b>${escapeHtml(skillLabel(recipe.skill))}</b>
      </div>

      <p class="tag">Requires: ${escapeHtml(materialText)}</p>
      <p class="tag">Creates: ${escapeHtml(output?.name || recipe.output)} x${recipe.outputQty || 1}</p>
      <p class="tag">XP: ${recipe.xp || 0}</p>

      <button ${canCraft ? '' : 'disabled'} data-craft-id="${escapeHtml(recipe.id)}">
        ${canCraft ? 'Craft' : 'Missing Materials'}
      </button>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// EQUIP / USE / CRAFT ACTIONS
// -----------------------------------------------------------------------------

function equipBagItem(player, bagIndex, game, rerender) {
  migratePlayer(player);
  ensureEquipmentShape(player);

  const entry = player.inventory?.[bagIndex];
  if (!entry) return;

  const item = ITEMS[entry.id];
  if (!item?.slot) return;

  const slot = item.slot === 'jewelry' ? 'trinket' : item.slot;

  if (player.equipment[slot]) {
    addItem(player, player.equipment[slot], 1);
  }

  player.equipment[slot] = item.id;

  entry.qty -= 1;

  if (entry.qty <= 0) {
    player.inventory.splice(bagIndex, 1);
  }

  game?.log?.(`Equipped ${item.name}.`);
  rerender?.();
}

function unequipSlot(player, slot, game, rerender) {
  migratePlayer(player);
  ensureEquipmentShape(player);

  const itemId = player.equipment?.[slot];
  if (!itemId) return;

  const item = ITEMS[itemId];

  addItem(player, itemId, 1);
  player.equipment[slot] = null;

  game?.log?.(`Unequipped ${item?.name || itemId}.`);
  rerender?.();
}

function useBagItem(player, bagIndex, game, rerender) {
  migratePlayer(player);

  const entry = player.inventory?.[bagIndex];
  if (!entry) return;

  const item = ITEMS[entry.id];
  if (!item) return;

  let used = false;

  if (item.heal) {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + item.heal);
    used = player.hp > before;
  }

  if (item.stamina) {
    const before = player.stamina;
    player.stamina = Math.min(player.maxStamina, player.stamina + item.stamina);
    used = player.stamina > before || used;
  }

  if (item.spirit && player.spiritAwakened) {
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

function runRecipe(recipeId, player, game, rerender) {
  const recipe = getRecipeById(recipeId);

  if (!recipe) {
    game?.log?.('Recipe not found.');
    return;
  }

  const canCraft = recipe.materials.every(([id, qty]) => countItem(player, id) >= qty);

  if (!canCraft) {
    game?.log?.('Missing materials.');
    return;
  }

  for (const [id, qty] of recipe.materials) {
    removeItem(player, id, qty);
  }

  addItem(player, recipe.output, recipe.outputQty || 1);
  gainXp(player, recipe.skill, recipe.xp || 0, game?.log);

  const outputName = ITEMS[recipe.output]?.name || recipe.output;
  game?.log?.(`Crafted ${outputName}.`);

  rerender?.();
}

// -----------------------------------------------------------------------------
// CALCULATIONS
// -----------------------------------------------------------------------------

export function calculateDisplayWeaponDamage(player, weapon) {
  if (!weapon) return 0;

  const primarySkill = weapon.primarySkill || weapon.skill || 'blade';
  const primaryLevel = getSkillLevel(player.skillState, primarySkill);
  const primaryMultiplier = weapon.primaryMultiplier ?? fallbackMultiplierFromRarity(weapon.rarity);

  const primaryPower =
    Math.pow(primaryLevel, 0.85) * primaryMultiplier * 5;

  let secondaryPower = 0;

  if (weapon.secondarySkill) {
    const secondaryLevel = getSkillLevel(player.skillState, weapon.secondarySkill);
    const secondaryMultiplier = weapon.secondaryMultiplier ?? 0.5;

    secondaryPower =
      Math.pow(secondaryLevel, 0.85) * secondaryMultiplier * 5;
  }

  const baseDamage = weapon.baseDamage ?? weapon.power ?? 3;

  return Math.max(1, Math.floor(baseDamage + primaryPower + secondaryPower));
}

export function calculateInventoryValue(player) {
  return (player.inventory || []).reduce((total, entry) => {
    const item = ITEMS[entry.id];
    return total + (item?.value || 0) * (entry.qty || 1);
  }, 0);
}

export function calculateEquippedValue(player) {
  return Object.values(player.equipment || {}).reduce((total, itemId) => {
    const item = itemId ? ITEMS[itemId] : null;
    return total + (item?.value || 0);
  }, 0);
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

function safeRecipes() {
  try {
    return getAllRecipes();
  } catch {
    return [];
  }
}

function isItemEquipped(player, itemId) {
  return Object.values(player.equipment || {}).includes(itemId);
}

function isUsable(item) {
  return !!(item.heal || item.stamina || item.spirit);
}

function isResourceType(type) {
  return ['reagent', 'material'].includes(type);
}

function isLootType(type) {
  return ['food', 'fish', 'currency', 'essence', 'loot'].includes(type);
}

function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'foraging') return 'Foraging';
  if (skillId === 'mining') return 'Mining';
  if (skillId === 'fishing') return 'Fishing';
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
  if (type === 'food') return 'Food';
  if (type === 'fish') return 'Fish';
  if (type === 'currency') return 'Currency';
  if (type === 'essence') return 'Essence';
  if (type === 'loot') return 'Loot';
  return type || 'Item';
}

function weaponTypeLabel(type) {
  if (type === 'sword') return 'Sword';
  if (type === 'bow') return 'Bow';
  if (type === 'scythe') return 'Scythe';
  if (type === 'staff') return 'Staff';
  return type ? String(type) : 'Unknown';
}

function formatTrait(trait) {
  return String(trait || '')
    .replace(/_/g, ' ')
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