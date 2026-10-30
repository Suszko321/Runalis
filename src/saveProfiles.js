// saveProfiles.js
// Versioned profile/game-state normalization helpers for Runalis.
//
// This module is intentionally small and defensive. Existing save files may be
// incomplete, stale, or missing future fields; loading them should repair shape
// without throwing or destroying usable data.

import { createPlayer, migratePlayer } from './player.js';
import { rebaseCooldownMap } from './cooldownClock.js';
import { migrateLastDawnDisplayText } from './humanoidEnemies.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';

export const SAVE_SCHEMA_VERSION = 18;

export function createDefaultProfile(options = {}) {
  const slot = Math.max(1, Number(options.slot || options.playerNumber || 1));
  const name = String(options.name || (slot === 2 ? 'Player 2' : 'Wayfarer')).slice(0, 32);
  const player = createPlayer(name || 'Wayfarer');

  player.profileId = options.profileId || createProfileId(slot);
  player.profileName = name || 'Wayfarer';
  player.profileSlot = options.profileSlot || (slot === 2 ? 'player2' : 'player1');
  player.playerNumber = slot;
  player.slot = options.slot || slot;

  return normalizeProfileSave(player, options);
}

export function normalizeProfileSave(profile, options = {}) {
  migrateLastDawnDisplayText(profile?.quests);
  migrateLastDawnDisplayText(profile?.questState);
  const slot = Math.max(1, Number(options.slot || profile?.playerNumber || profile?.slot || 1));
  const fallback = createPlayer(options.name || profile?.name || (slot === 2 ? 'Player 2' : 'Wayfarer'));
  const player = {
    ...fallback,
    ...(profile || {})
  };
  // Bubble Ward is a temporary session effect. Its performance-clock expiry
  // has no meaning after logout/reload. Copy nested state before scrubbing so
  // autosaving cannot remove protection from the live character or allies.
  player.buffs = {...player.buffs};
  delete player.buffs.bubbleWard;
  player.visuals = {...player.visuals};
  delete player.visuals.bubbleWardUntil;
  delete player.visuals.bubbleWardFlatAbsorb;
  delete player.visuals.bubbleWardMorph;

  if(profile&&!profile.skillState&&profile.skills)delete player.skillState;
  if(profile&&!profile.abilityLayoutVersion)delete player.abilityLayoutVersion;

  player.name = String(player.name || options.name || fallback.name || 'Wayfarer').slice(0, 32);
  player.profileId = player.profileId || options.profileId || createProfileId(slot);
  player.profileName = player.profileName || player.name;
  player.profileSlot = player.profileSlot || (slot === 2 ? 'player2' : 'player1');
  player.playerNumber = slot;
  player.slot = player.slot || slot;

  player.saveVersion = Number(player.saveVersion || SAVE_SCHEMA_VERSION);
  player.currentZone = normalizePlayerFacingWorldName(player.currentZone || options.currentZone, ACT1_OVERWORLD_DISPLAY_NAME);
  player.currentPosition = normalizePosition(player.currentPosition || {
    x: player.x,
    y: player.y
  });

  player.level = Math.max(1, Number(player.level || player.combatLevel || 1));
  player.xp = Math.max(0, Number(player.xp || player.totalXp || 0));
  player.gold = Math.max(0, Number(player.gold || 0));

  player.stats = normalizeStats(player.stats);
  player.skills = player.skills && typeof player.skills === 'object' ? player.skills : {};

  if(!profile?.equipmentProgressionVersion){delete player.equipmentProgressionVersion;player.equippedGear={};}
  player.inventory = normalizeInventory(player.inventory);
  player.equipment = normalizeEquipment(player.equipment);
  player.gearUpgrades = player.gearUpgrades && typeof player.gearUpgrades === 'object'
    ? player.gearUpgrades
    : {};

  player.quest = player.quest && typeof player.quest === 'object'
    ? player.quest
    : {};

  player.quests = normalizeQuestLog(player.quests);
  player.questState = normalizeQuestState(player.questState);
  player.questProgress = player.questProgress && typeof player.questProgress === 'object'
    ? player.questProgress
    : {};

  player.enteredDungeons = normalizeRecordMap(player.enteredDungeons);
  player.completedDungeons = normalizeRecordMap(player.completedDungeons);
  player.bossKills = normalizeRecordMap(player.bossKills);
  player.discoveredLocations = normalizeRecordMap(player.discoveredLocations || player.discoveredPois);
  player.discoveredPois = normalizeRecordMap(player.discoveredPois || player.discoveredLocations);
  player.poiEncounters = normalizeRecordMap(player.poiEncounters);

  player.tower = normalizeTower(player.tower);
  player.infiniteDungeons = normalizeInfiniteDungeons(player.infiniteDungeons, player.tower);
  player.sideZones = normalizeRecordMap(player.sideZones);
  player.crafting = normalizeCrafting(player.crafting);
  player.flags = player.flags && typeof player.flags === 'object' ? player.flags : {};
  const cooldownClock=performance.now()/1000;
  player.cooldowns = rebaseCooldownMap(player.cooldowns,profile?.cooldownClockSeconds,cooldownClock);
  // Runtime recharge timestamps use the active session clock. Skill-tree
  // charge upgrades persist; spent charges safely refill when a profile loads.
  player.abilityUseCharges = {};
  player.summonCooldowns = rebaseCooldownMap(player.summonCooldowns,profile?.cooldownClockSeconds,cooldownClock);
  player.cooldownClockSeconds=cooldownClock;
  player.completedBossFirstKills = normalizeRecordMap(player.completedBossFirstKills);
  player.knownAbilities = uniqueStrings([
    ...(Array.isArray(player.knownAbilities) ? player.knownAbilities : []),
    ...(Array.isArray(player.unlockedAbilities) ? player.unlockedAbilities : [])
  ]);
  player.unlockedAbilities = [...player.knownAbilities];
  player.unlockedPassives = uniqueStrings(player.unlockedPassives);
  player.skillTreeProgress = normalizeRecordMap(player.skillTreeProgress || player.skillTree?.spent);

  player.summons = Array.isArray(player.summons) ? player.summons : [];
  player.traps = Array.isArray(player.traps) ? player.traps : [];
  player.combatEffects = Array.isArray(player.combatEffects) ? player.combatEffects : [];
  player.floatingTexts = Array.isArray(player.floatingTexts) ? player.floatingTexts : [];

  player.appearance = player.appearance && typeof player.appearance === 'object'
    ? player.appearance
    : {};

  const migrated = migratePlayer(player);

  // Render-only action cues must never survive a save/load boundary.
  delete migrated.visualAction;
  delete migrated.visualHitUntil;
  delete migrated.combatAim;
  delete migrated.activeChannel;
  delete migrated.subclassHasteUntil;
  if(migrated.lightbringer)migrated.lightbringer.dawncarverChannel=null;
  delete migrated.abilityMasteryVersion;
  scrubHeavyAttackRuntimeState(migrated);

  migrated.saveVersion = SAVE_SCHEMA_VERSION;
  migrated.currentPosition = normalizePosition({
    x: migrated.x,
    y: migrated.y
  });

  return migrated;
}

