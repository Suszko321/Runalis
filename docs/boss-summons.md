# Boss damage and summoned allies

Boss AoEs previously iterated only targetable players. They now also check live
summons belonging to participating party members, including co-op allies and
downed owners. The existing radius, shape and line-of-sight checks apply to
each summon. Summon damage uses summon armour, Rose Mantle mitigation, thorns
retaliation and death flags, without treating summons as player characters.
Sealed arena damage cannot be avoided by moving the camera away.

Grove Mother, Orchard Custodian, human/feral Veyreign and Malakar select a
nearby summon on every fourth attack when available; the other three turns
rotate across players without starving the fourth player in a full party.
Raid marks still mark players, and any summon inside their shapes is hit.
Generic boss threat scoring also prefers players over equally distant summons.
Malakar saves the targeted summon's ID so tracking survives a save/reload.

Verification passed:

- `node tools/verify-boss-summons.mjs`: delayed release damage for all five
  custom boss forms, host/co-op summons, lethal damage and death exclusion,
  safe geometry, armour, cover, camera-independent arena damage, downed owners,
  75% player targeting and equal targeting across four players.
- Existing Grove, Orchard, co-op boss, Veyreign feral and Malakar climax suites.
- Browser rendering of all eight Grove/Orchard attacks at tell and impact,
  with four players and no page errors.
- Pages build and resource validation.
