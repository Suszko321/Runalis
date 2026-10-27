# Main-menu return layout fix

Starting a game installs the in-game full-screen menu styles. Those styles incorrectly also targeted `#mainMenu` and its card, replacing the illustrated title screen with a full-screen leather panel after Save & Quit. The title screen is now excluded from those in-game rules; it already fills the viewport and retains its original illustrated layout.

The title card now fits within the actual screen padding and starts its content at the top. Long profile lists can scroll without overflowing above the card. Returning to the menu resets the title-card scroll and controller selection to the first action. Controller focus reveals overflowing menu panes without scrolling the entire title screen.

## Actual verification

`tools/verify-main-menu-return.cjs` reproduced the original layout change before the fix, then passed 12 actual game-load/Save & Quit cycles across 1920×1080, 1280×720, 800×600 and 640×360. The test exercises the real game constructor, saving, destruction and menu restoration. Initial and returned element geometry, typography, padding and backgrounds match exactly. The title card remains inside the screen and its heading remains visible on return.

Real controller polling with a synthetic standard gamepad confirmed D-pad selection and B return after quitting. Five isolated test profiles remained available, and the delete dialog could be canceled. No browser errors or missing assets occurred. Production profile contents and storage formats were not changed.

The full-screen menu regression suite also passed 64 views covering inventory, skills, character, quests, map, log and dialogs. Its title-screen assertion now checks that the screen covers the viewport, while the title card retains its own layout.

Screenshots: `initial-{width}.png` and `returned-{width}.png`. Backup: `backups/main-menu-return-2026-10-13/`.
