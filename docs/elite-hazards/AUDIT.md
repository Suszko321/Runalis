# Elite combat audit — 11 October 2026

The project runs a Canvas 2D ES-module combat engine, not Babylon.js. The existing `eliteEncounterSystem`, geographic encounter assignment, enemy presentation/telegraph geometry, damage pipeline, world collision and pixel renderers were retained.

## Live roster before this change

| Modifier | Previous mechanic | Weakness |
|---|---|---|
| Waller | Static south-facing U; 96-radius, 1.25-second warning, 2.4-second lifetime | Whole side open; no pursuit prediction, execution or terrain route validation; fast movement could tunnel through 12-pixel barriers |
| Freezer | One 76-radius impact after 1.2 seconds; brief slow | No immobilization, progressive buildup or punishment for being frozen |
| Artillery | One 70-radius impact after 1.4 seconds | Walking escapes every attack; no acquisition, follow-up or advanced survival check |
| Shocker | One 62-radius impact after 1.05 seconds | Another interchangeable small ground circle |
| Molten | Stationary 62-radius pool, weak repeated hits; small delayed corpse blast | Little pursuit pressure or advanced area denial |
| Vortex | One harmless 60-unit pull | Displacement has no announced consequence |
| Bulwark | All guards synchronized to world clock; frontal damage reduced to 35% | No retaliation for repeatedly attacking the guarded side |
| Regenerator | Any hit, damage over time or nearby companion cancels an 8% heal | Negligible support pressure and trivial automatic interruption |

The nearby-hazard exclusion prevented meaningful combinations. Assignment capped all enemies at two modifiers and forbade Freeze + Waller. Bosses already have their own specials and no modern elite modifiers.

## Real defenses

- Every class, Classless and Eldritch has the same baseline stamina dodge: 22 base stamina, 0.42-second cooldown, 0.01-second invulnerability delay and 0.18-second invulnerability window. Attribute/gear adjustments remain intact.
- Block starts on every character's hotbar and can be removed. It is omnidirectional, normally reduces damage by 62%, consumes stamina and can break; a broken guard admits 75% damage. It cannot be the only universal answer.
- Dawnblade has a short next-hit damage-reduction parry, not universal zero-damage attack cancellation.
- Class wards, Bubble Ward, Prism Guard, Halo Aegis, subclass mitigation, racial mitigation and legendary defenses exist. Several were missing from the elite damage path; parity was repaired before increasing damage.
- Ghostwalk, Dawnstep, vaults, leaps and other movement skills use existing swept collision. They can pass through a legitimate gap, not phase through a solid conjured wall. No new universal teleport or parry was invented.
- At the 11 October audit, roots, heavy-hit stagger, silence and freeze could interrupt modifier windups. The 12 October follow-up removes all such interruption of elite modifiers: only caster death cancels committed effects. Existing healing morph cleanses still remove elite frost from allies.
- Resistance/immunity fields are supported when present, but no general cold-resistance equipment or immunity build was added or advertised.
- Hazard telegraphs now count as combat for rest/resource recovery, including untargeted party members. They do not alter actual cooldowns or stamina costs.

## Legacy labels

Ten older fallback labels remain: Armoured, Swift, Blink, Vampiric, Burning, Charger, Frozen, Poisoned, Summoner and Fleeing/Relic-Bearer. Normal current world/dungeon/tower assignment replaces these with the eight live modifiers. Some authored boss adds or old saves can retain legacy labels. Blink and Relic-Bearer have older movement/reward behavior; most others are legacy stat/color/archetype tags, not another current hazard roster. They were preserved and are not claimed as reworked. Existing boss identities, charge systems and summon behavior were retained.

## Progression and safety decisions

Geographic level and existing elite/rare/champion rank determine mechanics. Level 7 and below and quest-critical actors retain teaching patterns. Level 20+ rare/champion enemies gain advanced pressure. Level 30+ optional champions can receive a third compatible modifier and execution artillery. Spawn probabilities, enemy HP, base damage, XP and loot formulas are unchanged. Boss specials remain separate.

Walls retain a legal gap and validate a radius-aware route against actual terrain for affected actors before creation and again before rising. There are no destructible walls or new through-wall teleports. Strong patterns require recognizing the gap, killing the caster or using real defenses. Local pressure coordination is conservative across different casters, while one caster can sequence its own compatible hazards.
