# Royal Blood Beast — mandatory second form

Both Alistair and the repeat-run Greater Vampire transform when the human health
bar reaches zero. The four-second transformation keeps the arena sealed, cancels
the old attack, protects the changing body, and refills a separate feral bar at
its end. No first-bar kill rewards, dungeon completion, exit portal, or curse
offer are granted. Melee, spells, damage over time, summons and legendary splash
use the same transition boundary rather than treating it as an enemy death.

| Party | Human HP | Royal Beast HP |
| --- | ---: | ---: |
| 1 | 14,000 | 23,000 |
| 2 | 28,000 | 46,000 |
| 3 | 43,400 | 71,300 |
| 4 | 58,800 | 96,600 |

Feral base attack damage is 92 before party/attack modifiers (human base: 68).
The beast stalks players at 100 world units per second between attacks and has
shorter recovery windows. Its health bands increase aggression further.

- **Tides of the Crimson Crown:** three staggered, advancing blood annuli with
  visible rotating escape gaps. Each wave can damage each actor once.
- **The Royal Butchery:** wide, close-range talon sweep.
- **Blood Calls to Blood:** frozen blood marks target all living party members.
- **The Sovereign Descends:** telegraphed long hunting dive and smooth rush.
- **An Empire of Hunger:** devastating outer blood field with an inner safe zone.

Only the final feral defeat runs the normal victory/reward pipeline. First-run
Alistair's personal kill/curse decision and repeat-run suppression remain intact.
Saving during transformation or feral combat preserves the form, remaining HP,
party scaling and sealed arena. A wipe resets the entire encounter to a healthy
human form; it does not consume the one-time opportunity.

## Dedicated art

`veyreign-royal-blood-beast.png`: native 60x80 cells, 48 frames per state, seven
states (transformation, idle, anticipation, execution, recovery, hit, death),
12 fps. Native integer pixel geometry with crimson membranes, exposed blood
heart, ivory wing spines/talons/fangs and antique-gold crown/regalia. Animation
includes wing spreading, repeated wingbeats, stance weight shifts, attack poses,
recoil and collapsed/fading death. Generated reproducibly by
`tools/build-veyreign-royal-beast.py`; no ordinary Bat Beast sprite is enlarged
as a substitute. Integer display scales adapt to compact and desktop viewports.

The cinematic adds rising blood ribbons and expanding royal seals. Feral camera
framing follows the player and the beast's upper body, with bounded offsets.
The existing boss HUD remains authoritative; duplicate head nameplates are hidden.
Traveling blood-wave visuals and damage use the same radii and escape gaps.

## Verification

- `node tools/verify-veyreign-feral.mjs`: first/repeat encounters for 1–4 players,
  no early rewards or portal, saved transformation, exact second pool, final-only
  completion, first-only offer, full wipe reset, delayed damage and safe evasion
  for all five mechanics, including the moving blood wave's escape gap.
- `tools/verify-veyreign-feral-browser.cjs`: real keyboard weapon hit empties the
  first bar; transformation frames render; saved transition resumes sealed;
  royal form/waves render at desktop and compact viewport; no browser errors.
- Existing Veyreign progression and real WebRTC guest tests now defeat both forms
  before the curse choice. Guest-only transformation consequence still persists.
- Main-campaign progression, Malakar exits and boss-return portal regressions pass.

Progression tests inject final damage to cover both endings and save states.
These are implementation and visual checks, not a four-human normal-play victory
or a claim of final balance tuning.
