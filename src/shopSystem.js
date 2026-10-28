import {equipmentPurpose,equipmentScaling,abilitySummary} from './uiInformation.js';
import {calculateDisplayWeaponDamage} from './panelInventory.js';
import {MYTHICAL_SETS} from './mythicalEquipmentData.js';
import { SKILL_SCROLL_OFFERS, purchaseSkillScroll } from './skillScrollSystem.js';
import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import { handleMenuSheetInput, menuSheetItemVisible, prepareMenuSheets,captureTouchMenuScroll,isTouchMenuInteraction } from './menuSheets.js';
// shopSystem.js
// Controller-friendly survival market overlay.

import { ITEMS,getAbilityById } from './data.js';
import { addItem, removeItem, countItem } from './player.js';
import { addLootText, addStatusText } from './floatingText.js';
import { playSfx } from './audioSystem.js';
import { markPartyCollectObjective } from './dialogueSystem.js';

const MARKET_OFFERS = [
  ...SKILL_SCROLL_OFFERS,
  ...['drownedConvergence','beastSovereign','ashenExecutioner','blightedStar','pilgrimVigil'].map(setId=>{const id=MYTHICAL_SETS[setId].pieces.find(id=>ITEMS[id].slot==='trinket') || MYTHICAL_SETS[setId].pieces[0];return {id,qty:1,price:1250,label:ITEMS[id].name,detail:'Rare commission: one Mythical set piece, always Tier 1. Explore its themed dungeon for matching gear.'};}).filter(offer=>ITEMS[offer.id]),
  { id: 'crudeFishingRod', qty: 1, price: 24, label: 'Crude Fishing Rod', detail: 'Basic rod for first fishing routes.' },
  { id: 'oldForagersKnife', qty: 1, price: 24, label: 'Old Forager\'s Knife', detail: 'Basic tool for herbs, roots, and rare plant starts.' },
  { id: 'crackedPickaxe', qty: 1, price: 26, label: 'Cracked Pickaxe', detail: 'Basic tool for stone and ore nodes.' },
  { id: 'wornHatchet', qty: 1, price: 24, label: 'Worn Hatchet', detail: 'Basic tool for woodcutting nodes.' },
  { id: 'ironPickaxe', qty: 1, price: 48, label: 'Iron Pickaxe', detail: 'Improves mining yield and rare material odds.' },
  { id: 'handScythe', qty: 1, price: 36, label: 'Hand Scythe', detail: 'Improves foraging yield and ration finds.' },
  { id: 'fishingRod', qty: 1, price: 42, label: 'Fishing Rod', detail: 'Unlocks a better fishing minigame target window.' },
  { id: 'fishingTackle', qty: 5, price: 20, label: 'Fishing Tackle x5', detail: 'Boosts rare fish odds. Sometimes consumed.' },
  { id: 'pilgrimsFocus', qty: 1, price: 58, label: 'Pilgrim\'s Focus', detail: 'A Spirit Focus weapon that fires stamina-based Focus Bolts.' },
  { id: 'fieldRations', qty: 10, price: 42, label: 'Field Rations x10', detail: 'Heals HP/stamina and fuels expeditions.' },
  { id: 'shrineTonic', qty: 1, price: 24, label: 'Shrine Tonic', detail: 'Restores HP, stamina, and awakened spirit.' },
  { id: 'patchedRoadLeathers', qty: 1, price: 34, label: 'Patched Road Leathers', detail: 'Simple chest armour for fresh expeditions.' },
  { id: 'scavengedIronHelm', qty: 1, price: 28, label: 'Scavenged Iron Helm', detail: 'Basic head protection from frontier salvage.' },
  { id: 'riverReed', qty: 5, price: 12, label: 'River Reed x5', detail: 'Basic bindings for tools, tackle, meals, and travel preparation.' },
  { id: 'tornHide', qty: 4, price: 16, label: 'Torn Hide x4', detail: 'Useful for early armour repairs and survival crafting.' },
  { id: 'wildSinew', qty: 2, price: 22, label: 'Wild Sinew x2', detail: 'Used for bows, bindings, and reinforced gear.' },
  { id: 'ironOre', qty: 3, price: 18, label: 'Black Iron Ore x3', detail: 'Basic metal for equipment and tool crafting.' },
  { id: 'ironScrap', qty: 3, price: 18, label: 'Iron Scrap x3', detail: 'Used for tool crafting and gear upgrades.' },
  { id: 'arcaneDust', qty: 1, price: 28, label: 'Arcane Dust', detail: 'Used in runecraft and higher upgrades.' }
];

