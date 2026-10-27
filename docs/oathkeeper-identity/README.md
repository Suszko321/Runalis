# Oathkeeper: Resolve & Requiem

Implemented October 26, 2026. [Visual gallery](index.html) · [Combat sheet](combat-sheet.png) · [All 52 before/after cast comparisons](cast-comparison.csv).

Holyknight is a close-range bruiser built around mace pressure, blocking and earned recovery. Sinner is a durable melee-and-magic hybrid built around death-swords, pack control and active survival. Individual skill morphs remain mixable; mastery 5/10 and final Expertise selection retain their existing rules. Petalknight, Acolyte and all 120 other class morph definitions match their pre-pass hashes exactly.

## Findings and corrections

- Sinner previously combined stronger repeatable melee, a Penance damage multiplier, wounded damage and life recovery on every affected enemy. Even its healing and utility forms paid 4% current health. The old 30-second sample rotation exceeded the glass-cannon comparison below. Penance now rewards close combat and injuries, then buys pack damage or deliberate healing. Remote kills, fields, channels and sword echoes cannot generate it.
- Many Holyknight forms reused a generic ward, while both Sinner defensive spells reused retaliation. Each skill now has an authored job. Holyknight gains three Resolve through spaced close hits/clean blocks, and spends it on a focused hammer, an area finisher or Second Wind. Sinner spends three Penance on recovery or two returning swords that cannot hit the primary victim.
- Authored percentage healing and protection bypass the old cast-level extra scaling. Their ongoing effects and immediate casts now use the same protection rules. Sinner melee lifesteal shares a hard 3%-maximum-health budget per second across skills and victims, after healing bonuses.
- Aimed ground conjurations snap along the aim toward a visible enemy when one is present, avoiding the previous tendency to overshoot nearby targets. Terrain still blocks attacks, approaches and movement.

## Tree cleanup and saves

Removed **Mace and Mandate** and **Guardian Oath** as repeated stat gates. Their useful bonuses are consolidated into Close Quarters and Bastion Training. Last Rite has its own two-point recovery node from the core. Both opening doctrines can be developed, and either route reaches mobility and conjurations. Holy and necrotic investments now both support the appropriate Oathkeeper family.

The 13 canonical abilities, mastery, morph choices and cooldown keys are preserved. A purchased Living Bastion keeps its learned heal through the new recovery node: the former Guardian Oath investment supplies that node. Other removed gate costs return to available points. Migration is idempotent and tested through save/load. Original Oathkeeper ability definitions, Blunt proficiency and mace combos are preserved.

## Holyknight jobs

Base percentages below precede tree/Expertise bonuses. Resolve fades after eight seconds without combat.

