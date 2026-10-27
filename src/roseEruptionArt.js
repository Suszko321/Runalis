// A dedicated rose silhouette, drawn on a one-pixel grid and enlarged only
// by whole pixels. No gradients, blurred particles or stretched sprite parts.
const TAU=Math.PI*2,ink='#1d1017',dark='#571a2d',red='#ac233b',scarlet='#d63b50',pink='#ee797d',light='#ffd1b0',green='#536b39';
const sprites=new Map();
const pixel=(c,x,y,color,n=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),n,n);};
function stroke(c,x,y,u,v,color,n=2){
 const distance=Math.hypot(u-x,v-y),steps=Math.ceil(distance);
 for(let i=0;i<=steps;i++){const t=steps?i/steps:0;pixel(c,x+(u-x)*t,y+(v-y)*t,color,n);}
}
function polygon(c,points,color){
 c.fillStyle=color;
 const minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));
 for(let y=minY;y<=maxY;y++){
  const crossings=[];
  for(let i=0;i<points.length;i++){
   const [x1,y1]=points[i],[x2,y2]=points[(i+1)%points.length];
   if((y1<=y+.5&&y2>y+.5)||(y2<=y+.5&&y1>y+.5))crossings.push(x1+(y+.5-y1)*(x2-x1)/(y2-y1));
  }
  crossings.sort((a,b)=>a-b);for(let i=0;i+1<crossings.length;i+=2){const x=Math.ceil(crossings[i]-.5);c.fillRect(x,y,Math.ceil(crossings[i+1]-.5)-x,1);}
 }
}
function petal(c,points,color){polygon(c,points,ink);const cx=points.reduce((sum,p)=>sum+p[0],0)/points.length,cy=points.reduce((sum,p)=>sum+p[1],0)/points.length;polygon(c,points.map(([x,y])=>[cx+(x-cx)*.86,cy+(y-cy)*.86]),color);}
function roseSprite(stage){
 if(sprites.has(stage))return sprites.get(stage);
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=70;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 // The hooked stem and leaves emerge as a whole pose; legs/limbs are never
 // transformed separately. Sepals support the heavy flower crown.
 polygon(c,[[29,67],[28,48],[24,40],[28,37],[33,47],[34,67]],ink);
 polygon(c,[[30,66],[30,48],[27,41],[29,40],[32,48],[32,66]],green);
 petal(c,[[30,59],[17,59],[10,51],[24,50],[30,55]],green);
 petal(c,[[33,52],[43,47],[51,48],[45,58],[34,61]],green);
 stroke(c,18,54,29,58,'#849756',1);stroke(c,35,56,47,50,'#849756',1);
 polygon(c,[[31,60],[38,59],[33,56]],light);polygon(c,[[30,48],[22,45],[28,43]],light);
 if(stage===0){
  petal(c,[[23,38],[23,27],[28,18],[34,17],[41,26],[42,36],[35,43],[29,43]],dark);
  petal(c,[[28,39],[27,27],[30,21],[34,20],[38,26],[36,36]],red);
  stroke(c,32,23,34,35,pink,1);
 }else{
  const shift=stage===1?5:0;
  const pts=p=>p.map(([x,y])=>[stage===1?32+(x-32)*.75:x,y+shift]);
  polygon(c,pts([[11,30],[15,23],[21,14],[27,9],[36,9],[43,12],[49,19],[54,27],[56,35],[49,42],[41,48],[26,48],[17,43],[9,35]]),ink);
  petal(c,pts([[12,30],[10,24],[17,19],[22,20],[25,31],[23,39],[16,39]]),red);
  petal(c,pts([[19,22],[18,14],[26,9],[32,11],[35,21],[30,29]]),scarlet);
  petal(c,pts([[31,16],[33,9],[42,11],[49,18],[45,26],[37,28]]),red);
  petal(c,pts([[44,22],[51,20],[56,27],[54,36],[47,41],[39,35]]),scarlet);
  petal(c,pts([[17,34],[23,31],[36,35],[38,43],[29,48],[21,44],[14,39]]),scarlet);
  petal(c,pts([[36,34],[42,29],[49,34],[49,41],[42,47],[33,46],[29,41]]),red);
  petal(c,pts([[24,22],[29,16],[37,16],[43,24],[40,33],[32,37],[24,32],[21,26]]),pink);
  petal(c,pts([[27,22],[36,19],[40,24],[38,29],[30,31],[25,27]]),dark);
  petal(c,pts([[29,24],[33,22],[37,25],[35,28],[31,28]]),scarlet);
  // Discrete highlighted folds, rather than a smooth red disk.
  for(const line of [[20,15,26,12],[36,13,42,15],[49,25,52,30],[19,36,23,40],[31,42,35,39],[27,20,31,18]]){
   const [a,b]=pts([[line[0],line[1]],[line[2],line[3]]]);stroke(c,...a,...b,pink,1);
  }
  const core=pts([[32,24]])[0];pixel(c,...core,light,2);
  polygon(c,[[22,43],[26,50],[32,45],[39,51],[44,43],[37,46],[29,46]],green);
 }
 sprites.set(stage,canvas);return canvas;
}
function thorn(c,x,y,a,length){
 const dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx;
 let prior={x,y};
 for(let i=1;i<=6;i++){
  const d=length*i/6,bend=Math.sin(i*1.35+a*2)*length*.075,next={x:x+dx*d+nx*bend,y:y+dy*d+ny*bend},width=i<3?7:i<5?5:3;
  stroke(c,prior.x,prior.y,next.x,next.y,ink,width);stroke(c,prior.x+1,prior.y+1,next.x+1,next.y+1,green,width-2);
  if(i<5)stroke(c,prior.x+1,prior.y+1,next.x,next.y,'#829551',1);
  if(i%2===0){const side=i%4?1:-1;stroke(c,next.x,next.y,next.x+nx*side*8-dx*3,next.y+ny*side*8-dy*3,pink,2);}
  prior=next;
 }
}
export function drawRoseEruption(c,fx,camera){
 const age=Math.max(0,fx.age||0),ttl=fx.ttl||.95;if(age>=ttl)return;
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius||86,level=Math.min(2,fx.chargeLevel||0);
 c.save();c.imageSmoothingEnabled=false;c.translate(x,y);
 const fade=Math.min(1,(ttl-age)/.24);c.globalAlpha*=fade;
 if(fx.layer==='behind'){
  const growth=Math.min(1,.45+age*7),rad=r*growth;
  // Full circular boundary matches the hit area even while roots unfurl.
  for(let i=0;i<96;i++){const a=i*TAU/96;pixel(c,Math.cos(a)*r,Math.sin(a)*r,ink,3);if(i%2===0)pixel(c,Math.cos(a)*r+1,Math.sin(a)*r+1,red,2);}
  for(let i=0;i<8+level*2;i++){const a=i*TAU/(8+level*2)+.15;thorn(c,0,0,a,rad*.82);}
  for(let i=0;i<18;i++){const a=i*2.39996,d=rad*(.55+(i%3)*.14);pixel(c,Math.cos(a)*d,Math.sin(a)*d,'#5b4731',i%2?3:4);}
 }else{
  const stage=age<.055?0:age<.11?1:2,unit=level===2?3:2,sprite=roseSprite(stage);
  c.drawImage(sprite,-32*unit,-66*unit,64*unit,70*unit);
  // An outward shower of distinct red, pink and dark petals, kept inside
  // the actual burst circle; the bloom opens in authored pixel poses.
  for(let i=0;i<24+level*6;i++){
   const a=i*2.399963+level*.12,d=r*Math.min(.95,.22+age*.92)*(i%3===0?.7:1),px=Math.cos(a)*d,py=Math.sin(a)*d-12-Math.sin(Math.min(1,age*2)*Math.PI)*18;
   const n=i%3===0?4:3;pixel(c,px-1,py-1,ink,n+2);pixel(c,px,py,i%3===0?pink:scarlet,n);pixel(c,px+n-1,py-2,ink,2);pixel(c,px+n-1,py-1,pink,1);pixel(c,px+1,py,light,1);
  }
 }
 c.restore();
}
export function drawRoseCharge(c,charge,x,y,aim){
 c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y+17));
 const progress=Math.max(0,Math.min(1,charge.progress||0)),r=25+(charge.level||0)*4;
 for(let i=0;i<48;i++){const a=i*TAU/48-Math.PI/2;pixel(c,Math.cos(a)*r,Math.sin(a)*r,ink,4);if(i/48<=progress)pixel(c,Math.cos(a)*r+1,Math.sin(a)*r+1,pink,2);}
 const sprite=roseSprite(progress<.42?0:progress<.78?1:2);c.drawImage(sprite,Math.round(aim.x*23)-32,Math.round(aim.y*12)-65);
 for(let i=0;i<6;i++){const a=i*TAU/6+Math.floor(progress*8)*.2,d=40-progress*13;pixel(c,Math.cos(a)*d,Math.sin(a)*d-28,red,3);}
 c.restore();
}
export function drawThornWound(c,x,y){
 // A small hooked thorn, not a second giant bloom or noisy damage aura.
 stroke(c,x-5,y+4,x+3,y-4,ink,3);stroke(c,x-4,y+4,x+3,y-3,red,1);stroke(c,x,y,x+5,y+1,pink,1);
}
