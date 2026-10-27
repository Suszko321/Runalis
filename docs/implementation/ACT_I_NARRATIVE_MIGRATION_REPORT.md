# Runalis Act I Narrative Migration — Pre-Implementation Report

**Status:** Approved implementation baseline, written before game-content changes  
**Scope:** Act I narrative, environmental storytelling, faction presentation, quest framing, and Malakar story context  
**Mechanical constraint:** Preserve existing maps, exploration loop, combat, enemies, dungeons, boss mechanics, NPC placements where practical, assets, rewards, and progression structure.

## 1. Intended Player Experience

Act I will teach the player five apparent truths through play and scenery before any character explains them:

1. The Covenant are the people keeping civilization alive.
2. The Order of the Last Dawn are violent heretics willing to sacrifice civilians and relief efforts.
3. The Rot is winning a slow war against the living world.
4. Humanity is exhausted, organized, and losing ground rather than already defeated.
5. Something from the Divine Age is waking beneath the present crisis.

These beliefs remain credible throughout Act I. Malakar's defeat introduces the first clean fracture without reversing everything the player has witnessed. The new question is not whether the Covenant's good works are false, but whether its highest authorities have withheld the origin and purpose of the crisis.

This strengthens the game by giving exploration a dependable interpretive frame first, then turning accumulated evidence into mystery rather than replacing one exposition dump with another.

## 2. Opening Migration

### Current state

New profiles begin safely in Orrakai, receive starting supplies, and immediately inherit the existing Act I quest. The current flow communicates game systems but does not provide a personal loss, establish the Last Dawn, or let the player encounter ordinary life before the wider crisis.

### New state

New profiles will begin as an ordinary guard in a small playable caravan scene. The scene will reuse the established player controller, camera, world renderer, dialogue system, enemy archetypes, combat loop, and transition infrastructure.

The caravan will contain merchants, pilgrims, children, veterans, travelers, wagons, bedrolls, cooking gear, trade goods, and a guarded artifact bound for Zarynth. Brief optional conversations establish ordinary motives rather than lore. The caravan master advances the departure state. A Last Dawn strike then overwhelms the caravan, steals the artifact, and leaves the player defeated. The scene fades to black and resumes in Orrakai.

The encounter is a controlled narrative defeat. It will not change the permanent death, save, or regular combat rules outside this opening state. Existing enemy behavior and combat feedback are reused, while a scene controller guarantees that the artifact theft and transition occur even if the player's combat performance varies.

### Natural discovery

- The artifact's importance is shown by guards, a sealed wagon, and Dawn operatives prioritizing it.
- The attackers' apparent villainy is shown by casualties, burning wagons, and their disregard for civilians.
- The player's social status is shown by their duties and how travelers address them.
- No opening character knows the artifact's complete history.

## 3. Orrakai Recovery and Environmental Migration

### Current state

Orrakai is mechanically functional and populated, but reads primarily as a safe service hub. The Rot crisis, Covenant relief network, quarantine pressure, and cost of survival are not visually strong enough to carry the narrative before dialogue begins.

### New state

Orrakai remains safe and fully functional, but will be dressed as a city under sustained medical and logistical pressure. Existing buildings, vendors, services, exits, and NPC placements remain. New narrative objects and ambient characters will be layered around them:

- quarantine tents and marked lanes;
- plague notices, warning boards, and controlled barricades;
- sick wagons, infirmary cots, medicine crates, and washing stations;
- purification braziers, censers, bells, and pale smoke;
- supervised burn pits outside dense civilian areas;
- fresh graves, funerary candles, memorial stones, and family offerings;
- masked children, waiting families, exhausted physicians, relief workers, grave tenders, and peacekeepers;
- supply sorting and patrol activity that makes the Covenant visibly useful.

The city should feel strained but inhabited. Markets still trade, smiths still work, families still argue, and children still occupy public spaces. This prevents the Rot from becoming generic post-apocalypse scenery and makes preservation itself a visible form of heroism.

### Covenant visual language

New and migrated Covenant actors will share a practical visual vocabulary: cream or white working robes, muted gold trim, lantern/sunburst markings, standardized belts and satchels, bandages, books, censers, medicine, or staffs. Rank will be communicated through trim, outer layers, and carried tools rather than ornamental fantasy armor.

This makes trust legible at a glance and creates a strong visual baseline for later ambiguity: any institutional revelation must contend with the real relief work the player has personally seen.

## 4. Echoryn and the Rot as a World System

### Current state

