// Hand-authored pixel water, foam, deep-water bubbles and pressure flames.
// Small integer pixels keep these effects in the same style as Runalis actors.
const TAU=Math.PI*2,C=['#071020','#142a50','#285cb6','#5689da','#a1c4f5'];
const dot=(c,x,y,color,size=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),size,size);};
function segment(c,x1,y1,x2,y2,color,size=2){
 const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/size));
 for(let i=0;i<=n;i++)dot(c,x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,color,size);
}
function ring(c,x,y,r,phase=0,aspect=1,color=C[2]){
 const count=Math.min(160,Math.max(16,Math.ceil(r*1.4)));
 for(let i=0;i<count;i++){const a=i*TAU/count+phase;dot(c,x+Math.cos(a)*r,y+Math.sin(a)*r*aspect,i%7===0?C[4]:color,i%7===0?3:2);}
}
function bubble(c,x,y,r=4){
 segment(c,x-r,y-r/2,x-r,y+r/2,C[2]);segment(c,x+r,y-r/2,x+r,y+r/2,C[3]);
 segment(c,x-r/2,y-r,x+r/2,y-r,C[3]);segment(c,x-r/2,y+r,x+r/2,y+r,C[1]);dot(c,x-1,y-r,C[4]);
}
export function drawSunkenWard(c,x,y,now,fade=1){
 c.save();c.globalAlpha=.7*fade;
 ring(c,x,y-18,38,0,1.35,C[2]);ring(c,x,y-18,34,0,1.35,C[1]);
 for(let i=0;i<7;i++){const a=i*TAU/7+Math.floor(now*8)/8;const px=x+Math.cos(a)*36,py=y-18+Math.sin(a)*47;bubble(c,px,py,3);}
 c.restore();
}
export function drawMaelstromPixels(c,fx,camera,sunken=false){
 if(fx.phase==='start')return;
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius||205;
 if(x+r<0||x-r>c.canvas.width||y+r<0||y-r>c.canvas.height)return;
 const age=fx.age||0,t=age/Math.max(.01,fx.ttl||.2),phase=Math.floor((fx.elapsed||age)*12)/12;
 const colors=sunken?C:['#0a2938','#1c5266','#388ea8','#70c9da','#c5eef5'];
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.8*(1-Math.max(0,t-.6));
 // Outer broken foam agrees with the actual circular damage/pull radius.
 ring(c,x,y,r,phase*.1,1,colors[2]);
 for(let arm=0;arm<4;arm++){
 let prior=null;
 for(let i=0;i<88;i++){
  const u=i/87,rad=r*(.08+u*.87),a=arm*TAU/4+phase*1.1-u*5.5;
  const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;
  if(prior){segment(c,prior.x,prior.y,px,py,colors[1],8);segment(c,prior.x+2,prior.y+2,px+2,py+2,colors[2],4);}
  dot(c,px,py,i%9===0?colors[4]:colors[3],i%9===0?3:2);prior={x:px,y:py};
 }
 }
 ring(c,x,y,17,phase,1,colors[1]);
 for(let i=0;i<14;i++){const a=i*2.4+phase*.6,rad=r*(.25+i%4*.17);bubble(c,x+Math.cos(a)*rad,y+Math.sin(a)*rad-Math.floor((phase+i)%2)*3,3);}
 c.restore();
}
export function drawSunkenSkill(c,fx,camera){
 if(fx.profile==='maelstrom'){drawMaelstromPixels(c,fx,camera,true);return;}
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius||36;
 if(x< -650||y< -650||x>c.canvas.width+650||y>c.canvas.height+650)return;
 const t=Math.min(1,(fx.age||0)/Math.max(.01,fx.ttl||.4)),phase=Math.floor(t*8)/8;
 const id=fx.abilityId||'',profile=fx.profile||'';
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.85*(1-t*.65);
 if(profile==='depth'){
  const depth=fx.depth||0;
  ring(c,x,y+3,r,0,.5,C[1]);
  const count=Math.floor(depth*24);
  for(let i=0;i<count;i++){const a=-Math.PI/2+i*TAU/24;dot(c,x+Math.cos(a)*r,y+3+Math.sin(a)*r*.5,i%6===0?C[4]:C[2],i%6===0?3:2);}
  for(let i=0;i<Math.floor(depth*4);i++)bubble(c,x-12+i*8,y-52-(i%2)*3,2);
 }else if(profile==='cast'||fx.phase==='impact'){
  ring(c,x,y,r*(.4+t*.6),phase,.7,C[3]);for(let i=0;i<6;i++){const a=i*2.4;bubble(c,x+Math.cos(a)*r*t,y+Math.sin(a)*r*t*.6,3);}
 }else if(profile==='burn'){
  const depth=fx.depth||0,flames=[['00100','01210','12321','23432','12321'],['00010','00121','01232','12343','12321'],['01000','12100','23210','34321','12321']][Math.floor(t*9)%3];
  for(const offset of [-10,7])for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(flames[row][col]!=='0'){
   dot(c,x+offset+col*2,y+row*2-Math.floor(depth*9),C[Number(flames[row][col])],2);
  }
  for(let i=0;i<Math.ceil(depth*5);i++)dot(c,x-11+i*5,y-42,C[3],3);
 }else if(id==='hydromancerWaterTorrent'||profile==='mythicTorrent'){
  const dx=fx.dirX??1,dy=fx.dirY||0,range=fx.range||230,width=fx.width||32;
  for(let stream=-2;stream<=2;stream++){
   let prior={x,y};for(let i=1;i<=28;i++){
    const u=i/28,side=stream*width*.35*u+Math.sin(i*.8+phase*9)*4;
    const px=x+dx*range*u-dy*side,py=y+dy*range*u+dx*side;
    segment(c,prior.x,prior.y,px,py,stream===0?C[3]:C[2],stream===0?3:2);prior={x:px,y:py};
    if(i%7===0)bubble(c,px,py,3);
   }
  }
 }else if(id==='hydromancerBubbleWard'||profile==='mirror'){
  drawSunkenWard(c,x,y,phase*3,1-t*.5);
  if(profile==='mirror')for(let i=-2;i<=2;i++)segment(c,x+i*10,y+8,x+i*10,y-64+Math.sin(i+phase)*4,C[3],3);
 }else if(id==='hydromancerRiptideStep'||profile==='undertow'){
  const ex=(fx.targetX??fx.endX??fx.x)-camera.x,ey=(fx.targetY??fx.endY??fx.y)-camera.y;
  for(let i=0;i<25;i++){const u=i/24,px=x+(ex-x)*u,py=y+(ey-y)*u;dot(c,px-4,py,C[1],7);dot(c,px,py+Math.sin(i+phase*6)*6,C[3],3);if(i%5===0)bubble(c,px,py-8,3);}
  ring(c,ex,ey,20+t*20,phase,1,C[2]);
 }else if(id==='hydromancerTidalCut'||profile==='pressure'){
  const dx=fx.dirX??1,dy=fx.dirY||0,range=fx.range||r;
  if(profile==='pressure'){segment(c,x,y,x+dx*range,y+dy*range,C[1],5);segment(c,x,y,x+dx*range,y+dy*range,C[3],2);}
  else for(let i=0;i<=30;i++){const a=Math.atan2(dy,dx)-.8+i/30*1.6;dot(c,x+Math.cos(a)*range,y+Math.sin(a)*range,C[i%5===0?4:2],3);}
 }else if(['hydromancerMendingCurrent','hydromancerWellspring'].includes(id)){
  ring(c,x,y,r*(.7+t*.3),phase,.5,C[2]);
  for(let i=0;i<12;i++){const a=i*2.4,px=x+Math.cos(a)*r*.65,py=y+Math.sin(a)*r*.3-t*35;bubble(c,px,py,4);}
  segment(c,x-7,y-20,x+7,y-20,C[4]);segment(c,x,y-27,x,y-13,C[4]);
 }else if(id==='hydromancerDelugeCrown'){
  ring(c,x,y,r,phase,1,C[2]);
  for(let i=0;i<12;i++){const a=i*TAU/12,px=x+Math.cos(a)*r*.8,py=y+Math.sin(a)*r*.8;segment(c,px,py,px,py-35*Math.sin(Math.PI*t),C[3],3);bubble(c,px,py-40*Math.sin(Math.PI*t),4);}
 }else{
  // Drowning Pressure contracts; generic cast/impact rings stay small.
  const radius=Math.min(170,r)*(id==='hydromancerDrowningPressure'?1-t*.65:.5+t*.5);
  for(let i=0;i<3;i++)ring(c,x,y,radius*(1-i*.22),phase,.7,i===0?C[3]:C[2]);
  for(let i=0;i<8;i++){const a=i*2.4;dot(c,x+Math.cos(a)*radius,y+Math.sin(a)*radius*.7,C[4],2);}
 }
 c.restore();
}
