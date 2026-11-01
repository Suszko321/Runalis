# Gear itemization · November 1, 2026

Follow-up: [enemy delivery and dungeon quality](../enemy-loot-delivery/README.md)
now governs dungeon rarity and final-boss odds. Non-gear enemy rewards are credited
immediately with a white collection feed. The level formula below remains the
outside-dungeon policy; gear bag, per-copy stats and upgrade contracts remain.

Implemented a universal, deliberately scarce combat-gear system. Every eligible enemy can drop any of the **202 current weapon, armour and trinket bases**. Base selection is uniform across the shared pool, independent of class, zone and boss identity. New eligible gear definitions automatically join that pool. Quest-only/no-random-drop definitions are excluded when explicitly marked.

The earlier exclusive boss armory rolls and regional random-gear additions no longer supply enemy gear. Their gear results are filtered from the old material/discovery tables; one universal roll supplies at most one random gear copy per enemy. Materials, scrolls, currency and authored first-clear/quest rewards retain their existing paths. Reward-suppressed enemies and enemy summons do not roll gear.

## Distribution formula

**Level means the receiving character's Combat Level**, not the monster's level or one weapon skill.

1. Roll whether gear drops:

| Enemy rank | Gear chance per kill | Average kills for any gear |
| --- | ---: | ---: |
| Ordinary | 1.5% | 66.7 |
| Elite / rare / champion | 6% | 16.7 |
| Boss / world boss | 30% | 3.3 |

2. On success, choose one base uniformly from the complete eligible pool.
3. Roll its rarity using the receiver's Combat Level. All percentages below are **conditional on a gear drop**:

| Rarity | Colour | Level 1 | Level 50 | Level 100+ | Quality factor Q |
| --- | --- | ---: | ---: | ---: | ---: |
| Common | White `#ffffff` | 80% | 60% | 50% | 1.0 |
| Uncommon | Green `#63d17b` | 17% | 27% | 30% | 1.2 |
| Rare | Blue `#619dff` | 2.9% | 10% | 15% | 1.5 |
| Legendary | Yellow `#ffda52` | 0.1% | 2.4% | 4% | 2.0 |
| Mythical | Purple `#ad69f0` | **0%** | 0.55% | 0.9% | 2.6 |
| Primordial | Crimson `#dc264b` | **0%** | 0.05% | 0.1% | 3.4 |

For levels below50, define `p = clamp((L - 1) / 49, 0, 1)`:

```text
Common    = 80 - 15p
Uncommon  = 17 + 10p
Rare      = 2.9 + 4p
Legendary = 0.1 + p
Mythical  = 0
Primordial= 0
```

At level50 and above, define `e = clamp((L - 50) / 50, 0, 1)`:

```text
Common    = 60 - 10e
Uncommon  = 27 + 3e
Rare      = 10 + 5e
Legendary = 2.4 + 1.6e
Mythical  = 0.55 + 0.35e
Primordial= 0.05 + 0.05e
```

Each band sums to100%. The explicit band switch makes both top rarities impossible below50. Combat progression remains uncapped; the rarity distribution stops improving at100.

For a specific base `b` and rarity `r`, with `N` eligible bases:

```text
P(b and r per kill) = gearChance(enemyRank) × (1 / N) × rarityWeight(r, L) / 100
```

Example at level50: any Legendary from a boss is0.72% per kill; any Mythical is0.165%; any Primordial is0.015% (about one in6,667 bosses). At level100, the Primordial boss rate becomes0.03% (about one in3,333). These are deliberately scarce starting values, not a claim of human-tested long-term pacing. There is no guaranteed-gear pity counter or additional class restriction.

## Rarity changes the copy's stats

Random gear stores `gearRarity`, `rarityRollVersion:1`, `itemLevel`, `upgradeTier:1` and its existing unique `instanceId`. Different copies of the same ID retain independent rarity and upgrade tiers. The global `ITEMS` definitions remain unchanged.

```text
rolledStat = roundTo2Decimals(baseStat × Q(rolledRarity) / Q(baseDefinitionRarity))
```

This normalizes the existing base's rarity budget: a Common copy of a natively Legendary base does not retain its full Legendary numeric budget. Applied to damage/power, armour, Spirit, focus power, flat vitality/attribute fields, primary/secondary multipliers and value. It does not multiply weapon speed, reach, costs, projectile collision or the character's total power. Existing character proficiencies and twenty-tier equipment upgrades remain authoritative. `itemLevel` records provenance; it does not add a second hidden damage multiplier.

The stat owners, actual weapon damage, inventory strike-power comparisons, defensive armour, Legendary-passive lookup, Mythical-set lookup and Coterie equipment bonuses consume the resolved copy. Weapon armour is included in player armour. New copies below Legendary cannot inherit the base's Legendary passive; downgraded Mythical-set bases do not grant their set effects until their copy is Mythical or Primordial. Intrinsic weapon-family mechanics and equipment-bound skill identities remain existing systems.

