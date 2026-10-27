import fs from 'node:fs';
import {getAbilityById} from '../src/data.js';
import {OATHKEEPER_MORPHS} from '../src/oathkeeperMorphs.js';
import {OATH_BLADE_PROFILES} from '../src/oathbladeProfiles.js';
const dir='docs/oathkeeper-identity',read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const before=read(dir+'/before.json'),after=read(dir+'/after.json'),model=read(dir+'/verification.json'),browser=read(dir+'/browser-verification.json');
const regressions=read('docs/subclass-reduction/regressions/results.json'),gameplay=read('docs/moment-gameplay/regressions/results.json');
const html=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const jobs=family=>[...Object.entries(OATHKEEPER_MORPHS[family]),['oathkeeperHallowedBlades',OATH_BLADE_PROFILES[family]]];
const rotationRows=after.rotations.map(r=>{
 const old=before.rotations.find(x=>x.family===r.family&&x.invested===r.invested);
 return `| ${r.family} | ${r.invested?'Developed trees':'Skill unlocks only'} | ${old.spentPoints} → ${r.spentPoints} | ${old.dps} | ${r.dps} |`;
}).join('\n');
const castRows=after.casts.map(r=>{
 const old=before.casts.find(x=>x.id===r.id&&x.family===r.family&&x.enemies===r.enemies);
 return [r.family,r.id,r.enemies,old.damage,r.damage,old.healthChange,r.healthChange,old.maxEffects,r.maxEffects].join(',');
});
fs.writeFileSync(dir+'/cast-comparison.csv',['family,ability,enemies,before_damage,after_damage,before_net_healing,after_net_healing,before_peak_effects,after_peak_effects',...castRows].join('\n')+'\n');
const summary={date:'2026-10-26',scope:'Oathkeeper Holyknight and Sinner morphs; original ability definitions preserved',modelChecks:model.checks.length,
 protectedOtherForms:120,visualCasts:browser.casts.length,animationChecks:browser.visual.checks.length,
 modelSuites:regressions.suites.length,modelSuitesPassed:regressions.pass,gameplaySuites:gameplay.suites.length,gameplaySuitesPassed:gameplay.pass,
 rotations:after.rotations,limitations:['Stationary target simulations are not full-game DPS or encounter win rates.','Developed paths use the normal level-33 point entitlement; branch choices and points spent are shown.','No claim of measured whole-game FPS or startup improvement from this balance pass.']};
