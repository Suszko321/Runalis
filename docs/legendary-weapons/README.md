# Legendary weapon collection

Twenty new Legendary weapons: four grimoires, swords, staves, maces and bows.
Every design has an individually authored world model, a matching 32px inventory
icon, stat tradeoffs and a functional effect from the established Legendary owner.
Four grimoires also have individually authored projectiles, latched at windup.

The subsequent [focus fitting pass](../focus-hip/README.md) reduces every book/
focus world model by25% and adds a consistent anatomical-right hip carry during
idle/walk/run; active actions retain the existing hand attachment.

[Collection overview](collection.png) · [Projectile review](projectiles.png) ·
[Exact accepted prompts, source paths and export method](PROMPTS.md).
Captures and source masters are ignored local review/authoring artifacts; runtime
exports, tools and these notes are versioned.

| Family | Weapon | Effect |
| --- | --- | --- |
| Grimoire | Testament of the First Star | Astral Echo: next hit +32 damage, 6s recharge |
| Grimoire | The Crimson Concord | Kills restore 16 HP / 12 Spirit |
| Grimoire | Winter’s Unwritten Law | Ranged hits +14% damage |
| Grimoire | Canticle of the Hollow Sun | +32% damage against enemies at/below 30% HP |
| Sword | Lion of the Last Sunrise | Every hit +8 damage |
| Sword | Veyreign’s Red Verdict | +45% damage against enemies at/below 25% HP |
| Sword | Oath of the Starless King | Next hit +38 damage, 7s recharge |
| Sword | Rimefall | Kills restore 12 HP / 14 Spirit |
| Staff | Spire of the Astral Court | Next hit +34 damage, 6s recharge |
| Staff | Briarheart Sovereign | Kills restore 18 HP / 10 Spirit |
| Staff | Censer of the Dying Sun | +34% damage against enemies at/below 30% HP |
| Staff | Worldroot Sceptre | At/below 35% HP, take 16% less damage |
| Mace | Gravebell of the Fallen Court | +40% damage against enemies at/below 25% HP |
| Mace | Sunward Coronation | Take 8% less hit damage; hits restore 3 stamina |
| Mace | Heart of the World-Anvil | Every hit +9 damage |
| Mace | Judgement of the Storm | Next hit +40 damage, 8s recharge |
| Bow | Moonstag’s Vigil | Ranged hits +18% damage |
| Bow | Ashen Phoenix | Kills restore 14 HP / 10 Spirit |
| Bow | The Last Horizon | +38% damage against enemies at/below 30% HP |
| Bow | Eclipse Seraph | Next hit +30 damage, 5s recharge |

Spirit restoration follows awakening; health restoration follows existing class
healing rules. These effects are the existing weapon-slot Legendary passives,
not granted class skills, fabricated elemental statuses or a parallel proc engine.
Ice, sun, blood and storm describe the authored materials/palette; they do not
claim new freeze, burn, bleed or lightning mechanics. Staves use existing Warding
staff melee; books use Spirit focus projectiles; maces use Blunt proficiency and
the existing mace moves/rig. No player stance, body sheet, gait, timing or hitbox
has been changed. All classes can wield every weapon.

## Acquisition and progression

- Found only at Legendary quality, requiring both wearer and elite/boss encounter
  Combat Level 50+. Summoned/suppressed enemies and ordinary/underlevel encounters
  cannot supply these IDs. No shop, recipe or quest reward was added.
- New weapons join the existing qualifying 60% endgame selection pool. At
  Legendary quality this is now 16 armour pieces plus 20 weapons; the remaining
  40% retains the original unrestricted gear pool. Mythical/Primordial authored
  pools remain unchanged. Existing geographic dungeon rarity policy, final-boss
  guarantees, overall drop odds and three-call RNG order remain authoritative.
  These weapons do not bypass the current level50 endgame gate in low-level
  Veyreign/Malakar encounters, even when those locations roll Legendary quality.
- Owned copies retain individual identity, upgrades and the current lifelong
  smith ascension system. A found Legendary may later become Mythical/Primordial
  through the normal smith transactions; those higher grades are not direct
  drops of these IDs. Passive, art and identity persist through ascension.
- Existing nearest-owner, launch delay, full-bag ground recovery, copy-specific
  equipment, save/load and UI contracts remain in use. No extra drop roll.

## Native visual review

| Family | Both bodies / four facings | East/west / four held gait frames | Live game |
| --- | --- | --- | --- |
| Grimoires | [Directions](grimoires-directions.png) | [Gait](grimoires-gait.png) | [Capture](in-game-grimoires.png) |
| Swords | [Directions](swords-directions.png) | [Gait](swords-gait.png) | [Capture](in-game-swords.png) |
| Staves | [Directions](staves-directions.png) | [Gait](staves-gait.png) | [Capture](in-game-staves.png) |
| Maces | [Directions](maces-directions.png) | [Gait](maces-gait.png) | [Capture](in-game-maces.png) |
| Bows | [Directions](bows-directions.png) | [Gait](bows-gait.png) | [Capture](in-game-bows.png) |

All models are 96×128 hard-alpha registrations with measured handle pivots and
family-appropriate existing world scales. Icons are separate 32×32 exports;
projectiles are four 32×32 cells. Each drawing uses at most 24 opaque colours.
Generated masters are checked for clipping before packing, and all runtime
exports have transparent inset borders. No originals were replaced.

## Verification and limits

- `verify-legendary-weapons.mjs`: 20 deterministic elite/boss selections; 100
  other-grade rejections; level/source restrictions; 320 real light/heavy attacks
  across eight classes/four owners; actual damage, exact-copy save/load; all20
  passive effects and their thresholds/cooldowns; 20 real smith promotions;
  32 latched grimoire shots; seeded real death, exactly-once pickup and full-bag
  recovery at Legendary quality.
- `verify-legendary-weapons-art.mjs`: 8,960 production renderer samples, both
  bodies, four heads, four facings, fourteen pose samples including four actual
  held gait keys; 40 mirrored pivot checks; unique models/projectile masks;
  binary alpha, inset borders, colour budget, no actor/transform mutation.
- `verify-legendary-weapons-browser.cjs`: real normal game startup, 20 acquired/
  equipped weapons, 520 production renders using the actual model, 20 decoded
  UI icons and five live-game family captures; no missing resources/page errors.
- Existing boss-armory model/browser contracts cover all19 distinct focus
  projectiles (152 direction/weight cases), existing boss weapon provenance and
  Petalknight casting. Endgame equipment, itemization, 24-group loot overhaul,
  enemy delivery/geographic loot policy, lifelong ascension, melee rig, stance
  and 58-item Legendary locomotion regressions pass. Engineering11/11, build
  and 168-item wearable coverage pass.
- Structural art audit adds44 occupied/inset cells with no new errors and keeps
  all eight approved player-sheet hashes. It retains the same24 pre-existing
  metadata/coverage errors. This is not a claim that the aggregate audit passes.

Effects use existing balance budgets with endgame weapon statistics. Human
grind-duration, late-tower build balance, physical-device feel and live network
transport have not been playtested by these contracts.
