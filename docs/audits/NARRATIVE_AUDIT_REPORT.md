# Runalis Narrative Audit Report

Audit date: 2026-07-21  
Scope: the complete local Runalis workspace, including all 100 JavaScript source modules, `index.html`, `style.css`, the README, generated world builders, and all narrative/content data.

## Executive finding

Runalis already has a substantial RPG prototype beneath an outdated narrative layer. The correct strategy is to preserve the mechanical foundation and migrate the fiction around it.

The running game currently supports a classless start in Orrakai, seven canonical class paths, combat and survival progression, quests, dialogue, a very large Act I overworld, compact Act II and Act III regions, travel routes, procedural dungeons, repeatable side zones, an infinite tower, bosses, local co-op, controller support, crafting, equipment, shops, saves, and a PvP arena.

The current story is not the story in the new master brief. It is an older “Unbound / Dawnspire Network / Ascension” arc in which Malakar is a demon lord, Seraphel is a fallen angel, and Zephyr is a compassionate cosmic assimilator. The new brief instead establishes Primordials and Primearchs, the Order of the Last Dawn, the Rot Blight, the hidden conspiracy, the Eight and forgotten Ninth Gods, and a manufactured, irredeemable Zephyr. These are foundational canon conflicts, not wording differences.

No story expansion should be added until the project has one canonical narrative data layer. New content written against the current runtime would deepen the migration cost.

## Audit method and confidence

The audit used four evidence levels:

- **Live and wired:** reachable from `src/main.js` and connected to the active game loop or UI.
- **Playable prototype:** wired and functional, but content-light, procedurally generalized, or not production-balanced.
- **Authored data only:** detailed definitions exist, but the active runtime does not import them.
- **Legacy/unreachable:** superseded modules that are not reachable from the active entry point.

All 100 source modules parse successfully. The active entry point links 92 modules. Eight modules are unreachable: `bossData.js`, `companionData.js`, `dungeon.js`, `dungeonData.js`, `enemyAI.js`, `questSystem.js`, `storyContentIndex.js`, and `storyData.js`.

This is a code-and-data audit, not a full QA certification. The repository has no package/build manifest and no automated test suite.

## What the player currently experiences

1. A new profile is created from the main menu.
2. The player is placed directly in the safe Orrakai capital hub, receives two field rations, and is told to train and prepare.
3. The `Ashes of Hearthmere` main quest starts automatically.
4. The character creator opens after the game begins.
5. Orrakai contains Warden Mael, Mara Vell, Bram, Sister Elian, Kaelen Dusk, services, class trainers, a market, a tower, and a PvP arena.
6. The south gate leads to the 640 x 480 Echoryn Forest / Hearthmere Frontier map.
7. The current Act I route culminates in the Ember Veil / Red Seal dungeon and Malakar.
8. Malakar's defeat unlocks a costly physical Pilgrim Road expedition to the compact Aureate Marches.
9. A holy-themed procedural dungeon produces Seraphel as the Act II boss and unlocks the Severed Causeway.
10. The compact Ascension Wastes contain the Ascension Spire entrance, whose cosmic theme produces Zephyr as the Act III boss.

The caravan attack, stolen ancient artifact, Order of the Last Dawn raid, awakening after the attack, Rot Blight investigation, Malakar's warning about Seraphel, hidden conspiracy, Ninth God, and Zarynth are not presently implemented as the playable spine.

## Implemented gameplay system inventory

### Platform, profiles, and persistence

| System | Status | Evidence and notes |
|---|---|---|
| Main menu and profile management | Live | Profile create/load/delete UI in `index.html`, `gameSave.js`, and `saveProfiles.js`. |
| Profile-based local saves | Live | Local-storage save/load, schema normalization, and migrations; save schema version 10. |
| Save, load, save-and-quit | Live | Top bar and pause menu actions are wired. |
| Loading and pause overlays | Live | Shared pause state, controller navigation, and loading presentation. |
| World-instance persistence | Live with constraints | Overworlds are regenerated; dungeon/tower instance tiles and objects can be serialized. PvP saves are blocked during a match. |
| Compatibility migration | Live | Legacy class names, ability IDs, world names, tower state, and save shapes are normalized. |

