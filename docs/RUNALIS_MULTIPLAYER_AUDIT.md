# RUNALIS multiplayer assessment and quality register

October 31, 2026. Active root runtime. Companion:
[Technical Bible](RUNALIS_MULTIPLAYER_BIBLE.md) and
[executed evidence](multiplayer-audit/README.md).

## Assessment

RUNALIS already implements four-player local and four-player host-authoritative
online co-op on Canvas 2D. Current two-player local gameplay, independent menus,
native WebRTC gameplay and four-player online lifecycle checks passed. The game
does not need a new networking framework or Babylon.js conversion.

This is a functional foundation with confirmed defects and production-validation
gaps, not an unconditional readiness certification. No CRITICAL save corruption,
quest deadlock or normal-session divergence was reproduced during this pass.
That statement does not establish absence across all classes, quests or devices.

The assessment changes only documentation and diagnostic tools. Runtime fixes,
external infrastructure, paid services, balance/persistence-policy changes and
deployment are intentionally outside this initial investigation.

## Confirmed defect register

IDs remain stable through future repairs. Closure requires the listed acceptance
evidence and a Bible update. Severity describes impact; evidence describes how
the defect was established. Do not merge untested risks into confirmed defects.

| ID / severity | Evidence and root cause | Impact | Smallest correction and closure evidence |
| --- | --- | --- | --- |
| **MP-001 HIGH — Loot owner can change when a slot is reused** | **Reproduced**, `audit-multiplayer-foundation.mjs`. `lootSystem.js:27,59,115` stores/resolves only `ownerSlot`; join reuses vacant party slots. A disposable different profile in slot 2 picked up all 3 units left for the departed slot's actor. | A new local/online character can collect another character's outstanding loot. Display placement is being used as reward identity. | Bind new drops to a stable character/session owner, retain slot only for display, explicitly handle owner departure and legacy drops. Verify P2/P3/P4 leave, replacement join, original rejoin, save/reload, duplicate pickup and solo compatibility. Do not silently transfer or redistribute rewards. |
| **MP-002 HIGH — Guest menu commits can grant arbitrary progression** | **Reproduced** in isolated real-browser host-handler dispatch, not an authentication bypass. `onlineSession.js:17,113–117` allows gold/inventory/skills in a character update; size check and migration do not prove a legitimate transaction. A busy guest actor's gold changed from 0 to 987,654,321 and was acknowledged; host gold was unchanged. | An authenticated guest can alter its host-simulated character economy and combat power during a session. Broad imports are an acknowledged trusted-character model, but arbitrary in-session grants violate the requested authority contract. | Preserve player-owned saves/imports; replace in-session economy/progression edits with actor-bound validated operations. Reject stale/replayed revisions; acknowledge exact accepted results. Verify forged gold/item/XP/skill edits fail, legitimate purchases/equips/morphs work, and host/other guests remain unchanged. No accounts or competitive anti-cheat are required. |
| **MP-003 HIGH — Sender permits messages the receiver rejects** | **Reproduced** with the actual transport and in-memory connections. `onlineProtocol.js:4` permits 6,291,456 string units; `onlineTransport.js:31` chunks at 12,000, but receiver line 15 allows at most 512 chunks. A 6,289,437-unit valid-under-sender-limit message emitted **525 frames**, received zero messages and raised `Invalid network frame.` | A sufficiently large initial scene/profile/state packet can fail despite satisfying the advertised sender limit. No ordinary gameplay-scene threshold failure was observed. | Derive both limits from a single framing contract and measure encoded bytes/overhead. Boundary tests for 512/513 frames, Unicode, oversize, truncation, duplicate/conflicting frames and normal/large scene initialization; clear user error and unchanged saves on failure. |
| **MP-004 MEDIUM — Identity presentation is incomplete** | **Source-confirmed**: `lootSystem.js:28` labels only slot 2 as P2 and every other slot as P1. **Visually observed**: long test names and split labels crowd resource-header class/name text in `docs/coop-readiness/split-screen.png` and compact-menu captures. | Misleading P3/P4 loot notification and crowded identification in constrained views. Numeric pickup ownership is a separate HIGH issue (MP-001). | Format P1–P4 consistently; constrain name/class and split-label regions without changing art style. Check long/localized names, 2/3/4 players, compact landscape and real TV readability. |
| **MP-005 HIGH — Reflection lacks reward attribution** | **Confirmed in the Combat Director's existing audit C02**, source-reviewed here; not independently re-executed in a P2 live session. `combatActions.js:applyBlockReflect` can kill without recording the actor's ledger contribution. The combat audit reproduces lethal reflection with zero contributors/Combat XP. | Guaranteed solo missing reward in that case; incorrect party fallback ownership remains a follow-up risk. | Coordinate with [combat audit C02](RUNALIS_COMBAT_AUDIT.md). Record effective reflected damage and owner through the ordinary contribution/death path. Require solo/P2 final blows, teammate assistance, boss/suppressed rewards and repeat-callback checks. Preserve reflection damage and XP-sharing balance. |
| **MP-006 MEDIUM — Packaged browser fixtures do not fully exercise the bundled runtime** | **Executed failures**: `verify-pages.cjs:53` reports `No sprite atlas rendered`; it dynamically imports a separate source sprite module and immediately reads its newly initialized image status. `verify-mobile-multiplayer-pages.cjs:16` expects `mobileGame` from a routed `main.js`, while bundled `boot.js` starts the game without that separate request. | Existing fixture assumptions block a reliable packaged-browser acceptance result. A passing static build and source-game browser suites cannot substitute for the entire shipped-runtime gate. These failures alone do not prove a packaged gameplay failure. | Update the fixtures to observe actual bundled runtime behavior/assets and await image readiness without creating a separate cache as proof. Exercise root and `/Runalis/` deployment, create/load/move/fight/save, mobile multiplayer menus/hosting and stale-release cache handling; require zero page/resource errors. |

