# Safe-zone player trading — November 2, 2026

Stand next to a teammate in Orrakai or another world explicitly marked as a safe
zone. After four seconds standing still within 72 world units and clear line of
sight, the familiar dialogue dots appear above eligible players with a Trade
label. Press **E**, **controller A**, or touch **Interact** to trade with the
nearest eligible teammate.

1. Add items from **Your tradable bag**. Set a whole quantity or use All.
   Set the gold amount and choose Offer gold, All gold or No gold.
2. Each player presses **Accept offer**. Changing an item or gold amount clears
   both approvals.
3. Review **You give** and **You receive** on the separate final screen, including
   gear quality, upgrade and quantities. Both players press **Confirm exchange**.
   The first confirmation alone transfers nothing.
4. Either player can Decline, or choose Change offer on the final review to return
   to editing. Nothing leaves either bag until the final exchange.

Crafting materials and ingredients (including reagents/raw fish and all recipe
inputs), quest/bound items, locked items and equipped gear are excluded. Unequip
and unlock gear in the existing inventory first. There are at most 20 offer lines;
the existing 20-slot gear capacity and acquisition/level requirements still apply.
Two full gear bags can exchange their occupied slots in the same transaction.

Both couch co-op and online parties use the same transaction rules. Local players
get separate panels within their own temporary split views, separate controller
focus and separate offers. Other party members retain control. D-pad navigates,
A selects and B/Back/Start declines an open trade. Keyboard navigation belongs to
P1; pointer/touch and numeric fields edit their explicitly selected panel. The
action buttons stay visible on compact displays while the offers/bag scroll.
Gold also has −1, +1 and +100 buttons for controller-only amounts; focus survives
offer refreshes so repeated selections keep adjusting the same control.

## Ownership, lifecycle and saves

- `tradeSystem.js` keeps readiness/session state outside character saves, using
  actual actor references and item-object keys rather than inventory indices or
  reusable player slots. One actor can belong to only one trade; a four-player
  party can have two disjoint trades.
- Offer/review revisions reject stale actions. All item/balance changes outside
  the negotiation invalidate it. The final host/local transaction validates both
  resulting inventories and balances before moving anything, preserving complete
  gear instance metadata and refusing identity collisions/overflow.
- Movement apart, leaving a marked safe zone, world replacement, death, local ally
  controller disconnect or departure cancels pending trades. Online disconnect
  removes the actor and cancels its unfinished trade. Panels and callbacks are
  owned by the game and cleaned up on save replacement/destruction.
- Local participating profiles are projected through the existing main/ally save
  serializers and written in a single existing profile-collection operation before
  applying the live exchange. A missing profile, unreadable collection or failed
  write cancels the trade. No item is removed as an offer/escrow step, so cancellation
  does not need to reconstruct inventory.
- Online guests send only trade intentions through their own authenticated
  connection. The host performs the exchange and sends authoritative inventories
  and gold; guests save immediately on receipt. Ordinary menu commits are blocked
  while trading, and pre-trade economy revisions cannot overwrite a completed
  trade. Trading itself does not trigger an ordinary character-copy commit.
  A failed guest write reports that the updated character must be kept open and
  saved again after freeing storage; it does not claim that saving succeeded.
- Existing imported-character trust remains (MP-002/E03); this change does not
  establish competitive anti-cheat or validate every arbitrary imported character.
  Host/guest storage on separate machines is not a distributed atomic commit.
  Abrupt process loss between host completion and guest receipt/save can still
  require recovery; no durable cross-browser receipt service was introduced.

There are no new gameplay/save fields, schema migrations, dependencies or service
costs. Online compatibility advances to `runalis-online-8-trading`; both devices
must load the current version to connect.

## Verification

Executed on Windows with Node 24 and headless Edge. Simulated pads use the real
Gamepad polling path. Online tests use native WebRTC and public PeerJS signaling,
with isolated browser contexts on one machine.

| Check | Evidence |
| --- | --- |
| `node tools/verify-player-trading.mjs` | **8/8 groups pass:** four-second/safe/distance/wall/movement gates; excluded items/all recipe inputs; stale/outsider/invalid-gold actions; approval invalidation; two stages/exactly-once exchange; full item metadata; death/leave/controller/world/mutation/decline cancellation; capacity/level/duplicate-ID/storage failure atomicity; two pairs in a four-player party; full-bag swaps and gold-overflow rejection |
| `node tools/verify-player-trading-browser.cjs` | **10/10 final staged checks pass**, zero uncaught page errors. Local/source and actual staged `/_site/` game tested through normal profile boot and real UI: independent two-pad join/offer ownership, exact gear/stack/gold exchange, both local saves, compact bounds/actions, native-WebRTC host/guest and guest/guest trades, host isolation, stale pre-trade commit rejection, guest quota failure/report/save retry and distance/disconnect cancellation |
| `npm run check:engineering` | **12/12 pass**, including the new trade transaction suite alongside save-storage, XP/revive/controller, world persistence, input protocol, party consent, progression and hotbar contracts |
| `npm run build` | **Pass:** exact shipped import/resource paths and case; 362 startup modules, 3.2 MiB bundle, 1,214 packaged files / 42.3 MiB |
| `node tools/verify-local-player-menus.cjs` | **12/12 pass**, zero page errors; equipment, abilities, independent menus/focus, continued teammate controls, saves and cleanup |
| `node tools/verify-online-lifecycle-browser.cjs` | **9/9 pass**, zero page errors; four-player/capacity, authentication failures, guest rejoin/isolation and host/guest closure |
| `node tools/verify-online-browser.cjs` | **Not passed:** mobile dialogue Leave-button timeout. Reproduced against unchanged HEAD source on a separate server as well as the trading working tree. The feature's dedicated native-WebRTC transaction tests pass; the broader pre-existing fixture failure remains recorded rather than weakening its assertions |

The packaged test uses the game's existing pause-overlay reference, so it does
not require an unbundled `main.js` request to expose the running game. Fixtures
create disposable profiles; no real player profiles are loaded. Generated JSON
and PNG captures in this folder are ignored by Git; this report and test scripts
are the reproducible evidence. Inspected the final-review and compact local
screens, then kept Accept/Decline visible while scrolling the contents.

Browser reproduction (with an existing server and Playwright folder):

```powershell
$env:RUNALIS_NODE_MODULES = 'C:\path\to\node_modules'
$env:RUNALIS_URL = 'http://127.0.0.1:8768'
node tools/verify-player-trading-browser.cjs
```

For the staged module graph, first run `npm run build`, serve the workspace root
and set `RUNALIS_URL` to that server's `/_site` path. The source helper modules used
for fixture setup remain available at the root; the playable UI/simulation under
test is the actual staged game and its versioned/bundled modules.

No physical controller, actual phone, separate internet connection or multi-hour
soak is claimed. The host's external signaling/relay availability and existing
broader save-recovery/character-import issues remain separate responsibilities.
