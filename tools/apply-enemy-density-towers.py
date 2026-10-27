exec(open(__file__.replace('towers','integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/towerSystem.js',[
 ('import {rollRegionalMythical}', "import {configureEncounterEnemy} from './encounterData.js';\nimport {CONTINENT_REGIONS} from './continentDefinition.js';\nimport {initializeDungeonArena} from './dungeonArenaSystem.js';\nimport {rollRegionalMythical}"),
 ('  return dressWorld(world);', "  const base=CONTINENT_REGIONS.find(r=>r.id===regionId)?.levels[0]||1;\n  const level=base+Math.max(0,Math.floor(floor)-1);\n  for(const e of world.enemies)configureEncounterEnemy(e,{id:`${regionId}:tower:${floor}`,levels:[level,level+2],eliteChance:.12,rareChance:.03,championChance:.006},`${regionId}:${floor}:${e.id}`,{dungeon:true});\n  initializeDungeonArena(world);\n  return dressWorld(world);"),
 ('    return enemy && !enemy.dead && enemy.alive !== false && enemy.hp > 0 && !enemy.remove;', "    return enemy && !enemy.dead && enemy.alive !== false && enemy.hp > 0 && !enemy.remove && !(world.floorType==='boss'&&enemy.summonedByBoss);"),
 ('  world.cleared = true;', "  world.cleared = true;\n  if(world.floorType==='boss'&&!world.objects.some(o=>o.id==='towerBossReturnPortal')){const center=world.bossRoomCenter||world.spawn;const point=findNearestActorPassablePoint(world,center.x,center.y+64,12);world.objects.push({id:'towerBossReturnPortal',kind:'towerExit',name:'Return to Overworld',...point,r:24,locked:false,returnPortal:true});}"),
 (": Math.min(7, 3 + Math.floor(floor / 3));", ": Math.min(16, 8 + Math.floor(floor / 4));")])
edit('src/combat.js',[
 ('    ensureEnemyState(enemy);','    ensureEnemyState(enemy);\n    if(enemy.arenaDormant&&enemy.hp>0)continue;'),
 ('  finalDamage=mitigateEliteHit(enemy,player,finalDamage,options);','  finalDamage=mitigateEliteHit(enemy,player,finalDamage,options);\n  if(finalDamage<=0)return 0;')])
print('Applied geographic tower floors, tower boss arenas and dormant arena protection.')
