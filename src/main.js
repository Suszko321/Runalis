import {updateMalakarEncounter,handleMalakarInput,handleMalakarKeyboard} from './malakarEncounter.js';
import {rememberRepeatableInstance} from './instanceEncounterMemory.js';
import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import {initMobileShell, createMobileControls} from './mobileControls.js';
import {createOnlineSession} from './onlineSession.js';
import {createDeathScreen} from './deathScreen.js';
import {installReleaseUpdates} from './releaseUpdates.js';
import {bindFullscreenButtons} from './fullscreenMenu.js';
import { getKeyboardAbilitySlot } from './abilityBindings.js';
import {updateSimulatedSubclassPlayers} from './simulatedSubclassPlayers.js';
import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import {migrateOrrakaiPosition} from './orrakaiLayout.js';
import {migrateEchorynPosition} from './echorynLayout.js';
import { handleMenuSheetInput, menuSheetItemVisible,noteControllerMenuInput } from './menuSheets.js';
import { cameraAxisPosition } from './cameraBounds.js';
import { showLexiconMessage } from './lexiconPresentation.js';
import {updateWorldExploration,discoverStone} from './worldExploration.js';
import {placeAtNavStone} from './navStoneNetwork.js';
import {updateContinentalWorld} from './continentStreaming.js';
// main.js
// Runalis main game loop.
//
// Slimmed-down coordinator version.
// Major systems split into:
//
// - gameInteraction.js
//   Interaction, harvesting, class selection, shrine/campfire, dungeon routing.
//
// - pauseMenu.js
//   Pause overlay and pause actions.
//
// - gameSave.js
//   Profiles, localStorage, slim saves, save migration, menu/profile UI.
//
// This file now focuses on:
// - game construction
// - input binding
// - main update/render loop
// - movement
// - world updates
// - camera/screen shake
// - progression feedback
// - save/load wrappers
//
// Controller update:
// - Each connected controller owns its player's gameplay, dialogue, and menus.
// - Controller 1 controls Player 1; joined controllers retain their saved actor.
// - Pause remains shared, while character, inventory, skills, shops, and dialogue
//   are routed to the player who opened them.

import {
  createWorld,
  isPassable,
  hasLineOfSight,
  moveActorWithCollision,
  getWorldPixelWidth,
  getWorldPixelHeight
} from './world.js';
import { createRegionWorld, createTravelRouteWorld } from './regionWorlds.js';

import {
  createPlayer,
  migratePlayer,
  addItem,
  gainXp
} from './player.js';

import {
  updateCombat,
  updateEnemies,
  updateSummons,
  updateAbilityInput,
  cancelActiveAbilityCharge,
  cancelActiveHeavyAttackCharge,
  useAbility,
  getPlayerMovementMultiplier,
  getPlayerDashVelocity
} from './combat.js';

import { draw } from './render.js';
import { drawSplitScreenHud } from './splitScreenHud.js';

import {
  initUI,
  renderUI,
  handleGameUiControllerInput,
  clearGameUiDom,
  toggleGameMenuChooser,
  closeGameMenu
} from './ui.js';
import { drawMinimapPanel, renderMinimapHud, updateMinimapExploration } from './minimapHud.js';

import { TILE, getAbilityById } from './data.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, getDefaultWorldName, normalizePlayerFacingWorldName } from './worldNames.js';
import { createDeveloperEditor } from './developerEditor.js';
import { createDeveloperWorld, DEVELOPER_MAP_OPTIONS } from './developerWorldFactory.js';

import {
  addFloatingText,
  updateFloatingTexts,
  addQuestText,
  addStatusText,
  addSpiritText
} from './floatingText.js';

import {
  applyDungeonPartyTether,
  getSharedPartyCameraFocus,
  isSharedPartyCameraWorld
} from './coopSharedScreen.js';


import {
  createDialogueState,
  closeDialogue,
  updateDialogue,
  updateDialogueInput,
  updatePoiDiscovery,
  ensurePlayerDialogueAndQuestState,
  startQuest
} from './dialogueSystem.js';

import { drawDialogueUI, getDialoguePointerTarget } from './dialogueUi.js';
import { getPoi } from './worldContent.js';
import { showPoiArrival } from './poiPresentationSystem.js';
import { applyPoiEncounterState } from './poiEncounterSystem.js';
import { applyPoiWorldState } from './poiStateSystem.js';
import { updateOverworldEncounters } from './overworldEncounterSystem.js';

import {
  interact,
  enterDungeon,
  exitDungeon,
  refreshClassAbilityUnlocks,
  grantClassStarterGear,
  getClassColor
} from './gameInteraction.js';

import {
  ensurePauseOverlay,
  injectPauseStyles,
  setPauseActive,
  bindPauseButtons,
  renderPauseMenu
} from './pauseMenu.js';

import {
  bindProfileMenu,
  renderProfileList,
  readProfiles,
  showMenu,
  showGame,
  showLoadingScreen,
  hideLoadingScreen,
  saveGameProfile,
  applySaveToGame
} from './gameSave.js';

import {
  applyAppearanceToPlayer,
  ensurePlayerAppearance,
  openCharacterCreator,
  handleCharacterCreatorControllerInput
} from './characterCreator.js';

import {
  createControllerManager,
  updateControllerManager,
  getAllControllerInputs,
  resolveControllerPlayerAssignments,
  createDialogueInputFromController
} from './inputController.js';

import {
  ensureCouchCoop,
  updateCouchCoop,
  getPartyCameraFocus,
  getActiveCoopPlayers,
  getActiveLocalPlayers,
  handleCouchCoopJoinMenuControllerInput,
  getCouchCoopActorForControllerInput,
  getCouchCoopActorSlot,
  saveCouchCoopProfile,
  leaveCouchCoopPlayer
} from './couchCoop.js';

import {
  clearCoopReviveState,
  handleActorZeroHpForCoop,
  isActorControlLockedByRevive,
  processReviveInput,
  sanitizeActorReviveStateForSave,
  updateCoopReviveTimers
} from './coopReviveSystem.js';

import {
  applyCoopEnemyCountScalingToWorld
} from './coopEnemyScaling.js';

import {
  updateWorldLootPickups
} from './lootSystem.js';

import {
  updateTowerState,
  exitTower
} from './towerSystem.js';

import {
  updateSideZoneState,
  exitSideZone
} from './sideZoneSystem.js';

import {
  handleFishingMiniGameInput,
  updateFishingMiniGame
} from './survivalSkills.js';

import {
  handleMarketShopControllerInput,
  openMarketShop
} from './shopSystem.js';
import {openWorkshopService,closeWorkshopService,handleWorkshopControllerInput,updateWorkshopService} from './workshopService.js';

import {
  canPvpActorAct,
  handlePvpArenaControllerInput,
  isPvpActorEliminated,
  shouldBlockPvpArenaSave,
  updatePvpArena
} from './pvpArenaSystem.js';

import {
  createCapitalHubWorld,
  useMaraApothecary
} from './hubSystem.js';

import {
  createCaravanOpeningWorld,
  createMaraHouseWorld,
  requestAct1OpeningSkip,
  updateAct1Opening
} from './act1OpeningSystem.js';
import { updateOldWellQuest } from './oldWellSystem.js';
import { updateAct1Campaign } from './act1CampaignRuntime.js';
import { openOrderLedger } from './yourOrder.js';

import {
  createAudioSystem,
  unlockAudio,
  playSfx,
  classifyAdaptiveMusicThreats,
  updateAdaptiveMusic,
  stopAudio
} from './audioSystem.js';
import { updateActorLocomotionAudio } from './locomotionAudio.js';

import {
  recoverPassiveSpirit
} from './resourceBalance.js';

import {
  applyCombatAimFacing,
  resolveActorCombatAim,
  writeCombatAimToInput
} from './combatAim.js';

function controllerInputShouldWakeAudio(input) {
  if (!input) return false;

  const movement = Math.hypot(input.moveX || 0, input.moveY || 0);
  const aim = Math.hypot(input.aimX || 0, input.aimY || 0);

  return !!(
    input.confirmPressed ||
    input.attackPressed ||
    input.pausePressed ||
    input.cancelPressed ||
    input.blockHeld ||
    input.sprintHeld ||
    input.dashPressed ||
    input.ability0Pressed ||
    input.ability1Pressed ||
    input.ability2Pressed ||
    input.ability3Pressed ||
    input.ability4Pressed ||
    input.upPressed ||
    input.downPressed ||
    input.leftPressed ||
    input.rightPressed ||
    movement > 0.18 ||
    aim > 0.18
  );
}

function controllerHasMenuAction(input, includeAttack = false) {
  return !!(
    input?.confirmPressed ||
    input?.cancelPressed ||
    input?.backPressed ||
    input?.upPressed ||
    input?.downPressed ||
    input?.leftPressed ||
    input?.rightPressed ||
    input?.ltPressed || input?.rtPressed ||
    input?.lbPressed ||
    input?.rbPressed ||
    input?.xPressed ||
    input?.yPressed ||
    input?.yHeld ||
    (includeAttack && input?.attackPressed)
  );
}

function isBlockingDomOverlayActive() {
  return [
    'characterCreatorOverlay',
    'workshopServiceOverlay',
    'pvpArenaOverlay',
    'deathScreenOverlay',
    'onlineMultiplayerOverlay'
  ].some(id => document.getElementById(id)?.classList.contains('active'));
}

function normalizeOpeningQuestFlow(player) {
  if (!player?.quests) return;

  // Fresh profiles earn the Act I quest after the caravan prologue. Save/load
  // migration must not silently skip that playable opening.
  if (player.act1OpeningPending) return;

  const active = player.quests.active || {};
  const completed = player.quests.completed || {};
  const hasMercyOpening = !!active.mercy_in_orrakai || !!completed.mercy_in_orrakai;
  if (hasMercyOpening || player.story?.flags?.opening?.introPlayed) return;
  const hasModernAct1 = !!active.act1HearthmereAshes || !!completed.act1HearthmereAshes;
  const actOneComplete = !!(
    player.story?.flags?.act1Complete ||
    player.story?.act1Complete ||
    player.flags?.story?.act1Complete
  );

  if (!hasModernAct1 && (active.hollowCrown || active.solgateOath)) {
    startQuest(player, 'act1HearthmereAshes');
  }

  if (!hasModernAct1 && !actOneComplete && (player.story?.act || 'act1') === 'act1') {
    startQuest(player, 'act1HearthmereAshes');
  }

  delete active.hollowCrown;
  delete active.solgateOath;
  delete active.humanBeginningLegacy;
}

// -----------------------------------------------------------------------------
// GAME CLASS
// -----------------------------------------------------------------------------

initMobileShell();

class RunalisGame {
  constructor(profileId, profileName, savedState = null, options = {}) {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');

    this.profileId = profileId;
    this.profileName = profileName;
    this.developerModeOptions = options.developerMode || null;
    this.isNewProfile = !savedState && !this.developerModeOptions;

    // Saves construct their own destination in applySave. New journeys begin
    // in the caravan; the continental world is only needed when leaving it.
    this.world = this.developerModeOptions ? createDeveloperWorld(this.developerModeOptions) : createCaravanOpeningWorld();
    this.player = createPlayer(profileName || 'Wayfarer');
    this.uiOwner = this.player;
    this.uiMenuView = this;
    this.actorGameViews = new WeakMap();
    this.currentSplitLayout = null;
    this.splitScreenActive = false;

    this.overworldState = null;
    this.dialogue = createDialogueState();
    this.audio = createAudioSystem();
    this.musicCombatUntil = 0;
    this.musicBossUntil = 0;

    this.keys = new Set();
    this.controllers = createControllerManager();

    this.controllerInput = getAllControllerInputs(this.controllers);
    this.hostControllerSlotIndex = null;
    this.primaryControllerActive = false;
    this.keyboardAttackHeld = false;
    this.pointerAttackHeld = false;
    this.pointerBlockHeld = false;
    this.mouseAimPosition = null;

    this.input = {
      mouseX: 0,
      mouseY: 0,
      mouseWorldX: 0,
      mouseWorldY: 0,
      combatAimX: null,
      combatAimY: null,
      aimSource: null,
      rightStickActive: false,

      moveX: 0,
      moveY: 0,

      attackHeld: false,
      attackPressed: false,
      attackReleased: false,

      sprintHeld: false,
      blockHeld: false,
      dashPressed: false,
      ability0Pressed: false,
      ability0Held: false,
      ability0Released: false,
      ability1Pressed: false,
      ability1Held: false,
      ability1Released: false,
      ability2Pressed: false,
      ability2Held: false,
      ability2Released: false,
      ability3Pressed: false,
      ability3Held: false,
      ability3Released: false,
      ability4Pressed: false,
      ability4Held: false,
      ability4Released: false
    };

    this.logLines = [
      'Welcome to Runalis.',
      'You enter Echoryn Forest as a human. What you become depends on what you survive.'
    ];

    this.camera = { x: 0, y: 0 };
    this.renderCamera = { x: 0, y: 0 };

    this.last = performance.now();
    this.interactLock = false;
    this.uiTimer = 0;
    this.paused = false;
    this.started = false;

    this.screenShake = {
      amount: 0,
      time: 0,
      maxTime: 0
    };

    this.progressionWatch = {
      combatLevel: 1,
      classLevel: 0,
      hp: 100,
      stamina: 100,
      spirit: 0
    };

    this.log = this.log.bind(this);

    ensurePauseOverlay(this);
    injectPauseStyles();

    initUI(this);
    this.bind();
    this.mobileControls = createMobileControls(this, {
      unlock: unlockAudio,
      abilityName: id => getAbilityById(id)?.name,
      cancelCharge: () => { this.onlineSession?.cancelCharges();cancelActiveAbilityCharge(this.player); cancelActiveHeavyAttackCharge(this.player, this.world); },
      menu: () => {
        if (this.dialogue?.active&&!this.dialogue.actor?.networkRemote || isBlockingDomOverlayActive() || this.world?.mode === 'act1Opening') return;
        if (this.paused) this.togglePause(false);
        toggleGameMenuChooser(this.setUiOwner(this.player));
      },
      multiplayer: () => {
        if (this.dialogue?.active && !this.dialogue.actor?.networkRemote || isBlockingDomOverlayActive() || this.world?.mode === 'act1Opening') return;
        this.onlineSession?.openMenu();
      },
      pause: () => this.togglePause(),
      skip: () => requestAct1OpeningSkip(this)
    });
    this.onlineSession = createOnlineSession(this);

    if (this.developerModeOptions) {
      this.player.x = this.world.spawn?.x ?? this.player.x;
      this.player.y = this.world.spawn?.y ?? this.player.y;
      this.player.currentZone = this.world.name;
      this.player.invulnerable = true;
      this.camera.x = this.player.x - this.canvas.width / 2;
      this.camera.y = this.player.y - this.canvas.height / 2;
    } else if (savedState) {
      this.applySave(savedState);
    } else {
      this.giveStartingItems();
      this.player.act1OpeningPending = true;
      this.finalizeLoadedState('new');
      this.placeNewProfileAtCaravan();
    }

    ensurePlayerDialogueAndQuestState(this.player);
    ensurePlayerAppearance(this.player);
    applyAppearanceToPlayer(this.player, this.player.appearance);
    ensureCouchCoop(this);
    this.setUiOwner(this.player);

    const label = document.getElementById('activeProfileLabel');
    if (label) label.textContent = this.profileName;

    this.captureProgressionWatch();

    this.developerEditor = this.developerModeOptions
      ? createDeveloperEditor(this, this.developerModeOptions)
      : null;

    this.started = true;

    renderUI(this.player, this.logLines, this);
    this.renderPauseMenu();

    if (this.isNewProfile) {
      setTimeout(() => {
        if (this.started) {
          openCharacterCreator(this);
        }
      }, 0);
    }

    requestAnimationFrame(time => this.loop(time));
  }

