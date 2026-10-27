# Runalis world rebuild

The playable surface is now one continent. Echoryn, the Aureate Marches, the Ascension Wastes and both former travel maps share physical coordinates. Black Pine Pass, Blackfen Basin and the southern Zarynth highway connect them. Walking across a region boundary does not rebuild the world, charge travel supplies, require a level or advance an unfinished story Act.

The implementation follows the PDF's opening amendment. Runalis actually uses a Canvas2D pixel-art camera, so the rebuild extends that renderer and its gameplay systems. It does not introduce the older directive's assumed Babylon.js engine or an unnecessary floating origin.

## Delivered boundary

- Orrakai has a modular surface wall, towers, gates, roof groups, farms and relief roads. Its detailed existing interior remains an instance. South and east entrances/exits match, and Map → Return to Orrakai works from distant locations and expeditions.
- Echoryn retains its authored forests, ravines, waterways, routes, discoveries, early quest geography and actual tree collision. New continental roads clear their own approach lanes without moving early quest landmarks.
- Every current later-region companion, service, resource identity and dungeon entrance is incorporated at a stable continental position.
- Mountain and wetland routes form alternatives. The Severed Causeway and Wastes are a northern branch; the capital highway is independently reachable through the southern watershed.
- Twenty-two new named places provide shelters, Nav Stones, grain stores, abbey courts, aqueduct remains, wetland work sites, watchposts, bridge yards and an inhabited Zarynth arrival ward. Their props use existing art and a modular pixel kit, with physical building/wall footprints.
- Zarynth's Trade Ward is playable: public market, shrine, hearth, Nav Stone and residents. The greater capital beyond its northern wall is **not built or presented as completed**. The wider continent is a geographic plan with authored routes and selected activity sites, not a claim that every intervening acre is fully detailed.

## World bible and navigation

[Continental master plan](continental-master-plan.svg) and [machine-readable world bible](world-bible.json) describe the regions, climate, factions, geography and landmarks. Coordinates are hidden authoring units; the game displays physical region names and discoveries.

| Region | Fixed ordinary encounter range | Identity and travel |
| --- | --- | --- |
| Echoryn | 1–26 | Established early woodland, burial, orchard, ridge and river subregions; existing stats retained. |
| Black Pine Pass | 12–22 | Wind-exposed pines, retaining walls, a switchback road and an alternate ridge trail. |
| Blackfen Basin | 12–24 | Reeds, willow banks, sluices, ferrymen's structures and drowned trade routes. |
| Aureate Marches | 18–42 | White-stone Covenant infrastructure, wheat terraces, pilgrimage courts and blue-glass aqueducts. |
| Severed Causeway | 30–46 | Broken holy crossings with a lower maintenance loop. |
| Ascension Wastes | 42–65 | Fractured foundations, pale civic ruins, black glass and the retained Spire approach. |
| Zarynth Heartlands | 30–55 | Freight roads, river crossings, granges and provincial watchposts. |
| Zarynth approach | 35–60 | Red roofs, customs yards and a maintained arrival ward; its public court is peaceful. |

These ranges are geographic. Existing early enemies retain their original combat statistics; later compact-map enemies receive appropriate geographic level/XP labels instead of their accidental level-one defaults. New encounters choose within the physical region's range. Player level, equipment and damage are never inputs to that choice.

Act I locations retain their old travel distances. All 32 captured quests and 181 objectives are checked against the frozen [dependency inventory](quest-dependency-audit.json). The Old Well's exact enemy/clue IDs, all eight quest dungeons, the missing Lantern Marsh discovery identity and both mandatory Chapel witnesses are covered. Old resource IDs and outputs survive; formerly unreachable river/ore targets are placed within reach of a bank or walking surface.

## Runtime and persistence

The 2,880 × 960 authoring-cell extent uses 24-cell collision/entity chunks. The original Echoryn collision cells are packed into 1.54 MB of typed data. New collision cells are generated on demand behind the existing tile-array contract. Normal single-player simulation uses at most 25 active entity chunks, preloading a surrounding ring. Nearby authored entities enter the existing AI/render loops; cosmetic foliage is deterministic and disposable.

