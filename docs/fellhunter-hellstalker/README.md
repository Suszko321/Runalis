# Fellhunter · Hellstalker pass

Hellstalker now plays as a mobile demonic caster. The current [Fang & Hellfire pass](../fellhunter-identity/README.md) provides the complete skill mapping, measured timings, balance samples and verification. This page also retains the bow integration notes.

## Combat

- Every one of the 15 skills has an authored form: hellfire bolts, cinder lances, demonic seals, ash fissures, brimstone eruptions, hellchains, malice orbs, hellstars and rift escapes.
- Direct hits apply one 1.8-second Infernal Brand per caster and enemy, ticking every 0.3 seconds. At most one Ember is gained every 0.4 seconds, up to three. Burn ticks do not apply another brand, grant resources or earn mastery.
- Burn ticks use 32%, 41% or 50% of the strongest qualifying hit power at one, two or three Embers. Prepared casts cause Flashover, resetting the brand to one Ember. Refreshing a brand does not postpone its next tick.
- Hits grant 1.25 seconds of Cinder Pace. Casting exposes the hunter to 10% more incoming damage for five seconds; overlapping casts refresh rather than stack that penalty. Successful zero-damage defenses still prevent damage.
- Demonic Ascendance grants six seconds of hotter new brands and the empowered weapon bonus, without a ward. Hellfire Bolt restores six Spirit on a damaging hit to fund larger spells. All casts retain their Spirit costs, without health costs or new healing.
- Mobility respects terrain. Vaulting Shot retreats and shoots forward. Fields replace earlier casts from the same skill. Volley arrows share the Ember cadence. Lesser foes can be briefly trapped; bosses are slowed instead of immobilized. Pulls respect heavy enemies and bosses.
- Damage retains existing progression, equipment, mastery and class-only Expertise scaling. Relevant Marked Shot, volley and trap damage perks apply to the infernal forms; trap setup, hook range, volley coverage and relevant area perks remain useful.

## Presentation and bows

Native effects use black fire cores, ember red, orange and pale hot edges. Orbs, demonic seals, fissures, meteor-like hellstars and rift trails give the caster a distinct silhouette. Ember pips remain small and readable. Four synthesized cues distinguish casting, impact, Flashover and mobility.

All 12 equipped bow items now use the correct intrinsic sprite direction, including faction bows. Aim follows the actual charge or committed shot direction, rotates about the wrist and preserves the existing body/arm/leg animation. Code-native fallback bows retain their authored orientation.

## Actual checks

`verification.json`: nine runtime scenarios using real player creation, morph selection, casting and combat updates. Includes all 15 casts, burn expiry/ramp, volley cadence, prepared Flashover, resources, no cast mastery, incoming exposure, mobility/terrain, fields, boss control, empowerment, tree investment and Expertise. A protected snapshot compares 45 Original/Bloodhound/Witchhunter definitions exactly.

`browser-verification.json`: real browser casts and captures for all 15 skills; 384 bow renders across 12 items, two body types, four directions and idle/walk/draw/release; eight effect geometries with zero camera drift; four distinct offline audio renders without clipping; no page errors or missing resources. Captures were visually inspected. These are focused practice encounters and deterministic checks, not a claim of an entire campaign playthrough.

The source backup is under `backups/hellstalker-bows-2026-10-13/`. Skill mastery continues to come exclusively from earning XP with the skill on the hotbar.

`regression-verification.json`: all 20 related checks passed, covering the protected Garden/Grave forms and new Petalknight sprites; Acolyte beam and Soul Siphon; the Fae channel, flower field and summons; Gravecaller sustain; hotbar mastery; elite hazards; Cryomancer, Sunken and Oathkeeper; morphs and Expertise; core combat; melee rigs, side walking, south-facing arms and skill art.