  // ---------------------------------------------------------------------------
  // STARTUP / CLEANUP
  // ---------------------------------------------------------------------------

  giveStartingItems() {
    addItem(this.player, 'fieldRations', 2);

    this.log('You have a guard wage, two field rations, and a place beside the caravan fire.');
    this.log('Zarynth lies east. Tonight, the road is quiet.');
  }

  placeNewProfileAtCaravan() {
    const opening = createCaravanOpeningWorld();
    this.world = opening;
    this.overworldState = null;
    this.player.x = opening.spawn.x;
    this.player.y = opening.spawn.y;
    this.player.dirX = 1;
    this.player.dirY = 0;
    this.player.currentZone = opening.name;
    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
  }

  placeNewProfileInSafeHub() {
    const frontier = createWorld();
    const hub = createCapitalHubWorld();

    hub.safeZone = true;

    this.overworldState = {
      tiles: frontier.tiles || [],
      objects: frontier.objects || [],
      enemies: frontier.enemies || [],
      drops: frontier.drops || [],
      mode: 'overworld',
      name: normalizePlayerFacingWorldName(frontier.name, ACT1_OVERWORLD_DISPLAY_NAME),
      camera: {
        x: 11 * TILE - this.canvas.width / 2,
        y: 27 * TILE - this.canvas.height / 2
      },
      returnPoint: {
        x: 11 * TILE,
        y: 27 * TILE
      }
    };

    this.world = hub;
    this.player.x = hub.spawn.x;
    this.player.y = hub.spawn.y;
    this.player.dirX = 0;
    this.player.dirY = 1;
    this.player.currentZone = hub.name;
    this.player.capitalUnlocked = true;
    this.player.tower = this.player.tower || {};
    this.player.tower.unlocked = true;
    this.player.discoveredLocations = this.player.discoveredLocations || {};
    this.player.discoveredLocations.orrakai = {
      id: 'orrakai',
      name: hub.name,
      discoveredAt: Date.now()
    };
    this.player.discoveredLocations.capitalPrototype = {
      id: 'capitalPrototype',
      name: hub.name,
      discoveredAt: Date.now()
    };
    this.rememberSafeLocation('newProfile');

    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
  }

  createCapitalHubWorldInstance() {
    const hub = createCapitalHubWorld();
    hub.safeZone = true;
    return hub;
  }

  bind() {
    this.openingSkipKeys=new Set();
    this.keydown = event => {
      unlockAudio();
      if(handleMalakarKeyboard(this,event))return;
      if (this.developerEditor?.handleKeyDown(event)) return;
      const key = event.key.toLowerCase();
      const physicalKey=event.code||key;
      if(this.openingSkipKeys.has(physicalKey)){event.preventDefault();return;}

      if (this.world?.mode === 'act1Opening' && !isBlockingDomOverlayActive() && !isEditableTextTarget(event.target)) {
        event.preventDefault();
        this.openingSkipKeys.add(physicalKey);
        requestAct1OpeningSkip(this);
        return;
      }

      if (this.getPrimaryControllerInput()?.connected && !isEditableTextTarget(event.target)) {
        return;
      }

      if (event.repeat && (key === 'tab' || key === 'escape')) {
        event.preventDefault();
        return;
      }

      if (this.couchCoopJoinMenu?.active || this.fishingMiniGame?.active || this.marketShop?.active || isBlockingDomOverlayActive()) {
        return;
      }

      if (key === 'escape') {
        event.preventDefault();

        if (this.dialogue?.active && !this.dialogue.actor?.networkRemote) {
          if (this.dialogue.actor && this.dialogue.actor !== this.player) return;
          this.closeConversation();
          this.renderOwnedUI();
          return;
        }

        if (closeGameMenu(this)) {
          return;
        }

        this.togglePause();
        return;
      }

      if (this.paused) return;

      if (this.dialogue?.active && !this.dialogue.actor?.networkRemote) {
        if (this.dialogue.actor && this.dialogue.actor !== this.player) return;
        if (event.repeat) {
          event.preventDefault();
          return;
        }

        const handled = this.routeDialogueInput(
          this.dialogue,
          createDialogueInputFromEvent(event),
          this.dialogue.actor || this.player,
          this.world
        );

        if (handled) {
          event.preventDefault();
          this.renderOwnedUI();
          return;
        }

        return;
      }

      if (key === 'tab') {
        event.preventDefault();
        toggleGameMenuChooser(this.setUiOwner(this.player));
        return;
      }

      if (document.querySelector('.panel.open')) {
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', ' '].includes(key)) {
          event.preventDefault();

          if (key === 'enter' && typeof document.activeElement?.click === 'function') {
            document.activeElement.click();
          }
        }

        return;
      }

      this.keys.add(key);

      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
      }

      if (key === ' ') {
        this.keyboardAttackHeld = true;

        if (!this.input.attackHeld) {
          this.input.attackPressed = true;
        }

        this.input.attackHeld = true;
      }

      if (key === 'shift') {
        this.input.sprintHeld = true;
      }

      if (key === 'alt') {
        event.preventDefault();
        this.input.dashPressed = true;
      }

      const abilitySlot = getKeyboardAbilitySlot(key, this.player);
      if (abilitySlot >= 0) {
        event.preventDefault();
        if (!this.input[`ability${abilitySlot}Held`]) this.input[`ability${abilitySlot}Pressed`] = true;
        this.input[`ability${abilitySlot}Held`] = true;
      }

      if (key === 'c') {
        openCharacterCreator(this.setUiOwner(this.player));
      }

