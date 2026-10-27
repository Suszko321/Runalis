# Runalis progression and combat implementation — October 5, 2026

The supplied 54-page brief has been implemented against Runalis's actual Canvas 2D game. This pass adds independent Combat XP, deterministic encounter rewards, universal progression and summon acquisition, faster combat, controlled scaling, and schema-13 save migration. The active catalogue now contains 87 abilities. Existing world content, class techniques, equipment, bloodlines, trees, and local co-op remain integrated.

This report separates implemented behavior from remaining work. “Infinite” progression means there is no authored gameplay level cap; JavaScript numeric/storage limits still impose a practical ceiling. Subjective combat polish and a balanced complete campaign cannot be established by the automated checks below.

Try [the save-free proving ground](../../combat-overhaul-lab.html), which starts paused. Select a class, adjust Combat Level, acquire a Wolf or Demonseed pact, equip a slot, then resume. The actual game also exposes these systems through Orrakai, inventory, and the Lexicon. Review the [initial audit](AUDIT.md), [progression results](verification.json), [production-browser results](browser-results.json), and [complete regression outputs](regression-results.json).

## 1. Scripts audited

The initial authority audit preceded structural implementation. Principal sources reviewed and connected:

| Area | Source authorities |
|---|---|
| Progression and identity | `src/skills.js`, `player.js`, `classData.js`, `data.js`, `skillTreeSystem.js` |
| Reward ownership | `combatProgression.js`, `abilityMasterySystem.js`, `combatExpansion.js` |
| Combat execution | `combat.js`, `combatMoves.js`, `combatActions.js`, `combatExpansionData.js`, `abilityCombatProfiles.js` |
| Input and movement | `main.js`, `couchCoop.js`, `combatOverhaulLab.js`, `input.js` |
| Charges and channels | `chargeSystem.js`, `abilityChannelSystem.js`, `abilityLoadoutSystem.js` |
| Art, poses and feedback | `skillArtProfiles.js`, `combatTechniqueMotionProfiles.js`, `skillPresentationRenderer.js`, `summonArt.js`, `codeAssets.js`, `gearVisualStyle.js`, `abilityAudio.js` |
| Enemies and bosses | `enemyScaling.js`, `enemyBehaviors.js`, `enemyAI.js`, `bossSystem.js`, `render.js`, `coopEnemyScaling.js` |
| Town, purchase and inventory | `orrakaiLayout.js`, `shopSystem.js`, `gameInteraction.js`, `panelInventory.js` |
| Equipment and recovery | `legendarySystem.js`, `setBonusSystem.js`, `outOfCombatRecovery.js`, `weaponStance.js` |
| Saves and presentation | `gameSave.js`, `saveProfiles.js`, `ui.js`, `splitScreenHUD.js` |

New shared authorities are `progressionMath.js`, `progressionProfiles.js`, `encounterLedger.js`, `enemyProgression.js`, `combatPower.js`, `skillScrollSystem.js`, and `cooldownClock.js`. The companion-art follow-up adds `companionSpriteArt.js`. All 180 source modules passed syntax checks after that update.

## 2. Systems discovered

The project uses Canvas 2D and browser ES modules, rather than the Babylon.js architecture assumed in parts of the brief. Its eight playable identities are seven canonical combat classes plus Classless. Existing aliases are migrated identities, not additional classes.

Before this pass, Runalis already had four active slots, 85 abilities, individual icons and motion profiles, held heavy attacks, channels, separate recovering use charges, ability mastery, skill trees, persistent class summons, and shared/split-screen couch co-op. These authorities were extended. No engine replacement, parallel combat engine, networking service, or invented eighth combat class was introduced.

No formal system named **Fates** exists in this codebase. Existing bloodlines, passives, equipment, legendary effects, and skill trees are the actual modifiers retained in combat calculations. This implementation does not claim a new Fate mechanic.

## 3. Bugs identified and corrected

