# World rebuild: geography, lore and art audit

Read-only audit of the pre-rebuild implementation, captured 8 October 2026. This document distinguishes the original geography, content catalogues and proposed geography. See README.md and the verification reports for the delivered continental implementation.

## Completion boundary supported by the existing game

The playable external world currently has five builders: Echoryn Forest (`hearthmereFrontier`, 640 by 480 gameplay tiles), Aureate Marches (120 by 64), Ascension Wastes (120 by 64), Pilgrim Road (120 by 56) and Severed Causeway (120 by 56). Orrakai is a separate town instance, with authored terraces and buildings. The caravan prologue and Mara's house are separate narrative instances. Existing dungeons and side zones remain separate destinations beneath or beside their physical entrances.

The region catalogue names additional places that the compact region builders do not instantiate individually. Saint Orvane, the Gilded Granary, Abbey of Clean Hands, Purification Hall Seven, Sky-Touched Aqueduct, City Without Names, Erased Market, Worldroot Scar and other names are important lore/design data, but should not be reported as already fully built settlements merely because they appear in `regionData.js`. Runtime Aureate currently provides its camp, quartermaster, Elian, Dusk, shrine, Purification Site, Confession Vaults, Shattered Choir, resources, four enemies and two route gates. Runtime Ascension provides its camp, Mara, Bram, Broken Network Shrine, Lightstorm Scar, Light Beneath Names, Ascension Spire, resources, four enemies and reverse gate.

Zarynth has no current region builder, town builder or services to preserve. It is the distant capital in Warden Mael's dialogue and the eastbound caravan prologue. `act1OpeningSystem.js` explicitly sends the caravan east, and `main.js` says Zarynth lies east. A distant eastern reservation is therefore supported by current lore; a new playable capital would be an expansion, not preservation of existing capital gameplay.

The complete first release boundary should therefore be Orrakai's exterior and opening preservation ring, all existing Echoryn content, both existing routes, both existing later regions and all their existing entrances. The eastern capital and intermediate provinces should be marked planned until they meet navigation, activity, art and travel review requirements.

## Existing geographical contract

`overworldUtils.js` owns the shared Act I anchors. `echorynGeography.js` owns roads, watersheds, lake basins, woodland lobes and escarpments. These already constitute an authored geography contract rather than arbitrary noise. Preserve local coordinates and stable object/quest IDs while introducing continental coordinates through an explicit region origin; do not shift one subsystem without its roads, collision, survey metadata, enemy populations and quest objects.

| Existing anchor | Local tile coordinate | Geographical role |
| --- | --- | --- |
| Orrakai South Gate / starting outpost | 14, 28 | Home approach; the existing exterior is too small to represent the town |
| Infinite Tower | 44, 27 | Nearby repeatable destination |
| Pilgrim Road gate | 48, 18 | North expedition approach |
| Blighted Grove | 76, 51 | Beginner side zone |
| Ashen Orchard | 110, 90 | Early investigation, cellar and supplies |
| Hungry Shrine | 235, 55 | Roadside Spirit work |
| Lantern Span | 250, 100 | Principal Lantern River crossing |
| Broken Chapel | 445, 72 | Main mystery, Covenant ruins |
| Castle Veyr | 565, 105 | Eastern estate and curse content |
| Thornroot Hollow | 82, 165 | Early forest dungeon |
| Riverbend Camp | 72, 204 | Southern wilderness hearth |
| Mirror Grove | 112, 270 | Thornwood water/shrine landscape |
| Saltwell Camp | 105, 355 | Fishing and food route |
| Abandoned Mine | 233, 315 | Ore and side zone |
| Lantern Marsh | 245, 325 | Raised refuge before the mire |
| Iron Mire | 285, 345 | Flooded mine descent |
| Hunter Reach Camp | 395, 160 | Hunting and eastern woodland |
| Watcher Ridge | 510, 190 | Terraced quarry/high-danger lookout |
| Old Blighted | 385, 340 | Burial region descent |
| Last Dawn Keep | 560, 390 | Act I final dungeon approach |

Do not assume catalogue-level recommendations are the final encounter balance: Castle Veyr's map metadata says level 10 while its actual major entrance says level 15. The runtime structures, enemies and quest audit should settle the authoritative values.

The Lantern River flows north to south/southwest, collecting Thorn Creek and Orchard Millrace. Ironwater is a second southern drainage. Lantern Span crosses the principal river east/west. The western Thornwood/fen road, east/west Pilgrim Road, eastern Hunter road and southern Last Dawn road give the map a real loop structure. Keep this watershed and road logic, then enlarge the surrounding region through new authored landforms rather than multiplying its old noise fields.

Existing named landscape compositions also matter: Cinder Terraces (132,124), Bellwater Cloister (278,145), Hanging Quarry (492,218), Drowned Procession (217,364), Split Caravan (175,118), Rootbound Chapel (137,187), Saltwell Mill (99,384), Oathbreakers' Court (519,371). Preserve their stable resource/relic IDs and deliberately different visual silhouettes. `FRONTIER_SCENES` adds 28 smaller workyards, caravans, gardens, refuges, graveyards and shrines; these are reusable authored content, not disposable random props.

