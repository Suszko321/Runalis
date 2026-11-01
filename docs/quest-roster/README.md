# Playable quest roster — 1 November 2026

Director-requested removal of every quest outside the main campaign, Castle Veyreign bloodline adventure, Blighted Grove, Ashen Orchard and WIP Iron Mine. This supersedes the October assessment's wider quest/organization catalog.

## Retained content

| Category | Stable quest IDs |
|---|---|
| Main campaign | `mercy_in_orrakai`, `act1HearthmereAshes`, `act2AureateReckoning`, `act3Severance` |
| Castle Veyreign / vampire bloodline | `vampireRedChalice` |
| Blighted Grove | `groveLastLullaby` |
| Ashen Orchard cellar | `orchardBelowTheBurn` |
| WIP Iron Mine | `ironMireLastShift` |

Eight quest records represent those five requested categories. The main campaign's existing act structure and IDs remain. This change does not implement or redesign The Three Seraphs.

## Removed paths

Removed 36 other registered definitions: 19 miscellaneous/legacy quests, nine Your Order quests, four companion errands, Cambion and Nephilim quest paths, and the older surface Orchard/Chapel resolution quests. Removed their offers, conditions, resolution dialogue and companion assignment text; removed the obsolete Iron Mire Salvage offer from the new mine conversation. The old base quest exports remain empty compatibility objects, rather than alternative quest registries.

Local NPCs, roads, dungeons, lore, training, smithing, medicine and other services remain. Greyhaven's task ledger/repair/archive interactions and organization recruitment/assignment UI are unavailable. Existing organization data, restored scenery, patients and prior POI outcomes remain saved. The compatibility module contains no quest/dialogue/assignment definitions.

`questRoster.js` defines the current supported IDs. Save normalization and live quest-log initialization remove retired active/completed/failed entries, old progress/notification records and tracking pointers. The journal no longer synthesizes First Oath/Hungry Shrine tutorial quests from legacy numeric flags. Earned gold/items/XP, permanent bloodlines, character abilities and historical world flags are preserved; no refund or new completion reward is granted.

Interrupted conversations carry a roster version. Older snapshots reopen today's authored NPC conversation instead of replaying embedded retired offers/replies; retired or cached assignment choices cannot commit rewards or restart tasks. Existing current-version main dialogue keeps its normal interruption behavior.

Minimap quest targets ignore retired quests in either log/compatibility state and ignore retired IDs on cached world entities. NPC radar eligibility now uses the same `npcHasQuestInteraction` predicate as overhead exclamation marks, so inaccessible future main givers are not marked simply because they occur in a registry. Main objective and retained adventure markers still work; normal residents use friendly/service markers. A Castle acceptance option that closes its conversation remains visible and starts the retained quest.

## Verification

Passed after the final changes:

- `npm run check:engineering`: 11/11 checks.
- `npm run build`: native module/resource paths and shipped startup bundle.
- `verify-quest-roster.mjs`: nine groups covering exact roster, deleted IDs, NPC metadata, absence of retired dialogue, refusal to start removed quests, nonmutating save cleanup, earned-state preservation, host/P2 markers, stale dialogue/actions, retained offers/services and no restart from old organization flags.
- `verify-quest-roster-browser.cjs`: actual source game startup, training reply, real Canvas overhead-mark calls and radar pixels, rendered journal, positive control for current main markers, and an old raw browser profile loaded through the real title menu. Gold remains 417; current Mercy progress survives; retired quest and tracker disappear; zero page errors.
- `verify-engineering-browser.cjs --cycles=3`: three packaged startup/movement/save/quit/reload cycles at both `/` and `/Runalis/`, no browser/resource errors.
- Campaign: `verify-mercy-flow.mjs`, `verify-act1-campaign.mjs`, `verify-campaign-dialogue.mjs`.
- Retained adventures: `verify-blighted-grove.mjs`, `verify-ashen-orchard.mjs`, `verify-iron-mire.mjs`, `verify-veyreign.mjs`, `verify-veyreign-feral.mjs`.
- Services/visibility: `verify-root-retort.mjs`, `verify-quest-interactables.mjs`.

The old Order feature assertions were removed from the campaign verifier because that feature is deliberately retired; replacement tests require its absence and preserve saved outcomes. Training and evidence assertions now require removed errands to stay absent, while still exercising training, services and current main-story evidence gates. No assertions were disabled to excuse a current-feature failure.

Local evidence: generated `verification.json`, `browser-verification.json`, `markers.png`; the repository ignores these captures. The reproducible tools and this report are the durable record. Browser dependency convention:

```powershell
$env:RUNALIS_NODE_MODULES=(Resolve-Path 'tmp/multiplayer-audit-deps/node_modules').Path
node tools/verify-quest-roster-browser.cjs
node tools/verify-engineering-browser.cjs --cycles=3
```

Both browser tools start their own loopback server and isolated browser profiles. Progression suites expedite travel/deaths; these results do not establish a new combat-balance playthrough or physical-controller test. No commit, push or deployment was performed.
