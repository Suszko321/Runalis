# Runalis visual production — 26 September 2026

The overhaul remains in progress. There are now 47 transparent atlases containing 723 packed cells, plus eight terrain swatches. These are shared production sheets, not 723 unique game objects. Original generated images and available prompts are preserved in assets/art/source; production packing is reproducible with tools/rebuild-art.py. Built-in image generation produced the artwork.

## Current integration

- Male/female directional idle, walk, melee, cast and bow poses. Authored hand grips attach weapons during actions. Spell poses follow signature release timing; attack offsets ease through recovery.
- All 44 weapons, 229 item icons and 56 skill icons resolve to generated family artwork. Several items share art; bespoke identity for every item is not complete.
- Standard enemies, Act One bosses, Seraphel and Zephyr phases, evolved summons, town buildings, landmarks, town furniture, plague/story props, terrain and eight release-effect families.
- Dungeon stairs, locked/open doors, keys, exits, dormant/solved puzzles and active/spent event obelisks now use generated state art. Puzzle progress remains visible.
- Character creator preview expanded from 260 to 390 pixels high. Canvas intrinsic minimum sizing fixed so the full character and weapon fit instead of being clipped by the box. Narrow layouts use a full-width scrolling preview.
- All four creator accessory choices now have four-direction pixel art: earring, amulet, half mask and headband. Short cape, shoulder mantle and travel cloak also have generated directional art, integrated into the shared in-game renderer. Accessories retain accent tinting and headgear visibility handling.

- Generated directional eye and skin-detail artwork now covers eyes, scar, freckles, briar, sun and tide markings. Eye anchors follow hairstyle; short, tied and long hair were visually inspected after alignment corrections.
- Plate, leather and cloth now have 72 generated motion frames: four directions with idle, two stride poses, passing, anticipation and strike. All 23 chest/leg equipment items resolve to these shared sheets. Torso and leg pieces remain independently selectable; underlying base boots are clipped when motion legwear is ready.

## Validation

128 JavaScript modules and 482 relative imports pass checks. Nineteen protected gameplay files match the baseline; combat.js and combatActions.js contain the separately authorized recovery changes. Atlas checks pass bounds, padding, nonempty cells and binary transparency for 723 cells. Animation checks pass 126,284 samples across 19 weapon moves and 56 skills, including finite values, recovery endpoints and input immutability. Numerical checks do not establish visual quality.

The combat workshop rendered 2,240 samples covering 56 skills, both bodies, four directions and five action times without changing review actors. Male/female bow poses were inspected. The dungeon gallery state variants were inspected. Creator accessories and all three cloaks were reviewed through the production creator; full-body framing was inspected at desktop and compact size. The final full-width compact preview was also verified at 800 by 700 pixels. A screenshot is saved as creator-preview-review.png. Creator review is available at /creator-lab.html; it uses an isolated actor and does not save a profile. An earlier UI check created the separate test profile Creator Art Review; existing ART TEST was not modified.

Earlier scene smoke checks passed six real scene constructors. They do not certify full combat, quest or save progression. The latest dungeon and creator changes have not had a full playthrough.

## Remaining work

- Bespoke identity for shared equipment, enemy variants and individual NPC costumes.
- Equipment/cosmetic fit across all hairstyles, gear combinations, poses and directions; cloak cloth motion and cast/bow frame transitions need further visual refinement.
- Facial hair now has generated directional art. Generated facial-feature alignment still needs exhaustive hairstyle and action checks. Helmets remain directional art attached to the head; they do not have bespoke motion sheets.
- Some walls, terrain edges, persistent spell hazards and other stateful renderers remain procedural. Legacy renderers remain as loading/failure fallbacks.
- Full progression and encounter review, damage/death animations, exhaustive inventory/tooltip and responsive creator testing.
- The inventory manifest contains rendering helpers as well as visible assets; its entry count is not a count of missing images.

The full no-placeholder conversion is not yet finished.

## Latest review limits

