import {bowSourceSide} from './bowOrientation.js';
import {getMythicalVisualStyle} from './mythicalEquipmentData.js';
import {FACTION_STYLES} from './enemyVisualProfiles.js';
import {ENEMY_EQUIPMENT_ITEMS} from './enemyEquipmentData.js';
import {asset} from './spriteArt.js';
import {humanoidGearRamp} from './humanEquipmentSprites.js';
const tinted=new Map();
const infectedUniforms=new Map();
const refId=ref=>typeof ref==='string'?ref:ref?.id||ref?.itemId;
function pixel(ctx,color,x,y,w=1,h=1){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
// Scanline polygons keep diagonals on a pixel grid, including close-up review.
function shape(ctx,color,points){
 const min=Math.floor(Math.min(...points.map(p=>p[1]))),max=Math.ceil(Math.max(...points.map(p=>p[1])));
 for(let y=min;y<max;y++){const xs=[];for(let n=0;n<points.length;n++){const a=points[n],b=points[(n+1)%points.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((a,b)=>a-b);for(let n=0;n+1<xs.length;n+=2)pixel(ctx,color,Math.ceil(xs[n]),y,Math.max(1,Math.floor(xs[n+1])-Math.ceil(xs[n])+1));}
}
export function factionArmorImage(image,profile){
 if(!profile?.faction||typeof document==='undefined')return image;
 const key=`${profile.faction}:${profile.slot}:${profile.silhouette}:${profile.base}:${profile.accent}:${image.width}x${image.height}`;if(tinted.has(key))return tinted.get(key);
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const frame=c.getImageData(0,0,canvas.width,canvas.height),color=profile.base.match(/\w\w/g).map(v=>parseInt(v,16)),accent=(profile.accent||profile.base).match(/\w\w/g).map(v=>parseInt(v,16));
 for(let i=0;i<frame.data.length;i+=4){const d=frame.data;if(!d[i+3])continue;const r=d[i],g=d[i+1],b=d[i+2],l=(r+g+b)/3;if(l<24)continue;
  const gear=profile.slot==='weapon'||profile.slot==='trinket',warm=r>g*1.12&&g>b*1.08;
  // Worn timber and handle leather stay material-coloured. Gold fittings and
  // magic crystals carry faction accents; metal keeps the faction's steel.
  if(gear&&warm&&r<155)continue;
  const target=gear&&(warm||Math.max(r,g,b)-Math.min(r,g,b)>40)?accent:color;
  const gain=Math.max(.38,Math.min(1.75,l/93));for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(target[k]*gain));
 }
 c.putImageData(frame,0,0);tinted.set(key,canvas);return canvas;
}
export function factionArtCacheStatus(){return {tintedAtlases:tinted.size,maxAtlases:(Object.keys(FACTION_STYLES).length+5)*6,bytes:[...tinted.values()].reduce((sum,c)=>sum+c.width*c.height*4,0)};}
// Retain the authored infected anatomy, exposed flesh, blood and weapon. Only
// the muted red textile remnants inherit the former faction's uniform colour.
export function blightedUniformArt(image,profile){
 if(profile.id!=='infectedSoldier'||!FACTION_STYLES[profile.formerFaction]||typeof document==='undefined')return null;
 const faction=profile.formerFaction,cached=infectedUniforms.get(faction);if(cached?.source===image)return cached.canvas;
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=profile.cellHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,profile.row*profile.cellHeight,image.width,profile.cellHeight,0,0,image.width,profile.cellHeight);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),ramp=FACTION_STYLES[faction].cloth.match(/\w\w/g).map(v=>parseInt(v,16));
 for(let i=0;i<pixels.data.length;i+=4){const p=pixels.data,y=Math.floor(i/4/canvas.width),r=p[i],g=p[i+1],b=p[i+2];if(!p[i+3]||y<30||y>86||r<35||r>150||r<g*1.15||r<b*1.07)continue;const gain=Math.max(.3,Math.min(1.4,(r+g+b)/180));for(let k=0;k<3;k++)p[i+k]=Math.min(255,Math.round(ramp[k]*gain));}
 ctx.putImageData(pixels,0,0);infectedUniforms.set(faction,{source:image,canvas});return canvas;
}
export function blightedUniformCacheStatus(){return {variants:infectedUniforms.size,maxVariants:Object.keys(FACTION_STYLES).length,bytes:[...infectedUniforms.values()].reduce((sum,v)=>sum+v.canvas.width*v.canvas.height*4,0)};}
function emblem(ctx,s,x,y){
 const ink='#17171b',c=s.accent;pixel(ctx,ink,x-3,y-3,7,7);
 if(s.emblem==='sun'){pixel(ctx,c,x-1,y-2,3,5);pixel(ctx,c,x-2,y-1,5,3);for(const [dx,dy] of [[0,-4],[0,4],[-4,0],[4,0]])pixel(ctx,c,x+dx,y+dy);pixel(ctx,s.light,x,y);}
 else if(s.emblem==='chevron'){for(let n=0;n<3;n++){pixel(ctx,c,x-2+n,y-2+n);pixel(ctx,c,x+2-n,y-2+n);}pixel(ctx,c,x,y+2);}
 else if(s.emblem==='eye'){pixel(ctx,c,x-3,y,7);pixel(ctx,c,x-2,y-1,5);pixel(ctx,c,x-2,y+1,5);pixel(ctx,ink,x,y-1,1,3);}
 else if(s.emblem==='bone'){pixel(ctx,s.light,x,y-2,1,5);pixel(ctx,s.light,x-1,y-2,3);pixel(ctx,s.light,x-1,y+2,3);}
 else if(s.emblem==='flame'){shape(ctx,c,[[x,y-3],[x+2,y],[x+1,y+3],[x-2,y+2],[x-2,y]]);pixel(ctx,s.light,x,y+1);}
 else if(s.emblem==='bars'){pixel(ctx,c,x-2,y-2,1,5);pixel(ctx,c,x+1,y-2,1,5);}
 else {pixel(ctx,c,x-2,y-1,5);pixel(ctx,c,x-1,y-2,1,5);pixel(ctx,c,x+1,y-2,1,5);}
}
export function drawFactionGarmentDetail(ctx,profile,facing,x,y,bob=0){
 if(!profile?.faction||profile.slot!=='chest')return;
 const s=(FACTION_STYLES[profile.faction] || getMythicalVisualStyle(profile)),side=facing==='left'||facing==='right';
 ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));
 if(side){const sign=facing==='left'?-1:1;ctx.scale(sign,1);pixel(ctx,'#19171b',0,-21,5,16);pixel(ctx,s.cloth,1,-20,3,14);pixel(ctx,s.accent,3,-19,1,7);pixel(ctx,s.mid,1,-19,1,3);pixel(ctx,'#322a2b',1,-11,1,4);}
 else {shape(ctx,'#19171b',[[-5,-22],[5,-22],[4,-6],[0,-4],[-4,-6]]);shape(ctx,s.cloth,[[-4,-21],[4,-21],[3,-7],[0,-6],[-3,-7]]);pixel(ctx,s.accent,-3,-20,1,9);pixel(ctx,'#322a2b',2,-18,1,9);pixel(ctx,s.mid,-2,-20,2,2);if(facing!=='up')emblem(ctx,s,0,-15);}
 // Distinct structure: ceremonial collar versus strapped military tabard.
 if(profile.faction==='covenant'){pixel(ctx,s.accent,-7,-23,14,2);pixel(ctx,s.light,-6,-22,12);}
 else if(profile.faction==='lastDawn'||profile.faction==='veyr'){pixel(ctx,s.mid,-8,-23,4,3);pixel(ctx,s.light,-8,-23,4);pixel(ctx,s.mid,4,-23,4,3);pixel(ctx,s.light,4,-23,4);}
 else if(profile.faction==='roadless'){pixel(ctx,'#35271f',-7,-18,14,2);pixel(ctx,s.light,-3,-18,2,2);pixel(ctx,'#33261f',4,-6,4,5);}
 else {pixel(ctx,s.accent,-7,-21,3,2);pixel(ctx,s.accent,4,-21,3,2);pixel(ctx,s.light,-1,-22,2,3);}
 ctx.restore();
}
export function drawFactionHelm(ctx,profile,facing,x,y,bob=0,pose={}){
 if(profile?.slot!=='helm'||(!profile.faction&&['crown','halo'].includes(profile.silhouette)))return false;
 const standard={...humanoidGearRamp(profile,profile.silhouette==='hood'?'cloth':'plate'),helm:profile.silhouette==='hood'?'hood':'angular'};
 const s={...(FACTION_STYLES[profile.faction] || (profile.faction?getMythicalVisualStyle(profile):standard)),...(profile.visualPart==='scoutHelm'?{helm:'hood'}:{})},side=facing==='left'||facing==='right';
 ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));if(side)ctx.scale(facing==='left'?-1:1,1);
 const fit=pose.bodyType==='female'?.92:1;ctx.scale(fit,1);
 if(['mask','ritual','hood'].includes(s.helm)){
  // Face openings share the player's real eye/chin height, rather than
  // drawing a second face high in the hair. Cloth folds use connected pixels.
  shape(ctx,'#151519',[[-11,-27],[-13,-39],[-11,-46],[-6,-51],[4,-51],[11,-47],[13,-39],[11,-26],[7,-25],[6,-35],[-6,-35],[-7,-25]]);
  shape(ctx,s.cloth,[[-10,-28],[-11,-39],[-9,-45],[-5,-49],[3,-49],[9,-45],[11,-39],[9,-28],[8,-28],[7,-37],[-7,-37],[-9,-28]]);
  pixel(ctx,s.mid,-5,-48,7,2);pixel(ctx,s.mid,-10,-43,2,6);pixel(ctx,'#28232a',-10,-33,2,5);pixel(ctx,s.accent,-8,-29,1,3);
  if(facing==='up'){shape(ctx,s.cloth,[[-9,-42],[9,-42],[9,-27],[0,-25],[-9,-28]]);pixel(ctx,s.mid,-5,-42,2,12);pixel(ctx,'#28232a',3,-39,2,12);}
  else if(side){pixel(ctx,s.cloth,-5,-36,9,11);pixel(ctx,'#28232a',2,-35,2,9);pixel(ctx,s.accent,3,-29,1,3);}
  if(s.helm==='ritual'&&facing!=='up'){pixel(ctx,'#302832',side?7:-4,-29,side?5:8,5);pixel(ctx,'#bcb29b',side?8:-3,-28,side?3:6,2);pixel(ctx,s.accent,side?9:0,-25,1,2);}
  else if(s.helm==='mask'&&facing!=='up'){pixel(ctx,'#302723',side?7:-6,-28,side?5:12,4);pixel(ctx,s.mid,side?8:-4,-28,side?3:8,1);}
 }else{
  const ivory=s.helm==='crest';
  shape(ctx,'#151519',[[-12,-29],[-13,-39],[-11,-45],[-7,-50],[3,-52],[10,-48],[13,-41],[12,-29],[9,-26],[7,-28],[7,-34],[-7,-34],[-7,-27],[-10,-27]]);
  shape(ctx,s.base,[[-11,-31],[-11,-39],[-9,-44],[-6,-48],[3,-50],[8,-46],[11,-40],[10,-29],[8,-29],[8,-36],[-8,-36],[-9,-29]]);
  shape(ctx,s.mid,[[-9,-42],[-6,-47],[2,-49],[7,-46],[9,-42],[8,-40],[-9,-40]]);
  pixel(ctx,s.light,-5,-47,5,1);pixel(ctx,s.light,-8,-44,2,3);pixel(ctx,s.base,3,-46,3,6);pixel(ctx,'#302c32',7,-42,3,4);
  pixel(ctx,'#17191c',-10,-38,21,2);pixel(ctx,s.accent,-9,-37,19,1);pixel(ctx,s.mid,-10,-34,2,5);pixel(ctx,s.light,-10,-33,1,2);
  if(facing==='up'){pixel(ctx,s.base,-8,-35,17,8);pixel(ctx,s.mid,-6,-34,3,6);pixel(ctx,'#302c32',4,-34,3,6);pixel(ctx,s.accent,-5,-29,10,1);}
  else if(side){pixel(ctx,s.base,-7,-36,11,9);pixel(ctx,s.mid,-6,-35,2,6);pixel(ctx,'#302c32',1,-34,2,6);pixel(ctx,s.light,9,-35,1,4);}
  if(ivory){pixel(ctx,'#151519',-2,-57,5,9);pixel(ctx,s.accent,-1,-56,3,8);pixel(ctx,s.light,-1,-56,1,6);pixel(ctx,s.cloth,1,-55,2,6);}
  else {pixel(ctx,s.accent,-2,-50,4,2);pixel(ctx,s.light,-1,-50,2,1);}
 }
 ctx.restore();return true;
}
export function drawFactionCloak(ctx,actor,facing,bob=0,pose={},front=false){
 const item=ENEMY_EQUIPMENT_ITEMS[refId(actor.equipment?.trinket)];
 if(!item||item.visualPart!=='trinket'||(facing==='up')!==front)return;
 const s=FACTION_STYLES[item.visualFactionId],side=facing==='left'||facing==='right',sway=Math.round(Number(pose.cloakSway||0));
 ctx.save();ctx.translate(0,Math.round(bob));if(side)ctx.scale(facing==='left'?-1:1,1);
 const points=side?[[-9,-27],[-1,-24],[-4,4],[-12+sway,11],[-17+sway,8]]:[[-8,-26],[8,-26],[12+sway,9],[4+sway,13],[-12+sway,10]];
 shape(ctx,'#17191b',points);shape(ctx,s.cloth,points.map(([x,y])=>[x*.86,y+1]));
 for(let y=-20;y<9;y+=3){pixel(ctx,s.mid,side?-9:-5,y,1,3);pixel(ctx,'#27242a',side?-5:3,y,1,3);}
 if(front)emblem(ctx,s,0,-16);
 ctx.restore();
}
export function drawFactionTrinket(ctx,id,facing,x,y,bob=0){
 const item=ENEMY_EQUIPMENT_ITEMS[id];if(!item)return false;
 const s=FACTION_STYLES[item.visualFactionId];ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));
 if(item.visualPart==='guard'){
  ctx.translate(facing==='up'?12:facing==='right'?-6:-13,-9);drawGuardPixels(ctx,item,facing);
 }else if(facing!=='up'){pixel(ctx,s.accent,facing==='left'?-5:facing==='right'?4:-1,-20,2,2);}
 ctx.restore();return true;
}
export function drawFactionWeapon(ctx,id,profile,x,y,side=1){
 if(!profile?.faction)return false;
 const s=(FACTION_STYLES[profile.faction] || getMythicalVisualStyle(profile)),ink='#17191b',type=profile.weaponType;
 const source=asset('weapons-equipped');
 const index={sword:0,dagger:1,axe:2,mace:3,hammer:4,spear:5,bow:6,staff:7,scythe:8,shield:9}[type];
 if(source?.ready&&index!==undefined){
  const scale=index===1?.45:index===9?.42:[5,7,8].includes(index)?.72:.56;
  const grips=[[39,89],[39,91],[28,85],[39,87],[39,75],[39,74],[33,58],[39,70],[17,74],[39,72]],image=factionArmorImage(source.image,{...profile,slot:'weapon'});
  ctx.save();ctx.translate(x,y);ctx.scale(type==='bow'?bowSourceSide(side):side,1);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,index%4*80,Math.floor(index/4)*112,80,112,-grips[index][0]*scale,-grips[index][1]*scale,80*scale,112*scale);ctx.restore();return true;
 }
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(side,1);
 if(type==='staff'){
  pixel(ctx,ink,-2,-43,5,52);pixel(ctx,'#665544',-1,-42,2,48);pixel(ctx,s.accent,-3,-30,6,2);pixel(ctx,s.mid,-1,-39,1,23);
  if(profile.faction==='covenant'){pixel(ctx,s.accent,-1,-53,2,17);pixel(ctx,s.accent,-7,-48,14,2);emblem(ctx,s,0,-46);}
  else {shape(ctx,ink,[[-6,-52],[5,-52],[7,-42],[2,-37],[-6,-40]]);emblem(ctx,s,0,-46);pixel(ctx,s.light,-2,-50,2,3);}
 }else if(type==='bow'){
  shape(ctx,ink,[[0,-34],[6,-30],[10,-15],[9,7],[5,18],[0,23],[-2,22],[3,15],[6,5],[6,-13],[3,-28],[-2,-33]]);
  shape(ctx,s.base,[[0,-32],[5,-28],[8,-13],[7,6],[3,17],[0,21],[2,14],[5,4],[5,-12],[2,-28]]);
  pixel(ctx,'#c4b59a',-1,-30,1,50);pixel(ctx,s.accent,4,-18,3,2);pixel(ctx,s.accent,4,5,3,2);pixel(ctx,'#604738',0,-4,6,6);
 }else{
  const dagger=type==='dagger',length=dagger?23:42;
  shape(ctx,ink,[[-4,-7],[-4,-length],[0,-length-8],[4,-length],[4,-7]]);
  shape(ctx,s.base,[[-2,-8],[-2,-length],[0,-length-5],[2,-length],[2,-8]]);
  pixel(ctx,s.light,-1,-length,1,length-9);pixel(ctx,s.mid,1,-length+4,1,length-13);
  pixel(ctx,ink,-8,-8,17,4);pixel(ctx,s.accent,-7,-7,15,2);pixel(ctx,ink,-2,-4,5,13);pixel(ctx,'#695342',-1,-3,3,10);pixel(ctx,s.mid,-1,0,3);pixel(ctx,s.accent,-2,8,5,3);
  if(profile.faction==='covenant')emblem(ctx,s,0,-10);
  else if(profile.faction==='lastDawn'){pixel(ctx,s.accent,-7,-8,2,4);pixel(ctx,s.accent,6,-8,2,4);}
 }
 ctx.restore();return true;
}
function drawGuardPixels(ctx,item,facing){
 const s=FACTION_STYLES[item.visualFactionId],source=asset('weapons-equipped');
 if(!source?.ready)return;
 const image=factionArmorImage(source.image,{...s,faction:item.visualFactionId,slot:'trinket',silhouette:'shield'});
 ctx.save();ctx.imageSmoothingEnabled=false;
 // A worn shield from the same raster family as the player's equipment.
 // It occupies the free hand, instead of covering the whole torso with a polygon.
 const scale=.42;ctx.drawImage(image,80,224,80,112,-39*scale,-72*scale,80*scale,112*scale);
 emblem(ctx,s,0,-8);ctx.restore();
}
export function isFactionGuard(actor){return ENEMY_EQUIPMENT_ITEMS[refId(actor.equipment?.trinket)]?.visualPart==='guard';}
export function drawFactionGuard(ctx,actor,facing,hand){
 const item=ENEMY_EQUIPMENT_ITEMS[refId(actor.equipment?.trinket)];if(item?.visualPart!=='guard')return;
 ctx.save();ctx.translate(Math.round(hand[0]),Math.round(hand[1])-3);drawGuardPixels(ctx,item,facing);ctx.restore();
}


