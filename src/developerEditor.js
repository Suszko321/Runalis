import { TILE, BIOMES } from './data.js';
import { createCombatDeveloperTools } from './combatDeveloperTools.js';
import { getVisualStatus, VISUAL_STATUS } from './modelRegistry.js';
import {
  applyEditorOverride,
  buildEditorOverride,
  clearDeveloperRecovery,
  cloneSerializable,
  createDeveloperBackup,
  createEditorBaseSnapshot,
  exportEditorJson,
  findEntityDependencies,
  generatePersistentEditorId,
  getEditorMapId,
  listDeveloperBackups,
  loadDeveloperDraft,
  loadDeveloperRecovery,
  publishRuntimeOverride,
  saveDeveloperDraft,
  saveDeveloperRecovery,
  validateEditorWorld
} from './developerWorldPersistence.js';

export const EDITOR_MODES = Object.freeze({ SELECT: 'select', PLACE: 'place', TERRAIN: 'terrain', PLAYTEST: 'playtest' });
export const TRANSFORM_TOOLS = Object.freeze({ UNIVERSAL: 'universal', MOVE: 'move', ROTATE: 'rotate', SCALE: 'scale' });

const CRITICAL_KINDS = new Set([
  'dungeonEntrance', 'dungeonExit', 'sideZoneEntrance', 'towerEntrance', 'travelGate',
  'spawn', 'editorSpawn', 'questTrigger', 'dialogueTrigger', 'fastTravelPoint'
]);
const VEGETATION_PATTERN = /tree|grass|shrub|bush|flower|fern|moss|root|mushroom|stump|orchard/i;
const WATER_PATTERN = /water|river|pond|lake|stream|marsh/i;
const ART_FILTERS = Object.freeze([
  'Missing Model', 'Placeholder', 'Broken Material', 'Wrong Scale', 'No Collision',
  'Duplicate Asset', 'Hidden Logic Object', 'Production Invalid'
]);

export function createDeveloperEditor(game, options = {}) {
  return new RunalisDeveloperEditor(game, options);
}

class RunalisDeveloperEditor {
  constructor(game, options = {}) {
    this.game = game;
    this.combat = createCombatDeveloperTools(game);
    this.options = { ...options };
    this.mapId = getEditorMapId(game.world);
    this.mode = EDITOR_MODES.SELECT;
    this.transformTool = TRANSFORM_TOOLS.MOVE;
    this.cameraMode = options.cameraMode || 'Free Fly';
    this.simulationMode = options.simulation || 'paused';
    this.simulationEnabled = this.simulationMode !== 'paused';
    this.aiPaused = options.aiPaused !== false;
    this.collisionEnabled = options.collisionEnabled !== false;
    this.questsEnabled = options.questsEnabled !== false;
    this.lightingEnabled = options.lightingEnabled !== false;
    this.selection = [];
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndo = 160;
    this.dirty = false;
    this.dirtyRevision = 0;
    this.uiVisible = true;
    this.showHierarchy = true;
    this.showInspector = true;
    this.showAssetBrowser = true;
    this.showCollision = false;
    this.showNavmesh = false;
    this.showDebugLabels = false;
    this.showChunkBounds = false;
    this.assetSearch = '';
    this.hierarchySearch = '';
    this.assetCategory = 'All';
    this.selectedAssetId = null;
    this.recentAssetIds = [];
    this.favoriteAssetIds = new Set();
    this.placementRotation = 0;
    this.placementScale = 1;
    this.placementHeight = 0;
    this.placementPaint = false;
    this.randomRotation = false;
    this.randomScale = false;
    this.brushSize = 64;
    this.brushDensity = 0.45;
    this.brushFalloff = 0.65;
    this.brushMaterial = 'grass';
    this.brushStrength = 1;
    this.snapSize = 16;
    this.angleSnap = 15;
    this.gridSnap = false;
    this.surfaceSnap = true;
    this.editorCameraSpeed = 520;
    this.keys = new Set();
    this.pointer = { canvasX: 0, canvasY: 0, worldX: 0, worldY: 0, down: false, button: -1 };
    this.drag = null;
    this.selectionBox = null;
    this.lastPick = { x: 0, y: 0, time: 0, index: -1, ids: '' };
    this.consoleEntries = [];
    this.validation = { valid: true, errors: [], warnings: [], info: [] };
    this.lastAutosaveAt = performance.now();
    this.lastUiRefreshAt = 0;
    this.playtestSnapshot = null;
    this.savedCamera = { ...game.camera };
    this.activePathDraft = null;
    this.activeCollection = 'objects';

    this.baseWorld = cloneSerializable(game.world);
    this.baseSnapshot = createEditorBaseSnapshot(game.world, this.mapId);
    this.assetRegistry = this.buildAssetRegistry();
    this.restoreStoredPreferences();
    this.loadStartingOverride();
    this.assetRegistry = this.buildAssetRegistry();
    this.createUi();
    this.injectStyles();
    this.refreshAllUi();
    this.log('info', 'editor', `Developer Mode opened: ${game.world.name}.`);

    document.body.classList.add('developer-mode');
    game.player.x = game.world.spawn?.x ?? game.player.x;
    game.player.y = game.world.spawn?.y ?? game.player.y;
    game.camera.x = game.player.x - game.canvas.width / 2;
    game.camera.y = game.player.y - game.canvas.height / 2;

    if (options.startMode === 'playtest') this.enterPlaytest();
  }

  destroy() {
    if (this.dirty) this.saveRecovery();
    document.body.classList.remove('developer-mode', 'developer-ui-hidden', 'developer-playtest');
    this.root?.remove();
    this.helpOverlay?.remove();
  }

  shouldRunGameplay() {
    return this.mode === EDITOR_MODES.PLAYTEST;
  }

  update(dt, now) {
    if (this.mode === EDITOR_MODES.PLAYTEST) return;
    this.updateFreeCamera(dt);
    if (this.dirty && now * 1000 - this.lastAutosaveAt > 30000) {
      this.saveRecovery();
      this.lastAutosaveAt = now * 1000;
    }
    if (now * 1000 - this.lastUiRefreshAt > 750) {
      this.refreshStatus();
      this.lastUiRefreshAt = now * 1000;
    }
  }

  draw(ctx, camera) {
    if (this.mode === EDITOR_MODES.PLAYTEST || !ctx || !camera) return;
    ctx.save();
    this.drawEditorNativeObjects(ctx, camera);
    if (this.showCollision || this.showNavmesh) this.drawPassabilityOverlay(ctx, camera);
    if (this.showChunkBounds) this.drawChunkBounds(ctx, camera);
    if (this.showDebugLabels) this.drawDebugLabels(ctx, camera);
    this.drawSelection(ctx, camera);
    this.drawSelectionBox(ctx);
    this.drawBrushPreview(ctx, camera);
    ctx.restore();
  }

  handleKeyDown(event) {
    if (!event || isEditable(event.target)) return false;
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    this.keys.add(key);

    if (this.mode === EDITOR_MODES.PLAYTEST) {
      if (key === '4' || key === 'f7') {
        event.preventDefault();
        this.exitPlaytest(false);
        return true;
      }
      return false;
    }

    if (ctrl && key === 'z') {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
      return true;
    }
    if (ctrl && key === 'y') { event.preventDefault(); this.redo(); return true; }
    if (ctrl && key === 'd') { event.preventDefault(); this.duplicateSelection(); return true; }
    if (ctrl && key === 's') { event.preventDefault(); this.save(false); return true; }

    const actions = {
      '1': () => this.setMode(EDITOR_MODES.SELECT),
      '2': () => this.setMode(EDITOR_MODES.PLACE),
      '3': () => this.setMode(EDITOR_MODES.TERRAIN),
      '4': () => this.enterPlaytest(),
      'q': () => this.setTransformTool(TRANSFORM_TOOLS.UNIVERSAL),
      'w': () => this.setTransformTool(TRANSFORM_TOOLS.MOVE),
      'e': () => this.setTransformTool(TRANSFORM_TOOLS.ROTATE),
      'r': () => this.setTransformTool(TRANSFORM_TOOLS.SCALE),
      'tab': () => this.toggleUi(),
      'f1': () => this.toggleHelp(true),
      'f2': () => this.togglePanel('assets'),
      'f3': () => this.togglePanel('hierarchy'),
      'f4': () => this.togglePanel('inspector'),
      'f5': () => this.save(false),
      'f6': () => this.reloadSaved(),
      'f7': () => this.toggleSimulation(),
      'f8': () => { this.showCollision = !this.showCollision; this.refreshStatus(); },
      'f9': () => { this.showNavmesh = !this.showNavmesh; this.refreshStatus(); },
      'f10': () => { this.showDebugLabels = !this.showDebugLabels; this.refreshStatus(); },
      'enter': () => this.activePathDraft ? this.finishPath() : null,
      'f': () => this.frameSelection(),
      'home': () => this.returnToSpawn(),
      'end': () => this.moveCameraToPlayer(),
      'escape': () => this.cancelOrClearSelection(),
      'delete': () => this.deleteSelection(),
      'backspace': () => this.deleteSelection()
    };

    if (actions[key]) {
      event.preventDefault();
      actions[key]();
      return true;
    }

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && this.selection.length) {
      event.preventDefault();
      const amount = event.shiftKey ? 1 : this.gridSnap || event.ctrlKey ? this.snapSize : 4;
      this.nudgeSelection(
        key === 'arrowleft' ? -amount : key === 'arrowright' ? amount : 0,
        key === 'arrowup' ? -amount : key === 'arrowdown' ? amount : 0
      );
      return true;
    }

