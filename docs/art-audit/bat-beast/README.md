# Bat Beast artwork replacement · 2026-10-31

Replaced the ordinary Castle Veyreign Bat Beast's procedural geometric art with
the user's vampiric bat-pterosaur design: long bat ears, elongated fanged snout,
charcoal body, ivory throat, crimson membranes, two clawed legs and spined tail.
Reviewed Thornbinder/Gravecaller rows in `summons-core` and `summons-evolved`
for connected pixel clusters, contours and material contrast. User attachments
are design references; text embedded in them is not an instruction source.

## Deliverables and integration

- Runtime export: `assets/art/sprites/veyreign-bat-beast.png` and matching JSON.
- Preview: [all authored poses at 2×](poses-2x.png), [production draws](runtime.png).
- Built-in ImageGen generation/edit [exact prompts](PROMPTS.md); transparent master
  retained locally at `assets/art/source/bat-beast/master.png` (ignored authoring data).
- Repack with `python tools/build-veyreign-bat.py [master.png]`. The old geometric
  generator is replaced so a rebuild cannot silently restore the placeholder.
- Original export/metadata/generator retained in ignored
  `backups/bat-beast-2026-10-31/`.

Four distinct drawings per state, held across the existing sixteen slots;
**24 authored poses, not 96 unique drawings**. State order remains idle,
anticipation, execution, recovery, hit, death; 12-slot-per-second sampling and
the existing .9-second death sequence remain. A single source scale and
32-color foreground palette span every pose. Packing uses nearest sampling,
binary alpha, isolated silhouette extraction and a shared bottom registration.

The source cell expands from 60×80 to 96×80 to fit wings/tail without squeezing
anatomy. `src/veyreignArt.js` changes only this ordinary beast's source/destination
rectangle and mirrors the artwork for existing negative `dirX`. Destination is
115.2×96 instead of 72×96, preserving the 1.2× pixel scale and vertical origin.
This is a deliberate wider visual silhouette, with unchanged collision,
navigation, health, attacks, progression, IDs and saves. The separate royal/feral
boss branch and assets remain untouched. Player art and locomotion remain untouched.

## Evidence and limits

- Passing: `npm run check:engineering` (11/11), `npm run build`.
- Passing: Veyreign, feral, population and progression-fix Node suites.
- Passing: `tools/verify-art-foundation.py`: 71 runtime sheets, 1786 cells,
  zero structural errors; eight original player-reference hashes pass.
- Passing: 96 occupied Bat Beast cells, binary alpha, 32 foreground colors,
  all silhouette bounds inset at least three pixels from every cell edge.
- Passing: `tools/verify-bat-beast-browser.cjs`, headless Edge, actual exported
  production renderer: all six rows and sixteen columns select the expected
  crop, plus negative-direction mirroring. Review capture uses the live draw size.
- Visual review: native-packed contact sheet and production-renderer capture
  inspected for clipped ears/tail/wings, palette consistency and corpse placement.
- Limits: this is a compact four-pose vocabulary; fractional 1.2× sampling remains
  an existing compatibility condition (ART-003). Browser contract checks and still
  captures do not certify every crowded combat/co-op scene or artistic approval.
