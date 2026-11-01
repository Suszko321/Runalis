# Narrative assessment validation

Executed 31 October 2026 against the local root `src/` runtime, Node 24.15.0 and headless Microsoft Edge. Current results are reported below; older implementation-report counts are not substituted for fresh checks. Local captured command results are in generated [validation.json](validation.json); detailed inventory and controlled progression probes are in generated [inventory.json](inventory.json). JSON/captures under docs are ignored by the repository and can be regenerated; the Markdown record and audit source are the durable review artifacts.

## Executed source suites

Sixteen of these seventeen existing suites passed. The failed historical preservation suite is retained and explained; the assessment does not claim a fully green repository.

| Command (`node tools/…`) | Result | Observed coverage |
|---|---|---|
| `verify-act1-campaign.mjs` | PASS | Current dialogue destinations, town/field actors, Hessa consent, nine old-stage save cases, both report branches, six classes, Order founding/undertakings/shelter/recruitment, lantern custody and unrelated demon-boss protection. |
| `verify-malakar-climax.mjs` | PASS | 22 checks: 1–4 actors, deliberate entry/decline/disconnect, ritual sacrifice/skip/three responses, mid-scene saves, active/victory state, repeat-safe rewards, retry and attack geometry/timing. |
| `verify-campaign-dialogue.mjs` | PASS | Nine mandatory scenes, distinct progression, substantive questions, persistent topics, secondary-player/shared stage and regulator, speaker attribution, training access, effect idempotence and old saved conversation refresh. |
| `verify-quest-interactables.mjs` | PASS | 52 evidence objects; art contracts, quest gates, early hiding, scene/prompt/radar consistency, lantern readiness, saved/shared visibility and retained residents/stairs. |
| `verify-act1-access.mjs` | PASS | 1,045 interaction approaches, 276,244 reachable early walking cells, campaign layer installed; no failed targets. |
| `verify-act1-descent.mjs` | PASS | 12 Keep floor/seed cases, reachability/save restoration, six classes applying basic-weapon damage and boss/death integration smoke. |
| `verify-continent-roads.mjs` | PASS | Directions-only gates, free independent walking, early visits do not start later acts, proper story arrival requires preceding quest plus flag, explicit expedition service retains costs. |
| `verify-continent-access.mjs` | PASS | Independent fixture: 1,122 approaches, 103 later targets, 275,790 reachable early cells; no failed targets. Counts differ from campaign-layer access by construction. |
| `verify-continent-persistence.mjs` | PASS | Schema 18; 100 hydration cycles, chunk unload/return, safety preview, wounds/deaths, loot expiry, harvest keys/timers, 192 generated-snapshot bound, active fights, sparse returns and once-only old geography migration. |
| `verify-continent-instance-returns.mjs` | PASS | No virtual-tile cloning; stable source/entrance identity; saved side-zone clear/chest/deaths; no duplicate clear XP; dungeon/tower return metadata and actor-safe arrival. |
| `verify-blighted-grove.mjs` | PASS | Authored entrance and Edda, three distinct binding memories and guardian conditions, collision routes, sealed arena, wipe/save behavior, four attacks and one-time conclusion/rewards. |
| `verify-ashen-orchard.mjs` | PASS | Engineer/Tamsin assignment, guarded return valves, reachable workrooms, Custodian seal/retry/save, actual dungeon completion, camp report and dedicated nonduplicating 2% Signet roll. |
| `verify-veyreign.mjs` | PASS | Five-floor progression/seals, individual refuse/accept outcomes, repeat suppression, helper exception, 1–4 actor health/arrival, old saves, wounds, reset and attack/evasion contracts. Royal-beast-specific suite was not rerun here. |
| `verify-party-entry.mjs` | PASS | 2–4 actors; unanimous/once-only commit, rejection/timeout/stale votes/party changes, actor-owned controls, transient votes, P2-initiated dungeon/Grove/tower entry and boss entry, solo and independent overworld behavior. |
| `verify-coop-session-state.mjs` | PASS | Logical device ownership/reconnect simulations and 25 generated-patrol save/reload cycles without tempo drift. Does not certify physical controllers. |
| `verify-root-retort.mjs` | PASS | Twelve checks: upstairs Mara/downstairs Oren, stairs, collision route to Mael, medicine/trainer roles, old placement migration, saved floors and evening exit clearance. |
| `verify-world-rebuild-contracts.mjs` | FAIL: 2 groups | Frozen Mercy objective shape no longer matches current approved progression; retired `nav-hearthmereFrontier-pilgrimBridge` expected by old navigation baseline. Eleven other groups passed, including physical refs and post-resolution Chapel witnesses. |

Historical suite failure is a validation maintenance issue, not evidence to undo current Mercy improvements or reinstall intentionally removed stones. It stops comparison at the first changed quest and does not establish whether every remaining frozen shape still matches. Preserve the frozen input for migration checks and introduce explicit current expectations in a focused follow-up (N-009).

## Complete scripted Act I flows

