# Couch co-op readiness — October 30, 2026

## Shared HUD layout follow-up

Shared-screen play no longer renders a minimap. P1/P2 hotbars sit in the bottom-left/bottom-right corners; P3/P4 use a second row above those bars. Resource banners stay at the top corners. Local HUDs now reuse the single-player character portrait renderer and skill icons, with matching brass frames, dark iron panels, resource gradients, serif headings, and controller-key badges. Split-screen minimaps remain. Browser validation now includes 13 checks, including radar absence and on-screen bottom hotbar placement for 2–4 players at 960×600 and 640×360. The shared dungeon screenshot was visually reviewed; the build passes.

**READY WITH LIMITATIONS.** The exercised two-player paths pass automated and browser validation. Physical gamepads, television readability, and an extended human play session remain unverified. This is not a claim that every class, quest, device, or networking condition was interactively tested.

## Adaptive camera follow-up

Pause → Settings now includes a persistent **Co-op Camera: Join When Close / Forced Splitscreen** toggle. Join When Close uses party bounds to join nearby players, gradually zoom out to 65%, then split; a tighter rejoin threshold prevents boundary flicker. Forced Splitscreen keeps separate views even nearby and in dungeons. Online sessions retain separate full-screen views. Existing arena barriers/consent remain; the old dungeon proximity tether no longer prevents players separating under the new camera rules.

Shared scenes render into a reusable surface at the expanded world-view size, then scale to the display, keeping world culling correct. Mouse aim and enemy combat-view bounds account for zoom. Local HUDs remain at native screen size. The browser regression now has **12 checks**, including close/join, zoom, far/split, forced split via the actual Settings button, and returning to automatic mode. Build and party-entry tests pass after the camera changes.

## Repairs

| Problem | Cause and correction |
|---|---|
| Unplugging P1 could steal P2's controller and remove P2 | `inputController.js` reserves the established host slot; `main.js` retains that reservation when disconnected. Additional controllers keep their actors. |
| Accidental disconnect discarded an ally | Controller reconciliation now retains the actor and supplies neutral input until reconnection. Explicit leave still saves and removes the actor. The HUD reports disconnected controllers. A disconnected character remains in the world and can take damage. |
| One ally could inherit another controller's actions | Removed the slot-number fallback in `couchCoop.js`; an actor only receives input from its assigned controller index. |
| P2's death rewards used P1's context | `combat.js` now resolves the killer from the encounter contribution ledger before renown, loot, and death processing. Combat XP already used the ledger; the same identity now drives both paths. Existing quest-owner forwarding is retained. |
| Teammates disappeared from radar beyond its radius | `minimapRadar.js` renders party members separately from culled entities. Off-screen/out-of-range arrows point toward the target and stay inside the radar border; nearby arrows show character facing. Downed allies remain findable, and inactive allies disappear. |
| Teammate identity was always white | `partyIdentity.js` defines P1 gold, P2 green, P3 purple, P4 cyan. Radar and local HUD use that palette, with numbered radar labels in local co-op. |
| Local viewports had no individual radar | `main.js` draws a radar per split-screen viewport, and a central party radar in shared-camera areas when space permits. Existing split-overworld/shared-dungeon camera rules remain. |
| Online devices assigned different colours to the same player | `onlineSession.js` transmits the host's party map slot without changing the guest's local gameplay/UI slot. This transient identity is removed from guest saves. |
| Online party actors suppressed the ordinary minimap | `minimapHud.js` distinguishes remote actors from local couch actors. Online devices keep their ordinary minimap; couch HUD layouts are not applied online. |
| Local HUD omitted combat XP and passive information | `splitScreenHud.js` shows actor-owned level, XP bar, active passive/subclass labels, poison/burn/slow, and disconnect status. Existing resource, charge, cooldown, and revive displays remain. Long status text is truncated to fit. |
| Hotbars overflowed narrow shared-camera panels | Slot size now respects available viewport width. |
| Build emitted a duplicate damage-option warning | Removed an overridden duplicate `magic` property in `subclassCombat.js`, preserving the effective value. |

No enemy level scaling, XP eligibility changes, new revive system, inventory crafting redesign, or save-schema changes were introduced. Existing authored boss party-health rules remain.

## XP mathematics and eligibility

The existing rule requires an encounter contribution (damage or useful support), `playerParticipation`, and distance no greater than 1000 world units at death. Unattended summons do not automatically establish player participation. This was preserved rather than changing XP into a proximity-only reward.

Combat reward uses `enemy.baseCombatXp` when present, otherwise the supplied enemy XP. The last recorded damaging actor is credited. Each qualifying final hitter gets 100%; each other qualifying contributor gets 50%. Fractional XP is retained: the controlled test gives **101 XP to the killer and 50.5 XP to the helper**, in both directions. Repeated award/death processing leaves those totals unchanged. Skill proficiency allocation distributes that budget and then applies existing skill affinities; it does not create a second combat-level award.

`verify-coop-readiness.mjs` exercises P1/P2 final-hit identity with weapon, summon, and DoT contribution sources, proximity exclusion, idle exclusion, duplicate callbacks, and the real enemy-death loop's P2 combat/renown ownership. Source-labelled contribution tests are controlled ledger tests, not a claim that every summon or DoT ability was individually played. Existing progression tests additionally execute real Wolf combat and all 87 defined active ability dispatches.

