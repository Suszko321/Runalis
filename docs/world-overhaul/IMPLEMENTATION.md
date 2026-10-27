# World and dungeon overhaul

## Places to explore

Eight new authored landscapes occupy the existing frontier. Their anchors and routes are stable across new runs.

| Place | Tile anchor | What to look for |
| --- | --- | --- |
| Cinder Terraces | 132, 124 | Irrigation spine, stone retaining beds, living and burned orchard rows, abandoned cottage and harvest supplies. |
| Bellwater Cloister | 278, 145 | Flooded courtyard, surviving columns, plank walks and three island bells. Sound all three to release the choir offering. |
| Hanging Quarry | 492, 218 | Cut stone faces, descending haul rails, abandoned cart, mine mouth and workers’ refuge. |
| Drowned Procession | 217, 364 | Half-submerged statues facing a ruined chapel, raised walkways, reeds and a lost supply wagon. |
| Split Caravan | 175, 118 | Four differently positioned wagons, spilled medicine, dead livestock and a trail to the survivors’ cache. |
| Rootbound Chapel | 137, 187 | A tree occupying the nave, surviving column lines, roots through the processional floor and tended candles. |
| Saltwell Mill | 99, 384 | Millrace, sluice, drying yard, workers’ buildings and river materials. |
| Oathbreakers’ Court | 519, 371 | A ring of weathered statues, monumental seal, broken precinct walls and concealed offerings. |

These join 28 frontier micro-locations, five compositions in each later act region and each expedition route, and three new Orrakai work/living areas. Twelve reusable compositions provide logging, pilgrimage, caravan, burial, quarry, garden, fishing, ritual, relief, ruined dwelling, workshop and barracks scenes.

Nine ecology profiles vary vegetation, harvest bonuses, weather and ambient life. Vegetation groups use deterministic irregular positions, sizes and transition sampling. Existing entrances, story actors, services, bosses and progression remain in place.

## Playing

Approach a Nav Stone to discover it. Open the map while beside a discovered stone, then select another discovered stone in the same act region. Mouse, keyboard button activation and controller destination selection are supported. The party needs one field ration and travels together; two minutes pass. Travel rejects combat, recent damage, downed party members, a dispersed party, an obstructed arrival or enemies near either endpoint. There are nine frontier stones and two in each later act.

Discovery, bells, secret rewards, resource depletion and elapsed world time live in the saved player’s `worldMemory`. No overworld tile/object arrays are added to profile saves. The new metadata is recovered from stable authored objects after dungeon/hub transitions. Old profiles acquire defaults lazily.

Resources retain their existing tool and skill requirements. Bonus material pools now depend on geography. Gathered nodes take at least five minutes of active world time to return and stay depleted while a party member is within 700 pixels. Fast travel advances those timers; pausing does not. Fires and regional gathering areas use the existing cooking/profession systems.

Dungeons retain their generated layouts and gameplay roles. A separate historical purpose supplies furnishings, mine supports/rails, offering carpets, garrison floors and perimeter details. Concealed offering recesses save one-time claims. Side zones inherit the dressing; infinite tower arenas receive perimeter treatment.

The world clock has a 20-minute day/night cycle. Weather changes on regional 210-second epochs; marsh fog, ordinary rain, clear conditions and Wastes ash are restrained overlays. Birds, crows, insects and motes are a bounded visual layer with local fleeing behavior. Audio cues share existing audio unlock and volume settings. Regional patrols retain entity caps, occur less frequently, and occasionally include a visually marked champion; champion chance increases at night.

## Review and validation

Run the existing local server and open `world-lab.html` for a save-free tour. It uses the production world builders and renderer. Select a scene, use WASD to inspect, and toggle night or the travel map. The main game receives the same generation and runtime changes.

- `node tools/verify-world-overhaul.mjs`: generation/idempotence, material validity, stable geography, collision flood-fill reachability, physical Nav discovery, travel restrictions/cost, profile round-trip, dungeon-return metadata, depletion, seven dungeon themes, later regions, settlement scenes, and one-time bell/secret rewards.
- `tools/review-world-browser.cjs`: headless Edge capture using the bundled Playwright runtime. Opens the actual game menu and captures 18 production-rendered scenes. Results are in `browser-results.json`.
- Existing recovery and handedness tests remain applicable. The visual-production byte-baseline check requires explicit authorized hashes for the intentional world/gameplay changes; its original “no simulation edits” assumption was for the earlier art-only pass.

Screenshots are evidence of sampled scenes, not a claim that every possible dungeon seed, controller device, co-op save combination or hardware profile has been exhaustively playtested. Browser render timings are local samples, not full gameplay frame-time guarantees. No network deployment or player-profile reset is required.

## Implementation boundaries

This is Canvas rendering: shared atlases and viewport culling replace mesh instancing/LOD. Small wildlife is visual, not loot-bearing AI. Weather is atmospheric, not a new combat hazard model. Secrets use the existing interaction loop and persistent rewards; they do not replace the existing dungeon key/door/side-room system. Nav travel is regional so story-gated expedition routes retain their purpose.
