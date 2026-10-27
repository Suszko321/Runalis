import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import { TILE } from './data.js';
import { getPower, getArmour, migratePlayer } from './player.js';
import { addFloatingText, addStatusText, addQuestText } from './floatingText.js';
import { applyDefensiveDamage, isDodgeInvulnerable } from './combatActions.js';
import { getCurrentAttackVisual } from './combatMoves.js';
import { hasLineOfSight } from './world.js';
import { playSfx } from './audioSystem.js';
import { stopAbilityChannel } from './abilityChannelSystem.js';

const ARENA_WIDTH = 54;
const ARENA_HEIGHT = 36;
const ARENA_NAME = 'Orrakai PvP Arena';
const COUNTDOWN_SECONDS = 3;
const PVP_DAMAGE_SCALAR = 0.62;
const PVP_DAMAGE_SOURCE_TYPES = new Set(['basicAttack', 'abilityChannel']);
const ARENA_STATES = new Set(['countdown', 'active', 'roundOver', 'rematching', 'exiting']);
const PVP_RESULT_ACTIONS = {
  REMATCH: 'rematch',
  RETURN_TO_ORRAKAI: 'return_to_orrakai'
};
const RESULT_INPUT_GRACE_SECONDS = 0.22;
const ARENA_SPAWNS = [
  { x: 14 * TILE, y: 13 * TILE, dirX: 1, dirY: 0 },
  { x: 40 * TILE, y: 23 * TILE, dirX: -1, dirY: 0 },
  { x: 14 * TILE, y: 23 * TILE, dirX: 1, dirY: -0.2 },
  { x: 40 * TILE, y: 13 * TILE, dirX: -1, dirY: 0.2 }
];

export function enterPvpArena(game, object = null) {
  const hostGame = game?.hostGame || game;
  const actor = game?.player || hostGame?.player;
  if (!hostGame?.player || !hostGame.world) return false;

  if (hostGame.world.mode === 'pvpArena') {
    addStatusText(actor || hostGame.player, 'Arena Active', { color: '#ef6f6c' });
    return true;
  }

  if (hostGame.world.mode !== 'capital') {
    hostGame.log?.('The PvP Arena can only be entered from Orrakai.');
    addStatusText(actor || hostGame.player, 'Use Orrakai Arena', { color: '#ffcc66' });
    return true;
  }

  const actors = getArenaPlayers(hostGame);

  if (actors.length < 2) {
    hostGame.log?.('Arena Master: local PvP requires at least 2 joined players.');
    addStatusText(actor || hostGame.player, 'Need 2 Local Players', { color: '#ef6f6c' });
    return true;
  }

  hostGame.pvpArenaReturnWorld = clonePlainWorld(hostGame.world);
  hostGame.pvpArenaReturnPoint = {
    x: Number(object?.x || 57 * TILE),
    y: Number(object?.y || 18 * TILE) + TILE * 1.25
  };

  const world = createPvpArenaWorld();
  hostGame.world = world;
  beginPvpRound(hostGame, actors, { preserveReturnState: true });

  hostGame.currentSplitLayout = null;
  hostGame.splitScreenActive = false;
  hostGame.cameraMode = 'sharedParty';
  hostGame.camera = {
    x: hostGame.player.x - hostGame.canvas.width / 2,
    y: hostGame.player.y - hostGame.canvas.height / 2
  };

  hostGame.log?.('Arena Master: last player standing wins. Friendly fire is active only inside this arena.');
  addQuestText(hostGame.player, 'PvP Arena', { color: '#ef6f6c', ttl: 1.5 });
  return true;
}

export function updatePvpArena(game, dt, now) {
  const world = game?.world;
  if (!isPvpArenaWorld(world)) {
    closePvpArenaOverlay();
    return;
  }

  const state = ensurePvpArenaState(game);
  const actors = getPvpActors(game, world);

  if (!ARENA_STATES.has(state.state)) {
    forcePvpRoundOver(game, 'Match Interrupted', now);
    renderPvpArenaOverlay(game);
    return;
  }

  if (state.state === 'exiting' || state.transitioning === PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI) {
    returnFromPvpArena(game);
    return;
  }

  if (state.state === 'rematching') return;

  if (state.state !== 'roundOver' && actors.length < 2) {
    finishPvpRound(game, actors[0] || null, now);
    return;
  }

  if (state.state === 'countdown') {
    state.countdown = Math.max(0, Number(state.countdown || 0) - Math.max(0, Number(dt || 0)));
    announceCountdown(game, state);

    if (state.countdown <= 0) {
      state.state = 'active';
      state.startedAt = now;
      state.announcedFight = true;
      state.damageDisabled = false;
      game.log?.('Arena Master: fight!');
      for (const actor of actors) {
        addStatusText(actor, 'Fight', { color: '#ffcc66', ttl: 0.8 });
      }
      playSfx('quest', { volume: 0.72, throttle: 0.2 });
    }
    return;
  }

  if (state.state !== 'active') {
    renderPvpArenaOverlay(game);
    return;
  }

  for (const actor of actors) {
    if (!actor || actor.active === false) continue;
    if ((actor.hp || 0) <= 0) {
      eliminatePvpActor(world, actor, null, game.log, now);
    }
  }

  const living = actors.filter(actor => isPvpActorStillInMatch(actor));

  if (living.length <= 1 && Math.max(actors.length, state.players?.length || 0) >= 2) {
    finishPvpRound(game, living[0] || null, now);
  }
}

export function updatePvpCombatForActor(actor, world, input, now, log) {
  if (!actor || !isPvpActive(world) || isPvpActorEliminated(actor, world)) return false;
  if (!isGameplayInputAllowedForPvp(actor, world)) return false;

  migratePlayer(actor);
  let applied = false;

  applied = updatePvpDawncarver(actor, world, now, log) || applied;

  const state = ensureActorPvpState(actor);

  applied = applyPvpWeaponAttackVisual(actor, world, state, now, log) || applied;

  return applied;
}

