# Live charge aiming

The host input path now resolves aim every gameplay frame, including during
ability charges and heavy weapon holds. Desktop aiming retains the cursor's
screen position and projects it through the current camera each frame. This
fixes stale world targets when the camera moves without a mousemove event.
Explicit cursor/touch facing also survives movement, which previously replaced
it with the walking direction. Ground-targeted abilities retain the actual
pointer target rather than an artificial point 160 units ahead.

Controller aim uses right stick, then movement stick, then the last direction.
Normalized controller input retains its direction when passed into the charging
combat path; neutral right-stick values cannot claim priority over movement.
A fresh mouse movement can aim while a connected gamepad's sticks are idle;
moving either stick restores controller aim without a stale cursor snapback.
The right-stick values and pointer-active flags are cleared when their sources
change so a previous aim source cannot silently win the next frame.

Mobile uses a separate touch on the game world for explicit aim. A held touch
can drag continuously, including while the movement and skill fingers are held.
A quick tap survives for one gameplay frame, even between rendered frames.
When the aiming finger is lifted, movement takes over immediately; when idle,
the character retains the last aim. Controls and UI are excluded. A small ring
shows the world-aim finger, and cancellation/interface/focus changes clear it.
Dialogue touch behavior is preserved.

Heavy weapon releases also sample the latest input on the release frame rather
than only the direction sampled on the preceding held frame.

## Verified

- `node tools/verify-live-aim.mjs`: five checks covering priority, real pointer
  target preservation, actual charged Water Torrent steering and release on
  mouse/touch, normalized controller charging, and heavy-attack steering.
- `node tools/verify-live-aim-browser.cjs`: nine checks using the real game
  loop, native mouse/keyboard, simulated controller input, and native three-finger
  touchscreen input. Covers charging while walking opposite to aim, stationary
  cursor/camera reprojection, release direction, stick fallback, world-touch
  dragging, touch release fallback, and quick taps.
- Existing combat overhaul, combat tempo, Block/hotbar, mobile browser and
  opening/menu suites pass. Static Pages packaging and whitespace checks pass.

Browser reports and a touch-aim capture are generated here (ignored by Git).
These are functional input checks; actual iOS/Android hardware validation remains
necessary. No damage, timings, charges, resource costs or enemy behavior changed.
