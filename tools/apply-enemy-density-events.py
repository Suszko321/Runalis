exec(open(__file__.replace('events','integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/dungeonSystem.js',[
 ('export function triggerDungeonEvent(game, eventObject = {}) {', 'export function triggerDungeonEvent(game, eventObject = {}, release=false) {'),
 ("  const playerCount = getCoopEnemyScalingPlayerCount(hostGame.player);\n  const enemyKinds = getThemeEnemyKinds(world.theme, world);", "  if(!release){\n    delete state.triggeredEvents[eventId];eventObject.triggered=false;eventObject.depleted=false;\n    if(eventObject.pendingSpawnDelay==null){eventObject.pendingSpawnDelay=1.5;\n      world.effects.push({kind:'bossTelegraph',x:eventObject.x,y:eventObject.y,radius:100,color:'#cead85',ttl:1.5,age:0});\n      hostGame.log?.('An ambush stirs. Move away from the marked ground.');}\n    return true;\n  }\n  const beforeIds=new Set((world.enemies||[]).map(e=>e.id));\n  const playerCount = getCoopEnemyScalingPlayerCount(hostGame.player);\n  const enemyKinds = getThemeEnemyKinds(world.theme, world);"),
 ("  unlockDungeonObjects(world, object => object.unlockOnEventId === eventId, 'Event Reward');", "  state.activeEvents ||= {};state.activeEvents[eventId]={memberIds:world.enemies.filter(e=>!beforeIds.has(e.id)).map(e=>e.id),completed:false};"),
 ('  return world;\n}\n\nfunction createDungeonLayout', '  return world;\n}\n\nexport function updateDungeonEvents(world,player,dt,log){\n  if(world?.mode!==\'dungeon\')return;\n  for(const object of world.objects||[])if(object.pendingSpawnDelay!=null){object.pendingSpawnDelay-=dt;if(object.pendingSpawnDelay<=0){delete object.pendingSpawnDelay;triggerDungeonEvent({world,player,log},object,true);}}\n  for(const [id,event] of Object.entries(world.dungeonState?.activeEvents||{})){if(event.completed)continue;\n    if(!(world.enemies||[]).some(e=>event.memberIds.includes(e.id)&&e.hp>0&&!e.dead&&!e.remove)){event.completed=true;unlockDungeonObjects(world,o=>o.unlockOnEventId===id,\'Event Reward\');log?.(\'Ambush defeated. Its guarded reward is now available.\');}}\n}\n\nfunction createDungeonLayout')])
edit('src/combat.js',[
 ('import {updatePopulationPatrol}', "import {updateDungeonEvents} from './dungeonSystem.js';\nimport {updatePopulationPatrol}"),
 ('  updateDungeonArena(world,player);', '  updateDungeonEvents(world,player,dt,log);\n  updateDungeonArena(world,player);'),
 ('    updateEnemyTimers(enemy, dt);', '    updateEnemyTimers(enemy, dt);\n    enemy.eliteAttackPauseTimer=Math.max(0,(enemy.eliteAttackPauseTimer||0)-dt);\n    if(enemy.eliteHealing||enemy.eliteAttackPauseTimer>0)continue;')])
# Summoned adds never grant repeatable XP/loot and cannot grow without limit.
edit('src/enemyBehaviors.js',[
 ('function spawnMinion(enemy, world) {','function spawnMinion(enemy, world) {\n  if((world.enemies||[]).filter(e=>e.summonedBy===enemy.id&&e.hp>0&&!e.dead).length>=3)return;'),
 ('    summonedBy: enemy.id','    summonedBy: enemy.id,\n    rewardSuppressed:true,\n    combatLevel:enemy.combatLevel')])
p=root/'src/bossSystem.js';s=p.read_text(encoding='utf-8-sig');s2=s
for fn in ['spawnSpectralGuards','spawnRootAdds','spawnDungeonOathguards','spawnDemonCultAdds','spawnSeraphEchoes','spawnNetworkEchoes']:
 old=f'function {fn}(enemy, world, count) {{';new=old+'\n  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));';s2=s2.replace(old,new)
s2=s2.replace('      summonedByBoss: enemy.id,','      summonedByBoss: enemy.id,\n      rewardSuppressed:true,\n      combatLevel:enemy.combatLevel,')
edit('src/bossSystem.js',[(s,s2)])
edit('tools/verify-continent-persistence.mjs',[
 ('Array.from({length:80}', 'Array.from({length:240}'),
 ('generated).length,64', 'generated).length,192'),
 ('64-snapshot bound','192-snapshot bound')])
print('Integrated telegraphed ambushes, guarded event rewards and capped unrewarded enemy summons.')
