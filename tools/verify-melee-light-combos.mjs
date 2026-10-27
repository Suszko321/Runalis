import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS} from '../src/data.js';
import {createPlayer} from '../src/player.js';
import {requestBasicAttack,requestHeavyAttack,updateBasicAttackInput,updateWeaponCombat,ensureCombatState,getWeaponTypeFromPlayer} from '../src/combatMoves.js';
import {MELEE_LIGHT_COMBOS} from '../src/meleeLightCombos.js';
import {sampleWeaponAttackPose} from '../src/playerAttackAnimation.js';
import {sampleMeleeRig} from '../src/meleeRig.js';
import {createControllerManager,getControllerInput} from '../src/inputController.js';
import {sanitizeForSave} from '../src/gameSave.js';

const report={checks:[],styles:[],tapSimulations:[],heavyBaseline:0,poseSamples:0};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const aim={combatAimX:1,combatAimY:0,hasAim:true};
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const weaponIds={unarmed:null};
for(const type of Object.keys(MELEE_LIGHT_COMBOS)){
 weaponIds[type]??=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&ITEMS[id].weaponType===type)||`combo-test-${type}`;
 if(type!=='unarmed'&&!ITEMS[weaponIds[type]])ITEMS[weaponIds[type]]={id:weaponIds[type],name:type,slot:'weapon',weaponType:type,baseDamage:8,rarity:'common'};
}
weaponIds.unarmed=null;
const actor=(type,level=1)=>{const p=createPlayer('Combo reviewer');Object.assign(p,{x:400,y:400,dirX:1,dirY:0,stamina:10000,maxStamina:10000});p.equipment.weapon=weaponIds[type];for(const s of Object.values(p.skillState.skills))s.level=level;return p;};
const fixture=(type,level=1)=>({p:actor(type,level),w:world(),time:20});
const step=(f,seconds)=>{for(let left=seconds;left>1e-8;){const dt=Math.min(1/120,left);left-=dt;f.time+=dt;updateWeaponCombat(f.p,f.w,aim,dt,f.time,()=>{});}};
const finish=f=>{for(let i=0;f.p.combatState.attacking&&i<500;i++)step(f,1/120);assert.equal(f.p.combatState.attacking,false);};

