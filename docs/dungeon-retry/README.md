# Dungeon defeat, retries and session boundaries

Lethal enemy attacks now resolve solo defeat/co-op wipe immediately after the
enemy combat update, before later simulation and progression work can run.
Pending party-entry votes and conversations close on defeat. The existing
three-second death screen still requires an explicit respawn action.

Dungeon recovery resets the failed arena and saves the active floor, then exits
to the surface Nav Stone before restoring the host's vitals. Missing legacy
surface-return data is repaired rather than leaving the character in a sealed
boss room. New runs also retain their surface entrance coordinates for recovery.

A failed active boss arena records a retry checkpoint. Re-entry resumes that
floor at a walkable gate outside the arena, choosing the entrance-side gate.
Cleared enemies, broken seals and acquired loot remain recorded. The boss starts
at full health with attacks/hazards cleared; Castle Veyreign resets to human form.
The final victory portal and vampire offer remain unavailable until both boss
forms are defeated. Normal party consent still applies separately to entering
the dungeon and committing to the boss room.

Retry access lasts for the current gameplay session. Actual profile login and
Save & Quit clear dungeon-run records; an active saved dungeon is first exited
to the Nav Stone. Browser reloads therefore cannot resume inside a boss arena.
Quest records, earned items, gold, permanent Veyreign completion and bloodlines
persist. The next entry starts a fresh dungeon population from floor one.

This session boundary is deliberately separate from `applySaveToGame`: ordinary
in-session reconstruction and online scene snapshots preserve the host's run.
Online guests follow the host's return/retry without discarding that world.
Online build 7 requires refreshed peers so both devices use these lifecycle rules.

## Verification

- `node tools/verify-dungeon-retry-session.mjs`: human/feral arena resets, Castle
  Nav Stone return, all eight seals retained on retry, safe floor-five arrival,
  missing legacy return data, unanimous co-op dungeon/boss entry, fresh first
  floor after the session ends, and preserved permanent rewards/bloodline.
- `tools/verify-dungeon-retry-browser.cjs`: desktop and mobile, real lethal
  human/feral boss attacks, countdown and actual respawn button, stable surface
  recovery, full-health boss retry, actual Save & Quit/profile login, and browser
  reload from a saved active boss arena. No browser errors. Earlier guard deaths
  are injected to prepare the cleared route; boss deaths use native combat.
- `tools/verify-dungeon-retry-online.cjs`: two real browser profiles over WebRTC,
  a lethal boss volley wipes both players, host respawn returns the whole party
  to the Castle Nav Stone, and mobile guest accepts separate dungeon/boss votes
  before the retry begins. No browser errors.
- Existing death-screen, Veyreign quest/feral/population/progression, generic
  dungeon floors/portals, Malakar climax and main-campaign regressions pass.

Browser captures are generated here and ignored by Git. Browser tools require
`RUNALIS_NODE_MODULES` for Playwright; `RUNALIS_URL` selects the local preview.
