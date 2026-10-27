# World rebuild: quest and geographic preservation audit

Captured 8 October 2026 before the continent rebuild. The companion JSON is the machine-readable baseline. Source systems were not modified for this audit. The audit constructed authored runtime worlds with published editor overrides disabled, and installed the active Old Well quest layer. It did not inspect or alter player profiles.

## Coverage and stable identities

The baseline has 32 quest definitions, 181 individual objectives, 14 quests starting at recommended level 1–5, 31 required or quest-giver NPC identities, 12 objective POI identities, eight objective dungeon identities, and 13 Nav Stone identities. None of the eight constructed worlds has duplicate object IDs. Every objective NPC and dungeon resolves to a runtime object. One POI discovery objective lacks a physical runtime anchor: `lanternMarsh`.

Preserve quest IDs, stage IDs/order, objective IDs/types and required counts. Current quest progress is keyed by identity, not geography. Preserve `npcId` as well as each object's `id`: Warden Mael is `wardenMael` on object `warden`; Mara Vell is `maraVell` on `thornbinderTrainer` in town and `maraVellOpening` in her house; Bram is `bram` on `mercenaryTrainer`; Sister Elian is `sisterElian` on `templarTrainer`. The same NPC identity is intentionally instantiated in later acts; uniqueness is required per world/object ID, not across every NPC's appearances.

Do not rename internal dungeon identities to match display names. Castle Veyr uses POI `gothicCastle`, dungeon `castleVeyr`, entrance `castleVeyrOverworldEntrance`. Last Dawn Keep uses POI/dungeon `demonCultLair`, entrance `emberVeilLairEntrance`; `dawnspireRoot` is story metadata for that same Act I descent. Thornroot uses `thornrootHollow`; the Iron Vault uses `ironMireDungeon`; Old Blighted uses `oldHollowDungeon`. The Orchard cellar and sluice shortcut both enter `ashenOrchard`. Preserve both entry objects and the shortcut's `ancientSluice` clue requirement.

Preserve `poiStates[poiId].clues[clueId]`, each permanent resolution, `poiEncounters[majorPoiId].defeated[enemyId]`, claimed cache IDs, `worldMemory.stones[stoneId]`, and resource harvest identity/expiry. Moving coordinates must not yield free resources, defeated guard resets, another cache claim, lost attunement, or repeated investigation rewards. Coordinate-bearing discovery/map memories need migration to their same identity's new position.

## Early-game preservation ring

Travel budgets below are proposed design acceptance targets, not measurements or implemented guarantees. Measure travel at ordinary walking speed, excluding combat, looting and dialogue. Current base movement is 205 pixels/second with 32-pixel tiles (`main.js:2569`), before movement modifiers. Large regional expansion must not multiply every beginner journey by the continent's size.

