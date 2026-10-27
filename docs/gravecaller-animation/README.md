# Gravecaller movement pass

All greater lich forms, lesser bound forms, and equipped skeletal servants now use a shared movement cycle driven by simulated distance. The cycle includes foot contacts between the two authored strides. Integer body offsets align the torso through the different silhouette bounds of each frame; the original pixels and body proportions are preserved.

The greater Specter glides with a trailing cloak and a quiet float. Lesser specters retain a melee walking gait. Facing has a short turn hysteresis and keeps its last side during vertical travel. Small collision/formation corrections do not trigger walking in place. Pausing freezes movement, floating and attack recovery. Recall teleports do not advance the stride, and sprint/dash catch-up caps animation cadence.

Open `movement-preview.html` through the local game server to compare all nine appearances in motion. Controls preview walking, idle, attacks, both facings, and faster travel.

Verification: `verify-gravecaller-animation.mjs` exercises animation timing, foot contacts, stops, facing, gliding, pause behavior, recall and real following for all eight forms. The browser check renders continuous movement and checks mixed groups stop and settle. Existing lich, bound-servant, spacing, collision, combat-role and movement-speed checks also pass. The gallery and verification JSON files are retained beside this note.
