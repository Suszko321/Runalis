# Summon roles and shared positioning

Greater Lich, Ghostly Specter and Undead Pharaoh fire long-range magic. Their AI keeps a comfortable distance, retreats from nearby visible hostiles even when holding aggro, and continues firing during retreat when the target remains in range and visible. Their 230-260 unit attack ranges now also inform target acquisition.

Goliath Deathknight and all bound-servant morphs fight in melee. The bound mummy now delivers its stacking curses through close-range strikes instead of ranged bolts. The original single skeleton also uses melee range. The original Commander Vanguard and Reaver remain melee; the original Marksman retains its equipped bow role. Health, damage, equipment bonuses, mastery and individual ability cooldowns remain independent.

Every active companion shares one following formation around its owner, regardless of its ability, kind or morph. New groups choose free spawn positions immediately. Stable shared slots and local separation spread out companions that start stacked in an old save or converge during combat. Combat positioning uses shared melee and ranged ranks. Temporary companions participate; nearby co-op players and their living companions are also considered for local spacing.

Placement searches for open actor-sized floor and respects walls, line of sight and nearby companions. Larger goliath bodies receive extra clearance, and vertical spacing accounts for tall sprites extending above their feet. Narrow doors use tighter physical clearance and a stable passage priority so presentation spacing does not deadlock a group. A bounded local route search guides actors through suitable openings, with terrain collision throughout. Faster followers cap the last step to the distance remaining so they settle without oscillating past their slots. Existing owner-relative movement speed bonuses remain intact.

Individual summon-family indices remain separate from the shared following indices, preserving pack healing and other passive rules. Route caches use a WeakMap outside saves and invalidate when the world, destination or available route changes. Loading previous ranged bound servants updates their melee reach without rebuilding health, damage or gear stats. Extremely tight spaces can temporarily compress spacing while companions pass through; they spread out where floor space allows.

## Verification

- `tools/verify-summon-positioning.mjs`: 13 integration checks. Real long-range casts and retreat for all three greater caster forms; melee pursuit for the two goliaths, skeleton, bound specter and mummy; four separately assigned summon abilities; eight mixed saved actors starting stacked; walls and a narrow passage; ranged combat near a wall; combat separation; temporary/co-op companions; family healer indices; empty-floor selection; crowded melee attacks; and fast-follow settling.
- `tools/verify-summon-positioning.cjs`: isolated browser checks for the original two-ability overlap case, four different ability groups, the three casters keeping range, both goliaths fighting in melee, and mixed followers near a wall. No missing assets or browser errors.
- Regression checks passed for persistent liches, bound henchmen, Fae summons, hotbar mastery/morphs, summon speed and the combat overhaul.

Results are saved in `verification.json` and `browser-verification.json`. Review images: `two-abilities.png`, `following.png`, `pharaoh.png`, `specter.png`, `lich.png`, `goliaths.png` and `wall.png`.

Save and refresh the game to load the update. Existing companion art and hotbar bindings are preserved.