| Required cluster | Existing dependency | Geographic intent |
|---|---|---|
| Orrakai recovery and relief | `mercy_in_orrakai`: Mara, Warden, sick villager, water steward, lower gate guard, refugee parent, Caelen, healing rite | All public town walkways; no combat or inaccessible building footprints. Less than 90 seconds between recovery exit and town services. |
| Lower Road and Old Well | Exact three named enemy IDs, five clue IDs, Broken Lantern story flags | Immediate level 1–2 route from the south gate, under 60 seconds of walking. No required river crossing, dungeon or high-level encampment. |
| Beginner gather/fight/rest | `firstOath`, `ironForMara`, `embersOnTheRoad`, early `act1HearthmereAshes`, `bramLanternDrill`, `maraRootsInAsh` | Emberleaf and iron near the gate; Hollowlings/basic beasts on the relief road; rations and scrap available from the town market/crafting; a low-level Briar Root source. |
| First relief scout | `act1HearthmereAshes.bramsRoadLesson` and `.theWoundSpreads`, `hunterScout` | Put the mandatory scout conversation on the beginner relief road. Current final runtime scout is at [391.5,158.5], far beyond Orchard; do not enlarge that mandatory detour. Hunter Camp can remain a later separate destination. |
| Ashen Orchard | `roadsGoneQuiet`, `embersOnTheRoad`, `buriedName`, `ashenOrchardLastHarvest`, Act I, legacy Solgate | Greater Orrakai level 3–5 farm/relief site, 60–150 seconds travel; retain whole farm, grave/household/irrigation clues and cellar as one cluster. |
| Thornroot Crypt | `rootsRemember` level 5; legacy `solgateOath` | Greater Orrakai woodland side route, level 4–8; accessible without passing Iron Mire or Last Dawn's guards. |
| Saltwell fishing | `silverInTheRiver` level 4, giver `fenrickSalt`, three reeds/two Silverfin | Safe level 4 riverbank branch, under 180 seconds of travel. Current Saltwell is [105,355]; if moved far away, bring a Fenrick appearance or beginner fishing quest route near Orrakai. |
| Broken Chapel | Act I required witnesses; `candlesInTheChapel`, `ruinedChapelFireCouldNotErase` | Echoryn interior level 6–10 with readable pilgrim/bridge approach and protected talk bays. Its optional resolution must not hide required main-quest conversations. |
| Castle Veyr | `hollowCrown`, `solgateOath`, `theVeyrBloodline`, Vampire path | Later Echoryn level 10–15 estate, not a starter fight simply because a long campaign has `recommendedLevel:1`. |
| Last Dawn Keep | Act I final boss, Solgate, `beneathTheRedSeal`, Cambion path | Later level 12–18 fortress, safe defector dialogue/preparation bay, concentrated dungeon combat and exact-entrance victory return. |

The 14 early quest starts are: `hollowCrown`, `solgateOath`, `firstOath`, `roadsGoneQuiet`, `ironForMara`, `rootsRemember`, `embersOnTheRoad`, `buriedName`, `silverInTheRiver`, `mercy_in_orrakai`, `act1HearthmereAshes`, `maraRootsInAsh`, `bramLanternDrill`, and `ashenOrchardLastHarvest`. These span whole campaigns as well as genuinely beginner objectives; preserve each stage's intended difficulty rather than assigning one level to a complete campaign.

### Old Well contract

`oldWellSystem.js` injects the location on an overworld update, independent of static world creation. It currently carves a route from [17,35] to [53,67]. Named encounter positions are [44,57], [51,66], [55,65]. The identities must remain `oldWellPlagueAnimal`, `oldWellLastDawnFighter`, `oldWellLastDawnRitualist`; already-completed individual kill objectives prevent those enemies being re-added. Keep `questEncounter:'oldWell'`, no-respawn behavior and host-owned progress.

Five distinct clues are `oldWellRedWax`, `oldWellBurnedCloth`, `oldWellRitualMarking`, `oldWellPatrolEvidence`, `oldWellBrokenLantern`, all under `oldWellRitualSite`. Clues are unavailable until all three kills complete. The lantern additionally requires the ritual marking inspection. Existing interrupted saves in the return-evidence stage restore `mercy.brokenLanternAcquired` and `mercy.brokenLanternHeld` automatically. New geometry must translate this entire injected scene together, including its road carving; translating static objects alone leaves this quest behind.

## Playable region and transition contracts

| Baseline world | Dimensions | Meaningful dependencies |
|---|---:|---|
| Echoryn / `hearthmereFrontier` | 640×480 | Act I, all early outdoor sites, 9 Nav Stones, 434 identified gather nodes plus logging/resource kinds outside that classifier. |
| Aureate Marches / `aureateMarches` | 120×64 | Elian and Dusk appearances, Pilgrim Rest supply/rest services, Shattered Choir entrance, optional purification site, repeatable Confession Vaults tower, two Nav Stones. |
| Ascension Wastes / `ascensionWastes` | 120×64 | Mara and Bram appearances, Last Lantern Camp, Ascension Spire entrance, Lightstorm Scar, repeatable cosmic tower, two Nav Stones. |
| Pilgrim Road / `pilgrimRoadRoute` | 120×56 | Physical encounter route, checkpoint dialogue, arrival/reverse-route flags. |
| Severed Causeway / `severedCausewayRoute` | 120×56 | Physical crossing, lightstorm encounter route and arrival/reverse-route flags. |
| Orrakai / `capital` | 72×48 | Complete service hub, 12 required introductory NPC identities, trainers and relief dialogue. |
| Mara house / `maraHouse` | 15×12 | First Mara conversation with deferred talk objective, then the south threshold into Orrakai. |
| Caravan / `act1Opening` | 58×30 | Noninteractive Zarynth Road prologue; its `regionId:'echoryn'` is an opening identity, not the live overworld key. |

