# Combat architecture audit

## Baseline and class scope

The supplied brief was checked against the existing local source before integrating the expansion. The canonical registry has Oathkeeper, Fellhunter, Gravecaller, Thornbinder, Waverider, Lightbringer, hidden Eldritch, and intentionally ability-free Classless. Templar, Mercenary, Necromancer, and Hydromancer are compatibility aliases, not extra classes. The initial ability catalogue had 56 entries: 50 class actives plus six shared/bloodline techniques. The final catalogue has 85.

The checkout's Git metadata did not expose a usable repository. A copy of the original source was preserved at `C:/Users/austi/.codex/backups/runalis-combat-20261003/src` before the integration edits. No commit, PR, deployment, or player-save conversion was performed on the user's live profiles.

## Existing authority retained

| System | Existing authority | Integration |
|---|---|---|
| Ownership and assignment | `abilityLoadoutSystem.js` | Four explicit slots; learned and passive pools stay separate. |
| Class restrictions and legacy IDs | `classData.js`, `data.js`, player migration | Canonical classes and aliases retained; new definitions are class-restricted. |
| Keyboard/controller/co-op | `main.js`, `inputController.js`, `couchCoop.js` | Fourth press/hold/release forwarded through the same abstraction; menu bumpers preserved. |
| Weapon combat and defensive actions | `combatMoves.js`, `combatActions.js` | Existing combos, hitboxes, stagger, knockback, hold-heavy and defense retained. |
| Hold-charge versus use charges | `chargeSystem.js`, `abilityChargeSystem.js` | Remain separate. Pressure Spear opts into hold charging; new channels do not masquerade as either charge system. |
| Discipline XP and enemy death | `combatProgression.js` | Ability-source contribution added; mastery distributes at the same death authority alongside existing discipline awards. |
| Old specialized skills/projectiles/traps | `combat.js` | Specialized handlers remain; explicit source tags added to direct and delayed paths. |
| Summon rules and targeting | Existing summon helpers inside combat | Persistent rules retained; temporary Death Echo reuses real summon authority with a bounded lifetime. |
| Class passives/resources | `classPassives.js` and class-specific combat handlers | Conviction/Flow/Lumens and existing passive hooks retained. |
| Skill acquisition and doctrine choices | `skillTreeSystem.js` | New branches added without removing old choices, perks, or passives. |
| Terrain and aiming | `world.js`, `combatAim.js` | Existing sight and swept movement used; new channels steer with shared aim. |
| Body/weapon and effect rendering | `playerAttackAnimation.js`, `animationProfiles.js`, `combatVisualsRenderer.js` | Reusable anatomy extended, procedural technique shapes added, valid zero directions fixed. |
| Profile/world saves | `saveProfiles.js`, `gameSave.js` | Version 12 and four-slot migration; live owner/channel/effect state stripped. |

## Generalization boundaries

New mastery and channel modules own their narrow policies. `combatExpansionData.js` contains definitions; `combatExpansion.js` dispatches bounded technique handlers through production callbacks; rendering owns geometry, icons own SVG silhouettes, and audio owns event hooks. No parallel combat engine, replacement save store, new cooldown model, generic scene framework, or unrelated class system was added.

Repeated full player migration previously sat in combat's hot paths. Combat and progression now ensure migration once per actor, and tree bonus reads cache against class/bloodline/ownership/spent-node/weapon/inventory state. Explicit save/UI migration and actual progression/vital refresh remain. This removed a source of repeated work found during browser timing checks.

## Defects discovered during integration

- A genuine older fourth slot was folded into the old three-slot layout. Four valid assignments now survive in place.
- Numeric shortcuts bypassed charge/hold input. They now share the slot pipeline.
- Controller ability-menu navigation still clamped and wrapped across three slots. It now traverses all four.
- Starter refresh could reassign a deliberately cleared ability. It now assigns only a newly learned starter.
- Fresh HUDs showed cooldowns for abilities never cast. Missing timestamps now mean ready.
- Some effects treated horizontal direction `0` as a missing value and drew diagonally. Nullish fallbacks preserve it.
- A long held channel's visual action was backdated like an instantaneous cast and could end before the channel. Channel action time now starts at the actual channel start.
- Single-owner Verdant Wound state could attribute a co-op stack to the latest caster. A bounded source breakdown now splits its actual tick once.
- Temporary echoes and owner-reference runtime data needed explicit save exclusion.

See [implementation and validation](IMPLEMENTATION.md) for delivered repertoire, formulas, regression evidence and outstanding acceptance work.
