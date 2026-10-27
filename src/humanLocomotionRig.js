// Shared presentation-only side gait. Torso, sleeves and weapon grips use the
// same phase, instead of mixing unrelated landmarks from generated frames.
export function usesSideLocomotion(pose, facing) {
  return ['walk','run'].includes(pose?.state) && ['left','right'].includes(facing);
}

export function sideLocomotionTilt(pose, facing) {
  // Side locomotion uses held pixel-art poses, without continuous body rocking.
  return 0;
}

export function locomotionArtFrame(pose){
  if(!['walk','run'].includes(pose?.state))return 0;
  return [1,2,3,0][Math.abs(Math.floor(pose.gaitKey||0))%4];
}

export function sampleSideLocomotionArms(pose, facing, bob = 0) {
  const side = facing === 'left' ? -1 : 1;
  const stride = Math.cos(Math.floor(Number(pose.gaitKey || 0)) * Math.PI / 2);
  bob=Math.round(bob);
  const arm = primary => {
    const far = primary === (facing === 'right');
    const carrying = primary && pose.weaponType && pose.weaponType !== 'unarmed';
    const swing = stride * (far ? 1 : -1) * (carrying ? 1.5 : pose.state === 'run' ? 4 : 3);
    // Keep the resting profile's shoulder volume while the arms swing. Putting
    // both joints almost on the spine hid the sleeves inside the torso and
    // shrank the entire silhouette as soon as east/west locomotion started.
    const female = pose.bodyType === 'female';
    const shoulder = [side * (far ? (female ? 3 : 4) : -(female ? 6 : 7)), -22 + bob];
    // A relaxed bend stays below the shoulder, close to the body throughout.
    // Profile swing mainly travels in depth. A large screen-space sweep
    // folds both sleeves into the chest on the passing step, recreating the
    // skinny frame even with correctly spaced shoulders.
    const elbow = [Math.round(shoulder[0] + side * swing * .15), -14 + bob];
    const hand = [Math.round(shoulder[0] + side * (swing * .35 + 1)), Math.round(-6 + bob - Math.abs(swing) * .35)];
    return {shoulder, elbow, hand, far};
  };
  return {primary:arm(true), support:arm(false), twoHanded:true, weaponAngle:side * .12};
}

// Match the authored south-facing base body's relaxed shoulders and wrists.
// Equipment changes sleeve material, not the character's resting arm pose.
export function sampleRelaxedFrontArms(pose,bob=0){
  const female=pose.bodyType==='female';
  const moving=['walk','run'].includes(pose.state);
  const frame=moving?[1,2,3,0][Math.abs(Math.floor(pose.gaitKey||0))%4]:0;
  const wristY=(female||frame%2===0?-4:-7)+bob;
  const arm=sign=>({
    shoulder:[sign*(female?9:10),-22+bob],
    elbow:[sign*(female?11.5:12),(-22+bob+wristY)/2],
    hand:[sign*13,wristY],far:false
  });
  return {primary:arm(1),support:arm(-1),twoHanded:true,weaponAngle:.2};
}

export function sampleLocomotionArms(pose,facing,bob=0){
  if(['left','right'].includes(facing))return sampleSideLocomotionArms(pose,facing,bob);
  if(facing==='down')return sampleRelaxedFrontArms(pose,bob);
  const side=facing==='up'?-1:1;
  const stride=Math.cos(Number(pose.gaitPhase||0)*Math.PI/2);
  const shoulderWidth=pose.bodyType==='female'?6:7;
  const arm=primary=>{
    const sign=primary?side:-side;
    const travel=stride*(primary?1:-1)*(pose.state==='run'?1.5:1);
    return {shoulder:[sign*shoulderWidth,-22+bob],elbow:[sign*(shoulderWidth+.75),-14+bob+travel*.4],hand:[sign*(shoulderWidth+1.5),-6+bob+travel],far:false};
  };
  return {primary:arm(true),support:arm(false),twoHanded:true,weaponAngle:side*.12};
}
