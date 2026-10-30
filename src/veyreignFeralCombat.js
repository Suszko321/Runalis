import {damageNearbyParty} from './bossSystem.js';
import {malakarShapeHits} from './malakarCombat.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {isActorPositionPassable} from './world.js';
import {veyreignParty,veyreignActorKey} from './veyreignRules.js';
import {playSfx} from './audioSystem.js';
export const VEYREIGN_FERAL_MOVES={surge:{name:'Tides of the Crimson Crown',tell:1.3,recovery:.85,duration:3.1},talons:{name:'The Royal Butchery',tell:.95,recovery:1,duration:.35},rain:{name:'Blood Calls to Blood',tell:1.15,recovery:.9,duration:.35},dive:{name:'The Sovereign Descends',tell:1.05,recovery:.85,duration:.4},eclipse:{name:'An Empire of Hunger',tell:1.6,recovery:1.2,duration:.4}};
export function beginFeralVeyreignMove(e,w,p,key){
 const party=veyreignParty(p).filter(a=>a.hp>0),target=party[(e.veyreignTurn||0)%Math.max(1,party.length)]||p,angle=Math.atan2(target.y-e.y,target.x-e.x);
 const a={...VEYREIGN_FERAL_MOVES[key],key,elapsed:0,origin:{x:e.x,y:e.y},shapes:[],hits:{},gap:angle+Math.PI/2};
 if(key==='talons')a.shapes=[{type:'cone',x:e.x,y:e.y,angle,spread:Math.PI*1.35,radius:350}];
 if(key==='rain')a.shapes=party.map(t=>({type:'circle',x:t.x,y:t.y,radius:135}));
 if(key==='dive'){a.shapes=[{type:'lane',x:e.x,y:e.y,angle,length:1000,width:165}];a.destination={x:Math.max(28*32,Math.min(68*32,target.x)),y:Math.max(14*32,Math.min(49*32,target.y))};}
 if(key==='eclipse')a.shapes=[{type:'ring',x:e.x,y:e.y,inner:235,radius:1800}];
 e.veyreignAttack=a;e.veyreignTurn=(e.veyreignTurn||0)+1;e.dirX=Math.cos(angle);e.dirY=Math.sin(angle);
 beginEnemyAttackPresentation(e,{kind:'royal-'+key,pose:key==='dive'?'thrust':'slam',maxTime:a.tell,time:a.tell,recovery:a.recovery,x:target.x,y:target.y});return a;
}
const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
export function updateFeralVeyreign(e,w,p,dt,now,game){
 const phase=e.hp/e.maxHp<=.35?3:e.hp/e.maxHp<=.7?2:1;e.veyreignPhase=phase;e.arenaDormant=false;e.speed=100;
 if(e.veyreignRecovery>0){e.veyreignRecovery=Math.max(0,e.veyreignRecovery-dt);const targets=veyreignParty(p).filter(t=>t.hp>0),t=targets.reduce((a,b)=>!a||Math.hypot(b.x-e.x,b.y-e.y)<Math.hypot(a.x-e.x,a.y-e.y)?b:a,null);if(t){const d=Math.hypot(t.x-e.x,t.y-e.y);if(d>220){const x=e.x+(t.x-e.x)/d*100*dt,y=e.y+(t.y-e.y)/d*100*dt;if(isActorPositionPassable(w,x,y,34)){e.x=x;e.y=y;}}}return true;}
 const cycle=['surge','dive','talons','rain','surge','eclipse'];const a=e.veyreignAttack||beginFeralVeyreignMove(e,w,p,cycle[(e.veyreignTurn||0)%cycle.length]);a.elapsed+=dt;
 syncEnemyAttackPresentation(e,{kind:'royal-'+a.key,maxTime:a.tell,time:Math.max(0,a.tell-a.elapsed)},now);
 if(a.elapsed<a.tell)return true;
 if(!a.released){a.released=true;releaseEnemyAttackPresentation(e,now);playSfx('bossSlam',{volume:.75});game?.shake?.(5,.2);}
 if(a.key==='surge'){
  a.shapes=[];for(let i=0;i<3;i++){const age=a.elapsed-a.tell-i*.7;if(age<0||age>1.65)continue;const radius=110+age*500,gap=a.gap+i*.45;
   const s={type:'ring',x:a.origin.x,y:a.origin.y,inner:Math.max(0,radius-65),radius,gap};a.shapes.push(s);
   damageNearbyParty(e,p,w,2400,e.damage*(phase===3?1.2:1),t=>{const key=`${i}:${veyreignActorKey(t)}`;if(a.hits[key]||angleDistance(Math.atan2(t.y-s.y,t.x-s.x),gap)<.5||!malakarShapeHits(s,t))return false;a.hits[key]=true;return true;},a.name,now);
  }
 }else if(!a.struck){a.struck=true;damageNearbyParty(e,p,w,2400,e.damage*(a.key==='eclipse'?1.45:phase===3?1.25:1.1),t=>a.shapes.some(s=>malakarShapeHits(s,t)),a.name,now);}
 if(a.destination){const f=Math.min(1,(a.elapsed-a.tell)/.35),x=a.origin.x+(a.destination.x-a.origin.x)*f,y=a.origin.y+(a.destination.y-a.origin.y)*f;if(isActorPositionPassable(w,x,y,34)){e.x=x;e.y=y;}}
 if(a.elapsed>=a.tell+a.duration){e.veyreignAttack=null;e.veyreignRecovery=Math.max(.5,a.recovery-(phase-1)*.1);cancelEnemyAttackPresentation(e);}return true;
}
