# Complete Art Direction and Model Overhaul — Implementation Report

Date: 2026-07-22

## Outcome

Runalis now has a coherent, enforceable procedural-model pipeline rather than a collection of permissive drawing routes. The overhaul preserves the game's deterministic Canvas technology and stable gameplay IDs while adding art governance, failure policy, visual identity, editor inspection, and world-wide validation.

## Implemented systems

### Asset change summary

- Added: 106 registry contracts, four faction palettes, two runtime surface treatments, and reusable faction/profession character overlays.
- Replaced: 118 canonical gray-diamond substitutions with intentional Emberleaf, River Reed, and Lantern Moss visuals; replaced the permissive unknown-enemy substitution policy.
- Removed: no gameplay or save-critical assets. Invalid production fallbacks were removed from the runtime path, not from saved world data.

### Canonical model registry

`src/modelRegistry.js` is the single visual contract for runtime objects, NPCs, enemies, bosses, structures, resources, surfaces, and hidden logic. It defines 106 model records, a material library, complexity budgets, aliases, scale ranges, collision expectations, runtime visibility, and production validity.

Aliases are visual only. For example, River Reed shares the reed renderer and Shield Knight shares the Gravebound family without changing either gameplay kind.

### Strict fallback policy

- Registered art renders normally.
- Unknown, broken, or placeholder art is omitted in production.
- Developer Mode replaces invalid art with a magenta-and-black checker marker labeled by model ID.
- Unknown enemies no longer silently appear as Hollowlings.
- Intentional logic objects remain hidden in play.

### Placeholder migration

Emberleaf, River Reed, and Lantern Moss were connected to intentional flora renderers. This removes 118 visible generic placeholders from canonical Echoryn.

### Character and NPC identity

The shared humanoid renderer now supports independent faction and profession overlays. Covenant and Last Dawn identities are readable through mantle/sash construction, insignia, material, and palette. Smith, healer, merchant, guard, scholar, and laborer roles add practical silhouette cues.

Last Dawn detection corrects legacy cult-facing metadata visually without mutating quest or save identifiers.

### Roads and water

Developer-authored runtime paths now use an edge/body/highlight/groove stack instead of a single flat stroke. Runtime water volumes now include wet shore, material body, planar facets, animated ripples, and a separate rotted-contamination treatment.

The existing seamless terrain system for generated worlds was retained because it already provided strong roads, rivers, lakes, bridges, forests, cliffs, and ruin fields.

### Developer Mode

Asset records now expose model ID, renderer ID, material set, visual status, and production validity. Search includes those fields. The asset browser contains filters for:

- Missing Model
- Placeholder
- Broken Material
- Wrong Scale
- No Collision
- Duplicate Asset
- Hidden Logic Object
- Production Invalid

The inspector shows the selected entity's model/material status. World validation merges art errors and warnings with existing structural validation.

## Validation results

- Syntax checks passed for every modified module.
- Twelve deterministic launch configurations were generated and audited.
- 12,194 raw object instances and 1,335 raw enemy instances were checked, including two deliberate repeat views of Echoryn.
- Result: zero missing models, zero broken materials, zero production-invalid visible assets, and zero scale/collision warnings in generated content.
- Distinct-map coverage after removing repeated POI views: 4,286 objects and 693 enemies.
- Browser QA passed for the main menu, Developer Mode setup, Orrakai editor view, Echoryn editor view, art-status inspector, Missing Model filter, Hidden Logic Object filter, and the compact editor breakpoint.
- The Missing Model filter returned no production assets; the Hidden Logic Object filter returned only intentional editor systems.
- A case-sensitive dialogue module import mismatch discovered during startup QA was corrected, and static asset/module URLs were versioned so the current build cannot be masked by stale browser assets.

## Compatibility

- No gameplay IDs were renamed.
- No quest, dialogue, encounter, reward, collision, or save schema was replaced.
- Model aliases and faction resolution are art-facing only.
- The new registry is side-effect free and safe to import in Node-based validation.

## Files changed

- `src/modelRegistry.js` — new canonical registry, material library, budgets, resolution, and validation
- `src/objectRenderer.js` — strict model policy, flora migrations, NPC identity metadata, Last Dawn/Covenant resolution, upgraded editor paths and water
- `src/render.js` — strict enemy fallback policy and Developer Mode missing-model marker
- `src/humanRenderer.js` — faction and profession identity overlays
- `src/visualStyle.js` — canonical faction palettes and global art rules
- `src/developerEditor.js` — art metadata, filters, inspector status, and visual status styling
- `src/developerWorldPersistence.js` — art validation integrated into editor validation/publishing
- `src/main.js` — corrected exact dialogue UI module casing found during launch QA
- `index.html` — versioned stylesheet and module entry URLs for reliable visual deployment
- `docs/art/ART_DIRECTION_BIBLE.md` — canonical art direction
- `docs/audits/VISUAL_ASSET_AUDIT.md` — audit and coverage record

## Recommended next art production pass

The pipeline is now ready for content-specific refinement. The highest-return next pass is a landmark silhouette pass for the Ruined Chapel, Ashen Orchard, Castle Veyr, and each regional gate, using the registry's existing structure categories and budgets. That work can add unique geometry without reopening fallback, material, or validation problems.
