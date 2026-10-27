# Runalis enemy visual overhaul

Implemented from Runalis Enemy Visual Overhaul.pdf on 2026-10-07. The project uses Canvas 2D, so mesh/material/instancing requests are implemented with the existing sprite renderer, shared human equipment layers and bounded image caches. No Babylon renderer or parallel combat system was introduced.

Later loot tuning supersedes the equipment-drop rates recorded here: faction wearable drops now use 0.3%. See [the loot overhaul report](../loot-overhaul/implementation-report.md) for the current economy, Mythical gear and verification results.

## Result and scope

All 15 existing enemy kinds now resolve to an appropriate human, corpse, skeleton, beast, brute, spectral, aberration or signature-boss presentation. 132 deterministic worlds yielded 5084 enemies and 221 distinct names. The before/after comparison found **0 changed IDs, kinds, placements or recorded combat values**. It compares HP, damage, XP, speed, aggro, attacks, collision dimensions, level and resistances where present. It does not claim an exhaustive replay of every possible seed or infinite floor.

The original base-skill/mastery morph system, companion colors, human walking/arm fitting and final-boss return portals remain working. The baseline source and existing sprite assets are saved in ../../backups/pre-enemy-visual-overhaul-20261007.zip.

## Root causes corrected

- A broad humanoid classifier and old bodyModel/humanoid flags forced corpses, skeletons, wolves, brutes and several bosses through the player rig. Species/boss-specific profiles now take priority; only true humanoids use that rig.
- Boss overrides bypassed already-authored anatomy. Original phase atlases are restored, and the three missing frontier bosses have actual distinct assets registered in the visibility system.
- Old equipment initialization could award every equipped piece. The new roll selects at most one visible piece from an eligible wearer, independently of normal rewards.
- Display-name slugs generated cluster IDs. Historical aliases preserve the exact original IDs after display renames.
- Fixed grid slicing clipped extended weapons; component extraction preserves full silhouettes and uses one scale per row. A temporary-frame filename bug found during visual review was corrected; the source-pixel audit checks that each atlas cell comes from its declared source.

## Recovered and new art

Recovered enemies-core (wolf, bone knight), enemies-extra (skeletal priest, wraith), enemies-remaining (brute, exploder, fungal beast), summons-core (actual skeletal servant/road risen), bosses-act1 (Veyr Warden, dead elk, Malakar), bosses-ascendant (Seraphel phases and Malakar phase 3), and bosses-zephyr (Zephyr phases). Summons no longer substitute a living human for their bone anatomy. Forge-equipped skeletons now use the skeleton-forge bone body, native equipment art and measured wrist attachment points, including bows on armor-only marksmen. The old attachment drawing remains a loading fallback. Knights do not draw a second default sword over an equipped weapon. Blue wolf and purple demon companion art and their pact marks remain distinct from enemies.

Four fresh bitmap generation calls used the built-in image generation tool, transparent background, no reference image. Their requested content was four-frame dark-fantasy pixel atlases:

| Source saved in assets/art/source | Requested content | Production cells |
| --- | --- | --- |
| enemies-blighted.png | Corpse, infected soldier, infected quadruped wolf, heavy infected brute; idle, two strides, attack | 16 × 96×112 |
| enemies-blighted-victims.png | Laborer apron and traveler hood/pouch corpse variants; matching four states | 8 × 96×112 |
| skeleton-forge.png | Weapon-free skull/rib/pelvis/limb body for actual forge equipment; contact/stride/attack poses | 4 × 96×112 |
| bosses-frontier.png | Armored axe executioner, infected bear, woody briar titan; matching four states | 12 × 160×176 |

The additional skeleton body came from exec-2de2b168-131f-4aa8-9c5e-20b59cd92f84.png. A separate edit attempt (exec-553d676e-a488-4bba-96bc-19de995b2749.png) did not improve the reversed stride and was not integrated. The selected body uses neutral contact frames between the authored strides. Generated source tool files for the other three sheets were exec-428151b0-7567-4c21-9753-de9c23f41184.png, exec-05164013-ed75-46f1-bc15-00521986e862.png and exec-81f630e2-ec93-46e5-8860-66efb2292050.png respectively. Production PNGs, bounds/pivots and enlarged previews are in assets/art/sprites. Packing is isolated-component extraction with alpha threshold 150, shared row scale, nearest-neighbour sampling and six pixels below the feet. 40 cells pass source-pixel, alpha, bounds and pivot checks.

