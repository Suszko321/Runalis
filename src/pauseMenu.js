// pauseMenu.js
// Runalis pause overlay.

import { returnFromPvpArena } from './pvpArenaSystem.js';

export function ensurePauseOverlay(currentGame = null) {
  let overlay = document.getElementById('pauseOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pauseOverlay';
    document.body.appendChild(overlay);
  }

  overlay.classList.add('pause-overlay');

  if (!overlay.querySelector('.pause-panel')) {
    overlay.innerHTML = `
      <div class="pause-panel">
        <div class="pause-header">
          <h2>Paused</h2>
          <p class="tag">Runalis / Pause Menu</p>
        </div>

        <div class="pause-button-row">
          <button id="resumeBtn" type="button">Resume</button>
          <button id="pauseSaveBtn" type="button">Save</button>
          <button id="pauseMultiplayerBtn" type="button">Multiplayer</button>
          <button id="arenaReturnBtn" type="button" hidden>Forfeit to Orrakai</button>
          <button id="leaveSessionBtn" type="button" hidden>Leave Session</button>
          <button id="saveQuitBtn" type="button">Save & Quit</button>
        </div>
      </div>
    `;
  }

  bindPauseButtons(currentGame);
}

export function bindPauseButtons(currentGame = null) {
  const overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.__runalisGame = currentGame;
  const multiplayer=overlay?.querySelector('#pauseMultiplayerBtn');
  if(multiplayer)multiplayer.onclick=()=>overlay.__runalisGame?.onlineSession?.openMenu();

  const resume = document.getElementById('resumeBtn');
  if (resume && !resume.dataset.boundPause) {
    resume.dataset.boundPause = '1';
    resume.onclick = () => document.getElementById('pauseOverlay')?.__runalisGame?.togglePause(false);
  }

  const save = document.getElementById('pauseSaveBtn');
  if (save) {
    const inArena = currentGame?.world?.mode === 'pvpArena';
    save.disabled = inArena;
    save.title = inArena ? 'Leave the PvP Arena before saving.' : '';

    if (!save.dataset.boundPause) {
      save.dataset.boundPause = '1';
      save.onclick = () => document.getElementById('pauseOverlay')?.__runalisGame?.save(true);
    }
  }

  const arenaReturn = document.getElementById('arenaReturnBtn');
  if (arenaReturn) {
    const inArena = currentGame?.world?.mode === 'pvpArena';
    arenaReturn.hidden = !inArena;
    arenaReturn.disabled = !inArena;

    if (!arenaReturn.dataset.boundPause) {
      arenaReturn.dataset.boundPause = '1';
      arenaReturn.onclick = () => {
        const game = document.getElementById('pauseOverlay')?.__runalisGame;
        if (!game) return;
        game.togglePause?.(false);
        returnFromPvpArena(game);
      };
    }
  }

  const saveQuit = document.getElementById('saveQuitBtn');
  if (saveQuit && !saveQuit.dataset.boundPause) {
    saveQuit.dataset.boundPause = '1';
    saveQuit.onclick = () => document.getElementById('pauseOverlay')?.__runalisGame?.saveAndQuit();
  }

  const leaveSession = document.getElementById('leaveSessionBtn');
  if (leaveSession) {
    const pauseOwner = currentGame?.pauseOwner || currentGame?.player || null;
    const isCoopOwner = !!pauseOwner && pauseOwner !== currentGame?.player;
    leaveSession.hidden = !isCoopOwner;
    leaveSession.disabled = !isCoopOwner;
    leaveSession.textContent = isCoopOwner
      ? `Leave Session (${pauseOwner.name || `Player ${pauseOwner.slot || 2}`})`
      : 'Leave Session';

    if (!leaveSession.dataset.boundPause) {
      leaveSession.dataset.boundPause = '1';
      leaveSession.onclick = () => document.getElementById('pauseOverlay')?.__runalisGame?.leavePauseOwnerSession?.();
    }
  }
}

export function setPauseActive(active) {
  const overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.classList.toggle('active', !!active);
}

export function renderPauseMenu(game) {
  ensurePauseOverlay(game);
  bindPauseButtons(game);
}

export function injectPauseStyles() {
  if (document.getElementById('runalisPauseStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisPauseStyles';

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
      width: min(720px, 94vw);
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
      margin-bottom: 0;
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

    .pause-overlay .game-ui-controller-focus {
      outline: 3px solid rgba(255,204,102,0.95);
      outline-offset: 3px;
      box-shadow:
        0 0 0 4px rgba(217,173,79,0.18),
        0 0 26px rgba(217,173,79,0.34);
      border-color: rgba(255,204,102,0.72);
    }
  `;

  document.head.appendChild(style);
}
