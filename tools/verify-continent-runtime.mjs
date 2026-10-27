import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {CONTINENT_ROADS,CONTINENT_SPAWNS} from '../src/continentDefinition.js';
import {enterCapitalHub,exitCapitalHub} from '../src/hubSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {captureContinentalState} from '../src/continentPersistence.js';
import {updateOverworldEncounters} from '../src/overworldEncounterSystem.js';
import {setStoryFlag} from '../src/storyProgress.js';
import {rememberHarvest} from '../src/worldExploration.js';
const checks=[],report={};
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);}
function fixture(){const player=createPlayer('Continental verification'),world=createWorld();Object.assign(player,world.spawn);return {world,player,canvas:{width:960,height:600},camera:{x:0,y:0},log(){},save(){},shake(){}};}
const game=fixture(),w=game.world,p=game.player;
check('every authored road supports a real walking footprint through its entire route',()=>{
 const blocked=[],results=[];
 for(const r of CONTINENT_ROADS){const a={x:(r.points[0][0]+.5)*32,y:(r.points[0][1]+.5)*32};let samples=0;
  w.continentRuntime.activate([a],p,true);
  for(let i=1;i<r.points.length;i++){const [tx,ty]=r.points[i].map(v=>(v+.5)*32);const start={...a},distance=Math.hypot(tx-start.x,ty-start.y),steps=Math.ceil(distance/12);
   for(let j=1;j<=steps;j++){const x=start.x+(tx-start.x)*j/steps,y=start.y+(ty-start.y)*j/steps;w.continentRuntime.activate([{x,y}],p);moveActorWithCollision(a,w,x-a.x,y-a.y,12);samples++;if(Math.hypot(a.x-x,a.y-y)>1){blocked.push({road:r.id,x:x/32,y:y/32});break;}}
   if(blocked.at(-1)?.road===r.id)break;
  }results.push({id:r.id,samples});
 }report.roads=results;assert.deepEqual(blocked,[]);
});
check('Orrakai south and east gates preserve the actual surface state and orientation',()=>{
 for(const gateId of ['south','east']){
  const gate=w.continentRuntime.findObject(gateId==='south'?'capital-gate-prototype':'orrakai-east-surface-gate');Object.assign(p,gate);w.continentRuntime.refresh(game);
  const enemy=w.continentRuntime.allEnemies[0];enemy.hp-=7;captureContinentalState(game);const hp=enemy.hp;
  assert(enterCapitalHub(game,gate));assert.equal(game.world.mode,'capital');const exit=game.world.objects.find(o=>o.kind==='capitalExit'&&o.gateId===gateId);assert(exit);assert(isActorPositionPassable(game.world,p.x,p.y,12));
  assert(exitCapitalHub(game,exit));assert.equal(game.world,w);assert.equal(w.continentRuntime.allEnemies[0].hp,hp);assert(isActorPositionPassable(w,p.x,p.y,12));assert.equal(gateId==='east'?p.dirX:p.dirY,1);
 }
 Object.assign(p,{x:2730*32,y:430*32});w.continentRuntime.refresh(game);assert(enterCapitalHub(game));assert(exitCapitalHub(game));assert(Math.hypot(p.x-17.5*32,p.y-36.85*32)<100,'Map return exits at Orrakai, not the remote calling position');
});
check('loaded continental runtime continues streaming at distant positions',()=>{
 Object.assign(p,{x:2730*32,y:430*32});w.continentRuntime.refresh(game);const save=JSON.parse(JSON.stringify(createSaveState(game)));assert(applySaveToGame(game,save));assert.equal(game.world.continentId,'runalis');game.world.continentRuntime.update(game,1);assert(game.world.objects.some(o=>o.npcId==='zarynthTradeWardSteward'));
 // The Nav Stone network moved and renamed the old pass-lantern stone. Test
 // streaming at the actual current destination rather than its retired ID.
 const lantern=game.world.navStones.find(o=>o.id==='continent-last-lantern-overlook-nav');assert(lantern);
 Object.assign(game.player,{x:lantern.x,y:lantern.y});game.world.continentRuntime.update(game,1);assert(game.world.objects.some(o=>o.id===lantern.id));assert(game.world.continentRuntime.stats().activeEntityChunks<=25);
});
check('physical region crossing advances eligible story progress, never early exploration',()=>{
 const g=fixture();Object.assign(g.player,{x:1150*32,y:305*32});g.world.continentRuntime.update(g,0);assert.equal(g.player.story.act,'act1');
 g.player.quests.completed.act1HearthmereAshes={id:'act1HearthmereAshes'};setStoryFlag(g.player,'act1Complete');g.world.continentRuntime.update(g,0);assert.equal(g.player.story.act,'act2');assert(g.player.quests.active.act2AureateReckoning);
});
check('encounter identities and geography survive reload without extra rewards or player scaling',()=>{
 function spawn(level){const g=fixture();g.player.combatLevel=level;g.player.worldMemory={elapsed:0};Object.assign(g.player,{x:708*32,y:160*32});g.world.continentRuntime.update(g,0);g.world.overworldEncounterState={timer:0,spawnSerial:1};updateOverworldEncounters(g,1,99999);return g;}
 const low=spawn(1),high=spawn(80),dynamic=g=>g.world.enemies.filter(e=>e.dynamicEncounter).map(e=>[e.id,e.kind,e.hp,e.maxHp,e.damage,e.combatLevel,e.x,e.y]);
 assert(dynamic(low).length,'Authored continental encounter area must be populated');assert.deepEqual(dynamic(low),dynamic(high));
 const victim=low.world.enemies.find(e=>e.dynamicEncounter);victim.dead=true;victim.hp=0;low.world.continentRuntime.refresh(low);const saved=JSON.parse(JSON.stringify(createSaveState(low)));assert(applySaveToGame(low,saved));low.world.continentRuntime.update(low,0);low.world.overworldEncounterState={timer:0};updateOverworldEncounters(low,1);assert(!low.world.enemies.some(e=>e.id===victim.id&&e.hp>0));
 const events=saved.player.worldMemory.continent.events;assert(Object.keys(events).length);for(const [area,event] of Object.entries(events))assert.deepEqual(low.player.worldMemory.continent.events[area],event,'Reload cannot reroll an already visited encounter area');
});
check('long continental revisits keep collision, decoration and active populations bounded',()=>{
 const g=fixture(),initial=g.world.continentRuntime.stats().registeredEntities;
 for(let round=0;round<4;round++)for(const [x,y] of Object.values(CONTINENT_SPAWNS)){Object.assign(g.player,{x:(x+.5)*32,y:(y+.5)*32});g.world.continentRuntime.update(g,1);const stats=g.world.continentRuntime.stats();assert(stats.residentChunks<=stats.maxChunks);assert(stats.decorationChunks<=stats.maxDecorationChunks);assert(stats.activeEntityChunks<=25);assert.equal(stats.registeredEntities,initial);}
 report.finalResidency=g.world.continentRuntime.stats();
});
check('inactive resource timers finish on the game clock before the player returns',()=>{
 const g=fixture(),ore=g.world.continentRuntime.allObjects.find(o=>o.kind==='ore'),origin={x:ore.x,y:ore.y};Object.assign(g.player,origin);g.world.continentRuntime.refresh(g);rememberHarvest(g,ore);ore.depleted=true;g.world.continentRuntime.refresh(g);
 Object.assign(g.player,{x:2730*32,y:430*32});g.world.continentRuntime.refresh(g);g.player.worldMemory.elapsed+=301;g.world.continentRuntime.update(g,1);Object.assign(g.player,origin);g.world.continentRuntime.refresh(g);assert.equal(ore.depleted,false);assert.equal(ore.respawn,0);
});
fs.writeFileSync('docs/world-rebuild/runtime-verification.json',JSON.stringify({...report,checks,pass:true},null,2));
console.log(`Verified ${checks.length} real-world runtime groups.`);
