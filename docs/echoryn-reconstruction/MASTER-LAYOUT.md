# Echoryn Forest: authored geographic plan

Landmark identities and anchors remain centralized in `overworldUtils.js`. Journey geometry is centralized in `echorynGeography.js`. Keeping the anchors avoids changing quest/state dependencies merely to improve scenery. The old 640 × 480 world envelope remains compatible with existing saves; its travel network receives authored bends, branches, crossings and terrain.

The maintained south apron leads through field edges and relief supplies into Hollow Road. It bends around the Hollow Cut before climbing toward Ashen Orchard. The orchard has agricultural rows, a family yard, quarantine receiving ground, a farmhouse cellar and an irrigation route to the Ancient Sluice. Quiet roadside spaces alternate with damaged shelters, warning milestones and black roots.

[Open the shared master layout](master-layout.svg). It shows all twenty major anchors, fourteen routes, four rivers, four backwaters, eight escarpments and nine deliberately placed impassable forest masses. Two forest masses have authored game trails; other cuts protect retained content and connect it to the travel network. Region identity blends between eleven overlapping geographic lobes rather than following rectangular palette boundaries.

At Hollow Cut, South Fen Road branches into the denser Thornwood. Root terraces frame Thornroot Hollow. The river is a continuous north–south navigational spine: it passes under Pilgrim Bridge, bends west through Riverbend, follows Mirror Grove and Saltwell, and exits the southern map. Riverbend is a crossing/rest stop; Saltwell is a fishing settlement. Ironwater feeds the mining wetlands east of Saltwell. Raised Lantern Marsh ground provides refuge before the descent into Iron Mire.

Pilgrim Road leads east from the orchard through open burial country, across the significant Lantern River, past broken pilgrim shelters, and into Broken Chapel. Castle Veyr sits beyond an estate approach and a climb through the escarpment. Hunter Reach branches south of the bridge; Watcher Ridge stands east of it with two stair-connected ledges. Old Hollow occupies the older forest south of the hunters. Roads there turn from travel infrastructure into controlled Last Dawn approaches, ending at the fortified Red Seal Keep.

## Content contracts

`content-before.json` records the complete live inventory before reconstruction: 12,749 objects and 321 enemies. All interactive content, POI clues, outcomes, caches, entrances, named encounters, NPC IDs and dungeon identities are retained. Presentation-only scatter can be replaced. Castle Veyr's dungeon is an additional contract beyond the prompt's explicit nine descents. Hollow Grove and Abandoned Mine also have existing side-zone entrances.

Micro-POIs retained: Hollow Elk Grove, Briar Den, Abandoned Caravan, Pilgrim Road Ambush, Bandit Road Camp, Grave Mound, Mire Watchpost, Old Hollow Den and Red Seal Ritual Site. Eight previous authored landscapes and their secrets remain additional discoveries. Existing branching orchard/chapel props remain state-conditioned; new static scenery does not replace or duplicate their consequence props.

## Implementation sequence

1. Shared authored roads, watershed, irregular regional identities and cliff/ramp collision.
2. Orrakai apron → Hollow Cut → orchard, with gameplay-scale art, tree trunk collision, local canopy fading and bounded ground caching. Walk and inspect before expansion.
3. Natural architecture and quiet clearings in Thornwood/Mirror Grove.
4. Bridge/crypt, burial landscape and chapel approaches.
5. Hunter livelihoods, Watcher stairs and sightline landmarks.
6. River settlements, Lantern refuge and drowned mining infrastructure.
7. Ancient burial threshold in Old Hollow.
8. Veyr estate and militarized Red Seal approaches around the retained bespoke complexes.

Verification uses the actual movement/collision routine, radius-aware route traversal, reachable content, save migration, dungeon returns, browser screenshots without labels, local occlusion, and render timing. Art inspection is separate from topology assertions; passing code checks alone is not a visual quality claim.

The initial corridor was walked and inspected before expansion. The expanded region now also has forest boundaries with trunk collision, natural root entrances, a bridge foundation and lower-bank crypt, distinct keep silhouettes, working camp areas, regional shore vegetation, nine authored micro-discovery compositions and an off-road Hollow Elk clearing. The current reconstruction includes 2,703 world objects and 6,360 spatially indexed trees; nearby trees are individual occluders and the ground cache is capped at forty-eight chunks.
