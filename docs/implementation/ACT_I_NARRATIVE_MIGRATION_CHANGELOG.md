# Act I Narrative Migration — Implemented Change Manifest

This manifest records the implementation completed against the pre-change baseline in `ACT_I_NARRATIVE_MIGRATION_REPORT.md`.

## Playable Caravan Opening

**Implemented in:** `src/act1OpeningSystem.js`, integrated through `src/main.js` and `src/gameSave.js`.

- Fresh profiles now begin on the Zarynth road as a caravan guard.
- The scene includes a merchant, pilgrim mother, masked child, veteran, caravan master, Covenant artifact custodian, wagons, supplies, an empty bird cage, and a sealed reliquary.
- Optional interactions establish ordinary lives and hint that the reliquary bears two historical identities.
- The Last Dawn attacks after a short exploration window or when the player approaches the artifact.
- Five hostile Last Dawn roles reuse existing combat archetypes and mechanics.
- The encounter ends in an isolated controlled defeat; ordinary death and respawn handling is unchanged.
- The artifact is stolen, the caravan falls, and a timed blackout transitions to Orrakai.
- Saving during character creation or the prologue preserves the opening world mode and reconstructs the caravan safely on load.

## Orrakai Recovery

**Implemented in:** `src/hubSystem.js`, `src/objectRenderer.js`, and `src/act1OpeningSystem.js`.

The player recovers beside Orrakai's relief and quarantine district at partial health and stamina. The Act I quest begins only after recovery.

New environmental clusters:

- quarantine tents;
- infirmary cots;
- wash basin;
- plague markers;
- quarantine barricades;
- purification braziers with pale smoke;
- warning bell;
- sick and relief wagons;
- medicine crates;
- fresh graves;
- memorial stone and candles;
- supervised burn pit;
- teaching table and historical papers.

New interactive evidence:

- a roadside memorial that lists the player as recovered rather than dead;
- a burned relief ledger showing that Last Dawn cells target Divine Age cargo records.

## Covenant Presentation and NPC Behavior

**Implemented in:** `src/hubSystem.js`, `src/objectRenderer.js`, `src/RunalisContentExpansion.js`, `src/worldContent.js`, and `src/dialogueData.js`.

New Covenant roles include:

- physician;
- relief sister;
- quarantine peacekeeper;
- grave tender;
- teacher;
- field historian;
- envoy;
- road physician;
- relief scout;
- convoy courier.

They use cream/white working clothes, muted gold rank colors, standardized equipment, and appropriate tools. Physicians, relief workers, historians, and grave tenders use existing ambient wandering behavior around their work areas. Peacekeepers remain at quarantine lines. Field survivors remain stationary and wounded.

Sister Elian and the Dawnlens Acolyte now share the Covenant visual faction. Act I dialogue presents the institution as sincerely protective and materially effective. Doubt about high-level historical omissions is deferred until Malakar.

## Echoryn Environmental Storytelling

**Implemented in:** `src/RunalisContentExpansion.js`.

A canonical narrative layer was added without changing the overworld map or routes:

1. Near Orrakai: intact relief wagon, medicine, purification brazier, physician, and early plague marker.
2. Hollow Road: quarantine tent, cot, warning bell, dead wildlife, first black roots, and a scout who observes roots turning toward old stone.
3. Ashen Orchard: successful perimeter braziers, failed inner roots, and a slate documenting the anomaly.
4. Pilgrim Bridge: destroyed medical convoy, scattered medicine, burned records, a wounded courier, and a Last Dawn arrow.
5. Broken Chapel: failed apparatus, burned archive, damaged wall, and a surviving index naming Divine Age testimony.
6. Red Seal Keep: Last Dawn banners, ancient Rot roots, summoning plans labeling Malakar WITNESS and PRISONER, and a foundation built to carry the Rot.

Four new Last Dawn sabotage/reliquary enemies reuse existing archetypes and stat scaling.

## Quest Migration

**Implemented in:** `src/questData.js`, `src/storyData.js`, `src/travelSystem.js`, and `src/storyRuntime.js`.

The stable internal quest ID `act1HearthmereAshes` and all stage IDs were retained for save compatibility. The displayed quest is now **The Stolen Dawn**.

The eleven existing stage slots now cover:

