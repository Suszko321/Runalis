import { ITEMS } from './data.js';
import { MYTHICAL_SETS } from './mythicalEquipmentData.js';
import { isTieredEquipment } from './equipmentProgressionSystem.js';

export const GEAR_LOOT_TUNING=Object.freeze({enemyGearScalar:.08,eliteGearScalar:.2,bossGearScalar:.35,ordinaryChestGearChance:.07,lockedChestGearChance:.15,bossChestGearChance:.25,legendaryBossChance:.02,mythicalBossChance:.015,mythicalEliteChance:.0015,mythicalRareCacheChance:.02});
export function regionalSetPool(source={},world={}) {
 const text=[source.kind,source.name,source.bossName,source.bossType,source.majorPoiId,source.poiLootProfile,source.id,world.name,world.theme,world.dungeonId,world.regionId,world.infiniteDungeonRegionId].filter(Boolean).join(' ').toLowerCase();
 const ids=[];
 if(/water|tide|marsh|drown|river|shore/.test(text))ids.push('drownedConvergence');
 if(/wolf|beast|thorn|briar|forest|grove|wood/.test(text))ids.push('beastSovereign');
 if(/cult|ember|seal|last dawn|red dawn|execution|demon/.test(text))ids.push('ashenExecutioner');
 if(/blight|veyr|wraith|eldritch|void|star|crypt|grave|ascension/.test(text))ids.push('blightedStar');
 if(/holy|solgate|oath|knight|guardian|aureate|pilgrim|chapel|covenant|seraphel|zephyr/.test(text))ids.push('pilgrimVigil');
 // Frontier tower explores beasts and the blighted; other regions retain identity.
 if(!ids.length&&/hearthmere|frontier/.test(text))ids.push('beastSovereign','blightedStar');
 return [...new Set(ids)].flatMap(id=>MYTHICAL_SETS[id].pieces);
}
export function rollRegionalMythical(source,world={},random=Math.random,context='enemy') {
 if(context==='enemy'&&source?.encounterStatsVersion&&Number(source.combatLevel)<25)return null;
 const pool=regionalSetPool(source,world);if(!pool.length)return null;
 const boss=Boolean(source?.isBoss||source?.worldBoss||source?.bossType||source?.chestType==='boss');
 const elite=Boolean(source?.elite||source?.eliteModifier||source?.namedExteriorElite);
 const chance=context==='cache'?(source?.rare||source?.cursed?GEAR_LOOT_TUNING.mythicalRareCacheChance:0):context==='chest'?(boss?.04:source?.chestType==='locked'?.006:0):boss?GEAR_LOOT_TUNING.mythicalBossChance:elite?GEAR_LOOT_TUNING.mythicalEliteChance:0;
 if(random()>=chance)return null;
 return {item:pool[Math.min(pool.length-1,Math.floor(random()*pool.length))],qty:1,upgradeTier:1};
}
export function filterChestEquipment(rewards,source={},random=Math.random) {
 const result=[];let gearCount=0;
 for(const reward of rewards){const id=Array.isArray(reward)?reward[0]:reward?.itemId,item=ITEMS[id];
  if(!isTieredEquipment(item)){result.push(reward);continue;}
  if(source.guaranteedEquipment || source.questReward){result.push(reward);continue;}
  const chance=['legendary','mythic','ancient'].includes(item.rarity)?.025:source.chestType==='boss'?GEAR_LOOT_TUNING.bossChestGearChance:source.chestType==='locked'||source.rare?GEAR_LOOT_TUNING.lockedChestGearChance:GEAR_LOOT_TUNING.ordinaryChestGearChance;
  if(!gearCount&&random()<chance){result.push(Array.isArray(reward)?[id,1]:{...reward,qty:1});gearCount++;}
 }
 return result;
}
export function regionalLegendaryPool(enemy,allIds) {
 const text=[enemy?.kind,enemy?.bossType,enemy?.name,enemy?.majorPoiId,enemy?.poiLootProfile].join(' ').toLowerCase();
 const themed=/water|tide|drown|river/.test(text)?['tideglassHeart','zephyrglassAmulet']: /thorn|briar|beast|wolf/.test(text)?['thornheartStaffLegendary','briarCovenantGreaves','blackbriarCrown']: /cult|seal|demon/.test(text)?['demonseedScythe','ashboundMantle','sunfractureGauntlet']: /holy|oath|solgate|guardian/.test(text)?['dawnwardAegis','oathplateOfTheLastDawn','sunforgedHalo','everdawnCarver']: /veyr|grave|wraith|crypt|blight/.test(text)?['veyrglassBlade','lichboneScythe','blackstarGreaves','crownOfTheEndless']:allIds;
 return themed.filter(id=>ITEMS[id]);
}
