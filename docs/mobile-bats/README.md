# Mobile Bat Beast sprite repair

Verified November 1, 2026.

The royal source atlas was 5,376 × 560. The allied summon copied that entire
image into a canvas and read its pixels to recolour it at runtime. Under a
4,096-pixel canvas-side limit, `getContext('2d')` returns null and the summon
throws while drawing. The oversized source also creates unnecessary mobile
texture and memory pressure for the boss and player form.

This is a confirmed controlled reproduction, not a capture from the user's
physical phone. Older iOS used a 4,096 limit; WebKit raised it to 8,192 in 2024,
so the restriction does not apply to every modern iOS device. See the
[WebKit change](https://bugs.webkit.org/show_bug.cgi?id=271002).

## Repair

- Ordinary runtime atlas: 384 × 480. Royal and allied runtime atlases: 448 × 560.
- Four distinct poses per row are stored once. All original 16/48 timing slots
  map to their exact original pixels, preserving animation, palette and pivot.
- The allied silver-blue palette is exported ahead of time, preserving the old
  recolour and alpha. Rendering allocates no palette canvas or pixel readback.
- New compact asset names avoid reusing cached wide sprite URLs. Original source
  sheets remain available for authoring; gameplay does not request them.
- Royal boss presentation fits the viewport width; HP/nameplate offsets follow
  that scale. Combat sizes, mastery, damage, saves and encounter timing are intact.

Rebuild assets with `node tools/pack-mobile-bat-atlases.cjs`. Supply
`RUNALIS_CANVAS_MODULE` pointing to an installed `@napi-rs/canvas`, or use the
existing local authoring installation. The tool checks every one of the 432
source timing slots for raw pixel equality before export.

## Verification

`node tools/verify-mobile-bats.cjs --reproduce-before` serves the previous
renderer from Git revision `8bd4398`, reproduces its null-context failure under
a 4,096-side guard, then checks the fixed production renderers in Chromium and
WebKit. A local server defaults to port 8772; override with `RUNALIS_URL`.
Supply Playwright through `RUNALIS_PLAYWRIGHT_MODULE` if necessary.

Four profiles pass: both engines at 390 × 844 and 844 × 390, touch/mobile mode,
device pixel ratio 3. Coverage includes ordinary bat, player royal form, royal
boss, five summon mastery sizes, source crop bounds, correct sheet identity,
portrait boss fit, no wide asset requests, no oversized canvas and no page errors.
Screenshots are captured beside this document and visually reviewed.

Existing bat/royal animation browsers, palette/alpha evolution browser, mastery
and four-owner persistence model, Vampire gameplay/browser and actual Veyreign
encounter/browser pass. Engineering gate: 11/11. Publication build passes.
This is browser emulation and a deterministic legacy-limit reproduction;
physical iOS/Android hardware remains untested.
