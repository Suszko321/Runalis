# Two mastery paths per class

Updated October 26, 2026. Each participating class now has two optional skill forms and two corresponding Expertise specializations. Original skills remain available.

| Class | Mastery 5 | Mastery 10 |
| --- | --- | --- |
| Gravecaller | Acolyte | Deathknight |
| Waverider | Sunken | Cryomancer |
| Thornbinder | Fae | Petalknight |
| Lightbringer | Sunscorched | Dawnblade |
| Oathkeeper | Holyknight | Sinner |
| Fellhunter | Bloodhound | Hellstalker |

There is no third subclass unlock at mastery 20. Normal skill mastery, refinement, and XP progression continue. Each skill still has its Original form, plus its own independently selected mastery forms. The end-of-tree Expertise row offers class Mastery, the first specialization, and the second specialization.

The catalogue contains 73 original participating skills and 146 optional forms. All 12 retained family definitions and all 146 resolved forms were compared with a pre-change snapshot; their costs, damage, protection, cooldowns, channels, ranges, summon settings, and descriptions are unchanged. The Original Blood Lance description was updated to match the available choices.

## Removed content and migration

The six requested paths are removed from selectable data, skill plans, creator descriptions, Expertise nodes, combat handlers, themed effects, audio branches, summon forms, and runtime sprite loading. The unused support-summon renderer and two dedicated undead sheets were removed. Simulated adventurers choose from the current catalogue.

Existing saves are normalized using morph version 3. Unsupported choices return to Original without choosing a replacement specialization. Obsolete Expertise purchases and passive references are removed, returning their spent point to the available pool. Learned skills, mastery, equipment, resources, cooldowns, and hotbar assignments remain. Unsupported summons, channels, charges and transient effects are cleared; valid remaining choices and companions persist. Earlier unlock flags cannot bypass the new mastery thresholds.

## Main files

- `src/subclassData.js`: the twelve supported paths and class ordering.
- `src/abilityMorphSystem.js`: mastery 5/10 unlocks, validation and save cleanup.
- `src/subclassVariants.js`: two-column skill plans with preserved behavior.
- `src/skillTreeSystem.js`: obsolete Expertise cleanup and point recovery.
- `src/subclassSystem.js`, `src/subclassCombat.js`: retained passive conversion and combat behavior.
- `src/gardenGraveMorphs.js`, `src/fellhunterSkills.js`, `src/lichSummonSystem.js`, `src/oathbladeProfiles.js`: supported authored forms.
- `src/creatorClassInformation.js`, `src/simulatedSubclassPlayers.js`, `src/uiInformation.js`: descriptions, previews and simulated loadouts.
- The corresponding art/audio modules remove obsolete palettes, animation branches and sprite preloads.

The current complete skill list is in `../skill-morphs/SKILL_INVENTORY.md`. Recovery copies of source, verification scripts, affected guide text and retired runtime sheets are outside the project in `C:/Users/austi/.codex/backups/runalis-subclass-reduction-2026-10-26`.

## Verification

- `verification.json`: catalogue, all mastery boundaries, save cleanup for each removed choice, Expertise refunds, persistence of supported choices, mastery-20 announcements and simulated adventurers.
- `regressions/results.json`: 29 passing retained-feature model suites, including 438 real morph casts, summons, each remaining class mechanic, Expertise, damage scaling, movement, terrain and cleanup.
- `../creator-class-information/verification.json`: seven selectable classes at six window sizes; only supported subclass cards, correct mastery labels, no clipping or missing icons.
- `../expertise/browser-checks.json`: 18 class/window combinations with real purchases, mutual exclusion and respec; three final choices per class.
- `../skill-morphs/browser-checks.json`: actual ability menus, mouse/controller selection, mastery restrictions, Original restoration, hotbar assignment, practice arena and game startup.
- `protected-forms.json`: exact before/after comparisons for the 146 retained forms.
- `../moment-gameplay/regressions/results.json`: all 24 broader gameplay suites passed.
- `../bound-dead/browser-verification.json`: current summon animations, attacks, three form choices, mastery restrictions, controller selection and Commander help text passed with no page errors or missing assets.
- `../garden-grave-morphs/browser-verification.json` and `../fellhunter/browser-verification.json`: retained spell/summon previews and audio render checks passed, with no page errors or missing assets.

The final `summary.json` records the checked counts; `changed-source-files.json` lists the source changes and syntax checks.

Browser checks used isolated test characters in headless Edge. Controller routing was tested with simulated input. Historical reports and source snapshots remain records of their original runs; current availability is defined by the catalogue and current verification above.

Reproduce model checks with `node tools/verify-remaining-subclasses.cjs`. Browser suites require Playwright via `RUNALIS_NODE_MODULES` and the local preview server on port 8768. `RUNALIS_CANVAS_MODULE` supplies the Canvas library for sprite tests. The broader game regression runner is `node tools/verify-moment-gameplay.cjs`.