function scrubHeavyAttackRuntimeState(player) {
  player.combatState={};
  player.actionState={};
  delete player.abilityCharge;
  player.abilityProjectiles=[];
}

export function saveProfile(storageKey, profile) {
  if (!canUseLocalStorage() || !storageKey) return false;

  try {
    const normalized = normalizeProfileSave({...profile,cooldownClockSeconds:performance.now()/1000});
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    return true;
  } catch (err) {
    console.warn('Failed to save profile:', err);
    return false;
  }
}

export function loadProfile(storageKey, options = {}) {
  if (!canUseLocalStorage() || !storageKey) {
    return createDefaultProfile(options);
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return createDefaultProfile(options);

    return normalizeProfileSave(JSON.parse(raw), options);
  } catch (err) {
    console.warn('Failed to load profile:', err);
    return createDefaultProfile(options);
  }
}

export function saveGameState(storageKey, state) {
  if (!canUseLocalStorage() || !storageKey) return false;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizeGameState(state)));
    return true;
  } catch (err) {
    console.warn('Failed to save game state:', err);
    return false;
  }
}

export function loadGameState(storageKey, fallback = null) {
  if (!canUseLocalStorage() || !storageKey) {
    return normalizeGameState(fallback);
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return normalizeGameState(fallback);

    return normalizeGameState(JSON.parse(raw));
  } catch (err) {
    console.warn('Failed to load game state:', err);
    return normalizeGameState(fallback);
  }
}