## Factions and equipment

- **Roadless** (roadless): leather, mask headwear, knot insignia; base #68503d, accent #97725a.
- **Last Dawn** (lastDawn): plate, angular headwear, chevron insignia; base #35383e, accent #a04a41.
- **Covenant** (covenant): plate, crest headwear, sun insignia; base #b8b8ae, accent #c4a15b.
- **Ember Veil** (emberVeil): robe, ritual headwear, flame insignia; base #58352e, accent #dd9258.
- **Grave Cult** (graveCult): robe, ritual headwear, bone insignia; base #48404f, accent #9982ad.
- **Watcher** (watcher): robe, hood headwear, eye insignia; base #4b6270, accent #95bcc0.
- **Veyr** (veyr): plate, angular headwear, bars insignia; base #3e4954, accent #7196a5.

Last Dawn uses dark steel/crimson military layers and angular visors; Covenant uses ivory/gold, crests and sun shields. Roadless uses leather, hoods, face wraps, pouches and short knives. Cult groups use distinct cloth colors, masks/hoods, sigils and staffs. Scouts use hoods and lighter chests; casters use robes; guards use shields. Variants are deterministic and curated by role. Infected soldiers keep their authored damaged anatomy while textile remnants retain their former faction color.

84 uncommon items across seven sets use the existing weapon/helm/chest/legs/trinket slots, real armour/baseDamage fields and normal weapon skills. The same equipment is rendered on enemies and players. Staff/bow/blade art follows the actual archetype attack or cast. Faction armor reuses the already-fixed human gait and wrist landmarks; helm/cloak/tabard/shield/weapon details use crisp pixel geometry. Inventory icons share faction colors and role silhouettes. This is code-native artwork, not a set of externally generated equipment bitmap sheets.

## Loot and encounter behavior

ENEMY_EQUIPMENT_LOOT_CONFIG in src/enemyEquipmentLoot.js sets chance=0.03, trophyChance=0.03. One eligible kill receives one roll and at most one extra item; the persisted enemyEquipmentLootRolled and enemyWorldLootGenerated flags prevent repeat payouts. Human candidates are the actual visible common faction items. Monsters provide suitable materials (bone, fang, hide, essence, cloth or scrap). Boss/story/unique/quest gear is excluded from this supplemental system; established normal and story rewards remain. The global item scalar is normalized against the current 0.4 baseline, so the current chance is actually 3%. World configuration can override each chance.

A seeded 100,000-kill check yielded 3,058 collectible drops (3.058%). Tests also cover exact thresholds, disabled/forced rolls, visible-pool membership, duplicate callbacks, co-op ownership and reachable pickup collection.

Patrol selection falls back within the location's ecology rather than selecting from all templates. Roadless patrols, wolf packs, burial packs and Last Dawn ritual groups remain distinct. The Last Dawn exploder is explicitly a controlled Bound Convert, permitting that intentional mixed ritual group. Existing IDs, roster counts, authored encounter placements, AI hostility and combat simulation remain; no indiscriminate enemy-versus-enemy system was added. Dynamic template details are in inventory.json.

## Naming and saves

Active source display text uses Blighted/Rot Blight vocabulary. Thornroot Crypt and Abandoned Iron Vault use appropriate location names. Display-only save migration covers names, quest text, dialogue, descriptions and zone labels. Existing internal hollowling, hollowEye, oldHollow, boss/quest/POI IDs and function aliases remain for compatibility. Display-name aliases preserve generated cluster IDs. Body/equipment version migration removes the old forced-human costume on creatures and initializes suitable humanoid gear once. Authored valid equipment is retained; invalid references are removed.

## Review and validation

Open enemy-visual-lab.html through the running preview. It uses the actual drawEnemy/human/summon renderer, with a human reference, allied wolf/demon and a forge-equipped skeletal marksman. Controls cover names on/off, three curated variants, east/west/north/south, three distances, day/night/dungeon, idle/walk/run/attack-or-cast/hurt/block/death, and boss phases 1–3. Directional creature art is mirrored as appropriate; selecting north/south does not invent missing atlas facings.

