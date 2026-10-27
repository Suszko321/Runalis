import assert from 'node:assert/strict';
import {workshopFixture} from './workshop-fixtures.mjs';
import fs from 'node:fs';
import {createPlayer,chooseClass,addItem,getPower,getArmour,calculateMaxHp} from '../src/player.js';
import {ITEMS,rollEnemyLoot,getAbilityById} from '../src/data.js';
import {MYTHICAL_SETS,MYTHICAL_ITEMS} from '../src/mythicalEquipmentData.js';
import {normalizeEquipmentProgression,equipGearEntry,unequipGearEntry,getEquipmentTier,getTierUpgradeCost,makeUpgradeQuote,commitGearUpgrade,isTieredEquipment} from '../src/equipmentProgressionSystem.js';
import {getMythicalSetCounts,applyMythicalAbilityModifiers,applyMythicalMeleeModifiers} from '../src/mythicalEquipmentSystem.js';
import {getActiveSetBonuses,getEquipmentStatBonuses,describeBonusMap} from '../src/setBonusSystem.js';
import {ensureActionState,updateStaminaActions,applyDefensiveDamage} from '../src/combatActions.js';
import {synchronizeEquipmentBoundSkills} from '../src/equipmentBoundSkills.js';
import {unlockActiveAbility,assignAbilityToSlot,getAbilityAvailability} from '../src/abilityLoadoutSystem.js';
import {useAbility,updateCombat,updateSummons,updateEnemies} from '../src/combat.js';
import {calculateWeaponDamage,ensureCombatState,requestBasicAttack,requestHeavyAttack,updateWeaponCombat,applyCombinationFinisher,WEAPON_MOVESETS} from '../src/combatMoves.js';
import {getAbilityMastery,grantAbilityMasteryXp} from '../src/abilityMasterySystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {rollRegionalMythical,regionalSetPool,filterChestEquipment} from '../src/regionalLootSystem.js';
import {rollLegendaryBossDrop} from '../src/legendarySystem.js';
import {rollEnemyCollectible} from '../src/enemyEquipmentLoot.js';
import {createEnemyLootDrops,updateWorldLootPickups} from '../src/lootSystem.js';
import {performEquipmentSlotUpgradeAction,performEquipmentActionButton,performCoterieActionButton} from '../src/panelInventory.js';
import {readSkillScroll} from '../src/skillScrollSystem.js';
import {claimTowerReward} from '../src/towerSystem.js';
import {calculateDisplayWeaponDamage} from '../src/panelInventory.js';
import {getAbilityMorphOptions,selectAbilityMorph} from '../src/abilityMorphSystem.js';

const report={checks:[],loot:{},costs:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const actor=(classId='classless')=>{const p=createPlayer('Loot '+classId);chooseClass(p,classId,()=>{});Object.assign(p,{id:classId,x:260,y:320,dirX:1,dirY:0,spirit:200,maxSpirit:200,stamina:500,maxStamina:500,hp:500,maxHp:500,gold:10000});return p;};
const world=()=>({mode:'dungeon',name:'Briar Crypt',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]});
const foe=(id='test',x=295,y=320)=>({id,name:'Test enemy',kind:'rat',x,y,hp:100000,maxHp:100000,xp:80,level:1,r:12,radius:12,aggro:3,attackCooldown:100});
const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},time=()=>performance.now()/1000+30;
const equip=(p,id)=>{addItem(p,id);assert.ok(equipGearEntry(p,p.inventory.findLastIndex(i=>i.id===id)));};
const set=(p,id,n=3)=>{for(const item of MYTHICAL_SETS[id].pieces.slice(0,n))equip(p,item);};
const funds=(p)=>{p.gold=1e6;for(const id of ['ironScrap','arcaneDust','sturdyHardwood','amberResin','fieldstone','blackironOre','thornsilkFiber','graveSilver','spiritwoodSplinter','lumenQuartz','tideglassCrystal','oathsteelShard','towerFragment'])addItem(p,id,1000);workshopFixture(p);};
const total=(p,id)=>p.inventory.filter(i=>i.id===id).reduce((n,i)=>n+i.qty,0);

