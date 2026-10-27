# Runalis Developer Mode — Implementation Report

Date: 2026-07-22  
Status: Integrated editor foundation, usable for current 2D Canvas worlds  
Architecture note: Runalis is a deterministic HTML5 Canvas game, not a BabylonJS project. The editor therefore uses the existing 2D world, renderer, camera, input, and generation systems instead of introducing an incompatible 3D scene layer.

## Outcome

Developer Mode is available from the main menu and can launch every supported hub, region, route, dungeon, POI view, test arena, or empty sandbox. It operates on the live Runalis world model, supports non-destructive authored overrides, and includes selection, transforms, placement, terrain painting, paths, water, triggers, validation, backups, recovery, runtime publication, and playtesting.

This is a reusable authoring foundation rather than a debug-button collection. It deliberately derives its asset registry from the active world, keeps player saves separate, and applies published overrides through the normal world factories.

It is not yet a feature-complete Unity-style editor. The final sections distinguish the shipped foundation from architecture-bound or future work.

## Files changed

### Added

- `src/developerEditor.js`
  - Editor runtime, UI, input routing, camera, selection, command history, asset registry, inspector, placement, terrain, paths, water, playtest, console, and validation presentation.
- `src/developerWorldPersistence.js`
  - Stable IDs, base snapshots, sparse overrides, deletion lists, draft storage, backups, crash recovery, validation, dependency scanning, publication, and JSON exports.
- `src/developerWorldFactory.js`
  - Developer map catalog and adapters over normal world, hub, region, route, and dungeon factories.
- `docs/implementation/DEVELOPER_MODE_PRECHANGE_AUDIT.md`
  - Pre-change architecture audit and integration strategy.
- `docs/implementation/DEVELOPER_MODE_IMPLEMENTATION_REPORT.md`
  - This report.

### Modified

- `index.html`
  - Added the requested main-menu order and Developer Mode setup dialog.
- `style.css`
  - Added main-menu and setup-dialog presentation.
- `src/main.js`
  - Added Developer Mode launch, editor lifecycle, input delegation, editor update/draw integration, playtest routing, recovery on unload, and safe exit behavior.
- `src/gameSave.js`
  - Added controller focus support for the new menu and setup controls.
- `src/world.js`
  - Added published override application to normal overworld generation.
- `src/regionWorlds.js`
  - Added published override application and fresh-state bypass support for regions and routes.
- `src/hubSystem.js`
  - Added published override application and fresh-state bypass support for Orrakai.
- `src/dungeonSystem.js`
  - Added published override application and fresh-state bypass support for dungeons.
- `src/objectRenderer.js`
  - Added safe scalar rotation support plus runtime rendering for authored paths and water. Editor-only logic markers remain invisible in normal play.

## Existing systems reused

- Existing deterministic overworld generation from `world.js`.
- Existing Orrakai hub generation from `hubSystem.js`.
- Existing regional and travel-route factories from `regionWorlds.js`.
- Existing procedural dungeon generation from `dungeonSystem.js`.
- Existing world collections: `world.objects`, `world.enemies`, and `world.tiles`.
- Existing Canvas renderer and camera offset model.
- Existing game loop, player controller, collision, enemy AI, dialogue, quests, combat, HUD, and save UI.
- Existing object and enemy definitions already instantiated in live worlds.
- Existing browser storage approach, with new editor-only namespaces.

The editor does not maintain duplicate map implementations. A development session starts by calling the same factory used by gameplay, captures that result as its base, then applies a sparse override.

## Main-menu integration

The menu now presents:

1. Continue
2. New Game
3. Developer Mode
4. Settings
5. Credits
6. Quit

Developer Mode opens a setup dialog with:

- Map or region
- Starting location
- World state
- Camera mode
- Simulation mode
- Initial edit/playtest mode
- AI pause
- Quest/script activation
- Lighting/weather activation
- Playtest collision
- Session notes

Supported map entries:

- Orrakai
- Echoryn / Hearthmere Frontier
- Ashen Orchard POI view
- Ruined Chapel POI view
- Castle Veyr
- Aureate Marches
- Ascension Wastes
- Pilgrim Road
- Hollow Root Cellar
- Shattered Choir
- Test Arena
- Empty Sandbox

