# Optional skill morphs — updated October 26, 2026

This replaces permanent subclasses with independent skill choices. Original
ability definitions are preserved in `src/data.js` and `src/combatExpansionData.js`;
the previous source state is backed up in `backups/pre-skill-morphs-20261007.zip`.
No scripts need to be supplied to recover the original class skills.

## Player flow

1. Start with the original class skills and learn additional skills in Trees.
2. Open Skills → Abilities and select a learned skill.
3. Choose Original or an unlocked morph in its detail pane, then assign the
   same skill to the hotbar.
4. Earning XP with the skill on the hotbar increases its shared mastery.
   Mastery 5 and 10 unlock its two variant forms. Unlocks announce themselves without changing the
   player's selected form. Mouse and controller both support selection.

All 73 class skills from the six participating classes retain their base forms
and offer two optional morphs, for 146 variants. Different forms can coexist
in one loadout. Eldritch, Classless, shared/weapon/bloodline skills and Wolf/Demon
pacts retain their original behavior; they have no new morphs from the previous
12-family inventory. The family names label skill forms and do not designate a
player subclass. No class-wide variant stat or passive package is applied.

Forms keep the skill's canonical ID, ownership, mastery, tree position and
hotbar assignment. Original tree bonuses apply normally; relevant old bonuses
are translated locally for a morphed cast. Returning to Original is free and
reversible. Switching is rejected while charging/channeling, dead, or while
the selected skill is cooling down or recovering use charges, preventing a
switch from bypassing recovery. Changing one skill clears its transient morph
entities rather than clearing another skill's ongoing effects.

## Saves and migration

Schema 18 with morph version 3 stores `abilityMorphs` by canonical skill ID. Old permanent subclass
choices are removed and those characters start with Original forms, while
learned skills, mastery, tree spending and hotbar slots are retained. Valid
new morph selections survive save/load; unknown, wrong-class and below-mastery
selections cannot activate. A one-gold reset refunds tree points and preserves
mastery and morph preferences, including preferences for temporarily revoked
tree skills. Such forms activate only after the skill is learned again.

Experienced simulated adventurers use finite four-skill mixed loadouts, with
per-skill mastery and optional forms through the same combat coordinator.

## Combat and presentation

Each projectile, channel, field, spirit, mark and damage-over-time effect uses
its originating skill form. Affliction counters are separate per enemy and
form family so a different form does not turn Chill into Pressure or another family’s afflictions.
Kill resources and injury resources are tied to equipped relevant morphs;
retaliation comes from a cast ward rather than a permanent identity. Original
summons can remain alongside a morphed spirit rite. Existing pixel sprites,
human proportions and walking animations are preserved. Skill-specific form
badges and geometric effects use the existing authored motifs.

The combat review arena now changes the selected hotbar skill's morph without
resetting its class or the encounter. Its Mastery 30 button provides isolated
preview access; it does not affect player profiles.

## Verification

- 146 optional forms, 438 real casts against normal/elite/boss enemies.
- Every mastery threshold, return to Original, canonical catalogue immutability,
  independent mixed loadouts, status separation, resource costs, channels,
  boss control limits, save migration and one-gold point resets.
- Actual Abilities UI using mouse, refreshed detail controls and controller;
  1440×900, 1280×720 and 800×700 layouts; hotbar assignment and full-game startup.
- Existing combat/progression checks cover all 87 original abilities, Wolf and
  Demon, progression and original channels. Tree, portal and walking regressions
  also remain part of the verification suite.

Detailed results and screenshots live beside this document. The arena restriction
for advanced/morphed techniques is unchanged; extended campaign balance remains
a playtesting task.
