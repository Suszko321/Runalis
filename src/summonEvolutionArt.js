import {asset} from './spriteArt.js';
import {drawFaeSummonWings} from './faeSummonArt.js';
import {petalSummonPose} from './petalknightSummonArt.js';
const profiles=Object.freeze({'fae-thornling':128,'fae-elder':160,'rose-siegebeast':160});
export function drawSummonEvolutionArt(ctx,s,presentation,x,y){
 const name=presentation.art;if(!name)return false;
 const record=asset(`summon-evolution-${name}`);if(!record?.ready)return true;
 const now=performance.now()/1000,review=typeof s.reviewAnimation==='string',time=review?(s.reviewAnimationTime||0):now;
 let frame,facing=(s.dirX||0)<0?-1:1;
 if(name==='rose-siegebeast'){
  const pose=petalSummonPose(s);facing=pose.facing;frame=pose.attack?3:pose.moving?1+Math.floor(pose.phase*6)%2:0;
 }else{
  const attacking=review?s.reviewAnimation==='attack':now<(s.attackAnimationUntil||0);
  const moving=review?['walk','run'].includes(s.reviewAnimation):s.moving;
  frame=attacking?3:moving?1+Math.floor(time*8)%2:0;
 }
 const row=[0,1,-1,2,3][presentation.tier],width=profiles[name],height=144;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+16));ctx.scale(facing,1);
 if(name.startsWith('fae-')){
  ctx.save();const wingScale=[.6,.8,1,1.15,1.4][presentation.tier];ctx.scale(wingScale,wingScale);
  drawFaeSummonWings(ctx,s.evolutionStage,now);ctx.restore();
 }
 ctx.drawImage(record.image,frame*width,row*height,width,height,-width/2,-138,width,height);
 ctx.restore();return true;
}
for(const name of Object.keys(profiles))asset(`summon-evolution-${name}`);
