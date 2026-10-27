# Echoryn Forest reconstruction

Act I now uses authored geography shared by terrain rendering, collision and mapping. The proof corridor was implemented and visually inspected first, then the regional branches were composed around retained story content. The reconstruction keeps Runalis's high camera, combat systems, separate Orrakai hub, quests, branching POIs, regional encounters and dungeon transitions.

Open [the screenshot review](index.html), [the master geography plan](master-layout.svg), or [the save-free field review](../../world-lab.html?scene=Echoryn%20%C2%B7%20Hollow%20Road). Use **Walk Hollow Road** for the real-time Orrakai-to-orchard journey; WASD cancels the guided walk and gives control. The local server is `http://127.0.0.1:8766/`, launched with `python tools/serve.py`.

## Geography and journeys

`echorynGeography.js` supplies fourteen routes, four waterways, four backwaters, eight stair-connected escarpments, eleven overlapping regional lobes and nine impassable forest masses. Road and river positions are deterministic authored polylines. Texture, foliage variation and resources operate inside this geography. Major identity anchors remain centralized in `overworldUtils.js`; scene offsets and moved descents are centralized in `echorynScenes.js`. The existing 640 × 480 tile envelope remains for save/content compatibility; unused envelope space does not decide the journeys.

- Orrakai's maintained apron transitions into a winding Hollow Road, relief wagons, damaged shelter, warning bell, root milestones and an orchard terrace. The orchard has a farmhouse, shed, working yard, four agricultural rows, irrigation furrows, fences, quarantine supplies, graves, cellar and sluice route.
- Thornwood has layered oak forest, natural root entrances, ledges, swallowed stone and quiet grove spaces. The Hollow Elk has an off-road clearing with its retained offering, natural perimeter and a short game trail. Briar Den uses brambles, fallen timber, remains and the existing enemy/cache contracts.
- Pilgrim Road crosses a continuous Lantern River on a wide stone bridge with an exposed arched foundation. The crypt descends from the western bank. Relief NPCs and investigation evidence occupy bank bays; the ambush and guards occupy the eastern approach. Gravefields remain open, with restrained burial materials.
- Broken Chapel has a roofless nave, exposed older foundation, physical side walls, courtyard, graveyard, relief ruins and separate clue/outcome bays. Veyr has an estate approach, hamlet remnant, cemetery, elevated perimeter and a distinctive spired keep.
- Hunter Reach uses pines, work areas and camp shelters. Watcher Ridge has two physical escarpments, stair routes, a vault station, watch pillars and small distant landmark cues at the overlook.
- Riverbend is a crossing/rest camp; Saltwell is a fishery with shelters, racks, nets and a physical backwater pier. Riverbanks have reeds and wet margins. Lantern Marsh has raised refuge lights; Iron Mire descends toward flooded mining timber, ore stores, chains and the retained mine entrance.
- Old Hollow uses dead old-growth forest, burial monuments and an ancient threshold. The Last Dawn road has organized banners and stores, ritual infrastructure and the fortified Red Seal complex. Its squat militarized citadel differs clearly from Veyr's silhouette. Infinite Tower and the expedition gate retain their existing restrained/fortified complexes.

All nine requested micro-POIs have visible authored compositions: Hollow Elk Grove, Briar Den, Abandoned Caravan, Pilgrim Road Ambush, Bandit Road Camp, Grave Mound, Mire Watchpost, Old Hollow Den and Red Seal Ritual Site. Their scene placements resolve from retained marker/encounter IDs. Eight previously authored landscapes and all thirty-six authored location records survive.

## Content audit and save compatibility

[The pre-reconstruction inventory](content-before.json) contains 12,749 objects and 321 enemies. The verification compares 247 protected narrative/transition contracts and 200 authored encounters, and separately asserts that every nondecorative, non-`wild-` baseline object still exists. IDs, NPC/dialogue references, quests, POIs and dungeon identities remain stable. Presentation scatter was replaced; procedurally generated `wild-` resources regenerate under the new ecology. Named resource IDs remain, including the Rootbound Chapel supply that needed a valid bank position after the watershed changed.

