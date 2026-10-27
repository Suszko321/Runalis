import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createPlayer} from '../src/player.js';
import {createWorld,isActorPositionPassable,isPassable,moveActorWithCollision} from '../src/world.js';
import {createDungeonWorld,enterDungeon,exitDungeon,sanitizeDungeonSaveState,restoreDungeonFromSaveState,triggerDungeonEvent,updateDungeonEvents} from '../src/dungeonSystem.js';
import {initializeDungeonArena,updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {updateOverworldEncounters} from '../src/overworldEncounterSystem.js';
import {captureContinentalState,continentalMemory} from '../src/continentPersistence.js';
import {updateEnemies} from '../src/combat.js';
import {updateEliteEncounters,getEliteHazards,clearEliteEncounters,mitigateEliteHit} from '../src/eliteEncounterSystem.js';
import {ELITE_MODIFIERS,geographicEncounterProfile,dungeonEncounterProfile,configureEncounterEnemy,encounterRng,compatibleEliteModifiers,chooseEliteModifiers,DUNGEON_ENCOUNTERS} from '../src/encounterData.js';
import {createEnemyLootDrops} from '../src/lootSystem.js';
import {getEnemyNameplate} from '../src/humanoidEnemies.js';
import {populationPositionSafe} from '../src/encounterPopulation.js';
import {completeDungeonAfterBoss} from '../src/dungeonCompletion.js';

const report={checks:[],dungeons:[],performance:{},modifierChecks:[]};
function check(name,fn){fn();report.checks.push(name);console.log('PASS',name);}
const openWorld=()=>({mode:'overworld',width:80,height:60,tiles:Array.from({length:60},()=>Array.from({length:80},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],combatEffects:[],drops:[]});
const foe=(id='test')=>({id,kind:'brute',archetype:'brute',x:800,y:700,homeX:800,homeY:700,radius:14,hp:200,maxHp:200,damage:12,xp:10,speed:60,aggroRange:240,attackRange:25,eliteModifiers:[],isInCombat:true});
check('geography, stats and XP never read player strength',()=>{
 const profile=geographicEncounterProfile(70,62),a=foe(),b=foe();configureEncounterEnemy(a,profile,'stable');configureEncounterEnemy(b,profile,'stable');assert.deepEqual(a,b);assert(a.combatLevel>=2&&a.combatLevel<=5);assert.equal(a.xp,a.baseCombatXp);assert(getEnemyNameplate(a).text.includes(`Lv ${a.combatLevel}`));
 const normal=foe(),elite=foe(),rare=foe();for(const [e,rank] of [[normal,'ordinary'],[elite,'elite'],[rare,'rare']])configureEncounterEnemy(e,profile,'same',{rank});
 assert(elite.maxHp/normal.maxHp>2.4&&elite.maxHp/normal.maxHp<2.6);assert(rare.maxHp/normal.maxHp>4.4&&rare.maxHp/normal.maxHp<4.6);assert(elite.xp>normal.xp&&rare.xp>elite.xp);
 assert.equal(elite.eliteModifiers.length,1);assert.equal(rare.eliteModifiers.length,2);
});
check('modifier pairs permit deliberate frost containment but exclude pull prisons and guard healing',()=>{
 for(let i=0;i<200;i++){const mods=chooseEliteModifiers(encounterRng(i),2);assert(mods.length===2);assert(compatibleEliteModifiers(...mods));}
 assert(!compatibleEliteModifiers('waller','vortex'));assert(compatibleEliteModifiers('waller','freezer'));assert(!compatibleEliteModifiers('freezer','vortex'));assert(!compatibleEliteModifiers('bulwark','regenerator'));
 assert(!chooseEliteModifiers(encounterRng(3),2,{confined:true}).includes('waller'));
});
for(const mod of Object.keys(ELITE_MODIFIERS))check(`${mod}: actual mechanic, warning, counter and cleanup`,()=>{
 const w=openWorld(),e=foe(mod),p=createPlayer('modifier test');Object.assign(p,{x:970,y:700,hp:500,maxHp:500});e.eliteModifiers=[mod];e.hp=mod==='regenerator'?70:200;w.enemies=[e];
 if(mod==='molten')p.x=e.x+30;
 let warned=false,damage=0,barrier=false,pulled=false,healed=false,guard=false,slow=false,vortexMoved=false,released=false;
 const hurt=(owner,target,amount)=>{damage+=amount;target.hp-=amount;return{hpDamage:amount};};
 for(let i=0;i<100;i++){
  updateEliteEncounters(w,p,.1,i*.1,hurt,()=>{});
  const hazards=getEliteHazards(w);if(hazards.some(h=>h.age>=h.warning)||damage>0)released=true;if(hazards.some(h=>h.age<h.warning)){warned=true;if(!released)assert.equal(damage,0,'first warning is harmless');}
  if(mod==='vortex'&&!vortexMoved&&hazards.some(h=>h.age<h.warning)){p.x=1030;vortexMoved=true;}
  barrier ||= (w.encounterBarriers||[]).length>0;pulled ||= vortexMoved&&p.x<1030;healed ||= mod==='regenerator'&&e.hp>70;guard ||= e.eliteGuardActive;slow ||= p.slowTimer>0;
 }
 if(['shocker','freezer','molten','artillery'].includes(mod)){assert(warned);assert(damage>0);}
 if(mod==='freezer')assert(slow);
 if(mod==='waller'){assert(warned&&barrier);assert(isPassable(w,970,700));}
 if(mod==='vortex'){assert(warned&&pulled);assert(damage>0,'announced vortex collapse damages exposed targets');}
 if(mod==='regenerator'){assert(healed);assert(e.hp<e.maxHp);const available=e.hp;for(let i=0;i<600;i++)updateEliteEncounters(w,p,.1,10+i*.1,hurt);assert(e.hp<=available+e.maxHp*.3);}
 if(mod==='bulwark'){assert(guard);e.eliteGuardActive=true;e.eliteGuardX=1;e.eliteGuardY=0;assert.equal(mitigateEliteHit(e,{x:e.x+50,y:e.y},100),35);assert.equal(mitigateEliteHit(e,{x:e.x-50,y:e.y},100),100);}
 clearEliteEncounters(w);assert.equal(getEliteHazards(w).length,0);assert.equal(w.encounterBarriers.length,0);
 report.modifierChecks.push({modifier:mod,warning:warned,damage,barrier,pulled,healed,guard,slow});
});
check('ground hazards can be escaped; vortex cannot pass walls or gain shield immunity',()=>{
 const w=openWorld(),e=foe('escape'),p={x:970,y:700,hp:500,maxHp:500};e.eliteModifiers=['shocker'];w.enemies=[e];let damage=0;
 for(let i=0;i<100;i++){updateEliteEncounters(w,p,.1,i*.1,(_e,_p,n)=>{damage+=n;return{hpDamage:n};});if(getEliteHazards(w).some(h=>h.age<h.warning))p.y=920;}
 assert.equal(damage,0);
 const v=foe('pull');v.eliteModifiers=['vortex'];w.enemies=[v];Object.assign(p,{x:970,y:700,buffs:{bubbleWard:{flatAbsorb:1000,until:1000}}});clearEliteEncounters(w);
 let h;for(let i=0;i<80;i++){updateEliteEncounters(w,p,.1,i*.1,()=>({hpDamage:0}));h=getEliteHazards(w)[0];if(h)break;}assert(h);
 p.x=h.x+60;w.tiles[Math.floor(p.y/32)][Math.floor((h.x+20)/32)]={biome:'wall',passable:false};const x=p.x;
 for(let i=50;i<80;i++)updateEliteEncounters(w,p,.1,i*.1,()=>({hpDamage:0}));assert(p.x<=x&&p.x>h.x,'collision stops pull at wall');
});
check('molten death explosion is delayed, once only, and load cleanup removes it',()=>{
 const w=openWorld(),e=foe('death'),p={x:800,y:700,hp:500,maxHp:500};e.eliteModifiers=['molten'];w.enemies=[e];e.dead=true;e.hp=0;let damage=0;
 updateEliteEncounters(w,p,.1,0,(_e,_p,n)=>{damage+=n;});assert(getEliteHazards(w).some(h=>h.kind==='moltenDeath'));assert.equal(damage,0);
 for(let i=0;i<30;i++)updateEliteEncounters(w,p,.1,i*.1,(_e,_p,n)=>{damage+=n;});assert(damage>0);assert.equal(getEliteHazards(w).length,0);
 const previous=damage;for(let i=0;i<30;i++)updateEliteEncounters(w,p,.1,i*.1,(_e,_p,n)=>{damage+=n;});assert.equal(damage,previous);
});
check('enemy summons yield zero loot or XP and repeated death rewards are guarded',()=>{
 const w=openWorld(),p=createPlayer('rewards'),e=foe('no-rewards');e.summonedBy='priest';e.rewardSuppressed=true;e.dead=true;e.hp=0;w.enemies=[e];const xp=p.combat?.xp||0;updateEnemies(.016,p,w,()=>{},0);assert.equal(p.combat?.xp||0,xp);assert.equal(w.drops.length,0);assert.equal(e.xp,0);
 const a=foe('seed-loot'),b=foe('seed-loot');configureEncounterEnemy(a,geographicEncounterProfile(500,350),'fixed-reward',{rank:'rare'});Object.assign(b,JSON.parse(JSON.stringify(a)));
 const dropsA=createEnemyLootDrops(a,p,w).map(d=>[d.itemId,d.qty]),dropsB=createEnemyLootDrops(b,p,openWorld()).map(d=>[d.itemId,d.qty]);assert.deepEqual(dropsA,dropsB);assert.deepEqual(createEnemyLootDrops(a,p,w),[]);
});
const surface=createWorld({skipPublishedOverride:true}),entrances=surface.continentRuntime.allObjects.filter(o=>o.kind==='dungeonEntrance');
check('every live dungeon entrance and floor has local stats, inhabited combat rooms and a reserved final arena',()=>{
 for(const entrance of entrances){
  const id=entrance.dungeonId||entrance.poiId||entrance.id;assert(DUNGEON_ENCOUNTERS[id],`missing explicit dungeon profile ${id}`);
  const initial=createDungeonWorld({dungeonId:id,seed:`coverage:${id}`,theme:entrance.theme,tier:entrance.tier,depth:entrance.depth,skipPublishedOverride:true});
  for(let floor=1;floor<=initial.totalFloors;floor++){
   const w=createDungeonWorld({dungeonId:id,seed:`coverage:${id}`,theme:entrance.theme,tier:entrance.tier,depth:entrance.depth,floor,skipPublishedOverride:true});
   const profile=dungeonEncounterProfile(w);let occupied=0,combat=0;
   for(const room of w.rooms){if(['entrance','quiet','shrine','boss'].includes(room.role))continue;combat++;const pack=w.enemies.filter(e=>e.roomId===room.id);if(pack.length)occupied++;assert(pack.length>=1,`${id} floor ${floor} empty ${room.role} room ${room.id}`);}
   for(const e of w.enemies){assert(e.combatLevel>=profile.levels[0]);assert(e.xp===e.baseCombatXp&&e.xp>0);assert(!e.progressionFallback);assert(isActorPositionPassable(w,e.x,e.y,e.radius||12),`${id}: ${e.id} embedded in terrain`);}
   if(floor===w.totalFloors){assert(w.bossArena);assert(w.bossArena.w>=26*32&&w.bossArena.h>=22*32);}
   report.dungeons.push({entrance:entrance.id,id,floor,rooms:w.rooms.length,combatRooms:combat,occupiedRooms:occupied,enemies:w.enemies.length,levels:profile.levels,arena:w.bossArena?{width:w.bossArena.w,height:w.bossArena.h}:null});
  }
 }
});
check('arena commitment, collision, midfight reload, failure reset and victory portal',()=>{
 const w=createDungeonWorld({dungeonId:'ashenOrchard',floor:2,seed:'arena',skipPublishedOverride:true}),p=createPlayer('arena');const a=w.bossArena,b=w.enemies.find(e=>e.isDungeonMainBoss);assert(a&&b);
 Object.assign(p,{x:a.x+80,y:a.y+80});updateDungeonArena(w,p);assert.equal(a.phase,'active');assert(w.arenaBarriers.length===4);assert(!isPassable(w,a.x+4,a.y+100));
 moveActorWithCollision(p,w,-200,0);assert(p.x>a.x+12);
 const saved=sanitizeDungeonSaveState(w),loaded=restoreDungeonFromSaveState(saved);assert.equal(loaded.bossArena.phase,'active');assert(loaded.arenaBarriers.length===4);
 b.hp=1;resetFailedDungeonArena(w);assert.equal(a.phase,'dormant');assert.equal(b.hp,b.maxHp);assert.equal(w.arenaBarriers.length,0);assert(!w.objects.some(o=>o.returnPortal));
 updateDungeonArena(w,p);b.hp=0;b.dead=true;assert(completeDungeonAfterBoss(w,b));updateDungeonArena(w,p);assert.equal(a.phase,'defeated');assert.equal(w.arenaBarriers.length,0);assert(w.objects.some(o=>o.returnPortal));assert(!completeDungeonAfterBoss(w,b));
});
check('multi-boss arenas unlock only after every required boss; surviving adds do not block',()=>{
 const w=createDungeonWorld({dungeonId:'ashenOrchard',floor:2,seed:'multiple',skipPublishedOverride:true}),boss=w.enemies.find(e=>e.isDungeonMainBoss),other={...boss,id:'second-required',hp:100};w.enemies.push(other);initializeDungeonArena(w);
 boss.hp=0;boss.dead=true;assert(!completeDungeonAfterBoss(w,boss));other.hp=0;other.dead=true;assert(completeDungeonAfterBoss(w,other));assert(w.objects.some(o=>o.returnPortal));
});
check('leaving, saving and returning retain the dungeon run and defeated rooms',()=>{
 const p=createPlayer('run'),game={world:surface,player:p,canvas:{width:960,height:540},camera:{x:0,y:0},log(){}};Object.assign(p,surface.spawn);
 const entrance=entrances.find(o=>o.poiId==='ashenOrchard');assert(enterDungeon(game,entrance));const id=game.world.dungeonState.id,e=game.world.enemies[0];e.dead=true;e.hp=0;assert(exitDungeon(game,{force:true}));assert(enterDungeon(game,entrance));assert.equal(game.world.dungeonState.id,id);assert(!game.world.enemies.some(enemy=>enemy.id===e.id));
});
check('dungeon event warns before spawning and guards its reward until completion',()=>{
 const w=createDungeonWorld({dungeonId:'ashenOrchard',seed:'events',skipPublishedOverride:true}),p=createPlayer('event'),event=w.objects.find(o=>o.kind==='dungeonEvent');assert(event);const count=w.enemies.length;
 w.objects.push({id:'guarded-test-cache',kind:'dungeonChest',unlockOnEventId:event.id,locked:true});assert(triggerDungeonEvent({world:w,player:p,log(){}},event));assert.equal(w.enemies.length,count);
 updateDungeonEvents(w,p,1.6,()=>{});assert(w.enemies.length>count);const cache=w.objects.find(o=>o.id==='guarded-test-cache');assert(cache.locked);
 for(const id of w.dungeonState.activeEvents[event.id].memberIds){const e=w.enemies.find(e=>e.id===id);e.hp=0;e.dead=true;}updateDungeonEvents(w,p,.1,()=>{});assert(!cache.locked);
});
check('seeded overworld populations persist wounds, identity and timers without visible spawning',()=>{
 const p=createPlayer('population');Object.assign(p,{x:68*32,y:61*32});p.worldMemory={elapsed:100};const w=createWorld({player:p,skipPublishedOverride:true}),g={world:w,player:p,canvas:{width:960,height:540},camera:{x:p.x-480,y:p.y-270}};
 for(let i=0;i<24;i++)updateOverworldEncounters(g,1.3,i);
 const generated=w.enemies.filter(e=>e.dynamicEncounter);assert(generated.length>0);const allIds=generated.map(e=>e.id);assert.equal(new Set(allIds).size,allIds.length);
 for(const e of generated){assert(Math.abs(e.x-p.x)>576||Math.abs(e.y-p.y)>366,'spawn is outside camera plus margin');assert(isActorPositionPassable(w,e.x,e.y,e.radius||12));}
 const target=generated[0];target.hp-=3;captureContinentalState(g);const memory=JSON.stringify(p.worldMemory),loadedP=createPlayer('loaded');loadedP.worldMemory=JSON.parse(memory);Object.assign(loadedP,{x:p.x,y:p.y});const loaded=createWorld({player:loadedP,skipPublishedOverride:true});loaded.continentRuntime.activate([loadedP],loadedP,true);
 const restored=loaded.continentRuntime.findObject(target.id);assert(restored);assert.equal(restored.hp,target.hp);assert.deepEqual(restored.eliteModifiers,target.eliteModifiers);
 const before=Object.keys(continentalMemory(loadedP).events).length;for(let i=0;i<5;i++)updateOverworldEncounters({world:loaded,player:loadedP},1.3,0);assert(Object.keys(continentalMemory(loadedP).events).length>=before);assert.equal(loaded.enemies.filter(e=>e.id===target.id).length,1);
 assert(!populationPositionSafe(w,[p],p.x,p.y));
 report.population={generated:generated.length,areas:w.populationAreas.length,saveBytes:memory.length};
});
check('dense dungeon simulation stays bounded and records measured update times',()=>{
 const w=createDungeonWorld({dungeonId:'ascensionSpire',floor:4,tier:8,depth:4,seed:'density-performance',playerCount:4,skipPublishedOverride:true}),p=createPlayer('performance');p.hp=p.maxHp=100000;
 const room=w.rooms.filter(r=>r.role!=='boss').sort((a,b)=>w.enemies.filter(e=>e.roomId===b.id).length-w.enemies.filter(e=>e.roomId===a.id).length)[0];Object.assign(p,{x:room.cx*32,y:room.cy*32});
 const pack=w.enemies.filter(e=>e.roomId===room.id);for(const e of pack)e.hasDetectedPlayer=e.isInCombat=true;
 const elite=pack.find(e=>e.eliteModifiers?.some(m=>['shocker','freezer','molten','vortex','artillery'].includes(m)));assert(elite,'stress room has a natural modifier');
 p.x=elite.x+100;p.y=elite.y;let peakHazards=0,engaged=0;
 const times=[];for(let i=0;i<1500;i++){p.hp=p.maxHp=100000;const start=performance.now();updateEnemies(1/60,p,w,()=>{},i/60);times.push(performance.now()-start);peakHazards=Math.max(peakHazards,getEliteHazards(w).length);engaged=Math.max(engaged,w.enemies.filter(e=>e.isInCombat||e.hasDetectedPlayer).length);w.effects=w.effects.filter(f=>{f.ttl-=1/60;return f.ttl>0;});}
 times.sort((a,b)=>a-b);report.performance={scenario:'Four-player density, occupied combat room; one invincible measurement actor, natural modifiers',enemies:w.enemies.length,roomEnemies:pack.length,engaged,peakHazards,ticks:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)};assert(peakHazards>0&&peakHazards<=24);
});
report.coverage={liveEntrances:entrances.length,distinctDungeonIds:new Set(report.dungeons.map(d=>d.id)).size,distinctFloors:new Set(report.dungeons.map(d=>`${d.id}:${d.floor}`)).size,entranceFloorCases:report.dungeons.length};
fs.mkdirSync('docs/enemy-density',{recursive:true});fs.writeFileSync('docs/enemy-density/verification.json',JSON.stringify(report,null,2));console.log(`Passed ${report.checks.length} enemy density checks across ${report.dungeons.length} entrance/floor cases.`);
