# Gravecaller sustain balance

## What was making healing excessive

Several class nodes granted global lifesteal, which combined with Scythe training, bloodline bonuses and equipment. Necrotic Bolt also applied an independent 16% heal. Death Harvest restored health on every kill, Deathknight healed on nearly every hit, and Acolyte summons had a separate 12% support heal.

Some heals used theoretical damage rather than health actually removed, with minimum-one rounding on each small hit. Legendary healing ran before mitigation. The generic spell-healing amplifier could then multiply an immediate drain or ritual a second time. Crowds, curses and stacked summons magnified these paths.

## New intentional sources

The following lifesteal percentages are before applicable perks, bloodline and gear bonuses. Only direct/primary attacks heal; secondary curses, burns, cleaves, splash and detonation procs do not.

| Source | Lifesteal / healing |
| --- | --- |
| Necrotic Bolt: original, Cursed, Acolyte | 8% of actual damage |
| Necrotic Bolt: Deathknight melee form | 10% |
| Every Gravecaller-owned summon: primary attacks | 4% returned to its owner |
| Acolyte summon forms | 8% returned to owner; 8% support healing for nearby living allies |
| Blood Lance: original / Deathknight | 8% / 10% |
| Soul Siphon: original / Deathknight | 12% / 6% |
| Murmuring Host: Deathknight close aura | 4% |
| Soul Siphon: Acolyte | One healing rite: 3% of each recipient's max health before mastery/support bonuses, increased by Soul Fragments, capped at 8%; no healing from field/burn damage |

Other Gravecaller spells provide their damage/control/protection rather than inheriting blanket healing. Acolyte Murmuring Host keeps its 25% shield and piercing, with no inherent lifesteal. Deathknight Funeral Urn and Death Echo retain damage and weakening without their old drain.

Death Harvest now restores Spirit only. Death's Discipline is the single class-tree lifesteal improvement: +2 percentage points on skills and summon attacks that already steal life. Blood Lance, Soul Siphon, Grave Repair and the capstone no longer grant global lifesteal. Their other original bonuses remain; Grave Repair retains its Spirit reserve and extra base Soul Siphon use. Node IDs, prerequisites, purchases, skills and morph ownership are preserved.

Scythe lifesteal continues to support weapon attacks. Vampire perks, bloodline modifiers and appropriate gear improve eligible drain attacks instead of turning every Gravecaller spell into a heal. Vampire weapon attacks retain their bloodline lifesteal even before buying extra leech perks. Other classes retain their own existing sustain behaviour. Explicit legendary kill restoration remains available within the Gravecaller healing budget.

## Shared limits and damage correctness

- Attack-based Gravecaller healing shares a recipient budget that replenishes at 3% maximum health per second, holding up to 6% for bursts.
- All summons additionally share a recipient budget replenishing at 1% maximum health per second, holding up to 2%. It applies across abilities, Commander groups and cooperative owners, rather than once per pet or enemy.
- Healing is based on health actually removed after mitigation, never overkill. Fractional healing has no minimum-one bonus. Missing health, life state and available budget bound every application.
- The Acolyte healing rite is a separate deliberate cooldown-based support effect, capped at 8%, and consumes Soul Fragments. Its field still slows enemies and applies Soul Burn; it does not repeatedly heal.
- Immediate class healing is not amplified again by the generic spell-healing pass. Mastery/Expertise/support perks apply inside the ritual cap; attack-based lifesteal already benefits from increased actual damage.
- Damage scaling, beam shield/range/timing, Spirit costs, summon roles/art/formation, out-of-combat recovery and hotbar-only mastery remain intact.

## Measured comparison

This is a high-level comparison fixture, not the user's saved character: Level 65 or 100, relevant disciplines at 35% of Level, mastery 20, 30 spent points in the Commander/support and Scythe paths, Vampire bloodline and Lichbone Scythe.

| Scenario | Before | After |
| --- | --- | --- |
| Level 65 Acolyte Host, 20 targets, 3 seconds | Healed 114.1 HP, reaching full health | Healed 0; still dealt exactly 12,320 damage and kept 25% shielding |
| Level 100 Acolyte Host, same scenario | Healed 127.4 HP, reaching full health | Healed 0; damage remained exactly 14,880 |
| Level 65 Bolt hitting an enemy with 1 HP remaining | Healed 114.1 HP, reaching full health | Healed 0.24 HP with these bonuses; target still lost exactly 1 HP |
| Level 100 Bolt hitting an enemy with 1 HP remaining | Healed 127.4 HP, reaching full health | Healed 0.24 HP with these bonuses |

See `before.json` and `after.json`. Original measurements use an isolated copy of the source with the original files restored from `backups/gravecaller-sustain-2026-10-11`.

## Verification

`tools/verify-gravecaller-sustain.mjs` covers 12 groups: every Bolt morph, all eight permanent summon forms, actual damage, shared healing/refill, mixed Commander/Lich groups, invested beam builds, Death Harvest, Vampire training and weapon hits, deliberate drain skills, Soul Fragments/support contribution, save compatibility and other-class legendary behaviour. `tools/verify-gravecaller-sustain.cjs` independently checks live browser combat and the real Abilities information panels. No browser errors or missing assets occurred.

Regression checks passed for Lich/Bound Servant roles and effects, summon recovery, hotbar mastery, Expertise, all 216 morphs/648 casts, progression, Acolyte Host, Acolyte Soul Siphon, all melee weapon combos and the combat overhaul. Existing Specter tests now assert 8% support healing and 10% owner healing with the fixture's +2-point class perk, replacing the intentional old 12% value.

Reload the game to load the new balance. Existing characters need no reset or respec; their purchased nodes automatically use the updated definitions. Runtime healing budgets remain outside saved profiles.
