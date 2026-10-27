# Runalis Developer Mode — Pre-change Architecture Audit

Date: 2026-07-22

## Rendering and scene architecture

Runalis currently uses a custom 2D HTML Canvas renderer, not BabylonJS. `render.js`, `terrainRenderer.js`, `objectRenderer.js`, the human/enemy renderers, and the game camera render code-authored assets into a 960×600 canvas. There is no Babylon scene graph, mesh picking, Babylon gizmo manager, or navmesh package to extend.

The editor therefore needs a Canvas-native selection overlay and transform workflow. Introducing a parallel Babylon scene would make authored output incompatible with the running game.

## World loading and generation

- `world.js` is the normalization and collision bridge.
- `overworldMap.js` builds the canonical Act I overworld from deterministic terrain and entity modules.
- `regionWorlds.js` creates compact later-act regions and travel routes.
- `hubSystem.js` creates Orrakai.
- `dungeonSystem.js` creates procedural multi-floor dungeons.
- Side zones, tower floors, and opening scenes are separate generated world shapes.

All use the same practical runtime contract: `tiles`, `objects`, `enemies`, `drops`, `effects`, `spawn`, metadata, and mode fields.

## Object model and registries

Persistent visible/logical content is primarily stored in `world.objects` and `world.enemies`. Objects commonly have stable authored IDs, `kind`, `name`, `x`, `y`, `scale`, interaction fields, POI/quest/dialogue references, and renderer-specific properties. Enemies have stable IDs plus combat/AI data. Dense generated decoration already receives deterministic IDs through overworld factory functions.

There is no central universal asset registry. The safest automatic registry is therefore an adapter built from the live world's distinct object/enemy kinds, supplemented by editor-native path, water, trigger, light, audio, weather, and spawn templates.

## Terrain, paths, and water

- Collision and gameplay terrain use a hidden tile grid with biome IDs.
- The main overworld also has seamless `terrainFeatures` containing roads, rivers, lakes, fields, cliffs, and other visual features.
- Compact worlds and dungeons largely render from their tiles.
- Authored overworld roads/water are data-driven Canvas features, not editable meshes.

The editor should preserve tile edits as sparse overrides and path/water authoring as editable source objects. Editor-native paths and water can render as overlays immediately and export as structured runtime data without destructively baking the base generator.

## Persistence and deterministic regeneration

Normal player saves deliberately avoid saving deterministic overworld objects/tiles. Development edits therefore require a separate format with:

- deleted object/enemy IDs;
- added objects/enemies;
- sparse modifications;
- sparse terrain edits;
- editable path/water/trigger data;
- metadata and validation results.

Draft editor data, recovery data, backups, and published runtime overrides must be separate from player profiles. Published overrides can be applied after base generation.

## IDs and references

Most authored content already has IDs, but the editor must normalize missing IDs and generate collision-resistant `dev-<map>-<kind>-<timestamp>-<counter>` IDs. Quest-critical risk can be inferred from dialogue IDs, NPC IDs, POI IDs, quest fields, dungeon/transition kinds, unique/boss flags, and spawn/exit roles. Full source-code reference replacement is not safe from an in-browser editor; dependency discovery can report known runtime/source-facing fields and block accidental deletion.

## Input and camera

`main.js` owns keyboard, mouse, controller, the active camera, and the frame loop. Editor input must be delegated before normal gameplay input. In edit mode it should pause gameplay simulation and move the existing camera directly. Playtest mode can resume the normal update path from a snapshot and restore that snapshot when returning to edit mode.

## UI

The main menu and game panels are DOM-based while the world is Canvas-based. A DOM editor shell over the actual canvas is appropriate: top toolbar, hierarchy, inspector, asset browser, console/validation panel, and Canvas overlays for selection, bounds, paths, water, triggers, brush previews, and debug labels.

## Co-op, AI, and navigation

Local co-op is actor/controller based. Developer Mode should start as a single developer-owned session and not offer co-op joining while editing. AI can be paused by preventing normal simulation updates. Runalis has collision/pathfinding helpers but no baked navmesh, so navmesh display/rebuild must be represented honestly as passability-grid visualization and local validation rather than a nonexistent Babylon navmesh rebuild.

## Implementation plan

1. Add a Developer Mode entry and setup dialog that loads real world factories.
2. Add a reusable editor runtime with modes, free camera, selection, transforms, command undo/redo, playtest snapshots, and overlay drawing.
3. Add a live-derived asset registry, hierarchy, inspector, placement, vegetation painting, sparse terrain painting, paths, water, triggers, lights/audio/weather markers, layers, collections, and bulk actions.
4. Add non-destructive draft persistence, deletion lists, modifications, backups, recovery, validation, runtime publishing, and JSON exports.
5. Apply published overrides after normal deterministic world generation.
6. Verify menu launch, editing workflows, persistence/reload, validation/export, playtest restoration, responsive layout, and legacy worlds.
