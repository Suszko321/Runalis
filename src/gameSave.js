import {installMalakarSanctum} from './malakarEncounter.js';
import {cancelPartyEntry} from './partyEntrySystem.js';
import {syncBossReturnPortals} from './bossReturnPortals.js';
import {rememberRepeatableInstance} from './instanceEncounterMemory.js';
import {endWorkshopSession} from './workshopAccess.js';
import {initializeDungeonArena} from './dungeonArenaSystem.js';
import {configureEncounterEnemy,dungeonEncounterProfile} from './encounterData.js';
import {CONTINENT_REGIONS} from './continentDefinition.js';
import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import {ensureHumanoidEnemyEquipment,migrateLastDawnDisplayText} from './humanoidEnemies.js';
import {migrateOrrakaiPosition} from './orrakaiLayout.js';
import {installVeyreign} from './veyreignDungeon.js';
import {syncDungeonCompletion} from './dungeonCompletion.js';
import {migrateEchorynPosition} from './echorynLayout.js';
import {captureContinentalState,restoreContinentalState} from './continentPersistence.js';
import {CONTINENT_VERSION,migrateContinentalPosition} from './continentDefinition.js';
import { handleMenuSheetInput, menuSheetItemVisible, revealMenuFocus } from './menuSheets.js';
// gameSave.js
// Runalis save/profile/menu system.
//
// Responsibilities:
// - profile localStorage read/write
// - safe save shrinking to avoid localStorage quota errors
// - save-state migration
// - save sanitization
// - profile list UI
// - main menu / game screen switching
// - profile creation and loading callbacks
// - controller navigation for main profile menu
//
// Controller update:
// - Any connected controller can navigate the main profile menu.
// - Controller can select profile name field, Create, Load, Delete.
// - Typing names still uses keyboard.
// - A / Confirm activates selected option.
// - B / Cancel returns focus to profile name or clears menu focus.
// - D-pad / left stick navigates menu focus.

import { createWorld,isActorPositionPassable } from './world.js';
import { createRegionWorld, createTravelRouteWorld } from './regionWorlds.js';
import { createProceduralSideZoneWorld } from './sideZoneSystem.js';
import {installOrchardDungeon} from './ashenOrchardDungeon.js';
import { createCapitalHubWorld } from './hubSystem.js';
import { createCaravanOpeningWorld, createMaraHouseWorld } from './act1OpeningSystem.js';
import { createPlayer, migratePlayer } from './player.js';
import {
  SAVE_SCHEMA_VERSION,
  createDefaultProfile,
  normalizeProfileSave,
  normalizeGameState,
  saveProfile,
  loadProfile,
  saveGameState,
  loadGameState
} from './saveProfiles.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, getDefaultWorldName, normalizePlayerFacingWorldName } from './worldNames.js';

export {
  SAVE_SCHEMA_VERSION,
  createDefaultProfile,
  normalizeProfileSave,
  saveProfile,
  loadProfile,
  saveGameState,
  loadGameState
};

import {
  ensurePlayerDialogueAndQuestState,
  restoreDialogueState,
  serializeDialogueState
} from './dialogueSystem.js';

import {
  createControllerManager,
  updateControllerManager,
  getAllControllerInputs
} from './inputController.js';

import {
  clearCouchCoopRuntimeState,
  saveAllCouchCoopProfiles
} from './couchCoop.js';

import {
  sanitizeActorReviveStateForSave
} from './coopReviveSystem.js';

// -----------------------------------------------------------------------------
// STORAGE CONFIG
// -----------------------------------------------------------------------------

export const PROFILE_KEY = 'runalis-profiles-v7-slim-save';

const OLD_PROFILE_KEYS = [
  'runalis-profiles-v6-dialogue-world-content',
  'runalis-profiles-v6',
  'runalis-profiles-v5',
  'runalis-profiles-v4'
];
const OLD_COUCH_COOP_PROFILE_KEYS = [
  'runalis.couchCoop.player2Profiles.v1'
];

// -----------------------------------------------------------------------------
// PROFILE MENU CONTROLLER STATE
// -----------------------------------------------------------------------------

let profileMenuController = null;
let profileMenuAnimationFrame = null;
let profileMenuStartCallback = null;
let profileMenuFocusIndex = 0;
let pendingDeleteProfileId = null;

// -----------------------------------------------------------------------------
// PROFILE STORAGE
// -----------------------------------------------------------------------------

export function readProfiles() {
  try {
    const current = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};

    if (Object.keys(current).length) {
      const migration = migrateLegacyCouchCoopProfilesInto(current);
      if (migration.changed) {
        writeProfiles(current);
      }
      if (migration.found) {
        clearLegacyCouchCoopProfileStorage();
        console.info(
          `Runalis co-op profile migration: migrated ${migration.migrated}, skipped ${migration.skipped}.`
        );
      }
      return current;
    }

    // One-time migration attempt from old profile keys.
    for (const oldKey of OLD_PROFILE_KEYS) {
      const oldProfiles = JSON.parse(localStorage.getItem(oldKey)) || {};

      if (Object.keys(oldProfiles).length) {
        const slimProfiles = slimProfileCollection(oldProfiles);
        const migration = migrateLegacyCouchCoopProfilesInto(slimProfiles);
        if (migration.found) {
          clearLegacyCouchCoopProfileStorage();
          console.info(
            `Runalis co-op profile migration: migrated ${migration.migrated}, skipped ${migration.skipped}.`
          );
        }
        writeProfiles(slimProfiles);
        return slimProfiles;
      }
    }

    const migration = migrateLegacyCouchCoopProfilesInto(current);
    if (migration.changed) {
      writeProfiles(current);
    }
    if (migration.found) {
      clearLegacyCouchCoopProfileStorage();
      console.info(
        `Runalis co-op profile migration: migrated ${migration.migrated}, skipped ${migration.skipped}.`
      );
      return current;
    }

    return {};
  } catch (err) {
    console.warn('Failed to read profiles:', err);
    return {};
  }
}

export function writeProfiles(profiles) {
  try {
    clearLegacyProfileStorage();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    return true;
  } catch (err) {
    console.error('Failed to save profiles:', err);

    try {
      clearLegacyProfileStorage();
      const slimProfiles = slimProfileCollection(profiles);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(slimProfiles));
      return true;
    } catch (secondErr) {
      console.error('Failed to save even after slimming profiles:', secondErr);

      try {
        clearLegacyProfileStorage();
        const emergencyProfiles = emergencySlimProfileCollection(profiles);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(emergencyProfiles));
        return true;
      } catch (thirdErr) {
        console.error('Failed to save emergency slim profiles:', thirdErr);
        return false;
      }
    }
  }
}