const SELLABLES = [
  'crackedRelic',
  'banditToken',
  'stolenPurse',
  'hollowEye',
  'watcherGlass',
  'redSealFragment',
  'dungeonRelicShard',
  'shadowResidue',
  'redGlassIchor',
  'fieldstone',
  'blackironOre',
  'oathsteelShard',
  'graveSilver',
  'tideglassCrystal',
  'lumenQuartz',
  'thornstone',
  'hollowGem',
  'deepstone',
  'echorynSoftwood',
  'sturdyHardwood',
  'ashwoodLog',
  'thornwoodBranch',
  'ironwoodCore',
  'spiritwoodSplinter',
  'gravewoodRoot',
  'briarheartTimber',
  'amberResin',
  'blackSap',
  'moonpetal',
  'bloodmoss',
  'thornsilkVine',
  'spiritFern',
  'dawnsage',
  'redSealPoppy',
  'fishOil',
  'fishboneHook'
];

const MARKET_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'skills', label: 'Skill Scrolls' },
  { id: 'tools', label: 'Tools' },
  { id: 'gear', label: 'Gear' },
  { id: 'food', label: 'Food' },
  { id: 'materials', label: 'Materials' }
];

export function openMarketShop(game, merchant = null) {
  if (!game?.player) return false;
  if(game.player.networkRemote&&(game.hostGame||game).onlineSession?.delegateService(game.player,{type:'shop'},merchant))return true;

  const hostGame = game.hostGame || game;
  hostGame.setUiOwner?.(game.player);

  injectShopStyles();

  let overlay = document.getElementById('marketShopOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'marketShopOverlay';
    overlay.className = 'market-shop-overlay';
    document.body.appendChild(overlay);
  }

  hostGame.marketShop = {
    active: true,
    actorName: game.player.name || null,
    actor: game.player,
    ownerSlot: game.player.slot || game.player.playerNumber || 1,
    controllerSlotIndex: game.player.controllerSlotIndex ?? null,
    selectedIndex: 0,
    categoryId: merchant?.skillMerchant ? 'skills' : 'all',
    merchantName: merchant?.skillMerchant ? 'Ilyra, Pact Scribe' : null,
    lastPurchaseAt: 0
  };
  game.marketShop = hostGame.marketShop;
  overlay.__runalisGame = game;
  hostGame.applyOwnedMenuViewport?.(overlay, game.player);
  overlay.innerHTML = createMarketShopHtml(game.player, hostGame.marketShop);
  overlay.classList.add('active');
  overlay.dataset.marketSelectedIndex = '0';
  overlay.dataset.marketCategoryId = hostGame.marketShop.categoryId;
  overlay.dataset.ownerSlot = String(hostGame.marketShop.ownerSlot);
  if (hostGame.marketShop.controllerSlotIndex !== null) {
    overlay.dataset.controllerSlotIndex = String(hostGame.marketShop.controllerSlotIndex);
  } else {
    delete overlay.dataset.controllerSlotIndex;
  }
  overlay.tabIndex = -1;

  bindMarketShopEvents(game, overlay);
  applyMarketShopFocus(overlay);
  overlay.focus();
  return true;
}

