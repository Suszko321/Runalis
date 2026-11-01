# Initial art department review — 2026-10-31

The [Art Bible](../RUNALIS_ART_BIBLE.md) and [living register](../RUNALIS_VISUAL_AUDIT.md)
are the durable outputs. The [generated inventory](inventory.md) records the
measured sheet contracts. No runtime source, gameplay data or art export changed
during this assessment. Existing historical guides were linked to the new Bible.

## Evidence collected in this workspace

The PNG/JSON evidence below is local review output, intentionally ignored by the
repository's existing `.gitignore`; the Markdown findings and player hash list
are versionable. A fresh checkout will need new captures. These images are actual
Canvas/DOM renders, not concept mockups. The scene contact sheet is reduced for
navigation; individual scene files are the actual 1100 × 700 review canvas.

| Review | Evidence | Result / limit |
| --- | --- | --- |
| Player and equipment/material reference | [Character workshop](characters.png), [enemy production gallery](enemies.png) | Base body and outfit silhouettes reviewed; workshop's blank humanoid slots are ART-007, not absent live enemies |
| World | [Scene overview](scene-contact.png), `scene-0.png` through `scene-11.png` | 12 deterministic scene renders; zero invalid source crops, failed requested textures or smoothed `drawImage` calls in those samples |
| Orrakai / forest | [Orrakai](scene-0.png), [Smithy district](scene-1.png), [Hollow Road](scene-2.png) | Strong masonry/timber/foliage references; spatial scale reviewed with the player |
| Regional transitions | [Ashen Orchard approach](scene-3.png), [Pilgrim Bridge](scene-4.png), [Lantern Marsh](scene-5.png), [Castle Veyr approach](scene-6.png) | Simpler ground/water and sparse scene detail remain candidates, not permission to redraw geography |
| Dungeon themes | [Mine](scene-7.png), [Grave](scene-8.png), [Holy](scene-9.png) | Character/floor contrast and props inspected; these generic dungeons do not stand in for every authored boss dungeon |
| Wider regions | [Aureate Marches](scene-10.png), [Ascension Wastes](scene-11.png) | Marked contrast between simple regional dressing and dense town art; ART-006 |
| Enemy matrix | `browser-review.json` | 84 configurations: 7 poses × 4 facings × 3 lighting modes, 39 reference actors, 14,697 image draws; zero invalid crops |
| Class casts | [Holy](cast-oathkeeperBastionBash.png), [Fellhunter](cast-fellhunterBearTrap.png), [Gravecaller](cast-graveSpark.png), [Thornbinder](cast-thornbinderSeedReliquary.png), [Water](cast-hydromancerWellspring.png), [Eldritch](cast-eldritchCrimsonConduit.png) | Six successful equipped casts, twelve test enemies each, production world renderer; crowded packs are stress arrangements, not ordinary encounter composition |
| Desktop creator | [Fresh 1440 × 900](creator-desktop-fresh.png) | Dossier 789 × 746 CSS pixels; no internal overflow in this sample |
| Narrow desktop | [Resized 390 × 844 desktop](creator-mobile.png) | Crowded fixed-column reading/morph layout; despite the historical filename this is **not** a fresh touch-device capture |
| Touch landscape | [Fresh 844 × 390](creator-touch-fresh.png) | Coarse pointer, device scale 2; dossier 392 × 305 CSS pixels with matching scroll dimensions |
| Touch portrait | [Rotation recommendation](touch-portrait-rotate.png), [explicit portrait fallback](creator-touch-portrait-fresh.png) | Used the real Continue in portrait button; dossier 163 × 773 CSS pixels, no internal overflow. Layout is narrow/tall; no blanket mobile failure is inferred |
| Actual main game | [Fresh Oathkeeper opening](main-game.png) | Created an isolated browser profile through the real creator; opening scene, HUD, minimap and hotbar render without page errors |

