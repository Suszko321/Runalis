# Wearable catalogue — accepted ImageGen prompts

Built-in ImageGen was used for all fifteen accepted masters; transparent backgrounds requested. No CLI/API fallback. The first fifteen wearable registrations from earlier passes are retained, with the Covenant/Last Dawn exports repacked using measured gutters. Every accepted master was copied into the workspace and inspected before packing.

Supporting reference for body sheets and initial accessories: `assets/art/sprites/player-wearables-first-pass.png`. The accepted accessory collection 3 uses `assets/art/source/player-wearables/player-accessories-collection-1-master.png` as its style reference. Its first ornate, crowded master was rejected and regenerated.

Runtime exports live under `assets/art/sprites/`. Accepted local masters live under `assets/art/source/player-wearables/<sheet>-master.png` and remain ignored authoring files. To regenerate layout data run `node tools/prepare-wearable-catalogue.mjs`, then pack the workspace masters with `python tools/pack-wearable-catalogue.py`; `pack-faction-wearables.py` packs the previous Covenant/Last Dawn masters. JSON metadata and finished PNG exports are tracked.

## player-wearables-roadless

Master: `assets/art/source/player-wearables/player-wearables-roadless-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. ROADLESS: worn brown hides, tan bindings, charcoal cloth, knot insignia, repaired stitching. Rows SIX: 1 open charcoal cloth hood with a small lower-face leather mask and transparent eye aperture, 2 patched strapped brown leather vest, 3 rough fitted charcoal legwraps with tan binding and brown boots, 4 brown ceremonial cloth vest with knotted sash, 5 ragged tan scout hood, 6 asymmetric dark brown scout leather vest with short diagonal strap.

## player-wearables-ember-veil

Master: `assets/art/source/player-wearables/player-wearables-ember-veil-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. EMBER VEIL: deep rust, burnt umber, charcoal cloth, restrained copper/flame insignia, no magical glow. Rows SIX: 1 ritual rust hood with narrow bone lower-face guard and transparent eyes, 2 fitted rust ritual fabric vest with copper flame clasp, 3 charcoal legwraps with rust straps and worn boots, 4 dark crimson ceremonial vest with angular copper embroidery, 5 soot-brown scout hood, 6 dark leather scout vest with rust inserts.

## player-wearables-grave-cult

Master: `assets/art/source/player-wearables/player-wearables-grave-cult-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. GRAVE CULT: deep muted plum, grey violet cloth, aged bone toggles, tarnished pewter, skeletal/bone emblem, no glow. SIX rows: 1 dark plum ritual hood with tiny bone jaw guard, eye aperture transparent; 2 fitted charcoal-plum ritual vest bone clasps; 3 fitted dark grey legwraps with bone ties and dark boots; 4 deeper purple ceremonial vest, restrained vertical bone embroidery; 5 simple charcoal-plum scout hood; 6 dark violet brown leather scout vest with small bone toggle.

## player-wearables-watcher

Master: `assets/art/source/player-wearables/player-wearables-watcher-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. WATCHERS: slate blue cloth, desaturated blue grey leather, pale silver eye insignia, muted teal accent. SIX rows: 1 slate blue hood with transparent face opening and small silver brow clasp; 2 fitted slate blue cloth vest, small silver eye clasp and dark binding; 3 fitted blue grey legwraps with silver straps and dark brown boots; 4 dark blue ceremonial vest with thin silver eye embroidery; 5 short dark teal scout hood; 6 fitted slate blue leather scout vest with silver buckles. No glow, not Covenant gold or red Last Dawn.

## player-wearables-veyr