- Combat Level was a weighted derivative of other skills. It now has its own level and XP pool.
- Cast XP, hit/tick XP, summon XP, and kill allocation overlapped. Empty wards and repeated actions could inflate training; Warding also received a linked-class 50% multiplier. Ordinary combat training now resolves once on an eligible enemy death.
- Previous large-grant loops stopped after 1,000 levels and discarded remaining XP. Exact polynomial totals and binary search preserve the representable remainder.
- Weapon switching credited only a dominant discipline. Actual weapon damage shares are now retained.
- All damaging teammates received full budgets. Final-hit and qualifying support ownership now follow the specified 100%/50% rule.
- Summon melee lacked complete terrain/sight safeguards, and summon stats grew linearly. Both were corrected.
- Player resting recovery could remain available while an owned pet was being attacked. Summon threats now interrupt resting.
- Session-relative cooldown timestamps could lock abilities after reload. Saved clock origins now preserve elapsed ability cooldown time.
- Inventory filtering could hide scrolls, and dynamically rendered detail buttons needed fresh bindings. Reading now works through the actual inventory UI and controller action.
- Accelerated attacks could skip their entire contact interval in a long frame. Swept timing now registers that contact.
- Universal Spirit use could inadvertently trigger story awakening. Universal summons now consume Spirit without changing the Classless awakening flag.
- Two separate progression panes caused layout and selection problems. One paged attribute/proficiency browser now shares a detail pane.

The historical Warding playtest described in the brief cannot be reproduced without that character's save. The overlapping award routes were verified directly and removed.

## 4. Combat speed changes

Ordinary enemies move at 1.28 times their previous speed; bosses use 1.18. Ordinary attack intervals use 0.78 of their former value, bosses 0.86, with a 0.35-second floor. Scaling is versioned so repeated initialization cannot multiply speed again.

Fixed advanced-enemy cast cooldowns were reduced: 2.0→1.64, 2.3→1.886, 3.2→2.624, and 1.75→1.435 seconds. Boss telegraph windup uses 0.92 of the old value with a 0.45-second floor; recovery uses 0.72 with a 0.3-second floor; special intervals use 0.8. Existing phases, collision, defensive calculations, and telegraphs remain in use.

## 5. Movement speed changes

Main-game base movement increased from 154 to 205 pixels/second, about 33%. Co-op increased from 149 to 205, about 38%. The proving ground also uses 205. Dash speed increased from 420 to 520; startup delay fell from 0.03 to 0.01 seconds; cooldown fell from 0.55 to 0.42 seconds. Dexterity gradually reduces dash cost by up to 15%.

Existing sprint, terrain collision, and class mobility behavior remain integrated. No new momentum/acceleration simulation was added.

## 6. Attack and animation timing changes

Light startup/contact uses 0.70 of the previous timing; heavy uses 0.80. Active windows use 0.82; recovery uses 0.62 for light attacks and 0.70 for heavy attacks. Duration is recomputed from contact and recovery, so pose timing and damage timing share the same authority.

| Example | Previous duration | Current duration | Previous contact | Current contact |
|---|---:|---:|---:|---:|
| Sword light 1 | 0.340s | 0.2372s | 0.080s | 0.056s |
| Sword light 2 | 0.370s | 0.2618s | 0.080s | 0.056s |
| Sword heavy 3 | 0.580s | 0.4424s | 0.160s | 0.128s |
| Scythe wide 1 | 0.450s | 0.3218s | 0.110s | 0.077s |
| Scythe reap 3 | 0.680s | 0.5202s | 0.190s | 0.152s |

The test report records 19 weapon/move comparisons. Dexterity provides a bounded additional 12% cadence benefit. Existing tree attack-speed bonuses retain their 35% ceiling. Non-channel technique pose durations use 0.72 of their former values; held channels retain their sustained lifecycle.

## 7. Final attribute taxonomy

**Combat Level** is separate from all trainable categories.

| Core attributes | Internal save ID | Principal role |
|---|---|---|
| Health | `hitpoints` | Maximum HP |
| Stamina | `stamina` | Physical resource capacity |
| Defence | `defence` | Armour and protective scaling |
| Spirit | `spirit` | Universal magic resource and magical discipline |
| Focus | `focus` | Charge handling and channel efficiency |
| Dexterity | `dexterity` | Physical power and bounded cadence/dash handling |

