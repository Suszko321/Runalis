import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ABILITIES,ITEMS,getAbilityById} from '../src/data.js';
import {createPlayer,chooseClass,migratePlayer,getPower,getArmour} from '../src/player.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {getClassAffinities,weaponProficiency} from '../src/progressionProfiles.js';
import {progressionPower} from '../src/combatPower.js';
import {getAvailableWeaponSkillTrees,normalizeSkillTreeState,spendSkillTreeNode,getSpentSkillTreePoints,getEarnedSkillTreePoints,getSkillTreeBonuses,SKILL_TREE_NODES} from '../src/skillTreeSystem.js';
import {useAbility,updateCombat,calculateAbilityDamage} from '../src/combat.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {requestBasicAttack,requestHeavyAttack,updateWeaponCombat,getWeaponTypeFromPlayer} from '../src/combatMoves.js';
import {getCombatTechniqueState,mitigateTechniqueDamage} from '../src/combatExpansion.js';
import {sampleWeaponAttackPose} from '../src/playerAttackAnimation.js';
import {sampleMeleeRig} from '../src/meleeRig.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const report={checks:[],casts:[],weaponHits:[],legacy:{},scaling:[]};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
function setup(id='oathkeeperOathStrike',morph='base',level=33){
 now=100;const p=createPlayer('Oath review');chooseClass(p,'oathkeeper');p.equipment.weapon='oathkeepersMace';p.skillState.combat.level=level;
 for(const skill of Object.values(p.skillState.skills))skill.level=level;migratePlayer(p);p.x=p.y=400;p.dirX=1;p.dirY=0;
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 w.enemies=[30,70,110,180,260].map((d,i)=>({id:'e'+i,kind:'rat',name:'Review foe',x:p.x+d,y:p.y+((i%2)*8),radius:12,hp:100000,maxHp:100000,xp:10}));
 updateCombat(p,w,{},0,now,()=>{});p.maxStamina=p.stamina=10000;p.maxSpirit=p.spirit=10000;p.hp=p.maxHp*.5;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots=[id,null,null,null,'block'];
 assert(selectAbilityMorph(p,id,morph,now).ok);
 return {p,w,tick(dt=.025){now+=dt;updateCombat(p,w,aim,dt,now,()=>{});for(const fx of w.effects)fx.age+=dt;w.effects=w.effects.filter(f=>f.age<f.ttl);}};
}
test('both authored maces use Blunt; swords and Waverider keep their original proficiency',()=>{
 for(const item of Object.values(ITEMS).filter(i=>i.slot==='weapon'&&/mace|hammer|maul/i.test(i.id+' '+i.name))){assert.equal(item.weaponType,'mace');assert.equal(weaponProficiency(item),'blunt');}
 assert.equal(weaponProficiency({weaponType:'hammer',skill:'blade'}),'blunt');
 assert.equal(weaponProficiency({weaponType:'sword',skill:'blade'}),'blade');
 assert.deepEqual(getClassAffinities({classId:'oathkeeper'}),['blunt','defence']);assert.deepEqual(getClassAffinities({classId:'waverider'}),['blade','warding']);
});
test('old mace characters retain proficiency, ranks, costs, class nodes, morphs and save stability',()=>{
 const c=setup();const p=c.p;p.skillState.skills.blade={level:33,xp:742,used:true};delete p.skillState.skills.blunt;delete p.skillState.bluntProgressionVersion;
 p.classSkill='blade';p.loadout.primarySkill='blade';p.skillTree={spent:{blade_root:1,sword_root:1,sword_branch_b:1,sword_merge:1,sword_foundation_1:1},unlockedWeaponTrees:['sword'],version:12,respecVersion:1};p.skillTreeProgress=p.skillTree.spent;
 p.unlockedPassives=['sword_root'];p.inventory=[];p.abilityMorphs.oathkeeperOathStrike='sinner';delete p.skillTree.bluntMasteryVersion;
 const loaded=normalizeProfileSave(JSON.parse(JSON.stringify(p)));
 assert.deepEqual(loaded.skillState.skills.blunt,{level:33,xp:742,used:true});assert.equal(loaded.classSkill,'blunt');assert.equal(loaded.loadout.primarySkill,'blunt');
 assert(loaded.skillTree.spent.blade_root&&loaded.skillTree.spent.blunt_root);assert(!loaded.skillTree.spent.sword_root);assert(!getAvailableWeaponSkillTrees(loaded).includes('sword'));
 assert.equal(getSpentSkillTreePoints(loaded),6);assert.equal(loaded.abilityMorphs.oathkeeperOathStrike,'sinner');assert(loaded.unlockedPassives.includes('blunt_root'));
 assert.equal(getEarnedSkillTreePoints(loaded),64,'Keep the old class + weapon proficiency and Level point total');
 const bonuses=getSkillTreeBonuses(loaded),save=sanitizeForSave(loaded);const reloaded=normalizeProfileSave(save);
 assert.deepEqual(reloaded.skillTree.spent,loaded.skillTree.spent);assert.deepEqual(getSkillTreeBonuses(reloaded),bonuses);
 loaded.skillState.skills.blade.level=80;migratePlayer(loaded);assert.equal(loaded.skillState.skills.blunt.level,33,'Never recopy');
 report.legacy={level:reloaded.skillState.skills.blunt.level,xp:reloaded.skillState.skills.blunt.xp,spent:getSpentSkillTreePoints(reloaded),power:getPower(reloaded),armour:getArmour(reloaded)};
});
test('sword builds keep purchased Sword Mastery; legacy profile without skillState imports Blunt',()=>{
 const c=setup();const p=c.p;delete p.skillState.bluntProgressionVersion;delete p.skillState.skills.blunt;p.inventory=[{id:'rustySword',count:1}];
 // Use an actual catalogue sword rather than relying on a particular item name.
 p.inventory[0].id=Object.values(ITEMS).find(i=>i.weaponType==='sword'&&i.slot==='weapon').id;
 p.skillTree={spent:{sword_root:1},unlockedWeaponTrees:['sword'],respecVersion:1};p.skillTreeProgress={};migratePlayer(p);normalizeSkillTreeState(p);assert(p.skillTree.spent.sword_root);assert(getAvailableWeaponSkillTrees(p).includes('sword'));
 assert.equal(getEarnedSkillTreePoints(p),64,'Do not duplicate historical discipline point credit');
 const ancient={classId:'templar',className:'Oathkeeper',skills:{blade:{level:22,xp:80,used:true}},equipment:{weapon:'oathsteelMace'}};
 assert.equal(normalizeProfileSave(ancient).skillState.skills.blunt.level,22);
});
test('Blunt tree is purchasable from owning a mace or hammer and preserves exclusive branches',()=>{
 const c=setup(),p=c.p;p.skillTree.bloodlineBonusPoints=1000;assert(getAvailableWeaponSkillTrees(p).includes('blunt'));
 for(const suffix of ['root','branch_a','merge','second_b','second_merge','capstone'])assert(spendSkillTreeNode(p,'blunt_'+suffix).ok);
 assert(!spendSkillTreeNode(p,'blunt_branch_b').ok);assert.equal(getSkillTreeBonuses(p).staggerPowerPct,18);
 assert(Object.values(SKILL_TREE_NODES).filter(n=>n.tree==='blunt').length===12);
});
test('all Oathkeeper originals and morphs execute, retain Blunt scaling and never earn mastery by use',()=>{
 for(const a of ABILITIES.filter(a=>a.classId==='oathkeeper'))for(const morph of ['base','holyknight','sinner']){
  const c=setup(a.id,morph);assert.equal(a.skill,'blunt');if(morph!=='base')assert.equal(resolveAbilityMorph(c.p,a,morph).skill,'blunt');
  const before=JSON.stringify(Object.fromEntries(Object.entries(c.p.abilityMastery).map(([id,m])=>[id,{level:m.level,xp:m.xp}])) ),hp=c.p.hp,res=c.p.stamina+c.p.spirit;assert(useAbility(0,c.p,c.w,()=>{},now,aim),a.id+' '+morph);
  if(a.id==='oathkeeperLitanyOfIron'||a.id==='oathkeeperDebtOfBlood')mitigateTechniqueDamage(c.p,c.w.enemies[0],40,now,c.w);
  for(let i=0;i<220;i++)c.tick();
  for(const value of [c.p.hp,c.p.stamina,c.p.spirit])assert(Number.isFinite(value));assert.equal(JSON.stringify(Object.fromEntries(Object.entries(c.p.abilityMastery).map(([id,m])=>[id,{level:m.level,xp:m.xp}])) ),before);
  report.casts.push({id:a.id,morph,damage:c.w.enemies.reduce((s,e)=>s+e.maxHp-e.hp,0),healed:c.p.hp-hp,resourceUsed:res-c.p.stamina-c.p.spirit});
 }
 assert.equal(report.casts.length,ABILITIES.filter(a=>a.classId==='oathkeeper').length*3);
});
test('real mace contacts use Blunt, weighted reactions and finisher debris without changing human proportions',()=>{
 const c=setup(),p=c.p;let hits=0;
 for(let step=0;step<3;step++){
  const e=c.w.enemies[0];e.x=p.x+30;e.y=p.y;assert(requestBasicAttack(p,c.w,aim,()=>{},now));const move=p.combatState.attackMove;
  assert.equal(move.lightComboStep,step+1);const health=e.hp;
  for(let i=0;p.combatState.attacking&&i<200;i++){now+=.01;updateWeaponCombat(p,c.w,aim,.01,now,()=>{});}
  assert(e.hp<health);assert(e.combatContributors[Object.keys(e.combatContributors)[0]].skills.blunt>0);
  if(step===2)assert(c.w.effects.some(f=>f.kind==='bluntGroundImpact'));
  for(const direction of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}])for(const time of [0,move.activeStart,move.activeEnd,move.duration]){
   const pose=sampleWeaponAttackPose(move,'mace',time,direction,'oathkeeper');assert.equal(pose.rootScaleX,1);assert.equal(pose.rootScaleY,1);
   if(time===move.activeStart){
    assert.equal(pose.phaseProgress,1,'Strike is at contact before hitstop begins');
    const facing=direction.x===1?'right':direction.x===-1?'left':direction.y===1?'down':'up';
    const rig=sampleMeleeRig({...pose,weaponType:'mace',state:'attack',attacking:true},facing);
    const alignment=Math.sin(rig.weaponAngle)*direction.x-Math.cos(rig.weaponAngle)*direction.y;
    assert(alignment>.9,'Mace head points into the attack, including west and south');
   }
  }
  hits++;report.weaponHits.push({step:step+1,damage:health-e.hp,windup:move.activeStart,duration:move.duration});
 }
 assert.equal(hits,3);assert(!requestBasicAttack(p,c.w,aim,()=>{},now),'Finisher recovery rejects spam');
});
test('Mandate triggers after three Blunt contacts rather than requiring a blade',()=>{
 const c=setup('oathkeeperMandate');assert(useAbility(0,c.p,c.w,()=>{},now,aim));const target=c.w.enemies[0],mark=target.techniqueMarks.find(m=>m.kind==='mandate');assert(mark);
 // Exercise the real primary weapon contribution hook, not a synthetic mark increment.
 for(let step=0;step<3;step++){target.x=c.p.x+30;target.y=c.p.y;assert(requestBasicAttack(c.p,c.w,aim,()=>{},now));for(let i=0;c.p.combatState.attacking&&i<200;i++){now+=.01;updateWeaponCombat(c.p,c.w,aim,.01,now,()=>{});}}
 assert(mark.triggered);assert(getCombatTechniqueState(c.p).events.some(e=>e.abilityId==='oathkeeperMandate'));
});
test('Blunt damage grows with level and proficiency, uses Dexterity, and all Oathkeeper class skills follow it',()=>{
 for(const level of [1,15,33,60]){
  const c=setup('oathkeeperOathStrike','base',level);const damage=calculateAbilityDamage(c.p,getAbilityById('oathkeeperOathStrike'));
  report.scaling.push({level,damage});
 }
 for(let i=1;i<report.scaling.length;i++)assert(report.scaling[i].damage>report.scaling[i-1].damage);
 const c=setup();const before=progressionPower(c.p,'blunt');c.p.skillState.skills.spirit.level=200;assert.equal(progressionPower(c.p,'blunt'),before);c.p.skillState.skills.dexterity.level=100;assert(progressionPower(c.p,'blunt')>before);
});
fs.mkdirSync('docs/oathkeeper-blunt',{recursive:true});fs.writeFileSync('docs/oathkeeper-blunt/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,casts:report.casts.length,scaling:report.scaling}));
