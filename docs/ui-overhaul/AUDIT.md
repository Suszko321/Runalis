# Runalis UI audit — September 27, 2026

Performed before theme implementation. Machine-readable companion: source-inventory.json.

| Existing surface | Owner | Treatment / fragile dependencies |
|---|---|---|
| Title, profiles, load/delete, loading | index.html, style.css, gameSave.js | Iron book cover, engraved actions; preserve IDs, confirmation and localStorage |
| Character creation, class/appearance/secret choices | characterCreator.js | Shrine preview, vellum description, chapter controls; retain hold meters and controller focus |
| Pause, save, save-and-quit | pauseMenu.js | Framed folio; runtime style injection and original actions |
| Character overview, stats, equipment | ui.js | Dark ledger and vellum details; selected stat handlers |
| Equipment, coterie, resources, loot, crafting | panelInventory.js | Three-region benchmark; 12-item pagination, hover selection, action data attributes, slot ordering, hold salvage and comparison unchanged |
| Core/class/weapon/bloodline/Fate skills, abilities | ui.js, skillTreeSystem.js | Ritual diagram, sealed bloodline accents; purchasing and loadout handlers unchanged |
| World skills/professions, survival | ui.js, survivalSkills.js | Field journal and recipe manuscript; keep levels, quantities, unlocks and fishing timing |
| Quests, completed quests, quest tracker, log | ui.js | Journal index / vellum leaf; tracking, pagination, source descriptions retained |
| World/dungeon/regional map, Nav Stones | panelWorldMap.js, minimapHud.js | Cartographer material and rune; preserve SVG map, markers, travel eligibility and hold return |
| Dialogue, history, choices, dialogue settings | dialogueUi.js, dialogueSystem.js | Canvas grimoire with readable serif prose; pointer rectangles, font scaling, high-contrast mode unchanged |
| Vendors, buy/sell, categories | shopSystem.js | Merchant ledger with parchment details; currency and offer handlers unchanged |
| Co-op join/load/create, arena results | couchCoop.js, pvpArenaSystem.js | Shared iron frame; player ownership and focus classes retained |
| HP/stamina/spirit, hotbar, cooldowns, status | ui.js, splitScreenHud.js | Compact metal sockets; preserve numeric values, player colors and cooldown layers |
| Downed/revive, notifications, discovery, boss/enemy feedback | splitScreenHud.js, presentationRenderer.js, floatingText.js | Restrained etched framing; existing timers and combat messages retained |
| Developer setup/editor | index.html, developerEditor.js | Shared typography/controls only; authoring layout preserved |

## Existing limitations, not new omissions
No independent bestiary, codex, lore library, alchemy, cooking, reputation, trade, repair, graphics/audio settings screen or death-selection screen was found. Existing lore/recipes appear in detail panels, survival professions in world skills, and death/medical/Fate recovery flows in existing game logic and dialogue. Settings and Credits title actions currently use native browser alerts; these need presentation-only modal replacements. No new content or game systems are part of this pass.

## Implementation safeguards
Runtime styles contain repeated !important overrides and IDs. The final theme uses explicit higher-specificity selectors and shared tokens without modifying display/visibility, input ownership, action attributes or hit targets. Avoid decoration on pseudo-elements already used for cooldown/progress. Decorative art is pointer-transparent. Canvas framing must save/restore drawing state and use original rectangles. Existing class accent variables remain authoritative. Reference image is art direction, not baked interactive content.

## Validation checklist
- [x] Actual profile load/save, pause/resume (isolated browser context)
- [x] All six primary menus and inventory/skill subtabs
- [x] Equipment selection/equip/pagination; upgrade/salvage actions; comparison rendering
- [x] Crafting and quantities; skill purchase
- [ ] Exhaustive ability assignment/loadout regression
- [x] Quest selection, map markers and Nav Stone travel
- [x] Vendor purchase/currency and dialogue choice hit regions
- [ ] Full dialogue branch progression
- [x] Representative keyboard, mouse and simulated controller navigation
- [x] Equipment: 1366x768, 1920x1080, 2560x1440, 3440x1440, 800x600
- [x] Rendered screenshot review; final regression run without asset failures or runtime errors
- [ ] Physical controller validation (requires hardware)
