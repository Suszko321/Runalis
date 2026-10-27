import fs from 'node:fs';
import {getAbilityById} from '../src/data.js';
import {FELLHUNTER_MORPHS} from '../src/fellhunterSkills.js';
import {HELLSTALKER_SKILLS} from '../src/hellstalkerSkills.js';
const dir='docs/fellhunter-identity',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read(dir+'/before.json'),after=read(dir+'/after.json'),model=read(dir+'/verification.json'),browser=read(dir+'/browser-verification.json');
const focused=read('docs/subclass-reduction/regressions/results.json'),gameplay=read('docs/moment-gameplay/regressions/results.json');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const families={bloodhound:FELLHUNTER_MORPHS.bloodhound,hellstalker:HELLSTALKER_SKILLS};
const roles={bloodhound:['Bloodhound · The patient hunt','Build Bleed and Poison layers, then keep moving while the wounds work. Barbed shots, venom fangs, traps and evasive firing sustain a long hunt.'],hellstalker:['Hellstalker · The demonic caster','Cast violent, short-lived hellfire. Build three Embers, prepare Flashover, and spend Spirit on orbs, seals, rifts and eruptions.']};
const table=Object.entries(families).map(([family,skills])=>`## ${roles[family][0]}\n\n| Original skill | Morph | Job |\n| --- | --- | --- |\n${Object.entries(skills).map(([id,c])=>`| ${getAbilityById(id).name} | ${c.name} | ${c.desc} |`).join('\n')}`).join('\n\n');
const rotations=after.rotations.map(r=>{const old=before.rotations.find(x=>x.family===r.family&&x.developed===r.developed&&x.enemies===r.enemies);return `| ${r.family} | ${r.developed?'Developed trees':'No passives'} | ${r.enemies} | ${old.spentPoints} → ${r.spentPoints} | ${old.dps} → ${r.dps} | ${old.tailDamage} → ${r.tailDamage} |`;}).join('\n');
const csv=after.casts.map(r=>{const b=before.casts.find(x=>x.family===r.family&&x.id===r.id&&x.enemies===r.enemies);return [r.family,r.id,r.enemies,b.damage,r.damage,b.peakEffects,r.peakEffects].join(',');});
fs.writeFileSync(dir+'/cast-comparison.csv',['family,ability,enemies,before_damage_18s,after_damage_18s,before_peak_effects,after_peak_effects',...csv].join('\n')+'\n');
const summary={date:'2026-10-26',scope:'Fellhunter core ranged pressure, Bloodhound and Hellstalker',forms:30,protectedOtherForms:116,identityChecks:model.checks.length,
 browserCasts:browser.casts.length,anchoringChecks:browser.visual.length,focusedSuites:focused.suites.length,focusedPass:focused.pass,gameplaySuites:gameplay.suites.length,gameplayPass:gameplay.pass,
 timings:model.timings.map(r=>({kind:r.kind,meanTick:r.meanTick,lastTick:r.lastTick})),rotations:after.rotations,limits:['Controlled stationary practice fixtures, not full-game DPS or encounter win rates.','No claim of whole-game FPS/startup improvement.','Further playtesting should cover long boss fights, multiplayer and equipment extremes.']};
