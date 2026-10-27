# Progression and combat audit — October 5, 2026

The 54-page supplied brief is the feature specification. Its reference to Babylon.js does not match this Canvas 2D ES-module project. Eight playable identities are seven canonical combat classes plus Classless; aliases are compatibility names, not additional classes. No new engine or class is warranted.

The workspace's `.git` directory contains no usable repository metadata. Source backup: `C:/Users/austi/.codex/backups/runalis-progression-20261005/src`. No live profile is rewritten by this task.

## Authorities inspected before structural changes

| Area | Actual authority and finding |
|---|---|
| Progression | `skills.js`, `player.js`: seven combat skills, gathering/production/world disciplines; Combat Level is a weighted average of other levels. XP curve grows as L^2.18; grants stop at 1,000 levels and discard remaining XP. |
| Rewards | `combatProgression.js`: per-enemy contributor ledger and one-shot death guard. Class-specific weights, random jitter, identical full budgets for every damaging participant, no independent Combat XP. Only the dominant weapon/skill receives specialization. |
| Warding anomaly | `combat.js`: cast XP even on misses/empty wards; `damageEnemyDirect` additionally awards damage-based XP per tick; summon attacks add XP again; central kills also distribute XP. Warding powers both Thornbinder and Waverider and gets the 1.5 linked-class multiplier on immediate awards. These verified overlapping sources can explain disproportionate growth; the reported historical playtest itself cannot be reproduced without its save. |
| Class identity | `classData.js`, duplicate compatibility tables in `player.js`/`data.js`: one linked +50% skill. Starting weapon types are sword/bow/scythe/staff/sword/spiritFocus/eldritch plus Classless sword. |
| Combat timing | `combatMoves.js`, `combatActions.js`, `main.js`, `couchCoop.js`: existing light chains and held heavy variants, swept collision, buffered attack, hit feedback. Main movement 154 px/s, co-op 149; dash 420, delay .03, cooldown .55; sword first strike .34s/.08s contact; scythe .45s/.11s contact. |
| Abilities | `data.js`, `abilityLoadoutSystem.js`, `chargeSystem.js`, `abilityChannelSystem.js`, `abilityCombatProfiles.js`, `combatExpansion.js`: 85 actives, four slots, distinct motion/effect profiles, held/fixed channels and separate use-charge systems. |
| Mastery | `abilityMasterySystem.js`: contribution-based damage mastery and capped encounter-purpose mastery; potency/reach/efficiency refinement already bounded. Support source owner references live in WeakMaps. |
| Summons | `combat.js`, `summonArt.js`: persistent lich/skeletons, thornbeasts/thornlings, Eldritch horrors; owner damage attribution, dismiss/death cooldown, formations. No universal summon or Summoning proficiency. Stats grow linearly and melee attacks need sight/range verification. |
| Legendary | `data.js`, `legendarySystem.js`: Demonseed Scythe's `summonOnDamage` creates temporary mini-demons automatically; unrelated legendary effects share this authority. |
| Economy/town | `shopSystem.js`, `panelInventory.js`, `gameInteraction.js`, `orrakaiLayout.js`: market purchase and consumable use, no scroll framework. Authored town positions and enterable market. Extend these existing authorities. |
| Co-op | `couchCoop.js`, `coopEnemyScaling.js`, `combat.js`: local shared/split screen, actor-scoped ability dispatch, enemy target ownership, ally healing/wards. No network transport/server to synchronize. |
| Saves/UI | `gameSave.js`, `saveProfiles.js`, `ui.js`: schema 12; player skill state serialized, runtime owners/contributors stripped. Lexicon menus already show skills and mastery; independent Combat XP/core vs proficiency grouping are missing. |
| Enemy/boss | `enemyScaling.js`, `enemyBehaviors.js`, `enemyAI.js`, `bossSystem.js`, `render.js`, `combatFeedbackProfiles.js`: strength tuning, zone/floor identity, authored phase and telegraph mechanics; current nameplates already display Combat Level; spawn-time level/reward consistency needs extension. |
| Recovery | `outOfCombatRecovery.js`: six-second hostile/action delay, 20% HP/s and full exploration stamina; Spirit recovery needs matching resting integration. |

Baseline: `tools/verify-combat-overhaul.mjs` executed successfully, 57 checks. Structural changes will retain these existing authorities, add deterministic progression math/profiles, and use the existing summon/market/ability/save routes.
