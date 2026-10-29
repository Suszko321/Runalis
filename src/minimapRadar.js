// Lightweight radar with authored road lines and cached local dungeon contours.
import {getQuestsForNpc} from './worldContent.js';
import {isQuestObjectVisible} from './questInteractables.js';
import {drawMinimapLineArt} from './minimapLineArt.js';
import {WORKSHOP_MARKERS,drawWorkshopIcon} from './workshopArt.js';
export const RADAR_COLORS=Object.freeze({friendly:'#f5f1e6',enemy:'#ef5554',entrance:'#edc65c',quest:'#59adff'});
const ENTRANCES=new Set(['dungeonEntrance','towerEntrance','sideZoneEntrance','poiEntrance','poiMarker','dungeonExit','dungeonStairs','capitalGate','capitalExit','travelRouteGate']);
const ID_FIELDS=['id','npcId','objectId','eventId','poiId','dungeonId','locationId','targetId','sourceEntityId','itemId'];
const questCache=new WeakMap(),backgrounds=new WeakMap();
const active=e=>e&&e.alive!==false&&!e.dead&&!e.remove&&!e.hidden&&!e.depleted&&!e.collected&&!(Number.isFinite(e.hp)&&e.hp<=0);
export function radarRank(e){return e.isBoss||e.worldBoss||e.bossType?'boss':e.elite||e.isElite||e.eliteModifier||e.eliteModifiers?.length||e.namedExteriorElite||['elite','rare','champion'].includes(e.encounterTier)?'elite':null;}

