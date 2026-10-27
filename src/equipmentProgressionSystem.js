import { ITEMS } from './data.js';
import {workshopAccessStatus} from './workshopAccess.js';

export const MAX_UPGRADE_TIER = 20;
export const EQUIPMENT_SLOTS = Object.freeze(['weapon','helm','chest','legs','trinket']);
const GOLD = [0,0,20,28,36,44,150,220,320,460,660,800,1050,1400,1750,2100,2450,2800,3150,3400,3600];
export const isTieredEquipment = item => ['weapon','armour','trinket'].includes(item?.type);
const tier = value => Math.min(MAX_UPGRADE_TIER,Math.max(1,Math.floor(Number(value)||1)));
function instance(player,id,metadata={}) {
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
export function getTierStatBonus(item,upgradeTier=1) {
  return (tier(upgradeTier)-1)*(item?.type==='weapon'?.35:item?.type==='trinket'?.24:.18);
}
export function getEquipmentTierBonus(player,slot) {
  return getTierStatBonus(ITEMS[player?.equipment?.[slot]],getEquipmentTier(player,slot));
}
export function getTierUpgradeCost(item,targetTier) {
  const next=Math.floor(Number(targetTier)||0);
  if(next<2 || next>MAX_UPGRADE_TIER)return null;
  const raw=[['ironScrap',next<=5?next-1:next<=10?next:next<=15?(next-5)*2:(next-10)*4]];
  const gathered=item?.weaponType==='bow'||item?.weaponType==='staff'||item?.weaponType==='spiritFocus'?'sturdyHardwood':item?.type==='armour'?'amberResin':item?.type==='trinket'?'fieldstone':'blackironOre';
  if(next>=3)raw.push([gathered,next<6?1:Math.ceil((next-3)/3)]);
  if(next>=6)raw.push(['arcaneDust',next<=10?next-4:next<=15?(next-7)*2:(next-10)*3]);
  if(next>=11)raw.push([item?.weaponType==='bow'?'thornsilkFiber':item?.weaponType==='scythe'?'graveSilver':item?.weaponType==='staff'?'spiritwoodSplinter':item?.weaponType==='spiritFocus'?'lumenQuartz':item?.type==='trinket'?'tideglassCrystal':'oathsteelShard',next-10]);
  if(next>=16)raw.push(['towerFragment',next-15]);
  return {gold:GOLD[next],materials:raw,targetTier:next};
}
export function makeUpgradeQuote(player,slot) {
  const current=getEquipmentTier(player,slot),entry=player?.equippedGear?.[slot],item=ITEMS[entry?.id];
  if(!entry||!isTieredEquipment(item)||current>=MAX_UPGRADE_TIER)return null;
  return {slot,instanceId:entry.instanceId,itemId:entry.id,currentTier:current,targetTier:current+1,cost:getTierUpgradeCost(item,current+1)};
}
export function commitGearUpgrade(player,quote) {
  const access=workshopAccessStatus(player,'blacksmith');if(!access.ok)return access;
  if(!quote)return {ok:false,reason:'Maximum tier reached or no equipment selected.'};
  const live=quote.source==='inventory'?makeOwnedGearUpgradeQuote(player,quote.instanceId):makeUpgradeQuote(player,quote.slot);
  if(!live || live.instanceId!==quote.instanceId || live.currentTier!==quote.currentTier)return {ok:false,reason:'Equipment changed. Review the upgrade again.'};
  if((live.source||'equipped')!==(quote.source||'equipped')||live.itemId!==quote.itemId)return {ok:false,reason:'Equipment moved. Review the upgrade again.'};
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
  target.upgradeTier=live.targetTier;
  if(live.source!=='inventory')player.gearUpgrades[live.slot]=live.targetTier-1;
  return {ok:true,...live};
}
export function makeOwnedGearUpgradeQuote(player,instanceId){
  normalizeEquipmentProgression(player);
  const slot=EQUIPMENT_SLOTS.find(slot=>player.equippedGear?.[slot]?.instanceId===instanceId);
  if(slot)return makeUpgradeQuote(player,slot);
  const entry=player.inventory.find(e=>e.instanceId===instanceId),item=ITEMS[entry?.id],currentTier=tier(entry?.upgradeTier);
  if(!entry||!isTieredEquipment(item)||currentTier>=MAX_UPGRADE_TIER)return null;
  return {source:'inventory',instanceId,itemId:entry.id,currentTier,targetTier:currentTier+1,cost:getTierUpgradeCost(item,currentTier+1)};
}
export function equipGearEntry(player,bagIndex) {
  normalizeEquipmentProgression(player);
  const entry=player.inventory[bagIndex],item=ITEMS[entry?.id],slot=item?.slot==='jewelry'?'trinket':item?.slot;
  if(!EQUIPMENT_SLOTS.includes(slot)||!isTieredEquipment(item))return false;
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
  player.inventory.push(entry);delete player.equippedGear[slot];player.equipment[slot]=null;player.gearUpgrades[slot]=0;return true;
}
