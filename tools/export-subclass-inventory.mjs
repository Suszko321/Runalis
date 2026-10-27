import fs from 'node:fs';
import {ABILITIES} from '../src/data.js';
import {CLASS_SUBCLASSES} from '../src/subclassData.js';
import {getAbilityMorphOptions} from '../src/abilityMorphSystem.js';
const inventory=ABILITIES.filter(a=>CLASS_SUBCLASSES[a.classId]).map(a=>{
 const actor={classId:a.classId,knownAbilities:[a.id],abilityMastery:{[a.id]:{level:20,xp:0}},abilityMorphs:{}};
 return {id:a.id,name:a.name,classId:a.classId,forms:getAbilityMorphOptions(actor,a.id).map(o=>({form:o.id,name:o.name,requiredMastery:o.requiredMastery,mode:o.ability.subclassMode||o.ability.role||'original',description:o.ability.desc,element:o.ability.element,cost:o.ability.cost,costType:o.ability.costType,cooldown:o.ability.cd,channel:o.ability.channelProfile||null}))};
});
fs.mkdirSync('docs/skill-morphs',{recursive:true});fs.writeFileSync('docs/skill-morphs/inventory.json',JSON.stringify(inventory,null,2));
const rows=inventory.map(a=>`| ${a.classId} | ${a.name} (${a.id}) | ${a.forms.slice(1).map(o=>`${o.name} (M${o.requiredMastery}): ${o.mode}`).join(' | ')} |`);
fs.writeFileSync('docs/skill-morphs/SKILL_INVENTORY.md',`# Optional skill morphs\n\nEvery listed skill keeps its original form and canonical ID. Skill mastery unlocks two optional forms independently, at levels 5 and 10; no class-wide identity or trait package is selected.\n\n| Class | Original skill | Mastery 5 | Mastery 10 |\n|---|---|---|---|\n${rows.join('\n')}\n`);
console.log(`Exported ${inventory.length} original skills and ${inventory.length*2} optional mastery morphs.`);