The armor workshop at /armor-lab.html uses 24 isolated actors covering both bodies, three armor families and four directions. Male attack and female walking poses were inspected, with all 32 runtime sheets loaded and actors unchanged. Final run/female-attack checks and remaining creator face combinations were interrupted by a browser URL-policy rejection. No workaround was attempted. No new final browser screenshot was captured for this pass; creator-preview-review.png predates the eye and armor changes. Six frames per direction do not provide bespoke armor poses for every individual skill, and transitions still need visual refinement.

## Articulated melee swing pass — 26 September

Generated nine modular arm pieces (leather, steel and cloth upper arms, forearms and gloves), preserved the source and prompt, and added reproducible atlas packing. Melee characters now use continuous shoulder/elbow/wrist articulation with the weapon and gripping glove sharing the same wrist position. The renderer removes baked arms while this art is loaded, preserves skin tinting, and retains separate torso/leg equipment. Long weapons keep both hands on their handle. Staff melee moves use articulation while authored spell poses remain separate.

Removed the early strike-angle plateau, corrected the double reversal of the second sword combo swing, added direction-aligned thrusts and a downward slam angle. Existing root commitment and recovery accompany the weapon arc. Combat timing, damage, collisions and saves are unchanged; all 21 protected gameplay files still match the baseline.

Validation: 23,136 articulated samples across 24 moves including weapon aliases passed constant limb lengths, continuous wrist positions, support-hand attachment and recovery checks. The existing 126,284 animation samples also pass. Offline native-canvas renders called the production renderer for both bodies, three armor families and four directions; the 84-pose sheet and sword/scythe/staff move sheets were inspected. A 48-frame slow-motion GIF is saved as melee-swing-preview.gif. These are local renderer captures, not browser screenshots or a full gameplay test. Browser review remains unavailable following the prior URL-policy rejection. The interactive weapon-lab.html provides equipment and move selectors for in-game-scale review. Full skill transitions, unusual equipment silhouettes and live encounter feel still need review.

## Relaxed stance correction — 26 September

Restricted articulated melee arms to combat actions. Standing, walking and running once again use the original generated body arms, restoring the relaxed silhouette. The articulated swing and charge poses remain intact. Added regression assertions that combat arms are disabled for idle, walk, run, block, hit and death states across weapon families. All 23,136 melee samples and protected-gameplay checks pass. Inspected 36 offline production-renderer views spanning standing/walking/running, both bodies, three armor families and four directions; saved restored-relaxed-arms.png. Live browser review remains unverified.

## Natural attack-arm proportions — 26 September

Corrected the thin, flared combat arms. One-handed swings now preserve the original relaxed free arm instead of replacing both arms. Generated upper-arm, forearm and glove sprites render at fuller widths (8/7/6 pixels; steel upper arms 9). Joint lengths now fit the compact body: one-handed segments 9 pixels, two-handed primary segments 10 and support segments 11, with shared handle reach constrained accordingly. This removes the excess arm length that forced elbows outward. Thrust recovery returns to the same lowered wrist position.

All 23,136 joint samples pass, including an added recovery elbow-spread regression; the existing 126,284 animation samples pass. 123 modules and 467 relative imports resolve, and all 21 protected gameplay files are unchanged. Inspected local production renders at swing start/contact and the three scythe move sequences in four directions. Updated slow-motion preview: melee-natural-arms-preview.gif. These are offline renderer captures; live browser/gameplay review remains unverified.

## Back-mounted weapon system — 26 September

Implemented automatic back mounting for all 27 eligible melee/staff/scythe weapons. Attacks, test swings, heavy charging, blocking and active ability actions draw the weapon; it remains in hand for six seconds after activity. A living enemy whose active combat target is that player keeps the weapon drawn, followed by the same six-second grace period when the threat ends. Dead enemies, leashing enemies, other players' targets and safe-zone threats do not hold it drawn. Local and co-op players use independent presentation timers stored outside actors and saves.

