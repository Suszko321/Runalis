import {getSummonMovementSpeed} from './combat.js';
import {migratePlayer} from './player.js';
import {gearBagCount,gearEquipReason} from './gearItemization.js';
import {GEAR_BAG_CAPACITY} from './gearRarity.js';
import {isItemLocked} from './gearServices.js';
import {objectInInteractionRange,INTERACTION_RANGE} from './interactionRange.js';
import {hasLineOfSight} from './world.js';
import {ITEMS,TILE} from './data.js';
import {findNearestActorPassablePoint,isActorPositionPassable,moveActorWithCollision} from './world.js';
import {initializeSimulatedSubclassPlayer} from './simulatedSubclassPlayers.js';

const runtime = new WeakMap();
const classes = ['fellhunter','gravecaller','oathkeeper','thornbinder','waverider','lightbringer'];
const weapons = ['hunterBow','graveScythe','oathkeepersMace','rootStaff','tideglassRapier','crackedDawnlens'];
const torsos = ['patchedRoadLeathers','necromancerRobe','leatherVest','thornbinderGarb','veyrCourtCoat','patchedTunic'];
const names = ['Velka Ashreed','Serrik Dunmere','Ormira Vellthorn','Caldrin Rook','Nysera Fen','Daevren Grey'];
export const ADVENTURER_HIRE_PRICE = 500;
const COMPANION_TALK_DELAY = 3;
const REVIVE_SECONDS = 20;
const ROUTE_STEPS = [[1,1],[1,-1],[-1,1],[-1,-1],[0,1],[1,0],[0,-1],[-1,0]];
const GEAR_SLOTS = ['weapon','helm','chest','legs','trinket'];

function roster(player) {
  const memory=player.worldMemory ||= {};
  if(!memory.guildHireRoster){
    memory.livingAdventurers=(memory.livingAdventurers||[]).filter(record=>record.hired&&!record.dead);
    memory.guildHireRoster=true;
  }
  return memory.livingAdventurers ||= [];
}

export function hireGuildAdventurer(game,vendor,actor,random=Math.random) {
  if(actor!==game.player||!vendor?.guildContractVendor||game.world.mode!=='capital'||
    !game.world.objects.includes(vendor)||!objectInInteractionRange(actor,vendor)||
    !hasLineOfSight(game.world,actor.x,actor.y,vendor.x,vendor.y))return false;
  if(!Number.isFinite(actor.gold)||actor.gold<ADVENTURER_HIRE_PRICE){
    game.log?.('You need 500 gold to hire an adventurer.');return false;
  }
  const records=roster(actor);
  const index=Math.floor(random()*classes.length);
  const name=names[Math.floor(random()*names.length)].split(' ')[0]+' '+names[Math.floor(random()*names.length)].split(' ')[1];
  for(const record of records)record.hired=false;
  const record={id:'guild-hire-'+(records.length+1),name,classId:classes[index],bodyType:random()<.5?'female':'male',hired:true};
  records.push(record);
  actor.gold-=ADVENTURER_HIRE_PRICE;
  game.log?.(`${name} joined your party for 500 gold.`);
  return true;
}

export function getHiredAdventurer(world) {
  return world?.objects?.find(actor=>actor.hiredAdventurer&&!actor.depleted);
}

export function canManageAdventurer(game,npc,actor) {
  return actor===game.player&&npc?.livingAdventurer&&npc.hp>0&&!npc.simulatedInCombat&&
    game.world.objects.includes(npc)&&objectInInteractionRange(actor,npc)&&
    hasLineOfSight(game.world,actor.x,actor.y,npc.x,npc.y);
}

export function changeAdventurerContract(game,npc,actor,hire) {
  if(!canManageAdventurer(game,npc,actor))return false;
  const records=roster(actor);
  const record=records.find(entry=>entry.id===npc.id);
  if(!record||record.hired===hire)return false;
  if(hire)for(const other of records)other.hired=false;
  record.hired=hire;
  npc.hiredAdventurer=hire;
  npc.nextRoute=0;
  npc.companionTalkTime=0;
  npc.interactable=!hire;
  game.log?.(hire?`${npc.name} joined your party.`:`${npc.name} returned to the upstairs lounge.`);
  return true;
}

