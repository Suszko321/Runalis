import {ITEMS} from './data.js';
import {isGear,instanceGearItem,gearRarity,GEAR_RARITIES} from './gearRarity.js';
export function isGearInstanceEquipped(player,entry){
 const refs=[...Object.values(player?.equippedGear||{}),...(player?.gravecaller?.skeletons||[]).flatMap(s=>Object.values(s.equippedGear||{}))];
 return entry?.instanceId?refs.some(r=>r?.instanceId===entry.instanceId):Object.values(player?.equipment||{}).includes(entry?.id);
}
export function makeGearSaleQuote(player,instanceId){
 const entry=player?.inventory?.find(e=>e.instanceId===instanceId),base=ITEMS[entry?.id];
 if(!entry||!isGear(base)||isGearInstanceEquipped(player,entry))return null;
 const item=instanceGearItem(base,entry),grade=gearRarity(base,entry),tier=entry.upgradeTier||1;
 return {instanceId,itemId:entry.id,rarity:grade,tier,owner:player.profileId||player.id||player.name,gold:Math.max(1,Math.floor((item.value||4)*.35*(1+.03*(tier-1))))};
}
export function commitGearSale(player,quote){
 const live=quote&&makeGearSaleQuote(player,quote.instanceId);if(!live||JSON.stringify(live)!==JSON.stringify(quote))return false;
 const index=player.inventory.findIndex(e=>e.instanceId===quote.instanceId);player.inventory.splice(index,1);player.gold=(Number(player.gold)||0)+quote.gold;return true;
}
export function gearDeconstructionRewards(item){
 const rank=GEAR_RARITIES[gearRarity(item)].rank,rewards=[['ironScrap',[1,2,3,5,8,12][rank]]];
 if(rank>=2)rewards.push(['arcaneDust',[0,0,1,3,6,10][rank]]);
 const gathered=['bow','staff','spiritFocus'].includes(item.weaponType)?'sturdyHardwood':item.type==='armour'?'amberResin':item.type==='trinket'?'fieldstone':'blackironOre';
 rewards.push([gathered,1+Math.floor(rank/2)]);if(rank>=4)rewards.push(['towerFragment',rank-3]);return rewards;
}
