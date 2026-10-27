import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleWeaponStance,canSheatheWeapon,hasHostileTarget} from '../src/weaponStance.js';
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
 if(['sword','dagger','axe','mace','hammer','spear','staff','scythe'].includes(type)){
  assert.equal(canSheatheWeapon({equipment:{weapon:id}}),true,id);covered++;
 }else assert.equal(canSheatheWeapon({equipment:{weapon:id}}),false,id);
}
const report={coveredWeapons:covered,sixSecondDelay:'passed',attackAndCharge:'passed',enemyTargeting:'passed',cooperativeIsolation:'passed',inputsUnchanged:'passed'};
fs.writeFileSync(new URL('../docs/visual-production/weapon-stance-checks.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
