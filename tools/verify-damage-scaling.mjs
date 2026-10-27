import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {ITEMS,getAbilityById} from '../src/data.js';
import {calculateAbilityDamage,useAbility,updateCombat,updateSummons} from '../src/combat.js';
import {calculateWeaponDamage} from '../src/combatMoves.js';
import {progressionPower,equipmentCombatPower,summonEquipmentPower,equipmentDamageMultiplier} from '../src/combatPower.js';
import {getAbilityMastery,applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {configureEncounterEnemy} from '../src/encounterData.js';
import {getSubclassCombatState,mitigateSubclassDamage} from '../src/subclassCombat.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
const id='gravecallerMurmuringHost',aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
const actor=(level=33)=>{
 const p=createPlayer('damage-review');chooseClass(p,'gravecaller');p.equipment.weapon='graveScythe';p.skillState.combat.level=level;
 for(const s of ['spirit','summoning','scythe','focus','dexterity'])p.skillState.skills[s].level=Math.max(1,Math.round(level*.35));
 migratePlayer(p);Object.assign(p,{id:'damage-review',x:400,y:400,spiritAwakened:true});p.spirit=p.maxSpirit;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots[0]=id;selectAbilityMorph(p,id,'acolyte');return p;
};
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const enemy=(level=15,extra={})=>{const e={id:'weak-foe',kind:'hollowling',name:'Hollowling',x:520,y:400,hp:42,maxHp:42,radius:12,r:12,aggro:3,...extra};configureEncounterEnemy(e,{id:'fixed-test',levels:[level,level]},e.id,{rank:'ordinary'});return e;};
const checks=[],measurements=[];const test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
test('Level 33 attacks outgrow the old shallow curve; defence and resource calculations are retained',()=>{
 const p=actor(),baseline=JSON.parse(fs.readFileSync('docs/damage-scaling/before.json')).find(r=>r.level===33);
 const beam=calculateAbilityDamage(p,applyAbilityMastery(p,resolveSubclassAbility(p,id)));
 assert.ok(beam>=20&&beam<40);assert.ok(calculateWeaponDamage(p,ITEMS.graveScythe,'scythe')>baseline.weapon*2);
 assert.equal(progressionPower(p,'warding','defence'),baseline.defence);
 assert.ok(progressionPower(p,'spirit')>baseline.offence*2&&progressionPower(p,'spirit')<baseline.offence*3);
 const stats=[p.hp,p.maxHp,p.stamina,p.maxStamina,p.spirit,p.maxSpirit];calculateAbilityDamage(p,applyAbilityMastery(p,resolveSubclassAbility(p,id)));assert.deepEqual([p.hp,p.maxHp,p.stamina,p.maxStamina,p.spirit,p.maxSpirit],stats);
});
test('real Level 33 Acolyte beam kills weak enemies promptly and still provides its shield and piercing',()=>{
 for(const level of [5,15,33]){
  const p=actor(),w=world(),e=enemy(level);w.enemies=[e];const now=performance.now()/1000+20;assert.ok(useAbility(0,p,w,()=>{},now,aim));
  assert.equal(mitigateSubclassDamage(p,null,100,now),75);const initial=e.hp;let firstTick=0,time=0,ticks=0,lastHp=e.hp;
  for(let frame=1;frame<=900&&e.hp>0;frame++){
   time=frame/60;updateCombat(p,w,aim,1/60,now+time,()=>{});
   if(e.hp<lastHp){ticks++;firstTick||=lastHp-e.hp;}lastHp=e.hp;
   for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);
  }
  assert.equal(e.hp,0);assert.ok(time<(level<=15?3.7:6));assert.ok(firstTick>=20);measurements.push({playerLevel:33,enemyLevel:level,hp:initial,firstTick,ticks,killSeconds:Number(time.toFixed(3))});
 }
 const p=actor(),w=world();w.enemies=Array.from({length:20},(_,i)=>enemy(15,{id:'pack'+i,x:450+i*22}));const t=performance.now()/1000+20;assert.ok(useAbility(0,p,w,()=>{},t,aim));updateCombat(p,w,aim,.05,t+.05,()=>{});
 assert.equal(w.enemies.filter(e=>e.hp<e.maxHp).length,20);assert.ok(getSubclassCombatState(p).hostWard.reduction===.25);
});
test('Spirit proficiency, mastery, armour Spirit, weapon upgrades and necrotic set bonuses each affect damage',()=>{
 const p=actor(),damage=()=>calculateAbilityDamage(p,applyAbilityMastery(p,resolveSubclassAbility(p,id)));let prior=damage();
 p.skillState.skills.spirit.level=25;assert.ok(damage()>prior);prior=damage();getAbilityMastery(p,id,true).level=60;assert.ok(damage()>prior);
 const gear=equipmentCombatPower(p),petGear=summonEquipmentPower(p);p.equipment.chest='necromancerRobe';assert.ok(equipmentCombatPower(p)>gear);assert.ok(summonEquipmentPower(p)>petGear);
 prior=damage();p.equippedGear.weapon.upgradeTier=12;assert.ok(damage()>prior);
 assert.ok(equipmentDamageMultiplier(p,enemy(),'necrotic')>1);assert.equal(equipmentDamageMultiplier(p,enemy(),'lightning'),1);
});
test('existing summons refresh damage after level/gear changes and save load without changing health or identity',()=>{
 const p=actor(5),w=world(),t=performance.now()/1000+20;unlockActiveAbility(p,'summonLich');p.spirit=p.maxSpirit;assert.ok(useAbility('summonLich',p,w,()=>{},t,aim));
 const s=p.summons[0];updateSummons(0,p,w,()=>{},t);const before=s.damage,health=[s.hp,s.maxHp],identity=s.id;
 p.skillState.combat.level=33;p.skillState.skills.summoning.level=12;updateSummons(0,p,w,()=>{},t+.1);assert.ok(s.damage>before*2);assert.deepEqual([s.hp,s.maxHp],health);assert.equal(s.id,identity);
 const scaled=s.damage;p.equipment.chest='necromancerRobe';updateSummons(0,p,w,()=>{},t+.2);assert.ok(s.damage>scaled);assert.deepEqual([s.hp,s.maxHp],health);
 s.damage=2;const loaded=normalizeProfileSave(sanitizeForSave(p)),saved=loaded.summons[0];const savedHealth=[saved.hp,saved.maxHp];updateSummons(0,loaded,w,()=>{},t+.3);
 assert.ok(saved.damage>2);assert.equal(saved.id,identity);assert.deepEqual([saved.hp,saved.maxHp],savedHealth);
});
test('every Bound Servant and Lich morph retains its role and scales from Level, Summoning and gear',()=>{
 for(const abilityId of ['summonLich','gravecallerSummonLich'])for(const morph of ['base','acolyte','deathknight']){
  const p=actor(),w=world();unlockActiveAbility(p,abilityId);getAbilityMastery(p,abilityId,true).level=20;selectAbilityMorph(p,abilityId,morph);p.spirit=p.maxSpirit;
  assert.ok(useAbility(abilityId,p,w,()=>{},performance.now()/1000+20,aim));const s=p.summons[0],before=s.damage;
  if(abilityId==='gravecallerSummonLich'&&morph!=='deathknight')assert.ok(s.attackRange>=230);if(morph==='deathknight')assert.ok(s.attackRange<=58);
  p.skillState.combat.level=65;updateSummons(0,p,w,()=>{},performance.now()/1000+21);assert.ok(s.damage>before);assert.equal(s.summonMorph,morph);
 }
});
test('real beam hits and summon hits award no mastery XP, and beam Spirit costs/shield stay unchanged',()=>{
 const p=actor(),w=world(),t=performance.now()/1000+20;w.enemies=[enemy(33,{hp:1e6,maxHp:1e6})];const xp=getAbilityMastery(p,id).xp;
 const a=resolveSubclassAbility(p,id);assert.equal(a.cost,2);assert.equal(a.channelProfile.costPerSecond,9);assert.ok(useAbility(0,p,w,()=>{},t,aim));
 for(let i=1;i<=60;i++)updateCombat(p,w,aim,1/60,t+i/60,()=>{});assert.equal(getAbilityMastery(p,id).xp,xp);
 const summoner=actor(),sw=world();unlockActiveAbility(summoner,'summonLich');sw.enemies=[enemy(15,{hp:1e6,maxHp:1e6})];assert.ok(useAbility('summonLich',summoner,sw,()=>{},t,aim));const mastery=getAbilityMastery(summoner,'summonLich').xp;
 for(let i=1;i<=120;i++)updateSummons(1/60,summoner,sw,()=>{},t+i/60);assert.equal(getAbilityMastery(summoner,'summonLich').xp,mastery);
});
test('offensive scaling remains monotonic and finite beyond ordinary levels without modifying geographic enemy stats',()=>{
 let last=0;for(const level of [1,2,5,15,33,65,100,1000,1e9]){const p=actor(level),power=progressionPower(p,'spirit');assert.ok(Number.isFinite(power)&&power>last);last=power;}
 const e=enemy(15),before=structuredClone(e);configureEncounterEnemy(e,{id:'fixed-test',levels:[15,15]},e.id,{rank:'ordinary'});assert.deepEqual(e,before);assert.equal(e.maxHp,156);
});
fs.mkdirSync('docs/damage-scaling',{recursive:true});fs.writeFileSync('docs/damage-scaling/gameplay-verification.json',JSON.stringify({pass:true,checks,measurements},null,2)+'\n');console.log(JSON.stringify(measurements));