      if (key === 'e' && !this.interactLock) {
        const handledRevive = processReviveInput(this, this.player, {
          confirmPressed: true,
          confirmHeld: true,
          interactPressed: true,
          interactHeld: true
        }, 0, performance.now() / 1000);

        if (handledRevive) {
          event.preventDefault();
          this.interactLock = true;
          return;
        }

        this.interact();
        this.interactLock = true;
      }
    };

    this.keyup = event => {
      if (this.developerEditor?.handleKeyUp(event)) return;
      const key = event.key.toLowerCase();
      if(this.openingSkipKeys.delete(event.code||key)){event.preventDefault();return;}

      this.keys.delete(key);

      if (key === ' ') {
        this.keyboardAttackHeld = false;
        this.input.attackHeld = false;
        this.input.attackReleased = true;
      }

      if (key === 'shift') {
        this.input.sprintHeld = false;
      }

      if (key === 'e') {
        this.interactLock = false;
      }

      const abilitySlot = getKeyboardAbilitySlot(key, this.player);
      if (abilitySlot >= 0) {
        this.input[`ability${abilitySlot}Held`] = false;
        this.input[`ability${abilitySlot}Released`] = true;
      }
    };

    this.mousemove = event => {
      if (this.mobileControls) return;
      if (event.target.closest?.('#mobileControls,#mobileRotate') || event.sourceCapabilities?.firesTouchEvents) return;
      if (this.developerEditor?.handlePointerMove(event)) return;
      this.updateMousePosition(event);
    };

    this.mousedown = event => {
      if (event.target.closest?.('#mobileControls,#mobileRotate') || (this.mobileControls && event.target !== this.canvas)) return;
      unlockAudio();
      if (this.developerEditor?.handlePointerDown(event)) return;

      if (this.dialogue?.active && !this.dialogue.actor?.networkRemote) {
        if (this.dialogue.actor && this.dialogue.actor !== this.player) return;
        if (event.button !== 0) return;

        this.updateMousePosition(event);
        const target = getDialoguePointerTarget(
          this.ctx,
          this.dialogue,
          { x: this.input.mouseX, y: this.input.mouseY },
          { viewport: this.getDialogueViewport(this.dialogue.actor || this.player) }
        );

        if (target) {
          if (target.type === 'close') {
            this.closeConversation();
            event.preventDefault();
            this.renderOwnedUI();
            return;
          }
          this.routeDialogueInput(
            this.dialogue,
            {
              inputDevice: 'mouse',
              pointerConfirm: target.type === 'confirm',
              pointerChoiceIndex: target.type === 'choice' && !target.disabled ? target.index : null
            },
            this.dialogue.actor || this.player,
            this.world
          );
          event.preventDefault();
          this.renderOwnedUI();
        }
        return;
      }

      if (this.paused || this.couchCoopJoinMenu?.active || this.fishingMiniGame?.active || this.marketShop?.active || isBlockingDomOverlayActive()) return;
      if (this.getPrimaryControllerInput()?.connected && !this.getPrimaryControllerInput()?.mobile) return;
      if (this.mobileControls) return;

      if (event.button === 0) {
        this.pointerAttackHeld = true;

        if (!this.input.attackHeld) {
          this.input.attackPressed = true;
        }

        this.input.attackHeld = true;
      }

      if (event.button === 2) {
        event.preventDefault();
        this.pointerBlockHeld = true;
        this.input.blockHeld = true;
      }
    };

    this.mouseup = event => {
      if (this.mobileControls) return;
      if (this.developerEditor?.handlePointerUp(event)) return;
      if (event.button === 0) {
        this.pointerAttackHeld = false;
        this.input.attackHeld = false;
        this.input.attackReleased = true;
      }

      if (event.button === 2) {
        this.pointerBlockHeld = false;
        this.input.blockHeld = false;
      }
    };

    this.contextmenu = event => {
      event.preventDefault();
    };

    this.wheel = event => {
      this.developerEditor?.handleWheel(event);
    };

    this.doubleclick = event => {
      this.developerEditor?.handleDoubleClick(event);
    };

    this.blur = () => {
      this.onlineSession?.cancelCharges();
      this.mouseAimPosition = null;
      this.input.mouseAimActive = false;
      this.keys.clear();
      this.openingSkipKeys.clear();

      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.sprintHeld = false;
      this.input.blockHeld = false;
      this.input.dashPressed = false;
      this.keyboardAttackHeld = false;
      this.pointerAttackHeld = false;
      this.pointerBlockHeld = false;
      cancelActiveAbilityCharge(this.player);
      cancelActiveHeavyAttackCharge(this.player, this.world);
      this.clearAbilityInputEdges(true);
    };

    this.beforeUnload = () => {
      if (this.developerEditor) this.developerEditor.saveRecovery();
      else this.save(false);
    };

    addEventListener('keydown', this.keydown);
    addEventListener('keyup', this.keyup);
    addEventListener('mousemove', this.mousemove);
    addEventListener('mousedown', this.mousedown);
    addEventListener('mouseup', this.mouseup);
    addEventListener('contextmenu', this.contextmenu);
    addEventListener('blur', this.blur);
    addEventListener('beforeunload', this.beforeUnload);
    addEventListener('wheel', this.wheel, { passive: false });
    addEventListener('dblclick', this.doubleclick);
  }

  destroy() {
    closeWorkshopService(this);
    if (this.destroyed) return;
    this.destroyed = true;
    this.started = false;
    this.onlineSession?.destroy();
    this.deathScreen?.destroy();
    this.mobileControls?.destroy();
    this.developerEditor?.destroy();
    this.developerEditor = null;

    removeEventListener('keydown', this.keydown);
    removeEventListener('keyup', this.keyup);
    removeEventListener('mousemove', this.mousemove);
    removeEventListener('mousedown', this.mousedown);
    removeEventListener('mouseup', this.mouseup);
    removeEventListener('contextmenu', this.contextmenu);
    removeEventListener('blur', this.blur);
    removeEventListener('beforeunload', this.beforeUnload);
    removeEventListener('wheel', this.wheel, { passive: false });
    removeEventListener('dblclick', this.doubleclick);

    clearGameUiDom();
    stopAudio();
  }

  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.input.mouseX = (event.clientX - rect.left) * scaleX;
    this.input.mouseY = (event.clientY - rect.top) * scaleY;

    this.input.mouseWorldX = this.input.mouseX + this.camera.x;
    this.input.mouseWorldY = this.input.mouseY + this.camera.y;
    if (!this.mobileControls) this.mouseAimPosition = {x:event.clientX,y:event.clientY};
  }

  updateControllerInputs() {
    updateControllerManager(this.controllers);

    this.controllerInput = getAllControllerInputs(this.controllers);
    const assignments = resolveControllerPlayerAssignments(
      this.controllerInput,
      this.hostControllerSlotIndex
    );
    const controllerNowActive = !!assignments.player1;

    this.hostControllerSlotIndex = assignments.player1?.slotIndex ?? null;

    if (controllerNowActive && !this.primaryControllerActive) {
      this.keys.clear();
      this.keyboardAttackHeld = false;
      this.pointerAttackHeld = false;
      this.pointerBlockHeld = false;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.sprintHeld = false;
      this.input.blockHeld = false;
      this.input.dashPressed = false;
      this.clearAbilityInputEdges(true);
    }

    this.primaryControllerActive = controllerNowActive;
    this.reconcileCoopControllerAssignments(assignments.additionalPlayers);
  }

  getPrimaryControllerInput() {
    const assignments = resolveControllerPlayerAssignments(
      this.controllerInput,
      this.hostControllerSlotIndex
    );

    return assignments.player1 || this.mobileControls?.input || { slotIndex: -1, connected: false };
  }

  getHostControllerSlotIndex() {
    const primary = resolveControllerPlayerAssignments(
      this.controllerInput,
      this.hostControllerSlotIndex
    ).player1;

    return primary ? Number(primary.slotIndex) : null;
  }

  getConnectedControllerInputs() {
    return (this.controllerInput || []).filter(input => input?.connected);
  }

  reconcileCoopControllerAssignments(additionalControllerInputs = []) {
    const allowedSlots = new Set(
      additionalControllerInputs.map(input => Number(input.slotIndex))
    );
    const invalidPlayers = getActiveCoopPlayers(this.player).filter(ally => {
      if (ally.networkRemote) return false;
      return !allowedSlots.has(Number(ally.controllerSlotIndex));
    });

    for (const ally of invalidPlayers) {
      leaveCouchCoopPlayer(this, ally, { reason: 'controllerDisconnected' });
      this.actorGameViews.delete?.(ally);
    }
  }

  getAllControllerInputsForUi() {
    const connected = this.getConnectedControllerInputs();

    // Touch buttons/joysticks drive gameplay, not gamepad menu focus. Feeding
    // their always-connected idle state into menus continually reveals the
    // selected tab and pulls native touch scrolling back to the top.
    const fallback=this.getPrimaryControllerInput();
    return connected.length ? connected : fallback.mobile ? [] : [fallback];
  }

  getActorForControllerInput(input) {
    if (input?.mobile) return this.player;
    return getCouchCoopActorForControllerInput(this, input);
  }

  getActorGameView(actor = this.player) {
    if (!actor || actor === this.player) return this;

    const existing = this.actorGameViews.get(actor);
    if (existing) return existing;

    const view = Object.create(this);
    view.hostGame = this;
    view.player = actor;
    view.uiState = null;
    view.uiControllerState = null;
    view.uiSkillTreeControllerState = null;
    view.log = this.log;
    view.shake = this.shake.bind(this);
    view.renderPauseMenu = this.renderPauseMenu.bind(this);
    view.save = showLog => {
      const saved = saveCouchCoopProfile(this, actor);
      if (showLog && saved) this.log(`${actor.name || `Player ${getCouchCoopActorSlot(actor)}`} profile saved.`);
      return saved;
    };

    this.actorGameViews.set(actor, view);
    return view;
  }

  setUiOwner(actor = this.player) {
    const owner = actor || this.player;
    this.uiOwner = owner;
    this.uiMenuView = this.getActorGameView(owner);

    const slot = getCouchCoopActorSlot(owner);
    const panel = document.querySelector('.panel');
    if (panel) {
      panel.dataset.ownerSlot = String(slot);
      this.applyOwnedMenuViewport(panel, owner);
    }
    document.body.dataset.uiOwnerSlot = String(slot);

    return this.uiMenuView;
  }

  applyOwnedMenuViewport(element, actor = this.player) {
    if (!element || !this.canvas) return null;

    const viewport = this.getMenuViewportForActor(actor);
    const canvasWidth = Math.max(1, Number(this.canvas.width || window.innerWidth || 1));
    const canvasHeight = Math.max(1, Number(this.canvas.height || window.innerHeight || 1));
    const left = Math.max(0, Math.min(100, viewport.x / canvasWidth * 100));
    const top = Math.max(0, Math.min(100, viewport.y / canvasHeight * 100));
    const width = Math.max(1, Math.min(100, viewport.width / canvasWidth * 100));
    const height = Math.max(1, Math.min(100, viewport.height / canvasHeight * 100));
    const compact = viewport.width < canvasWidth * 0.76 || viewport.height < canvasHeight * 0.76;

    element.dataset.compactViewport = compact ? 'true' : 'false';
    element.style.setProperty('--owner-viewport-left', `${left}vw`);
    element.style.setProperty('--owner-viewport-top', `${top}vh`);
    element.style.setProperty('--owner-viewport-width', `${width}vw`);
    element.style.setProperty('--owner-viewport-height', `${height}vh`);

    return viewport;
  }

  getMenuViewportForActor(actor = this.player) {
    const members = getActiveLocalPlayers(this.player);

    if (members.length <= 1) {
      return { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
    }

    const index = Math.max(0, members.indexOf(actor));
    const viewports = this.getSplitViewportsForMemberCount(members.length);
    return viewports[index] || viewports[0];
  }

  renderOwnedUI(options = {}) {
    const view = this.setUiOwner(this.uiOwner || this.player);
    renderUI(view.player, this.logLines, view, options);
  }

  inputOwnsActor(input, actor) {
    return !!actor && this.getActorForControllerInput(input) === actor;
  }

  inputOwnsOverlay(input, overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay?.classList.contains('active')) return false;

    const actor = this.getActorForControllerInput(input);
    const ownerSlot = Number(overlay.dataset.ownerSlot || 1);
    return !!actor && getCouchCoopActorSlot(actor) === ownerSlot;
  }

  handleControllerGlobalInput(now) {
    if(this.deathScreen?.active&&this.deathScreen.handleController(this.getAllControllerInputsForUi()))return true;
    if(handleMalakarInput(this))return true;
    const controllerInputs = this.getAllControllerInputsForUi();

    if (this.world?.mode === 'act1Opening' && !isBlockingDomOverlayActive() && controllerInputs.some(input => input?.confirmPressed || input?.cancelPressed || input?.backPressed)) {
      requestAct1OpeningSkip(this);
      return true;
    }

    for (const input of controllerInputs) {
      if(this.onlineSession?.handleMenuInput(input))return true;
      if (controllerInputShouldWakeAudio(input)) {
        if(!input.mobile)noteControllerMenuInput();
        unlockAudio();
      }

      if (handleCouchCoopJoinMenuControllerInput(input)) {
        if (input?.confirmPressed || input?.cancelPressed || input?.upPressed || input?.downPressed || input?.leftPressed || input?.rightPressed) {
          playSfx(input?.cancelPressed ? 'menuBack' : 'ui', { volume: 0.75, throttle: 0.12 });
        }
        return true;
      }

      if (
        controllerHasMenuAction(input) &&
        handlePvpArenaControllerInput(this, input)
      ) {
        if (input?.confirmPressed || input?.cancelPressed || input?.upPressed || input?.downPressed || input?.leftPressed || input?.rightPressed) {
          playSfx(input?.cancelPressed ? 'menuBack' : 'ui', { volume: 0.65, throttle: 0.12 });
        }
        return true;
      }

      if (
        controllerHasMenuAction(input, true) &&
        this.inputOwnsOverlay(input, 'fishingMiniGameOverlay') &&
        handleFishingMiniGameInput(this, input)
      ) {
        if (input?.confirmPressed || input?.attackPressed || input?.cancelPressed || input?.upPressed || input?.downPressed || input?.leftPressed || input?.rightPressed) {
          playSfx(input?.cancelPressed ? 'menuBack' : 'ui', { volume: 0.65, throttle: 0.12 });
        }
        return true;
      }

      if(controllerHasMenuAction(input)&&this.inputOwnsOverlay(input,'workshopServiceOverlay')&&handleWorkshopControllerInput(input))return true;
      if (
        controllerHasMenuAction(input) &&
        this.inputOwnsOverlay(input, 'marketShopOverlay') &&
        handleMarketShopControllerInput(input)
      ) {
        if (input?.confirmPressed || input?.cancelPressed || input?.upPressed || input?.downPressed || input?.leftPressed || input?.rightPressed) {
          playSfx(input?.cancelPressed ? 'menuBack' : 'ui', { volume: 0.65, throttle: 0.12 });
        }
        return true;
      }

      if (
        controllerHasMenuAction(input) &&
        this.inputOwnsOverlay(input, 'characterCreatorOverlay') &&
        handleCharacterCreatorControllerInput(input)
      ) {
        if (input?.confirmPressed || input?.cancelPressed || input?.upPressed || input?.downPressed || input?.leftPressed || input?.rightPressed) {
          playSfx(input?.cancelPressed ? 'menuBack' : 'ui', { volume: 0.75, throttle: 0.12 });
        }
        return true;
      }
    }

    for (const input of controllerInputs) {
      if (!input?.dropOutPressed) continue;

      const actor = this.getActorForControllerInput(input);
      if (!actor || actor === this.player) continue;

      this.confirmAndLeaveCoopSessionForActor(actor);
      return true;
    }

    if (this.paused) {
      for (const input of controllerInputs) {
        const actor = this.getActorForControllerInput(input);
        const hostSlot = this.getHostControllerSlotIndex();
        if (actor && actor !== this.player) continue;
        if (!actor && (!Number.isFinite(hostSlot) || input.slotIndex !== hostSlot)) continue;

        if (this.handlePauseMenuControllerInput(input)) {
          return true;
        }
      }

      return true;
    }

    const panelOpen = !!document.querySelector('.panel.open');

    for (const input of controllerInputs) {
      if (input?.dropOutPressed) continue;

      const actor = this.getActorForControllerInput(input);
      if (!actor) continue;
      if (panelOpen && actor !== this.uiOwner) continue;
      if (!panelOpen && !input.backPressed) continue;

      const view = this.setUiOwner(actor);
      if (handleGameUiControllerInput(view, input)) {
        if(controllerHasMenuAction(input))playSfx(input?.cancelPressed || input?.backPressed ? 'menuBack' : 'ui', { volume: 0.62, throttle: 0.08 });
        return true;
      }
    }

    for (const input of controllerInputs) {
      if (input?.dropOutPressed) continue;

      if (input?.pausePressed) {
        const actor = this.getActorForControllerInput(input);
        if (actor && actor !== this.player) {
          toggleGameMenuChooser(this.setUiOwner(actor));
          playSfx('ui', { volume: 0.75, throttle: 0.08 });
          return true;
        }

        const hostSlot = this.getHostControllerSlotIndex();
        if (!actor && (!Number.isFinite(hostSlot) || input.slotIndex !== hostSlot)) continue;

        this.pauseOwner = actor || this.player;
        playSfx('ui', { volume: 0.75, throttle: 0.08 });
        this.togglePause();
        return true;
      }
    }

    if (!this.dialogue?.active) {
      for (const input of controllerInputs) {
        if (input?.dropOutPressed) continue;

        if (input?.customizePressed) {
          const actor = this.getActorForControllerInput(input);
          if (!actor) continue;
          playSfx('ui', { volume: 0.75, throttle: 0.08 });
          openCharacterCreator(this.setUiOwner(actor));
          return true;
        }
      }
    }

    return false;
  }

  handlePauseMenuControllerInput(input) {
    if (!input?.connected) return false;

    const overlay = document.getElementById('pauseOverlay');
    if (!overlay?.classList.contains('active')) return false;

    if (handleMenuSheetInput(input, overlay)) { this.pauseMenuFocusIndex = 0; return true; }

    const focusables = Array.from(overlay.querySelectorAll('button'))
      .filter(element => {
        if (!element || element.disabled || !menuSheetItemVisible(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

    if (!focusables.length) {
      if (input.cancelPressed || input.backPressed || input.pausePressed) {
        playSfx('menuBack', { volume: 0.75, throttle: 0.08 });
        this.togglePause(false);
        return true;
      }

      return false;
    }

    this.pauseMenuFocusIndex = Math.max(
      0,
      Math.min(focusables.length - 1, this.pauseMenuFocusIndex || 0)
    );

    const direction=menuDirection(input);
    if(direction){
      this.pauseMenuFocusIndex=focusables.indexOf(directionalMenuItem(focusables,focusables[this.pauseMenuFocusIndex],direction));
      this.applyPauseMenuFocus(focusables);
      playSfx('ui',{volume:.58,throttle:.1});return true;
    }

    if (input.confirmPressed) {
      this.applyPauseMenuFocus(focusables);
      focusables[this.pauseMenuFocusIndex]?.click?.();
      playSfx('ui', { volume: 0.65, throttle: 0.1 });
      return true;
    }

    if (input.cancelPressed || input.backPressed || input.pausePressed) {
      playSfx('menuBack', { volume: 0.75, throttle: 0.1 });
      this.togglePause(false);
      return true;
    }

    this.applyPauseMenuFocus(focusables);
    return true;
  }

  applyPauseMenuFocus(focusables = null) {
    const overlay = document.getElementById('pauseOverlay');
    if (!overlay) return;

    const items = focusables || Array.from(overlay.querySelectorAll('button'))
      .filter(element => {
        if (!element || element.disabled || !menuSheetItemVisible(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

    overlay.querySelectorAll('.game-ui-controller-focus').forEach(element => {
      element.classList.remove('game-ui-controller-focus');
    });

    if (!items.length) return;

    this.pauseMenuFocusIndex = Math.max(0, Math.min(items.length - 1, this.pauseMenuFocusIndex || 0));
    const selected = items[this.pauseMenuFocusIndex];

    selected?.classList.add('game-ui-controller-focus');
    selected?.focus?.({ preventScroll: true });
    selected?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  leaveCoopSessionForActor(actor) {
    if (!actor || actor === this.player) return false;

    const view = this.getActorGameView(actor);

    if (this.uiOwner === actor) {
      closeGameMenu(view);
      this.setUiOwner(this.player);
    }

    const left = leaveCouchCoopPlayer(this, actor, { reason: 'menu' });
    this.actorGameViews.delete?.(actor);
    this.currentSplitLayout = null;
    renderUI(this.player, this.logLines, this);
    return left;
  }

  confirmAndLeaveCoopSessionForActor(actor) {
    if (!actor || actor === this.player) return false;

    if (typeof window !== 'undefined') {
      const slot = getCouchCoopActorSlot(actor);
      const name = actor.name || `Player ${slot}`;
      const confirmed = window.confirm(`Save and remove ${name} from the current session?`);
      if (!confirmed) return false;
    }

    return this.leaveCoopSessionForActor(actor);
  }

  leavePauseOwnerSession() {
    const owner = this.pauseOwner || this.uiOwner || this.player;

    if (!owner || owner === this.player) return false;

    const left = this.confirmAndLeaveCoopSessionForActor(owner);
    this.pauseOwner = this.player;
    if (left) this.togglePause(false);
    return left;
  }

  handleGameplayControllerInput(now, dt = 0) {
    const primary = this.getPrimaryControllerInput();

    if (!primary?.connected) return;

    if (!canPvpActorAct(this.player, this.world)) {
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.dashPressed = false;
      this.interactLock = false;
      return;
    }

    if (processReviveInput(this, this.player, primary, dt, now)) {
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.dashPressed = false;
      this.interactLock = !!(primary.interactHeld || primary.confirmHeld);
      return;
    }

    if (primary.dashPressed) {
      this.input.dashPressed = true;
      playSfx('attack', { volume: 0.45, throttle: 0.12 });
    }

    if (primary.attackPressed) {
      this.input.attackPressed = true;
    }

    if (primary.attackReleased) {
      this.input.attackReleased = true;
    }

    for (let slot = 0; slot < HOTBAR_SLOT_COUNT; slot++) {
      this.input[`ability${slot}Pressed`] ||= !!primary[`ability${slot}Pressed`];
      this.input[`ability${slot}Held`] = !!primary[`ability${slot}Held`];
      this.input[`ability${slot}Released`] ||= !!primary[`ability${slot}Released`];
    }

    if (primary.interactPressed && !this.interactLock) {
      playSfx('ui', { volume: 0.55, throttle: 0.08 });
      this.interact();
      this.interactLock = true;
    }

    if (!primary.confirmHeld) {
      this.interactLock = false;
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN LOOP
  // ---------------------------------------------------------------------------

  loop(time) {
    if (!this.started) return;

    const dt = Math.min(0.033, (time - this.last) / 1000);
    this.last = time;

    const now = time / 1000;
    this.deathScreen?.update(now);

    this.updateControllerInputs();
    this.mobileControls?.update(now);
    if (this.developerEditor && !this.developerEditor.shouldRunGameplay()) {
      this.developerEditor.handleControllerInput(this.controllerInput);
    } else {
      this.handleControllerGlobalInput(now);
    }

    if (this.onlineSession?.role === 'guest') {
      this.onlineSession.updateGuest(dt);
    } else if (!this.paused&&!this.deathScreen?.active) {
      this.update(dt, now);
    }
    this.onlineSession?.updateHost(dt);

    this.updateScreenShake(dt);
    this.buildRenderCamera();
    this.updateAudioState();

    document.body.classList.toggle(
      'dialogue-active',
      !!this.dialogue?.active &&
      (this.dialogue.actor || this.player) === this.player &&
      getActiveCoopPlayers(this.player).filter(actor=>!actor.networkRemote).length === 0
    );

    this.drawWorld();
    this.developerEditor?.draw(this.ctx, this.renderCamera);
    renderMinimapHud(this);

    if (this.dialogue?.active && !this.dialogue.actor?.networkRemote) {
      drawDialogueUI(this.ctx, this.dialogue, {
        touchControls: !!this.mobileControls && !this.primaryControllerActive,
        viewport: this.getDialogueViewport(this.dialogue.actor || this.player)
      });
    }

    this.uiTimer -= dt;

    if (this.uiTimer <= 0) {
      if (!document.querySelector('.panel.open')) {
        this.renderOwnedUI({ hudOnly: true });
      }
      this.uiTimer = 0.2;
    }

    this.mobileControls?.endFrame();
    requestAnimationFrame(nextTime => this.loop(nextTime));
  }

  update(dt, now) {
    if(this.deathScreen?.active)return;
    updateWorkshopService(this);
    if(updateMalakarEncounter(this,dt)){this.input.moveX=0;this.input.moveY=0;this.input.attackHeld=false;this.input.attackPressed=false;this.input.dashPressed=false;return;}
    updateContinentalWorld(this, dt);
    if (this.developerEditor && !this.developerEditor.shouldRunGameplay()) {
      this.developerEditor.update(dt, now);
      if (this.developerEditor.simulationEnabled) {
        const mode = this.developerEditor.simulationMode;
        if (!this.developerEditor.aiPaused && ['active', 'full'].includes(mode)) {
          updateEnemies(dt, this.player, this.world, this.log, now, this);
          this.updateAmbientNpcs(dt);
        }
        if (mode === 'full') {
          this.updateRespawns(dt);
          updateOverworldEncounters(this, dt, now);
        }
        if (this.developerEditor.lightingEnabled) this.updateWorldEffects(dt);
      }
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.dashPressed = false;
      return;
    }

    migratePlayer(this.player);
    ensurePlayerDialogueAndQuestState(this.player);

    updateDialogue(this.dialogue, dt);
    this.handlePendingDialogueAction();
    if (!this.developerEditor || this.developerEditor.questsEnabled) {
      updateAct1Opening(this, dt, now);
      updateOldWellQuest(this, dt, now);
      updateAct1Campaign(this, dt);
      this.applyPendingQuestRewards();
    }
    if (this.world?.mode === 'act1Opening') {
      this.input.moveX = 0; this.input.moveY = 0; this.input.attackHeld = false;
      this.input.attackPressed = false; this.input.attackReleased = false; this.input.dashPressed = false;
      this.camera.x = this.player.x - this.canvas.width / 2;
      this.camera.y = this.player.y - this.canvas.height / 2;
      return;
    }
    if(document.getElementById('yourOrderLedger')){
      this.input.moveX=0;this.input.moveY=0;this.input.attackHeld=false;
      this.input.attackPressed=false;this.input.attackReleased=false;this.input.dashPressed=false;
      return;
    }
    updateFishingMiniGame(this, dt);

    if (this.dialogue.active && !this.dialogue.actor?.networkRemote) {
      const controllerInputs = this.getAllControllerInputsForUi();
      const actor = this.dialogue.actor || this.player;

      for (const input of controllerInputs) {
        if (!this.inputOwnsActor(input, actor)) continue;

        const handled = this.routeDialogueInput(
          this.dialogue,
          createDialogueInputFromController(input),
          actor,
          this.world
        );

        if (handled) {
          this.renderOwnedUI();
          break;
        }
      }

      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.dashPressed = false;
      cancelActiveHeavyAttackCharge(this.player, this.world);

    }

    if (this.couchCoopJoinMenu?.active) {
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.dashPressed = false;
      cancelActiveHeavyAttackCharge(this.player, this.world);
      return;
    }

    if (this.isActorInterfaceBusy(this.player)) {
      cancelActiveAbilityCharge(this.player);
      cancelActiveHeavyAttackCharge(this.player, this.world);
      this.updateCoopWorldWhileHostBusy(dt, now);
      return;
    }

    const discoveredPois = updatePoiDiscovery(this.player, this.world);

    for (const poiId of discoveredPois) {
      const poi = getPoi(poiId);

      if (poi) {
        this.log(poi.discoveredText || `${poi.name} discovered.`);
        showPoiArrival(this.player, poi);

        addStatusText(this.player, poi.name || 'Location Discovered', {
          color: '#d9ad4f'
        });
      }
    }

    this.updateLastSafeLocation();
    updateCoopReviveTimers(this, dt, now);
    if(this.deathScreen?.active)return;

    this.updateInputMovement();
    this.handleGameplayControllerInput(now, dt);
    updatePvpArena(this, dt, now);

    if (this.player.reviveAction?.active && !this.getPrimaryControllerInput()?.connected) {
      processReviveInput(this, this.player, {}, dt, now);
    }

    const hostPvpEliminated = isPvpActorEliminated(this.player, this.world);
    const hostPvpActionLocked = !canPvpActorAct(this.player, this.world);

    if (this.player.hp <= 0 && this.world?.mode !== 'pvpArena' && !hostPvpEliminated) {
      if (!handleActorZeroHpForCoop(this, this.player, now)) {
        this.handlePlayerDefeated();
      }
    }

    if(this.deathScreen?.active)return;

    const hostControlLocked = isActorControlLockedByRevive(this.player) || hostPvpActionLocked;

    if (hostControlLocked) {
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.input.dashPressed = false;
      cancelActiveHeavyAttackCharge(this.player, this.world);
    } else {
      recoverPassiveSpirit(this.player, dt);
    }

    updateFloatingTexts(this.player, dt);

    for (const ally of this.player.coop?.players || []) {
      updateFloatingTexts(ally, dt);
    }

    if (!hostControlLocked) {
      updateAbilityInput(this.player, this.world, this.input, dt, now, this.log);
      updateCombat(this.player, this.world, this.input, dt, now, this.log);

      this.move(dt);
    }
    updateCouchCoop(this, dt, now, this.getCoopControllerInputs());
    updateCoopReviveTimers(this, dt, now);
    if(this.deathScreen?.active)return;
    updateMinimapExploration(this);
    updateWorldExploration(this, dt);

    if (!this.developerEditor || !this.developerEditor.aiPaused) {
      updateEnemies(dt, this.player, this.world, this.log, now, this);
      updateOverworldEncounters(this, dt, now);
      this.updateRespawns(dt);
      this.updateAmbientNpcs(dt);
    }
    updateSummons(dt, this.player, this.world, this.log, now);
    updateWorldLootPickups(this.world, this.player, dt, this.log);
    updateTowerState(this);
    updateSideZoneState(this);
    this.refreshPoiWorldState();

    if (!this.developerEditor || this.developerEditor.lightingEnabled) this.updateWorldEffects(dt);
    this.checkProgressionFeedback();

    const cameraFocus = this.isSharedPartyCameraMode()
      ? getSharedPartyCameraFocus(this.player)
      : getPartyCameraFocus(this.player);
    if(this.world?.dungeonState?.malakar?.mode==='active'){const boss=this.world.enemies.find(e=>e.malakarSolo);if(boss){cameraFocus.x=(cameraFocus.x+boss.x)/2;cameraFocus.y=(cameraFocus.y+boss.y-130)/2;}}
    this.camera.x += (cameraFocus.x - this.canvas.width / 2 - this.camera.x) * 0.12;
    this.camera.y += (cameraFocus.y - this.canvas.height / 2 - this.camera.y) * 0.12;

    this.input.attackPressed = false;
    this.input.attackReleased = false;
    this.input.dashPressed = false;
    this.clearAbilityInputEdges();
  }

  clearAbilityInputEdges(clearHeld = false) {
    for (let slot = 0; slot < HOTBAR_SLOT_COUNT; slot++) {
      this.input[`ability${slot}Pressed`] = false;
      this.input[`ability${slot}Released`] = false;
      if(clearHeld)this.input[`ability${slot}Held`] = false;
    }
    if(clearHeld&&this.player?.actionState)this.player.actionState.blocking=false;
  }

  updateCoopWorldWhileHostBusy(dt, now) {
    this.input.moveX = 0;
    this.input.moveY = 0;
    this.input.attackHeld = false;
    this.input.attackPressed = false;
    this.input.attackReleased = false;
    this.input.sprintHeld = false;
    this.input.blockHeld = false;
    this.input.dashPressed = false;
    cancelActiveHeavyAttackCharge(this.player, this.world);

    updateFloatingTexts(this.player, dt);
    for (const ally of this.player.coop?.players || []) {
      updateFloatingTexts(ally, dt);
    }

    updateCouchCoop(this, dt, now, this.getCoopControllerInputs());
    updateMinimapExploration(this);
    updateWorldExploration(this, dt);
    if (!this.developerEditor || !this.developerEditor.aiPaused) {
      updateEnemies(dt, this.player, this.world, this.log, now, this);
      updateOverworldEncounters(this, dt, now);
      this.updateRespawns(dt);
      this.updateAmbientNpcs(dt);
    }
    updateSummons(dt, this.player, this.world, this.log, now);
    updateWorldLootPickups(this.world, this.player, dt, this.log);
    updateTowerState(this);
    updateSideZoneState(this);
    this.refreshPoiWorldState();
    if (!this.developerEditor || this.developerEditor.lightingEnabled) this.updateWorldEffects(dt);

    if (this.player.hp <= 0) {
      if (!handleActorZeroHpForCoop(this, this.player, now)) {
        this.handlePlayerDefeated();
      }
    }

    const cameraFocus = this.isSharedPartyCameraMode()
      ? getSharedPartyCameraFocus(this.player)
      : getPartyCameraFocus(this.player);
    if(this.world?.dungeonState?.malakar?.mode==='active'){const boss=this.world.enemies.find(e=>e.malakarSolo);if(boss){cameraFocus.x=(cameraFocus.x+boss.x)/2;cameraFocus.y=(cameraFocus.y+boss.y-130)/2;}}
    this.camera.x += (cameraFocus.x - this.canvas.width / 2 - this.camera.x) * 0.12;
    this.camera.y += (cameraFocus.y - this.canvas.height / 2 - this.camera.y) * 0.12;
  }

  isActorInterfaceBusy(actor) {
    if (!actor) return false;
    if(actor===this.player&&document.querySelector('#onlineMultiplayerOverlay.active'))return true;
    if(this.workshopService?.active&&this.workshopService.actor===actor)return true;

    if (this.dialogue?.active && (this.dialogue.actor || this.player) === actor) {
      return true;
    }

    if (this.fishingMiniGame?.active && this.fishingMiniGame.player === actor) {
      return true;
    }

    if (this.marketShop?.active && this.marketShop.actor === actor) {
      return true;
    }

    const panel = document.querySelector('.panel.open');
    if (panel && this.uiOwner === actor) {
      return true;
    }

    const creator = document.getElementById('characterCreatorOverlay');
    if (
      creator?.classList.contains('active') &&
      Number(creator.dataset.ownerSlot || 1) === getCouchCoopActorSlot(actor)
    ) {
      return true;
    }

    return false;
  }

  handlePendingDialogueAction() {
    const action = this.dialogue?.pendingAction;
    if (!action) return false;

    const actor = this.dialogue.actor || this.player;
    const serviceNpc=this.world.objects.find(o=>o.id===this.dialogue.npcObjectId);
    if (actor.networkRemote && this.onlineSession?.delegateService(actor, action, serviceNpc)) {
      closeDialogue(this.dialogue,{immediate:true});return true;
    }
    this.dialogue.pendingAction = null;
    closeDialogue(this.dialogue, { immediate: true });
    if(action.type==='maraApothecary')return useMaraApothecary(this.setUiOwner(actor),serviceNpc);
    if(['workshopWeapons','workshopArmour','workshopCraft'].includes(action.type)){
      openWorkshopService(this.setUiOwner(actor),serviceNpc,action.type==='workshopWeapons'?'weapons':action.type==='workshopArmour'?'armour':'craft');return true;
    }

    if(action.type==='foundOrder'||action.type==='orderLedger') { openOrderLedger(this,action.type==='foundOrder'); return true; }

    if (action.type === 'shop') {
      openMarketShop(this.setUiOwner(actor));
      return true;
    }

    if (typeof globalThis.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      globalThis.dispatchEvent(new CustomEvent('runalis:dialogue-action', { detail: action }));
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // PLAYER STATE / WORLD UPDATE
  // ---------------------------------------------------------------------------

  drawWorld() {
    const climax=this.world?.dungeonState?.malakar;
    if(['ritual','introduction','handoff','dying'].includes(climax?.mode)){
      const zoom=Math.min(this.canvas.width/1180,this.canvas.height/1100);
      this.ctx.save();this.ctx.scale(zoom,zoom);
      draw(this.ctx,this.world,this.player,{x:640-this.canvas.width/(2*zoom),y:550-this.canvas.height/(2*zoom)},{hideHud:true,viewport:{x:0,y:0,width:this.canvas.width/zoom,height:this.canvas.height/zoom}});
      this.ctx.restore();return;
    }

    const splitMembers = this.getSplitScreenMembers();

    if (!splitMembers) {
      this.currentSplitLayout = null;
      const members = getActiveLocalPlayers(this.player);
      const sharedPartyHud = this.isSharedPartyCameraMode() && members.length > 1;

      draw(this.ctx, this.world, this.player, this.renderCamera, {
        hideHud: sharedPartyHud
      });
      this.drawPartyDirectionIndicators(
        this.player,
        members,
        this.renderCamera,
        { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height }
      );
      if (sharedPartyHud) this.drawSharedPartyHud(members);
      return;
    }

    this.drawSplitScreen(splitMembers);
  }

  updateAudioState() {
    const now = performance.now() / 1000;
    const enemies = (this.world?.enemies || []).filter(enemy => enemy && !enemy.dead && enemy.hp > 0 && !enemy.remove);
    const party = [
      this.player,
      ...(this.player?.coop?.players || []).filter(ally => ally && ally.active !== false)
    ];
    const threats = classifyAdaptiveMusicThreats(enemies, party, now);

    if (threats.combat) this.musicCombatUntil = now + 2.8;
    if (threats.boss) this.musicBossUntil = now + 1.6;

    const combat = threats.combat || now < this.musicCombatUntil;
    const boss = threats.boss || (combat && now < this.musicBossUntil);

    updateAdaptiveMusic({
      paused: this.paused,
      combat,
      boss,
      bossPhase:this.world?.dungeonState?.malakar?.phase||1,
      mode: this.world?.mode || 'overworld'
    });
  }

  getCoopControllerInputs() {
    const local = resolveControllerPlayerAssignments(
      this.controllerInput,
      this.hostControllerSlotIndex
    ).additionalPlayers;
    return [...local,...(this.onlineSession?.getRemoteInputs()||[])];
  }

  getSplitScreenMembers() {
    const members = getActiveLocalPlayers(this.player);

    if (members.length <= 1 || this.isSharedPartyCameraMode()) {
      this.splitScreenActive = false;
      this.cameraMode = members.length > 1 && this.isSharedPartyCameraMode() ? 'sharedParty' : 'singlePlayer';
      return null;
    }

    this.splitScreenActive = true;
    this.cameraMode = 'splitScreen';
    return members.slice(0, 4);
  }

  isSharedPartyCameraMode() {
    if (this.onlineSession?.role) return false;
    return isSharedPartyCameraWorld(this.world);
  }

  drawSplitScreen(members) {
    const viewports = this.getSplitViewportsForMemberCount(members.length);
    const cameras = [];

    for (let i = 0; i < members.length; i++) {
      const viewport = viewports[i];
      const member = members[i];
      const camera = this.buildCameraForActor(member, viewport.width, viewport.height);
      cameras.push(camera);

      draw(this.ctx, this.world, this.player, camera, {
        viewport,
        hideHud: true
      });

      this.drawPartyDirectionIndicators(member, members, camera, viewport);
      drawSplitScreenHud(this.ctx, member, viewport, {
        slot: getCouchCoopActorSlot(member),
        memberCount: members.length,
        game: this
      });
    }

    if (members.length === 3 && viewports[3]) {
      this.drawSplitScreenPartyMap(viewports[3], members);
    }

    this.currentSplitLayout = { members, viewports, cameras };
    this.drawSplitScreenDividers(members, viewports);
  }

  getSplitViewportsForMemberCount(count) {
    const viewportCount = Number(count || 1) === 3 ? 4 : count;
    return getSplitViewports(this.canvas.width, this.canvas.height, viewportCount);
  }

  drawSplitScreenPartyMap(viewport, members) {
    drawMinimapPanel(this.ctx, this, viewport, {
      title: 'Party Map',
      members
    });
  }

  drawSharedPartyHud(members) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const hudWidth = Math.min(292, Math.max(226, Math.floor(width * 0.28)));
    const hudHeight = 154;
    const viewports = [
      { x: 0, y: 0, width: hudWidth, height: hudHeight },
      { x: width - hudWidth, y: 0, width: hudWidth, height: hudHeight },
      { x: 0, y: height - hudHeight, width: hudWidth, height: hudHeight },
      { x: width - hudWidth, y: height - hudHeight, width: hudWidth, height: hudHeight }
    ];

    for (let i = 0; i < members.length && i < viewports.length; i++) {
      const member = members[i];

      drawSplitScreenHud(this.ctx, member, viewports[i], {
        compact: true,
        shared: true,
        slot: getCouchCoopActorSlot(member),
        memberCount: Math.max(3, members.length),
        game: this
      });
    }
  }

  getDialogueViewport(actor) {
    const split = this.currentSplitLayout;

    if (split) {
      const index = split.members.indexOf(actor);
      if (index >= 0) return split.viewports[index];
    }

    return this.getMenuViewportForActor(actor || this.player);
  }

  drawPartyDirectionIndicators(viewer, members, camera, viewport) {
    const ctx = this.ctx;
    const colors = ['#ffcc66', '#73d18a', '#b68cff', '#66f0ff'];
    const inset = 23;
    const left = viewport.x + inset;
    const right = viewport.x + viewport.width - inset;
    const top = viewport.y + inset;
    const bottom = viewport.y + viewport.height - inset;
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;

    for (const target of members) {
      if (!target || target === viewer || target.active === false) continue;

      const worldDistance = Math.hypot((target.x || 0) - (viewer.x || 0), (target.y || 0) - (viewer.y || 0));
      if (worldDistance < 250) continue;

      const screenX = viewport.x + (target.x || 0) - camera.x;
      const screenY = viewport.y + (target.y || 0) - camera.y;
      const visible = screenX >= left && screenX <= right && screenY >= top && screenY <= bottom;
      if (visible) continue;

      const dx = screenX - centerX;
      const dy = screenY - centerY;
      const scaleX = dx === 0 ? Infinity : (dx > 0 ? right - centerX : left - centerX) / dx;
      const scaleY = dy === 0 ? Infinity : (dy > 0 ? bottom - centerY : top - centerY) / dy;
      const scale = Math.max(0, Math.min(Math.abs(scaleX), Math.abs(scaleY)));
      const x = centerX + dx * scale;
      const y = centerY + dy * scale;
      const angle = Math.atan2(dy, dx);
      const slot = getCouchCoopActorSlot(target);
      const color = colors[slot - 1] || '#e8edf5';

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.76;
      ctx.fillStyle = 'rgba(3,6,12,0.72)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 3;
      const label = `P${slot}`;
      ctx.strokeText(label, x, y + 17);
      ctx.fillText(label, x, y + 17);
      ctx.restore();
    }
  }

  buildCameraForActor(actor, width, height) {
    const worldWidth = getWorldPixelWidth(this.world) || width;
    const worldHeight = getWorldPixelHeight(this.world) || height;
    const rawX = (actor?.x || 0) - width / 2;
    const rawY = (actor?.y || 0) - height / 2;

    return {
      x: cameraAxisPosition(rawX, worldWidth, width),
      y: cameraAxisPosition(rawY, worldHeight, height)
    };
  }

  drawSplitScreenDividers(members, viewports) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(3,6,12,0.85)';
    ctx.strokeStyle = 'rgba(255,204,102,0.45)';
    ctx.lineWidth = 1;

    const vertical = new Set();
    const horizontal = new Set();

    for (const viewport of viewports) {
      if (viewport.x > 0) vertical.add(viewport.x);
      if (viewport.y > 0) horizontal.add(viewport.y);
    }

    for (const x of vertical) {
      ctx.fillRect(x - 3, 0, 6, this.canvas.height);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.canvas.height);
      ctx.stroke();
    }

    for (const y of horizontal) {
      ctx.fillRect(0, y - 3, this.canvas.width, 6);
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.canvas.width, y + 0.5);
      ctx.stroke();
    }

    const colors = ['#ffcc66', '#73d18a', '#b68cff', '#66f0ff'];
    for (let i = 0; i < members.length; i++) {
      const viewport = viewports[i];
      const member = members[i];
      drawSplitLabel(ctx, i === 0 ? 'P1' : member?.name || `P${i + 1}`, viewport.x + 16, viewport.y + 18, colors[i] || '#e8edf5');
    }

    ctx.restore();
  }

  handlePlayerDefeated() {
    if(this.deathScreen?.active)return;
    cancelActiveAbilityCharge(this.player);
    cancelActiveHeavyAttackCharge(this.player,this.world);
    this.clearDefeatCombatState(this.player);
    this.clearAbilityInputEdges(true);
    this.keys?.clear();
    this.input.moveX=this.input.moveY=0;
    this.player.hp=0;
    this.player.vx=this.player.vy=0;
    this.player.lifeState='dead';
    this.deathScreen??=createDeathScreen(this);
    this.deathScreen.start();
  }

  completePlayerRespawn() {
    const lostGold = this.applyDeathGoldPenalty();

    this.restorePlayerVitalsAfterDefeat(this.player);
    this.clearDefeatCombatState(this.player);
    this.respawnAtLastSafeLocation();
    this.keys?.clear();
    this.clearAbilityInputEdges(true);

    if (lostGold > 0) this.log(`Death penalty: lost ${lostGold} gold.`);
    this.log('You were returned to the nearest Nav Stone.');
    this.shake(8, 0.18);

    addSpiritText(this.player, 'Returned to Nav Stone', {
      ttl: 1.2,
      size: 14
    });
    this.renderOwnedUI();
  }

  applyDeathGoldPenalty() {
    const gold = Math.max(0, Math.floor(Number(this.player.gold || 0)));
    if (gold <= 0) return 0;

    const lost = Math.min(gold, Math.max(1, Math.floor(gold * 0.12)));
    this.player.gold = gold - lost;
    return lost;
  }

  restorePlayerVitalsAfterDefeat(player) {
    if (!player) return;

    player.hp = Math.max(1, Math.floor((player.maxHp || 100) * 0.45));
    player.stamina = Math.max(35, Math.floor((player.maxStamina || 100) * 0.35));

    if (player.spiritAwakened) {
      player.spirit = Math.max(0, Math.floor((player.maxSpirit || 0) * 0.25));
    }
  }

  clearDefeatCombatState(player) {
    if (!player) return;

    clearCoopReviveState(player);

    if (player.actionState) {
      player.actionState.sprinting = false;
      player.actionState.blocking = false;
      player.actionState.dashing = false;
      player.actionState.guardBroken = false;
      player.actionState.dashTimer = 0;
    }

    if (player.flags) {
      player.flags.guarding = false;
    }

    if (player.combatState) {
      player.combatState.attacking = false;
      player.combatState.comboStep = 0;
      player.combatState.hitTargets = [];
      player.combatState.projectiles = [];
      player.combatState.heavyChargeActive = false;
      player.combatState.heavyChargeTime = 0;
      player.combatState.heavyChargeReady = false;
      player.combatState.attackLungeRemaining = 0;
    }

    player.summons = Array.isArray(player.summons)
      ? player.summons.filter(summon => summon && summon.alive !== false && summon.hp > 0)
      : [];

    this.input.attackHeld = false;
    this.input.attackPressed = false;
    this.input.attackReleased = false;
    this.input.blockHeld = false;
    this.input.dashPressed = false;
    this.input.sprintHeld = false;
  }

  updateLastSafeLocation() {
    if (!this.player || !this.world) return;

    const safeMode = ['capital', 'hub', 'town'].includes(this.world.mode);
    if (!safeMode && !this.world.safeZone) return;

    this.rememberSafeLocation('safeZone');
  }

  rememberSafeLocation(reason = 'safe') {
    if (!this.player || !this.world) return;

    this.player.lastSafeLocation = {
      worldMode: this.world.mode || 'overworld',
      worldName: normalizePlayerFacingWorldName(this.world.name || this.player.currentZone, ACT1_OVERWORLD_DISPLAY_NAME),
      regionId: this.world.regionId || null,
      x: Number(this.player.x || 11 * TILE),
      y: Number(this.player.y || 27 * TILE),
      recordedAt: Date.now(),
      reason
    };
  }

  respawnAtLastSafeLocation() {
    // Every death uses the same surface destination, including failed instances.
    rememberRepeatableInstance(this,{failed:true});
    if(this.world?.mode==='dungeon')exitDungeon(this,{force:true});
    if(this.world?.mode==='sideZone')exitSideZone(this);
    if(this.world?.mode==='tower')exitTower(this,{force:true});
    if(!this.world?.navStones?.length){
      this.world=createWorld({spawnRegionId:this.player.lastSafeLocation?.regionId});
      this.overworldState=null;
      Object.assign(this.player,this.world.spawn);
    }
    const stone=placeAtNavStone(this,this.player);

    this.player.dirX = 0;
    this.player.dirY = 1;
    this.player.currentPosition = {
      x: this.player.x,
      y: this.player.y
    };

    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
    this.placeCoopPlayersNearHost();
    this.rememberSafeLocation('respawn');
    this.world.continentRuntime?.refresh?.(this);
    if(stone)discoverStone(this,stone);
  }

  respawnActorAtNavStone(actor) {
    if(actor===this.player||!this.world?.navStones?.length){
      this.respawnAtLastSafeLocation();
      return;
    }
    const stone=placeAtNavStone(this,actor);
    if(stone)discoverStone(this,stone);
  }

  placeCoopPlayersNearHost() {
    const allies = Array.isArray(this.player.coop?.players)
      ? this.player.coop.players.filter(ally => ally && ally.active !== false)
      : [];
    const offsets = [
      { x: -TILE, y: 0 },
      { x: TILE, y: 0 },
      { x: 0, y: TILE }
    ];

    for (let i = 0; i < allies.length; i++) {
      const ally = allies[i];
      const offset = offsets[i] || { x: (i - 1) * TILE, y: TILE };

      this.restorePlayerVitalsAfterDefeat(ally);
      this.clearDefeatCombatState(ally);
      ally.x = this.player.x + offset.x;
      ally.y = this.player.y + offset.y;
      ally.dirX = this.player.dirX;
      ally.dirY = this.player.dirY;
      ally.currentZone = this.player.currentZone;
      ally.vx = 0;
      ally.vy = 0;
      ally.currentPosition = {x:ally.x,y:ally.y};
    }
  }

  updateInputMovement() {
    const primary = this.getPrimaryControllerInput();
    let dx = 0;
    let dy = 0;
    // A fresh mouse move can steer a charge even with an idle gamepad plugged
    // in. Moving either stick returns aim to the controller immediately.
    if (primary?.connected && !primary.mobile && primary.hasAim) this.mouseAimPosition = null;
    if (this.mouseAimPosition) {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouseWorldX = (this.mouseAimPosition.x-rect.left)*this.canvas.width/rect.width + this.camera.x;
      this.input.mouseWorldY = (this.mouseAimPosition.y-rect.top)*this.canvas.height/rect.height + this.camera.y;
    }

    if (primary?.connected) {
      dx = primary.moveX || 0;
      dy = primary.moveY || 0;

      this.input.sprintHeld = !!primary.sprintHeld;
      this.input.blockHeld = !!primary.blockHeld;
      this.input.attackHeld = !!primary.attackHeld;

      const aimInput = !primary.mobile && this.mouseAimPosition ? {
        ...primary, mouseAimActive:true, mouseWorldX:this.input.mouseWorldX, mouseWorldY:this.input.mouseWorldY
      } : primary;
      const aim = resolveActorCombatAim(this.player, aimInput);
      writeCombatAimToInput(this.input, this.player, aim, 160);
      applyCombatAimFacing(this.player, aim, { onlyRightStick: !this.input.attackHeld });
    } else {
      if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

      // Keep the cursor attached to its screen position as the camera moves.
      const aim = resolveActorCombatAim(this.player, {
        moveX:dx, moveY:dy, mouseAimActive:!!this.mouseAimPosition,
        mouseWorldX:this.input.mouseWorldX, mouseWorldY:this.input.mouseWorldY
      });
      writeCombatAimToInput(this.input, this.player, aim, 160);
      applyCombatAimFacing(this.player, aim, {onlyExplicitAim:true});
      this.input.sprintHeld = this.keys.has('shift');
      this.input.blockHeld = !!this.pointerBlockHeld;
      this.input.attackHeld = this.keyboardAttackHeld || this.pointerAttackHeld;
      for (let slot = 0; slot < HOTBAR_SLOT_COUNT; slot++) {
        this.input[`ability${slot}Held`] = [...this.keys].some(key => getKeyboardAbilitySlot(key, this.player) === slot);
      }
    }

    if (dx || dy) {
      const magnitude = Math.hypot(dx, dy) || 1;
      dx /= magnitude;
      dy /= magnitude;
    }

    this.input.moveX = dx;
    this.input.moveY = dy;
  }

  updateRespawns(dt) {
    for (const object of this.world.objects || []) {
      if (!object.depleted) continue;

      object.respawn -= dt;

      if (object.respawn <= 0 && [this.player, ...(this.player.coop?.players || [])].every(a => a.active === false || Math.hypot(a.x-object.x,a.y-object.y)>700)) {
        object.depleted = false;
      }
    }
  }

  updateAmbientNpcs(dt) {
    updateSimulatedSubclassPlayers(this,dt);
    if (!this.world?.objects?.length) return;

    const stepDt = Math.min(0.08, Math.max(0, Number(dt || 0)));
    if (stepDt <= 0) return;

    for (const npc of this.world.objects) {
      if (!npc?.ambientWander || npc.kind !== 'npc' || npc.depleted || npc.simulatedInCombat) continue;

      this.ensureAmbientWanderState(npc);

      // Do not coerce null here: Number(null) is 0, which previously made an
      // idle NPC treat the north-west corner of the world as its destination.
      const hasTarget = hasAmbientWanderTarget(npc);
      const dx = hasTarget ? Number(npc.wanderTargetX) - Number(npc.x || 0) : 0;
      const dy = hasTarget ? Number(npc.wanderTargetY) - Number(npc.y || 0) : 0;
      const distance = Math.hypot(dx, dy);

      if (!hasTarget || distance <= 4) {
        if (hasTarget) {
          npc.wanderCooldown = this.getAmbientWanderPause(npc);
        } else {
          npc.wanderCooldown = Math.max(0, Number(npc.wanderCooldown || 0) - stepDt);
        }

        npc.wanderTargetX = null;
        npc.wanderTargetY = null;
        npc.isMoving = false;

        if (npc.wanderCooldown <= 0) {
          const picked = this.pickAmbientWanderTarget(npc);
          if (!picked) npc.wanderCooldown = this.getAmbientWanderPause(npc);
        }

        continue;
      }

      const speed = Math.max(4, Number(npc.wanderSpeed || 18));
      const moveDistance = Math.min(distance, speed * stepDt);
      const startX = Number(npc.x || 0);
      const startY = Number(npc.y || 0);
      const moved = moveActorWithCollision(
        npc,
        this.world,
        (dx / distance) * moveDistance,
        (dy / distance) * moveDistance,
        Number(npc.wanderCollisionRadius || 8)
      );

      if (moved) {
        const actualDx = Number(npc.x || 0) - startX;
        const actualDy = Number(npc.y || 0) - startY;
        const actualDistance = Math.hypot(actualDx, actualDy);
        const remainingDistance = Math.hypot(
          Number(npc.wanderTargetX) - Number(npc.x || 0),
          Number(npc.wanderTargetY) - Number(npc.y || 0)
        );

        if (remainingDistance >= distance - 0.05) {
          npc.wanderStuckTime = Number(npc.wanderStuckTime || 0) + stepDt;
        } else {
          npc.wanderStuckTime = 0;
        }

        if (npc.wanderStuckTime >= 0.75) {
          npc.wanderTargetX = null;
          npc.wanderTargetY = null;
          npc.wanderStuckTime = 0;
          npc.isMoving = false;
          npc.wanderCooldown = 0.25 + Math.random() * 0.65;
          continue;
        }

        if (actualDistance > 0.001) {
          npc.dirX = actualDx / actualDistance;
          npc.dirY = actualDy / actualDistance;
        }
        npc.isMoving = true;
        npc.walkTime = (Number(npc.walkTime || 0) + stepDt * 9) % 10000;
        continue;
      }

      npc.wanderTargetX = null;
      npc.wanderTargetY = null;
      npc.wanderStuckTime = 0;
      npc.isMoving = false;
      npc.wanderCooldown = 0.4 + Math.random() * 0.8;
    }
  }

  ensureAmbientWanderState(npc) {
    if (!isFiniteWanderCoordinate(npc.wanderHomeX)) {
      npc.wanderHomeX = Number(npc.x || 0);
    }

    if (!isFiniteWanderCoordinate(npc.wanderHomeY)) {
      npc.wanderHomeY = Number(npc.y || 0);
    }

    if (!Number.isFinite(Number(npc.walkTime))) {
      npc.walkTime = Math.random() * 4;
    }

    if (!Number.isFinite(Number(npc.wanderCooldown))) {
      npc.wanderCooldown = this.getAmbientWanderPause(npc) * Math.random();
    }

    if (!hasAmbientWanderTarget(npc)) {
      npc.wanderTargetX = null;
      npc.wanderTargetY = null;
    }

    if (!Number.isFinite(Number(npc.wanderStuckTime))) {
      npc.wanderStuckTime = 0;
    }

    npc.isMoving = !!npc.isMoving;
  }

  pickAmbientWanderTarget(npc) {
    const homeX = isFiniteWanderCoordinate(npc.wanderHomeX)
      ? Number(npc.wanderHomeX)
      : Number(npc.x || 0);
    const homeY = isFiniteWanderCoordinate(npc.wanderHomeY)
      ? Number(npc.wanderHomeY)
      : Number(npc.y || 0);
    const radius = Math.max(TILE * 0.75, Number(npc.wanderRadiusTiles || 3) * TILE);
    npc.wanderCooldown = 0;

    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      // Square-root sampling distributes destinations uniformly across the
      // whole roaming area instead of concentrating them near the centre.
      const minimumRadius = 0.2;
      const distance = radius * Math.sqrt(
        minimumRadius * minimumRadius + Math.random() * (1 - minimumRadius * minimumRadius)
      );
      const targetX = homeX + Math.cos(angle) * distance;
      const targetY = homeY + Math.sin(angle) * distance;

      if (!isPassable(this.world, targetX, targetY)) continue;
      if (!hasLineOfSight(this.world, Number(npc.x || homeX), Number(npc.y || homeY), targetX, targetY, {
        step: TILE / 4
      })) continue;
      if (!this.isAmbientWanderDestinationClear(npc, targetX, targetY)) continue;

      npc.wanderTargetX = targetX;
      npc.wanderTargetY = targetY;
      npc.wanderStuckTime = 0;
      return true;
    }

    if (isPassable(this.world, homeX, homeY)) {
      npc.wanderTargetX = homeX;
      npc.wanderTargetY = homeY;
      return true;
    }

    return false;
  }

  isAmbientWanderDestinationClear(npc, targetX, targetY) {
    const clearance = Math.max(TILE * 0.7, Number(npc.wanderCollisionRadius || npc.r || 8) * 2.25);

    for (const other of this.world?.objects || []) {
      if (other === npc || other?.kind !== 'npc' || !other?.ambientWander || other.depleted) continue;

      const otherX = hasAmbientWanderTarget(other)
        ? Number(other.wanderTargetX)
        : Number(other.x || 0);
      const otherY = hasAmbientWanderTarget(other)
        ? Number(other.wanderTargetY)
        : Number(other.y || 0);

      if (Math.hypot(targetX - otherX, targetY - otherY) < clearance) return false;
    }

    return true;
  }

  getAmbientWanderPause(npc) {
    const pauseMin = Math.max(0.2, Number(npc?.wanderPauseMin || 0.8));
    const pauseMax = Math.max(pauseMin, Number(npc?.wanderPauseMax || 2.2));

    return pauseMin + Math.random() * (pauseMax - pauseMin);
  }

  updateWorldEffects(dt) {
    const effectLists = [
      this.world.effects,
      this.world.combatEffects,
      this.player.combatEffects,
      ...(this.player.coop?.players || []).map(ally => ally?.combatEffects)
    ];

    for (const list of effectLists) {
      if (!Array.isArray(list)) continue;

      for (const effect of list) {
        effect.age = (effect.age || 0) + dt;

        if (effect.ttl !== undefined) {
          effect.ttl -= dt;
        }
      }
    }

    if (Array.isArray(this.world.effects)) {
      this.world.effects = this.world.effects.filter(effect => (effect.ttl ?? 1) > 0);
    }

    if (Array.isArray(this.world.combatEffects)) {
      this.world.combatEffects = this.world.combatEffects.filter(effect => (effect.ttl ?? 1) > 0);
    }

    if (Array.isArray(this.player.combatEffects)) {
      this.player.combatEffects = this.player.combatEffects.filter(effect => (effect.ttl ?? 1) > 0);
    }

    for (const ally of this.player.coop?.players || []) {
      if (Array.isArray(ally?.combatEffects)) {
        ally.combatEffects = ally.combatEffects.filter(effect => (effect.ttl ?? 1) > 0);
      }
    }
  }

  refreshPoiWorldState() {
    const now = Date.now();
    if (now < Number(this.nextPoiStateRefreshAt || 0)) return;
    this.nextPoiStateRefreshAt = now + 1000;
    applyPoiEncounterState(this.player, this.world, now);
    applyPoiWorldState(this.player, this.world);
  }

  applyPendingQuestRewards() {
    const recipients = [
      this.player,
      ...(this.player.coop?.players || []).filter(ally => ally && ally.active !== false)
    ];

    for (const recipient of recipients) {
      const pending = recipient.pendingQuestXp;
      if (!pending || typeof pending !== 'object') continue;

      for (const [skillId, amount] of Object.entries(pending)) {
        const safeAmount = Math.max(0, Number(amount || 0));
        if (safeAmount <= 0) continue;

        gainXp(recipient, skillId, safeAmount, this.log);
      }

      recipient.pendingQuestXp = {};
    }
  }

  move(dt) {
    const dx = this.input.moveX;
    const dy = this.input.moveY;
    const bypassEditorCollision = !!(this.developerEditor && !this.developerEditor.collisionEnabled);

    const dashVelocity = getPlayerDashVelocity(this.player);

    if (dashVelocity.x || dashVelocity.y) {
      const next = applyDungeonPartyTether(
        this,
        this.player,
        this.player.x + dashVelocity.x * dt,
        this.player.y + dashVelocity.y * dt
      );
      const nx = next.x;
      const ny = next.y;

      if (!bypassEditorCollision) {
        moveActorWithCollision(this.player, this.world, nx-this.player.x, ny-this.player.y, 12);
        this.player.dirX = dashVelocity.x;
        this.player.dirY = dashVelocity.y;
        return;
      }

      if (bypassEditorCollision || isPassable(this.world, nx, this.player.y)) {
        this.player.x = nx;
      }

      if (bypassEditorCollision || isPassable(this.world, this.player.x, ny)) {
        this.player.y = ny;
      }

      this.player.dirX = dashVelocity.x;
      this.player.dirY = dashVelocity.y;

      return;
    }

    this.player.isMoving = !!(dx || dy);

    if (!dx && !dy) {
      applyCombatAimFacing(this.player, this.input.combatAimX !== null ? this.player.combatAim : null, {
        onlyRightStick: false
      });
      updateActorLocomotionAudio(this.player);
      return;
    }

    const aimFacingApplied = applyCombatAimFacing(this.player, this.player.combatAim, {
      onlyExplicitAim: true
    });

    if (!aimFacingApplied) {
      this.player.dirX = dx;
      this.player.dirY = dy;
    }
    this.player.walkTime = (this.player.walkTime || 0) + dt * 9;

    const speedMultiplier = getPlayerMovementMultiplier(this.player);
    const speed = 205 * speedMultiplier;

    const next = applyDungeonPartyTether(
      this,
      this.player,
      this.player.x + dx * speed * dt,
      this.player.y + dy * speed * dt
    );
    const nx = next.x;
    const ny = next.y;

    if (!bypassEditorCollision) {
      moveActorWithCollision(this.player, this.world, nx-this.player.x, ny-this.player.y, 12);
      updateActorLocomotionAudio(this.player);
      return;
    }

    if (bypassEditorCollision || isPassable(this.world, nx, this.player.y)) {
      this.player.x = nx;
    }

    if (bypassEditorCollision || isPassable(this.world, this.player.x, ny)) {
      this.player.y = ny;
    }

    updateActorLocomotionAudio(this.player);
  }

  // ---------------------------------------------------------------------------
  // SPLIT SYSTEM WRAPPERS
  // ---------------------------------------------------------------------------

  interact() {
    if(this.onlineSession?.role==='guest'){this.onlineInteractionRequested=true;return;}
    interact(this);
  }

  routeDialogueInput(state,input,actor,world) {
    if(this.onlineSession?.sendDialogue(input))return true;
    return updateDialogueInput(state,input,actor,world);
  }

  closeConversation() {
    if(this.onlineSession?.closeDialogue())return;
    closeDialogue(this.dialogue);
  }

  enterDungeon(entrance) {
    enterDungeon(this, entrance);
  }

  exitDungeon(exit) {
    exitDungeon(this, exit);
  }

  refreshClassAbilityUnlocks() {
    refreshClassAbilityUnlocks(this);
  }

  grantClassStarterGear(classId) {
    return grantClassStarterGear(this, classId);
  }

  renderPauseMenu() {
    renderPauseMenu(this);
  }

  // ---------------------------------------------------------------------------
  // SAVE / LOAD
  // ---------------------------------------------------------------------------

  save(showLog = true) {
    if(this.deathScreen?.active){
      if(showLog)this.log('Respawn at a Nav Stone before saving.');
      return false;
    }
    if (this.onlineSession?.role === 'guest') return this.onlineSession.saveGuest(showLog);
    if (this.developerEditor) {
      return this.developerEditor.save(false);
    }

    if (shouldBlockPvpArenaSave(this.world)) {
      if (showLog) {
        this.log('Finish or leave the PvP Arena before saving.');
        addStatusText(this.player, 'Leave Arena to Save', { color: '#ffcc66' });
      }
      return false;
    }

    const result = saveGameProfile(this, showLog);

    if (!result.saved) {
      this.log(result.reason || 'Save failed.');
      renderUI(this.player, this.logLines, this);
      return false;
    }

    if (showLog) {
      addFloatingText(this.player, 'Saved', {
        preset: 'status',
        color: '#73d18a'
      });
      playSfx('ui', { volume: 0.7, throttle: 0.08 });
    }

    renderProfileList(startProfile);
    return true;
  }

  applySave(saveState) {
    const applied = applySaveToGame(this, saveState);

    if (!applied) return;

    this.refreshClassAbilityUnlocks();
    this.captureProgressionWatch();

    this.log('Profile loaded.');

    addFloatingText(this.player, 'Loaded', {
      preset: 'status',
      color: '#73d18a'
    });
    playSfx('quest', { volume: 0.65, throttle: 0.1 });

    renderUI(this.player, this.logLines, this);
    this.renderPauseMenu();
  }

  saveAndQuit() {
    const saved = this.save(false);

    if (!saved) {
      this.log('Save & Quit failed because the profile could not be saved.');
      renderUI(this.player, this.logLines, this);
      return;
    }

    this.togglePause(false);
    this.destroy();

    currentGame = null;

    showMenu(startProfile);
    startMenuMusicLoop();
  }

  finalizeLoadedState(reason = 'migrate') {
    this.player = migratePlayer(this.player || createPlayer(this.profileName || 'Wayfarer'));
    ensurePlayerDialogueAndQuestState(this.player);
    normalizeOpeningQuestFlow(this.player);
    ensurePlayerAppearance(this.player);
    applyAppearanceToPlayer(this.player, this.player.appearance);
    ensureCouchCoop(this);

    if (reason !== 'save') {
      sanitizeActorReviveStateForSave(this.player);
      clearCoopReviveState(this.player);

      for (const ally of this.player.coop?.players || []) {
        sanitizeActorReviveStateForSave(ally);
        clearCoopReviveState(ally);
      }
    }

    this.world = this.world || createWorld();
    this.world.mode = this.world.mode || 'overworld';
    this.world.name = normalizePlayerFacingWorldName(this.world.name, getDefaultWorldName(this.world.mode));

    const shouldLoadCapitalHub =
      ['capital', 'hub', 'town', 'pvpArena'].includes(this.world.mode) ||
      this.world.name === 'Orrakai' ||
      this.world.name === 'Capital Gate District';

    if (shouldLoadCapitalHub) {
      const wasPvpArenaSave = this.world.mode === 'pvpArena';
      const savedX = Number(this.player.x);
      const savedY = Number(this.player.y);
      const hub = createCapitalHubWorld();
      hub.safeZone = true;
      this.world = hub;
      this.player.currentZone = hub.name;
      this.player.capitalUnlocked = true;

      if (!wasPvpArenaSave && Number.isFinite(savedX) && Number.isFinite(savedY) && isPassable(hub, savedX, savedY)) {
        this.player.x = savedX;
        this.player.y = savedY;
      } else {
        this.player.x = hub.spawn.x;
        this.player.y = hub.spawn.y;
      }

      if ((reason === 'load' || reason === 'migrate') && this.canvas) {
        this.camera = {
          x: this.player.x - this.canvas.width / 2,
          y: this.player.y - this.canvas.height / 2
        };
      }

      if (wasPvpArenaSave) {
        this.player.pvpArena = null;
        for (const ally of this.player.coop?.players || []) {
          if (ally) ally.pvpArena = null;
        }
      }
    }

    const hasActiveTiles = Array.isArray(this.world.tiles) && this.world.tiles.length > 0;
    // A restored capital already has its complete grid. Its fallback must
    // not generate an unused continent while rebuilding the town below.
    const freshWorld = (this.world.continentRuntime || this.world.mode === 'capital') && hasActiveTiles
      ? this.world
      : this.world.mode === 'act1Opening'
      ? createCaravanOpeningWorld()
      : this.world.mode === 'maraHouse'
      ? createMaraHouseWorld()
      : this.world.mode === 'travelRoute' && this.world.routeId
      ? createTravelRouteWorld(this.world.routeId)
      : this.world.mode === 'overworld' && this.world.regionId && this.world.regionId !== 'hearthmereFrontier'
        ? createRegionWorld(this.world.regionId)
        : hasActiveTiles && ['dungeon', 'tower', 'sideZone'].includes(this.world.mode)
          ? { tiles: this.world.tiles, objects: this.world.objects || [], enemies: this.world.enemies || [], terrainFeatures: null }
          : createWorld();
    const freshCapital = this.world.mode === 'capital' ? createCapitalHubWorld() : null;

    if (freshCapital) {
      this.world = {
        ...this.world,
        ...freshCapital,
        drops: Array.isArray(this.world.drops) ? this.world.drops : freshCapital.drops,
        effects: [],
        combatEffects: []
      };
      this.player.currentZone = freshCapital.name;
      migrateOrrakaiPosition(this.world, this.player);
      this.player.discoveredLocations = this.player.discoveredLocations || {};
      this.player.discoveredLocations.orrakai = this.player.discoveredLocations.orrakai || {
        id: 'orrakai',
        name: freshCapital.name,
        discoveredAt: Date.now()
      };
    }

    this.world.tiles = Array.isArray(this.world.tiles) && this.world.tiles.length
      ? this.world.tiles
      : freshWorld.tiles;
    this.world.width = this.world.tiles?.[0]?.length || this.world.width || 0;
    this.world.height = this.world.tiles?.length || this.world.height || 0;
    this.world.tileSize = this.world.tileSize || TILE;

    if (this.world.mode === 'dungeon' && this.world.dungeonState) {
      this.world.floor = this.world.floor || this.world.dungeonState.currentFloor || 1;
      this.world.totalFloors = this.world.totalFloors || this.world.dungeonState.totalFloors || 1;
      this.world.dungeonClassification = this.world.dungeonClassification || this.world.dungeonState.classification || 'minor';
    }

    if (this.world.mode === 'overworld' && !this.world.terrainFeatures) {
      this.world.terrainFeatures = freshWorld.terrainFeatures || null;
    }

    if (this.world.mode === 'overworld') {
      this.world.objects = Array.isArray(this.world.objects) && this.world.objects.length
        ? this.world.objects
        : freshWorld.objects || [];

      this.world.enemies = Array.isArray(this.world.enemies) && this.world.enemies.length
        ? this.world.enemies
        : freshWorld.enemies || [];
    } else {
      this.world.objects = Array.isArray(this.world.objects) ? this.world.objects : [];
      this.world.enemies = Array.isArray(this.world.enemies) ? this.world.enemies : [];
    }

    this.world.drops = Array.isArray(this.world.drops) ? this.world.drops : [];
    this.world.effects = Array.isArray(this.world.effects) ? this.world.effects : [];
    this.world.combatEffects = Array.isArray(this.world.combatEffects) ? this.world.combatEffects : [];
    if (this.world.mode === 'overworld' && freshWorld.echorynRevision) {
      for (const key of ['echorynRevision','echorynTrees','echorynTreeBuckets','authoredLocations','landscapes','navStones','mapMeta','spawn']) this.world[key] = freshWorld[key];
      migrateEchorynPosition(this.world, this.player);
    }
    applyPoiEncounterState(this.player, this.world);
    applyPoiWorldState(this.player, this.world);

    this.player.summons = Array.isArray(this.player.summons)
      ? this.player.summons.filter(summon => summon && summon.alive !== false && summon.hp > 0)
      : [];

    this.player.floatingTexts = Array.isArray(this.player.floatingTexts)
      ? this.player.floatingTexts
      : [];

    this.player.combatEffects = Array.isArray(this.player.combatEffects)
      ? this.player.combatEffects
      : [];

    if (!this.camera || !Number.isFinite(this.camera.x) || !Number.isFinite(this.camera.y)) {
      this.camera = {
        x: this.player.x - this.canvas.width / 2,
        y: this.player.y - this.canvas.height / 2
      };
    }

    return reason;
  }

  // ---------------------------------------------------------------------------
  // PAUSE
  // ---------------------------------------------------------------------------

  togglePause(force) {
    ensurePauseOverlay(this);
    bindPauseButtons(this);

    this.paused = typeof force === 'boolean' ? force : !this.paused;
    playSfx(this.paused ? 'ui' : 'menuBack', { volume: 0.65, throttle: 0.08 });

    setPauseActive(this.paused);

    if (this.paused) {
      this.pauseOwner = this.pauseOwner || this.uiOwner || this.player;
      this.closeConversation();
      cancelActiveHeavyAttackCharge(this.player, this.world);
      for (const ally of this.player.coop?.players || []) {
        cancelActiveHeavyAttackCharge(ally, this.world);
      }
      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.attackReleased = false;
      this.renderPauseMenu();
      this.pauseMenuFocusIndex = 0;
      this.applyPauseMenuFocus();
    } else {
      this.pauseOwner = this.player;
    }
  }

  // ---------------------------------------------------------------------------
  // PROGRESSION FEEDBACK
  // ---------------------------------------------------------------------------

  captureProgressionWatch() {
    migratePlayer(this.player);

    this.progressionWatch = {
      combatLevel: Number(this.player.combatLevel || 1),
      hp: Number(this.player.hp || 0),
      stamina: Number(this.player.stamina || 0),
      spirit: Number(this.player.spirit || 0)
    };
  }

  checkProgressionFeedback() {
    migratePlayer(this.player);
    this.refreshClassAbilityUnlocks();

    const previous = this.progressionWatch || {
      combatLevel: this.player.combatLevel || 1,
      hp: this.player.hp,
      stamina: this.player.stamina,
      spirit: this.player.spirit
    };

    const combatLevel = Number(this.player.combatLevel || 1);

    if (combatLevel > previous.combatLevel) {
      this.log(`Level increased to ${combatLevel}.`);
      this.shake(8, 0.18);
      playSfx('levelUp');

      addQuestText(this.player, `Level ${combatLevel}`, {
        color: '#ffcc66',
        ttl: 1.45,
        size: 17,
        offsetY: -68
      });

      this.spawnBurstEffect(this.player.x, this.player.y, '#ffcc66', 34);
    }

    this.progressionWatch = {
      combatLevel,
      hp: Number(this.player.hp || 0),
      stamina: Number(this.player.stamina || 0),
      spirit: Number(this.player.spirit || 0)
    };
  }

  spawnBurstEffect(x, y, color = '#ffcc66', radius = 28) {
    this.world.effects = this.world.effects || [];

    this.world.effects.push({
      kind: 'burst',
      layer: 'front',
      x,
      y,
      color,
      radius,
      ttl: 0.45,
      age: 0
    });
  }

  // ---------------------------------------------------------------------------
  // CAMERA / SHAKE
  // ---------------------------------------------------------------------------

  shake(amount = 4, duration = 0.12) {
    // Camera shake is intentionally disabled. Combat impact is communicated
    // through hit-stop, flashes, sound, knockback, and world-space effects.
    this.screenShake.amount = 0;
    this.screenShake.time = 0;
    this.screenShake.maxTime = 0;
  }

  updateScreenShake(dt) {
    if (this.screenShake.time <= 0) {
      this.screenShake.amount = 0;
      this.screenShake.maxTime = 0;
      return;
    }

    this.screenShake.time = Math.max(0, this.screenShake.time - dt);

    if (this.screenShake.time <= 0) {
      this.screenShake.amount = 0;
      this.screenShake.maxTime = 0;
    }
  }

  buildRenderCamera() {
    const width = this.canvas?.width || 0;
    const height = this.canvas?.height || 0;
    const worldWidth = getWorldPixelWidth(this.world) || width;
    const worldHeight = getWorldPixelHeight(this.world) || height;

    this.renderCamera.x = cameraAxisPosition(this.camera.x, worldWidth, width);
    this.renderCamera.y = cameraAxisPosition(this.camera.y, worldHeight, height);
  }

  // ---------------------------------------------------------------------------
  // LOGGING
  // ---------------------------------------------------------------------------

  log(message) {
    this.logLines.unshift(message);
    this.logLines = this.logLines.slice(0, 80);
  }
}

// -----------------------------------------------------------------------------
// GLOBAL GAME INSTANCE
// -----------------------------------------------------------------------------

let currentGame = null;
let menuMusicFrame = 0;
let profileStartGeneration = 0;
let profileStartPending = false;

// -----------------------------------------------------------------------------
// MENU / PROFILE BOOT
// -----------------------------------------------------------------------------

function startProfile(profile) {
  if (!profile || profileStartPending) return false;

  profileStartPending = true;
  const startGeneration = ++profileStartGeneration;

  stopMenuMusicLoop();
  unlockAudio();
  showLoadingScreen(profile?.state ? `Returning to ${ACT1_OVERWORLD_DISPLAY_NAME}...` : 'Beginning a new journey...');

  if (currentGame) {
    currentGame.destroy();
    currentGame = null;
  }

  // Stop profile-menu controller input immediately. The loading screen remains
  // above the app while the new game is being constructed.
  showGame();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (startGeneration !== profileStartGeneration) return;

      try {
        currentGame = new RunalisGame(profile.id, profile.name, profile.state);
      } catch (error) {
        console.error('Failed to start profile:', error);
        currentGame = null;
        clearGameUiDom();
        showMenu(startProfile);
        startMenuMusicLoop();
      } finally {
        if (startGeneration === profileStartGeneration) {
          profileStartPending = false;
          hideLoadingScreen();
        }
      }
    });
  });

  return true;
}

function startDeveloperMode(options) {
  if (profileStartPending) return false;
  profileStartPending = true;
  const startGeneration = ++profileStartGeneration;
  stopMenuMusicLoop();
  unlockAudio();
  showLoadingScreen(`Opening ${options?.mapId || 'world'} in Developer Mode...`);

  if (currentGame) {
    currentGame.destroy();
    currentGame = null;
  }

  showGame();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (startGeneration !== profileStartGeneration) return;
    try {
      currentGame = new RunalisGame(
        `developer-${options?.mapId || 'world'}`,
        'Developer',
        null,
        { developerMode: options || {} }
      );
    } catch (error) {
      console.error('Failed to start Developer Mode:', error);
      currentGame = null;
      clearGameUiDom();
      showMenu(startProfile);
      startMenuMusicLoop();
    } finally {
      if (startGeneration === profileStartGeneration) {
        profileStartPending = false;
        hideLoadingScreen();
      }
    }
  }));
  return true;
}

