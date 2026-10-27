# Hotbar mastery

Every distinct skill assigned to one of the four hotbar slots earns one mastery XP per player XP earned. This includes victory, quest, gathering, crafting, training and other XP rewards. Class XP bonuses count when they increase an earned reward.

No cast, damage, healing, shielding, movement, killing blow or active summon is required. Cooldowns and the selected morph do not affect training. Unassigned skills retain their mastery but stop earning it. Assignment is checked when the XP arrives.

Combat victory XP trains the hotbar once. Its separate proficiency allocations do not repeat that mastery reward. Co-op participants train their own bars from their own awarded XP. Useful support still helps qualify a player for shared victory XP; using a skill does not grant extra mastery.

Morphs share their original skill's mastery. Existing mastery and morph selections survive saves; no progress is reset. The mastery curve and morph unlock thresholds remain in place.

Validation: `tools/verify-hotbar-mastery.mjs`, `tools/verify-hotbar-mastery.cjs`, combat and progression regressions, skill morph execution checks, and the UI information review.
