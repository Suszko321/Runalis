import {getSummonMovementSpeed} from './combat.js';
import {addCombatXP} from './skills.js';
import {objectInInteractionRange,INTERACTION_RANGE} from './interactionRange.js';
import {hasLineOfSight} from './world.js';
import {TILE} from './data.js';
import {findNearestActorPassablePoint,isActorPositionPassable,moveActorWithCollision} from './world.js';
import {initializeSimulatedSubclassPlayer} from './simulatedSubclassPlayers.js';

const runtime = new WeakMap();
const classes = ['fellhunter','gravecaller','oathkeeper','thornbinder','waverider','lightbringer'];
const weapons = ['hunterBow','graveScythe','oathkeepersMace','rootStaff','tideglassRapier','crackedDawnlens'];
const torsos = ['patchedRoadLeathers','necromancerRobe','leatherVest','thornbinderGarb','veyrCourtCoat','patchedTunic'];
const names = ['Velka Ashreed','Serrik Dunmere','Ormira Vellthorn','Caldrin Rook','Nysera Fen','Daevren Grey'];
const loungeSpots = [{x:5.5,y:6.5},{x:8.5,y:5.5},{x:10.5,y:6.5}];
export const ADVENTURER_HIRE_PRICE = 10;
const COMPANION_TALK_DELAY = 3;
const TOWN_TIME = 75;
const FIELD_TIME = 135;
const ROUTE_STEPS = [[1,1],[1,-1],[-1,1],[-1,-1],[0,1],[1,0],[0,-1],[-1,0]];

function roster(player) {
  const memory = player.worldMemory ||= {};
  const records=memory.livingAdventurers ||= classes.map((classId,i)=>({
    id:'living-adventurer-'+i,classId,name:names[i],bodyType:i%2?'male':'female',
    phase:i<3?'town':'field',remaining:35+i*17,dead:false
  }));
  if(!memory.adventurersGuildRoutes){
    for(const record of records)if(!record.hired)delete record.position;
    memory.adventurersGuildRoutes=true;
  }
  return records;
}

export function getHiredAdventurer(world) {
  return world?.objects?.find(actor=>actor.hiredAdventurer&&actor.hp>0&&!actor.depleted);
}

export function changeAdventurerContract(game,npc,actor,hire) {
  const owner=game.player;
  const record=owner.worldMemory?.livingAdventurers?.find(entry=>entry.id===npc?.id);
  if(actor!==owner||!record||record.dead||!npc.livingAdventurer||npc.hp<=0||npc.simulatedInCombat||
    !game.world.objects.includes(npc)||!objectInInteractionRange(actor,npc)||
    !hasLineOfSight(game.world,actor.x,actor.y,npc.x,npc.y))return false;
  if(hire){
    if(owner.worldMemory.livingAdventurers.some(entry=>entry.hired&&!entry.dead)){
      game.log?.('Dismiss your current hired adventurer first.');return false;
    }
    if(!Number.isFinite(owner.gold)||owner.gold<ADVENTURER_HIRE_PRICE){
      game.log?.('You need 10 gold to hire this adventurer.');return false;
    }
    owner.gold-=ADVENTURER_HIRE_PRICE;
  }else if(!record.hired)return false;
  record.hired=hire;
  npc.hiredAdventurer=hire;
  npc.nextRoute=0;
  npc.companionTalkTime=0;
  npc.interactable=!hire;
  if(!hire){
    record.phase=game.world.mode==='adventurersLounge'?'town':'field';
    record.remaining=record.phase==='town'?TOWN_TIME:FIELD_TIME;
    delete record.position;
  }
  game.log?.(hire?`${npc.name} joined your party for 10 gold.`:`${npc.name} left your party.`);
  return true;
}

