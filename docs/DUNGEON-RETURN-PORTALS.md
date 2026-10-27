# Dungeon portals and Orrakai return — October 6, 2026

Each generated dungeon now records the identity of its main boss on the final
floor. Only that boss's defeat completes the run. Minibosses, floor guardians,
and other enemies marked as bosses cannot unlock the surface exits.

Defeating the main boss creates one reachable return portal beside the final
encounter. It uses the existing pixel-art portal showing the sunlit overworld.
Interacting returns the party to the saved entrance used for this dungeon;
remaining ordinary enemies do not block it. Boss chests and the existing exit
seals unlock together. Cleared saves reconstruct a missing portal without
duplicating it, and contradictory clear flags are repaired if the main boss
is still alive. Defeat recovery retains its existing forced exit.

The Map menu now provides a clickable **Return to Orrakai** button alongside
the existing held-Y controller shortcut. Dungeon/tower restrictions and nearby
enemy restrictions are removed. Returning this way does not clear a dungeon.
Orrakai keeps the original surface return snapshot rather than treating a
dungeon or tower as overworld geometry. PvP uses its existing cleanup/return
path. Loading, active conversations/cutscenes and defeat still use their normal
transition safeguards.

Validation completed:

- `verify-dungeon-return-portals.mjs`: all seven themes, earlier-floor and
  additional boss rejection, miniboss rejection, live-boss stale-clear repair,
  reachable single portals, surviving ordinary mobs, save restoration and
  entrance-specific returns. Includes a complete profile save/load check.
- `verify-dungeon-map-return.cjs`: portal rendered and used through actual
  interaction; map return availability in all playable modes; actual button
  click from an uncleared dungeon near a boss; held Y from the tower; Orrakai
  exit restores the surface; no browser errors.
- Existing dungeon/tower floor progression regression.
- Existing map selection, NavStone confirmation and Map menu opening checks.
- Syntax checks for changed modules.

See [the boss return portal](visual-production/dungeon-boss-return-portal.png).
