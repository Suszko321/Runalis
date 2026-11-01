import {asset} from './spriteArt.js';
import {royalActive} from './vampireRules.js';
import {batBeastEvolution} from './batBeastEvolution.js';
const royal=asset('veyreign-royal-blood-beast');
let alliedRoyal=null;
// One cached palette variant, never a per-frame image edit or source overwrite.
function alliedRoyalSheet(){
 if(alliedRoyal)return alliedRoyal;
 if(!royal?.ready||typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=royal.image.width;canvas.height=royal.image.height;
 const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(royal.image,0,0);
 const frame=c.getImageData(0,0,canvas.width,canvas.height),d=frame.data;
 const ramp=[[18,46,64],[38,88,115],[82,151,178],[145,211,222],[213,244,244]];
 for(let i=0;i<d.length;i+=4){
  if(!d[i+3]||d[i]<35||d[i]<=d[i+1]*1.18||d[i]<=d[i+2]*1.07)continue;
  const color=ramp[Math.min(4,Math.floor(d[i]/58))];
  [d[i],d[i+1],d[i+2]]=color;
 }
 c.putImageData(frame,0,0);alliedRoyal=canvas;return canvas;
}
function fallback(c,x,y,t,scale){
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
 c.fillStyle='#201728';const flap=Math.round(Math.sin(t*10)*6);
 for(const side of [-1,1]){c.beginPath();c.moveTo(side*10,-40);c.lineTo(side*48,-60+flap);c.lineTo(side*38,-15);c.lineTo(side*24,-26);c.lineTo(side*14,-10);c.closePath();c.fill();c.fillStyle='#502239';c.fillRect(side<0?-36:14,-39+flap,22,3);c.fillStyle='#201728';}
 c.fillStyle='#3c263a';c.fillRect(-14,-48,28,38);c.fillRect(-10,-16,7,17);c.fillRect(3,-16,7,17);c.fillRect(-10,-63,20,18);c.fillRect(-13,-70,5,12);c.fillRect(8,-70,5,12);c.fillStyle='#f5798c';c.fillRect(-7,-58,4,3);c.fillRect(4,-58,4,3);c.fillStyle='#ead4c9';c.fillRect(-6,-50,2,5);c.fillRect(4,-50,2,5);c.restore();
}
export function drawRoyalVampire(c,p,camera){
 const now=performance.now()/1000,f=p?.vampireForm,active=royalActive(p),transition=f?Math.min(1,(now-f.transitionAt)/.6):1;
 if(!active&&!(f?.ending&&transition<1))return false;
 const x=p.x-camera.x,y=p.y-camera.y,scale=1.15*(active?(.65+.35*transition):(1-.35*transition));
 c.save();c.globalAlpha=active?1:1-transition;c.imageSmoothingEnabled=false;
 if(royal?.ready){const row=transition<1?0:p.activeChannel?3:p.combatState?.attacking?3:p.moving?1:1,col=transition<1?Math.min(47,Math.floor(transition*48)):Math.floor(now*12)%48;
  c.translate(Math.round(x),Math.round(y-76*scale));if(p.dirX<0)c.scale(-1,1);c.drawImage(royal.image,col*112,row*80,112,80,-56*scale,0,112*scale,80*scale);
 }else fallback(c,x,y,now,scale);
 c.restore();c.save();c.strokeStyle='#d86683';c.lineWidth=2;c.beginPath();c.ellipse(x,y+4,24,9,0,0,Math.PI*2);c.stroke();c.fillStyle='#f3b2bf';c.font='bold 10px Georgia';c.textAlign='center';c.fillText(`P${p.slot||p.playerNumber||1} · ROYAL · 1% HP / 3s`,x,y-94);c.restore();return true;
}
export function drawVampireBat(c,s,p,x,y){
 if(s.kind!=='vampireBat')return false;const now=performance.now()/1000;
 const stage=batBeastEvolution(s.vampireMastery??p?.abilityMastery?.callBatBeast?.level),scale=stage.scale,sheet=alliedRoyalSheet();
 if(sheet){const row=s.hitFlash>0?5:s.attackAnimationUntil>now?3:1,col=Math.floor(now*12)%48;c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y-76*scale));if(s.dirX<0)c.scale(-1,1);c.drawImage(sheet,col*112,row*80,112,80,-56*scale,0,112*scale,80*scale);c.restore();}
 else fallback(c,x,y,now,scale);
 c.save();c.strokeStyle='#81bacb';c.beginPath();c.ellipse(x,y+3,17*scale,6*scale,0,0,Math.PI*2);c.stroke();c.font='9px Georgia';c.fillStyle='#bedde5';c.textAlign='center';c.fillText(`P${p.slot||1} · ${s.displayName||stage.name+' Bat Beast'}`,x,y-80*scale);c.restore();return true;
}
export function drawVampireEffect(c,fx,camera){
 if(fx.kind!=='vampire')return false;
 const x=fx.x-camera.x,y=fx.y-camera.y,t=Math.min(1,(fx.age||0)/(fx.ttl||.4));
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=1-t*.8;c.strokeStyle='#d94568';c.fillStyle='#8b203e';c.lineWidth=fx.royal?6:3;
 if(fx.profile==='bleed'){c.fillStyle='#ce4966';c.fillRect(Math.round(x),Math.round(y-10+t*16),3,5);c.fillRect(Math.round(x-1),Math.round(y-6+t*16),5,2);}
 else if(['beam','extract'].includes(fx.profile)){
  const sx=x,sy=y-(fx.royal?30:12),ex=fx.targetX-camera.x,ey=fx.targetY-camera.y-15;
  c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();c.strokeStyle='#ffb5bf';c.lineWidth=2;c.stroke();
  for(let i=0;i<7;i++){const f=(i/7+t)%1;c.fillStyle=i%2?'#ed637b':'#741c3c';c.fillRect(Math.round(ex+(sx-ex)*f),Math.round(ey+(sy-ey)*f),3,3);}
 }else if(['wave','communion','transform','summon','frenzy'].includes(fx.profile)){
  const radius=(fx.radius||45)*(fx.profile==='frenzy'?1:fx.profile==='wave'?t:.3+.7*t),depth=fx.profile==='wave'?1:.65;
  if(fx.profile==='wave'){c.save();c.globalAlpha*=.2;c.lineWidth=1;c.beginPath();c.arc(x,y+8,fx.radius,0,Math.PI*2);c.stroke();c.restore();}
  c.lineWidth=fx.profile==='wave'?12:4;c.strokeStyle='#741d39';c.beginPath();c.ellipse(x,y+8,radius,radius*depth,0,0,Math.PI*2);c.stroke();
  c.lineWidth=3;c.strokeStyle='#ed6a82';c.beginPath();c.ellipse(x,y+6,radius+3,radius*depth+2,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<24;i++){const a=i*Math.PI/12+t,px=Math.round(x+Math.cos(a)*radius),py=Math.round(y+Math.sin(a)*radius*depth);c.fillStyle=i%3?'#b52f55':'#f68b9d';c.fillRect(px,py-Math.sin(t*Math.PI)*9,3+i%3,5+i%4);}
 }else if(fx.profile==='step'){
  const ox=fx.targetX-camera.x,oy=fx.targetY-camera.y;
  for(let i=0;i<8;i++){const f=i/8,bx=ox+(x-ox)*f,by=oy+(y-oy)*f-20;c.fillRect(bx-5,by,10,3);c.fillRect(bx-8,by-3+Math.sin(t*20+i)*3,5,2);c.fillRect(bx+3,by-3-Math.sin(t*20+i)*3,5,2);}
 }else {c.translate(x,y);c.rotate(Math.atan2(fx.dirY||0,fx.dirX||1));for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(12,i*9);c.quadraticCurveTo(40,-24+i*8,(fx.radius||80),i*14);c.stroke();}}
 c.restore();return true;
}
