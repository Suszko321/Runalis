import {asset} from './spriteArt.js';

// Independent, generated and packed twelve-frame creature sheets. This path
// never reads, recolours or decorates a Standard/Fae summon atlas.
export const PETAL_SUMMON_ART=Object.freeze({
 thornling:Object.freeze({sheet:'petalknight-rose-sentinel',width:80,height:80,stride:80,name:'Rose Sentinel'}),
 thornbeast:Object.freeze({sheet:'petalknight-rose-stalker',width:112,height:104,stride:110,name:'Rose Stalker'}),
 elderThornbeast:Object.freeze({sheet:'petalknight-rose-siegebeast',width:128,height:112,stride:135,name:'Rose Siegebeast'}),
 thornTitan:Object.freeze({sheet:'petalknight-rose-titan',width:144,height:128,stride:145,name:'Rose Thorn Titan'})
});
const motions=new WeakMap(),wrap=n=>((n%1)+1)%1;
export const isPetalSummon=s=>s?.kind==='thornbeast'&&s.summonMorph==='petalknight';
function motion(s){let m=motions.get(s);if(!m){m={elapsed:0,phase:0,settle:0,attack:0,facing:(s.dirX||0)<0?-1:1,turn:0};motions.set(s,m);}return m;}
export function beginPetalSummonMotion(s){
 if(!isPetalSummon(s))return null;motion(s);return {x:s.x,y:s.y,cooldown:s.attackCooldown||0,attackStamp:s.attackAnimationUntil||0};
}
export function finishPetalSummonMotion(s,before,dt){
 if(!before||!(dt>0))return;
 const m=motion(s),step=Math.min(.05,dt),distance=Math.hypot(s.x-before.x,s.y-before.y),profile=PETAL_SUMMON_ART[s.evolutionStage]||PETAL_SUMMON_ART.thornling;
 m.elapsed+=step;m.attack=Math.max(0,m.attack-step);
 const attacked=(s.attackCooldown||0)>before.cooldown+.05||(s.attackAnimationUntil||0)>before.attackStamp;if(attacked)m.attack=.3;
 if(distance>step*8&&distance<Math.max(24,step*1600)){
  m.phase=wrap(m.phase+Math.min(distance/profile.stride,step*2.6));m.settle=.09;
 }else{m.settle=Math.max(0,m.settle-step);if(!m.settle)m.phase=0;}
 const side=Math.abs(s.dirX||0)>=.25?Math.sign(s.dirX):m.facing;
 if(side===m.facing)m.turn=0;
 else{m.turn+=step;if(attacked||m.turn>=.08){m.facing=side;m.turn=0;}}
}
export function petalSummonPose(s){
 const m=motion(s),review=typeof s.reviewAnimation==='string',time=review?s.reviewAnimationTime??0:m.elapsed;
 const moving=review?['walk','run'].includes(s.reviewAnimation):m.settle>0;
 const attack=review?s.reviewAnimation==='attack':m.attack>0;
 const phase=review?wrap(time*2):m.phase;
 const frame=attack?review?8+Math.min(3,Math.floor(wrap(time)*4)):8+Math.min(3,Math.floor((.3-m.attack)/.075)):moving?2+Math.min(5,Math.floor(phase*6)):Math.floor(time*.8)%2;
 return {frame,phase,moving,attack,facing:review?((s.dirX||0)<0?-1:1):m.facing,bob:0};
}
export function drawPetalSummonArt(ctx,s,stage,x,y){
 if(!isPetalSummon(s))return false;
 const profile=PETAL_SUMMON_ART[stage]||PETAL_SUMMON_ART.thornling,record=asset(profile.sheet);
 // Reserve this summon for its own art, including during the initial load.
 // The base creature must never flash underneath the new design.
 if(!record?.ready)return true;
 const pose=petalSummonPose(s);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+16));ctx.scale(pose.facing,1);
 ctx.drawImage(record.image,pose.frame*profile.width,0,profile.width,profile.height,-profile.width/2,-(profile.height-6),profile.width,profile.height);
 ctx.restore();return true;
}
