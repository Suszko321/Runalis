from pathlib import Path
import shutil

root=Path(__file__).resolve().parents[1]
backup=root/'backups'/'enemy-density-2026-10-10'
def edit(file, pairs):
 p=root/file;b=p.read_bytes();s=b.decode('utf-8-sig');nl='\r\r\n' if '\r\r\n' in s else '\r\n' if '\r\n' in s else '\n'
 dest=backup/file
 if not dest.exists():dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
 for old,new in pairs:
  old=old.replace('\n',nl);new=new.replace('\n',nl)
  assert old in s,(file,old[:100]);s=s.replace(old,new,1)
 p.write_bytes((b'\xef\xbb\xbf' if b.startswith(b'\xef\xbb\xbf') else b'')+s.encode('utf-8'))

edit('src/world.js',[
 ("  const tileX = worldToTile(worldX);\n  const tileY = worldToTile(worldY);\n\n  return isTilePassable", "  const tileX = worldToTile(worldX);\n  const tileY = worldToTile(worldY);\n  for(const barrier of [...(world.encounterBarriers||[]),...(world.arenaBarriers||[])])if(worldX>=barrier.x&&worldY>=barrier.y&&worldX<=barrier.x+barrier.w&&worldY<=barrier.y+barrier.h)return false;\n\n  return isTilePassable")])
edit('src/combatVisualsRenderer.js',[
 ("import {drawSubclassEffect", "import {drawEncounterEffects} from './encounterArt.js';\nimport {drawSubclassEffect"),
 ("export function drawWorldEffects(ctx, world, camera, layer) {\n  if (!ctx || !world || !camera) return;", "export function drawWorldEffects(ctx, world, camera, layer) {\n  if (!ctx || !world || !camera) return;\n  drawEncounterEffects(ctx,world,camera,layer);")])
edit('src/enemyBehaviors.js',[
 ('function applyTargetDamage(enemy, target, damage, world, log, options = {}) {','export function applyTargetDamage(enemy, target, damage, world, log, options = {}) {'),
 ('  const now = performance.now() / 1000;\n  let hpDamage = rawDamage;', '  const now = options.now ?? performance.now() / 1000;\n  let hpDamage = rawDamage;'),
 ('function applyEliteStats(enemy) {', "function applyEliteStats(enemy) {\n  if(enemy.encounterStatsVersion){enemy.eliteInitialized=true;return;}")])
edit('src/combat.js',[
 ("import {", "import {updateEliteEncounters,mitigateEliteHit,clearEliteEncounters} from './eliteEncounterSystem.js';\nimport {updateDungeonArena} from './dungeonArenaSystem.js';\nimport {applyTargetDamage} from './enemyBehaviors.js';\nimport {"),
 ('  setEnemyCombatViews(world,game);','  setEnemyCombatViews(world,game);\n  updateDungeonArena(world,player);\n  updateEliteEncounters(world,player,dt,now,applyTargetDamage,log);'),
 ('    if (updateHomeGuardBehavior(enemy, player, world, dt)) continue;\n\n    if (shouldSkipFarEnemyUpdate', '    if (shouldSkipFarEnemyUpdate'),
 ('    enemy.dormant = false;\n    updateEnemyTimers', '    enemy.dormant = false;\n    if (updateHomeGuardBehavior(enemy, player, world, dt)) continue;\n    updateEnemyTimers'),
 ('  const actualDamage = Math.min(enemy.hp,finalDamage);', '  finalDamage=mitigateEliteHit(enemy,player,finalDamage,options);\n  const actualDamage = Math.min(enemy.hp,finalDamage);'),
 ('  const damage = Math.ceil((summon.damage || 5)', '  let damage = Math.ceil((summon.damage || 5)'),
 ("  const summonSkill = 'summoning';", "  damage=mitigateEliteHit(target,summon,damage);\n  const summonSkill = 'summoning';"),
 ('  const xp = enemy.xp || defaultEnemyXp(enemy);', '  const xp = enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss ? 0 : enemy.xp ?? defaultEnemyXp(enemy);'),
 ("  const questPlayer = player.questOwner || player;\n  recordPoiEnemyDefeat", "  if(enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss)return;\n  const questPlayer = player.questOwner || player;\n  recordPoiEnemyDefeat"),
 ('return getMovementSpeedMultiplier(player) * getChannelMovementMultiplier(player) * getSubclassMovementMultiplier(player);', "return getMovementSpeedMultiplier(player) * getChannelMovementMultiplier(player) * getSubclassMovementMultiplier(player) * (player.slowTimer>0?.7:1);")])
edit('src/combatMoves.js',[
 ('import {', "import {mitigateEliteHit} from './eliteEncounterSystem.js';\nimport {"),
 ('  const damage = applyLegendaryOutgoingDamage(player, enemy, adjustedPacket.amount, {', '  let damage = applyLegendaryOutgoingDamage(player, enemy, adjustedPacket.amount, {'),
 ('  if(move.mythicalAsh && state.mythicalAshAttackId', '  damage=mitigateEliteHit(enemy,player,damage,{heavy:damagePacket.comboType===\'heavy\'});\n  if(move.mythicalAsh && state.mythicalAshAttackId')])