Ashen Orchard and Ruined Chapel are anchored views of the Echoryn world, so both correctly save against the shared `echoryn` map ID rather than creating incompatible POI copies.

## Editor UI

The editor uses the requested composition:

- Top: map, dirty state, modes, transform tools, history, save, validation, runtime export, quit.
- Left: filterable world hierarchy, select-visible, collection grouping, terrain snap.
- Right: inspector, exact numeric properties, component data, dependencies, destructive actions.
- Bottom: asset browser, console, validation results, terrain controls.
- Center: live game viewport.

Panels are collapsible. Tab hides the whole editor shell for a minimal viewport. The layout adapts at 1100 px and 760 px breakpoints; a 900×650 laptop-sized pass showed no page or asset-panel horizontal overflow.

## Modes and precise controls

### Mode shortcuts

- `1`: Select
- `2`: Place
- `3`: Terrain
- `4`: Enter playtest; while playtesting, `4` returns to the editor
- `Tab`: Hide/show editor UI
- `F1`: Help
- `F2`: Asset panel
- `F3`: Hierarchy
- `F4`: Inspector
- `F5` or `Ctrl+S`: Save
- `F6`: Reload saved draft
- `F7`: Toggle simulation preview / return from playtest
- `F8`: Collision overlay
- `F9`: passability overlay
- `F10`: persistent-ID labels

### Selection and editing

- Left click: select
- Shift-click: add
- Ctrl-click: remove
- Drag empty viewport: box select
- Repeated click: cycle overlapping candidates
- Double click or `F`: frame selection
- `Escape`: clear selection or cancel active placement/path
- `Delete` / `Backspace`: delete
- `Ctrl+D`: duplicate with a new stable ID
- `Ctrl+Z`: undo
- `Ctrl+Y` / `Ctrl+Shift+Z`: redo
- Arrow keys: nudge selection
- Shift + arrow: precision nudge
- `W`: move
- `E`: rotate
- `R`: scale
- `Q`: universal/select tool

### Camera

- WASD or arrows pan when no selected object is being edited.
- Shift accelerates camera movement.
- Ctrl slows camera movement.
- Middle or right drag pans.
- Wheel moves the camera toward or away from the viewport focus.
- Ctrl + wheel changes camera speed.
- Double click focuses an object.
- `F` frames the selection.
- `Home` returns to the map spawn.
- `End` returns to the player.

The setup accepts Free Fly, Orbit Selection, Top-Down, Orthographic, Player Camera, and Cinematic Preview labels. In the current 2D engine these are editing intent profiles over the same offset camera, not distinct Babylon camera implementations.

## Selection system

- All persistent entries in `world.objects` and `world.enemies` are candidates.
- Picking uses a bounded screen-space/world-space distance check rather than DOM elements per object.
- Paths use point-to-segment distance.
- Volumes use their authored size.
- The closest results are sorted and repeated clicking cycles overlap.
- Selection boxes collect objects inside their world rectangle.
- Selected objects receive editor-only bounds and handles without modifying runtime materials.
- The hierarchy is capped at 500 visible rows until its filter narrows the result, avoiding thousands of live UI nodes on Echoryn.

## Transform system

- Move, rotate, and scale operate through a drag-based Canvas-native transform tool.
- Exact X, Y, rotation, and scale values are editable in the inspector.
- Grid and angle snapping are supported.
- Multi-selection transforms together.
- Paths translate, rotate, scale, nudge, undo, and redo their actual control-point geometry, not only their metadata center.
- Command snapshots preserve pre- and post-transform states.
- Terrain snap is available from the hierarchy/inspector controls.

Because the game is 2D, transforms are X/Y plus one rotation and one scalar scale. There are no Z-axis, surface-normal, or 3D pivot gizmos.

## Deletion, disabling, and dependencies

- Decorative content deletes immediately.
- Critical, unique, quest-related, entrance, exit, spawn, boss, NPC, and POI objects are classified as protected.
- The dependency scanner recursively locates other world entities containing a selected persistent ID.
- Protected or referenced deletion requires confirmation.
- “Disable” sets the persistent `enabled` property without deleting the object.
- Deletion is undoable and records the removed entity and collection position.
- Saved deletions become `deletedObjectIds` or `deletedEnemyIds`, so deterministic generation does not resurrect them.

The current browser confirmation offers cancel/delete. The more elaborate replace-reference and disable-in-the-same-dialog workflow remains future UI work; both dependency viewing and disable are available separately.