export function handleMarketShopControllerInput(input) {
  const overlay = document.getElementById('marketShopOverlay');
  if (!overlay?.classList.contains('active')) return false;

  if (handleMenuSheetInput(input, overlay)) {
    const row = [...overlay.querySelectorAll('[data-market-row]')].find(menuSheetItemVisible);
    if (row) row.click();
    return true;
  }
  const game = overlay.__runalisGame;
  const state = getMarketShopState(game, overlay);
  const offers = getFilteredMarketOffers(state.categoryId);

  if (input?.rbPressed || input?.rightShoulderPressed || input?.tabRightPressed) {
    changeMarketCategory(game, overlay, 1);
    return true;
  }

  if (input?.lbPressed || input?.leftShoulderPressed || input?.tabLeftPressed) {
    changeMarketCategory(game, overlay, -1);
    return true;
  }

  if (input?.cancelPressed || input?.backPressed) {
    closeMarketShop(overlay.__runalisGame);
    return true;
  }

  if (input?.xPressed) {
    sellMarketSalvage(game);
    refreshMarketShop(game, overlay);
    return true;
  }

  if (!offers.length) return true;

  const direction=menuDirection(input);
  if(direction){
    const items=getMarketShopFocusableElements(overlay).filter(menuSheetItemVisible);
    const current=items.includes(document.activeElement)?document.activeElement:overlay.querySelector('.market-offer-row.selected');
    const next=directionalMenuItem(items,current,direction);
    if(next?.matches('[data-market-row]'))next.click();
    else if(next){overlay.querySelectorAll('.shop-controller-focus').forEach(e=>e.classList.remove('shop-controller-focus'));next.classList.add('shop-controller-focus');next.focus({preventScroll:true});}
    return true;
  }

  if (input?.confirmPressed) {
    const focused=document.activeElement;
    if(overlay.contains(focused)&&focused.matches('button:not([data-market-row])')){focused.click();return true;}
    const selected = offers[clampIndex(state.selectedIndex || 0, offers.length)];
    if (selected) {
      buyMarketOffer(game, selected.id);
      refreshMarketShop(game, overlay);
    }
    return true;
  }

  return true;
}

function createMarketShopHtmlLegacy(player) {
  return cleanMarketShopText(`
    <div class="market-shop-panel" role="dialog" aria-modal="true" aria-label="Market shop">
      <div class="market-shop-header">
        <span>Capital Market</span>
        <h2>Survival Goods</h2>
        <p>Gold: <b>${Math.max(0, Number(player.gold || 0))}</b>. Tools improve world skills. Rations heal and fund long travel.</p>
      </div>

      <div class="market-shop-grid">
        ${MARKET_OFFERS.map(offer => marketOfferCardLegacy(player, offer)).join('')}
      </div>

      <div class="market-shop-actions">
        <button type="button" data-market-sell>Sell Salvage</button>
        <button type="button" data-market-close>Leave</button>
      </div>
    </div>
  `);
}

function marketOfferCardLegacy(player, offer) {
  const item = ITEMS[offer.id];
  const owned = countItem(player, offer.id);
  const canBuy = (player.gold || 0) >= offer.price;
  const duplicateTool = (item?.type === 'tool' && !item.stack && owned > 0) || (item?.type === 'scroll' && (owned > 0 || player.knownAbilities?.includes(item.learnsAbility)));
  const disabled = !canBuy || duplicateTool;

  return `
    <button type="button" class="market-offer-card" data-market-buy="${offer.id}" ${disabled ? 'disabled' : ''}>
      <b>${escapeHtml(offer.label)}</b>
      <span>${offer.price} gold${owned ? ` • Owned ${owned}` : ''}</span>
      <small>${escapeHtml(duplicateTool ? 'Already owned.' : offer.detail)}</small>
    </button>
  `;
}

function createMarketShopHtml(player, state = null) {
  const safeState = state || {};
  const categoryId = MARKET_CATEGORIES.some(category => category.id === safeState.categoryId)
    ? safeState.categoryId
    : 'all';
  const offers = getFilteredMarketOffers(categoryId);
  const selectedIndex = clampIndex(safeState.selectedIndex || 0, offers.length);
  const selected = offers[selectedIndex] || offers[0] || null;

  return cleanMarketShopText(`
    <div class="market-shop-panel" role="dialog" aria-modal="true" aria-label="Market shop">
      <div class="market-shop-header">
        <div>
          <span>${safeState.merchantName ? 'Orrakai · Skill Merchant' : 'Capital Market'}</span>
          <h2>${safeState.merchantName || 'Survival Goods'}</h2>
        </div>
        <p>Gold <b>${Math.max(0, Number(player.gold || 0))}</b></p>
      </div>

      <div class="market-shop-tabs" role="tablist" aria-label="Market categories">
        ${MARKET_CATEGORIES.map(category => marketCategoryButton(category, categoryId)).join('')}
      </div>

      <div class="market-shop-body">
        <div class="market-shop-list" role="listbox" aria-label="Market goods">
          ${offers.map((offer, index) => marketOfferRow(player, offer, index, index === selectedIndex)).join('')}
        </div>
        <div class="market-shop-detail">
          ${marketOfferDetail(player, selected)}
        </div>
      </div>

      <div class="market-shop-actions">
        <button type="button" data-market-sell>Sell Salvage</button>
        <span class="market-shop-hint">D-pad select  A buy  X sell salvage  LB/RB category</span>
        <button type="button" data-market-close>Leave</button>
      </div>
    </div>
  `);
}