fs.writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2));
const descriptions=Object.fromEntries(['holyknight','sinner'].map(f=>[f,jobs(f).map(([id,c])=>`| ${getAbilityById(id).name} | ${c.name} | ${c.desc} |`).join('\n')]));
fs.writeFileSync(dir+'/README.md',`# Oathkeeper: Resolve & Requiem

Implemented October 26, 2026. [Visual gallery](index.html) · [Combat sheet](combat-sheet.png) · [All 52 before/after cast comparisons](cast-comparison.csv).

Holyknight is a close-range bruiser built around mace pressure, blocking and earned recovery. Sinner is a durable melee-and-magic hybrid built around death-swords, pack control and active survival. Individual skill morphs remain mixable; mastery 5/10 and final Expertise selection retain their existing rules. Petalknight, Acolyte and all 120 other class morph definitions match their pre-pass hashes exactly.

## Findings and corrections

- Sinner previously combined stronger repeatable melee, a Penance damage multiplier, wounded damage and life recovery on every affected enemy. Even its healing and utility forms paid 4% current health. The old 30-second sample rotation exceeded the glass-cannon comparison below. Penance now rewards close combat and injuries, then buys pack damage or deliberate healing. Remote kills, fields, channels and sword echoes cannot generate it.
- Many Holyknight forms reused a generic ward, while both Sinner defensive spells reused retaliation. Each skill now has an authored job. Holyknight gains three Resolve through spaced close hits/clean blocks, and spends it on a focused hammer, an area finisher or Second Wind. Sinner spends three Penance on recovery or two returning swords that cannot hit the primary victim.
- Authored percentage healing and protection bypass the old cast-level extra scaling. Their ongoing effects and immediate casts now use the same protection rules. Sinner melee lifesteal shares a hard 3%-maximum-health budget per second across skills and victims, after healing bonuses.
- Aimed ground conjurations snap along the aim toward a visible enemy when one is present, avoiding the previous tendency to overshoot nearby targets. Terrain still blocks attacks, approaches and movement.

## Tree cleanup and saves

Removed **Mace and Mandate** and **Guardian Oath** as repeated stat gates. Their useful bonuses are consolidated into Close Quarters and Bastion Training. Last Rite has its own two-point recovery node from the core. Both opening doctrines can be developed, and either route reaches mobility and conjurations. Holy and necrotic investments now both support the appropriate Oathkeeper family.

The 13 canonical abilities, mastery, morph choices and cooldown keys are preserved. A purchased Living Bastion keeps its learned heal through the new recovery node: the former Guardian Oath investment supplies that node. Other removed gate costs return to available points. Migration is idempotent and tested through save/load. Original Oathkeeper ability definitions, Blunt proficiency and mace combos are preserved.

## Holyknight jobs

Base percentages below precede tree/Expertise bonuses. Resolve fades after eight seconds without combat.

| Original skill | Holyknight morph | Job |
| --- | --- | --- |
${descriptions.holyknight}

## Sinner jobs

Penance caps at six and fades outside combat. Only Impaling Sentence, Borrowed Blades, Requiem and the sword formation spend health; their 2%-current-health sacrifice cannot kill the player. Healing rites have no self-cost.

| Original skill | Sinner morph | Job |
| --- | --- | --- |
${descriptions.sinner}

## Measurements

Same level 33, skill mastery 20, starter mace/bow, stationary boss at melee reach, 30 seconds, four attack skills and ample resources. Developed samples buy legal class and weapon paths using the real point entitlement and aligned Expertise. Choices and points spent differ between trees; these are reproducible sample builds, not a universal class ranking. No primary-weapon attacks or incoming damage occur in this output comparison.

| Family | Investment | Points before → after | Before DPS | After DPS |
| --- | --- | ---: | ---: | ---: |
${rotationRows}

Sinner is below the tested Hellstalker rotation in both samples. Its formation redirects power into splinters against up to two additional enemies, and Penance echoes add no damage against a lone victim. The separate 52-cast comparison includes 1- and 16-enemy fixtures and net health changes; it also records lower focused damage rather than presenting every reduction as an improvement. Marks, Borrowed Blades and reactive guards require weapon contacts or incoming attacks; zero standalone cast damage is intentional and their triggers are tested separately.

## Visual identity and regression checks

Holyknight keeps gold, ivory, heavy mace/hammer impacts, shields and readable ground boundaries. Sinner now uses black grave-swords edged in violet and pale death-light: a sword tomb, funeral lance, rising impalements, a moving sword procession and reclaiming spirits. Delayed impacts have visible warnings; effects stay anchored to the world. Fields, pending strikes and weapon replies are owner-specific, bounded and cleared on death, world changes, morph changes and respec.

- ${model.checks.length} new identity checks: actual mace contacts, Resolve cadence, Penance spending, pack-only echoes, shared healing limits, terrain, channel release/upkeep, lifecycle, tree reachability, migration and protected forms.
- ${browser.casts.length} real browser casts and ${browser.visual.checks.length} animation/camera checks, with no page errors or missing assets.
- ${regressions.suites.length} focused model suites and ${gameplay.suites.length} broader gameplay suites. [Focused results](../subclass-reduction/regressions/results.json) · [Gameplay results](../moment-gameplay/regressions/results.json).
- Creator information: 42 layouts. Skill-tree/Expertise menus: 18 class/viewport checks, with real purchases/respec and no missing icons. Existing original/morph browser checks cover 39 casts, 16 directional mace cases and audible impact samples.

## Limits and follow-up

Damage/healing tests use deterministic practice fixtures; they do not establish live encounter win rates, multiplayer balance, every equipment interaction or optimal rotations for every glass-cannon family. Validate survival and pack-clear time on long overworld/boss sessions with several gear tiers. This pass does not claim a measured improvement to whole-game FPS or startup time. Cosmetic source changes are limited to Oathkeeper; no enemy density, world scale or draw-distance settings were reduced.

Reproduce with Node: tools/benchmark-oathkeeper-identity.mjs after, tools/verify-oathkeeper-identity.mjs, and the existing regression runners. Browser checks use RUNALIS_NODE_MODULES and the local preview on port 8768. The pre-pass source and retired passive icons are preserved outside the project in the dated Codex backup.
`);
const familyCopy={holyknight:'Close hits and clean blocks build Resolve. Spend it on a crushing hammer, a second shockwave, or Second Wind.',sinner:'Build Penance in melee or through injuries. Reclaim life or send unholy swords through nearby foes; focused damage gives way to pack pressure.'};
const sections=['holyknight','sinner'].map(f=>`<section id="${f}"><h2>${f==='holyknight'?'Holyknight · Resolve':'Sinner · Requiem'}</h2><p>${familyCopy[f]}</p><div class="grid">${jobs(f).map(([id,c])=>`<article><h3>${html(c.name)}</h3><p class="origin">${html(getAbilityById(id).name)}</p><a href="${id}-${f}.png"><img loading="lazy" src="${id}-${f}.png" alt="${html(c.name)} in the practice arena"></a><p>${html(c.desc)}</p><a class="play" href="../../combat-overhaul-lab.html?skill=${id}&morph=${f}&weapon=oathkeepersMace">Try this ability →</a></article>`).join('')}</div></section>`).join('');
fs.writeFileSync(dir+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oathkeeper · Resolve & Requiem</title><style>
*{box-sizing:border-box}body{margin:0;background:#15181b;color:#e5ded0;font:17px/1.6 Georgia,serif}main{max-width:1440px;margin:auto;padding:38px}h1{font-size:clamp(32px,5vw,60px);line-height:1.1;margin:12px 0}h2{font-size:32px;margin-top:54px}h3{margin:0;font-size:22px}p{max-width:85ch}a{color:#cdb9ed}nav{display:flex;gap:22px;flex-wrap:wrap;margin:28px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{padding:22px;background:#20252a;border:1px solid #414449;border-radius:8px}article p{font-size:15px}.origin{color:#afa999;margin:3px 0 15px}img{width:100%;display:block;border:1px solid #50544d}#holyknight h2,#holyknight h3{color:#e1c982}#sinner h2,#sinner h3{color:#c9b4e8}.play{display:inline-block;margin-top:8px}small{letter-spacing:.14em;color:#bbb29e}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){main{padding:22px}.grid{grid-template-columns:1fr}}
</style><main><small>RUNALIS · OATHKEEPER</small><h1>Resolve & Requiem</h1><p>A bruiser who earns their second wind. A deathblade who fights through a storm of conjured swords. Two distinct ways to hold the front line.</p><nav><a href="#holyknight">Holyknight</a><a href="#sinner">Sinner</a><a href="README.md">Balance report and results</a><a href="../../index.html">Return to Runalis</a></nav><p>These images come from actual combat casts. Open an image for a closer look, or try a skill in the practice arena. Morphs remain mixable; your existing mastery and final Expertise rules still apply.</p>${sections}</main></html>`);
console.log(JSON.stringify(summary));
