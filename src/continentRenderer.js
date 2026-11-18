// Pixel ground follows exactly the same cell geometry used by collision.
// Cached surfaces are bounded and rebuilt after source art becomes ready.
import {TILE} from './data.js';
import {terrainPattern,asset} from './spriteArt.js';
import {drawEchorynGround} from './echorynRenderer.js';
import {continentGroundColor,continentEcologyAt,CONTINENT_ESCARPMENTS,CONTINENT_ROADS} from './continentDefinition.js';
import {routeDistance} from './echorynGeography.js';
const roadById=new Map(CONTINENT_ROADS.map(r=>[r.id,r]));
// Native player-density ground; twelve native chunks have the same maximum
// bitmap memory as the previous forty-eight half-resolution chunks (27 MiB).
const SIZE=768,MAX_GROUND=12,caches=new WeakMap();
const hash=(x,y)=>{let n=Math.imul(x+83,374761393)^Math.imul(y+17,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;};
const box=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
// Crown, capstone, face, mortar and moss share the local stone/soil palette.
const TERRACE_COLORS={
 ivory:['#858054','#c3b98a','#8f856a','#585748','#6d7049'],
 iron:['#777454','#a8a18b','#777362','#47483d','#555d46'],
 silt:['#667459','#98a28a','#697e72','#3d544b','#506249'],
 glass:['#737485','#aaa0b6','#796f88','#4c465a','#626278']
};
function drawTerraceCell(c,t,x,y,tx,ty){
 const [crown,cap,face,mortar,moss]=TERRACE_COLORS[t.terraceStyle];
 const n=hash(tx,ty);
 if(t.connector){
  const tread=t.terraceStyle==='glass'?'#a096af':t.terraceStyle==='silt'?'#9aab91':'#bcb18c';
  for(let row=0;row<32;row+=8){
   box(c,tread,x,y+row,32,8);box(c,cap,x,y+row,32,1);box(c,mortar,x,y+row+6,32,2);
   box(c,face,x+Math.round(hash(tx,ty*4+row)*28),y+row+2,2,4);
  }
 }else if(t.biome==='cliff'){
  const side=t.terraceEdge==='east'||t.terraceEdge==='west';
  const lit=t.terraceEdge==='east'?x:x+28;
  box(c,mortar,x,y,32,32);
  for(let row=3;row<30;row+=7){
   const seam=6+Math.floor(hash(tx,ty*5+row)*19);
   box(c,face,x,y+row,seam,6);box(c,face,x+seam+2,y+row,30-seam,6);
   box(c,cap,x+2,y+row,Math.max(2,seam-4),1);
   if(row%3===2)box(c,moss,x+seam-2,y+row+3,8,3);
  }
  if(side){box(c,cap,lit,y,4,32);box(c,moss,lit+(t.terraceEdge==='east'?4:-3),y+12,3,10);}
  else if(t.terraceLip){box(c,cap,x,y,32,3);box(c,moss,x+Math.floor(n*20),y+3,7,3);}
  else{box(c,mortar,x,y+25,32,7);box(c,moss,x+Math.floor(n*16),y+24,10,3);}
 }else if(!t.roadId&&!t.structureId){
  box(c,crown,x,y,32,32);
  for(let i=0;i<4;i++){
   const xx=x+3+hash(tx*7+i,ty)*23,yy=y+3+hash(tx,ty*7+i)*23;
   box(c,t.terracePath?face:i===0?cap:moss,xx,yy,t.terracePath?7:i===0?4:5,t.terracePath?3:2);
   if(t.terracePath)box(c,cap,xx+1,yy,4,1);
   else if(i!==0)box(c,moss,xx+2,yy-3,1,3);
  }
 }
}
// Low brush follows long swales in the farm country. In the Wastes the same
// contours break into exposed seams and pale slivers of mineral crust.
function drawEasternGround(c,x,y,tx,ty,wastes){
 const swale=Math.sin(tx*.18+Math.sin(ty*.23))+Math.cos(ty*.31-tx*.09);
 if(swale<-.25)return;
 const shade=wastes?'rgba(35,29,46,.22)':'rgba(61,76,43,.22)';
 const rim=wastes?'#746978':'#8b8c58';
 for(let i=0;i<3;i++){
  const n=hash(tx*3+i,ty),xx=x+Math.floor(n*19),yy=y+3+Math.floor(hash(ty*3+i,tx)*25);
  const length=4+Math.floor(n*9);
  box(c,shade,xx,yy,length,3);box(c,shade,xx+2,yy-2,length-2,2);
  if(wastes){box(c,rim,xx+3,yy-2,length*.5,1);box(c,shade,xx+length,yy+2,3,2);}
  else{box(c,'#616d46',xx+2,yy-3,2,4);box(c,rim,xx+4,yy-5,1,4);box(c,'#64704b',xx+7,yy-2,2,3);}
 }
}

function surface(world,cx,cy){
 const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const ox=cx*SIZE,oy=cy*SIZE;
 box(c,continentGroundColor((ox+SIZE/2)/TILE,(oy+SIZE/2)/TILE),0,0,SIZE,SIZE);
 // Large ecological tones blend on a small snapped raster. No visible square
 // terrain atlas grid; individual texture pixels are variation inside landforms.
 for(let y=0;y<SIZE;y+=32)for(let x=0;x<SIZE;x+=32){const wx=ox+x+16,wy=oy+y+16,color=continentGroundColor(wx/TILE,wy/TILE);box(c,color,x,y,32,32);}
 const pattern=terrainPattern(c,0,{x:ox,y:oy});if(pattern){c.save();c.globalAlpha=.14;c.fillStyle=pattern;c.fillRect(0,0,SIZE,SIZE);c.restore();}
 for(let y=0;y<SIZE;y+=12)for(let x=0;x<SIZE;x+=12){const n=hash(ox+x,oy+y),eco=continentEcologyAt((ox+x)/TILE,(oy+y)/TILE);if(n>.72)box(c,eco==='ascension'?'#72707d':eco==='marsh'?'#56745f':eco==='aureate'?'#90946a':'#607064',x+n*6,y,4,2);else if(n<.1)box(c,'rgba(18,26,22,.16)',x,y,6,2);}
 for(let ty=cy*24;ty<(cy+1)*24;ty++)for(let tx=cx*24;tx<(cx+1)*24;tx++){
  const t=world.tiles[ty]?.[tx];if(!t)continue;const x=tx*TILE-ox,y=ty*TILE-oy,eco=t.ecology||continentEcologyAt(tx,ty),n=hash(tx,ty);
  if((eco==='aureate'||eco==='ascension')&&t.passable!==false&&!t.roadId&&!t.terraceStyle&&!t.structureId&&!t.bridge&&t.biome!=='path'){
   drawEasternGround(c,x,y,tx,ty,eco==='ascension');
  }
  if(t.biome==='water'){
   box(c,eco==='marsh'?'#284849':eco==='ascension'?'#394452':'#365962',x,y,TILE,TILE);
   for(let i=0;i<2;i++){const xx=x+3+hash(tx+i,ty)*12,yy=y+3+hash(ty+i,tx)*24;box(c,eco==='marsh'?'#567c71':'#60868a',xx,yy,4+Math.floor(hash(tx,ty+i)*12),1);}
   // A broken wet verge follows all four existing shores inside the water
   // footprint. It does not paint a walkable-looking shelf over deep water.
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(world.tiles[ty+dy]?.[tx+dx]?.biome!=='water'){
    for(let k=0;k<32;k+=4){const depth=2+Math.floor(hash(tx*9+k+dx,ty*7+dy)*3),horizontal=dy!==0;
     box(c,eco==='marsh'?'#465d4c':'#687b65',horizontal?x+k:x+(dx>0?32-depth:0),horizontal?y+(dy>0?32-depth:0):y+k,horizontal?4:depth,horizontal?depth:4);
    }
   }
  }else if(t.roadId||t.biome==='path'){
   const imperial=t.roadClass==='imperial'||t.roadClass==='provincial',color=imperial?eco==='ascension'?'#817d84':'#a29d7e':'#726b4e',road=roadById.get(t.roadId);
   // Road contours are a fine pixel mask of their authored centerline, rather
   // than the edges of the hidden collision cells.
   for(let j=0;j<32;j+=4)for(let i=0;i<32;i+=4){
    if(road&&routeDistance(tx+(i+2)/32,ty+(j+2)/32,road)>road.width/2+.18)continue;
    box(c,color,x+i,y+j,4,4);const wx=tx*32+i,wy=ty*32+j,detail=hash(Math.floor(wx/20),Math.floor(wy/12));
    if(imperial){
     // Low-contrast, staggered stone courses replace the bright 8px checker.
     if(detail>.72)box(c,'rgba(34,36,28,.08)',x+i,y+j,4,4);
     if(wy%12===0){box(c,'rgba(35,38,31,.18)',x+i,y+j,4,1);if(detail>.6)box(c,'rgba(238,220,170,.16)',x+i,y+j+1,3,1);}
     if((wx+Math.floor(wy/12)%2*8)%20===0)box(c,'rgba(35,38,31,.16)',x+i,y+j,1,4);
    }else if(hash(wx,wy)>.89){box(c,'#8e8260',x+i,y+j+1,3,1);box(c,'rgba(40,35,26,.15)',x+i+1,y+j+2,2,1);}
   }
  }
  if(t.biome==='cliff'||t.biome==='wall'){
   if(t.structureId)continue;
   if(!t.terraceStyle){box(c,eco==='ascension'?'#30313e':'#303c35',x,y,32,32);box(c,'#788173',x,y,32,3);for(let j=5;j<32;j+=7){box(c,'#4c584c',x+(j%3)*3,y+j,28,5);box(c,'#1e2d29',x+(n*25),y+j,3,8);}}
  }
  if(t.terraceStyle)drawTerraceCell(c,t,x,y,tx,ty);
  else if(t.connector&&t.passable!==false)for(let j=0;j<32;j+=8){box(c,'#5c6254',x,y+j,32,8);box(c,'#b2aa84',x,y+j,32,2);}
  if(t.terraceApproach&&t.passable!==false&&!t.roadId){
   const [,cap,face]=TERRACE_COLORS[t.terraceApproach];
   for(let i=0;i<4;i++){
    const xx=x+3+hash(tx*3+i,ty)*20,yy=y+hash(tx,ty*9+i)*26;
    box(c,face,xx,yy,7,4);box(c,cap,xx+1,yy,5,1);
   }
  }
  if(t.bridge){box(c,t.roadClass==='imperial'?'#726e59':'#3d362c',x,y,32,32);for(let j=0;j<32;j+=8){box(c,t.roadClass==='imperial'?'#b8aa83':'#99835d',x,y+j,32,6);box(c,'#443f31',x,y+j+6,32,2);}if(!world.tiles[ty-1]?.[tx]?.bridge)box(c,'#c9b688',x,y,32,4);}
 }
 // Cliff faces are visible below their collision ridge, with passable steps
 // cut out of the same authored band rather than decorative impassable pixels.
 for(const e of CONTINENT_ESCARPMENTS){if(e.y*TILE>oy+SIZE||e.y*TILE+e.h*TILE+24<oy||e.x*TILE>ox+SIZE||(e.x+e.w)*TILE<ox)continue;for(let x=Math.max(e.x,cx*24);x<Math.min(e.x+e.w,(cx+1)*24);x++){if(world.tiles[e.y]?.[x]?.biome!=='cliff')continue;const px=x*TILE-ox,py=e.y*TILE-oy;box(c,'#1e2a25',px,py+e.h*TILE-4,32,16);box(c,'#697565',px,py,32,5);}}
 return canvas;
}
export function drawContinentalGround(ctx,world,camera){
 if(world.continentId!=='runalis')return false;
 if(camera.x>=0&&camera.y>=0&&camera.x+ctx.canvas.width<640*TILE&&camera.y+ctx.canvas.height<480*TILE)return drawEchorynGround(ctx,world.echorynPresentation,camera);
 const ready=!!asset('terrain-core')?.ready;let state=caches.get(world);if(!state||state.ready!==ready){state={ready,chunks:new Map()};caches.set(world,state);}
 for(let y=Math.floor(camera.y/SIZE);y<=Math.floor((camera.y+ctx.canvas.height)/SIZE);y++)for(let x=Math.floor(camera.x/SIZE);x<=Math.floor((camera.x+ctx.canvas.width)/SIZE);x++){
  const key=`${x},${y}`;let image=state.chunks.get(key);if(!image){image=surface(world,x,y);state.chunks.set(key,image);if(state.chunks.size>MAX_GROUND)state.chunks.delete(state.chunks.keys().next().value);}else{state.chunks.delete(key);state.chunks.set(key,image);}
  ctx.drawImage(image,Math.round(x*SIZE-camera.x),Math.round(y*SIZE-camera.y),SIZE,SIZE);
 }
 return true;
}
export function continentalGroundStats(world){return {cachedGround:caches.get(world)?.chunks.size||0,maxGround:MAX_GROUND};}
