import assert from 'node:assert/strict';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {createDialogueState,closeDialogue} from '../src/dialogueSystem.js';
import {updateEnemies} from '../src/combat.js';
import {updateVeyreign} from '../src/veyreignDungeon.js';
import {updateVeyreignCombat} from '../src/veyreignCombat.js';
import {beginFeralVeyreignMove,updateFeralVeyreign,VEYREIGN_FERAL_MOVES} from '../src/veyreignFeralCombat.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {tuneDungeonBoss} from '../src/dungeonBossDifficulty.js';
import {malakarShapeHits} from '../src/malakarCombat.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
function game(count=1,repeat=false){const p=createPlayer('Royal beast');chooseClass(p,'oathkeeper');p.hp=p.maxHp=100000;p.coop={players:Array.from({length:count-1},(_,i)=>({...createPlayer('Ally '+i),active:true,joined:true,hp:100000,maxHp:100000}))};const w=createDungeonWorld({dungeonId:'castleVeyr',floor:5,playerCount:count});w.dungeonState.veyreign.firstVisit=!repeat;w.dungeonState.veyreign.seen[5]=true;w.bossArena.phase='active';Object.assign(p,{x:w.enemies[0].x+300,y:w.enemies[0].y});return {player:p,world:w,dialogue:createDialogueState(),camera:{x:0,y:0},canvas:{width:1280,height:800},log(){},shake(){}};}
function transform(g){const b=g.world.enemies[0];b.hp=0;updateEnemies(0,g.player,g.world,g.log,1,g);return b;}
for(const count of [1,2,3,4])for(const repeat of [false,true]){
 const g=game(count,repeat),w=g.world,b=transform(g);assert(b.veyreignFeral);assert.equal(b.veyreignTransform,0);assert(!w.dungeonState.cleared);assert(!g.player.veyreignCompleted);assert.equal(w.bossArena.phase,'active');assert(w.arenaBarriers.length);assert.equal(w.drops.length,0);assert(!w.objects.some(o=>o.returnPortal||o.npcId==='veyreignAlistair'));
 assert.equal(b.maxHp,23000*[1,2,3.1,4.2][count-1]);const max=b.maxHp;tuneDungeonBoss(b,count);assert.equal(b.maxHp,max);
 updateVeyreignCombat(b,w,g.player,1.4,2,g);const snapshot=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,snapshot));const saved=g.world.enemies[0];assert.equal(saved.veyreignTransform,1.4);assert.equal(saved.maxHp,max);assert.equal(g.world.bossArena.phase,'active');
 updateVeyreignCombat(saved,g.world,g.player,2.7,5,g);assert.equal(saved.veyreignTransform,undefined);assert.equal(saved.hp,max);assert(saved.damage>68);assert(saved.name.includes(repeat?'Royal Blood Beast':'Crimson Sovereign'));
 saved.hp=0;updateEnemies(0,g.player,g.world,g.log,10,g);updateVeyreign(g);assert(g.world.dungeonState.cleared);assert(g.player.veyreignCompleted);assert.equal(g.player.bossKills.alistairVeyreign,1);assert.equal(g.world.objects.filter(o=>o.returnPortal).length,1);assert.equal(g.world.objects.some(o=>o.npcId==='veyreignAlistair'),!repeat);
}
console.log('PASS first/repeat and 1–4 players: transformation seals arena, no premature rewards, saved transition, second HP pool, one final reward and first-only offer');
{
 const g=game(),b=transform(g);updateVeyreignCombat(b,g.world,g.player,4.1,5,g);b.hp=123;resetFailedDungeonArena(g.world);assert(!b.veyreignFeral);assert.equal(b.veyreignTransform,undefined);assert.equal(b.hp,14000);assert.equal(b.maxHp,14000);assert.equal(b.damage,68);assert.equal(b.r,18);assert.equal(g.world.bossArena.phase,'dormant');assert(!g.player.veyreignCompleted);
 console.log('PASS wiping in feral form restores full human form and preserves the unspent offer');
}
for(const key of Object.keys(VEYREIGN_FERAL_MOVES))for(const dodge of [false,true]){
 const g=game(),b=transform(g);updateVeyreignCombat(b,g.world,g.player,4.1,5,g);b.veyreignRecovery=0;Object.assign(g.player,{x:b.x+(key==='eclipse'?450:200),y:b.y});const a=beginFeralVeyreignMove(b,g.world,g.player,key);
 if(dodge){if(key==='surge')Object.assign(g.player,{x:b.x+Math.cos(a.gap)*200,y:b.y+Math.sin(a.gap)*200});else{let safe;for(let y=15;y<48&&!safe;y++)for(let x=29;x<68&&!safe;x++){const p={x:x*32,y:y*32,r:12};if(!a.shapes.some(s=>malakarShapeHits(s,p)))safe=p;}assert(safe);Object.assign(g.player,safe);}}
 const hp=g.player.hp;updateFeralVeyreign(b,g.world,g.player,a.tell-.01,6,g);assert.equal(g.player.hp,hp);
 for(let i=0;i<35;i++)updateFeralVeyreign(b,g.world,g.player,.016,7+i*.016,g);
 assert.equal(g.player.hp<hp,!dodge,`${key} dodge=${dodge}`);
}
console.log('PASS five feral mechanics: delayed real damage, traveling blood wave and visible safe gap, safe evasion for every attack');
