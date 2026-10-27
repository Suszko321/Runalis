# Runalis — Lexicon visual overhaul

Implemented September 27–28, 2026. Primary art direction: the supplied equipment concept.

## Delivered

A shared presentation layer in `lexicon.css` covers the live title/profile UI, character creation, pause, equipment, coterie, resources, loot, recipes, character overview/sheet, skill trees, abilities, professions/world skills, quests, log, regional map, vendors, fishing, co-op join, arena results, and gameplay HUD containers. Painted blackened leather and brass bindings use CSS border-image nine-slicing; item, recipe, quest and skill descriptions use warm vellum with dark ink. The character preview sits in a painted cathedral niche. Cinzel headings and EB Garamond book text are bundled locally with their OFL licenses; numeric readouts keep clear lining/tabular figures.

Canvas dialogue, discovery banners, split-screen player frames and downed/revive panels share the scalable binding renderer. Settings, Credits and the browser Quit notice now use a keyboard-accessible manuscript dialog; title controller confirm/cancel closes it. Existing content and shortcuts are unchanged. Existing UI audio calls remain intact. No extra audio system or continuous decorative particle loop was added.

Small SVG ornaments provide dividers, chapter ribbons, selected-row corners, field-note marks, ritual circles, Nav Stone runes and a wax seal for permanent skill branch warnings. The shrine is painted art, not a screenshot of a fake interface. Runtime materials are compressed WebP. Decorations are CSS backgrounds, never interaction targets.

## Behavior fixes uncovered by regression checks

- `ui.js`: subtab binding previously selected entire panels and inventory rows because they share the same data attributes. Bubbling item/page clicks could reset pagination. Bind only actual subtab buttons.
- `shopSystem.js`: refresh previously re-read stale DOM dataset values after an event changed category/selection, undoing those actions. Render the updated state and then synchronize the DOM.
- Compact layouts now keep skill/ability details available and let the equipment ledger stack and scroll. They no longer clip the item-detail column at 800px.

These are bounded interaction fixes, not changes to item, crafting, skill, quest, currency or save systems.

## Validation and evidence

`tools/verify-lexicon.cjs` runs isolated browser fixtures against the actual renderers and handlers. `regression-results.json` records its final output. It checks all five inventory sections, all six skill sections, character sheets, mouse equip, pagination, keyboard selection, simulated controller focus, upgrade currency consumption, salvage item consumption, eligible crafting, a DOM skill purchase, quest selection, vendor quantities/currency, Nav Stone travel, and dialogue choice hit regions. Screenshots include creation, fishing, pause and dialogue.

Equipment layout checks cover 1920×1080, 1366×768, 2560×1440, 3440×1440 and 800×600, with horizontal overflow assertions on the non-default sizes. Narrow views scroll vertically. This is not a claim that every possible dynamic text value was tested at every resolution.

`tools/review-lexicon.cjs` additionally loads a real profile in a separate headless browser context, saves it, pauses/resumes, and opens all six main menus. The test profile exists only in the isolated browser context; user profiles are untouched. Screenshots `inventory.png`, `title.png`, `map.png`, `pause-live.png` and the other main-menu images show this live game. `tools/verify-world-overhaul.mjs` passes; changed modules pass Node syntax checks.

## Remaining verification / intentional boundaries

- Physical controllers, 2–4-player ownership, long sessions, every locked/Fate branch, and rare death/recovery combinations still require hands-on playtesting. Simulated input and representative fixtures do not establish exhaustive controller compatibility.
- The synchronous co-op leave confirmation remains the existing native browser confirmation. Preserving its blocking semantics avoids changing session/save behavior during a visual pass. This is a known visual exception.
- Native browser title tooltips remain native. Dedicated tooltip screens do not exist in this build.
- Several requested standalone interfaces do not exist (bestiary, codex, separate alchemy/cooking, graphics/audio options, etc.). Existing content is retained where currently exposed; no new game systems were invented.
- Developer authoring tools receive shared controls/type, but their working editor layout is retained.
- The work is not represented as exhaustive final sign-off on every state. See `AUDIT.md` and `source-inventory.json` for the starting inventory and coverage boundaries.

## Assets

`assets/ui/grimoire-frame.webp`, `vellum.webp`, and `shrine.webp` were produced with the built-in image generation tool. `leather.webp` is an integration texture extracted from the generated binding. Full generation prompts are in `ASSET-PROMPTS.md`. Fonts: Google Fonts Cinzel and EB Garamond, license files under `assets/ui/fonts/`. Reusable vector ornaments were authored for this UI. `grimoire-frame.png` retains the source master and is not loaded by the game.

## Run

Start the existing local server with `python tools/serve.py`, then open `http://127.0.0.1:8766/`. Run browser checks with Node and Playwright installed (the checked-in tools currently use this workstation's bundled Playwright path). No build step or external font request is needed.
