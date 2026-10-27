import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer} from '../src/player.js';
import {createEnemyArchetype} from '../src/enemyBehaviors.js';
import {updateEnemies} from '../src/combat.js';
import {separateEnemies} from '../src/enemySeparation.js';
import {isActorPositionPassable} from '../src/world.js';
import {beginBasicEnemyAttack,beginEnemyCharge,getBasicEnemyAttack,getEnemyCharge} from '../src/enemyAttackPresentation.js';

let clock=10;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const world=()=>({mode:'overworld',width:120,height:120,tiles:Array.from({length:120},()=>Array.from({length:120},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]});
const mob=(id,extra={})=>createEnemyArchetype('roadlessBandit','Bandit',30,30,{id,radius:13,r:13,speed:100,hp:1000,maxHp:1000,awakened:true,attackCooldown:99,specialCooldown:99,chargeCooldown:99,...extra});
const severity=enemies=>{let sum=0,min=Infinity,pairs=0;for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){const d=Math.hypot(enemies[i].x-enemies[j].x,enemies[i].y-enemies[j].y);min=Math.min(min,d);sum+=Math.max(0,26-d);if(d<26-.1)pairs++;}return {sum,min,pairs};};
const advance=(w,seconds)=>{for(let t=0;t<seconds;t+=1/60){clock+=1/60;separateEnemies(w,1/60,clock);}};
const report={};
{
 const w=world();w.enemies=Array.from({length:8},(_,i)=>mob('stack-'+i));
 const before=severity(w.enemies);advance(w,4);const after=severity(w.enemies);
 assert.equal(after.pairs,0,'coincident idle enemies stayed overlapping');assert(after.min>31);
 assert(w.enemies.every(e=>isActorPositionPassable(w,e.x,e.y,e.radius)));
 report.coincident={before,after};console.log('PASS eight exactly coincident enemies spread into separate bodies');
}
{
 const w=world(),p=Object.assign(createPlayer('Crowd combat'),{x:1200,y:960,hp:100000,maxHp:100000});
 w.enemies=Array.from({length:8},(_,i)=>mob('pursuer-'+i));const before=severity(w.enemies);
 for(let t=0;t<4;t+=1/60){clock+=1/60;updateEnemies(1/60,p,w,()=>{},clock);}
 const after=severity(w.enemies);assert(after.sum<before.sum*.15,'pursuing crowd still collapsed into one actor: '+JSON.stringify({before,after,positions:w.enemies.map(e=>[e.x,e.y,e.enemyState])}));
 assert(after.min>20,'pursuing enemies remain nearly coincident: '+JSON.stringify(after));
 assert(w.enemies.every(e=>e.hp>0&&!e.dead&&e.awakened));assert(w.enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<35));
 report.pursuing={before,after};console.log('PASS crowded enemies spread while continuing to pursue and reach melee');
}
for(const dt of [1/30,1/20]){
 const w=world(),p=Object.assign(createPlayer('Low FPS crowd'),{x:1200,y:960,hp:100000,maxHp:100000});
 w.enemies=Array.from({length:8},(_,i)=>mob('slow-frame-'+i));
 for(let t=0;t<6;t+=dt){clock+=dt;updateEnemies(dt,p,w,()=>{},clock);}
 const after=severity(w.enemies);assert(after.min>20,'spacing failed with '+dt+' second frames: '+JSON.stringify(after));
}
console.log('PASS pursuing body spacing at 30 and 20 FPS simulation steps');
for(const mode of ['root','freeze','stagger','boss','telegraph','basic','charge','elitePause','dormant','arenaDormant','dead']){
 const w=world(),anchor=mob('anchor'),other=mob('yielding',{x:970});w.enemies=[anchor,other];
 if(mode==='root')anchor.rootUntil=clock+10;
 else if(mode==='freeze')anchor.subclassFrozenUntil=clock+10;
 else if(mode==='stagger')anchor.staggerTimer=1;
 else if(mode==='boss')anchor.isBoss=true;
 else if(mode==='telegraph')anchor.telegraph={kind:'slam',time:.5,maxTime:.9};
 else if(mode==='basic')beginBasicEnemyAttack(anchor,{id:'target',x:980,y:960,hp:100},clock,30);
 else if(mode==='charge')beginEnemyCharge(anchor,{duration:.3,elapsed:0});
 else if(mode==='elitePause')anchor.eliteAttackPauseTimer=1;
 else if(mode==='dead'){anchor.dead=true;anchor.hp=0;}
 else anchor[mode]=true;
 const initial={x:anchor.x,y:anchor.y},tell=anchor.telegraph,basic=getBasicEnemyAttack(anchor),charge=getEnemyCharge(anchor);
 advance(w,.5);assert.deepEqual({x:anchor.x,y:anchor.y},initial,mode+' anchor moved');
 assert.equal(anchor.telegraph,tell);assert.equal(getBasicEnemyAttack(anchor),basic);assert.equal(getEnemyCharge(anchor),charge);
}
console.log('PASS committed attacks, charges, controls, bosses and inactive/dead enemies remain anchored');
{
 const w=world();for(let y=0;y<w.height;y++)w.tiles[y][31].passable=false;
 const a=mob('wall-left',{x:978}),b=mob('wall-right',{x:1037});w.enemies=[a,b];advance(w,2);
 assert(a.x<992&&b.x>1024);assert(w.enemies.every(e=>isActorPositionPassable(w,e.x,e.y,e.radius)));
 // Actual overlap next to a wall: yielding may use only the available floor.
 w.enemies=[mob('tight-a',{x:978}),mob('tight-b',{x:978})];advance(w,2);
 assert(w.enemies.every(e=>e.x<992&&isActorPositionPassable(w,e.x,e.y,e.radius)));
}
console.log('PASS spacing respects walls and available floor');
{
 const w=world();w.tiles=w.tiles.map((row,y)=>row.map(tile=>({...tile,passable:y===30})));
 w.enemies=Array.from({length:4},(_,i)=>mob('corridor-'+i,{x:960+i*5,y:976}));
 advance(w,4);assert(w.enemies.every(e=>isActorPositionPassable(w,e.x,e.y,e.radius)));assert(severity(w.enemies).sum<1);
}
console.log('PASS crowded one-tile corridor separates along its passable axis');
// Measure just the additional spacing work after the initial pile disperses.
for(const count of [80,240]){
 const w=world();w.enemies=Array.from({length:count},(_,i)=>mob('dense-'+i,{x:800+(i%20)*20,y:800+Math.floor(i/20)*20}));
 const samples=[];for(let i=0;i<300;i++){clock+=1/60;const start=process.hrtime.bigint();separateEnemies(w,1/60,clock);if(i>=60)samples.push(Number(process.hrtime.bigint()-start)/1e6);}
 samples.sort((a,b)=>a-b);report['spacing-'+count]={actors:count,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],after:severity(w.enemies)};
}
fs.mkdirSync('docs/enemy-pursuit',{recursive:true});fs.writeFileSync('docs/enemy-pursuit/separation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
