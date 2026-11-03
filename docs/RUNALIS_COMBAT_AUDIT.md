# RUNALIS combat quality and balance audit

Initial assessment — October 31, 2026. Production combat code and tuning remain
unchanged. The [Combat Bible](RUNALIS_COMBAT_BIBLE.md) establishes the current
rules and future standards. The [complete generated inventory](combat-audit/INVENTORY.md)
replaces historical counts for this assessment. [Validation details](combat-audit/VALIDATION.md)
separate passing checks, confirmed defects and unmeasured experience.

## Assessment

RUNALIS already has distinct class resources, per-skill morphs, authored light
chains, heavy attacks, advanced enemy positioning, explicit tells/recovery,
positional elite mechanics, specialized bosses, owner-specific summons and slow
uncapped progression. These foundations support targeted correction. A replacement
combat architecture or wholesale class rebalance is not justified by this pass.

Twenty-four existing model suites passed, including 438 real morph casts across
ordinary, elite and boss fixtures. Seven additional foundation contracts passed.
Four defect probes reproduce concrete faults. These results establish useful
mechanical coverage; they do not establish AAA feel, frame latency, endgame balance
or a complete solo/co-op survival playthrough.

## Prioritized confirmed findings

Priorities: P1 = repair ahead of numerical tuning; P2 = bounded functional/content
correction; P3 = follow-up quality work. No P0 crash or infinite-damage exploit was
demonstrated in the tested scenarios.

| Priority / ID | Reproduction and impact | Root cause and correction boundary |
| --- | --- | --- |
| **Resolved C04 — Ally support misses the party** | With the ownership links installed by couch co-op, P1 Mending Current heals both nearby actors by 18. P2 heals itself by 18 and P1 by zero. Slot-dependent support undermines cooperative builds. | `couchCoop.js` keeps the party only on the host and attaches `questOwner` to allies. `combat.js:healPartyNear/forPartyNear` enumerate only the caster's own `coop.players`; morph `validParty` has a similar shape, and the supplemental party setter is currently used for simulated NPCs. Introduce one existing-state party resolver usable by any actor, then verify original heals, fields, wards and summons from P1–P4. Preserve resource ownership and XP rules. Only original Mending Current is dynamically demonstrated here; the other helpers are source-confirmed exposure, not a claim every support ability failed. |
| **P1 C01 — Lifesteal rewards overkill** | A real Oathkeeper weapon hit with Lichbone Scythe removes the target's last **1 HP** and heals **2 HP**. The effect advertises healing from damage dealt. High reference damage can amplify healing against weak enemies. | `legendarySystem.js:applyLegendaryOutgoingDamage` heals before final mitigation and remaining-health loss are known for non-Gravecallers. Other non-Gravecaller direct/weapon tree-drain paths also use pre-clamp damage. Resolve eligible healing after effective damage, with explicit proc flags. Keep Gravecaller's existing recipient budgets. This demonstrates excess healing, not an infinite loop; do not add a universal healing cap without evidence. |
| **P1 C02 — Guard reflection loses kill attribution** | Living Bastion reflects the final 1 HP, the central death handler runs, but there are **zero contributors and zero Combat XP**. Kill effects that use fallback ownership can also credit the wrong actor in a party. | `combatActions.js:applyBlockReflect` changes HP/dead directly without recording an owner contribution. `grantSharedCombatKillXp` only rewards qualifying ledger entries. Record effective reflection damage and its owner before death processing; test solo and P2 final blows, assisted targets, bosses and reward suppression. The solo missing-XP case is reproduced; wrong-party-credit is a follow-up risk. |
| **P2 C03 — Blackbow bonuses cannot be reached** | All five assigned items occupy only `weapon` or `chest`. At most two valid pieces can be equipped. The three-piece crit and four-piece crit-damage/dodge bonuses are unreachable. | `setBonusSystem.js` maps three mutually exclusive bows and two mutually exclusive chest pieces into a set requiring three/four slots. Resolve through an intentional compatible item catalogue or revised set thresholds. Do not silently add equipment slots or choose a new balance budget during the assessment. |

Run `node tools/verify-combat-foundation.mjs` to reproduce all four findings. The
default command fails on broken healthy contracts and **reports** open findings;
it does not assert that defects are acceptable. `--strict` exits nonzero while
any of those four demonstrated faults remains. After a correction, convert the
relevant probe into a direct regression assertion and update this register.

## Source-confirmed gaps and investigations

These have evidence in code, but the stated broader impact still needs targeted
scenarios. They are not equivalent to the four controlled reproductions above.

