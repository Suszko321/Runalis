// survivalSkills.js
// World-skill helpers for gathering tools, fishing, rations, and visible actions.

import { ITEMS } from './data.js';
import { addItem, removeItem, countItem, gainXp } from './player.js';
import { getSkillLevel } from './skills.js';
import { addLootText, addStatusText } from './floatingText.js';
import { playSfx } from './audioSystem.js';
import { markPartyCollectObjective } from './dialogueSystem.js';

export const SURVIVAL_TOOLS = {
  foraging: {
    id: 'oldForagersKnife',
    name: 'Old Forager\'s Knife',
    tools: [
      { id: 'oldForagersKnife', name: 'Old Forager\'s Knife', tier: 1 },
      { id: 'handScythe', name: 'Hand Scythe', tier: 1.5 },
      { id: 'ironSickle', name: 'Iron Sickle', tier: 2 },
      { id: 'echorynHerbalistKit', name: 'Echoryn Herbalist Kit', tier: 3 }
    ]
  },
  mining: {
    id: 'crackedPickaxe',
    name: 'Cracked Pickaxe',
    tools: [
      { id: 'crackedPickaxe', name: 'Cracked Pickaxe', tier: 1 },
      { id: 'ironPickaxe', name: 'Iron Pickaxe', tier: 2 },
      { id: 'deepstonePickaxe', name: 'Deepstone Pickaxe', tier: 3 }
    ]
  },
  fishing: {
    id: 'crudeFishingRod',
    name: 'Crude Fishing Rod',
    tools: [
      { id: 'crudeFishingRod', name: 'Crude Fishing Rod', tier: 1 },
      { id: 'fishingRod', name: 'Fishing Rod', tier: 1.5 },
      { id: 'ironhookRod', name: 'Ironhook Rod', tier: 2 },
      { id: 'tideglassRod', name: 'Tideglass Rod', tier: 3 }
    ]
  },
  woodcutting: {
    id: 'wornHatchet',
    name: 'Worn Hatchet',
    tools: [
      { id: 'wornHatchet', name: 'Worn Hatchet', tier: 1 },
      { id: 'ironwoodAxe', name: 'Ironwood Axe', tier: 2 },
      { id: 'briarsteelLoggingAxe', name: 'Briarsteel Logging Axe', tier: 3 }
    ]
  },
  tackle: {
    id: 'fishingTackle',
    name: 'Fishing Tackle'
  }
};

export function hasSurvivalTool(player, skillId) {
  return !!getBestSurvivalTool(player, skillId);
}

export function getBestSurvivalTool(player, skillId) {
  const tools = SURVIVAL_TOOLS[skillId]?.tools || [];
  let best = null;

  for (const tool of tools) {
    if (countItem(player, tool.id) <= 0) continue;
    if (!best || Number(tool.tier || 0) > Number(best.tier || 0)) {
      best = tool;
    }
  }

  return best;
}

export function getHarvestToolBonus(player, skillId) {
  const level = getSkillLevel(player?.skillState, skillId);
  const tool = getBestSurvivalTool(player, skillId);
  const tier = Math.max(0, Number(tool?.tier || 0));
  const hasTool = tier > 0;
  const hasTackle = skillId === 'fishing' && countItem(player, SURVIVAL_TOOLS.tackle.id) > 0;
  const kingfinPrepared = Number(player?.flags?.kingfinFeastUntil || 0) > Date.now();

  return {
    hasTool,
    tool,
    tier,
    hasTackle,
    yieldBonus: tier >= 3 ? 2 : tier >= 1 ? 1 : 0,
    xpMultiplier: 1 + tier * 0.12 + (hasTackle ? 0.08 : 0) + (kingfinPrepared ? 0.08 : 0),
    rareChanceBonus: tier * 0.045 + (hasTackle ? 0.07 : 0) + Math.min(0.14, level * 0.002) + (kingfinPrepared ? 0.04 : 0),
    respawnMultiplier: hasTool ? Math.max(0.72, 0.94 - tier * 0.06) : 1,
    label: tool?.name || null
  };
}