The normal held weapon is suppressed while the generated weapon art is mounted on the back, with facing-aware layer ordering. Sword blades hang diagonally from the shoulder; staff/scythe/spear heads remain above the shoulder. This uses the existing generated weapon models; it does not add a separate scabbard illustration or a bespoke reach-over-shoulder draw animation. NPC and inventory/creator previews retain their existing display behavior.

Timer, attack, charge, targeting, supported-weapon coverage and actor-immutability checks pass. All 23,136 melee rig checks still pass. All 21 protected gameplay files are unchanged; 125 source modules and 475 imports validate. Inspected the offline 12-view sword/staff/scythe mount sheet, saved as sheathed-weapons-review.png. Interactive isolated review is available at /sheath-lab.html with a test-swing button, weapon selection and enemy-target toggle. Live browser gameplay verification remains unperformed because of the previously recorded browser policy block.

## Out-of-combat recovery — 26 September

User-authorized gameplay addition: after six seconds without attacks, active abilities, damage or a living enemy targeting the player, restore 20% maximum health per second and hold stamina at maximum. Exploration stamina spending, sprint and block drains are free during recovery; dash cooldowns and other action restrictions still apply. Combat returns to normal stamina costs. Existing slow universal healing is retained. Dead/downed/respawning actors and PvP arena participants cannot receive this fast recovery. Each actor has independent runtime recovery state, outside saved actor data.

Meaningful checks passed for healing speed, stamina spending/sprinting, cooldown boundaries, damage interruption, persistent aggression, co-op isolation, dead/downed exclusions, PvP and frame-rate independence. This addition intentionally changes combat.js and combatActions.js; their reviewed hashes are recorded in authorized-gameplay-changes.json. The remaining 19 previously protected gameplay files still match the original visual baseline. Module checks pass for 126 modules and 478 imports. Live gameplay verification remains pending.

## Recovery integration correction

Reproduced the reported failure through updateCombat: after ten seconds, health had only received the old slow heal and sprint stamina was depleted. The recovery call had been accidentally inserted into the single-attack wrapper, where dt was not defined, rather than the per-frame coordinator. Moved it immediately before normal healing and stamina actions inside updateCombat; removed it from the wrapper. Added a real coordinator regression that runs injured/exhausted players while sprinting, introduces a targeting enemy, then removes the threat. Health and stamina now fill outside combat, normal combat drain resumes under aggression, and fast recovery resumes after the cooldown. The new integration test passes alongside the recovery unit cases and module checks. Live browser verification is still unperformed.

## Held-weapon attachment correction

Replaced the generic held-equipment offset for non-attacking melee/staff/scythe poses with measured male/female wrist positions for every locomotion frame and facing. Side views now attach to the visible near hand, eliminating the large floating gap. Drawn weapons tilt slightly away from the body; the original generated glove is composited over the handle, without changing the relaxed arm silhouette. Authored attack/cast/bow grips and articulated melee grips retain priority; sheathed weapons do not receive hand overlays.

Inspected 32 standing/locomotion production-renderer views in held-weapon-grips-review.png and the standing/walking/running matrix. All melee-rig, sheathing and module checks pass. Live gameplay review remains unperformed; bespoke skill/gear combinations still require broader visual QA.

Extended the held-grip review to all 27 eligible weapon item models in all four facings (108 views). Inspected all three held-weapons-page images, including knives, maces, swords, staffs and scythes. Original relaxed arm silhouettes and glove-over-handle placement remain intact. The review renderer asserts that these renders do not mutate actors. Broader action-specific visual review remains ongoing.

## Facial hair, lingering spell grounds and cloth motion

Added nine generated facial-hair views: stubble, short beard and full beard, each front/right/left, with hair-color tinting and existing headgear visibility rules. Added sixteen generated looping ground-effect frames spanning consecration, thorn brambles, cursed rifts and water pools, connected to five real effect kinds. Ground animation blends neighboring frames at seven frames per second and fades out near expiry. Existing circular gameplay radius is retained as a fine boundary. The renderer now resolves ground effects onto its actual behind layer, fixing previously invisible ground-layer brambles; generated pools no longer obscure characters from the front layer.

