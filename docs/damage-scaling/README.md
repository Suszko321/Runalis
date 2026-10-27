# Damage scaling correction

## Diagnosis

The common offensive calculation used a shallow logarithmic curve. At Level 33, with Spirit, Summoning, Scythes, Focus and Dexterity at 12, it provided only 1.79 times the starting offensive power. Ordinary enemy health rises by 14% of its base per geographic level, before its existing health/rank modifiers. Player resources were healthy because they have separate calculations.

Acolyte Murmuring Host was particularly affected: its small, repeated damage ticks used this common curve. Its piercing and tick timing were working correctly. No additional multiplier was added to its morph coefficient.

There were also missing gear contributions: armour Spirit and flat set Spirit were omitted from spell power, and elemental set damage bonuses were not applied to actual damage. Bound Servants used a different damage progression from the greater Lich. Persistent summons retained the damage they had when first created.

## Changes

- Offensive power now uses additive compressed-level contributions: `1 + 0.14 × levelStat(Level) + 0.06 × levelStat(proficiency) + 0.02 × levelStat(attribute)`. The existing logarithmic `levelStat` remains finite, uncapped and monotonic. At the representative Level 33 fixture, this gives 4.38 times starting offensive power.
- Spell and summon power include armour Spirit and flat set Spirit. Actual hits receive their relevant necrotic, nature, holy and boss set bonuses. Proc damage starts from the pre-set damage to avoid applying the same bonus twice.
- Persistent summons use the shared offensive progression. Their damage refreshes when progression or gear changes and after loading a save. Existing health, identity, morph, formation, gait and cooldowns are preserved.
- Defensive/resource progression keeps its previous curve. Summon health keeps its previous progression curve. Spirit costs, beam timing/range, shield strength, skill mastery rules and geographic enemy stats are unchanged.

## Measured comparison

This is a representative fixture, not a copy of the user's saved character: Level 33 Gravecaller, Grave Scythe, relevant proficiencies at 12, Murmuring Host mastery 20, Acolyte morph, no Expertise selection. Actual combat updates drive the beam and its damage ticks. Targets are ordinary Hollowlings at their fixed geographic levels.

| Target level | Health | Original tick | Corrected tick | Original kill time | Corrected kill time |
| --- | ---: | ---: | ---: | --- | ---: |
| 5 | 82 | 9 | 25 | 3.6 s | 1.2 s |
| 15 | 156 | 9 | 25 | 6.8 s | 2.4 s |
| 33 | 288 | 9 | 25 | Survived the 12 s channel with 18 HP | 4.4 s |

Original measurements run against an isolated source copy using the three original combat files saved in `backups/damage-scaling-2026-10-11`. Results are in `host-before.json`; corrected combat results are in `gameplay-verification.json`. `before.json` and `after.json` compare weapon, base-spell and summon formulas across Levels 1–100.

The browser independently confirmed 25 damage per tick and 2.4 seconds to defeat 20 Level 15 enemies in the beam's path. Its ward still reduces a 100-damage hit to 75, base activation/upkeep remain 2/9 Spirit, and combat grants no mastery XP. No browser errors or missing resources occurred. See `browser-verification.json`.

## Validation

Dedicated checks: `tools/verify-damage-scaling.mjs` (seven groups) and `tools/verify-damage-scaling.cjs` (browser). These cover actual beam damage, piercing, costs/shield, gear, summon save refresh, all eight Bound Servant/Lich forms, finite growth and unchanged geographic enemies.

Regression checks passed for progression, Expertise, all 216 morphs and their 648 casts, hotbar mastery, Acolyte Host, Acolyte Soul Siphon, Bound Servants, Lich summons, summon recovery/movement/positioning, all 50 melee weapon combos, loot, enemy density and the combat overhaul.

Reload the game to load the changed modules. Existing saved characters require no reset; persistent summon damage refreshes during its next update.
