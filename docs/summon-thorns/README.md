# Petalknight companion thorn retaliation

The Petalknight Elder Thornbeast (Rose Siegebeast) already had thorn retaliation, but only legacy enemy attacks invoked it. Advanced enemy melee attacks, spells and elite hazards now use the same retaliation rule. Petalknight Thornlings also receive this consistency fix. Original, Fae and Lifebloom companions retain their existing identities.

Thorns return 35% of actual health lost, adjusted by class Expertise, capped at 65% of the companion's attack damage before ordinary enemy damage mitigation. Retaliation has a shared 0.75-second cooldown, requires a hostile living attacker within 125 pixels and clear line of sight, and uses the existing rose-and-thorn impact visual. An elite hazard's actual caster takes the damage, rather than its temporary ground-impact object. Thorns do not interrupt elite effects.

Summon damage remains attributed to its actual owner, including co-op and restored saves. Damage does not grant skill mastery; mastery still comes exclusively from earning XP with the skill on the hotbar. Advanced incoming hits now correctly update the companion's last-hit time and hit flash.

## Verification

`tools/verify-summon-thorns.mjs` passed six simulation groups using the production combat paths: advanced incoming damage, both legacy and advanced basic attacks, cooldown and overkill limits, elite caster attribution, co-op/restored companion ownership, and wall/hostile/morph exclusions. The visual effect's origin and destination were checked; no new artwork was introduced.

Related production simulations also passed: enemy combat (16 groups), elite hazards (15), elite defenses (10), summon recovery (6), Petal Storm (8), and hotbar-only mastery (11).
