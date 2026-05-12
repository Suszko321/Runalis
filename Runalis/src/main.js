// main.js
// Runalis main game loop.
//
// Slimmed-down coordinator version.
// Major systems split into:
//
// - gameInteraction.js
//   Interaction, harvesting, class selection, shrine/campfire, dungeon routing.
//
// - gameDevTools.js
//   Pause overlay, dev tools, dev item buttons, dev actions.
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

import { createWorld, isPassable } from './world.js';

import {
  createPlayer,
  migratePlayer,
  addItem
} from './player.js';

import {
  updateCombat,
  updateEnemies,
  updateSummons,
  useAbility,
  getPlayerMovementMultiplier,
  getPlayerDashVelocity
} from './combat.js';

import { draw } from './render.js';
import { initUI, renderUI } from './ui.js';
import { TILE } from './data.js';

import {
  addFloatingText,
  updateFloatingTexts,
  addQuestText,
  addStatusText,
  addSpiritText
} from './floatingText.js';

import {
  handlePlayerDefeatedInDungeon
} from './dungeonSystem.js';

import {
  createDialogueState,
  closeDialogue,
  updateDialogue,
  updateDialogueInput,
  updatePoiDiscovery,
  ensurePlayerDialogueAndQuestState
} from './dialogueSystem.js';

import { drawDialogueUI } from './dialogueUI.js';
import { getPoi } from './worldContent.js';

import {
  interact,
  enterDungeon,
  exitDungeon,
  refreshClassAbilityUnlocks,
  grantClassStarterGear,
  getClassColor,
  abilityName
} from './gameInteraction.js';

import {
  ensurePauseOverlay,
  injectPauseDevStyles,
  setPauseActive,
  bindPauseButtons,
  renderPauseDevTools,
  devRaiseClass,
  devRaiseAllSkills,
  devRefreshClassAbilities,
  devEnterTestDungeon,
  devGiveAllGear,
  devGiveClassGear,
  devGiveEveryItem,
  devGiveItem,
  devFullRestore
} from './gameDevTools.js';

import {
  bindProfileMenu,
  renderProfileList,
  showMenu,
  showGame,
  saveGameProfile,
  applySaveToGame
} from './gameSave.js';

// -----------------------------------------------------------------------------
// GAME CLASS
// -----------------------------------------------------------------------------

