# Runalis elite hazard overhaul

Implemented for all eight modifiers in the current geographic encounter roster. Existing combat, progression, enemy identities, skill morphs, hotbar mastery, rewards and pixel sprites remain in use. Reload the game to load the changes. Saves retain assigned modifier identities; freshly generated high-level optional champions can receive three compatible modifiers.

The subsequent [visual and audio pass](../elite-visual-cues/README.md) adds distinct cues and adjusts the minimum warning windows listed below. It also provides a playable sound/visual field guide.

## Combat interruption rule — 12 October 2026

Elite modifier effects cannot be interrupted by root, freeze, silence, stagger, heavy hits, damage over time or nearby companions. These controls retain their ordinary combat effects, but do not prevent modifier activation or stop a committed effect. Killing the caster cancels its active effects and healing chant. Effects still expire normally; reset, world unload and safe-zone cleanup remain. Molten retains its explicitly telegraphed on-death eruption. Invalid wall placements are still rejected before collision is created.

## Modifier completion report

Damage multipliers below use the enemy's existing geographically scaled damage, then pass through the real defensive pipeline. They are not percentages of player health and do not bypass armor, wards, racial/legendary defenses or invulnerability.

| Modifier | Implemented threat and escalation | Valid counters |
|---|---|---|
| **Freezer** | A 3.4-second frost field pulses every 0.55 seconds. Buildup gives Chilled (72% movement), Deep Chill (45%) and Frozen (ordinary movement stops). Advanced exposure reaches freeze in three unguarded pulses. Frozen lasts 1–1.6 seconds; 7-second control recovery prevents immediate refreezing. Standalone Shatter warns for 1.15 seconds and reaches 5× enemy damage. | Leave early; guard to reduce buildup to 40% per pulse; time dodge invulnerability against pulses; use the normal paid dodge to crack ice; use existing healing-morph cleanses; kill the caster to cancel its effects; defend against Shatter. Casting remains possible while immobilized so defensive builds retain answers. |
| **Waller** | Terrain-validated containment follows observed movement during a visible 0.8-second advanced acquisition phase, then locks for the final 0.5 seconds. Advanced walls have a 64-pixel marked gap, swept collision and a 6.5-second active lifetime. The chamber begins after 1.6 seconds of containment and gives a further 1.35-second warning before up to 5× damage. | Turn toward the legal gap; dash or use a movement skill through it; guard or ward the chamber strike; kill the caster to collapse its effects early. Invalid terrain placements are rejected. Walls are **not destructible**. |
| **Artillery** | Teaching strikes acquire briefly, then give a generous committed warning. Advanced attacks track for 0.8 seconds, then lock for 0.6 seconds; 150–180-radius zones prevent walking from being the universal answer. Critical strikes reach 5× damage; optional champion execution reaches 9×. A separately locked follow-up predicts the observed escape direction and warns for 1.05 seconds. | Time the universal dodge; move behind real cover after lock; use a sufficiently strong defensive combination or Dawnblade ward/parry; kill the visible caster to cancel bombardment. Locked positions never move. Low stamina can break Block, so holding it alone is not a guaranteed answer. |
| **Shocker** | Committed lightning capsules replace generic circles. Advanced strikes reach 4× damage and announce a crossing second lane. Shared geometry draws and hits the same lane. | Leave the lane rather than its decorative center; dodge or guard impact; kill the caster to cancel the strike; anticipate the crossing reprise. |
| **Molten** | Persistent magma denial ticks at 0.6× damage. Advanced enemies leave separately warned pools along their movement. A corpse eruption warns for 1.65 seconds, expands to 130 radius at high tier and reaches 4.5× damage. | Avoid magma trails; disengage from the corpse; dodge the blast, use cover or defend. The corpse blast happens once, and its warning survives the caster's death. |
| **Vortex** | Repeated collision-respecting pulls are followed by a separately warned central collapse, up to 4× damage. Pressure comes from forced positioning and timing, not another tracking bomb. | Dodge a pull; leave before collapse; guard or ward collapse; kill the caster to cancel it. Pulls honor invulnerability and supported displacement immunity and cannot move actors through walls. |
| **Bulwark** | Individual guard phases commit facing and preserve 35% frontal damage intake. Three frontal guarded hits provoke a clearly warned 170-radius counterstrike cone, up to 4× damage, followed by a guard recovery opening. | Attack behind committed facing or during recovery; use existing AoE/DOT bypass; stop frontal spam; evade or guard the counterstrike; kill the caster to cancel it. |
| **Regenerator** | An uninterruptible 1.8-second chant restores up to 12% own HP and supports wounded enemies within 180 range by up to 4%, sharing a hard lifetime budget of 30% of caster max HP. Hits, DOT, control and proximity cannot cancel the chant. | Kill the caster before completion to prevent healing. Deal sustained damage to exhaust its limited reserve; there is no infinite healing budget. |