export function deleteProfile(profileId) {
  const profiles = readProfiles();

  delete profiles[profileId];

  writeProfiles(profiles);

  return profiles;
}

export function upsertProfile(profileId, profileName, state) {
  const profiles = readProfiles();

  profiles[profileId] = {
    id: profileId,
    name: profileName,
    updated: Date.now(),
    updatedText: stamp(),
    state: slimSaveState(state)
  };

  const saved = writeProfiles(profiles);

  return {
    saved,
    profiles,
    profile: profiles[profileId]
  };
}

export function stamp() {
  return new Date().toLocaleString();
}

// -----------------------------------------------------------------------------
// SAVE EXPORT / IMPORT HELPERS
// -----------------------------------------------------------------------------

export function createSaveState(game) {
  if (!game) return null;

  captureContinentalState(game);
  rememberRepeatableInstance(game);
  const isInstancedWorld = ['dungeon', 'tower', 'sideZone'].includes(game.world?.mode);
  const hostPlayer = createHostPlayerSaveSnapshot(game.player);

  return slimSaveState({
    version: SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    continentId: game.world?.continentId || game.overworldState?.continentId || null,
    geographyVersion: game.world?.continentId || game.overworldState?.continentId ? CONTINENT_VERSION : Math.max(0, Number(game.player?.geographyVersion) || 0),

    player: sanitizeForSave(normalizeProfileSave(hostPlayer, {
      slot: 1,
      playerNumber: 1,
      profileId: game.profileId,
      name: game.profileName,
      currentZone: normalizePlayerFacingWorldName(game.world?.name, ACT1_OVERWORLD_DISPLAY_NAME)
    })),

    worldMode: game.world?.mode || 'overworld',
    worldName: normalizePlayerFacingWorldName(game.world?.name, ACT1_OVERWORLD_DISPLAY_NAME),
    worldTheme: game.world?.theme || null,
    worldDepth: game.world?.depth || null,
    worldTier: game.world?.tier || null,
    worldRegionId: game.world?.regionId || game.player?.regions?.currentRegionId || 'hearthmereFrontier',
    worldActId: game.world?.actId || null,
    worldRouteId: game.world?.routeId || null,
    worldSideZoneType: game.world?.sideZoneType || null,
    worldSeed: game.world?.sideZoneSeed || game.world?.seed || null,
    worldFloor: game.world?.floor || null,
    worldCleared: !!game.world?.cleared,
    worldInfiniteDungeonRegionId: game.world?.infiniteDungeonRegionId || null,
    worldEncounterLayout:isInstancedWorld?sanitizeForSave({dungeonId:game.world.dungeonId,entranceId:game.world.entranceId,poiId:game.world.poiId,rooms:game.world.rooms,halls:game.world.halls,spawn:game.world.spawn,exit:game.world.exit,bossRoomCenter:game.world.bossRoomCenter,floorSeed:game.world.floorSeed,floorType:game.world.floorType}):null,
    worldDungeonState: isInstancedWorld
      ? sanitizeForSave(game.world.dungeonState || null)
      : null,

    // IMPORTANT:
    // The overworld is deterministic and regenerated from code.
    // Do not save overworld tiles/features/objects/enemies.
    worldTiles: isInstancedWorld ? sanitizeForSave(game.world.tiles || []) : null,
    worldTerrainFeatures: null,
    worldObjects: isInstancedWorld ? sanitizeForSave(game.world.objects || []) : null,
    enemies: isInstancedWorld ? sanitizeForSave(game.world.enemies || []) : null,
    worldDrops: isInstancedWorld ? sanitizeForSave(game.world.drops || []) : [],

    overworldState: game.overworldState ? slimOverworldState(game.overworldState) : null,
    currentSession: game.currentSession ? sanitizeForSave(game.currentSession) : null,
    lastKnownLocalPlayers: Array.isArray(game.currentSession?.activePlayers)
      ? sanitizeForSave(game.currentSession.activePlayers.map(entry => ({
          slot: entry.slot,
          profileId: entry.profileId || null
        })))
      : [
          {
            slot: 1,
            profileId: game.profileId || game.player?.profileId || null
          }
        ],

    logLines: Array.isArray(game.logLines) ? game.logLines.slice(0, 40) : [],

    camera: {
      x: Number(game.camera?.x || 0),
      y: Number(game.camera?.y || 0)
    },

    dialogueState: sanitizeForSave(serializeDialogueState(game.dialogue))
  });
}

export function slimSaveState(saveState) {
  if (!saveState) return null;

  const normalized = normalizeGameState(saveState);
  const isInstancedWorld = ['dungeon', 'tower', 'sideZone'].includes(saveState.worldMode);

  return {
    ...normalized,

    version: SAVE_SCHEMA_VERSION,

    // Never allow overworld bloat into localStorage.
    worldTiles: isInstancedWorld ? normalized.worldTiles || [] : null,
    worldTerrainFeatures: null,
    worldObjects: isInstancedWorld ? normalized.worldObjects || [] : null,
    enemies: isInstancedWorld ? normalized.enemies || [] : null,
    worldDrops: isInstancedWorld ? normalized.worldDrops || [] : [],
    worldEncounterLayout:isInstancedWorld?normalized.worldEncounterLayout||null:null,
    worldDungeonState: isInstancedWorld
      ? normalized.worldDungeonState || null
      : null,
    overworldState: normalized.overworldState ? slimOverworldState(normalized.overworldState) : null,

    worldEffects: [],
    effects: [],

    logLines: Array.isArray(normalized.logLines)
      ? normalized.logLines.slice(0, 40)
      : []
  };
}

export function slimProfileCollection(profiles) {
  const slimProfiles = {};

  for (const [id, profile] of Object.entries(profiles || {})) {
    slimProfiles[id] = {
      id: profile.id || id,
      name: profile.name || 'Wayfarer',
      updated: profile.updated || Date.now(),
      updatedText: profile.updatedText || stamp(),
      state: profile.state ? slimSaveState(profile.state) : null
    };
  }

  return slimProfiles;
}

