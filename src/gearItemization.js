import {ITEMS} from './data.js';
import {isGear,GEAR_BAG_CAPACITY,GEAR_RARITIES,canonicalGearRarity,instanceGearItem,gearDropChance,gearGradeAllowed} from './gearRarity.js';
import {endgameLootPool,ENDGAME_LOOT_SHARE} from './endgameEquipmentData.js';
import {dungeonLootTier,isDungeonFinalLootBoss,rollEnemyGearRarity} from './dungeonLootPolicy.js';
export function gearBagCount(player){return (player?.inventory||[]).reduce((n,e)=>n+(isGear(ITEMS[e.id])?Math.max(1,Number(e.qty)||1):0),0);}
export function canCarryGear(player,id,qty=1){return !isGear(ITEMS[id])||gearBagCount(player)+Math.max(1,Number(qty)||1)<=GEAR_BAG_CAPACITY;}
export function gearEquipReason(player,id,metadata={}){
 const item=ITEMS[id];if(!item?.endgameExclusive)return '';
 if(Number(player?.combatLevel||1)<item.minCombatLevel)return `Combat Level ${item.minCombatLevel} is required for ${item.name}.`;
 if(!gearGradeAllowed(item,metadata.gearRarity||item.rarity,metadata))return `${item.name} must be found at its original quality before ascending at the blacksmith.`;
 return '';
}
export function gearAcquisitionReason(player,id,qty=1,metadata={}){
 if(!isGear(ITEMS[id]))return '';
 if(!canCarryGear(player,id,qty))return 'Gear bag full (20 slots). Sell gear or visit a blacksmith to deconstruct it.';
 const restricted=gearEquipReason(player,id,metadata);if(restricted)return restricted;
 if(GEAR_RARITIES[canonicalGearRarity(metadata.gearRarity||ITEMS[id].rarity)].rank>=4&&Number(player?.combatLevel||1)<50)return 'Combat Level 50 is required to obtain Mythical or Primordial gear.';
 return '';
}
export function equippedGearItem(player,slot){const id=player?.equipment?.[slot];return instanceGearItem(ITEMS[id],player?.equippedGear?.[slot]);}
export function gearRewardReason(player,rewards=[]){
 let reserved=0;
 for(const reward of rewards){const [id,qty=1]=Array.isArray(reward)?reward:[reward?.itemId,reward?.qty||1];
  const reason=gearAcquisitionReason(player,id,qty);if(reason)return reason;
  if(isGear(ITEMS[id]))reserved+=Math.max(1,Number(qty)||1);
 }
 return gearBagCount(player)+reserved>GEAR_BAG_CAPACITY?'Make room in the 20-slot gear bag before claiming these rewards.':'';
}
export function randomGearPool(){return Object.values(ITEMS).filter(item=>isGear(item)&&!item.questItem&&!item.noRandomDrop);}
export function rollUniversalGear(enemy,owner,rng=Math.random,world={}){
 const finalBoss=dungeonLootTier(world)==='legendary'&&isDungeonFinalLootBoss(enemy);
 const chance=gearDropChance(enemy);
 if(rng()>=(chance>0&&finalBoss?1:chance))return null;
 // Keep the existing chance/base/rarity RNG consumption order for old seeded loot.
 let selection=Math.max(0,Math.min(.999999999,rng()));
 const rawLevel=Number(owner?.combatLevel??owner?.skillState?.combat?.level??owner?.level),level=Number.isFinite(rawLevel)?Math.max(1,Math.floor(rawLevel)):1;
 const rarity=rollEnemyGearRarity(level,enemy,world,rng),exclusive=endgameLootPool(rarity,level,enemy);
 let pool=randomGearPool().filter(item=>gearGradeAllowed(item,rarity));
 if(exclusive.length){if(selection<ENDGAME_LOOT_SHARE){pool=exclusive;selection/=ENDGAME_LOOT_SHARE;}else selection=(selection-ENDGAME_LOOT_SHARE)/(1-ENDGAME_LOOT_SHARE);}
 if(!pool.length)return null;
 const item=pool[Math.min(pool.length-1,Math.floor(selection*pool.length))];
 return {item:item.id,qty:1,upgradeTier:1,gearRarity:rarity,itemLevel:level,rarityRollVersion:1};
}
