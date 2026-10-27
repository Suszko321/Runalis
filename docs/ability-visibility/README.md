# Abilities · visible forms and skill symbols

All four forms occupy a fixed two-by-two grid above the selected skill's description. Only the description, statistics and mastery section scrolls. Form choices remain visible while reading longer skills, including skills with extra protection, healing, channel and Expertise information.

The detail panel uses dark brown with bright ivory text and gold selection outlines. Morph names use 14px text (13px at short viewport heights), clear availability/mastery labels, and 25–30px emblems. Existing eighteen distinct family symbols are retained, with a star for Original. Locked choices remain readable; selected choices have both a checkmark and an outline. Compact layouts retain all names, symbols and mastery requirements; broader layouts also show family roles and Expertise modifiers. The selected skill's full description and facts remain accessible below.

All five hotbar slots now show the existing skill artwork and the selected morph badge. Slot labels, original skill names and morph names remain visible beside the icons. Empty slots show a hollow diamond. Assignment, clearing and A/X/B controller behavior are unchanged. LT/RT scroll the information area without moving the form choices.

Verified in the real browser UI:

- 365 class-skill layouts: every skill from all six classes with morph families, at 1920×1080, 1440×900, 1280×720, 800×600 and 640×480. All four form controls fit simultaneously, and remain fixed during detail scrolling.
- Each layout includes a final Expertise choice to exercise the longer information. Hotbar icon assets load successfully; five slot symbols fit on screen.
- Locked forms retain full opacity, readable mastery requirements and visible symbols. The authored form text/background combinations have at least 7.49:1 contrast.
- Choosing Petalknight updates the assigned skill's morph emblem; clearing restores the empty-slot symbol. Block retains its description without an empty morph picker.
- Controller assignment, morph selection and return controls passed at three resolutions. Existing Block hotbar, morph selection, information panes and fullscreen menu checks passed.
- No browser errors or missing assets.

[Layout checks](verification.json) · [Related regression checks](regressions.json)

[1280×720 screenshot](abilities-1280.png) · [800×600 screenshot](abilities-800.png) · [640×480 screenshot](abilities-640.png)

Backups: `backups/abilities-visibility-2026-10-13/`.
