# Party consent at dungeon and boss thresholds

In co-op, any active joined player can propose entering a dungeon, side zone or
regional Infinite Dungeon. Before the world changes, every player receives an
accept/reject prompt and a ten-second countdown. The initiator must also vote.
All players accepting enters immediately and gathers the entire party at safe
arrival points. One rejection, a missing response at ten seconds, a party change
or an incapacitated member cancels the request. Revive fallen members before
requesting entry again. Solo travel keeps its existing immediate behavior.

Boss rooms use the same consent before waking the boss, sealing the arena or
pulling distant players inside. Following a rejection or timeout, leave the
threshold and approach again to request another attempt. This prevents a prompt
from reopening every frame. Existing locked-arena retry and victory rules still
apply. Malakar's deliberate sanctum descent uses the same countdown, preserving
its ritual and introduction. Ordinary travel inside an existing dungeon keeps
its existing floor transitions.

Keyboard Enter/Escape answers for the primary local player. Each controller
answers for its own character using confirm/cancel. Local players also have
individual clickable buttons. Each online device shows the whole party's
status with buttons for only its own character, including touch controls that
fit mobile landscape. Remote answers are bound to authenticated server-side
actors and a specific request ID; guests cannot submit votes for others.

Voting freezes gameplay while networking, rendering and the real-time countdown
continue, including while paused. Input used to open a prompt cannot also vote
through it. Overworld movement has no new tether or proximity requirement.
Votes and callbacks are transient, never saved, and cleared when loading,
disconnecting or destroying the game. The online build identifier was advanced
so an older browser cannot join without support for entry consent.

Validation:

- `node tools/verify-party-entry.mjs`: two through four actors, explicit votes,
  stale messages, cancellation, controller ownership, party changes, all three
  entrance types, both authored bosses, a procedural boss, safe party arrival,
  transient saves and unchanged solo travel.
- `node tools/verify-party-entry-browser.cjs`: four independent browser clients
  connected by native WebRTC; individual voting, guest rejection, unanimous
  dungeon travel, actual ten-second expiry while paused and all four players
  pulled into the sealed Orchard arena. Includes desktop/mobile captures and
  a check that touch buttons fit without scrolling. Uses the same local preview
  and `RUNALIS_NODE_MODULES` setup as the existing browser suites.
- The existing online browser suite also passes its movement, combat, dialogue,
  services, fishing, travel, subclass presentation and disconnect checks.
- Malakar, Grove, Orchard, shared encounter regression and main campaign
  progression suites pass, including 43 campaign save/load checkpoints.

Generated screenshots and verification JSON remain ignored by Git.