Compatibility aliases: `occult→rare`, `epic/relic→legendary`, `ancient→primordial`, `mythical→mythic`. Existing carried/equipped copies without the new roll marker keep their prior numeric stats and upgrades; labels adopt the six-colour vocabulary. Existing pre-50 owned exceptional items are retained, rather than deleted or downgraded. New acquisitions are gated. Optional metadata fits the existing save schema and online inventory/equipped-record snapshots.

## Twenty-slot gear bag

- The limit is **20 unequipped combat-gear copies per player**. Equipped player/Coterie gear is outside the bag. Materials, consumables, scrolls and gathering tools do not consume these slots.
- Every duplicate copy uses one slot. Materials retain their existing stacking.
- Swapping equipped gear preserves both individual records and uses the vacated slot; unequipping or retrieving Coterie gear is refused if it would exceed20.
- Full-bag world pickups remain on the ground in the current area, uncollected. Gear drops have no90-second loot expiry. This does not promise persistence after the world/instance is destroyed.
- Shops and crafting preflight capacity before charging or consuming ingredients. Dialogue/quest reward claims preflight capacity before committing their rewards. Chests, authored boss rewards, tower rewards, fishing, side-zone rewards and secrets use capacity-safe world delivery: a gear copy that cannot fit is left on the ground rather than silently lost.
- Older overfull saves retain every item. They can equip/sell/deconstruct existing items; new gear is refused until the bag falls below20. No automatic deletion or automatic sale.

Inventory, merchants and blacksmiths show the count and actual rarity colours/names. Inventory also explains the Combat Level50 unlock.

## Selling and blacksmith deconstruction

Merchants list carried, unequipped gear by exact copy. First activation reviews; the second confirms. Quotes bind owner, instance, base, rarity, tier and price. Changed/stale quotes and repeat confirmations cannot sell another copy or duplicate gold. Equipped player/Coterie copies are protected.

```text
saleGold = max(1, floor(resolvedValue × 0.35 × (1 + 0.03 × (upgradeTier - 1))))
```

Blacksmiths have a **Deconstruct** category. Only bag gear appears. Preview lists exact materials, then requires confirmation. Deconstruction uses the existing live blacksmith authority: proximity, provider, actor, world and lifetime checks remain enforced; portable inventory salvage cannot bypass it.

| Rarity | Iron Scrap | Arcane Dust | Gathered material | Tower Fragment |
| --- | ---: | ---: | ---: | ---: |
| Common | 1 | — | 1 | — |
| Uncommon | 2 | — | 1 | — |
| Rare | 3 | 1 | 2 | — |
| Legendary | 5 | 3 | 2 | — |
| Mythical | 8 | 6 | 3 | 1 |
| Primordial | 12 | 10 | 3 | 2 |

Gathered material: bows/staves/focuses→Sturdy Hardwood; armour→Amber Resin; trinkets→Fieldstone; other weapons→Blackiron Ore. These feed the existing upgrade costs. Upgraded items do not return every invested material. Deconstruction consumes one exact copy and frees one slot; rewards stack without using gear space. D-pad navigation scrolls through all20 sale/deconstruction entries.

## Verification and limits

- `node tools/verify-gear-itemization.mjs`: exact stratified distributions and level49/50 boundary; all202 bases reachable from an ordinary enemy; rank rates; real damage/armour/stat-display agreement; immutable bases; instance/save round trips; passive/set quality gates; all four bags; swaps/unequip, exact/stale sales, blacksmith authority/materials; ground-overflow recovery, reward/crafting preflight, overfull-save retention and exactly-once enemy payout.
- `node tools/verify-gear-itemization-browser.cjs`: real inventory colours/counter, four independent merchant sales and blacksmith deconstructions, controller confirmations, navigation to the twentieth entry, full-bag purchase protection, desktop/mobile fit and no page errors. Captures here: `inventory.png`, `merchant.png`, `blacksmith.png`, `mobile-blacksmith.png`; report `browser-verification.json`.
- Updated existing loot/workshop expectations for the new level gate and removal of portable salvage. **24 loot groups**, including150,000 seeded kills, and **13 workshop model groups**, including all63 recipes, pass.
- Existing running-game workshop browser suite passes17 flows and five layouts, with no page errors or missing requests. Quest roster/interactables, four-player dungeon bosses, Gravecaller sustain and party-support/taunt regressions pass.
- Engineering gate11/11; production build349 startup modules /946 files /40.3MiB.

Source owners: `gearRarity.js` (pure formulas), `gearItemization.js` (pool/capacity/instance lookup), `gearServices.js` (sale/deconstruction contracts), existing loot/player/combat/equipment/UI/workshop/reward modules. No new rendering framework, inventory manager or save schema.

Physical-controller endurance, a real network session and long-term human loot/economy balance were not performed. Online metadata uses the existing snapshot paths; this work does not resolve the audit's broader character-import trust finding.
