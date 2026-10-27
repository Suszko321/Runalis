import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS} from '../src/data.js';
import {ENEMY_KINDS,ENEMY_MODEL_PROFILES,getEnemyVisualProfile} from '../src/enemyVisualProfiles.js';
import {ENEMY_OUTFIT_SETS,ENEMY_EQUIPMENT_ITEMS} from '../src/enemyEquipmentData.js';
import {isHumanoidEnemy,ensureHumanoidEnemyEquipment,getHumanoidEnemyActor,getEnemyNameplate,migrateLastDawnDisplayText} from '../src/humanoidEnemies.js';
import {getEnemyCollectiblePool,rollEnemyCollectible,ENEMY_EQUIPMENT_LOOT_CONFIG} from '../src/enemyEquipmentLoot.js';
import {createEnemyLootDrops,updateWorldLootPickups} from '../src/lootSystem.js';
import {createPlayer,chooseClass,countItem} from '../src/player.js';
import {hostilePatrolPool,HOSTILE_TEMPLATES} from '../src/overworldEncounterSystem.js';
import {resolveVisualDefinition} from '../src/modelRegistry.js';
const before=JSON.parse(fs.readFileSync('docs/enemy-visual-overhaul/roster-before.json'));
const after=JSON.parse(fs.readFileSync('docs/enemy-visual-overhaul/roster-after.json'));
assert.equal(after.records.length,before.records.length);
const originals=new Map(before.records.map(r=>[r.world+'|'+r.id,r]));
for(const row of after.records){const old=originals.get(row.world+'|'+row.id);assert(old,`Changed enemy ID: ${row.id}`);assert.equal(old.kind,row.kind);assert.deepEqual(row.stats,old.stats,`Combat changed: ${row.id}`);assert.notEqual(row.profile.family,'unsupported');assert(!/\bhollow(?:ling|lings|ed)?\b/i.test(row.name),row.name);}
assert.deepEqual([...new Set(after.records.map(r=>r.kind))].sort(),[...ENEMY_KINDS].sort());
for(const kind of ['hollowling','gravebound','gravePriest','brute','wraith','veyrWraith','exploder','ashWolf','stalkerWolf','basicBeast']){
 const e={kind,id:'legacy-'+kind,name:kind,bodyModel:'human',humanoid:true,raceId:'human',humanEquipmentVersion:1,equipment:{chest:'graveboundChest'},hp:83,maxHp:100,damage:7,speed:48};
 ensureHumanoidEnemyEquipment(e);assert(!isHumanoidEnemy(e),kind);assert.notEqual(e.bodyModel,'human');assert.equal(e.hp,83);assert.equal(e.damage,7);assert.equal(e.speed,48);assert(!e.equipment);
}
for(const kind of ['roadlessBandit','archer','cultist','demonCultist','shieldKnight']){
 const e={kind,id:'human-'+kind,name:'Last Dawn '+kind,hp:100,damage:7,x:100,y:100};ensureHumanoidEnemyEquipment(e);assert(isHumanoidEnemy(e));
 const equipment=JSON.stringify(e.equipment);ensureHumanoidEnemyEquipment(e);assert.equal(JSON.stringify(e.equipment),equipment);
 assert.equal(e.hp,100);assert.equal(e.damage,7);assert.equal(Object.keys(e.equipment).length,5);
 for(const [slot,id] of Object.entries(e.equipment)){assert.equal(ITEMS[id].slot,slot);assert(ITEMS[id].enemyCollectible);}
 if(kind==='archer')assert.equal(ITEMS[e.equipment.weapon].weaponType,'bow');
 if(kind.includes('ultist')){assert.equal(ITEMS[e.equipment.weapon].weaponType,'staff');e.telegraph={x:150,y:100,time:.2,maxTime:.6};assert.equal(getHumanoidEnemyActor(e,1).visualAction.kind,'cast');}
}
for(const [name,faction] of [['Last Dawn Sentinel','lastDawn'],['Covenant Guard','covenant'],['Ember Veil Acolyte','emberVeil'],['Veyr Wall Watcher','veyr'],['Road Ambusher','roadless'],['Pilgrim Shield Knight','covenant']])assert.equal(getEnemyVisualProfile({kind:'shieldKnight',name}).faction,faction);
for(const bossType of ['veyrWarden','hollowElk','demonLord','seraphel','zephyrLight','redSealExecutioner','graveMawBear','briarTitan']){
 const boss={isBoss:true,kind:'brute',bossType,name:bossType,bodyModel:'human'};assert(!isHumanoidEnemy(boss));assert.equal(getEnemyVisualProfile(boss).family,'boss');assert(resolveVisualDefinition(boss,'enemies'));assert.deepEqual(getEnemyCollectiblePool(boss),[]);assert.equal(getEnemyNameplate(boss).rank,'boss');
}
for(const p of Object.values(ENEMY_MODEL_PROFILES))if(p.atlas){assert(fs.existsSync(`assets/art/sprites/${p.atlas}.png`));const m=JSON.parse(fs.readFileSync(`assets/art/sprites/${p.atlas}.json`));assert(p.row<m.rows);assert.equal(p.cellWidth,m.cellWidth);assert.equal(p.cellHeight,m.cellHeight);}
for(const [faction,set] of Object.entries(ENEMY_OUTFIT_SETS))for(const id of Object.values(set)){assert(ITEMS[id]);assert.equal(ITEMS[id].visualFactionId,faction);assert(['weapon','helm','chest','legs','trinket'].includes(ITEMS[id].slot));assert.notEqual(ITEMS[id].rarity,'legendary');}
assert.equal(getEnemyNameplate({kind:'gravebound',name:'Grave Guard',elite:true,level:17}).rank,'elite');
assert.equal(getEnemyNameplate({kind:'gravebound',name:'Grave Guard',elite:true,level:17}).text,'◆ Grave Guard · Lv 17');
const saved={id:'oldHollowGatekeeper',kind:'hollowling',name:'Hollowling',equipment:{},quests:{first:{enemyKind:'hollowling',itemId:'hollowEye',title:'The Hollow Road',objectives:[{label:'Defeat Hollowlings'}]}}};
migrateLastDawnDisplayText(saved);assert.equal(saved.name,'Blighted Corpse');assert.equal(saved.id,'oldHollowGatekeeper');assert.equal(saved.kind,'hollowling');assert.equal(saved.quests.first.enemyKind,'hollowling');assert.equal(saved.quests.first.itemId,'hollowEye');assert.equal(saved.quests.first.objectives[0].label,'Defeat Blighted Corpses');
const legacy={kind:'demonCultist',name:'Last Dawn Scholar',humanEquipmentVersion:1,equipment:{weapon:'redSealScythe',chest:'missing'}};ensureHumanoidEnemyEquipment(legacy);assert.equal(legacy.equipment.weapon,'redSealScythe');assert.equal(legacy.equipment.chest,undefined);
const e={kind:'roadlessBandit',id:'loot-human',name:'Roadless Raider',x:210,y:200};ensureHumanoidEnemyEquipment(e);
assert.equal(ENEMY_EQUIPMENT_LOOT_CONFIG.chance,.003);
assert.equal(rollEnemyCollectible({...e},{},()=>.031),null);
const one={...e};const selected=rollEnemyCollectible(one,{},()=>0);assert(Object.values(e.equipment).includes(selected.item));assert.equal(rollEnemyCollectible(one,{},()=>0),null);
assert.equal(rollEnemyCollectible({...e},{enemyEquipmentLootConfig:{chance:0}},()=>0),null);
assert(rollEnemyCollectible({...e},{enemyEquipmentLootConfig:{chance:1}},()=>.5));
let seed=67345,hits=0;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let n=0;n<100000;n++){const result=rollEnemyCollectible({...e},{},rand);if(result){hits++;assert(Object.values(e.equipment).includes(result.item));}}
assert(hits>250&&hits<350,'0.3-percent independent kill sampling');
for(const kind of ['brute','ashWolf','basicBeast','hollowling','wraith','gravebound']){const pool=getEnemyCollectiblePool({kind});assert(pool.length);assert(pool.every(drop=>!ITEMS[drop.item].slot),kind+' wore human equipment');}
const owner=createPlayer('Loot reviewer');chooseClass(owner,'gravecaller');Object.assign(owner,{x:200,y:200,slot:2});
const world={mode:'dungeon',width:20,height:20,tiles:Array.from({length:20},()=>Array.from({length:20},()=>({biome:'grass',passable:true}))),enemies:[e],drops:[],objects:[]};
const random=Math.random;Math.random=()=>0;let drops;try{drops=createEnemyLootDrops(e,owner,world);}finally{Math.random=random;}
assert.equal(drops.filter(d=>ITEMS[d.itemId]?.enemyCollectible).length,1);assert(drops.some(d=>!ITEMS[d.itemId]?.enemyCollectible),'Ordinary loot retained');assert(drops.every(d=>d.ownerSlot===2));assert.deepEqual(createEnemyLootDrops(e,owner,world),[]);
for(const drop of drops){drop.x=owner.x;drop.y=owner.y;}updateWorldLootPickups(world,owner,.01,()=>{});assert.equal(world.drops.length,0);assert(countItem(owner,drops.find(d=>ITEMS[d.itemId]?.enemyCollectible).itemId)>=1);
for(const ecology of ['woodland','burial','marsh','redseal','orchard','river','highland'])for(const tier of [1,2,4,8]){
 const pool=hostilePatrolPool(ecology,tier);assert(pool.length);if(['burial','marsh'].includes(ecology))assert(pool.every(t=>t.id==='grave-road'));if(ecology==='redseal')assert(pool.every(t=>t.id==='red-seal-scouts'));
}
assert(HOSTILE_TEMPLATES.find(t=>t.id==='red-seal-scouts').members.some(([,n])=>n.includes('Bound Convert')));
const moving={kind:'roadlessBandit',x:100,y:100};assert(!getHumanoidEnemyActor(moving,1).isMoving);moving.x+=4;assert(getHumanoidEnemyActor(moving,1.1).isMoving);assert(!getHumanoidEnemyActor(moving,2).isMoving);
assert.equal(getHumanoidEnemyActor({...moving,reviewAnimation:'walk',dirX:-1,dirY:0},3).dirX,-1);
const report={pass:true,worlds:after.worlds.length,enemyRecords:after.records.length,identities:new Set(after.records.map(r=>r.name)).size,archetypes:ENEMY_KINDS.length,simulationChanges:0,equipmentItems:Object.keys(ENEMY_EQUIPMENT_ITEMS).length,factionSets:Object.keys(ENEMY_OUTFIT_SETS).length,eligibleKillSample:100000,collectibleDrops:hits,observedChance:hits/100000};
fs.writeFileSync('docs/enemy-visual-overhaul/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