The current reconstructed world contains 2,703 objects, 6,360 spatially indexed trees, nine forest barriers and nine Nav Stones. Forest barriers protect retained interactions and encounters with clearings and exits. Individual trees collide at their trunks; small frontier buildings collide at their perimeter walls with an open south doorway. Cliffs block travel except at real connectors. Fishing nodes now sit near actual water.

| Retained entrance ID | Destination / physical integration |
| --- | --- |
| `ashenOrchardCellarEntrance` | Ashen Orchard Cellar, farmhouse threshold |
| `orchardSluiceShortcut` | Ancient Sluice Descent, orchard irrigation route |
| `thornrootDungeonEntrance` | Thornroot Hollow, natural root arch |
| `mirrorGroveUnderrootEntrance` | Mirror Grove Underroot, root/stone threshold |
| `pilgrimCryptEntrance` | Pilgrim Crypt, lower western bridge bank |
| `watcherRidgeVaultEntrance` | Watcher Ridge Vault, watch-station descent |
| `oldHollowDungeonEntrance` | Old Hollow Dungeon, ancient burial threshold |
| `ironMireDungeonEntrance` | Abandoned Iron Hollow, drowned mine yard |
| `emberVeilLairEntrance` | Red Seal Keep / Last Dawn descent, inside the fortified complex |
| `castleVeyrOverworldEntrance` | Castle Veyr, additional existing Act I dungeon |
| `hearthmere-hollow-grove` | Hollow Grove side zone |
| `hearthmere-abandoned-mine` | Abandoned Mine side zone |
| `infinite-tower-entrance` | Infinite Tower |

Both orchard and chapel resolution-conditioned prop sets were checked for mutually exclusive visibility across every existing outcome. Existing NPC changes, clues, caches and encounter state continue through the original systems. Local presentation does not advance POI state.

Layout revision 1 migrates legacy/invalid overworld player and co-op positions onto a nearby valid road, with safe Orrakai recovery if needed. Inventory, quests and POI progression survive. Static terrain, tree buckets, discovery metadata and Nav Stones are rebuilt for profile loading and surface returns. Dungeon/town/tower/side-zone return paths carry the environmental runtime data instead of restoring an incomplete visual world. Legacy return snapshots use the new terrain rather than reviving the old geographic layout.

## Art and visibility

Two raster atlases were created with OpenAI's built-in image generation tool, visually inspected, packed to nearest-neighbor sprite cells with binary alpha, and installed in the game. Originals remain preserved. `pack-art.py` now records tight per-sprite source rectangles as well as occupied bounds.

| Kit | Installed assets | Saved source and prompt |
| --- | --- | --- |
| Forest kit | [16 variants](../../assets/art/sprites/echoryn-forest-kit.png): oak/pine/dead trees, cliff modules, root arch, log, boulder, thorn wall, reeds, mine support | [Source](../../assets/art/source/echoryn-forest-kit.png), [exact prompt](../../assets/art/source/echoryn-forest-kit-prompt.txt) |
| Landmark kit | [6 architecture modules](../../assets/art/sprites/echoryn-landmark-kit.png): Veyr, Red Seal, chapel, vertical wall, bridge arches, crypt | [Source](../../assets/art/source/echoryn-landmark-kit.png), [exact prompt](../../assets/art/source/echoryn-landmark-kit-prompt.txt) |

Orrakai's stone/paving/stair materials and existing narrative props are reused where appropriate. Forest variants supply the wilderness silhouettes. Veyr and Red Seal now have different architectural identities. Visual review corrected exposed fallback stair stripes, flat partial cliff runs, fortress wall gaps, scale, repeated generic keep silhouettes, orchard/bridge crowding and coarse shore margins.

Nearby canopies fade locally while their trunks remain readable. Large structures also fade locally over the player; this is per-view rendering state. Forest trees use 512-pixel spatial buckets; ground surfaces use a viewport cache capped at forty-eight 512 × 512 chunks. The renderer draws nearby tree detail without rendering thousands of offscreen trees.

Regional resource pools, encounter families, existing temporary events, weather, ambient life and audio remain active. Regional ecology follows the new geography. Night has a stronger readable moonlit tint and restrained local hearth/Nav Stone light. POI discovery distance varies by location scale; undiscovered POIs are filtered from the minimap. The survey map traces actual collision terrain, including forest walls, and retains fog, discovered-place filtering and Nav Stone travel.