test('all new acquisitions, duplicate copies and swaps retain individual tiers',()=>{
 const p=actor();equip(p,'demonseedScythe');funds(p);for(let i=0;i<4;i++)assert.ok(commitGearUpgrade(p,makeUpgradeQuote(p,'weapon')).ok);
 const original=p.equippedGear.weapon.instanceId;addItem(p,'demonseedScythe');const fresh=p.inventory.findLastIndex(i=>i.id==='demonseedScythe');assert.equal(p.inventory[fresh].upgradeTier,1);equipGearEntry(p,fresh);assert.equal(getEquipmentTier(p,'weapon'),1);
 const old=p.inventory.findIndex(i=>i.instanceId===original);assert.equal(p.inventory[old].upgradeTier,5);equipGearEntry(p,old);assert.equal(getEquipmentTier(p,'weapon'),5);unequipGearEntry(p,'weapon');assert.equal(p.inventory.find(i=>i.instanceId===original).upgradeTier,5);
});
test('every rarity shares twenty tiers, fixed acquisition stats and one cap',()=>{
 for(const rarity of ['common','uncommon','rare','occult','epic','relic','legendary','mythic','ancient']){
  const item=Object.values(ITEMS).find(i=>i.rarity===rarity&&isTieredEquipment(i)) || {...ITEMS.oldKnife,id:'verify-'+rarity,rarity};const synthetic=!ITEMS[item.id];if(synthetic)ITEMS[item.id]=item;const p=actor();equip(p,item.id);assert.equal(getEquipmentTier(p,item.slot),1);funds(p);
  for(let n=2;n<=20;n++){assert.ok(commitGearUpgrade(p,makeUpgradeQuote(p,item.slot)).ok);assert.equal(getEquipmentTier(p,item.slot),n);}
  assert.equal(makeUpgradeQuote(p,item.slot),null);assert.equal(getTierUpgradeCost(item,21),null);if(synthetic)delete ITEMS[item.id];
 }
});
test('upgrade costs jump at tier six and remain monotonic through twenty',()=>{
 for(let n=2;n<=20;n++){const cost=getTierUpgradeCost(ITEMS.demonseedScythe,n);report.costs.push(cost);if(n>2)assert.ok(cost.gold>report.costs.at(-2).gold);assert.equal(new Set(cost.materials.map(([id])=>id)).size,cost.materials.length);for(const [id,qty] of cost.materials){assert.ok(ITEMS[id]);assert.ok(qty>0);}}
 assert.ok(report.costs[4].gold>report.costs[3].gold*3);assert.ok(report.costs.at(-1).materials.some(([id])=>id==='towerFragment'));
});
test('failed, stale and repeated upgrade transactions cannot consume resources',()=>{
 const p=actor();equip(p,'demonseedScythe');workshopFixture(p);p.gold=0;let q=makeUpgradeQuote(p,'weapon'),before=JSON.stringify(p);assert.equal(commitGearUpgrade(p,q).ok,false);assert.equal(JSON.stringify(p),before);
 p.gold=1000;before=JSON.stringify(p);assert.equal(commitGearUpgrade(p,q).ok,false);assert.equal(JSON.stringify(p),before);
 funds(p);q=makeUpgradeQuote(p,'weapon');const g=p.gold,iron=total(p,'ironScrap');assert.ok(commitGearUpgrade(p,q).ok);assert.equal(p.gold,g-q.cost.gold);assert.equal(total(p,'ironScrap'),iron-q.cost.materials.find(([id])=>id==='ironScrap')[1]);before=JSON.stringify(p);assert.equal(commitGearUpgrade(p,q).ok,false);assert.equal(JSON.stringify(p),before);
 q=makeUpgradeQuote(p,'weapon');equip(p,'oldKnife');before=JSON.stringify(p);assert.equal(commitGearUpgrade(p,q).ok,false);assert.equal(JSON.stringify(p),before);
});
test('retired inventory upgrade handlers cannot bypass the smith, even with service access',()=>{
 const p=actor(),g={uiState:{},log(){}};equip(p,'demonseedScythe');funds(p);const before=p.gold;
 assert.equal(performEquipmentSlotUpgradeAction(p,'weapon',g,()=>{}),false);assert.equal(p.gold,before);assert.equal(getEquipmentTier(p,'weapon'),1);assert.equal(g.uiState.pendingGearUpgrade,undefined);
 assert.equal(performEquipmentSlotUpgradeAction(p,'weapon',g,()=>{}),false);assert.equal(getEquipmentTier(p,'weapon'),1);assert.equal(p.gold,before);
});
test('legacy slot upgrades migrate once, without deleting affixes, ownership or mastery',()=>{
 const old={...sanitizeForSave(actor()),saveVersion:15,equipmentProgressionVersion:undefined,equippedGear:undefined,gearUpgrades:{weapon:7,chest:2},equipment:{weapon:'demonseedScythe',chest:'leatherVest'},inventory:[{id:'oldKnife',qty:2,affixes:[{id:'keen',amount:2}]}]};
 const p=normalizeProfileSave(old);assert.equal(getEquipmentTier(p,'weapon'),8);assert.equal(getEquipmentTier(p,'chest'),3);assert.equal(p.inventory.filter(i=>i.id==='oldKnife').length,2);assert.equal(p.inventory.find(i=>i.id==='oldKnife').affixes[0].id,'keen');
 const reloaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(getEquipmentTier(reloaded,'weapon'),8);assert.equal(reloaded.equippedGear.weapon.instanceId,p.equippedGear.weapon.instanceId);
 const huge=normalizeProfileSave({...old,gearUpgrades:{weapon:999}});assert.equal(getEquipmentTier(huge,'weapon'),20);assert.equal(huge.equippedGear.weapon.legacyUpgradeLevel,999);
});
test('level one tier twenty remains far weaker than level one hundred tier one',()=>{
 const low=actor(),high=actor();equip(low,'demonseedScythe');equip(high,'demonseedScythe');low.equippedGear.weapon.upgradeTier=20;high.combatLevel=100;high.skillState.combat.level=100;for(const entry of Object.values(high.skillState.skills))entry.level=100;
 const a=calculateWeaponDamage(low,ITEMS.demonseedScythe),b=calculateWeaponDamage(high,ITEMS.demonseedScythe);assert.ok(b>a*2.25,`${a} vs ${b}`);report.powerComparison={level1Tier20:a,level100Tier1:b,lowHp:calculateMaxHp(low),highHp:calculateMaxHp(high)};assert.ok(getPower(high)>getPower(low));assert.ok(getArmour(high)>getArmour(low));assert.ok(calculateMaxHp(high)>calculateMaxHp(low));
});