test('every style has three distinct light strikes from proficiency one, with a stronger finisher',()=>{
 for(const [type,profile] of Object.entries(MELEE_LIGHT_COMBOS))for(const level of [1,5,20,99]){
  const f=fixture(type,level),moves=[];
  for(let index=0;index<3;index++){
   assert.ok(requestBasicAttack(f.p,f.w,aim,()=>{},f.time),type+level);
   const move=f.p.combatState.attackMove;moves.push(move);assert.equal(move.lightComboStep,index+1);assert.equal(move.comboType,'light');assert.equal(move.kind==='projectile',false);
   assert.ok(move.activeStart>0&&move.activeEnd>move.activeStart&&move.duration>move.activeEnd);assert.ok(move.recovery>=.09);
   finish(f);
  }
  assert.equal(new Set(moves.map(m=>m.id)).size,3);assert.equal(moves[2].sequence,'LLL');assert.equal(moves[2].finisher,true);assert.ok(moves[2].damageMultiplier>moves[1].damageMultiplier);
  if(level===1)report.styles.push({type,moves:moves.map(m=>({name:m.name,kind:m.kind,family:m.attackFamily,duration:m.duration})),restartDelay:profile.restartDelay});
 }
});
test('every melee weapon in the item catalogue executes its complete light chain',()=>{
 report.catalogueLightWeapons=0;
 for(const [id,item] of Object.entries(ITEMS)){
  if(item.slot!=='weapon'||id.startsWith('combo-test-'))continue;
  const f=fixture('sword');f.p.equipment.weapon=id;const type=getWeaponTypeFromPlayer(f.p);
  if(['bow','crossbow','spiritFocus','eldritch'].includes(type))continue;
  assert.ok(MELEE_LIGHT_COMBOS[type],'Missing melee style for '+id);
  for(let stepIndex=0;stepIndex<3;stepIndex++){assert.ok(requestBasicAttack(f.p,f.w,aim,()=>{},f.time),id);assert.equal(f.p.combatState.attackMove.lightComboStep,stepIndex+1,id);finish(f);}
  assert.ok(f.p.combatState.lightComboRecoveryUntil>f.time,id);report.catalogueLightWeapons++;
 }
 assert.ok(report.catalogueLightWeapons>=20);
});
test('buffering continues hits one and two, but never queues a fourth strike through recovery',()=>{
 for(const [type,profile] of Object.entries(MELEE_LIGHT_COMBOS)){
  const f=fixture(type);assert.ok(requestBasicAttack(f.p,f.w,aim,()=>{},f.time));
  for(let index=1;index<=2;index++){
   const move=f.p.combatState.attackMove;step(f,move.activeStart+.01);assert.equal(requestBasicAttack(f.p,f.w,aim,()=>{},f.time),false);assert.equal(f.p.combatState.comboQueued,true);
   const id=f.p.combatState.attackId;while(f.p.combatState.attackId===id)step(f,1/120);assert.equal(f.p.combatState.attackMove.lightComboStep,index+1);
  }
  step(f,f.p.combatState.attackMove.activeStart+.01);requestBasicAttack(f.p,f.w,aim,()=>{},f.time);assert.equal(f.p.combatState.comboQueued,false);
  finish(f);const until=f.p.combatState.lightComboRecoveryUntil,stamina=f.p.stamina,id=f.p.combatState.attackId;
  assert.ok(until-f.time>=profile.restartDelay-1e-6);assert.equal(requestBasicAttack(f.p,f.w,aim,()=>{},until-.001),false);assert.equal(requestHeavyAttack(f.p,f.w,aim,()=>{},until-.001),false);assert.equal(f.p.stamina,stamina);
  step(f,profile.restartDelay+.01);assert.equal(f.p.combatState.attackId,id);assert.ok(requestBasicAttack(f.p,f.w,aim,()=>{},f.time));assert.equal(f.p.combatState.attackMove.lightComboStep,1);
 }
});
test('rapid RB taps and direct attack requests remain capped by animation and finisher recovery',()=>{
 for(const type of Object.keys(MELEE_LIGHT_COMBOS))for(const level of [1,99]){
  const f=fixture(type,level),manager=createControllerManager(),slot=manager.slots[0],starts=[];slot.connected=true;let previousId=0;
  for(let frame=0;frame<1200;frame++){
   slot.prevButtons=slot.buttons;slot.buttons=[];slot.buttons[5]=frame%5===0;const input={...getControllerInput(manager),...aim};f.time+=1/120;
   updateBasicAttackInput(f.p,f.w,input,1/120,f.time,()=>{});updateWeaponCombat(f.p,f.w,input,1/120,f.time,()=>{});
   const state=f.p.combatState;if(state.attackId!==previousId){previousId=state.attackId;starts.push({at:f.time,step:state.attackMove.lightComboStep,duration:state.attackMove.duration});}
  }
  assert.ok(starts.length>=9);assert.ok(starts.length<35,type+' mashing is too fast');
  starts.forEach((entry,i)=>assert.equal(entry.step,i%3+1,type));
  for(let i=3;i<starts.length;i+=3)assert.ok(starts[i].at-starts[i-1].at>=starts[i-1].duration+MELEE_LIGHT_COMBOS[type].restartDelay-.025,type+' skipped recovery');
  report.tapSimulations.push({type,level,bumperTaps:240,startedAttacks:starts.length});
  const direct=fixture(type,level);for(let frame=0;frame<600;frame++){direct.time+=1/120;requestBasicAttack(direct.p,direct.w,aim,()=>{},direct.time);updateWeaponCombat(direct.p,direct.w,aim,1/120,direct.time,()=>{});}assert.ok(direct.p.combatState.attackId<20,type+' direct requests skipped recovery');
 }
});
test('idle resets, insufficient stamina and weapon changes cannot grant or bypass a finisher',()=>{
 const f=fixture('sword');requestBasicAttack(f.p,f.w,aim,()=>{},f.time);finish(f);step(f,.83);requestBasicAttack(f.p,f.w,aim,()=>{},f.time);assert.equal(f.p.combatState.attackMove.lightComboStep,1);finish(f);
 f.p.stamina=0;assert.equal(requestBasicAttack(f.p,f.w,aim,()=>{},f.time),false);assert.equal(f.p.combatState.lightComboIndex,1);f.p.stamina=10000;requestBasicAttack(f.p,f.w,aim,()=>{},f.time);assert.equal(f.p.combatState.attackMove.lightComboStep,2);finish(f);
 f.p.equipment.weapon=weaponIds.dagger;requestBasicAttack(f.p,f.w,aim,()=>{},f.time);assert.equal(f.p.combatState.attackMove.lightComboStep,1);assert.equal(f.p.combatState.attackMove.sequence,'L');finish(f);
 requestBasicAttack(f.p,f.w,aim,()=>{},f.time);finish(f);requestBasicAttack(f.p,f.w,aim,()=>{},f.time);finish(f);f.p.equipment.weapon=weaponIds.sword;assert.equal(requestBasicAttack(f.p,f.w,aim,()=>{},f.time+.01),false);
 step(f,.3);assert.ok(requestBasicAttack(f.p,f.w,aim,()=>{},f.time));assert.equal(f.p.combatState.attackMove.lightComboStep,1);
 assert.equal('combatState' in sanitizeForSave(f.p),false);
});
test('each strike hits each target only once and uses the correct forward arc or thrust',()=>{
 for(const type of Object.keys(MELEE_LIGHT_COMBOS)){
  const f=fixture(type);const foe=(id,x,y)=>({id,kind:'rat',name:'Target',x,y,hp:1e7,maxHp:1e7,radius:4,r:4,defence:0});
  const front=foe('front',424,400),rear=foe('rear',370,400),far=foe('far',580,400);f.w.enemies=[front,rear,far];
  for(let index=0;index<3;index++){
   f.p.x=400;f.p.y=400;front.x=424;front.y=400;assert.ok(requestBasicAttack(f.p,f.w,aim,()=>{},f.time));const move=f.p.combatState.attackMove,before=front.hp;let damages=0,last=before;
   while(f.p.combatState.attacking){step(f,1/120);if(front.hp!==last){damages++;last=front.hp;}}
   assert.equal(damages,1,type+' repeated hit on step '+(index+1));assert.equal(rear.hp,1e7);assert.equal(far.hp,1e7);assert.ok(front.hp<before);
  }
 }
});
test('poses follow authored cuts, thrusts and slams in every facing without invalid joints',()=>{
 for(const [type,profile] of Object.entries(MELEE_LIGHT_COMBOS))for(const move of profile.moves)for(const [facing,x,y] of [['down',0,1],['up',0,-1],['left',-1,0],['right',1,0]])for(let i=0;i<=30;i++){
  const pose={...sampleWeaponAttackPose(move,type,move.duration*i/30,{x,y}),state:'attack',attacking:true,weaponType:type};assert.equal(pose.family,move.attackFamily);
  for(const value of Object.values(pose))if(typeof value==='number')assert.ok(Number.isFinite(value));
  if(type!=='unarmed'){const rig=sampleMeleeRig(pose,facing);for(const arm of [rig.primary,rig.support])for(const joint of [arm.shoulder,arm.elbow,arm.hand])assert.ok(joint.every(Number.isFinite));}
  report.poseSamples++;
 }
 const spear=MELEE_LIGHT_COMBOS.spear.moves;assert.equal(spear[0].kind,'line');assert.equal(spear[1].kind,'line');assert.equal(spear[2].kind,'arc');
});
test('existing heavy move values are unchanged and holding RB still charges a heavy attack',()=>{
 for(const baseline of JSON.parse(fs.readFileSync('docs/melee-light-combos/heavy-baseline.json','utf8'))){
  const p=createPlayer('Heavy regression');p.equipment.weapon=baseline.id;p.stamina=p.maxStamina=10000;for(const s of Object.values(p.skillState.skills))s.level=baseline.level;
  requestHeavyAttack(p,{effects:[],enemies:[]},aim,()=>{},1);assert.deepEqual(p.combatState.attackMove,baseline.move,baseline.type);report.heavyBaseline++;
 }
 for(const type of Object.keys(MELEE_LIGHT_COMBOS)){
  const f=fixture(type);let attacked=false;for(let frame=0;frame<180&&!attacked;frame++){f.time+=1/120;updateBasicAttackInput(f.p,f.w,{...aim,attackPressed:frame===0,attackHeld:true},1/120,f.time,()=>{});attacked=f.p.combatState.attacking;}
  assert.ok(attacked);assert.equal(f.p.combatState.attackMove.comboType,'heavy',type);
 }
 const a=fixture('sword'),b=fixture('sword');ensureCombatState(a.p).lightComboRecoveryUntil=100;assert.ok(requestBasicAttack(b.p,b.w,aim,()=>{},20),'Co-op actors have independent recovery');
});
fs.mkdirSync('docs/melee-light-combos',{recursive:true});fs.writeFileSync('docs/melee-light-combos/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,groups:report.checks.length,styles:report.styles.length,catalogueLightWeapons:report.catalogueLightWeapons,tapSimulations:report.tapSimulations.length,heavyBaseline:report.heavyBaseline,poseSamples:report.poseSamples}));
