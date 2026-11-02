import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {GEAR_RARITIES} from '../src/gearRarity.js';
import {createPlayer,chooseClass,addItem,countItem} from '../src/player.js';
import {setItemLocked,isItemLocked,makeGearSaleQuote,commitGearSale,inventoryDisposalKey} from '../src/gearServices.js';
import {salvageInventoryItem} from '../src/craftingSystem.js';
import {sellMarketSalvage} from '../src/shopSystem.js';
import {equipGearEntry,unequipGearEntry,makeUpgradeQuote,commitGearUpgrade} from '../src/equipmentProgressionSystem.js';
import {performInventorySalvageAction,performEquipmentActionButton,performCoterieActionButton} from '../src/panelInventory.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {workshopFixture} from './workshop-fixtures.mjs';
const actor=(slot=1,classId='classless')=>{const p=createPlayer('Locked P'+slot);chooseClass(p,classId);p.skillState.combat.level=100;Object.assign(p,{id:'lock-'+slot,slot,combatLevel:100,inventory:[],gold:1e6});return p;};
const snapshot=p=>JSON.stringify({inventory:p.inventory,equipment:p.equipment,equippedGear:p.equippedGear,gold:p.gold,crafting:p.crafting,skills:p.skillState});
const meta=grade=>({gearRarity:grade,rarityRollVersion:1,itemLevel:100});
let cases=0;
for(let slot=1;slot<=4;slot++)for(const grade of Object.keys(GEAR_RARITIES))for(const [part,id]of Object.entries({weapon:'oldKnife',helm:'graveboundHelm',chest:'patchedRoadLeathers',legs:'graveboundGreaves',trinket:'crackedVowShield'})){
 const p=actor(slot);assert(ITEMS[id]);assert(addItem(p,id,1,meta(grade)));assert(addItem(p,id,1,meta(grade)));const [entry,other]=p.inventory,g=workshopFixture(p);g.uiState={};
 const old=makeGearSaleQuote(p,entry.instanceId),oldKey=inventoryDisposalKey(entry,0);assert(old);assert(setItemLocked(p,entry,true));assert(isItemLocked(entry));assert(!isItemLocked(other));assert.notEqual(inventoryDisposalKey(entry,0),oldKey);
 let before=snapshot(p);assert.equal(makeGearSaleQuote(p,entry.instanceId),null);assert(!commitGearSale(p,old));assert(!salvageInventoryItem(p,0,g));assert(!performInventorySalvageAction(p,{dataset:{inventoryItemIndex:'0'}},g));assert.equal(snapshot(p),before);
 assert(setItemLocked(p,entry,false));assert(!commitGearSale(p,old),'Lock/unlock must invalidate stale sale confirmation');assert(setItemLocked(p,entry,true));
 const otherQuote=makeGearSaleQuote(p,other.instanceId);assert(otherQuote);assert(commitGearSale(p,otherQuote));assert(p.inventory.includes(entry));
 assert(equipGearEntry(p,p.inventory.indexOf(entry)));assert.equal(p.equippedGear[part],entry);assert(isItemLocked(entry));
 const saved=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert.equal(saved.equippedGear[part].instanceId,entry.instanceId);assert.equal(saved.equippedGear[part].locked,true);assert.equal(saved.equippedGear[part].gearRarity,grade);
 const q=makeUpgradeQuote(p,part);assert(q);for(const [material,n]of q.cost.materials)assert(addItem(p,material,n));assert(commitGearUpgrade(p,q).ok);assert(isItemLocked(entry));assert(unequipGearEntry(p,part));assert(p.inventory.includes(entry));assert(isItemLocked(entry));
 const copied=actor();assert(addItem(copied,id,1,entry));assert(copied.inventory[0].locked);assert.equal(copied.inventory[0].itemLockRevision,entry.itemLockRevision);
 assert(setItemLocked(p,entry,false));const quote=makeGearSaleQuote(p,entry.instanceId);assert(quote);assert(commitGearSale(p,quote));cases++;
}
console.log('PASS '+cases+' copy-specific grade/slot/owner lock cases; direct/stale sale and deconstruction blocked; duplicate unlocked copy unaffected; equip/upgrade/unequip/save/load/copy preserve lock');
for(let slot=1;slot<=4;slot++){
 const p=actor(slot);addItem(p,'fieldstone',5);const locked=p.inventory[0];assert(setItemLocked(p,locked,true));addItem(p,'fieldstone',2);assert.equal(locked.qty,7);assert(isItemLocked(locked));
 // A legacy duplicate unlocked stack must be sold without consuming the locked first stack.
 p.inventory.push({id:'fieldstone',qty:5});const gold=p.gold;assert(sellMarketSalvage({player:p,log(){}}));assert.equal(locked.qty,7);assert(p.inventory.includes(locked));assert.equal(p.inventory.find(e=>e!==locked&&e.id==='fieldstone').qty,2);assert(p.gold>gold);
 const saved=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert(saved.inventory.find(e=>e.id==='fieldstone'&&e.locked)?.qty===7);
 assert(!setItemLocked(actor(),locked,false),'Cannot change another owner’s copy');
 const e=p.inventory.find(x=>x!==locked);const button={dataset:{equipmentAction:'toggle-lock',inventoryItemIndex:String(p.inventory.indexOf(e)),lockItemId:e.id}};assert(performEquipmentActionButton(p,button,{uiState:{}},()=>{}));assert(isItemLocked(e));assert(performEquipmentActionButton(p,button,{uiState:{}},()=>{}));assert(!isItemLocked(e));
}
console.log('PASS locked material stacks survive bulk sale, legacy duplicate stacks, incoming quantities and saves; cross-owner edits rejected; normal inventory Lock/Unlock action works');
{
 const p=actor(1,'gravecaller');p.gravecaller.path='commander';p.gravecallerPath='commander';addItem(p,'oldKnife');const entry=p.inventory[0];setItemLocked(p,entry,true);const g={uiState:{},log(){}};
 const button=action=>({dataset:{coterieAction:action,coterieSkeletonIndex:'0',coterieSlot:'weapon',inventoryItemIndex:String(p.inventory.findIndex(e=>e.instanceId===entry.instanceId))}});
 assert(performCoterieActionButton(p,button('equip'),g));assert.equal(p.gravecaller.skeletons[0].equippedGear.weapon.locked,true);const saved=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert(saved.gravecaller.skeletons[0].equippedGear.weapon.locked);assert(performCoterieActionButton(p,button('unequip'),g));assert(p.inventory.find(e=>e.instanceId===entry.instanceId).locked);
}
{
 const p=actor();addItem(p,'oldKnife',1,meta('rare'));const entry=p.inventory[0],g=workshopFixture(p);g.uiState={};const row={dataset:{inventoryItemIndex:'0'}};assert(!performInventorySalvageAction(p,row,g));const first=g.uiState.pendingInventorySalvageKey;setItemLocked(p,entry,true);setItemLocked(p,entry,false);assert(!performInventorySalvageAction(p,row,g),'Old inventory confirmation must not deconstruct after lock/unlock');assert.notEqual(g.uiState.pendingInventorySalvageKey,first);assert(performInventorySalvageAction(p,row,g));
}
console.log('PASS Bone Coterie transfer/save/retrieval retains lock and old inventory deconstruction confirmation is invalidated by lock/unlock');
