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

export function injectRunalisUiStyles() {
  if (document.getElementById('runalisUiStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisUiStyles';

  style.textContent = `
    :root {
      --panel-bg: rgba(7, 12, 21, 0.88);
      --panel-bg-strong: rgba(8, 14, 24, 0.96);
      --card-bg: rgba(12, 19, 33, 0.84);
      --card-bg-soft: rgba(15, 24, 40, 0.72);
      --line: rgba(139, 166, 214, 0.18);
      --line-strong: rgba(139, 166, 214, 0.32);
      --text: #e8edf5;
      --muted: #9facbf;
      --gold: #d9ad4f;
      --green: #73d18a;
      --blue: #6fa8ef;
      --red: #ef6f6c;
      --purple: #b68cff;
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
      pointer-events: auto !important;
      justify-self: end !important;
      align-self: end !important;

      display: grid !important;
      grid-template-columns: repeat(5, minmax(78px, 1fr)) !important;
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

      min-width: 78px !important;
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
       DEV TOOLS
       ------------------------------------------------------------------------- */

    .dev-card {
      overflow: visible !important;
    }

    .dev-item-grid {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
      max-height: 420px !important;
      overflow: auto !important;
      padding-right: 4px !important;
    }

    .dev-item-button {
      text-align: left !important;
      display: grid !important;
      gap: 3px !important;
      padding: 9px !important;
      border-radius: 12px !important;
      background: rgba(8, 13, 22, 0.9) !important;
      border: 1px solid rgba(122, 148, 191, 0.22) !important;
      cursor: pointer !important;
      color: var(--text) !important;
    }

    .dev-item-button:hover {
      border-color: rgba(217, 173, 79, 0.42) !important;
      background: rgba(17, 25, 40, 0.94) !important;
    }

    .dev-item-button b {
      font-size: 12px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .dev-item-button span {
      color: var(--muted) !important;
      font-size: 11px !important;
      font-weight: 600 !important;
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

    .unit-portrait.necromancer,
    .unit-portrait.lich {
      color: var(--purple) !important;
    }

    .unit-portrait.thornbinder,
    .unit-portrait.thornbeast {
      color: var(--green) !important;
    }

    .unit-portrait.templar {
      color: var(--gold) !important;
    }

    .unit-frame-body {
      min-width: 0 !important;
      display: grid !important;
      gap: 4px !important;
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
      grid-template-columns: 1.1fr 1fr 1fr !important;
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
       SCROLLBARS
       ------------------------------------------------------------------------- */

    .tab-panel::-webkit-scrollbar,
    .dev-item-grid::-webkit-scrollbar,
    .log-lines::-webkit-scrollbar {
      width: 8px !important;
    }

    .tab-panel::-webkit-scrollbar-thumb,
    .dev-item-grid::-webkit-scrollbar-thumb,
    .log-lines::-webkit-scrollbar-thumb {
      background: rgba(139, 166, 214, 0.25) !important;
      border-radius: 999px !important;
    }

    /* -------------------------------------------------------------------------
       RESPONSIVE
       ------------------------------------------------------------------------- */

    @media (max-width: 900px) {
      .panel {
        left: 12px !important;
        right: 12px !important;
        bottom: 12px !important;
        top: auto !important;
        width: auto !important;
      }

      .panel .tabs {
        justify-self: stretch !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      .panel.open #inventory.active,
      .panel.open #skills.active,
      .panel.open #character.active,
      .panel.open #quests.active,
      .panel.open #log.active {
        left: 12px !important;
        right: 12px !important;
        top: 96px !important;
        bottom: 104px !important;
        width: auto !important;
      }

      #unitFramesHud {
        width: 286px !important;
      }

      #combatSkillHud {
        width: calc(100vw - 32px) !important;
      }

      .character-sheet-grid,
      .ability-sheet-grid,
      .equipment-grid,
      .inventory-grid,
      .recipe-grid,
      .dev-item-grid {
        grid-template-columns: 1fr !important;
      }

      .combat-hud-slots {
        grid-template-columns: 1fr !important;
      }

      #character .subtab-bar,
      #character.active .subtab-bar {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }
  `;

  document.head.appendChild(style);
}