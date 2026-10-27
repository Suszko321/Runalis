import {placeAtNavStone} from './navStoneNetwork.js';
import {
  addFloatingText,
  addStatusText
} from './floatingText.js';

import {
  playSfx
} from './audioSystem.js';

export const COOP_DOWNED_DURATION = 20;
export const REVIVE_REQUIRED_HITS = 3;
export const REVIVE_RANGE = 58;
export const REVIVE_CANCEL_RANGE = 86;
export const REVIVE_MIN_RESTORE = 0.25;
export const REVIVE_INVULNERABILITY_SECONDS = 1.5;

const REVIVE_BASE_WINDOW = 0.18;
const REVIVE_MIN_WINDOW = 0.125;
const REVIVE_BASE_SPEED = 0.86;

export function getActorReviveId(actor) {
  return String(actor?.profileId || actor?.id || actor?.sessionSlot || actor?.slot || actor?.playerNumber || 'player');
}

export function isActorDowned(actor) {
  return !!actor && (actor.lifeState === 'downed' || actor.lifeState === 'beingRevived');
}

export function isActorBeingRevived(actor) {
  return !!actor && actor.lifeState === 'beingRevived';
}

export function isActorDeadForCoop(actor) {
  return !!actor && (actor.lifeState === 'dead' || actor.lifeState === 'respawning');
}

export function isActorAliveForCoop(actor) {
  if (!actor || actor.active === false) return false;
  if (isActorDowned(actor) || isActorDeadForCoop(actor)) return false;
  return Number(actor.hp || 0) > 0;
}

export function isActorControlLockedByRevive(actor) {
  return isActorDowned(actor) || isActorDeadForCoop(actor) || !!actor?.reviveAction?.active;
}

export function getDownedRemaining(actor, now = performance.now() / 1000) {
  if (!isActorDowned(actor)) return 0;
  return Math.max(0, Number(actor.downedState?.expiresAt || now) - now);
}

export function clearCoopReviveState(actor, options = {}) {
  if (!actor) return;

  const preserveAlive = options.preserveLifeState === true;
  if (!preserveAlive || isActorDowned(actor) || isActorDeadForCoop(actor)) {
    actor.lifeState = options.lifeState || 'alive';
  }

  actor.downedState = null;
  actor.reviveAction = null;
}

export function sanitizeActorReviveStateForSave(actor) {
  if (!actor) return actor;

  if (isActorDowned(actor) || isActorDeadForCoop(actor) || Number(actor.hp || 0) <= 0) {
    actor.lifeState = 'alive';
    actor.hp = Math.max(1, Math.floor((actor.maxHp || 100) * REVIVE_MIN_RESTORE));
    actor.stamina = Math.max(1, Math.floor((actor.maxStamina || 100) * REVIVE_MIN_RESTORE));
    if (actor.spiritAwakened) {
      actor.spirit = Math.max(0, Math.floor((actor.maxSpirit || 0) * REVIVE_MIN_RESTORE));
    }
  }

  actor.downedState = null;
  actor.reviveAction = null;
  return actor;
}

export function handleActorZeroHpForCoop(game, actor, now = performance.now() / 1000) {
  if (!game || !actor) return false;
  if (isActorDowned(actor) || isActorDeadForCoop(actor)) return true;

  const party = getActiveParty(game);
  if (party.length <= 1) return false;

  const livingAllies = party.filter(member => member !== actor && isActorAliveForCoop(member));

  if (!livingAllies.length) {
    enterCoopDownedState(game, actor, now);
    handleCoopPartyWipe(game, now);
    return true;
  }

  enterCoopDownedState(game, actor, now);
  return true;
}

export function enterCoopDownedState(game, actor, now = performance.now() / 1000) {
  if (!actor || isActorDowned(actor)) return false;

  cancelActorCombatControl(actor);
  actor.hp = 0;
  actor.lifeState = 'downed';
  actor.downedState = {
    startedAt: now,
    expiresAt: now + COOP_DOWNED_DURATION,
    currentReviverId: null,
    feedback: 'Downed'
  };
  actor.reviveAction = null;

  addStatusText(actor, `DOWNED - ${COOP_DOWNED_DURATION}s`, {
    color: '#ff8c8c',
    ttl: 1.2
  });
  game?.log?.(`${actor.name || 'A player'} is downed. Revive them within ${COOP_DOWNED_DURATION} seconds.`);
  playSfx('playerHit', { volume: 0.7, throttle: 0.12 });
  return true;
}

