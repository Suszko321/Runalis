# Blighted Grove — The Bound Garden

The Hearthmere Blighted Grove now has an authored single-floor route and its
own quest, **The Last Lullaby**. Other regional groves and side-zone types keep
their existing generators.

Edda, a speaking skull at the entrance, asks the player to release three
children preserved by a corrupted protective vow. Cradle Hollow, the Drowned
Garden and the Mourning Stones have different environmental scenes and guarded
binding roots. Each memory has its own account. All three unlock the crownward
passage. Edda gives the final quest conversation after the boss dies.

The Mother of Briars is a stationary mother-tree with a pale mask, cradle
antlers and an exposed amber heart. Her native 60×80 pixel sheet is exported at
`assets/art/sprites/dungeon-grove-mother.png`. Six animation rows have sixteen
timed cells each: idle, anticipation, execution, recovery, hit and death.
It uses the shared sprite cache and enemy attack-presentation clocks.

Boss attacks:

- **Cradlebreaker:** a committed, aimed cone. Leave its arc and punish recovery.
- **Names Beneath Your Feet:** root eruptions lock onto living party members at
  the start of the tell. Later phases add adjacent eruptions.
- **The Hollow Embrace:** a large ring leaves a safe inner circle.
- **A Garden of Teeth:** parallel briar lanes leave clear movement channels;
  the last phase adds another lane and widens the danger zones.

At 67% and 33% health, later mechanics unlock and recovery windows shorten.
Attacks run serially, use the same geometry for tells and damage, and respect
normal armour, blocking and dodge protection. The difficulty is intended for
prepared characters around level 5; balance still benefits from human playtests.

Crossing the final threshold seals the party in with physical barriers. Normal
side-zone exits are blocked during combat. Party defeat resets the boss to full
health, clears pending attacks and preserves completed memory bindings. Victory
removes the seal and allows the normal exit. A combat save reload preserves the
seal but restarts warnings with a safe grace period. Old procedural Grove
instances migrate at the entrance, and old repeatable-instance records reset.
Quest rewards are claimed once; ordinary repeatable side-zone rewards retain
their existing rules.

Validation:

- `node tools/verify-blighted-grove.mjs`: entry, dialogue, radius-aware route
  reachability, guardian requirements, three memories, save/load, sealed
  movement/exits, all four attacks, phase changes, wipe reset, real boss death
  handling, epilogue, rewards and return to the overworld.
- `node tools/verify-blighted-grove-browser.cjs`: production entry through the
  physical entrance, quest completion, boss arena, mid-fight reload and exit;
  screenshots and sprite-sheet export, with no browser errors.
- `node tools/verify-enemy-density-review.mjs`: eleven shared combat, instance,
  tower, reward and regional-scaling regressions. A fresh elite-state reset now
  also clears its stale attack-pause timer.
- Main campaign and quest-interactable audits continue to pass.

Automated flow checks reposition the player and set enemy HP to zero to exercise
death handling. They validate progression and damage rules, not a manual
combat-clear or every possible build. The boss sprite and arena have also been
visually inspected in the running game.