### Input, movement, and multiplayer

| System | Status | Evidence and notes |
|---|---|---|
| Keyboard and mouse input | Live | Movement, interaction, attack, block, sprint, dodge, hotbar abilities, menus, and pointer aim. |
| Controller support | Live | Per-controller movement, combat aim, gameplay, dialogue, and menu ownership. |
| Local couch co-op | Live | Up to four local players can join; joined players retain actor state. |
| Split/shared camera behavior | Live | Split-screen HUD plus shared dungeon camera/tether logic. |
| Co-op revival | Live | Downed state, revive input, timers, control locks, and save sanitation. |
| Co-op encounter scaling | Live | Enemy count, aggro, boss health, and add-count scaling. |
| Local PvP arena | Playable prototype | Last-player-standing rounds, rematch/exit flow, controller handling, and arena-only friendly fire. |
| Collision and navigation | Live | Tile/world collision, passability, line of sight, actor-radius checks, and nearest-passable recovery. |
| Camera, minimap, and exploration reveal | Live | Camera tracking, screen shake, minimap HUD/panel, and exploration state. |

### Combat

| System | Status | Evidence and notes |
|---|---|---|
| Basic and heavy weapon attacks | Live | Weapon-specific movesets, windups, charge/release, hit resolution, and animation state. |
| Stamina actions | Live | Sprint, block, dodge/dash, invulnerability windows, stamina costs, and regeneration delays. |
| Combat aim | Live | Mouse and right-stick aim with left-stick fallback and facing control. |
| Ability hotbar | Live | Three slots, unlock/assign/clear flow, availability checks, UI/controller management. |
| Ability charges and cooldowns | Live | Use charges, recharge state, hold/release charge profiles, and cancellation. |
| Class passives | Live | Distinct passive hooks for damage, defense, dash, kills, flow/lumen, and other class states. |
| Projectiles, traps, summons, and fields | Live | Ranged attacks, class summons, traps, persistent combat effects, and world effects. |
| Enemy behaviors | Live | Archetype behaviors, targeting, line of sight, attack profiles, reactions, and death presentation. |
| Boss framework | Live, partly hard-coded | Multi-phase boss behavior, add spawning, hazards, rewards, and story hooks exist in `bossSystem.js`; the richer `bossData.js` definitions are not consumed. |
| Loot and drops | Live | Enemy loot tables, rarity, world pickups, quest collection hooks, and first-kill boss rewards. |
| Combat progression | Live | Weapon/skill XP, combat level, class-linked progression, and floating progression feedback. |
| Adaptive audio and feedback | Live | Procedural SFX/music modes, locomotion audio, hit reactions, impacts, telegraphs, floating text, and screen shake. |

### Character identity and progression

| System | Status | Evidence and notes |
|---|---|---|
| Character creator | Live | Body, face, hair, palette, and class-origin presentation with controller support. |
| Classless start | Live | The player begins human and classless, then trains into a path. |
| Canonical classes | Live | Oathkeeper, Fellhunter, Gravecaller, Thornbinder, Waverider, Lightbringer, and Eldritch. Templar, Mercenary, Necromancer, and Hydromancer remain aliases. |
| Ability catalogue | Live | 56 active/passive ability records plus legacy aliases. |
| Skill progression | Live | 15 skills: seven combat, four gathering, three production, and Renown. |
| Skill trees | Live | Core, weapon, bloodline, class locks, point earning/spending, graph UI, and bonuses. |
| Bloodlines | Live | Permanent Cambion, Nephilim, and Vampire choices, exclusive quests, modifiers, abilities, and trees. Narrative terminology conflicts with the new canon. |
| Derived character sheet | Live | Combat level, stats, equipment, class/passive summaries, and detailed UI panels. |

