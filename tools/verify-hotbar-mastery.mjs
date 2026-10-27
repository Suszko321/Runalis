import assert from 'node:assert/strict';
import { createPlayer, chooseClass, gainXp } from '../src/player.js';
import { addCombatXP, addPlayerSkillXP } from '../src/skills.js';
import { getAbilityMastery, awardHotbarMasteryXp, rewardCombatPurpose, recordAbilitySuccessfulUse, recordAbilityDamage, recordEnemyAbilityStatistics, awardEnemyAbilityMastery, rewardMobilityMastery } from '../src/abilityMasterySystem.js';
import { ABILITIES, normalizeAbilityId } from '../src/data.js';
import { HOTBAR_SLOT_COUNT } from '../src/hotbarConfig.js';
import { recordEnemyCombatContribution, grantSharedCombatKillXp } from '../src/combatProgression.js';
import { unlockActiveAbility, assignAbilityToSlot } from '../src/abilityLoadoutSystem.js';
import { getAbilityMorphOptions, selectAbilityMorph } from '../src/abilityMorphSystem.js';
import { XP_CURVES, xpForLevels } from '../src/progressionMath.js';
import { affinityMultiplier } from '../src/progressionProfiles.js';
import { sanitizeForSave } from '../src/gameSave.js';
import { normalizeProfileSave } from '../src/saveProfiles.js';

const ids=['hydromancerWaterTorrent','hydromancerMendingCurrent','hydromancerBubbleWard','summonWolf'];
const actor=(name='test')=>{const p=createPlayer(name);chooseClass(p,'waverider');Object.assign(p,{id:name,x:260,y:320});
  for(const [slot,id] of ids.entries()){unlockActiveAbility(p,id,{autoAssignEmpty:false});assert.ok(assignAbilityToSlot(p,slot,id).ok);}
  return p;};
