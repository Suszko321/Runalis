import {SUBCLASSES} from './subclassData.js';
import {drawOathkeeperEffect,drawOathProjectile} from './oathkeeperArt.js';
import {getSubclassCombatState} from './subclassCombat.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {drawFaeFlowerField} from './faeFlowerArt.js';
import {drawSpectralHost,drawSpectralHostWard,drawSpectralHostImpact} from './acolyteHostArt.js';
import {drawSoulSiphonField,drawSoulBurnImpact,drawSoulBurn} from './acolyteSoulSiphonArt.js';
import {drawSpectralUrnFlight,drawUrnSpirit,drawUrnEffect} from './acolyteUrnArt.js';
import {drawCryomancerEffect,drawCryoProjectile,drawCryoWard} from './cryomancerArt.js';
import {drawGardenGraveEffect,drawGardenProjectile,drawGardenStatus,drawGardenAffliction} from './gardenGraveArt.js';
import {drawHellstalkerEffect,drawHellProjectile,drawHellAffliction,drawHellCaster} from './hellstalkerArt.js';
import {drawFellhunterEffect,drawFellhunterProjectile,drawFellhunterAffliction,drawFellhunterStatus} from './fellhunterArt.js';

// Twelve authored, small silhouettes. These code-native emblems match combat
// motifs; they decorate existing skill art rather than replace equipment sprites.
export const SUBCLASS_ICON_PATHS=Object.freeze({
  cryomancer:'M16 2V30M4 9L28 23M4 23L28 9M10 4L16 9L22 4M5 15L10 13L9 7M23 25L22 19L28 17',
  sunken:'M3 10Q16 4 29 10L26 24L16 30L6 24ZM8 14L16 23L24 14M16 4V10',
  holyknight:'M6 4H26L24 23L16 30L8 23ZM16 7V23M10 14H22',
  sinner:'M16 2L19 7L18 19H14L13 7ZM10 20H22M16 20V29M6 8L9 12L7 22L3 21L4 11ZM2 23L10 25M26 8L29 11L29 21L25 22L23 12ZM22 25L30 23',
  acolyte:'M10 6Q16 0 22 6L25 23L21 20L16 29L11 20L7 23ZM11 11H13M19 11H21M5 27H9M23 27H27',
  deathknight:'M5 5L11 9H21L27 5L25 24L16 30L7 24ZM11 13H14M18 13H21M11 20H21M16 20V27',
  fae:'M16 15Q0 0 3 14L13 20L5 28Q14 29 16 19Q18 29 27 28L19 20L29 14Q32 0 16 15ZM16 9V26',
  petalknight:'M16 2L23 5L29 12L25 21L16 25L7 21L3 12L9 5ZM11 8L21 8L25 15L18 21L10 17L10 11L19 11L21 16L15 18L13 14M16 25V32M16 29L8 25M16 30L23 27',
  sunscorched:'M16 7L22 13L19 23L10 22L8 13ZM16 1V5M27 5L24 8M31 16H26M27 27L24 24M16 31V27M5 27L8 24M1 16H6M5 5L8 8',
  dawnblade:'M25 2L28 5L14 23L8 28L10 20ZM7 16L19 26M4 28L7 31M20 12L26 18',
  bloodhound:'M4 5L12 9L16 6L20 9L28 5L26 20L16 29L6 20ZM9 14L13 16M23 14L19 16M12 21L16 24L20 21',
  hellstalker:'M8 15L3 3L13 9L16 4L19 9L29 3L24 15L25 22L16 30L7 22ZM10 17L14 19M22 17L18 19M13 25H19'
});
export function subclassIconMarkup(id){const s=SUBCLASSES[id];return s?`<svg class="subclass-emblem" viewBox="0 0 32 32" aria-hidden="true" style="color:${s.colors[0]}"><path d="${SUBCLASS_ICON_PATHS[id]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>`:'';}
export function subclassSkillIcon(player,markup,abilityId){const s=SUBCLASSES[getSelectedAbilityMorph(player,abilityId)];return s?`<span class="subclass-skill-icon" style="--subclass-color:${s.colors[0]}">${markup}<span class="subclass-skill-badge">${subclassIconMarkup(s.id)}</span></span>`:markup;}

