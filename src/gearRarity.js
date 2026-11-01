// Pure instance rules shared by loot, stat owners, inventory and services.
export const GEAR_BAG_CAPACITY=20;
export const GEAR_RARITIES=Object.freeze({
 common:{name:'Common',color:'#ffffff',rank:0,power:1},
 uncommon:{name:'Uncommon',color:'#63d17b',rank:1,power:1.2},
 rare:{name:'Rare',color:'#619dff',rank:2,power:1.5},
 legendary:{name:'Legendary',color:'#ffda52',rank:3,power:2},
 mythic:{name:'Mythical',color:'#ad69f0',rank:4,power:2.6},
 primordial:{name:'Primordial',color:'#dc264b',rank:5,power:3.4}
});
export function canonicalGearRarity(value){return ({occult:'rare',epic:'legendary',relic:'legendary',ancient:'primordial',mythical:'mythic'})[value]||(GEAR_RARITIES[value]?value:'common');}
export const isGear=item=>['weapon','armour','trinket'].includes(item?.type);
export function gearGradeAllowed(base,rarity){return !base?.allowedGearRarities||base.allowedGearRarities.includes(canonicalGearRarity(rarity));}
export function gearRarity(base,entry){const grade=canonicalGearRarity(entry?.gearRarity||base?.rarity);return gearGradeAllowed(base,grade)?grade:canonicalGearRarity(base.rarity);}
export function instanceGearItem(base,entry){
 if(!base||!isGear(base))return base;
 if(base.gearInstanceResolved)return base;
 const rarity=gearRarity(base,entry);
 if(entry?.rarityRollVersion!==1)return {...base,rarity};
 const multiplier=GEAR_RARITIES[rarity].power/GEAR_RARITIES[canonicalGearRarity(base.rarity)].power;
 const item={...base,rarity,gearRarityMultiplier:multiplier,itemLevel:entry.itemLevel,gearInstanceResolved:true};
 for(const key of ['baseDamage','power','armour','spirit','focusPower','maxHp','maxStamina','maxSpirit','strength','dexterity','essence','primaryMultiplier','secondaryMultiplier','value'])if(Number.isFinite(base[key]))item[key]=Math.round(base[key]*multiplier*100)/100;
 if(GEAR_RARITIES[rarity].rank<3)delete item.legendaryPassive;
 if(canonicalGearRarity(base.rarity)==='mythic'&&GEAR_RARITIES[rarity].rank<4){delete item.setId;delete item.weaponSetId;}
 return item;
}
export function rarityWeights(level=1){
 const l=Math.max(1,Number(level)||1),p=Math.min(1,(l-1)/49),end=Math.min(1,Math.max(0,(l-50)/50));
 // Percent weights sum to 100. The upper pair is explicitly gated at level50.
 if(l<50)return {common:80-15*p,uncommon:17+10*p,rare:2.9+4*p,legendary:.1+p,mythic:0,primordial:0};
 return {common:60-10*end,uncommon:27+3*end,rare:10+5*end,legendary:2.4+1.6*end,mythic:.55+.35*end,primordial:.05+.05*end};
}
export function rollGearRarity(level,rng=Math.random){let cursor=Math.max(0,Math.min(.999999999,rng()))*100;for(const [id,weight]of Object.entries(rarityWeights(level))){cursor-=weight;if(cursor<0)return id;}return 'common';}
export function gearDropChance(enemy){
 if(!enemy||enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss)return 0;
 if(enemy.isBoss||enemy.worldBoss||enemy.bossType||enemy.roomRole==='miniBoss')return .30;
 const elite=enemy.elite||enemy.isElite||enemy.eliteModifier||enemy.namedExteriorElite||enemy.miniBoss||['rare','champion','elite'].includes(enemy.encounterTier);
 return elite?.06:.015;
}
