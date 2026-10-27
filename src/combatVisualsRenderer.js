import {drawEncounterEffects} from './encounterArt.js';
import {drawClassMovement} from './classMovementArt.js';
import {drawWorkshopStrike} from './workshopArt.js';
import {drawOathBlades} from './oathbladeArt.js';
import {drawRoseCharge} from './roseEruptionArt.js';
import {drawFellhunterEffect,drawFellhunterProjectile} from './fellhunterArt.js';
import {drawOathkeeperEffect,drawBluntContact,drawBluntWeaponTrail,drawBluntGroundImpact,drawOathGuard} from './oathkeeperArt.js';
import {enemyTelegraphGeometry,drawAttackGeometry} from './enemyTelegraphGeometry.js';
import {drawSubclassEffect,drawSubclassEntities} from './subclassArt.js';
import {drawLichSummonEffect} from './lichSummonArt.js';
import {drawSunkenSkill,drawSunkenWard,drawMaelstromPixels} from './sunkenArt.js';
import {SUBCLASSES} from './subclassData.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {getPlayerSubclass} from './subclassSystem.js';
import { getCombatTechniqueState } from './combatExpansion.js';
import { CLASS_COMBAT_PALETTES } from './combatExpansionData.js';
import { getAbilityById } from './data.js';
import { drawTechniqueIcon } from './combatTechniqueIcons.js';
import { drawSkillPresentation } from './skillPresentationRenderer.js';
// combatVisualsRenderer.js
import {drawPersistentGroundArt,GROUND_EFFECT_ROWS} from './persistentGroundArt.js';
import {shieldGrip} from './handedness.js';
// Runalis combat visuals renderer.
//
// Responsibilities:
// - Weapon attack visuals.
// - Combat projectiles.
// - Ability projectiles.
// - Player action-state visuals.
// - World combat effects.
// - Necrotic Bolt visuals.
// - Thornbinder thorn/vine visuals.
//
// This module intentionally does NOT render:
// - Terrain.
// - World objects.
// - NPCs.
// - World drops.
// - Player body.
// - Enemy body.
// - Summon body.
// - Minimap.
// - Floating text.

import {
  getAttackVisual,
  getCombatProjectiles,
  playerIsDashing
} from './combat.js';
import {
  getClassVisualPalette,
  getEffectVisualPalette,
  steppedSine
} from './visualStyle.js';
import {
  getClassEffectStyle,
  sampleWeaponAttackPose
} from './playerAttackAnimation.js';
import { getProjectileVisualProfile } from './combatFeedbackProfiles.js';
import {drawCombatEffectArt,drawSkillReleaseArt} from './combatArt.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

function drawTechniqueEntities(ctx,player,camera,now=performance.now()/1000) {
  const state=getCombatTechniqueState(player);if(!state)return;
  ctx.save();
  drawOathBlades(ctx,state.statuses.oathBlades,camera,now);
  let statusIndex=0;
  for(const status of Object.values(state.statuses)) {
    if(status.ability?.oathBlades)continue;
    if(status.ability?.sunkenBase&&status.until>now)drawSunkenSkill(ctx,{profile:'mirror',abilityId:status.abilityId,x:player.x,y:player.y,ttl:1,age:0},camera);
    if(status.until<=now)continue;
    drawTechniqueIcon(ctx,getAbilityById(status.abilityId),player.x-camera.x-10+statusIndex++*22,player.y-camera.y-55,18);
  }
  for(const {enemy,mark} of state.marks) {
    const x=enemy.x-camera.x,y=enemy.y-camera.y-48;
    if(mark.until<=now||!isOnScreen(ctx,x,y,25))continue;
    ctx.globalAlpha=.8;
    drawTechniqueIcon(ctx,getAbilityById(mark.abilityId),x-9,y,18);
    const count=mark.kind==='mandate'?3:mark.kind==='overexposure'?4:0;
    for(let i=0;i<count;i++){ctx.fillStyle=i<mark.stacks?'#e8d8a5':'#544a40';ctx.fillRect(x-count*3+i*6,y+20,4,3);}
  }
  ctx.globalAlpha=1;
  for(const spirit of state.swarm) {
    const a=getAbilityById(spirit.abilityId),color=CLASS_COMBAT_PALETTES[a?.classId]?.[0]||'#a7bddb';
    const x=spirit.x-camera.x,y=spirit.y-camera.y;
    if(!isOnScreen(ctx,x,y,30))continue;
    ctx.fillStyle=color;ctx.strokeStyle=color;
    if(spirit.kind==='seed') {
      ctx.beginPath();ctx.moveTo(x-7,y+4);ctx.quadraticCurveTo(x-10,y-6,x,y-8);ctx.quadraticCurveTo(x+10,y-6,x+7,y+4);ctx.lineTo(x,y+8);ctx.closePath();ctx.fill();
      ctx.fillStyle='#192c19';ctx.fillRect(x-4,y-2,8,3);ctx.fillStyle='#d7a2a8';ctx.fillRect(x-3,y-4,2,2);ctx.fillRect(x+2,y-4,2,2);
    } else drawSpiritFace(ctx,x,y,7,color,1);
  }
  for(const shot of state.projectiles) {
    if(drawFellhunterProjectile(ctx,shot,camera))continue;
    const a=shot.ability||getAbilityById(shot.abilityId),palette=a.colors||CLASS_COMBAT_PALETTES[a?.classId]||CLASS_COMBAT_PALETTES.eldritch;
    const x=shot.x-camera.x,y=shot.y-camera.y;if(!isOnScreen(ctx,x,y,30))continue;
    if(a.sunkenBase){drawSunkenSkill(ctx,{profile:'pressure',x:shot.x-shot.dirX*20,y:shot.y-shot.dirY*20,dirX:shot.dirX,dirY:shot.dirY,range:32,ttl:.3},camera);continue;}
    if(shot.profile==='host')drawSpiritFace(ctx,x,y,6,palette[0],1);
    else {
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(shot.dirY,shot.dirX));
      ctx.strokeStyle=palette[0];ctx.lineWidth=shot.profile==='pressure'?3:2;
      ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(10,0);ctx.stroke();
      ctx.fillStyle=palette[1];ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-6,-5);ctx.lineTo(-2,0);ctx.lineTo(-6,5);ctx.closePath();ctx.fill();
      if(shot.profile==='ricochet'){
        ctx.rotate(now*12);ctx.fillStyle='#788188';ctx.strokeStyle='#f1e7cc';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(-14,3);ctx.lineTo(13,-4);ctx.lineTo(18,0);ctx.lineTo(9,6);ctx.lineTo(-14,6);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle='#65503c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(-10,9);ctx.stroke();
      }
      if(shot.profile==='pressure'){ctx.strokeStyle=palette[1];ctx.lineWidth=1;for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(-45,j*3);ctx.quadraticCurveTo(-20,-j*5,10,0);ctx.stroke();}}
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawSpiritFace(ctx,x,y,r,color,alpha) {
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(x-r,y+r);ctx.quadraticCurveTo(x-r*1.7,y-r*1.6,x,y-r*1.5);ctx.quadraticCurveTo(x+r*1.7,y-r*1.6,x+r,y+r);ctx.lineTo(x+r*.3,y+r*.5);ctx.lineTo(x,y+r*1.8);ctx.lineTo(x-r*.3,y+r*.7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#202034';ctx.fillRect(x-r*.55,y-r*.5,r*.32,r*.4);ctx.fillRect(x+r*.23,y-r*.5,r*.32,r*.4);ctx.fillRect(x-r*.15,y+r*.1,r*.3,r*.5);ctx.restore();
}
function drawTechniqueChannelPose(ctx,p,camera) {
  const c=p.activeChannel;if(!c||c.subclassId||c.abilityId==='lightbringerDawncarver')return;
  if(String(c.abilityId).startsWith('oathkeeper')){drawOathGuard(ctx,p,camera,'base',c);return;}
  const x=p.x-camera.x,y=p.y-camera.y+5,colors=c.ability?.colors||CLASS_COMBAT_PALETTES[p.classId]||CLASS_COMBAT_PALETTES.eldritch;
  ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle=colors[0];ctx.lineWidth=2;
  const pulse=.5+Math.sin(c.elapsed*7)*.15;
  if(c.profile==='litany'){
    const px=x+c.dirX*16,py=y+c.dirY*9-20;
    ctx.beginPath();ctx.moveTo(px-9,py-13);ctx.lineTo(px+9,py-13);ctx.lineTo(px+7,py+1);ctx.lineTo(px,py+8);ctx.lineTo(px-7,py+1);ctx.closePath();ctx.stroke();
    if(c.retaliationUntil>performance.now()/1000){ctx.strokeStyle=colors[1];for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(px+i*7,py);ctx.lineTo(px+i*11,py-18);ctx.stroke();}}
  }else if(c.profile==='thornstorm'){
    for(let i=0;i<4;i++){const px=x+(i-1.5)*12,py=y+(i%2)*3;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px-5,py-7,px+2,py-14);ctx.lineTo(px+5,py-4);ctx.stroke();}
  }else if(c.profile==='host'){
    for(let i=0;i<4;i++){const a=i*Math.PI/2,px=x+Math.cos(a)*22,py=y+Math.sin(a)*8;ctx.beginPath();ctx.moveTo(px-3,py+2);ctx.lineTo(px-3,py-6);ctx.lineTo(px+3,py-6);ctx.lineTo(px+3,py+2);ctx.stroke();}
  }else if(c.profile==='conduit'){
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3+c.elapsed*.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*14,y+Math.sin(a)*6-3);ctx.lineTo(x+Math.cos(a)*22,y+Math.sin(a)*8);ctx.stroke();}
  }else{
    for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(x,y,21+pulse*2+i*5,8+i*2,c.elapsed*.2,Math.PI*.15+i,Math.PI*1.6+i);ctx.stroke();}
  }
  ctx.restore();
}
function drawTechniqueEffect(ctx,fx,camera) {
  if(fx.profile==='maelstrom'){drawMaelstromPixels(ctx,fx,camera);return;}
  const x=fx.x-camera.x,y=fx.y-camera.y,ex=(fx.endX??fx.x)-camera.x,ey=(fx.endY??fx.y)-camera.y;
  if(!isOnScreen(ctx,x,y,600))return;
  const t=Math.min(1,(fx.age||0)/(fx.ttl||.4)),alpha=1-t;
  const [color,light,dark]=fx.colors||CLASS_COMBAT_PALETTES[fx.classId]||CLASS_COMBAT_PALETTES.eldritch;
  const r=Math.min(210,fx.radius||45),tier=Math.min(5,fx.masteryTier||0),profile=fx.profile,phase=fx.phase;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=alpha*.85;
  if(profile==='mythicTorrent'){
    const dx=fx.dirX||0,dy=fx.dirY??1,reach=fx.range||230,width=fx.width||77;
    for(let d=4;d<reach;d+=8)for(let side=-width;side<=width;side+=8){
      ctx.fillStyle=Math.abs(side)<width*.35?light:color;ctx.globalAlpha=alpha*(.35+.2*(1-d/reach));
      ctx.fillRect(Math.round(x+dx*d-dy*side),Math.round(y+dy*d+dx*side),6,4);
    }
  } else if(['chain','tether'].includes(profile)) {
    const dx=ex-x,dy=ey-y,d=Math.hypot(dx,dy)||1,n=Math.min(35,Math.ceil(d/10));
    ctx.lineWidth=profile==='chain'?2:1.5;
    for(let i=0;i<n;i++){const u=i/n,px=x+dx*u,py=y+dy*u+Math.sin(Math.PI*u)*9*(1-t);ctx.save();ctx.translate(px,py);ctx.rotate(Math.atan2(dy,dx));ctx.beginPath();ctx.ellipse(0,0,6,profile==='chain'?3:1.3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(ex,ey-9);ctx.lineTo(ex+7,ey+7);ctx.lineTo(ex-7,ey+7);ctx.closePath();ctx.fill();
  } else if(['urn','seed'].includes(profile) && phase!=='impact') {
    const px=x+(ex-x)*t,py=y+(ey-y)*t-Math.sin(t*Math.PI)*50;
    ctx.save();ctx.translate(px,py);ctx.rotate(t*3);ctx.fillStyle=dark;ctx.strokeStyle=color;ctx.lineWidth=2;
    if(profile==='seed'){
      ctx.beginPath();ctx.moveTo(0,-13);ctx.bezierCurveTo(14,-8,12,9,0,14);ctx.bezierCurveTo(-12,9,-14,-8,0,-13);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#b3cf86';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,11);ctx.moveTo(-7,-3);ctx.lineTo(0,2);ctx.lineTo(7,-4);ctx.stroke();
    }else{
      ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(7,-9);ctx.lineTo(5,-4);ctx.quadraticCurveTo(13,4,6,12);ctx.lineTo(-6,12);ctx.quadraticCurveTo(-13,4,-5,-4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(-8,-2);ctx.quadraticCurveTo(-16,-6,-12,5);ctx.moveTo(8,-2);ctx.quadraticCurveTo(16,-6,12,5);ctx.stroke();
    }
    ctx.strokeStyle=light;ctx.beginPath();ctx.moveTo(-5,1);ctx.lineTo(5,1);ctx.stroke();ctx.restore();
  } else if(profile==='urn' && phase==='impact') {
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,px=x+Math.cos(a)*r*t,py=y+Math.sin(a)*r*t*.35-16*Math.sin(t*Math.PI);ctx.save();ctx.translate(px,py);ctx.rotate(a+t*4);ctx.fillStyle=i%2?color:dark;ctx.strokeStyle=light;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,-3);ctx.lineTo(5,-5);ctx.lineTo(2,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
    drawSpiritFace(ctx,x,y-18*t,12,color,alpha*.6);
  } else if(profile==='pillar') {
    if(phase==='start') {
      ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.beginPath();ctx.ellipse(x,y,r,r*.32,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.32);ctx.lineTo(x+Math.cos(a)*(r+12),y+Math.sin(a)*(r+12)*.32);ctx.stroke();}
    } else {
      ctx.globalAlpha=alpha*.22;ctx.fillStyle=color;ctx.fillRect(x-r*.45,y-260,r*.9,260);
      ctx.globalAlpha=alpha*.9;ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(x-9,y-280);ctx.lineTo(x+9,y-280);ctx.lineTo(x+24,y);ctx.lineTo(x-24,y);ctx.closePath();ctx.fill();
      ctx.globalAlpha=alpha*.7;ctx.strokeStyle=light;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y,r*(.4+t*.6),r*(.15+t*.18),0,0,Math.PI*2);ctx.stroke();
    }
  } else if(['ghostwalk','briarstride','dawnstep','fracture','vault'].includes(profile)) {
    const dx=ex-x,dy=ey-y;
    for(let i=0;i<7+tier;i++){const u=i/(7+tier),px=x+dx*u,py=y+dy*u;ctx.globalAlpha=alpha*(.15+u*.5);
      if(profile==='ghostwalk')drawSpiritFace(ctx,px,py-12,12,color,alpha*.5);
      else if(profile==='briarstride'){ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px-8,py+5);ctx.quadraticCurveTo(px+8,py-17,px+5,py-25);ctx.stroke();ctx.beginPath();ctx.moveTo(px+4,py-13);ctx.lineTo(px+12,py-19);ctx.lineTo(px+6,py-7);ctx.stroke();}
      else if(profile==='vault'){ctx.fillStyle=dark;ctx.fillRect(px-3,py,5,2);}
      else if(profile==='fracture'){ctx.fillStyle=dark;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-4,py-24);ctx.lineTo(px+7,py-12);ctx.lineTo(px-3,py-2);ctx.lineTo(px+4,py+7);ctx.lineTo(px-8,py-5);ctx.closePath();ctx.fill();ctx.stroke();}
      else {ctx.fillStyle=light;ctx.save();ctx.translate(px,py-8);ctx.rotate(Math.PI/4);ctx.fillRect(-5,-12,10,24);ctx.restore();}
    }
  } else if(profile==='maelstrom') {
    const elapsed=fx.elapsed||t;
    ctx.globalAlpha=alpha*.25;ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(x,y,r,r*.46,0,0,Math.PI*2);ctx.fill();
    for(let j=0;j<3;j++){ctx.globalAlpha=alpha*(.5-j*.08);ctx.strokeStyle=j===0?light:color;ctx.lineWidth=4-j;
      ctx.beginPath();for(let i=0;i<50;i++){const a=i/49*Math.PI*3+elapsed*2+j*2,rr=r*(.15+i/49*.8);const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.46;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.stroke();}
    ctx.fillStyle=light;ctx.globalAlpha=alpha*.6;for(let i=0;i<12;i++){const a=i*2.4+elapsed*2,rr=r*(.25+(i%4)*.18);ctx.fillRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.46-3-Math.sin(a*2)*4,2,3);}
  } else if(['host','echo'].includes(profile)) {
    const count=profile==='echo'?1:5+tier;
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(fx.elapsed||t)*.7;drawSpiritFace(ctx,x+Math.cos(a)*34,y-26+Math.sin(a)*13,9,color,alpha*.65);}
  } else if(['thornstorm','bloom','briarstride','seed'].includes(profile)) {
    const count=profile==='bloom'?5:9;
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2,rr=profile==='bloom'?22:r*.65,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.4;
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py+9);ctx.quadraticCurveTo(px-10,py-12,px+Math.sin(a)*7,py-24);ctx.stroke();
      ctx.fillStyle=profile==='bloom'?'#c78e99':light;ctx.beginPath();ctx.moveTo(px-7,py-13);ctx.lineTo(px,py-22);ctx.lineTo(px+7,py-13);ctx.lineTo(px,py-9);ctx.closePath();ctx.fill();}
    if(profile==='thornstorm'){const dx=fx.dirX??0,dy=fx.dirY??1,reach=fx.range??r;
      for(let i=0;i<12;i++){const u=(i+.5)/12,side=(i%2?1:-1)*(12+u*14),px=x+dx*reach*u-dy*side,py=y+dy*reach*u+dx*side,h=14+16*Math.sin(Math.PI*Math.min(1,t*1.7+u*.2));
        ctx.fillStyle=dark;ctx.strokeStyle=i%3?color:light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-5,py+4);ctx.quadraticCurveTo(px-2,py-h*.4,px+4,py-h);ctx.lineTo(px+8,py-h*.25);ctx.lineTo(px+5,py+4);ctx.closePath();ctx.fill();ctx.stroke();}
    }
  } else if(['conduit','angle','orbit','fracture'].includes(profile)) {
    ctx.strokeStyle=light;ctx.lineWidth=2;
    if(profile==='conduit'||profile==='angle') {
      const endX=fx.endX!==undefined?ex:x+(fx.dirX??0)*(fx.range??r),endY=fx.endY!==undefined?ey:y+(fx.dirY??1)*(fx.range??r);
      ctx.beginPath();ctx.moveTo(x,y-12);for(let i=1;i<=10;i++){const u=i/10,offset=i===10?0:Math.sin(i*7+t*11)*9;ctx.lineTo(x+(endX-x)*u+offset,y-12+(endY-y)*u-offset*.6);}ctx.stroke();
      if(profile==='conduit'){ctx.strokeStyle=color;ctx.lineWidth=5;ctx.globalAlpha=alpha*.22;ctx.stroke();ctx.globalAlpha=alpha*.7;ctx.lineWidth=1;for(let j=2;j<=7;j+=2){const u=j/10,px=x+(endX-x)*u,py=y-12+(endY-y)*u,sign=j%4?1:-1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+sign*9,py-13);ctx.lineTo(px+sign*4,py-20);ctx.stroke();}}
      else {for(const [px,py] of [[x,y],[endX,endY]]){ctx.fillStyle=dark;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px-5,py-32);ctx.lineTo(px+9,py-15);ctx.lineTo(px-1,py+8);ctx.lineTo(px-12,py-11);ctx.closePath();ctx.fill();ctx.stroke();}}
    } else for(let i=0;i<5;i++){const a=i*Math.PI*.4+t*2,px=x+Math.cos(a)*r*.6,py=y+Math.sin(a)*r*.3;ctx.fillStyle=dark;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(px-7,py-12);ctx.lineTo(px+10,py-3);ctx.lineTo(px-3,py+12);ctx.closePath();ctx.fill();ctx.stroke();}
  } else if(profile==='undertow'||profile==='pressure') {
    const dx=ex-x,dy=ey-y;ctx.lineWidth=profile==='pressure'?3:2;
    for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(x,y+j*6);ctx.quadraticCurveTo(x+dx*.5+Math.sin(t*4+j)*10,y+dy*.5+j*10,ex,ey+j*6);ctx.stroke();}
  } else if(profile==='deadfall') {
    ctx.strokeStyle=phase==='impact'?light:color;ctx.lineWidth=3;ctx.strokeRect(x-30,y-18,60,30);
    ctx.fillStyle=dark;ctx.fillRect(x-28,y-17,56,14);ctx.fillStyle=light;
    for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(x-27+i*10,y-3);ctx.lineTo(x-22+i*10,y+10);ctx.lineTo(x-17+i*10,y-3);ctx.closePath();ctx.fill();}
    if(phase==='impact'){ctx.strokeStyle=color;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*22,y+Math.sin(a)*8);ctx.lineTo(x+Math.cos(a)*r*(.4+t),y+Math.sin(a)*r*.4*(.4+t));ctx.stroke();}}
  } else if(profile==='mirror') {
    ctx.strokeStyle=light;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-28,y-38);ctx.bezierCurveTo(x+8,y-22,x-8,y-7,x+28,y+3);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=9;ctx.globalAlpha=alpha*.35;ctx.stroke();
  } else if(profile==='halo') {
    for(let i=0;i<4+tier;i++){const a=i/(4+tier)*Math.PI*2+t*2,px=x+Math.cos(a)*r*.7,py=y-12+Math.sin(a)*r*.35;ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.fillStyle=light;ctx.fillRect(-3,-9,6,18);ctx.restore();}
  } else {
    // Existing catalogue release/impact polish: seven distinct class silhouettes.
    const n=fx.classId==='eldritch'?3:fx.classId==='lightbringer'?6:fx.classId==='oathkeeper'?4:5;
    ctx.lineWidth=phase==='impact'?2:1.5;
    if(fx.classId==='gravecaller')drawSpiritFace(ctx,x,y-12,11+4*t,color,alpha);
    else if(fx.classId==='thornbinder'){for(let i=0;i<5;i++){const a=i*Math.PI*.4;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.3-12,x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.4-22);ctx.stroke();}}
    else if(fx.classId==='waverider'){for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y,r*(.3+t*.7)+i*5,r*(.1+t*.25)+i*2,t,0,Math.PI*1.65);ctx.stroke();}}
    else if(fx.classId==='fellhunter'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?light:dark;ctx.fillRect(x+Math.cos(i*2.1)*r*t,y+Math.sin(i*2.1)*r*t*.4,3,2);}}
    else {ctx.beginPath();for(let i=0;i<=n;i++){const a=i/n*Math.PI*2+Math.PI*.25,px=x+Math.cos(a)*r*(.3+t*.7),py=y+Math.sin(a)*r*(.15+t*.3);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.stroke();}
    if(['mandate','overexposure','execution'].includes(profile)){ctx.strokeStyle=light;ctx.beginPath();ctx.moveTo(x-9,y-38);ctx.lineTo(x,y-48);ctx.lineTo(x+9,y-38);ctx.lineTo(x,y-28);ctx.closePath();ctx.stroke();}
  }
  ctx.restore();
}

