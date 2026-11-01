# Vampire bloodline overhaul

Implemented October 31, 2026 in the root Canvas 2D game. The permanent bloodline
quest and mutual exclusion remain; the optional Royal form is a separate combat
state. Existing class choice, gear, mastery and character progression remain.

## Playable content

The new tree contains **19 nodes: nine actives and ten passives**, arranged in
Blood Sorcery, Beast Dominion and Predatory Combat branches. Major early choices
share the root; Royal requires the mobility and companion-investment nodes.

| Ability | Maximum-HP cost | Recovery / behavior | Cooldown |
| --- | --- | --- | --- |
| Crimson Awakening (`crimsonFeast`) | 3% | One frontal target; 20% effective-damage drain | 5s |
| Sanguine Lance | 1% start + 1%/s | Held single-target beam, 18% drain, 40% movement and steering | 10s after ending |
| Crimson Tide | 8% | All-direction area damage, 12% drain capped at 10% max HP; ordinary-enemy knockback | 15s |
| Blood Communion | 5% | Consumes real bleed pools in range; 20% drain capped at 8% max HP; empty cast is free and fails | 18s |
| Call Bat Beast | 10% | One 30s killable melee companion, navigation/formation/short lunges; 5% drain capped at 1% max HP/s | 40s after group ends |
| Nightwing Step | 3% | Collision-checked dash and path hits; 15% drain capped at 3% max HP | 8s |
| Royal Bat Beast | 5% start + 1% every 3s | Animated toggle, blood damage ×1.20, blood recovery ×1.15, movement +10%, melee reach +10%; other ability damage ×0.75 and outside healing ×0.80 | 12s after ending |
| Blood Frenzy | 7% | 6s melee speed +15%; bleeding-target melee hits restore 2%, capped at 1% max HP/s | 20s |
| Crimson Execution | 10% | 0.4s interruptible committed windup; one target, +50% below 30% HP; 25% drain capped at 8% max HP | 18s |

Ending Royal form is free. Unaffordable activations fail without changing HP or
recovery. Misses still pay. Health costs bypass mitigation and damage-taken hooks.
Chalice multiplies activation and Lance upkeep costs by 0.90; Royal upkeep stays
unchanged. Mastery never reduces the percentage costs to zero. Damage scales with
existing progression, equipment and mastery rather than maximum HP.

Innate traits: Vampire damage ×1.15 outdoors at night or in a hostile dungeon,
without stacking; daytime outdoor damage ×0.85. Other interiors are neutral.
The existing `worldAtmosphere` clock and world mode/safe-zone/indoor flags decide
this. Outside healing ×0.90, with the additional Royal ×0.80 while receiving that
healing; typed fire and holy damage taken ×1.10. The old universal +8% lifesteal,
old flat incoming-damage penalty and retired passive lifesteal nodes are removed.

## Passives, bleed and alternatives

The ten passives are Bloodletting, Hemorrhage, Heart of the Chalice, Winged Hunger,
Brood Sovereignty, Elder Wings, Crimson Edge, Predator's Instinct, Savage Appetite
and Lord of the Hunt. Their tree descriptions specify their actual effects.

Crimson Edge works on successful genuine melee contacts across weapon categories,
independent of the hotbar or form. Its 12% proc creates one five-second wound per
caster/enemy, ticking at 2% of effective applying damage each second. There is no
minimum-one tick: small hits produce fractional damage. Reapplication refreshes
that pool; stronger old potency cannot be refreshed beyond an eight-second
absolute layer lifetime. New successful applications after expiry create new wounds.
Hemorrhage extends 0.5s once per caster/target every 3s within the lifetime cap;
Lord extends eligible reapplications by 1s within the same cap.

`bleedingSystem.js` exposes registered real bleed pools, including Bloodhound
layers. Communion consumes the underlying wounds, not an unrelated cosmetic flag.
Ticking and source attribution stay with their existing owners. Vampire bleed
snapshots its exact damage, cannot recursively proc or heal, and does not apply
offensive/gear/environment multipliers again on every tick.

Eight optional forms unlock through the normal mastery 5/10 choices:

- Lance: Rupturing Lance / Crimson Tether.
- Tide: Tidal Reversal / Scarlet Tempest.
- Bat Beast: Bloodstalker / Dreadwing.
- Royal: Sovereign of Blood / Elder Predator.

These keep the canonical skill ID, mastery and recovery. Changing a live summon,
Royal form, held channel or recovering ability is rejected. Morph descriptions
state reduced damage/health or other tradeoffs rather than implying upgrades.

## Integration and compatibility

Content lives in `vampireData.js`; actor/world encounter state and delivery hooks
live in `vampireSystem.js`; shared numeric rules live in `vampireRules.js`.
`combat.js` dispatches through the existing ability system and damage resolver.
The existing channel lifecycle now supports max-HP upkeep and end recovery.
Companions use the existing summon movement, targeting, health, attacks, group
cooldown and owner contribution systems. No separate combat loop was added.

Every Vampire direct hit has one recovery calculation after actual target HP loss.
Other lifesteal hooks and the old Crimson Feast implementation are bypassed or
removed for those hits. Overkill, dummy, friendly, invulnerable and absorbed
damage cannot generate that recovery. Existing class sustain outside Vampire
skills remains eligible under its own limits and Mortal Frailty. An unintended
legacy Thornbinder cast payoff is specifically excluded from Vampire casts.