function boot() {
  createAudioSystem();
  startMenuMusicLoop();

  bindProfileMenu(startProfile);
  renderProfileList(startProfile);
  bindMainMenuActions();

  const resumeBtn = document.getElementById('resumeBtn');
  if (resumeBtn) {
    resumeBtn.onclick = () => currentGame?.togglePause(false);
  }

  const pauseSaveBtn = document.getElementById('pauseSaveBtn');
  if (pauseSaveBtn) {
    pauseSaveBtn.onclick = () => currentGame?.save(true);
  }

  const saveQuitBtn = document.getElementById('saveQuitBtn');
  if (saveQuitBtn) {
    saveQuitBtn.onclick = () => currentGame?.saveAndQuit();
  }

  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.onclick = () => currentGame?.saveAndQuit();
  }
}

function bindMainMenuActions() {
  bindFullscreenButtons();
  const setup = document.getElementById('developerModeSetup');
  const setupForm = setup?.querySelector('form');
  const mapSelect = setup?.querySelector('[data-developer-map]');

  if (mapSelect) {
    mapSelect.innerHTML = DEVELOPER_MAP_OPTIONS
      .map(option => `<option value="${option.id}">${option.name}</option>`)
      .join('');
  }

  const closeSetup = () => {
    setup?.classList.remove('active');
    setup?.setAttribute('aria-hidden', 'true');
  };

  setup?.querySelectorAll('[data-close-developer-setup]').forEach(button => button.addEventListener('click', closeSetup));
  setup?.addEventListener('click', event => { if (event.target === setup) closeSetup(); });
  setupForm?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(setupForm);
    const options = Object.fromEntries(data.entries());
    options.aiPaused = setupForm.elements.aiPaused.checked;
    options.questsEnabled = setupForm.elements.questsEnabled.checked;
    options.lightingEnabled = setupForm.elements.lightingEnabled.checked;
    options.collisionEnabled = setupForm.elements.collisionEnabled.checked;
    closeSetup();
    startDeveloperMode(options);
  });

  document.getElementById('continueGameBtn')?.addEventListener('click', () => {
    const profile = Object.values(readProfiles()).sort((a, b) => Number(b.updated || 0) - Number(a.updated || 0))[0];
    if (profile) startProfile(profile);
    else document.getElementById('profileName')?.focus();
  });
  document.getElementById('newGameBtn')?.addEventListener('click', () => document.getElementById('profileName')?.focus());
  document.getElementById('settingsBtn')?.addEventListener('click', () => showLexiconMessage('Settings', 'Gameplay settings are available from the in-game menus.'));
  document.getElementById('creditsBtn')?.addEventListener('click', () => showLexiconMessage('Credits', 'Runalis — original dark-fantasy RPG project and code-drawn world.'));
  document.getElementById('quitGameBtn')?.addEventListener('click', () => {
    window.close();
    setTimeout(() => { if (!window.closed) showLexiconMessage('Quit', 'The browser does not permit this tab to close itself. You may close it safely.'); }, 100);
  });
}

