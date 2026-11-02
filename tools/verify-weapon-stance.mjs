import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleWeaponStance,sampleCombatReadiness,canSheatheWeapon,hasHostileTarget,WEAPON_READY_SECONDS} from '../src/weaponStance.js';
import {ITEMS} from '../src/data.js';
import {getGearVisualProfile} from '../src/gearVisualStyle.js';
const player={id:'hero',equipment:{weapon:'noviceBlade'},combatState:{attackId:0,attacking:false}},world={enemies:[]};
const sample=t=>sampleWeaponStance(player,world,t).sheathed;
assert.equal(sample(0),true);
player.combatState.attacking=true;player.combatState.attackId++;
assert.equal(sample(1),false);assert.equal(sample(1.3),false);
player.combatState.attacking=false;
assert.equal(sample(7.29),false);assert.equal(sample(7.31),true);
// An attack completed between render frames still draws the weapon.
player.combatState.attackId++;assert.equal(sample(8),false);assert.equal(sample(14.01),true);
const enemy={hp:10,combatTargetId:'hero',combatTargetKind:'player'};world.enemies.push(enemy);
assert.equal(sample(20),false);assert.equal(sample(120),false);
enemy.hp=0;assert.equal(sample(125.99),false);assert.equal(sample(126.01),true);
enemy.hp=10;enemy.combatTargetId='other';assert.equal(sample(130),true);
enemy.combatTargetId='hero';enemy.returningHome=true;assert.equal(sample(131),true);
enemy.returningHome=false;world.safeZone=true;assert.equal(sample(132),true);
world.safeZone=false;enemy.combatTargetKind='summon';assert.equal(hasHostileTarget(player,world),false);
enemy.combatTargetKind='player';enemy.combatTargetId=null;assert.equal(sample(133),true);
player.combatState.heavyChargeActive=true;assert.equal(sample(140),false);
player.combatState.heavyChargeActive=false;assert.equal(sample(146.01),true);
player.visualAction={startedAt:150,duration:.5};assert.equal(sample(150.2),false);assert.equal(sample(156.21),true);
const before=JSON.stringify({player,world});sample(200);assert.equal(JSON.stringify({player,world}),before);
const ally={...player,id:'ally',combatState:{}};assert.equal(sampleWeaponStance(ally,world,201).sheathed,true);
let covered=0;
for(const [id,item] of Object.entries(ITEMS))if(item.slot==='weapon'){
 const type=getGearVisualProfile(id,item).weaponType;
 if(['sword','dagger','axe','mace','hammer','spear','staff','scythe','spiritFocus'].includes(type)){
  assert.equal(canSheatheWeapon({equipment:{weapon:id}}),true,id);covered++;
 }else assert.equal(canSheatheWeapon({equipment:{weapon:id}}),false,id);
}
let focusCases=0;
for(const item of Object.values(ITEMS).filter(i=>i.weaponType==='spiritFocus'))for(let slot=1;slot<=4;slot++){
 const p={id:'focus-P'+slot,slot,equipment:{weapon:item.id},combatState:{attackId:0}},w={enemies:[]},stance=t=>sampleWeaponStance(p,w,t).sheathed;
 assert(stance(0));p.combatState.attacking=true;p.combatState.attackId++;assert(!stance(1));assert(!stance(1.4));p.combatState.attacking=false;
 assert(!stance(1.4+WEAPON_READY_SECONDS-.001));assert(stance(1.4+WEAPON_READY_SECONDS+.001));
 // Completed attacks, charges, casts and guards all refresh the same timer.
 p.combatState.attackId++;assert(!stance(10));assert(stance(16.001));
 p.combatState.heavyChargeActive=true;assert(!stance(20));p.combatState.heavyChargeActive=false;assert(!stance(25.999));assert(stance(26.001));
 p.visualAction={startedAt:30,duration:.7};assert(!stance(30.5));p.visualAction=null;assert(!stance(36.499));assert(stance(36.501));
 p.actionState={blocking:true};assert(!stance(40));p.actionState.blocking=false;assert(stance(46.001));
 const foe={hp:10,alive:true,combatTargetKind:'player',combatTargetId:p.id};w.enemies=[foe];assert(!stance(50));assert(!stance(500));
 foe.hp=0;assert(!stance(505.999));assert(stance(506.001));foe.hp=10;foe.combatTargetId='other-player';assert(stance(510));foe.combatTargetId=p.id;foe.returningHome=true;assert(stance(511));foe.returningHome=false;w.safeZone=true;assert(stance(512));
 const before=JSON.stringify({p,w});stance(600);assert.equal(JSON.stringify({p,w}),before);focusCases++;
}
console.log('PASS '+focusCases+' grimoire/focus timelines across all four owners: six-second boundaries, continuous threats, casts/charges/guards, co-op target isolation and safe-zone/home-return exclusions');
const report={coveredWeapons:covered,sixSecondDelay:'passed',attackAndCharge:'passed',enemyTargeting:'passed',cooperativeIsolation:'passed',inputsUnchanged:'passed'};
for(const slot of [1,2,3,4])for(const weapon of [null,...Object.values(ITEMS).filter(i=>i.weaponType==='bow').map(i=>i.id),'noviceBlade']){
 const p={id:'indicator-'+slot,slot,equipment:{weapon},combatState:{attackId:0}},w={enemies:[]},ready=t=>sampleCombatReadiness(p,w,t).ready;
 assert(!ready(0));p.combatState.attacking=true;assert(ready(1));p.combatState.attacking=false;assert(ready(6.999));assert(!ready(7.001));
 p.combatState.attackId++;assert(ready(8));assert(!ready(14.001));w.enemies=[{hp:10,combatTargetKind:'player',combatTargetId:p.id}];assert(ready(20));assert(ready(100));w.enemies[0].hp=0;assert(ready(105.999));assert(!ready(106.001));
 if(!canSheatheWeapon(p))assert.equal(sampleWeaponStance(p,w,110).sheathed,false,'Bow/unarmed presentation preserved');
}
console.log('PASS ground indicator readiness for all four owners: idle, attacks, six-second recovery and sustained aggro, including bows/unarmed');
fs.writeFileSync(new URL('../docs/visual-production/weapon-stance-checks.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
