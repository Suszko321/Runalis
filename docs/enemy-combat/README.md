# Enemy combat presentation overhaul

Implemented in the existing Runalis project on 11 October 2026. The existing Canvas 2D renderer, pixel art, faction equipment, attack damage calculations, player combos, elite mechanics and boss identities remain authoritative. Original modified production files are backed up in `backups/enemy-combat-2026-10-11/`.

## 1. Core systems modified

- `enemyAttackPresentation.js` connects preparation, execution and recovery to the real enemy attack clock. Its state is temporary and never part of saved characters or enemies.
- `enemyBehaviors.js` and `combat.js` schedule previously instant basic attacks, correct double cooldown updates, apply attacks at release, support continuous charge movement, and cancel unfinished attacks appropriately.
- `enemyTelegraphGeometry.js` supplies shared warning and collision geometry. `combatVisualsRenderer.js` draws current warnings directly from live attacks rather than creating warning effects every frame.
- `humanoidEnemies.js`, `spriteArt.js` and `render.js` drive actual bodies and equipped weapons from those phases. Overlapping name labels are suppressed for the current frame, with boss and elite identities taking priority; health bars and enemy state are retained.
- `bossSystem.js`, `eliteEncounterSystem.js` and `encounterArt.js` synchronize existing special abilities and their warning footprints.
- `combatFeedbackProfiles.js` and `combatMoves.js` improve contact feedback and cosmetic reactions. Save, dungeon-floor and persistent-event paths discard unfinished presentation state.

## 2. Enemy animation coverage

All 15 supported gameplay archetypes received the shared timing, cancellation, reaction and impact pass. Related overworld, dungeon, quest and faction variants inherit it through their existing archetype and visual profile. Human bodies keep their real equipment and faction outfits. Monsters keep their own pixel atlases and anatomy.

“Complete” below means the applicable existing attack presentation was improved and synchronized. “Partial” means that the same timing work is implemented, but the creature still relies on its limited existing atlas frames and pixel-stepped motion rather than a newly authored, full directional animation sheet.

| Archetype | Coverage | Presentation |
| --- | --- | --- |
| Roadless bandit | Complete | Equipped weapon thrust/slash, visible commitment and recovery |
| Archer | Complete | Bow preparation and release; ordinary shots have restrained projectile feedback |
| Cultist | Complete for human variants; partial for creature variants | Cast preparation/release, faction-colored magic and existing special attacks |
| Demon cultist | Complete for human variants; partial for creature variants | Real staff/conductor pose and faction magic |
| Shield knight | Complete for human variants; partial for skeletal variants | Weapon preparation, directional guard break and traveling charge |
| Hollowling / Blighted Corpse | Partial | Existing corpse frames tied to a scheduled strike and recoil |
| Ash wolf | Partial | Bite preparation, forward contact motion and recovery |
| Stalker wolf | Partial | Existing lunge and bite timing with visible commitment |
| Gravebound | Partial | Skeletal attack frames and physical contact/recoil |
| Grave priest | Partial | Existing skeletal caster art with synchronized cast and summoning |
| Wraith | Partial | Phase preparation, directional strike and spectral recoil/dissolve |
| Veyr wraith | Partial | Spectral body preparation, release and recovery |
| Brute | Partial | Raised club during windup, lowered impact frame, slam and charge |
| Exploder | Partial | Body swelling, truthful detonation area and cancellation/restart |
| Basic beast | Partial | Existing beast anatomy and attack frames synchronized with bite/lunge |

No supported core archetype received **no improvement**. This does not claim that every named campaign enemy was individually played through or that new bespoke sheets were drawn for every monster.

## 3. Elite and boss warnings

All eight existing elite modifiers retain their mechanics: **Waller, Shocker, Freezer, Molten, Vortex, Artillery, Bulwark and Regenerator**. Their body poses and effects now follow their actual warnings/releases. Waller shows the real U-shaped obstruction and escape opening. Regenerator visibly prepares its interruptible heal. Bulwark retains its directional guard; it is not presented as a damaging ground attack. Existing persistent hazards, mines and intentional Molten death effects retain their lifetimes.

The eight supported boss appearances were captured in preparation and release: **Veyr Warden, Blighted Elk, Malakar, Seraphel, Zephyr Light, Last Dawn Executioner, Grave-Maw Bear and Briar Titan**. Warnings match the actual damage radii across their three phases. Decorative crosses, eyes and rifts use smaller ornamental effects rather than implying extra dangerous areas. Boss special timers continue advancing during basic attacks, and existing phase thresholds, minions and rewards are preserved.

Directional guard breaks and phase strikes use cones. The seven existing charge styles—charge rush, shield charge, duelist thrust, spectral lunge, infernal rush, root burrow and judgment charge—show the actual locked travel corridor. Ordinary arrows, curse bolts and summoning do not receive misleading area warnings.

## 4. Signature attacks

No additional boss or elite ability was invented: the existing roster already has suitable signatures. The pass makes those abilities readable and physically represented. Previously instantaneous charges now travel over multiple frames, sweep their actual collision corridor and hit each eligible victim once. Previously instantaneous basic melee attacks now prepare, commit and recover; moving out of reach can make them miss.

