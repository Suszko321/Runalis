# Runalis loot, equipment and Mythical set overhaul

Implemented from **Runalis Loot Overhaul.pdf**, including its executive note that equippable drops must be much rarer. Completed and checked on October 7, 2026, Winnipeg time. This report records the implemented behavior and automated evidence; it does not claim a completed human playthrough of every act or infinite floor.

## Result

New weapons, armour and trinkets begin at **Tier 1**, regardless of Combat Level, enemy level, source or rarity. Each individual item can reach **Tier 20**. Upgrades follow the item through equipment, inventory, saves and Bone Coterie assignments. Gear drops are substantially rarer. Five three-piece Mythical sets add partial bonuses and actual channel, summon, finisher or defensive transformations. Demon Summon requires the equipped Demonseed Scythe, while learned knowledge, mastery and hotbar assignments persist through unequipping.

The existing per-skill mastery morph system remains optional and independent for each ability. No fixed subclass selection was restored. Earlier human gait/arm repairs, companion colors, final-boss return portals and the Orrakai map return remain in place.

**Review:** [interactive review lab](http://127.0.0.1:8768/loot-overhaul-lab.html), [pixel-art gallery](mythical-pixel-art.png), [mixed-set inventory](mixed-set-inventory.png), [upgrade confirmation](upgrade-confirmation.png), [merchant](mythical-merchant.png).

## Audit and architecture findings

The audited paths cover item definitions/rarities/loot (`data.js`), individual ownership/equipment (`player.js`, `panelInventory.js`), crafting and salvage (`craftingSystem.js`), special effects and enemy faction loot (`legendarySystem.js`, `enemyEquipmentLoot.js`), pickups (`lootSystem.js`), dungeon/cache rewards (`gameInteraction.js`), tower rewards (`towerSystem.js`), merchants (`shopSystem.js`), persistence (`saveProfiles.js`, `gameSave.js`), skills (`abilityLoadoutSystem.js`, `skillScrollSystem.js`, `abilityMorphSystem.js`, `abilityMasterySystem.js`), sets (`setBonusSystem.js`), combat (`combat.js`, `combatPower.js`, `combatMoves.js`, `combatActions.js`, `combatExpansion.js`, `subclassCombat.js`, `abilityChannelSystem.js`) and rendering (`humanRenderer.js`, `gearVisualStyle.js`, `factionEquipmentArt.js`, `companionSpriteArt.js`, `artIcons.js`, `combatVisualsRenderer.js`, `uiStyles.js`, `ui.js`).

Existing items use static definitions, rarity IDs and renderer-compatible equipment IDs. There was **no conventional enemy-level item generator to remove**. The actual problems were unbounded slot-based upgrades, upgrades transferring to a replacement copy in the same slot, and excessive overlapping gear rolls. The previous ordinary upgrade bonus was tied to the slot's upgrade count; it is now a bounded bonus on an individual item.

The existing item catalogue, 21 special legendary boss items, item-specific passives, affix metadata, crafting recipes, regional material rewards and acquisition identities remain available. The existing internal `mythic` rarity now displays as **Mythical**; the other rarity IDs remain intact. Rarity determines identity and acquisition, independently of enhancement tier. Existing unique effects are not multiplied by upgrade tier. Common gear gains the same enhancement cap and can be deliberately invested in; Mythical equipment has modest base values and transformation tradeoffs.

New focused modules are `equipmentProgressionSystem.js`, `equipmentBoundSkills.js`, `mythicalEquipmentData.js`, `mythicalEquipmentSystem.js` and `regionalLootSystem.js`. They integrate with the current inventory and combat dispatch rather than introducing another inventory or damage system.

## Individual items, enhancement and power

Bag records carry `id`, `qty:1`, `instanceId`, `upgradeTier` and their existing metadata. The same record moves into `player.equippedGear[slot]`; `player.equipment[slot]` retains its string ID for existing renderers. Legacy `gearUpgrades` mirrors `tier − 1` for compatible callers, but no longer owns enhancement progress.

For tier **T**, clamped to 1–20:

| Category | Ordinary enhancement contribution | Maximum at Tier 20 |
| --- | --- | --- |
| Weapon | `(T − 1) × 0.35` weapon power | +6.65 |
| Armour | `(T − 1) × 0.18` protection | +3.42 per piece |
| Trinket | `(T − 1) × 0.24` protection/focus contribution | +4.56 |

These contributions feed the existing weapon, spell/summon and protection calculations. They do not grant character levels, proficiency, mastery, extra summons or scaling copies of unique effects. Bone Coterie receives the existing reduced gear contribution, including the copy's tier. Reassigning its gear dismisses the active gear snapshot and starts normal recovery before an intentional recast, preventing removed equipment from continuing to power a summon.

The actual power test compares the same Demonseed Scythe: a Level 1 character with Tier 20 deals **37** calculated weapon damage, while a Level 100 character with Tier 1 and Level 100 proficiencies deals **92**. Their calculated HP is **100** versus **563**; the latter also has greater ordinary power and protection. This validates the combined character/proficiency contribution in that scenario, not a claim that Combat Level alone produces those damage values. Infinite progression's existing formulas and bounded equipment effects remain separate.

## Upgrade cost model

Gold uses the existing Ash Coin balance. Currency for target tiers 2–20 is:

`20, 28, 36, 44, 150, 220, 320, 460, 660, 800, 1050, 1400, 1750, 2100, 2450, 2800, 3150, 3400, 3600`.

Tier 5 → 6 increases the currency cost from **44 to 150**, adds Arcane Dust and increases material consumption. Fully enhancing one item costs **24,438 Ash Coins**, plus materials. Costs are shared by all rarities.

For target tier **N**:

- Iron Scrap: `N−1` through 5; `N` through 10; `2(N−5)` through 15; `4(N−10)` through 20.
- Gathered material begins at 3: 1 through 5, then `ceil((N−3)/3)`. Armour uses Amber Resin; trinkets Fieldstone; bows/staves/foci Sturdy Hardwood; other weapons Blackiron Ore.
- Arcane Dust begins at 6: `N−4` through 10; `2(N−7)` through 15; `3(N−10)` through 20.
- Specialized material begins at 11: `N−10`. Bows use Thornsilk Fiber; scythes Grave Silver; staves Spiritwood Splinter; foci Lumen Quartz; trinkets Tideglass Crystal; other eligible gear Oathsteel Shard.
- Tower Fragments begin at 16: `N−15`.

| Target tier | Ash Coins | Iron Scrap | Gathered material | Dust | Specialized material | Tower Fragments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 20 | 1 | — | — | — | — |
| 5 | 44 | 4 | 1 | — | — | — |
| 6 | 150 | 6 | 1 | 2 | — | — |
| 10 | 660 | 10 | 3 | 6 | — | — |
| 11 | 800 | 12 | 3 | 8 | 1 | — |
| 15 | 2,100 | 20 | 4 | 16 | 5 | — |
| 16 | 2,450 | 24 | 5 | 18 | 6 | 1 |
| 20 | 3,600 | 40 | 6 | 30 | 10 | 5 |

The PDF's million-coin examples were explicitly illustrative. Actual early merchant equipment costs about 28–58 coins, Iron Scrap costs 18 per three, and Arcane Dust costs 28 each. Existing enemy coin drops are generally single-digit to low double-digit payouts. The implemented curve permits early experiments but requires substantial repeated investment later. New coin pickups now credit the existing gold balance; legacy inventory coin entries are preserved.

Repeatable cleared tower chests retain their regional materials and additionally give `min(150, 18 + 3×floor)` coins. From floor 11 they add `2 + min(8, floor(floor/10))` Dust. From floor 16, every fifth floor adds `1 + floor(floor/25)` Tower Fragments. A Tier 20 upgrade's currency alone equals 24 late-floor chests at the 150-coin cap; materials still require their relevant sources. The entire path's currency alone equals about 163 such capped payouts. These are economy comparisons, not measured player completion times.

Upgrading requires selecting **Upgrade**, then **Confirm Upgrade** in game. The quote records the instance and current tier. Confirmation recomputes its cost, verifies all currency and material stacks before mutation, and rejects stale or repeated quotes. Tier 20 has no further transaction. Inventory details show the selected copy's tier and stats, current/projected enhancement, exact cost and owned/required materials. Bag copies must be equipped before upgrading that copy.

## Equipment-bound skills and Demonseed Scythe

The central availability gate separates **known** from **usable**. `summonDemon` requires the equipped `demonseedScythe`; the generic gate also supports other abilities declaring `requiredEquipmentId`. Merely owning the scythe, putting it in the Bone Coterie or learning the pact is insufficient to cast.

Acquiring the scythe retains the existing pact discovery/read flow. The player learns Demon Summon and assigns it through Abilities. Casting uses the current Summoning proficiency, Combat Level, skill mastery, Fates and resource/cooldown rules. The old Demonseed on-damage summon is excluded from passive dispatch. Unequipping dismisses its active demon and begins normal recovery. Learning, mastery XP, selected slots and recovery timestamps survive; re-equipping restores availability without resetting the recovery clock.

Other existing legendary mechanics remain item-specific. Only ordinary tier contributions increase with enhancement; no blanket multiplier scales every unique passive. This supersedes the earlier progression overhaul's permanently usable Demonseed pact behavior intentionally, as required by the loot document.

## Mythical sets and actual transformations

Each set has exactly three components in three distinct existing slots. There are **15 new items**; no sixth slot, set-completion currency or mandatory class path was introduced.

| Set | Pieces and slots | Partial bonuses | Three-piece transformation and tradeoff |
| --- | --- | --- | --- |
| Drowned Convergence | Crown/helm, Vestment/chest, Seal/trinket | +0.5 Spirit per first two thresholds; water skills cost 5% less; second threshold extends Water Torrent reach 10% and arc 25% | Original Water Torrent becomes a held, steering sweep with 77px width, 70% direct tick damage and 25% greater upkeep before the partial discount. Water beam morphs gain the same sweeping geometry. |
| Beast Sovereign | Crown/helm, Greaves/legs, Seal/trinket | +4% summon health per first two thresholds; Wolf costs 5% less and moves 10% faster; second threshold changes fur to pale gold, extends bite reach and adds 0.12s stagger | Dire Wolf is visually 25% larger, has 35% more HP on top of partial bonuses, and cleaves up to four nearby foes at 45% damage every third bite. Its threat attracts enemy targeting. Movement is 15% slower relative to the partial-set wolf, attack interval is 15% longer, and summoning costs 25% more before the discount. |
| Ashen Executioner | Blade/weapon, Vestment/chest, Greaves/legs | +0.5 Strength per first two thresholds; melee attacks cost 5% less; heavy finishers gain 15° cleave and 0.06s stagger | Melee Light–Light–Heavy becomes a 180° ember cleave with 20% more reach and one 25%-damage aftershock. Direct damage falls 20%, Stamina cost rises 25% before the partial discount, and recovery rises 18%. No recursive legendary procs. |
| Veil of the Blighted Star | Staff/weapon, Crown/helm, Seal/trinket | +0.5 Spirit per first two thresholds; beams cost 5% less and turn faster; second threshold adds 15% reach and further steering | Sustained beams branch to two nearby foes within 120px at 28% damage. Primary beam damage falls 22%; upkeep rises 20% before the discount. Applies to existing compatible individual beam morphs as well as Crimson Conduit. |
| Pilgrim's Vigil | Vestment/chest, Greaves/legs, Seal/trinket | +0.5 protection; second threshold gives 6% block efficiency and adds 0.06 Guard reduction | Guard also wards nearby co-op allies within 120px and lasts 25% longer, costing 20% more Stamina. Dodge costs 8% less. Block efficiency affects actual blocked stamina damage. |

The requested Hollow Star example uses **Blighted Star** to preserve the project's established naming constraint. Damage, geometry, terrain checks, resource consumption and effects use the same existing combat dispatch. The full-set effects have visible pixel water sweeps, branching beams, ember cleaves/aftershocks, larger gold wolves and a wider ward. They retain the original skill's attribution and mastery ownership.

Counts use authoritative valid equipment slots and reject wrong-slot/duplicate references. Three-plus-two and two-plus-two combinations work within five slots. Additive statistics are capped: summon damage 50%, summon health 60%, critical chance 30%, critical damage 60%, block efficiency 35%, dodge reduction 30%, lifesteal 12%, boss damage 30%, and applicable elemental bonuses 40%. When channel modifiers overlap, Drowned Convergence takes transformation priority on a compatible water beam while valid partial modifiers compose. Changing the required full set interrupts the channel; Wolf count changes dismiss its transformed snapshot and use normal summon recovery. Sets do not grant another class's skills or overwrite chosen mastery morphs.

## Pixel-art assets

Last Dawn and Covenant equipment use the existing animated pixel-art equipment families and native pixel layers. The full faction browser review renders all **84 faction pieces**, checks **1,344 poses**, and finds no empty rendering. All 84 inventory icons are present. Original player pixels match their baseline exactly in 16 checked poses.

All 15 Mythical pieces resolve to the same established renderer with set-specific pixel palettes, silhouettes, crests, emblems and weapon detailing. Their inventory icons use crisp native SVG shapes; they are not 15 newly hand-painted raster sheets. All chest/leg definitions resolve to four-direction, six-frame armour families. The allied base wolf remains blue; the demon remains purple; Beast Sovereign uses pale-gold animated wolf art. This preserves companion/enemy distinction and the earlier gait/arm repairs.

The Mythical matrix renders 960 poses with 6,696 atlas draws, no invalid source rectangles, no blank poses and 15 distinct icons. Eight warmed tint atlases occupy 2,525,184 bytes and remain stable across repeated draws; cache capacity is bounded at 72. These are asset/cache checks, not whole-game frame-rate measurements.

## Loot, regional identity and merchants

Existing enemy loot probabilities receive an additional gear factor: **0.08 ordinary, 0.20 elite, 0.35 boss**, plus **0.04 for exceptional table gear**. Existing ordinary material rates remain intact. Base tables yield at most one equipment item per roll. Independent legendary, Mythical and faction rolls remain intentionally rare and can occasionally accompany one another.

The dedicated legendary boss chance falls from 10% to **2%**; miniboss handling uses 0.5%. Its pool favors relevant existing legendary identities. Faction wearable drops fall from 3% to **0.3%**, while faction trophies remain separately collectible. This intentionally supersedes the older enemy-visual report's 3% equipment rate.

Mythical rates: **1.5% bosses**, **0.15% elites**, **4% boss chests/tower fifth-floor milestones**, **0.6% locked chests**, **2% explicitly rare/cursed caches**, and zero ordinary-enemy Mythical chance. Eligible ordinary chest gear uses 7%; locked/rare 15%; boss 25%; exceptional existing chest gear uses 2.5%. These are roll probabilities, not a guarantee that each qualifying source has equipment in its authored reward list. Required quest rewards remain protected.

Regional pools select relevant three-piece families from actual enemy/boss/POI/region identity: water/tide/drowned routes favor Drowned Convergence; wolves/forest/briar favor Beast Sovereign; cult/ember/seal/Last Dawn favor Ashen Executioner; blight/grave/crypt/Ascension favor Blighted Star; holy/oath/guardian/Covenant/Seraphel/Zephyr favor Pilgrim's Vigil. Matching themes can overlap. The frontier tower can offer beast and blighted identities. No player-level gear clones are created.

Five fixed merchant commissions cost **1,250 coins**, offering one Tier 1 piece from each set. Matching pieces remain exploration rewards. Purchase uses the existing shop and inventory path. The browser test actually buys a commission and verifies its price, instance identity and Tier 1 entry.

Seeded 150,000-kill sample, using the Last Dawn Cultist tables with ordinary, elite and Red Seal boss ranks:

| Rank | Kills | Any equipment | Legendary equipment | Mythical equipment | Any non-gear reward |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ordinary | 50,000 | 359 / 0.718% | 0 | 0 | 31,504 / 63.008% |
| Elite | 50,000 | 784 / 1.568% | 0 | 96 / 0.192% | 37,458 / 74.916% |
| Boss | 50,000 | 2,609 / 5.218% | 1,019 / 2.038% | 736 / 1.472% | 45,930 / 91.860% |

The categories overlap; percentages are not intended to sum to 100%. This representative seeded sample is not every enemy's exact rate. A separate 100,000-eligible-kill faction sample produced 296 wearable drops, or **0.296%**.

## Save migration and co-op

Save schema is **16**. A legacy equipped slot at `+N` becomes **Tier `min(20, N+1)`** once. Existing equipped copies, affixes and individual records remain; legacy non-stack bundles split into the same number of individual copies. `legacyUpgradeLevel` and `legacyGearUpgradeSnapshot` retain the original invested values for auditing, including values above the new cap. There is no automatic refund for pre-existing enhancements above Tier 20; their combat contribution now respects the universal cap. That is a deliberate compatibility limit rather than a claim that unlimited legacy stats remain active.

Equipment, inventory, player-specific ownership, learned abilities, hotbar slots, mastery and new instance metadata survive profile/game serialization. Bone Coterie entries retain tier, quantity, identity and affixes through placement, return and reload. The existing bank is a gold reserve; there is no new item-storage subsystem. Existing serialized ancillary fields are preserved rather than replaced.

Runalis currently implements local shared-screen co-op, not a network synchronization protocol. Loot uses the existing authoritative party ownership and pickup path. An enemy's payout and a chest's claim are guarded against repeat collection. Pickups grant the receiving player's item record, and repeated pickup updates do not duplicate it. Set and bound-skill calculations read each character's actual equipped state. Nearby Guard support is attributed through the existing co-op combat path. No online protocol was invented or claimed tested.

## Verification

All listed checks passed against this implementation:

| Verification | Evidence |
| --- | --- |
| Loot model | 24 checks; all tiers/rarities, instance swaps, atomic/stale transactions, migration, Demon casting/dismissal/recovery, Bone Coterie transfer/save, partial/full/mixed sets, actual transformed damage, individually chosen morph composition, ownership and tower rewards; 150,000 seeded kills |
| Loot browser | 960 Mythical poses; actual confirmation/spending/unequip/cap/merchant purchase; game launch; zero page errors or failed requests |
| Combat regression | 57 checks |
| Progression regression | 23 checks; 88 class/level simulations; 19 weapon timings; actual dispatch of 87 active abilities |
| Optional skill morph regression | 213 forms and 639 real casts; unlock, save and reset checks |
| Item art coverage | 331 items, 74 weapons, 57 animated armour definitions, 87 skill icons |
| Enemy/faction regression | 132 worlds, 5,084 enemies, 221 identities, 15 archetypes, zero changed recorded simulation values; 84 pieces and seven faction sets |
| Enemy/faction browser | 756 configurations, 112,815 atlas draws with zero invalid rectangles; 1,344 player equipment poses; 84 icons; 16 unchanged baseline player poses; no errors |
| East/west volume | 8,448 rendered width samples |
| Authored leg gait | 1,024 native leg renders and 1,024 composed actor cases; pixel coverage, mirrored silhouettes and held atlas frames |
| South-facing arms | 1,170 poses matching the natural base wrist landmarks |
| Dungeon return portals | Seven themes; final-boss-only unlocking, correct entrance return, save persistence |
| Source syntax | All 202 source JavaScript files parsed successfully |

Machine-readable evidence: [model verification](model-verification.json), [browser verification](browser-verification.json), and the existing regression reports alongside their tools. Reproduce with `tools/verify-loot-overhaul.mjs`, `tools/verify-loot-browser.cjs` and the named existing verification tools. Browser checks require the local preview and Playwright; sprite checks use the configured Canvas runtime. The review lab creates separate test characters and does not load or overwrite the user's actual profiles.

## Backup and limits

The pre-change source, assets and documents are saved in [pre-loot-overhaul-20261007.zip](../../backups/pre-loot-overhaul-20261007.zip), **313,194,998 bytes**. No Git checkout was available in this workspace, so this is a file snapshot rather than a commit.

Implemented systems and checks are complete for the current architecture. Long-term drop enjoyment, practical Tier 20 completion time and high-level encounter balance still need real player playtesting; seeded models and browser checks cannot establish those experiences. Art deliberately shares established pixel families with distinct set treatments rather than promising a unique raster sheet for every item. Existing legendary identities/passives were preserved; no unrelated legendary catalogue was rewritten wholesale. Online multiplayer is outside the existing architecture and was not implemented. Legacy tiers above 20 retain their audit metadata but not unlimited combat bonuses.
