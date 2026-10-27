import assert from 'node:assert/strict';
import {ABILITIES,getAbilityById,getAbilitySkillRequirement,getUnlockedAbilitiesForPlayer} from '../src/data.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityAvailability,unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {abilityRequirements} from '../src/uiInformation.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {CLASS_SUBCLASSES} from '../src/subclassData.js';
import {useAbility} from '../src/combat.js';
import {readSkillScroll} from '../src/skillScrollSystem.js';

let classSkills=0,morphs=0,casts=0;
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
function player(classId){
 const p=createPlayer('Skill gate check');assert(chooseClass(p,classId));p.spiritAwakened=true;
 p.skillState.combat.level=80;migratePlayer(p);p.spirit=p.maxSpirit;p.stamina=p.maxStamina;
 for(const skill of Object.values(p.skillState.skills))assert.equal(skill.level,1);
 return p;
}
for(const a of ABILITIES.filter(a=>a.classId)){
 const p=player(a.classId);unlockActiveAbility(p,a.id,{autoAssignEmpty:false});
 assert.equal(getAbilitySkillRequirement(a),0,a.id);
 assert.equal(getAbilitySkillRequirement({...a,unlockLevel:999}),0,'Legacy copies cannot reintroduce class proficiency gates');
 assert(getAbilityAvailability(p,a).usable,`${a.id}: class skill usable with level-one proficiency`);
 assert(assignAbilityToSlot(p,0,a.id).ok,`${a.id}: hotbar assignment`);
 assert(getUnlockedAbilitiesForPlayer(p).some(known=>known.id===a.id),'Legacy reader preserves learned, unused class skills');
 assert.doesNotMatch(abilityRequirements(a),/\b\d+\b/,'No proficiency threshold in class requirements');classSkills++;
 for(const family of CLASS_SUBCLASSES[a.classId]||[]){
  const form=resolveAbilityMorph(p,a,family);
  assert.equal(getAbilitySkillRequirement(form),0);assert(getAbilityAvailability(p,form).usable);
  assert.doesNotMatch(abilityRequirements(form),/\b\d+\b/);morphs++;
 }
}
// Former high-level gates are exercised through the real gameplay dispatcher.
for(const [classId,id] of [['waverider','hydromancerBubbleWard'],['thornbinder','thornbinderSummonElderThornbeast'],['oathkeeper','oathkeeperJudgmentSmite'],['gravecaller','soulSiphon'],['lightbringer','lightbringerDawncarver'],['eldritch','redMawRift']]){
 const p=player(classId),w=world();Object.assign(p,{x:260,y:320,dirX:1,dirY:0});
 unlockActiveAbility(p,id,{autoAssignEmpty:false});p.loadout.abilitySlots[0]=id;
 if(p.lightbringer)p.lightbringer.lumens=3;
 w.enemies=[{id:'foe',name:'Target',kind:'rat',x:350,y:320,hp:10000,maxHp:10000,radius:14,r:14}];
 const logs=[];assert(useAbility(0,p,w,m=>logs.push(m),performance.now()/1000+20,{combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true}),`${id}: ${logs.join('; ')}`);casts++;
}
// Scroll gates remain functional. A higher authored scroll threshold exercises
// the shared policy without changing the shipped beginner scroll's level-one gate.
const guard=getAbilityById('guard'),old=guard.unlockLevel;
try{
 guard.unlockLevel=7;const p=player('classless'),w=world();p.inventory.push({id:'guardScroll',qty:1});
 assert(readSkillScroll(p,p.inventory.findIndex(i=>i.id==='guardScroll')).ok);
 assert.equal(getAbilitySkillRequirement(guard),7);assert.match(abilityRequirements(guard),/Warding 7/);
 assert.match(getAbilityAvailability(p,guard).reason,/level 7/);assert(!assignAbilityToSlot(p,0,'guard').ok);
 p.loadout.abilitySlots[0]='guard';assert(!useAbility(0,p,w,()=>{},performance.now()/1000+20));
 p.skillState.skills.warding.level=7;assert(assignAbilityToSlot(p,0,'guard').ok);
 assert(useAbility(0,p,w,()=>{},performance.now()/1000+20));
}finally{guard.unlockLevel=old;}
const unknown=player('thornbinder');assert(!getAbilityAvailability(unknown,'thornbinderRootPrison').usable,'Class skills must still be learned');
unlockActiveAbility(unknown,'oathkeeperJudgmentSmite',{autoAssignEmpty:false});
assert.match(getAbilityAvailability(unknown,'oathkeeperJudgmentSmite').reason,/class/i,'Other classes are still unavailable');
console.log(JSON.stringify({pass:true,classSkills,morphs,realCasts:casts,checks:'level-one proficiencies, copied definitions, assignment, descriptions, legacy ownership, retained scroll gates and learned/class restrictions'}));
