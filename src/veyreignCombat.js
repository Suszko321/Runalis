import {playSfx} from './audioSystem.js';
import {damageNearbyParty} from './bossSystem.js';
import {malakarShapeHits} from './malakarCombat.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {isActorPositionPassable,hasLineOfSight} from './world.js';
import {veyreignParty} from './veyreignRules.js';
export const VEYREIGN_MOVES={cleave:{name:'The King’s Due',tell:1.15,recovery:1.6},hunt:{name:'A Name in the Dark',tell:1.5,recovery:1.7},hearts:{name:'Every Heartbeat Answered',tell:1.65,recovery:1.6},eclipse:{name:'The Mercy of Midnight',tell:2,recovery:2},cross:{name:'The Bloodline Severed',tell:1.6,recovery:1.8}};
export function beginVeyreignMove(e,w,p,key){
 const party=veyreignParty(p).filter(a=>a.hp>0),t=party[(e.veyreignTurn||0)%Math.max(1,party.length)]||p,angle=Math.atan2(t.y-e.y,t.x-e.x),phase=e.veyreignPhase||1;
 const a={...VEYREIGN_MOVES[key],key,elapsed:0,shapes:[],origin:{x:e.x,y:e.y}};
 if(key==='cleave')a.shapes=[{type:'cone',x:e.x,y:e.y,angle,spread:Math.PI*1.35,radius:210+phase*20}];
 if(key==='hunt'){a.shapes=[{type:'lane',x:e.x,y:e.y,angle,length:720,width:95+phase*10}];a.destination={x:Math.max(28*32,Math.min(68*32,t.x)),y:Math.max(14*32,Math.min(49*32,t.y))};}
 if(key==='hearts')a.shapes=party.map(t=>({type:'circle',x:t.x,y:t.y,radius:90+phase*12}));
 if(key==='eclipse')a.shapes=[{type:'ring',x:e.x,y:e.y,inner:150,radius:1800}];
 if(key==='cross')a.shapes=Array.from({length:phase===3?6:4},(_,i)=>({type:'lane',x:e.x,y:e.y,angle:angle+i*Math.PI*2/(phase===3?6:4),length:1600,width:75}));
 e.veyreignAttack=a;e.veyreignTurn=(e.veyreignTurn||0)+1;e.dirX=Math.cos(angle);e.dirY=Math.sin(angle);beginEnemyAttackPresentation(e,{kind:'veyreign-'+key,pose:key==='hunt'?'thrust':'slash',maxTime:a.tell,time:a.tell,recovery:a.recovery,x:t.x,y:t.y});return a;
}
export function updateVeyreignCombat(e,w,p,dt,now,game){
 if(e.batBeast&&e.hp>0&&!e.dead){
  const party=veyreignParty(p).filter(a=>a.hp>0),t=party.reduce((a,b)=>!a||Math.hypot(b.x-e.x,b.y-e.y)<Math.hypot(a.x-e.x,a.y-e.y)?b:a,null);if(!t)return true;
  e.batCooldown=Math.max(0,(e.batCooldown||0)-dt);const distance=Math.hypot(t.x-e.x,t.y-e.y),visible=hasLineOfSight(w,e.x,e.y,t.x,t.y);
  if(distance>550||!visible){e.batAttack=null;return true;}
  e.aggro=e.isInCombat=true;e.dirX=(t.x-e.x)/Math.max(1,distance);e.dirY=(t.y-e.y)/Math.max(1,distance);
  if(!e.batAttack&&distance<260&&e.batCooldown<=0){e.batAttack={elapsed:0,tell:1,origin:{x:e.x,y:e.y},target:{x:t.x,y:t.y},released:false};beginEnemyAttackPresentation(e,{kind:'bat-dive',pose:'bite',maxTime:1,time:1,recovery:1,x:t.x,y:t.y});}
  const a=e.batAttack;if(a){a.elapsed+=dt;syncEnemyAttackPresentation(e,{kind:'bat-dive',maxTime:1,time:Math.max(0,1-a.elapsed)},now);
   if(!a.released&&a.elapsed>=a.tell){a.released=true;releaseEnemyAttackPresentation(e,now);damageNearbyParty(e,p,w,500,e.damage,t=>Math.hypot(t.x-a.target.x,t.y-a.target.y)<75+(t.r||12),'Bat Beast: Diving Hunger',now);playSfx('hit',{volume:.35});}
   if(a.released){const f=Math.min(1,(a.elapsed-1)/.3),x=a.origin.x+(a.target.x-a.origin.x)*f,y=a.origin.y+(a.target.y-a.origin.y)*f;if(isActorPositionPassable(w,x,y,e.r||12)){e.x=x;e.y=y;}}
   if(a.elapsed>=1.4){e.batAttack=null;e.batCooldown=2.5;cancelEnemyAttackPresentation(e);}
  }else if(distance>120){const x=e.x+e.dirX*e.speed*dt,y=e.y+e.dirY*e.speed*dt;if(isActorPositionPassable(w,x,y,e.r||12)){e.x=x;e.y=y;}}
  return true;
 }
 if(!e.veyreignLord||e.dead||e.hp<=0)return false;
 if(w.bossArena?.phase!=='active'){e.veyreignAttack=null;e.veyreignRecovery=2;return true;}
 e.arenaDormant=false;e.aggro=e.isInCombat=true;e.speed=0;
 const phase=e.hp/e.maxHp<=.3?3:e.hp/e.maxHp<=.65?2:1;
 if(phase!==(e.veyreignPhase||1)){e.veyreignPhase=phase;e.veyreignAttack=null;e.veyreignRecovery=2.4;game?.log?.(phase===2?`${e.name} tears the last family banner from his blade. The court answers every heartbeat.`:`The windows go black. ${e.name} hunts without restraint.`);}
 if(e.veyreignRecovery>0){e.veyreignRecovery=Math.max(0,e.veyreignRecovery-dt);return true;}
 const cycle=phase===1?['cleave','hunt','hearts','cross']:['hearts','hunt','cross','cleave','eclipse'];
 const a=e.veyreignAttack||beginVeyreignMove(e,w,p,cycle[(e.veyreignTurn||0)%cycle.length]);a.elapsed+=dt;syncEnemyAttackPresentation(e,{kind:'veyreign-'+a.key,maxTime:a.tell,time:Math.max(0,a.tell-a.elapsed)},now);
 if(!a.released&&a.elapsed>=a.tell){damageNearbyParty(e,p,w,2200,e.damage*(phase===3?1.3:phase===2?1.15:1),t=>a.shapes.some(s=>malakarShapeHits(s,t)),a.name,now);playSfx(a.key==='hunt'?'bossSlam':'cast',{volume:.65});a.released=true;releaseEnemyAttackPresentation(e,now);game?.shake?.(4,.15);}
 if(a.released&&a.destination){const t=Math.min(1,(a.elapsed-a.tell)/.35),x=a.origin.x+(a.destination.x-a.origin.x)*t,y=a.origin.y+(a.destination.y-a.origin.y)*t;if(isActorPositionPassable(w,x,y,e.r||18)){e.x=x;e.y=y;}}
 if(a.elapsed>=a.tell+.4){e.veyreignAttack=null;e.veyreignRecovery=a.recovery-(phase-1)*.2;cancelEnemyAttackPresentation(e);}return true;
}
