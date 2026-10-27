# Enemy density overhaul

Source: Runalis Enemy Density Overhaul, supplied 10 October 2026.

## Audit

- The live overworld is the streamed continent, with sparse entity mutations and active-play time in worldMemory.
- Authored IDs own quest and boss identity. Population randomization must retain those IDs.
- Dungeon factories omitted combatLevel. ensureEnemyProgression consequently supplied level 1 and at least 50 XP.
- Dungeon room generation spends a shared budget in order, allowing the first rooms to starve the last rooms.
- Existing final-boss completion already provides an optional return portal at the actual surface entrance. Preserve it.
- Elite initialization compounds health, damage and XP after construction. New configured tiers must bypass that legacy boost.
- Collision and line of sight share world.isPassable. Temporary barriers and arena seals belong there.
- Death rewards have an idempotent guard; summoned enemy adds need an explicit no-reward policy.
- Persistence uses active-play time, avoiding offline catch-up. Do not replace this with wall-clock respawns.
- Preserve individual skill morphs, mastery, five-slot hotbar, existing death/recovery and summon animation fixes.

## Work and verification ledger

Completed: geographic profiles; seeded packs and cycles; safe placement and validated patrols; all live dungeon room/arena coverage; all eight elite mechanics and counters; compatibility; owned cache/ambush events; fixed stats/XP; seeded rewards and tier gating; arenas and lifecycle; production save/re-entry/failure recovery; native pixel art presentation; measured occupied-room update/render performance; regional tower and side-zone checks; independent critical review and defect fixes.

See README.md and the adjacent JSON evidence for exact coverage and limitations. Performance evidence does not support a consistent 60 FPS claim; no human full-clear timing is claimed.

All conclusions must be supported by code or recorded checks. Automated simulations are distinct from human playtesting.