| Priority / ID | Evidence / uncertainty | Next useful work |
| --- | --- | --- |
| P2 Q01 — Equipment bonus delivery is incomplete | Set totals include crit chance/damage, bleed/poison/burn chances and healing power. Weapon crit reads tree `critChancePct/critDamagePct`, not set `critChance/critDamage`; the inspected hit paths do not consume the set ailment chances. Blackbow currently cannot even reach its crit thresholds. | Trace every advertised bonus to a consumer and test one reachable set at a time. Enabling unused procs changes practical power, so capture before/after behavior rather than inventing a global proc rate. |
| P2 Q02 — Defensive paths can disagree | Ordinary coordinator damage and advanced `applyTargetDamage` duplicate mitigation. Advanced damage invokes the defensive helper even without Block; legacy basic damage does so only when blocking and passes null world to some hooks. | Compare armor, Thornskin, wards, reflection, lifesteal retaliation, owner context and cover for identical incoming hits. Consolidate only after parity tests define intended order. |
| P2 Q03 — Player contact/animation sequencing | `useAbility` generally dispatches mechanics before `startVisualAbilityAction`; instant presentation is backdated to its release point. Specialized delayed attacks have explicit timing. | Capture representative instant, delayed, charged and moving attacks at 30/60/120 Hz; establish which skills intentionally release instantly and whether their effects read correctly. Do not make every spell slower to solve a presentation mismatch. |
| P2 Q04 — Clock and pause consistency | Frame `dt` is capped while cooldowns/expiry often use session timestamps; some legacy buffs use calendar time. Channel payment/tick catch-up uses different bounds. | Deterministic pause, menu, tab-suspension and long-frame scenarios; verify no paid-but-undelivered ticks, lingering protection or hidden advantage. No specific pause exploit is claimed yet. |
| P2 Q05 — Long-term balance evidence is narrow | The new reference sweep stays finite and grows through level 1,000, but uses equal-level attributes, one reference ability and no build/gear combinations. Existing tests chiefly check mechanics and selected regressions. | Fixed geographic early/mid/late encounters; record opening burst, practical TTK, resource depletion, incoming damage, control uptime, summon share and healing. Add hybrid/specialized, rare equipment, multi-owner DoT and four-player cases before tuning. |
| P3 Q06 — Catalogue/test/document drift | Current data: 90 original skills, five hotbar slots, twelve families, 17 trees. Historical reports mention four slots, 85/87/89 skills, three families or unavailable Lightbringer. The old combat-overhaul suite stops on a direct duplicate-slot mutation. | Use the generated catalogue and assignment API in active fixtures. Preserve historical records as history; repair the stale aggregate before treating it as a release gate. |
| P3 Q07 — Large overlapping coordinators | `combat.js` is roughly 7,300 lines, alongside specialized morph, technique, boss and damage implementations. Some bonuses infer element/purpose from proficiency or source-name strings. | Add focused contracts around the next changed path. Prefer canonical source IDs, explicit context and small extraction when a real change needs it. No wholesale rewrite. |

## Redundancy and content-purpose review

The complete inventory identifies roles, modes, costs and descriptions for all
236 original-plus-optional definitions. Repeated modes do not prove redundant
skills: range, setup, resource, target cap, positioning and recovery can distinguish
two bursts or fields. Candidate overlap includes multiple keyed defensive wards,
healing fields, marks and delayed-area attacks. No skill is recommended for removal
without matched encounter comparison.

The current families already contain meaningful choices: Bloodhound's independently
expiring wounds versus Hellstalker's brief hard burn and exposure; Sunken's carried
pressure versus Cryomancer preparation/Shatter; Holyknight Resolve versus Sinner
Penance/sacrifice; ranged support versus melee undead/garden roles. Preserve these
differences while measuring outliers. Expertise's 1.05 hybrid versus 1.15/0.90
specialization is an existing tradeoff, not a new balance proposal.

## Sensible correction order

1. Repair complete-party support resolution (C04) and add P1–P4 caster/recipient
   checks with death/downing, range, terrain and independent resource state.
2. Repair final effective-damage accounting for lifesteal and reflected attacks
   (C01/C02). Test last-hit attribution, suppressed rewards, shields, overkill,
   recursive proc prevention and independent owners. Keep current reward shares.
3. Resolve reachable equipment thresholds and verified missing bonus consumers
   (C03/Q01), with explicit tooltip and before/after checks.
4. Establish defensive-path parity and contact/presentation timing (Q02/Q03),
   including high-pressure elite and boss scenarios.
