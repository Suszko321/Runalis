# Human sideways width correction — October 5, 2026

Left/right locomotion replaced the authored sleeves with an arm rig whose two
shoulders were almost at the body's centre. On the passing step, the arms folded
further into the chest. The trimmed shirt/armour source rectangles were also
being used as their final display width, rather than fitted to the resting body.
Together these reduced upper-body width by roughly a third when movement started.

`src/humanLocomotionRig.js` now keeps appropriately spaced profile shoulders and
restrains projected arm swing. `src/spriteArt.js` and `src/armorMotionArt.js` fit
the cropped torso textures to the intended body volume. The correction affects
the shared player, NPC and humanoid-enemy renderer. Head scale, hitboxes,
movement speed, damage, gear ownership and saves are unchanged. Weapon grips
continue to follow the same articulated hands.

Representative male shirt widths were about 19.6 pixels idle versus 12.5 while
walking. After correction, the tested walk phases stay about 18.2–18.8 pixels.
These numbers measure average occupied width over the upper-body band, not a
hitbox or whole-sprite bounding box.

Validation executed:

- `verify-side-walk.mjs`: 8,448 composed pixel-width samples across all eight
  identities, both body types, both side directions, shirt/leather/plate/cloth,
  and complete walk/run cycles. Also verifies continuous gait, ground contact,
  mirrored anatomy, canvas composition and attached weapon grips.
- `verify-side-walk-browser.cjs`: actual production game, isolated test profile,
  keyboard movement east/west, loaded atlases, zero browser errors.
- `verify-armor-composition.mjs`: 288 complete and 160 partial composition cases,
  no starter-clothing leakage and no actor-state mutation.
- `verify-head-armor-fit.mjs`: 48 chest/direction/pose renders preserve head area.

See [the compact pose review](human-width-after-preview.png),
[the scythe/leather review](human-width-after-scythe.png),
[all profile fixtures](human-width-after.png), and
[measured widths](human-width-after.json). The original measurements remain in
[human-width-before.json](human-width-before.json).

The subsequent [leg animation correction](LEG-GAIT-FIX.md) fixes calf/boot
texture crops, pelvis continuity and foot motion while preserving this torso
width correction. Its animated reviews show the current rendering.
