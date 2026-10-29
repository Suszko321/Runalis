# Acolyte Funeral Urn: mobile cast reliability

A fresh Funeral Urn press could be discarded while another spell was charging.
`updateAbilityInput` handled the existing charge first and returned before
examining the new button press. This also swallowed an Urn press on the same
frame the other charge released. Holding Necrotic Bolt with one finger and
tapping Funeral Urn with another reproduced the issue with sufficient Spirit
and a ready Urn cooldown.

A new skill press now takes over from a held charge, matching the existing
channel-switch behavior. The requested slot takes priority over input remaining
from the old action. Charges and channels also validate their original ability
against the current hotbar slot, preventing stale actions after reassignment.
Ordinary charge release and dodge cancellation retain their behavior. Normal
resource, cooldown, unlock and character-state checks still govern the cast.
Urn damage, cost, cooldown, flight, ghost limits and targeting are unchanged.

Validation:

- `node tools/verify-acolyte-urn-input.mjs` reproduces the swallowed press before
  the fix, then checks held-charge handoff, simultaneous charge release, stale
  hotbar actions, held-channel switching, exact resource costs, insufficient
  resources, cooldown rejection and 120 consecutive successful casts.
- `node tools/verify-acolyte-urn-mobile.cjs` uses native browser touch events in
  the actual mobile game. Sixteen cast scenarios include repeated taps,
  multiple fingers on charge/channel and Urn controls, cancellation,
  pause/resume, viewport resize and production save/load. No page errors.
- Existing Funeral Urn tests pass their nine damage, ghost, terrain, lifetime,
  ownership, cleanup and bounded-overlap checks.
- Fae/Murmuring Host channel regression and all thirteen combat-tempo checks
  pass, including regular charge timing and availability.

The browser script uses `RUNALIS_NODE_MODULES` and the local preview server, as
the other browser suites do. Generated captures and JSON are ignored by Git.