5. Add a small encounter measurement matrix (Q05), then address demonstrated
   class/skill outliers. Preserve geographic difficulty and uncapped progression.
6. Repair stale aggregate fixtures and keep generated catalogue/Bible synchronized.

## Scope and remaining limits

No runtime source, art assets, class power, enemy stats, boss concept, progression
formula or save schema was changed. New files are documentation, a catalogue
exporter and a deterministic foundation diagnostic. Existing unrelated art changes
were left intact. No commit, deployment or external publication was performed.

This pass reviewed live source and ran model scenarios. Browser rendering,
physical controllers, couch co-op sessions with people, audio perception,
network play and current combat performance were not freshly measured. Existing
browser/performance reports are historical evidence, not results of this pass.
Temporary player vampire/ascended combat forms were not found: permanent bloodlines
and Veyreign's enemy form transition are distinct implementations. There is no
claim that every listed source path or skill is bug-free.

The foundation is ready for a focused combat assignment; C04 is the recommended
first correction.

## October 31 follow-up implementation

C04 is fixed. A shared living-party resolver follows the caster’s runtime host link and deduplicates recipients. Original support, morph support, shared mythical guard and post-cast potency accounting now include P1–P4. Ordinary support excludes incapacitated or inactive actors. The former two-player probe is now an assertion; the new four-player suite tests 64 caster/recipient combinations across original and Cryomancer healing/wards, independent payments, and range/downed/inactive exclusions.

Authorized tanking additions: Oathkeeper Bulwark of Light, Deathknight Funeral Urn and Petalknight Living Briar now challenge nearby visible non-boss enemies for four seconds using existing activation costs and recovery. Both ordinary AI targeting paths honor the challenge without cancelling committed attacks. Twelve actual casts (three tank roles × four slots) verify AI selection, expiry and boss/friendly/range exclusions; latest-caster ownership and downing cleanup are also covered. No new active IDs or mastery unlocks were introduced.

Validation: `node tools/verify-party-support-taunts.mjs`; seven existing suites for skill morphs, co-op readiness, Oathkeeper, Rose Mantle, enemy combat, boss summons and dungeon-boss co-op passed. C01, C02 and C03 remain open. The original assessment above is historical; its no-runtime-changes statement applies only to that initial pass. No fresh physical-controller or human multiplayer session was conducted.

## October 31 — Vampire implementation follow-up

Implemented the authorized [Vampire overhaul](vampire-overhaul/README.md): 19 nodes, nine HP-powered abilities, eight mastery alternatives, shared bleed interoperability, animated Royal form and real Bat Beast companions. Vampire delivery now recovers from actual health loss once and skips legacy secondary drain; this protects these new abilities but does not close the broader non-Vampire C01 finding. Save/respec/death/area transitions clear active forms and companion states without erasing permanent bloodline, mastery or other trees. C02/C03 remain open.

Sixteen new model scenario groups pass, including five class combinations, four independent local owners, all eight morphs, 120-enemy stress and mastery 1,000. Browser tree/menu, controller-derived channel/toggle, desktop/mobile and production-art checks pass without page errors or missing assets. The engineering gate and affected regression suites pass. Further human endurance balance, physical controllers, real online sessions and measured frame latency remain unclaimed. Old assessment counts and no-runtime-change statements above are historical.

## Bat Beast mastery and royal art follow-up

[Bat Beast evolution contract and verification](bat-mastery-evolution/README.md) records five visual stages at Call Bat Beast mastery 1/5/10/20/50. A living summon updates without healing, replacement or additional stat multipliers. Castle Veyreign’s final form and the player’s Royal skill now use the new royal sprite; the summon uses the same design in an allied silver-blue palette. The previous no-art-changes statement applies only to the original Vampire implementation.

## November 1 — summon evolution verification

Implemented mastery visual growth for all eight persistent summon abilities. Inspected current sprite sheets before generating new Fae pack/elder and Rose Siegebeast stages; retained current Siegebeast at mastery10. Remaining fixed bodies use five size evolutions, rather than claiming uncreated redesigns. Actual creation, live changes and save/load/recast pass for Standard/Fae/Petalknight packs and elders from every local slot. Browser checks cover 15 variants × five tiers and all 48 new pose crops, with strict growth, hard alpha, source palettes and no clipped borders. Engineering 11/11, production build and affected Fae/Petal/Lich/Bat suites pass. [Evidence and limits](summon-evolution/README.md). Existing wider combat audit findings remain open.

## November 1 — Gravecaller drawn evolution verification