## 5. Reactions and impact feedback

Light hits use short contact sparks and restrained directional recoil. Heavy hits use larger contact shards and stronger weight-sensitive reactions. Contact effects use physical/material and elemental palettes. Damage-over-time and sustained channels receive throttled, subtle feedback instead of repeated large flashes. Direct damage, primary weapons, summon strikes and relevant damage-over-time paths share these improvements.

Recoil is cosmetic, separate from authoritative stagger and crowd control. Human legs and bodies are not stretched for impacts. Skeletal deaths use bone fragments; spectral deaths dissolve and fully fade. Actual hits use existing hit, heavy-hit, block and projectile sounds. The existing camera-shake opt-out remains respected.

## 6. Damage and animation synchronization

AI owns damage; the renderer cannot deal damage. A single attack state supplies windup, aim, execution and recovery to both the real hit callback and the rendered pose. Basic attacks track early, then commit their direction before release. Major attacks use the same geometry for the warning and affected actors, with existing range, visibility and line-of-sight checks retained.

Area attacks now correctly consider eligible party members and summons within that geometry, while allies outside it remain safe. A charge sweeps the distance actually traveled and remembers victims already hit. Canceled, dead, dormant or returning enemies cannot finish an unfinished attack. Cosmetic hit feedback does not pause enemy combat clocks or accidentally create repeated stun locks.

## 7. Performance and cleanup

Temporary animation/basic/charge state lives in weak maps. Current warnings are drawn from active attacks and disappear with them. Contact effects are short-lived, throttled and bounded; no per-frame warning copies enter the effect queue. Unfinished attacks and visual clocks are excluded from character saves, dungeon-floor snapshots and persistent encounter memory. Live elite hazards keep their established disposal behavior.

The final standalone lab sample measured combined update/render time at **9.9 ms median / 11.4 ms p95 for 15 actors**, and **15.6 ms median / 19.5 ms p95 for 80 actors** over 240 samples each. The generated early/late dungeons measured update p95 at **2.0 / 3.2 ms**, with render p95 at **8.3 / 10.3 ms**. Those separately sampled values are not summed percentiles or guaranteed frame rates. Results are recorded in `browser-checks.json` and the generated-dungeon report linked below. Headless browser measurements are local samples, not a guaranteed frame rate on every machine. The 80-actor stress case is intentionally more demanding than the representative 15-actor lab pack.

## 8. Verification and independent review

- **16 focused production checks:** all archetypes prepare before damage; miss/commit/recovery; one cooldown update; phase-strike release; geometry and safe areas; interruption/death; cosmetic clocks and proportions; contact bounds; boss phase radii; serialization; continuous charges; party/summon area hits; 80-enemy simulation.
- **Browser gameplay checks:** all 15 archetypes, eight bosses and eight modifiers; 57 loaded art assets; no browser errors or failed asset requests. Sixty captured frames show preparation, release, recovery, actual unprotected melee damage, charge travel, light/heavy contact, death and mixed combat. Real keyboard input also exercises primary attacks, heavy attacks and dodging.
- **Dense-nameplate verification:** checks the text actually painted by the production renderer for overlap and confirms boss priority without changing enemy flags.
- **Generated production dungeons:** early Ashen Orchard and late Ascension Spire, including the four-player density configuration, ran 1,800 sampled frames with no failures. Those scenarios use a protected measurement actor to keep AI and rendering active; they do not establish survival balance.
- **Regression suites passed:** combat overhaul, enemy density/review/pacing, enemy roster/gear, visibility, melee combos, skill morphs, Expertise, progression, hotbar-only mastery, summon regeneration, Gravecaller movement, general animation and final-boss return portals. Existing loot, reward, quest, controller and progression authorities were retained.
- An independent critical review of production code and actual rendered attack sequences identified several defects that were corrected: interrupted pose fallback, boss timer starvation, Exploder restart, charge travel timing, ordinary projectile false area bursts, area targeting and contact capture. A final review found no remaining correctness blocker. It did not cover extended campaign play or assess audio through listening.

Evidence: [automated checks](checks.json), [browser report](browser-checks.json), [gameplay recording](combat-review.webm), [generated dungeon sampling](../enemy-density/production-verification.json), and [initial audit](AUDIT.md).

Open `http://127.0.0.1:8768/enemy-combat-lab.html` to inspect production combat without altering a saved character. Use the enemy selector, start/pause, protection toggle, movement, primary/heavy attacks and dodge controls.

## 9. Remaining limits

The limited existing monster/boss atlas frames are the main animation limitation; this pass did not generate bespoke directional sheets for every named enemy. Ordinary enemy ranged shots retain their existing hitscan damage at release, accompanied by projectile visuals, rather than changing the established combat model to ballistic projectiles. Dense bodies and health bars can still overlap, although colliding name labels are now suppressed. Legacy boss mechanics remain their existing attacks, with improved presentation rather than new bespoke multi-stage encounters.

No full campaign, extended human controller session or audio listening review was performed. The reviewer and implementation do not claim a 9/10 visual result or guaranteed 60 FPS. The strongest verified gains are damage/pose synchronization, truthful major warnings, attack cleanup and distinct impact feedback; creature frame richness and dense body readability remain partial.
