import assert from 'node:assert/strict';
import {restingWeaponGrip,humanFrame} from '../src/spriteArt.js';
import {sampleMeleeRig} from '../src/meleeRig.js';
import {sampleArmoredArms} from '../src/meleeArmArt.js';
import {shieldGrip,weaponBehindBody,shieldBehindBody} from '../src/handedness.js';
import {ITEMS} from '../src/data.js';
import {getGearVisualProfile} from '../src/gearVisualStyle.js';
// Independently measured left-wrist landmarks from the source body atlases.
const landmarks={
 male:{down:[[13,-4],[13,-7],[13,-4],[13,-7]],right:[[8,-7],[10,-9],[8,-7],[10,-9]],up:[[-14,-5],[-14,-7],[-14,-5],[-14,-7]],left:[[8,-6],[11,-6],[8,-6],[11,-6]]},
 female:{down:[[13,-4],[13,-4],[13,-4],[13,-4]],right:[[10,-7],[13,-6],[10,-7],[-11,-7]],up:[[-14,-5],[-14,-5],[-14,-5],[-14,-5]],left:[[3,-6],[9,-7],[3,-6],[-11,-7]]}
};
let samples=0,weapons=0;
for(const [id,item] of Object.entries(ITEMS).filter(([,v])=>v.slot==='weapon')){
 const weaponType=getGearVisualProfile(id,item).weaponType;if(weaponType==='unarmed')continue;weapons++;
 for(const bodyType of ['male','female'])for(const facing of ['down','right','up','left'])for(const state of ['idle','walk','run','block'])for(let gaitKey=0;gaitKey<4;gaitKey++){
  const actor={bodyType,equipment:{weapon:id}},pose={weaponType,state,gaitKey};
  const before=JSON.stringify(actor);
  const upperFrame=['walk','run'].includes(state)&&['left','right'].includes(facing)?0:humanFrame(pose);
  assert.deepEqual(restingWeaponGrip(actor,pose,facing).hand,landmarks[bodyType][facing][upperFrame],`${id}/${bodyType}/${facing}/${state}/${gaitKey} switched arms`);
  assert.equal(JSON.stringify(actor),before);samples++;
 }
}
for(const facing of ['down','right','up','left']){
 const rig=sampleMeleeRig({weaponType:'sword'},facing);
 // The west-facing near shoulder projects slightly in front of the torso.
 assert.equal(Math.sign(rig.primary.shoulder[0]),['up','left'].includes(facing)?-1:1,'Attack must originate at left shoulder');
 assert.equal(Math.sign(shieldGrip(facing)[0]),facing==='up'?1:-1,'Shield must stay in right hand');
}
assert.equal(weaponBehindBody('right'),true);assert.equal(weaponBehindBody('left'),false);
assert.equal(shieldBehindBody('right'),false);assert.equal(shieldBehindBody('left'),true);
for(const bodyType of ['male','female'])for(const facing of ['left','right'])for(const state of ['idle','walk','run'])for(let gaitKey=0;gaitKey<4;gaitKey++){
 const actor={bodyType},pose={state,gaitKey,weaponType:'sword'};
 const rig=sampleArmoredArms(actor,pose,facing);
 const far=facing==='right'?rig.primary:rig.support,near=facing==='right'?rig.support:rig.primary;
 assert.equal(far.far,true);assert.equal(near.far,false);
 assert.ok(Math.abs(far.shoulder[0])<=1,'Profile far shoulder must remain behind torso');
 assert.ok(Math.abs(far.elbow[0])<Math.abs(far.hand[0]),'Far elbow must stay tucked');
 assert.deepEqual(rig.primary.hand,restingWeaponGrip(actor,pose,facing).hand,'Profile correction moved the weapon grip');
}
console.log({weapons,samples,anatomicalOwnership:'passed',shieldDepth:'passed'});
