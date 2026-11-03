import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {armourTraining,armourHandling,armourWeightLabel} from '../src/trainingProfiles.js';
import {createPlayer,chooseClass,getArmour,migratePlayer} from '../src/player.js';
import {calculateAbilityDamage} from '../src/combat.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {recordEnemyCombatContribution,grantSharedCombatKillXp} from '../src/combatProgression.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';

import {buyMarketOffer,marketOffersForStock} from '../src/shopSystem.js';
import {equipGearEntry} from '../src/equipmentProgressionSystem.js';

const sets = {
  lightArmour:['clothHood','necromancerRobe','roughLegwraps'],
  mediumArmour:['brigandMask','battleMageCoat','watcherGreaves'],
  heavyArmour:['knightHelm','knightChest','ironGreaves']
};
const slots = ['helm','chest','legs'];
function wear(player, pieces) {
  for (const [i,slot] of slots.entries()) player.equipment[slot] = pieces[i];
  migratePlayer(player);
}
function actor(pieces) {
  const p = createPlayer('Armour Test');
  chooseClass(p,'oathkeeper');
  Object.assign(p,{x:260,y:320,dirX:1,dirY:0});
  for (const id of Object.keys(sets)) p.skillState.skills[id].level=80;
  wear(p,pieces);
  return p;
}
for (const item of Object.values(ITEMS).filter(i=>i.type==='armour')) {
  assert.ok(['light','medium','heavy'].includes(item.armourWeight),item.id);
  const weights=armourTraining(item);
  assert.equal(weights[item.armourWeight+'Armour'],50,item.id);
  assert.match(armourWeightLabel(item),/^(Light|Medium|Heavy) Armour$/);
  assert.equal(Object.keys(sets).filter(id=>weights[id]).length,1,item.id);
}
for (const [id,expected] of [['moonstagWardenChest','lightArmour'],['runeboundMarshalChest','mediumArmour'],['sunwardRegentChest','heavyArmour']]) {
  assert.ok(armourTraining(ITEMS[id])[expected],id);
}
const [light,medium,heavy] = Object.values(sets).map(actor);
const [l,m,h] = [light,medium,heavy].map(armourHandling);
assert.ok(l.rangedDamageBonus>m.rangedDamageBonus && m.rangedDamageBonus>h.rangedDamageBonus);
assert.ok(m.meleeDamageBonus>l.meleeDamageBonus && m.meleeDamageBonus>h.meleeDamageBonus);
assert.ok(getArmour(heavy)>getArmour(medium) && getArmour(medium)>getArmour(light));
assert.ok(heavy.maxHp>medium.maxHp && medium.maxHp===light.maxHp);
assert.ok(l.dodgeCost<m.dodgeCost && m.dodgeCost<h.dodgeCost);
assert.ok(l.channelCost<m.channelCost && m.channelCost<h.channelCost);

const spell = {id:'testSpell',skill:'spirit',damage:180,damageMultiplier:1,range:200};
assert.ok(calculateAbilityDamage(light,spell)>calculateAbilityDamage(medium,spell));
assert.ok(calculateAbilityDamage(medium,{...spell,range:60})>calculateAbilityDamage(light,{...spell,range:60}));
medium.skillState.skills.mediumArmour.level=1;
assert.ok(armourHandling(medium).meleeDamageBonus<m.meleeDamageBonus);

