import {selectBossAttackTarget,getBossCombatTargets} from './bossCombatTargets.js';
import {encounterState,partyMembers} from './malakarEncounter.js';
import {damageNearbyParty} from './bossSystem.js';
import {playSfx} from './audioSystem.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
export const MALAKAR_MOVES={
 cleave:{name:'Royal Cleave',tell:.95,recovery:2.2,color:'#efb37e'},
 charge:{name:'Thronebreaker',tell:1.25,recovery:2.1,color:'#ffd58b'},
 decree:{name:'Infernal Decree',tell:1.35,recovery:1.8,color:'#dc8af1'},
 brand:{name:'Brand of the Last Dawn',tell:2.1,recovery:1.1,color:'#ff9d66'},
 rupture:{name:'Sovereign’s Rupture',tell:1.45,recovery:2.2,color:'#f5c27e'},
 signature:{name:'The Final Siege',tell:1.8,recovery:3.4,color:'#d6a1ff'}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function aim(e,p){return Math.atan2(p.y-e.y,p.x-e.x);}
export function malakarShapeHits(shape,p){
 const r=Number(p.r||p.radius||10),dx=p.x-shape.x,dy=p.y-shape.y;
 if(shape.type==='circle')return Math.hypot(dx,dy)<=shape.radius+r;
 if(shape.type==='ring'){const d=Math.hypot(dx,dy);return d>=shape.inner-r&&d<=shape.radius+r;}
 if(shape.type==='cone'){const a=Math.atan2(dy,dx)-shape.angle,diff=Math.atan2(Math.sin(a),Math.cos(a));return Math.hypot(dx,dy)<=shape.radius+r&&Math.abs(diff)<=shape.spread/2;}
 if(shape.type==='lane'){const c=Math.cos(shape.angle),s=Math.sin(shape.angle),along=dx*c+dy*s,across=-dx*s+dy*c;return along>=-r&&along<=shape.length+r&&Math.abs(across)<=shape.width/2+r;}
 return false;
}
export function startMalakarMove(e,w,p,key,now=0){
 const s=encounterState(w),def=MALAKAR_MOVES[key],phase=s.phase||1;
 const target=selectBossAttackTarget(e,p,s.turn||0)||p;
 const a={key,elapsed:0,step:0,targetIndex:partyMembers(p).indexOf(target),targetSummonId:target.kindTag==='summon'?target.id:null,angle:aim(e,target),origin:{x:e.x,y:e.y},target:{x:target.x,y:target.y},shapes:[],hit:[],released:false,tell:def.tell,recovery:def.recovery,phase};
 if(key==='cleave'){a.strikes=phase===3?3:2;a.tell=phase===3?1.05:.95;}
 if(key==='charge'){const d=Math.min(500,distance(e,target)),angle=aim(e,target);a.destination={x:clamp(e.x+Math.cos(angle)*d,160,1120),y:clamp(e.y+Math.sin(angle)*d,192,976)};}
 s.attack=a;s.last=key;s.turn=(s.turn||0)+1;e.boss ||= {};e.boss.phase=phase;
 e.bossTell={kind:'malakar-'+key,pose:key==='charge'?'thrust':key==='cleave'?'slash':'slam',maxTime:a.tell,time:a.tell,recovery:a.recovery,x:target.x,y:target.y};
 beginEnemyAttackPresentation(e,e.bossTell,now);e.enemyState='preparing';playSfx(key==='signature'?'bossRoar':'cast',{volume:.3});
 updateShapes(e,w,p,a);return a;
}
function updateShapes(e,w,p,a){
 const target=(a.targetSummonId?getBossCombatTargets(p).find(t=>t.id===a.targetSummonId):partyMembers(p)[a.targetIndex])||p,angle=a.angle;
 if(a.key==='cleave')a.shapes=[{type:'cone',x:e.x,y:e.y,angle,radius:a.step===a.strikes-1?175:145,spread:a.step===a.strikes-1?2.6:2.1}];
 if(a.key==='charge'){const dx=a.destination.x-a.origin.x,dy=a.destination.y-a.origin.y;a.shapes=[{type:'lane',...a.origin,angle:Math.atan2(dy,dx),length:Math.hypot(dx,dy),width:86}];}
 if(a.key==='brand'){if(a.elapsed<.85)a.target={x:target.x,y:target.y};a.shapes=[{type:'circle',...a.target,radius:82}];a.tracking=a.elapsed<.85;}
 if(a.key==='rupture')a.shapes=[{type:'ring',x:e.x,y:e.y,inner:105,radius:285}];
 if(a.key==='decree'){a.shapes=[{type:'lane',x:e.x,y:e.y,angle,length:780,width:105},{type:'lane',x:e.x,y:e.y,angle:angle+.65,length:780,width:85},{type:'lane',x:e.x,y:e.y,angle:angle-.65,length:780,width:85}];}
 if(a.key==='signature'){const offset=a.step%2?120:0;a.shapes=[0,1,2,3].map(i=>({type:'lane',x:240+i*240+offset,y:176,angle:Math.PI/2,length:820,width:106})).filter(q=>q.x<1120);}
}
function impact(e,w,p,a,now,game){
 const scale={cleave:.52,charge:.72,decree:.58,brand:.6,rupture:.65,signature:.7}[a.key];
 damageNearbyParty(e,p,w,2000,e.damage*scale,member=>a.shapes.some(shape=>malakarShapeHits(shape,member)),MALAKAR_MOVES[a.key].name,now);
 playSfx(a.key==='cleave'?'hit':a.key==='brand'?'fire':'bossSlam',{volume:.55});game?.shake?.(a.key==='signature'?4:2,.12);
 releaseEnemyAttackPresentation(e,now);e.enemyState='recovering';a.released=true;a.flash=.18;
}
function finish(e,w,a){const s=encounterState(w);s.attack=null;s.recovery=a.recovery;cancelEnemyAttackPresentation(e);e.bossTell=null;e.visualAction=null;e.enemyState='recovering';}
export function updateMalakarCombat(e,w,p,dt,now,game){
 if(!e?.malakarSolo)return false;
 const s=encounterState(w);if(!s)return true;
 if(s.mode==='victory')return false;
 if(e.hp<=0){if(s.mode!=='dying'){s.mode='dying';s.elapsed=0;s.attack=null;s.queue=[];w.effects=[];w.combatEffects=[];cancelEnemyAttackPresentation(e);e.bossTell=null;playSfx('bossRoar',{volume:.55});}return true;}
 if(s.mode!=='active')return true;
 // No generic attacks, adds, elites, ambient events or independently timed hazards.
 w.enemies=w.enemies.filter(a=>a===e);e.arenaDormant=false;e.staggerTimer=0;
 if(s.grace>0){s.grace=Math.max(0,s.grace-dt);return true;}
 const next=e.hp/e.maxHp<=.35?3:e.hp/e.maxHp<=.7?2:1;
 if(next>s.phase){s.phase++;s.attack=null;s.queue=[];s.recovery=1.8;s.transition=1.8;cancelEnemyAttackPresentation(e);e.bossTell=null;e.boss ||= {};e.boss.phase=s.phase;playSfx('bossRoar',{volume:.65});game?.log?.(s.phase===2?'Malakar — Wrath: the mantle fractures.':'Malakar — Ruin: the royal seal is breaking.');return true;}
 s.transition=Math.max(0,(s.transition||0)-dt);
 if(s.recovery>0){s.recovery=Math.max(0,s.recovery-dt);return true;}
 let a=s.attack;
 if(!a){
  const targets=partyMembers(p).filter(a=>a.hp>0);if(!targets.length)return true;
  const target=targets.reduce((best,t)=>distance(e,t)<distance(e,best)?t:best,targets[0]),d=distance(e,target);
  let key=s.queue?.shift();
  if(!key){const cycle=['cleave','decree','rupture','brand','charge','signature'];key=cycle[(s.turn||0)%cycle.length];if(d>340&&s.last!=='charge')key='charge';if(s.phase===1&&key==='signature')key='decree';if(key===s.last)key=d<200?'cleave':'brand';
   // Authored combinations are serial. Each second tell starts after the first
   // hazard ends and its movement/recovery window, never on an independent timer.
   if(s.phase>=2&&key==='brand')s.queue=['cleave'];if(s.phase>=2&&key==='charge')s.queue=['rupture'];if(s.phase===3&&key==='decree')s.queue=['charge'];
  }
  a=startMalakarMove(e,w,p,key,now);
 }
 a.elapsed+=dt;a.flash=Math.max(0,(a.flash||0)-dt);
 if(a.key==='cleave'&&a.elapsed<a.tell*.45){const t=(a.targetSummonId?getBossCombatTargets(p).find(t=>t.id===a.targetSummonId):partyMembers(p)[a.targetIndex])||p;a.angle=aim(e,t);}
 updateShapes(e,w,p,a);
 const tell=e.bossTell;if(tell){tell.time=Math.max(0,a.tell-a.elapsed);tell.x=e.x+Math.cos(a.angle)*100;tell.y=e.y+Math.sin(a.angle)*100;syncEnemyAttackPresentation(e,tell,now);}
 if(a.key==='charge'&&a.elapsed>=a.tell&&a.elapsed<a.tell+.65){
  const t=clamp((a.elapsed-a.tell)/.65,0,1),old={x:e.x,y:e.y};e.x=a.origin.x+(a.destination.x-a.origin.x)*t;e.y=a.origin.y+(a.destination.y-a.origin.y)*t;
  const travel={type:'lane',...old,angle:Math.atan2(e.y-old.y,e.x-old.x),length:distance(old,e),width:86};
  damageNearbyParty(e,p,w,2000,e.damage*.72,member=>{const index=partyMembers(p).indexOf(member);if(a.hit.includes(index)||!malakarShapeHits(travel,member))return false;a.hit.push(index);return true;},'Thronebreaker',now);
  a.released=true;releaseEnemyAttackPresentation(e,now);
 }else if(a.key!=='charge'&&a.elapsed>=a.tell&&!a.released)impact(e,w,p,a,now,game);
 const active=a.key==='charge'?.65:.22;
 if(a.elapsed>=a.tell+active){
  if(a.key==='cleave'&&a.step<a.strikes-1||a.key==='signature'&&a.step<2){a.step++;a.elapsed=0;a.released=false;a.tell=a.key==='signature'?1.45:a.step===a.strikes-1?1.1:.85;a.angle=aim(e,(a.targetSummonId?getBossCombatTargets(p).find(t=>t.id===a.targetSummonId):partyMembers(p)[a.targetIndex])||p);e.bossTell={...e.bossTell,maxTime:a.tell,time:a.tell};beginEnemyAttackPresentation(e,e.bossTell,now);}
  else finish(e,w,a);
 }
 return true;
}