Cloaks now deform progressively toward their hems while their collars stay anchored. Motion follows the existing gait phase and action sway, with no separate simulation clock or actor writes. This reuses the generated cloak art, not new bespoke cloth frames.

Preserved both generation sources/prompts and added rebuild recipes. Atlas checks pass for 47 atlases / 723 cells. Offline production-renderer checks passed 12 facial-hair views, 16 ground frames, 12 cloak views, correct behind-layer routing, no duplicate front draw, unchanged effect data, bounded hem motion and fixed collar coordinates. The existing gameplay-recovery integration, 23,136 melee rig samples and module checks pass. Review files: facial-hair-review.png, persistent-ground-review.png, cloak-cloth-review.png. Interactive effect review: /effects-lab.html. No live gameplay or browser review was performed this pass. The complete overhaul remains unfinished.

## 2026-09-27 — Anatomical weapon and shield ownership

Corrected the earlier near-hand attachment rule: equipment now follows the anatomical left wrist in each generated idle/walk/run frame, including the far arm facing east and the crossing female gait frame. Applied the shared resting grip to all 44 weapon entries, including bows and magical focuses. Corrected west-facing melee shoulder ownership and matching body masking; two-handed attacks retain right-hand support. Reviewed and adjusted bow recovery and casting wrist landmarks.

Separated weapon and shield depth: the left weapon arm is behind the body facing east, while the right shield arm is in front; west reverses that relationship. Universal guard and its glow now use the right-hand anchor. Existing sheathing timing is unchanged.

Validation: 5,632 hand-ownership samples across 44 weapons and both body types; 23,136 articulated-arm samples; 126,284 animation samples; sheathing regression checks; 129 source modules and 485 imports checked. Generated and inspected held-weapon, sword attack, guard, bow-action, and staff-action contact sheets using the production canvas renderer. Live browser gameplay review remains unverified.

Review images: `weapon-handedness-review.png`, `held-weapon-grips-review.png`, `handedness-bow-actions.png`, `handedness-staff-actions.png`.

## 2026-09-27 — Armour composition and sleeve repair

Equipped chest pieces now replace the starter torso and sleeves, instead of layering over them. Generated material-specific upper arms, forearms and gloves connect the armour to the authored wrist landmarks during locomotion; combat uses the existing weapon rig, with the free arm retained in its relaxed position. Near/far arm ordering preserves the left-weapon/right-shield contract.

Equipped legwear removes the starter trousers and boots. Separate gloves prevent the pants mask from clipping the hands. A two-pixel belt overlap closes the waist for leg-only equipment. Chest-only equipment preserves unequipped trousers and boots. All readiness checks use the equipped piece's actual family.

Validation: `tools/verify-armor-composition.mjs` compares production-renderer pixels while changing underlying clothing to contrasting colours. Passed 288 full/mixed-set comparisons plus 160 chest-only/leg-only comparisons, covering both bodies and all four directions. Reviewed `armor-composition-review.png`, `armor-partial-review.png`, and updated walking/attack sheets. Handedness, melee limb/grip checks and source validation passed. No gameplay state or balance changes. Live browser gameplay review remains unverified.

## 2026-09-28 — Side-view far arm correction

Tucked the far shoulder and elbow into the torso projection for left/right locomotion. The prior front-view shoulder spacing exposed the rear sleeve beyond the body silhouette despite correct draw ordering. Profile far sleeves use a narrower projected width; wrist anchors and attack grips are unchanged. Fixed leg-only armour's far glove drawing in front when facing west.

Reviewed regenerated walking contact sheets for both bodies. All 448 armour isolation comparisons, handedness/profile shoulder checks, melee rig checks and changed-file syntax checks passed. The broader source audit stopped on an existing main.js gameplay hash mismatch; main.js was not edited for this fix, and its baseline was not changed. Live gameplay review remains unverified.
