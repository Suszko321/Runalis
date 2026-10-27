# Elite effects: visual and sound pass

All eight active modifiers and four special phases now use distinct pixel sigils, ground patterns, motion, palettes and short sound motifs. The existing accurate collision outlines, enemy cast poses, sound mixer and elite sequencing remain in place.

Open the [interactive field guide](http://127.0.0.1:8768/docs/elite-visual-cues/) to compare warning/impact captures and play each warning sound. Practice real timing in the [combat lab](http://127.0.0.1:8768/enemy-combat-lab.html). Reload the game to load the new cues.

| Effect | Recognizable anticipation and release |
|---|---|
| Freezer | Snowflake sigil, six branching frost veins, inward-moving ice and rising crystals; bright ice chimes |
| Shatter | Ice-crown sigil, converging crystal teeth and a sharp frozen burst; brittle high notes |
| Waller | Chain sigil, linked basalt teeth, bright lock edges, fire-crowned stone and an unobscured gap; stone/chain pulses and a committed lock cue |
| Infernal Chamber | Infernal sun, magmatic floor fractures and rising flame jets; low infernal warning/eruption |
| Artillery | Crosshair sigil, broken acquisition reticle, solid target clamps, a visible ballistic shell and smoke/embers, followed by fire/debris; mechanical acquisition and descending launch whistle |
| Shocker | Lightning sigil, charged parallel lane circuits and caster/end-point sparks; branching electrical release and crackling notes |
| Vortex | Spiral sigil, three rotating inward arrows and a dark centre; descending suction tones |
| Vortex Collapse | Black-star sigil and tightening, inward energy before implosion; deeper collapsing tones |
| Molten | Flame sigil, dark-to-bright magma veins, embers, bubbles and low fire; rough flame/hiss motif |
| Magma Eruption | Volcanic crown, corpse-centred cracks, rising flame jets and eruption debris; heavy volcanic rumble |
| Bulwark | Shield sigil, three frontal guard-charge pips, forward counterstrike chevrons and golden impact; metallic guard and strike motifs |
| Regenerator | Branch sigil, growing rune buds, rising leaves and foliage links to wounded nearby allies, followed by a short completion bloom; separate healing chant/completion/caster-defeat cues |

The caster's elite aura now matches the modern modifier rather than falling back to generic purple. Waller's redundant inner caption was removed. Symbols and urgent captions render above foreground walls; the frozen-state instruction remains below the player. Circle urgency accents are limited to circular hazards: lightning lanes and counterstrike cones retain their actual silhouettes.

Artillery snapshots both its locked destination and its launch origin. A moving caster cannot drag the already launched shell. Fixed follow-ups snapshot their origin at creation. The shell's arc remains decorative; actual damage is released only at the committed marker/time.

## Readability and response time

Timing was assessed alongside how conspicuous and potentially obscured each cue is. Damage, enemy HP, resistances, skill costs and defensive mechanics were preserved.

| Cue | Current minimum warning | Reason |
|---|---:|---|
| Freezer | 1.35 s | Recognize ground growth before the existing staged buildup starts |
| Shatter | 1.15 s | Bright crown and crystal convergence make the committed strike clear |
| Waller | 1.30 s | Retains 0.80 s acquisition and 0.50 s visible lock for advanced walls |
| Infernal Chamber | 1.35 s | Extra recognition time for a floor cue inside a fire wall |
| Main Artillery | 1.40 s; beginner 1.65 s | Retains 0.80 s advanced tracking and 0.60 s locked flight; it remains a timed defensive check |
| Committed Artillery follow-up | 1.05 s | Immediate solid reticle and explicit launch make the already committed follow-up legible |
| Frozen Artillery execution | 1.40 s | Preserve the explicit thaw/defense window |
| Shocker | 0.95 s; beginner 1.20 s | Large charged lane is conspicuous; crossing reprises now receive at least 0.95 s |
| Vortex / Collapse | 1.35 / 1.00 s | Allow time to read direction change before pull/implosion |
| Molten pools/trails | 1.15 s | Low floor effects can be obscured by actors and other combat cues |
| Corpse Magma Eruption | 1.65 s | Corpse clutter merits more time to recognize the fatal eruption |
| Bulwark counterstrike | 1.00 s | Frontal guard-charge and chevrons give a clear response window |
| Regenerator | 1.80 s chant | Existing channel length retained, with clearer target/support identity |

Readable warnings do not turn every attack into a walking escape. Advanced committed artillery still catches ordinary uninterrupted walking; the universal paid dodge, real cover, killing the caster and sufficiently strong defenses remain answers. Wall gaps, freeze recovery and combination sequencing remain intact.

## Verification and limits

- Browser captures used actual production updates and rendering for **12 effect families**, warning and impact phases, Waller/Artillery lock phases and the real wall/frost/frozen-artillery combination. Late-phase observer captures refill health so effects remain visible; these are not survival claims.
- Twelve warning motifs were rendered through the existing mixer into `OfflineAudioContext`, exported as WAV examples, checked for nonzero output/no clipping and distinct waveform hashes. Audio recipes include separate warning, lock/launch, impact, guard and cancellation phases (caster defeat or lifecycle cleanup, not crowd-control interrupts). This is waveform/event verification, not a human listening review.
- Each symbol has a unique pixel mask. Opaque-ground camera comparisons check the actual presented image; pixel-stepped world-space patterns have zero drift. No warning particles are added to the world's effect queue.
- Actual production events were checked for every warning and impact, plus artillery launch, wall lock and guard activation. A 120-frame paint sample of the actual triple encounter measured 9 ms median and 16 ms p95; this is a limited rendering workload, not a full campaign FPS guarantee.
- Gameplay regressions passed: **15 elite groups** including immutable launch origin; **8 independent gameplay-review groups**; **10 defensive groups**; **16 enemy combat groups**; **20 density groups across 35 entrance/floor cases**; summon recovery remains unchanged.
- The independent source/visual reviewer identified the moving launch origin and duplicate wall caption; both were corrected. No subjective 9/10 score or human controller/listening test is claimed.
- The field guide was checked at desktop and small widths: all 12 pictures in both phases and all 12 playable sound files load. The real healing completion bloom was captured and confirmed to expire after its brief presentation window.

Detailed browser/audio measurements are in [verification.json](verification.json). Source backups are in `backups/elite-visual-cues-2026-10-11/`. Older authored/fallback modifier labels are retained separately, as documented in the preceding overhaul audit.

## Uninterruptible modifiers — 12 October follow-up

All eight modifiers continue through crowd control. Regenerator also continues through strong hits and nearby companions; its caption now says “HEALING · KILL THE ELITE”. Caster death cancels active effects; the existing Molten on-death eruption remains. The live browser game loop passed 40 modifier/control combinations, and updated healing captures show the revised cue. Dodge, defenses, wall gaps and cover remain valid damage avoidance. Current evidence: [field-guide-verification.json](field-guide-verification.json).
