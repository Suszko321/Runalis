import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer} from '../src/player.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createDungeonWorld,triggerDungeonEvent,updateDungeonEvents} from '../src/dungeonSystem.js';
import {updateDungeonArena} from '../src/dungeonArenaSystem.js';
import {createSaveState,applySaveToGame,slimSaveState} from '../src/gameSave.js';
import {updateEnemies} from '../src/combat.js';
import {captureContinentalState,continentalMemory} from '../src/continentPersistence.js';
import {updateAuthoredPopulation,createPopulationPatrol,updatePopulationPatrol} from '../src/encounterPopulation.js';
import {updateEliteEncounters,getEliteHazards,resetEliteEnemy} from '../src/eliteEncounterSystem.js';
import {createTowerFloorWorld,exitTower} from '../src/towerSystem.js';
import {createProceduralSideZoneWorld} from '../src/sideZoneSystem.js';
import {rememberRepeatableInstance,restoreRepeatableInstance} from '../src/instanceEncounterMemory.js';
import {CONTINENT_REGIONS} from '../src/continentDefinition.js';
import {claimWorldCache} from '../src/gameInteraction.js';
import {applyBossDefeatRewards} from '../src/bossSystem.js';
import {updateOverworldEncounters} from '../src/overworldEncounterSystem.js';
import {recordEnemyCombatContribution} from '../src/combatProgression.js';
import {rollRegionalMythical} from '../src/regionalLootSystem.js';
import {rollLegendaryBossDrop} from '../src/legendarySystem.js';
const report={checks:[],regions:[],sideZones:0,towerFloors:0};
const check=(name,fn)=>{fn();report.checks.push(name);console.log('PASS',name);};
const game=(world,player=createPlayer('review'))=>({world,player,canvas:{width:960,height:540},camera:{x:0,y:0},log(){},logLines:[]});
check('summon death survives production chunk crossing and grants rewards once',()=>{
 const p=createPlayer('stream death');Object.assign(p,{x:68*32,y:61*32});p.worldMemory={elapsed:100};const w=createWorld({player:p,skipPublishedOverride:true}),g=game(w,p);w.continentRuntime.refresh(g);
 const e={id:'review-pending-death',kind:'ashWolf',x:p.x+70,y:p.y,radius:14,hp:80,maxHp:80,damage:8,xp:25,baseCombatXp:25,combatLevel:4,dynamicEncounter:true,spawnedAt:100,despawnAfter:900,eliteModifiers:['molten']};w.enemies.push(e);w.continentRuntime.register(e,'enemies');
 e.dead=true;e.hp=0;captureContinentalState(g);p.x+=25*32;w.continentRuntime.activate([p],p,true);assert(w.enemies.includes(e));
 updateOverworldEncounters(g,.1,0);assert(w.enemies.includes(e),'population cleanup retains the pending death');
 const reloaded=createPlayer('pending load');reloaded.worldMemory=JSON.parse(JSON.stringify(p.worldMemory));Object.assign(reloaded,{x:p.x,y:p.y});const lw=createWorld({player:reloaded,skipPublishedOverride:true});lw.continentRuntime.activate([reloaded],reloaded,true);const pending=lw.continentRuntime.findObject(e.id);assert(pending&&!pending.deathHandled);updateEnemies(.016,reloaded,lw,()=>{},0);assert(pending.deathHandled);
 const before=JSON.stringify(p.skills);updateEnemies(.016,p,w,()=>{},0);assert(e.deathHandled);assert.notEqual(JSON.stringify(p.skills),before);const after=JSON.stringify(p.skills);updateEnemies(.016,p,w,()=>{},.016);assert.equal(JSON.stringify(p.skills),after);
});
check('checkpoint tombstones survive the 720-second boundary and unlock rewards',()=>{
 const p=createPlayer('boundary');Object.assign(p,{x:68*32,y:61*32});p.worldMemory={elapsed:721};const w=createWorld({player:p,skipPublishedOverride:true}),g=game(w,p),m=continentalMemory(p);
 w.populationAreas=[{id:'boundary-site',x:68,y:61,rx:1,ry:1}];w.overworldPopulationState={timer:0};m.events['boundary-site']={status:'active',cycle:0,encounterId:'boundary',memberIds:['last-guard'],startedAt:700,nextAt:1100};m.entities['last-guard']={kind:'enemy',dead:true,hp:0,retireAt:720};
 const cache={id:'boundary:cache',kind:'worldCache',x:p.x,y:p.y,locked:true,dynamicEncounter:true,spawnedAt:700,despawnAfter:900};w.objects.push(cache);w.continentRuntime.register(cache);captureContinentalState(g);assert(m.entities['last-guard']);
 updateAuthoredPopulation(g,1.3,()=>{});assert.equal(m.events['boundary-site'].status,'cleared');assert.equal(cache.locked,false);assert(!cache.remove);
});
check('fresh elite state clears interrupted healing and stale guard flags',()=>{
 const w=createDungeonWorld({dungeonId:'ashenOrchard',seed:'stale',skipPublishedOverride:true}),p=createPlayer('stale'),e=w.enemies.find(e=>!e.isBoss);Object.assign(p,{x:e.x+120,y:e.y});Object.assign(e,{eliteModifiers:['regenerator'],eliteHealing:true,eliteGuardActive:true,eliteAttackPauseTimer:99});updateEliteEncounters(w,p,.1,0,()=>{},()=>{});assert(!e.eliteHealing);assert(!e.eliteGuardActive);assert.equal(e.eliteAttackPauseTimer,0);
});
check('respawned resident elites receive fresh death effects and finite healing',()=>{
 const p=createPlayer('resident'),w=createDungeonWorld({dungeonId:'ashenOrchard',seed:'resident-reset',skipPublishedOverride:true}),e=w.enemies.find(e=>!e.isBoss);Object.assign(p,{x:e.x+30,y:e.y});e.eliteModifiers=['molten'];
 for(let cycle=0;cycle<2;cycle++){e.dead=true;e.hp=0;updateEliteEncounters(w,p,.1,0,()=>{},()=>{});assert.equal(getEliteHazards(w).filter(h=>h.kind==='moltenDeath').length,1);resetEliteEnemy(w,e);e.dead=false;e.remove=false;e.hp=e.maxHp;}
 e.eliteHealRemaining=0;resetEliteEnemy(w,e);assert.equal(e.eliteHealRemaining,undefined);
});
check('production save restores arena geometry and restarts invisible warnings',()=>{
 const w=createDungeonWorld({dungeonId:'ashenOrchard',floor:2,seed:'production-save',skipPublishedOverride:true}),p=createPlayer('arena save'),g=game(w,p),a=w.bossArena;Object.assign(p,{x:a.x+80,y:a.y+80});updateDungeonArena(w,p);
 const b=w.enemies.find(e=>e.isBoss);b.hp-=5;b.boss={phase:2,pendingSpecial:{timer:.01},specialTimer:0,recoveryUntil:99};b.eliteHealing=true;
 const saved=slimSaveState(createSaveState(g)),loaded=game(createWorld());assert(applySaveToGame(loaded,saved));assert.equal(loaded.world.dungeonId,w.dungeonId);assert.equal(loaded.world.rooms.length,w.rooms.length);assert.equal(loaded.world.bossArena.phase,'active');assert.equal(loaded.world.arenaBarriers.length,4);
 const lb=loaded.world.enemies.find(e=>e.id===b.id);assert.equal(lb.hp,b.hp);assert.equal(lb.boss.phase,2);assert.equal(lb.boss.pendingSpecial,null);assert(lb.boss.specialTimer>=2);assert(!lb.eliteHealing);
});
check('tower bosses have an approach, physical gate and sealed normal exit',()=>{
 const p=createPlayer('tower'),w=createTowerFloorWorld(10,p),g=game(w,p);Object.assign(p,w.spawn);updateDungeonArena(w,p);assert.equal(w.bossArena.phase,'dormant');
 Object.assign(p,{x:19*32,y:23*32});updateDungeonArena(w,p);assert.equal(w.bossArena.phase,'active');assert(w.arenaGates.length>0);assert.equal(exitTower(g),false);
 const saved=createSaveState(g),loaded=game(createWorld());applySaveToGame(loaded,saved);assert.equal(loaded.world.bossArena.phase,'active');assert.equal(loaded.world.floorType,'boss');assert.equal(exitTower(loaded),false);
});
check('validated patrol routes remain passable and stalled routes reverse',()=>{
 const w=createWorld({skipPublishedOverride:true});let routes=0;
 for(const e of w.continentRuntime.allEnemies.slice(0,180)){const route=createPopulationPatrol(w,e);if(!route)continue;routes++;for(const p of route)assert(isActorPositionPassable(w,p.x,p.y,e.radius||14));}
 assert(routes>20);const e={x:0,y:0,speed:30,patrolRoute:[{x:1000,y:1000},{x:0,y:0}],patrolIndex:0};const solid={width:2,height:2,tiles:[[{},{}],[{},{}]],objects:[]};for(let i=0;i<20;i++)updatePopulationPatrol(e,solid,{x:9999,y:9999},.1);assert(e.patrolIndex!==0||e.patrolBlockedTime<1);
});
check('all eight regional towers and ten side-zone types use fixed local stats',()=>{
 const types=['hollowGrove','abandonedMine','ashenFarmstead','graveyardCellar','failedPurificationSite','confessionVault','choirReliquary','lightstormScar','namelessVault','worldrootRift'];
 for(const region of CONTINENT_REGIONS){report.regions.push(region.id);for(const type of types){const w=createProceduralSideZoneWorld({type,regionId:region.id,seed:`review:${region.id}:${type}`});for(const e of w.enemies){assert(e.combatLevel>=region.levels[0]);assert(!e.arenaDormant||e.groveMother);assert(e.encounterStatsVersion);assert(e.xp>0);}report.sideZones++;}
 for(const floor of [1,5,10,20]){const w=createTowerFloorWorld(floor,createPlayer('tower'),region.id);for(const e of w.enemies){assert(e.combatLevel>=region.levels[0]+floor-1);assert(e.encounterStatsVersion);}if(floor%10===0)assert(w.bossArena);report.towerFloors++;}}
});
check('repeatable floors preserve defeated enemies, wounds and claimed chests',()=>{
 const p=createPlayer('repeat'),w=createTowerFloorWorld(1,p),e=w.enemies[0],hurt=w.enemies[1];Object.assign(p,w.spawn);e.hp=0;e.dead=true;hurt.hp-=5;w.objects.find(o=>o.kind==='towerRewardChest').claimed=true;for(let i=0;i<40;i++)updateEnemies(.016,p,w,()=>{},i*.016);assert(!w.enemies.includes(e),'corpse has left the runtime');rememberRepeatableInstance(game(w,p));
 const loaded=createTowerFloorWorld(1,p);assert(restoreRepeatableInstance(loaded,p));assert(!loaded.enemies.some(o=>o.id===e.id));assert.equal(loaded.enemies.find(o=>o.id===hurt.id).hp,hurt.hp);assert(loaded.objects.find(o=>o.kind==='towerRewardChest').claimed);
});
check('side-zone event ownership survives the production save and unlocks its reward',()=>{
 const p=createPlayer('side event'),w=createProceduralSideZoneWorld({type:'abandonedMine',regionId:'hearthmereFrontier',seed:'event-save'}),g=game(w,p),event=w.objects.find(o=>o.kind==='dungeonEvent');assert(event);triggerDungeonEvent(g,event);updateDungeonEvents(w,p,1.6,()=>{});const ids=w.dungeonState.activeEvents[event.id].memberIds;
 recordEnemyCombatContribution(w.enemies.find(e=>e.id===ids[0]),p,'warding',5,{source:'ability'});p.questOwner=p;
 const saved=createSaveState(g),loaded=game(createWorld());applySaveToGame(loaded,saved);assert(loaded.world.dungeonState.activeEvents[event.id]);
 for(const id of ids){const e=loaded.world.enemies.find(e=>e.id===id);assert(e);e.hp=0;e.dead=true;}updateDungeonEvents(loaded.world,loaded.player,.1,()=>{});assert(loaded.world.objects.filter(o=>o.unlockOnEventId===event.id).every(o=>!o.locked));
});
check('locked caches and duplicate boss rewards cannot be claimed; early random endgame drops are excluded',()=>{
 const p=createPlayer('rewards'),g=game(createWorld(),p);assert.equal(claimWorldCache(g,{locked:true,rewards:[['ashCoin',99]]}),false);
 const b={id:'reward-boss',isBoss:true,bossType:'thorn',rewardSeed:'rewards',combatLevel:5,encounterStatsVersion:'geographic-density-1'};applyBossDefeatRewards(b,p,g.world,()=>{});const kills=JSON.stringify(p.bossKills);applyBossDefeatRewards(b,p,g.world,()=>{});assert.equal(JSON.stringify(p.bossKills),kills);
 assert.equal(rollRegionalMythical({...b,kind:'ashWolf'},g.world,()=>0),null);assert.equal(rollLegendaryBossDrop(b,()=>0),null);
});
fs.writeFileSync('docs/enemy-density/review-verification.json',JSON.stringify(report,null,2));console.log(`Passed ${report.checks.length} critical-review checks.`);