const TAU=Math.PI*2;
const stroke=(ctx,points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.stroke();};
const BUTTERFLY_WINGS=[
  ['000000','011000','123100','123310','123431','123321','012231','001221','001231','000110','000000'],
  ['000000','000100','001210','012310','012431','012321','001231','000221','000110','000000','000000'],
  ['000000','000000','000110','000231','000341','000321','000231','000221','000110','000000','000000']
];
export function drawFaeButterfly(ctx,x,y,aim,phase,colors,unit=2){
  const wings=BUTTERFLY_WINGS[[0,1,2,1][Math.floor(phase*14)%4]],body='04455555510';
  const palette=['','#48304d',colors[0],colors[1],'#fff6e6','#e5ce90'];
  const quarter=((Math.round(Math.atan2(aim.y,aim.x)/(Math.PI/2))+1)%4+4)%4;
  for(let row=0;row<wings.length;row++){
    const cells=wings[row]+body[row]+[...wings[row]].reverse().join('');
    for(let col=0;col<cells.length;col++){
      if(cells[col]==='0')continue;
      const u=(col-6)*unit,v=(row-5)*unit;
      const dx=quarter===0?u:quarter===1?-v:quarter===2?-u:v;
      const dy=quarter===0?v:quarter===1?u:quarter===2?-v:-u;
      ctx.fillStyle=palette[Number(cells[col])];ctx.fillRect(Math.round(x+dx),Math.round(y+dy),unit,unit);
    }
  }
}
function diamond(ctx,x,y,r){ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.55,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.55,y);ctx.closePath();ctx.fill();}
function motif(ctx,s,x,y,r,t){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.strokeStyle=s.colors[0];ctx.fillStyle=s.colors[1];ctx.lineWidth=2;
  const m=s.motif;
  if(m==='crystal'){for(let i=0;i<5;i++){const a=i*TAU/5;diamond(ctx,Math.cos(a)*r*.6,Math.sin(a)*r*.3,4+t*3);}stroke(ctx,[[-r*.5,0],[0,-r*.6],[r*.5,0]]);}
  else if(m==='lightning'){for(let i=-1;i<=1;i++)stroke(ctx,[[-r,i*10],[-r*.25,i*10-6],[0,i*10+4],[r*.4,i*10-5],[r,i*10]]);}
  else if(m==='pressure'){ctx.strokeStyle=s.colors[2];ctx.lineWidth=5;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,r*(1-i*.23)*(1-t*.25),r*.3*(1-i*.23),0,0,TAU);ctx.stroke();}ctx.strokeStyle=s.colors[0];ctx.lineWidth=2;stroke(ctx,[[-r,-5],[-r*.4,0],[-r,-2]]);stroke(ctx,[[r,-5],[r*.4,0],[r,-2]]);}
  else if(m==='shield'||m==='armour'||m==='bark'){stroke(ctx,[[-r*.45,-r*.5],[r*.45,-r*.5],[r*.35,r*.2],[0,r*.55],[-r*.35,r*.2],[-r*.45,-r*.5]]);if(m==='bark')for(let i=-1;i<=1;i++)stroke(ctx,[[i*r*.25,-r*.4],[i*r*.3,r*.1],[i*r*.2,r*.3]]);else if(m==='armour'){ctx.fillRect(-10,-5,6,5);ctx.fillRect(4,-5,6,5);}else{stroke(ctx,[[0,-r*.4],[0,r*.3]]);stroke(ctx,[[-r*.25,0],[r*.25,0]]);}}
  else if(m==='scripture'){for(let i=-1;i<=1;i++){ctx.strokeStyle=s.colors[1];stroke(ctx,[[i*18-5,-r*.55],[i*18+5,-r*.55],[i*18+5,-r*.1],[i*18-5,-r*.1],[i*18-5,-r*.55]]);ctx.strokeStyle=s.colors[0];stroke(ctx,[[i*18-2,-r*.4],[i*18+2,-r*.4]]);}ctx.beginPath();ctx.ellipse(0,-r*.7,r*.5,5,0,0,TAU);ctx.stroke();}
  else if(m==='fracture'){for(let i=-1;i<=1;i++)stroke(ctx,[[i*14,-r*.5],[i*14-4,-r*.15],[i*14+3,0],[i*14-2,r*.3]]);ctx.strokeStyle=s.colors[1];ctx.beginPath();ctx.ellipse(0,-r*.6,r*.6,5,0,.3,2.6);ctx.stroke();}
  else if(m==='rune'||m==='seal'||m==='brand'){ctx.save();ctx.scale(1,.55);ctx.beginPath();ctx.moveTo(0,-r);for(let i=1;i<=4;i++){const a=i*Math.PI/2;ctx.lineTo(Math.sin(a)*r,-Math.cos(a)*r);}ctx.stroke();ctx.restore();stroke(ctx,[[-r*.3,-r*.3],[r*.3,r*.3],[0,0],[r*.3,-r*.3],[-r*.3,r*.3]]);if(m==='brand'){ctx.fillStyle=s.colors[0];for(let i=0;i<4;i++)ctx.fillRect(-r*.6+i*r*.4,-10-i%2*7,3,9);}}
  else if(m==='spirit'){for(let i=-1;i<=1;i++){const px=i*r*.5;stroke(ctx,[[px-6,3],[px-6,-10],[px,-16],[px+6,-10],[px+6,3],[px+2,0],[px,9],[px-2,0],[px-6,3]]);ctx.fillRect(px-3,-6,2,2);ctx.fillRect(px+2,-6,2,2);}}
  else if(m==='wings'){stroke(ctx,[[0,0],[-r,-r*.5],[-r*.8,r*.1],[-r*.15,r*.3],[-r*.5,r*.5],[0,0],[r,-r*.5],[r*.8,r*.1],[r*.15,r*.3],[r*.5,r*.5],[0,0]]);}
  else if(m==='flower'){for(let i=0;i<5;i++){const px=Math.cos(i*2.4)*r*.6,py=Math.sin(i*2.4)*r*.23;ctx.fillStyle=i%2?s.colors[0]:s.colors[2];ctx.fillRect(Math.round(px)-4,Math.round(py)-2,8,4);ctx.fillRect(Math.round(px)-2,Math.round(py)-4,4,8);ctx.fillStyle=s.colors[1];ctx.fillRect(Math.round(px)-1,Math.round(py)-1,2,2);}ctx.strokeStyle=s.colors[0];stroke(ctx,[[-r*.7,7],[0,0],[r*.7,8]]);}
  else if(m==='flare'){for(let i=0;i<8;i++){const a=i*TAU/8;stroke(ctx,[[Math.cos(a)*r*.3,Math.sin(a)*r*.3],[Math.cos(a)*r,Math.sin(a)*r*.7]]);}diamond(ctx,0,0,r*.4);}
  else if(m==='blade'){stroke(ctx,[[-r*.7,r*.3],[r*.7,-r*.4],[r*.4,-r*.5],[-r*.6,r*.1],[-r*.7,r*.3]]);stroke(ctx,[[-r*.5,-3],[-r*.1,12]]);}
  else if(m==='beacon'){diamond(ctx,0,-r*.5,9);stroke(ctx,[[0,-r*.15],[0,r*.3]]);for(let i=-1;i<=1;i++)stroke(ctx,[[i*r*.35,-r*.2],[i*r*.6,r*.3]]);}
  else if(m==='trail'){stroke(ctx,[[-r,4],[-r*.5,0],[0,4],[r*.5,-3],[r,-1]]);for(let i=0;i<4;i++)ctx.fillRect(-r+i*r*.5,8+(i%2)*4,4,3);}
  ctx.restore();
}
export function drawSubclassEffect(ctx,fx,camera){
  if(drawUrnEffect(ctx,fx,camera))return;
  if(drawFellhunterEffect(ctx,fx,camera))return;
  if(drawHellstalkerEffect(ctx,fx,camera))return;
  if(drawGardenGraveEffect(ctx,fx,camera))return;
  if(drawOathkeeperEffect(ctx,fx,camera))return;
  if(fx.subclassId==='cryomancer'){drawCryomancerEffect(ctx,fx,camera);return;}
  if(fx.geometry==='soulSiphonField'){drawSoulSiphonField(ctx,fx,camera);return;}
  if(fx.geometry==='soulBurnImpact'){drawSoulBurnImpact(ctx,fx,camera);return;}
  if(fx.geometry==='flowerField'){drawFaeFlowerField(ctx,fx,camera);return;}
  if(fx.geometry==='spectralHost'){drawSpectralHost(ctx,fx,camera);return;}
  if(fx.geometry==='spectralHostImpact'){drawSpectralHostImpact(ctx,fx,camera);return;}
  const s=SUBCLASSES[fx.subclassId];if(!s)return;
  const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=Math.min(160,fx.radius||32);
  if(x< -600||y< -600||x>ctx.canvas.width+600||y>ctx.canvas.height+600)return;
  const t=Math.min(1,(fx.age||0)/(fx.ttl||.35)),g=fx.geometry;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=(1-t)*.85;ctx.strokeStyle=s.colors[0];ctx.fillStyle=s.colors[2];ctx.lineWidth=2;
  if(g==='faeMend'){
    ctx.globalAlpha=(1-t)*.45;ctx.fillStyle=s.colors[1];
    ctx.fillRect(x-5,y-Math.floor(t*4),2,2);ctx.fillStyle=s.colors[0];ctx.fillRect(x+4,y-2-Math.floor(t*4),1,2);
  }else if(g==='faerieFire'){
    // Short pixel flames at the point of contact, never a persistent halo.
    const frame=Math.min(2,Math.floor(t*3)),flame=[['010','121','232','121'],['001','012','123','121'],['100','210','321','121']][frame];
    const palette=['',s.colors[0],s.colors[1],'#f2e7c8'];
    for(const offset of [-6,3])for(let row=0;row<flame.length;row++)for(let col=0;col<3;col++){
      if(flame[row][col]==='0')continue;ctx.fillStyle=palette[Number(flame[row][col])];ctx.fillRect(x+offset+col*2,y+row*2-Math.floor(t*5),2,2);
    }
  }else if(g==='faeBloom'||g==='butterflyImpact'){
    const impact=g==='butterflyImpact',radius=impact?8+t*22:7+t*7;
    for(let i=0;i<6;i++){
      const angle=i*TAU/6+t*.8,px=Math.round(x+Math.cos(angle)*radius),py=Math.round(y+Math.sin(angle)*radius*.65);
      ctx.fillStyle=i%2?s.colors[0]:s.colors[1];ctx.fillRect(px,py,i%2?2:3,i%2?2:3);
    }
    if(!impact||t<.65)drawFaeButterfly(ctx,x+(fx.dirX||0)*14,y+(fx.dirY||0)*14,{x:fx.dirX??1,y:fx.dirY||0},t,s.colors,1);
  }else if(['chain','dash'].includes(g)){
    const ex=Math.round((fx.endX??fx.x)-camera.x),ey=Math.round((fx.endY??fx.y)-camera.y);
    const dx=ex-x,dy=ey-y;const points=[];for(let i=0;i<=6;i++)points.push([x+dx*i/6,y+dy*i/6+(g==='chain'&&i>0&&i<6?(i%2?5:-5):0)]);stroke(ctx,points);
    motif(ctx,s,(x+ex)/2,(y+ey)/2,18,t);
  }else if(g==='beam'){
    const range=Math.min(600,fx.range||200),dx=fx.dirX||0,dy=fx.dirY||0;
    ctx.strokeStyle=s.colors[2];ctx.lineWidth=12;stroke(ctx,[[x,y],[x+dx*range,y+dy*range]]);
    ctx.strokeStyle=s.colors[0];ctx.lineWidth=5;stroke(ctx,[[x,y],[x+dx*range,y+dy*range]]);
    ctx.strokeStyle=s.colors[1];ctx.lineWidth=1;stroke(ctx,[[x,y],[x+dx*range,y+dy*range]]);
    for(let i=1;i<=3;i++)motif(ctx,s,x+dx*range*i/4,y+dy*range*i/4,18,t);
  }else if(g==='field'||g==='aura'){
    ctx.globalAlpha*=.25;ctx.beginPath();ctx.ellipse(x,y,r,r*.42,0,0,TAU);ctx.fill();ctx.globalAlpha*=3;ctx.beginPath();ctx.ellipse(x,y,r,r*.42,0,0,TAU);ctx.stroke();
    for(let i=0;i<4;i++)motif(ctx,s,x+Math.cos(i*TAU/4)*r*.62,y+Math.sin(i*TAU/4)*r*.23,20,t);
  }else if(g==='arc'){
    const angle=Math.atan2(fx.dirY||0,fx.dirX??1),radius=Math.min(110,fx.range||65);
    ctx.strokeStyle=s.colors[2];ctx.lineWidth=8;ctx.beginPath();ctx.arc(x,y,radius,angle-.8,angle+.8);ctx.stroke();
    ctx.strokeStyle=s.colors[1];ctx.lineWidth=3;ctx.stroke();motif(ctx,s,x+Math.cos(angle)*radius*.7,y+Math.sin(angle)*radius*.7,24,t);
  }else if(g==='mark'){motif(ctx,s,x,y,18,t);}
  else {motif(ctx,s,x,y,g==='cast'?18:g==='impact'?20:Math.min(65,r),t);}
  ctx.restore();
}
export function drawSubclassEntities(ctx,p,camera){
  if(p.buffs?.defense?.cryo&&p.buffs.defense.timer>0)drawCryoWard(ctx,p,camera,performance.now()/1000);
  const state=getSubclassCombatState(p);if(!state)return;
  ctx.save();ctx.imageSmoothingEnabled=false;
  drawGardenStatus(ctx,p,state,camera,performance.now()/1000);
  drawHellCaster(ctx,p,state,camera,performance.now()/1000);
  drawFellhunterStatus(ctx,p,state,camera,performance.now()/1000);
  if(p.hp>0&&state.oath?.resolve){
    ctx.fillStyle=SUBCLASSES.holyknight.colors[0];
    for(let i=0;i<state.oath.resolve;i++)ctx.fillRect(Math.round(p.x-camera.x-8+i*6),Math.round(p.y-camera.y-58),4,4);
  }
  const channel=p.activeChannel;
  if(p.hp>0&&state.hostWard?.until>performance.now()/1000)drawSpectralHostWard(ctx,p,camera,channel?.elapsed||0);
  for(const shot of state.shots){
    if(drawFellhunterProjectile(ctx,shot,camera))continue;
    if(drawHellProjectile(ctx,shot,camera))continue;
    if(drawGardenProjectile(ctx,shot,camera))continue;
    if(drawOathProjectile(ctx,shot,camera))continue;
    if(shot.a.cryoSkill){drawCryoProjectile(ctx,shot,camera);continue;}
    if(shot.a.subclassMode==='projectileChannel'){
      const x=Math.round(shot.x-camera.x),y=Math.round(shot.y-camera.y),colors=shot.a.colors;
      const trail=shot.trail||[];
      for(let i=0;i<trail.length;i++){
        const point=trail[i],offset=i%2?3:-3;
        ctx.globalAlpha=.12+.55*(i+1)/trail.length;ctx.fillStyle=i%2?colors[0]:colors[1];
        ctx.fillRect(Math.round(point.x-camera.x),Math.round(point.y-camera.y),3,3);
        ctx.fillRect(Math.round(point.x-camera.x-shot.aim.y*offset),Math.round(point.y-camera.y+shot.aim.x*offset),1,1);
      }
      ctx.globalAlpha=1;drawFaeButterfly(ctx,x,y,shot.aim,shot.travelled/shot.speed,colors);
    }else motif(ctx,SUBCLASSES[shot.a.subclassId],shot.x-camera.x,shot.y-camera.y,12,0);
  }
  for(const urn of state.urns)drawSpectralUrnFlight(ctx,urn,camera);
  for(const spirit of state.spirits){if(spirit.a.spectralUrn)drawUrnSpirit(ctx,spirit,camera,performance.now()/1000);else motif(ctx,SUBCLASSES[spirit.a.subclassId],spirit.x-camera.x,spirit.y-camera.y,14,0);}
  if(state.prey&&state.prey.hp>0&&!state.afflictions.get(state.prey)?.effects.get('bloodhound')?.ability?.hunterMorph){ctx.globalAlpha=.45;ctx.strokeStyle=SUBCLASSES.bloodhound.colors[0];ctx.setLineDash([4,9]);stroke(ctx,[[p.x-camera.x,p.y-camera.y],[state.prey.x-camera.x,state.prey.y-camera.y]]);ctx.setLineDash([]);}
  const now=performance.now()/1000;
  if(state.retaliation?.until>now)motif(ctx,SUBCLASSES[state.retaliation.a.subclassId],p.x-camera.x,p.y-camera.y-20,28,0);
  for(const [e,bundle] of state.afflictions)for(const entry of bundle.effects.values()){if(e.hp<=0||entry.until<=now)continue;const s=SUBCLASSES[entry.ability.subclassId];ctx.globalAlpha=.8;ctx.fillStyle=s.colors[0];
    if(drawHellAffliction(ctx,e,entry,camera,now))continue;
    if(drawFellhunterAffliction(ctx,e,entry,camera,now))continue;
    if(drawGardenAffliction(ctx,e,entry,camera))continue;
    if(entry.ability.cryoSkill){
      const chill=entry.chillUntil>now?entry.chill||0:0,brittle=entry.brittleUntil>now;
      for(let i=0;i<chill;i++)ctx.fillRect(Math.round(e.x-camera.x-7+i*6),Math.round(e.y-camera.y-48),4,3);
      if(brittle||e.subclassFrozenUntil>now)drawCryomancerEffect(ctx,{subclassId:'cryomancer',geometry:e.subclassFrozenUntil>now?'status':'brittle',brittle,x:e.x,y:e.y-5,radius:30,ttl:1,age:0},camera);
      continue;
    }
    if(entry.soulBurn){drawSoulBurn(ctx,Math.round(e.x-camera.x),Math.round(e.y-camera.y-8),now,.85);continue;}
    for(let i=0;i<entry.stacks;i++)ctx.fillRect(Math.round(e.x-camera.x-6+i*5),Math.round(e.y-camera.y-48),3,3);
    if(e.subclassFrozenUntil>now)motif(ctx,s,e.x-camera.x,e.y-camera.y-15,25,0);
  }
  ctx.restore();
}
