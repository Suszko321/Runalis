# Skills menu recovery

Opening Menus directly from a mobile ability's morph detail sheet left every
section button hidden. The `:has()` navigation rule also matched the hidden
Skills workspace, so closing and reopening Menus did not recover it.

The rule now applies only while Skills is active and the section chooser is
closed. Leaving Skills also dismisses the ability and tree detail sheets,
cancels the delayed tree-sheet timer, and clears pending hotbar placement.
The selected morph and loadout are preserved.

Verification:

- `tools/verify-skills-menu-recovery.cjs` fails before the fix on the missing
  Skills menu button. It passes with real touch/click input at 844×390,
  390×844, 1280×800 and 800×600. It checks immediate return from details,
  repeated close/reopen, switching to Inventory, morph selection, pending
  placement, Clear all, and stale hidden detail markup. No page errors.
- `tools/verify-mobile-skills.cjs` covers native drag, cancellation, morphs,
  individual clears, portrait placement, HUD updates and save/reload.
- `tools/verify-hotbar-assignment-browser.cjs` covers unique assignment,
  placement feedback, Clear all and persistence at all four viewport sizes.

Browser tools use `RUNALIS_NODE_MODULES` for Playwright and `RUNALIS_URL` for
the local game server.