export function drawCombatProjectiles(ctx, player, camera, now=performance.now()/1000) {
  drawTechniqueEntities(ctx,player,camera,now);
  drawSubclassEntities(ctx,player,camera);
  if (!ctx || !player || !camera) return;

  const projectiles = getCombatProjectiles(player) || [];

  for (const projectile of projectiles) {
    if (!projectile || projectile.alive === false) continue;

    const x = projectile.x - camera.x;
    const y = projectile.y - camera.y;

    if (!isOnScreen(ctx, x, y, 100)) continue;

    if (projectile.kind === 'necroticBolt') {
      drawNecroticBoltProjectile(ctx, projectile, x, y);
      continue;
    }

    if (projectile.kind === 'arrow' || projectile.kind === 'powerArrow') {
      drawArrowProjectile(ctx, projectile, x, y);
      continue;
    }

    drawGenericProjectile(ctx, projectile, x, y);
  }
}

export function drawAttackVisual(ctx, player, camera) {
  if (!ctx || !player || !camera) return;

  const visual = getAttackVisual(player);
  if (!visual) return;

  const x = player.x - camera.x;
  const y = player.y - camera.y;

  const move = visual.move;
  if (!move) return;

  if(drawBluntWeaponTrail(ctx,player,visual,camera))return;

  const progress = Math.max(0, Math.min(1, visual.elapsed / visual.duration));
  const activeAlpha = visual.active ? 0.55 : 0.22;

  if (move.kind === 'arc') {
    drawAttackArc(ctx, x, y, visual.dirX, visual.dirY, move, visual, player.classId, progress, activeAlpha);
    return;
  }

  if (move.kind === 'line') {
    drawAttackLine(ctx, x, y, visual.dirX, visual.dirY, move, progress, activeAlpha);
    return;
  }

  if (move.kind === 'circle') {
    drawAttackCircle(ctx, x, y, move, progress, activeAlpha);
    return;
  }

  if (move.kind === 'projectile') {
    drawRangedWindup(ctx, x, y, visual.dirX, visual.dirY, move, progress, activeAlpha);
  }
}

export function drawActionStateVisuals(ctx, player, camera) {
  drawTechniqueChannelPose(ctx,player,camera);
  drawOathGuard(ctx,player,camera,getSelectedAbilityMorph(player,player.buffs?.defense?.sourceAbilityId)||'base');
  if (!ctx || !player || !camera) return;

  const p = screen(player, camera);
  const state = player.actionState || {};

  if (playerIsDashing(player)) {
    drawDashVisual(ctx, player, p.x, p.y);
  }

  if (state.blocking) {
    drawBlockVisual(ctx, player, p.x, p.y);
  }

  if (state.guardBroken) {
    drawGuardBreakVisual(ctx, p.x, p.y);
  }

  if (hasActiveHydromancerBubbleWard(player)) {
    drawHydromancerBubbleWardVisual(ctx, player, p.x, p.y);
  }

  if (hasActiveLightbringerShield(player)) {
    drawLightbringerShieldVisual(ctx, player, p.x, p.y);
  }

  if (hasActiveDawncarverChannel(player)) {
    drawDawncarverChannelVisual(ctx, player, camera);
  }

  if (state.sprinting && !state.dashing) {
    drawSprintVisual(ctx, player, p.x, p.y);
  }

  drawCastBuildupVisual(ctx, player, p.x, p.y);
  drawAbilityChargeVisual(ctx, player, p.x, p.y);
}

export function drawWorldEffects(ctx, world, camera, layer) {
  if (!ctx || !world || !camera) return;
  if(layer!=='front')drawEncounterEffects(ctx,world,camera,layer);
  const drawWarnings=()=>{
    // Draw directly from live attack state: no per-frame effect copies or stale decals.
    for(const enemy of world.enemies||[]){
      if(!enemy||enemy.hp<=0||enemy.dead||enemy.remove||enemy.dormant||enemy.returningHome||enemy.arenaDormant)continue;
      const tell=enemy.boss?.pendingSpecial||enemy.telegraph;
      if(!tell||tell.time<=0||['arrowShot','curseBolt','summonMinion'].includes(tell.kind))continue;
      const geometry=enemy.boss?.pendingSpecial===tell?{shape:'circle',x:enemy.x,y:enemy.y,radius:tell.radius}:enemyTelegraphGeometry(enemy,tell);
      drawAttackGeometry(ctx,geometry,camera,1-tell.time/Math.max(.001,tell.maxTime),tell.color,tell.locked!==false,layer==='front');
    }
  };
  if(layer==='behind')drawWarnings();

  for (const fx of world.effects || []) {
    if (!fx) continue;

    const fxLayer = GROUND_EFFECT_ROWS[fx.kind]!==undefined||fx.layer==='ground'?'behind':fx.layer||'front';
    if (fxLayer !== layer) continue;

    drawEffect(ctx, fx, camera);
  }

  for (const fx of world.combatEffects || []) {
    if (!fx) continue;

    const fxLayer = GROUND_EFFECT_ROWS[fx.kind]!==undefined||fx.layer==='ground'?'behind':fx.layer||'front';
    if (fxLayer !== layer) continue;

    drawEffect(ctx, fx, camera);
  }
  if(layer==='front'){drawEncounterEffects(ctx,world,camera,layer);drawWarnings();}
}

// -----------------------------------------------------------------------------
// PROJECTILES
// -----------------------------------------------------------------------------

function drawNecroticBoltProjectile(ctx, projectile, x, y) {
  const palette = getEffectVisualPalette('necrotic');
  const profile = getProjectileVisualProfile(projectile);
  const t = projectile.age || performance.now() / 1000;
  const pulse = 1 + steppedSine(t, 18, 0.12, 12);
  const angle = Math.atan2(projectile.dirY || 0, projectile.dirX || 1);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = projectile.glowColor || palette.effectSoft;
  circle(ctx, 0, 0, 19 * pulse);

  ctx.globalAlpha = 0.42;
  ctx.fillStyle = profile.color || palette.base;
  circle(ctx, 0, 0, 12 * pulse);

  ctx.globalAlpha = 1;
  ctx.fillStyle = profile.color || palette.effect;
  diamond(ctx, 2, 0, 7 * pulse);

  ctx.fillStyle = profile.light || palette.effectLight;
  diamond(ctx, 4, -1, 3);

  ctx.strokeStyle = profile.light || palette.light;
  ctx.lineWidth = 2;
  circleStroke(ctx, 0, 0, 10 * pulse);
  ctx.globalAlpha = 0.62;
  for (let i = 0; i < 3; i++) {
    const trailX = -10 - i * 7 - ((t * 55) % 5);
    diamondStroke(ctx, trailX, (i - 1) * 3, 2.5 + i * 0.5);
  }

  ctx.restore();
}

function drawArrowProjectile(ctx, projectile, x, y) {
  const profile = getProjectileVisualProfile(projectile);
  const angle = Math.atan2(projectile.dirY || 0, projectile.dirX || 1);
  const power = projectile.kind === 'powerArrow';
  const pulse = 0.82 + Math.sin((projectile.age || 0) * 24) * 0.18;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.globalAlpha = 0.22 + pulse * 0.12;
  ctx.strokeStyle = profile.color;
  ctx.lineWidth = power ? 7 : 5;
  line(ctx, -28, 0, 8, 0);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = profile.color;
  ctx.lineWidth = power ? 3 : 2;
  line(ctx, -13, 0, 10, 0);

  ctx.fillStyle = profile.light;
  triangle(ctx, 11, 0, 4, -5, 4, 5);

  ctx.fillStyle = '#8b6a42';
  rect(ctx, -16, -2, 5, 4);

  ctx.restore();
}

