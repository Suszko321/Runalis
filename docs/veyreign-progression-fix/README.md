# Veyreign progression, expansion and Nav Stone correction

## Progression failure

Blood seals were `poiInvestigation` objects while their quest objectives were
story flags. The generic quest filter matched neither and hid them from art,
radar and `nearestObject`, making normal interaction impossible. Earlier tests
called the seal handler directly and therefore missed the visibility failure.

Required floor mechanisms now have an explicit visibility contract independent
of narrative quest state. They remain available during first and repeat runs,
then disappear from interaction after activation. The seals have dedicated crimson
pedestal art and labels. Blood Stairs show 0/2, 1/2 and Unsealed states. A route
sign at each floor entrance describes the western archive, connecting galleries,
eastern chapel and northern stair. Guest activations update shared host quest
flags as well as the shared stair state.

## Larger castle

The first four floors expand from 96x90 to 144x140 tiles. Each now contains nine
rooms: entrance, reception, western guard wing, western archive, connecting
gallery, eastern court, eastern blood chapel, upper stair gallery and treasury.
There are 32 Vampire Spawns/Bat Beasts per floor (128 before the two-form boss),
compared with 12 per floor previously. Measured routes through both seals to the
stair cover approximately 394–398 tiles per floor. The treasury has guards and a
persistent side chest. The final two-form boss arena retains its established
geometry, mechanics and first-clear consequences.

Saved old floors rebuild at the expanded floor entrance. Stable seal/guard IDs
preserve activated seals, dead guards and existing wounds. Loose loot is moved
to the entrance landing rather than discarded or left inside new walls. Saved
new floors restore normally; the unchanged throne room and its active/finished
boss states are preserved.

## Safe castle Nav Stone

The castle stone has an 800-world-pixel sanctuary. Authored enemies are relocated
alive beyond it; new patrols and resident respawns cannot originate inside the
protected radius plus a buffer. Saved/generated positions are checked during
hydration, restoration and travel previews. Pursuers entering the sanctuary are
returned to a safe home. Their identities, health, quest roles and rewards are
preserved; the ward does not kill enemies or grant loot. Relocated castle guards
and the Gatekeeper remain reachable from the approach.

This keeps the normal 600-pixel travel safety rule intact while making the stone
usable in both directions, without first clearing the outside castle population.

## Verification

- `node tools/verify-veyreign-progression-fix.mjs`: collision-aware walking through
  all four floors on first and repeat runs; visible seals selected through the
  real `nearestObject`/`interact` path; guard gating; saved descent; migration;
  fresh-world inbound/outbound travel without killing monsters; spawn exclusion;
  pursuit and stale-position recovery.
- `tools/verify-veyreign-progression-browser.cjs`: walks using the collision engine,
  then real E presses break both seals and descend on all four floors. Set
  `RUNALIS_TOUCH=1` for the same checks with actual mobile interaction buttons.
  Both modes pass with saved progression and zero browser errors. Combat guard
  deaths are injected to test the progression boundary, not to claim normal-play
  victories.
- `tools/verify-veyreign-online.cjs`: real WebRTC mobile guest breaks both seals;
  host quest/stair advances; the existing two-form final choice still passes.
- Veyreign quest/boss/feral checks, main-campaign checkpoints, dungeon returns,
  continental persistence/runtime and quest-interactable regressions pass.
