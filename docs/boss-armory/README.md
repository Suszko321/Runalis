# Boss armory, cross-class finds and book focuses · November 1, 2026

**Loot-policy update:** the subsequent [universal gear itemization system](../gear-itemization/README.md) supersedes the exclusive16%/8% boss pools described below. These eight bases now join the full pool available to every eligible enemy, with per-copy rarity and the20-slot gear bag. Art and focus projectile identities remain. The original drop table below is historical production evidence, not the current chance formula.

Eight new rare weapons are discoverable from existing bosses. **Weapon theme is independent of a class's starter family.** A Petalknight can discover a rose scythe, a Gravecaller can use a grave maul, and a Lightbringer can carry a bow. These items use existing open equipment rules and weapon proficiencies, never new class locks or changes to starting gear.

## Finds and drop rates

| Boss family | Weapon | Book focus | Chance |
| --- | --- | --- | --- |
| Mother of Briars / Briar Titan | Rose Reaper (scythe) | Rosebound Codex | 8% each |
| Alistair Veyreign / Veyr Warden | Gravebell Maul (hammer) | Veyreign Mortuary Grimoire | 8% each |
| Malakar / Solgate Demon Lord | Cindervow Longbow | Ashen Scripture | 8% each |
| Seraphel | Dawnward Spear | Litany of the Last Dawn | 8% each |

The additional armory pool rolls once at 16%, choosing uniformly between its two items. At most one new armory item drops per matching boss. It supplements existing boss loot and does not guarantee a reward. Uses the encounter's existing seeded RNG and `enemyWorldLootGenerated` guard. Ordinary enemies, unrecognised bosses, reward-suppressed enemies and boss summons do not roll it. Drops enter the existing player-owned world loot/pickup path at upgrade tier1; the existing upgrade system governs all twenty tiers. No new save schema.

### Fresh item stats

All are rare, non-stackable weapons. Standard family attack timing, costs and progression apply to the four physical weapons.

| Item | Family / proficiency | Base damage | Power | Spirit | Armour | Focus power | Value |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rose Reaper | Scythe / Scythe | 11 | 5 | 3 | 2 | — | 145 |
| Gravebell Maul | Hammer / Blunt | 12 | 6 | 2 | — | — | 165 |
| Cindervow Longbow | Bow / Archery | 11 | 5 | 3 | — | — | 155 |
| Dawnward Spear | Spear / Warding | 10 | 5 | 2 | 3 | — | 150 |
| Rosebound Codex | Book focus / Spirit | 10 | 5 | 3 | 1 | 3 | 135 |
| Veyreign Mortuary Grimoire | Book focus / Spirit | 12 | 6 | 4 | — | 4 | 165 |
| Ashen Scripture | Book focus / Spirit | 12 | 6 | 3 | — | 4 | 160 |
| Litany of the Last Dawn | Book focus / Spirit | 11 | 5 | 3 | 2 | 4 | 155 |

Focus stamina cost / range / configured projectile speed: Codex7/294/420, Mortuary8/315/440, Scripture8/300/475, Litany6/302/405. Existing focus combo moves supply minimum ranges/speeds and cost adjustments, so later combo/heavy moves may exceed these item values. Rarity budgets match existing rare weapons and lenses (roughly base10–12, power5–6, focus3–4), rather than surpassing legendary gear. Material traits are descriptive; no unimplemented damage proc, healing or pet bonus is claimed. The Rose Reaper's armour and Spirit complement a Petalknight's existing defenses while its attacks train Scythe. Actual Petal Storm casting while holding it is verified.

## Every focus gets a distinct projectile

All **15 registered spiritFocus items** now select separate authored silhouettes, including the eleven existing focuses. Heavy lances use a larger, longer version of that focus's own sprite; combo/pulse shots retain it as well.

