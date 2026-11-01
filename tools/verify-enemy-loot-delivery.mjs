import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {createPlayer,chooseClass,addItem,countItem} from '../src/player.js';
import {rollUniversalGear,randomGearPool} from '../src/gearItemization.js';
import {isGear} from '../src/gearRarity.js';
import {dungeonLootTier,enemyGearWeights,rollEnemyGearRarity} from '../src/dungeonLootPolicy.js';
import {createEnemyLootDrops,updateWorldLootPickups} from '../src/lootSystem.js';
import {groundLootStyle} from '../src/groundLootArt.js';
import {recordLootCollection} from '../src/lootCollectionFeed.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {workshopFixture} from './workshop-fixtures.mjs';
const actor=slot=>{const p=createPlayer('Loot P'+slot);chooseClass(p,'classless');Object.assign(p,{slot,playerNumber:slot,x:300+slot*150,y:300,inventory:[],gold:0,combatLevel:100});return p;};
for(const [id,expected]of [['hollowRootCellar','common'],['ashenOrchard','common'],['mirrorGrove','rare'],['ironMireDungeon','rare'],['redSealKeep','rare'],['demonCultLair','legendary'],['dawnspireRoot','legendary'],['castleVeyr','legendary'],['shatteredChoir','rare']]){
 const world={mode:'dungeon',dungeonId:id};assert.equal(dungeonLootTier(world),expected);
 for(const boss of [false,true]){
  const enemy={isBoss:boss},counts={};
  for(let i=0;i<10000;i++){const grade=rollEnemyGearRarity(100,enemy,world,()=>(i+.5)/10000);counts[grade]=(counts[grade]||0)+1;}
  assert.deepEqual(counts,Object.fromEntries(Object.entries(enemyGearWeights(100,enemy,world)).map(([k,v])=>[k,v*100])));
  if(expected==='common')assert.deepEqual(counts,{common:10000});
  if(expected==='rare')assert(!counts.legendary&&!counts.mythic&&!counts.primordial);
 }
}
assert.equal(dungeonLootTier({mode:'overworld',poiId:'castleVeyr'}),null);
console.log('PASS exact geographic rarity distributions: early common-only, later white/green/blue, both Malakar IDs and Veyreign legendary');
const owner=actor(1),late={mode:'dungeon',dungeonId:'castleVeyr'};let legendary=0;
for(let i=0;i<10000;i++){let n=0;const gear=rollUniversalGear({isBoss:true},owner,()=>[.999,.5,(i+.5)/10000][n++],late);assert(gear);if(gear.gearRarity==='legendary')legendary++;}
assert.equal(legendary,4000);
for(const enemy of [{isBoss:true,rewardSuppressed:true},{isBoss:true,summonedBy:'boss'},{isBoss:true,summonedByBoss:true}])assert.equal(rollUniversalGear(enemy,owner,()=>0,late),null);
for(let i=0;i<randomGearPool().length;i++){let n=0;assert.equal(rollUniversalGear({},owner,()=>[0,(i+.5)/randomGearPool().length,0][n++],{mode:'dungeon',dungeonId:'hollowRootCellar'}).item,randomGearPool()[i].id);}
console.log('PASS final bosses guarantee one gear roll, exactly40% legendary per kill; suppression intact; all base gear remains reachable');
const party=[1,2,3,4].map(actor);party[0].coop={players:party.slice(1)};
for(const p of party){
 for(let i=0;i<20;i++)assert(addItem(p,'blackIronSword'));
 const world=workshopFixture(p).world;Object.assign(world,late);const enemy={kind:'archer',isBoss:true,combatLevel:30,x:p.x,y:p.y};
 const old=Math.random;let drops;try{Math.random=()=>0;drops=createEnemyLootDrops(enemy,party[0],world);}finally{Math.random=old;}
 assert(p.gold>0);assert(countItem(p,'banditToken')>0);assert(countItem(p,'blackironOre')>0);
 assert(drops.some(d=>ITEMS[d.itemId].learnsAbility));assert(drops.every(d=>isGear(ITEMS[d.itemId])||ITEMS[d.itemId].learnsAbility));assert(drops.every(d=>d.ownerSlot===p.slot));
 const before=JSON.stringify({inventory:p.inventory,gold:p.gold});assert.deepEqual(createEnemyLootDrops(enemy,party[0],world),[]);assert.equal(JSON.stringify({inventory:p.inventory,gold:p.gold}),before);
 updateWorldLootPickups(world,party[0],1);assert(world.drops.some(d=>isGear(ITEMS[d.itemId])),'Full bag must leave physical gear');
 p.inventory.splice(0,1);for(const drop of world.drops){drop.x=p.x;drop.y=p.y;}updateWorldLootPickups(world,party[0],1);assert(!world.drops.length);
 const legacy={itemId:'ironScrap',qty:3,ownerSlot:p.slot,x:0,y:0,age:0};world.drops=[legacy];const scrap=countItem(p,'ironScrap');updateWorldLootPickups(world,party[0],.1);assert.equal(countItem(p,'ironScrap'),scrap+3);assert.equal(world.drops.length,0);
 assert.deepEqual(sanitizeForSave(p).lootCollections,[]);
 assert.deepEqual(normalizeProfileSave(p).lootCollections,[]);
}
console.log('PASS all four recipients: immediate gold/material/quest-token credit even with full bags, physical scrolls/gear, exactly once, overflow recovery and old-save material sweep');
const feed=actor(1);recordLootCollection(feed,'ironScrap','Iron Scrap',2,1000);recordLootCollection(feed,'ironScrap','Iron Scrap',3,1100);assert.equal(feed.lootCollections[0].quantity,5);
for(let i=0;i<20;i++)recordLootCollection(feed,String(i),'Material',1,1200+i);assert.equal(feed.lootCollections.length,5);recordLootCollection(feed,'new','New',1,10000);assert.equal(feed.lootCollections.length,1);
for(const rarity of ['common','uncommon','rare','legendary','mythic','primordial']){const a=groundLootStyle({itemId:'blackIronSword',rarity,age:.4});assert.equal(a.exalted,['legendary','mythic','primordial'].includes(rarity));assert.equal(a.lift,a.exalted?46:0);assert.equal(groundLootStyle({itemId:'blackIronSword',rarity,age:1}).lift,0);}
const p=actor(1),world=workshopFixture(p).world;world.drops=[{itemId:'blackIronSword',rarity:'legendary',gearRarity:'legendary',rarityRollVersion:1,itemLevel:100,qty:1,x:p.x,y:p.y,age:0,ownerSlot:1}];updateWorldLootPickups(world,p,.4);assert.equal(world.drops.length,1);updateWorldLootPickups(world,p,.4);assert.equal(world.drops.length,0);
console.log('PASS bounded aggregating/fading collection feed; rarity glow/launch contracts and launch-before-pickup timing');
