import {classMovementProfile} from './classMovementProfiles.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {SUBCLASSES,normalizeSubclassClassId} from './subclassData.js';
import {isActorPositionPassable,hasLineOfSight} from './world.js';
const states=new WeakMap();
const mobilityIds={gravecaller:'gravecallerGhostwalk',oathkeeper:'oathkeeperDivineLeap',fellhunter:'fellhunterGrapplingHook',lightbringer:'lightbringerDawnstep',thornbinder:'thornbinderBriarstride',waverider:'hydromancerRiptideStep'};
function palette(p,ability){
 const base=classMovementProfile(p.classId);if(!base)return null;
 const morph=ability?.subclassId||getSelectedAbilityMorph(p,ability?.id||mobilityIds[normalizeSubclassClassId(p.classId)]);
 const sub=SUBCLASSES[morph];return {...base,color:sub?.colors[0]||base.color,light:sub?.colors[1]||base.light,morph:sub?.id||null};
}
function emit(p,w,kind,x,y,profile,extra={}){
 w.effects ||= [];if(w.effects.length>=280)return;
 const ghost=profile.motif==='spectral'&&kind==='trail'?{classId:p.classId,x,y,dirX:p.dirX,dirY:p.dirY,skin:p.skin,hair:p.hair,bodyType:p.bodyType,hairStyle:p.hairStyle,shirt:p.shirt,pants:p.pants,boots:p.boots,equipment:{...p.equipment},actionState:{dashing:true},walkTime:p.walkTime}:undefined;
 w.effects.push({kind:'classMovement',phase:kind,x,y,dirX:p.actionState?.dashDirX??p.dirX??0,dirY:p.actionState?.dashDirY??p.dirY??1,...profile,ghost,age:0,ttl:kind==='landing'?.32:.25,layer:'behind',...extra});
}
function context(p,w,profile){
 const tile=w.tiles?.[Math.floor(p.y/32)]?.[Math.floor(p.x/32)],text=`${tile?.biome||''} ${w.theme||''} ${w.regionId||''} ${w.worldAtmosphere?.ecology||''}`;
 return profile.motif==='current'&&/water|marsh|river|mire/.test(text)?'ripples':profile.motif==='leaves'&&/grass|forest|woodland|thorn|grove/.test(text)?'foliage':profile.motif==='spectral'&&/grave|crypt|dead|burial|ruin/.test(text)?'runes':profile.motif==='radiant'&&/holy|aureate|pilgrim/.test(text)?'consecrated':null;
}
export function updateClassMovement(p,w,dt,now){
 const profile=palette(p);if(!profile||!w||!(p.hp>0))return;
 let s=states.get(p);if(!s||s.world!==w){s={world:w,lastDash:p.actionState?.lastDashTime||0,active:false,next:0};states.set(p,s);}
 const action=p.actionState||{};
 if(action.dashing&&(!s.active||s.lastDash!==action.lastDashTime)){
  s.active=true;s.lastDash=action.lastDashTime;s.next=now+.045;emit(p,w,'launch',p.x,p.y,profile);
 }
 if(action.dashing&&now>=s.next){s.next=now+.05;emit(p,w,'trail',p.x,p.y,profile);}
 if(s.active&&!action.dashing){s.active=false;emit(p,w,'landing',p.x,p.y,profile,{context:context(p,w,profile)});}
}
export function presentClassMobility(p,w,before,ability,now){
 const profile=palette(p,ability),distance=Math.hypot(p.x-before.x,p.y-before.y);if(!profile||distance<8)return;
 // Interpolate only the travelled, collision-checked segment, never a proposed
 // destination on the other side of a boundary. At most four short-lived marks.
 const count=Math.min(3,Math.ceil(distance/55));
 for(let i=0;i<count;i++){
  const x=before.x+(p.x-before.x)*i/count,y=before.y+(p.y-before.y)*i/count;
  if(!w.tiles?.length||isActorPositionPassable(w,x,y,p.radius||12)&&hasLineOfSight(w,before.x,before.y,x,y))emit(p,w,'trail',x,y,profile,{dirX:(p.x-before.x)/distance,dirY:(p.y-before.y)/distance});
 }
 emit(p,w,'landing',p.x,p.y,profile,{context:context(p,w,profile),dirX:(p.x-before.x)/distance,dirY:(p.y-before.y)/distance});
}
