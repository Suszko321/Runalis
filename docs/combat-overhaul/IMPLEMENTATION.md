# Runalis combat overhaul — October 3, 2026

The playable game now has five active slots, persistent per-ability mastery, a common channel lifecycle, and 29 additional techniques across all seven canonical combat classes. Existing weapon moves, class passives, acquisition trees, use charges, hold charging, and discipline progression remain the foundation. There are now 85 active ability definitions.

This is an implemented and tested combat expansion. The brief's final quality standard still requires long-term balance playtesting, further animation/art refinement, and arena integration for the new techniques. Those remaining items are not presented as finished.

## Play and inspect

- [Save-free combat proving ground](../../combat-overhaul-lab.html): all class techniques, five-slot assignment, keyboard/controller controls, mastery presets, resource refill, and melee/ranged/fast/small/elite/boss/training opponents.
- [Screenshot and catalogue gallery](index.html): the main-game HUD/library, seven class captures, and every active ability at three simulated times.
- [Main game](../../index.html): learn new techniques through the existing skill trees and assign them in Skills → Abilities.

Run the existing local server with `python tools/serve.py`; the browser address is `http://127.0.0.1:8766/`. The review pages do not write player profiles. Browser validation creates disposable profiles only inside its fresh, isolated browser context.

## Five-slot controls and saves

| Slot | Keyboard default | Numeric alias | Controller |
|---|---|---|---|
| 1 | Q | 1 | RT |
| 2 | R | 2 | Y |
| 3 | X | 3 | X |
| 4 | 4 | 4 | LB |
| 5 | F | 5 | LT |

LT is an equippable fifth skill slot, initially holding Block. All players know Block at the start and can replace or clear it immediately. Keeping it anywhere on the hotbar grants +25% Defence XP, stacking with class affinity. Legacy saves gain the fifth-slot default once; subsequent clears persist. A interacts; RB attacks (hold for heavy). In menus, LB/RB continue switching tabs. Keyboard attacks use Space, the fifth ability uses F, sprint uses Shift, and the main-game dash uses Alt. The proving ground uses Shift for its dash.

Numeric keys and letter bindings enter the same press/hold/release pipeline. Optional persisted `inputBindings.abilityKeys` rebinding is read by the shared resolver and labels; this work does not add a separate settings editor for those bindings. Invalid binding data falls back safely.

Save schema is 18 and hotbar layout version is 4. Three-slot saves gain an empty fourth slot. Valid older fourth assignments stay in slot four, with missing ownership repaired. Invalid IDs become empty slots; aliases normalize. Learned abilities, passive ownership, and assignments remain separate. Unlocking fills an available empty slot without replacing an occupied slot. Clearing a starter stays cleared through refresh and save/load.

Only mastery summaries persist. Channels, aim cues, damage contributors, owner references, live marks, projectiles, wounds, and temporary Death Echo summons do not enter saved state. Existing persistent summon behavior remains intact. Existing session-based use-charge recovery safely resets when a profile loads.

## Added class repertoire

| Class | Existing class actives | Added | New techniques and identity |
|---|---:|---:|---|
| Oathkeeper | 8 | 4 | **Vowchain** anchors space; **Litany of Iron** commits to frontal defense and retaliation; **Debt of Blood** stores suffered pressure; **Mandate** rewards three blade hits. |
| Fellhunter | 10 | 5 | **Hunter's Line** tethers and exposes; **Ricochet Blade** rebounds; **Deadfall** arms a mechanical trap; **Execution Window** refunds gadget recovery on qualified weapon kills; **Vaulting Shot** retreats while firing. |
| Gravecaller | 4 | 4 | **Murmuring Host** channels seeking spirits; **Funeral Urn** releases a bounded swarm; **Ghostwalk** haunts crossed enemies; **Death Echo** turns a marked death into a temporary summon. |
| Thornbinder | 8 | 4 | **Briarstride** leaves growths at both ends; **Seed Reliquary** releases biting wound-producing growths; **Thornstorm** plants the caster while projecting thorns; **Corpsebloom** grows a death-triggered biting flower. |
| Waverider | 8 | 4 | **Maelstrom** pulls and applies Soaked; **Undertow** controls a narrow current; **Pressure Spear** pierces and supports hold charging; **Tide Mirror** answers ranged pressure. These build/consume the existing Flow cycle. |
| Lightbringer | 8 | 4 | **Dawnstep** brands a clear path; **Orbital Halo** orbits and can be consumed to widen Dawncarver; **Pillar of Revelation** telegraphs a delayed strike; **Overexposure** rewards four radiant ability hits. |
| Eldritch, hidden path | 4 | 4 | **Crimson Conduit** branches sustained lightning with health/resource cost; **Fracture Step** leaves a delayed rupture; **Impossible Angle** establishes a damaging rift line; **Starless Orbit** controls close space with dark fragments. |

