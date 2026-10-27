# Mara Vell and the Root & Retort

The post-ambush recovery room is now upstairs above the Root & Retort. Its staircase descends into the shop's existing ground floor in Orrakai. The shop's south door leads to the street, and the staircase in the eastern herb room always lets the player return upstairs.

Previously, the recovery scene was a separate house, its exit placed the player beside the western workshop, and the campaign added a house marker there. The western building is now correctly named Corin's Workshop. The Root & Retort has its permanent upstairs entrance from town creation onward, independent of quest progress.

Mara Vell now stands at the apothecary counter in place of the generic Alchemist. She is described as the apothecary's daughter and retains her companion identity, Thornbinder training and quests. Her dialogue offers the existing restorative service: Gravecap and Pale Essence brew a Shrine Tonic; the existing eight-gold purchase remains available. The old service ID remains as a hidden, noninteractive compatibility anchor.

The opening questions, directions to Warden Mael, later return-home directions and journal description now identify the correct building and stairs. Mael's evening-visit position has been moved away from the stairwell so the story conclusion cannot block the exit.

Existing `maraHouse` world and object IDs are retained for save and story compatibility. Older house saves receive the new display name, and a saved player standing on the former exterior threshold is moved to a safe floor position. Descending stamps the current town layout revision so the player stays inside the shop instead of being moved to the town's default spawn. Older published object placements are rebound for these story anchors without rebuilding edited terrain.

## Validation

- 12 dedicated model checks cover floor connections, repeated visits, real collision-aware walking routes, NPC/service identity, service ownership/range, old placements, save/load on both floors, legacy threshold migration, opening replay prevention and Mael's evening visit.
- The actual game browser test loads the ambush, uses its skip-to-recovery path, completes all opening questions, interacts with the downstairs staircase, buys medicine through Mara's real dialogue action handler, walks outside through the shop door, walks back and returns upstairs. Saves on both floors preserve the quest stage and opening flags. No browser exceptions or missing requests.
- Existing Orrakai verification passes: all 55 protected town objects remain, every interaction remains reachable, and the seven buildings retain their usable doors.
- Existing Act I campaign and access checks pass. Complete Mercy/Act I dialogue flows retain their 44 save/load checkpoints, with the Warden and Cardinal reporting branches checked separately.
- All 13 workshop model checks and the workshop browser checks pass, preserving Corin, the smith and existing services.

The route was checked with actual collision movement and browser interaction. The longer quest-flow test repositions travel and resolves encounter deaths through its existing test fixture; it is not a manual combat playthrough.

## Captures and checks

- [Upstairs after recovery](upstairs.png)
- [Root & Retort ground floor](shop.png)
- [Street outside the shop](street.png)
- [Returning upstairs](upstairs-return.png)
- [Model verification](verification.json)
- [Browser verification](browser-verification.json)
- [Original mismatch](before.json)

The pre-change source and tools are preserved at `C:/Users/austi/.codex/backups/runalis-mara-root-retort-2026-10-27/`.