class RunalisGame {
  constructor(profileId, profileName, savedState = null) {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');

    this.profileId = profileId;
    this.profileName = profileName;

    this.world = createWorld();
    this.player = createPlayer(profileName || 'Wayfarer');

    this.overworldState = null;
    this.dialogue = createDialogueState();

    this.keys = new Set();

    this.input = {
      mouseX: 0,
      mouseY: 0,
      mouseWorldX: 0,
      mouseWorldY: 0,

      moveX: 0,
      moveY: 0,

      attackHeld: false,
      attackPressed: false,

      sprintHeld: false,
      blockHeld: false,
      dashPressed: false
    };

    this.logLines = [
      'Welcome to Runalis.',
      'You enter the Sol Land as a human. What you become depends on what you survive.'
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
    injectPauseDevStyles();

    initUI(this);
    this.bind();

    if (savedState) {
      this.applySave(savedState);
    } else {
      this.giveStartingItems();
      this.finalizeLoadedState('new');
    }

    ensurePlayerDialogueAndQuestState(this.player);

    const label = document.getElementById('activeProfileLabel');
    if (label) label.textContent = this.profileName;

    this.captureProgressionWatch();

    this.started = true;

    renderUI(this.player, this.logLines, this);
    this.renderPauseDevTools();

    requestAnimationFrame(time => this.loop(time));
  }

  // ---------------------------------------------------------------------------
  // STARTUP / CLEANUP
  // ---------------------------------------------------------------------------

  giveStartingItems() {
    addItem(this.player, 'fieldRations', 2);

    this.log('You have no class. No oath. No chosen path.');
    this.log('Find work, gather supplies, and speak with Warden Mael.');
  }

  bind() {
    this.keydown = event => {
      const key = event.key.toLowerCase();

      if (key === 'escape') {
        event.preventDefault();

        if (this.dialogue?.active) {
          closeDialogue(this.dialogue);
          renderUI(this.player, this.logLines, this);
          return;
        }

        this.togglePause();
        return;
      }

      if (this.paused) return;

      if (this.dialogue?.active) {
        const handled = updateDialogueInput(
          this.dialogue,
          createDialogueInputFromEvent(event),
          this.player,
          this.world
        );

        if (handled) {
          event.preventDefault();
          renderUI(this.player, this.logLines, this);
          return;
        }

        return;
      }

      this.keys.add(key);

      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
      }

      if (key === ' ') {
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

      if (key === 'f') {
        this.input.blockHeld = true;
      }

      if (key === 'q') {
        useAbility(0, this.player, this.world, this.log, performance.now() / 1000, this.input);
      }

      if (key === 'r') {
        useAbility(1, this.player, this.world, this.log, performance.now() / 1000, this.input);
      }

      if (['1', '2', '3', '4'].includes(key)) {
        useAbility(Number(key) - 1, this.player, this.world, this.log, performance.now() / 1000, this.input);
      }

      if (key === 'e' && !this.interactLock) {
        this.interact();
        this.interactLock = true;
      }
    };

    this.keyup = event => {
      const key = event.key.toLowerCase();

      this.keys.delete(key);

      if (key === ' ') {
        this.input.attackHeld = false;
      }

      if (key === 'shift') {
        this.input.sprintHeld = false;
      }

      if (key === 'f') {
        this.input.blockHeld = false;
      }

      if (key === 'e') {
        this.interactLock = false;
      }
    };

    this.mousemove = event => {
      this.updateMousePosition(event);
    };

    this.mousedown = event => {
      if (this.paused || this.dialogue?.active) return;

      if (event.button === 0) {
        if (!this.input.attackHeld) {
          this.input.attackPressed = true;
        }

        this.input.attackHeld = true;
      }

      if (event.button === 2) {
        event.preventDefault();
        this.input.blockHeld = true;
      }
    };

    this.mouseup = event => {
      if (event.button === 0) {
        this.input.attackHeld = false;
      }

      if (event.button === 2) {
        this.input.blockHeld = false;
      }
    };

    this.contextmenu = event => {
      event.preventDefault();
    };

    this.blur = () => {
      this.keys.clear();

      this.input.attackHeld = false;
      this.input.attackPressed = false;
      this.input.sprintHeld = false;
      this.input.blockHeld = false;
      this.input.dashPressed = false;
    };

    this.beforeUnload = () => this.save(false);

    addEventListener('keydown', this.keydown);
    addEventListener('keyup', this.keyup);
    addEventListener('mousemove', this.mousemove);
    addEventListener('mousedown', this.mousedown);
    addEventListener('mouseup', this.mouseup);
    addEventListener('contextmenu', this.contextmenu);
    addEventListener('blur', this.blur);
    addEventListener('beforeunload', this.beforeUnload);
  }

  destroy() {
    removeEventListener('keydown', this.keydown);
    removeEventListener('keyup', this.keyup);
    removeEventListener('mousemove', this.mousemove);
    removeEventListener('mousedown', this.mousedown);
    removeEventListener('mouseup', this.mouseup);
    removeEventListener('contextmenu', this.contextmenu);
    removeEventListener('blur', this.blur);
    removeEventListener('beforeunload', this.beforeUnload);

    this.started = false;
  }

  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.input.mouseX = (event.clientX - rect.left) * scaleX;
    this.input.mouseY = (event.clientY - rect.top) * scaleY;

    this.input.mouseWorldX = this.input.mouseX + this.camera.x;
    this.input.mouseWorldY = this.input.mouseY + this.camera.y;
  }

  // ---------------------------------------------------------------------------
  // MAIN LOOP
  // ---------------------------------------------------------------------------

  loop(time) {
    if (!this.started) return;

    const dt = Math.min(0.033, (time - this.last) / 1000);
    this.last = time;

    const now = time / 1000;

    if (!this.paused) {
      this.update(dt, now);
    }

    this.updateScreenShake(dt);
    this.buildRenderCamera();

    document.body.classList.toggle('dialogue-active', !!this.dialogue?.active);

    draw(this.ctx, this.world, this.player, this.renderCamera);

    if (this.dialogue?.active) {
      drawDialogueUI(this.ctx, this.dialogue);
    }

    this.uiTimer -= dt;

    if (this.uiTimer <= 0) {
      renderUI(this.player, this.logLines, this);
      this.uiTimer = 0.2;
    }

    requestAnimationFrame(nextTime => this.loop(nextTime));
  }

