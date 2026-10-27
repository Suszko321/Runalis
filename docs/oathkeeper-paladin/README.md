# Oathkeeper · The Vow's Arsenal

Floating pixel swords, expanding contact shockwaves, layered smite and judgment rings support Oathkeeper's Blunt combat. Original attack timings and three-part mace combos remain intact. Holyknight and Sinner now follow the [current identity and balance pass](../oathkeeper-identity/README.md).

## Hallowed Blades

An optional two-point class-tree skill, available after either early melee doctrine. It follows the existing mastery thresholds and Abilities morph selection. Original and both morphs are available without final Expertise commitment.

| Form | Identity | Spirit before mastery | Cooldown |
| --- | --- | ---: | ---: |
| Original · Hallowed Blades | Three gold-and-steel swords; committed strikes and returns | 24 | 18s |
| Holyknight · Swords of the Radiant Host | Four broad radiant swords; small shockwaves hit up to two extra foes | 27 | 19s |
| Sinner · Swords of the Forsaken Vow | Three black, violet and ivory grave-swords; sacrifice 2% current health once, leave at least one, and splinter into up to two nearby foes | 25 | 18s |

Each formation lasts eight seconds and launches one sword every 0.8 seconds, after a visible 0.18s individual windup. Each blade commits to its launch destination, so moving targets can evade it. Terrain and conjured walls block acquisition and flight. Returning blades cannot damage enemies. One formation replaces another; swords do not stack into an unlimited army. They are spell entities, not new companion summons.


## Art and impact


Primary mace contact, finisher shockwaves and trails follow the final Oathkeeper Expertise, or the dominant Oathkeeper morph family on the hotbar before that choice. This is cosmetic; it does not impose a fixed subclass or affect mixed skill selection. Individual skill effects keep their own morph identity.


## Verification actually performed

- All 52 Oathkeeper skill forms cast in the real browser combat lab; mace contacts and heavy/light poses checked in all four directions (16 captures).
- Four live floating-sword demonstrations, 32 sword directions, 16 sword states and eight new effect variants checked for camera anchoring. Primary mace contacts and finisher shockwaves checked in all four morph styles.
- Twelve sword sound cues rendered to audio samples: each non-silent, distinct and below clipping. Existing eight mace/miracle sound samples also verified.
- All 26 regression scripts passed, covering class morphs, Expertise, other class passes, hotbar-only mastery, elite hazards, player body proportions, melee combos, class information and previews.
- No browser errors or missing assets in either Oathkeeper browser check. A renderer-only stress check covered 18 existing fields over 100 frames; this and the isolated combat simulation are not claims of whole-game performance.

Reports: [focused combat](verification.json), [floating swords and sounds](browser-verification.json), [all Oathkeeper forms and mace poses](../oathkeeper-blunt/browser-verification.json), [regression checks](regression-verification.json).

This is focused automated combat and direct browser/render verification, not a complete campaign playthrough or a long-term balance assessment. The live preview and combat lab support further playtesting with normal resource limits. The preview automatically recasts and uses high resources for demonstration; the actual skill obeys its cooldown and costs.

Pre-edit backups: `backups/oathkeeper-paladin-2026-10-13/`.

Current mastery choices and regression results: [two-path catalogue](../subclass-reduction/README.md).
