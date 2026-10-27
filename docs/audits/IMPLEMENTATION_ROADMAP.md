# Runalis Prioritized Implementation Roadmap

Audit date: 2026-07-21

## Roadmap objective

Migrate Runalis from its older Unbound/Ascension continuity to the new master canon while preserving the working RPG foundation. The order below deliberately stabilizes truth and data ownership before producing large volumes of dialogue, quests, or lore.

## Non-negotiable preservation rules

- Do not replace the combat, skill, inventory, crafting, controller, co-op, save, world-interaction, quest-objective, dialogue-condition, travel, dungeon, tower, or rendering foundations without a demonstrated technical need.
- Keep Orrakai and the Echoryn overworld as primary assets.
- Preserve existing save migrations and add aliases/deprecations rather than silently invalidating profiles.
- Preserve Malakar, Seraphel, and Zephyr's usable combat behavior and visual work while changing their story identities.
- Preserve Mara Vell, Warden Mael, Bram, Kaelen Dusk, and Sister Elian unless a later character audit finds a specific failure.
- Treat old lore as migration input, not as an equal canonical authority.
- Do not mass-rename internal IDs until player-facing canon is stable. Use aliases and validation first.

## Priority overview

| Priority | Workstream | Why it comes now |
|---|---|---|
| P0 | Canon freeze and source-of-truth consolidation | Prevents every later asset from being written against obsolete lore. |
| P0 | Content validation and portability safety | Protects the existing prototype during migration. |
| P1 | Playable caravan opening and Orrakai handoff | Establishes the correct player promise using the strongest existing hub. |
| P1 | Act I Rot/Order/Covenant conversion | Creates the first complete new-canon vertical slice. |
| P1 | Malakar climax conversion | Delivers the first required worldview shift. |
| P2 | Companion/faction consequence systems | Gives moral ambiguity gameplay consequences. |
| P2 | Optional lore and environmental evidence | Supports exploration-first storytelling without forced reading. |
| P2 | Act II Frontier Marches expansion | Builds the trust/control arc and regional antagonist. |
| P3 | Zarynth, hidden order, and Zephyr investigation | Provides the political and conspiracy layer required for Act III. |
| P3 | Cosmology/race rollout | Introduces only what the playable regions and mysteries require. |
| P4 | Content depth, balance, production QA | Converts the cohesive vertical slices into a commercial-quality whole. |

## Phase 0 — Canon and technical stabilization

### 0.1 Create a canonical content package

Deliverables:

- `canon/` data modules or equivalent registries for chronology, Gods, Primordials, Primearchs, races, factions, locations, characters, revelations, and terminology.
- A `canonVersion` stored in saves and content metadata.
- A deprecation table for every old high-impact term and fact.
- A rule that live quests/dialogues reference canonical IDs rather than duplicating biographies or cosmology.

Initial migration decisions:

| Existing concept | Canon migration default |
|---|---|
| Orrakai | Act I recovery hub and regional political center. |
| Echoryn Forest | Orrakai's surrounding exploration region. |
| Hearthmere | Satellite settlement/district/older regional name; final choice must remove ambiguity. |
| Dawnspire Network | Hidden-order infrastructure derived from Ninth-God remnants, not the entire cosmology. |
| Unbound | Acquired, disputed, non-unique condition caused or exposed by the artifact event—or retire it. |
| Ember Veil | Order splinter, false-flag force, or repurposed extremist cell; no generic demon worship. |
| Ascension Wastes | Zarynth-adjacent scar, hidden layer, or late-game transformed zone. |
| Runalis as a person | False/partial folklore unless later canon proves it necessary. |

Acceptance gate:

- Every blocker contradiction in the audit has an explicit migration ruling.
- New story content can answer “which file owns this fact?” with one location.
- The Ninth-God truth is stored separately from player-visible public lore.

### 0.2 Consolidate runtime data ownership

Deliverables:

- Connect or retire `storyData.js`, `bossData.js`, `dungeonData.js`, and `companionData.js`; do not leave parallel authoritative copies.
- Replace hard-coded boss narrative strings with canonical boss profiles while retaining combat functions.
- Make act completion depend on explicit canonical milestones, not boss-name/theme substring matching.
- Mark `questSystem.js`, `dungeon.js`, and `enemyAI.js` clearly as legacy or remove them only after confirming no external use.
- Align case-sensitive imports (`dialogueUi.js` and `RunalisContentExpansion.js`).

Acceptance gate:

- The active entry point imports one boss definition layer, one dungeon definition layer, one companion layer, and one act-story layer.
- A major boss cannot be spawned solely because a dungeon uses a generic holy/cosmic theme.

### 0.3 Add automated content validation

Deliverables:

- Syntax and module-link smoke test.
- Case-sensitive import-path validator.
- Cross-reference validator for quest, NPC, POI, item, enemy, dungeon, route, faction, character, God, Primordial, and flag IDs.
- Duplicate-ID and unreachable-content report.
- Retired player-facing terminology check with an allowlist for migration aliases.
- Save-migration fixtures for old profiles.
- Browser smoke test covering new profile, character creator, Orrakai spawn, save/load, south-gate travel, one dialogue, one quest update, one combat encounter, and return.

Acceptance gate:

- Current 29 quests retain valid NPC/POI references.
- No broken imports on a case-sensitive environment.
- Existing profiles load without losing inventory, equipment, skills, class, bloodline, quest, or world state.

## Phase 1 — New-canon Act I vertical slice

### 1.1 Implement the playable caravan opening

Use the current input, combat, dialogue, save, and quest systems.

Required beats:

1. Player is established as a paid caravan guard, not a prophesied hero.
2. A few caravan members become memorable through action, not biography dumps.
3. The artifact is visible and mechanically distinctive but not explained.
4. The Order of the Last Dawn attacks using tactics that show planning and urgency.
5. The player loses; survival is plausible and costly.
6. The Order takes the artifact.
7. Recovery transitions into the existing Orrakai hub.
8. Mara, Mael, or another grounded character gives the player an immediate practical task.

Preserve:

- classless start;
- character creator, either before departure or during recovery;
- Orrakai services and trainers;
- profile creation and saves.

Acceptance gate:

- A new player understands the immediate goal without reading lore.
- The Order appears dangerous, not cartoonishly evil.
- The artifact raises at least two questions and answers none completely.
- No dialogue calls the player chosen, destined, or uniquely prophesied.

### 1.2 Establish Rot Blight gameplay language

Deliverables:

- Rot stages for terrain, resources, creatures, and people.
- Visual distinction among natural decay, Rot, Covenant intervention, and Primordial manifestation.
- Rot-aware enemy variants using existing archetypes and render profiles.
- Harvesting, route, treatment, quarantine, and crafting interactions.
- A small number of early false explanations.

Preserve:

- existing corruption palettes, failed-purification props, resource nodes, status effects, and enemy behavior as implementation material.

Acceptance gate:

- Players can learn to identify Rot through play before a character formally explains it.
- Rot affects at least exploration, combat, and one survival/crafting loop.

### 1.3 Convert the Act I quest spine

Replace or migrate `Ashes of Hearthmere` stages into a new Orrakai/Rot/Order structure while keeping the objective engine.

Required sequence:

- recovery and local stakes;
- Covenant aid that genuinely saves lives;
- Order evidence that initially supports the villain interpretation;
- Warden Mael and Mara Vell in conflict over methods or priorities;
- optional ruins/evidence that complicate the story;
- pursuit of the artifact/Order;
- discovery that the Order seeks Malakar's knowledge;
- summoning crisis and descent;
- Malakar defeat and warning about Seraphel.

Acceptance gate:

- Act I can be completed without lore reading.
- Optional evidence changes dialogue, preparation, or interpretation.
- The player finishes with more questions than at the start.
- The Covenant remains credibly heroic from the player's current evidence.

### 1.4 Convert Malakar without rebuilding the fight

Deliverables:

- Primordial profile, creator lineage, realm, imprisonment history, and manifestation rules.
- Order ritual logic and cost.
- Revised arena evidence using existing dungeon set pieces.
- Revised pre-fight, phase, defeat, and post-fight dialogue.
- Explicit distinction: Malakar is a Primordial, not a Primearch.
- Death warning: “Do not trust Seraphel,” with enough context to be unsettling but not self-proving.

