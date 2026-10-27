import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {useAbility,updateCombat,updateSummons} from '../src/combat.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {getSkillTreeBonuses,getSkillTreeNodesByTree,SKILL_TREE_NODES} from '../src/skillTreeSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {onEnemyKilledByPlayer} from '../src/classPassives.js';
import {applyLegendaryOutgoingDamage,onLegendaryEnemyKilled} from '../src/legendarySystem.js';
import {getSubclassCombatState,onSubclassKill} from '../src/subclassCombat.js';
import {restoreGravecallerHealth,restoreGravecallerLifesteal,gravecallerSkillLifesteal} from '../src/gravecallerSustain.js';
import {abilitySummary} from '../src/uiInformation.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {ensureContribution} from '../src/encounterLedger.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
let clock=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
function player(level=33){
 const p=createPlayer('Sustain review');chooseClass(p,'gravecaller');p.skillState.combat.level=level;
 for(const s of ['spirit','summoning','scythe','focus','dexterity'])p.skillState.skills[s].level=Math.max(1,Math.round(level*.35));
 p.equipment.weapon='graveScythe';p.skillTree.respecVersion=1;migratePlayer(p);Object.assign(p,{id:'sustain-review',x:256,y:320,spiritAwakened:true,isInCombat:true});p.spirit=p.maxSpirit;p.hp=p.maxHp*.3;clock+=30;return p;
}
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const foe=(hp=1000000,x=302,y=320)=>({id:'foe'+Math.random(),kind:'hollowling',name:'Target',x,y,hp,maxHp:hp,radius:16,r:16,aggro:3,combatLevel:15});
function prepare(p,id,morph='base',slot=0){unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots[slot]=id;assert.ok(selectAbilityMorph(p,id,morph).ok);}
function steps(p,w,seconds,input=aim){const start=clock;for(let i=1;i<=Math.round(seconds*60);i++){clock=start+i/60;updateCombat(p,w,input,1/60,clock,()=>{});for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);}}
test('Necrotic Bolt and every morph steal life from actual damage, without overkill or minimum-one healing',()=>{
 for(const morph of ['base','acolyte','deathknight']){
  const p=player(),w=world();prepare(p,'graveSpark',morph);w.enemies=[foe(1)];const hp=p.hp;
  assert.ok(useAbility(0,p,w,()=>{},clock,aim));steps(p,w,.5);
  assert.equal(w.enemies[0].hp,0);assert.ok(Math.abs(p.hp-hp-(morph==='deathknight'?.10:.08))<1e-8,morph);
 }
});
test('all eight permanent summon forms steal life once per primary hit, preserving roles and mastery',()=>{
 for(const id of ['summonLich','gravecallerSummonLich'])for(const morph of ['base','acolyte','deathknight']){
  const p=player(),w=world();prepare(p,id,morph);assert.ok(useAbility(0,p,w,()=>{},clock,aim));const s=p.summons[0];
  s.x=280;s.y=320;s.attackCooldown=0;w.enemies=[foe(1,300,320)];const hp=p.hp,xp=getAbilityMastery(p,id).xp;
  updateSummons(.01,p,w,()=>{},clock);assert.equal(w.enemies[0].hp,0);
  assert.ok(Math.abs(p.hp-hp-(morph==='acolyte'?.08:.04))<1e-8,id+'/'+morph);assert.equal(getAbilityMastery(p,id).xp,xp);
 }
});
test('lifesteal and summon healing limits are shared, refill with time, and cannot heal dead or full actors',()=>{
 const p={hp:10,maxHp:100,lifeState:'alive'};assert.equal(restoreGravecallerHealth(p,100,{now:1}),6);assert.equal(restoreGravecallerHealth(p,100,{now:1}),0);
 assert.equal(restoreGravecallerHealth(p,100,{now:2}),3);assert.equal(restoreGravecallerHealth(p,100,{now:3,source:'summon'}),2);
 assert.equal(restoreGravecallerHealth(p,100,{now:3,source:'summon'}),0);assert.equal(restoreGravecallerHealth(p,100,{now:4,source:'summon'}),1);
 assert.equal(restoreGravecallerLifesteal({hp:10,maxHp:100},1,.1,{now:1}),.001);
 assert.equal(restoreGravecallerHealth({hp:0,maxHp:100},100,{now:1}),0);assert.equal(restoreGravecallerHealth({hp:100,maxHp:100},100,{now:1}),0);
});
test('Commander henchmen and a separate lich share their owner healing limit across repeated attacks',()=>{
 const p=player(65),w=world();p.skillTree.spent.spirit_bone_coterie=1;prepare(p,'summonLich','acolyte',0);prepare(p,'gravecallerSummonLich','acolyte',1);
 assert.ok(useAbility(0,p,w,()=>{},clock,aim));assert.ok(useAbility(1,p,w,()=>{},clock,aim));assert.equal(p.summons.length,4);
 w.enemies=[foe(1e7,320,320)];p.summons.forEach((s,i)=>Object.assign(s,{x:295,y:320+i*3,attackCooldown:0}));const hp=p.hp;
 updateSummons(.01,p,w,()=>{},clock);assert.ok(p.hp>hp&&p.hp-hp<=p.maxHp*.02+1e-8);
 const after=p.hp;for(let i=0;i<10;i++){p.summons.forEach(s=>s.attackCooldown=0);updateSummons(.01,p,w,()=>{},clock);}assert.ok(p.hp-after<=1e-8);
 clock+=1;const before=p.hp;p.summons.forEach(s=>s.attackCooldown=0);updateSummons(.01,p,w,()=>{},clock);assert.ok(p.hp>before&&p.hp-before<=p.maxHp*.01+1e-8);
});
test('fully invested high-level Acolyte Host cannot inherit class, scythe, Vampire or legendary lifesteal',()=>{
 const p=player(65),w=world(),id='gravecallerMurmuringHost';prepare(p,id,'acolyte');p.equipment.weapon='lichboneScythe';p.bloodline={id:'vampire'};
 p.skillTree.spent={spirit_root:1,spirit_harvest:1,spirit_minions:1,spirit_bone_coterie:1,spirit_soul_siphon:1,spirit_vital_theft:1,spirit_grave_command:1,scythe_root:1,scythe_branch_b:1,scythe_merge:1,scythe_second_b:1,scythe_second_merge:1,scythe_capstone:1,scythe_foundation_1:1,scythe_foundation_2:1,scythe_foundation_3:1,scythe_foundation_4:1};
 migratePlayer(p);p.hp=p.maxHp*.3;p.spirit=p.maxSpirit;w.enemies=Array.from({length:20},(_,i)=>foe(1e6,300+i*20,320));const hp=p.hp,xp=getAbilityMastery(p,id).xp;
 assert.ok(useAbility(0,p,w,()=>{},clock,aim));steps(p,w,3);assert.equal(p.hp,hp);assert.ok(w.enemies.every(e=>e.hp<e.maxHp));assert.equal(getAbilityMastery(p,id).xp,xp);
 assert.equal(getSubclassCombatState(p).hostWard.reduction,.25);
});
test('Death Harvest restores Spirit without health, and only one class node improves eligible lifesteal',()=>{
 const p=player(),hp=p.hp;p.spirit=0;onEnemyKilledByPlayer(p,foe(0),world(),()=>{},clock);assert.equal(p.hp,hp);assert.ok(p.spirit>0);
 const nodes=Object.values(SKILL_TREE_NODES).filter(n=>n.tree==='spirit');assert.equal(nodes.filter(n=>n.bonuses?.lifestealPct).length,0);assert.equal(nodes.filter(n=>n.bonuses?.gravecallerLifestealPct).length,1);
 p.skillTree.spent={spirit_root:1,spirit_harvest:1,spirit_soul_siphon:1,spirit_vital_theft:1,spirit_grave_command:1};assert.equal(getSkillTreeBonuses(p).gravecallerLifestealPct,2);
});
test('Vampire bloodline training still improves eligible drains without adding lifesteal to unrelated spells',()=>{
 const p=player(),w=world();prepare(p,'graveSpark');p.bloodline={id:'vampire'};
 const nodes=getSkillTreeNodesByTree('vampire').filter(n=>n.bonuses?.lifestealPct);p.skillTree.spent=Object.fromEntries(nodes.map(n=>[n.id,1]));
 migratePlayer(p);p.hp=p.maxHp*.3;p.spirit=p.maxSpirit;
 const bonus=nodes.reduce((sum,n)=>sum+n.bonuses.lifestealPct,0),before=p.hp;w.enemies=[foe(1)];assert.ok(useAbility(0,p,w,()=>{},clock,aim));steps(p,w,.5);
 assert.ok(Math.abs(p.hp-before-(8+8+bonus)/100)<1e-8,`Expected ${(8+8+bonus)/100}, received ${p.hp-before}`);
});
test('Gravecaller Vampire weapon attacks retain bloodline lifesteal and cannot heal from overkill',()=>{
 const p=player(),w=world();p.bloodline={id:'vampire'};p.equipment.weapon='oldKnife';migratePlayer(p);p.hp=p.maxHp*.3;
 w.enemies=[foe(1,282,320)];const before=p.hp;assert.ok(requestBasicAttack(p,w,aim,()=>{},clock));
 for(let i=0;i<80;i++){clock+=1/120;updateWeaponCombat(p,w,aim,1/120,clock,()=>{});}
 assert.equal(w.enemies[0].hp,0);assert.ok(Math.abs(p.hp-before-.08)<1e-8);
});
test('sustain belongs to deliberate drain skills, not every Deathknight mark, field, curse or beam',()=>{
 assert.equal(gravecallerSkillLifesteal('bloodLance','base'),8);assert.equal(gravecallerSkillLifesteal('bloodLance','acolyte'),0);
 assert.equal(gravecallerSkillLifesteal('soulSiphon','base'),12);assert.equal(gravecallerSkillLifesteal('soulSiphon','deathknight'),6);
 for(const id of ['gravecallerFuneralUrn','gravecallerDeathEcho']){
  const p=player(),w=world();prepare(p,id,'deathknight');w.enemies=[foe()];const hp=p.hp;assert.ok(useAbility(0,p,w,()=>{},clock,aim));steps(p,w,1.1);assert.equal(p.hp,hp);assert.ok(w.enemies[0].hp<w.enemies[0].maxHp);
  assert.ok(!abilitySummary(resolveAbilityMorph(p,id,'deathknight'),p).includes('Recover life'));
 }
});
test('Acolyte Soul Siphon is a modest one-time heal, increased by Soul Fragments and capped at 8%',()=>{
 for(const souls of [0,5]){
  const p=player(100),w=world(),id='soulSiphon';prepare(p,id,'acolyte');w.enemies=[foe()];
  if(souls)for(let i=0;i<souls;i++)onSubclassKill(p,foe(0),w,clock);
  const hp=p.hp;assert.ok(useAbility(0,p,w,()=>{},clock,aim));const heal=p.hp-hp;
  assert.ok(heal>=p.maxHp*.03-1e-8&&heal<=p.maxHp*.08+1e-8);if(souls)assert.ok(heal>p.maxHp*.07);
  assert.equal(getSubclassCombatState(p).souls,0);steps(p,w,2);assert.equal(p.hp,hp+heal);
  assert.ok(ensureContribution(w.enemies[0],p).support[`${id}:support`]>0,'The healing rite still counts as useful support');
 }
});
test('legacy saves retain nodes, known abilities, morphs and summon health while acquiring the new balance',()=>{
 const p=player(),w=world();prepare(p,'summonLich','acolyte');p.skillTree.spent.spirit_harvest=1;assert.ok(useAbility(0,p,w,()=>{},clock,aim));
 const health=p.summons.map(s=>[s.hp,s.maxHp]);const loaded=normalizeProfileSave(sanitizeForSave(p));migratePlayer(loaded);
 assert.equal(getSkillTreeBonuses(loaded).gravecallerLifestealPct,2);assert.ok(loaded.knownAbilities.includes('summonLich'));assert.equal(loaded.abilityMorphs?.summonLich?.selected||loaded.abilityMorphs?.summonLich, p.abilityMorphs?.summonLich?.selected||p.abilityMorphs?.summonLich);
 assert.deepEqual(loaded.summons.map(s=>[s.hp,s.maxHp]),health);
});
test('legendary damage bonuses remain, but Gravecaller healing is deferred to actual hits; other classes keep their healing',()=>{
 const p=player();p.equipment.weapon='lichboneScythe';const hp=p.hp,result=applyLegendaryOutgoingDamage(p,foe(1),100,{},world(),()=>{},clock);
 assert.ok(result>100);assert.equal(p.hp,hp);
 const other=player();other.classId='eldritch';other.equipment.weapon='lichboneScythe';const before=other.hp;applyLegendaryOutgoingDamage(other,foe(),100,{},world(),()=>{},clock);assert.ok(other.hp>before);
});
fs.mkdirSync('docs/gravecaller-sustain',{recursive:true});fs.writeFileSync('docs/gravecaller-sustain/verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');console.log('Gravecaller sustain: '+checks.length+' checks passed.');