export function adventurerGearOptions(owner) {
  return (owner.inventory||[]).filter(entry=>entry.instanceId&&!isItemLocked(entry)&&
    GEAR_SLOTS.includes(ITEMS[entry.id]?.slot)&&!gearEquipReason(owner,entry.id,entry));
}

export function transferAdventurerGear(game,npc,owner,slot,instanceId) {
  if(!canManageAdventurer(game,npc,owner)||!GEAR_SLOTS.includes(slot))return false;
  const record=roster(owner).find(entry=>entry.id===npc.id);
  if(!record)return false;
  const gear=record.gear ||= {};
  const previous=gear[slot];
  const incoming=instanceId?adventurerGearOptions(owner).find(entry=>entry.instanceId===instanceId&&ITEMS[entry.id].slot===slot):null;
  if(instanceId&&!incoming||!incoming&&!previous)return false;
  if(!incoming&&gearBagCount(owner)>=GEAR_BAG_CAPACITY)return false;
  if(incoming)owner.inventory.splice(owner.inventory.indexOf(incoming),1);
  if(previous)owner.inventory.push(previous);
  if(incoming)gear[slot]=incoming;
  else delete gear[slot];
  npc.equipment[slot]=incoming?.id||null;
  npc.equippedGear[slot]=incoming||null;
  record.equipment={...npc.equipment};
  migratePlayer(npc);
  return true;
}

