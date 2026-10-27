// A bounded, viewport-driven terrain cache and reusable forest kit.
// Physical footprints come from echorynLayout; canopy fading never changes collision.
import {TILE} from './data.js';
import {asset,terrainPattern} from './spriteArt.js';
import {echorynGroundColor,echorynRegionAt} from './echorynGeography.js';
import {textureHash} from './echorynLayout.js';
import {drawOrrakaiWallArt,drawOrrakaiStairArt,orrakaiArtReady} from './orrakaiRenderer.js';

const CHUNK=512,MAX_CHUNKS=48,groundCaches=new WeakMap(),visibleTrees=new WeakMap(),treeArt=new Map();
const forestKit=asset('echoryn-forest-kit');
const nativeCanopies=asset('echoryn-canopies');
const NATIVE_CANOPIES=new Set([0,1,2,4,5,6]);
const landmarkKit=asset('echoryn-landmark-kit');let landmarkRects=null;
if(typeof Image!=='undefined')fetch(new URL('../assets/art/sprites/echoryn-landmark-kit.json',import.meta.url)).then(r=>r.json()).then(m=>landmarkRects=m.spriteRects).catch(e=>console.warn('Echoryn landmark manifest unavailable',e));
export function drawEchorynLandmark(c,index,x,y,w,h){
 if(!landmarkKit?.ready||!landmarkRects)return false;
 c.drawImage(landmarkKit.image,...landmarkRects[index],Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));return true;
}
export function drawForestKit(c,index,x,y,w,h){
 if(NATIVE_CANOPIES.has(index)&&nativeCanopies?.ready){c.drawImage(nativeCanopies.image,index%4*256,Math.floor(index/4)*304,256,304,Math.round(x-w/2),Math.round(y-h*295/304),Math.round(w),Math.round(h));return true;}
 if(!forestKit?.ready)return false;c.drawImage(forestKit.image,index%4*160,Math.floor(index/4)*192,160,192,Math.round(x-w/2),Math.round(y-h*186/192),Math.round(w),Math.round(h));return true;
}
export function drawEchorynMajorPiece(c,o,x,y,actor=null){
 if(!o.echorynMajor)return false;
 const landmark=(index,base,w,h)=>{
  c.save();if(actor&&Math.abs(actor.x-o.x)<w/2&&actor.y<(o.depthY||o.y)+20&&actor.y>(o.depthY||o.y)-h)c.globalAlpha*=.24;
  const drawn=drawEchorynLandmark(c,index,x,base,w,h);c.restore();return drawn;
 };
 if(o.pieceType==='keep'&&['veyr','redSeal'].includes(o.majorPoiStyle)){
  return landmark(o.majorPoiStyle==='veyr'?0:1,y+96,o.majorPoiStyle==='veyr'?340:360,o.majorPoiStyle==='veyr'?416:360);
 }
 if(o.majorPoiStyle==='chapel'&&o.pieceType==='ruinWall'&&o.orientation==='horizontal'&&o.length===19){
  if(landmark(2,y+224,360,426))return true;
 }
 if(o.pieceType==='courtyard'){
  const w=o.width*TILE,h=o.height*TILE;
  c.save();c.fillStyle=terrainPattern(c,2,{x:o.x-x,y:o.y-y})||'#626552';c.fillRect(x-w/2,y-h/2,w,h);c.fillStyle='rgba(49,51,37,.26)';c.fillRect(x-w/2,y-h/2,w,h);
  for(let i=0;i<w;i+=64){box(c,'#7c7b64',x-w/2+i,y-h/2,3,h);}
  if(o.majorPoiStyle==='chapel'){
   c.strokeStyle='#9c9476';c.lineWidth=4;c.strokeRect(x-w*.38,y-h*.4,w*.76,h*.8);c.strokeStyle='#504f3f';c.lineWidth=3;c.strokeRect(x-w*.26,y-h*.28,w*.52,h*.56);
   // Older Avarran nave and fragmented processional floor remain underneath the chapel.
   for(let row=-2;row<=2;row++){box(c,'#918771',x-18,y+row*70,36,12);box(c,'#b0a082',x-5,y+row*70-9,10,30);}
  }
  c.restore();return true;
 }
 if(['wall','ruinWall'].includes(o.pieceType)){
  const vertical=o.orientation==='vertical',len=o.length*TILE,w=vertical?72:len,h=vertical?len:76;
  // Match the repeating material to the same snapped world position as its art.
  x=Math.round(x);y=Math.round(y);
  const camera={x:o.x-x,y:o.y-y};
  c.save();if(o.pieceType==='ruinWall')c.globalAlpha=.9;
  drawOrrakaiWallArt(c,x-w/2,y-h/2-12,w,h,vertical,camera);
  if(vertical){c.fillStyle=terrainPattern(c,5,camera)||'#575d4b';c.fillRect(x-w/2,y-h/2-12,w,h);box(c,'#9a9278',x-w/2,y-h/2-12,5,h);box(c,'rgba(18,22,18,.32)',x+w/2-13,y-h/2-12,13,h);drawEchorynLandmark(c,3,x,y+h/2-12,w,h);}
  box(c,'rgba(13,17,12,.3)',x-w/2+8,y+h/2-10,w+10,14);c.restore();return true;
 }
 return false;
}
function box(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function path(c,points,ox,oy){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x-ox,y-oy):c.moveTo(x-ox,y-oy));}
function rock(c,x,y,w,h,seed){
 c.fillStyle='#222c29';c.beginPath();c.moveTo(x,y+6);c.lineTo(x+w*.25,y-4);c.lineTo(x+w*.7,y);c.lineTo(x+w,y+8);c.lineTo(x+w,y+h);c.lineTo(x,y+h);c.closePath();c.fill();
 for(let row=0;row<h;row+=12){const s=textureHash(seed,row);box(c,s>.5?'#545b4e':'#454e45',x+3,y+row,w-6,10);box(c,'#6c705d',x+3,y+row,w-6,2);for(let col=5;col<w;col+=13)box(c,'#2d3831',x+col,y+row+3,2,7);}
 box(c,'#7c8067',x,y,w,4);box(c,'rgba(10,19,15,.28)',x,y+h,w,11);
}
function groundChunk(world,bx,by){
 const surface=document.createElement('canvas');surface.width=CHUNK;surface.height=CHUNK;const c=surface.getContext('2d');c.imageSmoothingEnabled=false;
 const ox=bx*CHUNK,oy=by*CHUNK;
 box(c,'#344734',0,0,CHUNK,CHUNK);
 for(let y=by*16;y<(by+1)*16;y++)for(let x=bx*16;x<(bx+1)*16;x++){
  const t=world.tiles[y]?.[x];if(!t)continue;const px=x*TILE-ox,py=y*TILE-oy,r=echorynRegionAt(x,y),n=textureHash(x,y);
  box(c,echorynGroundColor(x,y),px,py,32,32);
  c.globalAlpha=.22;c.fillStyle=terrainPattern(c,['dead','ore','ruin'].includes(t.biome)?1:0,{x:ox,y:oy})||r.color;c.fillRect(px,py,32,32);c.globalAlpha=1;
  if(t.elevation<0){c.fillStyle='rgba(15,37,34,.13)';c.fillRect(px,py,32,32);}
  if(t.forestWall){box(c,'#26392b',px,py,32,32);for(let k=0;k<4;k++)box(c,k%2?'#455337':'#1d2d22',px+textureHash(x+k,y)*26,py+textureHash(y+k,x)*26,7,3);}
  // Small irregular ground clusters, quiet enough to preserve enemy silhouettes.
  for(let k=0;k<4;k++){const v=textureHash(x*7+k,y*11);box(c,v>.5?'rgba(153,159,110,.12)':'rgba(10,26,19,.12)',px+v*26,py+textureHash(y+k,x)*27,3+k%3,2);}
  if(t.biome==='water'){
   box(c,r.id==='ironMire'?'#17363a':'#123c50',px,py,32,32);
   // A wet, crumbling verge conceals the coarse collision grid. The water's
   // boundary stays in the solid cell; bank detail never creates hidden walls.
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(world.tiles[y+dy]?.[x+dx]?.biome!=='water'){
    for(let s=0;s<32;s+=4){const depth=3+Math.floor(textureHash(x*9+s+dx,y*7+dy)*5),horizontal=dy!==0;
     const sx=horizontal?px+s:px+(dx>0?32-depth:0),sy=horizontal?py+(dy>0?32-depth:0):py+s;
     box(c,'#4a5c4a',sx,sy,horizontal?4:depth,horizontal?depth:4);
     box(c,'#68705a',sx+(horizontal?0:depth/2),sy+(horizontal?depth/2:0),horizontal?3:2,horizontal?2:3);
    }
   }
   if(n>.5){box(c,'#5b8790',px+7,py+12,14,2);box(c,'#35565a',px+17,py+23,10,2);}
  }
  if(t.biome==='wall')rock(c,px,py,32,32,x+y);
  if(t.biome!=='water'&&['riverlands','ironMire'].includes(r.id)&&n>.38&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>world.tiles[y+dy]?.[x+dx]?.biome==='water')){
   box(c,'rgba(94,108,64,.22)',px,py,32,32);drawForestKit(c,14,px+16,py+29,56,62);
  }
  if(t.echorynInterior){c.fillStyle=terrainPattern(c,3)||'#69513a';c.fillRect(px,py,32,32);}
 }
 // Polylines are rendered exactly as authored/rasterized, with no curve overshoot.
 for(const r of [...world.terrainFeatures.roads,...(world.terrainFeatures.localRoutes||[])]){
  const p=r.points;c.lineJoin='round';c.lineCap='round';
  for(const [color,width] of [['#4b5039',r.width+12],['#665d45',r.width+4],['#73664d',r.width-3]]){c.strokeStyle=color;c.lineWidth=width;path(c,p,ox,oy);c.stroke();}
  // Restrained earth texture inside the authored road; connected clusters keep
  // broad paths from reading as flat vector ribbons beside the player.
  const earth=terrainPattern(c,1,{x:ox,y:oy});
  if(earth){c.save();c.globalAlpha=.23;c.strokeStyle=earth;c.lineWidth=Math.max(1,r.width-6);path(c,p,ox,oy);c.stroke();c.restore();}
  for(let i=1;i<p.length;i++){
   const a=p[i-1],b=p[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
   if(!len)continue;
   for(let d=0;d<len;d+=17){const wx=a[0]+dx*d/len,wy=a[1]+dy*d/len;if(wx<ox-80||wx>ox+CHUNK+80||wy<oy-80||wy>oy+CHUNK+80)continue;
    for(const side of [-1,1]){box(c,'rgba(35,31,23,.22)',wx-ox+nx*side*r.width*.25,wy-oy+ny*side*r.width*.25,7,3);}
    const n=textureHash(Math.floor(wx),Math.floor(wy));
    for(const side of [-1,1]){
     const edge=r.width*.5+1+n*4,ex=wx-ox+nx*side*edge,ey=wy-oy+ny*side*edge;
     box(c,'#4b5039',ex,ey,3+n*4,2);
     if(n>.55){box(c,'#566044',ex+1,ey-2,2,3);box(c,'#77805a',ex+1,ey-2,1,1);}
    }
    if(['pilgrim-road','expedition-road'].includes(r.id)||r.id==='hollow-road'&&wx<40*TILE)for(const side of [-1,0,1]){const s=textureHash(Math.floor(wx/17)+side,Math.floor(wy/17));box(c,['#968770','#a09074','#6f6554'][Math.floor(s*3)],wx-ox+nx*side*23,wy-oy+ny*side*23,11,6);box(c,'#b3a080',wx-ox+nx*side*23,wy-oy+ny*side*23,9,1);}
   }
  }
 }
 // Cliff and stair pixels follow the actual solid cells after POI construction.
 for(let y=by*16;y<(by+1)*16;y++)for(let x=bx*16;x<(bx+1)*16;x++){
  const t=world.tiles[y]?.[x];if(!t)continue;const px=x*TILE-ox,py=y*TILE-oy;
  if(t.biome==='cliff'){box(c,'#354136',px,py,32,32);box(c,'#2c352e',px+textureHash(x,y)*26,py,4,32);}
  if(t.connector&&t.passable!==false&&!orrakaiArtReady()){for(let sy=0;sy<32;sy+=8){box(c,'#615e4c',px,py+sy,32,8);box(c,'#a39776',px,py+sy,32,2);box(c,'#373d32',px,py+sy+6,32,2);}}
  if(t.bridge){
   const pilgrim=x>=241&&x<=259&&y>=98&&y<=102;
   if(pilgrim){
    c.fillStyle=terrainPattern(c,2,{x:ox,y:oy})||'#8a826b';c.fillRect(px,py,32,32);box(c,'rgba(104,99,74,.22)',px,py,32,32);
    if(y===98){box(c,'#353c31',px,py,32,8);box(c,'#afa386',px,py,32,3);}
    if(y===102){box(c,'#424a3d',px,py+24,32,8);box(c,'#b1a689',px,py+24,32,3);}
   }else{
    box(c,'#312a22',px,py,32,32);for(let sx=0;sx<32;sx+=8){box(c,'#8a7455',px+sx+1,py+1,6,30);box(c,'#b29a71',px+sx+2,py+2,1,26);}
    if(!world.tiles[y-1]?.[x]?.bridge)box(c,'#c0ae84',px,py,32,4);
    if(!world.tiles[y+1]?.[x]?.bridge)box(c,'#433c2e',px,py+28,32,4);
   }
  }
 }
 // Larger cliff modules are contiguous faces, visually grounded in the solid band.
 for(const e of world.terrainFeatures.escarpments||[])for(let dx=0;dx<e.w;){
  if(world.tiles[e.y]?.[e.x+dx]?.biome!=='cliff'){dx++;continue;}
  const start=dx;while(dx<e.w&&world.tiles[e.y]?.[e.x+dx]?.biome==='cliff')dx++;
  const width=(dx-start)*TILE,count=Math.ceil(width/128),moduleWidth=width/count;
  if(forestKit?.ready)for(let i=0;i<count;i++){
   const index=8+i%2,sx=index%4*160+(index===8?11:20),sw=index===8?137:120;
   c.drawImage(forestKit.image,sx,2*192+92,sw,94,(e.x+start)*TILE-ox+i*moduleWidth,e.y*TILE-oy,moduleWidth+1,e.h*TILE);
  }
 }
 for(const e of world.terrainFeatures.escarpments||[])for(let dx=0;dx<e.w;){
  const t=world.tiles[e.y]?.[e.x+dx];
  if(!t?.connector||t.passable===false){dx++;continue;}
  const start=dx;while(dx<e.w&&world.tiles[e.y]?.[e.x+dx]?.connector&&world.tiles[e.y]?.[e.x+dx]?.passable!==false)dx++;
  drawOrrakaiStairArt(c,(e.x+start)*TILE-ox,e.y*TILE-oy,(dx-start)*TILE,e.h*TILE);
 }
 // Authored wet furrows connect the orchard rows to the sluice, not a global water scatter.
 // Bridge piers stand in the blocked river beneath the playable deck, so this
 // face adds visible height without introducing invisible ground collision.
 drawEchorynLandmark(c,4,250.5*TILE-ox,103*TILE+106-oy,19*TILE,110);
 if(ox<123*TILE&&ox+CHUNK>92*TILE&&oy<118*TILE&&oy+CHUNK>99*TILE){
  for(let y=100;y<=116;y+=4){box(c,'#36463b',94*TILE-ox,y*TILE-oy,24*TILE,7);box(c,'#62756a',94*TILE-ox,y*TILE-oy,24*TILE,2);}
 }
 return surface;
}
export function drawEchorynGround(c,world,cam){
 if(!world.terrainFeatures?.echorynRevision)return false;
 const loaded=!!asset('terrain-core')?.ready&&!!forestKit?.ready&&!!landmarkKit?.ready&&!!landmarkRects&&orrakaiArtReady();let state=groundCaches.get(world);
 if(!state||state.loaded!==loaded){state={loaded,chunks:new Map()};groundCaches.set(world,state);}
 const ax=Math.floor(cam.x/CHUNK),ay=Math.floor(cam.y/CHUNK),bx=Math.floor((cam.x+c.canvas.width)/CHUNK),by=Math.floor((cam.y+c.canvas.height)/CHUNK);
 for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++){
  const key=`${x},${y}`;let s=state.chunks.get(key);if(!s){s=groundChunk(world,x,y);state.chunks.set(key,s);if(state.chunks.size>MAX_CHUNKS)state.chunks.delete(state.chunks.keys().next().value);}else{state.chunks.delete(key);state.chunks.set(key,s);}
  c.drawImage(s,Math.round(x*CHUNK-cam.x),Math.round(y*CHUNK-cam.y));
 }
 return true;
}
function treeSurface(tree){
 const variant=tree.seed%4,key=tree.kind+':'+variant;
 if(treeArt.has(key))return treeArt.get(key);
 const s=document.createElement('canvas');s.width=128;s.height=160;const c=s.getContext('2d');c.imageSmoothingEnabled=false;
 const rect=(color,x,y,w,h)=>box(c,color,x,y,w,h);
 // Four stable silhouettes per family, two-pixel clusters matching the existing game scale.
 const pine=tree.kind==='pine',dead=tree.kind==='dead';
 rect('#1d241b',58,72,12,80);rect('#554938',61,72,7,80);rect('#8d7950',61,94,2,54);
 c.strokeStyle='#3e3a29';c.lineWidth=5;c.beginPath();c.moveTo(64,139);c.lineTo(44,150);c.moveTo(64,139);c.lineTo(82,152);c.moveTo(64,111);c.lineTo(35,80);c.moveTo(64,100);c.lineTo(88,64);c.stroke();
 if(dead){
  c.strokeStyle='#766b50';c.lineWidth=3;c.beginPath();c.moveTo(63,117);c.lineTo(34,81);c.lineTo(25,60);c.moveTo(62,100);c.lineTo(82,65);c.lineTo(93,58);c.moveTo(64,77);c.lineTo(54,41);c.lineTo(60,24);c.stroke();
  for(let i=0;i<10;i++)rect('#303a2d',20+textureHash(i,variant)*85,125+textureHash(variant,i)*22,6,2);
 }else if(pine){
  for(let row=0;row<6;row++){const y=20+row*16,w=16+row*13;c.fillStyle=row%2?'#263d2e':'#20372b';c.beginPath();c.moveTo(64,y-18);c.lineTo(64-w/2-8,y+22);c.lineTo(64+w/2+8,y+22);c.closePath();c.fill();rect('#506346',64-w/2,y+18,w,2);}
 }else{
  const clusters=[[45,39,30,22],[63,26,31,24],[82,43,33,24],[32,59,28,26],[60,55,39,32],[92,65,28,24],[48,79,33,24],[75,80,35,21]];
  for(const [index,[x,y,w,h]] of clusters.entries()){
   const n=textureHash(index,variant),cx=x+(n-.5)*11,cy=y+(textureHash(variant,index)-.5)*9;
   for(let row=-h/2;row<h/2;row+=4){const width=w*Math.sqrt(Math.max(0,1-(row/(h/2))**2));rect('#1c2c21',cx-width/2-3,cy+row-2,width+6,6);rect(index%2?'#374c30':'#3f5432',cx-width/2,cy+row,width,4);}
  }
  for(let i=0;i<95;i++){const x=22+textureHash(i,variant)*80,y=26+textureHash(variant,i+4)*67;const a=c.getImageData(Math.floor(x),Math.floor(y),1,1).data;if(a[3])rect(i%3?'#53643d':'#72804a',x,y,4+(i%2)*2,2);}
 }
 treeArt.set(key,s);return s;
}
function intersects(tree,c,cam){return tree.x>cam.x-170&&tree.x<cam.x+c.canvas.width+170&&tree.y>cam.y-40&&tree.y<cam.y+c.canvas.height+tree.size*170;}
function localTrees(c,world,cam){
 const seen=new Set(),list=[];
 for(let y=Math.floor((cam.y-50)/512);y<=Math.floor((cam.y+c.canvas.height+340)/512);y++)for(let x=Math.floor((cam.x-180)/512);x<=Math.floor((cam.x+c.canvas.width+180)/512);x++)for(const t of world.echorynTreeBuckets?.get(`${x},${y}`)||[])if(!seen.has(t)&&intersects(t,c,cam)){seen.add(t);list.push(t);}
 return list.sort((a,b)=>a.y-b.y);
}
function overlaps(t,a){return a&&!a.dead&&a.alive!==false&&!a.remove&&a.y+18<t.y&&a.y>t.y-180*t.size&&Math.abs(a.x-t.x)<58*t.size;}
function drawTree(c,t,cam,alpha=1){
 const size=t.size,x=Math.round(t.x-cam.x),y=Math.round(t.y-cam.y);
 c.save();c.globalAlpha=.28;c.fillStyle='#10211a';c.beginPath();c.ellipse(x+size*10,y+8,44*size,14*size,0,0,Math.PI*2);c.fill();c.globalAlpha=alpha;
 const index=t.kind==='pine'?4+t.seed%2:t.kind==='dead'?6+t.seed%2:t.seed%4;
 if(!drawForestKit(c,index,x,y,160*size,192*size))c.drawImage(treeSurface(t),x-64*size,y-152*size,128*size,160*size);
 if(alpha<.7){box(c,'#302f24',x-4*size,y-28*size,8*size,34*size);box(c,'#7a6746',x-2*size,y-27*size,2*size,31*size);}
 c.restore();
}
export function drawEchorynForest(c,world,cam,player,layers=null,actors=[player]){
 if(!world.echorynRevision)return;
 const trees=localTrees(c,world,cam);visibleTrees.set(c,trees);
 for(const t of trees){
  const alpha=actors.some(a=>overlaps(t,a))?.24:1;
  if(layers)layers.push({y:t.y,drawActor:()=>drawTree(c,t,cam,alpha)});
  else drawTree(c,t,cam,alpha);
 }
}
export function drawEchorynCanopies(c,world,cam,actors){
 if(!world.echorynRevision)return;
 for(const t of visibleTrees.get(c)||[])if(actors.some(a=>overlaps(t,a)))drawTree(c,t,cam,.24);
}
export function echorynRenderStats(c,world){return {visibleTrees:(visibleTrees.get(c)||[]).length,cachedChunks:groundCaches.get(world)?.chunks.size||0,maxChunks:MAX_CHUNKS,kitVariants:treeArt.size};}
export function drawEchorynDebug(c,world,cam){
 if(!world.echorynDebug)return;c.save();
 for(let y=Math.max(0,Math.floor(cam.y/TILE));y<Math.min(world.height,Math.ceil((cam.y+c.canvas.height)/TILE));y++)for(let x=Math.max(0,Math.floor(cam.x/TILE));x<Math.min(world.width,Math.ceil((cam.x+c.canvas.width)/TILE));x++){
  const t=world.tiles[y][x];if(t.passable===false)box(c,'rgba(205,89,65,.32)',x*TILE-cam.x,y*TILE-cam.y,TILE,TILE);else if(t.connector)box(c,'rgba(99,199,175,.25)',x*TILE-cam.x,y*TILE-cam.y,TILE,TILE);
 }
 c.strokeStyle='#e3ac63';c.lineWidth=1;for(const tree of visibleTrees.get(c)||[]){c.beginPath();c.arc(tree.x-cam.x,tree.y-cam.y,9*tree.size,0,Math.PI*2);c.stroke();}c.restore();
}
