import assert from 'node:assert/strict';
import {updateOutOfCombatRecovery as update, HEALTH_RECOVERY_RATE, SUMMON_HEALTH_RECOVERY_RATE} from '../src/outOfCombatRecovery.js';
import {createPlayer, chooseClass, migratePlayer} from '../src/player.js';
import {updateCombat, updateSummons, useAbility} from '../src/combat.js';
import {unlockActiveAbility, assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';

const actor=()=>({id:'hero',hp:40,maxHp:100,stamina:0,maxStamina:100,combatState:{},summons:[]});
const pet=(extra={})=>({id:'pet',hp:30,maxHp:150,alive:true,...extra});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const test=(name,fn)=>{fn();console.log('PASS '+name);};

test('all summon kinds and morphs recover at one third the player percentage rate',()=>{
 assert.equal(SUMMON_HEALTH_RECOVERY_RATE,HEALTH_RECOVERY_RATE/3);
 const p=actor();
 for(const kind of ['wolf','miniDemon','lich','greaterLich','thornbeast','eldritchHorror'])
  for(const summonMorph of ['base','acolyte','deathknight','fae'])p.summons.push(pet({kind,summonMorph}));
 p.summons.push(pet({legendaryTemporary:true,expiresAt:200}),pet({techniqueTemporary:true,expiresAt:200}));
 update(p,{}, {},1,1);close(p.hp,60);
 for(const s of p.summons)close(s.hp,40);
 p.hp=p.maxHp;update(p,{}, {},1,2);for(const s of p.summons)close(s.hp,50);
 update(p,{}, {},100,102);for(const s of p.summons)assert.equal(s.hp,s.maxHp);
 assert.equal(p.abilityMastery,undefined,'Recovery must not generate mastery');
});
test('incoming and outgoing companion combat pauses recovery and respects the six second delay',()=>{
 for(const outgoing of [false,true]){
  const p=actor(),s=pet();p.summons=[s];
  const e={id:'foe',hp:20,combatTargetKind:'summon',combatTargetId:s.id};
  if(outgoing){e.combatTargetKind='player';e.combatTargetId='another-player';s.targetEnemyId=e.id;}
  const w={enemies:[e]};update(p,w,{},10,10);close(s.hp,30);close(p.hp,40);
  e.dead=true;update(p,w,{},5.5,15.5);close(s.hp,30);
  update(p,w,{},1,16.5);close(s.hp,35);close(p.hp,50);
 }
});
test('unattributed summon damage resets rest even when the player has full health',()=>{
 const p=actor(),s=pet();p.hp=p.maxHp;p.summons=[s];update(p,{}, {},1,1);close(s.hp,40);
 s.hp-=9;update(p,{}, {},1,2);close(s.hp,31);
 update(p,{}, {},6,8);close(s.hp,31);update(p,{}, {},1,9);close(s.hp,41);
});
test('dead, dismissed and expired summons never heal or revive, and PvP and owner combat prevent recovery',()=>{
 const p=actor();p.summons=[pet({hp:0}),pet({dead:true}),pet({alive:false}),pet({dismissed:true}),pet({expiresAt:1})];
 update(p,{}, {},1,2);assert.deepEqual(p.summons.map(s=>s.hp),[0,30,30,30,30]);
 for(const reason of ['pvp','attacking','downed','dead','inactive']){
  const a=actor(),s=pet();a.summons=[s];const w={};
  if(reason==='pvp')w.mode='pvpArena';else if(reason==='attacking')a.combatState.attacking=true;
  else if(reason==='downed')a.lifeState='downed';else if(reason==='dead')a.hp=0;else a.active=false;
  update(a,w,{},10,10);close(s.hp,30);
 }
});
test('party recovery stays independent and summon recovery is frame rate independent',()=>{
 const p=actor(),q=actor();q.id='ally';p.summons=[pet()];q.summons=[pet({id:'ally-pet'})];
 const w={enemies:[{hp:20,combatTargetKind:'summon',combatTargetId:'pet'}]};
 update(p,w,{},1,1);update(q,w,{},1,1);close(p.summons[0].hp,30);close(q.summons[0].hp,40);
 const coarse=actor(),fine=actor();coarse.summons=[pet()];fine.summons=[pet()];
 update(coarse,{}, {},2,2);for(let i=0;i<120;i++)update(fine,{}, {},1/60,(i+1)/60);
 close(coarse.summons[0].hp,fine.summons[0].hp);
});
test('real summon updates stack native Briar Bloom healing with rest recovery for original and Fae summons',()=>{
 for(const morph of ['base','fae']){
  const p=createPlayer('Recovery integration');chooseClass(p,'thornbinder');
  for(const skill of Object.values(p.skillState.skills))skill.level=20;migratePlayer(p);
  p.x=260;p.y=320;p.hp=p.maxHp;p.spirit=p.maxSpirit=1000;p.spiritAwakened=true;
  const id='thornbinderSummonElderThornbeast';unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;
  assert.ok(assignAbilityToSlot(p,0,id).ok);if(morph==='fae')assert.ok(selectAbilityMorph(p,id,morph).ok);
  const w={mode:'overworld',enemies:[],objects:[],effects:[]},now=performance.now()/1000;
  const messages=[];assert.ok(useAbility(0,p,w,message=>messages.push(message),now,{combatAimX:1,combatAimY:0,hasAim:true}),messages.join('; '));
  p.visualAction=null;p.summons[0].hp=p.summons[0].maxHp*.25;const s=p.summons[0],before=s.hp;
  p.thornbinder={briarBloomUntil:now+10,briarBloomNextTickAt:0,briarBloomRadius:1000,briarBloomHealingScalar:1};
  const mastery=JSON.stringify(p.abilityMastery);
  updateCombat(p,w,{},1,now+1,()=>{});updateSummons(1,p,w,()=>{},now+1);
  close(s.hp,before+s.maxHp*SUMMON_HEALTH_RECOVERY_RATE+1);
  assert.equal(JSON.stringify(p.abilityMastery),mastery);
 }
});
console.log('Summon recovery verification complete.');
