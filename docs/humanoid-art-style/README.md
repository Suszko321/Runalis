# Base player art style pass

The unarmoured player is the visual reference: its anatomy, pixel silhouettes, body scale, held walking frames, dark outlines and connected shading define wearable character art.

## Corrections

- All chest and leg armour families now derive their body/stride cells from the existing male or female base player sprite. Separately authored armour bodies no longer change the player's proportions, pelvis or legs. Leather, cloth and plate retain different materials and colour ramps.
- Armour sleeves, bracers and gripping gloves use small shaded pixel sprites fitted to the existing arm rig. Faction and class colours remain distinct. Leather retains exposed skin, including the player's selected skin colour.
- Helmets and hoods fit the base player's actual face height, with rounded pixel contours, cheek pieces, seams and cloth folds. Faction colours, crests and masks remain recognizable. Existing special crown/halo art stays available.
- Faction weapons and shields reuse the same authored raster family as ordinary player equipment. Wood and leather retain their material colours; metal, fittings and magic crystals carry faction colours. The flat full-body shield/weapon shapes are replaced once these assets load.
- Faction shields follow the free hand and render in front of or behind the body according to facing. They no longer leave an arm painted over the front of a detached shield.
- Tabards fit inside the torso and use restrained folds/insignia. Armour never draws a second pair of baked sleeves during attacks or casting.
- The shared art rules now explicitly describe the base player's pixel style instead of the older low-poly direction.

These are shared rendering changes, so they cover player-worn items, humanoid enemies and NPCs that use the same equipment paths. Creature anatomy and existing summon sprites remain their own designs. No item IDs, stats, loot rules, skills, hitboxes, movement speeds or save data changed.

## Review and verification

`after-preview.png` compares the reference player with leather, Last Dawn and Covenant sets in all directions. `after-all.png` includes 25 sets/roles from all seven factions. `after-movement.png` shows both body types walking and attacking. Matching `before-*` images preserve the original appearance. `browser-gallery.png` comes from the actual browser renderer.

- The unarmoured reference remains pixel-identical across 16 male/female, facing and movement renders.
- Browser checks cover all 85 wearable items: 4,080 renders across two body types, four facings and idle/walk/run/attack/block/cast. No missing assets, invalid source crops, empty renders, character mutations or browser errors.
- Mixed and partial armour: 624 underclothing-isolation checks; 48 chest/head seam checks.
- Side walking: 8,448 width samples preserve body volume. Leg gait: 1,024 native pixel renders and 1,024 composed actor cases preserve discrete frames and mirrored silhouettes.
- Humanoid identity: 72 combinations preserve heads/state. Enemy/loot checks retain 5,084 enemy records across 132 worlds and all 84 collectible faction items without gameplay changes.
- The actual game launches successfully. A warm 36-actor browser gallery is measured in `browser-verification.json`; it is a renderer measurement, not whole-game FPS.

Generated armour/arm atlases are cached and bounded at 72/48 entries. Repeated warm draws do not grow the cache. Original modified layers are preserved in `backups/humanoid-art-style-2026-10-11`.

Run `tools/review-humanoid-style.mjs` with `RUNALIS_CANVAS_MODULE` pointing to the canvas runtime, and `tools/verify-humanoid-style.cjs` with `RUNALIS_NODE_MODULES` pointing to the Playwright runtime. Reload the game to use the updated renderer; existing characters and gear need no reset.
