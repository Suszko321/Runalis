import {hasLineOfSight} from './world.js';
import {isGravecallerSustain,restoreGravecallerLifesteal} from './gravecallerSustain.js';

export const LICH_ABILITY_ID='gravecallerSummonLich';
export const BOUND_DEAD_ABILITY_ID='summonLich';
export const BOUND_DEAD_FORMS=Object.freeze({
 base:{name:'Skeleton Henchman',health:1,damage:1,desc:'Raise a skeletal henchman whose primary attacks steal 4% of actual damage as health for you, before bonuses. Commander raises three equipped henchmen. Mastery unlocks specter and lesser goliath forms. All summons share their healing limit. Use again to dismiss the group.'},
 acolyte:{name:'Specter',health:.9,damage:.8,speed:190,range:42,rate:1.2,armour:0,color:'#a5e2d4',
  desc:'Raise a melee specter with a spectral sickle. Primary strikes steal 8% of actual damage as health for you before bonuses, and heal nearby allies for 8%. Commander raises three. All summons share a 1% maximum-health-per-second healing limit. Use again to dismiss the group.'},
 deathknight:{name:'Lesser Goliath Knight',health:1.5,damage:1.2,speed:155,range:52,rate:1.35,armour:9,color:'#8baf83',
  desc:'Raise a sturdy undead footsoldier with a cleaver and buckler. Primary strikes steal 4% of actual damage as health for you, before bonuses. It cleaves forward foes and draws attention; every third strike staggers lesser foes. Cleave damage does not heal. Commander raises three; all summons share their healing limit. Use again to dismiss.'}
});
export const LICH_FORMS=Object.freeze({
 base:{name:'Lich',health:2,damage:1.65,speed:150,range:260,rate:1.35,armour:4,color:'#bda2ee',
  desc:'Call a durable ranged lich. Primary bolts steal 4% of actual damage as health for you, before bonuses. Every third bolt bursts against up to three nearby enemies; splash damage does not heal. All summons share their healing limit. Use again to dismiss it; Raise the Bound Dead remains separate.'},
 acolyte:{name:'Ghostly Specter',health:1.4,damage:1.2,speed:190,range:230,rate:1.15,armour:0,color:'#a5e2d4',
  desc:'Call a ranged ghostly specter. Primary soul strikes steal 8% of actual damage as health for you before bonuses, and heal allies within 175 units for 8%. All summons share a 1% maximum-health-per-second healing limit. Use again to dismiss it.'},
 deathknight:{name:'Goliath Deathknight',health:3.8,damage:2,speed:110,range:58,rate:1.8,armour:18,color:'#db6a78',
  desc:'Call a hulking undead knight with extra health and armour. Primary sword strikes steal 4% of actual damage as health for you, before bonuses. It cleaves nearby foes and draws attention; every third strike staggers lesser foes. Cleave damage does not heal. All summons share their healing limit. Use again to dismiss it.'}
});
const living=e=>e&&e.hp>0&&!e.dead&&!e.remove&&!e.friendly;
const sight=(w,s,e)=>!w.tiles?.length||hasLineOfSight(w,s.x,s.y,e.x,e.y);
const foes=(w,s,x,y,r,max)=> (w.enemies||[]).filter(e=>living(e)&&Math.hypot(e.x-x,e.y-y)<=r+(e.radius||e.r||0)&&sight(w,s,e)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,max);
export function isBoundDeadMorph(s){return s?.kind==='lich'&&s.summonFamily==='boundDead'&&['acolyte','deathknight'].includes(s.summonMorph);}
export function lichForm(s){return isBoundDeadMorph(s)?BOUND_DEAD_FORMS[s.summonMorph]:LICH_FORMS[s?.summonMorph]||LICH_FORMS.base;}
export function configureBoundDeadSummon(s,ability){
 const morph=BOUND_DEAD_FORMS[ability.subclassId]?ability.subclassId:'base',form=BOUND_DEAD_FORMS[morph];
 s.summonFamily='boundDead';s.summonMorph=morph;s.boundDeadArtVersion=3;s.evolutionStage='skeletonServant';
 if(morph==='base'){if(!s.skeletonRole)s.displayName=form.name;if(s.skeletonRole!=='marksman')s.attackRange=42;return s;}
 s.displayName=form.name+(s.skeletonRoleName?` · ${s.skeletonRoleName}`:'');
 s.maxHp=Math.ceil(s.maxHp*form.health);s.hp=s.maxHp;s.damage=Math.ceil(s.damage*form.damage);
 s.speed=form.speed;s.attackRange=form.range;s.attackRate=form.rate;s.armour=Math.min(65,s.armour+form.armour);
 s.radius=morph==='deathknight'?16:12;return s;
}
export function configureLichSummon(s,ability){
 const form=LICH_FORMS[ability.subclassId]||LICH_FORMS.base;
 s.summonMorph=LICH_FORMS[ability.subclassId]?ability.subclassId:'base';
 s.displayName=form.name;s.evolutionStage='lich';s.summonPath='lichbound';
 s.maxHp=Math.ceil(s.maxHp*form.health);s.hp=s.maxHp;s.damage=Math.ceil(s.damage*form.damage);
 s.speed=form.speed;s.attackRange=form.range;s.attackRate=form.rate;s.armour=Math.min(65,s.armour+form.armour);
 s.radius=s.summonMorph==='deathknight'?20:14;s.lichArtVersion=1;
 return s;
}
export function migrateLichSummons(p){
 for(const s of p.summons||[]){
  if(!s||s.legendaryTemporary||s.kind!=='lich'||!(s.summonPath==='evolved'||['lich','lichLord'].includes(s.evolutionStage)))continue;
  // Preserve the living actor and its health. Its old hotbar assignment remains
  // Raise the Bound Dead; the newly learned ability independently manages it.
  s.kind='greaterLich';s.sourceAbilityId=s.summonAbilityId=LICH_ABILITY_ID;s.summonMorph='base';
  s.summonPath='lichbound';s.evolutionStage='lich';s.displayName='Lich';s.attackRange=LICH_FORMS.base.range;s.lichArtVersion=1;
 }
 for(const s of p.summons||[]){
  if(!s||s.kind!=='lich'||s.legendaryTemporary)continue;
  if(s.summonFamily==='boundDead'){
   // Update old ranged servants without rebuilding stats or healing actors.
   if((s.boundDeadArtVersion||1)<3){
    if(s.summonMorph==='acolyte')s.attackRange=BOUND_DEAD_FORMS[s.summonMorph].range;
    else if(s.summonMorph==='base'&&s.skeletonRole!=='marksman')s.attackRange=42;
    s.boundDeadArtVersion=3;
   }
   continue;
  }
  s.summonFamily='boundDead';s.summonMorph='base';s.boundDeadArtVersion=3;
  if(s.skeletonRole!=='marksman')s.attackRange=42;
  s.sourceAbilityId=s.summonAbilityId=BOUND_DEAD_ABILITY_ID;
 }
}
function emit(h,s,geometry,extra={}){h.effect({kind:'lichSummon',summonFamily:s.summonFamily,form:s.summonMorph||'base',subclassId:s.summonMorph==='base'?undefined:s.summonMorph,geometry,x:s.x,y:s.y-22,ttl:.35,...extra});}
function damage(h,s,e,value,form,aoe=false){
 h.damage(e,value,'summoning',{source:'summon',sourceAbilityId:s.sourceAbilityId||s.summonAbilityId||(isBoundDeadMorph(s)?BOUND_DEAD_ABILITY_ID:LICH_ABILITY_ID),sourceName:form.name,element:'necrotic',magic:true,aoe,quiet:true});
}
export function emitLichArrival(s,h){emit(h,s,'arrival',{x:s.x,y:s.y+8,ttl:.65,radius:s.summonMorph==='deathknight'?40:28});}
export function onLichSummonHit(s,p,w,target,power,dealt,now,h){
 if(s.kind!=='greaterLich'&&!isBoundDeadMorph(s))return;
 const form=lichForm(s);s.lichStrikes=(s.lichStrikes||0)+1;
 const endpoint={endX:target.x,endY:target.y-12};
 if(s.summonMorph==='deathknight'){
  const direction=Math.atan2(target.y-s.y,target.x-s.x);
  const bound=isBoundDeadMorph(s),reach=bound?58:78;
  const victims=[target,...foes(w,s,s.x,s.y,reach,8).filter(e=>e!==target&&Math.cos(Math.atan2(e.y-s.y,e.x-s.x)-direction)>.45).slice(0,4)];
  emit(h,s,'cleave',{dirX:Math.cos(direction),dirY:Math.sin(direction),radius:bound?50:76,ttl:.28});
  for(const e of victims){
   if(e!==target)damage(h,s,e,power*.5,form,true);
   if(living(e)){e.targetSummonId=s.id;e.summonThreatUntil=now+2.5;}
   if(s.lichStrikes%3===0)e.staggerTimer=Math.max(e.staggerTimer||0,(e.isBoss||e.worldBoss||e.massive||e.bossType)? .08:.3);
  }
 }else if(s.summonMorph==='acolyte'){
  if(isBoundDeadMorph(s)){
   const direction=Math.atan2(target.y-s.y,target.x-s.x);
   emit(h,s,'soulSlash',{dirX:Math.cos(direction),dirY:Math.sin(direction),radius:32,ttl:.22});
  }else emit(h,s,'soulBolt',endpoint);
  for(const ally of new Set([p,...(p.coop?.players||[])])){
   if(!ally||ally.hp<=0||ally.active===false||Math.hypot(ally.x-s.x,ally.y-s.y)>175||!sight(w,s,ally))continue;
   // The owner receives primary-attack lifesteal in the coordinator once.
   // The support morph shares its smaller summon healing limit with allies.
   if(isGravecallerSustain(p)&&ally===p)continue;
   const before=ally.hp;
   if(isGravecallerSustain(p))restoreGravecallerLifesteal(ally,dealt,8,{source:'summon',now});
   else ally.hp=Math.min(ally.maxHp,ally.hp+Math.min(dealt*.12,ally.maxHp*.03));
   if(ally.hp>before)emit(h,s,'mend',{x:ally.x,y:ally.y+6,ttl:.25});
  }
 }else{
  emit(h,s,'graveBolt',endpoint);
  if(s.lichStrikes%3===0){
   for(const e of foes(w,s,target.x,target.y,68,5).filter(e=>e!==target).slice(0,3))damage(h,s,e,power*.4,form,true);
   emit(h,s,'burst',{x:target.x,y:target.y-9,radius:38,ttl:.3});
  }
 }
}
