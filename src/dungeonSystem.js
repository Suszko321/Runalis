import {installVeyreign,updateVeyreign,leaveVeyreign} from './veyreignDungeon.js';
import {isVeyreign} from './veyreignRules.js';
import {installMalakarSanctum,dressMalakarApproach,isMalakarDungeon,requestMalakarEntry} from './malakarEncounter.js';
import {requestPartyEntry} from './partyEntrySystem.js';
import {canUseBossReturnPortal} from './bossReturnPortals.js';
import {installOrchardDungeon,beginOrchardDungeon,updateOrchardDungeon} from './ashenOrchardDungeon.js';
import {configureEncounterEnemy,dungeonEncounterProfile,ENCOUNTER_VERSION} from './encounterData.js';
import {initializeDungeonArena,resetFailedDungeonArena,bossRetryArrival} from './dungeonArenaSystem.js';
import {placeAtNavStone} from './navStoneNetwork.js';
import {clearEliteEncounters} from './eliteEncounterSystem.js';
import {dressWorld} from './worldAuthorship.js';
import {syncDungeonCompletion} from './dungeonCompletion.js';
import {migrateEchorynPosition} from './echorynLayout.js';
import {createCapitalHubWorld} from './hubSystem.js';
import {captureContinentalState,restoreContinentalState} from './continentPersistence.js';
import {CONTINENT_VERSION,migrateContinentalPosition} from './continentDefinition.js';
// dungeonSystem.js
// Runalis dungeon system.
// New standalone module.
//
// Purpose:
// - Removes dungeon generation/entry/exit logic from main.js.
// - Creates generated dungeon maps.
// - Handles dungeon entry, exit, surface return state, dungeon enemies,
//   dungeon resources, and dungeon save/restore helpers.
//
// Current design:
// - Uses the existing tile/biome system.
// - Uses "water" temporarily as impassable dungeon boundary if no wall biome exists.
// - Once data.js has a real "wall" biome, this file will automatically prefer it.
// - Dungeons are intentionally simple but structured: rooms, halls, resources, enemies,
//   exit, campfire, and boss/elite encounter.
//
// Expected game object:
// The functions assume they are called with the active RunalisGame instance,
// usually as `game` or `this` from main.js.
//
// Required game fields:
// - game.world
// - game.player
// - game.camera
// - game.canvas
// - game.log(message)
// - game.shake(amount, duration)
// - game.overworldState
//
// Required external functions passed in by main.js are intentionally avoided.
// This file owns dungeon construction and transition data.

import { createWorld, findNearestPassablePoint, findNearestActorPassablePoint, isActorPositionPassable } from './world.js';
import { TILE, WORLD_W, WORLD_H, BIOMES, ITEMS } from './data.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import {
  applyCoopAggroRange,
  applyCoopBossHealthScaling,
  getCoopEnemyScalingPlayerCount
} from './coopEnemyScaling.js';
import { createRegionWorld, createTravelRouteWorld } from './regionWorlds.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';
import { applyPublishedWorldOverride } from './developerWorldPersistence.js';

import {
  addStatusText,
  addSpiritText
} from './floatingText.js';

import {
  markPartyDungeonEnteredObjective,
  closeDialogue
} from './dialogueSystem.js';

const DUNGEON_BASELINE_PLAYABLE_TILES = 800;
const DUNGEON_MIN_PLAYABLE_MULTIPLIER = 6;

const DUNGEON_SCALE_PROFILES = {
  minor: {
    id: 'minor',
    width: 168,
    height: 128,
    minRooms: 16,
    maxRooms: 21,
    roomMinW: 13,
    roomMaxW: 26,
    roomMinH: 10,
    roomMaxH: 19,
    roomPadding: 4,
    loopHalls: 4,
    minPlayableTiles: DUNGEON_BASELINE_PLAYABLE_TILES * DUNGEON_MIN_PLAYABLE_MULTIPLIER,
    maxEncounterEnemies: 90
  },
  major: {
    id: 'major',
    width: 192,
    height: 144,
    minRooms: 20,
    maxRooms: 29,
    roomMinW: 15,
    roomMaxW: 31,
    roomMinH: 11,
    roomMaxH: 22,
    roomPadding: 5,
    loopHalls: 6,
    minPlayableTiles: Math.floor(DUNGEON_BASELINE_PLAYABLE_TILES * 8),
    maxEncounterEnemies: 132
  },
  story: {
    id: 'story',
    width: 216,
    height: 160,
    minRooms: 24,
    maxRooms: 36,
    roomMinW: 17,
    roomMaxW: 36,
    roomMinH: 12,
    roomMaxH: 25,
    roomPadding: 5,
    loopHalls: 8,
    minPlayableTiles: DUNGEON_BASELINE_PLAYABLE_TILES * 10,
    maxEncounterEnemies: 176
  }
};

const DUNGEON_DENSITY_VERSION = 'dungeon-density-v2';

const DUNGEON_PLAYER_COUNT_MULTIPLIERS = {
  1: 1,
  2: 1.45,
  3: 1.9,
  4: 2.35
};

const STORY_DUNGEON_KEYS = [
  'dawnspireroot',
  'demoncultlair',
  'shatteredchoir',
  'ascensionspire'
];

const MAJOR_DUNGEON_KEYS = [
  'castleveyr',
  'oldhollowdungeon',
  'thornroothollow',
  'ironmiredungeon',
  'redsealkeep',
  'confessionvaults',
  'lightbeneathnames'
];

const DUNGEON_CLASSIFICATIONS = {
  minor: {
    id: 'minor',
    name: 'Minor Dungeon',
    floors: 2,
    scale: 'minor'
  },
  major: {
    id: 'major',
    name: 'Major Dungeon',
    floors: 3,
    scale: 'major'
  },
  story: {
    id: 'story',
    name: 'Story Dungeon',
    floors: 4,
    scale: 'story'
  }
};

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function enterDungeon(game, entrance, options = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;

  if (!hostGame || !hostGame.world || !hostGame.player) return false;

  if (hostGame.world.mode === 'dungeon') {
    hostGame.log?.('You are already inside a dungeon.');
    return false;
  }

  const safeEntrance = entrance || {
    id: 'unknownDungeonEntrance',
    name: 'Old Blighted Dungeon',
    x: actor?.x || hostGame.player.x,
    y: actor?.y || hostGame.player.y
  };

  if (!options.partyEntryCommitted && !requestPartyEntry(hostGame, {
    key: `dungeon:${safeEntrance.id}`, title: safeEntrance.dungeonName || safeEntrance.name || 'the dungeon',
    initiator: actor, commit: () => enterDungeon(game, safeEntrance, {...options, partyEntryCommitted: true})
  })) return false;

  hostGame.overworldState = createOverworldReturnState(hostGame, safeEntrance);

  const dungeonOptions = {
    entranceId: safeEntrance.id || 'dungeon',
    dungeonId: safeEntrance.dungeonId || safeEntrance.poiId || safeEntrance.id || 'dungeon',
    poiId: safeEntrance.poiId || safeEntrance.dungeonId || null,
    name: safeEntrance.dungeonName || safeEntrance.name || options.name || 'Old Blighted Dungeon',
    seed: safeEntrance.seed || safeEntrance.id || options.seed || 'runalis-dungeon',
    depth: options.depth || safeEntrance.depth || 1,
    tier: options.tier || safeEntrance.tier || 1,
    theme: options.theme || safeEntrance.theme || inferDungeonTheme(safeEntrance),
    structureImportance: safeEntrance.structureImportance || options.structureImportance || null
  };
  hostGame.player.worldMemory ||= {};
  const ledger=hostGame.player.worldMemory.dungeonRuns ||= {};
  const prior=ledger[dungeonOptions.dungeonId];
  const now=Number(hostGame.player.worldMemory.elapsed)||0;
  const canReset=!isMalakarDungeon({dungeonId:dungeonOptions.dungeonId})&&prior?.cleared&&now>=Number(prior.resetAt||Infinity);
  const dungeonState = prior&&!canReset ? prior : createDungeonRunState({...dungeonOptions,seed:`${dungeonOptions.seed}-cycle-${prior?Number(prior.populationCycle||0)+1:0}`});
  if(!prior||canReset)dungeonState.populationCycle=prior?Number(prior.populationCycle||0)+1:0;
  dungeonOptions.seed=dungeonState.seed;
  ledger[dungeonOptions.dungeonId]=dungeonState;
  dungeonState.surfaceReturnPoint={...hostGame.overworldState.returnPoint,regionId:hostGame.overworldState.regionId};
  if(isVeyreign(dungeonOptions)&&!dungeonState.veyreign){dungeonState.cleared=false;dungeonState.finalBossDefeated=false;dungeonState.currentFloor=1;dungeonState.floorStates={};dungeonState.bossReturns={};dungeonState.arenas={};dungeonState.veyreign={version:1,firstVisit:!(hostGame.player.veyreignCompleted||hostGame.player.worldMemory.veyreignCompleted),seals:{},choices:{},seen:{}};}
  const retryFloor=!dungeonState.cleared?dungeonState.bossRetry?.floor:null;
  const dungeon = createDungeonWorld({
    ...dungeonOptions,
    dungeonState,
    floor: retryFloor||dungeonState.currentFloor||1,
    playerCount: getCoopEnemyScalingPlayerCount(hostGame.player)
  });

  hostGame.world = dungeon;
  const arrival=retryFloor===dungeon.floor?bossRetryArrival(dungeon):null;
  hostGame.world.effects.push({
    kind: 'enemyPulse',
    layer: 'front',
    x: arrival?.x??dungeon.spawn.x,
    y: arrival?.y??dungeon.spawn.y,
    color: dungeon.theme === 'demon' ? '#ef6f5e' : '#b68cff',
    radius: 58,
    ttl: 0.7,
    age: 0
  });

  hostGame.player.x = arrival?.x??dungeon.spawn.x;
  hostGame.player.y = arrival?.y??dungeon.spawn.y;
  hostGame.player.dirX = 0;
  hostGame.player.dirY = 1;
  hostGame.player.currentZone = dungeon.name;

  placePartyNearHost(hostGame);

  hostGame.camera.x = hostGame.player.x - hostGame.canvas.width / 2;
  hostGame.camera.y = hostGame.player.y - hostGame.canvas.height / 2;

  hostGame.log?.(`Entered ${dungeon.name}.`);
  if(arrival)hostGame.log?.('The cleared route remains open. You return to the boss threshold; enter when the party is ready.');
  beginOrchardDungeon(hostGame);
  markPartyDungeonEnteredObjective(actor || hostGame.player, dungeon.dungeonId || dungeon.poiId || dungeon.entranceId);

  addStatusText(actor || hostGame.player, 'Dungeon Entered', {
    color: getThemeColor(dungeon.theme),
    ttl: 1.2
  });

  return true;
}

export function rememberDungeonRun(game,{failed=false}={}){
 const host=game?.hostGame||game,w=host?.world;if(w?.mode!=='dungeon')return;
 if(w.dungeonState?.veyreign?.defeated)leaveVeyreign(w,host.player);
 if(failed)resetFailedDungeonArena(w);saveActiveDungeonFloorState(w);
 const state=w.dungeonState;if(state.cleared&&!state.resetAt)state.resetAt=(Number(host.player.worldMemory?.elapsed)||0)+1800;
 host.player.worldMemory ||= {};host.player.worldMemory.dungeonRuns ||= {};host.player.worldMemory.dungeonRuns[w.dungeonId]=state;clearEliteEncounters(w);
}

// Defeat and session boundaries must leave the instance before anyone can be
// restored to life. Repair missing legacy surface data rather than retaining a
// sealed boss arena as a respawn destination.
export function returnDungeonToNavStone(game){
 const host=getWorldTransitionGame(game),w=host?.world;
 if(w?.mode!=='dungeon'||host.onlineSession?.role==='guest')return false;
 if(host.dialogue)closeDialogue(host.dialogue,{immediate:true});
 rememberDungeonRun(host,{failed:true});
 if(!host.overworldState){
  const p=w.dungeonState?.surfaceReturnPoint;
  host.overworldState={continentId:'runalis',geographyVersion:CONTINENT_VERSION,mode:'overworld',regionId:p?.regionId||'hearthmereFrontier',entranceId:w.entranceId,returnPoint:p?{x:p.x,y:p.y}:null};
 }
 if(!exitDungeon(host,{force:true}))return false;
 if(!w.dungeonState?.surfaceReturnPoint){
  const stone=host.world.navStones?.find(s=>s.id===`nav-hearthmereFrontier-${w.dungeonId}`);
  if(stone)Object.assign(host.player,{x:stone.x,y:stone.y});
 }
 placeAtNavStone(host,host.player);
 return true;
}

// Called only on actual profile login/logout, never by save rehydration or
// online scene snapshots. Character quests, rewards and bloodlines persist.
export function resetDungeonSession(game){
 const host=getWorldTransitionGame(game);if(!host?.player||host.onlineSession?.role==='guest')return false;
 const returned=returnDungeonToNavStone(host);
 if(host.player.worldMemory)host.player.worldMemory.dungeonRuns={};
 if(returned){
  host.player.currentPosition={x:host.player.x,y:host.player.y};
  host.camera.x=host.player.x-(host.canvas?.width||0)/2;host.camera.y=host.player.y-(host.canvas?.height||0)/2;
  host.placeCoopPlayersNearHost?.();
  host.log?.('The dungeon expedition has ended. Its halls will be repopulated on your next entry.');
 }
 return returned;
}
export function exitDungeon(game, exit = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;

  if (!hostGame || !hostGame.player) return false;

  syncDungeonCompletion(hostGame.world);
  if (!exit.force && (exit.locked || isMalakarDungeon(hostGame.world)&&!canUseBossReturnPortal(hostGame.world,exit) || hostGame.world?.mode === 'dungeon' && !hostGame.world.dungeonState?.cleared && !canUseBossReturnPortal(hostGame.world,exit))) {
    hostGame.log?.('The exit is sealed.');

    addStatusText(actor || hostGame.player, 'Sealed', {
      color: '#b68cff'
    });

    return false;
  }

  if (!hostGame.overworldState) {
    hostGame.log?.('No surface return point found.');
    return false;
  }

  if(hostGame.world?.mode==='dungeon'){
    leaveVeyreign(hostGame.world,hostGame.player);
    if(exit.force)resetFailedDungeonArena(hostGame.world);
    saveActiveDungeonFloorState(hostGame.world);
    const state=hostGame.world.dungeonState;
    if(state.cleared&&!state.resetAt)state.resetAt=(Number(hostGame.player.worldMemory?.elapsed)||0)+1800;
    hostGame.player.worldMemory ||= {};hostGame.player.worldMemory.dungeonRuns ||= {};
    hostGame.player.worldMemory.dungeonRuns[hostGame.world.dungeonId]=state;
    clearEliteEncounters(hostGame.world);
  }
  const overworldState = hostGame.overworldState;
  hostGame.world = restoreOverworldFromState(overworldState);
  const requestedReturn = overworldState.returnPoint || hostGame.world.spawn || {x: 11 * TILE, y: 27 * TILE};
  hostGame.world.continentRuntime?.activate?.([requestedReturn],hostGame.player);
  restoreContinentalState(hostGame);
  const returnPoint = findNearestActorPassablePoint(hostGame.world,requestedReturn.x,requestedReturn.y,12);

  hostGame.player.x = returnPoint.x;
  hostGame.player.y = returnPoint.y;
  migrateEchorynPosition(hostGame.world,hostGame.player);
  hostGame.player.dirX = 0;
  hostGame.player.dirY = 1;
  hostGame.player.currentZone = hostGame.world.name;

  placePartyNearHost(hostGame);

  hostGame.camera = overworldState.camera || {
    x: hostGame.player.x - hostGame.canvas.width / 2,
    y: hostGame.player.y - hostGame.canvas.height / 2
  };

  hostGame.overworldState = null;

  hostGame.log?.('You return to the surface.');
  hostGame.shake?.(5, 0.14);

  addStatusText(actor || hostGame.player, 'Surface', {
    color: '#73d18a'
  });

  return true;
}

export function isInDungeon(world) {
  return world?.mode === 'dungeon';
}

export function getDungeonExitObject(world) {
  if (!world?.objects) return null;

  return world.objects.find(o => o.returnPortal) || world.objects.find(o => o.kind === 'dungeonExit') || null;
}

export function canUseDungeonExit(exit) {
  return !!exit && !exit.locked;
}

export function transitionDungeonFloor(game, stairs = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const world = hostGame?.world;

  if (!hostGame || !world || world.mode !== 'dungeon') return false;
  if(world.bossArena?.phase==='active'){hostGame.log?.('The arena is sealed until victory or defeat.');return false;}

  if(isMalakarDungeon(world)&&stairs.direction==='down'&&Number(stairs.targetFloor||world.floor+1)===world.totalFloors&&!stairs.malakarCommitted){
    return requestMalakarEntry(hostGame,stairs,()=>transitionDungeonFloor(hostGame,{...stairs,malakarCommitted:true}),actor);
  }

  if (stairs.locked) {
    hostGame.log?.(stairs.lockedMessage || 'The way is sealed.');
    addStatusText(actor || hostGame.player, 'Sealed', { color: '#b68cff' });
    return false;
  }

  const state = ensureDungeonRunState(world);
  if (!state) return false;

  saveActiveDungeonFloorState(world);

  const currentFloor = Math.max(1, Number(state.currentFloor || world.floor || 1));
  const targetFloor = clampInt(
    Number(stairs.targetFloor || currentFloor + (stairs.direction === 'up' ? -1 : 1)),
    1,
    Math.max(1, Number(state.totalFloors || 1))
  );

  if (targetFloor === currentFloor) return false;

  state.currentFloor = targetFloor;

  const nextWorld = createDungeonWorld({
    dungeonId: state.dungeonId || world.dungeonId,
    entranceId: state.entranceId || world.entranceId,
    poiId: state.poiId || world.poiId,
    name: state.name || world.name,
    seed: state.seed || world.seed,
    theme: state.theme || world.theme,
    depth: state.depth || world.depth || 1,
    tier: state.tier || world.tier || 1,
    dungeonState: state,
    floor: targetFloor,
    playerCount: getCoopEnemyScalingPlayerCount(hostGame.player)
  });

  hostGame.world = nextWorld;

  const arrival = findDungeonArrivalPoint(nextWorld, stairs.direction === 'up' ? 'fromDownstairs' : 'fromUpstairs');
  hostGame.player.x = arrival.x;
  hostGame.player.y = arrival.y;
  hostGame.player.dirX = 0;
  hostGame.player.dirY = 1;
  hostGame.player.currentZone = nextWorld.name;

  placePartyNearHost(hostGame);

  if (hostGame.camera && hostGame.canvas) {
    hostGame.camera.x = hostGame.player.x - hostGame.canvas.width / 2;
    hostGame.camera.y = hostGame.player.y - hostGame.canvas.height / 2;
  }

  hostGame.log?.(`${nextWorld.name}: Floor ${targetFloor} / ${state.totalFloors}.`);
  addStatusText(actor || hostGame.player, `Floor ${targetFloor}`, {
    color: getThemeColor(nextWorld.theme)
  });

  return true;
}

export function collectDungeonKey(game, keyObject = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const world = hostGame?.world;
  const state = ensureDungeonRunState(world);
  const keyId = keyObject.keyId || keyObject.id;

  if (!world || !['dungeon','sideZone'].includes(world.mode) || !state || !keyId || keyObject.collected) return false;

  state.collectedKeys = state.collectedKeys || {};
  state.collectedKeys[keyId] = true;
  keyObject.collected = true;
  keyObject.depleted = true;

  hostGame.log?.(`Key found: ${keyObject.name || 'Dungeon Key'}.`);
  addStatusText(actor || hostGame.player, 'Key Found', { color: '#ffcc66' });
  return true;
}

export function unlockDungeonDoor(game, door = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const world = hostGame?.world;
  const state = ensureDungeonRunState(world);
  const doorId = door.id;
  const keyId = door.requiredKeyId;

  if (!world || !['dungeon','sideZone'].includes(world.mode) || !state || !doorId) return false;

  if (!door.locked) {
    if (door.sideRoomTarget || Number.isFinite(Number(door.targetX)) && Number.isFinite(Number(door.targetY))) {
      return enterDungeonSideRoom(hostGame, door, { alreadyOpen: true });
    }

    hostGame.log?.(`${door.name || 'Door'} is already open.`);
    return true;
  }

  if (keyId && !state.collectedKeys?.[keyId]) {
    hostGame.log?.(`Requires ${door.keyName || 'a dungeon key'}.`);
    addStatusText(actor || hostGame.player, 'Key Required', { color: '#9facbf' });
    return false;
  }

  state.unlockedDoors = state.unlockedDoors || {};
  state.unlockedDoors[doorId] = true;
  door.locked = false;
  door.opened = true;
  door.name = door.openName || door.name || 'Opened Door';

  hostGame.log?.(`Unlocked ${door.name || 'door'}.`);
  addStatusText(actor || hostGame.player, 'Unlocked', { color: '#73d18a' });

  if (door.sideRoomTarget || Number.isFinite(Number(door.targetX)) && Number.isFinite(Number(door.targetY))) {
    return enterDungeonSideRoom(hostGame, door, { justUnlocked: true });
  }

  return true;
}

