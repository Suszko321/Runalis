# Multiplayer assessment evidence — October 31, 2026

Entry points: [Technical Bible](../RUNALIS_MULTIPLAYER_BIBLE.md),
[quality register and implementation order](../RUNALIS_MULTIPLAYER_AUDIT.md).

Root source inspected at commit `8fca54d67037679666713bb5470f56718d52aece`
plus the existing working tree. Node v24.15.0; Windows; headless Microsoft Edge
through Playwright. Existing art/combat/README edits were present before this
assessment and were left intact. No runtime edits, deployment, credentials,
service configuration or manifest/lockfile changes were made.

## Checks executed in this assessment

| Command under `node tools/` | Result | Actual scope |
| --- | --- | --- |
| `verify-coop-readiness.mjs` | PASS | 12 logged checks: P1/P2 down/revive, P2 bleedout, both final-hit directions with weapon/summon/DoT ledger sources, fractional XP, duplicate/range/idle guards, real P2 death-loop renown, host controller reservation/colors |
| `verify-coop-session-state.mjs` | PASS | Logical identity/order/reconnect and same-model live objects; 25 patrol save/reload cycles and legacy tempo preservation |
| `verify-online-protocol.mjs` | PASS, 7 checks | Password derivation/proofs/policy, wire types/cycles, prototype stripping/packet cap, bounded input, merged edges and cooldown clock rebasing |
| `verify-online-presentation.mjs` | PASS | Shared definitions, live actor/summon refs, enemy Maps, aura ownership, save isolation |
| `verify-party-entry.mjs` | PASS | 2–4 actors, unanimous/stale/expired/declined votes, ownership, P2 travel, boss entry, transient save cleanup and solo behavior |
| `verify-dungeon-boss-coop.mjs` | PASS, 8 cases | Mother/custodian at 1–4 players: party damage, arena/camera correctness, HP, reload/wipe |
| `verify-progression-overhaul.mjs` | PASS, 23 checks | 88 class/level simulations, 19 weapon timings, real Wolf and 87 dispatches in this fixture, mastery/XP/support, save clocks and migration; not an exhaustive current-catalogue claim |
| `verify-continent-instance-returns.mjs` | PASS | Side-zone/tower state and returns, no duplicate clear XP, floor identity and actor-safe arrivals |
| `verify-act1-campaign.mjs` | PASS | Authored dialogue, migration, six ordinary classes, repeat-safe evidence/rewards and campaign paths; not a concurrent-party campaign soak |
| `verify-workshop-services.mjs` | PASS, 13 checks | Actor-only services/costs, provider/proximity/death authority, atomic quotes, 63 recipes and persistence |
| `verify-dungeon-retry-session.mjs` | PASS | Human/feral defeat, Nav Stone/retry/seals, co-op consent and logout cleanup |
| `verify-gameplay-ai.mjs` | PASS, 8 checks | Production flanking/screening/firing lanes, bounded retreat, terrain and boss exclusions |
| `verify-coop-readiness-browser.cjs` | PASS, 13 checks, zero page errors | Actual UI profile join using simulated pads, simultaneous movement/combat, reconnect, radar pixels, owned HUD/menu, shared/split/forced camera and save/leave |
| `verify-local-player-menus.cjs` | PASS, 12 checks, zero page errors | Real equipment/hotbar/skill UI, two open menus, continued teammate keyboard/controller input, bounds at 1280×800 / 844×390, saves and cleanup |
| `verify-coop-session-regressions.cjs` | PASS, zero page errors | Real morph UI and clock restriction, both drop-out chord orders, preserved profile rejoin and swapped device indices; simulated pads |
| `verify-online-browser.cjs` | PASS, 17 checks, zero page errors | Native WebRTC/public PeerJS; separate isolated contexts, mobile input, real combat in 16-enemy fixture, audio/effects, ownership/services/fishing, dungeon travel, six subclass presentation scenarios and host closure |
| `verify-online-lifecycle-browser.cjs` | PASS, 9 checks, zero page errors | Native WebRTC/public PeerJS; wrong password, duplicate host, four players, capacity, leave/rejoin, host profile isolation, abrupt guest closure and host shutdown |
| `audit-multiplayer-foundation.mjs` | CONFIRMED defects MP-001 / MP-003 | Disposable actor collects 3 iron ore from a departed slot; permitted 6,289,437-unit packet emits 525 frames and cannot be received |
| `audit-multiplayer-browser.cjs` | CONFIRMED defect MP-002, zero page errors | Actual host handler accepts/acknowledges arbitrary gold on a disposable guest actor; no live network exploit or production room |
| `npm run build` | PASS | 326 bundled startup modules, 3.2 MiB startup bundle, 865 packaged files / 38.9 MiB; resource paths/case validated |
| `verify-pages.cjs` | FAIL — MP-006 | `No sprite atlas rendered` at line 53; separate dynamically imported source image cache is read immediately. Full staged smoke gate is not passed |
| `verify-mobile-multiplayer-pages.cjs` | FAIL — MP-006 | On a dedicated static server: `ReferenceError: mobileGame is not defined`; hook expects separate `main.js` request but startup uses bundled `boot.js`. Mobile package test is not passed |