Collision cache: 80 chunks. Ground cache: 48 surfaces. Decorative foliage cache: 64 chunks. Modular art cache: 160 pieces. Global authored entity references retain logical state but do not all run AI or render. Double precision is sufficient at the continent's 92,160-pixel width, so camera subtraction and pixel snapping provide coordinate stability without floating-origin migration.

Save schema 17 stores sparse deaths, wounded HP, claimed objects, resource timers, discoveries and loot. Stable entity identities are separate from position and residency; aliases preserve old regional harvest keys. Resource timers finish on the game clock even while their area is unloaded. Streaming/reloading cannot reroll an encounter or reward. The existing activity spawner uses authored areas and deterministic area/cycle identities, leaving quiet travel stretches. Temporary encounters may retire on the existing game clock; live nearby fights remain resident. Generated encounter snapshots are capped at 64.

Dungeon, side-zone and tower transitions store stable entrance/return metadata and rebuild the surface rather than cloning millions of cells. Final-boss return portals retain the actual entry anchor. Side-zone clear/chest state survives reload without another payout. Emergency storage recovery retains character progress and resumes safely on the surface instead of loading an instance without its geometry.

The existing Developer Mode continues editing finite source maps and publishing its stable-ID overrides. The new continent can be inspected in the separate field review page. A dedicated continent chunk editor is future tooling; the old editor's whole-map clone is deliberately kept away from virtual continental tiles.

## Verification

- [Preservation contracts](contract-verification.json): 13 groups, including quest/NPC/POI/dungeon/resource IDs, original early anchors, repeatable builds and no player scaling.
- [Runtime checks](runtime-verification.json): seven groups covering actual collision walking along all 26 authored roads; both Orrakai gates; remote map return; loaded-world streaming; guarded story arrival; stable encounters across reload; bounded repeated traversal and inactive resource recovery.
- [Access checks](access-verification.json): 1,128 interaction targets have reachable approaches, including 107 later-region targets connected to the road network. The original early-region flood covers 275,693 reachable walking cells.
- [Visual/geography checks](visual-geography-verification.json): 25 gameplay-camera views, all 26 roads sampled with a 12-pixel actor footprint, usable interaction approaches and zero browser/HTTP errors.
- [Map checks](map/browser-verification.json): discovery, Nav Stone travel, controller navigation, Return to Orrakai and three viewport sizes. The macro survey draws geography without enumerating virtual tiles.
- [Production gameplay checks](gameplay-verification.json): real game boot/load, seven regions, keyboard movement at capital coordinates, saving and local timing samples.
- Sparse persistence and instance-return suites cover 100 hydration cycles, inactive loot expiry, saved wounds/deaths, source harvest keys, a 64-snapshot bound, active fight retention, side-zone rewards, tower floor transitions and legacy migration exactly once.
- Existing regressions passed for Orrakai, seven dungeon portal themes, all 213 optional skill morphs/639 casts, 24 loot groups, 23 progression groups, enemy identity/art behavior and the 300-description UI information pass.

Timing evidence applies to headless Edge on this local host. It does not certify 60 FPS on every device, every multiplayer configuration or every later content expansion. The future greater-capital districts and unfilled off-road territory remain the next content boundary.

## Review and recovery

Run the game at `http://127.0.0.1:8768/` after refreshing. The field review at `http://127.0.0.1:8768/world-rebuild-lab.html` offers normal-scale scene views, keyboard walking, road walkthroughs, night and collision review without loading or saving player profiles.

The geography, runtime and quest audit documents capture the **pre-rebuild baseline**; this README and the verification reports describe the delivered implementation.

The pre-rebuild source/art backup is `backups/pre-world-rebuild-20261008.zip`. The project contains a `.git` directory that is not a functioning Git repository, so this work is preserved as local files and that explicit backup rather than a Git commit.
