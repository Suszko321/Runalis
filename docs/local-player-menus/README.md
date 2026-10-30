# Independent local co-op menus

Skills, Abilities, and Inventory now open inside the owning actor's viewport. Nearby players temporarily split while any local menu is open; closing the last menu restores the existing Join When Close / Forced Splitscreen preference. Opening menus does not pause the world. The explicit session Pause menu still pauses normally.

Each actor has a separate same-origin menu document with its own DOM, focus, selection, scrolling, and menu state. The document uses the existing UI module and the live actor's data; it does not start another game, controller poller, simulation, or save store. Both players may open different menus at once. Actor-owned input is consumed before gameplay handling, including the closing button's input edge. Other actors retain movement and combat. Parent keyboard input remains P1's even when the pointer has focused P2's document.

Compact layouts use vertical scrolling and retain equipment, consumables, ability assignment/morphs, and skill learning. The large equipment illustration is omitted; equipped slots and actions remain. Trees use a readable scrollable graph rather than shrinking the entire graph. The other existing menu sections are retained. Documents resize with their actual canvas viewport and close on death, departure, game destruction, or world replacement. Temporary splits do not modify saved camera preferences. Menu rendering updates the selected section rather than rebuilding every hidden workspace, and idle gamepads do not continually seize focus.

Inventory fixes discovered during real click testing: action buttons carrying an inventory index were incorrectly included in row-preview binding; preview binding now targets actual list rows. Hover selection is pinned to explicit click/focus within compact local menus so scrolling toward an Equip action cannot replace the selected item under the pointer. Ordinary desktop hover behaviour remains.

## Executed checks

`tools/verify-local-player-menus.cjs` tests:

1. P2 unequips/equips using real inventory buttons without changing P1.
2. P2 inventory forces split-screen, freezes only its owner, and leaves P1 movement active.
3. P1 keyboard movement and controller heavy-attack input work while P2 inventory has pointer focus.
4. P2 selects/assigns a real ability; P1's hotbar stays unchanged.
5. Existing Character, Quests, Map, Log, and Inventory sections remain reachable without replacing P2's Skills menu.
6. Both menus remain open independently; P1 navigation does not move P2 focus.
7. Closing one menu preserves the other, and closing both permits rejoining.
8. P1 learns a real skill node using only P1 progression.
9. P2 keeps moving while P1 uses the skill tree.
10. Menu bounds remain inside the owner's half at 1280×800 and 844×390; screenshots visually reviewed.
11. Menu edits persist through the existing host/P2 profile save functions.
12. Forced Splitscreen remains saved, and a world replacement cleans up menu documents.

The development game and staged package at a `/Runalis/` project path were exercised in headless Edge. No uncaught page errors occurred. Additional co-op readiness, online WebRTC, workshop, Bubble Ward persistence, and XP/revive regressions were executed. `npm run build` and `git diff --check` pass.

The older fullscreen menu fixture deliberately bypasses game boot; it now removes the startup blocker that normal boot clears. Its short-screen ability-list check exposed a list shorter than one row; compact desktop ability lists now have a minimum height sufficient for a complete row.

Physical controllers, multi-hour sessions, and every optional character customization/map-travel action inside a local menu document have not been exhaustively tested. The primary two-player inventory, skill learning, ability assignment, input ownership, saves, and camera paths above were actually executed.
