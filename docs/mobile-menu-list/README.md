# Mobile section chooser

Opening Menus on touch devices now shows Character, Skills, Inventory, Quests,
Map, Log and Multiplayer in one vertical list on the left. Entries use a stable
18px label size and minimum 44px touch height. Focus highlights an entry without
enlarging or shifting it. The list respects screen safe areas and scrolls
vertically when needed; the Menus button remains unobstructed on the right.

Styles apply only to the mobile section chooser. Open workspaces keep their
existing navigation and the compact three-column equipment layout.

Verified in the actual game with touch emulation at 1280×590, 844×390, 667×375,
390×844 and 320×568. The list stays near the upper-left corner after rotation,
has no horizontal overflow, and every section and Multiplayer opens using real
taps. Menus closes the chooser; no browser page errors. The seven-size inventory
suite and 12 engineering checks pass, as does the production build. Local review
screenshots are excluded from Git. Physical iOS/Android devices are untested.
