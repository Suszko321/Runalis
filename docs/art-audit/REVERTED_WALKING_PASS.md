# Reverted humanoid walking pass

October 31, 2026. The director rejected the eight-pose replacement: its palette,
clothing/hip silhouette and thin limbs did not match the existing player. The
requested direction is a simple pixel-art sprite sheet with approximately three
walking frames, retaining the established art.

The replacement has been reverted. Eight runtime modules exactly match their
pre-task copies in `backups/human-walk-2026-10-31/`: `spriteArt.js`,
`humanRenderer.js`, `humanLocomotionRig.js`, `sideLegArt.js`,
`humanEquipmentSprites.js`, `armorMotionArt.js`, `meleeArmArt.js` and
`humanoidEnemies.js`. The original `verify-leg-gait.mjs` is restored.

The two new body sheets and metadata, five new walking tools, walking lab and
review directory are removed from the active project. Rejected material is
retained only under the ignored `backups/human-walk-rejected-2026-10-31/` archive.
The original player PNGs were never overwritten. No unrelated working-tree
changes were reverted.

The original waist and walking defects remain open (ART-013 / E17). Technical
test volume must not be represented as proof of artistic quality or approval.

Restoration verification: all eight runtime file hashes match the pre-task
backups. All eleven regenerated contact sheets/frame strips match the archived
before-pass PNGs byte-for-byte (1,248 original-renderer draws). Original leg-gait
and armor composition suites pass; the art validator returns to 71 sheets / 1,786
cells with eight preserved player hashes. The engineering gate passes 11/11 and
the rebuilt deployment contains the original 865 files. No replacement walking
asset or helper reference remains in active runtime source or tools.
