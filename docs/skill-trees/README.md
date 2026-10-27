# Skill tree revision — October 4, 2026

All 16 class, bloodline and weapon trees now display the real prerequisite graph.
The first tier is at the top, children follow their parents, arrowheads identify
the next skill, and dashed links indicate either-prerequisite merges. Diamond
markers identify exclusive choices. Selecting a node highlights its incoming
links and lists the exact prerequisite names in the inspector.

The tree workspace uses the available screen area. Every node remains on one
page. The inspector keeps its Learn button visible while longer descriptions
can scroll independently. At compact widths the inspector moves beneath the
graph. Mouse, keyboard focus and controller navigation remain supported.

Four new, optional permanent passives were added to every tree: **64 additions,
246 total nodes**. Each Foundations branch starts at the existing root and costs
1, 1, 2 and 2 points. Benefits use existing gameplay bonuses for health, stamina,
spirit, defense, attacks, healing, summons and class-specific effects. Each new
passive has an individual SVG emblem. Existing node IDs, prerequisites, exclusive
choices, point costs and saved purchases are preserved.

## Validation

- `node tools/verify-skill-trees.mjs`: all 246 nodes reachable, prerequisite order,
  842 purchases, 80 new bonus values, exclusive choices, insufficient points,
  duplicate purchase prevention, save round trips and real derived stats.
- `node tools/verify-skill-trees-browser.cjs`: all 16 trees at 1920×1080, 1440×900,
  1366×768, 1280×720, 1024×768 and 800×700. No graph scrolling, overlapping nodes,
  missing edges, cropped names or hidden purchase buttons. Real UI purchasing,
  keyboard focus and controller navigation checked in an isolated fixture.
- `node tools/verify-combat-overhaul.mjs`: 57 combat regression checks pass.
- `node tools/verify-skill-art.mjs`: 175 passive emblems and 85 active icons verified.

Browser checks use `RUNALIS_NODE_MODULES` and the local server at port 8766. Art
checks use `RUNALIS_CANVAS_MODULE`. The browser fixture does not write player saves.

## Previews

- [Fellhunter at 1440×900](archery-1440.png)
- [Sword Mastery at 1440×900](sword-1440.png)
- [Waverider at 1280×720](hydromancy-1280.png)
- [Compact Waverider at 800×700](hydromancy-800.png)

Long-term balance of the added passives has not been playtested; the new bonuses
are deliberately modest and use the existing shared skill-point budget.