The diagnostic scripts deliberately assert the current **defective observation**
so a changed baseline is noticed. Exit 0 means successful reproduction, not
approval of that behavior. Replace each diagnostic with a correct-behavior
regression when its defect is repaired.

## Architectural risks and unresolved requirements

These are not reproduced failures unless a confirmed ID above is referenced.

| Risk / validation priority | What is known | Next evidence or decision |
| --- | --- | --- |
| **HIGH: Cross-network connectivity and host suspension** | Native same-machine WebRTC/public signaling works. Vendor includes default public STUN/TURN endpoints. Host tab owns simulation; no migration. | Separate home networks/mobile hotspot, forced relay and selected ICE-pair stats, signaling outage, suspend/resume and host closure. Do not assume public relay uptime or unlimited capacity. Obtain approval before significant recurring costs. |
| **HIGH: Quest ownership/persistence consistency** | Acting-player plus shared-host objective forwarding, personal bloodlines, one dialogue transaction; guest return-home saves restore original `story`/`quests`. | Matrix of host/P2 acceptance/completion, concurrent NPC attempts, stage/boss rewards, late join, bloodline, guest return-home and reload. Direction needed before changing quest-decision ownership or whether personal guest quest progress travels home. |
| **HIGH: Delivery across crash/disconnect** | Guest-local autosave about every 2.5 sec; manual rejoin creates a new connection/actor. No acknowledged durable reward journal. | Kill/pickup/quest at disconnect boundaries, storage-quota failure, abrupt tab/process closure, pending commit, original world restoration and no double delivery. Decide whether bounded loss remains acceptable before adding durable receipts. |
| **HIGH: Physical controller identity and replacement** | Logical slots/live-object/unambiguous-ID reconnect pass simulated-device tests. | Two/four actual pads, same-model simultaneous reconnect, Bluetooth index changes, new replacement device, explicit ownership confirmation and driver/browser variants. No verified arbitrary split-keyboard control or first-pad-to-P2 assignment UI. |
| **MEDIUM: Guest schema and raw frame pressure** | Input fields are bounded; menu import fields and authenticated character shape are broad. Rate budget counts assembled packets. Size unit is string length. | Nested/invalid character types, raw frame floods, proof/auth races, scene-load timeout and packet replay tests, with unchanged saved data. Scope safeguards to this small trusted co-op game. |
| **MEDIUM: Full-party combat ownership coverage** | Two-player normal attacks, ledger-labelled DoT/summon XP, actual Wolf, useful support, basic revive and selected subclass presentations pass. | P3/P4 and every projectile/trap/reflection/DoT/transform, simultaneous support, downed contributor, owner departure and summons; nearest-loot party membership through the killer path. Do not rewrite balance to fix identity. |
| **MEDIUM: Rendering and replication performance** | One simulation, multiple scene draws, shared zoom surface, per-recipient entity scans/JSON diffs, 10 Hz state / 25 Hz controls. | 1/2/4-player frame percentiles, CPU/retained memory over time, host bytes/sec, congestion and guest input-to-authority delay. No measured bottleneck or new optimization is asserted yet. |
| **MEDIUM: Latency and state channel behavior** | Reliable connection; ordinary 100 ms interpolation, large snaps, stale-input neutralization; no prediction/rollback. | Data-channel latency/loss/outage tests and telegraph/damage alignment. A lossy channel or prediction is optional only after measurement. |
| **LOW: Alternative invitation/layout UX** | Password Open/Join World; vertical split and adaptive/forced selection. | Short-code invitations or horizontal split only if requested or playtesting supports the benefit. Neither replaces the transport or requires a new engine. |

## Implementation order

1. **Protect ownership and progression first.** Repair MP-001 and MP-002 with
   local/online leave/rejoin, transaction and save regressions. Keep imported
   player-owned characters, existing XP percentages and host campaign policy.
   Coordinate MP-005 with combat attribution work; do not duplicate damage logic.
2. **Close transport and validation gates.** Repair MP-003, harden relevant
   character/frame boundaries, then correct MP-006 so the shipped bundle is
   tested directly. Re-run native WebRTC gameplay/lifecycle and solo/package checks.
3. **Finish the local reliability matrix.** Physical controllers, four-player
   menus/combat, all profile transition/save paths; fix MP-004 using the existing
   visual language. Preserve functional adaptive camera and independent menus.
4. **Resolve quest/save contracts with Narrative.** Trace each existing wrapper,
   identify intentional personal/shared rewards, then implement only corrections
   consistent with the chosen ownership policy. Preserve quest text and branching.
5. **Validate real networks and recovery.** Record ICE path, forced relay,
   delay/loss and suspension behavior. Consider explicit relay credentials,
   delivery receipts or prediction only for demonstrated failures and approved cost.
6. **Measure and polish.** Long sessions, supported browser/device matrix,
   per-mode performance, readability and regression automation. Production readiness
   follows evidence, not phase labels or visible remote characters.

The brief's phases 3–4 are substantially implemented already. The practical next
work is to close these defects and evidence gaps rather than start online play
again. No user decision is needed merely to receive the next specific assignment;
policy/cost questions remain clearly marked for when a change depends on them.
