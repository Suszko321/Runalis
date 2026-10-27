# Runalis world audit — 27 September 2026

The starting build is a browser Canvas 2.5D RPG, not a mesh-based engine. Collision uses 32-pixel tiles; the first act draws continuous terrain features over that grid. Increasing independent light or physics objects is inappropriate here. Shared sprite atlases, visible-object culling and bounded visual wildlife fit this renderer.

## Existing geography and systems

| Area | Starting implementation | Treatment |
| --- | --- | --- |
| Echoryn Forest / Hearthmere Frontier | 640 × 480 tiles. Authored anchors for Orrakai outpost, Ashen Orchard, Pilgrim Bridge, Castle Veyr, Thornroot, Riverbend, Mirror Grove, Saltwell, Iron Hollow, Lantern Marsh, Hunter Camp, Watcher Ridge, Old Hollow and Red Seal Keep. | Preserve entrance and quest coordinates; add local authored landscapes and connecting approaches. |
| Aureate Marches / Ascension Wastes | Compact 120 × 64 regional worlds, existing progression gates, region-specific inhabitants and materials. | Retain story progression; connect destinations with a road spine, add distinctive regional props, five scenes and two Nav Stones per region. |
| Expedition roads | Separate physical route worlds with paid/story-gated transitions. | Keep expedition requirements; dress route worlds. Nav Stones do not bypass act gates. |
| Orrakai | Existing capital services, NPCs, buildings and safe spawn. | Add workyard, kitchen garden and pilgrim shelter. |
| Dungeons | Seeded room/hall layouts, floors, bosses, keys, doors, chests, traps, side rooms and puzzles. | Keep these systems and layout generation; add historical room functions, perimeter furnishings, floors and concealed offerings. |
| Infinite towers | Fixed arena floor with changing encounters. | Dress the arena perimeter while retaining central fighting space. |
| Resources | Existing regional placements and profession/tool requirements, yield bonuses and short depletion timers. | Keep base resources and access requirements; localize bonus materials and lengthen/persist depletion. |
| Enemies | Authored populations plus temporary overworld patrols and travelers. | Regionalize patrol selection, add occasional recognizable elites, register new sites and retain spawn/cleanup budgets. |
| Navigation | Continuous authored roads, signs, circular minimap, fully revealed reference world map; existing return-to-Orrakai shortcut. | Retain roads and shortcut, add earned local travel and discovery-only location markers. |
| Saving | Profile localStorage, regenerated overworld, saved dungeon state, compact overworld return record. | Add compact player world memory; regenerate dressing and reconstruct metadata after transitions. |
| Atmosphere | Region-specific visual tints and adaptive music; no complete regional weather simulation. | Add bounded rain/fog/ash, a day/night cycle and low-volume environmental cues through the existing audio mixer. |
| Survival | Food, cooking at fires, fishing, gathering tools, stamina and professions. | Use existing rations for travel, place usable hearths and appropriate materials; do not invent a competing hunger/thirst system. |

## Art

The installed library contains packed pixel-art atlases and their source images. Particularly useful groups: environment-props, props-core, plague-props, story-props, town-details, buildings-town, landmarks-modular, architecture-core, dungeon-interactables and terrain-core. These cover vegetation, masonry, wagons, infirmaries, tools, furnishings, chapels, gates, mine entrances, roots, statues and VFX. See [the full inventory](ASSET-INVENTORY.md).

The initial visual problem was not a missing terrain generator. It was a lack of strong composition between existing POIs, weak local identity, sparse room furnishings, and detail without sufficiently distinct ground plans. The second pass therefore adds landscape-scale compositions with actual routes and water collision rather than increasing scatter alone.