function marketCategoryButton(category, currentId) {
  const active = category.id === currentId;

  return `
    <button type="button" class="market-category-button${active ? ' active' : ''}" data-market-category="${category.id}" aria-selected="${active ? 'true' : 'false'}">
      ${escapeHtml(category.label)}
    </button>
  `;
}

function marketOfferRow(player, offer, index, selected) {
  const item = ITEMS[offer.id];
  const owned = countItem(player, offer.id);
  const canBuy = (player.gold || 0) >= offer.price;
  const duplicateTool = (item?.type === 'tool' && !item.stack && owned > 0) || (item?.type === 'scroll' && (owned > 0 || player.knownAbilities?.includes(item.learnsAbility)));
  const disabled = !canBuy || duplicateTool;
  const meta = getMarketOfferMeta(offer);

  return `
    <button type="button" class="market-offer-row${selected ? ' selected' : ''}" data-market-row="${index}" data-market-offer="${offer.id}" aria-selected="${selected ? 'true' : 'false'}">
      <span class="market-offer-name">${escapeHtml(offer.label)}</span>
      <span class="market-offer-meta">${escapeHtml(meta)}${owned ? ` - Owned ${owned}` : ''}</span>
      <span class="market-offer-price${disabled ? ' disabled' : ''}">${duplicateTool ? 'Owned' : `${offer.price}g`}</span>
    </button>
  `;
}

function marketOfferDetail(player, offer) {
  if (!offer) {
    return '<p class="market-empty">No goods in this category.</p>';
  }

  const item = ITEMS[offer.id];
  const owned = countItem(player, offer.id);
  const canBuy = (player.gold || 0) >= offer.price;
  const duplicateTool = (item?.type === 'tool' && !item.stack && owned > 0) || (item?.type === 'scroll' && (owned > 0 || player.knownAbilities?.includes(item.learnsAbility)));
  const disabled = !canBuy || duplicateTool;
  const statBits = [
    item?.type==='weapon'?`Strike power ${calculateDisplayWeaponDamage(player,item,{id:item.id,upgradeTier:1})}`:null,
    item?.type==='weapon'?`Scales with ${equipmentScaling(item)}`:null,
    item?.armour ? `Armour +${item.armour}` : null,
    item?.power&&item?.type!=='weapon' ? `Power +${item.power}` : null,
    item?.spirit ? `Spirit +${item.spirit}` : null,
    item?.heal ? `Heal ${item.heal}` : null,
    item?.stamina ? `Stamina ${item.stamina}` : null,
    owned ? `Owned ${owned}` : null
  ].filter(Boolean);

  return `
    <div class="market-detail-card">
      <span class="market-detail-kicker">${escapeHtml(getMarketOfferMeta(offer))}</span>
      <h3>${escapeHtml(offer.label)}</h3>
      <p>${escapeHtml(duplicateTool ? 'Already owned.' : item?.type==='scroll'?`Learn ${getAbilityById(item.learnsAbility)?.name}: ${abilitySummary(getAbilityById(item.learnsAbility))}`:item?.slot?equipmentPurpose(item):offer.detail || item?.desc || 'A practical market good.')}</p>
      <div class="market-detail-stats">
        ${statBits.map(bit => `<span>${escapeHtml(bit)}</span>`).join('')}
      </div>
      ${MYTHICAL_SETS[item?.setId]?`<p><b>${escapeHtml(MYTHICAL_SETS[item.setId].name)} · Tier 1 commission.</b> Collect three matching pieces to complete the set. ${escapeHtml(MYTHICAL_SETS[item.setId].effects[3])}</p>`:''}
      <button type="button" class="market-buy-button" data-market-buy="${offer.id}" ${disabled ? 'disabled' : ''}>
        ${duplicateTool ? 'Already Owned' : canBuy ? `Buy - ${offer.price} Gold` : `Need ${Math.max(0, offer.price - (player.gold || 0))} More Gold`}
      </button>
    </div>
  `;
}

