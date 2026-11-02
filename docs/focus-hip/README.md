# Focus size and anatomical hip attachment

All nineteen existing/new Spirit focuses and grimoires now render at75% of their
previous world size. The correction lives at the common equipped-art boundary,
so future `spiritFocus` items use it too. Inventory icons, projectile size,
non-focus weapons, original raster sources and gameplay statistics are unchanged.

Idle, walking and running attach the item to the anatomical right hip. Facing
south exposes it on screen-left; facing north moves it to screen-right. East
draws it in front of the body, and west draws it behind the body so only an edge
may show. The attachment follows the existing body/root bob, not the swinging
wrist, and does not switch anatomical sides between held frames. One equipment
draw occurs per frame. Redundant back-sheathed hints cannot duplicate it.

Attacks, casts, summons, charging and guarding retain the established action
attachment and use the smaller model. Existing arm ownership, original body
silhouette, movement clocks, attacks, damage and hitboxes remain authoritative.

## Visual evidence

Both bodies, idle front/east/back/west:
[older books](idle-page-1.png), [Legendary books](idle-page-2.png),
[focuses1](idle-page-3.png), [focuses2](idle-page-4.png), [focuses3](idle-page-5.png).
[Legendary book four-frame east/west gait](../legendary-weapons/grimoires-gait.png).
These are ignored local production-render captures, not alternate runtime art.

## Verification

- `verify-focus-hip-art.mjs`: nineteen items, 5,472 idle/walk/run hip samples,
  both bodies/four heads/four facings; 608 active action samples remain off the
  hip; exact25% world-size reduction, fixed attachment transformed with the actual
  body/root, one draw per frame, correct body depth, redundant-sheathed isolation
  and actor immutability. Thirty-eight pixel comparisons confirm east is more
  exposed than west. Another1,216 samples cover four full armour/mantle ensembles,
  both bodies and all east/west held frames.
- `verify-focus-hip-browser.cjs`: all nineteen items acquired/equipped, 1,368
  Chromium production samples across both bodies, all facings and idle/walk/run;
  correct depth order, one model per frame and no missing resources/page errors.
- Legendary weapons browser:520 renders, all20 equipped pieces/icons and five
  normal-game family captures. Existing boss-armory browser covers all19 distinct
  projectile identities and152 direction/weight cases. One earlier normal-profile
  run timed out waiting for the fixture profile load control; a repeat passed.
  The cause of that initial timeout is unconfirmed.
- Engineering11/11/build; Legendary weapon/boss-armory combat/save/ownership/
  ascension tests; 8,960 Legendary weapon art samples; 3,776 Legendary locomotion
  samples; 23,136 melee rig samples and64 stance weapons pass. No physical-device
  or human motion-feel certification is implied by these contracts.
