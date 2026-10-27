# Fullscreen menu overhaul

Every main workspace covers the viewport with an opaque background. Character,
Skills, Inventory, Quests, Map, and Log keep their contextual tabs and footer;
the redundant top category banner is hidden. The six-option chooser uses its
original compact vertical list over the game. Select opens or returns to the
chooser, D-pad and A select a section, and B closes it.
The title menu, pause menu, merchant, character creator, co-op join, arena result,
and developer setup also use the entire screen.

- Equipment keeps all five equipped slots visible together. Wider inventories
  show two columns. Selecting an item or slot updates the adjacent details.
- Bag combines Resources and Loot, with All, Resources, Supplies, Scrolls and
  Tools filters. Equipment, Bag and Crafting are the three standard inventory
  tabs; Commander characters also retain their Coterie.
- Character combines identity, progression, stats, equipment and the current
  loadout on one dashboard, with a selected-stat explanation alongside them.
- Skills has three tabs: Skill Trees, Abilities and Progression. Progression
  groups every discipline beside its training explanation.
- Skill Trees keeps the path selector at its content height and gives remaining
  space to the graph and inspector. On short displays, the graph scrolls beside
  the inspector and controller movement automatically reveals the selected node.
- Abilities shows a two-column library at widths of 1200px or more, horizontal
  filters, persistent details and all four hotbar slots. Smaller screens use one
  list column. Only learned or equipment-granted abilities are listed.
- Inventory, crafting, quests and ability lists no longer have pages or sheets.
  D-pad movement automatically reveals the selected row. Mouse wheel and
  keyboard focus work on the same continuous lists. LT/RT scroll overflowing
  details without changing the selected skill or item.
- A opens hotbar assignment, X opens morph selection, and B returns from either.
  Stick navigation remains in the library until those actions are selected.
- Old Resources/Loot and discipline-tab states migrate to the combined views;
  old page numbers cannot hide items. Input ownership remains with the co-op
  player whose menu is open.

## Verification

`tools/verify-fullscreen-menus.cjs` checks 40 core layouts and 24 dialog layouts
at 1920×1080, 1280×720, 800×600 and 640×360. Its stress fixture includes the
entire item catalogue, 87 learned abilities and over 30 journal entries. It checks
screen edges, actual visibility of all five equipped slots, continuous controller
browsing, bag filters, saved tab migration, merchant access and co-op geometry.
It also checks the hidden top banner in every core layout, the Gravecaller tree
and controller focus at all four sizes, and all six chooser destinations with
D-pad/A, Select return and B close.
Screenshots and measured rectangles are saved beside this file.

Additional passing checks:

- `verify-ability-controller.cjs`: A/X/B behavior, morph and hotbar focus, locked
  forms, mouse assignment and clearing at three screen sizes.
- `verify-controller-sheets.cjs`: eight classes, all eleven appearance controls,
  controller customization and continuous focus scrolling at four sizes.
- `verify-skill-morphs-browser.cjs`: skill trees, morph selection and detail fit
  at three sizes.
- `verify-ui-information.cjs`: eight classes, 300 skill descriptions, 21 panes,
  equipment and coterie details, crafting, journal, merchant and defensive
  descriptions checked against actual combat behavior.

Very long lists and descriptions scroll; they are not squeezed into unreadable
text to fit everything at once. No live profiles were modified during testing.