| Focus | Projectile |
| --- | --- |
| Cracked Dawnlens | Sun splinter |
| Pilgrim's Focus | Violet spirit wisp |
| Sealglass Prism | Triangular prism shard |
| Moonlit Reliquary | Silver moon crescent |
| Veyr Grave-Lens | Graveglass skull comet |
| Last Dawn Conductor | Crimson wax-seal disc |
| Sunfracture Gauntlet | Golden sunburst |
| Uncrowned Prism | Broken ivory halo |
| Spiritwood Focus | Emerald leaf spear |
| Dawncarver Lens | Narrow dawn blade |
| Everdawn Carver | Twin dawn rays |
| Rosebound Codex | Crimson rosebud with thorn leaves |
| Veyreign Mortuary Grimoire | Ivory rib-bone lance |
| Ashen Scripture | Ember quill |
| Litany of the Last Dawn | Folded vellum page |

The unused sixteenth atlas cell is a spare spirit-pearl design, not another item. New projectile identity and color are committed to the attack move and copied to the fired projectile. Switching equipment during windup/flight cannot repaint that shot. Each owner's existing projectile list carries it, including online visual snapshots. Damage, collision, costs, pierce, recovery, range and projectile lifetime remain in the existing combat system. If the projectile image is still loading, the prior generic focus renderer remains a visible fallback.

## Art production and saved files

Used **built-in ImageGen** after inspecting `reference.png`, assembled from shipped weapons-equipped, arcane-special and the real player sprite. Grounded ash/iron/bone/brass materials, selective magic, stepped dark outlines and readable native-scale silhouettes follow the Art Bible. Books have leather covers, parchment blocks, spines, clasps and bookmarks; they are actual handheld books. Original art is not overwritten.

Exact prompts: [PROMPTS.md](PROMPTS.md). Selected masters: `assets/art/source/boss-armory/roseReaper.png`, `gravebellMaul.png`, `cindervowBow.png`, `dawnwardSpear.png`, `roseboundCodex.png`, `mortuaryGrimoire.png`, `ashenScripture.png`, `dawnLitany.png`, `focusProjectiles.png`.

Runtime exports: eight PNG/JSON pairs under `assets/art/sprites/`, named `boss-armory-<itemId>`, plus `focus-projectiles.png/json`. Equipment cells96×128 have individual grip landmarks in `src/bossArmoryArtData.js`; projectile atlas128×128 has sixteen32×32 cells. Packing quantizes each item/projectile to ≤32 colors, nearest-neighbour scales it and retains hard alpha with empty borders. No generated backdrop halo enters runtime. Inventory icons and player equipment use the same individual item artwork.

Reproduce using `node tools/pack-boss-armory.cjs`, with `RUNALIS_CANVAS_MODULE` or the existing local `tmp/bat-evolution/node_modules/@napi-rs/canvas` authoring dependency. It extracts/quantizes authored art and registers grips; it does not draw substitute weapons. Source masters and PNG/JSON review evidence follow the project's ignored authoring-file policy; runtime exports and generated grip data remain project files.

## Verification

- `node tools/verify-boss-armory.mjs`: exact boss identities, exclusions, 16%/8% distribution and boundaries; **64 class/item combinations** actually equip, attack, deal damage and save/load. Real Petalknight Petal Storm works with the Rose Reaper. **15 focuses × four slots × light/heavy** keep committed identity/color after a gear swap. Actual boss death drops, duplicate-death guard, ground pickup and inventory acquisition pass.
- `node tools/verify-boss-armory-browser.cjs`: **64 player renders**, four facings with idle/attack on actual player bodies; **16 grip checks**, **120 projectile direction/crop checks**, all15 distinct alpha silhouettes, unique inventory icons, hard alpha, ≤32-color equipment and no clipped borders. No missing requests/page errors. Evidence: `runtime.png`, `projectiles-preview.png`, `browser-verification.json` here.
- Existing loot/upgrade/Mythical regression suite, weapon stance suite (53 weapons), and eight Lightbringer heavy fallback cases pass.
- Engineering gate **11/11**, build **345 startup modules; 942 files, 40.4 MiB**.

No human farming/balance session, physical-controller playtest or real network session was performed. Exact pool probabilities and deterministic behavior are tested; subjective long-term loot pacing remains a human balance task.
