# Cryomancer pass — 12 October 2026

Cryomancer is now an authored frost-control and prepared-burst family, with all twelve Waverider skills retaining their canonical skill IDs. Existing earned Cryomancer unlocks, hotbar mastery through XP, original skills, Sunken pressure and final Expertise remain intact.

## Combat identity and balance

Three successful Chill applications separated by at least 0.45 seconds make a target Brittle for four seconds. Normal foes freeze for a base 1.1 seconds, elites for 0.6 seconds. Existing control bonuses and Expertise scale this duration. A four-second recovery after freeze prevents chaining immobilization. Bosses gain Slow and Brittle without immobilization. Chill expires after four seconds without refreshing hits.

Tidal Cut, Pressure Spear and Deluge Crown consume Brittle for 40% more direct damage and a small shard burst (18% reference power against at most three nearby enemies within 50 radius). Other frost hits gain 10% against Brittle but do not consume it. Shatter does not immediately reapply Chill or refresh Brittle. All damage still uses real progression, equipment, mitigation and contribution systems. Elite modifier effects continue through freeze; only caster death cancels their committed effects.

Each morph has its own cost, cooldown, shape and role:

| Original skill | Frost role | Base cost / cooldown |
|---|---|---|
| Water Torrent | Fast single-target ice shard; prepare Chill | 8 Spirit / 1.35 s |
| Bubble Ward | Four-second crystal armor for nearby allies; 24% reduction before bonuses | 16 / 8 s |
| Mending Current | Restorative frost and modest two-second armor | 17 / 7 s |
| Tidal Cut | Piercing ice blade; Shatter finisher | 14 / 4.2 s |
| Riptide Step | Frost glide and short departure patch | 13 / 6 s |
| Drowning Pressure | Aimed ice-spire field; repeated exposure builds Chill | 19 / 8 s |
| Wellspring | Five-second sanctuary at the caster; healing and light frost damage | 24 / 12 s |
| Deluge Crown | Aimed ice eruption, Shatter and a brief allied ward | 29 / 16 s |
| Maelstrom | A broad placed blizzard; 175 base radius, 5.6-second lifetime | 22 / 9 s |
| Undertow | Small aimed frost patch that controls approaches | 15 / 7 s |
| Pressure Spear | Long piercing icicle; charged Shatter finisher | 15 / 3.5 s |
| Tide Mirror | Four-second armor and bounded cold retaliation | 17 / 10 s |

Ice armor does not pulse free offensive damage or freeze nearby enemies. Healing scales through the existing support pipeline. Sanctuary ticks use one quarter of flat Healing Power per pulse so a five-pulse field does not multiply the full flat bonus five times. Sanctuary and other same-skill frost fields replace their previous instance so repeated casts cannot stack healing or field damage. Original Hydromancy water-damage investment strengthens cold morphs; existing earned use charges and recharge investment remain supported.

## Presentation

All twelve morphs have native pixel ice: fast icicles, crystal armor, frost glide, growing ice-spire silhouettes, restorative snow, rotating blizzard gusts, the Deluge ice crown, frozen encasement, Brittle snowflakes and bursting shards. Field boundaries match their circular combat geometry and render beneath actors. Ice armor remains visible for its protection period. Cast buildup follows the selected morph palette.

Four short, distinct cast / impact / freeze / shatter cues use the existing sound mixer. Playback is throttled; there are no per-frame sound spawns. Frost field frames share a bounded 48-entry texture cache. A 12-blizzard renderer workload measured 0 ms median / 1 ms p95 at millisecond resolution after caching; this is a limited renderer measurement, not a full-game FPS claim. Seven actual effect geometries had zero camera drift in pixel comparisons.

## Actual verification

- Ten dedicated gameplay groups passed: all twelve casts; Chill cadence; Shatter consumption; normal / elite / boss control; immunity recovery; uninterruptible elite effects; field collision, duration and replacement; protection / healing / retaliation; progression balance; Expertise; XP-only mastery; runtime cleanup; retained tree investment.
- Standard, Cryomancer and Sunken Water Torrent were compared in controlled 30-second single-target simulations at Levels 1, 15, 33 and 60. Resources and cooldown bookkeeping were refreshed for this curve test; it is not a resource-sustain claim. At Level 33, standard dealt 1,356 damage, Cryomancer 1,290, and Sunken 2,064. Cryomancer's prepared spear hit dealt 63 versus 45 unprepared in the dedicated test. [Exact results](verification.json).
- All twelve actual browser casts, frozen / Brittle state and Shatter release were captured with no page errors or missing assets. Four sound phases were rendered into WAVs through the real mixer, with distinct waveform hashes, nonzero energy and no clipping. Audio verification is not a human listening review. [Browser results](browser-verification.json).
- Regressions passed: 216 optional forms / 648 casts; 1,152 Expertise numerical cases; eight Sunken groups; 58 combat groups; 16 enemy-combat checks; 15 elite-hazard groups; all 89 skills in hotbar mastery checks.

These are controlled simulations and automated browser verification, not a human controller playtest or a guarantee of balance across every campaign encounter. The comparison isolates each starting attack; complete rotations and gear can change outcomes.

Reload before playing. [Visual and sound gallery](http://127.0.0.1:8768/docs/waverider-cryomancer/). Source backups: `backups/waverider-cryomancer-2026-10-12/`.


Current choices, save migration and verification: [two-path catalogue](../subclass-reduction/README.md).