### Items, economy, and survival

| System | Status | Evidence and notes |
|---|---|---|
| Inventory and equipment | Live | Stacking, equipping, stat previews, gear visuals, use actions, and controller navigation. |
| Item catalogue | Live | 217 items across reagents, fish, food, tools, quest items, materials, currency, weapons, trinkets, and armour. |
| Rarity and legendary items | Live | Nine rarity tiers, legendary announcements, code-drawn equipment, and boss/POI reward pools. |
| Set bonuses | Live | Four armour sets and four weapon set families with derived bonuses. |
| Gear upgrades and salvage | Live | Upgrade state, salvage hold/confirmation, material recovery, and crafting hooks. |
| Crafting | Live | 63 recipes spanning equipment, tools, cooking, alchemy, and runecraft. |
| Shops and services | Live | Orrakai market, ration stalls, blacksmith, alchemist, bank/storage presentation, and class training interactions. |
| Gathering | Live | Foraging, mining, woodcutting, runecraft nodes, tool tiers, level gates, respawns, bonus rolls, and visible effects. |
| Fishing | Live | Tool/tackle bonuses, timing minigame, fish tables, rare catches, XP, and controller handling. |
| Food and rations | Live | Consumable food, buffs, rations, cooking, and route-cost consumption. |

### World, exploration, and activities

| System | Status | Evidence and notes |
|---|---|---|
| Orrakai capital hub | Live | 72 x 48 safe zone with services, trainers, NPCs, town dressing, gates, tower, and arena. |
| Echoryn Forest overworld | Live | 640 x 480 hidden gameplay grid with seamless terrain presentation. Authored expansion yields 2,837 objects and 258 enemies, including 29 NPC objects, nine dungeon entrances, two side-zone entrances, and 16 boss/elite encounters. |
| Act II and III regions | Playable prototype | Aureate Marches and Ascension Wastes are 120 x 64 maps with 14/12 objects and four authored enemies each. They are traversal shells, not full regions comparable to Echoryn. |
| Physical travel routes | Playable prototype | Pilgrim Road and Severed Causeway are 120 x 56 maps with five authored interactables and six enemies each; routes enforce story, item, gold, and ration requirements. |
| Points of interest | Live in Act I | 15 registry POIs plus map markers, arrival presentation, investigation objects, caches, and encounter state. |
| World map | Live | Act I map data, marker selection, discovery state, controller navigation, and regional labels. |
| Procedural dungeons | Live | Entrances, floors, keys, doors, puzzles, events, chests, bosses, exits, party placement, defeat recovery, and thematic generation. |
| Authored Act I dungeon entrances | Live | Nine entrances, including Old Hollow, Thornroot, Iron Mire, Ashen Orchard, Mirror Grove, Pilgrim Crypt, Watcher Ridge Vault, Castle Veyr, and Red Seal Keep. |
| Major act dungeons | Playable prototype | Shattered Choir and Ascension Spire route into themed procedural generation. `dungeonData.js`'s authored floors/rooms are not used. Dawnspire Root is represented by the existing demon/cult route rather than its data definition. |
| Procedural side zones | Live | Seeded side zones, clear state, exit/return flow, repeatable resources, and threats. |
| Infinite tower | Live | Regional floor generation, modifiers, progression, checkpoints, rewards, and return flow. |
| Dynamic overworld encounters | Live | POI state, enemy respawn/encounter updates, caches, and co-op scaling. |

### Narrative delivery