export function enterDungeonSideRoom(game, door = {}, options = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const world = hostGame?.world;
  const state = ensureDungeonRunState(world);

  if (!hostGame?.player || !world || !['dungeon','sideZone'].includes(world.mode) || !door) return false;

  const target = door.sideRoomTarget || {};
  const targetX = Number(target.x ?? door.targetX);
  const targetY = Number(target.y ?? door.targetY);

  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    hostGame.log?.(`${door.name || 'Door'} opens, but the passage goes nowhere.`);
    return false;
  }

  const arrival = findNearestPassablePoint(world, targetX, targetY, 10);
  hostGame.player.x = arrival.x;
  hostGame.player.y = arrival.y;
  hostGame.player.dirX = 0;
  hostGame.player.dirY = 1;

  placePartyNearHost(hostGame);

  if (hostGame.camera && hostGame.canvas) {
    hostGame.camera.x = hostGame.player.x - hostGame.canvas.width / 2;
    hostGame.camera.y = hostGame.player.y - hostGame.canvas.height / 2;
  }

  if (state) {
    state.openedSideRooms = state.openedSideRooms || {};
    state.discoveredRooms = state.discoveredRooms || {};
    state.openedSideRooms[door.id || door.sideRoomId || 'side-room'] = true;
    if (door.sideRoomId) state.discoveredRooms[door.sideRoomId] = true;
  }

  door.opened = true;
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'enemyPulse',
    layer: 'front',
    x: arrival.x,
    y: arrival.y,
    color: door.markerColor || getThemeColor(world.theme),
    radius: 54,
    ttl: 0.55,
    age: 0
  });

  const roomName = door.sideRoomName || getDungeonSideRoomDisplayName(door.sideRoomRole || door.sideRoomType);
  hostGame.log?.(`${options.justUnlocked ? 'Unlocked and entered' : options.alreadyOpen ? 'Entered' : 'Opened'} ${roomName}.`);
  addStatusText(actor || hostGame.player, roomName, {
    color: door.markerColor || getThemeColor(world.theme),
    ttl: 1.05
  });

  return true;
}

export function activateDungeonPuzzle(game, puzzle = {}) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const world = hostGame?.world;
  const state = ensureDungeonRunState(world);
  const puzzleId = puzzle.id;

  if (!hostGame?.player || !world || !['dungeon','sideZone'].includes(world.mode) || !state || !puzzleId) return false;

  state.solvedPuzzles = state.solvedPuzzles || {};
  state.puzzleProgress = state.puzzleProgress || {};

  if (puzzle.solved || state.solvedPuzzles[puzzleId]) {
    puzzle.solved = true;
    hostGame.log?.(`${puzzle.name || 'Rune puzzle'} is already solved.`);
    addStatusText(actor || hostGame.player, 'Solved', { color: '#73d18a' });
    return true;
  }

  const required = Math.max(1, Math.floor(Number(puzzle.requiredSteps || 3)));
  const progress = clampInt(Number(state.puzzleProgress[puzzleId] || puzzle.progress || 0) + 1, 0, required);
  state.puzzleProgress[puzzleId] = progress;
  puzzle.progress = progress;

  world.effects = world.effects || [];
  world.effects.push({
    kind: 'eliteMarker',
    layer: 'front',
    x: puzzle.x,
    y: puzzle.y,
    color: puzzle.markerColor || '#66f0ff',
    radius: 20 + progress * 6,
    ttl: 0.35,
    age: 0
  });

  if (progress < required) {
    hostGame.log?.(`${puzzle.clue || 'The runes answer in sequence.'} (${progress}/${required})`);
    addStatusText(actor || hostGame.player, `${progress}/${required}`, {
      color: puzzle.markerColor || '#66f0ff',
      ttl: 0.75
    });
    return true;
  }

  puzzle.solved = true;
  state.solvedPuzzles[puzzleId] = true;
  unlockDungeonObjects(world, object => object.unlockOnPuzzleId === puzzleId, 'Puzzle Reward');

  hostGame.log?.(`${puzzle.name || 'Rune puzzle'} solved. A reward unlocks.`);
  addStatusText(actor || hostGame.player, 'Puzzle Solved', {
    color: '#73d18a',
    ttl: 1.2
  });

  return true;
}

export function triggerDungeonEvent(game, eventObject = {}, release=false) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;
  const world = hostGame?.world;
  const state = ensureDungeonRunState(world);
  const eventId = eventObject.id;

  if (!hostGame?.player || !world || !['dungeon','sideZone'].includes(world.mode) || !state || !eventId) return false;

  state.triggeredEvents = state.triggeredEvents || {};

  if (eventObject.triggered || state.triggeredEvents[eventId]) {
    eventObject.triggered = true;
    hostGame.log?.(`${eventObject.name || 'Dungeon event'} has already been disturbed.`);
    return true;
  }

  state.triggeredEvents[eventId] = true;
  eventObject.triggered = true;
  eventObject.depleted = eventObject.singleUse !== false;

  if(!release){
    delete state.triggeredEvents[eventId];eventObject.triggered=false;eventObject.depleted=false;
    if(eventObject.pendingSpawnDelay==null){eventObject.pendingSpawnDelay=1.5;
      world.effects.push({kind:'bossTelegraph',x:eventObject.x,y:eventObject.y,radius:100,color:'#cead85',ttl:1.5,age:0});
      hostGame.log?.('An ambush stirs. Move away from the marked ground.');}
    return true;
  }
  const beforeIds=new Set((world.enemies||[]).map(e=>e.id));
  const playerCount = getCoopEnemyScalingPlayerCount(hostGame.player);
  const enemyKinds = getThemeEnemyKinds(world.theme, world);
  const spawnCount = getDungeonScaledEnemyCount(Number(eventObject.spawnCount || 3), playerCount, {
    cap: eventObject.eventType === 'trap' ? 8 : 10,
    min: eventObject.eventType === 'trap' ? 2 : 3
  });
  world.enemies = Array.isArray(world.enemies) ? world.enemies : [];

  for (let i = 0; i < spawnCount; i++) {
    const angle = (Math.PI * 2 * i) / Math.max(1, spawnCount);
    const point = findNearestPassablePoint(
      world,
      Number(eventObject.x || actor?.x || 0) + Math.cos(angle) * TILE * 2.4,
      Number(eventObject.y || actor?.y || 0) + Math.sin(angle) * TILE * 2.4,
      8
    );
    const kind = enemyKinds[(world.enemies.length + i) % enemyKinds.length] || 'basicBeast';
    world.enemies.push(makeDungeonEnemy(kind, getDungeonEnemyName(kind), point.x / TILE, point.y / TILE, world.enemies.length + i, {
      dungeonId: world.dungeonId,
      poiId: world.poiId,
      entranceId: world.entranceId,
      theme: world.theme,
      depth: world.depth,
      baseDepth: world.baseDepth,
      tier: world.tier,
      floor: world.floor,
      classification: world.dungeonClassification,
      playerCount,
      roomRole: eventObject.eventType || 'ambush',
      elite: i === 0 && spawnCount > 2,
      trapSpawn: eventObject.eventType === 'trap'
    }));
  }

  state.activeEvents ||= {};state.activeEvents[eventId]={memberIds:world.enemies.filter(e=>!beforeIds.has(e.id)).map(e=>e.id),completed:false};

  world.effects = world.effects || [];
  world.effects.push({
    kind: 'bossTelegraph',
    layer: 'front',
    x: eventObject.x,
    y: eventObject.y,
    targetX: eventObject.x,
    targetY: eventObject.y,
    radius: 82,
    color: eventObject.markerColor || '#ef6f6c',
    telegraphShape: 'circle',
    ttl: 0.6,
    age: 0
  });

  hostGame.log?.(eventObject.message || `${eventObject.name || 'Dungeon surprise'} erupts.`);
  addStatusText(actor || hostGame.player, eventObject.status || 'Ambush', {
    color: eventObject.markerColor || '#ef6f6c',
    ttl: 1
  });
  return true;
}

export function unlockDungeonMiniBossRewards(world, enemy = {}) {
  const state = ensureDungeonRunState(world);
  if (!world || !['dungeon','sideZone'].includes(world.mode) || !state) return false;

  const miniBossId = enemy.miniBossId || enemy.roomId || enemy.id;
  if (!miniBossId) return false;

  state.defeatedMiniBosses = state.defeatedMiniBosses || {};
  state.defeatedMiniBosses[miniBossId] = true;

  return unlockDungeonObjects(world, object => object.unlockOnMiniBossId === miniBossId, 'Mini Boss Reward');
}

export function handlePlayerDefeatedInDungeon(game) {
  const hostGame = getWorldTransitionGame(game);

  if (!hostGame || !hostGame.player) return false;

  const exited = exitDungeon(hostGame, {
    name: 'Emergency Return',
    locked: false,
    force: true
  });

  if (exited) {
    hostGame.player.hp = Math.max(1, Math.floor(hostGame.player.maxHp * 0.45));
    hostGame.player.stamina = Math.max(35, Math.floor(hostGame.player.maxStamina * 0.35));

    if (hostGame.player.spiritAwakened) {
      hostGame.player.spirit = Math.max(0, Math.floor(hostGame.player.maxSpirit * 0.25));
    }

    hostGame.respawnAtLastSafeLocation?.();

    addSpiritText(hostGame.player, 'Returned to Nav Stone', {
      ttl: 1.2,
      size: 14
    });
  }

  return exited;
}

function getWorldTransitionGame(game) {
  return game?.hostGame || game;
}

function placePartyNearHost(game) {
  const host = game?.player;
  if (!host) return;

  const allies = Array.isArray(host.coop?.players)
    ? host.coop.players.filter(ally => ally && ally.active !== false && ally.joined !== false)
    : [];
  const offsets = [
    { x: -TILE, y: 0 },
    { x: TILE, y: 0 },
    { x: 0, y: TILE }
  ];

  for (let i = 0; i < allies.length; i++) {
    const ally = allies[i];
    const offset = offsets[i] || { x: (i - 1) * TILE, y: TILE };

    const arrival = findNearestActorPassablePoint(game.world, host.x + offset.x, host.y + offset.y, ally.r || 12);
    ally.x = arrival.x;
    ally.y = arrival.y;
    ally.dirX = host.dirX;
    ally.dirY = host.dirY;
    ally.currentZone = host.currentZone;
  }
}

// -----------------------------------------------------------------------------
// SAVE / RESTORE HELPERS
// -----------------------------------------------------------------------------

export function createOverworldReturnState(game, entrance) {
  if (game.world?.continentId === 'runalis') {
    captureContinentalState(game);
    return {
      continentId: 'runalis', geographyVersion: CONTINENT_VERSION,
      mode: 'overworld', name: game.world.name, regionId: entrance.sourceRegionId || game.world.regionId,
      actId: game.world.actId || null, theme: game.world.theme || null,
      entranceId: entrance.id || null,
      camera: {x: Number(game.camera?.x || 0), y: Number(game.camera?.y || 0)},
      returnPoint: {x: entrance.x, y: entrance.y + TILE * 1.35}
    };
  }
  const world = {
    tiles: sanitizeForSave(game.world.tiles || []),
    objects: sanitizeForSave(game.world.objects || []),
    enemies: sanitizeForSave(game.world.enemies || []),
    drops: sanitizeForSave(game.world.drops || []),
    terrainFeatures: sanitizeForSave(game.world.terrainFeatures || null),
    mapMeta: sanitizeForSave(game.world.mapMeta || null),
    width: game.world.width || game.world.tiles?.[0]?.length || WORLD_W,
    height: game.world.height || game.world.tiles?.length || WORLD_H,
    tileSize: game.world.tileSize || TILE,
    effects: [],
    combatEffects: [],

    mode: game.world.mode || 'overworld',
    name: normalizePlayerFacingWorldName(game.world.name, ACT1_OVERWORLD_DISPLAY_NAME),
    regionId: game.world.regionId || game.player?.regions?.currentRegionId || 'hearthmereFrontier',
    actId: game.world.actId || null,
    routeId: game.world.routeId || null,
    theme: game.world.theme || null,
    safeZone: !!game.world.safeZone,

    camera: {
      x: Number(game.camera.x || 0),
      y: Number(game.camera.y || 0)
    },

    returnPoint: {
      x: entrance.x,
      y: entrance.y + TILE * 1.35
    }
  };
  return world;
}

export function restoreOverworldFromState(overworldState) {
  // Capital geometry is authored and rebuilt, just as it is for profile loads.
  // A serialized tile/object snapshot does not carry roof groups or terrace metadata.
  if (overworldState?.mode === 'capital') {
    const town = createCapitalHubWorld();
    town.drops = Array.isArray(overworldState.drops) ? overworldState.drops : [];
    return town;
  }
  if (overworldState?.continentId === 'runalis') {
    const surface = createWorld({spawnRegionId: overworldState.regionId});
    if (Number(overworldState.geographyVersion || 0) < CONTINENT_VERSION && overworldState.returnPoint) {
      overworldState.returnPoint = migrateContinentalPosition(overworldState.regionId, overworldState.returnPoint.x, overworldState.returnPoint.y);
      if (overworldState.camera) overworldState.camera = migrateContinentalPosition(overworldState.regionId, overworldState.camera.x, overworldState.camera.y);
    }
    // Resolve the stable entrance again if geography was revised. The actual
    // position used is retained within the same revision, including side entries.
    const entrance = overworldState.entranceId && (surface.continentRuntime?.findObject?.(overworldState.entranceId)
      || surface.continentLocations?.find?.(entry => entry.id === overworldState.entranceId)
      || surface.continentLocations?.get?.(overworldState.entranceId));
    if (entrance && (Number(overworldState.geographyVersion || 0) < CONTINENT_VERSION || !overworldState.returnPoint)) {
      overworldState.returnPoint = {x: entrance.x, y: entrance.y + TILE * 1.35};
    }
    overworldState.geographyVersion = CONTINENT_VERSION;
    return surface;
  }
  const fallbackWorld = overworldState?.mode === 'travelRoute' && overworldState?.routeId
    ? createTravelRouteWorld(overworldState.routeId)
    : overworldState?.regionId && overworldState.regionId !== 'hearthmereFrontier'
      ? createRegionWorld(overworldState.regionId)
      : createWorld();
  if (fallbackWorld.continentId === 'runalis') {
    if (Number(overworldState?.geographyVersion || 0) < CONTINENT_VERSION && overworldState?.returnPoint) {
      overworldState.returnPoint = migrateContinentalPosition(overworldState.regionId, overworldState.returnPoint.x, overworldState.returnPoint.y);
      if (overworldState.camera) overworldState.camera = migrateContinentalPosition(overworldState.regionId, overworldState.camera.x, overworldState.camera.y);
      overworldState.geographyVersion = CONTINENT_VERSION;
      overworldState.continentId = 'runalis';
    }
    return fallbackWorld;
  }

  // Static environmental runtime metadata (tree buckets, authored sites, terraces)
  // must accompany the saved gameplay snapshot on a surface return.
  const currentLayout = !fallbackWorld.terrainFeatures?.echorynRevision || overworldState?.terrainFeatures?.echorynRevision === fallbackWorld.terrainFeatures.echorynRevision;
  if (!currentLayout) return {...fallbackWorld,drops:overworldState?.drops||[]};
  return {
    ...fallbackWorld,
    mode: overworldState?.mode || 'overworld',
    name: normalizePlayerFacingWorldName(overworldState?.name, ACT1_OVERWORLD_DISPLAY_NAME),
    regionId: overworldState?.regionId || fallbackWorld.regionId || 'hearthmereFrontier',
    actId: overworldState?.actId || fallbackWorld.actId || null,
    routeId: overworldState?.routeId || fallbackWorld.routeId || null,
    theme: overworldState?.theme || fallbackWorld.theme || null,
    safeZone: overworldState?.safeZone ?? fallbackWorld.safeZone ?? false,
    width: overworldState?.width || fallbackWorld.width || fallbackWorld.tiles?.[0]?.length || WORLD_W,
    height: overworldState?.height || fallbackWorld.height || fallbackWorld.tiles?.length || WORLD_H,
    tileSize: overworldState?.tileSize || fallbackWorld.tileSize || TILE,
    terrainFeatures: overworldState?.terrainFeatures || fallbackWorld.terrainFeatures || null,
    mapMeta: overworldState?.mapMeta || fallbackWorld.mapMeta || null,
    tiles: Array.isArray(overworldState?.tiles) && overworldState.tiles.length
      ? overworldState.tiles
      : fallbackWorld.tiles,
    objects: Array.isArray(overworldState?.objects)
      ? overworldState.objects
      : fallbackWorld.objects || [],
    enemies: Array.isArray(overworldState?.enemies)
      ? overworldState.enemies
      : fallbackWorld.enemies || [],
    drops: Array.isArray(overworldState?.drops)
      ? overworldState.drops
      : [],
    effects: [],
    combatEffects: []
  };
}

export function sanitizeDungeonSaveState(world) {
  if (!world) return null;

  return {
    mode: world.mode || 'dungeon',
    name: world.name || 'Dungeon',
    theme: world.theme || 'grave',
    depth: world.depth || 1,
    tier: world.tier || 1,
    width: world.tiles?.[0]?.length || world.width || WORLD_W,
    height: world.tiles?.length || world.height || WORLD_H,
    tileSize: world.tileSize || TILE,
    seed: world.seed || null,
    floorSeed:world.floorSeed||null,
    bossRoomCenter:world.bossRoomCenter||null,
    dungeonId: world.dungeonId || null,
    entranceId: world.entranceId || null,
    poiId: world.poiId || null,
    floor: world.floor || 1,
    totalFloors: world.totalFloors || world.dungeonState?.totalFloors || 1,
    dungeonClassification: world.dungeonClassification || world.dungeonState?.classification || 'minor',
    dungeonState: sanitizeForSave(world.dungeonState || null),
    tiles: sanitizeForSave(world.tiles || []),
    rooms: sanitizeForSave(world.rooms || []),
    halls: sanitizeForSave(world.halls || []),
    objects: sanitizeForSave(world.objects || []),
    enemies: sanitizeForSave(world.enemies || []),
    drops: sanitizeForSave(world.drops || []),
    spawn: sanitizeForSave(world.spawn || null),
    exit: sanitizeForSave(world.exit || null)
  };
}

export function restoreDungeonFromSaveState(saveState) {
  if (!saveState) return null;

  const world = {
    mode: 'dungeon',
    name: saveState.name || 'Dungeon',
    theme: saveState.theme || 'grave',
    depth: saveState.depth || 1,
    tier: saveState.tier || 1,
    width: saveState.width || saveState.tiles?.[0]?.length || WORLD_W,
    height: saveState.height || saveState.tiles?.length || WORLD_H,
    tileSize: saveState.tileSize || TILE,
    seed: saveState.seed || null,
    floorSeed:saveState.floorSeed||null,
    bossRoomCenter:saveState.bossRoomCenter||null,
    dungeonId: saveState.dungeonId || null,
    entranceId: saveState.entranceId || null,
    poiId: saveState.poiId || null,
    floor: saveState.floor || saveState.dungeonState?.currentFloor || 1,
    totalFloors: saveState.totalFloors || saveState.dungeonState?.totalFloors || 1,
    dungeonClassification: saveState.dungeonClassification || saveState.dungeonState?.classification || 'minor',
    dungeonState: saveState.dungeonState || null,
    tiles: Array.isArray(saveState.tiles) ? saveState.tiles : [],
    rooms: Array.isArray(saveState.rooms) ? saveState.rooms : [],
    halls: Array.isArray(saveState.halls) ? saveState.halls : [],
    objects: Array.isArray(saveState.objects) ? saveState.objects : [],
    enemies: Array.isArray(saveState.enemies) ? saveState.enemies : [],
    drops: Array.isArray(saveState.drops) ? saveState.drops : [],
    spawn: saveState.spawn || null,
    exit: saveState.exit || null,
    effects: [],
    combatEffects: []
  };
  const encounterProfile=dungeonEncounterProfile(world);
  for(const e of world.enemies)configureEncounterEnemy(e,encounterProfile,`${world.floorSeed||world.seed}:${e.id}`,{dungeon:true,confined:!!e.corridorPatrol});
  // Published layouts and old saves use the same geographic rules.
  for(const e of world.enemies){if(!isActorPositionPassable(world,e.x,e.y,e.radius||12)){const p=findNearestActorPassablePoint(world,e.x,e.y,e.radius||12);e.x=p.x;e.y=p.y;}
   if(e.boss){e.boss.pendingSpecial=null;e.boss.recoveryUntil=0;e.boss.specialTimer=Math.max(2,e.boss.specialTimer||0);}e.bossTell=e.telegraph=null;e.eliteHealing=e.eliteGuardActive=false;e.eliteAttackPauseTimer=0;}
  for(const o of world.objects)if(o.pendingSpawnDelay!=null){o.pendingSpawnDelay=1.5;world.effects.push({kind:'bossTelegraph',x:o.x,y:o.y,radius:80,ttl:1.5,color:'#bd91d4'});}
  installMalakarSanctum(world);
  dressMalakarApproach(world);
  installOrchardDungeon(world);
  installVeyreign(world);
  initializeDungeonArena(world);
  syncDungeonCompletion(world);
  return world;
}

