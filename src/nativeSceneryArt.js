// Native-resolution scenery drawings. Dimensions and pivots come from the
// existing authored objects; no collision, navigation or world data is changed.
const rect=(c,color,x,y,w,h)=>{if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const hash=(x,y)=>{let n=Math.imul(x+83,374761393)^Math.imul(y+17,668265263);return ((Math.imul(n^(n>>>13),1274126177)>>>0)/4294967296);};
function stone(c,p,x,y,w,h,large=false){
 rect(c,p.ink,x,y,w,h);const bw=large?26:19,bh=large?13:10;
 for(let row=0;row<h;row+=bh)for(let col=-bw;col<w;col+=bw){const start=col+(Math.floor(row/bh)%2?bw/2:0),l=Math.max(1,start),r=Math.min(w-1,start+bw-1),hh=Math.min(bh-1,h-row-1);if(r<=l||hh<=0)continue;
  const n=hash(Math.floor(x+col),Math.floor(y+row));rect(c,n>.72?p.dark:p.stone,x+l,y+row,r-l,hh);rect(c,p.light,x+l+1,y+row,Math.max(1,r-l-2),1);rect(c,p.dark,x+l,y+row+hh-1,r-l,1);
  if(n>.64){rect(c,p.dark,x+l+3,y+row+3,Math.min(5,r-l-3),1);rect(c,p.light,x+l+4,y+row+4,Math.min(3,r-l-4),1);}
 }
 rect(c,p.light,x,y,w,1);rect(c,p.ink,x,y+h-2,w,2);
}
function wood(c,p,x,y,w,h,vertical=false){
 rect(c,p.ink,x,y,w,h);
 const span=vertical?w:h;for(let v=1;v<span;v+=8){const size=Math.min(7,span-v-1);
  rect(c,p.wood,x+(vertical?v:1),y+(vertical?1:v),vertical?size:w-2,vertical?h-2:size);
  rect(c,p.light,x+(vertical?v+1:2),y+(vertical?2:v),vertical?1:w-4,vertical?h-4:1);
  for(let t=8;t<(vertical?h:w)-5;t+=19){const offset=Math.floor(hash(t,v)*4);rect(c,p.dark,x+(vertical?v+3:t),y+(vertical?t:v+3+offset%2),vertical?1:9,vertical?9:1);}
 }
}
function roof(c,p,x,y,w,h,flat=false){
 for(let row=0;row<h;row++){const inset=flat?0:Math.floor((h-row)*.38),rw=w-inset*2;
  rect(c,p.ink,x+inset-2,y+row,rw+4,1);rect(c,row%7===0?p.roofLight:p.roof,x+inset,y+row,rw,1);
  if(row%7===6)rect(c,p.dark,x+inset,y+row,rw,1);
  if(row%7>0&&row%7<6)for(let col=inset+8+(Math.floor(row/7)%2)*8;col<w-inset-2;col+=17){rect(c,p.dark,x+col,y+row,1,1);if(row%7===1)rect(c,p.roofLight,x+col+2,y+row,9,1);}
 }
 rect(c,p.ink,x-2,y+h,w+4,4);rect(c,p.wood,x,y+h,w,2);
}
function windowArt(c,p,x,y,w=13,h=23){
 rect(c,p.ink,x-2,y-2,w+4,h+5);rect(c,p.dark,x,y,w,h);rect(c,p.glass,x+2,y+1,w-3,h-3);
 rect(c,p.light,x+2,y+1,2,h-3);rect(c,p.wood,x+Math.floor(w/2),y,2,h);rect(c,p.wood,x,y+Math.floor(h/2),w,2);rect(c,p.light,x-2,y+h+1,w+4,1);
}
function door(c,p,cx,base,available,open=false){
 const h=Math.min(68,available-4),w=Math.min(36,Math.max(20,h*.55));
 rect(c,p.light,cx-w/2-4,base-h-3,w+8,h+4);rect(c,p.ink,cx-w/2-2,base-h-1,w+4,h+2);
 if(!open){wood(c,p,cx-w/2,base-h,w,h,true);rect(c,p.dark,cx-w/2,base-14,w,3);rect(c,p.gold,cx+w/2-5,base-h/2,2,3);}
 rect(c,p.light,cx-w/2-6,base+1,w+12,2);
}
function crenels(c,p,x,y,w){for(let i=0;i<w;i+=18){stone(c,p,x+i,y-9,12,16);rect(c,p.light,x+i,y-9,12,2);}}
function wheel(c,p,x,y,r){
 // Discrete horizontal spans give the wheel a pixel contour at native scale.
 for(let dy=-r;dy<=r;dy++){const half=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy)));rect(c,p.ink,x-half,y+dy,half*2+1,1);}
 for(let dy=-r+2;dy<=r-2;dy++){const half=Math.floor(Math.sqrt(Math.max(0,(r-2)**2-dy*dy)));rect(c,p.wood,x-half,y+dy,half*2+1,1);}
 rect(c,p.dark,x-r+3,y-1,r*2-5,2);rect(c,p.dark,x-1,y-r+3,2,r*2-5);rect(c,p.gold,x-2,y-2,4,4);
}
function architecture(c,p,w,h,o,type){
 const base=h-7;
 if(['House','Granary','Abbey','Tower'].includes(type)){
  const tower=type==='Tower',abbey=type==='Abbey',left=tower?Math.round(w*.2):5,bw=tower?Math.round(w*.6):w-10,top=Math.round(h*(tower?.22:.39));
  stone(c,p,left,top,bw,base-top,true);
  if(!['aureate','cosmic','blackglass'].includes(o.style)&&!tower){for(let x=left+5;x<left+bw-4;x+=Math.max(36,bw/4)){wood(c,p,x,top,6,base-top,true);}wood(c,p,left,base-7,bw,6);}
  if(tower&&!['imperial','pass','timber'].includes(o.style)){crenels(c,p,left-3,top,bw+6);rect(c,p.light,left-4,top+8,bw+8,3);}else roof(c,p,tower?left-8:1,3,tower?bw+16:w-2,top-4,type==='Granary');
  if(o.openFront){rect(c,p.ink,left+7,top+8,bw-14,base-top-9);for(const xx of [left+8,left+bw-14])wood(c,p,xx,top+8,6,base-top-8,true);wood(c,p,left+6,base-4,bw-12,4);}
  else {door(c,p,w/2,base,base-top);for(const xx of [left+bw*.2,left+bw*.77])if(bw>75)windowArt(c,p,xx-6,top+13,12,Math.min(26,base-top-20));}
  if(tower&&h>160)for(const xx of [left+10,left+bw-23])windowArt(c,p,xx,top+65,10,22);
  if(tower&&o.style==='aureate'){rect(c,p.gold,left+3,top+15,bw-6,2);rect(c,p.glass,left+bw-8,top+19,4,24);}
  if(tower&&o.style==='cosmic'){c.clearRect(left,top+24,bw*.3,13);c.clearRect(left+bw*.7,base-43,bw*.3,19);rect(c,p.glass,w/2,top+18,1,base-top-30);}
  if(!tower&&o.style==='fen')for(const xx of [left+8,left+bw-16])wood(c,p,xx,base-12,7,17,true);
  if(abbey){for(const xx of [2,w-20]){stone(c,p,xx,h*.2,18,h*.75,true);roof(c,p,xx-3,2,24,h*.2);}rect(c,p.gold,w/2-2,top+4,4,28);rect(c,p.gold,w/2-10,top+12,20,3);}
  if(type==='Granary'){for(const xx of [w*.15,w*.77])wood(c,p,xx,base-18,13,24,true);rect(c,p.gold,w/2-14,top+9,28,3);}
  if(o.ruined){c.clearRect(w*.39,3,w*.17,top*.45);c.clearRect(left+bw-13,top+10,15,20);stone(c,p,w*.6,base-9,27,10);}
  return;
 }
 if(type==='Wall'||type==='InscribedWall'){stone(c,p,1,12,w-2,h-13,true);crenels(c,p,1,12,w-2);if(o.vertical){rect(c,p.light,1,1,3,h-2);rect(c,p.dark,w-8,3,6,h-5);}if(type==='InscribedWall')for(let y=30;y<h-20;y+=7)rect(c,p.gold,w*.3,y,w*.4-(y%3)*4,1);return;}
 if(['Gate','Aqueduct','CausewayPier','Ruin'].includes(type)){
  if(type==='CausewayPier'){stone(c,p,w*.2,h*.2,w*.6,h*.75,true);stone(c,p,w*.12,h*.2-8,w*.76,10);}
  else if(type==='Ruin'){for(let i=0;i<5;i++){const ph=h*(.28+hash(i,Number(o.variant||0))*.65);stone(c,p,5+i*(w-12)/5,h-ph-5,Math.max(12,w*.12),ph,true);}for(let x=0;x<w-12;x+=22)stone(c,p,x,base-9+hash(x,2)*4,20,10);}
  else {const pier=Math.max(20,w*(type==='Gate'?.23:.16)),top=h*.25;stone(c,p,1,top,w-2,Math.max(18,h*.15),true);for(const x of [1,w-pier-1])stone(c,p,x,top,pier,base-top,true);for(let row=0;row<14;row++){const inset=Math.floor((14-row)*.8);rect(c,p.stone,pier+inset,top+h*.15+row,w-2*(pier+inset),1);}crenels(c,p,0,top,w);if(type==='Gate'){if(o.style==='imperial')for(const x of [0,w-pier-4])roof(c,p,x,1,pier+4,top-2);for(const x of [pier/2,w-pier/2]){rect(c,p.dark,x-7,top+24,14,35);rect(c,p.roof,x-5,top+25,10,28);rect(c,p.gold,x-1,top+30,2,14);}}}
  return;
 }
 if(type==='Spire'){for(let row=2;row<h-7;row++){const half=Math.min(w*.36,(row+4)*.25),shift=(Number(o.variant||0)%2?1:-1)*Math.floor(row/27);rect(c,p.ink,w/2-half+shift,row,half*2+2,1);rect(c,p.dark,w/2-half+shift+2,row,half*2-3,1);rect(c,p.stone,w/2+shift-2,row,3,1);if(row%17===0)rect(c,p.light,w/2-half+shift+3,row,half-3,1);}return;}
}
function prop(c,p,w,h,o,type){
 const b=h-5,cx=w/2;
 if(type==='Court'){
  // Ground has a compressed contrast range; wall-strength black mortar competed
  // with silhouettes and looked like a vertical facade laid on the ground.
  rect(c,p.dark,0,0,w,h);c.save();c.globalAlpha=.24;
  for(let y=1;y<h;y+=15)for(let x=-28;x<w;x+=28){const xx=x+(Math.floor(y/15)%2)*14,l=Math.max(0,xx),r=Math.min(w,xx+26);if(r<=l)continue;rect(c,p.stone,l,y,r-l,13);if(hash(x,y)>.68)rect(c,p.light,l+2,y,Math.max(1,r-l-4),1);}
  c.restore();return;
 }
 if(type==='Farm'){rect(c,'#493e2c',0,0,w,h);for(let y=5;y<h-4;y+=17){rect(c,'#302b22',2,y+7,w-4,5);for(let x=5;x<w-5;x+=13){rect(c,p.green,x,y-2,2,10);rect(c,p.gold,x+2,y-5,3,6);rect(c,p.light,x+2,y-5,1,3);rect(c,p.green,x-3,y+1,4,1);}}return;}
 if(['Stairs','Boardwalk'].includes(type)){wood(c,p,0,1,w,h-2);for(let y=2;y<h-1;y+=8){rect(c,p.ink,0,y+6,w,2);rect(c,p.light,1,y,w-2,1);}return;}
 if(type==='TimberStack'){for(let row=0;row<4;row++)for(let col=0;col<3-row%2;col++){const xx=3+col*w/3+(row%2)*w/7,yy=b-row*10;wood(c,p,xx,yy-8,w/3-2,9);rect(c,p.gold,xx+3,yy-6,5,4);rect(c,p.dark,xx+5,yy-5,2,1);}return;}
 if(type==='Market'||type==='FishRack'){
  for(const x of [5,w-11])wood(c,p,x,5,6,b-5,true);
  if(type==='Market'){wood(c,p,4,b-24,w-8,16);roof(c,p,0,2,w,Math.max(20,h*.34),true);for(let x=8;x<w-12;x+=16){rect(c,x%3?p.gold:p.glass,x,b-31,11,7);rect(c,p.light,x+2,b-32,6,1);}}
  else {wood(c,p,2,5,w-4,5);for(let x=13;x<w-8;x+=16){rect(c,p.gold,x,10,1,h*.28);rect(c,p.dark,x-3,h*.3,7,h*.25);rect(c,p.light,x-2,h*.3+2,3,h*.2);}}
  return;
 }
 if(type==='Wagon'){const top=h*.35;wood(c,p,3,top,w-6,b-12-top);wood(c,p,3,top+4,w-6,5);wood(c,p,4,b-15,w-8,5);for(const x of [w*.22,w*.77])wheel(c,p,x,b-10,Math.min(15,h*.17));for(const x of [w*.15,w*.8])wood(c,p,x,7,4,top+7,true);rect(c,p.light,w*.13,5,w*.73,3);return;}
 if(['Sign','WardStakes','Scales','Bell','Brazier'].includes(type)){
  wood(c,p,cx-3,5,6,b-5,true);wood(c,p,cx-14,b-4,28,5);
  if(type==='Sign'){wood(c,p,2,6,w-4,h*.38);rect(c,p.light,8,12,w-16,2);rect(c,p.gold,8,19,w*.53,1);}
  if(type==='WardStakes'){for(let i=0;i<5;i++){const x=3+i*(w-8)/4,yy=12+(i%2)*6;wood(c,p,x,yy,3,b-yy,true);rect(c,p.glass,x-3,yy+5,9,2);rect(c,p.light,x,yy+1,2,9);}}
  if(type==='Scales'){rect(c,p.gold,3,9,w-6,3);for(const x of [8,w-9]){rect(c,p.dark,x,12,1,h*.4);rect(c,p.gold,x-7,h*.5,15,3);rect(c,p.light,x-5,h*.5,10,1);}}
  if(type==='Bell'){wood(c,p,2,4,w-4,5);const bh=Math.min(42,h*.43),bw=Math.min(25,w*.55);for(let y=0;y<bh;y++){const half=bw*(.25+.25*(y/bh)**2);rect(c,p.ink,cx-half-1,12+y,half*2+2,1);rect(c,p.gold,cx-half,12+y,half*2-1,1);rect(c,p.light,cx-half+2,12+y,Math.max(1,half*.25),1);}rect(c,p.ink,cx-bw*.6,12+bh,bw*1.2,3);rect(c,p.gold,cx-bw*.6,12+bh,bw*1.2,1);rect(c,p.dark,cx-2,15+bh,4,4);}
  if(type==='Brazier'){const fireBase=h*.4;rect(c,p.ink,cx-15,fireBase,30,8);rect(c,p.gold,cx-12,fireBase,24,5);for(let i=0;i<3;i++){const x=cx-9+i*7,top=5+(i%2)*5;for(let y=top;y<fireBase;y+=2){const width=2+Math.min(5,(y-top)*.25);rect(c,'#ad532f',x-width/2,y,width,2);if(y>top+4)rect(c,'#e18c3e',x-width/2+1,y,Math.max(1,width-2),2);if(y>top+10)rect(c,'#f1c96e',x,y,1,2);}}}
  return;
 }
 if(type==='ReedBed'){for(let i=0;i<26;i++){const x=2+hash(i,3)*(w-5),hh=10+hash(i,9)*(h-18);rect(c,p.green,x,b-hh,1,hh);rect(c,p.gold,x-1,b-hh-5,3,7);rect(c,p.light,x,b-hh-5,1,3);}return;}
 if(['Fountain','Cairn','Sluice'].includes(type)){
  if(type==='Cairn'){for(let i=0;i<5;i++){const ww=w*(.95-i*.14);stone(c,p,(w-ww)/2,b-i*9-8,ww,10);}return;}
  if(type==='Sluice'){stone(c,p,0,8,w*.22,h-12,true);stone(c,p,w*.78,8,w*.22,h-12,true);wood(c,p,w*.22,h*.3,w*.56,h*.55,true);rect(c,p.gold,cx-2,2,4,h*.35);return;}
  stone(c,p,2,b-18,w-4,17);rect(c,p.dark,6,b-17,w-12,6);rect(c,p.glass,8,b-16,w-16,3);stone(c,p,cx-7,h*.25,14,h*.6);rect(c,p.light,cx-13,h*.24,26,3);rect(c,p.glass,cx-1,5,2,h*.25);return;
 }
 if(type==='Pine'||type==='Willow'){
  wood(c,p,cx-5,h*.4,10,h*.56,true);
  if(type==='Pine')for(let tier=0;tier<6;tier++){
   const yy=4+tier*h*.105,hh=h*.23,half=(tier+1)*w*.073;
   for(let row=0;row<hh;row++){const span=Math.max(1,half*row/hh),jag=Math.floor(hash(tier,Math.floor(row/3))*3);rect(c,p.ink,cx-span-jag,yy+row,span*2+jag+1,1);rect(c,p.dark,cx-span+1,yy+row,span*2-2,1);if(row>3)rect(c,p.green,cx-span+2,yy+row,Math.max(1,span*1.15),1);if(row%7===3)rect(c,p.light,cx-span+3,yy+row,Math.max(1,span*.4),1);}
  }else{
   for(let lobe=0;lobe<6;lobe++){const xx=w*.12+lobe*w*.15,yy=12+Math.abs(lobe-2.5)*7,rx=w*.17,ry=h*.17;for(let row=-ry;row<=ry;row++){const half=rx*Math.sqrt(Math.max(0,1-(row/ry)**2));rect(c,p.dark,xx-half,yy+ry+row,half*2,1);if(row<ry*.55)rect(c,p.green,xx-half+2,yy+ry+row,Math.max(1,half*1.5),1);if(row%9===0)rect(c,p.light,xx-half+3,yy+ry+row,Math.max(1,half*.5),1);}for(let j=0;j<5;j++){const fx=xx-rx*.7+j*rx*.35,start=yy+ry,fall=h*.27+hash(lobe,j)*h*.15;rect(c,p.dark,fx,start,2,fall);for(let k=0;k<fall;k+=5)rect(c,p.green,fx-1+(k%2),start+k,3,3);}}
  }
 }
}
const STRUCTURES=new Set(['House','Granary','Abbey','Tower','Gate','Wall','InscribedWall','Ruin','Aqueduct','CausewayPier','Spire']);
export function makeNativeScenery(type,o,p){
 const w=Math.max(16,Math.round(o.artWidth||96)),h=Math.max(16,Math.round(o.artHeight||128));
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):null;if(!canvas)return null;
 canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 if(STRUCTURES.has(type))architecture(c,p,w,h,o,type);else prop(c,p,w,h,o,type);
 return canvas;
}
