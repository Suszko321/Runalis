# Conservative waist and trouser gap fill

This pass follows the director's revised scope: fill missing pixels and aid the
existing system. No replacement sheets, new frames, palette changes, body redesign,
rig changes or timing changes. The rejected eight-pose overhaul remains reverted.

Two small runtime changes:

- `src/sideLegArt.js`: add a 12 × 3 pixel backing at the existing waist join,
  underneath the original leg frame. Its color is sampled from that frame's
  already-tinted trousers. Original opaque leg pixels draw over it unchanged.
- `src/humanEquipmentSprites.js`: stop glove removal after source row 56,
  matching the existing bare-leg mask. Rows 57–62 contain valid trouser pixels
  that were being discarded. Their original material shading is retained.

[Before/after comparison](waist-gap-fill-comparison.png) includes complete figures
and enlarged waist details. The image is local review output and ignored by Git.

Verification: 512 browser comparisons across both bodies, four heads, east/west,
walk/run, all four existing gait keys and base/chest-only/legs-only/full armor.
All 8,960 changed pixels add previously missing coverage; existing opaque pixels
are unchanged, and the rest of each figure matches exactly. No invalid source
crops, actor mutations or browser errors. Native checks additionally cover cloth,
leather and plate; the original leg-gait and armor isolation assertions remain.
The leg-gait suite passes 1,024 native and 1,024 composed cases; 624 armor
isolation comparisons and 9,472 handedness samples pass. The art validator
confirms the eight original player PNG hashes. Engineering checks pass 11/11,
and the build succeeds with the same 865-file deployment inventory.

`tools/verify-leg-gait.mjs` now checks that the backing cannot alter existing leg
pixels, escape its small join or introduce colors absent from the original leg
render. No artwork PNG was edited. This is a gap repair, not a claim that the
broader animation quality has been redesigned or perfected.
