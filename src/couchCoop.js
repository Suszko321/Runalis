import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import {partyEntryPending} from './partyEntrySystem.js';
import {moveActorWithCollision as moveWorldActor} from './world.js';
import { handleMenuSheetInput, menuSheetItemVisible } from './menuSheets.js';
// couchCoop.js
// Local couch co-op support for Runalis.
//
// Responsibilities:
// - Player 2-4 join / drop out
// - Player 2-4 create-profile / load-profile flow
// - Player 2-4 profile saving to localStorage
// - Player 2-4 appearance customization on new profile creation
// - Player 2-4 movement, combat, abilities, interaction
// - Party camera helper functions
//
// Notes:
// - Keyboard and mouse always belong exclusively to Player 1.
// - The first connected controller owns Player 1; only additional controllers
//   may join Player 2-4.
// - Couch co-op players now have their own saved profile data.
// - Couch co-op players no longer forcibly share Player 1 inventory/equipment/class.
// - When a co-op player creates a new profile, the character creator opens for them.
// - Quest ownership still points back to Player 1 where needed so world dialogue/quest
//   systems can continue to work safely in couch co-op.

import {
  createPlayer,
  migratePlayer,
  addItem
} from './player.js';

import {
  normalizeProfileSave,
  createDefaultProfile,
  normalizeGameState,
  SAVE_SCHEMA_VERSION
} from './saveProfiles.js';

import {
  isPassable
} from './world.js';

import {
  applyDungeonPartyTether
} from './coopSharedScreen.js';

import {
  updateCombat,
  updateSummons,
  updateAbilityInput,
  cancelActiveHeavyAttackCharge,
  getPlayerMovementMultiplier,
  getPlayerDashVelocity
} from './combat.js';

import {
  interact as interactWithWorld,
  refreshClassAbilityUnlocks
} from './gameInteraction.js';

import {
  ensurePlayerDialogueAndQuestState,
  updatePoiDiscovery
} from './dialogueSystem.js';

import {
  ensurePlayerAppearance,
  applyAppearanceToPlayer,
  openCharacterCreator
} from './characterCreator.js';

import { TILE } from './data.js';
import { updateActorLocomotionAudio } from './locomotionAudio.js';
import {
  recoverPassiveSpirit
} from './resourceBalance.js';

import {
  handleActorLeavingReviveState,
  handleActorZeroHpForCoop,
  isActorControlLockedByRevive,
  processReviveInput,
  sanitizeActorReviveStateForSave,
  updateCoopReviveTimers
} from './coopReviveSystem.js';

import {
  canPvpActorAct,
  isPvpActorEliminated
} from './pvpArenaSystem.js';

import {
  applyCombatAimFacing,
  clearCombatAimInput,
  resolveActorCombatAim,
  writeCombatAimToInput
} from './combatAim.js';

// -----------------------------------------------------------------------------
// PROFILE STORAGE CONSTANTS
// -----------------------------------------------------------------------------

const UNIFIED_PROFILE_STORAGE_KEY = 'runalis-profiles-v7-slim-save';
const LEGACY_COUCH_COOP_STORAGE_KEY = 'runalis.couchCoop.player2Profiles.v1';
const COUCH_COOP_AUTOSAVE_SECONDS = 2.5;

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function ensureCouchCoop(game) {
  if (!game?.player) return null;

  game.player.coop = game.player.coop || {
    enabled: false,
    players: []
  };

  game.player.coop.players = Array.isArray(game.player.coop.players)
    ? game.player.coop.players
    : [];

  pruneInactiveCouchCoopRuntimePlayers(game.player);
  normalizeCouchCoopSlots(game.player);

  for (const ally of game.player.coop.players) {
    if (!ally) continue;

    migratePlayer(ally);
    ensurePlayerDialogueAndQuestState(ally);

    ally.slot = ally.slot || 2;
    ally.controllerSlotIndex = ally.controllerSlotIndex ?? Math.max(1, ally.slot - 1);
    ally.origin = ally.origin || 'Couch Co-op Session';
    ally.active = ally.active !== false;

    ensurePlayerAppearance(ally);
    applyAppearanceToPlayer(ally, ally.appearance);

    attachRuntimeOwner(ally, game.player);
  }

  normalizeCouchCoopSlots(game.player);
  syncCouchCoopSession(game);

  return game.player.coop;
}

export function clearCouchCoopRuntimeState(player) {
  if (!player) return;

  player.coop = {
    enabled: false,
    players: []
  };
}

export function saveAllCouchCoopProfiles(game) {
  const players = Array.isArray(game?.player?.coop?.players)
    ? game.player.coop.players
    : [];

  let savedAll = true;

  for (const ally of players) {
    if (!ally || ally.active === false) continue;
    savedAll = saveCouchCoopProfile(game, ally) && savedAll;
  }

  return savedAll;
}

export function updateCouchCoop(game, dt, now, controllerInputs = null) {
  if (partyEntryPending(game)) return;
  const coop = ensureCouchCoop(game);
  if (!coop) return;
  if (game.couchCoopJoinMenu?.active) return;

  updateCoopReviveTimers(game, dt, now);

  const inputs = normalizeCoopControllerInputs(controllerInputs);

  for (const controllerInput of inputs) {
    const slotNumber = getPlayerSlotForController(game, controllerInput);
    if (slotNumber < 2 || slotNumber > 4) continue;

    const joinHeld = !!controllerInput?.confirmPressed || !!controllerInput?.pausePressed;
    const joinRequested = !!controllerInput?.confirmPressed || !!controllerInput?.pausePressed;
    const lockKey = `slot${slotNumber}`;

    game.couchCoopJoinLocks = game.couchCoopJoinLocks || {};

    if (!joinHeld) {
      game.couchCoopJoinLocks[lockKey] = false;
    }

    if (joinRequested && !game.couchCoopJoinLocks[lockKey] && !getActiveCoopPlayerBySlot(game.player, slotNumber)) {
      game.couchCoopJoinLocks[lockKey] = true;
      joinCouchCoopPlayer(game, slotNumber, controllerInput.slotIndex);
      if (game.couchCoopJoinMenu?.active) return;
    }
  }

  const activePlayers = getActiveCoopPlayers(game.player);

  for (const ally of activePlayers) {
    attachRuntimeOwner(ally, game.player);
    const controllerInput = getControllerInputForAlly(inputs, ally);

    if (controllerInput?.dropOutPressed) {
      if (typeof game.confirmAndLeaveCoopSessionForActor === 'function') {
        game.confirmAndLeaveCoopSessionForActor(ally);
      } else {
        leaveCouchCoopPlayer(game, ally, { reason: 'input' });
      }
      continue;
    }

    ensurePlayerDialogueAndQuestState(ally);

    updatePoiDiscovery(ally, game.world);

    ally.coopAbilityRefreshTimer = (ally.coopAbilityRefreshTimer || 0) + dt;
    if (ally.coopAbilityRefreshTimer >= 0.5) {
      ally.coopAbilityRefreshTimer = 0;
      refreshClassAbilityUnlocks(createAllyGameView(game, ally));
    }

    const rawInput = buildAllyInput(game, ally, controllerInput, null);
    const input = isCoopActorBusy(game, ally) ? suppressAllyGameplayInput(rawInput) : rawInput;

    if (!canPvpActorAct(ally, game.world)) {
      cancelActiveHeavyAttackCharge(ally, game.world);
      ally.interactLock = false;
      ally.currentPosition = { x: ally.x, y: ally.y };
      ally.currentZone = game.world?.name || ally.currentZone;
      autosaveCouchCoopProfile(game, ally, dt);
      continue;
    }

    if (processReviveInput(game, ally, input, dt, now)) {
      ally.interactLock = !!input.interactHeld;
      ally.currentPosition = { x: ally.x, y: ally.y };
      ally.currentZone = game.world?.name || ally.currentZone;
      autosaveCouchCoopProfile(game, ally, dt);
      continue;
    }

    if ((ally.hp || 0) <= 0 && game.world?.mode !== 'pvpArena' && !isPvpActorEliminated(ally, game.world)) {
      handleActorZeroHpForCoop(game, ally, now);
    }

    if (isActorControlLockedByRevive(ally)) {
      ally.currentPosition = { x: ally.x, y: ally.y };
      ally.currentZone = game.world?.name || ally.currentZone;
      autosaveCouchCoopProfile(game, ally, dt);
      continue;
    }

    recoverPassiveSpirit(ally, dt);

    if (input.interactPressed && !ally.interactLock) {
      interactAsAlly(game, ally);
      ally.interactLock = true;
      saveCouchCoopProfile(game, ally);
      if (partyEntryPending(game)) return;
    }

    if (!input.interactHeld) {
      ally.interactLock = false;
    }

    updateAbilityInput(ally, game.world, input, dt, now, game.log);
    updateCombat(ally, game.world, input, dt, now, game.log);
    updateSummons(dt, ally, game.world, game.log, now);
    moveAlly(game, ally, input, dt);

    if ((ally.hp || 0) <= 0 && game.world?.mode !== 'pvpArena' && !isPvpActorEliminated(ally, game.world)) {
      handleActorZeroHpForCoop(game, ally, now);
    }

    ally.currentPosition = { x: ally.x, y: ally.y };
    ally.currentZone = game.world?.name || ally.currentZone;

    autosaveCouchCoopProfile(game, ally, dt);
  }

}

