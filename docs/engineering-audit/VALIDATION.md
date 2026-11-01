# Engineering audit validation

October 31, 2026 · Windows · Node v24.15.0 · npm 11.12.1 · headless Microsoft Edge
via the existing Playwright installation. Baseline `8fca54d` plus the pre-existing
working tree; only `gameSave.js` and `couchCoop.js` runtime code changed in this pass.
Real browser profiles/storage were not used. Generated JSON/screenshots/logs are
local evidence; this tracked summary preserves results when ignored captures are absent.

## New checks and build

| Command | Result / scope |
| --- | --- |
| `node tools/audit-engineering-foundation.mjs --report` | PASS: syntax parse of runtime, tools and nested archive; startup linked by esbuild. Counts and cyclic components are in [INVENTORY.md](INVENTORY.md). Does not establish that an unlinked file is unused. |
| `node tools/verify-profile-storage.mjs` | PASS 12/12 storage scenarios. Before the runtime patch, 1/12 passed. Failure injection is an in-memory Storage implementation; no browser data is touched. |
| `npm run check:engineering` | PASS 11/11 subprocess checks; syntax/startup graph, storage, ward serialization, co-op state/revive, continent memory, protocol, party entry, quest migration, progression and assignment. Runs without browser dependencies. |
| `npm run build` | PASS: 326 startup module identities bundled into 3.2 MiB; 865 staged files, 38.9 MiB. Exact-case imports and literal resource paths validate. |
| `npm audit --json` | PASS: zero reported npm advisories on this lockfile at audit time. Only esbuild and platform-specific optional packages; vendored PeerJS and game logic are outside this result. No dependency update/install was performed. |

Storage scenarios cover failed writes retaining existing bytes, source cleanup
after a successful host migration, failed host migration, co-op migration with
and without an existing current collection, simultaneous old host/co-op sources,
malformed co-op JSON in both readers, eight-profile emergency slimming and actual
write/read fallback, failed local co-op migration and successful local co-op merge.
Emergency snapshots retain gold, inventory quantities, skill XP and story flags.
The test asserts the correct behavior rather than treating reproduced defects as success.

## Existing model suites executed

Each command below is `node tools/<name>`. All 30 were run independently so a
failure did not conceal later results. Individual local logs and exit codes are
under `tmp/engineering-model-checks/`.

| Suite | Result |
| --- | --- |
| verify-bubble-ward-save.mjs | PASS |
| verify-coop-session-state.mjs | PASS |
| verify-coop-readiness.mjs | PASS |
| verify-dungeon-retry-session.mjs | PASS |
| verify-continent-persistence.mjs | PASS |
| verify-progression-overhaul.mjs | PASS |
| verify-long-term-progression.mjs | PASS |
| verify-loot-overhaul.mjs | PASS |
| verify-online-protocol.mjs | PASS |
| verify-party-entry.mjs | PASS |
| verify-dungeon-boss-coop.mjs | PASS |
| verify-combat-foundation.mjs | PASS healthy contracts; also reports four open defects, see below |
| verify-combat-overhaul.mjs | FAIL: oathkeeperLitanyOfIron failed to start, line 145 |
| verify-quest-interactables.mjs | PASS |
| verify-act1-campaign.mjs | PASS |
| verify-campaign-dialogue.mjs | PASS |
| verify-mercy-aid-migration.mjs | PASS |
| verify-orrakai-exit-migration.mjs | PASS |
| verify-damage-scaling.mjs | PASS |
| verify-gameplay-ai.mjs | PASS |
| verify-gameplay-movement.mjs | PASS |
| verify-enemy-combat.mjs | PASS |
| verify-enemy-density.mjs | FAIL: ashenOrchard floor 1 empty combat room triage, line 81 |
| verify-enemy-pursuit.mjs | PASS |
| verify-enemy-separation.mjs | PASS |
| verify-summon-recovery.mjs | PASS |
| verify-hotbar-assignment.mjs | PASS |
| verify-skill-trees.mjs | PASS |
| verify-subclasses.mjs | PASS |
| verify-continent-runtime.mjs | PASS |

The two failing suites were re-run using Node `registerHooks` to substitute the
HEAD versions of the two changed runtime modules, keeping normal resolution for
all other imports. Both fail with the identical assertions before these save
changes. No checkout/reset or other agent's work was replaced.

The combat fixture directly duplicates a channel into a loadout slot; normal
loadout normalization removes duplicates. Existing foundation diagnostics reproduce
that fixture mismatch while production assignment API contracts pass. The density
assertion classifies all Orchard rooms except `boss` as combat; the authored triage
camp has NPCs/cots/supplies but no pack. This requires room-semantics reconciliation,
not a claim that enemies should be added to the relief camp. Assertions were not weakened.

## Browser and lifecycle checks

Use the existing dependency convention, for example:

```powershell
$env:RUNALIS_NODE_MODULES='C:\Users\austi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
npm run build
node tools/verify-engineering-browser.cjs --cycles=10
```

