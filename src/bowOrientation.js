// The shared bow's convex wooden limb faces LEFT in its source cell; string
// and tips lie to the right of its grip. Normalize the source, then aim it.
export const bowSourceSide=side=>-side;
export function bowAimRotation(actor,pose,facing,side){
 if(!(pose?.attacking||['charge','heavyCharge'].includes(pose?.state)))return null;
 const fallback={right:[1,0],left:[-1,0],up:[0,-1],down:[0,1]}[facing]||[0,1];
 const state=actor.combatState||{},dx=Number(state.attacking?state.attackDirX??actor.dirX:state.heavyChargeActive?state.heavyChargeAimX??actor.dirX:actor.dirX)||0;
 const dy=Number(state.attacking?state.attackDirY??actor.dirY:state.heavyChargeActive?state.heavyChargeAimY??actor.dirY:actor.dirY)||0,aim=Math.hypot(dx,dy)>.01?[dx,dy]:fallback;
 const a=Math.atan2(aim[1],aim[0])-(side<0?Math.PI:0);
 return Math.atan2(Math.sin(a),Math.cos(a));
}
