from pathlib import Path
def edit(name,changes,imports=''):
 p=Path('src')/name;s=p.read_text(encoding='utf-8')
 for old,new in changes:
  assert old in s,(name,old[:95]);s=s.replace(old,new)
 p.write_text(imports+s,encoding='utf-8')
edit('data.js',[
 ("  return trimLootDrops(drops, enemy);", "  const trimmed=trimLootDrops(drops,enemy),gear=trimmed.filter(d=>['weapon','armour','trinket'].includes(ITEMS[d.item]?.type));\n  const best=gear.sort((a,b)=>(LOOT_RARITY_PRIORITY[ITEMS[b.item]?.rarity]||0)-(LOOT_RARITY_PRIORITY[ITEMS[a.item]?.rarity]||0))[0];\n  return trimmed.filter(d=>!['weapon','armour','trinket'].includes(ITEMS[d.item]?.type)||d===best).map(d=>['weapon','armour','trinket'].includes(ITEMS[d.item]?.type)?{...d,qty:1,upgradeTier:1}:d);"),
 ("  return Math.min(1, chance);\n}\n", "  if(['weapon','armour','trinket'].includes(ITEMS[entry.item]?.type)){\n    chance*=isBossLootEnemy(enemy)?.35:isEliteLootEnemy(enemy)?.2:.08;\n    if(['legendary','mythic','ancient'].includes(ITEMS[entry.item].rarity))chance*=.2;\n  }\n  return Math.min(1, chance);\n}\n"),
 ("/cult|demon|seal|ember/", "/cult|demon|seal|ember|last dawn/") if "/cult|demon|seal|ember/" in Path('src/data.js').read_text(encoding='utf-8') else ("// data.js","// data.js")
])
edit('enemyEquipmentLoot.js',[("chance:.03,trophyChance:.03", "chance:.003,trophyChance:.03"),("// Three percent at the current economy tuning; subsequent global changes still", "// Wearable faction gear is exceptional (0.3%); trophies retain their material rate. Global changes still")])
edit('legendarySystem.js',[
 ("const LEGENDARY_DROP_CHANCE = 0.1;", "const LEGENDARY_DROP_CHANCE = .02;"),
 ("  if (rng() >= LEGENDARY_DROP_CHANCE) return null;", "  if(enemy.legendaryBossLootRolled)return null;enemy.legendaryBossLootRolled=true;\n  const chance=enemy.isBoss||enemy.worldBoss?LEGENDARY_DROP_CHANCE:.005;\n  if (rng() >= chance) return null;"),
 ("  const index = Math.floor(rng() * LEGENDARY_BOSS_DROP_IDS.length) % LEGENDARY_BOSS_DROP_IDS.length;\n  const itemId = LEGENDARY_BOSS_DROP_IDS[index];", "  const pool=regionalLegendaryPool(enemy,LEGENDARY_BOSS_DROP_IDS);\n  const itemId=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];")
],"import {regionalLegendaryPool} from './regionalLootSystem.js';\n")
edit('lootSystem.js',[
 ("  const collectible=rollEnemyCollectible(enemy,world);", "  const mythical=rollRegionalMythical(enemy,world);if(mythical)drops.push(mythical);\n  const collectible=rollEnemyCollectible(enemy,world);"),
 ("      rarity: item?.rarity || 'common',", "      rarity: item?.rarity || 'common',\n      ...(isTieredEquipment(item)?{upgradeTier:1}:{}),")
],"import {rollRegionalMythical} from './regionalLootSystem.js';\nimport {isTieredEquipment} from './equipmentProgressionSystem.js';\n")
edit('gameInteraction.js',[
 ("  cache.depleted = true;\n  recordPoiCacheClaim", "  cache.depleted = true;\n  const rareGear=rollRegionalMythical(cache,game.world,Math.random,'cache');if(rareGear)rewards.push([rareGear.item,1]);\n  recordPoiCacheClaim"),
 ("  for (const reward of rewards) {\n    const itemId", "  for (const reward of rewards) {\n    const itemId"),
 ("  chest.claimed = true;\n  chest.depleted = true;", "  chest.claimed = true;\n  chest.depleted = true;\n  const tunedRewards=filterChestEquipment(rewards,chest);\n  const mythical=rollRegionalMythical(chest,game.world,Math.random,'chest');if(mythical)tunedRewards.push([mythical.item,1]);"),
 ("  for (const reward of rewards) {\n    const itemId = Array.isArray(reward) ? reward[0] : reward?.itemId;\n    const qty = Math.max(1, Number(Array.isArray(reward) ? reward[1] : reward?.qty || 1));\n    if (!itemId || !ITEMS[itemId]) continue;", "  for (const reward of tunedRewards) {\n    const itemId = Array.isArray(reward) ? reward[0] : reward?.itemId;\n    const qty = Math.max(1, Number(Array.isArray(reward) ? reward[1] : reward?.qty || 1));\n    if (!itemId || !ITEMS[itemId]) continue;"),
 ("  return rewards;\n}\n\nfunction generateDungeonChestFallbackRewards", "  return filterChestEquipment(rewards,cache);\n}\n\nfunction generateDungeonChestFallbackRewards")
],"import {filterChestEquipment,rollRegionalMythical} from './regionalLootSystem.js';\n")
edit('towerSystem.js',[("  addItem(game.player, reward[0], reward[1]);", "  addItem(game.player, reward[0], reward[1]);\n  // Repeatable floors supply the existing currency and upgrade materials.\n  game.player.gold+=Math.min(150,18+floor*3);\n  if(floor>=11)addItem(game.player,'arcaneDust',2+Math.min(8,Math.floor(floor/10)));\n  if(floor>=16&&floor%5===0)addItem(game.player,'towerFragment',1+Math.floor(floor/25));\n  if(floor%5===0){const mythical=rollRegionalMythical({chestType:'boss',name:game.world?.name},game.world,Math.random,'chest');if(mythical)addItem(game.player,mythical.item,1);}")],"import {rollRegionalMythical} from './regionalLootSystem.js';\n")
edit('player.js',[("  const safeQty = Math.max(1, Math.floor(qty || 1));\n\n  if (item.stack)", "  const safeQty = Math.max(1, Math.floor(qty || 1));\n  if(id==='ashCoin'){player.gold=(Number(player.gold)||0)+safeQty;return true;}\n\n  if (item.stack)")])
edit('saveProfiles.js',[("  player.inventory = normalizeInventory(player.inventory);", "  if(!profile?.equipmentProgressionVersion){delete player.equipmentProgressionVersion;player.equippedGear={};}\n  player.inventory = normalizeInventory(player.inventory);")])
edit('factionEquipmentArt.js',[("${profile.silhouette}:${image.width}","${profile.silhouette}:${profile.base}:${image.width}")])
edit('combatMoves.js',[("  isPassable,\n  moveActorWithCollision", "  isPassable,\n  hasLineOfSight,\n  moveActorWithCollision")])
edit('combat.js',[
 ("    candidate.score = candidate.distance * getEnemyTargetThreatMultiplier(enemy, candidate.target, candidate.kind);", "    candidate.score = candidate.distance * getEnemyTargetThreatMultiplier(enemy, candidate.target, candidate.kind);\n    if(candidate.kind==='summon'&&candidate.target.id===enemy.targetSummonId&&enemy.summonThreatUntil>performance.now()/1000)candidate.score*=.35;"),
 (" * durationScalar * getChargeDurationMultiplier(ability);", " * durationScalar * getChargeDurationMultiplier(ability) * (ability._mythGuard?1.25:1);"),
 ("    used = useDefensiveAbility(player, ability, log, now);", "    used = useDefensiveAbility(player, ability, log, now);\n    if(used&&ability._mythGuard){for(const ally of (player.coop?.players||[]).filter(p=>p.hp>0&&Math.hypot(p.x-player.x,p.y-player.y)<=120))ally.buffs={...ally.buffs,defense:{...player.buffs.defense,reduction:player.buffs.defense.reduction*.75}};spawnWorldEffect(world,{kind:'combatTechnique',profile:'litany',x:player.x,y:player.y,colors:['#dfd3a1','#fff2ca','#606658'],radius:120,ttl:.5});}")
])
edit('mythicalEquipmentData.js',[("Costs 20% more Spirit; Dodge", "Costs 20% more Stamina; Dodge")])
edit('equipmentProgressionSystem.js',[("980,1400,2000,2800,3900,5200,6800,8600,10400,12000", "800,1050,1400,1750,2100,2450,2800,3150,3400,3600")])
print('Regional loot and economy applied.')
