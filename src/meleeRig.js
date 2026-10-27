// Shared wrist and elbow coordinates for the body and held weapon. Visual only.
import {weaponShoulderSide} from './handedness.js';
const TYPES = new Set(['sword','dagger','axe','mace','hammer','spear','scythe','staff']);
export function usesMeleeRig(pose={}) {
  // Rest and locomotion use the original authored arms. Articulation belongs
  // only to combat actions, never to the character's everyday stance.
  if(pose.weaponType==='staff'&&pose.state!=='attack')return false;
  return TYPES.has(pose.weaponType) && ['attack','abilityAttack','heavyCharge','charge','signature'].includes(pose.state);
}
export function solveArm(shoulder, target, bend=1, length=9) {
  const dx=target[0]-shoulder[0],dy=target[1]-shoulder[1];
  const distance=Math.max(.001,Math.hypot(dx,dy)),reach=Math.min(length*2-.01,distance);
  const ux=dx/distance,uy=dy/distance,hand=[shoulder[0]+ux*reach,shoulder[1]+uy*reach];
  const height=Math.sqrt(Math.max(0,length*length-reach*reach/4));
  return {shoulder,elbow:[shoulder[0]+ux*reach/2-uy*height*bend,shoulder[1]+uy*reach/2+ux*height*bend],hand};
}
export function sampleMeleeRig(pose={},facing='down',bob=0) {
  const side=weaponShoulderSide(facing);
  const turn=Number(pose.weaponRotation||0);
  const profile=facing==='left'||facing==='right';
  const shoulder=[facing==='left'?-2:side*(profile?1:8),-22+bob];
  const supportShoulder=[-side*(profile?(facing==='right'?5:1):8),-22+bob];
  const angle=turn*.95;
  const twoHanded=pose.twoHanded||['scythe','spear','hammer','staff'].includes(pose.weaponType);
  const reach=pose.family==='thrust'?Math.min(5,Math.abs(pose.weaponGripOffsetX||0)+Math.abs(pose.weaponGripOffsetY||0)):0;
  const sway=pose.attacking?0:Number(pose.armSwing||0)*.35;
  // Match the compact authored body: the old 24px arms had to fold sharply
  // outward to reach a wrist only 15px below the shoulder.
  // West-facing wrists sit beside the torso, rather than behind its trailing edge.
  const restingWristX=facing==='left'?3:side*12;
  const vx=restingWristX+side*reach-shoulder[0],vy=17;
  const target=[shoulder[0]+vx*Math.cos(angle)-vy*Math.sin(angle),shoulder[1]+vx*Math.sin(angle)+vy*Math.cos(angle)-sway];
  let weaponAngle=turn*1.8+side*.3;
  if(pose.family==='slam')weaponAngle=side*.3+turn*1.2+side*Number(pose.torsoCommitment||0)*1.3;
  if(pose.family==='thrust'){
    const [dx,dy]={down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]}[facing];
    const commitment=Math.min(1,Math.max(0,pose.torsoCommitment||0));
    target[0]=restingWristX+dx*7*commitment;target[1]=-5+bob+(dy*6-3)*commitment;
    weaponAngle=side*.3+(Math.atan2(dy,dx)+Math.PI/2-side*.3)*commitment;
  }
  const blunt=['mace','hammer'].includes(pose.weaponType)&&['anticipation','strike','followThrough','settle'].includes(pose.phase);
  if(blunt){
    const fallback={down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]}[facing]||[1,0];
    const dx=pose.attackAimX??fallback[0],dy=pose.attackAimY??fallback[1];
    const angle=Math.atan2(dy,dx)+Math.PI/2,aim=Math.atan2(Math.sin(angle),Math.cos(angle)),backhand=pose.family==='maceBackhand',slam=['slam','maceSlam'].includes(pose.family);
    const rest=side*.3,windup=slam?(dy<-.3?.7:dx<-.3?.65:-.65):aim+(backhand?.85:-1.05);
    const contact=aim+(backhand?-.16:.16),follow=contact+(backhand?-.25:.25),u=Math.max(0,Math.min(1,pose.phaseProgress||0));
    const restHand=[restingWristX,-5+bob],loaded=[facing==='left'?3:side*7,-29+bob],hitHand=[facing==='left'?Math.min(3,side*10+dx*7):side*10+dx*7,-8+dy*4+bob];
    let fromAngle,toAngle,fromHand,toHand;
    if(pose.phase==='anticipation'){fromAngle=rest;toAngle=windup;fromHand=restHand;toHand=loaded;}
    else if(pose.phase==='strike'){fromAngle=windup;toAngle=contact;fromHand=loaded;toHand=hitHand;}
    else if(pose.phase==='followThrough'){fromAngle=contact;toAngle=follow;fromHand=hitHand;toHand=[hitHand[0]+dx*2,hitHand[1]+dy*2];}
    else{fromAngle=follow;toAngle=rest;fromHand=hitHand;toHand=restHand;}
    weaponAngle=fromAngle+(toAngle-fromAngle)*u;
    target[0]=fromHand[0]+(toHand[0]-fromHand[0])*u;target[1]=fromHand[1]+(toHand[1]-fromHand[1])*u;
  }
  if(facing==='left'&&pose.family!=='thrust'&&!blunt){
    // The sword rotates through its arc while the wrist sweeps in front of the
    // chest. Rotating the wrist around the shoulder sent half the west-facing
    // swing behind the character, even when the blade pointed forward.
    target[0]=restingWristX-Math.abs(Math.sin(angle))*15;
  }
  if(twoHanded){
    // Keep the shared handle in reach of both shoulders, including the pommel hand.
    const dx=target[0]-supportShoulder[0],dy=target[1]-supportShoulder[1],distance=Math.hypot(dx,dy);
    if(distance>16.9){target[0]=supportShoulder[0]+dx*16.9/distance;target[1]=supportShoulder[1]+dy*16.9/distance;}
  }
  const primary=solveArm(shoulder,target,profile?side:-side,twoHanded?10:9);
  const supportTarget=twoHanded
    ? [primary.hand[0]-Math.sin(weaponAngle)*5,primary.hand[1]+Math.cos(weaponAngle)*5]
    : [-side*12,-5+bob+sway];
  const support=solveArm(supportShoulder,supportTarget,side,twoHanded?11:9);
  return {primary,support,weaponAngle,twoHanded};
}
