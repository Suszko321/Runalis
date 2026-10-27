# Ruined Chapel Quest - Pre-Change Audit and Implementation Plan

**Required timing:** This audit was completed before Ruined Chapel implementation changes.  
**Default quest title:** `What the Fire Could Not Erase`.

## Current Location

- Canonical POI ID: `brokenChapel`.
- Canonical anchor: tile 445,72 in Echoryn's Chapel Ruins region.
- Existing major structure: 27x22 haunted chapel courtyard with ruined walls, columns, altar, machinery, seal engine, statues, blockers, and a south approach.
- Existing nearby terrain: smoke-dark ruin biome, gravefield approaches, chapel path, cliffs, road connections, and scattered ruin pieces.
- Existing presentation: “Ruined Covenant Site / Danger: Moderate / Mercy failed here.”
- Existing world-map role: Act I mystery pivot connecting Chapel testimony to Red Seal Keep and Malakar.

## Related Content Inventory

### NPCs

- `sisterElyra`: current Chapel keeper and quest giver for `candlesInTheChapel` and `theVeyrBloodline`.
- `chapelHermit`: current caretaker/witness and quest giver for `candlesInTheChapel`.
- `repentantCultist`: existing Last Dawn defector near Red Seal Keep; remains part of the later Act I route and will not be replaced.
- `wardenMael`: names the burned Chapel index and authorizes the Red Seal descent.
- `lordVeyrShade`: connects Chapel unrest to Castle Veyr.
- New local roles required by the brief: Covenant survivor commander, archivist/healer, concealed civilians, and one culpable wounded Last Dawn remnant.

### Enemies

- Major-structure spawns: two Chapel Oath Remnants, Failed Purifier, Seal Listener, and Chapel Threshold Warden.
- Existing regional Chapel Gravebound groups and grave-priest enemies.
- Existing `lastDawnArchiveBurner` near the Chapel.
- Existing reusable kinds: `gravebound`, `gravePriest`, `shieldKnight`, `cultist`, `demonCultist`, and corrupted beasts.
- New authored mini-boss identity required: `chapelUnnamedWitness`, built from a supported grave/spirit archetype and modified through investigation knowledge.

### Props and Interactions

- Major structure: ruined walls, columns, courtyard, altar, machinery, seal engine, cables, and statues.
- Legacy dressing: ruin pillars, broken walls, graves, Broken Chapel Shrine, Gravecap, runestones, ore, failed brazier, burn pit, broken archive wall, and Half-Burned Archive Index.
- Existing investigation IDs: `chapelCrackedAltar`, `chapelConfessionDevice`, `chapelLedger`, `chapelSealedStair`, and `act1ChapelBurnedIndex`.
- Existing reusable relief props: quarantine tents, cots, medicine crates, sick wagons, purification braziers, memorial stones, fresh graves, banners, notice papers, and barricades.
- New visual needs: broken bell tower, stained glass, Avarran open-hand oath stone, public witness platform, nine-interval foundation, blocked alcove, altered memorial board, Rot prayer book, Echo markers, and branch aftermath props.

### Quests and Progression

- Main Act I stage `theBrokenChapel`: discover the Chapel, question Chapel Hermit and Sister Elyra, and identify the sealed witness route.
- Legacy side quest `candlesInTheChapel`: discover the POI and collect three Gravecap. This is mechanically thin and conflicts with the requested investigation prominence.
- `theVeyrBloodline`: continues toward Castle Veyr.
- `nephilimBrokenHalo`: references forbidden signs leading from Watcher Ridge to the Chapel.
- Red Seal Keep dungeon floor `chapelUndercroft`: already states that the Last Dawn burned modern records but stole Divine Age testimony.
- Existing dungeon route retains Malakar as a Primordial witness rather than a Chapel deity.

### Existing Flags and Callbacks

- `story.wardenNamedChapelDescent`.
- `story.dawnspireMachineryFound`.
- Main quest stage migration alias `chapelEvidence -> theBrokenChapel`.
- Future callbacks already lead to Red Seal Keep, Malakar, Castle Veyr, and Nephilim content.
- No persistent Chapel resolution state currently exists.

