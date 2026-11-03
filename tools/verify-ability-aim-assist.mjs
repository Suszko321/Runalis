import assert from 'node:assert/strict';
import {getAbilityById} from '../src/data.js';
import {useAbility,updateCombat,getCombatProjectiles} from '../src/combat.js';
import {assistAbilityAim,usesAbilityAimAssist} from '../src/abilityAimAssist.js';
import {tempoFixture} from './benchmark-combat-tempo.mjs';

const east={x:1,y:0};
const facing={combatAimX:1,combatAimY:0,hasAim:true};
const degrees=angle=>angle*Math.PI/180;
const heading=aim=>Math.atan2(aim.y,aim.x)*180/Math.PI;
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,a+' != '+b);
function target(actor,distance,angle) {
  return {hp:1000,maxHp:1000,x:actor.x+Math.cos(degrees(angle))*distance,
    y:actor.y+Math.sin(degrees(angle))*distance,r:14,radius:14,kind:'rat',aggro:0};
}
const actor={x:320,y:320};
const close=target(actor,130,9),far=target(actor,185,-9);
near(heading(assistAbilityAim(actor,{enemies:[far,close]},east,200)),9);
near(heading(assistAbilityAim(actor,{enemies:[target(actor,180,18)]},east,200)),10);
near(heading(assistAbilityAim(actor,{enemies:[target(actor,180,23),target(actor,50,180)]},east,200)),0);
near(heading(assistAbilityAim(actor,{enemies:[close,target(actor,185,0)]},east,200)),0);
for(const excluded of [{friendly:true},{dead:true},{arenaDormant:true},{invulnerable:true},{hp:0}]) {
  near(heading(assistAbilityAim(actor,{enemies:[{...close,...excluded}]},east,200)),0);
}
near(heading(assistAbilityAim(actor,{enemies:[far]},east,150)),0);
const walls=Array.from({length:32},()=>Array.from({length:32},()=>({passable:true,biome:'grass'})));
for(const row of walls)row[12]={passable:false,biome:'wall'};
near(heading(assistAbilityAim(actor,{tiles:walls,enemies:[close]},east,200)),0);

for(const id of ['wayfarerRay','sanguineLance','lightbringerDawncarver','lightbringerGleamBolt','fellhunterBombToss','gravecallerDeathEcho']) {
  assert.ok(usesAbilityAimAssist(getAbilityById(id)),id);
}
for(const id of ['hydromancerWaterTorrent','waveriderPressureSpear','lightbringerRayOfRebuke','waveriderMaelstrom','oathkeeperLitanyOfIron','summonWolf','nightwingStep']) {
  assert.ok(!usesAbilityAimAssist(getAbilityById(id)),id);
}

for(let slot=0;slot<4;slot++) {
  const c=tempoFixture('lightbringerGleamBolt'),enemy=c.w.enemies[0];
  Object.assign(enemy,target(c.p,180,8));
  c.p.slot=slot+1;
  const aim=slot%2?{...facing,rightStickAimX:1,rightStickAimY:0}:{...facing,mouseAimActive:true,mouseWorldX:c.p.x+150,mouseWorldY:c.p.y};
  assert.ok(useAbility(0,c.p,c.w,()=>{},c.now(),aim));
  const shot=getCombatProjectiles(c.p)[0];
  near(heading({x:shot.dirX,y:shot.dirY}),8);
  assert.equal(aim.combatAimY,0,'input stays raw');
  for(let i=1;i<48;i++)updateCombat(c.p,c.w,aim,1/60,c.now()+i/60,()=>{});
  assert.ok(enemy.hp<1000,'assisted projectile landed');
}
const beam=tempoFixture('wayfarerRay'),p=beam.p,w=beam.w;
const first=Object.assign(w.enemies[0],target(p,170,8));
const second={...target(p,160,82),id:'second'};
w.enemies.push(second);
assert.ok(useAbility(0,p,w,()=>{},beam.now(),facing));
near(heading({x:p.activeChannel.dirX,y:p.activeChannel.dirY}),8);
const tick=(input,start,end)=>{
  for(let i=start;i<=end;i++) updateCombat(p,w,{ability0Held:true,...input},1/60,beam.now()+i/60,()=>{});
};
tick(facing,1,8);
assert.ok(first.hp<1000 && second.hp===1000);
tick({combatAimX:0,combatAimY:1},9,54);
near(heading({x:p.activeChannel.dirX,y:p.activeChannel.dirY}),82);
assert.ok(second.hp<1000,'channel followed new input and hit the new target');
second.hp=0;
tick({aimSource:'last',combatAimX:Math.cos(degrees(82)),combatAimY:Math.sin(degrees(82))},55,64);
near(heading({x:p.activeChannel.dirX,y:p.activeChannel.dirY}),90);
console.log('PASS aim bounds, closest visible selection, manual aim, exclusions, four-player projectiles and channel steering.');