Combat proficiencies are **Blades**, **Scythes**, **Archery**, **Warding**, and **Summoning**. Gathering, production, exploration, and other existing disciplines remain available. Spirit deliberately retains its existing discipline semantics instead of adding a duplicate magic level. Every class can train ordinary categories; class-specific active abilities still retain their class ownership rules.

## 8. XP allocation formula

Let `R` be the enemy's frozen base Combat XP. A qualifying final-hit player receives `B = R`; another qualifying nearby participant receives `B = 0.5R`. Qualification requires actual damaging participation or useful support and distance at most 1,000 pixels. Inactive spectators receive nothing.

The player receives **B independent Combat XP plus a separate B training budget**:

| Training component | Share | Allocation |
|---|---:|---|
| Survival | 30% | Equal Health, Stamina, Defence, Spirit shares |
| Weapon use | 25% | Proportional actual weapon damage by proficiency |
| Active hotbar | 35% | First-contribution slot snapshot, weighted by useful damage/support |
| Meaningful participation | 10% | Actual ability damage/support progression categories |

Missing components redistribute to the four survival attributes. Ability categories are deduplicated. Each equipped summon in the first-contribution snapshot has a baseline weight of `max(1, contributionDamage × 0.12)`; all summons share the same finite 35% component. Extra slots cannot create an extra budget. A summoned companion attacking unattended future encounters does not alone qualify its idle owner; direct participation, useful support, or an enemy targeting the owner is required.

Class affinity applies once, after allocation, to matching training shares. Combat XP has no class affinity. Useful support is bounded per enemy, ability, and purpose; capped useful amount is distributed across involved enemies. Empty casts, overhealing, harmless targets, repeated death resolution, idle shields, and summons replacing themselves generate no ordinary combat training. Mastery remains a distinct system described below.

## 9. XP progression curves

At current level `L ≥ 1`, the next-level requirements are:

```text
Combat:     100 + 45L + 12L²
Attribute/proficiency: 90 + 55L + 42L²
Ability mastery:       32 + 14L + 3L²
```

At level 1 these require 157, 187, and 49 XP respectively. Level 10 Combat needs 1,750 XP; level 100 needs 124,600. Advancement sums the polynomial exactly in factored form, expands an upper bound, then uses binary search. Fractional XP remains in state even where the UI rounds its display.

Enemy rewards increase approximately as `L^1.35`; requirements grow as `L²`. Comparable kills therefore require increasing effort at high levels. This is a mathematical pacing choice, not evidence that all campaign tiers are balanced.

## 10. Class-affinity mapping

Each identity has exactly two distinct **+25% earning affinities**. Affinities do not directly multiply combat strength.

| Identity | First affinity | Second affinity |
|---|---|---|
| Classless | Blades | Stamina |
| Oathkeeper | Blades | Defence |
| Fellhunter | Archery | Dexterity |
| Gravecaller | Scythes | Summoning |
| Thornbinder | Warding | Summoning |
| Waverider | Blades | Warding |
| Lightbringer | Spirit | Warding |
| Eldritch | Spirit | Focus |

Canonical and compatibility class tables were brought into agreement. Existing class HP/resource/passive identities remain separate from XP affinity.

## 11. Combat-power formula

Normalized level power and stat growth are:

```text
P(L) = 1 + 0.65 ln(1 + (L−1)/20)
S(L) = 20 ln(1 + (L−1)/20)
Progression power = 1 + 0.9[P(Combat)−1]
                       + 0.6[P(proficiency)−1]
                       + 0.2[P(relevant attribute)−1]
```

Physical power uses Dexterity; magical/summon power uses Spirit; defensive power uses Defence. Additive normalized contributions avoid multiplying unrestricted level factors together. HP, Stamina, Spirit, and armour use `S(L)` in their existing class/equipment formulas.

Ability base damage uses `(ability base damage + equipment power × 0.52) × ability damage multiplier × progression power`, then applicable tree/bloodline/technique modifiers. Equipment power retains weapon base damage/power, half weapon Spirit, 0.85 Focus power, and the applicable trinket contribution. Mastery modifies the ability multiplier once. Weapon damage and inventory damage display share one calculation authority.

