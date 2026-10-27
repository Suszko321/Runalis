import {getAbilityEffectiveness} from './skillExpertiseSystem.js';
import {progressionPower} from './combatPower.js';
import {hasLineOfSight} from './world.js';
import {registerAbilitySupport,rewardAbilitySupport,rewardCombatPurpose} from './abilityMasterySystem.js';

// Timed support stays out of profiles/summon save data. One mantle per owner;
// recipients are captured at cast time rather than multiplying an aura heal.
const owners=new WeakMap(),recipients=new WeakMap();
const living=(actor,now)=>actor&&actor.hp>0&&actor.active!==false&&actor.alive!==false&&!actor.dead&&!actor.remove&&!actor.dismissed&&(!actor.lifeState||actor.lifeState==='alive')&&(!actor.expiresAt||actor.expiresAt>now);
const ready=(m,now,w)=>m?.active&&living(m.owner,now)&&m.owner.knownAbilities?.includes(m.a.id)&&m.owner.abilityMorphs?.[m.a.id]==='petalknight'&&(!w||w===m.world);
export function roseMantleProfile(p,a,bonuses={}){
 const charge=a._charge?.damageMultiplier||1,expertise=getAbilityEffectiveness(p,a);
 // Bound ordinary progression before charging so holding still improves the
 // heal at high levels instead of the tap already consuming its entire cap.
 const investment=Math.min(1.5,(a._mastery?.damage||1)*progressionPower(p,'warding','defence')*(1+Math.min(40,bonuses.supportHealingPct||0)/100));
 const healing=charge*expertise*investment;
 return {burst:Math.min(.18,.08*healing),regen:Math.min(.03,.015*healing),
  reduction:Math.min(.35,.18*charge*expertise*(1+Math.min(40,bonuses.subclassWardPct||0)/100)),
  reflect:Math.min(.18,.08*charge*expertise),duration:6};
}
export function getRoseMantle(actor,now=performance.now()/1000,w=null){
 const m=recipients.get(actor);return ready(m,now,w)&&m.until>now&&living(actor,now)&&(actor===m.owner||m.owner.summons?.includes(actor))?m:null;
}
export function endRoseMantle(owner,id=null){
 const m=owners.get(owner);if(!m||id&&id!==m.a.id)return;
 m.active=false;owners.delete(owner);for(const actor of m.members)if(recipients.get(actor)===m)recipients.delete(actor);
}
export function beginRoseMantle(p,w,a,now,bonuses={}){
 endRoseMantle(p);const profile=roseMantleProfile(p,a,bonuses);
 const members=[p,...new Set(p.summons||[])].filter(actor=>living(actor,now)&&(actor===p||Math.hypot(actor.x-p.x,actor.y-p.y)<=a.subclassRadius&&(!w.tiles?.length||hasLineOfSight(w,p.x,p.y,actor.x,actor.y,{startSkip:0,endSkip:0}))));
 const m={owner:p,world:w,a,profile,members,active:true,startedAt:now,until:now+profile.duration,lastUpdateAt:now,elapsed:0,lastHealAt:now};owners.set(p,m);registerAbilitySupport(m,p,a.id);
 let healed=0;for(const actor of members){recipients.set(actor,m);const before=actor.hp;actor.hp=Math.min(actor.maxHp,actor.hp+actor.maxHp*profile.burst);healed+=actor.hp-before;}
 if(healed>0)rewardCombatPurpose(p,w,a.id,healed*.12,now);return m;
}
export function updateRoseMantle(p,w,now){
 const m=owners.get(p);if(!m)return null;
 if(!ready(m,now,w)){endRoseMantle(p);return null;}
 const delta=Math.max(0,Math.min(now,m.until)-m.lastUpdateAt);m.lastUpdateAt=Math.max(m.lastUpdateAt,Math.min(now,m.until));m.elapsed=Math.max(0,now-m.startedAt);
 let healed=0;for(const actor of m.members)if(living(actor,now)&&(actor===p||p.summons?.includes(actor))){const before=actor.hp;actor.hp=Math.min(actor.maxHp,actor.hp+actor.maxHp*m.profile.regen*delta);healed+=actor.hp-before;}
 if(healed>0){m.lastHealAt=now;rewardCombatPurpose(p,w,m.a.id,healed*.12,now);}
 if(now>=m.until){endRoseMantle(p);return null;}return m;
}
export function mitigateRoseMantle(actor,damage,now,w){
 const m=getRoseMantle(actor,now,w);if(!m||!(damage>0))return damage;
 const result=Math.max(0,Math.ceil(damage*(1-m.profile.reduction)-1e-8));rewardAbilitySupport(m,w,damage-result,now);return result;
}
export function roseMantleThorns(actor,damage,now,w){
 const m=getRoseMantle(actor,now,w);return m&&damage>0?{owner:m.owner,a:m.a,damage:Math.min(actor.maxHp*.015,damage*m.profile.reflect)}:null;
}
