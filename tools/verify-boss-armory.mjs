import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {BOSS_ARMORY_ITEMS,BOSS_ARMORY_POOLS,BOSS_ARMORY_DROP_CHANCE,bossArmoryPool,rollBossArmoryLoot} from '../src/bossArmoryData.js';
import {FOCUS_PROJECTILE_STYLES} from '../src/focusProjectileData.js';
import {createPlayer,chooseClass,addItem,migratePlayer} from '../src/player.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility} from '../src/combat.js';
import {getPetalStorm} from '../src/petalStormSustain.js';
import {equipGearEntry} from '../src/equipmentProgressionSystem.js';
import {calculateWeaponDamage,requestBasicAttack,requestHeavyAttack,updateWeaponCombat,getProjectiles} from '../src/combatMoves.js';
import {createEnemyLootDrops,updateWorldLootPickups} from '../src/lootSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
const now=performance.now()/1000+30,aim={combatAimX:1,combatAimY:0,hasAim:true};
const world=()=>({mode:'dungeon',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const actor=(classId='classless',slot=1)=>{const p=createPlayer('Armory '+classId);chooseClass(p,classId);Object.assign(p,{id:'armory-'+slot,slot,x:260,y:320,dirX:1,dirY:0,maxStamina:1000,stamina:1000,maxSpirit:1000,spirit:1000,hp:500,maxHp:500});return p;};
const equip=(p,id)=>{addItem(p,id,1);assert(equipGearEntry(p,p.inventory.findLastIndex(e=>e.id===id)));};
const bosses=[{isBoss:true,bossId:'motherOfBriars',groveMother:true},{isBoss:true,bossId:'alistairVeyreign',veyreignLord:true},{isBoss:true,bossId:'malakarSolgateDemonLord',bossType:'demonLord'},{isBoss:true,bossId:'seraphelTheUncrowned',bossType:'seraphel'}];
for(const [i,boss]of bosses.entries()){
 const key=['grove','veyreign','malakar','seraphel'][i];assert.equal(bossArmoryPool(boss),key);
 for(const selection of [0,.999]){let n=0;const drop=rollBossArmoryLoot(boss,()=>n++?selection:BOSS_ARMORY_DROP_CHANCE-.0001);assert.equal(drop.item,BOSS_ARMORY_POOLS[key][selection?1:0]);assert.equal(drop.upgradeTier,1);}
 assert.equal(rollBossArmoryLoot(boss,()=>BOSS_ARMORY_DROP_CHANCE),null);
 for(const blocked of [{isBoss:false,worldBoss:false},{rewardSuppressed:true},{summonedBy:'boss'},{summonedByBoss:true}])assert.equal(rollBossArmoryLoot({...boss,...blocked},()=>0),null);
}
assert.equal(rollBossArmoryLoot({isBoss:true,id:'unrelatedBoss'},()=>0),null);
// Balanced draw of the roll interval proves pool probabilities without flaky RNG.
const counts={};for(let i=0;i<10000;i++){let n=0;const drop=rollBossArmoryLoot(bosses[0],()=>n++?i%2?0:.999:(i+.5)/10000);if(drop)counts[drop.item]=(counts[drop.item]||0)+1;}assert.deepEqual(counts,{roseboundCodex:800,roseReaper:800});
console.log('PASS four real boss identities, 16% pool / 8% each, roll boundaries and reward/summon exclusions');
let combinations=0;
for(const classId of ['classless','oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch'])for(const id of Object.keys(BOSS_ARMORY_ITEMS)){
 const p=actor(classId),known=[...p.knownAbilities];equip(p,id);assert.equal(p.equipment.weapon,id);assert(calculateWeaponDamage(p,ITEMS[id])>0);assert.deepEqual(p.knownAbilities,known);
 const w=world(),target={id:'dummy',name:'Dummy',kind:'rat',hp:10000,maxHp:10000,x:290,y:311,r:12,radius:12,level:1,xp:1,aggro:3};w.enemies.push(target);
 assert(requestBasicAttack(p,w,aim,()=>{},now));for(let i=1;i<=100;i++)updateWeaponCombat(p,w,aim,.016,now+i*.016,()=>{});assert(target.hp<10000,`${classId}/${id} cannot hit`);
 const loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(loaded.equipment.weapon,id);assert.equal(loaded.equippedGear.weapon.id,id);combinations++;
}
console.log('PASS '+combinations+' class/item combinations equip, attack, damage and save with no class lock or starter changes');
{
 const p=actor('thornbinder');for(const skill of Object.values(p.skillState.skills))skill.level=33;migratePlayer(p);Object.assign(p,{spiritAwakened:true,spirit:1000,maxSpirit:1000,stamina:1000,maxStamina:1000});equip(p,'roseReaper');
 const id='thornbinderThornstorm';unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,'petalknight').ok);assert(assignAbilityToSlot(p,0,id).ok);
 assert(useAbility(0,p,world(),()=>{},now,aim));assert(getPetalStorm(p));assert.equal(p.equipment.weapon,'roseReaper');
}
console.log('PASS Petalknight casts its real Petal Storm while wielding Rose Reaper');
const focuses=Object.values(ITEMS).filter(i=>i.weaponType==='spiritFocus');assert.equal(focuses.length,15);assert.equal(new Set(focuses.map(i=>FOCUS_PROJECTILE_STYLES[i.id]?.index)).size,15);assert(focuses.every(i=>FOCUS_PROJECTILE_STYLES[i.id]));
for(let slot=1;slot<=4;slot++)for(const item of focuses)for(const heavy of [false,true]){
 const p=actor('thornbinder',slot),w=world();equip(p,item.id);assert((heavy?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},now));
 // Equipment may change after windup; the committed shot retains its identity.
 equip(p,item.id==='crackedDawnlens'?'pilgrimsFocus':'crackedDawnlens');let shot;
 for(let i=1;i<90&&!shot;i++){updateWeaponCombat(p,w,aim,.016,now+i*.016,()=>{});shot=getProjectiles(p).find(s=>s.focusItemId);}
 assert(shot,item.id);assert.equal(shot.focusItemId,item.id);assert.equal(shot.color,FOCUS_PROJECTILE_STYLES[item.id].color);assert(shot.speed>0&&shot.range>0);if(heavy)assert.equal(shot.kind,'focusLance');
}
console.log('PASS all 15 focus identities, light/heavy shots, four slots and equipment changes during windup');
const random=Math.random;try{
 Math.random=()=>.001;for(const seed of bosses){const p=actor(),w=world(),boss={...seed,x:260,y:320,kind:'basicBeast',name:'Boss',hp:0,maxHp:500,level:30};const drops=createEnemyLootDrops(boss,p,w);assert.equal(drops.filter(d=>BOSS_ARMORY_ITEMS[d.itemId]).length,1);const id=drops.find(d=>BOSS_ARMORY_ITEMS[d.itemId]).itemId;assert.deepEqual(createEnemyLootDrops(boss,p,w),[]);for(const d of w.drops){d.x=p.x;d.y=p.y;}updateWorldLootPickups(w,p,.01,()=>{});assert(p.inventory.some(e=>e.id===id));}
}finally{Math.random=random;}
console.log('PASS actual boss death drops, exactly-once generation, world pickup and inventory acquisition');
