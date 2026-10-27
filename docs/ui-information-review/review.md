# Runalis UI information review — October 8, 2026

The main information panes now lead with practical effects and present requirements, stats and scaling once. Optional background lore and longer explanations sit behind expandable sections.

## Reviewed and revised

- **Class selection:** concise playstyle, actual starting gear and learned skills, the two real +25% XP affinities, class passive, meaningful strengths/tradeoffs and relevant health differences. Starting weapon captions use the actual item name. Origin and caravan lore remain available under Background.
- **Skill trees and Abilities:** shared functional descriptions for all 87 original active skills and all 213 optional forms. Forms explain attack shape, element and status effects. The tree and loadout display current cost, charging/channel behavior, recovery, reach, requirements and scaling from the effective skill. Removed repeated unlock names, empty bonuses, role/status summaries and lifetime combat counters. Abilities continues to show only known skills.
- **Defensive skills:** current damage reduction/absorption and duration are shown for Guard, Briar Ward, Iron Oath and Bubble Ward. Guard and Bubble Ward use shared calculations with combat, with Warding/Defence/mastery modifiers included in the preview.
- **Equipment and loot:** practical purpose appears before stats. Removed cosmetic material/archetype/silhouette chips and redundant type, slot, weapon type, base-damage and scaling-multiplier rows. Strike power and its actual scaling remain. Tier appears once per list entry. Comparisons use the selected individual copy, including a fresh copy of an upgraded worn item.
- **Sets and upgrades:** one detailed section per applicable set, including both sets for dual-membership gear. Counts include valid equipped pieces and account for legacy set mappings. Each threshold appears once with its active/inactive state. Upgrade previews show the next tier's real stat increase and owned/required materials; confirmation remains required.
- **Bone Coterie:** shows the item's contribution to the skeleton and its comparison to the chosen skeleton slot. Removed player strike-power/scaling and player set-effect previews from these panes. Explains where player legendary/set effects apply.
- **Merchant and crafting:** scrolls explain the learned skill. Mythical commissions explain the three-piece effect and tradeoff before purchase. Recipes combine required/current level in one row and preview the resulting item's effects and stats at Tier 1.
- **Character:** consolidated XP bonuses and repeated progression/weapon information. Improved explanations of selected stats. Bloodline details show the actual passive modifiers. Empty hotbar slots are labelled Empty.
- **Combat, gathering, production and world disciplines:** replaced formula jargon and speculative future perks with current benefits and useful unlock/tool requirements.
- **Quest journal and map:** removed repeated briefings/readiness text and travel-cost instructions. Current objectives, source hints, travel restrictions and Return to Orrakai remain available.
- **Other informational surfaces:** reviewed HUD, dialogue/history, log and informational message presentation. Their existing short status, narrative and event information remains appropriate to those surfaces.

## Usability corrections

Long facts wrap inside their panes. Ability details have working sheets on smaller screens; mouse buttons and controller triggers reach remaining content. Focusing a visible button no longer shifts the sheet during the click. Stat rows are recognized as page boundaries. Bone Coterie stays within the menu bounds, with sheets for contribution details and skeleton slots. Item selection rebuilds its detail sheets correctly; mouse actions remain available.

## Validation

- Information review: eight class selections; 300 skill/form descriptions; every node across 16 skill trees; 24 pane checks including same-ID item tier comparisons, legacy/dual set membership, scrolls, Coterie, recipes, Character, journal, map and merchant.
- Class information and ability facts checked at 1440, 1280 and 800 pixel widths. No horizontal overflow in ability facts. Class summaries fit at the smaller sizes tested.
- Bone Coterie checked at the same three widths: all nine skeleton slots and all three contribution stats are reachable, including after selecting another item. Its workstation remains within the menu bounds.
- Guard and Bubble Ward previews compared with actual casts at Combat Levels 1 and 60, including proficiency/mastery. Displayed values match the resulting buffs.
- Skill-tree browser regression: 96 tree/viewport checks across six sizes, including purchase, keyboard and controller navigation.
- Skill-morph browser regression: mouse/controller selection, refreshed detail controls, hotbar assignment, reset, three viewport sizes and full-game launch; no browser errors.
- Morph gameplay regression: 213 forms, 639 real casts, mastery gates, saves and reset behavior.
- Progression regression: 23 checks, including all 87 active skill dispatches and 88 class/level simulations.
- Combat regression: 57 checks.
- Loot regression: 24 checks and 150,000 seeded kills. Browser verification includes upgrades, purchase, Tier 20 cap, individual item transfers, 960 Mythical gear renders and a full-game launch; no page errors or failed requests.
- All 204 source JavaScript files passed syntax checks, followed by checks of the final edited files.

Damage depends on individual hit patterns, charging, conditional effects and enemy defenses. The UI describes these conditions and their scaling; weapon strike power is distinguished from final hit damage.

Screenshots and detailed results are stored beside this report in `verification.json`. The source/styles snapshot taken before this pass is `backups/pre-information-ui-pass-20261008.zip`.
