exec(open(__file__.replace('review-fixes','integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/eliteEncounterSystem.js',[("if(!s){s={next:2+", "if(!s){e.eliteHealing=false;e.eliteGuardActive=false;e.eliteAttackPauseTimer=0;e.eliteTelegraph=null;s={next:2+")])
edit('src/continentStreaming.js',[
 ("    if(!e.dynamicEncounter&&!e.temporaryEncounter)return true;", "    if(kind==='enemies'&&(e.dead||e.hp<=0)&&!e.deathHandled)return true;\n    if(!e.dynamicEncounter&&!e.temporaryEncounter)return true;"),
 ("c.enemies.filter(e=>!e.dead&&!e.remove&&e.hp>0)","c.enemies.filter(e=>(!e.dead&&!e.remove&&e.hp>0)||((e.dead||e.hp<=0)&&!e.deathHandled))"),
 ("if(e.hp>0&&!e.dead&&!e.remove&&(e.aggro||e.inCombat||e.alerted||e.combatTargetId)&&!residentEnemies.includes(e))", "if(((e.dead||e.hp<=0)&&!e.deathHandled||e.hp>0&&!e.dead&&!e.remove&&(e.aggro||e.inCombat||e.alerted||e.combatTargetId))&&!residentEnemies.includes(e))")])
edit('src/continentPersistence.js',[
 ("function elapsed(player)","function activePopulationMember(memory,id){return Object.values(memory.events).some(e=>e.status==='active'&&(e.memberIds||[]).includes(id));}\nfunction elapsed(player)"),
 ("if (state.retireAt != null && Number(state.retireAt) <= now) delete memory.entities[id];", "if (state.retireAt != null && Number(state.retireAt) <= now&&!activePopulationMember(memory,id)) delete memory.entities[id];"),
 ("  if (state.retireAt != null && Number(state.retireAt) <= elapsed(player))", "  if (state.retireAt != null && Number(state.retireAt) <= elapsed(player)&&!activePopulationMember(memory,entity.id))")])
edit('src/encounterPopulation.js',[
 ("isActorPositionPassable,moveActorWithCollision", "isActorPositionPassable,moveActorWithCollision,hasLineOfSight"),
 (" moveActorWithCollision(enemy,world,dx/d*Math.min(d,(enemy.speed||55)*.55*dt),dy/d*Math.min(d,(enemy.speed||55)*.55*dt));return true;", " const beforeX=enemy.x,beforeY=enemy.y;moveActorWithCollision(enemy,world,dx/d*Math.min(d,(enemy.speed||55)*.55*dt),dy/d*Math.min(d,(enemy.speed||55)*.55*dt));\n enemy.patrolBlockedTime=Math.hypot(enemy.x-beforeX,enemy.y-beforeY)<.1?(enemy.patrolBlockedTime||0)+dt:0;\n if(enemy.patrolBlockedTime>1){enemy.patrolIndex=((enemy.patrolIndex||0)+1)%enemy.patrolRoute.length;enemy.patrolBlockedTime=0;}return true;"),
 ("export function buildPopulationAreas(world)", "export function createPopulationPatrol(world,enemy,rng=encounterRng(enemy.id)){\n const origin={x:enemy.x,y:enemy.y},radius=enemy.radius||14;\n for(let i=0;i<16;i++){const angle=rng()*Math.PI*2,length=60+rng()*100,point={x:origin.x+Math.cos(angle)*length,y:origin.y+Math.sin(angle)*length};\n if(!isActorPositionPassable(world,point.x,point.y,radius)||!hasLineOfSight(world,origin.x,origin.y,point.x,point.y))continue;\n if(Array.from({length:9},(_,j)=>isActorPositionPassable(world,origin.x+(point.x-origin.x)*j/8,origin.y+(point.y-origin.y)*j/8,radius)).every(Boolean))return[origin,point];}\n return null;\n}\nexport function buildPopulationAreas(world)"),
 ("a.populationType==='patrol'?[{x:e.x,y:e.y},{x:e.x+100,y:e.y+60}]:null", "a.populationType==='patrol'?createPopulationPatrol(w,e):null"),
 ("(a.populationType==='patrol'?'checkpoint':'predator')", "(a.populationType==='patrol'?'checkpoint':members.some(e=>/wolf|beast/i.test(e.kind))?'predator':'guardedCache')"),
 ("event==='checkpoint'?'Guarded Checkpoint Supplies':'Rare Predator Cache'", "event==='checkpoint'?'Guarded Checkpoint Supplies':event==='predator'?'Rare Predator Cache':'Guarded Ruin Cache'")])
edit('src/combat.js',[
 ("    const enemy = info.enemy;\n    const scalar = getEnemyControlScalar(enemy);", "    const enemy = info.enemy;\n    if(enemy.arenaDormant)continue;\n    const scalar = getEnemyControlScalar(enemy);"),
 ("if (!player || player.classId !== 'thornbinder' || !enemy || enemy.dead || enemy.hp <= 0) return;", "if (!player || player.classId !== 'thornbinder' || !enemy || enemy.dead || enemy.hp <= 0 || enemy.arenaDormant) return;"),
 ("  if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) return false;\n\n  const damage", "  if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove || enemy.arenaDormant) return false;\n\n  const damage")])
edit('src/combatMoves.js',[("const aftershock=Math.min(foe.hp,Math.ceil(damage*.25));", "if(foe.arenaDormant)continue;const aftershock=Math.min(foe.hp,Math.ceil(damage*.25));")])
edit('src/dungeonArenaSystem.js',[("e.isBoss&&!e.miniBoss&&!e.summonedBy", "e.isBoss&&!e.miniBoss&&!e.summonedBy&&!e.summonedByBoss")])
edit('src/towerSystem.js',[
 ("import {initializeDungeonArena}", "import {initializeDungeonArena,resetFailedDungeonArena}"),
 ("export function exitTower(game) {", "export function exitTower(game,options={}) {"),
 ("  const regionId = hostGame.world.infiniteDungeonRegionId || 'hearthmereFrontier';", "  if(hostGame.world.bossArena?.phase==='active'&&!options.force){hostGame.log?.('The boss arena is sealed.');return false;}\n  if(options.force)resetFailedDungeonArena(hostGame.world);\n  const regionId = hostGame.world.infiniteDungeonRegionId || 'hearthmereFrontier';"),
 ("rooms:[{id:'tower-hall',x:7,y:8,w:59,h:31,cx:36,cy:23}],", "rooms:[floorType==='boss'?{id:'tower-arena',role:'boss',x:17,y:10,w:46,h:27,cx:40,cy:23}:{id:'tower-hall',x:7,y:8,w:59,h:31,cx:36,cy:23}],"),
 ("  initializeDungeonArena(world);", "  if(floorType==='boss')world.bossRoomCenter={x:40*TILE,y:23*TILE};\n  initializeDungeonArena(world);")])
edit('src/dungeonSystem.js',[
 ("export function exitDungeon(game, exit = {}) {", "export function rememberDungeonRun(game,{failed=false}={}){\n const host=game?.hostGame||game,w=host?.world;if(w?.mode!=='dungeon')return;\n if(failed)resetFailedDungeonArena(w);saveActiveDungeonFloorState(w);\n const state=w.dungeonState;if(state.cleared&&!state.resetAt)state.resetAt=(Number(host.player.worldMemory?.elapsed)||0)+1800;\n host.player.worldMemory ||= {};host.player.worldMemory.dungeonRuns ||= {};host.player.worldMemory.dungeonRuns[w.dungeonId]=state;clearEliteEncounters(w);\n}\nexport function exitDungeon(game, exit = {}) {"),
 ("  for(const e of world.enemies){const p=findNearestActorPassablePoint(world,e.x,e.y,e.radius||12);e.x=p.x;e.y=p.y;e.homeX=p.x;e.homeY=p.y;}", "  for(const e of world.enemies){if(!isActorPositionPassable(world,e.x,e.y,e.radius||12)){const p=findNearestActorPassablePoint(world,e.x,e.y,e.radius||12);e.x=p.x;e.y=p.y;}\n   if(e.boss){e.boss.pendingSpecial=null;e.boss.recoveryUntil=0;e.boss.specialTimer=Math.max(2,e.boss.specialTimer||0);}e.bossTell=e.telegraph=null;e.eliteHealing=e.eliteGuardActive=false;e.eliteAttackPauseTimer=0;}\n  for(const o of world.objects)if(o.pendingSpawnDelay!=null){o.pendingSpawnDelay=1.5;world.effects.push({kind:'bossTelegraph',x:o.x,y:o.y,radius:80,ttl:1.5,color:'#bd91d4'});}")])
edit('src/hubSystem.js',[
 ("createOverworldReturnState, restoreOverworldFromState", "createOverworldReturnState, restoreOverworldFromState,rememberDungeonRun"),
 ("  const surface = ['overworld','travelRoute'].includes(hostGame.world.mode);", "  rememberDungeonRun(hostGame,{failed:true});\n  const surface = ['overworld','travelRoute'].includes(hostGame.world.mode);")])
edit('src/gameInteraction.js',[("if (!game?.player || !cache || cache.claimed) return false;", "if (!game?.player || !cache || cache.claimed || cache.locked) return false;"),("Number(cache.xp || 18)","Number(cache.xp ?? 18)")])
edit('src/bossSystem.js',[
 ("import { rewardAbilitySupport }", "import {encounterRng} from './encounterData.js';\nimport { rewardAbilitySupport }"),
 ("  if (!enemy?.isBoss || !player) return;", "  if (!enemy?.isBoss || !player || enemy.bossRewardClaimed || enemy.rewardSuppressed || enemy.summonedByBoss) return;\n  enemy.bossRewardClaimed=true;"),
 ("function getBossRewardBundle(enemy, firstKill) {", "function getBossRewardBundle(enemy, firstKill) {\n  const rng=enemy.rewardSeed?encounterRng(`${enemy.rewardSeed}:boss`):Math.random;\n  const randomBossReward=rewards=>rewards?.length?rewards[Math.min(rewards.length-1,Math.floor(rng()*rewards.length))]:null;\n  const chanceBossReward=(chance,itemId,qty=1,color=null)=>rng()<chance?bossReward(itemId,qty,color):null;"),
 ("} else if (Math.random() < 0.45) {", "} else if (rng() < 0.45) {")])
edit('src/regionalLootSystem.js',[(" const pool=regionalSetPool(source,world);", " if(context==='enemy'&&source?.encounterStatsVersion&&Number(source.combatLevel)<25)return null;\n const pool=regionalSetPool(source,world);")])
edit('src/legendarySystem.js',[("  if (!shouldRollLegendaryDrop(enemy)) return null;", "  if(enemy?.encounterStatsVersion&&Number(enemy.combatLevel)<20)return null;\n  if (!shouldRollLegendaryDrop(enemy)) return null;")])
print('Applied critical review and persistence fixes.')