export function joinCouchCoopPlayer(game, slotNumber = 2, controllerSlotIndex = slotNumber - 1) {
  if (game.onlineSession?.role||game.onlineSession?.connecting) { game.log?.('Use Multiplayer to join an open online world.'); return false; }
  const coop = ensureCouchCoop(game);
  if (!coop) return null;

  pruneInactiveCouchCoopRuntimePlayers(game.player);

  const safeControllerSlotIndex = Math.max(0, Math.min(3, Number(controllerSlotIndex ?? slotNumber - 1)));

  if (getActiveCoopPlayers(game.player).some(ally => Number(ally.controllerSlotIndex) === safeControllerSlotIndex)) {
    game.log?.('That controller is already assigned to a player.');
    return null;
  }

  if (!isSafeForCouchCoopJoin(game)) {
    game.log?.('Players cannot join right now.');
    return null;
  }

  const safeSlot = getNextOpenCoopSlot(game.player, slotNumber);

  if (!safeSlot) {
    game.log?.('All local player slots are already in use.');
    return null;
  }

  coop.players = coop.players.filter(player => player && (player.active !== false || player.slot !== safeSlot));
  openCouchCoopJoinMenu(game, safeSlot, safeControllerSlotIndex);
  return null;
}

export function leaveCouchCoopPlayer(game, ally, options = {}) {
  if (!game?.player || !ally || ally === game.player) return false;

  const coop = ensureCouchCoop(game);
  if (!coop) return false;

  sanitizeActorReviveStateForSave(ally);
  handleActorLeavingReviveState(game, ally);

  const slot = Math.max(2, Math.min(4, Number(ally.slot || ally.playerNumber || 2)));
  const saved = saveCouchCoopProfile(game, ally);

  cleanupDepartingCoopPlayer(game, ally);
  coop.players = coop.players.filter(player => player && player !== ally);
  coop.enabled = getActiveCoopPlayers(game.player).length > 0;

  if (game.uiOwner === ally) {
    game.setUiOwner?.(game.player);
  }

  syncCouchCoopSession(game);
  game.renderOwnedUI?.();

  const name = ally.name || `Player ${slot}`;
  game.log?.(`${name} left the session${saved ? ' and saved.' : '.'}`);

  return saved;
}

export function handleCouchCoopJoinMenuControllerInput(input) {
  const overlay = document.getElementById('couchCoopJoinOverlay');
  if (!overlay?.classList.contains('active')) return false;
  const controllerSlotIndex = Number(overlay.dataset.controllerSlotIndex);

  if (
    Number.isFinite(controllerSlotIndex) &&
    Number(input?.slotIndex) !== controllerSlotIndex
  ) {
    return false;
  }

  if (handleMenuSheetInput(input, overlay)) return true;
  const focusables = getCouchCoopJoinFocusableElements(overlay);
  if (!focusables.length) return true;

  let index = Number(overlay.dataset.controllerFocusIndex || 0);
  index = Math.max(0, Math.min(focusables.length - 1, index));

  const direction=menuDirection(input);
  if(direction){
    index=focusables.indexOf(directionalMenuItem(focusables,focusables[index],direction));
    overlay.dataset.controllerFocusIndex=String(index);
    applyCouchCoopJoinFocus(overlay,focusables,index);return true;
  }

  if (input?.cancelPressed || input?.backPressed) {
    closeCouchCoopJoinMenu(overlay.__runalisGame, true);
    return true;
  }

  if (input?.confirmPressed) {
    focusables[index]?.click?.();
    return true;
  }

  return true;
}

export function getActiveCoopPlayers(player) {
  return (player?.coop?.players || [])
    .filter(ally => ally && ally.active !== false)
    .sort((a, b) => getCouchCoopActorSlot(a) - getCouchCoopActorSlot(b));
}

export function getActiveLocalPlayers(player) {
  if (!player) return [];

  player.slot = 1;
  player.playerNumber = 1;

  return [
    player,
    ...getActiveCoopPlayers(player)
  ].filter(member => member && member.active !== false && !member.networkRemote).slice(0, 4);
}

export function getCouchCoopActorForControllerInput(game, input) {
  if (!game?.player || !input) return null;

  if (typeof game.getHostControllerSlotIndex === 'function') {
    const hostSlot = game.getHostControllerSlotIndex();
    if (Number.isFinite(hostSlot) && Number(input.slotIndex) === hostSlot) {
      return game.player;
    }
  }

  const ally = getActiveCoopPlayers(game.player).find(member => {
    const controllerSlotIndex = member.controllerSlotIndex ?? Math.max(1, (member.slot || 2) - 1);
    return controllerSlotIndex === input.slotIndex;
  });
  if (ally) return ally;

  if (typeof game.getHostControllerSlotIndex === 'function') {
    const hostSlot = game.getHostControllerSlotIndex();
    if (Number.isFinite(hostSlot)) {
      return input.slotIndex === hostSlot ? game.player : null;
    }

    const primarySlot = game.getPrimaryControllerInput?.()?.slotIndex ?? 0;
    return input.slotIndex === primarySlot ? game.player : null;
  }

  const primarySlot = game.getPrimaryControllerInput?.()?.slotIndex ?? 0;
  return input.slotIndex === primarySlot ? game.player : null;
}

export function getCouchCoopActorSlot(actor) {
  return Math.max(1, Math.min(4, Number(actor?.slot || actor?.playerNumber || 1)));
}

function getActiveCoopPlayerBySlot(player, slotNumber) {
  return getActiveCoopPlayers(player).find(ally => ally.slot === slotNumber) || null;
}

function getNextOpenCoopSlot(player, preferredSlot = 2) {
  const usedSlots = new Set(getActiveCoopPlayers(player).map(ally => getCouchCoopActorSlot(ally)));
  const safePreferred = Math.max(2, Math.min(4, Math.floor(Number(preferredSlot || 2))));

  if (!usedSlots.has(safePreferred)) return safePreferred;

  return [2, 3, 4].find(slot => !usedSlots.has(slot)) || null;
}

export function getPartyMembers(player) {
  return [
    player,
    ...getActiveCoopPlayers(player)
  ].filter(Boolean);
}