    return true;
  }

  handleKeyUp(event) {
    if (!event) return false;
    this.keys.delete(event.key.toLowerCase());
    return this.mode !== EDITOR_MODES.PLAYTEST && !isEditable(event.target);
  }

  handlePointerDown(event) {
    if (this.mode === EDITOR_MODES.PLAYTEST || event.target !== this.game.canvas) return false;
    this.updatePointer(event);
    this.pointer.down = true;
    this.pointer.button = event.button;

    if (event.button === 1 || event.button === 2) {
      this.drag = { type: 'camera', startX: event.clientX, startY: event.clientY, camera: { ...this.game.camera } };
      event.preventDefault();
      return true;
    }
    if (event.button !== 0) return true;

    if (this.mode === EDITOR_MODES.PLACE) {
      this.placeAtPointer(event);
      this.drag = this.placementPaint ? { type: 'paintPlacement', lastX: this.pointer.worldX, lastY: this.pointer.worldY } : null;
      event.preventDefault();
      return true;
    }
    if (this.mode === EDITOR_MODES.TERRAIN) {
      this.drag = { type: 'terrain', changes: new Map() };
      this.paintTerrainAtPointer();
      event.preventDefault();
      return true;
    }

    const picked = this.pickAt(this.pointer.worldX, this.pointer.worldY);
    if (picked) {
      if (event.ctrlKey) this.removeFromSelection(picked);
      else if (event.shiftKey) this.addToSelection(picked);
      else if (!this.selection.some(entry => sameEntry(entry, picked))) this.setSelection([picked]);

      const before = this.captureSelectionTransforms();
      this.drag = {
        type: this.transformTool,
        startWorldX: this.pointer.worldX,
        startWorldY: this.pointer.worldY,
        before,
        center: selectionCenter(this.selection)
      };
    } else {
      if (!event.shiftKey && !event.ctrlKey) this.clearSelection();
      this.selectionBox = { startX: this.pointer.canvasX, startY: this.pointer.canvasY, endX: this.pointer.canvasX, endY: this.pointer.canvasY };
      this.drag = { type: 'selectionBox', additive: event.shiftKey };
    }
    event.preventDefault();
    return true;
  }

  handlePointerMove(event) {
    if (this.mode === EDITOR_MODES.PLAYTEST || event.target !== this.game.canvas) return false;
    this.updatePointer(event);
    if (!this.drag) return true;

    if (this.drag.type === 'camera') {
      const rect = this.game.canvas.getBoundingClientRect();
      const sx = this.game.canvas.width / Math.max(1, rect.width);
      const sy = this.game.canvas.height / Math.max(1, rect.height);
      this.game.camera.x = this.drag.camera.x - (event.clientX - this.drag.startX) * sx;
      this.game.camera.y = this.drag.camera.y - (event.clientY - this.drag.startY) * sy;
      this.clampCamera();
      return true;
    }
    if (this.drag.type === 'paintPlacement') {
      const distance = Math.hypot(this.pointer.worldX - this.drag.lastX, this.pointer.worldY - this.drag.lastY);
      if (distance >= Math.max(12, this.brushSize * (1 - this.brushDensity * 0.75))) {
        this.paintPlacementAt(this.pointer.worldX, this.pointer.worldY);
        this.drag.lastX = this.pointer.worldX;
        this.drag.lastY = this.pointer.worldY;
      }
      return true;
    }
    if (this.drag.type === 'terrain') {
      this.paintTerrainAtPointer();
      return true;
    }
    if (this.drag.type === 'selectionBox') {
      this.selectionBox.endX = this.pointer.canvasX;
      this.selectionBox.endY = this.pointer.canvasY;
      return true;
    }

    const dx = this.pointer.worldX - this.drag.startWorldX;
    const dy = this.pointer.worldY - this.drag.startWorldY;
    this.applyDragTransform(dx, dy, event);
    return true;
  }

  handlePointerUp(event) {
    if (this.mode === EDITOR_MODES.PLAYTEST || !this.pointer.down) return false;
    this.updatePointer(event);
    const drag = this.drag;
    this.pointer.down = false;
    this.pointer.button = -1;
    this.drag = null;

    if (!drag) return true;
    if (drag.type === 'selectionBox') {
      this.finishBoxSelection(drag.additive);
      this.selectionBox = null;
      return true;
    }
    if (drag.type === 'terrain') {
      this.finishTerrainCommand(drag.changes);
      return true;
    }
    if ([TRANSFORM_TOOLS.MOVE, TRANSFORM_TOOLS.ROTATE, TRANSFORM_TOOLS.SCALE, TRANSFORM_TOOLS.UNIVERSAL].includes(drag.type)) {
      const after = this.captureSelectionTransforms();
      if (JSON.stringify(drag.before) !== JSON.stringify(after)) {
        this.pushTransformCommand(`Transform ${this.selection.length} object(s)`, drag.before, after);
      }
    }
    return true;
  }

  handleDoubleClick(event) {
    if (this.mode === EDITOR_MODES.PLAYTEST || event.target !== this.game.canvas) return false;
    this.updatePointer(event);
    const picked = this.pickAt(this.pointer.worldX, this.pointer.worldY);
    if (picked) {
      this.setSelection([picked]);
      this.frameSelection();
    }
    event.preventDefault();
    return true;
  }

  handleWheel(event) {
    if (this.mode === EDITOR_MODES.PLAYTEST || event.target !== this.game.canvas) return false;
    this.updatePointer(event);
    event.preventDefault();
    const direction = Math.sign(event.deltaY || 0);
    if (this.mode === EDITOR_MODES.PLACE && this.selectedAssetId) {
      if (event.shiftKey) this.placementHeight -= direction * 4;
      else this.placementRotation = normalizeDegrees(this.placementRotation + direction * (this.gridSnap ? this.angleSnap : 5));
      this.refreshStatus();
      return true;
    }
    if (event.ctrlKey) {
      this.editorCameraSpeed = clamp(this.editorCameraSpeed * (direction > 0 ? 0.86 : 1.16), 80, 2400);
    } else {
      const focus = this.selection.length ? selectionCenter(this.selection) : { x: this.pointer.worldX, y: this.pointer.worldY };
      const centerX = this.game.camera.x + this.game.canvas.width / 2;
      const centerY = this.game.camera.y + this.game.canvas.height / 2;
      const factor = direction > 0 ? -0.16 : 0.16;
      this.game.camera.x += (focus.x - centerX) * factor;
      this.game.camera.y += (focus.y - centerY) * factor;
      this.clampCamera();
    }
    this.refreshStatus();
    return true;
  }

  handleControllerInput(inputs) {
    if (this.mode === EDITOR_MODES.PLAYTEST) return false;
    const input = (inputs || []).find(entry => entry?.connected);
    if (!input) return false;
    const pan = 18;
    if (input.leftPressed) this.game.camera.x -= pan;
    if (input.rightPressed) this.game.camera.x += pan;
    if (input.upPressed) this.game.camera.y -= pan;
    if (input.downPressed) this.game.camera.y += pan;
    if (input.cancelPressed) this.cancelOrClearSelection();
    if (input.confirmPressed) {
      const center = { x: this.game.camera.x + this.game.canvas.width / 2, y: this.game.camera.y + this.game.canvas.height / 2 };
      const picked = this.pickAt(center.x, center.y);
      if (picked) this.setSelection([picked]);
    }
    this.clampCamera();
    return true;
  }

  save(force = false) {
    const override = this.buildOverride();
    const result = saveDeveloperDraft(override, { world: this.game.world, force });
    this.validation = result.validation || validateEditorWorld(this.game.world, override);
    if (!result.ok) {
      this.log('error', 'save', `Save blocked by ${this.validation.errors.length} error(s).`);
      this.renderValidation();
      return false;
    }
    this.dirty = false;
    clearDeveloperRecovery(this.mapId);
    this.log('info', 'save', `Saved successfully with ${this.validation.warnings.length} warning(s).`);
    this.refreshAllUi();
    return true;
  }

  saveAs() {
    const name = prompt('Development map name:', `${this.game.world.name} — ${new Date().toLocaleDateString()}`);
    if (!name) return false;
    const override = this.buildOverride({ name });
    createDeveloperBackup(override, `manual-snapshot:${name}`);
    return this.save(false);
  }

  saveRecovery() {
    const saved = saveDeveloperRecovery(this.buildOverride({ name: 'Crash Recovery' }));
    if (saved) this.log('info', 'recovery', 'Recovery snapshot updated.');
    return saved;
  }

  reloadSaved() {
    if (this.dirty && !confirm('Discard unsaved editor changes and reload the last saved draft?')) return false;
    const draft = loadDeveloperDraft(this.mapId);
    this.restoreBaseWorld();
    if (draft) applyEditorOverride(this.game.world, draft);
    this.assetRegistry = this.buildAssetRegistry();
    this.clearSelection();
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
    this.log('info', 'load', draft ? 'Reloaded last saved editor state.' : 'Reverted to the generated base map.');
    this.refreshAllUi();
    return true;
  }

  revertToBase() {
    if (!confirm('Revert this map to its generated base? The saved draft will remain available until you save again.')) return false;
    this.restoreBaseWorld();
    this.clearSelection();
    this.markDirty('Reverted working state to base map.');
    this.refreshAllUi();
    return true;
  }

  validate() {
    this.validation = validateEditorWorld(this.game.world, this.buildOverride());
    this.log(this.validation.valid ? 'info' : 'error', 'validation', `${this.validation.errors.length} errors, ${this.validation.warnings.length} warnings.`);
    this.renderValidation();
    this.switchBottomTab('validation');
    return this.validation;
  }

  publish(force = false) {
    const override = this.buildOverride();
    const result = publishRuntimeOverride(override, this.game.world, force);
    this.validation = result.validation;
    if (!result.ok) {
      this.log('error', 'export', 'Runtime export blocked by validation errors.');
      this.renderValidation();
      return false;
    }
    exportEditorJson(override, `${this.mapId}-runtime-override.json`);
    this.log('info', 'export', 'Published runtime override and downloaded production JSON.');
    return true;
  }

  exportPatch() {
    const override = this.buildOverride();
    exportEditorJson(override, `${this.mapId}-editor-patch.json`);
    this.log('info', 'export', 'Exported non-destructive override patch.');
  }

  exportChangeReport() {
    const override = this.buildOverride();
    const report = {
      mapId: override.mapId,
      generatedAt: new Date().toISOString(),
      counts: {
        deletedObjects: override.deletedObjectIds.length,
        deletedEnemies: override.deletedEnemyIds.length,
        addedObjects: override.addedObjects.length,
        addedEnemies: override.addedEnemies.length,
        modifiedObjects: Object.keys(override.modifiedObjects).length,
        modifiedEnemies: Object.keys(override.modifiedEnemies).length,
        terrainEdits: override.terrainEdits.length
      },
      validation: validateEditorWorld(this.game.world, override),
      override
    };
    exportEditorJson(report, `${this.mapId}-change-report.json`);
  }

  enterPlaytest() {
    if (this.mode === EDITOR_MODES.PLAYTEST) return;
    this.playtestSnapshot = {
      world: cloneSerializable(this.game.world),
      player: cloneSerializable(this.game.player),
      camera: { ...this.game.camera },
      selectionIds: this.selection.map(entry => `${entry.collection}:${entry.entity.id}`)
    };
    this.mode = EDITOR_MODES.PLAYTEST;
    document.body.classList.add('developer-playtest');
    this.game.player.x = this.game.camera.x + this.game.canvas.width / 2;
    this.game.player.y = this.game.camera.y + this.game.canvas.height / 2;
    this.game.paused = false;
    this.log('info', 'playtest', 'Playtest started from the editor camera. Press 4 or F7 to return and discard runtime changes.');
    this.refreshStatus();
  }

  exitPlaytest(applyRuntimeChanges = false) {
    if (this.mode !== EDITOR_MODES.PLAYTEST || !this.playtestSnapshot) return;
    if (!applyRuntimeChanges) {
      this.game.world = cloneSerializable(this.playtestSnapshot.world);
      Object.keys(this.game.player).forEach(key => delete this.game.player[key]);
      Object.assign(this.game.player, cloneSerializable(this.playtestSnapshot.player));
      this.game.camera = { ...this.playtestSnapshot.camera };
    }
    const ids = this.playtestSnapshot.selectionIds || [];
    this.mode = EDITOR_MODES.SELECT;
    document.body.classList.remove('developer-playtest');
    this.playtestSnapshot = null;
    this.selection = ids.map(value => {
      const [collection, id] = value.split(':');
      const entity = (this.game.world?.[collection] || []).find(entry => entry?.id === id);
      return entity ? { collection, entity } : null;
    }).filter(Boolean);
    this.log('info', 'playtest', applyRuntimeChanges ? 'Playtest changes applied.' : 'Playtest changes discarded; editor state restored.');
    this.refreshAllUi();
  }

  deleteSelection(force = false) {
    if (!this.selection.length) return false;
    const critical = this.selection.filter(entry => this.isCritical(entry.entity));
    const dependencies = this.selection.flatMap(entry => findEntityDependencies(this.game.world, entry.entity.id));
    if (!force && (critical.length || dependencies.length)) {
      const message = `This selection contains ${critical.length} critical object(s) and ${dependencies.length} runtime reference(s). Delete anyway?`;
      if (!confirm(message)) return false;
    }
    const removed = this.selection.map(entry => ({
      collection: entry.collection,
      entity: entry.entity,
      index: this.game.world[entry.collection].indexOf(entry.entity)
    }));
    const redo = () => {
      for (const item of removed) this.game.world[item.collection] = this.game.world[item.collection].filter(entity => entity !== item.entity);
      this.clearSelection(false);
    };
    const undo = () => {
      for (const item of removed) {
        const collection = this.game.world[item.collection];
        if (!collection.includes(item.entity)) collection.splice(Math.min(item.index, collection.length), 0, item.entity);
      }
      this.setSelection(removed.map(item => ({ collection: item.collection, entity: item.entity })), false);
    };
    redo();
    this.pushCommand({ label: `Delete ${removed.length} object(s)`, undo, redo });
    this.markDirty(`Deleted ${removed.length} object(s).`);
    this.refreshAllUi();
    return true;
  }

  disableSelection() {
    if (!this.selection.length) return;
    this.changeSharedProperty('enabled', false);
  }

  duplicateSelection() {
    if (!this.selection.length) return false;
    const originals = [...this.selection];
    const ids = this.allIds();
    const duplicates = this.selection.map(entry => {
      const entity = cloneSerializable(entry.entity);
      entity.id = generatePersistentEditorId(this.mapId, entity.kind || entry.collection, ids);
      ids.add(entity.id);
      entity.x = Number(entity.x || 0) + 24;
      entity.y = Number(entity.y || 0) + 24;
      entity.name = `${entity.name || entity.kind || 'Object'} Copy`;
      if (entity.unique || entity.npcId && /mael|mara|elian|dusk|veyr/i.test(entity.npcId)) {
        entity.unique = false;
        delete entity.npcId;
        delete entity.dialogueId;
        entity.editorCloneOf = entry.entity.id;
      }
      return { collection: entry.collection, entity };
    });
    const redo = () => duplicates.forEach(entry => {
      if (!this.game.world[entry.collection].includes(entry.entity)) this.game.world[entry.collection].push(entry.entity);
    });
    const undo = () => {
      duplicates.forEach(entry => {
        this.game.world[entry.collection] = this.game.world[entry.collection].filter(entity => entity !== entry.entity);
      });
      this.setSelection(originals, false);
    };
    const redoWithSelection = () => {
      redo();
      this.setSelection(duplicates, false);
    };
    redoWithSelection();
    this.pushCommand({ label: `Duplicate ${duplicates.length} object(s)`, undo, redo: redoWithSelection });
    this.markDirty(`Duplicated ${duplicates.length} object(s).`);
    this.refreshAllUi();
    return true;
  }

  undo() {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    this.markDirty(`Undo: ${command.label}`, false);
    this.refreshAllUi();
    return true;
  }

  redo() {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.redo();
    this.undoStack.push(command);
    this.markDirty(`Redo: ${command.label}`, false);
    this.refreshAllUi();
    return true;
  }

  setMode(mode) {
    if (!Object.values(EDITOR_MODES).includes(mode)) return;
    if (mode === EDITOR_MODES.PLAYTEST) return this.enterPlaytest();
    this.mode = mode;
    this.activePathDraft = null;
    this.refreshStatus();
  }

  setTransformTool(tool) {
    this.transformTool = tool;
    if (this.mode !== EDITOR_MODES.SELECT) this.mode = EDITOR_MODES.SELECT;
    this.refreshStatus();
  }

  toggleSimulation() {
    if (this.mode === EDITOR_MODES.PLAYTEST) return this.exitPlaytest(false);
    this.simulationEnabled = !this.simulationEnabled;
    if (this.simulationEnabled && this.simulationMode === 'paused') this.simulationMode = 'active';
    this.log('info', 'simulation', `World simulation ${this.simulationEnabled ? 'enabled for preview' : 'paused'}.`);
    this.refreshStatus();
  }

  setSelection(entries, refresh = true) {
    this.selection = uniqueEntries(entries);
    if (refresh) this.refreshSelectionUi();
  }

  addToSelection(entry) {
    if (!this.selection.some(existing => sameEntry(existing, entry))) this.selection.push(entry);
    this.refreshSelectionUi();
  }

  removeFromSelection(entry) {
    this.selection = this.selection.filter(existing => !sameEntry(existing, entry));
    this.refreshSelectionUi();
  }

  clearSelection(refresh = true) {
    this.selection = [];
    if (refresh) this.refreshSelectionUi();
  }

  cancelOrClearSelection() {
    if (this.activePathDraft) {
      const cancelled = this.activePathDraft;
      this.game.world.objects = this.game.world.objects.filter(item => item !== cancelled);
      this.activePathDraft = null;
      this.selection = this.selection.filter(entry => entry.entity !== cancelled);
      this.refreshSelectionUi();
      this.markDirty('Path draft cancelled.');
      this.log('info', 'path', 'Path draft cancelled.');
    } else if (this.selectedAssetId && this.mode === EDITOR_MODES.PLACE) {
      this.selectedAssetId = null;
      this.refreshAssetBrowser();
    } else {
      this.clearSelection();
    }
  }

  frameSelection() {
    if (!this.selection.length) return;
    const center = selectionCenter(this.selection);
    this.game.camera.x = center.x - this.game.canvas.width / 2;
    this.game.camera.y = center.y - this.game.canvas.height / 2;
    this.clampCamera();
  }

  returnToSpawn() {
    const spawn = this.game.world.spawn || { x: 0, y: 0 };
    this.game.camera.x = spawn.x - this.game.canvas.width / 2;
    this.game.camera.y = spawn.y - this.game.canvas.height / 2;
    this.clampCamera();
  }

  moveCameraToPlayer() {
    this.game.camera.x = this.game.player.x - this.game.canvas.width / 2;
    this.game.camera.y = this.game.player.y - this.game.canvas.height / 2;
    this.clampCamera();
  }

  nudgeSelection(dx, dy) {
    const before = this.captureSelectionTransforms();
    for (const { entity } of this.selection) {
      entity.x = Number(entity.x || 0) + dx;
      entity.y = Number(entity.y || 0) + dy;
      if (Array.isArray(entity.points)) {
        entity.points = entity.points.map(point => ({ ...point, x: point.x + dx, y: point.y + dy }));
      }
    }
    const after = this.captureSelectionTransforms();
    this.pushTransformCommand('Nudge selection', before, after);
    this.markDirty('Selection moved.');
    this.refreshInspector();
  }

  changeSharedProperty(property, value) {
    if (!this.selection.length) return;
    const before = this.selection.map(entry => ({ entry, value: cloneSerializable(entry.entity[property]) }));
    const redo = () => this.selection.forEach(entry => { entry.entity[property] = cloneSerializable(value); });
    const undo = () => before.forEach(item => { item.entry.entity[property] = cloneSerializable(item.value); });
    redo();
    this.pushCommand({ label: `Change ${property}`, undo, redo });
    this.markDirty(`Changed ${property}.`);
    this.refreshSelectionUi();
  }

  buildOverride(metadata = {}) {
    return buildEditorOverride(this.game.world, this.baseSnapshot, {
      dirtyRevision: this.dirtyRevision,
      ...metadata
    });
  }

  buildAssetRegistry() {
    const registry = [];
    const seen = new Set();
    const add = (collection, entity, extra = {}) => {
      const kind = entity?.kind || entity?.type || (collection === 'enemies' ? 'enemy' : 'object');
      const variantKey = kind === 'npc'
        ? entity?.npcId || entity?.id || entity?.role || 'generic'
        : entity?.isBoss || entity?.unique
          ? entity?.id || entity?.bossId || kind
          : entity?.structureVariant || entity?.visualVariant || entity?.variantId || kind;
      const assetId = `${collection}:${kind}:${variantKey}`;
      if (seen.has(assetId)) return;
      seen.add(assetId);
      const visual = getVisualStatus(entity, collection);
      const noCollision = visual.definition?.collisionProfile !== 'none' && entity?.collision === false;
      const artFlags = [visual.code];
      if (noCollision) artFlags.push(VISUAL_STATUS.NO_COLLISION);
      if (!visual.productionValid && visual.code !== VISUAL_STATUS.WRONG_SCALE) artFlags.push(VISUAL_STATUS.PRODUCTION_INVALID);
      registry.push({
        id: assetId,
        name: extra.name || entity?.name || titleCase(kind),
        kind,
        collection,
        category: extra.category || inferCategory(kind, collection, entity),
        tags: [...new Set([kind, collection, entity?.factionId, entity?.race, entity?.role, entity?.poiId].filter(Boolean))],
        size: Math.round(Number(entity?.r || entity?.radius || 18) * Number(entity?.scale || 1)),
        collision: entity?.collision !== false,
        scripted: isScripted(entity),
        source: extra.source || 'Live world registry',
        modelId: visual.modelId,
        rendererId: visual.definition?.rendererId || null,
        materialSet: visual.definition?.materialSet || null,
        visualStatus: visual.code,
        productionValid: visual.productionValid,
        artFlags: [...new Set(artFlags)],
        template: cloneSerializable({ ...entity, id: undefined, x: 0, y: 0, dead: false, remove: false, depleted: false })
      });
    };
    // Curated editor-native definitions below own their category and defaults.
    // Do not let a placed/recovered instance shadow those canonical entries.
    for (const entity of this.game.world.objects || []) {
      if (!/^editor/.test(entity?.kind || '')) add('objects', entity);
    }
    for (const entity of this.game.world.enemies || []) {
      if (!/^editor/.test(entity?.kind || '')) add('enemies', entity);
    }

    const native = [
      ['editorPath', 'Path / Road Spline', 'Paths and Roads', { width: 48, points: [], material: 'dirt', navmeshInfluence: true }],
      ['editorWater', 'Water Volume', 'Water', { width: 160, height: 100, depth: 24, waterType: 'pond', fishingEnabled: false }],
      ['editorTrigger', 'Logic Trigger', 'Triggers', { width: 96, height: 96, triggerType: 'quest', oneTime: false, enabled: true }],
      ['editorSpawn', 'Player Spawn', 'Spawn Points', { r: 18, editorCritical: true }],
      ['editorLight', 'Point Light', 'Lights', { radius: 180, color: '#ffd78a', intensity: 1 }],
      ['editorAudio', 'Ambient Audio Emitter', 'Audio', { radius: 220, audioProfile: 'forest', volume: 0.7 }],
      ['editorWeather', 'Weather Zone', 'Weather', { width: 260, height: 180, weatherType: 'fog', intensity: 0.5 }],
      ['editorNavBlocker', 'Navigation Blocker', 'Navigation', { width: 64, height: 64, collision: true }]
    ];
    for (const [kind, name, category, template] of native) add('objects', { kind, name, ...template }, { name, category, source: 'Developer Mode' });
    return registry.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  placeAtPointer(event) {
    const asset = this.assetRegistry.find(entry => entry.id === this.selectedAssetId);
    if (!asset) {
      this.log('warning', 'placement', 'Choose an asset from the browser first.');
      return null;
    }
    if (asset.kind === 'editorPath') return this.addPathPoint();
    return this.placeAsset(asset, this.pointer.worldX, this.pointer.worldY, event);
  }

  placeAsset(asset, worldX, worldY, event = {}) {
    const entity = cloneSerializable(asset.template || {});
    if ((entity.unique || entity.npcId) && [...(this.game.world.objects || []), ...(this.game.world.enemies || [])].some(existing => existing?.npcId && existing.npcId === entity.npcId)) {
      if (!confirm(`${asset.name} is a unique authored character. Place a generic clone without its quest/dialogue identity?`)) return null;
      entity.editorCloneOf = entity.npcId || entity.id;
      entity.unique = false;
      delete entity.npcId;
      delete entity.dialogueId;
      delete entity.questId;
    }
    entity.id = generatePersistentEditorId(this.mapId, asset.kind, this.allIds());
    entity.kind = asset.kind;
    entity.name = asset.name;
    entity.x = this.snapValue(worldX);
    entity.y = this.snapValue(worldY + this.placementHeight);
    entity.rotation = this.randomRotation ? Math.floor(Math.random() * 360) : this.placementRotation;
    entity.scale = this.randomScale ? round(0.8 + Math.random() * 0.4, 2) : this.placementScale;
    entity.editorAdded = true;
    entity.editorLayer = entity.editorLayer || 'Default';
    if (asset.collection === 'enemies') {
      entity.dead = false;
      entity.remove = false;
      entity.hp = Math.max(1, Number(entity.maxHp || entity.hp || 30));
      entity.maxHp = entity.hp;
    }
    const entry = { collection: asset.collection, entity };
    const priorSelection = [...this.selection];
    const redo = () => {
      if (!this.game.world[entry.collection].includes(entity)) this.game.world[entry.collection].push(entity);
      this.setSelection([entry], false);
    };
    const undo = () => {
      this.game.world[entry.collection] = this.game.world[entry.collection].filter(item => item !== entity);
      this.setSelection(priorSelection, false);
    };
    redo();
    this.pushCommand({ label: `Place ${asset.name}`, undo, redo });
    this.setSelection([entry]);
    this.recentAssetIds = [asset.id, ...this.recentAssetIds.filter(id => id !== asset.id)].slice(0, 12);
    this.markDirty(`Placed ${asset.name}.`);
    if (!event.shiftKey && !this.placementPaint) this.mode = EDITOR_MODES.SELECT;
    this.refreshAllUi();
    return entry;
  }

  paintPlacementAt(worldX, worldY) {
    const asset = this.assetRegistry.find(entry => entry.id === this.selectedAssetId);
    if (!asset || asset.kind === 'editorPath') return;
    const count = Math.max(1, Math.round(this.brushDensity * 5));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * this.brushSize;
      this.placeAsset(asset, worldX + Math.cos(angle) * radius, worldY + Math.sin(angle) * radius, { shiftKey: true });
    }
    this.mode = EDITOR_MODES.PLACE;
  }

  addPathPoint() {
    if (!this.activePathDraft) {
      const asset = this.assetRegistry.find(entry => entry.id === this.selectedAssetId);
      const entity = cloneSerializable(asset.template);
      entity.id = generatePersistentEditorId(this.mapId, 'path', this.allIds());
      entity.kind = 'editorPath';
      entity.name = asset.name;
      entity.points = [];
      entity.editorAdded = true;
      this.game.world.objects.push(entity);
      this.activePathDraft = entity;
    }
    this.activePathDraft.points.push({ x: this.snapValue(this.pointer.worldX), y: this.snapValue(this.pointer.worldY) });
    this.activePathDraft.x = this.activePathDraft.points.reduce((sum, point) => sum + point.x, 0) / this.activePathDraft.points.length;
    this.activePathDraft.y = this.activePathDraft.points.reduce((sum, point) => sum + point.y, 0) / this.activePathDraft.points.length;
    if (this.activePathDraft.points.length === 1) {
      this.log('info', 'path', 'Path started. Click to add points; Enter finishes; Escape cancels.');
    }
    this.setSelection([{ collection: 'objects', entity: this.activePathDraft }]);
    this.markDirty('Path point added.');
  }

  finishPath() {
    const entity = this.activePathDraft;
    if (!entity) return false;
    if ((entity.points || []).length < 2) {
      this.game.world.objects = this.game.world.objects.filter(item => item !== entity);
      this.activePathDraft = null;
      return false;
    }
    const redo = () => { if (!this.game.world.objects.includes(entity)) this.game.world.objects.push(entity); };
    const undo = () => { this.game.world.objects = this.game.world.objects.filter(item => item !== entity); };
    this.pushCommand({ label: 'Create path', undo, redo });
    this.activePathDraft = null;
    this.mode = EDITOR_MODES.SELECT;
    this.log('info', 'path', 'Path completed.');
    return true;
  }

  paintTerrainAtPointer() {
    if (!this.drag?.changes) return;
    const centerX = Math.floor(this.pointer.worldX / TILE);
    const centerY = Math.floor(this.pointer.worldY / TILE);
    const radius = Math.max(1, Math.ceil(this.brushSize / TILE));
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        const tile = this.game.world.tiles?.[y]?.[x];
        if (!tile) continue;
        const distance = Math.hypot(x - centerX, y - centerY);
        if (distance > radius) continue;
        const key = `${x},${y}`;
        if (!this.drag.changes.has(key)) this.drag.changes.set(key, { x, y, before: cloneSerializable(tile) });
        if (this.brushMaterial === 'raise') tile.editorHeight = Number(tile.editorHeight || 0) + this.brushStrength;
        else if (this.brushMaterial === 'lower') tile.editorHeight = Number(tile.editorHeight || 0) - this.brushStrength;
        else if (this.brushMaterial === 'restore') Object.assign(tile, cloneSerializable(this.baseSnapshot.tiles?.[y]?.[x] || tile));
        else tile.biome = this.brushMaterial;
      }
    }
    this.markDirty('Terrain painted.', false);
  }

  finishTerrainCommand(changes) {
    if (!changes?.size) return;
    const records = [...changes.values()].map(record => ({ ...record, after: cloneSerializable(this.game.world.tiles?.[record.y]?.[record.x]) }));
    const apply = key => records.forEach(record => {
      if (this.game.world.tiles?.[record.y]?.[record.x]) this.game.world.tiles[record.y][record.x] = cloneSerializable(record[key]);
    });
    this.pushCommand({ label: `Paint ${records.length} terrain tile(s)`, undo: () => apply('before'), redo: () => apply('after') });
    this.markDirty(`Painted ${records.length} terrain tile(s).`);
  }

  pickAt(worldX, worldY) {
    const candidates = [];
    for (const collection of ['objects', 'enemies']) {
      for (const entity of this.game.world[collection] || []) {
        if (!entity || entity.visible === false || entity.enabled === false) continue;
        const distance = distanceToEntity(entity, worldX, worldY);
        if (distance <= entityPickRadius(entity)) candidates.push({ collection, entity, distance });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance || Number(b.entity.y || 0) - Number(a.entity.y || 0));
    if (!candidates.length) return null;
    const signature = candidates.map(entry => entry.entity.id).join('|');
    const now = performance.now();
    const repeated = now - this.lastPick.time < 650 && Math.hypot(worldX - this.lastPick.x, worldY - this.lastPick.y) < 12 && signature === this.lastPick.ids;
    const index = repeated ? (this.lastPick.index + 1) % candidates.length : 0;
    this.lastPick = { x: worldX, y: worldY, time: now, index, ids: signature };
    return candidates[index];
  }

  applyDragTransform(dx, dy, event) {
    const before = this.drag.before;
    const snap = event.ctrlKey || this.gridSnap;
    for (const item of before) {
      const entity = item.entry.entity;
      if (this.drag.type === TRANSFORM_TOOLS.ROTATE) {
        const delta = dx * 0.45;
        const angleDelta = snap ? Math.round(delta / this.angleSnap) * this.angleSnap : delta;
        entity.rotation = normalizeDegrees(item.rotation + angleDelta);
        if (item.points) {
          const radians = angleDelta * Math.PI / 180;
          const cos = Math.cos(radians);
          const sin = Math.sin(radians);
          entity.points = item.points.map(point => {
            const px = point.x - item.x;
            const py = point.y - item.y;
            return { ...point, x: item.x + px * cos - py * sin, y: item.y + px * sin + py * cos };
          });
        }
      } else if (this.drag.type === TRANSFORM_TOOLS.SCALE) {
        const scale = clamp(item.scale + dx / 180, 0.1, 8);
        entity.scale = snap ? Math.round(scale * 10) / 10 : round(scale, 3);
        if (item.points) {
          const ratio = entity.scale / Math.max(0.001, item.scale);
          entity.points = item.points.map(point => ({
            ...point,
            x: item.x + (point.x - item.x) * ratio,
            y: item.y + (point.y - item.y) * ratio
          }));
        }
      } else {
        entity.x = snap ? this.snapValue(item.x + dx) : item.x + dx;
        entity.y = snap ? this.snapValue(item.y + dy) : item.y + dy;
        if (item.points) {
          const actualDx = entity.x - item.x;
          const actualDy = entity.y - item.y;
          entity.points = item.points.map(point => ({ ...point, x: point.x + actualDx, y: point.y + actualDy }));
        }
      }
    }
    this.refreshInspector();
  }

  captureSelectionTransforms() {
    return this.selection.map(entry => ({
      entry,
      id: entry.entity.id,
      x: Number(entry.entity.x || 0),
      y: Number(entry.entity.y || 0),
      rotation: Number(entry.entity.rotation || 0),
      scale: Number(entry.entity.scale || 1),
      points: Array.isArray(entry.entity.points)
        ? entry.entity.points.map(point => ({ ...point }))
        : null
    }));
  }

  pushTransformCommand(label, before, after) {
    const apply = snapshot => snapshot.forEach(item => {
      const entity = item.entry.entity;
      entity.x = item.x;
      entity.y = item.y;
      entity.rotation = item.rotation;
      entity.scale = item.scale;
      if (item.points) entity.points = item.points.map(point => ({ ...point }));
    });
    this.pushCommand({ label, undo: () => apply(before), redo: () => apply(after) });
    this.markDirty(label);
  }

  pushCommand(command) {
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    this.redoStack = [];
    this.refreshStatus();
  }

  finishBoxSelection(additive) {
    if (!this.selectionBox) return;
    const minX = Math.min(this.selectionBox.startX, this.selectionBox.endX) + this.game.camera.x;
    const maxX = Math.max(this.selectionBox.startX, this.selectionBox.endX) + this.game.camera.x;
    const minY = Math.min(this.selectionBox.startY, this.selectionBox.endY) + this.game.camera.y;
    const maxY = Math.max(this.selectionBox.startY, this.selectionBox.endY) + this.game.camera.y;
    const entries = [];
    for (const collection of ['objects', 'enemies']) {
      for (const entity of this.game.world[collection] || []) {
        if (entity && entity.x >= minX && entity.x <= maxX && entity.y >= minY && entity.y <= maxY) entries.push({ collection, entity });
      }
    }
    this.setSelection(additive ? [...this.selection, ...entries] : entries);
  }

  updateFreeCamera(dt) {
    if (this.drag?.type === 'camera') return;
    const precision = this.keys.has('control') ? 0.22 : this.keys.has('shift') ? 2.5 : 1;
    const speed = this.editorCameraSpeed * precision * dt;
    const selected = this.selection.length > 0;
    if (!selected || this.keys.has('alt')) {
      if (this.keys.has('a') || this.keys.has('arrowleft')) this.game.camera.x -= speed;
      if (this.keys.has('d') || this.keys.has('arrowright')) this.game.camera.x += speed;
      if (this.keys.has('w') || this.keys.has('arrowup')) this.game.camera.y -= speed;
      if (this.keys.has('s') || this.keys.has('arrowdown')) this.game.camera.y += speed;
      if (this.keys.has('q')) this.game.camera.y -= speed;
      if (this.keys.has('e')) this.game.camera.y += speed;
    }
    this.clampCamera();
  }

  clampCamera() {
    const width = Math.max(this.game.canvas.width, Number(this.game.world.width || 0) * TILE);
    const height = Math.max(this.game.canvas.height, Number(this.game.world.height || 0) * TILE);
    this.game.camera.x = clamp(this.game.camera.x, 0, Math.max(0, width - this.game.canvas.width));
    this.game.camera.y = clamp(this.game.camera.y, 0, Math.max(0, height - this.game.canvas.height));
  }

  updatePointer(event) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.pointer.canvasX = (event.clientX - rect.left) * this.game.canvas.width / Math.max(1, rect.width);
    this.pointer.canvasY = (event.clientY - rect.top) * this.game.canvas.height / Math.max(1, rect.height);
    this.pointer.worldX = this.pointer.canvasX + this.game.camera.x;
    this.pointer.worldY = this.pointer.canvasY + this.game.camera.y;
  }

  drawEditorNativeObjects(ctx, camera) {
    for (const object of this.game.world.objects || []) {
      if (!object || object.visible === false) continue;
      if (object.kind === 'editorPath') drawPath(ctx, object, camera);
      else if (object.kind === 'editorWater') drawVolume(ctx, object, camera, 'rgba(45,145,210,0.28)', '#66d7ff');
      else if (object.kind === 'editorTrigger') drawVolume(ctx, object, camera, 'rgba(192,95,230,0.2)', '#d49aff');
      else if (object.kind === 'editorWeather') drawVolume(ctx, object, camera, 'rgba(130,155,180,0.18)', '#b4c8db');
      else if (object.kind === 'editorNavBlocker') drawVolume(ctx, object, camera, 'rgba(220,70,70,0.2)', '#ff7474');
      else if (object.kind === 'editorLight') drawCircleMarker(ctx, object, camera, '#ffd76d', 'LIGHT');
      else if (object.kind === 'editorAudio') drawCircleMarker(ctx, object, camera, '#67d5c3', 'AUDIO');
      else if (object.kind === 'editorSpawn') drawCircleMarker(ctx, object, camera, '#72e38d', 'SPAWN');
    }
  }

  drawSelection(ctx, camera) {
    for (let index = 0; index < this.selection.length; index++) {
      const { entity } = this.selection[index];
      const x = Number(entity.x || 0) - camera.x;
      const y = Number(entity.y || 0) - camera.y;
      const radius = entityPickRadius(entity);
      ctx.save();
      ctx.strokeStyle = index === 0 ? '#ffd66b' : '#70cfff';
      ctx.fillStyle = index === 0 ? 'rgba(255,214,107,0.1)' : 'rgba(112,207,255,0.08)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawSelectionBox(ctx) {
    if (!this.selectionBox) return;
    const box = this.selectionBox;
    const x = Math.min(box.startX, box.endX);
    const y = Math.min(box.startY, box.endY);
    const width = Math.abs(box.endX - box.startX);
    const height = Math.abs(box.endY - box.startY);
    ctx.fillStyle = 'rgba(88,166,255,0.12)';
    ctx.strokeStyle = '#72b7ff';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  }

  drawBrushPreview(ctx, camera) {
    if (![EDITOR_MODES.PLACE, EDITOR_MODES.TERRAIN].includes(this.mode)) return;
    const x = this.pointer.worldX - camera.x;
    const y = this.pointer.worldY - camera.y;
    ctx.strokeStyle = this.mode === EDITOR_MODES.TERRAIN ? '#7de094' : '#ffd66b';
    ctx.fillStyle = this.mode === EDITOR_MODES.TERRAIN ? 'rgba(80,210,120,0.08)' : 'rgba(255,214,107,0.08)';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, this.placementPaint || this.mode === EDITOR_MODES.TERRAIN ? this.brushSize : 18, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }

  drawPassabilityOverlay(ctx, camera) {
    const startX = Math.max(0, Math.floor(camera.x / TILE));
    const startY = Math.max(0, Math.floor(camera.y / TILE));
    const endX = Math.min(this.game.world.width, Math.ceil((camera.x + this.game.canvas.width) / TILE));
    const endY = Math.min(this.game.world.height, Math.ceil((camera.y + this.game.canvas.height) / TILE));
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const biome = this.game.world.tiles?.[y]?.[x]?.biome;
        const blocked = ['wall', 'water', 'void'].includes(biome);
        ctx.fillStyle = blocked ? 'rgba(255,62,62,0.17)' : this.showNavmesh ? 'rgba(70,230,120,0.055)' : 'transparent';
        ctx.fillRect(x * TILE - camera.x, y * TILE - camera.y, TILE, TILE);
      }
    }
  }

  drawChunkBounds(ctx, camera) {
    const size = TILE * 32;
    ctx.strokeStyle = 'rgba(255,210,80,0.35)';
    ctx.lineWidth = 1;
    for (let x = Math.floor(camera.x / size) * size; x <= camera.x + this.game.canvas.width; x += size) {
      ctx.beginPath(); ctx.moveTo(x - camera.x, 0); ctx.lineTo(x - camera.x, this.game.canvas.height); ctx.stroke();
    }
    for (let y = Math.floor(camera.y / size) * size; y <= camera.y + this.game.canvas.height; y += size) {
      ctx.beginPath(); ctx.moveTo(0, y - camera.y); ctx.lineTo(this.game.canvas.width, y - camera.y); ctx.stroke();
    }
  }

  drawDebugLabels(ctx, camera) {
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const collection of ['objects', 'enemies']) {
      for (const entity of this.game.world[collection] || []) {
        const x = entity.x - camera.x; const y = entity.y - camera.y;
        if (x < -40 || y < -40 || x > this.game.canvas.width + 40 || y > this.game.canvas.height + 40) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - 45, y - 35, 90, 12);
        ctx.fillStyle = collection === 'enemies' ? '#ff8585' : '#d9e5f2';
        ctx.fillText(entity.id || '(missing id)', x, y - 24);
      }
    }
  }

  createUi() {
    const root = document.createElement('div');
    root.id = 'developerEditor';
    root.className = 'developer-editor';
    root.innerHTML = `
      <div class="dev-topbar dev-panel">
        <div class="dev-brand"><b>RUNALIS WORLD EDITOR</b><span data-dev-map></span><i data-dev-dirty></i></div>
        <div class="dev-mode-buttons">
          <button data-dev-mode="select">1 Select</button><button data-dev-mode="place">2 Place</button><button data-dev-mode="terrain">3 Terrain</button><button data-dev-action="playtest">4 Play</button>
        </div>
        <div class="dev-toolbar">
          <button data-dev-tool="move">W Move</button><button data-dev-tool="rotate">E Rotate</button><button data-dev-tool="scale">R Scale</button>
          <button data-dev-action="undo">Undo</button><button data-dev-action="redo">Redo</button>
          <button data-dev-action="save">Save</button><button data-dev-action="saveAs">Save As</button>
          <button data-dev-action="validate">Validate</button><button data-dev-action="publish">Export Runtime</button><button data-dev-action="menu">Quit</button>
        </div>
      </div>
      <aside class="dev-left dev-panel" data-dev-panel="hierarchy">
        <header><b>WORLD HIERARCHY</b><button data-dev-action="toggleHierarchy">×</button></header>
        <input data-dev-hierarchy-search placeholder="Filter ID, name, kind…" />
        <div class="dev-mini-toolbar"><button data-dev-action="selectAllVisible">Select shown</button><button data-dev-action="group">Group</button><button data-dev-action="snapGround">Snap</button></div>
        <div class="dev-hierarchy-list" data-dev-hierarchy></div>
      </aside>
      <aside class="dev-right dev-panel" data-dev-panel="inspector">
        <header><b>INSPECTOR</b><button data-dev-action="toggleInspector">×</button></header>
        <div class="dev-inspector" data-dev-inspector></div>
      </aside>
      <section class="dev-bottom dev-panel" data-dev-panel="assets">
        <div class="dev-bottom-tabs"><button data-dev-bottom="assets">ASSETS</button><button data-dev-bottom="console">CONSOLE</button><button data-dev-bottom="validation">VALIDATION</button><button data-dev-action="toggleAssets">×</button></div>
        <div class="dev-bottom-content" data-dev-bottom-panel="assets">
          <div class="dev-asset-controls"><input data-dev-asset-search placeholder="Search display name, ID, tag, faction, role…" /><select data-dev-asset-category></select><select data-dev-terrain-material title="Terrain brush"><option value="grass">Grass</option><option value="path">Road</option><option value="dead">Dead earth</option><option value="ruin">Stone / ruin</option><option value="water">Waterbed</option><option value="wall">Unwalkable</option><option value="raise">Raise metadata</option><option value="lower">Lower metadata</option><option value="restore">Restore</option></select><label><input type="checkbox" data-dev-paint /> Paint</label><label>Brush <input type="range" min="16" max="240" value="64" data-dev-brush /></label></div>
          <div class="dev-asset-list" data-dev-assets></div>
        </div>
        <div class="dev-bottom-content" data-dev-bottom-panel="console" hidden><div class="dev-console" data-dev-console></div></div>
        <div class="dev-bottom-content" data-dev-bottom-panel="validation" hidden><div class="dev-validation" data-dev-validation></div></div>
      </section>
      <div class="dev-mode-badge" data-dev-status></div>
    `;
    document.body.appendChild(root);
    this.root = root;
    this.bindUiEvents();
  }

  bindUiEvents() {
    this.root.addEventListener('pointerdown', event => event.stopPropagation());
    this.root.addEventListener('click', event => {
      event.stopPropagation();
      const mode = event.target.closest('[data-dev-mode]')?.dataset.devMode;
      if (mode) return this.setMode(mode);
      const tool = event.target.closest('[data-dev-tool]')?.dataset.devTool;
      if (tool) return this.setTransformTool(tool);
      const entityButton = event.target.closest('[data-dev-entity]');
      if (entityButton) {
        const [collection, id] = entityButton.dataset.devEntity.split(':');
        const entity = (this.game.world[collection] || []).find(item => item?.id === id);
        if (entity) {
          event.shiftKey ? this.addToSelection({ collection, entity }) : this.setSelection([{ collection, entity }]);
          if (event.detail > 1) this.frameSelection();
        }
        return;
      }
      const assetButton = event.target.closest('[data-dev-asset]');
      if (assetButton) {
        this.selectedAssetId = assetButton.dataset.devAsset;
        this.mode = EDITOR_MODES.PLACE;
        this.refreshAllUi();
        return;
      }
      const favoriteButton = event.target.closest('[data-dev-favorite]');
      if (favoriteButton) {
        const id = favoriteButton.dataset.devFavorite;
        this.favoriteAssetIds.has(id) ? this.favoriteAssetIds.delete(id) : this.favoriteAssetIds.add(id);
        this.persistPreferences();
        this.refreshAssetBrowser();
        return;
      }
      const action = event.target.closest('[data-dev-action]')?.dataset.devAction;
      if (action) this.runUiAction(action);
      const bottom = event.target.closest('[data-dev-bottom]')?.dataset.devBottom;
      if (bottom) this.switchBottomTab(bottom);
    });

    this.root.addEventListener('input', event => {
      if (event.target.matches('[data-dev-asset-search]')) { this.assetSearch = event.target.value; this.refreshAssetBrowser(); }
      if (event.target.matches('[data-dev-hierarchy-search]')) { this.hierarchySearch = event.target.value; this.refreshHierarchy(); }
      if (event.target.matches('[data-dev-brush]')) { this.brushSize = Number(event.target.value); this.refreshStatus(); }
      if (event.target.matches('[data-dev-paint]')) this.placementPaint = event.target.checked;
    });
    this.root.addEventListener('change', event => {
      if (event.target.matches('[data-dev-asset-category]')) { this.assetCategory = event.target.value; this.refreshAssetBrowser(); }
      if (event.target.matches('[data-dev-prop]')) this.applyInspectorField(event.target);
      if (event.target.matches('[data-dev-raw]')) this.applyRawInspector(event.target);
      if (event.target.matches('[data-dev-terrain-material]')) this.brushMaterial = event.target.value;
    });
  }

  runUiAction(action) {
    const actions = {
      playtest: () => this.enterPlaytest(), undo: () => this.undo(), redo: () => this.redo(), save: () => this.save(false), saveAs: () => this.saveAs(),
      validate: () => this.validate(), publish: () => this.publish(false), menu: () => this.game.saveAndQuit(), toggleHierarchy: () => this.togglePanel('hierarchy'),
      toggleInspector: () => this.togglePanel('inspector'), toggleAssets: () => this.togglePanel('assets'), duplicate: () => this.duplicateSelection(), delete: () => this.deleteSelection(),
      disable: () => this.disableSelection(), frame: () => this.frameSelection(), focusDependencies: () => this.refreshInspector(), revert: () => this.revertToBase(), reload: () => this.reloadSaved(),
      exportPatch: () => this.exportPatch(), exportReport: () => this.exportChangeReport(), help: () => this.toggleHelp(true), selectAllVisible: () => this.selectAllFiltered(),
      group: () => this.groupSelection(), snapGround: () => this.snapSelectionToTerrain(), clearSelection: () => this.clearSelection(), createPrefab: () => this.createPrefab(),
      restoreBackup: () => this.restoreLatestBackup()
    };
    actions[action]?.();
  }

  refreshAllUi() {
    this.refreshStatus();
    this.refreshHierarchy();
    this.refreshInspector();
    this.refreshAssetBrowser();
    this.renderConsole();
    this.renderValidation();
  }

  refreshStatus() {
    if (!this.root) return;
    this.root.querySelector('[data-dev-map]').textContent = `${this.game.world.name} • ${this.mapId}`;
    this.root.querySelector('[data-dev-dirty]').textContent = this.dirty ? '● UNSAVED' : '✓ SAVED';
    this.root.querySelector('[data-dev-dirty]').classList.toggle('dirty', this.dirty);
    this.root.querySelector('[data-dev-status]').textContent = this.mode === EDITOR_MODES.PLAYTEST
      ? 'PLAYTEST • 4/F7 Return to Editor'
      : `${this.mode.toUpperCase()} • ${this.transformTool.toUpperCase()} • ${this.cameraMode} • ${this.simulationEnabled ? 'SIM ACTIVE' : 'SIM PAUSED'} • ${this.selection.length} selected`;
    this.root.querySelectorAll('[data-dev-mode]').forEach(button => button.classList.toggle('active', button.dataset.devMode === this.mode));
    this.root.querySelectorAll('[data-dev-tool]').forEach(button => button.classList.toggle('active', button.dataset.devTool === this.transformTool));
    const undo = this.root.querySelector('[data-dev-action="undo"]');
    const redo = this.root.querySelector('[data-dev-action="redo"]');
    if (undo) { undo.disabled = !this.undoStack.length; undo.title = this.undoStack.at(-1)?.label || 'Nothing to undo'; }
    if (redo) { redo.disabled = !this.redoStack.length; redo.title = this.redoStack.at(-1)?.label || 'Nothing to redo'; }
  }

  refreshSelectionUi() {
    this.refreshStatus();
    this.refreshHierarchy();
    this.refreshInspector();
  }

  refreshHierarchy() {
    const host = this.root?.querySelector('[data-dev-hierarchy]');
    if (!host) return;
    const query = this.hierarchySearch.trim().toLowerCase();
    const entries = [];
    for (const collection of ['objects', 'enemies']) {
      for (const entity of this.game.world[collection] || []) {
        const haystack = `${entity?.id} ${entity?.name} ${entity?.kind} ${entity?.editorLayer || ''}`.toLowerCase();
        if (query && !haystack.includes(query)) continue;
        entries.push({ collection, entity });
      }
    }
    entries.sort((a, b) => String(a.entity.editorLayer || 'Default').localeCompare(String(b.entity.editorLayer || 'Default')) || String(a.entity.name || a.entity.id).localeCompare(String(b.entity.name || b.entity.id)));
    const visible = entries.slice(0, 500);
    host.innerHTML = visible.map(entry => {
      const selected = this.selection.some(item => sameEntry(item, entry));
      const critical = this.isCritical(entry.entity);
      return `<button class="dev-hierarchy-row${selected ? ' selected' : ''}" data-dev-entity="${escapeHtml(entry.collection)}:${escapeHtml(entry.entity.id)}"><span>${critical ? '◆' : entry.collection === 'enemies' ? '⚔' : '◇'}</span><b>${escapeHtml(entry.entity.name || entry.entity.id)}</b><small>${escapeHtml(entry.entity.kind || entry.collection)} · ${escapeHtml(entry.entity.editorLayer || 'Default')}</small></button>`;
    }).join('') + (entries.length > visible.length ? `<p>${entries.length - visible.length} more hidden for performance. Refine the filter.</p>` : '');
  }

  refreshInspector() {
    const host = this.root?.querySelector('[data-dev-inspector]');
    if (!host) return;
    if (!this.selection.length) {
      const backupCount = listDeveloperBackups(this.mapId).length;
      host.innerHTML = `<div class="dev-empty"><b>No selection</b><p>Click an object, choose it in the hierarchy, or drag a selection box.</p><button data-dev-action="help">Controls</button><button data-dev-action="revert">Revert working map</button><button data-dev-action="reload">Reload saved draft</button><button data-dev-action="restoreBackup"${backupCount ? '' : ' disabled'}>Restore latest backup (${backupCount})</button><button data-dev-action="exportPatch">Export patch</button><button data-dev-action="exportReport">Change report</button></div>`;
      return;
    }
    const primary = this.selection[0];
    const entity = primary.entity;
    const dependencies = findEntityDependencies(this.game.world, entity.id);
    const visual = getVisualStatus(entity, primary.collection);
    const mixed = this.selection.length > 1;
    host.innerHTML = `
      <div class="dev-inspector-head"><b>${escapeHtml(mixed ? `${this.selection.length} objects` : entity.name || entity.id)}</b><span>${escapeHtml(primary.collection)} / ${escapeHtml(entity.kind || 'unknown')}</span></div>
      <div class="dev-art-status ${escapeHtml(visual.code)}"><b>Art: ${escapeHtml(titleCase(visual.code))}</b><span>${escapeHtml(visual.modelId || 'No model ID')} · ${escapeHtml(visual.definition?.materialSet || 'No material')}</span></div>
      ${field('Display name', 'name', entity.name || '')}${field('Internal ID', 'id', entity.id, true)}${field('Layer', 'editorLayer', entity.editorLayer || 'Default')}
      <div class="dev-field-grid">${numberField('X', 'x', entity.x)}${numberField('Y', 'y', entity.y)}${numberField('Rotation', 'rotation', entity.rotation || 0)}${numberField('Scale', 'scale', entity.scale || 1, 0.05)}</div>
      <div class="dev-check-grid">${checkField('Enabled', 'enabled', entity.enabled !== false)}${checkField('Visible', 'visible', entity.visible !== false)}${checkField('Collision', 'collision', entity.collision !== false)}${checkField('Interactable', 'interactable', entity.interactable !== false)}</div>
      <div class="dev-inspector-actions"><button data-dev-action="frame">Frame</button><button data-dev-action="duplicate">Duplicate</button><button data-dev-action="snapGround">Snap</button><button data-dev-action="createPrefab">Prefab</button><button data-dev-action="disable">Disable</button><button class="danger" data-dev-action="delete">Delete</button></div>
      <details><summary>Properties / Components</summary><textarea data-dev-raw>${escapeHtml(JSON.stringify(stripTransform(entity), null, 2))}</textarea></details>
      <details ${dependencies.length ? 'open' : ''}><summary>Dependencies (${dependencies.length})</summary><div class="dev-dependencies">${dependencies.length ? dependencies.map(dep => `<button data-dev-entity="${escapeHtml(dep.collection)}:${escapeHtml(dep.entityId)}"><b>${escapeHtml(dep.entityName)}</b><small>${escapeHtml(dep.path)}</small></button>`).join('') : '<p>No in-world references found.</p>'}</div></details>
      <details><summary>Editor metadata</summary><p>Chunk ${Math.floor(Number(entity.x || 0) / (TILE * 32))}, ${Math.floor(Number(entity.y || 0) / (TILE * 32))}</p><p>Critical: ${this.isCritical(entity) ? 'Yes' : 'No'}</p><p>Source: ${entity.editorAdded ? 'Editor addition' : 'Generated/authored base'}</p></details>
    `;
  }

  refreshAssetBrowser() {
    const host = this.root?.querySelector('[data-dev-assets]');
    const category = this.root?.querySelector('[data-dev-asset-category]');
    if (!host || !category) return;
    const categories = ['All', 'Favorites', 'Recently Used', ...ART_FILTERS, ...new Set(this.assetRegistry.map(asset => asset.category))];
    const current = this.assetCategory;
    category.innerHTML = categories.map(value => `<option${value === current ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
    const query = this.assetSearch.trim().toLowerCase();
    const assets = this.assetRegistry.filter(asset => {
      if (current === 'Favorites' && !this.favoriteAssetIds.has(asset.id)) return false;
      if (current === 'Recently Used' && !this.recentAssetIds.includes(asset.id)) return false;
      const artFilter = artFilterCode(current);
      if (artFilter && !asset.artFlags.includes(artFilter)) return false;
      if (!['All', 'Favorites', 'Recently Used', ...ART_FILTERS].includes(current) && asset.category !== current) return false;
      const haystack = `${asset.name} ${asset.id} ${asset.modelId || ''} ${asset.rendererId || ''} ${asset.materialSet || ''} ${asset.visualStatus || ''} ${asset.category} ${asset.tags.join(' ')} ${asset.source}`.toLowerCase();
      return !query || haystack.includes(query);
    }).sort((a, b) => {
      if (current === 'Recently Used') return this.recentAssetIds.indexOf(a.id) - this.recentAssetIds.indexOf(b.id);
      return a.name.localeCompare(b.name);
    });
    host.innerHTML = assets.slice(0, 300).map(asset => `
      <article class="dev-asset-card${asset.id === this.selectedAssetId ? ' selected' : ''}">
        <button class="dev-asset-main" data-dev-asset="${escapeHtml(asset.id)}"><span class="dev-asset-icon">${asset.collection === 'enemies' ? '⚔' : VEGETATION_PATTERN.test(asset.kind) ? '♣' : WATER_PATTERN.test(asset.kind) ? '≈' : '◇'}</span><b>${escapeHtml(asset.name)}</b><small>${escapeHtml(asset.category)} · ${escapeHtml(asset.kind)}</small><em>${escapeHtml(asset.modelId || 'Missing model')} · ${escapeHtml(asset.materialSet || 'No material')}</em><em class="dev-art-${escapeHtml(asset.visualStatus)}">${escapeHtml(titleCase(asset.visualStatus))} · ${asset.collision ? 'Collision' : 'No collision'} · ~${asset.size}px</em></button>
        <button class="dev-favorite" data-dev-favorite="${escapeHtml(asset.id)}">${this.favoriteAssetIds.has(asset.id) ? '★' : '☆'}</button>
      </article>`).join('') || '<p>No assets match this search.</p>';
  }

  renderConsole() {
    const host = this.root?.querySelector('[data-dev-console]');
    if (!host) return;
    host.innerHTML = this.consoleEntries.slice(0, 160).map(entry => `<button class="dev-log ${entry.severity}"><time>${escapeHtml(entry.time)}</time><b>${escapeHtml(entry.category)}</b><span>${escapeHtml(entry.message)}</span></button>`).join('') || '<p>No editor messages.</p>';
  }

  renderValidation() {
    const host = this.root?.querySelector('[data-dev-validation]');
    if (!host) return;
    const groups = [['error', this.validation.errors], ['warning', this.validation.warnings], ['info', this.validation.info]];
    host.innerHTML = groups.map(([severity, issues]) => `<section><h4>${severity.toUpperCase()} (${issues.length})</h4>${issues.map(issue => `<button class="dev-validation-row ${severity}"${issue.entityId ? ` data-dev-find-id="${escapeHtml(issue.entityId)}"` : ''}><b>${escapeHtml(issue.code)}</b><span>${escapeHtml(issue.message)}</span></button>`).join('') || '<p>None.</p>'}</section>`).join('');
    host.querySelectorAll('[data-dev-find-id]').forEach(button => button.onclick = () => {
      const id = button.dataset.devFindId;
      for (const collection of ['objects', 'enemies']) {
        const entity = (this.game.world[collection] || []).find(item => item?.id === id);
        if (entity) { this.setSelection([{ collection, entity }]); this.frameSelection(); break; }
      }
    });
  }

  applyInspectorField(input) {
    if (!this.selection.length) return;
    const property = input.dataset.devProp;
    const primary = this.selection[0].entity;
    const before = this.selection.map(entry => ({ entry, value: cloneSerializable(entry.entity[property]) }));
    let value = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
    if (property === 'id') return;
    const redo = () => this.selection.forEach(entry => { entry.entity[property] = cloneSerializable(value); });
    const undo = () => before.forEach(item => { item.entry.entity[property] = cloneSerializable(item.value); });
    redo();
    this.pushCommand({ label: `Set ${property}`, undo, redo });
    this.markDirty(`Changed ${property} on ${this.selection.length} object(s).`);
    if (primary !== this.selection[0].entity) this.refreshInspector();
    this.refreshHierarchy();
  }

  applyRawInspector(textarea) {
    if (this.selection.length !== 1) return;
    try {
      const value = JSON.parse(textarea.value);
      const entry = this.selection[0];
      const before = cloneSerializable(entry.entity);
      const immutable = { id: entry.entity.id, x: entry.entity.x, y: entry.entity.y, rotation: entry.entity.rotation, scale: entry.entity.scale };
      const redo = () => Object.assign(entry.entity, cloneSerializable(value), immutable);
      const undo = () => { Object.keys(entry.entity).forEach(key => delete entry.entity[key]); Object.assign(entry.entity, cloneSerializable(before)); };
      redo();
      this.pushCommand({ label: 'Edit raw properties', undo, redo });
      this.markDirty('Raw properties updated.');
      this.refreshSelectionUi();
    } catch (error) {
      this.log('error', 'inspector', `Invalid JSON: ${error.message}`);
    }
  }

  switchBottomTab(tab) {
    this.root.querySelectorAll('[data-dev-bottom-panel]').forEach(panel => panel.hidden = panel.dataset.devBottomPanel !== tab);
    this.root.querySelectorAll('[data-dev-bottom]').forEach(button => button.classList.toggle('active', button.dataset.devBottom === tab));
  }

  togglePanel(panel) {
    if (panel === 'hierarchy') this.showHierarchy = !this.showHierarchy;
    if (panel === 'inspector') this.showInspector = !this.showInspector;
    if (panel === 'assets') this.showAssetBrowser = !this.showAssetBrowser;
    const visible = panel === 'hierarchy' ? this.showHierarchy : panel === 'inspector' ? this.showInspector : this.showAssetBrowser;
    this.root.querySelector(`[data-dev-panel="${panel}"]`)?.classList.toggle('hidden', !visible);
  }

  toggleUi() {
    this.uiVisible = !this.uiVisible;
    document.body.classList.toggle('developer-ui-hidden', !this.uiVisible);
  }

  toggleHelp(show) {
    if (!this.helpOverlay) {
      const overlay = document.createElement('div');
      overlay.className = 'dev-help-overlay';
      overlay.innerHTML = `<div class="dev-help"><h2>Runalis World Editor</h2><div class="dev-help-grid"><section><h3>Modes</h3><p><kbd>1</kbd> Select · <kbd>2</kbd> Place · <kbd>3</kbd> Terrain · <kbd>4</kbd> Playtest</p><p><kbd>W</kbd> Move · <kbd>E</kbd> Rotate · <kbd>R</kbd> Scale · <kbd>Q</kbd> Universal</p></section><section><h3>Camera</h3><p>WASD/arrows move when nothing is selected. Middle/right drag pans. Wheel moves toward/away from focus. Ctrl+wheel changes speed. F frames selection. Home returns to spawn.</p></section><section><h3>Selection</h3><p>Click selects. Shift adds. Ctrl removes. Drag empty space for box select. Repeated click cycles overlaps. Double-click focuses.</p></section><section><h3>Editing</h3><p>Delete removes. Ctrl+D duplicates. Ctrl+Z undo. Ctrl+Y redo. Ctrl+S/F5 save. F6 reload. F8 collision. F9 passability. F10 IDs.</p></section></div><button data-close-help>Close</button></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-close-help]').onclick = () => overlay.classList.remove('active');
      overlay.onclick = event => { if (event.target === overlay) overlay.classList.remove('active'); };
      this.helpOverlay = overlay;
    }
    this.helpOverlay.classList.toggle('active', !!show);
  }

  selectAllFiltered() {
    const query = this.hierarchySearch.trim().toLowerCase();
    const entries = [];
    for (const collection of ['objects', 'enemies']) {
      for (const entity of this.game.world[collection] || []) {
        const text = `${entity.id} ${entity.name} ${entity.kind} ${entity.editorLayer || ''}`.toLowerCase();
        if (!query || text.includes(query)) entries.push({ collection, entity });
      }
    }
    this.setSelection(entries.slice(0, 2000));
  }

  groupSelection() {
    if (this.selection.length < 2) return;
    const group = prompt('Collection name:', 'New Collection');
    if (!group) return;
    this.changeSharedProperty('editorCollection', group);
  }

  snapSelectionToTerrain() {
    if (!this.selection.length) return;
    const before = this.captureSelectionTransforms();
    for (const { entity } of this.selection) {
      entity.x = this.snapValue(entity.x);
      entity.y = this.snapValue(entity.y);
    }
    const after = this.captureSelectionTransforms();
    this.pushTransformCommand('Snap selection to terrain grid', before, after);
    this.markDirty('Selection snapped to terrain grid.');
    this.refreshInspector();
  }

  createPrefab() {
    if (!this.selection.length) return;
    const name = prompt('Prefab name:', 'Runalis Prefab');
    if (!name) return;
    const center = selectionCenter(this.selection);
    const prefab = {
      version: 1,
      id: `prefab-${Date.now().toString(36)}`,
      name,
      createdAt: Date.now(),
      entities: this.selection.map(entry => ({ collection: entry.collection, data: { ...cloneSerializable(entry.entity), x: entry.entity.x - center.x, y: entry.entity.y - center.y } }))
    };
    exportEditorJson(prefab, `${slug(name)}.runalis-prefab.json`);
    this.log('info', 'prefab', `Created ${name} from ${this.selection.length} object(s).`);
  }

  restoreLatestBackup() {
    const backup = listDeveloperBackups(this.mapId)[0];
    if (!backup?.override) return false;
    if (!confirm(`Restore backup from ${backup.createdAtText}? Unsaved working changes will be discarded.`)) return false;
    this.restoreBaseWorld();
    applyEditorOverride(this.game.world, backup.override);
    this.clearSelection();
    this.undoStack = [];
    this.redoStack = [];
    this.markDirty(`Restored backup from ${backup.createdAtText}.`);
    this.refreshAllUi();
    return true;
  }

  isCritical(entity) {
    return !!(entity?.editorCritical || entity?.unique || entity?.isBoss || entity?.questId || entity?.startsQuest || entity?.dialogueId || entity?.npcId || entity?.poiId || CRITICAL_KINDS.has(entity?.kind));
  }

  allIds() {
    return new Set([...(this.game.world.objects || []), ...(this.game.world.enemies || [])].map(entity => entity?.id).filter(Boolean));
  }

  snapValue(value) {
    return this.gridSnap ? Math.round(Number(value || 0) / this.snapSize) * this.snapSize : round(Number(value || 0), 2);
  }

  markDirty(message, log = true) {
    this.dirty = true;
    this.dirtyRevision++;
    if (log && message) this.log('info', 'edit', message);
    this.refreshStatus();
  }

  log(severity, category, message) {
    this.consoleEntries.unshift({ severity, category, message, time: new Date().toLocaleTimeString() });
    this.consoleEntries = this.consoleEntries.slice(0, 300);
    this.renderConsole();
  }

  restoreBaseWorld() {
    this.game.world = cloneSerializable(this.baseWorld);
    this.game.player.x = this.game.world.spawn?.x ?? this.game.player.x;
    this.game.player.y = this.game.world.spawn?.y ?? this.game.player.y;
  }

  loadStartingOverride() {
    if (['fresh', 'default'].includes(this.options.worldState)) return;
    const recovery = loadDeveloperRecovery(this.mapId);
    const draft = loadDeveloperDraft(this.mapId);
    let override = draft;
    if (recovery?.override && (!draft || recovery.savedAt > Number(draft.metadata?.savedAt || 0))) {
      if (confirm(`An unsaved Developer Mode recovery file from ${recovery.savedAtText} was found. Restore it?`)) override = recovery.override;
    }
    if (override) {
      applyEditorOverride(this.game.world, override);
      this.dirty = override === recovery?.override;
      this.dirtyRevision = Number(override.metadata?.dirtyRevision || 0);
    }
  }

  persistPreferences() {
    try {
      localStorage.setItem('runalis.developerEditorLayout.v1', JSON.stringify({
        favoriteAssetIds: [...this.favoriteAssetIds], recentAssetIds: this.recentAssetIds, cameraMode: this.cameraMode,
        snapSize: this.snapSize, gridSnap: this.gridSnap, brushSize: this.brushSize
      }));
    } catch {}
  }

  restoreStoredPreferences() {
    try {
      const value = JSON.parse(localStorage.getItem('runalis.developerEditorLayout.v1') || '{}');
      this.favoriteAssetIds = new Set(value.favoriteAssetIds || []);
      this.recentAssetIds = value.recentAssetIds || [];
      this.cameraMode = value.cameraMode || this.cameraMode;
      this.snapSize = Number(value.snapSize || this.snapSize);
      this.gridSnap = !!value.gridSnap;
      this.brushSize = Number(value.brushSize || this.brushSize);
    } catch {}
  }

  injectStyles() {
    if (document.getElementById('runalisDeveloperEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'runalisDeveloperEditorStyles';
    style.textContent = DEVELOPER_EDITOR_CSS;
    document.head.appendChild(style);
  }
}

function drawPath(ctx, object, camera) {
  const points = object.points || [];
  if (points.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(27,18,12,0.75)'; ctx.lineWidth = Number(object.width || 48) + 6;
  strokePoints(ctx, points, camera);
  ctx.strokeStyle = object.material === 'stone' ? '#8e8b80' : '#9b764e'; ctx.lineWidth = Number(object.width || 48);
  strokePoints(ctx, points, camera);
  ctx.strokeStyle = 'rgba(255,215,120,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([8, 8]); strokePoints(ctx, points, camera);
  ctx.restore();
}

function strokePoints(ctx, points, camera) {
  ctx.beginPath(); ctx.moveTo(points[0].x - camera.x, points[0].y - camera.y);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x - camera.x, points[index].y - camera.y);
  ctx.stroke();
}

function drawVolume(ctx, object, camera, fill, stroke) {
  const width = Number(object.width || 96); const height = Number(object.height || 96);
  const x = Number(object.x || 0) - camera.x - width / 2; const y = Number(object.y || 0) - camera.y - height / 2;
  ctx.save(); ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.fillRect(x, y, width, height); ctx.strokeRect(x, y, width, height); ctx.restore();
}

function drawCircleMarker(ctx, object, camera, color, label) {
  const x = Number(object.x || 0) - camera.x; const y = Number(object.y || 0) - camera.y; const radius = Math.max(12, Number(object.radius || object.r || 24));
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = `${color}22`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = color; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 3); ctx.restore();
}