export function emergencySlimProfileCollection(profiles) {
  const entries = Object.entries(slimProfileCollection(profiles))
    .sort((a, b) => (b[1]?.updated || 0) - (a[1]?.updated || 0))
    .slice(0, 6);

  const emergencyProfiles = {};

  for (const [id, profile] of entries) {
    const state = profile.state || null;
    const player = sanitizeForSave(state?.player || {});
    const returnState = state?.overworldState;
    const recoverInstance = ['dungeon', 'tower', 'sideZone'].includes(state?.worldMode);
    const recoveryMode = recoverInstance ? (['overworld','travelRoute'].includes(returnState?.mode) ? 'overworld' : 'capital') : state?.worldMode;
    if (recoverInstance && returnState?.returnPoint) Object.assign(player, returnState.returnPoint);
    if (recoverInstance) player.currentZone = recoveryMode === 'capital' ? 'Orrakai' : (returnState?.name || ACT1_OVERWORLD_DISPLAY_NAME);

    emergencyProfiles[id] = {
      id: profile.id || id,
      name: profile.name || player.name || 'Wayfarer',
      updated: profile.updated || Date.now(),
      updatedText: profile.updatedText || stamp(),
      state: state ? {
        version: SAVE_SCHEMA_VERSION,
        savedAt: state.savedAt || Date.now(),
        continentId: recoverInstance ? returnState?.continentId || null : state.continentId || null,
        geographyVersion: recoverInstance ? returnState?.geographyVersion || 0 : state.geographyVersion || 0,
        worldRegionId: recoverInstance ? returnState?.regionId || 'hearthmereFrontier' : state.worldRegionId || null,
        worldActId: recoverInstance ? returnState?.actId || null : state.worldActId || null,
        worldRouteId: recoverInstance ? returnState?.routeId || null : state.worldRouteId || null,
        player,
        worldMode: recoveryMode || 'capital',
        worldName: normalizePlayerFacingWorldName(recoverInstance ? player.currentZone : state.worldName || player.currentZone, ACT1_OVERWORLD_DISPLAY_NAME),
        worldTheme: recoverInstance ? returnState?.theme || null : state.worldTheme || null,
        worldDepth: recoverInstance ? null : state.worldDepth || null,
        worldTier: recoverInstance ? null : state.worldTier || null,
        worldTiles: null,
        worldTerrainFeatures: null,
        worldObjects: null,
        enemies: null,
        worldDrops: [],
        overworldState: !recoverInstance && state.overworldState ? slimOverworldState(state.overworldState) : null,
        logLines: Array.isArray(state.logLines) ? state.logLines.slice(0, 8) : [],
        camera: recoverInstance ? null : state.camera || null
      } : null
    };
  }

  return emergencyProfiles;
}

export function slimOverworldState(overworldState) {
  if (!overworldState || typeof overworldState !== 'object') return null;

  return sanitizeForSave({
    continentId: overworldState.continentId || null,
    geographyVersion: Math.max(0, Number(overworldState.geographyVersion) || 0),
    entranceId: overworldState.entranceId || null,
    gateId: overworldState.gateId || null,
    mode: overworldState.mode || 'overworld',
    name: normalizePlayerFacingWorldName(overworldState.name, ACT1_OVERWORLD_DISPLAY_NAME),
    regionId: overworldState.regionId || null,
    actId: overworldState.actId || null,
    routeId: overworldState.routeId || null,
    theme: overworldState.theme || null,
    safeZone: !!overworldState.safeZone,
    camera: overworldState.camera && Number.isFinite(overworldState.camera.x) && Number.isFinite(overworldState.camera.y)
      ? {
          x: overworldState.camera.x,
          y: overworldState.camera.y
        }
      : null,
    returnPoint: overworldState.returnPoint && Number.isFinite(overworldState.returnPoint.x) && Number.isFinite(overworldState.returnPoint.y)
      ? {
          x: overworldState.returnPoint.x,
          y: overworldState.returnPoint.y
        }
      : null
  });
}

function clearLegacyProfileStorage() {
  for (const key of OLD_PROFILE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      // Ignore cleanup failures; the active save attempt will report real errors.
    }
  }
}

function clearLegacyCouchCoopProfileStorage() {
  for (const key of OLD_COUCH_COOP_PROFILE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      // Ignore cleanup failures; legacy co-op saves are best-effort migration data.
    }
  }
}

