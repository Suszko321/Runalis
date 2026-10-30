# Runalis - Original Land Expanded

## Play remotely and publish updates

Play: **https://Suszko321.github.io/Runalis/**  
Repository: https://github.com/Suszko321/Runalis

Keep developing on the office laptop with VS Code and Live Server as before.
Commit your changes and push `main` (VS Code Source Control → Commit → Sync
Changes). The **Deploy Runalis to GitHub Pages** action automatically publishes
the current game. Wait for the green check on GitHub's Actions tab, then refresh
the bookmarked play URL on any other laptop. If a browser still shows an older
version, use Ctrl+Shift+R. No server or development tools are needed to play.

You can also open Actions → Deploy Runalis to GitHub Pages → Run workflow →
main → Run workflow to republish manually. If Pages ever needs reactivation,
open repository Settings → Pages → Build and deployment → Source → GitHub
Actions. The repository must remain public for Pages on the current free plan.

Player saves stay in each browser's local storage. Localhost and the hosted
site have separate saves, and progress does not transfer between laptops.

The current runtime uses Canvas 2D, native JavaScript modules, and browser audio;
there is no Babylon.js dependency or framework build to install. Actions runs
`node tools/prepare-pages.mjs` to validate exact filename case and resource paths
and stage only playable files in `_site/`. Documentation, lab pages, backups,
temporary captures, art working files, and local settings are not published.
The original nested `Runalis/` upload is retained in repository history.
Run `npm ci` once to install the pinned build dependency. For a local package
check, run `node tools/prepare-pages.mjs`. Deployment bundles the startup modules
into one download so mobile browsers do not need hundreds of module requests.
For a browser deployment smoke test, run `node tools/verify-pages.cjs`, using
the existing `RUNALIS_NODE_MODULES` convention to locate Playwright.

## Moment-to-moment gameplay — October 25, 2026

Ordinary encounters now have local flanking, caster screening, firing-lane
repositioning and bounded retreat. All six classes gain distinct dodge/mobility
feedback using their existing skills and morphs. Five persistent Echoryn
discoveries connect exploration to upgrade materials, professions, scrolls and
real location/set clues. See the [implementation and verification report](docs/moment-gameplay/README.md).

Run `node tools/verify-moment-gameplay.cjs` for the 24-suite gameplay regression
gate, including browser checks and recorded frame/retained-memory measurements.

## Player-led world art — October 18–19, 2026

The original 64 × 80 player is retained. Main creature/boss atlases now have 113
redrawn frames, forests have clustered foliage and six larger native tree exports,
and continental scenery uses native pixel detail. Actors, trees and props share
ground-depth ordering, with ground effects and loot kept above floor dressing.

Open the [rendered before/final gallery](docs/world-art/index.html) through the
local preview server. See [implementation, preservation checks, performance and
remaining limits](docs/world-art/IMPLEMENTATION.md) and the
[player-based art direction](docs/world-art/ART-DIRECTION.md). Original files are
retained in `backups/world-art-2026-10-18/`.

Run `node tools/verify-world-art.cjs` and
`node tools/verify-world-art-enemies.cjs` for the dedicated checks.

## Performance investigation — October 12, 2026

Startup now constructs the required destination, closed menus avoid repeated
rebuilds, and static dungeon ground and shared character data are cached. The
[performance assessment](docs/performance/README.md) includes original/final
startup, frame-time/FPS, first-visit and memory measurements, CPU profiles,
visual comparisons, and remaining cold-loading risks. World scale, encounter
density, effects and combat timing are preserved.

Run `node tools/profile-runalis.cjs current` for profiling or
`node tools/verify-performance-regressions.cjs` for the logged regression gate.
Browser checks use the existing `RUNALIS_NODE_MODULES` dependency convention and
the local server on port 8768. The gate explicitly records one original-source
failure in the obsolete whole-map Echoryn fixture.

## Progression and combat — October 5, 2026

Combat Level now earns independent XP. Encounter rewards train six core attributes
and five combat proficiencies, with exactly two +25% affinities per class. Attacks,
movement and charging are faster; scaling and mastery remain controlled. Ilyra in
Orrakai sells permanent skill scrolls, including a universal Wolf Summon. Demonseed
now unlocks a deliberate Demon Summon instead of spawning demons automatically.

The catalogue contains 89 active abilities. Save schema 18 preserves legacy
progression and rebases ability cooldowns on reload. See [the detailed implementation
and validation report](docs/progression-overhaul/IMPLEMENTATION.md), including
formulas, save behavior, measured results and remaining balance/quality limits.
Try [the save-free combat proving ground](combat-overhaul-lab.html), which starts
paused, or run `node tools/verify-progression-overhaul.mjs`.

Wolf and Demon now use the existing four-frame pixel atlases with distinct allied
palettes: icy blue/silver for Wolf, violet/turquoise for Demon. See [the animation
and palette comparison](docs/progression-overhaul/companion-art.html).

## Skill trees — October 4, 2026

All 16 trees now fit in an expanded single-page view with actual prerequisite
arrows, ordered tiers, visible branch choices and four new permanent passives per
tree. Existing purchases are preserved. See [the revision and previews](docs/skill-trees/README.md).
Run `node tools/verify-skill-trees.mjs` for progression checks.

## Combat overhaul — October 2026

Four active slots, persistent contribution-based ability mastery, shared channel lifecycles, class mobility and 29 new class techniques are integrated into the game. That pass delivered 85 active abilities; the October 5 progression pass expands the catalogue to 87. Existing disciplines, passives, use charges and hold charging remain separate.

