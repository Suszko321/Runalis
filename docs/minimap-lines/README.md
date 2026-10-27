# Simple minimap route and wall lines

The circular minimap now draws muted gold lines along authored overworld road paths and pale grey wall contours in dungeons. Lines sit behind the existing entity markers. Dungeon corridors remain connected through their actual openings; unexplored walls remain hidden using the existing exploration state.

Overworld rendering reads only road geometry, never terrain cells. Dungeon wall contours are cached in 16 × 16-tile sections with a one-cell border. Only nearby sections are built, then reused. Floor, tile-array, or terrain-revision changes invalidate the cache. The HUD retains its ten-refreshes-per-second cap.

Verification passed for road culling, connected room/corridor contours, explored-only visibility, cache reuse, floor changes, existing enemy fog, and marker colours. The two-room fixture required 3,710 initial terrain reads and zero on subsequent draws; its warm draw measured at most about 0.1 ms at the 95th percentile locally. These measurements cover the minimap, not total game frame rate.

[Preview](preview.png) · [Verification results](verification.json)
