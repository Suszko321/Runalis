import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {CONTINENT_ROADS} from '../src/continentDefinition.js';
import {routeDistance} from '../src/echorynGeography.js';
import {objectInInteractionRange} from '../src/interactionRange.js';
import {installCampaignWorld} from '../src/act1CampaignRuntime.js';
import {updateOldWellQuest} from '../src/oldWellSystem.js';
import {createPlayer} from '../src/player.js';
const w=createWorld();installCampaignWorld(w);updateOldWellQuest({world:w,player:createPlayer('Route review')});w.continentRuntime.activate([w.spawn],createPlayer('Route review'),true);
const seen=new Uint8Array(640*480),queue=new Int32Array(640*480);let head=0,tail=1;
queue[0]=Math.floor(w.spawn.y/32)*640+Math.floor(w.spawn.x/32);seen[queue[0]]=1;
while(head<tail){const n=queue[head++],x=n%640,y=Math.floor(n/640);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,index=b*640+a;if(a<0||b<0||a>=640||b>=480||seen[index]||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,12))continue;seen[index]=1;queue[tail++]=index;}}
const failures=[],interactionObjects=w.continentRuntime.allObjects.filter(o=>o.interactable!==false&&!o.decorative);
for(const o of interactionObjects.filter(o=>o.x<640*32&&o.y<480*32)){
 let reachable=false;for(let y=Math.floor(o.y/32)-3;y<=Math.floor(o.y/32)+3;y++)for(let x=Math.floor(o.x/32)-3;x<=Math.floor(o.x/32)+3;x++)if(x>=0&&y>=0&&x<640&&y<480&&seen[y*640+x]&&objectInInteractionRange({x:(x+.5)*32,y:(y+.5)*32},o))reachable=true;
 if(!reachable)failures.push({id:o.id,x:o.x/32,y:o.y/32});
}
const report={pass:!failures.length,reachableCells:tail,interactionsChecked:interactionObjects.filter(o=>o.x<640*32&&o.y<480*32).length,failures};fs.writeFileSync('docs/act1-campaign/access-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.deepEqual(failures,[]);
