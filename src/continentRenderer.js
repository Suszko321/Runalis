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
   if(t.structureId)continue;box(c,eco==='ascension'?'#30313e':'#303c35',x,y,32,32);box(c,'#788173',x,y,32,3);for(let j=5;j<32;j+=7){box(c,'#4c584c',x+(j%3)*3,y+j,28,5);box(c,'#1e2d29',x+(n*25),y+j,3,8);}
  }
  if(t.connector&&t.passable!==false)for(let j=0;j<32;j+=8){box(c,'#5c6254',x,y+j,32,8);box(c,'#b2aa84',x,y+j,32,2);}
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