| System | Status | Evidence and notes |
|---|---|---|
| Dialogue | Live | NPC lookup, conditional options, responses, flags, quest start/turn-in, hostility conversion, keyboard/controller UI, and fallback dialogue. |
| Quest log | Live | 29 unique merged quest definitions, active/completed state, tracking, stages, objective progress, rewards, party/shared scope, and controller UI. |
| Objective types | Live | Talk, collect, kill, kill-any, discover POI, enter dungeon, clear dungeon, and related event hooks. |
| Story flags and region state | Live | Nested flags, act state, region unlocks, travel state, boss completion hooks, and save migration. |
| Main-act completion hooks | Live but coarse | Boss name/theme matching marks whole acts complete and unlocks routes. This can bypass authored stage logic. |
| Companion relationship data | Authored data only | Four companion arcs and camp scenes exist in `companionData.js`, but the active runtime does not import that file or run a relationship/camp-conversation system. |
| Major story bible | Authored data only | `storyData.js` defines acts, endings, symbols, and the old cosmology, but is unreachable. |
| Data-driven major boss phases | Authored data only | `bossData.js` is unreachable; parallel phase logic is hard-coded in `bossSystem.js`. |
| Data-driven act dungeon layouts | Authored data only | `dungeonData.js` is unreachable; the runtime uses procedural themed generation. |
| Books, codex, readable lore objects | Missing | No reusable book/codex/readable-document system was found. Lore is mostly dialogue, quest text, names, item descriptions, and environmental labels. |

## Current narrative assets worth preserving

- **Orrakai as the playable social anchor.** It already supports the new brief's Act I location and is the strongest place to stage recovery after the caravan attack.
- **Mara Vell, Warden Mael, Bram, Kaelen Dusk, and Sister Elian.** They have clear voices, mechanical roles, and thematic positions that can survive canon migration.
- **The Covenant's sincere lower ranks.** Existing dialogue already understands that healers and road wardens can do real good while leadership causes harm.
- **The lantern motif.** Mortal-made light versus overwhelming divine light fits the requested melancholic but hopeful tone.
- **Echoryn Forest and its layered POIs.** The huge map, old roads, chapels, Castle Veyr, Red Seal Keep, shrines, graves, and altered landscapes can carry new history without replacement.
- **Physical preparation and travel.** Rations, permits, tools, routes, camps, and costly expeditions support grounded high fantasy and exploration-driven play.
- **Bloodlines as permanent, costly transformations.** The mechanics already express sacrifice; only their divine history and terminology need canonical integration.
- **Environmental ambiguity.** Current ideas about corruption and purification leaving similar scars are an excellent foundation for Rot Blight investigation.
- **Boss mechanics and silhouettes.** Malakar, Seraphel, and Zephyr already have distinct behaviors, phases, rewards, and visuals that can be narratively recontextualized.

## Canon contradictions

