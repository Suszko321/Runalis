# Petalknight Thorn Lash — Rose Eruption

Thorn Lash now erupts a giant crimson rose ahead of the player's aim. Its barbed roots and petal burst hit every hostile enemy inside the visible circle. Terrain clamps its placement and blocks hits through walls. Close hits still build Roseguard.

| Cast | Burst damage | Aim distance | Burst radius | Base Spirit cost |
| --- | --- | --- | --- | --- |
| Tap | 100% | 100 px | 86 px | 9 |
| Charged | 135% | 118 px | 101.48 px | 11 |
| Fully charged | 180% | 135 px | 116.1 px | 12 |

Charge time uses the existing Focus handling system (about 0.86 seconds before Focus). Recovery is 2.2 seconds. Mastery, equipment and tree bonuses still apply, so live distances/costs can differ from this baseline.

Enemies hit receive one Thorn Wound for 2.6 seconds: three ticks at 0.8-second intervals, each at 7% of the cast's power before normal damage calculations. Another eruption refreshes that wound rather than creating an independent stack. Other Petalknight skills cannot overwrite or extend it. The wound follows enemies outside the burst circle; it does not leave a damaging field.

The dedicated pixel rose has closed-bud, unfolding and open poses; whole-pixel enlargement preserves its silhouette. It rises from a hooked leafy stem above twisting barbed roots, then disperses in crimson petals. The ground border is circular and matches damage geometry. Charging uses a rose bud and crimson meter; releasing adds a distinct low root-crack impact sound. The wound indicator is a small thorn.

## Validation

- Seven focused production simulations: real input charging/release, exact area/all targets, three wound ticks, nonstacking refresh, terrain, dodge cancellation, Expertise and cleanup.
- Actual browser casts of tap and full charge, screenshots inspected, 30 camera-anchoring/animation-phase checks, three charge poses, expiration checks, and offline audio rendering with distinct unclipped sound signatures.
- Original, Fae and Acolyte definitions still match the protected snapshot.

Backups of changed existing files are in `backups/rose-eruption-2026-10-13/`. The existing Thorn Lash ID, mastery, unlock and hotbar assignment are preserved.

Mobile charge-release reliability now also has a [dedicated regression pass](../rose-eruption-mobile/README.md), covering lost pointer termination, native multi-touch, cancellation and recovery.
