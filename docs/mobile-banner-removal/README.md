# Mobile workspaces without the main tab banner

Character, Skills, Inventory, Quests, Map and Log no longer display the horizontal
main-navigation strip. The small existing Menus button at the upper right opens
the left-side chooser. Section-specific controls such as Equipment/Bag and Skill
Trees/Abilities/Progression remain visible and leave space for the Menus button.
The equipment workspace now starts at the safe top edge instead of reserving
54px for the removed banner.

The mobile panel uses normal block flow so it does not reserve empty grid rows.
Inactive direct-child tab panels are explicitly removed from layout: existing
Skills-subtab styles had overridden the hidden panel's display, leaving invisible
content above subsequent menus.

Actual-game touch verification visited all six menus at 1280×590, 844×390,
667×375, 390×844 and 320×568. In every case the banner is hidden, the active
workspace starts within 30px of the top, Menus remains available, section controls
clear its touch target, and returning to the chooser restores the list. Multiplayer
and closing Menus also pass. No page errors. Existing seven-size inventory tests,
engineering 12/12 and production build pass. Physical devices remain untested.
Generated review captures are local and excluded from Git.
