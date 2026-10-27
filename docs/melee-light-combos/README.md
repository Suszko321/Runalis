# Melee light attack combos

All melee styles now have three authored light strikes, available from proficiency level one. Tap the normal attack trigger to begin; a tap during the active strike or its recovery can buffer the next hit. Only one continuation is buffered. The finisher rejects further queued attacks and requires a fresh press after its restart pause.

| Style | Three-strike chain | Restart pause after finisher |
| --- | --- | --- |
| Dagger | Quick Stab → Returning Cut → Crosscut | 0.24s |
| Sword | Rising Cut → Falling Cut → Crossing Cleave | 0.32s |
| Axe | Diagonal Chop → Returning Hack → Overhead Cleave | 0.40s |
| Mace | Forehand Blow → Backhand Blow → Crushing Blow | 0.38s |
| Hammer | Low Sweep → Overhead Blow → Crushing Sweep | 0.48s |
| Spear | Short Jab → Long Thrust → Sweeping Cut | 0.32s |
| Staff | Staff Swing → Returning Sweep → Driving Thrust | 0.30s |
| Scythe | Wide Reap → Returning Hook → Reaping Sweep | 0.42s |
| Unarmed | Jab → Cross → Hook | 0.24s |

Each strike has its own windup, active contact window, recovery, stamina cost, damage, and hit shape. Attack speed bonuses still shorten attacks, while the finisher restart pause remains fixed. Idle time resets the chain. Changing weapons resets the chosen style's opener and cannot skip an existing recovery pause. Failed stamina payments do not advance the chain. Co-op characters track their own recovery.

Heavy attacks keep their original source moves, charge profiles, damage, and timing. Existing mixed light/heavy finisher bonuses remain available. Ranged basic attacks retain their existing moves. Runtime combo state is excluded from saves.

The existing weapon sprites and articulated human animation renderer provide the poses. Authored motion families distinguish rising and falling cuts, backhands, thrusts, overhead blows, and scythe sweeps. Physical jabs use compact pixel streaks instead of magical line beams.

## Verification

- `tools/verify-melee-light-combos.mjs`: all item-catalogue melee weapons; nine styles at four proficiency levels; buffering and recovery; rapid controller taps and direct requests; weapon changes, stamina, hit boundaries, single hits, and save behavior; 3,348 pose samples; sixteen unchanged representative heavy move snapshots; held-trigger heavy attacks.
- `tools/verify-melee-light-combos.cjs`: production renderer contact sheets in three facings and full combat simulations with rapid taps, recorded in `rapid-taps.webm`; no missing assets or browser errors.
- Existing staff melee, combat overhaul, and progression overhaul regressions passed.

Axes, maces, hammers, and spears are supported weapon styles without current weapon-slot entries in the catalogue. Review fixtures use temporary items to exercise their production art and combat dispatch. Fixtures are not added to the game catalogue or saved profiles.
