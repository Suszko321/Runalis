# Orrakai modular art

Created with the built-in imagegen tool on 2026-10-02. Both original RGBA sheets are preserved, with no destructive processing. Runtime source rectangles isolate modules; nearest-neighbor rendering is mandatory. The generated sheets did not obey the requested dimensions/grid precisely, so measured custom source rectangles replace a guessed regular grid. Each sheet was inspected before integration.

Architecture prompt: production pixel-art sprite atlas; transparent background; high overhead three-quarter ARPG view with horizontal north walls, not diamond isometric; 4 columns × 2 rows; isolated burgundy guild roof, weathered smith roof with chimney, ivory/gold sanctuary roof, dark timber roof; dressed retaining wall, half-timber wall with shutters, open fortified gate arch, broad stone stairs. Upper-left lighting, grey stone, deep timber, burgundy, amber details. No people, labels, painted background or ground plane.

Civic prompt: transparent modular pixel-art atlas in the same perspective and palette; burgundy food stall, ochre produce stall, two rugged grass-topped cliff faces, open reinforced doorway, amber gothic window, supported timber walkway, roofed stone well. Isolated assets, no text or people. The large walkway disrupted the requested grid; its actual rectangle is recorded explicitly.

The current slice uses roofs, retaining walls, timber walls, gate, stairs, stalls, cliffs, doors, windows and a watch walkway. The well remains a reserved kit piece. Existing Runalis furniture, lamps, wagons, racks and characters are reused.

Known art limitation: these generated modules have finer texture than the original actor sprites. They improve architectural construction but still need a dedicated pixel-density cleanup pass to reach the supplied concept's commercial-quality bar. No claim of final art approval is implied.
