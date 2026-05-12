// characterCreator.js
// Runalis character creator system.
//
// Responsibilities:
// - Store character appearance options.
// - Apply appearance to the player.
// - Create and render a simple character creator overlay.
// - Allow body type, skin, hair, shirt, pants, and boots customization.
// - Save choices directly onto player.appearance.
//
// main.js can call:
// - ensureCharacterCreatorStyles()
// - openCharacterCreator(game)
// - applyAppearanceToPlayer(player, appearance)
//
// humanRenderer.js should eventually read player.appearance.

import { renderUI } from './ui.js';

// -----------------------------------------------------------------------------
// OPTIONS
// -----------------------------------------------------------------------------

export const CHARACTER_CREATOR_OPTIONS = {
  bodyTypes: [
    {
      id: 'male',
      name: 'Male'
    },
    {
      id: 'female',
      name: 'Female'
    }
  ],

  skinColors: [
    {
      id: 'fair',
      name: 'Fair',
      value: '#ffd1bd'
    },
    {
      id: 'warm',
      name: 'Warm',
      value: '#d79b73'
    },
    {
      id: 'tan',
      name: 'Tan',
      value: '#b97854'
    },
    {
      id: 'brown',
      name: 'Brown',
      value: '#7a4a35'
    },
    {
      id: 'deep',
      name: 'Deep',
      value: '#3f261d'
    },
    {
      id: 'ashen',
      name: 'Ashen',
      value: '#b8b0a8'
    }
  ],

  hairColors: [
    {
      id: 'black',
      name: 'Black',
      value: '#0b0d12'
    },
    {
      id: 'brown',
      name: 'Brown',
      value: '#4a2b18'
    },
    {
      id: 'auburn',
      name: 'Auburn',
      value: '#7c3723'
    },
    {
      id: 'blonde',
      name: 'Blonde',
      value: '#d8c891'
    },
    {
      id: 'white',
      name: 'White',
      value: '#e8edf5'
    },
    {
      id: 'violet',
      name: 'Occult Violet',
      value: '#482f55'
    }
  ],

  shirtColors: [
    {
      id: 'wandererGold',
      name: 'Wanderer Gold',
      value: '#f2a51f'
    },
    {
      id: 'forestGreen',
      name: 'Forest Green',
      value: '#446b42'
    },
    {
      id: 'deepBlue',
      name: 'Deep Blue',
      value: '#293fba'
    },
    {
      id: 'wineRed',
      name: 'Wine Red',
      value: '#7a2e35'
    },
    {
      id: 'charcoal',
      name: 'Charcoal',
      value: '#2b2f38'
    },
    {
      id: 'necroticPurple',
      name: 'Necrotic Purple',
      value: '#482f55'
    }
  ],

  pantsColors: [
    {
      id: 'travelerBlue',
      name: 'Traveler Blue',
      value: '#263145'
    },
    {
      id: 'darkBrown',
      name: 'Dark Brown',
      value: '#3a2a22'
    },
    {
      id: 'black',
      name: 'Black',
      value: '#151515'
    },
    {
      id: 'olive',
      name: 'Olive',
      value: '#37402d'
    },
    {
      id: 'gray',
      name: 'Gray',
      value: '#464b55'
    }
  ],

  bootColors: [
    {
      id: 'brownLeather',
      name: 'Brown Leather',
      value: '#3a2a22'
    },
    {
      id: 'blackLeather',
      name: 'Black Leather',
      value: '#111111'
    },
    {
      id: 'grayWraps',
      name: 'Gray Wraps',
      value: '#4b4f58'
    }
  ]
};

export const DEFAULT_APPEARANCE = {
  bodyType: 'male',
  skinColor: 'fair',
  hairColor: 'black',
  shirtColor: 'wandererGold',
  pantsColor: 'travelerBlue',
  bootColor: 'brownLeather'
};

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function ensurePlayerAppearance(player) {
  if (!player) return DEFAULT_APPEARANCE;

  player.appearance = {
    ...DEFAULT_APPEARANCE,
    ...(player.appearance || {})
  };

  return player.appearance;
}

