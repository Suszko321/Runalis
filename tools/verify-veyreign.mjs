import {answerPartyEntry} from '../src/partyEntrySystem.js';
import assert from 'node:assert/strict';
import {createDungeonWorld,transitionDungeonFloor,sanitizeDungeonSaveState,restoreDungeonFromSaveState,enterDungeon,exitDungeon} from '../src/dungeonSystem.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {createDialogueState,closeDialogue} from '../src/dialogueSystem.js';
import {updateEnemies} from '../src/combat.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {updateVeyreign,handleVeyreignInteraction} from '../src/veyreignDungeon.js';
import {chooseVeyreignFate,veyreignConversation} from '../src/veyreignRules.js';
import {updateVeyreignCombat,beginVeyreignMove,VEYREIGN_MOVES} from '../src/veyreignCombat.js';
import {malakarShapeHits} from '../src/malakarCombat.js';
import {getStoryFlag} from '../src/storyProgress.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const game=(name='Host')=>{const p=createPlayer(name);chooseClass(p,'oathkeeper');const w=createWorld();Object.assign(p,w.spawn);p.hp=p.maxHp=100000;return {player:p,world:w,dialogue:createDialogueState(),camera:{x:0,y:0},canvas:{width:1280,height:800},log(){},shake(){}};};
const entrance={id:'castleVeyrOverworldEntrance',dungeonId:'castleVeyr',name:'Castle Veyreign',x:18000,y:3360};
const finishLord=g=>{const e=g.world.enemies.find(e=>e.veyreignLord);e.hp=0;tick(g);assert(!g.world.dungeonState.cleared);assert(!g.world.objects.some(o=>o.returnPortal));updateVeyreignCombat(e,g.world,g.player,4.1,10,g);e.hp=0;tick(g);};
const tick=g=>{closeDialogue(g.dialogue,{immediate:true});updateEnemies(0,g.player,g.world,g.log,performance.now()/1000,g);updateVeyreign(g);closeDialogue(g.dialogue,{immediate:true});};
for(const fate of ['kill','turn']){
 const g=game(fate);assert(enterDungeon(g,entrance));
 for(let floor=1;floor<=4;floor++){
  const w=g.world;assert.equal(w.floor,floor);assert.equal(w.totalFloors,5);assert.equal(w.enemies.length,32);assert(w.enemies.every(e=>e.batBeast||e.vampire));tick(g);
  const stair=w.objects.find(o=>o.direction==='down');assert(stair.locked);assert(!transitionDungeonFloor(g,stair));
  for(const o of w.objects.filter(o=>o.veyreignSeal)){handleVeyreignInteraction(g,o);assert(!w.dungeonState.veyreign.seals[o.veyreignSeal]);}
  for(const e of w.enemies)e.hp=0;tick(g);
  for(const o of w.objects.filter(o=>o.veyreignSeal))handleVeyreignInteraction(g,o);
  assert(getStoryFlag(g.player,`veyreign.floor${floor}`));assert(!stair.locked);assert(transitionDungeonFloor(g,stair));
  const saved=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,saved));
 }
 const w=g.world,b=w.enemies.find(e=>e.veyreignLord);assert(b);assert.equal(w.floor,5);assert.equal(b.maxHp,14000);assert(!chooseVeyreignFate(g.player,w,'turn'));
 w.bossArena.phase='active';updateVeyreign(g);closeDialogue(g.dialogue,{immediate:true});
 for(const key of Object.keys(VEYREIGN_MOVES)){const a=beginVeyreignMove(b,w,g.player,key);let safe=0;for(let y=15;y<49;y++)for(let x=29;x<68;x++){const t={x:x*32,y:y*32,r:12};if(!a.shapes.some(s=>malakarShapeHits(s,t)))safe++;}assert(safe>20,key);}
 finishLord(g);updateDungeonArena(w,g.player,g);assert(w.dungeonState.cleared);assert(g.player.worldMemory.veyreignCompleted);assert(w.objects.some(o=>o.npcId==='veyreignAlistair'));
 assert(chooseVeyreignFate(g.player,w,fate));assert(!chooseVeyreignFate(g.player,w,fate==='turn'?'kill':'turn'));assert.equal(g.player.bloodline?.id||null,fate==='turn'?'vampire':null);tick(g);
 const portal=w.objects.find(o=>o.returnPortal);assert(portal);assert(exitDungeon(g,portal));
 g.player.worldMemory.elapsed=(g.player.worldMemory.elapsed||0)+1801;assert(enterDungeon(g,entrance));assert.equal(g.world.dungeonState.veyreign.firstVisit,false);
 const repeat=createDungeonWorld({dungeonId:'castleVeyr',floor:5,dungeonState:g.world.dungeonState});assert.equal(repeat.enemies[0].name,'Greater Vampire');g.world=repeat;updateVeyreign(g);assert(!g.dialogue.active);assert(!chooseVeyreignFate(g.player,repeat,'turn'));
 console.log('PASS five-floor progression, seals, save/load, '+fate+', repeat Greater Vampire without dialogue');
}
{
 const g=game('Fresh host'),guest=createPlayer('Returning helper');chooseClass(guest,'oathkeeper');guest.worldMemory={veyreignCompleted:true};guest.questOwner=g.player;g.player.coop||={};g.player.coop.players=[{...guest,active:true,joined:true}];const helper=g.player.coop.players[0];
 assert(!enterDungeon(g,entrance));answerPartyEntry(g,g.player,true);answerPartyEntry(g,helper,true);assert.equal(g.world.mode,'dungeon');g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:5,dungeonState:g.world.dungeonState,playerCount:2});const w=g.world;w.bossArena.phase='active';updateVeyreign(g);finishLord(g);assert(chooseVeyreignFate(helper,w,'turn'));assert.equal(helper.bloodline.id,'vampire');assert(!g.player.bloodline.id);assert(chooseVeyreignFate(g.player,w,'kill'));console.log('PASS returning helper may accept on fresh host; each actor chooses individually');
}
for(let n=1;n<=4;n++){const w=createDungeonWorld({dungeonId:'castleVeyr',floor:5,playerCount:n}),b=w.enemies[0];assert.equal(b.maxHp,Math.round(14000*[1,2,3.1,4.2][n-1]));assert(isActorPositionPassable(w,b.x,b.y,18));}
console.log('PASS one through four player boss health and arena spawn');