Master: `assets/art/source/player-wearables/player-wearables-veyr-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. VEYREIGN COURT GUARD: dark blue grey steel, desaturated blue cloth, fine silver binding and small twin vertical bars insignia. Exactly SIX rows: 1 angular low open-face steel helmet with narrow blue brow binding, 2 fitted blue-grey steel cuirass with short navy front panel and silver bars clasp, 3 fitted blue grey greaves with silver straps and dark boots, 4 tailored deep blue ceremonial vest with fine silver collar and small bars emblem, 5 short navy scout hood transparent face, 6 fitted dark blue leather scout vest with silver buckles. No large pauldrons, no cape, no glow.

## player-wearables-collection-1

Master: `assets/art/source/player-wearables/player-wearables-collection-1-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. Exactly EIGHT rows, top to bottom:
1. narrow dark teal tidal diadem, silver wave tines, small cyan stone.
2. dark teal fitted vestment, silver wave piping, cyan central clasp.
3. small brown leather and antique gold antler diadem, wolf fang centre.
4. brown hide greaves, pale gold fur knee edging, claw buckles, fitted boots.
5. charred brown leather cuirass with diagonal scorched red bands and dull copper clasps.
6. charcoal fitted greaves, burned copper knee plates, ember orange stitching, dark boots.
7. narrow violet-black star diadem with tiny pale lilac stones, no glow.
8. sage steel fitted breastplate with worn ivory front panel and tiny sun fastening.

## player-wearables-collection-2

Master: `assets/art/source/player-wearables/player-wearables-collection-2-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. Exactly EIGHT rows, top to bottom:
1. sage steel shin guards, linen straps, charcoal trousers and brown boots.
2. narrow blackened iron crown with three pale bone points and amethyst centre.
3. layered dark silver breastplate, burgundy divided-sun panel and tarnished gold edging.
4. soot grey fitted mantle vest, burnt orange collar edging and charcoal clasp.
5. small isolated antique gold open ring halo, no rays or glow, transparent centre.
6. forest green fitted legwear, thorn-wrapped shin plates, muted red ties and brown boots.
7. blackened fitted greaves, dark crimson facets and restrained red seam, no glow.
8. plain weathered ochre linen hood, patched seam, transparent face aperture.

## player-wearables-collection-3

Master: `assets/art/source/player-wearables/player-wearables-collection-3-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. Exactly EIGHT rows, top to bottom:
1. dark worn iron open-face cap, visible crack and brown chin strap.
2. dark silver open-face knight sallet, narrow antique brass rim.
3. deep plum hood, bone edging, small pewter clasp, transparent face.
4. slate blue hood, pale blue seam and small eye clasp, transparent face.
5. fitted ochre cloth tunic vest, visible pale patches, simple cord waist.
6. fitted chestnut leather vest with broad diagonal strap and small iron buckle.
7. fitted silver breastplate, engraved small ward clasp and brass binding.
8. dark violet grey layered iron cuirass with bone centre clasp and restrained purple stitches.

## player-wearables-collection-4

