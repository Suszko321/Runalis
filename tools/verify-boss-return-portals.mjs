import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createDialogueState} from '../src/dialogueSystem.js';
import {createProceduralSideZoneWorld,updateSideZoneState} from '../src/sideZoneSystem.js';
import {createTowerFloorWorld,updateTowerState,exitTower} from '../src/towerSystem.js';
import {createDungeonWorld,enterDungeon,exitDungeon} from '../src/dungeonSystem.js';
import {updateEnemies} from '../src/combat.js';
import {initializeDungeonArena} from '../src/dungeonArenaSystem.js';
import {syncBossReturnPortals,canUseBossReturnPortal,returnToZoneEntrance} from '../src/bossReturnPortals.js';
import {rememberRepeatableInstance,restoreRepeatableInstance} from '../src/instanceEncounterMemory.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {CONTINENT_REGIONS} from '../src/continentDefinition.js';
import {makeEnemy} from '../src/overworldUtils.js';
import {interact} from '../src/gameInteraction.js';
function game(w,p=createPlayer('Portal review')){chooseClass(p,'oathkeeper');Object.assign(p,w.spawn);p.hp=p.maxHp=100000;return {world:w,player:p,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){},logLines:[],shake(){}};}
const portals=w=>w.objects.filter(o=>o.returnPortal);
const kill=(g,b)=>{b.hp=0;updateEnemies(0,g.player,g.world,g.log,0,g);};
const check=(name,fn)=>{fn();console.log('PASS',name);};
check('Grove portal appears at Mother victory with other guards alive; routes all players to Edda; restores without a corpse',()=>{
 const w=createProceduralSideZoneWorld({type:'hollowGrove'}),g=game(w),b=w.enemies.find(e=>e.groveMother);
 syncBossReturnPortals(w);assert.equal(portals(w).length,0);b.hp=1;syncBossReturnPortals(w);assert.equal(portals(w).length,0);
 const forged={id:'forged',kind:'sideZoneExit',returnPortal:true,bossVictoryPortal:true,returnRecordKey:'missing'};w.objects.push(forged);assert(!canUseBossReturnPortal(w,forged));syncBossReturnPortals(w);assert(!w.objects.includes(forged));
 kill(g,b);updateSideZoneState(g);assert(w.enemies.some(e=>!e.groveMother&&e.hp>0));assert(!w.cleared);
 const portal=portals(w)[0];assert.equal(portals(w).length,1);assert(portal.returnToZoneEntrance);assert(canUseBossReturnPortal(w,portal));assert(isActorPositionPassable(w,portal.x,portal.y,12));
 g.player.coop={players:Array.from({length:3},(_,i)=>Object.assign(createPlayer('P'+(i+2)),{active:true,joined:true,x:b.x,y:b.y}))};
 Object.assign(g.player,{x:portal.x,y:portal.y});interact(g);assert.equal(g.world,w);
 for(const p of [g.player,...g.player.coop.players]){assert(Math.hypot(p.x-w.spawn.x,p.y-w.spawn.y)<100);assert(isActorPositionPassable(w,p.x,p.y,p.r||12));}
 assert(w.objects.some(o=>o.groveSkull));w.enemies=w.enemies.filter(e=>e!==b);w.objects=w.objects.filter(o=>!o.returnPortal);syncBossReturnPortals(w);syncBossReturnPortals(w);assert.equal(portals(w).length,1);
 const state=JSON.parse(JSON.stringify(createSaveState(g)));state.worldObjects=state.worldObjects.filter(o=>!o.returnPortal);const loaded=game(createWorld());assert(applySaveToGame(loaded,state));assert.equal(portals(loaded.world).length,1);
 rememberRepeatableInstance(g);const restored=createProceduralSideZoneWorld({type:'hollowGrove'});assert(restoreRepeatableInstance(restored,g.player));assert.equal(portals(restored).length,1);
 const record=Object.values(restored.dungeonState.bossReturns)[0];restored.enemies.push({...b,dead:false,hp:b.maxHp});syncBossReturnPortals(restored);assert.equal(portals(restored).length,0);assert(!Object.values(restored.dungeonState.bossReturns).includes(record));
});
check('all ten side-zone types: existing wardens leave portals; zones without bosses do not invent one',()=>{
 for(const type of ['hollowGrove','abandonedMine','ashenFarmstead','graveyardCellar','failedPurificationSite','confessionVault','choirReliquary','lightstormScar','namelessVault','worldrootRift']){
  const w=createProceduralSideZoneWorld({type,regionId:'aureateMarches'}),g=game(w),b=w.enemies.find(e=>e.miniBoss);syncBossReturnPortals(w);assert.equal(portals(w).length,0);if(!b)continue;kill(g,b);updateSideZoneState(g);assert.equal(portals(w).length,1,type);assert(!portals(w)[0].returnToZoneEntrance);assert(isActorPositionPassable(w,portals(w)[0].x,portals(w)[0].y,12));
  w.enemies=w.enemies.filter(e=>e!==b);rememberRepeatableInstance(g);const restored=createProceduralSideZoneWorld({type,regionId:'aureateMarches'});assert(restoreRepeatableInstance(restored,g.player));assert.equal(portals(restored).length,1,type+' re-entry');
 }
});
check('all eight regional tower bosses leave a portal immediately; cleared and partial saves reconstruct it',()=>{
 for(const region of CONTINENT_REGIONS){
  const p=createPlayer('Tower portal'),w=createTowerFloorWorld(10,p,region.id),g=game(w,p),b=w.enemies.find(e=>e.isBoss);assert(b);updateTowerState(g);assert.equal(portals(w).length,0);
  const add=makeEnemy('hollowling','survivor','Survivor',11,27,{hp:100,maxHp:100});w.enemies.push(add);kill(g,b);updateTowerState(g);assert.equal(portals(w).length,1,region.id);assert(!w.cleared);assert(canUseBossReturnPortal(w,portals(w)[0]));
  w.enemies=w.enemies.filter(e=>e!==b);w.objects=w.objects.filter(o=>!o.returnPortal);const state=JSON.parse(JSON.stringify(createSaveState(g))),loaded=game(createWorld());assert(applySaveToGame(loaded,state));assert.equal(portals(loaded.world).length,1);
  rememberRepeatableInstance(g);const reenter=createTowerFloorWorld(10,p,region.id);assert(restoreRepeatableInstance(reenter,p));assert.equal(portals(reenter).length,1);
  const legacy=createTowerFloorWorld(10,p,region.id);legacy.enemies=[];legacy.cleared=true;delete legacy.dungeonState.bossReturns;updateTowerState({...g,world:legacy});updateTowerState({...g,world:legacy});assert.equal(portals(legacy).length,1,'legacy clear reconstruction');
  const partial=createTowerFloorWorld(10,p,region.id);partial.enemies=partial.enemies.filter(e=>!e.isBoss);partial.bossArena.phase='defeated';syncBossReturnPortals(partial);assert.equal(portals(partial).length,1,'legacy partial victory reconstruction');
 }
});
check('a two-boss encounter, summons, ordinary floors and active arenas cannot expose an early usable portal',()=>{
 const p=createPlayer('Double boss'),w=createTowerFloorWorld(10,p),g=game(w,p),b=w.enemies.find(e=>e.isBoss),second={...b,id:b.id+'-second',deathHandled:false};w.enemies.push(second);initializeDungeonArena(w);kill(g,b);assert.equal(portals(w).length,0);kill(g,second);assert.equal(portals(w).length,1);w.bossArena.phase='active';assert(!canUseBossReturnPortal(w,portals(w)[0]));
 const ordinary=createTowerFloorWorld(1,createPlayer('Ordinary')),normal=game(ordinary);for(const e of ordinary.enemies)e.hp=0;updateEnemies(0,normal.player,ordinary,normal.log,0,normal);updateTowerState(normal);assert.equal(portals(ordinary).length,0);
 const summoned=createTowerFloorWorld(10,createPlayer('Summons')),s=game(summoned),original=summoned.enemies.find(e=>e.isBoss);summoned.enemies.push({...original,id:'summoned-boss',hp:0,summonedByBoss:original.id});updateEnemies(0,s.player,summoned,s.log,0,s);assert.equal(portals(summoned).length,0);
});
check('a non-final floor boss permits a return without completing the dungeon or unlocking its final rewards',()=>{
 const surface=createWorld(),g=game(surface),entrance={id:'portal-floor-test',dungeonId:'portal-floor-test',name:'Floor test',...surface.spawn};assert(enterDungeon(g,entrance));const w=g.world,room=w.rooms[0],b=makeEnemy('gravebound','floor-boss','Floor Guardian',room.x+2,room.y+2,{isBoss:true,hp:100,maxHp:100});w.enemies.push(b);initializeDungeonArena(w);kill(g,b);assert(!w.dungeonState.cleared);const portal=portals(w)[0];assert(portal&&canUseBossReturnPortal(w,portal));assert(w.objects.filter(o=>o.kind==='dungeonExit'&&!o.returnPortal).every(o=>o.locked));assert(exitDungeon(g,portal));assert.equal(g.world.mode,'overworld');assert(Math.hypot(g.player.x-entrance.x,g.player.y-entrance.y)<64);
});
check('an authored miniboss leaves its own return while the main boss and final rewards remain locked',()=>{
 const w=createDungeonWorld({dungeonId:'castleVeyr',floor:3}),g=game(w),mini=w.enemies.find(e=>e.miniBoss),main=w.enemies.find(e=>e.isDungeonMainBoss);assert(mini&&main);kill(g,mini);assert.equal(portals(w).length,1);assert(canUseBossReturnPortal(w,portals(w)[0]));assert(main.hp>0);assert(!w.dungeonState.cleared);assert(w.objects.filter(o=>o.chestType==='boss').every(o=>o.locked));
});
