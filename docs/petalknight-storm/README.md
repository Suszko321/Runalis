# Petalknight Thornstorm · moving petal storm

Press once to cast a seven-second storm centred on the player. The aura follows normal movement, dodges and mobility skills, without channeling, movement penalties or continued Spirit upkeep.

- **26 Spirit** before mastery discounts; **18-second cooldown**.
- **175px radius** before area bonuses. Damage pulses every **0.5 seconds**, after a short 0.25-second bloom. Every visible hostile inside the actual circle is hit; terrain and conjured walls block damage.
- **20% less incoming attack damage** while active. This uses existing combat mitigation and stacks multiplicatively with other valid defenses.
- **5% of actual damage returns as Health** during the storm: its own damage, weapons, other spells, damage over time, thorn retaliation and owned summons all use the existing damage contribution path. Injured owned summons inside the storm share 20% of the returned health, divided in proportion to their missing health; the player receives the rest. If no eligible summon is injured, the player keeps the full return. Walls block summon healing, and dead or expired summons cannot receive it. Summons can receive their share even when the player is at full health. Mitigated damage and overkill do not contribute; other players do not receive this buff. Training dummies do not provide healing.
- Player and summons share the same limit of **2% of the player’s maximum Health per second**, with **2% in reserve**. It cannot overheal or resurrect. This keeps mass enemy hits from providing an instant full heal.
- Class Expertise affects damage, protection and the drain percentage once. Duration stays exactly seven seconds. Skill mastery still levels only from earning XP while the skill is on the hotbar.

The old Petalknight channel is replaced; Original, Fae and Lifebloom Thornstorm retain their existing behaviour. Existing rose companions and Roseguard effects are preserved. One cast replaces a previous storm rather than stacking fields. Expiry, death, inactivity, changing this morph, removing the learned skill, respec and world transitions cancel its field, protection, healing and visual references.

The new pixel effect has three revolving rose-wind spirals, swirling crimson petals at several depths, hooked vines and orbiting rose buds. Its circular boundary matches the real damage radius. The centre remains clear around the player, healing glimmers are only a few pixels, and the whole storm fades in and out. Two persistent effect records follow the owner directly, preventing old circles from trailing behind movement. Dense impacts retain full damage but limit incidental impact effects to six targets per pulse.

## Verification actually performed

Eight focused combat groups cover the real cast, cooldown and resource payment; seven-second expiry; more than eight targets; following player movement; terrain and thin wall collision; five-percent healing from real storm/weapon/summon damage; sharing with injured summons and avoiding multiplied healing across one, three or twelve summons; healing limits and overkill; no resurrection; Expertise; replacement and cleanup; and recovery of the persistent effect if the ordinary effect pool evicts it.

The browser check casts the actual skill without holding a button, measures player and real-companion healing and protection, moves the player, captures both positions and verifies expiry. Eight render samples across both layers have zero camera drift; canceled storms draw nothing. The renderer stress check measures only this effect renderer, not whole-game performance. There were no browser errors or missing assets.

Related regression checks cover all Garden/Grave morphs, the handcrafted Fae skills, companion art, Gravecaller sustain, mastery, Expertise, all class morphs, Oathkeeper swords, Fellhunter, elite hazards and all 365 ability-page layouts.

[Focused combat results](verification.json) · [Browser results](browser-verification.json) · [Regression results](regressions.json)

[Try the storm](../../combat-overhaul-lab.html?skill=thornbinderThornstorm&morph=petalknight)

Backups: `backups/petalknight-storm-2026-10-13/`.

The summon-sharing follow-up also passed the existing summon regeneration checks. Individual companion healing and out-of-combat regeneration remain intact and stack normally. [Follow-up checks](summon-healing-verification.json).
