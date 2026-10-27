# World-map markers and controller cursor

NavStone symbols are now 14 × 20 screen pixels, with transparent buttons and no surrounding boxes or selected-state panels. Their screen size stays fixed when zooming. A subtle glow identifies selected and hovered stones.

Each opening centres the map on the player's current position, at 4× continental zoom (2.5× on regional maps). The player stays centred even near the world's edges. Manual panning and zooming persist during the open session; reopening follows the current position again. Fit map remains available for the complete overview.

Controller map controls:

- Either stick moves a visible cursor. Partial deflection allows finer movement.
- Push the cursor against an edge to pan the zoomed map.
- Hold RT to zoom in or LT to zoom out around the cursor.
- Press A over a discovered stone to select it; press A again to attempt travel.
- A over empty map space does nothing.
- D-pad Up/Down still selects destinations in the list. Hold Y returns to Orrakai, and B closes the map.

Mouse selection, scrolling, dragging, and map toolbar controls remain available. Cursor position and zoom survive HUD refreshes. Existing travel requirements, danger checks, ration cost, and discoveries are preserved. The nine-destination NavStone network is unchanged.

[Controller preview](cursor-selection.png) · [Controller verification](verification.json)

Browser checks cover both sticks, precision movement, deadzone, zoom anchoring and limits, edge panning, selection, travel confirmation, and marker transparency. Existing map layout/travel and Block/controller binding checks also pass.