function drawGenericProjectile(ctx, projectile, x, y) {
  const profile = getProjectileVisualProfile(projectile);
  const angle = Math.atan2(projectile.dirY || 0, projectile.dirX || 1);
  const size = Number(profile.size || 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = projectile.color || profile.color;
  if (profile.shape === 'thorn') {
    triangle(ctx, 9 * size, 0, -6 * size, -4 * size, -6 * size, 4 * size);
  } else if (profile.shape === 'shard') {
    diamond(ctx, 0, 0, (projectile.radius || 6) * size);
  } else if (profile.shape === 'lens') {
    ctx.save();
    ctx.scale(1.35, 0.78);
    circle(ctx, 0, 0, (projectile.radius || 6) * size);
    ctx.restore();
    ctx.strokeStyle = profile.light;
    ctx.lineWidth = 2;
    circleStroke(ctx, 0, 0, (projectile.radius || 6) * size * 0.72);
  } else if (profile.shape === 'prism') {
    poly(ctx, [
      [9 * size, 0],
      [1 * size, -7 * size],
      [-9 * size, -3 * size],
      [-7 * size, 5 * size],
      [2 * size, 7 * size]
    ]);
    ctx.fillStyle = profile.light;
    diamond(ctx, 2 * size, -1 * size, 3 * size);
  } else {
    circle(ctx, 0, 0, (projectile.radius || 5) * size);
  }

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = profile.light;
  ctx.lineWidth = 3;
  line(ctx, -20 * size, 0, -5 * size, 0);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// WEAPON ATTACK VISUALS
// -----------------------------------------------------------------------------

function drawAttackArc(ctx, x, y, dirX, dirY, move, visual, classId, progress, alpha) {
  const angle = Math.atan2(dirY, dirX);
  const range = move.range || 46;
  const arc = degreesToRadians(move.arcDegrees || 70);
  const pose = sampleWeaponAttackPose(move, visual.weaponType, visual.elapsed, { x: dirX, y: dirY }, classId);
  // Trails appear during the strike and dissipate during follow-through.
  // The existing combat clock, reach and active window remain authoritative.
  if(pose.phase==='anticipation' || pose.phase==='settle')return;
  const frame=pose.phase==='followThrough'?3:Math.min(2,Math.floor(pose.phaseProgress*3));
  const trailAngle=angle+(move.lightCombo?pose.weaponRotation*.32:0);
  if(drawCombatEffectArt(ctx,move.comboType==='heavy'?1:0,frame,x+dirX*range*.3,y-20+dirY*range*.3,range*1.7,trailAngle,pose.phase==='followThrough'?.38:.82))return;
  const swingAngle = angle + pose.weaponRotation * 0.72;
  const directionSign = pose.weaponRotation < 0 ? -1 : 1;
  const trailArc = arc * (move.comboType === 'heavy' ? 0.78 : 0.58);
  const start = swingAngle - trailArc * directionSign;
  const end = swingAngle + trailArc * 0.12 * directionSign;
  const intensity = Math.max(0.18, Number(pose.trailIntensity || 0.18));

  ctx.save();

  ctx.globalAlpha = alpha * intensity;
  ctx.strokeStyle = getMoveColor(move);
  ctx.lineWidth = move.comboType === 'heavy' ? 10 : 6;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(x, y, range, start, end, directionSign < 0);
  ctx.stroke();

  ctx.globalAlpha = Math.min(0.95, (alpha + 0.18) * intensity);
  ctx.strokeStyle = getMoveHighlight(move);
  ctx.lineWidth = move.comboType === 'heavy' ? 3 : 2;

  ctx.beginPath();
  ctx.arc(x, y, range - 4, start, end, directionSign < 0);
  ctx.stroke();

  if (move.comboType === 'heavy') {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = getMoveColor(move);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, start, end, directionSign < 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawAttackLine(ctx, x, y, dirX, dirY, move, progress, alpha) {
  if (move.lightCombo) {
    const elapsed=progress*move.duration,fadeEnd=move.activeEnd+move.recovery*.3;
    if(elapsed<move.activeStart||elapsed>fadeEnd)return;
    const reach=move.range*Math.min(1,(elapsed-move.activeStart)/Math.max(.01,move.activeEnd-move.activeStart));
    const fade=elapsed<=move.activeEnd?1:Math.max(0,1-(elapsed-move.activeEnd)/Math.max(.01,fadeEnd-move.activeEnd));
    ctx.save();ctx.fillStyle=getMoveHighlight(move);
    // Compact pixel streaks follow physical jabs, rather than the wide beam
    // used by magical line attacks. They disappear with the follow-through.
    for(let lane=-1;lane<=1;lane++)for(let distance=12;distance<reach;distance+=3){
      if(lane&&Math.floor(distance/3)%3===0)continue;
      ctx.globalAlpha=alpha*fade*(lane?.28:.8);
      const px=x+dirX*distance-dirY*lane*3,py=y-20+dirY*distance+dirX*lane*3;
      ctx.fillRect(Math.round(px/2)*2,Math.round(py/2)*2,2,2);
    }
    ctx.restore();return;
  }
  if (move?.impact === 'eldritchBeam' || move?.id?.includes('eldritch')) {
    drawEldritchBeamLine(ctx, x, y, dirX, dirY, move, progress, alpha);
    return;
  }

  const range = move.range || 60;
  const width = move.width || 24;
  const reach = range * easeOutCubic(progress);

  const endX = x + dirX * reach;
  const endY = y + dirY * reach;

  const sideX = -dirY;
  const sideY = dirX;

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = getMoveColor(move);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  line(ctx, x + dirX * 10, y + dirY * 10, endX, endY);

  ctx.globalAlpha = Math.min(0.9, alpha + 0.16);
  ctx.strokeStyle = getMoveHighlight(move);
  ctx.lineWidth = 2;
  line(ctx, x + sideX * 3, y + sideY * 3, endX + sideX * 3, endY + sideY * 3);

  ctx.restore();
}

function drawEldritchBeamLine(ctx, x, y, dirX, dirY, move, progress, alpha) {
  const range = move.range || 210;
  const width = move.width || 22;
  const reach = range * easeOutCubic(progress);
  const startX = x + dirX * 14;
  const startY = y + dirY * 14;
  const endX = x + dirX * reach;
  const endY = y + dirY * reach;
  const sideX = -dirY;
  const sideY = dirX;
  const jag = 5 + Math.sin(progress * Math.PI * 8) * 2;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = alpha * 0.34;
  ctx.strokeStyle = '#060308';
  ctx.lineWidth = width + 8;
  line(ctx, startX, startY, endX, endY);

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = '#ef4056';
  ctx.lineWidth = Math.max(5, width * 0.34);
  drawJaggedLine(ctx, startX, startY, endX, endY, sideX, sideY, jag, 7);

  ctx.globalAlpha = Math.min(1, alpha + 0.08);
  ctx.strokeStyle = '#ff9aa8';
  ctx.lineWidth = 2;
  drawJaggedLine(ctx, startX, startY, endX, endY, sideX, sideY, jag * 0.55, 9);

  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = '#10070c';
  circle(ctx, endX, endY, 8 + progress * 5);
  ctx.strokeStyle = '#ef4056';
  ctx.lineWidth = 2;
  circleStroke(ctx, endX, endY, 13 + progress * 9);

  ctx.restore();
}

function drawAttackCircle(ctx, x, y, move, progress, alpha) {
  const radius = move.radius || move.range || 42;
  const pulse = radius * (0.65 + easeOutCubic(progress) * 0.35);

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = getMoveColor(move);
  ctx.lineWidth = move.comboType === 'heavy' ? 8 : 5;
  circleStroke(ctx, x, y, pulse);

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = getMoveColor(move);
  circle(ctx, x, y, pulse);

  ctx.restore();
}

function drawRangedWindup(ctx, x, y, dirX, dirY, move, progress, alpha) {
  const length = 34 + progress * 12;
  const endX = x + dirX * length;
  const endY = y + dirY * length;

  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 3;
  line(ctx, x + dirX * 12, y + dirY * 12, endX, endY);

  ctx.fillStyle = '#ffcc66';
  circle(ctx, endX, endY, 3);

  ctx.restore();
}

function getMoveColor(move) {
  if (!move) return getClassVisualPalette('default').light;

  if (move.id?.includes('scythe')) return getEffectVisualPalette('necrotic').effect;
  if (move.id?.includes('eldritch')) return getEffectVisualPalette('eldritch').effect;
  if (move.id?.includes('staff')) return '#c5b99a';
  if (move.id?.includes('bow')) return getClassVisualPalette('mercenary').effect;

  if (move.comboType === 'heavy') return getEffectVisualPalette('radiant').base;

  return getClassVisualPalette('default').light;
}

function getMoveHighlight(move) {
  if (!move) return getClassVisualPalette('default').light;
  if (move.id?.includes('scythe')) return getEffectVisualPalette('necrotic').effectLight;
  if (move.id?.includes('eldritch')) return getEffectVisualPalette('eldritch').effectLight;
  if (move.id?.includes('staff')) return '#e6dcc1';
  if (move.id?.includes('bow')) return getClassVisualPalette('mercenary').effectLight;
  if (move.comboType === 'heavy') return getEffectVisualPalette('radiant').light;
  return getClassVisualPalette('default').light;
}

// -----------------------------------------------------------------------------
// PLAYER ACTION-STATE VISUALS
// -----------------------------------------------------------------------------

function drawDashVisual(ctx, player, x, y) {
  const dirX = player.actionState?.dashDirX || player.dirX || 0;
  const dirY = player.actionState?.dashDirY ?? player.dirY ?? 1;
  const palette = getClassVisualPalette(player?.classId);

  ctx.save();

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = palette.effect;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  for (let i = 1; i <= 3; i++) {
    line(
      ctx,
      x - dirX * i * 12,
      y - dirY * i * 12,
      x - dirX * (i * 12 + 10),
      y - dirY * (i * 12 + 10)
    );
  }

  ctx.restore();
}

function drawBlockVisual(ctx, player, x, y) {
  const dirX = player.dirX || 0;
  const dirY = player.dirY ?? 1;

  const facing=Math.abs(dirX)>Math.abs(player.dirY||0)?(dirX<0?'left':'right'):(dirY<0?'up':'down');
  const [handX,handY]=shieldGrip(facing);
  const shieldX = x + handX;
  const shieldY = y + handY;
  const palette = getClassVisualPalette(player?.classId);

  ctx.save();

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = palette.effect;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(shieldX, shieldY, 18, Math.PI * 0.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = palette.effect;
  circle(ctx, shieldX, shieldY, 18);

  ctx.restore();
}

function drawGuardBreakVisual(ctx, x, y) {
  ctx.save();

  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = '#ffcc66';
  ctx.lineWidth = 3;

  line(ctx, x - 13, y - 44, x - 3, y - 34);
  line(ctx, x + 3, y - 34, x + 13, y - 44);
  line(ctx, x - 10, y - 34, x + 10, y - 34);

  ctx.restore();
}

function hasActiveHydromancerBubbleWard(player) {
  return getBubbleWardTimeRemaining(player) > 0;
}

function drawHydromancerBubbleWardVisual(ctx, player, x, y) {
  if(player.visuals?.bubbleWardMorph==='sunken'){drawSunkenWard(ctx,x,y,performance.now()/1000,clamp(getBubbleWardTimeRemaining(player)/.75,.22,1));return;}
  const timer = getBubbleWardTimeRemaining(player);
  const flatAbsorb = Math.max(0, Number(player?.visuals?.bubbleWardFlatAbsorb || 0));
  const now = performance.now() / 1000;
  const pulse = 1 + Math.sin(now * 4.2) * 0.025;
  const fade = clamp(timer / 0.75, 0.22, 1);
  const strength = clamp(flatAbsorb / 18, 0.35, 1);
  const radiusX = (32 + strength * 6) * pulse;
  const radiusY = (44 + strength * 7) * pulse;
  const centerY = y - 18;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const gradient = ctx.createRadialGradient(x, centerY - 4, 7, x, centerY, radiusY);
  gradient.addColorStop(0, 'rgba(143,234,242,0.04)');
  gradient.addColorStop(0.62, 'rgba(143,234,242,0.11)');
  gradient.addColorStop(1, 'rgba(143,234,242,0.03)');

  ctx.globalAlpha = 0.72 * fade;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.62 * fade;
  ctx.strokeStyle = 'rgba(177,249,255,0.78)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(x, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.28 * fade;
  ctx.strokeStyle = 'rgba(89,215,232,0.82)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, centerY + 2, radiusX * 0.82, radiusY * 0.88, Math.sin(now * 1.2) * 0.08, Math.PI * 0.08, Math.PI * 1.52);
  ctx.stroke();

  ctx.globalAlpha = 0.24 * fade;
  ctx.strokeStyle = 'rgba(230,255,255,0.86)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const angle = now * (0.75 + i * 0.12) + i * Math.PI * 0.7;
    const bubbleX = x + Math.cos(angle) * radiusX * (0.42 + i * 0.11);
    const bubbleY = centerY + Math.sin(angle * 1.17) * radiusY * (0.38 + i * 0.08);
    circleStroke(ctx, bubbleX, bubbleY, 2.5 + i * 0.8);
  }

  ctx.restore();
}

function hasActiveLightbringerShield(player) {
  const now = performance.now() / 1000;
  return Number(player?.visuals?.prismGuardUntil || 0) > now ||
    Number(player?.visuals?.haloAegisUntil || 0) > now ||
    Number(player?.lightbringer?.firstSunriseUntil || 0) > now;
}

function drawLightbringerShieldVisual(ctx, player, x, y) {
  const now = performance.now() / 1000;
  const prismTimer = Math.max(0, Number(player?.visuals?.prismGuardUntil || 0) - now);
  const aegisTimer = Math.max(0, Number(player?.visuals?.haloAegisUntil || 0) - now);
  const sunriseTimer = Math.max(0, Number(player?.lightbringer?.firstSunriseUntil || 0) - now);
  const activeTimer = Math.max(prismTimer, aegisTimer, sunriseTimer);
  if (activeTimer <= 0) return;

  const strength = clamp(
    Math.max(Number(player?.visuals?.prismGuardFlatAbsorb || 0), Number(player?.visuals?.haloAegisFlatAbsorb || 0)) / 24,
    sunriseTimer > 0 ? 0.55 : 0.32,
    1.1
  );
  const fade = clamp(activeTimer / 0.75, 0.22, 1);
  const radiusX = 31 + strength * 8;
  const radiusY = 43 + strength * 9;
  const centerY = y - 18;
  const spin = now * (aegisTimer > 0 ? 1.4 : 0.9);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = (sunriseTimer > 0 ? 0.17 : 0.1) * fade;
  ctx.fillStyle = 'rgba(255,241,184,0.42)';
  ctx.beginPath();
  ctx.ellipse(x, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.52 * fade;
  ctx.strokeStyle = 'rgba(255,247,216,0.86)';
  ctx.lineWidth = aegisTimer > 0 ? 2.4 : 1.8;
  ctx.beginPath();
  ctx.ellipse(x, centerY, radiusX, radiusY, Math.sin(spin) * 0.04, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.55 * fade;
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const a = spin + i / 6 * Math.PI * 2;
    const px = x + Math.cos(a) * radiusX;
    const py = centerY + Math.sin(a) * radiusY;
    const nx = x + Math.cos(a + 0.08) * radiusX;
    const ny = centerY + Math.sin(a + 0.08) * radiusY;
    line(ctx, px, py, nx, ny);
  }

  if (aegisTimer > 0 || sunriseTimer > 0) {
    ctx.globalAlpha = 0.42 * fade;
    ctx.strokeStyle = 'rgba(255,241,184,0.88)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, centerY - radiusY * 0.52, radiusX * 0.72, radiusY * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function hasActiveDawncarverChannel(player) {
  const now = performance.now() / 1000;
  const channel = player?.lightbringer?.dawncarverChannel;
  return !!channel && Number(channel.until || 0) > now;
}

function drawDawncarverChannelVisual(ctx, player, camera) {
  const channel = player?.lightbringer?.dawncarverChannel;
  if (!channel) return;

  const now = performance.now() / 1000;
  const remaining = Math.max(0, Number(channel.until || 0) - now);
  if (remaining <= 0) return;

  const duration = Math.max(0.1, Number(channel.duration || 3));
  const elapsed = Math.max(0, duration - remaining);
  const progress = clamp(elapsed / duration, 0, 1);
  const lumens = Math.max(1, Math.min(3, Number(channel.lumens || 1)));
  const dirX = Number(channel.dirX || 0);
  const dirY = Number(channel.dirY ?? 1);
  const range = Math.max(0, Number(channel.visualRange ?? channel.range ?? 320));
  const width = Math.max(16, Number(channel.width || 28));
  const originX = Number(channel.originX ?? ((player?.x || 0) + dirX * 16));
  const originY = Number(channel.originY ?? ((player?.y || 0) + dirY * 14 - 13));
  const x = originX - camera.x;
  const y = originY - camera.y;
  const endX = x + dirX * range;
  const endY = y + dirY * range;
  const sideX = -dirY;
  const sideY = dirX;
  const fade = clamp(Math.min(remaining / 0.28, (progress + 0.16) / 0.3), 0.18, 1);
  const pulse = 0.9 + Math.sin(now * 32) * 0.08;
  const carvePulse = Math.sin(now * 11) * width * 0.05;
  const ringCount = 3 + lumens;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = 0.12 * fade;
  ctx.strokeStyle = 'rgba(255,241,184,0.38)';
  ctx.lineWidth = width * (1.9 + lumens * 0.18) * pulse;
  line(ctx, x, y, endX, endY);

  ctx.globalAlpha = 0.32 * fade;
  ctx.strokeStyle = 'rgba(217,173,79,0.78)';
  ctx.lineWidth = width * 0.95 * pulse;
  line(ctx, x, y, endX, endY);

  ctx.globalAlpha = 0.44 * fade;
  ctx.strokeStyle = 'rgba(255,247,216,0.74)';
  ctx.lineWidth = Math.max(2, width * 0.09);
  const railOffset = width * 0.34 + carvePulse;
  line(ctx, x + sideX * railOffset, y + sideY * railOffset, endX + sideX * railOffset, endY + sideY * railOffset);
  line(ctx, x - sideX * railOffset, y - sideY * railOffset, endX - sideX * railOffset, endY - sideY * railOffset);

  ctx.globalAlpha = 0.82 * fade;
  ctx.strokeStyle = '#fff1b8';
  ctx.lineWidth = Math.max(5, width * 0.34);
  line(ctx, x, y, endX, endY);

  ctx.globalAlpha = 0.96 * fade;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, width * 0.11);
  line(ctx, x, y, endX, endY);

  for (let i = 0; i < ringCount; i++) {
    const p = ((i + 1) / (ringCount + 1) + now * (0.16 + lumens * 0.025)) % 1;
    const rx = x + dirX * range * p;
    const ry = y + dirY * range * p;
    const r = 5 + lumens * 2 + Math.sin(now * 12 + i) * 1.2;
    ctx.globalAlpha = 0.36 * fade;
    ctx.strokeStyle = i % 2 ? '#fff7d8' : '#d9ad4f';
    ctx.lineWidth = 1.4;
    circleStroke(ctx, rx, ry, r);
  }

  for (let i = 0; i < 4 + lumens; i++) {
    const p = ((i + now * (1.65 + lumens * 0.12)) / (4 + lumens)) % 1;
    const centerX = x + dirX * range * p;
    const centerY = y + dirY * range * p;
    const slash = width * (0.22 + (i % 2) * 0.08);
    ctx.globalAlpha = 0.26 * fade;
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#d9ad4f';
    ctx.lineWidth = 1.2;
    line(ctx, centerX - sideX * slash, centerY - sideY * slash, centerX + sideX * slash, centerY + sideY * slash);
  }

  ctx.globalAlpha = 0.38 * fade;
  ctx.fillStyle = 'rgba(255,241,184,0.42)';
  circle(ctx, x, y, 20 + lumens * 4 + Math.sin(now * 18) * 2);

  ctx.globalAlpha = 0.5 * fade;
  ctx.strokeStyle = '#fff7d8';
  ctx.lineWidth = 2;
  circleStroke(ctx, endX, endY, 10 + lumens * 4 + Math.sin(now * 20) * 2);

  ctx.restore();
}

function getBubbleWardTimeRemaining(player) {
  const until = Number(player?.visuals?.bubbleWardUntil || 0);
  if (!Number.isFinite(until) || until <= 0) return 0;
  return Math.max(0, until - performance.now() / 1000);
}

function drawSprintVisual(ctx, player, x, y) {
  const dirX = player.dirX || 0;
  const dirY = player.dirY ?? 1;

  ctx.save();

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  line(ctx, x - dirX * 13 - 5, y - dirY * 13 + 10, x - dirX * 28 - 5, y - dirY * 28 + 10);
  line(ctx, x - dirX * 13 + 5, y - dirY * 13 + 14, x - dirX * 28 + 5, y - dirY * 28 + 14);

  ctx.restore();
}

function drawAbilityChargeVisual(ctx, player, x, y) {
  const charge = player?.abilityCharge;
  if (!charge?.active) return;

  const progress = Math.max(0, Math.min(1, Number(charge.progress || 0)));
  const level = Math.max(0, Number(charge.level || 0));
  const color = getChargeColor(player.classId);
  const radius = 24 + level * 3;
  const aim = getChargeAim(player);
  if(['thornbinderThornLash','thornbinderLivingBriar'].includes(charge.abilityId)&&charge.subclassId==='petalknight'){
    drawRoseCharge(ctx,charge,x,y,aim);return;
  }
  const originY = y + 17;
  const arrowLength = 42 + progress * 34 + level * 9;
  const arrowX = x + aim.x * arrowLength;
  const arrowY = originY + aim.y * arrowLength;
  const sideX = -aim.y;
  const sideY = aim.x;

  ctx.save();
  ctx.lineCap = 'round';

  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = 'rgba(3,6,12,0.92)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, originY, radius, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();

  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = color;
  ctx.lineWidth = level >= 2 ? 5 : 3;
  ctx.beginPath();
  ctx.arc(x, originY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  ctx.globalAlpha = 0.82;
  ctx.fillStyle = color;
  for (const threshold of charge.chargeLevels || []) {
    if (!threshold) continue;
    const angle = -Math.PI / 2 + Math.PI * 2 * threshold;
    circle(ctx, x + Math.cos(angle) * radius, originY + Math.sin(angle) * radius, 2.4);
  }

  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = 'rgba(3,6,12,0.94)';
  ctx.lineWidth = 9;
  line(ctx, x + aim.x * (radius + 3), originY + aim.y * (radius + 3), arrowX, arrowY);

  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = color;
  ctx.lineWidth = level >= 2 ? 4 : 3;
  line(ctx, x + aim.x * (radius + 3), originY + aim.y * (radius + 3), arrowX, arrowY);

  ctx.globalAlpha = 0.74;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(arrowX + aim.x * 9, arrowY + aim.y * 9);
  ctx.lineTo(arrowX - aim.x * 8 + sideX * 7, arrowY - aim.y * 8 + sideY * 7);
  ctx.lineTo(arrowX - aim.x * 8 - sideX * 7, arrowY - aim.y * 8 - sideY * 7);
  ctx.closePath();
  ctx.fill();

  if (isDirectionalChargePreview(charge)) {
    ctx.globalAlpha = 0.16 + progress * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + aim.x * (radius + 8) + sideX * 14, originY + aim.y * (radius + 8) + sideY * 14);
    ctx.lineTo(x + aim.x * (radius + 74) + sideX * 24, originY + aim.y * (radius + 74) + sideY * 24);
    ctx.moveTo(x + aim.x * (radius + 8) - sideX * 14, originY + aim.y * (radius + 8) - sideY * 14);
    ctx.lineTo(x + aim.x * (radius + 74) - sideX * 24, originY + aim.y * (radius + 74) - sideY * 24);
    ctx.stroke();
  }

  if (level >= 2) {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = color;
    circle(ctx, x, y - 8, 31);
  }

  ctx.restore();
}

function drawCastBuildupVisual(ctx, player, x, y) {
  const charge = player?.abilityCharge;
  if(charge?.active&&['thornbinderThornLash','thornbinderLivingBriar'].includes(charge.abilityId)&&charge.subclassId==='petalknight')return;
  const action = player?.visualAction;
  const now = performance.now() / 1000;
  const actionActive = action && now <= Number(action.startedAt || 0) + Math.max(0.1, Number(action.duration || 0.5));
  const showActionCast = actionActive && ['cast', 'ritual'].includes(action.animationFamily || action.kind);
  if (!charge?.active && !showActionCast) return;

  const classId = player.classId || 'default';
  const sub=SUBCLASSES[charge?.active?getSelectedAbilityMorph(player,charge.abilityId):action?.subclassId]||getPlayerSubclass(player);
  const style = sub?{base:sub.colors[0],light:sub.colors[1],dark:sub.colors[2]}:getClassEffectStyle(classId);
  const aim = charge?.active ? getChargeAim(player) : null;
  const dirX = Number(aim?.x ?? player.dirX ?? 0);
  const dirY = Number(aim?.y ?? player.dirY ?? 1);
  const actionProgress = showActionCast
    ? clamp((now - Number(action.startedAt || now)) / Math.max(0.1, Number(action.duration || 0.5)), 0, 1)
    : 0;
  const progress = charge?.active
    ? clamp(Number(charge.progress || 0), 0, 1)
    : clamp(1 - actionProgress * 0.72, 0.18, 1);
  const level = Math.max(Number(charge?.level || 0), showActionCast ? Number(action?.chargeLevel || 0) : 0);
  const pulse = 0.72 + Math.sin(now * (8 + level * 2)) * 0.12;
  const handX = x + dirX * (15 + progress * 5);
  const handY = y - 19 + dirY * 7 - progress * 4;
  const radius = 7 + progress * 8 + level * 2;

  ctx.save();
  ctx.lineCap = 'round';

  ctx.globalAlpha = 0.18 + progress * 0.2;
  ctx.fillStyle = style.dark;
  circle(ctx, handX, handY, radius + 6);

  ctx.globalAlpha = 0.48 + progress * 0.38;
  ctx.strokeStyle = style.base;
  ctx.lineWidth = level >= 2 ? 3 : 2;
  circleStroke(ctx, handX, handY, radius * pulse);

  ctx.globalAlpha = 0.72 + progress * 0.24;
  ctx.fillStyle = style.light;
  circle(ctx, handX, handY, 2 + progress * 2);

  if (classId === 'oathkeeper' || classId === 'templar') {
    ctx.strokeStyle = style.light;
    ctx.lineWidth = 2;
    line(ctx, handX - radius * 0.65, handY, handX + radius * 0.65, handY);
    line(ctx, handX, handY - radius * 0.65, handX, handY + radius * 0.65);
  } else if (classId === 'gravecaller' || classId === 'necromancer') {
    ctx.fillStyle = style.base;
    for (let i = 0; i < 4; i++) {
      const angle = now * 1.7 + i * Math.PI * 0.5;
      rect(ctx, handX + Math.cos(angle) * radius - 2, handY + Math.sin(angle) * radius - 2, 4, 4);
    }
  } else if (classId === 'thornbinder') {
    ctx.strokeStyle = style.light;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const angle = -1.4 + i * 0.7 + Math.sin(now * 2 + i) * 0.1;
      line(ctx, handX, handY, handX + Math.cos(angle) * radius, handY + Math.sin(angle) * radius);
    }
  } else if (classId === 'hydromancer' || classId === 'waverider') {
    ctx.strokeStyle = style.light;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const orbit = radius * (0.45 + i * 0.22);
      const angle = now * (1.4 + i * 0.18) + i * 2.1;
      circleStroke(ctx, handX + Math.cos(angle) * orbit * 0.45, handY + Math.sin(angle) * orbit * 0.28, 2 + i);
    }
  } else if (classId === 'eldritch') {
    ctx.strokeStyle = style.base;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = now * 2.4 + i * Math.PI * 0.5;
      const inner = radius * 0.35;
      const outer = radius * (0.85 + (i % 2) * 0.25);
      line(
        ctx,
        handX + Math.cos(angle) * inner,
        handY + Math.sin(angle) * inner,
        handX + Math.cos(angle + 0.35) * outer,
        handY + Math.sin(angle + 0.35) * outer
      );
    }
  } else {
    ctx.strokeStyle = style.light;
    ctx.lineWidth = 2;
    line(ctx, handX - radius * 0.7, handY + radius * 0.35, handX + radius * 0.75, handY - radius * 0.35);
  }

  if (level >= 2 || showActionCast) {
    ctx.globalAlpha = 0.28 + progress * 0.26;
    ctx.strokeStyle = style.light;
    ctx.lineWidth = 1;
    circleStroke(ctx, handX, handY, radius + 5 + pulse * 2);
  }

  ctx.restore();
}

function getChargeColor(classId) {
  if (classId === 'oathkeeper' || classId === 'templar') return '#ffecb0';
  if (classId === 'fellhunter' || classId === 'mercenary') return '#ef8b58';
  if (classId === 'gravecaller' || classId === 'necromancer') return '#b68cff';
  if (classId === 'thornbinder') return '#73d18a';
  if (classId === 'hydromancer' || classId === 'waverider') return '#59d7e8';
  if (classId === 'eldritch') return '#ef4056';
  return '#ffcc66';
}

function getChargeAim(player) {
  const charge = player?.abilityCharge || {};
  const rawX = Number(charge.aimX ?? player?.combatAim?.x ?? player?.lastCombatAimX ?? player?.dirX ?? 0);
  const rawY = Number(charge.aimY ?? player?.combatAim?.y ?? player?.lastCombatAimY ?? player?.dirY ?? 1);
  const distance = Math.hypot(rawX, rawY);

  if (!Number.isFinite(distance) || distance <= 0.001) {
    return { x: 0, y: 1 };
  }

  return {
    x: rawX / distance,
    y: rawY / distance
  };
}

function isDirectionalChargePreview(charge) {
  const behavior = String(charge?.releaseBehavior || '').toLowerCase();
  const abilityId = String(charge?.abilityId || '').toLowerCase();

  return (
    behavior !== 'self' &&
    !abilityId.includes('summon') &&
    !abilityId.includes('ward') &&
    !abilityId.includes('mending')
  );
}

// -----------------------------------------------------------------------------
// WORLD EFFECT ROUTER
// -----------------------------------------------------------------------------

function drawEffect(ctx, fx, camera) {
  if(fx.kind==='workshopStrike'){drawWorkshopStrike(ctx,fx,camera);return;}
  if(fx.kind==='classMovement'){drawClassMovement(ctx,fx,camera);return;}
  if(drawFellhunterEffect(ctx,fx,camera))return;
  if(fx.kind==='bluntGroundImpact'){drawBluntGroundImpact(ctx,fx,camera);return;}
  if(drawOathkeeperEffect(ctx,fx,camera))return;
  if(fx.kind==='enemyContactImpact'&&fx.blunt){drawBluntContact(ctx,fx,camera);return;}
  if(fx.kind==='sunkenSkill'){drawSunkenSkill(ctx,fx,camera);return;}
  if(fx.kind==='lichSummon'){drawLichSummonEffect(ctx,fx,camera);return;}
  if(fx.kind==='subclassAbility'){drawSubclassEffect(ctx,fx,camera);return;}
  if (fx.kind === 'abilityPresentation') { drawSkillPresentation(ctx,fx,camera); return; }
  if (fx.kind === 'combatTechnique') { drawTechniqueEffect(ctx,fx,camera); return; }
  const x = fx.x - camera.x;
  const y = fx.y - camera.y;

  if (!isOnScreen(ctx, x, y, 180)) return;

  const age = fx.age || 0;
  const ttl = Math.max(0.001, fx.ttl || 0.3);
  const t = clamp(age / ttl, 0, 1);
  const alpha = 1 - t;

  if(drawPersistentGroundArt(ctx,fx,x,y))return;

  if (fx.kind === 'necroticCast') {
    drawNecroticCastEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'necroticTrail') {
    drawNecroticTrailEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'necroticImpact') {
    drawNecroticImpactEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'necroticFade') {
    drawNecroticFadeEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'vineWhip' || fx.kind === 'thornbinderThornLash' || fx.kind === 'thornbinderBriarHook') {
    drawVineWhipEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'thornbinderBramblePatch') {
    drawThornbinderBramblePatchEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'thornbinderRosebiteBurst') {
    drawThornbinderRosebiteBurstEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'thornbinderRootPrison') {
    drawThornbinderRootPrisonEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'thornbinderBriarBloom') {
    drawThornbinderBriarBloomEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'thornbinderVerdantWound') {
    drawThornbinderVerdantWoundEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'vineSegment') {
    drawVineSegmentEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'vineImpact') {
    drawVineImpactEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'burst') {
    drawBurstEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if(fx.kind==='enemyContactImpact'){
    drawEnemyContactImpact(ctx,x,y,fx,alpha,t);return;
  }
  if(fx.kind==='bossFlourish'){
    ctx.save();ctx.globalAlpha=alpha*.55;ctx.fillStyle=fx.color||'#ce9877';
    for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.3,r=Math.min(30,fx.radius||24)*(1+t*.5);ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r-12),3,5);}
    ctx.restore();return;
  }
  if (fx.kind === 'bossTelegraph') {
    drawBossTelegraphEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'enemyTelegraph') {
    drawEnemyTelegraphEffect(ctx, x, y, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'enemyTellRelease') {
    drawEnemyTellReleaseEffect(ctx, x, y, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'projectileDissipate') {
    drawProjectileDissipateEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'combatStateFeedback') {
    drawCombatStateFeedbackEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'eliteMarker') {
    drawEliteMarkerEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'enemyProjectile') {
    drawEnemyProjectileEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'healPulse' || fx.kind === 'summonPulse' || fx.kind === 'phasePulse' || fx.kind === 'enemyPulse' || fx.kind === 'cursedGround') {
    drawEnemyPulseEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'slash' || fx.kind === 'heavySlash') {
    drawSlashEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'weaponWindup') {
    drawWeaponWindupEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'chargedRelease') {
    drawChargedReleaseEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'signatureAbilityRelease') {
    drawSignatureAbilityRelease(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'hitSpark') {
    if(drawCombatEffectArt(ctx,2,Math.min(3,Math.floor(t*4)),x,y,fx.heavy?56:38,Number(fx.angle||0),alpha))return;
    drawHitSparkEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'oathkeeperOathStrike' || fx.kind === 'templarHeavyCut') {
    drawOathkeeperOathStrikeEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'oathkeeperBastionBash' || fx.kind === 'templarCleavingStep') {
    drawOathkeeperBastionBashEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'oathkeeperJudgmentSmite' || fx.kind === 'radiantSmite') {
    drawRadiantSmiteEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'oathkeeperDivineLeap') {
    drawOathkeeperDivineLeapEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'oathkeeperConsecratedGround') {
    drawOathkeeperConsecratedGroundEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'oathkeeperBulwark' || fx.kind === 'oathkeeperLastRite' || fx.kind === 'oathkeeperHeavenbreaker') {
    drawOathkeeperHolyNovaEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'quickShot') {
    drawMercenaryShotEffect(ctx, fx, camera, alpha, t, false);
    return;
  }

  if (fx.kind === 'markedArrow') {
    drawMercenaryShotEffect(ctx, fx, camera, alpha, t, true);
    return;
  }

  if (fx.kind === 'arrowVolley') {
    drawArrowVolleyEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'fellhunterDaggers') {
    drawFellhunterShotEffect(ctx, fx, camera, alpha, t, false);
    return;
  }

  if (fx.kind === 'fellhunterMarkedShot') {
    drawFellhunterShotEffect(ctx, fx, camera, alpha, t, true);
    return;
  }

  if (fx.kind === 'fellhunterFlamingArrowVolley') {
    drawFellhunterFlamingArrowVolleyEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if ([
    'fellhunterPracticalStrike',
    'fellhunterBearTrap',
    'fellhunterTrapSnap',
    'fellhunterCaltrops',
    'fellhunterCaltropsStep',
    'fellhunterBombFuse',
    'fellhunterExplosion',
    'fellhunterGrapple',
    'fellhunterSmokeBomb',
    'fellhunterKillZone',
    'fellhunterKillZoneBlast'
  ].includes(fx.kind)) {
    drawFellhunterGadgetEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'bloodLance') {
    drawBloodLanceEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if ([
    'waterTorrent',
    'bubbleWard',
    'mendingCurrent',
    'tidalCut',
    'riptideStep',
    'drowningPressure',
    'wellspring',
    'delugeCrown'
  ].includes(fx.kind)) {
    drawHydromancerWaterEffect(ctx, x, y, fx, camera, alpha, t);
    return;
  }

  if ([
    'gleamMuzzle',
    'gleamTrail',
    'gleamImpact',
    'lumenGain',
    'haloBrandCast',
    'haloBrand',
    'rayOfRebuke',
    'prismGuard',
    'dawncarverStart',
    'dawncarverBeam',
    'dawncarverEnd',
    'solarVerdict',
    'haloAegis',
    'firstSunrise'
  ].includes(fx.kind)) {
    drawLightbringerEffect(ctx, x, y, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'eldritchBlink') {
    drawEldritchBlinkEffect(ctx, fx, camera, alpha, t);
    return;
  }

  if (fx.kind === 'eldritchBurst') {
    drawEldritchBurstEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'eldritchRift') {
    drawEldritchRiftEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'wildBloom') {
    drawWildBloomEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'forageSweep') {
    drawForageSweepEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'miningStrike') {
    drawMiningStrikeEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'woodcuttingChop') {
    drawWoodcuttingChopEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'fishingCast' || fx.kind === 'fishingSplash') {
    drawFishingSkillEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  if (fx.kind === 'runecraftGather') {
    drawRunecraftGatherEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  drawGenericEffect(ctx, x, y, fx, alpha);
}

// -----------------------------------------------------------------------------
// LIGHTBRINGER EFFECTS
// -----------------------------------------------------------------------------

function drawLightbringerEffect(ctx, x, y, fx, camera, alpha, t) {
  const color = fx.color || '#fff1b8';
  const gold = '#d9ad4f';

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (fx.kind === 'gleamTrail') {
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    line(ctx, x - (fx.dirX || 0) * 12, y - (fx.dirY || 0) * 12, x, y);
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = '#fff7d8';
    circle(ctx, x, y, Math.max(2, (fx.radius || 7) * (1 - t * 0.4)));
    ctx.restore();
    return;
  }

  if (fx.kind === 'gleamMuzzle' || fx.kind === 'gleamImpact' || fx.kind === 'lumenGain') {
    const radius = (fx.radius || 20) * (0.45 + t * 0.8);
    ctx.globalAlpha = alpha * 0.26;
    ctx.fillStyle = 'rgba(255,241,184,0.42)';
    circle(ctx, x, y, radius + 8);
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y, radius);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff7d8';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + t * 2.2;
      const sx = x + Math.cos(a) * radius * 0.28;
      const sy = y + Math.sin(a) * radius * 0.28;
      line(ctx, sx, sy, x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    ctx.restore();
    return;
  }

  if (fx.kind === 'haloBrandCast') {
    const tx = (fx.targetX ?? fx.x) - camera.x;
    const ty = (fx.targetY ?? fx.y) - camera.y;
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    line(ctx, x, y, tx, ty);
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = gold;
    circleStroke(ctx, tx, ty, 10 + t * 9);
    ctx.restore();
    return;
  }

  if (fx.kind === 'haloBrand') {
    const radius = (fx.radius || 24) * (0.8 + Math.sin(t * Math.PI) * 0.18);
    ctx.globalAlpha = alpha * 0.76;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.8, radius * 0.26, -0.12, Math.PI * 0.08, Math.PI * 1.72);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = gold;
    line(ctx, x - radius * 0.45, y + 2, x - radius * 0.12, y + radius * 0.34);
    line(ctx, x + radius * 0.2, y + radius * 0.28, x + radius * 0.52, y - 1);
    ctx.restore();
    return;
  }

  if (fx.kind === 'rayOfRebuke' || fx.kind === 'dawncarverBeam') {
    const dirX = fx.dirX || 0;
    const dirY = fx.dirY ?? 1;
    const ex = x + dirX * (fx.range || 200);
    const ey = y + dirY * (fx.range || 200);
    const sideX = -dirY;
    const sideY = dirX;
    const width = fx.kind === 'dawncarverBeam'
      ? Math.max(12, fx.width || 28)
      : Math.max(6, fx.width || 18);
    const pulse = fx.kind === 'dawncarverBeam' ? 1 : (0.72 + t * 0.5);

    ctx.globalAlpha = alpha * (fx.kind === 'dawncarverBeam' ? 0.18 : 0.12);
    ctx.strokeStyle = 'rgba(255,241,184,0.48)';
    ctx.lineWidth = width * 1.65 * pulse;
    line(ctx, x, y, ex, ey);
    ctx.globalAlpha = alpha * (fx.kind === 'dawncarverBeam' ? 0.55 : 0.8);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 0.55 * pulse;
    line(ctx, x, y, ex, ey);

    if (fx.kind === 'dawncarverBeam') {
      const railOffset = width * 0.34;
      ctx.globalAlpha = alpha * 0.38;
      ctx.strokeStyle = 'rgba(255,247,216,0.72)';
      ctx.lineWidth = Math.max(1.5, width * 0.08);
      line(ctx, x + sideX * railOffset, y + sideY * railOffset, ex + sideX * railOffset, ey + sideY * railOffset);
      line(ctx, x - sideX * railOffset, y - sideY * railOffset, ex - sideX * railOffset, ey - sideY * railOffset);
    }

    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, width * 0.14);
    line(ctx, x, y, ex, ey);

    if (fx.kind === 'dawncarverBeam') {
      for (let i = 1; i <= 3; i++) {
        const p = (i + t * 2) / 4;
        const bx = x + dirX * (fx.range || 200) * (p % 1);
        const by = y + dirY * (fx.range || 200) * (p % 1);
        ctx.globalAlpha = alpha * 0.36;
        circleStroke(ctx, bx, by, 5 + (fx.lumens || 1) * 2);
      }

      for (let i = 0; i < 4; i++) {
        const p = ((i + 0.5) / 4 + t * 1.4) % 1;
        const bx = x + dirX * (fx.range || 200) * p;
        const by = y + dirY * (fx.range || 200) * p;
        const slash = width * 0.24;
        ctx.globalAlpha = alpha * 0.24;
        ctx.strokeStyle = i % 2 ? '#ffffff' : '#d9ad4f';
        ctx.lineWidth = 1;
        line(ctx, bx - sideX * slash, by - sideY * slash, bx + sideX * slash, by + sideY * slash);
      }
    }
    ctx.restore();
    return;
  }

  if (fx.kind === 'prismGuard' || fx.kind === 'haloAegis' || fx.kind === 'firstSunrise' || fx.kind === 'solarVerdict' || fx.kind === 'dawncarverStart' || fx.kind === 'dawncarverEnd') {
    const radius = (fx.radius || 48) * (0.55 + t * 0.55);
    ctx.globalAlpha = alpha * (fx.kind === 'solarVerdict' ? 0.18 : 0.12);
    ctx.fillStyle = 'rgba(255,241,184,0.42)';
    circle(ctx, x, y, radius);
    ctx.globalAlpha = alpha * 0.76;
    ctx.strokeStyle = color;
    ctx.lineWidth = fx.kind === 'firstSunrise' ? 4 : 2.5;
    circleStroke(ctx, x, y, radius);
    ctx.globalAlpha = alpha * 0.62;
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.4;
    const count = fx.kind === 'firstSunrise' ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + t * 1.7;
      const inner = radius * (fx.kind === 'solarVerdict' ? 0.35 : 0.72);
      line(
        ctx,
        x + Math.cos(a) * inner,
        y + Math.sin(a) * inner,
        x + Math.cos(a) * radius,
        y + Math.sin(a) * radius
      );
    }

    if (fx.kind === 'solarVerdict') {
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#fff7d8';
      ctx.lineWidth = 7;
      line(ctx, x, y - radius * 1.4, x, y + radius * 0.35);
    }
    ctx.restore();
    return;
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// NECROTIC EFFECTS
// -----------------------------------------------------------------------------

function drawNecroticCastEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 18) * (0.7 + t * 0.5);

  ctx.save();

  ctx.globalAlpha = alpha * 0.28;
  ctx.fillStyle = 'rgba(182,140,255,0.45)';
  circle(ctx, x, y, radius + 10);

  ctx.globalAlpha = alpha * 0.68;
  ctx.strokeStyle = '#b68cff';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, radius);

  ctx.strokeStyle = '#f0dcff';
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, Math.max(3, radius * 0.55));

  ctx.restore();
}

function drawNecroticTrailEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 8) * (1 - t * 0.35);

  ctx.save();

  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = 'rgba(182,140,255,0.35)';
  circle(ctx, x, y, radius + 7);

  ctx.globalAlpha = alpha * 0.62;
  ctx.fillStyle = '#7d36a4';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#d8bdff';
  circle(ctx, x - 1, y - 1, Math.max(2, radius * 0.35));

  ctx.restore();
}

function drawNecroticImpactEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 24) * (0.25 + t * 1.05);

  ctx.save();

  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = 'rgba(182,140,255,0.42)';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = '#b68cff';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = '#f0dcff';
  ctx.lineWidth = 1;

  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + t * 2;
    line(
      ctx,
      x + Math.cos(a) * radius * 0.25,
      y + Math.sin(a) * radius * 0.25,
      x + Math.cos(a) * radius,
      y + Math.sin(a) * radius
    );
  }

  ctx.restore();
}

function drawNecroticFadeEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 13) * (1 + t * 0.6);

  ctx.save();

  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#b68cff';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = '#d8bdff';
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, radius + 3);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// VINE EFFECTS
// -----------------------------------------------------------------------------

function drawVineWhipEffect(ctx, fx, camera, alpha, t) {
  const sx = fx.x - camera.x;
  const sy = fx.y - camera.y;
  const ex = fx.endX - camera.x;
  const ey = fx.endY - camera.y;

  const dirX = fx.dirX || 1;
  const dirY = fx.dirY || 0;
  const sideX = -dirY;
  const sideY = dirX;

  const pull = easeOutCubic(t);
  const currentEndX = sx + (ex - sx) * Math.min(1, pull * 1.15);
  const currentEndY = sy + (ey - sy) * Math.min(1, pull * 1.15);

  ctx.save();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const isHook = fx.kind === 'thornbinderBriarHook';
  const vineDark = '#2e572f';
  const vineMid = fx.color || '#5e9b4b';
  const thornTip = isHook ? '#a84a4a' : '#d8b86a';

  ctx.globalAlpha = alpha * 0.16;
  ctx.strokeStyle = 'rgba(94,155,75,0.30)';
  ctx.lineWidth = isHook ? 14 : 16;
  drawWavyLine(ctx, sx, sy, currentEndX, currentEndY, sideX, sideY, 13, 3);

  ctx.globalAlpha = alpha * 0.62;
  ctx.strokeStyle = vineDark;
  ctx.lineWidth = isHook ? 7 : 8;
  drawWavyLine(ctx, sx, sy, currentEndX, currentEndY, sideX, sideY, 10, 3);

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = vineMid;
  ctx.lineWidth = isHook ? 3 : 4;
  drawWavyLine(ctx, sx, sy, currentEndX, currentEndY, sideX, sideY, 7, 3);

  ctx.globalAlpha = alpha * 0.62;
  ctx.fillStyle = thornTip;

  for (let i = 1; i <= (isHook ? 4 : 5); i++) {
    const p = i / 6;
    const wobble = Math.sin(p * Math.PI * 2.3 + t * 2) * 8;

    const px = sx + (currentEndX - sx) * p + sideX * wobble;
    const py = sy + (currentEndY - sy) * p + sideY * wobble;

    leafDiamond(ctx, px, py, 5 - p * 1.4, dirX, dirY);
  }

  if (isHook) {
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = '#a84a4a';
    ctx.lineWidth = 2;
    circleStroke(ctx, currentEndX, currentEndY, 8 + 4 * Math.sin(t * Math.PI));
  }

  ctx.restore();
}