export function addWorldSkillEffect(game, kind, actor, target, options = {}) {
  const world = game?.world;
  if (!world) return;

  world.effects = world.effects || [];
  world.effects.push({
    kind,
    x: target?.x || actor?.x || 0,
    y: target?.y || actor?.y || 0,
    actorX: actor?.x || target?.x || 0,
    actorY: actor?.y || target?.y || 0,
    color: options.color,
    text: options.text,
    layer: options.layer || 'front',
    ttl: options.ttl || 0.55,
    age: 0
  });
}

export function startFishingMiniGame(game, object) {
  if (!game?.player || !object || object.depleted) return false;

  const hostGame = game.hostGame || game;
  const player = game.player;
  hostGame.setUiOwner?.(player);
  const level = getSkillLevel(player.skillState, 'fishing');
  const tool = getBestSurvivalTool(player, 'fishing');
  const toolTier = Math.max(0, Number(tool?.tier || 0));
  const hasRod = toolTier > 0;
  const hasTackle = countItem(player, SURVIVAL_TOOLS.tackle.id) > 0;
  const targetSize = Math.max(0.14, 0.31 + Math.min(0.16, level * 0.0025) + toolTier * 0.055 + (hasRod ? 0 : -0.08) + (hasTackle ? 0.07 : 0));
  const targetStart = 0.18 + Math.random() * Math.max(0.12, 0.72 - targetSize);

  hostGame.fishingMiniGame = {
    active: true,
    object,
    player,
    ownerSlot: player.slot || player.playerNumber || 1,
    controllerSlotIndex: player.controllerSlotIndex ?? null,
    cursor: Math.random(),
    direction: Math.random() < 0.5 ? 1 : -1,
    speed: Math.max(0.62, 1.32 - Math.min(0.35, level * 0.004) - toolTier * 0.1 - (hasTackle ? 0.12 : 0)),
    targetStart,
    targetEnd: Math.min(0.96, targetStart + targetSize),
    timer: 5.8,
    maxTimer: 5.8,
    hasRod,
    hasTackle,
    toolTier,
    toolLabel: tool?.name || null,
    level
  };

  ensureFishingOverlay(hostGame);
  updateFishingOverlay(hostGame);
  addWorldSkillEffect(game, 'fishingCast', player, object, {
    color: '#66f0ff',
    ttl: 0.7,
    layer: 'front'
  });
  playSfx('fish', { volume: hasRod ? 0.82 : 0.55, throttle: 0.12 });
  game.log?.(hasRod ? 'Cast your line. Time the reel.' : 'You try to handline the water. A rod would make this easier.');
  return true;
}

export function updateFishingMiniGame(game, dt) {
  const state = game?.fishingMiniGame;
  if (!state?.active) return false;

  state.timer -= dt;
  state.cursor += state.direction * state.speed * dt;

  if (state.cursor >= 1) {
    state.cursor = 1;
    state.direction = -1;
  } else if (state.cursor <= 0) {
    state.cursor = 0;
    state.direction = 1;
  }

  updateFishingOverlay(game);

  if (state.timer <= 0) {
    finishFishingMiniGame(game, false, 'The fish slips away.');
  }

  return true;
}

export function handleFishingMiniGameInput(game, input) {
  const state = game?.fishingMiniGame;
  if (!state?.active) return false;

  if (input?.cancelPressed || input?.backPressed) {
    finishFishingMiniGame(game, false, 'You let the line go slack.');
    return true;
  }

  if (input?.confirmPressed || input?.attackPressed) {
    const success = state.cursor >= state.targetStart && state.cursor <= state.targetEnd;
    finishFishingMiniGame(game, success);
    return true;
  }

  return true;
}