Region metadata's current fixed ranges are Echoryn 1–18, Aureate 18–42, Ascension 42–80. Quest labels for Act II (10) and Act III (22) disagree with these ranges; do not derive enemy levels from those labels or the player. New continent regions must explicitly map back to stable act/region identities used by dungeon, loot, travel, save and companion systems.

Legacy Pilgrim Road entry requires completed Act I, its flag, 320 rations, 750 gold, permit and Mara/Bram readiness. Severed Causeway requires Act II completion, 520 rations, three Lightstorm Wards, 1,800 gold, chart and four companions' readiness. These are existing expedition-service contracts, not a justification for invisible continent-wide barriers. Preserve existing progression/reward flags while letting ordinary physical walking bypass expedition transport services wherever the directive requires it.

`createOverworldReturnState` currently captures the exact entrance's x and y plus 1.35 tiles. `restoreOverworldFromState` reconstructs fresh environmental runtime metadata, optionally overlays saved lists, and replaces stale Echoryn layout snapshots on revision mismatch. Continuous-world migration must preserve the entrance identity and map the stored return point to its relocated bay; carrying old coordinates into new geometry is insufficient. The final-boss-only exit behavior and always-available map return to Orrakai are working requirements from earlier user requests.

## Concrete risks and recommended repairs

1. **Missing Lantern Marsh discovery anchor.** `worldContent.js:2545` requires `discoverPoi:'lanternMarsh'`. The final baseline runtime contains the marsh campfire, shrine and related NPCs, but no object with `poiId:'lanternMarsh'`. `dialogueSystem.js:1992–2014` only detects proximity discoveries from object POI IDs. NPC reveal dialogue can discover it, but walking there cannot reliably complete the task. Add the correct stable POI identity to a physical camp marker/shrine or new landmark. A map marker or Nav Stone name alone does not satisfy this event.

2. **Optional Chapel resolution can hide essential witnesses.** `RunalisContentExpansion.js:81–87` adds `requiresPoiUnresolved:'brokenChapel'` to Sister Elyra and Chapel Hermit; the generic Chapel NPC helper at line 73 applies the same condition to other unresolved actors. Act I requires both Elyra and Hermit in `theBrokenChapel`. Preserve available essential talk identities after resolution, with consequence-specific dialogue, or retain them whenever a relevant main stage is still incomplete. Merely translating the original objects preserves this softlock risk.

3. **Metadata positions differ from constructed positions.** Thornroot metadata [58,124] becomes runtime [82.5,165.5]; Pilgrim Bridge [184,78] moves to the authored [250,100] area; Lantern Marsh [179,198] moves to [245,325]; Hunter Scout [243,116] becomes [391.5,158.5]. Use final runtime coordinates and a central anchor registry. Update map markers, scene clearings, arrival points, road signs and save migration from the same registry.

4. **Beginner gathering must not depend on late geography.** Silverfin is a chance-based fishing result, requiring enough accessible fishing nodes and retained rod/tackle sources; the level-4 quest cannot become a high-risk marsh expedition. Briar Root comes from hand-scythe foraging, a boss or offering cache; preserve a plausible early option for Mara's level-4 quest. Rations and Shrine Tonics have market/crafting alternatives, so those town services are part of geographic preservation.

5. **Coordinate-derived resource and scatter enemy IDs need indirection.** Current examples include `wild-emberleaf-x-y` and `outer-cultist-x-y`. Regenerating these IDs from new positions would reset harvest or defeat histories. Keep persistent identity independent from new coordinates, including seeded chunk population/cycle IDs.

