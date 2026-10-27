# Orrakai reconstruction

## Audit and implementation plan

The existing capital is a 72 × 48 tile safe map reached through the South Gate. `hubSystem.js` owns its services and NPC declarations; `worldContent.js` owns canonical dialogue, quests and POIs. The frontier and capital are separate maps. Preserve that transition, the north expedition gate, tower and arena.

`world.js` provides shared radius-based, substepped collision. `overworldMap.js` coordinates terrain, entities and expansion content. `overworldUtils.js` owns Act I anchors. `overworldTerrain.js` separates hidden collision cells from seamless terrain features. No frontier coordinates need change for the town slice.

`render.js` currently draws all objects, then actors, then selected depth overlays. Existing town facades are sprites with no interior collision. `terrainRenderer.js` already consumes raster art despite its obsolete no-image comment. `environmentArt.js`, `spriteArt.js`, `visualStyle.js` and `environmentVisualStyle.js` provide reusable scales, assets and regional palettes. Retain their furniture and character assets.

`worldAuthorship.js` adds procedural town dressing; replace its capital placement with authored locations. Keep its wilderness and dungeon work. `authoredLandscapes.js` operates only on the large frontier. `worldAtmosphereRenderer.js`, `presentationRenderer.js` and `poiPresentationSystem.js` supply weather, arrival cards and restrained lighting; preserve these.

`poiStateSystem.js` stores investigations and resolutions on the player. `poiEncounterSystem.js` keys defenders and caches by stable major POI IDs. `runalisContentExpansion.js` creates the additional entrances, narrative objects and major structures. `poiStructureArchetypes.js` selects existing exterior families. None of these content identities should change. Dungeon construction and persistence remain in `dungeonSystem.js`; cave reconstruction is deferred until Orrakai passes visual review.

Capital saves rebuild static geography in `gameSave.js` and `main.js`. Add an explicit town revision migration for obstructed/legacy positions, including cooperative players. Do not modify quests, inventory, discoveries, dungeon state or POI consequences.

Implementation sequence:
1. Record all existing capital objects and baseline screenshots/timings.
2. Centralize authored building footprints, room partitions, service placement and terrace connectors.
3. Build collision from the same definitions as rendering. Keep all gameplay-bearing IDs.
4. Render cached ground and masonry; separate interiors, walls and roofs. Fade only overlapping structures, with a local character outline fallback.
5. Integrate generated roof/wall/gate/stair atlas and reuse existing service/civic art. Pixel smoothing stays disabled.
6. Verify every interaction via radius-aware flood fill, stairs, walls, legacy migration and content identity. Exercise gameplay in an isolated browser context and compare screenshots/timings.
7. Do not expand into the frontier until the town meets the supplied concept's quality bar.

Asset decisions: KEEP characters, furniture, narrative props, service logic; REUSE forge, anvil, racks, wagons, lanterns, crates and banners; REPLACE town facades and grid-like ground; RETIRE only decorative placements superseded by the authored plan. The original declarations remain available in `hubSystem.js`.

Scale: 32 world pixels per hidden cell; actors approximately 48–56 pixels tall; doors 64 pixels wide and 72 pixels tall; walls approximately 62–74 pixels high; furniture 28–64 pixels; terrace bands span 96 world pixels. Walk levels are metadata separate from procedural terrain elevation. Cliffs block movement; authored stair corridors connect them.

## Delivered