export function useRationFromBag(player, entry, item, game) {
  if (!player || !entry || !item) return false;

  const beforeHp = player.hp || 0;
  const beforeSta = player.stamina || 0;
  const beforeSpirit = player.spirit || 0;
  const heal = Math.max(0, Number(item.heal || 0));
  const stamina = Math.max(0, Number(item.stamina || 0));
  const spirit = player.spiritAwakened ? Math.max(0, Number(item.spirit || 0)) : 0;

  player.hp = Math.min(player.maxHp || 100, beforeHp + heal);
  player.stamina = Math.min(player.maxStamina || 100, beforeSta + stamina);
  player.spirit = Math.min(player.maxSpirit || 0, beforeSpirit + spirit);

  const canApplyBuff = !!item.longBuff;
  const used = player.hp > beforeHp || player.stamina > beforeSta || player.spirit > beforeSpirit || canApplyBuff;
  if (!used) return false;

  const spiritText = player.spirit > beforeSpirit ? ` / +${Math.round(player.spirit - beforeSpirit)} SPI` : '';
  const buffText = applyFoodLongBuff(player, item);

  addStatusText(player, `+${Math.round(player.hp - beforeHp)} HP / +${Math.round(player.stamina - beforeSta)} STA${spiritText}`, {
    color: '#ffcc66',
    ttl: 1.1
  });
  playSfx('harvest', { volume: 0.55, throttle: 0.08 });
  game?.log?.(`${item.name} restored health and stamina${buffText ? ` and granted ${buffText}` : ''}.`);
  return true;
}

function applyFoodLongBuff(player, item) {
  if (!item?.longBuff) return '';

  player.flags = player.flags || {};
  const duration = Math.max(30_000, Number(item.buffDurationMs || 10 * 60 * 1000));
  const until = Date.now() + duration;

  if (item.longBuff === 'kingfinFeast') {
    player.flags.kingfinFeastUntil = Math.max(Number(player.flags.kingfinFeastUntil || 0), until);
    addStatusText(player, 'Kingfin Feast: Gathering Luck', { color: '#ffcc66', ttl: 1.35 });
    return 'Kingfin Feast';
  }

  if (item.longBuff === 'thornskin') {
    player.flags.thornskinUntil = Math.max(Number(player.flags.thornskinUntil || 0), until);
    addStatusText(player, 'Thornskin', { color: '#73d18a', ttl: 1.35 });
    return 'Thornskin';
  }

  return '';
}

function finishFishingMiniGame(game, success, failMessage = null) {
  const state = game?.fishingMiniGame;
  if (!state?.active) return false;

  const player = state.player || game.player;
  const object = state.object;

  closeFishingOverlay();
  game.fishingMiniGame.active = false;
  game.fishingMiniGame = null;

  if (!success) {
    game.log?.(failMessage || 'The fish breaks away.');
    addStatusText(player, 'Fish Escaped', { color: '#9facbf' });
    addWorldSkillEffect(game, 'fishingSplash', player, object, { color: '#6fa8ef', ttl: 0.45 });
    playSfx('fish', { volume: 0.42, throttle: 0.08 });
    return false;
  }

  const reward = rollFishingReward(player, state);
  addItem(player, reward.itemId, reward.qty);
  markPartyCollectObjective(player, reward.itemId, reward.qty);
  gainXp(player, 'fishing', reward.xp, game.log);
  const newFishingLevel = getSkillLevel(player.skillState, 'fishing');

  let tackleConsumed = false;
  if (state.hasTackle && Math.random() < 0.18) {
    removeItem(player, SURVIVAL_TOOLS.tackle.id, 1);
    tackleConsumed = true;
  }

  object.depleted = true;
  object.respawn = Math.max(8, (object.respawnTime || 18) * (state.hasRod ? 0.82 : 1.15));

  const item = ITEMS[reward.itemId];
  const label = `${item?.name || reward.itemId}${reward.qty > 1 ? ` x${reward.qty}` : ''}`;
  const toolText = [
    state.toolLabel || (state.hasRod ? 'Fishing Rod' : null),
    state.hasTackle ? 'Tackle' : null
  ].filter(Boolean).join(' + ');
  game.log?.(`Caught ${label}. Fishing +${reward.xp} XP${toolText ? ` (${toolText} bonus)` : ''}.`);
  if (reward.legendary) {
    game.log?.('Legendary catch: The Pale Kingfin.');
    addStatusText(player, 'Legendary Catch', { color: '#ffcc66', ttl: 1.6 });
  }
  if (tackleConsumed) game.log?.('Fishing Tackle used: one tackle consumed.');
  addLootText(player, label, { color: reward.rare ? '#66f0ff' : '#6fa8ef' });
  addStatusText(player, `Fishing +${reward.xp} XP`, { color: '#66f0ff', ttl: 0.95 });
  if (newFishingLevel > Number(state.level || 1)) {
    addStatusText(player, `Fishing Level ${newFishingLevel}`, { color: '#ffcc66', ttl: 1.35 });
  }
  addWorldSkillEffect(game, 'fishingSplash', player, object, { color: reward.rare ? '#66f0ff' : '#6fa8ef', ttl: 0.7 });
  playSfx(reward.rare ? 'loot' : 'fish', { volume: reward.rare ? 0.95 : 0.78, throttle: 0.08 });
  return true;
}

