import {eliteCueProfile} from './eliteHazardPresentation.js';

// Hand-authored pixel sigils. Shape and motion remain distinct without colour.
const SIGILS={
 snowflake:['100010001','010010010','001010100','000111000','111121111','000111000','001010100','010010010','100010001'],
 'ice-crown':['100010001','120121021','110111011','011111110','001111100','000121000','000111000','000111000','000010000'],
 chains:['011000110','122101221','101101101','122101221','011111110','000121000','011111110','110101011','011000110'],
 'infernal-sun':['100010001','010111010','001121100','011111110','111222111','011111110','001111100','010111010','100010001'],
 crosshair:['000010000','001111100','010010010','010010010','111121111','010010010','010010010','001111100','000010000'],
 lightning:['000011100','000111000','001120000','011111100','000121000','000110000','001100000','011000000','010000000'],
 spiral:['001111100','011000110','110110011','101111101','101020101','101100101','110001101','011111001','000000011'],
 'black-star':['100010001','010010010','001111100','001101100','111020111','001101100','001111100','010010010','100010001'],
 flame:['000010000','000110000','001120100','101111100','111121110','111222111','011221110','001111100','000111000'],
 'volcanic-crown':['100000001','110010011','011111110','011111110','112010211','111111111','011010110','001111100','001010100'],
 shield:['111111111','111222111','110121011','110121011','110121011','011111110','011121110','001111100','000111000'],
 branches:['100010001','010010010','001121100','000111000','110111011','011121110','000111000','000111000','001111100']
};
export const ELITE_SIGILS=Object.freeze(SIGILS);
const box=(c,color,x,y,w=3,h=3)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function line(c,color,points,width=2){
 const pixels=[];
 for(let i=1;i<points.length;i++){
  let x=Math.round(points[i-1][0]),y=Math.round(points[i-1][1]);const endX=Math.round(points[i][0]),endY=Math.round(points[i][1]);
  const dx=Math.abs(endX-x),dy=-Math.abs(endY-y),sx=x<endX?1:-1,sy=y<endY?1:-1;let error=dx+dy;
  for(let n=0;n<=dx-dy;n++){pixels.push([x,y]);if(x===endX&&y===endY)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
 }
 c.fillStyle='#100f18';for(const [x,y] of pixels)c.fillRect(x-Math.floor((width+2)/2),y-Math.floor((width+2)/2),width+2,width+2);
 c.fillStyle=color;for(const [x,y] of pixels)c.fillRect(x-Math.floor(width/2),y-Math.floor(width/2),width,width);
}
const point=(x,y,a,r)=>[x+Math.cos(a)*r,y+Math.sin(a)*r];
export function drawEliteSigil(c,kind,x,y,scale=2){
 const p=eliteCueProfile(kind),mask=SIGILS[p.symbol],left=Math.round(x-4.5*scale),top=Math.round(y-4.5*scale);
 for(let row=0;row<9;row++)for(let col=0;col<9;col++)if(mask[row][col]!=='0')box(c,'#101018',left+col*scale-1,top+row*scale-1,scale+2,scale+2);
 for(let row=0;row<9;row++)for(let col=0;col<9;col++)if(mask[row][col]!=='0')box(c,mask[row][col]==='2'?p.colors[2]:p.colors[1],left+col*scale,top+row*scale,scale,scale);
}
function crack(c,x,y,a,r,color,seed){
 const pts=[point(x,y,a,r*.12),point(x,y,a+.08+(seed%3)*.05,r*.36),point(x,y,a-.08,r*.61),point(x,y,a+.04,r*.87)];line(c,color,pts);
 for(let j=1;j<3;j++){const p=pts[j];line(c,color,[p,point(p[0],p[1],a+(j%2?.65:-.65),r*.15)],1);}
}
function ice(c,x,y,r,age,warning,shatter){
 const frame=Math.floor(age*12),phase=(frame%16)/16,color=shatter?'#d0f9f3':'#6daabd';
 for(let i=0;i<(shatter?8:6);i++){
  const a=i*Math.PI/(shatter?4:3);crack(c,x,y,a,r,color,i);
  const [px,py]=point(x,y,a,r*(shatter?.82:.9-phase*.45));box(c,'#183343',px-3,py-3,6,6);box(c,'#d5fff2',px-1,py-2,2,4);
  if(!warning&&shatter){const [sx,sy]=point(x,y,a,r*.7);line(c,'#effff5',[[sx-4,sy+6],[sx,sy-23],[sx+5,sy+6]],3);}
 }
}
function vortex(c,x,y,r,age,collapse){
 const rotation=Math.floor(age*12)/12*1.8;
 for(let arm=0;arm<3;arm++){
  const pts=[];for(let i=0;i<13;i++){const a=arm*Math.PI*2/3+rotation+i*.14,rr=r*(.88-i*.057);pts.push(point(x,y,a,rr));}line(c,collapse?'#d6a9d6':'#9472bd',pts,2);
  const [px,py]=pts[8],a=Math.atan2(y-py,x-px);line(c,'#edcce9',[point(px,py,a+2.55,8),[px,py],point(px,py,a-2.55,8)],2);
 }
 box(c,'#130e1b',x-7,y-7,14,14);box(c,'#dabce3',x-3,y-3,6,6);box(c,'#100c16',x-1,y-1,2,2);
}
function magma(c,x,y,r,age,warning,kind){
 const color=warning?'#a75132':'#ed7334',count=kind==='chamber'?10:7;
 for(let i=0;i<count;i++)crack(c,x,y,i*Math.PI*2/count,r,color,i);
 for(let i=0;i<12;i++){const a=i*2.4,rr=r*(.25+(i%4)*.16),[px,py]=point(x,y,a,rr),hot=(Math.floor(age*9)+i)%5<2;box(c,'#351a20',px-4,py-2,8,5);box(c,hot?'#ffd880':'#b94b2c',px-2,py,4,2);}
}
function lightning(c,h,camera,active){
 const g=h.geometry;if(!g)return;const x=g.x-camera.x,y=g.y-camera.y,dx=g.endX-g.x,dy=g.endY-g.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
 for(const sign of [-1,1]){
  const pts=[];for(let i=0;i<=12;i++)pts.push([x+dx*i/12+nx*(g.width*.63*sign+(i%2?3:-3)),y+dy*i/12+ny*(g.width*.63*sign+(i%2?3:-3))]);line(c,active?'#fff4b5':'#81a0cd',pts,active?3:1);
 }
 if(active){const pts=[];for(let i=0;i<=20;i++)pts.push([x+dx*i/20+nx*(i%2?7:-7),y+dy*i/20+ny*(i%2?7:-7)]);line(c,'#fbffe5',pts,4);}
 for(let i=0;i<4;i++){const t=(i+1)/5,px=x+dx*t,py=y+dy*t;drawEliteSigil(c,'shocker',px,py,1);}
}
function chargeCone(c,h,camera,active){
 const g=h.geometry,x=g.x-camera.x,y=g.y-camera.y;
 for(let i=1;i<=4;i++){
  const rr=g.radius*i/5+(active?10:0),a=g.angle;
  line(c,active?'#fff4ca':'#c7b27d',[point(x,y,a-.6,rr),point(x,y,a,rr+12),point(x,y,a+.6,rr)],active?3:2);
 }
}
export function drawEliteGroundArt(c,h,camera){
 const x=h.x,y=h.y,r=h.radius,warning=h.age<h.warning;
 // Build rounded geometry once in world coordinates. Rounding translated
 // spiral points independently can shift a few pixels as the camera moves.
 c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));c.lineCap='square';c.lineJoin='miter';
 if(['freezer','shatter'].includes(h.kind))ice(c,x,y,r,h.age,warning,h.kind==='shatter');
 else if(['vortex','collapse'].includes(h.kind))vortex(c,x,y,r,h.age,h.kind==='collapse');
 else if(['molten','moltenDeath','chamber'].includes(h.kind))magma(c,x,y,r,h.age,warning,h.kind);
 else if(h.kind==='shocker')lightning(c,h,{x:0,y:0},!warning);
 else if(h.kind==='bulwark')chargeCone(c,h,{x:0,y:0},!warning);
 else if(h.kind==='artillery'){
  // Broken crosshair while acquiring; four bright clamps once committed.
  const size=h.locked?18:28,colors=eliteCueProfile('artillery').colors;
  for(const [dx,dy] of [[-1,-1],[-1,1],[1,-1],[1,1]])line(c,h.locked?colors[2]:colors[1],[[x+dx*size,y+dy*(size+10)],[x+dx*size,y+dy*size],[x+dx*(size+10),y+dy*size]],3);
 }
 c.restore();
}
function fire(c,x,y,frame,size=1){
 const h=(12+frame%4*3)*size;box(c,'#371622',x-5*size,y-h,10*size,h+3);box(c,'#dd4c2c',x-3*size,y-h+3,6*size,h);box(c,'#ffac4a',x-2*size,y-h+7,4*size,h-5);box(c,'#fff0b1',x-size,y-3*size,2*size,4*size);
}
export function drawEliteLaunchArt(c,h,camera){
 const x=h.x-camera.x,y=h.y-camera.y,r=h.radius,warning=h.age<h.warning,frame=Math.floor(h.age*12);
 if(warning){
  if(h.kind==='artillery'&&h.locked){
   const t=Math.max(0,Math.min(1,(h.age-(h.tracking||0))/(h.warning-(h.tracking||0)))),sx=(h.launchSourceX??h.owner.x)-camera.x,sy=(h.launchSourceY??h.owner.y-38)-camera.y;
   const px=sx+(x-sx)*t,py=sy+(y-sy)*t-Math.sin(Math.PI*t)*170;
   for(let i=1;i<=6;i++){const q=Math.max(0,t-i*.025),qx=sx+(x-sx)*q,qy=sy+(y-sy)*q-Math.sin(Math.PI*q)*170;box(c,i<3?'#e9c28c':'#5b5151',qx-2,qy-4,4,5);}
   box(c,'#1c1420',px-7,py-12,14,22);box(c,'#69494b',px-5,py-10,10,16);box(c,'#d4924a',px-4,py-5,8,9);box(c,'#ffe2a5',px-2,py-2,4,5);fire(c,px,py-12,frame,.5);
  }else if(['freezer','shatter'].includes(h.kind)){
   for(let i=0;i<8;i++){const a=i*Math.PI/4,[px,py]=point(x,y,a,r*.8);box(c,'#153343',px-3,py-9,6,11);box(c,'#bfece2',px-1,py-7,2,7);}
  }else if(h.kind==='shocker'){
   const g=h.geometry;if(g)for(const [px,py] of [[g.x-camera.x,g.y-camera.y],[g.endX-camera.x,g.endY-camera.y]]){line(c,'#ffe9a2',[[px-6,py-20],[px+4,py-14],[px-3,py-9],[px+3,py]],2);box(c,'#f7ffdd',px-2,py-25-frame%3*2,4,4);}
  }else if(['moltenDeath','chamber'].includes(h.kind)){
   for(let i=0;i<8;i++){const [px,py]=point(x,y,i*Math.PI/4,r*.82);fire(c,px,py,frame+i,.6);}
  }
  return;
 }
 const t=Math.min(1,(h.age-h.warning)/.35);
 if(h.kind==='shocker'){lightning(c,h,camera,true);return;}
 if(h.kind==='bulwark'){chargeCone(c,h,camera,true);return;}
 if(['freezer','shatter'].includes(h.kind)){ice(c,x,y,r,h.age,false,h.kind==='shatter');return;}
 if(['vortex','collapse'].includes(h.kind)){
  for(let i=0;i<16;i++){const a=i*Math.PI/8+h.age,[px,py]=point(x,y,a,r*(h.kind==='collapse'?1-t:.65));box(c,'#22182e',px-3,py-3,7,7);box(c,'#dab3df',px-1,py-1,3,3);}return;
 }
 if(h.kind==='molten'){
  for(let i=0;i<7;i++){const [px,py]=point(x,y,i*2.4,r*(.35+(i%3)*.17));fire(c,px,py,frame+i,.55);}return;
 }
 if(['artillery','moltenDeath','chamber'].includes(h.kind)){
  for(let i=0;i<18;i++){const a=i*2.4,[px,py]=point(x,y,a,r*(.2+t*.65));box(c,'#35202a',px-5,py-5,10,9);box(c,i%3?'#ef994d':'#927760',px-3,py-3,6,5);if(i%3)box(c,'#ffe6a2',px-1,py-3,2,3);}
  for(let i=0;i<8;i++){const [px,py]=point(x,y,i*Math.PI/4,r*.45);fire(c,px,py-((1-t)*30),frame+i,1-t*.45);}
 }
}
export function drawEliteGuard(c,e,camera,charge=0){
 const x=e.x-camera.x,y=e.y-camera.y,a=Math.atan2(e.eliteGuardY,e.eliteGuardX),[px,py]=point(x,y,a,30);
 drawEliteSigil(c,'bulwark',px,py-14,2);
 for(let i=0;i<3;i++){box(c,'#121017',px-9+i*7,py+4,5,5);if(i<charge)box(c,'#f4dda0',px-8+i*7,py+5,3,3);}
}
export function drawEliteHealing(c,e,world,camera,progress){
 const x=e.x-camera.x,y=e.y-camera.y,frame=Math.floor(progress*18);
 drawEliteSigil(c,'regenerator',x,y-42,2);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,[px,py]=point(x,y,a,32);box(c,'#172b20',px-3,py-3,6,6);if(i/8<progress)box(c,'#daf4ae',px-1,py-1,2,2);}
 // Show whom the chant supports; foliage links are bounded and do not resemble
 // damaging beams. Health values stay in the combat coordinator.
 for(const ally of (world.enemies||[]).filter(a=>a!==e&&a.hp>0&&a.hp<a.maxHp&&Math.hypot(a.x-e.x,a.y-e.y)<180).slice(0,4)){
  const ax=ally.x-camera.x,ay=ally.y-camera.y;line(c,'#7aa46d',[[x,y-12],[(x+ax)/2,(y+ay)/2-18],[ax,ay-12]],1);
 }
 for(let i=0;i<5;i++){const a=i*2.4,[px,py]=point(x,y,a,22);box(c,'#99c980',px,py-12-frame%6*3,3,5);}
}
export function drawEliteHealingRelease(c,e,camera,progress){
 const x=e.x-camera.x,y=e.y-camera.y;c.save();c.globalAlpha=1-progress;
 for(let i=0;i<8;i++){const [px,py]=point(x,y-16,i*Math.PI/4,12+progress*32);box(c,'#1c3222',px-3,py-3-progress*14,7,5);box(c,'#c9eca0',px-2,py-2-progress*14,5,3);box(c,'#effbd0',px,py-2-progress*14,2,2);}
 c.restore();
}