function drawWavyLine(ctx, sx, sy, ex, ey, sideX, sideY, wobble, waves) {
  ctx.beginPath();
  ctx.moveTo(sx, sy);

  const segments = 12;

  for (let i = 1; i <= segments; i++) {
    const p = i / segments;
    const wave = Math.sin(p * Math.PI * waves) * wobble * (1 - p * 0.35);

    const x = sx + (ex - sx) * p + sideX * wave;
    const y = sy + (ey - sy) * p + sideY * wave;

    ctx.lineTo(x, y);
  }

  ctx.stroke();
}

function drawVineSegmentEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 8) * (1 - t * 0.28);

  ctx.save();

  ctx.globalAlpha = alpha * 0.36;
  ctx.fillStyle = 'rgba(115,209,138,0.25)';
  circle(ctx, x, y, radius + 8);

  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = '#2e572f';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#73d18a';
  circle(ctx, x - 1, y - 1, Math.max(2, radius * 0.45));

  ctx.restore();
}

function drawVineImpactEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 18) * (0.35 + t * 0.85);

  ctx.save();

  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = 'rgba(115,209,138,0.38)';
  circle(ctx, x, y, radius + 8);

  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = '#73d18a';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#2e572f';
  ctx.lineWidth = 3;

  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const inner = radius * 0.25;
    const outer = radius * 0.85;

    line(
      ctx,
      x + Math.cos(a) * inner,
      y + Math.sin(a) * inner,
      x + Math.cos(a + 0.3) * outer,
      y + Math.sin(a + 0.3) * outer
    );
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// GENERIC EFFECTS
// -----------------------------------------------------------------------------

function drawBurstEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 20) * (0.4 + t * 0.8);
  const color = fx.color || '#ffcc66';
  const highlight = getEffectHighlightColor(color);

  ctx.save();

  ctx.globalAlpha = alpha * 0.18;
  ctx.fillStyle = color;
  diamond(ctx, x, y, radius * 0.72);

  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2 + t * 0.7;
    line(
      ctx,
      x + Math.cos(angle) * radius * 0.28,
      y + Math.sin(angle) * radius * 0.28,
      x + Math.cos(angle) * (radius + 4),
      y + Math.sin(angle) * (radius + 4)
    );
  }

  ctx.globalAlpha = alpha;
  ctx.fillStyle = highlight;
  diamond(ctx, x, y, Math.max(2, radius * 0.22));

  ctx.restore();
}

function drawEnemyContactImpact(ctx,x,y,fx,alpha,t){
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;ctx.fillStyle=fx.color;ctx.strokeStyle=fx.color;
 const angle=Math.atan2(fx.dirY??0,fx.dirX??1),r=fx.radius||12,count=fx.dot?3:fx.heavy?9:5;
 for(let i=0;i<count;i++){
  const a=angle+(i-count/2)*.65,d=r*(.2+t)*(i%2?.85:1.2),px=Math.round(x+Math.cos(a)*d),py=Math.round(y+Math.sin(a)*d-t*(fx.material==='fire'?14:4));
  ctx.fillRect(px-1,py-1,fx.heavy?4:3,2);
  if(['ice','water'].includes(fx.material)){ctx.fillRect(px,py-4,2,8);ctx.fillRect(px-3,py,7,2);}
  else if(['holy','radiant'].includes(fx.material)){ctx.fillRect(px,py-3,2,6);}
  else if(fx.material==='lightning'){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py-8);ctx.lineTo(px-3,py-2);ctx.lineTo(px+3,py);ctx.lineTo(px,py+6);ctx.stroke();}
 }
 if(!fx.dot){ctx.fillStyle='#fff0d2';ctx.fillRect(Math.round(x)-2,Math.round(y)-2,4,4);}
 ctx.restore();
}

function drawBossTelegraphEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 80;
  const pulse = 1 + Math.sin(t * Math.PI) * 0.05;
  const shape = fx.geometry?.shape || fx.telegraphShape || 'circle';

  ctx.save();

  ctx.globalAlpha = alpha * 0.12;
  ctx.fillStyle = fx.color || '#ffcc66';
  circle(ctx, x, y, radius * pulse);

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = fx.color || '#ffcc66';
  ctx.lineWidth = 4;
  circleStroke(ctx, x, y, radius * pulse);

  if (shape === 'cross') {
    ctx.globalAlpha = alpha * 0.62;
    ctx.lineWidth = Math.max(8, radius * 0.13);
    line(ctx, x - radius, y, x + radius, y);
    line(ctx, x, y - radius, x, y + radius);
  } else if (shape === 'sigil') {
    ctx.globalAlpha = alpha * 0.62;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2 + t * 0.35;
      line(ctx, x + Math.cos(angle) * radius * 0.2, y + Math.sin(angle) * radius * 0.2, x + Math.cos(angle + 0.3) * radius * 0.76, y + Math.sin(angle + 0.3) * radius * 0.76);
    }
  } else {
    ctx.globalAlpha = alpha * 0.55;
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y, radius * 0.62 * pulse);
  }

  ctx.restore();
}

function drawEnemyTelegraphEffect(ctx, x, y, fx, camera, alpha, t) {
  const color = fx.color || '#ff9f66';
  const radius = fx.radius || 42;
  const pulse = 1 + Math.sin(t * Math.PI) * 0.08;
  const shape = fx.telegraphShape || 'circle';

  ctx.save();

  if (shape === 'line' || shape === 'cone') {
    const tx = fx.targetX - camera.x;
    const ty = fx.targetY - camera.y;

    ctx.lineCap = 'round';
    ctx.globalAlpha = alpha * 0.18;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(12, radius * 0.26);
    line(ctx, x, y, tx, ty);

    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    line(ctx, x, y, tx, ty);

    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = color;
    circle(ctx, tx, ty, Math.max(8, radius * 0.22));
    if (shape === 'cone') {
      const angle = Math.atan2(ty - y, tx - x);
      ctx.globalAlpha = alpha * 0.16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, angle - 0.48, angle + 0.48);
      ctx.closePath();
      ctx.fill();
    }
  } else if (shape === 'arc') {
    const tx = fx.targetX - camera.x;
    const ty = fx.targetY - camera.y;
    const angle = Math.atan2(ty - y, tx - x);
    ctx.globalAlpha = alpha * 0.16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, angle - 1.05, angle + 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * 0.84;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, angle - 1.05, angle + 1.05);
    ctx.stroke();
  } else if (shape === 'sigil') {
    ctx.globalAlpha = alpha * 0.14;
    ctx.fillStyle = color;
    circle(ctx, x, y, radius * pulse);
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    circleStroke(ctx, x, y, radius * pulse);
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 + t * 0.6;
      line(ctx, x + Math.cos(angle) * radius * 0.25, y + Math.sin(angle) * radius * 0.25, x + Math.cos(angle + 0.35) * radius * 0.82, y + Math.sin(angle + 0.35) * radius * 0.82);
    }
  } else {
    ctx.globalAlpha = alpha * 0.12;
    ctx.fillStyle = color;
    circle(ctx, x, y, radius * pulse);

    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    circleStroke(ctx, x, y, radius * pulse);

    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = 1;
    circleStroke(ctx, x, y, radius * 0.62 * pulse);
  }

  ctx.restore();
}