export function getPartyCameraFocus(player) {
  const members = getPartyMembers(player).filter(member=>!member.networkRemote);

  if (!members.length) {
    return {
      x: player?.x || 0,
      y: player?.y || 0
    };
  }

  const sum = members.reduce((total, member) => {
    total.x += member.x || 0;
    total.y += member.y || 0;
    return total;
  }, { x: 0, y: 0 });

  return {
    x: sum.x / members.length,
    y: sum.y / members.length
  };
}

function normalizeCoopControllerInputs(controllerInputs) {
  if (!controllerInputs) return [];
  if (Array.isArray(controllerInputs)) {
    return controllerInputs.filter(input => input?.connected);
  }

  return controllerInputs.connected ? [controllerInputs] : [];
}

function getPlayerSlotForControllerInput(input) {
  return Math.max(2, Math.min(4, (input?.slotIndex ?? 1) + 1));
}

function getPlayerSlotForController(game, input) {
  const active = getActiveCoopPlayers(game?.player);
  const existing = active.find(ally => {
    const controllerSlotIndex = ally.controllerSlotIndex ?? Math.max(1, (ally.slot || 2) - 1);
    return controllerSlotIndex === input?.slotIndex;
  });

  if (existing) return existing.slot || existing.playerNumber || 2;

  const usedSlots = new Set(active.map(ally => ally.slot || ally.playerNumber || 2));
  return [2, 3, 4].find(slot => !usedSlots.has(slot)) || getPlayerSlotForControllerInput(input);
}

function getControllerInputForAlly(inputs, ally) {
  if (!ally) return null;

  const expectedSlotIndex = ally.controllerSlotIndex ?? Math.max(1, (ally.slot || 2) - 1);

  return inputs.find(input => input?.slotIndex === expectedSlotIndex)
    || inputs.find(input => getPlayerSlotForControllerInput(input) === ally.slot)
    || null;
}

function isSafeForCouchCoopJoin(game) {
  if (!game || !game.player || !game.world) return false;
  if (game.couchCoopJoinMenu?.active) return false;
  if (game.paused) return false;
  if (game.loading || game.isLoading || game.generationInProgress) return false;
  if (game.dialogue?.active) return false;
  if (game.fishingMiniGame?.active || game.marketShop?.active || game.workshopService?.active) return false;

  if (typeof document !== 'undefined') {
    const characterCreator = document.getElementById('characterCreatorOverlay');
    if (characterCreator?.classList.contains('active')) return false;
  }

  if ((game.player.hp || 0) <= 0) return false;

  const bossActive = (game.world.enemies || []).some(enemy => {
    return enemy && enemy.alive !== false && !enemy.dead && (enemy.isBoss || enemy.worldBoss || enemy.boss);
  });

  return !bossActive;
}

function findSafeCoopSpawn(game, slotNumber = 2) {
  const host = game?.player || {};
  const party = getActiveLocalPlayers(game?.player);
  const partyCenter = party.length
    ? party.reduce((total, actor) => {
        total.x += Number(actor.x || 0);
        total.y += Number(actor.y || 0);
        return total;
      }, { x: 0, y: 0 })
    : null;

  if (partyCenter) {
    partyCenter.x /= party.length;
    partyCenter.y /= party.length;
  }

  const offsets = [
    { x: -TILE, y: TILE },
    { x: TILE, y: TILE },
    { x: -TILE, y: -TILE },
    { x: TILE, y: -TILE },
    { x: 0, y: TILE * 1.5 },
    { x: -TILE * 1.5, y: 0 },
    { x: TILE * 1.5, y: 0 },
    { x: 0, y: -TILE * 1.5 }
  ];

  const rotation = Math.max(0, Math.min(offsets.length - 1, slotNumber - 2));
  const anchors = [
    { x: Number(host.x || 0), y: Number(host.y || 0) },
    partyCenter,
    game?.world?.spawn,
    getWorldEntranceFallback(game?.world)
  ].filter(anchor => anchor && Number.isFinite(Number(anchor.x)) && Number.isFinite(Number(anchor.y)));

  for (const anchor of anchors) {
    for (let i = 0; i < offsets.length; i++) {
      const offset = offsets[(i + rotation) % offsets.length];
      const x = Number(anchor.x || 0) + offset.x;
      const y = Number(anchor.y || 0) + offset.y;

      if (!isSafeCoopSpawnPoint(game.world, x, y)) continue;

      return { x, y };
    }

    const anchorX = Number(anchor.x || 0);
    const anchorY = Number(anchor.y || 0);
    if (isSafeCoopSpawnPoint(game.world, anchorX, anchorY)) {
      return { x: anchorX, y: anchorY };
    }
  }

  return {
    x: Number(host.x || 0),
    y: Number(host.y || 0) + TILE
  };
}

function isSafeCoopSpawnPoint(world, x, y) {
  if (!isPassable(world, x, y)) return false;
  if (isNearDanger(world, x, y)) return false;
  return true;
}

function getWorldEntranceFallback(world) {
  if (!world) return null;

  if (Number.isFinite(Number(world.entranceX)) && Number.isFinite(Number(world.entranceY))) {
    return {
      x: Number(world.entranceX),
      y: Number(world.entranceY)
    };
  }

  const entrance = (world.objects || []).find(object => {
    const kind = String(object?.kind || object?.type || '').toLowerCase();
    return kind.includes('entrance') || kind.includes('exit') || kind.includes('stairs');
  });

  return entrance && Number.isFinite(Number(entrance.x)) && Number.isFinite(Number(entrance.y))
    ? { x: Number(entrance.x), y: Number(entrance.y) }
    : null;
}

function isNearDanger(world, x, y) {
  return (world?.enemies || []).some(enemy => {
    if (!enemy || enemy.alive === false || enemy.dead || enemy.remove) return false;
    return Math.hypot(Number(enemy.x || 0) - x, Number(enemy.y || 0) - y) < TILE * 1.5;
  });
}

function cleanupDepartingCoopPlayer(game, ally) {
  if (!ally) return;

  handleActorLeavingReviveState(game, ally);

  ally.active = false;
  ally.summons = [];
  ally.traps = [];
  ally.floatingTexts = [];
  ally.combatEffects = [];
  ally.pendingQuestXp = {};
  ally.interactLock = false;
  ally.coopAutosaveTimer = 0;
  ally.coopAbilityRefreshTimer = 0;
  ally.abilityCharge = null;
  cancelActiveHeavyAttackCharge(ally, game?.world);

  if (ally.combatState) {
    ally.combatState.attacking = false;
    ally.combatState.hitTargets = [];
    ally.combatState.projectiles = [];
    ally.combatState.heavyChargeActive = false;
    ally.combatState.heavyChargeTime = 0;
    ally.combatState.heavyChargeReady = false;
    ally.combatState.attackLungeRemaining = 0;
  }

  if (ally.actionState) {
    ally.actionState.dashing = false;
    ally.actionState.blocking = false;
    ally.actionState.sprinting = false;
  }

  if (Array.isArray(game?.world?.combatEffects)) {
    const ownerIds = new Set([
      ally.id,
      ally.profileId,
      ally.playerNumber,
      ally.slot
    ].filter(value => value !== undefined && value !== null).map(String));

    game.world.combatEffects = game.world.combatEffects.filter(effect => {
      const owner = effect?.ownerId ?? effect?.sourceId ?? effect?.playerId ?? null;
      return owner === null || !ownerIds.has(String(owner));
    });
  }
}

