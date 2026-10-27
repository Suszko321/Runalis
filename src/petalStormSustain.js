import {getAbilityEffectiveness} from './skillExpertiseSystem.js';
import {hasLineOfSight} from './world.js';
// One timed buff per owner, using actual post-mitigation damage from the ledger.
const storms=new WeakMap();
export const PETAL_STORM=Object.freeze({duration:7,interval:.5,reduction:.2,drain:.05,summonShare:.2,healRate:.02,healReserve:.02});
export function beginPetalStorm(p,a,now,radius){
 const old=storms.get(p);if(old)old.active=false;
 const storm={owner:p,a,active:true,startedAt:now,until:now+PETAL_STORM.duration,elapsed:0,radius,lastHealAt:-Infinity,at:now,available:p.maxHp*PETAL_STORM.healReserve};storms.set(p,storm);return storm;
}
export function endPetalStorm(p,expected=null){const s=storms.get(p);if(s&&(!expected||expected===s||expected===s.a.id)){s.active=false;storms.delete(p);}}
export function getPetalStorm(p,now=performance.now()/1000){
 const s=storms.get(p);return s?.active&&s.until>now&&p.hp>0&&p.active!==false&&(!p.lifeState||p.lifeState==='alive')&&p.knownAbilities?.includes(s.a.id)&&p.abilityMorphs?.[s.a.id]==='petalknight'?s:null;
}
export function petalStormReduction(p,now){const s=getPetalStorm(p,now);return s?Math.min(.3,PETAL_STORM.reduction*getAbilityEffectiveness(p,s.a)):0;}
export function restorePetalStormHealth(p,damage,enemy,now=performance.now()/1000){
 const s=getPetalStorm(p,now);if(!s||!(damage>0)||!Number.isFinite(damage)||enemy?.friendly||enemy?.trainingDummy)return 0;
 const max=Math.max(0,Number(p.maxHp)||0);s.available=Math.min(max*PETAL_STORM.healReserve,s.available+Math.max(0,now-s.at)*max*PETAL_STORM.healRate);s.at=Math.max(now,s.at);
 const budget=Math.max(0,Math.min(damage*PETAL_STORM.drain*getAbilityEffectiveness(p,s.a),s.available));
 const injured=[...new Set(p.summons||[])].filter(pet=>pet&&pet.alive!==false&&!pet.dead&&!pet.remove&&pet.hp>0&&Number.isFinite(pet.maxHp)&&pet.maxHp>pet.hp&&(!pet.expiresAt||pet.expiresAt>now)&&Math.hypot(pet.x-p.x,pet.y-p.y)<=s.radius&&(!s.world?.tiles?.length||hasLineOfSight(s.world,p.x,p.y,pet.x,pet.y,{startSkip:0,endSkip:0})));
 const missing=injured.reduce((total,pet)=>total+pet.maxHp-pet.hp,0),shared=Math.min(budget*PETAL_STORM.summonShare,missing);
 // Distribute one shared pool in proportion to missing health. More summons
 // never multiply the return or the existing healing budget.
 for(const pet of injured)pet.hp=Math.min(pet.maxHp,pet.hp+shared*(pet.maxHp-pet.hp)/missing);
 const healed=Math.max(0,Math.min(budget-shared,max-p.hp));p.hp+=healed;s.available-=healed+shared;if(healed+shared>0)s.lastHealAt=now;return healed;
}