// -----------------------------------------------------------------------------
// DUNGEON GENERATION
// -----------------------------------------------------------------------------

export function getDungeonClassification(config = {}) {
  const scaleProfile = getDungeonScaleProfile(config);

  if (scaleProfile.id === 'story') return DUNGEON_CLASSIFICATIONS.story;
  if (scaleProfile.id === 'major') return DUNGEON_CLASSIFICATIONS.major;
  return DUNGEON_CLASSIFICATIONS.minor;
}

function createDungeonRunState(options = {}) {
  const classification = DUNGEON_CLASSIFICATIONS[options.classification] || getDungeonClassification(options);
  const dungeonId = options.dungeonId || options.poiId || options.entranceId || slugify(options.name || 'dungeon');

  return {
    id: `${dungeonId}-${Date.now()}`,
    dungeonId,
    entranceId: options.entranceId || dungeonId,
    poiId: options.poiId || dungeonId,
    name: options.name || getDungeonName(options.theme || 'grave', options.depth || 1),
    seed: String(options.seed || dungeonId || 'runalis-dungeon'),
    theme: options.theme || 'grave',
    depth: Math.max(1, Math.floor(options.depth || 1)),
    tier: Math.max(1, Math.floor(options.tier || options.depth || 1)),
    classification: classification.id,
    classificationName: classification.name,
    totalFloors: classification.floors,
    currentFloor: 1,
    floorStates: {},
    collectedKeys: {},
    unlockedDoors: {},
    openedSideRooms: {},
    discoveredRooms: {},
    solvedPuzzles: {},
    puzzleProgress: {},
    triggeredEvents: {},
    defeatedMiniBosses: {},
    bossIntros: {},
    openedChests: {},
    cleared: false
  };
}

function ensureDungeonRunState(world) {
  if (!world || !['dungeon','sideZone'].includes(world.mode)) return null;

  world.dungeonState = world.dungeonState && typeof world.dungeonState === 'object'
    ? world.dungeonState
    : createDungeonRunState({
      dungeonId: world.dungeonId,
      entranceId: world.entranceId,
      poiId: world.poiId,
      name: world.name,
      seed: world.seed,
      theme: world.theme,
      depth: world.baseDepth || world.depth || 1,
      tier: world.tier || 1,
      classification: world.dungeonClassification
    });

  const classification = getDungeonClassification(world.dungeonState);
  world.dungeonState.classification = world.dungeonState.classification || classification.id;
  world.dungeonState.totalFloors = Math.max(1, Number(world.dungeonState.totalFloors || classification.floors));
  world.dungeonState.currentFloor = clampInt(world.dungeonState.currentFloor || world.floor || 1, 1, world.dungeonState.totalFloors);
  world.dungeonState.floorStates = world.dungeonState.floorStates || {};
  world.dungeonState.collectedKeys = world.dungeonState.collectedKeys || {};
  world.dungeonState.unlockedDoors = world.dungeonState.unlockedDoors || {};
  world.dungeonState.openedSideRooms = world.dungeonState.openedSideRooms || {};
  world.dungeonState.discoveredRooms = world.dungeonState.discoveredRooms || {};
  world.dungeonState.solvedPuzzles = world.dungeonState.solvedPuzzles || {};
  world.dungeonState.puzzleProgress = world.dungeonState.puzzleProgress || {};
  world.dungeonState.triggeredEvents = world.dungeonState.triggeredEvents || {};
  world.dungeonState.defeatedMiniBosses = world.dungeonState.defeatedMiniBosses || {};
  world.dungeonState.bossIntros = world.dungeonState.bossIntros || {};
  world.dungeonState.openedChests = world.dungeonState.openedChests || {};

  return world.dungeonState;
}

function saveActiveDungeonFloorState(world) {
  const state = ensureDungeonRunState(world);
  if (!state) return;

  const floor = clampInt(world.floor || state.currentFloor || 1, 1, state.totalFloors || 1);
  state.floorStates = state.floorStates || {};
  const previousFloorState = state.floorStates[floor] || state.floorStates[String(floor)] || {};
  state.floorStates[floor] = {
    ...previousFloorState,
    objects: sanitizeForSave(world.objects || []),
    enemies: sanitizeForSave((world.enemies || []).filter(enemy => {
      return enemy && !enemy.remove && !enemy.dead && enemy.alive !== false && Number(enemy.hp || 0) > 0;
    })),
    drops: sanitizeForSave(world.drops || []),
    mapState: sanitizeForSave(previousFloorState.mapState || null)
  };
}

function findDungeonArrivalPoint(world, arrivalRole = 'fromUpstairs') {
  const target = (world.objects || []).find(object => {
    if (object?.kind !== 'dungeonStairs') return false;
    return arrivalRole === 'fromUpstairs'
      ? object.direction === 'up'
      : object.direction === 'down';
  });

  if (target) {
    return {
      x: target.x + TILE * 1.35,
      y: target.y + TILE * 0.65
    };
  }

  return world.spawn || { x: 12 * TILE, y: 12 * TILE };
}

export function createDungeonWorld(options = {}) {
  const theme = options.theme || 'grave';
  const depth = Math.max(1, Math.floor(options.depth || 1));
  const tier = Math.max(1, Math.floor(options.tier || depth || 1));
  const name = options.name || getDungeonName(theme, depth);
  const seed = String(options.seed || `${name}-${Date.now()}`);
  const dungeonId = options.dungeonId || options.poiId || options.entranceId || slugify(name);
  const classification = getDungeonClassification({
    dungeonId,
    entranceId: options.entranceId || dungeonId,
    poiId: options.poiId || dungeonId,
    name,
    theme,
    depth,
    tier,
    structureImportance: options.structureImportance
  });
  const dungeonState = options.dungeonState || createDungeonRunState({
    dungeonId,
    entranceId: options.entranceId || dungeonId,
    poiId: options.poiId || dungeonId,
    name,
    seed,
    theme,
    depth,
    tier,
    structureImportance: options.structureImportance
  });
  if(dungeonId==='castleVeyr')dungeonState.totalFloors=5;
  const totalFloors = Math.max(1, Number(dungeonState.totalFloors || classification.floors || 1));
  const floor = clampInt(options.floor || dungeonState.currentFloor || 1, 1, totalFloors);
  dungeonState.currentFloor = floor;
  dungeonState.totalFloors = totalFloors;
  dungeonState.classification = dungeonState.classification || classification.id;
  const scaleProfile = getDungeonScaleProfile({
    dungeonId,
    entranceId: options.entranceId || dungeonId,
    poiId: options.poiId || dungeonId,
    name,
    theme,
    depth,
    tier,
    classification: dungeonState.classification,
    structureImportance: options.structureImportance
  });
  const floorSeed = `${seed}-floor-${floor}`;

  const layout = createDungeonLayout({
    dungeonId,
    entranceId: options.entranceId || dungeonId,
    poiId: options.poiId || dungeonId,
    seed: floorSeed,
    baseSeed: seed,
    theme,
    depth: depth + Math.max(0, floor - 1),
    baseDepth: depth,
    tier,
    floor,
    totalFloors,
    isFinalFloor: floor >= totalFloors,
    dungeonState,
    classification: dungeonState.classification,
    scaleProfile,
    playerCount: options.playerCount || dungeonState.coopPlayerCount || 1
  });
  const savedFloor = dungeonState.floorStates?.[floor] || null;
  const objects = savedFloor?.objects || layout.objects;
  const enemies = savedFloor?.enemies || layout.enemies;
  const drops = savedFloor?.drops || [];

  const world = {
    mode: 'dungeon',
    name,
    theme,
    depth: depth + Math.max(0, floor - 1),
    baseDepth: depth,
    tier,
    seed,
    floorSeed,
    floor,
    totalFloors,
    width: layout.width,
    height: layout.height,
    tileSize: TILE,
    dungeonId,
    entranceId: options.entranceId || dungeonId,
    poiId: options.poiId || dungeonId,
    dungeonClassification: dungeonState.classification,
    dungeonState,

    tiles: layout.tiles,
    objects,
    enemies,
    drops,
    effects: [],
    combatEffects: [],

    spawn: layout.spawn,
    bossRoomCenter: layout.bossRoomCenter,
    exit: layout.exit,
    rooms: layout.rooms,
    halls: layout.halls,
    dungeonScale: layout.scaleProfile?.id || scaleProfile.id,
    dungeonScaleProfile: {
      id: layout.scaleProfile?.id || scaleProfile.id,
      minPlayableTiles: layout.scaleProfile?.minPlayableTiles || scaleProfile.minPlayableTiles,
      playableTiles: layout.playableTiles
    },
    dungeonDepthProfile: {
      classification: dungeonState.classification,
      currentFloor: floor,
      totalFloors,
      finalFloor: floor >= totalFloors
    },
    activeFloorOnly: true
  };

  dressWorld(world);
  if (!options.skipPublishedOverride) applyPublishedWorldOverride(world);
  const encounterProfile=dungeonEncounterProfile(world);
  for(const e of world.enemies)configureEncounterEnemy(e,encounterProfile,`${world.floorSeed||world.seed}:${e.id}`,{dungeon:true,confined:!!e.corridorPatrol});
  for(const e of world.enemies){if(!isActorPositionPassable(world,e.x,e.y,e.radius||12)){const p=findNearestActorPassablePoint(world,e.x,e.y,e.radius||12);e.x=p.x;e.y=p.y;e.homeX=p.x;e.homeY=p.y;}}
  world.dungeonState.coopPlayerCount=options.playerCount||world.dungeonState.coopPlayerCount||1;
  installMalakarSanctum(world);
  dressMalakarApproach(world);
  installOrchardDungeon(world);
  installVeyreign(world);
  initializeDungeonArena(world);
  syncDungeonCompletion(world);
  return world;
}

export function updateDungeonEvents(world,player,dt,log,game=null){
  updateOrchardDungeon({world,player,log});
  updateVeyreign(game||{world,player,log});
  if(!['dungeon','sideZone'].includes(world?.mode)||world.dungeonState?.malakar)return;
  for(const object of world.objects||[])if(object.pendingSpawnDelay!=null){object.pendingSpawnDelay-=dt;if(object.pendingSpawnDelay<=0){delete object.pendingSpawnDelay;triggerDungeonEvent({world,player,log},object,true);}}
  for(const [id,event] of Object.entries(world.dungeonState?.activeEvents||{})){if(event.completed)continue;
    if(!(world.enemies||[]).some(e=>event.memberIds.includes(e.id)&&e.hp>0&&!e.dead&&!e.remove)){event.completed=true;unlockDungeonObjects(world,o=>o.unlockOnEventId===id,'Event Reward');log?.('Ambush defeated. Its guarded reward is now available.');}}
}

function createDungeonLayout(config) {
  const scaleProfile = config.scaleProfile || getDungeonScaleProfile(config);
  const width = scaleProfile.width;
  const height = scaleProfile.height;

  const wallBiome = getWallBiomeId();
  const floorBiome = getThemeFloorBiome(config.theme);
  const secondaryFloorBiome = getThemeSecondaryFloorBiome(config.theme);

  const tiles = createFilledTiles(width, height, wallBiome, config.seed);

  const rooms = createDungeonRooms(width, height, config);
  const halls = connectRoomsWithHalls(rooms, config);

  carveRooms(tiles, rooms, floorBiome, secondaryFloorBiome, config);
  carveHalls(tiles, halls, floorBiome, secondaryFloorBiome, config);
  addDungeonFloorDetails(tiles, rooms, halls, floorBiome, secondaryFloorBiome, config);
  reinforceDungeonBorders(tiles, wallBiome);

  const spawnRoom = rooms[0];
  const bossRoom = rooms[rooms.length - 1];

  const spawn = {
    x: Math.floor(spawnRoom.cx * TILE),
    y: Math.floor(spawnRoom.cy * TILE)
  };

  const bossRoomCenter = {
    x: Math.floor(bossRoom.cx * TILE),
    y: Math.floor(bossRoom.cy * TILE)
  };

  const exit = {
    x: Math.floor(spawnRoom.cx * TILE),
    y: Math.floor((spawnRoom.cy - 2) * TILE)
  };

  const objects = createDungeonObjects(rooms, config, exit);
  const enemies = createDungeonEnemies(rooms, config, halls);
  const playableTiles = countDungeonPlayableTiles(tiles);

  return {
    width,
    height,
    tiles,
    objects,
    enemies,
    spawn,
    bossRoomCenter,
    exit,
    rooms,
    halls,
    playableTiles,
    scaleProfile
  };
}

function createFilledTiles(width, height, biome, seed) {
  const tiles = [];

  for (let y = 0; y < height; y++) {
    const row = [];

    for (let x = 0; x < width; x++) {
      row.push({
        biome,
        variant: dungeonNoise(x, y, seed) > 0.5 ? 1 : 0
      });
    }

    tiles.push(row);
  }

  return tiles;
}

function createDungeonRooms(width, height, config) {
  const profile = config.scaleProfile || getDungeonScaleProfile(config);
  const rng = createSeededRng(`${config.seed}-rooms-${config.theme}-${config.tier}`);
  const targetRooms = clampInt(
    profile.minRooms + Math.floor(config.tier / 2) + Math.floor(config.depth / 2),
    profile.minRooms,
    profile.maxRooms
  );

  const rooms = [
    makeRoom(
      7,
      clampInt(Math.floor(height * 0.48), 8, height - profile.roomMinH - 8),
      Math.max(16, profile.roomMinW + 3),
      Math.max(12, profile.roomMinH + 2),
      'entrance',
      0
    )
  ];

  // Reserve an arena before placing ordinary rooms, rather than enlarging a room into its neighbours.
  if(config.isFinalFloor){const aw=profile.id==='story'?36:profile.id==='major'?32:26,ah=profile.id==='story'?28:profile.id==='major'?26:22;
    const arena=makeRoom(width-aw-7,Math.floor(height/2-ah/2),aw,ah,'boss',1);arena.arenaReserved=true;rooms.push(arena);}
  let attempts = 0;
  const maxAttempts = targetRooms * 150;

  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts++;

    const w = randInt(rng, profile.roomMinW, profile.roomMaxW + Math.min(4, config.tier));
    const h = randInt(rng, profile.roomMinH, profile.roomMaxH + Math.min(3, config.depth));
    const x = randInt(rng, 4, width - w - 5);
    const y = randInt(rng, 5, height - h - 5);

    const candidate = makeRoom(x, y, w, h, 'chamber', rooms.length);

    if (rooms.some(room => roomsOverlap(room, candidate, profile.roomPadding))) {
      continue;
    }

    rooms.push(candidate);
  }

  addFallbackDungeonRooms(rooms, width, height, profile, targetRooms);

  const entrance = rooms[0];
  const reserved=rooms.find(r=>r.arenaReserved);
  const sorted = rooms.slice(1).filter(r=>r!==reserved).sort((a, b) => {
    return distanceTiles(a.cx, a.cy, entrance.cx, entrance.cy) -
      distanceTiles(b.cx, b.cy, entrance.cx, entrance.cy);
  });

  if(reserved)sorted.push(reserved);
  const finalRoom = sorted[sorted.length - 1] || rooms[rooms.length - 1];
  finalRoom.role = config.isFinalFloor ? 'boss' : 'floorExit';

  const route = [entrance, ...sorted];
  const roleCycle = [
    'combat',
    'quiet',
    'treasure',
    'combat',
    'locked',
    'puzzle',
    'trap',
    'combat',
    'shrine',
    'elite',
    'resourceRoom',
    'sideTreasure',
    'combat',
    'ambush',
    'quiet',
    'miniBoss',
    'lore',
    'combat'
  ];

  return route.map((room, index) => {
    let role = room.role;

    if (index === route.length - 1) {
      role = config.isFinalFloor ? 'boss' : 'floorExit';
    } else if (index > 0 && role !== 'boss') {
      role = index === route.length - 2
        ? config.isFinalFloor ? 'bossApproach' : 'floorApproach'
        : roleCycle[(index - 1) % roleCycle.length];
    }

    const roomData = {
      ...room,
      role,
      index,
      danger: index === 0 ? 0 : index / Math.max(1, route.length - 1),
      id: `room-${index}`
    };

    if (isActOneSealDungeon(config)) {
      roomData.storyLabel = getActOneSealRoomLabel(index, route.length, role, config);
    }

    return roomData;
  });
}

function addFallbackDungeonRooms(rooms, width, height, profile, targetRooms) {
  const anchors = [
    [0.20, 0.18],
    [0.42, 0.16],
    [0.66, 0.18],
    [0.84, 0.30],
    [0.28, 0.38],
    [0.52, 0.40],
    [0.73, 0.45],
    [0.18, 0.62],
    [0.40, 0.64],
    [0.64, 0.68],
    [0.84, 0.72],
    [0.30, 0.84],
    [0.55, 0.84],
    [0.76, 0.86]
  ];

  for (const [px, py] of anchors) {
    if (rooms.length >= targetRooms) break;

    const w = clampInt(profile.roomMinW + (rooms.length % 4) * 3, profile.roomMinW, profile.roomMaxW);
    const h = clampInt(profile.roomMinH + (rooms.length % 3) * 3, profile.roomMinH, profile.roomMaxH);
    const x = clampInt(Math.floor(width * px - w / 2), 4, width - w - 5);
    const y = clampInt(Math.floor(height * py - h / 2), 5, height - h - 5);
    const candidate = makeRoom(x, y, w, h, 'chamber', rooms.length);

    if (rooms.some(room => roomsOverlap(room, candidate, Math.max(3, profile.roomPadding - 3)))) {
      continue;
    }

    rooms.push(candidate);
  }

  let row = 0;
  let col = 0;
  while (rooms.length < profile.minRooms && row < 5) {
    const w = profile.roomMinW;
    const h = profile.roomMinH;
    const cellW = Math.floor((width - 16) / 5);
    const cellH = Math.floor((height - 16) / 4);
    const x = clampInt(8 + col * cellW + Math.floor(cellW * 0.2), 4, width - w - 5);
    const y = clampInt(8 + row * cellH + Math.floor(cellH * 0.2), 5, height - h - 5);
    const candidate = makeRoom(x, y, w, h, 'chamber', rooms.length);

    if (!rooms.some(room => roomsOverlap(room, candidate, 2))) {
      rooms.push(candidate);
    }

    col++;
    if (col >= 5) {
      col = 0;
      row++;
    }
  }
}

function connectRoomsWithHalls(rooms, config = {}) {
  const profile = config.scaleProfile || getDungeonScaleProfile(config);
  const halls = [];
  const connected = [rooms[0]];

  for (let i = 1; i < rooms.length; i++) {
    const next = rooms[i];
    const closest = connected
      .slice()
      .sort((a, b) => {
        return distanceTiles(a.cx, a.cy, next.cx, next.cy) -
          distanceTiles(b.cx, b.cy, next.cx, next.cy);
      })[0];

    halls.push(createHallBetweenRooms(closest, next, i));
    connected.push(next);
  }

  if (rooms.length >= 6) {
    halls.push(createHallBetweenRooms(rooms[1], rooms[rooms.length - 2], 99));
  }

  const loopCount = Math.min(profile.loopHalls, Math.max(1, Math.floor(rooms.length / 5)));
  for (let i = 0; i < loopCount; i++) {
    const aIndex = 1 + i * 2;
    const bIndex = rooms.length - 2 - i * 2;
    const a = rooms[aIndex];
    const b = rooms[bIndex];

    if (!a || !b || a === b) continue;

    halls.push(createHallBetweenRooms(a, b, 120 + i));
  }

  return halls;
}

function createHallBetweenRooms(a, b, index) {
  return {
    id: `hall-${index}`,
    ax: a.cx,
    ay: a.cy,
    bx: b.cx,
    by: b.cy,
    width: index === 99 ? 3 : 4 + (index % 3 === 0 ? 1 : 0),
    bendFirst: index % 2 === 0
  };
}

function makeRoom(x, y, w, h, role, index) {
  return {
    id: `room-${index}`,
    x,
    y,
    w,
    h,
    role,
    cx: x + Math.floor(w / 2),
    cy: y + Math.floor(h / 2)
  };
}

