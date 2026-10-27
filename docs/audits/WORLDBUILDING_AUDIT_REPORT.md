# Runalis Worldbuilding Audit Report

Audit date: 2026-07-21

## Executive finding

The project has a strong environmental and mechanical base for grounded dark fantasy, but it does not yet possess a coherent world bible. Existing worldbuilding is concentrated in names, quest text, item descriptions, class identities, and several disconnected data modules. The project is strongest at local atmosphere and weakest at cosmology, chronology, race design, political institutions, and canonical authority.

The new master brief supplies the missing macrostructure. The safest path is to let it govern future canon while preserving local assets that already work: Orrakai, Echoryn Forest, Castle Veyr, the Broken Chapel, the lantern motif, physical travel, bloodlines, class traditions, the Covenant's sincere public service, and the three major boss silhouettes.

## Existing lore-source inventory

There are no standalone lore books or world-bible documents in the repository. Lore is embedded in source modules.

| Source | Runtime status | Worldbuilding content |
|---|---|---|
| `README.md` | Active project note | Prototype identity, control summary, original-land restoration intent. |
| `worldContent.js` | Live | Primary registry for nine factions, 15 POIs, 22 NPCs, 18 local dialogues, 19 local quests, and hostile NPC metadata. |
| `questData.js` | Live | Three main-act quests, four companion quests, and three bloodline quests. Merged by `worldContent.js`. |
| `dialogueData.js` | Live | Companion/trainer voices, checkpoint scenes, Unbound reveals, Malakar/Seraphel/Zephyr lines, and class reactions. |
| `trainerData.js` | Live | Eight trainer records, class philosophies, progression states, companion links, and flags. |
| `classData.js` | Live | Seven canonical classes, classless state, four legacy aliases, abilities, passives, origins, and identity text. |
| `bloodlineSystem.js` | Live | Cambion, Nephilim, and Vampire identities, permanent costs, mechanical modifiers, and flags. |
| `data.js` | Live | 217 item descriptions, 56 abilities, 63 recipes, loot themes, rarity, resources, and legacy quest text. |
| `regionData.js` | Live | Three-act region summaries, tone, visual palettes, hazards, locations, enemies, resources, dungeons, and route links. |
| `travelData.js` | Live | Pilgrim Road and Severed Causeway geography, costs, checkpoints, and optional moral travel concepts. |
| `worldMapData.js` | Live | Act I map geography, markers, terrain layers, and labels. |
| `worldNames.js` | Live | Canonical runtime names and legacy Act I name normalization. |
| `overworldTerrain.js` | Live | Physical biomes, roads, water, ruins, and environmental feature placement. |
| `overworldEntities.js` | Live | Act I settlements, props, resources, NPCs, dungeon entrances, enemy populations, and handcrafted POIs. |
| `RunalisContentExpansion.js` | Live | Additional Act I NPCs, caches, settlements, landmarks, elites, and world bosses. |
| `majorPoiStructures.js` / `poiStructureArchetypes.js` | Live | Code-built POI architecture and structural visual profiles. |
| `hubSystem.js` | Live | Orrakai layout, civic services, trainers, gates, markets, town props, and ambient NPCs. |
| `regionWorlds.js` | Live | Physical Act II/III maps and route-world contents. |
| `dungeonSystem.js` | Live | Procedural dungeon room themes, set pieces, boss assignment, environmental evidence, and rewards. |
| `bossSystem.js` | Live | Hard-coded major/world boss phases, behaviors, presentation, rewards, and story completion hooks. |
| `storyRuntime.js` / `storyProgress.js` | Live | Current act logic, flags, route unlocks, boss consequences, and regional state. |
| `characterCreator.js` | Live | Class origins, caravan reasons, appearance options, and player-facing identity. |
| `storyData.js` | Authored, unreachable | Old three-act story bible, Unbound arc, Covenant hierarchy, Dawnspire Network, endings, symbols, and environmental storytelling ideas. |
| `companionData.js` | Authored, unreachable | Detailed Mara, Bram, Dusk, and Elian arcs plus camp conversations and relationship tiers. |
| `bossData.js` | Authored, unreachable | Detailed old-canon phase definitions for Malakar, Seraphel, and Zephyr. |
| `dungeonData.js` | Authored, unreachable | Detailed old-canon layouts for Dawnspire Root, Shattered Choir, and Ascension Spire. |
| `storyContentIndex.js` | Unreachable | Convenience re-export of old story data; no active consumer. |
| `questSystem.js` | Legacy, unreachable | Alternate quest implementation superseded by `dialogueSystem.js`. |
| `dungeon.js` | Legacy, unreachable | Alternate authored Hollow Root Cellar implementation. |

## Current worldbuilding profile

### Tone and presentation

The project already supports dark, melancholic, ancient, and intermittently hopeful fantasy. The best examples are the lantern motif, wet roads, old chapels, named graves, Castle Veyr, the altered orchard, marsh voices, and companions who frame courage as ordinary work rather than destiny.