export function updateCoopReviveTimers(game, dt, now = performance.now() / 1000) {
  if (!game) return;

  const party = getActiveParty(game);
  if (party.length <= 1) return;

  for (const actor of party) {
    if ((actor.hp || 0) <= 0 && !isActorDowned(actor) && !isActorDeadForCoop(actor)) {
      handleActorZeroHpForCoop(game, actor, now);
    }
  }

  for (const actor of party) {
    if (!isActorDowned(actor)) continue;
    if (getDownedRemaining(actor, now) <= 0) {
      expireDownedActor(game, actor, now);
    }
  }

  const refreshedParty = getActiveParty(game);
  const hasDowned = refreshedParty.some(actor => isActorDowned(actor) || isActorDeadForCoop(actor));
  const hasLiving = refreshedParty.some(actor => isActorAliveForCoop(actor));

  if (hasDowned && !hasLiving) {
    handleCoopPartyWipe(game, now);
  }
}

export function processReviveInput(game, reviver, input, dt, now = performance.now() / 1000) {
  if (!game || !reviver || reviver.active === false) return false;

  if (reviver.reviveAction?.active) {
    return updateReviveAction(game, reviver, input, dt, now);
  }

  if (!isActorAliveForCoop(reviver)) return false;
  if (!(input?.interactPressed || input?.confirmPressed)) return false;

  const target = findNearestDownedReviveTarget(game, reviver);
  if (!target) return false;

  startReviveAction(game, reviver, target, now);
  return true;
}

export function findNearestDownedReviveTarget(game, reviver, range = REVIVE_RANGE) {
  if (!game || !reviver || !isActorAliveForCoop(reviver)) return null;

  const reviverId = getActorReviveId(reviver);
  const candidates = getActiveParty(game)
    .filter(actor => actor && actor !== reviver && isActorDowned(actor))
    .filter(actor => {
      const currentReviver = actor.downedState?.currentReviverId || null;
      return !currentReviver || currentReviver === reviverId;
    })
    .map(actor => ({
      actor,
      distance: Math.hypot(Number(actor.x || 0) - Number(reviver.x || 0), Number(actor.y || 0) - Number(reviver.y || 0))
    }))
    .filter(entry => entry.distance <= range)
    .sort((a, b) => a.distance - b.distance);

  return candidates[0]?.actor || null;
}

export function getRevivePromptForActor(game, actor, now = performance.now() / 1000) {
  if (!game || !actor || actor.reviveAction?.active || !isActorAliveForCoop(actor)) return null;

  const target = findNearestDownedReviveTarget(game, actor, REVIVE_RANGE);
  if (!target) return null;

  return {
    target,
    text: `A Revive ${target.name || `P${target.slot || target.playerNumber || '?'}`}`,
    remaining: getDownedRemaining(target, now)
  };
}

export function cancelReviveAction(game, reviver, reason = 'Revive cancelled.') {
  if (!reviver?.reviveAction?.active) return false;

  const action = reviver.reviveAction;
  const target = findPartyActorById(game, action.targetId);

  if (target?.downedState?.currentReviverId === getActorReviveId(reviver)) {
    target.downedState.currentReviverId = null;
    if (isActorBeingRevived(target)) target.lifeState = 'downed';
  }

  reviver.reviveAction = null;
  if (reason) game?.log?.(reason);
  return true;
}

export function handleActorLeavingReviveState(game, actor) {
  if (!game || !actor) return;

  const actorId = getActorReviveId(actor);

  if (actor.reviveAction?.active) {
    cancelReviveAction(game, actor, null);
  }

  for (const member of getActiveParty(game)) {
    if (member?.reviveAction?.targetId === actorId) {
      cancelReviveAction(game, member, null);
    }

    if (member?.downedState?.currentReviverId === actorId) {
      member.downedState.currentReviverId = null;
      if (isActorBeingRevived(member)) member.lifeState = 'downed';
    }
  }

  clearCoopReviveState(actor);
}

function startReviveAction(game, reviver, target, now) {
  const reviverId = getActorReviveId(reviver);

  target.lifeState = 'beingRevived';
  target.downedState = target.downedState || {
    startedAt: now,
    expiresAt: now + COOP_DOWNED_DURATION,
    feedback: 'Being revived'
  };
  target.downedState.currentReviverId = reviverId;

  reviver.reviveAction = {
    active: true,
    targetId: getActorReviveId(target),
    startedAt: now,
    cursor: Math.random(),
    direction: Math.random() < 0.5 ? 1 : -1,
    attempts: [],
    feedback: 'Time the revive',
    targetStart: 0,
    targetEnd: 0,
    targetCenter: 0,
    windowSize: 0,
    speed: REVIVE_BASE_SPEED
  };

  configureReviveWindow(reviver.reviveAction);
  cancelActorCombatControl(reviver);
  addStatusText(reviver, 'Revive started', {
    color: '#ffe58a',
    ttl: 0.8
  });
  playSfx('ui', { volume: 0.65, throttle: 0.12 });
}

