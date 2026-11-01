# Bat Beast mastery evolution and shared royal sprite

Implemented October 31, 2026. The new royal artwork replaces the previous royal
export for Castle Veyreign's final boss form and the player's Royal Bat Beast.
Call Bat Beast now uses that same new design with a cached silver-blue/ice-teal
allied palette. The ordinary hostile Bat Beast keeps its separate existing art.

| Call Bat Beast skill mastery | Evolution | Draw size |
| --- | --- | --- |
| 1–4 | Fledgling | 84 × 60 |
| 5–9 | Bloodwing | 98 × 70 |
| 10–19 | Elder | 112 × 80 |
| 20–49 | Royal | 126 × 90 |
| 50+ | Ancient Royal | 140 × 100 |

This is the mastery of `callBatBeast`, not the owner's class or Combat Level.
Existing mastery/progression formulas still supply combat power; the visual
milestones add no independent damage multiplier or health refill. Growth stays
bounded after the final visual evolution while combat progression continues.
Bloodstalker and Dreadwing retain their morph names and mechanics within each stage.

Milestones update a living summon through the existing summon update, preserving
its identity, current/max health, expiry, owner and recovery. Mastery persists in
the existing save system; recasting after a load restores the appropriate visual
stage. Host snapshots carry the summon’s own mastery/stage for remote presentation.
Rendering does not advance mastery or change game state. Navigation, hurtboxes,
the boss encounter, transformation timing and boss size remain unchanged.

The royal export preserves 112 × 80 cells, 48 timing slots per row, seven states,
28 distinct authored poses, a shared 32-color palette and the existing feet pivot.
The summon selects royal idle/attack/hit rows, not the old ordinary-bat crops.
Its palette variant is exported ahead of time; alpha and source artwork are preserved.

The November 1 mobile repair packs the same authored poses into four-column runtime
atlases and retains the original animation timing through source-column mapping.
The runtime royal/allied sheets are 448 × 560, avoiding the former 5,376-wide
canvas recolour. See [mobile repair and verification](../mobile-bats/README.md).

Major files: `src/batBeastEvolution.js`, `src/vampireArt.js`, summon synchronization
in `src/combat.js`, the Call Bat Beast tooltip in `src/vampireData.js`, and
`assets/art/sprites/veyreign-royal-blood-beast.png` plus its JSON metadata.
The boss already consumes this canonical asset, so no boss encounter rewrite or
save-ID migration was necessary. The older royal export is backed up locally in
`backups/bat-mastery-evolution-2026-10-31/`.

## Art provenance and reproduction

Created with built-in ImageGen using the [recorded prompt](PROMPT.md). The local
transparent master is `assets/art/source/royal-bat-evolution/master.png` (ignored
authoring directory); the final game asset is copied/packed into the workspace.
The original generated image remains in Codex's generated-images directory.

`node tools/pack-royal-bat-evolution.cjs [master.png]` extracts the 28 isolated
figures, packs them at nearest sampling and quantizes one 32-color palette. It
requires `@napi-rs/canvas`, supplied through `RUNALIS_CANVAS_MODULE` or the session's
temporary installation under `tmp/bat-evolution`. The Python royal packer now also
defaults to the new master. These are authoring dependencies, not game dependencies.

## Verification

- `verify-bat-mastery-evolution.mjs`: all threshold boundaries, bounded size at
  mastery 1,000, live updates without actor replacement or healing, four independent
  owners, persistence and recasting.
- `verify-bat-evolution-browser.cjs`: production boss/player/summon renderers share
  the intended source; summon widths 84/98/112/126/140; 5,827 changed palette pixels
  in the sampled state column with identical alpha; no page errors.
- Existing royal renderer coverage: 327 visible timing slots, nine deliberately
  hidden early-transformation slots, all seven rows and left-facing mirroring.
- Actual Veyreign encounter browser regression: weapon-triggered transformation,
  sealed save/load transition, final form, traveling waves and compact viewport.
- Vampire gameplay, engineering gate and publication build are checked alongside
  these focused regressions. Browser input is simulated, not a hardware playtest.

[Production comparison and all five evolutions](runtime.png) ·
[28 extracted native poses](poses.png)