Echoryn already contains exploration content, camps, landmarks, encounters, POIs, ruins, and escalating danger. The Rot is present, but its environmental progression is not consistently organized into a readable ecological gradient.

### New state

The existing world map and routes remain. Narrative dressing will create a transition from relatively healthy approaches to visibly compromised territory:

- healthy woodland with early warning marks and refugee footprints;
- guarded relief roads, caches, water checks, and purification shrines;
- abandoned camps, dead wildlife, failed bridges, blackened roots, and distorted trees;
- medical convoys and evacuation traces showing organized resistance;
- Last Dawn sabotage sites showing destroyed supplies, burned records, broken purification equipment, and ambushed patrols;
- older ruins partially consumed by the Rot, implying that the present outbreak intersects buried history.

The player discovers severity through repetition and change: the same kinds of objects—trees, water, roads, shrines, bodies, and camps—become progressively less healthy. This supports preparation gameplay because supplies, safe paths, and field knowledge become narratively meaningful rather than merely mechanical.

## 5. Faction Migration

### Covenant

The Covenant will be presented through doctors, teachers, historians, relief workers, diplomats, peacekeepers, missionaries, and priests. Existing chapel- and relief-aligned content will migrate under a consistent Covenant identity while legacy internal identifiers may remain where changing them would threaten save compatibility.

Act I will not depict the Covenant as secretly cruel in ordinary operations. Its members perform real good and deserve the public's trust. Ambiguity is reserved for incomplete institutional history and decisions made at the highest level.

### Order of the Last Dawn

Existing cult, Ember Veil, red-seal, and hostile relic-seeker content will be recontextualized as the Order of the Last Dawn. Legacy IDs and enemy mechanics can remain internally; player-facing names, descriptions, dialogue, props, and goals will change.

In Act I, the Order will:

- attack the opening caravan and steal the artifact;
- destroy or seize relief supplies;
- burn records;
- sabotage purification sites;
- ambush medical convoys and Covenant patrols;
- occupy old sites connected to the Divine Age;
- complete the summoning of Malakar.

Their actions remain condemnable even when their wider purpose becomes more understandable. This supports moral ambiguity without retroactively claiming that witnessed atrocities did not occur.

### Hidden context

The Order does not worship Malakar. It requires a surviving intelligence from the Divine Age because the gods and their institutions have controlled the historical record. This distinction is concealed until the post-boss exchange.

## 6. Quest Migration

The existing Act I quest ID, stage count, reward cadence, exploration requirements, dungeon progression, and final boss structure will be retained to protect saves and mechanical pacing. Stage titles, descriptions, dialogue, and objective framing will be rewritten around the canonical crisis.

Each stage must answer one practical question and raise one historical question:

| Act I movement | Practical answer | New question |
|---|---|---|
| Recovery in Orrakai | The Covenant saved the player and is containing the Rot. | Why did the Last Dawn want the caravan artifact? |
| Relief preparation | Orrakai survives through disciplined supply work. | Why are ordinary remedies becoming less effective? |
| First road patrol | The Rot changes routes, animals, and bodies. | Why does it follow ancient foundations? |
| Failed purification | Covenant rites work, but not consistently. | What interferes with them beneath certain ruins? |
| Evidence recovery | The Last Dawn targets records and relic routes deliberately. | What knowledge are they trying to monopolize or expose? |
| Broken chapel / red seal | The Order is mapping sites from the Divine Age. | Who taught them how to read those sites? |
| Descent | The Order intends to awaken Malakar. | Why would enemies of the gods need an ancient Primordial alive? |
| Malakar | The summoning was an interrogation strategy, not worship. | What truth has Seraphel omitted for thousands of years? |

Side quests and existing local content will be reviewed with the same rule. Content that cannot directly advance the main mystery will still reinforce civilian cost, preparation, exploration, faith, or layered history.

## 7. Malakar Migration

Malakar remains the existing Act I boss encounter. Arena, combat phases, attacks, adds, difficulty, drops, and progression unlocks remain unchanged.

Player-facing context changes from generic demon-lord framing to canonical Primordial history. Malakar is an exceptionally powerful surviving Primordial, not a Primearch. That distinction matters because:

- a Primearch is an office-bearing first servant shaped for a god's cosmic purpose;
- Malakar possesses immense age and power but no divine mandate or protected office;
- the Last Dawn can bind, bargain with, and exploit him in ways that would be impossible with Seraphel;
- his testimony is valuable because he witnessed the Divine Age from outside the official hierarchy.

After defeat, Malakar speaks calmly. He clarifies that the Order needed him and did not worship him, then delivers the canonical warning:

