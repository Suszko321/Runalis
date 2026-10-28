# Mobile menu scrolling and screen use

The original snap-back was reproduced in a live game: setting the progression
menu to scrollTop 200 settled back at 9 within 0.7 seconds. The virtual touch
controller was always connected and was passed into gamepad menu handlers every
frame, repeatedly focusing/revealing the first tab.

Touch gameplay inputs are now excluded from menu navigation; gameplay aiming,
movement and held skills still use the same primary touch controller. Idle
physical controllers on mobile also skip menu focus updates. Actual controller
actions clear the touch-focus mode so deliberate navigation remains available.
Touch focus events no longer force reading panes back to their selected rows.

Same-tab UI, shop, workshop and same-step creator refreshes preserve scroll
offsets. Changing tabs/categories/creator steps can still use their new layout.
Snapshots are transient DOM offsets, not persisted profile changes. Native
scrolling and momentum remain browser-owned; map panning and skill-icon dragging
keep their dedicated gestures.

Main workspaces fill 100dvh with safe-area padding and a compact scrolling tab
strip. Mobile service, creator, pause, multiplayer, co-op and arena panels use
the available viewport instead of desktop-sized centered cards. Gameplay tools
leave only the Menus button visible over an open workspace. Shop content uses
one continuous scroll flow with accessible actions; workshops retain independent
list/detail scrolling. Main menu cards expand to use the available screen width.

Validation: `tools/verify-mobile-menu-scroll.cjs` checks real native touch swipes,
finger release, idle touch/physical inputs, preserved refresh positions, shop and
creator edits, and landscape/portrait geometry. The same 200px scenario now stays
at 200. Existing mobile controls, skill drag/morph/save-reload, desktop controller
and workshop action suites also pass. Measurements are scroll positions, not FPS
or physical-device performance claims.