Replaced the earlier size-only Gravecaller tiers with 96 new poses across six forms, retaining original mastery10 sprites. Live evolution and save/load/recast pass in every local slot with independent Bound Dead/Lich mastery and preserved health, identities and equipment. Browser verification covers 360 production-renderer cases, every authored pose, both facings, equipped skeletons/marksmen, strict growth, original midpoint selection, hard alpha and source-derived palettes. Corrected skeleton charm rendering to pass the actual item ID. Engineering 11/11, build, sustain, lich, movement, positioning, recovery and general evolution checks pass. [Evidence and validation limits](gravecaller-evolution/README.md); no human controller or real-network playtest is claimed.

## November 1 — boss armory and focus projectile verification

Eight class-open rare boss finds implemented, including Rose Reaper and four leather/vellum grimoires. Matching boss pools add at most one tier1 item at16% total (8% each), using seeded encounter RNG and existing owner/pickup/death guards. All15 focuses have unique projectile silhouettes and retain identity across equipment swaps. Verified64 class/item equip-hit-save combinations, actual Petalknight casting with the scythe, four-owner light/heavy shot identity, actual death drops and pickups,64 player renders,16 grips and120 directional projectile cases. Engineering11/11, build and loot/stance/heavy regressions pass. [Coverage, source art and limits](boss-armory/README.md). Human drop-pacing/balance and real-network play remain unclaimed.

## November 1 — itemization implementation audit

Implemented universal random gear with six per-copy rarities, Combat Level50 gates, actual stat/passive/set resolution and20-slot per-actor bags. Old boss-exclusive enemy gear additions are filtered before the single shared roll. Materials and authored progression rewards retain their owners; full-bag world rewards use recoverable ground delivery and claims/purchases/crafting preflight. Sale quotes bind an exact copy; deconstruction uses a live blacksmith and yields upgrade materials. Legacy copies and overfull saves remain intact.

Verified all202 bases from an ordinary enemy, exact rarity/rank distributions, level49/50, monotonic actual damage/armour, inventory agreement, save metadata, low-quality passive/set exclusions, four independent bags/services, full-bag pickup recovery and stale/repeated transactions. Browser checks cover four owners, six colours, controller confirmation/navigation to entry20, purchase protection and mobile fit. Existing24 loot groups (150,000 kills),13 workshop groups (63 recipes), running-game workshop flows, quests, bosses, sustain and co-op support pass; engineering11/11 and build pass. [Formula, implementation evidence and limits](gear-itemization/README.md). Human economy balance and real-network play remain unclaimed.

## November 1 — mobile Bat Beast rendering repair

Reproduced the previous royal summon palette canvas failing under a legacy mobile canvas limit. Compact ordinary/royal atlases and a pre-exported allied variant preserve all 432 timing-slot pixels, five mastery sizes and combat behavior. Royal boss presentation now fits narrow viewports with matching plate offsets. Chromium and WebKit touch/mobile profiles pass in portrait and landscape; existing Vampire, Bat and actual Veyreign encounter checks, engineering11/11 and publication build pass. [Evidence and physical-device limitations](mobile-bats/README.md).

## November 1 — enemy loot delivery and dungeon rarity audit

Implemented physical gear/scroll-only enemy drops, immediate other rewards to the assigned owner, all successful resource rolls retained, white aggregated/fading receipts in shared/split view and legacy material sweep. Dungeon quality is geographic, with common-only first areas, green/blue later pools and legendary mob eligibility plus40% final-boss legendary odds in Malakar/Veyreign. Added colour glows, runic spires and timed Legendary+ launch without changing stats or bag capacity.

Verified exact distributions, all eligible bases,10,000 final-boss rolls, all four owners with full bags, scroll pickup, exactly-once rewards, overflow recovery, both save paths, legacy resources and launch timing. Six Chromium/WebKit desktop/mobile profiles pass with no page errors; existing loot, itemization, endgame gear, workshop, quests, Malakar and actual Veyreign checks pass. Engineering11/11/build pass. [Evidence, formula and hardware/economy limits](enemy-loot-delivery/README.md).

## November 1 — gear rarity ascension audit

Implemented +1–+20 cycles and sequential rarity advancement to Primordial +20 for all gear, preserving exact-copy identity, appearance, affixes and earned tier strength. Costs start at5 gold and grow by rarity/tier with diverse ordinary drops, Boss Cores from Rare and Tower Fragments from Legendary. Existing acquisition gates remain; endgame pieces can ascend above their original drop grade. Forge and inventory show authoritative next quality, tier, costs and stats, with explicit ascension confirmation.

