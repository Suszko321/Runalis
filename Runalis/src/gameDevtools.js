// gameDevTools.js
// Runalis pause menu + developer tools.
//
// Responsibilities:
// - create/fix pause overlay
// - inject pause menu CSS
// - render dev tool buttons
// - grant items/gear
// - raise skills
// - enter test dungeon
// - restore player
//
// main.js should import these functions and call them with the active game instance.

import { ITEMS, RARITY } from './data.js';

import {
  addItem,
  migratePlayer
} from './player.js';

import {
  addFloatingText,
  addLootText,
  addQuestText,
  addStatusText
} from './floatingText.js';

import { renderUI } from './ui.js';

import {
  devEnterTestDungeon as devEnterTestDungeonSystem
} from './dungeonSystem.js';

import {
  CLASS_STARTER_GEAR,
  grantClassStarterGear,
  refreshClassAbilityUnlocks,
  getClassColor,
  getItemFloatingColor,
  skillLabel
} from './gameInteraction.js';

// -----------------------------------------------------------------------------
// PAUSE OVERLAY
// -----------------------------------------------------------------------------

export function ensurePauseOverlay(currentGame = null) {
  let overlay = document.getElementById('pauseOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pauseOverlay';
    document.body.appendChild(overlay);
  }

  overlay.classList.add('pause-overlay');

  const needsPanel = !overlay.querySelector('.pause-panel');

  if (needsPanel) {
    overlay.innerHTML = `
      <div class="pause-panel">
        <div class="pause-header">
          <h2>Paused</h2>
          <p class="tag">Runalis Dev / Pause Menu</p>
        </div>

        <div class="pause-button-row">
          <button id="resumeBtn" type="button">Resume</button>
          <button id="pauseSaveBtn" type="button">Save</button>
          <button id="saveQuitBtn" type="button">Save & Quit</button>
        </div>

        <div id="pauseDevTools"></div>
      </div>
    `;
  }

  if (!document.getElementById('pauseDevTools')) {
    const panel = overlay.querySelector('.pause-panel') || overlay;

    const dev = document.createElement('div');
    dev.id = 'pauseDevTools';

    panel.appendChild(dev);
  }

  bindPauseButtons(currentGame);
}

export function bindPauseButtons(currentGame = null) {
  const resume = document.getElementById('resumeBtn');
  if (resume && !resume.dataset.boundPause) {
    resume.dataset.boundPause = '1';
    resume.onclick = () => currentGame?.togglePause(false);
  }

  const save = document.getElementById('pauseSaveBtn');
  if (save && !save.dataset.boundPause) {
    save.dataset.boundPause = '1';
    save.onclick = () => currentGame?.save(true);
  }

  const saveQuit = document.getElementById('saveQuitBtn');
  if (saveQuit && !saveQuit.dataset.boundPause) {
    saveQuit.dataset.boundPause = '1';
    saveQuit.onclick = () => currentGame?.saveAndQuit();
  }
}

export function setPauseActive(active) {
  const overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.classList.toggle('active', !!active);
}

// -----------------------------------------------------------------------------
// DEV TOOL UI
// -----------------------------------------------------------------------------

export function renderPauseDevTools(game) {
  if (!game) return;

  ensurePauseOverlay(game);

  const root = document.getElementById('pauseDevTools');
  if (!root) return;

  const allItems = Object.values(ITEMS)
    .filter(item => item && item.id)
    .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));

  const gear = allItems.filter(item => {
    return item.slot || item.type === 'weapon' || item.type === 'armour' || item.type === 'trinket';
  });

  const classGear = CLASS_STARTER_GEAR[game.player.classId] || null;

  root.innerHTML = `
    <div class="pause-dev-card">
      <h3>Dev Tools</h3>
      <p class="tag">Testing only. Use these to validate progression, gear, combat, and dungeon entry.</p>

      <div class="pause-dev-grid">
        <button data-pause-dev-raise-class="1">Class Skill +10</button>
        <button data-pause-dev-raise-all="1">All Skills +10</button>
        <button data-pause-dev-give-gear="1">Give All Gear (${gear.length})</button>
        <button data-pause-dev-give-all="1">Give Every Item</button>
        <button data-pause-dev-give-class-gear="1">Give Class Gear</button>
        <button data-pause-dev-refresh-abilities="1">Refresh Class Abilities</button>
        <button data-pause-dev-test-dungeon="1">Enter Test Dungeon</button>
        <button data-pause-dev-exit-dungeon="1">Exit Dungeon</button>
        <button data-pause-dev-restore="1">Full Restore</button>
        <button data-pause-dev-save="1">Save</button>
      </div>

      <p class="tag">
        Current class gear:
        ${classGear ? escapeHtml(Object.values(classGear).filter(Boolean).join(', ')) : 'No class selected'}
      </p>
    </div>

    <div class="pause-dev-card">
      <h3>Give Item</h3>
      <div class="pause-dev-item-grid">
        ${allItems.map(item => pauseDevItemButton(item)).join('')}
      </div>
    </div>
  `;

  root.querySelectorAll('[data-pause-dev-raise-class]').forEach(btn => {
    btn.onclick = () => devRaiseClass(game, 10);
  });

  root.querySelectorAll('[data-pause-dev-raise-all]').forEach(btn => {
    btn.onclick = () => devRaiseAllSkills(game, 10);
  });

  root.querySelectorAll('[data-pause-dev-give-gear]').forEach(btn => {
    btn.onclick = () => devGiveAllGear(game);
  });

  root.querySelectorAll('[data-pause-dev-give-all]').forEach(btn => {
    btn.onclick = () => devGiveEveryItem(game);
  });

  root.querySelectorAll('[data-pause-dev-give-class-gear]').forEach(btn => {
    btn.onclick = () => devGiveClassGear(game);
  });

  root.querySelectorAll('[data-pause-dev-refresh-abilities]').forEach(btn => {
    btn.onclick = () => devRefreshClassAbilities(game);
  });

  root.querySelectorAll('[data-pause-dev-test-dungeon]').forEach(btn => {
    btn.onclick = () => devEnterTestDungeon(game);
  });

  root.querySelectorAll('[data-pause-dev-exit-dungeon]').forEach(btn => {
    btn.onclick = () => {
      if (typeof game.exitDungeon === 'function') {
        game.exitDungeon({ locked: false, force: true });
      }
    };
  });

  root.querySelectorAll('[data-pause-dev-restore]').forEach(btn => {
    btn.onclick = () => devFullRestore(game);
  });

  root.querySelectorAll('[data-pause-dev-save]').forEach(btn => {
    btn.onclick = () => game.save(true);
  });

  root.querySelectorAll('[data-pause-dev-item]').forEach(btn => {
    btn.onclick = () => devGiveItem(game, btn.dataset.pauseDevItem);
  });
}