Every active skill has a different icon, and every passive/weapon-tree skill has an individual emblem. The [skill-art gallery](docs/combat-overhaul/skill-art.html) shows icons at HUD sizes and links directly to playable casts. See [the presentation pass](docs/combat-overhaul/SKILL-ART.md) for animation/effect changes and checks.

Open [the save-free combat proving ground](combat-overhaul-lab.html) on the local server to try every class. See [the screenshot and cast gallery](docs/combat-overhaul/index.html), [implementation and remaining quality work](docs/combat-overhaul/IMPLEMENTATION.md), and [architecture audit](docs/combat-overhaul/AUDIT.md). Run `node tools/verify-combat-overhaul.mjs` for the combat regression suite. Final art refinement, long-term balance and PvP support for the additions remain open.

## Echoryn Forest reconstruction — October 2026

Act I now follows authored roads, waterways, stair-connected terrain and impassable forest masses. The Orrakai-to-orchard proof corridor expands into distinct regional scenes, a bridge with a lower-bank crypt, working river camps, natural root descents, old burial terrain and separate Veyr/Red Seal architectural silhouettes. Existing narrative IDs, encounters, dungeons and branching POI state are preserved, with safe legacy-position migration.

Open `world-lab.html?scene=Echoryn%20%C2%B7%20Hollow%20Road` and choose **Walk Hollow Road** for a save-free journey. See [the master layout](docs/echoryn-reconstruction/master-layout.svg), [regional screenshot gallery](docs/echoryn-reconstruction/index.html), and [implementation, checks and quality limits](docs/echoryn-reconstruction/IMPLEMENTATION.md). Run `node tools/verify-echoryn.mjs` and `node tools/verify-echoryn-followers.mjs`.

## Orrakai reconstruction — October 2026

Orrakai now has three stair-connected wards, seven enterable buildings with separate rooms, local roof and wall cutaways, physical furniture and cliff collision, and a modular environment art kit. Existing NPCs, services and narrative IDs are retained. Legacy town positions migrate safely, and tower returns restore the complete town.

Open `world-lab.html?scene=Orrakai` on the local server for a save-free walk-through; choose individual interiors from the scene menu and use **Collision / rooms** to inspect geometry. Run `node tools/verify-orrakai.mjs` and `node tools/verify-world-overhaul.mjs`. See [the reconstruction report](docs/orrakai-reconstruction/IMPLEMENTATION.md) for screenshots, measured performance, validation coverage and remaining visual work. Its initial frontier gate was superseded by the requested Echoryn reconstruction; town art refinement remains documented there.

## Lexicon UI — September 28, 2026

The shared interface now uses painted iron bindings, vellum detail pages, manuscript typography and shrine character previews. See [implementation and validation](docs/ui-overhaul/IMPLEMENTATION.md) for coverage, screenshots, behavior fixes and remaining hands-on checks.

## World overhaul — September 27, 2026

Eight authored landscapes now reshape the frontier, alongside regional micro-locations, discoverable Nav Stones, persistent exploration, regional gathering, weather, ambient life and purpose-driven dungeon dressing. The new places include Cinder Terraces, Bellwater Cloister, the Hanging Quarry and the Rootbound Chapel. Existing story progression and entrances remain intact.

Open `world-lab.html` through the local server for a save-free tour. See [the world report](docs/world-overhaul/IMPLEMENTATION.md), [initial audit](docs/world-overhaul/WORLD-AUDIT.md), and [installed asset inventory](docs/world-overhaul/ASSET-INVENTORY.md). Validate the world with `node tools/verify-world-overhaul.mjs`.

This build preserves the original Runalis gameplay and adds an integrated pixel-art presentation pass.

## Visual production — September 2026

Nine atlases now supply directional characters, standard enemies, Act One bosses, props, terrain and shared icons. See [the production report](docs/visual-production/PRODUCTION-REPORT.md), [art bible](docs/visual-production/ART-BIBLE.md) and [coverage manifest](docs/visual-production/manifest.csv) for delivered work, validation and remaining gaps. The full visual overhaul is not yet complete.

Launch with `python tools/serve.py`, then open `http://127.0.0.1:8766/`. The same server exposes `art-lab.html` for pose/equipment review and `scene-lab.html` for scene checks. These review pages do not save player profiles.

## Earlier prototype history

- Added a main menu.
- Added profile creation, loading, and deletion.
- Added profile-based localStorage saves.
- Added ESC pause menu.
- Added Save, Load, Save & Quit.
- Kept the original map generation and biome colours.
- Kept the original simple canvas-drawn resource/enemy aesthetic.
- Updated the player and human/NPC models only, so they read more like small hooded RPG characters while remaining simple and scalable.

## Controls

- WASD / Arrow Keys: Move
- E: Interact / gather / talk
- Space: Melee attack
- Q / R / X / 4 / F (or 1–5): Equipped active abilities; hold supported channels, release to stop
- F: Fifth ability slot (Block by default); hold Block to defend. Keeping it equipped grants +25% Defence XP.
- Alt: Dash (Shift in the combat proving ground)
- Shift: Sprint in the main game
- Controller RT / Y / X / LB / LT: Five active abilities; LT starts with the replaceable Block skill; RB: Attack (hold for heavy); A: Interact
- ESC: Pause

## Notes

Use a local live server from VS Code or equivalent. Open `index.html` through the server.
