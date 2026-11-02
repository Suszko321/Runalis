import {partyColor} from './partyIdentity.js';
import {WORLD_ART_STANDARD} from './worldArtDirection.js';

// A quiet ground-plane cue, independent of attack aim and animation bob.
// Draw after the body so a north-facing arrow is not lost behind the boots.
export function drawPlayerGroundIndicator(ctx,actor,camera,scale=1,combatReady=false){
  if(!actor||actor.active===false||!combatReady)return;
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
  ctx.lineWidth=1.2;
  ctx.globalAlpha=alpha*.28;
  ctx.beginPath();
  ctx.ellipse(0,2,23,11,0,0,Math.PI*2);
  ctx.stroke();
  // Use the same projection for the arrow and circle; retain diagonal facing.
  ctx.globalAlpha=alpha*.42;
  ctx.beginPath();
  ctx.moveTo(dx*29,2+dy*14.5);
  ctx.lineTo(dx*22-dy*4,2+dy*11+dx*2);
  ctx.lineTo(dx*22+dy*4,2+dy*11-dx*2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