Acceptance gate:

- Existing multi-phase behavior, co-op scaling, rewards, and save hooks still function.
- No player-facing angel/demon terminology remains in the encounter.
- The Order's purpose becomes comprehensible without absolving its crimes.

## Phase 2 — Consequence systems and Act II

### 2.1 Make companions operational

Deliverables:

- Connect the Mara/Bram/Dusk/Elian data to live runtime state.
- Relationship changes from decisions, field actions, quest outcomes, and travel choices.
- Camp conversations keyed by act, relationship, and unresolved events.
- Companion disagreements; not every choice should have one universally approved answer.
- Personal quests that change later scenes or availability.

Acceptance gate:

- Relationship state changes at least dialogue, one quest outcome, and one late-game scene.
- Companions are more than trainers and approval meters.

### 2.2 Replace alignment with faction pressure and reputation

Deliverables:

- Faction public aims, internal blocs, methods, resources, red lines, and player standing.
- Covenant represented as a full faction with sincere service arms and hidden corruption.
- Order of the Last Dawn represented separately from the hidden conspiracy.
- Hostility derived from local state/actions where practical rather than fixed moral labels.

Acceptance gate:

- At least three factions can help the player for incompatible reasons.
- No major faction can be summarized accurately as simply good or evil.
- Zephyr and the handful of truly evil individuals remain exceptions, not the template.

### 2.3 Add optional lore interactions

Deliverables:

- Reusable readable/inspectable object type built on the current interaction/dialogue UI.
- Books, inscriptions, relic records, murals, maps, and architecture inspections.
- Journal entries split into observed fact, attributed claim, and unresolved question.
- Lore rewards that can reveal routes, recipes, boss preparation, faction leverage, or dialogue options.

Acceptance gate:

- The critical path never requires reading a long text.
- Optional lore gives at least one practical benefit per major location.
- Early clues can be reinterpreted after later reveals.

### 2.4 Expand the Frontier Marches and build the regional antagonist

Deliverables:

- Expand Aureate Marches from a 120 x 64 shell toward a full exploration region.
- Prosperous settlements, farms, military roads, pilgrim infrastructure, ruins, and ordinary Covenant good works.
- A regional antagonist who embodies coercive order in a visible, defeatable form.
- Seraphel scenes that are patient, compassionate, and genuinely helpful.
- Evidence trail that makes Malakar's warning gradually credible without making Seraphel overtly sinister.

Acceptance gate:

- Players have concrete reasons to admire the Covenant and Seraphel.
- The regional antagonist can be defeated without resolving the deeper ideological problem.
- The Seraphel reveal occurs near the climax and retrospectively changes earlier scenes.

### 2.5 Convert Seraphel to a Primearch

Deliverables:

- God lineage, Primearch status, historical appearances, worship traditions, and relationship to lesser Primordials.
- Goal and method that grow from compassion but violate freedom.
- Boss-phase narrative aligned with the new motive.
- Clear power/status distinction from Malakar.

Acceptance gate:

- Seraphel never reads as a generic fallen angel.
- His appearance has civilization-level consequences.
- The player can understand his case without the story endorsing it.

## Phase 3 — Zarynth, conspiracy, and final-act truth

### 3.1 Build Zarynth as a political region

Deliverables:

- Government, districts, economy, military, Covenant hierarchy, courts, archives, pilgrim systems, and class/race tensions.
- Major political characters with leverage and conflicting interests.
- Public Zephyr mythology and visible humanitarian achievements.
- Multiple access paths: official, criminal, religious, scholarly, and factional.
- A defined place for any retained Ascension Wastes content.

Acceptance gate:

- Zarynth works as a believable city/kingdom before its secrets are revealed.
- Political choices affect access, allies, evidence, and risk rather than only dialogue flavor.

### 3.2 Implement the hidden order investigation

Deliverables:

- Distinct name, origin, doctrine, cells, records, and relationship to the Covenant.
- Rot Blight program timeline and operational purpose.
- Experiment sites and evidence of failed children, handled without exploitative spectacle.
- Survivors, defectors, handlers, beneficiaries, and people who rationalize the program.
- A staged Ninth-God reveal that remains restricted until late game.

