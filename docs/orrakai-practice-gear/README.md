# Orrakai beginning-game practice stock

Aren the Smith and Oren Fenwick now offer dedicated Common practice shops through
their existing NPC dialogue. No quest, class or level requirement was added.
These are purchases, not free starting grants; a fresh character still needs coins.
Existing smith upgrades, restorative brewing, quests and generic market remain.

| Merchant | Item | Family / training | Gold |
| --- | --- | --- | --- |
| Aren the Smith | Worn Iron Shortsword | Sword / Blade | 6 |
| Aren the Smith | Dull Utility Dagger | Dagger / Blade | 4 |
| Aren the Smith | Iron Practice Mace | Mace / Blunt | 6 |
| Aren the Smith | Worn Iron Mallet | Hammer / Blunt | 8 |
| Aren the Smith | Plain Ash Spear | Spear / Warding | 8 |
| Aren the Smith | Farmhand Scythe | Scythe / Scythe | 8 |
| Aren the Smith | Rough Yew Bow | Bow / Archery | 8 |
| Oren Fenwick | Bare Wood Staff | Staff / Warding | 4 |
| Oren Fenwick | Threadbare Primer | Grimoire / Spirit | 8 |
| Oren Fenwick | Smokeglass Focus | Focus / Spirit | 6 |
| Oren Fenwick | Inert Stone Conduit | Conduit / Spirit | 6 |
| Oren Fenwick | Scroll: Summon Wolf | Learn Summon Wolf / Summoning | 12 |

Eleven new weapon IDs cover all ten weapon families currently represented in the
item catalogue; a book and a lens share the existing Spirit Focus family. No
class starter IDs are reused. Unarmed needs no purchase; shields remain off-hand
equipment. Unreleased axe/crossbow item families were not introduced by this shop
pass. Every new base is weaker at level1 than every pre-existing weapon in its
family. Values are2–3 base damage, zero bonus Power,1× primary scaling and no
unique passive, class feature or set. Items have plain wood, leather and dull iron
models, matching32px icons and two modest focus projectile silhouettes.

Purchased copies explicitly carry white Common rarity, itemLevel1 and upgrade
tier1. The existing smith can upgrade and ascend the same owned copy. They are
excluded from random drops, so the202-base unrestricted pool and endgame pool
remain intact. Wolf Scroll price/definition and learning/duplicate rules come
from the existing skill-scroll owner. An unfunded/foreign-stock/full-bag attempt
cannot debit gold or create an item. Ordinary sale, save and co-op ownership rules
remain authoritative. Online shop delegation already carries the NPC reference;
the local dialogue shop path now preserves it too when selecting vendor stock.

## Evidence

[World models / both bodies / four facings](collection.png),
[Aren's shop](blacksmith-shop.png), [Oren's shop](alchemist-shop.png),
[mobile alchemist](mobile-alchemist.png), [exact prompts / saved source paths](PROMPTS.md).
Captures and masters are ignored local review artifacts. Runtime PNG/JSON exports,
data, tests and these notes are versioned. No original art was replaced.

- `verify-orrakai-practice-gear.mjs`:352 level1 purchase/equip/save cases across
  eight classes/four owners; all11 new bases are weaker than existing family
  equipment;22 actual light/heavy hits and real victory XP train the declared
  proficiency. Real smith upgrades on all11 copies. Four owners buy/read/assign/
  cast Wolf Summon at level1, with duplicate purchase prevention. Exact Common
  grade/tier/cost, wrong-vendor rejection, insufficient-gold and full-bag protection.
- `verify-orrakai-practice-browser.cjs`: actual capital startup, physical NPC
  interaction and keyboard dialogue selection open both correct stocks; twelve
  real UI purchases at level1, filters, white grade,11 decoded icons,88 production
  model renders across both bodies/four facings, and390px mobile layout. No missing
  resources/page errors. An initial fixture run did not open the shop when confirming
  immediately after choices appeared; adding160ms of settling time yielded passing
  real NPC interactions, following the existing workshop fixture's settling step.
  The initial failure's exact cause was not isolated. No input runtime change.
- Actual training checks reproduced spear light/heavy credit falling back to Blade
  despite Warding item proficiency. Combat now resolves the existing moveset alias
  and uses Warding for spear heavy fallback. No hitbox, timing, damage formula,
  prior XP or save migration changed. Staff information incorrectly said Blades;
  staff/spear purpose text now agrees with the verified Warding progression.
- Existing gear itemization,24-group loot overhaul,265-base smith ascension,
  13-group workshop services, boss armory and92-weapon stance checks pass.
  Native focus coverage now21 items/6,048 resting samples/672 active samples;
  browser21/1,512 resting samples/168 readiness timelines. All21 distinct focus
  projectiles pass168 direction/weight browser cases. Existing four-owner sale/
  deconstruction, full-bag market UI, six grade colours and mobile forge checks pass.
  Melee rig23,136 samples and Legendary weapon8,960 render samples pass.
- Engineering11/11, build,168 wearable contracts pass. Structural art inspection
  adds24 occupied/inset cells, retains all eight approved player hashes and the
  same24 pre-existing aggregate errors. It is not an aggregate passing audit.

Human pricing/economy pacing, physical-device controls and live online transport
were not tested by these contracts. Class starters and prior character progress
remain unchanged.
