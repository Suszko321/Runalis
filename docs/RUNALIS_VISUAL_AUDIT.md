# RUNALIS living visual audit and improvement register

Initial assessment: 2026-10-31. Scope: architecture, repository-wide asset
inventory, representative production renders and preservation safeguards.
This is the foundation stage requested by the director; no graphical replacement
or gameplay modification was undertaken. The [Art Bible](RUNALIS_ART_BIBLE.md)
defines future standards. [Evidence and reproduction](art-audit/REVIEW.md) and
[the sheet inventory](art-audit/inventory.md) support this register.

## Architecture and asset ownership

The current game is **Canvas 2D and native JavaScript modules**, not Babylon.js.
The root game is authoritative. `_site` is generated deployment output; `Runalis/`
is historical material. Do not update either instead of root source/assets.
No AGENTS.md instructions were found in the workspace or checked ancestors;
the local `.agents` directory contained no files at assessment time.

| Discipline | Active production paths | Contracts and review surface |
| --- | --- | --- |
| Frame orchestration / depth | `src/render.js`, `objectRenderer.js`, `worldArtDirection.js` | Terrain, ground dressing, behind effects/loot, depth-sorted actors/props, overheads, front tells and presentation |
| Loading / registration | `spriteArt.js`, `modelRegistry.js`, `enemyVisualProfiles.js` | Shared image cache, readiness/failure records, generated tint variants, renderer fallbacks; metadata is not universally read at runtime |
| Humanoids | `humanRenderer.js`, `spriteArt.js`, `humanIdentityArt.js`, `humanoidEnemies.js` | Retained 64 × 80 player cells and rig; NPC/humanoid enemy sharing |
| Equipment | `equipmentArt.js`, `factionEquipmentArt.js`, `armorMotionArt.js`, `headArt.js`, `handedness.js`, `sheathedWeaponArt.js` | Body masks, torso/leg fitting, wrists, left weapon/right shield, facing-aware depth, bounded variants |
| Animation | `playerAnimationController.js`, `playerAttackAnimation.js`, `animationProfiles.js`, `locomotionProfiles.js`, `humanLocomotionRig.js`, `meleeRig.js`, `enemyAttackPresentation.js` | Samples authoritative state; painting must not retime mechanics |
| Creatures / summons | `spriteArt.js`, `summonArt.js`, `companionSpriteArt.js`, `petalknightSummonArt.js`, `lichSummonArt.js`, `faeSummonArt.js` | Multiple purposeful sizes and frame contracts; not all are directional humanoids |
| Dedicated dungeon/boss figures | `dungeonCharacterSprites.js`, `blightedGroveArt.js`, `ashenOrchardArt.js`, `veyreignArt.js`, `malakarRenderer.js` | 60 × 80 dungeon/royal/bat exports coexist with larger atlas and procedural bosses |
| Terrain / biomes | `terrainRenderer.js`, `echorynRenderer.js`, `orrakaiRenderer.js`, `continentRenderer.js`, `authoredLandscapes.js` | 32-unit world tiles, native cached ground, walls, roads, water, regional dressing |
| Props / architecture | `propArt.js`, `environmentArt.js`, `nativeSceneryArt.js`, `worldAtmosphereRenderer.js`, `questObjectArt.js` | Raster families plus native procedural scenery; interaction geometry belongs to world systems |
| VFX / atmosphere | `combatVisualsRenderer.js`, `combatArt.js`, `persistentGroundArt.js`, `skillPresentationRenderer.js`, school-specific `*Art.js`, `presentationRenderer.js` | Hybrid raster effects, curves, soft lights and specialized school forms; behind/front layer ownership matters |
| HUD / menus / portraits | `ui.js`, `splitScreenHud.js`, `artIcons.js`, `combatTechniqueIcons.js`, `skillTreeIconArt.js`, `dialoguePortrait.js`, `hudPortrait.js`, `lexiconPresentation.js`, root CSS | Canvas + DOM/SVG/raster icons; independent local player menu and mobile/controller paths |
| Packaging | `tools/prepare-pages.mjs`, `package.json` | esbuild startup bundle; path/case verification; local sources/masters/docs excluded |

Production exports live in `assets/art/sprites`; masters/prompts in
`assets/art/source` and reference work in `assets/art/reference`. Also inspect
`assets/environment`, `assets/combat-icons`, `assets/skill-tree-icons` and
`assets/ui`, including packaged fonts. Packing/build tools already exist under
`tools/pack-*.py` and `tools/build-*.py`/`.mjs`. Keep their per-family contracts.

The retained [coverage manifest](visual-production/manifest.csv) indexes code-drawn
visuals and semantic asset uses. It is a historical inventory, not proof that all
of today's content has final art. Do not run its updater just to change statuses.

## Measured baseline and preserved strengths

- 341 top-level source files; 671 files under `assets`, including 234 PNGs
  (case-insensitive extension count), 308 SVGs and four WebP files. These totals
  include source, preview and support files; they are not runtime download totals.
- 65 sprite metadata files resolve to 71 runtime sheets and 1,786 allocated cells,
  including the aggregate dungeon manifest and three code-defined sheet contracts.
