# Complete player wearable catalogue pass

November 1, 2026. Every currently registered non-weapon equipment item has a
deliberate fitting and matching raster inventory icon: **85 helm/chest/leg pieces
and 35 accessories**, 120 IDs in total. The fifteen body wearables approved in
the preceding passes remain registered; seventy additional body pieces and all
thirty-five accessories complete the current catalogue. Weapon artwork, item
statistics, rarity/effects, IDs and character progression are preserved.

## Visual review

Every item is shown on both approved bodies in four directions, beside its icon:

| Review | Contents |
| --- | --- |
| [1](catalogue-1.png) | Roadless and Last Dawn |
| [2](catalogue-2.png) | Last Dawn and Covenant |
| [3](catalogue-3.png) | Ember Veil and Grave Cult |
| [4](catalogue-4.png) | Grave Cult and Watchers |
| [5](catalogue-5.png) | Veyr and Drowned/Beast mythical pieces |
| [6](catalogue-6.png) | Mythical sets and early shields |
| [7](catalogue-7.png) | Legendary pieces and basic headwear |
| [8](catalogue-8.png) | Regular armour and class clothing |
| [9](catalogue-9.png) | Class clothing, legwear, rings and charms |
| [10](catalogue-10.png) | Remaining field, court and legendary pieces |

[Four held gait-frame samples](gait-review.png) show six full outfits, both
bodies, east and west. Real game captures: [field knight](in-game-field.png),
[Gravecaller](in-game-grave.png), [Veyr court](in-game-court.png),
[mixed mythical](in-game-mythical.png). All ten catalogue sheets, the gait sheet
and the in-game captures were visually reviewed. Captures/source masters are
local ignored review artifacts; shipped PNG/JSON, runtime code and these notes
are source-controlled deliverables. [Exact accepted prompts and paths](PROMPTS.md).

## Art and fitting

Five remaining faction families have their own authored material/insignia designs.
Forty regular/legendary/mythical body items have explicit individual designs,
including small diadems, a halo, class cloth, plate, leathers and greaves.
Accessories have distinct seals, charms, rings, lantern, seven cloaks and eleven
shields. Four hundred twenty new directional drawings supply 560 male/female
body registrations and 140 accessory views, plus 108 new icons including the
three previously selected items. Previous Covenant/Last Dawn exports also gain
clean gutter extraction. Fifteen accepted masters were generated with built-in
ImageGen; an overcrowded ornate seal master was rejected and regenerated.

Chest/leg materials transfer into the approved source garments without changing
their alpha, limb contours, frame selection or gait. All headwear uses the actual
head landmarks, with separate male/female rectangles; crowns and halo have their
own compact height and offset. Cloaks retain the existing rear/front layering.
Shields occupy the existing free-hand anchor and depth ordering, with a grip
inside their native bounds. Small jewellery stays small; rings remain on the
hand, with iron/red/gold material distinctions. All world surfaces and icons are
packed with binary alpha and restrained palettes; largest atlas side is 1,280px.

Export review reproduced fixed-grid cropping cutting objects and importing
neighbouring rows. Packing now measures real transparent gutters independently
for each direction and isolates each item cluster, preserving disconnected
paired legs. This is source extraction, not new anatomy or generated gait frames.
Original eight approved human-sheet hashes remain unchanged. Loose robes retain
the approved fitted torso silhouette; this pass adds no skirt rig or movement
system. Non-human standalone fittings retain their established geometry.

## Verification and future items

- `npm run check:wearables`: every live non-weapon equipment ID must have explicit
  directional art, correct slot/row registration and matching icon files/metadata.
  New gear cannot silently bypass the check; author its surface and registration.
- `verify-wearable-catalogue.mjs`: 79,057 renders, 24,032 exact body-silhouette
  comparisons, both bodies/four heads/four directions/thirteen pose samples,
  independently equipped/mixed layers, per-copy refs, under-color isolation,
  visible art, no actor mutation, non-human standalone coverage and shield grips.
  Pose families rotate sword/bow/staff/book references.
- Walk samples explicitly assert actual gait keys 0/1/2/3. Earlier fitting
  fixtures used walkTime 0–1.8, which sampled only the first held key at the
  existing 0.5 phase rate. Corrected all three fitting fixtures and the visual
  gait contact sheet; no runtime clock or gait rule was changed.
- Browser: 120 real add/equip operations on isolated actors, 960 production
  renders, all 120 icons decoded, 96 additional gait samples and four mixed
  outfits equipped in the normally started game; no page errors.
- Original first-pass 4,992 and faction 9,984 silhouette comparisons pass with
  corrected gait sampling. Legendary locomotion: 1,472 renders; existing armour,
  head, native leg gait, melee, weapon stance, gear-itemization and Gravecaller
  evolution/sustain checks pass. The legendary bounds contract now distinguishes
  real shields from pendants; ordinary jewellery retains its compact bounds.
- Engineering gate 11/11, build and portable wearable coverage pass. Art audit
  adds 808 inspected cells beyond the faction pass without new errors, retaining
  the identical 24 documented pre-existing metadata/coverage errors. This audit
  remains red overall; no existing error is marked resolved by this work.

The catalogue is covered at the documented review/pose samples. This does not
claim every possible multi-item combination or human artistic approval, and it
does not repaint character-creator cosmetics, separately authored monster/boss
bodies or weapon art. No real user saves were used for browser fixtures.
