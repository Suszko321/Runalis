# Percentage Spirit recovery from primary weapons

This supersedes the old flat6-per-hit weapon recovery rule.

| Committed primary weapon family | Spirit restored per successful target hit |
| --- | ---: |
| Grimoires | 40% of the attacker's maximum Spirit |
| Foci | 30% of the attacker's maximum Spirit |
| Other primary weapons, including unarmed | 25% of the attacker's maximum Spirit |

The formula is `maxSpirit × familyRate`, capped by available room in the current
Spirit pool. It uses maximum Spirit rather than missing Spirit, so the percentage
does not shrink as the bar fills. Fractions are retained with no flat minimum or
integer rounding. At the starting25-Spirit pool, recovery is10 /7.5 /6.25; at100,
it is40 /30 /25. All three exceed the former6 at normal starting-or-larger pools.

Grimoires still spend mana/Spirit when casting and Foci still spend Stamina.
The percentage is the gross hit reward, after any casting cost was already paid.
Light/heavy attacks have the same recovery percentage. Misses and dead targets
award nothing. Existing per-target hit guards prevent repeated recovery from
updating the same swing/projectile; hitting two distinct enemies grants two
shares. Recovery never exceeds maximum Spirit and belongs only to the attacker.

Each attack now retains its committed weapon family, including ordinary melee
and arrows. Equipping a Grimoire after firing an arrow cannot increase that
arrow's recovery. This change does not add recovery to abilities, summons,
damage-over-time or separate legendary aftershock/proc damage paths.

`weaponSpiritRecovery.js` owns the rates, amount and display text. Hotbar attack
descriptions, full/compact equipment inspection, equipment-purpose text and the
Grimoire mastery tree use that same rule. The old numeric
`PRIMARY_WEAPON_SPIRIT_ON_HIT` export remains only for old tool imports; neither
runtime recovery nor game descriptions consult it.

## Verification

- `verify-weapon-spirit-recovery.mjs`:288 actual light/heavy hit cases across
  twelve families including unarmed, four owners and25/100/400 maximum pools;
  independently checks40%/30%/25%, minimum-pool increase, repeated-frame guards,
  item/help text, misses, dead targets, near-full caps, distinct-target cleaves,
  fractional pools and arrow→Grimoire equipment swaps.
- `verify-grimoire-category.mjs`:168 book/Focus hits, resource payment, proficiency,
  tree isolation, migration and saves under the percentage rule.
- Chromium/WebKit Grimoire UI checks pass at desktop and phone widths, including
  current40%/30% inspection text. Existing boss-armory, legendary-weapon and
  common-practice-gear model checks pass.
- Engineering13/13 and publication build pass. The three older aggregate suite
  limitations recorded in [Grimoire verification](../grimoire-category/README.md)
  remain open; this is not a broader audit closure. Human resource-economy pacing,
  physical controllers/phones and real-network testing remain unmeasured.