Verified119 transactions/five promotions for each of four starter weapons, nondecreasing actual power at every step, matching previews, all234 non-Primordial bases, exact-grade endgame eligibility, both save paths, swaps, core/level/service gates and atomic stale/repeated/missing-resource failures. Chromium/WebKit desktop/mobile forge checks and controller confirmation pass, alongside existing workshop/loot/itemization/endgame/enemy-delivery regressions. Engineering11/11/build pass. [Cost schedule, evidence and physical-device/economy limits](gear-ascension/README.md).
## Foci / Grimoire category audit

Separated twelve stamina-driven Foci from nine mana-driven Grimoires. Added independent Grimoire encounter XP/scaling, mastery tree, twelve book emblems, category/cost labels and one-time old-book proficiency migration. Shared damage still restores6 Mana per enemy target hit for both weapon families. Preserved item/art/projectile identity, ownership, smithing/ascension and legendary/set effects.

Passing168 four-owner resource/hit cases, independent tree and XP/save/migration contracts, Chromium/WebKit desktop/mobile UI, boss armory, legendary weapon, practice shop, Vampire, Lightbringer heavy and gear ascension regressions; engineering13/13/build pass. Three existing aggregate failures remain: unprepared Blood Communion dispatch, stale six-channel expectation and missing Vampire signature animation profiles. Compared against pre-change1a19edf to distinguish these from category changes. [Evidence and hardware/network limits](grimoire-category/README.md).
## Percentage primary-weapon Spirit recovery audit

Replaced runtime flat recovery with40% maximum Spirit for Grimoires,30% for Foci and25% for every other primary family/unarmed. Existing casting costs, cap, per-target guards and owner authority remain. Bound all primary attacks to their committed family so swapping to a book cannot increase an arrow's reward. Unified hotbar/help, full/compact equipment and Grimoire tree descriptions with the runtime rule.

Passing288 actual light/heavy hit cases across twelve families/four owners/three pool sizes, misses/dead targets, distinct-target cleaves, cap, repeat-frame guards, fractional pools and gear swaps;168 Grimoire category cases, boss/legendary/practice gear regressions and Chromium/WebKit desktop/mobile descriptions. Engineering13/13/build pass. Existing broad-suite limitations from the category audit remain open; human economy/hardware/network pacing is not certified. [Evidence and examples](weapon-spirit-recovery/README.md).
## Encounter training and mastery audit

The encounter ledger records weapon, ability, worn gear and useful action evidence per actor. The fixed training budget uses a 40/25/20/15 split before normalized class affinities. Armour snapshots prevent a last-second gear swap from redirecting previous training. Older saves retain levels and morph choices. The mastery budget reserves 18% for effective use and 2% for the five assigned slots. In a full-hotbar simulation, the most-used ability reaches M29 at Combat Level 47.

Automated checks cover four-slot damage/support credit, duplicate settlement, non-rewarding enemies, gear swaps, priority and M70 save round-trips, all 11 classes learning and using the three Wayfarer techniques, and four-slot healing with the host under threat. Desktop browser testing verified the priority control, victory award, HUD and save/reload. The Grimoire and primary weapon recovery regressions passed. Extended campaign pacing and physical-controller play still need a playtest.

## Ability and morph training labels

The ability detail and skill tree preview list the progression lines each skill trains. Every morph card shows the lines for its own form, including locked forms. On qualifying victories, the five assigned slots share 2% of the training budget from the existing offence share. Each slot distributes its share according to the form equipped at first contribution. Ability mastery has a separate budget.

## Three armour progression lines

Light Armour favours ranged damage and mobility. Medium Armour trains with reinforced leathers and battlemage sets, trading some ranged output for stronger close attacks and protection. Heavy Armour favours Health and Defence and raises dodge and channel costs. All three use the same worn-gear encounter snapshots. Weapon projectiles commit their armour damage bonus at launch. Rarity and upgrades retain the base piece's weight.

The focused verifier covers the full catalogue, representative melee and bow hits, close and ranged technique scaling, handling costs, armour XP and a save round-trip. Repeated swaps preserve the injured actor's Health fraction and leave downed actors at zero Health. Campaign pacing remains unmeasured.

## Healing and Taunting progression audit

Ability details and morph cards use the same progression classification as encounter training. Healing takes precedence over Warding for hybrid support. Useful direct healing and a newly applied taunt contribute to the caster's victory rewards. Overhealing grants no healing credit, and refreshing an existing taunt on the same target does not create another contribution.

Verified support classification, perk purchases, effective healing, overhealing, taunt range and expiry, and save/load. Existing four-slot party support and taunt checks and Rose Mantle checks passed.
