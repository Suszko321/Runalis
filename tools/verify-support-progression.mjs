import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility} from '../src/combat.js';
import {grantSharedCombatKillXp} from '../src/combatProgression.js';
import {getTauntTarget} from '../src/tankTaunt.js';
import {abilityTraining} from '../src/trainingProfiles.js';
import {getSkillTreeLayout,spendSkillTreeNode} from '../src/skillTreeSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';

const aim={combatAimX:1,combatAimY:0,hasAim:true};
const now=performance.now()/1000;
function actor(classId) {
  const p=createPlayer(classId);
  chooseClass(p,classId);
  p.skillState.combat.level=25;
  Object.assign(p,{x:320,y:320,id:'p',hp:30,maxHp:180,spirit:500,maxSpirit:500,stamina:500,maxStamina:500,spiritAwakened:true});
  p.loadout.abilitySlots=[];
  return p;
}
function encounter(distance=80) {
  const enemy={id:'enemy',name:'Enemy',x:320+distance,y:320,hp:200,maxHp:200,xp:100,aggro:2};
  return {enemy,world:{mode:'dungeon',enemies:[enemy],effects:[],objects:[]}};
}
function cast(p,world,id) {
  unlockActiveAbility(p,id,{autoAssignEmpty:false});
  assert.ok(useAbility(id,p,world,()=>{},now,aim),id);
}
for (const [classId,id,form,expected] of [
  ['waverider','hydromancerMendingCurrent','cryomancer','healing'],
  ['waverider','hydromancerBubbleWard','cryomancer','warding'],
  ['thornbinder','thornbinderLivingBriar','petalknight','healing'],
  ['gravecaller','gravecallerFuneralUrn','deathknight','taunting'],
  ['oathkeeper','oathkeeperBulwarkOfLight',null,'taunting'],
  ['oathkeeper','wayfarerAid',null,'healing'],
  ['gravecaller','soulSiphon','acolyte','healing'],
  ['waverider','hydromancerWaterTorrent',null,'spirit']
]) {
  const profile=abilityTraining(resolveAbilityMorph(actor(classId),getAbilityById(id),form));
  assert.ok(profile[expected],id+' '+form);
  if(expected==='healing')assert.ok(!profile.warding,id);
  if(expected==='warding')assert.ok(!profile.healing,id);
}

function heal(healing,warding,perks=false,full=false) {
  const p=actor('waverider'),{enemy,world}=encounter();
  p.skillState.skills.healing.level=healing;
  p.skillState.skills.warding.level=warding;
  if(perks)for(const id of ['healing_root','healing_deepRecovery'])assert.ok(spendSkillTreeNode(p,id).ok,id);
  if(full)p.hp=p.maxHp;
  const before=p.hp;
  cast(p,world,'hydromancerMendingCurrent');
  grantSharedCombatKillXp(p,enemy,100);
  return {p,healed:p.hp-before};
}
const baseline=heal(1,1);
const trained=heal(80,1);
const purchased=heal(80,1,true);
assert.equal(heal(1,80).healed,baseline.healed);
assert.ok(purchased.healed>trained.healed && trained.healed>baseline.healed);
assert.ok(trained.p.lastCombatReward.awards.some(a=>a.skillId==='healing'&&a.sources.includes('Actions')));
assert.ok(!trained.p.lastCombatReward.awards.some(a=>a.skillId==='warding'));
assert.equal(heal(80,1,true,true).p.lastCombatReward,undefined);
assert.ok(normalizeProfileSave(sanitizeForSave(purchased.p)).skillTree.spent.healing_deepRecovery);

const tank=actor('oathkeeper'),{enemy,world}=encounter(236);
tank.skillState.skills.taunting.level=80;
for(const id of ['taunting_root','taunting_holdTheLine'])assert.ok(spendSkillTreeNode(tank,id).ok,id);
cast(tank,world,'oathkeeperBulwarkOfLight');
assert.equal(getTauntTarget(enemy,world,now+5),tank);
assert.equal(getTauntTarget(enemy,world,now+7),null);
grantSharedCombatKillXp(tank,enemy,100);
assert.ok(tank.lastCombatReward.awards.some(a=>a.skillId==='taunting'&&a.sources.includes('Actions')));
assert.equal(getSkillTreeLayout('healing').nodes.length,2);
assert.equal(getSkillTreeLayout('taunting').nodes.length,2);
assert.ok(spendSkillTreeNode(actor('classless'),'healing_root').ok);
console.log('PASS support classification, Healing and Taunting purchases, actual casts, distinct XP, overhealing, and save/load.');
