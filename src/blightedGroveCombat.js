import {selectBossAttackTarget} from './bossCombatTargets.js';
import {getEnemyTargetablePlayers} from './coopEnemyScaling.js';
import {playSfx} from './audioSystem.js';
import {damageNearbyParty} from './bossSystem.js';
import {malakarShapeHits} from './malakarCombat.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
export const GROVE_MOVES={rake:{name:'Cradlebreaker',tell:1.25,recovery:2.5},seeds:{name:'Names Beneath Your Feet',tell:1.7,recovery:2.1},hollow:{name:'The Hollow Embrace',tell:1.5,recovery:2.6},rain:{name:'A Garden of Teeth',tell:1.6,recovery:2.4}};
export function beginGroveMove(e,w,p,key){
 const members=getEnemyTargetablePlayers(p).filter(a=>a.joined!==false),target=selectBossAttackTarget(e,p,e.groveTurn||0)||p,angle=Math.atan2(target.y-e.y,target.x-e.x),phase=e.grovePhase||1,def=GROVE_MOVES[key];
 const a={key,elapsed:0,tell:def.tell,recovery:def.recovery,shapes:[],released:false,phase};
 if(key==='rake')a.shapes=[{type:'cone',x:e.x,y:e.y,angle,radius:320,spread:phase===3?2.8:2.1}];
 if(key==='seeds')a.shapes=members.flatMap(t=>[{type:'circle',x:t.x,y:t.y,radius:phase===3?100:82},...(phase>=2?[{type:'circle',x:t.x+130,y:t.y,radius:70},{type:'circle',x:t.x-130,y:t.y,radius:70}]:[])]);
 if(key==='hollow')a.shapes=[{type:'ring',x:e.x,y:e.y,inner:150,radius:650}];
 if(key==='rain')a.shapes=Array.from({length:phase===3?6:5},(_,i)=>({type:'lane',x:(28+i*5)*32,y:4*32,angle:Math.PI/2,length:640,width:phase===3?88:76}));
 e.groveAttack=a;e.groveTurn=(e.groveTurn||0)+1;e.dirX=Math.cos(angle);e.dirY=Math.sin(angle);beginEnemyAttackPresentation(e,{kind:'grove-'+key,pose:key==='rake'?'slash':'slam',maxTime:a.tell,time:a.tell,recovery:a.recovery,x:target.x,y:target.y});return a;
}
export function updateGroveCombat(e,w,p,dt,now,game){
 if(!e.groveMother||e.dead||e.hp<=0)return false;
 if(w.bossArena?.phase!=='active'){e.groveAttack=null;e.groveRecovery=2;return true;}
 e.arenaDormant=false;e.speed=0;e.isInCombat=true;e.aggro=true;
 const phase=e.hp/e.maxHp<=.33?3:e.hp/e.maxHp<=.67?2:1;
 if(phase!==(e.grovePhase||1)){e.grovePhase=phase;e.groveAttack=null;e.groveRecovery=2.2;}
 if(e.groveRecovery>0){e.groveRecovery=Math.max(0,e.groveRecovery-dt);return true;}
 const a=e.groveAttack||beginGroveMove(e,w,p,['rake','seeds','hollow','rain','seeds','rake'][e.groveTurn%6||0]);a.elapsed+=dt;syncEnemyAttackPresentation(e,{kind:'grove-'+a.key,maxTime:a.tell,time:Math.max(0,a.tell-a.elapsed)},now);
 if(!a.released&&a.elapsed>=a.tell){
  damageNearbyParty(e,p,w,1800,e.damage*(a.key==='rake'?1.35:1.15)*(1+((e.grovePhase||1)-1)*.1),t=>a.shapes.some(s=>malakarShapeHits(s,t)),GROVE_MOVES[a.key].name,now);playSfx(a.key==='rake'?'hit':'bossSlam',{volume:.65});game?.shake?.(3,.12);a.released=true;releaseEnemyAttackPresentation(e,now);
 }
 if(a.elapsed>=a.tell+.35){cancelEnemyAttackPresentation(e);e.groveAttack=null;e.groveRecovery=a.recovery-(phase-1)*.45;}
 return true;
}
