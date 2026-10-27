# Ruined Chapel Implementation Report

## Result

The Broken Chapel is now a complete, replayable POI side quest titled **What the Fire Could Not Erase**. It progresses through Discovery, Investigation, Commitment, and Consequence; supports six materially different resolutions; recognizes every current class and race; and permanently rebuilds the site to reflect the player's decision.

The quest preserves the Act I canon established by the audit:

- Covenant defenders and survivors acted sincerely and saved civilians.
- The Order of the Last Dawn planned and carried out the recent assault, even after learning civilians were present.
- The Covenant also inherited and concealed parts of an older civic history.
- The oldest foundation contains nine witness stations, one deliberately removed from later records.
- The absent station is never named or directly explained.
- The Rot at this site corrupts memory, identity, ritual, and grief rather than behaving like the Ashen Orchard's biological blight.
- Malakar is not invoked as a god or Primearch.

## Files Changed

### `src/RunalisContentExpansion.js`

- Rebuilt and dressed the Chapel as a layered recovery and investigation site.
- Added Covenant survivors, a civilian witness, a wounded Last Dawn officer, ritual Echoes, physical evidence, graves, medical equipment, and Avarran remains.
- Added The Unnamed Witness and its clue-driven combat modifiers.
- Added the visible world states for all six outcomes.

### `src/worldContent.js`

- Reframed the Broken Chapel's public description as the aftermath of a recent attack.
- Expanded Sister Elyra and the Chapel Hermit.
- Added Tomas Venn, Ash-Captain Rusk, and the outcome witness.
- Added the investigation, commitment, class, race, and consequence dialogue paths.
- Retired the old hidden candle quest in favor of the canonical POI quest.

### `src/questData.js`

- Added `ruinedChapelFireCouldNotErase` with four explicit stages.
- Added nine-clue investigation requirements, actor conversations, a POI-resolution objective, and a consequence witness.

### `src/poiStateSystem.js`

- Extended persistent POI state to control enemies as well as objects.
- Added cumulative knowledge rules for bosses.
- Added persistent map names, journal descriptions, and POI safe-zone metadata.

### `src/dialogueSystem.js`

- Added inventory-aware dialogue availability and resource consumption.
- Persisted branch-specific summaries and resolution IDs in the active and completed quest journal.

### `src/data.js`

- Added culturally grounded Chapel rewards and evidence items.

### `src/objectRenderer.js`

- Added visual treatments for the broken bell tower, stained glass, Avarran oath stone, witness platform, ritual Echoes, corrupted memorials, and blocked alcove.
- Added support for hiding investigation labels while retaining visible clue icons and proximity interaction prompts.

### `docs/implementation/RUINED_CHAPEL_PRECHANGE_AUDIT.md`

- Records the required pre-change inventory, canon conflicts, reuse decisions, and implementation plan.

## Scene and Investigation Content

The rebuilt location adds 101 Chapel-scoped objects and 25 investigation clues. The evidence is deliberately layered so the first discoveries validate the public story before later discoveries complicate it.

### Recent attack layer

- Last Dawn breach marks and assault plan
- Fallen Covenant defenders shielding civilians
- Sister Elyra's crypt evacuation route
- A purification lantern that survived the attack but failed when grave-memory entered its oil
- A selective archive burn and an attacker escape tunnel

### Covenant refuge layer

- Medical cots, medicines, wash basin, recovery graves, damaged lanterns, and survivor work parties
- Records showing that the lower ward was opened by an authorized Covenant office
- A sincere seal order that identifies a real danger while concealing the chamber's original civic use

### Avarran civic layer

- An open-hand oath stone and public witness platform
- Evidence that later renovations converted public testimony into private confession
- A nine-station foundation plan beneath an eightfold religious renovation
- Restoration orders that covered older civic symbols rather than destroying them

### Pre-Veiling anomaly

- A load-bearing station erased from the legend but still present in the architecture
- A final-refusal rite granting summoned witnesses a genuine chance to leave
- An archive index whose carefully blank entry repeats wherever that right appears

### Rot and Echo layer

- Memorial names exchanging letters
- Funeral rites trapped at an absent name
- Several deaths fused into a single contradictory healer Echo
- Grave roots spreading through remembered relationships rather than bodies
- Blood and water retaining incompatible sequences of the same event

The world never presents a single omniscient explanation. Players assemble the history from material contradictions, survivor testimony, class/race insight, item descriptions, and the changed architecture.

## Quest Structure

1. **Discovery** — Enter the Chapel, speak with Tomas, and establish the recent attack through four pieces of physical evidence.
2. **Investigation** — Reach nine total clues, confront Ash-Captain Rusk, and compare his account with the Chapel Hermit's older knowledge.
3. **Commitment** — Choose and execute one of six permanent outcomes. Class and race routes alter access, cost, risk, and interpretation; a classless route remains viable.
4. **Consequence** — Return to the transformed location and speak with the person living with the result. The completed journal records the chosen outcome rather than a generic victory line.

## Six Resolution Branches

| Outcome | Core choice | Persistent aftermath | Cost or risk | Primary reward |
| --- | --- | --- | --- | --- |
| Covenant Sanctuary | Restore the refuge under Covenant stewardship | Purification lantern, medical cots, supplies, shrine service, Sister Elyra; Chapel becomes safe | Older archive remains controlled | Covenant Medical Writ |
| Sealed Archive | Preserve the testimony and isolate it | Sealed alcove, stable witness Echoes, independent archivist | Refuge service is lost; an Unstable Testimony Echo remains hostile | Preserved Name Charm / Original Chapel Plan |
| Last Dawn Cache | Bargain with Rusk and expose a cache | Last Dawn banner, recoverable cache, wary Order lookout | Moral and faction cost; survivors remember who enabled it | Last Dawn Archive Key |
| Restored Cemetery | Release the dead and restore voluntary remembrance | Restored oath stone, memorial, caretaker; quiet safe memorial | Some testimony is allowed to end rather than be retained | Rite of Final Refusal |
| Collapsed Foundation | Destroy access to the dangerous lower structure | Permanent collapse, rubble, evacuation warden | Ancient evidence and future access are sacrificed | Avarran Testimony Blade |
| Neutral Memorial | Fund an independent public memorial | Open witness stone, relief tent, public notice, campfire, Tomas | Significant supply cost and future political pressure from both factions | Neutral Memorial Seal |

