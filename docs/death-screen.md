# Death screen and Nav Stone return

Solo/host defeat now opens a full-viewport “You have died” dialog instead of
returning immediately. It displays 3, 2, 1 for one second each, then reveals
“Respawn at nearest Nav Stone”. Touch/click, Enter/Space and the owning
controller's confirm button activate the same guarded action. Early presses,
held keyboard repeats and duplicate clicks cannot skip the timer or apply a
second penalty.

The pending defeat holds the simulation and clears combat/ability/movement input.
The existing Nav Stone selection, instance exit, gold penalty and recovery values
run when respawn is selected. Existing co-op downed/revive and ally bleed-out
behavior remains; final host defeat/party wipe uses the new dialog. PvP still
uses its own elimination flow. Saving during the pending screen is rejected so
transient death coordinates do not replace the last valid save. Game teardown
removes the overlay and keyboard listener; the frame loop owns countdown time.

Verification: verify-death-screen.cjs checks real-time 3/2/1 sequencing, hidden
button before readiness, early Enter rejection, blocked movement/saves, desktop
and mobile activation, portrait viewport fit, simulated controller confirmation,
nearest-stone placement, one gold penalty and teardown. Existing Nav Stone
respawn checks pass for surface, dungeon, side-zone, tower, ally bleed-out,
successful revive and party wipe. Physical device/controller testing remains
unverified; these are browser tests.
