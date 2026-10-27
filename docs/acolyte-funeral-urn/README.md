# Acolyte Funeral Urn

Implemented 2026-10-18. Only the Acolyte morph of Funeral Urn has been redesigned.

## Behavior

- Tap to throw a ceramic spectral urn 240 world pixels along the aim direction. The visible flight lasts 0.36 seconds and stops at terrain, including walls raised after launch.
- Each urn breaks into three independent ghosts. They seek visible enemies within 250 pixels of the landing point, spread around targets, and retarget when an enemy dies.
- Each ghost lasts at most four seconds and strikes up to four times, with a 0.65-second attack interval. Attacks briefly weaken enemies.
- Base cost is 9 Spirit and base cooldown is 0.85 seconds. Additional casts overlap rather than replace earlier ghosts. Ordinary cooldowns permit several simultaneous groups; an eight-group safety limit bounds deliberately reset cooldowns.
- Ghosts cannot chase indefinitely or attack through walls. Runtime effects clear on death, morph changes, and world changes.
- No new lifesteal or mastery from casting/hitting has been added. Mastery continues to come from earning XP with the skill assigned to the hotbar.

The art includes an arcing pixel-art ceramic urn, shatter fragments, three animated filled ghost poses, spectral trails, attack streaks, and fade effects. Throw, shatter, and impact have separate sound cues. The abilities panel explains overlap, lifetime, strike count, and seeking range.

## Verification performed

- `verify-acolyte-urn.mjs`: nine simulation groups covering flight, overlap damage, target selection, retargeting, static and newly raised walls, expiry, strike limits, attribution, Expertise, cleanup, and bounded effect counts. All passed.
- `verify-acolyte-urn-browser.cjs`: real combat lab casts produced three ghosts after landing and six ghosts after a second overlapping throw, damaging two targets. Expiry and audio hooks passed with no browser errors or missing resources. Screenshots were visually inspected.
- Seventeen art phase checks confirmed stable camera-relative geometry and alpha. RGB comparison permits one channel-value of browser blending roundoff.
- Throw, shatter, and impact audio were rendered and checked for distinct, nonzero, unclipped output.
- A renderer-only sample with 24 ghosts over 100 frames measured a 1 ms 95th-percentile render time in the test browser. This is not a whole-game performance benchmark.
- Existing Acolyte Host, Acolyte Soul Siphon, Gravecaller sustain, garden/grave protection, Rose Mantle, and elite hazard checks passed.
- Abilities visibility passed 305 layouts at five screen sizes, without errors or missing resources.

The protected garden/grave snapshot explicitly exempts this newly authorized Acolyte Funeral Urn change; the remaining 41 protected ability definitions still match their baseline. Two older test fixtures were adjusted to respect the temporary retirement of Lightbringer and Classless while retaining legacy-save coverage.

Backups are in `backups/acolyte-funeral-urn-2026-10-18/`. Machine-readable reports and captured screenshots accompany this file.

[Open the combat lab](http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerFuneralUrn&morph=acolyte)