export function buildRadarQuestTargets(player,objects=[]){
 const ids=new Set(),questIds=new Set(),completed=new Set();
 const states=[player?.quests,player?.questState].filter(Boolean);
 for(const state of states)for(const id of [...Object.keys(state.completed||{}),...Object.keys(state.failed||{})])completed.add(id);
 const done=id=>states.some(s=>s.completed?.[id]||s.failed?.[id]);
 const add=o=>{for(const key of ID_FIELDS)if(typeof o?.[key]==='string')ids.add(o[key]);};
 for(const state of states)for(const [id,q] of Object.entries(state.active||{})){
  if(!q||done(id))continue;questIds.add(id);
  if(q.giverNpcId)ids.add(q.giverNpcId);
  const stage=q.stages?.[q.currentStageIndex||0];
  for(const objective of stage?.objectives||q.objectives||[]){
   if(objective.completed||(Number(objective.current??objective.progress??0)>=Number(objective.required||1)))continue;
   add(objective);if(typeof objective.target==='string')ids.add(objective.target);else add(objective.target);
  }
 }
 for(const object of objects)if(object?.kind==='npc'&&object.npcId){
  if(getQuestsForNpc(object.npcId).some(q=>!done(q.id)))ids.add(object.npcId);
 }
 return {ids,questIds,completed,player};
}
function targetsFor(game,now){
 const old=questCache.get(game),world=game.world,player=game.player;
 if(old&&old.world===world&&old.player===player&&now-old.at<500)return old.targets;
 const targets=buildRadarQuestTargets(player,world.objects||[]);questCache.set(game,{world,player,at:now,targets});return targets;
}
export function classifyRadarMarker(entity,group,targets={ids:new Set(),questIds:new Set()}){
 if(!active(entity))return null;
 if(!isQuestObjectVisible(entity,targets.player))return null;
 if(entity.hideOnRadar)return null;
 const service=WORKSHOP_MARKERS[entity.workshopService];
 if(service)return {...service,service:entity.workshopService,quest:ID_FIELDS.some(key=>targets.ids.has(entity[key]))};
 const friendly=entity.friendly||entity.disposition==='friendly'||['ally','friendly','player'].includes(entity.team);
 if(group==='enemy')return {color:friendly?RADAR_COLORS.friendly:RADAR_COLORS.enemy,shape:friendly?'dot':radarRank(entity)||'dot'};
 if(group==='player')return {color:RADAR_COLORS.friendly,shape:'arrow'};
 if(group==='friendly')return {color:RADAR_COLORS.friendly,shape:'dot'};
 const refs=[entity.questId,entity.sideQuestId,...(Array.isArray(entity.questIds)?entity.questIds:[])].filter(id=>typeof id==='string');
 const openQuest=refs.some(id=>!targets.completed?.has(id));
 if(((entity.questRelated||entity.isQuestObjective||entity.isQuestGiver)&&(!refs.length||openQuest))||openQuest||targets.questIds.has(entity.questId)||ID_FIELDS.some(key=>targets.ids.has(entity[key])))return {color:RADAR_COLORS.quest,shape:'dot'};
 if(ENTRANCES.has(entity.kind)||entity.echorynEntrance)return {color:RADAR_COLORS.entrance,shape:'dot'};
 if(entity.kind==='npc'||friendly)return {color:RADAR_COLORS.friendly,shape:'dot'};
 return null;
}
function background(ctx,size){
 let entry=backgrounds.get(ctx);if(entry?.size===size)return entry.canvas;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d'),r=size/2;
 c.fillStyle='#101a1d';c.beginPath();c.arc(r,r,r-3,0,Math.PI*2);c.fill();
 c.strokeStyle='#253538';c.lineWidth=1;
 for(const f of [.43,.76]){c.beginPath();c.arc(r,r,(r-7)*f,0,Math.PI*2);c.stroke();}
 c.strokeStyle='#2d3a39';c.beginPath();c.moveTo(r,14);c.lineTo(r,size-14);c.moveTo(14,r);c.lineTo(size-14,r);c.stroke();
 c.strokeStyle='#a58a55';c.lineWidth=2;c.beginPath();c.arc(r,r,r-3,0,Math.PI*2);c.stroke();c.strokeStyle='#343a32';c.lineWidth=1;c.beginPath();c.arc(r,r,r-7,0,Math.PI*2);c.stroke();
 c.font='bold 10px Georgia';c.textAlign='center';c.fillStyle='#e1ca90';c.fillText('N',r,14);
 backgrounds.set(ctx,{size,canvas});return canvas;
}
function marker(ctx,x,y,color,shape,actor){
 if(shape==='anvil'||shape==='tools'){drawWorkshopIcon(ctx,shape==='anvil'?'blacksmith':'craftsman',x,y,12);return;}
 ctx.fillStyle=color;ctx.strokeStyle='#080e11';ctx.lineWidth=2;
 ctx.beginPath();
 if(shape==='arrow'){
  let dx=Number(actor?.dirX)||0,dy=Number(actor?.dirY)||0;const length=Math.hypot(dx,dy);
  if(length){dx/=length;dy/=length;}else dy=1;
  ctx.moveTo(x+dx*7,y+dy*7);
  ctx.lineTo(x-dx*4-dy*4,y-dy*4+dx*4);
  ctx.lineTo(x-dx*2,y-dy*2);
  ctx.lineTo(x-dx*4+dy*4,y-dy*4-dx*4);ctx.closePath();
 }
 else if(shape==='boss'){ctx.moveTo(x-5,y+4);ctx.lineTo(x-6,y-3);ctx.lineTo(x-2,y);ctx.lineTo(x,y-5);ctx.lineTo(x+2,y);ctx.lineTo(x+6,y-3);ctx.lineTo(x+5,y+4);ctx.closePath();}
 else if(shape==='elite'){ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.closePath();}
 else ctx.arc(x,y,2.5,0,Math.PI*2);
 ctx.stroke();ctx.fill();
}
export function drawEntityRadar(ctx,game,size,{centerWorld=game.player,radiusTiles=28,isVisible=()=>true,isTerrainVisible=()=>true,labelPlayers=false}={}){
 const now=typeof performance!=='undefined'?performance.now():Date.now(),world=game.world,targets=targetsFor(game,now),tile=world.tileSize||32;
 const r=size/2,limit=r-12,worldRadius=radiusTiles*tile,scale=limit/worldRadius,limitSq=worldRadius*worldRadius;
 ctx.clearRect(0,0,size,size);ctx.drawImage(background(ctx,size),0,0);ctx.save();ctx.beginPath();ctx.arc(r,r,r-9,0,Math.PI*2);ctx.clip();
 const counts={markers:0,candidates:0,services:[],...drawMinimapLineArt(ctx,world,{centerWorld,worldRadius,scale,r,isTerrainVisible})};
 const draw=(e,group)=>{
  if(!active(e))return;counts.candidates++;
  const dx=Number(e.x)-Number(centerWorld.x),dy=Number(e.y)-Number(centerWorld.y);
  if(!Number.isFinite(dx+dy)||dx*dx+dy*dy>limitSq)return;
  const m=classifyRadarMarker(e,group,targets);if(!m||!isVisible(e,group,m))return;
  marker(ctx,Math.round(r+dx*scale),Math.round(r+dy*scale),m.color,m.shape,e);counts.markers++;
  if(m.service){counts.services.push({x:r+dx*scale,y:r+dy*scale,id:e.id,tooltip:m.tooltip});if(m.quest){ctx.fillStyle=RADAR_COLORS.quest;ctx.fillRect(Math.round(r+dx*scale+5),Math.round(r+dy*scale-6),3,3);}}
 };
 for(const o of world.objects||[])draw(o,'object');
 for(const e of world.enemies||[])draw(e,'enemy');
 const party=[game.player,...(game.player.coop?.players||[]).filter(p=>p&&p.active!==false)];
 for(const owner of party)for(const s of owner.summons||[])draw(s,'friendly');
 for(const [i,p] of [...party.entries()].reverse()){draw(p,p===game.player?'player':'friendly');if(labelPlayers){ctx.fillStyle=RADAR_COLORS.friendly;ctx.font='9px sans-serif';ctx.fillText(`P${i+1}`,r+(p.x-centerWorld.x)*scale+5,r+(p.y-centerWorld.y)*scale-5);}}
 ctx.restore();ctx.canvas.__workshopMarkers=counts.services;ctx.canvas.__workshopMarkerSize=size;return counts;
}