## Reuse Decisions

- Preserve `brokenChapel`, anchor, terrain, major footprint, blockers, road network, shrine, regional enemies, and Act I links.
- Preserve Sister Elyra and Chapel Hermit, but deepen their roles and correct their current placement/faction context.
- Preserve the four major-structure investigation objects by converting them into parts of the new linked investigation.
- Preserve the Last Dawn attack, Covenant deaths, stolen relic, burned index, and Red Seal route as true events.
- Preserve the existing quest engine and extend the Orchard's `investigatePoi`, `resolvePoi`, class/race conditions, rewards, companion reactions, and persistent aftermath architecture.
- Deprecate the trivial Gravecap loop as the primary Chapel quest; keep its ID as a compatibility alias/hidden legacy record where required.

## Canon and Narrative Contradictions to Correct

1. The current POI says the roof collapsed decades ago, while the new canonical attack is recent. The building may be ancient and repeatedly damaged, but its present burn and casualties must be recent.
2. Existing Chapel clues state conclusions too directly (“did not absolve,” “every failed purification called success”). Canon requires credible doubt and mixed truth, not immediate proof of wholesale Covenant fraud.
3. Current architecture emphasizes generic haunted machinery. World Bible canon requires an Avarran civic sanctuary beneath later Covenant religious renovation, with testimony, open hands, amber glass, public responsibility, and visible structural supports.
4. Sister Elyra and the survivors must be sincere responders who lost friends and patients. Institutional censorship cannot erase their genuine service or make compassion performative.
5. The Last Dawn must remain responsible for a violent attack and deaths even when its archive claims prove partially correct.
6. Early content may show an empty ninth station, final refusal language, and a removed name, but must never name Eidren or state that a Ninth God existed.
7. Rot at this site must affect ritual Echoes, identity, grief, names, and records rather than repeat the Orchard's living-tissue/ecology behavior.
8. Malakar remains a powerful Primordial witness and prisoner, not a Primearch, god, or secret source of the Chapel.

## Concise Implementation Plan

1. Rewrite the POI description and convert the existing five clues into evidence with accurate ambiguity.
2. Add a layered Chapel scene readable at distance: bell tower, smoke, glass, fallen banners, carts, graves, cemetery Rot, and failing lantern.
3. Add active Covenant recovery, hidden civilians, and a wounded culpable Last Dawn remnant with distinct dialogue.
4. Add a four-stage side quest: Discovery, Investigation, Commitment, Consequence.
5. Add at least twelve physical, historical, spiritual, and faction clues. Six establish the public case; deeper combinations unlock specialized routes.
6. Add class and race insight/access routes without assigning morality. Retain two evidence/preparation solutions for classless play.
7. Add The Unnamed Witness with avoid/calm/bind/fight options and concrete knowledge-based health/damage/awakening changes.
8. Add six permanent resolutions: Covenant sanctuary, forbidden testimony, Last Dawn bargain, restored dead, broken foundation, and neutral memorial.
9. Make each resolution control props, survivors, services, enemies, map/journal description, safe status, flags, rewards, and future callbacks.
10. Verify syntax, real world generation, four-stage quest flow, identity filtering, mini-boss changes, persistence, and rendered scene composition.

## Planned Files

- `src/RunalisContentExpansion.js`: layered scene, actors, evidence, enemies, aftermath.
- `src/worldContent.js`: POI/NPC definitions and branching dialogue.
- `src/questData.js`: four-stage quest.
- `src/data.js`: culturally specific Chapel rewards.
- `src/objectRenderer.js`: Chapel/Avarran/Echo props.
- `src/poiStateSystem.js`: richer state outcomes, multi-clue boss knowledge, map/journal aftermath.
- `src/dialogueSystem.js` and `src/gameInteraction.js`: any additional resolution and discovery hooks.
- `docs/implementation/RUINED_CHAPEL_IMPLEMENTATION_REPORT.md`: final handoff and risk report.