function path(world,actor,goal) {
  if(!goal)return [];
  const start=[Math.floor(actor.x/TILE),Math.floor(actor.y/TILE)];
  const end=[Math.floor(goal.x/TILE),Math.floor(goal.y/TILE)].join(',');
  const queue=[start], parents=new Map([[start.join(','),null]]);
  for(let i=0;i<queue.length&&i<1300;i++){
    const cell=queue[i], key=cell.join(',');
    if(key===end){
      const route=[];
      for(let node=cell;parents.get(node.join(','));node=parents.get(node.join(','))){
        route.push({x:(node[0]+.5)*TILE,y:(node[1]+.5)*TILE});
      }
      return route.reverse();
    }
    for(const [dx,dy] of ROUTE_STEPS){
      const x=cell[0]+dx,y=cell[1]+dy,next=x+','+y;
      if(parents.has(next)||!isActorPositionPassable(world,(x+.5)*TILE,(y+.5)*TILE,10))continue;
      if(dx&&dy&&(!isActorPositionPassable(world,(x+.5)*TILE,(cell[1]+.5)*TILE,10)||
        !isActorPositionPassable(world,(cell[0]+.5)*TILE,(y+.5)*TILE,10)||
        !isActorPositionPassable(world,(x+.5-dx/2)*TILE,(y+.5-dy/2)*TILE,10)))continue;
      parents.set(next,cell);queue.push([x,y]);
    }
  }
  return [];
}

function entrance(world,phase,index) {
  if(phase==='town')return findNearestActorPassablePoint(world,(3.5+index%3*4)*TILE,(4.5+Math.floor(index/3)*3)*TILE,10,3);
  const gate=world.continentRuntime?.findObject?.('capital-gate-prototype') ||
    world.objects.find(o=>o.kind==='capitalGate'&&o.gateId!=='east');
  if(!gate)return null;
  return findNearestActorPassablePoint(world,gate.x+(index%2?-1:1)*(1150+index*160),gate.y+480+index*180,10,12);
}

