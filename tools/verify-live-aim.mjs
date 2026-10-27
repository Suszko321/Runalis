import assert from 'node:assert/strict';
import {tempoFixture} from './benchmark-combat-tempo.mjs';
import {resolveActorCombatAim,writeCombatAimToInput,applyCombatAimFacing} from '../src/combatAim.js';
import {updateAbilityInput} from '../src/combat.js';
import {updateBasicAttackInput} from '../src/combatMoves.js';
const checks=[];
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
test('right stick overrides movement, neutral aim falls back to movement, and no input retains direction',()=>{
 const p={x:400,y:400,dirX:1,dirY:0,abilityCharge:{active:true,aimX:1,aimY:0}},input={};
 let aim=resolveActorCombatAim(p,{rightStickAimX:0,rightStickAimY:-1,moveX:1,moveY:0});near(aim.y,-1);
 writeCombatAimToInput(input,p,aim);near(resolveActorCombatAim(p,input).y,-1);
 aim=resolveActorCombatAim(p,{rightStickActive:true,rightStickAimX:0,rightStickAimY:0,moveX:-1,moveY:0});near(aim.x,-1);
 writeCombatAimToInput(input,p,aim);assert(!input.rightStickActive);near(input.rightStickAimY,0);
 p.abilityCharge.aimX=aim.x;p.abilityCharge.aimY=aim.y;near(resolveActorCombatAim(p,{}).x,-1);
});
test('mouse and screen touch retain their real target for aimed abilities',()=>{
 const p={x:400,y:400,dirX:1,dirY:0};
 for(const mobile of [false,true]) {
  const aim=resolveActorCombatAim(p,{mobile,mouseAimActive:true,mouseWorldX:400,mouseWorldY:900,moveX:1}),input={};
  near(aim.y,1);assert.equal(aim.source,mobile?'touch':'mouse');writeCombatAimToInput(input,p,aim);
  near(input.mouseWorldY,900);assert(applyCombatAimFacing(p,aim,{onlyExplicitAim:true}));near(p.dirY,1);
 }
});
test('real charged Water Torrent steers through all directions while held, then releases in the latest direction',()=>{
 for(const mobile of [false,true]) {
  const c=tempoFixture('hydromancerWaterTorrent'),input={...c.input,ability0Pressed:true,mouseAimActive:true,mobile,mouseWorldX:600,mouseWorldY:400};
  assert(updateAbilityInput(c.p,c.w,input,0,c.now(),()=>{}));
  for(const [x,y] of [[400,200],[200,400],[400,600]]) {
   input.ability0Pressed=false;input.mouseWorldX=x;input.mouseWorldY=y;
   updateAbilityInput(c.p,c.w,input,.02,c.now()+.02,()=>{});
   near(c.p.abilityCharge.aimX,(x-400)/200);near(c.p.abilityCharge.aimY,(y-400)/200);
  }
  assert(updateAbilityInput(c.p,c.w,{...input,ability0Held:false,ability0Released:true},0,c.now()+.1,()=>{}));
  assert(!c.p.abilityCharge);near(c.p.lastCombatAimY,1);
 }
});
test('controller charged abilities keep steering through normalized input and return to movement aim',()=>{
 const c=tempoFixture('hydromancerWaterTorrent'),input={...c.input,ability0Pressed:true};
 for(const [i,raw] of [{rightStickAimX:0,rightStickAimY:-1,moveX:1},{rightStickAimX:-1,rightStickAimY:0,moveY:1},{moveX:0,moveY:1}].entries()) {
  const aim=resolveActorCombatAim(c.p,raw);writeCombatAimToInput(input,c.p,aim);input.ability0Pressed=i===0;
  assert(updateAbilityInput(c.p,c.w,input,.02,c.now()+i*.02,()=>{}));
  near(c.p.abilityCharge.aimX,aim.x);near(c.p.abilityCharge.aimY,aim.y);
 }
 near(c.p.abilityCharge.aimY,1);
});
test('held heavy weapon attacks track the latest mouse aim',()=>{
 const c=tempoFixture('oathkeeperOathStrike'),input={mouseAimActive:true,mouseWorldX:600,mouseWorldY:400,attackPressed:true,attackHeld:true};
 updateBasicAttackInput(c.p,c.w,input,.02,c.now(),()=>{});assert(c.p.combatState.heavyChargeActive);
 input.attackPressed=false;input.mouseWorldX=400;input.mouseWorldY=600;
 updateBasicAttackInput(c.p,c.w,input,.02,c.now()+.02,()=>{});near(c.p.combatState.heavyChargeAimY,1);
});
console.log(JSON.stringify({checks:checks.length}));