function path(world,actor,goal) {
  if(!goal)return [];
  const dx=goal.x-actor.x,dy=goal.y-actor.y;
  const steps=Math.ceil(Math.hypot(dx,dy)/10);
  if(steps<=30&&Array.from({length:steps},(_,i)=>(i+1)/steps).every(t=>
    isActorPositionPassable(world,actor.x+dx*t,actor.y+dy*t,10)))return [goal];
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

export function updateLivingAdventurers(game,dt) {
  const {player,world}=game;
  if(!world||!player||game.onlineSession?.role==='guest')return;
  const lounge=world.mode==='adventurersLounge';
  const records=roster(player);
  if(world.objects.some(o=>o.simulatedPlayer&&o.role==='traveler'))world.objects=world.objects.filter(o=>!(o.simulatedPlayer&&o.role==='traveler'));
  let state=runtime.get(game);
  if(!state||state.world!==world){
    world.objects=world.objects.filter(o=>!o.livingAdventurer);
    state={world,actors:new Map()};runtime.set(game,state);
  }
  for(const [index,record] of records.entries()){
    let actor=state.actors.get(record.id);
    const hired=record.hired===true;
    if((actor?actor.hp<=0:record.hp===0)&&record.reviveRemaining==null)record.reviveRemaining=REVIVE_SECONDS;
    if(record.reviveRemaining!=null){
      record.reviveRemaining=Math.max(0,record.reviveRemaining-dt);
      if(record.reviveRemaining<=1e-9){
        delete record.reviveRemaining;delete record.hp;
        if(actor){actor.hp=actor.maxHp;actor.adventurerDowned=false;}
      }
    }
    const follows=hired&&!['act1Opening','pvpArena'].includes(world.mode);
    const nearby=follows||(!hired&&lounge);
    const anchor=nearby&&(follows?findNearestActorPassablePoint(world,player.x-36,player.y+24,10,6):
      {x:(2.5+index%6*2)*TILE,y:(3.5+Math.floor(index/6)%4*1.5)*TILE});
    const position=actor||anchor;
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
      const kit=Math.max(0,classes.indexOf(record.classId));
      actor.equipment={...actor.equipment,weapon:weapons[kit],chest:torsos[kit],legs:'roughLegwraps',...record.equipment};
      actor.equippedGear={...record.gear};
      if(record.skills)Object.assign(actor.skillState.skills,structuredClone(record.skills));
      if(record.combat){actor.skillState.combat={...record.combat};actor.combatLevel=record.combat.level;}
      migratePlayer(actor);
      if(record.hp!=null)actor.hp=Math.min(actor.maxHp,record.hp);
      state.actors.set(record.id,actor);
    }
    actor.hiredAdventurer=hired;
    actor.reviveRemaining=record.reviveRemaining||0;
    actor.adventurerDowned=record.reviveRemaining!=null;
    if(actor.adventurerDowned){
      actor.hp=0;actor.isMoving=false;actor.interactable=false;
    }
    if(!world.objects.includes(actor))world.objects.push(actor);

    if(follows&&!actor.adventurerDowned&&Math.hypot(actor.x-player.x,actor.y-player.y)>700&&!actor.simulatedInCombat)Object.assign(actor,anchor);
    if(!actor.simulatedInCombat&&!actor.adventurerDowned){
      const ownerDistance=Math.hypot(actor.x-player.x,actor.y-player.y);
      if(follows){
        actor.following=ownerDistance>(actor.following?48:68);
        if(!actor.following){actor.route=[];actor.nextRoute=0;}
      }
      if((actor.nextRoute||0)<=0){
        const target=follows&&actor.following?anchor:null;
        actor.route=path(world,actor,target);
        actor.nextRoute=follows ? .65 : 12+index*2;
      }
      actor.nextRoute-=dt;
      while(actor.route?.length&&Math.hypot(actor.route[0].x-actor.x,actor.route[0].y-actor.y)<3)actor.route.shift();
      const point=actor.route?.[0];
      actor.isMoving=false;
      if(point){
        const dx=point.x-actor.x,dy=point.y-actor.y,d=Math.hypot(dx,dy);
        const travelSpeed=follows?Math.min(getSummonMovementSpeed(actor,player),90+Math.max(0,ownerDistance-65)*1.3):58;
        const arrivalSpeed=actor.route.length===1?Math.min(travelSpeed,Math.max(26,d*4)):travelSpeed;
        actor.routeSpeed=(actor.routeSpeed||0)+Math.max(-320*dt,Math.min(260*dt,arrivalSpeed-(actor.routeSpeed||0)));
        const speed=Math.min(d,actor.routeSpeed*Math.min(.05,dt));
        actor.dirX=dx/d;actor.dirY=dy/d;
        actor.isMoving=moveActorWithCollision(actor,world,actor.dirX*speed,actor.dirY*speed,10);
        if(actor.isMoving)actor.walkTime=((actor.walkTime||0)+dt*Math.min(15,actor.routeSpeed*.155))%10000;
      }else actor.routeSpeed=0;
      if(lounge)actor.hp=Math.min(actor.maxHp,actor.hp+dt*4);
    }
    const canTalk=follows&&!player.isMoving&&!actor.isMoving&&!actor.simulatedInCombat&&
      Math.hypot(actor.x-player.x,actor.y-player.y)<INTERACTION_RANGE+actor.r&&
      hasLineOfSight(world,player.x,player.y,actor.x,actor.y);
    actor.companionTalkTime=canTalk?Math.min(COMPANION_TALK_DELAY,(actor.companionTalkTime||0)+dt):0;
    actor.interactable=!actor.adventurerDowned&&!actor.simulatedInCombat&&(!hired||actor.companionTalkTime>=COMPANION_TALK_DELAY-1e-9);
    record.position={x:actor.x,y:actor.y};
    record.equipment={...actor.equipment};
    record.hp=actor.hp;
    record.combat={...actor.skillState.combat};
    record.skills=actor.skillState.skills;
  }
}

export function canAdventurerFight(enemy, hired = false) {
  return (enemy.dynamicEncounter||hired)&&!enemy.rewardSuppressed&&!enemy.trainingDummy&&!enemy.friendly&&!enemy.isBoss&&!enemy.worldBoss&&!enemy.miniBoss&&
    !enemy.elite&&!enemy.isElite&&!enemy.eliteModifier&&!enemy.eliteModifiers?.length&&
    !enemy.questCritical&&!enemy.questId&&!enemy.poiId&&!enemy.majorPoiId&&!enemy.bossId;
}