boot();
installReleaseUpdates(()=>currentGame);

function startMenuMusicLoop() {
  if (menuMusicFrame) return;

  const loop = () => {
    menuMusicFrame = 0;
    if (currentGame) return;

    updateAdaptiveMusic({
      paused: false,
      combat: false,
      boss: false,
      mode: 'capital'
    });

    menuMusicFrame = requestAnimationFrame(loop);
  };

  menuMusicFrame = requestAnimationFrame(loop);
}

function stopMenuMusicLoop() {
  if (!menuMusicFrame) return;
  cancelAnimationFrame(menuMusicFrame);
  menuMusicFrame = 0;
}

// -----------------------------------------------------------------------------
// SMALL HELPERS
// -----------------------------------------------------------------------------

function createDialogueInputFromEvent(event) {
  const justPressed = {};

  justPressed[event.key] = true;
  justPressed[event.code] = true;
  justPressed[event.key.toLowerCase()] = true;

  if (event.key === ' ') {
    justPressed.Space = true;
  }

  if (event.key === 'Enter') {
    justPressed.Enter = true;
  }

  if (event.key === 'Escape') {
    justPressed.Escape = true;
    justPressed.esc = true;
  }

  return {
    justPressed,
    inputDevice: 'keyboard',
    confirmPressed: !!(justPressed.Enter || justPressed.Space || justPressed.KeyE || justPressed.e),
    cancelPressed: !!(justPressed.Escape || justPressed.esc),
    upPressed: !!(justPressed.ArrowUp || justPressed.KeyW || justPressed.w),
    downPressed: !!(justPressed.ArrowDown || justPressed.KeyS || justPressed.s),
    historyPressed: !!(justPressed.KeyH || justPressed.h || justPressed.Tab)
  };
}

