# Allied Wolf and Demon pixel art — October 5, 2026

Both universal summons now use Runalis's existing authored pixel sprite animations.
The earlier rendering route bypassed these atlases for simple code-drawn creatures;
the game's `drawSummonAsset` now routes them through `companionSpriteArt.js`.

| Companion | Existing asset | Allied appearance | Frames |
|---|---|---|---|
| Wolf | `assets/art/sprites/enemies-core.png`, row 1 | Icy blue/silver coat, turquoise eyes | Idle, move 1, move 2, attack |
| Demon | `assets/art/sprites/summons-evolved.png`, row 3 | Violet/lavender body, turquoise eyes and fire | Idle, move 1, move 2, attack |

Palettes are applied once to a separate cached row image. Enemy/source sheets stay
untouched. The renderer disables image smoothing, preserves pixel edges, mirrors
the authored side view according to facing, and selects attack frames from the
actual summon attack timer. Stationary summons use the idle frame; movement
uses two authored stride frames. A small turquoise pixel pact mark below each
companion supplies an additional allied cue. Impact accents match allied colors.

If an atlas has not loaded, both render pixel fallbacks with the same allied
color identities; the demon no longer falls back to red triangles. The current
art is a mirrored side view, not four separately authored directional sheets.

Review [all frames against their original palettes](companion-art.html),
[the full-size screenshot](companion-pixel-art.png), or
[the compact left-facing screenshot](companion-pixel-art-compact.png).

`tools/review-companion-art.cjs` verifies the real browser renderer: four distinct
frames per companion in both facings, visible blue/violet recolouring, source
image immutability, restored canvas state, asset-loading fallbacks, and actual
`updateSummons` movement/attack driving the correct frame. It uses an isolated
browser context and creates no player saves. Results are recorded in
[companion-art-results.json](companion-art-results.json).

The progression suite and production-browser acquisition/combat checks were also
rerun after the renderer change. No progression, summon ownership, resource,
damage, or save format changes were required for this presentation update.
