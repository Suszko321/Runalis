# Twilight HUD and radar update

Implemented 25 October 2026, using the supplied Twilight by Iron Mine Road image as the visual reference.

The HUD now uses dark iron panels, restrained brass borders, parchment labels, crimson health, green stamina, and violet spirit. The six existing action slots sit in a compact translucent banner, three pixels above the bottom edge. Health and spirit remain in the top-left HUD. Enemy plates distinguish ordinary enemies, elites, and bosses with readable names, levels, ranks, and framed health bars. Existing player art and controls are preserved.

The circular minimap is a proximity radar with simple overworld road lines and cached explored dungeon-wall outlines:

| Marker | Meaning |
| --- | --- |
| White dot | Player, party, summons, and friendly NPCs |
| Red dot | Enemy |
| Yellow dot | Dungeon or point-of-interest entrance |
| Blue dot | Quest giver or related NPC, object, or event |
| Crown | Boss |
| Diamond | Elite |

Quest markers take precedence over entrance markers. Dungeon exploration visibility is retained. Ordinary resource nodes are omitted. Radar draws are capped at ten per second, with a cached circular background and a fixed small backing canvas. Road lines use existing authored paths; dungeon contours are built once per nearby tile section and reused. See `docs/minimap-lines/` for the line-overlay checks.

Woodland colours are slightly warmer and more olive; water is cooler blue. The fullscreen game canvas now preserves character proportions across window shapes while maintaining approximately the existing 576,000-pixel rendering budget.

## Verification

- Production browser review passed at desktop, 760px, 390px, and 360px widths, with no page errors or horizontal HUD overflow.
- Marker colour, rank, quest precedence, dead-enemy omission, circular transparency, unchanged player state, and dungeon fog checks passed.
- Existing enemy-overhaul and Block/controller/hotbar checks passed.
- In a matched local 96 × 96-world radar microbenchmark, the original minimap took about 0.8 ms median per draw and accessed 3,249 terrain cells. The radar took about 0.1 ms and accessed zero terrain cells. These timings measure the minimap alone, not whole-game frame rate.

[Desktop comparison — before](before-nameplates.png) · [after](after-nameplates.png) · [390px layout](after-390.png)

Detailed results: [browser verification](verification.json), [radar benchmark](radar-performance.json). Review actors and profiles were isolated from normal saved games. Original edited files are in `backups/twilight-hud-2026-10-25/`.
