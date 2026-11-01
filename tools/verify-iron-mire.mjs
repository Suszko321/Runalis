import assert from 'node:assert/strict';
import {createWorld,isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {createPlayer,chooseClass,countItem} from '../src/player.js';
import {createDungeonWorld,enterDungeon,transitionDungeonFloor,exitDungeon,sanitizeDungeonSaveState,restoreDungeonFromSaveState} from '../src/dungeonSystem.js';
import {createDialogueState,openDialogue,chooseDialogueOption,closeDialogue} from '../src/dialogueSystem.js';
import {interact} from '../src/gameInteraction.js';
import {updateIronMire,handleIronMireInteraction,installIronMire} from '../src/ironMireDungeon.js';
import {beginIronMireMove,updateIronMireCombat,IRON_MIRE_MOVES} from '../src/ironMireCombat.js';
import {IRON_MIRE_QUEST} from '../src/ironMireData.js';
import {updateEnemies} from '../src/combat.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {malakarShapeHits} from '../src/malakarCombat.js';
import {tuneDungeonBoss} from '../src/dungeonBossDifficulty.js';
import {selectBossAttackTarget} from '../src/bossCombatTargets.js';
import {wireClone} from '../src/onlineProtocol.js';
const player=createPlayer('Iron Vault verifier');chooseClass(player,'oathkeeper');
const game={world:createWorld(),player,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){},logLines:[],shake(){}};
const check=(name,fn)=>{fn();console.log('PASS',name);};
function choose(npcId,id){
 closeDialogue(game.dialogue,{immediate:true});const npc=(game.world.continentRuntime?.allObjects||game.world.objects).find(o=>o.npcId===npcId);assert(npc,npcId);
 assert(openDialogue(game.dialogue,npc,game.player,game.world));const index=game.dialogue.options.findIndex(o=>o.id===id&&!o.disabled);assert(index>=0,`${npcId}/${id}`);assert(chooseDialogueOption(game.dialogue,game.player,game.world,index));closeDialogue(game.dialogue,{immediate:true});updateIronMire(game);
}
function roundTrip(){const old=game.world.enemies.map(e=>[e.id,e.hp,e.dead]),stage=game.player.quests.active[IRON_MIRE_QUEST]?.currentStageId;assert(applySaveToGame(game,JSON.parse(JSON.stringify(createSaveState(game)))));assert.equal(game.player.quests.active[IRON_MIRE_QUEST]?.currentStageId,stage);for(const[id,hp,dead]of old){const e=game.world.enemies.find(e=>e.id===id);assert(e);assert.equal(e.hp,hp);assert.equal(e.dead,dead);}updateIronMire(game);}
function pathTo(w,actor,target){
 const start=[Math.floor(actor.x/32),Math.floor(actor.y/32)],end=[Math.floor(target.x/32),Math.floor(target.y/32)],key=p=>p.join(',');
 const queue=[start],seen=new Map([[key(start),null]]);let found=false;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(key(p)===key(end)){found=true;break;}for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy];if(!seen.has(key(q))&&isActorPositionPassable(w,(q[0]+.5)*32,(q[1]+.5)*32,actor.r||12)){seen.set(key(q),p);queue.push(q);}}}
 assert(found,`No route to ${target.id}`);const path=[];for(let p=end;p;p=seen.get(key(p)))path.push(p);return path.reverse();
}
function walkTo(target){const p=game.player,w=game.world;for(const[x,y]of pathTo(w,p,target)){const tx=(x+.5)*32,ty=(y+.5)*32;for(let i=0;i<5&&Math.hypot(tx-p.x,ty-p.y)>.2;i++){const d=Math.hypot(tx-p.x,ty-p.y),step=Math.min(16,d);moveActorWithCollision(p,w,(tx-p.x)/d*step,(ty-p.y)/d*step);}assert(Math.hypot(tx-p.x,ty-p.y)<1,'Collision obstructed authored route');}}
function controls(){return game.world.objects.filter(o=>o.ironMireControl);}
function clearGuard(o){for(const e of game.world.enemies.filter(e=>e.ironMireGuard===o.ironMireGuard))e.hp=0;updateEnemies(0,game.player,game.world,game.log,10,game);}
check('Mine Drifter starts the retained authored quest',()=>{choose('mineDrifter','lastShift');assert(game.player.quests.active[IRON_MIRE_QUEST]);const entrance=game.world.continentRuntime.allObjects.find(o=>o.id==='ironMireDungeonEntrance');assert(entrance);Object.assign(game.player,{x:entrance.x,y:entrance.y});assert(enterDungeon(game,entrance));assert.equal(game.world.enemies.length,56);assert.equal(game.world.totalFloors,3);assert(!game.world.objects.find(o=>o.id==='ironMireSurface').locked);choose('ironMireSurveyor','plan');assert.equal(game.player.quests.active[IRON_MIRE_QUEST].currentStageId,'pumps');roundTrip();});
check('both pump objectives require guards, reachable controls and saved activation',()=>{
 assert(!transitionDungeonFloor(game,game.world.objects.find(o=>o.direction==='down')));
 for(const first of controls()){
  let o=game.world.objects.find(o=>o.id===first.id);walkTo(o);handleIronMireInteraction(game,o);assert(!game.world.dungeonState.ironMire.controls[o.ironMireControl]);clearGuard(o);interact(game);assert(game.world.dungeonState.ironMire.controls[o.ironMireControl]);roundTrip();
 }
 const stairs=game.world.objects.find(o=>o.direction==='down');walkTo(stairs);assert(!stairs.locked);assert(transitionDungeonFloor(game,stairs));updateIronMire(game);assert.equal(game.world.floor,2);assert.equal(game.world.enemies.length,72);assert.equal(game.player.quests.active[IRON_MIRE_QUEST].currentStageId,'crews');
});
check('three crew records and both cage brakes persist; stairs do not unlock early',()=>{
 const ids=controls().map(o=>o.id);for(let i=0;i<ids.length;i++){
  const o=game.world.objects.find(o=>o.id===ids[i]);walkTo(o);clearGuard(o);interact(game);assert(game.world.dungeonState.ironMire.controls[o.ironMireControl]);roundTrip();if(i<ids.length-1)assert(game.world.objects.find(o=>o.direction==='down').locked);
 }
 const remaining=game.world.enemies.filter(e=>e.hp>0).length;const up=game.world.objects.find(o=>o.direction==='up');assert(transitionDungeonFloor(game,up));updateIronMire(game);assert(controls().every(o=>o.activated));assert(transitionDungeonFloor(game,game.world.objects.find(o=>o.direction==='down')));updateIronMire(game);assert.equal(game.world.enemies.filter(e=>e.hp>0).length,remaining);
 const down=game.world.objects.find(o=>o.direction==='down');walkTo(down);assert(transitionDungeonFloor(game,down));updateIronMire(game);assert.equal(game.world.floor,3);assert.equal(game.player.quests.active[IRON_MIRE_QUEST].currentStageId,'foreman');roundTrip();
});
check('all enemy/interaction positions are walkable and party density scales deterministically',()=>{
 for(let count=1;count<=4;count++)for(let floor=1;floor<=3;floor++){
  const w=createDungeonWorld({dungeonId:'ironMireDungeon',theme:'mine',floor,playerCount:count,seed:'iron-density'});
  for(const e of w.enemies)assert(isActorPositionPassable(w,e.x,e.y,e.radius||12),`${count}/${floor}/${e.id}`);
  for(const o of w.objects.filter(o=>o.ironMireControl||o.kind==='dungeonStairs'))assert(pathTo(w,w.spawn,o).length>0);
  assert(w.enemies.length>=(floor===1?56:floor===2?72:21));
  if(floor===3){const e=w.enemies.find(e=>e.ironMireForeman);assert.equal(e.maxHp,Math.round(11200*[1,2,3.1,4.2][count-1]));e.dungeonBossPartyLocked=true;tuneDungeonBoss(e,1);assert.equal(e.maxHp,Math.round(11200*[1,2,3.1,4.2][count-1]));}
 }
});
check('five mechanics in all phases have safe ground, delayed damage, single release and recovery',()=>{
 for(let phase=1;phase<=3;phase++)for(const key of Object.keys(IRON_MIRE_MOVES)){
  const w=createDungeonWorld({dungeonId:'ironMireDungeon',theme:'mine',floor:3}),e=w.enemies.find(e=>e.ironMireForeman),p=createPlayer('Impact probe');chooseClass(p,'oathkeeper');
  e.ironMirePhase=phase;e.hp=e.maxHp*(phase===1?1:phase===2?.6:.3);w.bossArena.phase='active';e.arenaDormant=false;
  Object.assign(p,{x:e.x+220,y:e.y+150,hp:10000,maxHp:10000,armor:0});const a=beginIronMireMove(e,w,p,key,0);
  let safe=0,hit=null;for(let y=8;y<36;y++)for(let x=28;x<68;x++){const t={x:(x+.5)*32,y:(y+.5)*32,r:12};if(!a.events.some(v=>v.shapes.some(s=>malakarShapeHits(s,t))))safe++;else if(!hit&&a.events[0].shapes.some(s=>malakarShapeHits(s,t)))hit=t;}
  assert(safe>15,`${key}/${phase}: insufficient safe terrain`);assert(hit,`${key}: no hit sample`);Object.assign(p,hit);
  updateIronMireCombat(e,w,p,a.tell-.05,1,null);assert.equal(p.hp,10000,'Damage before tell');updateIronMireCombat(e,w,p,.06,2,null);assert(p.hp<10000,`${key}/${phase} failed to damage`);
  const firstHP=p.hp;updateIronMireCombat(e,w,p,0,2,null);assert.equal(p.hp,firstHP,'Repeated damage on same release');
  updateIronMireCombat(e,w,p,3,5,null);assert(!e.ironMireAttack);assert(e.ironMireRecovery>0);
 }
});
check('real boss activation, interruption, retry and save/load clear stale attacks',()=>{
 const w=game.world,e=w.enemies.find(e=>e.ironMireForeman);Object.assign(game.player,{x:e.x,y:e.y+180,hp:10000,maxHp:10000});updateDungeonArena(w,game.player);assert.equal(w.bossArena.phase,'active');assert(w.arenaBarriers.length);
 beginIronMireMove(e,w,game.player,'collapse',1);e.ironMireAttack.elapsed=.5;roundTrip();assert(!game.world.enemies.find(e=>e.ironMireForeman).ironMireAttack);
 const boss=game.world.enemies.find(e=>e.ironMireForeman);boss.hp=boss.maxHp*.3;updateIronMireCombat(boss,game.world,game.player,0,3,game);assert.equal(boss.ironMirePhase,3);resetFailedDungeonArena(game.world);assert.equal(boss.hp,boss.maxHp);assert.equal(boss.ironMirePhase,1);assert.equal(game.world.arenaBarriers.length,0);assert(!game.world.dungeonState.cleared);
});
check('four owners and their minions receive arena damage; wire snapshots retain exact tell geometry',()=>{
 const w=createDungeonWorld({dungeonId:'ironMireDungeon',floor:3,playerCount:4}),e=w.enemies.find(e=>e.ironMireForeman);
 const party=Array.from({length:4},(_,i)=>{const p=createPlayer(`Party ${i}`);chooseClass(p,'oathkeeper');return Object.assign(p,{active:true,joined:true,playerNumber:i+1,x:e.x+240,y:e.y+i*14,hp:10000,maxHp:10000});});
 const p=party[0];p.coop={players:party.slice(1)};const minion={id:'ironProbeMinion',kindTag:'summon',displayName:'Bound probe',kind:'skeleton',alive:true,hp:10000,maxHp:10000,r:12,x:e.x+210,y:e.y};p.summons=[minion];
 assert.equal(selectBossAttackTarget(e,p,0),p);assert.equal(selectBossAttackTarget(e,p,1),party[1]);assert.equal(selectBossAttackTarget(e,p,3),minion);assert.equal(selectBossAttackTarget(e,p,4),party[3]);
 w.bossArena.phase='active';e.arenaDormant=false;const a=beginIronMireMove(e,w,p,'bell',0),wire=wireClone(e);
 assert.deepEqual(wire.ironMireAttack,a);updateIronMireCombat(e,w,p,a.tell+.01,2,null);for(const t of [...party,minion])assert(t.hp<10000,'Missed party actor/minion');
 const ally=party[1];Object.defineProperty(ally,'questOwner',{value:p,configurable:true});
 const floor=createDungeonWorld({dungeonId:'ironMireDungeon',floor:1});floor.enemies=[];const control=floor.objects.find(o=>o.ironMireControl==='westPump');handleIronMireInteraction({world:floor,player:ally,log(){}},control);assert(p.story.flags.ironMire.westPump);assert(!ally.story?.flags?.ironMire?.westPump,'Shared progress must stay on world owner');
});
check('actual boss death clears the original dungeon ID, opens portal and reports once',()=>{
 const w=game.world,e=w.enemies.find(e=>e.ironMireForeman);Object.assign(game.player,{x:e.x,y:e.y+180,hp:10000});updateDungeonArena(w,game.player);e.hp=0;updateEnemies(0,game.player,w,game.log,20,game);updateDungeonArena(w,game.player);updateIronMire(game);
 assert(w.dungeonState.cleared);assert(game.player.completedDungeons.ironMireDungeon);assert.equal(game.player.quests.active[IRON_MIRE_QUEST].currentStageId,'report');const kills=game.player.bossKills.drownedIronForeman;updateEnemies(0,game.player,w,game.log,21,game);assert.equal(game.player.bossKills.drownedIronForeman,kills);roundTrip();assert(exitDungeon(game,game.world.objects.find(o=>o.returnPortal)));
 const coins=countItem(game.player,'ashCoin');choose('mineDrifter','names');assert(game.player.quests.completed[IRON_MIRE_QUEST]);assert.equal(countItem(game.player,'ashCoin'),coins+80);roundTrip();assert.equal(countItem(game.player,'ashCoin'),coins+80);
});
check('older cleared instances keep victory; old in-progress layouts migrate safely',()=>{
 const old=createDungeonWorld({dungeonId:'oldHollowDungeon',floor:3});old.dungeonId='ironMireDungeon';old.dungeonState.cleared=true;installIronMire(old);assert(old.dungeonState.cleared);assert(old.enemies.find(e=>e.ironMireForeman).hp===0);
 const save=sanitizeDungeonSaveState(createDungeonWorld({dungeonId:'ironMireDungeon',floor:2}));const restored=restoreDungeonFromSaveState(JSON.parse(JSON.stringify(save)));assert.equal(restored.enemies.length,72);assert(restored.objects.some(o=>o.ironMireControl==='crew0'));
});
