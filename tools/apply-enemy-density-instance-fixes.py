exec(open(__file__.replace('instance-fixes','integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/towerSystem.js',[
 ("import {configureEncounterEnemy}", "import {rememberRepeatableInstance,restoreRepeatableInstance} from './instanceEncounterMemory.js';\nimport {configureEncounterEnemy}"),
 ("  const regionState = getRegionalDungeonState(hostGame.player, regionId);\n\n  hostGame.world = tower;", "  const regionState = getRegionalDungeonState(hostGame.player, regionId);\n  if(hostGame.world.mode==='tower')rememberRepeatableInstance(hostGame);\n  restoreRepeatableInstance(tower,hostGame.player);initializeDungeonArena(tower);\n\n  hostGame.world = tower;"),
 ("  if(options.force)resetFailedDungeonArena(hostGame.world);", "  if(options.force)resetFailedDungeonArena(hostGame.world);\n  rememberRepeatableInstance(hostGame,{failed:!!options.force});")])
edit('src/sideZoneSystem.js',[
 ("import { TILE }", "import {rememberRepeatableInstance,restoreRepeatableInstance} from './instanceEncounterMemory.js';\nimport { TILE }"),
 ("  hostGame.world = zone;", "  restoreRepeatableInstance(zone,hostGame.player);\n  hostGame.world = zone;"),
 ("This optional zone will be regenerated when you leave.", "Defeated rooms remain cleared until its next expedition cycle."),
 ("  hostGame.world = restoreOverworldFromState(hostGame.overworldState);", "  rememberRepeatableInstance(hostGame);\n  hostGame.world = restoreOverworldFromState(hostGame.overworldState);"),
 ("    isBoss: false,", "    isBoss: false,\n    isDungeonMainBoss:false,arenaDormant:false,arenaId:null,"),
 ("  return world;\n}\n\nfunction recordSideZoneVisit", "  world.bossArena=null;world.arenaBarriers=[];world.arenaGates=[];\n  return world;\n}\n\nfunction recordSideZoneVisit")])
edit('src/hubSystem.js',[
 ("import {dressWorld}", "import {rememberRepeatableInstance} from './instanceEncounterMemory.js';\nimport {resetFailedDungeonArena} from './dungeonArenaSystem.js';\nimport {dressWorld}"),
 ("  rememberDungeonRun(hostGame,{failed:true});", "  rememberDungeonRun(hostGame,{failed:true});\n  if(hostGame.world.mode==='tower')resetFailedDungeonArena(hostGame.world);\n  rememberRepeatableInstance(hostGame,{failed:true});")])
edit('src/main.js',[("import ","import {rememberRepeatableInstance} from './instanceEncounterMemory.js';\nimport {resetFailedDungeonArena} from './dungeonArenaSystem.js';\nimport "),("    if(this.world?.mode==='dungeon')exitDungeon(this,{force:true});", "    if(this.world?.mode==='dungeon')exitDungeon(this,{force:true});\n    if(this.world?.mode==='tower')resetFailedDungeonArena(this.world);\n    rememberRepeatableInstance(this,{failed:true});")])
edit('src/gameSave.js',[("import {initializeDungeonArena}","import {rememberRepeatableInstance} from './instanceEncounterMemory.js';\nimport {initializeDungeonArena}"),("export function createSaveState(game)","export function createSaveState(game)"), ("  const isInstancedWorld = ['dungeon', 'tower', 'sideZone'].includes(game.world?.mode);", "  rememberRepeatableInstance(game);\n  const isInstancedWorld = ['dungeon', 'tower', 'sideZone'].includes(game.world?.mode);")])
print('Added repeatable instance persistence and optional-zone boss cleanup.')
