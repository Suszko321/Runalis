# Runalis Art Direction Bible

Status: canonical  
Version: `runalis-faceted-v1`  
Rendering medium: deterministic HTML5 Canvas, code-drawn procedural assets

## North Star

Runalis is a readable, stylized low-poly fantasy world translated into a two-dimensional Canvas renderer. Its images are built from broad silhouettes, planar color facets, restrained surface detail, grounded shadows, and sparse emissive accents. The goal is immediate gameplay readability with an original identity—not imitation of any existing game's characters, locations, symbols, models, or textures.

At normal gameplay zoom, the player must be able to answer four questions without a label: What is it? Is it dangerous? Can I interact with it? Which culture or force shaped it?

## Visual pillars

1. **Readable silhouette.** Every character, enemy, resource, and interactable gets a distinct outer contour before interior detail.
2. **Faceted construction.** Forms use two to five planar value groups instead of gradients or noisy texture.
3. **Material honesty.** Matte cloth, rough timber, worn metal, chipped stone, layered water, dry bone, and controlled divine surfaces respond differently in palette and edge treatment.
4. **Deliberate asymmetry.** Broken straps, offset mantles, damaged architecture, and uneven growth make the world feel inhabited and ancient.
5. **Restrained magic.** Emissive color identifies active power, corruption, or divinity. It is not ambient decoration.
6. **Grounded scale.** Characters, doors, roads, vegetation, and props follow registry scale ranges. Monumental objects earn their size through narrative importance.
7. **Environmental truth.** Architecture and props reveal former use, subsequent occupation, and current decay as separate layers.

## Master palette

- Void and outlines: near-black blue (`#050609`–`#151821`)
- World shadows: cool charcoal (`#242833`)
- Neutral stone and metal: desaturated blue-gray (`#555d6a`–`#c8ced6`)
- Ancient paper and ivory: cool warm-white (`#edf0f2`, `#f4eedc`)
- Consecrated gold: muted ochre (`#d5ad55`), never neon yellow
- Warning and mortal fire: burnt orange (`#d86a4a`)
- Immediate danger: weathered crimson (`#c84845`)

Biome colors remain darker and less saturated than characters. Effects may exceed local saturation only at their focal point.

## Materials

The central material library lives in `src/modelRegistry.js`.

| Material | Visual rule | Typical use |
|---|---|---|
| Character cloth | 3 matte value planes | players and civilians |
| Covenant ivory | ivory cloth, worn gold, soft radiance | Covenant officials and field agents |
| Last Dawn iron | soot-dark cloth, iron binding, red-brown remnants | Last Dawn personnel and abandoned sites |
| Grave rot | dry bone, bruised tissue, no wet shine | gravebound enemies and necrotic remains |
| Demon iron | scorched metal with ember seams | cult and demonic threats |
| Ancient stone | chipped planes, seams, restrained runes | ruins, dungeons, shrines |
| Timber / ash wood | broad grain blocks and dark splits | roads, camps, dead growth |
| Living plant / rare flora | compact leaf planes; glow only when magical | vegetation and harvest nodes |
| Clear / rotted water | dark body, shore band, two facet planes, sparse ripples | rivers, lakes, editor water |
| Divine relic | pale stone, muted gold, local bloom | genuinely active sacred objects |

## Character standards

Players use a modular body, outfit, trinket, and weapon stack. Class identity comes from posture, silhouette, equipment, and effect language—not a full-body recolor. Equipment must remain legible in all four facings. Ground shadows anchor actors; weapons obey rear/front layer order.

NPCs share the human rig but receive an identity overlay. Faction and profession are separate layers, allowing a Covenant healer to read as both Covenant and healer.

### Covenant of Light

- Ivory and cream cloth, weathered gold fittings, pale amber light
- Broad shoulder mantle and open-hand/sun device
- Field roles use satchels, bandages, scroll cases, and practical worn hems
- Radiance is soft and local; institutional wealth is suggested, not pristine

### Order of the Last Dawn

- Soot-dark cloth, dull iron, red-brown remnants of a once-brighter dawn
- Asymmetric sash, iron clasp, visibly broken dawn mark
- Repair stitching, archival cases, and reused equipment imply schism and scarcity
- Never shares the purple-black language reserved for grave magic

Legacy data that still calls a Last Dawn character a cultist is corrected visually by authored ID, name, and role detection without changing save-critical gameplay identifiers.

### Professions

- Smith/miner: heavy apron and tool pouch
- Healer: medical satchel with pale practical marking
- Merchant: diagonal trade sash
- Guard/warden: widened shoulder plates
- Scholar/cartographer/clerk: document case
- Laborer/porter: load-bearing harness

## Enemy and boss standards

Enemy families must remain identifiable in grayscale silhouette. Wraiths use taper and transparency; wolves and beasts use low horizontal mass; gravebound use armored vertical blocks; cult forces use scorched angular accents. Unknown enemy types must never borrow another enemy's renderer.

Bosses use larger budgets because their phase changes must be visually readable. A boss may introduce orbiting pieces, expanded silhouette, or stronger emissive accents, but still obeys its material family. Boss presentation cannot be achieved through scale alone.

## Environment standards

Roads have a dark compressed edge, a broad material body, intermittent top-plane highlights, and broken travel grooves. Water has a wet shore band, deep body, planar color facets, and sparse moving ripples. Rot contamination changes both hue and surface behavior.

Architecture communicates three layers where applicable:

1. Original civilization: foundation, proportion, and primary material.
2. Later occupation: repairs, barricades, shrines, banners, or altered access.
3. Present condition: collapse, roots, soot, water, graves, or active corruption.

Reusable structures may share construction grammar, but landmark silhouettes must remain unique.

## Lighting and effects

The world uses cool ambient darkness with warm practical lights. Divine light is pale gold or white; water magic is cyan/teal; grave magic is purple-black; Eldritch effects are black-red; mortal fire is orange-red. Effects use stepped animation timing and a restrained radius so combat information remains readable.

## Animation

- Player and bosses: target 12 visual samples per second
- NPCs and enemies: target 10
- Ambient props and flora: target 8
- Structures: static unless an authored mechanism is active

Idle motion is subtle. Anticipation, active frames, recovery, hit reaction, and death must have distinct silhouettes. Movement should feel authored and weight-bearing rather than smoothly floating.

## Asset and performance policy

Every visible runtime entity resolves through the central visual model registry. Each entry owns a renderer ID, code model path, material set, collision profile, LOD/culling profile, thumbnail identity, tags, scale range, and complexity budget.

Production policy:

- Missing, placeholder, or broken visuals do not render in production.
- Developer Mode displays them as a magenta-and-black checker marker with the missing model ID.
- Logic-only objects never render in normal play.
- Wrong scale and collision anomalies remain visible but are validation warnings.
- Gameplay IDs and save data are never changed merely to improve art.

## Natural discovery

Art should deliver lore before text does. A player discovers faction history through repeated materials and damaged symbols, the age of a ruin through construction layers, contamination through water behavior and plant health, and a boss's changing danger through silhouette and emissive escalation. Item descriptions and dialogue may deepen those readings; they should not be required to notice them.