- Seven physical buildings: Warden's Hall, Covenant Sanctuary, Counting House, Mara's Forge, Covenant Infirmary, Root & Retort, and Lamplighter's House. Each has an interior partition, two rooms, an open doorway, floor, walls, a separate roof and furniture.
- Three wards with two impassable terrace bands, four stair connectors, staggered main landings, retaining masonry, cliff faces, fortified gates, a watch deck, market stalls and caravan/relief spaces.
- A single layout source feeds collision and building rendering. `walkLevel` is separate from terrain noise; the presentation uses exposed cliff/retaining faces and stairs, not a new 3D engine or a world-coordinate projection rewrite.
- Local roof fades, camera-facing wall cutaways, exterior roof overlap detection, arch visibility masks and a temporary player outline during roof transitions. Fade state is per viewer, so one co-op view does not change another's roofs.
- Shared radius-aware collision for Orrakai walking, dashing and co-op movement. Large furniture blocks movement. Town interaction lookup rejects targets through walls.
- Static ground is cached in one approximately 13.5 MiB surface per live capital. Drawing copies only the visible portion; building layers are culled. Roofs, cutaways, lights and actors remain dynamic.
- Two generated RGBA atlases and two authoritative source-rectangle manifests in `assets/environment/orrakai/`. Runtime loads the manifests directly. Smoothing is disabled. Prompt specifications and art limitations are in `ART-NOTES.md` beside the assets.
- All 55 pre-existing gameplay-bearing town objects retain their IDs, kinds and narrative references. The 110 final objects include intentionally placed reused civic/service props. Frontier South Gate Guard and Road Scout remain in their existing frontier locations.
- Old town saves move safely to the lower ward once. Current valid positions stay put. Invalid respawn anchors recover. Tower return reconstructs roof/terrace metadata; a missing frontier return point resolves against the actual town gate object.
- Save-free review page supports colliding WASD movement, direct interior views, day/night and collision/room overlays. The minimap distinguishes stairs from walls.

## Verification

`node tools/verify-orrakai.mjs` verifies all 55 retained content records, unique IDs, all NPC/service/evidence/resource/exit anchors through a radius-aware flood fill, all seven entrances/exits, solid facades, all stairs, cliff and south wall blocking, the open gate passage, old/current save migration, through-wall interaction rejection, smithing, banking, alchemy, training, shrine restoration, six named NPC dialogues, tower round-trip and capital/frontier transitions. The final grid has 1,750 reachable actor-center cells.

`node tools/verify-world-overhaul.mjs` passes: the frontier retains 12,749 objects, 36 authored locations and nine Nav Stones; navigation, persistent harvests, fast travel, authored relic rewards, seven dungeon families, tower and regional worlds retain their existing checks.

`tools/review-orrakai.cjs` runs Edge headlessly in an isolated browser context. It captures five comparison views and seven interiors, asserts roof reveal/restoration, tests independent co-op cutaways, then launches the actual game UI with a disposable profile. It verifies banking and save results, keyboard movement, attack input, a real market purchase and Warden dialogue presentation. Test profiles never touch the user's browser profile. No browser page errors were recorded in the completed review.

Baseline and revised render timing records are in `baseline.json` and `review.json`. These are 90 warmed Canvas draw calls per view at a 1,100 × 700 canvas, **not whole-game FPS**. Baseline medians were 8.4–11.5 ms; revised medians are approximately 1 ms. Hardware/browser variance applies; dynamic game simulation is outside this measurement.

Screenshots: [market](market.png), [gate](gate.png), [guild interior](interior-guild.png), [smith interior](interior-smith.png), [sanctuary](interior-shrine.png), [real banking](gameplay-bank.png), [real market](gameplay-market.png), [Warden dialogue](gameplay-warden-dialogue.png). The original flat-town comparison is [before-market.png](before-market.png).

## Quality gate and remaining work

This is a working Orrakai environmental reconstruction, not a declaration that the supplied commercial-art target is fully met. The scene now has usable architecture, visible interiors and meaningful terrain barriers, but the composition is still more orthogonal than the concept, generated roof/stone textures are finer than the actor pixels, facade modules repeat visibly, and the perimeter needs further bespoke silhouette work. Asset scale/pixel-density cleanup and additional hand-authored architectural variation remain the next art pass.

The wider frontier, caves, dungeon chamber-ceiling reveal, new biome kits and POI exterior reconstruction have deliberately **not** been propagated. The prompt requires Orrakai to establish the visual standard first. Existing caves/dungeons continue to function with their previous presentation. This pass proves town-local occlusion rather than a universal occlusion replacement for every existing wilderness object.

Automated collision and service checks do not constitute a complete playthrough of every quest branch, controller pairing, multiplayer combat scenario or saved dungeon. The browser test covers attack input, not a hostile combat encounter inside the safe town. The existing game uses directional movement with mouse aiming; no new click-to-move mode was introduced. Published developer world overrides retain their existing precedence and may replace authored geometry in a user's browser.
