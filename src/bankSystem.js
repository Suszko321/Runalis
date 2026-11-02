import {ITEMS} from './data.js';
import {isGear} from './gearRarity.js';
import {isGearInstanceEquipped} from './gearServices.js';
import {gearAcquisitionReason} from './gearItemization.js';

const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function bankDepositReason(actor,entry){
 const item=ITEMS[entry?.id];
 if(!Object.hasOwn(ITEMS,entry?.id)||!isGear(item))return 'Only gear and gold can be stored here.';
 if(item.questItem||item.noTrade||item.soulbound||entry.bound||entry.soulbound)return 'This gear belongs to this character.';
 if(isGearInstanceEquipped(actor,entry))return 'Unequip this gear before storing it.';
 if(!integer(entry.qty)||entry.qty<1)return 'Invalid item quantity.';
 return '';
}
// Pure projection: storage must succeed before callers replace the live economy.
export function planBankTransfer(actor,vault,command){
 if(!integer(actor.gold)||!integer(vault.gold)||!integer(vault.revision)||!Array.isArray(vault.items)||vault.items.length>2000)throw Error('Invalid bank or character balance.');
 const player=structuredClone({inventory:actor.inventory,gold:actor.gold,storage:actor.storage||{}}),bank=structuredClone(vault);
 if(command.type==='gold'){
  const amount=command.amount;if(!integer(amount)||amount<1)throw Error('Enter a positive whole amount of gold.');
  const source=command.withdraw?bank:player,destination=command.withdraw?player:bank;
  if(source.gold<amount)throw Error('Not enough gold.');
  if(!integer(destination.gold+amount))throw Error('Gold storage limit reached.');
  source.gold-=amount;destination.gold+=amount;
 }else if(command.type==='item'){
  const source=command.withdraw?bank.items:player.inventory,destination=command.withdraw?player.inventory:bank.items;
  const entry=source[command.index];
  if(!entry||JSON.stringify(entry)!==command.identity)throw Error('This item changed. Select it again.');
  if(command.withdraw){
   if(!isGear(ITEMS[entry.id])||!integer(entry.qty)||entry.qty<1)throw Error('Invalid stored gear.');
   const reason=gearAcquisitionReason(actor,entry.id,entry.qty,entry);if(reason)throw Error(reason);
  }else{const reason=bankDepositReason(actor,entry);if(reason)throw Error(reason);}
  if(destination.length>=2000)throw Error('Storage is full.');
  const identities=command.withdraw?[...destination,...Object.values(actor.equippedGear||{}),...(actor.gravecaller?.skeletons||[]).flatMap(s=>Object.values(s.equippedGear||{}))]:destination;
  if(entry.instanceId&&identities.some(e=>e?.instanceId===entry.instanceId))throw Error('This gear identity already exists in the destination.');
  destination.push(source.splice(command.index,1)[0]);
 }else throw Error('Unknown bank action.');
 bank.revision++;if(!integer(bank.revision))throw Error('Bank revision limit reached.');
 return {player,bank};
}