- All declared sheet dimensions and inspected sprite rectangles pass. No missing
  runtime sheet was found by the new structural checker. Two allocated canopy
  cells are intentionally unused, not invisible production characters.
- Eight player locomotion/attack/bow/cast PNGs match the preservation hash baseline.
  The approved player is stored in **64 × 80** cells; the requested **60 × 80**
  standard is an unresolved reference/export discrepancy, not a resizing task.
- Player anatomy, wearable fitting and four-direction identity are the primary
  references. Main creature clusters, Orrakai material planes, Echoryn tree masses
  and the desktop Lexicon material language offer strong supporting references.
- Ten groups contain identical bytes: nine master/export pairs and six shared
  expertise SVGs in one group. The former preserve provenance and are not runtime
  duplication bugs. The expertise symbols warrant semantic review before removal.

These are inventory/structural findings. They do not certify every scene, ability,
item, quest, animation transition, late-game state or display configuration.

## Severity and closure rules

**CRITICAL:** missing/broken/invisible required visuals, destructive dimensions,
major animation failure or a severely incompatible style preventing coherent play.
**HIGH:** significant proportion/pixel-density/readability/style or unfinished-art
problems. **MEDIUM:** transitions, shading, repetitive surfaces or incomplete polish.
**LOW:** subtle decorative/lighting refinements without a material readability cost.

An entry distinguishes a confirmed observation from a risk requiring verification.
No global absence of critical defects is claimed. None was established in the
sampled runtime loading/crop paths. Close entries with actual-scale evidence and
relevant regressions, not because the file exists or a numeric check passes.

## Prioritized register

