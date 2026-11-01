# Player wearables · first fitting pass

November 1, 2026. User-selected scope: Gravebound Helm (`graveboundHelm`),
Patched Road Leathers (`patchedRoadLeathers`), Gravebound Greaves
(`graveboundGreaves`). Veyr Rapier and Orrakai Founder's Signet retain their
existing artwork/rendering. No other wearable family is migrated in this pass.

[Before/after comparison](before-after.png) shows the same body, facing, weapon,
charm and presentation time: base / previous equipped rendering / new equipped
rendering. [Independent outfit layers](fitted-preview.png) and
[normal game screenshot](in-game.png) show the registered result. Both body types
and all four directions were visually inspected. These images are local ignored
review artifacts; the shipped raster and metadata are tracked in `assets/`.

## Fix

These chest/leg IDs previously entered the shared replacement-body path, clipping
the original torso/legs and adding separately fitted limbs/gloves. They now retain
the same base-sprite/arm rendering branches used when those slots are empty.
The original source cells, gait sampler, arm rig, weapon anchors, root motion,
collision, stance timers and action timing are unchanged.

Built-in ImageGen produced twelve directional equipment designs: open-face dark
iron helm, patched brown leather vest and strapped steel greaves over charcoal
trousers/boots. [Exact prompt](PROMPTS.md). The transparent master is preserved
locally under `assets/art/source/player-wearables/`. Packing creates separate
male/female native registrations in `player-wearables-first-pass.png`: 64×80 cells,
four direction columns, six body/item rows (24 registered surfaces), with sixteen
palette colors per authored view and binary alpha. These are garment surfaces,
not newly generated human bodies or extra walking frames.

The chest/greave surfaces transfer material RGB into the original garment regions
when the existing body-color variants are built. Original source alpha and dark
outer contours remain authoritative. Original skin/gloves are protected; the
waist and feet retain their existing coverage. Normal body/arm motion carries
the clothing, and fixed item under-colors prevent character color choices leaking
through it. Existing bounded sprite-variant caches include the selected item IDs
and art-readiness state; the small source pixel buffer is cached once.

The helm draws at native integer dimensions around the existing eye/head layout,
with independently packed female sizing. Open face and narrow cheek guards replace
the broad bright helmet panels. Hair/head selection and face artwork remain.
The dedicated path precedes generic item rendering for these IDs on the base-human
renderer only. Standalone gear and non-human summon fittings retain their existing
overlays, so removing a human overlay cannot make their armour disappear. Other
items retain their existing paths; mixed outfits are supported by the old shared
mechanisms around the fitted pieces.

## Verified

- `npm run check:engineering`: 11/11, and `npm run build`: pass.
- `verify-player-wearables-first-pass.mjs`: 4,992 exact silhouette comparisons
  across two bodies, four head styles, four directions, thirteen pose samples,
  four weapon families and three chest/leg combinations. Idle, walking, sprint,
  block, attack and cast samples retain base coverage, including weapon outlines.
  Render does not mutate actors. Per-copy item references and extreme underlying
  clothing colors also produce the intended stable outfit. Standalone/non-human
  equipment still draws all three items.
- `verify-player-wearables-browser.cjs`: original HEAD rendering versus new
  production renderer, plus normal startup and actual inventory/equip operations
  for all five screenshot items. No page errors. No real user profiles are used.
- Passing existing armour composition (432 full /192 partial comparisons),
  head fitting, native leg gait (1,024 leg +1,024 actor cases), melee rig
  (23,136 samples), and weapon stance (53 weapons) suites.
  Gravecaller evolution and sustain suites also pass after the non-human boundary check.
- New sheet: 24 occupied inset surfaces, binary alpha. All eight approved base
  player-sheet hashes remain intact.

The aggregate `verify-art-foundation.py` currently reports **24 pre-existing
errors**, covering twelve unsupported armory/projectile/compact-bat metadata
formats and their uninspected PNGs. Reproduced it from an isolated `git archive
HEAD` snapshot and compared its error list with this working copy: identical;
the new sheet adds 24 inspected cells and no errors. This audit is not claimed
green, and no assertions were removed to hide the existing format debt.

## Limits

This is the requested three-item first pass, not a claim that the full equipment
catalogue is corrected. Native masks guarantee anatomy/coverage preservation;
they do not by themselves certify artistic approval. Garment texture transfer
reuses existing animation geometry rather than authoring another human rig.
Additional unique silhouettes, loose garments, hoods, cloaks and larger armour
families require their own fitting/review. Weapons, charm design, item statistics,
rarity, upgrades, inventory IDs, save schema and progression are unchanged.
