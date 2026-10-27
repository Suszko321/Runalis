# Baseline — 24 September 2026

- Browser ES modules, Canvas 2D, 32px gameplay tiles. No build pipeline or test runner present.
- `.git` was empty; `git status` failed. Before edits, copied src/assets/docs/index.html/style.css/README.md to `C:/Users/austi/Documents/Runalis-visual-baseline-20260924`.
- Launched through a local HTTP server at port 8765. Created separate `Visual QA` profile, leaving the existing Assessment profile alone. Class selection, appearance creation and the caravan sequence launched successfully.
- Baseline visual defects: character creator text overlaps and preview clips at ~943x694; opening wagons are plain rectangles and wheels, terrain sparse; character faces and bodies are crude geometric drawings. Existing equipment, animation controller, combat reactions, environmental profiles and UI systems are substantial and should be retained.
- Qwen 3.5 4B performed a read-only excerpt audit. Its claim that townProp IDs cannot resolve is **incorrect**: modelRegistry resolves `kind`, not the prop instance ID. Its NPC count and animation-budget assertions also contradict the source. No changes are based on those claims. Useful verified observation: the opening lacks roadside objects and fire/smoke progression.
- The initial manifest inventories shared production scope and intentionally over-includes later-Act entries. It is not a completed visual certification or a full Act One playthrough.
