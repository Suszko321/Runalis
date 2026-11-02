import {partyColor} from './partyIdentity.js';
import {WORLD_ART_STANDARD} from './worldArtDirection.js';

// A quiet ground-plane cue, independent of attack aim and animation bob.
// Draw after the body so a north-facing arrow is not lost behind the boots.
export function drawPlayerGroundIndicator(ctx,actor,camera,scale=1){
  if(!actor||actor.active===false)return;
  const rawX=Number.isFinite(actor.dirX)?actor.dirX:0;
  const rawY=Number.isFinite(actor.dirY)?actor.dirY:1;
  const length=Math.hypot(rawX,rawY);
  const dx=length>.001?rawX/length:0,dy=length>.001?rawY/length:1;
  const color=partyColor(actor)||partyColor(null);
  ctx.save();
  ctx.translate(Math.round(actor.x-camera.x),Math.round(actor.y-camera.y)+WORLD_ART_STANDARD.actorFootOffset*scale);
  ctx.scale(scale,scale);
  const alpha=ctx.globalAlpha;
  ctx.strokeStyle=color;
  ctx.fillStyle=color;
  ctx.lineWidth=1;
  ctx.globalAlpha=alpha*.18;
  ctx.beginPath();
  ctx.ellipse(0,2,19,9,0,0,Math.PI*2);
  ctx.stroke();
  // Use the same projection for the arrow and circle; retain diagonal facing.
  ctx.globalAlpha=alpha*.28;
  ctx.beginPath();
  ctx.moveTo(dx*24,2+dy*12);
  ctx.lineTo(dx*18-dy*3,2+dy*9+dx*1.5);
  ctx.lineTo(dx*18+dy*3,2+dy*9-dx*1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