function roomsOverlap(a, b, padding = 2) {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

function distanceTiles(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function carveRooms(tiles, rooms, floorBiome, secondaryFloorBiome, config) {
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!tiles[y]?.[x]) continue;

        const edge =
          x === room.x ||
          y === room.y ||
          x === room.x + room.w - 1 ||
          y === room.y + room.h - 1;

        if (edge) {
          continue;
        }

        const noise = dungeonNoise(x, y, `${config.seed}-room-detail`);

        tiles[y][x] = {
          biome: noise > 0.84 ? secondaryFloorBiome : floorBiome,
          variant: noise > 0.5 ? 1 : 0
        };
      }
    }
  }
}

function carveHalls(tiles, halls, floorBiome, secondaryFloorBiome, config) {
  for (const hall of halls) {
    if (hall.bendFirst) {
      carveHorizontalHall(tiles, hall.ax, hall.bx, hall.ay, hall.width, floorBiome, secondaryFloorBiome, config);
      carveVerticalHall(tiles, hall.ay, hall.by, hall.bx, hall.width, floorBiome, secondaryFloorBiome, config);
    } else {
      carveVerticalHall(tiles, hall.ay, hall.by, hall.ax, hall.width, floorBiome, secondaryFloorBiome, config);
      carveHorizontalHall(tiles, hall.ax, hall.bx, hall.by, hall.width, floorBiome, secondaryFloorBiome, config);
    }
  }
}

function carveHorizontalHall(tiles, x1, x2, y, width, floorBiome, secondaryFloorBiome, config) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const half = Math.floor(width / 2);

  for (let x = minX; x <= maxX; x++) {
    for (let oy = -half; oy <= half; oy++) {
      const ty = y + oy;

      if (!tiles[ty]?.[x]) continue;

      const noise = dungeonNoise(x, ty, `${config.seed}-hall-h`);

      tiles[ty][x] = {
        biome: noise > 0.88 ? secondaryFloorBiome : floorBiome,
        variant: noise > 0.55 ? 1 : 0
      };
    }
  }
}

function carveVerticalHall(tiles, y1, y2, x, width, floorBiome, secondaryFloorBiome, config) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const half = Math.floor(width / 2);

  for (let y = minY; y <= maxY; y++) {
    for (let ox = -half; ox <= half; ox++) {
      const tx = x + ox;

      if (!tiles[y]?.[tx]) continue;

      const noise = dungeonNoise(tx, y, `${config.seed}-hall-v`);

      tiles[y][tx] = {
        biome: noise > 0.88 ? secondaryFloorBiome : floorBiome,
        variant: noise > 0.55 ? 1 : 0
      };
    }
  }
}

function addDungeonFloorDetails(tiles, rooms, halls, floorBiome, secondaryFloorBiome, config) {
  for (let y = 2; y < tiles.length - 2; y++) {
    for (let x = 2; x < tiles[y].length - 2; x++) {
      const tile = tiles[y][x];

      if (!isDungeonFloor(tile.biome)) continue;

      const n = dungeonNoise(x, y, `${config.seed}-floor-cracks`);

      if (n > 0.94) {
        tile.biome = secondaryFloorBiome;
        tile.variant = 1;
      }

      if (config.theme === 'grave' && n < 0.035) {
        tile.biome = 'dead';
      }

      if (config.theme === 'thorn' && n < 0.035) {
        tile.biome = 'grass';
      }

      if (config.theme === 'ruin' && n < 0.04) {
        tile.biome = 'path';
      }
    }
  }
}

function reinforceDungeonBorders(tiles, wallBiome) {
  const h = tiles.length;
  const w = tiles[0]?.length || 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const border = x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2;

      if (border) {
        tiles[y][x] = {
          biome: wallBiome,
          variant: (x + y) % 2
        };
      }
    }
  }
}

// -----------------------------------------------------------------------------
// DUNGEON OBJECTS
// -----------------------------------------------------------------------------

function createDungeonObjects(rooms, config, exit) {
  const objects = [];

  const entranceRoom = rooms[0];
  const finalRoom = rooms.find(room => room.role === 'boss' || room.role === 'floorExit') || rooms[rooms.length - 1];
  const bossRoom = rooms.find(room => room.role === 'boss') || finalRoom;
  const resourceRooms = rooms.filter(room => room !== entranceRoom && room !== finalRoom);
  const resources = getThemeResourceNodes(config.theme);
  const floor = Math.max(1, Number(config.floor || 1));
  const totalFloors = Math.max(1, Number(config.totalFloors || 1));
  const state = config.dungeonState || {};
  const dungeonCleared = !!state.cleared;

  objects.push({
    id: `dungeonExit-floor-${floor}`,
    kind: 'dungeonExit',
    name: dungeonCleared
      ? 'Return to Surface'
      : floor === 1
        ? 'Sealed Surface Exit'
        : 'Sealed Return Sigil',
    x: exit.x,
    y: exit.y,
    r: 24,
    locked: !dungeonCleared
  });

  if (floor > 1) {
    objects.push({
      id: `dungeonStairsUp-floor-${floor}`,
      kind: 'dungeonStairs',
      name: 'Stairs Up',
      x: (entranceRoom.cx - 2) * TILE,
      y: (entranceRoom.cy + 2) * TILE,
      r: 24,
      direction: 'up',
      targetFloor: floor - 1,
      arrivalRole: 'fromDownstairs',
      locked: false
    });
  }

  if (!config.isFinalFloor) {
    objects.push({
      id: `dungeonStairsDown-floor-${floor}`,
      kind: 'dungeonStairs',
      name: `Descend to Floor ${Math.min(totalFloors, floor + 1)}`,
      x: finalRoom.cx * TILE,
      y: finalRoom.cy * TILE,
      r: 24,
      direction: 'down',
      targetFloor: floor + 1,
      arrivalRole: 'fromUpstairs',
      locked: false
    });
  }

  if (isActOneSealDungeon(config)) {
    addActOneSealSetpieces(objects, rooms, config);
  }

  objects.push({
    id: 'dungeonCampfire',
    kind: 'campfire',
    name: getThemeCampfireName(config.theme),
    x: (entranceRoom.cx + 2) * TILE,
    y: (entranceRoom.cy + 2) * TILE,
    r: 18
  });

  addDungeonKeyDoorAndLockedChest(objects, rooms, config);

  resourceRooms.forEach((room, index) => {
    const resource = resources[index % resources.length];
    const side = index % 2 === 0 ? -1 : 1;

    if (room.role === 'shrine') {
      objects.push({
        id: `dungeonShrine-${index}`,
        kind: 'shrine',
        name: 'Wayfarer Shrine',
        x: room.cx * TILE,
        y: room.cy * TILE,
        r: 20,
        depleted: false,
        respawn: 0,
        respawnTime: 240
      });
    }

    if (room.role === 'treasure' || room.role === 'sideTreasure') {
      objects.push(createDungeonChestObject({
        id: `dungeonTreasure-${floor}-${index}`,
        name: room.role === 'sideTreasure' ? 'Hidden Side Chest' : 'Wayfarer Chest',
        x: room.cx * TILE,
        y: room.cy * TILE,
        chestType: room.role === 'sideTreasure' ? 'side' : 'normal',
        config
      }));
    }

    if (room.role === 'locked') {
      // Locked rooms receive their key, door, and chest in addDungeonKeyDoorAndLockedChest.
    }

    if (room.role === 'puzzle') {
      const puzzleId = `dungeonPuzzle-${floor}-${room.id}`;
      objects.push({
        id: puzzleId,
        kind: 'dungeonPuzzle',
        name: getDungeonPuzzleName(config),
        clue: getDungeonPuzzleClue(config),
        puzzleType: 'runeSequence',
        requiredSteps: 2 + (floor + index) % 3,
        progress: 0,
        solved: false,
        x: room.cx * TILE,
        y: room.cy * TILE,
        r: 22,
        markerColor: '#66f0ff',
        labelPriority: 6
      });

      objects.push(createDungeonChestObject({
        id: `dungeonPuzzleChest-${floor}-${room.id}`,
        name: 'Puzzle Reward Chest',
        x: (room.cx + 3) * TILE,
        y: room.cy * TILE,
        chestType: 'puzzle',
        locked: true,
        config,
        unlockOnPuzzleId: puzzleId
      }));
    }

    if (room.role === 'resourceRoom') {
      addDungeonResourceRoomObjects(objects, room, config, resources, index);
    }

    if (room.role === 'ambush') {
      const eventId = `dungeonAmbush-${floor}-${room.id}`;
      objects.push({
        id: eventId,
        kind: 'dungeonEvent',
        name: getDungeonEventName(config, 'ambush'),
        eventType: 'ambush',
        status: 'Ambush',
        message: 'The room wakes around you.',
        spawnCount: 4 + Math.min(4, Math.floor((config.depth || 1) / 2)),
        x: room.cx * TILE,
        y: room.cy * TILE,
        r: 22,
        markerColor: '#ef6f6c',
        singleUse: true,
        labelPriority: 6
      });

      objects.push(createDungeonChestObject({
        id: `dungeonAmbushChest-${floor}-${room.id}`,
        name: 'Ambush Spoils',
        x: (room.cx - 3) * TILE,
        y: (room.cy + 1) * TILE,
        chestType: 'event',
        locked: true,
        config,
        unlockOnEventId: eventId
      }));
    }

    if (room.role === 'miniBoss') {
      const miniBossId = getDungeonMiniBossId(config, room);
      objects.push(createDungeonChestObject({
        id: `dungeonMiniBossChest-${floor}-${room.id}`,
        name: 'Guardian Spoils',
        x: (room.cx + 3) * TILE,
        y: (room.cy + 1) * TILE,
        chestType: 'miniBoss',
        locked: true,
        config,
        unlockOnMiniBossId: miniBossId
      }));
    }

    if (room.role === 'lore') {
      objects.push({
        id: `dungeonLoreRelic-${floor}-${room.id}`,
        kind: 'runestone',
        name: getDungeonLoreRelicName(config),
        x: room.cx * TILE,
        y: room.cy * TILE,
        r: 18,
        depleted: false,
        respawn: 0,
        respawnTime: 420,
        itemId: getDungeonRewardProfile(config).secondaryMaterial,
        xp: 34,
        requiredLevel: 3,
        requiredToolTier: 1,
        labelPriority: 5
      });
    }

    if (room.role === 'quiet') {
      objects.push({
        id: `dungeonQuietMarker-${index}`,
        kind: 'bone',
        name: 'Quiet Waymarker',
        x: room.cx * TILE,
        y: room.cy * TILE,
        r: 12,
        depleted: false,
        respawn: 0,
        respawnTime: 210
      });
    }

    if (room.role === 'trap') {
      const eventId = `dungeonTrapEvent-${floor}-${room.id}`;
      objects.push({
        id: `dungeonTrapWarning-${index}`,
        kind: 'bone',
        name: 'Splintered Warning Bones',
        x: (room.cx - 2) * TILE,
        y: room.cy * TILE,
        r: 14,
        depleted: false,
        respawn: 0,
        respawnTime: 180
      });

      objects.push({
        id: eventId,
        kind: 'dungeonEvent',
        name: getDungeonEventName(config, 'trap'),
        eventType: 'trap',
        status: 'Trap Sprung',
        message: 'Hidden pressure plates snap awake.',
        spawnCount: 3 + Math.min(3, Math.floor((config.depth || 1) / 3)),
        x: (room.cx + 2) * TILE,
        y: room.cy * TILE,
        r: 20,
        markerColor: '#ffcc66',
        singleUse: true,
        labelPriority: 5
      });
    }

    objects.push({
      id: `dungeonResource-${index}`,
      kind: resource.kind,
      name: resource.name,
      x: (room.cx + side * Math.max(2, Math.floor(room.w / 4))) * TILE,
      y: (room.cy + ((index % 3) - 1) * 2) * TILE,
      r: resource.r || 14,
      depleted: false,
      respawn: 0,
      respawnTime: resource.respawnTime || 120,
      itemId: resource.itemId,
      xp: resource.xp,
      requiredLevel: resource.requiredLevel,
      requiredToolTier: resource.requiredToolTier
    });
  });

  if (config.isFinalFloor) {
    objects.push({
      id: `dungeonBossMarker-floor-${floor}`,
      kind: 'runestone',
      name: getThemeBossMarkerName(config),
      x: bossRoom.cx * TILE,
      y: (bossRoom.cy - 4) * TILE,
      r: 18,
      depleted: false,
      respawn: 0,
      respawnTime: 300
    });

    objects.push(createDungeonChestObject({
      id: `dungeonBossChest-floor-${floor}`,
      name: getDungeonBossChestName(config),
      x: bossRoom.cx * TILE,
      y: (bossRoom.cy + 5) * TILE,
      chestType: 'boss',
      locked: !state.cleared,
      config
    }));
  } else {
    objects.push({
      id: `dungeonFloorMarker-${floor}`,
      kind: 'runestone',
      name: getDungeonFloorMarkerName(config),
      x: finalRoom.cx * TILE,
      y: (finalRoom.cy - 4) * TILE,
      r: 18,
      depleted: false,
      respawn: 0,
      respawnTime: 300
    });
  }

  applyDungeonPersistentObjectState(objects, config);

  return objects;
}

function addDungeonKeyDoorAndLockedChest(objects, rooms, config) {
  const sideRooms = getDungeonSideRoomCandidates(rooms, config);
  if (!sideRooms.length) return;

  const floor = Math.max(1, Number(config.floor || 1));
  const keyId = `${slugify(config.dungeonId || 'dungeon')}-floor-${floor}-side-key`;
  const keyName = getDungeonKeyName(config);
  const lockedRoom = sideRooms.find(room => room.role === 'locked') || sideRooms[0];
  const lockedSideRoomSet = new Set([
    lockedRoom?.id,
    ...sideRooms
      .filter((room, index) => room.role === 'miniBoss' && index <= 2)
      .map(room => room.id)
  ].filter(Boolean));
  const keyRoom = rooms
    .filter(room => room.index > 0 && room.index < lockedRoom.index)
    .find(room => ['elite', 'combat', 'quiet', 'trap', 'treasure'].includes(room.role)) || rooms[1] || lockedRoom;

  if (lockedSideRoomSet.size) {
    objects.push({
      id: `dungeonKey-${floor}`,
      kind: 'dungeonKey',
      name: keyName,
      keyId,
      x: (keyRoom.cx + Math.max(-2, Math.min(2, floor - 2))) * TILE,
      y: (keyRoom.cy - 2) * TILE,
      r: 18,
      labelPriority: 5
    });
  }

  sideRooms.forEach((room, index) => {
    const anchorRoom = findDungeonSideDoorAnchorRoom(rooms, room);
    const locked = lockedSideRoomSet.has(room.id);
    const doorName = locked
      ? getDungeonLockedDoorName(config)
      : getDungeonSideDoorName(config, room);

    objects.push({
      id: `dungeonSideDoor-${floor}-${room.id}`,
      kind: 'dungeonDoor',
      name: doorName,
      openName: getDungeonOpenedDoorName(config),
      sideRoomName: getDungeonSideRoomDisplayName(room.role),
      sideRoomRole: room.role,
      sideRoomType: room.role,
      sideRoomId: room.id,
      sideRoomTarget: {
        x: room.cx * TILE,
        y: room.cy * TILE
      },
      targetX: room.cx * TILE,
      targetY: room.cy * TILE,
      keyName: locked ? keyName : null,
      requiredKeyId: locked ? keyId : null,
      x: (anchorRoom.cx + (index % 2 === 0 ? 2 : -2)) * TILE,
      y: (anchorRoom.cy + (index % 3) - 1) * TILE,
      r: 24,
      locked,
      opened: false,
      markerColor: locked ? '#f08a62' : getDungeonSideRoomMarkerColor(room.role),
      labelPriority: locked ? 6 : 5
    });
  });

  objects.push(createDungeonChestObject({
    id: `dungeonLockedChest-${floor}`,
    name: getDungeonLockedChestName(config),
    x: lockedRoom.cx * TILE,
    y: lockedRoom.cy * TILE,
    chestType: 'locked',
    locked: true,
    requiredKeyId: keyId,
    keyName,
    config
  }));
}

function getDungeonSideRoomCandidates(rooms, config) {
  const classification = config.classification || config.dungeonState?.classification || 'minor';
  const limit = classification === 'story' ? 5 : classification === 'major' ? 4 : 2;
  const roles = new Set(['locked', 'puzzle', 'sideTreasure', 'resourceRoom', 'miniBoss', 'shrine', 'ambush', 'lore']);
  const candidates = rooms
    .filter(room => room && room.index > 1 && room.role !== 'boss' && room.role !== 'floorExit' && room.role !== 'bossApproach' && roles.has(room.role))
    .sort((a, b) => {
      const weightA = getDungeonSideRoomWeight(a.role);
      const weightB = getDungeonSideRoomWeight(b.role);
      if (weightA !== weightB) return weightB - weightA;
      return a.index - b.index;
    });

  return candidates.slice(0, limit);
}

function getDungeonSideRoomWeight(role) {
  if (role === 'locked') return 9;
  if (role === 'puzzle') return 8;
  if (role === 'miniBoss') return 7;
  if (role === 'resourceRoom') return 6;
  if (role === 'sideTreasure') return 5;
  if (role === 'ambush') return 4;
  if (role === 'shrine') return 3;
  if (role === 'lore') return 2;
  return 1;
}

function findDungeonSideDoorAnchorRoom(rooms, sideRoom) {
  return rooms
    .slice()
    .filter(room => room && room !== sideRoom && room.index < sideRoom.index && room.role !== 'entrance')
    .sort((a, b) => distanceTiles(a.cx, a.cy, sideRoom.cx, sideRoom.cy) - distanceTiles(b.cx, b.cy, sideRoom.cx, sideRoom.cy))[0] ||
    rooms[Math.max(0, sideRoom.index - 1)] ||
    rooms[0] ||
    sideRoom;
}

function addDungeonResourceRoomObjects(objects, room, config, resources, roomIndex) {
  const floor = Math.max(1, Number(config.floor || 1));
  const rareResources = getDungeonRareResourceNodes(config.theme);

  for (let i = 0; i < Math.min(3, rareResources.length); i++) {
    const resource = rareResources[(roomIndex + i) % rareResources.length] || resources[(roomIndex + i) % resources.length];
    if (!resource) continue;

    objects.push({
      id: `dungeonRareResource-${floor}-${room.id}-${i}`,
      kind: resource.kind,
      name: resource.name,
      x: (room.cx + (i - 1) * 3) * TILE,
      y: (room.cy + (i % 2 === 0 ? -2 : 2)) * TILE,
      r: resource.r || 14,
      depleted: false,
      respawn: 0,
      respawnTime: resource.respawnTime || 240,
      itemId: resource.itemId,
      xp: resource.xp || 46,
      requiredLevel: resource.requiredLevel || 5,
      requiredToolTier: resource.requiredToolTier || 1,
      labelPriority: 5
    });
  }

  objects.push(createDungeonChestObject({
    id: `dungeonResourceChest-${floor}-${room.id}`,
    name: 'Rare Material Cache',
    x: room.cx * TILE,
    y: (room.cy + 3) * TILE,
    chestType: 'resource',
    config
  }));
}

function unlockDungeonObjects(world, predicate, rewardLabel = 'Reward') {
  let unlocked = false;

  for (const object of world?.objects || []) {
    if (!object || !predicate(object)) continue;
    object.locked = false;
    object.name = object.openName || object.name;
    unlocked = true;
  }

  if (unlocked) {
    world.effects = world.effects || [];
    const first = (world.objects || []).find(object => object && predicate(object));
    if (first) {
      world.effects.push({
        kind: 'enemyPulse',
        layer: 'front',
        x: first.x,
        y: first.y,
        color: '#73d18a',
        radius: 42,
        ttl: 0.45,
        age: 0
      });
    }
  }

  return unlocked;
}

function createDungeonChestObject({ id, name, x, y, chestType = 'normal', locked = false, requiredKeyId = null, keyName = null, config, ...extra }) {
  return {
    id,
    kind: 'dungeonChest',
    name,
    chestType,
    x,
    y,
    r: 20,
    locked,
    requiredKeyId,
    keyName,
    claimed: false,
    rewards: getDungeonChestRewards(config, chestType),
    xp: getDungeonChestXp(chestType),
    labelPriority: chestType === 'boss' || chestType === 'miniBoss' || chestType === 'puzzle' ? 7 : 5,
    ...extra
  };
}

function getDungeonChestXp(chestType) {
  if (chestType === 'boss') return 90;
  if (chestType === 'miniBoss') return 64;
  if (chestType === 'locked') return 44;
  if (chestType === 'puzzle') return 42;
  if (chestType === 'resource') return 32;
  if (chestType === 'event') return 36;
  return 22;
}

