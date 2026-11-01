import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {isGear,GEAR_RARITIES,gearRarity,instanceGearItem} from '../src/gearRarity.js';
import {makeOwnedGearUpgradeQuote,makeUpgradeQuote,commitGearUpgrade,equipGearEntry,unequipGearEntry,getTierStatBonus,getTierUpgradeCost,upgradeEntryPreview} from '../src/equipmentProgressionSystem.js';
import {calculateDisplayWeaponDamage} from '../src/panelInventory.js';
import {calculateWeaponDamage} from '../src/combatMoves.js';
import {workshopFixture} from './workshop-fixtures.mjs';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {gearEquipReason} from '../src/gearItemization.js';
import {endWorkshopSession} from '../src/workshopAccess.js';
const actor=slot=>{const p=createPlayer('Ascension P'+slot);chooseClass(p,'classless');p.skillState.combat.level=100;Object.assign(p,{combatLevel:100,slot,x:300,y:300,inventory:[],gold:1e10});return p;};
function fund(p,q){for(const [id,qty]of q.cost.materials){assert(ITEMS[id],id);const found=p.inventory.find(e=>e.id===id);if(found)found.qty=Math.max(found.qty,qty+1000);else assert(addItem(p,id,qty+1000));}}
for(const slot of [1,2,3,4]){
 const p=actor(slot);addItem(p,'oldKnife',1,{gearRarity:'common',rarityRollVersion:1,itemLevel:1});const entry=p.inventory[0],id=entry.instanceId;entry.affixes=[{id:'keepsake',amount:2}];equipGearEntry(p,0);workshopFixture(p);
 const firstQuote=makeUpgradeQuote(p,'weapon');
 let previous=calculateWeaponDamage(p,ITEMS.oldKnife),steps=0,promotions=0;
 while(true){const q=makeUpgradeQuote(p,'weapon');if(!q)break;fund(p,q);const beforeGold=p.gold,preview=upgradeEntryPreview(entry,q),expected=calculateDisplayWeaponDamage(p,ITEMS.oldKnife,preview),snapshot=JSON.stringify(ITEMS.oldKnife);
  const result=commitGearUpgrade(p,q);assert(result.ok,result.reason);steps++;if(q.promotion){promotions++;assert.equal(entry.upgradeTier,1);assert.equal(entry.rarityAscensions,promotions);}
  assert.equal(p.gold,beforeGold-q.cost.gold);assert.equal(entry.instanceId,id);assert.deepEqual(entry.affixes,[{id:'keepsake',amount:2}]);assert.equal(JSON.stringify(ITEMS.oldKnife),snapshot);
  const actual=calculateWeaponDamage(p,ITEMS.oldKnife);assert(actual>=previous,`${q.currentRarity} +${q.currentTier} → ${q.targetRarity} +${q.targetTier}: ${previous} > ${actual}`);assert.equal(actual,expected);previous=actual;
  const before=JSON.stringify(p);assert(!commitGearUpgrade(p,q).ok);assert.equal(JSON.stringify(p),before);
  if(q.promotion){assert(!commitGearUpgrade(p,firstQuote).ok);assert.equal(JSON.stringify(p),before);}
 }
 assert.equal(steps,119);assert.equal(promotions,5);assert.equal(gearRarity(ITEMS.oldKnife,entry),'primordial');assert.equal(entry.upgradeTier,20);
 const saved=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert.equal(saved.equippedGear.weapon.rarityAscensions,5);assert.equal(calculateWeaponDamage(saved,ITEMS.oldKnife),previous);
 unequipGearEntry(p,'weapon');assert.equal(p.inventory.find(e=>e.instanceId===id).rarityAscensions,5);equipGearEntry(p,p.inventory.findIndex(e=>e.instanceId===id));assert.equal(calculateWeaponDamage(p,ITEMS.oldKnife),previous);
}
console.log('PASS all four owners: same starter weapon completes119 upgrades / five ascensions through Primordial+20; monotonic actual power, preview agreement, identity/affixes, stale rejection, saves and swaps');
let bases=0;
for(const item of Object.values(ITEMS).filter(isGear)){
 const p=actor(1);assert(addItem(p,item.id));const entry=p.inventory.findLast(e=>e.id===item.id);entry.upgradeTier=20;workshopFixture(p);const q=makeOwnedGearUpgradeQuote(p,entry.instanceId);
 if(gearRarity(item,entry)==='primordial'){assert.equal(q,null);continue;}
 assert(q?.promotion,item.id);fund(p,q);const before=instanceGearItem(item,entry),bonus=getTierStatBonus(before,20,entry);assert(commitGearUpgrade(p,q).ok,item.id);const after=instanceGearItem(item,entry);assert.equal(gearEquipReason(p,item.id,entry),'');assert(getTierStatBonus(after,1,entry)>=bonus);
 for(const key of ['baseDamage','power','armour','spirit','focusPower'])if(Number.isFinite(before[key]))assert(after[key]>=before[key],item.id+' '+key);
 assert.equal(after.setId,before.setId);assert.deepEqual(after.legendaryPassive,before.legendaryPassive);
 const copy=actor(2);assert(addItem(copy,item.id,1,entry));assert.equal(gearRarity(item,copy.inventory.findLast(e=>e.id===item.id)),q.targetRarity);assert.equal(copy.inventory.findLast(e=>e.id===item.id).rarityAscensions,1);bases++;
}
console.log('PASS every non-Primordial gear base ascends, including exact-grade endgame ensembles; copied metadata, equipment eligibility and every numeric stat retained: '+bases);
for(const rarity of Object.keys(GEAR_RARITIES)){
 const item=ITEMS.oldKnife,entry={gearRarity:rarity,rarityRollVersion:1};let last=0;
 for(let n=2;n<=20;n++){const c=getTierUpgradeCost(item,n,entry);assert(c.gold>last);last=c.gold;assert.equal(c.materials.some(([id])=>id==='bossCore'),GEAR_RARITIES[rarity].rank>=2);assert.equal(new Set(c.materials.map(([id])=>id)).size,c.materials.length);}
}
const p=actor(1);addItem(p,'oldKnife',1,{gearRarity:'uncommon',rarityRollVersion:1});const e=p.inventory[0];e.upgradeTier=20;workshopFixture(p);let q=makeOwnedGearUpgradeQuote(p,e.instanceId);assert(q.cost.materials.some(([id])=>id==='bossCore'));fund(p,q);p.inventory=p.inventory.filter(e=>e.id!=='bossCore');const before=JSON.stringify(p);assert(!commitGearUpgrade(p,q).ok);assert.equal(JSON.stringify(p),before);
e.gearRarity='legendary';p.combatLevel=49;p.skillState.combat.level=49;q=makeOwnedGearUpgradeQuote(p,e.instanceId);assert(q.blockedReason.includes('50'));assert(!commitGearUpgrade(p,q).ok);p.combatLevel=50;p.skillState.combat.level=50;q=makeOwnedGearUpgradeQuote(p,e.instanceId);fund(p,q);assert(commitGearUpgrade(p,q).ok);endWorkshopSession(p);assert(!commitGearUpgrade(p,makeOwnedGearUpgradeQuote(p,e.instanceId)).ok);
console.log('PASS rising per-rarity gold/diverse material costs, boss cores for every Rare+ upgrade and promotion into Rare, atomic missing-core rejection, level50 gates and live blacksmith authority');