edit('src/humanoidEnemies.js',[
 ("import { ITEMS }", "import {ELITE_MODIFIERS} from './encounterData.js';\nimport { ITEMS }"),
 ('  return {text:`${boss?', '  const modifiers=(enemy.eliteModifiers||[]).map(m=>`${ELITE_MODIFIERS[m]?.symbol||\'?\'} ${ELITE_MODIFIERS[m]?.name||m}`).join(\' / \');\n  const tier=enemy.encounterTier;\n  return {text:`${tier===\'rare\'?\'RARE \':tier===\'champion\'?\'CHAMPION \':\'\'}${boss?'),
 ('${name} \u00b7 Lv ${level}`,color:', '${name} \u00b7 Lv ${level}${modifiers?\' [\'+modifiers+\']\':\'\'}`,color:')])
edit('src/continentWorld.js',[
 ('import {TILE}', "import {configureEncounterEnemy,geographicEncounterProfile} from './encounterData.js';\nimport {TILE}"),
 (' world.echorynPresentation={...world,terrainFeatures:blueprint.echoryn.terrainFeatures};', " for(const e of enemies)configureEncounterEnemy(e,geographicEncounterProfile(e.x/TILE,e.y/TILE),e.id);\n world.echorynPresentation={...world,terrainFeatures:blueprint.echoryn.terrainFeatures};")])
edit('src/dungeonSystem.js',[
 ('import {', "import {configureEncounterEnemy,dungeonEncounterProfile,ENCOUNTER_VERSION} from './encounterData.js';\nimport {initializeDungeonArena,resetFailedDungeonArena} from './dungeonArenaSystem.js';\nimport {clearEliteEncounters} from './eliteEncounterSystem.js';\nimport {"),
 ('  const dungeonState = createDungeonRunState(dungeonOptions);', "  hostGame.player.worldMemory ||= {};\n  const ledger=hostGame.player.worldMemory.dungeonRuns ||= {};\n  const prior=ledger[dungeonOptions.dungeonId];\n  const now=Number(hostGame.player.worldMemory.elapsed)||0;\n  const canReset=prior?.cleared&&now>=Number(prior.resetAt||Infinity);\n  const dungeonState = prior&&!canReset ? prior : createDungeonRunState({...dungeonOptions,seed:`${dungeonOptions.seed}-cycle-${prior?Number(prior.populationCycle||0)+1:0}`});\n  if(!prior||canReset)dungeonState.populationCycle=prior?Number(prior.populationCycle||0)+1:0;\n  dungeonOptions.seed=dungeonState.seed;\n  ledger[dungeonOptions.dungeonId]=dungeonState;"),
 ('    floor: 1,\n    playerCount:', '    floor: dungeonState.currentFloor||1,\n    playerCount:'),
 ('  const overworldState = hostGame.overworldState;\n  hostGame.world = restoreOverworldFromState', "  if(hostGame.world?.mode==='dungeon'){\n    if(exit.force)resetFailedDungeonArena(hostGame.world);\n    saveActiveDungeonFloorState(hostGame.world);\n    const state=hostGame.world.dungeonState;\n    if(state.cleared&&!state.resetAt)state.resetAt=(Number(hostGame.player.worldMemory?.elapsed)||0)+1800;\n    hostGame.player.worldMemory ||= {};hostGame.player.worldMemory.dungeonRuns ||= {};\n    hostGame.player.worldMemory.dungeonRuns[hostGame.world.dungeonId]=state;\n    clearEliteEncounters(hostGame.world);\n  }\n  const overworldState = hostGame.overworldState;\n  hostGame.world = restoreOverworldFromState"),
 ('  const roomEnemyBudget = Math.max(1, Math.floor(maxEncounterEnemies * 0.88));', '  const roomEnemyBudget = Math.max(1, Math.floor(maxEncounterEnemies * 0.88));'),
 ('    if (index >= roomEnemyBudget && !bossApproach) continue;', '    if (index >= roomEnemyBudget && !bossApproach) continue;'),
 ('    const availableBudget = Math.max(0, (bossApproach ? maxEncounterEnemies : roomEnemyBudget) - index);', "    // Reserve a small pack for every remaining combat room before spending on hordes.\n    const remaining=encounterRooms.slice(roomIndex+1).filter(r=>!['quiet','shrine'].includes(r.role)).length;\n    const availableBudget = Math.max(0, (bossApproach ? maxEncounterEnemies : roomEnemyBudget) - index - remaining*3);"),
 ('  syncDungeonCompletion(world);\n  return world;', "  const encounterProfile=dungeonEncounterProfile(world);\n  for(const e of world.enemies)configureEncounterEnemy(e,encounterProfile,`${floorSeed}:${e.id}`,{dungeon:true,confined:!!e.corridorPatrol});\n  // Published layouts and old saves use the same geographic rules.\n  for(const e of world.enemies){const p=findNearestActorPassablePoint(world,e.x,e.y,e.radius||12);e.x=p.x;e.y=p.y;e.homeX=p.x;e.homeY=p.y;}\n  initializeDungeonArena(world);\n  syncDungeonCompletion(world);\n  return world;")])
edit('src/lootSystem.js',[
 ('  if (!enemy || !world) return [];', '  if (!enemy || !world || enemy.rewardSuppressed || enemy.summonedBy || enemy.summonedByBoss) return [];')])
print('Integrated collision, combat, rendering, geography, dungeon persistence and rewards.')
