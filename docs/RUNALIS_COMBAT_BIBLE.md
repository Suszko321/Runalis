# RUNALIS Combat Design Bible

Established October 31, 2026. Initial assessment of the current root `src/` runtime.

This is the reference for subsequent combat work. The director's brief controls
creative intent; current source defines observed behavior. A documented defect is
not an approved rule. Standards below govern future changes; they do not claim
that every existing mechanic already satisfies them. Historical reports retain
their original meaning but do not override the current catalogue.

Companion records:

- [Prioritized findings and correction order](RUNALIS_COMBAT_AUDIT.md).
- [Complete generated ability, morph, passive, summon and equipment inventory](combat-audit/INVENTORY.md).
- [Validation evidence and reproduction commands](combat-audit/VALIDATION.md).
- [Art Bible](RUNALIS_ART_BIBLE.md), for visual identity and asset contracts.

## 1. Protected combat identity

Combat combines responsive action, committed powerful attacks, readable enemy
patterns, positioning and long-term character growth. Mastery must affect outcomes;
strong investment must remain rewarding. Revisiting weak areas should demonstrate
earned power, and dangerous areas can remain dangerous before the player is ready.

Enemy levels are authored by geography, encounter seed, dungeon theme/tier and
floor. Do not derive them from the player's level. Preserve existing party-size
encounter adjustments, class freedom, contribution-based rewards, the blacksmith's
upgrades and the craftsman's crafting services.

Attributes and mastery have no authored level ceiling; finite storage protection
is not a gameplay cap. Existing local limits on crit chance, defense, companion
count and particular proc budgets are separate authored rules. Do not add a
universal progression cap to solve a local interaction.

The source currently permits training other disciplines and weapon trees while
restricting class skills and core trees to their owning class. Flexible training
does not currently mean unrestricted use of every other class's abilities. Any
change to that boundary requires direction.

## 2. Current content and class identity

After the Vampire overhaul, the runtime contains 98 original active definitions,
73 morphable class parent skills and four morphable bloodline skills. There are
154 optional forms (146 class plus eight Vampire), twelve class morph families,
seven channel definitions, eight summon abilities, 17 ordered trees and 282 tree
nodes. Nodes include active unlocks, passives and Expertise.

Six ordinary classes are selectable. Eldritch is a hidden unlock. Classless remains
defined for existing characters/internal creation but is unavailable for new
selection. `TEMPORARILY_UNAVAILABLE_CLASSES` currently contains only `classless`;
older text saying Lightbringer is disabled is stale.

| Class | Implemented identity and strengths | Commitment / limitations | Mastery 5 / 10 families |
| --- | --- | --- | --- |
| Oathkeeper | Mace/blunt bruiser; Conviction from contact, damage and blocks; smites, leaps, wards and earned recovery | Close engagement; ordinary movement scalar 0.92; resource and recovery commitment | Holyknight / Sinner |
| Waverider | Water pressure, Soaked, Flow; next ability empowered after three Flow; movement, healing and shields | Setup and resource management; Sunken opens weaker and requires maintained contact | Sunken / Cryomancer |
| Thornbinder | Directional vines, roots, Verdant Wounds, Briar Bloom; companion and field combat | Attrition and terrain/position dependence; Fae is vulnerable in melee, Petalknight needs nearby pressure | Fae / Petalknight |
| Gravecaller | Necrotic projectile and scythe combat; Commander of the Dead / Lichbound paths; skeleton and lich control; eligible lifedrain | Fragile base role; healing belongs to specific attacks with shared budgets; summon loss matters | Acolyte / Deathknight |
| Lightbringer | Spirit Focus ranged caster; Halo Brand, three Lumens, beam/verdict/shield payoffs | Setup and Spirit upkeep; Sunscorched trades defense for ranged pressure, Dawnblade trades range for melee mobility | Sunscorched / Dawnblade |
| Fellhunter | Human tools, traps, daggers, bombs, smoke and grappling; Tactical Advantage strengthens prepared weapon contacts | Grounded preparation, distance and timing; Bloodhound ramps wounds; Hellstalker suffers casting exposure | Bloodhound / Hellstalker |
| Eldritch | Hidden red-black lightning, void movement and horror summons | Dangerous positioning and Conduit health upkeep; no current morph-family pair | None |
| Classless | Legacy independent identity; no class tree or passive | Currently unavailable as a new selection | None |

Family descriptions, actual mode/cost/range/description for every form, all nodes,
and equipment thresholds are in the generated inventory. Aliases `templar`,
`hydromancer`, `necromancer` and `mercenary` are migration identities, not extra
classes. Hurricane, Priest, Cursed and Lifebloom are examples of retired choices;
do not restore them merely because they appear in historical briefs. Current
retained families are authoritative in `subclassData.js`.

## 3. Frame, input and action economy

