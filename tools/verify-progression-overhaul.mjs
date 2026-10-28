import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPlayer, chooseClass, migratePlayer, addItem, gainXp, calculateMaxHp, calculateMaxStamina, calculateMaxSpirit } from '../src/player.js';
import { ABILITIES, ITEMS, getAbilityById } from '../src/data.js';
import { CLASS_XP_AFFINITIES, SURVIVAL_ATTRIBUTES, getClassAffinities, abilityProgressionCategories } from '../src/progressionProfiles.js';
import { createNewSkillState, addSkillXP, addCombatXP, getCombatLevel, getCombatLevelProgress, migrateSkillState } from '../src/skills.js';
import { XP_CURVES, xpRequired, xpForLevels, advanceProgression } from '../src/progressionMath.js';
import { progressionPower } from '../src/combatPower.js';
import { recordEnemyCombatContribution, grantSharedCombatKillXp, allocateEncounterXP } from '../src/combatProgression.js';
import { recordSupportContribution } from '../src/encounterLedger.js';
import { purchaseSkillScroll, readSkillScroll } from '../src/skillScrollSystem.js';
import { assignAbilityToSlot, unlockActiveAbility } from '../src/abilityLoadoutSystem.js';
import { useAbility, updateSummons, updateEnemies, updateCombat, calculateAbilityDamage } from '../src/combat.js';
import { requestBasicAttack, requestHeavyAttack, updateWeaponCombat, calculateWeaponDamage, WEAPON_MOVESETS, COMBAT_TIMING_BASELINE } from '../src/combatMoves.js';
import { getAbilityMastery, grantAbilityMasteryXp, applyAbilityMastery, rewardCombatPurpose } from '../src/abilityMasterySystem.js';
import { updateOutOfCombatRecovery } from '../src/outOfCombatRecovery.js';
import { applyLegendaryOutgoingDamage } from '../src/legendarySystem.js';
import { normalizeProfileSave } from '../src/saveProfiles.js';
import { sanitizeForSave } from '../src/gameSave.js';
import { reconstructOrrakai } from '../src/orrakaiLayout.js';
import { ensureEnemyProgression, enemyXPForLevel } from '../src/enemyProgression.js';
import { beginAbilityCharge } from '../src/chargeSystem.js';
import { rebaseCooldownMap } from '../src/cooldownClock.js';

