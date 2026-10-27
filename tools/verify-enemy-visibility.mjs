import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {updateEnemies} from '../src/combat.js';
import {enemyWithinTargetView,setEnemyCombatViews} from '../src/enemyVisibility.js';
const world=()=>({mode:'overworld',width:100,height:100,tileSize:32,tiles:Array.from({length:100},()=>Array.from({length:100},()=>({biome:'grass',passable:true}))),objects:[],enemies:[],effects:[],projectiles:[]});
const player=()=>Object.assign(createPlayer('Visibility test'),{x:800,y:800});
const enemy=(kind,x=920)=>({id:kind,kind,archetype:kind,x,y:800,hp:100,maxHp:100,speed:60,damage:8,attackRange:220,aggroRange:300,attackCooldown:0,specialCooldown:0,r:12});
const view=p=>({player:p,canvas:{width:200,height:200},renderCamera:{x:700,y:700}});
for(const kind of ['gravePriest','cultist','archer','brute','basicBeast','unknown']){
 const w=world(),p=player(),e=enemy(kind);w.enemies=[e];const hp=p.hp;
 e.telegraph={kind:'curseBolt',time:.01,maxTime:.55,x:p.x,y:p.y,radius:200};
 for(let i=0;i<5;i++)updateEnemies(.02,p,w,()=>{},i*.02,view(p));
 assert.equal(p.hp,hp,`${kind} attacked offscreen`);assert.equal(w.projectiles.length,0);assert.equal(e.telegraph,null);assert(e.x<920,`${kind} must approach from just offscreen`);
}
{
 const w=world(),p=player(),e=enemy('gravePriest',895);w.enemies=[e];updateEnemies(.1,p,w,()=>{},0,view(p));assert(e.telegraph,'visible priest should still cast');
}
{
 const w=world(),p=player(),e=enemy('gravePriest',600);w.enemies=[e];updateEnemies(.1,p,w,()=>{},0,view(p));assert(!e.awakened,'unprovoked distant enemies stay asleep');
}
for(const kind of ['gravePriest','unknown']){
 const w=world(),p=player(),e=enemy(kind);w.mode='dungeon';w.enemies=[e];e.homeGuard=true;e.homeX=e.x;e.homeY=e.y;
 updateEnemies(.1,p,w,()=>{},0,view(p));assert(e.persistentDungeonAggro);
 p.x=2500;p.y=2500;const before=e.x;
 const game={...view(p),renderCamera:{x:2400,y:2400}};
 for(let i=0;i<30;i++)updateEnemies(.1,p,w,()=>{},1+i*.1,game);
 assert(e.x>before,`${kind} must keep pursuing outside leash and sight range`);assert(e.persistentDungeonAggro);assert(!e.returningHome);
}
{
 const w=world(),p=player(),ally=Object.assign(player(),{x:1200}),e=enemy('gravePriest',1150);
 const game={canvas:{width:400,height:200},getSplitScreenMembers:()=>[p,ally],getSplitViewportsForMemberCount:()=>[{width:200,height:200},{width:200,height:200}],buildCameraForActor:a=>({x:a.x-100,y:700})};
 setEnemyCombatViews(w,game);assert(!enemyWithinTargetView(e,p,w));assert(enemyWithinTargetView(e,ally,w));
}
console.log('PASS: offscreen priest/caster/archer/melee attacks blocked; fringe aggro approaches; visible casts preserved; distant enemies dormant; dungeon pursuit persists; split-screen target visibility isolated.');

