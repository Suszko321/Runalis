import { ITEMS } from './data.js';
import {workshopAccessStatus} from './workshopAccess.js';
import {canCarryGear,gearEquipReason} from './gearItemization.js';
import {GEAR_RARITIES,gearRarity,gearGradeAllowed} from './gearRarity.js';

export const MAX_UPGRADE_TIER = 20;
export const EQUIPMENT_SLOTS = Object.freeze(['weapon','helm','chest','legs','trinket']);
const GOLD = [0,0,5,10,16,24,85,110,140,175,215,260,310,370,440,520,610,710,820,940,1080];
export const isTieredEquipment = item => ['weapon','armour','trinket'].includes(item?.type);
const tier = value => Math.min(MAX_UPGRADE_TIER,Math.max(1,Math.floor(Number(value)||1)));
function instance(player,id,metadata={}) {
  const item=ITEMS[id];
  if(item?.endgameExclusive)metadata={...metadata,gearRarity:gearGradeAllowed(item,metadata.gearRarity,metadata)?metadata.gearRarity||item.rarity:item.rarity,rarityRollVersion:1,itemLevel:Math.max(item.minCombatLevel,Math.floor(Number(metadata.itemLevel||player?.combatLevel)||1))};
  const sequence=Number(player.gearInstanceSequence);
  player.gearInstanceSequence=(Number.isSafeInteger(sequence)&&sequence>=0?sequence:0)+1;
  return {...metadata,id,qty:1,instanceId:metadata.instanceId || `${player.profileId || player.name || 'player'}:gear:${player.gearInstanceSequence}`,upgradeTier:tier(metadata.upgradeTier)};
}

