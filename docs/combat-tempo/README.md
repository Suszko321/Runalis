# Combat tempo and impact pass

Direct damaging skills now hit 18% harder, hold-charge attacks build 25% faster, and their cooldowns are 10% shorter. Their cast recovery animations are 20% shorter. Attack projectiles travel 15% faster while retaining their range and collision checks. Held attacks keep their existing tick cadence and upkeep.

Buffs, debuffs, healing rites, wards, summons, traps, fields, ongoing sword conjurations, and damage-over-time coefficients retain their existing values and durations. Damage gained from applying an effect more frequently is a consequence of the faster direct attack; an individual effect's ticks do not become stronger. Lifesteal still follows each class's existing actual-damage rules and healing caps.

Petalknight's Rose Eruption and Rosebite Burst now knock surviving targets away. Eruption pushes outward from the burst center; Rosebite pushes away from the player. Normal targets move 32 pixels on a tap, up to 48 at the highest charge level. Elites take 45% of that movement, other heavy targets 30%, and bosses stay anchored. Movement checks collision in small steps. Existing root, wound and Roseguard rules remain intact.

All 29 movement skill forms have at least two uses. Eighteen evasive or agile forms have three; eleven heavier rushes and leaps have two before optional charge upgrades. This includes legacy skills such as Divine Leap, Riptide Step, Grappling Hook and Voidstep Burst, as well as movement morphs. Use charges and hold-charge strength remain separate. Saving, reloading and changing morphs preserve outstanding recharge timers.

## Measured comparison

Fixed level-33, mastery-20 fixtures with unchanged gear and no passive build, stationary targets, and one uncharged cast followed for 18 seconds. Rounded damage includes normal game rounding. Charge times include the fixture's Focus handling. These are balance measurements, not frame-rate benchmarks.

| Measurement | Before | After |
|---|---:|---:|
| Rose Eruption full charge bar | 0.830 s | 0.622 s |
| Rose Eruption cooldown | 2.20 s | 1.98 s |
| Rose Eruption initial hit, one target | 55 | 65 |
| Rose Eruption initial hit, 16 targets | 880 | 1,040 |
| Rose Eruption wound, one target | 9 | 9 |
| Water Torrent full charge bar | 0.692 s | 0.519 s |
| Water Torrent cooldown | 1.80 s | 1.62 s |
| Water Torrent hit, one target | 100 | 118 |
| Holyknight Judgment Smite hit | 247 | 291 |
| Bloodhound Venom Fangs poison tail | 42 | 42 |
| Hellstalker Cinder Lance fire tail | 66 | 66 |
| Sunken Water Torrent pressure tail | 15 | 15 |
| Petal Storm, 16 targets, full duration | 2,912 | 2,912 |
| Acolyte Soul Siphon field, 16 targets | 5,648 | 5,648 |
| Sinner Hallowed Blades, 16 targets | 710 | 710 |

Raw reference damage, mastery multiplier, cost, duration and channel profile match the baseline for every one of the 227 original/morph profiles. Direct attack cooldowns changed in 99 profiles; charge time changed in 58. Healing and protection retain their own charging behavior.

## Validation

- `node tools/verify-combat-tempo.mjs`: 13 targeted checks, 227 skill profiles and 34 single-cast scenarios, including 16-target encounters. Checks exact unchanged poison, fire, thorn-wound and Sunken tails; unchanged persistent effects; actual charge input; charge depletion, independent recharge and save/load; boss/elite resistance; and walls.
- `node tools/verify-combat-tempo-browser.cjs`: actual browser rendering and controls for fully charged Rose Eruption and Water Torrent against 16 enemies, three consecutive Hellstalker evasive shots, and two Holyknight leaps. No missing resources or browser exceptions. The 16 rose targets all took damage and were pushed outward.
- `node tools/verify-remaining-subclasses.cjs`: all 29 existing subclass, morph, summon, expertise, animation and damage suites pass.
- `node tools/verify-moment-gameplay.cjs`: all 24 existing gameplay and browser suites pass, including enemy pursuit, separation, density, movement, world persistence, progression and loot.
- The 17 Fellhunter identity checks and 18 Oathkeeper identity checks also pass, including short high-tick fire versus long low-tick bleed/poison, bounded healing, and Sinner's lower focused damage than the tested specialist builds.

Testing exposed a faster legacy bolt skipping a small target between frames at 10 FPS. Its hit test now covers the complete travelled segment, checks crossed targets along that path, and clamps travel at its existing range. A dedicated regression verifies crossed targets, terrain blocking and range expiration.

Two older fixtures were updated for the intended behavior: Roseguard stacking tests put the target back after each new knockback, and the Fae stream test counts emitted projectiles rather than expecting faster shots to remain alive in the arena longer.

The isolated browser encounters confirm mechanics and visible effects. Long fights with live AI, advanced equipment, mixed multiplayer builds and subjective combat feel still benefit from hands-on playtesting. This pass makes no FPS or loading-time claims.

## Files and reproduction

The central policy lives in `src/combatTempo.js`. It changes direct hits at damage delivery, after preserving the unmodified power used for lingering effects. Shared charge and recovery helpers keep the input path and skill descriptions consistent. No skill IDs, loadouts, progression requirements or save formats changed.

- [Baseline measurements](before.json)
- [Updated measurements](after.json)
- [Targeted verification](verification.json)
- [Movement capacities](mobility.json)
- [Browser verification](browser-verification.json)
- [Charged rose burst](thornbinderThornLash.png)
- [Charged Water Torrent](hydromancerWaterTorrent.png)

The baseline was measured from the source snapshot taken immediately before this pass at `C:/Users/austi/.codex/backups/runalis-combat-tempo-2026-10-26/`. `tools/benchmark-combat-tempo.mjs` can capture another named measurement without changing the game.
