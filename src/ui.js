import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import {abilitySummary,abilityRequirements,abilityScaling,equipmentPurpose,equipmentScaling,informationNumber} from './uiInformation.js';
import {getAbilityChargeTime} from './chargeSystem.js';
import {bindMobileSkills} from './mobileSkills.js';
import {getSunkenPressureState,SUNKEN_PRESSURE} from './sunkenPressureSystem.js';
import {isGravecallerSustain,gravecallerSkillLifesteal} from './gravecallerSustain.js';
import {progressionPower} from './combatPower.js';
import {roseMantleProfile} from './roseMantleSystem.js';
import {defensiveProtection,calculateBubbleWardDuration,calculateBubbleWardFlatAbsorb} from './protectionStats.js';
import {applyMythicalAbilityModifiers} from './mythicalEquipmentSystem.js';
import {renderSubclassTreeChoice,bindSubclassTreeControls,handleSubclassTreeControls,renderAbilityMorphChoices,bindAbilityMorphControls} from './abilityMorphUi.js';
import {getPlayerExpertise,getAbilityEffectiveness,expertiseEffectText} from './skillExpertiseSystem.js';
import {resolveSubclassAbility} from './subclassVariants.js';
import {getSubclassTreeNode,getPlayerSubclass,getClassSubclasses} from './subclassSystem.js';
import {subclassSkillIcon} from './subclassArt.js';
import { getClassAffinities, CORE_ATTRIBUTES, COMBAT_PROFICIENCIES } from './progressionProfiles.js';
import { getMasteryProgress, getMasteryBonuses, applyAbilityMastery } from './abilityMasterySystem.js';
import { getAbilityBindingLabel } from './abilityBindings.js';
import { PRIMARY_WEAPON_SPIRIT_ON_HIT } from './combatMoves.js';
import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import {closeWorkshopService} from './workshopService.js';
// ui.js
// Runalis UI coordinator + non-inventory panels:
// character, skills, quests, log, unit frames, and combat HUD.
// Inventory/crafting/equipment item rendering lives in panelInventory.js.
// Styles live in uiStyles.js.
//
// Updated:
// - Adds Level to top-left player HUD.
// - Adds weapon/Defence/Hitpoints combat progression to menus.
// - Removes old breakthrough language.
// - Keeps modular inventory/panel system intact.

import { hudArtIcon } from './artIcons.js';
import { skillTreeIconMarkup } from './skillTreeIconArt.js';
import {hudPortraitMarkup} from './hudPortrait.js';
import {
  ITEMS,
  QUESTS,
  RARITY,
  getAbilityById,
  getAbilitySkillRequirement
} from './data.js';

import {
  countItem,
  migratePlayer,
  getPower,
  getArmour
} from './player.js';

import {
  getAllSkillDefinitions,
  getSkillDisplayStatus,
  getSkillProgress,
  hasUsedSkill,
  getCharacterBuildName,
  getSkillLevel,
  getHighestCombatSkills,
  getCombatLevelProgress,
  getProgressionSummary
} from './skills.js';

import { injectRunalisUiStyles } from './uiStyles.js';
import {handleMenuSheetInput,menuSheetItemVisible,revealMenuFocus,captureTouchMenuScroll} from './menuSheets.js';
import { renderMinimapHud } from './minimapHud.js';
import {fitGameplayCanvas} from './hudViewport.js';

import {
  renderInventory,
  bindInventoryButtons,
  bindCharacterButtons,
  ensureEquipmentShape,
  calculateDisplayWeaponDamage,
  calculateInventoryValue,
  calculateEquippedValue,
  performInventoryPrimaryAction,
  performInventorySalvageAction,
  performInventoryUpgradeAction,
  performEquipmentSlotPrimaryAction,
  performEquipmentSlotUpgradeAction,
  performCoterieSlotPrimaryAction,
  performCoterieInventoryPrimaryAction
} from './panelInventory.js';

import {
  renderWorldMap,
  bindWorldMapButtons,
  isWorldMapPanelActive,
  handleWorldMapControllerInput
} from './panelWorldMap.js';

import {
  openCharacterCreator
} from './characterCreator.js';

import {
  CORE_SKILL_TREE_ORDER,
  BLOODLINE_SKILL_TREE_ORDER,
  WEAPON_SKILL_TREE_ORDER,
  getSkillTreeNodesByTree,
  getEarnedSkillTreePoints,
  getSpentSkillTreePoints,
  getAvailableSkillTreePoints,
  describeSkillTreeBonuses,
  getSkillTreeBonuses,
  canSpendSkillTreeNode,
  spendSkillTreeNode,
  isSkillTreeNodeUnlocked,
  getSkillTreeLayout,
  getAvailableWeaponSkillTrees
} from './skillTreeSystem.js';

import {
  assignAbilityToSlot,
  clearAbilitySlot,
  getAbilityAvailability,
  getAbilityCategory,
  getKnownActiveAbilities
} from './abilityLoadoutSystem.js';

import {
  getAbilityUseChargeProfile,
  getAbilityUseChargeState
} from './abilityChargeSystem.js';

import {
  BLOODLINE_DEFINITIONS,
  getPlayerBloodline
} from './bloodlineSystem.js';

import { getQuestMaterialSourceHint } from './questMaterialSources.js';

const INVENTORY_SALVAGE_HOLD_MS = 650;

const HUD_ABILITY_ICONS = {
  oathkeeperOathStrike: 'OS',
  oathkeeperBastionBash: 'BB',
  oathkeeperDivineLeap: 'DL',
  oathkeeperJudgmentSmite: 'JS',
  oathkeeperConsecratedGround: 'CG',
  oathkeeperBulwarkOfLight: 'BW',
  oathkeeperLastRite: 'LR',
  oathkeeperHeavenbreakerJudgment: 'HJ',
  heavyCut: 'OS',
  cleavingStep: 'DL',
  radiantSmite: 'JS',
  aegisBreaker: 'BB',
  quickShot: 'TD',
  markedArrow: 'MS',
  arrowVolley: 'FA',
  smokeBomb: 'SB',
  fellhunterPracticalStrike: 'PS',
  fellhunterThrowingDaggers: 'TD',
  fellhunterBearTrap: 'BT',
  fellhunterCaltrops: 'CT',
  fellhunterBombToss: 'BO',
  fellhunterGrapplingHook: 'GH',
  fellhunterFlamingArrowVolley: 'FA',
  fellhunterSmokeBomb: 'SB',
  fellhunterMarkedShot: 'MS',
  fellhunterKillZone: 'KZ',
  graveSpark: 'NB',
  summonLich: 'SL',
  bloodLance: 'BL',
  soulSiphon: 'SS',
  thornbinderThornLash: 'TL',
  thornbinderBriarHook: 'BH',
  thornbinderBramblePatch: 'BP',
  thornbinderRosebiteBurst: 'RB',
  thornbinderLivingBriar: 'LB',
  thornbinderRootPrison: 'RP',
  thornbinderSummonThornlings: 'TS',
  thornbinderSummonElderThornbeast: 'ET',
  vineWhip: 'TL',
  summonThornbeast: 'TS',
  wildBloom: 'LB',
  brambleSnare: 'RP',
  hydromancerWaterTorrent: 'WT',
  hydromancerBubbleWard: 'BW',
  hydromancerMendingCurrent: 'MC',
  hydromancerTidalCut: 'TC',
  hydromancerRiptideStep: 'RS',
  hydromancerDrowningPressure: 'DP',
  hydromancerWellspring: 'WS',
  hydromancerDelugeCrown: 'DC',
  lightbringerGleamBolt: 'GB',
  lightbringerHaloBrand: 'HB',
  lightbringerRayOfRebuke: 'RR',
  lightbringerPrismGuard: 'PG',
  lightbringerDawncarver: 'DC',
  lightbringerSolarVerdict: 'SV',
  lightbringerHaloAegis: 'HA',
  lightbringerFirstSunrise: 'FS',
  voidstepBurst: 'VS',
  summonEldritchHorror: 'EH',
  blackStarPulse: 'BP',
  redMawRift: 'RM',
  guard: 'GD',
  briarWard: 'BW',
  ironOath: 'IO',
  hellfireBrand: 'HF',
  seraphicAegis: 'SA',
  crimsonFeast: 'CF'
};

let activeMenuInputGame = null;
let menuInputOwnershipBound = false;
let lastMenuPointer = null;

// -----------------------------------------------------------------------------
// INIT / ROOT RENDER
// -----------------------------------------------------------------------------

export function initUI(game) {
  injectRunalisUiStyles();
  injectProgressionHudStyles();
  injectControllerFocusStyles();
  hideLegacyTopBanner();

  game.uiState = game.uiState || createDefaultUIState();
  bindMenuInputOwnership(game);

  const panelRoot = document.querySelector('.panel');
  if (panelRoot) {
    panelRoot.classList.remove('open');
  }

  document.querySelectorAll('.tab').forEach(btn => {
    // Replace the previous game's handler so profile changes cannot retain
    // closures that still point at an older game instance.
    btn.onclick = () => {
      const targetGame = game.uiMenuView || game;
      const tabId = btn.dataset.tab;
      const root = document.querySelector('.panel');

      const alreadyOpen =
        targetGame.uiState.activeMainTab === tabId &&
        root?.classList.contains('open');

      if (alreadyOpen) {
        targetGame.uiState.activeMainTab = null;
        setMainPanelDomState(targetGame, null);
        return;
      }

      targetGame.uiState.activeMainTab = tabId;
      setMainPanelDomState(targetGame, tabId);
      // The periodic pass only refreshes the HUD. Populate the chosen menu
      // from current gameplay state when the player opens it.
      renderOpenedMainPanel(targetGame, tabId);
    };
  });

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.onclick = () => game.save?.(true);

  const loadBtn = document.getElementById('loadBtn');
  if (loadBtn) loadBtn.onclick = () => game.loadSave?.();
}

export function renderUI(player, logLines, game, options = {}) {
  const panel=document.querySelector('.panel.open'),active=panel?.querySelector('.tab-panel.active');
  const sameTab=active?.id===game?.uiState?.activeMainTab;
  const sameSubtab=active?.id==='skills'?active.dataset.skillsSubtab===game.uiState.skillsSubtab:active?.id==='inventory'?active.dataset.inventorySubtab===game.uiState.inventorySubtab:true;
  const restore=sameTab&&sameSubtab?captureTouchMenuScroll(panel):()=>{};
  try{return renderUIContent(player,logLines,game,options);}finally{restore();}
}

function renderUIContent(player, logLines, game, options = {}) {
  fitGameplayCanvas(game);
  migratePlayer(player);
  ensureEquipmentShape(player);
  hideLegacyTopBanner();

  document.body.dataset.runalisClass = player.classId || 'classless';
  document.body.classList.toggle(
    'runalis-low-health',
    (player.hp || 0) / Math.max(1, player.maxHp || 1) < 0.34
  );

  game.uiState = game.uiState || createDefaultUIState();
  activeMenuInputGame = game;
  syncUiOwnerDom(player, game);

  const dialogueActive = !!game?.dialogue?.active;
  const hostPlayer = game?.hostGame?.player || game?.player || player;
  const dialogueActor = game?.dialogue?.actor || hostPlayer;
  const activeCoopCount = (hostPlayer?.coop?.players || []).filter(ally => ally && ally.active !== false && !ally.networkRemote).length;
  const dialogueBlocksGlobalHud = dialogueActive && dialogueActor === hostPlayer && activeCoopCount === 0;
  document.body.classList.toggle('couch-coop-active', activeCoopCount > 0);
  document.body.classList.toggle('dialogue-active', dialogueBlocksGlobalHud);

  // Menu actions still request a full refresh. Periodic HUD updates should
  // not rebuild hidden inventories, graphs and controller bindings.
  const hudOnly = options.hudOnly && !game.uiState.activeMainTab && !game.uiState.menuChooserOpen;
  if (!hudOnly) {
    renderCharacter(player, game);
    renderSkills(player, game);
    renderInventory(player, game);
    renderQuests(player, game);
    renderWorldMap(player, game);
    renderLog(logLines);
    decorateInGameMenuPanels(game);
  }

  if (dialogueBlocksGlobalHud) {
    hideGameHudDom();
    if (!hudOnly) {
      restoreActiveMainPanel(game);
      bindDynamicUI(player, game);
    }
    return;
  }

  if (activeCoopCount > 0) {
    hideGameHudDom();
  } else {
    const hudPlayer = hostPlayer;
    renderUnitFrames(hudPlayer);
    renderCombatHud(hudPlayer);
    renderMinimapHud(game);
    renderTrackedQuestHud(hudPlayer);
  }

  if (!hudOnly) {
    restoreActiveMainPanel(game);
    bindDynamicUI(player, game);
  }
}

function renderOpenedMainPanel(game, tabId) {
  const player = game.player;
  switch (tabId) {
    case 'character': renderCharacter(player, game); break;
    case 'skills': renderSkills(player, game); break;
    case 'inventory': renderInventory(player, game); break;
    case 'quests': renderQuests(player, game); break;
    case 'log': renderLog(game.logLines || []); break;
    // The map is rendered by setMainPanelDomState once it is visible.
  }
  decorateInGameMenuPanels(game);
  bindDynamicUI(player, game);
}

function syncUiOwnerDom(player, game) {
  const slot = Math.max(1, Math.min(4, Number(player?.slot || player?.playerNumber || 1)));
  const panel = document.querySelector('.panel');

  document.body.dataset.uiOwnerSlot = String(slot);
  if (panel) panel.dataset.ownerSlot = String(slot);
  syncMenuChooserActions(player, game, slot);
  updateMenuOwnerBadge(player, game, slot);
}

function syncMenuChooserActions(player, game, slot) {
  const tabs = document.querySelector('.panel .tabs');
  if (!tabs) return;
  let multiplayer=tabs.querySelector('[data-menu-action="multiplayer"]');
  if(slot===1&&game.onlineSession){
    if(!multiplayer){multiplayer=document.createElement('button');multiplayer.className='tab menu-action-tab';multiplayer.dataset.menuAction='multiplayer';multiplayer.dataset.menuIcon='MP';multiplayer.textContent='Multiplayer';tabs.append(multiplayer);}
    multiplayer.onclick=()=>{closeMainPanel(game);game.onlineSession.openMenu();};
  }else multiplayer?.remove();

  const existing = tabs.querySelector('[data-menu-action="dropout"]');
  const hostGame = game?.hostGame || game;
  const canDropOut = slot > 1 && typeof hostGame?.leaveCoopSessionForActor === 'function';

  if (!canDropOut) {
    existing?.remove();
    return;
  }

  const button = existing || document.createElement('button');
  button.type = 'button';
  button.className = 'tab menu-action-tab';
  button.dataset.menuAction = 'dropout';
  button.dataset.menuIcon = 'DO';
  button.textContent = `Drop Out P${slot}`;
  button.onclick = () => {
    closeMainPanel(game);
    hostGame.leaveCoopSessionForActor?.(player);
  };

  if (!existing) tabs.appendChild(button);
}

function updateMenuOwnerBadge(player, game, slot) {
  const panel = document.querySelector('.panel');
  if (!panel) return;

  const hostPlayer = game?.hostGame?.player || game?.player || player;
  const activeCoopCount = (hostPlayer?.coop?.players || []).filter(ally => ally && ally.active !== false && !ally.networkRemote).length;
  const menuOpen = panel.classList.contains('open') || panel.classList.contains('menu-chooser');
  let badge = panel.querySelector(':scope > .menu-owner-badge');

  if (activeCoopCount <= 0 || !menuOpen) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'menu-owner-badge';
    panel.appendChild(badge);
  }

  const ownerName = String(player?.name || `Player ${slot}`).trim() || `Player ${slot}`;
  badge.textContent = `Player ${slot} Menu - ${ownerName}`;
}

function bindMenuInputOwnership(game) {
  activeMenuInputGame = game;
  if (menuInputOwnershipBound) return;

  menuInputOwnershipBound = true;

  addEventListener('pointermove', event => {
    const point = { x: event.clientX, y: event.clientY };

    if (!lastMenuPointer) {
      lastMenuPointer = point;
      return;
    }

    const distance = Math.hypot(point.x - lastMenuPointer.x, point.y - lastMenuPointer.y);
    lastMenuPointer = point;

    if (distance >= 14 && document.querySelector('.panel.open')) {
      setMenuInputMode(activeMenuInputGame, 'mouse');
    }
  }, { passive: true });

  addEventListener('keydown', event => {
    if (!document.querySelector('.panel.open')) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Tab'].includes(event.key)) return;
    setMenuInputMode(activeMenuInputGame, 'keyboard');
  });
}

function setMenuInputMode(game, mode) {
  if (!game || !['controller', 'mouse', 'keyboard'].includes(mode)) return;
  game.uiState = game.uiState || createDefaultUIState();
  game.uiState.lastInputMode = mode;
  document.body.dataset.menuInputMode = mode;
}

function canMouseDriveMenuSelection(game) {
  return (game?.uiState?.lastInputMode || 'mouse') !== 'controller';
}

function hasMeaningfulControllerMenuInput(input) {
  return !!(
    input?.backPressed ||
    input?.cancelPressed ||
    input?.confirmPressed ||
    input?.upPressed ||
    input?.downPressed ||
    input?.leftPressed ||
    input?.rightPressed ||
    input?.lbPressed ||
    input?.rbPressed ||
    input?.xPressed ||
    input?.xHeld ||
    input?.yPressed ||
    input?.yHeld ||
    input?.ability1Held ||
    input?.ability2Released
  );
}

export function handleGameUiControllerInput(game, input) {
  if (!game || !input?.connected) return false;
  if(input.mobile)return false;
  if(document.body.classList.contains('mobile-input')&&!hasMeaningfulControllerMenuInput(input)&&!input.ltPressed&&!input.rtPressed&&!input.mapCursorX&&!input.mapCursorY&&!input.mapZoomInHeld&&!input.mapZoomOutHeld)return false;
  if (game.dialogue?.active && (game.dialogue.actor || game.player) === game.player) return false;
  if (game.paused) return false;

  const characterCreatorOverlay = document.getElementById('characterCreatorOverlay');
  if (characterCreatorOverlay?.classList.contains('active')) return false;

  const panelRoot = document.querySelector('.panel');
  const app = document.getElementById('app');
  const mainMenu = document.getElementById('mainMenu');

  const gameActive =
    app?.classList.contains('active') &&
    !mainMenu?.classList.contains('active');

  if (!gameActive || !panelRoot) return false;

  game.uiState = game.uiState || createDefaultUIState();
  game.uiControllerState = game.uiControllerState || {
    focusIndex: 0,
    lastPanelId: null
  };

  if (hasMeaningfulControllerMenuInput(input)||(isWorldMapPanelActive(game)&&(input.mapCursorX||input.mapCursorY||input.mapZoomInHeld||input.mapZoomOutHeld))) {
    setMenuInputMode(game, 'controller');
  }

  const panelOpen = panelRoot.classList.contains('open');
  const chooserOpen = panelRoot.classList.contains('menu-chooser');

  // Select / Back opens the text-only menu chooser. D-pad remains available
  // for gameplay until the player deliberately opens it.
  if (!panelOpen) {
    if (input.backPressed) {
      openGameMenuChooser(game);
      return true;
    }

    return false;
  }

  // When a menu panel IS open:
  // D-pad moves focus through visible options.
  // A selects the focused option.
  // Select / Back returns to the section chooser. B closes the panel.
  if (isAbilityControllerActive(game) && handleAbilityControllerInput(game, input)) {
    return true;
  }

  if (isCoterieControllerActive(game) && handleCoterieControllerInput(game, input)) {
    return true;
  }

  if (input.cancelPressed && isSkillTreeControllerActive(game) && game.uiState.pendingSkillRespec) {
    return handleSubclassTreeControls(game,input,renderUI);
  }
  if (input.cancelPressed) {
    closeMainPanel(game);
    renderUI(game.player, game.logLines || [], game);
    return true;
  }

  if (input.backPressed) {
    if (chooserOpen) {
      closeMainPanel(game);
      renderUI(game.player, game.logLines || [], game);
    } else {
      openGameMenuChooser(game);
    }
    return true;
  }

  if (input.lbPressed || input.rbPressed) {
    cycleOpenContextSubtab(game, input.rbPressed ? 1 : -1);
    return true;
  }
  if (isWorldMapPanelActive(game)) return handleWorldMapControllerInput(game,input);
  if(handleMenuSheetInput(input,panelRoot)){game.uiControllerState.focusIndex=0;return true;}

  if (isSkillTreeControllerActive(game)) {
    return handleSkillTreeControllerInput(game, input);
  }

  if (isAbilityControllerActive(game)) {
    return handleAbilityControllerInput(game, input);
  }

  if (isWorldMapPanelActive(game) && handleWorldMapControllerInput(game, input)) {
    return true;
  }

  const focusables = getGameUiFocusableElements(game);

  if (!focusables.length) return false;

  const activePanelId = game.uiState.activeMainTab || null;

  if (game.uiControllerState.lastPanelId !== activePanelId) {
    game.uiControllerState.focusIndex = 0;
    game.uiControllerState.lastPanelId = activePanelId;
  } else {
    // Selecting a row replaces its detail controls; preserve the focused node
    // rather than interpreting its old index in the new list of controls.
    const activeIndex=focusables.indexOf(document.activeElement);
    if(activeIndex>=0)game.uiControllerState.focusIndex=activeIndex;
  }

  clampGameUiFocus(game, focusables);

  const focusedElement = focusables[game.uiControllerState.focusIndex];

  if (handleInventoryControllerShortcut(game, input, focusedElement)) {
    return true;
  }

  const direction=menuDirection(input);
  if(direction){moveGameUiFocus(game,focusables,direction);return true;}

  if (input.confirmPressed) {
    activateGameUiFocusedElement(game, focusables);
    return true;
  }

  applyGameUiFocus(game, focusables);
  return false;
}

