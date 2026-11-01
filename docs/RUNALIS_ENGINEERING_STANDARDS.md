# RUNALIS engineering standards

Authoritative engineering reference · established October 31, 2026.
Applies to the root application. Read the [architecture audit](RUNALIS_ENGINEERING_AUDIT.md)
and [quality register](ENGINEERING_QUALITY_REGISTER.md) when touching a listed risk.
Combat, Multiplayer, Narrative and Art directors retain ownership of their design rules.

## Work with the existing architecture

RUNALIS uses native JavaScript modules, Canvas 2D and Web Audio. `main.js`
coordinates one local/host simulation; online guests receive host state.
Do not introduce Babylon.js, a UI/state framework, another event bus or another
manager hierarchy without a demonstrated requirement and a grounded proposal.
The nested `Runalis/` upload is archival, not a second development target.

## Organization and interfaces

- Keep ownership in the existing subsystem: `*Data.js`/profile registries for
  definitions, `*System.js`/runtime modules for behavior, render/art modules for
  presentation, `tools/` for validation/authoring, `docs/` for contracts/evidence.
- Use the surrounding file's style. Prefer descriptive camelCase functions/fields,
  PascalCase classes and UPPER_SNAKE_CASE shared constants. Avoid unrelated formatting.
- Use explicit relative ESM imports/exports with exact filename case. Preserve
  public exports and compatibility aliases. New imports should use plain `.js`
  URLs; release versioning belongs to `prepare-pages.mjs`, not hand-written queries.
- Put genuinely shared formulas in their established owner, such as
  `progressionMath.js`, `combatPower.js`, `combatProgression.js` or `cooldownClock.js`.
  Keep local constants local. Do not build a universal configuration file.
- Check registries and callers before adding a utility or definition. `data.js`
  composes items/abilities; `classData.js` is the intended class definition owner.
  Its duplicate table in `player.js` is known debt; preserve behavior until reconciled.
- Prefer direct subsystem calls and existing hooks. If adding a callback, observer,
  timer or listener, define who owns it, its lifetime and how it is released.

## Authoritative state and subsystem boundaries

| State | Owner / required integration |
| --- | --- |
| Character and inventory | Actor object created/migrated by `player.js`; use inventory/equipment operations rather than editing UI copies. `skillState` owns progression; legacy `skills` is a synchronized bridge. |
| Derived vitals | `player.js` calculations and refresh paths; interfaces display the actor's derived values. Preserve all intentional class/tree modifiers. |
| Skills and combat | `abilityLoadoutSystem`, morph, mastery, charge/channel and combat modules own their respective actor state. Hold charging and replenishable use charges are different mechanics. |
| Damage/rewards | Existing hit/death paths and `combatProgression` contribution ledger; retain source/actor identity, effective damage, suppression and exactly-once rewards. No new parallel damage pipeline. |
| World/entities | `game.world`, factories and world lifecycle modules. Continental resident lists are subsets; logical entities and `player.worldMemory` retain persistence. Use `world.js` collision helpers. |
| Quests/story | Live transitions and objective hooks in `dialogueSystem.js`; `quests` is the active log, `questState`/`quest` compatibility bridges, `storyProgress` owns story flags. Do not add live transitions to legacy `questSystem.js`. |
| Inputs/menus | `inputController` and `main` route input to the actor; local menu documents have independent focus and point at live actors. UI must not independently own inventory, progression or world simulation. |
| Co-op | `couchCoop` owns joined actors; a session slot/controller index is not a persistent character identity. Resolve the correct actor, host/world owner and recipient explicitly. Preserve personal versus shared quest policy. |
| Online | `onlineSession` owns connection/session state; host simulates movement/combat/world, guests own their local profile. Validate network data at the boundary. Character import/update trust remains an open register item. |
| Saves | `saveProfiles` owns normalization/schema; `gameSave` owns main collection/snapshots/restoration. Co-op currently has a parallel writer: include both paths in save fixes until consolidated. |

## Updates, rendering and lifecycle

- Pass `dt` in seconds for simulation and movement. Existing `now` combat timestamps
  use session seconds; `Date.now()` is calendar milliseconds. State which clock a
  new expiry uses and define save/reconnect rebasing. Test pause and long frames.
- Preserve the existing frame clamp and timing-sensitive behavior unless fixing a
  demonstrated defect with appropriate coordination. Do not add a second game loop.
- Renderers consume gameplay state; presentation caches/animation bookkeeping may
  update, but drawing must not grant rewards or advance combat/quests. Split views
  draw the shared world rather than simulating it again.
- Distinguish page-lifetime singletons (audio unlock, shell, release checks) from
  game/world/actor resources. Game destroy must stop work and detach owned resources.
  Remove iframe menus, temporary effects, stale entity references and session caches.
- Reuse intentional atlas/audio/terrain caches. Never dispose shared assets while
  another actor/view needs them. Bound strong caches; use weak ownership where it
  already fits. Measure retained memory before claiming a leak or leak freedom.

## Compatibility and failure handling

- Preserve persisted field names, content IDs, aliases and unknown compatible data.
  Schema is currently 18; do not confuse it with older per-player compatibility tags.
  Change a stored shape only after examining all readers/writers and migration needs.
- Saves must not mutate the live actor. Strip/rebase transient state at established
  boundaries. Test old and new saves, round trips, separate actors and instance returns.
- Never delete profiles to meet storage quota. Keep migration/recovery sources until
  the complete replacement write succeeds. Treat unreadable storage as an error,
  not permission to overwrite it with an empty collection; recovery handling is open.
- Handle expected failures at storage, network, asset and startup boundaries. Report
  useful context; avoid blanket try/catch and silent successful-looking fallback.
- Do not put private credentials in browser code. Treat saves, network packets and
  imported authoring data as external input. Use bounded fields and existing validation;
  distinguish imported-character policy from host-authoritative transactions.

## Change and review checklist

1. Inspect the working tree, owner, callers, indirect registries and relevant tests.
2. Choose the smallest correct change. Consolidate only equivalent behavior; retain
   intentional mechanics and compatibility bridges. Do not split files for line count.
3. Check direct/dynamic references, HTML/lab/tool consumers, persisted IDs and replacement
   behavior before removal. Record significant removals; uncertain code stays pending review.
4. Add meaningful regression cases for changed calculations, transactions, ownership,
   saves or cleanup. Reuse Node assertions and existing browser tools; no new framework
   is needed. A defect-reproduction script exiting zero is not a passing health contract.
5. Run `npm run check:engineering` and `npm run build`, plus affected feature/browser
   suites. Browser checks use `RUNALIS_NODE_MODULES` for the existing Playwright install.
   Report unavailable checks and failures honestly; never weaken assertions to go green.
6. Review the diff for unrelated work, behavior changes and compatibility. Update the
   register for material issues. Commit coherent changes only within the authorized workflow.

Optimize from a measured baseline and root cause, then compare results and regressions.
Prefer understandable code over speculative caching, pooling or abstractions. Do not
upgrade dependencies broadly; the current npm dependency is pinned build-time esbuild,
and vendored PeerJS requires its own review. Standards change only when a real contract changes.