function attack(player, family, distance) {
  player.equipment.weapon = Object.values(ITEMS).find(i=>i.weaponType===family).id;
  const target={id:'target',kind:'rat',x:player.x+distance,y:player.y-8,hp:1000,maxHp:1000,r:14,radius:14,combatLevel:1};
  const world={mode:'dungeon',width:40,height:30,tiles:Array.from({length:30},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),enemies:[target],objects:[],effects:[]};
  const aim={combatAimX:1,combatAimY:0,hasAim:true};
  const now=performance.now()/1000;
  assert.ok(requestBasicAttack(player,world,aim,()=>{},now));
  for(let i=1;i<90;i++)updateWeaponCombat(player,world,aim,1/60,now+i/60);
  assert.ok(target.hp<1000);
  return 1000-target.hp;
}
const random=Math.random;
try {
  Math.random=()=>.99;
  assert.ok(attack(actor(sets.lightArmour),'bow',60)>attack(actor(sets.heavyArmour),'bow',60));
  assert.ok(attack(actor(sets.mediumArmour),'sword',28)>attack(actor(sets.heavyArmour),'sword',28));
} finally {
  Math.random=random;
}

const p=actor(sets.mediumArmour);
const enemy={name:'Target',x:p.x,y:p.y,hp:50,maxHp:50,xp:100};
recordEnemyCombatContribution(enemy,p,'blade',50,{source:'weapon',weaponType:'sword'});
wear(p,sets.lightArmour);
grantSharedCombatKillXp(p,enemy,100);
assert.ok(p.lastCombatReward.awards.some(a=>a.skillId==='mediumArmour'&&a.sources.includes('Armour')));
assert.ok(!p.lastCombatReward.awards.some(a=>a.skillId==='lightArmour'));
const restored=normalizeProfileSave(sanitizeForSave(p));
assert.deepEqual(restored.skillState.skills.mediumArmour,p.skillState.skills.mediumArmour);

wear(p,sets.heavyArmour);
p.hp=p.maxHp*.05;
const injured=p.hp;
for(let i=0;i<6;i++) {
  wear(p,sets.lightArmour);
  wear(p,sets.heavyArmour);
}
assert.ok(Math.abs(p.hp-injured)<1e-8);
p.hp=0;
wear(p,sets.lightArmour);
wear(p,sets.heavyArmour);
assert.equal(p.hp,0);
globalThis.document = {getElementById:() => null};
const merchantArmour = stockId => marketOffersForStock(stockId).filter(o => ITEMS[o.id].type==='armour');
assert.equal(merchantArmour('alchemist').length,3);
assert.equal(merchantArmour('blacksmith').length,6);
for (const [weight,stockId] of [['light','alchemist'],['medium','blacksmith'],['heavy','blacksmith']]) {
  const offers = merchantArmour(stockId).filter(o => ITEMS[o.id].armourWeight===weight);
  assert.deepEqual(offers.map(o => ITEMS[o.id].slot),slots);
  const starter = createPlayer('Shop test');
  starter.gold = offers.reduce((sum,offer) => sum+offer.price,0);
  assert.ok(starter.gold <= 30);
  const shop = {player:starter,marketShop:{stockId},log(){}};
  for (const offer of offers) {
    const wrongShop = {...shop,marketShop:{stockId:stockId==='alchemist'?'blacksmith':'alchemist'}};
    assert.equal(buyMarketOffer(wrongShop,offer.id),false);
    shop.marketShop.lastPurchaseAt = -Infinity;
    assert.ok(buyMarketOffer(shop,offer.id),offer.id);
    const index = starter.inventory.findIndex(e => e.id===offer.id);
    assert.equal(starter.inventory[index].gearRarity,'common');
    assert.equal(starter.inventory[index].upgradeTier,1);
    assert.ok(equipGearEntry(starter,index),offer.id);
  }
  assert.equal(starter.gold,0);
  const target = {name:'Target',hp:50,maxHp:50};
  recordEnemyCombatContribution(target,starter,'blade',50,{source:'weapon',weaponType:'sword'});
  grantSharedCombatKillXp(starter,target,100);
  assert.deepEqual(starter.lastCombatReward.awards.filter(a => a.skillId.endsWith('Armour')).map(a => a.skillId),[weight+'Armour']);
}
console.log('PASS all nine beginner pieces buy and equip at level 1 and train the matching armour skill.');
console.log('PASS armour catalogue, real bow and melee hits, ability damage, armour XP snapshots, save/load and injured gear swaps.');
