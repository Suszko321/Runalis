# Waverider identity pass

Sunken builds pressure through long fights with midnight-blue water. Cryomancer controls enemies with slows and freezing, deals prepared Shatter damage, and supports allies with protective and restorative frost. All original skill definitions and 122 other morphs remain unchanged.

## Sunken

- **Shared Depth:** damaging Sunken contacts build Depth over 20 seconds. New targets inherit the current encounter's Depth, including after a killing blow. Repeated hits in the same frame cannot accelerate the ramp.
- **Weaker opening, stronger finish:** retains the 28% opening damage reduction. At full Depth, its non-burn hits gain 50% relative to its opening and the pressure-burn coefficient rises from 0.10 to 1.20. Damage is bounded at full Depth.
- **One burn per enemy and caster:** skills contribute independent, expiring reference powers; the strongest valid contribution drives one shared burn. Taps do not erase a still-valid charged reference, and weak hits cannot keep an expired heavy reference alive indefinitely.
- **Room to reposition:** a burn expires within three seconds of its own source's last hit. Encounter Depth survives up to five seconds without a qualifying hit, then resets. Healing and the pressure burn itself cannot build or refresh Depth.
- **Readable progress:** a blue Depth percentage appears in the actual player frame. Pixel pressure rings and rising bubbles grow with Depth, alongside the existing dark-water skill effects.
- Existing costs, shapes, charge behavior, channel lifecycle, Flow, Soaked, healing, resource restoration and protection remain intact. Switching or removing a source clears its contribution; death, inactivity, respec and world changes clean up transient state.

## Cryomancer

- Three spaced Chill applications still prepare Brittle. Normal enemies briefly freeze, elites freeze for less time, and bosses resist immobilization. The shared recovery window still prevents repeated freeze locks.
- Prepared Shatter hits now deal **50% extra damage**, up from 40%. The small secondary shard burst uses 24% of reference power, up from 18%; it does not recursively trigger more freezes or Shatters.
- Frost slows last longer, including against bosses, without cancelling boss or elite telegraphs.
- Aimed frost fields land on the nearby visible threat rather than always overshooting it at maximum range. Their exact visible circle is the damage boundary, and every enemy inside can receive the field's pulse. Fields replace their previous cast rather than stacking.
- **Restorative Rime** heals, gives its existing modest ward, and clears movement slows and accumulated elite frost from eligible nearby allies, including allies already at full health.
- **Glacial Sanctuary** performs that cleanse on each restoration pulse for allies inside its circle. Cover, range, death and inactive allies are respected. Poison and fire are left to other cleanses.
- Crystal Aegis remains protection rather than a free offensive freeze. Glacial Glide retains three movement uses. Frost Mirror retains bounded reactive control. Fast frost projectiles now check their whole path against thin temporary walls.

## Skills

| Original skill | Sunken | Cryomancer |
|---|---|---|
| Water Torrent | Abyssal Torrent | Frost Shard |
| Bubble Ward | Pressure Shell | Crystal Aegis |
| Mending Current | Stillwater Mend | Restorative Rime |
| Tidal Cut | Drowned Edge | Shattering Blade |
| Riptide Step | Undercurrent Slip | Glacial Glide |
| Drowning Pressure | Crushing Depths | Icebound Spires |
| Wellspring | Blackwater Spring | Glacial Sanctuary |
| Deluge Crown | Crown of the Trench | Crown of Winter |
| Maelstrom | Abyssal Maelstrom | Whiteout |
| Undertow | Drowning Undertow | Permafrost |
| Pressure Spear | Trench Spear | Glacial Lance |
| Tide Mirror | Mirror of the Deep | Frost Mirror |

The Hydromancy tree still offers a starting damage/support doctrine. Later pressure, healing, mobility and sanctuary skills can now be learned together, retaining their original costs and IDs. Riptide Duelist's redundant extra dash charge has become 16% faster recharge; the movement skill already receives three uses from the preceding combat-tempo pass. Existing purchases and spent points remain valid.

## Controlled measurements

Level 33, mastery 20, unchanged starting gear, no passive build, abundant Spirit, tap casts and real cooldowns. Targets and caster are pinned before each simulation step to isolate output from movement. These are stationary balance fixtures, not full builds, live enemy fights or FPS benchmarks.

| Forty-second boss fixture | Before damage | After damage | Change |
|---|---:|---:|---:|
| Original Water Torrent | 3,484 | 3,484 | unchanged |
| Original four-skill caster | 10,320 | 10,320 | unchanged |
| Sunken Water Torrent | 5,157 | 6,019 | +16.7% |
| Sunken four-skill caster | 11,732 | 13,233 | +12.8% |
| Cryomancer Frost Shard | 3,351 | 3,351 | unchanged |
| Cryomancer four-skill caster | 7,815 | 9,129 | +16.8% |

Sunken's Torrent fixture dealt 488 damage during the first five seconds and 908 during the final five seconds. The Cryomancer caster fixture maintained a movement slow for 38.1 of 40 seconds, versus 19.8 before, with **zero seconds of boss freezing**. Normal-enemy fixtures still show brief freezes with recovery. These measurements demonstrate the roles in the tested setups, rather than a universal ranking across equipment or mixed builds.

## Verification

- 15 new identity checks: exact protection of all original skill definitions and 122 other morphs; 24 authored forms; 72 single casts; 12 forty-second fights; target transitions and kills; source expiry; cleanup; healing/cleansing; cover; exact area boundaries; thin temporary walls at 60 and 10 updates per second; skill-tree access; save/load; and retained faster combat/movement charges.
- All 29 existing class, morph, damage, summon and expertise regression suites pass.
- All 24 existing gameplay/browser suites pass, including enemy visibility, pursuit, separation, density, world persistence, progression and loot.
- Both existing Waverider browser suites pass: twelve Sunken and twelve Cryomancer casts, real Freeze/Shatter preparation, four distinct frost audio cues, and camera anchoring.
- The new browser test captures Depth at 0%, 51% and 100%, verifies its real HUD, carries full Depth to a fresh target, and checks the cleanse plus nine pixel-anchoring cases. It uses sixteen enemies and preserves Maelstrom's existing twelve-target cap.
- The previous combat-tempo verification still passes all 13 checks and 227 profiles. Fellhunter and Oathkeeper identity suites still pass. Creator descriptions fit all 42 layouts; the expertise UI passes 18 class/viewport checks.

Two old Sunken fixtures were extended past twenty seconds to test the new full ramp. Their healing check compares against the original form's passive recovery over the same longer duration. Historical snapshots were retained; the old Oathkeeper/Fellhunter protection checks explicitly defer only these 24 Waverider forms to the new 122-form protection snapshot.

Long live encounters, cooperative builds, extreme equipment and subjective combat feel still benefit from hands-on playtesting. No campaign frame-rate or loading improvement is claimed by this balance pass.

## Artifacts

- [Visual skill review](index.html)
- [Before](before.json) and [after](after.json) measurements
- [Identity verification](verification.json)
- [Browser verification](browser-verification.json)
- [Protected definitions](protected.json)

Baseline source and tools were preserved before implementation at `C:/Users/austi/.codex/backups/runalis-waverider-identity-2026-10-27/`.