function bindMarketShopEvents(game, overlay) {
  overlay.querySelectorAll('[data-market-category]').forEach(button => {
    button.addEventListener('click', () => {
      const state = getMarketShopState(game, overlay);
      state.categoryId = button.dataset.marketCategory || 'all';
      state.selectedIndex = 0;
      refreshMarketShop(game, overlay);
    });
  });

  overlay.querySelectorAll('[data-market-row]').forEach(button => {
    button.addEventListener('click', () => {
      const state = getMarketShopState(game, overlay);
      state.selectedIndex = Number(button.dataset.marketRow || 0);
      refreshMarketShop(game, overlay);
    });
  });

  overlay.querySelectorAll('[data-market-buy]').forEach(button => {
    button.addEventListener('click', () => {
      buyMarketOffer(game, button.dataset.marketBuy);
      refreshMarketShop(game, overlay);
    });
  });

  overlay.querySelector('[data-market-sell]')?.addEventListener('click', () => {
    sellMarketSalvage(game);
    refreshMarketShop(game, overlay);
  });

  overlay.querySelector('[data-market-close]')?.addEventListener('click', () => {
    closeMarketShop(game);
  });

  overlay.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMarketShop(game);
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'PageDown', 'PageUp'].includes(event.key)) return;
    event.preventDefault();

    handleMarketShopControllerInput({
      downPressed: event.key === 'ArrowDown',
      upPressed: event.key === 'ArrowUp',
      rightPressed: event.key === 'ArrowRight',
      leftPressed: event.key === 'ArrowLeft',
      tabRightPressed: event.key === 'PageDown',
      tabLeftPressed: event.key === 'PageUp',
      confirmPressed: event.key === 'Enter'
    });
  };
}

function buyMarketOffer(game, itemId) {
  const offer = MARKET_OFFERS.find(entry => entry.id === itemId);
  if (!offer || !game?.player) return false;

  const player = game.player;
  const item = ITEMS[itemId];
  const state = getMarketShopState(game, document.getElementById('marketShopOverlay'));
  const now = performance.now();

  if (now - Number(state.lastPurchaseAt || 0) < 140) return false;

  if (item?.type === 'tool' && !item.stack && countItem(player, itemId) > 0) {
    game.log?.(`You already own ${item.name}.`);
    return false;
  }

  if ((player.gold || 0) < offer.price) {
    addStatusText(player, 'Not Enough Gold', { color: '#d9ad4f' });
    return false;
  }

  if (item.type === 'scroll') {
    const result = purchaseSkillScroll(player,itemId);
    game.log?.(result.ok ? `Purchased ${offer.label}. Read it in your inventory.` : result.reason);
    if (result.ok) { state.lastPurchaseAt=now; playSfx('loot',{volume:.7}); }
    return result.ok;
  }
  state.lastPurchaseAt = now;
  player.gold -= offer.price;
  player.gold = Math.max(0, Number(player.gold || 0));
  addItem(player, itemId, offer.qty);
  markPartyCollectObjective(player, itemId, offer.qty);
  game.log?.(`Market: bought ${offer.label} for ${offer.price} gold.`);
  addLootText(player, offer.label, { color: item?.type === 'tool' ? '#ffcc66' : '#d9ad4f' });
  playSfx('loot', { volume: 0.74, throttle: 0.08 });
  return true;
}

function sellMarketSalvage(game) {
  const player = game?.player;
  if (!player) return false;

  let soldValue = 0;
  let soldCount = 0;

  for (const itemId of SELLABLES) {
    const qty = countItem(player, itemId);
    if (qty <= 0) continue;

    const sellQty = Math.min(qty, itemId === 'crackedRelic' ? 1 : 3);
    removeItem(player, itemId, sellQty);
    soldValue += Math.max(1, Math.floor((ITEMS[itemId]?.value || 4) * 0.65)) * sellQty;
    soldCount += sellQty;
  }

  if (soldValue <= 0) {
    game.log?.('Market: no salvage goods to sell.');
    addStatusText(player, 'No Salvage', { color: '#9facbf' });
    return false;
  }

  player.gold += soldValue;
  game.log?.(`Market: sold ${soldCount} salvage item${soldCount === 1 ? '' : 's'} for ${soldValue} gold.`);
  addLootText(player, `${soldValue} Gold`, { color: '#d9ad4f' });
  playSfx('ui', { volume: 0.7, throttle: 0.08 });
  return true;
}

