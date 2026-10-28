# Touch skill management

In Skills → Abilities, tap a skill to open its description and per-skill morph
choices. The Back to skills button returns to the list. Locked morphs retain
their mastery requirements, and existing recovery/combat restrictions still apply.

Drag the skill's 48px icon onto one of five hotbar tiles to assign or replace a
skill. Dragging starts after eight pixels; scrolling the name area remains native
touch scrolling. The dock uses the gameplay 3×3 order: skills 1–3, skills 4–5 and
Attack, then Sprint/Dodge/Interact. These four fixed action cells are previews.
Selecting a skill and tapping a tile is an alternative to dragging. Clear tile
actions remain available in the skill detail sheet without deleting learned skills.

Pointer capture keeps drags stable, a ghost follows the finger, and valid targets
highlight. Cancellation, focus loss and off-grid drops never assign. A short click
suppression is limited to the skill workspace. Touch-generated hover events do not
change selection. The tip above the library explains both interactions.

Mobile changes use the existing loadout/morph APIs and save the character after
successful edits. Desktop/controller behavior keeps its existing path. Mobile
details scroll independently, with the gameplay grid always available for placement.

`tools/verify-mobile-skills.cjs` exercises native touch events in landscape and
portrait, locked/unlocked morphs, empty-slot/replacement drops, cancellation,
off-grid releases, tap placement, clearing, gameplay reflection and full profile
reload. Existing mobile controls, controller assignment and morph browser suites
also pass. Captures/logs are generated under ignored `tmp/` paths.