The game uses Canvas 2D and native JavaScript modules. `main.js` caps frame `dt`
at 0.033 seconds. It samples input, updates host abilities/combat/movement, updates
allies, advances enemies once, then updates host summons and world effects.
Allies advance their own combat and summons in `couchCoop.js`. Shared menus,
local menus, death, revive and party-entry states can change that route.

| Mechanic | Current contract |
| --- | --- |
| Hotbar | Five reassignable slots. Block starts in the fifth; it is an equipped held action, not a permanent free guard. Duplicate skills are moved by the assignment API. |
| Keyboard / pad | Q, R, X, 4, F plus numeric 1–5 aliases; RT, Y, X, LB, LT. Rebinding belongs to the actor. RB tap/hold/release controls weapons. |
| Aim | Active right stick, marked pointer/touch, left-stick fallback, previous charge/combat aim, then facing. Right-stick deadzone 0.28; movement fallback threshold 0.25. |
| Light weapons | Three-step authored chains for dagger, sword, axe, mace, hammer, spear, staff, scythe and unarmed. Distinct arcs, reach, costs, timing and finishers. |
| Ranged / hidden weapons | Bow, crossbow, Spirit Focus and Eldritch use their movesets; do not assume the melee three-step rules apply. |
| Heavy attack | Hold/release with weapon-specific threshold, maximum hold, reach, cost, impact and motion. A short tap releases a light attack. Weapon changes cancel the held charge. |
| Combo buffering | Light-chain input can queue from active start through duration; a finisher requires a fresh restart after its authored delay. There is no established universal ability queue. |
| Dodge buffer | A press in the last 0.1 seconds of dodge cooldown can buffer; death, guard break, blocking or state replacement invalidates it. |
| Skill hold charge | Separate from use charges. Default tier progress 0 / 0.42 / 0.78. Time is `max(0.2, maxChargeTime × 0.72 × (1 − 0.12 × Focus refinement) × direct-attack charge scalar)`. |

Melee collision tests directional arcs, capsules or circles against enemy radius,
requires terrain visibility, and remembers hit enemy IDs per attack. Weapon
projectiles retain hit IDs and pierce counts. Necrotic/Gleam projectiles use a swept
target test; wall travel is checked before collision. Other techniques have their
own geometry, visibility, target caps and periodic schedules.

Responsiveness standards: preserve input intent, show failed activation reasons,
allow deliberate defensive choices, and define cancellation per action. A charge,
channel, dodge and weapon recovery must have explicit compatibility rules. Do not
promise a global cancel/parry system: Dawnblade has a specialized parry; general
Block is sustained mitigation without a universal timed-parry window.

## 4. Damage, progression and defense rules

Let `S(L) = 20 × ln(1 + (max(1,L) − 1)/20)` and
`P(L) = 1 + 0.65 × ln(1 + (max(1,L) − 1)/20)`.

Offensive progression is `1 + 0.14 S(Combat) + 0.06 S(proficiency) +
0.02 S(attribute)`, where physical weapon proficiencies use Dexterity and other
offense uses Spirit. Defensive/vitality purposes use
`1 + 0.9(P(Combat)−1) + 0.6(P(proficiency)−1) + 0.2(P(attribute)−1)`.
`levelRefinement(L,scale) = 1 − exp(−(L−1)/scale)` supplies bounded handling.
These curves are uncapped; do not mistake diminishing marginal gain for a cap.

| Stage | Current calculation / limitation |
| --- | --- |
| Weapon reference | Floor of `(baseDamage + 0.75 weapon.power + 0.5 weapon.spirit + focus contribution + tree power + eligible weapon upgrade + 0.55 primaryMultiplier + 0.55 secondaryMultiplier) × offensive progression`. Spirit Focus adds `0.85 focusPower`. Unarmed uses `floor(3.15 × Blade progression)`. |
| Weapon hit | Move multiplier and random crit, outgoing class passive, legendary modifiers, equipment elemental/boss multiplier, elite guard, then health loss and contribution attribution. Procs can have separate delivery paths. |
| Weapon crit | Base 4%; heavy +3%; rarity adds rare 2%, legendary 4%, relic 5%; bow/focus gain bounded proficiency contributions; tree crit is added; final chance capped at 35%. Damage multiplier 1.45 light / 1.65 heavy plus tree crit damage. Skills use handler-specific crit behavior. |
| Ability reference | `round((baseDamage + 0.52 equipmentCombatPower) × damageMultiplier × Expertise × progression × tree ability bonus × bloodline factor when applicable)`, where `baseDamage = Number(ability.damage || 6)`. Fellhunter uses its own investment helper. This is reference power, not necessarily one delivered hit. |
| Ability delivery | Direct tempo ×1.18 only on eligible direct attacks; excludes DoT, proc, summon and other named persistent cases. Single-target/AoE, proficiency/element, Soaked, Halo Brand, Exposed, bloodline, legendary, set and elite modifiers are handler dependent. Rounding occurs at several stages. |
| Attack speed | Weapon timing divided by `1 + min(35, positive tree attackSpeedPct)/100 + 0.12 Dexterity refinement`; base movesets also receive their existing tempo pass. Do not apply those base scalars twice. |
| Enemy armor / elements | There is no universal enemy armor or elemental-resistance resolver in the inspected ordinary player-hit paths. Element tags drive bonuses, identity and status interactions. Elite Bulwark is a separate positional mitigation rule. Do not claim a complete resistance model exists. |
| Incoming advanced damage | Invulnerability/dodge, cover, Block/Thornskin, defense buff, flat armor reduction (`0.18 × armor`, minimum one before shields), bloodline, legendary, Bubble Ward, Lightbringer shields, technique and morph mitigation, then health. Summons have a separate armor/ward path. |
| Incoming legacy damage | Basic coordinator path duplicates much of that ordering but invokes Block defense only when blocking and passes less context to some hooks. Keep parity under review; `applyTargetDamage` is the richer existing path. |