| Original skill | Holyknight morph | Job |
| --- | --- | --- |
| Oath Strike | Vanguard's Blow | Sweep your mace through up to three foes. Close hits and clean blocks build Resolve, at most once every 0.75 seconds. At three Resolve, Hammer of Conviction and Heavenfall spend it for stronger finishers. |
| Bastion Bash | Shieldbreaker | Bash a broad line of foes, briefly staggering lesser enemies and weakening their outgoing damage. A close hit builds Resolve. |
| Divine Leap | Crusader's Arrival | Leap along passable ground and slam the landing area. Gain 15% damage reduction for two seconds; landing among foes builds Resolve. |
| Judgment Smite | Hammer of Conviction | Bring down a single heavy mace strike. Three Resolve are consumed for 25% more damage and a brief stagger. Your focused single-target finisher. |
| Consecrated Ground | Brawler's Ring | Consecrate the ground beneath you for six seconds. Foes take holy pulses; while you stand inside, gain 15% damage reduction and recover two Stamina per pulse. |
| Bulwark of Light | Iron Halo | Brace for four seconds with 28% damage reduction. Clean blocks build Resolve and return a short holy shockwave against nearby attackers, at most once per second. |
| Last Rite | Second Wind | Recover 12% of maximum health plus 4% for each Resolve spent, up to 24%. Consumes your Resolve. A self-heal that rewards staying in the brawl. |
| Heavenbreaker Judgment | Heavenfall | After a half-second warning, crush an area with a radiant hammer. Three Resolve add a second shockwave for 35% damage. Walls block the impact. |
| Vowchain | Chain of Challenge | Hook one visible foe and drag lesser enemies closer. Against a boss or heavy enemy, advance toward the anchor instead. Movement respects terrain; a close contact builds Resolve. |
| Litany of Iron | Unbroken Advance | Hold a moving close-range holy aura. Gain 20% damage reduction while channeling and damage surrounding enemies every half-second. Costs 8 Stamina per second; release or dodge to stop. |
| Debt of Blood | Stand and Deliver | Stand firm for four seconds with 18% damage reduction. Store suffered damage, capped at 75% of this skill’s power, then return it in one close shockwave. Successful retaliation builds Resolve. |
| Mandate | Duelist's Edict | Challenge one visible foe for six seconds. Your third melee weapon contact delivers a holy judgment, briefly staggers lesser foes and restores 6% maximum health. One challenge at a time. |
| Hallowed Blades | Swords of the Radiant Host | Conjure four radiant broadswords for eight seconds. Each committed strike weakens its victim and releases a small holy shockwave that can catch two nearby foes. Walls block attacks; the formation cannot stack. |

## Sinner jobs

Penance caps at six and fades outside combat. Only Impaling Sentence, Borrowed Blades, Requiem and the sword formation spend health; their 2%-current-health sacrifice cannot kill the player. Healing rites have no self-cost.

| Original skill | Sinner morph | Job |
| --- | --- | --- |
| Oath Strike | Gravecleaver | Cleave up to four foes with a conjured grave-sword. Close direct hits build Penance and steal 12% of damage actually dealt, shared with other melee morphs and capped at 3% maximum health per second. Weaker focused damage than the Holyknight. |
| Bastion Bash | Graveward Reprisal | Erupt three grave-swords around you, briefly binding lesser foes. Gain 20% damage reduction for three seconds. A close direct hit builds Penance and steals life. |
| Divine Leap | Wraithstep | Rush along passable ground behind a spectral sword. Slash the landing area, briefly bind lesser foes and gain 15% damage reduction for two seconds. |
| Judgment Smite | Impaling Sentence | Sacrifice 2% current health to impale an aimed area after a short warning. Bind lesser foes. Spend three Penance, if available, to strike two additional foes with returning swords; echoes never hit the primary victim. |
| Consecrated Ground | Grave of Blades | Plant a six-second grave of rising swords. Enemies take necrotic pulses. While standing inside, gain 18% damage reduction; damaging pulses restore 0.8% maximum health, at most once per pulse. |
| Bulwark of Light | Sepulchral Guard | Conjure a tomb of swords for four seconds, reducing incoming damage by 30%. Taking a hit or cleanly blocking launches a retaliatory sword at the attacker. One reply per second, capped at five. |
| Last Rite | Reclaim the Forsaken | Reclaim 14% maximum health. If you have at least three Penance, spend three to recover another 10%. This healing rite has no health sacrifice. |
| Heavenbreaker Judgment | Requiem of the Unburied | Sacrifice 2% current health and raise a ring of unholy swords after a 0.65-second warning. Spend three Penance for returning sword strikes against two additional foes. Wide area control, rather than execution damage. |
| Vowchain | Funeral Lance | Send a long grave-sword through up to four aligned foes, slowing them briefly. A ranged tool for approaching or controlling a pack; no health cost. |
| Litany of Iron | Procession of Blades | Hold a moving ring of spectral swords. Cut nearby enemies every half-second and gain 15% damage reduction while held. Costs 10 Spirit per second; it does not build Penance or steal life. Release or dodge to stop. |
| Debt of Blood | Borrowed Blades | Sacrifice 2% current health to borrow three sword echoes for six seconds and gain two Penance. Each of your next three melee weapon contacts cleaves up to three other nearby foes. Echoes cannot hit the struck target. |
| Mandate | Mortal Covenant | Bind one visible foe for six seconds. Your third melee weapon contact calls a death-sword, splashes nearby enemies and restores 6% maximum health. One covenant at a time. |
| Hallowed Blades | Swords of the Forsaken Vow | Sacrifice 2% of current health, leaving at least one, to conjure three black grave-swords for eight seconds. Each strike sends necrotic splinters into up to two nearby foes. Lower focused damage, greater pack pressure. Walls block attacks; the formation cannot stack. |

