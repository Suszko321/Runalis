import assert from 'node:assert/strict';
import {createWorld,moveActorWithCollision,isActorPositionPassable} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {updateSummons} from '../src/combat.js';
import {ECHORYN_ROADS} from '../src/echorynGeography.js';

const w=createWorld();w.enemies=[];let now=0;const results=[];
const routes=[...ECHORYN_ROADS.filter(r=>['hollow-road','pilgrim-road','hunter-road','ridge-shortcut','creek-shortcut'].includes(r.id)),
 {id:'farmhouse-door',points:[[110,90],[110,88],[110,86],[111,86],[111,90]]},
 {id:'crypt-bank',points:[[245,100],[238,100],[238,109],[238,100],[245,100]]},
 {id:'root-arch',points:[[82,170],[82,165],[82,161],[82,165],[82,170]]}];
for(const route of routes){
 const id=route.id,p=createPlayer('Follower geometry');
 Object.assign(p,{x:(route.points[0][0]+.5)*32,y:(route.points[0][1]+.5)*32});
 p.summons=[{id:'review-skeleton',kind:'skeleton',x:p.x,y:p.y,r:12,radius:12,hp:100,maxHp:100,speed:180,alive:true,attackRange:28}];
 let maxSeparation=0;
 for(const [x,y] of route.points.slice(1)){
  const tx=(x+.5)*32,ty=(y+.5)*32;
  for(let i=0;i<6000&&Math.hypot(tx-p.x,ty-p.y)>2;i++){
   const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),step=Math.min(d,140/30);
   moveActorWithCollision(p,w,dx/d*step,dy/d*step,12);updateSummons(1/30,p,w,()=>{},now+=1/30);
   maxSeparation=Math.max(maxSeparation,Math.hypot(p.x-p.summons[0].x,p.y-p.summons[0].y));
  }
  assert(Math.hypot(tx-p.x,ty-p.y)<3,`player blocked on ${id}`);
 }
 for(let i=0;i<180;i++)updateSummons(1/30,p,w,()=>{},now+=1/30);
 const s=p.summons[0],separation=Math.hypot(p.x-s.x,p.y-s.y);
 assert(isActorPositionPassable(w,s.x,s.y,12),`invalid follower footprint on ${id}`);
 assert(separation<100&&maxSeparation<200,`follower stranded on ${id}: final ${separation.toFixed(1)}, max ${maxSeparation.toFixed(1)}`);
 results.push({id,separation:Math.round(separation),maxSeparation:Math.round(maxSeparation)});
}
console.log(JSON.stringify({result:'PASS',results},null,2));
