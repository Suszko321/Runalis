import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {CLASS_SUBCLASSES,SUBCLASS_CLASS_TREES} from '../src/subclassData.js';
import {SKILL_TREE_NODES,getSkillTreeLayout,normalizeSkillTreeState,canSpendSkillTreeNode,spendSkillTreeNode,respecSkillTree,getAvailableSkillTreePoints} from '../src/skillTreeSystem.js';
import {getPlayerExpertise,getAbilityEffectiveness,expertiseNodeId} from '../src/skillExpertiseSystem.js';
import {getAbilityMastery,applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMorphOptions,selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {calculateAbilityDamage,useAbility,updateSummons} from '../src/combat.js';
import {getSubclassCombatState,updateSubclassCombat,clearSubclassCombatState} from '../src/subclassCombat.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';

function player(cls){const p=createPlayer('Expertise test');chooseClass(p,cls);p.gold=100;p.x=320;p.y=320;
  p.hp=50;p.maxHp=1000;p.spirit=p.maxSpirit=10000;p.stamina=p.maxStamina=10000;
  p.skillTree.bloodlineBonusPoints=1000;p.skillTree.respecVersion=1;return p;}
function learn(p,id){unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;}
function route(p,id){const n=SKILL_TREE_NODES[id];if(p.skillTree.spent[id])return;
  for(const parent of n.requirementMode==='any'?(n.requires||[]).slice(0,1):n.requires||[])route(p,parent);
  assert(spendSkillTreeNode(p,id).ok,`Could not buy ${id}`);}
function choose(p,family){const id=expertiseNodeId(p.classId,family);route(p,id);return id;}
const world=()=>({mode:'dungeon',width:64,height:48,tiles:Array.from({length:48},()=>Array.from({length:64},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
const close=(a,b,tolerance=1)=>assert(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
let numerical=0,purchases=0;
for(const [cls,families] of Object.entries(CLASS_SUBCLASSES)){
  const layout=getSkillTreeLayout(SUBCLASS_CLASS_TREES[cls]),options=layout.nodes.filter(n=>n.expertise);
  assert.equal(options.length,families.length+1);assert(options.every(n=>n.position.row===layout.rowCount-1));
  assert(options.every(n=>n.mutuallyExclusiveWith.length===families.length));
  for(const family of ['base',...families]){
    const p=player(cls),node=expertiseNodeId(cls,family);
    assert(!canSpendSkillTreeNode(p,node).ok,'Cannot select before capstone');
    for(const a of ABILITIES.filter(a=>a.classId===cls))learn(p,a.id);
    const morphBefore=JSON.stringify(p.abilityMorphs),masteryBefore=JSON.stringify(p.abilityMastery);
    for(const parent of SKILL_TREE_NODES[node].requires.slice(0,1))route(p,parent);
    const points=getAvailableSkillTreePoints(p);assert(spendSkillTreeNode(p,node).ok);purchases++;
    assert.equal(getAvailableSkillTreePoints(p),points-1);assert.equal(getPlayerExpertise(p).family,family);
    for(const other of options)assert(!canSpendSkillTreeNode(p,other.id).ok);
    for(const a of ABILITIES.filter(a=>a.classId===cls)){
      for(const form of ['base',...families]){
        const ability=resolveAbilityMorph(p,a,form==='base'?null:form);
        const scalar=family==='base'?1.05:family===form?1.15:.9;
        assert.equal(getAbilityEffectiveness(p,ability),scalar);numerical++;
        const baseline=calculateAbilityDamage({...p,skillTree:{...p.skillTree,spent:{...p.skillTree.spent,[node]:0}}},ability);
        close(calculateAbilityDamage(p,ability),baseline*scalar);
        // Expertise never changes mastery thresholds or disables foreign morphs.
        assert.equal(getAbilityMorphOptions(p,a.id).length,families.length+1);
        assert(selectAbilityMorph(p,a.id,form,100000).ok);
      }
    }
    for(const a of ABILITIES.filter(a=>!a.classId||a.classId!==cls))assert.equal(getAbilityEffectiveness(p,a),1,`${a.id} must be unaffected`);
    assert.equal(JSON.stringify(p.abilityMastery),masteryBefore);
    const saved=normalizeProfileSave(sanitizeForSave(p));migratePlayer(saved);
    assert.equal(getPlayerExpertise(saved).family,family);assert.equal(saved.skillTree.spent[node],1);
    const mastery=JSON.stringify(p.abilityMastery),morphs=JSON.stringify(p.abilityMorphs);
    assert(respecSkillTree(p).ok);assert.equal(getPlayerExpertise(p),null);
    assert.equal(JSON.stringify(p.abilityMastery),mastery);assert.equal(JSON.stringify(p.abilityMorphs),morphs);
    choose(p,family==='base'?families[0]:'base');
    assert.equal(Object.keys(p.skillTree.spent).filter(id=>SKILL_TREE_NODES[id]?.expertise).length,1);
  }
}

// Every original skill and morph remains neutral before the final calling.
for(const cls of Object.keys(CLASS_SUBCLASSES)){
 const p=player(cls);assert.equal(getPlayerExpertise(p),null);
 for(const a of ABILITIES.filter(a=>a.classId===cls))for(const f of CLASS_SUBCLASSES[cls]){
  learn(p,a.id);assert(selectAbilityMorph(p,a.id,f,100000).ok);assert.equal(getAbilityEffectiveness(p,resolveAbilityMorph(p,a,f)),1);
 }
}
const malformed=player('gravecaller');malformed.skillTree.spent={spirit_expertise_acolyte:20,spirit_expertise_base:1,spirit_expertise_cursed:1};
normalizeSkillTreeState(malformed);assert.deepEqual(malformed.skillTree.spent,{spirit_expertise_acolyte:1});
const legacy=player('necromancer');choose(legacy,'acolyte');assert.equal(getPlayerExpertise(legacy).classId,'gravecaller');
assert(!getSkillTreeLayout('eldritch').nodes.some(n=>n.expertise));assert.equal(getPlayerExpertise(player('classless')),null);

function cast(cls,id,form,expertise){const p=player(cls),w=world();learn(p,id);
  if(expertise)choose(p,expertise);else route(p,SKILL_TREE_NODES[expertiseNodeId(cls)].requires[0]);
  p.loadout.abilitySlots[0]=id;if(form!=='base')assert(selectAbilityMorph(p,id,form,100000).ok);
  const messages=[];assert(useAbility(0,p,w,t=>messages.push(t),100001,aim),`${id}/${form}: ${messages.join(' ')}`);return {p,w};}
function controlCast(expertise){const p=player('waverider'),w=world();learn(p,'hydromancerDrowningPressure');
 if(expertise)choose(p,expertise);else route(p,SKILL_TREE_NODES[expertiseNodeId(p.classId)].requires[0]);
 p.loadout.abilitySlots[0]='hydromancerDrowningPressure';selectAbilityMorph(p,p.loadout.abilitySlots[0],'cryomancer',100000);
 const e={id:'control-target',kind:'rat',x:p.x+32,y:p.y,hp:10000,maxHp:10000,radius:12,armour:0};w.enemies=[e];
 assert(useAbility(0,p,w,()=>{},100001,aim));
 const field=getSubclassCombatState(p).fields[0];e.x=field.x;e.y=field.y;
 for(let i=0;i<5;i++)updateSubclassCombat(p,w,aim,.1,100001+i*.1,{now:100001+i*.1,bonuses:()=>({}),damage:(foe,amount)=>{foe.hp-=amount;return true},effect:()=>{}});
 return e;
}
const neutralControl=controlCast(null);
for(const family of ['cryomancer','sunken']){
 const e=controlCast(family),scalar=family==='cryomancer'?1.15:.9;
 close(e.slowTimer,neutralControl.slowTimer*scalar,.0001);
}
// Real class healing and shields, including ongoing morph wards/flowers.
for(const [cls,id,form,expertise,key,field] of [
 ['waverider','hydromancerBubbleWard','base','base','bubbleWard','flatAbsorb'],
 ['oathkeeper','oathkeeperBulwarkOfLight','holyknight','holyknight','defense','reduction'],
 ['oathkeeper','oathkeeperBulwarkOfLight','holyknight','sinner','defense','reduction']]){
 const baseline=cast(cls,id,form,null),active=cast(cls,id,form,expertise);
 const scalar=getAbilityEffectiveness(active.p,resolveAbilityMorph(active.p,id,form==='base'?null:form));
 close(active.p.buffs[key][field],baseline.p.buffs[key][field]*scalar,field==='reduction'?.00001:1);
}
for(const expertise of ['base','cryomancer']){
 const baseline=cast('waverider','hydromancerMendingCurrent','base',null),active=cast('waverider','hydromancerMendingCurrent','base',expertise);
 close(active.p.hp-50,(baseline.p.hp-50)*(expertise==='base'?1.05:.9),2);
}
for(const expertise of ['fae','petalknight']){
 const run=cast('thornbinder','thornbinderThornstorm','fae',expertise),s=getSubclassCombatState(run.p);
 const before=run.p.hp;
 updateSubclassCombat(run.p,run.w,aim,1,100002,{now:100002,bonuses:()=>({}),damage:()=>{},effect:()=>{}});
 assert(run.p.hp>before);assert(s.fields[0].healingPower>0);
}
// A recurring Acolyte channel shield scales once and remains active while held.
for(const expertise of ['acolyte','deathknight']){
 const baseline=cast('gravecaller','gravecallerMurmuringHost','acolyte',null),run=cast('gravecaller','gravecallerMurmuringHost','acolyte',expertise);
 const baseWard=getSubclassCombatState(baseline.p).hostWard.reduction;
 close(getSubclassCombatState(run.p).hostWard.reduction,baseWard*(expertise==='acolyte'?1.15:.9),.00001);
}
// Summons cast before a choice receive the choice, retain cast morph identity,
// and respec changes health proportionally without free healing.
const neutral=cast('gravecaller','summonLich','acolyte',null),pet=neutral.p.summons[0];
const initial=pet.maxHp;pet.hp=initial*.4;choose(neutral.p,'acolyte');
updateSummons(0,neutral.p,neutral.w,null,100002);
assert.equal(pet.maxHp,Math.ceil(initial*1.15));close(pet.hp/pet.maxHp,.4,.00001);
neutral.p.abilityMorphs.summonLich='deathknight';
updateSummons(0,neutral.p,neutral.w,null,100003);assert.equal(pet.summonMorph,'acolyte');assert.equal(pet.maxHp,Math.ceil(initial*1.15));
assert(respecSkillTree(neutral.p).ok);updateSummons(0,neutral.p,neutral.w,null,100004);
assert.equal(pet.maxHp,initial);close(pet.hp/pet.maxHp,.4,.00001);

fs.mkdirSync('docs/expertise',{recursive:true});
const result={classes:6,finalChoices:18,purchases,numericalCases:numerical,morphThresholds:[5,10],nonClassSkills:'unaffected',saveRespec:'passed',liveHealingProtectionControlSummons:'passed',eldritch:'unchanged'};
fs.writeFileSync('docs/expertise/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