function applyDungeonPersistentObjectState(objects, config) {
  const state = config.dungeonState || {};

  for (const object of objects) {
    if (!object?.id) continue;

    if (object.kind === 'dungeonKey' && state.collectedKeys?.[object.keyId || object.id]) {
      object.collected = true;
      object.depleted = true;
    }

    if (object.kind === 'dungeonDoor' && state.unlockedDoors?.[object.id]) {
      object.locked = false;
      object.name = object.openName || object.name;
    }

    if (object.kind === 'dungeonDoor' && state.openedSideRooms?.[object.id]) {
      object.opened = true;
      object.locked = false;
      object.name = object.openName || object.name;
    }

    if (object.kind === 'dungeonPuzzle') {
      object.progress = state.puzzleProgress?.[object.id] || object.progress || 0;
      if (state.solvedPuzzles?.[object.id]) {
        object.solved = true;
      }
    }

    if (object.kind === 'dungeonEvent' && state.triggeredEvents?.[object.id]) {
      object.triggered = true;
      object.depleted = object.singleUse !== false;
    }

    if (object.kind === 'dungeonChest') {
      if (state.openedChests?.[object.id]) {
        object.claimed = true;
        object.depleted = true;
      }

      if (object.chestType === 'boss' && state.cleared) {
        object.locked = false;
      }

      if (object.unlockOnPuzzleId && state.solvedPuzzles?.[object.unlockOnPuzzleId]) {
        object.locked = false;
      }

      if (object.unlockOnEventId && state.triggeredEvents?.[object.unlockOnEventId]) {
        object.locked = false;
      }

      if (object.unlockOnMiniBossId && state.defeatedMiniBosses?.[object.unlockOnMiniBossId]) {
        object.locked = false;
      }
    }

    if ((object.kind === 'dungeonExit' || object.unlockOnDungeonClear) && state.cleared) {
      object.locked = false;
    }
  }
}

function getDungeonChestRewards(config, chestType = 'normal') {
  const floor = Math.max(1, Number(config.floor || 1));
  const classification = config.classification || 'minor';
  const profile = getDungeonRewardProfile(config);
  const majorScale = classification === 'story' ? 1.65 : classification === 'major' ? 1.35 : 1;
  const coinBase = Math.floor((6 + floor * 3) * majorScale);
  const materialBonus = classification === 'story' ? 2 : classification === 'major' ? 1 : 0;
  const rewards = [];

  if (chestType === 'boss') {
    pushDungeonReward(rewards, 'bossCore', 1);
    pushDungeonReward(rewards, 'ashCoin', coinBase + (classification === 'story' ? 36 : classification === 'major' ? 26 : 18));
    pushDungeonReward(rewards, profile.rareMaterial, 2 + materialBonus);
    pushDungeonReward(rewards, 'dungeonRelicShard', classification === 'story' ? 2 : 1);
    pushDungeonReward(rewards, profile.bossGear, 1);
    pushChanceDungeonReward(rewards, classification === 'story' ? 0.55 : classification === 'major' ? 0.38 : 0.22, profile.legendaryGear, 1);
    pushChanceDungeonReward(rewards, 0.42, profile.secondaryMaterial, 1 + materialBonus);
  } else if (chestType === 'locked') {
    pushDungeonReward(rewards, 'ashCoin', coinBase + 14 + floor * 2);
    pushDungeonReward(rewards, profile.rareMaterial, 2 + materialBonus);
    pushDungeonReward(rewards, profile.lockedGear, 1);
    pushChanceDungeonReward(rewards, 0.44, 'dungeonRelicShard', 1);
    pushChanceDungeonReward(rewards, 0.32, profile.rareGear, 1);
  } else if (chestType === 'miniBoss') {
    pushDungeonReward(rewards, 'ashCoin', coinBase + 22 + floor * 3);
    pushDungeonReward(rewards, profile.rareMaterial, 2 + materialBonus);
    pushDungeonReward(rewards, profile.secondaryMaterial, 1 + materialBonus);
    pushChanceDungeonReward(rewards, 0.48, profile.rareGear, 1);
    pushChanceDungeonReward(rewards, classification === 'story' ? 0.22 : classification === 'major' ? 0.14 : 0.08, profile.legendaryGear, 1);
  } else if (chestType === 'puzzle') {
    pushDungeonReward(rewards, 'ashCoin', coinBase + 12);
    pushDungeonReward(rewards, profile.secondaryMaterial, 2 + materialBonus);
    pushChanceDungeonReward(rewards, 0.48, 'dungeonRelicShard', 1);
    pushChanceDungeonReward(rewards, 0.34, profile.rareMaterial, 1 + materialBonus);
    pushChanceDungeonReward(rewards, 0.2, profile.rareGear, 1);
  } else if (chestType === 'resource') {
    pushDungeonReward(rewards, profile.commonMaterial, 4 + materialBonus);
    pushDungeonReward(rewards, profile.rareMaterial, 2 + materialBonus);
    pushChanceDungeonReward(rewards, 0.42, profile.secondaryMaterial, 2);
    pushChanceDungeonReward(rewards, 0.18, 'dungeonRelicShard', 1);
  } else if (chestType === 'event') {
    pushDungeonReward(rewards, 'ashCoin', coinBase + 10);
    pushDungeonReward(rewards, profile.commonMaterial, 3 + materialBonus);
    pushChanceDungeonReward(rewards, 0.38, profile.rareMaterial, 1);
    pushChanceDungeonReward(rewards, 0.2, profile.commonGear, 1);
  } else if (chestType === 'side') {
    pushDungeonReward(rewards, 'ashCoin', coinBase + 8);
    pushDungeonReward(rewards, profile.commonMaterial, 3 + materialBonus);
    pushDungeonReward(rewards, profile.rareMaterial, 1 + Math.min(1, materialBonus));
    pushChanceDungeonReward(rewards, 0.3, profile.secondaryMaterial, 1);
    pushChanceDungeonReward(rewards, 0.22, profile.commonGear, 1);
  } else {
    pushDungeonReward(rewards, 'ashCoin', coinBase);
    pushDungeonReward(rewards, 'ironScrap', 2 + Math.floor(floor / 3));
    pushDungeonReward(rewards, profile.commonMaterial, 2 + Math.min(1, materialBonus));
    pushChanceDungeonReward(rewards, 0.34, 'fieldRations', 1);
    pushChanceDungeonReward(rewards, 0.18, profile.commonGear, 1);
    pushChanceDungeonReward(rewards, 0.14, profile.rareMaterial, 1);
  }

  return rewards
    .filter(([itemId, qty]) => ITEMS[itemId] && Number(qty) > 0)
    .map(([itemId, qty]) => [itemId, Math.max(1, Math.floor(qty))]);
}

function pushDungeonReward(rewards, itemId, qty = 1) {
  if (!ITEMS[itemId]) return;

  const item = ITEMS[itemId];
  const safeQty = Math.max(1, Math.floor(Number(qty || 1)));

  if (item.stack) {
    const existing = rewards.find(([existingId]) => existingId === itemId);
    if (existing) {
      existing[1] = Math.max(1, Number(existing[1] || 1)) + safeQty;
      return;
    }
  }

  rewards.push([itemId, safeQty]);
}

function pushChanceDungeonReward(rewards, chance, itemId, qty = 1) {
  if (Math.random() <= Math.max(0, Math.min(1, Number(chance || 0)))) {
    pushDungeonReward(rewards, itemId, qty);
  }
}

function getDungeonRewardProfile(config) {
  const text = `${config?.dungeonId || ''} ${config?.poiId || ''} ${config?.entranceId || ''} ${config?.theme || ''}`.toLowerCase();

  if (text.includes('castle') || text.includes('veyr')) {
    return {
      commonMaterial: 'boneShard',
      secondaryMaterial: 'burialCloth',
      rareMaterial: 'veyrglassShard',
      commonGear: 'graveclothGreaves',
      rareGear: 'veyrSilkMantle',
      lockedGear: 'veyrCourtCoat',
      bossGear: 'veyrGraveLens',
      legendaryGear: 'veyrglassBlade'
    };
  }

  if (text.includes('seal') || text.includes('demon') || text.includes('dawnspire') || config.theme === 'demon') {
    return {
      commonMaterial: 'cultAsh',
      secondaryMaterial: 'redGlassIchor',
      rareMaterial: 'redSealFragment',
      commonGear: 'cultistMantle',
      rareGear: 'redSealRing',
      lockedGear: 'sealglassPrism',
      bossGear: 'redSealConductor',
      legendaryGear: 'demonseedScythe'
    };
  }

  if (config.theme === 'thorn') {
    return {
      commonMaterial: 'gravecap',
      secondaryMaterial: 'livingBark',
      rareMaterial: 'briarRoot',
      commonGear: 'thornCharm',
      rareGear: 'thornhookStaff',
      lockedGear: 'thornCharm',
      bossGear: 'heartrootStaff',
      legendaryGear: 'blackbriarCrown'
    };
  }

  if (config.theme === 'holy') {
    return {
      commonMaterial: 'paleEssence',
      secondaryMaterial: 'radiantSplinter',
      rareMaterial: 'watcherGlass',
      commonGear: 'pilgrimsFocus',
      rareGear: 'dawncarverLens',
      lockedGear: 'sealglassPrism',
      bossGear: 'sunfractureGauntlet',
      legendaryGear: 'everdawnCarver'
    };
  }

  if (config.theme === 'cosmic') {
    return {
      commonMaterial: 'paleEssence',
      secondaryMaterial: 'shadowResidue',
      rareMaterial: 'watcherGlass',
      commonGear: 'moonlitReliquary',
      rareGear: 'watcherGlassCharm',
      lockedGear: 'moonlitReliquary',
      bossGear: 'uncrownedPrism',
      legendaryGear: 'zephyrglassAmulet'
    };
  }

  return {
    commonMaterial: 'boneShard',
    secondaryMaterial: 'burialCloth',
    rareMaterial: 'paleEssence',
    commonGear: 'patchedRoadLeathers',
    rareGear: 'graveScythe',
    lockedGear: 'moonlitReliquary',
    bossGear: 'moonlitReliquary',
    legendaryGear: 'orrakaiFoundersSignet'
  };
}

function getDungeonKeyName(config) {
  if (config.theme === 'thorn') return 'Root-Knotted Key';
  if (config.theme === 'demon') return 'Last Dawn Key';
  if (config.theme === 'ruin' && String(config.dungeonId || '').toLowerCase().includes('castle')) return 'Rusted Armoury Key';
  if (config.theme === 'holy') return 'Reliquary Key';
  if (config.theme === 'cosmic') return 'Relay Key';
  return 'Old Side-Room Key';
}

function getDungeonLockedDoorName(config) {
  if (config.theme === 'demon') return 'Warded Seal Door';
  if (config.theme === 'thorn') return 'Root-Knotted Door';
  if (config.theme === 'ruin') return 'Locked Armoury Door';
  if (config.theme === 'holy') return 'Reliquary Door';
  if (config.theme === 'cosmic') return 'Relay Lock';
  return 'Locked Side Door';
}

function getDungeonOpenedDoorName(config) {
  return getDungeonLockedDoorName(config).replace(/^Locked /, 'Opened ').replace(/^Warded /, 'Opened ');
}

function getDungeonLockedChestName(config) {
  if (config.theme === 'demon') return 'Last Dawn Vault';
  if (config.theme === 'thorn') return 'Thorn-Cradled Cache';
  if (config.theme === 'ruin') return 'Old Armoury Chest';
  if (config.theme === 'holy') return 'Reliquary Chest';
  if (config.theme === 'cosmic') return 'Relay Vault';
  return 'Locked Reward Chest';
}

function getDungeonBossChestName(config) {
  if (config.theme === 'demon') return 'Sealbreaker Spoils';
  if (config.theme === 'thorn') return 'Thorn Heart Cache';
  if (config.theme === 'ruin') return 'Warden Spoils';
  if (config.theme === 'holy') return 'Radiant Reliquary';
  if (config.theme === 'cosmic') return 'Light-Bent Reliquary';
  return 'Boss Reward Chest';
}

function getDungeonSideDoorName(config, room) {
  if (room?.role === 'puzzle') return 'Rune Puzzle Door';
  if (room?.role === 'miniBoss') return 'Guardian Side Door';
  if (room?.role === 'resourceRoom') return 'Material Alcove Door';
  if (room?.role === 'sideTreasure') return 'Treasure Side Door';
  if (room?.role === 'ambush') return 'Quiet Side Door';
  if (room?.role === 'shrine') return 'Shrine Side Door';
  if (room?.role === 'lore') return 'Relic Side Door';
  return getDungeonLockedDoorName(config).replace(/^Locked /, '');
}

function getDungeonSideRoomDisplayName(role) {
  if (role === 'puzzle') return 'Puzzle Room';
  if (role === 'miniBoss') return 'Guardian Room';
  if (role === 'resourceRoom') return 'Rare Material Room';
  if (role === 'sideTreasure') return 'Treasure Room';
  if (role === 'ambush') return 'Ambush Room';
  if (role === 'shrine') return 'Shrine Room';
  if (role === 'lore') return 'Relic Room';
  if (role === 'locked') return 'Locked Side Room';
  return 'Side Room';
}

function getDungeonSideRoomMarkerColor(role) {
  if (role === 'puzzle') return '#66f0ff';
  if (role === 'miniBoss') return '#ffcc66';
  if (role === 'resourceRoom') return '#73d18a';
  if (role === 'ambush') return '#ef6f6c';
  if (role === 'shrine') return '#59d7e8';
  return '#d9ad4f';
}

function getDungeonPuzzleName(config) {
  if (config.theme === 'demon') return 'Last Dawn Rune Sequence';
  if (config.theme === 'thorn') return 'Root-Glyph Sequence';
  if (config.theme === 'mine') return 'Deepstone Tone Puzzle';
  if (config.theme === 'ruin') return 'Oath Sigil Sequence';
  if (config.theme === 'holy') return 'Lantern Sequence';
  if (config.theme === 'cosmic') return 'Relay Glyph Sequence';
  return 'Buried Rune Sequence';
}

function getDungeonPuzzleClue(config) {
  if (config.theme === 'demon') return 'The red seals demand the old order.';
  if (config.theme === 'thorn') return 'The roots pulse in a patient order.';
  if (config.theme === 'mine') return 'The stone answers each strike.';
  if (config.theme === 'ruin') return 'The oath marks wait to be aligned.';
  return 'The runes answer in sequence.';
}

function getDungeonEventName(config, type) {
  if (type === 'trap') {
    if (config.theme === 'demon') return 'Last Dawn Trap Circle';
    if (config.theme === 'thorn') return 'Thorn Snare Circle';
    return 'Hidden Pressure Trap';
  }

  if (config.theme === 'demon') return 'Last Dawn Ambush Circle';
  if (config.theme === 'thorn') return 'Root-Wake Ambush';
  if (config.theme === 'mine') return 'Deepstone Collapse';
  if (config.theme === 'ruin') return 'Old Oath Ambush';
  return 'Restless Ambush Circle';
}

function getDungeonLoreRelicName(config) {
  if (config.theme === 'demon') return 'Scorched Cult Reliquary';
  if (config.theme === 'thorn') return 'Rootbound Memory Stone';
  if (config.theme === 'mine') return 'Miner Prayer Stone';
  if (config.theme === 'ruin') return 'Oathbroken Relic';
  if (config.theme === 'holy') return 'Pilgrim Reliquary';
  if (config.theme === 'cosmic') return 'Light-Bent Relic';
  return 'Buried Relic';
}

function getDungeonMiniBossId(config, room) {
  return `${slugify(config.dungeonId || config.name || 'dungeon')}-floor-${config.floor || 1}-${room?.id || 'mini-boss'}`;
}

