# Static brick textures

Fixed repeating wall textures in Orrakai and Echoryn that used the screen origin rather than the world origin. Capital exterior and partition walls now pass their camera offset to the material. Echoryn walls do the same, with the texture and wall geometry snapped together during fractional camera movement.

Shared procedural masonry previously chose brick colours from moving screen coordinates. It now uses world coordinates, including the continental frontier walls and unloaded-art fallback. Cached ground surfaces keep their existing static origins. No collision, building layout, actors or gameplay behavior changed.

`tools/verify-brick-anchoring.cjs` compares the same world-space pixels across seven camera positions, including non-tile-aligned movement and fractional offsets. All 19 surfaces / 133 views passed: seven capital buildings' exterior and partition walls, cached paving, a real Echoryn vertical wall, its fallback, shared masonry and continental masonry. Comparisons allow a 2/255 channel tolerance for browser compositing rounding; there were no mismatches exceeding that tolerance or browser errors.

Orrakai services/layout/return checks and all seven continental runtime groups also passed. See [verification.json](verification.json).
