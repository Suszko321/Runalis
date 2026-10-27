# Raise the Bound Dead: persistent henchman morphs

Raise the Bound Dead keeps its original skill ID, hotbar assignments and mastery. It now follows the persistent Summon Lich form model. Bound Servants retains its +8% summon health and damage and its place before the Commander/Lichbound doctrine choice. New characters start with skeletal henchmen; each skill's optional morph is selected independently in Abilities.

| Form | Mastery | Companion |
| --- | --- | --- |
| Original | Always available | Skeletal henchman. Commander retains the original equipped Vanguard, Reaver and Marksman bodies and attacks. |
| Cursed | 5 | Bandaged mummy strikes in melee with amber curses. Its target and up to two nearby foes receive four-second curses, stacking to three. Each tick deals 15% strike power per stack. |
| Acolyte | 10 | Ragged hooded specter attacks in melee with a short spectral sickle. Actual damage heals the owner and nearby allies by 12%, capped at 3% of each ally's maximum health per strike. Healing has only three brief motes. |
| Deathknight | 20 | Battered undead footsoldier uses a cleaver and buckler, gains health and armour, cleaves four additional forward foes for 50% strike power, draws attention, and staggers every third strike. Bosses resist the stagger. |

Without Commander, the skill raises one companion. Commander of the Dead raises three of the currently selected form. All three retain their role-specific health/damage bonuses and the stat bonuses from their own Coterie equipment. Morphed actors keep their authored spectral, bandaged or armoured bodies; the normal skeleton attachment renderer cannot replace those bodies with skeletons. Equipment changes still dismiss the group, so removed items cannot keep supplying stats; the next cast takes a fresh equipment snapshot.

All forms stay active until destroyed or dismissed. Using the skill again dismisses its entire group without another Spirit payment. Recall starts after the last companion dies or after dismissal. The original 18 Spirit cost and 12-second recall remain before mastery modifiers. The forms share Raise's mastery, hotbar assignment and cooldown. They earn mastery from XP while assigned, without requiring casts. Every companion follows the existing minimum movement speed of 20% above its owner's current speed, including sprint, haste and dash adjustments.

Summon Lich remains independent. Lichbound Reaper still unlocks the separate greater companion and remains exclusive with Commander. A morphed henchman and a greater lich can coexist and be dismissed independently. These lesser morphs use smaller bodies and lower stats than their greater counterparts.

## Art and reproduction

The mummy, melee specter and lesser knight were generated with the built-in image generation tool in transparent-background mode, then packed with the project's existing nearest-neighbour atlas workflow. No CLI/API image generation fallback was used. Saved source and full production prompt:

- `assets/art/source/bound-dead-mummy.png`
- `assets/art/source/bound-dead-mummy-prompt.txt`

Production atlas and review:

- `assets/art/sprites/bound-dead-mummy.png`: four 96 x 112 cells, idle, two travel strides and hex-cast pose.
- `assets/art/sprites/bound-dead-mummy.json`: source bounds, sprite rectangles and shared foot pivot.
- `assets/art/sprites/bound-dead-mummy-preview.png`: enlarged atlas review.
- [Specter atlas](../../assets/art/sprites/bound-dead-specter.png): four 96 x 112 cells, ragged hooded skeletal sickle fighter with idle, two travel strides and melee slash.
- [Knight atlas](../../assets/art/sprites/bound-dead-knight.png): four 96 x 112 cells, battered stocky undead footsoldier with cleaver and buckler, idle, two travel strides and braced chop.
- New sprite source strips: `assets/art/source/bound-dead-specter.png` and `assets/art/source/bound-dead-knight.png`.
- Full final production prompts: [specter prompt](../../assets/art/source/bound-dead-specter-prompt.txt) and [knight prompt](../../assets/art/source/bound-dead-knight-prompt.txt).
- Each new atlas has its own JSON packing metadata and enlarged `*-preview.png`.
- These are separate authored pixel art sheets; the servant renderer never samples the greater specter or goliath atlas.
- Skeletons retain the existing skeleton and equipped Coterie pixel art.

Rebuild the three bound-servant atlases from the workspace root:

```text
python tools/pack-art.py assets/art/source/bound-dead-mummy.png bound-dead-mummy --rows 1 --cols 4 --width 96 --height 112 --target-height 84
python tools/pack-art.py assets/art/source/bound-dead-specter.png bound-dead-specter --rows 1 --cols 4 --width 96 --height 112 --target-height 84
python tools/pack-art.py assets/art/source/bound-dead-knight.png bound-dead-knight --rows 1 --cols 4 --width 96 --height 112 --target-height 88
```

The three new forms have four distinct animation frames, mirrored left/right facing, nearest-neighbour rendering and a thin dark pixel outline. All three atlases have binary transparency and clear margins around every cell. Effects share the lich's stepped pixel trails, quiet mint healing, amber curse marks, mint sickle slashes and subdued green cleaver sweeps, with damage attributed to Raise the Bound Dead.

## Verification

- `tools/verify-bound-dead.mjs`: 23 checks covering legal tree purchases, mastery gates, all four forms as a single summon and Commander trio, persistent lifetimes, actual combat, source attribution, gear bonuses, group dismissal/cooldowns, healing caps, curse limits/cleanup, knight cleaves/boss resistance, walls, friendly actors, old saves, save round trips, hotbar XP and independent greater-lich controls, melee pursuit for every Commander role, lesser-versus-greater strength and migration of old ranged specters.
- `tools/verify-bound-dead.cjs`: actual browser rendering with Coterie gear present, four distinct frames for every new morph, both facings, real Commander casts, asset loading, Abilities mastery gates, mouse/controller selection, canonical hotbar assignments and Commander tree copy. No browser errors or missing assets.
- Regression checks passed: 17 greater-lich checks, 96 summon movement scenarios, 216 optional morphs with 648 real casts, 57 combat checks, 24 loot/equipment checks and 10 Fae summon checks.
- `art-verification.json`: transparent atlas and frame integrity.

Review images: [lesser-versus-greater comparison](lesser-versus-greater.png), `animation-gallery.png`, `abilities.png`, `commander-tree.png`, and each `*-in-game.png`. The isolated proving ground can be opened at `combat-overhaul-lab.html?skill=summonLich&morph=cursed`, with `acolyte` or `deathknight` for the other forms. Its review controls can unlock mastery without touching player saves.

Existing living skeletons retain their current health, stats and original appearance when loaded. Stored morph choices remain selected and apply to the next cast; living bodies are not silently converted during save migration. Save and refresh the game to load the update.

Saved servant specters from the previous release migrate to melee range once, preserving current health, damage, armour, equipment and group count. Both new bodies apply on refresh; greater lich morphs keep their existing art and combat behavior.

All servant morphs now use melee range, including the mummy. The original single skeleton is melee; the original Commander Marksman retains its equipped bow role. Summons share spacing with other active ability groups; see [positioning changes](../summon-positioning/README.md).
