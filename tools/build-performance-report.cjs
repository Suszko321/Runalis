const fs=require('node:fs'),crypto=require('node:crypto');
const read=file=>JSON.parse(fs.readFileSync('docs/performance/'+file,'utf8'));
const before=read('baseline/benchmark.json'),repeat=read('baseline-repeat/benchmark.json'),after=read('final/benchmark.json');
const streamBefore=read('streaming-before/benchmark.json'),streamAfter=read('streaming-final/benchmark.json');
const regression=read('regression.json'),gate=read('regressions/results.json');
const fmt=n=>Number(n).toFixed(2),ms=n=>Number(n).toFixed(1),mib=n=>fmt(n/1048576);
const start=(r,k)=>{const a=r.startups.filter(s=>s.kind===k&&s.repeat>0);return a.reduce((n,s)=>n+s.loadMs,0)/a.length;};
const range=(a,b)=>`${ms(Math.min(a,b))}–${ms(Math.max(a,b))}`;
const files=['main.js','ui.js','skillTreeSystem.js','terrainRenderer.js','minimapHud.js','continentTiles.js','enemyVisualProfiles.js','spriteArt.js','humanEquipmentSprites.js'];
const hashes=Object.fromEntries(files.map(file=>[file,{original:crypto.createHash('sha256').update(fs.readFileSync('docs/performance/original-src/'+file)).digest('hex'),optimized:crypto.createHash('sha256').update(fs.readFileSync('src/'+file)).digest('hex')}]));
fs.writeFileSync('docs/performance/source-hashes.json',JSON.stringify(hashes,null,2));
const rows=after.scenarios.map((s,i)=>`| ${s.name} | ${range(before.scenarios[i].frames.meanMs,repeat.scenarios[i].frames.meanMs)} | ${ms(s.frames.meanMs)} | ${range(before.scenarios[i].frames.p95Ms,repeat.scenarios[i].frames.p95Ms)} | ${ms(s.frames.p95Ms)} | ${range(before.scenarios[i].fps,repeat.scenarios[i].fps)} → ${ms(s.fps)} |`).join('\n');
const heapRows=after.scenarios.map((s,i)=>`| ${s.name} | ${mib(repeat.scenarios[i].heap.usedSize)} | ${mib(s.heap.usedSize)} |`).join('\n');
const streamRows=streamAfter.streaming.map((s,i)=>`| ${s.name} | ${ms(streamBefore.streaming[i].firstDrawMs)} | ${ms(s.firstDrawMs)} | ${ms(streamBefore.streaming[i].refreshMs)} → ${ms(s.refreshMs)} |`).join('\n');
const ground=regression.checks.find(s=>s.name.startsWith('same-world')),art=regression.checks.find(s=>s.poses),geometry=regression.checks.find(s=>s.checked),leaks=regression.checks.find(s=>s.heaps),classify=regression.checks.find(s=>s.name.startsWith('enemy visual'));
const doc=`# Runalis performance assessment — October 12, 2026

The measured pass improves startup, steady frame pacing and dense combat while retaining the existing content, world scale, encounter population, combat clocks, effects and artwork. It removes measured first-visit CPU/readback costs, but complete cold-view timings remain variable. Cold continental generation and first visits to complex Echoryn scenes still cause pauses; these are quantified below.

**Architecture and measurement.** The shipped project uses Canvas 2D, ES modules and a JavaScript simulation, rather than Babylon.js. There are no application-owned 3D meshes, shader programs, lights, shadow maps or WebGL scenes to instance or dispose. Production entry is main.js; render.js orchestrates terrain, objects, actors, combat, atmosphere and HUD. Continental terrain is virtualized over 2,764,800 cells with 80 collision chunks and 64 decoration chunks; active residency uses the existing radius of two entity chunks. No radius, population, detail or update frequency was reduced.

Benchmarks use local headless Edge ${after.browser}, a 1440×900 browser viewport, the unchanged 960×600 game canvas, scale factor 1, fresh browser contexts and a seeded RNG. ANGLE selected Intel Iris Xe with D3D11; Canvas 2D and GPU compositing were enabled. The machine also reports an RTX 4050, but these results are for the selected Intel path. Frame samples are independent of CPU sampling and tracing. Each scenario has ${after.frames-1} frame intervals; raw files retain all means, percentiles, maxima, object/enemy counts, errors and heap measurements. Two original-source runs show substantial host/scene variability, so both baseline values are reported. The final main benchmark had no concurrent test workloads. This is a local benchmark, not a frame-rate guarantee on other machines.

Startup means below use the two unprofiled cold-context trials. The separately profiled first trial is retained in JSON and excluded from the headline startup means. Loading is request-to-observed-rendered-frame after the game starts, including the harness polling/rAF overhead; module navigation time is recorded separately.

| Startup | Original (ms) | Final (ms) |
| --- | ---: | ---: |
| New journey / caravan | ${range(start(before,'new'),start(repeat,'new'))} | ${ms(start(after,'new'))} |
| Continental saved world | ${range(start(before,'saved'),start(repeat,'saved'))} | ${ms(start(after,'saved'))} |
| Orrakai saved world | ${ms(start(repeat,'capital'))} | ${ms(start(after,'capital'))} |

| Production scenario | Original mean frame (ms) | Final mean frame (ms) | Original p95 (ms) | Final p95 (ms) | Original → final FPS |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows}

The combat fixture generates four-player encounter density with ${after.scenarios[2].enemies} enemies and ${after.scenarios[2].peakEngaged} simultaneously engaged enemies. One protected measurement actor keeps the encounter alive; real elite hazards execute. It measures the production AI/render loop and does not certify four-controller survival balance. The movement scenario exercises ordinary keyboard movement; the separate first-visit test crosses many streaming regions.

**Prioritized fixes and evidence.**

| Priority | Measured bottleneck | Implementation |
| --- | --- | --- |
| 1 | Cold new-game construction spent roughly 0.84 s generating a discarded continent; saved-game construction repeated destination generation. Orrakai loading also generated an unused continental fallback. | main.js initializes the caravan placeholder, lets save migration build its destination once, and reuses the valid capital grid. New/Orrakai startup makes zero continental creation calls; continental saves make one. |
| 2 | Every 0.2 s, closed menus rebuilt character, skill, inventory and quest DOM. Skill migration repeatedly scanned 270 nodes for each known ability. Baseline UI samples consumed about 0.8 s per 5 s. | Periodic rendering requests a HUD-only pass. Opening a menu refreshes its selected panel and keeps ownership metadata. Explicit menu actions retain their full refresh path. A first-match ability-to-node index replaces the repeated scan. |
| 3 | Dense-combat ground repeated base, transition, texture/noise and detail construction every frame. | terrainRenderer.js caches the same ground pixels in 8×8-tile chunks, with a tile halo, tile-field fingerprints, art-ready/context invalidation and a 32-entry LRU. Actors, effects, lighting overlays, atmosphere and telegraphs remain in their original live layers. |
| 4 | The minimap traversed thousands of string-index terrain Proxy traps every frame; terrain reads repeatedly touched the same LRU entry. | minimapHud.js uses numeric terrain access; continentTiles.js retains the most recently used chunk. Packing avoids per-field entry-pair allocations. Mutation overrides and existing bounds remain authoritative. |
| 5 | Repeated faction/model classification became visible in follow-up combat profiles. | enemyVisualProfiles.js uses a WeakMap with all classification inputs and boss phase checked on every lookup. No enemy simulation state or save fields are added. |
| 6 | First-visit profiling exposed expensive getImageData readbacks for each recolored character and all-clearing scans during cell generation. | spriteArt.js reads each neutral fitting source once on a dedicated readback surface; rendered canvases retain their existing path. continentTiles.js indexes authored clearings in spatial buckets while retaining the exact circle test. humanEquipmentSprites.js parses palette colors once per generated atlas and avoids per-pixel arrays/ramp copies. |

The deterministic warm-ground comparison uses the same world, camera and canvas: ${fmt(ground.timings.filter(s=>s.label==='original').reduce((n,s)=>n+s.meanMs,0)/2)} ms → ${fmt(ground.timings.filter(s=>s.label==='optimized').reduce((n,s)=>n+s.meanMs,0)/2)} ms per ground pass. Canvas calls fall from 900 drawImage + 2,418 fillRect operations to 20 drawImage operations; all texture/detail pixels are retained. This is the ground layer only, not the entire frame. Repeated visual classification compares 32,500 lookups per trial; individual timings are in regression.json.

First-visit samples deliberately jump into cold views, forcing more simultaneous chunk/atlas work than ordinary walking. These timings are CPU submission durations for drawing the world and minimap, rather than measured GPU presentation time. Both final streaming runs use CPU sampling; these first-visit samples are single trials and should not be treated as statistical percentiles.

| Cold view | Original first draw (ms) | Final first draw (ms) | Residency refresh original → final (ms) |
| --- | ---: | ---: | ---: |
${streamRows}

Cold-view totals are not uniformly improved: the last bridge, Veyr and Zarynth trials were slower. A previous final-source trial measured 79 ms at Hollow Road, 45.1 ms at the orchard and 80 ms at the bridge, compared with 137.4, 106.8 and 160.3 ms in this final pair. These are observed CLI timings from a completed run, rather than retained full trace files. They demonstrate why a single cold-view value should not be presented as a reliable smoothness guarantee. The separately sampled readback/clearing functions and exact-output checks support the targeted changes; further work is needed to make cold-view frame pacing reliable.

**Memory, rendering and GPU limits.** Post-GC retained JavaScript heap is essentially stable, rather than a large memory-reduction claim:

| Scenario | Original repeat (MiB JS heap) | Final (MiB JS heap) |
| --- | ---: | ---: |
${heapRows}

Five destroy/load cycles retain ${mib(Math.min(...leaks.heaps.map(s=>s.usedSize)))}–${mib(Math.max(...leaks.heaps.map(s=>s.usedSize)))} MiB after forced GC. This short test finds no accumulating multi-megabyte JavaScript leak; it does not prove long-session or native/GPU leak freedom. Ground caches use WeakMap world ownership, release evicted surfaces, and add at most 12.5 MiB of bitmap pixels per live world. The neutral fitting sources are shared through weak image ownership. Existing terrain/decor caches, sparse encounter memory, atlas caches, effect cleanup and the stopped game loop were inspected and exercised through their existing regression paths. Native canvas/texture/driver memory is not equivalent to JavaScript heap and was not directly measured.

The final dense trace includes raster, layout, paint and GC events in final/dense-combat-trace.json. RasterTask maximum is ${ms(after.traceSummary.RasterTask.maxMs)} ms; MinorGC maximum is ${ms(after.traceSummary.MinorGC.maxMs)} ms and MajorGC maximum is ${ms(after.traceSummary.MajorGC.maxMs)} ms. Thread-event totals overlap and are not GPU frame times. The evidence identifies substantial main-thread work and a specific GPU-to-CPU readback stall; it does not establish that GPU execution is never a bottleneck. Shader compilation/mesh/particle-system tuning is inapplicable to this Canvas build.

**Regression evidence.** The new browser suite has ${regression.checks.length} groups, ${classify.checks} visual-identity/phase equivalence cases, ${geometry.checked} terrain-cell comparisons, ${art.poses} walking-pose comparisons and ${art.armour} armour atlas comparisons. Character/armour pixels, four minimap views and production dungeon ground match the original exactly. Synthetic terrain and atlas-ready transitions allow a one-level channel-rounding difference from offscreen compositing (the observed differences are at most a few channel values per image); there is no geometry/detail reduction. Tile edits, ready-state changes, fractional cameras, LRU bounds, menu freshness/ownership, load counts and retained heap are checked.

The final gate records ${gate.suites.filter(s=>s.pass).length} passing suites in regressions/results.json with individual logs. Coverage includes current continental roads/streaming/revisits/saves, capital interiors/services, enemy content/stats/equipment, attacks and elite hazards, combat/progression/mastery, 16 skill trees, locomotion, 64 menu views, controller ability input at three viewport sizes, and rendered examples of 15 enemy archetypes, eight bosses and eight modifiers. Enemy-overhaul checks cover 132 worlds / 5,084 enemy records with zero simulation-stat changes. No assets or enemy counts were removed.

One pre-existing failure is retained: verify-echoryn.mjs reports “lost hungryShrine” against both the original and final source. It compares the old entire-map fixture to the current resident object list at spawn. The shrine is retained in continentRuntime.allObjects (and is found by its stable ID). The current streaming/collision/content tests pass. The obsolete fixture should be migrated separately; it was not weakened to make this pass green.

**Remaining work.**

1. Cold continental construction still has a roughly one-second main-thread task. Deferring its creation improves the caravan/capital entry immediately, but does not remove the work when the continent is actually needed. A separately designed worker or staged immutable-blueprint preparation is the next likely loading improvement; published world overrides and persistent state must remain on the correct lifecycle path.
2. Cold Echoryn first visits still cost tens of milliseconds, with the bridge stress sample reaching ${ms(streamAfter.streaming.find(s=>s.name==='bridge').firstDrawMs)} ms. Budgeted preparation of ground/character variants before their first visible frame needs further profiling and pixel checks. No shortened draw distance or missing placeholder content was introduced.
3. Per-frame player migration, minimap fills, object/actor presentation, recurring layout and first-time atlas uploads remain visible costs. CPU sampling after each targeted change should determine the next fix; there is no evidence here that reducing combat simulation frequency is required.
4. Run a long real-player session and four-controller combat/traversal on target hardware, including fullscreen/device scale changes, repeated dungeon/town returns, and a save with substantial exploration memory. Measure native/GPU memory and actual presented frames there. The automated protected actor and short retained-heap tests do not replace those checks.

**Reproduction and artifacts.** Start the no-store local server with \`python tools/serve.py 8768\`. Point RUNALIS_NODE_MODULES at a dependency directory containing Playwright and @napi-rs/canvas; the project already uses this convention. Then run:

\`node tools/profile-runalis.cjs current\` — startup, production scenarios, CPU profiles and screenshots.

\`RUNALIS_REFERENCE=1\` selects the preserved original modules; \`RUNALIS_STREAM_ONLY=1\` selects first-visit streaming; \`RUNALIS_TRACE=1\` adds the dense trace; \`RUNALIS_HEADFUL=1\` enables a visible browser for manual investigation. In PowerShell set these with \`$env:NAME='value'\` and clear/reset them between modes. Browser automation requires permission to launch Edge outside restricted sandboxes.

\`node tools/verify-performance-regressions.cjs\` — logged current regression gate, with the known original-source Echoryn failure explicitly classified.

Raw results: [initial baseline](baseline/benchmark.json), [second baseline](baseline-repeat/benchmark.json), [final](final/benchmark.json), [first-visit original](streaming-before/benchmark.json), [first-visit final](streaming-final/benchmark.json), [pixel/regression results](regression.json), [gate results](regressions/results.json), [source hashes](source-hashes.json). The original modified modules are preserved in original-src; the reference harness serves them at their original module URLs without replacing the working source. One incomplete browser timeout was excluded from reported results. Screenshots and CPU profiles are alongside each benchmark JSON.

Browser references: [Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), [readback context option](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext), [Chromium CPU profiler protocol](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/).
`;
fs.writeFileSync('docs/performance/README.md',doc);console.log('Wrote docs/performance/README.md and source-hashes.json');