  update(dt, now) {
    migratePlayer(this.player);
    ensurePlayerDialogueAndQuestState(this.player);

    updateDialogue(this.dialogue, dt);

    if (this.dialogue.active) {
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.attackPressed = false;
      this.input.dashPressed = false;
      return;
    }

    const discoveredPois = updatePoiDiscovery(this.player, this.world);

    for (const poiId of discoveredPois) {
      const poi = getPoi(poiId);

      if (poi) {
        this.log(poi.discoveredText || `${poi.name} discovered.`);

        addStatusText(this.player, poi.name || 'Location Discovered', {
          color: '#d9ad4f'
        });
      }
    }

    this.updateInputMovement();

    if (this.player.hp <= 0) {
      this.handlePlayerDefeated();
    }

    if (this.player.spiritAwakened) {
      this.player.spirit = Math.min(this.player.maxSpirit, this.player.spirit + 4 * dt);
    } else {
      this.player.spirit = 0;
    }

    updateFloatingTexts(this.player, dt);

    updateCombat(this.player, this.world, this.input, dt, now, this.log);

    this.move(dt);

    updateEnemies(dt, this.player, this.world, this.log, now);
    updateSummons(dt, this.player, this.world, this.log, now);

    this.updateRespawns(dt);
    this.updateWorldEffects(dt);
    this.checkProgressionFeedback();

    this.camera.x += (this.player.x - this.canvas.width / 2 - this.camera.x) * 0.12;
    this.camera.y += (this.player.y - this.canvas.height / 2 - this.camera.y) * 0.12;

    this.input.attackPressed = false;
    this.input.dashPressed = false;
  }

  // ---------------------------------------------------------------------------
  // PLAYER STATE / WORLD UPDATE
  // ---------------------------------------------------------------------------

  handlePlayerDefeated() {
    if (this.world?.mode === 'dungeon') {
      const returned = handlePlayerDefeatedInDungeon(this);

      if (returned) {
        this.log('You were dragged back to safety by unseen hands.');
        this.shake(8, 0.18);
        return;
      }
    }

    this.player.hp = Math.max(1, Math.floor(this.player.maxHp * 0.45));
    this.player.stamina = Math.max(35, Math.floor(this.player.maxStamina * 0.35));

    if (this.player.spiritAwakened) {
      this.player.spirit = Math.max(0, Math.floor(this.player.maxSpirit * 0.25));
    }

    this.player.x = 11 * TILE;
    this.player.y = 27 * TILE;

    this.log('You were dragged back to the outpost by unseen hands.');
    this.shake(8, 0.18);

    addSpiritText(this.player, 'Returned to outpost', {
      ttl: 1.2,
      size: 14
    });
  }