function drawEnemyTellReleaseEffect(ctx, x, y, fx, camera, alpha, t) {
  const color = fx.color || '#ff9f66';
  const radius = Number(fx.radius || 42) * (0.45 + easeOutCubic(t) * 0.72);
  const sourceX = Number(fx.sourceX ?? fx.x) - camera.x;
  const sourceY = Number(fx.sourceY ?? fx.y) - camera.y;
  const shape = fx.geometry?.shape || fx.telegraphShape || 'circle';

  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = color;
  circle(ctx, x, y, radius * 0.66);
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = shape === 'circle' ? 5 : 3;

  if (shape === 'line') {
    line(ctx, sourceX, sourceY, x, y);
    ctx.fillStyle = color;
    diamond(ctx, x, y, 5);
  } else if (shape === 'arc'||shape==='cone') {
    const angle = fx.geometry?.angle??Math.atan2(y - sourceY, x - sourceX);
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, radius, angle - 1, angle + 1);
    ctx.stroke();
  } else {
    circleStroke(ctx, x, y, radius);
  }

  ctx.restore();
}

function drawProjectileDissipateEffect(ctx, x, y, fx, alpha, t) {
  const profile = getProjectileVisualProfile({ visualProfile: fx.visualProfile });
  const radius = Number(fx.radius || 14) * (0.45 + easeOutCubic(t) * 0.7);

  ctx.save();
  ctx.strokeStyle = fx.color || profile.color;
  ctx.fillStyle = profile.light;
  ctx.globalAlpha = alpha * 0.75;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const angle = i / 4 * Math.PI * 2 + t * 0.6;
    line(ctx, x + Math.cos(angle) * radius * 0.25, y + Math.sin(angle) * radius * 0.25, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    diamond(ctx, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 2);
  }
  ctx.restore();
}

function drawCombatStateFeedbackEffect(ctx, x, y, fx, alpha, t) {
  const radius = Number(fx.radius || 24) * (0.75 + easeOutCubic(t) * 0.35);
  const color = fx.color || '#ffcc66';

  ctx.save();
  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = fx.stateKind === 'resistant' ? 3 : 2;

  if (fx.stateKind === 'resistant') {
    circleStroke(ctx, x, y, radius);
    line(ctx, x - radius * 0.7, y - radius * 0.35, x - radius * 0.2, y - radius * 0.75);
    line(ctx, x + radius * 0.2, y - radius * 0.75, x + radius * 0.7, y - radius * 0.35);
  } else {
    for (let i = 0; i < 5; i++) {
      const angle = i / 5 * Math.PI * 2 - Math.PI / 2;
      const outer = radius * (0.9 + (i % 2) * 0.25);
      line(ctx, x, y, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    }
    diamond(ctx, x, y, 4);
  }
  ctx.restore();
}

function drawEliteMarkerEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 32;
  const color = fx.color || '#d8bdff';
  const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.08;

  ctx.save();

  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = color;
  circle(ctx, x, y, radius * pulse);

  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, radius * pulse);

  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, radius * 0.68 * pulse);

  ctx.restore();
}

function drawEnemyProjectileEffect(ctx, fx, camera, alpha, t) {
  const profile = getProjectileVisualProfile({ visualProfile: fx.visualProfile });
  const sx = fx.x - camera.x;
  const sy = fx.y - camera.y;
  const ex = fx.targetX - camera.x;
  const ey = fx.targetY - camera.y;
  const color = fx.color || profile.color;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const progress = easeOutCubic(t);
  const headX = sx + dx * progress;
  const headY = sy + dy * progress;
  const tailX = headX - nx * Math.min(42, len * 0.25);
  const tailY = headY - ny * Math.min(42, len * 0.25);

  ctx.save();

  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = fx.projectileKind === 'curseBolt' ? 10 : 6;
  line(ctx, tailX, tailY, headX, headY);

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = profile.light;
  ctx.lineWidth = fx.projectileKind === 'curseBolt' ? 3 : 2;
  line(ctx, tailX, tailY, headX, headY);

  ctx.fillStyle = profile.light;
  ctx.globalAlpha = alpha;
  if (profile.shape === 'arrow') {
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(angle);
    triangle(ctx, 6, 0, -4, -3, -4, 3);
    ctx.restore();
  } else {
    diamond(ctx, headX, headY, fx.projectileKind === 'curseBolt' ? 5 : 3);
  }

  ctx.restore();
}

function drawEnemyPulseEffect(ctx, x, y, fx, alpha, t) {
  const color = fx.color || '#b68cff';
  const radius = fx.radius || 48;
  const eased = easeOutCubic(t);

  ctx.save();

  ctx.globalAlpha = alpha * 0.14;
  ctx.fillStyle = color;
  circle(ctx, x, y, radius * eased);

  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = color;
  ctx.lineWidth = fx.kind === 'healPulse' ? 3 : 2;
  circleStroke(ctx, x, y, Math.max(6, radius * eased));

  if (fx.kind === 'healPulse') {
    ctx.globalAlpha = alpha * 0.55;
    ctx.lineWidth = 2;
    line(ctx, x - 8, y, x + 8, y);
    line(ctx, x, y - 8, x, y + 8);
  }

  if (fx.kind === 'summonPulse') {
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2 + t * 1.5;
      const inner = radius * eased * 0.58;
      const outer = radius * eased * 0.84;
      line(
        ctx,
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer
      );
    }
  }

  if (fx.kind === 'cursedGround') {
    ctx.globalAlpha = alpha * 0.42;
    ctx.strokeStyle = '#e2ccff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 + t * 0.8;
      const inner = radius * eased * 0.24;
      const outer = radius * eased * 0.72;
      line(ctx, x + Math.cos(angle) * inner, y + Math.sin(angle) * inner, x + Math.cos(angle + 0.45) * outer, y + Math.sin(angle + 0.45) * outer);
    }
  }

  ctx.restore();
}

function drawThornbinderBramblePatchEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 62;
  const grow = Math.min(1, t * 2.2);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = alpha * 0.08;
  ctx.fillStyle = '#5e9b4b';
  circle(ctx, x, y, radius * grow);

  ctx.globalAlpha = alpha * 0.34;
  ctx.strokeStyle = '#3d2b18';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius * (0.72 + 0.08 * Math.sin(t * Math.PI)));

  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = '#5e9b4b';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const wobble = Math.sin(t * Math.PI + i) * 5;
    line(ctx, x + Math.cos(a) * radius * 0.18, y + Math.sin(a) * radius * 0.12, x + Math.cos(a + 0.35) * (radius * 0.82 + wobble), y + Math.sin(a + 0.35) * (radius * 0.58 + wobble * 0.4));
  }

  ctx.globalAlpha = alpha * 0.45;
  ctx.fillStyle = '#a84a4a';
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.4;
    leafDiamond(ctx, x + Math.cos(a) * radius * 0.52, y + Math.sin(a) * radius * 0.36, 3.2, Math.cos(a), Math.sin(a));
  }

  ctx.restore();
}

function drawThornbinderRosebiteBurstEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 54;
  const bloom = easeOutCubic(t);
  const heads = fx.elder ? 3 : 5;

  ctx.save();
  ctx.lineCap = 'round';

  ctx.globalAlpha = alpha * 0.1;
  ctx.fillStyle = '#5e9b4b';
  circle(ctx, x, y, radius * bloom);

  for (let i = 0; i < heads; i++) {
    const a = i / heads * Math.PI * 2 + 0.25;
    const px = x + Math.cos(a) * radius * 0.46 * bloom;
    const py = y + Math.sin(a) * radius * 0.32 * bloom;

    ctx.globalAlpha = alpha * 0.58;
    ctx.strokeStyle = '#3d2b18';
    ctx.lineWidth = 3;
    line(ctx, x, y, px, py);

    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#a84a4a';
    circle(ctx, px, py, 7 + Math.sin(t * Math.PI) * 4);

    ctx.globalAlpha = alpha * 0.64;
    ctx.strokeStyle = '#d8b86a';
    ctx.lineWidth = 1.5;
    line(ctx, px - Math.cos(a) * 6, py - Math.sin(a) * 4, px + Math.cos(a) * 6, py + Math.sin(a) * 4);
  }

  ctx.restore();
}

function drawThornbinderRootPrisonEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 66;
  const rise = Math.sin(t * Math.PI);

  ctx.save();
  ctx.lineCap = 'round';

  ctx.globalAlpha = alpha * 0.12;
  ctx.fillStyle = '#3d2b18';
  circle(ctx, x, y, radius * (0.55 + t * 0.18));

  ctx.globalAlpha = alpha * 0.62;
  ctx.strokeStyle = '#5e9b4b';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const inner = radius * 0.34;
    const outer = radius * 0.84;
    line(ctx, x + Math.cos(a) * inner, y + Math.sin(a) * inner * 0.68, x + Math.cos(a + 0.12) * outer, y + Math.sin(a + 0.12) * outer * 0.62 - rise * 12);
  }

  ctx.globalAlpha = alpha * 0.45;
  ctx.strokeStyle = '#8c6d3d';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, radius * 0.72);

  ctx.restore();
}

function drawThornbinderBriarBloomEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 170;
  const pulse = 0.35 + easeOutCubic(t) * 0.65;

  ctx.save();

  ctx.globalAlpha = alpha * (fx.active ? 0.1 : 0.06);
  ctx.fillStyle = '#d8b86a';
  circle(ctx, x, y, radius * pulse);

  ctx.globalAlpha = alpha * (fx.active ? 0.32 : 0.22);
  ctx.strokeStyle = '#d8b86a';
  ctx.lineWidth = fx.active ? 2 : 1.5;
  circleStroke(ctx, x, y, radius * pulse);

  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#7e9d58';
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + t * 0.8;
    const px = x + Math.cos(a) * radius * pulse * 0.36;
    const py = y + Math.sin(a) * radius * pulse * 0.24;
    leafDiamond(ctx, px, py, 3.4, Math.cos(a), Math.sin(a));
  }

  ctx.restore();
}

function drawThornbinderVerdantWoundEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 16;
  const pulse = Math.sin(t * Math.PI);

  ctx.save();
  ctx.globalAlpha = alpha * (fx.tick ? 0.28 : 0.42);
  ctx.strokeStyle = fx.tick ? '#8c6d3d' : '#5e9b4b';
  ctx.lineWidth = fx.tick ? 1.5 : 2;
  circleStroke(ctx, x, y + 8, radius * (0.55 + t * 0.35));

  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#a84a4a';
  for (let i = 0; i < Math.min(4, fx.stacks || 2); i++) {
    const a = i / 4 * Math.PI * 2;
    leafDiamond(ctx, x + Math.cos(a) * radius * 0.45, y + 8 + Math.sin(a) * radius * 0.22 - pulse * 2, 2.5, Math.cos(a), Math.sin(a));
  }

  ctx.restore();
}

function drawSlashEffect(ctx, x, y, fx, alpha, t) {
  const dirX = fx.dirX || 1;
  const dirY = fx.dirY || 0;

  const sideX = -dirY;
  const sideY = dirX;

  ctx.save();

  const color = fx.color || '#e8edf5';
  const highlight = getEffectHighlightColor(color);
  const width = fx.kind === 'heavySlash' ? 7 : 4;
  const reach = 16 + t * 6;

  ctx.globalAlpha = alpha * 0.26;
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = width + 5;
  ctx.lineCap = 'round';

  line(
    ctx,
    x - sideX * reach - dirX * 6,
    y - sideY * reach - dirY * 6,
    x + sideX * reach + dirX * 6,
    y + sideY * reach + dirY * 6
  );

  ctx.globalAlpha = alpha * 0.88;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  line(
    ctx,
    x - sideX * reach - dirX * 6,
    y - sideY * reach - dirY * 6,
    x + sideX * reach + dirX * 6,
    y + sideY * reach + dirY * 6
  );

  ctx.globalAlpha = alpha * 0.78;
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 1;
  line(
    ctx,
    x - sideX * (reach - 4) - dirX * 5,
    y - sideY * (reach - 4) - dirY * 5,
    x + sideX * (reach - 4) + dirX * 5,
    y + sideY * (reach - 4) + dirY * 5
  );

  ctx.restore();
}

function drawWeaponWindupEffect(ctx, x, y, fx, alpha, t) {
  const dirX = fx.dirX || 1;
  const dirY = fx.dirY || 0;
  const angle = Math.atan2(dirY, dirX);
  const radius = (fx.radius || 28) * (0.86 + t * 0.14);

  ctx.save();
  ctx.globalAlpha = alpha * (0.18 + t * 0.24);
  ctx.strokeStyle = fx.color || '#ffcc66';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, angle - Math.PI * 0.95, angle - Math.PI * 0.35);
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.22;
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, radius - 3, angle - Math.PI * 0.95, angle - Math.PI * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawChargedReleaseEffect(ctx, x, y, fx, alpha, t) {
  const radius = Number(fx.radius || 30) * (0.45 + easeOutCubic(t) * 0.75);
  const dirX = Number(fx.dirX || 0);
  const dirY = Number(fx.dirY ?? 1);

  ctx.save();
  ctx.lineCap = 'round';

  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = fx.color || '#ffcc66';
  circle(ctx, x, y, radius * 0.62);

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = fx.color || '#ffcc66';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.78;
  ctx.strokeStyle = getEffectHighlightColor(fx.color || '#ffcc66');
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    const sideX = -dirY;
    const sideY = dirX;
    line(
      ctx,
      x + sideX * i * 6 - dirX * radius * 0.15,
      y + sideY * i * 6 - dirY * radius * 0.15,
      x + sideX * i * 9 + dirX * radius * 0.72,
      y + sideY * i * 9 + dirY * radius * 0.72
    );
  }

  ctx.restore();
}