Browser evidence used local Microsoft Edge headless, isolated browser contexts,
and `http://127.0.0.1:8766/`. No real browser profiles/saves were opened. The world
lab used a fixed random seed and explicit calls to `render.draw`; combat used
the existing proving-ground API and the current `updateCombat(player, world,
input, dt, now, log)` signature. The older world-art combat harness passes that
signature incorrectly; its report should not be treated as a freshly rerun check.

Local one-off capture harnesses remain in `tmp/capture-art-foundation.cjs` and
`tmp/review-art-ui.cjs`. They are evidence collectors, not additional runtime
renderers or required project infrastructure.

## Checks actually run

| Command | Result |
| --- | --- |
| `python tools/verify-art-foundation.py --report docs/art-audit` | Pass: 71 sheets / 1,786 allocated cells, dimensions, occupied cells except declared canopy spares, pivots, source rectangles, eight player hashes; five contextual warning sheets |
| `node tools/verify-animation.mjs` | Pass: 19 weapon moves, 90 signature ability profiles, four directions, 191,836 finite samples; continuity, recovery endpoints and input preservation |
| `node tools/verify-dungeon-character-runtime.mjs` | Pass: Mother/Custodian 16 timed windup positions, release, recovery, hit/death and shared presentation clocks |
| `python tools/verify-dungeon-character-art.py` | Pass: four 60 × 80 families, 384 populated cells, hard alpha and per-state variation; held frames are intentional |
| `node tools/verify-art-coverage.mjs` | Pass: 331 items, 74 weapons, 57 animated armor entries and 90 skill icons resolve to supported families; not unique art approval |
| Local browser captures / matrix / cast checks | Pass: 12 scenes, 84 matrix cases, six casts, no page errors or failed requests in the main capture run; fresh desktop/touch creator checks also logged no page errors |
| `npm run build` | Pass: 326 startup modules bundled; 865 files / 38.9 MiB staged; resource paths and filename case validated |
| `git diff --check` | Pass; Git reports normal LF/CRLF conversion notices for historical Markdown |

Use a Python installation with Pillow. The machine's bare `python` alias pointed
to the Microsoft Store, so this run used the bundled Python executable discovered
through workspace dependencies. Existing Node tools emit a package-module-type
warning; their assertions completed successfully. No package setting was changed
to suppress it.

## Reproduce the meaningful gates

From the project root, with Node and Python/Pillow available:

```text
python tools/verify-art-foundation.py --report docs/art-audit
node tools/verify-animation.mjs
node tools/verify-dungeon-character-runtime.mjs
python tools/verify-dungeon-character-art.py
node tools/verify-art-coverage.mjs
npm run build
python tools/serve.py 8766
```

Open `world-lab.html` at the local address and select the twelve labels above;
use `enemy-visual-lab.html` for the current enemy route and lighting/pose controls.
Use `combat-overhaul-lab.html?skill=hydromancerWellspring` (or the other cast IDs)
for effect review, then inspect the effect through the production scene renderer
when checking occlusion. Use `index.html` for the real creator, home-screen prompt,
portrait recommendation/fallback and opening. These labs preserve user profiles.

After an actual art change, run the relevant existing family checks rather than
automatically rerunning the entire historical test collection. Do not regenerate
old source inventories or replace preservation baselines to conceal failures.

## What this assessment does not certify

No new assets were painted or replaced; no claim of production-ready art is made.
The audit inventories the full installed sprite set and maps the visual systems,
but visual inspection is representative. It does not cover every story state,
quest, late-game boss phase, save migration, outfit, dialogue portrait, weather,
interrupted skill, long co-op session or physical device.

The numerical animation checks do not prove animation weight, temporal stability
or responsive feel. The static browser matrix does not prove every transition.
Fractional scaling and cell-edge contact are verified conditions whose full
visible impact still needs issue-specific motion review. No new performance
benchmark was needed for documentation and an offline validation script; old
world-art timing measurements remain historical, not freshly certified hardware
results. Build success does not prove every dynamically constructed asset URL.

Future corrections should start with the register's stated acceptance criteria
and leave this initial evidence available for comparison.