function rollFishingReward(player, state) {
  const level = state.level || getSkillLevel(player.skillState, 'fishing');
  const toolTier = Math.max(0, Number(state.toolTier || (state.hasRod ? 1 : 0)));
  const kingfinPrepared = Number(player?.flags?.kingfinFeastUntil || 0) > Date.now();
  const rareChance = Math.min(0.46, 0.07 + level * 0.006 + toolTier * 0.055 + (state.hasTackle ? 0.12 : 0) + (kingfinPrepared ? 0.03 : 0));
  const uncommonChance = Math.min(0.46, 0.18 + level * 0.004 + toolTier * 0.045);
  const roll = Math.random();

  if (level >= 10 && toolTier >= 3 && roll < 0.012 + Math.min(0.02, level * 0.001) + (state.hasTackle ? 0.008 : 0)) {
    return { itemId: 'paleKingfin', qty: 1, xp: 180, rare: true, legendary: true };
  }

  if (level >= 8 && toolTier >= 2 && roll < rareChance * 0.32) {
    return { itemId: 'tideglassKoi', qty: 1, xp: 95, rare: true };
  }

  if (roll < rareChance) {
    const rarePool = [
      level >= 7 ? 'moonfinTrout' : 'silverfin',
      level >= 7 ? 'ashbellyPike' : 'lanternGill',
      level >= 8 ? 'dawnscaleSalmon' : 'silverfin',
      level >= 9 ? 'gravewaterEel' : 'lanternGill'
    ];
    const itemId = rarePool[Math.floor(Math.random() * rarePool.length)] || 'silverfin';
    return { itemId, qty: level >= 14 && Math.random() < 0.18 ? 2 : 1, xp: itemId === 'silverfin' ? 38 : 62, rare: true };
  }

  if (roll < rareChance + uncommonChance) {
    const pool = ['silverfin', 'lanternGill', 'echorynRiverperch', 'mudscaleCarp'];
    const itemId = pool[Math.floor(Math.random() * pool.length)] || 'riverfish';
    return { itemId, qty: state.hasTackle && Math.random() < 0.22 ? 2 : 1, xp: itemId === 'silverfin' || itemId === 'lanternGill' ? 34 : 24 };
  }

  const commonPool = ['rawSunfish', 'riverfish', 'silverfinMinnow', 'echorynRiverperch', 'mudscaleCarp'];
  const itemId = commonPool[Math.floor(Math.random() * commonPool.length)] || 'rawSunfish';
  return { itemId, qty: toolTier >= 2 && Math.random() < 0.18 ? 2 : 1, xp: 16 };
}

function ensureFishingOverlay(game) {
  let overlay = document.getElementById('fishingMiniGameOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fishingMiniGameOverlay';
    overlay.className = 'fishing-mini-game-overlay';
    document.body.appendChild(overlay);
  }

  injectFishingStyles();
  overlay.__runalisGame = game;
  overlay.dataset.ownerSlot = String(game.fishingMiniGame?.ownerSlot || 1);
  if (game.fishingMiniGame?.controllerSlotIndex !== null && game.fishingMiniGame?.controllerSlotIndex !== undefined) {
    overlay.dataset.controllerSlotIndex = String(game.fishingMiniGame.controllerSlotIndex);
  } else {
    delete overlay.dataset.controllerSlotIndex;
  }
  overlay.innerHTML = cleanFishingOverlayText(`
    <div class="fishing-card">
      <div>
        <span class="fishing-kicker">Fishing</span>
        <h2>Time the Reel</h2>
      </div>
      <div class="fishing-track" data-fishing-track>
        <div class="fishing-zone" data-fishing-zone></div>
        <div class="fishing-cursor" data-fishing-cursor></div>
      </div>
      <div class="fishing-meta">
        <span data-fishing-time></span>
        <span>A / Space to reel • B / Esc to cancel</span>
      </div>
      <button type="button" data-fishing-reel>Reel</button>
    </div>
  `);
  overlay.classList.add('active');
  overlay.tabIndex = -1;
  overlay.focus();

  overlay.querySelector('[data-fishing-reel]')?.addEventListener('click', () => {
    const state = game.fishingMiniGame;
    if (!state?.active) return;
    const success = state.cursor >= state.targetStart && state.cursor <= state.targetEnd;
    finishFishingMiniGame(game, success);
  });

  overlay.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishFishingMiniGame(game, false, 'You let the line go slack.');
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const state = game.fishingMiniGame;
      const success = state.cursor >= state.targetStart && state.cursor <= state.targetEnd;
      finishFishingMiniGame(game, success);
    }
  };
}