`getPower()` is a separate legacy/UI-derived value and is not interchangeable
with either reference damage formula. Shared rounding and modifier order are
future consistency targets, not justification for a broad rewrite.

### Resources, guard and recovery

Default sprint is ×1.45 movement and 13 Stamina/s; default Stamina recovery is
11/s after its delay. Dodge uses speed 520, 0.16s travel, 0.01s iframe delay,
0.18s iframe timer, 0.42s cooldown and base cost 22 before handling/tree/gear.
Timer update order and frame size affect the exact observed protected interval;
do not advertise these constants as measured hardware latency.

Block requires an equipped Block, two Stamina to begin, drains 4/s before
reductions, and costs `ceil(incoming × 0.55 × class/gear efficiency)` per hit,
minimum one. Base reduction is 62%; Oathkeeper and Bulwark can increase it to
the existing 86% cap. Guard break lasts 0.75s; the breaking hit retains 75% of
incoming damage before later mitigation. Ordinary blocking movement is ×0.42
with class/tree adjustments. Guard is not currently directional.

Awakened passive Spirit recovery is 1/s in the main/ally loop. Primary weapon
contacts restore five Spirit per successful target hit; spells do not inherit
that reward. There is also a universal one-HP heal every ten seconds while injured.
Out-of-combat recovery waits six seconds after detected engagement, then restores
20% max HP/s, 25% max Spirit/s, full Stamina and one-third of the player's HP
percentage rate to companions. Those fast exploration rates are intentional
existing rules, not combat sustain benchmarks.

Healing must use effective missing health and recipient-specific modifiers.
Gravecaller lifedrain has a shared recipient budget: 6% max HP burst / 3% per
second refill; summons additionally share 2% burst / 1% per second. Only eligible
attacks drain; secondary damage cannot recursively heal. Other paths do not all
have this protection; see C01 in the audit.

## 5. Abilities, morphs, Expertise and mastery

Activation resolves the canonical hotbar ID, selected morph, balanced overrides,
held charge, ability mastery and mythical modifiers. It checks ownership/class,
bloodline/equipment/Spirit requirements, recovery and resources before dispatching
to a specific original, morph, summon or technique handler. Some newer techniques
and morphs are explicitly unavailable in PvP; PvE coverage does not establish PvP
support.

Ordinary cooldown maps store last-use timestamps, not time remaining. Multi-use
skills keep ready-at queues; uses recharge independently. Existing maximum is
three uses and at most 60% recharge reduction. Mobility often starts with two
or three uses. Hold channels are excluded from use charges and cooldowns.
Summons start resummon recovery after their whole group disappears or is dismissed.

Channels share `abilityChannelSystem.js`: up-front handler cost plus periodic
quarter-second upkeep, configured steering/tick cadence, and termination on
release when held, duration, death/control lock, stun/stagger, dodge, another skill,
resource depletion or incompatible equipment. Catch-up is bounded to 64 payments
and four damage ticks per update. Do not conflate a field that lasts after a cast
with a held channel.

Each participating skill has Original plus its two class forms. Unlocks are at
that skill's mastery 5 and 10; there is no third form at 20. Choices persist under
canonical IDs. Selection rejects dead actors, active charges/channels and recovering
skills, preserving shared recovery. Removed selections migrate to Original;
obsolete runtime forms are cleared. Test lingering fields and summons when
changing a form rather than assuming every effect is automatically revoked.

Expertise is a mutually exclusive final tree purchase, not a permanent subclass
identity: class Mastery gives all owned class forms ×1.05 effectiveness; a family
Expertise gives aligned forms ×1.15 and other class forms ×0.90. Universal and
equipment skills are excluded from class penalties. Other morphs remain usable.

Mastery XP is currently awarded to every distinct assigned hotbar skill from
earned XP, even if never cast. Hit/use/kill records are statistics. Do not restore
old contribution-only mastery or award it twice from proficiency distribution.
Refinement uses `1−exp(−(mastery−1)/45)` with differing damage/range/efficiency
coefficients by summon, protection, channel, mobility or attack. Channel efficiency
has a separate 40% asymptotic reduction plus Focus handling.

