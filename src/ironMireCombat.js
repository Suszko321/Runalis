import {selectBossAttackTarget} from './bossCombatTargets.js';
import {damageNearbyParty} from './bossSystem.js';
import {malakarShapeHits} from './malakarCombat.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation,cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {playSfx} from './audioSystem.js';
export const IRON_MIRE_MOVES={
 pick:{name:'Break the Seam',tell:1.3,recovery:2.2,multiplier:1.2},
 chain:{name:'Haul the Drowned',tell:1.4,recovery:2,multiplier:1.05},
 collapse:{name:'The Roof Gives Way',tell:1.35,recovery:1.9,multiplier:.8},
 flood:{name:'Emergency Discharge',tell:1.8,recovery:2,multiplier:1.1},
 bell:{name:'The Last Shift',tell:1.6,recovery:2.4,multiplier:1.15}
};
export function beginIronMireMove(e,w,p,key,now=performance.now()/1000){
 const phase=e.ironMirePhase||1,target=selectBossAttackTarget(e,p,e.ironMireTurn||0)||p;
 const angle=Math.atan2(target.y-e.y,target.x-e.x),move=IRON_MIRE_MOVES[key];
 const a={...move,key,phase,elapsed:0,origin:{x:e.x,y:e.y},target:{x:target.x,y:target.y},events:[]};
 a.tell=Math.max(.95,a.tell-(phase-1)*.13);a.recovery=Math.max(1.2,a.recovery-(phase-1)*.28);
 const event=(delay,shapes)=>a.events.push({at:a.tell+delay,shapes,released:false});
 const arena=w.bossArena||{x:26*32,y:6*32,w:44*32,h:32*32};
 if(key==='pick'){
  const length=Math.min(600,Math.max(280,Math.hypot(target.x-e.x,target.y-e.y)+75));
  event(0,[{type:'lane',x:e.x,y:e.y,angle,length,width:phase===3?130:105}]);
  a.destination={x:Math.max(arena.x+80,Math.min(arena.x+arena.w-80,e.x+Math.cos(angle)*(length-80))),y:Math.max(arena.y+80,Math.min(arena.y+arena.h-80,e.y+Math.sin(angle)*(length-80)))};
 }
 if(key==='chain')event(0,Array.from({length:phase===3?5:3},(_,i)=>({type:'lane',x:e.x,y:e.y,angle:angle+(i-(phase===3?2:1))*.44,length:1100,width:phase===3?60:52})));
 if(key==='collapse'){
  const party=[p,...(p.coop?.players||[])].filter(a=>a.active!==false&&a.joined!==false&&a.hp>0&&!a.dead);
  for(let i=0;i<(phase===1?2:3);i++)event(i*.55,party.map((t,j)=>({type:'circle',x:Math.max(arena.x+90,Math.min(arena.x+arena.w-90,t.x+(i-1)*85)),y:Math.max(arena.y+90,Math.min(arena.y+arena.h-90,t.y+(j%2?1:-1)*i*60)),radius:phase===3?110:90})));
 }
 if(key==='flood'){
  const left=(e.ironMireTurn||0)%2===0,cx=arena.x+arena.w/2;
  // A dry central walkway remains in phase three; one entire half remains earlier.
  const shapes=phase===3?[{type:'lane',x:arena.x+arena.w*.22,y:arena.y,angle:Math.PI/2,length:arena.h,width:arena.w*.38},{type:'lane',x:arena.x+arena.w*.78,y:arena.y,angle:Math.PI/2,length:arena.h,width:arena.w*.38}]:[{type:'lane',x:cx+(left?-1:1)*arena.w*.25,y:arena.y,angle:Math.PI/2,length:arena.h,width:arena.w*.46}];
  event(0,shapes);
 }
 if(key==='bell')event(0,[{type:'ring',x:e.x,y:e.y,inner:phase===3?130:165,radius:phase===3?610:560}]);
 e.ironMireAttack=a;e.ironMireRecovery=0;e.ironMireTurn=(e.ironMireTurn||0)+1;e.dirX=Math.cos(angle);e.dirY=Math.sin(angle);
 beginEnemyAttackPresentation(e,{kind:'ironMire-'+key,pose:key==='chain'?'thrust':'slam',maxTime:a.tell,time:a.tell,recovery:a.recovery,x:target.x,y:target.y},now);
 return a;
}
export function resetIronMireCombat(e){e.ironMireAttack=null;e.ironMireRecovery=2;e.ironMireTurn=0;e.ironMirePhase=1;cancelEnemyAttackPresentation(e);}
export function updateIronMireCombat(e,w,p,dt,now,game){
 if(!e.ironMireForeman||e.dead||e.hp<=0)return false;
 if(w.bossArena?.phase!=='active'){if(e.ironMireAttack)resetIronMireCombat(e);return true;}
 e.arenaDormant=false;e.speed=0;e.aggro=e.isInCombat=true;
 const phase=e.hp/e.maxHp<=.35?3:e.hp/e.maxHp<=.7?2:1;
 if(phase!==(e.ironMirePhase||1)){resetIronMireCombat(e);e.ironMirePhase=phase;e.ironMireRecovery=1.8;game?.log?.(phase===2?'The Foreman opens the pressure lines. The second shift begins.':'The bell cracks. Both flood channels open; the central walkway stays dry.');}
 if(e.ironMireRecovery>0){e.ironMireRecovery=Math.max(0,e.ironMireRecovery-dt);return true;}
 const order=phase===1?['pick','chain','collapse','bell']:['pick','flood','chain','collapse','bell'];
 const a=e.ironMireAttack||beginIronMireMove(e,w,p,order[(e.ironMireTurn||0)%order.length],now);
 a.elapsed+=Math.max(0,dt);
 syncEnemyAttackPresentation(e,{kind:'ironMire-'+a.key,maxTime:a.tell,time:Math.max(0,a.tell-a.elapsed),x:a.target.x,y:a.target.y},now);
 for(const event of a.events)if(!event.released&&a.elapsed>=event.at){
  damageNearbyParty(e,p,w,2200,e.damage*a.multiplier,t=>event.shapes.some(s=>malakarShapeHits(s,t)),a.name,now);
  event.released=true;releaseEnemyAttackPresentation(e,now);playSfx(a.key==='bell'?'bossRoar':'bossSlam',{volume:.5});game?.shake?.(a.key==='pick'?4:2,.12);
 }
 if(a.destination&&a.elapsed>=a.tell){const f=Math.min(1,(a.elapsed-a.tell)/.28);e.x=a.origin.x+(a.destination.x-a.origin.x)*f;e.y=a.origin.y+(a.destination.y-a.origin.y)*f;}
 if(a.elapsed>=a.events.at(-1).at+.4){e.ironMireAttack=null;e.ironMireRecovery=a.recovery;cancelEnemyAttackPresentation(e);}return true;
}