## Undo and redo

The command stack supports:

- Placement
- Deletion
- Duplication
- Move/rotate/scale
- Numeric and shared property changes
- Nudge
- Terrain painting
- Path creation
- Collection grouping
- Terrain snap
- Raw component property edits

It does not reload the map to undo an operation. The stack is capped to avoid unbounded memory growth.

## Asset browser

The registry is primarily live-derived:

- Current `world.objects` definitions are adapted into placeable object templates.
- Current `world.enemies` definitions become placeable enemy templates.
- NPCs and unique/boss variants retain distinct registry entries.
- Newly introduced normal-world kinds become available without a hand-maintained placement list.
- Editor-native entries provide canonical paths, water, triggers, spawn points, lights, audio, weather, and navigation blockers.

The browser supports:

- Text search over name, ID, tags, faction, race, role, POI, and category.
- Categories.
- Favorites.
- Recently used assets.
- Approximate size.
- Collision/scripted markers.
- Symbolic previews suited to the current procedural Canvas art.

Recovered editor-native instances cannot shadow their canonical category or defaults.

## Placement and vegetation

- Select an asset, move into Place mode, and click the world.
- Placed entries receive a unique persistent editor ID.
- Wheel adjusts pre-placement rotation.
- Shift + wheel adjusts placement height metadata.
- Grid snap applies to placement.
- Paint mode distributes one or more instances inside a brush radius using a conservative built-in density.
- Random rotation, scale, and density parameters are represented in the placement runtime, but do not yet have dedicated UI controls.
- Placement is undoable.
- Existing tree, shrub, grass, rock, prop, harvest-node, NPC, and enemy types automatically act as vegetation/object brush inputs when they exist in the active world.

Mixed weighted biome recipes, slope masks, erase/replace brushes, and ghost collision previews remain future work.

## NPC and enemy editing

- Existing NPC and enemy instances appear in the hierarchy and asset browser.
- Their full serializable component data is exposed through the raw Properties / Components editor.
- Common transform, visibility, collision, interaction, name, layer, and enabled fields are first-class controls.
- Faction, role, race, dialogue, quest, service, AI, loot, encounter, patrol, and spawn metadata can be edited when those properties exist on the entity.
- Duplicating a unique or authored named NPC strips its unique dialogue/NPC identity and records `editorCloneOf` rather than silently sharing story references.
- Enemy placement restores live HP and clears dead/removal state.

Dedicated form sections for every NPC schedule, merchant inventory, encounter-wave, and patrol property have not yet replaced the raw component editor.

## Paths

- The canonical Path / Road Spline asset enters point-creation mode.
- Click adds points.
- Enter finishes a path with two or more points.
- Escape cancels and removes the incomplete draft.
- Paths expose width, material, points, and navigation-influence data.
- Entire paths can be selected, moved, rotated, scaled, nudged, deleted, duplicated, saved, reloaded, and rendered in normal gameplay.
- Path data is stored as ordinary added/modified object data in the sparse override.

Individual point handles, split/join/smooth, terrain flattening, auto-bridges, and generated roadside props are not yet implemented.

## Water

- Water Volume is an editor-native placeable type.
- Width, height, depth, type, contamination, fishing, collision, and additional runtime metadata can be edited.
- Volumes are visible and translucent in edit mode.
- Published water renders in normal gameplay.
- Deletion removes the single authoritative water entity, avoiding detached editor-only trigger remnants.

The current foundation supports rectangular/elliptical volumes. Polygon shorelines, river splines, terrain carving, flow simulation, reflections, underwater post-processing, and generated crossing systems need engine support.

## Terrain

- Terrain material painting edits the existing `world.tiles` grid.
- Available brushes include grass, road, dead earth, ruin/stone, waterbed, wall/unwalkable, raise metadata, lower metadata, and restore.
- Brush size is adjustable.
- Tile edits are sparse, undoable, serializable, reloadable, and published through the normal world override.
- Raise/lower preserve non-destructive `editorHeight` metadata.

Runalis currently has a flat tile renderer and no continuous height field. Raise/lower therefore do not visually deform geometry yet. Smooth, erosion, terraces, ramps, and true collision/navmesh rebuilds require a future terrain representation.

## Triggers, lighting, weather, audio, and navigation

