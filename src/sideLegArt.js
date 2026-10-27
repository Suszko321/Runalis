import {locomotionArtFrame} from './humanLocomotionRig.js';

// Keep the authored pelvis, trousers and boots together at native pixel size.
// Four discrete atlas cells supply the stride; do not stretch or rotate strips.
// Both directions use the same profile, mirrored without changing its volume.
// Leg cells stay registered to the ground while the upper body bobs above them.
export function drawSideLegArt(ctx,image,pose,facing,bob,armor=false,hipOffset=0){
  const col=locomotionArtFrame(pose);
  const cellHeight=armor?64:80,top=armor?34:51;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.scale(facing==='left'?-1:1,1);
  ctx.drawImage(image,col*64,cellHeight+top,64,cellHeight-top,
    -32+hipOffset,top-(armor?40:56),64,cellHeight-top);
  ctx.restore();
}