test('Bone Coterie transfers preserve the individual upgraded item and refresh summon ownership',()=>{
 const p=actor('gravecaller');p.gravecaller.path='commander';p.gravecallerPath='commander';equip(p,'demonseedScythe');p.equippedGear.weapon.upgradeTier=12;p.equippedGear.weapon.affixes=[{id:'keen',amount:2}];const id=p.equippedGear.weapon.instanceId;unequipGearEntry(p,'weapon');const g={uiState:{},log(){}};
 const button=action=>({dataset:{coterieAction:action,coterieSkeletonIndex:'0',coterieSlot:'weapon',inventoryItemIndex:String(p.inventory.findIndex(e=>e.instanceId===id))}});
 assert.ok(performCoterieActionButton(p,button('equip'),g));const entry=p.gravecaller.skeletons[0].equippedGear.weapon;assert.equal(entry.instanceId,id);assert.equal(entry.qty,1);assert.equal(entry.upgradeTier,12);assert.ok(!p.inventory.some(e=>e.instanceId===id));
 const loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(loaded.gravecaller.skeletons[0].equippedGear.weapon.instanceId,id);assert.equal(loaded.gravecaller.skeletons[0].equippedGear.weapon.upgradeTier,12);
 p.summons=[{kind:'lich',hp:100,alive:true,coterieEquipment:{weapon:'demonseedScythe'}}];assert.ok(performCoterieActionButton(p,button('unequip'),g));const returned=p.inventory.find(e=>e.instanceId===id);assert.equal(returned.qty,1);assert.equal(returned.upgradeTier,12);assert.equal(returned.affixes[0].id,'keen');assert.equal(p.summons[0].alive,false);assert.ok(p.cooldowns.summonLich>0);
});
test('inventory distinguishes the stats of a fresh copy from an upgraded equipped copy',()=>{
 const p=actor();equip(p,'demonseedScythe');p.equippedGear.weapon.upgradeTier=20;addItem(p,'demonseedScythe');const fresh=p.inventory.findLast(i=>i.id==='demonseedScythe');assert.ok(calculateDisplayWeaponDamage(p,ITEMS.demonseedScythe,p.equippedGear.weapon)>calculateDisplayWeaponDamage(p,ITEMS.demonseedScythe,fresh));
});
test('Demon Summon availability, actual casting, dismissal and mastery survive swapping',()=>{
 const p=actor(),w=world(),t=time();addItem(p,'demonseedScythe');readSkillScroll(p,p.inventory.findIndex(i=>i.id==='summonDemonScroll'));grantAbilityMasteryXp(p,'summonDemon',500);const mastery=JSON.stringify([getAbilityMastery(p,'summonDemon').level,getAbilityMastery(p,'summonDemon').xp]);
 assert.equal(getAbilityAvailability(p,'summonDemon').usable,false);assert.match(getAbilityAvailability(p,'summonDemon').reason,/equipped Demonseed/);p.loadout.abilitySlots[0]='summonDemon';assert.equal(useAbility(0,p,w,()=>{},t,aim),false);
 equipGearEntry(p,p.inventory.findIndex(i=>i.id==='demonseedScythe'));assert.ok(useAbility(0,p,w,()=>{},t,aim));assert.equal(p.summons[0].kind,'miniDemon');unequipGearEntry(p,'weapon');synchronizeEquipmentBoundSkills(p,t+1);assert.equal(p.summons.length,0);assert.equal(p.cooldowns.summonDemon,t+1);assert.equal(p.loadout.abilitySlots[0],'summonDemon');assert.equal(JSON.stringify([getAbilityMastery(p,'summonDemon').level,getAbilityMastery(p,'summonDemon').xp]),mastery);
 equipGearEntry(p,p.inventory.findIndex(i=>i.id==='demonseedScythe'));assert.equal(useAbility(0,p,w,()=>{},t+2,aim),false);updateCombat(p,w,{},1,t+39,()=>{});p.spirit=200;assert.ok(useAbility(0,p,w,()=>{},t+40,aim));
 const loaded=normalizeProfileSave(sanitizeForSave(p));assert.ok(loaded.knownAbilities.includes('summonDemon'));assert.equal(JSON.stringify([getAbilityMastery(loaded,'summonDemon').level,getAbilityMastery(loaded,'summonDemon').xp]),mastery);
});
test('every Mythical set has exactly three real slot pieces and useful partial bonuses',()=>{
 assert.equal(Object.keys(MYTHICAL_ITEMS).length,15);
 for(const [id,def] of Object.entries(MYTHICAL_SETS)){assert.equal(def.pieces.length,3);assert.equal(new Set(def.pieces.map(i=>ITEMS[i].slot)).size,3);for(let n=1;n<=3;n++){const p=actor();set(p,id,n);assert.equal(getMythicalSetCounts(p)[id],n);assert.equal(getActiveSetBonuses(p).filter(b=>b.setId===id).length,n);assert.ok(def.effects[n]);}}
});
test('mixed three-plus-two sets compose deterministically within five slots',()=>{
 const p=actor(),q=actor(),ids=[...MYTHICAL_SETS.drownedConvergence.pieces,'ashenExecutionerWeapon','ashenExecutionerLegs'];for(const id of ids)equip(p,id);for(const id of [...ids].reverse())equip(q,id);assert.deepEqual(getMythicalSetCounts(p),getMythicalSetCounts(q));assert.deepEqual(getEquipmentStatBonuses(p),getEquipmentStatBonuses(q));assert.equal(getMythicalSetCounts(p).drownedConvergence,3);assert.equal(getMythicalSetCounts(p).ashenExecutioner,2);
 const invalid=actor();invalid.equipment={weapon:'drownedConvergenceHelm',helm:'drownedConvergenceHelm',chest:'drownedConvergenceHelm'};assert.equal(getMythicalSetCounts(invalid).drownedConvergence,1);
 const two=actor();for(const id of ['drownedConvergenceHelm','drownedConvergenceChest','beastSovereignLegs','beastSovereignTrinket'])equip(two,id);assert.equal(getMythicalSetCounts(two).drownedConvergence,2);assert.equal(getMythicalSetCounts(two).beastSovereign,2);assert.equal(getActiveSetBonuses(two).filter(b=>b.setId==='drownedConvergence'||b.setId==='beastSovereign').length,4);assert.equal(applyMythicalAbilityModifiers(two,getAbilityById('hydromancerWaterTorrent'))._mythChannel,undefined);
});
test('Drowned Convergence produces real wider held damage and stops on set removal',()=>{
 const p=actor('waverider'),w=world(),t=time();set(p,'drownedConvergence');unlockActiveAbility(p,'hydromancerWaterTorrent');assert.ok(assignAbilityToSlot(p,0,'hydromancerWaterTorrent').ok);w.enemies=[foe('straight',340,320),foe('wide',340,365),foe('outside',340,480)];assert.ok(useAbility(0,p,w,()=>{},t,aim));assert.equal(p.activeChannel.mythicalMode,'torrentSweep');updateCombat(p,w,aim,.05,t+.05,()=>{});assert.ok(w.enemies[0].hp<100000);assert.ok(w.enemies[1].hp<100000);assert.equal(w.enemies[2].hp,100000);assert.ok(w.effects.some(e=>e.profile==='mythicTorrent'));const spirit=p.spirit;updateCombat(p,w,aim,.3,t+.3,()=>{});assert.ok(p.spirit<spirit);unequipGearEntry(p,'helm');updateCombat(p,w,aim,.01,t+.31,()=>{});assert.equal(p.activeChannel,null);
});
test('Blighted Star chains channel hits to real nearby foes with an upkeep tradeoff',()=>{
 const p=actor('eldritch'),w=world(),t=time();set(p,'blightedStar');unlockActiveAbility(p,'eldritchCrimsonConduit');assignAbilityToSlot(p,0,'eldritchCrimsonConduit');w.enemies=[foe('primary',340,320),foe('branch',350,385),foe('far',350,550)];const a=applyMythicalAbilityModifiers(p,getAbilityById('eldritchCrimsonConduit'));assert.ok(a.channelProfile.costPerSecond>getAbilityById(a.id).channelProfile.costPerSecond);assert.ok(useAbility(0,p,w,()=>{},t,aim));updateCombat(p,w,aim,.05,t+.05,()=>{});assert.ok(w.enemies[0].hp<100000);assert.ok(w.enemies[1].hp<100000);assert.equal(w.enemies[2].hp,100000);assert.ok(w.effects.some(e=>e.profile==='conduit'&&e.endX===350));
});