fs.writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2));
fs.writeFileSync(dir+'/README.md',`# Fellhunter: Fang & Hellfire

Implemented October 26, 2026. [Ability gallery](index.html) · [Stacked quarry](stacked-quarry.png) · [90 single-cast comparisons](cast-comparison.csv).

Fellhunter now emphasizes evasive ranged pressure, five-projectile morph volleys, trap setup and accuracy-based resource generation. The requested reference was the Demon Hunter's ranged attacks, volleys and evasive skills in [Blizzard's Diablo III abilities guide](https://eu.diablo3.blizzard.com/en-us/class/demon-hunter/active/). Runalis keeps its own Stamina/Spirit resources, equipment, combat systems, mastery 5/10 forms and mixed morph loadouts.

## The damage-over-time split

| Effect | Lifetime after application | Tick interval | Limit | Identity |
| --- | ---: | ---: | --- | --- |
| Infernal Brand | 1.8s | 0.3s | One brand, up to 3 Embers per owner/foe | Short, fierce pulses; renewed by continued fire hits |
| Bleed | 10s per layer | 1s | 8 independent layers per owner/foe | Slow accumulating wounds; existing layers expire naturally |
| Poison | 14s per layer | 1s | 6 independent layers per owner/foe | Slow venom pressure that outlasts repositioning |

In the level-33/mastery-20 Hunter Bow fixture, a fresh fire brand ticks for **11**, while fresh Bleed and Poison layers each tick for **3**. Fire's last recorded pulse was at 1.875s after casting; Bleed continued to 10.075s and Poison to 14.075s. Travel time accounts for the small offset. These are measured examples, not universal damage values. Stacked wounds become stronger through their layer count.

Bloodhound previously refreshed one five-second bleed and had no poison stack system. Hellstalker also used a five-second burn at a shared slow cadence. The new pools have independent timing rules. A 0.4s application cadence per type/foe prevents one simultaneous fan from instantly filling a wound cap. Each layer retains its own source, base potency and expiry; a new weak application cannot preserve every old powerful layer. At the cap, a fresh layer replaces the oldest. Removing a morph removes only its layers.

## Combat and tree changes

- Barbed Shot is a ranged Bleed builder, restoring 6 Stamina on a damaging hit. Hellfire Bolt restores 6 Spirit to fund larger spells. Cast costs still apply; misses, blocked projectiles and periodic ticks grant no refund.
- Razor Rain and Infernal Barrage fire five piercing projectiles in a wider fan. The original volley also has a wider hit cone. Native bow, melee weapon and handbow compatibility remains intact.
- Bloodhound mixes barbs, venom-coated projectiles, miasma and septic shrapnel. Weapon hits on an existing wounded quarry can add paced Bleed; they do not refresh older Poison or Bleed. Patient Predator strengthens newly applied layers by 25%.
- Hellstalker uses casting poses, black-cored fire orbs, cinder lances, demonic seals, fissures, a falling hellstar and rift escapes. Brimstone Rupture has a real 0.35s warning before damage. Three Embers prepare Flashover; Demonic Ascendance strengthens new brands. Its existing 10% exposure risk remains.
- Continued contact with an active fire field renews the short burn. Leaving its source allows only the remaining 1.8s brand; Bloodhound's longer wounds continue after leaving a poisoned area.
- Fast hunter projectiles now check the full segment they travel, preventing venom bolts and fire lances from skipping thin temporary walls between collision samples.
- Both opening doctrines can now reach mobility, caltrops and precision shots. Weighted Knives and Barbed Jaws explicitly improve periodic damage. Existing doctrine choices, node IDs and costs remain; no point migration or loss of learned abilities is needed.
- Red wound marks and green poison marks show separate layer counts on foes. The quarry HUD reports both counts. Infernal casting has deeper fire sounds, while Bloodhound retains physical hunting tools.

${table}

## Before/after samples

Same level 33, mastery 20, Hunter Bow, stationary targets 72 pixels ahead, four canonical skills: Practical Strike, Throwing Daggers, Execution Window and Kill Zone. Cast on readiness for 30 seconds, then stop casting for an 18-second tail. No primary weapon attacks or incoming damage; ample resources isolate output. Developed builds buy legal class/weapon paths through the actual point allowance, including aligned Expertise. Changed prerequisites allow different point spending. These are sample rotations, not optimal builds or encounter win rates.

| Family | Investment | Foes | Points before → after | DPS during casting, before → after | Damage after casting stops, before → after |
| --- | --- | ---: | ---: | ---: | ---: |
${rotations}

The new Bloodhound has less immediate burst and much more damage remaining after disengaging. Hellstalker concentrates its periodic pressure into a shorter window. The complete 90-case comparison includes both increases and reductions. It uses one cast per skill: empowerment effects need later attacks to contribute, and traps/fields are populated after placement.

## Verification

- ${model.checks.length} new identity checks: timing, independent expiry, separate caps, snapshot preservation, real bow hits, resource generators, Flashover cadence, delayed impacts, terrain, lifecycle, tree access and save/load.
- ${browser.casts.length} real browser morph casts, ${browser.visual.length} camera/animation checks, and an actual 8-Bleed/6-Poison quarry capture. No browser errors or missing assets.
- Existing checks: 270 casts with six weapon styles, 15 infernal casts, normal/elite/boss coverage in the 438-cast morph suite, 384 bow rendering cases, 24 weapon poses and eight audible family samples.
- ${focused.suites.length} focused model suites: ${focused.pass?'passed':'see results'}. ${gameplay.suites.length} broader gameplay suites: ${gameplay.pass?'passed':'see results'}. [Focused results](../subclass-reduction/regressions/results.json) · [Gameplay results](../moment-gameplay/regressions/results.json).
- Character information fits all 42 tested layouts; skill-tree/Expertise menus pass 18 class/viewport checks. All 116 non-Fellhunter morph definitions match their pre-pass snapshots, including Oathkeeper, Petalknight and Acolyte.

## Practical limits

Long boss fights, multiplayer and extreme equipment combinations still need player-session validation. These controlled fixtures do not measure full-game FPS or startup loading, and this balance pass makes no such improvement claim. State and particle sources remain bounded and owner-specific; enemy density, world scale and draw distance were not reduced. Periodic wounds, projectiles and pending eruptions clear on the relevant morph change, respec, death or world transition.

Reproduce with Node using tools/verify-fellhunter-identity.mjs and tools/benchmark-fellhunter-identity.mjs after. Browser checks use RUNALIS_NODE_MODULES with the local preview on port 8768. The pre-pass source and tools are preserved in the dated Codex backup outside the project.
`);
const sections=Object.entries(families).map(([family,skills])=>`<section id="${family}"><h2>${roles[family][0]}</h2><p>${roles[family][1]}</p><div class="grid">${Object.entries(skills).map(([id,c])=>`<article><h3>${escape(c.name)}</h3><small>${escape(getAbilityById(id).name)}</small><a href="${id}-${family}.png"><img loading="lazy" src="${id}-${family}.png" alt="${escape(c.name)} in combat"></a><p>${escape(c.desc)}</p><a class="play" href="../../combat-overhaul-lab.html?skill=${id}&morph=${family}&weapon=hunterBow">Try this ability →</a></article>`).join('')}</div></section>`).join('');
fs.writeFileSync(dir+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fellhunter · Fang & Hellfire</title><style>
*{box-sizing:border-box}body{margin:0;background:#15191b;color:#e9e1cf;font:17px/1.6 Georgia,serif}main{max-width:1440px;margin:auto;padding:36px}h1{font-size:clamp(36px,5vw,62px);line-height:1.1}h2{font-size:32px;margin-top:52px}h3{font-size:23px;margin:0}p{max-width:85ch}nav{display:flex;gap:24px;flex-wrap:wrap}a{color:#d4c5a2}small{color:#c4baa3}.timing{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:30px 0}.timing div{padding:18px;border:1px solid #4b4b42;border-radius:6px;background:#202629}.timing b{display:block;font-size:22px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{padding:20px;background:#202629;border:1px solid #424c46;border-radius:7px}article p{font-size:15px}article img{display:block;width:100%;margin-top:16px;border:1px solid #50594d}#bloodhound h2,#bloodhound h3{color:#bdd58e}#hellstalker h2,#hellstalker h3{color:#f4b475}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){main{padding:22px}.grid,.timing{grid-template-columns:1fr}}
</style><main><small>RUNALIS · FELLHUNTER</small><h1>Fang & Hellfire</h1><p>Evasive shots and prepared hunting grounds. Bloodhound leaves lasting wounds; Hellstalker conjures violent fire that burns out fast.</p><nav><a href="#bloodhound">Bloodhound</a><a href="#hellstalker">Hellstalker</a><a href="README.md">Balance report</a><a href="../../index.html">Return to Runalis</a></nav><div class="timing"><div><b>Hellfire · 1.8 seconds</b>Hard ticks every 0.3s<br>One brand, three Embers</div><div><b>Bleed · 10 seconds</b>Low ticks every second<br>Eight independent layers</div><div><b>Poison · 14 seconds</b>Low ticks every second<br>Six independent layers</div></div><p>These are actual combat captures. Open an image for detail, or try the skill in the practice arena. Primary morphs restore resources on damaging hits to fund the larger attacks.</p>${sections}<h2>A fully wounded quarry</h2><a href="stacked-quarry.png"><img style="max-width:100%;width:1000px" src="stacked-quarry.png" alt="Eight red Bleed marks and six green Poison marks on a marked quarry"></a></main></html>`);
console.log(JSON.stringify(summary));