The main tonal risk is excess terminology from generic high fantasy: demons, angels, cultists, holy versus infernal damage, fallen seraphs, demon lords, and cosmic demi-gods. Those labels flatten ideas that the new Primordial/Primearch cosmology could make specific to Runalis.

### Geography and settlements

- **Orrakai** is a functional capital hub with a guild, market, bank, smith, alchemist, trainers, shrine, PvP arena, infinite tower, north expedition gate, and south world gate. Its playable density is good; its government, neighborhoods, class tensions, economy, law, and history are not yet defined.
- **Echoryn Forest / Hearthmere Frontier** is the strongest world asset: a 640 x 480 region with old roads, forests, marsh, river, chapels, shrines, mines, castles, cult ruins, camps, resources, nine dungeon entrances, and numerous bosses/elites.
- **Hearthmere** exists primarily in quest and companion prose rather than as a clearly separated physical settlement. The runtime starts in Orrakai, creating geographic ambiguity.
- **Aureate Marches** has a strong high-level identity—beautiful controlled prosperity—but only a compact 120 x 64 prototype map with 14 objects and four enemies.
- **Ascension Wastes** has a coherent cosmic visual pitch but conflicts with the new requirement that Act III center on Zarynth. It is also a compact 120 x 64 prototype.
- **Travel routes** are mechanically grounded and useful, but their story scenes are mostly descriptive rather than systemic.

### History and ancient layers

Existing fragments include House Veyr, Castle Veyr, the Solgate, old chapels, buried seals, the Dawnspire Root/Network, the erased person named Runalis, and ruins beneath modern religious sites.

What is missing is a chronology that tells the team:

- which civilization built each layer;
- what materials, geometry, script, funerary customs, and symbols identify it;
- which God or Primordial tradition shaped it;
- who conquered, inherited, repurposed, or falsified it;
- what ordinary people currently believe about it;
- what evidence contradicts that belief.

Without this, ruins can feel old but not historically legible.

### Cosmology and religion

The new required cosmology is almost entirely absent. There is no registry for the Eight Gods, the forgotten Ninth, Divine Realms, Primordials, or Primearchs. Seraphel, Malakar, Nephilim, and Cambion exist under angel/demon assumptions instead.

The Covenant has the beginnings of a believable institution: sincere lower members, healing, refugee aid, road protection, confession, purification, and leadership willing to trade freedom for order. However, the active runtime only exposes fragments of the richer hierarchy in unreachable `storyData.js`.

Other religions are mostly class or faction aesthetics. The Broken Chapel, Thornbound, Gravecallers, and shrines do not yet have doctrines, rites, calendars, schisms, burial practices, sacred obligations, or relationships to the Eight Gods.

### Races and cultures

The player is human. Cambion, Nephilim, and Vampire are implemented as permanent awakened bloodlines. No elves, dwarves, orcs, myconids, Karakai, or other intelligent races are defined in the project. There is no creator-god lineage, cultural history, architecture, religion, politics, or interspecies relationship framework.

This is a major content gap, but it should not be solved by adding a list of familiar fantasy races. Each race needs a gameplay and historical reason to exist before it appears on the map.

### Politics and factions

The nine current factions are Outpost Wardens, Broken Chapel, Thornbound, Gravecallers, Ember Veil, House Veyr, Roadless Men, Saltwell Hunters, and Ridge Watchers.

Their local hooks are useful, but most are one-sentence archetypes. Fixed `friendly`, `neutral`, and `hostile` alignment labels undermine the desired moral ambiguity. The Covenant is important in story data but is not represented as a full faction entry with internal blocs.

Missing political fundamentals include jurisdiction, leadership succession, material interests, taxes, land claims, military capacity, alliances, grievances, public legitimacy, internal dissent, and what each faction will compromise to survive.

### Characters and companions

The four strongest companion candidates are:

- **Mara Vell:** healing without sterilizing life; sharp, practical, caring; Thornbinder identity.
- **Bram:** ordinary courage and preparedness; Fellhunter identity.
- **Kaelen Dusk:** memory, death, forbidden practice, and the difference between damage and evil; Gravecaller identity.
- **Sister Elian:** sincere faith forced to choose between institution and protective vows; Oathkeeper identity.

Their authored arcs are promising but mechanically dormant because `companionData.js` is unreachable. They currently function chiefly as trainers and quest givers, not persistent companions with relationship-driven scenes or field presence.

Warden Mael, House Veyr, the Roadless Captain, and other Act I NPCs provide useful seeds but lack personal networks, political leverage, and evolving states.

### Environmental storytelling and optional lore

The world already communicates through terrain, names, props, item descriptions, boss arenas, resource placement, and POI labels. This aligns well with the design philosophy.

The missing delivery layer is optional readable evidence: books, tablets, murals, court records, prayer strips, expedition notes, contradictory maps, trial transcripts, and architecture inspections. There is no codex/readable system, so lore currently leans too heavily on dialogue and quest text.

