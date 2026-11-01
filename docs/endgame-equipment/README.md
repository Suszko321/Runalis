# Endgame high-fantasy ensembles

November 1, 2026. Twelve four-piece ensembles add **48 new items**, each with a
helm, chest, legs and mantle in the existing four non-weapon slots. Each design
drops at one exact quality; no Common, Uncommon or Rare copies can drop or be
acquired. Owned pieces may [ascend above their authored quality at the forge](../gear-ascension/README.md)
after completing +20, retaining the same appearance and set identity.

| Style | Legendary · 50 | Mythical · 65 | Primordial · 80 |
| --- | --- | --- | --- |
| Mage | Starweaver | Astral Hierophant | First Firmament |
| Knight | Sunward Regent | Eclipse Imperator | World-Anvil |
| Archer | Moonstag Warden | Celestial Hunt | Last Horizon |
| Battlemage | Runebound Marshal | Aether Crusader | Storm Sovereign |

[Collection overview](collection.png), complete directional outfit reviews:
[Legendary](legendary-outfits.png), [Mythical](mythic-outfits.png),
[Primordial](primordial-outfits.png), [four held gait frames](gait-review.png).
Normal game captures: [Mage](in-game-mage.png), [Knight](in-game-knight.png),
[Archer](in-game-archer.png), [Battlemage](in-game-battlemage.png).
These local captures and source masters are ignored review artifacts. Runtime
exports, data/code, tools and these notes are tracked. [Exact prompts and saved paths](PROMPTS.md).

## Identity and fitting

Indigo lunar silk, ivory astral regalia and obsidian crystal lattice define the
Mage sequence. Knights progress from cobalt lion heraldry through black-and-ivory
eclipse plate to basalt/bronze World-Anvil armour. Archers use emerald antler
work, pale celestial feathers and midnight dragonhide with amber accents.
Battlemages combine burgundy rune armour, pearl/cobalt spellplate and dark teal
storm steel. Each family has distinct head crests, material surfaces, greaves,
heraldic mantle and inventory icons rather than a common-set palette swap.

Twelve ImageGen masters supply 192 directional drawings, 384 native registrations
and 48 matching icons, all binary-alpha. Body atlases are 256×640; icon strips
128×32. The approved anatomy, original body alpha, source gait, arm positions and
weapon anchors remain authoritative. Headwear has separate compact male/female
fittings. Long native mantles use the established rear/front cloak layer and
enlarge the outfit silhouette without replacing limbs or creating another clock.
Chest/leg material transfer retains the existing silhouette and skin coverage.

## Loot and acquisition rules

- Both recipient Combat Level and enemy encounter level must meet 50/65/80.
  Only existing elite/rare/champion/miniboss/boss classifications are eligible.
  Unknown/weak enemy levels, ordinary enemies and suppressed/summoned enemies
  cannot produce these items. High-floor towers already assign increasing real
  encounter levels, so these are late-progression finds rather than tutorial
  boss rewards for an overlevelled character.
- The current universal gear chance (1.5% ordinary, 6% elite, 30% boss) and all
  six rarity weights remain unchanged. Only after a qualifying high-grade roll
  does selection allocate 60% to the matching sixteen-piece endgame pool; 40%
  remains with the existing 202-base unrestricted pool. Existing RNG consumption
  remains chance/selection/rarity, three calls. No second payout roll was added.
- `noRandomDrop` excludes these IDs from the unrestricted pool. No shop offers,
  recipes or quest grants were added. Acquisition and equip checks enforce exact
  quality and minimum wearer level. World rewards cannot downgrade restricted
  Mythical/Primordial items for a low-level receiver. Existing legacy reward
  downgrading remains available for older unrestricted gear.
- Every copy retains the existing instance identity, 1–20 upgrades, rarity/item
  level metadata, bag capacity, services, persistence, wire shape and ownership.
  A full bag leaves the correct high-quality copy on the ground for recovery.
  A reproduced existing P3/P4 label defect was fixed: owner labels now match all
  four owner slots, without changing pickup authority.

The rates intentionally follow the user's existing itemization system. These
checks establish eligibility and mechanics, not a human grind-duration/balance
playtest. Individual pieces remain valuable before the complete ensemble.

## Functional bonuses

The established set-bonus owner supplies additive two/three/four-piece bonuses.
No class locks, granted skills, new passive engine or transformation pipeline:

| Style | Two pieces | Three pieces | Four pieces |
| --- | --- | --- | --- |
| Mage | Spirit +4 | Boss damage +4% | Spirit +6 |
| Knight | Armour +4 | Block efficiency +8% | Boss damage +5% |
| Archer | Dodge cost reduction +6% | Boss damage +5% | Armour +4 |
| Battlemage | Spirit +3 | Block efficiency +5% | Boss damage +6% |

The table is Legendary. Mythical/Primordial data scale these at 1.3×/1.6× with
the existing percentage caps and two-decimal data rounding. Actual piece armour
and Spirit budgets also increase, with lighter Mage armour and heavier Knight
plate. Each rarity is a separate named ensemble; pieces from unrelated ensembles
do not falsely complete one set. Any existing class can equip any style once its
level is sufficient. Existing mythical morph sets retain their own rules.

## Verified

- `verify-endgame-equipment.mjs`: all48 exact-grade boss/elite item selections,
  240 rejected forbidden grade acquisitions, low character/enemy level rejection,
  suppression rules, retained original pool and three-call RNG order; 192 full
  loadouts (12 ensembles ×4 classes ×4 local owners), set thresholds, actual armour/
  equipment Spirit/boss multiplier and save/load identity/stat preservation.
  Real seeded enemy death/pickup for Legendary/Mythical/Primordial, exactly-once
  rewards, full-bag recovery, all four nearest-owner drops and rejected foreign
  pickups pass. Seeds19/44/5707 are recorded in ignored `loot-evidence.json`.
- `verify-endgame-equipment-art.mjs`: 40,296 renders, 9,984 exact chest/leg
  silhouette comparisons; both bodies, four heads, four facings, thirteen pose
  samples with actual gait keys0/1/2/3, four weapon families, mixed ensembles,
  per-copy refs, stable underlying clothing colours and no actor mutation.
- Browser: all48 pieces acquired/equipped at their real grade, live set bonuses,
  both bodies/four facings/four gait frames and actual startup/in-game outfits.
  Overview, three directional sheets, gait sheet and four live-game captures were
  visually reviewed. No page errors. Fixtures use isolated profiles.
- Existing gear itemization, 24-group loot overhaul (including Primordial1–20),
  boss armory, armour composition, head fit, native gait, legendary locomotion
  (38 items/2,496 renders), melee rig, weapon stance and Gravecaller evolution/
  sustain pass. Four-owner sale/deconstruction/full-bag/mobile UI browser checks pass.
- Engineering11/11, build and `check:wearables` pass; the coverage contract now
  checks all168 non-weapon equipment IDs. Art audit adds432 occupied/inset cells
  without new errors and preserves all eight approved player-sheet hashes.
  Aggregate art audit retains the same24 pre-existing metadata-format/coverage
  errors. No assertions or errors were removed to hide them.

Changes are confined to the new content, fitting registrations, the existing
loot/acquisition/equip boundaries, set registry, and focused fixtures/evidence.
No original gear IDs, saves, class progression, weapon art or movement rules were
replaced. Separately authored monster bodies retain their established fitting.