Classless intentionally retains empty class slots. Existing aliases remain supported. No Silkweaver or Tombraiser class was introduced. Eldritch remains hidden in normal class selection; the explicit review page exposes it for testing.

Every addition has an acquisition node. The added branches follow existing core nodes and retain original doctrine/choice nodes and passives. Early nodes cost two points; later nodes cost three. These costs and the combat numbers are initial balance values.

## Mastery

`abilityMasterySystem.js` owns persistent summaries and scaling. Entries contain level, current XP, contributing kills, final kills, successful uses, damage, and last gain time. Unknown IDs and malformed numbers are repaired, and alias collisions preserve the strongest summary without duplicating experience.

Mastery XP comes exclusively from player XP earned while the ability is on the current hotbar. Every distinct assigned skill receives the full earned amount once, including unused attacks, healing, shields, Block, scroll skills, equipment skills and inactive summons. Morphs share the original skill's mastery. Removing a skill stops its training, even if its summon or delayed effect remains active.

Damage, kills and successful uses update historical statistics only. Mobility, effective healing and mitigation can record participation for shared victory XP; they never directly grant mastery. When victory XP arrives, all skills on the recipient's current hotbar train equally. Summons and delayed damage retain their source for combat attribution. Proficiency shares of that same victory reward do not award mastery a second time.

The next-level curve is `ceil(32 + 14L + 3.2L^1.75)`. Level is uncapped for ordinary play, with diminishing refinement approaching **18% potency, 12% reach, and 10% efficiency**. Potency also affects summoned attacks and effective shield/heal strength. Channel sustain costs respect efficiency. Milestones at 5/10/20/30/50 produce bounded visual refinement and feedback. Ricochet gains one additional rebound at 20; vessel swarms gain one creature at 30. Mechanical milestone coverage is intentionally narrow rather than an unlimited multiplication of targets or summons.

Mastery survives death, reassignment, profile roundtrip, and class-state changes. Blade/Archery/Spirit/Warding, survival disciplines, combat level, and existing tree bonuses continue independently.

## Channels, collision, and runtime limits

`abilityChannelSystem.js` owns source/slot identity, fixed versus held modes, turn-limited shared aim, payments, duration, movement policy, and termination. New held channels have a 12-second maximum. Litany and Thornstorm lock movement; Host, Maelstrom, and Conduit slow movement. Release, resource depletion, death/downed state, hard control, dash, another ability, world transition, pause/blur cancellation, and arena reset terminate as applicable. Ordinary incoming damage alone does not cancel a channel. Channels suppress new basic attack initiation.

Dawncarver keeps its three-second fixed commitment, Lumen consumption and beam behavior while using this lifecycle. Its visual and damaging reach clip to the same terrain. Review also found zero-valued east/west direction components falling back to south in several old effects; those visual defaults now preserve valid zero components.

Mobility uses the existing swept actor collision. Boss-scale enemies resist pulls and roots. Projectiles step through terrain rather than teleporting past it; seekers use sight checks. Runtime per actor is bounded to 24 fields, 24 swarm members, 48 projectiles, 32 queued events and 24 tracked visual marks; a single vessel field caps at two and Corpsebloom at three. Enemy marks cap at eight. Global world effects retain the existing 180 cap. Temporary echoes cap at six, expire after five seconds, and use real summon HP/targeting. Death/downed and world-change cleanup remove active technique state.

## Presentation and development tools

The existing procedural renderer has distinct geometry for chains, steel gadgets, spectral faces, vessels, biting seeds, root lines, vortices, radiant fragments/pillars, and angular void effects. Important active marks and defensive statuses remain visible; combo marks show their hit count. All **85 active skills now have different authored SVG silhouettes** in `assets/combat-icons`, shared by DOM and co-op canvas HUDs. All **111 passive and weapon-tree skills have individual emblems**, and active acquisition nodes show the acquired skill's icon. See [the skill-art gallery](skill-art.html) and [the art pass report](SKILL-ART.md).

