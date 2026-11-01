import {VAMPIRE_MORPHS,resolveVampireMorph} from '../src/vampireData.js';
// Read-only catalogue export. No game saves, runtime data or balance are changed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ABILITIES, ITEMS, getAbilitySkillRequirement} from '../src/data.js';
import {RUNALIS_CLASSES, getSelectableClassDefinitions, TEMPORARILY_UNAVAILABLE_CLASSES} from '../src/classData.js';
import {CLASS_SUBCLASSES, SUBCLASSES} from '../src/subclassData.js';
import {SUBCLASS_SKILL_PLANS, resolveAbilityMorph} from '../src/subclassVariants.js';
import {SKILL_TREE_NODES, SKILL_TREE_ORDER} from '../src/skillTreeSystem.js';
import {RUNALIS_SKILLS} from '../src/skills.js';
import {BLOODLINE_DEFINITIONS} from '../src/bloodlineSystem.js';
import {ARMOUR_SETS, WEAPON_SETS} from '../src/setBonusSystem.js';
import {MAJOR_BOSSES} from '../src/bossData.js';
import {ELITE_MODIFIERS, FRONTIER_ENCOUNTERS, DUNGEON_ENCOUNTERS} from '../src/encounterData.js';
import {MELEE_LIGHT_COMBOS} from '../src/meleeLightCombos.js';
import {createPlayer, chooseClass, migratePlayer} from '../src/player.js';
import {applyAbilityMastery, getAbilityMastery} from '../src/abilityMasterySystem.js';
import {calculateAbilityDamage} from '../src/combat.js';
import {calculateWeaponDamage} from '../src/combatMoves.js';
import {progressionPower} from '../src/combatPower.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,process.argv[2]||'docs/combat-audit');
fs.mkdirSync(out,{recursive:true});
const round=n=>typeof n==='number'&&Number.isFinite(n)?Number(n.toFixed(4)):n;
const cell=v=>String(v??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const table=(headers,rows)=>[headers,headers.map(()=>'---'),...rows].map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n');
const canonicalClasses=Object.values(RUNALIS_CLASSES).filter(c=>!c.aliasFor);
const forms=ABILITIES.flatMap(base=>[
  {...base,form:'base'},
  ...(SUBCLASS_SKILL_PLANS[base.id]?CLASS_SUBCLASSES[base.classId]||[]:[]).map(family=>({...resolveAbilityMorph({classId:base.classId},base,family),form:family})),
  ...(VAMPIRE_MORPHS[base.id]||[]).map(form=>({...resolveVampireMorph(base,form),form}))
]);
const nodes=Object.values(SKILL_TREE_NODES);
const counts={canonicalClasses:canonicalClasses.length,ordinarySelectableClasses:getSelectableClassDefinitions().length,
  hiddenSelectableClasses:getSelectableClassDefinitions({includeHidden:true}).filter(c=>c.hidden).length,
  originalAbilities:ABILITIES.length,morphParents:Object.keys(SUBCLASS_SKILL_PLANS).length,
  morphFamilies:Object.keys(SUBCLASSES).length,bloodlineMorphParents:Object.keys(VAMPIRE_MORPHS).length,bloodlineOptionalForms:Object.values(VAMPIRE_MORPHS).flat().length,optionalForms:forms.filter(a=>a.form!=='base').length,
  originalChannels:ABILITIES.filter(a=>a.channelProfile).length,treeNodes:nodes.length,trees:SKILL_TREE_ORDER.length,
  summonAbilities:ABILITIES.filter(a=>a.summonType).length};
const scaling=[1,5,15,33,65,100,250,1000].map(level=>{
  const p=createPlayer('Audit fixture');chooseClass(p,'gravecaller');
  p.skillState.combat.level=level;for(const s of Object.values(p.skillState.skills))s.level=level;
  migratePlayer(p);getAbilityMastery(p,'graveSpark',true).level=level;
  const a=applyAbilityMastery(p,ABILITIES.find(a=>a.id==='graveSpark'));
  return {level,offence:round(progressionPower(p,'spirit')),defence:round(progressionPower(p,'warding','defence')),
    abilityReferenceDamage:calculateAbilityDamage(p,a),weaponReferenceDamage:calculateWeaponDamage(p,ITEMS.graveScythe,'scythe'),
    maxHp:p.maxHp,maxSpirit:p.maxSpirit,maxStamina:p.maxStamina,cost:a.cost,equipment:{...p.equipment}};
});
const data={counts,temporarilyUnavailable:TEMPORARILY_UNAVAILABLE_CLASSES,classes:canonicalClasses,subclasses:SUBCLASSES,
  forms,nodes,skills:RUNALIS_SKILLS,bloodlines:BLOODLINE_DEFINITIONS,armourSets:ARMOUR_SETS,weaponSets:WEAPON_SETS,
  weaponTypes:[...new Set(Object.values(ITEMS).filter(i=>i.slot==='weapon').map(i=>i.weaponType))].sort(),
  lightCombos:MELEE_LIGHT_COMBOS,bosses:MAJOR_BOSSES,eliteModifiers:ELITE_MODIFIERS,
  frontier:FRONTIER_ENCOUNTERS,dungeons:DUNGEON_ENCOUNTERS,scaling};
const serialize=(_,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v;
fs.writeFileSync(path.join(out,'catalogue.json'),JSON.stringify(data,serialize,2)+'\n');
const sections=[
  '# RUNALIS combat catalogue',
  'Generated from current runtime exports by `node tools/audit-combat-foundation.mjs`. Regenerate after catalogue changes. These are authored/resolved definitions, not universal final hit values. Runtime balance overrides, mastery, charge, Expertise, gear and hit delivery apply afterward. `0` damage can still reach a generic reference-power formula; handlers decide whether it deals damage.',
  '## Scope',table(['Measure','Count'],Object.entries(counts)),
  '## Classes',table(['ID','Name','Availability','Passive','Starting slots'],canonicalClasses.map(c=>[c.id,c.name,TEMPORARILY_UNAVAILABLE_CLASSES.includes(c.id)?'Unavailable for new selection':c.hidden?'Hidden / unlock required':'Selectable',c.passive?.name,c.abilitySlots.join(', ')])),
  '## Morph families',table(['Class','Mastery 5','Mastery 10'],Object.entries(CLASS_SUBCLASSES).map(([id,f])=>[id,...f])),
  '## Original skills and every supported form',
  'Costs and cooldowns below are before progression modifiers. Range is in world pixels; radius is separate. Channel upkeep is per second. See `catalogue.json` for every resolved property, flags, targeting caps, status metadata and descriptions.',
  table(['Canonical ID','Form','Name','Mode / role','Cost','CD (s)','Damage / multiplier','Range / radius','Channel upkeep','Description'],forms.map(a=>[a.id,a.form,a.name,a.subclassMode||a.effectProfile||a.role||a.summonType||'handler',a.vampire?`${a.hpCostPct}% max HP`:`${a.cost??0} ${a.costType||'stamina'}`,round(a.cd||0),`${a.damage??0} / ${round(a.damageMultiplier)??1}`,`${round(a.range)||0} / ${a.subclassRadius??a.radius??'handler'}`,a.channelProfile?a.vampire?`1% max HP/s; ${a.channelProfile.duration}s ${a.channelProfile.mode}`:`${round(a.channelProfile.costPerSecond)||0} ${a.costType}/s; ${a.channelProfile.duration}s ${a.channelProfile.mode}`:'—',a.desc])),
  '## Skill trees, passives and purchases',
  'Includes active unlock nodes and Expertise as well as passives. Class passive identities are listed above; their handlers are in `classPassives.js`. Tree IDs are implementation keys, not class names.',
  table(['Tree','Node','Name','Role','Cost','Requires','Unlocks','Bonuses','Description'],nodes.map(n=>[n.tree,n.id,n.name,n.role,n.cost,(n.requires||[]).join(', '),n.unlocksAbility||n.abilityId||'—',JSON.stringify(n.bonuses||{}),n.desc])),
  '## Summon ability definitions',table(['ID','Name','Kind','Cost','Cooldown','Form variants'],ABILITIES.filter(a=>a.summonType).map(a=>[a.id,a.name,a.summonType,`${a.cost} ${a.costType}`,a.cd,(CLASS_SUBCLASSES[a.classId]||[]).join(', ')])),
  '## Equipment sets',table(['ID','Name','Threshold bonuses'],Object.entries({...ARMOUR_SETS,...WEAPON_SETS}).map(([id,s])=>[id,s.name,JSON.stringify(s.bonuses)])),
  '## Major boss definitions',table(['ID','Name','Phases','Authored attacks'],Object.values(MAJOR_BOSSES).map(b=>[b.id,b.name,b.phases.map(p=>`${p.phase}: ${p.formName} (${p.healthThreshold})`).join('; '),b.phases.map(p=>p.attackPatterns.join(', ')).join('; ')])),
  'Boss definitions contain encounter intent; specialized runtime handlers can supersede attack names/behavior. Additional dungeon bosses live in orchard, grove and Veyreign modules.',
  '## Elite modifiers',table(['ID','Name','Counterplay'],Object.entries(ELITE_MODIFIERS).map(([id,e])=>[id,e.name,e.counter])),
  '## Progression reference sweep',
  'Synthetic equal-level attributes and ability mastery, freshly created Gravecaller with empty equipment, no chosen morph/Expertise, stationary reference formulas. This is not DPS, TTK or evidence of endgame balance. Only the weapon reference supplies graveScythe explicitly; the ability uses the empty fixture equipment recorded in JSON.',
  table(['Level','Offence','Defence','Bolt reference','Scythe reference','Max HP','Max Spirit','Max Stamina','Bolt cost'],scaling.map(r=>[r.level,r.offence,r.defence,r.abilityReferenceDamage,r.weaponReferenceDamage,r.maxHp,r.maxSpirit,r.maxStamina,r.cost]))
];
fs.writeFileSync(path.join(out,'INVENTORY.md'),sections.join('\n\n')+'\n');
console.log(JSON.stringify({output:path.relative(root,out),...counts,scaling},null,2));
