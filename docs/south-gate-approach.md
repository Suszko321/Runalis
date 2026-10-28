# Orrakai South Gate

The town's South Gate now exits beneath the north boundary wall at the northwest
corner of Runalis. Orrakai continues off-map; the old full surface-model town and
East Postern no longer appear. The East Gate interaction is also removed from
the town, and its former east-wall opening is sealed after published overrides.
Old east-gate return metadata safely falls back to the South Gate.

The compact apron has a guard, scout, cook, shrine and relief station, plus a
small kitchen plot and workyard. Existing service, resource and quest IDs survive.
Duplicate decorative settlement dressing is retired rather than moving/removing
quests, encounters or distant world content. The authored continental dimensions,
other regions and combat content remain unchanged.

`orrakaiExterior.js` owns the apron placements and South Road. The road is shared
by continental collision and the Echoryn ground renderer, and excluded from tree
placement. It passes directly through the retained
`nav-hearthmereFrontier-outpost` stone before joining the existing road network.
The stone's ID preserves attunement; its label and roadside sign explain the route.
New default surface spawns use the same northwest approach.

Validation includes actor-radius road sampling, apron service reachability,
town departure/re-entry, legacy east-return handling, saved-game reload and actual
browser departure, collision-based traversal and Nav Stone interaction targeting.
The wider continental access check still reaches all 1,119 retained interactions.
Continental runtime, persistence, instance-return, Nav Stone spacing/attunement,
and town geometry regressions also pass. The old runtime test's two-gate premise
was replaced with the requested South-only layout and an explicit no-East check.

Run `tools/verify-south-gate-approach.mjs` and
`tools/verify-south-gate-browser.cjs` with the normal preview/browser dependencies.
