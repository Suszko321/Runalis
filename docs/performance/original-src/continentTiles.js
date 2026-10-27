// Bounded collision chunks behind the existing Array-compatible tile contract.
// Immutable authored cells are packed; texture noise never decides macro geography.
import {CONTINENT_WIDTH,CONTINENT_HEIGHT,continentRegionAt,continentEcologyAt,CONTINENT_ROADS,CONTINENT_RIVERS,CONTINENT_LAKES,CONTINENT_ESCARPMENTS,continentRoadAt} from './continentDefinition.js';
import {routeDistance} from './echorynGeography.js';
export const TERRAIN_CHUNK_TILES=24,MAX_COLLISION_CHUNKS=80;
const integer=k=>typeof k==='string'&&/^\d+$/.test(k);
export function packAuthoredTiles(tiles){
 const width=tiles[0].length,height=tiles.length,size=width*height;
 const biomes=[],regions=[],biomeMap=new Map(),regionMap=new Map(),biome=new Uint8Array(size),region=new Uint8Array(size),elevation=new Int8Array(size),flags=new Uint8Array(size),variant=new Uint8Array(size),extra=new Map();
 const id=(map,list,v)=>{if(!map.has(v)){map.set(v,list.length);list.push(v);}return map.get(v);};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=tiles[y][x],i=y*width+x;biome[i]=id(biomeMap,biomes,t.biome);region[i]=id(regionMap,regions,t.region);elevation[i]=t.elevation||0;variant[i]=t.variant||0;flags[i]=(t.passable===false?2:t.passable===true?1:0)|(t.bridge?4:0)|(t.echorynClearing?8:0);
  const rest={};for(const [k,v] of Object.entries(t))if(!['biome','region','elevation','variant','passable','moisture','danger','bridge','echorynClearing'].includes(k))rest[k]=v;
  if(Object.keys(rest).length)extra.set(i,rest);
 }
 return {width,height,bytes:biome.byteLength+region.byteLength+elevation.byteLength+flags.byteLength+variant.byteLength,get(x,y){if(x<0||y<0||x>=width||y>=height)return null;const i=y*width+x,f=flags[i];return {biome:biomes[biome[i]],region:regions[region[i]],elevation:elevation[i],variant:variant[i],...(f&3?{passable:!!(f&1)}:{}),...(f&4?{bridge:true}:{}),...(f&8?{echorynClearing:true}:{}),...extra.get(i)};}};
}
export function createContinentalTiles(authored,{structures=[],clearings=[]}={}){
 const cache=new Map(),overrides=new Map(),rowCache=new Map();let generated=0;
 const bucket=24,index=new Map();
 for(const r of [...CONTINENT_ROADS,...CONTINENT_RIVERS]){
  for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],pad=r.width/2+2;for(let y=Math.floor((Math.min(a[1],b[1])-pad)/bucket);y<=Math.floor((Math.max(a[1],b[1])+pad)/bucket);y++)for(let x=Math.floor((Math.min(a[0],b[0])-pad)/bucket);x<=Math.floor((Math.max(a[0],b[0])+pad)/bucket);x++){const k=`${x},${y}`,arr=index.get(k)||[];if(!arr.includes(r))arr.push(r);index.set(k,arr);}}
 }
 const nearClear=(x,y)=>clearings.some(c=>Math.hypot(x-c.x,y-c.y)<c.r);
 const coastline=x=>795+Math.sin(x*.008)*27+Math.sin(x*.025)*10;
 function generate(x,y){
  const legacy=authored.get(x,y),ecology=continentEcologyAt(x+.5,y+.5),region=continentRegionAt(x+.5,y+.5);
  const t=legacy||{biome:['ascension','burial','redseal','marsh'].includes(ecology)?'dead':ecology==='aureate'?'grass':'grass',variant:((x*3+y*7)&3),elevation:ecology==='highland'?1:0,passable:true};
  t.sourceRegionId=region.id;t.ecology=ecology;
  // Remove the old rectangular Act I boundary: it is no longer a geographical gate.
  if(legacy&&(x===0||y===0||x===authored.width-1||y===authored.height-1)){t.biome='grass';t.passable=true;}
  const features=index.get(`${Math.floor(x/bucket)},${Math.floor(y/bucket)}`)||[];
  if(!legacy){
   if(y>coastline(x)||x>2850+Math.sin(y*.014)*10||x<2){t.biome='water';t.passable=false;t.coast=true;}
   for(const r of features.filter(r=>CONTINENT_RIVERS.includes(r)))if(routeDistance(x+.5,y+.5,r)<r.width/2){t.biome='water';t.passable=false;t.riverId=r.id;}
   for(const l of CONTINENT_LAKES)if(((x+.5-l.x)/l.rx)**2+((y+.5-l.y)/l.ry)**2<1){t.biome='water';t.passable=false;t.lakeId=l.id;}
   for(const e of CONTINENT_ESCARPMENTS){if(x>=e.x&&x<e.x+e.w&&y>=e.y&&y<e.y+e.h){const gap=e.gaps.some(([a,b])=>x-e.x>=a&&x-e.x<=b);Object.assign(t,{biome:gap?'path':'cliff',passable:gap,elevation:e.level,escarpment:e.id,connector:gap?e.id:null});}else if(x>=e.x&&x<e.x+e.w&&y>=e.y-15&&y<e.y)t.elevation=e.level;}
  }
  // Only authored roads bridge a watercourse. Outside crossings the water is solid.
  for(const r of features.filter(r=>CONTINENT_ROADS.includes(r)))if(routeDistance(x+.5,y+.5,r)<r.width/2+.9){const wet=t.biome==='water';Object.assign(t,{biome:'path',passable:true,roadId:r.id,roadClass:r.roadClass,bridge:wet||t.bridge,connector:t.escarpment||null});}
  if(nearClear(x+.5,y+.5)&&!['water','cliff'].includes(t.biome)){t.passable=true;t.continentClearing=true;}
  for(const s of structures)if(x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h&&!s.gaps?.some(g=>x>=g.x&&x<g.x+g.w&&y>=g.y&&y<g.y+g.h)){t.passable=false;t.biome='wall';t.structureId=s.id;}
  if(y<2&&!t.roadId){t.biome='cliff';t.passable=false;}
  return t;
 }
 function get(x,y){
  if(x<0||y<0||x>=CONTINENT_WIDTH||y>=CONTINENT_HEIGHT)return null;
  const override=overrides.get(y*CONTINENT_WIDTH+x);if(override)return override;
  const cx=Math.floor(x/TERRAIN_CHUNK_TILES),cy=Math.floor(y/TERRAIN_CHUNK_TILES),key=`${cx},${cy}`;let chunk=cache.get(key);
  if(!chunk){chunk=new Array(TERRAIN_CHUNK_TILES*TERRAIN_CHUNK_TILES);cache.set(key,chunk);generated++;if(cache.size>MAX_COLLISION_CHUNKS)cache.delete(cache.keys().next().value);}else{cache.delete(key);cache.set(key,chunk);}
  const i=(y%TERRAIN_CHUNK_TILES)*TERRAIN_CHUNK_TILES+x%TERRAIN_CHUNK_TILES;return chunk[i]||(chunk[i]=generate(x,y));
 }
 const row=y=>{if(rowCache.has(y))return rowCache.get(y);const a=new Array(CONTINENT_WIDTH),r=new Proxy(a,{get(target,k){if(integer(k))return get(Number(k),y);if(k==='toJSON')return ()=>null;return Reflect.get(target,k);},has(target,k){return integer(k)?Number(k)<CONTINENT_WIDTH:Reflect.has(target,k);},set(target,k,v){if(integer(k)){overrides.set(y*CONTINENT_WIDTH+Number(k),v);return true;}return Reflect.set(target,k,v);}});rowCache.set(y,r);return r;};
 const tiles=new Proxy(new Array(CONTINENT_HEIGHT),{get(target,k){if(integer(k)){const y=Number(k);return y<CONTINENT_HEIGHT?row(y):undefined;}if(k==='toJSON')return ()=>null;return Reflect.get(target,k);},has(target,k){return integer(k)?Number(k)<CONTINENT_HEIGHT:Reflect.has(target,k);}});
 return {tiles,get,set(x,y,t){overrides.set(y*CONTINENT_WIDTH+x,t);},stats(){return {residentChunks:cache.size,maxChunks:MAX_COLLISION_CHUNKS,generatedChunks:generated,packedBytes:authored.bytes,overrideCells:overrides.size,virtualTiles:CONTINENT_WIDTH*CONTINENT_HEIGHT};},clear(){cache.clear();}};
}