## Proposed continental structure

Use a continental graph with regional coordinate origins and physical boundary connections. Do not allocate one enormous dense tile array. Reserve a west-to-east mainland with its oldest inhabited basin in the west, a highland divide to the north/northeast, agricultural Covenant provinces beyond that divide and distant eastern heartlands. Put the Ascension fracture on a northeastern branch of the Marches rather than silently declaring that the capital is inside the reality-erasure zone.

The important relationship is:

Orrakai basin -> Echoryn -> Black Pine Pass -> Aureate Marches -> river/provincial frontier -> eastern heartlands -> Zarynth.

The separate existing story route remains:

Aureate Marches -> Severed Causeway -> Ascension Wastes.

This retains Acts II and III as stories occurring in connected geography, while allowing a future capital route to continue east without forcing every traveler through the Act III apocalypse. The text does not establish Zarynth's relation to the Ascension Spire; avoid inventing a lore equivalence.

| Region or corridor | Position / landform | Roads and water | Distinct view composition |
| --- | --- | --- | --- |
| Orrakai Verge | Western defended plateau above a small tributary | Guarded gate lane, nearby farm service paths, short wooden bridge | Retaining walls and burgundy/ochre roofs above fields; town dominates the upper frame |
| Southern Echoryn | Foothill woodland south/east of town | Existing Blighted Road, farm millrace, opening quest spurs | Bright road verge gives way to tall staggered woodland; relief wagons become abandoned loads |
| Deep Echoryn | Older interior wooded watershed | Lantern River crossing and quiet subsidiary trails | Massive foreground trunks, dark canopy gaps and one navigable clearing; sky/water glimpses create orientation |
| Echoryn Ravines | Eroded eastern uplands | Hunter road and Watchers' Steps connect real terraces | A foreground cliff and diagonal valley reveal quarry lifts or Castle Veyr, not another uniformly flat forest |
| Ancient Echoryn | Old grave/chapel belt | Processional road and drowned stone causeways | Nave walls, water, leaning columns and exposed roots have a different mass balance from trees |
| Black Pine Pass | Northern saddle leading out of the Orrakai basin | Existing Pilgrim Road, stream headwaters, camp and checkpoint | Narrow switchback, wind-bent pines, stone milestones and an open pass crest; valley behind, white road ahead |
| Aureate Marches | Broad fertile basin beyond the divide | Maintained pilgrimage road, drainage canals, abbey/market spurs | Wheat parcels, white retaining walls, formal trees and blue glass; ordered safety and visible surveillance |
| Severed Causeway | Broken elevated route toward northeastern fracture | Existing shrine, cache, checkpoint and endpoint contracts | Interrupted arch spans, black water/void beneath, offset surviving piers and a legible warded crossing |
| Ascension Wastes | Northeastern exposed plateau | Fractured inherited road and constrained safe approaches | Empty former civic grids, pale stone, black glass, separated floating masses; lightstorm spaces alternate with shelter |
| Eastern river province | Planned east of the Marches | Large river basin, ferry or long bridge, provincial trade junction | River breadth, inhabited bank, flood terraces and distant provincial walls |
| Eastern heartlands and Zarynth | Planned far eastern terminus | Multiple provincial routes and capital supply network | City only becomes dominant within its own approach region, after substantial geographical change |

Continental distances must be measured in actual movement seconds and navigable road length. A wide map is not sufficient: an existing 640-tile road can still be crossed quickly. Reserve Zarynth several completed regional journeys east of Orrakai and keep its projection off the starting camera. Do not advertise an elapsed travel time before walking the actual route at normal player speed. A single distant skyline from Orrakai would visually contradict the requested scale.

## Orrakai exterior and early ring

Orrakai's current interior uses upper and middle terraces, Warden's Hall, Covenant Sanctuary, Counting House, forge, infirmary, apothecary and home. Its South Gate is at the lower terrace; its North Gate is at the high terrace. The overworld exterior should depict the same defended stepped plateau with two physically sensible approaches. Use an exterior footprint large enough for its interior, not a miniature single shack. A one-way exterior silhouette can still imply the internal services without constructing duplicate service NPCs.

Recommended opening sequence: South Gate arch -> maintained cart lane and guarded verge -> kitchen gardens and farmyard -> short tributary bridge -> relief marker and first thinning woodland -> blighted roadside clearing -> Ashen Orchard branch. The first usable gathering, beginner enemies and required low-level quest objects should stay on this sequence or its short safe spurs. The existing beginner grove, tower and orchard must remain nearby in measured travel time. Do not place them beyond the Lantern River or a high-level road checkpoint merely to stretch the world.

