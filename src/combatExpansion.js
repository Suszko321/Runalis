import {getAbilityEffectiveness} from './skillExpertiseSystem.js';
import {attackProjectileSpeed} from './combatTempo.js';
import {startOathBlades,updateOathBlades} from './oathbladeSystem.js';
import {mythicalChannelGeometry} from './mythicalEquipmentSystem.js';
function continueMythicalAudio(c,a,h,now){if(now>=(c.nextAudioAt||0)){c.nextAudioAt=now+.8;h.audio?.('channelLoop',a);}}
import { getAbilityById } from './data.js';
import { CLASS_COMBAT_PALETTES } from './combatExpansionData.js';
import { startAbilityChannel, stopAbilityChannel, updateAbilityChannel } from './abilityChannelSystem.js';
import { getMasteryBonuses, rewardMobilityMastery, rewardCombatPurpose } from './abilityMasterySystem.js';
import { hasLineOfSight, moveActorWithCollision, isPassable } from './world.js';
import {presentClassMobility} from './classMovement.js';

// Bounded encounter state deliberately stays out of player saves.
const runtimes = new WeakMap();
const valid = e => e && e.hp > 0 && !e.dead && !e.remove && !e.friendly;
const heavy = e => e.isBoss || e.worldBoss || e.massive || (e.radius || e.r || 14) > 25;
export function getCombatTechniqueState(p) { return p?.networkPresentation?p.networkPresentation.techniqueState:runtimes.get(p) || null; }
export function clearCombatTechniqueState(p,reason='cancelled') {
  const s=runtimes.get(p);
  for(const item of s?.marks||[])item.enemy.techniqueMarks=(item.enemy.techniqueMarks||[]).filter(mark=>mark.owner!==p);
  runtimes.delete(p);stopAbilityChannel(p,reason);
}
function state(p,world) {
  let s = runtimes.get(p);
  if (!s || (world && s.world !== world)) {
    if (s && world && s.world !== world) stopAbilityChannel(p,'worldChanged');
    s = {world,effects:[],swarm:[],projectiles:[],events:[],marks:[],statuses:{},nextVisualAt:0};
    runtimes.set(p,s);
  }
  return s;
}
function visible(w,x,y,e) { return !w.tiles?.length || hasLineOfSight(w,x,y,e.x,e.y,{startSkip:1,endSkip:1}); }
function nearby(w,x,y,r,max=12) {
  const result=[];
  for (const e of w.enemies || []) if (valid(e) && Math.hypot(e.x-x,e.y-y) <= r+(e.radius||14) && visible(w,x,y,e)) result.push(e);
  result.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
  return result.slice(0,max);
}
function lineTargets(w,x,y,dx,dy,range,width,max=12) {
  const hits=[];
  for (const e of w.enemies || []) {
    if (!valid(e)) continue;
    const ex=e.x-x,ey=e.y-y,along=ex*dx+ey*dy,across=Math.abs(ex*dy-ey*dx);
    if (along>=0 && along<=range && across<=width+(e.radius||14) && visible(w,x,y,e)) hits.push(e);
  }
  hits.sort((a,b)=>((a.x-x)*dx+(a.y-y)*dy)-((b.x-x)*dx+(b.y-y)*dy));
  return hits.slice(0,max);
}
function target(w,p,aim,range) { return lineTargets(w,p.x,p.y,aim.x,aim.y,range,22,1)[0] || null; }
function point(w,p,aim,range) {
  let x=p.x,y=p.y;
  for (let d=8;d<=range;d+=8) {
    const nx=p.x+aim.x*d,ny=p.y+aim.y*d;
    if (w.tiles?.length && !isPassable(w,nx,ny)) break;
    x=nx;y=ny;
  }
  return {x,y};
}
function fx(h,p,a,profile,x,y,extra={}) {
  h.effect({kind:'combatTechnique',profile,abilityId:a.id,classId:a.classId,
    colors:a.colors||CLASS_COMBAT_PALETTES[a.classId] || CLASS_COMBAT_PALETTES.eldritch,
    masteryTier:a._mastery?.tier || getMasteryBonuses(p,a.id).tier,
    x,y,ttl:.4,layer:'front',...extra});
}
function hit(h,p,a,e,damage,extra={}) {
  if (!valid(e)) return false;
  const now=h.now;
  let scalar=1;
  if (e.hauntedUntil>now && a.skill==='spirit') scalar+=.12;
  if (a.classId==='waverider' && (e.soakedUntil>now || e.hydromancerSoakedUntil>now)) scalar+=.15;
  if (a.classId==='lightbringer' && e.lightbringerHaloBrandUntil>now) scalar+=.15;
  return h.damage(e,damage*scalar,a.skill,{sourceAbilityId:a.id,sourceName:a.name,
    color:CLASS_COMBAT_PALETTES[a.classId]?.[0],magic:a.costType==='spirit',
    sourceMorph:a.subclassId||'base',sunkenCadence:a.channelProfile?.tickInterval,lightbringer:a.classId==='lightbringer',element:a.classId==='lightbringer'?'holy':a.classId==='waverider'?'water':undefined,
    aoe:true,quiet:true,...extra});
}
function control(e,now,type,p,a) {
  const scalar=(heavy(e) ? .18 : e.elite || e.eliteModifier ? .5 : 1)*getAbilityEffectiveness(p,a);
  e.slowTimer=Math.max(e.slowTimer||0,.8*scalar);
  if(type==='root'&&!heavy(e)) e.rootUntil=Math.max(e.rootUntil||0,now+.55*scalar);
}
function pull(w,e,x,y,distance) {
  if (heavy(e)) return;
  const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;
  moveActorWithCollision(e,w,dx/d*Math.min(d,distance),dy/d*Math.min(d,distance));
}
function addEffect(s,a,now,extra) {
  // Same-ability fields replace the oldest after the per-skill cap.
  const max=a.effectProfile==='bloom'?3:2;
  const same=s.effects.filter(e=>e.abilityId===a.id);
  if(same.length>=max) s.effects.splice(s.effects.indexOf(same[0]),1);
  if(s.effects.length>=24)s.effects.shift();
  s.effects.push({ability:a,abilityId:a.id,sourceAbilityId:a.id,profile:a.effectProfile,startedAt:now,
    until:now+4,nextTickAt:now,damage:0,radius:75,...extra});
}
function mark(p,e,a,now,kind,damage=0) {
  e.techniqueMarks=(e.techniqueMarks||[]).filter(m=>m.until>now && !(m.owner===p&&m.abilityId===a.id));
  if(e.techniqueMarks.length>=8)e.techniqueMarks.shift();
  const entry={owner:p,ownerId:p.profileId||p.id||p.slot||1,abilityId:a.id,sourceAbilityId:a.id,
    kind,until:now+8,stacks:0,damage};
  e.techniqueMarks.push(entry);
  const s=runtimes.get(p);
  if(s){s.marks=s.marks.filter(item=>!(item.enemy===e&&item.mark.abilityId===a.id));if(s.marks.length>=24)s.marks.shift();s.marks.push({enemy:e,mark:entry});}
}
function addSwarm(s,p,a,x,y,now,count=4) {
  for(let i=0;i<count;i++) {
    if(s.swarm.length>=24)s.swarm.shift();
    const angle=i*Math.PI*2/count;
    s.swarm.push({abilityId:a.id,sourceAbilityId:a.id,x:x+Math.cos(angle)*12,y:y+Math.sin(angle)*12,
      until:now+3,angle,hits:0,nextHitAt:now,kind:a.effectProfile==='seed'?'seed':'spirit',damage:a.damage||8});
  }
}
function addShot(s,a,x,y,aim,now,extra={}) {
  if(s.projectiles.length>=48)s.projectiles.shift();
  const shot={ability:a,abilityId:a.id,sourceAbilityId:a.id,x,y,dirX:aim.x,dirY:aim.y,until:now+2,
    speed:500,damage:a.damage||8,profile:a.effectProfile,hit:new Set(),range:a.range,travelled:0,...extra};
  shot.speed=attackProjectileSpeed(a,shot.speed);s.projectiles.push(shot);
}

