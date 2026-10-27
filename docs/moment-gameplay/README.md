# Runalis moment-to-moment gameplay pass — October 25, 2026

Implemented in production AI, stamina dodges, existing class mobility and skill morphs, continental composition, loot, inventory and persistence. No new active skills, currencies, progression trees, rarity ladder or class-exclusive route requirements were added.

## Enemy intelligence

`enemyTactics.js` samples local awareness at 4 Hz through a spatial grid, considering up to ten compatible allies within 320px and line of sight. Explicit encounter/population groups take precedence over faction or creature family. Runtime observations and destination reservations use WeakMaps. CPU sampling identified repeated visual-profile lookups; these are now cached within each awareness update.

- Human melee fighters sometimes take opposite flanks. Short reservations prevent allies choosing the same destination. Timeouts and cooldowns ensure flankers eventually close and attack.
- Shieldguards can screen preparing allied casters and bowmen. Existing guard breaks, telegraphs, parries and vulnerabilities remain authoritative.
- Ranged enemies can clear an occupied firing lane and retreat toward an actual melee ally. Retreat is bounded and gives way to a firing window. World and visibility checks still prevent attacks through walls.
- Compatible ordinary casters and heavy attackers briefly stagger major preparations, without replacing elite hazard budgets.
- Humans with support can respond to visible charging after an observation delay, favor closing during exposed recovery, or briefly regroup when severely wounded. Retargeting clears the previous target's observation.
- Wolves can circle as a pack; mindless corpses retain relentless advance. Not every creature or individual uses coordinated tactics.
- Eligible Roadless patrols can mix two melee fighters and a bowman, or a shieldguard, cutthroat and bowman. Existing archetypes, geographic counts and encounter RNG are reused.

Boss identities/states, Malakar, boss summons, dormant arenas, noncombatants and training dummies are excluded. Committed attacks, recovery, charges, controls and elite pauses retain control. Existing pursuit and physical spacing remain intact.

## Movement

| Class | Added identity |
| --- | --- |
| Gravecaller | Short tinted afterimages using equipped character art, spectral traces and burial/crypt accents. |
| Oathkeeper | Braced dash pose, dust and weighty landing rings. |
| Fellhunter | Sharper lean and arm pose with directional streaks. |
| Lightbringer | Gliding pose, radiant rays and consecrated-terrain accents. |
| Thornbinder | Leaf traces and foliage landing feedback. |
| Waverider | Current trails and ripples; actual Cryomancer, Hurricane and Sunken movement-skill morph palettes and accents. |

All six existing mobility paths are integrated, including legacy Divine Leap, Grappling Hook and Riptide Step, technique mobility and morph mobility. Palettes read the selected skill morph; no permanent subclass selection was introduced. Effects have short lifetimes, a bounded queue and cached ghost images. Poses preserve human proportions.

The audit reproduced a stationary east-facing dodge gaining a downward component because zero `dirY` became one. Zero is now retained. A 100ms buffer catches presses near the end of the existing dodge cooldown, without bypassing that cooldown, blocking or guard break. Dodge speed, duration, cost and invulnerability constants are unchanged.

Collision still controls all travel. Trails are clipped to valid space, and deep water, dungeon walls and arena barriers remain boundaries for every class. Terrain feedback was added; new phasing, vaulting and vine anchors were not introduced because the world lacks a uniform safe traversal contract for them.

Screenshots: [six class dodges](class-dodges.png), [Waverider morphs](movement-morphs.png).

## Discoveries and loot

Five persistent discoveries are composed around existing Echoryn content IDs, on reachable floor without changing terrain:

| Discovery | Location and reward |
| --- | --- |
| Weathered Courier's Satchel | Abandoned Caravan: modest supplies, a real clue toward Bandit Road Camp, and a seeded missing-scroll chance. |
| Oilcloth Supply Roll | Bandit Road Camp: guarded iron and hardwood for upgrades, with a small missing-scroll opportunity. |
| Grave-Mason's Recess | Grave Mound: burial resources, a real clue toward the old blighted den, and Blighted Star knowledge. Every class can investigate. |
| Blue-veined Blackiron | Mire Watchpost: existing Mining level 10 access, harvest yield and respawn memory. |
| Ritual Surveyor's Case | Last Dawn ritual site: guarded arcane dust and oathsteel, Ashen Executioner knowledge, and the existing rare-cache mythical roll. |

The guarded sites have 6, 3 and 10 nearby authored hostiles respectively. Clearing or drawing hostiles away permits recovery. Bags and recesses reuse scenery art, with nearby labels. No automatic minimap waypoints were added.