test('Mythical water effects compose with an individually selected skill morph',()=>{
 const p=actor('waverider'),w=world(),t=time();set(p,'drownedConvergence');unlockActiveAbility(p,'hydromancerWaterTorrent');getAbilityMastery(p,'hydromancerWaterTorrent',true).level=20;const option=getAbilityMorphOptions(p,'hydromancerWaterTorrent').find(o=>o.id==='sunken');assert.ok(option);assert.ok(selectAbilityMorph(p,'hydromancerWaterTorrent',option.id,t).ok);assignAbilityToSlot(p,0,'hydromancerWaterTorrent');w.enemies=[foe('primary',340,320)];assert.ok(useAbility(0,p,w,()=>{},t,aim));assert.equal(p.activeChannel.mythicalMode,'torrentSweep');updateCombat(p,w,aim,.05,t+.05,()=>{});assert.ok(w.enemies[0].hp<100000);assert.equal(p.abilityMorphs.hydromancerWaterTorrent,option.id);assert.equal(p.selectedSubclass,undefined);
});
test('Dire Wolf uses distinct art, larger statistics and a bounded third-bite cleave',()=>{
 const p=actor(),w=world(),t=time();set(p,'beastSovereign');unlockActiveAbility(p,'summonWolf');assignAbilityToSlot(p,0,'summonWolf');assert.ok(useAbility('summonWolf',p,w,()=>{},t,aim));const wolf=p.summons[0];assert.equal(wolf.direWolf,true);assert.equal(wolf.artVariant,'sovereignWolf');wolf.x=290;wolf.y=320;w.enemies=[foe('primary'),foe('secondary',310,345)];for(let i=0;i<8;i++){wolf.attackCooldown=0;updateSummons(.05,p,w,()=>{},t+i);}assert.ok(wolf.direBites>=3);assert.ok(w.enemies[1].hp<100000);assert.equal(w.enemies[0].targetSummonId,wolf.id);assert.ok(w.effects.some(e=>e.radius===64));unequipGearEntry(p,'helm');updateSummons(.05,p,w,()=>{},t+5);assert.equal(p.summons.length,0);
});
test('Ashen finisher changes actual LLH reach, cost, recovery and aftershock',()=>{
 const p=actor(),w=world(),t=time();set(p,'ashenExecutioner');const baseline=applyCombinationFinisher({...WEAPON_MOVESETS.sword.moves[0],comboType:'heavy'},'sword','LLH'),move=applyMythicalMeleeModifiers(p,baseline,'sword');assert.equal(move.mythicalAsh,true);assert.equal(move.arcDegrees,180);assert.ok(move.staminaCost>baseline.staminaCost);assert.ok(move.duration>baseline.duration);assert.equal(applyMythicalMeleeModifiers(p,{...baseline,sequence:'LHH'},'sword').mythicalAsh,undefined);
 w.enemies=[foe('primary',320,320),foe('outside',370,345)];ensureCombatState(p);p.combatState.comboSequence='LL';p.combatState.comboTimer=1;assert.ok(requestHeavyAttack(p,w,aim,()=>{},t));assert.equal(p.combatState.attackMove.mythicalAsh,true);for(let i=1;i<=100;i++)updateWeaponCombat(p,w,{},.02,t+i*.02,()=>{});assert.ok(w.effects.some(e=>e.color==='#f49b58'));assert.ok(w.enemies[1].hp<100000);
});
test('Pilgrim Guard protects nearby co-op allies and charges the casting player',()=>{
 const p=actor(),ally=actor(),w=world(),t=time();ally.x=280;ally.y=320;p.coop={players:[ally]};set(p,'pilgrimVigil');unlockActiveAbility(p,'guard');const stamina=p.stamina;assert.ok(useAbility('guard',p,w,()=>{},t,aim));assert.ok(ally.buffs.defense.timer>0);assert.ok(ally.buffs.defense.reduction>0);assert.ok(p.stamina<stamina);assert.ok(w.effects.some(e=>e.radius===120));
});