function distanceToEntity(entity, x, y) {
  if (entity.kind === 'editorPath' && entity.points?.length > 1) return distanceToPolyline(entity.points, x, y);
  return Math.hypot(Number(entity.x || 0) - x, Number(entity.y || 0) - y);
}

function distanceToPolyline(points, x, y) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) best = Math.min(best, distanceToSegment(x, y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
  return best;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax; const dy = by - ay; const length = dx * dx + dy * dy;
  const t = length ? clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function entityPickRadius(entity) {
  if (entity.kind === 'editorPath') return Math.max(12, Number(entity.width || 48) / 2);
  if (/editorWater|editorTrigger|editorWeather|editorNavBlocker/.test(entity.kind || '')) return Math.max(24, Math.min(Number(entity.width || 96), Number(entity.height || 96)) / 2);
  return clamp(Number(entity.r || entity.radius || entity.drawRadius || 22) * Number(entity.scale || 1), 12, 140);
}

function selectionCenter(selection) {
  if (!selection.length) return { x: 0, y: 0 };
  const sum = selection.reduce((value, entry) => ({ x: value.x + Number(entry.entity.x || 0), y: value.y + Number(entry.entity.y || 0) }), { x: 0, y: 0 });
  return { x: sum.x / selection.length, y: sum.y / selection.length };
}

function sameEntry(a, b) { return a?.collection === b?.collection && a?.entity === b?.entity; }
function uniqueEntries(entries) { return (entries || []).filter((entry, index, list) => entry?.entity && list.findIndex(other => sameEntry(entry, other)) === index); }
function isEditable(target) { return ['input', 'textarea', 'select'].includes(String(target?.tagName || '').toLowerCase()) || !!target?.isContentEditable; }
function isScripted(entity) { return !!(entity?.dialogueId || entity?.questId || entity?.startsQuest || entity?.interactable || entity?.talk || entity?.npcId || entity?.isBoss); }
function inferCategory(kind, collection, entity) {
  if (collection === 'enemies') return entity?.isBoss ? 'Enemies / Bosses' : 'Enemies';
  if (kind === 'npc') return entity?.merchant ? 'Merchants' : entity?.companionId ? 'Companions' : 'NPCs';
  if (VEGETATION_PATTERN.test(kind)) return 'Vegetation';
  if (WATER_PATTERN.test(kind)) return 'Water';
  if (/wall|gate|door|building|house|tower|castle|chapel|tent|bridge|pillar|ruin/i.test(kind)) return 'Architecture';
  if (/chest|cache|crate|barrel|container/i.test(kind)) return 'Containers';
  if (/shrine|camp|bed|craft|market|shop|stall/i.test(kind)) return 'Interactive Objects';
  if (/ore|herb|forage|crystal|bone|fruit/i.test(kind)) return 'Harvest Nodes';
  if (/trigger|volume|spawn/i.test(kind)) return 'Logic and Spawns';
  return 'Props and Decorations';
}
function artFilterCode(label) {
  return ({
    'Missing Model': VISUAL_STATUS.MISSING_MODEL,
    Placeholder: VISUAL_STATUS.PLACEHOLDER,
    'Broken Material': VISUAL_STATUS.BROKEN_MATERIAL,
    'Wrong Scale': VISUAL_STATUS.WRONG_SCALE,
    'No Collision': VISUAL_STATUS.NO_COLLISION,
    'Duplicate Asset': VISUAL_STATUS.DUPLICATE_ASSET,
    'Hidden Logic Object': VISUAL_STATUS.HIDDEN_LOGIC,
    'Production Invalid': VISUAL_STATUS.PRODUCTION_INVALID
  })[label] || null;
}
function stripTransform(entity) { const clone = cloneSerializable(entity); for (const key of ['id', 'x', 'y', 'rotation', 'scale']) delete clone[key]; return clone; }
function field(label, property, value, readonly = false) { return `<label class="dev-field"><span>${label}</span><input data-dev-prop="${property}" value="${escapeHtml(value)}"${readonly ? ' readonly' : ''}></label>`; }
function numberField(label, property, value, step = 1) { return `<label class="dev-field"><span>${label}</span><input type="number" step="${step}" data-dev-prop="${property}" value="${Number(value || 0)}"></label>`; }
function checkField(label, property, value) { return `<label class="dev-check"><input type="checkbox" data-dev-prop="${property}"${value ? ' checked' : ''}><span>${label}</span></label>`; }
function titleCase(value) { return String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }
function normalizeDegrees(value) { return ((Number(value || 0) % 360) + 360) % 360; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value || 0))); }
function round(value, digits = 2) { const factor = 10 ** digits; return Math.round(Number(value || 0) * factor) / factor; }
function slug(value) { return String(value || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

const DEVELOPER_EDITOR_CSS = `
.dev-art-status{display:grid;gap:2px;padding:6px;border:1px solid #394456;background:#0a0e15}.dev-art-status b{color:#9bd19b;font-size:10px}.dev-art-status span{color:#8e9aa8;font:9px Consolas,monospace}.dev-art-status.missing-model,.dev-art-status.placeholder,.dev-art-status.production-invalid{border-color:#c94f9f}.dev-art-status.missing-model b,.dev-art-status.placeholder b,.dev-art-status.production-invalid b{color:#ff86da}.dev-art-status.hidden-logic-object b{color:#75c9ff}.dev-art-wrong-scale,.dev-art-broken-material{color:#f1b868!important}.dev-art-missing-model,.dev-art-placeholder,.dev-art-production-invalid{color:#ff86da!important}
body.developer-mode .topbar,body.developer-mode .panel,body.developer-mode .interaction-hint{display:none!important}body.developer-mode canvas{cursor:crosshair}body.developer-playtest .developer-editor{display:none}.developer-editor{position:fixed;inset:0;z-index:1000;pointer-events:none;color:#e9edf2;font:12px Inter,Segoe UI,sans-serif;--dev-bg:rgba(8,11,17,.96);--dev-line:rgba(211,175,91,.3);--dev-gold:#e0b95c}.dev-panel{pointer-events:auto;background:linear-gradient(180deg,rgba(18,23,32,.98),var(--dev-bg));border:1px solid var(--dev-line);box-shadow:0 12px 36px rgba(0,0,0,.48)}.dev-topbar{position:absolute;left:0;right:0;top:0;height:48px;display:flex;align-items:center;gap:12px;padding:6px 10px}.dev-brand{display:grid;min-width:210px}.dev-brand b{color:var(--dev-gold);font-size:12px;letter-spacing:.08em}.dev-brand span,.dev-brand i{font-size:9px;color:#9da7b5;font-style:normal}.dev-brand i.dirty{color:#ff9e69}.dev-mode-buttons,.dev-toolbar,.dev-mini-toolbar,.dev-inspector-actions,.dev-bottom-tabs,.dev-asset-controls{display:flex;gap:5px;align-items:center}.developer-editor button{padding:5px 7px;border-radius:3px;font-size:10px;background:#111722;border-color:#30394a}.developer-editor button.active,.developer-editor button.selected{border-color:var(--dev-gold);color:#ffe0a0;background:#2b2416}.developer-editor button:disabled{opacity:.4}.dev-toolbar{margin-left:auto}.dev-left,.dev-right{position:absolute;top:54px;bottom:224px;width:270px;display:flex;flex-direction:column;overflow:hidden}.dev-left{left:6px}.dev-right{right:6px;width:294px}.dev-panel.hidden{display:none}.dev-panel header{display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid var(--dev-line);color:var(--dev-gold);letter-spacing:.07em}.dev-panel input,.dev-panel select,.dev-panel textarea{background:#070a10;color:#e8edf3;border:1px solid #2b3443;border-radius:3px;padding:6px;font-size:11px}.dev-left>input{margin:7px}.dev-mini-toolbar{padding:0 7px 7px}.dev-hierarchy-list{overflow:auto;padding:4px;display:grid;gap:2px}.dev-hierarchy-row{display:grid!important;grid-template-columns:18px 1fr;text-align:left;padding:5px!important}.dev-hierarchy-row span{grid-row:1/3;color:#75c9ff}.dev-hierarchy-row b{font-size:10px;overflow:hidden;text-overflow:ellipsis}.dev-hierarchy-row small{font-size:8px;color:#8490a0;overflow:hidden;text-overflow:ellipsis}.dev-hierarchy-row.selected{outline:1px solid var(--dev-gold)}.dev-inspector{overflow:auto;padding:8px;display:grid;gap:7px}.dev-inspector-head{display:grid;border-bottom:1px solid #2b3443;padding-bottom:7px}.dev-inspector-head b{color:#fff0bd;font-size:14px}.dev-inspector-head span{color:#8e9aa8}.dev-field{display:grid;grid-template-columns:90px 1fr;align-items:center;gap:6px}.dev-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.dev-field-grid .dev-field{grid-template-columns:1fr}.dev-field-grid .dev-field span{font-size:9px}.dev-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.dev-check{display:flex;align-items:center;gap:4px}.dev-check input{width:auto}.dev-inspector-actions{flex-wrap:wrap}.dev-inspector details{border-top:1px solid #2a3240;padding-top:7px}.dev-inspector summary{color:#d8b862;cursor:pointer}.dev-inspector textarea{width:100%;height:180px;white-space:pre;font:9px Consolas,monospace}.dev-dependencies{display:grid;gap:3px;margin-top:6px}.dev-dependencies button{display:grid;text-align:left}.dev-dependencies small{color:#8794a5}.dev-bottom{position:absolute;left:282px;right:306px;bottom:6px;height:212px;overflow:hidden}.dev-bottom-tabs{height:32px;padding:4px 7px;border-bottom:1px solid var(--dev-line)}.dev-bottom-tabs [data-dev-action=toggleAssets]{margin-left:auto}.dev-bottom-content{height:calc(100% - 32px);overflow:auto}.dev-asset-controls{height:38px;padding:5px}.dev-asset-controls input[type=text],.dev-asset-controls input:not([type]){flex:1;min-width:48px}.dev-asset-controls select{min-width:70px;max-width:145px}.dev-asset-controls label{white-space:nowrap}.dev-asset-controls input[type=range]{width:100px}.dev-asset-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:5px;padding:5px}.dev-asset-card{position:relative;display:flex;border:1px solid #283140;background:#0a0e15}.dev-asset-card.selected{border-color:var(--dev-gold)}.dev-asset-main{display:grid!important;grid-template-columns:28px 1fr;text-align:left;flex:1}.dev-asset-icon{grid-row:1/5;font-size:20px;color:#d7b55c;align-self:center}.dev-asset-main b{font-size:10px}.dev-asset-main small,.dev-asset-main em{font-size:8px;color:#8794a5;font-style:normal}.dev-favorite{position:absolute;right:1px;top:1px;border:0!important;background:transparent!important;color:#d8b75a!important}.dev-console,.dev-validation{padding:6px;display:grid;gap:3px}.dev-log,.dev-validation-row{display:grid!important;grid-template-columns:70px 80px 1fr;text-align:left}.dev-log time,.dev-log b,.dev-validation-row b{font-size:9px}.dev-log span,.dev-validation-row span{color:#b6c0cb}.dev-log.error,.dev-validation-row.error{border-color:#a54f4f}.dev-log.warning,.dev-validation-row.warning{border-color:#9e7c3d}.dev-validation{grid-template-columns:repeat(3,1fr)}.dev-validation section{min-width:0}.dev-validation h4{margin:3px;color:#d8b75a}.dev-validation-row{grid-template-columns:100px 1fr;width:100%;margin-bottom:3px}.dev-mode-badge{position:absolute;top:56px;left:50%;transform:translateX(-50%);background:rgba(4,7,11,.86);border:1px solid var(--dev-line);padding:5px 10px;color:#ffe0a0;font:10px monospace;pointer-events:none}.dev-help-overlay{position:fixed;inset:0;z-index:2000;display:none;place-items:center;background:rgba(0,0,0,.74)}.dev-help-overlay.active{display:grid}.dev-help{width:min(780px,90vw);max-height:85vh;overflow:auto;background:#0b1019;border:1px solid #b28d42;padding:22px;color:#e8edf2}.dev-help h2{color:#f0cf7a}.dev-help-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.dev-help section{border:1px solid #293343;padding:12px}.dev-help kbd{background:#1b2431;border:1px solid #46546a;padding:2px 5px}.developer-ui-hidden .developer-editor .dev-panel,.developer-ui-hidden .developer-editor .dev-mode-badge{display:none}@media(max-width:1100px){.dev-left{width:220px}.dev-right{width:240px}.dev-bottom{left:226px;right:246px}.dev-brand{display:none}.dev-toolbar button:nth-of-type(-n+3){display:none}.dev-asset-controls{gap:3px}.dev-asset-controls select{max-width:105px}.dev-asset-controls input[type=range]{width:58px}.dev-asset-controls label{font-size:9px}}@media(max-width:760px){.dev-left,.dev-right{width:190px}.dev-bottom{left:196px;right:196px}.dev-toolbar button:not([data-dev-action=save]):not([data-dev-action=menu]){display:none}.dev-help-grid{grid-template-columns:1fr}}
`;
