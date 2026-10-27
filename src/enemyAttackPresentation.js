import {getEnemyVisualProfile} from './enemyVisualProfiles.js';
import {ITEMS} from './data.js';

// Ephemeral presentation follows combat clocks; it cannot deal damage or enter saves.
const attacks=new WeakMap(),basics=new WeakMap(),charges=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function enemyAttackIdentity(enemy){
 const profile=getEnemyVisualProfile(enemy),ref=enemy.equipment?.weapon,weapon=ITEMS[typeof ref==='string'?ref:ref?.id];
 const weaponType=weapon?.weaponType||(['archer'].includes(enemy.archetype||enemy.kind)?'bow':profile.role==='caster'?'staff':'sword');
 const family=profile.family,kind=enemy.archetype||enemy.kind;
 const technique=['cultist','demonCultist','gravePriest'].includes(kind)?'cast':kind==='archer'?'bow':
  family==='spectral'?'phase':family==='beast'?'bite':family==='aberration'?'swell':
  family==='brute'||enemy.isBoss&&family!=='human'?'slam':['spear','dagger'].includes(weaponType)?'thrust':'slash';
 const palettes={covenant:'#efd799',lastDawn:'#d98776',emberVeil:'#e6915b',graveCult:'#b394cc',watcher:'#a9c8cc',veyr:'#ba9bd6'};
 return {family,technique,weaponType,faction:profile.faction||'wild',color:palettes[profile.faction]||(family==='spectral'?'#acbdda':'#dbc5a2')};
}
export function beginEnemyAttackPresentation(enemy,tell,now=performance.now()/1000){
 const identity=enemyAttackIdentity(enemy);
 const attack={...identity,kind:tell.kind,pose:tell.pose,windup:tell.maxTime||tell.windup||.32,recovery:tell.recovery??.3,
  elapsed:0,observedAt:now,dirX:0,dirY:1,normal:!!tell.normal,cancelled:false};
 attacks.set(enemy,attack);syncEnemyAttackPresentation(enemy,tell,now);return attack;
}
export function syncEnemyAttackPresentation(enemy,tell,now=performance.now()/1000){
 let state=attacks.get(enemy);if(!state||state.kind!==tell.kind)state=beginEnemyAttackPresentation(enemy,{...tell,time:tell.maxTime},now);
 state.elapsed=Math.max(0,state.windup-Math.max(0,tell.time||0));state.observedAt=now;
 const dx=(tell.x??enemy.x)-enemy.x,dy=(tell.y??enemy.y)-enemy.y,d=Math.hypot(dx,dy);
 if(d>.001){state.dirX=dx/d;state.dirY=dy/d;enemy.dirX=state.dirX;enemy.dirY=state.dirY;}
 return state;
}
export function releaseEnemyAttackPresentation(enemy,now=performance.now()/1000){
 const state=attacks.get(enemy);if(state){state.elapsed=state.windup;state.observedAt=now;}return state;
}
export function cancelEnemyAttackPresentation(enemy){
 if(attacks.get(enemy)?.kind==='detonate')enemy.exploding=false;
 attacks.delete(enemy);basics.delete(enemy);charges.delete(enemy);
}
export function sampleEnemyAttackPresentation(enemy,now=performance.now()/1000){
 if(!enemy||enemy.hp<=0||enemy.dead||enemy.remove||enemy.returningHome||enemy.arenaDormant)return null;
 const state=attacks.get(enemy);if(!state)return null;
 const elapsed=state.elapsed+Math.max(0,now-state.observedAt),duration=state.windup+(state.executionDuration||0)+state.recovery;
 if(elapsed>=duration)return null;
 const phase=elapsed<state.windup?'anticipation':elapsed<state.windup+Math.max(.12,state.executionDuration||0)?'execution':'recovery';
 return {...state,elapsed,duration,phase,progress:clamp(elapsed/state.windup,0,1),
  // Existing weapon poses reach contact exactly when simulation releases the hit.
  activeStart:Math.max(0,state.windup-.08),activeEnd:state.windup};
}
export function getBasicEnemyAttack(enemy){return basics.get(enemy)||null;}
export function getEnemyCharge(enemy){return charges.get(enemy)||null;}
export function beginEnemyCharge(enemy,state){
 charges.set(enemy,state);const attack=attacks.get(enemy);if(attack)attack.executionDuration=state.duration;
}
export function syncEnemyCharge(enemy,elapsed,now){
 const attack=attacks.get(enemy);if(attack){attack.elapsed=attack.windup+elapsed;attack.observedAt=now;}
}
export function finishEnemyCharge(enemy){charges.delete(enemy);}
export function beginBasicEnemyAttack(enemy,target,now,range,multiplier=1){
 if(basics.has(enemy))return false;
 const identity=enemyAttackIdentity(enemy),baseWindup=identity.technique==='slam'?.48:identity.technique==='bite'?.3:identity.technique==='thrust'?.28:.34;
 const speed=Math.min(1,Math.max(.25,Number(enemy.attackRate)||1)/(baseWindup+.28)),windup=baseWindup*speed;
 const tell={kind:'basicStrike',pose:identity.technique,maxTime:windup,time:windup,recovery:.28*speed,normal:true,x:target.x,y:target.y};
 const state={tell,target,range,multiplier,elapsed:0,released:false};basics.set(enemy,state);
 beginEnemyAttackPresentation(enemy,tell,now);enemy.enemyState='preparing';return true;
}
export function updateBasicEnemyAttack(enemy,world,dt,now,hit){
 const state=basics.get(enemy);if(!state)return false;
 if(enemy.hp<=0||enemy.dead||enemy.remove||enemy.returningHome||enemy.arenaDormant||state.target.hp<=0||state.target.alive===false||state.target.active===false||state.target.joined===false){cancelEnemyAttackPresentation(enemy);return true;}
 state.elapsed+=Math.max(0,dt);
 const tell=state.tell;
 if(!state.released){
  // Aim can adjust early; the final quarter is a committed, dodgeable strike.
  if(state.elapsed<tell.maxTime*.75){tell.x=state.target.x;tell.y=state.target.y;}
  tell.time=Math.max(0,tell.maxTime-state.elapsed);syncEnemyAttackPresentation(enemy,tell,now);
  if(tell.time<=0){state.released=true;releaseEnemyAttackPresentation(enemy,now);enemy.enemyState='recovering';
   const dx=state.target.x-enemy.x,dy=state.target.y-enemy.y,d=Math.hypot(dx,dy)||1;
   const visual=attacks.get(enemy);
   if(d<=state.range+4&&(dx*visual.dirX+dy*visual.dirY)/d>=-.1)hit(state.target,state.multiplier);
  }
 }else enemy.enemyState='recovering';
 if(state.elapsed>=tell.maxTime+tell.recovery)basics.delete(enemy);
 return true;
}
