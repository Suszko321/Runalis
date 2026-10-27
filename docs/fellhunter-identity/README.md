# Fellhunter: Fang & Hellfire

Implemented October 26, 2026. [Ability gallery](index.html) · [Stacked quarry](stacked-quarry.png) · [90 single-cast comparisons](cast-comparison.csv).

Fellhunter now emphasizes evasive ranged pressure, five-projectile morph volleys, trap setup and accuracy-based resource generation. The requested reference was the Demon Hunter's ranged attacks, volleys and evasive skills in [Blizzard's Diablo III abilities guide](https://eu.diablo3.blizzard.com/en-us/class/demon-hunter/active/). Runalis keeps its own Stamina/Spirit resources, equipment, combat systems, mastery 5/10 forms and mixed morph loadouts.

## The damage-over-time split

| Effect | Lifetime after application | Tick interval | Limit | Identity |
| --- | ---: | ---: | --- | --- |
| Infernal Brand | 1.8s | 0.3s | One brand, up to 3 Embers per owner/foe | Short, fierce pulses; renewed by continued fire hits |
| Bleed | 10s per layer | 1s | 8 independent layers per owner/foe | Slow accumulating wounds; existing layers expire naturally |
| Poison | 14s per layer | 1s | 6 independent layers per owner/foe | Slow venom pressure that outlasts repositioning |

In the level-33/mastery-20 Hunter Bow fixture, a fresh fire brand ticks for **11**, while fresh Bleed and Poison layers each tick for **3**. Fire's last recorded pulse was at 1.875s after casting; Bleed continued to 10.075s and Poison to 14.075s. Travel time accounts for the small offset. These are measured examples, not universal damage values. Stacked wounds become stronger through their layer count.

Bloodhound previously refreshed one five-second bleed and had no poison stack system. Hellstalker also used a five-second burn at a shared slow cadence. The new pools have independent timing rules. A 0.4s application cadence per type/foe prevents one simultaneous fan from instantly filling a wound cap. Each layer retains its own source, base potency and expiry; a new weak application cannot preserve every old powerful layer. At the cap, a fresh layer replaces the oldest. Removing a morph removes only its layers.

## Combat and tree changes

- Barbed Shot is a ranged Bleed builder, restoring 6 Stamina on a damaging hit. Hellfire Bolt restores 6 Spirit to fund larger spells. Cast costs still apply; misses, blocked projectiles and periodic ticks grant no refund.
- Razor Rain and Infernal Barrage fire five piercing projectiles in a wider fan. The original volley also has a wider hit cone. Native bow, melee weapon and handbow compatibility remains intact.
- Bloodhound mixes barbs, venom-coated projectiles, miasma and septic shrapnel. Weapon hits on an existing wounded quarry can add paced Bleed; they do not refresh older Poison or Bleed. Patient Predator strengthens newly applied layers by 25%.
- Hellstalker uses casting poses, black-cored fire orbs, cinder lances, demonic seals, fissures, a falling hellstar and rift escapes. Brimstone Rupture has a real 0.35s warning before damage. Three Embers prepare Flashover; Demonic Ascendance strengthens new brands. Its existing 10% exposure risk remains.
- Continued contact with an active fire field renews the short burn. Leaving its source allows only the remaining 1.8s brand; Bloodhound's longer wounds continue after leaving a poisoned area.
- Fast hunter projectiles now check the full segment they travel, preventing venom bolts and fire lances from skipping thin temporary walls between collision samples.
- Both opening doctrines can now reach mobility, caltrops and precision shots. Weighted Knives and Barbed Jaws explicitly improve periodic damage. Existing doctrine choices, node IDs and costs remain; no point migration or loss of learned abilities is needed.
- Red wound marks and green poison marks show separate layer counts on foes. The quarry HUD reports both counts. Infernal casting has deeper fire sounds, while Bloodhound retains physical hunting tools.

## Bloodhound · The patient hunt

| Original skill | Morph | Job |
| --- | --- | --- |
| Practical Strike | Barbed Shot | Fire a quick barbed handbow shot. A damaging hit restores 6 Stamina and adds one 10-second Bleed layer. Bleed ticks once per second and caps at eight independently expiring layers. |
| Throwing Daggers | Venom Fangs | Throw venom-coated fangs through three foes. Adds one 14-second Poison stack; poison ticks once per second and caps at six independent layers. |
| Bear Trap | Razorjaw Trap | Set razor jaws that briefly bind lesser foes and add two Bleed layers. A prepared stack builder; bosses resist the bind. |
| Caltrops | Adder's Trail | Lay a six-second patch of venomous spikes. Pulses slow enemies and build Poison; existing poison persists after enemies leave. |
| Bomb Toss | Septic Shrapnel | Burst a septic shrapnel flask across a pack, adding one Bleed and one Poison layer to each foe. Both ailments keep ticking independently. |
| Grappling Hook | Blood Trail Pursuit | Pursue your quarry along passable ground. Crossed foes gain a Bleed layer; stop in striking distance rather than overshooting a close quarry. |
| Flaming Arrow Volley | Razor Rain | Fire five piercing razor bolts in a wide fan. Apply Bleed across a pack. Simultaneous bolts share a stack cadence rather than instantly filling the cap. |
| Smoke Bomb | Miasma Veil | Slip backward into a three-second miasma patch. Pursuers are slowed and poisoned; existing wounds continue while you reposition. |
| Marked Shot | Red Quarry | Mark one quarry with a hemorrhaging bolt and add two Bleed layers. Wounded quarry takes stronger focused follow-ups; your existing ailments are not consumed. |
| Kill Zone | Venomous Killing Ground | Prepare a six-second killing ground. Repeated pulses slow foes and build both Bleed and Poison. Use evasive shots to maintain pressure while the long wounds work. |
| Hunter’s Line | Goreline | Cast a serrated tether through a line of enemies, adding Bleed. Pull lesser foes toward the line; bosses remain anchored. |
| Ricochet Blade | Plaguewheel | Throw a venom-coated chakram through three visible foes. Each gains Poison. Steel rebounds and terrain checks keep the chain readable. |
| Deadfall | Flensing Snare | Arm a flensing snare. Its heavy jaws briefly bind approaching foes and add two Bleed layers without erasing earlier wounds. |
| Execution Window | Patient Predator | For six seconds, newly applied Bleed and Poison layers are 25% stronger. Existing wounds keep their own potency and expiry. Weapon attacks retain their 12% hunting bonus. |
| Vaulting Shot | Venom Backstep | Backflip away and fire a venom bolt from your departure point. Apply Poison while escaping; terrain stops the retreat. Works with any weapon. |

## Hellstalker · The demonic caster

| Original skill | Morph | Job |
| --- | --- | --- |
| Practical Strike | Hellfire Bolt | Conjure a fast hellfire bolt. A damaging hit restores 6 Spirit, funding your larger conjurations. Spaced impacts build three Embers, making the short Infernal Brand tick harder. |
| Throwing Daggers | Cinder Lance | Hurl a black-cored cinder lance through three aligned enemies. A fast ignition tool for a ranged demonic caster. |
| Bear Trap | Infernal Seal | Inscribe a demonic seal. After arming, it erupts beneath approaching enemies, briefly binding lesser foes and igniting them. |
| Caltrops | Ashen Wake | Open a five-second ash fissure. Pulses slow and ignite enemies; their burn expires quickly once they escape the source. |
| Bomb Toss | Brimstone Rupture | After a brief ground warning, rupture the earth with brimstone. Three prepared Embers trigger Flashover and an additional nearby burst. |
| Grappling Hook | Rift Rush | Rush through passable ground on a demonic rift. Scorch crossed enemies and leave a short ash fissure at your departure. |
| Flaming Arrow Volley | Infernal Barrage | Conjure five piercing hellfire bolts in a broad fan. One shared Ember cadence prevents simultaneous bolts from instantly filling the brand. |
| Smoke Bomb | Cinder Veil | Fold backward into a veil of black cinders. A short slowing fissure ignites pursuers; walls stop the escape. |
| Marked Shot | Brand of Damnation | Cast a focused orb of damnation. Three prepared Embers trigger Flashover; the reset brand still delivers its brief, violent burn. |
| Kill Zone | Gate of Cinders | Open a seven-second gate of cinders. Demonic fissures repeatedly ignite enemies inside. Once the source stops touching them, their fire burns out in 1.8 seconds. |
| Hunter’s Line | Hellchain | Lash a spectral hellchain through a line of foes. Pull lighter enemies inward and ignite them; bosses resist the pull. |
| Ricochet Blade | Malice Orb | Release an orb of malice that leaps through three visible enemies. Each impact ignites a short, fierce brand; terrain blocks the links. |
| Deadfall | Falling Hellstar | Suspend a hellstar over an armed seal. An approaching enemy calls the meteor down; prepared three-Ember victims suffer Flashover. |
| Execution Window | Demonic Ascendance | Manifest your demonic ascendance for six seconds. New brands are 20% hotter and weapon attacks retain their 12% empowered bonus. This is offensive power, without a ward. |
| Vaulting Shot | Riftfire Reversal | Rift backward and cast a hellfire orb toward the threat from your departure point. A ranged escape cast that respects terrain. |

## Before/after samples

Same level 33, mastery 20, Hunter Bow, stationary targets 72 pixels ahead, four canonical skills: Practical Strike, Throwing Daggers, Execution Window and Kill Zone. Cast on readiness for 30 seconds, then stop casting for an 18-second tail. No primary weapon attacks or incoming damage; ample resources isolate output. Developed builds buy legal class/weapon paths through the actual point allowance, including aligned Expertise. Changed prerequisites allow different point spending. These are sample rotations, not optimal builds or encounter win rates.

| Family | Investment | Foes | Points before → after | DPS during casting, before → after | Damage after casting stops, before → after |
| --- | --- | ---: | ---: | ---: | ---: |
| bloodhound | No passives | 1 | 0 → 0 | 164 → 118.8 | 72 → 523 |
| bloodhound | No passives | 16 | 0 → 0 | 522.3 → 419.4 | 249 → 1539 |
| hellstalker | No passives | 1 | 0 → 0 | 160.9 → 145.8 | 204 → 105 |
| hellstalker | No passives | 16 | 0 → 0 | 869.7 → 584.6 | 1013 → 315 |
| bloodhound | Developed trees | 1 | 50 → 58 | 362.9 → 257.9 | 205 → 1028 |
| bloodhound | Developed trees | 16 | 50 → 58 | 1114.7 → 990.9 | 757 → 3915 |
| hellstalker | Developed trees | 1 | 50 → 58 | 326.3 → 305.5 | 312 → 312 |
| hellstalker | Developed trees | 16 | 50 → 58 | 1628.3 → 1337.7 | 1438 → 989 |

The new Bloodhound has less immediate burst and much more damage remaining after disengaging. Hellstalker concentrates its periodic pressure into a shorter window. The complete 90-case comparison includes both increases and reductions. It uses one cast per skill: empowerment effects need later attacks to contribute, and traps/fields are populated after placement.

## Verification

- 17 new identity checks: timing, independent expiry, separate caps, snapshot preservation, real bow hits, resource generators, Flashover cadence, delayed impacts, terrain, lifecycle, tree access and save/load.
- 30 real browser morph casts, 24 camera/animation checks, and an actual 8-Bleed/6-Poison quarry capture. No browser errors or missing assets.
- Existing checks: 270 casts with six weapon styles, 15 infernal casts, normal/elite/boss coverage in the 438-cast morph suite, 384 bow rendering cases, 24 weapon poses and eight audible family samples.
- 29 focused model suites: passed. 24 broader gameplay suites: passed. [Focused results](../subclass-reduction/regressions/results.json) · [Gameplay results](../moment-gameplay/regressions/results.json).
- Character information fits all 42 tested layouts; skill-tree/Expertise menus pass 18 class/viewport checks. All 116 non-Fellhunter morph definitions match their pre-pass snapshots, including Oathkeeper, Petalknight and Acolyte.

## Practical limits

Long boss fights, multiplayer and extreme equipment combinations still need player-session validation. These controlled fixtures do not measure full-game FPS or startup loading, and this balance pass makes no such improvement claim. State and particle sources remain bounded and owner-specific; enemy density, world scale and draw distance were not reduced. Periodic wounds, projectiles and pending eruptions clear on the relevant morph change, respec, death or world transition.

Reproduce with Node using tools/verify-fellhunter-identity.mjs and tools/benchmark-fellhunter-identity.mjs after. Browser checks use RUNALIS_NODE_MODULES with the local preview on port 8768. The pre-pass source and tools are preserved in the dated Codex backup outside the project.