Across the Classless simulation, a level-1-mastery reference spell increases from 20 damage at level 1 to 29 at 10, 36 at 20, and 41 at 30. Combat development therefore strengthens low-mastery skills. Existing gear and tree bonuses still matter; exhaustive combinations of every item and passive were not balance-tested.

## 12. Weapon-combo implementation

All eight three-input combinations—LLL, LLH, LHL, LHH, HLL, HLH, HHL, HHH—execute through the real attack state. Mixed heavy input buffers across recovery. A failed stamina payment does not append a sequence entry; inactivity of 0.82 seconds resets it.

The third attack gains `1.10 + 0.04 × heavyCount` damage, costs two extra Stamina, and gains bounded stagger. Weapon-specific finishers widen sword/scythe/axe arcs, add dagger/spear lunge, add blunt-heavy knockback, or increase bow/crossbow/focus projectile speed. Existing weapon collision shapes, ranged projectile roles, staff melee, held heavies, and light chains are retained. These are shared combination rules with weapon-specific behavior, not eight entirely bespoke animations for every weapon.

## 13. Skill VFX improvements

Existing authored ability silhouettes, palettes, icons, motion profiles, channel effects, and mastery presentation were retained and verified under accelerated timing. Wolf and Demon each receive a distinct icon and summon ritual: wolf-face/paw presentation versus a horned fiery gate. Following the companion-art review, both units now use the existing authored four-frame pixel atlases: the wolf row in `enemies-core` and the demon row in `summons-evolved`. Separate cached allied variants give the wolf an icy blue/silver coat and the demon a violet body with turquoise eyes/fire. Idle, two movement frames, and attack respond to actual combat state. Original enemy sheets are unchanged; pixel fallbacks retain allied colors while assets load. See [the side-by-side companion review](companion-art.html) and [its browser checks](companion-art-results.json).

All 87 active icons/motions and 175 passive emblems were checked; the skill-art suite rendered 6,264 effects across directions and mastery tiers. Pose verification sampled 186,052 animation states with no non-finite results. Screenshots of [the Wolf library](wolf-library.png), [inventory scroll](scroll-inventory.png), [merchant](merchant.png), [progression panel](progression-panel.png), and [companions](companions.png) were reviewed.

This is an integration/presentation pass, not a claim that all 87 abilities were individually redrawn or that every sound and animation has received final artistic approval.

## 14. Charged/channeling implementations

Held spell charge and heavy-attack charge thresholds/max hold times use 0.72 of their previous duration. Focus gradually provides another bounded 12% charge-handling benefit. Recovering use-charge stocks remain a separate mechanic; holding a spell does not replace their recovery rules.

Existing held and fixed-duration channel profiles continue to use the shared lifecycle: sustained cost, steering, duration, movement restrictions, and interruption on release/death/stun/dash where appropriate. Channels ignore legacy cooldown lockouts and drain resources over time. Mastery and Focus reduce channel cost within bounds. Production-browser input tests confirmed fourth-slot keyboard hold/release and controller dispatch. No blanket channel conversion was applied to skills whose mechanics are instant or projectile-based.

## 15. Mastery mechanics

All ability mastery comes exclusively from earning player XP while the skill occupies the current hotbar. Each distinct assigned skill receives the full earned XP once, regardless of use, damage, cooldown, selected morph or active summon state. This applies to class, scroll, equipment and universal skills, including Block. Successful uses, damage and kills are informational statistics. Support participation can qualify the player for shared victory XP but does not directly train a skill. Combat proficiency allocations do not duplicate the mastery already granted with the victory reward.

Potency refinement is `r = 1 − exp(−(M−1)/45)`. Maximum additional potency is 30% for summons, 26% protective skills, 24% channels, 10% mobility, and 18% other offense. Range bonuses are 0%, 6%, 8%, or 12% by role. Ordinary resource efficiency is bounded; channel mastery approaches 40% cost reduction, with Focus contributing up to another 12% through its own bounded factor. Costs use the existing rounding/minimum rules.

Milestones are 5, 10, 20, 30, 50, 100, 250, and 500, driving existing presentation tiers and applicable bounce/swarm refinement. Mastery can advance after the final named milestone, but no additional named visual tiers were invented above 500. Mastery follows the actual earned XP amount. Persistent companions cannot train a summoning skill after it is removed from the hotbar; inactive summons on the hotbar still train. Summon damage increasing with mastery is a benefit of mastery, never a source of mastery XP.