Claims, inventory, journal text and actual clue IDs survive save/load. Repeated claims cannot pay again; journals remain readable. Extra elite/boss materials require enemy level 8+, with stronger materials gated further. Ordinary enemies and low-level elites receive no extra rolls. Scroll selection avoids learned, bag, bank and owned uncollected copies; Demonseed's weapon-gated pact is excluded. Reading respects class, proficiency and weapon requirements and retains an unusable scroll.

Scrolls, selected upgrade materials and mythical pieces receive contextual labels and restrained first-discovery text, sound and a small pulse. Ordinary loot stays understated. Gear statistics, twenty-tier upgrades, regional mythical odds and three-piece sets remain authoritative. Original reward rolls retain their seeded stream; extra discoveries use a separate seed.

Screenshots: [courier site](courier-discovery.png), [loot labels](loot-discovery-labels.png).

## Main integration files

| Area | Files |
| --- | --- |
| AI and encounters | `enemyTactics.js`, `enemyBehaviors.js`, `combat.js`, `overworldEncounterSystem.js` |
| Movement | `classMovementProfiles.js`, `classMovement.js`, `classMovementArt.js`, `combatActions.js`, `playerAnimationController.js`, `combatExpansion.js`, `subclassCombat.js`, `combatVisualsRenderer.js` |
| Rewards | `gameplayDiscoveries.js`, `continentWorld.js`, `lootSystem.js`, `gameInteraction.js`, `skillScrollSystem.js`, `objectRenderer.js` |

Pre-pass versions of changed existing runtime modules are retained in `backups/moment-gameplay-2026-10-25/`. The browser reference serves these at their original URLs.

## Verification and performance

Run `node tools/verify-moment-gameplay.cjs` with the local preview on port 8768 and `RUNALIS_NODE_MODULES` set to the bundled dependency directory. The new AI, movement and discovery suites also run independently in Node. [Gate results and per-suite logs](regressions/results.json).

The 24-suite gate covers the new systems plus existing combat, visibility, pursuit, separation, respawn, elite hazards, density, subclasses, progression, loot, continental runtime/persistence/access, animation and Malakar. Browser checks cover class/morph rendering, real discovery sites, loot labels, dense combat, subclasses, mythical equipment and the keyboard-driven Malakar entrance, ritual, phases, death and exit.

New assertions cover flankers that reach melee, actual firing-lane and covered-retreat movement, bounded kiting, independent groups, delayed observations, all six mobility paths, deep-water/arena boundaries, bounded effects, scroll restrictions, guarded one-time claims, real mining and save roundtrips. 60,000 seeded extra-reward samples yielded no ordinary or low-level-elite extras. The 20,000 eligible elite samples yielded 6,986 entries, including 1,279 scroll entries for an unlearned recipient.

Two harness repairs were needed: a continental fixture used a retired Nav Stone ID and position, failing against pre-pass and current sources; it now uses the real destination, and all seven runtime groups pass on both versions. The Malakar browser fixture now uses the standard configurable preview URL rather than requiring a separate server on port 8774.

The historical October 12 `verify-performance.cjs` minimap comparison still differs from its retired source snapshot. Independent measurement found **564,077 differing channels both before and after this pass**. That historical comparison is not claimed as passing; current frame work and retained memory are checked separately here.

[Browser measurements](browser.json) and [before](dense-before.cpuprofile)/[current](dense-after.cpuprofile) CPU profiles use a seeded encounter with 80 base foes, 60 warmup frames and 240 measured frames. Temporary summons and positioning differ with the new decisions, so this is representative cost measurement, not an identical-work speedup claim. The base roster is unchanged. [Before](dense-before.png) and [current](dense-after.png) screenshots retain it.

The final gate passed **24/24 suites**. In the retained browser sample, median frame work was **6.9ms before and after**, with p95 **11.6ms before / 10.9ms after**. Total actors at the sample end were 83/80 because temporary summons differ. No browser page errors were recorded.

Five world/movement/render cycles followed by forced collection check retained JS heap growth against a 4 MiB post-warmup budget. Raw values are in the browser report. Native/GPU memory and presented display FPS are not certified by this test.

Retained JS heap rose from 11.33 MiB after the second cycle to 11.99 MiB after the fifth, a **0.66 MiB** difference. This short check does not certify long-session leak freedom.

## Limits

Tactics use local awareness and short collision-tested repositioning, not a global pathfinder or strategic commander. They do not predict hidden inputs or dodge RNG. Movement extends existing abilities with poses, feedback and terrain accents, without collision-bypassing traversal. Rewards are deliberately limited to five authored discoveries and existing categories. Longer balance sessions, target-device GPU profiling and extended multiplayer play remain follow-up validation.