  updateInputMovement() {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

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

      if (object.respawn <= 0) {
        object.depleted = false;
      }
    }
  }

  updateWorldEffects(dt) {
    const effectLists = [
      this.world.effects,
      this.world.combatEffects,
      this.player.combatEffects
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
  }

  move(dt) {
    let dx = this.input.moveX;
    let dy = this.input.moveY;

    const dashVelocity = getPlayerDashVelocity(this.player);

    if (dashVelocity.x || dashVelocity.y) {
      const nx = this.player.x + dashVelocity.x * dt;
      const ny = this.player.y + dashVelocity.y * dt;

      if (isPassable(this.world, nx, this.player.y)) {
        this.player.x = nx;
      }

      if (isPassable(this.world, this.player.x, ny)) {
        this.player.y = ny;
      }

      this.player.dirX = dashVelocity.x;
      this.player.dirY = dashVelocity.y;

      return;
    }

    if (!dx && !dy) return;

    this.player.dirX = dx;
    this.player.dirY = dy;
    this.player.walkTime = (this.player.walkTime || 0) + dt * 9;

    const speedMultiplier = getPlayerMovementMultiplier(this.player);
    const speed = 128 * speedMultiplier;

    const nx = this.player.x + dx * speed * dt;
    const ny = this.player.y + dy * speed * dt;

    if (isPassable(this.world, nx, this.player.y)) {
      this.player.x = nx;
    }

    if (isPassable(this.world, this.player.x, ny)) {
      this.player.y = ny;
    }
  }

  // ---------------------------------------------------------------------------
  // SPLIT SYSTEM WRAPPERS
  // ---------------------------------------------------------------------------

  interact() {
    interact(this);
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

  renderPauseDevTools() {
    renderPauseDevTools(this);
  }

  devRaiseClass(amount = 10) {
    devRaiseClass(this, amount);
  }

  devRaiseAllSkills(amount = 10) {
    devRaiseAllSkills(this, amount);
  }

  devRefreshClassAbilities() {
    devRefreshClassAbilities(this);
  }

  devEnterTestDungeon() {
    devEnterTestDungeon(this);
  }

  devGiveAllGear() {
    devGiveAllGear(this);
  }

  devGiveClassGear() {
    devGiveClassGear(this);
  }

  devGiveEveryItem() {
    devGiveEveryItem(this);
  }

  devGiveItem(itemId) {
    devGiveItem(this, itemId);
  }

  devFullRestore() {
    devFullRestore(this);
  }

  // ---------------------------------------------------------------------------
  // SAVE / LOAD
  // ---------------------------------------------------------------------------

  save(showLog = true) {
    this.finalizeLoadedState('save');

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

    renderUI(this.player, this.logLines, this);
    this.renderPauseDevTools();
  }

  saveAndQuit() {
    const saved = this.save(false);

    if (!saved) {
      this.log('Save & Quit failed because the profile could not be saved.');
      renderUI(this.player, this.logLines, this);
      return;
    }

    this.destroy();

    currentGame = null;

    this.togglePause(false);

    // IMPORTANT:
    // Keep the startProfile callback when returning to the menu.
    // Without this, the Load buttons render but cannot start the selected profile.
    showMenu(startProfile);
  }

  finalizeLoadedState(reason = 'migrate') {
    this.player = migratePlayer(this.player || createPlayer(this.profileName || 'Wayfarer'));
    ensurePlayerDialogueAndQuestState(this.player);

    this.world = this.world || createWorld();
    this.world.mode = this.world.mode || 'overworld';
    this.world.name = this.world.name || (this.world.mode === 'dungeon' ? 'Dungeon' : 'Sol Land');

    const freshWorld = createWorld();

    this.world.tiles = Array.isArray(this.world.tiles) && this.world.tiles.length
      ? this.world.tiles
      : freshWorld.tiles;

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

    setPauseActive(this.paused);

    if (this.paused) {
      closeDialogue(this.dialogue);
      this.renderPauseDevTools();
    }
  }

  // ---------------------------------------------------------------------------
  // PROGRESSION FEEDBACK
  // ---------------------------------------------------------------------------

  captureProgressionWatch() {
    migratePlayer(this.player);

    this.progressionWatch = {
      combatLevel: Number(this.player.combatLevel || 1),
      classLevel: Number(this.player.classLevel || 0),
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
      classLevel: this.player.classLevel || 0,
      hp: this.player.hp,
      stamina: this.player.stamina,
      spirit: this.player.spirit
    };

    const combatLevel = Number(this.player.combatLevel || 1);
    const classLevel = Number(this.player.classLevel || 0);

    if (combatLevel > previous.combatLevel) {
      this.log(`Combat Level increased to ${combatLevel}.`);
      this.shake(8, 0.18);

      addQuestText(this.player, `Combat Level ${combatLevel}`, {
        color: '#ffcc66',
        ttl: 1.45,
        size: 17,
        offsetY: -68
      });

      this.spawnBurstEffect(this.player.x, this.player.y, '#ffcc66', 34);
    }

    if (classLevel > previous.classLevel && this.player.className) {
      this.log(`${this.player.className} Level increased to ${classLevel}.`);
      this.shake(6, 0.16);

      addQuestText(this.player, `${this.player.className} Level ${classLevel}`, {
        color: getClassColor(this.player.classId),
        ttl: 1.35,
        size: 15,
        offsetY: -86
      });

      this.spawnBurstEffect(this.player.x, this.player.y, getClassColor(this.player.classId), 28);
    }

    this.progressionWatch = {
      combatLevel,
      classLevel,
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
    this.screenShake.amount = Math.max(this.screenShake.amount, amount);
    this.screenShake.time = Math.max(this.screenShake.time, duration);
    this.screenShake.maxTime = Math.max(this.screenShake.maxTime, duration);
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
    const shakeT = this.screenShake.maxTime > 0
      ? this.screenShake.time / this.screenShake.maxTime
      : 0;

    const amount = this.screenShake.amount * shakeT * shakeT;

    this.renderCamera.x = this.camera.x + randomRange(-amount, amount);
    this.renderCamera.y = this.camera.y + randomRange(-amount, amount);
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

// -----------------------------------------------------------------------------
// MENU / PROFILE BOOT
// -----------------------------------------------------------------------------

function startProfile(profile) {
  if (currentGame) {
    currentGame.destroy();
  }

  showGame();

  currentGame = new RunalisGame(profile.id, profile.name, profile.state);
}

function boot() {
  bindProfileMenu(startProfile);
  renderProfileList(startProfile);

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

boot();

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
    justPressed
  };
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}