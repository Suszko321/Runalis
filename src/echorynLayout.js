import {TILE} from './data.js';
import {ACT1_LANDMARKS} from './overworldUtils.js';
import {composeEchorynRegions} from './echorynScenes.js';
import {buildEchorynWoodlands} from './echorynWoodlands.js';
import {composeEchorynDiscoveries} from './echorynDiscoveries.js';
import {ECHORYN_REVISION,ECHORYN_ROADS,ECHORYN_RIVERS,ECHORYN_LAKES,ECHORYN_REGIONS,ECHORYN_ESCARPMENTS,echorynRegionAt,alongRoute,routeDistance} from './echorynGeography.js';

const palettes={outpost:'grass',hollowRoad:'grass',thornwood:'grass',gravefields:'dead',chapelRuins:'ruin',hunterReach:'grass',riverlands:'grass',ironMire:'dead',oldHollow:'dead',highDanger:'dead'};
export function textureHash(x,y){let n=Math.imul(x+97,374761393)^Math.imul(y+13,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;}
function stamp(ctx,x,y,radius,fn){for(let yy=Math.max(1,Math.floor(y-radius));yy<=Math.min(ctx.height-2,Math.ceil(y+radius));yy++)for(let xx=Math.max(1,Math.floor(x-radius));xx<=Math.min(ctx.width-2,Math.ceil(x+radius));xx++)if(Math.hypot(xx+.5-x,yy+.5-y)<=radius)fn(ctx.tiles[yy][xx],xx,yy);}
export function buildEchorynTerrain(ctx){
 for(let y=0;y<ctx.height;y++)for(let x=0;x<ctx.width;x++){
  const r=echorynRegionAt(x,y),t=ctx.tiles[y][x];Object.assign(t,{region:r.id,biome:palettes[r.id],variant:textureHash(x,y)>.5?1:0,elevation:r.id==='ironMire'?-1:0,moisture:r.id==='riverlands'?.8:r.id==='ironMire'?.95:.35});
  if(x===0||y===0||x===ctx.width-1||y===ctx.height-1){t.biome='wall';t.passable=false;}
 }
 for(const r of ECHORYN_RIVERS)alongRoute(r,.55,(x,y)=>stamp(ctx,x,y,r.width/2,(t,tx,ty)=>{t.biome='water';t.passable=false;ctx.masks.water[ty][tx]=1;}));
 for(const l of ECHORYN_LAKES)for(let y=l.y-l.ry;y<=l.y+l.ry;y++)for(let x=l.x-l.rx;x<=l.x+l.rx;x++)if(((x-l.x)/l.rx)**2+((y-l.y)/l.ry)**2<1){const t=ctx.tiles[y]?.[x];if(t){t.biome='water';t.passable=false;ctx.masks.water[y][x]=1;}}
 // Landmark clearings are authored spaces, not procedural holes in a forest.
 for(const [id,p] of Object.entries(ACT1_LANDMARKS))stamp(ctx,...p,id==='pilgrimBridge'?2.5:9,(t,x,y)=>{if(id==='pilgrimBridge'&&t.biome==='water')return;t.biome=id==='ashenOrchard'?'dead':palettes[t.region];t.passable=true;ctx.masks.landmark[y][x]=1;});
 for(const e of ECHORYN_ESCARPMENTS)for(let y=e.y;y<e.y+e.h;y++)for(let dx=0;dx<e.w;dx++){
  const t=ctx.tiles[y]?.[e.x+dx];if(!t)continue;
  const gap=e.gaps.some(([a,b])=>dx>=a&&dx<=b);Object.assign(t,{biome:gap?'path':'cliff',passable:gap,escarpment:e.id,elevation:e.level,connector:gap?e.id:null});
 }
 for(const e of ECHORYN_ESCARPMENTS)for(let y=e.level<0?e.y+e.h:e.y-14;y<(e.level<0?e.y+18:e.y);y++)for(let x=e.x;x<e.x+e.w;x++){
  const t=ctx.tiles[y]?.[x];if(t&&t.biome!=='cliff')t.elevation=e.level;
 }
 for(const r of ECHORYN_ROADS)alongRoute(r,.5,(x,y)=>stamp(ctx,x,y,r.width/2+.45,(t,tx,ty)=>{
  const wet=ctx.masks.water[ty][tx]>0;Object.assign(t,{biome:'path',passable:true,roadId:r.id,bridge:wet,connector:t.escarpment||null});ctx.masks.road[ty][tx]=1;
 }));
 // A continuous bridge deck has deliberate margins; the crypt is approached from the bank.
 for(let y=98;y<=102;y++)for(let x=241;x<=259;x++){const t=ctx.tiles[y][x];Object.assign(t,{biome:'path',passable:true,roadId:'pilgrim-road',bridge:true,elevation:1});ctx.masks.road[y][x]=1;}
 stamp(ctx,11,27,7,t=>{t.biome='grass';t.passable=true;});
 return ctx;
}
export function echorynTerrainFeatures(ctx){
 const px=p=>p.map(v=>(v+.5)*TILE);
 return {version:3,echorynRevision:ECHORYN_REVISION,base:{color:'#394b31'},worldPixelWidth:ctx.width*TILE,worldPixelHeight:ctx.height*TILE,
  roads:ECHORYN_ROADS.map(r=>({...r,width:r.width*TILE,points:r.points.map(px)})),
  rivers:ECHORYN_RIVERS.map(r=>({...r,width:r.width*TILE,points:r.points.map(px)})),
  lakes:ECHORYN_LAKES.map(l=>({...l,x:l.x*TILE,y:l.y*TILE,rx:l.rx*TILE,ry:l.ry*TILE})),
  escarpments:ECHORYN_ESCARPMENTS,regions:ECHORYN_REGIONS,bridgeTiles:ctx.tiles.flatMap((row,y)=>row.flatMap((t,x)=>t.bridge?[{x:(x+.5)*TILE,y:(y+.5)*TILE}]:[])),biomeBlobs:[],forestMasses:[],cliffs:[],ruinFields:[],detailFields:[]};
}
const foliage=new Set(['treeCluster','pineCluster','shrub','smallBoulder','tallGrassPatch','stump','deadTree','willow']);
const critical=o=>o.npcId||o.questId||o.poiId||o.majorPoiId||o.poiStateCondition||o.kind==='poiInvestigation'||(!o.decorative&&o.interactable!==false&&!['worldDressing','poiMarker'].includes(o.kind));
export function echorynBucket(x,y){return `${Math.floor(x/512)},${Math.floor(y/512)}`;}
export function nearbyEchorynTrees(world,x,y){return world.echorynTreeBuckets?.get(echorynBucket(x,y))||[];}
export function reconstructEchoryn(world){
 if(world.mode!=='overworld'||world.regionId!=='hearthmereFrontier'||world.echorynRevision===ECHORYN_REVISION)return world;
 world.echorynRevision=ECHORYN_REVISION;
 // Reconstructed worlds can arrive with serialized scene objects but no runtime metadata.
 world.objects=world.objects.filter(o=>!o.id?.startsWith('echoryn-'));
 // Remove presentation scatter only. Retain all story/state props and resource IDs.
 world.objects=world.objects.filter(o=>critical(o)||!(foliage.has(o.kind)||o.id?.startsWith('edge-')||o.id?.startsWith('milestone-')));
 const anchorPoint=(id,dx,dy)=>({x:(ACT1_LANDMARKS[id][0]+dx+.5)*TILE,y:(ACT1_LANDMARKS[id][1]+dy+.5)*TILE});
 // Dedicated interaction bays beside solid architecture. No NPC or evidence inside a wall.
 const placements={chapelHermit:anchorPoint('brokenChapel',-5,7),chapelBodyWarden:anchorPoint('brokenChapel',-12,7),chapelSanctuaryWitness:anchorPoint('brokenChapel',-8,8),chapelRestoredNamesWitness:anchorPoint('brokenChapel',-11,9),chapelSealedStair:anchorPoint('brokenChapel',-2,-4),originalNineStationPlan:anchorPoint('brokenChapel',-4,-4),interruptedFuneralEcho:anchorPoint('brokenChapel',-7,-1),chapelLastDawnWorldCache:anchorPoint('brokenChapel',8,-3)};
 for(const o of world.objects){
  if(o.kind==='majorPoiPiece'){
   o.echorynMajor=true;
   if(o.pieceType==='keep'||o.majorPoiStyle==='chapel'&&o.pieceType==='ruinWall'&&o.length===19){o.drawRadius=450;o.depthWidth=360;o.depthBehind=430;o.depthGhostAlpha=.24;if(o.majorPoiStyle==='chapel')o.depthY=o.y+224;}
  }
  if(placements[o.id])Object.assign(o,placements[o.id]);
  if(o.kind==='poiInvestigation'){o.echorynEvidence=true;o.hideLabel=true;}
  if(o.npcId||o.questId||o.poiId||o.majorPoiId||o.kind==='poiInvestigation'){
   // Small authored landings protect clues at stream/cliff edges without erasing entire barriers.
   const x=Math.floor(o.x/TILE),y=Math.floor(o.y/TILE),t=world.tiles[y]?.[x];
   if(t&&['cliff','water'].includes(t.biome))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const cell=world.tiles[y+dy]?.[x+dx];if(cell){cell.biome=cell.biome==='water'?'path':'grass';cell.passable=true;if(cell.escarpment)cell.connector=cell.escarpment;if(cell.biome==='path')cell.bridge=true;}
   }
  }
 }
 const protectedPoints=world.objects.filter(critical),reserved=new Map();
 for(const o of [...protectedPoints,...world.enemies]){
  const x=o.x/TILE,y=o.y/TILE;
  for(let yy=Math.floor(y)-3;yy<=Math.floor(y)+3;yy++)for(let xx=Math.floor(x)-3;xx<=Math.floor(x)+3;xx++)reserved.set(`${xx},${yy}`,true);
 }
 const safe=(x,y)=>{const t=world.tiles[Math.floor(y)]?.[Math.floor(x)];return t&&t.passable!==false&&!['water','wall','cliff'].includes(t.biome);};
 const place=(id,type,x,y,scale=1,extra={})=>{if(!safe(x,y))return;world.objects.push({id:'echoryn-'+id,kind:'worldDressing',propType:type,x:(x+.5)*TILE,y:(y+.5)*TILE,scale,decorative:true,interactable:false,hideLabel:true,...extra});};
 // Strong cadence on the proof corridor; the road surface itself stays open.
 const scenes=[
  ['relief-wagon','supplyWagon',27,46,1.3],['relief-medicine','medicineCrates',29,47,1.15],['relief-fire','campfire',26,48,1.1],
  ['field-cart','harvestCart',23,40,1.2],['field-stores','woodPile',22,44,1.1],['town-marker','avarranOathStone',31,43,.9],
  ['cut-shelter','quarantineTent',53,58,1.3],['cut-bench','bench',54,61,1],['cut-bell','warningBell',57,57,1.3],
  ['abandoned-load','harvestCart',73,77,1.25],['abandoned-wheel','woodPile',75,78,.8],['root-milestone','avarranOathStone',85,77,1],['root-warning','deadRoot',86,78,1.7],
  ['orchard-cart','harvestCart',102,88,1.25],['orchard-tools','weaponRack',101,90,.8],['orchard-yard','childToy',107,87,1],
  ['orchard-shed','townBuilding',122,91,1,{buildingIndex:1,buildingHeight:132}],
  ['orchard-wash','washBasin',116,97,1],['orchard-stores','crate',120,93,1.2],
  ['irrigation-head','ancientSluice',119,97,1.5],['orchard-grave-a','freshGrave',125,95,1],['orchard-grave-b','freshGrave',128,95,1],
  ['orchard-burn','purificationBrazier',126,101,1.1]
 ];
 for(const [id,type,x,y,scale,extra] of scenes)place(id,type,x,y,scale,extra);
 // The cellar remains at its content anchor, framed by its farmhouse foundation.
 place('orchard-farmhouse','townBuilding',110,87,1,{buildingIndex:0,buildingHeight:174});
 for(let row=0;row<4;row++)for(let col=0;col<5;col++)place(`orchard-row-${row}-${col}`,'diseasedOrchardTree',94+col*5,101+row*4,1.25+textureHash(row,col)*.3);
 for(const x of [92,120])place('orchard-fence-'+x,'fence',x,110,1,{orientation:'vertical',length:16});
 for(const y of [84,117])place('orchard-fence-'+y,'fence',106,y,1,{length:28});
 // Explicit road landmarks recur, with distinct pilgrim and Last Dawn language.
 for(const road of ECHORYN_ROADS)alongRoute(road,16,(x,y,nx,ny,i)=>{
  const type=road.id==='last-dawn-road'?'banner':road.id==='pilgrim-road'?'prayerRibbons':'avarranOathStone';
  place(`${road.id}-marker-${Math.round(x)}-${Math.round(y)}`,type,x+nx*3.4,y+ny*3.4,.75,{color:'#81433b'});
 });
 composeEchorynRegions(world);
 composeEchorynDiscoveries(world);
 // The roofless chapel nave has real side walls, an open aisle and a broad
 // south doorway. Evidence bays cut explicit breaks in the surviving masonry.
 const [chapelX,chapelY]=ACT1_LANDMARKS.brokenChapel;
 for(let y=chapelY-12;y<=chapelY-6;y++)for(const x of [chapelX-5,chapelX+5]){
  const cell=world.tiles[y]?.[x];if(cell&&!protectedPoints.some(p=>Math.hypot(p.x-(x+.5)*TILE,p.y-(y+.5)*TILE)<42))cell.passable=false;
 }
 // Small frontier buildings have perimeter walls and a south doorway. The atlas roof
 // locally cuts away when a viewer enters the two-cell room or stands behind it.
 for(const o of world.objects.filter(o=>o.id?.startsWith('echoryn-')&&o.propType==='townBuilding')){
  const cx=Math.floor(o.x/TILE),cy=Math.floor(o.y/TILE);o.echorynStructure=true;
  for(let y=cy-3;y<=cy;y++)for(let x=cx-2;x<=cx+2;x++){
   const cell=world.tiles[y]?.[x];if(!cell)continue;
   const isWall=x===cx-2||x===cx+2||y===cy-3||y===cy&&x!==cx&&x!==cx+1;
   if(isWall&&protectedPoints.some(p=>Math.hypot(p.x-(x+.5)*TILE,p.y-(y+.5)*TILE)<38))continue;
   Object.assign(cell,{passable:!isWall,echorynInterior:true});
  }
 }
 // Existing fishing IDs move to the closest bank when the watershed changes.
 for(const o of world.objects.filter(o=>o.kind==='fish')){
  const nearWater=(x,y)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(world.tiles[Math.floor(y)+dy]?.[Math.floor(x)+dx]?.biome==='water')return true;return false;};
  if(nearWater(o.x/TILE,o.y/TILE))continue;
  let best=null,dist=Infinity;
  for(const river of ECHORYN_RIVERS)alongRoute(river,3,(x,y,nx,ny)=>{for(const side of [-1,1]){const px=x+nx*side*(river.width/2+1.5),py=y+ny*side*(river.width/2+1.5),d=Math.hypot((px+.5)*TILE-o.x,(py+.5)*TILE-o.y);if(d<dist&&safe(px,py)&&nearWater(px,py)){dist=d;best={x:(Math.floor(px)+.5)*TILE,y:(Math.floor(py)+.5)*TILE};}}});
 if(best)Object.assign(o,best);
 }
 // A shifted watershed must not strand retained encounters inside water or walls.
 // Recover only invalid footprints, onto the nearest local bank/terrace.
 const actorGround=(x,y,r)=>[[0,0],[-r,0],[r,0],[0,-r],[0,r]].every(([dx,dy])=>safe((x+dx)/TILE,(y+dy)/TILE));
 for(const enemy of world.enemies){
  const radius=enemy.radius||enemy.r||12;if(actorGround(enemy.x,enemy.y,radius))continue;
  const cx=Math.floor(enemy.x/TILE),cy=Math.floor(enemy.y/TILE);let best=null,distance=Infinity;
  for(let y=cy-14;y<=cy+14;y++)for(let x=cx-14;x<=cx+14;x++){
   const px=(x+.5)*TILE,py=(y+.5)*TILE,d=Math.hypot(px-enemy.x,py-enemy.y);
   if(d<distance&&actorGround(px,py,radius)){best={x:px,y:py};distance=d;}
  }
  if(best)Object.assign(enemy,best);
 }
 // Scene composition relocates some actors to their new relief bays and arenas.
 // Reserve their final footprints rather than their legacy coordinates.
 reserved.clear();
 for(const o of [...world.objects.filter(critical),...world.enemies]){
  const x=o.x/TILE,y=o.y/TILE;
  for(let yy=Math.floor(y)-3;yy<=Math.floor(y)+3;yy++)for(let xx=Math.floor(x)-3;xx<=Math.floor(x)+3;xx++)reserved.set(`${xx},${yy}`,true);
 }
 const forestWalls=buildEchorynWoodlands(world,reserved,[...world.objects.filter(critical),...world.enemies]);
 const treeList=[];
 for(const m of forestWalls)for(let y=m.y-m.ry;y<=m.y+m.ry;y+=2.8)for(let x=m.x-m.rx;x<=m.x+m.rx;x+=2.8){
  const px=x+.4+textureHash(Math.floor(x),Math.floor(y))*.65,py=y+.4+textureHash(Math.floor(y),Math.floor(x))*.65;
  if(world.tiles[Math.floor(py)]?.[Math.floor(px)]?.forestWall===m.id)treeList.push({x:(px+.5)*TILE,y:(py+.5)*TILE,size:1.35+textureHash(Math.floor(x+3),Math.floor(y))*.45,kind:m.kind,seed:Math.floor(textureHash(Math.floor(x),Math.floor(y))*10000),mass:m.id});
 }
 const addTree=(x,y,size,kind='oak')=>{
  if(!safe(x,y)||reserved.has(`${Math.floor(x)},${Math.floor(y)}`)||world.tiles[Math.floor(y)][Math.floor(x)].roadId||world.tiles[Math.floor(y)][Math.floor(x)].echorynClearing)return;
  if(Object.values(ACT1_LANDMARKS).some(p=>Math.hypot(x-p[0],y-p[1])<10))return;
  if(x>90&&x<133&&y>78&&y<122)return;
  const r=echorynRegionAt(x,y);treeList.push({x:(x+.5)*TILE,y:(y+.5)*TILE,size,kind:kind==='oak'&&['oldHollow','ironMire','gravefields'].includes(r.id)?'dead':kind,seed:Math.floor(textureHash(Math.floor(x),Math.floor(y))*10000)});
 };
 // Authored corridor framing. Trees sit outside cart lanes, in alternating groups.
 for(const road of ECHORYN_ROADS)alongRoute(road,3.7,(x,y,nx,ny,i)=>{
  const r=echorynRegionAt(x,y);if(r.id==='outpost'||r.id==='gravefields')return;
  for(const side of [-1,1])for(let depth=0;depth<2;depth++){
   const s=textureHash(Math.round(x*10)+side,Math.round(y*10)+depth),offset=road.width/2+3.8+depth*4+s;
   addTree(x+nx*offset*side,y+ny*offset*side,1.15+s*.6,r.id==='hunterReach'?'pine':'oak');
  }
 });
 // Ecological texture inside authored regional masses; macro routes never use RNG.
 for(let y=5;y<world.height-4;y+=5)for(let x=5;x<world.width-4;x+=5){
  const r=echorynRegionAt(x,y),s=textureHash(x,y);if(s>r.density)continue;
  const px=x+(s-.5)*3,py=y+(textureHash(y,x)-.5)*3;
  if(ECHORYN_ROADS.some(road=>routeDistance(px,py,road)<road.width/2+4))continue;
  addTree(px,py,1.15+textureHash(x+9,y)*.7,r.id==='hunterReach'?'pine':'oak');
 }
 world.echorynTrees=treeList;world.echorynTreeBuckets=new Map();
 // Insert in every potentially touched bucket, so trunk collision is correct at seams.
 for(const t of treeList)for(let by=Math.floor((t.y-12)/512);by<=Math.floor((t.y+12)/512);by++)for(let bx=Math.floor((t.x-12)/512);bx<=Math.floor((t.x+12)/512);bx++){
  const key=`${bx},${by}`,bucket=world.echorynTreeBuckets.get(key)||[];bucket.push(t);world.echorynTreeBuckets.set(key,bucket);
 }
 for(const o of world.objects)if(o.kind==='signpost'||o.kind==='poiMarker')o.forceLabel=false;
 world.mapMeta={...world.mapMeta,version:9,description:'Authored Echoryn watersheds, journeys, terraces and regional scenes.'};
 return world;
}
export function migrateEchorynPosition(world,player){
 if(!world?.terrainFeatures?.echorynRevision||!player)return false;
 const open=(x,y)=>[[0,0],[-12,0],[12,0],[0,-12],[0,12]].every(([dx,dy])=>{const t=world.tiles[Math.floor((y+dy)/TILE)]?.[Math.floor((x+dx)/TILE)];return t&&t.passable!==false&&!['wall','water','cliff'].includes(t.biome)&&!nearbyEchorynTrees(world,x+dx,y+dy).some(tree=>Math.hypot(x+dx-tree.x,y+dy-tree.y)<9*tree.size);});
 let changed=false;
 for(const a of [player,...(player.coop?.players||[])]){
  if(!a)continue;
  if(a.echorynLayoutRevision!==ECHORYN_REVISION||!open(a.x,a.y)){
   let target=null,distance=Infinity;
   // Old positions project onto a real route, bounded locally; remote invalid positions recover at Orrakai.
   for(const road of ECHORYN_ROADS)alongRoute(road,1,(x,y)=>{const px=(x+.5)*TILE,py=(y+.5)*TILE,d=Math.hypot(px-a.x,py-a.y);if(d<distance&&d<640&&open(px,py)){distance=d;target={x:px,y:py};}});
   Object.assign(a,target||world.spawn);a.currentPosition={x:a.x,y:a.y};a.moveTarget=null;changed=true;
  }
  a.echorynLayoutRevision=ECHORYN_REVISION;
  if(a.lastSafeLocation?.worldMode==='overworld'&&(!a.lastSafeLocation.regionId||a.lastSafeLocation.regionId==='hearthmereFrontier')&&!open(a.lastSafeLocation.x,a.lastSafeLocation.y))Object.assign(a.lastSafeLocation,world.spawn);
 }
 return changed;
}
