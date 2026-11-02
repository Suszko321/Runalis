// Anatomical ownership is fixed; screen position changes with facing and gait.
export const weaponShoulderSide = facing => facing === 'up' ? -1 : 1;
export const weaponBehindBody = facing => facing === 'up' || facing === 'right';
export const shieldBehindBody = facing => facing === 'up' || facing === 'left';
export const shieldGrip = facing => ({down:[-13,-8],right:[-8,-9],up:[14,-8],left:[-8,-9]}[facing] || [-13,-8]);

// Focuses hang on the anatomical right hip, rather than following either wrist.
// East exposes that hip; west places it behind the body with just an edge showing.
export const focusAtHip = pose => ['spiritFocus','grimoire'].includes(pose?.weaponType)&&!pose.weaponReady&&['idle','walk','run'].includes(pose.state);
export const focusHipBehindBody = facing => facing==='left'||facing==='up';
export function focusHipTransform(bodyType,facing,bob=0){
 const female=bodyType==='female';
 const x={down:female?-12:-13,right:female?-8:-9,up:female?12:13,left:3}[facing]??-13;
 return {x,y:8+Math.round(bob),side:['left','up'].includes(facing)?-1:1};
}
