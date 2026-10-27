# Abilities controller selection

- In the skill list, A opens hotbar assignment and X opens morph selection.
- Directions cannot enter the hotbar or morph selector. Categories remain available to the left of the skill list.
- During assignment, left/right chooses a hotbar slot, A places the skill, X clears that slot, and B cancels and returns to the skill list.
- During morph selection, up/down chooses an unlocked form, A applies it, and B returns to the skill list. Horizontal directions stay in the morph selector.
- Morph selection starts on the current form. Existing mastery unlocks and recovery restrictions still apply.
- Leaving the tab or closing the menu resets selection to the skill list. Mouse controls remain available.

The context bar shows the relevant controls for each selection area. When an overflowing pane creates menu sheets, it restores focus to the selected control and reveals its sheet.

Verification passed: controller button mapping, navigation boundaries, actual assignment and morph changes, cancellation, locked forms, recovery restrictions, tab/menu exits, mouse controls, and visibility at 1440×900, 1280×720, and 800×600. Existing UI information, morph browser, and menu sheet checks also passed.
