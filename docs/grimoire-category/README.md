# Foci and Grimoires

Foci is the traditional plural of Focus. The game now separates these weapon
families while preserving every existing item ID, sprite and projectile motif.

| Category | Weapon type | Basic/heavy resource | Weapon proficiency | Mastery tree |
| --- | --- | --- | --- | --- |
| Foci | `spiritFocus` | Stamina | Existing Spirit line | Foci Mastery |
| Grimoires | `grimoire` | Mana, stored as the existing `spirit` resource | Grimoires (`grimoire`) | Grimoire Mastery |

This uses the existing mana pool; it does not create another resource or rename
the saved Spirit attribute. Grimoire item descriptions show Mana (Spirit).
Both categories restore **6 Mana per successful enemy target hit**, through the
same authoritative weapon damage path as other weapons. Restoration respects
maximum mana, applies to light/heavy attacks, and grants nothing on a miss.
Grimoires require sufficient mana before launching, even with full stamina;
Foci require stamina but can attack with an empty mana pool. No cross-bar fallback.

## Items, mastery and compatibility

Nine existing books become Grimoires: Threadbare Primer, Rosebound Codex,
Veyreign Mortuary Grimoire, Ashen Scripture, Litany of the Last Dawn, Testament
of the First Star, The Crimson Concord, Winter's Unwritten Law and Canticle of
the Hollow Sun. The twelve lens/prism/reliquary/conductor/gauntlet Foci remain
Foci. Book shot identities, native timings, rare/legendary effects, current gear
rarity and ascension progress, recipes, merchant stock and loot eligibility remain.

The new Grimoires combat skill trains from qualifying weapon encounter XP and
supplies weapon scaling, move unlocks, critical handling and tree entitlement.
It is class-open. New characters start untrained. Existing saves containing one
of the former book weapons preserve their previous Spirit proficiency once in
the new Grimoire line without deleting or repeatedly copying Spirit XP. Higher
existing Grimoire progress is retained. Legacy equipped-book loadout references
switch from Spirit to Grimoires; saved focus purchases and progression remain.

Grimoire Mastery unlocks by discovering/owning a grimoire. It has eight core
nodes, including two exclusive branch choices, plus four optional foundation
nodes: twelve available nodes, ten learnable in one route. First Inscription,
Long Verses/Economical Script, Piercing Marginalia/Weight of Words and Living
Testament develop damage, mana economy, range, projectile speed, piercing and
stagger. Twelve book emblems use the existing SVG skill-icon system. Each node
explains its actual bonuses and mana behavior.

Grimoire shot bonuses have their own keys; Focus shot investments cannot reduce
book mana costs or improve book shots, and book shot investments do not improve
Foci. Ordinary global stat bonuses remain global like other weapon trees.
Grimoire costs permit hundredths so a small mana-reduction purchase has an
immediate effect; heavy attacks retain their existing multiplier and rounding.

Shared rendering, attack handling, holstering, class equipment bonuses, smithing
and deconstruction recognize both categories. Grimoire projectiles retain their
committed category/skill and individual art when equipment changes during windup.
No class starter is changed.

## Verification

- `verify-grimoire-category.mjs`:168 real light/heavy hit cases across21 weapons
  and four owners, exact resource payments/+6 hit restoration, zero stamina/mana
  distinction, misses, caps, insufficient-resource rejection, correct weapon XP,
  independent tree unlock/purchases, branch choices, scoped bonuses, identity,
  saves and one-time legacy migration.
- `verify-grimoire-browser.cjs`: Chromium/WebKit at1440×1000 and390×844; real
  skills menu, separate tree selectors, Grimoire purchase, all twelve loaded
  emblems, mana/stamina inspection labels and no missing resources/page errors.
  Mobile WebKit tree capture visually reviewed.
- Boss armory model/browser:64 class/item attacks, all21 shot identities, four
  owners,168 projectile render cases and preserved authored grips. Legendary
  weapons model/browser:320 attacks, existing passives,520 production renders,
  five live-game families and all book identities. Practice gear model/browser:
  352 purchases/equips,22 attacks,88 renders, first-level shop/save/upgrade paths.
- Grimoire category, Vampire gameplay, gear ascension, Lightbringer charged
  attacks and engineering13/13 pass. Publication build passes.

Three older aggregate suites remain failing on unrelated existing contracts:
`verify-progression-overhaul.mjs` rejects the unprepared Blood Communion fixture;
`verify-combat-overhaul.mjs` still assumes six channels when seven exist;
`verify-skill-art.mjs` requires missing signature profiles for eight Vampire
abilities. The first two failures reproduce unchanged in a clean source archive
of pre-change revision `1a19edf`; the exact missing-profile list is identical
before/after. Their relevant weapon-payment cases were updated for the intentional
Grimoire resource split; unrelated assertions were not weakened or marked fixed.

Browser input is simulated. No physical phone/controller or live online transport
test is claimed. Captures and baseline archive are ignored local review artifacts.
