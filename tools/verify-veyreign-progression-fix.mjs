import assert from 'node:assert/strict';
import {createDungeonWorld,transitionDungeonFloor,enterDungeon} from '../src/dungeonSystem.js';
import {createWorld,moveActorWithCollision} from '../src/world.js';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {createDialogueState,closeDialogue} from '../src/dialogueSystem.js';
import {updateVeyreign} from '../src/veyreignDungeon.js';
import {isQuestObjectVisible} from '../src/questInteractables.js';
import {nearestObject,interact} from '../src/gameInteraction.js';
import {updateEnemies} from '../src/combat.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {createContinentalWorld} from '../src/continentWorld.js';
import {travelAvailability,travelByStone} from '../src/worldExploration.js';
import {populationPositionSafe} from '../src/encounterPopulation.js';
import {restoreContinentalState} from '../src/continentPersistence.js';
import {protectNavSanctuaries} from '../src/navStoneSanctuary.js';
export function walkTo(g,target){
 const w=g.world,start=[Math.floor(g.player.x/32),Math.floor(g.player.y/32)],end=[Math.floor(target.x/32),Math.floor(target.y/32)],queue=[start],prev=new Map([[start.join(','),null]]);
 for(let i=0;i<queue.length&&!prev.has(end.join(','));i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=`${a},${b}`;if(w.tiles[b]?.[a]?.passable&&!prev.has(key)){prev.set(key,`${x},${y}`);queue.push([a,b]);}}}
 assert(prev.has(end.join(',')),'No walkable route to '+target.name);const path=[];let key=end.join(',');while(key){path.push(key.split(',').map(Number));key=prev.get(key);}path.reverse();
 for(const [x,y]of path){const px=(x+.5)*32,py=(y+.5)*32;for(let j=0;j<12&&Math.hypot(px-g.player.x,py-g.player.y)>.1;j++){const dx=px-g.player.x,dy=py-g.player.y,d=Math.hypot(dx,dy);moveActorWithCollision(g.player,w,dx/d*Math.min(8,d),dy/d*Math.min(8,d));}assert(Math.hypot(px-g.player.x,py-g.player.y)<1,'Collision blocks '+target.name);}
 return path.length;
}
function game(){const player=createPlayer('Seal interaction review');chooseClass(player,'oathkeeper');const world=createWorld();Object.assign(player,world.spawn);return {player,world,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){},shake(){}};}
for(const repeat of [false,true]){
 const g=game();if(repeat)g.player.veyreignCompleted=true;assert(enterDungeon(g,{id:'castleVeyr',dungeonId:'castleVeyr',name:'Castle Veyreign',...g.world.spawn}));
 for(let floor=1;floor<5;floor++){
  const w=g.world;updateVeyreign(g);closeDialogue(g.dialogue,{immediate:true});assert.equal(w.width,144);assert.equal(w.height,140);assert.equal(w.rooms.length,9);assert.equal(w.enemies.length,60);
  const stair=w.objects.find(o=>o.direction==='down');assert(stair.locked);let walked=0;
  for(const seal of w.objects.filter(o=>o.veyreignSeal)){
   assert(isQuestObjectVisible(seal,g.player),'Required seal hidden');walked+=walkTo(g,seal);assert.equal(nearestObject(g),seal);interact(g);assert(!w.dungeonState.veyreign.seals[seal.veyreignSeal],'Guards must prevent use');
   for(const e of w.enemies.filter(e=>e.veyreignGuard===seal.veyreignSeal))e.hp=0;updateEnemies(0,g.player,w,g.log,1,g);closeDialogue(g.dialogue,{immediate:true});interact(g);assert(w.dungeonState.veyreign.seals[seal.veyreignSeal]);assert(!isQuestObjectVisible(seal,g.player));
  }
  assert(!stair.locked);walked+=walkTo(g,stair);assert(walked>250,`Floor route too short: ${walked}`);assert.equal(nearestObject(g),stair);assert(transitionDungeonFloor(g,stair));assert.equal(g.world.floor,floor+1);assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));
  console.log(`PASS ${repeat?'repeat':'first'} floor ${floor}: ${walked} walked tiles, visible seals, real interaction guard checks, unsealed stair and saved descent`);
 }
}
{
 const g=game();g.world=createDungeonWorld({dungeonId:'castleVeyr',floor:1});g.world.objects.forEach(o=>delete o.veyreignLayoutVersion);g.world.dungeonState.veyreign.seals['1-0']=true;const e=g.world.enemies.find(e=>e.id==='veyreign-1-0-0');e.hp=0;e.dead=e.deathHandled=true;g.world.drops.push({id:'old-loose-loot',itemId:'fieldRations',qty:3,x:e.x,y:e.y});
 const save=JSON.parse(JSON.stringify(createSaveState(g)));save.worldWidth=96;save.worldHeight=90;assert(applySaveToGame(g,save));assert(g.world.dungeonState.veyreign.seals['1-0']);assert(g.world.enemies.find(a=>a.id===e.id).dead);assert.equal(g.player.x,g.world.spawn.x);assert.equal(g.world.drops.find(d=>d.id==='old-loose-loot').qty,3);assert(Math.hypot(g.world.drops.find(d=>d.id==='old-loose-loot').x-g.player.x,g.world.drops.find(d=>d.id==='old-loose-loot').y-g.player.y)<100);
 const seal=g.world.objects.find(o=>o.veyreignSeal==='1-1');assert(isQuestObjectVisible(seal,g.player));console.log('PASS active older layout migrates to entrance, preserving broken seal and defeated guard');
}
{
 const p=createPlayer('Sanctuary review');chooseClass(p,'oathkeeper');const w=createContinentalWorld({player:p}),stone=w.navStones.find(o=>o.id==='nav-hearthmereFrontier-castleVeyr'),source=w.navStones.find(o=>o.id==='nav-hearthmereFrontier-outpost');
 p.worldMemory={elapsed:100,stones:{[stone.id]:{name:stone.name},[source.id]:{name:source.name}}};addItem(p,'fieldRations',8);Object.assign(p,{x:source.x,y:source.y});const g={player:p,world:w,log(){}};w.continentRuntime.refresh(g);
 assert(travelAvailability(g,stone.id).ok);assert(travelByStone(g,stone.id));assert(travelAvailability(g,source.id).ok);
 for(let dx=-900;dx<=900;dx+=80)for(let dy=-900;dy<=900;dy+=80)if(Math.hypot(dx,dy)<960)assert(!populationPositionSafe(w,[],stone.x+dx,stone.y+dy),'Spawn inside sanctuary');
 const enemy=w.continentRuntime.allEnemies.find(e=>!e.dead&&e.hp>0),hp=enemy.hp,id=enemy.id;Object.assign(enemy,{x:stone.x+10,y:stone.y+10,aggro:true});protectNavSanctuaries(w,[enemy]);assert(Math.hypot(enemy.x-stone.x,enemy.y-stone.y)>=800);assert.equal(enemy.hp,hp);assert.equal(enemy.id,id);assert(!enemy.aggro);
 p.worldMemory.continent.entities[id]={kind:'enemy',hp,x:stone.x,y:stone.y};restoreContinentalState(g);assert(Math.hypot(enemy.x-stone.x,enemy.y-stone.y)>=800);assert(travelAvailability(g,source.id).ok);console.log('PASS inbound/outbound travel without killing monsters; spawn exclusion, live pursuit protection and saved-position recovery');
}
