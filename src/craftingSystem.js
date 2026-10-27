import {commitGearUpgrade,makeUpgradeQuote,getEquipmentTier,getEquipmentTierBonus,getTierUpgradeCost} from './equipmentProgressionSystem.js';
import {workshopAccessStatus,hasCampfireCraftAccess} from './workshopAccess.js';
// craftingSystem.js
// Salvage, recipe crafting, and gear upgrade foundation.

import { ITEMS, getRecipeById } from './data.js';
import { addItem, removeItem, countItem, gainXp, skillName } from './player.js';
import { getSkillLevel } from './skills.js';
import { addLootText, addStatusText } from './floatingText.js';
import { markPartyCollectObjective } from './dialogueSystem.js';

const RARITY_SALVAGE = {
  common: [['ironScrap', 1]],
  uncommon: [['ironScrap', 2], ['arcaneDust', 1]],
  rare: [['ironScrap', 2], ['arcaneDust', 2]],
  occult: [['arcaneDust', 3], ['graveAsh', 1]],
  epic: [['arcaneDust', 4], ['veyrglassShard', 1]],
  relic: [['arcaneDust', 4], ['veyrglassShard', 1]],
  legendary: [['arcaneDust', 5], ['bossCore', 1]],
  mythic: [['arcaneDust', 6], ['towerFragment', 1]],
  ancient: [['arcaneDust', 8], ['towerFragment', 2]]
};

export function salvageInventoryItem(player, bagIndex, game) {
  const entry = player?.inventory?.[bagIndex];
  if (!entry) return false;

  const item = ITEMS[entry.id || entry.itemId];
  if (!item || !isSalvageable(item)) {
    game?.log?.('That item cannot be salvaged.');
    addStatusText(player, 'Cannot Salvage', { color: '#9facbf' });
    return false;
  }

  if (entry.instanceId?Object.values(player.equippedGear || {}).some(ref=>ref?.instanceId===entry.instanceId):Object.values(player.equipment || {}).includes(item.id)) {
    game?.log?.(`${item.name} is equipped and protected from salvage.`);
    addStatusText(player, 'Equipped Item Protected', { color: '#ffcc66' });
    return false;
  }

  const rewards = getSalvageRewards(item);

  player.inventory.splice(bagIndex,1);

  for (const [materialId, qty] of rewards) {
    addItem(player, materialId, qty);
    markPartyCollectObjective(player, materialId, qty);
  }

  player.crafting = player.crafting || {};
  player.crafting.salvageCount = (player.crafting.salvageCount || 0) + 1;
  const craftingXp = getSalvageXp(item);
  const previousLevel = getSkillLevel(player.skillState, 'crafting');
  gainXp(player, 'crafting', craftingXp, game?.log);
  addLevelUpFeedback(player, 'crafting', previousLevel);

  const materialText = rewards
    .map(([id, qty]) => `${ITEMS[id]?.name || id} x${qty}`)
    .join(', ');

  game?.log?.(`Salvaged ${item.name}: ${materialText}. Crafting +${craftingXp} XP.`);
  addLootText(player, materialText, { color: '#d9ad4f', ttl: 1.15 });
  addStatusText(player, `Crafting +${craftingXp} XP`, { color: '#ffcc66', ttl: 0.95 });

  return true;
}

export function upgradeEquippedSlot(player, slot, game, quote = null) {
  return upgradeOwnedGear(player,quote || makeUpgradeQuote(player,slot),game);
}
export function upgradeOwnedGear(player,quote,game){
  const result=commitGearUpgrade(player,quote);
  if(!result.ok){game?.log?.(result.reason);return false;}
  player.crafting ||= {};
  player.crafting.upgradesPerformed=(player.crafting.upgradesPerformed || 0)+1;
  gainXp(player,'crafting',18+(result.targetTier-1)*6,game?.log);
  game?.log?.(`Upgraded ${ITEMS[result.itemId].name} to Tier ${result.targetTier}/20.`);
  addStatusText(player,`Tier ${result.targetTier}/20`,{color:'#ffcc66',ttl:1.25});
  return true;
}