export function applyAppearanceToPlayer(player, appearance = {}) {
  if (!player) return;

  const safeAppearance = normalizeAppearance(appearance);

  player.appearance = safeAppearance;

  // These fields are also set directly so existing humanRenderer logic can use
  // them immediately without a full renderer rewrite.
  player.bodyType = safeAppearance.bodyType;
  player.skin = getOptionValue('skinColors', safeAppearance.skinColor);
  player.hair = getOptionValue('hairColors', safeAppearance.hairColor);
  player.shirt = getOptionValue('shirtColors', safeAppearance.shirtColor);
  player.pants = getOptionValue('pantsColors', safeAppearance.pantsColor);
  player.boots = getOptionValue('bootColors', safeAppearance.bootColor);
}

export function getAppearanceColors(appearance = {}) {
  const normalized = normalizeAppearance(appearance);

  return {
    bodyType: normalized.bodyType,
    skin: getOptionValue('skinColors', normalized.skinColor),
    hair: getOptionValue('hairColors', normalized.hairColor),
    shirt: getOptionValue('shirtColors', normalized.shirtColor),
    pants: getOptionValue('pantsColors', normalized.pantsColor),
    boots: getOptionValue('bootColors', normalized.bootColor)
  };
}

export function openCharacterCreator(game) {
  if (!game?.player) return;

  ensureCharacterCreatorStyles();
  ensurePlayerAppearance(game.player);

  let overlay = document.getElementById('characterCreatorOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'characterCreatorOverlay';
    overlay.className = 'character-creator-overlay';
    document.body.appendChild(overlay);
  }

  const workingAppearance = {
    ...DEFAULT_APPEARANCE,
    ...(game.player.appearance || {})
  };

  overlay.innerHTML = createCharacterCreatorHtml(workingAppearance);
  overlay.classList.add('active');

  bindCharacterCreatorEvents(game, overlay, workingAppearance);
}

export function closeCharacterCreator() {
  const overlay = document.getElementById('characterCreatorOverlay');

  if (overlay) {
    overlay.classList.remove('active');
  }
}

