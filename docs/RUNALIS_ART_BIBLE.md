# RUNALIS Art Bible

Established 2026-10-31. Applies to new art and subsequent corrections. The approved
player identity, gameplay behavior, authored faction designs and story symbolism
remain protected. This consolidates the existing [player-led direction](world-art/ART-DIRECTION.md),
[production bible](visual-production/ART-BIBLE.md) and [humanoid fitting work](humanoid-art-style/README.md).
Those documents remain historical evidence; this document controls future visual
conventions. See the [living audit and correction order](RUNALIS_VISUAL_AUDIT.md).

## 1. Identity and reference hierarchy

RUNALIS is grounded dark-fantasy pixel art: earth, ash, timber, bone, worn iron,
restrained brass, legible clothing planes and selective magical brilliance.
Its strongest reference is the existing player: compact expressive anatomy,
dark stepped contours, connected material clusters and readable fittings.
Environmental richness must support that actor rather than overwhelm it.

Use these references in order:

1. `assets/art/sprites/human-male.png` and `human-female.png`, then their attack,
   bow and cast sheets. Preserve appearance customization and modular equipment.
2. Production humanoid equipment in `humanRenderer.js`, `factionEquipmentArt.js`,
   `humanIdentityArt.js` and `equipmentArt.js`. Review on the player body, not a
   separately invented mannequin.
3. Main creature sheets, especially `enemies-core`, `enemies-blighted` and
   `bosses-act1`: useful cluster/material references, with individual silhouettes
   and dense boss detail still subject to review.
4. Orrakai stone/timber/practical lighting and Echoryn's clustered tree masses,
   inspected with actors at normal gameplay scale. Existing canopy transparency
   and building cutaways are functional readability treatments.
5. The Lexicon interface's ink, vellum and brass treatment, with the existing
   class icon and control semantics preserved.

Reference quality applies to those strengths, not every asset or every state in
the same sheet. Local review images are indexed in [the evidence report](art-audit/REVIEW.md).

## 2. Dimensions, pixel density and registration

**The director's primary humanoid art reference is 60 × 80 pixels.** Investigation
does **not** establish that the current player uses that storage format:

| Contract | Verified implementation | Rule |
| --- | --- | --- |
| Approved player export | 64 × 80 cells, 4 columns × 4 directional rows; each sheet 256 × 320 | Preserve original bytes and current rig |
| Player art occupancy | Neutral south-facing silhouettes approximately 63–64 pixels tall | Judge ordinary humanoids against this visible stature, not canvas height |
| Player metadata pivot | `[32,74]` | Metadata convention; not a new actor origin |
| Actual player full-cell draw | Source 64 × 80; destination starts at `(-32,-56 + bob)` | Pixel at source y=74 lands at actor y=18 + bob |
| Actor depth anchor | `actor.y + 18` in `WORLD_ART_STANDARD` | Preserve shared ordering and collision references |
| Newer dungeon family | 60 × 80 cells; 16 columns × 6 state rows | Family-specific source origin `(-30,-76)`; NPC 1×, Mother/Custodian 2× |
| World tile | 32 world units; native scale 1 raster pixel/world unit | Not a universal sprite canvas |

The 60/64 discrepancy is an **open contract reconciliation**, not permission to
shrink the approved player. There is no evidence that its four extra columns are
an officially approved 60-pixel wrapper. Do not crop, compress or rename those
exports, rewrite wrist landmarks, or change world scale to satisfy a number.
For a new humanoid, use the requested 60 × 80 art reference; inspect its intended
renderer before export. If it needs the legacy rig, explicitly register it into
that rig's 64 × 80 export and validate feet, head, hands and every direction.
A player-format migration or identity change requires director direction.

Ordinary NPCs and humanoid enemies should retain the player's head/torso/limb
relationships and perceived pixel size. Existing intentional stature differences
are valid. Bosses, beasts, architecture and trees use purpose-sized canvases.
Never change hitboxes or walking clearance just to fit new art.

## 3. Pixel craftsmanship

- Build connected clusters; each highlight, fold and crack must describe form.
  Favor three or four principal values per material, with selective accent pixels.
- Use predominantly one native pixel of near-black outer ink, selective internal
  seams, and thicker connected shadow masses only where form requires them.
- Use stepped silhouettes and intentional diagonals. Avoid isolated noise,
  photographic microtexture, fuzzy edges and random checkerboard shading.
- Highlight upper-left planes; cool/darken recesses. Do not rotate baked lighting
  independently of the world. Metal gets narrow bright glints; cloth stays matte.
- Raster sprites require nearest sampling and snapped draw origins. Keep movement
  simulation continuous. Do not quantize collision positions or camera logic.
- Prefer native-sized scenery and integer enlargement for new raster figures.
  Existing fractional object fitting, articulated rotations and adaptive co-op
  zoom are compatibility exceptions to review in motion, not blanket approval
  for arbitrary rescaling. Nearest sampling alone cannot ensure even pixel widths.
- Silhouette edges normally have alpha 0 or 255. Deliberate whole-effect opacity,
  death dissolves, canopy fading and soft practical lights are valid exceptions.
  No blurred resampling of the underlying figure.
