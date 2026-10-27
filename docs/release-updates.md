# Game release updates

The normal Runalis URL checks for updates on mobile and desktop. The Pages
packager writes a content-derived release ID into the entry page and generates
`release.json`. JavaScript imports and entry styles share the same release ID.

`src/boot.js` checks the manifest before importing the game. Requests use
`cache: no-store`, a unique query and a three-second timeout. An older entry
page navigates to a fresh address automatically; the temporary release parameter
is removed after the new page is confirmed. Saves remain on the same origin.
There is no local-storage clearing, service-worker installation or save migration.

The running game checks on tab focus, visibility restoration, browser page
restoration, reconnecting to the network, and once per minute while visible.
At the main menu it updates automatically. During gameplay it offers **Save &
update** and **Later**, preserving the current session until the player chooses.
Saving must succeed before reloading. Character customization must finish first.
Online guests save their own character and return home before the page changes;
hosts are warned that updating closes their world. Existing PvP save restrictions
remain in effect.

An unreachable, invalid or slow manifest does not block normal startup. A guard
prevents rapid repeated navigation if a deployment edge still returns older HTML;
the next check retries after a one-minute backoff.
Local development skips release checks; `release.json` is generated only in
`_site` by `node tools/prepare-pages.mjs`.

The updater cannot execute in a tab that is still running a release from before
the updater existed. That tab needs to load this deployment once. Subsequent
releases are detected without manually changing the normal link.

Verification:

```
node tools/prepare-pages.mjs
node tools/verify-release-updates.cjs
node tools/verify-mobile-multiplayer-pages.cjs
```

The browser suite covers stale entry pages on mobile and desktop, later releases,
stable normal URLs, retained saves, deferring updates, failed saves, saved progress
after reload, real online guest save/disconnect with an uninterrupted host,
unavailable/slow/invalid manifests and deployment-edge loop prevention.