Each of the 85 abilities now resolves to its own motion profile. Profiles specify timing and anatomical gestures for shield drives, throws, ground planting/slams, volleys, pressure compression, healing, pulls, retreats, glides, root strides, radiant movement, fractured movement, and distinct held postures. Front/back views receive hand separation; poses ease back into their stance. Original abilities now have individually selected release signatures and class/skill-aware impacts. Funeral Urn and Seed Reliquary have different vessels; Thornstorm erupts spines along its actual clipped lane; water gains foam, streaming droplets and pressure ribbons; Eldritch effects use dark seams, teeth and branching arcs. This extends the procedural game renderer rather than replacing it with hand-drawn sprite animations.

The main HUD and compact co-op HUD show five active slots, binding labels, mastery, resource failure, channel state, hold progress, use-charge counts, and recharge progress. The library separates learned/locked entries and filters roles while showing mastery progress, counters, refinement and the next milestone.

Audio events expose cast, channel start/loop/end, impact, and mastery milestone hooks through the existing synthesizer. Class cues differ where the existing mixer supports them; a complete bespoke sound asset suite is still future work.

The save-free proving ground can unlock the class catalogue and its level requirements, refill resources, assign exact slots, alter mastery, clear cooldowns, and spawn opponent types. Developer Editor instances also expose the same tool object as `editor.combat`; it is not installed into ordinary player UI.

## Validation and evidence

| Check | Observed result |
|---|---|
| `node tools/verify-combat-overhaul.mjs` | **55 checks passed**, including migration, cleared slots, ownership gates, contribution splits, aliases/corruption, farming limits, real healing, shielding attribution, summon kills, persistent wounds, co-op shares, marks/combos, channel behavior, all 29 additions, bounds and terrain. |
| `tools/review-combat-catalogue.cjs` | **85/85 actual ability casts succeeded**, 255 phase captures, no browser script errors. |
| `tools/review-combat-overhaul.cjs` | All 29 additions execute in the browser; fourth-slot keyboard start/release and controller exact-slot assignment pass; main-game HUD has five boxes (weapon plus four abilities); library has four slots at desktop and compact sizes. |
| Existing combat atelier | **3,400 rendered samples**, 85 abilities, both body types and four directions; no review actor mutation. |
| `tools/verify-animation.mjs` | **182,196 finite pose samples**, 19 weapon moves, 85 intentional ability profiles, four directions; continuity, recovery and no input mutation pass. |
| Existing combat recovery/stance checks | Actual combat/exploration recovery, co-op isolation, 27 weapon stances, death/downed exclusions, attack/charge and PvP recovery pass. |
| Existing heavy/rapier checks | Eight Lightbringer heavy releases and 24 rapier body/direction/pose combinations pass. |
| Existing world-overhaul check | Passes: 2,703 frontier objects, 36 scenes, nine stones. |
| `tools/verify-skill-art.mjs` | 85 unique active silhouettes and motion IDs, 111 unique passive emblems, all tree assets present; **6,120 nonblank effect renders** across four directions, three mastery tiers and release/impact stages. Inputs and canvas state remain unchanged. |

Machine-readable evidence: [regressions](regression-results.json), [browser checks](browser-results.json), [all-ability casts](catalogue-results.json), [ability inventory](ability-inventory.json). Screenshots are in the gallery. The browser's short combat-update timing samples exclude drawing, scene traversal, input latency and sustained multiplayer simulation; they are not a whole-game frame-rate guarantee.

Browser tools expect `RUNALIS_NODE_MODULES` to point to a dependency directory containing Playwright and `@napi-rs/canvas`, and use installed Edge. The heavy/rapier verification accepts `RUNALIS_CANVAS_MODULE` for its canvas package path. Runtime libraries already bundled with Codex were used; no dependencies were installed into the project.

## Remaining quality work

1. New techniques are explicitly unavailable in the PvP arena. Existing arena behavior remains available. Bringing new damage/control/summon policies into player-versus-player authority needs a dedicated integration and balance pass.
2. Long-session mastery pacing, acquisition-point pressure, encounter diversity, invulnerability windows, resource economy and four-player balance need human playtesting. Initial costs/refunds/control values are not certified final balance.
3. Per-class silhouettes and all-ability phase captures were visually inspected. Some older effects still rely heavily on rings/lines, and several spells share anatomical pose families. Stronger hand/body follow-through, authored summon artwork, richer conduit/thorn impacts and broader per-ability mastery transformations remain art-direction work. Lab enemy/summon silhouettes are deliberately simple test proxies; normal game art is retained.
4. Procedural sound hooks are ready; bespoke sound design is not complete. Real controller hardware feel, four simultaneous controllers, extreme endurance loads, and every historical production save have not been certified by these automated checks.

The concrete new combat systems are playable. The entire ambitious production-quality brief should remain open until these remaining acceptance items are resolved.