function updateReviveAction(game, reviver, input, dt, now) {
  const action = reviver.reviveAction;
  const target = findPartyActorById(game, action?.targetId);

  if (!action?.active || !target || !isActorDowned(target)) {
    reviver.reviveAction = null;
    return false;
  }

  if (!isActorAliveForCoop(reviver)) {
    cancelReviveAction(game, reviver, 'Revive interrupted.');
    return true;
  }

  const distance = Math.hypot(Number(target.x || 0) - Number(reviver.x || 0), Number(target.y || 0) - Number(reviver.y || 0));
  if (distance > REVIVE_CANCEL_RANGE || input?.cancelPressed || input?.backPressed || input?.pausePressed) {
    cancelReviveAction(game, reviver, 'Revive cancelled.');
    return true;
  }

  if (getDownedRemaining(target, now) <= 0) {
    expireDownedActor(game, target, now);
    reviver.reviveAction = null;
    return true;
  }

  action.cursor += action.direction * action.speed * Math.max(0, Number(dt || 0));
  if (action.cursor >= 1) {
    action.cursor = 1;
    action.direction = -1;
  } else if (action.cursor <= 0) {
    action.cursor = 0;
    action.direction = 1;
  }

  cancelActorCombatControl(reviver);

  if (input?.confirmPressed || input?.interactPressed) {
    recordReviveAttempt(game, reviver, target, action, now);
  }

  return true;
}

function recordReviveAttempt(game, reviver, target, action, now) {
  if (!action || action.attempts.length >= REVIVE_REQUIRED_HITS) return;

  const score = scoreReviveCursor(action.cursor, action.targetStart, action.targetEnd, action.targetCenter);
  action.attempts.push(score);
  action.feedback = score.label;
  target.downedState.feedback = score.label;

  addFloatingText(target, score.label, {
    color: score.color,
    ttl: 0.72,
    size: 13,
    offsetY: -58
  });
  playSfx(score.score >= 0.75 ? 'quest' : score.score > 0 ? 'ui' : 'menuBack', {
    volume: 0.58,
    throttle: 0.08
  });

  if (action.attempts.length >= REVIVE_REQUIRED_HITS) {
    finishReviveAction(game, reviver, target, now);
    return;
  }

  configureReviveWindow(action);
}

function configureReviveWindow(action) {
  const attemptIndex = action.attempts.length;
  const windowSize = Math.max(REVIVE_MIN_WINDOW, REVIVE_BASE_WINDOW - attemptIndex * 0.022);
  const center = 0.18 + Math.random() * 0.64;

  action.windowSize = windowSize;
  action.targetCenter = center;
  action.targetStart = Math.max(0.04, center - windowSize / 2);
  action.targetEnd = Math.min(0.96, center + windowSize / 2);
  action.speed = REVIVE_BASE_SPEED + attemptIndex * 0.16;
}

function scoreReviveCursor(cursor, start, end, center) {
  const safeCursor = Math.max(0, Math.min(1, Number(cursor || 0)));
  const halfWindow = Math.max(0.001, (end - start) / 2);
  const distance = Math.abs(safeCursor - center);

  if (safeCursor < start || safeCursor > end) {
    return {
      score: 0,
      label: 'Miss',
      color: '#9facbf'
    };
  }

  const closeness = Math.max(0, 1 - distance / halfWindow);

  if (closeness >= 0.88) {
    return {
      score: 1,
      label: 'Perfect',
      color: '#fff1b8'
    };
  }

  if (closeness >= 0.66) {
    return {
      score: 0.75,
      label: 'Great',
      color: '#73d18a'
    };
  }

  if (closeness >= 0.38) {
    return {
      score: 0.5,
      label: 'Good',
      color: '#66f0ff'
    };
  }

  return {
    score: 0.25,
    label: 'Poor',
    color: '#ffcc66'
  };
}