Placeable editor-native objects exist for:

- Logic triggers
- Player spawns
- Point lights
- Ambient audio emitters
- Weather zones
- Navigation blockers

They can be placed, sized through properties, selected, duplicated, deleted, persisted, validated, and exported. They are translucent/editor-visible as appropriate and hidden from ordinary rendering when they are logic-only.

These entities establish a stable authoring data contract. Runtime consumers for arbitrary authored light, weather, audio, and generic trigger actions are not all present in the current game engine, so publication preserves the data but does not claim every marker already drives gameplay.

The F9 overlay visualizes current tile passability. Runalis has no navmesh implementation; “navmesh” operations are intentionally represented as passability and blockers rather than a fake Babylon navmesh.

## Inspector and prefabs

- Common properties have first-class controls.
- Exact numeric transforms are supported.
- Raw serializable components provide complete current-data access.
- Internal persistent IDs are visible but immutable in the standard inspector.
- Dependencies are listed and can focus their source entity.
- A selection can be exported as a reusable prefab snapshot with relative offsets.

Linked prefab instances, apply-to-source, unpack/revert, nested prefab graphs, and circular dependency checks remain future work.

## Persistence and data formats

Player profiles are untouched. Editor data uses separate keys:

- `runalis.developerWorldDrafts.v1`
- `runalis.developerWorldBackups.v1`
- `runalis.developerWorldRecovery.v1`
- `runalis.runtimeWorldOverrides.v1`
- `runalis.developerWorldPreferences.v1`
- `runalis.developerWorldPrefabs.v1` (reserved for the future linked-prefab catalog; current prefabs export as files)

The override structure contains:

```text
version
mapId
baseMapVersion
deletedObjectIds[]
deletedEnemyIds[]
addedObjects[]
addedEnemies[]
modifiedObjects{}
modifiedEnemies{}
terrainEdits[]
metadata { name, author, notes, mapName, worldMode, savedAt, dirtyRevision }
```

Application order is:

1. Generate/load normal base world.
2. Ensure stable IDs.
3. Remove saved deletions.
4. Apply modifications.
5. Add missing authored entities.
6. Apply sparse terrain edits.
7. Continue normal runtime initialization.

## Stable IDs

- Existing IDs are preserved.
- Legacy objects without IDs receive deterministic `generated-{map}-{kind}-{index}` IDs during normalization.
- Duplicate legacy IDs are repaired deterministically within the collection traversal.
- New authoring operations generate collision-checked persistent IDs.
- Duplicates never reuse the original entity ID.

For generated base content, long-term source-level deterministic IDs are still preferable to index-based migration IDs because changes to generation order can shift indexes. The current adapter makes legacy content editable without rewriting all generators at once.

## Save, backup, and crash recovery

- Save validates first and refuses fatal errors.
- Every overwrite of an existing valid draft first protects the previous version through a timestamped backup.
- The latest ten backups per map are retained.
- Save As creates a named manual snapshot.
- Recovery writes to a separate recovery namespace every 30 seconds while dirty, on editor destruction, and before page unload.
- A newer recovery snapshot prompts for restoration on the next Development Save launch.
- A successful normal save clears recovery.
- Dirty state is always visible.
- Revert, reload saved, restore latest backup, export patch, and change report are available.

## Validation

Validation results are categorized into Error, Warning, and Information and shown in a dedicated panel. Implemented checks include:

- Missing IDs
- Duplicate IDs
- Invalid positions/transforms
- Invalid scales
- Out-of-bounds entities
- Missing object kinds
- Invalid short paths
- Invalid water dimensions
- Duplicate unique NPC identity
- Missing player spawn
- Missing exits/transitions where relevant
- Suspicious deletion of critical IDs
- Override version/map identity

Runtime publication is blocked when errors exist unless a caller deliberately forces it.

Deep validation against every quest/dialogue source definition, patrol reachability, missing art assets, prefab graphs, and generic runtime trigger schemas remains future work.

## Runtime export and integration

- Export Runtime validates the current world.
- A successful export stores the override in the runtime publication namespace and downloads a JSON production artifact.
- Normal overworld, region, route, hub, and dungeon factories apply matching published overrides.
- Fresh and Default Canon developer sessions bypass published overrides.
- Export Patch downloads the sparse development override without publishing it.
- Change Report downloads counts and validation details.
- Editor-only logic markers are hidden by the normal renderer; authored paths and water have runtime visuals.

