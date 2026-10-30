# Mobile startup recovery

The published release reproduced an inert main menu in WebKit with an iPhone
viewport and Home Screen mode: requests for `poiPresentationSystem.js` and
`combatExpansionData.js` returned HTTP 503, then `boot.js` rejected its import of
the main game. The profile list remained empty and Create had no click handler.
A subsequent attempt succeeded. This demonstrates a startup download failure;
it does not establish that the affected phone's saved data was deleted.

Production now bundles 322 startup modules into one 3.2 MiB ES module. The
relative location remains `src/boot.js`, preserving runtime asset paths. The
small classic loader and bundled game are the only JavaScript startup requests.
The build dependency is pinned with a lockfile and installed by Pages CI.

The menu is inert behind an explicit loading status until initialization finishes.
A failed loader, game download or module evaluation exposes Retry. Downloads
taking over 15 seconds also expose Retry, while allowing the original attempt
to finish. Retry navigates to a fresh document because failed module imports
remain rejected in the current document. Startup recovery does not access save
storage, change the app manifest, or change any save keys.

Run `npm ci`, `node tools/prepare-pages.mjs`, then
`node tools/verify-startup-recovery.cjs` with `RUNALIS_NODE_MODULES` pointing to
the Playwright installation. Both WebKit and Chromium passed tests for HTTP
503, failed loader, module evaluation failure, delayed download, and successful
startup at a GitHub Pages project path. Tests verify stored profiles remain
unchanged during failures and retries. Both engines also create a character,
start the game, reload, and find both the original and new profiles. These
automated checks emulate Home Screen mode; they are not a test on the user's
physical iPhone.