## Alignment with the new master themes

| Theme | Existing support | Gap |
|---|---|---|
| History is written by survivors | House Veyr, erased Runalis legend, rewritten Seraphel history. | No canonical historical periods or competing source traditions. |
| Faith shapes civilizations | Covenant, Broken Chapel, Oathkeeper, shrines. | No Eight-God theology, lived rites, schisms, or race-specific religions. |
| Truth is dangerous | Purification secrets and erased names. | Most revelations are announced directly and lack political consequences. |
| Mercy without freedom becomes tyranny | Strong Covenant and Zephyr material. | Zephyr's old sympathetic motive conflicts with the new irredeemable antagonist. |
| Freedom without restraint becomes chaos | Roadless Men and dangerous frontier hint at it. | No faction makes the strongest credible case for this side. |
| Power demands sacrifice | Bloodlines, class oaths, preparation, boss rewards. | Sacrifices rarely propagate into relationships, politics, or world state. |
| Hope can be manipulated | Covenant aid and Zephyr's serenity. | Hidden order and manufactured messiah are absent. |
| Civilizations inherit lies | Dawnspire and erased-name material. | The Ninth-God lie and its institutional inheritance are absent. |

## Preserve, reinterpret, or retire

| Asset | Decision | Rationale |
|---|---|---|
| Orrakai | Preserve and deepen | Already playable and required by the new Act I. |
| Echoryn Forest | Preserve | Strongest exploration asset; can become Orrakai's surrounding territory. |
| Hearthmere | Reinterpret | Make it an Orrakai district, nearby settlement, old regional name, or Rot-stricken satellite. Do not let it compete ambiguously with Orrakai. |
| Mara, Mael, Bram, Dusk, Elian | Preserve and deepen | Strong voices and useful ideological roles. |
| Lantern motif | Preserve | Distinctive, hopeful, and compatible with the new themes. |
| Physical routes and preparation | Preserve | Supports grounded exploration and consequence. |
| Castle Veyr / House Veyr | Preserve and integrate | Useful surviving-history layer and bloodline anchor. |
| Dawnspire infrastructure | Reinterpret | It can become conspiracy-built machinery using recovered Ninth-God remnants rather than the entire cosmology. |
| Failed purification scars | Reinterpret | Make them evidence of Rot research, containment, exploitation, or cover-up. |
| Ember Veil locations and encounters | Preserve mechanically, rewrite narratively | Recast as an Order cell, splinter faction, hired extremists, or false-flag apparatus; avoid a generic demon cult. |
| Malakar fight | Preserve mechanically, rewrite identity | Convert from demon lord to imprisoned Primordial and change all major revelations. |
| Seraphel fight | Preserve mechanically, rebuild dramatic path | Convert from fallen angel to Primearch; keep compassion credible until the late reveal. |
| Zephyr fight | Preserve mechanically and visually | Replace origin, ideology, and moral framing with manufactured Ninth-essence messiah canon. |
| Unbound | Reframe or retire | As written it risks Chosen One logic. If retained, make it acquired, non-unique, politically defined, and costly. |
| “Runalis was the first Unbound person” | Retire as fact or preserve as false folklore | It competes with the Ninth-God mystery and overexplains the title. |
| Ascension Wastes | Reinterpret | Use as a subregion, historical scar, or late-game consequence within/near Zarynth. |
| Angels and demons | Retire player-facing terminology | Replace with specific Primordial lineages; retain internal tags only during migration. |

## Required worldbuilding foundations

Before large-scale content writing, create the following canonical registries:

1. **Historical chronology:** named eras, collapses, migrations, wars, discoveries, and deliberate erasures.
2. **God registry:** Eight public Gods plus a restricted Ninth record, domains, created peoples, Divine Realms, symbols, doctrines, and contradictions.
3. **Primordial registry:** creator, lineage, realm, physical manifestation rules, worship traditions, politics, and known interventions.
4. **Primearch registry:** one to five per God, including Seraphel; historical appearances must change civilizations.
5. **Race/culture registry:** divine origin, homeland, architecture, values, internal politics, religions, historical wounds, and relationships.
6. **Faction registry:** public aim, private pressure, resources, methods, internal blocs, rivals, allies, red lines, and player-facing consequences.
7. **Location registry:** current authority, older layers, architectural languages, gameplay loop, secrets, and environmental evidence.
8. **Terminology glossary:** player-facing canonical terms and temporary internal aliases.
9. **Revelation ledger:** what is objectively true, what each faction believes, what the player can learn by act, and what remains ambiguous.
10. **Content-source hierarchy:** one canonical data source for each fact, with runtime consumers and validation.

## Worldbuilding verdict

Runalis does not need more disconnected lore. It needs a controlled canon spine that lets existing locations and systems tell one history from multiple biased perspectives. Local atmosphere is already a strength. Cosmology, politics, cultures, and historical layering should now be built to explain what the player can already touch.