- Broad lighting transitions may be soft. Material shading and effect cores
  should remain clustered; avoid gradients that erase pixel structure.

## 4. Color direction and materials

`src/visualStyle.js` owns shared and class rules; `environmentVisualStyle.js`
owns regional atmosphere. Consult specialized class/subclass renderers too.
Do not replace these with a restrictive universal palette.

| Role | Direction |
| --- | --- |
| World | Quiet olive/moss, weathered brown, ash-grey stone; cool near-black recesses |
| Skin / hair | Existing customizable warm ramps; retain ink and face readability |
| Cloth / leather | Connected folds and plane changes; warm restrained leather, clear belts |
| Iron / steel / brass | Dark seams, cool steel, sparse warm fittings; avoid uniformly glowing armor |
| Bone / bark / foliage | Warm ivory, branched timber, shaded leaf masses; distinct connected clusters |
| Oathkeeper / holy | Ivory, white, silver and gold, pale yellow light |
| Fellhunter | Leather/steel/dark cloth, smoke and red-orange practical fire |
| Gravecaller | Purple/black; do not recolor necromancy green |
| Thornbinder | Dark green/bark, muted amber-gold and restrained rose accents |
| Waverider | Blue/cyan/teal/white water and mist |
| Eldritch | Black/red; no accidental purple/blue/green school reassignment |

Existing authored subclass and boss symbolism takes precedence over keyword
guessing. Blood/crimson, rose and corruption identities must retain their own
registered designs. Color alone cannot distinguish allies, threats or schools:
combine silhouette, motion, boundary and symbols.

Ground has lower contrast than upright subjects; interactables, actors and
hostile boundaries carry stronger readable accents. Reserve peak brightness for
brief impacts and important state. Night cools ambient light while warm practicals
remain local. Verify faces, ground hazards and paths in night/dungeon conditions;
do not solve darkness with universal bloom or saturated outlines.

Orrakai uses olive stone/timber and brass practicals; Echoryn uses moss, bark and
burial weathering. Wet fen regions favor reeds and damp timber; Aureate areas use
pale masonry/gold; imperial construction keeps its red roofs; cosmic regions use
fractured geometry. Keep common contour, scale and lighting conventions across
them. Terrain/atmosphere code already provides more nuanced regional ramps.

## 5. Characters and equipment

Keep the compact player's generous head mass, readable hands, connected waist
and grounded boots. Compare overlays against both actual body types and all four
directions rather than prescribing a new anatomical ratio. Clothes must fit that
body; legwear cannot introduce another pelvis or baked second pair of limbs.

Weapons and shields follow the anatomical ownership and wrist landmarks in
`handedness.js`, `meleeRig.js` and `humanLocomotionRig.js`. Preserve sheath timers,
near/far layering, free arms, headgear masks, skin tint and cloak collar anchors.
Check partial/mixed gear as well as full sets. Never bake modular weapons into
the base body. Preview and dialogue portraits must preserve the character's identity.

Enemy roles should read from equipment and stance: ranged reach, caster focus,
guard/shield and heavy mass. Preserve creature anatomy; do not impose humanoid
proportions on wolves or rooted monsters. Boss scale must communicate mass while
keeping the player and tell visible. Existing viewport-dependent boss fitting is
a review constraint, not authority to redesign bosses.

## 6. Environment

The view is top-down/2.5D with visible facade height and ground-depth sorting.
Keep a consistent ground plane, roof/facade projection and upper-left light.
Terrain tiles are 32 units; `terrain-core` stores 64 × 64 texture patches sampled
in 32-pixel quadrants or repeated as patterns. Native scenery, town geometry and
forest caches have separate established contracts; reuse them.

Doors must visibly admit the retained player; previous facade guidance allows
up to 68 native pixels of clearance. Validate at actual entrances. Chairs, beds,
tools and wagons must relate to the player; do not derive their scale from atlas
canvas size. Mature trees can span several humanoid heights. Keep recognizably
branched trunks, clustered foliage, believable root contact and quiet floor detail.

Use dark, restrained ground-contact shadows without baking a second shadow into
sprite exports. Ground dressing belongs below actors, hazards and loot; tree,
prop and actor depth uses existing ground anchors. Preserve cutaways, canopy
fading and room collision. Keep roads, waterbanks and biome transitions readable,
with material edge breakup instead of conspicuous pasted rectangles.

Decoration should establish culture, use, damage, faith or ecological history.
Cluster props around plausible activity; protect traversable space, interactables
and combat sightlines. More clutter is not automatically more finished art.

## 7. Animation

Preserve the existing clocks and combat event windows. Player locomotion uses
four authored directional gait cells plus the existing sampled rig; walk/run
profiles determine weight and foot holds. Older documentation's 8 fps is not a
universal playback law. Dungeon characters use nominal 12 fps/16 cells, with
anticipation, execution and recovery sampled from authoritative combat phases.
The royal beast has 48 cells per state. Repeated held cells can be intentional.

