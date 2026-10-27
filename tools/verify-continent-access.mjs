import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {CONTINENT_ROADS} from '../src/continentDefinition.js';
import {routeDistance} from '../src/echorynGeography.js';
import {objectInInteractionRange} from '../src/interactionRange.js';
const w=createWorld(),seen=new Uint8Array(640*480),queue=new Int32Array(640*480);let head=0,tail=1;
queue[0]=Math.floor(w.spawn.y/32)*640+Math.floor(w.spawn.x/32);seen[queue[0]]=1;
while(head<tail){const n=queue[head++],x=n%640,y=Math.floor(n/640);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,index=b*640+a;if(a<0||b<0||a>=640||b>=480||seen[index]||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,12))continue;seen[index]=1;queue[tail++]=index;}}
const failures=[],interactionObjects=w.continentRuntime.allObjects.filter(o=>o.interactable!==false&&!o.decorative);
for(const o of interactionObjects.filter(o=>o.x<640*32&&o.y<480*32)){
 let reachable=false;for(let y=Math.floor(o.y/32)-3;y<=Math.floor(o.y/32)+3;y++)for(let x=Math.floor(o.x/32)-3;x<=Math.floor(o.x/32)+3;x++)if(x>=0&&y>=0&&x<640&&y<480&&seen[y*640+x]&&objectInInteractionRange({x:(x+.5)*32,y:(y+.5)*32},o))reachable=true;
 if(!reachable)failures.push({id:o.id,x:o.x/32,y:o.y/32});
}
// Outside the preservation ring, a bounded local flood must reach the connected
// authored road network. This catches isolated clearings inside buildings/lakes.
let laterChecked=0;
for(const o of interactionObjects.filter(o=>o.x>=640*32||o.y>=480*32)){
 laterChecked++;const cx=Math.floor(o.x/32),cy=Math.floor(o.y/32),visited=new Set(),pending=[];let connected=false;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=cx+dx,y=cy+dy,p={x:(x+.5)*32,y:(y+.5)*32};if(objectInInteractionRange(p,o)&&isActorPositionPassable(w,p.x,p.y,12)){const key=`${x},${y}`;visited.add(key);pending.push([x,y]);}}
 for(let i=0;i<pending.length&&i<14000&&!connected;i++){
  const [x,y]=pending[i];if(CONTINENT_ROADS.some(r=>routeDistance(x+.5,y+.5,r)<r.width/2+.15)){connected=true;break;}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=`${a},${b}`;if(Math.abs(a-cx)>75||Math.abs(b-cy)>75||visited.has(key)||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,12))continue;visited.add(key);pending.push([a,b]);}
 }
 if(!connected)failures.push({id:o.id,x:o.x/32,y:o.y/32});
}
const report={pass:!failures.length,reachableEarlyCells:tail,interactionsChecked:interactionObjects.length,laterChecked,failures};fs.writeFileSync('docs/world-rebuild/access-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.deepEqual(failures,[]);