Minor trails, major disruption, critical attacks and execution attacks have distinct danger metadata. Critical/execution warnings add urgency marks and text. Pixel magma, ice crystals, artillery descent, fire/debris and lightning effects reuse the existing renderer and audio mixer. Hazard instructions render above foreground walls, frost state appears below the player, and impact effects leave the next warning visible. Existing camera shake remains disabled by the game's established setting.

## Combinations and safeguards

- **Freeze + Artillery:** full freezing triggers an explicit, fixed 1.4-second frozen-execution warning instead of standalone Shatter. The earlier buildup can be prevented; a paid thaw dodge, escape or correctly timed defense remains available afterward.
- **Waller + Artillery:** containment and chamber setup precede acquisition; artillery can operate while its caster's walls remain active. Only the caster's own conjured barriers are ignored for ground-spell acquisition; actual terrain, arena walls and other casters' barriers remain cover.
- **Waller + Freeze:** frost builds inside actual containment, making early gap recognition and resource conservation important.
- **Waller + Freeze + Artillery:** restricted to compatible existing optional high-level champion assignment. Actual scripted encounters produced simultaneous walls, frost and a frozen-execution tell, not an unannounced simultaneous burst.
- Vortex is excluded from Waller/Freezer pairings; Bulwark is excluded from Regenerator. Different nearby casters wait on dangerous local control/critical effects rather than creating an uncontrolled execution pileup. Unrelated distant encounters can continue.
- A maximum of 24 world hazards and 6 per caster bounds runtime objects. Follow-ups start next update so long frames do not consume their warning immediately. Death, world changes, reset, actor streaming and safe zones dispose of appropriate effects and collision. Control and retreat do not cancel committed hazards. Frost/attack clocks are not serialized.
- Both host and couch-coop use swept, radius-aware movement on every map. Weapon/class projectile paths and line-of-sight use exact barrier rectangle clipping, preventing thin walls from being skipped between frames.

## Actual tests

| Requested scenario | Evidence performed |
|---|---|
| A — Freeze | All three stages; immobilized movement; actual Shatter damage; paid thaw dodge; guarded buildup; cleanse; seven-second recovery |
| B — Waller | Real barriers and gap; terrain rejection; actor safety; continuous walking captured and struck; collision at large movement steps; chamber hit; control persistence and caster-death cleanup |
| C — Artillery | Stationary and uninterrupted walking failures; honest lock coordinates; late timed dodge; silence fails to cancel; caster death cancels; invulnerability; teaching-tier retreat |
| D — Freeze + Artillery | Actual frozen execution, severe failed response and successful immediate thaw/retreat |
| E — Waller + Artillery | Outside caster at 150 and 300 distance bombards while walls remain; actual Ghostwalk through gap; real Root Prison preserves bombardment; cover; Oathkeeper ward + Block; failed containment |
| F — Multiple elites | Five competing casters; bounded hazards; minimum refreeze interval; successful invulnerability windows; active gap/dodge policy |
| G — Different builds | All six standard classes, Classless and Eldritch with normal progressed resources; timed dodge with Block removed; ignored execution kills; Lightbringer shields; actual Dawnblade ward/parry; actual Oathkeeper guard skill + Block |
| H — Progression | Beginner ordinary retreat; quest-critical execution cap; geographic stats; deterministic assignment; compatible rare triples; existing dungeon population, events and final boss return portals |

