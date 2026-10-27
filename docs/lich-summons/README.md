# Separate Summon Lich ability

Lichbound Reaper now grants `gravecallerSummonLich`, a new persistent companion ability. Raise the Bound Dead keeps its original skeleton identity and its existing hotbar assignment, mastery, cooldown and morph choices. Players can assign and summon both skills together. The Commander/Lichbound tree choice and existing node bonuses remain in place.

All players begin this skill in its original form. Optional morphs unlock through this skill's own mastery in Abilities, using the existing mastery thresholds and A/X/B controller flow. Assigned skills earn mastery from XP without requiring casts.

| Form | Unlock | Companion and attack |
| --- | --- | --- |
| Original | Learn Lichbound Reaper | Lich fires necrotic bolts. Every third bolt bursts against up to three nearby foes for 40% strike power. |
| Cursed | Mastery 5 | Undead Pharaoh fires amber hexes. The target and up to two nearby foes receive four-second curses, stacking to three; ticks deal 15% strike power per stack each second. |
| Acolyte | Mastery 10 | Ghostly Specter fires mint soul strikes. Actual damage heals the owner and nearby living allies by 12%, capped at 3% maximum health per ally per strike. Healing uses three quiet motes. |
| Deathknight | Mastery 20 | Goliath Deathknight has extra health and armour. Its heavy sword cleaves up to four additional forward foes for 50% strike power and draws attention. Every third strike staggers ordinary enemies for 0.3s, bosses for 0.08s. |

One greater lich can be active at a time. Reusing the skill dismisses it without another resource payment. The 16-second recall starts when the companion dies or is dismissed. Summon Lich costs 28 Spirit before mastery efficiency. Power uses Level, Summoning, Spirit, Spirit equipment, summon bonuses and this skill's mastery. All forms use terrain collision and line of sight; attacks, secondary effects and healing cannot cross walls.

All companion travel now uses a shared minimum of 20% above the owner's current movement speed (at least 246 world units/second). Sprinting, movement bonuses, haste and dash velocity raise the floor dynamically. Faster authored summon speeds remain available, and buffs do not permanently inflate saved stats. This applies to every summon kind and morph, existing saved actors, legendary/temporary companions and short-lived summoned spirits. Following and combat pursuit use the same floor; attack cadence stays independent of travel speed. `tools/verify-summon-movement.mjs` verifies 96 movement scenarios plus summoned spirit movement; results are in `movement-verification.json`.

Existing Lichbound saves automatically receive the new ability without reassignment or duplicated skill points. Existing evolved lich actors migrate to the new skill while retaining their health and stats. New characters retain the skeleton starter. A respec revokes the tree-granted new ability and its companion while retaining the skeleton starter and both abilities' mastery/morph history. Curse runtime state uses a bounded WeakMap outside save data and clears when changing worlds.

## Pixel art and provenance

The original Lich reuses the existing four-frame pixel art at `assets/art/sprites/summons-core.png`, row 3. The three morph strips were generated using the built-in image generation tool, including a final knight refinement. No fallback CLI/API image generation was used. Selected source images and production prompt specifications are saved in the project:

- `assets/art/source/lich-cursed.png` and `lich-cursed-prompt.txt`
- `assets/art/source/lich-acolyte.png` and `lich-acolyte-prompt.txt`
- `assets/art/source/lich-deathknight.png` and `lich-deathknight-prompt.txt`

Final runtime assets:

- `assets/art/sprites/lich-cursed.png`: four 96×112 cells
- `assets/art/sprites/lich-acolyte.png`: four 96×112 cells
- `assets/art/sprites/lich-deathknight.png`: four 128×144 cells, larger gameplay silhouette

Each includes idle, two travel frames and an attack pose. Every atlas has transparent padding, shared frame scale, consistent foot pivots, binary alpha and nearest-neighbor packing. Runtime adds a thin dark pixel outline and flips facing without distorting the body. New effects use stepped pixels for necrotic trails, amber curse symbols, mint soul trails and crimson sword cleaves. Metadata and enlarged previews accompany each atlas. Rebuild the atlases with `python tools/pack-lich-summons.py`, using the project's established packer.

## Verification

- `tools/verify-lich-summons.mjs`: unlocks, mastery thresholds, independent skeleton/lich controls, all four forms, attacks, bounded secondary targets, heal limits, boss control, walls, friendly actors, facing, legacy saves, save round trips, respec, hotbar XP, player death and world cleanup.
- `tools/verify-lich-summons.cjs`: actual browser rendering of all four poses in both facings, real casts, asset loading, known-skill filtering, morph descriptions/gates, mouse selection, hotbar assignment and controller morph selection.
- Existing skill-tree checks: 246 nodes and 842 legal purchases.
- Existing combat overhaul: 57 checks; Fae summon checks passed.
- Existing skill morph checks: 216 forms and 648 real casts against ordinary enemies, elites and bosses.
- Existing skill art checks: 88 distinct icons/motions and 6,336 effect renders. Production atlases rebuild identically; all three have four distinct frames, binary transparency and clear cell margins.

Results: `combat-verification.json` and `browser-verification.json`. Visuals: `animation-gallery.png`, `abilities.png`, `tree-unlock.png` and the four `*-in-game.png` files. Open the existing combat review arena with `?skill=gravecallerSummonLich`; add `&morph=cursed`, `&morph=acolyte` or `&morph=deathknight` to preview a morph. The review arena starts paused; Resume enables movement/combat.

Raise the Bound Dead now also has persistent specter, mummy and lesser goliath knight morphs. Commander raises three of the selected henchman form. See [the henchman update](../bound-dead/README.md) for its art, mechanics and verification.
