# Lifelong gear upgrades and rarity ascension

Implemented November 1, 2026. This replaces the permanent +20 cap and old smith
cost schedule. Enemy loot distributions are unchanged.

Every weapon, armour piece and trinket can improve through +1–+20, ascend one
rarity, and restart at +1: Common → Uncommon → Rare → Legendary → Mythical →
Primordial. Primordial +20 is the final cap. A Common +1 item needs119 successful
forge transactions:114 upgrades and five ascensions. Found higher-quality gear
starts at that quality without requiring earlier cycles.

## Identity and strength

The same instance ID, base item, appearance, equipment slot, affixes and special
identity survive. Bag and equipped copies both work at a nearby live blacksmith.
Each completed cycle retains19 earned stat-bonus steps; the current cycle adds
its normal0–19. Weapon/trinket/armour coefficients remain .35/.24/.18. Rarity also
scales actual item stats through the existing resolver. Ascending retains earned
strength rather than weakening the item when its displayed tier resets.

Legacy copies retain previous values until ascension opts them into shared rarity
scaling. Endgame ensembles still drop only at their authored quality and source
and level gates; owned copies may ascend above that quality, retaining their set
identity. No downgrades or random low-quality endgame copies are introduced.
Rarity does not invent another named item's unique passive for a starter weapon.

Entering Mythical/Primordial retains the existing Combat Level50 requirement.
The forge previews a locked promotion but cannot commit it. Endgame bases retain
their original minimum-level requirements. Both game-save sanitization and
profile normalization preserve the new per-copy completed-cycle count.

## Gold schedule

| Rarity | +1→+2 | +19→+20 | All19 upgrades | Ascend from +20 |
| --- | ---: | ---: | ---: | ---: |
| Common | 5 | 1,080 | 6,840 | 3,500 |
| Uncommon | 2,020 | 6,320 | 65,360 | 19,000 |
| Rare | 16,035 | 23,560 | 351,880 | 58,500 |
| Legendary | 54,050 | 64,800 | 1,094,400 | 134,000 |
| Mythical | 128,065 | 142,040 | 2,520,920 | 257,500 |
| Primordial | 250,080 | 267,280 | 4,859,440 | Final cap |

For rank `r=0..5` and target tier `n=2..20`, gold is
`2000*r³ + commonTierGold[n]*(1+3*r)`. The common table lives in
`equipmentProgressionSystem.js`. Ascension costs `2000*(r+1)³+1500*(r+1)`.
Costs rise within every rarity; the one-time ascension is deliberately expensive.

## Materials and transaction rules

- Common uses Iron Scrap and adds the item's gathered resource from +6. Its first
  cycle requires no boss cores, Arcane Dust or tower materials.
- Uncommon adds gathered resources immediately, Arcane Dust from +6, and an
  advanced material plus a normal enemy material from +11.
- Every Rare+ upgrade needs Boss Cores alongside scrap, gathered resources, dust,
  advanced materials and normal enemy drops. Legendary+ also needs Tower Fragments.
  Quantities increase with rank and tier.
- Ascension needs scrap, dust, hardwood and ore. Entering Rare adds Boss Cores;
  entering Legendary+ also adds Tower Fragments and Grave Silver.
- Advanced materials follow the gear: scythes use Grave Silver, focuses Lumen
  Quartz, bows Thornsilk Fiber, etc. Ordinary mob components are Cult Ash,
  Pale Essence or Bone Shards according to item type.

The forge and inventory inspection show the next rarity/tier and actual costs.
Forge comparisons use the actual next stats and explain retained cycle strength.
Ascension needs a separate review/confirmation. Quotes bind the exact item,
location, current tier, rarity and completed-cycle count. Commit recalculates
live costs before consuming anything. Missing materials, level gates, stale
quotes and lost service access consume nothing; only the owner's resources pay.

## Verification

- `verify-gear-ascension.mjs`: full119-step starter path for four owners; every
  step has nondecreasing actual damage, matching previews and unchanged IDs,
  affixes and base data. Covers five resets, repeated/stale commits, bag/equipped
  swaps, saves/profiles, all234 non-Primordial gear bases, endgame eligibility,
  copied metadata, core requirements, cost growth, level gates and smith authority.
- `verify-gear-ascension-browser.cjs`: Chromium/WebKit, desktop1440×1000 and
  mobile390×844; four owners, preview/review/commit, missing-core UI, controller
  confirmation, level50 gate and final cap. Mobile capture visually reviewed.
- Existing13 workshop groups/63 recipes, actual-game workshop browser,24 loot
  groups/150,000 sampled kills, loot art/browser/startup, itemization model/browser,
  endgame equipment, enemy delivery, engineering11/11 and publication build pass.
  Test fixtures and assertions follow the intentionally changed costs/cap rules.

No physical controller/phone, human grind-duration or live online transport test
is claimed. The expensive schedule is explicit tuning, not measured economy
balance. Local screenshots are ignored review artifacts.