function getMarketShopState(game, overlay = null) {
  const hostGame = game?.hostGame || game;
  const state = hostGame?.marketShop || game?.marketShop || {};
  const categoryId = overlay?.dataset.marketCategoryId || state.categoryId || 'all';

  state.categoryId = MARKET_CATEGORIES.some(category => category.id === categoryId)
    ? categoryId
    : 'all';
  state.selectedIndex = Math.max(0, Number(overlay?.dataset.marketSelectedIndex ?? state.selectedIndex ?? 0));
  state.lastPurchaseAt = Math.max(0, Number(state.lastPurchaseAt || 0));

  if (hostGame) hostGame.marketShop = state;
  if (game && game !== hostGame) game.marketShop = state;
  return state;
}

function changeMarketCategory(game, overlay, direction) {
  const state = getMarketShopState(game, overlay);
  const currentIndex = Math.max(0, MARKET_CATEGORIES.findIndex(category => category.id === state.categoryId));
  const nextIndex = (currentIndex + Math.sign(direction || 1) + MARKET_CATEGORIES.length) % MARKET_CATEGORIES.length;

  state.categoryId = MARKET_CATEGORIES[nextIndex].id;
  state.selectedIndex = 0;
  refreshMarketShop(game, overlay);
}

function getFilteredMarketOffers(categoryId = 'all') {
  if (categoryId === 'all') return MARKET_OFFERS;

  return MARKET_OFFERS.filter(offer => getMarketOfferCategory(offer) === categoryId);
}

function getMarketOfferCategory(offer) {
  const item = ITEMS[offer?.id];
  if (!item) return 'materials';
  if (item.type === 'scroll') return 'skills';
  if (item.type === 'tool') return 'tools';
  if (item.type === 'weapon' || item.type === 'armour' || item.slot) return 'gear';
  if (item.type === 'food' || item.type === 'consumable' || offer.id === 'fieldRations' || offer.id === 'shrineTonic') return 'food';
  return 'materials';
}

function getMarketOfferMeta(offer) {
  const item = ITEMS[offer?.id];
  const category = MARKET_CATEGORIES.find(entry => entry.id === getMarketOfferCategory(offer));
  return category?.label || formatMarketLabel(item?.type || 'Goods');
}

function formatMarketLabel(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, letter => letter.toUpperCase());
}

function clampIndex(index, length) {
  const safeLength = Math.max(0, Number(length || 0));
  if (!safeLength) return 0;
  return Math.max(0, Math.min(safeLength - 1, Number(index || 0)));
}

function refreshMarketShop(game, overlay) {
  // The event handler has already updated state. Reading the previous DOM here
  // would undo the selected category/row before the new ledger is rendered.
  const state = getMarketShopState(game);
  const restoreScroll=overlay.dataset.marketCategoryId===state.categoryId?captureTouchMenuScroll(overlay):()=>{};
  const offers = getFilteredMarketOffers(state.categoryId);
  state.selectedIndex = clampIndex(state.selectedIndex || 0, offers.length);
  overlay.dataset.marketSelectedIndex = String(state.selectedIndex);
  overlay.dataset.marketCategoryId = state.categoryId || 'all';
  overlay.innerHTML = createMarketShopHtml(game.player, state);
  bindMarketShopEvents(game, overlay);
  applyMarketShopFocus(overlay);
  restoreScroll();
}

function closeMarketShop(game) {
  const hostGame = game?.hostGame || game;
  const overlay = document.getElementById('marketShopOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.innerHTML = '';
    overlay.__runalisGame = null;
    delete overlay.dataset.ownerSlot;
    delete overlay.dataset.controllerSlotIndex;
  }

  if (hostGame?.marketShop) {
    hostGame.marketShop.active = false;
    hostGame.marketShop = null;
  }

  if (game && game !== hostGame) {
    game.marketShop = null;
  }

  game?.log?.('You leave the market.');
}

