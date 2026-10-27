# Final Expertise

Each of the six standard class trees now ends with four mutually exclusive, one-point Expertise nodes, after its existing capstone. The hidden Eldritch class is unchanged by request.

| Calling | Effect on that class's active skills |
| --- | --- |
| Class Mastery | +5% effectiveness to original skills and every morph |
| Named subclass Expertise | +15% to that subclass's morphs; -10% to original forms and other subclass morphs |

Effectiveness applies to damage (including channels, persistent areas, and summon attacks), healing, protective strength, control duration, relevant skill-granted buffs, and summon health. Existing integer rounding, safety limits, target limits, summon counts, and boss control resistance remain in force. Costs, mastery progression, and morph unlock thresholds are preserved.

The multiplier uses canonical class ownership rather than combat discipline, element, equipped weapon, or skill name. Scroll, gear, bloodline, universal skills, and ordinary weapon attacks receive no Expertise penalty. Original forms are outside a named subclass; Class Mastery treats all forms equally.

No Expertise is selected automatically for existing saves. Individual morphs remain freely available at their existing mastery thresholds, before and after the final choice. The existing one-gold tree respec refunds Expertise along with other purchases and preserves mastery and morph preferences. Save normalization prevents stacked callings and multiple ranks. Active summons retain their cast form; a new calling changes their health proportionally without refilling it.

Character shows the chosen calling. Skill Trees shows all four choices and their effects. Abilities shows the selected form's effectiveness and the bonus or penalty on each morph preview. New icons follow the existing subclass emblems and dark lexicon styling.

Verification:

- `tools/verify-expertise.mjs`: all 24 legal choices, prerequisites, exclusivity, 1,152 numerical cases across all original skills/morphs, non-class exclusions, save/respec, actual healing/protection/control/flower pulses/channel wards, and existing-summon health.
- `tools/verify-expertise-browser.cjs`: all six classes at 1920×1080, 1366×768 and 1280×720; real purchase, locked alternatives and respec; no scrolling, clipped nodes or missing icons.
- Existing tree checks: 1,010 purchases across all 16 trees, and 96 browser tree/viewport layouts.
- Existing morph checks: 216 morphs, 648 real casts, mixed builds and save/reset compatibility.
- Existing combat, progression, Lich, Bound Dead, Fae summons, Fae Thornstorm, controller, and character creator checks passed.

Original edited source files are preserved in `backups/expertise-2026-10-10/`.