Acceptance gate:

- The hidden order is never confused with the Order of the Last Dawn.
- The player can reconstruct the conspiracy from multiple source types.
- The reveal assigns human responsibility rather than blaming an awakening evil.

### 3.3 Rebuild Zephyr's canonical profile

Deliverables:

- Childhood/manufacture timeline, Ninth-essence procedure, education, public rise, private victims, and manipulation methods.
- Public acts that plausibly make him humanity's greatest hero.
- Private scenes that show hatred refined into deliberate choice.
- Relationship to Seraphel, the Covenant, the hidden order, and the Rot project.
- Boss dialogue that uses truth and empathy as weapons without seeking sympathy from the audience.

Acceptance gate:

- Zephyr is beautiful, intelligent, cold, patient, charismatic, and irredeemable.
- His manufactured origin explains capabilities and context but does not remove agency.
- The final conflict resolves the story's political and theological stakes, not only a cosmic health bar.

### 3.4 Finalize endings after metaphysics are stable

Evaluate the existing destroy/replace/sever choices only after Ninth-God essence, Divine Realms, Primordial manifestation, bloodlines, and Zephyr's construction have fixed rules.

Acceptance gate:

- Each ending has a cost visible in companions, factions, regions, faiths, and future games.
- No ending is a hidden “correct” utopia.
- Hope remains possible without erasing consequence.

## Phase 4 — Broader world and franchise foundation

### 4.1 Introduce Gods, Primordials, and races through need

Do not front-load an encyclopedia. Add only the Gods, Primearchs, peoples, and cultures required by current regions, classes, bloodlines, ruins, and conflicts.

For every intelligent race, require:

- creator lineage;
- historical homeland and diaspora;
- architecture/material culture;
- religion and internal disagreement;
- political interests;
- relationship to patron God;
- relationships with neighboring peoples;
- playable or encounter role.

Acceptance gate:

- No race exists because the genre expects it.
- Visual and mechanical identity can communicate culture without exposition.

### 4.2 Periodize the world's ancient layers

Deliverables:

- historical era chart;
- architectural/material language guide;
- script and symbol guide;
- ruin ownership and reuse matrix;
- official histories and counter-histories;
- location-by-location archaeological stack.

Acceptance gate:

- A player can learn to recognize at least three historical layers visually.
- Modern buildings visibly reuse older foundations for political or practical reasons.

## Phase 5 — Production depth and quality

### Content completion

- Expand Act II and Act III encounter density without copying Act I composition.
- Convert procedural major dungeons into authored procedural hybrids that read canonical floor/room definitions.
- Add faction- and region-specific enemies rather than renaming shared archetypes indefinitely.
- Audit all 217 items, 56 abilities, 63 recipes, and loot tables for canonical provenance and regional economy.
- Ensure every major quest teaches lore, develops a character, rewards exploration, and raises a new question.

### Quality and balance

- Full keyboard/controller/co-op regression pass.
- Save compatibility across canon versions.
- Quest failure/re-entry/sequence-break testing.
- Performance profiling of the 640 x 480 Act I world.
- Combat, economy, route-cost, crafting, loot, and boss tuning.
- Case-sensitive deployment test.
- Accessibility review for text size, color reliance, controls, and combat telegraphs.

## Recommended first implementation slice

The first code/content milestone should be deliberately small:

1. Canon registry skeleton and migration map.
2. Case-sensitive import fixes and content validators.
3. New-profile caravan opening.
4. Orrakai recovery handoff using Mara and Warden Mael.
5. First Rot-affected investigation outside the south gate.
6. One Order encounter with evidence that complicates the obvious villain reading.
7. Save/load regression through the entire slice.

This milestone proves the new canon in the running game without destabilizing the broader RPG systems.

## Definition of roadmap success

The roadmap is succeeding when the player can ignore lore and still enjoy a grounded exploration RPG, while a curious player can infer a deep, contested history from systems, places, people, and objects—and when every new discovery changes what earlier evidence might mean.