function isEditableTextTarget(target) {
  const tagName = String(target?.tagName || '').toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || !!target?.isContentEditable;
}

function hasAmbientWanderTarget(npc) {
  if (!npc) return false;
  return isFiniteWanderCoordinate(npc.wanderTargetX) &&
    isFiniteWanderCoordinate(npc.wanderTargetY);
}

function isFiniteWanderCoordinate(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function getSplitViewports(width, height, count) {
  const safeCount = Math.max(1, Math.min(4, Math.floor(count || 1)));

  if (safeCount === 1) {
    return [{ x: 0, y: 0, width, height }];
  }

  if (safeCount === 2) {
    const halfWidth = Math.floor(width / 2);
    return [
      { x: 0, y: 0, width: halfWidth, height },
      { x: halfWidth, y: 0, width: width - halfWidth, height }
    ];
  }

  if (safeCount === 3) {
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);

    return [
      { x: 0, y: 0, width: halfWidth, height: halfHeight },
      { x: halfWidth, y: 0, width: width - halfWidth, height: halfHeight },
      { x: 0, y: halfHeight, width: halfWidth, height: height - halfHeight }
    ];
  }

  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);

  return [
    { x: 0, y: 0, width: halfWidth, height: halfHeight },
    { x: halfWidth, y: 0, width: width - halfWidth, height: halfHeight },
    { x: 0, y: halfHeight, width: halfWidth, height: height - halfHeight },
    { x: halfWidth, y: halfHeight, width: width - halfWidth, height: height - halfHeight }
  ];
}

function drawSplitLabel(ctx, text, x, y, color) {
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(3,6,12,0.78)';
  ctx.fillRect(x - 6, y - 5, Math.max(34, String(text || '').length * 8 + 16), 23);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, y - 5, Math.max(34, String(text || '').length * 8 + 16), 23);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

