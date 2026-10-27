export const CHARGE_KINDS=new Set(['chargeRush','shieldCharge','duelistThrust','spectralLunge','infernalRush','rootBurrowCharge','judgmentCharge']);
const sourceKinds=new Set(['lunge','guardBreak','slam','detonate','summonMinion','phaseStrike']);
// Shapes describe collision, not decorative art. Keep the same data for drawing and hits.
export function enemyTelegraphGeometry(enemy,tell){
 const source=sourceKinds.has(tell.kind),x=source?enemy.x:tell.x??enemy.x,y=source?enemy.y:tell.y??enemy.y;
 if(CHARGE_KINDS.has(tell.kind)){
  const sx=tell.sourceX??enemy.x,sy=tell.sourceY??enemy.y,dx=(tell.x??sx)-sx,dy=(tell.y??sy)-sy,d=Math.hypot(dx,dy)||1;
  const travel=Math.min(d,tell.chargeTravel??tell.radius??120);
  return {shape:'line',x:sx,y:sy,endX:sx+dx/d*travel,endY:sy+dy/d*travel,width:Math.max(14,tell.chargeWidth??22)};
 }
 if(tell.kind==='guardBreak'||tell.kind==='phaseStrike')return {shape:'cone',x,y,radius:tell.radius||42,angle:Math.atan2((tell.y??y)-y,(tell.x??x)-x),halfAngle:1.05};
 return {shape:'circle',x,y,radius:tell.radius||42};
}
export function telegraphContainsPoint(g,x,y,padding=0){
 if(g.shape==='sequence')return g.zones.some(z=>telegraphContainsPoint(z,x,y,padding));
 if(g.shape==='line'){
  const dx=g.endX-g.x,dy=g.endY-g.y,t=Math.max(0,Math.min(1,((x-g.x)*dx+(y-g.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x-g.x-dx*t,y-g.y-dy*t)<=g.width+padding;
 }
 const dx=x-g.x,dy=y-g.y,d=Math.hypot(dx,dy);
 if(g.shape==='annulus'||g.shape==='ring')return d<=g.radius+padding&&d>=Math.max(0,(g.innerRadius||0)-padding);
 if(d>g.radius+padding)return false;
 if(g.shape==='cone')return d<=padding||Math.cos(Math.atan2(dy,dx)-g.angle)>=Math.cos(g.halfAngle+Math.asin(Math.min(1,padding/(d||1))));
 return true;
}
export function drawAttackGeometry(ctx,g,camera,progress,color='#eea382',locked=true,outlineOnly=false){
 if(g.shape==='sequence'){for(const zone of g.zones)drawAttackGeometry(ctx,zone,camera,progress,color,locked,outlineOnly);return;}
 const x=Math.round(g.x-camera.x),y=Math.round(g.y-camera.y),radius=g.radius||g.width||40;
 if(x+radius<-100||y+radius<-100||x-radius>ctx.canvas.width+100||y-radius>ctx.canvas.height+100){if(g.shape!=='line')return;}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.lineJoin='round';ctx.lineCap='round';
 const path=()=>{
  ctx.beginPath();
  if(g.shape==='line'){
   const ex=Math.round(g.endX-camera.x),ey=Math.round(g.endY-camera.y),a=Math.atan2(ey-y,ex-x),w=g.width;
   ctx.arc(x,y,w,a+Math.PI/2,a+Math.PI*1.5);ctx.arc(ex,ey,w,a-Math.PI/2,a+Math.PI/2);ctx.closePath();
  }
  else if(g.shape==='cone'){ctx.moveTo(x,y);ctx.arc(x,y,radius,g.angle-g.halfAngle,g.angle+g.halfAngle);ctx.closePath();}
  else{ctx.arc(x,y,radius,0,Math.PI*2);if(g.innerRadius)ctx.arc(x,y,g.innerRadius,0,Math.PI*2,true);}
 };
 if(!outlineOnly){path();ctx.globalAlpha=.13+progress*.1;ctx.fillStyle=color;ctx.fill('evenodd');}
 path();ctx.globalAlpha=outlineOnly?.62:.92;ctx.strokeStyle='#130e14';ctx.lineWidth=outlineOnly?4:6;ctx.stroke();
 path();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(locked?[]:[7,4]);ctx.stroke();ctx.setLineDash([]);
 ctx.globalAlpha=.9;ctx.strokeStyle='#fff1d4';ctx.lineWidth=2;
 if(g.shape==='line'){ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(Math.round(g.endX-camera.x),Math.round(g.endY-camera.y));ctx.stroke();ctx.setLineDash([]);}
 else{const start=g.shape==='cone'?g.angle-g.halfAngle:-Math.PI/2,span=g.shape==='cone'?g.halfAngle*2:Math.PI*2;ctx.beginPath();ctx.arc(x,y,Math.max(3,radius-6),start,start+span*Math.max(0,Math.min(1,progress)));ctx.stroke();}
 // Angular ticks remain legible without relying on red/green color distinction.
 const ticks=g.shape==='cone'?[g.angle-g.halfAngle,g.angle,g.angle+g.halfAngle]:g.shape==='line'?[]:[0,Math.PI/2,Math.PI,Math.PI*1.5];
 ctx.fillStyle=color;for(const a of ticks){ctx.fillRect(Math.round(x+Math.cos(a)*(radius+4))-2,Math.round(y+Math.sin(a)*(radius+4))-2,4,4);}
 ctx.restore();
}
