# Runalis Visual Asset Audit

Audit date: 2026-07-22  
Scope: all twelve Developer Mode launch configurations and all shared runtime render routes

## Executive finding

Runalis was not visually primitive. It already contained a large code-drawn art stack for humanoids, equipment, enemies, bosses, terrain, structures, combat effects, and environmental atmosphere. The weakness was governance: no canonical model registry, permissive fallback art, inconsistent faction identity, and no art-specific editor validation.

The audit found three live object kinds that reached a generic gray diamond fallback in the canonical Echoryn world:

| Kind | Canonical instances | Previous state | Resolution |
|---|---:|---|---|
| Emberleaf | 103 | gray diamond fallback | dedicated rare-flora rendering and registry entry |
| River Reed | 11 | gray diamond fallback | intentional reed renderer alias and registry entry |
| Lantern Moss | 4 | gray diamond fallback | dedicated rare-flora rendering and registry entry |
| **Total** | **118** | visible placeholder substitutions | **0 remaining** |

Unknown enemy kinds previously borrowed the Hollowling renderer. That substitution is now prohibited.

## Existing strengths preserved

- Modular humanoid renderer with four facings, equipment layering, class posture, cosmetics, animation poses, and ground anchoring
- Large procedural gear and summon library
- Distinct enemy and boss renderers
- Seamless terrain features for roads, rivers, lakes, forests, cliffs, ruins, bridges, and biome fields
- Authored major-POI structures and architecture profiles
- Central class, biome, material, effect, and UI palettes
- Deterministic generation suitable for testing and save stability

## Registry inventory

The new canonical registry contains 106 procedural model contracts.

| Category | Registered models |
|---|---:|
| Bosses | 5 |
| Enemies | 15 |
| NPC base system | 1 |
| Structures | 23 |
| Vegetation and flora | 25 |
| Props, resources, and interactables | 30 |
| Intentional logic-only objects | 7 |
| **Total** | **106** |

Each model contract records its category, renderer, `code://` model path, material set, collision profile, culling/LOD policy, editor glyph, tags, scale range, shape budget, draw-call budget, animation sample rate, runtime visibility, and production validity.

### Before and after

| Measure | Before | After |
|---|---:|---:|
| Centrally governed model contracts | 0 | 106 |
| Canonical Echoryn objects using generic placeholder art | 118 | 0 |
| Unknown enemy kinds silently borrowing a production model | Allowed | Prohibited |
| Art-specific Developer Mode filters | 0 | 8 |
| Intentional logic-only categories formally classified | Ad hoc | 7 |

## World-wide validation

The automated sweep covered 12 launch configurations. Ashen Orchard and Ruined Chapel are alternate spawn views into Echoryn and therefore intentionally repeat that world in the raw sweep.

| Configuration | Objects | Enemies | Art errors | Art warnings |
|---|---:|---:|---:|---:|
| Orrakai | 152 | 0 | 0 | 0 |
| Echoryn | 3,954 | 321 | 0 | 0 |
| Ashen Orchard view | 3,954 | 321 | 0 | 0 |
| Ruined Chapel view | 3,954 | 321 | 0 | 0 |
| Castle Veyr | 46 | 113 | 0 | 0 |
| Aureate Marches | 14 | 4 | 0 | 0 |
| Ascension Wastes | 12 | 4 | 0 | 0 |
| Pilgrim Road | 5 | 6 | 0 | 0 |
| Hollow Root Cellar | 47 | 102 | 0 | 0 |
| Shattered Choir | 53 | 143 | 0 | 0 |
| Test Arena | 2 | 0 | 0 | 0 |
| Empty Sandbox | 1 | 0 | 0 | 0 |
| **Raw sweep total** | **12,194** | **1,335** | **0** | **0** |

Excluding the two repeated Echoryn POI views, the sweep represents 4,286 object instances and 693 enemy instances across distinct generated maps.

## Logic-only classification

The following are intentional editor/runtime logic and remain invisible during play: trigger, spawn, light, audio, weather, navigation blocker, and POI marker. Editor paths and water are not logic-only; they have authored runtime visuals.

## Faction and NPC finding

The Covenant already had a palette branch. The Last Dawn did not, and several Last Dawn characters inherited legacy cult-facing data. Visual resolution now recognizes faction through explicit visual faction, gameplay faction, authored ID, name, and role. This preserves stable quest/save identifiers while giving the Last Dawn a distinct dark-cloth, iron, broken-dawn identity rather than grave-magic purple.

NPC profession data was visually underused. Smith, healer, merchant, guard, scholar, and laborer overlays now add readable occupational silhouettes without requiring unique full-body renderers for every minor NPC.

## Remaining art risks

- The system is code-drawn, so visual richness depends on disciplined reuse of the registry and art bible rather than external asset-import tooling.
- Many authored variants share base procedural renderers. Future landmark work should prioritize silhouette-changing parameters, not extra color variants.
- Animation remains pose-driven rather than skeletal. It is appropriate for the current presentation, but complex cinematic acting will need a dedicated authored pose/timeline layer.
- The duplicate-asset filter exists for future imported or duplicated model records; the current canonical registry contains no duplicate production model paths.

No raster or procedural asset file was deleted. The existing main-menu illustration remains a presentation asset; runtime world art continues to be code-drawn.
