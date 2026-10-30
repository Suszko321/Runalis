# Mobile Rose Eruption charge reliability

The touch controller previously depended on `pointerup`, `pointercancel` or
`lostpointercapture` reaching its root element. If the terminating notification
was lost, its pointer map continued reporting Thorn Lash as held. The combat
charge then reached level two and waited indefinitely for release, retaining the
charged pose and blocking actions such as held block.

The failure was reproduced in the actual mobile game with native browser touch
input: suppress the skill's pointer-end/capture-loss notifications while allowing
the physical `touchend` to arrive. Before the fix, both the touch Held flag and
the full ability charge remained active after the finger lifted; no cast or
cooldown was recorded.

Touch controls now observe pointer termination at the window capture phase and
also reconcile ownership against the contacts in physical touch-end/cancel
events. Touch targets identify the original control, so a skill release clears
its own ownership while a separate movement or aiming finger remains active.
Normal release produces the existing charged cast; cancellation clears it
without spending Spirit or starting cooldown. Reused pointer IDs cancel their
previous control ownership, and a failed capture request still permits global
release cleanup. Listeners and ownership maps are removed with the controls.

This fixes the shared mobile input lifecycle. Rose Eruption's charge time,
damage, area, costs, cooldown and morph identity retain their existing rules.
A genuinely held finger may still aim a full charge until it is released.

## Verification

- `tools/verify-rose-eruption-mobile.cjs`: actual Petalknight eruption and damage,
  native tap/full charge, missing pointer termination, continued movement with a
  second finger, missing cancellation notifications, capture failure, reused
  IDs, insufficient resources followed by a successful retry, eight repeated
  casts, interrupted focus and rotation/resize. No browser errors. Pointer-loss
  conditions are injected; this is a browser reproduction rather than physical
  iOS/Android device verification.
- `tools/verify-acolyte-urn-mobile.cjs`: ten repeated Urn taps, charge/channel
  handoffs, touch cancellation, pause/resize and save/load remain functional.
- `node tools/verify-rose-eruption.mjs`: real tap/partial/full charge, damage and
  area, wound timing, terrain, dodge cancellation and Expertise remain correct.
- `node tools/verify-acolyte-urn-input.mjs` and
  `node tools/verify-combat-tempo.mjs`: shared charge behavior and skill switching
  remain correct.

Browser tools use `RUNALIS_NODE_MODULES` for Playwright and `RUNALIS_URL` for the
local preview. Generated captures and verification JSON in this folder are ignored.
