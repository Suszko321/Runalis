import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {CLASS_SUBCLASSES} from '../src/subclassData.js';
import {resolveSubclassAbility,SUBCLASS_SKILL_PLANS} from '../src/subclassVariants.js';
import {MORPH_MASTERY_LEVELS,getAbilityMorphOptions,selectAbilityMorph,getSelectedAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility,updateCombat,updateAbilityInput,updateSummons} from '../src/combat.js';
import {getSubclassCombatState,clearSubclassCombatState,clearAbilityMorphCombatState,onSubclassKill} from '../src/subclassCombat.js';
import {getCombatTechniqueState} from '../src/combatExpansion.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {SKILL_TREE_NODES,getSpentSkillTreePoints,spendSkillTreeNode,canSpendSkillTreeNode,respecSkillTree,getSkillTreeBonuses} from '../src/skillTreeSystem.js';
import {normalizeProfileSave,SAVE_SCHEMA_VERSION} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {getAbilityMastery,grantAbilityMasteryXp,masteryXpRequired} from '../src/abilityMasterySystem.js';
import {initializeSimulatedSubclassPlayer} from '../src/simulatedSubclassPlayers.js';

const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
const world=()=>({mode:'dungeon',width:64,height:48,tiles:Array.from({length:48},()=>Array.from({length:64},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const clock=()=>performance.now()/1000+20;
function player(cls){const p=createPlayer('Morph review');chooseClass(p,cls);p.id='morph-review';p.x=260;p.y=320;p.dirX=1;p.dirY=0;p.gold=40;
  for(const skill of Object.values(p.skillState.skills))skill.level=50;
  migratePlayer(p);p.hp=p.maxHp*.65;p.spirit=p.maxSpirit=2000;p.stamina=p.maxStamina=2000;return p;}
function foes(p,rank='normal'){return [32,64,100,160,210,280,350].map((d,i)=>({id:`foe${i}`,name:'Test foe',kind:'rat',x:p.x+d,y:p.y+(i%2?8:0),hp:10000,maxHp:10000,r:12,radius:12,xp:15,level:50,aggro:3,combatTargetKind:'player',combatTargetId:p.id,attackCooldown:10,...(rank==='boss'?{isBoss:true}:rank==='elite'?{elite:true}:{})}));}
function learn(p,id,level=20){unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=level;}
const catalogueBefore=JSON.stringify(ABILITIES),treeBefore=JSON.stringify(SKILL_TREE_NODES),active=ABILITIES.filter(a=>CLASS_SUBCLASSES[a.classId]);
const report={baseClassSkills:active.length,variants:active.length*2,casts:[],checks:[]};
assert(SAVE_SCHEMA_VERSION>=16);assert.equal(active.length,Object.keys(SUBCLASS_SKILL_PLANS).length);
for(const [cls,families] of Object.entries(CLASS_SUBCLASSES)){
  const p=player(cls),id=p.knownAbilities.find(id=>getAbilityById(id)?.classId===p.classId);
  assert.equal(p.selectedSubclass,undefined);assert.equal(resolveSubclassAbility(p,id),getAbilityById(id),'Original is the canonical skill');
  assert(canSpendSkillTreeNode(p,`${p.skillTree.lockedTree}_root`).ok,'Tree has no morph prerequisite');
  for(const base of active.filter(a=>a.classId===cls)){
    learn(p,base.id,1);assert.equal(getAbilityMorphOptions(p,base.id).length,3);
    for(let i=0;i<families.length;i++){
      getAbilityMastery(p,base.id,true).level=MORPH_MASTERY_LEVELS[i]-1;
      assert(!selectAbilityMorph(p,base.id,families[i],clock()).ok,'Threshold rejects early selection');
      getAbilityMastery(p,base.id,true).level=MORPH_MASTERY_LEVELS[i];
      assert(selectAbilityMorph(p,base.id,families[i],clock()).ok,'Threshold unlocks the form');
      assert.equal(resolveSubclassAbility(p,base).subclassId,families[i]);
      assert(selectAbilityMorph(p,base.id,'base',clock()).ok);assert.equal(resolveSubclassAbility(p,base),base);
    }
  }
}
for(const [classId,families] of Object.entries(CLASS_SUBCLASSES))for(const family of families){
  for(const base of active.filter(a=>a.classId===classId))for(const rank of ['normal','elite','boss']){
    const w=world(),p=player(classId),t=clock();learn(p,base.id);p.loadout.abilitySlots[0]=base.id;
    assert(selectAbilityMorph(p,base.id,family,t).ok);w.enemies=foes(p,rank);updateCombat(p,w,aim,0,t,()=>{});
    const hp=p.hp,resource=p.spirit+p.stamina,a=resolveSubclassAbility(p,base);
    assert.equal(a.id,base.id);assert.equal(a.subclassId,family);assert.equal(resolveSubclassAbility(p,a),a);
    const logs=[];assert(useAbility(0,p,w,m=>logs.push(m),t,aim),`${family}/${base.id}/${rank}: ${logs.join('; ')}`);
    const paid=resource-p.spirit-p.stamina;assert(paid>0);
    for(let step=1;step<=45;step++){updateCombat(p,w,aim,.05,t+step*.05,()=>{});if(a.summonType)updateSummons(.05,p,w,()=>{},t+step*.05);}
    const damage=w.enemies.reduce((sum,e)=>sum+e.maxHp-e.hp,0);
    const oath=getSubclassCombatState(p)?.oath;
    assert(damage>0||p.hp>hp||p.buffs?.defense||p.buffs?.bubbleWard||p.activeChannel||getSubclassCombatState(p)?.empower||getCombatTechniqueState(p)?.statuses?.mirror||
      (a.oathMorph&&(oath?.mark||oath?.borrowed||oath?.guard)),`${family}/${base.id}: useful execution`);
    assert(Number.isFinite(p.hp)&&p.hp>0&&p.hp<=p.maxHp);
    if(rank==='boss')for(const e of w.enemies){assert(!(e.subclassFrozenUntil>t));assert(!(e.subclassSilencedUntil>t));assert(!(e.rootUntil>t));}
    const s=getSubclassCombatState(p);if(s)assert(s.fields.length<=12&&s.shots.length<=32&&s.spirits.length<=12&&s.afflictions.size<=64);
    assert(w.effects.some(f=>f.subclassId===family));assert.equal(getAbilityMastery(p,base.id).lifetimeSuccessfulUses,1);
    if(a.channelProfile){assert.equal(p.activeChannel?.subclassId||p.activeChannel?.ability?.subclassId,family);updateCombat(p,w,{...aim,ability0Held:false,ability0Released:true},.05,t+2.3,()=>{});assert.equal(p.activeChannel,null);}
    report.casts.push({classId,morph:family,abilityId:base.id,mode:a.subclassMode,rank,damage:Math.round(damage),resource:Math.round(paid)});
    clearSubclassCombatState(p);
  }
}
report.checks.push(`${report.variants} forms cast against ordinary enemies, elites and bosses; resource costs, mastery ownership, channels, visual effects and control limits hold.`);
{
  const p=player('waverider'),ids=active.filter(a=>a.classId==='waverider').slice(0,4).map(a=>a.id),families=CLASS_SUBCLASSES.waverider;
  ids.forEach(id=>learn(p,id));p.loadout.abilitySlots=[...ids];const before=getSkillTreeBonuses(p);
  families.forEach((f,i)=>assert(selectAbilityMorph(p,ids[i],f,clock()).ok));
  assert.deepEqual(ids.map(id=>getSelectedAbilityMorph(p,id)),[...families,null,null],'Both families and original forms coexist');
  assert.deepEqual(getSkillTreeBonuses(p),before,'No class-wide trait mutation');
  const saved=normalizeProfileSave(sanitizeForSave(p));assert.deepEqual(saved.abilityMorphs,p.abilityMorphs);assert.deepEqual(saved.loadout.abilitySlots,p.loadout.abilitySlots);
  assert.equal(saved.abilityMastery[ids[0]].level,20);
  const old=normalizeProfileSave({...sanitizeForSave(p),selectedSubclass:'sunken',abilityMorphs:undefined,abilityMorphVersion:undefined,saveVersion:14});
  assert.deepEqual(old.abilityMorphs,{});assert.equal(old.selectedSubclass,undefined);assert.deepEqual(old.loadout.abilitySlots,p.loadout.abilitySlots);
  const malformed=normalizeProfileSave({...sanitizeForSave(p),abilityMorphs:{[ids[0]]:'holyknight',unknown:'cryomancer'}});assert.deepEqual(malformed.abilityMorphs,{});
  p.abilityMastery[ids[0]].level=1;assert.equal(resolveSubclassAbility(p,ids[0]),getAbilityById(ids[0]),'Invalid locked selection cannot execute');p.abilityMastery[ids[0]].level=20;
  p.cooldowns[ids[1]]=clock();assert(!selectAbilityMorph(p,ids[1],'base',clock()).ok,'Switching cannot bypass cooldown');delete p.cooldowns[ids[1]];
  p.abilityUseCharges[ids[0]]={rechargeQueue:[clock()+5]};assert(!selectAbilityMorph(p,ids[0],'base',clock()).ok,'Switching cannot refill recovering charges');delete p.abilityUseCharges[ids[0]];
  p.activeChannel={abilityId:ids[1]};assert(!selectAbilityMorph(p,ids[0],'base',clock()).ok);p.activeChannel=null;
  p.skillTree.bloodlineBonusPoints=1000;assert(spendSkillTreeNode(p,'hydromancy_root').ok);const refund=getSpentSkillTreePoints(p),gold=p.gold,choices={...p.abilityMorphs};
  assert(respecSkillTree(p).ok);assert.equal(p.gold,gold-1);assert(refund>0);assert.equal(getSpentSkillTreePoints(p),0);assert.deepEqual(p.abilityMorphs,choices);
  assert.deepEqual(normalizeProfileSave(sanitizeForSave(p)).abilityMorphs,choices);
}
report.checks.push('Independent choices, original defaults, mastery locks, malformed and legacy saves, hotbar persistence, cooldown/charge protection and one-gold reset.');
{
  const p=player('waverider'),id=p.knownAbilities.find(id=>getAbilityById(id)?.classId===p.classId),logs=[];getAbilityMastery(p,id,true).level=4;
  grantAbilityMasteryXp(p,id,masteryXpRequired(4),clock(),m=>logs.push(m));
  assert.equal(getAbilityMastery(p,id).level,5);assert(getAbilityMorphOptions(p,id)[1].unlocked);assert(logs.some(m=>m.includes('morph unlocked')));
  assert.equal(getSelectedAbilityMorph(p,id),null,'Mastery unlock does not automatically morph the skill');
}
{
  const p=player('waverider'),w=world(),t=clock();w.enemies=foes(p);
  const ids=active.filter(a=>a.classId==='waverider').slice(0,4).map(a=>a.id);ids.forEach(id=>learn(p,id));p.loadout.abilitySlots=ids;
  CLASS_SUBCLASSES.waverider.forEach((f,i)=>assert(selectAbilityMorph(p,ids[i],f,t).ok));
  for(let i=0;i<4;i++){const input={...aim,[`ability${i}Held`]:true};useAbility(i,p,w,()=>{},t+i*3,input);for(let step=1;step<=20;step++)updateCombat(p,w,input,.05,t+i*3+step*.05,()=>{});updateCombat(p,w,{...input,[`ability${i}Held`]:false,[`ability${i}Released`]:true},.05,t+i*3+1.1,()=>{});}
  const effects=w.effects.filter(e=>e.kind==='subclassAbility'||e.kind==='sunkenSkill');assert(CLASS_SUBCLASSES.waverider.every(f=>effects.some(e=>e.subclassId===f)));
  assert(w.enemies.some(e=>e.hp<e.maxHp));
  const bundles=getSubclassCombatState(p).afflictions;for(const bundle of bundles.values())assert(bundle.effects instanceof Map,'Status counters are separated by form family');
}
{
  const p=player('waverider'),w=world(),id='hydromancerWaterTorrent',t=clock();learn(p,id);p.loadout.abilitySlots[0]=id;assert(selectAbilityMorph(p,id,'sunken',t).ok);w.enemies=foes(p);
  updateAbilityInput(p,w,{...aim,ability0Pressed:true},.01,t,()=>{});assert(!p.activeChannel,'Sunken Torrent retains the original chargeable cone');
  const release={...aim,ability0Held:false,ability0Released:true};updateAbilityInput(p,w,release,.01,t+.1,()=>{});updateCombat(p,w,release,.01,t+.1,()=>{});assert(!p.activeChannel);assert(w.effects.some(f=>f.kind==='sunkenSkill'));
}
{
  const p=player('gravecaller'),w=world(),t=clock(),ids=['graveSpark','summonLich'];ids.forEach(id=>learn(p,id));p.loadout.abilitySlots=[...ids,null,null];
  assert(selectAbilityMorph(p,ids[0],'acolyte',t).ok);w.enemies=foes(p);w.enemies[0].hp=1;
  useAbility(0,p,w,()=>{},t,aim);for(let i=1;i<=20;i++)updateCombat(p,w,aim,.05,t+i*.05,()=>{});
  assert.equal(getSubclassCombatState(p).souls,1,'Morphed spell kill grants exactly one soul fragment');onSubclassKill(p,w.enemies[0],w,t+2);assert.equal(getSubclassCombatState(p).souls,1,'Repeated kill callback cannot duplicate soul rewards');assert.equal(resolveSubclassAbility(p,ids[1]).summonType,getAbilityById(ids[1]).summonType,'Original summons remain original alongside rites');
}
{
  const p=player('fellhunter'),w=world(),t=clock(),id='fellhunterMarkedShot';learn(p,id);p.loadout.abilitySlots[0]=id;
  assert(selectAbilityMorph(p,id,'bloodhound',t).ok);w.enemies=foes(p);useAbility(0,p,w,()=>{},t,aim);
  for(let i=1;i<=20;i++)updateCombat(p,w,aim,.05,t+i*.05,()=>{});
  assert(getSubclassCombatState(p).prey,'Bloodhound skill acquires prey');clearAbilityMorphCombatState(p,id);assert.equal(getSubclassCombatState(p).prey,null,'Changing form removes its prey bonus');
}
for(const cls of [...Object.keys(CLASS_SUBCLASSES),'eldritch','classless']){
  const p=createPlayer('New character');chooseClass(p,cls);assert.deepEqual(p.abilityMorphs,{});
  for(const id of p.knownAbilities)assert.equal(resolveSubclassAbility(p,id),getAbilityById(id));
}
for(const cls of Object.keys(CLASS_SUBCLASSES)){
  const npc={id:`npc-${cls}`,name:'Adventurer',classId:cls,simulatedPlayer:true,x:200,y:200};assert(initializeSimulatedSubclassPlayer(npc));
  assert.equal(npc.selectedSubclass,undefined);assert.equal(npc.loadout.abilitySlots.length,5);
  assert(npc.loadout.abilitySlots.every(id=>getAbilityById(id)));
}
assert.equal(JSON.stringify(ABILITIES),catalogueBefore);assert.equal(JSON.stringify(SKILL_TREE_NODES),treeBefore);
fs.mkdirSync('docs/skill-morphs',{recursive:true});fs.writeFileSync('docs/skill-morphs/verification.json',JSON.stringify(report,null,2));
console.log(`PASS: ${report.variants} optional morphs, ${report.casts.length} real casts, mastery unlocks, mixed original/morph loadouts, legacy/save migration and one-gold resets.`);