The northern approach should lead uphill to a muster yard and Black Pine Pass. Preserve the current guided expedition's supplies, permit, companion dialogue and storyline checks. If the rebuild permits adventurous players to walk across geography early, distinguish traversable public terrain from using a paid story expedition; do not falsely promise unrestricted land traversal while every edge still checks Act completion.

## Reusable art and renderer inventory

The source repository already includes dedicated Orrakai architecture/civic sheets with measured manifest rectangles, an Echoryn forest kit and landmark kit, town buildings, architecture-core, landmarks-modular, terrain-core, environment-props, town-details, plague-props and story-props. The old `docs/world-overhaul/ASSET-INVENTORY.md` predates the dedicated Echoryn kits, so it is incomplete as an inventory for this rebuild.

`environmentArt.js` provides nearest-neighbor architecture, buildings, landmarks and furniture drawing. `worldAtmosphereRenderer.js` draws forest kits, distant landmarks, town buildings, modular landmarks, natural props and story props with depth/roof fading. `majorPoiStructures.js` already groups major pieces, blockers, gate lanes, guard anchors and entrance metadata into a single contract. Reuse that pattern for composed settlements and new ruins; do not independently scatter collision, doors and visual pieces.

`echorynRenderer.js` caches 512-pixel ground cells with a 48-cell cap. Its nearby forest spatial approach and canopy fading are useful patterns for a larger world, but this is a render cache, not streamed world simulation. `terrainRenderer.js` supports authored feature roads/rivers/lakes/cliffs; visible roads render after water and bridge tiles explain collision. `orrakaiRenderer.js` uses measured architecture/civic atlas rectangles and real terrace/stair connectors. Keep nearest-neighbor rendering and integer destination coordinates throughout new pixel layers.

Orrakai's own `assets/environment/orrakai/ART-NOTES.md` acknowledges finer asset texture than actor pixel density. Do not call existing art commercially finished merely because smoothing is disabled. Ground strokes, fog ellipses, gradients, continuous foliage shears and arbitrary fractional scaling can also look smoother than the actors. For this pixel-art rebuild, use snapped sprite silhouettes and stepped terrain boundaries; make motion and atmosphere secondary enough that they do not obscure clear pixel structures.

### Kits needed or expanded

The current assets are sufficient for a convincing Orrakai/Echoryn rebuild through authored composition. They are insufficient evidence of distinct final art for a whole continent. Extend existing code-native canvas kits where possible:

- Echoryn: different oak/pine trunk silhouettes, exposed buttress roots, terraced ravine faces, boulder outcrops, farm plot boundaries, shaped river banks and modular bridge approaches.
- Aureate: white-stone canal walls, wheat parcels, formal avenue trees, abbey buttresses, checkpoint booths and blue holy-glass details; use different forms rather than tinting Echoryn green assets gold.
- Ascension: fractured piers, erased civic foundations, pale slabs, black-glass seams and suspended masonry; maintain visible support/height logic except where the horror deliberately breaks it.
- Orrakai exterior: larger wall runs, corner towers, visible retaining strata, gate passage, roof silhouette groups, supply aprons and worn service routes, using the interior kit's palette and perspective.

New continental biomes outside the finished boundary should have explicit art obligations instead of silently borrowing a recolored forest. Pixel canvas modules can supply those obligations incrementally without unsupported external asset-pack assumptions.

## Review gates for the parent implementation

1. Keep the existing POI, dungeon, route, resource and quest identifiers; compare built before/after inventories, not only catalogue lists.
2. Verify reachable gate lanes, chapel evidence, bridge islands, quarry ledges and all resource/relic interaction positions with player collision size.
3. Preserve exterior/interior return anchors and the final-boss return portal's actual entry point. Regional origins must not overwrite local return coordinates.
4. Verify every existing later-region service/companion/entrance remains accessible. Do not replace the compact worlds with empty larger rectangles.
5. Take screenshots from town, farmland, deep forest, ravine, river crossing, holy farmland and fractured causeway. Require distinct foreground/middle/background compositions, not palette-only differences.
6. Walk the opening quest route and measure travel. Measure road journeys separately from direct distance.
7. Bound render caches, visible entity queries and nearby encounter activity. Avoid global authored-dressing loops for a continental extent.
8. Show unfinished eastern capital territory as planned geography, with no clickable destination implying a built capital.

## Main source files reviewed

`regionData.js`, `regionWorlds.js`, `travelData.js`, `worldMapData.js`, `overworldUtils.js`, `echorynGeography.js`, `worldAuthorship.js`, `authoredLandscapes.js`, `act1OpeningSystem.js`, `dialogueData.js`, `storyData.js`, `hubSystem.js`, `orrakaiLayout.js`, `echorynLayout.js`, `majorPoiStructures.js`, `world.js`, `terrainRenderer.js`, `environmentArt.js`, `sceneArt.js`, `worldAtmosphereRenderer.js`, `echorynRenderer.js`, `orrakaiRenderer.js`, existing art manifests and Orrakai art notes.
