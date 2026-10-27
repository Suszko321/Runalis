import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDungeonWorld,transitionDungeonFloor,enterDungeon,exitDungeon} from '../src/dungeonSystem.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {answerMalakarReady,beginMalakarArrival,skipMalakarRitual,chooseMalakarIntroduction,updateMalakarEncounter,encounterState,installMalakarSanctum} from '../src/malakarEncounter.js';
import {startMalakarMove,updateMalakarCombat,malakarShapeHits,MALAKAR_MOVES} from '../src/malakarCombat.js';
import {updateEnemies} from '../src/combat.js';
import {createDialogueState} from '../src/dialogueSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const baseline=JSON.parse(fs.readFileSync('docs/malakar-climax/baseline.json','utf8')),results=[];
const opts={dungeonId:'demonCultLair',theme:'demon',tier:5,depth:3,seed:'malakar-climax'};
function game(floor=4,count=1){const p=createPlayer('Climax test');chooseClass(p,'oathkeeper');p.coop ||= {};p.coop.players=Array.from({length:count-1},(_,i)=>({...createPlayer('Player '+(i+2)),active:true,joined:true}));const w=createDungeonWorld({...opts,floor,playerCount:count});Object.assign(p,w.spawn);return {player:p,world:w,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},logLines:[],log(){},shake(){}};}
function check(label,fn){fn();results.push(label);console.log('PASS',label);}
function begin(g,branch='defy'){beginMalakarArrival(g);skipMalakarRitual(g);chooseMalakarIntroduction(g,branch);updateMalakarEncounter(g,3.1);const s=encounterState(g.world);assert.equal(s.mode,'active');return s;}
for(let count=1;count<=4;count++)check(`${count} players: deliberate consent, synchronized arrival, triple health, save idempotence`,()=>{
 const g=game(3,count),stairs=g.world.objects.find(o=>o.malakarEntrance);assert(stairs);g.world.enemies=[];Object.assign(g.player,{x:stairs.x,y:stairs.y});updateDungeonArena(g.world,g.player);assert.equal(g.world.floor,3);
 assert.equal(transitionDungeonFloor(g,stairs),false);assert(g.malakarReady);answerMalakarReady(g,0,false);assert.equal(g.world.floor,3);
 transitionDungeonFloor(g,stairs);for(let i=0;i<count-1;i++){answerMalakarReady(g,i,true);assert.equal(g.world.floor,3);}answerMalakarReady(g,count-1,true);assert.equal(g.world.floor,4);assert.equal(encounterState(g.world).mode,'ritual');
 assert.equal(g.world.enemies.length,1);const b=g.world.enemies[0];assert.equal(b.maxHp,baseline[count-1].hp*3);for(const p of [g.player,...g.player.coop.players])assert(isActorPositionPassable(g.world,p.x,p.y,12));
 for(let i=0;i<3;i++){const save=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,save));installMalakarSanctum(g.world);assert.equal(g.world.enemies[0].maxHp,baseline[count-1].hp*3);}
});
for(const branch of ['defy','ritual','relic'])check('ritual skip and introduction: '+branch,()=>{const g=game(),s=begin(g,branch);assert.equal(g.world.objects.filter(o=>o.id.startsWith('malakarCelebrant')).length,0);assert(g.world.arenaBarriers.length);assert.equal(s.grace,2);updateEnemies(.5,g.player,g.world,g.log,1,g);assert(!s.attack);});
check('full ritual consumes four leaders and saves midway',()=>{const g=game();beginMalakarArrival(g);updateMalakarEncounter(g,10);assert(encounterState(g.world).ignited);assert.equal(g.world.objects.filter(o=>o.id.startsWith('malakarCelebrant')).length,4);assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));updateMalakarEncounter(g,8);assert.equal(encounterState(g.world).mode,'introduction');assert(!g.world.objects.some(o=>o.id.startsWith('malakarCelebrant')));});
for(const key of Object.keys(MALAKAR_MOVES))check(key+' geometry, commitment, completion and punish window',()=>{
 const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;g.player.x=b.x+250;g.player.y=b.y;
 const a=startMalakarMove(b,g.world,g.player,key,0),initial={...a.target};let hazardCount=0;
 for(let i=0;i<600&&s.attack;i++){g.player.hp=g.player.maxHp;updateMalakarCombat(b,g.world,g.player,1/60,i/60,g);if(s.attack?.released)hazardCount++;}
 assert(!s.attack,key+' must finish');assert(s.recovery>=1,key+' punish window');assert(hazardCount>0,key+' release');
 if(key==='brand'){s.recovery=0;const a=startMalakarMove(b,g.world,g.player,key,0);updateMalakarCombat(b,g.world,g.player,.9,.9,g);const locked={...a.target};g.player.x+=300;updateMalakarCombat(b,g.world,g.player,.2,1.1,g);assert.deepEqual(a.target,locked);}
});
check('phase transitions cancel residual attacks, retain damageability, never retrigger',()=>{const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;startMalakarMove(b,g.world,g.player,'brand');b.hp=b.maxHp*.65;updateMalakarCombat(b,g.world,g.player,.1,1,g);assert.equal(s.phase,2);assert(!s.attack);assert.equal(s.queue.length,0);for(let i=0;i<5;i++)updateMalakarCombat(b,g.world,g.player,.1,1+i,g);assert.equal(s.phase,2);b.hp=b.maxHp*.3;updateMalakarCombat(b,g.world,g.player,.1,8,g);assert.equal(s.phase,3);assert(!s.attack);});
check('all attack geometries leave a walkable safe position, with no terrain pockets',()=>{const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;for(const key of Object.keys(MALAKAR_MOVES)){const a=startMalakarMove(b,g.world,g.player,key);let safe=0;for(let y=7;y<30;y++)for(let x=6;x<34;x++){const p={x:x*32,y:y*32,r:12};assert(isActorPositionPassable(g.world,p.x,p.y,12));if(!a.shapes.some(shape=>malakarShapeHits(shape,p)))safe++;}assert(safe>80,key);}});
check('retry restores boss, cancels hazards and skips repeat ritual',()=>{const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;startMalakarMove(b,g.world,g.player,'signature');b.hp=100;resetFailedDungeonArena(g.world);assert.equal(b.hp,b.maxHp);assert.equal(s.mode,'arrival');assert(!s.attack);beginMalakarArrival(g);assert.equal(s.mode,'introduction');});
check('death clears hazards, delays rewards until dissolution, rewards once, restores victory',()=>{
 const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;startMalakarMove(b,g.world,g.player,'brand');b.hp=0;updateEnemies(.1,g.player,g.world,g.log,1,g);assert.equal(s.mode,'dying');assert(!g.player.completedDungeons?.demonCultLair);assert(!s.attack);updateMalakarEncounter(g,4.1);updateEnemies(.1,g.player,g.world,g.log,5,g);assert(g.world.dungeonState.cleared);assert(g.world.objects.some(o=>o.returnPortal));assert(g.world.objects.find(o=>o.id==='malakarRelic').interactable);const kills=g.player.bossKills[b.bossId];updateEnemies(.1,g.player,g.world,g.log,6,g);assert.equal(g.player.bossKills[b.bossId],kills);const save=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,save));assert.equal(encounterState(g.world).mode,'victory');assert(g.world.objects.some(o=>o.returnPortal));
});
check('stationary targets take real damage; moving melee and ranged targets can evade without class skills',()=>{
 for(const key of Object.keys(MALAKAR_MOVES))for(const range of [75,350]){
  const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;s.phase=3;b.boss.phase=3;g.player.x=b.x+range;g.player.y=b.y;g.player.invulnerableUntil=0;
  const before=g.player.hp;startMalakarMove(b,g.world,g.player,key,0);
  for(let i=0;i<1200&&s.attack;i++){
   const a=s.attack,react=a.key==='brand'?1.1:.25;
   if(a.elapsed>=react&&!a.released){
    let destination=null,best=Infinity;
    for(let y=196;y<=972;y+=16)for(let x=164;x<=1116;x+=16){const candidate={x,y,r:24};
     // Radial retreat avoids the cleave's early tracking, without a dodge.
     const danger=a.key==='cleave'?Math.hypot(x-b.x,y-b.y)<a.shapes[0].radius+24:a.shapes.some(shape=>malakarShapeHits(shape,candidate));
     if(danger)continue;const d=Math.hypot(x-g.player.x,y-g.player.y);if(d<best){best=d;destination=candidate;}
    }
    if(destination&&best>1){const step=Math.min(best,205/60);g.player.x+=(destination.x-g.player.x)/best*step;g.player.y+=(destination.y-g.player.y)/best*step;}
   }
   updateMalakarCombat(b,g.world,g.player,1/60,i/60,g);
  }
  assert.equal(g.player.hp,before,`${key} range ${range}: baseline movement escape`);
 }
 const g=game(),s=begin(g),b=g.world.enemies[0];s.grace=0;g.player.x=b.x+65;g.player.y=b.y;g.player.invulnerableUntil=0;const before=g.player.hp;startMalakarMove(b,g.world,g.player,'cleave',0);for(let i=0;i<70;i++)updateMalakarCombat(b,g.world,g.player,1/60,i/60,g);assert(g.player.hp<before,'test must exercise live damage');
});
check('party consent belongs to actual actors and a secondary player can initiate',()=>{
 const g=game(3,3),stairs=g.world.objects.find(o=>o.malakarEntrance);g.world.enemies=[];
 transitionDungeonFloor({hostGame:g,player:g.player.coop.players[0]},stairs);assert.equal(g.malakarReady.initiator,2);answerMalakarReady(g,1,true);
 g.player.coop.players[0].active=false;answerMalakarReady(g,0,true);assert.equal(g.world.floor,3);answerMalakarReady(g,1,true);assert.equal(g.world.floor,4);
});
check('introduction and active saves preserve sacrifices and sealing',()=>{
 const g=game();beginMalakarArrival(g);skipMalakarRitual(g);
 assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));
 assert(!g.world.objects.some(o=>o.id.startsWith('malakarCelebrant')));assert(g.world.arenaBarriers.length);
 chooseMalakarIntroduction(g,'defy');updateMalakarEncounter(g,3.1);
 const b=g.world.enemies[0];startMalakarMove(b,g.world,g.player,'brand');
 assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));
 assert(g.world.arenaBarriers.length);assert(!encounterState(g.world).attack);assert.equal(encounterState(g.world).grace,2);
});
check('authored combinations retain full recovery before the follow-up tell',()=>{
 for(const [first,second,phase]of [['brand','cleave',2],['charge','rupture',2],['decree','charge',3]]){
  const g=game(),s=begin(g),b=g.world.enemies[0];s.phase=phase;s.grace=0;b.boss.phase=phase;
  startMalakarMove(b,g.world,g.player,first);s.queue=[second];
  let now=0;while(s.attack&&now<20){g.player.hp=g.player.maxHp;updateMalakarCombat(b,g.world,g.player,1/60,now,g);now+=1/60;}
  g.player.hp=g.player.maxHp;assert(!s.attack);const window=s.recovery;assert(window>=MALAKAR_MOVES[first].recovery);
  updateMalakarCombat(b,g.world,g.player,window-.05,now,g);assert(!s.attack);
  updateMalakarCombat(b,g.world,g.player,.06,now+window,g);assert(!s.attack);
  updateMalakarCombat(b,g.world,g.player,1/60,now+window+.1,g);assert.equal(s.attack.key,second);assert(!s.attack.released);assert(s.attack.tell>=.95);
 }
});
fs.writeFileSync('docs/malakar-climax/verification.json',JSON.stringify({checks:results,health:baseline.map(r=>({...r,newHp:r.hp*3}))},null,2));

