# Mobile controls

Touch devices with a coarse primary pointer automatically use the mobile layout.
Desktop input and saved hotbar bindings are preserved. A physical gamepad takes
priority over the virtual controller; disconnecting it restores touch controls.

## Playing

- Move with the left thumbstick. Attacks and aimed skills follow movement and
  retain the last direction when standing still.
- Tap or hold/drag a separate finger on the world to aim, including while a
  skill is charging. Releasing that aiming finger restores movement aim;
  buttons and the movement wheel never become aiming touches.
- The right side has all five equipped skills, Attack, Sprint, Dodge and Interact.
  Hold Attack for heavy attacks; skills retain their existing hold, release,
  channel, Block, charge, resource and cooldown rules.
- Menus opens the section chooser. Tap its sections to reach character,
  inventory/equipment, skills, quests, map and log. Tap Menus to return to the
  chooser and again to close it. Sections scroll on touch screens.
- Pause opens the existing pause menu, including Resume, Save and Save & Quit.
- Tap the dialogue panel to reveal/advance text and tap choices to select them.
  The opening cinematic has a separate Skip opening button.
- Launching a journey requests fullscreen and landscape where supported; the
  fullscreen button retries. Unsupported browsers show a rotate prompt in
  portrait, with a playable portrait fallback. Browser/OS restrictions mean
  landscape cannot be guaranteed automatically.

The canvas follows viewport proportions without stretching the world. Controls
respect safe areas and the viewport height changes caused by browser chrome.
Touch input is cleared on cancellation, focus loss, hidden pages, resizing,
interface transitions and gamepad takeover. Listeners and controls are removed
when the game is destroyed. The touch layer uses the existing controller and
combat paths rather than dispatching keyboard events.

## Verification

Run the preview server on port 8768, set RUNALIS_NODE_MODULES to the installed
Playwright dependency folder, then run:

```
node tools/verify-mobile-browser.cjs
```

This uses isolated profiles and native browser multitouch input at 844 × 390
and 390 × 844. It checks simultaneous movement/attack, remembered aim,
press/hold/release, all five equipped skill slots, actual Block activation,
cancellation, focus loss, menus, pause/resume, physical-controller priority,
portrait fallback, opening skip, canvas dialogue and desktop detection. It also
checks character creation and removal of controls on Save & Quit. It
checks uncaught browser errors and missing resources. Captures and the generated
JSON report are written beside this file (ignored by Git).

The static Pages packaging check validates inclusion and relative resource paths.
Desktop opening, ability-controller, fullscreen-menu and main-menu-return tests
are also run for regressions.

## Remaining device validation

Browser automation verifies input and layout, not real phone performance or
Safari behavior. Test on an iPhone/iPad and Android phone before claiming device
compatibility: fullscreen/orientation permissions, browser chrome and notches,
thumb reach, keyboard entry, long skill holds and dense combat. No mobile FPS,
battery or memory improvement is claimed. Enemy density, effects and combat
balance are unchanged by this pass.
