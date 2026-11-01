import {DUNGEON_ENCOUNTERS} from './encounterData.js';
import {rarityWeights} from './gearRarity.js';

// Dungeon quality follows the location, never the visiting player's level.
export function dungeonLootTier(world={}){
 if(!['dungeon','sideZone'].includes(world.mode))return null;
 const id=world.dungeonId||world.poiId||world.entranceId||world.dungeonState?.dungeonId;
 if(['castleVeyr','dawnspireRoot','demonCultLair'].includes(id))return 'legendary';
 const levels=DUNGEON_ENCOUNTERS[id];
 return (levels?levels[1]<=8:Number(world.tier||world.depth||1)<=1)?'common':'rare';
}
export function isDungeonFinalLootBoss(enemy){return !!enemy?.isBoss&&!enemy.miniBoss&&enemy.roomRole!=='miniBoss';}
export function enemyGearWeights(level,enemy,world){
 const tier=dungeonLootTier(world);
 if(tier==='common')return {common:100};
 if(tier==='rare')return {common:70,uncommon:24,rare:6};
 if(tier==='legendary')return isDungeonFinalLootBoss(enemy)?{common:15,uncommon:15,rare:30,legendary:40}:{common:64,uncommon:27,rare:8,legendary:1};
 return rarityWeights(level);
}
export function rollEnemyGearRarity(level,enemy,world,rng){
 let roll=Math.max(0,Math.min(.999999999,rng()))*100;
 for(const [rarity,weight]of Object.entries(enemyGearWeights(level,enemy,world))){roll-=weight;if(roll<0)return rarity;}
 return 'common';
}
