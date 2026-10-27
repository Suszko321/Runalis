# Runalis player-led art direction

Reference: the existing male and female 64 × 80 cells, retained byte for byte.
The neutral south-facing source silhouettes occupy 63–64 pixels vertically and
roughly 34 pixels across. Four directional rows and four locomotion cells remain
authoritative. Character fitting, articulated limbs, animation events, equipment
attachments and player scale remain in the existing renderer.

## Scale and pixels

The running build is a Canvas 2D renderer with a 2.5D presentation. It does not
instantiate Babylon.js. A world coordinate unit is a gameplay canvas pixel;
terrain cells are 32 units. The player sprite draws at native scale before any
existing camera/display scaling. Native scenery therefore uses one raster pixel
per world unit. Source canvas dimensions follow physical asset dimensions rather
than a universal 64 × 80 cell.

Humanoids share the player rig. Keep existing authored stature differences,
identity, clothing and equipment. Mature trees extend several character heights;
small vegetation and loot occupy only a fraction of a body. New house thresholds
allow up to 68 native pixels of clearance within the existing facade. Buildings,
trees and bosses keep their authored footprints and interaction positions.

## Surface language

Use near-black, predominantly one-pixel outer ink; connected material clusters;
three or four principal shading levels per material; upper-left highlights and
cool deeper shadows. The player has warm skin, restrained brown hair/leather,
clear clothing planes and small high-contrast fittings. Match that density and
clarity, rather than copying the player's silhouette onto monsters.

Stone has quiet facets, occasional cracks and a bright upper lip. Timber has
plank joints, sparse directional grain and iron-dark gaps. Cloth uses connected
folds rather than scattered texture. Foliage uses clear leaf masses over a
branched trunk, avoiding speckled photographic texture. Bare trees retain their
distinct branch anatomy. Metal highlights stay selective. Ground contrast is
lower than upright objects, characters and hostile telegraphs.

## Regional and combat identity

Retain frontier timber/olive stone, wet fen timber/reeds, pale Aureate masonry
and gold, red-roof imperial construction, and fractured cosmic architecture.
These have distinct silhouettes and fittings as well as palettes. Preserve
faction insignia and all established class color rules in visualStyle.js.

Retain readable spell cores, danger boundaries, allied markers and enemy health
bars. Soft practical lighting is deliberately retained around crisp assets.
Existing weather, day/night, cutaways and class effects remain authoritative.
No extra per-object dynamic lights or particle populations are introduced.

## Rendering and production constraints

Use nearest sampling for sprites and native terrain. Snap raster draw origins;
keep simulation movement and camera motion continuous. Hold small vegetation
motion on pixel poses instead of continuously shearing its pixels. Sort actors,
NPCs, trees and props by their ground anchors. Draw ground dressing before loot
and behind-actor combat effects. Preserve building cutaways and canopy readability.

Keep atlas indices, frame counts, source cell sizes, pivot offsets and gameplay
IDs. Generated candidates are reviewed and registered into those contracts;
reject clipped frames rather than importing broken animation rows. Retain good
assets, seamless cliff crops, original player images and original character code.
Scenery bitmap caching is capped at 16 MiB; twelve native continental ground
chunks use the same 27 MiB maximum as forty-eight previous half-resolution chunks.
