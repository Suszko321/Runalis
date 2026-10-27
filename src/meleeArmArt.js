import {asset,humanFrame,restingWeaponGrip,castBodyGrip,bowBodyGrip} from './spriteArt.js';
import {weaponShoulderSide} from './handedness.js';
import {usesMeleeRig,sampleMeleeRig} from './meleeRig.js';
import {ITEMS} from './data.js';
import {getGearVisualProfile} from './gearVisualStyle.js';
import {armorMotionFamily} from './armorMotionArt.js';
import {humanArmMaterialImage} from './humanEquipmentSprites.js';
import {usesSideLocomotion,sampleLocomotionArms,sampleRelaxedFrontArms} from './humanLocomotionRig.js';
// Tight atlas rectangles: upper arm, forearm, gripping glove for each material.
const RECTS=[[[15,10,17,32],[65,12,13,30],[114,29,11,13]],[[15,58,18,32],[66,60,12,30],[114,75,12,15]],[[15,106,18,32],[66,106,12,32],[113,123,13,15]]];
const skinVariants=new Map();
function armImage(skin,shirt=null,female=false){
  const source=asset('melee-arm-parts').image;
  if(!/^#[0-9a-f]{6}$/i.test(skin||''))return source;
  const key=[skin,shirt,female].join('|');
  if(skinVariants.has(key))return skinVariants.get(key);
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(source,0,0);
  const pixels=c.getImageData(0,0,canvas.width,canvas.height),target=[1,3,5].map(i=>parseInt(skin.slice(i,i+2),16));
  for(let i=0;i<pixels.data.length;i+=4){
    const d=pixels.data,r=d[i],g=d[i+1],b=d[i+2];
    if(d[i+3]&&r>155&&g>92&&r>g*1.12&&g>b*1.08){
      const light=(r+g+b)/530;
      for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(target[k]*light));
    }
  }
  if(/^#[0-9a-f]{6}$/i.test(shirt||'')){
    const color=[1,3,5].map(i=>parseInt(shirt.slice(i,i+2),16));
    const [sx,sy,sw,sh]=RECTS[0][0];
    const sourcePixels=c.getImageData(0,0,canvas.width,canvas.height).data;
    for(let y=sy;y<sy+Math.round(sh*(female?.2:.35));y++)for(let x=sx;x<sx+sw;x++){
      const i=(y*canvas.width+x)*4,d=pixels.data;
      if(!d[i+3]||sourcePixels[i]+sourcePixels[i+1]+sourcePixels[i+2]<115)continue;
      const shade=Math.max(.45,Math.min(1.15,(sourcePixels[i]+sourcePixels[i+1]+sourcePixels[i+2])/430));
      for(let k=0;k<3;k++)d[i+k]=Math.round(color[k]*shade);
    }
  }
  c.putImageData(pixels,0,0);if(skinVariants.size>=16)skinVariants.delete(skinVariants.keys().next().value);
  skinVariants.set(key,canvas);return canvas;
}
export function meleeArmReady(pose){return usesMeleeRig(pose)&&!!asset('melee-arm-parts')?.ready;}
// Follow authored wrist landmarks at rest; do not fold idle arms into combat IK.
export function sampleArmoredArms(actor,pose,facing,bob=0){
  if(pose.locomotionArms||(pose.sideLocomotionArms&&usesSideLocomotion(pose,facing)))return sampleLocomotionArms(pose,facing,bob);
  if(facing==='down'&&pose.state==='idle')return sampleRelaxedFrontArms({...pose,bodyType:actor.bodyType||actor.appearance?.bodyType},bob);
  const side=weaponShoulderSide(facing),female=(actor.bodyType||actor.appearance?.bodyType)==='female';
  const frame=humanFrame(pose);
  const primaryHand=bowBodyGrip(actor,pose,facing)||castBodyGrip(actor,pose,facing)||restingWeaponGrip(actor,{...pose,weaponType:pose.weaponType==='unarmed'?'sword':pose.weaponType||'sword'},facing).hand;
  const rightHands=female?{down:[[-13,-4],[-13,-4],[-13,-4],[-13,-4]],up:[[13,-5],[13,-5],[13,-5],[13,-5]],right:[[-5,-5],[-10,-6],[-5,-5],[8,-7]],left:[[-10,-7],[-13,-6],[-10,-7],[9,-7]]}:{down:[[-13,-4],[-13,-7],[-13,-4],[-13,-7]],up:[[14,-5],[14,-7],[14,-5],[14,-7]],right:[[-8,-6],[-12,-5],[-8,-6],[-12,-5]],left:[[-8,-7],[-10,-9],[-8,-7],[-10,-9]]};
  let supportHand=rightHands[facing][frame];
  if(bowBodyGrip(actor,pose,facing)&&['draw','release','strike','followThrough'].includes(pose.phase))supportHand={down:[-13,-22],up:[13,-22],right:[-14,-24],left:[14,-24]}[facing];
  if(castBodyGrip(actor,pose,facing)&&pose.castProgress>.08&&pose.castProgress<.85)supportHand={down:[-14,-20],up:[18,-20],right:[-5,-17],left:[-18,-20]}[facing];
  const arm=(sign,hand)=>{
    const sideView=facing==='left'||facing==='right';
    const far=sideView&&(facing==='right'?sign===side:sign!==side);
    // Profile shoulders overlap in projection. The front-view 14px spacing
    // exposed the entire far sleeve beyond the torso, even at the rear depth.
    const shoulder=[sign*(sideView?(far?1:5):7),-23+bob],wrist=[hand[0],hand[1]+bob];
    const reach=far?.25:.55;
    return {shoulder,elbow:[shoulder[0]*(1-reach)+wrist[0]*reach+(far?0:sign*.5),shoulder[1]*.48+wrist[1]*.52],hand:wrist,far};
  };
  const rest={primary:arm(side,primaryHand),support:arm(-side,supportHand),twoHanded:true,weaponAngle:primaryHand[0]<0?-.2:.2};
  if(usesMeleeRig(pose)){const action=sampleMeleeRig(pose,facing,bob);return {...action,support:action.twoHanded?action.support:rest.support,twoHanded:true};}
  return rest;
}
export function drawMeleeArms(ctx,actor,pose,facing,bob=0,layer='arms',selection='all',armored=false) {
  if(!asset('melee-arm-parts')?.ready||(!armored&&!meleeArmReady(pose)&&!pose.sideLocomotionArms))return;
  const ref=actor.equipment?.chest,id=typeof ref==='string'?ref:ref?.id;
  const gearProfile=getGearVisualProfile(id,ITEMS[id]||{});
  const family=armorMotionFamily(gearProfile,'chest');
  const row=family==='plate'?1:family==='cloth'?2:0;
  const female=(actor.bodyType||actor.appearance?.bodyType)==='female';
  const original=armImage(actor.skin,!armored?(actor.shirt||'#f2a51f'):null,female);
  const image=armored?humanArmMaterialImage(original,gearProfile,family,actor.skin):original,rig=sampleArmoredArms(actor,pose,facing,bob);
  function piece(col,a,b,width){
    const [sx,sy,sw,sh]=RECTS[row][col],dx=b[0]-a[0],dy=b[1]-a[1];
    ctx.save();ctx.translate(a[0],a[1]);ctx.rotate(Math.atan2(dy,dx)-Math.PI/2);
    ctx.drawImage(image,sx,sy,sw,sh,-width/2,-1,width,Math.hypot(dx,dy)+2);ctx.restore();
  }
  ctx.save();ctx.imageSmoothingEnabled=false;
  // Both arms come from this layer; the off-hand keeps its authored resting wrist.
  for(const arm of rig.twoHanded?[rig.support,rig.primary]:[rig.primary]){
    if(selection==='primary'&&arm!==rig.primary||selection==='support'&&arm!==rig.support)continue;
    if(layer==='arms'){
      // Keep enough width for the shaded sprite interior, not just its ink
      // outline. The torso no longer supplies a second baked shoulder layer.
      const fit=female?.95:1;
      piece(0,arm.shoulder,arm.elbow,!armored?(female?6:7):(arm.far?7:row===1?9:8)*fit);
      piece(1,arm.elbow,arm.hand,!armored?(female?5:6):(arm.far?6.5:7)*fit);
    } else {
      const [sx,sy,sw,sh]=RECTS[row][2];
      ctx.save();ctx.translate(...arm.hand);ctx.rotate(rig.weaponAngle);
      ctx.drawImage(image,sx,sy,sw,sh,-3,-2.5,6,6);ctx.restore();
    }
  }
  ctx.restore();
}
asset('melee-arm-parts');