## 16. Summoning proficiency implementation

Summoning is an independent universal proficiency and a valid explicit training destination. Summon abilities train Summoning and Spirit. Gravecaller, Thornbinder, and Eldritch retain their existing summons, roles, and evolution behavior. All 87 abilities now expose explicit progression destinations for allocation and the Lexicon.

Player ownership stays on the actual companion and contribution record. Summons use terrain-aware spawn placement, line-of-sight/range checks, bounded obstacle steering, and recall to the owner beyond 650 pixels. Owner death/downed/respawn and world transition cleanup remain connected. There is a hard limit of eight living companions; existing per-ability formations and swarm penalties remain.

## 17. Summoning scaling formulas

Let `Q` be progression power using Combat, Summoning, and Spirit. Let `G = weapon Spirit + 0.5 × weapon Focus power + applicable trinket Spirit/power + set Spirit`.

```text
Wolf base HP     = (65 + 1.2G) × Q
Demon base HP    = (135 + 1.6G) × Q
Wolf base damage = (7 + 0.15G) × Q
Demon base damage= (15 + 0.22G) × Q
```

HP additionally uses applicable tree/set summon-health multipliers and mastery. Damage uses tree/set summon-damage modifiers, mastery, charge, and applicable bloodline modifiers through the summon attack authority. Multi-summon formations retain 0.58 HP and 0.64 damage penalties. Legacy lich/horror/thorn base formulas now use logarithmic `S(L)` instead of unbounded linear levels. Armour is `min(45, 3 + 0.25S(Summoning))`.

Wolf speed is 225 pixels/second and attack interval 0.58 seconds; Demon is 185 and 0.72. Existing ranged/melee/support role differences remain. Mastery improves damage without requiring recall; max HP is established when spawned.

## 18. Orrakai Skill Merchant implementation

**Ilyra, Pact Scribe** is a stationary resident at cell (43,28), with her skill stall at (43,27). Both use the authored market, normal interaction, and actor-owned shop route. The layout revision preserves the town's existing services and narrative IDs.

The skill category sells Wolf for 12 gold and Guard for 18. Buying spends the interacting actor's currency and adds a scroll to that actor's inventory. Already learned/owned duplicates are blocked. Reading consumes one scroll, permanently unlocks the ability, and leaves slot assignment to the player. Duplicate reading preserves the scroll. Keyboard, double-click, and controller inventory actions share the reader.

## 19. Wolf Summon implementation

Wolf has no class, awakening, or level prerequisite beyond the normal starting level of 1. It costs 12 Stamina. The learned ability can be assigned to any active slot, spawns a persistent melee companion, follows/navigates/fights, and trains Summoning and mastery through qualifying combat.

Death/dismissal starts an eight-second recall cooldown. Ownership and slot assignment survive save migration. Automated production-browser tests completed purchase→read→assign→cast→save migration for all eight identities, using the actual Orrakai NPC, inventory, and Lexicon interfaces.

## 20. Demonseed Scythe modifications

Demonseed's automatic damage-triggered mini-demon is removed from both its item descriptor and the legacy legendary handler. Acquiring/possessing the scythe instead grants one legendary pact scroll. Equipment, inventory, supported bank representations (array or `bank.items`), and the legacy proc flag are checked during compatibility migration.

Reading the pact permanently learns **Demon Summon**. It costs 20 Spirit, has a 16-second death/dismissal recall cooldown, and uses the universal summon/scaling/mastery route. Learning is retained after unequipping the weapon. Non-awakened Classless characters can use the universal Spirit pool without advancing story awakening. Unrelated legendary effects remain in place.

## 21. Co-op XP implementation

The existing local shared/split-screen party is the integration target. A WeakMap-backed actor identity avoids collisions between actors with identical names/slots. Weapon, ability, delayed effect, summon, and useful-support records preserve the originating player.

On a one-shot enemy resolution, the attributed final hit receives 100%; other qualifying participants receive 50%. Their independent Combat XP and training budget follow the same personal percentage. Healing actual missing ally HP, mitigation, and triggered death pacts can qualify support. Untouched spectators cannot. Pet kills credit the owner when that owner meets participation rules.