function getDungeonMiniBossName(config, kind) {
  const names = getDungeonMiniBossNames(config);
  const index = Math.abs(String(kind || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % names.length;
  return names[index] || 'Dungeon Guardian';
}

function getDungeonMiniBossNames(config) {
  if (config.theme === 'demon') return ['Last Dawn Butcher', 'Lanternless Acolyte', 'Rune-Eaten Warden'];
  if (config.theme === 'thorn') return ['Thorn-Mad Hermit', 'Briar-Touched Knight', 'Ashen Orchard Keeper'];
  if (config.theme === 'mine') return ['Deepstone Maw', 'Blighted Gate Sentinel', 'Blackiron Delver'];
  if (config.theme === 'ruin') return ['Gravebound Duelist', 'Oathbroken Sentinel', 'Veyr Armoury Warden'];
  if (config.theme === 'holy') return ['Lanternless Acolyte', 'Reliquary Duelist', 'Sun-Fractured Warden'];
  return ['Bonewarden of the Cellar', 'Gravebound Duelist', 'Blighted Gate Sentinel'];
}

function getDungeonFloorMarkerName(config) {
  if (config.theme === 'demon') return 'Lower Seal Descent';
  if (config.theme === 'thorn') return 'Root Descent Marker';
  if (config.theme === 'ruin') return 'Old Stone Descent';
  if (config.theme === 'holy') return 'Pilgrim Descent';
  if (config.theme === 'cosmic') return 'Relay Descent';
  return 'Deeper Descent';
}

function addActOneSealSetpieces(objects, rooms, config) {
  const entrance = rooms[0];
  const boss = rooms.find(room => room.role === 'boss') || rooms[rooms.length - 1];
  const middle = rooms[Math.max(1, Math.floor(rooms.length / 2))];
  const ritual = rooms.find(room => room.role === 'elite' || room.role === 'miniBoss') || middle;

  const chapters = [
    ['Occupied Barracks', 'A barracks roster matches the divided-sun seals at the caravan. The guard shifts name wagon teams and excavation crews. The order beneath them reads: bring the sealed cargo down intact; take no detour for coin.'],
    ['Excavation Galleries', 'Fresh Last Dawn supports brace much older stone. Tool marks stop where three smooth channels begin. The stolen reliquary cradle fits the supply diagram, but the channels predate the occupied keep.'],
    ['Primordial Prisonworks', 'The maintenance inscription describes containment, pressure and a prisoner called Malakar. Later hands have crossed out the release procedure. Last Dawn annotations propose forcing it open with the stolen relic.'],
    ['Ritual Chamber', 'The final order demands an awakening before the next relief convoy. There is no promise of salvation here: the writer expects the prisoner to kill anyone who cannot hold the binding. The ritual must be stopped.']
  ];
  const [chapter,account]=chapters[Math.min(chapters.length-1,Math.max(0,(config.floor||1)-1))];
  if(entrance)objects.push({id:`act1-floor-account-${config.floor}`,kind:'poiInvestigation',name:chapter+' — Evidence',poiId:'lastDawnDescent',clueId:`floor-${config.floor}`,x:(entrance.cx+1)*TILE,y:(entrance.cy+1)*TILE,r:20,message:account,reviewMessage:account,interactable:true});
  if(entrance)objects.push({id:`act1-floor-directions-${config.floor}`,kind:'signpost',name:chapter,x:(entrance.cx-1)*TILE,y:entrance.cy*TILE,r:20,talk:config.isFinalFloor?'The channels converge in the ritual chamber. The threshold behind you leads back up.':'Follow the occupied passages and the channel trench toward the lower stair. Side rooms hold supplies; the stair does not require clearing every room.'});
  const definitions = [
    ['act1-entry-pressure-engine', 'Dawnspire Pressure Engine', entrance, 'sealEngine', 0, -2],
    ['act1-root-conduit', 'Corrupted Root Conduit', middle, 'rootConduit', 0, 0],
    ['act1-cult-staging', 'Cult Ritual Staging', ritual, 'ritualStaging', 0, 1],
    ['act1-malakar-seal-engine', 'Malakar Seal Engine', boss, 'sealEngine', 0, -3]
  ];

  for (const [id, name, room, setpieceStyle, offsetX, offsetY] of definitions) {
    if (!room) continue;
    objects.push({
      id,
      kind: 'dungeonSetpiece',
      name,
      setpieceStyle,
      x: (room.cx + offsetX) * TILE,
      y: (room.cy + offsetY) * TILE,
      scale: setpieceStyle === 'sealEngine' ? 1.2 : 1,
      drawRadius: 180,
      decorative: true,
      hideLabel: true
    });
  }
}

function isActOneSealDungeon(config) {
  const id = `${config?.dungeonId || ''} ${config?.poiId || ''} ${config?.entranceId || ''}`.toLowerCase();
  return id.includes('demoncultlair') || id.includes('dawnspireroot') || id.includes('emberveil');
}

function getActOneSealRoomLabel(index, count, role, config = {}) {
  const chapters=['Occupied Barracks','Excavation Galleries','Primordial Prisonworks','Ritual Chamber'];
  const chapter=chapters[Math.min(3,Math.max(0,(config.floor||1)-1))];
  if(index===0)return chapter+' Entrance';
  if(role==='boss'||index===count-1)return config.isFinalFloor?'Malakar’s Binding Chamber':chapter+' Lower Stair';
  if (index === 0) return 'The Last Dawn Threshold';
  if (role === 'boss' || index === count - 1) return 'The First Key Chamber';
  if (role === 'elite' || role === 'miniBoss') return 'Cult Staging Hall';
  if (index >= Math.floor(count / 2)) return 'Primordial Prisonworks';
  return 'Last Dawn Descent';
}

// -----------------------------------------------------------------------------
// DUNGEON ENEMIES
// -----------------------------------------------------------------------------

function createDungeonEnemies(rooms, config, halls = []) {
  const enemies = [];
  const bossRoom = rooms.find(room => room.role === 'boss') || null;
  const finalRoom = bossRoom || rooms.find(room => room.role === 'floorExit') || rooms[rooms.length - 1];
  const encounterRooms = rooms.filter((room, index) => index > 0 && room !== bossRoom);
  const enemyKinds = getThemeEnemyKinds(config.theme, config);
  const rng = createSeededRng(`${config.seed}-enemies-${config.dungeonId}`);
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const profile = config.scaleProfile || getDungeonScaleProfile(config);
  const playerCount = Math.max(1, Math.min(4, Math.floor(Number(config.playerCount || 1))));
  const maxEncounterEnemies = getDungeonFloorEnemyCap(profile, playerCount, config);
  const longHalls=halls.filter(h=>(Math.abs(h.ax-h.bx)+Math.abs(h.ay-h.by))*TILE/205>20).length;
  const roomEnemyBudget = Math.max(encounterRooms.filter(r=>!['quiet','shrine'].includes(r.role)).length*3,Math.floor(maxEncounterEnemies-Math.max(maxEncounterEnemies*.12,longHalls*2)));

  let index = 0;

  for (let roomIndex = 0; roomIndex < encounterRooms.length; roomIndex++) {
    const room = encounterRooms[roomIndex];
    const bossApproach = room.role === 'bossApproach' || roomIndex >= encounterRooms.length - 2;
    if (index >= roomEnemyBudget && !bossApproach) continue;
    if (index >= maxEncounterEnemies) break;

    const template = chooseDungeonEnemyPackTemplate(room, config, bossApproach, rng);
    const baseCount = getDungeonRoomEnemyCount(room, config, bossApproach, template);
    const roomCap = getDungeonRoomEnemyCap(room, bossApproach, playerCount);
    // Reserve a small pack for every remaining combat room before spending on hordes.
    const remaining=encounterRooms.slice(roomIndex+1).filter(r=>!['quiet','shrine'].includes(r.role)).length;
    const availableBudget = Math.max(0, roomEnemyBudget - index - remaining*3);
    const count = Math.min(availableBudget, getDungeonScaledEnemyCount(baseCount, playerCount, {
      cap: roomCap,
      min: getDungeonRoomEnemyMin(room, bossApproach)
    }));

    for (let i = 0; i < count; i++) {
      const kind = getDungeonPackEnemyKind(template, enemyKinds, room, i, index, config);
      const spawn = findDungeonRoomEnemySpawnTile(room, enemies, rng, i, count, {
        bossApproach,
        role: room.role
      });
      const floorElite = shouldPromoteDungeonFloorElite(room, i, index, config, bossApproach, playerCount, template);

      enemies.push(makeDungeonEnemy(kind, getDungeonEnemyName(kind, config), spawn.x, spawn.y, index, {
        ...config,
        roomRole: room.role,
        roomId: room.id,
        miniBossId: room.role === 'miniBoss' && i === 0 ? getDungeonMiniBossId(config, room) : null,
        elite: room.role === 'elite' && i === 0 || template.eliteSlots?.has(i) || floorElite,
        miniBoss: room.role === 'miniBoss' && i === 0,
        trapSpawn: room.role === 'trap',
        bossApproach,
        packTemplate: template.id,
        densityVersion: DUNGEON_DENSITY_VERSION
      }));
      index++;
    }
  }

  index = addDungeonCorridorPatrols(enemies, halls, rooms, config, enemyKinds, rng, index, maxEncounterEnemies, playerCount);

  if (config.isFinalFloor && bossRoom) {
    enemies.push(makeDungeonEnemy(getThemeBossKind(config.theme, config.dungeonId), getDungeonBossName(config), bossRoom.cx, bossRoom.cy, index, {
      ...config,
      boss: true
    }));

    const bossGuardCount = getDungeonScaledEnemyCount((config.tier >= 3 || depth >= 3) ? 2 : (config.tier >= 2 || depth >= 2) ? 1 : 0, playerCount, {
      cap: 4,
      min: (config.tier >= 2 || depth >= 2) ? 1 : 0
    });

    if (bossGuardCount >= 1) {
      enemies.push(makeDungeonEnemy(enemyKinds[0], getDungeonEnemyName(enemyKinds[0], config), bossRoom.cx - 5, bossRoom.cy + 2, index + 1, {
        ...config,
        roomRole: 'bossGuard',
        bossApproach: true,
        elite: depth >= 4
      }));
    }

    if (bossGuardCount >= 2) {
      enemies.push(makeDungeonEnemy(enemyKinds[1] || enemyKinds[0], getDungeonEnemyName(enemyKinds[1] || enemyKinds[0], config), bossRoom.cx + 5, bossRoom.cy + 2, index + 2, {
        ...config,
        roomRole: 'bossGuard',
        bossApproach: true,
        elite: true
      }));
    }

    for (let guardIndex = 2; guardIndex < bossGuardCount; guardIndex++) {
      const side = guardIndex % 2 === 0 ? -1 : 1;
      enemies.push(makeDungeonEnemy(enemyKinds[guardIndex % enemyKinds.length], getDungeonEnemyName(enemyKinds[guardIndex % enemyKinds.length], config), bossRoom.cx + side * (4 + guardIndex), bossRoom.cy + 4, index + 1 + guardIndex, {
        ...config,
        roomRole: 'bossGuard',
        bossApproach: true,
        elite: depth >= 4 && guardIndex === 2
      }));
    }
  } else if (finalRoom) {
    enemies.push(makeDungeonEnemy(enemyKinds[0], getDungeonEnemyName(enemyKinds[0], config), finalRoom.cx, finalRoom.cy, index, {
      ...config,
      roomRole: 'floorExit',
      bossApproach: true,
      elite: depth >= 2
    }));
  }

  return enemies;
}

function getDungeonFloorEnemyCap(profile, playerCount = 1, config = {}) {
  const base = Math.max(24, Math.floor(Number(profile?.maxEncounterEnemies || 60)));
  const multiplier = getDungeonEnemyCountMultiplier(playerCount);
  const floorPressure = 1 + Math.min(0.16, Math.max(0, Number(config?.depth || 1) - 1) * 0.035);
  const performanceCap = profile?.id === 'story' ? 320 : profile?.id === 'major' ? 240 : 180;
  return Math.min(performanceCap, Math.ceil(base * multiplier * floorPressure));
}

function getDungeonEnemyCountMultiplier(playerCount = 1) {
  const safe = Math.max(1, Math.min(4, Math.floor(Number(playerCount || 1))));
  return DUNGEON_PLAYER_COUNT_MULTIPLIERS[safe] || 1;
}

function getDungeonScaledEnemyCount(baseCount, playerCount = 1, options = {}) {
  const base = Math.max(0, Math.floor(Number(baseCount || 0)));
  if (base <= 0) return 0;

  const scaled = Math.max(base, Math.round(base * getDungeonEnemyCountMultiplier(playerCount)));
  const cap = Number.isFinite(Number(options.cap))
    ? Math.max(base, Math.floor(Number(options.cap)))
    : scaled;
  const min = Number.isFinite(Number(options.min))
    ? Math.max(0, Math.floor(Number(options.min)))
    : base;

  return Math.max(min, Math.min(cap, scaled));
}

function chooseDungeonEnemyPackTemplate(room, config, bossApproach = false, rng = Math.random) {
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const size = getDungeonRoomSize(room);
  const role = room?.role || 'combat';

  if (role === 'locked') return { id: 'locked_guard', pattern: ['melee', 'melee', 'tough', 'ranged', 'melee', 'support'], eliteSlots: new Set(depth >= 2 ? [0] : []), bonus: 1 };
  if (role === 'miniBoss') return { id: 'mini_boss_pack', pattern: ['brute', 'melee', 'melee', 'ranged', 'support'], eliteSlots: new Set([0]), bonus: 0 };
  if (role === 'elite') return { id: 'elite_pack', pattern: ['elite', 'melee', 'melee', 'ranged', 'melee', 'support'], eliteSlots: new Set([0]), bonus: 1 };
  if (role === 'trap') return { id: 'trap_swarm', pattern: ['exploder', 'melee', 'exploder', 'melee', 'ranged'], eliteSlots: new Set(depth >= 3 ? [1] : []), bonus: 0 };
  if (role === 'ambush') return { id: 'ambush_pack', pattern: ['melee', 'melee', 'ranged', 'fast', 'melee', 'support'], eliteSlots: new Set(depth >= 3 ? [0] : []), bonus: 1 };
  if (role === 'treasure' || role === 'sideTreasure') return { id: 'treasure_guard', pattern: ['melee', 'tough', 'ranged', 'melee', 'support'], eliteSlots: new Set(depth >= 3 ? [1] : []), bonus: 0 };
  if (role === 'resourceRoom') return { id: 'resource_guard', pattern: ['melee', 'melee', 'fast', 'ranged'], eliteSlots: new Set(), bonus: 0 };
  if (bossApproach || role === 'floorApproach' || role === 'bossApproach') return { id: 'pre_boss_pack', pattern: ['tough', 'melee', 'melee', 'ranged', 'support', 'melee', 'fast'], eliteSlots: new Set(depth >= 2 ? [0] : []), bonus: 1 };
  if (role === 'puzzle' || role === 'lore') return { id: 'light_guard', pattern: ['melee', 'ranged', 'melee'], eliteSlots: new Set(), bonus: 0 };
  if (role === 'quiet' || role === 'shrine') return { id: 'quiet_guard', pattern: ['melee'], eliteSlots: new Set(), bonus: 0 };

  if (size === 'large') {
    const roll = rng();
    if (roll < 0.34) return { id: 'large_mixed_pack', pattern: ['melee', 'melee', 'ranged', 'tough', 'melee', 'support', 'fast'], eliteSlots: new Set(depth >= 3 ? [3] : []), bonus: 1 };
    if (roll < 0.64) return { id: 'swarm_pack', pattern: ['fast', 'melee', 'fast', 'melee', 'melee', 'ranged', 'fast'], eliteSlots: new Set(), bonus: 2 };
    return { id: 'guard_pack', pattern: ['tough', 'melee', 'melee', 'ranged', 'support', 'melee'], eliteSlots: new Set(depth >= 2 ? [0] : []), bonus: 1 };
  }

  if (size === 'medium') {
    return rng() < 0.55
      ? { id: 'mixed_pack', pattern: ['melee', 'melee', 'ranged', 'support', 'melee'], eliteSlots: new Set(depth >= 3 ? [2] : []), bonus: 0 }
      : { id: 'basic_melee_pack', pattern: ['melee', 'melee', 'fast', 'melee'], eliteSlots: new Set(), bonus: 0 };
  }

  return { id: 'small_basic_pack', pattern: ['melee', 'fast', 'melee', 'ranged'], eliteSlots: new Set(), bonus: 0 };
}

function getDungeonPackEnemyKind(template, enemyKinds, room, templateIndex, globalIndex, config = {}) {
  if (room?.role === 'trap' && templateIndex % 2 === 0) return 'exploder';
  if (room?.role === 'miniBoss' && templateIndex === 0) return 'brute';

  const token = template?.pattern?.[templateIndex % Math.max(1, template.pattern.length)] || 'melee';
  const kinds = Array.isArray(enemyKinds) && enemyKinds.length ? enemyKinds : ['basicBeast', 'hollowling', 'shieldKnight'];

  if (token === 'elite') return chooseDungeonKindByArchetype(kinds, ['shieldKnight', 'brute', 'wraith', 'gravebound', 'veyrWraith'], globalIndex);
  if (token === 'tough' || token === 'brute') return chooseDungeonKindByArchetype(kinds, ['brute', 'shieldKnight', 'gravebound'], globalIndex);
  if (token === 'ranged' || token === 'support') return chooseDungeonKindByArchetype(kinds, ['archer', 'cultist', 'gravePriest', 'wraith'], globalIndex);
  if (token === 'fast') return chooseDungeonKindByArchetype(kinds, ['stalkerWolf', 'ashWolf', 'wraith', 'veyrWraith', 'exploder'], globalIndex);
  if (token === 'exploder') return kinds.includes('exploder') ? 'exploder' : chooseDungeonKindByArchetype(kinds, ['basicBeast', 'hollowling', 'stalkerWolf'], globalIndex);

  return chooseDungeonKindByArchetype(kinds, ['basicBeast', 'hollowling', 'demonCultist', 'roadlessBandit', 'gravebound', 'shieldKnight'], globalIndex);
}

function chooseDungeonKindByArchetype(kinds, preferred, index = 0) {
  for (const kind of preferred) {
    if (kinds.includes(kind)) return kind;
  }

  return kinds[Math.abs(index) % kinds.length] || 'basicBeast';
}

function getDungeonRoomArea(room) {
  return Math.max(1, Number(room?.w || 1) * Number(room?.h || 1));
}

function getDungeonRoomSize(room) {
  const area = getDungeonRoomArea(room);
  if (area > 480) return 'large';
  if (area > 300) return 'medium';
  return 'small';
}

function findDungeonRoomEnemySpawnTile(room, existingEnemies, rng, spawnIndex, count, options = {}) {
  const margin = options.bossApproach ? 4 : 3;
  const minX = room.x + 2;
  const maxX = room.x + room.w - 3;
  const minY = room.y + 2;
  const maxY = room.y + room.h - 3;
  const ring = Math.max(2, Math.min(room.w, room.h) * 0.28);
  const minSpacing = options.role === 'miniBoss' || options.role === 'elite' ? TILE * 2.5 : TILE * 1.75;

  let best = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 28; attempt++) {
    const angle = (Math.PI * 2 * (spawnIndex + attempt * 0.37)) / Math.max(1, count);
    const radial = attempt < 8
      ? ring + (attempt % 3)
      : rng() * Math.max(2, Math.min(room.w, room.h) * 0.42);
    const randomJitterX = attempt < 8 ? 0 : (rng() - 0.5) * Math.max(2, room.w * 0.32);
    const randomJitterY = attempt < 8 ? 0 : (rng() - 0.5) * Math.max(2, room.h * 0.32);
    const x = clampInt(room.cx + Math.cos(angle) * radial + randomJitterX, minX + margin - 2, maxX - margin + 2);
    const y = clampInt(room.cy + Math.sin(angle) * radial + randomJitterY, minY + margin - 2, maxY - margin + 2);
    const score = getDungeonSpawnSpacingScore(x, y, existingEnemies, minSpacing);

    if (score > bestScore) {
      best = { x, y };
      bestScore = score;
    }

    if (score >= minSpacing * 1.6) return { x, y };
  }

  return best || {
    x: clampInt(room.cx + (spawnIndex % 3 - 1) * 2, minX, maxX),
    y: clampInt(room.cy + (Math.floor(spawnIndex / 3) % 3 - 1) * 2, minY, maxY)
  };
}

function getDungeonSpawnSpacingScore(tileX, tileY, existingEnemies, minSpacing) {
  const x = tileX * TILE;
  const y = tileY * TILE;
  let nearest = Infinity;

  for (const enemy of existingEnemies || []) {
    if (!enemy || enemy.dead || enemy.remove) continue;
    nearest = Math.min(nearest, Math.hypot(Number(enemy.x || 0) - x, Number(enemy.y || 0) - y));
  }

  return nearest === Infinity ? minSpacing * 2 : nearest;
}

function getDungeonRoomEnemyCount(room, config, bossApproach = false, template = null) {
  const tier = Math.max(1, Math.floor(config.tier || 1));
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const area = getDungeonRoomArea(room);
  const size = getDungeonRoomSize(room);
  const pressure = Math.min(4, Math.floor((tier + depth) / 3));
  const largeRoomBonus = size === 'large' ? 3 : size === 'medium' ? 1 : 0;
  const templateBonus = Math.max(0, Number(template?.bonus || 0));

  if (room.role === 'shrine') return depth >= 3 ? 1 : 0;
  if (room.role === 'quiet') return depth >= 3 && area > 300 ? 1 : 0;
  if (room.role === 'locked') return clampInt(5 + pressure + largeRoomBonus, 5, 10);
  if (room.role === 'sideTreasure' || room.role === 'treasure') return clampInt(3 + pressure + largeRoomBonus, 3, 8);
  if (room.role === 'resourceRoom') return clampInt(3 + Math.floor(pressure / 2) + largeRoomBonus, 3, 7);
  if (room.role === 'puzzle') return clampInt(1 + Math.floor(pressure / 2), 1, 4);
  if (room.role === 'lore') return clampInt(1 + Math.floor(pressure / 2), 1, 3);
  if (room.role === 'elite') return clampInt(4 + pressure + largeRoomBonus, 4, 9);
  if (room.role === 'miniBoss') return clampInt(4 + Math.floor(pressure / 2) + largeRoomBonus, 4, 8);
  if (room.role === 'trap') return clampInt(4 + pressure + largeRoomBonus, 4, 9);
  if (room.role === 'ambush') return clampInt(4 + pressure + largeRoomBonus + templateBonus, 4, 10);
  if (bossApproach || room.role === 'floorApproach') return clampInt(6 + pressure + largeRoomBonus, 6, 12);

  if (size === 'large') return clampInt(7 + pressure + templateBonus, 6, 10);
  if (size === 'medium') return clampInt(5 + pressure + templateBonus, 4, 7);
  return clampInt(3 + Math.floor(pressure / 2) + templateBonus, 2, 4);
}

function getDungeonRoomEnemyMin(room, bossApproach = false) {
  if (room?.role === 'shrine') return 0;
  if (room?.role === 'quiet') return 0;
  if (room?.role === 'locked') return 5;
  if (room?.role === 'sideTreasure' || room?.role === 'treasure') return 3;
  if (room?.role === 'miniBoss') return 4;
  if (room?.role === 'elite') return 4;
  if (bossApproach || room?.role === 'floorApproach') return 6;
  if (room?.role === 'resourceRoom' || room?.role === 'ambush' || room?.role === 'trap') return 3;
  if (room?.role === 'puzzle' || room?.role === 'lore') return 1;
  return 2;
}

function getDungeonRoomEnemyCap(room, bossApproach = false, playerCount = 1) {
  const area = Math.max(1, Number(room?.w || 1) * Number(room?.h || 1));
  const coOpBonus = Math.max(0, playerCount - 1);

  if (room?.role === 'shrine' || room?.role === 'quiet') return playerCount >= 3 ? 2 : 1;
  if (room?.role === 'locked') return Math.min(16, 10 + coOpBonus * 2);
  if (room?.role === 'elite' || room?.role === 'miniBoss') return Math.min(15, 9 + coOpBonus * 2);
  if (room?.role === 'trap' || room?.role === 'ambush') return Math.min(16, 10 + coOpBonus * 2);
  if (room?.role === 'treasure' || room?.role === 'sideTreasure' || room?.role === 'resourceRoom') return Math.min(14, 8 + coOpBonus * 2);
  if (room?.role === 'puzzle' || room?.role === 'lore') return Math.min(8, 4 + coOpBonus);
  if (bossApproach || room?.role === 'floorApproach') return area > 420 ? Math.min(20, 12 + coOpBonus * 3) : Math.min(16, 10 + coOpBonus * 2);
  if (area > 480) return Math.min(22, 14 + coOpBonus * 3);
  if (area > 300) return Math.min(16, 10 + coOpBonus * 2);
  return Math.min(10, 6 + coOpBonus * 2);
}

function addDungeonCorridorPatrols(enemies, halls, rooms, config, enemyKinds, rng, startIndex, maxEnemies, playerCount) {
  if (!Array.isArray(halls) || !halls.length) return startIndex;

  let index = startIndex;
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const entrance = rooms?.[0] || null;
  const finalRoom = rooms?.[rooms.length - 1] || null;
  const maxPatrolHalls = clampInt(Math.ceil(halls.length * (depth >= 3 ? 0.52 : 0.38)), 2, Math.max(2, Math.floor(halls.length * 0.65)));
  let patrolHalls = 0;

  const orderedHalls=[...halls].sort((a,b)=>(Math.abs(b.ax-b.bx)+Math.abs(b.ay-b.by))-(Math.abs(a.ax-a.bx)+Math.abs(a.ay-a.by)));
  for (let hallIndex = 0; hallIndex < orderedHalls.length && index < maxEnemies; hallIndex++) {
    const hall = orderedHalls[hallIndex];
    if (!hall) continue;

    const distanceFromEntrance = entrance
      ? Math.min(distanceTiles(hall.ax, hall.ay, entrance.cx, entrance.cy), distanceTiles(hall.bx, hall.by, entrance.cx, entrance.cy))
      : 99;
    const touchesFinal = finalRoom && (
      distanceTiles(hall.ax, hall.ay, finalRoom.cx, finalRoom.cy) < 7 ||
      distanceTiles(hall.bx, hall.by, finalRoom.cx, finalRoom.cy) < 7
    );

    const longHall=(Math.abs(hall.ax-hall.bx)+Math.abs(hall.ay-hall.by))*TILE/205>20;
    if (!longHall&&distanceFromEntrance < 8 && depth <= 2) continue;

    const patrolChance = touchesFinal ? 0.76 : depth >= 3 ? 0.56 : 0.42;
    if (!longHall&&(patrolHalls >= maxPatrolHalls || rng() > patrolChance)) continue;

    const baseCount = touchesFinal ? 3 : longHall||hall.width >= 5 ? 2 : 1;
    const count = Math.min(maxEnemies - index, getDungeonScaledEnemyCount(baseCount, playerCount, {
      min: touchesFinal ? 2 : 1,
      cap: getDungeonCorridorEnemyCap(hall, playerCount, touchesFinal)
    }));

    for (let i = 0; i < count; i++) {
      const spawn = findDungeonHallEnemySpawnTile(hall, enemies, rng, i, count);
      const kind = getDungeonCorridorEnemyKind(enemyKinds, i, index, touchesFinal);
      const elite = shouldPromoteDungeonCorridorElite(hall, i, index, config, touchesFinal, playerCount);

      enemies.push(makeDungeonEnemy(kind, getDungeonEnemyName(kind, config), spawn.x, spawn.y, index, {
        ...config,
        roomRole: touchesFinal ? 'preBossPatrol' : 'corridorPatrol',
        roomId: hall.id,
        bossApproach: touchesFinal,
        corridorPatrol: true,
        elite,
        densityVersion: DUNGEON_DENSITY_VERSION
      }));
      index++;
    }

    patrolHalls++;
  }

  return index;
}

function getDungeonCorridorEnemyCap(hall, playerCount = 1, strong = false) {
  const base = strong ? 4 : Number(hall?.width || 3) >= 5 ? 3 : 2;
  return Math.min(strong ? 8 : 6, base + Math.max(0, playerCount - 1));
}

function findDungeonHallEnemySpawnTile(hall, existingEnemies, rng, spawnIndex, count) {
  const t = count <= 1
    ? 0.5
    : 0.25 + (spawnIndex / Math.max(1, count - 1)) * 0.5;
  const bendFirst = !!hall.bendFirst;
  const bend = {
    x: bendFirst ? hall.bx : hall.ax,
    y: bendFirst ? hall.ay : hall.by
  };
  const segment = spawnIndex % 2 === 0 ? 0 : 1;
  const ax = segment === 0 ? hall.ax : bend.x;
  const ay = segment === 0 ? hall.ay : bend.y;
  const bx = segment === 0 ? bend.x : hall.bx;
  const by = segment === 0 ? bend.y : hall.by;
  const jitter = Math.max(1, Math.floor(Number(hall.width || 3) / 2));

  let best = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 18; attempt++) {
    const total=Math.abs(hall.ax-hall.bx)+Math.abs(hall.ay-hall.by),first=Math.abs(hall.ax-bend.x)+Math.abs(hall.ay-bend.y);
    const lerp=total*TILE/205>20?clampNumber((spawnIndex+1)/(count+1)+(rng()-.5)*.06,.15,.85):clampNumber(t+(rng()-.5)*.2,.18,.82);
    const along=lerp*total,onFirst=along<=first,fraction=onFirst?along/Math.max(1,first):(along-first)/Math.max(1,total-first);
    const start=onFirst?{x:hall.ax,y:hall.ay}:bend,end=onFirst?bend:{x:hall.bx,y:hall.by};
    const x = Math.round(start.x+(end.x-start.x)*fraction+randInt(rng,-jitter,jitter));
    const y = Math.round(start.y+(end.y-start.y)*fraction+randInt(rng,-jitter,jitter));
    const score = getDungeonSpawnSpacingScore(x, y, existingEnemies, TILE * 1.7);

    if (score > bestScore) {
      best = { x, y };
      bestScore = score;
    }
  }

  return best || {
    x: Math.round((hall.ax + hall.bx) / 2),
    y: Math.round((hall.ay + hall.by) / 2)
  };
}