// Save migrations must not resurrect the primitive castle or change authored wounds.
{
 const g=game('Migration'),old=createDungeonWorld({dungeonId:'castleVeyr-legacy-layout-test',floor:3});old.dungeonId='castleVeyr';old.dungeonState.cleared=true;
 const migrated=restoreDungeonFromSaveState(JSON.parse(JSON.stringify(sanitizeDungeonSaveState(old))));assert(migrated.dungeonState.veyreign);assert(!migrated.dungeonState.cleared);assert.equal(migrated.totalFloors,5);
 g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:1});const e=g.world.enemies[0],max=e.maxHp;e.hp=111;
 const state=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,state));assert.equal(g.world.enemies[0].maxHp,max);assert.equal(g.world.enemies[0].hp,111);
 console.log('PASS legacy castle migration and exact authored health/wounds after reload');
}
{
 const g=game('Retry');g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:5});const w=g.world,b=w.enemies[0];w.bossArena.phase='active';beginVeyreignMove(b,w,g.player,'hearts');b.hp=1;b.hitFlash=.5;
 resetFailedDungeonArena(w);assert.equal(b.hp,b.maxHp);assert.equal(b.veyreignAttack,null);assert.equal(w.bossArena.phase,'dormant');assert(!g.player.worldMemory?.veyreignCompleted);
 console.log('PASS a failed boss attempt resets attacks, health and sealed arena without spending the offer');
}

// Execute real damage geometry, rather than only inspecting the tell shapes.
{
 const {updateVeyreignCombat}=await import('../src/veyreignCombat.js');
 for(const key of Object.keys(VEYREIGN_MOVES))for(const dodge of [false,true]){
  const g=game('Damage'),w=createDungeonWorld({dungeonId:'castleVeyr',floor:5}),b=w.enemies[0];g.world=w;w.bossArena.phase='active';Object.assign(g.player,{x:b.x+(key==='eclipse'?300:180),y:b.y});b.veyreignPhase=1;
  const a=beginVeyreignMove(b,w,g.player,key);if(dodge){let safe=null;for(let y=15;y<49&&!safe;y++)for(let x=29;x<68&&!safe;x++){const t={x:x*32,y:y*32,r:12};if(!a.shapes.some(s=>malakarShapeHits(s,t)))safe=t;}assert(safe);Object.assign(g.player,safe);}
  const hp=g.player.hp;updateVeyreignCombat(b,w,g.player,a.tell-.05,10,g);assert.equal(g.player.hp,hp);updateVeyreignCombat(b,w,g.player,.06,11,g);assert.equal(g.player.hp<hp,!dodge,key+' '+dodge);
 }
 const g=game('Bat damage'),w=createDungeonWorld({dungeonId:'castleVeyr'}),bat=w.enemies.find(e=>e.batBeast);g.world=w;Object.assign(g.player,{x:bat.x+70,y:bat.y});const hp=g.player.hp;updateVeyreignCombat(bat,w,g.player,.9,12,g);assert.equal(g.player.hp,hp);updateVeyreignCombat(bat,w,g.player,.11,13,g);assert(g.player.hp<hp);
 console.log('PASS all five boss attacks: real delayed damage and safe evasion; Bat Beast dive deals delayed damage');
}