const foe=p=>({id:'foe',name:'Target',x:290,y:320,hp:100,maxHp:100,xp:20,level:1,aggro:3,combatTargetId:p.id,combatTargetKind:'player'});
const total=(p,id)=>{const m=getAbilityMastery(p,id);return xpForLevels(1,m.level-1,XP_CURVES.mastery)+m.xp;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const test=(name,fn)=>{fn();console.log('PASS '+name);};

test('weapon-only victory trains every unused attack, heal, shield and inactive summon exactly once',()=>{
 const p=actor(),e=foe(p);recordEnemyCombatContribution(e,p,'blade',100,{source:'weapon'});grantSharedCombatKillXp(p,e,20);
 assert.equal(p.summons.length,0);
 for(const id of ids){close(total(p,id),20);assert.equal(getAbilityMastery(p,id).lifetimeSuccessfulUses,0);}
 close(p.lastCombatReward.awards.reduce((s,a)=>s+a.base,0),20);
 const before=JSON.stringify(p.abilityMastery);grantSharedCombatKillXp(p,e,20);assert.equal(JSON.stringify(p.abilityMastery),before);
});
test('quest and profession XP trains the hotbar using the actual earned amount including affinity',()=>{
 const p=actor();let expected=0;
 for(const skill of ['warding','renown','woodcutting','fishing','crafting']){gainXp(p,skill,10);expected+=10*affinityMultiplier(p,skill);for(const id of ids)close(total(p,id),expected);}
 assert.equal(getAbilityMastery(p,'hydromancerRiptideStep').xp,0);
});
test('co-op support and final-hit XP trains each participant hotbar at their own reward rate',()=>{
 const a=actor('first'),b=actor('final'),support=actor('support'),idle=actor('idle'),e=foe(a),w={mode:'dungeon',enemies:[e]};support.coop={players:[a,b]};
 recordEnemyCombatContribution(e,a,'warding',60,{sourceAbilityId:ids[0]});
 rewardCombatPurpose(support,w,ids[1],30,1);for(const id of ids)close(total(support,id),0);
 recordEnemyCombatContribution(e,b,'blade',40,{source:'weapon'});grantSharedCombatKillXp(b,e,20);
 for(const id of ids){close(total(a,id),10);close(total(b,id),20);close(total(support,id),10);close(total(idle,id),0);}
 assert.equal(getAbilityMastery(a,ids[0]).lifetimeContributingKills,1);
});
test('XP uses the current assigned skills; removed skills stop training and new skills need no cast',()=>{
 const p=actor(),e=foe(p);recordEnemyCombatContribution(e,p,'blade',100,{source:'weapon'});
 unlockActiveAbility(p,'hydromancerRiptideStep',{autoAssignEmpty:false});assert.ok(assignAbilityToSlot(p,0,'hydromancerRiptideStep').ok);
 grantSharedCombatKillXp(p,e,20);close(total(p,ids[0]),0);close(total(p,'hydromancerRiptideStep'),20);
});
test('empty bars, duplicate aliases, invalid IDs and extra slots cannot multiply rewards',()=>{
 const p=actor();p.loadout.abilitySlots=['thornLash','vineWhip','thornbinderThornLash','invalid',null,'summonWolf'];
 assert.equal(awardHotbarMasteryXp(p,10),1);close(total(p,'thornbinderThornLash'),10);close(total(p,'summonWolf'),0);
 p.loadout.abilitySlots=Array(5).fill(null);awardHotbarMasteryXp(p,10);close(total(p,'thornbinderThornLash'),10);
});
test('player XP entry points train fractional XP and reject zero, negative, nonfinite or invalid awards',()=>{
 const p=actor();addCombatXP(p,.5);const r=addPlayerSkillXP(p,'warding',.25);for(const id of ids)close(total(p,id),.5+r.xpAdded);
 const before=JSON.stringify(p.abilityMastery);
 for(const amount of [0,-10,NaN,Infinity]){addCombatXP(p,amount);addPlayerSkillXP(p,'warding',amount);gainXp(p,'fishing',amount);}
 addPlayerSkillXP(p,'invalid',30);assert.equal(JSON.stringify(p.abilityMastery),before);
});
test('unused skills cross mastery levels, unlock morphs and preserve shared progress through saves',()=>{
 const p=actor(),id=ids[0],first=getAbilityMorphOptions(p,id).find(o=>o.id!=='base');assert.ok(first&&!first.unlocked);
 const amount=xpForLevels(1,first.requiredMastery-1,XP_CURVES.mastery);addCombatXP(p,amount);
 assert.equal(getAbilityMastery(p,id).level,first.requiredMastery);assert.ok(selectAbilityMorph(p,id,first.id).ok);
 addCombatXP(p,7);close(total(p,id),amount+7);assert.equal(getAbilityMastery(p,id).lifetimeSuccessfulUses,0);
 const loaded=normalizeProfileSave(sanitizeForSave(p));for(const skill of ids)close(total(loaded,skill),total(p,skill));
 assert.equal(loaded.abilityMorphs[id],first.id);gainXp(loaded,'fishing',3);for(const skill of ids)close(total(loaded,skill),total(p,skill)+3);
});
test('large XP awards train all assigned skills equally without usage or cooldown gates',()=>{
 const p=actor();p.cooldowns=Object.fromEntries(ids.map(id=>[id,performance.now()/1000]));
 addCombatXP(p,1000000);for(const id of ids){close(total(p,id),1000000);assert.ok(getAbilityMastery(p,id).level>20);assert.equal(getAbilityMastery(p,id).lifetimeSuccessfulUses,0);}
});
test('every class, scroll, equipment and universal skill trains without use, only while assigned',()=>{
 const all=[...new Set(ABILITIES.map(a=>normalizeAbilityId(a.id)))];
 for(let offset=0;offset<all.length;offset+=HOTBAR_SLOT_COUNT){
  const p=createPlayer('All skills'),batch=all.slice(offset,offset+HOTBAR_SLOT_COUNT);
  p.loadout.abilitySlots=Array.from({length:HOTBAR_SLOT_COUNT},(_,i)=>batch[i]||null);
  addCombatXP(p,60);
  for(const id of all){close(total(p,id),batch.includes(id)?60:0);assert.equal(getAbilityMastery(p,id).lifetimeSuccessfulUses,0);}
  p.loadout.abilitySlots=Array(HOTBAR_SLOT_COUNT).fill(null);addCombatXP(p,90);
  for(const id of batch)close(total(p,id),60);
 }
 console.log(`Verified ${all.length} skills across all hotbar slots.`);
});
test('casting, summon damage, kill statistics, healing and movement never directly train skills',()=>{
 const p=actor(),e=foe(p),w={mode:'dungeon',enemies:[e]};
 const summons=ABILITIES.filter(a=>a.summonType).map(a=>a.id);
 const all=[...new Set([...ids,...summons])];
 // Removed summons may continue fighting, but their mastery must stay unchanged.
 for(const id of all){
  recordAbilitySuccessfulUse(p,id);recordAbilityDamage(p,id,5000);
  recordEnemyAbilityStatistics({...e,lastDamagedByActorId:p.id},[{actor:p,actorId:p.id,playerParticipation:true,abilities:{[id]:5000},lastAbilityId:id}],10);
  awardEnemyAbilityMastery({...e},[{actor:p,playerParticipation:true,abilities:{[id]:5000}}],1000000,10);
  rewardCombatPurpose(p,w,id,5000,10);rewardMobilityMastery(p,w,id,160,10);
  close(total(p,id),0);assert.equal(getAbilityMastery(p,id).level,1);
 }
 addCombatXP(p,25);
 for(const id of all)close(total(p,id),ids.includes(id)?25:0);
});
console.log('Hotbar mastery verification complete.');