## Executed validation

All commands below completed successfully during this pass (Node's existing module-type warning is informational).

| Validation | Observed coverage |
|---|---|
| `verify-coop-readiness.mjs` | Both reward directions, fractional shares, duplicate prevention, eligibility, real P2 death rewards, controller reservation, four distinct colours, P1/P2 downing and timed three-hit revive, P2 bleedout respawn |
| `verify-coop-readiness-browser.cjs` | 11 checks in headless Edge: normal startup; actual join/profile picker with simulated Gamepad API input; simultaneous movement; both controller reconnects; P2 menu ownership; real two-actor combat and enemy damage to P2; rendered arrow pixels; split-screen maps; independent health/XP/status rendering; shared dungeon camera; save and leave. Zero uncaught page errors. |
| `verify-online-browser.cjs` | Separate browser sessions connected using native WebRTC/public PeerJS; host-authoritative movement/combat; mobile input; sounds/effects; dialogue ownership; shops/forge/fishing; dungeon consent and travel; six subclass presentations; host closure recovery; matching player colours and ordinary minimaps. |
| `verify-online-lifecycle-browser.cjs` | Wrong password, duplicate host, four players, capacity rejection, leave/rejoin, profile isolation, abrupt guest closure, host shutdown; zero page errors |
| `verify-progression-overhaul.mjs` | 23 checks, 88 class/level simulations, 19 measured attack timings; XP/support, ownership, summon behaviour, mastery, save migration, all 87 ability dispatches |
| `verify-party-entry.mjs` | Two through four actors; unanimous consent, cancellation/timeouts, actor-owned votes, P2-initiated dungeon/grove/tower travel, boss entry, save cleanup, immediate solo travel |
| `verify-dungeon-boss-coop.mjs` | Two authored bosses with one through four players; party damage, camera-independent arena attacks, health/save consistency, wipe reset |
| `verify-dungeon-retry-session.mjs` | Human/feral defeat, Nav Stone returns, retry/seals, co-op consent, logout cleanup |
| `verify-workshop-services.mjs` | 13 checks including owner-only charges/equipment, all 63 recipes, authority, atomic costs, persistence |
| `verify-malakar-climax.mjs` | One through four players; entry consent, story branches, arena hazards, phase transitions, repeat-safe rewards, retry and save restoration |
| `verify-veyreign.mjs`, `verify-veyreign-feral.mjs` | Five-floor progression, individual choices, repeated visits, boss/feral phases, attacks, saves, wipes and rewards |
| `verify-act1-campaign.mjs` | Authored quest dialogue, old-save progression, six classes, story event and reward consistency |
| `verify-dungeon-floor-progression.mjs`, `verify-continent-instance-returns.mjs` | 40 floors, 21 dungeon transitions across seven themes, instance/return persistence and actor-safe arrival |
| `verify-gameplay-ai.mjs`, `verify-live-aim.mjs` | Combat approach/target tactics, projectile sightlines, steering, charged and heavy attacks |
| `verify-block-hotbar.mjs`, `verify-summon-recovery.mjs` | All four controller bindings, independent Block/resource behaviour, channels, summon rest/recovery and owner combat |
| `verify-online-protocol.mjs`, `verify-online-presentation.mjs` | Packet/input boundaries, input edges, cooldown clocks, live actor references, ownership and save isolation |
| `npm run build`, `git diff --check` | Startup bundle/resource paths/filename case and patch whitespace pass; final build has no duplicate-key warning |

Browser captures and machine-readable results are generated beside this report and under `docs/online-multiplayer/`. These generated PNG/JSON files are intentionally ignored by the repository. The reproducible scripts and this report are source files.

## Limits and tonight's manual check

No physical-controller test, controller driver/index reassignment test, multi-hour memory/FPS soak, or real television readability assessment was performed. The reconnect simulation restores the same browser controller index; a device reappearing under a different index is not automatically reassigned. Not every consumable, equipment menu action, quest, transformation, and simultaneous class combination was exercised in a live two-player browser session. Save normalization and workshop ownership tests cover important portions, but do not prove every menu operation. Existing single-owner local menus remain single-owner; simultaneous independent menu windows were not introduced. Public PeerJS was reachable for the executed tests; this does not establish reliability on every home network.

1. Connect both controllers. Load P1; press A/Start on the second pad and load P2's own profile.
2. Move in opposite directions, attack together, block, dodge, cast, and use each player's menu. Confirm colours match HUD borders and radar arrows guide you back together.
3. Take turns finishing an enemy after both participate nearby. Check full killer XP and half helper XP. Equip/consume an item on each character and verify the other is unchanged.
4. Unplug each pad briefly, reconnect it, and confirm the other player retains control. A disconnected actor is still vulnerable.
5. Enter/exit a dungeon, accept the party prompt on both pads, fight a boss, down/revive one player, and try a Nav Stone return.
6. Save both profiles, leave co-op, reload, and check inventory, levels, abilities and quest progress before a longer session.