export function normalizeGameState(state) {
  if (!state) {
    return {
      version: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      player: createDefaultProfile()
    };
  }

  return {
    ...state,
    version: Math.max(SAVE_SCHEMA_VERSION, Number(state.version || 0)),
    savedAt: Number(state.savedAt || Date.now()),
    player: normalizeProfileSave(state.player || state.profile || {}),
    worldMode: state.worldMode || 'overworld',
    worldName: normalizePlayerFacingWorldName(state.worldName, ACT1_OVERWORLD_DISPLAY_NAME),
    worldTheme: state.worldTheme || null,
    worldDepth: state.worldDepth || null,
    worldTier: state.worldTier || null,
    worldRegionId: state.worldRegionId || state.player?.regions?.currentRegionId || 'hearthmereFrontier',
    continentId: state.continentId || null,
    geographyVersion: Math.max(0, Number(state.geographyVersion) || 0),
    worldActId: state.worldActId || null,
    worldRouteId: state.worldRouteId || null,
    worldSideZoneType: state.worldSideZoneType || null,
    worldSeed: state.worldSeed || null,
    worldFloor: state.worldFloor || null,
    worldCleared: !!state.worldCleared,
    worldInfiniteDungeonRegionId: state.worldInfiniteDungeonRegionId || null,
    worldEncounterLayout: state.worldEncounterLayout&&typeof state.worldEncounterLayout==='object'?state.worldEncounterLayout:null,
    worldDungeonState: state.worldDungeonState && typeof state.worldDungeonState === 'object'
      ? state.worldDungeonState
      : null,
    worldTiles: Array.isArray(state.worldTiles) ? state.worldTiles : null,
    worldObjects: Array.isArray(state.worldObjects) ? state.worldObjects : null,
    enemies: Array.isArray(state.enemies) ? state.enemies : null,
    worldDrops: Array.isArray(state.worldDrops) ? state.worldDrops : [],
    overworldState: normalizeOverworldState(state.overworldState),
    logLines: Array.isArray(state.logLines) ? state.logLines.slice(0, 40) : [],
    camera: normalizePosition(state.camera)
  };
}

function normalizeOverworldState(overworldState) {
  if (!overworldState || typeof overworldState !== 'object') return null;

  return {
    ...overworldState,
    name: normalizePlayerFacingWorldName(overworldState.name, ACT1_OVERWORLD_DISPLAY_NAME)
  };
}

function normalizeInventory(inventory) {
  if (!Array.isArray(inventory)) return [];

  return inventory
    .filter(Boolean)
    .map(entry => {
      const id = entry.id || entry.itemId;
      const qty = Math.max(1, Math.floor(Number(entry.qty ?? entry.quantity ?? 1)));

      return {
        ...entry,
        id,
        itemId: id,
        qty,
        quantity: qty
      };
    })
    .filter(entry => !!entry.id);
}

function normalizeEquipment(equipment) {
  const source = equipment && typeof equipment === 'object' ? equipment : {};

  return {
    weapon: source.weapon ?? null,
    helm: source.helm ?? null,
    chest: source.chest ?? null,
    legs: source.legs ?? null,
    ring: source.ring ?? null,
    amulet: source.amulet ?? null,
    trinket: source.trinket ?? source.jewelry ?? null
  };
}

