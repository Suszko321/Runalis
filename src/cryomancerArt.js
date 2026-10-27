// Integer-pixel ice silhouettes, cracks, snow and armor. No smooth gradients.
const TAU=Math.PI*2,ICE=['#142a3b','#3d6a80','#92cbdc','#e7fcff'];
const fieldTiles=new Map();
const pixel=(c,x,y,color,size=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),size,size);};
function line(c,a,b,color=ICE[2],size=2){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/size));for(let i=0;i<=n;i++)pixel(c,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,color,size);}
function rim(c,x,y,r,phase=0,aspect=1){for(let i=0;i<Math.min(160,Math.max(16,r));i++){const a=i*TAU/Math.min(160,Math.max(16,r));pixel(c,x+Math.cos(a)*r,y+Math.sin(a)*r*aspect,i%8===0?ICE[3]:ICE[1],i%8===0?3:2);} }
function snowflake(c,x,y,r=7,angle=0){for(let j=0;j<6;j++){const a=angle+j*TAU/6,dx=Math.cos(a),dy=Math.sin(a);line(c,{x,y},{x:x+dx*r,y:y+dy*r});for(const side of [-1,1])line(c,{x:x+dx*r*.65,y:y+dy*r*.65},{x:x+dx*r*.4-dy*side*r*.25,y:y+dy*r*.4+dx*side*r*.25},ICE[3],1);} }
const CRYSTAL=['0001000','0012100','0012310','0122310','0122331','0122331','0122331','0122331','0122331','0122321','0122210','0011100'];
function crystal(c,x,y,size=2,quarter=0){for(let row=0;row<CRYSTAL.length;row++)for(let col=0;col<7;col++){
 const value=Number(CRYSTAL[row][col]);if(!value)continue;const u=(col-3)*size,v=(row-11)*size;
 const dx=quarter===0?u:quarter===1?-v:quarter===2?-u:v,dy=quarter===0?v:quarter===1?u:quarter===2?-v:-u;
 pixel(c,x+dx,y+dy,ICE[value-1],size);
}}
export function drawCryoWard(c,p,camera,now){
 const x=Math.round(p.x-camera.x),y=Math.round(p.y-camera.y-15);
 c.save();c.globalAlpha=.7;rim(c,x,y,32,0,1.35);for(let i=0;i<6;i++){const a=i*TAU/6;crystal(c,x+Math.cos(a)*27,y+Math.sin(a)*32,1);}snowflake(c,x,y-43,6,Math.floor(now*3)/12);c.restore();
}
export function drawCryoProjectile(c,shot,camera){
 const x=shot.x-camera.x,y=shot.y-camera.y,dx=shot.aim.x,dy=shot.aim.y;
 c.save();c.globalAlpha=.7;for(let i=1;i<=5;i++)pixel(c,x-dx*i*7,y-dy*i*7,i%2?ICE[1]:ICE[2],i<3?3:2);
 c.globalAlpha=1;const quarter=((Math.round(Math.atan2(dy,dx)/(Math.PI/2))+1)%4+4)%4;
 crystal(c,x,y,shot.a.subclassMode==='pierce'?2:1,quarter);c.restore();
}
export function drawCryomancerEffect(c,fx,camera){
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=Math.min(320,fx.radius||32),g=fx.geometry,id=fx.abilityId;
 if(x+r< -80||x-r>c.canvas.width+80||y+r< -120||y-r>c.canvas.height+120)return;
 const t=Math.min(1,(fx.age||0)/Math.max(.01,fx.ttl||.4)),phase=Math.floor((fx.phaseTime||fx.age||0)*10)/10;
 if(g==='field'&&!fx.cryoTile){
  const frame=Math.floor(phase*4),key=id+':'+r+':'+frame;let tile=fieldTiles.get(key);
  if(!tile){
   const size=Math.ceil(r)*2+40,canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):globalThis.document?.createElement('canvas');
   if(canvas){canvas.width=canvas.height=size;drawCryomancerEffect(canvas.getContext('2d'),{...fx,cryoTile:true,x:r+20,y:r+20,age:0,phaseTime:frame/4},{x:0,y:0});tile=canvas;fieldTiles.set(key,tile);if(fieldTiles.size>48)fieldTiles.delete(fieldTiles.keys().next().value);}
  }
  if(tile){c.save();c.imageSmoothingEnabled=false;c.globalAlpha=1-t*.55;c.drawImage(tile,x-r-20,y-r-20);c.restore();return;}
 }
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.82*(1-t*.55);
 if(g==='thaw'){
  rim(c,x,y,r*(.5+t*.5),0,.65);snowflake(c,x,y-20,8*(1-t*.6),phase);
  for(let i=0;i<6;i++){const a=i*TAU/6;pixel(c,x+Math.cos(a)*r*t,y+Math.sin(a)*r*t-t*20,ICE[3],2);}
 }else if(g==='shatter'){
  for(let i=0;i<12;i++){const a=i*2.4,rr=r*(.15+t*.9);const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr-t*18;crystal(c,px,py,1,i%4);}
  snowflake(c,x,y,16*(1-t),phase);
 }else if(['freeze','brittle','status'].includes(g)){
  if(g!=='brittle')for(let i=-1;i<=1;i++)crystal(c,x+i*12,y+12,1+(i===0?1:0));
  if(fx.brittle||g==='brittle'){snowflake(c,x,y-39,9);for(let i=0;i<3;i++)line(c,{x:x-11+i*10,y:y-19},{x:x-7+i*10,y:y-3},ICE[3],1);}
 }else if(g==='field'){
  rim(c,x,y,r);
  const blizzard=id==='waveriderMaelstrom',sanctuary=id==='hydromancerWellspring';
  if(blizzard)for(let arm=0;arm<3;arm++){
   let prior=null;for(let i=0;i<42;i++){const u=i/41,a=arm*TAU/3+phase*.65-u*2.8,rr=r*(.35+u*.5),point={x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr};if(prior)line(c,prior,point,i%9===0?ICE[2]:ICE[1],2);prior=point;}
  }
  for(let i=0;i<(blizzard?18:10);i++){
   const a=i*2.4+(blizzard?phase*.8:0),rr=r*(.2+(i%4)*.19),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
   if(blizzard){snowflake(c,px,py-8,5,phase);pixel(c,px+5,py,ICE[3],2);}
   else if(sanctuary){snowflake(c,px,py-3-phase%1*8,6);}
   else crystal(c,px,py,1+i%2);
  }
  if(sanctuary){line(c,{x:x-9,y:y-15},{x:x+9,y:y-15},ICE[3]);line(c,{x,y:y-24},{x,y:y-6},ICE[3]);}
  else for(let j=0;j<6;j++){const a=j*TAU/6;line(c,{x:x+Math.cos(a)*r*.16,y:y+Math.sin(a)*r*.16},{x:x+Math.cos(a)*r*.6,y:y+Math.sin(a)*r*.6},ICE[1],1);}
 }else if(g==='dash'){
  const end={x:(fx.endX??fx.x)-camera.x,y:(fx.endY??fx.y)-camera.y};
  for(let i=0;i<16;i++){const u=i/15,px=x+(end.x-x)*u,py=y+(end.y-y)*u;pixel(c,px-4,py,ICE[1],8);pixel(c,px,py-2,ICE[2],3);if(i%4===0)crystal(c,px,py,1);}
 }else if(g==='ward'){
  rim(c,x,y-14,35,0,1.3);for(let i=0;i<6;i++){const a=i*TAU/6;crystal(c,x+Math.cos(a)*30,y+Math.sin(a)*38,1);}snowflake(c,x,y-55,9);
 }else if(g==='ritual'){
  rim(c,x,y,r*(.6+t*.4),0,.55);for(let i=0;i<8;i++){const a=i*2.4;snowflake(c,x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.3-t*28,5);}
 }else if(g==='burst'){
  rim(c,x,y,r*(.5+t*.5));for(let i=0;i<12;i++){const a=i*TAU/12,rr=r*.8;crystal(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1+(i%3===0?1:0));}
  snowflake(c,x,y,22,phase);
 }else if(g==='impact'){
  for(let i=0;i<6;i++){const a=i*TAU/6;pixel(c,x+Math.cos(a)*(5+t*18),y+Math.sin(a)*(5+t*18),i%2?ICE[2]:ICE[3],3);}snowflake(c,x,y,6*(1-t));
 }else{snowflake(c,x,y,12+t*8,phase);}
 c.restore();
}