function syncCouchCoopSession(game) {
  if (!game?.player) return;

  pruneInactiveCouchCoopRuntimePlayers(game.player);
  normalizeCouchCoopSlots(game.player);

  game.currentSession = {
    worldOwnerProfileId: game.profileId || game.player.profileId || null,
    activePlayers: getActiveLocalPlayers(game.player).map(actor => {
      const slot = getCouchCoopActorSlot(actor);
      return {
        slot,
        profileId: slot === 1 ? game.profileId || actor.profileId || null : actor.profileId || null,
        inputDeviceId: slot === 1
          ? 'keyboardMouse'
          : `gamepad-${actor.controllerSlotIndex ?? Math.max(1, slot - 1)}`
      };
    })
  };
}

function normalizeCouchCoopSlots(player) {
  if (!player) return [];

  player.slot = 1;
  player.playerNumber = 1;

  const players = pruneInactiveCouchCoopRuntimePlayers(player);
  const usedSlots = new Set();
  const usedControllerSlots = new Set();

  for (const ally of players) {
    if (!ally) continue;

    const preferredSlot = Math.max(2, Math.min(4, Math.floor(Number(ally.slot || ally.playerNumber || 2))));
    let safeSlot = preferredSlot;

    if (usedSlots.has(safeSlot)) {
      safeSlot = [2, 3, 4].find(slot => !usedSlots.has(slot)) || null;
    }

    if (!safeSlot) {
      ally.active = false;
      continue;
    }

    usedSlots.add(safeSlot);
    ally.slot = safeSlot;
    ally.playerNumber = safeSlot;
    ally.sessionSlot = safeSlot;
    if (ally.networkRemote) { ally.controllerSlotIndex=100+safeSlot; continue; }

    let controllerSlotIndex = Number(ally.controllerSlotIndex);
    const defaultControllerSlotIndex = Math.max(0, Math.min(3, safeSlot - 1));

    if (
      !Number.isFinite(controllerSlotIndex) ||
      controllerSlotIndex < 0 ||
      controllerSlotIndex > 3 ||
      usedControllerSlots.has(controllerSlotIndex)
    ) {
      controllerSlotIndex = defaultControllerSlotIndex;
    }

    if (usedControllerSlots.has(controllerSlotIndex)) {
      controllerSlotIndex = [0, 1, 2, 3].find(slotIndex => !usedControllerSlots.has(slotIndex)) ?? defaultControllerSlotIndex;
    }

    usedControllerSlots.add(controllerSlotIndex);
    ally.controllerSlotIndex = controllerSlotIndex;
  }

  return players;
}

function pruneInactiveCouchCoopRuntimePlayers(player) {
  if (!player?.coop) return [];

  const players = Array.isArray(player.coop.players)
    ? player.coop.players
    : [];

  player.coop.players = players.filter(ally => {
    if (!ally) return false;
    return ally.active !== false;
  });

  return player.coop.players;
}

function getProfileClassName(profile) {
  const player = profile?.state?.player || {};
  const classId = player.classId || player.selectedClassId || profile?.classId || null;

  if (!classId) return 'Classless';

  return String(classId)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, letter => letter.toUpperCase());
}

// -----------------------------------------------------------------------------
// COUCH CO-OP PROFILE FLOW
// -----------------------------------------------------------------------------

function getUnifiedProfilesForCoopPicker(game) {
  const profiles = loadUnifiedProfilesWithLegacyMigration();
  const activeProfileIds = getActiveSessionProfileIds(game);

  return Object.values(profiles)
    .filter(profile => profile && profile.id)
    .sort((a, b) => Number(b.updated || 0) - Number(a.updated || 0))
    .map(profile => {
      const player = profile.state?.player || {};
      const profileId = profile.id || player.profileId;
      const disabled = activeProfileIds.has(profileId);

      return {
        ...profile,
        disabled,
        disabledReason: disabled ? 'Already Joined' : ''
      };
    });
}

function getActiveSessionProfileIds(game) {
  const ids = new Set();
  const hostId = game?.player?.profileId || game?.profileId || null;

  if (hostId) ids.add(hostId);

  for (const ally of getActiveCoopPlayers(game?.player)) {
    if (ally?.profileId) ids.add(ally.profileId);
  }

  return ids;
}

function openCouchCoopJoinMenu(game, slotNumber = 2, controllerSlotIndex = slotNumber - 1) {
  const safeSlot = Math.max(2, Math.min(4, Math.floor(slotNumber || 2)));
  const label = `Player ${safeSlot}`;
  const profiles = getUnifiedProfilesForCoopPicker(game);

  let overlay = document.getElementById('couchCoopJoinOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'couchCoopJoinOverlay';
    overlay.className = 'couch-coop-join-overlay';
    document.body.appendChild(overlay);
  }

  injectCouchCoopJoinStyles();

  game.couchCoopJoinMenu = {
    active: true,
    slot: safeSlot,
    controllerSlotIndex,
    profiles
  };

  overlay.__runalisGame = game;
  overlay.innerHTML = createCouchCoopJoinHtml(label, profiles);
  overlay.classList.add('active');
  overlay.dataset.controllerFocusIndex = '0';
  overlay.dataset.controllerSlotIndex = String(controllerSlotIndex);
  overlay.dataset.ownerSlot = String(safeSlot);
  overlay.tabIndex = -1;

  bindCouchCoopJoinMenuEvents(game, overlay);

  const focusables = getCouchCoopJoinFocusableElements(overlay);
  applyCouchCoopJoinFocus(overlay, focusables, 0);
  overlay.focus();

  game.log?.(`${label} joining. Choose or create a profile.`);
}

export function joinOnlineCoopPlayer(game, profile, networkId) {
  const slot=getNextOpenCoopSlot(game.player,2);
  if(!slot)return null;
  const ally={...profile,networkRemote:true,networkId,profileId:'online-'+networkId,coop:undefined};
  return completeCouchCoopJoin(game,{player:ally,isNewProfile:false,needsCharacterCreation:false},slot,100+slot);
}

function completeCouchCoopJoin(game, selected, safeSlot, controllerSlotIndex) {
  const coop = ensureCouchCoop(game);
  if (!coop || !selected?.player) return null;

  const finalSlot = getNextOpenCoopSlot(game.player, safeSlot);
  const selectedProfileId = selected.player.profileId || selected.player.id || null;

  if (!finalSlot) {
    game.log?.('All local player slots are already in use.');
    return null;
  }

  if (selectedProfileId && getActiveSessionProfileIds(game).has(selectedProfileId)) {
    game.log?.(`${selected.player.name || 'That profile'} is already in this session.`);
    return null;
  }

  const ally = selected.player;

  migratePlayer(ally);

  ally.slot = finalSlot;
  ally.playerNumber = finalSlot;
  ally.active = true;
  const spawn = findSafeCoopSpawn(game, finalSlot);
  ally.x = spawn.x;
  ally.y = spawn.y;
  ally.dirX = game.player.dirX || 1;
  ally.dirY = game.player.dirY || 0;
  ally.scale = ally.scale || 0.96;
  ally.origin = ally.networkRemote?'Online World':'Couch Co-op Session';
  ally.controllerSlotIndex = Math.max(0, Math.min(3, Number(controllerSlotIndex ?? finalSlot - 1)));
  ally.profileId = selectedProfileId || createProfileId();
  ally.profileSlot = ally.profileSlot || 'player1';
  ally.sessionSlot = finalSlot;

  ensurePlayerAppearance(ally);
  applyAppearanceToPlayer(ally, ally.appearance);
  ensurePlayer2StarterWeapon(ally);
  attachRuntimeOwner(ally, game.player);

  const existingIndex = coop.players.findIndex(player => player && player.slot === finalSlot);
  if (existingIndex >= 0) {
    coop.players[existingIndex] = ally;
  } else {
    coop.players.push(ally);
  }

  coop.enabled = true;
  saveCouchCoopProfile(game, ally);
  syncCouchCoopSession(game);

  game.log?.(`${ally.name || `Player ${finalSlot}`} joined as Player ${finalSlot}.`);

  if (selected.isNewProfile || selected.needsCharacterCreation) {
    openCouchCoopCharacterCreator(game, ally);
  }

  return ally;
}

