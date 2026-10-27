# Acolyte Murmuring Host

The Acolyte morph now channels a long-range procession of ancestral spirits. Base reach rises from 340 to 620 world units; the beam hits every living hostile in its corridor, rather than stopping at eight targets. Half-width is 28 units plus enemy radius. Walls stop both damage and the visible stream. Mastery and applicable range bonuses still apply. Damage is now three times the previous Acolyte version, including its existing stat and mastery scaling. Existing weakening, Soul Fragments, aiming, movement and release/dodge controls are retained.

Starting Spirit cost falls from 3 to 2, and base upkeep falls from 12 to 9 Spirit per second (25% less). Existing mastery and equipment efficiency still reduce these costs.

Casting immediately creates a spectral shield for the caster. It reduces incoming damage by 25%, renews each channel tick, and lasts about 0.65 seconds after the last tick. Existing ward strength/duration bonuses apply within their existing caps. The shield uses timed encounter state and the common incoming-damage hook used by ordinary attacks, projectiles and boss attacks. It does not overwrite another defensive buff, affect allies, or persist into saves; death, world changes and morph changes clear it.

`src/acolyteHostArt.js` authors the pixel effects directly in the existing canvas renderer: animated filled ghost silhouettes, braided mint/violet ribbons, moving comet tails, sparks, a casting seal and a shield shell. It uses rounded pixel coordinates without gradients or image smoothing. Fixed ribbon/ghost sample counts and six impact bursts per tick keep visuals bounded while all enemies still take damage. Existing class art and other skill morphs remain unchanged.

Verification:

- `tools/verify-acolyte-host.mjs`: eight checks covering real casts, a 15-enemy line, excluded targets, far targets, walls, shield renewal/expiry/ownership/cleanup, reduced drain, exhaustion, dodge, diagonal aiming/steering, other forms and a complete Blighted Star set.
- `tools/verify-acolyte-host.cjs`: isolated browser gameplay with twelve targets, visible shield/beam, bounded live effect count, three distinct animation frames, restored canvas state, release and no missing assets or page errors.

Review `procession.png` and `animation-frames.png`; machine results are in `verification.json` and `browser-verification.json`.

Save and refresh the game to load the update.
