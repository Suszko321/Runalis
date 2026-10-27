# Fae thorn companions

The Fae morphs of Summon Thornlings and Summon Elder Thornbeast now create persistent companions through the original summon system: three thornlings or one elder. Movement, targeting, collision, stats, formations, elder presence, the elder's self-healing bite, dismissal and cooldown-after-group rules are preserved. The Fae identities remain correct even when both legacy summon evolution nodes are learned.

The original four pixel art body frames are reused with a cached bright lilac bark and mint foliage palette. Every original body pixel position remains identical. A slim near-black outline is added after nearest-neighbor scaling, using cardinal neighbors to avoid thick diagonal corners against grass and paths. Small authored pixel wings animate behind the body. The source atlases remain available to original summons.

Hits replace Verdant Wounds with Faerie Fire, using the same counter as other Fae skills: two seconds of weakened enemy damage, and a brief bind after three hits. Bosses remain immune to binding. Contact effects are small pixel flames rather than a persistent aura.

Passive healing retains the original pulse rate (2.75 seconds), nearby range (145 world units), Warding scaling and one-heal-source-per-pack limit. Only effective healing displays two small fading motes at the owner's feet. There are no heal numbers, rings or healing sounds. Healing stops when the companions die or are dismissed. Full health produces no healing effect.

Save loading preserves each companion's Fae identity and original skill attribution. Hotbar XP still trains the canonical summon skill.

Validation:

- `tools/verify-fae-summons.mjs`: both groups, original stat parity, persistence beyond a minute, healing, ownership, dismissal, cooldowns, attacks, control limits, terrain and saves.
- `tools/verify-fae-summons.cjs`: live browser casts, healing, attacks and rendered sprites. Each atlas retains four distinct animation frames and exactly matches its source alpha; the Fae palette uses at most twelve colors.
- Skill morph, combat, progression, class requirement, Fae Thorn Lash and hotbar mastery regression checks.

Visual review: `animation-comparison.png`, `thornlings-in-game.png`, `elder-in-game.png`, `terrain-visibility.png` and `browser-verification.json`.