> “When you stand before Seraphel...
> listen carefully.
> He has not lied for thousands of years.
> He has simply never told all of the truth.”

The scene will set new canonical story flags while retaining any legacy completion flags required by saves and downstream systems.

## 8. Reuse and Change Matrix

| Content | Reuse | Narrative modification |
|---|---|---|
| Player controller and combat | Full | Opening uses a controlled defeat state |
| Orrakai map and services | Full | Environmental layer and ambient relief activity added |
| Echoryn map and routes | Full | Rot gradient, relief traces, sabotage, and ruins added |
| Enemy archetypes | Full mechanics | Last Dawn-facing names and faction context |
| Existing NPC placements | Preserved where practical | Dialogue, clothing identity, and affiliations migrated |
| Quest engine and Act I quest ID | Full | Stage prose and story purpose rewritten |
| Dungeon generation and traversal | Full | Names, inscriptions, evidence, and faction context migrated |
| Malakar boss mechanics | Full | Identity, history, barks, and post-fight revelation rewritten |
| Rewards and unlocks | Full unless a text-only rename is required | Item descriptions can carry historical clues |
| Save system | Full with compatibility branch | Legacy IDs and completion flags retained |

## 9. Significant Dialogue Changes

- Replace obsolete Ascension/Unbound/demon-cult framing in Act I-facing dialogue.
- Give Orrakai characters immediate, role-specific concerns: triage, supplies, quarantine, burial, road safety, missing records, and refugee flow.
- Make Covenant dialogue confident in service but cautious about interpretations of ancient history.
- Make Last Dawn speech terse, doctrinal, and hostile without revealing the full thesis early.
- Ensure major dialogue confirms evidence the player has already seen.
- Rewrite Malakar's post-fight exchange around his status as a Primordial witness and the Order's need for testimony.

## 10. NPC Behavior Additions

- Caravan civilians idle around role-appropriate objects and react to the ambush.
- Last Dawn attackers prioritize the sealed wagon during the scripted strike.
- Covenant relief personnel follow short routes between wagons, cots, braziers, and supply stacks.
- Peacekeepers hold quarantine boundaries rather than appearing as decorative guards.
- Families and masked children remain near medical and memorial spaces.
- Field scenes use survivor, scout, physician, refugee, and saboteur placements to communicate events without quest text.

## 11. New Prop and Environmental Storytelling Inventory

The migration will prefer existing renderer-compatible prop families and colors. New semantic variants may be added where needed:

- sealed artifact wagon;
- collapsed and burned caravan wagons;
- quarantine tent and plague marker;
- infirmary cot and washing basin;
- sick wagon and medicine stack;
- purification brazier and censer smoke;
- warning bell;
- supervised burn pit;
- fresh grave, memorial stone, candle cluster, and family offering;
- relief cache and broken supply crate;
- sabotaged shrine apparatus;
- burned record pile;
- refugee bedroll trail;
- dead wildlife and Rot-black root growth;
- Last Dawn red-seal markers;
- Divine Age inscription fragments.

## 12. Compatibility and Risk Controls

- Keep stable quest, boss, dungeon, and faction IDs where downstream systems depend on them.
- Add canonical flags rather than deleting legacy flags.
- Limit scripted opening behavior to the dedicated opening world mode.
- Regenerate or safely serialize the opening scene without affecting overworld saves.
- Preserve all service interactions and world exits in Orrakai.
- Avoid moving blockers onto existing paths, NPCs, exits, or interactable tiles.
- Use non-blocking dressing for environmental clusters unless collision is explicitly useful.
- Verify both a fresh profile and a legacy save path.

## 13. Acceptance Criteria

The migration is successful when:

1. A fresh profile plays the caravan guard opening, loses the artifact to the Last Dawn, and awakens in Orrakai.
2. Orrakai visually communicates quarantine, relief, faith, burial, and strained ordinary life before required dialogue.
3. Covenant personnel read as a coherent, trustworthy civil institution.
4. Echoryn communicates an escalating Rot gradient and an active relief war through scenery.
5. Existing Act I exploration, combat, quests, dungeon access, boss mechanics, rewards, and unlocks still function.
6. The Last Dawn appears responsible for concrete atrocities throughout Act I without exposing its complete rationale.
7. Malakar is explicitly a Primordial and not a Primearch.
8. Malakar delivers the required Seraphel warning after defeat.
9. Each major quest movement answers one question and creates another.
10. New and legacy saves load without a progression-blocking error.

