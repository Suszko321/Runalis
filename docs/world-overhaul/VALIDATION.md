# Validation — 27 September 2026

All final automated checks below passed.

| Check | Result |
| --- | --- |
| World generation and persistence suite | PASS: 36 frontier sites, nine frontier Nav Stones, two stones in each later act; stable anchors and idempotent dressing. |
| Collision flood fill | PASS: every new landscape center, bell, landscape reward and frontier Nav Stone is reachable from the starting area. |
| Existing content protection | PASS: original quest/entrance/service/actor coordinates retained; previously passable protected centers remain passable. |
| Nav travel | PASS: undiscovered destinations, remote discovery, no rations, combat and occupied destinations rejected; valid travel consumes one ration and advances time. |
| Save memory | PASS: discoveries and resource depletion survive profile normalization; world metadata returns after dungeon transitions without saving the overworld grid. |
| Dungeon generation | PASS: seven themes, historical room purposes, concealed rewards, unique object IDs, and no duplicate dressing on resumed floors. |
| Bellwater secret | PASS: sealed before all three bells; pays exactly once after completion. |
| Browser integration | PASS: 18 production-rendered scene captures, actual map-destination button travel, actual profile-menu load, movement and interaction. No JavaScript runtime errors recorded. The test profile existed only in the isolated headless browser context. |
| Syntax/import/baseline checks | PASS: 133 JavaScript modules, 511 local imports, 15 protected gameplay files unchanged. Explicit hashes record the four authorized world integration edits alongside the earlier two recovery edits. |
| Existing recovery tests | PASS: health/stamina recovery and live combat coordinator behavior. |
| Existing handedness tests | PASS: 44 weapons, 5,632 samples, anatomical ownership and shield depth. |

Local browser scene snapshots varied from roughly 3.5–21.5 ms per render in the final run. These are individual visual-review samples under concurrent test load, not a full-game performance benchmark or a guaranteed 60 FPS result. Long-session balance, all procedural seeds, hardware gamepads and extended multiplayer sessions still need human playtesting.

See `browser-results.json` and the adjacent PNG captures. Reproduce the behavioral suite with `node tools/verify-world-overhaul.mjs`. Run the browser capture tool with `RUNALIS_NODE_MODULES` pointing to the installed Playwright packages.
