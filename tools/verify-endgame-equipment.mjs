import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS} from '../src/data.js';
import {ENDGAME_ITEMS,ENDGAME_ENSEMBLES,endgameLootPool,ENDGAME_LOOT_SHARE} from '../src/endgameEquipmentData.js';
import {GEAR_RARITIES,rarityWeights,instanceGearItem} from '../src/gearRarity.js';
import {rollUniversalGear,randomGearPool,gearAcquisitionReason,gearEquipReason} from '../src/gearItemization.js';
import {createPlayer,chooseClass,addItem,getArmour} from '../src/player.js';
import {equipGearEntry} from '../src/equipmentProgressionSystem.js';
import {getEquipmentStatBonuses,getActiveSetBonuses} from '../src/setBonusSystem.js';
import {equipmentCombatPower,equipmentDamageMultiplier} from '../src/combatPower.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {grantWorldItem,createEnemyLootDrops,updateWorldLootPickups} from '../src/lootSystem.js';
import {workshopFixture} from './workshop-fixtures.mjs';
const entries=Object.values(ENDGAME_ITEMS),sets=Object.values(ENDGAME_ENSEMBLES);assert.equal(entries.length,48);assert.equal(sets.length,12);
const actor=(level,slot=1,classId='classless')=>{const p=createPlayer('Endgame P'+slot);chooseClass(p,classId);p.skillState.combat.level=level;Object.assign(p,{id:'endgame-'+slot,combatLevel:level,slot,x:300,y:300,inventory:[]});return p;};
const meta=(item,grade=item.rarity)=>({gearRarity:grade,rarityRollVersion:1,itemLevel:item.minCombatLevel});
const cursor=(level,grade)=>{let x=0;for(const[id,w]of Object.entries(rarityWeights(level))){if(id===grade)return(x+w/2)/100;x+=w;}throw Error(grade);};
const roll=(enemy,level,select,grade)=>{let n=0;const result=rollUniversalGear({combatLevel:100,...enemy},actor(level),()=>[0,select,cursor(level,grade)][n++]);assert.equal(n,3);return result;};
assert(randomGearPool().every(i=>!i.endgameExclusive));
const originals=JSON.stringify(ENDGAME_ITEMS);
let gradeRejections=0;
for(const item of entries){
 assert.equal(ITEMS[item.id],item);assert.deepEqual(item.allowedGearRarities,[item.rarity]);assert(item.noRandomDrop);assert(!['common','uncommon','rare'].includes(item.rarity));
 const low=actor(item.minCombatLevel-1);assert(!addItem(low,item.id,1,meta(item)));assert.match(gearAcquisitionReason(low,item.id,1,meta(item)),/Combat Level/);
 for(const grade of Object.keys(GEAR_RARITIES)){
  const p=actor(100);if(grade!==item.rarity){assert(!addItem(p,item.id,1,meta(item,grade)));assert.equal(p.inventory.length,0);assert(gearEquipReason(p,item.id,meta(item,grade)));gradeRejections++;}
  else {assert(addItem(p,item.id,1,meta(item)));assert(equipGearEntry(p,p.inventory.length-1));assert.equal(p.equippedGear[item.slot].gearRarity,item.rarity);assert.equal(instanceGearItem(item,p.equippedGear[item.slot]).rarity,item.rarity);}
 }
 const gradePool=endgameLootPool(item.rarity,item.minCombatLevel,{isBoss:true,combatLevel:item.minCombatLevel}),i=gradePool.findIndex(x=>x.id===item.id);assert(i>=0);
 assert.equal(roll({isBoss:true},item.minCombatLevel,ENDGAME_LOOT_SHARE*(i+.5)/gradePool.length,item.rarity).item,item.id);
 assert.equal(roll({elite:true},item.minCombatLevel,ENDGAME_LOOT_SHARE*(i+.5)/gradePool.length,item.rarity).item,item.id);
}
for(const level of [1,49,50,64,65,79,80,100])for(const grade of ['legendary','mythic','primordial']){
 if(!rarityWeights(level)[grade])continue;
 for(const enemy of [{},{elite:true},{isBoss:true},{roomRole:'miniBoss'}]){
  const result=roll(enemy,level,.1,grade),item=ITEMS[result.item];if(item.endgameExclusive){assert(level>=item.minCombatLevel);assert.equal(result.gearRarity,item.rarity);assert(enemy.elite||enemy.isBoss||enemy.roomRole==='miniBoss');}
  else if(!enemy.elite&&!enemy.isBoss&&!enemy.roomRole)assert(!item.endgameExclusive);
 }
}
// Low-quality rolls, ineligible levels and suppressed/summoned enemies never yield these IDs.
for(const grade of ['common','uncommon','rare'])assert(!ITEMS[roll({isBoss:true},100,0,grade).item].endgameExclusive);
for(const flags of [{rewardSuppressed:true},{summonedBy:'boss'},{summonedByBoss:true}])assert.equal(rollUniversalGear({isBoss:true,...flags},actor(100),()=>0),null);
for(const grade of ['legendary','mythic','primordial'])assert(!ITEMS[roll({isBoss:true,combatLevel:49},100,.1,grade).item].endgameExclusive,'Weak bosses cannot drop endgame gear');
const legacy=roll({isBoss:true},100,.9,'primordial');assert(!ITEMS[legacy.item].endgameExclusive,'Existing high-grade bases must remain reachable');
console.log('PASS 48 exact-grade boss/elite drops; 240 forbidden grade acquisitions; level50/65/80 and source gates; existing RNG order and legacy pool retained');
let loadouts=0;
for(const set of sets)for(let slot=1;slot<=4;slot++)for(const classId of ['oathkeeper','fellhunter','eldritch','waverider']){
 const p=actor(100,slot,classId),baseArmour=getArmour(p),basePower=equipmentCombatPower(p);
 for(const [n,id]of set.pieces.entries()){
  assert(addItem(p,id,1,meta(ITEMS[id])));assert(equipGearEntry(p,p.inventory.findIndex(x=>x.id===id)));
  const active=getActiveSetBonuses(p).filter(x=>x.setId===set.id);assert.equal(active.length,Math.max(0,n));
 }
 assert(getArmour(p)>baseArmour);assert(equipmentCombatPower(p)>basePower);assert.equal(getEquipmentStatBonuses(p).bossDamage,set.bonuses[3]?.bossDamage||set.bonuses[4]?.bossDamage);
 assert(equipmentDamageMultiplier(p,{isBoss:true},'physical')>1);
 const saved=normalizeProfileSave(sanitizeForSave(p));for(const slot of ['weapon','helm','chest','legs','trinket'])assert.equal(saved.equipment[slot],p.equipment[slot]);assert.equal(getArmour(saved),getArmour(p));assert.deepEqual(getEquipmentStatBonuses(saved),getEquipmentStatBonuses(p));
 for(const id of set.pieces){const ref=Object.values(saved.equippedGear).find(e=>e.id===id);assert.equal(ref.gearRarity,set.rarity);assert(ref.instanceId);}
 loadouts++;
}
assert.equal(JSON.stringify(ENDGAME_ITEMS),originals);console.log('PASS',loadouts,'four-piece loadouts, four class styles × four local owners, set thresholds, actual armour/spirit/boss scaling and save/load');
for(const set of sets){
 const low=actor(set.minCombatLevel-1),w=workshopFixture(low).world;assert(!grantWorldItem(low,w,set.pieces[0]));assert.equal(w.drops?.length||0,0,'No downgraded endgame reward on ground');
}
const p=actor(100),world=workshopFixture(p).world,item=ENDGAME_ITEMS.stormSovereignHelm;
for(let i=0;i<20;i++)assert(addItem(p,'blackIronSword'));assert(!grantWorldItem(p,world,item.id));assert.equal(world.drops.length,1);assert.equal(world.drops[0].gearRarity,'primordial');p.inventory.pop();updateWorldLootPickups(world,p,1,()=>{});assert(p.inventory.some(e=>e.id===item.id&&e.gearRarity==='primordial'));
// Exercise the normal seeded enemy-death pipeline for each of the three restricted grades.
const finder=actor(100),w=workshopFixture(finder).world,found={};
for(let n=1;n<=100000&&Object.keys(found).length<3;n++){
 w.drops=[];const enemy={id:'endgame-seed-'+n,kind:'rat',elite:true,isBoss:true,combatLevel:100,x:300,y:300,hp:0,rewardSeed:'endgame-equipment-'+n};
 const drops=createEnemyLootDrops(enemy,finder,w),drop=drops.find(d=>ITEMS[d.itemId]?.endgameExclusive);if(!drop||found[drop.gearRarity])continue;
 assert.equal(createEnemyLootDrops(enemy,finder,w).length,0);assert.equal(drop.rarity,drop.gearRarity);assert.equal(drop.ownerSlot,1);assert.equal(drop.itemLevel,100);found[drop.gearRarity]={seed:enemy.rewardSeed,id:drop.itemId};
 updateWorldLootPickups(w,finder,1,()=>{});assert(finder.inventory.some(e=>e.id===drop.itemId&&e.gearRarity===drop.gearRarity));
}
assert.deepEqual(Object.keys(found).sort(),['legendary','mythic','primordial']);fs.mkdirSync('docs/endgame-equipment',{recursive:true});fs.writeFileSync('docs/endgame-equipment/loot-evidence.json',JSON.stringify({loadouts,gradeRejections,found},null,2));
console.log('PASS full-bag recovery, no low-level reward downgrade and actual seeded enemy death/pickup exactly once',JSON.stringify(found));
for(let slot=1;slot<=4;slot++){
 const party=[1,2,3,4].map(n=>actor(100,n));party[0].coop={players:party.slice(1)};for(const p of party){p.x=600;p.y=600;}party[slot-1].x=300;party[slot-1].y=300;
 const world=workshopFixture(party[0]).world,enemy={id:'party-drop-'+slot,kind:'rat',isBoss:true,elite:true,combatLevel:100,x:300,y:300,hp:0,rewardSeed:found.primordial.seed};
 const drop=createEnemyLootDrops(enemy,party[0],world).find(d=>ITEMS[d.itemId]?.endgameExclusive);assert(drop);assert.equal(drop.ownerSlot,slot);assert.equal(drop.ownerLabel,'P'+slot);
 const other=party[slot%4];other.x=drop.x;other.y=drop.y;updateWorldLootPickups(world,other,1,()=>{});assert(!other.inventory.some(e=>e.id===drop.itemId));
 party[slot-1].x=drop.x;party[slot-1].y=drop.y;updateWorldLootPickups(world,party[slot-1],1,()=>{});assert(party[slot-1].inventory.some(e=>e.id===drop.itemId&&e.gearRarity==='primordial'));
}
console.log('PASS all four nearest-owner ground drops, correct owner labels, foreign pickup rejection and Primordial owner acquisition');
