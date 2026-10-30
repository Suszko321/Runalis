# Castle Veyreign — The Last Heartbeat

Optional five-floor capstone. Stable dungeon ID `castleVeyr` and quest ID
`vampireRedChalice` remain intact for saves; player-facing castle names change.
The former outside lord is now Castellan Edrik’s Echo, rather than a duplicate
Alistair. This dungeon has no mandatory main-campaign dependency.

## Route and consequence

1. Banquet of Empty Chairs: invitations as blood contracts.
2. Servants’ Ossuary: the names hidden by the household accounts.
3. Bell-Tower Aviary: the Bat Beasts’ feeding route.
4. Crimson Reliquary: the stolen heartbeats sustaining the lord.
5. Court of the Last Heartbeat: Alistair Veyreign, Vampire Lord.

The first four floors each contain two guarded blood seals. All associated
Vampire Spawns and Bat Beasts must fall before the seal can break. Each floor
has an opening conversation with two substantive optional questions. Normal
stairs, party consent, arena sealing, wipe resets and victory portals use the
existing dungeon framework.

Alistair has three phases and five telegraphed attacks: a broad sword cone,
a committed hunting charge, frozen heartbeat marks for each player, crossing
blood lanes, and an outer midnight ring with a safe inner circle. All attacks
have tells and impact effects; Bat Beasts have their own delayed diving attack.
Health: 14,000 / 28,000 / 43,400 / 58,800 for one through four players. The
attempt's party size cannot shrink when a player disconnects or falls.

Defeating the first lord records personal completion for participating actors.
Each eligible player separately refuses his blood or explicitly accepts permanent
vampirism. Existing competing permanent bloodlines remain exclusive. Leaving
without answering counts as refusing. Saving and resuming an unresolved first
encounter preserves the offer. A repeat run uses Greater Vampire and suppresses
chapter/final conversations; the ordinary dungeon reset interval still applies.
A returning helper may accept during a different host's first encounter.

The personal completion marker deliberately lives on the character as well as
world memory: online guest saves restore their own world memory, while character
consequences must persist across worlds. Stable per-character UUIDs identify
eligible participants and their individual saved answers.

The old chalice quest definition no longer grants vampirism. Existing vampires
are preserved. Primitive castle saves rebuild the new layout and clear stale
completion/arena data; new authored floor saves preserve seals, enemies and wounds.

## Art

Alistair and Vampire Spawns use the same human locomotion, head, weapon and attack
rigs as players and Orrakai NPCs. A shared facial overlay uses the head atlas's
actual eye/mouth landmarks for crimson eyes and two pixel fangs, including
female heads, hairstyles, side facings, portraits and existing player vampires.
Alistair has an additional crimson royal mantle. Character customization cannot
remove vampire facial features.

Bat Beast source atlas: 60 x 80 cells, 16 frames, six states at 12 fps, generated
by `tools/build-veyreign-bat.py`. Runtime uses the shared asset cache and attack
presentation clock, with independent death playback and no fallback sprite overlap.

## Verification

- `node tools/verify-veyreign.mjs`: five-floor progression and both endings;
  guarded seals; all floor save/restores; 1–4 player HP; returning-helper exception;
  repeat suppression; old-save migration; exact wounds after reload; arena retry;
  actual delayed damage and safe evasion for every boss move; Bat Beast damage.
- `tools/verify-veyreign-browser.cjs`: all five scenes/floors, rendered creatures
  and boss tells, real mobile permanent-curse button, saved vampire restoration;
  no browser errors. Screenshots generated in this folder.
- `tools/verify-veyreign-online.cjs`: two real browser profiles over WebRTC; guest
  interacts with defeated Alistair and accepts through mobile controls; host applies
  curse only to that guest; guest character save retains the curse and completion.
- Main campaign, campaign dialogue, dungeon returns and multi-mode boss portal
  regression suites pass. Generic miniboss return coverage uses a legacy layout
  fixture because Castle Veyreign now has a different authored encounter roster.
- Pages preparation validates the release module graph and asset paths.

Combat completion in progression/browser tests is injected to cover branches.
These checks do not establish a normal-play victory, subjective cinematic quality,
or final balance for four human players. Those require hands-on playtesting.