Every future skill/form specification must state its tactical purpose, inputs,
geometry/cover rules, target limit, startup/contact/recovery, reference and delivered
damage, costs/upkeep, cooldown/uses, duration, status refresh/stacking, cancellation,
ownership, mastery/gear/Expertise interactions, VFX/audio timing and save behavior.
Morphs require a recognizable change and a stated tradeoff; numerical superiority
alone is not the default standard. Tooltips must describe actual runtime behavior.

## 6. Status and control contracts

There is no single generalized status container. Legacy enemy fields, per-caster
WeakMaps, typed layer arrays and temporary buffs coexist. Audit ownership and
expiration in the actual handler before adjusting a status.

| Effect / source | Application, lifetime and stacking | Ownership, removal and resistance |
| --- | --- | --- |
| Verdant Wounds | Thornbinder application; default cap four, tree can raise cap; 6.5s duration; 1.25s ticks; explicit source list and snapshot power | Enemy carries bounded owner/source records; source expiry and death cleanup; reduced duration on bosses/elites |
| Soaked | Water hit marks a timed shared enemy vulnerability, default 5s / 10%; callers can vary it | Enemy fields with legacy hydromancer aliases; water-hit handlers consume vulnerability; not a generic elemental resistance |
| Exposed | Fellhunter tools; max-expiry/bonus refresh; default 4s with handler/tree changes | Shared enemy marker; contribution belongs to the actual follow-up actor; direct ability and weapon paths use different existing bonus limits |
| Chill / Brittle / Freeze | Cryomancer spaced Chill cadence 0.45s; three hits prepare Brittle; Chill expiry 4s, Brittle 4s; normal freeze 1.1s / elite 0.6s; recovery 4s; prepared Shatter consumes Brittle | Per-owner affliction plus shared control timers; bosses resist hard freeze; cleanses clear allied slow/elite frost rather than all damage statuses |
| Root / Slow / Silence | Handler-specific expiry/timer; usually strongest/longest refresh, not additive unlimited duration | Generic morph control scales bosses to 0.3 and elites to 0.55; hard root/freeze excludes bosses; silence excludes elites and bosses; legacy control uses other scalars |
| Bloodhound Bleed / Poison | Per-owner/enemy shared pools; 8 bleed layers ×10s, 6 poison layers ×14s; one-second ticks; each source cadence 0.4s; independent layer expiry and power | Canonical source ability retained; expired/revoked source removed; oldest layer replaced at cap; ticks cannot preserve old layers |
| Infernal Brand | Hellstalker short burn, 1.8s, ticks every 0.3s; up to three spaced Embers and explicit Flashover | Per-owner affliction, bounded catch-up; expires/revokes by source; five-second casting exposure increases incoming damage 10% |
| Sunken Depth / Pressure | 20s encounter ramp, five-second contact grace; one strongest-source burn per caster/enemy, source validity three seconds, 0.5s ticks; up to 48 targets | Separate WeakMap per caster/world; burns do not build Depth; death, world change, lost forms or source expiry clears state |
| Acolyte soul burn / Petalknight thorn wound | Explicit per-skill entries refresh a single burn/wound; periodic hits cannot grow their own damage indefinitely | Per-owner source cleanup; secondary/proc flags prevent reapplication loops |
| Sunscorched Heat / other morph burns | Heat up to five; generic periodic entries commonly use 0.8s cadence with handler-specific duration | Per-caster morph state; inspect specialized tuning before combining with Brand/Pressure |
| Defense / Bubble / light shields | Keyed buffs; reductions bounded in their handlers; Bubble provides timed flat per-hit absorption, light shields have their own capacities | Support contribution tracks caster; expiration and save-load behavior differ by buff; do not treat all wards as expendable shields |
| Elite frost | Exposure builds chill/freeze pressure; guard reduces accumulation; a paid stamina dodge breaks ice and gives recovery protection | Actor-specific fields, cleared with elite runtime/cleanses; not Cryomancer's offensive Chill system |

Element labels such as curse, cold, poison, necrotic and holy do not establish a
universal ailment, immunity or resistance implementation. Avoid inventing one
from a name. For each modified status, verify source, target, exact duration and
tick boundaries, snapshot/live scaling, replacement/refresh policy, death,
respec/morph/world change, save/load and multi-owner behavior.

## 7. Summons and transformations

Original summon skills: Wolf, Demon, Raise the Bound Dead (`summonLich`), Lich
(`gravecallerSummonLich`), Thornlings, Elder Thornbeast and Eldritch Horror.
The historical `lich` internal kind can represent bound skeleton servants;
use displayed role and configuration, not the ID alone, to identify it.