// IDs stay compatible with all existing renderers. Parallel equipped records
// carry the same individual object that moves through the bag and coterie.
export function normalizeEquipmentProgression(player) {
  if(!player)return;
  player.equipment ||= {};
  player.equippedGear ||= {};
  player.inventory ||= [];
  const legacy = player.equipmentProgressionVersion !== 1;
  if(legacy)player.legacyGearUpgradeSnapshot ||= {...player.gearUpgrades};
  for(const slot of EQUIPMENT_SLOTS) {
    const id=player.equipment?.[slot];
    if(!id){delete player.equippedGear[slot];continue;}
    if(player.equippedGear[slot]?.id !== id) {
      const old=legacy?Math.max(0,Number(player.gearUpgrades?.[slot])||0):0;
      player.equippedGear[slot]=instance(player,id,{upgradeTier:1+old,legacyUpgradeLevel:old || undefined});
    } else {player.equippedGear[slot].upgradeTier=tier(player.equippedGear[slot].upgradeTier);player.equippedGear[slot].qty=1;}
  }
  // Split legacy non-stack equipment bundles without changing their count.
  for(let n=0;n<player.inventory.length;n++) {
    const entry=player.inventory[n];
    if(!isTieredEquipment(ITEMS[entry?.id]))continue;
    if(!entry.instanceId) {
      const qty=Math.max(1,Math.floor(Number(entry.qty)||1));
      Object.assign(entry,instance(player,entry.id,entry));entry.qty=1;
      for(let i=1;i<qty;i++)player.inventory.push(instance(player,entry.id,{...entry,instanceId:null,upgradeTier:1}));
    } else entry.upgradeTier=tier(entry.upgradeTier);
  }
  for(const skeleton of player.gravecaller?.skeletons || []){
    skeleton.equippedGear ||= {};
    for(const [slot,id] of Object.entries(skeleton.equipment || {})){
      if(!id){delete skeleton.equippedGear[slot];continue;}
      if(skeleton.equippedGear[slot]?.id!==id)skeleton.equippedGear[slot]=instance(player,id);
      else {skeleton.equippedGear[slot].upgradeTier=tier(skeleton.equippedGear[slot].upgradeTier);skeleton.equippedGear[slot].qty=1;}
    }
  }
  player.gearUpgrades ||= {};
  for(const slot of EQUIPMENT_SLOTS)player.gearUpgrades[slot]=(player.equippedGear[slot]?.upgradeTier || 1)-1;
  player.equipmentProgressionVersion=1;
}
export function createGearEntry(player,id,metadata={}) {return instance(player,id,metadata);}
export function getEquipmentTier(player,slot) {
  if(player?.equipmentProgressionVersion!==1 || player?.equippedGear?.[slot]?.id!==player?.equipment?.[slot])normalizeEquipmentProgression(player);
  return tier(player?.equippedGear?.[slot]?.upgradeTier);
}
export function getTierStatBonus(item,upgradeTier=1,entry=null) {
  const retained=entry?Math.min(5,Math.max(0,Math.floor(Number(entry.rarityAscensions)||0)))*19:Number(item?.refinementSteps)||0;
  return (retained+tier(upgradeTier)-1)*(item?.type==='weapon'?.35:item?.type==='trinket'?.24:.18);
}
export function getEquipmentTierBonus(player,slot) {
  return getTierStatBonus(ITEMS[player?.equipment?.[slot]],getEquipmentTier(player,slot),player?.equippedGear?.[slot]);
}
export function getTierUpgradeCost(item,targetTier,entry=null) {
  const next=Math.floor(Number(targetTier)||0);
  if(next<2 || next>MAX_UPGRADE_TIER)return null;
  const rank=GEAR_RARITIES[gearRarity(item,entry)].rank,scale=[1,2,4,7,11,16][rank];
  const raw=[['ironScrap',(next-1)*scale]];
  const gathered=item?.weaponType==='bow'||item?.weaponType==='staff'||['spiritFocus','grimoire'].includes(item?.weaponType)?'sturdyHardwood':item?.type==='armour'?'amberResin':item?.type==='trinket'?'fieldstone':'blackironOre';
  if(next>=6||rank>=1)raw.push([gathered,Math.ceil(next/5)*scale]);
  if(rank>=2||(rank>=1&&next>=6))raw.push(['arcaneDust',Math.ceil(next/4)*scale]);
  if(rank>=2||(rank>=1&&next>=11))raw.push([item?.weaponType==='bow'?'thornsilkFiber':item?.weaponType==='scythe'?'graveSilver':item?.weaponType==='staff'?'spiritwoodSplinter':['spiritFocus','grimoire'].includes(item?.weaponType)?'lumenQuartz':item?.type==='trinket'?'tideglassCrystal':'oathsteelShard',Math.ceil(next/5)*scale]);
  if(rank>=1&&next>=11||rank>=2)raw.push([['staff','spiritFocus'].includes(item?.weaponType)?'paleEssence':item?.type==='weapon'?'cultAsh':'boneShard',Math.ceil(next/4)*scale]);
  if(rank>=2)raw.push(['bossCore',(rank-1)*Math.ceil(next/5)]);
  if(rank>=3)raw.push(['towerFragment',(rank-2)*Math.ceil(next/5)]);
  return {gold:2000*rank**3+GOLD[next]*(1+rank*3),materials:raw,targetTier:next};
}
export function upgradeEntryPreview(entry,quote){return {...entry,upgradeTier:quote.targetTier,gearRarity:quote.targetRarity,rarityRollVersion:quote.promotion?1:entry.rarityRollVersion,rarityAscensions:quote.currentAscensions+(quote.promotion?1:0),itemLevel:quote.itemLevel};}
function quoteFor(player,entry,source={}){
 const item=ITEMS[entry?.id];if(!entry||!isTieredEquipment(item))return null;
 const currentTier=tier(entry.upgradeTier),currentRarity=gearRarity(item,entry),rank=GEAR_RARITIES[currentRarity].rank,promotion=currentTier===20;
 if(promotion&&rank===5)return null;
 const targetRarity=promotion?Object.keys(GEAR_RARITIES)[rank+1]:currentRarity,targetTier=promotion?1:currentTier+1;
 const cost=promotion?{gold:2000*(rank+1)**3+1500*(rank+1),materials:[['ironScrap',50*(rank+1)],['arcaneDust',5*(rank+1)],['sturdyHardwood',10*(rank+1)],['blackironOre',10*(rank+1)],...(rank>=1?[['bossCore',3*rank]]:[]),...(rank>=2?[['towerFragment',5*(rank-1)],['graveSilver',10*rank]]:[])],targetTier:1}:getTierUpgradeCost(item,targetTier,entry);
 const blockedReason=GEAR_RARITIES[targetRarity].rank>=4&&Number(player.combatLevel||1)<50?'Combat Level 50 is required for Mythical and Primordial gear.':'';
 return {...source,instanceId:entry.instanceId,itemId:entry.id,currentTier,targetTier,currentRarity,targetRarity,promotion,currentAscensions:Number(entry.rarityAscensions)||0,itemLevel:Math.max(Number(entry.itemLevel)||1,Number(player.combatLevel)||1),cost,blockedReason};
}
export function makeUpgradeQuote(player,slot) {
  getEquipmentTier(player,slot);
  const entry=player?.equippedGear?.[slot];
  return quoteFor(player,entry,{slot});
}
export function commitGearUpgrade(player,quote) {
  const access=workshopAccessStatus(player,'blacksmith');if(!access.ok)return access;
  if(!quote)return {ok:false,reason:'Maximum tier reached or no equipment selected.'};
  const live=quote.source==='inventory'?makeOwnedGearUpgradeQuote(player,quote.instanceId):makeUpgradeQuote(player,quote.slot);
  if(!live || live.instanceId!==quote.instanceId || live.currentTier!==quote.currentTier||live.currentRarity!==quote.currentRarity||live.currentAscensions!==quote.currentAscensions)return {ok:false,reason:'Equipment changed. Review the upgrade again.'};
  if((live.source||'equipped')!==(quote.source||'equipped')||live.itemId!==quote.itemId)return {ok:false,reason:'Equipment moved. Review the upgrade again.'};
  if(live.blockedReason)return {ok:false,reason:live.blockedReason};
  if(Number(player.gold||0)<live.cost.gold)return {ok:false,reason:'Not enough gold.'};
  const plans=[];
  for(const [id,qty] of live.cost.materials) {
    let remaining=qty;
    for(const entry of player.inventory)if(entry.id===id && remaining>0) {
      const amount=Math.min(remaining,Number(entry.qty)||0);if(amount>0)plans.push({entry,amount});remaining-=amount;
    }
    if(remaining>0)return {ok:false,reason:`Missing ${ITEMS[id]?.name || id} x${remaining}.`};
  }
  // Validate the entire transaction before touching gold, materials, or tier.
  player.gold-=live.cost.gold;
  for(const {entry,amount} of plans)entry.qty-=amount;
  player.inventory=player.inventory.filter(entry=>entry.qty>0);
  const target=live.source==='inventory'?player.inventory.find(e=>e.instanceId===live.instanceId):player.equippedGear[live.slot];
  Object.assign(target,upgradeEntryPreview(target,live));
  if(live.source!=='inventory')player.gearUpgrades[live.slot]=live.targetTier-1;
  return {ok:true,...live};
}
export function makeOwnedGearUpgradeQuote(player,instanceId){
  normalizeEquipmentProgression(player);
  const slot=EQUIPMENT_SLOTS.find(slot=>player.equippedGear?.[slot]?.instanceId===instanceId);
  if(slot)return makeUpgradeQuote(player,slot);
  const entry=player.inventory.find(e=>e.instanceId===instanceId);
  return quoteFor(player,entry,{source:'inventory'});
}
export function equipGearEntry(player,bagIndex) {
  normalizeEquipmentProgression(player);
  const entry=player.inventory[bagIndex],item=ITEMS[entry?.id],slot=item?.slot==='jewelry'?'trinket':item?.slot;
  if(!EQUIPMENT_SLOTS.includes(slot)||!isTieredEquipment(item))return false;
  if(gearEquipReason(player,entry.id,entry))return false;
  const previous=player.equippedGear[slot];
  player.inventory.splice(bagIndex,1);
  if(previous)player.inventory.push(previous);
  player.equipment[slot]=entry.id;player.equippedGear[slot]=entry;
  player.gearUpgrades[slot]=entry.upgradeTier-1;
  return true;
}
export function unequipGearEntry(player,slot) {
  normalizeEquipmentProgression(player);
  const entry=player.equippedGear?.[slot];if(!entry)return false;
  if(!canCarryGear(player,entry.id))return false;
  player.inventory.push(entry);delete player.equippedGear[slot];player.equipment[slot]=null;player.gearUpgrades[slot]=0;return true;
}
