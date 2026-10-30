import assert from 'node:assert/strict';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {createDialogueState,closeDialogue} from '../src/dialogueSystem.js';
import {enterDungeon,createDungeonWorld,transitionDungeonFloor,returnDungeonToNavStone,resetDungeonSession} from '../src/dungeonSystem.js';
import {updateVeyreign,handleVeyreignInteraction} from '../src/veyreignDungeon.js';
import {updateDungeonArena} from '../src/dungeonArenaSystem.js';
import {updateVeyreignCombat} from '../src/veyreignCombat.js';
import {answerPartyEntry} from '../src/partyEntrySystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const entrance={id:'castleVeyrOverworldEntrance',dungeonId:'castleVeyr',name:'Castle Veyreign',x:18096,y:3376};
function game(){const player=createPlayer('Retry');chooseClass(player,'oathkeeper');const world=createWorld();Object.assign(player,world.spawn);return {player,world,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){},shake(){}};}
const outside=(w,p)=>{const a=w.bossArena;return p.x<a.x||p.y<a.y||p.x>a.x+a.w||p.y>a.y+a.h;};
for(const feral of [false,true]){
 const g=game();assert(enterDungeon(g,entrance));
 for(let floor=1;floor<=4;floor++){
  updateVeyreign(g);closeDialogue(g.dialogue,{immediate:true});for(const e of g.world.enemies)e.hp=0;
  for(const seal of g.world.objects.filter(o=>o.veyreignSeal))handleVeyreignInteraction(g,seal);
  assert(transitionDungeonFloor(g,g.world.objects.find(o=>o.direction==='down')));
 }
 const w=g.world,b=w.enemies[0];w.bossArena.phase='active';Object.assign(g.player,w.bossRoomCenter);
 if(feral){b.hp=0;updateVeyreignCombat(b,w,g.player,4.1,10,g);assert(b.veyreignFeral);}
 b.hp=Math.floor(b.maxHp*.4);g.player.hp=0;
 assert(returnDungeonToNavStone(g));assert.equal(g.world.mode,'overworld');assert.equal(w.bossArena.phase,'dormant');assert.equal(w.arenaBarriers.length,0);assert(!b.veyreignFeral);assert.equal(b.hp,b.maxHp);assert(!w.objects.some(o=>o.returnPortal));
 const stone=g.world.navStones.find(s=>s.id==='nav-hearthmereFrontier-castleVeyr');assert(Math.hypot(g.player.x-stone.x,g.player.y-stone.y)<1);
 g.player.hp=g.player.maxHp;assert(enterDungeon(g,entrance));assert.equal(g.world.floor,5);assert(outside(g.world,g.player));assert(isActorPositionPassable(g.world,g.player.x,g.player.y,18));assert(Math.hypot(g.player.x-g.world.bossRoomCenter.x,g.player.y-g.world.bossRoomCenter.y)<Math.hypot(g.world.spawn.x-g.world.bossRoomCenter.x,g.world.spawn.y-g.world.bossRoomCenter.y));
 assert.equal(Object.keys(g.world.dungeonState.veyreign.seals).length,8);assert.equal(g.world.bossArena.phase,'dormant');assert(!g.player.veyreignCompleted);
 updateDungeonArena(g.world,g.player,g);assert.equal(g.world.bossArena.phase,'dormant');
 // An ordinary save/rehydration within this session retains the retry; login is
 // deliberately a separate boundary from network scene/save reconstruction.
 const saved=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,saved));assert.equal(g.world.floor,5);
 resetDungeonSession(g);assert.equal(g.world.mode,'overworld');assert.deepEqual(g.player.worldMemory.dungeonRuns,{});assert(enterDungeon(g,entrance));assert.equal(g.world.floor,1);assert.equal(g.world.enemies.length,60);assert.equal(Object.keys(g.world.dungeonState.veyreign.seals).length,0);assert(!g.world.dungeonState.bossRetry);
 console.log(`PASS ${feral?'feral':'human'} defeat: Castle Nav Stone, full boss reset, safe floor-five shortcut, eight seals retained until session reset, fresh floor one afterward`);
}
{
 const g=game();assert(enterDungeon(g,entrance));g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:5,dungeonState:g.world.dungeonState});g.world.bossArena.phase='active';delete g.overworldState;delete g.world.dungeonState.surfaceReturnPoint;
 assert(returnDungeonToNavStone(g));assert.equal(g.world.mode,'overworld');const stone=g.world.navStones.find(s=>s.id==='nav-hearthmereFrontier-castleVeyr');assert(Math.hypot(g.player.x-stone.x,g.player.y-stone.y)<1);assert.equal(g.player.worldMemory.dungeonRuns.castleVeyr.bossRetry.floor,5);
 console.log('PASS legacy missing surface return still reaches Castle Nav Stone and preserves retry');
}
{
 const g=game(),ally=createPlayer('Ally');chooseClass(ally,'oathkeeper');g.player.coop={players:[{...ally,active:true,joined:true}]};const a=g.player.coop.players[0];
 enterDungeon(g,entrance);answerPartyEntry(g,g.player,true);answerPartyEntry(g,a,true);g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:5,dungeonState:g.world.dungeonState,playerCount:2});g.world.bossArena.phase='active';assert(returnDungeonToNavStone(g));
 assert(!enterDungeon(g,entrance));answerPartyEntry(g,g.player,true);answerPartyEntry(g,a,true);assert.equal(g.world.floor,5);assert(outside(g.world,g.player));assert(outside(g.world,a));Object.assign(g.player,g.world.bossRoomCenter);updateDungeonArena(g.world,g.player,g);assert(g.partyEntryReady);assert.equal(g.world.bossArena.phase,'dormant');answerPartyEntry(g,g.player,true);answerPartyEntry(g,a,true);assert.equal(g.world.bossArena.phase,'active');
 console.log('PASS co-op retry pulls both players only after unanimous dungeon and boss consent');
}
{
 const g=game();g.player.veyreignCompleted=true;g.player.worldMemory={veyreignCompleted:true,dungeonRuns:{castleVeyr:{currentFloor:5}}};g.player.bloodline={id:'vampire'};g.player.gold=123;resetDungeonSession(g);assert(g.player.veyreignCompleted&&g.player.worldMemory.veyreignCompleted);assert.equal(g.player.bloodline.id,'vampire');assert.equal(g.player.gold,123);assert(enterDungeon(g,entrance));assert.equal(g.world.floor,1);assert(!g.world.dungeonState.veyreign.firstVisit);
 console.log('PASS logout clears run access without removing loot, completion or permanent vampirism');
}
