import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {createEnemyArchetype} from '../src/enemyBehaviors.js';
import {updateEnemies} from '../src/combat.js';

let clock=10;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const world=()=>({mode:'overworld',width:120,height:120,tiles:Array.from({length:120},()=>Array.from({length:120},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]});
const player=()=>Object.assign(createPlayer('Pursuit regression'),{id:'hero',x:1800,y:1600,hp:100000,maxHp:100000});
const enemy=(kind='roadlessBandit',extra={})=>createEnemyArchetype(kind,kind,50,50,{id:'pursuit-'+kind,homeGuard:true,homeX:900,homeY:1600,leashRadius:480,awakened:true,aggro:3,specialCooldown:99,chargeCooldown:99,attackCooldown:99,...extra});
const tick=(w,p,seconds,width=960,height=540)=>{for(let t=0;t<seconds-1e-8;t+=1/60){clock+=1/60;updateEnemies(1/60,p,w,()=>{},clock,{player:p,canvas:{width,height},renderCamera:{x:p.x-width/2,y:p.y-height/2}});}};
for(const kind of ['roadlessBandit','hollowling','basicBeast','brute','archer','cultist','gravePriest']){
 const w=world(),p=player(),e=enemy(kind,{x:1400});w.enemies=[e];const before=e.x;
 tick(w,p,.5);assert(e.x>before,`${kind} walked home instead of chasing a nearby player`);assert(!e.returningHome);
 console.log('PASS '+kind+' follows beyond its original home leash');
}
{
 const w=world(),p=player(),e=enemy('basicBeast',{x:1400});w.enemies=[e];
 // Patrol selection must not override an already engaged enemy.
 e.aggro=0;e.alerted=true;e.patrolRoute=[{x:900,y:1600}];e.patrolIndex=0;
 tick(w,p,.2);assert(e.x>1400,'patrol stole an engaged enemy');
}
for(const [width,height,axis] of [[960,540,'x'],[200,200,'x'],[1440,900,'y']]){
 const w=world(),p=player(),e=enemy('basicBeast',{x:p.x,y:p.y,homeX:1400,homeY:1400});w.enemies=[e];
 const half=(axis==='x'?width:height)/2;
 e[axis]=p[axis]-half-120;const before=e[axis];tick(w,p,.1,width,height);
 assert(e[axis]>before,'engaged enemy dropped aggro just beyond the screen');assert(!e.returningHome);
 e[axis]=p[axis]-half-200;tick(w,p,.1,width,height);
 assert(!e.awakened&&!e.aggro&&!e.isInCombat,'enemy did not disengage beyond the screen buffer');
}
{
 const w=world(),p=player(),e=enemy('basicBeast',{x:1500});w.enemies=[e];
 w.tiles[50][51].passable=false;tick(w,p,.1);
 assert(e.awakened&&e.isInCombat&&!e.returningHome,'briefly obscured target erased engagement');
}
{
 const w=world(),p=player(),e=enemy('roadlessBandit',{x:1600,returningHome:true,awakened:false,aggro:0});w.enemies=[e];
 tick(w,p,.1);assert(e.x>1600&&!e.returningHome,'visible returning enemy failed to re-engage');
}
for(const kind of ['roadlessBandit','basicBeast']){
 const w=world(),p=player(),ally=Object.assign(player(),{id:'ally',x:1700}),e=enemy(kind,{x:1500});
 p.x=3000;p.coop={players:[ally]};w.enemies=[e];
 const game={canvas:{width:400,height:200},getSplitScreenMembers:()=>[p,ally],getSplitViewportsForMemberCount:()=>[{width:200,height:200},{width:200,height:200}],buildCameraForActor:a=>({x:a.x-100,y:a.y-100})};
 const before=e.x;clock+=.1;updateEnemies(.1,p,w,()=>{},clock,game);
 assert(e.x>before&&!e.returningHome&&e.combatTargetId==='ally',kind+' ignored a nearby split-screen ally when the host escaped');
}
{
 const w=world(),p=player(),e=enemy('basicBeast',{x:1000,awakened:false,aggro:0,homeX:1000});w.enemies=[e];
 tick(w,p,.1);assert(!e.awakened&&!e.isInCombat,'unprovoked enemy acquired through the larger escape margin');
}
console.log('PASS patrol priority, viewport escape bounds, obscured pursuit and re-engagement');
console.log('PASS nearby split-screen allies retain aggro; distant unprovoked enemies stay dormant');