6. **Permanent investigation scenes are bundles.** Orchard has 12 physical clues and Chapel 25 in the captured runtime. Preserve clue IDs, class/race insights, reaction rewards, permanent outcome props, caches, conditional shortcuts and evidence counterplay. `required:9` means nine distinct Chapel clue identities, not nine repeated interactions at one replacement marker. Do not drop conditional result actors because they are hidden in a fresh profile.

7. **Difficulty must be geographic.** Fixed original tier labels are not player level. Keep region/POI level ranges explicit and verify the same seed produces the same population for a level-1 and a powerful returning player. Dungeon density must remain concentrated separately from quiet wilderness.

8. **Travel and state compatibility must cover every act.** Replacing only Echoryn geography while leaving later playable regions inaccessible loses Shattered Choir, Ascension Spire, companion appearances and optional/tower entrances. Keep old builders as compatible entrances or embed their stable identities in the continent. Existing save modes for town, Mara house, prologue, travel, side zone, dungeon and tower require explicit migration/restore behavior.

## Acceptance checks for the rebuild

- Every captured quest ID/stage/objective remains defined; each required NPC, POI, dungeon, named enemy, clue and Nav Stone has a physical identity in its appropriate world or compatible instance.
- Newly authored global populations have unique object/enemy IDs and deterministic seed/cycle identities; streams reconstruct the same identities without duplicates.
- Introductory town talks, first herbs/iron, Old Well combat/clues, first scout, Orchard and beginner fishing are reachable through suitable low-level terrain.
- Resolving Orchard/Chapel before the main story reaches them cannot remove mandatory conversations or reward progress twice.
- All dungeons return to their same entrance identity after final boss victory, including save/load and migrated coordinate cases.
- A completed harvest, defeated persistent defender, claimed cache, investigated clue and discovered Nav Stone retain their state after travel, streaming and reload.
- Enemy and loot levels for an introductory route are identical for weak and powerful players under the same geographic seed.

The audit is a migration contract and risk inventory. It does not by itself prove final-world traversability, visual composition, save migration or quest completion; those require final-world tests after the rebuild module is available.

## Implemented preservation and map validation

The frozen JSON reference was retained while the final continent was checked against it. `tools/verify-world-rebuild-contracts.mjs` now passes all 13 groups: 32 quest contracts, 181 objectives, mandatory NPCs, objective POIs, eight story dungeons, all prior entrances, all investigation identities and Nav Stones, physical resource outputs, introductory anchors, later-region coordinate migration, unique identities and deterministic populations. The missing Lantern Marsh identity and post-resolution Chapel witness eligibility are repaired in the final world.

The merged continent namespaces colliding regional object IDs while retaining `sourceRegionId` and `sourceEntityId`. Exploration and map memory use those original identities, including the former route memory keys, rather than the player's current geographic region. Survey memory uses `overworld:runalis`; legacy discovered cell footprints migrate once, with their original extent, while unrelated regions remain obscured.

`tools/verify-continent-map.mjs` passes six survey, identity and travel contracts. The continental survey renders roads, rivers, lakes, cliffs and region forms from authored macro geometry without touching the full lazy terrain grid. The real browser check in `tools/verify-continent-map.cjs` confirms discovered-only location lists, constant-size markers during nearby zoom, persistent pan/zoom, remote danger checks before cost, controller travel to Zarynth for one ration, and Return to Orrakai. Layouts at 1440, 1280 and 800 pixels remain inside the viewport; there are no browser errors. Reports and screenshots are in `docs/world-rebuild/map/`.

`tools/verify-continent-roads.mjs` passes five road/story contracts. Gate interactions give directions without rebuilding the continent, moving the party, or charging permits and supplies. Explicit `startStoryExpedition` preserves the existing preparation contract as an optional service and prevents duplicate charges. Physical destination arrival advances the story only after both the preceding main quest and its act-completion flag are present; an early visit starts neither later act. The streaming caller must invoke `updateContinentalTravelArrival` after it updates geographic region identity. These checks verify contracts and map interaction; they do not replace the root team's terrain traversal, dungeon return, persistence or full quest-playthrough validation.