function createCouchCoopJoinHtml(label, profiles) {
  const profileCards = profiles.length
    ? profiles.map((profile, index) => {
        const player = profile?.state?.player || {};
        const name = escapeHtml(profile?.name || player.name || `Profile ${index + 1}`);
        const className = escapeHtml(getProfileClassName(profile) || 'Classless');
        const level = Math.max(1, Number(player.level || player.combatLevel || 1));
        const savedAt = profile?.updatedText ||
          (profile?.updated ? new Date(profile.updated).toLocaleDateString() : 'Saved profile');
        const disabled = !!profile?.disabled;
        const disabledText = profile?.disabledReason || 'Already Joined';

        return `
          <button class="coop-join-card${disabled ? ' disabled' : ''}" type="button" data-coop-load="${index}"${disabled ? ' disabled aria-disabled="true"' : ''}>
            <span class="coop-join-card-title">${name}</span>
            <span>${className} Lv ${level}</span>
            <small>${escapeHtml(savedAt)}</small>
            ${disabled ? `<em>${escapeHtml(disabledText)}</em>` : ''}
          </button>
        `;
      }).join('')
    : '<div class="coop-join-empty">No real profiles yet. Create one here or from the main menu.</div>';

  return `
    <div class="coop-join-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(label)} join menu">
      <div class="coop-join-header">
        <span>Join Game</span>
        <h2>Select Profile for ${escapeHtml(label)}</h2>
        <p>Choose a real profile, or create a new one. Use D-pad to move, A to confirm, B to cancel.</p>
      </div>

      <div class="coop-join-create">
        <label for="coopJoinName">New Profile Name</label>
        <div class="coop-join-create-row">
          <input id="coopJoinName" data-coop-name maxlength="22" value="${escapeHtml(label)}" />
          <button type="button" data-coop-create>Create Real Profile</button>
        </div>
      </div>

      <div class="coop-join-list" aria-label="Real profiles">
        ${profileCards}
      </div>

      <div class="coop-join-actions">
        <button type="button" data-coop-cancel>Cancel</button>
      </div>
    </div>
  `;
}

function bindCouchCoopJoinMenuEvents(game, overlay) {
  overlay.querySelector('[data-coop-create]')?.addEventListener('click', () => {
    const menu = game.couchCoopJoinMenu || {};
    const safeSlot = menu.slot || 2;
    const name = String(overlay.querySelector('[data-coop-name]')?.value || `Player ${safeSlot}`).trim() || `Player ${safeSlot}`;
    const ally = createNewCoopProfile(game, name, safeSlot);
    saveCouchCoopProfile(game, ally);
    const selected = {
      player: ally,
      isNewProfile: true
    };

    closeCouchCoopJoinMenu(game, false);
    completeCouchCoopJoin(game, selected, safeSlot, menu.controllerSlotIndex ?? safeSlot - 1);
  });

  overlay.querySelectorAll('[data-coop-load]').forEach(button => {
    button.addEventListener('click', () => {
      const menu = game.couchCoopJoinMenu || {};
      const safeSlot = menu.slot || 2;
      const index = Number(button.dataset.coopLoad || 0);
      const profile = menu.profiles?.[index];

      if (!profile) {
        game.log?.(`Unable to load Player ${safeSlot} profile.`);
        return;
      }

      if (profile.disabled) {
        game.log?.(`${profile.name || 'That profile'} is already in this session.`);
        return;
      }

      const selected = {
        player: reviveStoredCoopProfile(profile, game, safeSlot),
        isNewProfile: false,
        needsCharacterCreation: !profile?.state?.player
      };

      closeCouchCoopJoinMenu(game, false);
      completeCouchCoopJoin(game, selected, safeSlot, menu.controllerSlotIndex ?? safeSlot - 1);
    });
  });

  overlay.querySelector('[data-coop-cancel]')?.addEventListener('click', () => {
    closeCouchCoopJoinMenu(game, true);
  });

  overlay.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeCouchCoopJoinMenu(game, true);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
    if (event.target?.matches?.('input') && event.key === 'Enter') return;

    event.preventDefault();
    event.stopPropagation();

    const input = {
      downPressed: event.key === 'ArrowDown',
      upPressed: event.key === 'ArrowUp',
      confirmPressed: event.key === 'Enter'
    };

    handleCouchCoopJoinMenuControllerInput(input);
  };
}

function closeCouchCoopJoinMenu(game, cancelled = false) {
  const overlay = document.getElementById('couchCoopJoinOverlay');
  const safeSlot = game?.couchCoopJoinMenu?.slot || 2;

  if (overlay) {
    overlay.classList.remove('active');
    overlay.innerHTML = '';
    overlay.__runalisGame = null;
    delete overlay.dataset.controllerSlotIndex;
    delete overlay.dataset.ownerSlot;
  }

  if (game?.couchCoopJoinMenu) {
    game.couchCoopJoinMenu.active = false;
    game.couchCoopJoinMenu = null;
  }

  if (cancelled) {
    game?.log?.(`Player ${safeSlot} join cancelled.`);
  }
}