const handlers = {
  oathBlades(p,w,a,s,h){return startOathBlades(p,w,a,s,h);},
  chain(p,w,a,s,h,aim) {
    const e=target(w,p,aim,a.range); if(!e)return false;
    const anchor={x:e.x,y:e.y};
    if(heavy(e)) {const before={x:p.x,y:p.y};pullActor(p,w,e.x,e.y,Math.min(150,Math.hypot(e.x-p.x,e.y-p.y)-38));rewardMobilityMastery(p,w,a.id,Math.hypot(p.x-before.x,p.y-before.y),h.now,h.log);}
    else pull(w,e,p.x+aim.x*35,p.y+aim.y*35,160);
    fx(h,p,a,'chain',p.x,p.y-10,{endX:anchor.x,endY:anchor.y-8});hit(h,p,a,e,h.power);control(e,h.now,'root',p,a);return true;
  },
  tether(p,w,a,s,h,aim) {
    const e=target(w,p,aim,a.range);if(!e)return false;
    e.fellhunterExposedUntil=h.now+4;e.exposedUntil=h.now+4;
    addEffect(s,a,h.now,{target:e,until:h.now+4,x:p.x,y:p.y,damage:h.power});hit(h,p,a,e,h.power);return true;
  },
  debt(p,w,a,s,h) {s.statuses.debt={abilityId:a.id,until:h.now+5,stored:0,damage:h.power};return true;},
  mandate(p,w,a,s,h,aim) {const e=target(w,p,aim,a.range);if(!e)return false;mark(p,e,a,h.now,'mandate',18*(a._mastery?.damage||1)*getAbilityEffectiveness(p,a));fx(h,p,a,'mandate',e.x,e.y);return true;},
  ricochet(p,w,a,s,h,aim) {addShot(s,a,p.x,p.y-6,aim,h.now,{damage:h.power,bounces:2+(a._mastery?.extraBounce||0),speed:420});return true;},
  deadfall(p,w,a,s,h,aim) {const pos=point(w,p,aim,Math.min(a.range,180));addEffect(s,a,h.now,{...pos,armAt:h.now+.8,until:h.now+10,damage:h.power,radius:85});fx(h,p,a,'deadfall',pos.x,pos.y,{radius:85,ttl:.8,phase:'start'});return true;},
  execution(p,w,a,s,h) {s.statuses.execution={abilityId:a.id,until:h.now+6,refunds:0};fx(h,p,a,'execution',p.x,p.y-8,{ttl:.45});return true;},
  urn(p,w,a,s,h,aim) {const pos=point(w,p,aim,Math.min(a.range,210));addEffect(s,a,h.now,{...pos,until:h.now+.7,releaseAt:h.now+.65,damage:h.power});fx(h,p,a,'urn',p.x,p.y-12,{endX:pos.x,endY:pos.y,ttl:.65});return true;},
  seed(p,w,a,s,h,aim) {return handlers.urn(p,w,a,s,h,aim);},
  echo(p,w,a,s,h,aim) {const e=target(w,p,aim,a.range);if(!e)return false;mark(p,e,a,h.now,'echo',h.power||10);fx(h,p,a,'echo',e.x,e.y);return true;},
  bloom(p,w,a,s,h,aim) {const e=target(w,p,aim,a.range);if(!e)return false;mark(p,e,a,h.now,'bloom',9*(a._mastery?.damage||1)*getAbilityEffectiveness(p,a));fx(h,p,a,'bloom',e.x,e.y);return true;},
  undertow(p,w,a,s,h,aim) {const end=point(w,p,aim,a.range);addEffect(s,a,h.now,{x:p.x,y:p.y,endX:end.x,endY:end.y,dirX:aim.x,dirY:aim.y,damage:h.power,radius:45});return true;},
  pressure(p,w,a,s,h,aim) {addShot(s,a,p.x,p.y-6,aim,h.now,{damage:h.power,speed:850,piercing:true});return true;},
  mirror(p,w,a,s,h) {s.statuses.mirror={ability:a,abilityId:a.id,until:h.now+6,nextReplyAt:0,reduction:a._flowEmpowered?.48:.6};fx(h,p,a,'mirror',p.x,p.y,{ttl:.6});return true;},
  halo(p,w,a,s,h) {addEffect(s,a,h.now,{x:p.x,y:p.y,until:h.now+6,damage:h.power,radius:a.range,follow:true});return true;},
  orbit(p,w,a,s,h) {return handlers.halo(p,w,a,s,h);},
  pillar(p,w,a,s,h,aim) {const pos=point(w,p,aim,Math.min(a.range,250));addEffect(s,a,h.now,{...pos,until:h.now+.95,releaseAt:h.now+.9,damage:h.power,radius:95});fx(h,p,a,'pillar',pos.x,pos.y,{radius:95,ttl:.9,phase:'start'});return true;},
  overexposure(p,w,a,s,h,aim) {const e=target(w,p,aim,a.range);if(!e)return false;mark(p,e,a,h.now,'overexposure',22*(a._mastery?.damage||1)*getAbilityEffectiveness(p,a));fx(h,p,a,'overexposure',e.x,e.y);return true;},
  angle(p,w,a,s,h,aim) {const end=point(w,p,aim,a.range);addEffect(s,a,h.now,{x:p.x,y:p.y,endX:end.x,endY:end.y,dirX:aim.x,dirY:aim.y,until:h.now+5,damage:h.power,radius:15});return true;}
};
function pullActor(p,w,x,y,distance) {
  const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy)||1;
  moveActorWithCollision(p,w,dx/d*Math.max(0,distance),dy/d*Math.max(0,distance));
}
function mobility(p,w,a,s,h,aim) {
  const before={x:p.x,y:p.y};const sign=a.mobilityProfile.backward?-1:1;
  moveActorWithCollision(p,w,aim.x*a.mobilityProfile.distance*sign*(a._mastery?.range||1),aim.y*a.mobilityProfile.distance*sign*(a._mastery?.range||1));
  const distance=Math.hypot(p.x-before.x,p.y-before.y);if(distance<8)return false;
  presentClassMobility(p,w,before,a,h.now);
  rewardMobilityMastery(p,w,a.id,distance,h.now,h.log);
  const dx=(p.x-before.x)/distance,dy=(p.y-before.y)/distance;
  for(const e of lineTargets(w,before.x,before.y,dx,dy,distance,22)) {
    if(a.effectProfile==='ghostwalk')e.hauntedUntil=h.now+4;
    if(a.effectProfile==='dawnstep')e.lightbringerHaloBrandUntil=h.now+4;
    if(a.damage&&!(a.classId==='fellhunter'&&a.effectProfile==='vault'))hit(h,p,a,e,h.power);
  }
  fx(h,p,a,a.effectProfile,before.x,before.y,{endX:p.x,endY:p.y,ttl:.5});
  if(a.effectProfile==='briarstride')for(const pos of [before,p])addEffect(s,a,h.now,{x:pos.x,y:pos.y,until:h.now+2,damage:h.power*.5,radius:45});
  if(a.effectProfile==='fracture')addEffect(s,a,h.now,{...before,releaseAt:h.now+.65,until:h.now+.7,damage:h.power,radius:70});
  if(a.effectProfile==='vault')addShot(s,a,a.classId==='fellhunter'?before.x:p.x,(a.classId==='fellhunter'?before.y:p.y)-6,aim,h.now,{damage:h.power});
  return true;
}
export function executeCombatTechnique(p,w,a,slot,h) {
  const s=state(p,w),aim=h.aim;h.power=a.damage?Math.max(1,h.power):0;
  if(a.classId==='waverider' && h.flow?.().empowered){a={...a,range:a.range*1.2,_flowEmpowered:true};h.power*=1.3;}
  if(a.channelProfile) {
    const c=startAbilityChannel(p,a,slot,h.now,aim,{damage:h.power,range:a.range,profile:a.effectProfile,ability:a,mythicalMode:a._mythChannel});
    if(!c)return false;
    fx(h,p,a,a.effectProfile,p.x,p.y,{radius:30,range:0,dirX:aim.x,dirY:aim.y,phase:'start',ttl:.4});
    h.audio?.('channelStart',a);
  } else if(a.mobilityProfile) {
    if(!mobility(p,w,a,s,h,aim))return false;
  } else {
    const handler=handlers[a.effectProfile];if(!handler||!handler(p,w,a,s,h,aim))return false;
  }
  h.pay(a);h.cooldown(a);
  return true;
}
export function updateCombatTechniques(p,w,input,dt,now,h) {
  const s=state(p,w);h.now=now;
  if(p.hp<=0 || (p.lifeState && p.lifeState!=='alive')) {s.effects.length=0;s.swarm.length=0;s.projectiles.length=0;s.events.length=0;s.marks.length=0;s.statuses={};stopAbilityChannel(p,'death');return;}
  s.marks=s.marks.filter(item=>valid(item.enemy)&&item.mark.until>now&&!item.mark.triggered);
  updateOathBlades(p,w,s,dt,now,h);
  if(p.activeChannel && !p.activeChannel.subclassId && p.activeChannel.abilityId!=='lightbringerDawncarver') {
    updateAbilityChannel(p,input,dt,now,{payResource:(type,amount)=>h.payResource(type,amount),
      onEnd:c=>h.audio?.('channelEnd',getAbilityById(c.abilityId)),
      onTick:c=>channelTick(p,w,s,c,h)});
    if(p.activeChannel) {
      const c=p.activeChannel;
      // Refresh the end time without restarting the pose on damage ticks.
      if(p.visualAction?.abilityId===c.abilityId)p.visualAction.duration=c.duration;
    }
  }
  for(const event of s.events.splice(0,32)) {
    const a=event.ability||getAbilityById(event.abilityId);if(!a)continue;
    if(event.kind==='echo')h.summon?.(a,event.x,event.y,5);
    else if(event.kind==='bloom')addEffect(s,a,now,{x:event.x,y:event.y,until:now+5,damage:event.damage||9,radius:115});
    else if(event.kind==='execution') {
      const entries=Object.entries(p.cooldowns||{}).filter(([id])=>getAbilityById(id)?.classId==='fellhunter'&&id!==a.id);
      entries.sort((a,b)=>b[1]-a[1]);if(entries[0]) {
        p.cooldowns[entries[0][0]]-=3*getAbilityEffectiveness(p,a);
        const charges=p.abilityUseCharges?.[entries[0][0]];
        if(charges?.rechargeQueue?.length)charges.rechargeQueue.shift();
      }
      rewardCombatPurpose(p,w,a.id,4,now,h.log);
    } else if(valid(event.target)) {hit(h,p,a,event.target,event.damage,{proc:true,quiet:false,stagger:true});fx(h,p,a,a.effectProfile,event.target.x,event.target.y,{radius:65});}
  }
  const debt=s.statuses.debt;
  if(debt&&now>=debt.until) {
    const a=getAbilityById(debt.abilityId);for(const e of nearby(w,p.x,p.y,125))hit(h,p,a,e,debt.damage+Math.min(80,debt.stored),{stagger:true,quiet:false});
    fx(h,p,a,'debt',p.x,p.y,{radius:125});delete s.statuses.debt;
  }
  for(const key of ['mirror','execution'])if(s.statuses[key]?.until<=now)delete s.statuses[key];
  for(const e of s.effects) {
    const a=e.ability||getAbilityById(e.abilityId);if(e.follow){e.x=p.x;e.y=p.y;}
    if(e.target&&!valid(e.target)){e.until=now;continue;}
    if(e.releaseAt && now>=e.releaseAt && !e.released) {
      e.released=true;
      if(['urn','seed'].includes(e.profile))addSwarm(s,p,{...a,damage:e.damage},e.x,e.y,now,4+getMasteryBonuses(p,a.id).extraSwarm);
      else for(const foe of nearby(w,e.x,e.y,e.radius))hit(h,p,a,foe,e.damage,{quiet:false,stagger:true});
      fx(h,p,a,e.profile,e.x,e.y,{radius:e.radius,phase:'impact',ttl:.55});
    }
    if(e.until<=now || now<e.nextTickAt)continue;e.nextTickAt=now+.6;
    if(['urn','seed','pillar','fracture'].includes(e.profile))continue;
    if(e.profile==='tether') {
      const d=Math.hypot(e.target.x-p.x,e.target.y-p.y);
      if(d>110) {if(heavy(e.target))pullActor(p,w,e.target.x,e.target.y,22);else pull(w,e.target,p.x,p.y,30);}
      control(e.target,now,'slow',p,a);
      fx(h,p,a,'tether',p.x,p.y-8,{endX:e.target.x,endY:e.target.y-8,ttl:.65});continue;
    }
    const targets=['angle','undertow'].includes(e.profile)?lineTargets(w,e.x,e.y,e.dirX,e.dirY,Math.hypot(e.endX-e.x,e.endY-e.y),e.radius):nearby(w,e.x,e.y,e.radius);
    if(e.profile==='deadfall' && (now<e.armAt || !targets.length)){fx(h,p,a,e.profile,e.x,e.y,{radius:e.radius,ttl:.65,phase:'start',armed:now>=e.armAt});continue;}
    for(const foe of targets) {
      if(e.profile==='undertow') {
        const along=Math.max(0,(foe.x-e.x)*e.dirX+(foe.y-e.y)*e.dirY);
        pull(w,foe,e.x+along*e.dirX,e.y+along*e.dirY,18);foe.soakedUntil=now+3;foe.hydromancerSoakedUntil=now+3;control(foe,now,'slow',p,a);
      }
      hit(h,p,a,foe,e.damage,{quiet:e.profile!=='deadfall',stagger:e.profile==='deadfall'});
    }
    fx(h,p,a,e.profile,e.x,e.y,{radius:e.radius,endX:e.endX,endY:e.endY,ttl:.65,phase:e.profile==='deadfall'?'impact':'active'});
    if(e.profile==='deadfall'&&targets.length)e.until=now;
  }
  s.effects=s.effects.filter(e=>e.until>now);
  updateShots(p,w,s,dt,now,h);updateSwarm(p,w,s,dt,now,h);
  if(now>=s.nextVisualAt) {
    s.nextVisualAt=now+.12;
    if(p.activeChannel && !p.activeChannel.subclassId && p.activeChannel.abilityId!=='lightbringerDawncarver') {
      const c=p.activeChannel,a=c.ability||getAbilityById(c.abilityId);
      const shape=mythicalChannelGeometry(p,c);
      if(shape.mode==='torrentSweep'){fx(h,p,a,'mythicTorrent',p.x,p.y,{dirX:shape.dirX,dirY:shape.dirY,width:shape.width,range:c.range,ttl:.2,phase:'active'});continueMythicalAudio(c,a,h,now);return;}
      const end=point(w,p,{x:c.dirX,y:c.dirY},c.range);
      const visualRange=Math.hypot(end.x-p.x,end.y-p.y);
      const flow=Number(p.passiveState?.hydromancerFlowStacks||0);
      fx(h,p,a,c.profile,p.x,p.y,{dirX:c.dirX,dirY:c.dirY,radius:c.profile==='maelstrom'?c.range*(1+Math.min(3,flow)*.08):c.range,range:visualRange,ttl:.2,phase:'active',elapsed:c.elapsed,layer:c.profile==='maelstrom'?'behind':'front'});
      if(now>=(c.nextAudioAt||0)){c.nextAudioAt=now+.8;h.audio?.('channelLoop',a);}
    }
  }
}
function channelTick(p,w,s,c,h) {
  const a=c.ability || getAbilityById(c.abilityId),now=h.now;
  const shape=mythicalChannelGeometry(p,c);
  if(shape.mode==='torrentSweep'){
    for(const e of lineTargets(w,p.x,p.y,shape.dirX,shape.dirY,c.range,shape.width,8)){hit(h,p,a,e,c.damage*shape.damageMultiplier,{channelTick:true});e.soakedUntil=now+2;}return;
  }
  if(shape.mode==='starChain'){
    const primary=lineTargets(w,p.x,p.y,c.dirX,c.dirY,c.range,22,1)[0];
    if(primary){hit(h,p,a,primary,c.damage*.78,{channelTick:true});for(const e of nearby(w,primary.x,primary.y,120,4).filter(e=>e!==primary).slice(0,2)){hit(h,p,a,e,c.damage*.28,{channelTick:true,proc:true});fx(h,p,a,'conduit',primary.x,primary.y,{endX:e.x,endY:e.y,ttl:.2});}}return;
  }
  let targets=[];
  if(c.profile==='litany')targets=c.retaliationUntil > now ? nearby(w,p.x,p.y,c.range) : [];
  else if(c.profile==='maelstrom') {
    const flow=Number(p.passiveState?.hydromancerFlowStacks || 0);
    targets=nearby(w,p.x,p.y,c.range*(1+Math.min(3,flow)*.08));
    for(const e of targets){pull(w,e,p.x,p.y,heavy(e)?0:7);control(e,now,'slow',p,a);e.soakedUntil=now+2;e.hydromancerSoakedUntil=now+2;}
  } else targets=lineTargets(w,p.x,p.y,c.dirX,c.dirY,c.range,c.profile==='thornstorm'?50:70,c.profile==='host'?3:c.profile==='conduit'?1:8);
  if(c.profile==='host')for(const e of targets)addShot(s,a,p.x-c.dirY*18,p.y+c.dirX*18,{x:c.dirX,y:c.dirY},now,{target:e,damage:c.damage,speed:260,profile:'host'});
  else {
    for(const e of targets){hit(h,p,a,e,c.damage,{channelTick:true});if(c.profile==='thornstorm'){control(e,now,'root',p,a);h.wound?.(e,a.id,c.damage*.15);}}
    if(c.profile==='conduit'&&targets[0]&&c.elapsed>1.2)for(const e of nearby(w,targets[0].x,targets[0].y,100,3))if(e!==targets[0]){hit(h,p,a,e,c.damage*.5,{channelTick:true});fx(h,p,a,'conduit',targets[0].x,targets[0].y,{endX:e.x,endY:e.y,ttl:.2});}
  }
}
function updateShots(p,w,s,dt,now,h) {
  for(const shot of s.projectiles) {
    if(shot.until<=now)continue;
    if(valid(shot.target)) {const d=Math.hypot(shot.target.x-shot.x,shot.target.y-shot.y)||1;shot.dirX=(shot.target.x-shot.x)/d;shot.dirY=(shot.target.y-shot.y)/d;}
    const distance=Math.min(.1,dt)*shot.speed,steps=Math.max(1,Math.ceil(distance/6));
    for(let i=0;i<steps&&shot.until>now;i++) {
      shot.x+=shot.dirX*distance/steps;shot.y+=shot.dirY*distance/steps;shot.travelled+=distance/steps;
      if((w.tiles?.length&&!isPassable(w,shot.x,shot.y)) || shot.travelled>shot.range){shot.until=now;break;}
      const e=(w.enemies||[]).find(e=>valid(e)&&!shot.hit.has(e)&&Math.hypot(e.x-shot.x,e.y-shot.y)<(e.radius||14)+6);
      if(!e)continue;
      shot.hit.add(e);const a=shot.ability||getAbilityById(shot.abilityId);hit(h,p,a,e,shot.damage,{projectile:true,ranged:true,quiet:false});
      fx(h,p,a,shot.profile,e.x,e.y,{phase:'impact',radius:22,ttl:.22});
      if(shot.bounces>0) {
        const next=nearby(w,e.x,e.y,170,10).find(foe=>!shot.hit.has(foe));
        if(next){shot.target=next;shot.bounces--;break;}
      }
      if(!shot.piercing){shot.until=now;break;}
    }
  }
  s.projectiles=s.projectiles.filter(shot=>shot.until>now);
}
function updateSwarm(p,w,s,dt,now,h) {
  for(const spirit of s.swarm) {
    if(spirit.until<=now)continue;
    if(!valid(spirit.target))spirit.target=nearby(w,spirit.x,spirit.y,300,1)[0];
    const e=spirit.target;if(!e)continue;
    const dx=e.x-spirit.x,dy=e.y-spirit.y,d=Math.hypot(dx,dy)||1;
    if(d>18) {
      const move=Math.min(d,dt*210),nx=spirit.x+dx/d*move,ny=spirit.y+dy/d*move;
      if(!w.tiles?.length || hasLineOfSight(w,spirit.x,spirit.y,nx,ny)) {spirit.x=nx;spirit.y=ny;}
      else spirit.until=now;
    } else if(now>=spirit.nextHitAt) {
      spirit.nextHitAt=now+.7;spirit.hits++;const a=getAbilityById(spirit.abilityId);
      hit(h,p,a,e,spirit.damage,{summon:true});if(spirit.kind==='seed')h.wound?.(e,a.id,2);
      if(spirit.hits>=3)spirit.until=now;
    }
  }
  s.swarm=s.swarm.filter(spirit=>spirit.until>now);
}
export function onTechniqueDamage(p,e,skill,id,damage,now) {
  const s=runtimes.get(p);if(!s)return;
  for(const mark of e.techniqueMarks||[]) {
    if(mark.owner!==p||mark.until<now||mark.triggered||mark.abilityId===id)continue;
    const matches=mark.kind==='mandate'&&['blade','blunt'].includes(skill) || mark.kind==='overexposure'&&id&&getAbilityById(id)?.classId==='lightbringer';
    if(!matches)continue;
    mark.stacks++;if(mark.stacks>=(mark.kind==='mandate'?3:4)){mark.triggered=true;if(s.events.length<32)s.events.push({kind:'strike',abilityId:mark.abilityId,target:e,damage:mark.damage+damage*.5});}
  }
}
export function notifyTechniqueDeath(e,contributors,now) {
  for(const mark of e.techniqueMarks||[]) {
    const s=runtimes.get(mark.owner);if(!s||mark.until<now)continue;
    if(['echo','bloom'].includes(mark.kind)&&s.events.length<32)s.events.push({kind:mark.kind,abilityId:mark.abilityId,x:e.x,y:e.y,damage:mark.damage});
  }
  for(const c of contributors) {
    const p=c.actor,s=runtimes.get(p);if(!s)continue;
    const execution=s.statuses.execution;
    if(execution&&execution.until>now&&execution.refunds<3&&c.lastWeaponType && !c.lastAbilityId && e.lastDamagedByActorId===c.actorId && ((e.exposedUntil||e.fellhunterExposedUntil||0)>now || e.wasWoundedOnLastHit)) {
      execution.refunds++;s.events.push({kind:'execution',abilityId:execution.abilityId});
    }
    if(p.activeChannel?.profile==='host' && c.abilities?.[p.activeChannel.abilityId]) {
      const a=getAbilityById(p.activeChannel.abilityId);addSwarm(s,p,{...a,damage:3},e.x,e.y,now,1);
    }
  }
}
export function mitigateTechniqueDamage(p,e,amount,now,w=null,log=null) {
  const s=runtimes.get(p);if(!s)return amount;
  let reduced=amount;
  const c=p.activeChannel;
  if(c?.profile==='litany') {
    const dx=e.x-p.x,dy=e.y-p.y;
    if(dx*c.dirX+dy*c.dirY>=0) {
      c.retaliationUntil=now+.65;
      reduced*=1-Math.min(.72,.55*getAbilityEffectiveness(p,c.abilityId));
      p.passiveState=p.passiveState||{};
      p.passiveState.oathboundRiposteStacks=Math.min(3,(p.passiveState.oathboundRiposteStacks||0)+1);
      p.passiveState.oathboundRiposteUntil=now+4.2;
      if(w)rewardCombatPurpose(p,w,c.abilityId,(amount-reduced)*.15,now,log);
    }
  }
  const mirror=s.statuses.mirror;
  if(mirror&&mirror.until>now&&(e.attackRange>80||e.ranged||e.behavior==='ranged')) {
    reduced*=1-Math.min(.72,(1-(mirror.reduction??.6))*getAbilityEffectiveness(p,mirror.abilityId));
    if(w)rewardCombatPurpose(p,w,mirror.abilityId,(amount-reduced)*.2,now,log);
    if(now>=mirror.nextReplyAt){mirror.nextReplyAt=now+.7;s.events.push({kind:'strike',ability:mirror.ability,abilityId:mirror.abilityId,target:e,damage:5*getAbilityEffectiveness(p,mirror.abilityId)});}
  }
  if(s.statuses.debt?.until>now)s.statuses.debt.stored+=reduced*.45;
  return Math.max(0,Math.ceil(reduced));
}
export function consumeOrbitalHalo(p) {
  const s=runtimes.get(p);if(!s)return false;
  const halo=s.effects.find(e=>e.profile==='halo');if(!halo)return false;
  s.effects=s.effects.filter(e=>e!==halo);return true;
}