test('partial Pilgrim bonuses affect real blocking and Guard; full set reduces Dodge cost',()=>{
 const partial=actor(),base=actor();set(partial,'pilgrimVigil',2);ensureActionState(partial).blocking=true;ensureActionState(base).blocking=true;const a=applyDefensiveDamage(partial,100),b=applyDefensiveDamage(base,100);assert.ok(a.staminaDamage<b.staminaDamage);
 const guard=applyMythicalAbilityModifiers(partial,getAbilityById('guard'));assert.equal(guard.damageReduction,.41);unlockActiveAbility(partial,'guard');unlockActiveAbility(base,'guard');assert.ok(useAbility('guard',partial,world(),()=>{},time(),aim));assert.ok(useAbility('guard',base,world(),()=>{},time(),aim));assert.ok(partial.buffs.defense.reduction>base.buffs.defense.reduction);
 const full=actor(),plain=actor();set(full,'pilgrimVigil');full.stamina=plain.stamina=full.maxStamina=plain.maxStamina=500;const before=500;updateStaminaActions(full,{dashPressed:true,moveX:1},.01,time(),()=>{});updateStaminaActions(plain,{dashPressed:true,moveX:1},.01,time(),()=>{});assert.ok(full.actionState.dashing);assert.ok(before-full.stamina<before-plain.stamina);
 assert.match(describeBonusMap({strength:.5,critChance:.06}),/Strength \+0\.5, Crit Chance \+6%/);
});
test('set equipment never grants another class skill or permanent transformations',()=>{
 const p=actor();set(p,'drownedConvergence');p.knownAbilities.push('hydromancerWaterTorrent');assert.equal(getAbilityAvailability(p,'hydromancerWaterTorrent').usable,false);assert.equal(useAbility('hydromancerWaterTorrent',p,world(),()=>{},time(),aim),false);
});
test('regional pools and rare chest rolls retain identity and tier-one rewards',()=>{
 assert.deepEqual(new Set(regionalSetPool({name:'Drowned River King'})),new Set(MYTHICAL_SETS.drownedConvergence.pieces));assert.equal(rollRegionalMythical({kind:'rat'},world(),()=>0),null);const drop=rollRegionalMythical({name:'Briar Titan',isBoss:true},{},()=>0);assert.ok(MYTHICAL_SETS.beastSovereign.pieces.includes(drop.item));assert.equal(drop.upgradeTier,1);assert.equal(filterChestEquipment([['oldKnife',1],['ironScrap',4]],{},()=>.9).length,1);assert.equal(filterChestEquipment([['oldKnife',1],['ironScrap',4]],{questReward:true},()=>.9).length,2);
});
test('world loot has one authoritative payout, player ownership, and tier-one pickup',()=>{
 const p=actor(),ally=actor(),w=world();p.slot=1;p.x=500;ally.slot=2;ally.x=290;p.coop={players:[ally]};const enemy={...foe(),kind:'demonCultist',name:'Last Dawn Cultist',isBoss:true};const old=Math.random;Math.random=()=>0;let drops;try{drops=createEnemyLootDrops(enemy,p,w);assert.equal(createEnemyLootDrops(enemy,p,w).length,0);}finally{Math.random=old;}
 assert.ok(drops.length);assert.ok(drops.every(d=>d.ownerSlot===2));for(const drop of drops){drop.x=ally.x;drop.y=ally.y;if(isTieredEquipment(ITEMS[drop.item]))assert.equal(drop.upgradeTier,1);}updateWorldLootPickups(w,p,.01,()=>{});assert.ok(ally.inventory.some(e=>isTieredEquipment(ITEMS[e.id])&&e.upgradeTier===1));const inventory=JSON.stringify(ally.inventory);updateWorldLootPickups(w,p,.01,()=>{});assert.equal(JSON.stringify(ally.inventory),inventory);
});
test('tower materials and currency support upgrades without double claiming',()=>{
 const p=actor(),g={player:p,world:{floor:20,infiniteDungeonRegionId:'ascensionWastes',name:'Ascension Tower'},log(){}},chest={claimed:false,locked:false};const gold=p.gold;assert.ok(claimTowerReward(g,chest));assert.equal(p.gold,gold+78);assert.ok(total(p,'arcaneDust')>=4);assert.ok(total(p,'towerFragment')>=1);assert.equal(claimTowerReward(g,chest),false);assert.equal(p.gold,gold+78);
});