Gravecaller path/tree choices configure skeleton groups or the dedicated lich.
Bound Dead and Lich have Acolyte/Deathknight forms. Thorn summons have Fae and
Petalknight roles. Acolyte Funeral Urn's seeking ghosts and other temporary spirits
are technique state, not additional persistent summon ability IDs.

Summons have real health, armor, target acquisition, attacks, formations, collision,
room recovery, separation and follow behavior. Threat can favor different target
kinds. Boss selection normally targets players and periodically targets summons;
do not let a swarm permanently erase player pressure. The current limit is eight
active companions per owner, with per-skill group counts below that.

Damage scales with offensive Combat/Summoning/Spirit and magical gear; health uses
the existing vitality/level and group-penalty formulas. Existing actors refresh
offense after relevant level/gear changes while preserving health and identity.
Source ability, selected morph and owner ID persist on the actor; contribution
credits the owner. Owner death/downing clears companions. Dismissal, whole-group
death, terrain recovery, equipment changes and world transitions require explicit
tests. Demon requires the equipped Demonseed Scythe; removing it dismisses its
actors while retaining learned skill/mastery/recovery.

Player bloodlines Cambion, Nephilim and Vampire are **permanent mutually exclusive
awakenings**, not temporary toggle forms. The current code grants a tree, ability,
bonuses, drawbacks and permanent choice locks. Cambion trades healing/defense for
ability/fire damage; Nephilim favors holy defense while weakening necrotic/drain;
Vampire now uses max-HP blood prices, ability-specific recovery, nocturnal/dungeon
strength, daylight suppression, fire/holy vulnerability and reduced outside healing.
Its Royal Bat Beast is a learned toggle with an animated body, upkeep and combat
tradeoffs; the bloodline itself remains permanent. No general ascended-player
form is established.

Veyreign is an enemy transformation: first lethal damage begins a four-second
protected transition into the feral form rather than granting premature death
rewards. The specialized handler manages form stats, arena state and reset.
Future temporary player transformations must define activation, upkeep, termination,
death/revive, equipment, skills, animation, save/load and co-op ownership before
implementation; do not silently convert bloodlines into toggles.

## 8. Enemies, elites and bosses

Fifteen shared ordinary presentation/combat kinds currently include basic beasts,
ash/stalker wolves, hollowlings, gravebound/shield knights, roadless bandits,
cultists/demon cultists, wraiths/Veyr wraiths, brutes, grave priests, archers and
exploders. Advanced behavior supports stalking/flanking, screening casters, firing
lane repositioning, support healing/summoning, windups, charge travel, recovery,
home guards and pursuit. Visibility and line of sight constrain engagement.

Geographic encounters assign ordinary/elite/rare/champion ranks with seeded
stats/rewards. The eight current modifier identities are Waller, Shocker,
Freezer, Molten, Vortex, Artillery, Bulwark and Regenerator. Early regions restrict
combinations; incompatible pairings are rejected. Hazard counts, per-owner counts,
warning floors and healing reserves are bounded. Committed elite effects normally
finish despite hits/control until caster death/unload; Molten has an intentional
corpse eruption. Older elite labels also remain in the legacy AI and must not be
confused with the current geographic modifier roster.

Major phase definitions exist for Malakar, Seraphel and Zephyr Light; additional
specialized handlers govern the Grove Mother, Orchard Custodian and Veyreign.
Generic phases often use 70% and 35% health thresholds. Defined narrative attack
names do not prove that an independently named runtime attack exists.

Malakar's climax is a direct solo-boss encounter: Royal Cleave, Thronebreaker,
Infernal Decree, Brand, Sovereign's Rupture and The Final Siege. Authored serial
combinations and stable safe lanes evolve across Authority/Wrath/Ruin. Generic
adds and independently timed ambient hazards are excluded. Base tells range
0.95–2.1s; base recoveries 1.1–3.4s, with attack/phase overrides. Preserve this
concept. Veyreign's two-form encounter is a separate contract.

Future enemy/boss work must show actual danger geometry, tell/lock/release/recovery,
cover rules, counterplay, stagger resistance, target ownership and fair simultaneous
pressure. Escalation should change decisions and combinations. Fixed damage or
health increases alone are not evidence of improved difficulty. Test multi-player
target spread, summons, low-resource escape and the most restrictive elite pairings.

## 9. Co-op, rewards and persistence

Each local actor owns hotbar, cooldown/charge maps, Spirit, Stamina, mastery,
statuses and companions. The host keeps `coop.players`; allies point back through
non-enumerable `questOwner`. Party-support handlers must resolve the complete
party from any caster. This is resolved through `partySupport.js:getLivingPartyMembers` (C04). Original heal/buff helpers, morph support, post-cast potency snapshots and mythical shared guard resolve living membership from any caster. Downed, reviving, dead, respawning, inactive and departed actors are excluded. Existing range/cover and self-only rules remain.