function drawSignatureAbilityRelease(ctx, x, y, fx, alpha, t) {
  if(drawSkillReleaseArt(ctx,fx.effectKind||'',x,y,Number(fx.radius||30),t,alpha))return;
  const colors = Array.isArray(fx.colors) ? fx.colors : ['#ffffff', '#ffcc66', '#101217'];
  const light = colors[0];
  const base = colors[1] || light;
  const dark = colors[2] || '#08090c';
  const radius = Number(fx.radius || 30) * (0.45 + easeOutCubic(t) * 0.78);
  const dirX = Number(fx.dirX || 0);
  const dirY = Number(fx.dirY ?? 1);
  const sideX = -dirY;
  const sideY = dirX;
  const effectKind = fx.effectKind || '';

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = dark;
  circle(ctx, x, y, radius * 0.72);

  if (effectKind === 'holySlashRelease') {
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = base;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, radius, Math.atan2(dirY, dirX) - 1.15, Math.atan2(dirY, dirX) + 0.7);
    ctx.stroke();
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, Math.atan2(dirY, dirX) - 1.05, Math.atan2(dirY, dirX) + 0.62);
    ctx.stroke();
  } else if (effectKind === 'holyGuardRelease') {
    ctx.globalAlpha = alpha * 0.86;
    ctx.strokeStyle = base;
    ctx.lineWidth = 4;
    circleStroke(ctx, x, y, radius);
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    line(ctx, x - radius * 0.55, y, x + radius * 0.55, y);
    line(ctx, x, y - radius * 0.55, x, y + radius * 0.55);
  } else if (effectKind === 'mercenaryShotRelease' || effectKind === 'mercenaryExecuteRelease') {
    const length = radius * (effectKind === 'mercenaryExecuteRelease' ? 1.7 : 1.25);
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = dark;
    ctx.lineWidth = effectKind === 'mercenaryExecuteRelease' ? 9 : 6;
    line(ctx, x - dirX * 8, y - dirY * 8, x + dirX * length, y + dirY * length);
    ctx.globalAlpha = alpha * 0.94;
    ctx.strokeStyle = base;
    ctx.lineWidth = effectKind === 'mercenaryExecuteRelease' ? 4 : 2;
    line(ctx, x, y, x + dirX * length, y + dirY * length);
    ctx.fillStyle = light;
    diamond(ctx, x + dirX * length, y + dirY * length, effectKind === 'mercenaryExecuteRelease' ? 5 : 3);
  } else if (effectKind === 'necromancerCurseRelease') {
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = base;
    ctx.lineWidth = 3;
    circleStroke(ctx, x, y, radius);
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 - t * 0.8;
      line(ctx, x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35, x + Math.cos(angle + 0.38) * radius, y + Math.sin(angle + 0.38) * radius);
    }
  } else if (effectKind === 'necromancerRitualRelease') {
    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = base;
    ctx.lineWidth = 3;
    circleStroke(ctx, x, y + 12, radius);
    for (let i = -2; i <= 2; i++) {
      const px = x + i * radius * 0.3;
      line(ctx, px, y + 12, px + sideX * 4, y + 12 - radius * (0.55 + Math.abs(i) * 0.1));
    }
  } else if (effectKind === 'thornbinderRootRelease' || effectKind === 'thornbinderPatchRelease') {
    ctx.globalAlpha = alpha * 0.86;
    ctx.strokeStyle = base;
    ctx.lineWidth = 3;
    const count = effectKind === 'thornbinderPatchRelease' ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const angle = effectKind === 'thornbinderPatchRelease'
        ? i / count * Math.PI * 2
        : Math.atan2(dirY, dirX) - 0.8 + i * 0.32;
      const outer = radius * (0.72 + (i % 2) * 0.25);
      line(ctx, x, y, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      ctx.fillStyle = light;
      triangle(ctx, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer, x + Math.cos(angle - 0.24) * outer * 0.78, y + Math.sin(angle - 0.24) * outer * 0.78, x + Math.cos(angle + 0.24) * outer * 0.78, y + Math.sin(angle + 0.24) * outer * 0.78);
    }
  } else if (
    effectKind === 'hydromancerTorrentRelease' ||
    effectKind === 'hydromancerWardRelease' ||
    effectKind === 'hydromancerMendingRelease' ||
    effectKind === 'hydromancerTidalCutRelease' ||
    effectKind === 'hydromancerDelugeRelease'
  ) {
    const rings = effectKind === 'hydromancerDelugeRelease' ? 3 : 2;
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = base;
    for (let i = 0; i < rings; i++) {
      ctx.lineWidth = Math.max(1, 4 - i);
      circleStroke(ctx, x, y, radius * (0.55 + i * 0.24));
    }
    if (effectKind === 'hydromancerTorrentRelease' || effectKind === 'hydromancerTidalCutRelease') {
      ctx.strokeStyle = light;
      ctx.lineWidth = effectKind === 'hydromancerTidalCutRelease' ? 5 : 3;
      ctx.beginPath();
      ctx.arc(x, y, radius, Math.atan2(dirY, dirX) - 0.9, Math.atan2(dirY, dirX) + 0.9);
      ctx.stroke();
    }
    if (effectKind === 'hydromancerDelugeRelease') {
      ctx.fillStyle = light;
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * Math.PI * 2 - Math.PI / 2;
        diamond(ctx, x + Math.cos(angle) * radius * 0.8, y + Math.sin(angle) * radius * 0.8, 3);
      }
    }
  } else if (effectKind === 'eldritchMarkRelease') {
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = base;
    ctx.lineWidth = 3;
    diamondStroke(ctx, x + dirX * radius * 0.35, y + dirY * radius * 0.35, radius * 0.65);
    line(ctx, x - sideX * radius * 0.4, y - sideY * radius * 0.4, x + sideX * radius * 0.4, y + sideY * radius * 0.4);
  } else if (effectKind === 'eldritchBurstRelease') {
    ctx.globalAlpha = alpha * 0.32;
    ctx.fillStyle = dark;
    circle(ctx, x, y, radius);
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = base;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 + t * 0.45;
      line(ctx, x + Math.cos(angle) * radius * 0.18, y + Math.sin(angle) * radius * 0.18, x + Math.cos(angle + 0.22) * radius, y + Math.sin(angle + 0.22) * radius);
    }
  }

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = light;
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y, radius * 0.82);
  ctx.restore();
}

function drawHydromancerWaterEffect(ctx, x, y, fx, camera, alpha, t) {
  const base = fx.color || '#59d7e8';
  const light = '#d7fbfa';
  const dark = '#102d3b';
  const radius = Math.max(16, Number(fx.radius || fx.width || 42));
  const reveal = easeOutCubic(t);
  const pulse = 0.72 + Math.sin(t * Math.PI) * 0.28;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (fx.kind === 'waterTorrent') {
    const dirX = Number(fx.dirX || 0);
    const dirY = Number(fx.dirY ?? 1);
    const sideX = -dirY;
    const sideY = dirX;
    const reach = Number(fx.range || 180) * reveal;
    for (let i = -1; i <= 1; i++) {
      ctx.globalAlpha = alpha * (i === 0 ? 0.9 : 0.48);
      ctx.strokeStyle = i === 0 ? light : base;
      ctx.lineWidth = i === 0 ? 4 : 3;
      const side = i * radius * 0.32;
      line(ctx, x + sideX * side, y + sideY * side, x + dirX * reach + sideX * side * 1.5, y + dirY * reach + sideY * side * 1.5);
    }
  } else if (fx.kind === 'riptideStep') {
    const endX = Number(fx.targetX ?? fx.x) - camera.x;
    const endY = Number(fx.targetY ?? fx.y) - camera.y;
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = base;
    ctx.lineWidth = 8;
    line(ctx, x, y, x + (endX - x) * reveal, y + (endY - y) * reveal);
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    line(ctx, x, y, x + (endX - x) * reveal, y + (endY - y) * reveal);
  } else if (fx.kind === 'tidalCut') {
    const dirX = Number(fx.dirX || 0);
    const dirY = Number(fx.dirY ?? 1);
    const angle = Math.atan2(dirY, dirX);
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = base;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, radius * pulse, angle - 1.15, angle + 0.82);
    ctx.stroke();
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * pulse - 4, angle - 1.05, angle + 0.72);
    ctx.stroke();
  } else {
    const ringCount = fx.kind === 'delugeCrown' ? 4 : fx.kind === 'drowningPressure' ? 3 : 2;
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = dark;
    circle(ctx, x, y, radius * (0.58 + reveal * 0.35));
    for (let i = 0; i < ringCount; i++) {
      ctx.globalAlpha = alpha * (0.84 - i * 0.13);
      ctx.strokeStyle = i === 0 ? light : base;
      ctx.lineWidth = Math.max(1, 4 - i);
      circleStroke(ctx, x, y, radius * reveal * (0.45 + i * 0.2));
    }
    if (fx.kind === 'delugeCrown') {
      ctx.fillStyle = light;
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2 - Math.PI / 2;
        diamond(ctx, x + Math.cos(angle) * radius * 0.82, y + Math.sin(angle) * radius * 0.82, 3);
      }
    }
  }

  ctx.restore();
}

function drawHitSparkEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 10) * (1 + t * 0.4);
  const color = fx.color || '#ffffff';
  const highlight = getEffectHighlightColor(color);

  ctx.save();

  ctx.globalAlpha = alpha * 0.20;
  ctx.fillStyle = color;
  diamond(ctx, x, y, radius * 0.72);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2 + t;
    line(
      ctx,
      x + Math.cos(angle) * radius * 0.35,
      y + Math.sin(angle) * radius * 0.35,
      x + Math.cos(angle) * (radius + 5),
      y + Math.sin(angle) * (radius + 5)
    );
  }

  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = highlight;
  diamond(ctx, x, y, Math.max(2, radius * 0.24));

  ctx.restore();
}

function drawRadiantSmiteEffect(ctx, x, y, fx, alpha, t) {
  if (fx.radius) {
    drawOathkeeperHolyNovaEffect(ctx, x, y, fx, alpha, t);
    return;
  }

  const dirX = fx.dirX || 0;
  const dirY = fx.dirY ?? 1;
  const sideX = -dirY;
  const sideY = dirX;
  const reach = (fx.range || 68) * easeOutCubic(t);
  const width = (fx.width || 58) * (0.55 + t * 0.45);

  ctx.save();

  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = '#ffcc66';
  ctx.beginPath();
  ctx.moveTo(x + dirX * 16, y + dirY * 16);
  ctx.lineTo(x + dirX * reach + sideX * width, y + dirY * reach + sideY * width);
  ctx.lineTo(x + dirX * (reach + 18), y + dirY * (reach + 18));
  ctx.lineTo(x + dirX * reach - sideX * width, y + dirY * reach - sideY * width);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = '#fff0b8';
  ctx.lineWidth = 3;
  line(ctx, x + dirX * 14, y + dirY * 14, x + dirX * (reach + 16), y + dirY * (reach + 16));

  ctx.restore();
}

function drawOathkeeperOathStrikeEffect(ctx, x, y, fx, alpha, t) {
  const dirX = fx.dirX || 0;
  const dirY = fx.dirY ?? 1;
  const sideX = -dirY;
  const sideY = dirX;
  const reach = (fx.range || 52) * (0.2 + easeOutCubic(t) * 0.8);
  const arc = Math.sin(t * Math.PI);

  ctx.save();
  ctx.globalAlpha = alpha * 0.42;
  ctx.strokeStyle = '#ffcc66';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  line(ctx, x + sideX * 20 - dirX * 5, y + sideY * 20 - dirY * 5, x + dirX * reach - sideX * 18, y + dirY * reach - sideY * 18);

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = '#fff4c7';
  ctx.lineWidth = 3;
  line(ctx, x + sideX * 14, y + sideY * 14, x + dirX * (reach + 10) - sideX * 12 * arc, y + dirY * (reach + 10) - sideY * 12 * arc);
  ctx.restore();
}

function drawOathkeeperBastionBashEffect(ctx, x, y, fx, alpha, t) {
  const dirX = fx.dirX || 0;
  const dirY = fx.dirY ?? 1;
  const sideX = -dirY;
  const sideY = dirX;
  const reach = (fx.range || 64) * easeOutCubic(t);
  const width = (fx.width || 54) * (0.45 + t * 0.35);

  ctx.save();
  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = '#fff0b8';
  ctx.beginPath();
  ctx.moveTo(x - sideX * 10, y - sideY * 10);
  ctx.lineTo(x + dirX * reach + sideX * width, y + dirY * reach + sideY * width);
  ctx.lineTo(x + dirX * (reach + 24), y + dirY * (reach + 24));
  ctx.lineTo(x + dirX * reach - sideX * width, y + dirY * reach - sideY * width);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha * 0.88;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  line(ctx, x - dirX * 14, y - dirY * 14, x + dirX * (reach + 24), y + dirY * (reach + 24));
  ctx.strokeStyle = '#ffcc66';
  line(ctx, x + sideX * 10, y + sideY * 10, x + dirX * reach + sideX * width * 0.45, y + dirY * reach + sideY * width * 0.45);
  line(ctx, x - sideX * 10, y - sideY * 10, x + dirX * reach - sideX * width * 0.45, y + dirY * reach - sideY * width * 0.45);
  ctx.restore();
}

function drawOathkeeperDivineLeapEffect(ctx, fx, camera, alpha, t) {
  const x = fx.x - camera.x;
  const y = fx.y - camera.y;
  const targetX = (fx.targetX ?? fx.x) - camera.x;
  const targetY = (fx.targetY ?? fx.y) - camera.y;
  const lift = Math.sin(t * Math.PI) * 34;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * 0.34;
  ctx.strokeStyle = '#d5ad55';
  ctx.lineWidth = 9;
  line(ctx, x, y - 4, targetX, targetY - 4);

  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = '#fff1b8';
  ctx.lineWidth = 3;
  line(ctx, x, y - 10, x + (targetX - x) * t, y + (targetY - y) * t - lift);

  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = '#ffffff';
  circle(ctx, x + (targetX - x) * t, y + (targetY - y) * t - lift, 3 + t * 3);
  ctx.restore();
}

function drawOathkeeperConsecratedGroundEffect(ctx, x, y, fx, alpha, t) {
  const radius = fx.radius || 90;
  const pulse = 0.86 + Math.sin((fx.age || 0) * 7) * 0.04;

  ctx.save();
  ctx.globalAlpha = Math.min(0.38, alpha * 0.5);
  ctx.fillStyle = 'rgba(255, 236, 176, 0.18)';
  circle(ctx, x, y, radius * pulse);

  ctx.globalAlpha = Math.min(0.82, alpha * 0.95);
  ctx.strokeStyle = '#d5ad55';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius * pulse);

  ctx.globalAlpha = Math.min(0.55, alpha * 0.7);
  ctx.strokeStyle = '#fff1b8';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI * 0.25 + (fx.age || 0) * 0.18;
    const inner = radius * 0.34;
    const outer = radius * 0.82;
    line(ctx, x + Math.cos(angle) * inner, y + Math.sin(angle) * inner, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
  }
  ctx.restore();
}

function drawOathkeeperHolyNovaEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 72) * (0.34 + easeOutCubic(t) * 0.72);
  const color = fx.color || '#fff1b8';
  const heavy = fx.kind === 'oathkeeperHeavenbreaker';

  ctx.save();
  ctx.globalAlpha = alpha * (heavy ? 0.38 : 0.24);
  ctx.fillStyle = heavy ? 'rgba(255, 241, 184, 0.24)' : 'rgba(255, 204, 102, 0.18)';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = color;
  ctx.lineWidth = heavy ? 5 : 3;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = heavy ? 3 : 2;
  circleStroke(ctx, x, y, Math.max(8, radius * 0.58));

  if (heavy) {
    ctx.globalAlpha = alpha * 0.62;
    ctx.strokeStyle = '#d5ad55';
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI * 0.2;
      line(ctx, x, y, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
  }

  if (fx.kind === 'oathkeeperBulwark') {
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = '#fff1b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y - 8, radius * 0.55, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMercenaryShotEffect(ctx, fx, camera, alpha, t, marked) {
  const sx = fx.x - camera.x;
  const sy = fx.y - camera.y;
  const tx = (fx.targetX ?? fx.x) - camera.x;
  const ty = (fx.targetY ?? fx.y) - camera.y;
  const progress = easeOutCubic(t);
  const x = sx + (tx - sx) * progress;
  const y = sy + (ty - sy) * progress;
  const angle = Math.atan2(ty - sy, tx - sx);

  ctx.save();
  ctx.globalAlpha = alpha * 0.36;
  ctx.strokeStyle = marked ? '#ffcc66' : '#d9ad4f';
  ctx.lineWidth = marked ? 7 : 5;
  ctx.lineCap = 'round';
  line(ctx, sx, sy, x, y);

  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = marked ? '#fff0b8' : '#f2e0a2';
  ctx.lineWidth = marked ? 3 : 2;
  line(ctx, -24, 0, 7, 0);
  ctx.fillStyle = marked ? '#ff4b3e' : '#e8edf5';
  triangle(ctx, 10, 0, 2, -5, 2, 5);

  if (marked) {
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = '#ffcc66';
    ctx.lineWidth = 1;
    circleStroke(ctx, 0, 0, 13 + t * 8);
  }

  ctx.restore();
}

function drawArrowVolleyEffect(ctx, x, y, fx, alpha, t) {
  const baseAngle = Math.atan2(fx.dirY || 0, fx.dirX || 1);
  const range = (fx.range || 220) * (0.25 + easeOutCubic(t) * 0.75);
  const arrows = 5;

  ctx.save();
  ctx.globalAlpha = alpha * 0.85;

  for (let i = 0; i < arrows; i++) {
    const spread = (i - (arrows - 1) / 2) * 0.16;
    const angle = baseAngle + spread;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const endX = x + dirX * range;
    const endY = y + dirY * range;

    ctx.strokeStyle = i === 2 ? '#ffcc66' : '#d9ad4f';
    ctx.lineWidth = i === 2 ? 3 : 2;
    line(ctx, endX - dirX * 28, endY - dirY * 28, endX, endY);
    ctx.fillStyle = '#e8edf5';
    triangle(ctx, endX + dirX * 7, endY + dirY * 7, endX - dirY * 4, endY + dirX * 4, endX + dirY * 4, endY - dirX * 4);
  }

  ctx.restore();
}

function drawFellhunterShotEffect(ctx, fx, camera, alpha, t, marked) {
  const sx = fx.x - camera.x;
  const sy = fx.y - camera.y;
  const tx = (fx.targetX ?? fx.x) - camera.x;
  const ty = (fx.targetY ?? fx.y) - camera.y;
  const progress = easeOutCubic(t);
  const count = Math.max(1, Math.floor(fx.count || 1));
  const angle = Math.atan2(ty - sy, tx - sx);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 8;
    const wobble = Math.sin((t + i) * Math.PI) * 2;
    const x = sx + (tx - sx) * progress + perpX * (offset + wobble);
    const y = sy + (ty - sy) * progress + perpY * (offset + wobble);

    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = marked ? '#ff9a4d' : '#6f7985';
    ctx.lineWidth = marked ? 5 : 3;
    line(ctx, sx + perpX * offset, sy + perpY * offset, x, y);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#d6dde5';
    ctx.lineWidth = marked ? 3 : 2;
    line(ctx, -18, 0, 8, 0);
    ctx.fillStyle = marked ? '#ff7045' : '#c6ccd4';
    triangle(ctx, 10, 0, 1, -4, 1, 4);
    ctx.restore();
  }

  if (marked) {
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = '#ffb36c';
    ctx.lineWidth = 1.5;
    circleStroke(ctx, tx, ty, 12 + t * 8);
    line(ctx, tx - 16, ty, tx - 6, ty);
    line(ctx, tx + 6, ty, tx + 16, ty);
    line(ctx, tx, ty - 16, tx, ty - 6);
    line(ctx, tx, ty + 6, tx, ty + 16);
  }

  ctx.restore();
}