function handleInventoryControllerShortcut(game, input, focusedElement) {
  const inventoryOpen =
    game.uiState?.activeMainTab === 'inventory' &&
    document.getElementById('inventory')?.classList.contains('active');

  if (!inventoryOpen) {
    resetInventorySalvageHold(game);
    return false;
  }

  if (handleEquipmentFocusToggle(game, input)) return true;


  const isInventoryRow = focusedElement?.matches?.(
    '[data-inventory-item-index], [data-inventory-recipe-id]'
  );
  const isInventoryItemRow = focusedElement?.matches?.('[data-inventory-item-index]');
  const isEquipmentSlot = focusedElement?.matches?.('[data-equipment-slot][data-equipment-focus-region="slots"]');
  const isCoterieSlot = focusedElement?.matches?.('[data-coterie-slot][data-coterie-focus-region="skeletons"]');
  const isCoterieInventoryRow = focusedElement?.matches?.('[data-coterie-inventory-row]');

  if (isCoterieSlot || isCoterieInventoryRow) {
    if (input.confirmPressed) {
      resetInventorySalvageHold(game);

      if (isCoterieSlot) {
        performCoterieSlotPrimaryAction(
          game.player,
          focusedElement.dataset.coterieSkeletonIndex,
          focusedElement.dataset.coterieSlot,
          game,
          () => renderUI(game.player, game.logLines || [], game)
        );
      } else {
        performCoterieInventoryPrimaryAction(
          game.player,
          focusedElement,
          game,
          () => renderUI(game.player, game.logLines || [], game)
        );
      }

      return true;
    }

    if (input.xHeld || input.ability2Released) {
      resetInventorySalvageHold(game);
      if (input.ability2Released) {
        game.log?.('Manage and salvage gear in Equipment; visit Mara’s forge for upgrades.');
      }
      return true;
    }
  }

  if ((input.xHeld || input.ability2Released) && !isInventoryRow && !isEquipmentSlot) {
    resetInventorySalvageHold(game);
    return true;
  }

  if (!isInventoryRow && !isEquipmentSlot) {
    resetInventorySalvageHold(game);
    return false;
  }

  if (input.confirmPressed) {
    resetInventorySalvageHold(game);

    if (isEquipmentSlot) {
      performEquipmentSlotPrimaryAction(
        game.player,
        focusedElement.dataset.equipmentSlot,
        game,
        () => renderUI(game.player, game.logLines || [], game)
      );
    } else {
      performInventoryPrimaryAction(
        game.player,
        focusedElement,
        game,
        () => renderUI(game.player, game.logLines || [], game)
      );
    }

    return true;
  }

  if (input.xHeld) {
    if (!isInventoryItemRow && !isEquipmentSlot) {
      resetInventorySalvageHold(game);
      return true;
    }

    const state = game.uiControllerState;
    const rowKey = getInventorySalvageTargetKey(focusedElement, game);
    const visualElement = getInventorySalvageVisualElement(focusedElement, game);

    if (!rowKey || !visualElement) {
      resetInventorySalvageHold(game);
      return true;
    }

    const now = performance.now();

    if (state.inventorySalvageRowKey !== rowKey) {
      resetInventorySalvageVisuals();
      clearPendingInventorySalvageIfTargetChanged(game, focusedElement);
      state.inventorySalvageRowKey = rowKey;
      state.inventorySalvageStartedAt = now;
      state.inventorySalvageTriggered = false;
      state.inventorySalvageResult = null;
    }

    const elapsed = now - Number(state.inventorySalvageStartedAt || now);
    const progress = Math.min(1, elapsed / INVENTORY_SALVAGE_HOLD_MS);
    const currentMode = state.inventorySalvageTriggered
      ? state.inventorySalvageResult
      : getPendingInventorySalvageKey(game, focusedElement) ? 'confirm' : 'hold';

    setInventorySalvageVisualState(visualElement, progress, currentMode);

    if (progress >= 1 && !state.inventorySalvageTriggered) {
      state.inventorySalvageTriggered = true;

      if (isEquipmentSlot) {
        state.inventorySalvageResult = 'blocked';
        game.log?.('Equipped gear is protected. Unequip it before salvaging.');
        setInventorySalvageVisualState(visualElement, 1, state.inventorySalvageResult);
      } else {
        const salvaged = performInventorySalvageAction(
          game.player,
          focusedElement,
          game,
          () => renderUI(game.player, game.logLines || [], game)
        );
        state.inventorySalvageResult = salvaged
          ? 'complete'
          : getPendingInventorySalvageKey(game, focusedElement) ? 'confirm' : 'blocked';
        setInventorySalvageVisualState(visualElement, 1, state.inventorySalvageResult);
      }
    }

    return true;
  }

  if (input.ability2Released && game.uiControllerState.inventorySalvageRowKey) {
    const state = game.uiControllerState;
    const elapsed = performance.now() - Number(state.inventorySalvageStartedAt || performance.now());
    const wasTriggered = !!state.inventorySalvageTriggered;
    resetInventorySalvageHold(game);

    if (!wasTriggered && elapsed < INVENTORY_SALVAGE_HOLD_MS) {
      if (isEquipmentSlot) {
        performEquipmentSlotUpgradeAction(
          game.player,
          focusedElement.dataset.equipmentSlot,
          game,
          () => renderUI(game.player, game.logLines || [], game)
        );
      } else if (isInventoryItemRow) {
        performInventoryUpgradeAction(
          game.player,
          focusedElement,
          game,
          () => renderUI(game.player, game.logLines || [], game)
        );
      }
    }

    return true;
  }

  resetInventorySalvageHold(game);
  return false;
}

function handleEquipmentFocusToggle(game, input) {
  if (!isEquipmentTabOpen(game)) {
    resetEquipmentFocusHold(game);
    return false;
  }

  const held = !!(input.yHeld || input.ability1Held);
  if (!held) {
    resetEquipmentFocusHold(game);
    return false;
  }

  const state = game.uiControllerState;
  const now = performance.now();

  if (!state.equipmentFocusHoldStartedAt) {
    state.equipmentFocusHoldStartedAt = now;
    state.equipmentFocusHoldTriggered = false;
  }

  if (!state.equipmentFocusHoldTriggered && now - state.equipmentFocusHoldStartedAt >= 500) {
    state.equipmentFocusHoldTriggered = true;
    const nextRegion = game.uiState.equipmentFocusRegion === 'slots' ? 'inventory' : 'slots';
    setEquipmentFocusRegion(game, nextRegion);
  }

  return true;
}

function isEquipmentTabOpen(game) {
  return !!(
    game?.uiState?.activeMainTab === 'inventory' &&
    game.uiState?.inventorySubtab === 'equipment' &&
    document.querySelector('[data-equipment-workstation]')
  );
}

function resetEquipmentFocusHold(game) {
  if (!game?.uiControllerState) return;
  game.uiControllerState.equipmentFocusHoldStartedAt = 0;
  game.uiControllerState.equipmentFocusHoldTriggered = false;
}

function setEquipmentFocusRegion(game, region) {
  game.uiState.equipmentFocusRegion = region;
  const target = getEquipmentRegionFocusableElements(region)[0];
  if (target) focusGameUiElement(game, target);
  const root = document.querySelector('[data-equipment-workstation]');
  if (root) root.dataset.equipmentFocusRegion = region;
  refreshMenuContextBar(game, target || null);
}

