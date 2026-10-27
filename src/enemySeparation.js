import {moveActorWithCollision,hasLineOfSight} from './world.js';
import {getBasicEnemyAttack,getEnemyCharge} from './enemyAttackPresentation.js';

const workspaces=new WeakMap();
const alive=e=>e&&e.hp>0&&!e.dead&&!e.remove&&e.alive!==false&&!e.arenaDormant;
const radius=e=>Math.max(4,Number(e.radius||e.r||14));
function canYield(e,now){
 return !e.dormant&&!e.trainingDummy&&!e.isBoss&&!e.worldBoss&&
  !(e.rootUntil>now||e.subclassFrozenUntil>now||e.staggerTimer>0||e.eliteHealing||e.eliteAttackPauseTimer>0)&&
  !(e.telegraph?.time>0||getBasicEnemyAttack(e)||getEnemyCharge(e)||e.boss?.pendingSpecial||e.boss?.recoveryUntil>now||e.telegraphRecoveryTimer>0);
}

// Soft body spacing rather than solid actor collision: crowds can still move
// through narrow passages. Reuse scratch storage and visit local grid cells.
export function separateEnemies(world,dt,now){
 const enemies=world?.enemies||[],count=enemies.length;if(count<2||!(dt>0))return;
 let state=workspaces.get(world);
 if(!state){state={cells:new Map(),pool:[],budget:new Float64Array(0)};workspaces.set(world,state);}
 if(state.budget.length<count)state.budget=new Float64Array(Math.max(count,state.budget.length*2,32));
 let largest=14;
 for(let i=0;i<count;i++){
  // Correction must outpace inward walking, including slower rendered frames.
  const e=enemies[i];state.budget[i]=alive(e)&&canYield(e,now)?Math.min(Math.max(6,radius(e)),(e.speed||60)*(e.slowTimer>0?.45:1)*Math.min(dt,.1)*1.5):0;
  if(alive(e))largest=Math.max(largest,radius(e));
 }
 const cellSize=Math.max(64,largest*2+6),key=(x,y)=>x+y*65536;
 for(let pass=0;pass<2;pass++){
  for(const cell of state.cells.values()){cell.length=0;state.pool.push(cell);}state.cells.clear();
  for(let i=0;i<count;i++){
   const e=enemies[i];if(!alive(e))continue;
   const id=key(Math.floor(e.x/cellSize),Math.floor(e.y/cellSize));let cell=state.cells.get(id);
   if(!cell){cell=state.pool.pop()||[];state.cells.set(id,cell);}cell.push(i);
  }
  for(let i=0;i<count;i++){
   const a=enemies[i];if(!alive(a))continue;
   const cx=Math.floor(a.x/cellSize),cy=Math.floor(a.y/cellSize);
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const cell=state.cells.get(key(cx+ox,cy+oy));if(!cell)continue;
    for(const j of cell){
     if(j<=i||!(state.budget[i]>0||state.budget[j]>0))continue;
     const b=enemies[j],dx=a.x-b.x,dy=a.y-b.y,gap=radius(a)+radius(b)+6,squared=dx*dx+dy*dy;
     if(squared>=gap*gap||!hasLineOfSight(world,a.x,a.y,b.x,b.y))continue;
     const distance=Math.sqrt(squared),angle=(i+1)*2.399963+(j+1)*.618034;
     const nx=distance>.001?dx/distance:Math.cos(angle),ny=distance>.001?dy/distance:Math.sin(angle);
     const penetration=gap-distance,both=state.budget[i]>0&&state.budget[j]>0;
     const pushA=Math.min(state.budget[i],penetration*(both?.5:1)),pushB=Math.min(state.budget[j],penetration-pushA);
     if(pushA>0){const x=a.x,y=a.y;moveActorWithCollision(a,world,nx*pushA,ny*pushA);state.budget[i]=Math.max(0,state.budget[i]-Math.hypot(a.x-x,a.y-y));}
     if(pushB>0){const x=b.x,y=b.y;moveActorWithCollision(b,world,-nx*pushB,-ny*pushB);state.budget[j]=Math.max(0,state.budget[j]-Math.hypot(b.x-x,b.y-y));}
    }
   }
  }
 }
}