let seed=0x2072026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('seeded large-sample loot confirms rare equipment and rarer exceptional gear',()=>{
 const previous=Math.random;Math.random=random;
 try{for(const rank of ['ordinary','elite','boss']){const metrics={kills:50000,gear:0,legendary:0,mythical:0,materials:0,factionGear:0};for(let i=0;i<metrics.kills;i++){const e={kind:'demonCultist',name:'Last Dawn Cultist',id:'drop'+i,...(rank==='boss'?{isBoss:true,bossType:'redSealExecutioner'}:rank==='elite'?{eliteModifier:'armoured'}:{})};const drops=rollEnemyLoot(e);const unique=rollLegendaryBossDrop(e,random);if(unique)drops.push(unique);const myth=rollRegionalMythical(e,{},random);if(myth)drops.push(myth);const collectible=rollEnemyCollectible(e,{},random);if(collectible){drops.push(collectible);if(isTieredEquipment(ITEMS[collectible.item]))metrics.factionGear++;}if(drops.some(d=>isTieredEquipment(ITEMS[d.item])))metrics.gear++;if(drops.some(d=>isTieredEquipment(ITEMS[d.item])&&ITEMS[d.item]?.rarity==='legendary'))metrics.legendary++;if(drops.some(d=>isTieredEquipment(ITEMS[d.item])&&ITEMS[d.item]?.rarity==='mythic'))metrics.mythical++;if(drops.some(d=>!isTieredEquipment(ITEMS[d.item])))metrics.materials++;}report.loot[rank]=metrics;}
 }finally{Math.random=previous;}
 console.log('Loot sampling',JSON.stringify(report.loot));assert.ok(report.loot.ordinary.gear/50000<.035);assert.ok(report.loot.ordinary.factionGear/50000<.005);assert.ok(report.loot.boss.legendary/50000<.05);assert.ok(report.loot.boss.mythical/50000<.025);assert.ok(report.loot.boss.gear>report.loot.ordinary.gear);assert.ok(report.loot.ordinary.materials>report.loot.ordinary.gear*5);
});
fs.mkdirSync('docs/loot-overhaul',{recursive:true});fs.writeFileSync('docs/loot-overhaul/model-verification.json',JSON.stringify(report,null,2));console.log(`Passed ${report.checks.length} loot checks.`,JSON.stringify(report.loot));