function getEquipmentRegionFocusableElements(region) {
  return Array.from(document.querySelectorAll(`[data-equipment-focus-region="${region}"]`))
    .filter(element => {
      if (!element || element.disabled || !element.matches('button,[role=button],input,select,textarea,[tabindex]') || !menuSheetItemVisible(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
}

function isCoterieControllerActive(game) {
  return !!(
    game?.uiState?.activeMainTab === 'inventory' &&
    game.uiState?.inventorySubtab === 'coterie' &&
    document.querySelector('[data-coterie-workstation]')
  );
}

function handleCoterieControllerInput(game, input) {
  if (!isCoterieControllerActive(game)) return false;

  const placing = game.uiState?.coteriePlacementBagIndex !== null &&
    game.uiState?.coteriePlacementBagIndex !== undefined;

  if (input.cancelPressed && placing) {
    game.uiState.coteriePlacementBagIndex = null;
    game.uiState.coterieFocusRegion = 'inventory';
    game.log?.('Coterie placement cancelled.');
    renderUI(game.player, game.logLines || [], game);
    return true;
  }

  if (input.xHeld || input.ability2Released) {
    resetInventorySalvageHold(game);
    return true;
  }

  const direction=menuDirection(input);

  if (direction) {
    const region = placing ? 'skeletons' : 'inventory';
    moveCoterieRegionFocus(game, region, direction);
    return true;
  }

  if (input.confirmPressed) {
    resetInventorySalvageHold(game);
    const region = placing ? 'skeletons' : 'inventory';
    const target = getCurrentCoterieRegionElement(game, region);

    if (target?.matches?.('[data-coterie-slot][data-coterie-focus-region="skeletons"]')) {
      const placed = performCoterieSlotPrimaryAction(
        game.player,
        target.dataset.coterieSkeletonIndex,
        target.dataset.coterieSlot,
        game,
        () => renderUI(game.player, game.logLines || [], game)
      );
      focusCurrentCoterieRegion(game, placed ? 'inventory' : 'skeletons');
      return true;
    }

    if (target?.matches?.('[data-coterie-inventory-row]')) {
      performCoterieInventoryPrimaryAction(
        game.player,
        target,
        game,
        () => renderUI(game.player, game.logLines || [], game)
      );
      focusCurrentCoterieRegion(game, 'skeletons');
      return true;
    }

    return true;
  }

  return false;
}

function moveCoterieRegionFocus(game, region, direction) {
  const candidates = getCoterieRegionFocusableElements(region);
  if (!candidates.length) return false;

  const current = getCurrentCoterieRegionElement(game, region);
  const currentIndex = Math.max(0, candidates.indexOf(current));
  const next=directionalMenuItem(candidates,candidates[currentIndex],direction);

  if (!next) return false;

  if (region === 'inventory') {
    game.uiState.coterieFocusRegion = 'inventory';
    game.uiState.coteriePlacementBagIndex = null;
  } else {
    game.uiState.coterieFocusRegion = 'skeletons';
  }

  focusGameUiElement(game, next);
  return true;
}

function focusCurrentCoterieRegion(game, region) {
  const target = getCurrentCoterieRegionElement(game, region);
  if (target) focusGameUiElement(game, target);
}

function getCurrentCoterieRegionElement(game, region) {
  const candidates = getCoterieRegionFocusableElements(region);
  if (!candidates.length) return null;

  const focused = candidates.find(element => (
    element.classList.contains('game-ui-controller-focus') ||
    document.activeElement === element
  ));

  if (focused) return focused;

  if (region === 'inventory') {
    const selectedIndex = Number(game.uiState?.selectedInventoryBagIndexBySubtab?.coterie);
    return candidates.find(element => Number(element.dataset.inventoryItemIndex) === selectedIndex) || candidates[0];
  }

  const selectedSkeletonIndex = Number(game.uiState?.selectedCoterieSkeletonIndex || 0);
  const selectedSlot = game.uiState?.selectedCoterieSlot || 'weapon';

  return candidates.find(element => (
    Number(element.dataset.coterieSkeletonIndex || 0) === selectedSkeletonIndex &&
    element.dataset.coterieSlot === selectedSlot
  )) || candidates[0];
}

function getCoterieRegionFocusableElements(region) {
  const selector = region === 'skeletons'
    ? '[data-coterie-slot][data-coterie-focus-region="skeletons"]'
    : '[data-coterie-inventory-row]';

  return Array.from(document.querySelectorAll(selector))
    .filter(element => {
      if (!element || element.disabled) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
}

function focusGameUiElement(game, target) {
  const focusables = getGameUiFocusableElements(game);
  const index = focusables.indexOf(target);
  if (index >= 0) {
    game.uiControllerState.focusIndex = index;
    applyGameUiFocus(game, focusables);
  }
}

function isAbilityControllerActive(game) {
  return game?.uiState?.activeMainTab === 'skills' && game.uiState?.skillsSubtab === 'abilities';
}

function getAbilityControllerView(player, game) {
  const known = getAbilityLibrary(player);
  const categories = ['all',...new Set(known.map(getAbilityCategory)), ...new Set(known.filter(a=>a.role).map(a=>a.role))];
  const requestedCategory = game.uiState.abilityCategory || 'all';
  const category = categories.includes(requestedCategory) ? requestedCategory : 'all';
  const visible = category === 'all'
    ? known
    : known.filter(ability => abilityLibraryMatches(player,ability,category));
  const selected = visible.find(ability => ability.id === game.uiState.selectedAbilityId) || visible[0] || null;

  game.uiState.abilityCategory = category;
  game.uiState.selectedAbilityId = selected?.id || null;
  return { known, categories, category, visible, selected };
}

function syncAbilityControllerState(game) {
  const view = getAbilityControllerView(game.player, game);
  const state = game.uiAbilityControllerState || {
    region: 'ability',
    categoryIndex: 0,
    abilityIndex: 0,
    hotbarIndex: 0,
    morphIndex: 0,
    morphAbilityId: null
  };

  state.categoryIndex = Math.max(0, view.categories.indexOf(view.category));
  state.abilityIndex = Math.max(0, view.visible.findIndex(ability => ability.id === view.selected?.id));
  state.hotbarIndex = Math.max(0, Math.min(HOTBAR_SLOT_COUNT-1, Number(state.hotbarIndex || 0)));

  if (!['category', 'ability', 'hotbar','morph'].includes(state.region)) state.region = 'ability';
  if (!view.visible.length && state.region === 'ability') state.region = 'category';
  if (game.uiState.abilityAssignmentMode) state.region = 'hotbar';
  else if (state.region === 'hotbar') state.region = view.visible.length ? 'ability' : 'category';
  if (state.region === 'morph') {
    const buttons = getAbilityMorphControllerButtons();
    if (state.morphAbilityId !== view.selected?.id || !buttons.length) {
      state.region = view.visible.length ? 'ability' : 'category';
      state.morphAbilityId = null;
    }
    state.morphIndex = Math.max(0, Math.min(buttons.length - 1, state.morphIndex || 0));
  }

  game.uiAbilityControllerState = state;
  return { state, view };
}

function getAbilityMorphControllerButtons() {
  return [...document.querySelectorAll('[data-ability-detail-pane] [data-ability-morph]:not(:disabled)')];
}

function resetAbilityControllerSelection(game) {
  if (!game?.uiState) return;
  game.uiState.abilityAssignmentMode = false;
  game.uiState.pendingAbilityId = null;
  if (game.uiAbilityControllerState) {
    game.uiAbilityControllerState.region = 'ability';
    game.uiAbilityControllerState.morphAbilityId = null;
  }
}

function handleAbilityControllerInput(game, input) {
  if (!isAbilityControllerActive(game)) return false;

  const { state, view } = syncAbilityControllerState(game);

  if (input.cancelPressed && game.uiState.abilityAssignmentMode) {
    cancelAbilityAssignment(game);
    return true;
  }

  if (input.cancelPressed && state.region === 'morph') {
    state.region = 'ability';
    state.morphAbilityId = null;
    applyAbilityControllerFocus(game);
    return true;
  }

  if (input.xPressed && state.region === 'ability' && view.selected) {
    const buttons = getAbilityMorphControllerButtons();
    if (buttons.length) {
      state.region = 'morph';
      state.morphAbilityId = view.selected.id;
      state.morphIndex = Math.max(0, buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true'));
    } else {
      game?.log?.('This ability has no optional morphs.');
    }
    applyAbilityControllerFocus(game);
    return true;
  }

  if (input.xPressed && state.region === 'hotbar') {
    clearAbilityHotbarSlot(game, state.hotbarIndex);
    return true;
  }

  const direction = input.leftPressed ? 'left'
    : input.rightPressed ? 'right'
      : input.upPressed ? 'up'
        : input.downPressed ? 'down'
          : null;

  if (direction) {
    if (game.uiState.abilityAssignmentMode) {
      if (direction === 'left' || direction === 'right') {
        const step = direction === 'right' ? 1 : -1;
        state.hotbarIndex = (state.hotbarIndex + step + HOTBAR_SLOT_COUNT) % HOTBAR_SLOT_COUNT;
      }
    } else if (state.region === 'category') {
      if (direction === 'right' && view.visible.length) {
        state.region = 'ability';
      } else if (direction === 'up' || direction === 'down') {
        const step = direction === 'down' ? 1 : -1;
        state.categoryIndex = (state.categoryIndex + step + view.categories.length) % view.categories.length;
        game.uiState.abilityCategory = view.categories[state.categoryIndex];
        game.uiState.selectedAbilityId = null;
        renderUI(game.player, game.logLines || [], game);
        syncAbilityControllerState(game);
      }
    } else if (state.region === 'ability') {
      const list=document.querySelector('.ability-pool-list');
      const columns=list?getComputedStyle(list).gridTemplateColumns.split(' ').length:1;
      const column=state.abilityIndex%columns,row=Math.floor(state.abilityIndex/columns);
      let next=state.abilityIndex;
      if (direction === 'left' && column===0) {
        state.region = 'category';
      } else if (view.visible.length) {
        if(direction==='left')next--;
        if(direction==='right'&&column<columns-1&&next+1<view.visible.length)next++;
        if(direction==='down')next=row<Math.floor((view.visible.length-1)/columns)?Math.min(next+columns,view.visible.length-1):column;
        if(direction==='up')next=row>0?next-columns:Math.floor((view.visible.length-1-column)/columns)*columns+column;
        state.abilityIndex = Math.max(0,Math.min(view.visible.length-1,next));
        game.uiState.selectedAbilityId = view.visible[state.abilityIndex].id;
        updateAbilityManagementPreview(game.player, game);
      }
    } else if (state.region === 'morph') {
      const buttons = getAbilityMorphControllerButtons();
      if (direction === 'up' || direction === 'down') {
        state.morphIndex = Math.max(0, Math.min(buttons.length - 1, (state.morphIndex || 0) + (direction === 'down' ? 1 : -1)));
      }
    }

    applyAbilityControllerFocus(game);
    return true;
  }

  if (input.confirmPressed) {
    if(state.region==='morph'){
      const buttons=getAbilityMorphControllerButtons();buttons[state.morphIndex||0]?.click();applyAbilityControllerFocus(game);return true;
    }
    if (state.region === 'category') {
      state.region = view.visible.length ? 'ability' : 'category';
      applyAbilityControllerFocus(game);
      return true;
    }

    if (state.region === 'ability' && view.selected) {
      beginAbilityAssignment(game, view.selected.id);
      return true;
    }

    if (state.region === 'hotbar') {
      if (game.uiState.abilityAssignmentMode) {
        completeAbilityAssignment(game, state.hotbarIndex);
      } else {
        game?.log?.('Select an ability and press A before choosing a hotbar slot.');
      }
      return true;
    }
  }

  applyAbilityControllerFocus(game);
  return false;
}

function beginAbilityAssignment(game, abilityId) {
  const ability = getAbilityById(abilityId);
  if (!ability) return;

  const availability = getAbilityAvailability(game.player, ability);
  if (!availability.usable) {
    game?.log?.(`${ability.name}: ${availability.reason}`);
    return;
  }

  game.uiState.selectedAbilityId = abilityId;
  game.uiState.pendingAbilityId = abilityId;
  game.uiState.abilityAssignmentMode = true;

  const state = game.uiAbilityControllerState || syncAbilityControllerState(game).state;
  const assignedSlot = game.player.loadout?.abilitySlots?.indexOf(abilityId) ?? -1;
  const emptySlot = game.player.loadout?.abilitySlots?.findIndex(id => !id) ?? -1;
  state.region = 'hotbar';
  state.hotbarIndex = assignedSlot >= 0 ? assignedSlot : emptySlot >= 0 ? emptySlot : state.hotbarIndex || 0;

  renderUI(game.player, game.logLines || [], game);
  syncAbilityControllerState(game);
  applyAbilityControllerFocus(game);
}

function cancelAbilityAssignment(game) {
  const ability = getAbilityById(game.uiState.pendingAbilityId);
  game.uiState.abilityAssignmentMode = false;
  game.uiState.pendingAbilityId = null;

  const state = game.uiAbilityControllerState || syncAbilityControllerState(game).state;
  state.region = 'ability';
  game?.log?.(`${ability?.name || 'Ability'} assignment cancelled.`);

  renderUI(game.player, game.logLines || [], game);
  syncAbilityControllerState(game);
  applyAbilityControllerFocus(game);
}

function completeAbilityAssignment(game, slot) {
  const abilityId = game.uiState.pendingAbilityId || game.uiState.selectedAbilityId;
  const result = assignAbilityToSlot(game.player, slot, abilityId);
  if(document.body.classList.contains('mobile-input')){
    game.uiState.mobileAbilityFeedback=result.ok?`${result.ability.name} equipped in tile ${slot+1}.`:result.reason;
    if(result.ok){game.uiState.selectedAbilityId=abilityId;game.uiState.mobileAbilityDetailOpen=false;}
  }
  game?.log?.(result.ok
    ? `Assigned ${result.ability.name} to ${abilitySlotLabel(slot)}.`
    : result.reason);

  if (result.ok) {
    game.uiState.abilityAssignmentMode = false;
    game.uiState.pendingAbilityId = null;
    const state = game.uiAbilityControllerState || syncAbilityControllerState(game).state;
    state.region = 'ability';
  }

  renderUI(game.player, game.logLines || [], game);
  syncAbilityControllerState(game);
  if(!document.body.classList.contains('mobile-input')||game.primaryControllerActive)applyAbilityControllerFocus(game);
  if(result.ok&&document.body.classList.contains('mobile-input'))game.save?.(false);
}

function clearAbilityHotbarSlot(game, slot) {
  const oldAbility = getAbilityById(game.player.loadout?.abilitySlots?.[slot]);
  if (!oldAbility) {
    game?.log?.(`${abilitySlotLabel(slot)} is already empty.`);
    applyAbilityControllerFocus(game);
    return;
  }

  clearAbilitySlot(game.player, slot);
  game?.log?.(`${oldAbility.name} removed from ${abilitySlotLabel(slot)}. It remains learned.`);
  renderUI(game.player, game.logLines || [], game);
  syncAbilityControllerState(game);
  applyAbilityControllerFocus(game);
}

function applyAbilityControllerFocus(game) {
  document.querySelectorAll('.game-ui-controller-focus').forEach(element => {
    element.classList.remove('game-ui-controller-focus');
  });

  const { state, view } = syncAbilityControllerState(game);
  let target = null;

  if (state.region === 'category') {
    target = document.querySelector(`[data-ability-category="${cssEscape(view.category)}"]`);
  } else if (state.region === 'ability') {
    target = document.querySelector(`[data-select-ability-id="${cssEscape(view.selected?.id || '')}"]`);
  } else if(state.region==='morph') {
    target=getAbilityMorphControllerButtons()[state.morphIndex||0];
  } else {
    target = document.querySelector(`[data-ability-hotbar-slot="${state.hotbarIndex}"]`);
  }

  if (!target) return;
  target.classList.add('game-ui-controller-focus');
  target.focus?.({ preventScroll: true });
  revealMenuFocus(target);
  refreshMenuContextBar(game, target);
}

function resetInventorySalvageHold(game) {
  if (game?.uiControllerState) {
    game.uiControllerState.inventorySalvageRowKey = null;
    game.uiControllerState.inventorySalvageStartedAt = 0;
    game.uiControllerState.inventorySalvageTriggered = false;
    game.uiControllerState.inventorySalvageResult = null;
  }

  resetInventorySalvageVisuals();
}

function resetInventorySalvageVisuals(exceptElement = null) {
  document
    .querySelectorAll('.inventory-salvage-holding, .inventory-salvage-confirming, .inventory-salvage-blocked, .inventory-salvage-complete')
    .forEach(row => {
      if (row === exceptElement) return;
      row.classList.remove(
        'inventory-salvage-holding',
        'inventory-salvage-confirming',
        'inventory-salvage-blocked',
        'inventory-salvage-complete'
      );
      row.style.removeProperty('--salvage-progress');
    });
}

function setInventorySalvageVisualState(element, progress, mode = 'hold') {
  if (!element) return;

  resetInventorySalvageVisuals(element);

  element.classList.add('inventory-salvage-holding');
  element.classList.toggle('inventory-salvage-confirming', mode === 'confirm');
  element.classList.toggle('inventory-salvage-blocked', mode === 'blocked');
  element.classList.toggle('inventory-salvage-complete', mode === 'complete');
  element.style.setProperty('--salvage-progress', `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`);
}

function getInventorySalvageTargetKey(element, game) {
  if (!element?.dataset) return null;

  if (element.dataset.equipmentSlot && element.dataset.equipmentFocusRegion === 'slots') {
    return `equipment:${element.dataset.equipmentSlot}`;
  }

  if (element.dataset.inventoryItemIndex !== undefined) {
    const subtab = element.dataset.inventorySubtab || game?.uiState?.inventorySubtab || 'inventory';
    return `inventory:${subtab}:${element.dataset.inventoryItemIndex}`;
  }

  return null;
}

function getInventorySalvageVisualElement(element, game) {
  if (!element) return null;
  if (element.classList?.contains('inventory-list-row') || element.classList?.contains('equipment-slot-button')) {
    return element;
  }

  const bagIndex = element.dataset?.inventoryItemIndex;
  if (bagIndex !== undefined) {
    const subtab = element.dataset.inventorySubtab || game?.uiState?.inventorySubtab || '';
    const selector = [
      '.inventory-list-row',
      `[data-inventory-item-index="${cssEscape(bagIndex)}"]`,
      subtab ? `[data-inventory-subtab="${cssEscape(subtab)}"]` : ''
    ].join('');

    return document.querySelector(selector) || element;
  }

  return element;
}

function getInventorySalvageConfirmationKey(game, element) {
  const bagIndex = Number(element?.dataset?.inventoryItemIndex);
  if (!Number.isFinite(bagIndex)) return null;

  const entry = game?.player?.inventory?.[bagIndex];
  if (!entry) return null;

  return `${bagIndex}:${entry.id}:${entry.qty || 1}`;
}

function getPendingInventorySalvageKey(game, element) {
  const confirmationKey = getInventorySalvageConfirmationKey(game, element);
  return confirmationKey && game?.uiState?.pendingInventorySalvageKey === confirmationKey
    ? confirmationKey
    : null;
}

function clearPendingInventorySalvageIfTargetChanged(game, element) {
  if (!game?.uiState?.pendingInventorySalvageKey) return;

  const confirmationKey = getInventorySalvageConfirmationKey(game, element);
  if (!confirmationKey || confirmationKey !== game.uiState.pendingInventorySalvageKey) {
    game.uiState.pendingInventorySalvageKey = null;
  }
}

export function toggleGameMenuChooser(game) {
  if (!game) return false;

  const panelRoot = document.querySelector('.panel');
  if (!panelRoot) return false;

  if (panelRoot.classList.contains('menu-chooser')) {
    closeMainPanel(game);
    renderUI(game.player, game.logLines || [], game);
    return true;
  }

  openGameMenuChooser(game);
  return true;
}

export function closeGameMenu(game) {
  if (!game || !document.querySelector('.panel.open')) return false;

  closeMainPanel(game);
  renderUI(game.player, game.logLines || [], game);
  return true;
}

function openGameMenuChooser(game) {
  const panelRoot = document.querySelector('.panel');
  if (!panelRoot) return false;

  game.uiState = game.uiState || createDefaultUIState();
  game.uiControllerState = game.uiControllerState || {
    focusIndex: 0,
    lastPanelId: null
  };

  game.uiState.activeMainTab = null;
  game.uiState.menuChooserOpen = true;
  setMainPanelDomState(game, null);
  game.uiControllerState.focusIndex = 0;
  game.uiControllerState.lastPanelId = 'menu-chooser';
  panelRoot.classList.add('open', 'menu-chooser');
  delete panelRoot.dataset.panelClosed;
  const slot = Math.max(1, Math.min(4, Number(game.player?.slot || game.player?.playerNumber || 1)));
  syncMenuChooserActions(game.player, game, slot);
  updateMenuOwnerBadge(game.player, game, slot);

  applyGameUiFocus(game, getGameUiFocusableElements(game));
  return true;
}

function closeMainPanel(game) {
  game.uiState = game.uiState || createDefaultUIState();
  game.uiState.activeMainTab = null;
  game.uiState.menuChooserOpen = false;

  game.uiControllerState = game.uiControllerState || {
    focusIndex: 0,
    lastPanelId: null
  };

  resetInventorySalvageHold(game);
  game.uiControllerState.focusIndex = 0;
  game.uiControllerState.lastPanelId = null;
  document.querySelector('.panel')?.classList.remove('menu-chooser');
  setMainPanelDomState(game, null);
}

function handleSkillTreeControllerInput(game, input) {
  if(handleSubclassTreeControls(game,input,renderUI))return true;
  game.uiSkillTreeControllerState = syncSkillTreeControllerState(game);

  const direction = input.leftPressed ? 'left'
    : input.rightPressed ? 'right'
      : input.upPressed ? 'up'
        : input.downPressed ? 'down'
          : null;

  if (direction) {
    const previousTree = resolveSelectedSkillTree(game.player, game);
    moveSkillTreeControllerDirection(game, direction);
    const nextTree = resolveSelectedSkillTree(game.player, game);

    if (previousTree !== nextTree) {
      renderUI(game.player, game.logLines || [], game);
      game.uiSkillTreeControllerState = syncSkillTreeControllerState(game);
    } else {
      updateSkillTreePreview(game.player, game);
    }

    applySkillTreeControllerFocus(game);
    return true;
  }

  if (input.confirmPressed) {
    activateSkillTreeControllerSelection(game);
    return true;
  }

  applySkillTreeControllerFocus(game);
  return false;
}

function isSkillTreeControllerActive(game) {
  return game?.uiState?.activeMainTab === 'skills' &&
    game.uiState?.skillsSubtab === 'trees' &&
    !isClasslessPlayer(game.player);
}

function isProgressionSkillsPanelActive(game) {
  return game?.uiState?.activeMainTab === 'skills' &&
    ['trees', 'abilities'].includes(game.uiState?.skillsSubtab);
}

function syncSkillTreeControllerState(game) {
  const hadState = !!game.uiSkillTreeControllerState;
  const state = game.uiSkillTreeControllerState || {
    column: 'node',
    treeIndex: 0,
    nodeIndex: 0,
    selectedTreeId: null
  };

  const trees = getSkillTreeControllerTrees(game.player);
  const selectedTree = resolveSelectedSkillTree(game.player, game);
  const treeIndex = Math.max(0, trees.indexOf(selectedTree));
  const nodes = getSkillTreeLayout(selectedTree).nodes;
  const selectedNode = resolveSelectedSkillTreeNode(game.player, game, selectedTree);
  const nodeIndex = Math.max(0, nodes.findIndex(node => node.id === selectedNode?.id));

  state.treeIndex = treeIndex >= 0 ? treeIndex : 0;
  state.nodeIndex = nodeIndex >= 0 ? nodeIndex : 0;
  state.selectedTreeId = selectedTree;
  if (!['path', 'node','subclass'].includes(state.column)) state.column = 'node';

  if (!hadState) {
    const active = document.activeElement;

    if (active?.matches?.('[data-skill-tree-select]')) {
      state.column = 'path';
    } else if (active?.matches?.('[data-select-skill-tree-node]')) {
      state.column = 'node';
    }
  }

  game.uiSkillTreeControllerState = state;
  return state;
}

function getSkillTreeControllerTrees(player = null) {
  return getVisibleSkillTreeOrder(player);
}

function rememberSelectedSkillTreeNode(game, tree, nodeId) {
  if (!game?.uiState || !tree || !nodeId) return;
  game.uiState.selectedSkillTreeNodeByTree = game.uiState.selectedSkillTreeNodeByTree || {};
  game.uiState.selectedSkillTreeNodeByTree[tree] = nodeId;
}

function selectSkillTreeForUi(player, game, tree) {
  if (!getVisibleSkillTreeOrder(player).includes(tree)) return;

  const oldTree = game.uiState.selectedSkillTreeId;
  if (oldTree && game.uiState.selectedSkillTreeNodeId) {
    rememberSelectedSkillTreeNode(game, oldTree, game.uiState.selectedSkillTreeNodeId);
  }

  game.uiState.selectedSkillTreeId = tree;
  game.uiState.selectedSkillTreeNodeId = game.uiState.selectedSkillTreeNodeByTree?.[tree] || null;
  resolveSelectedSkillTreeNode(player, game, tree);
}

function moveSkillTreeControllerDirection(game, direction) {
  const state = game.uiSkillTreeControllerState || syncSkillTreeControllerState(game);

  if (state.column === 'path') {
    if (direction === 'down') {
      const tree = resolveSelectedSkillTree(game.player, game);
      const nodes = getSkillTreeLayout(tree).nodes;
      const selected = resolveSelectedSkillTreeNode(game.player, game, tree);
      state.column = 'node';
      state.nodeIndex = Math.max(0, nodes.findIndex(node => node.id === selected?.id));
      state.selectedTreeId = tree;

      if (selected?.id) {
        game.uiState.selectedSkillTreeNodeId = selected.id;
        rememberSelectedSkillTreeNode(game, tree, selected.id);
      }
      return;
    }

    if(direction==='up'){state.column='subclass';return;}
    if (direction !== 'left' && direction !== 'right') return;
    const trees = getSkillTreeControllerTrees(game.player);
    const step = direction === 'right' ? 1 : -1;
    state.treeIndex = (state.treeIndex + step + trees.length) % trees.length;
    selectSkillTreeForUi(game.player, game, trees[state.treeIndex]);
    state.selectedTreeId = game.uiState.selectedSkillTreeId;
    const nextNodes = getSkillTreeLayout(state.selectedTreeId).nodes;
    state.nodeIndex = Math.max(0, nextNodes.findIndex(node => node.id === game.uiState.selectedSkillTreeNodeId));
    return;
  }

  const tree = resolveSelectedSkillTree(game.player, game);
  const nodes = getSkillTreeLayout(tree).nodes;
  if (!nodes.length) return;

  const current = nodes[state.nodeIndex] || resolveSelectedSkillTreeNode(game.player, game, tree);
  const next = findDirectionalSkillTreeNode(nodes, current, direction);

  if (next) {
    state.nodeIndex = nodes.findIndex(node => node.id === next.id);
    game.uiState.selectedSkillTreeNodeId = next.id;
    rememberSelectedSkillTreeNode(game, tree, next.id);
    return;
  }

  const topRow = Math.min(...nodes.map(node => Number(node.position?.row || 0)));
  if (direction === 'up' && Number(current?.position?.row || 0) === topRow) {
    state.column = 'path';
  }
}

function findDirectionalSkillTreeNode(nodes, current, direction) {
  if (!current?.position) return nodes[0] || null;

  const candidates = nodes.filter(candidate => {
    if (candidate.id === current.id || !candidate.position) return false;
    const dx = Number(candidate.position.column || 0) - Number(current.position.column || 0);
    const dy = Number(candidate.position.row || 0) - Number(current.position.row || 0);
    if (direction === 'left') return dx < 0;
    if (direction === 'right') return dx > 0;
    if (direction === 'up') return dy < 0;
    if (direction === 'down') return dy > 0;
    return false;
  });

  if (!candidates.length) return null;

  if (direction === 'left' || direction === 'right') {
    const sameRow = candidates.filter(candidate => {
      return Number(candidate.position.row || 0) === Number(current.position.row || 0);
    });
    const pool = sameRow.length ? sameRow : candidates;

    return [...pool].sort((a, b) => {
      const aDx = Math.abs(Number(a.position.column || 0) - Number(current.position.column || 0));
      const bDx = Math.abs(Number(b.position.column || 0) - Number(current.position.column || 0));
      const aDy = Math.abs(Number(a.position.row || 0) - Number(current.position.row || 0));
      const bDy = Math.abs(Number(b.position.row || 0) - Number(current.position.row || 0));
      return aDy - bDy || aDx - bDx;
    })[0] || null;
  }

  const nearestRowDistance = Math.min(...candidates.map(candidate => {
    return Math.abs(Number(candidate.position.row || 0) - Number(current.position.row || 0));
  }));
  const nearestRow = candidates.filter(candidate => {
    return Math.abs(Number(candidate.position.row || 0) - Number(current.position.row || 0)) === nearestRowDistance;
  });

  return [...nearestRow].sort((a, b) => {
    const aColumnDistance = Math.abs(Number(a.position.column || 0) - Number(current.position.column || 0));
    const bColumnDistance = Math.abs(Number(b.position.column || 0) - Number(current.position.column || 0));
    return aColumnDistance - bColumnDistance;
  })[0] || null;
}

function activateSkillTreeControllerSelection(game) {
  const state = game.uiSkillTreeControllerState || syncSkillTreeControllerState(game);
  const tree = resolveSelectedSkillTree(game.player, game);
  const nodes = getSkillTreeLayout(tree).nodes;
  const selectedNode = nodes[state.nodeIndex] || resolveSelectedSkillTreeNode(game.player, game, tree);

  if (state.column === 'path') {
    state.column = 'node';
    selectSkillTreeForUi(game.player, game, tree);
    updateSkillTreePreview(game.player, game);
    applySkillTreeControllerFocus(game);
    return;
  }

  if (!selectedNode) return;

  game.uiState.selectedSkillTreeNodeId = selectedNode.id;
  rememberSelectedSkillTreeNode(game, tree, selectedNode.id);

  const result = spendSkillTreeNodeFromUi(game, game.player, selectedNode.id);
  if (!result.pending) {
    logSkillTreeSpendResult(game, result);
  }

  renderUI(game.player, game.logLines || [], game);
  game.uiSkillTreeControllerState = syncSkillTreeControllerState(game);
  applySkillTreeControllerFocus(game);
}

function spendSkillTreeNodeFromUi(game, player, nodeId) {
  const check = canSpendSkillTreeNode(player, nodeId);
  if (!check.ok) return check;

  if (!getPlayerSubclass(player) && (nodeId === 'spirit_bone_coterie' || nodeId === 'spirit_lich_ascension')) {
    game.uiState = game.uiState || {};
    if (game.uiState.pendingSkillTreeNodeConfirm !== nodeId) {
      game.uiState.pendingSkillTreeNodeConfirm = nodeId;
      const pathName = nodeId === 'spirit_bone_coterie'
        ? 'Commander of the Dead'
        : 'Lichbound Reaper';
      const lockedName = nodeId === 'spirit_bone_coterie'
        ? 'Lichbound Reaper'
        : 'Commander of the Dead';
      const summonOutcome = nodeId === 'spirit_bone_coterie'
        ? 'Raise the Bound Dead will call three of your selected form: skeletons, specters or lesser goliath knights.'
        : 'Learn Summon Lich as a separate ability. Raise the Bound Dead stays available.';
      game?.log?.(`${pathName} is a Gravecaller doctrine choice and will lock ${lockedName}. ${summonOutcome} Press A/Select again to confirm.`);
      return { ok: false, pending: true, reason: 'Confirm doctrine choice.' };
    }
  }

  if (!getPlayerSubclass(player) && (nodeId === 'warding_thornling_grove' || nodeId === 'warding_elder_beast')) {
    game.uiState = game.uiState || {};
    if (game.uiState.pendingSkillTreeNodeConfirm !== nodeId) {
      game.uiState.pendingSkillTreeNodeConfirm = nodeId;
      const pathName = nodeId === 'warding_thornling_grove'
        ? 'Thornling Pack'
        : 'Elder Thornbeast';
      const lockedName = nodeId === 'warding_thornling_grove'
        ? 'Elder Thornbeast'
        : 'Thornling Pack';
      game?.log?.(`${pathName} is a living companion path and will lock ${lockedName}. Thornlings offer flexible swarm control; Elder Thornbeast offers one durable rosemaw with unique power. Press A/Select again to confirm.`);
      return { ok: false, pending: true, reason: 'Confirm companion path.' };
    }
  }

  if (game?.uiState) {
    delete game.uiState.pendingSkillTreeNodeConfirm;
  }

  return spendSkillTreeNode(player, nodeId);
}

function logSkillTreeSpendResult(game, result) {
  if (!result?.ok) {
    game?.log?.(result?.reason || 'Node unavailable.');
    return;
  }

  const unlockedAbility = result.node?.unlocksAbility;
  if (unlockedAbility) {
    game?.log?.(`Skill Unlocked: ${abilityName(unlockedAbility)}. Open Abilities to assign it to your hotbar.`);
    return;
  }

  game?.log?.(`Learned ${result.node.name}.`);
}

function applySkillTreeControllerFocus(game) {
  document.querySelectorAll('.game-ui-controller-focus').forEach(element => {
    element.classList.remove('game-ui-controller-focus');
  });

  const state = game.uiSkillTreeControllerState || syncSkillTreeControllerState(game);
  const tree = resolveSelectedSkillTree(game.player, game);
  const node = resolveSelectedSkillTreeNode(game.player, game, tree);
  let target = null;

  if (state.column === 'path') {
    target = document.querySelector(`[data-skill-tree-select="${cssEscape(tree)}"]`);
  } else {
    target = document.querySelector(`[data-select-skill-tree-node="${cssEscape(node?.id || '')}"]`);
  }

  if (!target) return;

  target.classList.add('game-ui-controller-focus');

  if (typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  }

  revealMenuFocus(target);
  refreshMenuContextBar(game, target);
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(String(value || ''));
  }

  return String(value || '').replace(/["\\]/g, '\\$&');
}

function getGameUiFocusableElements(game) {
  const panelRoot = document.querySelector('.panel');

  if (!panelRoot?.classList.contains('open')) return [];

  const activeTabId = game?.uiState?.activeMainTab;
  const activePanel = activeTabId ? document.getElementById(activeTabId) : null;

  if(activeTabId==='map')return Array.from(activePanel?.querySelectorAll('.survey-stone-list [data-select-stone]')||[]);

  const tabs = Array.from(document.querySelectorAll('.tab[data-tab], .tab[data-menu-action]'));

  const panelItems = activePanel
    ? Array.from(activePanel.querySelectorAll([
        'button',
        '[role="button"]',
        'a[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',')))
    : [];

  return [
    ...tabs,
    ...panelRoot.querySelectorAll('.menu-sheet-controls button'),
    ...panelItems
  ].filter((element, index, items) => {
    if (!element || items.indexOf(element) !== index) return false;
    if (element.disabled) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;

    const rect = element.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0 && menuSheetItemVisible(element);
  });
}

function moveGameUiFocus(game, focusables, direction) {
  if (!focusables.length) return;

  game.uiControllerState.focusIndex =
    focusables.indexOf(directionalMenuItem(focusables,focusables[game.uiControllerState.focusIndex],direction));

  applyGameUiFocus(game, focusables);
}

function clampGameUiFocus(game, focusables) {
  if (!focusables.length) {
    game.uiControllerState.focusIndex = 0;
    return;
  }

  game.uiControllerState.focusIndex = Math.max(
    0,
    Math.min(focusables.length - 1, game.uiControllerState.focusIndex || 0)
  );
}

function applyGameUiFocus(game, focusables) {
  document.querySelectorAll('.game-ui-controller-focus').forEach(element => {
    element.classList.remove('game-ui-controller-focus');
  });

  if (!focusables.length) return;

  clampGameUiFocus(game, focusables);

  const selected = focusables[game.uiControllerState.focusIndex];

  if (!selected) return;

  selected.classList.add('game-ui-controller-focus');

  if (typeof selected.focus === 'function') {
    selected.focus({
      preventScroll: true
    });
  }

  refreshMenuContextBar(game, selected);
  revealMenuFocus(selected);
}

function activateGameUiFocusedElement(game, focusables) {
  if (!focusables.length) return;

  clampGameUiFocus(game, focusables);

  const selected = focusables[game.uiControllerState.focusIndex];

  if (!selected) return;

  if (selected.matches?.('.tab[data-tab]')) {
    selected.click();
    game.uiControllerState.focusIndex = 0;
    game.uiControllerState.lastPanelId = selected.dataset.tab || null;

    setTimeout(() => {
      applyGameUiFocus(game, getGameUiFocusableElements(game));
    }, 0);

    return;
  }

  if (
    selected.matches?.('input, textarea, select') &&
    typeof selected.focus === 'function'
  ) {
    selected.focus();
    return;
  }

  if (typeof selected.click === 'function') {
    selected.click();

    setTimeout(() => {
      applyGameUiFocus(game, getGameUiFocusableElements(game));
    }, 0);
  }
}

function scrollActivePanel(direction = 1) {
  const activePanel = document.querySelector('.panel.open .tab-panel.active');

  if (!activePanel) return;

  activePanel.scrollBy({
    top: direction * Math.max(160, activePanel.clientHeight * 0.75),
    behavior: 'smooth'
  });
}

function cycleOpenContextSubtab(game, direction = 1) {
  const panelId = game?.uiState?.activeMainTab;
  const activePanel = panelId ? document.getElementById(panelId) : null;
  if (!activePanel) return false;

  const subtabSelectors = {
    character: '[data-character-subtab]',
    inventory: '[data-inventory-subtab]',
    skills: '[data-skills-subtab]'
  };
  const selector = subtabSelectors[panelId];
  if (!selector) return false;

  const subtabs = Array.from(activePanel.querySelectorAll(selector))
    .filter(tab => tab.classList.contains('subtab') && !tab.disabled && tab.getAttribute('aria-hidden') !== 'true');
  if (!subtabs.length) return false;

  const stateKey = panelId === 'character'
    ? 'characterSubtab'
    : panelId === 'inventory'
      ? 'inventorySubtab'
      : 'skillsSubtab';
  const dataKey = panelId === 'character'
    ? 'characterSubtab'
    : panelId === 'inventory'
      ? 'inventorySubtab'
      : 'skillsSubtab';
  const currentValue = game.uiState?.[stateKey];
  const current = Math.max(0, subtabs.findIndex(tab => tab.dataset[dataKey] === currentValue));
  const next = subtabs[(current + direction + subtabs.length) % subtabs.length];
  const nextValue = next?.dataset?.[dataKey];
  if (!nextValue) return false;

  game.uiState[stateKey] = nextValue;
  game.uiControllerState.focusIndex = 0;
  game.uiControllerState.lastPanelId = panelId;

  if (panelId === 'inventory') {
    resetInventorySalvageHold(game);
    game.uiState.inventoryPageBySubtab = game.uiState.inventoryPageBySubtab || {};
    game.uiState.inventoryPageBySubtab[nextValue] = game.uiState.inventoryPageBySubtab[nextValue] || 0;
    game.uiState.coteriePlacementBagIndex = null;
    game.uiState.coterieFocusRegion = nextValue === 'coterie' ? 'inventory' : game.uiState.coterieFocusRegion;
    game.uiState.pendingInventorySalvageKey = null;
  }

  if (panelId === 'skills') {
    game.uiState.selectedAbilityId = null;
    resetAbilityControllerSelection(game);
    if (nextValue === 'trees') game.uiSkillTreeControllerState = null;
  }

  renderUI(game.player, game.logLines || [], game);
  return true;
}

function cycleOpenMainMenuTab(game, direction = 1) {
  const tabs = Array.from(document.querySelectorAll('.tab[data-tab]'))
    .filter(tab => !tab.disabled && tab.getAttribute('aria-hidden') !== 'true');
  if (!tabs.length) return;

  const current = Math.max(0, tabs.findIndex(tab => tab.dataset.tab === game.uiState.activeMainTab));
  const next = tabs[(current + direction + tabs.length) % tabs.length];
  if (!next) return;

  game.uiState.activeMainTab = next.dataset.tab;
  game.uiControllerState.focusIndex = 0;
  game.uiControllerState.lastPanelId = next.dataset.tab;
  setMainPanelDomState(game, next.dataset.tab);
  renderUI(game.player, game.logLines || [], game);
}

function decorateInGameMenuPanels(game) {
  const icons = {
    character: 'ID',
    skills: 'SK',
    inventory: 'IN',
    quests: 'Q',
    map: 'MP',
    log: 'LG'
  };

  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.dataset.menuIcon = icons[tab.dataset.tab] || 'UI';
  });

  document.querySelectorAll('[data-character-subtab], [data-inventory-subtab], [data-skills-subtab]').forEach(tab => {
    tab.dataset.menuIcon = compactMenuGlyph(tab.textContent);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('runalis-menu-workspace');
    let bar = panel.querySelector(':scope > .menu-context-bar');

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'menu-context-bar';
      panel.appendChild(bar);
    }

    bar.innerHTML = renderMenuContextPromptMarkup(getMenuContextPrompts(game, panel.id));
  });
  refreshMenuContextBar(game);
}

function compactMenuGlyph(label) {
  return String(label || '')
    .trim()
    .split(/\s+/)
    .map(word => word[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UI';
}

function refreshMenuContextBar(game, focusedElement = null) {
  const panelId = game?.uiState?.activeMainTab;
  const panel = panelId ? document.getElementById(panelId) : null;
  const bar = panel?.querySelector(':scope > .menu-context-bar');
  if (!bar) return;

  const prompts=getMenuContextPrompts(game,panelId,focusedElement);
  const detail=document.getElementById(panelId)?.querySelector('.inventory-detail-pane,.ability-detail-pane,.world-skill-detail,.quest-detail-pane,.character-stat-detail,.skill-tree-detail-pane');
  const readingPane=detail?.querySelector('.ability-detail-info')||detail;
  if(readingPane?.clientHeight>0&&readingPane.scrollHeight>readingPane.clientHeight+4)prompts.splice(1,0,['LT/RT','Read Details']);
  bar.innerHTML = renderMenuContextPromptMarkup(prompts);
}

function renderMenuContextPromptMarkup(prompts) {
  return prompts
    .map(([key, label]) => `<span><kbd>${escapeHtml(key)}</kbd>${escapeHtml(label)}</span>`)
    .join('');
}

function getMenuContextPrompts(game, panelId, focusedElement = null) {
  const prompts = [['LB/RB', 'Tabs'], ['D-pad', 'Navigate'], ['A', 'Select']];
  const data = focusedElement?.dataset || {};
  if (['character','quests','log'].includes(panelId)) prompts[0] = ['Select', 'Menu'];

  if (panelId === 'inventory') {
    if (game.uiState?.inventorySubtab === 'equipment') {
      const focusRegion = game.uiState.equipmentFocusRegion === 'slots' ? 'slots' : 'inventory';
      prompts[0] = ['LB/RB', 'Inventory Tabs'];
      prompts[2] = ['A', data.equipmentSlot ? 'Unequip' : data.inventoryItemIndex !== undefined ? 'Equip' : 'Select'];
      prompts.push(['Hold X', data.equipmentSlot ? 'Protected' : 'Salvage']);
      prompts.push(['Hold Y', focusRegion === 'slots' ? 'Inventory' : 'Slots']);
    } else if (game.uiState?.inventorySubtab === 'coterie') {
      const placing = game.uiState?.coteriePlacementBagIndex !== null &&
        game.uiState?.coteriePlacementBagIndex !== undefined;
      prompts[0] = ['LB/RB', 'Inventory Tabs'];
      prompts[2] = ['A', placing
        ? 'Place Gear'
        : data.coterieInventoryRow
          ? 'Choose Gear'
          : data.coterieSlot
            ? 'Return Gear'
            : 'Select'];
      if (placing) prompts.push(['B', 'Cancel']);

    } else if (data.inventoryItemIndex !== undefined) {
      prompts[0] = ['LB/RB', 'Inventory Tabs'];
      prompts[2] = ['A', 'Equip / Use'];
      prompts.push(['Hold X', 'Salvage']);
    }
  } else if (panelId === 'character' && data.characterStat) {
    prompts[2] = ['A', 'Inspect'];
  } else if (panelId === 'skills' && game.uiState.skillsSubtab === 'trees') {
    prompts[0] = ['LB/RB', 'Skill Tabs'];
    prompts[2] = ['A', focusedElement?.hasAttribute('data-skill-respec')?'Reset Points':data.selectSkillTreeNode ? 'Unlock / Inspect' : 'Select Path'];
  } else if (panelId === 'skills' && game.uiState.skillsSubtab === 'abilities') {
    const region = game.uiState.abilityAssignmentMode ? 'hotbar' : game.uiAbilityControllerState?.region || 'ability';
    prompts[0] = ['LB/RB', 'Skill Tabs'];
    prompts[2] = ['A', region === 'morph' ? 'Select Morph' : region === 'hotbar' ? 'Place Ability' : region === 'category' ? 'Select' : 'Assign Ability'];
    if (region === 'hotbar') prompts.push(['X', 'Clear Slot']);
    else if (region === 'ability' && getAbilityMorphControllerButtons().length) prompts.push(['X', 'Choose Morph']);
    prompts.push(['B', region === 'hotbar' || region === 'morph' ? 'Return to Skills' : 'Close']);
    return prompts;
  } else if (panelId === 'skills' && data.selectSkillId) {
    prompts[2] = ['A', 'Inspect'];
  } else if (panelId === 'quests') {
    prompts[2] = ['A', data.selectQuestId ? 'Track' : 'Select'];
  } else if (panelId === 'map') {
    prompts.length = 0;
    prompts.push(['Sticks', 'Cursor'], ['LT/RT', 'Zoom'], ['A', 'Select / travel'], ['Hold Y', 'Return to Orrakai'], ['B', 'Back']);
    return prompts;
  }

  const coteriePlacement =
    panelId === 'inventory' &&
    game.uiState?.inventorySubtab === 'coterie' &&
    game.uiState?.coteriePlacementBagIndex !== null &&
    game.uiState?.coteriePlacementBagIndex !== undefined;

  if (!(panelId === 'skills' && game.uiState.skillsSubtab === 'abilities' && game.uiState.abilityAssignmentMode) && !coteriePlacement) {
    prompts.push(['B', 'Close']);
  }
  return prompts;
}


function createDefaultUIState() {
  return {
    activeMainTab: null,
    menuChooserOpen: false,
    characterSubtab: 'sheet',
    inventorySubtab: 'equipment',
    equipmentFocusRegion: 'inventory',
    selectedEquipmentSlot: 'weapon',
    coterieFocusRegion: 'inventory',
    selectedCoterieSkeletonIndex: 0,
    selectedCoterieSlot: 'weapon',
    coteriePlacementBagIndex: null,
    skillsSubtab: 'trees',
    selectedQuestId: null,
    questPage: 0,
    selectedInventoryBagIndexBySubtab: {},
    selectedInventoryRecipeId: null,
    selectedSkillTreeId: null,
    selectedSkillTreeNodeId: null,
    selectedSkillTreeNodeByTree: {},
    selectedAbilityId: null,
    abilityCategory: 'all',
    abilityAssignmentMode: false,
    pendingAbilityId: null,
    lastInputMode: 'mouse',
    selectedSkillId: null,
    selectedCharacterStat: 'Level'
  };
}

function bindDynamicUI(player, game) {
  const rerender = () => renderUI(player, game.logLines || [], game);

  bindSubtabs(player, game);
  bindInventoryButtons(player, game, rerender);
  bindWorldMapButtons(player, game, rerender);
  bindCharacterButtons(player, game, rerender);
  bindCharacterCreatorButtons(game);
}

function bindCharacterCreatorButtons(game) {
  document.querySelectorAll('[data-open-character-creator]').forEach(btn => {
    btn.onclick = () => {
      openCharacterCreator(game);
    };
  });
}

function bindSubtabs(player, game) {
  document.querySelectorAll('button.subtab[data-character-subtab]').forEach(btn => {
    btn.onclick = () => {
      game.uiState.characterSubtab = btn.dataset.characterSubtab;
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('button.subtab[data-inventory-subtab]').forEach(btn => {
    btn.onclick = () => {
      game.uiState.inventorySubtab = btn.dataset.inventorySubtab;
      game.uiState.inventoryPageBySubtab = game.uiState.inventoryPageBySubtab || {};
      game.uiState.inventoryPageBySubtab[btn.dataset.inventorySubtab] = 0;
      game.uiState.coteriePlacementBagIndex = null;
      game.uiState.coterieFocusRegion = btn.dataset.inventorySubtab === 'coterie' ? 'inventory' : game.uiState.coterieFocusRegion;
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('button.subtab[data-skills-subtab]').forEach(btn => {
    btn.onclick = () => {
      resetAbilityControllerSelection(game);
      game.uiState.skillsSubtab = btn.dataset.skillsSubtab;
      if (game.uiState.skillsSubtab === 'trees') {
        game.uiSkillTreeControllerState = null;
      }
      closeMobileTreeDetail(game);
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-select-skill-id]').forEach(btn => {
    const selectSkill = () => {
      game.uiState.selectedSkillId = btn.dataset.selectSkillId;
      updateSkillDetailPreview(player, game);
    };

    btn.onmouseenter = () => {
      if (canMouseDriveMenuSelection(game)) selectSkill();
    };
    btn.onfocus = selectSkill;
    btn.onclick = selectSkill;
  });

  document.querySelectorAll('[data-character-stat]').forEach(btn => {
    const selectStat = () => {
      game.uiState.selectedCharacterStat = btn.dataset.characterStat;
      updateCharacterStatPreview(game);
    };

    btn.onmouseenter = () => {
      if (canMouseDriveMenuSelection(game)) selectStat();
    };
    btn.onfocus = selectStat;
    btn.onclick = selectStat;
  });

  document.querySelectorAll('[data-select-quest-id]').forEach(btn => {
    const journalPlayer = getQuestJournalPlayer(player, game);
    const selectQuest = () => {
      game.uiState.selectedQuestId = btn.dataset.selectQuestId;
      updateQuestDetailPreview(journalPlayer, game);
    };

    btn.onmouseenter = () => {
      if (canMouseDriveMenuSelection(game)) selectQuest();
    };
    btn.onfocus = selectQuest;
    btn.onclick = () => {
      selectQuest();

      const entryKey = btn.dataset.selectQuestId || '';
      const questId = entryKey.startsWith('active:') ? entryKey.slice(7) : null;
      if (!questId || !journalPlayer?.quests?.active?.[questId]) return;

      const hostPlayer = game?.hostGame?.player;
      const trackingPlayer = hostPlayer?.quests?.active?.[questId] ? hostPlayer : player;
      trackingPlayer.questState = trackingPlayer.questState || {};
      trackingPlayer.questState.activeQuestId = questId;
      game?.log?.(`Tracking quest: ${journalPlayer.quests.active[questId].title || questId}.`);
      renderUI(player, game.logLines || [], game);
    };
  });


  document.querySelectorAll('[data-skill-tree-select]').forEach(btn => {
    const selectTree = () => {
      const previousTree = resolveSelectedSkillTree(player, game);
      selectSkillTreeForUi(player, game, btn.dataset.skillTreeSelect);
      if (previousTree !== game.uiState.selectedSkillTreeId) {
        renderUI(player, game.logLines || [], game);
      } else {
        updateSkillTreePreview(player, game);
      }
    };

    btn.onmouseenter = () => {
      if (canMouseDriveMenuSelection(game)) selectTree();
    };
    btn.onfocus = selectTree;
    btn.onclick = selectTree;
  });

  document.querySelectorAll('[data-select-skill-tree-node]').forEach(btn => {
    const selectNode = () => {
      game.uiState.selectedSkillTreeNodeId = btn.dataset.selectSkillTreeNode;
      rememberSelectedSkillTreeNode(game, resolveSelectedSkillTree(player, game), btn.dataset.selectSkillTreeNode);
      updateSkillTreePreview(player, game);
    };

    // Keep the clicked node selected while the mouse crosses other nodes on
    // its way to Learn Node. Keyboard/controller focus still selects normally.
    btn.onmouseenter = null;
    btn.onfocus = selectNode;
    btn.onclick = event => {
      selectNode();
      if(!document.body.classList.contains('mobile-input'))return;
      const nodeId=btn.dataset.selectSkillTreeNode,now=performance.now(),previous=game.mobileTreeTap;
      clearTimeout(previous?.timer);
      if(previous?.id===nodeId&&now-previous.time<360){
        game.mobileTreeTap=null;
        closeMobileTreeDetail(game);
        const result=spendSkillTreeNodeFromUi(game,player,nodeId);
        game.uiState.mobileTreeFeedback=result.ok?`${result.node?.name||'Skill'} learned.`:result.pending?'This is an exclusive path choice. Double-tap the skill again to confirm.':result.reason||'Skill unavailable.';
        if(!result.pending)logSkillTreeSpendResult(game,result);
        renderUI(player,game.logLines||[],game);
        if(result.ok)game.save?.(false);
        return;
      }
      // Leave the node under the second finger tap; opening a sheet immediately
      // can cover it before the double tap finishes.
      game.mobileTreeTap={id:nodeId,time:now,timer:setTimeout(()=>{
        game.mobileTreeTap=null;
        if(btn.isConnected&&game.uiState.skillsSubtab==='trees'){
          document.querySelector('[data-skill-tree-detail]')?.classList.add('mobile-tree-detail-open');
        }
      },360)};
    };
    btn.ondblclick = event => {
      if(event.button!==0||document.body.classList.contains('mobile-input'))return;
      event.preventDefault();selectNode();
      const result=spendSkillTreeNodeFromUi(game,player,btn.dataset.selectSkillTreeNode);
      if(!result.pending)logSkillTreeSpendResult(game,result);
      renderUI(player,game.logLines||[],game);
      if(result.ok)game.save?.(false);
    };
  });

  bindSubclassTreeControls(player,game,renderUI);
  bindMobileTreeDetail(game);
  bindAbilityMorphControls(player,game,renderUI);
  document.querySelectorAll('[data-skill-tree-node]').forEach(btn => {
    btn.onclick = () => {
      const nodeId = btn.dataset.skillTreeNode;
      const result = spendSkillTreeNodeFromUi(game, player, nodeId);
      if (!result.pending) {
        logSkillTreeSpendResult(game, result);
      }
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-ability-category]').forEach(btn => {
    btn.onclick = () => {
      game.uiState.abilityCategory = btn.dataset.abilityCategory || 'all';
      game.uiState.selectedAbilityId = null;
      resetAbilityControllerSelection(game);
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-select-ability-id]').forEach(btn => {
    const selectAbility = () => {
      game.uiState.selectedAbilityId = btn.dataset.selectAbilityId;
      updateAbilityManagementPreview(player, game);
    };
    btn.onfocus = () => {if(!document.body.classList.contains('mobile-input'))selectAbility();};
    btn.onmouseenter = () => {
      if (!document.body.classList.contains('mobile-input')&&canMouseDriveMenuSelection(game)) selectAbility();
    };
    btn.onclick = () => {
      selectAbility();
      if(document.body.classList.contains('mobile-input'))game.uiState.mobileAbilityDetailOpen=true;
      resetAbilityControllerSelection(game);
      renderUI(player,game.logLines||[],game);
    };
  });

  document.querySelectorAll('[data-assign-selected-slot]').forEach(btn => {
    btn.onclick = () => {
      const slot = Number(btn.dataset.assignSelectedSlot);
      if (!game.uiState.pendingAbilityId) {
        game.uiState.pendingAbilityId = game.uiState.selectedAbilityId;
      }
      completeAbilityAssignment(game, slot);
    };
  });

  document.querySelectorAll('[data-clear-ability-slot]').forEach(btn => {
    btn.onclick = () => {
      const slot = Number(btn.dataset.clearAbilitySlot);
      const oldAbility = getAbilityById(player.loadout?.abilitySlots?.[slot]);
      clearAbilitySlot(player, slot);
      if(document.body.classList.contains('mobile-input'))game.uiState.mobileAbilityFeedback=`Tile ${slot+1} cleared. The skill remains learned.`;
      game?.log?.(`${oldAbility?.name || 'Ability'} removed from ${abilitySlotLabel(slot)}. It remains learned.`);
      renderUI(player, game.logLines || [], game);
      if(document.body.classList.contains('mobile-input'))game.save?.(false);
    };
  });
  bindMobileSkills(game,(id,slot)=>{game.uiState.pendingAbilityId=id;completeAbilityAssignment(game,slot);});
}

function restoreActiveMainPanel(game) {
  if (!game.uiState.activeMainTab) {
    setMainPanelDomState(game, null);

    if (game.uiState.menuChooserOpen) {
      const root = document.querySelector('.panel');
      root?.classList.add('open', 'menu-chooser');
      if (root) delete root.dataset.panelClosed;
      applyGameUiFocus(game, getGameUiFocusableElements(game));
    }

    return;
  }

  const activeBtn = document.querySelector(`.tab[data-tab="${game.uiState.activeMainTab}"]`);
  const activePanel = document.getElementById(game.uiState.activeMainTab);

  if (!activeBtn || !activePanel) {
    game.uiState.activeMainTab = null;
    setMainPanelDomState(game, null);
    return;
  }

  setMainPanelDomState(game, game.uiState.activeMainTab);
}

function setMainPanelDomState(game, activeTabId = null) {
  const root = document.querySelector('.panel');
  const isOpen = !!activeTabId;
  const worldMap=document.getElementById('map');
  if(activeTabId==='map'&&!worldMap?.classList.contains('active')){
    // A fresh opening follows the player; refreshes inside an open map retain
    // the view the player is currently exploring.
    if(worldMap){worldMap.surveyView=null;worldMap.surveyCursor=null;worldMap.surveyRenderKey=null;}
  }

  if (activeTabId !== 'skills') resetAbilityControllerSelection(game);

  if (isOpen && game?.uiState) {
    game.uiState.menuChooserOpen = false;
  }

  if (root) {
    root.classList.remove('menu-chooser');
    root.classList.toggle('open', isOpen);

    if (isOpen) {
      delete root.dataset.panelClosed;
    } else {
      root.dataset.panelClosed = 'true';
    }
  }

  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    const active = isOpen && tab.dataset.tab === activeTabId;
    tab.classList.toggle('active', active);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    const active = isOpen && panel.id === activeTabId;

    panel.classList.toggle('active', active);
    panel.classList.remove('game-ui-controller-focus');
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    panel.style.display = active ? '' : 'none';
    panel.style.visibility = active ? '' : 'hidden';
    panel.style.opacity = active ? '' : '0';
    panel.style.pointerEvents = active ? '' : 'none';
  });

  // Opening a tab does not run the periodic HUD refresh (the open panel pauses
  // it). Render the lazy map here, after its viewport becomes visible.
  if (activeTabId === 'map') renderWorldMap(game.player, game);

  if (!isOpen && game?.uiControllerState && !game?.uiState?.menuChooserOpen) {
    game.uiControllerState.focusIndex = 0;
    game.uiControllerState.lastPanelId = null;
  }

  if (!isOpen && !game?.uiState?.menuChooserOpen) {
    document.querySelectorAll('.game-ui-controller-focus').forEach(element => {
      element.classList.remove('game-ui-controller-focus');
    });
  }
}

// -----------------------------------------------------------------------------
// DOM / SCREEN HELPERS
// -----------------------------------------------------------------------------

function gameScreenIsActive() {
  const app = document.getElementById('app');
  const mainMenu = document.getElementById('mainMenu');

  return (
    app?.classList.contains('active') &&
    !mainMenu?.classList.contains('active')
  );
}

function hideLegacyTopBanner() {
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const menuBtn = document.getElementById('menuBtn');

  const controls = [saveBtn, loadBtn, menuBtn].filter(Boolean);

  controls.forEach(node => {
    node.classList.add('runalis-hide-legacy-control');
  });
}

function hideGameHudDom() {
  const unitFrames = document.getElementById('unitFramesHud');
  const combatHud = document.getElementById('combatSkillHud');
  const minimap = document.getElementById('runalisMinimapHud');
  const questTracker = document.getElementById('trackedQuestHud');

  if (unitFrames) unitFrames.remove();
  if (combatHud) combatHud.remove();
  if (minimap) minimap.remove();
  if (questTracker) questTracker.remove();
  document.documentElement.style.removeProperty('--runalis-minimap-size');
}

export function clearGameUiDom() {
  const workshop=document.getElementById('workshopServiceOverlay');
  if(workshop?.__game)closeWorkshopService(workshop.__game);
  hideGameHudDom();
  document.body.classList.remove('dialogue-active');
  document.body.classList.remove('runalis-low-health');
  document.body.classList.remove('couch-coop-active');
  delete document.body.dataset.runalisClass;
  delete document.body.dataset.uiOwnerSlot;

  const panelRoot = document.querySelector('.panel');
  if (panelRoot) {
    panelRoot.classList.remove('open');
    panelRoot.dataset.panelClosed = 'true';
    delete panelRoot.dataset.ownerSlot;
  }

  document.querySelectorAll('.game-ui-controller-focus').forEach(element => {
    element.classList.remove('game-ui-controller-focus');
  });

  const dynamicOverlayIds = [
    'characterCreatorOverlay',
    'marketShopOverlay',
    'workshopServiceOverlay',
    'fishingMiniGameOverlay',
    'couchCoopJoinOverlay'
  ];

  for (const id of dynamicOverlayIds) {
    const overlay = document.getElementById(id);
    if (!overlay) continue;

    overlay.classList.remove('active');
    overlay.onkeydown = null;
    overlay.__runalisGame = null;
    overlay.innerHTML = '';
  }

  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) {
    pauseOverlay.classList.remove('active');
    pauseOverlay.__runalisGame = null;
  }
}

// -----------------------------------------------------------------------------
// TOP-LEFT MMORPG UNIT FRAMES
// -----------------------------------------------------------------------------

function renderUnitFrames(player) {
  let frame = document.getElementById('unitFramesHud');

  if (!gameScreenIsActive()) {
    if (frame) frame.remove();
    return;
  }

  if (!frame) {
    frame = document.createElement('div');
    frame.id = 'unitFramesHud';
    document.body.appendChild(frame);
  }

  const activeSummons = (player.summons || []).filter(s => s.alive !== false);
  const activeCoop = (player.coop?.players || []).filter(ally => ally && ally.active !== false);
  const partyEntries = [
    ...activeCoop.map(ally => coopUnitFrame(ally)),
    ...activeSummons.map(summon => summonUnitFrame(summon,player))
  ];

  frame.innerHTML = `
    ${playerUnitFrame(player)}

    <div class="party-frame-list">
      ${partyEntries.length
        ? partyEntries.join('')
        : `<div class="empty-party-frame">No active summon</div>`
      }
    </div>
  `;
}

function playerUnitFrame(player) {
  const className = player.className || 'Classless';
  const portraitClass = player.classId || 'classless';
  const bloodline = getPlayerBloodline(player);
  const progression = getProgressionSummary(player);
  const combatLevel = progression.combatLevel || player.combatLevel || 1;

  return `
    <div class="unit-frame player-unit-frame">
      <div class="unit-portrait ${escapeHtml(portraitClass)}">
        ${hudPortraitMarkup(player)}
      </div>

      <div class="unit-frame-body">
        <div class="unit-title-row">
          <b>${escapeHtml(player.name || 'Wayfarer')}</b>
          <span>${escapeHtml(className)}</span>
        </div>

        <div class="unit-level-row">
          <span>Level ${combatLevel}</span>
          ${progression.weaponSkill === 'warding' ? '' : `<b>${escapeHtml(progression.weaponSkillName || 'Weapon')} Lv ${progression.weaponSkillLevel || 1}</b>`}
        </div>

        ${bloodline ? `<div class="unit-bloodline-row">${escapeHtml(bloodline.title)}: ${escapeHtml(bloodline.name)}</div>` : ''}

        ${unitBar('HP', player.hp, player.maxHp, 'hp')}
        ${unitBar('STA', player.stamina, player.maxStamina, 'stamina')}
        ${unitBar('SPI', player.spirit, player.maxSpirit, 'spirit')}
        ${player.classId === 'lightbringer' ? lightbringerLumenRow(player) : ''}
        ${player.classId === 'waverider' ? sunkenDepthRow(player) : ''}
      </div>
    </div>
  `;
}

function summonUnitFrame(summon,player) {
  const hp = Math.max(0, summon.hp ?? summon.maxHp ?? 1);
  const maxHp = Math.max(1, summon.maxHp ?? hp ?? 1);
  const kind = summon.kind || 'summon';

  return `
    <div class="unit-frame summon-unit-frame">
      <div class="unit-portrait summon ${escapeHtml(kind)}">
        ${hudPortraitMarkup(summon,player)}
      </div>

      <div class="unit-frame-body">
        <div class="unit-title-row">
          <b>${escapeHtml(summon.displayName || summonName(kind))}</b>
          <span>Summon</span>
        </div>

        ${unitBar('HP', hp, maxHp, 'hp summon-hp')}
      </div>
    </div>
  `;
}

function coopUnitFrame(ally) {
  const hp = Math.max(0, ally.hp ?? ally.maxHp ?? 1);
  const maxHp = Math.max(1, ally.maxHp ?? hp ?? 1);
  const className = ally.className || 'Classless';

  return `
    <div class="unit-frame summon-unit-frame coop-unit-frame">
      <div class="unit-portrait ${escapeHtml(ally.classId || 'classless')}">
        ${hudPortraitMarkup(ally)}
      </div>

      <div class="unit-frame-body">
        <div class="unit-title-row">
          <b>${escapeHtml(ally.name || 'Player 2')}</b>
          <span>${escapeHtml(className)}</span>
        </div>

        ${unitBar('HP', hp, maxHp, 'hp summon-hp')}
      </div>
    </div>
  `;
}

function unitBar(label, value, max, cls) {
  const safeMax = Math.max(1, max || 1);
  const safeValue = Math.max(0, value || 0);
  const pct = Math.max(0, Math.min(100, safeValue / safeMax * 100));

  return `
    <div class="unit-bar-row">
      <span>${escapeHtml(label)}</span>
      <div class="unit-bar ${escapeHtml(cls)}">
        <div style="width:${pct}%"></div>
      </div>
      <b>${Math.ceil(safeValue)}/${Math.ceil(safeMax)}</b>
    </div>
  `;
}

function lightbringerLumenRow(player) {
  const state = player.lightbringer || {};
  const maxLumens = 3;
  const lumens = Math.max(0, Math.min(maxLumens, Math.floor(Number(state.lumens || 0))));
  const progress = Math.max(0, Math.min(2, Math.floor(Number(state.lumenProgress || 0))));
  const now = performance.now() / 1000;
  const overbright = Number(state.overbrightUntil || 0) > now;
  const shards = Array.from({ length: maxLumens }, (_, index) => {
    const cls = index < lumens
      ? 'filled'
      : index === lumens && progress > 0
        ? 'charging'
        : '';
    return `<i class="${cls}"></i>`;
  }).join('');

  return `
    <div class="lumen-row ${overbright ? 'overbright' : ''}">
      <span>LUM</span>
      <div class="lumen-shards">${shards}</div>
      <b>${overbright ? 'Overbright' : `${lumens}/${maxLumens}`}</b>
    </div>
  `;
}

function sunkenDepthRow(player) {
  const state=getSunkenPressureState(player),now=performance.now()/1000;
  if(!state||now-state.lastHit>SUNKEN_PRESSURE.encounterGrace)return '';
  const depth=Math.round(Math.max(0,Math.min(1,state.depth))*100);
  return `<div class="unit-bar-row sunken-depth" title="Damaging Sunken skills build shared Depth over 20 seconds. Five seconds without a hit resets it."><span>Depth</span><div class="unit-bar mp"><div style="width:${depth}%;background:#285cb6"></div></div><b>${depth}%</b></div>`;
}

function playerPortraitGlyph(player) {
  if (normalizeClassId(player.classId) === 'classless') return 'CL';
  if (player.classId === 'eldritch') return 'E';
  if (player.classId === 'lightbringer') return 'L';
  if (player.classId === 'gravecaller' || player.classId === 'necromancer') return '☠';
  if (player.classId === 'thornbinder') return '✦';
  if (normalizeClassId(player.classId) === 'waverider') return '≈';
  if (normalizeClassId(player.classId) === 'oathkeeper') return 'OK';
  if (normalizeClassId(player.classId) === 'fellhunter') return 'FH';
  return '◎';
}

function summonPortraitGlyph(summon) {
  if (summon.kind === 'lich') return '☠';
  if (summon.kind === 'thornbeast') return '✿';
  if (summon.kind === 'eldritchHorror') return '✦';
  if (summon.kind === 'spectralHand') return '✋';
  return '◆';
}

// -----------------------------------------------------------------------------
// BOTTOM-RIGHT COMBAT HUD
// -----------------------------------------------------------------------------

function renderCombatHud(player) {
  let hud = document.getElementById('combatSkillHud');

  if (!gameScreenIsActive()) {
    if (hud) hud.remove();
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'combatSkillHud';
    document.body.appendChild(hud);
  }

  hud.style.display = '';

  const now = performance.now() / 1000;

  const weapon = player.equipment?.weapon ? ITEMS[player.equipment.weapon] : null;
  const qId = player.loadout?.abilitySlots?.[0] || null;
  const rId = player.loadout?.abilitySlots?.[1] || null;
  const xId = player.loadout?.abilitySlots?.[2] || null;

  const qAbility = qId ? getAbilityById(qId) : null;
  const rAbility = rId ? getAbilityById(rId) : null;
  const xAbility = xId ? getAbilityById(xId) : null;

  const progression = getProgressionSummary(player);
  const equippedHudAbilities = [
    hudAbilitySlot(player, qAbility, getAbilityBindingLabel(player,0), now, 'Choose a class'),
    hudAbilitySlot(player, rAbility, getAbilityBindingLabel(player,1), now, player.className ? 'Choose from branching skill trees' : 'Choose a class'),
    hudAbilitySlot(player, xAbility, getAbilityBindingLabel(player,2), now, player.className ? 'Choose from branching skill trees' : 'Choose a class'),
    hudAbilitySlot(player, getAbilityById(player.loadout?.abilitySlots?.[3]), getAbilityBindingLabel(player,3), now, 'Assign a learned technique'),
    hudAbilitySlot(player, getAbilityById(player.loadout?.abilitySlots?.[4]), getAbilityBindingLabel(player,4), now, 'Assign Block or another learned technique')
  ];

  hud.innerHTML = `
    <div class="combat-hud-title">
      <span>Level ${progression.combatLevel}</span>
      <b>${escapeHtml(player.className || 'Classless')}</b>
    </div>

    <div class="twilight-actionbar">
    <div class="combat-hud-slots">
      ${hudSlot({
        key: 'Space / RB',
        name: getBasicAttackName(weapon),
        icon: getWeaponHudIcon(weapon),
        abilityId: weapon?.weaponType || 'basicAttack',
        desc: `${weapon ? weaponTypeLabel(weapon.weaponType) : 'Unarmed'} - hold for heavy attack · +${PRIMARY_WEAPON_SPIRIT_ON_HIT} Spirit on hit`,
        ready: true,
        cooldownPercent: 0,
        cooldownText: '',
        locked: false
      })}

      ${equippedHudAbilities.join('')}
    </div>
    </div>
  `;
}

function renderTrackedQuestHud(player) {
  let hud = document.getElementById('trackedQuestHud');

  if (!gameScreenIsActive() || document.querySelector('.panel.open')) {
    if (hud) hud.remove();
    return;
  }

  const activeQuests = player?.quests?.active || {};
  const completedQuests = player?.quests?.completed || {};
  const trackedId = player?.questState?.activeQuestId || null;
  const quest = trackedId ? activeQuests[trackedId] : null;
  const completedQuest = trackedId
    ? completedQuests[trackedId] || player?.questState?.completed?.[trackedId] || null
    : null;
  const failedQuest = trackedId ? player?.questState?.failed?.[trackedId] || null : null;

  if (!quest && !completedQuest && !failedQuest) {
    if (hud) hud.remove();
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'trackedQuestHud';
    document.body.appendChild(hud);
  }

  if (!quest) {
    hud.innerHTML = completedQuest
      ? `
        <b>${escapeHtml(completedQuest.title || trackedId)}</b>
        <div class="tracked-quest-objectives"><span>Quest complete</span></div>
      `
      : `
        <b>${escapeHtml(failedQuest.title || trackedId)}</b>
        <div class="tracked-quest-objectives"><span>Quest failed</span></div>
      `;
    return;
  }

  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
  const incomplete = objectives.filter(objective => !isObjectiveComplete(objective));
  const visibleObjectives = (incomplete.length ? incomplete : objectives).slice(0, 4);

  hud.innerHTML = `
    <b>${escapeHtml(quest.title || trackedId)}</b>
    <div class="tracked-quest-objectives">
      ${quest.readyToTurnIn
        ? '<span>Ready to turn in</span>'
        : visibleObjectives.length
          ? visibleObjectives.map(objective => `
              <span>${escapeHtml(getObjectiveLabel(objective))} ${Math.min(Number(objective.current || 0), Number(objective.required || 1))}/${Number(objective.required || 1)}</span>
            `).join('')
          : '<span>Continue the quest</span>'
      }
    </div>
  `;
}

function hudAbilitySlot(player, ability, key, now, lockedReason) {
  ability=applyMythicalAbilityModifiers(player,applyAbilityMastery(player,ability));
  if (!ability) {
    return hudSlot({
      key,
      name: 'Locked',
      desc: lockedReason,
      ready: false,
      cooldownPercent: 0,
      cooldownText: '',
      locked: true,
      icon: '',
      abilityId: 'locked'
    });
  }

  player.cooldowns = player.cooldowns || {};

  const useChargeState = getAbilityUseChargeState(player, ability, now);
  let remaining = 0;
  let onCooldown = false;
  let percent = 0;

  if (useChargeState.maxCharges > 1) {
    remaining = useChargeState.remaining;
    onCooldown = useChargeState.charges <= 0;
    percent = onCooldown
      ? Math.max(0, Math.min(100, (remaining / Math.max(0.1, useChargeState.rechargeTime)) * 100))
      : 0;
  } else {
    let last = player.cooldowns[ability.id] ?? -Infinity;
    const cd = ability.cd || 0;

    if (last > now) {
      delete player.cooldowns[ability.id];
      last = -Infinity;
    }

    const elapsed = now - last;
    remaining = Math.max(0, cd - elapsed);
    onCooldown = remaining > 0;
    percent = cd > 0 ? Math.max(0, Math.min(100, (remaining / cd) * 100)) : 0;
  }

  const availability = getAbilityAvailability(player,ability);
  const effective=ability;
  const resourceFailed = (player[effective.costType || 'stamina'] || 0) < (effective.heldBlock?2:effective.cost);
  const activeChannel = ability.heldBlock ? !!player.actionState?.blocking && !player.actionState?.guardBroken : player.activeChannel?.abilityId===ability.id;
  const holdCharge = player.abilityCharge?.active && player.abilityCharge.abilityId===ability.id;
  const skillLevel = getSkillLevel(player.skillState, ability.skill);
  const skillRequirement = getAbilitySkillRequirement(ability);
  const levelLocked = skillRequirement && skillLevel < skillRequirement;

  const activeSummon = isSummonAbilityActive(player, ability);

  return hudSlot({
    key,
    name: ability.name,
    icon: HUD_ABILITY_ICONS[ability.id] || createAbilityFallbackIcon(ability),
    abilityId: ability.id,
    iconPlayer:ability.subclassId?player:null,
    desc: activeSummon
      ? 'Active — press again to dismiss'
      : levelLocked
        ? `${skillLabel(ability.skill)} ${skillLevel}/${skillRequirement}`
        : abilityDescriptionShort(ability),
    ready: (!onCooldown && availability.usable && !resourceFailed) || activeSummon || activeChannel,
    mastery: getMasteryProgress(player,ability.id).level,
    channelActive: activeChannel,
    holdProgress: holdCharge ? player.abilityCharge.progress : 0,
    resourceFailed,
    cooldownPercent: onCooldown && !activeSummon ? percent : 0,
    cooldownText: onCooldown && !activeSummon ? remaining.toFixed(1) : '',
    chargeText: useChargeState.maxCharges > 1
      ? `${useChargeState.charges}/${useChargeState.maxCharges}`
      : '',
    rechargePercent: useChargeState.maxCharges > 1 && useChargeState.recharging
      ? Math.round(useChargeState.rechargeProgress * 100)
      : 0,
    locked: !availability.usable
  });
}

function isSummonAbilityActive(player, ability) {
  if (!ability?.summonType) return false;

  return (player.summons || []).some(s => {
    return s.alive !== false && s.kind === ability.summonType;
  });
}

function hudSlot({
  key,
  name,
  icon,
  abilityId,
  iconPlayer=null,
  desc,
  ready,
  cooldownPercent,
  cooldownText,
  chargeText = '',
  rechargePercent = 0,
  mastery = 0, channelActive = false, holdProgress = 0, resourceFailed = false,
  locked
}) {
  return `
    <div class="combat-hud-slot ${ready ? 'ready' : ''} ${locked ? 'locked' : ''} ${channelActive ? 'channel-active' : ''} ${resourceFailed ? 'resource-failed' : ''}" data-ability-id="${escapeHtml(abilityId || 'unknown')}" title="${escapeHtml(name)}${desc ? ` - ${escapeHtml(desc)}` : ''}">
      <div class="combat-hud-icon">${locked ? '' : hudArtIcon(abilityId, escapeHtml(icon || ''),iconPlayer)}</div>
      <div class="combat-hud-key">${escapeHtml(key)}</div>
      ${mastery ? `<div class="combat-hud-mastery">M${mastery}</div>` : ''}
      ${channelActive ? '<div class="combat-hud-channel">CHANNEL</div>' : ''}
      ${holdProgress > 0 ? `<div class="combat-hud-hold" style="width:${Math.round(holdProgress*100)}%"></div>` : ''}
      ${resourceFailed && !channelActive ? '<div class="combat-hud-resource">LOW</div>' : ''}
      ${chargeText ? `<div class="combat-hud-charge-text">${escapeHtml(chargeText)}</div>` : ''}

      <div class="combat-hud-body">
        <b>${escapeHtml(name)}</b>
        <span>${escapeHtml(desc || '')}</span>
      </div>

      ${cooldownPercent > 0 ? `
        <div class="combat-hud-cooldown" style="height:${cooldownPercent}%"></div>
        <div class="combat-hud-cd-text">${escapeHtml(cooldownText)}</div>
      ` : ''}
      ${rechargePercent > 0 ? `<div class="combat-hud-charge-recharge" style="width:${rechargePercent}%"></div>` : ''}
    </div>
  `;
}

function getWeaponHudIcon(weapon) {
  const type = String(weapon?.weaponType || '').toLowerCase();

  if (type === 'sword' || type === 'blade') return 'SWD';
  if (type === 'dagger') return 'DAG';
  if (type === 'axe') return 'AXE';
  if (type === 'mace') return 'MCE';
  if (type === 'hammer') return 'HAM';
  if (type === 'spear') return 'SPR';
  if (type === 'bow') return 'BOW';
  if (type === 'crossbow') return 'XBW';
  if (type === 'scythe') return 'SCY';
  if (type === 'staff') return 'STF';
  if (type === 'spiritfocus') return 'FOC';
  if (type === 'eldritch') return 'ELD';
  return 'ATK';
}

function createAbilityFallbackIcon(ability) {
  const words = String(ability?.name || ability?.id || 'Skill')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.slice(0, 2).map(word => word[0] || '').join('').toUpperCase().slice(0, 2) || 'SK';
}

function getBasicAttackName(weapon) {
  if (!weapon) return 'Basic Strike';

  if (weapon.weaponType === 'bow') return 'Arrow Shot';
  if (weapon.weaponType === 'spiritFocus') return 'Focus Bolt';
  if (weapon.weaponType === 'scythe') return 'Scythe Slash';
  if (weapon.weaponType === 'staff') return 'Staff Strike';
  if (weapon.weaponType === 'sword') return 'Sword Slash';

  return 'Basic Attack';
}

function abilityDescriptionShort(ability) {
  if (ability.summonType) {
    return `Summon ${summonName(ability.summonType)}`;
  }

  if (ability.damageMultiplier) {
    return `${Math.round(ability.damageMultiplier * 100)}% skill damage`;
  }

  if (ability.damageReduction) {
    return `${Math.round(ability.damageReduction * 100)}% damage reduction`;
  }

  return ability.skill ? skillLabel(ability.skill) : 'Ability';
}

// -----------------------------------------------------------------------------
// CHARACTER
// -----------------------------------------------------------------------------

function renderCharacter(player, game) {
  const el = document.getElementById('character');
  if (!el) return;

  game.uiState.characterSubtab = 'sheet';
  const weapon = player.equipment.weapon ? ITEMS[player.equipment.weapon] : null;
  el.dataset.characterSubtab = 'sheet';
  el.innerHTML = renderCharacterSheet(player, weapon, game);
}

function renderCharacterSheet(player, weapon, game) {
  const highestCombat = getHighestCombatSkills(player.skillState)[0];
  const highestCombatText = highestCombat
    ? `${highestCombat.name} Level ${highestCombat.level}`
    : 'None';

  const weaponDamage = weapon
    ? calculateDisplayWeaponDamage(player, weapon)
    : Math.max(1, Math.floor(getPower(player) * 0.65));

  const inventoryValue = calculateInventoryValue(player);
  const equippedValue = calculateEquippedValue(player);
  const progression = getProgressionSummary(player);
  const rememberedStat = game?.uiState?.selectedCharacterStat;
  const selectedStat = !rememberedStat || rememberedStat === 'Combat Level' ? 'Level' : rememberedStat;
  const selectedStatValue = getCharacterStatValue(selectedStat, {
    progression,
    weaponDamage,
    inventoryValue,
    equippedValue,
    highestCombatText,
    player
  });

  return `
    <div class="character-sheet-grid">
      <div class="card character-paper">
        <div class="sheet-title-row">
          <div>
            <h2>${escapeHtml(player.name)}</h2>
            <p class="tag">${escapeHtml(player.className || 'Classless')} • ${escapeHtml(getCharacterBuildName(player.skillState))}</p>${getPlayerExpertise(player)?`<p class="tag gold">${escapeHtml(getPlayerExpertise(player).name)}</p>`:''}
          </div>
        </div>

        <div class="character-identity-facts">
          <p>${escapeHtml(player.origin || 'Unknown origin')} · ${escapeHtml(getPlayerBloodline(player)?.name || 'Human')}</p>
          ${getPlayerBloodline(player)?`<p class="tag">${escapeHtml(bloodlineModifierSummary(getPlayerBloodline(player)))}</p>`:''}
          <button data-open-character-creator="1">Customize Appearance</button>
        </div>
        <div class="sheet-bars">
          ${bar('Health', player.hp, player.maxHp, 'bad')}
          ${bar('Stamina', player.stamina, player.maxStamina, 'good')}
          ${bar('Spirit', player.spirit, player.maxSpirit, 'blue')
          }
        </div>

        <div class="sheet-section-title">Progression</div>
        <div class="sheet-stat-grid">
          ${sheetStat('Level', progression.combatLevel)}
          ${sheetStat('Combat XP', `${Math.floor(progression.combatProgress.xp)} / ${Math.ceil(progression.combatProgress.next)}`)}
          ${sheetStat('Combat Rank', progression.combatRank)}
        </div>

        <div class="sheet-section-title">Core Stats</div>
        <div class="sheet-stat-grid">
          ${sheetStat('Power', Math.floor(getPower(player)))}
          ${sheetStat('Armour', Math.floor(getArmour(player)))}
          ${sheetStat('Weapon Damage', weaponDamage)}
          ${sheetStat('Gold', player.gold || 0)}
          ${sheetStat('Favoured XP Bonus', getClassAffinities(player).map(id=>skillLabel(id)+' +25%').join(' · '))}
        </div>
      </div>

      <div class="card character-paper">
        <div class="sheet-section-title">Equipped Gear</div>
        <div class="paper-equipment-list">
          ${paperEquipmentRow(player, 'weapon', 'Weapon')}
          ${paperEquipmentRow(player, 'helm', 'Helm')}
          ${paperEquipmentRow(player, 'chest', 'Chest')}
          ${paperEquipmentRow(player, 'legs', 'Legs')}
          ${paperEquipmentRow(player, 'trinket', 'Charm')}
        </div>

        <div class="sheet-section-title">Equipment Value</div>
        <div class="sheet-stat-grid two">
          ${sheetStat('Equipped Value', `${equippedValue} Ash`)}
          ${sheetStat('Inventory Value', `${inventoryValue} Ash`)}
        </div>
      </div>

      <div class="card character-paper">
        <div class="sheet-section-title">Weapon Use</div>
        ${weapon ? `<p>${escapeHtml(equipmentPurpose(weapon))}</p><p class="tag">Scales with ${escapeHtml(equipmentScaling(weapon))}.</p>` : `<p class="tag">No weapon equipped.</p>`}

        <p class="tag">Tap RB / Space for the light combo; hold for a heavy attack.</p>
        <div class="sheet-section-title">Current Abilities</div>
        <div class="paper-ability-list">
          ${paperAbilityRow(player, 0, 'Q')}
          ${paperAbilityRow(player, 1, 'R')}
          ${paperAbilityRow(player, 2, 'X')}
          ${paperAbilityRow(player, 3, '4 / LB')}
        </div>
        ${(player.summons||[]).some(s=>s.alive!==false)?`<div class="sheet-section-title">Active Summons</div>${player.summons.filter(s=>s.alive!==false).map(s=>`<div class="stat-row"><span>${escapeHtml(s.displayName||summonName(s.kind))}</span><b>${Math.ceil(s.hp||0)}/${Math.ceil(s.maxHp||1)} HP</b></div>`).join('')}`:''}
      </div>

      <div class="character-stat-detail" data-character-stat-detail>
        ${renderCharacterStatDetail(selectedStat, selectedStatValue)}
      </div>
    </div>
  `;
}

function bloodlineModifierSummary(bloodline) {
 const labels={abilityDamagePct:'Bloodline ability damage',fireDamagePct:'Fire damage',holyDamagePct:'Holy damage',necroticDamagePct:'Necrotic damage',healingReceivedPct:'Healing received',incomingDamageTakenPct:'Incoming damage',lifestealPct:'Lifesteal'};
 return Object.entries(bloodline.modifiers||{}).map(([key,value])=>`${labels[key]||prettyId(key)} ${value>0?'+':''}${value}%`).join(' · ');
}

function progressionMiniCard(label, value, subtext) {
  return `
    <div class="progression-mini-card">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
      <small>${escapeHtml(subtext || '')}</small>
    </div>
  `;
}

function sheetStat(label, value) {
  return `
    <button type="button" class="sheet-stat" data-character-stat="${escapeHtml(label)}" data-character-stat-value="${escapeHtml(value)}">
      <i>${escapeHtml(statGlyph(label))}</i>
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
    </button>
  `;
}

function statGlyph(label) {
  const glyphs = {
    'Level': 'LV',
    'Combat Rank': 'CR',
    Hitpoints: 'HP',
    Defence: 'DF',
    Stamina: 'ST',
    'Weapon Skill': 'WS',
    Power: 'PW',
    Armour: 'AR',
    'Weapon Damage': 'DM',
    Gold: 'AU',
    'Highest Combat Skill': 'HS',
    'Favoured XP Bonus': 'XP',
    'Equipped Value': 'EV',
    'Inventory Value': 'IV'
  };
  return glyphs[label] || 'ST';
}

function getCharacterStatValue(label, context) {
  const values = {
    'Level': context.progression.combatLevel,
    'Combat XP': `${Math.floor(context.progression.combatProgress.xp)} / ${Math.ceil(context.progression.combatProgress.next)}`,
    Spirit: getSkillLevel(context.player.skillState,'spirit'),
    Summoning: getSkillLevel(context.player.skillState,'summoning'),
    'Combat Rank': context.progression.combatRank,
    Hitpoints: context.progression.hitpointsLevel,
    Defence: context.progression.defenceLevel,
    Stamina: context.progression.staminaLevel,
    'Weapon Skill': `${context.progression.weaponSkillName} ${context.progression.weaponSkillLevel}`,
    Power: Math.floor(getPower(context.player)),
    Armour: Math.floor(getArmour(context.player)),
    'Weapon Damage': context.weaponDamage,
    Gold: context.player.gold || 0,
    'Highest Combat Skill': context.highestCombatText,
    'Favoured XP Bonus': '+25%',
    'Equipped Value': `${context.equippedValue} Ash`,
    'Inventory Value': `${context.inventoryValue} Ash`
  };
  return values[label] ?? '';
}

function renderCharacterStatDetail(label, value) {
  const descriptions = {
    'Level': 'Earn XP from qualifying enemy victories. Each level gained grants 1 skill point and improves weapons, spells, protection, and companions alongside proficiency and mastery.',
    'Combat Rank': 'A descriptive title for your Level; it grants no separate stat bonus.',
    'Combat XP': 'Victory XP raises your Level and trains every skill on your hotbar. Fill the bar to gain the next Level.',
    Spirit: 'Raises your Spirit reserve and magical power. Spirit pays for spells and companion calls.',
    Summoning: 'Improves companion health, damage and protection. Train it through useful companion participation in combat.',
    Hitpoints: 'Raises maximum health and your ability to survive committed fights.',
    Defence: 'Improves armour effectiveness and steadiness under pressure.',
    Stamina: 'Supports attacks, sprinting, blocking, and evasive movement.',
    'Weapon Skill': 'Your strongest trained weapon discipline and its current level.',
    Power: 'A summary of offensive strength from character progression and gear. Each weapon or ability also uses its own proficiency and mastery.',
    Armour: 'Reduces incoming physical pressure before other defensive effects.',
    'Weapon Damage': 'Strike power from your weapon, tier, Level and proficiency. Light/heavy combinations, target defenses and combat bonuses change the final hit.',
    Gold: 'Ash Coins carried for markets, upgrades, and travel.',
    'Highest Combat Skill': 'The combat discipline you have trained most deeply.',
    'Favoured XP Bonus': 'Your two affinities earn 25% additional XP after encounter allocation. They do not change combat strength.',
    'Equipped Value': 'Combined market value of currently equipped gear.',
    'Inventory Value': 'Combined market value of items carried in the inventory.'
  };

  return `
    <span>${escapeHtml(statGlyph(label))}</span>
    <div>
      <small>Selected Stat</small>
      <h3>${escapeHtml(label)} <b>${escapeHtml(value)}</b></h3>
      <p>${escapeHtml(descriptions[label] || 'A current character statistic.')}</p>
    </div>
  `;
}

function updateCharacterStatPreview(game) {
  const selected = document.querySelector(`[data-character-stat="${cssEscape(game?.uiState?.selectedCharacterStat || '')}"]`);
  const pane = document.querySelector('[data-character-stat-detail]');
  if (!pane || !selected) return;

  document.querySelectorAll('[data-character-stat]').forEach(button => {
    button.classList.toggle('active', button === selected);
  });
  pane.innerHTML = renderCharacterStatDetail(selected.dataset.characterStat, selected.dataset.characterStatValue);
}

function paperEquipmentRow(player, slot, label) {
  const itemId = player.equipment?.[slot];
  const item = itemId ? ITEMS[itemId] : null;
  const rarity = item ? RARITY?.[item.rarity] : null;
  const color = rarity?.color || '#aeb8ca';

  return `
    <div class="paper-row">
      <span>${escapeHtml(label)}</span>
      <b style="color:${color}">${item ? escapeHtml(item.name) : 'Empty'}</b>
    </div>
  `;
}

function paperAbilityRow(player, index, key) {
  const id = player.loadout?.abilitySlots?.[index];
  const ability = id ? getAbilityById(id) : null;

  if (!ability) {
    return `
      <div class="paper-row">
        <span>${escapeHtml(key)}</span>
        <b>Empty</b>
      </div>
    `;
  }

  return `
    <div class="paper-row">
      <span>${escapeHtml(key)}</span>
      <b>${escapeHtml(ability.name)}</b>
    </div>
  `;
}

function paperSkillRow(player, skillId) {
  const progress = getSkillProgress(player.skillState, skillId);
  const boosted = getClassAffinities(player).includes(skillId);

  return `
    <div class="paper-skill-row ${boosted ? 'boosted' : ''}">
      <div class="stat-row">
        <span>${escapeHtml(skillLabel(skillId))}</span>
        <b>Level ${progress.level}</b>
      </div>
      ${bar('', progress.xp, progress.next, boosted ? 'gold' : '')}
      ${boosted ? `<p class="tag gold">Favoured +25%</p>` : ''}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// SKILLS
// -----------------------------------------------------------------------------

function renderLastReward(player) {
  const reward=player.lastCombatReward;
  if(!reward)return '';
  return `<div class="card"><h3>Last Victory · ${escapeHtml(reward.enemyName)}</h3><p>Combat XP +${reward.combatXP} · Training budget ${reward.allocationBudget}</p><p>${reward.awards.map(a=>`${escapeHtml(skillLabel(a.skillId))} +${a.amount.toFixed(1)}`).join(' · ')}</p><p class="tag">Affinity bonuses are included. Weapon use and useful abilities shape your training.</p></div>`;
}

function renderSkills(player, game) {
  const el = document.getElementById('skills');
  if (!el) return;

  const requested = game.uiState.skillsSubtab || 'trees';
  const subtab = ['trees','abilities'].includes(requested) ? requested : 'progression';
  game.uiState.skillsSubtab = subtab;
  el.dataset.skillsSubtab = subtab;
  const definitions = getAllSkillDefinitions();
  const groups = [
    {title:'Core Attributes',skills:CORE_ATTRIBUTES.map(id=>definitions.find(s=>s.id===id)).filter(Boolean)},
    {title:'Combat Proficiencies',skills:COMBAT_PROFICIENCIES.map(id=>definitions.find(s=>s.id===id)).filter(Boolean)},
    ...['gathering','production','world'].map(type=>({title:prettyId(type),skills:definitions.filter(s=>s.type===type)}))
  ];
  el.innerHTML = `
    <div class="subtab-bar skills-sheet-tabs">
      <button class="subtab ${subtab === 'trees' ? 'active' : ''}" data-skills-subtab="trees">Skill Trees</button>
      <button class="subtab ${subtab === 'abilities' ? 'active' : ''}" data-skills-subtab="abilities">Abilities</button>
      <button class="subtab ${subtab === 'progression' ? 'active' : ''}" data-skills-subtab="progression">Progression</button>
      <span class="progression-bumper-hint">LB / RB Switch</span>
    </div>
    ${subtab === 'progression' ? skillSection('Progression',definitions,player,game,groups) : ''}
    ${subtab === 'abilities' ? abilitySheet(player,game) : ''}
    ${subtab === 'trees' ? skillTreeSheet(player,game) : ''}
  `;
}

function skillTreeSheet(player, game) {
  if (isClasslessPlayer(player)) {
    return classlessSkillTreeSheet(player,game);
  }

  const earned = getEarnedSkillTreePoints(player);
  const spent = getSpentSkillTreePoints(player);
  const available = getAvailableSkillTreePoints(player);
  const bloodline = getPlayerBloodline(player);
  const selectedTree = resolveSelectedSkillTree(player, game);
  const treeLayout = getSkillTreeLayout(selectedTree);
  const selectedNode = resolveSelectedSkillTreeNode(player, game, selectedTree);
  const selectedTreeInfo = getSkillTreeInfo(player, selectedTree);

  return `
    <div class="skill-tree-workspace">
      <header class="skill-tree-compact-head">
        <div>
          <small>Selected Discipline</small>
          <h2>${escapeHtml(selectedTreeInfo.title)}</h2>
          <p>${escapeHtml(selectedTreeInfo.subtitle)}</p>
        </div>
        <div class="skill-tree-status-chips">
          <span><b>${available}</b> Available</span>
          <span>${spent}/${earned} Spent</span>
          <span>${bloodline ? escapeHtml(bloodline.name) : 'Human'}</span>
        </div>
      </header>

      <p class="tag">Gain 1 skill point each level. Discipline training and bloodlines can grant bonus points.</p>

      ${renderSubclassTreeChoice(player,game)}
      <nav class="skill-tree-path-list" aria-label="Skill tree paths">
        <div class="compact-path-group">
          <span>Class</span>
          ${getVisibleCoreSkillTreeOrder(player).map(tree => skillTreePathButton(player, tree, selectedTree)).join('')}
        </div>
        <div class="compact-path-group">
          <span>Bloodline</span>
          ${getVisibleBloodlineSkillTreeOrder(player).length
            ? getVisibleBloodlineSkillTreeOrder(player).map(tree => skillTreePathButton(player, tree, selectedTree)).join('')
            : '<p class="tag">No awakened bloodline.</p>'}
        </div>
        <div class="compact-path-group">
          <span>Weapons</span>
          ${getAvailableWeaponSkillTrees(player).length
            ? getAvailableWeaponSkillTrees(player).map(tree => skillTreePathButton(player, tree, selectedTree)).join('')
            : '<p class="tag">Carry a weapon to reveal its mastery line.</p>'}
        </div>
      </nav>

      <div class="skill-tree-stage">
        <section class="skill-tree-node-index tree-${selectedTree}" aria-label="${escapeHtml(selectedTreeInfo.title)} tree">
          ${renderSkillTreeGraph(player, treeLayout, selectedNode?.id,game.uiState.mobileTreeFeedback)}
        </section>
        <aside class="skill-tree-detail-pane" data-skill-tree-detail>
          ${renderSkillTreeNodeDetail(player, selectedNode, selectedTree)}
        </aside>
      </div>
    </div>
  `;
}

function classlessSkillTreeSheet(player,game) {
  const weaponTrees = getAvailableWeaponSkillTrees(player);
  const bloodline = getPlayerBloodline(player);
  const earned = getEarnedSkillTreePoints(player);
  const spent = getSpentSkillTreePoints(player);
  const available = getAvailableSkillTreePoints(player);

  return `
    <div class="skill-tree-workspace">
      <header class="skill-tree-compact-head">
        <div>
          <small>Selected Discipline</small>
          <h2>Classless</h2>
          <p>Classless has no class skill tree or class passive. Blades and Stamina earn 25% extra XP; ordinary disciplines and learned scrolls are available.</p>
        </div>
        <div class="skill-tree-status-chips">
          <span><b>${available}</b> Available</span>
          <span>${spent}/${earned} Spent</span>
          <span>No Class Tree</span>
        </div>
      </header>
      <p class="tag">Gain 1 skill point each level. Points are kept if you later choose a class.</p>
      ${renderSubclassTreeChoice(player,game)}

      <nav class="skill-tree-path-list" aria-label="Skill tree paths">
        <div class="compact-path-group">
          <span>Class</span>
          <p class="tag">No class tree. No class nodes can be learned.</p>
        </div>
        <div class="compact-path-group">
          <span>Bloodline</span>
          <p class="tag">${bloodline ? `${escapeHtml(bloodline.name)} remains separate from class choice.` : 'No awakened bloodline.'}</p>
        </div>
        <div class="compact-path-group">
          <span>Weapons</span>
          <p class="tag">${weaponTrees.length ? 'Weapon mastery still improves through normal combat practice.' : 'Carry and use weapons to progress normally.'}</p>
        </div>
      </nav>

      <div class="skill-tree-stage">
        <section class="skill-tree-node-index tree-classless" aria-label="Classless tree">
          <div class="card">
            <h2>No Class Tree</h2>
            <p class="tag">You are not an order, discipline, bloodline, or calling. Your growth comes from gear, crafting, gathering, quests, and ordinary combat practice.</p>
          </div>
        </section>
        <aside class="skill-tree-detail-pane" data-skill-tree-detail>
          <h3>Classless</h3>
          <p class="tag">No class nodes or class passives. Blades and Stamina earn 25% extra XP. Learn universal techniques from scrolls.</p>
        </aside>
      </div>
    </div>
  `;
}

function isClasslessPlayer(player) {
  return normalizeClassId(player?.classId) === 'classless';
}

function resolveSelectedSkillTree(player, game) {
  if (isClasslessPlayer(player)) {
    game.uiState.selectedSkillTreeId = 'classless';
    game.uiState.selectedSkillTreeNodeId = null;
    return 'classless';
  }

  const preferred = game?.uiState?.selectedSkillTreeId;
  const classTree = player?.skillTree?.lockedTree || player?.classSkill || 'blade';
  const valid = getVisibleSkillTreeOrder(player);

  if (preferred && valid.includes(preferred)) return preferred;

  game.uiState.selectedSkillTreeId = valid.includes(classTree) ? classTree : valid[0] || 'blade';
  return game.uiState.selectedSkillTreeId;
}

function getVisibleCoreSkillTreeOrder(player) {
  if (isClasslessPlayer(player)) return [];

  const locked = player?.skillTree?.lockedTree;
  if (locked && CORE_SKILL_TREE_ORDER.includes(locked)) return [locked];
  return CORE_SKILL_TREE_ORDER.filter(tree => {
    if (tree === 'eldritch') return player?.classId === 'eldritch';
    if (tree === 'lightbringer') return player?.classId === 'lightbringer';
    return true;
  });
}

function getVisibleBloodlineSkillTreeOrder(player) {
  const bloodlineId = getPlayerBloodline(player)?.id;
  return bloodlineId && BLOODLINE_SKILL_TREE_ORDER.includes(bloodlineId) ? [bloodlineId] : [];
}

function getVisibleSkillTreeOrder(player) {
  return [
    ...getVisibleCoreSkillTreeOrder(player),
    ...getVisibleBloodlineSkillTreeOrder(player),
    ...getAvailableWeaponSkillTrees(player)
  ];
}

function resolveSelectedSkillTreeNode(player, game, tree) {
  const nodes = getSkillTreeLayout(tree).nodes;
  const remembered = game?.uiState?.selectedSkillTreeNodeByTree?.[tree];
  const preferred = game?.uiState?.selectedSkillTreeNodeId || remembered;
  const found = preferred ? nodes.find(node => node.id === preferred) : null;
  const fallback =
    nodes.find(node => !isSkillTreeNodeUnlocked(player, node.id) && canSpendSkillTreeNode(player, node.id).ok) ||
    nodes.find(node => isSkillTreeNodeUnlocked(player, node.id)) ||
    nodes[0] ||
    null;

  game.uiState.selectedSkillTreeNodeId = found?.id || fallback?.id || null;
  rememberSelectedSkillTreeNode(game, tree, game.uiState.selectedSkillTreeNodeId);
  return found || fallback;
}

function getSkillTreeInfo(player, tree) {
  if (WEAPON_SKILL_TREE_ORDER.includes(tree)) {
    return {
      title: skillTreeLabel(tree),
      subtitle: 'Weapon mastery remains learned even when another weapon is equipped.'
    };
  }

  const bloodlineDefinition = BLOODLINE_DEFINITIONS[tree];

  if (bloodlineDefinition) {
    const active = getPlayerBloodline(player);

    return {
      title: bloodlineDefinition.name,
      subtitle: active?.id === tree
        ? bloodlineDefinition.theme
        : active
          ? `Locked by ${active.name}.`
          : 'Hidden Act I rite. Complete this race quest to unlock the tree.'
    };
  }

  const locked = player?.skillTree?.lockedTree;

  return {
    title: skillTreeLabel(tree),
    subtitle: locked === tree
      ? (getPlayerExpertise(player)?.name||'Choose your final Expertise after the capstone.')
      : locked
        ? `Locked by ${skillLabel(locked)} class choice.`
        : 'Available class path.'
  };
}

function skillTreePathButton(player, tree, selectedTree) {
  const allowed = canTreeEverBeActive(player, tree);
  const learnedCount = getSkillTreeNodesByTree(tree).filter(node => isSkillTreeNodeUnlocked(player, node.id)).length;
  const label = skillTreeLabel(tree);

  return `
    <button
      type="button"
      class="compact-path-button ${selectedTree === tree ? 'active' : ''} ${allowed ? '' : 'locked'}"
      data-skill-tree-select="${escapeHtml(tree)}"
    >
      <i>${escapeHtml(compactMenuGlyph(label))}</i>
      <b>${escapeHtml(label)}</b>
      <span>${learnedCount ? `${learnedCount} learned` : allowed ? 'Open' : 'Locked'}</span>
    </button>
  `;
}

function skillTreeLabel(tree) {
  return {blade:'Oathkeeper',archery:'Fellhunter',spirit:'Gravecaller',warding:'Thornbinder',hydromancy:'Waverider',lightbringer:'Lightbringer',eldritch:'Eldritch',spiritFocus:'Focus Mastery'}[tree] || skillLabel(tree);
}

function canTreeEverBeActive(player, tree) {
  if (WEAPON_SKILL_TREE_ORDER.includes(tree)) {
    return getAvailableWeaponSkillTrees(player).includes(tree);
  }

  if (BLOODLINE_SKILL_TREE_ORDER.includes(tree)) {
    return getPlayerBloodline(player)?.id === tree;
  }

  return !player?.skillTree?.lockedTree || player.skillTree.lockedTree === tree;
}

function skillTreeNodeListButton(player, node, selectedNodeId, layout) {
  node=getSubclassTreeNode(player,node);
  const learned = isSkillTreeNodeUnlocked(player, node.id);
  const check = canSpendSkillTreeNode(player, node.id);
  const branchBlocked = !check.ok && /^Choice locked/i.test(check.reason || '');
  const state = learned ? 'learned' : check.ok ? 'available' : branchBlocked ? 'blocked' : 'locked';

  return `
    <button
      type="button"
      class="compact-node-button ${selectedNodeId === node.id ? 'active' : ''} ${state} node-type-${escapeHtml(node.type || 'passive')}"
      data-select-skill-tree-node="${escapeHtml(node.id)}"
      data-tree-row="${Number(node.position?.row || 0)}"
      data-tree-column="${Number(node.position?.column || 0)}"
      data-prerequisites="${escapeHtml((node.requires||[]).join(' '))}"
      aria-pressed="${selectedNodeId === node.id}"
      aria-label="${escapeHtml(`${node.name}. ${node.expertise?'Final Expertise':node.unlocksAbility?'Active skill':'Passive'}. ${learned?'Learned':check.reason}. ${node.cost} points.`)}"
      title="${escapeHtml(node.name+(node.choiceGroup?' · Exclusive branch choice':'')+(!document.body.classList.contains('mobile-input')?' · Double-click to learn':''))}"
      style="left:${node.position.x/layout.width*100}%;top:${node.position.y/layout.height*100}%;width:${140/layout.width*100}%;height:${54/layout.height*100}%"
    >
      <i title="${escapeHtml(skillTreeNodeTypeGlyph(node))}">${getPlayerSubclass(player)&&node.tree===player.skillTree?.lockedTree?subclassSkillIcon(player,skillTreeIconMarkup(node)):skillTreeIconMarkup(node)}</i>
      <span class="tree-node-name">${escapeHtml(node.name)}</span>
      <b>${learned ? '✓ Learned' : `${node.expertise?'Expertise':node.unlocksAbility?'Active':'Passive'} · ${node.cost} pt`}</b>
      ${node.choiceGroup?'<em class="tree-choice-mark" aria-label="Exclusive branch choice">◇</em>':''}
    </button>
  `;
}

function skillTreeNodeTypeGlyph(node) {
  if (node.expertise) return 'EXP';
  if (node.type === 'capstone') return 'CAP';
  if (node.unlocksAbility) return 'ACT';
  if (node.choiceGroup) return 'BR';
  if (node.requirementMode === 'any') return 'MRG';
  return 'PAS';
}

function renderSkillTreeGraph(player, layout, selectedNodeId, feedback='') {
  const nodes=new Map(layout.nodes.map(node=>[node.id,node]));
  const connections=layout.connections.map(edge=>{
    const from=nodes.get(edge.from).position,to=nodes.get(edge.to).position;
    const y1=from.y+27,y2=to.y-27,mid=(y1+y2)/2;
    // Skip-level links follow the lane gutter, never through an intervening card.
    const path=to.row-from.row>1
      ? `M${from.x} ${y1} V${y1+10} H30 V${y2-10} H${to.x} V${y2}`
      : `M${from.x} ${y1} V${mid} H${to.x} V${y2}`;
    const learned=isSkillTreeNodeUnlocked(player,edge.to);
    const ready=isSkillTreeNodeUnlocked(player,edge.from);
    return `<path class="tree-edge ${learned?'learned':ready?'ready':''} ${edge.merge?'either':''} ${edge.to===selectedNodeId?'selected':''}" data-tree-from="${escapeHtml(edge.from)}" data-tree-to="${escapeHtml(edge.to)}" d="${path}"/><path class="tree-arrow" d="M${to.x-3} ${y2-5} L${to.x} ${y2} L${to.x+3} ${y2-5}"/>`;
  }).join('');
  return `
    <p class="mobile-tree-tip">Tap a skill for its description. Double-tap the same skill to learn it using skill points. Close the description to return to the tree.</p>
    ${feedback?`<p class="mobile-tree-tip" role="status">${escapeHtml(feedback)}</p>`:''}
    <div class="tree-reading-key"><span>START AT THE TOP · FOLLOW THE ARROWS</span><span><i class="key-learned"></i> Learned <i class="key-ready"></i> Available <i class="key-either"></i> Either prerequisite · ◇ Exclusive choice</span></div>
    <div class="branching-skill-tree prerequisite-tree" data-branching-skill-tree="${escapeHtml(layout.tree)}" style="--tree-rows:${layout.rowCount};--tree-columns:${layout.columnCount}">
      <svg class="tree-connections" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="none" aria-hidden="true">${connections}</svg>
      <span class="tree-foundation-heading" style="left:${(40+(layout.columnCount-.5)*156)/layout.width*100}%;top:${40/layout.height*100}%;width:${140/layout.width*100}%">FOUNDATIONS<small>Optional passives</small></span>
      ${Array.from({length:layout.rowCount},(_,row)=>`<span class="tree-tier" style="top:${(row*80+40)/layout.height*100}%" title="Prerequisite tier ${row+1}">${String(row+1).padStart(2,'0')}</span>`).join('')}
      ${layout.nodes.map(node=>skillTreeNodeListButton(player,node,selectedNodeId,layout)).join('')}
    </div>
    <div class="tree-footnote">${layout.nodes.length} skills · ${layout.nodes.filter(n=>!n.unlocksAbility).length} passives <span>${layout.nodes.some(n=>n.expertise)?'Final row: choose one Expertise · respec to change.':'Foundations: four optional passives in the right-hand branch.'}</span></div>
  `;
}

function renderSkillTreeNodeDetail(player, node, tree) {
  node=getSubclassTreeNode(player,node);
  if (!node) {
    return `
      <h3>${escapeHtml(skillLabel(tree))}</h3>
      <p class="tag">No nodes available yet.</p>
    `;
  }

  const learned = isSkillTreeNodeUnlocked(player, node.id);
  const check = canSpendSkillTreeNode(player, node.id);
  const bonusLines = describeSkillTreeBonuses(node.bonuses);
  const exclusiveNames = (node.mutuallyExclusiveWith || [])
    .map(nodeId => getSkillTreeNodesByTree(tree).find(candidate => candidate.id === nodeId)?.name || nodeId);
  const learnedExclusive = (node.mutuallyExclusiveWith || [])
    .map(nodeId => getSkillTreeNodesByTree(tree).find(candidate => candidate.id === nodeId))
    .find(candidate => candidate && isSkillTreeNodeUnlocked(player, candidate.id));
  const modifiesAbilityCharges = Object.keys(node.bonuses || {}).some(key => {
    return key.startsWith('abilityCharge_') || key.startsWith('abilityRechargePct_');
  });

  return `
    <button type="button" class="mobile-tree-close" data-mobile-tree-close>Close description ×</button>
    <div class="skill-node-detail-scroll">
    <div class="detail-title-row skill-node-detail-title">
      <i>${escapeHtml(skillTreeNodeTypeGlyph(node))}</i>
      <div>
        <h3>${escapeHtml(node.name)}</h3>
        ${node.role ? `<p class="tag gold">${escapeHtml(node.role)}</p>` : ''}
      </div>
      <b>${learned ? 'Learned' : `${node.cost} point${node.cost === 1 ? '' : 's'}`}</b>
    </div>
    ${treeNodeDescription(player,node)?`<p class="detail-copy skill-node-detail-copy">${escapeHtml(treeNodeDescription(player,node))}</p>`:''}
    ${node.unlocksAbility?renderAbilityFacts(player,applyMythicalAbilityModifiers(player,applyAbilityMastery(player,getAbilityById(node.unlocksAbility)))):''}
    <div class="tree-bonus-list compact detail-bonus-list">
      ${bonusLines.map(text => `<span>${escapeHtml(text)}</span>`).join('')}
      ${node.expertise?`<span>${escapeHtml(node.expertiseNote)}</span>`:!node.unlocksAbility?'<span>Permanent bonus</span>':''}

      ${modifiesAbilityCharges ? `<span>Extra uses and faster recovery apply to cooldown skills</span>` : ''}
    </div>
    <div class="skill-node-requirements">
      <span>Status <b>${learned ? 'Active' : escapeHtml(check.reason)}</b></span>
      ${(node.requires || []).length ? `<span>${node.requirementMode === 'any' ? 'Requires either' : 'Requires'} <b>${node.requires.map(req => SKILL_TREE_NODE_NAME(req)).join(node.requirementMode === 'any' ? ' or ' : ', ')}</b></span>` : ''}
      ${exclusiveNames.length ? `<span>Exclusive choice <b>${node.expertise?'Other Expertise choices':escapeHtml(exclusiveNames.join(' or '))} will be locked</b></span>` : ''}
      ${learnedExclusive ? `<span>Locked by choice <b>${escapeHtml(learnedExclusive.name)}</b></span>` : ''}
    </div>
    </div>
    <button
      type="button"
      class="primary tree-learn-button"
      data-skill-tree-node="${escapeHtml(node.id)}"
      ${learned || !check.ok ? 'disabled' : ''}
    >${learned ? 'Learned' : node.expertise ? 'Choose Expertise' : 'Learn Node'}</button>
  `;
}

function treeNodeDescription(player,node){
 if(node.unlocksAbility)return abilitySummary(applyMythicalAbilityModifiers(player,applyAbilityMastery(player,getAbilityById(node.unlocksAbility))),player);
 const text=String(node.desc||'');
 if(!Object.keys(node.bonuses||{}).length)return text;
 return text.split(/(?<=[.!?])\s+/).filter(sentence=>!/^\+\d/.test(sentence)&&!/^Opens /.test(sentence)&&!((node.mutuallyExclusiveWith||[]).length&&/^Locks /.test(sentence))).join(' ');
}

function SKILL_TREE_NODE_NAME(nodeId) {
  for (const tree of [...CORE_SKILL_TREE_ORDER, ...BLOODLINE_SKILL_TREE_ORDER, ...WEAPON_SKILL_TREE_ORDER]) {
    const node = getSkillTreeNodesByTree(tree).find(candidate => candidate.id === nodeId);
    if (node) return escapeHtml(node.name);
  }

  return escapeHtml(nodeId);
}

function closeMobileTreeDetail(game){
  clearTimeout(game.mobileTreeTap?.timer);
  game.mobileTreeTap=null;
  document.querySelector('[data-skill-tree-detail]')?.classList.remove('mobile-tree-detail-open');
}

function bindMobileTreeDetail(game){
  document.querySelector('[data-mobile-tree-close]')?.addEventListener('click',()=>closeMobileTreeDetail(game));
}

function updateSkillTreePreview(player, game) {
  const pane = document.querySelector('[data-skill-tree-detail]');
  if (!pane) return;

  const tree = resolveSelectedSkillTree(player, game);
  const node = resolveSelectedSkillTreeNode(player, game, tree);

  document.querySelectorAll('[data-skill-tree-select]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.skillTreeSelect === tree);
  });

  document.querySelectorAll('[data-select-skill-tree-node]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.selectSkillTreeNode === node?.id);
    btn.setAttribute('aria-pressed',String(btn.dataset.selectSkillTreeNode === node?.id));
    btn.classList.toggle('is-prerequisite',(node?.requires||[]).includes(btn.dataset.selectSkillTreeNode));
  });
  document.querySelectorAll('[data-tree-to]').forEach(edge=>edge.classList.toggle('selected',edge.dataset.treeTo===node?.id));

  pane.innerHTML = renderSkillTreeNodeDetail(player, node, tree);
  bindMobileTreeDetail(game);

  pane.querySelectorAll('[data-skill-tree-node]').forEach(btn => {
    btn.onclick = () => {
      const result = spendSkillTreeNodeFromUi(game, player, btn.dataset.skillTreeNode);
      if (!result.pending) {
        logSkillTreeSpendResult(game, result);
      }
      renderUI(player, game.logLines || [], game);
    };
  });
}

function skillSection(title, skills, player, game, groups = null) {
  const selected =
    skills.find(skill => skill.id === game?.uiState?.selectedSkillId) ||
    skills.find(skill => hasUsedSkill(player.skillState, skill.id)) ||
    skills[0] ||
    null;

  if (selected && game?.uiState) game.uiState.selectedSkillId = selected.id;

  return `
    <div class="world-skill-browser">
      <section class="world-skill-index">
        ${groups ? `<p class="tag">Level ${getCombatLevelProgress(player).level} · ${Math.floor(getCombatLevelProgress(player).xp)} / ${Math.ceil(getCombatLevelProgress(player).next)} XP</p>` : ''}
        ${groups ? groups.map(group=>`<div class="menu-section-heading"><span>${group.title}</span></div><div class="world-skill-list">${group.skills.map(skill=>skillCard(skill,player,selected?.id)).join('')}</div>`).join('') : `
        <div class="menu-section-heading">
          <span>${escapeHtml(title)}</span>
          <b>${skills.length} Disciplines</b>
        </div>
        <div class="world-skill-list">
          ${skills.map(skill => skillCard(skill, player, selected?.id)).join('')}
        </div>
        `}
      </section>
      <section class="world-skill-detail" data-skill-detail>
        ${renderSkillDetail(selected, player)}
      </section>
    </div>
  `;
}

function skillCard(skill, player, selectedId) {
  const progress = getSkillProgress(player.skillState, skill.id);
  const status = getSkillDisplayStatus(player.skillState, skill.id);
  const used = hasUsedSkill(player.skillState, skill.id);
  const boosted = getClassAffinities(player).includes(skill.id);

  return `
    <button type="button" class="world-skill-row ${selectedId === skill.id ? 'active' : ''} ${used ? 'used' : 'unused'} ${boosted ? 'boosted' : ''}" data-select-skill-id="${escapeHtml(skill.id)}">
      <i>${escapeHtml(skillGlyph(skill.id))}</i>
      <div>
        <span>${escapeHtml(skill.name)}</span>
        <small>${boosted ? 'Favoured +25%' : escapeHtml(skill.type || 'Skill')}</small>
      </div>
      <b>${escapeHtml(status)}</b>
      <em style="--skill-progress:${Math.max(0, Math.min(100, progress.xp / Math.max(1, progress.next) * 100))}%"></em>
    </button>
  `;
}

function renderSkillDetail(skill, player) {
  if (!skill) return '<h3>No Skill Selected</h3><p class="tag">Select a discipline to inspect its progression.</p>';
  const progress = getSkillProgress(player.skillState, skill.id);
  const boosted = getClassAffinities(player).includes(skill.id);

  return `
    <div class="world-skill-detail-head">
      <i>${escapeHtml(skillGlyph(skill.id))}</i>
      <div>
        <small>${escapeHtml(skill.type || 'Skill')} Discipline</small>
        <h2>${escapeHtml(skill.name)}</h2>
        <p>${escapeHtml(skill.description || '')}</p>
      </div>
      <strong>Level ${progress.level}</strong>
    </div>
    <div class="world-skill-progress">
      <span><b>${Math.floor(progress.xp)}</b> / ${Math.floor(progress.next)} XP</span>
      ${bar('', progress.xp, progress.next, boosted ? 'gold' : '')}
    </div>
    <div class="world-skill-unlocks">
      <small>What training improves</small>
      ${worldSkillPerks(skill.id)}
    </div>
    ${CORE_ATTRIBUTES.includes(skill.id)||COMBAT_PROFICIENCIES.includes(skill.id) ? renderLastReward(player) : ''}
  `;
}

function skillGlyph(skillId) {
  const glyphs = {
    blunt: 'BT', blade: 'BL', archery: 'AR', spirit: 'SP', warding: 'WD',
    defence: 'DF', hitpoints: 'HP', stamina: 'ST',
    foraging: 'FO', mining: 'MI', fishing: 'FI', woodcutting: 'WC',
    crafting: 'CR', cooking: 'CO', runecraft: 'RU', renown: 'RN'
  };
  return glyphs[skillId] || String(skillId || 'SK').slice(0, 2).toUpperCase();
}

function updateSkillDetailPreview(player, game) {
  const skill = getAllSkillDefinitions().find(candidate => candidate.id === game?.uiState?.selectedSkillId);
  const pane = document.querySelector('[data-skill-detail]');
  if (!pane || !skill) return;

  document.querySelectorAll('[data-select-skill-id]').forEach(button => {
    button.classList.toggle('active', button.dataset.selectSkillId === skill.id);
  });
  pane.innerHTML = renderSkillDetail(skill, player);
}

function worldSkillPerks(skillId) {
  const perks = {
    hitpoints:['Raises maximum health','Trains through qualifying combat victories'],
    stamina:['Raises maximum Stamina','Used for attacks, sprinting, blocking and dodging'],
    defence:['Raises armour and protective skill potency'],
    spirit:['Raises maximum Spirit and magical power','Also strengthens wolf and demon companions'],
    focus:['Faster magical charge buildup, up to 12%','Lower sustained channel costs, up to 12%'],
    dexterity:['Faster weapon cadence, up to 12%','Lower dodge cost, up to 15%'],
    blunt:['Crushing mace and hammer damage','Also strengthens Oathkeeper techniques; +25% XP for Oathkeepers'],
    blade:['Controlled melee damage growth','Train with blades, staves, axes, and spears'],
    archery:['Controlled ranged damage growth','Train through real bow and ranged technique contribution'],
    scythe:['Raises scythe damage','Train with scythe attacks'],
    warding:['Controlled shield and healing potency','Useful protection and control shape encounter training'],
    summoning:['Raises companion health, damage and armour','Summon skills gain mastery while on your hotbar whenever you earn XP'],
    foraging: ['Higher material yield and better rare-find odds', 'Level 5: Gravecap can yield Pale Essence', 'Level 8 plus a foraging tool: rare roots and herbs'],
    mining: ['Higher material yield and better rare-find odds', 'Level 6 plus a mining tool: magical crystals', 'Level 10 plus a Tier 3 tool: Deepstone and Hollow Gems'],
    fishing: ['Better rare-fish odds; rods and tackle also help', 'Level 8 plus a Tier 2 rod: Tideglass Koi', 'Level 10 plus a Tier 3 rod: Pale Kingfin'],
    woodcutting: ['Higher wood yield and better resin odds', 'Level 6 plus a woodcutting tool: Spiritwood and rare timber', 'Level 10 plus a Tier 3 tool: Briarheart Timber and Black Sap'],
    crafting: ['Unlocks tool and gear recipes; each recipe lists its required level', 'Train by crafting or salvaging spare equipment'],
    cooking: ['Unlocks food recipes; each meal lists its healing or temporary buffs', 'Train by preparing meals from gathered ingredients'],
    runecraft: ['Unlocks Spirit crafting recipes at their listed levels', 'Level 18 allows bonus Arcane Dust from gathering'],
    renown: ['Tracks reputation earned through quests, discoveries and major victories']
  }[skillId];

  if (!perks) {
    return `
      <div class="tree-bonus-list compact">
        <span>Improves through active use</span>
        <span>Contributes to long-term character growth</span>
      </div>
    `;
  }

  const visible = perks;

  return `
    <div class="tree-bonus-list compact">
      ${visible.map(perk => `<span>${escapeHtml(perk)}</span>`).join('')}
    </div>
  `;
}

function abilitySheet(player, game) {
  const known = getAbilityLibrary(player);
  const categories = ['all',...new Set(known.map(getAbilityCategory)), ...new Set(known.filter(a=>a.role).map(a=>a.role))];
  const requestedCategory = game.uiState.abilityCategory || 'all';
  const category = categories.includes(requestedCategory) ? requestedCategory : 'all';
  game.uiState.abilityCategory = category;
  const visible = category === 'all' ? known : known.filter(ability => abilityLibraryMatches(player,ability,category));
  const selected = visible.find(ability => ability.id === game.uiState.selectedAbilityId) || visible[0] || null;
  game.uiState.selectedAbilityId = selected?.id || null;
  const pending = known.find(ability=>ability.id===game.uiState.pendingAbilityId) || null;
  const assignmentMode = !!(game.uiState.abilityAssignmentMode && pending);
  game.uiState.abilityAssignmentMode=assignmentMode;
  if(!pending)game.uiState.pendingAbilityId=null;
  const placementAbility = assignmentMode ? pending : selected;

  return `
    <div class="ability-management-onepage ${game.uiState.mobileAbilityDetailOpen?'mobile-detail-open':''} ${assignmentMode ? 'assignment-mode' : ''}" data-ability-assignment-mode="${assignmentMode ? 'true' : 'false'}">
      <p class="mobile-skills-tip">Tap a skill to view its morphs. Drag its icon onto a hotbar tile to equip or replace a skill. You can also tap a skill, then tap a tile.</p>
      <div class="card ability-category-pane">
        <h3>Technique Library</h3>
        
        <div class="ability-category-list">
          ${categories.map(id => `
            <button type="button" class="compact-path-button ${category === id ? 'active' : ''}" data-ability-category="${escapeHtml(id)}">
              <b>${escapeHtml(prettyId(id))}</b><span>${id === 'all' ? known.length : known.filter(ability => abilityLibraryMatches(player,ability,id)).length}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="card ability-pool-pane">
        <h3>${escapeHtml(prettyId(category))} Abilities</h3>
        <div class="ability-pool-list">
          ${visible.length ? visible.map(ability => abilityPoolButton(player, ability, selected?.id, pending?.id)).join('') : '<p class="tag">No abilities learned in this category.</p>'}
        </div>
      </div>

      <div class="card ability-detail-pane" data-ability-detail-pane>
        <button type="button" class="mobile-skill-close" data-mobile-skill-close>Back to skills</button>
        ${renderAbilityDetail(player, selected)}
        <div class="mobile-skill-clear-options">${(player.loadout?.abilitySlots||[]).map((id,slot)=>id===selected?.id?`<button type="button" data-clear-ability-slot="${slot}">Clear tile ${slot+1}</button>`:'').join('')}</div>
      </div>

      <div class="card ability-hotbar-pane">
        <div>
          <h3>${assignmentMode ? `Place ${escapeHtml(pending.name)}` : 'Hotbar'}</h3>
          <p class="mobile-skills-feedback" role="status">${escapeHtml(game.uiState.mobileAbilityFeedback||'Your gameplay hotbar · drop an icon on a skill tile')}</p>
          <p class="tag ability-desktop-help">${assignmentMode
            ? 'Choose a slot, then press A. Press B to return or X to clear a slot.'
            : selected
              ? 'Press A to assign the selected skill. Press X to choose an available morph.'
              : 'Select an ability, then choose a slot.'}</p>
        </div>
        <div class="ability-hotbar-row">
          ${Array.from({length:HOTBAR_SLOT_COUNT},(_,slot)=>slot).map(slot => abilityHotbarSlot(player, slot, placementAbility, assignmentMode)).join('')}
          ${['Attack','Sprint','Dodge','Interact'].map(name=>`<div class="mobile-hotbar-fixed-action" aria-disabled="true">${name}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function abilityPoolButton(player, ability, selectedId, pendingId = null) {
  ability=resolveSubclassAbility(player,ability);
  const availability = getAbilityAvailability(player, ability);
  const assigned = player.loadout?.abilitySlots?.includes(ability.id);

  return `
    <button type="button"
      class="ability-pool-button ${selectedId === ability.id ? 'active' : ''} ${pendingId === ability.id ? 'pending-assignment' : ''} ${availability.usable ? '' : 'unavailable'}"
      data-select-ability-id="${escapeHtml(ability.id)}">
      <i>${hudArtIcon(ability.id,escapeHtml(HUD_ABILITY_ICONS[ability.id] || createAbilityFallbackIcon(ability)),player)}</i>
      <span><b>${escapeHtml(ability.name)}</b><em>${escapeHtml(ability.subclassName||'Original')} · ${escapeHtml(ability.role || prettyId(getAbilityCategory(ability)))} · M${getMasteryProgress(player,ability.id).level}</em></span>
      <strong title="${escapeHtml(availability.reason || '')}">${assigned ? 'Hotbar' : availability.usable ? '' : 'Unavailable'}</strong>
    </button>
  `;
}

function renderAbilityDetail(player, ability) {
  ability=resolveSubclassAbility(player,ability);
  if (!ability && isClasslessPlayer(player)) {
    return '<h3>No Learned Abilities</h3><p class="tag">Read skill scrolls to learn techniques you can assign to your hotbar.</p>';
  }

  if (!ability) return '<h3>Ability Details</h3><p class="tag">Unlock active abilities from your available trees.</p>';
  const availability = getAbilityAvailability(player, ability);
  const mastery = getMasteryProgress(player,ability.id);
  const bonus = getMasteryBonuses(player,ability.id);
  const effective=applyMythicalAbilityModifiers(player,applyAbilityMastery(player,ability));
  return `
    <div class="detail-title-row ability-detail-title"><i>${hudArtIcon(ability.id,escapeHtml(HUD_ABILITY_ICONS[ability.id] || createAbilityFallbackIcon(ability)),player)}</i><div><h3>${escapeHtml(ability.name)}</h3><p class="tag gold">${escapeHtml(effective.subclassName || ability.role || 'Technique')}</p></div>${availability.usable?'':`<b>Unavailable</b>`}</div>
    ${renderAbilityMorphChoices(player,ability.id)}
    <div class="ability-detail-info" tabindex="0" aria-label="Skill description, stats and mastery">
    <p class="detail-copy information-purpose">${escapeHtml(abilitySummary(effective,player))}</p>
    ${renderAbilityFacts(player,effective)}
    ${availability.usable?'':`<p class="tag bad-text">${escapeHtml(availability.reason)}</p>`}
    <div class="stat-row"><span>Mastery ${mastery.level}</span><b>${Math.floor(mastery.xp)} / ${Math.ceil(mastery.next)} XP</b></div>
    <div class="mastery-progress"><i style="width:${Math.round(mastery.progress*100)}%"></i></div>
    <p class="tag">Earn XP with this skill on your hotbar to gain mastery. Using the skill is optional.</p>
    ${mastery.level>1&&!ability.heldBlock?`<details class="information-extra"><summary>Mastery benefits</summary><p class="tag">+${((bonus.damage-1)*100).toFixed(1)}% potency · +${((bonus.range-1)*100).toFixed(1)}% reach · ${((1-(effective.channelProfile ? bonus.channelEfficiency : bonus.efficiency))*100).toFixed(1)}% lower ${effective.channelProfile?'channel upkeep':'cost'}.</p></details>`:''}
    </div>
  `;
}

function renderAbilityFacts(player,ability) {
  if(ability.heldBlock)return `<div class="information-facts"><div class="stat-row"><span>Use</span><b>Hold to block; release to stop</b></div><div class="stat-row"><span>Upkeep</span><b>4 Stamina/s before perks; extra on hits</b></div><div class="stat-row"><span>Protection</span><b>62% less damage before class bonuses</b></div><div class="stat-row"><span>Equipped bonus</span><b>+25% Defence XP</b></div><div class="stat-row"><span>Scales with</span><b>Blocking perks and block-efficiency gear</b></div></div>`;
  const profile=getAbilityUseChargeProfile(player,ability), rows=[];
  if(ability.sunkenBase&&ability.damage>0)rows.push(['Depth','Builds over 20s · carries between enemies'],['Pressure','One burn per target and caster · up to 3s after its last hit'],['Disengage','5s without a damaging Sunken hit resets Depth']);
  if(ability.cryoSkill)rows.push(['Frost','3 spaced Chill hits prepare Brittle · weaker foes freeze briefly']);
  if(ability.cryoCleanse||ability.cryoFieldCleanse)rows.push(['Restoration',`${ability.cryoFieldCleanse?'Each sanctuary pulse':'On cast'} clears movement slows and accumulated elite frost from nearby allies`]);
  const channel=ability.channelProfile;
  const cast=channel?(channel.mode==='hold'?'Hold to channel; release or dodge to stop':`Channel for ${informationNumber(channel.duration)}s`):ability.canCharge?`Tap to cast; hold to charge (${informationNumber(getAbilityChargeTime(player,ability))}s)`:'Press to use';
  rows.push(['Use',cast]);
  const cost=!ability.subclassId&&ability.id==='oathkeeperLastRite'?Math.max(24,Math.ceil(Number(ability.cost||42)*(1-Math.max(0,getSkillTreeBonuses(player).lastRiteCostReductionPct||0)/100))):ability.cost;
  rows.push([channel?'Start cost':'Cost',`${informationNumber(cost)} ${informationLabelForResource(ability.costType)}${ability.canCharge?' before charge':''}`]);
  if(ability.subclassHealthCost)rows.push(['Health cost',`${Math.round(ability.subclassHealthCost*100)}% of current health`]);
  if(channel)rows.push(['While active',`${informationNumber(channel.costPerSecond)} ${informationLabelForResource(ability.costType)}/s${channel.healthPerSecond?` + ${informationNumber(channel.healthPerSecond)} Health/s`:''}`]);
  if(channel?.mode==='hold')rows.push(['Movement',channel.movementMode==='locked'?'Stationary':channel.movementMode==='free'?'Normal speed':`${Math.round((channel.movementMultiplier||0)*100)}% speed`]);
  if(profile.maxCharges>1)rows.push(['Recovery',`${profile.maxCharges} uses · ${informationNumber(profile.rechargeTime)}s per use`]);
  else rows.push(['Recovery',channel?'No cooldown':`${informationNumber(profile.rechargeTime)}s${ability.summonType?' after group ends':''}`]);
  if(ability.range>0&&!ability.summonType)rows.push(['Reach',`${informationNumber(ability.range/32)} tiles${ability.canCharge?' before charge':''}`]);
  if(ability.faeFlowerField){
    rows[rows.findIndex(([label])=>label==='Reach')]=['Area',`${informationNumber(ability.subclassRadius/32)}-tile radius around your cast position, before tree bonuses`];
    rows.push(['Duration',`${informationNumber(ability.duration)}s before tree bonuses`],['Pulse','Healing and damage every 0.8s']);
  }
  if(ability.petalStorm){
    const reach=rows.findIndex(([label])=>label==='Reach');if(reach>=0)rows[reach]=['Area',`${informationNumber(ability.subclassRadius/32)}-tile radius, follows you`];
    rows.push(['Duration','7s · press once'],['Protection',`${informationNumber(20*getAbilityEffectiveness(player,ability))}% less incoming attack damage`],['Health return',`${informationNumber(5*getAbilityEffectiveness(player,ability))}% of all actual damage · includes summon attacks`],['Summon healing','20% of the returned health shared by injured summons inside; you keep the rest'],['Healing limit','Player and summons share 2% of your maximum Health/s · 2% reserve']);
  }
  if(ability.roseEruption){
    rows.push(['Burst area',`${informationNumber(ability.subclassRadius/32)}-tile radius ahead of your aim · every enemy inside`],
      ['Full charge','+80% damage · +35% reach and radius · +30% base cost'],
      ['Impact','Pushes surviving foes outward; heavy enemies resist, bosses hold ground'],
      ['Thorn wound','3 light damage ticks over 2.6s · refreshes, does not stack']);
  }
  if(ability.spectralUrn){
    rows.push(['Spirits','3 ghosts per urn · overlapping throws add more ghosts'],['Lifetime','Up to 4s after landing · at most 4 attacks per ghost'],['Seek range',`${informationNumber(ability.spiritSeekRange/32)} tiles around the landing point · visible enemies`]);
  }
  if(ability.roseMantle){
    const mantle=roseMantleProfile(player,ability,getSkillTreeBonuses(player));
    const reach=rows.findIndex(([label])=>label==='Reach');if(reach>=0)rows[reach]=['Recipients',`You and your living summons within ${informationNumber(ability.subclassRadius/32)} tiles at cast · clear line of sight`];
    rows.push(['Burst heal',`${informationNumber(mantle.burst*100)}% of each recipient’s maximum Health before charge`],
      ['Regeneration',`${informationNumber(mantle.regen*100)}% of maximum Health/s for 6s before charge`],
      ['Protection',`${informationNumber(mantle.reduction*100)}% less damage before charge`],
      ['Thorns',`${informationNumber(mantle.reflect*100)}% of damage taken · nearby attackers only · 0.75s recovery`],
      ['Full charge','+50% healing and protection before caps · +15% summon reach · +30% base cost']);
  }
  const requirements=abilityRequirements(ability);if(requirements)rows.push(['Requires',requirements]);
  rows.push(['Scales with',abilityScaling(ability)]);
  if(isGravecallerSustain(player)&&ability.classId==='gravecaller'){
    const rate=ability.summonType?(ability.subclassId==='acolyte'?8:4):gravecallerSkillLifesteal(ability);
    if(rate){
      rows.push(['Lifesteal',`${rate}% of actual damage before bonuses; primary hits only`]);
      rows.push(['Healing limit',ability.summonType?'All summons share 1% of your max Health/s, with up to 2% in reserve':'Shared lifesteal: 3% of max Health/s, with up to 6% in reserve']);
    }
  }
  const expertise=expertiseEffectText(player,ability);if(expertise)rows.push(['Expertise',expertise]);
  if(!ability.subclassId&&['guard','briarWard','ironOath'].includes(ability.id)){
    const protection=defensiveProtection(player,ability),potency=(ability._mastery?.damage||1)*progressionPower(player,'warding','defence')*getAbilityEffectiveness(player,ability);
    rows.splice(1,0,['Protection',`${informationNumber(Math.min(.72,protection.reduction*potency)*100)}% less damage for ${informationNumber(protection.duration)}s`]);
  }
  if(!ability.subclassId&&ability.id==='hydromancerBubbleWard'){
    const potency=(ability._mastery?.damage||1)*progressionPower(player,'warding','defence')*getAbilityEffectiveness(player,ability);
    rows.splice(1,0,['Protection',`${Math.ceil(calculateBubbleWardFlatAbsorb(player,ability,null)*potency)} damage per hit for ${informationNumber(calculateBubbleWardDuration(player.skillState?.combat?.level||player.combatLevel))}s before charge or Flow`]);
  }
  if(ability._mythChannel)rows.push(['Set effect',ability._mythChannel==='torrentSweep'?'Sweeping torrent · less direct damage, higher upkeep':'Beam branches · less direct damage, higher upkeep']);
  if(ability._mythGuard)rows.push(['Set effect','Longer Guard also protects nearby allies; higher cost']);
  return `<div class="information-facts">${rows.map(([label,value])=>`<div class="stat-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div>`;
}
function informationLabelForResource(id){return id==='spirit'?'Spirit':id==='stamina'?'Stamina':id||'resources';}

function abilityHotbarSlot(player, slot, selected, assignmentMode = false) {
  const assigned = resolveSubclassAbility(player,player.loadout?.abilitySlots?.[slot]);
  const availability = assigned ? getAbilityAvailability(player, assigned) : null;

  return `
    <div class="ability-hotbar-slot ${assigned && !availability?.usable ? 'unavailable' : ''} ${assignmentMode ? 'assignment-target' : ''}">
      <button type="button" class="ability-hotbar-assign" data-ability-hotbar-slot="${slot}" data-assign-selected-slot="${slot}" aria-label="${escapeHtml(`${abilitySlotLabel(slot,player)}: ${assigned?.name||'Empty'}${assigned?.subclassName?` · ${assigned.subclassName}`:''}`)}" title="${escapeHtml(assigned?.name||'Assign selected ability')}" ${selected ? '' : 'disabled'}>
        <i class="ability-hotbar-icon" aria-hidden="true">${assigned?hudArtIcon(assigned.id,escapeHtml(HUD_ABILITY_ICONS[assigned.id]||createAbilityFallbackIcon(assigned)),player):'<span class="hotbar-empty-symbol">◇</span>'}</i>
        <b class="ability-hotbar-binding">${escapeHtml(document.body.classList.contains('mobile-input')?`Skill ${slot+1}`:abilitySlotLabel(slot,player))}</b>
        <span class="ability-hotbar-name">${escapeHtml(assigned?assigned.name:'Empty')}</span>
        <em>${assigned ? escapeHtml(availability?.usable?(assigned.subclassName||''):availability?.reason||'Unavailable') : 'Choose a skill'}</em>
      </button>
      ${assigned&&!document.body.classList.contains('mobile-input') ? `<button type="button" class="ability-hotbar-clear" data-clear-ability-slot="${slot}">Clear</button>` : ''}
    </div>
  `;
}

function updateAbilityManagementPreview(player, game) {
  const ability = getAbilityById(game?.uiState?.selectedAbilityId);
  const detail = document.querySelector('[data-ability-detail-pane]');
  if (detail) detail.innerHTML = renderAbilityDetail(player, ability);
  if(detail)bindAbilityMorphControls(player,game,renderUI,detail);

  document.querySelectorAll('[data-select-ability-id]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.selectAbilityId === ability?.id);
  });
}

function abilitySlotLabel(slot,player) {
  return getAbilityBindingLabel(player,slot);

}

function abilityName(abilityId) {
  return getAbilityById(abilityId)?.name || abilityId || 'Ability';
}

function abilityLockReason(player, ability) {
  if (ability.classId && normalizeClassId(player.classId) !== normalizeClassId(ability.classId)) {
    return `Requires ${classLabel(ability.classId)} path`;
  }

  if (ability.bloodline && getPlayerBloodline(player)?.id !== ability.bloodline) {
    return `Requires ${skillLabel(ability.bloodline)} bloodline`;
  }

  const sl = getSkillLevel(player.skillState, ability.skill);
  const requirement = getAbilitySkillRequirement(ability);
  if (requirement && sl < requirement) {
    return `Requires ${skillLabel(ability.skill)} level ${requirement}`;
  }

  if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
    return 'Requires awakened Spirit';
  }

  if (!player.unlockedAbilities?.includes(ability.id)) {
    return 'Not unlocked yet';
  }

  return 'Locked';
}

// -----------------------------------------------------------------------------
// QUESTS / LOG
// -----------------------------------------------------------------------------

function renderQuests(player, game) {
  const el = document.getElementById('quests');
  if (!el) return;

  const journalPlayer = getQuestJournalPlayer(player, game);
  syncLegacyQuestDisplayState(journalPlayer);

  el.innerHTML = `
    <div class="card quest-onepage-card">
      <h2>Quests</h2>
      ${renderConnectedQuestLog(journalPlayer, game)}
      <details class="card"><summary>Routes and testimony</summary>${Object.entries(journalPlayer.locationKnowledge||{}).map(([id,r])=>`<p><strong>${escapeHtml(r.name)}</strong> — ${escapeHtml(r.state)}<br>${escapeHtml(r.route)}</p>`).join('')||'<p>Ask local people for directions. Your notes will appear here.</p>'}</details>
      <details class="card"><summary>Relationships and reputation</summary>${Object.entries(journalPlayer.factionReputation||{}).map(([id,value])=>`<p>${escapeHtml(id)}: ${Number(value)}</p>`).join('')}</details>
    </div>
  `;
}

function getQuestJournalPlayer(player, game) {
  const host = game?.hostGame?.player;
  if (!host || host === player) return player;

  const hostActive = Object.fromEntries(
    Object.entries(host.quests?.active || {}).filter(([, quest]) => quest?.type !== 'bloodline')
  );
  const hostCompleted = Object.fromEntries(
    Object.entries(host.quests?.completed || {}).filter(([, quest]) => quest?.type !== 'bloodline')
  );
  const personalActive = Object.fromEntries(
    Object.entries(player.quests?.active || {}).filter(([, quest]) => quest?.type === 'bloodline')
  );
  const personalCompleted = Object.fromEntries(
    Object.entries(player.quests?.completed || {}).filter(([, quest]) => quest?.type === 'bloodline')
  );

  return {
    ...host,
    quests: {
      active: { ...hostActive, ...personalActive },
      completed: { ...hostCompleted, ...personalCompleted }
    },
    questState: host.questState || player.questState || {}
  };
}

function renderConnectedQuestLog(player, game) {
  const activeQuests = player?.quests?.active || {};
  const completedQuests = player?.quests?.completed || {};

  const active = Object.values(activeQuests);
  const completed = Object.values(completedQuests);
  const mainQuests = active.filter(isMainQuest);
  const sideQuests = active.filter(quest => !isMainQuest(quest));
  const entries = createQuestMenuEntries(mainQuests, sideQuests, completed);

  if (!active.length && !completed.length) {
    return `
      <div class="quest-empty-state">
        <h3>No Active Quests</h3>
        <p class="tag">Speak with NPCs in the world to discover work, mysteries, and faction conflicts.</p>
      </div>
    `;
  }

  game.uiState.questPage = 0;
  const pageEntries = entries;
  const selectedEntry = resolveSelectedQuestEntry(game, entries, pageEntries);

  return `
    <div class="quest-onepage-layout">
      <div class="quest-title-index">
        <div class="quest-index-head">
          <span>${entries.length} Quest${entries.length === 1 ? '' : 's'}</span>
          <b>Journal</b>
        </div>
        <div class="quest-title-list">
          ${pageEntries.map(entry => questTitleButton(entry, selectedEntry?.key)).join('')}
        </div>

      </div>
      <div class="quest-detail-pane" data-quest-detail>
        ${renderQuestDetail(selectedEntry, player?.questState?.activeQuestId)}
      </div>
    </div>
  `;
}

function createQuestMenuEntries(mainQuests, sideQuests, completed) {
  return [
    ...mainQuests.map(quest => ({ key: `active:${quest.id}`, section: 'Main', quest, completed: false })),
    ...sideQuests.map(quest => ({ key: `active:${quest.id}`, section: quest.type === 'bloodline' ? 'Bloodline' : 'Side', quest, completed: false })),
    ...completed.map(quest => ({ key: `done:${quest.id}`, section: 'Completed', quest, completed: true }))
  ];
}

function resolveSelectedQuestEntry(game, entries, pageEntries) {
  const selectedId = game?.uiState?.selectedQuestId;
  const selected = entries.find(entry => entry.key === selectedId);
  const fallback = pageEntries[0] || entries[0] || null;

  game.uiState.selectedQuestId = selected?.key || fallback?.key || null;
  return selected || fallback;
}

function questTitleButton(entry, selectedKey) {
  const quest = entry.quest || {};
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
  const done = entry.completed || quest.status === 'completed';
  const ready = quest.readyToTurnIn;

  return `
    <button
      type="button"
      class="quest-title-button ${entry.key === selectedKey ? 'active' : ''} ${done ? 'completed' : ''}"
      data-select-quest-id="${escapeHtml(entry.key)}"
    >
      <span>${escapeHtml(entry.section)}</span>
      <b>${escapeHtml(quest.title || quest.id || 'Quest')}</b>
      <em>${done ? 'Complete' : ready ? 'Turn In' : `${objectives.filter(isObjectiveComplete).length}/${objectives.length || 1}`}</em>
    </button>
  `;
}

function renderQuestDetail(entry, trackedQuestId = null) {
  if (!entry) {
    return `
      <h3>No Quest Selected</h3>
      <p class="tag">Highlight a quest title to see its current objective.</p>
    `;
  }

  const quest = entry.quest || {};
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
  const completed = entry.completed || quest.status === 'completed';
  const stageLabel = quest.currentStageTitle || `Stage ${Number(quest.stageIndex || 0) + 1}`;

  return `
    <div class="quest-detail-head">
      <span>${escapeHtml(entry.section)}</span>
      <b>${completed ? 'Completed' : quest.readyToTurnIn ? 'Ready' : escapeHtml(stageLabel)}</b>
    </div>
    <h3>${escapeHtml(quest.title || quest.id || 'Quest')}</h3>
    ${quest.id && trackedQuestId === quest.id
      ? `<p class="quest-track-hint">${completed ? 'Currently tracked (complete)' : 'Currently tracked'}</p>`
      : !completed && quest.id
        ? '<p class="quest-track-hint">Press A on this quest to track</p>'
        : ''
    }
    <p class="tag quest-detail-copy">${escapeHtml(!completed&&quest.currentStageText || quest.description || quest.summary || 'No description recorded yet.')}</p>
    <div class="quest-objectives compact">
      ${completed
        ? '<div class="quest-objective complete"><span class="quest-check">✓</span><span>Completed</span><b>Done</b></div>'
        : objectives.length
          ? objectives.map(renderQuestObjective).join('')
          : `<p class="tag">No current objectives.</p>`
      }
    </div>
  `;
}

function updateQuestDetailPreview(player, game) {
  const pane = document.querySelector('[data-quest-detail]');
  if (!pane) return;

  const active = Object.values(player?.quests?.active || {});
  const completed = Object.values(player?.quests?.completed || {});
  const entries = createQuestMenuEntries(active.filter(isMainQuest), active.filter(quest => !isMainQuest(quest)), completed);
  const selected = entries.find(entry => entry.key === game?.uiState?.selectedQuestId) || entries[0] || null;

  document.querySelectorAll('[data-select-quest-id]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.selectQuestId === selected?.key);
  });

  pane.innerHTML = renderQuestDetail(selected, player?.questState?.activeQuestId);
  bindSubtabs(player, game);
}

function isMainQuest(quest) {
  const type = String(quest?.type || '').toLowerCase();
  return type === 'main' || type === 'mainstory' || type === 'story';
}

function renderActiveQuestCard(quest) {
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
  const stageLabel = quest.currentStageTitle || `Stage ${Number(quest.stageIndex || 0) + 1}`;

  return `
    <div class="quest-card active">
      <div class="quest-card-header">
        <h3>${escapeHtml(quest.title || quest.id || 'Quest')}</h3>
        <span>${escapeHtml(stageLabel)}</span>
      </div>

      ${quest.currentStageText ? `<p class="tag">${escapeHtml(quest.currentStageText)}</p>` : ''}
      ${quest.description ? `<p class="tag">${escapeHtml(quest.description)}</p>` : ''}

      ${quest.readyToTurnIn ? `
        <p class="quest-ready">Ready to turn in.</p>
      ` : ''}

      <div class="quest-objectives">
        ${objectives.length
          ? objectives.map(renderQuestObjective).join('')
          : `<p class="tag">No current objectives.</p>`
        }
      </div>
    </div>
  `;
}

function renderQuestObjective(objective) {
  const current = Number(objective.current || 0);
  const required = Number(objective.required || 1);
  const complete = isObjectiveComplete(objective);
  const sourceHint = objective.type === 'collect'
    ? objective.sourceHint || getQuestMaterialSourceHint(objective.itemId)
    : '';

  return `
    <div class="quest-objective ${complete ? 'complete' : ''}">
      <span class="quest-check">${complete ? '✓' : '○'}</span>
      <div class="quest-objective-copy">
        <span class="quest-objective-label">${escapeHtml(getObjectiveLabel(objective))}</span>
        ${sourceHint ? `<small class="quest-objective-source"><strong>Source:</strong> ${escapeHtml(sourceHint)}</small>` : ''}
      </div>
      <b class="quest-objective-progress">${current}/${required}</b>
    </div>
  `;
}

function isObjectiveComplete(objective) {
  return Number(objective?.current || 0) >= Number(objective?.required || 1);
}

function renderCompletedQuestCard(quest) {
  return `
    <div class="quest-card completed">
      <h3>${escapeHtml(quest.title || quest.id || 'Completed Quest')}</h3>
      <p class="tag">Completed.</p>
    </div>
  `;
}

function getObjectiveLabel(objective) {
  if (!objective) return 'Unknown objective';

  if (objective.label) return objective.label;

  if (objective.type === 'collect') {
    return `Collect ${prettyId(objective.itemId)}`;
  }

  if (objective.type === 'kill') {
    return `Defeat ${prettyId(objective.enemyKind)}`;
  }

  if (objective.type === 'killAny') {
    return `Defeat enemies`;
  }

  if (objective.type === 'talk') {
    return `Speak with ${prettyId(objective.npcId)}`;
  }

  if (objective.type === 'discoverPoi') {
    return `Discover ${prettyId(objective.poiId)}`;
  }

  if (objective.type === 'enterDungeon') {
    return `Enter ${prettyId(objective.dungeonId || objective.entranceId || 'Dungeon')}`;
  }

  if (objective.type === 'clearDungeon') {
    return `Clear ${prettyId(objective.dungeonId || objective.entranceId || 'Dungeon')}`;
  }

  return prettyId(objective.type || 'Objective');
}

function syncLegacyQuestDisplayState(player) {
  if (!player) return;

  player.quest = player.quest || {};
  player.quests = player.quests || { active: {}, completed: {} };
  player.quests.active = player.quests.active || {};
  player.quests.completed = player.quests.completed || {};

  syncLegacyFirstOath(player);
  syncLegacyHungryShrine(player);
  syncLegacyHumanBeginning(player);
}

function syncLegacyFirstOath(player) {
  const firstOathState = Number(player.quest?.firstOath || 0);

  if (player.quests.active.firstOath || player.quests.completed.firstOath) {
    delete player.quests.active.firstOathLegacy;
    delete player.quests.completed.firstOathLegacy;
    return;
  }

  if (firstOathState >= 3) {
    delete player.quests.active.firstOathLegacy;

    player.quests.completed.firstOathLegacy = {
      id: 'firstOathLegacy',
      title: QUESTS?.firstOath?.title || 'First Oath of Runalis',
      completedAt: performance.now()
    };

    return;
  }

  const stage = getFirstOathStage(player);
  const emberleaf = countItem(player, 'emberleaf');
  const ironOre = countItem(player, 'ironOre');

  player.quests.active.firstOathLegacy = {
    id: 'firstOathLegacy',
    title: QUESTS?.firstOath?.title || 'First Oath of Runalis',
    description: stage?.text || 'Prove you can gather, endure, and fight if needed.',
    stageIndex: Math.max(0, firstOathState),
    objectives: firstOathState <= 1
      ? [
          {
            type: 'collect',
            itemId: 'emberleaf',
            current: Math.min(emberleaf, 3),
            required: 3
          },
          {
            type: 'collect',
            itemId: 'ironOre',
            current: Math.min(ironOre, 2),
            required: 2
          }
        ]
      : [
          {
            type: 'talk',
            npcId: 'wardenMael',
            current: 0,
            required: 1
          }
        ],
    complete: false,
    readyToTurnIn: false
  };
}

function syncLegacyHungryShrine(player) {
  if (player.spiritAwakened || Number(player.quest?.hungryShrine || 0) >= 2) {
    delete player.quests.active.hungryShrineLegacy;

    player.quests.completed.hungryShrineLegacy = {
      id: 'hungryShrineLegacy',
      title: QUESTS?.hungryShrine?.title || 'The Hungry Shrine',
      completedAt: performance.now()
    };

    return;
  }

  const gravecap = countItem(player, 'gravecap');
  const boneShard = countItem(player, 'boneShard');

  player.quests.active.hungryShrineLegacy = {
    id: 'hungryShrineLegacy',
    title: QUESTS?.hungryShrine?.title || 'The Hungry Shrine',
    description: 'Find the Hungry Shrine and bring the offering it wants.',
    stageIndex: 0,
    objectives: [
      {
        type: 'collect',
        itemId: 'gravecap',
        current: Math.min(gravecap, 2),
        required: 2
      },
      {
        type: 'collect',
        itemId: 'boneShard',
        current: Math.min(boneShard, 1),
        required: 1
      }
    ],
    complete: false,
    readyToTurnIn: false
  };
}

function syncLegacyHumanBeginning(player) {
  if (!player?.quests?.active) return;

  delete player.quests.active.humanBeginningLegacy;
}

function prettyId(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}

function renderLog(lines) {
  const el = document.getElementById('log');
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>World Log</h2>
      <div class="log-list">
        ${(lines || []).map(l => `<div class="log-line">${escapeHtml(l)}</div>`).join('')}
      </div>
    </div>
  `;
}

export function getFirstOathStage(p) {
  if (!p?.quest) {
    return {
      stage: 0,
      text: QUESTS?.firstOath?.stages?.[0] || 'Speak with Warden Mael.'
    };
  }

  if (p.quest.firstOath === 0) {
    return {
      stage: 0,
      text: QUESTS?.firstOath?.stages?.[0] || 'Speak with Warden Mael.'
    };
  }

  if (countItem(p, 'emberleaf') < 3 || countItem(p, 'ironOre') < 2) {
    return {
      stage: 1,
      text: QUESTS?.firstOath?.stages?.[1] || 'Gather Emberleaf x3 and Iron Ore x2.'
    };
  }

  if ((p.quest.hollowlings || 0) < 3) {
    return {
      stage: 2,
      text: QUESTS?.firstOath?.stages?.[2] || 'Defeat Blighted Corpses x3.'
    };
  }

  if (p.quest.firstOath < 3) {
    return {
      stage: 3,
      text: QUESTS?.firstOath?.stages?.[3] || 'Return to Warden Mael.'
    };
  }

  return {
    done: true,
    stage: 4,
    text: 'You completed your first oath and earned standing in Runalis.'
  };
}

// -----------------------------------------------------------------------------
// GENERIC UI HELPERS
// -----------------------------------------------------------------------------

function abilitySlotName(player, index) {
  const id = player.loadout?.abilitySlots?.[index];
  const ability = id ? getAbilityById(id) : null;

  return ability ? ability.name : 'Locked';
}

function classLabel(classId) {
  if (normalizeClassId(classId) === 'classless') return 'Classless';
  if (normalizeClassId(classId) === 'oathkeeper') return 'Oathkeeper';
  if (normalizeClassId(classId) === 'fellhunter') return 'Fellhunter';
  if (classId === 'gravecaller' || classId === 'necromancer') return 'Gravecaller';
  if (classId === 'thornbinder') return 'Thornbinder';
  if (normalizeClassId(classId) === 'waverider') return 'Waverider';
  if (classId === 'lightbringer') return 'Lightbringer';
  if (classId === 'eldritch') return 'Eldritch';

  return classId || 'Class';
}

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

function summonName(kind) {
  if (kind === 'lich') return 'Lich';
  if (kind === 'thornbeast') return 'Thornbeast';
  if (kind === 'eldritchHorror') return 'Eldritch Horror';
  if (kind === 'spectralHand') return 'Spectral Hand';

  return 'Summon';
}

function skillLabel(skillId) {
  if (skillId === 'classless') return 'Classless';
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'oathkeeper' || skillId === 'templar') return 'Oathkeeper';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'hydromancy') return 'Hydromancy';
  if (skillId === 'lightbringer') return 'Lightbringer';
  if (skillId === 'eldritch') return 'Eldritch';
  if (skillId === 'defence') return 'Defence';
  if (skillId === 'hitpoints') return 'Health';
  if (skillId === 'summoning') return 'Summoning';
  if (skillId === 'focus') return 'Focus';
  if (skillId === 'dexterity') return 'Dexterity';
  if (skillId === 'stamina') return 'Stamina';
  if (skillId === 'cambion') return 'Cambion';
  if (skillId === 'nephilim') return 'Nephilim';
  if (skillId === 'vampire') return 'Vampire';
  if (skillId === 'blunt') return 'Blunt Mastery';
  if (skillId === 'sword') return 'Sword Mastery';
  if (skillId === 'bow') return 'Bow Mastery';
  if (skillId === 'staff') return 'Staff Mastery';
  if (skillId === 'scythe') return 'Scythe Mastery';
  if (skillId === 'eldritchWeapon') return 'Conduit Mastery';
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

function weaponTypeLabel(type) {
  if (type === 'sword') return 'Sword';
  if (type === 'dagger') return 'Dagger';
  if (type === 'axe') return 'Axe';
  if (type === 'mace') return 'Mace';
  if (type === 'hammer') return 'Hammer';
  if (type === 'spear') return 'Spear';
  if (type === 'bow') return 'Bow';
  if (type === 'crossbow') return 'Crossbow';
  if (type === 'staff') return 'Staff';
  if (type === 'scythe') return 'Scythe';
  if (type === 'spiritFocus') return 'Spirit Focus';

  return type || 'Weapon';
}

function bar(label, value, max, cls = '') {
  const safeMax = Math.max(1, max || 1);
  const safeValue = Math.max(0, value || 0);
  const pct = Math.max(0, Math.min(100, safeValue / safeMax * 100));

  return `
    ${label ? `<div class="stat-row"><span>${escapeHtml(label)}</span><span>${Math.ceil(safeValue)}/${Math.ceil(safeMax)}</span></div>` : ''}
    <div class="bar"><div class="fill ${escapeHtml(cls)}" style="width:${pct}%"></div></div>
  `;
}

function dormantBar(label, text) {
  return `
    ${label ? `<div class="stat-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(text)}</span></div>` : ''}
    <div class="bar dormant"><div class="fill" style="width:0%"></div></div>
  `;
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

// -----------------------------------------------------------------------------
// SMALL STYLE PATCH FOR NEW PROGRESSION UI
// -----------------------------------------------------------------------------

function injectProgressionHudStyles() {
  if (document.getElementById('runalisProgressionHudStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisProgressionHudStyles';

  style.textContent = `
    .unit-level-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 2px 0 4px;
      font-size: 10px;
      color: var(--muted, #9facbf);
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .unit-level-row b {
      color: var(--gold, #d9ad4f);
      font-size: 10px;
      white-space: nowrap;
    }

    .progression-card-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .progression-big-card {
      position: relative;
      overflow: hidden;
    }

    .progression-big-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 4px;
    }

    .progression-big-row span {
      color: var(--muted, #9facbf);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .progression-big-row b {
      color: var(--gold, #d9ad4f);
      font-size: 26px;
      line-height: 1;
    }

    .progression-mini-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 10px 0 12px;
    }

    .progression-mini-card {
      border: 1px solid rgba(122, 148, 191, 0.22);
      background: rgba(8, 13, 22, 0.58);
      border-radius: 12px;
      padding: 10px;
      display: grid;
      gap: 3px;
    }

    .progression-mini-card span {
      color: var(--muted, #9facbf);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .progression-mini-card b {
      color: var(--gold, #d9ad4f);
      font-size: 20px;
    }

    .progression-mini-card small {
      color: var(--muted, #9facbf);
      font-size: 11px;
      line-height: 1.25;
    }

    @media (max-width: 820px) {
      .progression-card-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function injectControllerFocusStyles() {
  if (document.getElementById('runalisControllerFocusStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisControllerFocusStyles';

  style.textContent = `
    .game-ui-controller-focus {
      outline: 3px solid rgba(255, 204, 102, 0.95) !important;
      outline-offset: 3px !important;
      box-shadow:
        0 0 0 4px rgba(217, 173, 79, 0.18),
        0 0 26px rgba(217, 173, 79, 0.38) !important;
    }

    .tab.game-ui-controller-focus,
    .subtab.game-ui-controller-focus,
    button.game-ui-controller-focus {
      transform: translateY(-1px);
    }

    .slot-card.game-ui-controller-focus,
    .inventory-card.game-ui-controller-focus,
    .equipment-slot.game-ui-controller-focus,
    .recipe-card.game-ui-controller-focus {
      border-color: rgba(255, 204, 102, 0.75) !important;
      background: rgba(80, 62, 28, 0.28) !important;
    }
  `;

  document.head.appendChild(style);
}




function getAbilityLibrary(player) {
  return getKnownActiveAbilities(player);
}
function abilityLibraryMatches(player,ability,category) {
  return getAbilityCategory(ability)===category || ability.role===category;
}