function normalizeStats(stats) {
  const source = stats && typeof stats === 'object' ? stats : {};

  return {
    hp: Number(source.hp || 0),
    stamina: Number(source.stamina || 0),
    strength: Number(source.strength || 0),
    dexterity: Number(source.dexterity || 0),
    essence: Number(source.essence || 0),
    warding: Number(source.warding || 0),
    spirit: Number(source.spirit || 0),
    armour: Number(source.armour || source.defense || 0),
    critChance: Number(source.critChance || 0),
    critDamage: Number(source.critDamage || 0)
  };
}

function normalizeQuestLog(quests) {
  const source = quests && typeof quests === 'object' ? quests : {};

  return {
    active: source.active && typeof source.active === 'object' ? source.active : {},
    completed: source.completed && typeof source.completed === 'object' ? source.completed : {}
  };
}

function normalizeQuestState(questState) {
  const source = questState && typeof questState === 'object' ? questState : {};

  return {
    activeQuestId: source.activeQuestId || null,
    active: source.active && typeof source.active === 'object' ? source.active : {},
    completed: source.completed && typeof source.completed === 'object' ? source.completed : {},
    failed: source.failed && typeof source.failed === 'object' ? source.failed : {},
    recentlyUpdated: Array.isArray(source.recentlyUpdated) ? source.recentlyUpdated : [],
    recentlyCompleted: Array.isArray(source.recentlyCompleted) ? source.recentlyCompleted : []
  };
}

function normalizeTower(tower) {
  const source = tower && typeof tower === 'object' ? tower : {};

  return {
    unlocked: !!source.unlocked,
    highestFloor: Math.max(0, Number(source.highestFloor || source.record || 0)),
    currentFloor: Math.max(0, Number(source.currentFloor || 0)),
    bestTime: Number(source.bestTime || 0),
    rewardsClaimed: normalizeRecordMap(source.rewardsClaimed)
  };
}

function normalizeInfiniteDungeons(value, legacyTower) {
  const source = value && typeof value === 'object' ? value : {};
  const normalized = {};

  for (const [regionId, state] of Object.entries(source)) {
    normalized[regionId] = normalizeTower(state);
  }

  const legacy = normalizeTower(legacyTower);
  const hearthmere = normalizeTower(normalized.hearthmereFrontier);
  normalized.hearthmereFrontier = {
    ...legacy,
    ...hearthmere,
    unlocked: true,
    highestFloor: Math.max(legacy.highestFloor, hearthmere.highestFloor),
    currentFloor: Math.max(legacy.currentFloor, hearthmere.currentFloor),
    rewardsClaimed: {
      ...(legacy.rewardsClaimed || {}),
      ...(hearthmere.rewardsClaimed || {})
    }
  };

  return normalized;
}

function normalizeCrafting(crafting) {
  const source = crafting && typeof crafting === 'object' ? crafting : {};

  return {
    unlocked: source.unlocked !== false,
    knownRecipes: Array.isArray(source.knownRecipes) ? source.knownRecipes : [],
    salvageCount: Math.max(0, Number(source.salvageCount || 0)),
    upgradesPerformed: Math.max(0, Number(source.upgradesPerformed || 0)),
    craftCount: Math.max(0, Number(source.craftCount || 0)),
    cookedCount: Math.max(0, Number(source.cookedCount || 0)),
    runecraftCount: Math.max(0, Number(source.runecraftCount || 0)),
    recipesCrafted: normalizeRecordMap(source.recipesCrafted),
    lastRecipeId: source.lastRecipeId || null
  };
}

function normalizePosition(position) {
  const source = position && typeof position === 'object' ? position : {};

  return {
    x: Number.isFinite(Number(source.x)) ? Number(source.x) : 0,
    y: Number.isFinite(Number(source.y)) ? Number(source.y) : 0
  };
}

function normalizeRecordMap(value) {
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) {
    return value.reduce((map, id) => {
      if (id) map[id] = true;
      return map;
    }, {});
  }

  return { ...value };
}

function cleanNumberMap(map) {
  const clean = {};
  if (!map || typeof map !== 'object') return clean;

  for (const [key, value] of Object.entries(map)) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) clean[key] = n;
  }

  return clean;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value))];
}

function createProfileId(slot) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `p${slot}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}
