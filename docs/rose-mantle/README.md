# Petalknight Living Briar — Rose Mantle

Tap or hold to charge Living Briar. On release, it gives the player and owned living summons within its casting radius an immediate heal, regeneration, damage reduction and modest thorn reflection for six seconds. Each affected summon keeps its own mantle while moving outside the original radius. Summons behind terrain, dead/expired/dismissed companions and other players are excluded.

| Effect before progression bonuses | Tap | Fully charged |
| --- | --- | --- |
| Immediate heal | 8% of recipient maximum Health | 12% |
| Regeneration | 1.5% of maximum Health/s | 2.25%/s |
| Damage reduction | 18% | 27% |
| Thorn return | 8% of damage taken | 12% |
| Cast radius | 240 px | 276 px |
| Base Spirit cost | 20 | 26 |

Recovery is 16 seconds. Charging uses the existing Focus handling and release controls, about 0.86 seconds before Focus. Dodge cancels charge. Healing benefits from Level, Warding, Defence, mastery, support perks and Expertise, capped at an 18% immediate heal and 3% maximum Health/s. Ordinary healing investment is bounded before charge so holding the skill remains useful at high levels. Protection is capped at 35%.

Thorns require a nearby hostile living attacker within 125 px and clear line of sight. Each recipient's return is capped at 1.5% of its maximum Health per response and has a 0.75-second recovery. Existing stronger Petalknight summon thorns and player Roseguard take priority instead of adding another reflection hit. Elite hazard retaliation hits the real caster and does not interrupt it. Summon protection works through both legacy and advanced enemy damage paths.

The visual uses separate back and front layers: barbed green/red ribbons, orbiting crimson pixel roses and rising petals. Player and summons carry the effect as they move. Healing has no repeating text spam or large flashes. The charge preview grows from a rose bud. The abilities panel lists current healing/protection values and charge benefits.

The support spell does not directly attack enemies or create lifesteal. It does not revive dead actors, overheal or stack with recasts of itself. It stacks with existing distinct healing systems, including summon healing and rest regeneration. Death, morph removal, world change, dismissal and expiration remove its effects. Timed support references stay out of saves, and using/healing/reflecting does not grant mastery XP.

## Verification

Nine focused simulation groups passed: real charging and exact six-second healing, recipient selection/movement, advanced damage and retaliation, legacy/advanced basic attacks, existing thorn priority, elite caster attribution and dodge protection, heal/cleanup safety, nonstacking recasts/save data, and Expertise scaling.

Actual browser verification cast the full charge on the player and four real summons, inspected the moving visual, checked eight animation/layer samples for camera drift, and confirmed expiration with no errors or missing assets. Five-recipient effect rendering measured 0 ms median and 3 ms p95 in the browser's millisecond timing; this measures the effect renderer only.

Backups: `backups/rose-mantle-2026-10-13/`. Original, Fae and Lifebloom Living Briar are preserved.