function getDungeonCorridorEnemyKind(enemyKinds, patrolIndex, globalIndex, strong = false) {
  if (strong && patrolIndex === 0) return chooseDungeonKindByArchetype(enemyKinds, ['shieldKnight', 'brute', 'gravebound'], globalIndex);
  if (patrolIndex === 1) return chooseDungeonKindByArchetype(enemyKinds, ['archer', 'cultist', 'gravePriest', 'wraith'], globalIndex);
  return chooseDungeonKindByArchetype(enemyKinds, ['basicBeast', 'hollowling', 'stalkerWolf', 'ashWolf', 'demonCultist', 'roadlessBandit'], globalIndex);
}

function shouldPromoteDungeonCorridorElite(hall, patrolIndex, globalIndex, config, strong = false, playerCount = 1) {
  if (patrolIndex !== 0) return false;

  const depth = Math.max(1, Math.floor(config.depth || 1));
  if (!strong && depth < 3 && playerCount < 3) return false;

  const chance = strong
    ? 0.28 + Math.min(0.18, depth * 0.035)
    : 0.08 + Math.min(0.18, (depth - 1) * 0.04) + Math.max(0, playerCount - 1) * 0.025;

  return deterministicDungeonChance(`${config.seed}-${hall?.id || 'hall'}-${globalIndex}`, chance);
}

function makeDungeonEnemy(kind, name, tx, ty, index, config = {}) {
  const tier = Math.max(1, Math.floor(config.tier || 1));
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const scale = 1 + (tier - 1) * 0.35 + (depth - 1) * 0.18;
  const threatProfile = getDungeonThreatProfile(config);
  const floorThreat = getDungeonFloorThreat(depth);

  const baseStats = getDungeonEnemyBaseStats(kind);
  const boss = !!config.boss;
  const elite = !!config.elite;
  const miniBoss = !!config.miniBoss;
  const roleThreat = getDungeonRoleThreat({
    boss,
    elite,
    miniBoss,
    roomRole: config.roomRole,
    bossApproach: config.bossApproach
  });
  const bossType = boss && isVeyrWardenConfig(config, name)
    ? 'veyrWarden'
    : boss
      ? getThemeBossType(config.theme)
      : null;
  const demonLord = bossType === 'demonLord';

  const bossScale = demonLord ? 4.35 : boss ? 2.8 : miniBoss ? 1.72 : elite ? 1.4 : 1;
  const dungeonDifficultyScale = 1.12 + Math.min(0.28, (tier + depth) * 0.025);

  const playerCount = Math.max(1, Math.min(4, Math.floor(Number(config.playerCount || 1))));
  const maxHp = Math.floor(baseStats.maxHp * scale * bossScale * dungeonDifficultyScale * floorThreat.health * threatProfile.health * roleThreat.health);
  const damage = Math.floor(baseStats.damage * scale * (demonLord ? 2.35 : boss ? 1.85 : miniBoss ? 1.35 : elite ? 1.2 : 1.1) * floorThreat.damage * threatProfile.damage * roleThreat.damage);
  const xp = Math.floor(baseStats.xp * scale * (demonLord ? 5.2 : boss ? 3.4 : miniBoss ? 2.0 : elite ? 1.55 : 1));
  const eliteModifier = elite || miniBoss
    ? chooseDungeonEliteModifier(kind, index)
    : config.trapSpawn && index % 3 === 0
      ? 'swift'
      : null;
  const chargeAttackKind = chooseDungeonChargeAttack(kind, config, {
    elite,
    miniBoss,
    boss,
    bossApproach: !!config.bossApproach,
    index,
    threatProfile
  });
  const threatLevel = Math.max(1, depth + tier + (elite ? 1 : 0) + (miniBoss ? 2 : 0) + (config.bossApproach ? 1 : 0));

  return configureEncounterEnemy(applyCoopBossHealthScaling(applyCoopAggroRange(applyEnemyStrengthScaling({
    id: `dungeon-${config.dungeonId || 'dungeon'}-${kind}-${index}`,
    kind,
    name: boss
      ? name || baseStats.bossName || 'Dungeon Warden'
      : miniBoss
        ? getDungeonMiniBossName(config, kind)
        : elite
          ? name || baseStats.name || 'Enemy'
          : name,

    x: tx * TILE,
    y: ty * TILE,

    r: baseStats.r,
    radius: baseStats.r,

    hp: maxHp,
    maxHp,
    dmg: damage,
    damage,
    xp,
    speed: Math.round(baseStats.speed * floorThreat.speed * threatProfile.speed * roleThreat.speed),

    aggro: 0,
    aggroRange: baseStats.aggroRange,
    attackRange: baseStats.attackRange,
    attackRate: baseStats.attackRate,
    attackCd: 0,
    attackCooldown: 0,

    slowUntil: 0,
    rootUntil: 0,
    alive: true,
    dead: false,
    remove: false,

    isBoss: boss,
    isDungeonMainBoss: boss && !!config.isFinalFloor,
    miniBoss,
    eliteModifier,
    archetype: getArchetypeForDungeonKind(kind),
    roomRole: config.roomRole || null,
    roomId: config.roomId || null,
    packTemplate: config.packTemplate || null,
    corridorPatrol: !!config.corridorPatrol,
    dungeonDensityVersion: config.densityVersion || DUNGEON_DENSITY_VERSION,
    miniBossId: config.miniBossId || null,
    dungeonEnemy: true,
    dungeonDepth: depth,
    dungeonTier: tier,
    dungeonThreatLevel: threatLevel,
    dungeonThreatProfile: threatProfile.id,
    homeX: tx * TILE,
    homeY: ty * TILE,
    homeGuard: true,
    leashRadius: getDungeonLeashRadius(config.roomRole, boss, miniBoss, elite),
    enemyState: 'idle',
    hasDetectedPlayer: false,
    isInCombat: false,
    persistentDungeonAggro: false,
    ignoreLeash: false,
    homeReturnDisabled: false,
    lastKnownTargetPosition: null,
    staggerResistance: Math.min(0.72, roleThreat.staggerResistance + floorThreat.staggerResistance + threatProfile.staggerResistance),
    chargeThreat: !!chargeAttackKind,
    chargeAttackKind,
    chargeColor: chargeAttackKind ? getDungeonChargeColor(chargeAttackKind, threatProfile.id) : null,
    bossName: boss ? name || baseStats.bossName || 'Dungeon Warden' : null,
    bossType,
    coopScaledPlayerCount: playerCount,
    bossId: bossType === 'veyrWarden'
      ? 'theVeyrWarden'
      : bossType === 'demonLord'
        ? 'malakarSolgateDemonLord'
        : bossType === 'seraphel'
          ? 'seraphelTheUncrowned'
          : bossType === 'zephyrLight'
            ? 'zephyrLight'
            : null
  }), baseStats.aggroRange), playerCount),dungeonEncounterProfile(config),`${config.seed||config.dungeonId}:${config.floor||1}:${kind}:${index}`,{dungeon:true,confined:!!config.corridorPatrol});
}

function shouldPromoteDungeonFloorElite(room, roomEnemyIndex, globalEnemyIndex, config, bossApproach, playerCount = 1, template = null) {
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const area = getDungeonRoomArea(room);
  const eliteLimit = getDungeonRoomEliteLimit(room, bossApproach, playerCount);

  if (roomEnemyIndex >= eliteLimit) return false;
  if (room.role === 'shrine' || room.role === 'quiet' || room.role === 'puzzle' && depth < 3) return false;
  if (room.role === 'trap' && roomEnemyIndex > 0) return false;
  if (template?.eliteSlots?.has(roomEnemyIndex)) return true;
  if (bossApproach && depth >= 2 && roomEnemyIndex === 0) return true;
  if (room.role === 'locked' && roomEnemyIndex === 0) return depth >= 2 || deterministicDungeonChance(`${config.seed}-${room.id}-locked`, 0.55);
  if (room.role === 'elite' && roomEnemyIndex === 0) return true;
  if (room.role === 'miniBoss' && roomEnemyIndex === 0) return true;

  let chance = 0.1 + Math.max(0, depth - 1) * 0.07 + Math.max(0, playerCount - 1) * 0.035;

  if (area > 480) chance += 0.08;
  if (room.role === 'sideTreasure' || room.role === 'treasure') chance += 0.08;
  if (room.role === 'ambush' || room.role === 'resourceRoom') chance += 0.05;
  if (roomEnemyIndex > 0) chance *= 0.45;

  return deterministicDungeonChance(`${config.seed}-${room.id}-${globalEnemyIndex}-${roomEnemyIndex}`, Math.min(0.46, chance));
}

function getDungeonRoomEliteLimit(room, bossApproach = false, playerCount = 1) {
  if (room?.role === 'miniBoss') return 1;
  if (room?.role === 'elite') return playerCount >= 3 || getDungeonRoomArea(room) > 480 ? 2 : 1;
  if (bossApproach || room?.role === 'floorApproach' || room?.role === 'bossApproach') return playerCount >= 3 ? 2 : 1;
  if (room?.role === 'locked') return playerCount >= 4 ? 2 : 1;
  if (getDungeonRoomArea(room) > 520 && playerCount >= 3) return 2;
  return 1;
}

function getDungeonFloorThreat(depth) {
  const floor = Math.max(1, Math.min(4, Math.floor(depth || 1)));
  if (floor >= 4) {
    return { health: 1.38, damage: 1.18, speed: 1.08, staggerResistance: 0.16 };
  }
  if (floor === 3) {
    return { health: 1.26, damage: 1.12, speed: 1.06, staggerResistance: 0.11 };
  }
  if (floor === 2) {
    return { health: 1.14, damage: 1.07, speed: 1.03, staggerResistance: 0.06 };
  }
  return { health: 1.08, damage: 1.03, speed: 1, staggerResistance: 0.03 };
}

function getDungeonRoleThreat({ boss, elite, miniBoss, roomRole, bossApproach }) {
  if (boss) return { health: 1.18, damage: 1.08, speed: 1, staggerResistance: 0.2 };
  if (miniBoss) return { health: 1.32, damage: 1.14, speed: 1.02, staggerResistance: 0.2 };
  if (roomRole === 'bossGuard') return { health: 1.28, damage: 1.13, speed: 1.05, staggerResistance: 0.18 };
  if (elite) return { health: 1.22, damage: 1.1, speed: 1.05, staggerResistance: 0.16 };
  if (bossApproach) return { health: 1.16, damage: 1.08, speed: 1.03, staggerResistance: 0.09 };
  if (roomRole === 'elite') return { health: 1.18, damage: 1.08, speed: 1.03, staggerResistance: 0.12 };
  if (roomRole === 'trap') return { health: 1.06, damage: 1.12, speed: 1.08, staggerResistance: 0.04 };
  return { health: 1, damage: 1, speed: 1, staggerResistance: 0 };
}

function getDungeonThreatProfile(config) {
  const text = `${config?.dungeonId || ''} ${config?.poiId || ''} ${config?.entranceId || ''} ${config?.name || ''} ${config?.theme || ''}`.toLowerCase();

  if (text.includes('castleveyr') || text.includes('castle veyr') || text.includes('veyr')) {
    return { id: 'castleVeyr', health: 1.16, damage: 1.1, speed: 1.04, staggerResistance: 0.08 };
  }

  if (text.includes('redseal') || text.includes('red seal') || text.includes('demoncult') || text.includes('demon cult') || text.includes('dawnspireroot') || text.includes('dawnspire') || text.includes('emberveil') || text.includes('ember veil')) {
    return { id: text.includes('dawnspire') || text.includes('demoncult') ? 'dawnspire' : 'redSeal', health: 1.18, damage: 1.12, speed: 1.05, staggerResistance: 0.07 };
  }

  if (text.includes('cambion')) {
    return { id: 'cambion', health: 1.12, damage: 1.13, speed: 1.06, staggerResistance: 0.06 };
  }

  if (text.includes('nephilim')) {
    return { id: 'nephilim', health: 1.14, damage: 1.1, speed: 1.03, staggerResistance: 0.09 };
  }

  if (text.includes('vampire') || text.includes('chalice') || text.includes('crypt')) {
    return { id: 'vampire', health: 1.11, damage: 1.11, speed: 1.08, staggerResistance: 0.05 };
  }

  if (config?.theme === 'thorn') {
    return { id: 'thorn', health: 1.08, damage: 1.06, speed: 1.04, staggerResistance: 0.04 };
  }

  return { id: config?.theme || 'generic', health: 1.06, damage: 1.04, speed: 1.02, staggerResistance: 0.03 };
}

function chooseDungeonChargeAttack(kind, config, context = {}) {
  if (context.boss) return null;

  const archetype = getArchetypeForDungeonKind(kind);
  const depth = Math.max(1, Math.floor(config.depth || 1));
  const profileId = context.threatProfile?.id || getDungeonThreatProfile(config).id;
  const forceThreat = context.elite || context.miniBoss || context.bossApproach || depth >= 3;
  const chargeCapable =
    archetype === 'shieldKnight' ||
    archetype === 'brute' ||
    archetype === 'stalkerWolf' ||
    archetype === 'wraith' ||
    archetype === 'basicBeast' ||
    kind === 'demonCultist' ||
    kind === 'gravebound' ||
    kind === 'veyrWraith';

  if (!chargeCapable) return null;
  if (!forceThreat && (context.index + depth) % 3 !== 0) return null;

  if (profileId === 'redSeal' || profileId === 'dawnspire' || profileId === 'cambion') {
    if (archetype === 'shieldKnight') return 'shieldCharge';
    if (archetype === 'brute' || kind === 'demonCultist') return 'infernalRush';
  }

  if (profileId === 'castleVeyr' || profileId === 'vampire') {
    if (archetype === 'wraith' || kind === 'veyrWraith') return 'spectralLunge';
    if (archetype === 'shieldKnight' || kind === 'gravebound') return 'duelistThrust';
  }

  if (profileId === 'nephilim') return 'judgmentCharge';
  if (profileId === 'thorn') return 'rootBurrowCharge';
  if (archetype === 'shieldKnight') return 'shieldCharge';
  if (archetype === 'wraith') return 'spectralLunge';
  return 'chargeRush';
}

function getDungeonChargeColor(chargeAttackKind, profileId) {
  if (chargeAttackKind === 'shieldCharge') return profileId === 'redSeal' || profileId === 'dawnspire' ? '#ef6f6c' : '#d9ad4f';
  if (chargeAttackKind === 'duelistThrust') return '#b8c7d8';
  if (chargeAttackKind === 'spectralLunge') return '#8fb6ff';
  if (chargeAttackKind === 'infernalRush') return '#ef6f3e';
  if (chargeAttackKind === 'rootBurrowCharge') return '#73d18a';
  if (chargeAttackKind === 'judgmentCharge') return '#fff1b8';
  return '#ef8b58';
}

function getDungeonLeashRadius(roomRole, boss, miniBoss, elite) {
  if (boss) return 1000;
  if (miniBoss || roomRole === 'bossGuard') return 620;
  if (elite || roomRole === 'elite') return 560;
  return 470;
}

function getArchetypeForDungeonKind(kind) {
  if (kind === 'hollowling') return 'basicBeast';
  if (kind === 'ashWolf') return 'stalkerWolf';
  if (kind === 'gravebound') return 'shieldKnight';
  if (kind === 'veyrWraith') return 'wraith';
  if (kind === 'demonCultist') return 'cultist';
  if (kind === 'roadlessBandit') return 'archer';
  return kind;
}

function chooseDungeonEliteModifier(kind, index) {
  const mods = ['armoured', 'swift', 'blink', 'vampiric', 'burning', 'charger', 'frozen', 'poisoned', 'summoner', 'fleeing'];
  if (kind === 'gravebound') return 'armoured';
  if (kind === 'veyrWraith') return 'vampiric';
  if (kind === 'wraith') return 'blink';
  if (kind === 'stalkerWolf' || kind === 'ashWolf') return 'charger';
  if (kind === 'gravePriest' || kind === 'cultist') return 'summoner';
  return mods[index % mods.length];
}

function eliteModifierLabel(modifier) {
  if (modifier === 'armoured') return 'Armoured';
  if (modifier === 'swift') return 'Swift';
  if (modifier === 'blink') return 'Blink';
  if (modifier === 'vampiric') return 'Vampiric';
  if (modifier === 'burning') return 'Burning';
  if (modifier === 'charger') return 'Charging';
  if (modifier === 'frozen') return 'Frozen';
  if (modifier === 'poisoned') return 'Poisoned';
  if (modifier === 'summoner') return 'Rune-Mad';
  if (modifier === 'fleeing') return 'Relic-Bearer';
  return 'Elite';
}

