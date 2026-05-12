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
//
// main.js should import these functions instead of owning profile/save logic.

import { createWorld } from './world.js';
import { createPlayer, migratePlayer } from './player.js';

import {
  ensurePlayerDialogueAndQuestState
} from './dialogueSystem.js';

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

// -----------------------------------------------------------------------------
// PROFILE STORAGE
// -----------------------------------------------------------------------------

export function readProfiles() {
  try {
    const current = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};

    if (Object.keys(current).length) {
      return current;
    }

    // One-time migration attempt from old profile keys.
    for (const oldKey of OLD_PROFILE_KEYS) {
      const oldProfiles = JSON.parse(localStorage.getItem(oldKey)) || {};

      if (Object.keys(oldProfiles).length) {
        const slimProfiles = slimProfileCollection(oldProfiles);
        writeProfiles(slimProfiles);
        return slimProfiles;
      }
    }

    return {};
  } catch (err) {
    console.warn('Failed to read profiles:', err);
    return {};
  }
}

export function writeProfiles(profiles) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    return true;
  } catch (err) {
    console.error('Failed to save profiles:', err);

    try {
      const slimProfiles = slimProfileCollection(profiles);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(slimProfiles));
      return true;
    } catch (secondErr) {
      console.error('Failed to save even after slimming profiles:', secondErr);
      return false;
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

  const isDungeon = game.world?.mode === 'dungeon';

  return slimSaveState({
    version: 7,
    savedAt: Date.now(),

    player: sanitizeForSave(game.player),

    worldMode: game.world?.mode || 'overworld',
    worldName: game.world?.name || 'Sol Land',
    worldTheme: game.world?.theme || null,
    worldDepth: game.world?.depth || null,
    worldTier: game.world?.tier || null,

    // IMPORTANT:
    // The overworld is deterministic and regenerated from code.
    // Do not save overworld tiles/features/objects/enemies.
    worldTiles: isDungeon ? sanitizeForSave(game.world.tiles || []) : null,
    worldTerrainFeatures: null,
    worldObjects: isDungeon ? sanitizeForSave(game.world.objects || []) : null,
    enemies: isDungeon ? sanitizeForSave(game.world.enemies || []) : null,
    worldDrops: isDungeon ? sanitizeForSave(game.world.drops || []) : [],

    overworldState: game.overworldState ? sanitizeForSave(game.overworldState) : null,

    logLines: Array.isArray(game.logLines) ? game.logLines.slice(0, 40) : [],

    camera: {
      x: Number(game.camera?.x || 0),
      y: Number(game.camera?.y || 0)
    }
  });
}

export function slimSaveState(saveState) {
  if (!saveState) return null;

  const isDungeon = saveState.worldMode === 'dungeon';

  return {
    ...saveState,

    version: saveState.version || 7,

    // Never allow overworld bloat into localStorage.
    worldTiles: isDungeon ? saveState.worldTiles || [] : null,
    worldTerrainFeatures: null,
    worldObjects: isDungeon ? saveState.worldObjects || [] : null,
    enemies: isDungeon ? saveState.enemies || [] : null,
    worldDrops: isDungeon ? saveState.worldDrops || [] : [],

    worldEffects: [],
    effects: [],

    logLines: Array.isArray(saveState.logLines)
      ? saveState.logLines.slice(0, 40)
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

export function sanitizeForSave(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => {
    if (key === 'floatingTexts') return [];
    if (key === 'combatEffects') return [];
    if (key === 'effects') return [];

    if (typeof val === 'function') return undefined;
    if (typeof val === 'number' && !Number.isFinite(val)) return 0;

    return val;
  }));
}

// -----------------------------------------------------------------------------
// SAVE MIGRATION
// -----------------------------------------------------------------------------

