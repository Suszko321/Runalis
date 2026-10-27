import {getEnemyVisualProfile,visualHash} from './enemyVisualProfiles.js';
import {moveActorWithCollision,isActorPositionPassable,hasLineOfSight} from './world.js';
import {getBasicEnemyAttack,getEnemyCharge} from './enemyAttackPresentation.js';
import {enemyWithinTargetView} from './enemyVisibility.js';

// Awareness is sampled at 4Hz. Decisions, observations and navigation goals are
// runtime-only; loading a save cannot restore an old flank or reaction timer.
const worlds=new WeakMap(),actors=new WeakMap(),CELL=320;
const live=e=>e&&e.hp>0&&!e.dead&&!e.remove&&!e.dormant&&!e.arenaDormant;
const eligible=e=>live(e)&&!e.isBoss&&!e.worldBoss&&!e.bossId&&!e.bossType&&!e.boss&&!e.malakarSolo&&!e.summonedByBoss&&!e.trainingDummy&&!e.friendly&&!e.nonCombatant&&!e.safeZoneNpc&&!e.simulatedPlayer&&!e.isSimulatedPlayer;
const group=e=>e.dynamicEncounterId||e.populationAreaId||e.encounterGroupId||e.majorPoiId||null;
function compatible(a,b){
 const sa=actors.get(a),sb=actors.get(b),ga=sa.group,gb=sb.group;if(ga||gb)return !!ga&&ga===gb;
 const pa=sa.profile,pb=sb.profile;
 return pa.family==='human'&&pb.family==='human'?pa.faction===pb.faction:
  /Wolf/.test(a.kind)&&/Wolf/.test(b.kind)||pa.family==='skeleton'&&pb.family==='skeleton';
}
function state(e){let s=actors.get(e);if(!s){s={allies:[],until:0,nextChoice:0,retreatAt:0,chargeAt:null,kiteUntil:0,standUntil:0,waitUntil:0,choice:'press',side:visualHash(e.id||e.name||e.kind)%2?1:-1};actors.set(e,s);}return s;}
export function prepareEnemyTactics(world,now){
 let r=worlds.get(world);if(!r){r={next:0,cells:new Map(),samples:0,candidates:0};worlds.set(world,r);}
 if(now<r.next)return;r.next=now+.25;r.samples++;r.cells.clear();r.candidates=0;
 for(const e of world.enemies||[]){if(!eligible(e))continue;const s=state(e);s.profile=getEnemyVisualProfile(e);s.group=group(e);const key=`${Math.floor(e.x/CELL)},${Math.floor(e.y/CELL)}`;if(!r.cells.has(key))r.cells.set(key,[]);r.cells.get(key).push(e);}
 for(const cell of r.cells.values())for(const e of cell){
  const s=state(e);s.allies.length=0;const cx=Math.floor(e.x/CELL),cy=Math.floor(e.y/CELL);
  for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)for(const other of r.cells.get(`${cx+x},${cy+y}`)||[]){
   r.candidates++;if(other===e||s.allies.length>=10||Math.hypot(e.x-other.x,e.y-other.y)>CELL||!compatible(e,other))continue;
   if(hasLineOfSight(world,e.x,e.y,other.x,other.y))s.allies.push(other);
  }
 }
}
function busy(e,now){return e.returningHome||e.telegraph||getBasicEnemyAttack(e)||getEnemyCharge(e)||e.telegraphRecoveryTimer>0||e.boss?.pendingSpecial||e.boss?.recoveryUntil>now||e.rootUntil>now||e.subclassFrozenUntil>now||e.staggerTimer>0||e.eliteHealing||e.eliteAttackPauseTimer>0;}
function clearStep(e,w,goal){
 const distance=Math.hypot(goal.x-e.x,goal.y-e.y),steps=Math.max(1,Math.ceil(distance/12));
 for(let i=1;i<=steps;i++)if(!isActorPositionPassable(w,e.x+(goal.x-e.x)*i/steps,e.y+(goal.y-e.y)*i/steps,e.radius||e.r||14))return false;
 return true;
}
function point(e,target,forward,side){const d=Math.hypot(e.x-target.x,e.y-target.y)||1,nx=(e.x-target.x)/d,ny=(e.y-target.y)/d;return {x:target.x+nx*forward-ny*side,y:target.y+ny*forward+nx*side};}
function plan(e,w,s,goal,choice,now,duration=.65){
 if(!clearStep(e,w,goal))return false;
 // A flank/firing position is a short reservation, not a shared destination
 // every ally should converge on. Leave room for already committed movers.
 if(s.allies.some(a=>{const peer=actors.get(a),gap=(e.radius||14)+(a.radius||14)+6;return live(a)&&(Math.hypot(a.x-goal.x,a.y-goal.y)<gap||peer?.goal&&peer.until>now&&Math.hypot(peer.goal.x-goal.x,peer.goal.y-goal.y)<gap);}))return false;
 s.goal=goal;s.choice=choice;s.until=now+duration;return true;
}
export function mayEnemyKite(e,now){return now>=(actors.get(e)?.standUntil||0);}
export function updateEnemyTacticalMovement(e,target,w,dt,now){
 if(!eligible(e)||busy(e,now)||!(e.awakened||e.aggro||e.alerted||e.isInCombat)||!target||!enemyWithinTargetView(e,target,w))return false;
 const s=state(e),profile=s.profile||getEnemyVisualProfile(e),human=profile.family==='human',wolf=/Wolf/.test(e.kind),ranged=['archer','cultist','gravePriest'].includes(e.archetype||e.kind);
 if(s.observedTarget!==target){s.observedTarget=target;s.chargeAt=null;s.lastSeen=null;s.goal=null;s.until=0;s.nextChoice=now;}
 const distance=Math.hypot(e.x-target.x,e.y-target.y),sight=hasLineOfSight(w,e.x,e.y,target.x,target.y),allies=s.allies,retreatRange=(e.archetype||e.kind)==='archer'?96:82;
 if(sight){s.lastSeen||={x:target.x,y:target.y};s.lastSeen.x=target.x;s.lastSeen.y=target.y;if(target.abilityCharge?.active||target.combatState?.heavyChargeActive)s.chargeAt??=now;else s.chargeAt=null;}
 else s.chargeAt=null;
 if(ranged&&distance<retreatRange){
  if(!s.kiteUntil&&now>=s.standUntil)s.kiteUntil=now+1.05;
  if(s.kiteUntil&&now>=s.kiteUntil){s.kiteUntil=0;s.standUntil=now+1.35;s.until=0;}
 }else s.kiteUntil=0;
 if(now>=s.nextChoice){
  s.nextChoice=now+.65+(visualHash(e.id||e.kind)%5)*.08;s.until=0;s.choice='press';s.goal=null;
  const observed=s.lastSeen;
  if(ranged&&observed){
   const laneBlocked=allies.some(a=>{if(!live(a))return false;const dx=target.x-e.x,dy=target.y-e.y,t=((a.x-e.x)*dx+(a.y-e.y)*dy)/(dx*dx+dy*dy||1);return t>.1&&t<.9&&Math.hypot(a.x-e.x-dx*t,a.y-e.y-dy*t)<(a.radius||14)+9;});
   if((!sight||laneBlocked)&&distance<280&&now>=(s.nextLane||0)){
    for(const side of [s.side,-s.side]){const goal=point(e,observed,Math.max(100,Math.min(190,distance)),side*66);if(hasLineOfSight(w,goal.x,goal.y,observed.x,observed.y)&&plan(e,w,s,goal,'firingLane',now)){s.nextLane=now+2.2;break;}}
   }else if(distance<retreatRange&&mayEnemyKite(e,now)){
    const cover=allies.find(a=>live(a)&&!['archer','cultist','gravePriest'].includes(a.archetype||a.kind)&&Math.hypot(a.x-target.x,a.y-target.y)>distance+12&&(a.x-target.x)*(e.x-target.x)+(a.y-target.y)*(e.y-target.y)>0);
    const coverDistance=cover?Math.hypot(cover.x-target.x,cover.y-target.y):1;
    const retreatDistance=Math.min(210,coverDistance+45);
    const goal=cover?{x:target.x+(cover.x-target.x)/coverDistance*retreatDistance,y:target.y+(cover.y-target.y)/coverDistance*retreatDistance}:point(e,target,122,s.side*30);
    plan(e,w,s,goal,cover?'withdrawToAllies':'reposition',now,.55);
   }
  }else if((human||wolf)&&allies.some(live)&&sight){
   const caster=allies.find(a=>live(a)&&a.telegraph&&['cultist','gravePriest','archer'].includes(a.archetype||a.kind));
   const defender=(e.kind==='shieldKnight'||profile.role==='knight'||profile.role==='guard');
   const recovering=target.combatState?.attacking&&target.combatState.attackElapsed>=(target.combatState.attackMove?.activeEnd??Infinity);
   if(defender&&caster&&distance>45)plan(e,w,s,{x:target.x+(caster.x-target.x)*.35,y:target.y+(caster.y-target.y)*.35},'screenCaster',now);
   else if(human&&e.hp<e.maxHp*.22&&now>=s.retreatAt&&distance<115){s.retreatAt=now+12;plan(e,w,s,point(e,target,145,s.side*40),'regroup',now,.7);}
   else if(human&&s.chargeAt!=null&&now-s.chargeAt>=.3&&distance<180&&now>=(s.nextChargeReact||0)){
    if(plan(e,w,s,point(e,target,Math.max(72,distance),s.side*65),'evadeCharge',now,.55))s.nextChargeReact=now+2.4;
   }else if(!recovering&&distance>65&&distance<260&&now>=(s.nextFlank||0)&&(wolf||visualHash(e.id||e.kind)%3!==0)){
    if(plan(e,w,s,point(e,target,Math.min(88,distance*.6),s.side*(wolf?58:65)),wolf?'packCircle':'flank',now))s.nextFlank=now+3.8;
   }
  }
 }
 if(now>=s.until||!s.goal||!ranged&&distance<=(e.attackRange||28)&&s.choice!=='regroup'&&s.choice!=='evadeCharge')return false;
 if(ranged&&!mayEnemyKite(e,now)&&s.choice!=='firingLane')return false;
 const dx=s.goal.x-e.x,dy=s.goal.y-e.y,d=Math.hypot(dx,dy);if(d<9){s.until=0;return false;}
 const amount=Math.min(d,(e.speed||60)*(e.slowTimer>0?.45:1)*dt),x=e.x,y=e.y;
 moveActorWithCollision(e,w,dx/d*amount,dy/d*amount);e.dirX=(target.x-e.x)/(distance||1);e.dirY=(target.y-e.y)/(distance||1);
 if(Math.hypot(e.x-x,e.y-y)<.05){s.until=0;s.nextChoice=now+.4;return false;}
 e.enemyState=s.choice;return true;
}
export function waitForAlliedMajorAttack(e,w,now){
 if(!eligible(e)||e.eliteModifier||!['cultist','gravePriest','brute','shieldKnight'].includes(e.archetype||e.kind))return false;
 const s=actors.get(e);if(!s||!s.allies.length)return false;
 if(now<s.waitUntil)return true;
 if(now<(s.nextWait||0))return false;
 if(s.allies.some(a=>live(a)&&a.telegraph?.time>0&&!['arrowShot','curseBolt'].includes(a.telegraph.kind)&&Math.hypot(e.x-a.x,e.y-a.y)<260)){
  s.waitUntil=now+.32;s.nextWait=now+1.1;e.enemyState='coordinating';return true;
 }
 return false;
}
export function enemyTacticsSnapshot(e){const s=actors.get(e);return s?{choice:s.choice,allies:s.allies.map(a=>a.id),until:s.until,standUntil:s.standUntil}:null;}
export function enemyTacticsStats(w){const r=worlds.get(w);return r?{samples:r.samples,candidates:r.candidates,cells:r.cells.size}:null;}