function getThemeBossType(theme) {
  if (theme === 'demon' || theme === 'cult') return 'demonLord';
  if (theme === 'holy') return 'seraphel';
  if (theme === 'cosmic') return 'zephyrLight';
  if (theme === 'thorn') return 'hollowElk';
  return 'dungeonWarden';
}

function getDungeonEnemyBaseStats(kind) {
  if (kind === 'basicBeast') {
    return {
      maxHp: 54,
      damage: 7,
      xp: 28,
      speed: 72,
      r: 15,
      aggroRange: 245,
      attackRange: 27,
      attackRate: 0.95
    };
  }

  if (kind === 'stalkerWolf') {
    return {
      maxHp: 62,
      damage: 9,
      xp: 36,
      speed: 84,
      r: 15,
      aggroRange: 285,
      attackRange: 34,
      attackRate: 1.05
    };
  }

  if (kind === 'shieldKnight') {
    return {
      maxHp: 118,
      damage: 13,
      xp: 70,
      speed: 40,
      r: 17,
      aggroRange: 255,
      attackRange: 34,
      attackRate: 1.25
    };
  }

  if (kind === 'archer') {
    return {
      maxHp: 58,
      damage: 9,
      xp: 46,
      speed: 63,
      r: 14,
      aggroRange: 360,
      attackRange: 250,
      attackRate: 1.35
    };
  }

  if (kind === 'cultist') {
    return {
      maxHp: 70,
      damage: 11,
      xp: 56,
      speed: 50,
      r: 15,
      aggroRange: 330,
      attackRange: 220,
      attackRate: 1.45
    };
  }

  if (kind === 'gravePriest') {
    return {
      maxHp: 84,
      damage: 8,
      xp: 68,
      speed: 42,
      r: 15,
      aggroRange: 310,
      attackRange: 190,
      attackRate: 1.55
    };
  }

  if (kind === 'brute') {
    return {
      maxHp: 160,
      damage: 17,
      xp: 82,
      speed: 34,
      r: 21,
      aggroRange: 255,
      attackRange: 45,
      attackRate: 1.7
    };
  }

  if (kind === 'wraith') {
    return {
      maxHp: 72,
      damage: 15,
      xp: 72,
      speed: 74,
      r: 15,
      aggroRange: 330,
      attackRange: 34,
      attackRate: 1.05
    };
  }

  if (kind === 'exploder') {
    return {
      maxHp: 50,
      damage: 18,
      xp: 40,
      speed: 92,
      r: 15,
      aggroRange: 300,
      attackRange: 50,
      attackRate: 1.0
    };
  }

  if (kind === 'ashWolf') {
    return {
      maxHp: 58,
      damage: 8,
      xp: 32,
      speed: 76,
      r: 15,
      aggroRange: 250,
      attackRange: 26,
      attackRate: 0.95
    };
  }

  if (kind === 'gravebound') {
    return {
      maxHp: 96,
      damage: 13,
      xp: 62,
      speed: 42,
      r: 16,
      aggroRange: 235,
      attackRange: 27,
      attackRate: 1.18
    };
  }

  if (kind === 'demonCultist') {
    return {
      maxHp: 82,
      damage: 12,
      xp: 54,
      speed: 58,
      r: 15,
      aggroRange: 250,
      attackRange: 28,
      attackRate: 1.0
    };
  }

  if (kind === 'veyrWraith') {
    return {
      maxHp: 74,
      damage: 14,
      xp: 64,
      speed: 64,
      r: 15,
      aggroRange: 270,
      attackRange: 30,
      attackRate: 0.92
    };
  }

  if (kind === 'roadlessBandit') {
    return {
      maxHp: 64,
      damage: 9,
      xp: 38,
      speed: 66,
      r: 14,
      aggroRange: 240,
      attackRange: 25,
      attackRate: 0.9
    };
  }

  return {
    maxHp: 42,
    damage: 6,
    xp: 20,
    speed: 50,
    r: 14,
    aggroRange: 220,
    attackRange: 24,
    attackRate: 1.05
  };
}

// -----------------------------------------------------------------------------
// THEME / TILE HELPERS
// -----------------------------------------------------------------------------

function getDungeonScaleProfile(config = {}) {
  if (config.classification && DUNGEON_CLASSIFICATIONS[config.classification]) {
    return DUNGEON_SCALE_PROFILES[DUNGEON_CLASSIFICATIONS[config.classification].scale] || DUNGEON_SCALE_PROFILES.minor;
  }

  const text = [
    config.dungeonId,
    config.poiId,
    config.entranceId,
    config.name,
    config.theme
  ].map(value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');

  if (STORY_DUNGEON_KEYS.some(key => text.includes(key))) {
    return DUNGEON_SCALE_PROFILES.story;
  }

  const depth = Math.max(1, Math.floor(config.depth || 1));
  const tier = Math.max(1, Math.floor(config.tier || depth || 1));
  if (
    MAJOR_DUNGEON_KEYS.some(key => text.includes(key)) ||
    tier >= 3 ||
    depth >= 3 ||
    config.structureImportance === 'major'
  ) {
    return DUNGEON_SCALE_PROFILES.major;
  }

  return DUNGEON_SCALE_PROFILES.minor;
}

function countDungeonPlayableTiles(tiles) {
  let count = 0;

  for (const row of tiles || []) {
    for (const tile of row || []) {
      if (tile && isDungeonFloor(tile.biome)) count++;
    }
  }

  return count;
}

function inferDungeonTheme(entrance) {
  const text = `${entrance?.id || ''} ${entrance?.name || ''} ${entrance?.theme || ''}`.toLowerCase();

  if (text.includes('demon') || text.includes('cult') || text.includes('ember') || text.includes('seal')) return 'demon';
  if (text.includes('orchard') || text.includes('cellar') || text.includes('ashen')) return 'grave';
  if (text.includes('castle') || text.includes('veyr')) return 'ruin';
  if (text.includes('thorn') || text.includes('grove') || text.includes('root')) return 'thorn';
  if (text.includes('mine') || text.includes('iron') || text.includes('stone')) return 'mine';
  if (text.includes('ruin') || text.includes('chapel') || text.includes('fort')) return 'ruin';

  return 'grave';
}

function getDungeonName(theme, depth) {
  if (theme === 'thorn') return depth > 1 ? `Deep Thornroot Crypt ${depth}` : 'Thornroot Crypt';
  if (theme === 'mine') return depth > 1 ? `Lower Iron Blighted ${depth}` : 'Abandoned Iron Vault';
  if (theme === 'ruin') return depth > 1 ? `Buried Ruin ${depth}` : 'Buried Ruin';
  if (theme === 'demon') return depth > 1 ? `Lower Last Dawn ${depth}` : 'The Last Dawn Reliquary';

  return depth > 1 ? `Old Blighted Crypt ${depth}` : 'Old Blighted Crypt';
}

function getThemeColor(theme) {
  if (theme === 'thorn') return '#73d18a';
  if (theme === 'mine') return '#d9ad4f';
  if (theme === 'ruin') return '#9facbf';
  if (theme === 'demon') return '#ef6f6c';
  return '#b68cff';
}

function getThemeFloorBiome(theme) {
  if (theme === 'thorn') return 'grass';
  if (theme === 'mine') return 'dead';
  if (theme === 'demon') return 'dead';
  if (theme === 'ruin') return 'ruin';
  return 'ruin';
}

function getThemeSecondaryFloorBiome(theme) {
  if (theme === 'thorn') return 'dead';
  if (theme === 'mine') return 'ruin';
  if (theme === 'demon') return 'ruin';
  if (theme === 'ruin') return 'path';
  return 'dead';
}

function getThemeResourceNodes(theme) {
  if (theme === 'thorn') {
    return [
      { kind: 'herb', name: 'Rootbound Emberleaf' },
      { kind: 'reed', name: 'Mirror Reed' },
      { kind: 'thornsilkVine', name: 'Thornsilk Vine', itemId: 'thornsilkVine', xp: 34, requiredLevel: 5, requiredToolTier: 1 },
      { kind: 'rareTree', name: 'Briarheart Root', itemId: 'briarheartTimber', xp: 70, requiredLevel: 10, requiredToolTier: 3, respawnTime: 260 },
      { kind: 'gravecap', name: 'Thorn Gravecap' },
      { kind: 'runestone', name: 'Root Rune' }
    ];
  }

  if (theme === 'mine') {
    return [
      { kind: 'ore', name: 'Black Iron Vein' },
      { kind: 'crystal', name: 'Tideglass Vein', itemId: 'tideglassCrystal', xp: 42, requiredLevel: 6, requiredToolTier: 2 },
      { kind: 'deepstone', name: 'Deepstone Outcrop', itemId: 'deepstone', xp: 58, requiredLevel: 9, requiredToolTier: 3 },
      { kind: 'bone', name: 'Chain-Buried Bones' },
      { kind: 'runestone', name: 'Miner Rune' },
      { kind: 'gravecap', name: 'Mire Gravecap' }
    ];
  }

  if (theme === 'demon') {
    return [
      { kind: 'bone', name: 'Scorched Bone Pile' },
      { kind: 'runestone', name: 'Last Dawn Rune' },
      { kind: 'redSealPoppy', name: 'Last Dawn Poppy', itemId: 'redSealPoppy', xp: 50, requiredLevel: 8, requiredToolTier: 2 },
      { kind: 'deadwood', name: 'Black Sap Root', itemId: 'blackSap', xp: 46, requiredLevel: 7, requiredToolTier: 2 },
      { kind: 'gravecap', name: 'Ashen Gravecap' },
      { kind: 'ore', name: 'Burnt Iron Vein' }
    ];
  }

  if (theme === 'ruin') {
    return [
      { kind: 'runestone', name: 'Court Runestone' },
      { kind: 'bone', name: 'Old Noble Bones' },
      { kind: 'spiritFern', name: 'Spirit Fern', itemId: 'spiritFern', xp: 48, requiredLevel: 8, requiredToolTier: 2 },
      { kind: 'crystal', name: 'Lumen Quartz Cluster', itemId: 'lumenQuartz', xp: 48, requiredLevel: 7, requiredToolTier: 2 },
      { kind: 'gravecap', name: 'Chapel Gravecap' },
      { kind: 'ore', name: 'Ruin Iron Vein' }
    ];
  }

  return [
    { kind: 'runestone', name: 'Buried Runestone' },
    { kind: 'bone', name: 'Old Bone Pile' },
    { kind: 'moonpetal', name: 'Moonpetal', itemId: 'moonpetal', xp: 34, requiredLevel: 5, requiredToolTier: 1 },
    { kind: 'deadwood', name: 'Gravewood Root', itemId: 'gravewoodRoot', xp: 38, requiredLevel: 6, requiredToolTier: 2 },
    { kind: 'gravecap', name: 'Pale Gravecap' },
    { kind: 'ore', name: 'Cracked Iron Vein' }
  ];
}

function getDungeonRareResourceNodes(theme) {
  if (theme === 'thorn') {
    return [
      { kind: 'rareTree', name: 'Briarheart Timber', itemId: 'briarheartTimber', xp: 74, requiredLevel: 10, requiredToolTier: 3, respawnTime: 320 },
      { kind: 'thornsilkVine', name: 'Thornsilk Knot', itemId: 'thornsilkVine', xp: 52, requiredLevel: 7, requiredToolTier: 2, respawnTime: 260 },
      { kind: 'moonpetal', name: 'Moonpetal Bloom', itemId: 'moonpetal', xp: 42, requiredLevel: 5, requiredToolTier: 1, respawnTime: 220 }
    ];
  }

  if (theme === 'mine') {
    return [
      { kind: 'deepstone', name: 'Deepstone Seam', itemId: 'deepstone', xp: 68, requiredLevel: 9, requiredToolTier: 3, respawnTime: 320 },
      { kind: 'crystal', name: 'Lumen Quartz Cluster', itemId: 'lumenQuartz', xp: 56, requiredLevel: 7, requiredToolTier: 2, respawnTime: 280 },
      { kind: 'crystal', name: 'Tideglass Vein', itemId: 'tideglassCrystal', xp: 52, requiredLevel: 6, requiredToolTier: 2, respawnTime: 280 }
    ];
  }

  if (theme === 'demon') {
    return [
      { kind: 'redSealPoppy', name: 'Last Dawn Poppy', itemId: 'redSealPoppy', xp: 58, requiredLevel: 8, requiredToolTier: 2, respawnTime: 280 },
      { kind: 'deadwood', name: 'Black Sap Root', itemId: 'blackSap', xp: 54, requiredLevel: 7, requiredToolTier: 2, respawnTime: 260 },
      { kind: 'runestone', name: 'Rune-Marked Stone', itemId: 'redSealFragment', xp: 46, requiredLevel: 6, requiredToolTier: 1, respawnTime: 260 }
    ];
  }

  if (theme === 'ruin') {
    return [
      { kind: 'crystal', name: 'Lumen Quartz Cluster', itemId: 'lumenQuartz', xp: 56, requiredLevel: 7, requiredToolTier: 2, respawnTime: 280 },
      { kind: 'runestone', name: 'Oathsteel Fragment', itemId: 'oathsteelShard', xp: 52, requiredLevel: 6, requiredToolTier: 1, respawnTime: 260 },
      { kind: 'spiritFern', name: 'Spirit Fern', itemId: 'spiritFern', xp: 48, requiredLevel: 8, requiredToolTier: 2, respawnTime: 260 }
    ];
  }

  if (theme === 'holy' || theme === 'cosmic') {
    return [
      { kind: 'crystal', name: 'Lumen Quartz Cluster', itemId: 'lumenQuartz', xp: 58, requiredLevel: 7, requiredToolTier: 2, respawnTime: 280 },
      { kind: 'dawnsage', name: 'Dawnsage', itemId: 'dawnsage', xp: 56, requiredLevel: 9, requiredToolTier: 2, respawnTime: 280 },
      { kind: 'runestone', name: 'Light-Bent Rune', itemId: 'watcherGlass', xp: 46, requiredLevel: 6, requiredToolTier: 1, respawnTime: 260 }
    ];
  }

  return [
    { kind: 'crystal', name: 'Ghost Crystal', itemId: 'hollowGem', xp: 58, requiredLevel: 8, requiredToolTier: 2, respawnTime: 280 },
    { kind: 'runestone', name: 'Rune Fragment', itemId: 'paleEssence', xp: 44, requiredLevel: 4, requiredToolTier: 1, respawnTime: 260 },
    { kind: 'spiritFern', name: 'Spirit Fern', itemId: 'spiritFern', xp: 48, requiredLevel: 8, requiredToolTier: 2, respawnTime: 260 }
  ];
}

function getThemeCampfireName(theme) {
  if (theme === 'thorn') return 'Root-Cradled Campfire';
  if (theme === 'mine') return 'Smothered Miner Fire';
  if (theme === 'demon') return 'Cold Red Fire';
  if (theme === 'ruin') return 'Courtyard Campfire';
  return 'Cold Campfire';
}

function getThemeBossMarkerName(config) {
  if (config.theme === 'thorn') return 'Rootbound Heart Sigil';
  if (config.theme === 'mine') return 'Flooded Chain Seal';
  if (config.theme === 'demon') return 'Last Dawn Heart';
  if (config.theme === 'ruin') return 'Veyr Oath Sigil';
  return 'Sealed Grave Sigil';
}

function getThemeEnemyKinds(theme, config = {}) {
  const profileId = getDungeonThreatProfile(config).id;

  if (profileId === 'castleVeyr') return ['gravebound', 'veyrWraith', 'shieldKnight', 'wraith', 'archer', 'brute'];
  if (profileId === 'redSeal' || profileId === 'dawnspire') return ['shieldKnight', 'demonCultist', 'cultist', 'brute', 'archer', 'exploder'];
  if (profileId === 'cambion') return ['demonCultist', 'brute', 'exploder', 'cultist', 'stalkerWolf'];
  if (profileId === 'nephilim') return ['shieldKnight', 'archer', 'gravePriest', 'wraith', 'brute'];
  if (profileId === 'vampire') return ['gravebound', 'veyrWraith', 'wraith', 'shieldKnight', 'archer'];

  if (theme === 'thorn') return ['stalkerWolf', 'basicBeast', 'exploder', 'ashWolf'];
  if (theme === 'mine') return ['shieldKnight', 'brute', 'gravePriest', 'gravebound'];
  if (theme === 'demon') return ['cultist', 'exploder', 'archer', 'demonCultist'];
  if (theme === 'holy') return ['shieldKnight', 'cultist', 'archer', 'wraith', 'gravePriest'];
  if (theme === 'cosmic') return ['wraith', 'shieldKnight', 'cultist', 'brute', 'exploder'];
  if (theme === 'ruin') return ['wraith', 'shieldKnight', 'archer', 'gravePriest', 'veyrWraith'];
  return ['basicBeast', 'shieldKnight', 'gravePriest', 'hollowling'];
}

function getThemeBossKind(theme, dungeonId = '') {
  const id = String(dungeonId || '').toLowerCase();

  if (theme === 'demon') return 'demonCultist';
  if (theme === 'thorn') return 'ashWolf';
  if (theme === 'holy') return 'shieldKnight';
  if (theme === 'cosmic') return 'wraith';
  if (id.includes('castle') || id.includes('veyr')) return 'gravebound';
  if (theme === 'ruin') return 'veyrWraith';
  return 'gravebound';
}

function getDungeonEnemyName(kind) {
  if (kind === 'basicBeast') return 'Blighted Beast';
  if (kind === 'stalkerWolf') return 'Stalker Wolf';
  if (kind === 'shieldKnight') return 'Shield Knight';
  if (kind === 'archer') return 'Road Archer';
  if (kind === 'cultist') return 'Veyr Cultist';
  if (kind === 'gravePriest') return 'Grave Priest';
  if (kind === 'brute') return 'Iron Brute';
  if (kind === 'wraith') return 'Phasing Wraith';
  if (kind === 'exploder') return 'Volatile Husk';
  if (kind === 'ashWolf') return 'Ash Wolf';
  if (kind === 'gravebound') return 'Gravebound Knight';
  if (kind === 'demonCultist') return 'Last Dawn Militant';
  if (kind === 'veyrWraith') return 'Veyr Wraith';
  if (kind === 'roadlessBandit') return 'Roadless Bandit';
  return 'Dungeon Blighted Corpse';
}

function getDungeonBossName(config) {
  const id = String(config.dungeonId || config.poiId || '').toLowerCase();

  if (id.includes('demon') || id.includes('ember') || config.theme === 'demon') return 'Malakar, Breaker of Final Sieges';
  if (id.includes('shatteredchoir') || id.includes('seraphel') || config.theme === 'holy') return 'Seraphel, the Uncrowned';
  if (id.includes('ascensionspire') || id.includes('zephyr') || config.theme === 'cosmic') return 'Zephyr Light';
  if (id.includes('ashen') || id.includes('orchard')) return 'The Orchard Keeper';
  if (id.includes('thorn')) return 'Thornroot Matron';
  if (id.includes('iron') || id.includes('mire')) return 'Drowned Iron Foreman';
  if (id.includes('castle') || id.includes('veyr')) return 'The Veyr Warden';
  if (id.includes('old') || id.includes('hollow')) return 'Solgate Grave Warden';

  if (config.theme === 'thorn') return 'Thornroot Matron';
  if (config.theme === 'mine') return 'Drowned Iron Foreman';
  if (config.theme === 'ruin') return 'Veyr Oathshade';
  return 'Gravebound Warden';
}

function isVeyrWardenConfig(config, name) {
  const text = `${config?.dungeonId || ''} ${config?.poiId || ''} ${name || ''}`.toLowerCase();

  return text.includes('castle') || text.includes('veyr warden') || text.includes('veyrwarden');
}

function getWallBiomeId() {
  // If data.js already has a real wall biome, use it.
  // Otherwise, water remains the temporary impassable placeholder.
  if (BIOMES?.wall) return 'wall';
  return 'water';
}

function isDungeonFloor(biome) {
  return biome !== getWallBiomeId() && biome !== 'water';
}

// -----------------------------------------------------------------------------
// UTILS
// -----------------------------------------------------------------------------

function createSeededRng(seed = 'runalis') {
  let hash = 2166136261;
  const text = String(seed);

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6D2B79F5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function deterministicDungeonChance(seed, chance) {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return createSeededRng(seed)() < chance;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function slugify(value) {
  return String(value || 'dungeon')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dungeon';
}

function dungeonNoise(x, y, seed = 'runalis') {
  let hash = 0;
  const text = `${seed}:${x}:${y}`;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  const n = Math.sin(hash * 12.9898) * 43758.5453123;
  return n - Math.floor(n);
}

function sanitizeForSave(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => {
    if(['telegraph','bossTell','pendingSpecial','visualReaction','visualDeath'].includes(key))return undefined;
    if (key === 'floatingTexts') return [];
    if (key === 'combatEffects') return [];
    if (key === 'effects') return [];

    if (typeof val === 'function') return undefined;
    if (typeof val === 'number' && !Number.isFinite(val)) return 0;

    return val;
  }));
}
