import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {COMMON_WEAPON_ITEMS,ORRAKAI_PRACTICE_OFFERS,practiceMerchantKind} from '../src/commonWeaponData.js';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {CLASS_STARTER_GEAR} from '../src/gameInteraction.js';
import {buyMarketOffer,marketOffersForStock} from '../src/shopSystem.js';
import {equipGearEntry,makeUpgradeQuote,commitGearUpgrade} from '../src/equipmentProgressionSystem.js';
import {calculateWeaponDamage,requestBasicAttack,requestHeavyAttack,updateWeaponCombat,getWeaponTypeFromPlayer} from '../src/combatMoves.js';
import {weaponProficiency} from '../src/progressionProfiles.js';
import {grantSharedCombatKillXp} from '../src/combatProgression.js';
import {readSkillScroll} from '../src/skillScrollSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {workshopFixture} from './workshop-fixtures.mjs';
import {assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {useAbility} from '../src/combat.js';
globalThis.document={getElementById:()=>null};Object.defineProperty(globalThis,'performance',{value:{now:()=>100000},configurable:true});
const entries=Object.values(COMMON_WEAPON_ITEMS),starters=new Set(Object.values(CLASS_STARTER_GEAR).map(s=>s.weapon)),types=new Set(Object.values(ITEMS).filter(i=>i.type==='weapon').map(i=>i.weaponType));
assert.equal(entries.length,11);assert.equal(types.size,11);assert.deepEqual(new Set(entries.map(i=>i.weaponType)),types);assert.equal(ORRAKAI_PRACTICE_OFFERS.blacksmith.length,7);assert.equal(ORRAKAI_PRACTICE_OFFERS.alchemist.length,4);assert.equal(marketOffersForStock('alchemist').filter(o=>ITEMS[o.id].type!=='armour').length,5);assert.equal(practiceMerchantKind({workshopService:'blacksmith'}),'blacksmith');assert.equal(practiceMerchantKind({apothecaryService:true}),'alchemist');
const actor=(slot=1,classId='classless')=>{const p=createPlayer('Practice P'+slot);chooseClass(p,classId);Object.assign(p,{slot,combatLevel:1,inventory:[],gold:100,x:260,y:320,dirX:1,dirY:0});return p;};
const shop=(p,stockId)=>({player:p,marketShop:{stockId,lastPurchaseAt:0},log:()=>{}});
const world=()=>({mode:'tower',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
let purchases=0,attacks=0;
for(const item of entries){
 assert(!starters.has(item.id));assert.equal(item.rarity,'common');assert(!item.legendaryPassive&&!item.setId&&!item.minCombatLevel);assert(item.baseDamage<=3&&item.primaryMultiplier===1&&item.power===0);assert(item.noRandomDrop);
 const stock=Object.entries(ORRAKAI_PRACTICE_OFFERS).find(([,offers])=>offers.some(o=>o.id===item.id))[0],offer=marketOffersForStock(stock).find(o=>o.id===item.id);assert(offer.price>=4&&offer.price<=8);
 for(let slot=1;slot<=4;slot++)for(const classId of ['classless','oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch']){
  const p=actor(slot,classId),g=shop(p,stock),gold=p.gold;assert(buyMarketOffer(g,item.id),item.id);const entry=p.inventory.find(e=>e.id===item.id);assert.equal(entry.gearRarity,'common');assert.equal(entry.itemLevel,1);assert.equal(entry.upgradeTier,1);assert.equal(p.gold,gold-offer.price);assert(equipGearEntry(p,p.inventory.indexOf(entry)));assert.equal(getWeaponTypeFromPlayer(p),item.weaponType);assert(calculateWeaponDamage(p,item)>0);purchases++;
  const saved=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert.equal(saved.equippedGear.weapon.instanceId,entry.instanceId);assert.equal(saved.equippedGear.weapon.gearRarity,'common');
 }
 for(const heavy of [false,true]){
  const p=actor(),g=shop(p,stock);assert(buyMarketOffer(g,item.id));assert(equipGearEntry(p,0));Object.assign(p,{stamina:1000,maxStamina:1000,spirit:1000,maxSpirit:1000});
  const w=world(),target={id:'dummy',name:'Dummy',kind:'rat',hp:10000,maxHp:10000,x:heavy?320:290,y:311,r:12,radius:12,level:1,xp:1};w.enemies.push(target);
  assert((heavy?requestHeavyAttack:requestBasicAttack)(p,w,{combatAimX:1,combatAimY:0,hasAim:true},()=>{},100));for(let i=1;i<130;i++)updateWeaponCombat(p,w,{},.016,100+i*.016,()=>{});assert(target.hp<10000,item.id+' cannot hit');const skill=weaponProficiency(item),beforeXp=p.skillState.skills[skill].xp;target.hp=0;target.dead=true;grantSharedCombatKillXp(p,target,100,()=>{});assert(p.skillState.skills[skill].xp>beforeXp||p.skillState.skills[skill].level>1,item.id+' heavy='+heavy+' did not train '+skill+' '+JSON.stringify(Object.values(target.combatContributors||{}).map(c=>c.weapons)));attacks++;
 }
 const p=actor(),g=shop(p,stock);p.gold=offer.price-1;const before=JSON.stringify({gold:p.gold,inventory:p.inventory,equipment:p.equipment});assert(!buyMarketOffer(g,item.id));assert.equal(JSON.stringify({gold:p.gold,inventory:p.inventory,equipment:p.equipment}),before);
 p.gold=100;const wrong=shop(p,stock==='blacksmith'?'alchemist':'blacksmith'),wrongBefore=JSON.stringify(p);assert(!buyMarketOffer(wrong,item.id));assert.equal(JSON.stringify(p),wrongBefore);
 for(let i=0;i<20;i++)assert(addItem(p,'oldKnife'));const full=JSON.stringify(p);assert(!buyMarketOffer(g,item.id));assert.equal(JSON.stringify(p),full);
}
console.log('PASS '+purchases+' level1 purchases/equips across eight classes/four owners, white Common +1 copies, exact price/save identity; '+attacks+' actual light/heavy damage cases; zero-gold, wrong-vendor and full-bag atomicity');
for(let slot=1;slot<=4;slot++){
 const p=actor(slot),g=shop(p,'alchemist');assert(buyMarketOffer(g,'summonWolfScroll'));const gold=p.gold;g.marketShop.lastPurchaseAt=0;assert(!buyMarketOffer(g,'summonWolfScroll'));assert.equal(p.gold,gold);const result=readSkillScroll(p,p.inventory.findIndex(e=>e.id==='summonWolfScroll'));assert(result.ok,result.reason);assert(p.knownAbilities.includes('summonWolf'));g.marketShop.lastPurchaseAt=0;assert(!buyMarketOffer(g,'summonWolfScroll'));assert.equal(p.gold,gold);assert(assignAbilityToSlot(p,0,'summonWolf').ok);assert(useAbility(0,p,world(),()=>{},300,{combatAimX:1,combatAimY:0,hasAim:true}));assert(p.summons.some(s=>s.kind==='wolf'));
}
assert(!marketOffersForStock().some(o=>COMMON_WEAPON_ITEMS[o.id]));assert(marketOffersForStock().some(o=>o.id==='pilgrimsFocus'));
console.log('PASS Wolf Summon scroll at level1 for all four owners, actual learning and duplicate protection; generic market stock retained');
for(const item of entries){
 const p=actor();assert(addItem(p,item.id));assert(equipGearEntry(p,0));p.gold=1000;workshopFixture(p);const q=makeUpgradeQuote(p,'weapon');assert(q);for(const [id,n]of q.cost.materials)assert(addItem(p,id,n));assert(commitGearUpgrade(p,q).ok);assert.equal(p.equippedGear.weapon.upgradeTier,2);
 const skill=weaponProficiency(item);assert(p.skillState.skills[skill]||p.skillState.attributes?.[skill],skill);
}
console.log('PASS all eleven plain copies use the real smith upgrade path and registered proficiency owners');
for(const item of entries){const p=actor(),plain=calculateWeaponDamage(p,item),others=Object.values(ITEMS).filter(i=>i.type==='weapon'&&i.weaponType===item.weaponType&&!COMMON_WEAPON_ITEMS[i.id]);assert(others.every(i=>calculateWeaponDamage(p,i)>plain),item.id+' must be weaker than existing '+item.weaponType+' gear');}
console.log('PASS every Common practice weapon is weaker at level1 than every existing item in its family');