export function ensureCharacterCreatorStyles() {
  if (document.getElementById('runalisCharacterCreatorStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisCharacterCreatorStyles';

  style.textContent = `
    .character-creator-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.68);
      backdrop-filter: blur(4px);
    }

    .character-creator-overlay.active {
      display: flex;
    }

    .character-creator-panel {
      width: min(980px, 96vw);
      max-height: 92vh;
      overflow: auto;
      display: grid;
      grid-template-columns: minmax(240px, 320px) 1fr;
      gap: 18px;
      border: 1px solid rgba(182, 140, 255, 0.28);
      background: rgba(10, 15, 25, 0.97);
      color: #e8edf5;
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 24px 90px rgba(0, 0, 0, 0.6);
    }

    .character-preview-card,
    .character-options-card {
      border: 1px solid rgba(122, 148, 191, 0.22);
      background: rgba(8, 13, 22, 0.74);
      border-radius: 14px;
      padding: 14px;
    }

    .character-creator-panel h2,
    .character-creator-panel h3 {
      margin: 0 0 8px;
    }

    .character-creator-panel .tag {
      color: #9facbf;
      font-size: 12px;
      line-height: 1.4;
    }

    .character-preview-frame {
      height: 310px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background:
        radial-gradient(circle at center, rgba(182,140,255,0.14), transparent 48%),
        linear-gradient(180deg, rgba(20,28,42,0.8), rgba(8,12,20,0.8));
      border: 1px solid rgba(255,255,255,0.08);
      margin-top: 12px;
    }

    .creator-character {
      position: relative;
      width: 94px;
      height: 170px;
      transform: scale(1.35);
    }

    .creator-shadow {
      position: absolute;
      left: 18px;
      bottom: 0;
      width: 58px;
      height: 14px;
      border-radius: 50%;
      background: rgba(0,0,0,0.45);
    }

    .creator-head {
      position: absolute;
      left: 31px;
      top: 4px;
      width: 32px;
      height: 36px;
      border-radius: 12px 12px 10px 10px;
      background: var(--skin);
      border: 2px solid rgba(0,0,0,0.35);
      z-index: 4;
    }

    .creator-hair {
      position: absolute;
      left: 27px;
      top: 0;
      width: 40px;
      height: 19px;
      border-radius: 14px 14px 8px 8px;
      background: var(--hair);
      z-index: 5;
    }

    .creator-neck {
      position: absolute;
      left: 40px;
      top: 37px;
      width: 14px;
      height: 11px;
      background: var(--skin);
      z-index: 2;
    }

    .creator-body {
      position: absolute;
      left: var(--body-left);
      top: 47px;
      width: var(--body-width);
      height: 50px;
      border-radius: 12px 12px 8px 8px;
      background: var(--shirt);
      border: 2px solid rgba(0,0,0,0.35);
      z-index: 3;
    }

    .creator-arm {
      position: absolute;
      top: 53px;
      width: 12px;
      height: 47px;
      border-radius: 8px;
      background: var(--skin);
      border: 2px solid rgba(0,0,0,0.32);
      z-index: 2;
    }

    .creator-arm.left {
      left: var(--left-arm);
      transform: rotate(8deg);
    }

    .creator-arm.right {
      right: var(--right-arm);
      transform: rotate(-8deg);
    }

    .creator-leg {
      position: absolute;
      top: 96px;
      width: 16px;
      height: 51px;
      border-radius: 7px;
      background: var(--pants);
      border: 2px solid rgba(0,0,0,0.35);
      z-index: 2;
    }

    .creator-leg.left {
      left: 28px;
    }

    .creator-leg.right {
      right: 28px;
    }

    .creator-boot {
      position: absolute;
      top: 142px;
      width: 20px;
      height: 14px;
      border-radius: 5px;
      background: var(--boots);
      border: 2px solid rgba(0,0,0,0.35);
      z-index: 3;
    }

    .creator-boot.left {
      left: 25px;
    }

    .creator-boot.right {
      right: 25px;
    }

    .creator-eye {
      position: absolute;
      top: 19px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #111;
      z-index: 6;
    }

    .creator-eye.left {
      left: 39px;
    }

    .creator-eye.right {
      left: 51px;
    }

    .creator-option-group {
      margin-bottom: 15px;
    }

    .creator-option-group h3 {
      font-size: 14px;
      color: #ffcc66;
      margin-bottom: 8px;
    }

    .creator-button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .creator-option-button {
      border: 1px solid rgba(122,148,191,0.24);
      background: rgba(15,22,36,0.92);
      color: #e8edf5;
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .creator-option-button:hover {
      border-color: rgba(217,173,79,0.6);
      background: rgba(25,34,52,0.95);
    }

    .creator-option-button.active {
      border-color: rgba(255,204,102,0.9);
      background: rgba(80,62,28,0.72);
    }

    .creator-color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.36);
      background: var(--dot);
      box-shadow: 0 0 0 2px rgba(0,0,0,0.25);
    }

    .creator-actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(122,148,191,0.18);
    }

    .creator-actions button {
      border: 1px solid rgba(122,148,191,0.24);
      background: rgba(15,22,36,0.92);
      color: #e8edf5;
      border-radius: 10px;
      padding: 10px 13px;
      cursor: pointer;
      font-weight: 900;
    }

    .creator-actions button.primary {
      border-color: rgba(255,204,102,0.65);
      background: rgba(80,62,28,0.86);
    }

    .creator-actions button:hover {
      border-color: rgba(217,173,79,0.75);
      background: rgba(25,34,52,0.95);
    }

    @media (max-width: 820px) {
      .character-creator-panel {
        grid-template-columns: 1fr;
      }

      .character-preview-frame {
        height: 250px;
      }
    }
  `;

  document.head.appendChild(style);
}