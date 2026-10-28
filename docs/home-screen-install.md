# Home Screen onboarding

Opening Runalis in a mobile browser shows an optional **Play Runalis fullscreen**
dialog before choosing a profile. Home Screen/standalone launches and desktop
browsers skip it. iPad desktop-style user agents are recognized through touch
capabilities. The portrait rotation prompt waits until onboarding is dismissed.

- iPhone/iPad: Share-menu steps, Add to Home Screen, Open as Web App when offered,
  then close the tab and launch the Runalis icon.
- Android: browser-menu instructions work immediately. When the browser supplies
  `beforeinstallprompt`, **Install Runalis** calls its prompt from a user tap.
  Acceptance and `appinstalled` show launch instructions; dismissal/errors retain
  the manual route. A consumed native prompt is never reused.
- **I've added it** shows the same final close-tab/launch-icon instructions.
- **Continue in browser** and Escape dismiss for this tab's visit, including
  ordinary reloads. **Remind me later** also snoozes across visits for seven days.
  Successful/manual addition snoozes normal-browser reminders for seven days.

The modal traps keyboard focus and makes the underlying menu inert until closed.
Blocked preference storage still permits dismissal. Preferences use separate
keys; the flow does not alter profiles or copy data between browser/OS storage
containers. It does not close a tab or install an app without user confirmation.

`manifest.webmanifest` uses a relative stable app ID, start URL and scope for the
GitHub Pages subpath, standalone display, landscape preference, and 192/512px PNG
icons. The Apple touch icon is 180px. All three rasterize the existing vector
favicon; regenerate with `node tools/build-app-icons.cjs` and the configured canvas
dependency. No service worker or offline asset cache was added, preserving the
release updater's network checks.

Validation: `node tools/prepare-pages.mjs`, then
`node tools/verify-home-screen-prompt.cjs` against a preview server with the
configured `RUNALIS_NODE_MODULES` and optional `RUNALIS_URL`. This covers 12 groups
of device detection, layouts, focus, preferences, storage denial, final launch
instructions, early/native install-event outcomes and packaged manifest/icon paths.
Native install events are simulated; completing an actual OS Home Screen install
still requires physical-device verification. Mobile gameplay, packaged online
hosting and automatic release-update regressions are also run.

Browser behavior references:

- [Apple Home Screen web apps](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236)
- [Chrome install criteria](https://web.dev/articles/install-criteria)
- [Browser install event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)

Chrome may wait for engagement before exposing a native install event. The custom
dialog therefore always includes manual instructions and never promises that the
browser's native install button is immediately available.
