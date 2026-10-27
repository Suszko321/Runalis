import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {chooseClass as chooseInteractionClass} from '../src/gameInteraction.js';
import {getClassDefinition,getSelectableClassDefinitions,isClassAvailable} from '../src/classData.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {CHARACTER_CREATOR_OPTIONS} from '../src/characterCreator.js';
const standard=['gravecaller','thornbinder','waverider','oathkeeper','fellhunter'],disabled=['lightbringer','classless'];
assert.deepEqual(getSelectableClassDefinitions().map(c=>c.id).sort(),[...standard].sort());
assert.deepEqual(CHARACTER_CREATOR_OPTIONS.classes.map(c=>c.id).sort(),[...standard,'eldritch'].sort());
assert.equal(getSelectableClassDefinitions({includeHidden:true}).length,6);
for(const id of disabled){
 assert(!isClassAvailable(id));assert(getClassDefinition(id),'archive definition missing');
 const p=createPlayer('Blocked class');migratePlayer(p);const before={classId:p.classId,equipment:JSON.stringify(p.equipment),known:JSON.stringify(p.knownAbilities)};
 assert.equal(chooseClass(p,id),false);assert.equal(p.classId,before.classId);assert.equal(JSON.stringify(p.equipment),before.equipment);assert.equal(JSON.stringify(p.knownAbilities),before.known);
 assert.equal(chooseInteractionClass({player:p,log(){}},id),false);assert.equal(p.classId,before.classId);
 const definition=getClassDefinition(id),saved=createPlayer('Legacy '+id);Object.assign(saved,{classId:id,className:definition.name,classSkill:definition.skill,spiritAwakened:true});saved.skillState.combat.level=33;
 if(id==='lightbringer'){saved.knownAbilities=['block','lightbringerGleamBolt'];saved.unlockedAbilities=[...saved.knownAbilities];saved.loadout.abilitySlots=['lightbringerGleamBolt',null,null,null,'block'];saved.abilityMastery={lightbringerGleamBolt:{level:20,xp:123}};}
 migratePlayer(saved);const restored=migratePlayer(JSON.parse(JSON.stringify(sanitizeForSave(saved))));assert.equal(restored.classId,id);assert.equal(restored.className,definition.name);assert.equal(restored.skillState.combat.level,33);
 if(id==='lightbringer'){assert(restored.knownAbilities.includes('lightbringerGleamBolt'));assert.equal(restored.abilityMastery.lightbringerGleamBolt.level,20);assert.equal(restored.abilityMastery.lightbringerGleamBolt.xp,123);}
}
for(const id of [...standard,'eldritch']){const p=createPlayer(id);assert(isClassAvailable(id));assert(chooseClass(p,id));assert.equal(p.classId,id);assert(p.knownAbilities.includes('block'));}
assert(isClassAvailable('templar'));assert(isClassAvailable('hydromancer'));assert(!isClassAvailable('unknown'));
const hub=createCapitalHubWorld();assert(!hub.objects.some(o=>o.id==='lightbringerTrainer'));assert(hub.objects.some(o=>o.classId==='waverider'));assert(hub.objects.some(o=>o.classId==='thornbinder'));
const report={standard,hidden:'eldritch',disabled,legacyProfilesPreserved:true,selectionGates:['creator','player','interaction'],trainerRemoved:true};fs.mkdirSync('docs/temporary-class-roster',{recursive:true});fs.writeFileSync('docs/temporary-class-roster/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