Each outcome changes the POI's map name, journal description, visible props, residents or enemies, service profile, and safe-zone metadata. Unchosen aftermath content remains hidden. Resolving the POI also removes the unresolved Chapel hostiles and The Unnamed Witness.

## Class Execution

All six classes receive a distinct method whose advantage is paired with a meaningful risk:

- **Oathkeeper** — Can bind sanctuary authority to witnessed obligations. This protects civilians but makes the player morally responsible for Covenant breaches.
- **Gravecaller** — Identifies the Echoes as ritual residue rather than whole souls and can release their component dead. The method risks losing testimony that cannot be reconstructed.
- **Thornbinder** — Can divide the grave-memory network into living knots. The cemetery stabilizes, but the surrounding forest may inherit its dreams.
- **Waverider** — Can flood and break the lower threshold using the remembered watercourse. The contaminated flow continues toward a forgotten road.
- **Lightbringer** — Can collapse the foundation with controlled purifying force. The threat ends, but irreplaceable history is destroyed with it.
- **Fellhunter** — Reads the attacker tunnel, traps the route, and can leverage Rusk's escape network. This grants tactical control while empowering a morally compromised bargain.

Players without a class-specific route can still choose universal versions of sanctuary, archive, cemetery, collapse, or the resource-intensive neutral memorial.

## Race Execution

- **Human** — Tomas trusts familiar civic custom more readily, reducing the neutral memorial's supply burden. Humans receive social access but no supernatural certainty.
- **Cambion** — The war-era restraint cannot decide whether to imprison or obey a descendant of constrained war-Essence. This provides leverage over Rusk's route while increasing the danger of the old mechanism.
- **Nephilim** — Can preserve the sealed testimony through resonance with divine architecture. The same resonance makes the player more exposed to the missing station's unanswered pattern.
- **Vampire** — Can read the death order held in old blood and perform a precise release. Survivors require explicit consent and react with understandable fear.

Each race therefore receives both an advantage and a social, spiritual, or mechanical complication.

## Companion Reactions

- **Mara** recognizes that the defenders' sacrifice remains true even when later evidence complicates Covenant history, and warns that grave roots can carry grief into the forest.
- **Bram** reads the evacuation markings as competent preparation under panic.
- **Dusk** distinguishes indiscriminate fire from the deliberate removal of selected testimony and identifies the constructed absence in the nine-station plan.
- **Sister Elian** defends the purification lantern's genuine success while challenging the Covenant choice to obscure the site's earlier moral language.

These reactions occur at the evidence that earns them instead of in a detached lore conversation.

## The Unnamed Witness

The mini-boss is a fused ritual witness produced by repeated testimony, interrupted funeral practice, and Rot-contaminated identity. It is not a generic ghost and not evidence that the dead have returned intact.

Three discoveries materially weaken it:

- **Rite of Final Refusal** reduces maximum health by restoring the missing permission to leave.
- **Contradictory Healer Echo** further reduces health and disables regeneration by separating the fused identities.
- **Damaged Purification Lantern** reduces its damage through the surviving restraint cadence.

The player can awaken and fight it without this knowledge, investigate before combat, or end/bind/avoid the encounter through a non-combat commitment. This turns preparation into a mechanical advantage rather than flavor text.

## Rewards Added

- Avarran Testimony Blade
- Preserved Name Charm
- Original Chapel Plan
- Rite of Final Refusal
- Covenant Medical Writ
- Last Dawn Archive Key
- Neutral Memorial Seal

Rewards are tied to the culture and consequence of their branch rather than drawn from a generic loot table.

## Verification

The implementation was verified with:

- JavaScript syntax checks for every changed source module.
- A complete quest-flow simulation from Discovery through the completed Consequence journal entry.
- Registration checks for all required actors, four stages, 25 clues, six branches, and three boss-knowledge rules.
- A branch matrix covering all six classes, all four races, all six outcome families, the classless route, and neutral-memorial inventory consumption.
- Persistence checks confirming that a saved resolution restores the correct map name, journal summary, safe-zone metadata, aftermath objects/NPC, and enemy state.
- Visual rendering in the local game client, followed by a clue-label cleanup pass so the architecture and survivor staging remain readable.

## Remaining Risks and Recommended Follow-up

- Combat numbers for The Unnamed Witness are structurally tested but still need hands-on balance testing across low- and high-preparation builds.
- The outcome services use existing shrine, cache, campfire, and world-state systems. Unique vendor or memorial interfaces can be added later without changing the branch model.
- Safe-zone status is persisted at the POI level and the branch removes unresolved hostiles; localized suppression of unrelated roaming enemies is not yet a general engine feature.
- Worlds regenerated by the current content pipeline receive the full rebuilt POI. Very old saves that retain a previously serialized Echoryn object array may require a future content-version migration to inject the new scene automatically.
- Later quests should consume the durable outcome flags so the Chapel decision continues to matter beyond the immediate region.

The Chapel is now a strong template for future Runalis POIs: discoverable history, credible people on opposing sides, identity-aware approaches, preparation that changes mechanics, and a choice that remains physically visible after the quest ends.