function migrateLegacyCouchCoopProfilesInto(profiles) {
  const result = {
    found: false,
    changed: false,
    migrated: 0,
    skipped: 0
  };

  for (const key of OLD_COUCH_COOP_PROFILE_KEYS) {
    let legacyProfiles = [];

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      legacyProfiles = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      result.found = true;
    } catch (err) {
      result.found = true;
      continue;
    }

    for (const legacyProfile of legacyProfiles) {
      if (!isMeaningfulLegacyCouchProfile(legacyProfile)) {
        result.skipped++;
        continue;
      }

      const profileId = legacyProfile.profileId || `profile-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      if (profiles[profileId]) {
        result.skipped++;
        continue;
      }

      const player = normalizeProfileSave({
        ...legacyProfile,
        profileId,
        profileSlot: legacyProfile.profileSlot || 'player1',
        playerNumber: 1,
        slot: 1,
        active: false,
        coop: null,
        summons: [],
        combatEffects: [],
        floatingTexts: []
      }, {
        slot: 1,
        playerNumber: 1,
        profileId,
        profileSlot: 'player1',
        name: legacyProfile.name || legacyProfile.profileName || 'Wayfarer'
      });

      delete player.questOwner;
      delete player.controllerSlotIndex;
      delete player.sessionSlot;
      delete player.active;
      delete player.coop;

      const state = slimSaveState(normalizeGameState({
        version: SAVE_SCHEMA_VERSION,
        savedAt: legacyProfile.savedAt || Date.now(),
        player,
        worldMode: 'capital',
        worldName: 'Orrakai',
        worldRegionId: 'hearthmereFrontier',
        worldActId: 'act1',
        worldTiles: null,
        worldObjects: null,
        enemies: null,
        worldDrops: []
      }));

      profiles[profileId] = {
        id: profileId,
        name: player.profileName || player.name || legacyProfile.name || 'Wayfarer',
        updated: legacyProfile.savedAt || Date.now(),
        updatedText: legacyProfile.savedAt
          ? new Date(legacyProfile.savedAt).toLocaleString()
          : stamp(),
        state
      };
      result.changed = true;
      result.migrated++;
    }
  }

  return result;
}

function isMeaningfulLegacyCouchProfile(profile) {
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
  return Object.entries(equipment).some(([slot, itemId]) => {
    return slot !== 'weapon' ? !!itemId : itemId && itemId !== 'oldKnife';
  });
}

export function sanitizeForSave(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => {
    if (key === 'floatingTexts') return [];
    if (['eliteFrost','eliteFrozenUntil','eliteFrostRecoveryUntil','eliteGuardActive','eliteGuardX','eliteGuardY','eliteHealing','eliteAttackPauseTimer','eliteTelegraph'].includes(key)) return undefined;
    if (key === 'combatEffects') return [];
    if (key === 'effects') return [];
    if (key === 'summons' && Array.isArray(val)) return val.filter(summon=>!summon?.techniqueTemporary);
    if (key === 'supportOwner' || key === 'subclassControlOwner' || key.startsWith('subclass') && key.endsWith('Until')) return undefined;
    if (key === 'downedState' || key === 'reviveAction') return undefined;
    if (key === 'lifeState' && ['downed', 'beingRevived', 'dead', 'respawning'].includes(String(val))) return 'alive';
    if (['activeChannel','dawncarverChannel','combatContributors','techniqueMarks','verdantWound','masteryMilestoneEvent','abilityProjectiles','abilityCharge'].includes(key)) return undefined;
    if (key === 'visualAction' || key === 'visualHitUntil') return undefined;
    if (['telegraph','bossTell','pendingSpecial','visualReaction','visualDeath'].includes(key)) return undefined;
    if (key === 'combatState' || key === 'actionState') return undefined;

    if (typeof val === 'function') return undefined;
    if (typeof val === 'number' && !Number.isFinite(val)) return 0;

    return val;
  }));
}

// -----------------------------------------------------------------------------
// SAVE MIGRATION
// -----------------------------------------------------------------------------

export function migrateSaveState(saveState, fallbackWorld = null, fallbackPlayer = null) {
  const normalizedState = normalizeGameState(saveState || {
    player: fallbackPlayer || createDefaultProfile()
  });

  const player = migratePlayer(
    normalizeProfileSave(normalizedState?.player, { slot: 1, playerNumber: 1 }) ||
    fallbackPlayer ||
    createPlayer('Wayfarer')
  );

  const savedWorldMode = normalizedState?.worldMode || 'overworld';
  const savedWorldName = normalizePlayerFacingWorldName(normalizedState?.worldName, getDefaultWorldName(savedWorldMode));
  const loadAsCapitalHub = isOrrakaiHubSave(savedWorldMode, savedWorldName, player);
  let worldMode = loadAsCapitalHub ? 'capital' : savedWorldMode;
  const worldName = loadAsCapitalHub ? 'Orrakai' : worldMode==='maraHouse' ? 'The Root & Retort — Upstairs' : savedWorldName;
  const worldTheme = normalizedState?.worldTheme || null;
  const worldDepth = normalizedState?.worldDepth || null;
  const worldTier = normalizedState?.worldTier || null;
  const worldRegionId = normalizedState?.worldRegionId || player.regions?.currentRegionId || 'hearthmereFrontier';
  const worldActId = normalizedState?.worldActId || null;
  const worldRouteId = normalizedState?.worldRouteId || null;
  const worldSideZoneType = normalizedState?.worldSideZoneType || null;
  const worldSeed = normalizedState?.worldSeed || null;
  const worldFloor = normalizedState?.worldFloor || null;
  const worldInfiniteDungeonRegionId = normalizedState?.worldInfiniteDungeonRegionId || null;
  const worldDungeonState = normalizedState?.worldDungeonState || null;
  const continentalSurface = ['overworld', 'travelRoute'].includes(worldMode);
  const legacyGeography = Number(normalizedState?.geographyVersion || 0) < CONTINENT_VERSION;
  if (legacyGeography) {
    if (continentalSurface) {
      Object.assign(player, migrateContinentalPosition(worldRegionId, player.x, player.y));
      player.currentPosition = {x: player.x, y: player.y};
    }
    const safe = player.lastSafeLocation;
    if (safe && ['overworld', 'travelRoute'].includes(safe.worldMode)) Object.assign(safe, migrateContinentalPosition(safe.regionId, safe.x, safe.y));
    for (const stone of Object.values(player.worldMemory?.stones || {})) {
      const regionId = stone.sourceRegionId || String(stone.world || '').split(':')[1] || stone.regionId;
      if (Number.isFinite(stone.x) && Number.isFinite(stone.y)) Object.assign(stone, migrateContinentalPosition(regionId, stone.x, stone.y));
    }
    for (const [key,location] of Object.entries(player.worldMemory?.locations || {})) {
      const regionId=location.sourceRegionId || key.split(':')[1];
      if (Number.isFinite(location.x) && Number.isFinite(location.y)) Object.assign(location,migrateContinentalPosition(regionId,location.x,location.y));
    }
  }
  player.geographyVersion = CONTINENT_VERSION;
  const hasSavedInstance = ['dungeon', 'tower', 'sideZone'].includes(worldMode) &&
    Array.isArray(normalizedState?.worldTiles) &&
    normalizedState.worldTiles.length > 0;
  const freshWorld = worldMode === 'capital'
    ? createCapitalHubWorld()
    : worldMode === 'act1Opening'
    ? createCaravanOpeningWorld()
    : worldMode === 'maraHouse'
    ? createMaraHouseWorld()
    : continentalSurface
    ? createWorld({spawnRegionId: worldRegionId})
    : worldMode === 'sideZone' && worldSideZoneType
      ? createProceduralSideZoneWorld({
          type: worldSideZoneType,
          regionId: worldRegionId,
          seed: worldSeed,
          name: worldName,
          theme: worldTheme,
          tier: worldTier
        })
    : worldMode === 'overworld' && worldRegionId !== 'hearthmereFrontier'
      ? createRegionWorld(worldRegionId)
      : hasSavedInstance
        ? { tiles: [], objects: [], enemies: [], drops: [], terrainFeatures: null }
      : worldRegionId !== 'hearthmereFrontier' && !['dungeon', 'tower', 'sideZone'].includes(worldMode)
        ? createRegionWorld(worldRegionId)
        : createWorld();

  const isInstancedWorld = ['dungeon', 'tower', 'sideZone'].includes(worldMode);
  if (continentalSurface && freshWorld.continentId === 'runalis') worldMode='overworld';
  const isCapitalWorld = worldMode === 'capital';
  if (isCapitalWorld) migrateOrrakaiPosition(freshWorld, player);
  if(worldMode==='maraHouse')for(const actor of [player,...(player.coop?.players||[])]){
    if(!isActorPositionPassable(freshWorld,actor.x,actor.y,actor.radius||actor.r||12))Object.assign(actor,freshWorld.spawn);
    actor.currentZone=freshWorld.name;
  }
  if (worldMode === 'overworld' && worldRegionId === 'hearthmereFrontier') migrateEchorynPosition(freshWorld, player);

  const worldTiles = isCapitalWorld
    ? freshWorld.tiles || []
    : isInstancedWorld && Array.isArray(normalizedState?.worldTiles) && normalizedState.worldTiles.length
    ? normalizedState.worldTiles
    : freshWorld.tiles || fallbackWorld?.tiles || [];

  const worldTerrainFeatures = isInstancedWorld
    ? null
    : freshWorld.terrainFeatures || null;

  const worldObjects = isCapitalWorld
    ? freshWorld.objects || []
    : isInstancedWorld && Array.isArray(normalizedState?.worldObjects)
    ? normalizedState.worldObjects
    : freshWorld.objects || fallbackWorld?.objects || [];

  const enemies = isCapitalWorld
    ? freshWorld.enemies || []
    : isInstancedWorld && Array.isArray(normalizedState?.enemies)
    ? normalizedState.enemies
    : freshWorld.enemies || fallbackWorld?.enemies || [];

  const worldDrops = isCapitalWorld
    ? freshWorld.drops || []
    : isInstancedWorld && Array.isArray(normalizedState?.worldDrops)
    ? normalizedState.worldDrops
    : [];
  migrateLastDawnDisplayText(worldObjects);
  migrateLastDawnDisplayText(enemies);
  migrateLastDawnDisplayText(worldDrops);
  for (const enemy of enemies) ensureHumanoidEnemyEquipment(enemy);

  const overworldState = normalizedState?.overworldState ? {...normalizedState.overworldState} : null;
  if (overworldState && ['overworld', 'travelRoute'].includes(overworldState.mode || 'overworld')) {
    if (Number(overworldState.geographyVersion || 0) < CONTINENT_VERSION) {
      if (overworldState.returnPoint) overworldState.returnPoint = migrateContinentalPosition(overworldState.regionId, overworldState.returnPoint.x, overworldState.returnPoint.y);
      if (overworldState.camera) overworldState.camera = migrateContinentalPosition(overworldState.regionId, overworldState.camera.x, overworldState.camera.y);
    }
    overworldState.continentId = 'runalis';
    overworldState.geographyVersion = CONTINENT_VERSION;
  }

  const logLines = Array.isArray(normalizedState?.logLines)
    ? normalizedState.logLines.slice(0, 40)
    : ['Profile loaded.'];

  const camera = normalizedState?.camera &&
    Number.isFinite(normalizedState.camera.x) &&
    Number.isFinite(normalizedState.camera.y)
    ? {
        x: normalizedState.camera.x,
        y: normalizedState.camera.y
      }
    : {
        x: player.x - 480,
        y: player.y - 270
      };
  if (legacyGeography && continentalSurface) Object.assign(camera, migrateContinentalPosition(worldRegionId, camera.x, camera.y));

  player.cooldowns = cleanCooldownMap(player.cooldowns);
  player.abilityUseCharges = {};
  player.summonCooldowns = cleanCooldownMap(player.summonCooldowns);

  player.summons = Array.isArray(player.summons)
    ? player.summons.filter(summon => summon && summon.alive !== false && summon.hp > 0)
    : [];

  player.floatingTexts = [];
  player.combatEffects = [];

  ensurePlayerDialogueAndQuestState(player);

  return {
    player,
    worldRuntime: freshWorld,
    worldMode: continentalSurface ? 'overworld' : worldMode,
    worldName,
    worldTheme,
    worldDepth,
    worldTier,
    worldRegionId,
    worldActId,
    worldRouteId,
    worldSideZoneType,
    worldSeed,
    worldFloor,
    worldCleared: !!normalizedState?.worldCleared,
    worldInfiniteDungeonRegionId,
    worldDungeonState,
    worldEncounterLayout:normalizedState?.worldEncounterLayout||null,
    worldTiles,
    worldTerrainFeatures,
    worldObjects,
    enemies,
    worldDrops,
    overworldState,
    logLines,
    camera
  };
}

export function cleanCooldownMap(map) {
  const clean = {};

  if (!map || typeof map !== 'object') return clean;

  for (const [key, value] of Object.entries(map)) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      clean[key] = n;
    }
  }

  return clean;
}

function isOrrakaiHubSave(worldMode, worldName, player) {
  if (worldMode === 'pvpArena') return true;
  if (worldMode === 'capital' || worldMode === 'hub' || worldMode === 'town') return true;
  if (['overworld','travelRoute','dungeon','tower','sideZone','act1Opening','maraHouse'].includes(worldMode)) {
    // A previous safe haven is not the player's current saved world. Only the
    // old surface save explicitly named Orrakai represents a legacy town save.
    return worldMode==='overworld' && ['orrakai','capital gate district'].includes(String(worldName||'').trim().toLowerCase());
  }

  const names = [
    worldName,
    player?.currentZone,
    player?.lastSafeLocation?.worldName
  ].map(value => String(value || '').trim().toLowerCase());

  return names.some(name => name === 'orrakai' || name === 'capital gate district');
}

// -----------------------------------------------------------------------------
// MENU / PROFILE UI
// -----------------------------------------------------------------------------

export function showMenu(startProfileCallback = null) {
  const app = document.getElementById('app');
  const mainMenu = document.getElementById('mainMenu');

  if (app) app.classList.remove('active');
  if (mainMenu) mainMenu.classList.add('active');

  // Profile loading may scroll a short title card far down the list. Return
  // to its heading and first action instead of keeping that hidden offset.
  profileMenuFocusIndex=0;
  if(mainMenu){mainMenu.scrollTop=0;const card=mainMenu.querySelector('.menu-card');if(card)card.scrollTop=0;}

  // Important:
  // The profile list must keep the load callback.
  // Otherwise the Load buttons render visually, but clicking them does nothing.
  renderProfileList(startProfileCallback);
  startProfileMenuControllerLoop(startProfileCallback);
}

export function showGame() {
  const mainMenu = document.getElementById('mainMenu');
  const app = document.getElementById('app');

  if (mainMenu) mainMenu.classList.remove('active');
  if (app) app.classList.add('active');

  stopProfileMenuControllerLoop();
}

export function showLoadingScreen(message = `Entering ${ACT1_OVERWORLD_DISPLAY_NAME}...`) {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingMessage = document.getElementById('loadingMessage');

  if (loadingMessage) loadingMessage.textContent = message;
  if (!loadingScreen) return;

  loadingScreen.classList.add('active');
  loadingScreen.setAttribute('aria-hidden', 'false');
}

export function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (!loadingScreen) return;

  loadingScreen.classList.remove('active');
  loadingScreen.setAttribute('aria-hidden', 'true');
}

export function createProfileFromInput(startProfileCallback) {
  const mainMenu = document.getElementById('mainMenu');
  const loadingScreen = document.getElementById('loadingScreen');

  if (!mainMenu?.classList.contains('active') || loadingScreen?.classList.contains('active')) {
    return null;
  }

  const input = document.getElementById('profileName');

  const name = (input?.value || 'Wayfarer').trim().slice(0, 22) || 'Wayfarer';
  const id = `profile-${Date.now()}`;

  const profiles = readProfiles();

  profiles[id] = {
    id,
    name,
    updated: Date.now(),
    updatedText: stamp(),
    state: null
  };

  writeProfiles(profiles);

  if (input) input.value = '';

  if (typeof startProfileCallback === 'function') {
    startProfileCallback(profiles[id]);
  }

  return profiles[id];
}

export function renderProfileList(startProfileCallback = null) {
  const list = document.getElementById('profileList');

  if (!list) return;

  const profiles = Object.values(readProfiles()).sort((a, b) => {
    return (b.updated || 0) - (a.updated || 0);
  });

  if (!profiles.length) {
    list.innerHTML = '<p class="tag">No profiles yet. Create one above.</p>';
    refreshProfileMenuFocusableState();
    return;
  }

  list.innerHTML = profiles.map(profile => `
    <div class="profile-row">
      <button class="profile-load-choice" data-load="${escapeHtml(profile.id)}">
        <b>${escapeHtml(profile.name)}</b>
        <span>Continue journey</span>
      </button>
      <span class="profile-saved-time">Last saved: ${escapeHtml(profile.updatedText || 'Never')}</span>
      <button class="danger profile-delete-choice" data-delete="${escapeHtml(profile.id)}">Delete profile</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-load]').forEach(button => {
    button.onclick = () => {
      const profileId = button.dataset.load;
      const profile = readProfiles()[profileId];

      if (!profile) {
        console.warn(`Profile not found: ${profileId}`);
        renderProfileList(startProfileCallback);
        return;
      }

      if (typeof startProfileCallback !== 'function') {
        console.warn('Load button clicked, but no startProfile callback was provided.');
        return;
      }

      startProfileCallback(profile);
    };
  });

  list.querySelectorAll('[data-delete]').forEach(button => {
    button.onclick = () => {
      openProfileDeleteConfirmation(button.dataset.delete);
    };
  });

  refreshProfileMenuFocusableState();
}