Existing count multipliers for 1/2/3/4 players are 1/1.35/1.65/2; generic boss
health multipliers are 1/1.35/1.7/2.1. Specialized Mother/Custodian/Veyreign health
multipliers are 1/2/3.1/4.2, with +5% damage per additional member and attempt
locking. Those authored overrides are not player-level scaling. The doubled base
aggro-range helper is applied even for one player; do not describe it as a
multiplayer-only change.

Contribution records distinguish weapons, abilities, support and summon ownership.
Qualifying contributors require participation and proximity within 1,000 world
units. The credited final actor gets full encounter Combat XP; other qualifying
actors get half. An idle player is not automatically rewarded. The one-time guard
prevents duplicate rewards. Attribute allocation is 30% survival, 25% weapon,
35% hotbar purpose and 10% participation, with documented fallbacks and class
affinities. Do not redesign these shares while repairing attribution.

Save schema is 18. Learned skills, slots, selected forms, mastery, bloodlines,
equipment and appropriate live summons persist. Active channels/charges,
projectiles, contribution ledgers and selected encounter effects are scrubbed;
WeakMap state naturally does not serialize. Cooldown origins and use-charge queues
are rebased on load. Timed buffs are not all scrubbed identically; test each affected
buff. Some state uses `performance.now`, some `dt`, some `Date.now`; pause and
long-frame behavior need explicit coverage before unifying clocks.

Online play has a separate host/guest transport/presentation system. Local model
success is not a claim of network latency, reconnect or authority correctness.

## 10. Animation, VFX, audio and maintainability

### Runtime ownership map

| Responsibility | Source of truth |
| --- | --- |
| Frame and party orchestration | [main.js](../src/main.js), [couchCoop.js](../src/couchCoop.js), [coopReviveSystem.js](../src/coopReviveSystem.js) |
| Input and aim | [inputController.js](../src/inputController.js), [abilityBindings.js](../src/abilityBindings.js), [combatAim.js](../src/combatAim.js), [mobileControls.js](../src/mobileControls.js) |
| Original skill dispatch and death | [combat.js](../src/combat.js), [data.js](../src/data.js) |
| Weapons and stamina defenses | [combatMoves.js](../src/combatMoves.js), [meleeLightCombos.js](../src/meleeLightCombos.js), [combatActions.js](../src/combatActions.js) |
| Morph catalogue and encounter state | [subclassData.js](../src/subclassData.js), [subclassVariants.js](../src/subclassVariants.js), [abilityMorphSystem.js](../src/abilityMorphSystem.js), [subclassCombat.js](../src/subclassCombat.js) |
| Techniques and channels | [combatExpansion.js](../src/combatExpansion.js), [abilityChannelSystem.js](../src/abilityChannelSystem.js), [chargeSystem.js](../src/chargeSystem.js), [abilityChargeSystem.js](../src/abilityChargeSystem.js) |
| Attributes, mastery and rewards | [skills.js](../src/skills.js), [progressionMath.js](../src/progressionMath.js), [combatPower.js](../src/combatPower.js), [abilityMasterySystem.js](../src/abilityMasterySystem.js), [combatProgression.js](../src/combatProgression.js), [skillExpertiseSystem.js](../src/skillExpertiseSystem.js) |
| Equipment and class passives | [setBonusSystem.js](../src/setBonusSystem.js), [mythicalEquipmentSystem.js](../src/mythicalEquipmentSystem.js), [legendarySystem.js](../src/legendarySystem.js), [equipmentProgressionSystem.js](../src/equipmentProgressionSystem.js), [classPassives.js](../src/classPassives.js) |
| Ordinary enemies and encounters | [enemyBehaviors.js](../src/enemyBehaviors.js), [enemyTactics.js](../src/enemyTactics.js), [encounterData.js](../src/encounterData.js), [eliteEncounterSystem.js](../src/eliteEncounterSystem.js) |
| Boss combat | [bossSystem.js](../src/bossSystem.js), [malakarCombat.js](../src/malakarCombat.js), [veyreignCombat.js](../src/veyreignCombat.js), [blightedGroveCombat.js](../src/blightedGroveCombat.js), [ashenOrchardCombat.js](../src/ashenOrchardCombat.js) |
| Summon positioning and roles | [summonPositioning.js](../src/summonPositioning.js), [lichSummonSystem.js](../src/lichSummonSystem.js), [equipmentBoundSkills.js](../src/equipmentBoundSkills.js), plus summon lifecycle in combat.js |
| Presentation, HUD and audio | [playerAttackAnimation.js](../src/playerAttackAnimation.js), [playerAnimationController.js](../src/playerAnimationController.js), [enemyAttackPresentation.js](../src/enemyAttackPresentation.js), [enemyTelegraphGeometry.js](../src/enemyTelegraphGeometry.js), [combatVisualsRenderer.js](../src/combatVisualsRenderer.js), [splitScreenHud.js](../src/splitScreenHud.js), [uiInformation.js](../src/uiInformation.js), [audioSystem.js](../src/audioSystem.js) |
| Save and online boundaries | [gameSave.js](../src/gameSave.js), [saveProfiles.js](../src/saveProfiles.js), [cooldownClock.js](../src/cooldownClock.js), [onlineSession.js](../src/onlineSession.js), [onlineProtocol.js](../src/onlineProtocol.js) |