function finishReviveAction(game, reviver, target, now) {
  const attempts = reviver.reviveAction?.attempts || [];
  const average = attempts.length
    ? attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / REVIVE_REQUIRED_HITS
    : 0;
  const restorePercent = Math.max(REVIVE_MIN_RESTORE, Math.min(1, REVIVE_MIN_RESTORE + average * (1 - REVIVE_MIN_RESTORE)));
  const label = getReviveResultLabel(restorePercent);

  target.lifeState = 'alive';
  target.hp = Math.max(1, Math.ceil((target.maxHp || 100) * restorePercent));
  target.stamina = Math.max(1, Math.ceil((target.maxStamina || 100) * restorePercent));
  if (target.spiritAwakened) {
    target.spirit = Math.max(0, Math.ceil((target.maxSpirit || 0) * restorePercent));
  }
  target.invulnerableUntil = Math.max(Number(target.invulnerableUntil || 0), now + REVIVE_INVULNERABILITY_SECONDS);
  target.downedState = null;
  target.reviveAction = null;
  reviver.reviveAction = null;

  addStatusText(target, `${label} ${Math.round(restorePercent * 100)}%`, {
    color: restorePercent >= 0.95 ? '#fff1b8' : restorePercent >= 0.7 ? '#73d18a' : '#ffcc66',
    ttl: 1.25
  });
  game?.log?.(`${reviver.name || 'A player'} revived ${target.name || 'a player'} (${Math.round(restorePercent * 100)}%).`);
  playSfx(restorePercent >= 0.95 ? 'quest' : 'shrine', { volume: 0.75, throttle: 0.1 });
}

function getReviveResultLabel(restorePercent) {
  if (restorePercent >= 0.98) return 'Perfect Revive';
  if (restorePercent >= 0.74) return 'Strong Revive';
  if (restorePercent >= 0.48) return 'Steady Revive';
  return 'Weak Revive';
}

function expireDownedActor(game, actor, now) {
  if (!actor || !isActorDowned(actor)) return false;

  const reviver = findPartyActorById(game, actor.downedState?.currentReviverId);
  if (reviver?.reviveAction?.targetId === getActorReviveId(actor)) {
    reviver.reviveAction = null;
  }

  actor.lifeState = 'dead';
  actor.downedState = null;
  actor.reviveAction = null;

  if (actor === game?.player) {
    game?.handlePlayerDefeated?.();
    clearCoopReviveState(actor);
    return true;
  }

  respawnCoopAllyAfterExpiredDowned(game, actor);
  return true;
}

function respawnCoopAllyAfterExpiredDowned(game, ally) {
  if (!game || !ally) return;

  const gold = Math.max(0, Math.floor(Number(ally.gold || 0)));
  const lostGold = gold > 0 ? Math.min(gold, Math.max(1, Math.floor(gold * 0.12))) : 0;
  ally.gold = gold - lostGold;
  clearCoopReviveState(ally);
  ally.hp = Math.max(1, Math.floor((ally.maxHp || 100) * 0.45));
  ally.stamina = Math.max(30, Math.floor((ally.maxStamina || 100) * 0.4));
  if (ally.spiritAwakened) {
    ally.spirit = Math.max(0, Math.floor((ally.maxSpirit || 0) * 0.25));
  }
  if(game.respawnActorAtNavStone)game.respawnActorAtNavStone(ally);
  else placeAtNavStone(game,ally);
  ally.summons = [];
  cancelActorCombatControl(ally);
  game.log?.(`${ally.name || 'A co-op player'} could not be revived and returned to a Nav Stone${lostGold ? `, losing ${lostGold} gold` : ''}.`);
}

function handleCoopPartyWipe(game, now) {
  if (!game || game.__coopPartyWiping) return false;

  game.__coopPartyWiping = true;
  const party = getActiveParty(game);

  for (const actor of party) {
    clearCoopReviveState(actor);
    actor.hp = 0;
    cancelActorCombatControl(actor);
  }

  game.log?.('The party has fallen.');
  game.handlePlayerDefeated?.();

  for (const actor of getActiveParty(game)) {
    clearCoopReviveState(actor);
  }

  game.__coopPartyWiping = false;
  return true;
}

function cancelActorCombatControl(actor) {
  if (!actor) return;

  actor.moveX = 0;
  actor.moveY = 0;
  actor.isMoving = false;

  if (actor.actionState) {
    actor.actionState.sprinting = false;
    actor.actionState.blocking = false;
    actor.actionState.dashing = false;
    actor.actionState.dashTimer = 0;
  }

  if (actor.flags) {
    actor.flags.guarding = false;
  }

  if (actor.combatState) {
    actor.combatState.attacking = false;
    actor.combatState.hitTargets = [];
    actor.combatState.heavyChargeActive = false;
    actor.combatState.heavyChargeTime = 0;
    actor.combatState.heavyChargeReady = false;
    actor.combatState.attackLungeRemaining = 0;
  }

  actor.abilityCharge = null;
}

function getActiveParty(game) {
  const host = game?.player;
  if (!host) return [];

  return [
    host,
    ...(host.coop?.players || []).filter(ally => ally && ally.active !== false)
  ].filter(Boolean);
}

function findPartyActorById(game, actorId) {
  if (!actorId) return null;
  return getActiveParty(game).find(actor => getActorReviveId(actor) === String(actorId)) || null;
}
