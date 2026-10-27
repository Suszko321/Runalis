import {getEliteHazards,getEliteActors,getEliteHazardGeometry,getEliteStatePresentation} from './eliteEncounterSystem.js';
import {ELITE_MODIFIERS} from './encounterData.js';
import {eliteCueProfile} from './eliteHazardPresentation.js';
import {drawEliteSigil,drawEliteGroundArt,drawEliteLaunchArt,drawEliteGuard,drawEliteHealing,drawEliteHealingRelease} from './eliteHazardArt.js';
import {drawInfernalWall} from './infernalWallRenderer.js';
import {drawAttackGeometry} from './enemyTelegraphGeometry.js';
const box=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function caption(c,label,x,y,color,kind){
 c.font='bold 11px Georgia';const width=c.measureText(label).width;
 x=Math.max(width/2+28,Math.min(c.canvas.width-width/2-12,x));y=Math.max(20,Math.min(c.canvas.height-14,y));
 c.textAlign='center';c.lineWidth=3;c.strokeStyle='#100b11';c.strokeText(label,x,y);c.fillStyle=color;c.fillText(label,x,y);
 if(kind)drawEliteSigil(c,kind,x-width/2-15,y-4,2);
}
function frost(c,x,y,amount,frozen){for(let i=0;i<(frozen?9:Math.ceil(amount/18));i++){const px=x+(i%3-1)*9,py=y-4-Math.floor(i/3)*14;box(c,'#101c2b',px-2,py-16,4,6);box(c,'#101c2b',px-4,py-10,8,12);box(c,frozen?'#ddfff7':'#8db4c2',px-1,py-14,2,6);box(c,'#8bb6c4',px-2,py-8,4,8);box(c,'#54758b',px+1,py-7,2,9);box(c,'#f0fff3',px-1,py-9,1,8);}}
// Collision outlines remain identical to the shared hit geometry. Each family
// adds its own pixel silhouette, direction and anticipation inside that outline.
export function drawEncounterEffects(c,world,camera,layer){
 c.save();c.imageSmoothingEnabled=false;
 for(const h of getEliteHazards(world)){
  const x=Math.round(h.x-camera.x),y=Math.round(h.y-camera.y),r=h.radius,color=eliteCueProfile(h.kind).colors[2],warning=h.age<h.warning;
  if(h.geometry?.shape!=='line'&&(x+r<0||y+r<0||x-r>c.canvas.width||y-r>c.canvas.height+80))continue;
  if(h.kind==='waller'){
   drawInfernalWall(c,h,camera,layer);
   if(layer==='behind')caption(c,'GAP',x+(h.opening==='east'?r:h.opening==='west'?-r:0),y+(h.opening==='south'?r:h.opening==='north'?-r:0)+4,'#eed9a2');
   continue;
  }
  if(layer==='behind'){
   const geometry=getEliteHazardGeometry(h);
   drawAttackGeometry(c,geometry,camera,Math.min(1,h.age/h.warning),color,!(h.kind==='artillery'&&h.age<h.tracking));
   drawEliteGroundArt(c,h,camera);
   if(warning&&geometry.shape==='circle'&&['critical','execution'].includes(h.danger))for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const px=x+Math.cos(a)*(r+13),py=y+Math.sin(a)*(r+13);box(c,'#130c12',px-4,py-4,8,8);box(c,color,px-2,py-2,4,4);}
  }else if(layer==='front'){
   drawEliteLaunchArt(c,h,camera);
   if(warning&&!h.secondary&&!h.surviveDeath){
    const sx=h.owner.x-camera.x,sy=h.owner.y-camera.y-48;
    drawEliteSigil(c,h.kind,sx,sy,1);
   }
  }
 }
 if(layer==='front'){
  const now=performance.now()/1000;
  for(const p of getEliteActors(world))if(p.eliteFrost>0||p.eliteFrozenUntil>now){const x=Math.round(p.x-camera.x),y=Math.round(p.y-camera.y);frost(c,x,y,p.eliteFrost,p.eliteFrozenUntil>now);caption(c,p.eliteFrozenUntil>now?'FROZEN · DODGE':p.eliteFrost>=65?'DEEP CHILL':'CHILLED',x,y+19,'#cae6e0');}
  for(const e of world.enemies||[]){if(e.hp<=0)continue;const x=Math.round(e.x-camera.x),y=Math.round(e.y-camera.y);if(x<-100||y<-100||x>c.canvas.width+100||y>c.canvas.height+100)continue;
   const state=getEliteStatePresentation(e);
   if(e.eliteGuardActive){const a=Math.atan2(e.eliteGuardY,e.eliteGuardX);c.strokeStyle='#161318';c.lineWidth=7;c.beginPath();c.arc(x,y,30,a-.95,a+.95);c.stroke();c.strokeStyle=ELITE_MODIFIERS.bulwark.color;c.lineWidth=3;c.stroke();drawEliteGuard(c,e,camera,state.guardCharge);}
   if(e.eliteHealing){drawEliteHealing(c,e,world,camera,state.healProgress);caption(c,'HEALING · KILL THE ELITE',x,y-75,'#d4efaa');}
   else if(state.healReleased)drawEliteHealingRelease(c,e,camera,state.healReleaseProgress);
  }
  if(world.bossArena?.phase==='active')for(const b of world.arenaGates||[]){const x=Math.round(b.x-camera.x),y=Math.round(b.y-camera.y);box(c,'#251c2c',x,y-10,b.w,b.h+10);c.strokeStyle='#ca9c7a';c.lineWidth=2;c.strokeRect(x,y-10,b.w,b.h+10);const vertical=b.h>b.w,length=vertical?b.h:b.w;for(let i=0;i<length;i+=12)box(c,'#c4b098',x+(vertical?3:i),y+(vertical?i:-18),vertical?6:3,vertical?3:b.h+22);}
  // Draw identification last: walls cannot cover the symbol or response cue.
  for(const h of getEliteHazards(world))if(h.age<h.warning){
   const x=Math.round(h.x-camera.x),y=Math.round(h.y-camera.y),r=h.radius;
   if(x+r<0||y+r<0||x-r>c.canvas.width||y-r>c.canvas.height)continue;
   const tier=['critical','execution'].includes(h.danger)?' · '+h.danger.toUpperCase():'';
   const phase=h.kind==='waller'||h.kind==='artillery'?(h.age<(h.tracking||0)?'ACQUIRING':'LOCKED'):'';
   const title=(ELITE_MODIFIERS[h.kind]?.name||({shatter:'Shatter',chamber:'Infernal Chamber',collapse:'Vortex Collapse',moltenDeath:'Magma Eruption'}[h.kind])||h.kind).toUpperCase();
   caption(c,h.label||(title+(phase?' · '+phase:'')+tier),x,y-r-20,eliteCueProfile(h.kind).colors[2],h.kind);
  }
 }
 c.restore();
}