Five skeletal equipment/role cases also render without human sprite substitution or input mutation. Browser validation: **756 configurations**, **39 actors**, 112,815 image draws, zero invalid source rectangles. **1344 player equipment renders**, all 84 faction icons, seven distinct former-faction uniforms, bounded caches, real fresh-game launch, zero page errors or failed requests. Sixteen ordinary male/female player renders are byte-identical to the baseline after assets are warm.

Automated checks passed: roster/ID/stat comparison, model/atlas registration, equipment slots and references, role weapons, loot, migration, patrol ecology, enemy visibility; 8,448 side-walk volume samples; 1,024 authored leg renders plus 1,024 composed cases; 1,170 south-arm poses; 1,472 legendary locomotion renders; 186,052 animation samples; 213 skill morphs with 639 real casts; 57 combat checks; 23 progression checks; seven dungeon return-portal themes; world-content checks. Artwork coverage recognizes existing scroll SVGs and confirms 316 items, 72 weapons, 51 animated armor entries and 87 active skill icons. All 196 source files pass syntax validation.

Images: after.png, before-matched.png, walking-east.png, walking-west.png, south-facing.png, silhouettes-no-names.png, night-attacks.png, dungeon-deaths.png, player-faction-equipment.png, faction-inventory.png, skeletal-equipment.png, live-game.png. The first pre-change before.png is preserved separately.

## Performance and limits

Same 36-actor gallery, 1440x1512 canvas, idle/day/east/names, 100 warm-up frames; three synchronous 180-frame trials per version. Canvas render CPU only, not whole-game FPS.

Across the three trials, the median of medians was **1.80 ms before → 1.90 ms after**; median p95 was **9.20 ms → 6.50 ms**. Typical rendering has a small added cost; the tail improved in this local sample. This is not a guaranteed frame-rate improvement. Loaded atlas count is 47 → 51. New atlases require about 2.44 MiB raw RGBA; the warm faction tint cache is 9.79 MiB and infected uniform variants 1.15 MiB. Caches do not grow per enemy or per frame. These are backing-store estimates, not measured VRAM.

Remaining limits: legacy/new monster and boss sprites use authored quarter-view/mirrored animations, not four independently authored facings. New ordinary sheets have idle/two walk/attack frames; hurt, stagger and death use the game's existing reaction/fade layers rather than bespoke frame sets for every creature. Large boss attacks preserve existing telegraphs and timing; signature effects and phase atlases are reused. Named elite/tower guardians retain their appropriate species/faction model rather than each receiving a unique illustration. The review samples representative identities, states and worlds, not hours of play or every procedural seed. No missing required source assets or unsupported existing enemy kinds were found in the audit.

## Files and reproducibility

Core additions: enemyVisualProfiles.js, enemyEquipmentData.js, enemyEquipmentLoot.js, factionEquipmentArt.js, enemyIdentityAliases.js, enemyVisualLab.js, enemy-visual-lab.html; four production/source sprite sheets. Core integrations: humanoidEnemies.js, render.js, spriteArt.js, modelRegistry.js, data.js, gearVisualStyle.js, artIcons.js, equipmentArt.js, armorMotionArt.js, meleeArmArt.js, humanRenderer.js, codeAssets.js, lootSystem.js, overworldEncounterSystem.js. Display and historical-slug changes are listed in changed-source-files.json and display-migration-files.json.

Run tools/collect-enemy-roster.mjs, tools/verify-enemy-overhaul.mjs, tools/verify-enemy-atlas-packing.py, tools/verify-enemy-art-browser.cjs and tools/build-enemy-overhaul-report.mjs with the configured Node/Python runtimes. Browser checks need Playwright with Edge and RUNALIS_NODE_MODULES pointing at bundled dependencies; canvas gait tests need RUNALIS_CANVAS_MODULE pointing at @napi-rs/canvas. Atlas rebuilding uses tools/pack-blighted-art.py, with explicit name/rows/cell size for each additional source. Baseline comparisons read preserved source extracted into tmp/enemy-overhaul-baseline.