## Validation and visual evidence

- `node tools/verify-echoryn.mjs` — PASS. Protected identities, all authored encounters, every named resource/content object, reachable interaction anchors, all major landmarks/Nav Stones, actual enemy footprints, all route samples, forest/cliff barriers, fishing banks, outcome props, legacy migration, profile application and dungeon/town round trips. The radius-12 flood reaches 274,275 actor cells.
- `node tools/verify-echoryn-followers.mjs` — PASS. The actual `updateSummons` routine follows eight walks: Hollow Road, Pilgrim Road, Hunter Road, ridge shortcut, irrigation shortcut, farmhouse doorway, crypt bank and root arch. Final skeleton separation is 32–56 pixels; largest transient separation is 171 pixels. Combat enemies are removed for this focused follower test.
- `node tools/verify-world-overhaul.mjs`, `node tools/verify-map-exploration.mjs`, `node tools/verify-orrakai.mjs`, `node tools/verify-enemy-visibility.mjs` — PASS. Existing landscapes, exploration persistence, co-op survey isolation, Orrakai content/geometry and enemy visibility behavior remain valid.
- `tools/review-echoryn.cjs` — headless Edge with a disposable browser context. The live **Walk Hollow Road** reached Ashen Orchard; direct shared collision traversal passed with radius-12 footprints, and node traversal passed radii 10/12/16. Keyboard movement, actual-game profile loading, attack input, saving and reload succeeded. [Browser results](review.json) record no page errors.
- `tools/review-echoryn-map.cjs` — PASS. The actual game menu rendered the full-reveal QA survey at approximately 995 × 746 pixels, with forest paths, nine Nav Stones, twenty-seven known markers and functioning zoom. [Map results](map-review.json), [survey screenshot](survey-map.png). Full reveal exists only in this disposable QA profile.

Browser capture commands use `RUNALIS_NODE_MODULES` pointing to the installed Playwright dependency directory. `node tools/draw-echoryn-layout.mjs` regenerates the master SVG from the shared geography. The screenshot gallery supports hiding names for the regional identity comparison.

Mandatory region captures: [Hollow Road](hollow-road.png), [Thornwood](thornwood.png), [Ashen Orchard](ashen-orchard.png), [Pilgrim Bridge](pilgrim-bridge.png), [Broken Chapel](broken-chapel.png), [Castle Veyr](castle-veyr.png), [Riverlands](riverlands.png), [Iron Mire](iron-mire.png), [Watcher Ridge](watcher-ridge.png), [Old Hollow](old-hollow.png), [Red Seal Keep](red-seal-keep.png). Additional inspection includes [chapel nave](chapel-nave.png), [Veyr courtyard](castle-courtyard.png), [Red Seal courtyard](keep-courtyard.png), [night](hollow-road-night.png), [canopy fading](canopy-readability.png), [Hollow Elk](hollow-elk-grove.png), [Briar Den](briar-den.png), [caravan](caravan-wreck.png), [ritual site](ritual-site.png), and [Saltwell pier](saltwell-dock.png).

The benchmark measures warmed renderer calls at 1100 × 700, with forty-five samples per region; the JSON contains per-scene medians and p95. The final run measured median draw times of approximately 0.6–1.6 milliseconds, with the highest regional p95 at 2.0 milliseconds. These are draw-call timings, not whole-game FPS or hardware-independent performance guarantees. The cache remained within its forty-eight-chunk limit.

## Remaining quality limits

The authored reconstruction and preservation checks are implemented. The screenshots still show room for a further art pass: more natural bank contours, less regular paving/courtyard seams, richer transition ground shapes, and more bespoke farm/mining architecture. This is a substantial environmental rebuild, not a claim that every screenshot has reached a finished commercial-art bar.

Dungeon interiors retain their existing construction and content. This work rebuilds their overworld placement and threshold integration. No exhaustive manual playthrough of every Act I combat encounter, quest branch, full co-op party or hardware configuration was performed. Automated branch/route tests and targeted browser play establish the coverage described above; they do not replace that final campaign playtest.
