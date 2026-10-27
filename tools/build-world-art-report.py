"""Assemble the saved art review evidence and refresh production previews."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, statistics
root=Path(__file__).resolve().parents[1];out=root/'docs/world-art'
load=lambda name:json.loads((out/name).read_text())
packing=load('creature-packing.json');before=load('before.json');after=load('after.json');live=load('live.json');cont=load('continental-after.json');checks=load('verification.json');enemies=json.loads((out/'enemies/browser-validation.json').read_text())
names=[r['name'] for r in packing]+['echoryn-forest-kit','echoryn-canopies']
for name in names:
 image=Image.open(root/f'assets/art/sprites/{name}.png').convert('RGBA');preview=root/f'assets/art/sprites/{name}-preview.png'
 if preview.exists() and not (root/f'backups/world-art-2026-10-18/{name}-preview.png').exists():
  import shutil
  shutil.copy2(preview,root/f'backups/world-art-2026-10-18/{name}-preview.png')
 background=Image.new('RGBA',image.size,'#272b2b');draw=ImageDraw.Draw(background)
 for y in range(0,image.height,8):
  for x in range(0,image.width,8):
   if (x//8+y//8)%2:draw.rectangle((x,y,x+7,y+7),fill='#343a36')
 background.alpha_composite(image);background.convert('RGB').save(preview,optimize=True)
inventory=[]
for path in sorted((root/'assets').rglob('*.png')):
 im=Image.open(path);inventory.append({'path':path.relative_to(root).as_posix(),'width':im.width,'height':im.height,'bytes':path.stat().st_size})
(out/'asset-inventory-final.json').write_text(json.dumps(inventory,indent=2))
oldBytes=sum(r['bytesBefore'] for r in packing)+(root/'backups/world-art-2026-10-18/echoryn-forest-kit.png').stat().st_size
newBytes=sum(r['bytesAfter'] for r in packing)+(root/'assets/art/sprites/echoryn-forest-kit.png').stat().st_size+(root/'assets/art/sprites/echoryn-canopies.png').stat().st_size
group=lambda stage,key:statistics.median(r[key] for r in live if r['stage']==stage)
summary={'date':'2026-10-19','redrawnCreatureFrames':sum(r['framesRedrawn'] for r in packing),'creatureAtlases':len(packing),'retainedAnimationRows':sum(len(r['rejectedRows']) for r in packing),'forestDrawings':12,'largeCanopyExports':6,'nativeSceneryFamilies':30,'nativeSceneryConfigurations':checks['drawings'],'protectedFiles':checks['protectedFiles'],'playerPixelComparisons':enemies['originalPlayerPixels'],'sceneComparisons':checks['identicalScenePopulations'],'equipmentRenders':enemies['playerEquipment']['renders'],'liveMedianFrameMs':{s:group(s,'medianFrameMs') for s in ['before','after']},'localStartupMs':{s:group(s,'startupMs') for s in ['before','after']},'runtimeSpriteBytesBefore':oldBytes,'runtimeSpriteBytesAfter':newBytes,'runtimeSpriteByteDelta':newBytes-oldBytes,'extraRuntimeAtlasRequests':1,'observedSceneryCacheBytes':max(r['artCache']['cacheBytes'] for r in cont['results']),'worldErrors':after['errors'],'continentalErrors':cont['errors'],'enemyErrors':enemies['errors']}
(out/'summary.json').write_text(json.dumps(summary,indent=2))
text=f'''# Runalis world art implementation and validation

Completed implementation and rendered review, October 18–19, 2026.

[Open the visual comparison gallery](index.html) · [Art direction](ART-DIRECTION.md)

## Delivered changes

- Retained the original 64 × 80 player atlases, scale, anatomy, fitting and animation code. {checks['protectedFiles']} protected files retain their original SHA-256 hashes; all 16 original/final player renders match pixel for pixel.
- Redrew all {summary['redrawnCreatureFrames']} frames across nine main creature/boss atlases using the player as the style reference. Species, silhouettes, weapons, phase order, frame counts, cell sizes and foot pivots remain associated with their original identifiers. No rejected/clipped animation rows remain in production.
- Redrew twelve forest-kit drawings and exported six large canopies directly from the generated master at 256 × 304 per cell, rather than enlarging the small sprites. Four good original forest cells remain: two sparse/dead trees and the exact seamless cliff modules.
- Replaced continental three-world-pixel scenery with native one-world-pixel drawings across 30 families and eight regional styles. Added legible timber grain, restrained stone courses, fittings, useful door proportions, distinct regional structures, retained open-front shelters, and quieter court paving. Existing good raster building kits remain.
- Refined earth texture and broken road verges in Echoryn, native continental ground detail, staggered low-contrast paved roads, and inside-bank pixel shore treatments. All geography, collision cells, roads and landings remain unchanged.
- Unified NPC, enemy, companion, player, prop and tree depth ordering using ground anchors. Kept the character renderer's existing +18 visual foot offset. Ground dressing precedes loot and ground combat effects; building cutaways and canopy readability remain active. Tall boss culling uses visual height.
- Replaced continuously sheared small plants with held one-pixel sway. Player movement and camera motion remain continuous.
- Capped scenery caching at 16 MiB; observed {summary['observedSceneryCacheBytes']/1048576:.2f} MiB across nine continental scenes. Courts reuse native material swatches instead of allocating a 14 MiB capital floor. Twelve native continental terrain chunks retain the previous 27 MiB maximum of forty-eight half-resolution chunks.

## Deliberately retained

NPC identities, dialogue, gear, existing humanoid variation and the shared player rig were already integrated. They remain intact. Existing equipment, class-specific VFX, summons, day/night, weather, practical lighting and established architectural landmarks remain the authoritative systems. The wolf companion automatically inherits its newly redrawn source row through its existing allied palette. No extra particle populations or dynamic-light systems were added.

The inspected engine is Canvas 2D with a 2.5D presentation, rather than Babylon.js. Rendering changes therefore target the actual canvas/atlas paths. This work does not convert the game, introduce a new renderer, rewrite world generation or rebalance combat.

## Verification evidence

| Check | Result |
|---|---|
| Original player source and animation preservation | {checks['protectedFiles']} file hashes unchanged; 16/16 rendered comparisons identical |
| Production scene comparisons | 21 original/final scenes; identical positions, object IDs/populations and enemy records |
| Main creature and boss atlases | 113 frames, unchanged contracts, hard alpha and padding; generated clipping repaired before import |
| Enemy motion/render matrix | 84 pose/facing/light combinations, 39 reference actors, 14,697 image draws, zero invalid source rectangles |
| Equipment fitting | 1,344 renders; no empty equipment; seven distinct former-faction uniforms; bounded caches |
| Item and animation catalogues | 331 items, 74 weapons, 57 animated armor entries, 90 skill icons; 191,836 finite motion samples |
| Creature/gameplay regression suite | 132 worlds, 5,084 enemy records, 221 identities, 15 archetypes; no simulation changes |
| Continental runtime | Seven real-world groups pass: routes, gates/returns, streaming, progression, encounter persistence, bounded revisits, resource timers |
| Native scenery | 240 configurations; nonempty binary-alpha drawings, exact requested sizes, no input mutation |
| Combat effects | Six successful class casts against twelve actors each through the production renderer |
| Atmosphere | All seven dungeon themes and two additional night scenes rendered without errors |
| Live main game | Six isolated overworld launches and frame samples, no runtime errors or profile access |

The save-free world, enemy and combat laboratories are linked from the gallery. Screenshots are actual rendered production paths; individual source sheets are supplementary evidence.

## Performance and load cost

Three alternating original/final live-game trials used the same spawn, viewport, seed, 155 active objects and 13 enemies. Median-of-trial median frame intervals were **{group('before','medianFrameMs'):.2f} ms originally / {group('after','medianFrameMs'):.2f} ms finally**. Local startup medians were **{group('before','startupMs'):.0f} / {group('after','startupMs'):.0f} ms**. These are local Edge headless samples, not a broad hardware certification or a claim of faster startup.

The modified runtime sprite payload increased from {oldBytes/1048576:.2f} to {newBytes/1048576:.2f} MiB, a net {summary['runtimeSpriteByteDelta']/1024:.0f} KiB, with one additional canopy atlas request. Source-generation masters, backups and previews are not loaded by the game. No enormous runtime textures were introduced. Per-scene warm Canvas drawing measurements and live frame samples are saved as JSON beside the gallery; a crowded enemy-only gallery remains a CPU microbenchmark, not whole-game FPS.

## Existing fixture failures and remaining limits

- `verify-world-overhaul.mjs` expects 36 authored locations while the present original world has 78. The same assertion fails against the pre-change source snapshot.
- `verify-orrakai.mjs` expects the old `lightbringerTrainer` in its historical content fixture. It fails identically against the pre-change source. Class rosters and NPC content were preserved instead of changing them to satisfy that obsolete expectation.
- Animation frame budgets and event timing are retained. This pass cleans and registers the existing poses; it does not supply new eight-direction creature cycles or add frames to combat attacks.
- Equipment and many supporting props continue to use established shared art families. The 240 scenery configurations are systematic native drawings, not 240 separately hand-painted illustrations.
- The production review is representative rather than an exhaustive playthrough of every quest/save/weather combination. High-DPI displays, mobile browsers, low-end GPUs and prolonged late-game multiplayer combat still need hardware-specific visual/performance review. Some optional foliage/cloth motion and class VFX intentionally retain soft light around crisp cores.

## Production files and reproduction

Generated art used the built-in image tool, without an API/CLI fallback. Accepted sources and native masters live under `assets/art/source/*-cohesion*.png`; production sprite identifiers stay under `assets/art/sprites/`. The large canopy source is `assets/art/sprites/echoryn-canopies.png`. [Creature prompts](CREATURE-PROMPTS.md), [repair prompts](CREATURE-REPAIR-PROMPTS.md), [forest prompt](FOREST-PROMPT.md), packing manifests and the complete asset inventory are retained here.

Original changed source, PNGs, manifests and previews are recoverable in `backups/world-art-2026-10-18/`. The workspace's pre-existing `.git` directory does not contain a usable Git repository; no commit or branch was created.

Run the local preview server and these checks:

```text
python tools/serve.py
node tools/review-world-art.cjs before
node tools/review-world-art.cjs after
node tools/review-continental-art.cjs before
node tools/review-continental-art.cjs after
node tools/verify-world-art.cjs
node tools/verify-world-art-enemies.cjs
node tools/review-world-art-combat.cjs
node tools/review-world-art-lighting.cjs
node tools/review-world-art-live.cjs
node tools/capture-world-art-creatures.cjs
```

Use `RUNALIS_NODE_MODULES` for the existing Playwright dependency convention. Python packing/report tools require Pillow. Original and final capture tools restore original source/PNG responses in isolated browser pages; they do not rewrite production files or access real profiles.
'''
(out/'IMPLEMENTATION.md').write_text(text,encoding='utf-8')
html=(out/'index.html').read_text(encoding='utf-8').replace('src="enemies/after.png"','src="creatures-after.png"');(out/'index.html').write_text(html,encoding='utf-8')
print(json.dumps(summary,indent=2))