export function bindProfileMenu(startProfileCallback) {
  profileMenuStartCallback = startProfileCallback;

  injectProfileMenuControllerStyles();
  bindProfileDeleteConfirmation();

  const createProfileBtn = document.getElementById('createProfileBtn');

  if (createProfileBtn) {
    createProfileBtn.onclick = () => createProfileFromInput(startProfileCallback);
  }

  const profileName = document.getElementById('profileName');

  if (profileName) {
    profileName.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        createProfileFromInput(startProfileCallback);
      }
    });

    profileName.addEventListener('focus', () => {
      const items = getProfileMenuFocusableElements();
      const index = items.indexOf(profileName);

      if (index >= 0) {
        profileMenuFocusIndex = index;
        applyProfileMenuFocus();
      }
    });
  }

  renderProfileList(startProfileCallback);
  startProfileMenuControllerLoop(startProfileCallback);
}

// -----------------------------------------------------------------------------
// MAIN PROFILE MENU CONTROLLER SUPPORT
// -----------------------------------------------------------------------------

function startProfileMenuControllerLoop(startProfileCallback = null) {
  profileMenuStartCallback = startProfileCallback || profileMenuStartCallback;

  if (!profileMenuController) {
    profileMenuController = createControllerManager();
  }

  if (profileMenuAnimationFrame !== null) return;

  const loop = () => {
    profileMenuAnimationFrame = requestAnimationFrame(loop);
    updateProfileMenuControllerInput();
  };

  profileMenuAnimationFrame = requestAnimationFrame(loop);
}