function getMarketShopFocusableElements(overlay) {
  return Array.from(overlay.querySelectorAll('.market-offer-row, .market-buy-button, .market-category-button, .market-shop-actions button')).filter(element => {
    if (!element || element.disabled) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function applyMarketShopFocus(overlay) {
  overlay.querySelectorAll('.shop-controller-focus').forEach(element => {
    element.classList.remove('shop-controller-focus');
  });

  const selected = overlay.querySelector('.market-offer-row.selected') || overlay.querySelector('.market-offer-row');
  if (!selected) return;

  selected.classList.add('shop-controller-focus');
  prepareMenuSheets();
  selected.focus?.({ preventScroll: true });
  if (!isTouchMenuInteraction()&&!selected.closest('.menu-sheet-view')) selected.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function injectShopStyles() {
  if (document.getElementById('runalisMarketShopStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisMarketShopStyles';
  style.textContent = `
    .market-shop-overlay {
      position: fixed;
      inset: 0;
      z-index: 76;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(3, 5, 10, 0.78);
      backdrop-filter: blur(4px);
    }

    .market-shop-overlay.active { display: flex; }

    .market-shop-panel {
      width: min(920px, 94vw);
      max-height: min(720px, 92vh);
      padding: 22px;
      color: #efe3c3;
      background: linear-gradient(180deg, rgba(31,31,39,0.98), rgba(10,11,16,0.98));
      border: 1px solid rgba(217, 173, 79, 0.44);
      box-shadow: 0 26px 70px rgba(0,0,0,0.62), inset 0 0 0 1px rgba(255,255,255,0.05);
    }

    .market-shop-header span {
      color: #d9ad4f;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1.6px;
      text-transform: uppercase;
    }

    .market-shop-header h2 {
      margin: 4px 0 8px;
      letter-spacing: 0;
    }

    .market-shop-header p {
      margin: 0 0 16px;
      color: #aeb6c7;
    }

    .market-shop-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .market-offer-card {
      min-height: 130px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      text-align: left;
      border-radius: 4px;
      border: 1px solid rgba(217, 173, 79, 0.26);
      color: #f4ead2;
      background: linear-gradient(180deg, rgba(35,34,44,0.96), rgba(13,14,21,0.98));
    }

    .market-offer-card:disabled {
      opacity: 0.45;
      filter: grayscale(0.35);
    }

    .market-offer-card span,
    .market-offer-card small {
      color: #aeb6c7;
    }

    .market-shop-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .market-shop-actions button {
      min-height: 44px;
      padding: 0 18px;
      border-radius: 4px;
      border: 1px solid rgba(217, 173, 79, 0.36);
      color: #f4ead2;
      background: linear-gradient(180deg, rgba(49, 39, 22, 0.96), rgba(18, 15, 10, 0.98));
      font-weight: 900;
      text-transform: uppercase;
    }

    .market-shop-overlay[data-owner-slot] {
      inset: auto;
      left: var(--owner-viewport-left, 0vw);
      top: var(--owner-viewport-top, 0vh);
      width: var(--owner-viewport-width, 100vw);
      height: var(--owner-viewport-height, 100vh);
      padding: 8px;
      align-items: stretch;
      justify-content: stretch;
    }

    .market-shop-overlay.active {
      display: flex;
    }

    .market-shop-panel {
      width: 100%;
      height: 100%;
      max-height: none;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: clamp(10px, 1.8vh, 18px);
      gap: clamp(8px, 1.2vh, 12px);
    }

    .market-shop-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      flex-shrink: 0;
    }

    .market-shop-header h2 {
      margin-bottom: 0;
      font-size: clamp(20px, 2.2vh, 28px);
      line-height: 1;
    }

    .market-shop-header p {
      margin: 0;
      padding: 7px 10px;
      border: 1px solid rgba(217, 173, 79, 0.28);
      background: rgba(0, 0, 0, 0.22);
      color: #efe3c3;
      font-weight: 900;
      white-space: nowrap;
    }

    .market-shop-tabs {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 6px;
      flex-shrink: 0;
    }

    .market-category-button {
      min-height: 32px;
      border-radius: 4px;
      border: 1px solid rgba(217, 173, 79, 0.24);
      color: #c7ceda;
      background: rgba(12, 13, 18, 0.9);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .market-category-button.active {
      color: #11131a;
      border-color: rgba(255, 204, 102, 0.82);
      background: linear-gradient(180deg, #ffe08a, #d9ad4f);
    }

    .market-shop-body {
      flex: 1 1 auto;
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(260px, 1.15fr) minmax(220px, 0.85fr);
      gap: 10px;
    }

    .market-shop-list {
      min-height: 0;
      overflow-y: auto;
      padding: 4px;
      border: 1px solid rgba(217, 173, 79, 0.2);
      background: rgba(5, 6, 10, 0.42);
    }

    .market-offer-row {
      width: 100%;
      min-height: 42px;
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(86px, 0.8fr) auto;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
      padding: 8px 9px;
      border-radius: 4px;
      border: 1px solid rgba(217, 173, 79, 0.16);
      color: #efe3c3;
      background: rgba(18, 19, 26, 0.92);
      text-align: left;
    }

    .market-offer-row.selected {
      border-color: rgba(255, 204, 102, 0.74);
      background: linear-gradient(180deg, rgba(62, 49, 28, 0.94), rgba(23, 19, 13, 0.98));
    }

    .market-offer-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 900;
    }

    .market-offer-meta,
    .market-offer-price {
      color: #aeb6c7;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .market-offer-price {
      color: #ffcc66;
      text-align: right;
    }

    .market-offer-price.disabled {
      color: #9facbf;
    }

    .market-shop-detail {
      min-width: 0;
      min-height: 0;
      border: 1px solid rgba(217, 173, 79, 0.22);
      background: rgba(8, 10, 15, 0.68);
      overflow: hidden;
    }

    .market-detail-card {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 13px;
      gap: 9px;
    }

    .market-detail-kicker {
      color: #d9ad4f;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .market-detail-card h3 {
      margin: 0;
      font-size: clamp(17px, 1.9vh, 22px);
      line-height: 1.05;
    }

    .market-detail-card p {
      margin: 0;
      color: #aeb6c7;
      line-height: 1.35;
      font-size: 13px;
    }

    .market-detail-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 0;
      overflow: hidden;
    }

    .market-detail-stats span {
      padding: 4px 7px;
      border: 1px solid rgba(174, 182, 199, 0.2);
      color: #d7ddeb;
      background: rgba(255, 255, 255, 0.04);
      font-size: 11px;
      font-weight: 800;
    }

    .market-buy-button {
      min-height: 42px;
      margin-top: auto;
      border-radius: 4px;
      border: 1px solid rgba(255, 204, 102, 0.62);
      color: #11131a;
      background: linear-gradient(180deg, #ffe08a, #d9ad4f);
      font-weight: 900;
      text-transform: uppercase;
    }

    .market-buy-button:disabled {
      color: #aeb6c7;
      border-color: rgba(174, 182, 199, 0.22);
      background: rgba(18, 19, 26, 0.88);
    }

    .market-empty {
      margin: 14px;
      color: #aeb6c7;
    }

    .market-shop-actions {
      flex-shrink: 0;
      align-items: center;
      margin-top: 0;
    }

    .market-shop-hint {
      flex: 1;
      color: #9facbf;
      font-size: 12px;
      font-weight: 800;
      text-align: center;
    }

    .shop-controller-focus {
      outline: 3px solid rgba(255, 204, 102, 0.95) !important;
      outline-offset: 3px !important;
      box-shadow:
        0 0 0 4px rgba(217, 173, 79, 0.18),
        0 0 32px rgba(217, 173, 79, 0.38) !important;
      border-color: rgba(255, 204, 102, 0.9) !important;
    }

    @media (max-width: 820px) {
      .market-shop-body {
        grid-template-columns: minmax(0, 1fr);
      }

      .market-shop-detail {
        min-height: 170px;
      }

      .market-shop-tabs {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  `;

  document.head.appendChild(style);
}

function cleanMarketShopText(html) {
  return String(html || '').replace(/\u00e2\u20ac\u00a2/g, '-');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[character]));
}
