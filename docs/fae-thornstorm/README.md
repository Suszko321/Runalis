# Fae Thornstorm flower field

The Fae morph plants a stationary circle at the player's cast position. It is a press-to-use ability; movement remains free after casting.

- Base radius: 180 world units (5.6 tiles).
- Base duration: 8 seconds; existing area and duration tree bonuses apply.
- Cost: 24 Spirit before mastery reductions; cooldown: 12 seconds.
- Every 0.8 seconds, living allies inside recover health and hostile enemies inside take Faerie Fire damage. There is no immediate healing burst.
- Healing scales with Warding, Defence, and ability mastery. Damage retains the Fae morph's normal damage scaling.
- Faerie Fire weakens enemies and briefly binds lesser enemies after three hits; bosses remain immune to the bind.
- Walls block healing, damage, and flower growth. Leaving the circle stops its effects on that character.
- Flowers use authored pixel art in lilac and mint, emerging in staggered growth and sinking away as the field ends. Healing has no large flashes or floating numbers.
- Temporary fields end on expiry, death, world changes, or morph changes. Recasting replaces the previous field. Saves retain the chosen morph, not a temporary active field.

The original, Petalknight, and Lifebloom Thornstorm forms retain their existing channels. Mastery continues to come from XP earned while the ability is on the hotbar.

## Verification

`tools/verify-fae-thornstorm.mjs` covers casting, healing boundaries, all enemies in the circle, terrain, cleanup, save behavior, and the other Thornstorm forms. `tools/verify-fae-thornstorm.cjs` verifies production browser rendering, growth and disappearance, healing and damage boundaries, and the Abilities description and facts. Both passed.

Existing skill morph, combat, progression, Fae summon, butterfly channel, and hotbar mastery regression checks also passed.

![Flower field](flower-field.png)