## Measurements

Same level 33, skill mastery 20, starter mace/bow, stationary boss at melee reach, 30 seconds, four attack skills and ample resources. Developed samples buy legal class and weapon paths using the real point entitlement and aligned Expertise. Choices and points spent differ between trees; these are reproducible sample builds, not a universal class ranking. No primary-weapon attacks or incoming damage occur in this output comparison.

| Family | Investment | Points before → after | Before DPS | After DPS |
| --- | --- | ---: | ---: | ---: |
| holyknight | Skill unlocks only | 7 → 7 | 188.1 | 176.5 |
| sinner | Skill unlocks only | 7 → 7 | 218.5 | 93 |
| hellstalker | Skill unlocks only | 7 → 7 | 138.9 | 138.9 |
| holyknight | Developed trees | 50 → 60 | 346.3 | 345.1 |
| sinner | Developed trees | 50 → 60 | 391.2 | 165.9 |
| hellstalker | Developed trees | 53 → 53 | 174.5 | 174.5 |

Sinner is below the tested Hellstalker rotation in both samples. Its formation redirects power into splinters against up to two additional enemies, and Penance echoes add no damage against a lone victim. The separate 52-cast comparison includes 1- and 16-enemy fixtures and net health changes; it also records lower focused damage rather than presenting every reduction as an improvement. Marks, Borrowed Blades and reactive guards require weapon contacts or incoming attacks; zero standalone cast damage is intentional and their triggers are tested separately.

## Visual identity and regression checks

Holyknight keeps gold, ivory, heavy mace/hammer impacts, shields and readable ground boundaries. Sinner now uses black grave-swords edged in violet and pale death-light: a sword tomb, funeral lance, rising impalements, a moving sword procession and reclaiming spirits. Delayed impacts have visible warnings; effects stay anchored to the world. Fields, pending strikes and weapon replies are owner-specific, bounded and cleared on death, world changes, morph changes and respec.

- 18 new identity checks: actual mace contacts, Resolve cadence, Penance spending, pack-only echoes, shared healing limits, terrain, channel release/upkeep, lifecycle, tree reachability, migration and protected forms.
- 26 real browser casts and 36 animation/camera checks, with no page errors or missing assets.
- 29 focused model suites and 24 broader gameplay suites. [Focused results](../subclass-reduction/regressions/results.json) · [Gameplay results](../moment-gameplay/regressions/results.json).
- Creator information: 42 layouts. Skill-tree/Expertise menus: 18 class/viewport checks, with real purchases/respec and no missing icons. Existing original/morph browser checks cover 39 casts, 16 directional mace cases and audible impact samples.

## Limits and follow-up

Damage/healing tests use deterministic practice fixtures; they do not establish live encounter win rates, multiplayer balance, every equipment interaction or optimal rotations for every glass-cannon family. Validate survival and pack-clear time on long overworld/boss sessions with several gear tiers. This pass does not claim a measured improvement to whole-game FPS or startup time. Cosmetic source changes are limited to Oathkeeper; no enemy density, world scale or draw-distance settings were reduced.

Reproduce with Node: tools/benchmark-oathkeeper-identity.mjs after, tools/verify-oathkeeper-identity.mjs, and the existing regression runners. Browser checks use RUNALIS_NODE_MODULES and the local preview on port 8768. The pre-pass source and retired passive icons are preserved outside the project in the dated Codex backup.
