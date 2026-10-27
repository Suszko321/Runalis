# Ashen Orchard Rebuild - Implementation Report

**Status:** Implemented and verified. The baseline was recorded before Orchard code changes.  
**Role:** First major branching investigation POI and proof-of-concept for Runalis's systemic quest identity.

## Existing Content Reused

- Echoryn overworld map, terrain masks, roads, and the Ashen Orchard dead-biome footprint.
- Stable POI ID `ashenOrchard` and landmark anchor at tile 110,90.
- Ashen Orchard Cellar entrance, dungeon generation, Orchard Keeper identity, and clear-dungeon tracking.
- Hollowling encounters and the existing exterior Orchard Keeper mechanics.
- Existing gathering, crafting, inventory, XP, quest, dialogue, story-flag, discovery, and save systems.
- Existing Covenant cream/white/gold visual identity and ambient NPC movement.
- Existing dead roots, walls, graves, campfire, braziers, medicine crates, campfire, and purification slate.

## Modified Content

- Updated Ashen Orchard description, radius, tags, and canonical map anchor.
- Converted the existing purification slate into a persistent investigation clue.
- Connected the existing Act I visit to a larger optional POI quest without blocking the main story.
- Gave the Orchard Keeper a discoverable split-root weakness: finding it reduces boss health by 18% and damage by 10%.
- Added a clue-gated ancient sluice shortcut into the existing Cellar content.
- Added persistent return-state visuals for every resolution family.

## New Environmental Props

- Animated diseased apple trees with ash-colored fruit and drifting spores.
- Pulsing Rot irrigation channels that visibly move against the healthy farm layout.
- Half-loaded harvest cart, unfinished meal, named child's toy, prayer ribbons, and dead livestock.
- Covenant triage tents, cots, medical wagon, supplies, wash basin, warning bell, quarantine marker, barricades, purification braziers, burn pit, and named fresh graves.
- Buried pre-Veiling sluice stone with eight controls and a deliberately empty ninth position.
- Outcome props: memorial stone, restored living tree, testimony ribbons, clean channel, radiant sluice, strengthened barricade, and counteragent supplies.

## New NPC Presence and Behavior

- **Physician Ilyen Vale:** quest giver and triage commander.
- **Covenant Healer:** actively treats marked cots.
- **Warding Priest:** tests prayer timing against the responding roots.
- **Relief Engineer:** examines the farm channel and impossible buried sluice.
- **Orrakai Volunteer:** sorts medicine and burn cloth.
- **Covenant Relief Warden:** manages quarantine movement and family safety.
- **Orchard Parent:** connects the evacuation register to Mira Verran's abandoned toy.
- A Last Dawn saboteur and Rot-sick animal reinforce the human and ecological threats.

Every Covenant worker has a specific task and practical dialogue. Their visual treatment remains cream, white, gold, and lantern-light rather than militarized red or black.

## Linked Investigation

The POI contains twelve persistent clues:

1. **Purification Slate** - the outer rite worked; the inner failure began over the buried floor.
2. **Verran Family Table** - an ordinary household fled between serving and eating supper.
3. **Mira Verran's Wooden Horse** - a named child survived and was evacuated to Orrakai.
4. **Fresh Field Graves** - Covenant practice names and witnesses its dead.
5. **Murdered Relief Healers** - human violence preceded Rot exposure in part of the camp.
6. **Half-Burned Patient Ledger** - symptoms began upstream before the Order raid.
7. **Last Dawn Field Satchel** - a genuine Order seal contains an overwritten warning about a nonexistent ninth sluice.
8. **Blackened Irrigation Water** - the Rot moves against the visible current.
9. **Listening Root** - the growth responds to prayer cadence, living sap, and stored blood.
10. **Buried Stone Sluice** - eight controls ring an empty ninth position.
11. **Impossible Foundation Seam** - one chamber was removed from the plan but not from physical space.
12. **Split Root-Heart** - the Orchard Keeper draws strength from two feeder systems.

The first clue begins `The Last Harvest`. Three clues complete the household reconstruction, six unlock the decision stage, and specific clue combinations unlock specialized solutions.

## Implemented Resolutions

- **Evacuation and Covenant Burn:** save every movable patient and remove the surface threat; lose the Orchard and fragile root memories.
- **Living Root Graft:** preserve the Orchard as a changed ecosystem; require continued maintenance and leave some Rot alive.
- **Testimony of the Dead:** preserve names and establish the order of infection; use methods that unsettle living witnesses.
- **Irrigation Diversion:** starve the inner roots and expose the sluice route; move contaminated water downstream.
- **Radiant Foundation Seal:** stop the deep incursion quickly; bleach part of the ancient record out of the stone.
- **Oathbound Containment:** preserve the hospital and current refugees; leave the buried wound for a future crisis.
- **Last Dawn Bargain:** obtain the Order counteragent and save patients; allow a responsible cell to escape.

Evacuation/burn and a preparation-heavy manual sluice diversion remain available to every build. Specialized access comes from Thornbinder, Gravecaller, Waverider, Lightbringer, Oathkeeper, Fellhunter, Human, Cambion, Nephilim, and Vampire identities. Identity changes method and information; it does not assign morality.

## Companion Reactions

- **Mara:** protects named civilians and treats the Rot as a sick living system rather than scenery.
- **Bram:** reads the speed and direction of evacuation from practical household evidence.
- **Dusk:** values witnessed burial and refuses to turn the dead into convenient evidence.
- **Elian:** honors the murdered healers and confirms that proper faith is compatible with investigation.

Reactions trigger once, only when the companion has been introduced, and persist in POI state so they do not repeat.

## Exploration Rewards

- **Orchard Whitewash Formula:** preparation knowledge and future recipe flag.
- **Pre-Veiling Sluice Rubbing:** Cellar shortcut and future ancient-water route flag.
- **Split Root-Heart Knowledge:** direct Orchard Keeper weakness.
- **Living Ash Seed:** unique crafting/restoration ingredient.
- **Preserved Orchard Testimony:** future historical and dialogue leverage.
- **Last Dawn Cipher Scrap:** evidence that complicates the apparent sabotage story.
- Class- and race-specific insight text appears on relevant evidence.

## Persistence and Compatibility

- New `player.poiStates.ashenOrchard` data stores clue order, timestamps, reactions, chosen resolution, class, race, and revision.
- A reusable POI state applicator restores consequence objects and knowledge-based boss changes whenever the overworld is regenerated or loaded.
- Old saves without POI state see the unresolved Orchard.
- Saves that completed the older Act I Orchard stage can still begin the side quest locally.
- Existing POI, Cellar, boss, and Act I IDs remain stable.
- The reusable dialogue evaluator now supports class, race, clue-count, specific-clue, unresolved, and resolved conditions.
- Reusable quest objectives now support `investigatePoi` and `resolvePoi`.

## Verification

- JavaScript syntax checks passed for every modified source file.
- The game loaded through a local browser and a new profile entered the playable world.
- A browser integration harness generated the real overworld and passed all checks: object count, twelve clues, six-role Covenant team, quest registration, physician registration, twelve resolution dialogue routes across seven outcomes, class gating, clue gating, persistent resolution, visible aftermath, and boss weakness hook.
- A rendered Orchard inspection confirmed the camp, investigation clusters, animated trees, channels, NPC roles, Cellar entrances, and buried sluice are visually present around the canonical anchor.

## Acceptance Result

All ten target criteria are satisfied: readable civilian disaster, active heroic relief, living Rot, investigation-first progression, imperfect branching, identity-dependent options, persistent consequences, companion reactions, knowledge rewards, and Last Dawn doubt without revealing the complete truth.