### Presentation standards

Weapon active windows drive hit delivery and hit-ID suppression. Enemy presentation
tracks preparation, execution and recovery from telegraph state; geometry helpers
are shared with danger rendering. Source checks and model suites verify many
timings, not subjective responsiveness on a controller.

Player instant handlers often resolve mechanics first and then create/backdate a
visual action to its release point. Thus current instant casts do not universally
have an animation-before-damage startup. Delayed impacts exist in specialized
forms. Treat sequencing and readability as an audit item; do not silently add
startup delays to every skill.

Preserve selective short hitstop, bounded impact effects, damage-number throttling,
weapon trails, distinct class movement and synchronized cast/impact audio.
Mechanical range, radius, travel and duration must match the visual promise.
The Art Director owns asset craftsmanship; combat owns event timing and geometry.
Asset changes must follow the Art Bible and preserve approved player dimensions.

Retain existing module boundaries; large coordinators and duplicated damage paths
are maintenance risks, not instructions to replace the architecture. Keep debug
tools in isolated labs or explicit development paths. New diagnostic scripts in
this assessment add no production logging or per-frame work.

## 11. Balance evidence and change acceptance

Assess burst, sustained output, real target uptime, resource efficiency, survivability,
healing, control, movement, summons, gear dependence and team contribution as
separate dimensions. A stationary dummy establishes arithmetic, not encounter
quality. Favor specialized strengths and deliberate tradeoffs over universal parity.

Use early/mid/late representatives plus levels 100/250/1,000 as numerical stress
points, not claims of typical attainable progression. The generated equal-level
sweep is explicitly a reference-formula check. Full build rankings, practical
TTK distributions, controller latency and player enjoyment remain unmeasured.
Before balance changes, collect real fixed-enemy scenarios with movement,
obstruction, resource exhaustion and multi-owner statuses. Respect uncapped growth.

For each assignment: investigate the full delivery/ownership path, reproduce the
issue, define the smallest correction, implement, test affected and adjacent rules,
evaluate relevant scaling, update this Bible/inventory/audit and report evidence
and limits. Turn confirmed audit probes into assertions for corrected behavior.
Require direction for class fantasy, progression philosophy, enemy-level scaling,
major boss concepts, class freedom, equipment progression or co-op reward redesign.

The original assessment changed no production mechanics; the follow-up sections
record subsequent authorized combat implementations.

## October 31 follow-up: tank challenges and co-op support

Party support now resolves host-owned membership from every local slot. `verify-party-support-taunts.mjs` covers all four casters and recipients with original and Cryomancer healing/wards, caster-only resource/cooldown payments, and range/downed/inactive exclusions.

Bulwark of Light (including its Oathkeeper forms), Deathknight Funeral Urn (bone standard), and Petalknight Living Briar gain a 4-second taunt at successful activation. Visible non-boss enemies within 180 world pixels prefer the caster for subsequent target selections. Existing costs/cooldowns remain. The newest challenge wins; death/downing, lost sight, distance beyond 360 pixels, expiry or world mismatch releases it. Bosses, friendly/dormant enemies and PvP targets are excluded. Committed attacks are not cancelled. The taunt belongs to the caster, not the standard or summoned companions, and its WeakMap state is not saved. Do not extend taunt duration with generic control/Expertise scaling.

## October 31 follow-up: Vampire bloodline

The [Vampire implementation contract](vampire-overhaul/README.md) defines the 19-node tree, nine HP-powered actives, ten passives and eight mastery alternatives. Crimson Feast keeps its canonical ID as Crimson Awakening. HP prices and upkeep use max HP, never enemy damage hooks, and never receive generic mastery efficiency. Recovery follows actual eligible HP loss once, with explicit area/summon/Frenzy limits. The old universal Vampire lifesteal and retired node effects are removed. Outside healing is reduced without reducing blood recovery. Shared bleed pools expose true wounds for Bloodletting, Hemorrhage and Communion. Fractional bleed damage is preserved and cannot receive a second offensive modifier pass.

Royal grants blood damage ×1.20, blood recovery ×1.15, movement +10% and melee reach +10%, while other abilities deal ×0.75 and outside healing receives another ×0.80. Gear stays equipped. End recovery, death, area changes, save/load and respec explicitly clear transient state. Old investments are refunded through the derived available-point pool with idempotent normalization and no bloodline-point grants. Party state remains independent. See the contract for morph tradeoffs, explicit cooldown policy and validation limits.

## Bat Beast mastery and royal art follow-up

