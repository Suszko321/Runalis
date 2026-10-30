import {prepareVeyreignTransformation,resetVeyreignTransformation} from './veyreignTransformation.js';
import {isMalakarSanctum,encounterState,resetMalakar} from './malakarEncounter.js';
import {TILE} from './data.js';
import {findNearestActorPassablePoint,isActorPositionPassable,isTilePassable} from './world.js';
import {clearEliteEncounters} from './eliteEncounterSystem.js';
import {tuneDungeonBoss} from './dungeonBossDifficulty.js';
import {requestPartyEntry,partyEntryPending} from './partyEntrySystem.js';
const entryLatches = new WeakSet();

const living=e=>e&&!e.dead&&!e.remove&&(e.hp>0||e.veyreignTransform!=null);
const contains=(a,p,inset=0)=>p.x>=a.x+inset&&p.y>=a.y+inset&&p.x<=a.x+a.w-inset&&p.y<=a.y+a.h-inset;
export function bossRetryArrival(world){
 const a=world?.bossArena;if(!a||a.phase==='defeated'||world.dungeonState?.cleared)return null;
 const gates=(world.arenaGates||[]).map(g=>{
  const x=g.x+g.w/2,y=g.y+g.h/2;
  const horizontal=g.w>g.h;
  return {x:x+(horizontal?0:x<a.x+a.w/2?-64:64),y:y+(horizontal?(y<a.y+a.h/2?-64:64):0)};
 }).sort((p,q)=>Math.hypot(p.x-world.spawn.x,p.y-world.spawn.y)-Math.hypot(q.x-world.spawn.x,q.y-world.spawn.y));
 return gates.find(p=>!contains(a,p,-24)&&isActorPositionPassable(world,p.x,p.y,18))||world.spawn;
}
export function initializeDungeonArena(world){
 if(!['dungeon','tower'].includes(world?.mode)&&!(world?.mode==='sideZone'&&world.dungeonState?.grove))return null;
 const bosses=(world.enemies||[]).filter(e=>e.isDungeonMainBoss||e.isBoss&&!e.miniBoss&&!e.summonedBy&&!e.summonedByBoss);
 const room=(world.rooms||[]).find(r=>r.role==='boss')|| (bosses.length?(world.rooms||[]).find(r=>contains({x:r.x*TILE,y:r.y*TILE,w:r.w*TILE,h:r.h*TILE},bosses[0])):null);
 if(!room)return null;
 const state=world.dungeonState||(world.dungeonState={}),arenas=state.arenas||(state.arenas={});
 const a=arenas[world.floor||1]||(arenas[world.floor||1]={phase:state.cleared?'defeated':'dormant'});
 Object.assign(a,{id:`${world.dungeonId}:${world.floor||1}`,x:room.x*TILE,y:room.y*TILE,w:room.w*TILE,h:room.h*TILE,
  bossIds:[...new Set([...(a.bossIds||[]),...bosses.map(e=>e.id)])]});
 world.bossArena=a;world.bossRoomCenter||={x:(room.cx??room.x+room.w/2)*TILE,y:(room.cy??room.y+room.h/2)*TILE};
 world.arenaBarriers=[];
 world.arenaGates=arenaGates(world,room);
 if(a.phase==='active')sealArena(world,a);
 for(const e of bosses){e.arenaId=a.id;e.arenaDormant=a.phase==='dormant';e.homeGuard=true;e.homeX=world.bossRoomCenter.x;e.homeY=world.bossRoomCenter.y;e.leashRadius=Math.max(a.w,a.h);}
 for(const e of bosses)if(e.groveMother||e.orchardCustodian||e.veyreignLord)tuneDungeonBoss(e,e.dungeonBossPartySize||state.coopPlayerCount||e.runalisCoopBossPlayerCount||1);
 return a;
}
function arenaGates(world,room){
 const gates=[];
 for(const side of ['top','bottom','left','right']){
  const horizontal=side==='top'||side==='bottom',length=horizontal?room.w:room.h;let start=-1;
  for(let i=0;i<=length;i++){
   const tx=horizontal?room.x+i:side==='left'?room.x-1:room.x+room.w;
   const ty=horizontal?(side==='top'?room.y-1:room.y+room.h):room.y+i;
   const open=i<length&&isTilePassable(world,tx,ty);
   if(open&&start<0)start=i;
   if(!open&&start>=0){gates.push(horizontal?{x:(room.x+start)*TILE,y:(side==='top'?room.y:room.y+room.h)*TILE-6,w:(i-start)*TILE,h:12}:{x:(side==='left'?room.x:room.x+room.w)*TILE-6,y:(room.y+start)*TILE,w:12,h:(i-start)*TILE});start=-1;}
  }
 }
 return gates;
}
function sealArena(world,a){if(world.arenaBarriers?.length)return;const t=12;world.arenaBarriers=[{x:a.x,y:a.y,w:a.w,h:t},{x:a.x,y:a.y+a.h-t,w:a.w,h:t},{x:a.x,y:a.y,w:t,h:a.h},{x:a.x+a.w-t,y:a.y,w:t,h:a.h}];}
function placeInside(world,a,actor){
 if(!actor||contains(a,actor,24)&&isActorPositionPassable(world,actor.x,actor.y,actor.r||12))return;
 const x=Math.max(a.x+40,Math.min(a.x+a.w-40,actor.x)),y=Math.max(a.y+40,Math.min(a.y+a.h-40,actor.y));
 const p=findNearestActorPassablePoint(world,x,y,actor.r||12);actor.x=p.x;actor.y=p.y;
}
function activateArena(world,a,party,bosses){
 a.phase='active';sealArena(world,a);
 for(const p of party.filter(living)){placeInside(world,a,p);for(const s of p.summons||[])if(living(s))placeInside(world,a,s);}
 for(const e of bosses){e.arenaDormant=false;e.awakened=true;e.aggro=true;e.hasDetectedPlayer=true;e.isInCombat=true;}
 for(const e of bosses)if(e.groveMother||e.orchardCustodian||e.veyreignLord){tuneDungeonBoss(e,party.length);e.dungeonBossPartyLocked=true;}
}
export function updateDungeonArena(world,player,game=null){
 if(!['dungeon','tower'].includes(world?.mode)&&!(world?.mode==='sideZone'&&world.dungeonState?.grove))return;
 const a=world.bossArena||initializeDungeonArena(world);if(!a)return;
 for(const e of world.enemies||[])prepareVeyreignTransformation(world,e);
 const state=world.dungeonState,bosses=(world.enemies||[]).filter(e=>a.bossIds.includes(e.id));
 if(state.cleared||a.bossIds.length&&bosses.every(e=>!living(e))){
  if(a.phase!=='defeated'){clearEliteEncounters(world);world.effects=(world.effects||[]).filter(f=>!f.bossHazard&&!f.arenaId&&f.kind!=='bossTelegraph');}
  a.phase='defeated';world.arenaBarriers=[];return;
 }
 if(a.phase==='defeated')a.phase='dormant';
 const party=[player,...(player?.coop?.players||[]).filter(p=>p.active!==false&&p.joined!==false)];
 const initiator=party.find(p=>living(p)&&contains(a,p,48));
 if(!initiator)entryLatches.delete(world);
 if(!isMalakarSanctum(world)&&a.phase==='dormant'&&initiator&&!entryLatches.has(world)){
  if(game){
   if(partyEntryPending(game))return;
   entryLatches.add(world);
   if(!requestPartyEntry(game,{key:`arena:${a.id}`,kind:'boss',title:bosses[0]?.bossName||bosses[0]?.name||'the boss arena',initiator,
    commit:()=>activateArena(world,a,party,bosses),onCancel:()=>game.log?.('Leave the boss threshold and approach again when the party is ready.')}))return;
  }
  activateArena(world,a,party,bosses);
 }
 if(a.phase==='active'){
  for(const e of bosses)if(e.groveMother||e.orchardCustodian||e.veyreignLord)tuneDungeonBoss(e,party.filter(p=>p.active!==false&&p.joined!==false).length);
  sealArena(world,a);
  for(const p of party.filter(living)){placeInside(world,a,p);for(const s of p.summons||[])if(living(s))placeInside(world,a,s);}
  for(const e of bosses.filter(living))placeInside(world,a,e);
 }
}
export function resetFailedDungeonArena(world){
 entryLatches.delete(world);
 resetMalakar(world);
 const a=world?.bossArena;if(!a||a.phase==='defeated'||world.dungeonState?.cleared)return;
 if(world.mode==='dungeon'&&a.phase==='active')world.dungeonState.bossRetry={floor:world.floor||1,arenaId:a.id};
 a.phase='resetting';clearEliteEncounters(world);world.arenaBarriers=[];
 for(const e of world.enemies||[])if(a.bossIds.includes(e.id)){
  e.hp=e.maxHp;e.dead=e.remove=false;e.x=e.homeX;e.y=e.homeY;e.aggro=e.awakened=e.hasDetectedPlayer=e.isInCombat=false;
  e.attackCooldown=0;e.boss=null;e.bossTell=null;e.telegraph=null;e.visualAction=null;e.arenaDormant=true;
  if(e.groveMother){e.groveAttack=null;e.groveRecovery=2;e.groveTurn=0;e.grovePhase=1;}
  if(e.veyreignLord)resetVeyreignTransformation(e);
  if(e.orchardCustodian){e.orchardAttack=null;e.orchardRecovery=2;e.orchardTurn=0;e.orchardPhase=1;}
  e.dungeonBossPartyLocked=false;
 }
 world.enemies=(world.enemies||[]).filter(e=>!e.summonedBy&&!e.summonedByBoss&&!e.bossAdd);world.effects=[];world.combatEffects=[];
 world.objects=(world.objects||[]).filter(o=>!o.returnPortal);a.phase='dormant';
}
