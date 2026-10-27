import {drawHumanActor} from './humanRenderer.js';
const ghosts=new WeakMap();
export function drawClassMovement(ctx,fx,camera){
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),t=Math.max(0,Math.min(1,(fx.age||0)/fx.ttl));
 if(x<-140||y<-140||x>ctx.canvas.width+140||y>ctx.canvas.height+140)return;
 ctx.save();ctx.globalAlpha=(1-t)*(fx.phase==='landing'?.65:.4);ctx.strokeStyle=fx.color;ctx.fillStyle=fx.color;ctx.lineWidth=1.5;
 if(fx.ghost){
  let c=ghosts.get(fx);if(!c){c=document.createElement('canvas');c.width=112;c.height=128;const g=c.getContext('2d');drawHumanActor(g,fx.ghost,{x:fx.x-56,y:fx.y-94});g.globalCompositeOperation='source-atop';g.fillStyle=fx.color;g.fillRect(0,0,112,128);ghosts.set(fx,c);}
  ctx.globalAlpha=(1-t)*.22;ctx.drawImage(c,x-56,y-94);ctx.globalAlpha=(1-t)*.4;
 }
 const landing=fx.phase==='landing',radius=landing?10+t*15:7;
 if(fx.motif==='momentum'){
  for(let i=0;i<4;i++){const side=i%2?-1:1;ctx.fillRect(x+side*(5+t*(9+i)),y+9+(i%3)*3,3-i%2,2);}
  if(landing){ctx.beginPath();ctx.ellipse(x,y+12,radius,4+t*3,0,0,Math.PI*2);ctx.stroke();}
 }else if(fx.motif==='current'){
  for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(x-i*fx.dirX*8,y+10-i*fx.dirY*5,radius+i*4,3+i,0,0,Math.PI*2);ctx.stroke();}
  if(fx.morph==='cryomancer')for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*8-3,y+10);ctx.lineTo(x+i*8,y+1-t*5);ctx.lineTo(x+i*8+3,y+10);ctx.stroke();}
 }else if(fx.motif==='leaves'){
  for(let i=0;i<4;i++){const a=i*2.4;ctx.save();ctx.translate(x+Math.cos(a)*(7+t*12),y+6+Math.sin(a)*5-t*6);ctx.rotate(a);ctx.fillRect(-3,-1,6,2);ctx.restore();}
 }else if(fx.motif==='radiant'){
  ctx.strokeStyle=fx.light;for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*4,y+6+Math.sin(a)*3);ctx.lineTo(x+Math.cos(a)*(radius+4),y+6+Math.sin(a)*(radius*.5));ctx.stroke();}
 }else if(fx.motif==='streak'){
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x-i*fx.dirY*5,y+8+i*fx.dirX*4);ctx.lineTo(x-i*fx.dirY*5-fx.dirX*(14+t*10),y+8+i*fx.dirX*4-fx.dirY*(14+t*10));ctx.stroke();}
 }else{ctx.beginPath();ctx.ellipse(x,y+10,radius,4,0,0,Math.PI*2);ctx.stroke();}
 if(fx.context){ctx.globalAlpha=(1-t)*.45;for(let i=0;i<5;i++){const a=i*2.4;ctx.fillRect(Math.round(x+Math.cos(a)*(13+t*12)),Math.round(y+9+Math.sin(a)*7),2,2);}}
 ctx.restore();
}