function updateFishingOverlay(game) {
  const state = game?.fishingMiniGame;
  const overlay = document.getElementById('fishingMiniGameOverlay');
  if (!state?.active || !overlay) return;

  overlay.querySelector('[data-fishing-zone]')?.style.setProperty('--start', `${state.targetStart * 100}%`);
  overlay.querySelector('[data-fishing-zone]')?.style.setProperty('--width', `${(state.targetEnd - state.targetStart) * 100}%`);
  overlay.querySelector('[data-fishing-cursor]')?.style.setProperty('--cursor', `${state.cursor * 100}%`);

  const time = overlay.querySelector('[data-fishing-time]');
  if (time) {
    time.textContent = `${Math.max(0, state.timer).toFixed(1)}s`;
  }
}

function closeFishingOverlay() {
  const overlay = document.getElementById('fishingMiniGameOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.innerHTML = '';
  overlay.__runalisGame = null;
  delete overlay.dataset.ownerSlot;
  delete overlay.dataset.controllerSlotIndex;
}

function injectFishingStyles() {
  if (document.getElementById('runalisFishingMiniGameStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisFishingMiniGameStyles';
  style.textContent = `
    .fishing-mini-game-overlay {
      position: fixed;
      inset: auto 0 90px;
      z-index: 70;
      display: none;
      justify-content: center;
      pointer-events: auto;
    }

    .fishing-mini-game-overlay.active {
      display: flex;
    }

    .fishing-card {
      width: min(620px, 92vw);
      padding: 18px;
      color: #eef7ff;
      background:
        linear-gradient(180deg, rgba(22, 29, 42, 0.98), rgba(6, 9, 15, 0.98)),
        #10151f;
      border: 1px solid rgba(102, 240, 255, 0.38);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.48), inset 0 0 0 1px rgba(255,255,255,0.05);
    }

    .fishing-kicker {
      color: #66f0ff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .fishing-card h2 {
      margin: 2px 0 12px;
      letter-spacing: 0;
    }

    .fishing-track {
      position: relative;
      height: 30px;
      overflow: hidden;
      background: linear-gradient(90deg, rgba(16,28,44,0.95), rgba(20,50,65,0.95));
      border: 1px solid rgba(102, 240, 255, 0.3);
    }

    .fishing-zone {
      position: absolute;
      left: var(--start, 30%);
      width: var(--width, 30%);
      top: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(115,209,138,0.9), rgba(47,122,76,0.9));
      box-shadow: 0 0 18px rgba(115,209,138,0.5);
    }

    .fishing-cursor {
      position: absolute;
      left: var(--cursor, 50%);
      top: -5px;
      bottom: -5px;
      width: 4px;
      background: #ffcc66;
      box-shadow: 0 0 18px rgba(255,204,102,0.8);
    }

    .fishing-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin: 10px 0 14px;
      color: #aeb6c7;
      font-size: 13px;
    }

    .fishing-card button {
      min-height: 42px;
      padding: 0 18px;
      border-radius: 4px;
      border: 1px solid rgba(255, 204, 102, 0.52);
      color: #f4ead2;
      background: linear-gradient(180deg, rgba(61,48,22,0.98), rgba(23,18,11,0.98));
      font-weight: 900;
      text-transform: uppercase;
    }
  `;

  document.head.appendChild(style);
}

function cleanFishingOverlayText(html) {
  return String(html || '').replace(/\u00e2\u20ac\u00a2/g, '-');
}
