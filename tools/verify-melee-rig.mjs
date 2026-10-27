import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WEAPON_MOVESETS} from '../src/combatMoves.js';
import {sampleWeaponAttackPose} from '../src/playerAttackAnimation.js';
import {sampleMeleeRig,usesMeleeRig} from '../src/meleeRig.js';
let samples=0,moves=0;
const sets={...WEAPON_MOVESETS,dagger:WEAPON_MOVESETS.sword,axe:WEAPON_MOVESETS.sword,mace:WEAPON_MOVESETS.staff,hammer:WEAPON_MOVESETS.staff,spear:WEAPON_MOVESETS.staff};
for(const [type,set] of Object.entries(sets)){
 for(const state of ['idle','walk','run','block','hit','death'])assert.equal(usesMeleeRig({weaponType:type,state}),false,`${type}: combat arms leaked into ${state}`);
 if(!usesMeleeRig({weaponType:type,state:'attack'}))continue;
 for(const move of set.moves){moves++;
  for(const [facing,x,y] of [['down',0,1],['right',1,0],['up',0,-1],['left',-1,0]]){
   let previous;
   for(let i=0;i<=240;i++){
    const pose={...sampleWeaponAttackPose(move,type,move.duration*i/240,{x,y}),weaponType:type,state:'attack',attacking:true};
    const rig=sampleMeleeRig(pose,facing);
    if(facing==='left')assert.ok(rig.primary.hand[0]<=3.01,`${move.id}: west-facing wrist swung behind the torso`);
    for(const [name,arm] of [['primary',rig.primary],['support',rig.support]]){
     const length=rig.twoHanded?(name==='support'?11:10):9;
     assert.ok(Math.abs(Math.hypot(arm.elbow[0]-arm.shoulder[0],arm.elbow[1]-arm.shoulder[1])-length)<.001);
     assert.ok(Math.abs(Math.hypot(arm.hand[0]-arm.elbow[0],arm.hand[1]-arm.elbow[1])-length)<.001);
    }
    if(rig.twoHanded){
     const expected=[rig.primary.hand[0]-Math.sin(rig.weaponAngle)*5,rig.primary.hand[1]+Math.cos(rig.weaponAngle)*5];
     assert.ok(Math.hypot(rig.support.hand[0]-expected[0],rig.support.hand[1]-expected[1])<.001,`${move.id}: support hand detached`);
    }
    if(previous)assert.ok(Math.hypot(rig.primary.hand[0]-previous.primary.hand[0],rig.primary.hand[1]-previous.primary.hand[1])<3,`${move.id}: wrist discontinuity`);
    previous=rig;samples++;
   }
   const rest=sampleMeleeRig({weaponType:type},facing);
   if(!rest.twoHanded)assert.ok(Math.abs(rest.primary.elbow[0]-rest.primary.shoulder[0])<5,`${type}: elbow flares outward at the recovery pose`);
   assert.ok(Math.hypot(previous.primary.hand[0]-rest.primary.hand[0],previous.primary.hand[1]-rest.primary.hand[1])<.001,`${move.id}: recovery did not return to grip`);
  }
 }
}
const sword=WEAPON_MOVESETS.sword.moves;
const first=sampleWeaponAttackPose(sword[0],'sword',sword[0].activeEnd,{x:1,y:0});
const reverse=sampleWeaponAttackPose(sword[1],'sword',sword[1].activeEnd,{x:1,y:0});
assert.ok(first.weaponRotation*reverse.weaponRotation<0,'Second sword strike must reverse the first arc');
const report={date:new Date().toISOString(),moves,samples,limbLengths:'passed',supportGrip:'passed',wristContinuity:'passed',recovery:'passed'};
fs.writeFileSync(new URL('../docs/visual-production/melee-rig-checks.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