function pauseDevItemButton(item) {
  const rarity = RARITY?.[item.rarity];
  const color = rarity?.color || '#aeb8ca';
  const type = item.type || 'item';
  const slot = item.slot ? ` • ${item.slot}` : '';

  return `
    <button class="pause-dev-item-button" data-pause-dev-item="${escapeHtml(item.id)}">
      <b style="color:${color}">${escapeHtml(item.name || item.id)}</b>
      <span>${escapeHtml(type)}${escapeHtml(slot)}</span>
    </button>
  `;
}

// -----------------------------------------------------------------------------
// DEV ACTIONS
// -----------------------------------------------------------------------------

export function devRaiseClass(game, amount = 10) {
  const player = game.player;

  migratePlayer(player);

  if (!player.classSkill) {
    game.log('DEV: No class selected. Choose a class first.');
    refreshGameUI(game);
    return;
  }

  const skill = player.skillState?.skills?.[player.classSkill];

  if (!skill) {
    game.log(`DEV: Missing class skill ${player.classSkill}.`);
    refreshGameUI(game);
    return;
  }

  skill.used = true;
  skill.level += amount;
  skill.xp = 0;

  migratePlayer(player);
  refreshClassAbilityUnlocks(game);

  game.log(`DEV: Raised ${skillLabel(player.classSkill)} by ${amount}.`);

  if (typeof game.shake === 'function') {
    game.shake(6, 0.16);
  }

  addQuestText(player, `${player.className || 'Class'} +${amount}`, {
    color: '#d9ad4f',
    ttl: 1.2
  });

  if (typeof game.captureProgressionWatch === 'function') {
    game.captureProgressionWatch();
  }

  refreshGameUI(game);
}

export function devRaiseAllSkills(game, amount = 10) {
  const player = game.player;

  migratePlayer(player);

  const skills = player.skillState?.skills || {};
  const entries = Object.entries(skills);

  for (const [, skill] of entries) {
    skill.used = true;
    skill.level += amount;
    skill.xp = 0;
  }

  migratePlayer(player);
  refreshClassAbilityUnlocks(game);

  game.log(`DEV: Raised ${entries.length} skills by ${amount}.`);

  if (typeof game.shake === 'function') {
    game.shake(7, 0.16);
  }

  addQuestText(player, `All Skills +${amount}`, {
    color: '#d9ad4f',
    ttl: 1.2
  });

  if (typeof game.captureProgressionWatch === 'function') {
    game.captureProgressionWatch();
  }

  refreshGameUI(game);
}

export function devRefreshClassAbilities(game) {
  refreshClassAbilityUnlocks(game);

  game.log('DEV: Class abilities refreshed.');

  addStatusText(game.player, 'Abilities Refreshed', {
    color: '#d9ad4f'
  });

  refreshGameUI(game);
}

export function devEnterTestDungeon(game) {
  const entered = devEnterTestDungeonSystem(game);

  if (entered) {
    refreshGameUI(game);
  }
}

export function devGiveAllGear(game) {
  const gear = Object.values(ITEMS).filter(item => {
    return item && item.id && (item.slot || item.type === 'weapon' || item.type === 'armour' || item.type === 'trinket');
  });

  for (const item of gear) {
    addItem(game.player, item.id, 1);
  }

  game.log(`DEV: Added ${gear.length} gear items.`);

  addFloatingText(game.player, 'All Gear Added', {
    preset: 'loot',
    color: '#73d18a'
  });

  refreshGameUI(game);
}

