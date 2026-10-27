import {asset,humanFrame,applyHumanTorsoMotion} from './spriteArt.js';
import {ITEMS} from './data.js';
import {getGearVisualProfile} from './gearVisualStyle.js';
import {usesSideLocomotion} from './humanLocomotionRig.js';
import {drawSideLegArt} from './sideLegArt.js';
import {factionArmorImage} from './factionEquipmentArt.js';
import {humanArmorImage} from './humanEquipmentSprites.js';
export function armorReplacement(actor,part){
  const ref=actor.equipment?.[part],id=typeof ref==='string'?ref:ref?.id;
  if(!id)return false;
  const family=armorMotionFamily(getGearVisualProfile(id,ITEMS[id]||{}),part);
  return !!asset(`armor-motion-${family}`)?.ready;
}
export function armorMotionFrame(pose={}){
  if(['walk','run'].includes(pose.state))return humanFrame(pose);
  if(['charge','heavyCharge'].includes(pose.state))return 4;
  if(pose.attacking||['cast','summon','signature','guard'].includes(pose.state)){
    if(['anticipation','draw','buildup','brace','focus','windUp'].includes(pose.phase))return 4;
    if(['strike','release','followThrough','counter'].includes(pose.phase))return 5;
  }
  return 0;
}
export function armorMotionFamily(profile,part){
  if(!profile)return null;
  if(part==='chest')return profile.silhouette==='plate'?'plate':profile.silhouette==='robe'?'cloth':'leather';
  if(profile.faction)return profile.silhouette==='plate'?'plate':profile.silhouette==='leather'?'leather':'cloth';
  const text=String(profile.itemId||'');
  return /wrap|cloth|grave|robe/i.test(text)?'cloth':/plate|iron|steel|greave|oath/i.test(text)?'plate':'leather';
}
export function drawArmorMotionArt(ctx,profile,part,facing,x,y,bob,pose){
  const family=armorMotionFamily(profile,part);if(!family)return false;
  const a=asset(`armor-motion-${family}`);if(!a?.ready)return false;
  const image=humanArmorImage(profile,family,pose?.bodyType)||factionArmorImage(a.image,profile);
  const row={down:0,right:1,up:2,left:3}[facing]??0;
  // Generated gait cells vary the chest's volume. Use one fitted chest for
  // locomotion, with movement supplied by the shared body rig instead.
  const col=part==='chest'&&['walk','run'].includes(pose?.state)
    ? 0 : armorMotionFrame(pose);
  // Shared waist seam lets torso and leg equipment remain independently selectable.
  // Two pixels of belt overlap close the seam when only legwear is equipped.
  // The atlas includes a dark neck opening above the shoulders. It belongs
  // behind the head, so chest equipment must never paint above the chin seam.
  const top=part==='chest'?17:34,height=part==='chest'?19:30;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(part==='chest'){
    // Sleeves are already drawn by the arm rig. The full atlas cell also
    // contains static shoulder pads: drawing both creates a doubled shoulder.
    // Use a single fitted torso in every action, mirrored for west/east.
    // Jointed arms own the sleeves during attacks and casting as well.
    const sideView=facing==='left'||facing==='right';
    const sourceRow=sideView?1:row;
    const width=sideView?12:16,left=sideView?27:24;
    // The 12px source crop removes static sleeves; it is not the body's
    // intended screen-space width. Keep a full chest behind the arm rig.
    const fittedWidth=sideView?18:width;
    const fit=pose?.bodyType==='female'?.9:1;
    ctx.translate(x,y+Math.round(bob));
    ctx.scale((facing==='left'?-1:1)*fit,1);
    ctx.drawImage(image, left,sourceRow*64+top,width,height,-fittedWidth/2,-40+top,fittedWidth,height);
    ctx.restore();return true;
  }
  if(part==='legs')applyHumanTorsoMotion(ctx,pose,bob,true);
  if(part==='legs'&&usesSideLocomotion(pose,facing)){
    ctx.translate(x,y);
    // Preserve the full authored leg frame at native size, like bare trousers.
    drawSideLegArt(ctx,image,pose,facing,bob,true);
    ctx.restore();return true;
  }
  if(part==='legs'&&['walk','run'].includes(pose?.state)){
    // The atlas's first four poses keep the greaves planted. Articulate each
    // leg from the neutral pose instead of covering the gait with a rigid pair.
    const side=facing==='left'?-1:1,profile=facing==='left'||facing==='right';
    ctx.drawImage(image,0,row*64+34,64,4,Math.round(x-32),Math.round(y+bob-6),64,4);
    for(const half of [0,1]){
      const stride=half===0?pose.backLegStride:pose.frontLegStride;
      const lift=half===0?pose.backFootLift:pose.frontFootLift;
      const hip=half===0?-3:3;
      const angle=(profile?-side*.10:.025)*Number(stride||0);
      ctx.save();ctx.translate(x+hip,y+bob-2);
      ctx.rotate(angle);
      // Preserve planted-leg reach as it swings; only the passing foot lifts.
      ctx.scale(1,(1-Math.min(.14,Number(lift||0)/24))/Math.cos(angle));
      ctx.drawImage(image,half*32,row*64+38,32,26,half*32-32-hip,0,32,26);
      ctx.restore();
    }
    ctx.restore();return true;
  }
  ctx.drawImage(image,col*64,row*64+top,64,height,Math.round(x-32),Math.round(y+bob-40+top),64,height);
  ctx.restore();return true;
}
for(const family of ['plate','leather','cloth'])asset(`armor-motion-${family}`);
