# Gravecaller drawn summon evolutions · November 1, 2026

Replaces the earlier size-only Gravecaller presentation with **96 newly authored poses**: four new stages × four poses × six forms. Mastery milestones remain **1 / 5 / 10 / 20 / 50**. All six original sprites remain the mastery-10 middle stage. Skill unlock and morph gates are unchanged: having artwork for mastery1 does not make a mastery5/10 morph available early.

| Skill | Form | Evolution identity |
| --- | --- | --- |
| Raise the Bound Dead | Skeleton Henchman | Plain bones → reinforced ribs → veteran cranial ridges → ancient bone crest; runtime equipment stays separate |
| Raise the Bound Dead · Acolyte | Bound Specter | Walking charcoal-hooded sickle wielder, developing layered burial cloth and spectral ribs |
| Raise the Bound Dead · Deathknight | Lesser Goliath Knight | Bronze/brown infantry, progressing to heavier burial plate; cleaver and buckler throughout |
| Summon Lich | Standard Lich | Dusky purple caster, developing a bone-trimmed mantle, hood and blue-crystal staff |
| Summon Lich · Acolyte | Ghostly Specter | Floating ivory/blue-grey shroud, increasingly layered mantle and trailing cloth; teal soul lantern throughout |
| Summon Lich · Deathknight | Goliath Deathknight | Dark iron/bronze plate, increasingly elaborate horned helm and crimson mantle; greatsword throughout |

Each new stage has idle, two travel poses and attack. The greater specter glides. The existing simulation-driven `gravecallerMotionPose` supplies frames, facing and bob; redraws do not advance movement or attacks. Bones are generated unarmed, with stable body proportions for equipment overlays. Growth then applies to the whole equipped actor. Bare skeletons use a smaller default sword; actual equipped weapons retain their existing rendering. Corrected the skeleton charm call to pass its item ID, as required by the existing trinket renderer.

## Inspection and production

`references.cjs` extracts all four shipped poses at nearest-neighbour 2× size. All six reference strips were viewed before generation: `skeleton-reference.png`, `bound-specter-reference.png`, `bound-knight-reference.png`, `lich-reference.png`, `lich-specter-reference.png`, `lich-knight-reference.png` here. They capture the real skeleton-forge, Bound Dead and greater morph sheets, plus the Standard Lich row from summons-core.

Used **built-in ImageGen** with these local identity/style references. Exact prompts: [PROMPTS.md](PROMPTS.md). Selected masters are saved under `assets/art/source/gravecaller-evolution/`, named `skeleton.png`, `bound-specter.png`, `bound-knight.png`, `lich.png`, `lich-specter.png`, `lich-knight.png`. Runtime PNG/JSON pairs are saved under `assets/art/sprites/` with the same six names prefixed `grave-evolution-`. No existing asset is overwritten.

`node tools/pack-gravecaller-evolution.cjs` mechanically extracts sixteen connected body poses per source, merges nearby small fragments, derives a shared 32-color palette from the corresponding shipped reference, applies nearest-neighbour scaling and packs four columns × four rows for mastery1/5/20/50. Frames have alpha0/255, clear cell borders and a stable ground pivot. Each stage uses one scale across its poses. The skeleton's rightmost body edge retains the original forge attachment alignment; the wider cell contains its reaching arm without clipping. Other forms allocate extra cell width for attack weapons.

Authoring uses `RUNALIS_CANVAS_MODULE` or the local `tmp/bat-evolution/node_modules/@napi-rs/canvas`; this is not a runtime dependency. Source masters and review PNG/JSON files follow the existing ignored authoring-file policy. Runtime PNG/JSON exports are tracked project assets.

## Runtime and ownership

`summonEvolution.js` selects a Gravecaller art family from kind and morph, independently of combat `evolutionStage`. `gravecallerEvolutionArt.js` renders the five non-skeleton families. Standard skeletons stay in `codeAssets.js`'s equipment-aware path, including marksman bows and legacy knight gear. At mastery10 every form follows its original body path.

Both skills retain their independent source mastery. Evolution updates in place through the existing owner synchronization: no replacement, healing, damage/armour modifier, collision change, altered role, taunt, cooldown or summon count. Existing save and online summon fields preserve mastery, identity, gear and owner; no schema or protocol change. Snapshot-stamped mastery chooses the same art even when the remote owner's skill map is absent.

## Verification

- `node tools/verify-gravecaller-evolution.mjs`: six forms × four local slots × five milestones; both skills coexist and evolve independently. Actual spawn uses valid morph unlock mastery; lower visual tiers are exercised on the already-created actor. Identity, health, armour, morph, path, owner and equipment remain intact. Wire-cloned actors choose the same presentation, and save/load/recast restores the final stage.
- `node tools/verify-gravecaller-evolution-browser.cjs`: **360 production-renderer cases**, covering six forms plus equipped skeletons, marksmen and legacy knight gear; five tiers × four poses × both facings. Verifies all 96 authored pose selections, original midpoint retention, equipped layers, strict visible growth, no clipped frames, palettes ≤32 colors, hard alpha, empty cell borders, no actor mutations, missing requests or page errors. Evidence: `runtime.png`, `runtime-all.png`, `browser-verification.json` here.
- General summon evolution model and 75-case browser suites pass. Existing Gravecaller sustain (12), lich (14), positioning (12), movement (90 scenarios) and recovery suites pass.
- Engineering gate **11/11**; production build **337 startup modules; 912 files, 39.9 MiB**.

Human controller play, prolonged subjective animation review and a real online session were not performed. Browser evidence checks production rendering and synthetic ownership/snapshot cases, not a completed human multiplayer playtest.