Ran `verify-mercy-flow.mjs` for every combination below using `RUNALIS_TEST_CLASS` and `RUNALIS_REPORT_TO`. All twelve passed, each with **42 save/load checkpoints**: **504 checkpoints** in total. These runs follow real dialogue/evidence/production death handlers without injecting quest stages. They reposition travel and expedite enemy death; they are not normal-speed navigation or combat survival runs.

| Class | Mael first report | Callworth first report |
|---|---|---|
| Oathkeeper | PASS, 42 checkpoints | PASS, 42 checkpoints |
| Fellhunter | PASS, 42 checkpoints | PASS, 42 checkpoints |
| Gravecaller | PASS, 42 checkpoints | PASS, 42 checkpoints |
| Lightbringer | PASS, 42 checkpoints | PASS, 42 checkpoints |
| Thornbinder | PASS, 42 checkpoints | PASS, 42 checkpoints |
| Waverider | PASS, 42 checkpoints | PASS, 42 checkpoints |

Example in PowerShell:

```powershell
$env:RUNALIS_TEST_CLASS='oathkeeper'
$env:RUNALIS_REPORT_TO='lightwardenCaelen'
node tools/verify-mercy-flow.mjs
```

## Actual browser checks

Used isolated automation browser contexts, not the user's existing profile/session, against the already running local preview on port 8768. Browser module access uses the project's existing Playwright dependency convention.

| Check | Result and scope |
|---|---|
| `verify-campaign-dialogue-browser.cjs` | PASS on desktop and mobile viewport/touch configuration. Real dialogue controls, player/NPC speech, explicit progression, remembered optional topic and production save/restore. Zero page errors. |
| `verify-malakar-browser.cjs` | PASS after updating two stale readiness selectors to `#partyEntryPanel` and the actor's `data-entry-vote` button. Real E interaction, explicit click acceptance, ritual playback, Escape skip, introduction response, keyboard movement, phase rendering, death and portal. Zero page errors. |

The first Malakar attempt timed out because the test expected the retired readiness DOM/button. Source inspection established the shared party panel is current. The test was repaired; no game/story behavior changed. Encounter setup and phase/death HP are injected in that existing browser verifier, so its pass does not demonstrate a normally progressed victory. Captures are generated under `docs/malakar-climax/`; dialogue browser artifacts under `docs/campaign-dialogue-review/`.

Reproduction in PowerShell, with a preview server already serving this workspace:

```powershell
$env:RUNALIS_NODE_MODULES=(Resolve-Path 'tmp/multiplayer-audit-deps/node_modules').Path
$env:RUNALIS_URL='http://127.0.0.1:8768'
node tools/verify-campaign-dialogue-browser.cjs
node tools/verify-malakar-browser.cjs
```

The dependency path is local environment state, not a newly introduced game dependency. Set it to another installed Playwright location when necessary.

## New assessment probes and inventory

`node tools/audit-narrative-foundation.mjs` completed successfully. Constructs source worlds with published overrides disabled; installs campaign/Old Well review layers, three town/opening spaces, eleven dungeon identities across 35 floors and authored Grove. Writes inventory and document indices without accessing browser profiles. It resolves all checked static references, including runtime-injected Old Well and Grove's instance-only giver. Conditional actors are listed without certifying eligibility in every save state. No generic enemy-kind/drop-source completeness claim is made.

The same audit deliberately kills the real final-floor boss through production `updateEnemies` using a fresh in-memory character for each case:

| Probe | Observed result |
|---|---|
| Shattered Choir, no preceding main quests | Boss death handled; dungeon clear; `act2Complete`, Zephyr/revelation flags, route unlock and completed Act II record appear. **Defect N-001 reproduced.** |
| Ascension Spire, no preceding main quests | Boss death handled; dungeon clear; `act3Complete`, Zephyr direct-voice/ending flags and completed Act III record appear. **Defect N-001 reproduced.** |
| Optional generated holy dungeon under a review-only ID | Generated Seraphel-type boss death also completes Act II. Demonstrates broad matching; does not assert this review-only dungeon is a physical live entrance. |
| Actual failed-purification side-zone factory | No non-miniboss remains after the factory demotes boss roles; that route is not demonstrated affected by this probe. |

The script is an audit, so successful execution records defects instead of asserting that defective outcomes are acceptable. `floor:999` in the probe is clamped by the real dungeon factory to its last floor; it selects the fixture, not an in-game traversal. No quest stages, lore conclusions or player saves are changed by the audit itself.

## Build and remaining limits

`npm run build` passed: 326 startup modules bundled; 865 staged playable files; resource paths and filename case validated. `git diff --check` passed. Node's existing module-type warning is informational. No dependency/package or production `src/` changes were made.

Not certified: all 43 quests completed by hand; uninterrupted normal-speed Act I; every side-quest alternate outcome; earned-resource boss survival/balance; all historical profiles; physical couch co-op/controller hardware; the complete online quest-choice matrix; long-session performance; unbuilt Three Seraphs/capital/final-story content. These remain explicit work, not implied by the checks above.