The attempted eight-pose humanoid replacement was rejected and reverted. Future
walking work must retain the existing palette, body volume and clothing design,
and use a simple, approximately three-frame pixel-art sprite-sheet cycle as
directed by the user. Technical checks do not establish artistic acceptance.
For the subsequent conservative gap-fill assignment, retain the current frames
and movement exactly; patch missing coverage using existing artwork and colors.

Use a readable anticipation pose, committed contact, follow-through and a clear
recovery. Heavy forms carry more mass; mobile forms keep light directional intent.
Idle movement should preserve boot registration; locomotion should avoid sliding
feet and changing torso volume. Keep animation roots, proportions, hands and gear
stable across direction changes. Hurt should register quickly; death must not
erase living telegraphs or advance simulation state.

Review whole loops and actual-speed transitions: idle/walk/run, first and repeated
attacks, charge/release, block/cast, hit interruption, dodge, death and resumption
where supported. Check rapid input and overlapping effects. Add frames only to
solve a visible pose/timing problem. Do not retime damage, movement, cooldowns or
invulnerability for an animation correction.

## 8. VFX

Use a strong core, clear travel direction/area and deliberate decay. Pixel cores,
stepped fragments and restrained trails should match the actor's detail scale.
Soft lights/opacity can frame these forms; they must not replace them. Prefer
coherent bursts and readable arcs over particle quantity.

The shared effect paths are `combatVisualsRenderer.js`, `combatArt.js`,
`skillPresentationRenderer.js` and specialized school modules. Persistent grounds
use the existing behind layer and fine gameplay-radius boundaries. Retain existing
effect lifetimes, damage radii, release events and projectile trajectories.

Hostile tells must remain recognizable through allied casts, floors, darkness,
canopies and co-op. A boss needs a distinct anticipation silhouette and danger
boundary, recognizable signature impact and controlled phase/death presentation.
Do not paint a larger apparent safe/damage area than the gameplay shape.
Avoid full-screen opaque flashes and long-lived bright residue over the player.
Reuse culling/caches; do not allocate unbounded particles or add per-object lights.
No universal effect-intensity control was established in this audit. Extend an
existing setting only if a concrete effect task warrants it, keeping danger cues.

## 9. Interface

Preserve ink panels, vellum reading surfaces, restrained brass edges and existing
Cinzel/EB Garamond roles in the Lexicon presentation. HUD numerals and descriptions
must remain readable at actual display size; normal text antialiasing is allowed.
Use size, value and spacing for title/body/secondary hierarchy. Aim for body copy
of at least 14 CSS pixels; review existing smaller labels rather than shrinking
essential information to make a panel fit.

Icons need a recognizable shape at the actual slot size. Shared material-family
icons are currently supported but are not evidence of unique item illustrations.
Preserve focus/hover/selected/disabled states, labels, status symbols, health/mana/
stamina semantics and device-specific prompts. Never rely on red/green alone.
Menus must scroll or reflow at small heights without hiding controls beneath
previews. Review desktop, narrow touch view and controller focus.

Co-op retains independent actor identity, player colors/markers, local menu
ownership, downed/revive feedback and shared/split viewport behavior. Preserve
those interactions when adjusting HUD art or adaptive zoom.

## 10. Production and acceptance

1. Trace the asset's consumer, frame selection, dimensions, pivot, equipment,
   depth and fallback behavior. Record the issue in the living audit.
2. Choose patch, redraw or replace based on the actual defect. Preserve approved
   player/boss/faction identity; ask for direction before changing those designs.
3. Keep masters/prompts/rebuild instructions separate from runtime exports. Use
   the existing shared `asset()` cache and family renderer, not another loader.
4. Validate exact paths/case, sheet geometry, cell content, source rectangles and
   intentional alpha exceptions. Retain atlas indices and state/frame mappings.
5. Inspect native-scale production renders with neighboring actors/environment,
   then enlarged pixels. Review animation in motion and with representative gear.
6. Run only relevant existing gameplay/render checks. Compare actor state and
   collision/timing data when touching their rendering interfaces. Measure load,
   cache or draw cost if the change adds material work; compare equivalent scenes.
7. Record evidence and remaining limits. Close an audit entry only when its
   acceptance criteria are met; structural success is not artistic approval.

Baseline tool: `tools/verify-art-foundation.py` (Pillow, no new runtime dependency).
It checks all current sprite metadata formats, code-defined sheets and eight
protected player exports. It reports edge/alpha/duplicate candidates for review;
it does not declare them all defective. Browser evidence and reproduction details
are in [art-audit/REVIEW.md](art-audit/REVIEW.md).

## Cross-class boss armory · November 1

Equipment theme does not impose a starter-weapon family or class lock. The Rose Reaper is explicitly a Petalknight-suited scythe; grave mauls, sacred spears, infernal bows and physical leather/vellum grimoires extend that principle. New equipment must read on the actual player rig and share its inventory/held art. Each focus needs an individually recognizable projectile silhouette, not merely a color swap. [Boss armory art, exact prompts, exports and production-renderer evidence](boss-armory/README.md).
