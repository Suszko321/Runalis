# Abandoned Iron Vault overhaul

Implemented November 1, 2026 in the root Canvas 2D application. The user's brief
authorizes an authored mid–Act I adventure substantially harder than Ashen Orchard,
including quest, boss art/mechanics, environment and enemy density. Existing
`ironMireDungeon`, entrance, old salvage quest, completion and profile identities
remain. Map/POI guidance now says level 16 and uses the physical entrance's name.

## Adventure

**The Shift That Never Ended** (`ironMireLastShift`) is a new five-stage quest.
The Mine Drifter sends the company to Surveyor Mara Venn in the dry receiving
refuge. Two guarded emergency bypasses unlock the first cage. The lower works
hold three guarded crew rolls and two cage brakes. The final cage reaches
Garran Voss, the Drowned Iron Foreman. His defeat stops the bell; bringing the
rolls back gives the lost crews names above the water. This is an attributed
local mining tragedy, not a new cosmology or campaign-ending revelation.

The old `ironMireSalvage` quest remains obtainable during/after the new adventure.
Six iron deposits per working floor and two optional deepstone nodes below
retain profession use. Emergency stores, a guarded side route and the Foreman's
locked pay chest give exploration rewards. The first-floor surface return remains
usable for retreat/resupply; boss-arena entry still seals the whole company
through the established consent system.

| Floor | Identity and required progression | Solo enemies | Four-player enemies |
| --- | --- | ---: | ---: |
| 1 | Receiving Works: refuge, ore yard, pumps, boilers, bypasses, northern cage | 56 | 104 |
| 2 | Drowned Shifts: altered galleries, crew records, brakes, deep cage | 72 | 136 |
| 3 | Foreman's Bell: two guard wings, warning plate, sealed pumping chamber | 20 guards + boss | 36 guards + boss |

Packs mix durable haulers, mine hands, ranged scavengers, bell tenders and selected
Bulwark shift captains. Population multipliers are 1/1.3/1.55/1.8 with deterministic
pack rounding; room residency, loot, wounds and control state persist. Spawn refuge
contains no hostile pack. Ordinary levels are 15/16/17; boss level is 18. Ordinary
HP and damage are authored and stamped with the existing encounter version so
geographic normalization cannot silently overwrite them on reload.

## Boss difficulty and mechanics

| Base solo contract | Ashen Orchard Custodian | Iron Foreman |
| --- | ---: | ---: |
| HP | 7,000 | 11,200 |
| Authored damage field | 50 | 64 |
| Attack vocabulary | 4 | 5 |

These are authored values, not a claim that every delivered hit equals the damage
field: existing global damage scaling, move multipliers and defenses still apply.
Boss party HP multipliers remain 1/2/3.1/4.2, damage +5% per extra player, and the
pool is locked for an attempt to prevent disconnect/downed-player shrinking.
Health thresholds 70% and 35% advance three phases. Late phases shorten tells
by .13 seconds per phase (minimum .95) and recovery by .28 (minimum 1.2).

- **Break the Seam:** committed aimed pick lane, impact and bounded forward drive.
- **Haul the Drowned:** three, then five separated chain lanes.
- **The Roof Gives Way:** two, then three staggered batches of marked impacts;
  party positions are fixed at telegraph start, not invisibly tracked to impact.
- **Emergency Discharge:** one marked half floods; in phase three both side beds
  are marked and the central emergency deck remains safe.
- **The Last Shift:** annular bell impact; close distance or leave the ring.

All damage uses the existing party/minion damage/defense path. Each event releases
once after its warning. Visible geometry is the same data used for collision and
wire snapshots. No new damage pipeline, universal progression rule or camera
quantization was introduced. Retry resets the boss, attack sequence and hazards;
loading an active fight cancels transient attacks and provides recovery while
preserving wounds and the arena seal. Defeat clears the original dungeon ID,
unlocks one existing-style return portal and allows the final quest report once.

## Artwork and environment

- [Foreman in game](foreman.png), [phase-three flood](tell-flood.png),
  [receiving refuge](receiving-refuge.png), [pump gallery](pump-gallery.png),
  [lower works](drowned-shifts.png), [compact boss view](compact-foreman.png).
- `assets/art/sprites/dungeon-iron-foreman.png`: 24 authored 128×128 drawings,
  four columns / six rows, idle/anticipation/execution/recovery/hit/death. Distinct
  maul impacts and chain cast are selected from their appropriate execution poses.
- `assets/art/sprites/dungeon-iron-machinery.png`: twelve 96×96 props: winch,
  pump, boiler, cart, timber frame, sluice, rails, ledger bench, chain pulley,
  miners' memorial, chest and wheel control. Props use the shared depth queue.
- Both sheets use 48-color foreground palettes, nearest sampling, binary alpha
  and at least five pixels of transparent padding. Masters were inspected before
  packing; [exact built-in ImageGen prompts](PROMPTS.md) are retained. Repack with
  `tools/pack-iron-mire.py`; local masters are under ignored `assets/art/source/iron-mire/`.
- Floor/architecture code adds wet stone, quiet shallow beds, rail sleepers,
  timber braces, rusted channel lips and the riveted emergency deck. Ordinary
  shallow water is traversable; damaging water is explicitly telegraphed.
  Activated machinery remains visible but ceases interaction.

## Persistence and compatibility

The run stores controls/victory under `dungeonState.ironMire`; ordinary floor
snapshots retain existing enemy and object state. The new quest uses separate IDs,
so old salvage objectives, rewards, inventory and progress are untouched. Old
generic Iron Vault layouts receive the authored geometry and return the party to
its entrance refuge on active-save migration. Loose drops are moved safely to
that refuge. Previously cleared instances retain victory and do not revive the
Foreman or pay his boss rewards again. Old generic pack placements have no exact
counterparts; they are replaced when their floor is first authored. This is an
explicit content migration, not a promise of retaining obsolete tile coordinates.

## Verification

- `npm run check:engineering`: 11/11; `npm run build`: pass.
- `tools/verify-iron-mire.mjs`: nine passing scenario groups. Actual dialogue,
  guarded interactions, collision-walked routes, all controls, every floor,
  save/load/revisit, all five moves in every phase, no premature/repeated hits,
  safe terrain, four owners/minion impacts, wire geometry, locked HP scaling,
  interruption/retry, real death/rewards/exit/report and old cleared saves.
- `tools/verify-iron-mire-browser.cjs`: actual normal startup and production
  renderer, physical entrance, Surveyor conversation, guard gating, lifts,
  active sealed arena, five tell captures, compact view, reload, victory/return;
  zero page errors. Browser fixture kills packs to inspect progression; it does
  not claim a human combat-clear playthrough.
- Passing regressions: Orchard; dungeon boss co-op; floor progression; return
  portals; retry session; Veyreign feral; dialogue entry; party entry; character
  runtime. Art foundation passes with original player hashes preserved. New 36
  source cells are occupied/padded with hard alpha and bounded palettes.

Numerical difficulty and structural safety are verified. Human difficulty feel,
extended four-controller endurance, hardware frame-time profiling and a real
online transport session remain unmeasured. Existing compact HUD overlap and
broader audit findings are not claimed fixed by this dungeon overhaul.
