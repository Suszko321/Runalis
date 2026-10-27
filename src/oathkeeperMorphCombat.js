import {OATHKEEPER_MORPHS} from './oathkeeperMorphs.js';
import {startAbilityChannel} from './abilityChannelSystem.js';
import {moveActorWithCollision} from './world.js';
import {presentClassMobility} from './classMovement.js';
import {rewardMobilityMastery} from './abilityMasterySystem.js';

// Owned by subclassCombat's per-player/per-world state. No timers, saved enemy
// references, permanent stat packages or independent simulation loops.
const live=e=>e&&e.hp>0&&!e.dead&&!e.remove&&!e.friendly;
const cfg=a=>OATHKEEPER_MORPHS[a.subclassId]?.[a.id];
const owned=s=>s.oath||(s.oath={resolve:0,nextResolve:0,nextPenance:0,fields:[],pending:[],contacts:[],healAt:0,healed:0});
const close=(p,e)=>Math.hypot(e.x-p.x,e.y-p.y)<=125;
function build(s,family,now){
 const o=owned(s);s.lastHit=now;
 if(family==='holyknight'&&now>=o.nextResolve){o.resolve=Math.min(3,o.resolve+1);o.nextResolve=now+.75;}
 if(family==='sinner'&&now>=o.nextPenance){s.penance=Math.min(6,s.penance+1);o.nextPenance=now+.8;}
}
const visual=(api,h,p,a,g,extra={})=>api.emit(h,p,a,g,{oathMorph:true,...extra});
function selfHeal(p,w,a,h,api,fraction){return api.heal(p,w,a,p.maxHp*fraction,p.x,p.y,0,h);}
function guard(p,w,a,h,api,strength,duration){api.ward(p,w,a,h,strength,duration,p.x,p.y,0);}
function aimedGround(p,w,a,h,api){
 const target=api.line(w,p.x,p.y,h.aim,a.range,24,1)[0];
 return api.point(p,w,h.aim,target?Math.min(a.range,Math.hypot(target.x-p.x,target.y-p.y)):a.range);
}
function echoes(p,w,a,s,h,api,primary,power,excluded=primary){
 // Penance rewards a pack encounter; no repeated hit on the primary target.
 const foes=api.nearby(w,primary.x,primary.y,105,12).filter(e=>e!==excluded&&api.sight(w,p.x,p.y,e)).slice(0,2);
 for(const e of foes){api.hit(p,w,a,e,power*.5,h,{proc:true});visual(api,h,p,a,'graveSword',{x:e.x,y:e.y-6,radius:28,ttl:.4});}
}
function impact(p,w,a,s,h,api,pos,power,empowered=false){
 const targets=api.nearby(w,pos.x,pos.y,a.subclassRadius,a.maxHits).filter(e=>api.sight(w,p.x,p.y,e));
 for(const e of targets)api.hit(p,w,a,e,power,h);
 if(empowered&&targets[0]){
  if(a.subclassId==='sinner')echoes(p,w,a,s,h,api,targets[0],power);
  else for(const e of targets)api.hit(p,w,a,e,power*.35,h,{proc:true});
 }
 visual(api,h,p,a,a.subclassId==='sinner'?'graveBlades':'holySlam',{...pos,radius:a.subclassRadius,ttl:.6});
 h.audio?.('impact',a);
 return targets.length;
}
export function executeOathkeeperMorph(p,w,a,slot,s,h,api){
 const c=cfg(a);if(!c)return false;
 const o=owned(s),aim=h.aim,mode=c.mode,duration=a.duration*(1+Math.min(50,s.bonuses?.subclassDurationPct||0)/100);
 const target=['mark','chain'].includes(mode)?api.line(w,p.x,p.y,aim,a.range,24,1)[0]:null;
 if(['mark','chain'].includes(mode)&&!target){h.log?.('Aim at a living enemy.');return false;}
 if(a.channelProfile){
  const channel=startAbilityChannel(p,a,slot,h.now,aim,{subclassId:a.subclassId,subclassMode:mode,ability:a,damage:h.power,range:a.range,profile:'subclass',mythicalMode:a._mythChannel});
  if(!channel)return false;
  guard(p,w,a,h,api,c.ward,.6);h.audio?.('channelStart',a);
 }else if(mode==='dash'){
  const before={x:p.x,y:p.y};moveActorWithCollision(p,w,aim.x*a.mobilityProfile.distance,aim.y*a.mobilityProfile.distance);
  const distance=Math.hypot(p.x-before.x,p.y-before.y);if(distance<8)return false;
  impact(p,w,a,s,h,api,p,h.power);guard(p,w,a,h,api,c.ward,c.wardDuration);
  presentClassMobility(p,w,before,a,h.now);rewardMobilityMastery(p,w,a.id,distance,h.now,h.log);
  visual(api,h,p,a,'dash',{x:before.x,y:before.y-5,endX:p.x,endY:p.y-5,ttl:.45});
 }else if(mode==='chain'){
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1,heavy=target.isBoss||target.worldBoss||target.massive||target.bossType||target.heavy;
  if(heavy)moveActorWithCollision(p,w,dx/d*Math.min(120,Math.max(0,d-45)),dy/d*Math.min(120,Math.max(0,d-45)));
  else moveActorWithCollision(target,w,-dx/d*Math.min(100,Math.max(0,d-42)),-dy/d*Math.min(100,Math.max(0,d-42)));
  api.hit(p,w,a,target,h.power,h);visual(api,h,p,a,'chain',{endX:target.x,endY:target.y-5,ttl:.45});
 }else if(mode==='melee'){
  const empowered=c.finisher&&o.resolve>=3;if(empowered)o.resolve-=3;
  const targets=api.line(w,p.x,p.y,aim,a.range,a.maxHits===1?24:38,a.maxHits);
  for(const e of targets){
   api.hit(p,w,a,e,h.power*(empowered?1.25:1),h);
   if(empowered)api.control(p,e,h.now,'root',.5,a);
  }
  if(a.subclassId==='holyknight'&&c.finisher){
   const pos=targets[0]||api.point(p,w,aim,a.range*.7);visual(api,h,p,a,'holySlam',{x:pos.x,y:pos.y-5,radius:38,ttl:.4});
  }else visual(api,h,p,a,a.subclassId==='sinner'?'graveCleave':a.id==='oathkeeperBastionBash'?'bash':'arc',{range:a.range,radius:a.range,ttl:.4});
 }else if(mode==='pierce'){
  // Uses the existing swept projectile/collision path; no through-wall ray hit.
  if(s.shots.length>=32)s.shots.shift();
  s.shots.push({a,x:p.x,y:p.y-6,aim:{...aim},travelled:0,power:h.power,hit:new Set(),speed:650,until:h.now+2});
 }else if(mode==='field'){
  const pos=a.subclassId==='holyknight'?{x:p.x,y:p.y}:aimedGround(p,w,a,h,api);
  o.fields=o.fields.filter(f=>f.a.id!==a.id);if(o.fields.length>=4)o.fields.shift();
  o.fields.push({a,...pos,power:h.power,until:h.now+duration,nextTick:h.now+.2,nextVisual:0});
  visual(api,h,p,a,a.subclassId==='sinner'?'graveField':'field',{...pos,layer:'behind',radius:a.subclassRadius,ttl:.6});
 }else if(mode==='heal'){
  let fraction;
  if(a.subclassId==='holyknight'){fraction=.12+o.resolve*.04;o.resolve=0;}
  else {const spent=s.penance>=3?3:0;s.penance-=spent;fraction=.14+(spent ? .1 : 0);}
  selfHeal(p,w,a,h,api,fraction);visual(api,h,p,a,a.subclassId==='sinner'?'graveReclaim':'ritual',{radius:55,ttl:.7});
 }else if(mode==='ward'||mode==='retaliation'){
  guard(p,w,a,h,api,c.ward,a.duration);
  o.guard={a,power:h.power,until:h.now+duration,nextReply:0,replies:0,stored:0,debt:mode==='retaliation'};
  visual(api,h,p,a,a.subclassId==='sinner'?'swordGuard':mode==='retaliation'?'oathDebt':'ward',{radius:60,ttl:.6});
 }else if(mode==='empower'){
  s.penance=Math.min(6,s.penance+2);s.lastHit=h.now;
  o.borrowed={a,power:h.power,until:h.now+duration,hits:3};
  visual(api,h,p,a,'swordGuard',{radius:65,ttl:.6});
 }else if(mode==='mark'){
  o.mark={a,target,power:h.power,until:h.now+6,hits:0};
  visual(api,h,p,a,a.subclassId==='sinner'?'graveMark':'mark',{x:target.x,y:target.y-32,radius:25,ttl:.5});
 }else if(mode==='burst'){
  const pos=a.range?aimedGround(p,w,a,h,api):{x:p.x,y:p.y};
  const empowered=c.spender?s.penance>=3:c.finisher&&o.resolve>=3;
  if(empowered){if(c.spender)s.penance-=3;else o.resolve-=3;}
  if(c.delay){
   if(o.pending.length>=8)o.pending.shift();
   o.pending.push({a,...pos,power:h.power,at:h.now+c.delay,empowered});
   visual(api,h,p,a,'oathWarning',{...pos,radius:a.subclassRadius,ttl:c.delay,layer:'behind'});
  }else impact(p,w,a,s,h,api,pos,h.power,empowered);
 }
 h.pay(a);h.cooldown(a);
 if(a.subclassHealthCost)p.hp=Math.max(1,p.hp-Math.min(Math.max(0,p.hp-1),Math.floor(p.hp*a.subclassHealthCost)));
 return true;
}
export function onOathkeeperMorphHit(p,w,a,e,dealt,s,h,api,extra){
 const c=cfg(a);if(!c||!dealt)return;
 if(c.root&&!extra.proc&&!extra.channelTick)api.control(p,e,h.now,'root',c.root,a);
 if(c.slow)api.control(p,e,h.now,'slow',c.slow,a);
 if(!extra.proc&&!extra.channelTick&&c.builder&&close(p,e)){
  build(s,a.subclassId,h.now);
  if(c.drain){
   const o=owned(s);if(h.now>=o.healAt){o.healAt=h.now+1;o.healed=0;}
   const budget=Math.max(0,p.maxHp*.03-o.healed),amount=Math.min(budget,dealt*.12);
   if(amount>0){const before=p.hp;api.heal(p,w,a,amount,p.x,p.y,0,h);const gained=p.hp-before;
    // Expertise/healing power cannot bypass the shared maximum.
    if(gained>budget)p.hp-=gained-budget;o.healed+=Math.min(budget,gained);}
  }
 }
}
export function onOathkeeperGuardContact(p,s,enemy,amount,now,blocked){
 const o=s.oath,g=o?.guard;if(!g||g.until<=now||!live(enemy)||!s.world?.enemies?.includes(enemy)||amount<=0)return;
 if(g.debt){if(!blocked)g.stored=Math.min(g.power*.75,g.stored+amount*.35);return;}
 if(g.nextReply>now||g.replies>=5)return;
 const range=g.a.subclassId==='holyknight'?110:240;
 if(Math.hypot(enemy.x-p.x,enemy.y-p.y)>range)return;
 if(g.a.subclassId==='holyknight'&&!blocked)return;
 g.nextReply=now+1;g.replies++;if(o.contacts.length<16)o.contacts.push({a:g.a,target:enemy,power:g.power*.55,guard:true});
}
export function onOathkeeperWeaponContact(p,e,s,now,families){
 if(!e||!s.world?.enemies?.includes(e)||!close(p,e))return;
 for(const family of ['holyknight','sinner'])if(families.has(family))build(s,family,now);
 const o=owned(s),mark=o.mark;
 if(mark&&mark.target===e&&mark.until>now&&++mark.hits>=3){
  if(o.contacts.length<16)o.contacts.push({...mark,x:e.x,y:e.y,heal:.06,judgment:true});o.mark=null;
 }
 const b=o.borrowed;
 if(b&&b.until>now&&b.hits>0){b.hits--;if(o.contacts.length<16)o.contacts.push({a:b.a,target:e,x:e.x,y:e.y,power:b.power,borrowed:true});if(!b.hits)o.borrowed=null;}
}
export function buildOathkeeperBlock(s,now){build(s,'holyknight',now);}
export function updateOathkeeperMorphs(p,w,s,h,api){
 const o=s.oath;if(!o)return;
 const sources=[...o.fields,...o.pending,...o.contacts,o.guard,o.mark,o.borrowed].filter(Boolean);
 for(const {a} of sources)if(p.active===false||!p.knownAbilities?.includes(a.id)||p.abilityMorphs?.[a.id]!==a.subclassId){
  clearOathkeeperMorph(s,a.id);
  if(p.buffs?.defense?.sourceAbilityId===a.id)delete p.buffs.defense;
 }
 if(s.lastHit&&h.now-s.lastHit>8)o.resolve=0;
 for(const pending of o.pending)if(pending.at<=h.now){impact(p,w,pending.a,s,h,api,pending,pending.power,pending.empowered);pending.done=true;}
 o.pending=o.pending.filter(f=>!f.done);
 for(const f of o.fields){
  if(f.until<=h.now)continue;
  if(h.now>=f.nextTick){
   f.nextTick=h.now+(cfg(f.a).tick||.8);
   const targets=api.nearby(w,f.x,f.y,f.a.subclassRadius,f.a.maxHits).filter(e=>api.sight(w,p.x,p.y,e));
   let damaged=0;for(const e of targets)if(api.hit(p,w,f.a,e,f.power,h,{proc:true}))damaged++;
   if(Math.hypot(p.x-f.x,p.y-f.y)<=f.a.subclassRadius&&api.sight(w,f.x,f.y,p)){
    guard(p,w,f.a,h,api,cfg(f.a).ward,.95);
    if(f.a.subclassId==='holyknight')p.stamina=Math.min(p.maxStamina,p.stamina+2);
    else if(damaged)selfHeal(p,w,f.a,h,api,.008);
   }
  }
  if(h.now>=f.nextVisual){f.nextVisual=h.now+.55;visual(api,h,p,f.a,f.a.subclassId==='sinner'?'graveField':'field',{x:f.x,y:f.y,radius:f.a.subclassRadius,layer:'behind',ttl:.6});}
 }
 o.fields=o.fields.filter(f=>f.until>h.now);
 const g=o.guard;
 if(g&&g.until>h.now&&h.now>=(g.nextVisual||0)){
  g.nextVisual=h.now+.5;visual(api,h,p,g.a,g.a.subclassId==='sinner'?'swordGuard':g.debt?'oathDebt':'ward',{radius:60,chargeProgress:g.stored/Math.max(1,g.power*.75),ttl:.55});
 }
 if(o.borrowed&&o.borrowed.until>h.now&&h.now>=(o.borrowed.nextVisual||0)){
  o.borrowed.nextVisual=h.now+.5;visual(api,h,p,o.borrowed.a,'swordGuard',{radius:44,swordCount:o.borrowed.hits,ttl:.55});
 }
 if(o.mark&&o.mark.until>h.now&&h.now>=(o.mark.nextVisual||0)&&live(o.mark.target)){
  o.mark.nextVisual=h.now+.5;visual(api,h,p,o.mark.a,o.mark.a.subclassId==='sinner'?'graveMark':'mark',{x:o.mark.target.x,y:o.mark.target.y-32,radius:25,ttl:.55});
 }
 if(g&&g.until<=h.now){if(g.debt)impact(p,w,g.a,s,h,api,p,g.power+g.stored);o.guard=null;}
 for(const contact of o.contacts){
  const {a,target}=contact,pos={x:contact.x??target.x,y:contact.y??target.y};
  // A killing third contact still earns its recovery/cleave if the enemy list
  // removes the corpse before this update. Owner/world cancellation runs first.
  if(contact.heal)selfHeal(p,w,a,h,api,contact.heal);
  if(contact.guard&&!w.enemies?.includes(target))continue;
  const visible=api.sight(w,p.x,p.y,pos);
  if(!visible)continue;
  if(contact.borrowed){
   for(const e of api.nearby(w,pos.x,pos.y,a.subclassRadius,12).filter(e=>e!==target&&api.sight(w,p.x,p.y,e)).slice(0,3)){
    api.hit(p,w,a,e,contact.power*.65,h,{proc:true});visual(api,h,p,a,'graveSword',{x:e.x,y:e.y-6,radius:30,ttl:.4});
   }
  }else{
   if(live(target)&&w.enemies?.includes(target)){
    api.hit(p,w,a,target,contact.power,h,{proc:true});
    if(contact.judgment&&cfg(a).root)api.control(p,target,h.now,'root',cfg(a).root,a);
   }
   if(contact.judgment&&a.subclassId==='sinner')echoes(p,w,a,s,h,api,pos,contact.power,target);
   visual(api,h,p,a,a.subclassId==='sinner'?'graveSword':'holySlam',{x:pos.x,y:pos.y-6,radius:45,ttl:.45});
  }
 }
 o.contacts.length=0;
 if(o.mark&&(!live(o.mark.target)||o.mark.until<=h.now))o.mark=null;
 if(o.borrowed?.until<=h.now)o.borrowed=null;
}
export function updateOathkeeperChannel(p,w,a,s,h,api,power){
 const c=cfg(a);if(!c)return;
 for(const e of api.nearby(w,p.x,p.y,a.subclassRadius,a.maxHits))api.hit(p,w,a,e,power,h,{channelTick:true});
 guard(p,w,a,h,api,c.ward,.6);
 visual(api,h,p,a,a.subclassId==='sinner'?'bladeProcession':'aura',{radius:a.subclassRadius,phaseTime:h.now,ttl:.55});
}
export function clearOathkeeperMorph(s,id){
 const o=s?.oath;if(!o)return;
 for(const key of ['fields','pending','contacts'])o[key]=o[key].filter(f=>f.a.id!==id);
 for(const key of ['guard','mark','borrowed'])if(o[key]?.a?.id===id)o[key]=null;
}