This is runtime-integrated override publication, not yet an optimized asset-bundling or source-code generation pipeline.

## Playtest behavior

- Playtest instantly hides editor UI and returns control to the normal game loop.
- Existing combat, AI, collision, interaction, dialogue, and quest systems run because this is the actual game world.
- The setup AI flag gates enemy updates, encounter respawns, and ambient NPC movement in playtest.
- The quest/script flag gates Act I scripted progression and pending quest rewards.
- Disabling collision enables player no-clip movement during playtest.
- The lighting/weather flag gates live world-effect updates.
- In edit mode, Paused is the default. Active/Full World and F7 can run a bounded preview without surrendering the editor camera; Full World additionally advances respawns and overworld encounters.
- The editor snapshots its world, camera, player, and selection before playtest.
- Returning defaults to restoring the pre-playtest authoring state, preventing combat or collection changes from silently becoming map edits.
- The code supports explicitly applying runtime changes when invoked deliberately.

Dedicated possession, class/bloodline presets, quest-stage controls, invulnerability, item grants, and a full developer cheat palette remain future work.

## Controller behavior

- Controller focus covers the main menu and Developer Mode setup form.
- In the viewport, a connected controller can pan, cancel selection, and select the object at screen center.
- Keyboard, mouse, and controller continue through the existing centralized input system.

Full controller traversal of hierarchy, inspector fields, asset cards, drag transforms, and terrain brushes remains limited; keyboard and mouse are the primary authoring controls.

## Performance considerations

- No per-world-object DOM overlays are created.
- Picking works against world collections and simple geometric distances.
- Hierarchy rendering is capped at 500 items until filtered.
- The asset browser deduplicates normal kinds/variants rather than cloning every tree into a card.
- Sparse diffs avoid serializing an entire generated map for small edits.
- Validation is explicit and save-time rather than continuously walking thousands of objects.
- Edit mode stops the gameplay simulation update, while playtest reuses the optimized game loop.

Echoryn currently generates about 3,954 objects and 321 enemies and remains a costly deterministic construction step (roughly 21–25 seconds in the command-line smoke environment). Future chunking or cached base snapshots would improve editor entry time materially.

## Tests completed

### Static and data-model checks

- Syntax checked all ten affected JavaScript modules.
- Built, saved, loaded, and applied a sparse object modification/addition override in memory.
- Confirmed stable ID creation and base snapshot construction.
- Confirmed every developer map setup produces tiles, spawn data, stable base identity, and zero fatal validation errors.

Cross-map results:

| Setup | Editor map ID | Objects | Enemies | Fatal errors |
|---|---:|---:|---:|---:|
| Orrakai | orrakai | 152 | 0 | 0 |
| Echoryn | echoryn | 3,954 | 321 | 0 |
| Ashen Orchard | echoryn | 3,954 | 321 | 0 |
| Ruined Chapel | echoryn | 3,954 | 321 | 0 |
| Castle Veyr | castle-veyr | 46 | 113 | 0 |
| Aureate Marches | aureate-marches | 14 | 4 | 0 |
| Ascension Wastes | ascension-wastes | 12 | 4 | 0 |
| Pilgrim Road | pilgrim-road | 5 | 6 | 0 |
| Hollow Root Cellar | hollow-root-cellar | 47 | 102 | 0 |
| Shattered Choir | shattered-choir | 53 | 143 | 0 |
| Test Arena | test-arena | 2 | 0 | 0 |
| Empty Sandbox | empty-sandbox | 1 | 0 | 0 |

Pilgrim Road and Test Arena each produce one non-fatal missing-exit warning under the general validator; this is expected for their current authored roles.

### Interactive browser checks