[Bat Beast evolution contract and verification](bat-mastery-evolution/README.md) records five visual stages at Call Bat Beast mastery 1/5/10/20/50. A living summon updates without healing, replacement or additional stat multipliers. Castle Veyreign’s final form and the player’s Royal skill now use the new royal sprite; the summon uses the same design in an allied silver-blue palette. The previous no-art-changes statement applies only to the original Vampire implementation.

## November 1 — persistent summon mastery evolution

All eight persistent summon skills now present visual stages at their own mastery 1/5/10/20/50. Fae Thornlings, Fae Elders and Rose Siegebeasts receive 48 newly authored poses; their shipped bodies remain the mastery-10 middle stage. Other fixed summon bodies gain five nearest-neighbour size stages, retaining equipment, palettes and class identities. Existing combat evolution paths and all combat statistics remain independent. [Coverage, exact production prompts, runtime contract and verification](summon-evolution/README.md).

## November 1 — Gravecaller drawn evolution follow-up

Raise the Bound Dead and Summon Lich now each have distinct authored evolution art for Standard, Acolyte and Deathknight forms. Added 96 poses at mastery1/5/20/50 around the retained mastery10 bodies. Skeleton equipment and marksman bows remain separate overlays; each form retains its existing role, palette, movement and combat rules. Morph unlock gates remain unchanged. [Assets, exact prompts, ownership contract and verification](gravecaller-evolution/README.md).

## November 1 — cross-class boss armory and focus identity

Weapon themes are independent of starter families: future equipment should support class-open discoveries such as a Petalknight rose scythe, rather than restricting every class to its initial weapon. Added four physical boss weapons and four actual book focuses; each themed boss pool rolls16% for one item,8% each. All fifteen spiritFocus items now fire distinct authored projectile silhouettes, committed when the attack starts. Existing timing, damage/collision and progression systems remain authoritative. [Item stats, drop sources, art prompts and verification](boss-armory/README.md).

## November 1 — universal gear rarity and capacity

[Gear itemization contract and formula](gear-itemization/README.md) supersedes earlier boss-exclusive and regional enemy-gear rates. One random gear roll per eligible enemy: ordinary1.5%, elite6%, boss30%; all202 current bases share the full class-open pool. Receiver Combat Level controls rarity; Mythical/Primordial have zero chance below50. White/Common, Green/Uncommon, Blue/Rare, Yellow/Legendary, Purple/Mythical and Crimson/Primordial resolve per-copy numeric stats, upgrade identity and UI colour. Existing carried legacy copies retain their stats.

Each player has20 bag gear slots; materials/consumables/tools and equipped gear are excluded. Full pickups stay in the current world, purchases/crafting/quest claims preflight, and overflow authored world rewards stay on the ground. Merchants sell exact copies with review/confirmation; blacksmiths deconstruct bag copies into existing upgrade materials with service authority and confirmation. Old overfull saves lose nothing. The contract records exact grade weights, stat normalization, material yields and test evidence.

## November 1 — enemy delivery and geographic gear quality

Enemy deaths leave only gear/weapons and learnable skill scrolls physically. Other rolled rewards credit the assigned owner's existing gold/material/item stores immediately, run collection/discovery objectives and appear in a bounded white bottom-left collection feed. All four owners retain independent rewards and full-bag recovery; old saved material drops sweep automatically. Successful resources bypass the retired ground-drop cap.

Dungeon quality now follows location: Root Cellar/Orchard common-only; other dungeons70% common/24% uncommon/6% rare; Malakar/Veyreign mobs64% common/27% uncommon/8% rare/1% legendary conditional on gear. Their final bosses guarantee one random gear copy with40% legendary chance per kill (15/15/30/40), retaining suppression and transformation/reward guards. Outside-dungeon six-grade level rules and exact-grade endgame gates remain. All eligible cross-class bases stay in the pool. Rarity-coloured ground glows and an0.8-second Legendary+ launch lead into persistent runic spires/motes. [Full policy and verification](enemy-loot-delivery/README.md).

## November 1 — lifelong rarity ascension

Every owned weapon, armour piece and trinket can advance +1 through +20, ascend one rarity and restart at +1: Common → Uncommon → Rare → Legendary → Mythical → Primordial. Primordial +20 is the final cap. The same item ID, instance, art, affixes and unique identity remain; completed cycles retain their19 earned bonus steps, so promotion never removes upgrade strength. Actual rarity stats, combat calculations and previews agree. Owned endgame sets can ascend above their original drop quality without changing their drop gates or set identities.

Common upgrades start at5 gold plus Iron Scrap, with gathered materials added later. Uncommon broadens materials; every Rare+ upgrade and promotion into Rare requires Boss Cores alongside ordinary drops. Legendary+ adds Tower Fragments. Gold and material quantities rise by rarity and tier; Mythical/Primordial retain Combat Level50 access. Forge review/confirmation binds the exact copy and current rarity/tier/cycle; equipped and bag copies work only through a live blacksmith. [Exact costs, material stages, retained strength and verification](gear-ascension/README.md).