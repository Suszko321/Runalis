import {locomotionArtFrame} from './humanLocomotionRig.js';
const WAIST_DONORS=[[31,31,30,32],[33,34,32,30]];

// Keep the authored pelvis, trousers and boots together at native pixel size.
// Four discrete atlas cells supply the stride; do not stretch or rotate strips.
// Both directions use the same profile, mirrored without changing its volume.
// Leg cells stay registered to the ground while the upper body bobs above them.
export function drawSideLegArt(ctx,image,pose,facing,bob,armor=false,hipOffset=0){
  const col=locomotionArtFrame(pose);
  const cellHeight=armor?64:80,top=armor?34:51;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.scale(facing==='left'?-1:1,1);
  if(pose.sideLocomotionArms){
    // The old baked glove hid a few waist pixels. Fill that small backing
    // area before the original leg cell, so its existing pixels stay intact.
    // Sample this frame's already-tinted trousers; never introduce a new ramp.
    const donor=WAIST_DONORS[pose.bodyType==='female'?1:0][col];
    ctx.drawImage(image,col*64+donor,cellHeight+(armor?39:55),1,1,
      -6,-3,12,3);
  }
  ctx.drawImage(image,col*64,cellHeight+top,64,cellHeight-top,
    -32+hipOffset,top-(armor?40:56),64,cellHeight-top);
  ctx.restore();
}
