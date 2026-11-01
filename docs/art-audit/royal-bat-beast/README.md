# Royal Vampire Bat Beast · 2026-10-31

Replaced the crowned geometric humanoid placeholder with a mature evolution of
the ordinary Bat Beast: deep muscular chest, heavy dark mane, thick neck,
four wings in two pairs, ivory saber fangs, talons and swept dorsal spines.
The user's subsequent distinction passes retain that build and four-wing anatomy.
The current palette is black hide/struts, blood-red membranes and mane highlights,
red eyes, and narrow antique-gold edging only. The large upper pair and smaller
lower pair form separate overlapping fans. No crown, jewelry, clothes or
artificial armor. The supplied screenshot identifies the placeholder; its text/design is
not an instruction to preserve the crown.

## Assets and scope

- Runtime: `assets/art/sprites/veyreign-royal-blood-beast.png` and matching JSON.
- [28 authored poses at 2×](poses-2x.png), [boss/native comparison](runtime.png),
  [actual boss encounter](boss-encounter.png), [compact encounter](compact-encounter.png).
- Built-in ImageGen [exact prompt](PROMPTS.md). Local transparent master:
  `assets/art/source/royal-bat-beast/master.png` (ignored authoring directory).
- Repack with `python tools/build-veyreign-royal-beast.py [master.png]`.
  Previous placeholder generator/export are backed up locally under
  `backups/royal-bat-beast-2026-10-31/`; the generator now requires authored art.
  The user-approved crimson version is separately preserved under
  `backups/royal-bat-beast-approved-crimson/` (master, export, metadata and preview).
  The previous four-wing black/gold version is preserved separately under
  `backups/royal-bat-beast-black-gold/` (master, export and metadata).
  The four-wing/gold pass changes artwork and palette metadata only; no additional
  renderer, state, frame count, timing or gameplay changes.
  The final red/black/gold-trim pass likewise changes only artwork/palette metadata.
  Rechecked the engineering gate, build, art foundation, source padding/alpha/palette,
  production royal browser and real feral boss encounter browser suites; all pass.

Seven rows retain their existing order: transformation, idle, anticipation,
execution, recovery, hit, death. Four distinct drawings per row, **28 total**,
are held/repeated across the existing 48 timing slots per row (336 cells).
Transformation/death progress once through four poses; the other rows repeat
the compact four-pose cycle. The 12 fps sampling clock, four-second transformation,
early .7-second hidden window, 1.3-second death sampling and final-frame clamp
remain. Death ends in a visible collapsed corpse rather than the old alpha fade.

Cells expand from 60×80 to 112×80 to contain the wings/tail. All states share
one source scale, a 32-color foreground palette, nearest sampling and binary
alpha. Feet/corpse bottom register at y=74. Renderer changes are restricted to
the royal branch's crop, width, centered horizontal origin and facing mirror;
the existing 3×/4× viewport-dependent boss scales and y−76×scale origin remain.
The visual footprint is deliberately wider. Collision, attacks, phases, rewards,
saves and transformation mechanics remain unchanged; ordinary Bat Beast and
player artwork are untouched by this task.

The native 112×80 export is also inspected at 1× for the future evolved summon.
This prepares reusable art; it does **not** add the future race summon ability,
progression or balance rules. The same state sheet can be sampled at native size
without taking the boss-only scale branch.

## Verification and limits

- Passing `npm run check:engineering` (11/11) and `npm run build`.
- Passing Veyreign, feral, population, and progression-fix Node suites.
- Passing art foundation: 71 sheets / 1786 cells, zero structural errors,
  eight original player-reference hashes preserved.
- Passing all 336 occupied/padded source cells, binary alpha and 32 colors.
  All shipped silhouette bounds are inset at least three pixels from cell edges.
- Passing `tools/verify-royal-bat-beast-browser.cjs`: 327 visible production
  crops plus nine deliberately hidden transformation slots, all seven states,
  existing boss scale limits and horizontal mirroring.
- Passing ordinary Bat Beast browser test: all 96 crops and mirror unchanged.
- Passing existing `tools/verify-veyreign-feral-browser.cjs`: real weapon triggers
  stage two, saved sealed transformation survives reload, royal form and blood
  waves render, compact viewport has no browser errors. Desktop and compact
  captures inspected, plus native/2× contact sheets and native summon preview.

These checks cover the replacement's structure and encounter integration, not
every combat/co-op scene or artistic approval. Compact UI overlap seen in the
existing encounter remains outside this art replacement. Four authored poses
per row are a compact animation vocabulary, not 336 unique drawings.
