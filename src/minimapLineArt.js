import {BIOMES} from './data.js';

const roadCache=new WeakMap(),wallCache=new WeakMap(),CHUNK=16;
const INDOORS=new Set(['dungeon','tower','sideZone']);
export const MINIMAP_LINE_COLORS=Object.freeze({road:'#a39770',wall:'#a5b4b5'});

function roadSegments(world){
 const roads=world.terrainFeatures?.roads;
 if(!Array.isArray(roads))return [];
 let cache=roadCache.get(world);if(cache?.source===roads)return cache.segments;
 const segments=[];
 for(const road of roads)for(let i=1;i<(road.points?.length||0);i++){
  const a=road.points[i-1],b=road.points[i];
  if(!a||!b||![...a,...b].every(Number.isFinite))continue;
  segments.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1]});
 }
 roadCache.set(world,{source:roads,segments});return segments;
}

function wallSection(cache,cx,cy,counts){
 const key=`${cx},${cy}`;if(cache.chunks.has(key))return cache.chunks.get(key);
 const x0=cx*CHUNK,y0=cy*CHUNK,side=CHUNK+2,open=new Uint8Array(side*side),segments=[];
 // One small section plus its one-cell border, read only when first visited.
 for(let y=-1;y<=CHUNK;y++)for(let x=-1;x<=CHUNK;x++){
  const tx=x0+x,ty=y0+y;if(tx<0||ty<0||tx>=cache.width||ty>=cache.height)continue;
  const tile=cache.tiles[ty]?.[tx];counts.terrainReads++;
  const biome=BIOMES[typeof tile==='string'?tile:tile?.biome];
  open[(y+1)*side+x+1]=tile&&(tile.passable??biome?.passable??false)?1:0;
 }
 for(let y=0;y<CHUNK;y++)for(let x=0;x<CHUNK;x++){
  const index=(y+1)*side+x+1;if(!open[index])continue;
  const tx=x0+x,ty=y0+y;
  const add=(x1,y1,x2,y2)=>segments.push({x1,y1,x2,y2,tx,ty});
  if(!open[index-side])add(tx,ty,tx+1,ty);
  if(!open[index+side])add(tx,ty+1,tx+1,ty+1);
  if(!open[index-1])add(tx,ty,tx,ty+1);
  if(!open[index+1])add(tx+1,ty,tx+1,ty+1);
 }
 cache.chunks.set(key,segments);return segments;
}

export function drawMinimapLineArt(ctx,world,{centerWorld,worldRadius,scale,r,isTerrainVisible=()=>true}){
 const counts={roadSegments:0,wallSegments:0,terrainReads:0};
 const inRange=s=>Math.max(s.x1,s.x2)>=centerWorld.x-worldRadius&&Math.min(s.x1,s.x2)<=centerWorld.x+worldRadius&&Math.max(s.y1,s.y2)>=centerWorld.y-worldRadius&&Math.min(s.y1,s.y2)<=centerWorld.y+worldRadius;
 const line=s=>{ctx.moveTo(r+(s.x1-centerWorld.x)*scale,r+(s.y1-centerWorld.y)*scale);ctx.lineTo(r+(s.x2-centerWorld.x)*scale,r+(s.y2-centerWorld.y)*scale);};
 ctx.save();ctx.lineWidth=1.25;ctx.lineCap='round';ctx.strokeStyle=MINIMAP_LINE_COLORS.road;ctx.beginPath();
 for(const segment of roadSegments(world))if(inRange(segment)){line(segment);counts.roadSegments++;}
 ctx.stroke();
 if(INDOORS.has(world.mode)){
  const tiles=world.tiles,tile=world.tileSize||32,width=world.width||tiles?.[0]?.length||0,height=world.height||tiles?.length||0;
  if(Array.isArray(tiles)&&width&&height){
   const revision=`${world.floor||1}:${world.terrainRevision||world.tileRevision||0}`;
   let cache=wallCache.get(world);
   if(!cache||cache.tiles!==tiles||cache.revision!==revision||cache.width!==width||cache.height!==height){cache={tiles,revision,width,height,chunks:new Map()};wallCache.set(world,cache);}
   const minX=Math.max(0,Math.floor((centerWorld.x-worldRadius)/tile/CHUNK)),maxX=Math.min(Math.ceil(width/CHUNK)-1,Math.floor((centerWorld.x+worldRadius)/tile/CHUNK));
   const minY=Math.max(0,Math.floor((centerWorld.y-worldRadius)/tile/CHUNK)),maxY=Math.min(Math.ceil(height/CHUNK)-1,Math.floor((centerWorld.y+worldRadius)/tile/CHUNK));
   ctx.strokeStyle=MINIMAP_LINE_COLORS.wall;ctx.lineWidth=1;ctx.beginPath();
   for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++)for(const s of wallSection(cache,cx,cy,counts)){
    if(!isTerrainVisible(s.tx,s.ty))continue;
    const segment={x1:s.x1*tile,y1:s.y1*tile,x2:s.x2*tile,y2:s.y2*tile};if(!inRange(segment))continue;
    line(segment);counts.wallSegments++;
   }
   ctx.stroke();
  }
 }
 ctx.restore();return counts;
}
