# Combat foundation validation

Run date: October 31, 2026. Environment: local Windows workspace, Node 24.15.0.
No production source changes were made. Model fixtures run in isolated processes;
the new foundation probe fixes random results and supplies a controlled session
clock. No user saves are loaded or written by the new tools.

## Reproduce the new foundation

```powershell
node tools/audit-combat-foundation.mjs
node tools/verify-combat-foundation.mjs
node tools/verify-combat-foundation.mjs --strict
```

The exporter writes `INVENTORY.md` and a detailed `catalogue.json` under
`docs/combat-audit` (or an optional output-directory argument). The diagnostic
writes `foundation-verification.json`. JSON reports are locally generated and
ignored by the repository's existing rules; the Markdown inventory and this
evidence record are versionable. Neither tool is imported by the game.

Default diagnostic: **seven healthy contracts passed; four open findings reported**.
Strict diagnostic: **expected exit 1**, because the four findings remain unresolved.
An expected audit failure is not a passing gameplay regression test.

| Healthy contract | Result |
| --- | --- |
| Unique canonical ability IDs | Pass |
| Assignment API moves the channel to one slot and starts it | Pass |
| Updating P1's channel charges P1 only | Pass; 200 →191 Spirit, P2 stays 200 |
| Cooldown clock rebasing preserves elapsed time | Pass; last use 98 at save clock 100 becomes 1 at new clock 3 |
| Fixed encounter seed/profile independent of player progression | Pass |
| Duplicate death reward callback | Pass; second award does not add XP |
| Save scrub excludes active channel/charge | Pass |

| Controlled defect probe | Measured result |
| --- | --- |
| C01: actual Lichbone Scythe weapon hit by Oathkeeper against 1-HP target | Target loses 1, player heals 2 |
| C02: Living Bastion block-reflection lethal hit | Target loses 1, death handled, zero contributors, zero Combat XP |
| C03: Blackbow compatible item slots | Five alternatives across only weapon/chest; thresholds 3 and 4 unreachable |
| C04: Mending Current cast from both ownership positions | P1 cast: host +18 / ally +18; P2 cast: host +0 / ally +18 |

These use production functions and minimal controlled worlds, not a normal-play
campaign. C04 constructs the same host/ally ownership links as couch co-op; it
does not constitute a fresh browser join/controller session.

## Existing model suites rerun

All **24** scripts below exited zero. Each can be run with `node tools/<name>`.
Logs are retained locally in `tmp/combat-foundation/`.

| Area | Passing scripts |
| --- | --- |
| Catalogue, forms, Expertise | `verify-subclass-reduction.mjs`, `verify-skill-morphs.mjs`, `verify-expertise.mjs` |
| Damage, progression, tempo | `verify-damage-scaling.mjs`, `verify-progression-overhaul.mjs`, `verify-combat-tempo.mjs` |
| Weapon and guard | `verify-melee-light-combos.mjs`, `verify-block-hotbar.mjs` |
| Enemy timing and elite defenses | `verify-enemy-combat.mjs`, `verify-elite-hazards.mjs`, `verify-elite-defenses.mjs` |
| Party and boss ownership | `verify-coop-readiness.mjs`, `verify-boss-summons.mjs`, `verify-dungeon-boss-coop.mjs` |
| Summon and sustain | `verify-gravecaller-sustain.mjs`, `verify-summon-recovery.mjs`, `verify-summon-thorns.mjs` |
| Class mechanics | `verify-sunken-waverider.mjs`, `verify-cryomancer.mjs`, `verify-oathkeeper.mjs`, `verify-fellhunter.mjs`, `verify-hellstalker.mjs` |
| Specialized bosses | `verify-malakar-climax.mjs`, `verify-veyreign-feral.mjs` |

The morph suite exercises 73 parents × two forms × ordinary/elite/boss = **438
casts**, plus boundary, lifecycle and migration assertions. The enemy suite checks
preparation and release for all fifteen shared kinds. These counts describe the
fixtures that ran, not all possible builds, AI combinations or animation frames.

## Existing aggregate failure, investigated separately

`node tools/verify-combat-overhaul.mjs` passes its first nine checks, then fails
at `oathkeeperLitanyOfIron failed to start` in the channel catalogue check.

Root cause in the fixture: unlocking auto-assigns the channel to the first empty
slot; the test then directly writes it into slot 3 too. First-combat migration
removes the duplicate slot-3 assignment. The log is `No ability equipped there.`
The new test uses `assignAbilityToSlot`, leaving one assignment, and activation
passes. This is a stale fixture failure, not evidence that the production channel
cannot activate. Later checks in that aggregate were not reached and are not
claimed to pass. The existing test was left unchanged during this assessment.

An initial invocation of nonexistent `verify-malakar.mjs` was corrected to the
actual `verify-malakar-climax.mjs`, which passed; it is not counted as a gameplay
test failure or a separate executed suite.

## Measurement limits

The generated formula sweep uses levels 1, 5, 15, 33, 65, 100, 250 and 1,000,
equal-level attributes/mastery and an unequipped Gravecaller fixture. Ability
reference power and an explicitly supplied Grave Scythe weapon reference remain
finite and grow. Spirit cost falls from 12 to 11 through mastery. This is neither
an equipment/build comparison nor a realistic DPS/TTK simulation.

No new browser screenshots, physical controller latency, audio assessment,
frame-time/memory measurements, online session or sustained human-play victory
were collected. Existing reports in other folders were read as historical context.
The package check validates publication resources/buildability, not gameplay feel.

`npm run build` passed: 326 startup modules bundled; 865 playable files staged
(38.9 MiB); publication resource paths and exact module filename case validated.
The existing optional Node package-type warning is unrelated to combat results.

## Party-support and tanking follow-up — October 31

`verify-party-support-taunts.mjs` passes all four caster slots × four recipients × original/Cryomancer heals and buffs (64 positive recipient checks), independent resource and cooldown checks, range/downed/inactive exclusions, twelve real tank casts and production AI target selections, expiry, boss/friendly exclusions, latest-owner replacement, downing, cover and disengagement. Morph descriptions expose the taunt. `verify-combat-foundation.mjs` now asserts the corrected C04 behavior; C01–C03 remain reported. Seven adjacent model suites passed (skill morphs, co-op readiness, Oathkeeper, Rose Mantle, enemy combat, boss summons, dungeon-boss co-op). Skill morphs passed again after final description integration. Build passed with 328 modules / 867 staged game files. These are model checks, not physical-controller or fresh browser-session results. Earlier four-open-findings measurements above record the initial assessment.
