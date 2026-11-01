# Covenant and Last Dawn wearable fitting pass

November 1, 2026. Continues the approved first-pass fitting approach for twelve
existing collectible wearables: `enemyCovenant` and `enemyLastDawn`, each with
`Helm`, `Chest`, `Legs`, `Robe`, `ScoutHelm`, and `ScoutChest` suffixes.
All IDs, stats, rarity, progression, weapons and trinkets retain their behavior.

[Before/after comparison](before-after.png): base, previous/fitted plate,
previous/fitted ceremonial, previous/fitted scout, both bodies and four facings.
Normal startup and inventory equipment captures:
[Covenant](Covenant-in-game.png), [Last Dawn](LastDawn-in-game.png).
Review PNGs and source masters remain local ignored artifacts; runtime PNG/JSON
and these notes are tracked. [Exact built-in ImageGen prompts](PROMPTS.md).

## Art and integration

The Covenant uses worn ivory steel, cream linen and restrained antique brass,
with small sun details. The Last Dawn uses blackened steel, oxblood panels,
straps and divided-sun/chevron detail. Each faction has distinct plate, ceremonial
and scout surfaces, open-face helmets and fitted hoods. Matching inventory icons
come from the same drawings rather than the previous generic SVG shapes.

Forty-eight authored directional designs become ninety-six native male/female
surfaces, with twelve matching inventory icons. The existing material-transfer
path changes garment RGB only: approved body alpha, silhouette, original gait,
weapon anchors and action timing remain authoritative. Mixed faction outfits and
per-copy equipment references are supported. Robes use fitted ceremonial fabric
panels on the existing torso; no new skirt silhouette or cloth simulation.

The focused attack comparison reproduced a remaining arm-row defect: the
unarmoured arm path still selected plate/cloth source geometry from the equipped
chest family. It now selects the base arm source when replacement armour is off.
Actual replacement armour continues selecting its material row. This corrects
the garment/anatomy boundary without changing rig calculations or movement.

Native humanoid consumers share the updated fitting path. Standalone and
non-human equipment overlays retain their existing fitting; this pass does not
claim to repaint separate authored enemy bodies, cloaks, shields or boss art.

## Evidence

- `verify-faction-wearables.mjs`: 9,984 exact silhouette comparisons across six
  kits, two bodies, four heads, four facings and thirteen idle/walk/sprint/block/
  attack/cast samples, including independently equipped and mixed-faction pieces.
  Also checks no actor mutation, per-copy references, fixed under-colors,
  replacement suppression and authored icon routing for all twelve items.
- `verify-faction-wearables-browser.cjs`: 48 previous and 64 current renders,
  visually reviewed comparison; real startup and inventory/equip operations for
  all twelve wearables, both faction outfits captured, no page errors.
- Original three-item first-pass suite: 4,992 comparisons still pass. Existing
  armour composition (432 full/192 partial), head fitting, leg gait (1,024 native
  and 1,024 actor cases), melee rig (23,136 samples), weapon stance (53 weapons),
  Gravecaller evolution and twelve-group sustain suites pass.
- Engineering gate 11/11 and build pass. Structural art audit inspects all 108
  new cells without new errors; all eight approved body-sheet hashes remain.
  Aggregate audit retains its documented 24 pre-existing metadata/coverage errors.

Visual review covers the documented production renders and in-game captures;
these checks do not certify every equipment combination or artistic approval.
