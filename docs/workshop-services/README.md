# Orrakai blacksmith and craftsman integration

Completed October 26, 2026. Changes are in the working project. The original upgrade economy, equipment stat formulas, 20-tier cap, 63 recipes, profession requirements, output quantities, and crafting XP calculations remain in use.

## Using the services

**Mara the Smith** operates the existing forge east of the market, beside its anvil. Approach her and use the normal interaction button, then select **Upgrade Weapons** or **Upgrade Armour & Trinkets**. The forge lists equipped and bag equipment separately, displays current and projected attributes and available/required resources, and requires **Review Upgrade → Confirm Upgrade**. It upgrades the selected individual item without replacing it or temporarily equipping bag gear. Several items can be upgraded in one visit. Ore refinement, purchasing scrap, and the established introductory scrap grant remain available through **Refine Ore / Buy Scrap**.

**Corin Reed, Craftsman** works west of the market steps, in the front room of the house that retains Mara Vell’s campaign entrance and living quarters. The doorway has a tool sign and the workshop label. Interact with Corin and select **Craft Items**. Browse all 63 existing recipes or filter by Crafting, Cooking, and Runecraft. The screen shows ingredients, available quantities, output attributes, required profession level, missing requirements, and XP. Crafting can be repeated without reopening dialogue.

Arrow keys or D-pad move between controls; Enter/A activates; LB/RB switches categories; Esc/B leaves. Mouse and keyboard focus are supported. Short windows have separately scrolling recipe/equipment lists and details. Holding Enter does not repeat upgrade confirmations.

The inventory retains item inspection, equipment management, individual tiers, materials, salvage, and Bone Coterie gear management. Its crafting tab and upgrade controls are removed. Existing saves with the old crafting tab selected fall back to equipment. Retrieving Coterie equipment to the bag allows it to be brought to the forge.

## World and access integration

The existing Mara NPC, forge, anvil, weapon rack, forge glow, roads, and building layout are reused. Added details include a quenching barrel, tool storage and supplies, exterior signs, working hand/tool animations, short completion sparks, and existing impact/harvest sounds. The original campaign house entrance is unchanged. Orrakai’s seven buildings, gates, other services, and retained quest objects remain accessible.

Both services have distinct minimap and local full-map symbols. Their positions come from the actual NPC coordinates and the existing map projection. Descriptions are **Blacksmith — Weapon & Armour Upgrades** and **Craftsman — Crafting Services**. The map index can center and highlight either location. The minimap hover conversion also handles high-DPI displays.

Operations require an issued service session bound to the actual player, host, world, designated NPC, interaction range, and line of sight. Transactions recheck access and current costs. Closure, distance, defeat, provider removal, loading a save, world changes, and leaving the co-op party invalidate access. Session authority is transient and is not serialized in saves. Co-op sessions consume only the service owner’s possessions, and controller routing checks that owner.

Supported campfire preparation remains available beside an actual campfire: Cook Sunfish, Prepare Field Rations, Silverfin Skewer, Bitter Stew, Ash Fruit Stew, and Shrine Tonic. This exception cannot execute other workshop recipes remotely. Portable salvage remains available.

## Main implementation files

| File | Responsibility |
| --- | --- |
| `src/workshopAccess.js` | Nearby-provider sessions, ownership, access checks, campfire exception |
| `src/workshopService.js` | Functional service screens, comparison, confirmation, transactions, repeat use, controls |
| `src/equipmentProgressionSystem.js` | Authoritative upgrade guard and stable owned-item quotes for bag/equipped gear |
| `src/craftingSystem.js` | Canonical recipe execution and service access enforcement |
| `src/panelInventory.js`, `src/ui.js` | Inventory entry-point removal, retained inspection and management, overlay cleanup |
| `src/orrakaiLayout.js`, `src/orrakaiRenderer.js`, `src/workshopArt.js` | Providers, existing workplaces, signs, worker animation, icons, completion sparks |
| `src/dialogueSystem.js`, `src/main.js`, `src/hubSystem.js` | Standard conversation choices, service dispatch, existing smith supplies |
| `src/minimapRadar.js`, `src/minimapHud.js`, `src/panelWorldMap.js` | Actual-coordinate map markers, descriptions, hover and index selection |
| `src/couchCoop.js`, `src/gameSave.js`, `src/pvpArenaSystem.js` | Input ownership, session revocation and overlay integration |
| `src/objectRenderer.js`, `src/combatVisualsRenderer.js`, `src/uiStyles.js` | Native renderer hooks and minimap hover support |

`changed-source-files.json` records the source changes relative to the pre-pass copies in `backups/workshop-services-2026-10-25`. No third-party packages or generated art dependencies were added.

## Verification

| Check | Result |
| --- | --- |
| Workshop model suite | 13 checks passed, including every original recipe, access rejection, individual item identity, atomic failures, co-op ownership, campfires, dialogue, save/load and markers |
| Live Edge service suite | 17 checks passed; actual game launch, E/dialogue/service flow, mouse crafting, keyboard confirmation, held-key prevention, restrictions and cap messages, controller ownership, cancellation, save/load, maps and retired inventory tab |
| Service layout sizes | 1920×1080, 1280×720, 800×600, 640×360, 390×844; no horizontal overflow or off-screen footer |
| Fullscreen menu suite | 64 views passed across four window sizes, plus chooser and tree navigation checks |
| Orrakai navigation regression | 1,755 reachable actor cells; all 55 previously retained content objects preserved; seven buildings, entrances/exits and interactions pass |
| Loot/progression regression | 24 checks passed, including all rarity upgrade paths and seeded 150,000-kill loot sampling |
| Existing gameplay regression run | All 24 suites passed: combat, enemy visibility/pursuit/separation/respawns/density, classes, progression, loot, continent access/persistence, animation and browser scenarios |
| Act I campaign regression | Passed, including story choices, rites, rewards and encounter isolation |
| Browser runtime/network | No page errors or failed requests in the service suite |

The broad gameplay run passed before the final inventory-code cleanup and map-index refinement. The final changes were checked again with the live service, workshop model, and loot suites. Reports are in `model-verification.json`, `browser-verification.json`, the adjacent logs, `../fullscreen-menus/verification.json`, and `../moment-gameplay/regressions/results.json`.

Controller routing was exercised with simulated controller events through the live game’s ownership checks; a physical gamepad and subjective sound quality were not tested. The browser runs used isolated test characters and contexts and did not modify the user’s saved characters. This pass makes no new FPS or loading-time improvement claim.

Reproduce with the local preview server running (default test URL `http://127.0.0.1:8768`, override the service browser URL with `RUNALIS_URL`):

```powershell
node tools/verify-workshop-services.mjs
node tools/verify-workshop-browser.cjs
node tools/verify-orrakai.mjs
node tools/verify-act1-campaign.mjs
node tools/verify-loot-overhaul.mjs
node tools/verify-fullscreen-menus.cjs
node tools/verify-moment-gameplay.cjs
```

Browser checks require `RUNALIS_NODE_MODULES` to point to a directory containing Playwright and an installed Edge browser. Screenshots alongside this report show both workplaces, smith confirmation, crafting at the tested sizes, the service map, and inventory management.
