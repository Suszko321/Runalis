# Original pixel-art side walking restored — October 5, 2026

The procedural side-leg rig replaced the authored trousers and boots with thin
stretched strips. Its continuous rotations changed their silhouette between
frames and made walking look smooth rather than like the original pixel art.
The previous geometry tests passed while missing that visual regression.

`src/sideLegArt.js` now draws the entire authored lower-body cell at its native
pixel size. The pelvis, legs and boots remain together. Four discrete atlas
frames supply both walking and running, with faster playback for running.
East/west use the same profile mirrored horizontally. `src/spriteArt.js` trims
the original glove overhang and registers the hips beneath the fitted torso.
Equipped legwear uses its corresponding existing atlas cells at native size.

The continuous leg solver has been removed. Side arm poses hold on the same
four gait keys, and the renderer removes animated root rocking and squeezing
from sideways locomotion. The torso-width and south-facing arm fixes remain.
Movement speed, collision, combat timing and saves are unchanged.

Validation completed:

- 1,024 leg renders compared pixel-for-pixel with the complete original atlas
  cells, including mirrored west-facing pixels. All retain the native pixel
  coverage and exactly four distinct authored frames per cycle.
- 1,024 complete actor samples verify that trousers and boots hold their shape
  throughout each gait key, for both bodies, both directions, walk/run and
  chest-only or available matching legwear combinations.
- Existing 8,448 composed torso-width checks, relaxed arm and weapon grip checks.
- 288 complete and 160 partial equipment combinations.
- 1,170 south-facing arm pose checks.
- Actual game keyboard movement east/west with plate chest and sword in an
  isolated browser profile; atlases loaded and no browser errors occurred.

Current animated reviews:
[male walk](locomotion-male-walk-restored.gif),
[female walk](locomotion-female-walk-restored.gif),
[male run](locomotion-male-sprint-restored.gif), and
[female run](locomotion-female-sprint-restored.gif).
See also [the scythe pose comparison](human-width-restored-scythe.png) and
[leg validation results](leg-gait-results.json).