function stopProfileMenuControllerLoop() {
  if (profileMenuAnimationFrame !== null) {
    cancelAnimationFrame(profileMenuAnimationFrame);
  }

  profileMenuAnimationFrame = null;
}

function updateProfileMenuControllerInput() {
  const mainMenu = document.getElementById('mainMenu');

  if (!mainMenu?.classList.contains('active')) return;
  if (!profileMenuController) return;

  updateControllerManager(profileMenuController);
  if (mainMenu.inert) return;

  const inputs = getAllControllerInputs(profileMenuController).filter(input => input?.connected);
  if (!inputs.length) return;

  for (const input of inputs) {
    if (handleProfileMenuControllerInput(input)) {
      break;
    }
  }
}

function handleProfileMenuControllerInput(input) {
  if (handleMenuSheetInput(input, document.getElementById('mainMenu') || document)) return true;
  const message = document.getElementById('lexiconMessage');
  if (message?.open) {
    if (input.confirmPressed || input.cancelPressed || input.backPressed) message.close();
    return true;
  }
  const items = getProfileMenuFocusableElements();

  if (!items.length) return false;

  clampProfileMenuFocus();

  const direction=menuDirection(input);
  if(direction){moveProfileMenuFocus(direction);return true;}

  if (input.cancelPressed || input.backPressed) {
    if (isProfileDeleteConfirmationActive()) {
      closeProfileDeleteConfirmation();
      return true;
    }

    const profileName = document.getElementById('profileName');

    if (document.activeElement === profileName) {
      profileName.blur();
      applyProfileMenuFocus();
      return true;
    }

    profileMenuFocusIndex = 0;
    applyProfileMenuFocus();
    return true;
  }

  if (input.confirmPressed) {
    activateProfileMenuFocusedElement();
    return true;
  }

  return false;
}

