# Runalis Act I implementation and validation

Implemented directly in the existing project. The previous source was preserved in `backups/act1-campaign-2026-10-24`. Existing combat, streamed world, dungeon, interaction and save systems remain the foundation. This report records implemented behavior and bounded validation; it does not certify a complete manual playthrough.

## Chapters and quests

1. **The Caravan Ambush:** ordinary hired-guard framing, timed narration, Last Dawn attackers, burning wagons, injury and recovery in Mara’s house. The sequence remains skippable.
2. **Mercy in Orrakai:** Mara’s introduction and existing relief tasks lead to Callworth’s request. The Old Well now contains a plague wolf, Last Dawn fighter and unique Blighted Beast. The lantern is a guaranteed protected interaction at the beast’s death location, not random loot. Evidence can go first to Mael or Callworth, with custody and reputation recorded. A timed healing sequence, marked villager, joint accounting of missing patrols and evening at Mara’s hearth finish the quest.
3. **Frontier Investigation:** the caravan manifest and empty relic cradle lead through Bram to Scout Hessa at the orchard approach.
4. **Ashen Orchard:** household, irrigation and growing-ground evidence leads through Callworth and Mara to the existing Orchard cellar. Its clear is required before Mara identifies the next lead.
5. **Broken Chapel:** the Hermit, Sister Elyra, surviving evidence and an interactive drain–align–light regulator connect the stolen cargo to the prisonworks. Wrong sequences reset safely.
6. **Last Dawn Offensive:** physical ritual orders and the defector at the Keep lead back to Mael, then into the descent.
7. **Beneath the Keep:** the existing four-floor dungeon now carries floor-specific evidence and directions for occupied barracks, excavation galleries, prisonworks and ritual chamber. The existing combat, stairs, keys, side rooms and arena system are retained.
8. **Malakar:** the existing boss AI remains. Only the final Act I boss advances this story. His post-battle testimony acknowledges brutality and includes the specified Seraphel warning. The testimony is recoverable after a reload; defeat alone does not finish the act.
9. **Ashes of Orrakai:** reports to Mael and Mara complete Act I and unlock its onward travel flag. Optional work and the refuge remain available.

## Places and people

New or substantially extended physical content includes the caravan wreck and approach, the lower-road landmarks and pumping-house ruins, Hessa’s orchard shelter, the Chapel regulator, Keep approach orders, four descent evidence stations, Mara’s return entrance and Greyhaven.

Greyhaven includes a walkable open-front hall, residences, workshop, storehouse, garden, cistern, ledger, banner, road station and displaced family. Tavin, Iona, Pell, Corven, Derren, Lysa, an attendant, a merchant and Mael’s visit participate in its quests. Mael, Callworth, Mara, Bram, Hessa, the Chapel witnesses and Malakar carry the main investigation. Healing patients and their family members appear physically; transferred Lysa and Derren appear at the Orrakai infirmary.

## Navigation and discovery

Conversations give named roads, forks and landmarks. Signposts agree with those directions. The Chapel route specifically retraces west to the fork east of Pilgrim Bridge before turning south-east toward Hunter Camp and Watcher Ridge. New paths connect the wreck, farms, refuge and relief family.

The journal stores learned route descriptions separately from physical discovery. Reminder conversations acknowledge visited places. Learning a direction does not itself reveal a precise destination on the map. Existing discovery and map systems are retained. The route audit found and fixed an isolated relief-family position.

## Your Order

All nine quest definitions are connected: The Forgotten Refuge, A Claim of Your Own, Stone and Bread, A Place at the Table, The First Recruits, The Work of Leadership, What We Believe, The Price of Shelter and The Weight of a Name.

The player hears all three residents before seeking Mael’s charter, pays actual repair costs, supplies food, clears the storehouse beasts, cleans the cistern and decides residents’ terms. The ledger records the name, title, banner symbol and colour, purpose, membership, knowledge policy, leadership and assignments. Three consenting, assigned members are required. Some townspeople affiliate while keeping their duties; Mael and Callworth refuse membership. Poor treatment can produce refusal, with supplies offering a way to repair trust.

Relief, security, recovery and trade each have distinct physical objectives. Corven’s research choices affect relationships and whether he stays. Intake and treatment choices for Lysa depend on food and the medical facility; refusal can leave the sickroom inadequately supplied, and later supplies can resolve that state. Recognition concludes with the chosen toast. Buildings, banner, supplies and treatment furnishings reflect persistent decisions.

## Validation

A later integration pass follows the complete Mercy and Act I dialogue/evidence/dungeon flow for all six classes without injecting quest stages. It covers both first-report recipients and resumes through 264 actual save/load checkpoints, including mid-conversation, mid-healing-rite and post-boss testimony. Travel is repositioned and enemy HP is set to zero to exercise death handling; this remains an accelerated integration test rather than a normal combat playthrough. The six `flow-*.json` reports preserve the checkpoint records.

- 26 progression/branch checks passed, including both evidence recipients, all six main-quest class paths, the nine-quest Order chain, all four undertakings, treatment outcomes, trust/refusal, custody and lantern uniqueness.
- All 1,047 checked interactions in the Act I world region have a reachable interaction position. Mandatory Orrakai actors are reachable from Mara’s door.
- All four Keep floors across three seeds have reachable required destinations; floor evidence survives save restoration.
- All six classes damage Malakar through the real weapon pipeline. His AI runs at three health bands and his death sets the correct story flag.
- Seven dungeon themes pass final-boss-only return-portal checks, including save restoration and returning to the used entrance.
- Forty tower floors and ordinary dungeon floor transitions pass the existing regression checks.
- Browser checks cover production launch, streamed Greyhaven, the actual founding form, timed healing playback and ambush-to-Mara transitions. Browser errors are recorded separately in `browser-verification.json`.

Machine-readable reports and screenshots are beside this report. Reproduction scripts: `tools/verify-act1-campaign.mjs`, `tools/verify-act1-access.mjs`, `tools/verify-act1-descent.mjs`, `tools/verify-act1-browser.cjs`, `tools/verify-mercy-flow.mjs`, plus the existing dungeon regression scripts.

## Remaining limits

The campaign has not received an uninterrupted normal-gameplay playthrough. The six-class tests verify progression and combat compatibility, not survival through a complete Malakar fight, resource sufficiency over an entire run or subclass balance. The boss smoke test protects player health and deliberately sets health bands; it is not evidence that a player won those fights.

Dialogue is condensed into interactive exchanges rather than a line-by-line performance of the PDF. The opening is an in-engine scripted scene with reused art, not a bespoke animated cinematic. Greyhaven has persistent quest-driven repairs, staffing and consequences, but not a continuous autonomous production economy or a full daily schedule for each recruit. Broad historical-save coverage and long-session performance remain unverified.

These limits are not marked as completed acceptance criteria. No user profile was overwritten by the isolated browser tests.
