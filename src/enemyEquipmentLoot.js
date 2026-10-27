import {ENEMY_ITEM_DROP_RATE_SCALAR,ITEMS} from './data.js';
import {getHumanoidEquipmentLoot} from './humanoidEnemies.js';
import {getEnemyVisualProfile} from './enemyVisualProfiles.js';
export const ENEMY_EQUIPMENT_LOOT_CONFIG=Object.freeze({chance:.003,trophyChance:.03,baselineScalar:.4});
export function getEnemyCollectiblePool(enemy){
 if(!enemy||enemy.isBoss||enemy.worldBoss||enemy.bossType||enemy.uniqueEquipment||enemy.questEquipment)return [];
 const profile=getEnemyVisualProfile(enemy);
 if(profile.family==='human')return getHumanoidEquipmentLoot(enemy);
 const trophy=profile.family==='skeleton'?'boneShard':profile.family==='spectral'?'paleEssence':profile.family==='brute'?'ironScrap':profile.family==='blighted'?'burialCloth':profile.family==='aberration'?'cultAsh':profile.family==='beast'?(profile.id.includes('Wolf')||profile.id==='wolf'?'wolfFang':'tornHide'):null;
 return trophy&&ITEMS[trophy]?[{item:trophy,qty:1,trophy:true}]:[];
}
export function rollEnemyCollectible(enemy,world={},random=Math.random){
 if(!enemy||enemy.enemyEquipmentLootRolled)return null;
 enemy.enemyEquipmentLootRolled=true;
 const pool=getEnemyCollectiblePool(enemy);if(!pool.length)return null;
 const cfg={...ENEMY_EQUIPMENT_LOOT_CONFIG,...world.enemyEquipmentLootConfig};
 // Wearable faction gear is exceptional (0.3%); trophies retain their material rate. Global changes still
 // scale this roll along with ordinary loot. Each eligible kill gets one roll.
 const base=pool[0].trophy?cfg.trophyChance:cfg.chance;
 const chance=Math.max(0,Math.min(1,Number(base)*ENEMY_ITEM_DROP_RATE_SCALAR/ENEMY_EQUIPMENT_LOOT_CONFIG.baselineScalar));
 if(random()>=chance)return null;
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
