import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {createPlayer,chooseClass,countItem} from '../src/player.js';
import {enterSideZone,exitSideZone,createProceduralSideZoneWorld,updateSideZoneState} from '../src/sideZoneSystem.js';
import {createDialogueState,openDialogue,chooseDialogueOption,closeDialogue} from '../src/dialogueSystem.js';
import {interact} from '../src/gameInteraction.js';
import {updateEnemies} from '../src/combat.js';
import {updateBlightedGrove} from '../src/blightedGrove.js';
import {beginGroveMove,updateGroveCombat,GROVE_MOVES} from '../src/blightedGroveCombat.js';
import {malakarShapeHits} from '../src/malakarCombat.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {rememberRepeatableInstance} from '../src/instanceEncounterMemory.js';
const checks=[],check=(name,f)=>{f();checks.push(name);console.log('PASS',name);};
const surface=createWorld();
function game(){const p=createPlayer('Grove verifier');chooseClass(p,'oathkeeper');return {player:p,world:surface,dialogue:createDialogueState(),canvas:{width:1400,height:1000},camera:{x:0,y:0},logLines:[],log(){},shake(){}};}
function choice(g,id){const o=g.world.objects.find(o=>o.groveSkull);closeDialogue(g.dialogue,{immediate:true});assert(openDialogue(g.dialogue,o,g.player,g.world));const i=g.dialogue.options.findIndex(o=>o.id===id);assert(i>=0,id);assert(chooseDialogueOption(g.dialogue,g.player,g.world,i));closeDialogue(g.dialogue,{immediate:true});updateBlightedGrove(g);}
function save(g){const stage=g.player.quests.active.groveLastLullaby?.currentStageId;assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));assert.equal(g.player.quests.active.groveLastLullaby?.currentStageId,stage);updateBlightedGrove(g);}
const g=game();check('entrance launches a unique layout and speaking-skull quest',()=>{assert(enterSideZone(g,{id:'hearthmere-hollow-grove',sideZoneType:'hollowGrove',seed:'grove-pass'}));assert(g.world.dungeonState.grove);assert(g.dialogue.active);assert.equal(g.player.quests.active.groveLastLullaby.currentStageId,'listen');assert.equal(g.world.rooms.length,5);choice(g,'accept');assert.equal(g.player.quests.active.groveLastLullaby.currentStageId,'unbind');save(g);});
check('each chamber and the final arena have radius-aware physical routes',()=>{
 const w=g.world;for(const x of [40,41,42])assert(!w.tiles[25][x].passable);
 const flood=()=>{const q=[[32,73]],seen=new Set(['32,73']);for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(seen.has(k)||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,12))continue;seen.add(k);q.push([a,b]);}}return seen;};
 let seen=flood();for(const o of w.objects.filter(o=>o.groveBinding!=null))assert(seen.has(`${Math.floor(o.x/32)},${Math.floor(o.y/32)}`));assert(!seen.has('41,12'));
 for(const x of [40,41,42])w.tiles[25][x].passable=true;seen=flood();assert(seen.has('41,12'));for(const x of [40,41,42])w.tiles[25][x].passable=false;
});
check('bindings require their guardians and retain three distinct memories through saves',()=>{
 for(let i=0;i<3;i++){
  let root=g.world.objects.find(o=>o.groveBinding===i);Object.assign(g.player,{x:root.x,y:root.y});interact(g);assert(!g.player.story.flags.grove?.[`root${i}`]);
  for(const e of g.world.enemies.filter(e=>e.groveGuard===i))e.hp=0;updateEnemies(0,g.player,g.world,g.log,2,g);interact(g);updateBlightedGrove(g);assert(g.player.story.flags.grove[`root${i}`]);save(g);
 }
 assert.equal(g.player.quests.active.groveLastLullaby.currentStageId,'mother');assert(g.world.tiles[25][41].passable);
});
check('crossing the boss threshold seals the party; movement and exits cannot bypass it',()=>{
 Object.assign(g.player,{x:41.5*32,y:22*32});g.camera={x:g.player.x-700,y:g.player.y-500};updateDungeonArena(g.world,g.player);assert.equal(g.world.bossArena.phase,'active');assert.equal(g.world.arenaBarriers.length,4);assert(!exitSideZone(g));
 const a=g.world.bossArena;Object.assign(g.player,{x:a.x+50,y:a.y+100});moveActorWithCollision(g.player,g.world,-200,0,12);assert(g.player.x>a.x);save(g);assert.equal(g.world.bossArena.phase,'active');assert.equal(g.world.arenaBarriers.length,4);
});
check('all four attacks have honest tells, safe geometry and punishments',()=>{
 const e=g.world.enemies.find(e=>e.groveMother);e.groveRecovery=2;updateEnemies(0,g.player,g.world,g.log,9,g);e.groveRecovery=0;g.player.invulnerableUntil=0;
 for(const key of Object.keys(GROVE_MOVES)){
  g.player.hp=g.player.maxHp;
  e.grovePhase=1;Object.assign(g.player,{x:e.x+190,y:e.y+30});const a=beginGroveMove(e,g.world,g.player,key);assert(a.shapes.length);const before=g.player.hp;updateGroveCombat(e,g.world,g.player,a.tell-.01,10);assert.equal(g.player.hp,before);assert(!a.released);
  const hit=a.shapes[0],target=key==='hollow'?{x:e.x+250,y:e.y}:key==='rain'?{x:hit.x,y:hit.y+250}:key==='rake'?{x:e.x+180,y:e.y+28}:{x:hit.x,y:hit.y};assert(malakarShapeHits(hit,{...target,r:12}));
  Object.assign(g.player,target);g.camera={x:e.x-650,y:e.y-400};updateEnemies(.02,g.player,g.world,g.log,11,g);assert(a.released,key);assert(g.player.hp<before,`${key} did not damage target: ${JSON.stringify({before,after:g.player.hp,x:g.player.x,y:g.player.y,damage:e.damage,boss:[e.x,e.y],shapes:a.shapes})}`);e.groveAttack=null;e.groveRecovery=0;
 }
 e.hp=e.maxHp*.6;updateGroveCombat(e,g.world,g.player,.1,12);assert.equal(e.grovePhase,2);e.hp=e.maxHp*.2;updateGroveCombat(e,g.world,g.player,.1,12);assert.equal(e.grovePhase,3);
 assert(!malakarShapeHits({type:'ring',x:e.x,y:e.y,inner:150,radius:650},{x:e.x,y:e.y,r:12}));
});
check('wipe resets the boss at full strength without restoring released bindings',()=>{
 const e=g.world.enemies.find(e=>e.groveMother);e.hp=3;resetFailedDungeonArena(g.world);assert.equal(e.hp,e.maxHp);assert(!e.groveAttack);assert.equal(g.world.arenaBarriers.length,0);assert.equal(g.world.bossArena.phase,'dormant');assert(g.player.story.flags.grove.root2);
 e.hp=4;rememberRepeatableInstance(g,{failed:true});assert.equal(e.hp,e.maxHp);assert.equal(e.grovePhase,1);
});
check('boss death unlocks the arena, quest conclusion and one-time story rewards',()=>{
 const e=g.world.enemies.find(e=>e.groveMother);Object.assign(g.player,{x:e.x,y:e.y+200,hp:1000});updateDungeonArena(g.world,g.player);e.hp=0;updateEnemies(0,g.player,g.world,g.log,20,g);updateSideZoneState(g);updateSideZoneState(g);
 assert(g.player.story.flags.grove.motherDefeated);assert.equal(g.world.arenaBarriers.length,0);assert(g.world.cleared);assert.equal(g.player.quests.active.groveLastLullaby.currentStageId,'rest');save(g);
 const tonics=countItem(g.player,'shrineTonic');choice(g,'mercy');assert(g.player.quests.completed.groveLastLullaby);assert.equal(countItem(g.player,'shrineTonic'),tonics+2);save(g);assert.equal(countItem(g.player,'shrineTonic'),tonics+2);assert(exitSideZone(g));assert.equal(g.world.mode,'overworld');
});
check('other side zones keep their existing generation and exit behavior',()=>{const w=createProceduralSideZoneWorld({type:'abandonedMine',seed:'isolation'});assert(!w.dungeonState.grove);assert(w.objects.some(o=>o.kind==='sideZoneExit'));});
check('old procedural Grove saves migrate to the new entrance safely',()=>{
 const h=game();h.world=createProceduralSideZoneWorld({type:'hollowGrove',regionId:'legacy-region',seed:'old-grove'});h.world.regionId='hearthmereFrontier';Object.assign(h.player,h.world.spawn);const snapshot=JSON.parse(JSON.stringify(createSaveState(h)));assert(applySaveToGame(h,snapshot));assert(h.world.dungeonState.grove);assert.equal(h.player.x,h.world.spawn.x);assert.equal(h.player.y,h.world.spawn.y);updateBlightedGrove(h);assert(h.player.quests.active.groveLastLullaby);
});
fs.mkdirSync('docs/blighted-grove',{recursive:true});fs.writeFileSync('docs/blighted-grove/verification.json',JSON.stringify({checks},null,2));
