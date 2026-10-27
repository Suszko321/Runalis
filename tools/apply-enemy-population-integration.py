exec(open(__file__.replace('population-integration','density-integration'),encoding='utf-8').read().split("edit('src/world.js'")[0])
edit('src/dungeonSystem.js',[
 ('import { createWorld, findNearestPassablePoint, findNearestActorPassablePoint }', 'import { createWorld, findNearestPassablePoint, findNearestActorPassablePoint, isActorPositionPassable }')])
p=root/'src/overworldEncounterSystem.js';s=p.read_text(encoding='utf-8-sig');old=s[s.index('function spawnHostilePatrol('):s.index('\nfunction spawnTraveler(')]
new='''function spawnHostilePatrol(world,point,encounterId,tier,now,rng=Math.random,party=[]) {
 const eco=ecologyAt(world,point[0]*TILE,point[1]*TILE),profile=point.profile||geographicEncounterProfile(point[0],point[1],point[2]);
 const template=point.area?.enemyKinds?.length?{id:point.area.id,members:point.area.enemyKinds.map(k=>[k,k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())])}:chooseWeighted(hostilePatrolPool(eco,tier),rng);
 const count=Math.min(point.area?.maxActive||6,profile.count[0]+Math.floor(rng()*(profile.count[1]-profile.count[0]+1))),angle=rng()*Math.PI*2;
 for(let index=0;index<count;index++){
  const [kind,name]=template.members[index%template.members.length];let position=null;
  for(let attempt=0;attempt<18;attempt++){
   const a=angle+index*Math.PI*2/Math.max(1,count)+rng()*.5,radius=1.8+rng()*3;
   const x=point[0]+Math.cos(a)*radius,y=point[1]+Math.sin(a)*radius;
   if(populationPositionSafe(world,party,(x+.5)*TILE,(y+.5)*TILE,16)){position={x,y};break;}
  }
  if(!position)continue;
  const enemy=makeEnemy(kind,`${encounterId}-${kind}-${index}`,name,position.x,position.y,{
   ...scaleEnemyStats(kind,tier),tier,encounterAllegiance:template.id,
   controlledMinion:template.id==='red-seal-scouts'&&kind==='exploder',
   visualFactionId:template.id==='red-seal-scouts'?'lastDawn':template.id==='roadless-patrol'?'roadless':undefined,
   sourceRegionId:continentRegionAt(position.x,position.y).id,dynamicEncounter:true,dynamicEncounterId:encounterId,
   spawnedAt:now,despawnAfter:900,guardRole:'roamingPatrol'
  });
  configureEncounterEnemy(enemy,profile,`${encounterId}:${index}`);world.enemies.push(enemy);
 }
}
'''
edit('src/overworldEncounterSystem.js',[
 ("import {ecologyAt}", "import {updateAuthoredPopulation,populationPositionSafe} from './encounterPopulation.js';\nimport {geographicEncounterProfile,configureEncounterEnemy} from './encounterData.js';\nimport {ecologyAt}"),
 ('  cleanupTemporaryEncounters(world, getPartyActors(game), now);', '  if(world.continentId){updateAuthoredPopulation(game,dt,spawnHostilePatrol);cleanupTemporaryEncounters(world,getPartyActors(game),now);return;}\n  cleanupTemporaryEncounters(world, getPartyActors(game), now);'),
 (old,new)])
edit('src/continentPersistence.js',[
 ('const MAX_GENERATED = 64;', "const MAX_GENERATED = 192;\nGENERATED_FIELDS.push('encounterStatsVersion','encounterTier','encounterRegion','rewardSeed','populationAreaId','populationCycle','populationNextAt','encounterEvent','eliteInitialized','locked','completed','rewardSuppressed','summonedBy','summonedByBoss');"),
 ('    else if (finite(entity.hp)', "    if(dead&&memory.entities[entity.id]?.respawnAt)state.respawnAt=memory.entities[entity.id].respawnAt;\n    if (!dead && finite(entity.hp)"),
 ("for (const key of ['equipment', 'appearance'])", "for (const key of ['equipment', 'appearance','eliteModifiers','patrolRoute','rewards'])"),
 ("    if (saved.appearance) entity.appearance = cleanSmallState(saved.appearance);", "    for(const key of ['appearance','eliteModifiers','patrolRoute','rewards'])if(saved[key])entity[key]=cleanSmallState(saved[key]);")])
edit('src/gameInteraction.js',[
 ("    case 'worldCache':\n      claimWorldCache(game, nearest);", "    case 'worldCache':\n      if(nearest.locked&&nearest.encounterEvent){game.log('Defeat the nearby encounter guards to claim these supplies.');return;}\n      claimWorldCache(game, nearest);")])
print('Integrated persistent authored populations and event supplies.')
