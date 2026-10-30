# Hotbar assignment usability

Each active skill now occupies at most one of the five hotbar slots. Assigning
an equipped skill to another slot moves it, leaving the former slot empty.
Replacing a destination keeps its previous skill learned. Normalization removes
duplicate legacy assignments after resolving aliases, retaining the first slot;
the learned library also merges duplicate aliases.

The Skills → Abilities hotbar has a Clear all button. It empties all five skill
slots, including Block, while keeping learned skills, morph choices and cooldowns.
Class refresh no longer re-equips a cleared starter spell or Gravecaller's Lich.
Classless characters also retain their explicit assignments. Clearing survives
normalization and full profile reloads.

Tap a hotbar slot first to arm it. A gold border, glow, checkmark, pressed state
and status text identify the selected destination. Tapping a learned skill places
it there without opening a morph sheet. Tapping the same slot cancels; another
slot changes the target. The target remains selected while filtering the library
and clears on assignment, Clear all, or leaving the workspace.

Skill-first placement, icon dragging, individual clearing, morph inspection and
controller assignment still work. Mobile skill rows now resolve a stationary
tap on pointer release; text drags remain scroll gestures. A drag's trailing
native click is suppressed without swallowing the next fresh touch or processing
a skill tap twice.

## Verification

- `node tools/verify-hotbar-assignment.mjs`: unique placement/moves, occupied
  destination, legacy aliases, repeated normalization, clear/save/reload, morph
  and cooldown preservation, class refresh, and refused assignments.
- `tools/verify-hotbar-assignment-browser.cjs`: real touch/mouse placement,
  visible selected-slot glow/marker/status, no premature assignment, target
  changes/cancellation/filtering, leaving the workspace, both assignment orders,
  unique movement, Clear all with the morph sheet open, and full profile reload.
  Captures cover mobile 844×390 and 390×844 plus desktop 1280×800 and 800×600.
- `tools/verify-mobile-skills.cjs`: native drag/drop, cancellation, morph choices,
  unique skill moves, individual clearing, portrait placement, gameplay HUD and
  profile persistence.
- Existing ability-controller and Block/HUD/co-op browser checks pass at three
  desktop sizes. Block behavior and progression simulations also pass.

Browser tools use `RUNALIS_NODE_MODULES` for Playwright and `RUNALIS_URL` for the
preview; older tools default to port 8768. Generated screenshots/JSON are ignored.
