# Acolyte Soul Siphon

Soul Siphon's Acolyte morph now casts once instead of channeling. It creates a stationary 210-unit-radius circle at the caster, lasting six seconds, with a 12-second base cooldown and an 18-Spirit upfront cost. Charge upgrades cannot provide extra uses or turn it into a charged attack. Other Soul Siphon forms retain their existing behavior.

The initial strike deals 70% of the resolved spell power. Subsequent pulses every 0.8 seconds deal 30%. Successful hits slow foes for 1.25 seconds and refresh a five-second Soul Burn that ticks every 0.8 seconds for 16% of resolved spell power. The burn follows fleeing enemies, and continues after the field expires. Repeated hits refresh one burn without stacking copies or resetting its tick cadence. Bosses and elites retain their control resistance; terrain blocks field hits. Existing mastery, equipment and Expertise multipliers remain in effect.

The old Acolyte healing identity is retained as a small heal on casting, including its existing Soul Fragment contribution. The new field does not repeatedly heal. No cast, hit, healing or burn tick directly grants mastery XP; mastery is still earned only through the hotbar when the player earns XP.

The visual includes an activation wave, a world-anchored seal matching the actual damage radius, etched runes, drifting pixel specters, soul-fire islands, woven spectral trails and compact flames on burned enemies. A single persistent field effect replaces repeated generic aura effects. Sprite samples and effect counts are bounded. Morph changes, death and world transitions cancel the field and burns, and saves do not serialize these temporary effects.

Validation: eight focused gameplay groups, including actual controller press/hold/release behavior and an 80-enemy gameplay case; an 18-enemy browser encounter with all enemies hit and burned; three distinct animation frames; deterministic rendering; camera reprojection (maximum 1/255 channel rounding difference); invisible cancelled effects; canvas-state restoration; and no browser errors or missing assets. The browser encounter peaked at 37 queued visual effects. Regression checks passed for Acolyte Murmuring Host, Fae Thornstorm, all 216 morphs (648 real casts), all 89 skills' hotbar-only mastery, and all six classes' Expertise choices (1,152 numerical cases).

Preview: `preview.png`. Gameplay capture: `encounter.png`. Browser report: `browser-verification.json`.
