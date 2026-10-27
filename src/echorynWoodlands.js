import {TILE} from './data.js';
import {ECHORYN_FOREST_WALLS,ECHORYN_ROADS,alongRoute,routeDistance} from './echorynGeography.js';

const inside=(x,y,m)=>((x-m.x)/m.rx)**2+((y-m.y)/m.ry)**2<1;
export function buildEchorynWoodlands(world,reserved,content){
 const tile=(x,y)=>world.tiles[Math.floor(y)]?.[Math.floor(x)];
 const ground=(x,y)=>{const t=tile(x,y);return t&&!['water','wall','cliff'].includes(t.biome)&&(t.passable!==false||t.forestWall);};
 const open=(x,y,r=1.5)=>{
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.hypot(dx,dy)<=r){const t=tile(x+dx,y+dy);if(t?.forestWall){delete t.forestWall;t.passable=true;}}
 };
 for(const m of ECHORYN_FOREST_WALLS){
  for(let y=m.y-m.ry;y<=m.y+m.ry;y++)for(let x=m.x-m.rx;x<=m.x+m.rx;x++){
   const t=tile(x,y);if(!t||!inside(x+.5,y+.5,m)||!ground(x,y)||t.passable===false||t.biome==='path'||reserved.has(`${x},${y}`)||ECHORYN_ROADS.some(r=>routeDistance(x+.5,y+.5,r)<r.width/2+3))continue;
   t.forestWall=m.id;t.passable=false;
  }
  for(const points of m.cuts)alongRoute({points},.5,(x,y)=>open(x,y,1.6));
  // A pre-existing resource or encounter gets a small clearing and a bank-safe
  // exit. These micro openings cannot move a forest mass or a primary road.
  for(const o of content){
   const x=o.x/TILE,y=o.y/TILE;if(!inside(x,y,m))continue;
   let best=null,distance=Infinity;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-.707,-.707],[.707,-.707],[-.707,.707],[.707,.707]]){
    let d=0,valid=true;
    while(inside(x+dx*d,y+dy*d,m)&&d<100){if(!ground(x+dx*d,y+dy*d)){valid=false;break;}d+=.7;}
    if(valid&&d<distance&&ground(x+dx*(d+2),y+dy*(d+2))){best={dx,dy,d:d+2};distance=d;}
   }
   if(best)for(let d=0;d<best.d;d+=.5)open(x+best.dx*d,y+best.dy*d,1.6);
  }
 }
 world.terrainFeatures.forestWalls=ECHORYN_FOREST_WALLS;
 return ECHORYN_FOREST_WALLS;
}
