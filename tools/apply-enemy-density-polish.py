exec(open(__file__.replace('polish','integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/dungeonSystem.js',[
 ("  let attempts = 0;\n  const maxAttempts = targetRooms * 150;", "  // Reserve an arena before placing ordinary rooms, rather than enlarging a room into its neighbours.\n  if(config.isFinalFloor){const aw=profile.id==='story'?36:profile.id==='major'?32:26,ah=profile.id==='story'?28:profile.id==='major'?26:22;\n    const arena=makeRoom(width-aw-7,Math.floor(height/2-ah/2),aw,ah,'boss',1);arena.arenaReserved=true;rooms.push(arena);}\n  let attempts = 0;\n  const maxAttempts = targetRooms * 150;"),
 ('  const sorted = rooms.slice(1).sort((a, b) => {', '  const reserved=rooms.find(r=>r.arenaReserved);\n  const sorted = rooms.slice(1).filter(r=>r!==reserved).sort((a, b) => {'),
 ('  const finalRoom = sorted[sorted.length - 1] || rooms[rooms.length - 1];', '  if(reserved)sorted.push(reserved);\n  const finalRoom = sorted[sorted.length - 1] || rooms[rooms.length - 1];'),
 ("        : elite\n          ? `${eliteModifierLabel(eliteModifier)} ${name || baseStats.name || 'Enemy'}`", "        : elite\n          ? name || baseStats.name || 'Enemy'"),
 ('  return applyCoopBossHealthScaling(applyCoopAggroRange(applyEnemyStrengthScaling({', '  return configureEncounterEnemy(applyCoopBossHealthScaling(applyCoopAggroRange(applyEnemyStrengthScaling({'),
 ('  }), baseStats.aggroRange), playerCount);','  }), baseStats.aggroRange), playerCount),dungeonEncounterProfile(config),`${config.seed||config.dungeonId}:${config.floor||1}:${kind}:${index}`,{dungeon:true,confined:!!config.corridorPatrol});')])
edit('src/combat.js',[
 ('import {updateEliteEncounters', "import {updatePopulationPatrol} from './encounterPopulation.js';\nimport {updateEliteEncounters"),
 ('    if (updateHomeGuardBehavior(enemy, player, world, dt)) continue;', '    if(updatePopulationPatrol(enemy,world,player,dt))continue;\n    if (updateHomeGuardBehavior(enemy, player, world, dt)) continue;')])
edit('src/dungeonCompletion.js',[
 ("    if(boss){\n      state.mainBossEnemyId=boss.id;\n      if(alive(boss)){state.cleared=false;state.finalBossDefeated=false;}\n    }", "    if(boss){\n      state.mainBossEnemyId=boss.id;\n      const required=encounterEnemies.filter(e=>e.isDungeonMainBoss&&!e.summonedBy&&!e.summonedByBoss);\n      state.requiredBossIds=[...new Set([...(state.requiredBossIds||[]),...(required.length?required:[boss]).map(e=>e.id)])];\n      if(encounterEnemies.some(e=>state.requiredBossIds.includes(e.id)&&alive(e))){state.cleared=false;state.finalBossDefeated=false;}\n    }"),
 ('  if(state.mainBossEnemyId!==enemy.id||state.cleared)return false;', '  if(!(state.requiredBossIds||[state.mainBossEnemyId]).includes(enemy.id)||state.cleared||(world.enemies||[]).some(e=>(state.requiredBossIds||[]).includes(e.id)&&alive(e)))return false;')])
edit('src/data.js',[
 ("  const tables = getLootTablesForEnemy(enemy, enemyKind, context);", "  const rng=context.rng||Math.random;\n  const tables = getLootTablesForEnemy(enemy, enemyKind, context);"),
 ('      if (Math.random() <= getLootChance(entry, enemy)) {', '      if (rng() <= getLootChance(entry, enemy)) {'),
 ('          qty: randomInt(entry.min, entry.max),','          qty: Math.floor(entry.min+rng()*(entry.max-entry.min+1)),'),
 ("  if (!entry.guaranteed) {\n    chance *= ENEMY_ITEM_DROP_RATE_SCALAR;", "  if (!entry.guaranteed) {\n    chance *= ENEMY_ITEM_DROP_RATE_SCALAR * ({rare:1.35,champion:1.6}[enemy?.encounterTier]||1);"),
 ('  return Boolean(enemy?.eliteModifier || enemy?.namedExteriorElite', '  return Boolean(enemy?.elite || enemy?.isElite || enemy?.eliteModifier || enemy?.namedExteriorElite')])
edit('src/lootSystem.js',[
 ("import {rollRegionalMythical}", "import {encounterRng} from './encounterData.js';\nimport {rollRegionalMythical}"),
 ('  const drops = rollEnemyLootSafe(enemy, world);', "  const rng=enemy.rewardSeed?encounterRng(enemy.rewardSeed):Math.random;\n  const drops = rollEnemyLootSafe(enemy, world,rng);"),
 ('drops.push(...rollPoiLoot(enemy));','drops.push(...rollPoiLoot(enemy,rng));'),
 ('rollLegendaryBossDrop(enemy);','rollLegendaryBossDrop(enemy,rng);'),
 ('rollRegionalMythical(enemy,world);','rollRegionalMythical(enemy,world,rng);'),
 ('rollEnemyCollectible(enemy,world);','rollEnemyCollectible(enemy,world,rng);'),
 ('function rollPoiLoot(enemy) {', 'function rollPoiLoot(enemy,rng=Math.random) {'),
 ('function rollEnemyLootSafe(enemy, world) {','function rollEnemyLootSafe(enemy, world,rng=Math.random) {'),
 ('return rollEnemyLoot(enemy, { world })','return rollEnemyLoot(enemy, { world,rng })')])
# Thread the local RNG through all POI rolls without changing global random state.
p=root/'src/lootSystem.js';s=p.read_text(encoding='utf-8-sig');start=s.index('function rollPoiLoot(');end=s.index('\nexport function updateWorldLootPickups',start);old=s[start:end];new=old.replace('rollPoiDrop(', 'rollPoiDrop(').replace('function rollPoiDrop(chance)', 'function rollPoiDrop(chance,rng=Math.random)').replace('return Math.random() <', 'return rng() <')
import re
new=re.sub(r'rollPoiDrop\((elite \? [\d.]+ : [\d.]+|[\d.]+)\)',r'rollPoiDrop(\1,rng)',new)
edit('src/lootSystem.js',[(old,new)])
print('Integrated reserved arenas, fixed event enemy levels, patrols and seeded rewards.')