1. recovery and reporting the artifact theft;
2. replacing relief supplies;
3. clearing the relief road;
4. tracing Rot roots toward old foundations;
5. understanding successful and failed purification;
6. investigating Ashen Orchard;
7. interpreting living root evidence;
8. reconstructing the burned chapel index;
9. using a Last Dawn defector's route;
10. descending beneath Red Seal Keep during the completed summoning;
11. defeating Malakar and hearing his testimony.

Objectives, reward cadence, stage order, dungeon requirements, and completion unlocks remain mechanically compatible.

## Faction and Dialogue Migration

**Implemented in:** `src/worldContent.js`, `src/dialogueData.js`, `src/overworldEntities.js`, `src/majorPoiStructures.js`, and `src/RunalisContentExpansion.js`.

- Added the Covenant as a full friendly civilization faction.
- Recontextualized the legacy internal `demonCult` faction as the Order of the Last Dawn.
- Renamed player-facing Ember Veil NPCs, enemies, roads, lairs, and guards to Last Dawn equivalents.
- Changed the Repentant Cultist into a Last Dawn Defector.
- Rewrote Warden Mael, Hunter Scout, Chapel Hermit, Sister Elyra, Mara Vell, Sister Elian, the defector, and the hostile Seal-Keeper.
- Dialogue now confirms visible relief work, Rot patterns, burned records, and targeted artifact theft.
- Last Dawn dialogue remains hostile and incomplete; it does not establish institutional truth before Malakar.

## Dungeon and Malakar Migration

**Implemented in:** `src/dungeonData.js`, `src/dungeonSystem.js`, `src/bossData.js`, `src/bossSystem.js`, `src/storyRuntime.js`, and `src/dialogueData.js`.

The dungeon keeps its existing procedural structure, enemies, phases, shortcuts, rewards, and final boss mechanics. Player-facing spaces are now:

- Last Dawn Descent;
- burned index vault;
- Primordial Prisonworks;
- hidden testimony archive;
- Witness Vault;
- Final Siege arena.

Malakar is now explicitly a Mantled Primordial and never a Primearch. His three mechanical phases remain intact but are narratively named Mantled Warlord, Broken Mantle, and Final Siege.

On defeat, new canonical flags record that:

- Malakar was defeated;
- Malakar's truth was heard;
- the Last Dawn needed rather than worshipped him;
- Malakar is a Primordial witness to the Divine Age.

His post-fight warning is implemented in both the runtime completion sequence and canonical dialogue data:

> “When you stand before Seraphel...
> listen carefully.
> He has not lied for thousands of years.
> He has simply never told all of the truth.”

Legacy Act I completion and travel flags remain for downstream compatibility.

## Item and Supporting Data Changes

**Implemented in:** `src/data.js`, `src/questMaterialSources.js`, `src/companionData.js`, and `src/regionData.js`.

- Cult Ash now describes Last Dawn archive and relic-route use.
- Cultist Mantle is displayed as Last Dawn Mantle while retaining its item ID and recipe compatibility.
- Red Seal material guidance names Last Dawn militants and Red Seal Keep.
- Mara and Bram's Act I companion framing now begins in Orrakai's relief crisis.
- Echoryn region messaging emphasizes relief routes, purification smoke, Rot, Divine Age stone, and Last Dawn red rather than a generic demon invasion.

## Content Reused Without Mechanical Change

- player movement and camera;
- character creation and class selection;
- all player class kits;
- combat engine and enemy behavior;
- enemy archetypes and stat scaling;
- Orrakai services and exits;
- Echoryn map, roads, POIs, camps, and resources;
- quest engine, objective engine, stage IDs, and reward pipeline;
- dungeon generation and routing;
- Malakar attacks, phase thresholds, summons, damage, difficulty, and rewards;
- travel unlocks;
- ordinary death, respawn, co-op, and PvP rules;
- deterministic overworld save strategy.

## Verification Performed

- Syntax parsing passed for all changed JavaScript modules.
- A live fresh-profile run completed character creation, displayed the caravan, triggered the Last Dawn attack, applied the controlled defeat, faded correctly, and recovered in Orrakai.
- The live run rendered new Orrakai props and Covenant actors without browser console errors.
- The caravan world, Orrakai hub, and deterministic Echoryn content all loaded through the existing module graph.
- Stable internal IDs and legacy story flags were retained where save or progression systems depend on them.

