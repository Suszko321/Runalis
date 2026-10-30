import {ELITE_MODIFIERS,encounterRng} from './encounterData.js';
import {hasLineOfSight,isActorPositionPassable,moveActorWithCollision} from './world.js';
import {enemyWithinTargetView} from './enemyVisibility.js';
import {isDodgeInvulnerable} from './combatActions.js';
import {telegraphContainsPoint} from './enemyTelegraphGeometry.js';
import {eliteCueProfile,playEliteCue} from './eliteHazardPresentation.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,getBasicEnemyAttack,getEnemyCharge,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';

// The existing encounter coordinator owns all effects. Nothing here is saved:
// cooldowns restart on load and no collision wall can survive its visible art.
const runtimes=new WeakMap(),states=new WeakMap();
const alive=e=>e&&!e.dead&&!e.remove&&e.alive!==false&&e.hp>0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function runtime(w){let r=runtimes.get(w);if(!r){r={clock:0,hazards:[],budgetAt:0,budget:0,motion:new WeakMap(),actors:[]};runtimes.set(w,r);}return r;}
function state(e){let s=states.get(e);if(!s){const rng=encounterRng(e.id);s={next:2+rng()*3,index:0,death:false,phase:rng()*7,frontalHits:0,healRemaining:Math.max(0,Math.min(e.maxHp*.3,e.eliteHealRemaining??e.maxHp*.3))};states.set(e,s);e.eliteHealing=e.eliteGuardActive=false;e.eliteAttackPauseTimer=0;}return s;}
export function eliteThreatTier(e){
 const level=Number(e.combatLevel||e.level||1);
 if(level<=7||e.questCritical||e.isDungeonMainBoss)return 1;
 if(level>=30&&e.encounterTier==='champion')return 4;
 return level>=20&&['rare','champion'].includes(e.encounterTier)?3:2;
}
export function clearEliteFrost(p,now=performance.now()/1000){const affected=p.eliteFrost>0||p.eliteFrozenUntil>now;p.eliteFrost=0;p.eliteFrozenUntil=0;if(affected)p.eliteFrostRecoveryUntil=now+7;}
export function getEliteControlMultiplier(p,now=performance.now()/1000){return p.eliteFrozenUntil>now?0:(p.eliteFrost||0)>=65?.45:(p.eliteFrost||0)>0?.72:1;}
export function clearEliteEncounters(world){
 const r=runtimes.get(world);if(r){r.hazards.length=0;for(const p of r.actors){delete p.eliteFrost;delete p.eliteFrozenUntil;delete p.eliteFrostRecoveryUntil;}r.actors=[];r.motion=new WeakMap();}
 world.encounterBarriers=[];for(const e of world.enemies||[]){e.eliteGuardActive=e.eliteHealing=false;e.eliteTelegraph=null;e.eliteAttackPauseTimer=0;states.delete(e);cancelEnemyAttackPresentation(e);}
}
export function getEliteHazards(world){return world?.networkGuest?world.networkPresentation?.eliteEncounters?.hazards||[]:runtimes.get(world)?.hazards||[];}
export function getEliteActors(world){return world?.networkGuest?world.networkPresentation?.eliteEncounters?.actors||[]:runtimes.get(world)?.actors||[];}
export function getEliteStatePresentation(enemy){if(enemy.networkPresentation?.eliteState)return enemy.networkPresentation.eliteState;const s=states.get(enemy);return {guardCharge:s?.frontalHits||0,healProgress:s?.healEnd?clamp(1-(s.healEnd-s.clock)/1.8,0,1):0,healReleased:s?.healVisualEnd>s?.clock,healReleaseProgress:s?.healVisualEnd?clamp(1-(s.healVisualEnd-s.clock)/.4,0,1):0};}
export function resetEliteEnemy(world,enemy){
 const r=runtimes.get(world);if(r)r.hazards=r.hazards.filter(h=>h.owner!==enemy);
 world.encounterBarriers=(world.encounterBarriers||[]).filter(b=>b.owner!==enemy);
 states.delete(enemy);delete enemy.eliteHealRemaining;enemy.eliteGuardActive=enemy.eliteHealing=false;enemy.eliteAttackPauseTimer=0;enemy.eliteTelegraph=null;cancelEnemyAttackPresentation(enemy);
}
export function mitigateEliteHit(enemy,source,damage,options={}){
 if(enemy.arenaDormant)return 0;
 const s=states.get(enemy);
 if(enemy.eliteGuardActive&&source&&!options.aoe&&!options.dot){
  const dx=source.x-enemy.x,dy=source.y-enemy.y,d=Math.hypot(dx,dy)||1;
  if((dx*enemy.eliteGuardX+dy*enemy.eliteGuardY)/d>.45){if(s)s.frontalHits=Math.min(3,s.frontalHits+1);return Math.max(1,Math.ceil(damage*.35));}
 }
 return damage;
}
// Control still affects ordinary movement/combat. Elite modifiers cannot be
// interrupted: committed effects finish unless their caster dies or is unloaded.
function inactive(e){return e.returningHome||e.arenaDormant;}
function casterSight(world,e,p){const barriers=world.encounterBarriers||[];return hasLineOfSight(barriers.some(b=>b.owner===e)?{...world,encounterBarriers:barriers.filter(b=>b.owner!==e)}:world,e.x,e.y,p.x,p.y);}
function nearbyPressure(r,p,owner){return r.hazards.filter(h=>!h.cancelled&&h.owner!==owner&&distance(h,p)<h.radius+140&&h.age<h.warning+h.duration);}
function addHazard(world,owner,kind,x,y,radius,warning,duration,extra={}){
 const r=runtime(world);if(r.hazards.length>=24||r.hazards.filter(h=>h.owner===owner).length>=6)return null;
 if(!isActorPositionPassable(world,x,y,4))return null;
 const cue=eliteCueProfile(kind),floor=kind==='artillery'&&extra.secondary&&!extra.frozenExecution?cue.committedWarning:cue.minimumWarning;
 warning=Math.max(warning,floor);
 const h={owner,kind,x,y,radius,warning,duration,age:0,nextTick:warning,hit:new Set(),tier:eliteThreatTier(owner),danger:'major',multiplier:1,...extra};
 if(kind==='artillery'&&h.locked){h.launchSourceX=owner.x;h.launchSourceY=owner.y-38;}
 r.hazards.push(h);playEliteCue(kind,'warning',h.danger);return h;
}
export function getEliteHazardGeometry(h){return h.geometry||{shape:'circle',x:h.x,y:h.y,radius:h.radius};}
export function getWallerSegments(h){
 if(h.plannedSegments)return h.plannedSegments;
 const r=h.radius,t=12,g=h.tier>=2?64:0,opening=h.opening||'south';
 const left={x:h.x-r,y:h.y-r,w:t,h:2*r},right={x:h.x+r-t,y:h.y-r,w:t,h:2*r};
 const top={x:h.x-r,y:h.y-r,w:2*r,h:t},bottom={x:h.x-r,y:h.y+r-t,w:2*r,h:t};
 const split=(side)=>side==='north'||side==='south'?[{x:h.x-r,y:side==='north'?h.y-r:h.y+r-t,w:r-g/2,h:t},{x:h.x+g/2,y:side==='north'?h.y-r:h.y+r-t,w:r-g/2,h:t}]:[{x:side==='west'?h.x-r:h.x+r-t,y:h.y-r,w:t,h:r-g/2},{x:side==='west'?h.x-r:h.x+r-t,y:h.y+g/2,w:t,h:r-g/2}];
 return [opening!=='west'&&left,opening!=='east'&&right,opening!=='north'&&top,opening!=='south'&&bottom,...(g?split(opening):[])].filter(Boolean);
}
function wallExit(h){const d=h.radius+36;return{x:h.x+(h.opening==='east'?d:h.opening==='west'?-d:0),y:h.y+(h.opening==='south'?d:h.opening==='north'?-d:0)};}
function escapeValid(world,h,actors){
 const exit=wallExit(h),near=actors.filter(p=>distance(h,p)<h.radius+35);
 const samples=20;
 return isActorPositionPassable(world,exit.x,exit.y,18)&&near.every(p=>{
  // Check a centre-to-door route in the existing terrain, including exterior.
  const inside={x:h.x+(exit.x-h.x)*.8,y:h.y+(exit.y-h.y)*.8};
  return [[p,inside],[inside,exit]].every(([a,b])=>Array.from({length:samples+1},(_,i)=>({x:a.x+(b.x-a.x)*i/samples,y:a.y+(b.y-a.y)*i/samples})).every(q=>isActorPositionPassable(world,q.x,q.y,Math.max(12,p.r||p.radius||10))));
 });
}
function plannedWall(world,e,p,motion,tier,actors){
 const h={x:p.x+motion.x*.2,y:p.y+motion.y*.2,radius:tier>=3?126:96,tier,opening:'south'};
 const preferred=Math.abs(motion.x)>Math.abs(motion.y)?(motion.x>0?'west':'east'):Math.abs(motion.y)>10?(motion.y>0?'north':'south'):'south';
 for(const side of [preferred,'south','north','east','west']){
  h.opening=side;if(!escapeValid(world,h,actors))continue;
  const segments=getWallerSegments(h);
  // Sample the full length, not just corners. Partial terrain placements are
  // rejected, rather than squeezing someone between an invisible wall and rock.
  if(!segments.every(b=>{const n=Math.ceil(Math.max(b.w,b.h)/12);return Array.from({length:n+1},(_,i)=>isActorPositionPassable(world,b.x+(b.w>12?b.w*i/n:6),b.y+(b.h>12?b.h*i/n:6),5)).every(Boolean);}))continue;
  return h;
 }return null;
}
function launch(world,e,p,kind,motion,actors){
 const tier=eliteThreatTier(e),high=tier>=3,r=runtime(world);
 if(kind==='waller'){
  const plan=plannedWall(world,e,p,motion,tier,actors);if(!plan)return false;
  return !!addHazard(world,e,kind,plan.x,plan.y,plan.radius,1.3,high?6.5:3.8,{opening:plan.opening,target:p,tracking:high?.8:0,danger:high?'critical':'major',multiplier:0});
 }
 if(kind==='freezer')return !!addHazard(world,e,kind,p.x,p.y,high?138:95,1.25,3.4,{multiplier:.3,interval:.55,danger:'major'});
 if(kind==='artillery'){
  const cage=r.hazards.find(h=>h.owner===e&&h.kind==='waller'&&h.age>=h.warning);
  const frost=(p.eliteFrost||0)>=65;
  const critical=high||cage&&tier>=2||frost&&tier>=2;
  return !!addHazard(world,e,kind,p.x,p.y,critical?(tier===4?180:150):80,tier===1?1.65:1.4,.36,{target:p,tracking:tier===1?.25:.8,velocity:motion,pattern:critical?'execution':'hunting',danger:tier===4?'execution':critical?'critical':'major',multiplier:tier===4?9:critical?5:2.2,salvo:tier>=2?2:1});
 }
 if(kind==='shocker'){
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,length=Math.min(620,d+170),width=high?36:24;
  const g={shape:'line',x:e.x,y:e.y,endX:e.x+dx/d*length,endY:e.y+dy/d*length,width};
  return !!addHazard(world,e,kind,p.x,p.y,Math.max(100,width),tier===1?1.2:.95,.32,{geometry:g,multiplier:high?4:2,danger:high?'critical':'major',reprise:high});
 }
 if(kind==='vortex')return !!addHazard(world,e,kind,p.x,p.y,high?155:120,1.1,1.4,{multiplier:0,interval:.35,danger:'major'});
 if(kind==='molten')return !!addHazard(world,e,kind,e.x,e.y,high?100:65,.9,4,{multiplier:.6,interval:.7,trail:high});
 if(kind==='bulwark'){
  const angle=Math.atan2(e.eliteGuardY,e.eliteGuardX);
  e.eliteGuardActive=false;
  return !!addHazard(world,e,'bulwark',e.x,e.y,170,.85,.3,{geometry:{shape:'cone',x:e.x,y:e.y,radius:170,angle,halfAngle:.9},multiplier:tier>=3?4:2.2,danger:tier>=3?'critical':'major'});
 }
 return false;
}
function updateFrost(p,step,now,r){
 if(p.eliteFrozenUntil&&p.eliteFrozenUntil<=now){p.eliteFrozenUntil=0;p.eliteFrost=0;}
 if(p.eliteFrozenUntil>now&&p.actionState?.dashing)clearEliteFrost(p,now);
 if(!r.hazards.some(h=>h.kind==='freezer'&&h.age>=h.warning&&h.age<h.warning+h.duration&&distance(h,p)<h.radius+(p.r||10)))p.eliteFrost=Math.max(0,(p.eliteFrost||0)-step*32);
 p.slowTimer=Math.max(0,(p.slowTimer||0)-step);
}
function applyFrost(world,h,p,result,now){
 if(!alive(p)||!result||result.protected||result.dodged||result.blockedByWall||p.controlImmuneUntil>now||p.eliteFrostRecoveryUntil>now)return;
 const resistance=clamp(Math.max(Number(p.slowResistance||0),Number(p.freezeResistance||0)),0,1);
 p.eliteFrost=clamp((p.eliteFrost||0)+(h.tier===1?22:36)*(1-resistance)*(result.blocked&&!result.guardBroken?.4:1),0,100);
 // Keep legacy slow consumers useful without double multiplying movement.
 p.slowTimer=Math.max(p.slowTimer||0,.65);
 if(p.eliteFrost>=100){
  p.eliteFrozenUntil=now+(h.tier===1?1:1.6);p.eliteFrostRecoveryUntil=now+7;
  if(!runtime(world).hazards.some(a=>a.target===p&&['shatter','artillery'].includes(a.kind)&&a.age<a.warning)&&!nearbyPressure(runtime(world),p,h.owner).some(a=>a.danger==='critical'||a.danger==='execution')){
   if(h.tier>=2&&h.owner.eliteModifiers.includes('artillery')){
    addHazard(world,h.owner,'artillery',p.x,p.y,h.tier>=3?150:100,1.4,.32,{target:p,tracking:0,locked:true,frozenExecution:true,multiplier:h.tier===4?9:5,danger:h.tier===4?'execution':'critical',label:'FROZEN EXECUTION · DODGE / GUARD',salvo:1,secondary:true});
    const s=state(h.owner);s.next=Math.max(s.next,runtime(world).clock+4);if(h.owner.eliteModifiers[s.index%h.owner.eliteModifiers.length]==='artillery')s.index++;
   }else addHazard(world,h.owner,'shatter',p.x,p.y,75,1.15,.32,{target:p,multiplier:h.tier===1?2:5,danger:h.tier===1?'major':'critical',label:'SHATTER · DODGE / GUARD'});
  }
 }
}
function impact(world,h,actors,now,hurt,log){
 for(const p of actors){
  if(!alive(p)||!telegraphContainsPoint(getEliteHazardGeometry(h),p.x,p.y,p.r||p.radius||10)||!hasLineOfSight(world,h.x,h.y,p.x,p.y))continue;
  if(h.kind==='vortex'){
   if(!isDodgeInvulnerable(p)&&!(p.invulnerableUntil>now)&&!(p.displacementImmuneUntil>now)){
    const dx=h.x-p.x,dy=h.y-p.y,d=Math.hypot(dx,dy)||1;moveActorWithCollision(p,world,dx/d*Math.min(h.tier>=3?48:28,d),dy/d*Math.min(h.tier>=3?48:28,d));
   }continue;
  }
  const source={...h.owner,combatSource:h.owner,x:h.geometry?.x??h.x,y:h.geometry?.y??h.y};
  const label={shatter:'Shatter',chamber:'Infernal execution',collapse:'Vortex collapse',moltenDeath:'Magma eruption'}[h.kind]||ELITE_MODIFIERS[h.kind]?.name||'Elite strike';
  const result=hurt?.(source,p,Math.max(1,Math.round((h.owner.damage||h.owner.dmg||5)*h.multiplier)),world,log,{label,now,heavy:['critical','execution'].includes(h.danger)});
  if(h.kind==='freezer')applyFrost(world,h,p,result,now);
 }
 if(!h.soundPlayed){playEliteCue(h.kind,'impact',h.danger);h.soundPlayed=true;}
}
function updateHazard(world,h,r,actors,now,step,hurt,log){
 h.age+=step;
 if((!alive(h.owner)||!r.owners.has(h.owner))&&!h.surviveDeath){h.cancelled=true;if(h.age<h.warning)playEliteCue(h.kind,'cancel',h.danger);cancelEnemyAttackPresentation(h.owner);return;}
 if(h.kind==='waller'&&h.age<h.tracking){
  const plan=plannedWall(world,h.owner,h.target,r.motion.get(h.target)||{x:0,y:0},h.tier,actors);
  if(!plan){h.cancelled=true;return;}h.x=plan.x;h.y=plan.y;h.opening=plan.opening;
 }else if(h.kind==='waller'&&!h.locked){h.locked=true;h.lockX=h.x;h.lockY=h.y;playEliteCue('waller','lock',h.danger);}
 if(h.kind==='artillery'&&h.age<h.tracking&&alive(h.target)){
  const m=r.motion.get(h.target)||{x:0,y:0},lead=h.tier>=2?.12:0;
  const x=h.target.x+m.x*lead,y=h.target.y+m.y*lead;
  if(isActorPositionPassable(world,x,y,4)){h.x=x;h.y=y;}
 }else if(h.kind==='artillery'&&!h.locked){h.locked=true;h.lockX=h.x;h.lockY=h.y;}
 if(h.kind==='artillery'&&h.locked&&!h.launchCued){h.launchCued=true;h.launchSourceX??=h.owner.x;h.launchSourceY??=h.owner.y-38;playEliteCue('artillery','launch',h.danger);}
 if(!h.surviveDeath&&!h.secondary){
  const tell={kind:'elite:'+h.kind,pose:['freezer','vortex','molten'].includes(h.kind)?'ritual':'overhead',maxTime:h.warning,time:Math.max(0,h.warning-h.age),recovery:.7,x:h.x,y:h.y};
  if(!h.presentationStarted){beginEnemyAttackPresentation(h.owner,tell,now);h.presentationStarted=true;}
  if(h.age<h.warning)syncEnemyAttackPresentation(h.owner,tell,now);else if(!h.presentationReleased){releaseEnemyAttackPresentation(h.owner,now);h.presentationReleased=true;}
 }
 if(h.kind==='waller'){
  if(h.age<h.warning)return;
  if(!h.segments){
   if(!escapeValid(world,h,actors)){h.cancelled=true;return;}
   h.segments=getWallerSegments(h).filter(b=>!actors.some(p=>p.x>=b.x-24&&p.x<=b.x+b.w+24&&p.y>=b.y-24&&p.y<=b.y+b.h+24)).map(b=>({...b,owner:h.owner}));
   playEliteCue('waller','impact',h.danger);
  }
  world.encounterBarriers.push(...h.segments);
  if(h.tier>=2&&!h.execution&&h.age>=h.warning+1.6){
   h.execution=true;
   if(!nearbyPressure(r,h,h.owner).length)addHazard(world,h.owner,'chamber',h.x,h.y,h.radius-16,1.15,.3,{multiplier:h.tier>=3?5:2.5,danger:h.tier>=3?'critical':'major',label:'CHAMBER · GAP / DODGE / GUARD',secondary:true});
  }return;
 }
 if(h.age<h.nextTick||h.age>h.warning+h.duration)return;
 const first=!h.released;h.released=true;h.nextTick=h.age+(h.interval||10);
 impact(world,h,actors,now,hurt,log);
 if(first&&h.kind==='artillery'&&h.salvo>1){
  const m=r.motion.get(h.target)||{x:0,y:0},target=h.target;
  // Observe the actual escape at impact; the second tell commits immediately.
  // No retargeting after the new warning appears.
  if(alive(target))addHazard(world,h.owner,'artillery',target.x+m.x*.25,target.y+m.y*.25,h.tier>=3?120:85,1.05,.32,{tracking:0,locked:true,multiplier:h.multiplier*.65,danger:h.tier>=3?'critical':'major',secondary:true,salvo:1,label:h.tier>=3?'FOLLOW-UP · CRITICAL · LOCKED':'FOLLOW-UP · LOCKED'});
 }
 if(first&&h.kind==='shocker'&&h.reprise){
  const g=h.geometry,dx=g.endX-g.x,dy=g.endY-g.y,d=Math.hypot(dx,dy)||1;
  const crossed={shape:'line',x:h.x-dy/d*140,y:h.y+dx/d*140,endX:h.x+dy/d*140,endY:h.y-dx/d*140,width:32};
  addHazard(world,h.owner,'shocker',h.x,h.y,175,.85,.3,{geometry:crossed,multiplier:3,danger:'major',secondary:true,label:'CROSSFIRE'});
 }
 if(h.kind==='vortex'&&!h.collapse&&h.age>=h.warning+.65){h.collapse=true;addHazard(world,h.owner,'collapse',h.x,h.y,85,.85,.3,{multiplier:h.tier>=3?4:2,danger:h.tier>=3?'critical':'major',secondary:true,label:'VORTEX COLLAPSE'});}
 if(h.kind==='molten'&&h.trail&&distance(h,h.owner)>55)addHazard(world,h.owner,'molten',h.owner.x,h.owner.y,42,.75,1.8,{multiplier:.5,interval:.75,danger:'minor',secondary:true});
}
export function updateEliteEncounters(world,player,dt,now,hurt,log){
 if(!world)return;if(world.safeZone||['capital','hub','town'].includes(world.mode)){if(runtimes.has(world))clearEliteEncounters(world);return;}
 const r=runtime(world),step=clamp(Number(dt)||0,0,.1);r.clock+=step;
 const party=[player,...(player?.coop?.players||[]).filter(p=>p.active!==false&&p.joined!==false)].filter(alive);
 const actors=party.flatMap(p=>[p,...(p.summons||[]).filter(alive)]);
 for(const previous of r.actors)if(!actors.includes(previous)){delete previous.eliteFrost;delete previous.eliteFrozenUntil;delete previous.eliteFrostRecoveryUntil;}
 r.actors=actors;r.owners=new Set(world.enemies||[]);
 for(const p of actors){const old=r.motion.get(p);r.motion.set(p,{x:old?clamp((p.x-old.px)/(step||1),-260,260):0,y:old?clamp((p.y-old.py)/(step||1),-260,260):0,px:p.x,py:p.y});updateFrost(p,step,now,r);}
 if(r.clock>=r.budgetAt){r.budgetAt=r.clock+1.6;r.budget=0;}
 for(const e of world.enemies||[]){
  if(!e.eliteModifiers?.length)continue;
  const fresh=!states.has(e),s=state(e),tier=eliteThreatTier(e);if(fresh)s.next+=r.clock;s.clock=r.clock;
  if(!alive(e)){
   if(!s.death){s.death=true;if(e.eliteHealing)playEliteCue('regenerator','cancel');s.healEnd=0;r.hazards=r.hazards.filter(h=>h.owner!==e);e.eliteHealing=e.eliteGuardActive=false;
    if(e.eliteModifiers.includes('molten')&&party.some(p=>distance(p,e)<650&&enemyWithinTargetView(e,p,world)))addHazard(world,e,'moltenDeath',e.x,e.y,tier>=3?130:84,1.45,.38,{surviveDeath:true,multiplier:tier>=3?4.5:1.5,danger:tier>=3?'critical':'major'});
   }continue;
  }
  if(s.healEnd){
   if(r.clock>=s.healEnd){
    for(const ally of [e,...(world.enemies||[]).filter(a=>a!==e&&alive(a)&&distance(a,e)<180)]){const heal=Math.min(s.healRemaining,ally.maxHp*(ally===e?.12:.04),ally.maxHp-ally.hp);if(heal>0){ally.hp+=heal;s.healRemaining-=heal;}}
    e.eliteHealRemaining=s.healRemaining;s.healEnd=0;s.healVisualEnd=r.clock+.4;e.eliteHealing=false;s.next=r.clock+9;playEliteCue('regenerator','impact');releaseEnemyAttackPresentation(e,now);
   }continue;
  }
  const target=party.reduce((best,p)=>!best||distance(e,p)<distance(e,best)?p:best,null);
  if(!target||distance(e,target)>650||!enemyWithinTargetView(e,target,world))continue;
  if(!(e.aggro||e.alerted||e.hasDetectedPlayer||e.isInCombat||e.hp<e.maxHp||distance(e,target)<Math.min(220,e.aggroRange||220)))continue;
  if(e.eliteModifiers.includes('bulwark')){
   const guard=(r.clock+s.phase)%7<3.2&&!s.riposteUntil,effectivelyBusy=r.hazards.some(h=>h.owner===e&&h.kind==='bulwark');
   if(!e.eliteGuardActive&&guard&&!effectivelyBusy){const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;e.eliteGuardX=dx/d;e.eliteGuardY=dy/d;playEliteCue('bulwark','guard');}
   e.eliteGuardActive=guard&&!effectivelyBusy;
   if(s.riposteUntil&&r.clock>=s.riposteUntil)s.riposteUntil=0;
  }
  if(s.next>r.clock||r.budget>=2||inactive(e)||e.telegraph||e.boss?.pendingSpecial||getBasicEnemyAttack(e)||getEnemyCharge(e)||!casterSight(world,e,target))continue;
  const pressure=nearbyPressure(r,target,e);
  // A dangerous combination belongs to one readable caster sequence. Multiple
  // casters take turns locally; unrelated packs elsewhere need not stop fighting.
  if(pressure.some(h=>h.danger==='critical'||h.danger==='execution'||h.kind==='waller'||h.kind==='freezer'||h.kind==='vortex')||pressure.length>=2||target.eliteFrozenUntil>now)continue;
  const own=r.hazards.filter(h=>h.owner===e);
  if(own.some(h=>h.age<h.warning&&(h.danger==='critical'||h.danger==='execution')))continue;
  const mods=e.eliteModifiers.filter(m=>m!=='bulwark'),kind=s.frontalHits>=3&&tier>=2?'bulwark':mods[s.index%Math.max(1,mods.length)];
  if(kind==='regenerator'){
   if(s.healRemaining>0&&e.hp<e.maxHp*.9){s.healEnd=r.clock+1.8;e.eliteHealing=true;playEliteCue('regenerator','warning');beginEnemyAttackPresentation(e,{kind:'elite:regenerator',pose:'ritual',maxTime:1.8,time:1.8,recovery:.6,x:e.x,y:e.y},now);r.budget++;}
   s.index++;s.next=r.clock+7;continue;
  }
  if(kind&&launch(world,e,target,kind,r.motion.get(target)||{x:0,y:0},actors)){
   s.index++;s.frontalHits=0;if(kind==='bulwark')s.riposteUntil=r.clock+3;
   s.next=r.clock+(mods.length>1&&tier>=2?3.5:tier===1?9:6.5);r.budget++;e.eliteAttackPauseTimer=2.2;
  }else s.next=r.clock+1;
 }
 world.encounterBarriers=[];
 // Snapshot: follow-up tells created during this tick start next tick, ensuring
 // even a long simulation frame never consumes their response window.
 for(const h of [...r.hazards])updateHazard(world,h,r,actors,now,step,hurt,log);
 r.hazards=r.hazards.filter(h=>!h.cancelled&&h.age<h.warning+h.duration);
 world.encounterBarriers=world.encounterBarriers.filter(b=>r.hazards.some(h=>h.segments?.includes(b)));
}
