# Password-based online co-op

Load a character, then choose **Menus → Multiplayer** or **Pause → Multiplayer**.
Touch players can also tap **Multiplayer** directly on the top toolbar.
The host enters an 8–128 character password and chooses **Open World**. Other
players enter the exact same password and choose **Join World**. The active
character joins the host's current world; no room code or account is needed.
One host and up to three guests are supported. Each device keeps a full-screen
view and its existing keyboard/mouse, gamepad or touchscreen controls.
Character readiness uses the selected class, including Classless; existing
profiles do not need a separate creation-complete flag. Both devices must reload
after this compatibility fix; older multiplayer builds prompt for a refresh.

The host must keep the game tab active. Closing the world or losing the host
ends the session. Guests can leave and rejoin while the host remains online.
Local couch co-op and online sessions are separate modes.

## Implementation

- The browser host runs movement, combat, enemies, loot, shared world state and
  world transitions. Guests send bounded control inputs through the existing
  co-op actor path; incoming coordinates and damage are not accepted as actions.
- WebRTC data channels use bundled PeerJS 1.5.5, loaded only when connecting.
  PeerJS Cloud supplies signaling; normal solo play does not connect to it.
- PBKDF2 derives a room identifier and a separate proof key. Fresh, role-separated
  HMAC challenges authenticate both ends before a character or world is sent.
  Plaintext passwords are not sent or stored in profiles. Different passwords
  select different rooms; an already-open password cannot be taken over.
- Inputs are batched at up to 25 Hz and world updates at up to 10 Hz. Deltas
  contain nearby entities covering the recipient's viewport plus a margin;
  initial scene generation/tiles are sent once per world transition. Backpressure,
  bounded message assembly, packet limits, stale-control neutralization and
  connection timeouts prevent unbounded queues and stuck held inputs.
- Guest views interpolate authoritative positions and advance presentation-only
  animation timers between snapshots. They never independently deal damage,
  run enemy AI or decide collision outcomes. Host pause is shown to guests.
- World effects, subclass/technique runtime visuals, enemy-keyed Maps, actor and
  summon references, Sunken Depth and combat sound cues are synchronized. These
  presentation copies are excluded from saved characters.
- Guest conversations route to their host-owned actor. Service UIs appear on the
  guest device; fishing timing and rewards remain host-run. Character-owned menu
  edits use an acknowledged commit so snapshots do not overwrite pending edits.
- The guest's browser owns their profile. Autosaves preserve acquired character
  progress, items and equipment while retaining their own world, position and
  campaign state for returning home. The host never writes guest profiles into
  its local profile list. Save failures are reported rather than treated as
  successful saves. Disconnect cleanup restores the original world and clock.

## Verified

Run `tools/serve.py 8768`, set `RUNALIS_NODE_MODULES` to the Playwright dependency
folder, then use:

```
node tools/verify-online-protocol.mjs
node tools/verify-online-presentation.mjs
node tools/verify-online-browser.cjs
node tools/verify-online-lifecycle-browser.cjs
node tools/verify-mobile-multiplayer-pages.cjs
```

The browser checks use actual native WebRTC connections through the public
PeerJS signaling service, with separate isolated host/guest browser contexts.
They do not replace the transport with local messaging or mocked connections.
The gameplay suite covers mobile movement, real attacks and damage in a
16-enemy encounter, combat effects and sounds, menu commits, NPC dialogue,
guest shop/forge/fishing, dungeon travel, authored subclass visuals and safe
restoration. Lifecycle checks cover wrong passwords, duplicate hosts, four
players, full rooms, leave/rejoin, profile isolation, abrupt guest closure and
host shutdown. Protocol/presentation checks cover proofs, limits, input
sanitization, cycles, shared ability definitions, live references and save
isolation and cooldown rebasing across browser clocks. The targeted suites passed 32 checks (15 gameplay, 9 lifecycle, 7 protocol and 1 presentation). JSON reports and screenshots are generated here and ignored by Git.

The lifecycle fixture intermittently timed out loading a local test profile before connecting; a complete rerun passed all nine lifecycle checks. Failure diagnostics now capture the page and errors for recurrence investigation.

Offline regression coverage includes the existing 29 subclass suites and 24
gameplay suites, mobile controls, live aiming, dialogue/preview, workshops and
main-menu return. Static GitHub Pages packaging validates every shipped path.
The packaged mobile check covers landscape and portrait menu access, real room
hosting and stale menu cache isolation. Pages builds version the entire module
graph together so phones receive consistent code when a release changes.

## Deployment and remaining validation

GitHub Pages hosts the static game; it does not run an authoritative backend.
The browser host is the authority. The default signaling service is external
and its uptime is outside this repository's control. Restrictive NATs, firewalls
or mobile networks may require a TURN relay; no universal cross-network
connectivity or real-phone performance is claimed from same-machine browser
testing. Validate iOS/Android and separate networks before a wider release.
Background tab suspension can interrupt a browser-hosted world.

Public connection settings, including a private PeerServer or TURN ICE servers,
can be configured in `src/onlineNetworkConfig.js`. Use short-lived TURN
credentials; never commit private service credentials. The default needs no
account or deployment secret.

This is trusted co-op with player-owned local characters, not an anti-cheat
service. Existing shared campaign/party travel rules remain in use; one world
dialogue transaction runs at a time. Long campaign sessions, simultaneous
advanced side systems and high-latency networks need further multi-device soak
testing. No enemy density, effects, world scale or graphics settings were reduced.

## Dependency provenance

- PeerJS 1.5.5, MIT; shipped at `src/vendor/peerjs-1.5.5.min.js` with
  `src/vendor/peerjs-LICENSE.txt`.
- Original npm distribution: https://registry.npmjs.org/peerjs/-/peerjs-1.5.5.tgz
- Minified file SHA-256:
  `7604d8c31bec4f134b0d15c2d80b1d095ea18af005354f439f14291fcd7b4168`
- API and connection limitations: https://peerjs.com/client/faq and
  https://peerjs.com/client/api/peer
