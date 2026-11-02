# Headgear, torso and charm fitting

The Chapel Hermit's Cloth Hood used a fitted head cell with no fabric joining
its lower edge to the shoulders. The same missing cowl affected other fitted
hoods. Headgear was also drawn before cloak collars, allowing collars to obscure
the head/neck seam. The original sprite files and movement rig are retained.

Hoods now receive a small pixel cowl extending to the shoulder line. Its outline,
material, shadow and highlight are sampled from that hood cell's existing palette,
excluding the face opening. It follows the same body/head/facing/bob anchors as
the headgear. Endgame mage and archer headpieces explicitly declare cloth cowls;
knight helmets, crowns and the intentionally floating halo retain their designs.

Covered heads restore a short authored neck patch where the body crop exposes a
gap. Front/profile patches stop at the chest collar. Headgear renders after cloak
collars, before necklaces and front arms. Charm sprites are clipped to the chest
so their chains cannot paint over the chin or face. Shields and hand rings retain
their existing hand/pose behavior. NPCs and players use this same renderer.

No equipment IDs, stats, rarity rules, animation timing, save fields or original
PNG sprite sheets were changed. This is a fitting and layer-order correction.

## Verification

- `tools/verify-headgear-compatibility.mjs`: all 40 headgear items × 53 torso
  choices (including bare torso) × two body types × four head styles × four
  facings: **67,840 torso pairings**, checking that torso art cannot alter the
  head region. All 47 trinkets against every head/body/style/facing produce
  **60,160 charm pairings**, checking face preservation. Also **672 hood/cowl
  shoulder contracts** and **10,240 mixed equipment action cases** covering all
  gait frames, running, guarding, attacks and casts; actor state is unchanged.
- `tools/verify-headgear-compatibility-browser.cjs`: reproduces the old seam
  against `13dc4ea` (override with `RUNALIS_HEADGEAR_BASELINE`), then checks current
  code. The hood-only shoulder probe changes from zero to 46 opaque pixels.
  Thirty-two previews use the actual Chapel Hermit NPC appearance with mixed
  torsos, a charm, a mantle and a ring, both bodies and every facing. All 40
  headgear assets decode; no page errors. Before/after PNGs are generated locally.
- Existing first-pass (4,992 silhouette comparisons), Covenant/Last Dawn faction
  (9,984 comparisons), head/armour (48 contracts), endgame (40,296 renders) and
  168-item wearable registration suites pass. Engineering **13/13** and build pass.

The full sweep factors torso and trinket pairs rather than claiming every possible
three-item combination was inspected. Pixel contracts do not replace human review
of every outfit. Reviewed galleries cover the Hermit, mixed chest families and
representative classic/faction/endgame headgear. Native catalogue runs batch by
torso to reuse the existing bounded garment cache; an initial unbatched run was
stopped due to cache churn. Physical devices and live online transport untested.