export function migrateSaveState(saveState, fallbackWorld = null, fallbackPlayer = null) {
  const freshWorld = createWorld();

  const player = migratePlayer(
    saveState?.player ||
    fallbackPlayer ||
    createPlayer('Wayfarer')
  );

  const worldMode = saveState?.worldMode || 'overworld';
  const worldName = saveState?.worldName || (worldMode === 'dungeon' ? 'Dungeon' : 'Sol Land');
  const worldTheme = saveState?.worldTheme || null;
  const worldDepth = saveState?.worldDepth || null;
  const worldTier = saveState?.worldTier || null;

  const isDungeon = worldMode === 'dungeon';

  const worldTiles = isDungeon && Array.isArray(saveState?.worldTiles) && saveState.worldTiles.length
    ? saveState.worldTiles
    : freshWorld.tiles || fallbackWorld?.tiles || [];

  const worldTerrainFeatures = isDungeon
    ? null
    : freshWorld.terrainFeatures || null;

  const worldObjects = isDungeon && Array.isArray(saveState?.worldObjects)
    ? saveState.worldObjects
    : freshWorld.objects || fallbackWorld?.objects || [];

  const enemies = isDungeon && Array.isArray(saveState?.enemies)
    ? saveState.enemies
    : freshWorld.enemies || fallbackWorld?.enemies || [];

  const worldDrops = isDungeon && Array.isArray(saveState?.worldDrops)
    ? saveState.worldDrops
    : [];

  const overworldState = saveState?.overworldState || null;

  const logLines = Array.isArray(saveState?.logLines)
    ? saveState.logLines.slice(0, 40)
    : ['Profile loaded.'];

  const camera = saveState?.camera &&
    Number.isFinite(saveState.camera.x) &&
    Number.isFinite(saveState.camera.y)
    ? {
        x: saveState.camera.x,
        y: saveState.camera.y
      }
    : {
        x: player.x - 480,
        y: player.y - 270
      };

  player.cooldowns = cleanCooldownMap(player.cooldowns);
  player.summonCooldowns = cleanCooldownMap(player.summonCooldowns);

  player.summons = Array.isArray(player.summons)
    ? player.summons.filter(summon => summon && summon.alive !== false && summon.hp > 0)
    : [];

  player.floatingTexts = [];
  player.combatEffects = [];

  ensurePlayerDialogueAndQuestState(player);

  return {
    player,
    worldMode,
    worldName,
    worldTheme,
    worldDepth,
    worldTier,
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

    if (Number.isFinite(n) && n >= 0) {
      clean[key] = n;
    }
  }

  return clean;
}

// -----------------------------------------------------------------------------
// MENU / PROFILE UI
// -----------------------------------------------------------------------------

export function showMenu(startProfileCallback = null) {
  const app = document.getElementById('app');
  const mainMenu = document.getElementById('mainMenu');

  if (app) app.classList.remove('active');
  if (mainMenu) mainMenu.classList.add('active');

  // Important:
  // The profile list must keep the load callback.
  // Otherwise the Load buttons render visually, but clicking them does nothing.
  renderProfileList(startProfileCallback);
}

export function showGame() {
  const mainMenu = document.getElementById('mainMenu');
  const app = document.getElementById('app');

  if (mainMenu) mainMenu.classList.remove('active');
  if (app) app.classList.add('active');
}

export function createProfileFromInput(startProfileCallback) {
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
    return;
  }

  list.innerHTML = profiles.map(profile => `
    <div class="profile-row">
      <div class="profile-meta">
        <b>${escapeHtml(profile.name)}</b><br>
        <span class="tag">Last saved: ${escapeHtml(profile.updatedText || 'Never')}</span>
      </div>
      <button data-load="${escapeHtml(profile.id)}">Load</button>
      <button class="danger" data-delete="${escapeHtml(profile.id)}">Delete</button>
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
      deleteProfile(button.dataset.delete);
      renderProfileList(startProfileCallback);
    };
  });
}

export function bindProfileMenu(startProfileCallback) {
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
  }

  renderProfileList(startProfileCallback);
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

  if (typeof game.finalizeLoadedState === 'function') {
    game.finalizeLoadedState('save');
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

  const migrated = migrateSaveState(saveState, game.world, game.player);

  game.player = migrated.player;

  game.world = {
    mode: migrated.worldMode,
    name: migrated.worldName,
    theme: migrated.worldTheme,
    depth: migrated.worldDepth,
    tier: migrated.worldTier,
    tiles: migrated.worldTiles,
    terrainFeatures: migrated.worldTerrainFeatures,
    objects: migrated.worldObjects,
    enemies: migrated.enemies,
    drops: migrated.worldDrops,
    effects: [],
    combatEffects: []
  };

  game.overworldState = migrated.overworldState;
  game.logLines = migrated.logLines;
  game.camera = migrated.camera;

  if (typeof game.finalizeLoadedState === 'function') {
    game.finalizeLoadedState('load');
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