# Runalis — earth, ash and brass

The supplied adventurers, modular clothing and crimson sorcerer establish the visual identity. Warm leather, charcoal cloth, near-black contours, tarnished gold and pale steel live against quiet moss, timber and stone. Violet belongs to grave magic; holy effects use ivory/gold, water cyan, thorns muted green, eldritch red/black. Preserve existing class color semantics.

## Pixel and animation contract

- World tile: 32 px. Humanoids approximately 36–44 px wide and 60–64 px tall at normal scale. Feet remain at the existing actor origin +18 px; collision stays unchanged.
- Raster figures: 64 × 80 production cells where practical, transparent padding, bottom-center pivot. One logical pixel outline; sparse two-pixel shadow clusters. Highlight upper left. No baked floor or cast shadow.
- Directional humanoid sheets: rows south/east/north/west; columns idle/left-step/pass/right-step. Playback 8 fps. Runtime attack, block, cast, recoil and death poses read the existing animation controller. Never delay a hit to fit an image.
- Nearest-neighbor sampling. Snap draw coordinates; retain precise simulation positions. No smoothing of sprite atlases. UI text remains normally antialiased for readability.
- Quiet floors, stronger prop contours, highest contrast on actors/interactables. Decoration never implies new blocking geometry. Do not replace meaningful hazard or interaction state with a generic sprite.
- Modular gear remains driven by equipped item IDs. Never bake a weapon into the human body. Preserve appearance controls, class cosmetics, friendly identity and co-op indicators.

## Production pipeline

1. Inventory source/render path in `manifest.json`; include procedural visuals and UI.
2. Generate family source using the built-in image tool; save exact prompt and source locally. Keep references in `assets/art/reference`.
3. Process using `tools/pack-art.py`: split prescribed cells, inspect alpha/bounds, align feet, nearest-neighbor resize, pack with padding. Never overwrite source art.
4. Runtime uses a small cached atlas module and falls back to original visuals until assets are ready or if an image fails. No frame-by-frame image decoding or unbounded recolor caches.
5. Verify a contact sheet, live scene, direction/animation/equipment alignment and unchanged gameplay data. Update status honestly. Inventory coverage is not completion.

## Interface

Ink panels (#151614), parchment text (#eadbb8), muted stone (#a99e88), brass accents (#bc9556). Restrained borders and clear hover/focus. Body copy at least 14px. Keep descriptions in normal flow with scrolling at small heights. No text clipped beneath fixed preview panels. Retain all controls and accessibility labels.

## Future Acts

Extend the same atlases/configuration with explicit variants and new manifests. Keep region variation in materials, flora and lighting, rather than changing character proportions or outline weight. Review at native gameplay scale before approving any asset.
