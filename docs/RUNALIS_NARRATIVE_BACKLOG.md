# RUNALIS narrative and world development backlog

31 October 2026. Ordered from verified continuity hazards toward authored expansion. Evidence: [assessment](RUNALIS_NARRATIVE_AUDIT.md), [World Bible](RUNALIS_WORLD_BIBLE.md), [current inventory](narrative-audit/INVENTORY.md), [checks](narrative-audit/VALIDATION.md).

**1 November roster amendment:** [quest curation implemented](quest-roster/README.md). Optional work in this historical backlog does not authorize restoring the retired companion, organization, miscellaneous or old surface-investigation quests. New quest expansion requires director direction under the currently limited roster.

P0 = persistent progression/revelation hazard. P1 = campaign/canon alignment or major missing requirement. P2 = meaningful world responsiveness/depth. P3 = selected expansion after foundations. Status distinguishes a confirmed defect from a missing feature, design decision or validation debt. Nothing below promotes a proposed solution into approved canon.

| Order / ID | Priority and status | Work / player impact | Dependency and owner |
|---|---|---|---|
| 1 — N-001 | P0, reproduced defect | Stop early/unrelated later-boss deaths completing unstarted Acts II/III and granting revelations/unlocks. | Narrative/runtime; consult combat owner if boss identities must change. |
| 2 — N-009 | P1, validation debt | Replace stale current-world expectations while retaining historical migration baseline. | Narrative QA; coordinate Nav Stone contracts with world/travel work. |
| 3 — N-003 | P1, active canon discrepancy | Review Last Lantern/Dusk/legacy Unbound delivery, correct unsupported objective history and premature revelations. | Narrative; director decision for identity/ending changes. |
| 4 — N-004 | P1, compatibility/editorial debt | Reconcile old campaigns and Veyr/Veyreign text with current optional castle and saved tasks. | Narrative/runtime; preserve personal vampire decisions. |
| 5 — N-002A | P1, required design decisions | Confirm Three Seraphs identities/domains, artifact purpose, Covenant commission, entry boundary and Seraphel role. | Director input; narrative prepares concrete options/spec. |
| 6 — N-002B | P1, confirmed missing content | Implement three physical domains, obtainable artifacts, independent quest order, justified solutions and Zarynth admission. | Depends on N-001/N-002A; art/combat requirements coordinated. |
| 7 — N-010 | P1, major content gap | Author approved Zarynth political/Synod investigation and reconcile Wastes/Spire/final-story structure. | Director act/outcome decisions; follows Act II dependency plan. |
| 8 — N-006 | P2, consequence gap | Fulfill selected promised callbacks from Chapel/Orchard/Keep/Order outcomes. | Audit existing `future.*` flags and consumer locations first. |
| 9 — N-005 | P2, response gap | Give existing faction reputation a small set of legible world effects; normalize key mapping without losing saves. | Narrative + service/system owners; no broad diplomacy rebuild. |
| 10 — N-008 | P2, ecology specification gap | Document Rot vectors/lifecycle/treatment and deliver evidence through current sites. | Existing canon and authored encounters; art/combat taxonomy coordination. |
| 11 — N-011 | P2, character depth gap | Stage-aware companion relationships and post-Malakar/POI callbacks; protect trainer access/recruitment duties. | Respect current shared/personal state rules. |
| 12 — N-007 | P2, civilization design gap | Approved briefs for modern powers and initial nonhuman communities before placement. | Director map/government direction; art requirements. |
| 13 — N-012 | P3, selective expansion | Enrich chosen later road branches and one underdeveloped dungeon at a time with authored discoveries. | Regional briefs, physical routes and performance budget. |
| 14 — N-013 | P2, continuing QA | Unassisted campaign, interruption, early-visit and real couch co-op playthroughs. | QA + combat director for balance; schedule alongside each repair. |

## N-001 — Protect story credit while retaining exploration

Confirmed evidence: a fresh player receives `act2AureateReckoning` / `act3Severance` completion through actual production boss death handling. `completeOrRecordQuest` creates a completed record even if the quest never started. Text/type matching also lets a generic holy factory boss impersonate the Seraphel story role in a controlled probe. Normal failed-purification side zones currently demote the boss and are not demonstrated affected locations.

Acceptance criteria:

- Story progress uses stable intended encounter identity, required campaign state and the explicit objective, independently of generic boss rewards.
- Early visitors can explore/fight where intended; defeating an unrelated or early boss cannot award future acts or restricted revelations.
- Returning after a legitimate early clear has a coherent playable resolution. Do not auto-complete the missing investigation or teleport past it.
- Repeated death callbacks/save reload do not duplicate rewards or erase real completion. Already polluted saves have a documented compatibility policy.
- Cover named final boss, nonfinal guardian, summoned/unrelated boss, optional holy/cosmic generation, normal quest stage, early visit, secondary player and save roundtrip.

Proposed implementation is intentionally left for the focused repair assignment. No combat rebalance is needed to decide story credit.

## N-009 — Maintain honest validation contracts

Keep the 8 October 32-quest/181-objective baseline as historical evidence. Current registry is 43 quests/179 objective records after deliberate rewrites and additions; a smaller objective count does not imply lost quests.

Acceptance criteria:

- Current contracts derive from approved final campaign stages, with explicit assertions for migrations from the old frozen shape.
- Retired Nav Stone expectations match `navStoneNetwork.js`; verify old discovery state does not create ghost destinations or duplicate payouts.
- Do not disable the whole suite or revert current scenes to obtain a green result.
- Document module-data versus runtime coverage and accelerated/injected browser steps. Current Malakar browser selectors already follow the shared party panel after this assessment.
- Refresh misleading implementation-report statements only when supported; preserve dates and historical claims as history.

## N-003 / N-004 — Reconcile lore without erasing useful compatibility

Audit active later dialogue, legacy saved conversations, old quest descriptions and actor naming. The First Keeping foundation conflicts with the “Runalis was first a mortal/name” Echo. Seraphel's dormant fallen-angel pitch conflicts with his Avarran office. Veyreign now has Alistair, Edrik's exterior echo and a personal encounter choice; old Veyr Warden/chalice assumptions must not return.

Acceptance criteria: distinguish objective truth from attributed belief; record the source and reveal tier of each changed statement; preserve established July cosmology and recent authored encounters; retain stable quest/NPC/dungeon identities; migrate old saved text/stages where necessary; demonstrate all required conversations still resolve. Major identity/ending decisions go to the director, not into an incidental text cleanup.

## N-002A — Reviewable Three Seraphs specification

Confirmed requirements: work with Covenant after Malakar; three domains on journey toward Zarynth; artifact from each; independent order; all three before entry; meaningful solutions where justified.

Decisions required before implementation:

1. Who each Seraph is, including relationship to Primearch cosmology and Seraphel.
2. Domain geography and reason each being occupies it; castle/dungeon/otherworld are candidate forms, not mandatory assignments.
3. What each artifact does, who commissions recovery, and why Zarynth needs all three.
4. What “enter Zarynth” means given the already playable public Trade Ward and open roads.
5. Which peaceful/negotiated/combat solutions are credible and what each costs.
6. How existing Act II/Elian/Choir completion and old saves migrate; how the later act structure changes.

The narrative department should supply concrete options with costs/dependencies for approval. Do not invent final identities or mechanics merely to fill the document. No unsolicited provisional trio was added in this assessment.

## N-002B / N-010 — Implement complete acts, not data-only objectives

After decisions, each domain/capital investigation needs actual entrances/routes/landmarks, eligible NPCs/enemies, interactions and artifact/evidence acquisition, journal directions, recoverable interrupted states, rewards, persistent outcomes, revisits, early-visit behavior and cooperative ownership. Every accepted alternative solution must be tested and acknowledged.

Maintain a dependency/revelation map. A capital admission check must cover roads, stones, instance returns and future shortcuts consistently without turning the whole continent into an arbitrary quest gate. Final-act geography, Synod investigation, Ninth naming and endings require director-approved causality before implementation. Existing Spire clear/ending flags do not prove an ending selection or coherent final campaign.

Art handoff: purpose, historical layer, faction/public-versus-secret evidence, silhouettes/landmarks and required interactive states. Combat handoff: motives, unavoidable versus optional fight, surrender/negotiation conditions, manifestation anchor and post-battle consequences. Specialists retain visual/combat architecture ownership.

## N-005 / N-006 / N-011 — Make existing choices legible

Start with existing evidence custody, Chapel control, Rusk survival, Order shelter/research policy and post-Malakar relationships. Inventory actual producers and consumers before promising future callbacks. Propose a small response set: context dialogue, a justified service/quest change, a changed patrol/resident or a bounded follow-up. Prices/hostility are options, not mandatory responses for every faction.

Acceptance criteria: immediate consequence is understandable; state persists through save/return; relevant actors acknowledge it; repeat interactions do not farm trust; shared versus personal effects are explicit; essential trainers/witnesses remain available through duty-preserving affiliation or replacements that are actually implemented. No universal “everyone joins” override of existing allegiance or protected duties.

## N-007 / N-008 / N-012 — Authored world expansion

Modern-power briefs must establish origins, government, material interests, religion, internal disagreement, public reputation, relationships and travel/geography before construction. Nonhuman peoples need distinct lived cultures beyond creator-God labels. Do not silently map foundation-era empires onto current nations.

Rot specification must reconcile growth, water, Essence, memory, reservoirs, flowers and beasts with the existing Orchard/Chapel/Grove evidence. Early witnesses know symptoms and techniques; restricted Synod origins remain late evidence. Treatment and eradication are distinct.

Select a few off-road places and underdeveloped dungeons from measured travel routes. Each needs purpose/history, distinctive navigation, a discoverable problem, interaction/challenge and a meaningful reward or knowledge consequence. Confirm both ordinary walking access and return behavior. Use existing world/quest/POI systems. Patrol spawns and generic caches are not a substitute for authored discovery.

## N-013 — Completion gate for future assignments

For every changed quest validate discovery, acceptance, objective progression, required NPC/item/enemy/interaction availability, completion/reward/follow-up, consequences, interruption/retry, save/load, early visit and intended alternatives. Walk actual routes when navigation changes. Exercise solo and secondary-player ownership/scene entry where relevant.

Current automated results establish important progression and geometry contracts. They do not replace normal-speed survival playthroughs, earned-equipment boss fights, two-person controller sessions, broad historical-save sampling or long-session performance. Report those limits per assignment; do not mark the whole quest population “AAA complete” from syntax/reference checks.
