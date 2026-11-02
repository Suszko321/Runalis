import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {LEGENDARY_WEAPON_ITEMS,LEGENDARY_WEAPON_FAMILIES} from '../src/legendaryWeaponData.js';
import {endgameLootPool,ENDGAME_LOOT_SHARE} from '../src/endgameEquipmentData.js';
import {rollUniversalGear,gearEquipReason} from '../src/gearItemization.js';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {equipGearEntry,makeUpgradeQuote,commitGearUpgrade} from '../src/equipmentProgressionSystem.js';
import {calculateWeaponDamage,requestBasicAttack,requestHeavyAttack,updateWeaponCombat,getProjectiles,getWeaponTypeFromPlayer} from '../src/combatMoves.js';
import {applyLegendaryOutgoingDamage,applyLegendaryIncomingDamage,onLegendaryEnemyKilled,getLegendaryEffectDetails} from '../src/legendarySystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {createEnemyLootDrops,updateWorldLootPickups} from '../src/lootSystem.js';
import {workshopFixture} from './workshop-fixtures.mjs';
const entries=Object.values(LEGENDARY_WEAPON_ITEMS),now=performance.now()/1000+30,aim={combatAimX:1,combatAimY:0,hasAim:true};
assert.equal(entries.length,20);for(const ids of Object.values(LEGENDARY_WEAPON_FAMILIES))assert.equal(ids.length,4);
const actor=(slot=1,classId='classless',level=100)=>{const p=createPlayer('Legendary P'+slot);chooseClass(p,classId);p.skillState.combat.level=level;Object.assign(p,{id:'legendary-'+slot,slot,combatLevel:level,x:260,y:320,dirX:1,dirY:0,inventory:[],hp:500,maxHp:500,stamina:1000,maxStamina:1000,spirit:1000,maxSpirit:1000});return p;};
const world=()=>({mode:'tower',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const equip=(p,id)=>{assert(addItem(p,id,1,{gearRarity:'legendary',rarityRollVersion:1,itemLevel:100}));assert(equipGearEntry(p,p.inventory.findLastIndex(e=>e.id===id)));};
for(const item of entries){
 assert.equal(ITEMS[item.id],item);assert(item.noRandomDrop);assert.equal(item.rarity,'legendary');assert(getLegendaryEffectDetails(item)?.description);
 for(const grade of ['common','uncommon','rare','mythic','primordial'])assert(!addItem(actor(),item.id,1,{gearRarity:grade,rarityRollVersion:1}));
 assert(!addItem(actor(1,'classless',49),item.id));
 for(const enemy of [{isBoss:true},{elite:true}]){
  const source={...enemy,combatLevel:50},pool=endgameLootPool('legendary',50,source),index=pool.findIndex(i=>i.id===item.id);assert(index>=0);let n=0;
  const drop=rollUniversalGear(source,actor(1,'classless',50),()=>[0,ENDGAME_LOOT_SHARE*(index+.5)/pool.length,.98][n++]);assert.equal(n,3);assert.equal(drop.item,item.id);assert.equal(drop.gearRarity,'legendary');
 }
}
for(const source of [{combatLevel:100},{isBoss:true,combatLevel:49},{isBoss:true,rewardSuppressed:true,combatLevel:100},{isBoss:true,summonedBy:'boss',combatLevel:100}])assert(!endgameLootPool('legendary',100,source).some(i=>LEGENDARY_WEAPON_ITEMS[i.id]));
for(const quality of ['mythic','primordial','common','rare'])assert(!endgameLootPool(quality,100,{isBoss:true,combatLevel:100}).some(i=>LEGENDARY_WEAPON_ITEMS[i.id]));
console.log('PASS 20 exact Legendary finds, 100 rejected other-grade acquisitions, level/source gates and deterministic elite/boss pool reachability');
let cases=0;
for(const item of entries)for(const classId of ['classless','oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch'])for(const heavy of [false,true]){
 const p=actor(cases%4+1,classId),known=[...p.knownAbilities];equip(p,item.id);assert.equal(getWeaponTypeFromPlayer(p),item.weaponType);assert(calculateWeaponDamage(p,item)>0);assert.deepEqual(p.knownAbilities,known);
 const w=world(),target={id:'dummy',name:'Dummy',kind:'rat',hp:100000,maxHp:100000,x:heavy?320:290,y:311,r:12,radius:12,level:1,xp:1,aggro:3};w.enemies.push(target);
 assert((heavy?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},now),item.id);for(let i=1;i<=130;i++)updateWeaponCombat(p,w,aim,.016,now+i*.016,()=>{});assert(target.hp<100000,`${item.id}/${classId}/${heavy} did not hit`);
 const loaded=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert.equal(loaded.equipment.weapon,item.id);assert.equal(loaded.equippedGear.weapon.instanceId,p.equippedGear.weapon.instanceId);assert.equal(calculateWeaponDamage(loaded,item),calculateWeaponDamage(p,item));cases++;
}
console.log('PASS '+cases+' real light/heavy class/weapon combinations, all four owners, actual damage and exact-copy save/load');
for(const item of entries){
 const p=actor();equip(p,item.id);Object.assign(p,{hp:100,maxHp:500,stamina:100,maxStamina:1000,spirit:100,maxSpirit:1000,spiritAwakened:true});const passive=item.legendaryPassive,target={hp:200,maxHp:1000};
 const out=(time=now,ctx={ranged:true})=>applyLegendaryOutgoingDamage(p,target,100,ctx,null,null,time);
 switch(passive.type){
  case 'flatDamage':assert.equal(out(),100+passive.amount);break;
  case 'cooldownFlatDamage':assert.equal(out(),100+passive.amount);assert.equal(out(now+.01),100);assert.equal(out(now+passive.cooldown+.1),100+passive.amount);break;
  case 'executeBonus':assert.equal(out(),Math.ceil(100*(1+passive.bonusPct/100)));target.hp=800;assert.equal(out(),100);break;
  case 'rangedBonus':assert.equal(out(),Math.ceil(100*(1+passive.bonusPct/100)));assert.equal(out(now,{}),100);break;
  case 'killRestore':onLegendaryEnemyKilled(p,target,null,null,now);assert.equal(p.hp,100+passive.hp);assert.equal(p.spirit,100+passive.spirit);onLegendaryEnemyKilled(p,target,null,null,now);assert.equal(p.hp,100+passive.hp);break;
  case 'lowHpReduction':assert.equal(applyLegendaryIncomingDamage(p,100,null,null,null,now),84);p.hp=450;assert.equal(applyLegendaryIncomingDamage(p,100),100);break;
  case 'damageReductionAndStamina':assert.equal(applyLegendaryIncomingDamage(p,100),92);assert.equal(p.stamina,103);break;
  default:assert.fail('Untested passive '+passive.type);
 }
 // Upgrade an owned Legendary+20 into Mythical through the real smith transaction.
 p.equippedGear.weapon.upgradeTier=20;p.gold=1e8;workshopFixture(p);const identity=p.equippedGear.weapon.instanceId,q=makeUpgradeQuote(p,'weapon');assert(q?.promotion);for(const [id,qty]of q.cost.materials)assert(addItem(p,id,qty));assert(commitGearUpgrade(p,q).ok);assert.equal(p.equippedGear.weapon.gearRarity,'mythic');assert.equal(p.equippedGear.weapon.instanceId,identity);assert.equal(gearEquipReason(p,item.id,p.equippedGear.weapon),'');
}
for(const id of LEGENDARY_WEAPON_FAMILIES.grimoires)for(let slot=1;slot<=4;slot++)for(const heavy of [false,true]){
 const p=actor(slot),w=world();equip(p,id);assert((heavy?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},now));equip(p,'lastSunriseLion');let shot;
 for(let i=1;i<90&&!shot;i++){updateWeaponCombat(p,w,aim,.016,now+i*.016,()=>{});shot=getProjectiles(p).find(s=>s.focusItemId);}
 assert.equal(shot?.focusItemId,id);if(heavy)assert.equal(shot.kind,'focusLance');
}
console.log('PASS all 20 live passive effects and cooldown/threshold boundaries, real blacksmith ascension and 32 latched grimoire shots across owners');
// Seeded real death/pickup: exactly once, owner-specific, with launch delay respected.
const p=actor(4),w=world();let found=false,foundSeed=0,foundId='';
for(let seed=1;seed<20000&&!found;seed++){
 w.drops=[];const enemy={id:'legendary-seed-'+seed,kind:'rat',isBoss:true,combatLevel:100,x:p.x,y:p.y,hp:0,rewardSeed:'legendary-armory-'+seed};
 const drops=createEnemyLootDrops(enemy,p,w),drop=drops.find(d=>LEGENDARY_WEAPON_ITEMS[d.itemId]);if(!drop)continue;
 assert.equal(drop.ownerSlot,4);assert.equal(drop.gearRarity,'legendary');assert.deepEqual(createEnemyLootDrops(enemy,p,w),[]);for(const d of w.drops){d.x=p.x;d.y=p.y;}for(let i=0;i<15;i++)updateWorldLootPickups(w,p,.1,()=>{});assert(p.inventory.some(e=>e.id===drop.itemId&&e.gearRarity==='legendary'));found=true;foundSeed=seed;foundId=drop.itemId;
}
assert(found);console.log('PASS seeded real Legendary weapon death/drop/launch/pickup exactly once with P4 ownership');
const full=actor(4),ground=world();for(let i=0;i<20;i++)assert(addItem(full,'oldKnife'));
createEnemyLootDrops({id:'full-bag-legendary',kind:'rat',isBoss:true,combatLevel:100,x:full.x,y:full.y,hp:0,rewardSeed:'legendary-armory-'+foundSeed},full,ground);
for(const d of ground.drops){d.x=full.x;d.y=full.y;}for(let i=0;i<15;i++)updateWorldLootPickups(ground,full,.1,()=>{});
assert(ground.drops.some(d=>d.itemId===foundId));assert(!full.inventory.some(e=>e.id===foundId));full.inventory.splice(0,1);updateWorldLootPickups(ground,full,.1,()=>{});assert(full.inventory.some(e=>e.id===foundId&&e.gearRarity==='legendary'));
console.log('PASS full-bag Legendary weapon remains on ground and recovers at the same grade after freeing a slot');
