# Five-slot hotbar and universal Block

All characters know Block from the beginning. The fifth hotbar slot defaults to Block and uses LT on controllers or F / 5 on keyboards. Block can immediately be cleared, replaced with another learned ability, or moved to any of the five slots in Skills → Abilities.

Holding the slot containing Block keeps the existing stamina-based guard: 62% incoming damage reduction before class bonuses, slower movement, stamina upkeep and impact costs, and guard breaks. LT has no separate blocking action; a replacement skill uses the normal press, hold and release pipeline. The mouse guard shortcut also requires Block to be equipped.

Keeping Block anywhere on the hotbar grants **25% additional Defence XP**, including XP awarded without casting Block. The bonus stacks with class affinity once. Block and any other fifth-slot ability also gain mastery from earned XP like the other hotbar skills.

Hotbar layout version 4 and save schema 18 preserve legacy assignments. Older three- or four-slot saves gain Block in slot five once. Explicit clears or replacements persist through normalization and saving/loading. Controller menu paging still uses the physical triggers.

Validation:

- `tools/verify-block-hotbar.mjs`: ten checks covering every class, legacy saves, immediate clearing, all four controllers, every possible Block slot, mitigation and guard breaks, LT replacements, fifth-slot channels, mastery and both direct and encounter Defence XP.
- `tools/verify-block-hotbar.cjs`: real main-game keyboard handlers, keyboard rebinding and focus loss, controller assignment/clearing, five-slot menus and six-cell combat HUD at 1440×900, 1280×720 and 800×600, and independent LT/Y skill use through the three co-op actor input pipelines. No browser errors.
- Existing combat, morph, mastery, progression, melee combo, skill art, class skill requirement, recovery, Acolyte Host and controller menu checks pass.

Results are in `verification.json` and `browser-verification.json`. The `abilities-*.png` images show the updated menu.
