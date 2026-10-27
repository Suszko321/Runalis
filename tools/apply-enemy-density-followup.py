exec(open(__file__.replace('followup','integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/dungeonSystem.js',[
 ('`${floorSeed}:${e.id}`','`${world.floorSeed||world.seed}:${e.id}`'),
 ('  if (!options.skipPublishedOverride) applyPublishedWorldOverride(world);\n  syncDungeonCompletion(world);', "  if (!options.skipPublishedOverride) applyPublishedWorldOverride(world);\n  const encounterProfile=dungeonEncounterProfile(world);\n  for(const e of world.enemies)configureEncounterEnemy(e,encounterProfile,`${world.floorSeed||world.seed}:${e.id}`,{dungeon:true,confined:!!e.corridorPatrol});\n  for(const e of world.enemies){if(!isActorPositionPassable(world,e.x,e.y,e.radius||12)){const p=findNearestActorPassablePoint(world,e.x,e.y,e.radius||12);e.x=p.x;e.y=p.y;e.homeX=p.x;e.homeY=p.y;}}\n  initializeDungeonArena(world);\n  syncDungeonCompletion(world);"),
 ('    seed: world.seed || null,','    seed: world.seed || null,\n    floorSeed:world.floorSeed||null,\n    bossRoomCenter:world.bossRoomCenter||null,'),
 ('    seed: saveState.seed || null,','    seed: saveState.seed || null,\n    floorSeed:saveState.floorSeed||null,\n    bossRoomCenter:saveState.bossRoomCenter||null,')])
edit('src/world.js',[
 ('  for(const barrier of [...(world.encounterBarriers||[]),...(world.arenaBarriers||[])])if(worldX>=barrier.x&&worldY>=barrier.y&&worldX<=barrier.x+barrier.w&&worldY<=barrier.y+barrier.h)return false;', '  for(const barriers of [world.encounterBarriers,world.arenaBarriers])if(barriers)for(const barrier of barriers)if(worldX>=barrier.x&&worldY>=barrier.y&&worldX<=barrier.x+barrier.w&&worldY<=barrier.y+barrier.h)return false;')])
edit('src/main.js',[
 ('  respawnAtLastSafeLocation() {', "  respawnAtLastSafeLocation() {\n    if(this.world?.mode==='dungeon')exitDungeon(this,{force:true});")])
edit('src/enemyProgression.js',[
 ('  enemy.combatLevel = enemyCombatLevel(enemy);', "  if(!(enemy.combatLevel>0||enemy.level>0||enemy.tier>0||enemy.dungeonTier>0))enemy.progressionFallback=true;\n  enemy.combatLevel = enemyCombatLevel(enemy);\n  if(enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss){enemy.baseCombatXp=enemy.xp=0;return enemy;}")])
edit('src/combat.js',[
 ('  updateDungeonArena(world,player);', "  updateDungeonArena(world,player);\n  if(world?.mode==='dungeon'&&world.dungeonState){player.worldMemory ||= {};player.worldMemory.dungeonRuns ||= {};player.worldMemory.dungeonRuns[world.dungeonId]=world.dungeonState;}")])
print('Integrated restored floors, fresh floors and failure recovery.')