Typed vulnerabilities run once in the basic, advanced and boss incoming paths.
Molten/infernal elite hazards, Malakar's fire moves and Seraphel's holy attacks
provide explicit damage-type context. Untyped legacy attacks remain untyped;
text labels are not used as a guessed elemental classifier.

The existing bat and royal atlases are reused without modifying their bytes.
Royal attacks/channeling select beast animation rows; equipped gear remains intact.
Transformation and return have a short visual transition. Claw strikes, jaw beams,
returning blood streams, radial waves, swarm movement, summon emergence, Frenzy
auras and bleed droplets use bounded production effects. Player numbers and allied
ground rings distinguish the form/companions from monsters. Eight active icons and
ten passive SVGs follow the current icon conventions. Cast/impact/channel audio
uses the existing mixer/synthesizer.

The legacy root ID and `crimsonFeast` remain. Removed nodes are eliminated from
both current/legacy spent maps by normal tree normalization, returning their costs
to the derived available-point pool. A versioned marker cleans retired passive
references; repeated loads grant no points. No extra bloodline point grant occurs.
The permanent bloodline and unrelated trees, slots, mastery and cooldowns survive.
Respec revokes purchased powers and live form/summons while preserving bloodline
traits, mastery and valid selected forms.

Royal, Frenzy, channels and bloodline companions are transient. Death/downing,
world changes, respec or inability to pay end the applicable state. Save snapshots
end these states on the saved copy and start their recovery without mutating the
live actor; load cannot restore a free active form or duplicate a beast. Cooldowns
use the existing clock rebasing. Online visual packets include the new form fields;
online transport itself was not redesigned.

## Balance decisions from the directive

- Suggested HP percentages, recovery rates, Royal benefits/drawbacks and core
  cooldown values are retained. Vampire attacks opt out of the old global direct
  tempo bonus so the listed recovery values are the actual values.
- Bat recovery starts **after the summon ends**, matching the existing persistent
  companion convention. With a full 30s lifetime this means 40s downtime afterward,
  rather than ten seconds if recovery had started at activation.
- Lance has a 60s maximum held duration and quarter-second upkeep/damage cadence.
  Its steering uses the existing aim rules. It never chains or pierces.
- Bleed extensions have an eight-second absolute lifetime per wound; regular
  successful fresh attacks can maintain new wounds. Companion and Frenzy recovery
  each use a shared-owner 1% max-HP token reserve with 1%/s refill.
- Model tests cover a 120-enemy group, four independent casters and mastery 1,000.
  Those checks establish bounded arithmetic/ownership, not a final PvP or endgame
  balance ranking. New bloodline powers are excluded from PvP, whose current
  resolver does not support this overhaul.

## Validation and remaining limits

`node tools/verify-vampire-overhaul.mjs`: **16 scenario groups passed**, covering
purchases, all nine powers, all eight morphs, actual weapon/companion damage,
five class combinations, HP safeguards, exact recovery, environment/typed damage,
four-player ownership, dense fights, migration, save and respec cleanup.

`node tools/verify-vampire-browser.cjs`: actual UI tree and ability menus, three
form options, max-HP cost descriptions, desktop/mobile views, controller-derived
beam hold/release and Royal toggle, production atlas/effect rendering. No page
errors or missing resources. The browser fixture uses isolated characters and
injects controller input; it is not a physical-controller playthrough.

The 11-suite engineering gate and 14 affected combat/class/summon/boss suites
passed. The former Gravecaller/Vampire tests now assert the deliberately removed
universal drain and the 10% outside-healing penalty. See local JSON reports and
logs in `tmp/combat-foundation/`; JSON and PNG captures follow existing ignore rules.

No human endurance playthrough, real network session, hardware latency or fresh
frame-time benchmark is claimed. The art uses existing production sprites and
procedural effects; further visual/audio polish and practical encounter tuning
remain iterative work. Existing unrelated working-tree changes were preserved.

Reproduce:

```powershell
node tools/build-vampire-icons.mjs
node tools/verify-vampire-overhaul.mjs
node tools/verify-gravecaller-sustain.mjs
node tools/verify-vampire-browser.cjs
npm run check:engineering
npm run build
```

The browser suite uses local port 8772 by default, or `RUNALIS_PREVIEW_URL`.
Provide `RUNALIS_PLAYWRIGHT_MODULE` for a Playwright installation; this session's
temporary installation is under `tmp/vampire-browser` and is not a game dependency.

Local review captures: [tree](tree-desktop.png), [Lance details](lance-desktop.png), [mobile ability sheet](lance-mobile.png), [production combat presentation](combat-presentation.png). Latest build: 333 startup modules and 890 staged game files. The online presentation regression also passed after adding the form fields to visual packets.

## Bat Beast mastery and royal art follow-up

[Bat Beast evolution contract and verification](../bat-mastery-evolution/README.md) records five visual stages at Call Bat Beast mastery 1/5/10/20/50. A living summon updates without healing, replacement or additional stat multipliers. Castle Veyreign’s final form and the player’s Royal skill now use the new royal sprite; the summon uses the same design in an allied silver-blue palette. The previous no-art-changes statement applies only to the original Vampire implementation.
