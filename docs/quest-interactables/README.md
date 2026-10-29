# Quest evidence visibility and art

The black square with a cancellation mark was the generic investigation glyph,
not an asset-download error. It has been removed. All investigation evidence
now uses one of 17 native pixel models: documents, lanterns, wax, cloth, ritual
markings, tracks, roots, water, remains, toys, mechanisms, reliquaries, stonework,
satchels, tables, arrows and Echo fragments. The models render without waiting
for an external image asset.

`questInteractables.js` is the shared, read-only visibility rule for scene
rendering, nearest-interaction prompts, evidence inspection and radar markers.
Evidence appears only while an active quest stage needs its POI investigation,
flag or explicit object. Named campaign clues have exact stage gates. The Old
Well also respects encounter readiness, and the broken lantern disappears when
collected. The regulator and refuge repair/recovery fixtures have their own
stage and completion gates. The recovered reliquary waits for boss victory.

Side investigations can expose the same evidence independently of the main
quest. Collection, POI clues and dungeon records are retained in saves. Shared
campaign objects use the host's quest progress. Visibility does not mutate
depleted/collected state or remove entries from streamed chunks. Residents,
quest givers, stairs, permanent services and dungeon navigation remain available.

Validation:

- `node tools/verify-quest-interactables.mjs`: audits all 52 overworld/town
  evidence objects for art, reachable quest steps, early hiding, prompt/radar
  hiding, side quests, lantern readiness, save/load and shared ownership.
- `node tools/verify-quest-interactables-browser.cjs`: real renderer emits no
  inactive evidence pixels; real caravan interactions advance the quest and
  remove both the art and prompts. All 17 art families are captured in
  `evidence-art.png`. No browser errors.
- `node tools/verify-mercy-flow.mjs`: complete opening and Act I interaction
  flow with 42 save/load checkpoints. Travel is repositioned and enemy HP set
  to zero to exercise death handling, rather than assess combat balance.
- Campaign, apothecary, watch-post and physical access regressions also pass.
