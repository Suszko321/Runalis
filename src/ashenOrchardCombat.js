import {getEnemyTargetablePlayers} from './coopEnemyScaling.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {damageNearbyParty} from './bossSystem.js';
import {malakarShapeHits} from './malakarCombat.js';
import {playSfx} from './audioSystem.js';
export const ORCHARD_MOVES={press:{name:'The Founder’s Press',tell:1.35,recovery:2.6},reversal:{name:'Cistern Reversal',tell:1.8,recovery:2.2},levy:{name:'The Lantern’s Levy',tell:1.65,recovery:2.4},spokes:{name:'Broken Waterwheel',tell:1.55,recovery:2.5}};
export function beginOrchardMove(e,w,p,key){
 const phase=e.orchardPhase||1,party=getEnemyTargetablePlayers(p).filter(a=>a.joined!==false),t=party[(e.orchardTurn||0)%Math.max(1,party.length)]||p,angle=Math.atan2(t.y-e.y,t.x-e.x),a={key,elapsed:0,released:false,phase,origin:{x:e.x,y:e.y},shapes:[],...ORCHARD_MOVES[key]};
 if(key==='press'){const length=Math.min(440,Math.hypot(t.x-e.x,t.y-e.y)+60);a.shapes=[{type:'lane',x:e.x,y:e.y,angle,length,width:phase===3?130:100}];a.destination={x:Math.max(18*32,Math.min(46*32,e.x+Math.cos(angle)*(length-40))),y:Math.max(9*32,Math.min(31*32,e.y+Math.sin(angle)*(length-40)))};}
 if(key==='reversal'){const shift=(e.orchardTurn||0)%4;for(let i=0;i<(phase===3?3:2);i++){const quadrant=(i* (phase===3?1:2)+shift)%4;a.shapes.push({type:'lane',x:(quadrant%2?32:17)*32,y:(quadrant<2?8:20)*32,angle:Math.PI/2,length:12*32,width:14*32});a.shapes[a.shapes.length-1].x+=7*32;}}
 if(key==='levy')a.shapes=[{type:'ring',x:e.x,y:e.y,inner:phase>=2?170:135,radius:700}];
 if(key==='spokes')a.shapes=Array.from({length:phase>=2?6:4},(_,i)=>({type:'lane',x:e.x,y:e.y,angle:angle+i*Math.PI*2/(phase>=2?6:4),length:850,width:phase===3?90:68}));
 e.orchardAttack=a;e.orchardTurn=(e.orchardTurn||0)+1;e.dirX=Math.cos(angle);e.dirY=Math.sin(angle);beginEnemyAttackPresentation(e,{kind:'orchard-'+key,pose:key==='press'?'thrust':'slam',maxTime:a.tell,time:a.tell,recovery:a.recovery,x:t.x,y:t.y});return a;
}
export function updateOrchardCombat(e,w,p,dt,now,game){
 if(!e.orchardCustodian||e.dead||e.hp<=0)return false;
 if(w.bossArena?.phase!=='active'){e.orchardAttack=null;e.orchardRecovery=2;return true;}
 e.arenaDormant=false;e.speed=0;e.aggro=e.isInCombat=true;
 const phase=e.hp/e.maxHp<=.35?3:e.hp/e.maxHp<=.7?2:1;
 if(phase!==(e.orchardPhase||1)){e.orchardPhase=phase;e.orchardAttack=null;e.orchardRecovery=2;}
 if(e.orchardRecovery>0){e.orchardRecovery=Math.max(0,e.orchardRecovery-dt);return true;}
 const a=e.orchardAttack||beginOrchardMove(e,w,p,['press','reversal','spokes','levy'][e.orchardTurn%4||0]);a.elapsed+=dt;syncEnemyAttackPresentation(e,{kind:'orchard-'+a.key,maxTime:a.tell,time:Math.max(0,a.tell-a.elapsed)},now);
 if(!a.released&&a.elapsed>=a.tell){damageNearbyParty(e,p,w,1800,e.damage*(a.key==='press'?1.3:1.1)*(1+((e.orchardPhase||1)-1)*.1),t=>a.shapes.some(s=>malakarShapeHits(s,t)),a.name,now);playSfx(a.key==='press'?'bossSlam':'cast',{volume:.55});game?.shake?.(3,.12);a.released=true;releaseEnemyAttackPresentation(e,now);}
 if(a.released&&a.destination){const t=Math.max(0,Math.min(1,(a.elapsed-a.tell)/.3)),s=t*t*(3-2*t);e.x=a.origin.x+(a.destination.x-a.origin.x)*s;e.y=a.origin.y+(a.destination.y-a.origin.y)*s;}
 if(a.elapsed>=a.tell+.3){cancelEnemyAttackPresentation(e);e.orchardAttack=null;e.orchardRecovery=a.recovery-(phase-1)*.4;}return true;
}
