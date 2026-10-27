import {sampleArmoredArms} from './meleeArmArt.js';

export function isHandTrinket(id){
  return id==='orrakaiFoundersSignet'||/ring/i.test(String(id||''));
}

// Rings belong on the free hand, after the glove layer, never enlarged into
// chest medallions. The far hand is concealed when the actor faces west.
export function drawHandTrinketArt(ctx,actor,pose,facing,bob=0){
  const ref=actor.equipment?.trinket,id=typeof ref==='string'?ref:ref?.id;
  if(!isHandTrinket(id)||facing==='left')return false;
  const rig=sampleArmoredArms(actor,pose,facing,bob),hand=rig.support.hand;
  ctx.save();ctx.translate(Math.round(hand[0]),Math.round(hand[1]));
  ctx.fillStyle='#392b18';ctx.fillRect(-2,-1,4,3);
  ctx.fillStyle='#c79a45';ctx.fillRect(-1,-1,2,2);
  ctx.fillStyle='#f3d88a';ctx.fillRect(-1,-1,1,1);
  ctx.restore();return true;
}