- `verify-elite-hazards.mjs`: **15 groups passed**, including real skill-cast counters, 40 modifier/control persistence cases, death cancellation, immutable shell launch origin, fast projectile collision and untargeted-party stamina pressure. [Results](verification.json).
- Independent `critical-review-elite-hazards.mjs`: **8 groups passed**, zero remaining blocking findings in tested cases. [Full independent results](critical-review.json).
- `verify-elite-defenses.mjs`: **10 groups passed**, covering damage defense parity, actual caster reflection, clocks and swept host/coop collision. [Results](defenses-verification.json).
- Browser encounter pass: **11 modern elite/combination scenarios**, actual timed dodge and thaw, no page errors or missing resources. The combined visual captures reset observer health between frames to show the full sequence; they are not survival evidence. [Browser results](browser-verification.json).
- Existing enemy combat: **16 simulation checks**, plus browser playback across **15 archetypes, 8 bosses, 8 elite modifiers**, 57 loaded assets and 60 captured frames, with no errors.
- Existing enemy density: **20 checks across 35 entrance/floor cases**, including events, rewards, save/load, arena locks and return portals.
- Existing regression checks passed: progression 23 checks/88 class-level cases; Block/five-slot hotbar 10; hotbar mastery 89 skills; summon recovery 6; damage scaling 7; Gravecaller sustain 12. Hellish wall rendering retains zero camera drift and art/collision agreement.
- Melee combo regression passed all 8 groups covering 9 weapon styles, 50 weapons, 18 rapid-tap simulations and unchanged heavy attacks.

Independent refinement rounds found and corrected: defense bypass and thin-wall movement; static Waller escape and caster sight blocked by owned walls; frost/counter text overlap, weak impact presentation and screenshots taken after death. The final continuous-walk Waller test records **369 damage**. A normal-resource player survived an 18-second triple using the legal gap and timed dodges. All eight playable starts survived a timed champion impact with Block removed; ignoring it killed each. A progressed Oathkeeper survived through Bulwark of Light + Block with exhausted stamina and broken guard. No unmeasured 9/10 rating is asserted.

## Limits and performance

These are deterministic gameplay simulations and direct automated browser playback/visual inspection, not a human controller playtest or proof of every campaign encounter. Beginner hazards intentionally remain walk-avoidable; advanced artillery and containment are the hard checks. A legal wall opening is retained rather than creating a truly sealed or destructible cage. There is no through-wall teleport, blanket immunity, new resistance-item system or new boss framework. Ten legacy authored/fallback labels were audited and preserved, not claimed as overhauled current hazards; see [audit](AUDIT.md).

The 40-elite/1,200-tick coordinator stress test stayed bounded. Full existing density simulation covered a 325-enemy dungeon with 22 enemies in the occupied combat room; measured update p95 was approximately **2.23 ms** in an initial run (the latest measured values remain in `../enemy-density/verification.json`). Browser mixed-combat rendering measured **18 ms p95** for 15 actors. These workloads do not guarantee consistent 60 FPS across the campaign or every hardware configuration. No warning particles are added to an unbounded world queue.

Exact source backups: `backups/elite-hazards-2026-10-11/`. A fresh practice panel is available at `/enemy-combat-lab.html`, with advanced single modifiers and combinations in its encounter selector; it does not modify saved characters.

12 October follow-up: the live browser game loop also passed 40 modifier/control combinations (eight modifiers × five control forms), confirming release through control and caster-death cleanup. The updated Regenerator caption and its warning/completion captures were checked with no page errors or missing resources. Current evidence is in `../elite-visual-cues/field-guide-verification.json`. Source backups: `backups/elite-no-interrupts-2026-10-12/`.