const report={checks:[],simulations:[],timings:[],performance:{}};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const world=(mode='dungeon')=>({mode,name:'Overhaul verification',width:64,height:48,tiles:Array.from({length:48},()=>Array.from({length:64},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const actor=(classId='classless')=>{const p=createPlayer(classId);chooseClass(p,classId,()=>{});Object.assign(p,{id:classId,x:260,y:320,dirX:1,dirY:0,spirit:200,maxSpirit:200,stamina:300,maxStamina:300,gold:40});return p;};
const foe=(p,extra={})=>({id:'foe',name:'Test enemy',kind:'rat',x:290,y:320,hp:100,maxHp:100,xp:50,level:1,aggro:3,combatTargetKind:'player',combatTargetId:p.id,r:12,radius:12,...extra});
const now=()=>performance.now()/1000+10;
const aim={combatAimX:1,combatAimY:0,hasAim:true};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('independent Combat XP and all guaranteed survival attributes',()=>{
 const p=actor(),e=foe(p);recordEnemyCombatContribution(e,p,'blade',100,{source:'weapon',weaponType:'sword'});
 grantSharedCombatKillXp(p,e,50);close(getCombatLevelProgress(p).xp,50);
 const combat=getCombatLevel(p);gainXp(p,'warding',1e6);assert.equal(getCombatLevel(p),combat);
 for(const id of SURVIVAL_ATTRIBUTES)assert.ok(p.skillState.skills[id].xp>0,id);
 close(p.lastCombatReward.awards.reduce((s,a)=>s+a.base,0),50);
});
test('every playable identity has exactly two distinct +25% affinities',()=>{
 for(const [id,affinities] of Object.entries(CLASS_XP_AFFINITIES)){
  assert.equal(new Set(affinities).size,2);const p=actor(id),e=foe(p);
  recordEnemyCombatContribution(e,p,'blade',100,{source:'weapon'});grantSharedCombatKillXp(p,e,50);
  for(const a of p.lastCombatReward.awards)close(a.amount,a.base*(getClassAffinities(p).includes(a.skillId)?1.25:1)*(a.skillId==='defence'?1.25:1));
 }
 const a=actor('oathkeeper'),b=actor('fellhunter');b.skillState=structuredClone(a.skillState);
 close(progressionPower(a,'blade'),progressionPower(b,'blade'));
});
test('weapon switching preserves actual sword, bow and scythe shares',()=>{
 const p=actor(),e=foe(p);recordEnemyCombatContribution(e,p,'blade',30,{source:'weapon',weaponType:'sword'});
 recordEnemyCombatContribution(e,p,'archery',20,{source:'weapon',weaponType:'bow'});
 recordEnemyCombatContribution(e,p,'spirit',50,{source:'weapon',weaponType:'scythe'});grantSharedCombatKillXp(p,e,100);
 for(const id of ['blade','archery','scythe'])assert.ok(p.lastCombatReward.awards.some(a=>a.skillId===id&&a.amount>0));
});
test('co-op final hit receives 100%, damage/support participants 50%, inactive none',()=>{
 const a=actor('oathkeeper'),b=actor('fellhunter'),support=actor('waverider'),idle=actor('gravecaller'),e=foe(a);
 recordEnemyCombatContribution(e,a,'blade',60,{source:'weapon'});recordSupportContribution(support,[e],'hydromancerMendingCurrent',30);
 recordEnemyCombatContribution(e,b,'archery',40,{source:'weapon'});grantSharedCombatKillXp(a,e,100);
 close(a.skillState.combat.xp,50);close(b.skillState.combat.xp,100);close(support.skillState.combat.xp,50);close(idle.skillState.combat.xp,0);
 const saved=JSON.stringify(sanitizeForSave([a,b,support]));grantSharedCombatKillXp(a,e,100);assert.equal(JSON.stringify(sanitizeForSave([a,b,support])),saved);
});
test('zero damage, harmless targets, safe spam and overhealing do not generate XP',()=>{
 const p=actor('waverider'),w=world(),before=JSON.stringify(p.skillState);
 for(let i=0;i<100;i++){p.cooldowns={};useAbility('hydromancerWaterTorrent',p,w,()=>{},now()+i,aim);rewardCombatPurpose(p,w,'hydromancerMendingCurrent',50,now());}
 assert.equal(JSON.stringify(p.skillState),before);
 const e=foe(p,{trainingDummy:true});recordEnemyCombatContribution(e,p,'warding',100,{sourceAbilityId:'hydromancerWaterTorrent'});grantSharedCombatKillXp(p,e,100);assert.equal(JSON.stringify(p.skillState),before);
 const empty=foe(p);recordEnemyCombatContribution(empty,p,'warding',0);grantSharedCombatKillXp(p,empty,100);assert.equal(JSON.stringify(p.skillState),before);
});
test('summon specialization is locked at encounter entry and slot count cannot inflate budget',()=>{
 const p=actor(),e=foe(p);unlockActiveAbility(p,'summonWolf',{autoAssignEmpty:false});
 recordEnemyCombatContribution(e,p,'blade',80,{source:'weapon'});p.loadout.abilitySlots[0]='summonWolf';
 recordEnemyCombatContribution(e,p,'blade',20,{source:'weapon'});grantSharedCombatKillXp(p,e,100);
 assert.ok(!p.lastCombatReward.awards.some(a=>a.skillId==='summoning'));
 for(const count of [1,4]){const q=actor(),f=foe(q);q.knownAbilities.push('summonWolf');q.loadout.abilitySlots=Array(count).fill('summonWolf');recordEnemyCombatContribution(f,q,'blade',100,{source:'weapon'});grantSharedCombatKillXp(q,f,100);close(q.lastCombatReward.awards.reduce((s,a)=>s+a.base,0),100);assert.ok(q.lastCombatReward.awards.find(a=>a.skillId==='summoning').base>0);}
});
test('starter merchant purchase, read, assignment, duplicates and ownership survive saves for every class',()=>{
 for(const id of Object.keys(CLASS_XP_AFFINITIES)){
  const p=actor(id),gold=p.gold;assert.ok(purchaseSkillScroll(p,'summonWolfScroll').ok);assert.equal(p.gold,gold-12);
  assert.equal(purchaseSkillScroll(p,'summonWolfScroll').ok,false);
  const index=p.inventory.findIndex(i=>i.id==='summonWolfScroll');assert.ok(readSkillScroll(p,index).ok);assert.ok(!p.inventory.some(i=>i.id==='summonWolfScroll'));
  assert.ok(assignAbilityToSlot(p,3,'summonWolf').ok);assert.equal(purchaseSkillScroll(p,'summonWolfScroll').ok,false);
  const loaded=normalizeProfileSave(sanitizeForSave(p));assert.ok(loaded.knownAbilities.includes('summonWolf'));assert.equal(loaded.loadout.abilitySlots[3],'summonWolf');
 }
 const p=actor();p.gold=0;assert.equal(purchaseSkillScroll(p,'summonWolfScroll').ok,false);assert.equal(p.gold,0);
});
test('Ilyra and her skill stall occupy passable Orrakai market locations',()=>{
 const w=world('capital');reconstructOrrakai(w);const npc=w.objects.find(o=>o.id==='orrakaiSkillMerchant'),stall=w.objects.find(o=>o.id==='orrakaiPactStall');
 assert.ok(npc?.skillMerchant&&stall?.skillMerchant);assert.ok(w.tiles[Math.floor(npc.y/32)][Math.floor(npc.x/32)].passable);assert.equal(w.objects.filter(o=>o.id==='orrakaiSkillMerchant').length,1);
 reconstructOrrakai(w);assert.equal(w.objects.filter(o=>o.id==='orrakaiSkillMerchant').length,1);
});
test('Wolf spawns, fights, trains Summoning/mastery, dismisses, cools down and resummons',()=>{
 const p=actor(),w=world(),t=now();unlockActiveAbility(p,'summonWolf');assignAbilityToSlot(p,3,'summonWolf');w.enemies=[foe(p,{hp:18,maxHp:18})];
 assert.ok(useAbility(3,p,w,()=>{},t,aim));assert.equal(p.summons[0].kind,'wolf');
 for(let i=1;i<=240;i++){updateSummons(1/60,p,w,()=>{},t+i/60);updateEnemies(1/60,p,w,()=>{},t+i/60);}
 assert.ok(p.skillState.skills.summoning.xp>0);assert.ok(getAbilityMastery(p,'summonWolf').lifetimeDamage>0);assert.ok(getAbilityMastery(p,'summonWolf').lifetimeContributingKills>0);
 assert.ok(useAbility(3,p,w,()=>{},t+5,aim));updateSummons(.01,p,w,()=>{},t+5);assert.equal(p.summons.length,0);
 assert.equal(useAbility(3,p,w,()=>{},t+5.1,aim),false);assert.ok(useAbility(3,p,w,()=>{},t+14,aim));assert.equal(p.summons.length,1);
});
test('unassigned summons do not earn mastery and unattended summons do not produce player XP',()=>{
 const p=actor(),e=foe(p,{combatTargetKind:'summon',combatTargetId:'pet'});unlockActiveAbility(p,'summonWolf');
 recordEnemyCombatContribution(e,p,'summoning',100,{source:'summon',sourceAbilityId:'summonWolf'});grantSharedCombatKillXp(p,e,100);close(p.skillState.combat.xp,0);
 const f=foe(p);recordEnemyCombatContribution(f,p,'blade',10,{source:'weapon'});recordEnemyCombatContribution(f,p,'summoning',90,{source:'summon',sourceAbilityId:'summonWolf'});p.loadout.abilitySlots=Array(4).fill(null);grantSharedCombatKillXp(p,f,100);assert.equal(getAbilityMastery(p,'summonWolf').lifetimeContributingKills,0);
});
test('Demonseed acquisition and legacy equipped/bank/old-proc state give deliberate equipment-bound knowledge',()=>{
 for(const storage of ['pickup','equipment','bank','proc']){
  const p=actor();if(storage==='pickup')addItem(p,'demonseedScythe');
  if(storage==='equipment')p.equipment.weapon='demonseedScythe';if(storage==='bank')p.bank=[{id:'demonseedScythe',qty:1}];
  if(storage==='proc')p.summons=[{kind:'miniDemon',legendaryTemporary:true,legendaryPassiveId:'demonseedImp',hp:85,alive:true}];
  migratePlayer(p);assert.equal(p.inventory.filter(i=>i.id==='summonDemonScroll').length,1);migratePlayer(p);assert.equal(p.inventory.filter(i=>i.id==='summonDemonScroll').length,1);
  assert.ok(readSkillScroll(p,p.inventory.findIndex(i=>i.id==='summonDemonScroll')).ok);p.equipment.weapon='oldKnife';assert.equal(assignAbilityToSlot(p,3,'summonDemon').ok,false);p.equipment.weapon='demonseedScythe';assert.ok(assignAbilityToSlot(p,3,'summonDemon').ok);
  const w=world();assert.ok(useAbility(3,p,w,()=>{},now(),aim));assert.equal(p.summons.filter(s=>s.kind==='miniDemon').length,1);
  assert.ok(normalizeProfileSave(sanitizeForSave(p)).knownAbilities.includes('summonDemon'));
 }
 const p=actor();p.equipment.weapon='demonseedScythe';const e=foe(p);applyLegendaryOutgoingDamage(p,e,10,{},world(),()=>{});assert.equal(p.summons.length,0);
});
test('terrain blocks summon attacks, obstacles steer and separated pets return safely',()=>{
 const p=actor(),w=world(),t=now();unlockActiveAbility(p,'summonWolf');useAbility('summonWolf',p,w,()=>{},t,aim);
 const pet=p.summons[0];pet.x=280;pet.y=320;pet.attackRange=120;const e=foe(p,{x:360,hp:10000,maxHp:10000});w.enemies=[e];
 for(let y=0;y<w.height;y++)w.tiles[y][10].passable=false;
 for(let i=1;i<50;i++)updateSummons(1/60,p,w,()=>{},t+i/60);assert.equal(e.hp,10000);
 pet.x=1500;updateSummons(1/60,p,w,()=>{},t+2);assert.ok(Math.hypot(pet.x-p.x,pet.y-p.y)<100);
});
test('owner death removes companions and starts their cooldown; universal pact works before awakening',()=>{
 const p=actor(),w=world(),t=now();assert.equal(p.spiritAwakened,false);
 addItem(p,'demonseedScythe');p.equipment.weapon='demonseedScythe';readSkillScroll(p,p.inventory.findIndex(i=>i.id==='summonDemonScroll'));
 assert.ok(useAbility('summonDemon',p,w,()=>{},t,aim));assert.ok(p.spirit<200);
 assert.equal(p.spiritAwakened,false,'Universal pact must preserve story awakening state');
 p.hp=0;updateSummons(.1,p,w,()=>{},t+1);assert.equal(p.summons.length,0);assert.equal(p.cooldowns.summonDemon,t+1);
 p.hp=100;assert.equal(useAbility('summonDemon',p,w,()=>{},t+2,aim),false);
 p.cooldowns={};assert.equal(useAbility('summonDemon',p,world('pvpArena'),()=>{},t+20,aim),false);
});
test('all eight light/heavy combinations execute with real finisher, hit timing and resource payment',()=>{
 const weapons=new Map();for(const [id,item]of Object.entries(ITEMS))if(item.slot==='weapon'&&item.weaponType&&!weapons.has(item.weaponType))weapons.set(item.weaponType,id);
 for(const [type,id]of weapons)for(const sequence of ['LLL','LLH','LHL','LHH','HLL','HLH','HHL','HHH']){
  const p=actor(),w=world(),t=now();p.equipment.weapon=id;p.stamina=p.maxStamina=10000;for(const s of Object.values(p.skillState.skills))s.level=20;
  const e=foe(p,{hp:1e7,maxHp:1e7});w.enemies=[e];
  for(let step=0;step<3;step++){
   const start=t+step*.75;assert.ok((sequence[step]==='H'?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},start),type+sequence);
   if(step===2){assert.ok(p.combatState.attackMove.finisher);assert.equal(p.combatState.attackMove.sequence,sequence);}
   for(let frame=1;frame<=40;frame++)updateWeaponCombat(p,w,aim,1/60,start+frame/60,()=>{});
  }
  assert.ok(e.hp<e.maxHp,type+sequence+' must hit');assert.ok(p.stamina<10000);
 }
});
test('faster attacks still register contact when a frame crosses the entire active interval',()=>{
 const p=actor(),w=world(),t=now();p.equipment.weapon='oldKnife';w.enemies=[foe(p)];requestBasicAttack(p,w,aim,()=>{},t);
 const move=p.combatState.attackMove;updateWeaponCombat(p,w,aim,move.activeEnd+.01,t+move.activeEnd+.01,()=>{});assert.ok(w.enemies[0].hp<100);
});
test('out-of-combat restores all resources; channels and nearby threats prevent resting recovery',()=>{
 const p=actor(),w=world();p.hp=20;p.stamina=10;p.spirit=0;updateOutOfCombatRecovery(p,w,{},1,20);assert.ok(p.hp>20&&p.spirit>0&&p.stamina===p.maxStamina);
 p.activeChannel={abilityId:'test'};p.spirit=0;updateOutOfCombatRecovery(p,w,{},1,21);assert.equal(p.spirit,0);p.activeChannel=null;
 w.enemies=[foe(p)];updateOutOfCombatRecovery(p,w,{},10,31);assert.equal(p.spirit,0);
 const petOwner=actor(),petWorld=world();petOwner.spirit=0;petOwner.summons=[{id:'active-pet',hp:20,alive:true}];petWorld.enemies=[foe(petOwner,{combatTargetKind:'summon',combatTargetId:'active-pet'})];updateOutOfCombatRecovery(petOwner,petWorld,{},10,20);assert.equal(petOwner.spirit,0,'Pet combat must prevent resting regeneration');
});
test('mixed attacks queue across recovery and failed stamina payments do not advance a sequence',()=>{
 const p=actor(),w=world(),t=now();p.equipment.weapon='oldKnife';assert.ok(requestBasicAttack(p,w,aim,()=>{},t));
 const move=p.combatState.attackMove;updateWeaponCombat(p,w,aim,move.activeStart,t+move.activeStart,()=>{});
 requestHeavyAttack(p,w,aim,()=>{},t+move.activeStart);assert.ok(p.combatState.comboQueuedHeavy);
 updateWeaponCombat(p,w,aim,move.duration,t+move.duration+move.activeStart,()=>{});assert.ok(p.combatState.attacking&&p.combatState.attackMove.comboType==='heavy');assert.equal(p.combatState.attackMove.sequence,'LH');
 const exhausted=actor();exhausted.stamina=0;exhausted.equipment.weapon='oldKnife';exhausted.combatState={comboSequence:'L',comboTimer:.5};assert.equal(requestHeavyAttack(exhausted,w,aim,()=>{},t),false);assert.equal(exhausted.combatState.comboSequence,'L');
});
test('legacy progression/mastery/equipment migrate once; fractional XP and huge grants remain finite',()=>{
 const p=actor('gravecaller');delete p.skillState.combat;delete p.skillState.progressionVersion;p.combatLevel=33;p.skillState.skills.spirit={level:60,xp:83.5,used:true};p.skills={};
 migratePlayer(p);assert.equal(p.combatLevel,33);assert.equal(p.skillState.skills.spirit.level,60);assert.equal(p.skillState.skills.spirit.xp,83.5);assert.equal(p.skillState.skills.scythe.level,60);assert.equal(p.skillState.skills.summoning.level,60);
 migratePlayer(p);assert.equal(p.combatLevel,33);const snapshot=JSON.stringify(p.skillState);assert.equal(JSON.stringify(normalizeProfileSave(sanitizeForSave(p)).skillState),snapshot);
 const entry={level:1,xp:.25};advanceProgression(entry,1e15);assert.ok(entry.level>100&&entry.level<500&&Number.isFinite(entry.xp)&&entry.xp<xpRequired(entry.level));
 const extreme={level:1e12,xp:0};advanceProgression(extreme,Number.MAX_VALUE);assert.ok(Number.isFinite(extreme.level)&&Number.isFinite(extreme.xp));
 const m=actor();grantAbilityMasteryXp(m,'guard',1e15);assert.ok(getAbilityMastery(m,'guard').level>100&&getAbilityMastery(m,'guard').level<500);
});
test('all ability definitions have valid explicit progression destinations',()=>{
 const skills=createNewSkillState().skills;for(const a of ABILITIES){assert.ok(a.progressionCategories.length,a.id);for(const id of a.progressionCategories)assert.ok(skills[id],a.id+':'+id);}
});
test('save clocks preserve summon cooldown time and discard unfinished attack, dodge and charge state',()=>{
 const clock=rebaseCooldownMap({summonWolf:992,summonDemon:1000},1000,2);close(clock.summonWolf,-6);close(clock.summonDemon,2);
 close(rebaseCooldownMap(clock,2,5).summonWolf,-3);close(rebaseCooldownMap({summonWolf:999},undefined,2).summonWolf,2);
 const p=actor();p.cooldownClockSeconds=1000;p.cooldowns={summonDemon:997};p.combatState={attacking:true,comboSequence:'LH',projectiles:[{damage:999}]};p.actionState={dashing:true};p.abilityCharge={progress:1};
 const loaded=normalizeProfileSave(sanitizeForSave(p));close(loaded.cooldownClockSeconds-loaded.cooldowns.summonDemon,3);assert.ok(!loaded.combatState.attacking&&!loaded.actionState.dashing&&!loaded.abilityCharge);assert.ok(p.combatState.attacking,'Saving must not mutate live attacks');
});
test('real party healing and death-triggered pacts qualify support XP on a teammates victory',()=>{
 const healer=actor('waverider'),ally=actor('classless'),w=world(),t=now();ally.id='heal-target';ally.hp=20;healer.coop={players:[ally]};
 healer.skillState.skills.warding.level=30;healer.spiritAwakened=true;unlockActiveAbility(healer,'hydromancerMendingCurrent');assignAbilityToSlot(healer,3,'hydromancerMendingCurrent');
 const e=foe(ally);w.enemies=[e];assert.ok(useAbility(3,healer,w,()=>{},t,aim));assert.ok(ally.hp>20);assert.equal(getCombatLevelProgress(healer).xp,0);
 recordEnemyCombatContribution(e,ally,'blade',100,{source:'weapon'});e.hp=0;grantSharedCombatKillXp(ally,e,50);close(getCombatLevelProgress(healer).xp,25);close(getCombatLevelProgress(ally).xp,50);
 for(const [classId,id]of [['gravecaller','gravecallerDeathEcho'],['thornbinder','thornbinderCorpsebloom']]){
  const caster=actor(classId),killer=actor(),field=world(),target=foe(killer);target.x=360;field.enemies=[target];caster.coop={players:[killer]};caster.spiritAwakened=true;caster.skillState.skills[getAbilityById(id).skill].level=30;unlockActiveAbility(caster,id);assignAbilityToSlot(caster,3,id);
  assert.ok(useAbility(3,caster,field,()=>{},t,aim));assert.equal(getCombatLevelProgress(caster).xp,0);recordEnemyCombatContribution(target,killer,'blade',100,{source:'weapon'});target.hp=0;grantSharedCombatKillXp(killer,target,50);
  close(getCombatLevelProgress(caster).xp,25);assert.ok(getAbilityMastery(caster,id).xp>0);
 }
});
test('all 87 active abilities execute through their real gameplay dispatch and remain finite',()=>{
 const casts=[];for(const a of ABILITIES){
  const p=actor(a.classId||'classless'),w=world(),t=now();p.spiritAwakened=true;p.spirit=p.maxSpirit=10000;p.stamina=p.maxStamina=10000;p.hp=p.maxHp=1000;
  for(const s of Object.values(p.skillState.skills))s.level=100;
  if(a.bloodline)p.bloodline={id:a.bloodline};if(p.lightbringer)p.lightbringer.lumens=3;
  if(a.id==='summonDemon')p.equipment.weapon='demonseedScythe';
  unlockActiveAbility(p,a.id);assignAbilityToSlot(p,3,a.id);w.enemies=[foe(p,{x:300,hp:1e6,maxHp:1e6}),foe(p,{id:'rear',x:270,y:340,hp:1e6,maxHp:1e6})];
  const started=useAbility(3,p,w,()=>{},t,{...aim,ability3Held:true});assert.ok(started,a.id+' dispatch rejected');
  for(let i=1;i<=80;i++){updateCombat(p,w,{...aim,ability3Held:true},1/60,t+i/60,()=>{});updateSummons(1/60,p,w,()=>{},t+i/60);for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);}
  assert.ok([p.hp,p.spirit,p.stamina,...w.enemies.map(e=>e.hp)].every(Number.isFinite),a.id);casts.push({id:a.id,classId:p.classId,started,effects:w.effects.length,summons:p.summons.length});
 }report.abilityCasts=casts;
});
test('nonlinear XP and power simulations for all classes at 1 through extreme levels',()=>{
 for(const classId of Object.keys(CLASS_XP_AFFINITIES))for(const level of [1,10,20,30,50,100,250,500,1000,1e6,1e12]){
  const p=actor(classId);p.skillState.combat.level=level;p.combatLevel=level;
  for(const s of Object.values(p.skillState.skills))s.level=level;
  const a=applyAbilityMastery(p,getAbilityById('guard'));
  const row={classId,level,combatNext:xpRequired(level,XP_CURVES.combat),skillNext:xpRequired(level),enemyXP:enemyXPForLevel(level),power:progressionPower(p,'blade'),lowMasterySpell:calculateAbilityDamage(p,applyAbilityMastery(p,getAbilityById('graveSpark'))),hp:calculateMaxHp(p),stamina:calculateMaxStamina(p),spirit:calculateMaxSpirit(p),guardCost:a.cost};
  for(const value of Object.values(row))if(typeof value==='number')assert.ok(Number.isFinite(value)&&value>=0);
  report.simulations.push(row);
 }
 const p=actor(),ability=applyAbilityMastery(p,getAbilityById('graveSpark')),base=calculateAbilityDamage(p,ability);p.skillState.combat.level=30;p.combatLevel=30;assert.ok(calculateAbilityDamage(p,ability)>base*1.3);
 for(const [id,set]of Object.entries(WEAPON_MOVESETS))set.moves.forEach((move,i)=>{const before=COMBAT_TIMING_BASELINE[id][i];assert.ok(move.duration<before.duration);assert.ok(move.activeStart<before.activeStart);report.timings.push({weapon:id,move:move.id,before,after:{duration:move.duration,startup:move.startup,activeStart:move.activeStart,activeEnd:move.activeEnd,recovery:move.recovery}});});
 const p2=actor(),charged=ABILITIES.find(a=>a.canCharge);beginAbilityCharge(p2,0,charged);assert.ok(p2.abilityCharge.maxChargeTime<charged.maxChargeTime);
});

fs.mkdirSync('docs/progression-overhaul',{recursive:true});
fs.writeFileSync('docs/progression-overhaul/verification.json',JSON.stringify(report,null,2));
console.log(`Passed ${report.checks.length} progression checks; ${report.simulations.length} class/level simulations; ${report.timings.length} measured weapon timings.`);
