import {TILE} from './data.js';
import {CONTINENT_ROADS,continentRoadAt} from './continentDefinition.js';
import {alongRoute} from './echorynGeography.js';
import {geographicEncounterProfile,encounterRng} from './encounterData.js';
import {continentalMemory,captureContinentalState} from './continentPersistence.js';
import {isActorPositionPassable,moveActorWithCollision,hasLineOfSight} from './world.js';
import {enemyWithinTargetView} from './enemyVisibility.js';
import {resetEliteEnemy} from './eliteEncounterSystem.js';

const alive=e=>e&&!e.dead&&!e.remove&&e.hp>0;
const protectedKinds=new Set(['navStone','campfire','capitalGate','towerEntrance','dungeonEntrance','travelRouteEntrance','travelRouteExit']);
export function updatePopulationPatrol(enemy,world,player,dt){
 if(!enemy.patrolRoute?.length||enemy.aggro||enemy.awakened||enemy.alerted||enemy.isInCombat||enemy.hasDetectedPlayer||enemy.returningHome||Math.hypot(enemy.x-player.x,enemy.y-player.y)<(enemy.aggroRange||240))return false;
 const point=enemy.patrolRoute[enemy.patrolIndex||0],dx=point.x-enemy.x,dy=point.y-enemy.y,d=Math.hypot(dx,dy);
 if(d<16){enemy.patrolIndex=((enemy.patrolIndex||0)+1)%enemy.patrolRoute.length;return true;}
 const beforeX=enemy.x,beforeY=enemy.y;moveActorWithCollision(enemy,world,dx/d*Math.min(d,(enemy.speed||55)*.55*dt),dy/d*Math.min(d,(enemy.speed||55)*.55*dt));
 enemy.patrolBlockedTime=Math.hypot(enemy.x-beforeX,enemy.y-beforeY)<.1?(enemy.patrolBlockedTime||0)+dt:0;
 if(enemy.patrolBlockedTime>1){enemy.patrolIndex=((enemy.patrolIndex||0)+1)%enemy.patrolRoute.length;enemy.patrolBlockedTime=0;}return true;
}
export function createPopulationPatrol(world,enemy,rng=encounterRng(enemy.id)){
 const origin={x:enemy.x,y:enemy.y},radius=enemy.radius||14;
 for(let i=0;i<16;i++){const angle=rng()*Math.PI*2,length=60+rng()*100,point={x:origin.x+Math.cos(angle)*length,y:origin.y+Math.sin(angle)*length};
 if(!isActorPositionPassable(world,point.x,point.y,radius)||!hasLineOfSight(world,origin.x,origin.y,point.x,point.y))continue;
 if(Array.from({length:9},(_,j)=>isActorPositionPassable(world,origin.x+(point.x-origin.x)*j/8,origin.y+(point.y-origin.y)*j/8,radius)).every(Boolean))return[origin,point];}
 return null;
}
export function buildPopulationAreas(world){
 const areas=[...(world.encounterAreas||[])].map(a=>({...a,populationType:'resident'}));
 for(const l of world.authoredLocations||[]){
  if(!l.id||/orrakai|outpost|market|town|gate|ward|sanctuary|navstone|arrival/i.test(`${l.id} ${l.name}`))continue;
  if(areas.some(a=>Math.hypot(a.x-l.x/TILE,a.y-l.y/TILE)<12))continue;
  areas.push({id:`site-population-${l.id}`,x:l.x/TILE,y:l.y/TILE,rx:7,ry:6,populationType:/camp|nest|ruin|grave|crypt/i.test(`${l.id} ${l.name}`)?'resident':'patrol',optional:true});
 }
 for(const road of CONTINENT_ROADS){let index=0;alongRoute(road,48,(x,y,nx,ny)=>{
  if(areas.some(a=>Math.hypot(a.x-x,a.y-y)<20))return;
  areas.push({id:`road-population-${road.id}-${index++}`,x:x+nx*5,y:y+ny*5,rx:6,ry:5,populationType:'patrol',roadId:road.id});
 });}
 return areas;
}
export function populationPositionSafe(world,party,x,y,radius=14){
 if(!isActorPositionPassable(world,x,y,radius))return false;
 if(Math.hypot(x-21*TILE,y-31*TILE)<28*TILE)return false;
 if(party.some(p=>Math.hypot(p.x-x,p.y-y)<512||enemyWithinTargetView({x,y},p,world,96)))return false;
 const locations=world.continentLocations||world.objects||[];
 if((world.authoredLocations||[]).some(o=>/saint-orvane|zarynth-trade-ward|public-market/i.test(o.id)&&Math.hypot(o.x-x,o.y-y)<Math.max(900,o.discoveryRadius||0)))return false;
 if(locations.some(o=>protectedKinds.has(o.kind)&&Math.hypot(o.x-x,o.y-y)<(o.kind==='capitalGate'?550:160)||o.kind==='npc'&&o.disposition!=='hostile'&&Math.hypot(o.x-x,o.y-y)<120))return false;
 return !(world.enemies||[]).some(e=>alive(e)&&Math.hypot(e.x-x,e.y-y)<radius+(e.radius||12)+14);
}
export function updateAuthoredPopulation(game,dt,spawnPack,spawnTraveler=null){
 const w=game.world,p=game.player,memory=continentalMemory(p),now=Number(p.worldMemory?.elapsed)||0;
 const party=[p,...(p.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false&&a.hp>0)];
 w.populationAreas ||= buildPopulationAreas(w);
 const state=w.overworldPopulationState ||= {timer:0};state.timer-=dt;if(state.timer>0)return;state.timer=1.2;
 const runtime=w.continentRuntime;let changed=false;
 // Resident deaths stay saved until a bounded timer has elapsed away from view.
 for(const e of runtime.allEnemies||[]){
  if(!e.dead&&!e.remove&&e.hp>0||e.isBoss||e.worldBoss||e.miniBoss||e.questCritical||e.namedExteriorElite||e.majorPoiId||e.poiId||e.bossId||e.dynamicEncounter)continue;
  const saved=memory.entities[e.id] ||= {kind:'enemy',dead:true,remove:true,hp:0};
  const profile=geographicEncounterProfile((e.homeX??e.x)/TILE,(e.homeY??e.y)/TILE);
  saved.respawnAt ??=now+profile.respawn[0]+encounterRng(`${e.id}:${now|0}`)()*(profile.respawn[1]-profile.respawn[0]);
  if(saved.respawnAt>now||!populationPositionSafe(w,party,e.homeX??e.x,e.homeY??e.y,e.radius||12))continue;
  e.x=e.homeX??e.x;e.y=e.homeY??e.y;e.hp=e.maxHp;e.dead=e.remove=e.deathHandled=e.enemyWorldLootGenerated=e.enemyEquipmentLootRolled=false;e.alive=true;e.aggro=0;e.isInCombat=false;e.attackCooldown=0;
  // Residents reuse their entity object; expired death opacity must not follow
  // them into a new life or prevent the next death animation from starting.
  delete e.visualDeath;delete e.visualReaction;
  e.awakened=e.alerted=e.hasDetectedPlayer=e.returningHome=false;
  resetEliteEnemy(w,e);delete memory.entities[e.id];changed=true;
 }
 let spawned=0;
 for(const a of w.populationAreas){
  if(spawned>=2||(w.enemies||[]).filter(e=>e.dynamicEncounter&&alive(e)).length>=80)break;
  const ax=(a.x+.5)*TILE,ay=(a.y+.5)*TILE;
  if(!party.some(actor=>Math.hypot(actor.x-ax,actor.y-ay)<76*TILE))continue;
  const profile=geographicEncounterProfile(a.x,a.y,a.type),ledger=memory.events[a.id];
  if(profile.count[1]===0)continue;
  if(ledger){
   ledger.nextAt ??=now+profile.respawn[0];
   const members=ledger.memberIds||[];
   const living=members.some(id=>alive(runtime.findObject(id))||memory.generated[id]&&!memory.entities[id]?.dead);
   if(living)continue;
   if(ledger.status==='active'){
    ledger.status=members.every(id=>memory.entities[id]?.dead||runtime.findObject(id)?.dead)?'cleared':'expired';ledger.nextAt=now+profile.respawn[0]+encounterRng(`${ledger.encounterId}:respawn`)()*(profile.respawn[1]-profile.respawn[0]);
    const cache=runtime.findObject(`${ledger.encounterId}:cache`)||(w.objects||[]).find(o=>o.id===`${ledger.encounterId}:cache`);
    if(cache){if(ledger.status==='cleared'){cache.locked=false;cache.completed=true;}else cache.remove=true;}
   }
   if(now<Number(ledger.nextAt??(ledger.startedAt||now)+720))continue;
  }
  const cycle=ledger?Number(ledger.cycle||0)+1:0,id=`ow-${a.id}-${cycle}`,rng=encounterRng(id);
  const point=[a.x+(rng()-.5)*a.rx,a.y+(rng()-.5)*a.ry,a.type||profile.id];point.stableId=a.id;point.area=a;point.profile=profile;
  const x=(point[0]+.5)*TILE,y=(point[1]+.5)*TILE;
  if(!populationPositionSafe(w,party,x,y)||a.quietRoad&&continentRoadAt(point[0],point[1],a.roadBuffer||7))continue;
  const nextAt=now+profile.respawn[0]+rng()*(profile.respawn[1]-profile.respawn[0]);
  if(spawnTraveler&&a.populationType==='patrol'&&rng()<.12&&(w.objects||[]).filter(o=>o.dynamicEncounter&&o.kind==='npc'&&!o.remove).length<4){
   spawnTraveler(w,point,id,now,rng);memory.events[a.id]={cycle,encounterId:id,status:'traveler',startedAt:now,nextAt,memberIds:[]};spawned++;changed=true;continue;
  }
  if(rng()<.12){memory.events[a.id]={cycle,encounterId:id,status:'empty',startedAt:now,nextAt,memberIds:[]};continue;}
  const before=new Set((w.enemies||[]).map(e=>e.id));spawnPack(w,point,id,a.tier||Math.max(1,Math.ceil(profile.levels[0]/5)),now,rng,party);
  const members=(w.enemies||[]).filter(e=>!before.has(e.id));
  const event=members.length&&(w.objects||[]).filter(o=>o.encounterEvent&&o.kind==='worldCache'&&o.locked&&!o.remove).length<2&&rng()<profile.eventChance?(a.populationType==='patrol'?'checkpoint':members.some(e=>/wolf|beast/i.test(e.kind))?'predator':'guardedCache'):null;
  const entry=memory.events[a.id]={cycle,encounterId:id,status:members.length?'active':'empty',startedAt:now,nextAt,memberIds:members.map(e=>e.id),event};
  for(const e of members){e.populationAreaId=a.id;e.populationCycle=cycle;e.populationNextAt=nextAt;e.despawnAfter=900;e.patrolRoute=a.populationType==='patrol'?createPopulationPatrol(w,e):null;runtime.register(e,'enemies');}
  if(event){
   const champion=members[0];champion.encounterEvent=event;
   const cache={id:`${id}:cache`,kind:'worldCache',name:event==='checkpoint'?'Guarded Checkpoint Supplies':event==='predator'?'Rare Predator Cache':'Guarded Ruin Cache',x,y,r:20,rewards:[['ashCoin',Math.max(3,Math.floor(profile.levels[0]/2))],['fieldRations',1]],xp:0,locked:true,completed:false,encounterEvent:event,populationAreaId:a.id,dynamicEncounter:true,spawnedAt:now,despawnAfter:900};
   w.objects.push(cache);runtime.register(cache);
  }
  spawned++;changed=true;
 }
 if(changed){captureContinentalState(game);runtime.activate(party,p,true);}
}