export function updateLivingAdventurers(game,dt) {
  const {player,world}=game;
  if(!world||!player||game.onlineSession?.role==='guest')return;
  const phase=world.mode==='adventurersLounge'?'town':world.mode==='overworld'?'field':null;
  const records=roster(player);
  let state=runtime.get(game);
  if(!state||state.world!==world){
    world.objects=world.objects.filter(o=>!o.livingAdventurer);
    state={world,actors:new Map()};runtime.set(game,state);
  }
  for(const [index,record] of records.slice(0,classes.length).entries()){
    let actor=state.actors.get(record.id);
    if(record.dead)continue;
    const hired=record.hired===true;
    if(!hired)record.remaining-=dt;
    // Visible travellers finish their local route before leaving the scene.
    if(!hired&&record.remaining<=0&&(!actor||(!actor.simulatedInCombat&&
       Math.hypot(actor.x-player.x,actor.y-player.y)>420))){
      if(record.phase==='field'&&!actor)record.pendingXp=Math.min(120,(record.pendingXp||0)+15+index*2);
      if(record.phase==='town')delete record.hp;
      record.phase=record.phase==='town'?'field':'town';
      record.remaining=(record.phase==='town'?TOWN_TIME:FIELD_TIME)+index*7;
      delete record.position;
    }
    if(actor?.hp<=0)record.dead=true;
    const follows=hired&&!record.dead&&!['act1Opening','pvpArena'].includes(world.mode);
    const anchor=follows?findNearestActorPassablePoint(world,player.x-36,player.y+24,10,6):phase&&record.phase===phase&&!record.dead?entrance(world,phase,index):null;
    const position=follows?(actor||anchor):record.position||anchor;
    const nearby=follows||anchor&&position&&Math.hypot(position.x-player.x,position.y-player.y)<(phase==='town'?950:720);
    if(!nearby){
      if(actor){world.objects=world.objects.filter(o=>o!==actor);state.actors.delete(record.id);}
      continue;
    }
    if(!actor){
      // The roster owns identity. Resident objects are merely scene projections.
      actor={kind:'npc',id:record.id,name:record.name,classId:record.classId,bodyType:record.bodyType,
        livingAdventurer:true,hiredAdventurer:hired,simulatedPlayer:true,interactable:true,suppressQuestMarker:true,
        disposition:'friendly',r:10,...position};
      initializeSimulatedSubclassPlayer(actor);
      actor.equipment={...actor.equipment,weapon:weapons[index],chest:torsos[index],legs:'roughLegwraps',...record.equipment};
      if(record.combat){actor.skillState.combat={...record.combat};actor.combatLevel=record.combat.level;}
      if(record.pendingXp){addCombatXP(actor,record.pendingXp);delete record.pendingXp;}
      if(record.hp!=null)actor.hp=Math.min(actor.maxHp,record.hp);
      state.actors.set(record.id,actor);
    }
    if(!world.objects.includes(actor))world.objects.push(actor);

    if(follows&&Math.hypot(actor.x-player.x,actor.y-player.y)>700&&!actor.simulatedInCombat)Object.assign(actor,anchor);
    if(!actor.simulatedInCombat){
      if((actor.nextRoute||0)<=0){
        const spot=loungeSpots[index%loungeSpots.length];
        const service={x:spot.x*TILE,y:spot.y*TILE};
        const target=follows?(Math.hypot(actor.x-player.x,actor.y-player.y)>52?anchor:null):phase==='town'?(record.remaining<25?world.objects.find(o=>o.id==='guildLoungeStairs'):service):
          findNearestActorPassablePoint(world,anchor.x+Math.sin(record.remaining/15+index)*180,
            anchor.y+Math.cos(record.remaining/17+index)*180,10,8);
        actor.route=path(world,actor,target);
        actor.nextRoute=follows ? .65 : 12+index*2;
      }
      actor.nextRoute-=dt;
      while(actor.route?.length&&Math.hypot(actor.route[0].x-actor.x,actor.route[0].y-actor.y)<3)actor.route.shift();
      const point=actor.route?.[0];
      actor.isMoving=false;
      if(point){
        const dx=point.x-actor.x,dy=point.y-actor.y,d=Math.hypot(dx,dy);
        const speed=Math.min(d,follows?getSummonMovementSpeed(actor,player)*Math.min(.05,dt):58*dt);
        actor.dirX=dx/d;actor.dirY=dy/d;
        actor.isMoving=moveActorWithCollision(actor,world,actor.dirX*speed,actor.dirY*speed,10);
        if(actor.isMoving)actor.walkTime=((actor.walkTime||0)+dt*9)%10000;
      }
      if(phase==='town')actor.hp=Math.min(actor.maxHp,actor.hp+dt*4);
    }
    const canTalk=follows&&!player.isMoving&&!actor.isMoving&&!actor.simulatedInCombat&&
      Math.hypot(actor.x-player.x,actor.y-player.y)<INTERACTION_RANGE+actor.r&&
      hasLineOfSight(world,player.x,player.y,actor.x,actor.y);
    actor.companionTalkTime=canTalk?Math.min(COMPANION_TALK_DELAY,(actor.companionTalkTime||0)+dt):0;
    actor.interactable=!actor.simulatedInCombat&&(!hired||actor.companionTalkTime>=COMPANION_TALK_DELAY-1e-9);
    record.position={x:actor.x,y:actor.y};
    record.equipment={...actor.equipment};
    record.hp=actor.hp;
    record.combat={...actor.skillState.combat};
  }
}

export function canAdventurerFight(enemy, hired = false) {
  return (enemy.dynamicEncounter||hired)&&!enemy.rewardSuppressed&&!enemy.trainingDummy&&!enemy.friendly&&!enemy.isBoss&&!enemy.worldBoss&&!enemy.miniBoss&&
    !enemy.elite&&!enemy.isElite&&!enemy.eliteModifier&&!enemy.eliteModifiers?.length&&
    !enemy.questCritical&&!enemy.questId&&!enemy.poiId&&!enemy.majorPoiId&&!enemy.bossId;
}
