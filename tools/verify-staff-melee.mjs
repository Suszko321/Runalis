import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';import {createPlayer} from '../src/player.js';
import {requestBasicAttack,requestHeavyAttack,updateWeaponCombat,getWeaponTypeFromPlayer} from '../src/combatMoves.js';
import {sampleWeaponAttackPose} from '../src/playerAttackAnimation.js';import {sampleMeleeRig} from '../src/meleeRig.js';
let samples=0;
const staves=Object.keys(ITEMS).filter(id=>ITEMS[id].slot==='weapon'&&ITEMS[id].weaponType==='staff');assert(staves.includes('rootStaff'));
for(const id of staves)for(const [facing,dx,dy] of [['down',0,1],['right',1,0],['up',0,-1],['left',-1,0]]){
 const player=createPlayer('Staff test');Object.assign(player,{classId:'thornbinder',x:500,y:500,dirX:dx,dirY:dy});player.equipment.weapon=id;
 assert.equal(getWeaponTypeFromPlayer(player),'staff');
 const enemy=(id,x,y)=>({id,kind:'basicBeast',x,y,hp:1000,maxHp:1000,r:4,radius:4,defence:0,speed:0});
 const world={effects:[],combatEffects:[],drops:[],enemies:[enemy('flank',500+dx*35-dy*28,500+dy*35+dx*28),enemy('behind',500-dx*40,500-dy*40),enemy('far',500+dx*100,500+dy*100)]};
 const aim={combatAimX:dx,combatAimY:dy};assert(requestBasicAttack(player,world,aim,()=>{},0));const move=player.combatState.attackMove;
 assert.equal(move.kind,'arc');assert.equal(move.name,'Staff Swing');assert(move.arcDegrees>=90);
 for(let i=0;i<=30;i++){
  const pose={...sampleWeaponAttackPose(move,'staff',move.duration*i/30,{x:dx,y:dy},'thornbinder'),weaponType:'staff',state:'attack',attacking:true};
  assert.equal(pose.family,'slash');assert(sampleMeleeRig(pose,facing).twoHanded);
 }
 const hit=new Set();for(let i=0;i<35;i++){updateWeaponCombat(player,world,aim,.016,i*.016,()=>{});for(const id of player.combatState.hitEnemyIds)hit.add(id);}
 assert(world.enemies[0].hp<1000,'Sweep must hit in front and to the side');assert(!hit.has('behind'),'Melee arc must exclude rear target');assert(!hit.has('far'),'Melee arc must exclude distant target');assert(!player.combatState.attacking);
 player.stamina=player.maxStamina;assert(requestHeavyAttack(player,world,aim,()=>{},1));assert.equal(player.combatState.attackMove.kind,'arc');samples++;
}
console.log(`PASS: ${samples} staff/direction combinations; two-handed swings; sweep hits flank but excludes rear and distant targets; heavy attacks use arcs.`);
