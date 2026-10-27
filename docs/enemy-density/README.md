# Runalis enemy density overhaul

Implemented 10 October 2026 from the supplied Enemy Density Overhaul brief. The live game uses these systems; the practice page is an additional way to inspect the mechanics.

## Coverage

All **12 live dungeon entrances**, representing **11 dungeon identities and 33 distinct floors**, are covered. The automated entrance sweep contains 35 cases because Ashen Orchard has two entrances. Covered entrances: Old Blighted Dungeon, Thornroot Crypt, Abandoned Iron Vault, Ashen Orchard Cellar, Mirror Grove Underroot, Pilgrim Crypt, Watcher Ridge Vault, Castle Veyr, Last Dawn Keep, Ancient Sluice Descent, The Shattered Choir, and The Ascension Spire.

All eight continental regions use geographic encounter profiles. All ten optional side-zone types were checked in every region (80 combinations). Combat, elite and boss tower floors were checked in every region (32 combinations), alongside the existing 40-floor tower progression suite.

| Region | Ordinary geographic levels |
| --- | --- |
| Echoryn Forest | Local subregions: protected Orrakai, early roads 2–5, orchard 3–7, woods 5–10, gravefields 5–9, marsh 9–14, Iron Mire 12–18, Old Hollow 16–22, Red Seal 22–28 |
| Black Pine Pass | 12–22 |
| Blackfen Basin | 12–24 |
| Aureate Marches | 18–42 |
| Severed Causeway | 30–46 |
| Ascension Wastes | 42–65 |
| Zarynth Heartlands | 30–55 |
| Zarynth Arrival Ward | 35–60; settlement protected |

Dungeon ranges are explicit in `src/encounterData.js`: Orchard 3–8, Mirror Grove 9–15, Pilgrim Crypt 7–13, Thornroot 7–13, Iron Vault 12–20, Watcher Ridge 16–24, Old Hollow 16–24, Castle Veyr 20–30, Last Dawn Keep 24–34, Shattered Choir 35–48, Ascension Spire 52–65. Floors progress within those ranges. Existing authored bosses and quest uniques retain their authored combat stats and may exceed the ordinary range. Regional tower levels start at the region minimum plus floor number minus one.

No profile reads player level, equipment, damage, mastery or performance. Cooperative party size retains the existing enemy-count/boss-health rules.

## Populations, pacing and rewards

Residents, authored sites, camps and road patrols use stable seeded cycles. Packs vary composition, size, placement and modifiers, with occasional empty sites and friendly travelers. Typical packs contain 2–6 enemies. Protected towns, NPCs, entrances and arrival points reject hostile spawning. Full actor footprints, spacing, camera bounds and party proximity are checked. Patrol endpoints and the route between them are validated; stalled patrols reverse.

Up to two packs populate per 1.2-second population update, with 80 nearby dynamic enemies and four travelers. Overworld respawns range from **4–12 minutes of active play**, varying by subregion. No offline catch-up or visible ordinary spawning. Resident deaths, wounds, generated identity and event ownership survive streaming and saves.

Dungeon budgets reserve enemies for later combat rooms. Quiet rooms and shrines retain breathing room. Long corridors over 20 seconds of centre-to-centre walking receive spaced patrol groups, including long boss approaches. Measured median corridor walks are **5.2–7.0 seconds** across the tested floors. Individual long halls reach about 40 seconds end-to-end, with intervening patrol encounters. Traversing every generated hall once takes about **2.5–5.7 minutes per floor before fighting, puzzles, searching or backtracking**. These are geometry estimates, not human clear times.

Ordinary enemies use archetype/local-level stats. Promoted elites have approximately 2.5× health and one modifier; rares 4.5× health and two compatible modifiers; occasional champions 6× health and two modifiers. Promoted damage increases modestly rather than multiplying every stat. Named champions retain authored behaviour. Level, stats and XP share the same profile; technical fallback cases remain identifiable. Enemy-summoned adds grant no XP or loot.

Existing item, equipment, regional and scroll tables remain in use. Elite/rare/champion rewards improve within bounded chances; exceptional gear stays rare. Random Legendary enemy drops require level 20, random Mythical enemy drops level 25; authored first-kill/quest rewards remain intact. Seeded enemy rewards and claim guards prevent re-entry rerolls and duplicate payouts. Scroll learning requirements are preserved.

## Eight functional modifiers