| Severity | New master canon | Current project | Required action |
|---|---|---|---|
| Blocker | The Eight Gods and erased Ninth define cosmology. | No Eight-God pantheon, Ninth God, divine realms, Primordials, or Primearchs exist. | Establish a canonical cosmology registry before new lore. |
| Blocker | Primordial terminology replaces angels and demons. | Angel/demon language is pervasive in classes, bloodlines, enemies, quests, items, bosses, dialogue, and rendering tags. | Preserve internal mechanical tags temporarily; replace player-facing terminology through a controlled migration map. |
| Blocker | The player is a caravan guard carrying an artifact stolen by the Order of the Last Dawn. | New profiles start safely in Orrakai; the old opening says a caravan was attacked but does not implement the artifact or Order. | Build a short playable opening that ends in the existing Orrakai hub. |
| Blocker | Order of the Last Dawn is the tragic red herring. | The Ember Veil is a plainly hostile demon-worshipping cult. The Order is effectively absent apart from an item name. | Reframe or replace the cult's narrative role without deleting its dungeon, encounters, or assets. |
| Blocker | Rot Blight is engineered by the hidden conspiracy. | “Corruption,” failed purification, and Essence damage are used instead; Rot Blight and conspiracy purpose are absent. | Define visual/mechanical Rot rules and connect existing corruption assets to them. |
| Blocker | Malakar is an imprisoned Primordial released for knowledge and warns “Do not trust Seraphel.” | Malakar is a cruel demon lord drawn to a wound and warns about the Covenant/Dawnspire. | Retain the fight; rewrite identity, imprisonment, summon logic, pre-fight and death revelations. |
| Blocker | Seraphel is a Primearch whose compassion remains credible until late Act II. | Seraphel is a fallen angel and explicit Act II dungeon boss whose wrath has already displaced compassion. | Retain mechanics; rebuild presentation, motive, investigation trail, and reveal timing. |
| Blocker | Zephyr is a manufactured, irredeemable survivor infused with Ninth-God essence. | Zephyr is a compassionate demi-god/network born of worship and machinery and can read as tragically misguided. | Replace origin and moral framing while preserving charisma, beauty, manipulation, and boss mechanics. |
| Blocker | Act III centers on Zarynth, Covenant politics, the hidden order, Rot truth, and Ninth-God history. | Act III centers on the Ascension Wastes and a reality-assimilation network. Zarynth and the hidden order do not exist. | Make Zarynth the political/geographic frame; decide whether Ascension Wastes survives as a subregion or late-game consequence. |
| High | The protagonist should not be a Chosen One. | “Unbound” makes the player uniquely resistant and central; Runalis is said to be the first such person. | Reframe Unbound as an acquired condition, disputed classification, or non-unique phenomenon caused by the artifact/attack. |
| High | Only a handful of characters are truly evil; factions have understandable motives. | Factions use fixed friendly/neutral/hostile alignments; Ember Veil is “demon-worshipping,” bandits are mostly thieves/oathbreakers. | Replace alignment labels with goals, methods, pressures, internal blocs, and relationship state. |
| High | Story begins and Act I centers on Orrakai. | The runtime starts in Orrakai, but the main story data calls the opening and emotional home Hearthmere. | Preserve Hearthmere as a district, satellite settlement, old name, or nearby wound; make geography unambiguous. |
| High | Ancient civilizations should be layered beneath modern civilization. | Veyr, Solgate, Dawnspire, old chapels, and ruins imply one or two old layers but lack chronology and cultural distinction. | Add a periodized history and assign visual/material languages to each layer. |
| Medium | Lore should be optional and exist in books, architecture, items, arenas, and ruins. | Items, names, POIs, and arenas carry lore, but books/readables and a codex system are missing. | Add optional readable/inspectable delivery using the existing interaction system. |
| Medium | Acts should end with more questions than answers. | Current act completion hooks directly announce major answers and entire act outcomes. | Break revelations into evidence, competing interpretations, and delayed confirmation. |

## Narrative-system risks

1. **Multiple sources of truth.** Story beats are duplicated across `storyData.js`, `questData.js`, `worldContent.js`, `dialogueData.js`, `storyRuntime.js`, `bossData.js`, `bossSystem.js`, `dungeonData.js`, and `dungeonSystem.js`.
2. **Data/runtime drift.** The best-written boss, companion, dungeon, and act definitions are not what the running game reads.
3. **Hard-coded story matching.** Boss completion uses name/theme substring checks. A holy dungeon can become Seraphel and a cosmic dungeon can become Zephyr even if the authored location says otherwise.
4. **Coarse act completion.** Killing the matching boss can record the whole main quest as complete even if its stages were not played.
5. **Thin consequences.** Dialogue flags and permanent bloodlines work, but there is no live faction reputation model and companion relationship data is not operational.
6. **Content maturity imbalance.** Echoryn is large and dense; Acts II and III are compact demonstration maps.
7. **Portability issue.** Two import paths differ in filename case: `dialogueUI.js` versus `dialogueUi.js`, and `runalisContentExpansion.js` versus `RunalisContentExpansion.js`. They work on Windows but can fail on case-sensitive hosting.
8. **No regression safety.** There are no automated content-reference, save-migration, quest-progression, or browser smoke tests.

## Narrative direction verdict

The new master brief should be treated as the controlling canon. The existing project should not be discarded. Its strongest systems and locations can support the new story with less risk than a rewrite.

Immediate rule: do not add new quests, cosmology prose, companion arcs, or boss lore to the old Unbound/Ascension continuity. First establish the canon registry and migration map described in the implementation roadmap.
