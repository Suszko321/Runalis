import assert from 'node:assert/strict';
import {ITEMS,RARITY} from '../src/data.js';
import {GEAR_RARITIES,rarityWeights,rollGearRarity,gearDropChance,instanceGearItem,isGear} from '../src/gearRarity.js';
import {rollUniversalGear,randomGearPool,gearBagCount,gearRewardReason} from '../src/gearItemization.js';
import {createPlayer,chooseClass,addItem,getPower,getArmour} from '../src/player.js';
import {equipGearEntry,unequipGearEntry,normalizeEquipmentProgression} from '../src/equipmentProgressionSystem.js';
import {calculateWeaponDamage} from '../src/combatMoves.js';
import {makeGearSaleQuote,commitGearSale,gearDeconstructionRewards} from '../src/gearServices.js';
import {salvageInventoryItem,getRecipeCraftStatus} from '../src/craftingSystem.js';
import {grantWorldItem,updateWorldLootPickups,createEnemyLootDrops} from '../src/lootSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {workshopFixture} from './workshop-fixtures.mjs';
import {MYTHICAL_SETS} from '../src/mythicalEquipmentData.js';
import {getMythicalSetCounts} from '../src/mythicalEquipmentSystem.js';
import {getEquippedLegendaryItems} from '../src/legendarySystem.js';
import {getActiveSetBonuses} from '../src/setBonusSystem.js';
import {calculateDisplayWeaponDamage} from '../src/panelInventory.js';
const actor=(level=50,slot=1)=>{const p=createPlayer('Gear P'+slot);chooseClass(p,'classless');p.skillState.combat.level=level;Object.assign(p,{id:'gear-'+slot,slot,x:300,y:300,combatLevel:level,gold:100,inventory:[]});return p;};
const metadata=rarity=>({gearRarity:rarity,rarityRollVersion:1,itemLevel:50});
for(const level of [1,10,49,50,75,100,1000])assert(Math.abs(Object.values(rarityWeights(level)).reduce((a,b)=>a+b)-100)<1e-9);
for(const [level,expected]of [[1,{common:8000,uncommon:1700,rare:290,legendary:10}],[50,{common:6000,uncommon:2700,rare:1000,legendary:240,mythic:55,primordial:5}],[100,{common:5000,uncommon:3000,rare:1500,legendary:400,mythic:90,primordial:10}]]){
 const counts={};for(let i=0;i<10000;i++){const r=rollGearRarity(level,()=>(i+.5)/10000);counts[r]=(counts[r]||0)+1;}assert.deepEqual(counts,expected);
}
assert.equal(rollGearRarity(49,()=>.999999),'legendary');assert.equal(rollGearRarity(50,()=>.999999),'primordial');
for(const rarity of Object.keys(GEAR_RARITIES))assert.equal(RARITY[rarity].color,GEAR_RARITIES[rarity].color);
console.log('PASS six colors, normalized level formulas, exact stratified rarity distribution, level49/50 gates');
const pool=randomGearPool();assert(pool.length>150);
for(let i=0;i<pool.length;i++){let n=0;const rng=()=>[0,(i+.5)/pool.length,0][n++];assert.equal(rollUniversalGear({kind:'rat'},actor(1),rng).item,pool[i].id);}
for(const [enemy,expected]of [[{},150],[{elite:true},600],[{isBoss:true},3000]]){
 let count=0;for(let i=0;i<10000;i++){let n=0;if(rollUniversalGear(enemy,actor(1),()=>n++?.5:(i+.5)/10000))count++;}assert.equal(count,expected);
}
for(const enemy of [{rewardSuppressed:true},{summonedBy:'boss'},{summonedByBoss:true}])assert.equal(gearDropChance(enemy),0);
console.log('PASS all '+pool.length+' gear bases reachable from an ordinary enemy; 1.5% / 6% / 30% gear odds and summon exclusions');
const p=actor(),base=structuredClone(ITEMS.blackIronSword),powers=[],armours=[],damage=[];
for(const rarity of Object.keys(GEAR_RARITIES)){
 assert(addItem(p,'blackIronSword',1,metadata(rarity)));const index=p.inventory.length-1;assert(equipGearEntry(p,index));powers.push(getPower(p));damage.push(calculateWeaponDamage(p,ITEMS.blackIronSword));
 const entry=p.equippedGear.weapon;assert.equal(entry.gearRarity,rarity);assert.equal(instanceGearItem(ITEMS.blackIronSword,entry).rarity,rarity);
 assert.equal(calculateDisplayWeaponDamage(p,ITEMS.blackIronSword,entry),calculateWeaponDamage(p,ITEMS.blackIronSword));
 assert(addItem(p,'graveboundChest',1,metadata(rarity)));assert(equipGearEntry(p,p.inventory.length-1));armours.push(getArmour(p));
}
for(const values of [powers,armours,damage])assert(values.every((v,i)=>!i||v>values[i-1]),values.join(','));assert.deepEqual(ITEMS.blackIronSword,base);
const loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(loaded.equippedGear.weapon.gearRarity,'primordial');assert.equal(getPower(loaded),getPower(p));assert.equal(getArmour(loaded),getArmour(p));
console.log('PASS rarity changes actual strike power/armour monotonically; per-copy identity, immutable base definitions and save/load preserve stats');
{
 const common=actor(1);assert(addItem(common,'demonseedScythe',1,metadata('common')));assert(equipGearEntry(common,0));assert.equal(getEquippedLegendaryItems(common).length,0);
 const high=actor(50);assert(addItem(high,'demonseedScythe',1,metadata('primordial')));assert(equipGearEntry(high,0));assert.equal(getEquippedLegendaryItems(high).length,1);
 for(const [grade,level,count]of [['common',1,0],['mythic',50,3]]){
  const a=actor(level);for(const id of MYTHICAL_SETS.beastSovereign.pieces){assert(addItem(a,id,1,metadata(grade)));assert(equipGearEntry(a,a.inventory.length-1));}
  assert.equal(getMythicalSetCounts(a).beastSovereign||0,count);if(!count)assert(!getActiveSetBonuses(a).some(b=>b.setId==='beastSovereign'));
 }
}
console.log('PASS inventory/runtime damage agrees; low-grade named gear cannot inherit Legendary passives or Mythical set effects');
for(let slot=1;slot<=4;slot++){
 const a=actor(50,slot);for(let i=0;i<20;i++)assert(addItem(a,'blackIronSword',1,metadata('rare')));assert.equal(gearBagCount(a),20);assert(!addItem(a,'blackIronSword'));assert(addItem(a,'ironScrap',100));
 assert(equipGearEntry(a,0));assert.equal(gearBagCount(a),19);assert(addItem(a,'blackIronSword'));assert(!unequipGearEntry(a,'weapon'));assert(equipGearEntry(a,1));assert.equal(gearBagCount(a),20);
 const entry=a.inventory.find(e=>isGear(ITEMS[e.id])),quote=makeGearSaleQuote(a,entry.instanceId),gold=a.gold;assert(commitGearSale(a,quote));assert.equal(a.gold,gold+quote.gold);assert(!commitGearSale(a,quote));assert.equal(gearBagCount(a),19);
 const stale=makeGearSaleQuote(a,a.inventory.find(e=>isGear(ITEMS[e.id])).instanceId);a.inventory.find(e=>e.instanceId===stale.instanceId).upgradeTier++;assert(!commitGearSale(a,stale));
 const index=a.inventory.findIndex(e=>isGear(ITEMS[e.id]));assert(!salvageInventoryItem(a,index,{log(){}}));const game=workshopFixture(a);const rewards=gearDeconstructionRewards(instanceGearItem(ITEMS[a.inventory[index].id],a.inventory[index]));assert(salvageInventoryItem(a,index,game));assert.equal(gearBagCount(a),18);for(const [id,n]of rewards)assert(a.inventory.some(e=>e.id===id&&e.qty>=n));
}
assert(!addItem(actor(49),'blackIronSword',1,metadata('mythic')));assert(addItem(actor(50),'blackIronSword',1,metadata('mythic')));
console.log('PASS 20 gear slots in all four actors; materials excluded; swaps, full-bag unequip, exact sale, stale quotes and blacksmith-only deconstruction');
const a=actor();for(let i=0;i<20;i++)addItem(a,'blackIronSword');const game=workshopFixture(a),w=game.world;
assert(!grantWorldItem(a,w,'roseReaper',1));assert.equal(w.drops.length,1);updateWorldLootPickups(w,a,200,()=>{});assert(!w.drops[0].collected);assert.equal(gearBagCount(a),20);
const quote=makeGearSaleQuote(a,a.inventory.find(e=>isGear(ITEMS[e.id])).instanceId);commitGearSale(a,quote);updateWorldLootPickups(w,a,.01,()=>{});assert(w.drops.length===0||w.drops.every(d=>d.collected));assert.equal(gearBagCount(a),20);assert(a.inventory.some(e=>e.id==='roseReaper'));
assert(gearRewardReason(a,[['roseReaper',1]]));assert(!getRecipeCraftStatus(a,'blackIronSword').ok);
const legacy=actor();legacy.inventory=Array.from({length:23},()=>({id:'blackIronSword',qty:1}));normalizeEquipmentProgression(legacy);assert.equal(gearBagCount(legacy),23);assert(!addItem(legacy,'blackIronSword'));assert(makeGearSaleQuote(legacy,legacy.inventory[0].instanceId));
const random=Math.random;try{Math.random=()=>0;const b=actor(1),bw=workshopFixture(b).world;const enemy={kind:'rat',id:'ordinary',x:b.x,y:b.y,hp:0,combatLevel:1};const drops=createEnemyLootDrops(enemy,b,bw),gear=drops.filter(d=>isGear(ITEMS[d.itemId]));assert.equal(gear.length,1);assert.equal(gear[0].gearRarity,'common');assert.deepEqual(createEnemyLootDrops(enemy,b,bw),[]);}finally{Math.random=random;}
console.log('PASS full-bag reward stays on ground, later pickup succeeds, quests/crafting preflight, overfull legacy preservation and exactly one universal gear roll per death');
