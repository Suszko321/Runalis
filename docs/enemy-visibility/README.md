# Overworld enemy visibility fix — 2026-10-12

Authored overworld residents reuse their entity objects when respawning. The population updater restored health and live flags but retained `visualDeath` and `visualReaction`. The renderer sampled the completed death animation indefinitely, giving it zero body opacity. Creatures became invisible; humanoids retained a few independently drawn layers but lost most body art. Chunk re-entry did not clear this state.

The reproduction used the production world, population updater, streaming activation and enemy renderer before changing either runtime module. A fresh world had body art for all 343 authored enemies. Killing and respawning representative residents reproduced the missing art with both sprite atlases and the loading fallback, isolating the fault to the respawn lifecycle.

`src/encounterPopulation.js` now clears the old death and hit presentation only after a resident passes the existing respawn conditions. `src/combatFeedbackProfiles.js` ignores stale death presentation on living actors. Actual corpses keep their death profiles and fade timing. Spawn counts, safety distances, respawn timers, AI and combat rules were not changed.

Measured nontransparent body pixels in an 80 × 34 region below the health bar:

| Enemy / art state | Healthy reference | Respawn before | Respawn after |
| --- | ---: | ---: | ---: |
| Blighted Corpse / atlas | 1,049 | 0 | 1,049 |
| Roadless Bandit / atlas | 1,238 | 340 | 1,238 |
| Blighted Corpse / fallback | 672 | 0 | 672 |
| Roadless Bandit / fallback | 1,420 | 369 | 1,420 |

After chunk unloading and re-entry, the counts still matched the healthy reference. A separate living actor deliberately given stale death state rendered identical body-region pixels to its healthy reference. All 343 authored enemies rendered visible body art in the browser coverage check. Raw results: [before](before.json), [after](after.json).

Regression coverage in `tools/verify-enemy-respawn-visibility.mjs` includes two death/respawn cycles each for a creature and humanoid, streaming re-entry, a fresh subsequent death animation, hit reactions, corpse fade timing, unchanged resident count, delayed respawn, in-view protection and boss exclusion. `tools/verify-enemy-respawn-browser.cjs` checks actual body pixels with loaded and unavailable atlases. Both suites are included in the existing performance regression gate.

The full gate completed with 19 passing suites, including combat browser checks and dense encounters. The previously documented Echoryn `lost hungryShrine` fixture failure was reproduced against the preserved original source and remains unchanged. [Full regression results](../performance/regressions/results.json).

Run `node tools/verify-enemy-respawn-visibility.mjs`. For the browser check, start `python tools/serve.py 8768`, set `RUNALIS_NODE_MODULES` to the dependency directory containing Playwright, then run `node tools/verify-enemy-respawn-browser.cjs`. The browser fixture imports production modules without starting a journey or touching player saves. `RUNALIS_EXPECT_INVISIBLE=1` is only for reproducing the old source; do not set it when validating the fix.