| ID | Severity | Status / evidence | Finding and correction boundary | Acceptance |
| --- | --- | --- | --- | --- |
| ART-001 | HIGH | Open; confirmed code/metadata discrepancy | Required 60 × 80 reference vs retained 64 × 80 player and legacy rig. Reconcile authoring/export policy with director before any player-format migration. Interim preservation rule is established in the Bible. | Explicit reference/export decision; unchanged identity, grips, origin, equipment and gameplay scale; all directional/action comparisons |
| ART-002 | HIGH | Open; visual review + source confirmed | Newer dungeon figures and Veyreign forms have much flatter, more geometric clusters than the detailed player. Compare Tamsin's tall narrow face/robe construction and simple wings with player anatomy/shading. Rework one affected family at a time; preserve Mother/Custodian/royal identities. | Native-scale in-scene comparison with player, stable state rows/feet and supported dialogue/boss transitions; no quest/combat changes |
| ART-003 | HIGH | Open; confirmed sampling conditions, visual impact needs motion review | Fractional scaling remains in `environmentArt.js`; bat draws 60 × 80 to 72 × 96 (1.2×); companions use .75×/1.25×; co-op camera zoom resamples. Nearest sampling prevents blur but not uneven pixel widths. | Compare moving scenes and supported co-op zooms; fix the relevant family using native exports or deliberate integer presentation without changing footprints or fitting |
| ART-004 | HIGH | Open; edge risk confirmed, clipping extent unverified | Mother touches source cell top/edges in five idle cells; royal beast touches cell edges in many states, and bat death reaches bottom. Inspect full cycles for clipped antlers, wing tips or intentional ground collapse before repacking. | All extremities deliberately contained or intentional edge contact documented; state/pose continuity, original pivot and scale retained |
| ART-005 | MEDIUM | Open; narrow desktop creator layout observed | At 390 × 844 desktop-window resize, class dossier is squeezed beside the roster: narrow multi-column facts and crowded morph cards impair reading. Touch recommends landscape and offers a portrait fallback; fresh touch captures fit the dossier without overflow in both orientations. Do not infer a touch defect from desktop resizing. Inspect responsive rules in `creator-class-information.css` and `fullscreen-menus.css`. | Supported touch orientations and narrow desktop; readable complete facts/morphs; reachable Back/Continue; scrolling and controller navigation preserved |
| ART-006 | MEDIUM | Open; confirmed native screenshots | Quiet procedural continent/road/water surfaces and some flat dressing patches have markedly simpler edge/material treatment than dense Orrakai masonry and forest exports. Some sampled frontier scenes are sparse. Verify intended area use before enriching or replacing. | Regional comparison at normal scale; softer material transitions and coherent density; unchanged travel/interaction geometry and bounded caches |
| ART-007 | MEDIUM | Open; confirmed lab implementation defect | `art-lab.html` calls `drawEnemySprite` directly, bypassing humanoid routing; demonCultist, roadlessBandit and archer slots can be blank. Its long weapon list also overlaps the following section. This is review-page drift, not evidence those live enemies are missing. Use `enemy-visual-lab.html` for current humanoid review. | All labeled lab examples visibly render through the production route; sections do not overlap; no competing runtime renderer |
| ART-008 | MEDIUM | Open; representative combat observation | Crowded test packs stack nameplates and damage/status feedback; wellspring has a large soft ring beside crisp actors. A single effect frame cannot establish fairness under hostile overlapping tells. Review effects with danger boundaries and actual co-op encounters. | Player, attack direction and hostile area readable during representative peak overlaps/night; effect intensity and lifetimes remain purposeful |
| ART-009 | MEDIUM | Open; motion/coverage risk | Older creature rows and generated material families use a small pose vocabulary while newer dungeon sheets contain 16 cells/state and royal sheets 48. Counts alone do not imply animation quality. Full transition/interrupt/equipment matrix still needs issue-specific visual review. | Actual-speed loops, interruption/repeated inputs, foot/grip stability and death/recovery; no mechanics retiming |
| ART-010 | LOW | Open; shared identity confirmed | Six expertise-base SVGs are byte-identical. Determine whether their shared base emblem is intentional; do not remove referenced filenames or provenance copies. | Recognizable skill semantics at HUD/menu size, or documented intentional shared emblem; paths retained |
| ART-011 | MEDIUM | Addressed for initial baseline | The old `verify-atlases.py` assumes every metadata file has the same grid schema, every cell is occupied, and all alpha is binary. It cannot validate today's aggregate dungeon/royal/petal formats correctly. Added `verify-art-foundation.py` with explicit adapters and context-sensitive warning reporting; original specialized checkers remain. | 71 sheets inspected, source/cell crops valid, player hashes pass; intentional exceptions interpreted below |
| ART-012 | LOW | Addressed | Art direction was distributed across multiple dated reports with inconsistent engine and dimension assumptions. Established canonical Bible, this register, measured inventory and preservation hashes; linked historical guides forward. | One discoverable governing document; historical evidence retained |
| ART-013 | HIGH | Conservative gap fill implemented; rejected redesign remains reverted | Filled the small missing waist backing from existing tinted trouser pixels and stopped the equipment glove mask cutting valid trouser rows. Only two drawing modules changed; the original sheets, palette, proportions, frame sequence, rig and timing remain. Broader animation redesign is outside this revised task. | [Conservative repair](art-audit/WAIST_GAP_FILL.md): 512 browser comparisons only add missing coverage; all previously opaque pixels and pixels outside the repair area match the original. [Rejected-pass rollback](art-audit/REVERTED_WALKING_PASS.md) remains recorded. |
| ART-014 | MEDIUM | Bat Beast replacement implemented; visual review recorded | Replaced ordinary Bat Beast geometric art with the requested charcoal/crimson bat-pterosaur, inspired by existing summon cluster treatment. 24 authored poses held in the original six-state/sixteen-slot sequence; wider 96×80 source cells and facing mirroring localized to its renderer. | [Artwork and evidence](art-audit/bat-beast/README.md): 96 crop contracts, binary alpha, shared 32-color palette, padded extremities, production draw capture, engineering/build and Veyreign suites pass. Royal boss/player/combat untouched. |
| ART-015 | MEDIUM | Royal Bat Beast replacement implemented; encounter inspected | Replaced the crowned humanoid placeholder with an evolved red/black beast with narrow gold trim: heavy chest/mane, two wing pairs, long fangs and talons; no crown. 28 authored poses across seven original state rows, 112×80 cells, retained boss timing/scale policy. | [Report/captures](art-audit/royal-bat-beast/README.md): padded binary-alpha cells, 32 colors, native summon preview, 327 visible crop contracts/nine hidden slots, actual boss transformation/save/waves/compact browser test, engineering/build and Veyreign suites pass. Future summon gameplay remains separate. |

Recommended order: settle ART-001's contract language; investigate ART-004's
potential clipping; then ART-002's affected family, paired with ART-003's
pixel-scale review. Follow with combat readability, supported-layout readability,
motion, environment transitions and optional icon differentiation. A specific
director-reported defect can take precedence. The initial assignment deliberately
does not execute that whole replacement backlog.

## Exceptions verified instead of misclassified

- `echoryn-canopies` cells 3 and 7 are blank; `NATIVE_CANOPIES` selects only
  0, 1, 2, 4, 5 and 6. Keep them as spare grid space.
- `terrain-core` reaches its cell edges because it is an opaque repeating surface.
  Applying character padding rules would create seams.
- Ordinary and royal Bat Beasts now use binary-alpha collapse/corpse sequences
  (ART-014/015). Their old intentional death fades have been replaced with authored
  collapse poses; do not classify the historical partial alpha as bilinear filtering.
- Petalknight metadata records **cell-local** `spriteRects`; older creature
  metadata records **atlas-space** rectangles. The new validator adapts both.
- Different canvas sizes alone do not indicate incorrect density. Visible pixels,
  sampled output size, intended anatomy and world context determine that finding.
- Missing source masters on another checkout need not break the runtime. The
  structural gate requires shipped exports, not ignored authoring directories.

## Maintenance

Keep IDs stable. For each reported issue record trigger/location, cause,
patch/redraw/replace decision, paths, compatibility constraints, actual-scale
evidence, relevant checks and residual limits. Update the Bible only for a
deliberate reusable convention. Preserve the original player's identity and ask
for direction before major boss/faction/story design changes. Do not silently
change baselines to make validation green.