export function devGiveClassGear(game) {
  migratePlayer(game.player);

  if (!game.player.classId) {
    game.log('DEV: No class selected.');
    refreshGameUI(game);
    return;
  }

  const granted = grantClassStarterGear(game, game.player.classId);

  migratePlayer(game.player);

  if (granted.length) {
    game.log(`DEV: Class gear equipped: ${granted.join(', ')}.`);

    addLootText(game.player, 'Class Gear Equipped', {
      ttl: 1.1,
      color: getClassColor(game.player.classId)
    });
  } else {
    game.log('DEV: No class gear was added.');
  }

  refreshGameUI(game);
}

export function devGiveEveryItem(game) {
  const items = Object.values(ITEMS).filter(item => item && item.id);

  for (const item of items) {
    addItem(game.player, item.id, item.stack ? 25 : 1);
  }

  game.log('DEV: Added every item in data.js.');

  addFloatingText(game.player, 'Every Item Added', {
    preset: 'loot',
    color: '#73d18a'
  });

  refreshGameUI(game);
}

export function devGiveItem(game, itemId) {
  const item = ITEMS[itemId];

  if (!item) {
    game.log(`DEV: Missing item ${itemId}.`);
    refreshGameUI(game);
    return;
  }

  const qty = item.stack ? 10 : 1;

  addItem(game.player, itemId, qty);

  game.log(`DEV: Added ${qty}x ${item.name}.`);

  addFloatingText(game.player, `Added ${item.name}`, {
    preset: 'loot',
    color: getItemFloatingColor(itemId)
  });

  refreshGameUI(game);
}

export function devFullRestore(game) {
  const player = game.player;

  player.hp = player.maxHp;
  player.stamina = player.maxStamina;

  if (player.spiritAwakened) {
    player.spirit = player.maxSpirit;
  }

  game.log('DEV: Full restore applied.');

  addFloatingText(player, 'Full Restore', {
    preset: 'heal',
    color: '#73d18a'
  });

  refreshGameUI(game);
}

// -----------------------------------------------------------------------------
// CSS
// -----------------------------------------------------------------------------

export function injectPauseDevStyles() {
  if (document.getElementById('runalisPauseDevStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisPauseDevStyles';

  style.textContent = `
    body.dialogue-active #hud,
    body.dialogue-active #bottomNav,
    body.dialogue-active #topNav,
    body.dialogue-active #combatHud,
    body.dialogue-active #ui,
    body.dialogue-active .hud,
    body.dialogue-active .bottom-nav,
    body.dialogue-active .top-nav,
    body.dialogue-active .combat-hud,
    body.dialogue-active .tabs,
    body.dialogue-active .nav-tabs {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .pause-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 22px;
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(3px);
    }

    .pause-overlay.active {
      display: flex;
    }

    .pause-panel {
      width: min(920px, 94vw);
      max-height: 90vh;
      overflow: auto;
      border: 1px solid rgba(122,148,191,0.28);
      background: rgba(10,15,25,0.96);
      color: #e8edf5;
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.55);
    }

    .pause-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }

    .pause-header h2 {
      margin: 0;
      font-size: 24px;
    }

    .pause-button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .pause-button-row button {
      border: 1px solid rgba(122,148,191,0.24);
      background: rgba(15,22,36,0.92);
      color: #e8edf5;
      border-radius: 10px;
      padding: 9px 12px;
      cursor: pointer;
      font-weight: 900;
    }

    .pause-button-row button:hover {
      border-color: rgba(217,173,79,0.6);
      background: rgba(25,34,52,0.95);
    }

    .pause-dev-card {
      border: 1px solid rgba(122,148,191,0.22);
      background: rgba(8,13,22,0.7);
      border-radius: 14px;
      padding: 12px;
      margin-top: 10px;
    }

    .pause-dev-card h3 {
      margin: 0 0 6px;
    }

    .pause-dev-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .pause-dev-grid button,
    .pause-dev-item-button {
      border: 1px solid rgba(122,148,191,0.24);
      background: rgba(15,22,36,0.92);
      color: #e8edf5;
      border-radius: 10px;
      padding: 8px;
      cursor: pointer;
      font-weight: 800;
    }

    .pause-dev-grid button:hover,
    .pause-dev-item-button:hover {
      border-color: rgba(217,173,79,0.6);
      background: rgba(25,34,52,0.95);
    }

    .pause-dev-item-grid {
      max-height: 260px;
      overflow: auto;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
      padding-right: 4px;
    }

    .pause-dev-item-button {
      text-align: left;
      display: grid;
      gap: 2px;
      min-height: 48px;
    }

    .pause-dev-item-button span {
      color: #9facbf;
      font-size: 11px;
    }

    @media (max-width: 720px) {
      .pause-dev-grid,
      .pause-dev-item-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function refreshGameUI(game) {
  renderUI(game.player, game.logLines, game);
  renderPauseDevTools(game);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[c]));
}