export function handlePvpArenaControllerInput(game, input) {
  const overlay = document.getElementById('pvpArenaOverlay');
  if (!overlay?.classList.contains('active')) return false;
  refreshPvpResultInputGate(game, input);

  if (isPvpResultActionInProgress(game)) return true;

  const buttons = Array.from(overlay.querySelectorAll('button')).filter(button => {
    if (!button || button.disabled) return false;
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (!buttons.length) return true;

  let focusIndex = Math.max(0, Math.min(buttons.length - 1, Number(overlay.dataset.focusIndex || 0)));

  const direction=menuDirection(input);
  if(direction){
    focusIndex=buttons.indexOf(directionalMenuItem(buttons,buttons[focusIndex],direction));
    overlay.dataset.focusIndex=String(focusIndex);applyPvpOverlayFocus(overlay,buttons,focusIndex);return true;
  }

  if (input?.confirmPressed) {
    if (!canAcceptPvpResultInput(game, { requireFreshConfirm: true })) return true;

    applyPvpOverlayFocus(overlay, buttons, focusIndex);
    const action = buttons[focusIndex]?.dataset?.pvpAction || '';
    handlePvpArenaResultAction(game, action, 'controller');
    return true;
  }

  if (input?.cancelPressed || input?.backPressed) {
    handlePvpArenaResultAction(game, PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI, 'controller');
    return true;
  }

  applyPvpOverlayFocus(overlay, buttons, focusIndex);
  return true;
}

function handlePvpArenaResultAction(game, actionId, source = 'ui') {
  const hostGame = game?.hostGame || game;
  const action = normalizePvpResultAction(actionId);

  if (!hostGame || !action) {
    console.warn?.('Unknown PvP arena result action ignored.', actionId, source);
    return false;
  }

  const state = isPvpArenaWorld(hostGame.world)
    ? ensurePvpArenaState(hostGame)
    : null;

  if (state?.resultActionInProgress) return true;

  if (state?.state === 'roundOver' && !canAcceptPvpResultInput(hostGame, {
    requireFreshConfirm: source === 'controller'
  })) {
    return true;
  }

  if (state) {
    state.resultActionInProgress = true;
    state.resultAction = action;
    state.resultActionSource = source;
    state.resultActionAt = getPvpNow();
  }

  const handled = action === PVP_RESULT_ACTIONS.REMATCH
    ? rematchPvpArena(hostGame)
    : returnFromPvpArena(hostGame);

  if (!handled && state) {
    state.resultActionInProgress = false;
    state.resultAction = null;
    state.resultActionSource = null;
  }

  return handled;
}

function normalizePvpResultAction(actionId) {
  const action = String(actionId || '').replace(/[\s-]+/g, '_').toLowerCase();

  if (action === PVP_RESULT_ACTIONS.REMATCH || action === 'restart') {
    return PVP_RESULT_ACTIONS.REMATCH;
  }

  if (
    action === PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI ||
    action === 'return' ||
    action === 'exit' ||
    action === 'return_to_town' ||
    action === 'return_to_hub'
  ) {
    return PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI;
  }

  return '';
}

function refreshPvpResultInputGate(game, input) {
  const state = game?.world?.pvpArena;
  if (!state || state.state !== 'roundOver') return;

  if (
    state.resultWaitForConfirmRelease &&
    (!input?.confirmHeld || getPvpNow() >= Number(state.resultAcceptAfter || 0))
  ) {
    state.resultWaitForConfirmRelease = false;
  }
}

function canAcceptPvpResultInput(game, options = {}) {
  const state = game?.world?.pvpArena;
  if (!state || state.state !== 'roundOver') return true;
  if (state.resultActionInProgress) return false;
  if (state.resultWaitForConfirmRelease && getPvpNow() >= Number(state.resultAcceptAfter || 0)) {
    state.resultWaitForConfirmRelease = false;
  }
  if (options.requireFreshConfirm && state.resultWaitForConfirmRelease) return false;
  return getPvpNow() >= Number(state.resultAcceptAfter || 0);
}

function isPvpResultActionInProgress(game) {
  const state = game?.world?.pvpArena;
  return !!state?.resultActionInProgress;
}

export function returnFromPvpArena(game) {
  const hostGame = game?.hostGame || game;
  if (!hostGame) return false;
  const wasArenaWorld = isPvpArenaWorld(hostGame.world);

  if (!wasArenaWorld && !hostGame.pvpArenaReturnWorld) return false;

  if (wasArenaWorld) {
    const state = ensurePvpArenaState(hostGame);
    state.state = 'exiting';
    state.transitioning = PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI;
    state.resultActionInProgress = true;
    state.damageDisabled = true;
    state.exitStartedAt = getPvpNow();
  }

  const actors = wasArenaWorld
    ? getPvpActors(hostGame, hostGame.world)
    : getArenaPlayers(hostGame);

  cleanupArenaMatchState(hostGame, {
    clearEliminated: true,
    disableDamage: true,
    reason: PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI
  });

  const returnWorld =
    clonePlainWorld(hostGame.pvpArenaReturnWorld)
    || hostGame.createCapitalHubWorldInstance?.()
    || createFallbackReturnWorld();
  const returnPoint = hostGame.pvpArenaReturnPoint || findArenaReturnPoint(returnWorld);

  closePvpArenaOverlay();
  hostGame.world = returnWorld;
  hostGame.world.mode = hostGame.world.mode || 'capital';
  hostGame.world.name = hostGame.world.name || 'Orrakai';
  hostGame.world.safeZone = true;

  placeArenaPartyAtReturn(hostGame, actors, returnPoint);
  hostGame.pvpArenaReturnWorld = null;
  hostGame.pvpArenaReturnPoint = null;
  hostGame.currentSplitLayout = null;
  hostGame.splitScreenActive = false;
  hostGame.cameraMode = null;

  if (hostGame.canvas) {
    hostGame.camera = {
      x: hostGame.player.x - hostGame.canvas.width / 2,
      y: hostGame.player.y - hostGame.canvas.height / 2
    };
  }

  hostGame.log?.('The match ends and the party returns to Orrakai.');
  return true;
}

export function rematchPvpArena(game) {
  const hostGame = game?.hostGame || game;
  if (!hostGame?.world || hostGame.world.mode !== 'pvpArena') return false;
  const state = ensurePvpArenaState(hostGame);

  if (state.state === 'exiting' || state.transitioning === PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI) {
    return false;
  }

  if (state.state === 'rematching') return true;

  if (state.state !== 'roundOver') {
    console.warn?.('PvP rematch ignored outside roundOver state.', state.state);
    return false;
  }

  state.state = 'rematching';
  state.transitioning = PVP_RESULT_ACTIONS.REMATCH;
  state.resultActionInProgress = true;
  state.damageDisabled = true;

  cleanupArenaMatchState(hostGame, {
    clearEliminated: true,
    disableDamage: true,
    reason: PVP_RESULT_ACTIONS.REMATCH
  });
  const actors = getPvpActors(hostGame, hostGame.world);

  if (actors.length < 2) {
    state.state = 'roundOver';
    state.transitioning = null;
    state.resultActionInProgress = false;
    addStatusText(hostGame.player, 'Need 2 Local Players', { color: '#ef6f6c' });
    renderPvpArenaOverlay(hostGame);
    return false;
  }

  closePvpArenaOverlay();
  beginPvpRound(hostGame, actors, { preserveReturnState: false });
  hostGame.currentSplitLayout = null;
  hostGame.splitScreenActive = false;
  hostGame.cameraMode = 'sharedParty';
  hostGame.log?.('Arena Master: rematch!');
  return true;
}

export function isPvpArenaWorld(world) {
  return String(world?.mode || '').toLowerCase() === 'pvparena';
}

export function isPvpActive(world) {
  return isPvpArenaWorld(world) && world?.pvpArena?.state === 'active' && !world?.pvpArena?.damageDisabled;
}

export function isPvpActorEliminated(actor, world = null) {
  if (!actor?.pvpArena?.active) return false;
  if (world && !isPvpArenaWorld(world)) return false;
  return !!actor.pvpArena.eliminated;
}

export function canPvpActorAct(actor, world) {
  if (!isPvpArenaWorld(world)) return true;
  return world?.pvpArena?.state === 'active' && !isPvpActorEliminated(actor, world);
}

export function shouldBlockPvpArenaSave(world) {
  return isPvpArenaWorld(world);
}

export function cleanupArenaMatchState(game, options = {}) {
  const hostGame = game?.hostGame || game;
  const world = hostGame?.world;
  const actors = isPvpArenaWorld(world)
    ? getPvpActors(hostGame, world)
    : getArenaPlayers(hostGame);

  if (world) {
    world.effects = [];
    world.combatEffects = [];
    world.drops = isPvpArenaWorld(world) ? [] : (Array.isArray(world.drops) ? world.drops : []);

    if (world.pvpArena) {
      world.pvpArena.lastCleanupReason = options.reason || world.pvpArena.lastCleanupReason || 'cleanup';
      world.pvpArena.lastCleanupAt = getPvpNow();
    }
  }

  for (const actor of actors) {
    clearActorArenaCombatState(actor);
    actor.traps = [];
    actor.summons = Array.isArray(actor.summons) ? actor.summons.filter(summon => summon?.persistent) : [];

    if (options.clearEliminated && actor.pvpArena) {
      actor.pvpArena.eliminated = false;
      actor.pvpArena.eliminatedAt = 0;
      actor.pvpArena.eliminatedBy = null;
    }
  }

  if (options.disableDamage && world?.pvpArena) {
    world.pvpArena.damageDisabled = true;
  }
}

export function canPlayerDamagePlayer(sourcePlayer, targetPlayer, damageSource = {}, world = null) {
  const activeWorld = world || damageSource.world;
  const now = Number(damageSource.now || performance.now() / 1000);
  const createdAt = Number(damageSource.createdAt ?? now);
  const duration = Math.max(0.01, Number(damageSource.duration || 0.18));
  const damageSourceType = String(damageSource.damageSourceType || '');
  const sourceSlot = getActorSlot(sourcePlayer);

  if (!isPvpActive(activeWorld)) return false;
  if (!sourcePlayer || !targetPlayer || sourcePlayer === targetPlayer) return false;
  if (!isPvpActorStillInMatch(sourcePlayer) || !isPvpActorStillInMatch(targetPlayer)) return false;
  if (Number(damageSource.ownerPlayerId || sourceSlot) !== sourceSlot) return false;
  if (Number(damageSource.sourcePlayerId || sourceSlot) !== sourceSlot) return false;
  if (!damageSource.canDamagePlayers) return false;
  if (!PVP_DAMAGE_SOURCE_TYPES.has(damageSourceType)) return false;
  if (now < createdAt || now > createdAt + duration) return false;
  if (!isGameplayInputAllowedForPvp(sourcePlayer, activeWorld)) return false;
  return true;
}

function beginPvpRound(game, actors, options = {}) {
  const world = game.world;
  world.pvpArena = {
    state: 'countdown',
    countdown: COUNTDOWN_SECONDS,
    countdownAnnounced: 99,
    roundStartedAt: performance.now() / 1000,
    winnerSlot: null,
    winnerName: null,
    damageDisabled: true,
    roundEndHandled: false,
    resultActionInProgress: false,
    resultWaitForConfirmRelease: false,
    resultAcceptAfter: 0,
    transition: null,
    transitioning: null,
    players: actors.map((actor, index) => ({
      slot: getActorSlot(actor, index),
      name: getActorName(actor, index)
    }))
  };

  Object.defineProperty(world.pvpArena, 'runtimeActors', {
    value: actors,
    writable: true,
    configurable: true,
    enumerable: false
  });

  for (let index = 0; index < actors.length; index++) {
    prepareActorForArena(actors[index], index, world, options);
  }
}

function prepareActorForArena(actor, index, world, options = {}) {
  if (!actor) return;

  const existingReturn = actor.pvpArena?.returnState;
  const spawn = ARENA_SPAWNS[index] || ARENA_SPAWNS[0];

  actor.pvpArena = {
    active: true,
    eliminated: false,
    slot: getActorSlot(actor, index),
    returnState: options.preserveReturnState
      ? captureActorReturnState(actor)
      : existingReturn || captureActorReturnState(actor),
    nextBasicHitAt: 0,
    nextAbilityHitAt: 0,
    lastBasicAttackId: null
  };

  actor.hp = Math.max(1, Number(actor.maxHp || actor.hp || 1));
  actor.stamina = Math.max(1, Number(actor.maxStamina || actor.stamina || 1));
  actor.spirit = Math.max(0, Number(actor.maxSpirit || actor.spirit || 0));
  actor.x = spawn.x;
  actor.y = spawn.y;
  actor.dirX = spawn.dirX;
  actor.dirY = spawn.dirY;
  actor.currentZone = world.name;
  actor.reviveAction = null;
  actor.downed = false;
  actor.isDowned = false;

  clearActorArenaCombatState(actor);
}

function createPvpArenaWorld() {
  return {
    mode: 'pvpArena',
    name: ARENA_NAME,
    safeZone: false,
    cameraMode: 'sharedParty',
    regionId: 'hearthmereFrontier',
    actId: 'act1',
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    tileSize: TILE,
    tiles: createArenaTiles(),
    objects: createArenaObjects(),
    enemies: [],
    drops: [],
    effects: [],
    combatEffects: [],
    spawn: { x: 27 * TILE, y: 18 * TILE }
  };
}

function createArenaTiles() {
  const tiles = [];

  for (let y = 0; y < ARENA_HEIGHT; y++) {
    const row = [];

    for (let x = 0; x < ARENA_WIDTH; x++) {
      const border = x <= 1 || y <= 1 || x >= ARENA_WIDTH - 2 || y >= ARENA_HEIGHT - 2;
      const pit = (x < 8 && y < 7) || (x > ARENA_WIDTH - 9 && y > ARENA_HEIGHT - 8);
      const lane = Math.abs(y - ARENA_HEIGHT / 2) <= 2 || Math.abs(x - ARENA_WIDTH / 2) <= 2;
      const biome = border || pit
        ? 'wall'
        : lane
          ? 'path'
          : ((x + y) % 5 === 0 ? 'ruin' : 'dead');

      row.push({
        biome,
        explored: true,
        visible: true,
        passable: biome !== 'wall'
      });
    }

    tiles.push(row);
  }

  return tiles;
}

function createArenaObjects() {
  return [
    arenaObject('arenaGate', 'pvpArenaReturnGate', 'Return Gate', 27, 32, {
      r: 24,
      forceLabel: true,
      labelOffset: 32,
      arenaReturn: true,
      talk: 'Return to Orrakai.'
    }),
    arenaObject('decor', 'arenaNorthStand', 'Arena Stands', 27, 4, {
      decorative: true,
      interactable: false,
      w: 420,
      h: 54
    }),
    arenaObject('decor', 'arenaSouthStand', 'Arena Stands', 27, 31, {
      decorative: true,
      interactable: false,
      w: 420,
      h: 54
    })
  ];
}

function arenaObject(kind, id, name, tileX, tileY, extra = {}) {
  return {
    kind,
    id,
    name,
    x: tileX * TILE,
    y: tileY * TILE,
    ...extra
  };
}

function announceCountdown(game, state) {
  const next = Math.ceil(Number(state.countdown || 0));
  if (next <= 0 || next === state.countdownAnnounced) return;

  state.countdownAnnounced = next;
  for (const actor of getPvpActors(game, game.world)) {
    addStatusText(actor, String(next), { color: '#ffcc66', ttl: 0.65, size: 18 });
  }
}

function finishPvpRound(game, winner, now) {
  const state = ensurePvpArenaState(game);
  if (state.state === 'roundOver' || state.state === 'exiting' || state.roundEndHandled) {
    renderPvpArenaOverlay(game);
    return;
  }

  const finishedAt = Number.isFinite(Number(now)) ? Number(now) : getPvpNow();

  state.state = 'roundOver';
  state.finishedAt = finishedAt;
  state.winnerSlot = winner ? getActorSlot(winner) : null;
  state.winnerName = winner ? getActorName(winner) : 'No winner';
  state.damageDisabled = true;
  state.roundEndHandled = true;
  state.transitioning = null;
  state.resultActionInProgress = false;
  state.resultAction = null;
  state.resultActionSource = null;
  state.resultOpenedAt = finishedAt;
  state.resultAcceptAfter = finishedAt + RESULT_INPUT_GRACE_SECONDS;
  state.resultWaitForConfirmRelease = true;

  cleanupArenaMatchState(game, {
    clearEliminated: false,
    disableDamage: true,
    reason: 'round_end'
  });

  for (const actor of getPvpActors(game, game.world)) {
    clearActorArenaCombatState(actor);
    addStatusText(actor, winner === actor ? 'Winner' : 'Eliminated', {
      color: winner === actor ? '#ffcc66' : '#ef6f6c',
      ttl: 1.3
    });
  }

  game.log?.(winner ? `Arena: ${state.winnerName} wins.` : 'Arena: no winner.');
  playSfx('quest', { volume: 0.78, throttle: 0.2 });
  renderPvpArenaOverlay(game);
}

function forcePvpRoundOver(game, label = 'Match Interrupted', now = null) {
  const state = ensurePvpArenaState(game);
  const finishedAt = Number.isFinite(Number(now)) ? Number(now) : getPvpNow();

  state.state = 'roundOver';
  state.finishedAt = finishedAt;
  state.winnerSlot = null;
  state.winnerName = label;
  state.damageDisabled = true;
  state.roundEndHandled = true;
  state.transitioning = null;
  state.resultActionInProgress = false;
  state.resultAction = null;
  state.resultOpenedAt = finishedAt;
  state.resultAcceptAfter = finishedAt + RESULT_INPUT_GRACE_SECONDS;
  state.resultWaitForConfirmRelease = true;

  cleanupArenaMatchState(game, {
    clearEliminated: false,
    disableDamage: true,
    reason: 'invalid_state'
  });
}

function applyPvpDirectionalHit(actor, world, options = {}) {
  const aim = getActorAim(actor);
  const actors = getPvpActorsFromWorld(world);
  const targets = findActorsInBeam(actor, actors, {
    originX: actor.x,
    originY: actor.y - 8,
    dirX: aim.x,
    dirY: aim.y,
    range: options.range || 80,
    width: options.width || 42,
    requireLineOfSight: !!options.ranged,
    world
  });

  let hit = false;

  for (const target of targets) {
    const damageSource = createPvpDamageSource(actor, world, {
      damageSourceType: options.damageSourceType || 'basicAttack',
      weaponAttackId: options.weaponAttackId || null,
      abilityId: options.abilityId || null,
      duration: options.duration || 0.2,
      now: options.now
    });

    hit = applyPvpDamage(actor, target, options.damage || 6, {
      sourceName: options.sourceName || 'PvP',
      color: options.color || '#ffcc66',
      world,
      now: options.now,
      log: options.log,
      damageSource
    }) || hit;
  }

  if (hit) {
    pushPvpHitEffect(world, actor.x + aim.x * Math.min(options.range || 80, 58), actor.y - 8 + aim.y * Math.min(options.range || 80, 58), options.color);
  }

  return hit;
}

function applyPvpWeaponAttackVisual(actor, world, state, now, log) {
  const visual = getCurrentAttackVisual(actor);
  const move = visual?.move;
  const combatState = actor?.combatState || {};
  const attackId = Number(combatState.attackId || 0);

  if (!visual?.active || !move || !attackId) return false;
  if (state.lastBasicAttackId === attackId) return false;
  if (now < Number(state.nextBasicHitAt || 0)) return false;

  state.lastBasicAttackId = attackId;
  state.nextBasicHitAt = now + Math.max(
    0.12,
    Math.min(0.34, Number(move.activeEnd || 0.22) - Number(move.activeStart || 0.08) + 0.12)
  );

  const damage = Math.ceil((7 + getPower(actor) * 0.32) * Math.max(0.75, Number(move.damageMultiplier || 1)));
  const targets = getPvpActorsFromWorld(world).filter(target => targetInPvpWeaponHitbox(actor, target, visual, world));
  const color = getPvpWeaponHitColor(visual);
  let hit = false;

  for (const target of targets) {
    hit = applyPvpDamage(actor, target, damage, {
      sourceName: move.name || 'Attack',
      color,
      world,
      now,
      log,
      damageSource: createPvpDamageSource(actor, world, {
        damageSourceType: 'basicAttack',
        weaponAttackId: move.id || 'basicAttack',
        duration: 0.24,
        now
      })
    }) || hit;
  }

  if (hit) {
    const aim = normalizeVector(visual.dirX, visual.dirY, actor.dirX || 0, actor.dirY || 1);
    const range = Math.min(Number(move.range || move.projectileRange || move.radius || 64), 72);
    pushPvpHitEffect(world, actor.x + aim.x * range, actor.y - 8 + aim.y * range, color);
  }

  return hit;
}

function targetInPvpWeaponHitbox(source, target, visual, world) {
  if (!source || !target || source === target || !isPvpActorStillInMatch(target)) return false;

  const move = visual?.move || {};
  const aim = normalizeVector(visual?.dirX, visual?.dirY, source.dirX || 0, source.dirY || 1);
  const dx = Number(target.x || 0) - Number(source.x || 0);
  const dy = Number(target.y || 0) - Number(source.y || 0);
  const targetRadius = Number(target.radius || target.r || 12);
  let inside = false;

  if (move.kind === 'circle') {
    inside = Math.hypot(dx, dy) <= Math.max(18, Number(move.radius || move.range || 40)) + targetRadius;
  } else if (move.kind === 'line' || move.kind === 'projectile') {
    inside = pointInDirectionalCapsule(
      dx,
      dy,
      aim.x,
      aim.y,
      Math.max(28, Number(move.projectileRange || move.range || 70)),
      Math.max(16, Number(move.width || move.projectileRadius || 22)),
      targetRadius
    );
  } else {
    inside = pointInArc(
      dx,
      dy,
      aim.x,
      aim.y,
      Math.max(28, Number(move.range || 52)),
      Math.max(40, Number(move.arcDegrees || 74)),
      targetRadius
    );
  }

  if (!inside) return false;

  return hasLineOfSight(world, source.x, source.y - 8, target.x, target.y - 8, {
    step: TILE / 3,
    startSkip: 1,
    endSkip: 1
  });
}

function pointInArc(dx, dy, dirX, dirY, range, arcDegrees, targetRadius = 0) {
  const distance = Math.hypot(dx, dy);

  if (distance > range + targetRadius) return false;
  if (distance <= 6 + targetRadius) return true;

  const nx = dx / distance;
  const ny = dy / distance;
  const dot = Math.max(-1, Math.min(1, nx * dirX + ny * dirY));
  const angle = Math.acos(dot);
  const maxAngle = degreesToRadians(arcDegrees / 2);

  return angle <= maxAngle;
}

function pointInDirectionalCapsule(dx, dy, dirX, dirY, length, width, targetRadius = 0) {
  const forward = dx * dirX + dy * dirY;

  if (forward < -targetRadius || forward > length + targetRadius) return false;

  const closestForward = Math.max(0, Math.min(length, forward));
  const closestX = dirX * closestForward;
  const closestY = dirY * closestForward;
  const distance = Math.hypot(dx - closestX, dy - closestY);

  return distance <= width / 2 + targetRadius;
}

function degreesToRadians(degrees) {
  return Number(degrees || 0) * Math.PI / 180;
}

function getPvpWeaponHitColor(visual) {
  const type = String(visual?.weaponType || '').toLowerCase();
  if (type.includes('spirit') || type.includes('eldritch')) return '#c084fc';
  if (type.includes('bow') || type.includes('crossbow')) return '#8fd3ff';
  if (type.includes('scythe')) return '#b66bff';
  return '#ffcc66';
}

function updatePvpDawncarver(actor, world, now, log) {
  const channel = actor?.lightbringer?.dawncarverChannel;
  if (!channel || now < Number(channel.nextPvpTickAt || 0)) return false;

  channel.nextPvpTickAt = now + Math.max(0.14, Number(channel.tickInterval || 0.2));

  const aim = normalizeVector(channel.dirX, channel.dirY, actor.dirX || 0, actor.dirY || 1);
  const originX = Number(channel.originX || actor.x + aim.x * 18);
  const originY = Number(channel.originY || actor.y - 12 + aim.y * 10);
  const targets = findActorsInBeam(actor, getPvpActorsFromWorld(world), {
    originX,
    originY,
    dirX: aim.x,
    dirY: aim.y,
    range: Number(channel.visualRange || channel.range || 260),
    width: Number(channel.width || 32),
    requireLineOfSight: true,
    world
  });

  let hit = false;

  for (const target of targets) {
    hit = applyPvpDamage(actor, target, Math.ceil(Number(channel.damage || 8) * 0.55), {
      sourceName: 'Dawncarver',
      color: '#fff1b8',
      world,
      now,
      log,
      damageSource: createPvpDamageSource(actor, world, {
        damageSourceType: 'abilityChannel',
        abilityId: 'lightbringerDawncarver',
        duration: Math.max(0.14, Number(channel.tickInterval || 0.2)),
        now
      })
    }) || hit;
  }

  return hit;
}

function findActorsInBeam(source, actors, options) {
  const originX = Number(options.originX || source.x || 0);
  const originY = Number(options.originY || source.y || 0);
  const aim = normalizeVector(options.dirX, options.dirY, source.dirX || 0, source.dirY || 1);
  const range = Math.max(12, Number(options.range || 80));
  const halfWidth = Math.max(8, Number(options.width || 40)) / 2;

  return actors.filter(target => {
    if (!target || target === source || !isPvpActorStillInMatch(target)) return false;

    const dx = Number(target.x || 0) - originX;
    const dy = Number(target.y || 0) - originY;
    const projection = dx * aim.x + dy * aim.y;
    if (projection < 0 || projection > range) return false;

    const perp = Math.abs(dx * aim.y - dy * aim.x);
    if (perp > halfWidth + Number(target.radius || target.r || 12)) return false;

    if (options.requireLineOfSight && !hasLineOfSight(options.world, originX, originY, target.x, target.y - 8, {
      step: TILE / 3,
      startSkip: 1,
      endSkip: 1
    })) {
      return false;
    }

    return true;
  });
}

function applyPvpDamage(source, target, rawDamage, options = {}) {
  const world = options.world;
  const now = options.now || performance.now() / 1000;
  const damageSource = options.damageSource || {};
  if (!canPlayerDamagePlayer(source, target, { ...damageSource, now, world }, world)) return false;

  if (isDodgeInvulnerable(target)) {
    addFloatingText(target, 'Evade', { color: '#9facbf', ttl: 0.45, size: 11 });
    return false;
  }

  const armourReduction = Math.floor(Math.max(0, Number(getArmour(target) || 0)) * 0.35);
  const incoming = Math.max(1, Math.ceil(Number(rawDamage || 1) * PVP_DAMAGE_SCALAR) - armourReduction);
  const result = applyDefensiveDamage(target, incoming, options.log, source, world, now);
  const hpDamage = Math.max(0, Math.ceil(Number(result.hpDamage || 0)));

  if (hpDamage <= 0) {
    addFloatingText(target, 'Absorbed', { color: '#9facbf', ttl: 0.5, size: 11 });
    return false;
  }

  target.hp = Math.max(0, Number(target.hp || 0) - hpDamage);
  target.hitFlash = Math.max(Number(target.hitFlash || 0), 0.15);

  addFloatingText(target, result.blocked ? `Blocked ${hpDamage}` : `-${hpDamage}`, {
    color: options.color || '#ef6f6c',
    ttl: 0.62,
    size: 12
  });

  pushPvpHitEffect(world, target.x, target.y - 10, options.color || '#ef6f6c');

  if (target.hp <= 0) {
    eliminatePvpActor(world, target, source, options.log, now);
  }

  return true;
}

function createPvpDamageSource(sourcePlayer, world, options = {}) {
  const now = Number(options.now || performance.now() / 1000);
  const slot = getActorSlot(sourcePlayer);

  return {
    sourcePlayerId: slot,
    ownerPlayerId: slot,
    sourceEntityId: sourcePlayer?.id || sourcePlayer?.profileId || `player-${slot}`,
    damageSourceType: options.damageSourceType || 'basicAttack',
    abilityId: options.abilityId || null,
    weaponAttackId: options.weaponAttackId || null,
    createdAt: now,
    duration: Math.max(0.01, Number(options.duration || 0.18)),
    canDamagePlayers: true,
    hasHitTargets: {},
    world
  };
}

function isGameplayInputAllowedForPvp(actor, world) {
  if (!actor || !isPvpActive(world) || isPvpActorEliminated(actor, world)) return false;

  const slot = getActorSlot(actor);
  const ownerOverlayIds = [
    'characterCreatorOverlay',
    'marketShopOverlay',
    'workshopServiceOverlay',
    'fishingMiniGameOverlay'
  ];

  for (const id of ownerOverlayIds) {
    const overlay = document.getElementById(id);
    if (overlay?.classList.contains('active') && Number(overlay.dataset.ownerSlot || 1) === slot) {
      return false;
    }
  }

  const resultOverlay = document.getElementById('pvpArenaOverlay');
  if (resultOverlay?.classList.contains('active')) return false;

  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay?.classList.contains('active')) return false;

  const panel = document.querySelector('.panel.open');
  if (panel && Number(panel.dataset.ownerSlot || 1) === slot) return false;

  return true;
}

function eliminatePvpActor(world, actor, source, log, now) {
  if (!actor || isPvpActorEliminated(actor, world)) return false;

  const state = ensureActorPvpState(actor);
  state.eliminated = true;
  state.eliminatedAt = now || performance.now() / 1000;
  state.eliminatedBy = source ? getActorSlot(source) : null;

  actor.hp = 1;
  actor.stamina = 0;
  clearActorArenaCombatState(actor);
  addStatusText(actor, 'Eliminated', { color: '#ef6f6c', ttl: 1.2 });
  log?.(`Arena: ${getActorName(actor)} eliminated${source ? ` by ${getActorName(source)}` : ''}.`);
  return true;
}

function renderPvpArenaOverlay(game) {
  const state = game?.world?.pvpArena;
  if (!state || state.state !== 'roundOver') return;

  injectPvpArenaStyles();

  let overlay = document.getElementById('pvpArenaOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pvpArenaOverlay';
    overlay.className = 'pvp-arena-overlay';
    document.body.appendChild(overlay);
  }

  const renderKey = `${state.state}:${state.winnerSlot}:${state.winnerName}`;
  overlay.__runalisGame = game;

  if (overlay.dataset.renderKey !== renderKey) {
    overlay.dataset.renderKey = renderKey;
    overlay.innerHTML = `
      <div class="pvp-arena-panel" role="dialog" aria-modal="true" aria-label="Arena result">
        <span>Arena Result</span>
        <h2>${escapeHtml(state.winnerName || 'No winner')}</h2>
        <p>${state.winnerSlot ? `Player ${state.winnerSlot} wins the match.` : 'The match ended without a standing winner.'}</p>
        <div class="pvp-arena-actions">
          <button type="button" data-pvp-action="${PVP_RESULT_ACTIONS.REMATCH}" data-pvp-rematch>Rematch</button>
          <button type="button" data-pvp-action="${PVP_RESULT_ACTIONS.RETURN_TO_ORRAKAI}" data-pvp-return>Return to Orrakai</button>
        </div>
      </div>
    `;

    overlay.querySelectorAll('[data-pvp-action]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const currentGame = overlay.__runalisGame || game;
        handlePvpArenaResultAction(currentGame, event.currentTarget?.dataset?.pvpAction, 'mouse');
      });
    });
    overlay.dataset.focusIndex = '1';
  }

  overlay.classList.add('active');
  applyPvpOverlayFocus(overlay);
}