function drawFellhunterFlamingArrowVolleyEffect(ctx, x, y, fx, alpha, t) {
  const baseAngle = Math.atan2(fx.dirY || 0, fx.dirX || 1);
  const range = (fx.range || 240) * (0.2 + easeOutCubic(t) * 0.82);
  const arrows = 6;

  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < arrows; i++) {
    const spread = (i - (arrows - 1) / 2) * 0.15;
    const angle = baseAngle + spread;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const endX = x + dirX * range;
    const endY = y + dirY * range;

    ctx.globalAlpha = alpha * 0.34;
    ctx.strokeStyle = '#8b3d28';
    ctx.lineWidth = 6;
    line(ctx, endX - dirX * 32, endY - dirY * 32, endX, endY);
    ctx.globalAlpha = alpha * 0.86;
    ctx.strokeStyle = i % 2 ? '#ff9a4d' : '#ffcc66';
    ctx.lineWidth = 2;
    line(ctx, endX - dirX * 26, endY - dirY * 26, endX, endY);
    ctx.fillStyle = '#d6dde5';
    triangle(ctx, endX + dirX * 7, endY + dirY * 7, endX - dirY * 4, endY + dirX * 4, endX + dirY * 4, endY - dirX * 4);
    ctx.globalAlpha = alpha * 0.32;
    ctx.fillStyle = '#4d3b32';
    circle(ctx, endX - dirX * 9, endY - dirY * 9, 5 + t * 3);
  }

  ctx.restore();
}

function drawFellhunterGadgetEffect(ctx, fx, camera, alpha, t) {
  const x = fx.x - camera.x;
  const y = fx.y - camera.y;
  const radius = fx.radius || 48;

  ctx.save();

  if (fx.kind === 'fellhunterPracticalStrike') {
    const angle = Math.atan2(fx.dirY || 0, fx.dirX || 1);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = '#d6dde5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, fx.range || 42, -0.55, 0.55);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = '#8b5c45';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, (fx.range || 42) - 4, -0.45, 0.35);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterBearTrap') {
    ctx.globalAlpha = alpha * (t < 0.12 ? 0.9 : 0.6);
    ctx.strokeStyle = '#6f7985';
    ctx.lineWidth = 3;
    line(ctx, x - 13, y, x - 2, y - 8);
    line(ctx, x + 13, y, x + 2, y - 8);
    line(ctx, x - 13, y, x - 2, y + 8);
    line(ctx, x + 13, y, x + 2, y + 8);
    ctx.strokeStyle = '#3a2522';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y, 18);
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterTrapSnap') {
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = '#d6dde5';
    ctx.lineWidth = 4;
    line(ctx, x - 18, y - 10, x + 18, y + 8);
    line(ctx, x + 18, y - 10, x - 18, y + 8);
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = '#ff9a4d';
    circleStroke(ctx, x, y, radius * (0.4 + t * 0.7));
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterCaltrops' || fx.kind === 'fellhunterCaltropsStep') {
    const spikes = 12;
    ctx.globalAlpha = alpha * (fx.kind === 'fellhunterCaltropsStep' ? 0.7 : 0.48);
    ctx.strokeStyle = '#8f98a3';
    ctx.lineWidth = 2;
    for (let i = 0; i < spikes; i++) {
      const angle = i * Math.PI * 2 / spikes;
      const r = radius * (0.2 + ((i * 7) % 10) / 13);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r * 0.62;
      line(ctx, px - 3, py + 3, px + 3, py - 3);
      line(ctx, px - 3, py - 3, px + 3, py + 3);
    }
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterBombFuse') {
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#2b2521';
    circle(ctx, x, y, 8);
    ctx.fillStyle = '#ffcc66';
    circle(ctx, x + 7, y - 8, 2 + Math.sin(t * Math.PI * 6) * 0.8);
    ctx.strokeStyle = '#ff9a4d';
    ctx.lineWidth = 2;
    line(ctx, x + 3, y - 5, x + 8, y - 9);
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterExplosion' || fx.kind === 'fellhunterKillZoneBlast') {
    const boom = easeOutCubic(t);
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = '#ff9a4d';
    circle(ctx, x, y, radius * boom);
    ctx.globalAlpha = alpha * 0.62;
    ctx.strokeStyle = '#ffcc66';
    ctx.lineWidth = 4;
    circleStroke(ctx, x, y, radius * (0.3 + boom * 0.72));
    ctx.globalAlpha = alpha * 0.38;
    ctx.fillStyle = '#4d3b32';
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + t;
      circle(ctx, x + Math.cos(angle) * radius * boom * 0.55, y + Math.sin(angle) * radius * boom * 0.34, 5 + i % 3);
    }
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterGrapple') {
    const tx = (fx.targetX ?? fx.x) - camera.x;
    const ty = (fx.targetY ?? fx.y) - camera.y;
    const progress = easeOutCubic(t);
    const hookX = x + (tx - x) * progress;
    const hookY = y + (ty - y) * progress;
    const angle = Math.atan2(ty - y, tx - x);
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = '#8b5c45';
    ctx.lineWidth = 3;
    line(ctx, x, y, hookX, hookY);
    ctx.save();
    ctx.translate(hookX, hookY);
    ctx.rotate(angle);
    ctx.strokeStyle = '#d6dde5';
    ctx.lineWidth = 3;
    line(ctx, -8, 0, 8, 0);
    line(ctx, 4, 0, 10, -6);
    line(ctx, 4, 0, 10, 6);
    ctx.restore();
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterSmokeBomb') {
    const smoke = 0.35 + easeOutCubic(t) * 0.75;
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = '#aeb8ca';
    circle(ctx, x, y, radius * smoke);
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = '#56616d';
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI * 2 / 6 + t * 0.8;
      circle(ctx, x + Math.cos(angle) * radius * 0.34, y + Math.sin(angle) * radius * 0.22, radius * 0.18);
    }
    ctx.restore();
    return;
  }

  if (fx.kind === 'fellhunterKillZone') {
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = '#ff9a4d';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y, radius);
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = '#8b5c45';
    line(ctx, x - radius * 0.7, y, x + radius * 0.7, y);
    line(ctx, x, y - radius * 0.48, x, y + radius * 0.48);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const px = x + Math.cos(angle) * radius * 0.62;
      const py = y + Math.sin(angle) * radius * 0.42;
      ctx.fillStyle = i % 2 ? '#2b2521' : '#6f7985';
      circle(ctx, px, py, 4);
    }
  }

  ctx.restore();
}

function drawBloodLanceEffect(ctx, fx, camera, alpha, t) {
  const x = fx.x - camera.x;
  const y = fx.y - camera.y;
  const tx = (fx.targetX ?? fx.x) - camera.x;
  const ty = (fx.targetY ?? fx.y) - camera.y;

  ctx.save();

  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = '#662d40';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  line(ctx, x, y, tx, ty);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#e7aeb6';
  ctx.lineWidth = 3;
  line(ctx, x, y, tx, ty);

  ctx.fillStyle = '#ba536b';
  const angle=Math.atan2(ty-y,tx-x);
  ctx.save();ctx.translate(tx,ty);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-5);ctx.lineTo(-3,0);ctx.lineTo(-8,5);ctx.closePath();ctx.fill();ctx.restore();
  ctx.strokeStyle='#e7aeb6';ctx.lineWidth=1.5;
  for(let i=0;i<3;i++){const side=(i-1)*7;ctx.beginPath();ctx.moveTo(tx,ty+side);ctx.quadraticCurveTo(tx-(tx-x)*.35,ty+side-10, x+(tx-x)*(1-t),y+side);ctx.stroke();}

  ctx.restore();
}

function drawWildBloomEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 100) * (0.25 + easeOutCubic(t) * 0.85);

  ctx.save();

  ctx.globalAlpha = alpha * 0.18;
  ctx.fillStyle = '#73d18a';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = '#d8f6c9';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y, radius);

  ctx.fillStyle = '#73d18a';
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2 + t * 1.4;
    const px = x + Math.cos(angle) * radius * 0.72;
    const py = y + Math.sin(angle) * radius * 0.72;
    leafDiamond(ctx, px, py, 5 + Math.sin(t * Math.PI) * 2, Math.cos(angle), Math.sin(angle));
  }

  ctx.restore();
}

function drawEldritchBlinkEffect(ctx, fx, camera, alpha, t) {
  const sx = fx.x - camera.x;
  const sy = fx.y - camera.y;
  const ex = (fx.targetX ?? fx.x) - camera.x;
  const ey = (fx.targetY ?? fx.y) - camera.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;
  const sideX = -dirY;
  const sideY = dirX;
  const reveal = easeOutCubic(t);
  const mx = sx + dx * reveal;
  const my = sy + dy * reveal;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = alpha * 0.38;
  ctx.strokeStyle = '#050207';
  ctx.lineWidth = 18;
  line(ctx, sx, sy, mx, my);

  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = '#ef4056';
  ctx.lineWidth = 5;
  drawJaggedLine(ctx, sx, sy, mx, my, sideX, sideY, 11, 8);

  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = '#ff9aa8';
  ctx.lineWidth = 2;
  drawJaggedLine(ctx, sx + sideX * 5, sy + sideY * 5, mx + sideX * 5, my + sideY * 5, sideX, sideY, 6, 7);

  ctx.fillStyle = '#ef4056';
  circle(ctx, sx, sy, 7 + 6 * (1 - t));
  circle(ctx, ex, ey, 9 + 12 * t);

  ctx.restore();
}

function drawEldritchBurstEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 72) * (0.25 + easeOutCubic(t) * 0.95);

  ctx.save();

  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = '#050207';
  circle(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.82;
  ctx.strokeStyle = '#ef4056';
  ctx.lineWidth = 4;
  circleStroke(ctx, x, y, radius);

  ctx.globalAlpha = alpha * 0.62;
  ctx.strokeStyle = '#ff9aa8';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, Math.max(8, radius * 0.55));

  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2 + t * 2.8;
    const inner = radius * 0.2;
    const outer = radius * (0.72 + Math.sin(i * 2.1 + t * 6) * 0.12);
    ctx.globalAlpha = alpha * (i % 2 ? 0.58 : 0.82);
    ctx.strokeStyle = i % 2 ? '#240814' : '#ef4056';
    ctx.lineWidth = i % 2 ? 5 : 2;
    line(
      ctx,
      x + Math.cos(angle) * inner,
      y + Math.sin(angle) * inner,
      x + Math.cos(angle) * outer,
      y + Math.sin(angle) * outer
    );
  }

  ctx.restore();
}

function drawEldritchRiftEffect(ctx, x, y, fx, alpha, t) {
  const radius = (fx.radius || 66) * (0.55 + Math.sin(t * Math.PI) * 0.25);
  const rotation = t * Math.PI * 1.6;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.globalAlpha = alpha * 0.3;
  ctx.fillStyle = '#050207';
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.86, radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.92;
  ctx.strokeStyle = '#ef4056';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.82, radius * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.62;
  ctx.strokeStyle = '#ff9aa8';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const inner = radius * 0.2;
    const outer = radius * 0.56;
    line(ctx, Math.cos(a) * inner, Math.sin(a) * inner * 0.55, Math.cos(a) * outer, Math.sin(a) * outer * 0.55);
  }

  ctx.restore();
}

function drawGenericEffect(ctx, x, y, fx, alpha) {
  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = fx.color || '#e8edf5';
  circle(ctx, x, y, fx.radius || 8);

  ctx.restore();
}

function drawForageSweepEffect(ctx, x, y, fx, alpha, t) {
  ctx.save();

  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = fx.color || '#73d18a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  const sweep = -Math.PI * 0.85 + t * Math.PI * 1.35;
  ctx.beginPath();
  ctx.arc(x, y - 4, 24 + t * 10, sweep, sweep + Math.PI * 0.75);
  ctx.stroke();

  ctx.fillStyle = fx.color || '#73d18a';
  for (let i = 0; i < 5; i++) {
    const angle = i * 1.25 + t * 3.2;
    leafDiamond(ctx, x + Math.cos(angle) * (12 + t * 28), y + Math.sin(angle) * 8 - 8 - t * 10, 4, Math.cos(angle), Math.sin(angle));
  }

  ctx.restore();
}

function drawMiningStrikeEffect(ctx, x, y, fx, alpha, t) {
  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  line(ctx, x - 20 + t * 18, y - 28 + t * 12, x + 12, y + 8);

  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = fx.color || '#ffcc66';
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    circle(ctx, x + Math.cos(angle) * (8 + t * 26), y + Math.sin(angle) * (5 + t * 18), Math.max(2, 4 - t * 2));
  }

  ctx.restore();
}

function drawWoodcuttingChopEffect(ctx, x, y, fx, alpha, t) {
  ctx.save();

  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = fx.color || '#d9ad4f';
  ctx.lineWidth = 3;
  line(ctx, x - 16 + t * 8, y - 18 + t * 6, x + 14, y + 3);

  ctx.globalAlpha = alpha * 0.65;
  ctx.fillStyle = '#c58b4d';
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI * 0.9 + i * 0.32 + t * 0.8;
    const dist = 8 + t * 22 + i * 2;
    rect(ctx, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 3, 2);
  }

  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = '#73d18a';
  circle(ctx, x, y, 12 + t * 14);

  ctx.restore();
}

function drawFishingSkillEffect(ctx, x, y, fx, alpha, t) {
  ctx.save();

  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = fx.color || '#66f0ff';
  ctx.lineWidth = 2;

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, 12 + t * 24 + i * 7, 4 + t * 7 + i * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = '#d8f8ff';
  circle(ctx, x - 5 + t * 10, y - 4 - t * 10, 3);
  circle(ctx, x + 8 - t * 6, y - 1 - t * 7, 2);

  ctx.restore();
}

function drawRunecraftGatherEffect(ctx, x, y, fx, alpha, t) {
  ctx.save();

  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = fx.color || '#b68cff';
  circle(ctx, x, y, 18 + t * 18);

  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = '#d8bdff';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y, 10 + t * 20);

  for (let i = 0; i < 4; i++) {
    const angle = i / 4 * Math.PI * 2 + t * Math.PI;
    line(ctx, x + Math.cos(angle) * 6, y + Math.sin(angle) * 6, x + Math.cos(angle) * (18 + t * 12), y + Math.sin(angle) * (18 + t * 12));
  }

  ctx.restore();
}

function getEffectHighlightColor(color) {
  const normalized = String(color || '').toLowerCase();
  if (normalized === '#ef4056' || normalized === '#d73545') return '#ff9099';
  if (normalized === '#b68cff' || normalized === '#a86bd6') return '#e3cef2';
  if (normalized === '#73d18a' || normalized === '#7e9d58') return '#d8d59a';
  if (normalized === '#59d7e8' || normalized === '#35b9d0') return '#d7fbfa';
  if (normalized === '#d9ad4f' || normalized === '#ffcc66') return '#fff1b8';
  if (normalized === '#c65f38') return '#f4b36c';
  return '#edf0f2';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL HELPERS
// -----------------------------------------------------------------------------

function screen(object, camera) {
  return {
    x: object.x - camera.x,
    y: object.y - camera.y
  };
}

function isOnScreen(ctx, x, y, margin = 60) {
  return (
    x >= -margin &&
    y >= -margin &&
    x <= ctx.canvas.width + margin &&
    y <= ctx.canvas.height + margin
  );
}

function leafDiamond(ctx, x, y, r, dirX, dirY) {
  const sideX = -dirY;
  const sideY = dirX;

  ctx.beginPath();
  ctx.moveTo(x + dirX * r * 1.4, y + dirY * r * 1.4);
  ctx.lineTo(x + sideX * r, y + sideY * r);
  ctx.lineTo(x - dirX * r * 1.2, y - dirY * r * 1.2);
  ctx.lineTo(x - sideX * r, y - sideY * r);
  ctx.closePath();
  ctx.fill();
}

function poly(ctx, points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
  for (const [x, y] of points.slice(1)) ctx.lineTo(Math.round(x), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

function diamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y - r));
  ctx.lineTo(Math.round(x + r), Math.round(y));
  ctx.lineTo(Math.round(x), Math.round(y + r));
  ctx.lineTo(Math.round(x - r), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

function diamondStroke(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y - r));
  ctx.lineTo(Math.round(x + r), Math.round(y));
  ctx.lineTo(Math.round(x), Math.round(y + r));
  ctx.lineTo(Math.round(x - r), Math.round(y));
  ctx.closePath();
  ctx.stroke();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

function circleStroke(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function drawJaggedLine(ctx, x1, y1, x2, y2, sideX, sideY, amplitude = 6, segments = 7) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));

  for (let i = 1; i < segments; i++) {
    const p = i / segments;
    const zig = (i % 2 === 0 ? -1 : 1) * amplitude * (0.75 + Math.sin(i * 1.7) * 0.18);
    const x = x1 + (x2 - x1) * p + sideX * zig;
    const y = y1 + (y2 - y1) * p + sideY * zig;
    ctx.lineTo(Math.round(x), Math.round(y));
  }

  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.lineTo(Math.round(x3), Math.round(y3));
  ctx.closePath();
  ctx.fill();
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function easeOutCubic(t) {
  const n = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - n, 3);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
