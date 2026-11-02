# Compact mobile equipment inventory

The equipment tab keeps three adjacent panes: bag gear on the left, equipped
slots in the middle, and the last selected piece's information on the right.
Phone/tablet, short-screen and coarse-pointer layouts hide the large character
portrait and use the available viewport instead of stacking tall panels.
All 20 bag entries remain available through an independent list scroll. Longer
details scroll in the right pane; the outer equipment workspace stays bounded.

Equip/Unequip and Lock/Unlock appear first, with 44px minimum button heights.
Equipping follows the same copy into its equipped slot; unequipping follows it
back to the bag. Hovering another row no longer changes the selected piece.
Keyboard focus still selects rows. Existing lock and full-bag protection remain.
Descriptions, effects, forge costs and deconstruction live in expandable details.

The quick comparison shows the selected piece against the currently equipped
copy, using its actual rarity and upgrade tier. Higher stats use green and an up
arrow; lower stats use red and a down arrow. Equal stats, empty slots and mixed
trade-offs have explicit labels. Per-stat signed changes show the gains/losses;
the comparison does not attempt to rank build-specific passives or set bonuses.

## Verification

`tools/verify-mobile-inventory.cjs` launches the playable game and tests a full
bag at 320×568, 360×640, 390×844, 667×375, 844×390, 1024×768 and 1440×1000
with touch enabled. Each has three adjacent panes, visible primary actions and
quick comparison, no horizontal overflow and no outer equipment scrolling.
It verifies same-base/different-rarity comparisons, armour upgrades, equal/empty/
mixed cases, lock/equip/unequip, full-bag rejection, stable selection, expandable
details, bottom-of-list reachability and the actual local-player iframe layout.
A separate mouse desktop context retains three columns. No page errors occurred.

Existing 120 lock contracts, 36 browser rarity-colour assertions, itemization,
265-base ascension, workshop and 12 local-player menu browser groups pass.
Engineering gate and build pass. The broader mobile-controls browser suite
timed out before reaching menus while waiting for Block to activate in every
hotbar slot (line 38); this is an observation, not a passing combat contract or
a proven pre-existing defect. Initial concurrent legacy launches also timed out
in profile boot; the local-player suite passed when run serially.
Screenshots are generated locally and excluded from Git. Browser tests use Edge
with touch emulation; physical devices, iOS Safari and live online transport have
not been verified.

Source observations: the previous lexicon breakpoints stacked the panes, while
the stronger touch stylesheet forced normal document flow. The compact styles
are scoped to the equipment tab and override both, including isolated local menu
documents. Other inventory tabs and other menu workspaces retain their layouts.
