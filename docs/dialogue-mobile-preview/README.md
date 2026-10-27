# Persistent conversation exit and mobile character preview

The dialogue box always draws a Leave conversation control at its upper right.
Its hit target uses the same geometry as its rendering, stays at least 44 screen
pixels tall when the game canvas scales, and sits outside the scrolling response
list. It closes through the existing dialogue close path, including while text
is revealing, a transition is locked, or history is open. It does not select a
response or grant its quest rewards. Keyboard Escape and controller cancellation
retain their existing behavior. Pointer dialogue input also works when a gamepad
is connected, with the existing player ownership checks preserved.

Mobile dialogue reserves room beneath the touch toolbar. Conversation mode hides
the current HUD overlays so they cannot cover the dialogue header or responses.

Mobile appearance customization reuses the existing animated character preview
below the appearance controls, before the action row. It updates through the
same renderer as desktop customization. The action row retains its sticky Back,
Random Look and Start Game controls. Desktop preview placement is unchanged.

## Verification

`node tools/verify-dialogue-mobile-preview.cjs` passes 22 browser checks across
desktop, connected-controller desktop, 844 × 390 touch landscape and 390 × 844
touch portrait. It exercises the exit across five dialogue phases, with 30
responses, history and transition locks, and verifies the hit target is visible
and unobstructed. It also uses the real Customize Appearance menu to verify
preview placement, appearance changes, and returning to the game on mobile.
No browser errors or missing resources were observed. Reports and captures in
this folder are generated and ignored by Git.

Existing mobile, opening/menu, Root & Retort story-flow and controller character
sheet browser suites pass. Static Pages packaging and whitespace checks pass.
Real phone hardware validation remains separate from browser emulation.