function applyPvpOverlayFocus(overlay, buttons = null, index = null) {
  const focusables = buttons || Array.from(overlay.querySelectorAll('button')).filter(button => !button.disabled);
  if (!focusables.length) return;

  const safeIndex = Math.max(0, Math.min(focusables.length - 1, Number(index ?? overlay.dataset.focusIndex ?? 0)));
  overlay.dataset.focusIndex = String(safeIndex);
  overlay.querySelectorAll('.pvp-controller-focus').forEach(button => button.classList.remove('pvp-controller-focus'));
  focusables[safeIndex].classList.add('pvp-controller-focus');
  focusables[safeIndex].focus?.({ preventScroll: true });
}

function closePvpArenaOverlay() {
  const overlay = document.getElementById('pvpArenaOverlay');
  if (!overlay) return;

  overlay.classList.remove('active');
  overlay.innerHTML = '';
  overlay.__runalisGame = null;
  delete overlay.dataset.renderKey;
}

function injectPvpArenaStyles() {
  if (document.getElementById('runalisPvpArenaStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisPvpArenaStyles';
  style.textContent = `
    .pvp-arena-overlay {
      position: fixed;
      inset: 0;
      z-index: 92;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(4, 5, 10, 0.72);
      backdrop-filter: blur(5px);
    }

    .pvp-arena-overlay.active {
      display: flex;
    }

    .pvp-arena-panel {
      width: min(520px, 92vw);
      padding: 22px;
      border: 1px solid rgba(239, 111, 108, 0.58);
      color: #f4ead2;
      background: linear-gradient(180deg, rgba(26, 19, 24, 0.98), rgba(8, 9, 14, 0.98));
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.58);
    }

    .pvp-arena-panel span {
      color: #ef6f6c;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1.3px;
      text-transform: uppercase;
    }

    .pvp-arena-panel h2 {
      margin: 6px 0 8px;
      font-size: 34px;
      line-height: 1;
    }

    .pvp-arena-panel p {
      margin: 0 0 18px;
      color: #c7ceda;
    }

    .pvp-arena-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pvp-arena-actions button {
      min-height: 44px;
      padding: 0 18px;
      border-radius: 4px;
      border: 1px solid rgba(255, 204, 102, 0.5);
      color: #11131a;
      background: linear-gradient(180deg, #ffe08a, #d9ad4f);
      font-weight: 900;
      text-transform: uppercase;
    }

    .pvp-controller-focus {
      outline: 3px solid rgba(255, 204, 102, 0.95) !important;
      outline-offset: 3px !important;
    }
  `;
  document.head.appendChild(style);
}

function ensurePvpArenaState(game) {
  const world = game?.world;
  world.pvpArena = world.pvpArena && typeof world.pvpArena === 'object'
    ? world.pvpArena
    : {};

  if (!Array.isArray(world.pvpArena.runtimeActors)) {
    Object.defineProperty(world.pvpArena, 'runtimeActors', {
      value: getArenaPlayers(game),
      writable: true,
      configurable: true,
      enumerable: false
    });
  }

  world.pvpArena.state = world.pvpArena.state || 'countdown';
  world.pvpArena.countdown = Math.max(0, Number(world.pvpArena.countdown || 0));
  return world.pvpArena;
}

function ensureActorPvpState(actor) {
  actor.pvpArena = actor.pvpArena && typeof actor.pvpArena === 'object'
    ? actor.pvpArena
    : {};
  actor.pvpArena.active = true;
  return actor.pvpArena;
}

function getArenaPlayers(game) {
  const host = game?.player;
  if (!host) return [];

  return [
    host,
    ...((host.coop?.players || []).filter(ally => ally && ally.active !== false))
  ].filter(Boolean).slice(0, 4);
}

function getPvpActors(game, world) {
  const state = ensurePvpArenaState(game);
  if (!Array.isArray(state.runtimeActors) || !state.runtimeActors.length) {
    state.runtimeActors = getArenaPlayers(game);
  }
  return state.runtimeActors.filter(actor => actor && actor.active !== false).slice(0, 4);
}

function getPvpActorsFromWorld(world) {
  return (world?.pvpArena?.runtimeActors || []).filter(actor => actor && actor.active !== false).slice(0, 4);
}

function isPvpActorStillInMatch(actor) {
  return !!actor && actor.active !== false && actor.pvpArena?.active && !actor.pvpArena.eliminated && (actor.hp || 0) > 0;
}

function getActorSlot(actor, fallbackIndex = 0) {
  return Math.max(1, Number(actor?.slot || actor?.playerNumber || fallbackIndex + 1 || 1));
}

function getActorName(actor, fallbackIndex = 0) {
  return actor?.name || `Player ${getActorSlot(actor, fallbackIndex)}`;
}

function captureActorReturnState(actor) {
  return {
    hp: Number(actor.hp || 1),
    stamina: Number(actor.stamina || 0),
    spirit: Number(actor.spirit || 0),
    x: Number(actor.x || 0),
    y: Number(actor.y || 0),
    dirX: Number(actor.dirX || 0),
    dirY: Number(actor.dirY || 1),
    currentZone: actor.currentZone || 'Orrakai'
  };
}

function restoreActorAfterArena(actor) {
  const saved = actor?.pvpArena?.returnState;
  if (!actor) return;

  actor.hp = Math.max(1, Math.min(Number(actor.maxHp || saved?.hp || 1), Number(saved?.hp || actor.maxHp || 1)));
  actor.stamina = Math.max(0, Math.min(Number(actor.maxStamina || saved?.stamina || 0), Number(saved?.stamina || actor.maxStamina || 0)));
  actor.spirit = Math.max(0, Math.min(Number(actor.maxSpirit || saved?.spirit || 0), Number(saved?.spirit || actor.maxSpirit || 0)));
  actor.dirX = Number(saved?.dirX || 0);
  actor.dirY = Number(saved?.dirY || 1);
  actor.currentZone = 'Orrakai';
  actor.pvpArena = null;
  clearActorArenaCombatState(actor);
}

function placeArenaPartyAtReturn(game, actors, returnPoint) {
  const offsets = [
    { x: 0, y: 0 },
    { x: -TILE, y: 0 },
    { x: TILE, y: 0 },
    { x: 0, y: TILE }
  ];

  for (let index = 0; index < actors.length; index++) {
    const actor = actors[index];
    const offset = offsets[index] || offsets[0];

    restoreActorAfterArena(actor);
    actor.x = Number(returnPoint?.x || 57 * TILE) + offset.x;
    actor.y = Number(returnPoint?.y || 19 * TILE) + offset.y;
    actor.currentZone = game.world?.name || 'Orrakai';
  }
}

function findArenaReturnPoint(world) {
  const gate = (world?.objects || []).find(object => object?.kind === 'arenaGate');
  return {
    x: Number(gate?.x || 57 * TILE),
    y: Number(gate?.y || 18 * TILE) + TILE
  };
}

function createFallbackReturnWorld() {
  const tiles = [];
  for (let y = 0; y < 12; y++) {
    const row = [];
    for (let x = 0; x < 16; x++) {
      row.push({ biome: y <= 1 || x <= 1 || y >= 10 || x >= 14 ? 'wall' : 'path', passable: !(y <= 1 || x <= 1 || y >= 10 || x >= 14) });
    }
    tiles.push(row);
  }

  return {
    mode: 'capital',
    name: 'Orrakai',
    safeZone: true,
    width: 16,
    height: 12,
    tileSize: TILE,
    tiles,
    objects: [],
    enemies: [],
    drops: [],
    effects: [],
    combatEffects: [],
    spawn: { x: 8 * TILE, y: 6 * TILE }
  };
}

function clearActorArenaCombatState(actor) {
  if (!actor) return;

  if (actor.combatState) {
    actor.combatState.attacking = false;
    actor.combatState.comboStep = 0;
    actor.combatState.attackLungeRemaining = 0;
    actor.combatState.hitTargets = [];
    actor.combatState.projectiles = [];
    actor.combatState.projectileFiredForAttackId = null;
    actor.combatState.heavyChargeActive = false;
    actor.combatState.heavyChargeTime = 0;
    actor.combatState.heavyChargeReady = false;
    actor.combatState.queuedHeavyRelease = false;
  }

  actor.visualAction = null;
  actor.abilityCharge = null;
  actor.abilityProjectiles = [];
  actor.combatEffects = [];
  actor.traps = [];
  actor.buffs = {};
  actor.reviveAction = null;
  actor.downed = false;
  actor.isDowned = false;
  actor.hitFlash = 0;
  actor.invulnerableUntil = 0;
  actor.guardBreakTimer = 0;

  if (actor.actionState) {
    actor.actionState.sprinting = false;
    actor.actionState.blocking = false;
    actor.actionState.dashing = false;
    actor.actionState.guardBroken = false;
    actor.actionState.dashTimer = 0;
    actor.actionState.dodgeIFrameDelay = 0;
    actor.actionState.dodgeIFrameTimer = 0;
    actor.actionState.staminaRegenDelay = 0;
    actor.actionState.guardBreakTimer = 0;
  }

  if (actor.thornbinder) {
    actor.thornbinder.bramblePatch = null;
    actor.thornbinder.briarBloomUntil = 0;
    actor.thornbinder.briarBloomNextTickAt = 0;
  }

  if (actor.oathkeeper) {
    actor.oathkeeper.consecratedGround = null;
    actor.oathkeeper.bulwarkUntil = 0;
  }

  if (actor.passiveState) {
    actor.passiveState.oathboundRiposteUntil = 0;
    actor.passiveState.oathboundRiposteStacks = 0;
    actor.passiveState.combatReloadUntil = 0;
    actor.passiveState.combatReloadStacks = 0;
    actor.passiveState.livingBulwarkUntil = 0;
    actor.passiveState.hydromancerFlowStacks = 0;
    actor.passiveState.hydromancerFlowUntil = 0;
  }

  if (actor.flags) {
    actor.flags.oathboundRiposteUntil = 0;
    actor.flags.oathboundRiposteStacks = 0;
    actor.flags.combatReloadUntil = 0;
    actor.flags.combatReloadStacks = 0;
    actor.flags.livingBulwarkUntil = 0;
    actor.flags.hydromancerFlowStacks = 0;
    actor.flags.hydromancerFlowUntil = 0;
    actor.flags.guarding = false;
  }

  if (actor.visuals) {
    actor.visuals.bubbleWardUntil = 0;
    actor.visuals.bubbleWardFlatAbsorb = 0;
  }

  if (actor.lightbringer?.dawncarverChannel) actor.lightbringer.dawncarverChannel = null;
  stopAbilityChannel(actor,'arenaReset');
}

function getPvpNow() {
  return typeof performance !== 'undefined'
    ? performance.now() / 1000
    : Date.now() / 1000;
}

function getActorAim(actor) {
  return normalizeVector(actor?.dirX, actor?.dirY, 0, 1);
}

function normalizeVector(x, y, fallbackX = 0, fallbackY = 1) {
  const nx = Number(x || 0);
  const ny = Number(y || 0);
  const length = Math.hypot(nx, ny);

  if (length > 0.001) {
    return { x: nx / length, y: ny / length };
  }

  const fx = Number(fallbackX || 0);
  const fy = Number(fallbackY || 1);
  const fallbackLength = Math.hypot(fx, fy) || 1;
  return { x: fx / fallbackLength, y: fy / fallbackLength };
}

function pushPvpHitEffect(world, x, y, color = '#ef6f6c') {
  if (!world) return;

  world.effects = Array.isArray(world.effects) ? world.effects : [];
  world.effects.push({
    kind: 'hitSpark',
    layer: 'front',
    x,
    y,
    color,
    ttl: 0.22,
    radius: 16
  });

  if (world.effects.length > 160) {
    world.effects.splice(0, world.effects.length - 160);
  }
}

function clonePlainWorld(world) {
  if (!world || typeof world !== 'object') return null;

  try {
    return JSON.parse(JSON.stringify(world));
  } catch {
    return null;
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