The dependency path is machine-specific; it points at an existing installation.
The packaged verifier starts a private loopback server on a random port, creates
isolated browser contexts and closes them. It does not import unbundled production
modules to inspect the bundle's internal state.

| Check | Result / limits |
| --- | --- |
| `verify-engineering-browser.cjs --cycles=10` | PASS root `/` and project `/Runalis/`, ten cycles each: actual load, keyboard movement, attack input, real save, increasing gold retained on next load, Save & Quit, old draw loop stopped; 66 successful sprite responses per context, zero page/request errors. Screenshots inspected: rendered town, player, HUD and hotbar. This is solo Orrakai smoke, not exhaustive combat or packaged co-op. |
| `verify-coop-session-regressions.cjs` with `RUNALIS_URL=http://127.0.0.1:8791` | PASS source application: P1 pointer/P2 controller morph changes and cooldown rejection, independent menu state, saved dropout/rejoin, either dropout chord order, logical ownership after browser device-index swaps, zero page errors. Devices are simulated, not physical controllers. |
| Existing `verify-pages.cjs` | FAIL: `No sprite atlas rendered` at line 53. It dynamically imports a new unversioned `spriteArt` module/cache and immediately reads it, distinct from the bundle's actual renderer. This is not evidence that the runtime rendered no sprites; the direct package smoke and screenshot confirm rendering. The old fixture remains to repair. |

The source browser suite used a disposable Node static server because the system
`python` command was unavailable. That server served this workspace read-only on
loopback port 8791 and was stopped afterward. No preview server or existing browser
session belonging to another task was stopped.

In the final packaged ten-cycle run:

| Path | Post-GC heap, first → last | Event listeners, every sample | Idle rAF samples |
| --- | --- | --- | --- |
| `/` | 10,800,896 → 13,284,036 bytes | 364 | 90 per cycle |
| `/Runalis/` | 10,873,480 → 13,311,108 bytes | 364 | 90 per cycle |

Slowing heap growth requires a warmed baseline and retaining-path investigation.
It is not proof of an unbounded leak, a clean heap or native/GPU memory behavior.
Frame intervals in the generated report reflect this headless host's scheduling
in an idle town; they are not general FPS, input-latency or combat performance results.
The script checks cessation of old draws and save persistence, not a universal
memory/FPS threshold. Generated evidence is `browser-verification.json` and
`package-root.png` / `package-project.png` in this directory.

## Confirmed open defects and their reproductions

These observations are separate from healthy regression passes.

- **E02 active-save recovery:** disposable Storage seeded at the active profile key
  with `{"priorCharacter": corrupted`. `upsertProfile('new', 'New', state)` returns
  `saved:true`; resulting collection has only `new` and the raw corrupted bytes are
  gone. No real save was involved. Both source readers return an empty map for
  parse failure; the controlled overwrite used the main writer.
- **Combat C01/C02/C03/C04:** `verify-combat-foundation.mjs` re-reports two HP
  lifesteal from one HP removed, reflected lethal damage without contributor/Combat
  XP, unreachable higher Blackbow set bonuses and host-versus-P2 party healing
  asymmetry. Its default zero exit includes seven healthy checks and diagnostic
  findings; `--strict` is deliberately nonzero while findings remain.
- **MP-001/MP-003:** `audit-multiplayer-foundation.mjs` re-confirms a different
  character collecting three departed-slot iron ore, and a permitted 6,289,437-unit
  packet emitting 525 chunks with zero received packets because receiver caps at 512.
  This script asserts defective baseline observations; exit zero is successful
  reproduction, not acceptable health.
- **MP-002:** `audit-multiplayer-browser.cjs`, source URL 8791, uses the actual
  host message handler with a disposable authenticated-actor record. It accepts
  guest gold 987654321, acknowledges it and leaves host gold unchanged. Zero page
  errors; no online room/public signaling or real network exploit was used.
- **E08 registry drift:** imported both live class tables and compared exported
  fields. All eight canonical definitions have differences; `eAbility` differs
  and several player entries omit slots/metadata exposed by `classData`. This
  demonstrates divergent definitions, not that every difference is an unintended
  gameplay bug. Reconciliation requires consumer/compatibility review.

## Automation and limits

Added a small `check:engineering` script using existing Node assertions/esbuild.
The Pages workflow runs it before staging and the new PR/manual quality workflow
runs it plus the build. Commands were tested locally on Windows; Linux GitHub
Actions has not been executed from this workspace. Existing feature checks remain
necessary and the failing aggregates above are not silently skipped as passing.

No physical controllers, human party playthrough, four-player performance matrix,
cross-network WebRTC/relay, network outage soak, mobile/Safari matrix or native
bitmap/audio-memory profiling was freshly validated. Existing director/performance
reports are historical evidence for those areas. No personal save library was
loaded; compatibility evidence is the existing synthetic migration suites and
controlled new fixtures. No gameplay balance, narrative, artwork, network policy,
save schema, dependency versions, publication or external communication changed.
