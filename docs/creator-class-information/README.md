# Class creator: one Lexicon page

The selected class has one fitted information panel in the game's charcoal,
leather and antique-gold palette. Warm ivory text stays readable; class and
morph emblems decorate the page. There are no scrolling details, collapsed
background sections or extra information tabs.

The class fantasy, starter kit, passive, training affinities, health differences
and concise playstyle notes appear with all three applicable morphs. Morph
names, class membership and mastery unlocks use the live catalogue. The copy
explains optional per-skill forms rather than permanent subclass stat bonuses.
Classless and Eldritch explain their lack of subclass morphs.

The class list and animated preview use less width to give the information room.
Smaller screens stack the list and preview beside the information. All class
choices, the hidden-class unlock input, Back and Continue remain visible.
Recreated cards no longer let a stationary pointer replace controller selection.

Validation:

- `tools/verify-creator-class-information.cjs`: 48 layouts (eight classes at six
  sizes, 1920x1080 through 640x360); all 18 themes and mastery unlocks; no hidden
  or clipped descriptions, scrolling or horizontal overflow; text contrast of
  at least 4.5:1; new-player controls and player-state isolation.
- `tools/verify-controller-sheets.cjs`: all class and appearance controls at four
  sizes, complete appearance navigation and no browser errors.
- `tools/verify-class-previews.cjs`: class demonstrations and selection behavior.
- `tools/verify-ui-information.cjs`: class copy and information-pane regressions.

Screenshots and `verification.json` accompany this report.