export function getRecipeRequiredLevel(recipeOrId) {
  const recipe = typeof recipeOrId === 'string' ? getRecipeById(recipeOrId) : recipeOrId;
  return Math.max(1, Number(recipe?.requiredLevel || 1));
}

export function getRecipeCraftStatus(player, recipeOrId) {
  const recipe = typeof recipeOrId === 'string' ? getRecipeById(recipeOrId) : recipeOrId;

  if (!player || !recipe) {
    return { ok: false, reason: 'Recipe not found.', recipe: null, missing: [] };
  }

  const requiredLevel = getRecipeRequiredLevel(recipe);
  const level = getSkillLevel(player.skillState, recipe.skill);

  if (level < requiredLevel) {
    return {
      ok: false,
      reason: `${skillName(recipe.skill)} level ${requiredLevel} required.`,
      recipe,
      level,
      requiredLevel,
      missing: []
    };
  }

  const output = ITEMS[recipe.output];
  if (output?.type === 'tool' && !output.stack && countItem(player, recipe.output) > 0) {
    return {
      ok: false,
      reason: `${output.name} already owned.`,
      recipe,
      level,
      requiredLevel,
      missing: []
    };
  }

  const missing = (recipe.materials || [])
    .map(([id, qty]) => ({
      id,
      qty,
      have: countItem(player, id)
    }))
    .filter(entry => entry.have < entry.qty);

  if (missing.length) {
    return {
      ok: false,
      reason: `Missing ${missing.map(entry => `${ITEMS[entry.id]?.name || entry.id} x${entry.qty - entry.have}`).join(', ')}.`,
      recipe,
      level,
      requiredLevel,
      missing
    };
  }

  return {
    ok: true,
    reason: '',
    recipe,
    level,
    requiredLevel,
    missing: []
  };
}

export function craftRecipe(player, recipeOrId, game, options = {}) {
  const recipeDefinition=getRecipeById(typeof recipeOrId==='string'?recipeOrId:recipeOrId?.id);
  const access=workshopAccessStatus(player,'craftsman');
  if(!access.ok&&!hasCampfireCraftAccess(player,game,recipeDefinition,options)){game?.log?.(access.reason);return false;}
  const status = getRecipeCraftStatus(player, recipeDefinition);

  if (!status.ok) {
    if (!options.quietFailure) {
      game?.log?.(status.reason || 'Could not craft that recipe.');
      addStatusText(player, status.reason || 'Crafting Failed', { color: '#9facbf', ttl: 1.1 });
    }
    return false;
  }

  const recipe = status.recipe;

  for (const [id, qty] of recipe.materials || []) {
    removeItem(player, id, qty);
  }

  const outputQty = Math.max(1, Number(recipe.outputQty || 1));
  addItem(player, recipe.output, outputQty);
  markPartyCollectObjective(player, recipe.output, outputQty);
  gainXp(player, recipe.skill, recipe.xp || 0, game?.log);
  addLevelUpFeedback(player, recipe.skill, status.level);
  recordCraftingProgress(player, recipe);

  const outputName = ITEMS[recipe.output]?.name || recipe.output;
  const sourceText = options.source === 'campfire' ? ' at the campfire' : '';

  game?.log?.(`Crafted ${outputName} x${outputQty}${sourceText}. ${skillName(recipe.skill)} +${recipe.xp || 0} XP.`);
  addLootText(player, `${outputName}${outputQty > 1 ? ` x${outputQty}` : ''}`, {
    color: recipe.skill === 'cooking' ? '#ffcc66' : recipe.skill === 'runecraft' ? '#b68cff' : '#d9ad4f',
    ttl: 1.1
  });
  addStatusText(player, `${skillName(recipe.skill)} +${recipe.xp || 0} XP`, {
    color: recipe.skill === 'runecraft' ? '#b68cff' : '#ffcc66',
    ttl: 0.95
  });

  return true;
}