| Modifier | Mechanic and response |
| --- | --- |
| Waller | Warned temporary U-shaped collision walls; escape through the open side. Actor intersections are excluded. |
| Shocker | Marked delayed lightning; move out before impact. |
| Freezer | Delayed frost damage/slow; evade, cleanse, or use existing protection. A recovery window prevents repeated slowing. |
| Molten | Burning ground and one delayed death explosion; leave the marked area. |
| Vortex | Warned collision-safe pull with attack recovery; evade or reposition afterwards. Shields do not prevent displacement. |
| Artillery | Warned ranged ground bombs; move or close distance. Camera and line-of-sight checks prevent unseen bombardment. |
| Bulwark | Actual frontal damage reduction, fixed stance direction, lowered-guard intervals; flank or wait. |
| Regenerator | Visible healing channel with a finite pool; any hit, close pressure or appropriate control interrupts it. Healing budget survives re-entry/load. |

At most two compatible modifiers per enemy. Cage, pull and frost cannot pair; guard plus healing cannot pair. Nearby modifier attacks take turns, with a global activation budget and a 24-hazard ceiling. Native pixel art silhouettes remain unchanged. Nameplates show level, tier, and modifier symbols/text on separate lines. Effects have clear ground warnings and matching collision/damage geometry.

Guarded checkpoint supplies, predator caches and guarded ruin caches have owned guards, locked rewards, completion, expiry and cleanup. At most two locked event caches are resident nearby. Dungeon/side-zone ambushes warn before spawning and unlock their cache only after their owned guards die. These reuse existing environments and rewards rather than adding quest text.

## Arenas, returns and persistence

Final bosses receive reserved arenas with an approach, threshold, physical perimeter seals and visible gates at actual entrances. Tower boss floors have a separate arrival strip. Bosses remain dormant and protected from direct, ground and splash damage until player commitment. Commitment brings the living party inside; movement, summons and bosses respect the arena.

Every required main boss must die before victory. Surviving summoned adds do not delay completion. Victory clears hazards, opens gates, and creates one **optional** return portal to the entrance actually used. There is no automatic teleport. Existing loot collection remains available.

Failure resets boss health, tells, summons, barriers and portals while keeping cleared ordinary rooms. The existing revival, body/recovery and penalty flow remains in charge. The map can still return to Orrakai at any time; leaving an unfinished arena this way records a failed attempt. Ordinary tower exits are sealed during an active boss fight.

Unfinished dungeon runs keep their seed and floor state. Repeatable tower floors and side zones retain compact cumulative death IDs, wounds, claimed objects, event guards and rewards; corpse removal cannot erase a death. Cleared expeditions reset after 30 active-play minutes when re-entered. Production saves retain arena geometry and identities. Interrupted warnings restart safely after loading. Pending summon kills survive chunk changes, activity cleanup and saving until the shared death handler pays their rewards.

## Verification and limits

- [20 implementation checks](verification.json): all live entrances, room coverage, fixed geography, eight mechanics, counters, compatibility, events, rewards, arenas and population persistence.
- [11 critical-review regression groups](review-verification.json): independently discovered streaming, event, respawn, tower, save and corpse-removal defects were reproduced and fixed. Final independent review found no further consequential defect.
- [Pacing/build checks](pacing-verification.json): identical frontier enemy remains level 5, 114 HP and 13 damage while the same weapon deals 14 / 18 / 40 damage at player levels 1 / 6 / 80. Estimated unmodified contacts fall from 9 to 7 to 3. The real Thornbinder ground spell cannot damage an uncommitted boss.
- [Browser visuals](browser-verification.json): all eight modifier warnings/effects render, existing pixel assets load, arena seals work, keyboard healing interruption works, no browser errors.
- [Production measurements](production-verification.json): 900 frames per scenario, actual update/render loop, natural modifiers. Early room: 7 enemies, 8 peak engaged, update P95 1.3 ms, render P95 5.4 ms. Dense room: 22 enemies engaged among 325 generated enemies, update P95 2.0 ms, render P95 7.0 ms. Both retained the dungeon throughout and had active hazards; no browser or asset errors.

**Performance limitation:** dense production frame intervals reached **34.5 ms at P95**. This does not establish consistently smooth 60 FPS. Measurements are local headless Edge at a 960×600 game canvas displayed in a 1440×900 viewport. The stress floor uses four-player population density with one protected measurement actor; it does not measure four rendered split-screen players or human survival balance.

Existing combat (58), progression (23), loot (24), world/quest contracts (13), continental runtime (7), persistence, instance returns, seven-theme portals, 40-floor progression, Gravecaller animation (10) and summon positioning (13) suites passed. Quest contract checks retain 32 quests and 181 objectives. Verification is automated plus screenshot inspection; no human playtest or measured full dungeon clear time is claimed.

Practice page: `http://127.0.0.1:8768/enemy-density-lab.html`. Select a modifier, move with WASD/arrows, and press E at melee range to demonstrate interruption. Production screenshots and individual modifier captures are saved beside this report. Original changed files are backed up under `backups/enemy-density-2026-10-10/`.
