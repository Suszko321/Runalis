import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {SUBCLASSES,CLASS_SUBCLASSES} from '../src/subclassData.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {MORPH_MASTERY_LEVELS,getAbilityMorphOptions,getSelectedAbilityMorph,selectAbilityMorph,normalizeAbilityMorphs} from '../src/abilityMorphSystem.js';
import {getAbilityMastery,grantAbilityMasteryXp,masteryXpRequired} from '../src/abilityMasterySystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {SKILL_TREE_NODES,normalizeSkillTreeState,getAvailableSkillTreePoints,getEarnedSkillTreePoints} from '../src/skillTreeSystem.js';
import {expertiseNodeId,getPlayerExpertise} from '../src/skillExpertiseSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {initializeSimulatedSubclassPlayer} from '../src/simulatedSubclassPlayers.js';

const retired={gravecaller:'cursed',waverider:'hurricane',thornbinder:'lifebloom',lightbringer:'luminary',oathkeeper:'priest',fellhunter:'witchhunter'};
const expected={gravecaller:['acolyte','deathknight'],waverider:['sunken','cryomancer'],thornbinder:['fae','petalknight'],lightbringer:['sunscorched','dawnblade'],oathkeeper:['holyknight','sinner'],fellhunter:['bloodhound','hellstalker']};
const report={checks:[],families:expected,skills:0,forms:0},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const actor=cls=>{const p=createPlayer('Two-path review');chooseClass(p,cls);return p;};
test('each class has exactly the intended two paths, at mastery 5 and 10',()=>{
 assert.deepEqual(MORPH_MASTERY_LEVELS,[5,10]);assert.equal(Object.keys(SUBCLASSES).length,12);
 for(const [cls,ids] of Object.entries(expected))assert.deepEqual(CLASS_SUBCLASSES[cls],ids);
 for(const id of Object.values(retired)){assert.equal(SUBCLASSES[id],undefined);assert(!Object.values(SKILL_TREE_NODES).some(n=>n.expertise?.family===id));}
 for(const base of ABILITIES.filter(a=>expected[a.classId])){
  const p=actor(base.classId);unlockActiveAbility(p,base.id);const m=getAbilityMastery(p,base.id,true);report.skills++;
  for(const level of [1,4,5,9,10,19,20,21]){
   m.level=level;const options=getAbilityMorphOptions(p,base.id);assert.deepEqual(options.map(o=>o.id),['base',...expected[base.classId]]);assert.deepEqual(options.map(o=>o.requiredMastery),[1,5,10]);assert.deepEqual(options.map(o=>o.unlocked),[true,level>=5,level>=10]);
  }
  for(const id of expected[base.classId]){assert(selectAbilityMorph(p,base.id,id,10000).ok);assert.equal(resolveAbilityMorph(p,base.id,id).subclassId,id);report.forms++;}
  assert(!selectAbilityMorph(p,base.id,retired[base.classId],10000).ok);
 }
 assert.equal(report.skills,73);assert.equal(report.forms,146);
});
test('old saves return retired forms to Original, refund obsolete Expertise, and keep earned progress',()=>{
 for(const [cls,id] of Object.entries(retired)){
  const p=actor(cls),base=ABILITIES.find(a=>a.classId===cls);unlockActiveAbility(p,base.id);getAbilityMastery(p,base.id,true).level=20;
  const oldNode=expertiseNodeId(cls,id),valid=expected[cls][0];p.skillTree.bloodlineBonusPoints=20;const points=getAvailableSkillTreePoints(p);p.skillTree.spent[oldNode]=1;p.unlockedPassives.push(oldNode);p.abilityMorphs={[base.id]:id};p.abilityMorphUnlocks={[base.id]:[id]};p.abilityMorphVersion=2;p.selectedSubclass=id;
  p.summons=[{id:'retired',kind:'thornbeast',hp:50,summonMorph:id},{id:'retained',kind:'wolf',hp:70,summonMorph:valid}];p.combatEffects=[{subclassId:id},{kind:'other'}];p.activeChannel={abilityId:base.id,subclassId:id};p.abilityCharge={abilityId:base.id,subclassId:id};p.visualAction={subclassId:id};p.cooldowns[base.id]=100;
  const before=JSON.stringify({inventory:p.inventory,mastery:p.abilityMastery,loadout:p.loadout}),known=[...p.knownAbilities];migratePlayer(p);normalizeSkillTreeState(p);
  assert.equal(getSelectedAbilityMorph(p,base.id),null);assert.deepEqual(p.abilityMorphs,{});assert.equal(p.abilityMorphVersion,3);assert.equal(p.abilityMorphUnlocks,undefined);assert.equal(p.selectedSubclass,undefined);assert.equal(getPlayerExpertise(p),null);assert.equal(p.skillTree.spent[oldNode],undefined);assert(!p.unlockedPassives.includes(oldNode));assert.equal(getAvailableSkillTreePoints(p),points);
  assert.equal(JSON.stringify({inventory:p.inventory,mastery:p.abilityMastery,loadout:p.loadout}),before);assert.deepEqual(p.knownAbilities,known);assert.equal(p.cooldowns[base.id],100);assert.deepEqual(p.summons.map(s=>s.id),['retained']);assert.deepEqual(p.combatEffects,[{kind:'other'}]);assert.equal(p.activeChannel,null);assert.equal(p.abilityCharge,null);assert.equal(p.visualAction,null);
  const loaded=normalizeProfileSave(sanitizeForSave(p));migratePlayer(loaded);assert.deepEqual(loaded.abilityMorphs,{});assert.equal(loaded.abilityMastery[base.id].level,20);
 }
});
test('remaining selections survive repeated normalization and saving at their new unlock levels',()=>{
 for(const [cls,ids] of Object.entries(expected))for(const [index,id] of ids.entries()){
  const p=actor(cls),base=ABILITIES.find(a=>a.classId===cls);unlockActiveAbility(p,base.id);getAbilityMastery(p,base.id,true).level=MORPH_MASTERY_LEVELS[index];assert(selectAbilityMorph(p,base.id,id,10000).ok);
  for(let i=0;i<4;i++)normalizeAbilityMorphs(p);assert.equal(getSelectedAbilityMorph(p,base.id),id);const loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(getSelectedAbilityMorph(loaded,base.id),id);
 }
});
test('mastery 20 continues normal refinement without announcing a third subclass',()=>{
 for(const cls of Object.keys(expected)){
  const p=actor(cls),a=ABILITIES.find(a=>a.classId===cls);unlockActiveAbility(p,a.id);getAbilityMastery(p,a.id,true).level=19;const logs=[];grantAbilityMasteryXp(p,a.id,masteryXpRequired(19),10000,m=>logs.push(m));assert.equal(getAbilityMastery(p,a.id).level,20);assert(logs.some(s=>s.includes('technique refined')));assert(logs.every(s=>!s.includes('morph unlocked')));
 }
});
test('simulated adventurers use only Original or one of the remaining paths',()=>{
 for(const cls of Object.keys(expected))for(let i=0;i<8;i++){
  const npc={id:cls+i,classId:cls,simulatedPlayer:true,x:320,y:320,name:'Adventurer'};assert(initializeSimulatedSubclassPlayer(npc));assert(Object.values(npc.abilityMorphs).every(id=>expected[cls].includes(id)));assert(npc.loadout.abilitySlots.every(id=>id==null||getAbilityById(id)));
 }
});
fs.mkdirSync('docs/subclass-reduction',{recursive:true});fs.writeFileSync('docs/subclass-reduction/verification.json',JSON.stringify(report,null,2));console.log(`PASS ${report.checks.length} reduction checks; ${report.skills} skills, ${report.forms} remaining forms`);