- Loaded the main menu with the exact requested option order.
- Opened and inspected every Developer Mode setup field.
- Launched Empty Sandbox in Fresh State.
- Selected through the hierarchy and inspected exact fields.
- Duplicated an object and verified hierarchy/inspector refresh.
- Undid duplication and verified original selection restoration.
- Selected Water Volume in the asset browser and placed it in the viewport.
- Validated the map: zero errors and zero warnings for the edited sandbox.
- Saved the draft and observed the dirty indicator return to Saved.
- Reloaded the saved draft and confirmed placed water remained.
- Painted road terrain and confirmed undo availability/dirty state.
- Created and finished a two-point road path.
- Started another path, canceled it, and confirmed the incomplete entity was removed.
- Entered playtest and verified the editor UI hid.
- Returned with `4` and verified editor state restored.
- Reloaded the page with dirty work, accepted the recovery prompt, and confirmed water/path recovery.
- Opened F1 help and confirmed control text renders correctly.
- Tested the editor at 900×650 with no page or asset-panel horizontal overflow.
- Checked browser warnings/errors after the workflow: none.

### Not exhaustively tested yet

- Every destructive critical-object dialog variant against real quest chains.
- Every live NPC, merchant, enemy, boss, and building type through save/reload.
- Large multi-selection transforms across all 4,000 Echoryn objects.
- Long repeated-save/backup-restore soak tests.
- Physical gamepad authoring across every panel.
- Browser focus-loss during a live transform.
- Published override download and production packaging in a deployment build.
- Cross-browser and ultrawide visual matrices.

## Known limitations

1. The prompt assumed BabylonJS, 3D meshes, navmeshes, and height terrain. Runalis currently has none of those; the implementation is faithful to its actual 2D Canvas architecture.
2. Camera mode names share one 2D camera implementation. There is no perspective orbit, mouse-look, or Z-axis fly camera.
3. Gizmos are Canvas transform bounds, not Babylon axis widgets. Local/world/pivot spaces, sockets, and vertex snapping are not available.
4. Terrain height edits are metadata until a height-aware renderer/collision system exists.
5. F9 displays tile passability, not a true navmesh. Rebuild/link/path-test tools need a navigation subsystem.
6. Path point creation is complete, but individual point-handle editing and advanced spline operations are not.
7. Water volumes work, but river/polygon authoring and advanced water simulation do not.
8. Logic/light/audio/weather markers persist, but not every generic marker has a runtime consumer; the lighting/weather setup toggle gates effect updates rather than replacing the renderer's environment profile.
9. Prefab export is foundational rather than a linked-instance authoring system.
10. Align/distribute, weighted mixed brushes, region polygon filters, and advanced bulk replace are not complete.
11. Component editing is comprehensive through JSON but not fully represented as bespoke forms for every NPC/enemy system.
12. The world has no chunk streaming ownership model to edit; region ownership is represented by existing world factories and editor layers.
13. Asset previews are symbolic because most Runalis visuals are procedural Canvas drawing rather than image files or mesh thumbnails.
14. Controller support is practical for launch and basic viewport inspection, not full authoring parity.
15. Legacy deterministic IDs based on generation index can shift when generator ordering changes; source-level IDs should gradually replace them.
16. “Player Only” simulation keeps AI/world advancement constrained in edit mode; direct player control still requires entering Playtest.

## Recommended next improvements

1. Add direct path-point handles, split/join/smooth, and patrol-route assignment.
2. Build dedicated NPC, merchant, enemy, encounter, trigger, and service inspector components over the existing raw-data fallback.
3. Add erase/replace vegetation brushes and weighted biome brush recipes.
4. Introduce a real height-capable tile/terrain layer before expanding raise/lower/smooth/erosion tools.
5. Implement a graph-based validation registry for quests, dialogue, triggers, patrols, and cross-map transitions.
6. Add a runtime consumer registry for authored lights, audio zones, weather zones, and generic triggers.
7. Upgrade prefabs to linked/unpacked instances with reference sanitization and versioned source IDs.
8. Add chunk/cached-base support to reduce Echoryn load time and support localized validation/picking.
9. Add editor layout persistence and full controller focus/navigation for all panels.
10. Add automated regression fixtures for delete/save/reload, placement/save/reload, terrain patches, critical dependencies, and runtime publication.

## Final assessment

The editor now meets the central architectural goal: Runalis can launch a real in-game authoring mode, edit the same deterministic worlds used by gameplay, preserve changes as non-destructive overrides, recover dirty work, validate before publication, and reload published results through normal factories.

The strongest completed areas are entry/setup, world integration, stable IDs, sparse persistence, deletion durability, selection, common transforms, live-derived placement, save/recovery, validation, and playtest safety. The largest remaining work is not editor scaffolding; it is adding richer engine capabilities and domain-specific inspectors on top of this foundation.