function getCouchCoopJoinFocusableElements(overlay) {
  return [
    ...Array.from(overlay.querySelectorAll('[data-coop-load]')),
    ...Array.from(overlay.querySelectorAll('[data-coop-create]')),
    ...Array.from(overlay.querySelectorAll('[data-coop-cancel]')),
    ...Array.from(overlay.querySelectorAll('input')),
    ...Array.from(overlay.querySelectorAll('.menu-sheet-controls button'))
  ].filter(element => {
    if (!element || element.disabled || !menuSheetItemVisible(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function applyCouchCoopJoinFocus(overlay, focusables, index) {
  overlay.querySelectorAll('.coop-controller-focus').forEach(element => {
    element.classList.remove('coop-controller-focus');
  });

  const selected = focusables[index];
  if (!selected) return;

  selected.classList.add('coop-controller-focus');
  selected.focus?.({ preventScroll: true });
  if (!selected.closest('.menu-sheet-view')) selected.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function createNewCoopProfile(game, name = 'Player 2', slotNumber = 2) {
  const safeSlot = Math.max(2, Math.min(4, Math.floor(slotNumber || 2)));

  const ally = createDefaultProfile({
    name: name || `Player ${safeSlot}`,
    slot: 1,
    playerNumber: 1,
    profileSlot: 'player1'
  });

  ally.profileId = createProfileId();
  ally.profileSlot = 'player1';
  ally.slot = safeSlot;
  ally.playerNumber = safeSlot;
  ally.sessionSlot = safeSlot;
  ally.active = true;
  ally.origin = 'Couch Co-op Session';
  ally.scale = 0.96;

  const spawn = findSafeCoopSpawn(game, safeSlot);
  ally.x = spawn.x;
  ally.y = spawn.y;
  ally.dirX = game.player.dirX || 1;
  ally.dirY = game.player.dirY || 0;

  ensurePlayerAppearance(ally);
  applyAppearanceToPlayer(ally, ally.appearance);
  ensurePlayer2StarterWeapon(ally);

  migratePlayer(ally);

  return ally;
}

function reviveStoredCoopProfile(profile, game, slotNumber = 2) {
  const safeSlot = Math.max(2, Math.min(4, Math.floor(slotNumber || 2)));
  const profileState = profile?.state || null;
  const sourcePlayer = profileState?.player || profile?.player || profile || {};
  const profileId = profile?.id || sourcePlayer.profileId || profile?.profileId || createProfileId();
  const baseName = profile?.name || sourcePlayer.name || `Player ${safeSlot}`;
  const ally = normalizeProfileSave({
    ...createPlayer(baseName),
    ...(sourcePlayer || {}),
    profileId
  }, {
    name: baseName,
    slot: safeSlot,
    playerNumber: safeSlot,
    profileSlot: 'player1'
  });

  ally.name = baseName;
  ally.profileId = profileId;
  ally.profileSlot = sourcePlayer.profileSlot || 'player1';
  ally.slot = safeSlot;
  ally.playerNumber = safeSlot;
  ally.sessionSlot = safeSlot;
  ally.active = true;
  ally.origin = 'Couch Co-op Session';

  const spawn = findSafeCoopSpawn(game, safeSlot);
  ally.x = spawn.x;
  ally.y = spawn.y;
  ally.dirX = game.player.dirX || 1;
  ally.dirY = game.player.dirY || 0;
  ally.scale = ally.scale || 0.96;

  ensurePlayerAppearance(ally);
  applyAppearanceToPlayer(ally, ally.appearance);
  ensurePlayer2StarterWeapon(ally);

  migratePlayer(ally);

  return ally;
}

function openCouchCoopCharacterCreator(game, ally) {
  if (!game || !ally) return;

  setTimeout(() => {
    const playerGameView = game.setUiOwner?.(ally) || game.getActorGameView?.(ally) || {
      ...game,
      player: ally,

      log(message) {
        game.log?.(message);
      },

      save(showLog = false) {
        saveCouchCoopProfile(game, ally);

        if (showLog) {
          game.log?.(`${ally.name || `Player ${ally.slot || 2}`} profile saved.`);
        }

        return true;
      },

      renderPauseMenu: game.renderPauseMenu?.bind(game)
    };

    game.log?.(`${ally.name || `Player ${ally.slot || 2}`} can now customize their appearance.`);

    openCharacterCreator(playerGameView);
  }, 0);
}

// -----------------------------------------------------------------------------
// COUCH CO-OP PROFILE SAVE / LOAD
// -----------------------------------------------------------------------------

function autosaveCouchCoopProfile(game, ally, dt) {
  if (!ally || ally.active === false) return;

  ally.coopAutosaveTimer = (ally.coopAutosaveTimer || 0) + dt;

  if (ally.coopAutosaveTimer < COUCH_COOP_AUTOSAVE_SECONDS) return;

  ally.coopAutosaveTimer = 0;
  saveCouchCoopProfile(game, ally);
}

export function saveCouchCoopProfile(game, ally) {
  if (ally?.networkRemote) return true; // Their browser owns their profile.
  if (!ally || (ally.slot || 0) < 2 || (ally.slot || 0) > 4) return false;

  ensurePlayerAppearance(ally);
  applyAppearanceToPlayer(ally, ally.appearance);

  const profiles = loadUnifiedProfilesWithLegacyMigration();
  const profile = serializeCoopPlayerAsUnifiedProfile(game, ally, profiles);

  if (!profile) return false;

  profiles[profile.id] = profile;
  const saved = saveUnifiedProfiles(profiles);

  if (!saved) {
    game?.log?.(`Unable to save ${profile.name || `Player ${ally.slot || 2}`} profile.`);
  }

  return saved;
}

function serializeCoopPlayerAsUnifiedProfile(game, ally, profiles = {}) {
  if (!ally) return null;
  const profileId = ally.profileId || createProfileId();
  const existingProfile = profiles?.[profileId] || null;
  const existingState = existingProfile?.state && typeof existingProfile.state === 'object'
    ? structuredCloneSafe(existingProfile.state)
    : {};
  const playerProfile = serializeCoopPlayerForProfile(ally);
  const state = normalizeGameState({
    ...existingState,
    version: SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    player: playerProfile,
    worldMode: existingState.worldMode || 'capital',
    worldName: existingState.worldName || 'Orrakai',
    worldRegionId: existingState.worldRegionId || game?.world?.regionId || 'hearthmereFrontier',
    worldActId: existingState.worldActId || game?.world?.actId || 'act1',
    worldTheme: existingState.worldTheme || null,
    worldDepth: existingState.worldDepth || null,
    worldTier: existingState.worldTier || null,
    worldRouteId: existingState.worldRouteId || null,
    worldSideZoneType: existingState.worldSideZoneType || null,
    worldSeed: existingState.worldSeed || null,
    worldFloor: existingState.worldFloor || null,
    worldInfiniteDungeonRegionId: existingState.worldInfiniteDungeonRegionId || null,
    worldDungeonState: existingState.worldDungeonState || null,
    worldTiles: null,
    worldTerrainFeatures: null,
    worldObjects: null,
    enemies: null,
    worldDrops: [],
    overworldState: existingState.overworldState || null,
    logLines: Array.isArray(existingState.logLines) ? existingState.logLines.slice(0, 40) : [],
    camera: existingState.camera || {
      x: Number(playerProfile.x || 0) - 480,
      y: Number(playerProfile.y || 0) - 270
    }
  });

  return {
    id: profileId,
    name: playerProfile.profileName || playerProfile.name || existingProfile?.name || 'Wayfarer',
    updated: Date.now(),
    updatedText: new Date().toLocaleString(),
    state
  };
}

function serializeCoopPlayerForProfile(ally) {
  const clone = structuredCloneSafe(ally);
  sanitizeActorReviveStateForSave(clone);
  clone.profileId = clone.profileId || createProfileId();
  clone.profileSlot = 'player1';
  clone.slot = 1;
  clone.playerNumber = 1;
  clone.origin = clone.origin === 'Couch Co-op Session' ? 'Profile' : clone.origin;
  clone.currentPosition = {
    x: Number(clone.x || 0),
    y: Number(clone.y || 0)
  };

  clone.cooldownClockSeconds=performance.now()/1000;
  const profile = normalizeProfileSave(clone, {
    slot: 1,
    playerNumber: 1,
    profileId: clone.profileId,
    profileSlot: 'player1',
    name: clone.name || clone.profileName || 'Wayfarer'
  });

  delete profile.questOwner;
  delete profile.interactLock;
  delete profile.coopAutosaveTimer;
  delete profile.coopAbilityRefreshTimer;
  delete profile.controllerSlotIndex;
  delete profile.sessionSlot;
  delete profile.active;
  delete profile.coop;
  delete profile.downedState;
  delete profile.reviveAction;
  delete profile.invulnerableUntil;
  profile.lifeState = 'alive';

  if (profile.summons) {
    profile.summons = [];
  }

  if (profile.combat) {
    delete profile.combat.currentAttack;
    delete profile.combat.hitTargets;
  }

  if (profile.statusEffects) {
    profile.statusEffects = Array.isArray(profile.statusEffects)
      ? profile.statusEffects.filter(effect => effect?.persistent)
      : [];
  }

  profile.profileId = profile.profileId || clone.profileId || createProfileId();
  profile.profileSlot = 'player1';
  profile.slot = 1;
  profile.playerNumber = 1;
  profile.savedAt = Date.now();

  return profile;
}

function loadUnifiedProfilesWithLegacyMigration() {
  const profiles = loadUnifiedProfiles();
  const migration = migrateLegacyCouchCoopProfiles(profiles);

  if (migration.changed) {
    saveUnifiedProfiles(profiles);
  }

  if (migration.found) {
    removeLegacyCouchCoopProfiles();
    console.info(
      `Runalis co-op profile migration: migrated ${migration.migrated}, skipped ${migration.skipped}.`
    );
  }

  return profiles;
}

function loadUnifiedProfiles() {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(UNIFIED_PROFILE_STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function saveUnifiedProfiles(profiles) {
  if (!canUseLocalStorage()) return false;

  try {
    const cleanProfiles = profiles && typeof profiles === 'object' && !Array.isArray(profiles)
      ? profiles
      : {};

    window.localStorage.setItem(
      UNIFIED_PROFILE_STORAGE_KEY,
      JSON.stringify(cleanProfiles)
    );

    return true;
  } catch {
    return false;
  }
}

function migrateLegacyCouchCoopProfiles(profiles) {
  const result = {
    found: false,
    changed: false,
    migrated: 0,
    skipped: 0
  };

  if (!canUseLocalStorage()) return result;

  let legacyProfiles = [];

  try {
    const raw = window.localStorage.getItem(LEGACY_COUCH_COOP_STORAGE_KEY);
    if (!raw) return result;

    const parsed = JSON.parse(raw);
    legacyProfiles = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    result.found = true;
    return result;
  }

  result.found = true;

  for (const legacyProfile of legacyProfiles) {
    if (!isMeaningfulLegacyCoopProfile(legacyProfile)) {
      result.skipped++;
      continue;
    }

    const profileId = legacyProfile.profileId || createProfileId();
    if (profiles[profileId]) {
      result.skipped++;
      continue;
    }

    const player = serializeCoopPlayerForProfile({
      ...legacyProfile,
      profileId,
      profileSlot: legacyProfile.profileSlot || 'player1',
      slot: 1,
      playerNumber: 1
    });
    const state = normalizeGameState({
      version: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      player,
      worldMode: 'capital',
      worldName: 'Orrakai',
      worldRegionId: 'hearthmereFrontier',
      worldActId: 'act1',
      worldTiles: null,
      worldObjects: null,
      enemies: null,
      worldDrops: []
    });

    profiles[profileId] = {
      id: profileId,
      name: player.profileName || player.name || legacyProfile.name || 'Wayfarer',
      updated: legacyProfile.savedAt || Date.now(),
      updatedText: legacyProfile.savedAt
        ? new Date(legacyProfile.savedAt).toLocaleString()
        : new Date().toLocaleString(),
      state
    };
    result.changed = true;
    result.migrated++;
  }

  return result;
}

function removeLegacyCouchCoopProfiles() {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(LEGACY_COUCH_COOP_STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function isMeaningfulLegacyCoopProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;

  const name = String(profile.name || profile.profileName || '').trim();
  if (name && !/^Player [2-4]$/i.test(name)) return true;
  if (profile.classId || profile.selectedClassId || profile.className) return true;
  if (Number(profile.level || profile.combatLevel || 1) > 1) return true;
  if (Number(profile.xp || profile.totalXp || 0) > 0) return true;
  if (Number(profile.gold || 0) > 0) return true;

  const inventory = Array.isArray(profile.inventory) ? profile.inventory : [];
  if (inventory.some(item => item && !['oldKnife', 'fieldRations'].includes(item.id || item.itemId))) {
    return true;
  }

  const equipment = profile.equipment && typeof profile.equipment === 'object' ? profile.equipment : {};
  if (Object.entries(equipment).some(([slot, itemId]) => slot !== 'weapon' ? !!itemId : itemId && itemId !== 'oldKnife')) {
    return true;
  }

  return false;
}

function createProfileId(slotNumber = 1) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `p${slotNumber}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON clone.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
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

function injectCouchCoopJoinStyles() {
  if (document.getElementById('runalisCouchCoopJoinStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisCouchCoopJoinStyles';
  style.textContent = `
    .couch-coop-join-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 28px;
      background:
        radial-gradient(circle at 50% 18%, rgba(217, 173, 79, 0.16), transparent 34%),
        rgba(3, 5, 10, 0.82);
      backdrop-filter: blur(4px);
    }

    .couch-coop-join-overlay.active {
      display: flex;
    }

    .coop-join-panel {
      width: min(860px, 94vw);
      max-height: min(680px, 90vh);
      display: grid;
      grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.1fr);
      gap: 18px;
      padding: 22px;
      color: #efe3c3;
      background:
        linear-gradient(180deg, rgba(31, 31, 39, 0.98), rgba(11, 12, 18, 0.98)),
        #12141c;
      border: 1px solid rgba(217, 173, 79, 0.42);
      box-shadow:
        0 26px 70px rgba(0, 0, 0, 0.62),
        inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    .coop-join-header,
    .coop-join-create,
    .coop-join-actions {
      grid-column: 1;
    }

    .coop-join-header span {
      display: block;
      margin-bottom: 8px;
      color: #d9ad4f;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.6px;
      text-transform: uppercase;
    }

    .coop-join-header h2 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: 0;
    }

    .coop-join-header p {
      margin: 0;
      color: #aeb6c7;
      line-height: 1.45;
    }

    .coop-join-create {
      align-self: start;
      padding: 16px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .coop-join-create label {
      display: block;
      margin-bottom: 8px;
      color: #d9ad4f;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 12px;
    }

    .coop-join-create-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
    }

    .coop-join-panel input,
    .coop-join-panel button {
      min-height: 46px;
      border-radius: 4px;
      border: 1px solid rgba(217, 173, 79, 0.3);
      color: #f4ead2;
      background: linear-gradient(180deg, rgba(35, 34, 44, 0.96), rgba(13, 14, 21, 0.98));
      font: inherit;
    }

    .coop-join-panel input {
      padding: 0 12px;
      min-width: 0;
      color: #ffffff;
    }

    .coop-join-panel button {
      padding: 0 16px;
      cursor: pointer;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .coop-join-list {
      grid-column: 2;
      grid-row: 1 / span 3;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: start;
      gap: 12px;
      min-height: 250px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .coop-join-card {
      min-height: 118px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 8px;
      text-align: left;
    }

    .coop-join-card-title {
      color: #ffffff;
      font-size: 17px;
      font-weight: 900;
    }

    .coop-join-card span:not(.coop-join-card-title),
    .coop-join-card small,
    .coop-join-card em,
    .coop-join-empty {
      color: #aeb6c7;
    }

    .coop-join-card em {
      font-style: normal;
      color: #ffcc66;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .coop-join-card.disabled,
    .coop-join-card:disabled {
      opacity: 0.58;
      cursor: not-allowed;
      border-color: rgba(255, 255, 255, 0.12);
      filter: grayscale(0.35);
    }

    .coop-join-empty {
      grid-column: 1 / -1;
      align-self: center;
      justify-self: center;
      text-align: center;
      padding: 24px;
      border: 1px dashed rgba(217, 173, 79, 0.22);
    }

    .coop-join-actions {
      align-self: end;
      display: flex;
      justify-content: flex-start;
    }

    .coop-controller-focus {
      outline: 3px solid rgba(255, 204, 102, 0.95) !important;
      outline-offset: 3px !important;
      box-shadow:
        0 0 0 4px rgba(217, 173, 79, 0.18),
        0 0 32px rgba(217, 173, 79, 0.38) !important;
      border-color: rgba(255, 204, 102, 0.9) !important;
    }

    @media (max-width: 760px) {
      .coop-join-panel {
        grid-template-columns: 1fr;
      }

      .coop-join-header,
      .coop-join-create,
      .coop-join-actions,
      .coop-join-list {
        grid-column: 1;
        grid-row: auto;
      }

      .coop-join-list {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

// -----------------------------------------------------------------------------
// PLAYER 2 DEFAULT SETUP
// -----------------------------------------------------------------------------

function ensurePlayer2StarterWeapon(ally) {
  ally.equipment = ally.equipment || {};

  if (ally.equipment.weapon) return;

  addItem(ally, 'oldKnife', 1);
  ally.equipment.weapon = 'oldKnife';
}

// -----------------------------------------------------------------------------
// INPUT / MOVEMENT / COMBAT
// -----------------------------------------------------------------------------

function buildAllyInput(game, ally, controllerInput, keyboardInput) {
  const useController = !!controllerInput?.connected;

  const keyboard = keyboardInput || {};
  const moveX = useController ? controllerInput.moveX : keyboard.moveX || 0;
  const moveY = useController ? controllerInput.moveY : keyboard.moveY || 0;
  const keyboardAim = normalizeKeyboardFallbackAim(ally, moveX, moveY);
  const input = {
    moveX,
    moveY,
    mouseWorldX: ally.x + keyboardAim.x * 140,
    mouseWorldY: ally.y + keyboardAim.y * 140,
    attackHeld: useController ? controllerInput.attackHeld : !!keyboard.attackHeld,
    attackPressed: useController ? controllerInput.attackPressed : !!keyboard.attackPressed,
    attackReleased: useController ? controllerInput.attackReleased : !!keyboard.attackReleased,
    sprintHeld: useController ? controllerInput.sprintHeld : !!keyboard.sprintHeld,
    blockHeld: useController ? controllerInput.blockHeld : !!keyboard.blockHeld,
    dashPressed: useController ? controllerInput.dashPressed : !!keyboard.dashPressed,
    confirmPressed: useController ? controllerInput.confirmPressed : !!keyboard.interactPressed,
    confirmHeld: useController ? controllerInput.confirmHeld : !!keyboard.interactHeld,
    cancelPressed: useController ? controllerInput.cancelPressed : false,
    backPressed: useController ? controllerInput.backPressed : false,
    pausePressed: useController ? controllerInput.pausePressed : false,
    interactPressed: useController ? controllerInput.interactPressed : !!keyboard.interactPressed,
    interactHeld: useController ? controllerInput.confirmHeld : !!keyboard.interactHeld,
    ability0Pressed: useController ? controllerInput.ability0Pressed : !!keyboard.ability0Pressed,
    ability0Held: useController ? controllerInput.ability0Held : !!keyboard.ability0Held,
    ability0Released: useController ? controllerInput.ability0Released : !!keyboard.ability0Released,
    ability1Pressed: useController ? controllerInput.ability1Pressed : !!keyboard.ability1Pressed,
    ability1Held: useController ? controllerInput.ability1Held : !!keyboard.ability1Held,
    ability1Released: useController ? controllerInput.ability1Released : !!keyboard.ability1Released,
    ability2Pressed: useController ? controllerInput.ability2Pressed : !!keyboard.ability2Pressed
    ,
    ability2Held: useController ? controllerInput.ability2Held : !!keyboard.ability2Held,
    ability2Released: useController ? controllerInput.ability2Released : !!keyboard.ability2Released,
    ability3Pressed: useController ? controllerInput.ability3Pressed : !!keyboard.ability3Pressed,
    ability3Held: useController ? controllerInput.ability3Held : !!keyboard.ability3Held,
    ability3Released: useController ? controllerInput.ability3Released : !!keyboard.ability3Released,
    ability4Pressed: useController ? controllerInput.ability4Pressed : !!keyboard.ability4Pressed,
    ability4Held: useController ? controllerInput.ability4Held : !!keyboard.ability4Held,
    ability4Released: useController ? controllerInput.ability4Released : !!keyboard.ability4Released
  };

  if (useController) {
    const aim = resolveActorCombatAim(ally, controllerInput);
    if(ally.networkRemote&&controllerInput.pointerAimActive){
      aim.source=controllerInput.pointerAimSource;aim.rightStickActive=false;
      aim.targetX=ally.x+aim.x*controllerInput.aimDistance;aim.targetY=ally.y+aim.y*controllerInput.aimDistance;
    }
    writeCombatAimToInput(input, ally, aim, 140);
  } else {
    clearCombatAimInput(input);
  }

  return input;
}

function normalizeKeyboardFallbackAim(actor, moveX, moveY) {
  const movementDistance = Math.hypot(Number(moveX || 0), Number(moveY || 0));

  if (movementDistance > 0.001) {
    return {
      x: Number(moveX || 0) / movementDistance,
      y: Number(moveY || 0) / movementDistance
    };
  }

  const facingX = Number(actor?.dirX || 1);
  const facingY = Number(actor?.dirY || 0);
  const facingDistance = Math.hypot(facingX, facingY) || 1;

  return {
    x: facingX / facingDistance,
    y: facingY / facingDistance
  };
}

function moveAlly(game, ally, input, dt) {
  const dashVelocity = getPlayerDashVelocity(ally);

  if (dashVelocity.x || dashVelocity.y) {
    moveActorWithCollision(game, ally, dashVelocity.x * dt, dashVelocity.y * dt);
    ally.dirX = dashVelocity.x;
    ally.dirY = dashVelocity.y;
    return;
  }

  const dx = input.moveX || 0;
  const dy = input.moveY || 0;

  ally.isMoving = !!(dx || dy);

  if (!dx && !dy) {
    applyCombatAimFacing(ally, input.combatAimX !== null ? ally.combatAim : null, {
      onlyRightStick: false
    });
    updateActorLocomotionAudio(ally);
    return;
  }

  const aimFacingApplied = applyCombatAimFacing(ally, ally.combatAim, {
    onlyRightStick: true
  });

  if (!aimFacingApplied) {
    ally.dirX = dx;
    ally.dirY = dy;
  }
  ally.walkTime = (ally.walkTime || 0) + dt * 9;

  const speed = 205 * getPlayerMovementMultiplier(ally);
  moveActorWithCollision(game, ally, dx * speed * dt, dy * speed * dt);
  updateActorLocomotionAudio(ally);
}

function moveActorWithCollision(game, actor, dx, dy) {
  const next = applyDungeonPartyTether(game, actor, actor.x + dx, actor.y + dy);
  const nx = next.x;
  const ny = next.y;
  moveWorldActor(actor, game.world, nx-actor.x, ny-actor.y, 12);
}

function interactAsAlly(game, ally) {
  interactWithWorld(createAllyGameView(game, ally));
}

function createAllyGameView(game, ally) {
  const ownedView = game.getActorGameView?.(ally);
  if (ownedView) return ownedView;

  return {
    ...game,
    hostGame: game,
    player: ally,
    log: typeof game.log === 'function' ? game.log.bind(game) : console.log,
    shake: game.shake?.bind(game),
    renderPauseMenu: game.renderPauseMenu?.bind(game)
  };
}

function isCoopActorBusy(game, ally) {
  if (ally.networkMenuBusy) return true;
  if (game?.dialogue?.active && game.dialogue.actor === ally) return true;

  const panel = document.querySelector('.panel.open');
  if (panel && game?.uiOwner === ally) return true;

  const ownerOverlays = [
    document.getElementById('workshopServiceOverlay'),
    document.getElementById('marketShopOverlay'),
    document.getElementById('fishingMiniGameOverlay'),
    document.getElementById('characterCreatorOverlay')
  ];
  const slot = getCouchCoopActorSlot(ally);

  return ownerOverlays.some(overlay => {
    return overlay?.classList.contains('active') && Number(overlay.dataset.ownerSlot) === slot;
  });
}

function suppressAllyGameplayInput(input) {
  return {
    ...input,
    suppressAttackInput: true,
    moveX: 0,
    moveY: 0,
    attackHeld: false,
    attackPressed: false,
    attackReleased: false,
    sprintHeld: false,
    blockHeld: false,
    dashPressed: false,
    confirmPressed: false,
    confirmHeld: false,
    cancelPressed: false,
    backPressed: false,
    pausePressed: false,
    interactPressed: false,
    interactHeld: false,
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
}


// -----------------------------------------------------------------------------
// RUNTIME HELPERS
// -----------------------------------------------------------------------------

function attachRuntimeOwner(ally, owner) {
  try {
    Object.defineProperty(ally, 'questOwner', {
      value: owner,
      enumerable: false,
      configurable: true
    });
  } catch {
    ally.questOwner = owner;
  }
}
