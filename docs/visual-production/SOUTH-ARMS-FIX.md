# South-facing equipment arms — October 5, 2026

Equipped walking and running used front-facing shoulders at ±7 pixels and
wrists around ±8.5 pixels. That placed the sleeves and hands over the chest,
although the unequipped south-facing art keeps its wrists at ±13 pixels.
Idle equipment also started its shoulders too close to the neck.

The shared relaxed front-arm pose now follows the unequipped body's wrist
landmarks, including its walking frame heights. Shoulders attach at the sides
and elbows descend toward the hips. Both idle equipment and south-facing
locomotion use this pose. Leather, plate and cloth retain their existing sleeve
textures. Combat and other facings retain their existing arm poses.

Validation completed:

- 1,170 south-facing arm cases across both bodies, all three chest materials,
  idle/walk/run and empty hands/scythe/bow. Wrist positions match the authored
  unequipped landmarks, rendered wrists remain beside the body, and drawing
  preserves actor state and canvas transforms.
- Existing 8,448 side-facing width cases and gait/grip checks.
- 288 complete and 160 partial equipment composition cases.
- 48 head/chest fit checks.
- Actual game southward keyboard movement and idle with a leather chest in an
  isolated browser profile, with loaded atlases and no browser errors.

See [the unequipped/equipped comparison](south-arms-after.png),
[the scythe grip comparison](south-arms-after-scythe.png), and
[the earlier pose](south-arms-before.png).