Delayed wounds and death-triggered Echo/Bloom marks retain ownership on teammate kills. Tests cover damage/support splitting and repeated resolution. Local actors share the authoritative world; there is no network protocol, replication layer, or server synchronization added here.

## 22. Resource-regeneration rules

After six seconds without hostile pressure or relevant action, resting restores HP at 20% of maximum per second, Spirit at 25%, and full exploration Stamina. Only the portion of a long frame after the waiting period expires can heal. Sprint expenditure remains connected to exploration refill.

Taking damage, attacks, held charge, active channels, nearby hostile targeting, or an owned summon being attacked resets the delay. Downed/dead/respawning/inactive actors and PvP arenas cannot rest-regenerate. Every character has a starting universal Spirit pool of 25 before existing class/equipment modifiers. Ordinary successful primary hits restore six Spirit through the established combat route; Spirit potions work for any nonzero pool.

## 23. Enemy-level implementation

The existing level nameplate is retained. Enemy Combat Level uses authored `combatLevel`, then authored `level`, then `max(1, tier × 5 − 4)`. Spawn initialization freezes a consistent reward:

```text
R = round(50 × [1 + (L−1)/5]^1.35 × difficulty)
difficulty: ordinary 1; elite 1.4; boss 2.5
```

Authored XP higher than that result is preserved. Freezing `baseCombatXp` prevents later level mutation from inflating death rewards. Existing zone/floor strength and co-op scaling remain separate. Rendering tests verify visible enemy targeting/levels, including split-screen/offscreen behavior.

## 24. Save migration

Schema is now **13**, with skill-state version 2. Existing levels, fractional XP, learned abilities, class aliases, mastery summaries, equipment, and assignments are retained. Legacy derived Combat Level seeds the new independent level once. Legacy `player.skills` imports once; it cannot repeatedly restore a stale higher XP value. Scythe and class-summon proficiency seeds retain the relevant old discipline development.

The new XP curves retain stored XP numerically rather than converting its percentage. A legacy remainder greater than the new requirement resolves on the next award. New fields do not reset existing ordinary progression.

Cooldown maps save their session origin. Reload rebases timestamps by elapsed saved-clock time, including legitimate negative timestamps, instead of producing a future lockout. Unfinished attacks, dodges, channels, and held charges are cleared rather than resumed. Runtime contribution/owner references are stripped from serialized state. Creating a save does not mutate the live nested attack state.

Implementation/testing did not overwrite live user profiles. A pre-change backup of source and README is at `C:/Users/austi/.codex/backups/runalis-progression-20261005`. The workspace `.git` directory has no usable repository metadata, so no commit or PR was created. The migration tests use constructed legacy fixtures; arbitrary unknown historical save formats cannot be guaranteed.

## 25. Tests and results

All 13 scripts in [the final regression output](regression-results.json) exited successfully:

| Suite | Evidence |
|---|---|
| Combat overhaul | 57 regression checks; channel/input/mastery/ownership/cleanup/terrain and class techniques |
| Progression overhaul | 23 assertion groups; real acquisition, allocation, exploits, combo buffering, summon behavior, saves, support |
| Actual active dispatch | All 87 abilities executed through gameplay dispatch with finite results |
| Progression simulation | 88 class/level cases: all eight identities at 1, 10, 20, 30, 50, 100, 250, 500, 1,000, 1,000,000, and 1,000,000,000,000 |
| Attack timings | 19 before/after weapon/move comparisons |
| Recovery | Helper tests and real `updateCombat` integration, threats, co-op isolation, frame independence |
| Skill trees | 16 trees, 246 nodes, 842 purchases; reachability, exclusivity, bonuses, saves |
| Animation | 87 motion profiles, 186,052 samples; four directions, finite poses and recovery endpoints |
| Skill art | 87 active icons/motions, 175 passive emblems, 6,264 effect renders |
| Orrakai | 55 retained semantics, 112 objects, seven buildings, 1,747 reachable cells |
| World | 2,703 frontier objects, 36 scenes, nine stones |
| Humanoid enemies | 12 archetypes; loot, models, aliases, levels |
| Enemy visibility | Offscreen/shared/split-screen targeting and rendering cases |
| Dungeon progression | 40 floors, four treasure transitions, 24 ordinary transitions, seven themes |
| Staff melee | 28 weapon/direction cases |
| Lightbringer heavy | Eight manual/auto direction cases |

