import {installSubclassStyles} from './abilityMorphUi.js';
// uiStyles.js
// Runalis centralized UI styling.
// IMPORTANT:
// This file must NOT hide .panel, because .panel contains the main game menu tabs.
// Inventory / Skills / Character / Quests / Log live inside .panel .tabs.
//
// Updated:
// - Main Character / Skills / Inventory / Quests / Log tabs moved to bottom-right.
// - Open panels now anchor above the bottom-right tab bar.
// - Top-right is now reserved for the minimap.
// - Left HUD and bottom-left combat HUD remain untouched.

import {installMenuSheets} from './menuSheets.js';
export function injectRunalisUiStyles() {
  installSubclassStyles();
  installMenuSheets();
  if (document.getElementById('runalisUiStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisUiStyles';

  style.textContent = `
    :root {
      --panel-bg: rgba(8, 10, 14, 0.76);
      --panel-bg-strong: rgba(8, 10, 14, 0.90);
      --card-bg: rgba(15, 17, 22, 0.82);
      --card-bg-soft: rgba(20, 23, 29, 0.70);
      --line: rgba(235, 238, 240, 0.14);
      --line-strong: rgba(235, 238, 240, 0.26);
      --text: #edf0f2;
      --muted: #a9b0b8;
      --gold: #d5ad55;
      --green: #6f9f61;
      --blue: #6fa8ef;
      --red: #d86a4a;
      --purple: #a86bd6;
      --class-classless: #9facbf;
      --class-oathkeeper: #d5ad55;
      --class-templar: #d5ad55;
      --class-fellhunter: #c65f38;
      --class-mercenary: #c65f38;
      --class-gravecaller: #a86bd6;
      --class-necromancer: #a86bd6;
      --class-thornbinder: #7e9d58;
      --class-waverider: #59d7e8;
      --class-hydromancer: #59d7e8;
      --class-lightbringer: #fff1b8;
      --class-eldritch: #d73545;
    }

    /* -------------------------------------------------------------------------
       MAIN PANEL / BOTTOM-RIGHT TABS
       ------------------------------------------------------------------------- */

    .panel {
      position: fixed !important;
      right: 16px !important;
      bottom: 16px !important;
      top: auto !important;
      left: auto !important;

      width: auto !important;
      max-width: calc(100vw - 32px) !important;
      max-height: calc(100vh - 32px) !important;

      display: grid !important;
      grid-template-rows: auto !important;
      gap: 8px !important;

      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;

      color: var(--text) !important;
      z-index: 65 !important;
      pointer-events: none !important;
      overflow: visible !important;
    }

    .panel .tabs {
      position: fixed !important;
      right: 22px !important;
      bottom: 18px !important;
      top: auto !important;
      left: auto !important;
      z-index: 90 !important;
      pointer-events: auto !important;
      justify-self: end !important;
      align-self: end !important;

      display: grid !important;
      grid-template-columns: repeat(6, minmax(68px, 1fr)) !important;
      gap: 6px !important;

      padding: 6px !important;
      background: rgba(8, 11, 18, 0.72) !important;
      border: 1px solid rgba(139, 166, 214, 0.22) !important;
      border-radius: 16px !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35) !important;
    }

    .tab {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;

      min-width: 68px !important;
      min-height: 36px !important;

      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      background: rgba(7, 12, 21, 0.72) !important;
      color: var(--muted) !important;

      padding: 8px 7px !important;
      border-radius: 12px !important;

      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 0.02em !important;
      white-space: nowrap !important;

      cursor: pointer !important;
      pointer-events: auto !important;
      box-shadow: 0 8px 20px rgba(0,0,0,0.18) !important;
    }

    .tab:hover {
      color: var(--text) !important;
      border-color: rgba(217, 173, 79, 0.36) !important;
      background: rgba(17, 25, 40, 0.9) !important;
    }

    .tab.active {
      color: #111827 !important;
      border-color: rgba(217, 173, 79, 0.72) !important;
      background: linear-gradient(180deg, #e9c56e, #b8872d) !important;
      box-shadow: 0 10px 26px rgba(217, 173, 79, 0.18) !important;
    }

    .panel:not(.open) .tab.active {
      color: var(--text) !important;
      border-color: rgba(139, 166, 214, 0.18) !important;
      background: rgba(7, 12, 21, 0.72) !important;
    }

    .tab-panel {
      display: none !important;
    }

    .panel[data-panel-closed="true"] .tab-panel,
    .panel:not(.open) .tab-panel,
    .panel.open .tab-panel:not(.active),
    .tab-panel[hidden],
    .tab-panel[aria-hidden="true"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .panel.open {
      pointer-events: auto !important;
    }

    .panel.open .tab-panel.active {
      display: block !important;

      background: rgba(18, 23, 34, 0.97) !important;
      border: 1px solid rgba(139, 166, 214, 0.22) !important;
      border-radius: 22px !important;
      padding: 14px !important;
      min-height: 0 !important;
      max-height: calc(100vh - 112px) !important;
      overflow: auto !important;
      box-shadow: 0 24px 90px rgba(0, 0, 0, 0.65) !important;
    }

    /* -------------------------------------------------------------------------
       PANEL POSITIONS - OPEN ABOVE BOTTOM-RIGHT TABS
       ------------------------------------------------------------------------- */

    .panel.open #inventory.active {
      position: fixed !important;
      right: 16px !important;
      bottom: 78px !important;
      top: 90px !important;
      width: min(980px, calc(100vw - 32px)) !important;
      max-height: none !important;
      overflow: auto !important;
    }

    .panel.open #skills.active {
      position: fixed !important;
      right: 16px !important;
      bottom: 78px !important;
      top: 90px !important;
      width: min(980px, calc(100vw - 32px)) !important;
      max-height: none !important;
      overflow: auto !important;
    }

    .panel.open #character.active {
      position: fixed !important;
      right: 16px !important;
      bottom: 78px !important;
      top: 90px !important;
      width: min(620px, calc(100vw - 32px)) !important;
      max-height: none !important;
      overflow: auto !important;
    }

    .panel.open #quests.active,
    .panel.open #log.active {
      position: fixed !important;
      right: 16px !important;
      bottom: 78px !important;
      top: 90px !important;
      width: min(520px, calc(100vw - 32px)) !important;
      max-height: none !important;
      overflow: auto !important;
    }

    /* -------------------------------------------------------------------------
       CARDS / BASIC UI
       ------------------------------------------------------------------------- */

    .card {
      background: linear-gradient(180deg, rgba(12, 19, 33, 0.84), rgba(8, 14, 24, 0.78)) !important;
      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      border-radius: 18px !important;
      padding: 14px !important;
      margin-bottom: 12px !important;
      box-shadow: 0 14px 30px rgba(0,0,0,0.22) !important;
      overflow: visible !important;
    }

    .card h2,
    .card h3 {
      margin: 0 0 10px !important;
      color: var(--text) !important;
      letter-spacing: 0.01em !important;
    }

    .card h2 {
      color: var(--gold) !important;
      font-size: 20px !important;
    }

    .card h3 {
      font-size: 16px !important;
    }

    .tag {
      color: var(--muted) !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      margin: 6px 0 !important;
    }

    .gold {
      color: var(--gold) !important;
    }

    .stat-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 12px !important;
      padding: 6px 0 !important;
      color: var(--muted) !important;
      font-size: 13px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    }

    .stat-row:last-child {
      border-bottom: 0 !important;
    }

    .stat-row b,
    .stat-row span:last-child {
      color: var(--text) !important;
      font-weight: 800 !important;
      text-align: right !important;
    }

    .bar {
      height: 8px !important;
      background: rgba(0,0,0,0.36) !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
      border-radius: 999px !important;
      overflow: hidden !important;
      margin: 4px 0 8px !important;
    }

    .bar .fill,
    .fill {
      height: 100% !important;
      background: linear-gradient(90deg, #d9ad4f, #ffdd87) !important;
      border-radius: 999px !important;
    }

    .bar .fill.bad,
    .fill.bad,
    .bad {
      background: linear-gradient(90deg, #ef6f6c, #ff9d94) !important;
    }

    .bar .fill.good,
    .fill.good,
    .good {
      background: linear-gradient(90deg, #73d18a, #a4f0b2) !important;
    }

    .bar .fill.blue,
    .fill.blue,
    .blue {
      background: linear-gradient(90deg, #6fa8ef, #a9cfff) !important;
    }

    .bar .fill.gold,
    .fill.gold {
      background: linear-gradient(90deg, #d9ad4f, #ffe08f) !important;
    }

    .bar.dormant .fill {
      background: rgba(255,255,255,0.08) !important;
    }

    /* -------------------------------------------------------------------------
       SUBTABS
       ------------------------------------------------------------------------- */

    .subtab-bar {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      margin-bottom: 14px !important;
      padding: 8px !important;
      border-radius: 18px !important;
      background: rgba(5, 9, 16, 0.44) !important;
      border: 1px solid rgba(139, 166, 214, 0.12) !important;
    }

    #character .subtab-bar,
    #character.active .subtab-bar {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .subtab {
      border: 1px solid rgba(139, 166, 214, 0.16) !important;
      background: rgba(12, 19, 33, 0.72) !important;
      color: var(--muted) !important;
      border-radius: 12px !important;
      padding: 8px 11px !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      cursor: pointer !important;
    }

    .subtab:hover {
      color: var(--text) !important;
      border-color: rgba(217, 173, 79, 0.28) !important;
    }

    .subtab.active {
      color: #111827 !important;
      background: linear-gradient(180deg, #e9c56e, #b8872d) !important;
      border-color: rgba(217, 173, 79, 0.72) !important;
    }

    /* -------------------------------------------------------------------------
       INVENTORY / EQUIPMENT / CRAFTING
       ------------------------------------------------------------------------- */

    .inventory-grid,
    .recipe-grid,
    .equipment-grid,
    .skill-list {
      display: grid !important;
      gap: 8px !important;
      min-height: 0 !important;
      overflow: visible !important;
    }

    .inventory-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    .recipe-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }

    .equipment-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }

    .slot,
    .slot-card,
    .recipe-card,
    .equipment-slot,
    .inventory-card,
    .ability-card,
    .skill-card,
    .quest-card,
    .skill {
      min-width: 0 !important;
      background: rgba(7, 12, 21, 0.56) !important;
      border: 1px solid rgba(139, 166, 214, 0.14) !important;
      border-radius: 14px !important;
      padding: 10px !important;
      font-size: 12px !important;
    }

    .equipment-slot.empty {
      opacity: 0.72 !important;
    }

    .equipment-slot-header {
      color: var(--gold) !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      margin-bottom: 4px !important;
    }

    .empty-state {
      grid-column: 1 / -1 !important;
      color: var(--muted) !important;
      border: 1px dashed rgba(139, 166, 214, 0.22) !important;
      border-radius: 12px !important;
      padding: 12px !important;
      text-align: center !important;
      font-size: 12px !important;
    }

    .small-btn,
    .equipment-slot button,
    .inventory-card button,
    .recipe-card button,
    .slot-card button {
      border: 1px solid rgba(217, 173, 79, 0.32) !important;
      background: rgba(217, 173, 79, 0.12) !important;
      color: var(--text) !important;
      border-radius: 10px !important;
      padding: 7px 10px !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      cursor: pointer !important;
    }

    .small-btn:hover,
    .equipment-slot button:hover,
    .inventory-card button:hover,
    .recipe-card button:hover,
    .slot-card button:hover {
      background: rgba(217, 173, 79, 0.22) !important;
      border-color: rgba(217, 173, 79, 0.58) !important;
    }

    .button-row {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      margin-top: 10px !important;
    }

    /* -------------------------------------------------------------------------
       CHARACTER SHEET
       ------------------------------------------------------------------------- */

    .character-sheet-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 14px !important;
    }

    .character-paper {
      margin-bottom: 0 !important;
    }

    .sheet-title-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      gap: 12px !important;
      margin-bottom: 12px !important;
    }

    .sheet-badge {
      color: #111827 !important;
      background: linear-gradient(180deg, #e9c56e, #b8872d) !important;
      border-radius: 999px !important;
      padding: 7px 10px !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      white-space: nowrap !important;
    }

    .sheet-section-title {
      color: var(--gold) !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      margin: 14px 0 8px !important;
    }

    .sheet-stat-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .sheet-stat {
      background: rgba(0,0,0,0.20) !important;
      border: 1px solid rgba(139, 166, 214, 0.12) !important;
      border-radius: 12px !important;
      padding: 9px !important;
      display: grid !important;
      gap: 4px !important;
    }

    .sheet-stat span {
      color: var(--muted) !important;
      font-size: 11px !important;
      font-weight: 700 !important;
    }

    .sheet-stat b {
      color: var(--text) !important;
      font-size: 13px !important;
    }

    .paper-row {
      display: flex !important;
      justify-content: space-between !important;
      gap: 10px !important;
      padding: 8px 0 !important;
      border-bottom: 1px solid rgba(139, 166, 214, 0.10) !important;
      color: var(--muted) !important;
      font-size: 13px !important;
    }

    .paper-row:last-child {
      border-bottom: none !important;
    }

    .paper-row b {
      color: var(--text) !important;
      text-align: right !important;
    }

    .paper-skill-row {
      border: 1px solid rgba(139, 166, 214, 0.12) !important;
      border-radius: 14px !important;
      padding: 10px !important;
      margin-bottom: 8px !important;
      background: rgba(0,0,0,0.16) !important;
    }

    .paper-skill-row.boosted {
      border-color: rgba(217, 173, 79, 0.34) !important;
    }

    /* -------------------------------------------------------------------------
       SKILLS / ABILITIES
       ------------------------------------------------------------------------- */

    .skill-sheet-list,
    .ability-sheet-grid {
      display: grid !important;
      gap: 10px !important;
    }

    .ability-sheet-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .skill-row-header {
      display: flex !important;
      justify-content: space-between !important;
      gap: 12px !important;
      align-items: flex-start !important;
      margin-bottom: 8px !important;
    }

    .skill-row-header h3 {
      margin: 0 0 3px !important;
    }

    .skill-row-level {
      text-align: right !important;
      display: grid !important;
      gap: 4px !important;
    }

    .skill-row-details {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      margin-top: 8px !important;
    }

    .ability-card.locked {
      opacity: 0.70 !important;
      filter: grayscale(0.2) !important;
    }

    .ability-card.unlocked {
      border-color: rgba(217, 173, 79, 0.30) !important;
    }

    .ability-equip-row {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      margin-top: 10px !important;
    }

    /* -------------------------------------------------------------------------
       LOG
       ------------------------------------------------------------------------- */

    .log-lines {
      max-height: 420px !important;
      overflow: auto !important;
      display: grid !important;
      gap: 6px !important;
    }

    .log-lines p {
      margin: 0 !important;
      color: var(--muted) !important;
      font-size: 12px !important;
      line-height: 1.35 !important;
      padding: 7px 8px !important;
      border-radius: 10px !important;
      background: rgba(0,0,0,0.18) !important;
    }

    /* -------------------------------------------------------------------------
       UNIT FRAMES
       ------------------------------------------------------------------------- */

    #unitFramesHud {
      position: fixed !important;
      left: 16px !important;
      top: 16px !important;
      width: 320px !important;
      display: grid !important;
      gap: 8px !important;
      z-index: 50 !important;
      pointer-events: none !important;
      color: var(--text) !important;
    }

    .unit-frame {
      display: grid !important;
      grid-template-columns: 52px 1fr !important;
      gap: 10px !important;
      padding: 10px !important;
      border-radius: 18px !important;
      background: linear-gradient(180deg, rgba(8, 14, 24, 0.86), rgba(6, 10, 18, 0.76)) !important;
      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      box-shadow: 0 12px 30px rgba(0,0,0,0.34) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    .summon-unit-frame {
      grid-template-columns: 40px 1fr !important;
      margin-left: 24px !important;
      opacity: 0.94 !important;
    }

    .unit-portrait {
      width: 52px !important;
      height: 52px !important;
      border-radius: 16px !important;
      display: grid !important;
      place-items: center !important;
      font-size: 24px !important;
      font-weight: 900 !important;
      background: radial-gradient(circle at 35% 25%, rgba(255,255,255,0.14), rgba(217,173,79,0.08)), rgba(0,0,0,0.25) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
    }

    .summon-unit-frame .unit-portrait {
      width: 40px !important;
      height: 40px !important;
      border-radius: 13px !important;
      font-size: 19px !important;
    }

    .unit-portrait.gravecaller,
    .unit-portrait.necromancer,
    .unit-portrait.classless {
      color: #9facbf !important;
    }

    .unit-portrait.lich {
      color: var(--purple) !important;
    }

    .unit-portrait.thornbinder,
    .unit-portrait.thornbeast {
      color: var(--green) !important;
    }

    .unit-portrait.oathkeeper,
    .unit-portrait.templar {
      color: var(--gold) !important;
    }

    .unit-portrait.waverider,
    .unit-portrait.hydromancer {
      color: #59d7e8 !important;
    }

    .unit-portrait.lightbringer {
      color: #fff1b8 !important;
    }

    .unit-portrait.eldritch,
    .unit-portrait.eldritchHorror {
      color: #ef4056 !important;
    }

    .unit-frame-body {
      min-width: 0 !important;
      display: grid !important;
      gap: 4px !important;
    }

    .unit-bloodline-row {
      color: #f0d596 !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .unit-title-row {
      display: flex !important;
      justify-content: space-between !important;
      gap: 8px !important;
      align-items: baseline !important;
      font-size: 12px !important;
    }

    .unit-title-row b {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .unit-title-row span {
      color: var(--muted) !important;
      font-size: 11px !important;
      white-space: nowrap !important;
    }

    .unit-bar-row {
      display: grid !important;
      grid-template-columns: 30px 1fr 62px !important;
      gap: 6px !important;
      align-items: center !important;
      font-size: 10px !important;
      color: var(--muted) !important;
    }

    .unit-bar-row b {
      color: var(--text) !important;
      text-align: right !important;
      font-size: 10px !important;
    }

    .unit-bar {
      height: 7px !important;
      background: rgba(0,0,0,0.42) !important;
      border-radius: 999px !important;
      overflow: hidden !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
    }

    .unit-bar > div {
      height: 100% !important;
      border-radius: 999px !important;
    }

    .unit-bar.hp > div,
    .unit-bar.summon-hp > div {
      background: linear-gradient(90deg, #ef6f6c, #ff9d94) !important;
    }

    .unit-bar.stamina > div {
      background: linear-gradient(90deg, #73d18a, #a4f0b2) !important;
    }

    .unit-bar.spirit > div {
      background: linear-gradient(90deg, #b68cff, #d8bdff) !important;
    }

    .lumen-row {
      display: grid !important;
      grid-template-columns: 30px 1fr 62px !important;
      gap: 6px !important;
      align-items: center !important;
      margin-top: 1px !important;
      font-size: 10px !important;
      color: var(--muted) !important;
    }

    .lumen-row b {
      color: #fff1b8 !important;
      text-align: right !important;
      font-size: 10px !important;
      white-space: nowrap !important;
    }

    .lumen-row.overbright b {
      color: #ffffff !important;
      text-shadow: 0 0 8px rgba(255, 241, 184, 0.72) !important;
    }

    .lumen-shards {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 4px !important;
      align-items: center !important;
    }

    .lumen-shards i {
      height: 7px !important;
      display: block !important;
      border: 1px solid rgba(255, 241, 184, 0.28) !important;
      background: rgba(255, 241, 184, 0.10) !important;
      box-shadow: inset 0 1px rgba(255,255,255,0.12) !important;
      transform: skewX(-14deg) !important;
    }

    .lumen-shards i.filled {
      border-color: rgba(255, 241, 184, 0.84) !important;
      background: linear-gradient(90deg, #d9ad4f, #fff1b8) !important;
      box-shadow:
        inset 0 1px rgba(255,255,255,0.42),
        0 0 10px rgba(255, 241, 184, 0.34) !important;
    }

    .lumen-shards i.charging {
      border-color: rgba(217, 173, 79, 0.58) !important;
      background: rgba(217, 173, 79, 0.26) !important;
    }

    .empty-party-frame {
      margin-left: 24px !important;
      padding: 8px 12px !important;
      border-radius: 14px !important;
      color: var(--muted) !important;
      background: rgba(8, 14, 24, 0.52) !important;
      border: 1px solid rgba(139, 166, 214, 0.12) !important;
      font-size: 11px !important;
    }

    /* -------------------------------------------------------------------------
       COMBAT HUD
       ------------------------------------------------------------------------- */

    #combatSkillHud {
      position: fixed !important;
      left: 16px !important;
      bottom: 16px !important;
      width: 390px !important;
      z-index: 50 !important;
      color: var(--text) !important;
      pointer-events: none !important;
      border-radius: 20px !important;
      background: linear-gradient(180deg, rgba(8, 14, 24, 0.84), rgba(5, 9, 16, 0.74)) !important;
      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      box-shadow: 0 16px 40px rgba(0,0,0,0.36) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      padding: 10px !important;
    }

    .combat-hud-title {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 8px !important;
      font-size: 12px !important;
      color: var(--muted) !important;
    }

    .combat-hud-title b {
      color: var(--gold) !important;
    }

    .combat-hud-slots {
      display: grid !important;
      grid-template-columns: 1.05fr 1fr 1fr 1fr !important;
      gap: 8px !important;
    }

    .combat-hud-slot {
      position: relative !important;
      overflow: hidden !important;
      min-height: 62px !important;
      border-radius: 15px !important;
      background: rgba(7, 12, 21, 0.74) !important;
      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      padding: 8px !important;
      display: grid !important;
      grid-template-columns: 44px 1fr !important;
      gap: 8px !important;
      align-items: center !important;
    }

    .combat-hud-slot.ready {
      border-color: rgba(217, 173, 79, 0.34) !important;
    }

    .combat-hud-slot.locked {
      opacity: 0.68 !important;
    }

    .combat-hud-key {
      width: 40px !important;
      height: 40px !important;
      border-radius: 13px !important;
      display: grid !important;
      place-items: center !important;
      color: #111827 !important;
      background: linear-gradient(180deg, #e9c56e, #b8872d) !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      box-shadow: inset 0 1px rgba(255,255,255,0.22) !important;
    }

    .combat-hud-body {
      min-width: 0 !important;
      display: grid !important;
      gap: 3px !important;
    }

    .combat-hud-body b {
      font-size: 12px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .combat-hud-body span {
      color: var(--muted) !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
    }

    .combat-hud-cooldown {
      position: absolute !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0,0,0,0.56) !important;
      z-index: 2 !important;
      pointer-events: none !important;
    }

    .combat-hud-cd-text {
      position: absolute !important;
      inset: 0 !important;
      display: grid !important;
      place-items: center !important;
      color: #fff !important;
      font-weight: 900 !important;
      font-size: 16px !important;
      text-shadow: 0 2px 8px #000 !important;
      z-index: 3 !important;
    }

    /* -------------------------------------------------------------------------
       SKILL TREE POLISH
       ------------------------------------------------------------------------- */

    .skill-tree-summary-head {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 14px !important;
      margin-bottom: 10px !important;
    }

    .skill-point-orb {
      width: 82px !important;
      height: 82px !important;
      display: grid !important;
      place-items: center !important;
      align-content: center !important;
      border-radius: 50% !important;
      border: 1px solid rgba(217, 173, 79, 0.62) !important;
      background: radial-gradient(circle at 35% 28%, rgba(255, 237, 180, 0.34), rgba(217, 173, 79, 0.12) 48%, rgba(7, 12, 21, 0.84) 70%) !important;
      box-shadow: 0 0 28px rgba(217, 173, 79, 0.18) !important;
      flex: 0 0 auto !important;
    }

    .skill-point-orb b {
      color: var(--gold) !important;
      font-size: 26px !important;
      line-height: 1 !important;
    }

    .skill-point-orb span {
      color: var(--muted) !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
    }

    .skill-tree-grid {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(190px, 1fr)) !important;
      gap: 12px !important;
    }

    .skill-tree-card {
      position: relative !important;
      overflow: hidden !important;
    }

    .skill-tree-card::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 auto 0 0 !important;
      width: 3px !important;
      background: var(--gold) !important;
      opacity: 0.72 !important;
    }

    .tree-blade::before { background: #ffcc66 !important; }
    .tree-archery::before { background: #73d18a !important; }
    .tree-spirit::before { background: #b68cff !important; }
    .tree-warding::before { background: #6fa8ef !important; }
    .tree-hydromancy::before { background: #59d7e8 !important; }
    .tree-lightbringer::before { background: #fff1b8 !important; }
    .tree-eldritch::before { background: #ef4056 !important; }
    .tree-cambion::before { background: #ef6f6c !important; }
    .tree-nephilim::before { background: #ffecb0 !important; }
    .tree-vampire::before { background: #c44762 !important; }

    .skill-tree-section-title {
      margin: 12px 0 8px !important;
      color: #f0d596 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      font-size: 12px !important;
    }

    .bloodline-tree-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }

    .skill-tree-node-list {
      display: grid !important;
      gap: 10px !important;
    }

    .skill-tree-node {
      display: grid !important;
      grid-template-columns: 28px minmax(0, 1fr) !important;
      gap: 10px !important;
      width: 100% !important;
      padding: 10px !important;
      border-radius: 12px !important;
      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      background: rgba(7, 12, 21, 0.54) !important;
      color: var(--text) !important;
      text-align: left !important;
      cursor: pointer !important;
    }

    .skill-tree-node:disabled {
      cursor: default !important;
    }

    .skill-tree-node.available {
      border-color: rgba(217, 173, 79, 0.55) !important;
      box-shadow: inset 0 0 0 1px rgba(217, 173, 79, 0.12), 0 0 22px rgba(217, 173, 79, 0.08) !important;
    }

    .skill-tree-node.learned {
      border-color: rgba(115, 209, 138, 0.48) !important;
      background: rgba(19, 42, 31, 0.62) !important;
    }

    .skill-tree-node.locked {
      opacity: 0.62 !important;
    }

    .node-gem {
      width: 24px !important;
      height: 24px !important;
      margin-top: 5px !important;
      border-radius: 50% !important;
      background: rgba(139, 166, 214, 0.16) !important;
      border: 1px solid rgba(139, 166, 214, 0.28) !important;
    }

    .skill-tree-node.available .node-gem {
      background: var(--gold) !important;
      box-shadow: 0 0 18px rgba(217, 173, 79, 0.45) !important;
    }

    .skill-tree-node.learned .node-gem {
      background: var(--green) !important;
      box-shadow: 0 0 16px rgba(115, 209, 138, 0.38) !important;
    }

    .node-copy {
      min-width: 0 !important;
    }

    .tree-bonus-list {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      margin-top: 8px !important;
    }

    .tree-bonus-list span {
      display: inline-flex !important;
      align-items: center !important;
      min-height: 24px !important;
      padding: 4px 8px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(139, 166, 214, 0.18) !important;
      background: rgba(8, 14, 24, 0.62) !important;
      color: var(--muted) !important;
      font-size: 11px !important;
      font-weight: 800 !important;
    }

    .tree-bonus-list.compact span {
      min-height: 20px !important;
      font-size: 10px !important;
    }

    /* -------------------------------------------------------------------------
       DARK FANTASY PROFESSIONAL OVERHAUL
       ------------------------------------------------------------------------- */

    .panel.open .tab-panel.active {
      border-radius: 10px !important;
      border-color: rgba(201, 179, 123, 0.32) !important;
      background:
        linear-gradient(180deg, rgba(19, 20, 27, 0.98), rgba(7, 10, 16, 0.97)),
        radial-gradient(circle at 15% 0%, rgba(217, 173, 79, 0.12), transparent 38%) !important;
      box-shadow:
        0 30px 100px rgba(0, 0, 0, 0.72),
        inset 0 0 0 1px rgba(255,255,255,0.035),
        inset 0 26px 60px rgba(255,255,255,0.025) !important;
    }

    .panel.open .tab-panel.active::before {
      content: "" !important;
      display: block !important;
      height: 4px !important;
      margin: -14px -14px 14px !important;
      background: linear-gradient(90deg, #6f2833, #d9ad4f, #5f2c80, #244b37) !important;
      opacity: 0.82 !important;
    }

    .panel .tabs {
      border-radius: 10px !important;
      background: rgba(4, 6, 10, 0.84) !important;
      border-color: rgba(201, 179, 123, 0.24) !important;
      box-shadow:
        0 18px 60px rgba(0,0,0,0.46),
        inset 0 1px rgba(255,255,255,0.06) !important;
    }

    .tab,
    .subtab {
      border-radius: 7px !important;
      letter-spacing: 0 !important;
      text-transform: uppercase !important;
      background:
        linear-gradient(180deg, rgba(23, 29, 42, 0.94), rgba(8, 11, 18, 0.96)) !important;
      border-color: rgba(139, 166, 214, 0.18) !important;
    }

    .tab.active,
    .subtab.active {
      color: #120f0a !important;
      background:
        linear-gradient(180deg, #f1d690, #c69b45 52%, #8b6122) !important;
      border-color: rgba(255, 236, 180, 0.88) !important;
      box-shadow:
        0 0 0 1px rgba(0,0,0,0.24),
        0 12px 28px rgba(217,173,79,0.20),
        inset 0 1px rgba(255,255,255,0.45) !important;
    }

    .card,
    .slot-card,
    .recipe-card,
    .inventory-card,
    .ability-card,
    .skill-card,
    .quest-card,
    .skill-tree-node {
      border-radius: 8px !important;
      background:
        linear-gradient(180deg, rgba(18, 24, 34, 0.91), rgba(8, 12, 20, 0.88)) !important;
      border-color: rgba(201, 179, 123, 0.18) !important;
      box-shadow:
        0 14px 38px rgba(0,0,0,0.32),
        inset 0 1px rgba(255,255,255,0.045) !important;
    }

    .card h2,
    .card h3,
    .skill-card h3 {
      color: #f1d690 !important;
      text-shadow: 0 2px 12px rgba(0,0,0,0.55) !important;
      letter-spacing: 0 !important;
    }

    .skill-tree-grid {
      grid-template-columns: repeat(4, minmax(210px, 1fr)) !important;
      align-items: start !important;
    }

    .skill-tree-card {
      border-color: rgba(201, 179, 123, 0.24) !important;
    }

    .skill-tree-node {
      grid-template-columns: 32px minmax(0, 1fr) !important;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease !important;
    }

    .skill-tree-node.available:hover {
      transform: translateY(-1px) !important;
      border-color: rgba(241, 214, 144, 0.68) !important;
      box-shadow: 0 18px 44px rgba(0,0,0,0.38), 0 0 24px rgba(217,173,79,0.14) !important;
    }

    .skill-tree-node.learned {
      background:
        linear-gradient(180deg, rgba(30, 45, 35, 0.94), rgba(9, 18, 16, 0.92)) !important;
      border-color: rgba(115, 209, 138, 0.44) !important;
    }

    .node-gem {
      border-radius: 5px !important;
      transform: rotate(45deg) !important;
      background: rgba(139, 166, 214, 0.12) !important;
    }

    .node-gem::after {
      content: "" !important;
      display: block !important;
      width: 8px !important;
      height: 8px !important;
      margin: 7px !important;
      border-radius: 50% !important;
      background: rgba(255,255,255,0.22) !important;
    }

    #unitFramesHud,
    #combatSkillHud {
      filter: drop-shadow(0 18px 42px rgba(0,0,0,0.52)) !important;
    }

    .unit-frame,
    #combatSkillHud {
      border-radius: 8px !important;
      border-color: rgba(201, 179, 123, 0.26) !important;
      background:
        linear-gradient(180deg, rgba(15, 19, 28, 0.91), rgba(5, 8, 14, 0.84)) !important;
      box-shadow:
        inset 0 1px rgba(255,255,255,0.05),
        0 14px 42px rgba(0,0,0,0.44) !important;
    }

    .unit-portrait,
    .combat-hud-key {
      border-radius: 6px !important;
      border-color: rgba(241, 214, 144, 0.28) !important;
    }

    .combat-hud-slot {
      border-radius: 8px !important;
      background:
        linear-gradient(180deg, rgba(16, 22, 33, 0.94), rgba(6, 9, 16, 0.94)) !important;
    }

    .combat-hud-slot.ready {
      box-shadow: inset 0 0 0 1px rgba(217,173,79,0.20), 0 0 22px rgba(217,173,79,0.08) !important;
    }

    .unit-bar {
      height: 8px !important;
      border-radius: 3px !important;
    }

    .tree-bonus-list span {
      border-radius: 5px !important;
      background: rgba(3, 6, 12, 0.52) !important;
      border-color: rgba(201, 179, 123, 0.18) !important;
    }

    /* -------------------------------------------------------------------------
       DARK FANTASY PANEL OVERHAUL
       ------------------------------------------------------------------------- */

    .panel {
      right: 22px !important;
      bottom: 18px !important;
      filter: none !important;
    }

    .panel .tabs {
      border-radius: 6px !important;
      padding: 7px !important;
      gap: 5px !important;
      background:
        linear-gradient(180deg, rgba(40, 37, 45, 0.92), rgba(9, 10, 15, 0.92)),
        repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 8px) !important;
      border: 1px solid rgba(210, 190, 130, 0.30) !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.05),
        inset 0 12px 22px rgba(255,255,255,0.035),
        0 20px 50px rgba(0,0,0,0.48) !important;
    }

    .tab {
      border-radius: 4px !important;
      min-height: 34px !important;
      background:
        linear-gradient(180deg, rgba(38, 39, 50, 0.96), rgba(15, 15, 22, 0.96)) !important;
      border-color: rgba(88, 88, 103, 0.85) !important;
      box-shadow:
        inset 0 1px rgba(255,255,255,0.06),
        inset 0 -10px 18px rgba(0,0,0,0.26) !important;
      color: #c5c0b6 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      font-size: 10px !important;
    }

    .tab.active {
      color: #f4dfaa !important;
      background:
        linear-gradient(180deg, rgba(74, 65, 55, 0.98), rgba(30, 26, 25, 0.98)) !important;
      border-color: rgba(217,173,79,0.78) !important;
      text-shadow: 0 0 10px rgba(217,173,79,0.28) !important;
    }

    .panel.open .tab-panel.active {
      border-radius: 4px !important;
      border: 1px solid rgba(210,190,130,0.34) !important;
      padding: 18px !important;
      background:
        linear-gradient(180deg, rgba(29, 29, 39, 0.98), rgba(13, 13, 20, 0.99)),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 9px) !important;
      box-shadow:
        inset 0 0 0 2px rgba(6,6,10,0.92),
        inset 0 0 0 4px rgba(84,78,78,0.55),
        inset 0 22px 40px rgba(255,255,255,0.035),
        0 28px 95px rgba(0,0,0,0.72) !important;
    }

    .panel.open .tab-panel.active::after {
      content: "" !important;
      pointer-events: none !important;
      position: absolute !important;
      inset: 7px !important;
      border: 1px solid rgba(255,255,255,0.055) !important;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.65) !important;
    }

    .panel.open #inventory.active,
    .panel.open #skills.active {
      left: max(24px, calc(50vw - 540px)) !important;
      right: max(24px, calc(50vw - 540px)) !important;
      top: 58px !important;
      bottom: 86px !important;
      width: auto !important;
      overflow: hidden !important;
    }

    .panel.open #skills.active,
    .panel.open #character.active,
    .panel.open #quests.active,
    .panel.open #log.active {
      overflow: auto !important;
    }

    .panel.open #inventory.active {
      overflow: hidden !important;
    }

    .panel.open #character.active {
      left: auto !important;
      right: 28px !important;
      top: 58px !important;
      bottom: 86px !important;
      width: min(720px, calc(100vw - 56px)) !important;
      overflow: hidden !important;
    }

    .panel.open #quests.active,
    .panel.open #log.active {
      top: 58px !important;
      bottom: 86px !important;
      width: min(610px, calc(100vw - 56px)) !important;
      overflow: hidden !important;
    }

    .card,
    .inventory-card,
    .equipment-slot,
    .ability-card,
    .skill-card,
    .quest-card,
    .skill-tree-node,
    .recipe-card,
    .progression-big-card,
    .sheet-stat,
    .paper-skill-row {
      border-radius: 4px !important;
      background:
        linear-gradient(180deg, rgba(35, 35, 46, 0.92), rgba(17, 17, 25, 0.92)) !important;
      border: 1px solid rgba(97, 93, 103, 0.8) !important;
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.62),
        inset 0 1px rgba(255,255,255,0.045),
        0 10px 24px rgba(0,0,0,0.22) !important;
    }

    .card h2,
    .card h3,
    .skill-tree-card h3 {
      color: #f0d596 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      font-size: 14px !important;
      text-shadow: 0 2px 12px rgba(0,0,0,0.75) !important;
    }

    .subtab-bar {
      border-radius: 4px !important;
      background: rgba(5, 5, 9, 0.58) !important;
      border-color: rgba(210,190,130,0.18) !important;
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(108px, 1fr)) !important;
      margin-bottom: 12px !important;
    }

    .subtab {
      border-radius: 3px !important;
      background: linear-gradient(180deg, rgba(34,35,45,0.96), rgba(12,12,19,0.96)) !important;
      border-color: rgba(84,82,94,0.86) !important;
      color: #bab4a9 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.06em !important;
      font-size: 10px !important;
    }

    .subtab.active {
      color: #f4dfaa !important;
      border-color: rgba(217,173,79,0.7) !important;
      background: linear-gradient(180deg, rgba(83,70,49,0.96), rgba(31,25,22,0.96)) !important;
    }

    .stat-row {
      border-bottom-color: rgba(210,190,130,0.105) !important;
    }

    .stat-row span {
      color: #aaa39b !important;
    }

    .stat-row b {
      color: #eee6d3 !important;
    }

    .bar {
      height: 9px !important;
      border-radius: 2px !important;
      background: #08080d !important;
      border-color: rgba(210,190,130,0.22) !important;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.72) !important;
    }

    .bar .fill,
    .fill {
      border-radius: 1px !important;
    }

    .inventory-browser-layout {
      display: grid !important;
      grid-template-columns: minmax(260px, 34%) minmax(0, 1fr) !important;
      gap: 12px !important;
      min-height: min(600px, calc(100vh - 190px)) !important;
      max-height: calc(100vh - 190px) !important;
      overflow: hidden !important;
    }

    .inventory-list-pane,
    .inventory-detail-pane {
      min-width: 0 !important;
      min-height: 0 !important;
      border: 1px solid rgba(111,108,122,0.68) !important;
      border-radius: 3px !important;
      background: linear-gradient(180deg, rgba(24,24,34,0.96), rgba(10,10,16,0.98)) !important;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.22) !important;
    }

    .inventory-list-pane {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      overflow: hidden !important;
    }

    .inventory-list-heading {
      display: grid !important;
      gap: 8px !important;
      padding: 12px !important;
      border-bottom: 1px solid rgba(210,190,130,0.16) !important;
      background: rgba(255,255,255,0.018) !important;
    }

    .inventory-list-heading h2,
    .inventory-detail-header h2,
    .inventory-detail-empty h2 {
      margin: 0 !important;
      color: #efd89a !important;
      font-size: 15px !important;
      line-height: 1.2 !important;
      letter-spacing: 0 !important;
    }

    .inventory-list-heading .item-stats {
      max-height: 96px !important;
      overflow: auto !important;
      margin-top: 8px !important;
    }

    .inventory-name-list {
      display: grid !important;
      grid-auto-rows: minmax(38px, auto) !important;
      align-content: start !important;
      gap: 2px !important;
      padding: 6px !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
    }

    .inventory-list-row {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 38px !important;
      position: relative !important;
      display: grid !important;
      grid-template-columns: 4px minmax(0, 1fr) !important;
      align-items: center !important;
      gap: 9px !important;
      padding: 6px 9px !important;
      border: 1px solid transparent !important;
      border-radius: 2px !important;
      background: rgba(255,255,255,0.018) !important;
      color: #e7dfcf !important;
      box-shadow: none !important;
      text-align: left !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      cursor: pointer !important;
      overflow: hidden !important;
    }

    .inventory-list-row:hover,
    .inventory-list-row:focus,
    .inventory-list-row.active,
    .inventory-list-row.game-ui-controller-focus {
      border-color: rgba(217,173,79,0.62) !important;
      background: linear-gradient(90deg, rgba(91,72,36,0.46), rgba(37,32,27,0.3)) !important;
      color: #fff1c8 !important;
      outline: none !important;
    }

    .inventory-list-row.game-ui-controller-focus {
      box-shadow: inset 0 0 0 1px rgba(255,220,138,0.52), 0 0 16px rgba(217,173,79,0.28) !important;
    }

    .inventory-list-row.inventory-salvage-holding {
      background: linear-gradient(90deg, rgba(91,72,36,0.46), rgba(37,32,27,0.3)) !important;
      border-color: rgba(239,111,108,0.84) !important;
    }

    .inventory-list-row.inventory-salvage-holding::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 auto 0 0 !important;
      width: var(--salvage-progress, 0%) !important;
      background: linear-gradient(90deg, rgba(191,74,52,0.84), rgba(239,111,108,0.52)) !important;
      pointer-events: none !important;
      transition: width 70ms linear !important;
      z-index: 0 !important;
    }

    .inventory-list-row.inventory-salvage-confirming {
      border-color: rgba(244,196,89,0.9) !important;
    }

    .inventory-list-row.inventory-salvage-confirming::before {
      background: linear-gradient(90deg, rgba(218,154,54,0.88), rgba(255,220,138,0.5)) !important;
    }

    .inventory-list-row.inventory-salvage-blocked::before {
      background: linear-gradient(90deg, rgba(105,112,126,0.74), rgba(167,176,194,0.34)) !important;
    }

    .inventory-list-row.inventory-salvage-complete::before {
      background: linear-gradient(90deg, rgba(76,157,99,0.8), rgba(125,220,147,0.38)) !important;
    }

    .inventory-list-row.inventory-salvage-holding > * {
      position: relative !important;
      z-index: 1 !important;
    }

    .inventory-list-rarity {
      width: 4px !important;
      align-self: stretch !important;
      min-height: 22px !important;
      border-radius: 1px !important;
      background: var(--rarity, #b8c0cc) !important;
      box-shadow: 0 0 8px color-mix(in srgb, var(--rarity, #b8c0cc) 42%, transparent) !important;
    }

    .inventory-list-name {
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-size: 12px !important;
      font-weight: 850 !important;
      line-height: 1.2 !important;
    }

    .inventory-detail-pane {
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
    }

    .inventory-detail-content,
    .inventory-detail-empty {
      display: grid !important;
      align-content: start !important;
      gap: 14px !important;
      min-width: 0 !important;
      padding: 16px !important;
    }

    .inventory-detail-header {
      display: grid !important;
      grid-template-columns: 58px minmax(0, 1fr) !important;
      gap: 12px !important;
      align-items: center !important;
      min-width: 0 !important;
      padding-bottom: 12px !important;
      border-bottom: 1px solid rgba(210,190,130,0.16) !important;
    }

    .inventory-detail-header h2 {
      overflow-wrap: anywhere !important;
    }

    .inventory-detail-description {
      margin: 0 !important;
      color: #c3bdaf !important;
      font-size: 13px !important;
      line-height: 1.55 !important;
      overflow-wrap: anywhere !important;
    }

    .inventory-legendary-effect {
      display: grid !important;
      gap: 6px !important;
      padding: 11px 12px !important;
      border: 1px solid rgba(255,204,102,0.46) !important;
      border-left: 3px solid #ffcc66 !important;
      border-radius: 3px !important;
      background: rgba(255,204,102,0.055) !important;
    }

    .inventory-legendary-effect h3,
    .inventory-legendary-effect p {
      margin: 0 !important;
      overflow-wrap: anywhere !important;
    }

    .inventory-legendary-effect h3 {
      color: #ffda84 !important;
      font-size: 12px !important;
      letter-spacing: 0 !important;
    }

    .inventory-legendary-effect p {
      color: #ddd4bd !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
    }

    .inventory-detail-pane .item-stats,
    .inventory-detail-materials {
      display: grid !important;
      gap: 0 !important;
      min-width: 0 !important;
    }

    .inventory-detail-materials h3 {
      margin: 0 0 7px !important;
      color: #d8c58d !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
    }

    .inventory-detail-pane .stat-row {
      align-items: flex-start !important;
      gap: 16px !important;
      padding: 7px 0 !important;
    }

    .inventory-detail-pane .stat-row span {
      flex: 0 0 auto !important;
    }

    .inventory-detail-pane .stat-row b {
      min-width: 0 !important;
      max-width: 68% !important;
      text-align: right !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }

    .inventory-controller-hints {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 7px !important;
      padding-top: 12px !important;
      border-top: 1px solid rgba(210,190,130,0.16) !important;
    }

    .inventory-controller-hints span {
      padding: 6px 9px !important;
      border: 1px solid rgba(191,160,88,0.42) !important;
      border-radius: 2px !important;
      background: rgba(50,43,31,0.58) !important;
      color: #ead9a7 !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
    }

    .inventory-gear-identity {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 5px !important;
    }

    .inventory-gear-identity span {
      padding: 3px 7px !important;
      border-left: 2px solid rgba(217,173,79,0.7) !important;
      background: rgba(255,255,255,0.035) !important;
      color: #cfc5ae !important;
      font-size: 9px !important;
      font-weight: 850 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
    }

    .item-icon {
      width: 42px !important;
      height: 42px !important;
      display: grid !important;
      place-items: center !important;
      border-radius: 3px !important;
      color: #f3ead6 !important;
      font-weight: 950 !important;
      font-size: 16px !important;
      background:
        radial-gradient(circle at 35% 22%, rgba(255,255,255,0.18), transparent 34%),
        linear-gradient(180deg, color-mix(in srgb, var(--rarity, #b8c0cc) 38%, #262634), #111119) !important;
      border: 1px solid color-mix(in srgb, var(--rarity, #b8c0cc) 68%, #272734) !important;
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.62) !important;
    }

    .item-icon.inventory-detail-icon {
      width: 58px !important;
      height: 58px !important;
      font-size: 20px !important;
    }

    .pixel-item-art {
      position: relative !important;
      width: 30px !important;
      height: 30px !important;
      display: block !important;
      overflow: visible !important;
      image-rendering: pixelated !important;
      filter: drop-shadow(1px 2px 0 var(--gear-outline, #0b0d12)) !important;
    }

    .inventory-detail-icon .pixel-item-art {
      transform: scale(1.35) !important;
    }

    .pixel-item-shape,
    .pixel-item-detail,
    .pixel-item-accent {
      position: absolute !important;
      display: block !important;
      box-sizing: border-box !important;
      pointer-events: none !important;
    }

    .pixel-item-art.empty {
      opacity: 0.34 !important;
      filter: none !important;
    }

    .pixel-item-art.empty .pixel-item-shape {
      inset: 6px !important;
      border: 2px dashed var(--gear-base, #777b86) !important;
    }

    .pixel-item-weapon.pixel-item-sword .pixel-item-shape,
    .pixel-item-weapon.pixel-item-greatsword .pixel-item-shape,
    .pixel-item-weapon.pixel-item-rapier .pixel-item-shape,
    .pixel-item-weapon.pixel-item-dagger .pixel-item-shape {
      width: 6px !important;
      height: 23px !important;
      left: 13px !important;
      top: 1px !important;
      background: linear-gradient(90deg, var(--gear-deep) 0 30%, var(--gear-light) 31% 58%, var(--gear-mid) 59%) !important;
      clip-path: polygon(50% 0, 100% 14%, 82% 100%, 18% 100%, 0 14%) !important;
      transform: rotate(38deg) !important;
      transform-origin: 50% 90% !important;
    }

    .pixel-item-weapon.pixel-item-greatsword .pixel-item-shape {
      width: 8px !important;
      height: 27px !important;
      top: -1px !important;
    }

    .pixel-item-weapon.pixel-item-rapier .pixel-item-shape,
    .pixel-item-weapon.pixel-item-dagger .pixel-item-shape {
      width: 4px !important;
    }

    .pixel-item-weapon.pixel-item-dagger .pixel-item-shape {
      height: 16px !important;
      top: 7px !important;
    }

    .pixel-item-weapon.pixel-item-sword .pixel-item-detail,
    .pixel-item-weapon.pixel-item-greatsword .pixel-item-detail,
    .pixel-item-weapon.pixel-item-rapier .pixel-item-detail,
    .pixel-item-weapon.pixel-item-dagger .pixel-item-detail {
      width: 18px !important;
      height: 4px !important;
      left: 7px !important;
      top: 20px !important;
      background: var(--gear-accent) !important;
      border: 1px solid var(--gear-outline) !important;
      transform: rotate(38deg) !important;
    }

    .pixel-item-weapon.pixel-item-sword .pixel-item-accent,
    .pixel-item-weapon.pixel-item-greatsword .pixel-item-accent,
    .pixel-item-weapon.pixel-item-rapier .pixel-item-accent,
    .pixel-item-weapon.pixel-item-dagger .pixel-item-accent {
      width: 4px !important;
      height: 8px !important;
      left: 7px !important;
      top: 22px !important;
      background: var(--gear-deep) !important;
      transform: rotate(38deg) !important;
    }

    .pixel-item-weapon.pixel-item-staff .pixel-item-shape,
    .pixel-item-weapon.pixel-item-branchstaff .pixel-item-shape,
    .pixel-item-weapon.pixel-item-conduit .pixel-item-shape {
      width: 5px !important;
      height: 29px !important;
      left: 13px !important;
      top: 1px !important;
      background: linear-gradient(90deg, var(--gear-deep), var(--gear-base) 55%, var(--gear-mid)) !important;
      transform: rotate(31deg) !important;
    }

    .pixel-item-weapon.pixel-item-staff .pixel-item-detail,
    .pixel-item-weapon.pixel-item-branchstaff .pixel-item-detail,
    .pixel-item-weapon.pixel-item-conduit .pixel-item-detail {
      width: 13px !important;
      height: 13px !important;
      left: 15px !important;
      top: 0 !important;
      background: var(--gear-deep) !important;
      border: 3px solid var(--gear-accent) !important;
      clip-path: polygon(50% 0, 100% 36%, 82% 100%, 18% 100%, 0 36%) !important;
    }

    .pixel-item-weapon.pixel-item-branchstaff .pixel-item-detail {
      border-radius: 50% 15% 50% 15% !important;
      transform: rotate(24deg) !important;
    }

    .pixel-item-weapon.pixel-item-conduit .pixel-item-detail {
      background: #090305 !important;
      border-color: #d73545 !important;
      transform: rotate(45deg) !important;
    }

    .pixel-item-weapon.pixel-item-spiritfocus .pixel-item-shape,
    .pixel-item-weapon.pixel-item-focusgauntlet .pixel-item-shape,
    .pixel-item-weapon.pixel-item-reliquaryfocus .pixel-item-shape {
      width: 19px !important;
      height: 19px !important;
      left: 6px !important;
      top: 6px !important;
      background: radial-gradient(circle at 38% 35%, var(--gear-light) 0 18%, var(--gear-mid) 19% 44%, var(--gear-deep) 45% 100%) !important;
      border: 2px solid var(--gear-outline) !important;
      border-radius: 50% !important;
      box-shadow: inset 0 0 0 3px var(--gear-base) !important;
    }

    .pixel-item-weapon.pixel-item-spiritfocus .pixel-item-detail,
    .pixel-item-weapon.pixel-item-focusgauntlet .pixel-item-detail,
    .pixel-item-weapon.pixel-item-reliquaryfocus .pixel-item-detail {
      width: 24px !important;
      height: 8px !important;
      left: 3px !important;
      top: 12px !important;
      background: var(--gear-deep) !important;
      border: 1px solid var(--gear-accent) !important;
      border-radius: 7px !important;
    }

    .pixel-item-weapon.pixel-item-spiritfocus .pixel-item-accent,
    .pixel-item-weapon.pixel-item-focusgauntlet .pixel-item-accent,
    .pixel-item-weapon.pixel-item-reliquaryfocus .pixel-item-accent {
      width: 8px !important;
      height: 8px !important;
      left: 12px !important;
      top: 11px !important;
      background: var(--gear-light) !important;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%) !important;
    }

    .pixel-item-weapon.pixel-item-scythe .pixel-item-shape {
      width: 5px !important;
      height: 30px !important;
      left: 12px !important;
      top: 1px !important;
      background: linear-gradient(90deg, var(--gear-deep), var(--gear-base), var(--gear-light)) !important;
      transform: rotate(28deg) !important;
    }

    .pixel-item-weapon.pixel-item-scythe .pixel-item-detail {
      width: 22px !important;
      height: 12px !important;
      left: 9px !important;
      top: 0 !important;
      border-top: 5px solid var(--gear-light) !important;
      border-radius: 65% 0 0 0 !important;
      transform: rotate(22deg) !important;
    }

    .pixel-item-weapon.pixel-item-scythe .pixel-item-accent {
      width: 6px !important;
      height: 6px !important;
      left: 14px !important;
      top: 5px !important;
      background: var(--gear-accent) !important;
      transform: rotate(45deg) !important;
    }

    .pixel-item-weapon.pixel-item-bow .pixel-item-shape,
    .pixel-item-weapon.pixel-item-longbow .pixel-item-shape {
      width: 20px !important;
      height: 28px !important;
      left: 5px !important;
      top: 1px !important;
      border-right: 5px solid var(--gear-base) !important;
      border-radius: 0 70% 70% 0 !important;
    }

    .pixel-item-weapon.pixel-item-longbow .pixel-item-shape {
      height: 31px !important;
      top: -1px !important;
    }

    .pixel-item-weapon.pixel-item-bow .pixel-item-detail,
    .pixel-item-weapon.pixel-item-longbow .pixel-item-detail {
      width: 1px !important;
      height: 26px !important;
      left: 8px !important;
      top: 2px !important;
      background: var(--gear-light) !important;
      transform: rotate(-13deg) !important;
    }

    .pixel-item-weapon.pixel-item-bow .pixel-item-accent,
    .pixel-item-weapon.pixel-item-longbow .pixel-item-accent {
      width: 11px !important;
      height: 4px !important;
      left: 8px !important;
      top: 13px !important;
      background: var(--gear-accent) !important;
    }

    .pixel-item-helm .pixel-item-shape {
      width: 22px !important;
      height: 21px !important;
      left: 4px !important;
      top: 6px !important;
      background: linear-gradient(145deg, var(--gear-light) 0 18%, var(--gear-base) 19% 62%, var(--gear-deep) 63%) !important;
      border: 2px solid var(--gear-outline) !important;
      clip-path: polygon(18% 0, 82% 0, 100% 28%, 86% 100%, 14% 100%, 0 28%) !important;
    }

    .pixel-item-helm.pixel-item-hood .pixel-item-shape {
      background: linear-gradient(145deg, var(--gear-mid), var(--gear-deep) 60%) !important;
      clip-path: polygon(50% 0, 88% 16%, 100% 62%, 78% 100%, 22% 100%, 0 62%, 12% 16%) !important;
    }

    .pixel-item-helm.pixel-item-helmet .pixel-item-detail {
      width: 18px !important;
      height: 4px !important;
      left: 6px !important;
      top: 17px !important;
      background: var(--gear-outline) !important;
      box-shadow: 0 5px 0 var(--gear-accent) !important;
    }

    .pixel-item-helm.pixel-item-hood .pixel-item-detail {
      width: 12px !important;
      height: 12px !important;
      left: 9px !important;
      top: 13px !important;
      background: var(--gear-outline) !important;
      clip-path: polygon(50% 0, 100% 35%, 82% 100%, 18% 100%, 0 35%) !important;
    }

    .pixel-item-helm.pixel-item-crown .pixel-item-shape,
    .pixel-item-helm.pixel-item-halo .pixel-item-shape {
      width: 26px !important;
      height: 15px !important;
      left: 2px !important;
      top: 8px !important;
      background: var(--gear-accent) !important;
      clip-path: polygon(0 100%, 0 45%, 15% 65%, 25% 0, 43% 62%, 55% 0, 73% 62%, 85% 10%, 100% 65%, 100% 100%) !important;
    }

    .pixel-item-helm.pixel-item-halo .pixel-item-shape {
      height: 10px !important;
      top: 10px !important;
      background: transparent !important;
      border: 4px solid var(--gear-accent) !important;
      border-radius: 50% !important;
      clip-path: none !important;
    }

    .pixel-item-chest .pixel-item-shape {
      width: 26px !important;
      height: 25px !important;
      left: 2px !important;
      top: 3px !important;
      background: linear-gradient(145deg, var(--gear-light) 0 12%, var(--gear-base) 13% 58%, var(--gear-deep) 59%) !important;
      border: 2px solid var(--gear-outline) !important;
      clip-path: polygon(18% 0, 35% 10%, 65% 10%, 82% 0, 100% 22%, 84% 100%, 16% 100%, 0 22%) !important;
    }

    .pixel-item-chest.pixel-item-robe .pixel-item-shape {
      clip-path: polygon(22% 0, 78% 0, 94% 24%, 100% 100%, 0 100%, 6% 24%) !important;
    }

    .pixel-item-chest.pixel-item-coat .pixel-item-shape {
      clip-path: polygon(18% 0, 82% 0, 100% 25%, 82% 100%, 52% 76%, 48% 100%, 18% 100%, 0 25%) !important;
    }

    .pixel-item-chest .pixel-item-detail {
      width: 16px !important;
      height: 5px !important;
      left: 7px !important;
      top: 12px !important;
      background: var(--gear-mid) !important;
      border-bottom: 2px solid var(--gear-accent) !important;
    }

    .pixel-item-chest .pixel-item-accent {
      width: 4px !important;
      height: 17px !important;
      left: 13px !important;
      top: 8px !important;
      background: var(--gear-accent) !important;
    }

    .pixel-item-legs .pixel-item-shape {
      width: 23px !important;
      height: 26px !important;
      left: 4px !important;
      top: 2px !important;
      background: var(--gear-base) !important;
      clip-path: polygon(0 0, 100% 0, 88% 100%, 55% 100%, 50% 38%, 45% 100%, 12% 100%) !important;
      border-top: 5px solid var(--gear-accent) !important;
    }

    .pixel-item-legs .pixel-item-detail {
      width: 7px !important;
      height: 16px !important;
      left: 5px !important;
      top: 10px !important;
      border: 2px solid var(--gear-light) !important;
      box-shadow: 13px 0 0 -2px var(--gear-base), 13px 0 0 0 var(--gear-light) !important;
    }

    .pixel-item-trinket .pixel-item-shape {
      width: 18px !important;
      height: 18px !important;
      left: 6px !important;
      top: 7px !important;
      background: var(--gear-deep) !important;
      border: 4px solid var(--gear-accent) !important;
      transform: rotate(45deg) !important;
    }

    .pixel-item-trinket.pixel-item-ring .pixel-item-shape {
      background: transparent !important;
      border-radius: 50% !important;
      transform: none !important;
    }

    .pixel-item-trinket.pixel-item-lantern .pixel-item-shape {
      width: 17px !important;
      height: 21px !important;
      left: 7px !important;
      top: 7px !important;
      border-radius: 0 !important;
      transform: none !important;
    }

    .pixel-item-trinket .pixel-item-accent {
      width: 6px !important;
      height: 6px !important;
      left: 12px !important;
      top: 13px !important;
      background: var(--gear-light) !important;
      transform: rotate(45deg) !important;
    }

    .pixel-item-pickaxe .pixel-item-shape,
    .pixel-item-sickle .pixel-item-shape,
    .pixel-item-rod .pixel-item-shape {
      width: 5px !important;
      height: 27px !important;
      left: 13px !important;
      top: 2px !important;
      background: var(--gear-base) !important;
      transform: rotate(35deg) !important;
    }

    .pixel-item-pickaxe .pixel-item-detail {
      width: 25px !important;
      height: 5px !important;
      left: 3px !important;
      top: 5px !important;
      background: var(--gear-light) !important;
      clip-path: polygon(0 50%, 18% 0, 82% 0, 100% 50%, 82% 100%, 18% 100%) !important;
      transform: rotate(18deg) !important;
    }

    .pixel-item-sickle .pixel-item-detail,
    .pixel-item-rod .pixel-item-detail {
      width: 17px !important;
      height: 15px !important;
      left: 11px !important;
      top: 1px !important;
      border-top: 4px solid var(--gear-light) !important;
      border-right: 4px solid var(--gear-light) !important;
      border-radius: 0 100% 0 0 !important;
      transform: rotate(20deg) !important;
    }

    .pixel-item-material .pixel-item-shape,
    .pixel-item-reagent .pixel-item-shape,
    .pixel-item-essence .pixel-item-shape,
    .pixel-item-quest .pixel-item-shape,
    .pixel-item-coin .pixel-item-shape,
    .pixel-item-food .pixel-item-shape {
      width: 20px !important;
      height: 20px !important;
      left: 5px !important;
      top: 6px !important;
      background: linear-gradient(145deg, var(--gear-light), var(--gear-base) 45%, var(--gear-deep)) !important;
      border: 2px solid var(--gear-outline) !important;
      clip-path: polygon(50% 0, 88% 18%, 100% 58%, 72% 100%, 22% 88%, 0 48%, 18% 14%) !important;
    }

    .pixel-item-reagent .pixel-item-shape {
      clip-path: polygon(48% 0, 70% 32%, 100% 42%, 70% 62%, 58% 100%, 38% 66%, 0 58%, 28% 36%) !important;
    }

    .pixel-item-coin .pixel-item-shape {
      border-radius: 50% !important;
      clip-path: none !important;
      border-color: var(--gear-accent) !important;
    }

    .pixel-item-food .pixel-item-shape {
      border-radius: 50% 50% 40% 40% !important;
      clip-path: none !important;
    }

    .pixel-item-material .pixel-item-accent,
    .pixel-item-reagent .pixel-item-accent,
    .pixel-item-essence .pixel-item-accent,
    .pixel-item-quest .pixel-item-accent,
    .pixel-item-coin .pixel-item-accent,
    .pixel-item-food .pixel-item-accent {
      width: 6px !important;
      height: 5px !important;
      left: 10px !important;
      top: 10px !important;
      background: var(--gear-light) !important;
      opacity: 0.72 !important;
    }

    .item-icon.ghost {
      --rarity: #5d6070 !important;
      opacity: 0.45 !important;
    }

    .inventory-empty-slot {
      min-height: 108px !important;
      border: 1px solid rgba(82,80,91,0.58) !important;
      background:
        linear-gradient(180deg, rgba(21,21,30,0.72), rgba(8,8,13,0.76)) !important;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.58) !important;
    }

    .inventory-page-controls {
      display: grid !important;
      grid-template-columns: auto 1fr auto !important;
      gap: 8px !important;
      align-items: center !important;
      margin-top: 10px !important;
      padding-top: 10px !important;
      border-top: 1px solid rgba(210,190,130,0.14) !important;
    }

    .inventory-page-controls span {
      text-align: center !important;
      color: #d6c8a6 !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
    }

    .small-btn,
    .equipment-slot button,
    .inventory-card button,
    .recipe-card button,
    .slot-card button,
    .inventory-page-controls button {
      border-radius: 3px !important;
      background: linear-gradient(180deg, rgba(55,51,47,0.96), rgba(20,18,18,0.98)) !important;
      border-color: rgba(191,160,88,0.46) !important;
      color: #efe0b4 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.06em !important;
      font-size: 10px !important;
      box-shadow: inset 0 1px rgba(255,255,255,0.05), 0 6px 14px rgba(0,0,0,0.24) !important;
    }

    button:disabled,
    .inventory-page-controls button:disabled {
      opacity: 0.42 !important;
      cursor: default !important;
    }

    .equipment-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    }

    .equipment-slot {
      text-align: center !important;
      display: grid !important;
      gap: 6px !important;
      min-height: 162px !important;
      align-content: start !important;
    }

    .equipment-slot.compact {
      min-height: 122px !important;
      padding: 9px !important;
      grid-template-rows: auto auto auto auto auto !important;
    }

    .equipment-slot.compact .equipment-slot-frame {
      min-height: 38px !important;
    }

    .equipment-slot.compact .item-icon {
      width: 36px !important;
      height: 36px !important;
      font-size: 14px !important;
    }

    .equipment-slot.compact h3 {
      font-size: 10px !important;
    }

    .equipment-slot.compact > b {
      display: block !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-size: 12px !important;
    }

    .equipment-slot.compact .tag {
      margin: 0 !important;
      -webkit-line-clamp: 1 !important;
    }

    .equipment-slot.compact .compact-stats {
      display: grid !important;
      gap: 2px !important;
      max-height: none !important;
      overflow: hidden !important;
    }

    .equipment-slot.compact .stat-row {
      padding: 2px 0 !important;
      font-size: 11px !important;
    }

    .equipment-slot-actions {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 5px !important;
      margin-top: 2px !important;
    }

    .equipment-slot.compact .equipment-slot-actions button {
      padding: 5px 6px !important;
      font-size: 9px !important;
    }

    .equipment-slot-frame {
      display: grid !important;
      place-items: center !important;
      min-height: 50px !important;
    }

    .equipment-slot h3 {
      font-size: 11px !important;
      margin: 0 !important;
    }

    .paper-doll-layout {
      display: grid !important;
      grid-template-columns: minmax(160px, 1fr) minmax(170px, 220px) minmax(160px, 1fr) !important;
      gap: 12px !important;
      align-items: center !important;
    }

    .paper-doll-side {
      display: grid !important;
      gap: 8px !important;
    }

    .paper-doll-center {
      display: grid !important;
      gap: 8px !important;
      justify-items: center !important;
      text-align: center !important;
      min-width: 0 !important;
    }

    .paper-doll-frame {
      position: relative !important;
      width: 196px !important;
      height: 252px !important;
      border: 1px solid rgba(210,190,130,0.24) !important;
      background:
        radial-gradient(circle at 50% 42%, rgba(217,173,79,0.13), transparent 34%),
        linear-gradient(180deg, rgba(18,18,27,0.96), rgba(7,7,12,0.98)) !important;
      box-shadow: inset 0 0 0 2px rgba(0,0,0,0.64) !important;
      overflow: hidden !important;
    }

    .paper-doll-aura {
      position: absolute !important;
      inset: 46px 28px 34px !important;
      border: 1px solid rgba(217,173,79,0.12) !important;
      background: radial-gradient(circle, rgba(255,255,255,0.055), transparent 58%) !important;
    }

    .paper-doll-head,
    .paper-doll-body,
    .paper-doll-arm,
    .paper-doll-leg {
      position: absolute !important;
      background: linear-gradient(180deg, #d2ad86, #8d624a) !important;
      border: 2px solid rgba(0,0,0,0.46) !important;
      box-shadow: inset 0 1px rgba(255,255,255,0.12) !important;
    }

    .paper-doll-head {
      width: 42px !important;
      height: 46px !important;
      left: 84px !important;
      top: 28px !important;
      border-radius: 14px 14px 11px 11px !important;
    }

    .paper-doll-body {
      width: 62px !important;
      height: 78px !important;
      left: 74px !important;
      top: 78px !important;
      border-radius: 14px 14px 9px 9px !important;
      background: linear-gradient(180deg, #55433a, #221d1f) !important;
    }

    .paper-doll-arm {
      width: 20px !important;
      height: 78px !important;
      top: 86px !important;
      border-radius: 12px !important;
    }

    .paper-doll-arm.left {
      left: 50px !important;
      transform: rotate(8deg) !important;
    }

    .paper-doll-arm.right {
      right: 50px !important;
      transform: rotate(-8deg) !important;
    }

    .paper-doll-leg {
      width: 24px !important;
      height: 74px !important;
      top: 154px !important;
      border-radius: 10px !important;
      background: linear-gradient(180deg, #2e3540, #15171e) !important;
    }

    .paper-doll-leg.left {
      left: 76px !important;
    }

    .paper-doll-leg.right {
      right: 76px !important;
    }

    .paper-doll-gear {
      position: absolute !important;
      z-index: 4 !important;
      pointer-events: none !important;
      filter: drop-shadow(2px 2px 0 var(--gear-outline, #0b0d12)) !important;
    }

    .paper-doll-gear-helm {
      width: 54px !important;
      height: 48px !important;
      left: 78px !important;
      top: 22px !important;
      background: linear-gradient(145deg, var(--gear-light), var(--gear-base) 35%, var(--gear-deep) 70%) !important;
      clip-path: polygon(18% 0, 82% 0, 100% 25%, 90% 100%, 10% 100%, 0 25%) !important;
    }

    .paper-doll-gear-helm.paper-doll-gear-hood {
      width: 62px !important;
      height: 58px !important;
      left: 74px !important;
      top: 18px !important;
      clip-path: polygon(50% 0, 86% 14%, 100% 55%, 80% 100%, 20% 100%, 0 55%, 14% 14%) !important;
    }

    .paper-doll-gear-helm.paper-doll-gear-crown {
      height: 28px !important;
      top: 15px !important;
      background: var(--gear-accent) !important;
      clip-path: polygon(0 100%, 0 45%, 15% 65%, 25% 0, 43% 62%, 55% 0, 73% 62%, 85% 10%, 100% 65%, 100% 100%) !important;
    }

    .paper-doll-gear-helm.paper-doll-gear-halo {
      width: 68px !important;
      height: 24px !important;
      left: 70px !important;
      top: 10px !important;
      border: 6px solid var(--gear-accent) !important;
      border-radius: 50% !important;
      background: transparent !important;
      clip-path: none !important;
    }

    .paper-doll-gear-chest {
      width: 82px !important;
      height: 91px !important;
      left: 63px !important;
      top: 72px !important;
      background:
        linear-gradient(90deg, transparent 0 44%, var(--gear-accent) 45% 55%, transparent 56%),
        linear-gradient(145deg, var(--gear-light) 0 10%, var(--gear-base) 11% 55%, var(--gear-deep) 56%) !important;
      clip-path: polygon(17% 0, 35% 9%, 65% 9%, 83% 0, 100% 22%, 88% 100%, 12% 100%, 0 22%) !important;
    }

    .paper-doll-gear-chest.paper-doll-gear-robe {
      height: 120px !important;
      clip-path: polygon(20% 0, 80% 0, 95% 22%, 100% 100%, 0 100%, 5% 22%) !important;
    }

    .paper-doll-gear-chest.paper-doll-gear-coat {
      height: 110px !important;
      clip-path: polygon(17% 0, 83% 0, 100% 24%, 84% 100%, 52% 76%, 48% 100%, 16% 100%, 0 24%) !important;
    }

    .paper-doll-gear-legs {
      width: 66px !important;
      height: 83px !important;
      left: 71px !important;
      top: 148px !important;
      background:
        linear-gradient(90deg, var(--gear-base) 0 38%, transparent 39% 61%, var(--gear-base) 62%),
        var(--gear-deep) !important;
      border-top: 9px solid var(--gear-accent) !important;
      clip-path: polygon(0 0, 100% 0, 88% 100%, 56% 100%, 50% 35%, 44% 100%, 12% 100%) !important;
    }

    .paper-doll-gear-trinket {
      width: 20px !important;
      height: 20px !important;
      left: 94px !important;
      top: 100px !important;
      background: var(--gear-deep) !important;
      border: 5px solid var(--gear-accent) !important;
      transform: rotate(45deg) !important;
    }

    .paper-doll-gear-weapon {
      width: 11px !important;
      height: 142px !important;
      right: 35px !important;
      top: 67px !important;
      background: linear-gradient(90deg, var(--gear-deep), var(--gear-light) 45%, var(--gear-base)) !important;
      transform: rotate(22deg) !important;
      transform-origin: 50% 80% !important;
    }

    .paper-doll-gear-weapon.paper-doll-gear-bow,
    .paper-doll-gear-weapon.paper-doll-gear-longbow {
      width: 58px !important;
      height: 146px !important;
      right: 16px !important;
      top: 62px !important;
      background: transparent !important;
      border-right: 10px solid var(--gear-base) !important;
      border-radius: 0 80% 80% 0 !important;
    }

    .paper-doll-gear-weapon.paper-doll-gear-scythe {
      height: 152px !important;
    }

    .paper-doll-gear-weapon.paper-doll-gear-scythe::after {
      content: '' !important;
      position: absolute !important;
      width: 75px !important;
      height: 42px !important;
      left: 0 !important;
      top: -4px !important;
      border-top: 12px solid var(--gear-light) !important;
      border-radius: 70% 0 0 0 !important;
    }

    .paper-doll-gear-weapon.paper-doll-gear-staff,
    .paper-doll-gear-weapon.paper-doll-gear-branchstaff,
    .paper-doll-gear-weapon.paper-doll-gear-conduit {
      background: linear-gradient(90deg, var(--gear-deep), var(--gear-base), var(--gear-mid)) !important;
    }

    .paper-doll-gear-weapon.paper-doll-gear-staff::after,
    .paper-doll-gear-weapon.paper-doll-gear-branchstaff::after,
    .paper-doll-gear-weapon.paper-doll-gear-conduit::after {
      content: '' !important;
      position: absolute !important;
      width: 30px !important;
      height: 30px !important;
      left: -9px !important;
      top: -12px !important;
      background: var(--gear-deep) !important;
      border: 7px solid var(--gear-accent) !important;
      transform: rotate(45deg) !important;
    }

    .paper-doll-gear-weapon.paper-doll-gear-spiritfocus,
    .paper-doll-gear-weapon.paper-doll-gear-focusgauntlet,
    .paper-doll-gear-weapon.paper-doll-gear-reliquaryfocus {
      width: 46px !important;
      height: 46px !important;
      right: 18px !important;
      top: 96px !important;
      background: radial-gradient(circle at 40% 36%, var(--gear-light) 0 16%, var(--gear-mid) 17% 42%, var(--gear-deep) 43% 100%) !important;
      border: 6px solid var(--gear-accent) !important;
      border-radius: 50% !important;
      transform: rotate(0deg) !important;
      box-shadow: inset 0 0 0 5px var(--gear-base) !important;
    }

    .character-sheet-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
      height: calc(100% - 50px) !important;
      overflow: hidden !important;
    }

    .character-paper {
      overflow: hidden !important;
    }

    .sheet-stat-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 6px !important;
    }

    .sheet-stat {
      padding: 7px !important;
      min-height: 52px !important;
    }

    .skill-tree-summary {
      margin-bottom: 8px !important;
    }

    #skills[data-skills-subtab="trees"] > .progression-card-grid,
    #skills[data-skills-subtab="trees"] > .progression-card-grid + .card,
    #skills[data-skills-subtab="abilities"] > .progression-card-grid,
    #skills[data-skills-subtab="abilities"] > .progression-card-grid + .card {
      display: none !important;
    }

    #skills[data-skills-subtab="trees"] .skill-tree-summary {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 10px !important;
      align-items: center !important;
      padding: 10px !important;
    }

    #skills[data-skills-subtab="trees"] .skill-tree-summary .stat-row,
    #skills[data-skills-subtab="trees"] .skill-tree-summary .tree-bonus-list {
      display: none !important;
    }

    #skills[data-skills-subtab="trees"] .skill-tree-summary .tag {
      -webkit-line-clamp: 2 !important;
      overflow: hidden !important;
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
    }

    .skill-tree-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .bloodline-tree-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }

    .skill-tree-card {
      padding: 10px !important;
      margin-bottom: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .skill-tree-node-list {
      display: grid !important;
      gap: 6px !important;
      max-height: none !important;
      overflow: hidden !important;
    }

    .skill-tree-node {
      padding: 8px !important;
      min-height: 102px !important;
      align-items: start !important;
    }

    .skill-tree-node .tag {
      -webkit-line-clamp: 2 !important;
      overflow: hidden !important;
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
    }

    .node-gem {
      border-radius: 50% !important;
      border-color: rgba(217,173,79,0.52) !important;
      background:
        radial-gradient(circle at 32% 28%, rgba(255,255,255,0.42), transparent 25%),
        radial-gradient(circle, rgba(217,173,79,0.85), rgba(73,52,26,0.9)) !important;
    }

    .skill-sheet-list,
    .ability-sheet-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .skill-row-card,
    .ability-card {
      min-height: 150px !important;
      overflow: hidden !important;
    }

    .panel.open #skills.active,
    .panel.open #quests.active {
      overflow: hidden !important;
    }

    #skills[data-skills-subtab="trees"] {
      display: grid !important;
      grid-template-rows: auto auto minmax(0, 1fr) !important;
      gap: 8px !important;
      min-height: 0 !important;
    }

    .compact-tree-summary {
      margin-bottom: 0 !important;
      min-height: 0 !important;
    }

    .skill-tree-onepage {
      display: grid !important;
      grid-template-columns: 190px 300px minmax(0, 1fr) !important;
      gap: 10px !important;
      min-height: 0 !important;
      height: 100% !important;
      overflow: hidden !important;
    }

    .skill-tree-path-list,
    .skill-tree-node-index,
    .skill-tree-detail-pane {
      min-height: 0 !important;
      overflow: hidden !important;
      padding: 10px !important;
      margin-bottom: 0 !important;
    }

    .compact-path-group,
    .compact-node-list {
      display: grid !important;
      gap: 6px !important;
    }

    .compact-path-group + .compact-path-group {
      margin-top: 10px !important;
    }

    .compact-path-group > span,
    .quest-index-head span,
    .quest-detail-head span {
      color: #f0d596 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      font-size: 10px !important;
      font-weight: 900 !important;
    }

    .compact-path-button,
    .compact-node-button,
    .quest-title-button {
      border-radius: 3px !important;
      border: 1px solid rgba(84,82,94,0.86) !important;
      background: linear-gradient(180deg, rgba(34,35,45,0.96), rgba(12,12,19,0.96)) !important;
      color: #d9d0bf !important;
      text-align: left !important;
      cursor: pointer !important;
      min-width: 0 !important;
    }

    .compact-path-button {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 6px !important;
      padding: 8px !important;
    }

    .compact-node-button {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 8px !important;
      padding: 8px 9px !important;
      min-height: 38px !important;
    }

    .compact-path-button b,
    .compact-node-button span,
    .quest-title-button b {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .compact-path-button span,
    .compact-node-button b,
    .quest-title-button span,
    .quest-title-button em {
      color: #9facbf !important;
      font-size: 10px !important;
      font-style: normal !important;
      font-weight: 900 !important;
    }

    .compact-path-button.active,
    .compact-node-button.active,
    .quest-title-button.active,
    .compact-path-button:hover,
    .compact-node-button:hover,
    .quest-title-button:hover {
      color: #f4dfaa !important;
      border-color: rgba(217,173,79,0.72) !important;
      background: linear-gradient(180deg, rgba(83,70,49,0.96), rgba(31,25,22,0.96)) !important;
    }

    .compact-path-button.locked,
    .compact-node-button.locked {
      opacity: 0.68 !important;
    }

    .compact-node-button.learned {
      border-color: rgba(115,209,138,0.54) !important;
    }

    .compact-node-button.available {
      border-color: rgba(217,173,79,0.72) !important;
    }

    .skill-tree-detail-pane {
      display: grid !important;
      grid-template-rows: auto auto auto auto auto 42px !important;
      gap: 8px !important;
    }

    .detail-title-row,
    .quest-detail-head,
    .quest-index-head {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
    }

    .detail-copy,
    .quest-detail-copy {
      display: -webkit-box !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }

    .detail-bonus-list {
      max-height: 78px !important;
      overflow: hidden !important;
    }

    .tree-learn-button {
      justify-self: stretch !important;
      align-self: end !important;
      border-radius: 3px !important;
      border: 1px solid rgba(217,173,79,0.7) !important;
      background: linear-gradient(180deg, rgba(83,70,49,0.96), rgba(31,25,22,0.96)) !important;
      color: #f4dfaa !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .tree-learn-button:disabled {
      opacity: 0.5 !important;
      border-color: rgba(84,82,94,0.86) !important;
    }

    .quest-onepage-card {
      height: 100% !important;
      overflow: hidden !important;
      margin-bottom: 0 !important;
    }

    .quest-onepage-layout {
      display: grid !important;
      grid-template-columns: 300px minmax(0, 1fr) !important;
      gap: 12px !important;
      height: calc(100% - 34px) !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .quest-title-index,
    .quest-detail-pane {
      min-height: 0 !important;
      overflow: hidden !important;
      border: 1px solid rgba(84,82,94,0.86) !important;
      border-radius: 3px !important;
      background: rgba(7,8,14,0.36) !important;
      padding: 10px !important;
    }

    .quest-title-index {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) auto !important;
      gap: 8px !important;
    }

    .quest-title-list {
      display: grid !important;
      grid-template-rows: repeat(12, minmax(0, 1fr)) !important;
      gap: 6px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .quest-title-button {
      display: grid !important;
      grid-template-columns: 70px minmax(0, 1fr) 54px !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 7px 8px !important;
      min-height: 0 !important;
    }

    .quest-title-button.completed {
      opacity: 0.72 !important;
    }

    .quest-detail-pane {
      display: grid !important;
      grid-template-rows: auto auto minmax(58px, auto) auto minmax(0, 1fr) !important;
      gap: 9px !important;
    }

    .quest-detail-pane h3 {
      margin-bottom: 0 !important;
    }

    .quest-objectives.compact {
      display: grid !important;
      gap: 6px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      align-content: start !important;
      padding-right: 4px !important;
    }

    .quest-objective {
      display: grid !important;
      grid-template-columns: 18px minmax(0, 1fr) auto !important;
      align-items: start !important;
      gap: 8px !important;
      min-height: 26px !important;
      overflow: visible !important;
    }

    .quest-objective-copy {
      display: grid !important;
      gap: 3px !important;
      min-width: 0 !important;
    }

    .quest-objective-label {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .quest-objective-source {
      color: #9facbf !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
      white-space: normal !important;
    }

    .quest-objective-source strong {
      color: #d9ad4f !important;
      font-weight: 900 !important;
    }

    .quest-objective-progress {
      white-space: nowrap !important;
    }

    .quest-page-controls {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .quest-page-controls button {
      min-height: 34px !important;
      border-radius: 3px !important;
      border: 1px solid rgba(84,82,94,0.86) !important;
      background: rgba(12,12,19,0.96) !important;
      color: #f0d596 !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .quest-empty-state {
      height: calc(100% - 40px) !important;
      display: grid !important;
      place-content: center !important;
      text-align: center !important;
    }

    .quest-card {
      margin-bottom: 8px !important;
    }

    .log-lines {
      max-height: none !important;
      overflow: hidden !important;
    }

    .game-ui-controller-focus {
      outline: 2px solid rgba(255,220,138,0.98) !important;
      outline-offset: 2px !important;
      box-shadow:
        0 0 0 4px rgba(0,0,0,0.68),
        0 0 22px rgba(217,173,79,0.48),
        inset 0 0 18px rgba(217,173,79,0.16) !important;
    }

    @media (max-width: 1120px) {
      .inventory-browser-layout {
        grid-template-columns: minmax(230px, 36%) minmax(0, 1fr) !important;
      }

      .inventory-grid.inventory-slot-grid,
      .inventory-grid.inventory-slot-grid.compact,
      .recipe-grid,
      .skill-tree-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .equipment-grid,
      .sheet-stat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 760px) {
      .inventory-browser-layout {
        grid-template-columns: 1fr !important;
        grid-template-rows: minmax(190px, 40%) minmax(0, 1fr) !important;
        min-height: calc(100vh - 220px) !important;
        max-height: calc(100vh - 220px) !important;
      }

      .inventory-detail-content {
        padding: 12px !important;
      }

      .inventory-detail-pane .stat-row {
        gap: 8px !important;
      }

      .skill-tree-grid,
      .skill-sheet-list,
      .ability-sheet-grid,
      .paper-doll-layout {
        grid-template-columns: 1fr !important;
      }

      .skill-tree-node {
        min-height: 88px !important;
      }

      .paper-doll-frame {
        display: none !important;
      }

      .paper-doll-side {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .paper-doll-center {
        display: none !important;
      }

      .equipment-slot.compact {
        min-height: 76px !important;
        padding: 6px !important;
      }

      .equipment-slot.compact .item-icon {
        width: 28px !important;
        height: 28px !important;
        font-size: 12px !important;
      }

      .equipment-slot.compact .equipment-slot-frame {
        min-height: 30px !important;
      }

      .equipment-slot.compact .compact-stats,
      .equipment-slot.compact .equipment-slot-actions {
        display: none !important;
      }
    }

    /* -------------------------------------------------------------------------
       SCROLLBARS
       ------------------------------------------------------------------------- */

    .tab-panel::-webkit-scrollbar,
    .log-lines::-webkit-scrollbar {
      width: 8px !important;
    }

    .tab-panel::-webkit-scrollbar-thumb,
    .log-lines::-webkit-scrollbar-thumb {
      background: rgba(139, 166, 214, 0.25) !important;
      border-radius: 999px !important;
    }

    /* -------------------------------------------------------------------------
       QUIET GAMEPLAY HUD
       ------------------------------------------------------------------------- */

    .panel .tabs {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    .panel.menu-chooser {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      max-width: none !important;
      max-height: none !important;
      pointer-events: none !important;
      z-index: 82 !important;
    }

    .panel.menu-chooser .tabs {
      position: fixed !important;
      left: 34px !important;
      right: auto !important;
      top: 50% !important;
      bottom: auto !important;
      transform: translateY(-50%) !important;
      width: auto !important;
      display: grid !important;
      visibility: visible !important;
      pointer-events: auto !important;
      grid-template-columns: 1fr !important;
      gap: 7px !important;
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .panel.menu-chooser .tab {
      min-width: 0 !important;
      min-height: 0 !important;
      justify-content: flex-start !important;
      padding: 2px 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: #fff !important;
      font-size: 18px !important;
      text-align: left !important;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000,
        0 2px 7px #000 !important;
      transition: color 100ms ease, transform 100ms ease, font-size 100ms ease !important;
    }

    .panel.menu-chooser .tab:hover,
    .panel.menu-chooser .tab:focus,
    .panel.menu-chooser .tab.game-ui-controller-focus {
      color: #efc65d !important;
      font-size: 22px !important;
      transform: translateX(7px) !important;
      outline: 0 !important;
    }

    /* Couch co-op menus stay on the side owned by the player who opened them. */
    .panel .menu-owner-badge {
      position: fixed !important;
      top: 52px !important;
      right: 24px !important;
      z-index: 10005 !important;
      pointer-events: none !important;
      padding: 5px 9px !important;
      border: 1px solid rgba(255,204,102,0.48) !important;
      background: rgba(3,6,12,0.82) !important;
      color: #ffeeb5 !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      letter-spacing: 0 !important;
      text-transform: uppercase !important;
      text-shadow: 0 2px 6px rgba(0,0,0,0.92) !important;
      box-shadow: 0 0 18px rgba(0,0,0,0.45) !important;
    }

    body.couch-coop-active .panel[data-owner-slot="1"] .menu-owner-badge,
    body.couch-coop-active .panel[data-owner-slot="3"] .menu-owner-badge {
      left: 24px !important;
      right: auto !important;
    }

    body.couch-coop-active .panel[data-owner-slot="2"] .menu-owner-badge,
    body.couch-coop-active .panel[data-owner-slot="4"] .menu-owner-badge {
      left: auto !important;
      right: 24px !important;
    }

    .panel[data-owner-slot="2"].menu-chooser .tabs,
    .panel[data-owner-slot="4"].menu-chooser .tabs {
      left: calc(50vw + 28px) !important;
    }

    .panel[data-owner-slot="2"].open #inventory.active,
    .panel[data-owner-slot="2"].open #skills.active,
    .panel[data-owner-slot="2"].open #character.active,
    .panel[data-owner-slot="2"].open #quests.active,
    .panel[data-owner-slot="2"].open #log.active,
    .panel[data-owner-slot="4"].open #inventory.active,
    .panel[data-owner-slot="4"].open #skills.active,
    .panel[data-owner-slot="4"].open #character.active,
    .panel[data-owner-slot="4"].open #quests.active,
    .panel[data-owner-slot="4"].open #log.active {
      left: calc(50vw + 12px) !important;
      right: 12px !important;
      width: auto !important;
      max-width: calc(50vw - 24px) !important;
    }

    body.couch-coop-active .panel[data-owner-slot="1"].open #inventory.active,
    body.couch-coop-active .panel[data-owner-slot="1"].open #skills.active,
    body.couch-coop-active .panel[data-owner-slot="1"].open #character.active,
    body.couch-coop-active .panel[data-owner-slot="1"].open #quests.active,
    body.couch-coop-active .panel[data-owner-slot="1"].open #log.active,
    body.couch-coop-active .panel[data-owner-slot="3"].open #inventory.active,
    body.couch-coop-active .panel[data-owner-slot="3"].open #skills.active,
    body.couch-coop-active .panel[data-owner-slot="3"].open #character.active,
    body.couch-coop-active .panel[data-owner-slot="3"].open #quests.active,
    body.couch-coop-active .panel[data-owner-slot="3"].open #log.active {
      left: 12px !important;
      right: calc(50vw + 12px) !important;
      width: auto !important;
      max-width: calc(50vw - 24px) !important;
    }

    .market-shop-overlay[data-owner-slot="2"],
    .fishing-mini-game-overlay[data-owner-slot="2"],
    .character-creator-overlay[data-owner-slot="2"],
    .couch-coop-join-overlay[data-owner-slot="2"],
    .market-shop-overlay[data-owner-slot="4"],
    .fishing-mini-game-overlay[data-owner-slot="4"],
    .character-creator-overlay[data-owner-slot="4"],
    .couch-coop-join-overlay[data-owner-slot="4"] {
      left: 50vw !important;
      right: 0 !important;
      width: 50vw !important;
      padding: 12px !important;
    }

    body.couch-coop-active .market-shop-overlay[data-owner-slot="1"],
    body.couch-coop-active .fishing-mini-game-overlay[data-owner-slot="1"],
    body.couch-coop-active .character-creator-overlay[data-owner-slot="1"],
    body.couch-coop-active .market-shop-overlay[data-owner-slot="3"],
    body.couch-coop-active .fishing-mini-game-overlay[data-owner-slot="3"],
    body.couch-coop-active .character-creator-overlay[data-owner-slot="3"] {
      left: 0 !important;
      right: 50vw !important;
      width: 50vw !important;
      padding: 12px !important;
    }

    .market-shop-overlay[data-owner-slot="2"] .market-shop-panel,
    .character-creator-overlay[data-owner-slot="2"] .character-creator-panel,
    .couch-coop-join-overlay[data-owner-slot="2"] .coop-join-panel,
    .market-shop-overlay[data-owner-slot="4"] .market-shop-panel,
    .character-creator-overlay[data-owner-slot="4"] .character-creator-panel,
    .couch-coop-join-overlay[data-owner-slot="4"] .coop-join-panel {
      width: 100% !important;
      max-width: calc(50vw - 24px) !important;
    }

    body.couch-coop-active .market-shop-overlay[data-owner-slot="1"] .market-shop-panel,
    body.couch-coop-active .character-creator-overlay[data-owner-slot="1"] .character-creator-panel,
    body.couch-coop-active .market-shop-overlay[data-owner-slot="3"] .market-shop-panel,
    body.couch-coop-active .character-creator-overlay[data-owner-slot="3"] .character-creator-panel {
      width: 100% !important;
      max-width: calc(50vw - 24px) !important;
    }

    body.couch-coop-active .market-shop-overlay[data-owner-slot] {
      left: var(--owner-viewport-left, 0vw) !important;
      top: var(--owner-viewport-top, 0vh) !important;
      right: auto !important;
      bottom: auto !important;
      width: var(--owner-viewport-width, 100vw) !important;
      height: var(--owner-viewport-height, 100vh) !important;
      padding: 8px !important;
    }

    body.couch-coop-active .market-shop-overlay[data-owner-slot] .market-shop-panel {
      width: 100% !important;
      max-width: none !important;
      height: 100% !important;
      max-height: none !important;
    }

    .character-creator-overlay[data-owner-slot="2"] .character-creator-panel,
    .character-creator-overlay[data-owner-slot="4"] .character-creator-panel,
    body.couch-coop-active .character-creator-overlay[data-owner-slot="1"] .character-creator-panel,
    body.couch-coop-active .character-creator-overlay[data-owner-slot="3"] .character-creator-panel {
      grid-template-columns: 1fr !important;
      overflow: auto !important;
    }

    #unitFramesHud {
      filter: none !important;
      width: 350px !important;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000,
        0 2px 6px rgba(0,0,0,0.96) !important;
    }

    .unit-frame,
    .unit-frame.player-unit-frame,
    .unit-frame.summon-unit-frame {
      padding: 4px 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .unit-frame.player-unit-frame {
      padding: 9px 11px !important;
      border-radius: 6px !important;
      background: rgba(5, 9, 15, 0.46) !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18) !important;
      backdrop-filter: blur(3px) !important;
      -webkit-backdrop-filter: blur(3px) !important;
    }

    .unit-portrait,
    .summon-unit-frame .unit-portrait {
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      text-shadow: 0 2px 6px #000 !important;
    }

    .empty-party-frame {
      margin-left: 0 !important;
      padding: 1px 0 1px 62px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: rgba(255,255,255,0.62) !important;
      text-shadow: 0 2px 5px #000 !important;
    }

    .panel.open #inventory.active,
    .panel.open #skills.active,
    .panel.open #character.active,
    .panel.open #quests.active,
    .panel.open #log.active {
      bottom: 16px !important;
    }

    #combatSkillHud {
      left: auto !important;
      right: 18px !important;
      bottom: 18px !important;
      width: auto !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      filter: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000,
        0 2px 5px rgba(0,0,0,0.95) !important;
    }

    .combat-hud-title {
      justify-content: flex-end !important;
      gap: 12px !important;
      margin: 0 0 6px !important;
      color: rgba(255,255,255,0.78) !important;
    }

    .combat-hud-slots {
      display: grid !important;
      grid-template-columns: repeat(5, 62px) !important;
      gap: 7px !important;
    }

    .combat-hud-slot,
    .combat-hud-slot.ready,
    .combat-hud-slot.locked {
      position: relative !important;
      width: 62px !important;
      height: 62px !important;
      min-height: 62px !important;
      padding: 0 !important;
      border: 1px solid rgba(255,255,255,0.3) !important;
      border-radius: 5px !important;
      background: rgba(6, 10, 17, 0.62) !important;
      box-shadow:
        inset 0 1px rgba(255,255,255,0.08),
        0 5px 15px rgba(0,0,0,0.28) !important;
      display: block !important;
      opacity: 1 !important;
      overflow: hidden !important;
    }

    .combat-hud-slot.ready {
      border-color: rgba(239,198,93,0.7) !important;
    }

    .combat-hud-slot.locked {
      opacity: 0.52 !important;
      border-color: rgba(255,255,255,0.18) !important;
      background: rgba(6, 10, 17, 0.42) !important;
    }

    .combat-hud-key {
      position: absolute !important;
      right: 4px !important;
      bottom: 3px !important;
      z-index: 5 !important;
      width: auto !important;
      height: auto !important;
      display: block !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: #efc65d !important;
      text-align: right !important;
      font-size: 9px !important;
      line-height: 1 !important;
    }

    .combat-hud-icon {
      position: absolute !important;
      inset: 0 !important;
      z-index: 1 !important;
      display: grid !important;
      place-items: center !important;
      color: #fff !important;
      font-size: 18px !important;
      font-weight: 950 !important;
      letter-spacing: 0 !important;
      text-shadow: 0 2px 6px #000 !important;
    }

    .combat-hud-body {
      display: none !important;
    }

    .combat-hud-body b {
      color: #fff !important;
      font-size: 12px !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .combat-hud-body span {
      display: none !important;
    }

    .combat-hud-cooldown {
      position: absolute !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 3 !important;
      display: block !important;
      background: rgba(0,0,0,0.7) !important;
      pointer-events: none !important;
    }

    .combat-hud-cd-text {
      position: absolute !important;
      inset: 0 !important;
      z-index: 4 !important;
      display: grid !important;
      place-items: center !important;
      color: #fff !important;
      font-size: 16px !important;
      font-weight: 900 !important;
      text-shadow: 0 2px 6px #000 !important;
    }

    .combat-hud-charge-text {
      position: absolute !important;
      top: 3px !important;
      right: 3px !important;
      z-index: 6 !important;
      min-width: 20px !important;
      padding: 2px 4px !important;
      border: 1px solid rgba(239,198,93,0.72) !important;
      background: rgba(3,5,9,0.9) !important;
      color: #ffe7a3 !important;
      font-size: 9px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
      text-align: center !important;
      text-shadow: 0 1px 3px #000 !important;
      pointer-events: none !important;
    }

    .combat-hud-charge-recharge {
      position: absolute !important;
      left: 0 !important;
      bottom: 0 !important;
      z-index: 7 !important;
      height: 3px !important;
      max-width: 100% !important;
      background: #ffe7a3 !important;
      box-shadow: 0 0 5px rgba(239,198,93,0.7) !important;
      pointer-events: none !important;
    }

    #runalisMinimapHud {
      position: fixed !important;
      top: 18px !important;
      right: 18px !important;
      z-index: 52 !important;
      width: min(calc(var(--runalis-minimap-size, 204px) + 20px), calc(100vw - 36px)) !important;
      color: #fff !important;
      pointer-events: none !important;
      letter-spacing: 0 !important;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000,
        0 2px 6px #000 !important;
    }

    .runalis-minimap-frame {
      position: relative !important;
      display: grid !important;
      gap: 6px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 9px !important;
      background: linear-gradient(180deg, rgba(5,7,10,0.72), rgba(5,7,10,0.42)) !important;
      border: 1px solid rgba(255, 241, 184, 0.25) !important;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.34) !important;
      clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px) !important;
    }

    .runalis-minimap-title {
      display: flex !important;
      align-items: baseline !important;
      justify-content: space-between !important;
      gap: 8px !important;
      min-width: 0 !important;
      color: rgba(255,255,255,0.82) !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .runalis-minimap-title b,
    .runalis-minimap-title span {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      min-width: 0 !important;
    }

    .runalis-minimap-title b {
      color: var(--hud-accent-bright, #fff1b8) !important;
      max-width: 132px !important;
    }

    .runalis-minimap-title span {
      color: rgba(255,255,255,0.62) !important;
      flex: 0 0 auto !important;
    }

    #runalisMinimapCanvas {
      pointer-events: auto !important;
      display: block !important;
      width: var(--runalis-minimap-size, 204px) !important;
      height: var(--runalis-minimap-size, 204px) !important;
      max-width: 100% !important;
      background: rgba(0,0,0,0.58) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      box-shadow: inset 0 0 18px rgba(0,0,0,0.66) !important;
    }

    #trackedQuestHud {
      position: fixed !important;
      top: calc(18px + var(--runalis-minimap-size, 204px) + 54px) !important;
      right: 18px !important;
      z-index: 52 !important;
      width: min(340px, calc(100vw - 36px)) !important;
      color: #fff !important;
      text-align: right !important;
      pointer-events: none !important;
      letter-spacing: 0 !important;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000,
        0 2px 6px #000 !important;
    }

    #trackedQuestHud > b {
      display: block !important;
      margin-bottom: 5px !important;
      color: #fff !important;
      font-size: 18px !important;
    }

    .tracked-quest-objectives {
      display: grid !important;
      gap: 3px !important;
      color: rgba(255,255,255,0.88) !important;
      font-size: 14px !important;
      line-height: 1.3 !important;
    }

    .tracked-quest-empty {
      color: rgba(255,255,255,0.6) !important;
      font-size: 14px !important;
    }

    .quest-track-hint {
      margin: 3px 0 10px !important;
      color: #efc65d !important;
      font-size: 10px !important;
      font-weight: 800 !important;
    }

    /* -------------------------------------------------------------------------
       PHASE 6 - FINAL DARK-FANTASY COHESION
       ------------------------------------------------------------------------- */

    body {
      --hud-accent: #d5ad55;
      --hud-accent-bright: #f0d987;
      --hud-accent-soft: rgba(213, 173, 85, 0.18);
      --hud-ink: rgba(5, 6, 9, 0.86);
      --hud-line: rgba(213, 173, 85, 0.38);
    }

    body[data-runalis-class="oathkeeper"],
    body[data-runalis-class="templar"] {
      --hud-accent: #d5ad55;
      --hud-accent-bright: #fff1b8;
      --hud-accent-soft: rgba(213, 173, 85, 0.20);
      --hud-line: rgba(213, 173, 85, 0.48);
    }

    body[data-runalis-class="fellhunter"],
    body[data-runalis-class="mercenary"] {
      --hud-accent: #c65f38;
      --hud-accent-bright: #f4b36c;
      --hud-accent-soft: rgba(198, 95, 56, 0.20);
      --hud-line: rgba(198, 95, 56, 0.50);
    }

    body[data-runalis-class="gravecaller"],
    body[data-runalis-class="necromancer"] {
      --hud-accent: #a86bd6;
      --hud-accent-bright: #e3cef2;
      --hud-accent-soft: rgba(168, 107, 214, 0.20);
      --hud-line: rgba(168, 107, 214, 0.50);
    }

    body[data-runalis-class="thornbinder"] {
      --hud-accent: #7e9d58;
      --hud-accent-bright: #d8d59a;
      --hud-accent-soft: rgba(126, 157, 88, 0.20);
      --hud-line: rgba(126, 157, 88, 0.50);
    }

    body[data-runalis-class="waverider"],
    body[data-runalis-class="hydromancer"] {
      --hud-accent: #59d7e8;
      --hud-accent-bright: #d7fbfa;
      --hud-accent-soft: rgba(89, 215, 232, 0.20);
      --hud-line: rgba(89, 215, 232, 0.50);
    }

    body[data-runalis-class="lightbringer"] {
      --hud-accent: #d9ad4f;
      --hud-accent-bright: #fff1b8;
      --hud-accent-soft: rgba(255, 241, 184, 0.20);
      --hud-line: rgba(217, 173, 79, 0.52);
    }

    body[data-runalis-class="eldritch"] {
      --hud-accent: #d73545;
      --hud-accent-bright: #ff9099;
      --hud-accent-soft: rgba(215, 53, 69, 0.22);
      --hud-line: rgba(215, 53, 69, 0.54);
    }

    .panel.open .tab-panel.active {
      border: 1px solid var(--hud-line) !important;
      border-radius: 2px !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.025), transparent 22%),
        rgba(7, 9, 13, 0.94) !important;
      clip-path: polygon(
        0 0,
        calc(100% - 16px) 0,
        100% 16px,
        100% 100%,
        16px 100%,
        0 calc(100% - 16px)
      ) !important;
      box-shadow:
        0 26px 90px rgba(0,0,0,0.70),
        inset 0 1px rgba(255,255,255,0.04) !important;
    }

    .card,
    .slot,
    .slot-card,
    .recipe-card,
    .equipment-slot,
    .inventory-card,
    .ability-card,
    .skill-card,
    .quest-card,
    .skill {
      border-radius: 2px !important;
      border-color: rgba(235,238,240,0.10) !important;
      border-left: 2px solid var(--hud-line) !important;
      background: rgba(13, 15, 20, 0.62) !important;
      box-shadow: inset 0 1px rgba(255,255,255,0.025) !important;
    }

    .card h2,
    .card h3,
    .equipment-slot-header {
      color: var(--hud-accent-bright) !important;
      text-shadow: 0 2px 5px rgba(0,0,0,0.82) !important;
    }

    .panel button,
    .pause-card button,
    .subtab,
    .tab {
      border-radius: 2px !important;
    }

    .panel button:hover,
    .panel button:focus-visible,
    .pause-card button:hover,
    .pause-card button:focus-visible,
    .subtab:hover,
    .subtab.active,
    .panel .game-ui-controller-focus {
      border-color: var(--hud-accent) !important;
      color: var(--hud-accent-bright) !important;
      box-shadow:
        inset 3px 0 var(--hud-accent),
        0 7px 22px rgba(0,0,0,0.24) !important;
    }

    .unit-frame.player-unit-frame {
      position: relative !important;
      padding: 10px 12px 10px 14px !important;
      border: 0 !important;
      border-left: 2px solid var(--hud-accent) !important;
      border-radius: 0 !important;
      background:
        linear-gradient(90deg, rgba(5,7,10,0.78), rgba(5,7,10,0.48) 74%, transparent) !important;
      clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%) !important;
      box-shadow: none !important;
    }

    .unit-frame.player-unit-frame::before {
      content: "" !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 94px !important;
      height: 1px !important;
      background: var(--hud-accent) !important;
      opacity: 0.72 !important;
    }

    .unit-frame.player-unit-frame .unit-portrait {
      color: var(--hud-accent-bright) !important;
      text-shadow:
        0 2px 4px #000,
        0 0 10px var(--hud-accent-soft) !important;
    }

    .unit-title-row b,
    .unit-level-row b {
      color: var(--hud-accent-bright) !important;
    }

    .unit-bar {
      height: 7px !important;
      border-radius: 0 !important;
      border-color: rgba(255,255,255,0.13) !important;
      background: rgba(1,2,4,0.75) !important;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.8) !important;
    }

    .unit-bar > div {
      position: relative !important;
      border-radius: 0 !important;
      box-shadow: inset 0 1px rgba(255,255,255,0.35) !important;
    }

    .unit-bar > div::after {
      content: "" !important;
      position: absolute !important;
      inset: 1px 1px auto 1px !important;
      height: 1px !important;
      background: rgba(255,255,255,0.32) !important;
    }

    .party-frame-list {
      border-left: 1px solid rgba(255,255,255,0.12) !important;
      margin-left: 15px !important;
      padding-left: 8px !important;
    }

    #combatSkillHud {
      --slot-size: 62px;
    }

    .combat-hud-title b {
      color: var(--hud-accent-bright) !important;
    }

    .combat-hud-slot,
    .combat-hud-slot.ready,
    .combat-hud-slot.locked {
      border-radius: 0 !important;
      border-color: rgba(255,255,255,0.22) !important;
      background: rgba(5,7,10,0.78) !important;
      clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px)) !important;
      box-shadow:
        inset 0 0 0 1px rgba(0,0,0,0.72),
        0 6px 18px rgba(0,0,0,0.34) !important;
    }

    .combat-hud-slot.ready {
      border-color: var(--hud-line) !important;
      box-shadow:
        inset 0 2px var(--hud-accent),
        inset 0 0 0 1px rgba(0,0,0,0.72),
        0 7px 20px rgba(0,0,0,0.38) !important;
    }

    .combat-hud-slot.ready::before {
      content: "" !important;
      position: absolute !important;
      left: 5px !important;
      top: 5px !important;
      width: 10px !important;
      height: 2px !important;
      z-index: 2 !important;
      background: var(--hud-accent) !important;
      opacity: 0.72 !important;
    }

    .combat-hud-icon {
      color: var(--hud-accent-bright) !important;
      font-size: 17px !important;
      letter-spacing: 0.03em !important;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000 !important;
    }

    .combat-hud-key {
      color: var(--hud-accent-bright) !important;
    }

    .combat-hud-cooldown {
      background:
        repeating-linear-gradient(
          0deg,
          rgba(1,2,4,0.86) 0,
          rgba(1,2,4,0.86) 5px,
          rgba(12,14,18,0.84) 5px,
          rgba(12,14,18,0.84) 7px
        ) !important;
      border-top: 1px solid var(--hud-accent) !important;
    }

    #trackedQuestHud {
      padding: 10px 12px 10px 28px !important;
      background:
        linear-gradient(270deg, rgba(5,7,10,0.66), rgba(5,7,10,0.25) 72%, transparent) !important;
      clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px) !important;
    }

    #trackedQuestHud::after {
      content: "" !important;
      position: absolute !important;
      top: 0 !important;
      right: 0 !important;
      width: 76px !important;
      height: 1px !important;
      background: var(--hud-accent) !important;
      opacity: 0.75 !important;
    }

    #trackedQuestHud > b {
      color: var(--hud-accent-bright) !important;
    }

    .tracked-quest-objectives span::before {
      content: "›" !important;
      color: var(--hud-accent) !important;
      margin-right: 5px !important;
    }

    body.runalis-low-health .unit-frame.player-unit-frame {
      border-left-color: #d86a4a !important;
    }

    body.runalis-low-health .unit-bar.hp {
      border-color: rgba(216,106,74,0.62) !important;
    }

    /* -------------------------------------------------------------------------
       RESPONSIVE
       ------------------------------------------------------------------------- */

    .progression-bumper-hint {
      margin-left: auto !important;
      align-self: center !important;
      color: #9facbf !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .branching-skill-tree {
      display: grid !important;
      align-content: start !important;
      justify-items: stretch !important;
      gap: 4px !important;
      min-height: 0 !important;
      max-height: calc(100% - 54px) !important;
      overflow-y: auto !important;
      padding: 5px 3px 12px !important;
    }

    .tree-branch-row {
      display: flex !important;
      justify-content: center !important;
      gap: 8px !important;
      position: relative !important;
    }

    .tree-branch-row .compact-node-button {
      width: min(100%, 225px) !important;
      flex: 1 1 0 !important;
      white-space: normal !important;
    }

    .tree-branch-row .compact-node-button span {
      white-space: normal !important;
    }

    .tree-connection-spine {
      width: 2px !important;
      height: 13px !important;
      justify-self: center !important;
      background: rgba(159,172,191,0.52) !important;
      position: relative !important;
    }

    .tree-connection-spine.merge::after {
      content: '' !important;
      position: absolute !important;
      width: 72px !important;
      height: 1px !important;
      left: -35px !important;
      top: 3px !important;
      background: rgba(217,173,79,0.62) !important;
    }

    #skills[data-skills-subtab="abilities"] {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      gap: 8px !important;
      min-height: 0 !important;
    }

    .ability-management-onepage {
      display: grid !important;
      grid-template-columns: 180px 300px minmax(0, 1fr) !important;
      grid-template-rows: minmax(0, 1fr) auto !important;
      gap: 10px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .ability-category-pane,
    .ability-pool-pane,
    .ability-detail-pane,
    .ability-hotbar-pane {
      min-height: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }

    .ability-category-list,
    .ability-pool-list {
      display: grid !important;
      gap: 6px !important;
      align-content: start !important;
      max-height: calc(100% - 62px) !important;
      overflow-y: auto !important;
    }

    .ability-pool-button {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 8px !important;
      align-items: center !important;
      padding: 9px !important;
      border: 1px solid rgba(84,82,94,0.86) !important;
      border-radius: 3px !important;
      background: rgba(12,12,19,0.9) !important;
      color: #d9d0bf !important;
      text-align: left !important;
    }

    .ability-pool-button span {
      display: grid !important;
      gap: 2px !important;
    }

    .ability-pool-button em,
    .ability-hotbar-slot em {
      color: #9facbf !important;
      font-size: 10px !important;
      font-style: normal !important;
    }

    .ability-pool-button strong {
      color: #f0d596 !important;
      font-size: 10px !important;
    }

    .ability-pool-button.active,
    .ability-pool-button:hover,
    .ability-pool-button.game-ui-controller-focus {
      border-color: rgba(217,173,79,0.78) !important;
      background: rgba(73,58,35,0.92) !important;
      color: #f4dfaa !important;
    }

    .ability-pool-button.unavailable,
    .ability-hotbar-slot.unavailable {
      opacity: 0.68 !important;
    }

    .ability-detail-pane {
      display: grid !important;
      align-content: start !important;
      gap: 8px !important;
    }

    .ability-hotbar-pane {
      grid-column: 1 / -1 !important;
      display: grid !important;
      grid-template-columns: minmax(180px, 0.7fr) minmax(0, 2fr) !important;
      gap: 10px !important;
      align-items: center !important;
    }

    .ability-hotbar-row {
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .ability-hotbar-slot {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 5px !important;
    }

    .ability-hotbar-assign,
    .ability-hotbar-clear {
      border: 1px solid rgba(217,173,79,0.52) !important;
      border-radius: 3px !important;
      background: rgba(17,17,24,0.94) !important;
      color: #f4dfaa !important;
    }

    .ability-hotbar-assign {
      display: grid !important;
      grid-template-columns: auto minmax(0, 1fr) !important;
      gap: 4px 8px !important;
      text-align: left !important;
      padding: 8px !important;
    }

    .ability-hotbar-assign em {
      grid-column: 1 / -1 !important;
    }

    .ability-hotbar-clear {
      padding: 6px !important;
      color: #d98b8b !important;
    }

    @media (max-width: 900px) {
      .panel {
        left: 12px !important;
        right: 12px !important;
        bottom: 12px !important;
        top: auto !important;
        width: auto !important;
      }

      .panel .tabs {
        display: none !important;
      }

      .panel.menu-chooser .tabs {
        left: 20px !important;
        right: auto !important;
        top: 50% !important;
        bottom: auto !important;
        width: auto !important;
      }

      .panel.open #inventory.active,
      .panel.open #skills.active,
      .panel.open #character.active,
      .panel.open #quests.active,
      .panel.open #log.active {
        left: 12px !important;
        right: 12px !important;
        top: 96px !important;
        bottom: 12px !important;
        width: auto !important;
      }

      #unitFramesHud {
        width: min(330px, calc(100vw - 24px)) !important;
      }

      #combatSkillHud {
        right: 12px !important;
        bottom: 12px !important;
        width: auto !important;
      }

      #runalisMinimapHud {
        top: 12px !important;
        right: 12px !important;
        width: min(calc(var(--runalis-minimap-size, 156px) + 16px), calc(100vw - 24px)) !important;
      }

      .runalis-minimap-frame {
        padding: 7px !important;
        gap: 5px !important;
      }

      .runalis-minimap-title {
        font-size: 9px !important;
      }

      .runalis-minimap-title b {
        max-width: 98px !important;
      }

      .character-sheet-grid,
      .ability-sheet-grid,
      .equipment-grid,
      .inventory-grid,
      .recipe-grid {
        grid-template-columns: 1fr !important;
      }

      .combat-hud-slots {
        grid-template-columns: repeat(5, 54px) !important;
        gap: 5px !important;
      }

      .combat-hud-slot,
      .combat-hud-slot.ready,
      .combat-hud-slot.locked {
        width: 54px !important;
        height: 54px !important;
        min-height: 54px !important;
      }

      #trackedQuestHud {
        top: calc(12px + var(--runalis-minimap-size, 156px) + 46px) !important;
        right: 12px !important;
        width: min(292px, calc(100vw - 24px)) !important;
      }

      #character .subtab-bar,
      #character.active .subtab-bar {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    /* -------------------------------------------------------------------------
       MODERN IN-GAME MENU WORKSPACES
       HUD and title-screen presentation intentionally remain untouched.
       ------------------------------------------------------------------------- */

    body {
      --menu-glass: rgba(7, 9, 13, 0.84);
      --menu-glass-soft: rgba(15, 18, 24, 0.54);
      --menu-glass-faint: rgba(255, 255, 255, 0.025);
      --menu-rule: rgba(235, 238, 240, 0.12);
      --menu-rule-strong: var(--hud-line);
      --menu-text: #edf0f2;
      --menu-muted: #98a1ad;
    }

    body:not(.couch-coop-active) .panel.open #inventory.active,
    body:not(.couch-coop-active) .panel.open #skills.active,
    body:not(.couch-coop-active) .panel.open #character.active {
      left: max(20px, calc(50vw - 590px)) !important;
      right: max(20px, calc(50vw - 590px)) !important;
      top: 54px !important;
      bottom: 76px !important;
      width: auto !important;
    }

    body:not(.couch-coop-active) .panel.open #quests.active,
    body:not(.couch-coop-active) .panel.open #log.active {
      left: max(20px, calc(50vw - 500px)) !important;
      right: max(20px, calc(50vw - 500px)) !important;
      top: 70px !important;
      bottom: 76px !important;
      width: auto !important;
    }

    .panel.open .runalis-menu-workspace.active {
      position: fixed !important;
      isolation: isolate !important;
      padding: 18px 18px 58px !important;
      border: 0 !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      border-bottom: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 0 !important;
      clip-path: none !important;
      background:
        radial-gradient(circle at 82% 0%, var(--hud-accent-soft), transparent 34%),
        linear-gradient(150deg, rgba(255,255,255,0.035), transparent 26%),
        var(--menu-glass) !important;
      backdrop-filter: blur(18px) saturate(0.9) !important;
      -webkit-backdrop-filter: blur(18px) saturate(0.9) !important;
      box-shadow: 0 34px 100px rgba(0,0,0,0.64) !important;
      overflow: auto !important;
    }

    .panel.open .runalis-menu-workspace.active::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 auto auto 0 !important;
      width: 180px !important;
      height: 2px !important;
      background: linear-gradient(90deg, var(--hud-accent), transparent) !important;
      pointer-events: none !important;
    }

    .panel.open .runalis-menu-workspace.active::after {
      content: "" !important;
      position: absolute !important;
      right: 16px !important;
      top: 12px !important;
      width: 38px !important;
      height: 38px !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      border-right: 1px solid var(--menu-rule-strong) !important;
      opacity: 0.55 !important;
      pointer-events: none !important;
    }

    .panel .tabs {
      padding: 4px !important;
      gap: 2px !important;
      border: 0 !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      border-radius: 0 !important;
      background: rgba(5, 7, 10, 0.82) !important;
      backdrop-filter: blur(14px) !important;
      -webkit-backdrop-filter: blur(14px) !important;
    }

    .panel .tab {
      min-width: 76px !important;
      min-height: 42px !important;
      display: grid !important;
      grid-template-columns: auto 1fr !important;
      gap: 7px !important;
      border: 0 !important;
      border-left: 1px solid transparent !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--menu-muted) !important;
    }

    .panel .tab::before,
    .subtab::before {
      content: attr(data-menu-icon) !important;
      color: var(--hud-accent-bright) !important;
      font-size: 9px !important;
      font-weight: 950 !important;
      letter-spacing: 0.08em !important;
      opacity: 0.82 !important;
    }

    .panel .tab:hover,
    .panel .tab:focus-visible,
    .panel .tab.game-ui-controller-focus,
    .panel .tab.active {
      color: var(--menu-text) !important;
      border-left-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent) !important;
      box-shadow: none !important;
    }

    .subtab-bar {
      position: relative !important;
      display: flex !important;
      gap: 2px !important;
      align-items: stretch !important;
      padding: 0 0 7px !important;
      margin: 0 0 13px !important;
      border: 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .subtab {
      display: inline-flex !important;
      gap: 7px !important;
      align-items: center !important;
      min-height: 34px !important;
      padding: 5px 11px !important;
      border: 0 !important;
      border-bottom: 1px solid transparent !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: var(--menu-muted) !important;
      box-shadow: none !important;
    }

    .subtab:hover,
    .subtab:focus-visible,
    .subtab.game-ui-controller-focus,
    .subtab.active {
      border-color: var(--hud-accent) !important;
      color: var(--hud-accent-bright) !important;
      background: linear-gradient(0deg, var(--hud-accent-soft), transparent 65%) !important;
      box-shadow: none !important;
    }

    .menu-context-bar {
      position: absolute !important;
      z-index: 5 !important;
      left: 18px !important;
      right: 18px !important;
      bottom: 12px !important;
      display: flex !important;
      justify-content: flex-end !important;
      align-items: center !important;
      gap: 16px !important;
      min-height: 32px !important;
      padding-top: 8px !important;
      border-top: 1px solid var(--menu-rule) !important;
      background: linear-gradient(90deg, transparent, rgba(5,7,10,0.62) 25%) !important;
      color: var(--menu-muted) !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      pointer-events: none !important;
    }

    .menu-context-bar span {
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      white-space: nowrap !important;
    }

    .menu-context-bar kbd {
      min-width: 20px !important;
      padding: 3px 5px !important;
      border: 1px solid var(--menu-rule-strong) !important;
      border-radius: 2px !important;
      background: rgba(0,0,0,0.36) !important;
      color: var(--hud-accent-bright) !important;
      font: inherit !important;
      text-align: center !important;
    }

    .runalis-menu-workspace .card,
    .runalis-menu-workspace .inventory-list-pane,
    .runalis-menu-workspace .inventory-detail-pane,
    .runalis-menu-workspace .skill-tree-path-list,
    .runalis-menu-workspace .skill-tree-node-index,
    .runalis-menu-workspace .skill-tree-detail-pane,
    .runalis-menu-workspace .ability-category-pane,
    .runalis-menu-workspace .ability-pool-pane,
    .runalis-menu-workspace .ability-detail-pane,
    .runalis-menu-workspace .ability-hotbar-pane,
    .runalis-menu-workspace .quest-title-index,
    .runalis-menu-workspace .quest-detail-pane {
      border: 0 !important;
      border-left: 0 !important;
      border-radius: 0 !important;
      background: var(--menu-glass-soft) !important;
      box-shadow: none !important;
    }

    .runalis-menu-workspace .card {
      padding: 13px !important;
      margin-bottom: 8px !important;
    }

    .runalis-menu-workspace .card h2,
    .runalis-menu-workspace .card h3,
    .runalis-menu-workspace h2,
    .runalis-menu-workspace h3 {
      color: var(--menu-text) !important;
      letter-spacing: 0 !important;
      text-shadow: none !important;
    }

    .runalis-menu-workspace .tag {
      color: var(--menu-muted) !important;
    }

    .runalis-menu-workspace .stat-row {
      min-height: 27px !important;
      padding: 5px 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.055) !important;
      background: transparent !important;
    }

    .runalis-menu-workspace .stat-row:last-child {
      border-bottom: 0 !important;
    }

    .runalis-menu-workspace button {
      transition: color 120ms ease, background 120ms ease, border-color 120ms ease, transform 120ms ease !important;
    }

    .runalis-menu-workspace button:hover,
    .runalis-menu-workspace button:focus-visible,
    .runalis-menu-workspace button.game-ui-controller-focus {
      transform: translateX(2px) !important;
    }

    /* Character */
    #character[data-character-subtab="overview"] {
      display: grid !important;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr) !important;
      gap: 8px !important;
      align-content: start !important;
    }

    #character[data-character-subtab="overview"] > .subtab-bar,
    #character[data-character-subtab="overview"] > .progression-card-grid {
      grid-column: 1 / -1 !important;
    }

    #character[data-character-subtab="overview"] > .card {
      margin: 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    #character[data-character-subtab="overview"] > .card:nth-of-type(2) {
      grid-row: span 2 !important;
    }

    .character-sheet-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 9px !important;
    }

    .character-paper {
      min-height: 0 !important;
      padding: 14px !important;
      border-top: 1px solid var(--menu-rule) !important;
      background: linear-gradient(145deg, rgba(255,255,255,0.025), transparent 40%) !important;
    }

    .sheet-title-row {
      padding-bottom: 12px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .sheet-badge {
      border: 0 !important;
      border-left: 2px solid var(--hud-accent) !important;
      border-radius: 0 !important;
      background: var(--hud-accent-soft) !important;
      color: var(--hud-accent-bright) !important;
    }

    .sheet-stat-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 5px !important;
    }

    .sheet-stat {
      position: relative !important;
      display: grid !important;
      grid-template-columns: 30px minmax(0, 1fr) !important;
      gap: 1px 7px !important;
      min-height: 55px !important;
      padding: 7px !important;
      border: 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      border-radius: 0 !important;
      background: rgba(255,255,255,0.018) !important;
      color: var(--menu-text) !important;
      text-align: left !important;
    }

    .sheet-stat i {
      grid-row: 1 / 3 !important;
      align-self: center !important;
      color: var(--hud-accent-bright) !important;
      font-size: 11px !important;
      font-style: normal !important;
      font-weight: 950 !important;
    }

    .sheet-stat span {
      color: var(--menu-muted) !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
    }

    .sheet-stat b {
      overflow: hidden !important;
      color: var(--menu-text) !important;
      font-size: 12px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .sheet-stat:hover,
    .sheet-stat:focus-visible,
    .sheet-stat.active,
    .sheet-stat.game-ui-controller-focus {
      border-bottom-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent) !important;
      box-shadow: none !important;
    }

    .character-stat-detail {
      grid-column: 1 / -1 !important;
      display: grid !important;
      grid-template-columns: 52px minmax(0, 1fr) !important;
      gap: 13px !important;
      align-items: center !important;
      min-height: 82px !important;
      padding: 12px 15px !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), rgba(255,255,255,0.018) 45%, transparent) !important;
    }

    .character-stat-detail > span {
      color: var(--hud-accent-bright) !important;
      font-size: 19px !important;
      font-weight: 950 !important;
      text-align: center !important;
    }

    .character-stat-detail small,
    .character-stat-detail p {
      color: var(--menu-muted) !important;
    }

    .character-stat-detail h3 {
      margin: 2px 0 !important;
    }

    .character-stat-detail h3 b {
      margin-left: 8px !important;
      color: var(--hud-accent-bright) !important;
    }

    .character-stat-detail p {
      margin: 0 !important;
      font-size: 11px !important;
    }

    .character-equipment-screen {
      height: calc(100% - 4px) !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    .paper-doll-layout {
      gap: 16px !important;
    }

    .equipment-slot {
      border: 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .equipment-slot-frame,
    .item-icon {
      border: 1px solid var(--menu-rule) !important;
      border-radius: 2px !important;
      background: rgba(0,0,0,0.24) !important;
      box-shadow: none !important;
    }

    /* Inventory and crafting */
    .inventory-browser-layout {
      grid-template-columns: minmax(250px, 0.72fr) minmax(0, 1.55fr) !important;
      gap: 0 !important;
      min-height: calc(100% - 6px) !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    .inventory-list-pane {
      padding: 12px 14px 12px 0 !important;
      border-right: 1px solid var(--menu-rule) !important;
    }

    .inventory-detail-pane {
      padding: 16px 0 12px 18px !important;
      background: linear-gradient(110deg, rgba(255,255,255,0.025), transparent 68%) !important;
    }

    .inventory-list-heading {
      padding: 0 2px 10px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .inventory-name-list {
      gap: 0 !important;
      padding-top: 4px !important;
    }

    .inventory-list-row,
    .ability-pool-button,
    .compact-path-button,
    .compact-node-button,
    .quest-title-button {
      border: 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .inventory-list-row {
      grid-template-columns: 3px 28px minmax(0, 1fr) auto !important;
      gap: 7px !important;
      align-items: center !important;
      min-height: 37px !important;
      padding: 6px 7px !important;
    }

    .inventory-list-rarity {
      width: 2px !important;
      height: 18px !important;
      border-radius: 0 !important;
      background: var(--rarity) !important;
      box-shadow: none !important;
    }

    .inventory-list-icon {
      width: 27px !important;
      height: 27px !important;
      min-width: 27px !important;
      padding: 2px !important;
      border-color: rgba(255,255,255,0.08) !important;
      opacity: 0.9 !important;
    }

    .inventory-list-quantity {
      color: var(--menu-muted) !important;
      font-size: 10px !important;
    }

    .inventory-list-meta {
      display: grid !important;
      justify-items: end !important;
      gap: 2px !important;
      min-width: 0 !important;
    }

    .inventory-list-owner {
      max-width: 112px !important;
      overflow: hidden !important;
      color: var(--hud-accent-bright) !important;
      font-size: 9px !important;
      font-weight: 850 !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .inventory-list-row:hover,
    .inventory-list-row:focus-visible,
    .inventory-list-row.active,
    .inventory-list-row.game-ui-controller-focus,
    .ability-pool-button:hover,
    .ability-pool-button.active,
    .compact-path-button:hover,
    .compact-path-button.active,
    .compact-node-button:hover,
    .compact-node-button.active,
    .quest-title-button:hover,
    .quest-title-button.active {
      border-bottom-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent 76%) !important;
      box-shadow: inset 2px 0 var(--hud-accent) !important;
    }

    .inventory-list-row.inventory-salvage-holding {
      position: relative !important;
      overflow: hidden !important;
      border-bottom-color: rgba(239,111,108,0.84) !important;
      background: linear-gradient(90deg, rgba(91,72,36,0.46), transparent 76%) !important;
    }

    .inventory-list-row.inventory-salvage-holding::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 auto 0 0 !important;
      width: var(--salvage-progress, 0%) !important;
      background: linear-gradient(90deg, rgba(191,74,52,0.84), rgba(239,111,108,0.5)) !important;
      pointer-events: none !important;
      transition: width 70ms linear !important;
      z-index: 0 !important;
    }

    .inventory-list-row.inventory-salvage-confirming {
      border-bottom-color: rgba(244,196,89,0.9) !important;
    }

    .inventory-list-row.inventory-salvage-confirming::before {
      background: linear-gradient(90deg, rgba(218,154,54,0.88), rgba(255,220,138,0.48)) !important;
    }

    .inventory-list-row.inventory-salvage-blocked::before {
      background: linear-gradient(90deg, rgba(105,112,126,0.74), rgba(167,176,194,0.34)) !important;
    }

    .inventory-list-row.inventory-salvage-complete::before {
      background: linear-gradient(90deg, rgba(76,157,99,0.8), rgba(125,220,147,0.38)) !important;
    }

    .inventory-list-row.inventory-salvage-holding > * {
      position: relative !important;
      z-index: 1 !important;
    }

    .inventory-detail-header {
      padding-bottom: 12px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .inventory-detail-pane .item-stats,
    .inventory-detail-materials,
    .inventory-legendary-effect {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0 14px !important;
      padding: 10px 0 !important;
      border: 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      border-radius: 0 !important;
      background: transparent !important;
    }

    .inventory-legendary-effect h3,
    .inventory-legendary-effect p,
    .inventory-detail-materials h3 {
      grid-column: 1 / -1 !important;
    }

    .inventory-gear-identity,
    .world-skill-chips,
    .tree-bonus-list {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 5px !important;
    }

    .inventory-gear-identity span,
    .world-skill-chips span,
    .tree-bonus-list span,
    .inventory-controller-hints span {
      padding: 4px 7px !important;
      border: 0 !important;
      border-left: 1px solid var(--menu-rule-strong) !important;
      border-radius: 0 !important;
      background: rgba(255,255,255,0.035) !important;
      color: var(--menu-muted) !important;
    }

    .inventory-detail-pane .item-stats.gear-tier-identity { display:block !important; }
    .gear-tier-identity .stat-row { display:flex !important; justify-content:space-between; gap:14px; }
    .gear-tier-identity p { line-height:1.45; }
    .equipment-workstation {
      display: grid !important;
      grid-template-columns: minmax(260px, 0.78fr) minmax(300px, 0.92fr) minmax(360px, 1.18fr) !important;
      min-height: calc(100% - 6px) !important;
      max-height: calc(100vh - 170px) !important;
      border-top: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .equipment-inventory-pane,
    .equipment-character-pane,
    .equipment-detail-pane {
      min-width: 0 !important;
      min-height: 0 !important;
      background: linear-gradient(115deg, rgba(255,255,255,0.025), transparent 72%) !important;
    }

    .equipment-inventory-pane {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      padding: 12px 14px 12px 0 !important;
      border-right: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .equipment-character-pane {
      display: grid !important;
      grid-template-rows: minmax(250px, 0.92fr) minmax(0, 1fr) !important;
      gap: 12px !important;
      padding: 14px !important;
      border-right: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .equipment-detail-pane {
      padding: 16px 0 12px 18px !important;
      overflow: auto !important;
    }

    .equipment-preview-card {
      position: relative !important;
      display: grid !important;
      place-items: center !important;
      min-height: 240px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      background:
        radial-gradient(circle at 50% 62%, rgba(217,173,79,0.08), transparent 44%),
        linear-gradient(180deg, rgba(0,0,0,0.18), transparent) !important;
      overflow: hidden !important;
    }

    .equipment-preview-canvas {
      width: min(100%, 270px) !important;
      height: min(100%, 320px) !important;
      image-rendering: auto !important;
    }

    .equipment-preview-caption {
      position: absolute !important;
      left: 12px !important;
      right: 12px !important;
      bottom: 10px !important;
      display: flex !important;
      justify-content: space-between !important;
      gap: 12px !important;
      align-items: baseline !important;
      pointer-events: none !important;
    }

    .equipment-preview-caption h2,
    .equipment-preview-caption p {
      margin: 0 !important;
      text-shadow: 0 2px 2px #000 !important;
    }

    .equipment-slot-grid {
      display: grid !important;
      grid-auto-rows: minmax(58px, auto) !important;
      align-content: start !important;
      gap: 0 !important;
      min-height: 0 !important;
      overflow: auto !important;
    }

    .equipment-slot-button {
      width: 100% !important;
      display: grid !important;
      grid-template-columns: 42px minmax(0, 1fr) !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 8px 7px !important;
      border: 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.07) !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--menu-text) !important;
      text-align: left !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
    }

    .equipment-slot-button:hover,
    .equipment-slot-button:focus-visible,
    .equipment-slot-button.active,
    .equipment-slot-button.game-ui-controller-focus {
      border-bottom-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent 76%) !important;
      box-shadow: inset 2px 0 var(--hud-accent) !important;
      outline: none !important;
    }

    .equipment-slot-button-icon {
      width: 34px !important;
      height: 34px !important;
      min-width: 34px !important;
    }

    .equipment-slot-button-copy {
      display: grid !important;
      gap: 2px !important;
      min-width: 0 !important;
    }

    .equipment-slot-button-label,
    .equipment-slot-button-copy small {
      color: var(--menu-muted) !important;
      font-size: 10px !important;
      font-weight: 850 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
    }

    .equipment-slot-button-copy b {
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      color: var(--menu-text) !important;
      font-size: 12px !important;
    }

    .equipment-empty-list {
      padding: 12px 8px !important;
    }

    .equipment-action-row {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) !important;
      gap: 8px !important;
      padding-top: 12px !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    .equipment-action-row button {
      min-height: 32px !important;
      border: 1px solid var(--menu-rule-strong) !important;
      border-radius: 2px !important;
      background: linear-gradient(180deg, rgba(217,173,79,0.12), rgba(0,0,0,0.24)) !important;
      color: #f1dfae !important;
      font-weight: 950 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.03em !important;
    }

    .equipment-comparison-block,
    .equipment-upgrade-cost {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0 14px !important;
      padding: 10px 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .equipment-comparison-block h3,
    .equipment-upgrade-cost h3 {
      grid-column: 1 / -1 !important;
      margin: 0 0 6px !important;
      color: var(--hud-accent-bright) !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.06em !important;
    }

    .equipment-workstation[data-equipment-focus-region="inventory"] .equipment-inventory-pane,
    .equipment-workstation[data-equipment-focus-region="slots"] .equipment-character-pane {
      box-shadow: inset 0 1px var(--hud-accent), inset 0 0 28px rgba(217,173,79,0.045) !important;
    }

    .coterie-workstation {
      display: grid !important;
      grid-template-columns: minmax(330px, 0.72fr) minmax(590px, 1.28fr) !important;
      min-height: calc(100% - 6px) !important;
      max-height: calc(100vh - 170px) !important;
      border-top: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .coterie-squad-pane,
    .coterie-inventory-pane,
    .coterie-inline-detail {
      min-width: 0 !important;
      min-height: 0 !important;
      background: linear-gradient(115deg, rgba(255,255,255,0.025), transparent 72%) !important;
    }

    .coterie-squad-pane,
    .coterie-inventory-pane {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      padding: 12px 14px 12px 0 !important;
      border-right: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .coterie-inventory-pane {
      grid-template-rows: auto minmax(248px, 0.62fr) minmax(112px, 0.38fr) !important;
      padding-left: 0 !important;
      padding-right: 14px !important;
    }

    .coterie-squad-pane {
      padding-left: 14px !important;
      padding-right: 0 !important;
      border-right: 0 !important;
    }

    .coterie-inline-detail {
      margin-top: 8px !important;
      padding: 8px 0 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .coterie-inline-detail .inventory-detail-content,
    .coterie-inline-detail .inventory-detail-empty {
      gap: 7px !important;
      padding-right: 0 !important;
    }

    .coterie-inline-detail .inventory-detail-description,
    .coterie-inline-detail .inventory-legendary-effect,
    .coterie-inline-detail .equipment-action-row {
      display: none !important;
    }

    .coterie-inline-detail .inventory-detail-header {
      gap: 9px !important;
      padding-bottom: 6px !important;
    }

    .coterie-inline-detail .inventory-detail-icon {
      width: 42px !important;
      height: 42px !important;
    }

    .coterie-inline-detail .inventory-detail-header h2 {
      font-size: 15px !important;
      margin: 0 !important;
    }

    .coterie-inline-detail .item-stats,
    .coterie-inline-detail .equipment-comparison-block {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0 10px !important;
      padding: 4px 0 !important;
    }

    .coterie-inline-detail .inventory-controller-hints {
      margin-top: 0 !important;
    }

    .coterie-skeleton-list {
      display: grid !important;
      grid-template-rows: repeat(3, minmax(0, 1fr)) !important;
      gap: 6px !important;
      min-height: 0 !important;
      overflow: hidden !important;
      padding-top: 6px !important;
    }

    .coterie-skeleton-card {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      min-height: 0 !important;
      border-left: 2px solid rgba(168,107,214,0.42) !important;
      background: rgba(4,4,9,0.24) !important;
      overflow: hidden !important;
    }

    .coterie-skeleton-card.active {
      border-left-color: var(--hud-accent) !important;
      box-shadow: inset 0 1px var(--hud-accent), inset 0 0 28px rgba(168,107,214,0.06) !important;
    }

    .coterie-skeleton-heading {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      padding: 6px 8px 4px 10px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .coterie-skeleton-heading h3 {
      margin: 0 !important;
      color: var(--hud-accent-bright) !important;
      font-size: 12px !important;
      letter-spacing: 0 !important;
    }

    .coterie-skeleton-body {
      display: grid !important;
      grid-template-columns: 86px minmax(0, 1fr) !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .coterie-skeleton-visual {
      display: grid !important;
      place-items: center !important;
      min-height: 0 !important;
      border-right: 1px solid var(--menu-rule) !important;
      background: radial-gradient(circle at 50% 62%, rgba(168,107,214,0.12), transparent 68%) !important;
    }

    .coterie-skeleton-figure {
      position: relative !important;
      width: 64px !important;
      height: 92px !important;
    }

    .coterie-bone {
      position: absolute !important;
      display: block !important;
      background: #d9cfb8 !important;
      box-shadow: 0 0 0 1px rgba(22,19,15,0.45) !important;
    }

    .coterie-skull {
      left: 22px !important;
      top: 7px !important;
      width: 20px !important;
      height: 18px !important;
      border-radius: 4px !important;
    }

    .coterie-skull::before,
    .coterie-skull::after {
      content: '' !important;
      position: absolute !important;
      top: 6px !important;
      width: 4px !important;
      height: 5px !important;
      background: #16130f !important;
    }

    .coterie-skull::before { left: 4px !important; }
    .coterie-skull::after { right: 4px !important; }

    .coterie-neck {
      left: 29px !important;
      top: 26px !important;
      width: 6px !important;
      height: 8px !important;
    }

    .coterie-ribcage {
      left: 20px !important;
      top: 34px !important;
      width: 24px !important;
      height: 28px !important;
      border-radius: 8px 8px 4px 4px !important;
      background:
        linear-gradient(90deg, transparent 0 20%, rgba(22,19,15,0.42) 20% 28%, transparent 28% 44%, rgba(22,19,15,0.42) 44% 56%, transparent 56% 72%, rgba(22,19,15,0.42) 72% 80%, transparent 80%),
        #d9cfb8 !important;
    }

    .coterie-skeleton-figure.has-armour .coterie-ribcage {
      background:
        linear-gradient(90deg, rgba(255,255,255,0.16), transparent 45%),
        var(--armour) !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.16), inset 0 -8px rgba(0,0,0,0.24) !important;
    }

    .coterie-arm {
      top: 37px !important;
      width: 5px !important;
      height: 31px !important;
      transform-origin: top center !important;
    }

    .coterie-arm.left {
      left: 15px !important;
      transform: rotate(18deg) !important;
    }

    .coterie-arm.right {
      right: 15px !important;
      transform: rotate(-18deg) !important;
    }

    .coterie-leg {
      top: 61px !important;
      width: 5px !important;
      height: 26px !important;
      transform-origin: top center !important;
    }

    .coterie-leg.left {
      left: 25px !important;
      transform: rotate(12deg) !important;
    }

    .coterie-leg.right {
      right: 25px !important;
      transform: rotate(-12deg) !important;
    }

    .coterie-held-weapon {
      position: absolute !important;
      right: 2px !important;
      top: 35px !important;
      width: 24px !important;
      height: 24px !important;
      border: 1px solid var(--weapon) !important;
      background: rgba(7, 9, 13, 0.72) !important;
      box-shadow: 0 0 10px color-mix(in srgb, var(--weapon) 45%, transparent) !important;
      transform: rotate(-12deg) !important;
    }

    .coterie-worn-charm {
      position: absolute !important;
      left: 7px !important;
      top: 48px !important;
      width: 20px !important;
      height: 20px !important;
      border: 1px solid var(--charm) !important;
      background: rgba(7, 9, 13, 0.74) !important;
      box-shadow: 0 0 12px color-mix(in srgb, var(--charm) 55%, transparent) !important;
    }

    .coterie-slot-list {
      display: grid !important;
      grid-template-rows: repeat(3, minmax(0, 1fr)) !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .coterie-slot-button {
      width: 100% !important;
      display: grid !important;
      grid-template-columns: 32px minmax(0, 1fr) !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 5px 8px !important;
      border: 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.07) !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--menu-text) !important;
      text-align: left !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
    }

    .coterie-slot-button:hover,
    .coterie-slot-button:focus-visible,
    .coterie-slot-button.active,
    .coterie-slot-button.game-ui-controller-focus,
    .coterie-workstation[data-coterie-focus-region="inventory"] .coterie-inventory-pane,
    .coterie-workstation[data-coterie-focus-region="skeletons"] .coterie-squad-pane {
      border-bottom-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent 76%) !important;
      box-shadow: inset 2px 0 var(--hud-accent) !important;
      outline: none !important;
    }

    .coterie-slot-button.placement-compatible {
      box-shadow: inset 2px 0 rgba(115,209,138,0.72) !important;
    }

    .coterie-slot-button.placement-incompatible {
      opacity: 0.45 !important;
    }

    .coterie-slot-button.placement-incompatible.active,
    .coterie-slot-button.placement-incompatible.game-ui-controller-focus {
      opacity: 0.68 !important;
      box-shadow: inset 2px 0 rgba(239,64,86,0.72) !important;
    }

    .inventory-list-row.pending-placement {
      background: linear-gradient(90deg, rgba(168,107,214,0.24), transparent 76%) !important;
      box-shadow: inset 2px 0 var(--hud-accent) !important;
    }

    .coterie-inventory-list {
      overflow: hidden !important;
    }

    /* Skills and world progression */
    #skills[data-skills-subtab="combat"],
    #skills[data-skills-subtab="gathering"],
    #skills[data-skills-subtab="production"],
    #skills[data-skills-subtab="world"] {
      display: grid !important;
      grid-template-rows: auto auto minmax(0, 1fr) !important;
      gap: 7px !important;
      overflow: hidden !important;
    }

    #skills[data-skills-subtab="combat"] > .progression-card-grid + .card,
    #skills[data-skills-subtab="gathering"] > .progression-card-grid + .card,
    #skills[data-skills-subtab="production"] > .progression-card-grid + .card,
    #skills[data-skills-subtab="world"] > .progression-card-grid + .card {
      display: none !important;
    }

    .progression-card-grid {
      gap: 7px !important;
      margin: 0 !important;
    }

    .progression-big-card {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 2px 12px !important;
      padding: 8px 11px !important;
      border-top: 1px solid var(--menu-rule) !important;
      background: rgba(255,255,255,0.018) !important;
    }

    .progression-big-card .bar {
      grid-column: 1 / -1 !important;
      height: 3px !important;
    }

    .progression-big-card > .tag:last-child {
      display: none !important;
    }

    .world-skill-browser {
      display: grid !important;
      grid-template-columns: minmax(240px, 0.72fr) minmax(0, 1.6fr) !important;
      min-height: 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
      overflow: hidden !important;
    }

    .world-skill-index {
      min-width: 0 !important;
      padding: 12px 14px 0 0 !important;
      border-right: 1px solid var(--menu-rule) !important;
      overflow: auto !important;
    }

    .menu-section-heading {
      display: flex !important;
      justify-content: space-between !important;
      gap: 10px !important;
      padding: 0 7px 10px !important;
      color: var(--menu-muted) !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .menu-section-heading b {
      color: var(--hud-accent-bright) !important;
    }

    .world-skill-list {
      display: grid !important;
      gap: 0 !important;
    }

    .world-skill-row {
      position: relative !important;
      display: grid !important;
      grid-template-columns: 38px minmax(0, 1fr) auto !important;
      gap: 8px !important;
      align-items: center !important;
      min-height: 50px !important;
      padding: 6px 7px !important;
      overflow: hidden !important;
      border: 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: var(--menu-text) !important;
      text-align: left !important;
      box-shadow: none !important;
    }

    .world-skill-row i,
    .world-skill-detail-head i {
      color: var(--hud-accent-bright) !important;
      font-style: normal !important;
      font-weight: 950 !important;
      text-align: center !important;
    }

    .world-skill-row div {
      display: grid !important;
      gap: 2px !important;
    }

    .world-skill-row small {
      color: var(--menu-muted) !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
    }

    .world-skill-row > b {
      color: var(--menu-text) !important;
      font-size: 10px !important;
    }

    .world-skill-row em {
      position: absolute !important;
      left: 0 !important;
      bottom: 0 !important;
      width: var(--skill-progress) !important;
      height: 1px !important;
      background: var(--hud-accent) !important;
    }

    .world-skill-row:hover,
    .world-skill-row:focus-visible,
    .world-skill-row.active,
    .world-skill-row.game-ui-controller-focus {
      border-bottom-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent) !important;
      box-shadow: inset 2px 0 var(--hud-accent) !important;
    }

    .world-skill-detail {
      min-width: 0 !important;
      padding: 18px 0 0 20px !important;
      overflow: auto !important;
    }

    .world-skill-detail-head {
      display: grid !important;
      grid-template-columns: 62px minmax(0, 1fr) auto !important;
      gap: 14px !important;
      align-items: start !important;
      padding-bottom: 16px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .world-skill-detail-head i {
      padding: 17px 5px !important;
      border-left: 2px solid var(--hud-accent) !important;
      background: var(--hud-accent-soft) !important;
      font-size: 18px !important;
    }

    .world-skill-detail-head small,
    .world-skill-unlocks > small {
      color: var(--hud-accent-bright) !important;
      font-size: 9px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .world-skill-detail-head h2 {
      margin: 3px 0 5px !important;
    }

    .world-skill-detail-head p {
      margin: 0 !important;
      color: var(--menu-muted) !important;
      font-size: 11px !important;
    }

    .world-skill-detail-head strong {
      color: var(--hud-accent-bright) !important;
      font-size: 18px !important;
    }

    .world-skill-progress,
    .world-skill-unlocks {
      padding: 14px 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .world-skill-progress > span {
      display: block !important;
      margin-bottom: 6px !important;
      color: var(--menu-muted) !important;
      font-size: 10px !important;
    }

    /* Trees, abilities, quests, log */
    .skill-tree-onepage,
    .ability-management-onepage,
    .quest-onepage-layout {
      gap: 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    .skill-tree-path-list,
    .ability-category-pane,
    .quest-title-index {
      padding-right: 13px !important;
      border-right: 1px solid var(--menu-rule) !important;
    }

    .skill-tree-node-index,
    .ability-pool-pane {
      padding-inline: 14px !important;
      border-right: 1px solid var(--menu-rule) !important;
    }

    .skill-tree-detail-pane,
    .ability-detail-pane,
    .quest-detail-pane {
      padding-left: 16px !important;
      background: linear-gradient(120deg, rgba(255,255,255,0.025), transparent) !important;
    }

    .compact-node-button,
    .compact-path-button,
    .ability-pool-button {
      min-height: 38px !important;
      padding: 6px 8px !important;
    }

    .compact-path-button,
    .compact-node-button,
    .ability-pool-button {
      display: grid !important;
      grid-template-columns: 28px minmax(0, 1fr) auto !important;
      gap: 7px !important;
      align-items: center !important;
      text-align: left !important;
    }

    .compact-path-button i,
    .compact-node-button i,
    .ability-pool-button i,
    .ability-detail-title > i {
      color: var(--hud-accent-bright) !important;
      font-size: 9px !important;
      font-style: normal !important;
      font-weight: 950 !important;
      text-align: center !important;
    }

    .ability-detail-title {
      display: grid !important;
      grid-template-columns: 42px minmax(0, 1fr) auto !important;
      gap: 10px !important;
      align-items: center !important;
      padding-bottom: 11px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .ability-detail-title > i {
      padding: 12px 4px !important;
      border-left: 2px solid var(--hud-accent) !important;
      background: var(--hud-accent-soft) !important;
      font-size: 12px !important;
    }

    .tree-connection-spine {
      background: var(--menu-rule-strong) !important;
    }

    .tree-branch-row .compact-node-button {
      border-top: 1px solid var(--menu-rule) !important;
    }

    .ability-hotbar-pane {
      margin-top: 8px !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent 55%) !important;
    }

    .ability-hotbar-assign,
    .ability-hotbar-clear {
      border: 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      border-radius: 0 !important;
      background: rgba(0,0,0,0.18) !important;
      box-shadow: none !important;
    }

    .quest-onepage-card {
      height: 100% !important;
      padding: 0 !important;
      background: transparent !important;
    }

    .quest-onepage-card > h2 {
      padding: 0 0 10px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .quest-title-button {
      padding: 8px !important;
    }

    .quest-objective {
      border: 0 !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      border-radius: 0 !important;
      background: transparent !important;
    }

    #log.active > .card {
      height: 100% !important;
      background: transparent !important;
    }

    .log-list {
      display: grid !important;
      gap: 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    .log-line {
      position: relative !important;
      padding: 9px 10px 9px 22px !important;
      border: 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.055) !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: var(--menu-muted) !important;
    }

    .log-line::before {
      content: "" !important;
      position: absolute !important;
      left: 6px !important;
      top: 15px !important;
      width: 5px !important;
      height: 5px !important;
      border: 1px solid var(--hud-accent) !important;
      transform: rotate(45deg) !important;
    }

    @media (max-width: 1050px) {
      .panel.open .runalis-menu-workspace.active {
        left: 12px !important;
        right: 12px !important;
        top: 52px !important;
        bottom: 12px !important;
        width: auto !important;
      }

      .character-sheet-grid {
        grid-template-columns: 1fr !important;
      }

      #character[data-character-subtab="overview"] {
        grid-template-columns: 1fr !important;
      }

      #character[data-character-subtab="overview"] > * {
        grid-column: 1 !important;
        grid-row: auto !important;
      }

      .character-stat-detail {
        grid-column: 1 !important;
      }

      .skill-tree-onepage,
      .ability-management-onepage {
        grid-template-columns: 160px minmax(0, 1fr) !important;
        overflow: auto !important;
      }

      .skill-tree-detail-pane,
      .ability-detail-pane {
        display: none !important;
      }

      .inventory-browser-layout,
      .world-skill-browser,
      .quest-onepage-layout {
        grid-template-columns: minmax(210px, 0.75fr) minmax(0, 1.25fr) !important;
      }
    }

    /* Skill tree focus pass: the tree is the workspace, not the summary. */
    #skills[data-skills-subtab="trees"] {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      overflow: hidden !important;
    }

    #skills[data-skills-subtab="trees"] > .progression-card-grid,
    #skills[data-skills-subtab="trees"] > .card:not(.skill-tree-workspace) {
      display: none !important;
    }

    .skill-tree-workspace {
      display: grid !important;
      grid-template-rows: auto auto minmax(0, 1fr) !important;
      gap: 8px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .skill-tree-compact-head {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 16px !important;
      min-height: 48px !important;
      padding: 6px 8px 8px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent 46%) !important;
    }

    .skill-tree-compact-head small,
    .skill-tree-compact-head p {
      display: block !important;
      margin: 0 !important;
      color: var(--menu-muted) !important;
      font-size: 9px !important;
      line-height: 1.25 !important;
    }

    .skill-tree-compact-head h2 {
      margin: 1px 0 2px !important;
      font-size: 18px !important;
    }

    .skill-tree-status-chips {
      display: flex !important;
      gap: 6px !important;
      flex-wrap: wrap !important;
      justify-content: flex-end !important;
    }

    .skill-tree-status-chips span {
      padding: 5px 8px !important;
      border-left: 1px solid var(--hud-accent) !important;
      background: rgba(255,255,255,0.035) !important;
      color: var(--menu-muted) !important;
      font-size: 9px !important;
      font-weight: 850 !important;
    }

    .skill-tree-status-chips b {
      color: var(--hud-accent-bright) !important;
    }

    .skill-tree-path-list {
      display: flex !important;
      gap: 12px !important;
      min-height: 42px !important;
      padding: 0 4px 7px !important;
      overflow: hidden !important;
      border-bottom: 1px solid var(--menu-rule) !important;
      background: transparent !important;
    }

    .compact-path-group {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
      min-width: 0 !important;
    }

    .compact-path-group > span {
      margin-right: 3px !important;
      color: var(--menu-muted) !important;
      font-size: 8px !important;
      text-transform: uppercase !important;
    }

    .compact-path-group .tag {
      display: none !important;
    }

    .compact-path-button {
      display: grid !important;
      grid-template-columns: auto 1fr !important;
      gap: 0 5px !important;
      min-width: 78px !important;
      min-height: 32px !important;
      padding: 4px 6px !important;
      border: 0 !important;
      border-bottom: 1px solid transparent !important;
      background: transparent !important;
    }

    .compact-path-button i {
      grid-row: 1 / 3 !important;
      align-self: center !important;
      color: var(--hud-accent-bright) !important;
      font-size: 8px !important;
      font-style: normal !important;
    }

    .compact-path-button b,
    .compact-path-button span {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .compact-path-button b {
      font-size: 9px !important;
    }

    .compact-path-button span {
      color: var(--menu-muted) !important;
      font-size: 7px !important;
    }

    .compact-path-button.active,
    .compact-path-button.game-ui-controller-focus {
      border-bottom-color: var(--hud-accent) !important;
      background: linear-gradient(0deg, var(--hud-accent-soft), transparent 80%) !important;
    }

    .skill-tree-stage {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 250px !important;
      gap: 10px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .skill-tree-node-index {
      display: grid !important;
      place-items: center !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 10px 18px !important;
      overflow: auto !important;
      border: 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
      background:
        radial-gradient(circle at 50% 42%, var(--hud-accent-soft), transparent 50%),
        rgba(0,0,0,0.12) !important;
    }

    .branching-skill-tree {
      width: min(100%, 760px) !important;
      min-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      gap: 0 !important;
      padding: 8px 0 !important;
    }

    .tree-branch-row {
      display: grid !important;
      grid-template-columns: repeat(var(--tree-count, 1), minmax(110px, 170px)) !important;
      justify-content: center !important;
      gap: 30px !important;
      min-height: 48px !important;
    }

    .tree-branch-count-1 { --tree-count: 1; }
    .tree-branch-count-2 { --tree-count: 2; }
    .tree-branch-count-3 { --tree-count: 3; }
    .tree-branch-count-4 { --tree-count: 4; }
    .tree-branch-count-5 { --tree-count: 5; }

    .tree-connection-spine {
      position: relative !important;
      width: 2px !important;
      height: 18px !important;
      margin: 0 auto !important;
      background: linear-gradient(var(--hud-accent), rgba(255,255,255,0.12)) !important;
    }

    .tree-connection-spine::after {
      content: "" !important;
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      width: 92px !important;
      height: 1px !important;
      transform: translate(-50%, -50%) !important;
      background: linear-gradient(90deg, transparent, var(--hud-accent), transparent) !important;
      opacity: 0.45 !important;
    }

    .tree-connection-spine.merge::before {
      content: "MERGE" !important;
      position: absolute !important;
      left: 8px !important;
      top: 4px !important;
      color: var(--hud-accent-bright) !important;
      font-size: 6px !important;
      font-weight: 900 !important;
    }

    .compact-node-button {
      position: relative !important;
      display: grid !important;
      grid-template-columns: 34px minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 6px !important;
      min-width: 0 !important;
      min-height: 44px !important;
      padding: 5px 7px !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-left: 2px solid rgba(255,255,255,0.15) !important;
      background: rgba(7,9,13,0.7) !important;
      box-shadow: 0 8px 18px rgba(0,0,0,0.18) !important;
    }

    .compact-node-button i {
      color: var(--menu-muted) !important;
      font-size: 7px !important;
      font-style: normal !important;
      text-align: center !important;
    }

    .compact-node-button span {
      overflow: hidden !important;
      color: var(--menu-text) !important;
      font-size: 9px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .compact-node-button b {
      color: var(--menu-muted) !important;
      font-size: 7px !important;
    }

    .compact-node-button.available {
      border-left-color: var(--hud-accent) !important;
      box-shadow: inset 0 0 18px var(--hud-accent-soft), 0 8px 18px rgba(0,0,0,0.2) !important;
    }

    .compact-node-button.learned {
      border-color: var(--hud-accent) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), rgba(7,9,13,0.72)) !important;
    }

    .compact-node-button.blocked,
    .compact-node-button.locked {
      opacity: 0.58 !important;
      filter: saturate(0.42) !important;
    }

    .compact-node-button.node-type-capstone {
      min-height: 52px !important;
      border-color: var(--hud-accent-bright) !important;
      background: radial-gradient(circle at 50% 0%, var(--hud-accent-soft), rgba(7,9,13,0.76) 65%) !important;
    }

    .compact-node-button.active,
    .compact-node-button.game-ui-controller-focus,
    .compact-node-button:focus-visible {
      z-index: 2 !important;
      opacity: 1 !important;
      filter: none !important;
      transform: translateY(-1px) scale(1.025) !important;
      border-color: var(--hud-accent-bright) !important;
      box-shadow: 0 0 0 1px var(--hud-accent), 0 0 22px var(--hud-accent-soft) !important;
    }

    .skill-tree-detail-pane {
      display: block !important;
      min-width: 0 !important;
      padding: 11px !important;
      overflow: hidden !important;
      border: 0 !important;
      border-top: 1px solid var(--hud-accent) !important;
      background: linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.16)) !important;
    }

    .skill-node-detail-title {
      display: grid !important;
      grid-template-columns: 34px minmax(0, 1fr) auto !important;
      gap: 7px !important;
      align-items: center !important;
    }

    .skill-node-detail-title > i {
      color: var(--hud-accent-bright) !important;
      font-size: 8px !important;
      font-style: normal !important;
      font-weight: 950 !important;
    }

    .skill-node-detail-title h3 {
      margin: 0 !important;
      font-size: 13px !important;
    }

    .skill-node-detail-copy {
      display: -webkit-box !important;
      margin: 8px 0 !important;
      overflow: hidden !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 4 !important;
    }

    .skill-tree-detail-pane .detail-bonus-list {
      max-height: 112px !important;
      overflow: hidden !important;
    }

    .skill-node-requirements {
      display: grid !important;
      gap: 4px !important;
      margin: 8px 0 !important;
      padding-top: 7px !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    .skill-node-requirements span {
      color: var(--menu-muted) !important;
      font-size: 8px !important;
    }

    .skill-node-requirements b {
      float: right !important;
      max-width: 64% !important;
      overflow: hidden !important;
      color: var(--menu-text) !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .tree-learn-button {
      width: 100% !important;
      min-height: 32px !important;
      margin-top: 7px !important;
    }

    /* Passive pointer hover stays visually quiet while the D-pad owns focus. */
    body[data-menu-input-mode="controller"] .panel.open .compact-path-button:hover:not(.active):not(.game-ui-controller-focus),
    body[data-menu-input-mode="controller"] .panel.open .compact-node-button:hover:not(.active):not(.game-ui-controller-focus),
    body[data-menu-input-mode="controller"] .panel.open .ability-pool-button:hover:not(.active):not(.game-ui-controller-focus),
    body[data-menu-input-mode="controller"] .panel.open .quest-title-button:hover:not(.active):not(.game-ui-controller-focus),
    body[data-menu-input-mode="controller"] .panel.open .inventory-list-row:hover:not(.active):not(.game-ui-controller-focus) {
      transform: none !important;
      border-bottom-color: rgba(255,255,255,0.06) !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .ability-management-onepage.assignment-mode .ability-hotbar-pane {
      border-top-color: var(--hud-accent-bright) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), transparent 72%) !important;
    }

    .ability-pool-button.pending-assignment {
      color: var(--hud-accent-bright) !important;
      box-shadow: inset 2px 0 var(--hud-accent) !important;
    }

    .ability-hotbar-slot.assignment-target .ability-hotbar-assign {
      border-bottom-color: var(--hud-accent) !important;
    }

    .ability-hotbar-assign.game-ui-controller-focus,
    .ability-hotbar-assign:focus-visible {
      color: var(--hud-accent-bright) !important;
      background: linear-gradient(90deg, var(--hud-accent-soft), rgba(0,0,0,0.18)) !important;
      box-shadow: inset 2px 0 var(--hud-accent), 0 0 18px var(--hud-accent-soft) !important;
    }

    @media (max-width: 1050px) {
      .skill-tree-stage {
        grid-template-columns: minmax(0, 1fr) 210px !important;
      }

      .skill-tree-path-list {
        gap: 6px !important;
      }

      .compact-path-group > span {
        display: none !important;
      }

      .compact-path-button {
        min-width: 58px !important;
      }
    }

    /* -------------------------------------------------------------------------
       ACT I WORLD MAP
       ------------------------------------------------------------------------- */

    body:not(.couch-coop-active) .panel.open #map.active {
      left: 8px !important;
      right: 8px !important;
      top: 8px !important;
      bottom: 8px !important;
      width: auto !important;
      max-width: none !important;
      max-height: none !important;
      padding: 10px 14px 44px !important;
      overflow: hidden !important;
    }

    .panel[data-owner-slot="2"].open #map.active,
    .panel[data-owner-slot="4"].open #map.active {
      left: 8px !important;
      right: 8px !important;
      top: 8px !important;
      bottom: 8px !important;
      width: auto !important;
      max-width: none !important;
      max-height: none !important;
      padding: 10px 14px 44px !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-owner-slot="1"].open #map.active,
    body.couch-coop-active .panel[data-owner-slot="3"].open #map.active {
      left: 8px !important;
      right: 8px !important;
      top: 8px !important;
      bottom: 8px !important;
      width: auto !important;
      max-width: none !important;
      max-height: none !important;
      padding: 10px 14px 44px !important;
      overflow: hidden !important;
    }

    .world-map-shell {
      height: 100% !important;
      min-height: 0 !important;
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      gap: 8px !important;
      color: var(--menu-text) !important;
    }

    .world-map-header {
      display: flex !important;
      align-items: end !important;
      justify-content: space-between !important;
      gap: 12px !important;
      padding: 0 2px 7px !important;
      border-bottom: 1px solid var(--menu-rule) !important;
    }

    .world-map-header span,
    .world-map-toggle-copy span {
      color: var(--menu-muted) !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
    }

    .world-map-header h2 {
      margin: 2px 0 3px !important;
      font-size: 24px !important;
      color: var(--hud-accent-bright) !important;
    }

    .world-map-header p {
      margin: 0 !important;
      color: var(--menu-muted) !important;
      font-size: 12px !important;
    }

    .world-map-toggle-copy {
      display: grid !important;
      gap: 4px !important;
      justify-items: end !important;
      text-align: right !important;
      min-width: 150px !important;
    }

    .world-map-toggle-copy b {
      color: var(--menu-text) !important;
      font-size: 12px !important;
    }

    .world-map-return-control {
      display: grid !important;
      gap: 5px !important;
      min-width: 210px !important;
      padding: 7px 8px !important;
      border: 1px solid rgba(241, 214, 144, 0.28) !important;
      background: rgba(5, 7, 10, 0.42) !important;
      text-align: left !important;
    }

    .world-map-return-control span {
      color: var(--hud-accent-bright) !important;
      font-size: 10px !important;
      font-weight: 950 !important;
      line-height: 1.15 !important;
      text-transform: uppercase !important;
    }

    .world-map-return-control.disabled {
      opacity: 0.58 !important;
      border-color: rgba(255,255,255,0.12) !important;
    }

    .world-map-return-control.disabled span {
      color: var(--menu-muted) !important;
    }

    .world-map-return-meter {
      height: 5px !important;
      overflow: hidden !important;
      background: rgba(255,255,255,0.08) !important;
      border: 1px solid rgba(255,255,255,0.07) !important;
    }

    .world-map-return-meter i {
      display: block !important;
      width: 0% !important;
      height: 100% !important;
      background: linear-gradient(90deg, #8fd8a2, #ffcc66) !important;
      box-shadow: 0 0 8px rgba(255, 204, 102, 0.58) !important;
      transition: width 0.05s linear !important;
    }

    .world-map-layout {
      min-height: 0 !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 330px) !important;
      gap: 14px !important;
    }

    .world-map-stage {
      position: relative !important;
      min-height: 0 !important;
      overflow: hidden !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      border-bottom: 1px solid rgba(255,255,255,0.08) !important;
      background:
        radial-gradient(circle at 18% 16%, rgba(217,173,79,0.11), transparent 24%),
        radial-gradient(circle at 82% 76%, rgba(146,56,64,0.16), transparent 28%),
        rgba(8, 12, 14, 0.68) !important;
    }

    .world-map-art {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
    }

    .world-map-base {
      fill: #162515 !important;
    }

    .world-map-region {
      opacity: 0.62 !important;
      stroke: rgba(255,255,255,0.06) !important;
      stroke-width: 1 !important;
    }

    .world-map-region.forest { fill: #203f27 !important; }
    .world-map-region.grave { fill: #39372f !important; }
    .world-map-region.ruin { fill: #34313f !important; }
    .world-map-region.riverland { fill: #224332 !important; }
    .world-map-region.mire { fill: #1e3230 !important; }
    .world-map-region.hollow { fill: #2b2d31 !important; }
    .world-map-region.corruption { fill: #4a1f21 !important; }

    .world-map-lake {
      fill: rgba(41, 92, 111, 0.74) !important;
      stroke: rgba(146, 215, 226, 0.16) !important;
      stroke-width: 3 !important;
    }

    .world-map-river {
      fill: none !important;
      stroke: rgba(37, 87, 112, 0.82) !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    .world-map-river.shadow {
      stroke: rgba(8, 22, 34, 0.62) !important;
    }

    .world-map-river-highlight {
      fill: none !important;
      stroke: rgba(162, 226, 236, 0.32) !important;
      stroke-linecap: round !important;
      stroke-dasharray: 14 20 !important;
    }

    .world-map-road {
      fill: none !important;
      stroke: #9b743e !important;
      stroke-width: 6 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    .world-map-road.under {
      stroke: rgba(31, 18, 10, 0.72) !important;
      stroke-width: 12 !important;
    }

    .world-map-road.danger {
      stroke: #7f5b39 !important;
      stroke-dasharray: 12 8 !important;
    }

    .world-map-road.travel {
      stroke: #c8a65a !important;
      stroke-dasharray: 18 7 !important;
    }

    .world-map-cliff {
      fill: none !important;
      stroke: rgba(230, 211, 164, 0.28) !important;
      stroke-width: 4 !important;
      stroke-linecap: round !important;
      stroke-dasharray: 12 10 !important;
    }

    .world-map-region-label {
      fill: rgba(238, 232, 218, 0.28) !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      paint-order: stroke !important;
      stroke: rgba(0,0,0,0.72) !important;
      stroke-width: 3 !important;
    }

    .world-map-region-label.danger {
      fill: rgba(255, 154, 122, 0.34) !important;
    }

    .world-map-marker-layer {
      position: absolute !important;
      inset: 0 !important;
      pointer-events: none !important;
    }

    .world-map-marker,
    .world-map-party-marker {
      position: absolute !important;
      transform: translate(-50%, -50%) !important;
      pointer-events: auto !important;
      display: grid !important;
      grid-template-columns: auto minmax(0, max-content) !important;
      align-items: center !important;
      gap: 6px !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--menu-text) !important;
      text-align: left !important;
      z-index: 2 !important;
    }

    .world-map-marker span,
    .world-map-party-marker {
      width: 26px !important;
      height: 26px !important;
      display: grid !important;
      place-items: center !important;
      border: 1px solid rgba(241, 214, 144, 0.52) !important;
      background: rgba(5, 7, 10, 0.78) !important;
      color: #f1d690 !important;
      font-size: 9px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
      box-shadow: 0 8px 18px rgba(0,0,0,0.42) !important;
    }

    .world-map-marker.type-boss span,
    .world-map-marker.type-keep span {
      border-color: rgba(255, 95, 95, 0.78) !important;
      color: #ff9c91 !important;
    }

    .world-map-marker.type-vendor span,
    .world-map-marker.type-fishing span,
    .world-map-marker.type-mine span {
      border-color: rgba(116, 204, 165, 0.62) !important;
      color: #9fe4c4 !important;
    }

    .world-map-marker.type-gate span,
    .world-map-marker.type-road span {
      border-color: rgba(224, 193, 110, 0.82) !important;
      color: #ffd77b !important;
    }

    .world-map-marker em {
      opacity: 0 !important;
      max-width: 190px !important;
      padding: 3px 7px !important;
      border-left: 1px solid rgba(241,214,144,0.28) !important;
      background: rgba(0,0,0,0.44) !important;
      color: #fff !important;
      font-style: normal !important;
      font-size: 11px !important;
      font-weight: 850 !important;
      white-space: nowrap !important;
      text-shadow: 0 2px 7px rgba(0,0,0,0.92) !important;
      transform: translateX(-4px) !important;
      transition: opacity 100ms ease, transform 100ms ease !important;
    }

    .world-map-marker.major em,
    .world-map-marker.active em,
    .world-map-marker:hover em,
    .world-map-marker:focus-visible em,
    .world-map-marker.game-ui-controller-focus em {
      opacity: 1 !important;
      transform: translateX(0) !important;
    }

    .world-map-marker.undiscovered:not(.major) {
      opacity: 0.5 !important;
      filter: grayscale(0.5) !important;
    }

    .world-map-marker.quest-relevant span {
      box-shadow:
        0 8px 18px rgba(0,0,0,0.42),
        0 0 0 3px rgba(255, 210, 102, 0.13),
        0 0 18px rgba(255, 210, 102, 0.20) !important;
    }

    .world-map-marker.active,
    .world-map-marker:hover,
    .world-map-marker:focus-visible,
    .world-map-marker.game-ui-controller-focus {
      transform: translate(-50%, -50%) scale(1.08) !important;
      z-index: 8 !important;
      outline: 0 !important;
    }

    .world-map-marker.active span,
    .world-map-marker:hover span,
    .world-map-marker:focus-visible span,
    .world-map-marker.game-ui-controller-focus span {
      background: linear-gradient(180deg, #f1d690, #b9832f) !important;
      color: #120f0a !important;
      border-color: rgba(255,255,255,0.56) !important;
    }

    .world-map-party-marker {
      width: 34px !important;
      height: 34px !important;
      border-radius: 50% !important;
      border-color: rgba(132, 190, 255, 0.58) !important;
      background: rgba(24, 54, 85, 0.86) !important;
      color: #dcecff !important;
      z-index: 9 !important;
    }

    .world-map-party-marker.owner {
      border-color: rgba(255, 223, 126, 0.92) !important;
      background: linear-gradient(180deg, #f1d690, #ad7526) !important;
      color: #140f08 !important;
    }

    .world-map-detail {
      min-height: 0 !important;
      padding: 16px !important;
      border-top: 1px solid var(--menu-rule-strong) !important;
      background: linear-gradient(180deg, rgba(4, 7, 11, 0.54), rgba(2, 4, 8, 0.34)) !important;
      overflow: auto !important;
    }

    .world-map-detail-head {
      display: grid !important;
      gap: 4px !important;
      margin-bottom: 12px !important;
    }

    .world-map-detail-head span {
      color: var(--hud-accent-bright) !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
    }

    .world-map-detail-head h3 {
      margin: 0 !important;
      font-size: 22px !important;
      color: var(--menu-text) !important;
    }

    .world-map-detail p {
      margin: 0 0 14px !important;
      color: #d9dde4 !important;
      line-height: 1.55 !important;
      font-size: 13px !important;
    }

    .world-map-detail-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) !important;
      gap: 0 !important;
      margin: 12px 0 !important;
      border-top: 1px solid rgba(255,255,255,0.075) !important;
    }

    .world-map-detail-grid span,
    .world-map-detail-grid b {
      padding: 8px 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.075) !important;
      font-size: 12px !important;
    }

    .world-map-detail-grid span {
      color: var(--menu-muted) !important;
    }

    .world-map-detail-grid b {
      color: var(--menu-text) !important;
      text-align: right !important;
    }

    .world-map-tags {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      margin: 13px 0 !important;
    }

    .world-map-tags span {
      padding: 4px 7px !important;
      border-left: 1px solid rgba(241,214,144,0.34) !important;
      background: rgba(255,255,255,0.055) !important;
      color: #e9d59b !important;
      font-size: 10px !important;
      font-weight: 850 !important;
      text-transform: uppercase !important;
    }

    .world-map-help {
      color: var(--menu-muted) !important;
      font-size: 12px !important;
    }

    .panel.open .runalis-menu-workspace.active {
      scrollbar-gutter: stable both-edges !important;
      overflow-anchor: none !important;
    }

    .runalis-menu-workspace,
    .runalis-menu-workspace * {
      backface-visibility: hidden !important;
    }

    .world-map-shell.static {
      min-height: 0 !important;
      position: relative !important;
    }

    .world-map-layout.static {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
    }

    .world-map-stage.static {
      min-height: 0 !important;
      height: 100% !important;
      background:
        radial-gradient(circle at 18% 16%, rgba(217,173,79,0.10), transparent 24%),
        radial-gradient(circle at 82% 76%, rgba(146,56,64,0.14), transparent 28%),
        linear-gradient(180deg, rgba(15, 20, 18, 0.92), rgba(5, 8, 8, 0.96)) !important;
    }

    .world-map-marker-layer.static {
      pointer-events: none !important;
    }

    .world-map-static-marker {
      position: absolute !important;
      transform: translate(0, -50%) !important;
      display: grid !important;
      grid-template-columns: auto minmax(0, max-content) !important;
      align-items: center !important;
      gap: 4px !important;
      pointer-events: none !important;
      z-index: 4 !important;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.82)) !important;
    }

    .world-map-static-marker span {
      width: 17px !important;
      height: 17px !important;
      display: grid !important;
      place-items: center !important;
      border: 1px solid rgba(241, 214, 144, 0.46) !important;
      background: rgba(5, 7, 10, 0.72) !important;
      color: #f1d690 !important;
      font-size: 7px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
    }

    .world-map-static-marker em {
      max-width: 190px !important;
      padding: 1px 5px !important;
      background: rgba(0,0,0,0.46) !important;
      color: #f4f1e7 !important;
      font-style: normal !important;
      font-size: 9px !important;
      font-weight: 900 !important;
      line-height: 1.15 !important;
      white-space: nowrap !important;
      text-shadow: 0 2px 5px rgba(0,0,0,0.95) !important;
    }

    .world-map-static-marker.major {
      z-index: 6 !important;
    }

    .world-map-static-marker.major span {
      width: 20px !important;
      height: 20px !important;
      border-color: rgba(255, 232, 164, 0.74) !important;
      background: rgba(7, 7, 8, 0.86) !important;
      color: #ffe39b !important;
      font-size: 8px !important;
    }

    .world-map-static-marker.major em {
      font-size: 10.5px !important;
      color: #fff4d6 !important;
    }

    .world-map-static-marker.minor {
      opacity: 0.76 !important;
    }

    .world-map-static-marker.minor em {
      max-width: 132px !important;
      font-size: 7.5px !important;
      color: rgba(237, 240, 242, 0.82) !important;
    }

    .world-map-static-marker.danger span {
      border-color: rgba(255, 95, 95, 0.78) !important;
      color: #ff9c91 !important;
    }

    .world-map-static-marker.service span {
      border-color: rgba(116, 204, 165, 0.58) !important;
      color: #9fe4c4 !important;
    }

    .world-map-static-footer {
      display: none !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 14px !important;
      padding: 10px 0 0 !important;
      border-top: 1px solid var(--menu-rule) !important;
      color: var(--menu-muted) !important;
      font-size: 11px !important;
      font-weight: 750 !important;
    }

    .world-map-static-footer b {
      color: var(--hud-accent-bright) !important;
    }

    .world-map-detail,
    .world-map-party-marker,
    .world-map-marker {
      display: none !important;
    }

    /* Regional atlas: natural proportions, terrain survey and accessible travel. */
    .world-map-shell.survey-map { grid-template-rows:auto minmax(0,1fr) auto !important; }
    .survey-map .world-map-layout.static { grid-template-columns: minmax(0,1fr) 270px !important; gap: 18px !important; min-height: 300px !important; flex: 1 !important; }
    .survey-map .world-map-stage.static { position: relative !important; background: #172422 !important; overflow: hidden !important; border: 1px solid #797252 !important; }
    .survey-viewport { position:absolute; inset:42px 0 32px; display:flex; align-items:center; justify-content:center; overflow:hidden; touch-action:none; cursor:grab; }
    .survey-viewport:active { cursor:grabbing; }
    .survey-surface { position:relative; flex:none; transform-origin:center; box-shadow:0 5px 30px #0008; }
    .survey-art { display:block; width:100%; height:100%; }
    .survey-map .world-map-marker-layer.static { position:absolute !important; inset:0 !important; pointer-events:none !important; }
    .survey-tools { position:absolute; top:8px; left:12px; display:flex; align-items:center; gap:6px; z-index:10; }
    .survey-tools button { min-width:34px; min-height:28px; padding:3px 9px !important; }
    .survey-tools span { font-size:11px; color:#aebdb2; margin-left:8px; }
    .survey-legend { position:absolute; bottom:8px; left:12px; right:12px; display:flex; justify-content:center; gap:20px; font-size:11px; color:#d1d3bb; }
    .survey-player { position:absolute; transform:translate(-50%,-170%); color:#fff3b8; font-size:19px; text-shadow:0 0 3px #000,0 0 10px #000; z-index:14; pointer-events:none; }
    .survey-stone { position:absolute; transform:translate(-50%,-50%); pointer-events:auto !important; display:grid; place-items:center; padding:4px !important; width:30px; height:34px; border-radius:50% !important; background:#203c39 !important; border:1px solid #a5dcd0 !important; z-index:9; }
    .survey-stone img { width:18px; height:24px; }
    .survey-stone span { display:none; position:absolute; top:36px; padding:4px 8px; background:#162522; color:#e0ede0; font-size:11px; white-space:nowrap; }
    .survey-stone:hover span,.survey-stone:focus-visible span,.survey-stone.selected span { display:block; }
    html body #map .survey-stone.selected { box-shadow:0 0 0 3px #c5ecd766,0 0 18px #89d7bd !important; border-color:#b9ead6 !important; }
    #map .survey-stone.selected::before { content:'▼'; position:absolute; bottom:100%; left:50%; transform:translateX(-50%); color:#ffe29a; font-size:24px; line-height:1; text-shadow:0 2px 3px #17150e; }
    .survey-map .world-map-static-marker { transform:translate(-50%,-50%) !important; gap:3px !important; }
    .survey-map .world-map-static-marker span { border-radius:50% !important; width:13px !important; height:13px !important; font-size:6px !important; }
    .survey-map .world-map-static-marker em { display:none !important; }
    .survey-map .world-map-static-marker { pointer-events:auto !important; }
    .survey-map .world-map-static-marker:hover em,.survey-map .world-map-static-marker.survey-highlight em { display:block !important; font-size:11px !important; background:#172821e8 !important; padding:3px 6px !important; font-weight:500 !important; }
    .survey-map .world-map-static-marker.survey-highlight { z-index:12 !important; filter:drop-shadow(0 0 5px #fff2b5) !important; }
    .survey-sidebar { overflow-y:auto; min-height:0; padding:12px; background:#17201bc9; border:1px solid #665f48; color:#d5d4bd; }
    .survey-sidebar h3 { margin:0 0 8px; font-size:19px; color:#c1e1d1; }
    .survey-sidebar p { font-size:12px; line-height:1.5; margin:8px 0; }
    .survey-stone-list { display:grid; gap:6px; margin:14px 0; }
    .survey-stone-list button { display:flex; align-items:center; gap:10px; min-height:42px; text-align:left; font-size:13px !important; padding:8px !important; }
    .survey-stone-list img { width:16px; height:23px; }
    .survey-stone-list button.selected { background:#335147 !important; border-color:#b0d0b6 !important; }
    .survey-travel-detail { border-top:1px solid #665f48; padding:12px 0; }
    .survey-travel-detail h4 { margin:0; color:#f0e5c1; font-size:16px; }
    .survey-travel-detail button { width:100%; min-height:44px; white-space:normal; font-size:13px !important; }
    .survey-travel-detail button:disabled { opacity:.5; cursor:default; }
    .survey-travel-status { color:#b6cfbf; }
    #map .survey-travel-status.travel-blocked { color:#ffe0a0; background:#493321; border-left:3px solid #e5bc65; padding:10px; }
    .survey-index { border-top:1px solid #665f48; padding:12px 0; }
    .survey-index summary { cursor:pointer; font-size:13px; }
    .survey-index button { display:block; width:100%; margin-top:5px; text-align:left; font-size:12px !important; }
    .survey-map button:focus-visible,.survey-index summary:focus-visible { outline:2px solid #f0db96 !important; outline-offset:3px; }
    .survey-map .nav-stone-destinations { padding:5px 0 !important; }
    .survey-map .nav-stone-destinations p { margin:3px 0; font-size:12px; }
    @media(max-width:800px) { .survey-map .world-map-layout.static { grid-template-columns:minmax(0,1fr) 210px !important; gap:8px !important; } .survey-tools span { display:none; } .survey-legend { gap:8px; font-size:10px; } }
    @media(max-width:540px) { .survey-map .world-map-layout.static { display:flex !important; flex-direction:column; overflow:auto; } .survey-map .world-map-stage.static { min-height:300px !important; } .survey-sidebar { min-height:230px; } }

    /* Player-owned couch co-op menus use the actual player viewport. */
    body.couch-coop-active .panel[data-owner-slot].open .runalis-menu-workspace.active {
      left: var(--owner-viewport-left, 0vw) !important;
      top: var(--owner-viewport-top, 0vh) !important;
      right: auto !important;
      bottom: auto !important;
      width: var(--owner-viewport-width, 100vw) !important;
      height: var(--owner-viewport-height, 100vh) !important;
      max-width: none !important;
      max-height: none !important;
      box-sizing: border-box !important;
      padding: 8px 10px 34px !important;
      background:
        radial-gradient(circle at 82% 0%, var(--hud-accent-soft), transparent 32%),
        linear-gradient(150deg, rgba(255,255,255,0.035), transparent 28%),
        #05070a !important;
      overflow: hidden !important;
      font-size: 14px !important;
    }

    body.couch-coop-active .panel[data-owner-slot].open #inventory.active,
    body.couch-coop-active .panel[data-owner-slot].open #skills.active,
    body.couch-coop-active .panel[data-owner-slot].open #character.active,
    body.couch-coop-active .panel[data-owner-slot].open #quests.active,
    body.couch-coop-active .panel[data-owner-slot].open #log.active,
    body.couch-coop-active .panel[data-owner-slot].open #map.active {
      left: var(--owner-viewport-left, 0vw) !important;
      top: var(--owner-viewport-top, 0vh) !important;
      right: auto !important;
      bottom: auto !important;
      width: var(--owner-viewport-width, 100vw) !important;
      height: var(--owner-viewport-height, 100vh) !important;
      max-width: none !important;
      max-height: none !important;
    }

    body.couch-coop-active .panel[data-owner-slot].menu-chooser .tabs {
      left: calc(var(--owner-viewport-left, 0vw) + 12px) !important;
      top: calc(var(--owner-viewport-top, 0vh) + 12px) !important;
      right: auto !important;
      max-width: calc(var(--owner-viewport-width, 100vw) - 24px) !important;
      flex-wrap: wrap !important;
      gap: 7px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"].open .runalis-menu-workspace.active {
      top: var(--owner-viewport-top, 0vh) !important;
      height: var(--owner-viewport-height, 100vh) !important;
      padding: 6px 8px 30px !important;
      font-size: 13px !important;
    }

    body.couch-coop-active .panel[data-owner-slot].open .menu-owner-badge {
      left: auto !important;
      right: calc(100vw - var(--owner-viewport-left, 0vw) - var(--owner-viewport-width, 100vw) + 8px) !important;
      top: calc(var(--owner-viewport-top, 0vh) + 7px) !important;
      min-height: 22px !important;
      padding: 3px 7px !important;
      font-size: 10px !important;
      line-height: 1.05 !important;
      z-index: 10004 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .subtabs,
    body.couch-coop-active .panel[data-compact-viewport="true"] .tabs {
      gap: 5px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .tabs button,
    body.couch-coop-active .panel[data-compact-viewport="true"] .subtabs button,
    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-controller-hints span,
    body.couch-coop-active .panel[data-compact-viewport="true"] .menu-owner-badge {
      min-height: 30px !important;
      padding: 6px 10px !important;
      font-size: 13px !important;
      line-height: 1.15 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .tabs button {
      font-size: 14px !important;
      min-height: 34px !important;
    }

    body.couch-coop-active .panel[data-owner-slot].open .menu-context-bar {
      left: 8px !important;
      right: 8px !important;
      bottom: 4px !important;
      min-height: 22px !important;
      padding-top: 4px !important;
      gap: 8px !important;
      font-size: 9px !important;
      background: linear-gradient(90deg, transparent, rgba(5,7,10,0.76) 18%) !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-owner-slot].open .menu-context-bar kbd {
      min-width: 18px !important;
      padding: 2px 4px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .subtab-bar {
      margin: 0 !important;
      padding: 0 0 5px !important;
      gap: 4px !important;
      overflow: hidden !important;
      flex-wrap: nowrap !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .subtab {
      min-height: 25px !important;
      padding: 3px 6px !important;
      gap: 4px !important;
      font-size: 10px !important;
      line-height: 1.05 !important;
      white-space: nowrap !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] #inventory.active,
    body.couch-coop-active .panel[data-compact-viewport="true"] #skills[data-skills-subtab="trees"].active {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      gap: 6px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] #skills.active:not([data-skills-subtab="trees"]) {
      overflow: auto !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-browser-layout {
      grid-template-columns: minmax(215px, 0.78fr) minmax(0, 1.22fr) !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
      border-top: 1px solid var(--menu-rule) !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-list-pane,
    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-pane {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-list-pane {
      padding-right: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-pane {
      padding-left: 10px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-list-row {
      min-height: 32px !important;
      grid-template-columns: 2px 22px minmax(0, 1fr) auto !important;
      gap: 5px !important;
      padding: 3px 5px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-list-icon {
      width: 21px !important;
      height: 21px !important;
      min-width: 21px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-list-name {
      font-size: 11px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-list-heading {
      padding-bottom: 6px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-content,
    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-empty {
      gap: 8px !important;
      padding: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-header {
      grid-template-columns: 42px minmax(0, 1fr) !important;
      gap: 8px !important;
      padding-bottom: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-header h2 {
      font-size: 16px !important;
      margin: 0 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .item-icon.inventory-detail-icon {
      width: 42px !important;
      height: 42px !important;
      min-width: 42px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-description,
    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-pane .stat-row,
    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-slot-button-copy small {
      font-size: 12px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-description {
      line-height: 1.34 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-pane .item-stats,
    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-detail-materials,
    body.couch-coop-active .panel[data-compact-viewport="true"] .inventory-legendary-effect {
      gap: 0 8px !important;
      padding: 6px 0 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-workstation {
      grid-template-columns: minmax(190px, 0.8fr) minmax(200px, 0.86fr) minmax(210px, 1fr) !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-inventory-pane,
    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-character-pane,
    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-detail-pane {
      padding: 8px 10px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-preview-card {
      grid-template-columns: 86px minmax(0, 1fr) !important;
      gap: 8px !important;
      padding: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-preview-canvas {
      width: 82px !important;
      height: 112px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-slot-grid {
      gap: 5px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .equipment-slot-button {
      min-height: 42px !important;
      padding: 5px 7px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] #skills[data-skills-subtab="trees"].active {
      grid-template-rows: auto minmax(0, 1fr) !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-workspace {
      grid-template-rows: auto auto minmax(0, 1fr) !important;
      gap: 5px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-compact-head {
      min-height: 34px !important;
      padding: 4px 6px !important;
      gap: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-compact-head small,
    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-compact-head p {
      font-size: 8px !important;
      line-height: 1.08 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-compact-head h2 {
      margin: 0 !important;
      font-size: 15px !important;
      line-height: 1.05 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-status-chips {
      gap: 4px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-status-chips span {
      padding: 3px 5px !important;
      font-size: 8px !important;
      line-height: 1.05 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-path-list {
      min-height: 29px !important;
      padding: 3px 0 !important;
      gap: 5px !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-path-group {
      gap: 2px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-path-group > span {
      display: none !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-path-button {
      min-width: 52px !important;
      min-height: 24px !important;
      padding: 3px 5px !important;
      gap: 0 4px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-path-button b {
      font-size: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-path-button span {
      font-size: 6px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-stage {
      grid-template-columns: minmax(0, 1fr) minmax(175px, 0.42fr) !important;
      gap: 6px !important;
      min-height: 0 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-node-index {
      padding: 4px 6px !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .branching-skill-tree {
      width: 100% !important;
      padding: 3px 0 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .tree-branch-row {
      grid-template-columns: repeat(var(--tree-count, 1), minmax(82px, 126px)) !important;
      gap: 12px !important;
      min-height: 35px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .tree-connection-spine {
      height: 12px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-node-button {
      grid-template-columns: 24px minmax(0, 1fr) auto !important;
      min-height: 31px !important;
      padding: 3px 5px !important;
      gap: 4px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-node-button.node-type-capstone {
      min-height: 37px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-node-button span {
      font-size: 8px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-node-button b,
    body.couch-coop-active .panel[data-compact-viewport="true"] .compact-node-button i {
      font-size: 6px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-detail-pane {
      padding: 7px !important;
      overflow: hidden !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-node-detail-title {
      grid-template-columns: 22px minmax(0, 1fr) auto !important;
      gap: 5px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-node-detail-title h3 {
      font-size: 11px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-node-detail-copy {
      margin: 6px 0 !important;
      font-size: 10px !important;
      line-height: 1.28 !important;
      -webkit-line-clamp: 3 !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-tree-detail-pane .detail-bonus-list {
      max-height: 72px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .skill-node-requirements {
      gap: 3px !important;
      margin: 5px 0 !important;
      padding-top: 5px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .tree-learn-button {
      min-height: 27px !important;
      margin-top: 5px !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .coterie-workstation {
      grid-template-columns: minmax(210px, 0.72fr) minmax(0, 1.28fr) !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .coterie-skeleton-body {
      grid-template-columns: 62px minmax(0, 1fr) !important;
    }

    body.couch-coop-active .panel[data-compact-viewport="true"] .coterie-skeleton-figure {
      transform: scale(0.82) !important;
    }

    body.couch-coop-active .panel.menu-chooser[data-owner-slot="1"] .tabs,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot="2"] .tabs,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot="3"] .tabs,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot="4"] .tabs {
      top: calc(var(--owner-viewport-top, 0vh) + 108px) !important;
    }

    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .tabs {
      width: min(330px, calc(var(--owner-viewport-width, 100vw) - 34px)) !important;
      max-width: calc(var(--owner-viewport-width, 100vw) - 34px) !important;
      gap: 10px !important;
    }

    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .tab {
      min-height: 38px !important;
      padding: 5px 0 !important;
      font-size: 22px !important;
      line-height: 1.08 !important;
    }

    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .tab:hover,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .tab:focus,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .tab.game-ui-controller-focus {
      font-size: 26px !important;
      transform: translateX(8px) !important;
    }

    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .menu-action-tab {
      margin-top: 6px !important;
      color: #ffb8b8 !important;
    }

    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .menu-action-tab:hover,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .menu-action-tab:focus,
    body.couch-coop-active .panel.menu-chooser[data-owner-slot] .menu-action-tab.game-ui-controller-focus {
      color: #ffdf9b !important;
    }

    @media (max-width: 1050px) {
      .world-map-layout {
        grid-template-columns: 1fr !important;
      }

      .world-map-detail {
        max-height: 220px !important;
      }

      .world-map-marker.major em {
        opacity: 0 !important;
      }

      .world-map-marker.active em,
      .world-map-marker:hover em,
      .world-map-marker:focus-visible em,
      .world-map-marker.game-ui-controller-focus em {
        opacity: 1 !important;
      }
    }
  `;

  document.head.appendChild(style);

  const informationStyle=document.createElement('style');
  informationStyle.id='runalis-information-styles';
  informationStyle.textContent=`
    html body .information-facts .stat-row { display:grid !important; grid-template-columns:minmax(85px,.7fr) minmax(0,2fr); align-items:start; gap:6px 12px; }
    .information-facts .stat-row > b { min-width:0; white-space:normal; overflow-wrap:anywhere; text-align:right; line-height:1.4; }
    .information-purpose { line-height:1.5; }
    .information-extra { margin:10px 0; line-height:1.45; }
    .information-extra > summary { cursor:pointer; font-weight:600; }
    .information-extra > p { margin:7px 0; }
    .information-set p { line-height:1.45; margin:8px 0; }
    .information-set h3 { font-size:14px; line-height:1.35; }
    html body .skill-tree-detail-pane .information-facts .stat-row { display:block !important; }
    .skill-tree-detail-pane .information-facts .stat-row > span { display:block; font-size:10px; opacity:.8; }
    .skill-tree-detail-pane .information-facts .stat-row > b { display:block; text-align:left; font-size:11px; }
    html body #skills .ability-detail-pane.menu-sheet-pane { display:flex !important; overflow:hidden !important; }
    html body #inventory:has(> .coterie-workstation) { display:flex !important; flex-direction:column; }
    html body #inventory .coterie-workstation { flex:1; min-height:0 !important; max-height:none !important; grid-template-rows:minmax(0,1fr); grid-template-columns:minmax(250px,.8fr) minmax(0,1.2fr) !important; }
    html body .coterie-inventory-pane { grid-template-rows:auto minmax(0,.42fr) minmax(0,.58fr) !important; }
    html body .coterie-inventory-list,
    html body .coterie-inline-detail { overflow-y:auto !important; }
    html body .coterie-skeleton-list { grid-template-rows:repeat(3,minmax(185px,1fr)) !important; overflow-y:auto !important; }
    html body .coterie-inline-detail.menu-sheet-pane,
    html body .coterie-inventory-list.menu-sheet-pane,
    html body .coterie-skeleton-list.menu-sheet-pane { display:flex !important; overflow:hidden !important; }
    html body .coterie-skeleton-list .menu-sheet-content { gap:6px; }
    html body .coterie-skeleton-list .menu-sheet-content > .coterie-skeleton-card { min-height:185px !important; }
    html body .coterie-inline-detail .inventory-detail-description { display:block !important; }
    html body .coterie-inline-detail .inventory-detail-content { padding:10px 12px !important; }
    html body .coterie-inline-detail .equipment-action-row { display:flex !important; }
    @media(max-width:1100px),(max-height:760px) {
      html body #skills .information-facts .stat-row { font-size:12px; padding:3px 0; }
    }
  `;
  document.head.appendChild(informationStyle);
}
