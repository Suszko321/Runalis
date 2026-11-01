# Engineering repository inventory

Generated from the current working tree by `node tools/audit-engineering-foundation.mjs --report`.

This is structural evidence. Import reachability does not prove code is unused; cycles and file size do not prove defects.

| Directory | Files present |
| --- | ---: |
| src/ | 343 |
| tools/ | 374 |
| assets/ | 671 |
| docs/ | 2122 |
| Runalis/ | 39 |
| .github/ | 2 |

Syntax parsed: **718** JavaScript files, **0** failures (esbuild parser; includes tools and nested archive).
Startup graph: **326** module identities, **325** physical files. Literal dynamic imports are included.
Regression scripts: **279**. Counts describe availability, not passing coverage.

## Root HTML entry pages

- `armor-lab.html`
- `art-lab.html`
- `combat-lab.html`
- `combat-overhaul-lab.html`
- `creator-lab.html`
- `effects-lab.html`
- `enemy-combat-lab.html`
- `enemy-density-lab.html`
- `enemy-visual-lab.html`
- `index.html`
- `loot-overhaul-lab.html`
- `scene-lab.html`
- `sheath-lab.html`
- `weapon-lab.html`
- `world-lab.html`
- `world-rebuild-lab.html`

## Modules outside the startup graph

Inspect lab entry pages, dynamic URLs, tooling, runtime registries and persisted IDs before any removal.

- `src/bossData.js`
- `src/combatOverhaulLab.js`
- `src/companionData.js`
- `src/continentLab.js`
- `src/dialogueValidation.js`
- `src/dungeon.js`
- `src/dungeonData.js`
- `src/enemyAI.js`
- `src/enemyCombatLab.js`
- `src/enemyCombatRoster.js`
- `src/enemyVisualLab.js`
- `src/lootOverhaulLab.js`
- `src/questSystem.js`
- `src/startup.js`
- `src/storyContentIndex.js`
- `src/storyData.js`
- `src/subclassUi.js`

## Query-bearing imports

Different URLs create different native-browser module identities; the build canonicalizes release queries.

- `src/characterCreator.js:21 → ./humanRenderer.js?v=20260924b`
- `src/classPreviewAnimation.js:1 → ./humanRenderer.js?v=20260924b`
- `src/dialoguePortrait.js:1 → ./humanRenderer.js?v=20260924b`
- `src/objectRenderer.js:43 → ./humanRenderer.js?v=20260924b`
- `src/render.js:34 → ./humanRenderer.js?v=20260924b`

## Highest direct importer counts

| Module | Importers |
| --- | ---: |
| src/data.js | 105 |
| src/world.js | 40 |
| src/spriteArt.js | 30 |
| src/player.js | 30 |
| src/floatingText.js | 28 |
| src/audioSystem.js | 26 |
| src/dialogueSystem.js | 20 |
| src/enemyAttackPresentation.js | 18 |
| src/storyProgress.js | 17 |
| src/encounterData.js | 16 |
| src/overworldUtils.js | 16 |
| src/coopEnemyScaling.js | 15 |
| src/subclassData.js | 14 |
| src/hotbarConfig.js | 13 |
| src/enemyVisualProfiles.js | 13 |

## Largest runtime files (context only)

| Module | Lines |
| --- | ---: |
| src/uiStyles.js | 7337 |
| src/combat.js | 7325 |
| src/data.js | 6131 |
| src/ui.js | 4916 |
| src/objectRenderer.js | 4859 |
| src/dungeonSystem.js | 3968 |
| src/combatVisualsRenderer.js | 3762 |
| src/main.js | 3510 |
| src/worldContent.js | 2690 |
| src/codeAssets.js | 2536 |
| src/dialogueSystem.js | 2536 |
| src/characterCreator.js | 2437 |
| src/render.js | 2300 |
| src/combatMoves.js | 2195 |
| src/skillTreeSystem.js | 2109 |

## Dependency cycles

Physical-file strongly connected components in the startup bundle. Imports alone do not demonstrate an initialization failure.

### Component 1: 33 files

`src/abilityChargeSystem.js`, `src/abilityLoadoutSystem.js`, `src/abilityMasterySystem.js`, `src/abilityMorphSystem.js`, `src/bloodlineSystem.js`, `src/campaignConversations.js`, `src/combatPower.js`, `src/continentStreaming.js`, `src/continentWorld.js`, `src/dialogueSystem.js`, `src/encounterLedger.js`, `src/equipmentProgressionSystem.js`, `src/gameplayDiscoveries.js`, `src/lichSummonSystem.js`, `src/oathbladeProfiles.js`, `src/player.js`, `src/questData.js`, `src/regionWorlds.js`, `src/setBonusSystem.js`, `src/skillExpertiseSystem.js`, `src/skillScrollSystem.js`, `src/skillTreeSystem.js`, `src/skills.js`, `src/storyRuntime.js`, `src/subclassSystem.js`, `src/subclassVariants.js`, `src/travelSystem.js`, `src/veyreignRules.js`, `src/workshopAccess.js`, `src/world.js`, `src/worldContent.js`, `src/worldExploration.js`, `src/yourOrder.js`

### Component 2: 13 files

`src/armorMotionArt.js`, `src/artIcons.js`, `src/classPassives.js`, `src/combatActions.js`, `src/eliteEncounterSystem.js`, `src/equipmentArt.js`, `src/gearVisualStyle.js`, `src/handTrinketArt.js`, `src/meleeArmArt.js`, `src/outOfCombatRecovery.js`, `src/subclassArt.js`, `src/subclassCombat.js`, `src/weaponStance.js`

### Component 3: 10 files

`src/ashenOrchardCombat.js`, `src/blightedGroveCombat.js`, `src/bossSystem.js`, `src/combat.js`, `src/dungeonSystem.js`, `src/enemyBehaviors.js`, `src/hubSystem.js`, `src/malakarCombat.js`, `src/veyreignCombat.js`, `src/veyreignFeralCombat.js`

### Component 4: 3 files

`src/factionEquipmentArt.js`, `src/humanEquipmentSprites.js`, `src/spriteArt.js`

### Component 5: 3 files

`src/gardenGraveArt.js`, `src/petalStormArt.js`, `src/roseMantleArt.js`

### Component 6: 3 files

`src/characterCreator.js`, `src/gameInteraction.js`, `src/ui.js`
