import {OATH_BLADE_PROFILES} from './oathbladeProfiles.js';
import {hasLineOfSight,isPassable} from './world.js';
import {getAbilityEffectiveness} from './skillExpertiseSystem.js';
const live=e=>e&&e.hp>0&&!e.dead&&!e.remove&&!e.friendly;
const sight=(w,x,y,u,v)=>!w.tiles?.length||hasLineOfSight(w,x,y,u,v,{startSkip:0,endSkip:0});
const body=e=>({x:e.x,y:e.y-14});
function home(p,index,count,now){const angle=-Math.PI+.3+index*(Math.PI-.6)/Math.max(1,count-1);return {x:p.x+Math.cos(angle)*57,y:p.y-40+Math.sin(angle)*43+Math.round(Math.sin(now*3+index)*2)};}
function nearest(p,w,range){let found=null,best=range;for(const e of w.enemies||[]){if(!live(e))continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<best&&sight(w,p.x,p.y,e.x,e.y)){found=e;best=d;}}return found;}
export function startOathBlades(p,w,a,s,h){
 const config=OATH_BLADE_PROFILES[a.oathBladeFamily||'base'];
 s.statuses.oathBlades={ability:a,abilityId:a.id,until:h.now+config.duration,nextLaunch:h.now+.28,nextBlade:0,power:h.power,range:a.range,
  blades:Array.from({length:config.count},(_,i)=>({...home(p,i,config.count,h.now),phase:'orbit',index:i,dirX:0,dirY:-1,readyAt:h.now}))};
 if(config.healthCost)p.hp=Math.max(1,p.hp-Math.min(p.hp-1,Math.max(1,Math.floor(p.hp*config.healthCost))));
 h.effect({kind:'oathBladesConjure',abilityId:a.id,subclassId:a.subclassId,x:p.x,y:p.y-6,radius:65,ttl:.65,layer:'behind'});
 return true;
}
export function updateOathBlades(p,w,s,dt,now,h){
 const f=s.statuses.oathBlades;if(!f)return;
 const a=f.ability,c=OATH_BLADE_PROFILES[a.oathBladeFamily||'base'];
 if(f.until<=now||p.hp<=0||p.active===false||p.lifeState&&p.lifeState!=='alive'||!p.knownAbilities?.includes(a.id)||(p.abilityMorphs?.[a.id]||'base')!==(a.oathBladeFamily||'base')){delete s.statuses.oathBlades;return;}
 if(now>=f.nextLaunch){const target=nearest(p,w,f.range);let blade=null;for(let i=0;i<f.blades.length;i++){const b=f.blades[(f.nextBlade+i)%f.blades.length];if(b.phase==='orbit'&&b.readyAt<=now){blade=b;f.nextBlade=(b.index+1)%f.blades.length;break;}}
  if(target&&blade){blade.phase='windup';blade.target=target;blade.windupUntil=now+.18;f.nextLaunch=now+c.interval;}
  else f.nextLaunch=now+.12;
 }
 for(const b of f.blades){
  const at=home(p,b.index,f.blades.length,now);
  if(b.phase==='orbit'){b.x=at.x;b.y=at.y;b.dirX=0;b.dirY=-1;continue;}
  if(b.phase==='windup'){
   b.x=at.x;b.y=at.y-4;if(!live(b.target)||!sight(w,b.x,b.y,b.target.x,b.target.y-14)){b.phase='return';continue;}
   const target=body(b.target),d=Math.hypot(target.x-b.x,target.y-b.y)||1;b.dirX=(target.x-b.x)/d;b.dirY=(target.y-b.y)/d;
   if(now>=b.windupUntil){b.phase='flight';b.endX=target.x;b.endY=target.y;b.flightUntil=now+1.1;h.audio?.('bladeLaunch',a);}continue;
  }
  if(b.phase==='return'){
   const d=Math.hypot(at.x-b.x,at.y-b.y),step=Math.min(d,Math.max(0,dt)*510);if(d<=step+2){b.x=at.x;b.y=at.y;b.phase='orbit';b.readyAt=now+.25;continue;}
   b.dirX=(at.x-b.x)/d;b.dirY=(at.y-b.y)/d;b.x+=b.dirX*step;b.y+=b.dirY*step;continue;
  }
  if(!live(b.target)||now>b.flightUntil){b.phase='return';continue;}
  const distance=Math.min(Math.hypot(b.endX-b.x,b.endY-b.y),c.speed*Math.max(0,dt)),steps=Math.max(1,Math.ceil(distance/6));
  for(let i=0;i<steps&&b.phase==='flight';i++){
   const nx=b.x+b.dirX*distance/steps,ny=b.y+b.dirY*distance/steps;
   if(!sight(w,b.x,b.y,nx,ny)||w.tiles?.length&&!isPassable(w,nx,ny)){b.phase='return';break;}
   b.x=nx;b.y=ny;const target=(w.enemies||[]).find(e=>live(e)&&Math.hypot(e.x-b.x,e.y-14-b.y)<(e.radius||e.r||14)+7);
   if(target){
    const damage=f.power;
    h.damage(target,damage,a.skill,{sourceAbilityId:a.id,subclassId:a.subclassId,sourceMorph:a.oathBladeFamily||'base',element:c.element,magic:true,singleTarget:true,projectile:true,oathBlade:true,subclassApplied:true,quiet:true});
    h.effect({kind:'oathBladesImpact',abilityId:a.id,subclassId:a.subclassId,x:target.x,y:target.y-4,radius:c.splashRadius||28,ttl:.34,layer:'front'});h.audio?.('bladeImpact',a);
    if(c.weaken){target.subclassWeakenedUntil=now+1.8;target.subclassWeakenedEffectiveness=getAbilityEffectiveness(p,a);}
    if(c.splash)for(const foe of (w.enemies||[]).filter(e=>e!==target&&live(e)&&Math.hypot(e.x-target.x,e.y-target.y)<=c.splashRadius&&sight(w,target.x,target.y,e.x,e.y)).slice(0,2))h.damage(foe,damage*c.splash,a.skill,{sourceAbilityId:a.id,subclassId:a.subclassId,sourceMorph:a.oathBladeFamily,element:c.element,magic:true,aoe:true,proc:true,oathBlade:true,subclassApplied:true,quiet:true});
    b.phase='return';break;
   }
   if(Math.hypot(b.endX-b.x,b.endY-b.y)<7){b.phase='return';break;}
  }
 }
}