The first mobile-package attempt used an existing server on 8768 which did not
serve `/_site/` (HTTP failure). A dedicated workspace static server on 8771
removed that setup issue and exposed the actual fixture hook failure above.
No package gameplay defect is inferred from these fixture failures alone.

Node reports its existing module-type warning for imported source `.js` files;
the core commands above exited 0. It is not a multiplayer test failure.

## Artifacts and visual review

The existing suites generated JSON and PNG captures in `docs/coop-readiness/`,
`docs/online-multiplayer/`, `docs/local-player-menus/` and `tmp/`. They are ignored
by the repository; the Markdown evidence here is tracked. Diagnostic JSON is
generated in this folder. Audit scripts are reproducible source, not an acceptance
gate that blesses the reproduced defects.

Visually inspected this pass:

- `docs/coop-readiness/split-screen.png`: distinct actors, per-view minimaps and
  hotbars; long names/split labels crowd the resource-header text (MP-004).
- `docs/local-player-menus/skills-844.png`: P1 skill tree constrained to its left
  viewport, P2 world/HUD visible on the right; scrolling required on the tree.

These checks establish representative layout behavior, not readability on a TV
or an exhaustive accessibility/presentation certification.

## Reproduction

From the repository root, run each core command in the table directly. For the
new defect observations:

```powershell
node tools/audit-multiplayer-foundation.mjs
```

For browser suites, follow the existing `RUNALIS_NODE_MODULES` convention: it
points to a folder containing the `playwright` package. Use the local game URL
via `RUNALIS_URL` when the server is not on 8768. Edge is the fixture browser.

```powershell
$env:RUNALIS_NODE_MODULES = 'C:\path\to\node_modules'
$env:RUNALIS_URL = 'http://127.0.0.1:8768'
node tools/verify-coop-readiness-browser.cjs
node tools/verify-local-player-menus.cjs
node tools/verify-coop-session-regressions.cjs
node tools/verify-online-browser.cjs
node tools/verify-online-lifecycle-browser.cjs
node tools/audit-multiplayer-browser.cjs
```

Online browser checks contact the existing public signaling service and open
temporary randomly named test worlds. They use native WebRTC, not local message
transport substitutes. They test multiple contexts on one machine, not separate
internet connections. The browser defect probe uses controlled host dispatch
and does not open any online room.

Python and the old cached Playwright installation were unavailable in this
environment. The assessment installed disposable Playwright/http-server tools
under ignored `tmp/multiplayer-audit-deps/`, preserving project dependencies.
An alternative reproducible static preview is:

```powershell
npm install --prefix tmp/multiplayer-audit-deps --no-package-lock --no-save playwright http-server
node tmp/multiplayer-audit-deps/node_modules/http-server/bin/http-server . -a 127.0.0.1 -p 8771 -c-1
```

Run that server in a separate terminal; set the dependency folder and URL to its
actual paths/port. For the failed packaged fixtures, first run `npm run build`;
`verify-pages.cjs` starts its own server, while the mobile fixture needs the
workspace server to expose `/_site/`. Old `tmp/pages-verification/results.json`
may predate a failing run; do not treat it as current success evidence.

## Remaining limits

No physical controllers, separate-device home/mobile networks, forced TURN,
selected ICE-pair capture, Safari/Firefox/mobile hardware sessions, latency/loss
injection, multi-hour performance/memory soak, crash/storage-exhaustion delivery
tests, complete co-op quest/save matrix or full-current-catalogue simultaneous
combat test was performed. No multiplayer FPS/bandwidth benchmark or universal
connectivity claim is made. No user save was read or changed by these fixtures.

Reflection attribution is cross-referenced from the existing Combat Director's
audit C02; it was source-reviewed but not independently re-run here. The register
keeps that evidence distinct from the three new controlled reproductions.