Two actual-browser suites also ran. The progression suite booted production through its menu in a fresh isolated context, then completed every identity's NPC purchase/read/assign/cast/save flow. It reviewed full and compact layouts and reported zero page errors. The combat browser suite verifies actual keyboard channel release, controller slot dispatch, class techniques, and directional poses; results are retained in `docs/combat-overhaul/browser-results.json`.

Tests were run using bundled Node/canvas/Playwright dependencies; no dependency installation was required. Typical commands from the project root:

The companion-art follow-up also passed `tools/review-companion-art.cjs`: actual authored atlas loading, four distinct frames in both facings, allied palettes, unmodified source images, canvas-state restoration, fallbacks, and real summon movement/attack frame selection. The progression suite and production-browser flows were rerun successfully after the renderer change. See [the companion-art report](COMPANION-ART.md).

```text
python tools/serve.py 8766
node tools/verify-progression-overhaul.mjs
node tools/verify-combat-overhaul.mjs
node tools/review-progression-overhaul.cjs
node tools/review-combat-overhaul.cjs
```

The browser scripts require `RUNALIS_NODE_MODULES` pointing to a directory containing Playwright and an installed Edge browser. Canvas-dependent verification can use `RUNALIS_CANVAS_MODULE` pointing to `@napi-rs/canvas`. These environment paths are machine-specific. Browser scripts use fresh contexts and do not load the user's browser profile.

## 26. Performance findings

The production-browser mixed combat measurement holds 12 enemies and Wolf+Demon alive through 240 updates, discards warmup, and records 220 samples. The rerun after the companion-art update measured **median 0.30ms, p95 0.50ms, maximum 2.60ms** on this machine. Constant high enemy HP keeps the population stable; this setup measures update cost, not combat balance.

Large XP grants resolve with logarithmic searches instead of unbounded loops. Contributions resolve once, support tracking is capped, live summons are capped, and existing projectile/effect cleanup limits remain tested. The animation/art suites and browser render checks add presentation coverage.

These are local microbenchmarks and screenshots, not end-to-end FPS guarantees or measurements on low-powered hardware. Extended populated-world, couch-co-op, and campaign profiling remains useful.

## 27. Known limitations and remaining work

- There is no authored level cap, but XP storage saturates at `Number.MAX_SAFE_INTEGER`. The quadratic proficiency requirement exceeds that limit around level 14.6 million, creating a practical advancement ceiling. Extreme-level fixtures confirm finite formulas; they do not prove those levels are naturally reachable. True arbitrary-precision progression would require a separate storage/UI migration.
- Long-term campaign economy, difficulty, every gear/tree combination, and subjective weapon feel need sustained human playtesting. Automated finite-results tests do not establish viability of every build or fairness of every faster boss telegraph.
- New techniques and universal summons remain excluded from PvP through existing arena restrictions. PvP balance is not delivered.
- Co-op integration is local couch co-op only. No online multiplayer or server authority exists.
- There is no formal Fate mechanic; the real modifier systems were retained. No Babylon.js migration was attempted.
- Existing authored VFX were accelerated and validated; Wolf/Demon presentation was added. Final bespoke art/audio refinement across the entire catalogue remains artistic work. Combination finishers share rules within weapon categories.
- Companion navigation uses bounded steering, collision, sight checks, and recall rather than a complete pathfinding/navmesh solver. Dense moving obstacle crowds merit longer playtesting.
- Save coverage includes supported legacy structures and representative fixtures. Ability cooldown origin migration is covered; it is not a claim that every unrelated historical runtime timer has been redesigned.
- Mastery remains numerically progressive above 500, but named visual milestone evolution ends at 500. Performance findings are specific to this machine and measured scenarios.

The requested systems are connected to actual gameplay and verified as described above. These limitations prevent treating the whole brief's subjective “exceptionally polished” acceptance standard as conclusively complete.
