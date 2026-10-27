// Shared companion placement, independent of ability groups and their cooldowns.
import {isActorPositionPassable,hasLineOfSight,moveActorWithCollision} from './world.js';

const alive=s=>s&&s.alive!==false&&s.hp>0;
export const companionRadius=s=>Math.max(12,Math.min(26,Number(s.radius||s.r||12)));
const spacingRadius=s=>s.kind==='greaterLich'?(s.summonMorph==='deathknight'?30:22):companionRadius(s);
const spacingGap=(a,b)=>Math.max(42,spacingRadius(a)+spacingRadius(b)+12);
// Foot positions need more vertical room because tall sprites extend upward.
const spacingDistance=(x,y)=>Math.hypot(x,y*.72);
function wideRoom(s,w){
 return [[-20,0],[20,0],[0,-20],[0,20]].filter(([x,y])=>isActorPositionPassable(w,s.x+x,s.y+y,companionRadius(s))).length>=3;
}
export function summonTactics(s){
 const range=Math.max(24,Number(s.attackRange)||34);
 const caster=s.kind==='greaterLich'&&s.summonMorph!=='deathknight';
 // Original equipped Marksmen retain their bow role; all lesser morphs are melee.
 const marksman=s.kind==='lich'&&(!s.summonMorph||s.summonMorph==='base')&&s.skeletonRole==='marksman';
 const ranged=caster||marksman||(s.kind!=='lich'&&s.kind!=='greaterLich'&&range>=90);
 return {ranged,range,minimum:ranged?Math.max(70,range*.55):0,preferred:ranged?Math.max(95,range*.76):Math.min(36,range-4)};
}
export function assignCompanionFormation(player,now){
 const active=(player.summons||[]).filter(s=>alive(s)&&(!s.expiresAt||s.expiresAt>now)).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const groups=new Map(),ranks=[[],[]];
 for(const s of active){
  const key=`${s.kind}:${s.summonPath||'default'}`;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);
  ranks[Number(summonTactics(s).ranged)].push(s);
 }
 // Preserve per-family indices used for pack healing and other passive rules.
 for(const group of groups.values())group.forEach((s,i)=>{s.formationIndex=i;s.formationCount=group.length;s.formationSeed??=i*.73;});
 active.forEach((s,i)=>{s.companionIndex=i;s.companionCount=active.length;});
 for(const rank of ranks)rank.forEach((s,i)=>{s.combatFormationIndex=i;s.combatFormationCount=rank.length;});
 return active;
}
export function companionFollowPoint(s,p){
 const count=Math.max(1,s.companionCount||1),index=s.companionIndex||0,facing=Math.atan2(p.dirY??1,p.dirX||0);
 const angle=count===1?facing+Math.PI:facing+Math.PI/2+index*Math.PI*2/count;
 const radius=count===1?48:Math.max(60,40+count*9);
 const point={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius*.8};
 if(['elderThornbeast','thornTitan'].includes(s.evolutionStage)||s.sourceAbilityId==='thornbinderSummonElderThornbeast'){
  const dx=Math.cos(facing),dy=Math.sin(facing),along=(point.x-p.x)*dx+(point.y-p.y)*dy;
  // Keep the large beast's muzzle clear of the owner while retaining its
  // sideways formation slot. Northward travel needs room for its tall sprite.
  const clearance=(s.evolutionStage==='thornTitan'?102:s.summonMorph==='petalknight'?92:84)+Math.max(0,-dy)*20;
  const trail=Math.max(0,along+clearance);point.x-=dx*trail;point.y-=dy*trail;
 }
 return point;
}
export function companionCombatPoint(s,target,p){
 const role=summonTactics(s),count=Math.max(1,s.combatFormationCount||1),index=s.combatFormationIndex||0;
 if(role.ranged){
  const side=Math.atan2(p.y-target.y,p.x-target.x),angle=side+(count===1?0:(index/(count-1)-.5)*1.6);
  return {x:target.x+Math.cos(angle)*role.preferred,y:target.y+Math.sin(angle)*role.preferred};
 }
 const angle=Math.atan2(p.y-target.y,p.x-target.x)+index*Math.PI*2/count,radius=Math.min(role.range+(target.radius||0)-8,Math.max(34,count*11));
 return {x:target.x+Math.cos(angle)*radius,y:target.y+Math.sin(angle)*radius};
}
function peers(p,s,now){
 const owners=new Set([p,...(p.coop?.players||[])]),result=[];
 for(const owner of owners){
  if(owner.hp<=0||owner.active===false)continue;
  result.push(owner);
  for(const pet of owner.summons||[])if(pet!==s&&alive(pet)&&(!pet.expiresAt||pet.expiresAt>now))result.push(pet);
 }
 return [...new Set(result)];
}
export function findCompanionRoom(s,p,w,desired,now,anchor=p){
 const r=companionRadius(s),others=peers(p,s,now);let best=null,bestScore=Infinity;
 const inspect=(x,y)=>{
  if(anchor!==p&&Math.hypot(x-anchor.x,y-anchor.y)>summonTactics(s).range+(anchor.radius||0)-4)return false;
  if(!isActorPositionPassable(w,x,y,r)||!hasLineOfSight(w,anchor.x,anchor.y,x,y))return false;
  let crowd=0;
  for(const other of others){
   if(Math.abs(other.x-x)>100||Math.abs(other.y-y)>100)continue;
   const gap=spacingGap(s,other),distance=spacingDistance(other.x-x,other.y-y);
   if(distance<gap&&hasLineOfSight(w,x,y,other.x,other.y))crowd+=gap-distance;
  }
  const score=Math.hypot(x-desired.x,y-desired.y)+crowd*8;
  if(score<bestScore){best={x,y};bestScore=score;}
  return crowd===0;
 };
 if(inspect(desired.x,desired.y))return best;
 // Look for genuinely empty nearby floor; narrow passages can use a fallback
 // with some crowding, rather than choosing inaccessible slots beyond a wall.
 for(const radius of [20,40,64,96])for(let i=0;i<12;i++){
  const angle=i*Math.PI/6+(s.companionIndex||0)*.17;
  inspect(desired.x+Math.cos(angle)*radius,desired.y+Math.sin(angle)*radius);
 }
 return best||{x:s.x,y:s.y};
}
export function separateCompanions(p,w,dt,now){
 const active=(p.summons||[]).filter(alive),step=Math.min(.05,Math.max(0,dt))*100;
 if(!step)return;
 const own=new Set(active),roomWidths=new Map();
 const hasRoom=actor=>{if(!roomWidths.has(actor))roomWidths.set(actor,wideRoom(actor,w));return roomWidths.get(actor);};
 // Gentle local correction handles saved stacks, converging attack paths,
 // temporary summons and other players' companions without teleporting actors.
 for(let pass=0;pass<2;pass++)for(const s of active){
  let dx=0,dy=0;
  for(const other of peers(p,s,now)){
   const x=s.x-other.x,y=s.y-other.y;
   if(Math.abs(x)>100||Math.abs(y)>100)continue;
   const narrow=!hasRoom(s)||!hasRoom(other);
   // A stable leader passes first; followers give way instead of deadlocking
   // when two formation paths meet at the same one-body doorway.
   if(narrow&&own.has(other)&&s.moving&&(s.companionIndex||0)<(other.companionIndex||0))continue;
   // In a doorway use physical room, so visual spacing cannot block the queue.
   const distance=narrow?Math.hypot(x,y):spacingDistance(x,y),gap=narrow?companionRadius(s)+companionRadius(other)+2:spacingGap(s,other);
   if(distance>=gap||!hasLineOfSight(w,s.x,s.y,other.x,other.y))continue;
   const angle=(s.companionIndex||0)*2.399963+pass*.3;
   const nx=distance>.01?x/distance:Math.cos(angle),ny=distance>.01?y/distance:Math.sin(angle);
   const pressure=(gap-distance)/gap;dx+=nx*pressure;dy+=ny*pressure;
  }
  const length=Math.hypot(dx,dy);if(length<.001)continue;
  const beforeX=s.x,beforeY=s.y,amount=Math.min(step,length*step);
  moveActorWithCollision(s,w,dx/length*amount,dy/length*amount);
  if(Math.hypot(s.x-beforeX,s.y-beforeY)>.05)s.moving=true;
 }
}
const routes=new WeakMap();
function clearSegment(s,w,point){
 const r=companionRadius(s),distance=Math.hypot(point.x-s.x,point.y-s.y),steps=Math.max(1,Math.ceil(distance/10));
 for(let i=1;i<=steps;i++)if(!isActorPositionPassable(w,s.x+(point.x-s.x)*i/steps,s.y+(point.y-s.y)*i/steps,r))return false;
 return true;
}
export function companionNavigationPoint(s,w,goal,now){
 if(clearSegment(s,w,goal)){routes.delete(s);return goal;}
 let state=routes.get(s);
 if(!state||state.world!==w||now>state.until||Math.hypot(state.goal.x-goal.x,state.goal.y-goal.y)>24||(state.path[0]&&!clearSegment(s,w,state.path[0]))){
  const size=32,r=companionRadius(s),startX=Math.floor(s.x/size),startY=Math.floor(s.y/size);
  const key=(x,y)=>`${x},${y}`,center={x:(startX+.5)*size,y:(startY+.5)*size};
  const centered=isActorPositionPassable(w,center.x,center.y,r)&&clearSegment(s,w,center);
  const start={tx:startX,ty:startY,x:centered?center.x:s.x,y:centered?center.y:s.y,cost:0,parent:null};
  const nodes=new Map([[key(startX,startY),start]]),open=[start];let found=null;
  // Small bounded A* search. Actor-sized floor checks forbid corner cutting
  // and routes through doors that are narrower than the companion's body.
  for(let visit=0;open.length&&visit<512;visit++){
   let best=0;
   const score=n=>n.cost+Math.hypot(n.x-goal.x,n.y-goal.y)/size;
   for(let i=1;i<open.length;i++)if(score(open[i])<score(open[best]))best=i;
   const current=open.splice(best,1)[0];
   if(Math.hypot(current.x-goal.x,current.y-goal.y)<size*1.5&&clearSegment({...s,x:current.x,y:current.y},w,goal)){found=current;break;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const tx=current.tx+dx,ty=current.ty+dy,id=key(tx,ty);if(nodes.has(id)||tx<0||ty<0||tx>=w.width||ty>=w.height)continue;
    const x=(tx+.5)*size,y=(ty+.5)*size;
    if(!isActorPositionPassable(w,x,y,r)||!clearSegment({...s,x:current.x,y:current.y},w,{x,y}))continue;
    const node={tx,ty,x,y,cost:current.cost+1,parent:current};nodes.set(id,node);open.push(node);
   }
  }
  const path=[];if(found){for(let n=found;n?.parent;n=n.parent)path.unshift({x:n.x,y:n.y});if(centered&&Math.hypot(start.x-s.x,start.y-s.y)>2)path.unshift({x:start.x,y:start.y});path.push({...goal});}
  state={world:w,goal:{...goal},path,until:now+.7};routes.set(s,state);
 }
 while(state.path.length>1&&Math.hypot(state.path[0].x-s.x,state.path[0].y-s.y)<9&&clearSegment(s,w,state.path[1]))state.path.shift();
 return state.path[0]||{x:s.x,y:s.y};
}
