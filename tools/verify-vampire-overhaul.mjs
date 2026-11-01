import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {applyBloodline,modifyBloodlineHealing,modifyBloodlineIncomingDamage} from '../src/bloodlineSystem.js';
import {ABILITIES,getAbilityById,ITEMS} from '../src/data.js';
import {SKILL_TREE_NODES,spendSkillTreeNode,respecSkillTree,getAvailableSkillTreePoints,normalizeSkillTreeState} from '../src/skillTreeSystem.js';
import {useAbility,updateCombat,updateAbilityInput,updateSummons,calculateAbilityDamage,getPlayerMovementMultiplier} from '../src/combat.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {selectAbilityMorph,getAbilityMorphOptions} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {vampireAbilityMultiplier,vampireHealthCost,royalActive} from '../src/vampireRules.js';
import {isBleeding,bleedLayers} from '../src/bleedingSystem.js';
import {onVampireMelee,onVampireBatHit} from '../src/vampireSystem.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {applyTargetDamage} from '../src/enemyBehaviors.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {handleActorZeroHpForCoop} from '../src/coopReviveSystem.js';
import {VAMPIRE_MORPHS} from '../src/vampireData.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const aim={hasAim:true,combatAimX:1,combatAimY:0,rightStickActive:true,rightStickAimX:1,rightStickAimY:0};
const world=()=>({mode:'dungeon',width:40,height:30,tiles:Array.from({length:30},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const enemy=(extra={})=>({id:'foe',kind:'rat',name:'Target',x:370,y:320,hp:10000,maxHp:10000,r:12,radius:12,speed:0,damage:10,dmg:10,aggro:3,xp:100,combatTargetKind:'player',...extra});
function actor(cls='oathkeeper'){
 const p=createPlayer('Vampire review');chooseClass(p,cls);applyBloodline(p,'vampire');migratePlayer(p);p.id='vampire-review';p.x=p.y=320;p.dirX=1;p.dirY=0;p.gold=100;
 const w=world();useAbility('block',p,w,()=>{},now,aim);Object.assign(p,{hp:500,maxHp:1000,spirit:1000,maxSpirit:1000,stamina:1000,maxStamina:1000});return p;
}
function learn(p,id){unlockActiveAbility(p,id,{autoAssignEmpty:false});assignAbilityToSlot(p,0,id);}
function cast(p,w,id){learn(p,id);const logs=[];assert(useAbility(0,p,w,m=>logs.push(m),now,aim),id+': '+logs.join('; '));}
function tick(p,w,seconds,input={}){for(let i=0;i<Math.ceil(seconds*60);i++){now+=1/60;updateCombat(p,w,{...aim,...input},1/60,now,()=>{});}}
const checks=[];function test(name,f){f();checks.push(name);console.log('PASS '+name);}
test('19 nodes / 9 skills; all purchasable through actual prerequisites',()=>{
 const p=actor();p.skillTree.bloodlineBonusPoints=100;assert.equal(Object.values(SKILL_TREE_NODES).filter(n=>n.tree==='vampire').length,19);
 for(const n of Object.values(SKILL_TREE_NODES).filter(n=>n.tree==='vampire')){if(p.skillTree.spent[n.id])continue;const r=spendSkillTreeNode(p,n.id);assert(r.ok,n.id+': '+r.reason);}
 assert.equal(ABILITIES.filter(a=>a.vampire).length,9);for(const a of ABILITIES.filter(a=>a.vampire))assert(p.knownAbilities.includes(a.id));
});
test('actual HP cost is max-based, miss still pays, no Spirit/Stamina, cannot spend last HP',()=>{
 const p=actor(),w=world();cast(p,w,'crimsonFeast');assert.equal(p.hp,470);assert.equal(p.spirit,1000);assert.equal(p.stamina,1000);
 p.cooldowns={};p.hp=30;assert.equal(useAbility(0,p,w,()=>{},now,aim),false);assert.equal(p.hp,30);
 p.skillTree.spent.vampire_chalice=1;assert.equal(vampireHealthCost(p,getAbilityById('crimsonFeast')),27);
});
test('cross-class blood recovery equals actual HP loss exactly once, no overkill/dummy/gear double drain',()=>{
 for(const cls of ['oathkeeper','gravecaller','waverider','fellhunter','thornbinder']){
  const p=actor(cls),w=world(),e=enemy({hp:1,maxHp:1});w.enemies=[e];p.equipment.weapon='lichboneScythe';
  cast(p,w,'crimsonFeast');assert(Math.abs(p.hp-470.2)<1e-6,cls+' '+p.hp);
 }
 const p=actor(),w=world();w.enemies=[enemy({trainingDummy:true})];cast(p,w,'crimsonFeast');assert.equal(p.hp,470);
});
test('360-degree wave hits all quadrants and total healing respects cast cap',()=>{
 const p=actor(),w=world();w.enemies=Array.from({length:40},(_,i)=>enemy({id:'e'+i,x:320+Math.cos(i*Math.PI/20)*80,y:320+Math.sin(i*Math.PI/20)*80}));cast(p,w,'crimsonTide');assert(w.enemies.every(e=>e.hp===10000));tick(p,w,.4);assert(w.enemies.every(e=>e.hp<10000));assert(p.hp<=520.000001,String(p.hp));
});
test('beam is held, single-target, rotates, pays upkeep, ends on release and enforces end cooldown',()=>{
 const p=actor(),w=world();w.enemies=[enemy(),enemy({id:'second',x:420})];learn(p,'sanguineLance');
 updateAbilityInput(p,w,{...aim,ability0Pressed:true,ability0Held:true},.01,now,()=>{});assert(p.activeChannel);
 const hp=p.hp;tick(p,w,.5,{ability0Held:true});assert(p.hp!==hp);assert(w.enemies[0].hp<10000);assert.equal(w.enemies[1].hp,10000);assert.equal(getPlayerMovementMultiplier(p),.92*.4);
 tick(p,w,.02,{ability0Released:true});assert.equal(p.activeChannel,null);assert(Number.isFinite(p.cooldowns.sanguineLance));assert.equal(useAbility(0,p,w,()=>{},now,aim),false);
 now+=10.1;p.hp=500;assert(useAbility(0,p,w,()=>{},now,aim));p.hp=1;w.enemies=[];tick(p,w,.3,{ability0Held:true});assert.equal(p.activeChannel,null);assert(p.hp>=1);
});
test('bleed passives work with every melee category; bounded expiry and Communion consumes real wounds',()=>{
 const old=Math.random;Math.random=()=>0;
 try{for(const type of ['sword','axe','mace','scythe','dagger','staff','spear','hammer']){
  const p=actor(),w=world();p.skillTree.spent.vampire_edge=1;p.equipment.weapon=Object.values(ITEMS).find(i=>i.slot==='weapon'&&i.weaponType===type)?.id;if(!p.equipment.weapon)continue;
  const e=enemy({x:345});w.enemies=[e];assert(requestBasicAttack(p,w,aim,()=>{},now));for(let i=0;i<90;i++){now+=1/60;updateWeaponCombat(p,w,aim,1/60,now,()=>{});}assert(isBleeding(e,now),type);
 }
 const p=actor(),w=world(),e=enemy();w.enemies=[e];p.skillTree.spent.vampire_edge=1;p.skillTree.spent.vampire_lord=1;onVampireMelee(p,w,e,100,now);const limit=bleedLayers(e,now)[0].extensionLimit;
 for(let i=0;i<100;i++)onVampireMelee(p,w,e,100,now+i*.01);assert(bleedLayers(e,now)[0].until<=limit);
 cast(p,w,'bloodCommunion');assert(!isBleeding(e,now));const hp=p.hp;p.cooldowns={};assert.equal(useAbility(0,p,w,()=>{},now,aim),false);assert.equal(p.hp,hp);
 }finally{Math.random=old;}
});
test('Nightwing movement obeys walls and Execution has delayed contact',()=>{
 const p=actor(),w=world();for(const row of w.tiles)row[12]={biome:'wall',passable:false};cast(p,w,'nightwingStep');assert(p.x<384);
 const q=actor(),v=world(),e=enemy();v.enemies=[e];cast(q,v,'crimsonExecution');assert.equal(e.hp,10000);tick(q,v,.5);assert(e.hp<10000);
});
test('Bat Beast uses companion navigation, real damage, ownership, per-second recovery and expiry',()=>{
 const p=actor('gravecaller'),w=world(),e=enemy({x:400});w.enemies=[e];cast(p,w,'callBatBeast');assert.equal(p.summons.length,1);const s=p.summons[0];assert.equal(s.ownerId,p.id);const before=e.hp;
 for(let i=0;i<300;i++){now+=1/60;updateSummons(1/60,p,w,()=>{},now);}assert(e.hp<before);const hp=p.hp;for(let i=0;i<100;i++)onVampireBatHit(p,w,s,e,10000,now);assert(p.hp-hp<=10.001);
 now+=31;updateSummons(.01,p,w,()=>{},now);assert.equal(p.summons.length,0);assert(Number.isFinite(p.cooldowns.callBatBeast));
});
test('Royal toggle, upkeep, environment, outside healing, typed vulnerability and non-Vampire penalties',()=>{
 const p=actor(),w=world();cast(p,w,'royalBatBeast');assert(royalActive(p));assert.equal(p.hp,450);assert.equal(vampireAbilityMultiplier(p,{classId:'oathkeeper'},w),.75);
 assert.equal(modifyBloodlineHealing(p,100),72);assert.equal(modifyBloodlineIncomingDamage(p,100,'fire'),110);assert.equal(modifyBloodlineIncomingDamage(p,100,'holy'),110);assert.equal(modifyBloodlineIncomingDamage(p,100,'physical'),100);
 tick(p,w,3.1);assert(p.hp<450&&p.hp>439);assert(useAbility(0,p,w,()=>{},now,aim));assert(!royalActive(p));assert.equal(p.cooldowns.royalBatBeast,now);
 assert.equal(vampireAbilityMultiplier(p,getAbilityById('crimsonTide'),{mode:'overworld',worldAtmosphere:{night:false}}),.85);
 assert.equal(vampireAbilityMultiplier(p,getAbilityById('crimsonTide'),{mode:'overworld',worldAtmosphere:{night:true}}),1.15);assert.equal(vampireAbilityMultiplier(p,getAbilityById('crimsonTide'),w),1.15);
});
test('all four owners have independent costs, forms, channels and bats',()=>{
 const w=world(),party=Array.from({length:4},()=>actor());party.forEach((p,i)=>{p.id='owner'+i;p.slot=i+1;});party[0].coop={players:party.slice(1)};for(const p of party.slice(1))Object.defineProperty(p,'questOwner',{value:party[0]});
 for(let i=0;i<4;i++){cast(party[i],w,'royalBatBeast');cast(party[i],w,'callBatBeast');assert.equal(party[i].hp,350);assert.equal(party[i].summons[0].ownerId,party[i].id);}
 party[1].hp=1;tick(party[1],w,3.1);assert(!royalActive(party[1]));assert(royalActive(party[0]));
});
test('mastery 5/10 alternatives and legacy migration/save/respec are idempotent',()=>{
 const p=actor(),w=world();learn(p,'sanguineLance');assert.equal(getAbilityMorphOptions(p,'sanguineLance').length,3);assert(!selectAbilityMorph(p,'sanguineLance','rupturingLance',now).ok);
 getAbilityMastery(p,'sanguineLance',true).level=5;assert(selectAbilityMorph(p,'sanguineLance','rupturingLance',now).ok);assert.equal(resolveSubclassAbility(p,'sanguineLance').vampireMorph,'rupturingLance');
 p.skillTree.spent.vampire_stalker=1;p.skillTree.spent.vampire_old_oath=1;p.skillTree.spent.vampire_edge=1;p.skillTree.spent.vampire_royal=1;p.skillTree.bloodlineBonusPoints=10;delete p.skillTree.vampireOverhaulVersion;
 normalizeSkillTreeState(p);assert(!p.skillTree.spent.vampire_stalker);const available=getAvailableSkillTreePoints(p);normalizeSkillTreeState(p);assert.equal(getAvailableSkillTreePoints(p),available);assert.equal(p.skillTree.bloodlineBonusPoints,10);
 cast(p,w,'royalBatBeast');const loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(loaded.bloodline.id,'vampire');assert(!loaded.vampireForm);assert.equal(getAbilityMastery(loaded,'sanguineLance').level,5);
 assert(respecSkillTree(p).ok);assert(!royalActive(p));assert.equal(p.bloodline.id,'vampire');assert.equal(applyBloodline(p,'cambion'),false);
});
test('invulnerability prevents damage/recovery and fractional bleed never becomes minimum-one damage',()=>{
 const p=actor(),w=world(),e=enemy({invulnerableUntil:now+10});w.enemies=[e];cast(p,w,'crimsonFeast');assert.equal(e.hp,10000);assert.equal(p.hp,470);
 const old=Math.random;Math.random=()=>0;
 try{p.skillTree.spent.vampire_edge=1;e.invulnerableUntil=0;onVampireMelee(p,w,e,1,now);const before=e.hp;tick(p,w,1.1);assert(Math.abs(before-e.hp-.02)<1e-8);}finally{Math.random=old;}
});
test('high mastery preserves blood price; form ends on world change and death; save snapshot starts recovery without mutating live state',()=>{
 const p=actor(),w=world();learn(p,'crimsonTide');getAbilityMastery(p,'crimsonTide',true).level=1000;assert.equal(vampireHealthCost(p,resolveSubclassAbility(p,'crimsonTide')),80);
 cast(p,w,'royalBatBeast');const original=JSON.stringify(p.cooldowns),snapshot=sanitizeForSave(p);assert.equal(JSON.stringify(p.cooldowns),original);assert.equal(snapshot.cooldowns.royalBatBeast,now);
 const loaded=normalizeProfileSave(snapshot);assert.equal(loaded.vampireForm,undefined);assert.equal(getAbilityMastery(loaded,'crimsonTide').level,1000);
 tick(p,world(),.02);assert(!royalActive(p));assert(Number.isFinite(p.cooldowns.royalBatBeast));
 now+=13;cast(p,w,'royalBatBeast');p.hp=0;handleActorZeroHpForCoop({player:p,world:w},p,now);assert(!p.vampireForm.active);p.hp=500;assert(!royalActive(p));
});
test('actual daytime/night/dungeon hits and incoming typed damage use the shared pipelines',()=>{
 const damages=[];for(const [mode,night]of [['overworld',false],['overworld',true],['dungeon',true]]){
  const p=actor(),w=world();w.mode=mode;w.worldAtmosphere={night};const e=enemy();w.enemies=[e];cast(p,w,'crimsonFeast');damages.push(e.maxHp-e.hp);
 }assert(damages[1]>damages[0]);assert.equal(damages[1],damages[2]);
 const p=actor(),w=world(),e=enemy({x:340,element:'fire'});const a=applyTargetDamage(e,p,100,w,()=>{},{now});e.element='physical';const b=applyTargetDamage(e,p,100,w,()=>{},{now});assert(a.hpDamage>b.hpDamage);
});
test('every bloodline morph casts through the shared loadout and blocks unsafe switching',()=>{
 for(const [id,morphs]of Object.entries(VAMPIRE_MORPHS))for(const morph of morphs){
  const p=actor(),w=world();learn(p,id);getAbilityMastery(p,id,true).level=10;assert(selectAbilityMorph(p,id,morph,now).ok);w.enemies=[enemy()];assert(useAbility(0,p,w,()=>{},now,aim),morph);
  if(id==='sanguineLance')tick(p,w,.3,{ability0Held:true});
  if(id==='royalBatBeast'||id==='callBatBeast')assert(!selectAbilityMorph(p,id,'base',now).ok);
 }
});
test('four simultaneous channels and dense waves retain owner-only costs and bounded recovery',()=>{
 const w=world(),party=Array.from({length:4},(_,i)=>{const p=actor();p.id='stress'+i;return p;});
 for(const p of party)cast(p,w,'sanguineLance');const untouched=party.slice(1).map(p=>p.hp);tick(party[0],w,.3,{ability0Held:true});assert.deepEqual(party.slice(1).map(p=>p.hp),untouched);
 for(const p of party.slice(1))tick(p,w,.3,{ability0Held:true});assert(party.every(p=>p.activeChannel?.abilityId==='sanguineLance'));
 const dense=world();dense.enemies=Array.from({length:120},(_,i)=>enemy({id:'dense'+i,x:320+Math.cos(i)*80,y:320+Math.sin(i)*80}));
 for(const p of party){p.activeChannel=null;p.hp=500;cast(p,dense,'crimsonTide');tick(p,dense,.4);assert(p.hp<=520.000001);}assert(dense.effects.length<=280);
});
fs.mkdirSync('docs/vampire-overhaul',{recursive:true});fs.writeFileSync('docs/vampire-overhaul/verification.json',JSON.stringify({checks},null,2));
