# Castle Veyreign population and elites

The first four floors now contain 60 enemies each, up from 32: seven elite
Vampire Spawns, 25 ordinary enemies and 28 weaker reinforcements. Each combat
room has one modifier captain and four extra enemies: three Fledgling Vampire
Spawns and one Lesser Bat Beast. Existing human rigs and Bat Beast animation
atlases render every role.

The previous castle initializer marked ordinary enemies as already initialized,
bypassing modifier assignment. The population pass now calls the shared
encounter configurator and assigns a single readable modifier to each captain.
The room/floor rotation covers Freezer, Waller, Regenerator, Shocker, Molten,
Bulwark, Artillery and Vortex across the castle. Existing warning durations,
control recovery, wall escape validation, healing reserves and local caster
coordination apply. Co-op density scaling adds ordinary/weaker enemies without
cloning the seven captains.

Solo role balance, from floor one through four:

| Role | Health | Base attack damage |
| --- | --- | --- |
| Elite Vampire Spawn | 750–1,050 | 32–44 |
| Ordinary Spawn / Bat Beast | 255–360 | 20–29 |
| Fledgling Spawn / Lesser Bat Beast | 100–145 | 11–17 |

Health retains the castle's party-size multiplier. The extra enemies grant
40% of ordinary framework XP. The two-form final boss keeps its bespoke
mechanics and health.

Reinforcement locations avoid seals, stairs, chests and occupied spawn points.
Seal-room reinforcements share the original guard group, so the seal opens
after the full pack falls. Save/load preserves role assignments, exact wounds,
deaths and remaining healing reserve. Upgrading an existing run adds no enemies
to a broken-seal room or a room whose original guards are all defeated. A
per-floor population marker prevents cleared reinforcements from respawning.

Online guests now receive the shared system's hazard geometry, caster/party
references and healing/guard presentation. Frost state updates with the normal
party visual snapshots. Rendering interpolates hazard age; combat and collision
remain host-owned. Runtime presentation is excluded from saved characters and
world data. Online build 6 requires both players to refresh when joining an
older build.

## Verification

- `node tools/verify-veyreign-population.mjs`: all four floor rosters, modifier
  coverage, weaker-role stats, walkable spawns, exact saved wounds/healing/deaths,
  actual shared Freezer/Waller/Regenerator casts, hydrated guest visuals, cleared
  save migration, co-op clone roles and final-boss preservation.
- `tools/verify-veyreign-population-browser.cjs`: actual game-loop casts and
  rendered frost, infernal walls and healing; denser reception capture; no browser
  errors. The observer is invulnerable to isolate modifier behavior.
- `tools/verify-veyreign-population-online.cjs`: separate browser profiles over
  native WebRTC; mobile guest sees all three casts with live caster/party
  references, wall segments and host-applied regeneration; no browser errors.
- Veyreign progression, quest endings, two-form boss, shared elite hazards and
  defenses, online protocol/presentation and dungeon co-op regressions pass.
- Actual mobile seal interactions and saved descent pass through all four floors
  with the denser roster. Guard deaths are injected for progression coverage;
  these checks do not establish normal-play combat balance.
- Pages preparation validates the complete module graph and shipped assets.

Browser tools use `RUNALIS_NODE_MODULES` to locate Playwright and `RUNALIS_URL`
for the local preview. Captures are generated in this folder and ignored by Git.
