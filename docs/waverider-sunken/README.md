# Waverider / Sunken pass — 12 October 2026

Mastery order is Original, Sunken (5), Cryomancer (10). Skill behavior is unchanged; the current catalogue uses these two thresholds for every character.

All twelve Sunken morphs now reuse the original skill handlers, costs, charges, mobility and support functions. Torrent is a chargeable water cone, Bubble Ward grants flat damage absorption, Mending Current heals, Wellspring restores health and resources, and Tide Mirror mitigates ranged damage and retaliates. Drowned Convergence still transforms Sunken Torrent into its sweeping channel. No automatic Sunken lifesteal or every-third-hit implosion remains.

## Sustained pressure

- Offensive Sunken skills deal 72% of their original opening damage before existing modifiers. Displayed skill damage includes this reduction.
- Continued successful direct hits build target-specific Depth over ten seconds. Time drives the ramp; several hits in one frame cannot jump to full Depth.
- Full Depth adds up to 30% to the reduced direct hit and increases the shared pressure burn from 10% to 80% of a cadence-normalized damage reference. Burns tick every 0.5 seconds.
- There is one burn per enemy and caster across all Sunken skills. The strongest recent contribution supplies its reference power; additional casts never add independent burn stacks. Burns cannot refresh themselves or produce control procs.
- Three seconds without another Sunken hit removes the burn and resets Depth. Targets do not share Depth. A caster tracks at most 48 enemies; dead, removed and unloaded targets are cleared. Runtime state remains outside saves.
- Existing equipment, mastery, offense progression, Soaked bonuses and class Expertise remain in the damage pipeline. Expertise scales direct damage and the originating burn power once. Mastery still comes only from hotbar XP.

Torrent retains limited cone coverage; Maelstrom is the primary broad area pressure tool. Other attacks retain their original coverage rather than spreading burns to untouched targets. Powerful enemies can accumulate full Depth, while short fights favor other forms.

## Effects

All twelve skills use hand-authored pixel water with navy shadows, deep-blue streams, blue foam, bubbles, pressure flames and dark wards. Cast buildup also follows the selected morph palette. Each effect retains its skill shape: cone, piercing jet, water slash, restorative current, ward, ground current or deluge.

Standard and Sunken Maelstrom have a base radius of 205 rather than 145 (about 41% wider, double the base area). Living Water can widen it further. Four rotating water ribbons and a broken foam boundary match the actual circular damage and pull radius. Maelstrom renders beneath actors; visual effects stay in the existing bounded queue. Tide Mirror and Bubble Ward retain visible effects for their active protection.

## Verification

- Eight dedicated gameplay groups passed: new order; legacy saves; all twelve original skill behaviors; opening/late damage comparison; time-based Depth and expiry; Torrent and Maelstrom coverage; Expertise; bounded cleanup.
- A Level 33 controlled Torrent comparison recorded less opening damage and substantially greater late damage than the standard form. Resources were refilled for this curve comparison; it is not a resource-sustain claim. Exact three-second windows are in [verification.json](verification.json).
- All twelve Sunken skills and standard Maelstrom were cast and captured through the actual browser game/rendering code. Maximum Depth was rendered and all assets loaded without page errors. [Browser evidence](browser-verification.json).
- Optional morph regression passed 216 forms / 648 casts; controller and menu browser checks passed three viewport sizes. Combat regression passed 58 checks, Expertise 1,152 numerical cases, loot / Mythical composition 24 checks, hotbar mastery all 89 skills, and elite hazard regression 15 groups.
- These are controlled simulations and automated browser checks, not a human controller or full campaign balance playtest. The render measurement covers one practice scene only.

Compare the [visual gallery](http://127.0.0.1:8768/docs/waverider-sunken/) or practice [Sunken Maelstrom](http://127.0.0.1:8768/combat-overhaul-lab.html?skill=waveriderMaelstrom&morph=sunken). Reload the game before playing. Source backups are in `backups/waverider-sunken-2026-10-12/`.


Current choices, save migration and verification: [two-path catalogue](../subclass-reduction/README.md).