Master: `assets/art/source/player-wearables/player-wearables-collection-4-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. Exactly EIGHT rows, top to bottom:
1. layered steel knight breastplate, narrow brass edging and dark leather waist straps.
2. deep plum fitted ceremonial vest, bone fasteners and muted violet panels.
3. moss green fitted cloth vest, russet leaf embroidery, brown cord fasteners.
4. fitted brown and navy combat coat torso, small bronze rune clasps.
5. asymmetric charcoal leather vest, red brown shoulder strap and steel buckles.
6. dark burgundy ceremonial fitted vest with divided-sun symbol and black binding.
7. tailored blue grey noble coat torso, silver piping and pale blue clasps.
8. fitted rough dark brown legwraps with ochre binding and worn brown boots.

## player-wearables-collection-5

Master: `assets/art/source/player-wearables/player-wearables-collection-5-master.png`

RUNALIS production equipment-only pixel-art sprite sheet. Match the provided native game equipment/player references: subdued earth/ash/brass palette, tiny readable dark outlined clusters, 16 colors per item, restrained highlights, no glow or smooth illustration. Transparent background, no ground, no labels or text, no mannequin, no body, no head, no skin, no weapons. Exactly FOUR equal columns: front, right profile, back, left profile. Exactly the specified number of equal-height rows, one isolated item per cell; consistent counterpart designs across directions, no missing cells, ample clear margins. Practical fitted garment surfaces, never broad shoulders or skirt/diaper shapes. Helm/hood face aperture must remain transparent. Torso items sleeveless, fitted to the existing torso, no arms/hands; leg items narrow fitted trousers/shin plates/boots, no waist bulges; crown/halo isolated narrow head ornament only. Readable after downscaling: torso ~18x18, full head ~24x22, legs ~26x30. Do not redesign human anatomy. Exactly EIGHT rows, top to bottom:
1. fitted weathered steel shin plates over charcoal trousers and dark brown boots.
2. fitted slate blue shin guards, silver binding and charcoal boots.
3. open-face dented iron cap with mismatched dark repair plate and small rivets.
4. fitted brown roadwarden coat torso, olive lapel and simple leather belt.
5. fitted plum charcoal legwraps, bone cord ties and dark brown boots.
6. short brown scout hood with lower-face charcoal leather mask, transparent eye aperture.
7. fitted slate blue silk vestment with fine silver collar and restrained pale blue brocade.
8. narrow thornwood circlet, moss leaves and small dark red thorns.

## player-accessories-collection-1

Master: `assets/art/source/player-wearables/player-accessories-collection-1-master.png`

RUNALIS dark fantasy production pixel art equipment accessory sheet on transparent background. Exactly FOUR equal columns (front, right side, back, left side) and SEVEN equal rows, no labels, no text, no character, no body, no mannequin. Each isolated item centred inside its own equal cell with clear margins, consistent counterpart views. Deliberate low-resolution pixel clusters, crisp dark outlines, 16-color per item, muted materials, restrained top-left highlights, no smooth illustration or gradients, no glow spilling outside item. Cloaks are isolated short shoulder-to-hip cloth with readable folds and small insignia; shields are compact carried shields; medallions and rings are readable small objects. These will be packed to tiny native game scale, so avoid fine noise. Rows top to bottom:
1. Roadless Cloak and Insignia, cloak, #68503d main material and #97725a restrained accent; roadless identity, practical dark fantasy craftsmanship.
2. Roadless Sentinel Shield, shield, #68503d main material and #97725a restrained accent; roadless identity, practical dark fantasy craftsmanship.
3. Last Dawn Cloak and Insignia, cloak, #35383e main material and #a04a41 restrained accent; lastDawn identity, practical dark fantasy craftsmanship.
4. Last Dawn Sentinel Shield, shield, #35383e main material and #a04a41 restrained accent; lastDawn identity, practical dark fantasy craftsmanship.
5. Covenant Cloak and Insignia, cloak, #b8b8ae main material and #c4a15b restrained accent; covenant identity, practical dark fantasy craftsmanship.
6. Covenant Sentinel Shield, shield, #b8b8ae main material and #c4a15b restrained accent; covenant identity, practical dark fantasy craftsmanship.
7. Ember Veil Cloak and Insignia, cloak, #58352e main material and #dd9258 restrained accent; emberVeil identity, practical dark fantasy craftsmanship.
Faction motifs: Roadless knotted straps; Last Dawn muted oxblood chevron; Covenant cream and brass sun; Ember Veil burnt-rust flame; Grave Cult plum/bone toggles; Watcher slate blue eye; Veyr dark blue twin silver bars. Keep them practical and distinct.

## player-accessories-collection-2

Master: `assets/art/source/player-wearables/player-accessories-collection-2-master.png`

RUNALIS dark fantasy production pixel art equipment accessory sheet on transparent background. Exactly FOUR equal columns (front, right side, back, left side) and SEVEN equal rows, no labels, no text, no character, no body, no mannequin. Each isolated item centred inside its own equal cell with clear margins, consistent counterpart views. Deliberate low-resolution pixel clusters, crisp dark outlines, 16-color per item, muted materials, restrained top-left highlights, no smooth illustration or gradients, no glow spilling outside item. Cloaks are isolated short shoulder-to-hip cloth with readable folds and small insignia; shields are compact carried shields; medallions and rings are readable small objects. These will be packed to tiny native game scale, so avoid fine noise. Rows top to bottom:
1. Ember Veil Sentinel Shield, shield, #58352e main material and #dd9258 restrained accent; emberVeil identity, practical dark fantasy craftsmanship.
2. Grave Cult Cloak and Insignia, cloak, #48404f main material and #9982ad restrained accent; graveCult identity, practical dark fantasy craftsmanship.
3. Grave Cult Sentinel Shield, shield, #48404f main material and #9982ad restrained accent; graveCult identity, practical dark fantasy craftsmanship.
4. Watcher Cloak and Insignia, cloak, #4b6270 main material and #95bcc0 restrained accent; watcher identity, practical dark fantasy craftsmanship.
5. Watcher Sentinel Shield, shield, #4b6270 main material and #95bcc0 restrained accent; watcher identity, practical dark fantasy craftsmanship.
6. Veyr Cloak and Insignia, cloak, #3e4954 main material and #7196a5 restrained accent; veyr identity, practical dark fantasy craftsmanship.
7. Veyr Sentinel Shield, shield, #3e4954 main material and #7196a5 restrained accent; veyr identity, practical dark fantasy craftsmanship.
Faction motifs: Roadless knotted straps; Last Dawn muted oxblood chevron; Covenant cream and brass sun; Ember Veil burnt-rust flame; Grave Cult plum/bone toggles; Watcher slate blue eye; Veyr dark blue twin silver bars. Keep them practical and distinct.

## player-accessories-collection-3

Master: `assets/art/source/player-wearables/player-accessories-collection-3-master.png`

Create a clean production PIXEL ART sprite sheet for RUNALIS, using the supporting equipment sheet ONLY as style reference. Transparent background. Exactly FOUR columns (front, right profile, back, left profile) and SEVEN rows. Every object must have large CLEAR TRANSPARENT GUTTERS on all sides, especially between rows; never touch or overlap the next object. Simple isolated items only, no scenery, no text, no cloth banners or hanging rags. Each item conceptually drawn on a 24x28 pixel grid: visible chunky square pixel clusters, dark outlines, restrained sixteen-color ramps, no high-detail painting, no smooth illustration, no glow. Rows from top to bottom: 1 small dark teal and silver circular tidal medallion with one cyan wave inset, NO CLOTH; 2 small brown and antique-gold wolf-head medallion with two short bone fangs, NO CLOTH; 3 small purple-black four-point star medallion with one lilac inset, NO CLOTH; 4 small sage-green and ivory circular pilgrim sun medallion, NO CLOTH; 5 compact cracked dark iron kite shield with faded ivory vow cross; 6 compact round brown wooden shield with black iron rim and central boss; 7 compact silver and antique-brass kite shield with restrained small sun emblem. The first four are small jewellery, not enormous elaborate relics. The last three are carried shields. All four views must belong to the correct row item, consistent proportions and palette, generous transparent row separation.

## player-accessories-collection-4

Master: `assets/art/source/player-wearables/player-accessories-collection-4-master.png`

undefinedRows top to bottom:
1. small weathered brass lantern with warm pale glass, no surrounding glow.
2. silver pendant with blue grey faceted glass.
3. small ivory broken feather wing relic with gold binding.
4. thornwood knot charm with one dull red bead.
5. bone rune pendant on dark cord.
6. dark steel signet ring with tiny brass oath inset.
7. dark silver ring with red wax-like stone.

## player-accessories-collection-5

Master: `assets/art/source/player-wearables/player-accessories-collection-5-master.png`

RUNALIS dark fantasy production pixel art equipment accessory sheet on transparent background. Exactly FOUR equal columns (front, right side, back, left side) and SEVEN equal rows, no labels, no text, no character, no body, no mannequin. Each isolated item centred inside its own equal cell with clear margins, consistent counterpart views. Deliberate low-resolution pixel clusters, crisp dark outlines, 16-color per item, muted materials, restrained top-left highlights, no smooth illustration or gradients, no glow spilling outside item. Cloaks are isolated short shoulder-to-hip cloth with readable folds and small insignia; shields are compact carried shields; medallions and rings are readable small objects. These will be packed to tiny native game scale, so avoid fine noise. Rows top to bottom:
1. slate blue glass eye pendant with silver edging.
2. weathered silver water drop medallion.
3. heavy dark silver tower shield, antique gold oath emblem.
4. faceted turquoise glass heart in dark silver prongs.
5. antique brass signet ring, dark inset and tiny founder crest.
6. worn brown cord and small engraved iron name tag.
7. restrained aged silver memorial seal with small open circle inscription.

