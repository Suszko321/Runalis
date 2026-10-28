# Long-term player, skill and ability progression

The old shared curves were quadratic, while ordinary enemy XP grows with
level^1.35. Higher-level encounters therefore offset part of the increased
requirements. The new curves preserve every next-level requirement through
level 10, then smoothly add an exponential tail. All three progressions use the
same shape but retain their individual starting XP scales and reward sources.

For level L above 10, d=L-10 and k=ln(2)/7:

    nextXP = oldPolynomial(L) + oldPolynomial(10) * (exp(k*d) - 1 - k*d - (k*d)^2/2)

Subtracting the first three Taylor terms avoids a sudden difficulty jump at
level 11. The tail eventually dominates, approaching a doubling every seven
levels. This follows the long-term shape described in the
[OSRS experience reference](https://oldschool.runescape.wiki/w/Experience),
rather than copying its raw XP totals or introducing a level-99 cap. Ramp start
and doubling interval live alongside the existing coefficients in XP_CURVES.

## XP needed for the next level (rounded)

| Current level | Player before | Player after | Ability mastery before | Ability mastery after |
| --- | ---: | ---: | ---: | ---: |
| 10 | 1,750 | 1,750 | 472 | 472 |
| 20 | 5,800 | 6,170 | 1,512 | 1,612 |
| 30 | 12,250 | 16,283 | 3,152 | 4,240 |
| 50 | 32,350 | 101,819 | 8,232 | 26,969 |
| 75 | 70,975 | 1,113,949 | 17,957 | 299,262 |
| 99 | 122,167 | 11,797,364 | 30,821 | 3,179,788 |

Ordinary skill training uses the same ramp: level 50 next XP changes from
107,840 to 299,971. Training affinities, encounter contribution shares, hotbar
mastery awards, skill points, morph requirements and combat power are unchanged.
Existing saves retain their levels and raw XP into the current level; they are
not recalculated from lifetime XP or downgraded. A higher next threshold can
make the displayed percentage smaller without removing earned XP.

As a formula comparison, player level 50 takes about 82 same-level ordinary
victories instead of 26, and level 99 about 3,973 instead of 42, using the current
ordinary enemy reward formula, full victory credit and no other XP sources.
These are calculated equivalents, not timed playthroughs. Bosses, quests,
professions, party shares, kill speeds and travel change actual hours. Later
XP-per-hour playtesting should tune rampStart/doubleEvery if the late game is
too steep; avoid exponentially scaling rewards to cancel this curve.

## Verification

- verify-long-term-progression.mjs: unchanged early costs, smooth transition,
  monotonic requirements, late seven-level doubling, geometric sums against
  individual requirements, multi-level awards, fractional remainders, extreme
  numeric inputs, skill points, training/mastery and repeated save/load.
- verify-long-term-progression-browser.cjs: normal game award to level 30,
  HUD update, automatic hotbar mastery, saved XP and next thresholds after reload.
- Existing hotbar mastery, all-class level points, progression overhaul, skill
  tree and morph suites pass. The level-point fixture now creates the unavailable
  Classless path as a legacy save rather than attempting new-character selection.
  Old large-XP stress expectations were updated for exponential leveling.

Closed-form geometric/polynomial sums retain logarithmic award resolution.
Exponent overflow saturates to a finite numeric sentinel; existing safe numeric
storage bounds remain in effect. No extra per-frame work or save schema is added.