function getProfileMenuFocusableElements() {
  const mainMenu = document.getElementById('mainMenu');

  if (!mainMenu?.classList.contains('active')) return [];

  const developerSetup = document.getElementById('developerModeSetup');
  if (developerSetup?.classList.contains('active')) {
    return Array.from(developerSetup.querySelectorAll('select, input, textarea, button'))
      .filter(element => !element.disabled && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
  }

  const selectors = isProfileDeleteConfirmationActive()
    ? [
        '#profileDeleteConfirmation [data-confirm-profile-delete]',
        '#profileDeleteConfirmation [data-cancel-profile-delete]'
      ]
    : [
        '#continueGameBtn',
        '#newGameBtn',
        '#settingsBtn',
        '#mainFullscreenBtn',
        '#creditsBtn',
        '#quitGameBtn',
        '#profileName',
        '#createProfileBtn',
        '#profileList [data-load]',
        '#profileList [data-delete]',
        '#mainMenu .menu-sheet-controls button'
      ];

  return selectors
    .flatMap(selector => Array.from(document.querySelectorAll(selector)))
    .filter(element => {
      if (!element || !menuSheetItemVisible(element)) return false;
      if (element.disabled) return false;

      const rect = element.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;

      return visible;
    });
}

function bindProfileDeleteConfirmation() {
  const confirmation = document.getElementById('profileDeleteConfirmation');
  if (!confirmation || confirmation.dataset.bound === 'true') return;

  confirmation.dataset.bound = 'true';

  confirmation.querySelector('[data-confirm-profile-delete]')?.addEventListener('click', confirmProfileDeletion);
  confirmation.querySelector('[data-cancel-profile-delete]')?.addEventListener('click', closeProfileDeleteConfirmation);

  confirmation.addEventListener('keydown', event => {
    if (!isProfileDeleteConfirmationActive()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeProfileDeleteConfirmation();
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      moveProfileMenuFocus(event.key.slice(5).toLowerCase());
    }
  });
}

function openProfileDeleteConfirmation(profileId) {
  const profile = readProfiles()[profileId];
  const confirmation = document.getElementById('profileDeleteConfirmation');
  if (!profile || !confirmation) return false;

  pendingDeleteProfileId = profileId;

  const name = document.getElementById('profileDeleteName');
  if (name) name.textContent = profile.name || 'Unnamed profile';

  confirmation.classList.add('active');
  confirmation.setAttribute('aria-hidden', 'false');

  // The safe option is selected first so an accidental second confirm cannot delete.
  profileMenuFocusIndex = 1;
  applyProfileMenuFocus();
  return true;
}

function closeProfileDeleteConfirmation() {
  const confirmation = document.getElementById('profileDeleteConfirmation');
  pendingDeleteProfileId = null;

  if (confirmation) {
    confirmation.classList.remove('active');
    confirmation.setAttribute('aria-hidden', 'true');
  }

  profileMenuFocusIndex = 0;
  applyProfileMenuFocus();
}

function confirmProfileDeletion() {
  const profileId = pendingDeleteProfileId;
  if (!profileId) return false;

  deleteProfile(profileId);
  closeProfileDeleteConfirmation();
  renderProfileList(profileMenuStartCallback);
  clampProfileMenuFocus();
  applyProfileMenuFocus();
  return true;
}

function isProfileDeleteConfirmationActive() {
  return !!document.getElementById('profileDeleteConfirmation')?.classList.contains('active');
}

function refreshProfileMenuFocusableState() {
  clampProfileMenuFocus();
  applyProfileMenuFocus();
}

function clampProfileMenuFocus() {
  const items = getProfileMenuFocusableElements();

  if (!items.length) {
    profileMenuFocusIndex = 0;
    return;
  }

  profileMenuFocusIndex = Math.max(0, Math.min(items.length - 1, profileMenuFocusIndex));
}

function moveProfileMenuFocus(direction) {
  const items = getProfileMenuFocusableElements();

  if (!items.length) return;

  const current=items.includes(document.activeElement)?document.activeElement:items[profileMenuFocusIndex];
  profileMenuFocusIndex=items.indexOf(directionalMenuItem(items,current,direction));

  applyProfileMenuFocus();
}

function applyProfileMenuFocus() {
  const items = getProfileMenuFocusableElements();

  document.querySelectorAll('.controller-focus').forEach(element => {
    element.classList.remove('controller-focus');
  });

  if (!items.length) return;

  clampProfileMenuFocus();

  const selected = items[profileMenuFocusIndex];

  if (!selected) return;

  selected.classList.add('controller-focus');

  if (typeof selected.focus === 'function') {
    selected.focus({
      preventScroll: true
    });
  }

  // Reveal only overflowing menu panes. Native focus scrolling can shift the
  // title above its frame on short screens even when the choice is visible.
  if (!selected.closest('.menu-sheet-view')) revealMenuFocus(selected);
}

function activateProfileMenuFocusedElement() {
  const items = getProfileMenuFocusableElements();

  if (!items.length) return;

  clampProfileMenuFocus();

  const selected = items[profileMenuFocusIndex];

  if (!selected) return;

  if (selected.id === 'profileName') {
    selected.focus();
    return;
  }

  if (typeof selected.click === 'function') {
    selected.click();
  }
}

function injectProfileMenuControllerStyles() {
  if (document.getElementById('runalisProfileMenuControllerStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisProfileMenuControllerStyles';

  style.textContent = `
    #mainMenu .controller-focus {
      outline: none !important;
      color: #ffd76f !important;
      transform: scale(1.12) !important;
      transform-origin: left center !important;
      text-shadow:
        -2px -2px 0 #000,
        2px -2px 0 #000,
        -2px 2px 0 #000,
        2px 2px 0 #000,
        0 3px 10px rgba(0,0,0,0.95),
        0 0 18px rgba(255,199,75,0.34) !important;
    }

    #mainMenu input.controller-focus {
      background: transparent !important;
    }

    #mainMenu button.controller-focus {
      transform: scale(1.12) !important;
    }
  `;

  document.head.appendChild(style);
}

// -----------------------------------------------------------------------------
// GAME SAVE ACTIONS
// -----------------------------------------------------------------------------

export function saveGameProfile(game, showLog = true) {
  if (!game) {
    return {
      saved: false,
      reason: 'No game instance.'
    };
  }

  // createSaveState normalizes a snapshot. Saving must not reconstruct or
  // migrate the live world: discovery saves happen inside the simulation tick.

  const coopProfilesSaved = saveAllCouchCoopProfiles(game);

  if (!coopProfilesSaved) {
    if (showLog && typeof game.log === 'function') {
      game.log('Save failed: one or more co-op profiles could not be saved.');
    }

    return {
      saved: false,
      reason: 'One or more co-op profiles could not be saved.'
    };
  }

  const state = createSaveState(game);

  const result = upsertProfile(game.profileId, game.profileName, state);

  if (!result.saved) {
    if (showLog && typeof game.log === 'function') {
      game.log('Save failed: browser storage is full.');
    }

    return {
      saved: false,
      reason: 'Browser storage is full.'
    };
  }

  if (showLog && typeof game.log === 'function') {
    game.log('Profile saved.');
  }

  return {
    saved: true,
    profile: result.profile
  };
}

export function applySaveToGame(game, saveState) {
  if (!game || !saveState) return false;
  cancelPartyEntry(game,'',false);

  endWorkshopSession((game.hostGame||game).workshopService?.actor);
  if(typeof document!=='undefined')document.getElementById('workshopServiceOverlay')?.remove();

  const migrated = migrateSaveState(saveState, game.world, game.player);

  game.player = migrated.player;
  clearCouchCoopRuntimeState(game.player);

  // Continental runtime methods close over their factory world. Keep that identity.
  game.world = Object.assign(migrated.worldRuntime || {}, {
    mode: migrated.worldMode,
    name: migrated.worldName,
    theme: migrated.worldTheme,
    depth: migrated.worldDepth,
    tier: migrated.worldTier,
    regionId: migrated.worldRegionId,
    actId: migrated.worldActId,
    routeId: migrated.worldRouteId,
    sideZoneType: migrated.worldSideZoneType,
    sideZoneSeed: migrated.worldSeed,
    seed: migrated.worldSeed,
    floor: migrated.worldFloor,
    cleared: migrated.worldCleared,
    infiniteDungeonRegionId: migrated.worldInfiniteDungeonRegionId,
    width: migrated.worldRuntime?.width || migrated.worldTiles?.[0]?.length || 0,
    height: migrated.worldRuntime?.height || migrated.worldTiles?.length || 0,
    dungeonState: migrated.worldDungeonState || null,
    totalFloors: migrated.worldDungeonState?.totalFloors || null,
    dungeonClassification: migrated.worldDungeonState?.classification || null,
    tiles: migrated.worldTiles,
    terrainFeatures: migrated.worldTerrainFeatures,
    objects: migrated.worldObjects,
    enemies: migrated.enemies,
    drops: migrated.worldDrops,
    effects: [],
    combatEffects: []
  });

  Object.assign(game.world,migrated.worldEncounterLayout||{});
  if(game.world.mode==='dungeon'&&game.world.dungeonId==='ashenOrchard'&&!game.world.dungeonState?.orchard&&!game.world.dungeonState?.cleared){installOrchardDungeon(game.world);Object.assign(game.player,game.world.spawn);}
  if(game.world.mode==='sideZone'&&game.world.sideZoneType==='hollowGrove'&&game.world.regionId==='hearthmereFrontier'&&!game.world.dungeonState?.grove){
    game.world=createProceduralSideZoneWorld({type:'hollowGrove',regionId:'hearthmereFrontier',seed:game.world.seed});Object.assign(game.player,game.world.spawn);
  }
  if(['dungeon','tower','sideZone'].includes(game.world.mode)){
    const w=game.world;
    if(!w.rooms?.length&&w.dungeonState?.arenas){const a=w.dungeonState.arenas[w.floor||1];if(a)w.rooms=[{role:'boss',x:a.x/32,y:a.y/32,w:a.w/32,h:a.h/32}];}
    if(w.mode==='tower'&&!w.rooms?.length){w.floorType=w.floor%10===0?'boss':'combat';w.rooms=[w.floorType==='boss'?{role:'boss',x:17,y:10,w:46,h:27,cx:40,cy:23}:{x:7,y:8,w:59,h:31}];}
    w.dungeonId ||= w.dungeonState?.dungeonId||w.dungeonState?.poiId||w.dungeonState?.entranceId;
    const base=CONTINENT_REGIONS.find(r=>r.id===w.regionId)?.levels[0]||1,level=base+Math.max(0,(w.floor||1)-1);
    const profile=w.mode==='tower'?{id:`${w.regionId}:tower:${w.floor}`,levels:[level,level+2],eliteChance:.12,rareChance:.03,championChance:.006}:dungeonEncounterProfile(w);
    for(const e of w.enemies){configureEncounterEnemy(e,profile,`${w.floorSeed||w.seed}:${e.id}`,{dungeon:true});e.eliteHealing=e.eliteGuardActive=false;e.eliteAttackPauseTimer=0;e.bossTell=e.telegraph=null;if(e.boss){e.boss.pendingSpecial=null;e.boss.recoveryUntil=0;e.boss.specialTimer=Math.max(2,e.boss.specialTimer||0);}}
    for(const o of w.objects||[])if(o.pendingSpawnDelay!=null){o.pendingSpawnDelay=1.5;w.effects.push({kind:'bossTelegraph',x:o.x,y:o.y,radius:80,ttl:1.5,color:'#bd91d4'});}
    initializeDungeonArena(w);
    for(const e of w.enemies)if(e.groveMother){e.groveAttack=null;e.groveRecovery=2;}
    for(const e of w.enemies)if(e.orchardCustodian){e.orchardAttack=null;e.orchardRecovery=2;}
  }
  game.overworldState = migrated.overworldState;
  game.capitalReturnWorld = null;
  game.world.continentRuntime?.activate?.([game.player],game.player);
  restoreContinentalState(game);
  installMalakarSanctum(game.world);
  installVeyreign(game.world);
  if(game.world.dungeonState?.veyreign)initializeDungeonArena(game.world);
  syncDungeonCompletion(game.world);
  syncBossReturnPortals(game.world);
  game.logLines = migrated.logLines;
  game.camera = migrated.camera;

  if (typeof game.finalizeLoadedState === 'function') {
    game.finalizeLoadedState('load');
  }

  const savedDialogue = migrated.dialogueState || null;
  if (savedDialogue?.active && Number(savedDialogue.ownerSlot || 1) === 1) {
    restoreDialogueState(game.dialogue, savedDialogue, game.player, game.world);
  } else if (savedDialogue?.active) {
    console.info('Dialogue restore skipped because its co-op owner is not active in the restored host session.');
  }

  return true;
}

// -----------------------------------------------------------------------------
// LOW-LEVEL HELPERS
// -----------------------------------------------------------------------------

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[character]));
}

function createHostPlayerSaveSnapshot(player) {
  if (!player || typeof player !== 'object') return player;

  const {
    coop,
    questOwner,
    interactLock,
    coopAutosaveTimer,
    controllerSlotIndex,
    ...hostPlayer
  } = player;

  sanitizeActorReviveStateForSave(hostPlayer);
  delete hostPlayer.downedState;
  delete hostPlayer.reviveAction;
  delete hostPlayer.invulnerableUntil;
  hostPlayer.lifeState = 'alive';
  hostPlayer.cooldownClockSeconds=performance.now()/1000;

  return hostPlayer;
}
