# Summon mastery evolution · November 1, 2026

All eight persistent summon abilities now have visual growth at **skill mastery 1, 5, 10, 20 and 50**. These are the Call Bat Beast milestones, not character/combat levels. The last visual stage is bounded; progression and combat scaling continue normally beyond 50.

## Coverage

| Skill / variant | Evolution presentation |
| --- | --- |
| Thornling pack · Fae | Four new authored bodies around the retained mastery-10 Thornling; biped thornwood spirit identity |
| Elder Thornbeast · Fae | Four new authored bodies around the retained mastery-10 antlered elder; quadruped stag identity |
| Elder Thornbeast · Petalknight | Four new authored Rose Siegebeast bodies; the shipped rose-armoured boar remains the mastery-10 middle stage |
| Thornling pack · Petalknight | Five nearest-neighbour size stages of the Rose Sentinel; preserves its twelve-pose animation |
| Standard Thornling pack / Elder Thornbeast | Five size stages of their existing authored bodies |
| Summon Wolf, including sovereign/dire variants | Five size stages retaining the existing allied palette, pact marker and variant |
| Demon Summon | Five size stages retaining its allied palette and attack poses; equipment requirement unchanged |
| Raise the Bound Dead · Standard / Acolyte / Deathknight | Subsequent [Gravecaller art pass](../gravecaller-evolution/README.md): four new drawn stages per form around the retained midpoint, including equipment-aware skeleton bodies |
| Summon Lich · Standard / Acolyte / Deathknight | Subsequent [Gravecaller art pass](../gravecaller-evolution/README.md): four new drawn stages per form around the retained midpoint |
| Eldritch Horror and its existing forms | Five size stages of the existing combat-selected body |
| Call Bat Beast | Existing five-stage royal lineage and allied palette; see [bat production contract](../bat-mastery-evolution/README.md) |

The original three newly authored families contain **48 new poses**, with idle, two walk poses and attack per new evolution. The subsequent Gravecaller pass adds **96 more**. Other families retain sprite-size evolution, as with the existing bat growth system. Legendary temporary procs, hostile creatures and unrelated NPCs have no persistent summon-skill mastery and keep their existing presentation.

## Art inspection and exports

Before generation, `inspect.cjs` assembled the shipped Standard, Fae, rose, wolf, demon, Bound Dead, lich and horror sprites into `current-sprites.png`. `references.cjs` extracted the actual Fae palette variants and rose sprites at nearest-neighbour 2× resolution. Both the contact sheet and individual references were visually inspected.

Used built-in ImageGen with those local identity/style references; exact prompts are in [PROMPTS.md](PROMPTS.md). Original shipped files were not overwritten. Masters:

- `assets/art/source/summon-evolution/fae-thornling.png`
- `assets/art/source/summon-evolution/fae-elder.png`
- `assets/art/source/summon-evolution/rose-siegebeast.png`

Runtime exports are PNG/JSON pairs under `assets/art/sprites/`, named `summon-evolution-fae-thornling`, `summon-evolution-fae-elder` and `summon-evolution-rose-siegebeast`. Each has four columns and four rows for mastery 1/5/20/50; the mastery-10 body uses the original atlas. Fae uses the exact 13-color bark/foliage/outline ramp. Rose uses 40 colors selected from the shipped Siegebeast. Packing extracts connected poses, normalizes the elder's left-facing second stride, applies one scale per stage across all four poses, aligns feet at y=138, quantizes to the source palette, and exports alpha 0/255 with empty cell borders. No background halos enter the game.

`node tools/pack-summon-evolution.cjs` reproduces exports using `RUNALIS_CANVAS_MODULE` or the local `tmp/bat-evolution/node_modules/@napi-rs/canvas` authoring dependency. Runtime does not depend on this package. Source masters and PNG review captures follow the project's existing ignored-authoring-file policy; runtime exports remain tracked.

## Runtime contract

`summonEvolution.js` stamps visual mastery/tier when a summon is created and during the existing owner update. Each actor reads the canonical source skill, so pack and elder mastery remain separate. Rendering uses host-stamped mastery for remote actors whose owner skill map is unavailable. Existing online snapshots already serialize the complete summon object; no new protocol or save schema is required.

`evolutionStage`, summon path, roles, equipment, identity, owner, count, damage, health, armour, collision, healing, cost and cooldown remain owned by existing combat systems. Visual growth does not replace or heal a living creature. Other existing forms scale by 0.75/0.875/1/1.125/1.25 around their ground pivot with image smoothing disabled. Newly authored families use their packed stage sizes. Fae wings remain and grow with the body. Rendering consumes state without mutating gameplay.

## Verification

- `node tools/verify-summon-evolution.mjs`: milestone boundaries including invalid/high values; six additional persistent kinds; serialized guest metadata; temporary proc exclusion; health/identity/stat preservation. Real creation, live mastery changes, separate pack/elder sources and save/load/recast for Standard, Fae and Petalknight in **each of four player slots**.
- `node tools/verify-summon-evolution-browser.cjs`: production renderer, **15 forms/variants × five tiers**; every tier has a different image and strictly increasing visible height. All 48 authored crops are selected correctly for idle/walk/attack, palettes stay bounded, alpha is hard and cell borders are clear; no actor mutation or browser errors. Saves `runtime-all.png`, `runtime-thornbinder.png`, `browser-verification.json` here.
- Existing Fae, Petalknight art, lich, Bat mastery and Bat browser regression suites pass, along with 90 movement scenarios, 12 positioning checks, summon recovery and summon thorns. Engineering gate **11/11** and production build pass (**336 startup modules; 899 game files, 39.3 MiB**).

Physical-controller play, a real network session, subjective animation review in prolonged combat, and human balance testing were not performed. Automated browser evidence covers real production renderers; it is not a claim of a completed human playtest.
