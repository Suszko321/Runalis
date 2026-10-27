import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../src/world.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {calculateWeaponDamage} from '../src/combatMoves.js';
import {configureEncounterEnemy,geographicEncounterProfile} from '../src/encounterData.js';
import {ITEMS} from '../src/data.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {useAbility,updateCombat} from '../src/combat.js';
const report={method:'Generated corridor centre-to-centre walking at 205 px/s; estimates exclude combat, searching, puzzles, door interactions and backtracking. Not human clear times.',floors:[],buildComparison:[]};
const surface=createWorld({skipPublishedOverride:true});
for(const entry of surface.continentRuntime.allObjects.filter(o=>o.kind==='dungeonEntrance')){
 const id=entry.dungeonId||entry.poiId||entry.id,initial=createDungeonWorld({dungeonId:id,theme:entry.theme,tier:entry.tier,depth:entry.depth,seed:`coverage:${id}`,skipPublishedOverride:true});
 for(let floor=1;floor<=initial.totalFloors;floor++){
  const w=createDungeonWorld({dungeonId:id,theme:entry.theme,tier:entry.tier,depth:entry.depth,floor,seed:`coverage:${id}`,skipPublishedOverride:true});
  const travel=w.halls.map(h=>(Math.abs(h.ax-h.bx)+Math.abs(h.ay-h.by))*32/205).sort((a,b)=>a-b);
  const long=w.halls.filter(h=>(Math.abs(h.ax-h.bx)+Math.abs(h.ay-h.by))*32/205>20);
  for(const hall of long)assert(w.enemies.some(e=>e.roomId===hall.id),`${id} floor ${floor}: long corridor ${hall.id} needs an encounter`);
  report.floors.push({id,floor,enemies:w.enemies.length,halls:travel.length,longHalls:long.length,allLongHallsGuarded:true,medianWalkSeconds:travel[Math.floor(travel.length/2)],p95WalkSeconds:travel[Math.floor(travel.length*.95)],maxWalkSeconds:travel.at(-1),oneTraversalAllHallsSeconds:travel.reduce((a,b)=>a+b,0)});
 }
}
for(const level of [1,6,80]){
 const p=createPlayer('build comparison');chooseClass(p,'gravecaller');p.skillState.combat.level=level;p.combatLevel=level;for(const s of Object.values(p.skillState.skills))s.level=level;
 const weapon=ITEMS.graveScythe,damage=calculateWeaponDamage(p,weapon,'scythe'),enemy={id:'fixed-frontier',kind:'ashWolf',hp:58,maxHp:58,damage:8};configureEncounterEnemy(enemy,geographicEncounterProfile(70,62),'fixed-build-test',{rank:'ordinary'});
 report.buildComparison.push({playerLevel:level,weapon:weapon.name,weaponDamage:damage,enemyLevel:enemy.combatLevel,enemyHp:enemy.maxHp,enemyDamage:enemy.damage,estimatedUnmodifiedContacts:Math.ceil(enemy.maxHp/damage)});
}
assert.equal(new Set(report.buildComparison.map(r=>JSON.stringify([r.enemyLevel,r.enemyHp,r.enemyDamage]))).size,1);assert(report.buildComparison[2].weaponDamage>report.buildComparison[1].weaponDamage);assert(report.buildComparison[1].weaponDamage>report.buildComparison[0].weaponDamage);
// Execute the real ground spell against an uncommitted boss, rather than only checking a mitigation helper.
const p=createPlayer('dormant boss');chooseClass(p,'thornbinder');p.spiritAwakened=true;unlockActiveAbility(p,'thornbinderBramblePatch');assignAbilityToSlot(p,3,'thornbinderBramblePatch');p.spirit=p.maxSpirit=1000;
const w=createDungeonWorld({dungeonId:'ashenOrchard',floor:2,seed:'dormant-dot',skipPublishedOverride:true}),boss=w.enemies.find(e=>e.isBoss);Object.assign(p,{x:boss.x-120,y:boss.y,dirX:1,dirY:0});const hp=boss.hp,t=performance.now()/1000;assert(boss.arenaDormant);assert(useAbility(3,p,w,()=>{},t,{combatAimX:1,combatAimY:0,hasAim:true}));for(let i=1;i<240;i++)updateCombat(p,w,{},1/60,t+i/60,()=>{});assert.equal(boss.hp,hp);assert(!boss.verdantWound);
report.dormantGroundSpellProtected=true;fs.writeFileSync('docs/enemy-density/pacing-verification.json',JSON.stringify(report,null,2));console.log('PASS fixed-world weak/appropriate/overpowered build comparison, real dormant-boss ground spell and measured corridor pacing across 35 floors.');
