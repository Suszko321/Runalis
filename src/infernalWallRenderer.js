import {getWallerSegments} from './eliteEncounterSystem.js';

// Each live barrier owns a small cached pixel surface. The fire is drawn in
// place, without particles in the world queue or changes to wall collision.
const stoneArt=new WeakMap(),HEIGHT=24;
const hash=(x,y)=>{let n=Math.imul(Math.round(x),374761393)^Math.imul(Math.round(y),668265263);n=Math.imul(n^(n>>>13),1274126177);return(n>>>0)/4294967295;};
const box=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};

function buildStone(b){
 const body=document.createElement('canvas'),magma=document.createElement('canvas');
 body.width=magma.width=Math.ceil(b.w);body.height=magma.height=Math.ceil(b.h+HEIGHT);
 const c=body.getContext('2d'),m=magma.getContext('2d');
 box(c,'#100d14',0,0,body.width,body.height);
 const palette=['#282128','#32252b','#3d2b2e','#211c24'];
 for(let row=0;row<body.height;row+=12)for(let col=-(row/12%2)*12;col<body.width;col+=24){
  const left=Math.max(1,col+1),right=Math.min(body.width-1,col+23),w=right-left;if(w<2)continue;
  const n=hash(b.x+col,b.y+row);
  box(c,palette[Math.floor(n*4)],left,row+1,w,10);
  box(c,'#61403a',left,row+1,w,2);box(c,'#18131c',left,row+10,w,1);
  box(c,'#472e31',left,row+3,2,6);
  if(n>.28){
   const px=left+Math.max(0,Math.min(w-3,Math.floor(n*w))),py=row+3;
   box(c,'#741f25',px-1,py-1,4,8);
   for(const [dx,dy,cw,ch] of [[0,0,2,3],[2,2,3,2],[3,4,2,4],[-2,5,3,2]]){
    box(m,'#df4b26',px+dx,py+dy,cw,ch);
    box(m,'#ffa348',px+dx,py+dy,1,Math.min(2,ch));
   }
  }
  if(n>.67)box(c,'#70504a',left+2,row+5,2,2);
 }
 // A broken basalt crest, with a molten seam under its scorched edge.
 for(let i=0;i<body.width;i+=12){box(c,'#513238',i+1,0,9,3);box(m,'#e76a32',i+3,3,5,1);}
 box(c,'#100c12',0,0,2,body.height);box(c,'#100c12',body.width-2,0,2,body.height);
 box(c,'#140d12',0,body.height-2,body.width,2);
 return {body,magma};
}

function flame(c,x,y,seed,frame,heat){
 const flicker=(frame+Math.floor(seed*13))%6,h=8+flicker*2,lean=(flicker%3-1)*2;
 c.globalAlpha=heat;
 box(c,'#8e2523',x-4,y-6,8,6);
 box(c,'#e64e26',x-3,y-8,6,7);
 box(c,'#d44325',x+lean-2,y-h+1,4,Math.max(4,h-6));
 box(c,'#ff9a37',x-2,y-6,4,5);
 box(c,'#f78931',x+lean-1,y-h+4,2,Math.max(3,h-8));
 box(c,'#ffd078',x-1,y-4,2,4);
 box(c,'#ee742e',x+lean-1,y-h-2,2,4);
 box(c,'#ffbb58',x+lean-1,y-h,2,2);
}

function drawWarning(c,h,camera,layer){
 const progress=Math.min(1,h.age/h.warning);
 c.save();c.lineWidth=2;
 for(const b of getWallerSegments(h)){
  const x=Math.round(b.x-camera.x),y=Math.round(b.y-camera.y);
  if(layer==='behind'){
   box(c,'rgba(92,24,28,.32)',x,y,b.w,b.h);
   c.strokeStyle='#170d15';c.lineWidth=5;c.strokeRect(x,y,b.w,b.h);
  }
  c.strokeStyle='#f1a04f';c.lineWidth=2;c.setLineDash(h.locked?[]:[6,4]);c.strokeRect(x,y,b.w,b.h);c.setLineDash([]);
  if(layer==='behind'){
   const vertical=b.h>b.w,len=vertical?b.h:b.w;
   for(let i=6;i<len-3;i+=18){
    const sx=x+(vertical?4:i),sy=y+(vertical?i:4);
    box(c,'#a8442b',sx,sy,4,4);
    if(i/len<progress)box(c,'#ffcb76',sx+1,sy+1,2,2);
    // Linked basalt teeth identify a coming barrier before its solid crest.
    c.strokeStyle='#c47a45';c.lineWidth=2;c.strokeRect(sx-2,sy-2,8,7);
    box(c,'#24121a',sx+1,sy-9,3,6);box(c,'#f9be66',sx+2,sy-7,1,3);
   }
  }
 }
 c.restore();
}

export function drawInfernalWall(c,h,camera,layer){
 if(h.age<h.warning){drawWarning(c,h,camera,layer);return;}
 const elapsed=h.age-h.warning,frame=Math.floor(elapsed*14);
 const heat=.74+.16*Math.sin(elapsed*7),rise=Math.min(HEIGHT,Math.ceil((elapsed+.025)/.18*8)*3);
 for(const b of h.segments||[]){
  const x=Math.round(b.x-camera.x),y=Math.round(b.y-camera.y);
  if(layer==='behind'){
   box(c,'rgba(10,7,12,.65)',x-3,y-3,b.w+6,b.h+8);
   box(c,'rgba(148,41,26,.16)',x-6,y-5,b.w+12,b.h+12);
   box(c,'rgba(246,96,29,.18)',x-2,y-1,b.w+4,b.h+4);
   continue;
  }
  if(layer!=='front')continue;
  let art=stoneArt.get(b);if(!art){art=buildStone(b);stoneArt.set(b,art);}
  c.save();c.beginPath();c.rect(x,y-rise,b.w,b.h+rise);c.clip();
  c.drawImage(art.body,x,y-HEIGHT);c.globalAlpha=heat;c.drawImage(art.magma,x,y-HEIGHT);c.restore();
  const vertical=b.h>b.w,len=vertical?b.h:b.w;
  c.save();
  // The fire crowns only existing segments; omitted walls and the exit stay open.
  for(let i=8;i<len-5;i+=24){
   const seed=hash(b.x+i,b.y),px=x+(vertical?b.w/2:i),py=y+(vertical?i:0)-rise+2;
   flame(c,px,py,seed,frame,heat);
   const t=(frame+Math.floor(seed*19))%17;
   if(t<10){c.globalAlpha=.65;box(c,t<4?'#ffc46b':'#b44727',px+(seed>.5?3:-3),py-12-t*2,2,2);}
  }
  c.restore();
 }
}
