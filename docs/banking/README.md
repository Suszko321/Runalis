# Shared device bank

Implemented November 2, 2026, from the player request. This follows the existing
Multiplayer director contract for actor-owned menus and browser-owned online
characters; combat balance, the 12% carried-gold death penalty, narrative text,
NPC identity and gear acquisition restrictions remain with their existing owners.

## Using the bank

Talk to Orrakai's Bank Clerk and select **Open bank**. The existing Storage Bank
service also opens it. Deposit unequipped gear or any positive whole amount of
gold; withdraw into the currently interacting character. All-gold buttons work
in either direction. Gear keeps its exact instance ID, rarity, upgrade tier,
rolled metadata and disposal lock. Equipped/Coterie-equipped, bound, quest and
non-transferable gear cannot be deposited. Crafting materials and other non-gear
items are outside this gear-and-gold vault.

The vault belongs to the site's local browser storage, shared by every saved
character in that browser profile, including local co-op characters. Online
guests access their own browser's vault; the host never sends or saves that
vault. Depositing while visiting a host's world keeps gear and gold available
after leaving, reloading that character and hosting a new world. A split-screen
participant can likewise leave, load their saved character as the main player
and access the same shared device vault when hosting.
This does not synchronize storage across browsers, devices or site origins.
Clearing site storage removes it along with the existing character saves.

Stored gold is outside actor balances and cannot be charged by either existing
death penalty path. The character only risks carried gold. Legacy per-character
`storage.goldReserve` balances merge into the shared vault once, with old
balances cleared in the same successful write. Failed migration leaves the old
balances intact and blocks transfers until the bank can be reopened successfully.

Keyboard arrows/Enter and controller D-pad/A navigate; Escape/B closes. Touch
controls provide item, amount and all-gold actions. Local participants receive
independent panels inside their viewports. Unrelated actors retain controls;
joining another local character temporarily hides bank panels so the profile
picker stays usable. Leave, death, controller loss, separation, world change and
game destruction release the relevant panel. No extra loop/timer is started.

## Persistence and boundaries

`bankSystem.js` validates a pure projected transfer. Withdrawals use existing
20-slot gear capacity, level and rarity acquisition rules and reject duplicate
gear identities. The bounded vault supports 2,000 gear rows and safe-integer gold.
`bankUi.js` owns actor panels, legacy reserve migration and existing serializers.

The existing `runalis-profiles-v7-slim-save` JSON collection gains one reserved
`__runalisDeviceBank` metadata entry, with version, revision, gold and items.
`profileStorage.js` hides it from character readers and preserves it through both
host and co-op writers, slimming, character deletion and ordinary autosaves.
Character save schema stays 18. One localStorage replacement stores the bank and
projected character together, before changing the live actor; quota failure
leaves both unchanged. Corrupt current JSON is rejected rather than replaced.
Web Locks serialize banking operations across tabs where the API is available.
Opening the same character in multiple tabs retains the existing save-writer
concurrency limitations; this feature does not introduce general save locking.

Online banking reuses the established browser-owned service/menu character
commit channel and existing trade epoch guard. Changes are saved on the guest
before being committed to the host actor. Its vault is never part of a network
packet or character snapshot. As with existing character menus, imported/profile
economy trust (E03) and distributed failure recovery are not solved here. Offline
durability is atomic within the browser collection; host/guest delivery is not a
distributed database transaction. Compatibility build advances to
`runalis-online-9-banking` so older clients must refresh.

## Verification evidence

- `node tools/verify-banking.mjs`: 6/6 passing transaction/storage groups. Includes
  conservation, invalid amounts/overflow, non-mutating projections, exact locked
  gear/metadata, another character's withdrawal, equipped/bound/material exclusion,
  stale identity, full bags, acquisition level, duplicate identity, host/co-op
  writers, emergency slimming, deleting all characters, quota and corrupt JSON.
- `tools/verify-banking-browser.cjs`: 10/10 passing against the production
  package at `/_site`; zero page errors. Real teller dialogue, legacy reserves
  from two profiles, gear/gold transfers and saved values, quota failure, reload
  into a different character, actual carried-gold death penalty, three viewport
  sizes, stale displayed-gear selection, local co-op/controller ownership, moving away and native PeerJS/WebRTC
  guest teller delegation with isolated browser vaults.
- Guest-to-host continuation coverage deposits gear and gold as a split-screen
  participant and as a native WebRTC guest, leaves each session, reloads the
  original saved character, opens a new online host world and withdraws both.
  Exact instance ID, rarity, tier, lock and custom metadata remain; the original
  online host's vault and carried gold stay untouched. Character normalization's
  existing itemId/quantity aliases are checked separately from bank-copy fidelity.
  This verifies existing world-independent bank ownership; no runtime ownership
  or save-format change was necessary for this follow-up.
- Inspected phone portrait and landscape captures. Follow-up styling keeps Store
  and Close labels unbroken and bank controls at least 44px high. Browser testing
  found the bank covering the local join picker; panels now hide and yield input
  while that existing picker is active, with the two-player contract passing.
- Engineering gate 13/13 and production build pass. Existing profile-storage
  12/12, trading browser 10/10, local-player-menu browser 12/12 and online lifecycle
  browser 9/9 pass.

Physical controllers, real phones, Safari, separate-network play and prolonged
storage/concurrency soak have not been tested. Playwright simulates Gamepad
polling and uses isolated temporary browser profiles, never player storage.
