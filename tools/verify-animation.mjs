import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ABILITIES} from '../src/data.js';
import {WEAPON_MOVESETS} from '../src/combatMoves.js';
import {getSignatureAbilityProfile} from '../src/animationProfiles.js';
import {getHumanAnimationPose} from '../src/playerAnimationController.js';
import {sampleWeaponAttackPose,sampleSignatureAbilityPose,sampleCastReleasePose} from '../src/playerAttackAnimation.js';
const directions=[{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}];
let moves=0,samples=0,signature=0,fallback=0;
function finite(pose,label){for(const [key,value] of Object.entries(pose))if(typeof value==='number')assert.ok(Number.isFinite(value),`${label}: ${key}`);samples++;}
function settled(pose,label){for(const [key,value] of Object.entries(pose))if(typeof value==='number'&&/Offset|Rotation|armSwing|^step$|torsoCommitment/.test(key))assert.ok(Math.abs(value)<.00001,`${label} did not settle: ${key}=${value}`);}
for(const [type,set] of Object.entries(WEAPON_MOVESETS))for(const move of set.moves){
  const before=JSON.stringify(move);moves++;
  for(const dir of directions){
    let previous;
    for(let i=0;i<=240;i++){
      const pose=sampleWeaponAttackPose(move,type,move.duration*i/240,dir);
      finite(pose,move.id);
      if(previous)for(const key of ['rootOffsetX','rootOffsetY','weaponRotation'])assert.ok(Math.abs(pose[key]-previous[key])<2,`${move.id} discontinuity: ${key}`);
      previous=pose;
    }
    settled(previous,move.id);
  }
  assert.equal(JSON.stringify(move),before);
}
for(const ability of ABILITIES){
  const profile=getSignatureAbilityProfile(ability.id),duration=profile?.duration||.6;
  profile?signature++:fallback++;
  const action={abilityId:ability.id,kind:/summon/i.test(ability.id)?'summon':/guard|ward|aegis|oath/i.test(ability.id)?'guard':'cast',startedAt:0,duration};
  const before=JSON.stringify(action);
  for(const dir of directions){
    let end;
    for(let i=0;i<=240;i++){
      end=sampleSignatureAbilityPose(action,duration*i/240,ability.classId,'staff',dir)||sampleCastReleasePose(action,duration*i/240,ability.classId,dir);
      finite(end,ability.id);
      const actor={hp:100,classId:ability.classId,equipment:{},dirX:dir.x,dirY:dir.y,visualAction:action};
      finite(getHumanAnimationPose(actor,{now:duration*i/240}),ability.id+' composed actor');
    }
    settled(end,ability.id);
  }
  assert.equal(JSON.stringify(action),before);
}
const report={date:new Date().toISOString(),weaponMoves:moves,abilities:ABILITIES.length,signatureProfiles:signature,genericProfiles:fallback,directions:4,samples,finiteValues:'passed',weaponContinuity:'passed',recoveryEndpoints:'passed',inputsUnchanged:'passed',visualQuality:'Requires live review; numerical checks do not certify artwork'};
fs.writeFileSync(new URL('../docs/visual-production/animation-checks.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