// Compatibility: the old +N label is Tier N+1. Costs take the old
// next-level argument, while the authoritative system takes a target tier.
export function getGearUpgradeLevel(player,slot){return getEquipmentTier(player,slot)-1;}
export function getGearUpgradeStatBonus(player,slot){return getEquipmentTierBonus(player,slot);}
export function getUpgradeCost(item,nextLevel){return getTierUpgradeCost(item,Number(nextLevel)+1) || {gold:0,materials:[],capped:true};}

export function isSalvageable(item) {
  return ['weapon', 'armour', 'trinket'].includes(item?.type);
}

export function isUpgradable(item) {
  return ['weapon', 'armour', 'trinket'].includes(item?.type);
}

function getSalvageRewards(item) {
  const base = RARITY_SALVAGE[item.rarity] || RARITY_SALVAGE.common;
  const rewards = base.map(([id, qty]) => [id, qty]);

  if (item.setId || item.name?.toLowerCase().includes('grave')) rewards.push(['graveAsh', 1]);
  if (item.name?.toLowerCase().includes('briar') || item.name?.toLowerCase().includes('thorn')) rewards.push(['briarRoot', 1]);
  if (item.name?.toLowerCase().includes('veyr')) rewards.push(['veyrglassShard', 1]);

  return rewards;
}

function getGatheredUpgradeMaterial(item, nextLevel) {
  if (nextLevel >= 5 && (item?.rarity === 'rare' || item?.rarity === 'occult' || item?.rarity === 'epic' || item?.rarity === 'relic')) {
    if (item?.weaponType === 'spiritFocus') return 'lumenQuartz';
    if (item?.weaponType === 'staff') return 'spiritwoodSplinter';
    if (item?.weaponType === 'bow') return 'thornsilkFiber';
    if (item?.weaponType === 'scythe') return 'graveSilver';
    if (item?.type === 'trinket') return 'tideglassCrystal';
    return 'oathsteelShard';
  }

  if (item?.weaponType === 'bow' || item?.weaponType === 'staff' || item?.weaponType === 'spiritFocus') {
    return 'sturdyHardwood';
  }

  if (item?.type === 'armour') return 'amberResin';
  if (item?.type === 'trinket') return 'fieldstone';

  return 'blackironOre';
}

function getSalvageXp(item) {
  const rarityXp = {
    common: 12,
    uncommon: 18,
    rare: 28,
    occult: 34,
    epic: 42,
    relic: 48,
    legendary: 60,
    mythic: 72,
    ancient: 90
  };

  return rarityXp[item?.rarity] || 12;
}

function recordCraftingProgress(player, recipe) {
  player.crafting = player.crafting || {};
  player.crafting.knownRecipes = Array.isArray(player.crafting.knownRecipes)
    ? player.crafting.knownRecipes
    : [];
  player.crafting.recipesCrafted = player.crafting.recipesCrafted && typeof player.crafting.recipesCrafted === 'object'
    ? player.crafting.recipesCrafted
    : {};

  if (!player.crafting.knownRecipes.includes(recipe.id)) {
    player.crafting.knownRecipes.push(recipe.id);
  }

  player.crafting.craftCount = Math.max(0, Number(player.crafting.craftCount || 0)) + 1;
  player.crafting.recipesCrafted[recipe.id] = Math.max(0, Number(player.crafting.recipesCrafted[recipe.id] || 0)) + 1;
  player.crafting.lastRecipeId = recipe.id;

  if (recipe.skill === 'cooking') {
    player.crafting.cookedCount = Math.max(0, Number(player.crafting.cookedCount || 0)) + 1;
  } else if (recipe.skill === 'runecraft') {
    player.crafting.runecraftCount = Math.max(0, Number(player.crafting.runecraftCount || 0)) + 1;
  }
}

function addLevelUpFeedback(player, skillId, previousLevel) {
  const currentLevel = getSkillLevel(player?.skillState, skillId);
  if (currentLevel <= Number(previousLevel || 1)) return;

  addStatusText(player, `${skillName(skillId)} Level ${currentLevel}`, {
    color: '#ffcc66',
    ttl: 1.35
  });
}
