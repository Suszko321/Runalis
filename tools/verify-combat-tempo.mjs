import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tempoFixture,benchmarkTempo} from './benchmark-combat-tempo.mjs';
import {ABILITIES} from '../src/data.js';
import {CLASS_SUBCLASSES} from '../src/subclassData.js';
import {getBalancedAbility} from '../src/abilityCombatProfiles.js';
import {applyCombatTempo,isDirectAttack,mobilityUseCharges,directHitMultiplier} from '../src/combatTempo.js';
import {getAbilityChargeTime} from '../src/chargeSystem.js';
import {useAbility,updateAbilityInput} from '../src/combat.js';
import {getAbilityUseChargeProfile,getAbilityUseChargeState,spendAbilityUseCharge,normalizeAbilityUseCharges} from '../src/abilityChargeSystem.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';

const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const before=JSON.parse(fs.readFileSync('docs/combat-tempo/before.json')),after=benchmarkTempo();
const sample=(report,id,family,n=1)=>report.samples.find(s=>s.id===id&&s.family===family&&s.enemies===n);
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all 227 original and morph profiles follow one direct-attack policy; lasting reference power is untouched',()=>{
 assert.equal(after.profiles.length,227);
 for(let i=0;i<after.profiles.length;i++) {
  const old=before.profiles[i],current=after.profiles[i],c=tempoFixture(current.id,current.family),a=c.a(),raw=getBalancedAbility(a);
  assert.deepEqual([old.id,old.family],[current.id,current.family]);
  for(const key of ['referenceDamage','referenceMultiplier','cost','duration','channel'])assert.deepEqual(current[key],old[key],`${current.id}:${current.family} ${key}`);
  near(current.cd,old.cd*(isDirectAttack(a)?.9:1));
  if(old.charge)near(current.charge,Math.max(.2,old.charge*(isDirectAttack(a)?.75:1)));
  assert.equal(applyCombatTempo(a),a,'tempo is idempotent');
  near(getAbilityUseChargeProfile(c.p,a).rechargeTime,current.recharge);
  near(raw.cd,a.cd,'balanced lookup preserves already-prepared timing');
 }
});
test('every movement ability has two or three uses, including legacy movement and formerly locked charge upgrades',()=>{
 const movements=[];
 for(const base of ABILITIES.filter(a=>a.classId))for(const family of ['base',...(CLASS_SUBCLASSES[base.classId]||[])]){
  const c=tempoFixture(base.id,family),a=c.a(),max=mobilityUseCharges(a);if(!max)continue;
  const profile=getAbilityUseChargeProfile(c.p,a);assert(profile.eligible);assert(profile.maxCharges>=2&&profile.maxCharges<=3);
  movements.push({id:a.id,family,max:profile.maxCharges});
 }
 for(const id of ['oathkeeperDivineLeap','hydromancerRiptideStep','fellhunterGrapplingHook','voidstepBurst','eldritchFractureStep'])assert(movements.some(a=>a.id===id&&a.family==='base'));
 fs.writeFileSync('docs/combat-tempo/mobility.json',JSON.stringify(movements,null,2));
});
test('charges deplete, recover independently, survive saves and retain a legacy recovering use',()=>{
 for(const [id,family]of [['oathkeeperDivineLeap','holyknight'],['fellhunterVaultingShot','hellstalker'],['hydromancerRiptideStep','base']]){
  const c=tempoFixture(id,family),a=c.a(),profile=getAbilityUseChargeProfile(c.p,a),now=c.now();
  for(let i=0;i<profile.maxCharges;i++)assert(spendAbilityUseCharge(c.p,a,now+i*.1));
  assert(!spendAbilityUseCharge(c.p,a,now+.4));assert.equal(getAbilityUseChargeState(c.p,a,now+.4).charges,0);
  c.p.abilityUseCharges=JSON.parse(JSON.stringify(c.p.abilityUseCharges));normalizeAbilityUseCharges(c.p);
  assert.equal(getAbilityUseChargeState(c.p,a,now+.4).charges,0);
  assert.equal(getAbilityUseChargeState(c.p,a,now+profile.rechargeTime+.001).charges,1);
  c.p.abilityUseCharges={};c.p.cooldowns[id]=now;
  assert.equal(getAbilityUseChargeState(c.p,a,now+.1).charges,profile.maxCharges-1);
 }
});
test('real casts consume exactly two or three movement uses and refuse a fourth immediate cast',()=>{
 for(const [id,family]of [['oathkeeperDivineLeap','base'],['oathkeeperDivineLeap','sinner'],['fellhunterGrapplingHook','base'],['fellhunterVaultingShot','bloodhound'],['hydromancerRiptideStep','base'],['voidstepBurst','base']]) {
  const c=tempoFixture(id,family),profile=getAbilityUseChargeProfile(c.p,c.a());
  for(let i=0;i<profile.maxCharges;i++)assert(c.cast(),`${id}:${family} use ${i+1}`);
  assert(!c.cast(),id+' depleted');assert.equal(getAbilityUseChargeState(c.p,c.a(),c.now()).charges,0);
 }
});
test('Rose Eruption and Water Torrent reach full charge through actual input 25% sooner',()=>{
 for(const [id,family]of [['thornbinderThornLash','petalknight'],['hydromancerWaterTorrent','base']]){
  const c=tempoFixture(id,family),a=c.a(),input={...c.input,ability0Pressed:true};
  assert(updateAbilityInput(c.p,c.w,input,0,c.now(),()=>{}));near(c.p.abilityCharge.maxChargeTime,getAbilityChargeTime(c.p,a));
  const elapsed=c.p.abilityCharge.maxChargeTime*.79;
  assert(updateAbilityInput(c.p,c.w,c.input,elapsed,c.now()+elapsed,()=>{}));assert.equal(c.p.abilityCharge.level,2);
  assert(updateAbilityInput(c.p,c.w,{...c.input,ability0Held:false,ability0Released:true},0,c.now()+elapsed,()=>{}));assert(!c.p.abilityCharge);
 }
});
test('charge input becomes ready at the same shorter cooldown as tap casts',()=>{
 const c=tempoFixture('hydromancerWaterTorrent'),a=c.a();assert(c.cast());
 const time=c.now()+a.cd+.001;assert(updateAbilityInput(c.p,c.w,{...c.input,ability0Pressed:true},0,time,()=>{}));assert(c.p.abilityCharge);
});
test('direct hits are about 18% stronger and cast recovery is 20% shorter',()=>{
 for(const [id,family]of [['hydromancerWaterTorrent','base'],['oathkeeperJudgmentSmite','holyknight'],['bloodLance','base'],['graveSpark','acolyte'],['lightbringerGleamBolt','base']]){
  const b=sample(before,id,family),a=sample(after,id,family);assert(Math.abs(a.damage/b.damage-1.18)<.025,id);near(a.recovery,b.recovery*.8);
 }
});
test('bleed, poison, Hellstalker burn, thorn wounds and Sunken pressure retain their exact single-cast tail damage',()=>{
 for(const [id,family]of [['fellhunterThrowingDaggers','bloodhound'],['fellhunterThrowingDaggers','hellstalker'],['thornbinderThornLash','petalknight'],['hydromancerWaterTorrent','sunken']]){
  const b=sample(before,id,family),a=sample(after,id,family),first=s=>s.timeline.find(n=>n>0);
  assert(first(a)>first(b));assert.equal(a.damage-first(a),b.damage-first(b),id+':'+family);
 }
});
test('persistent attacks, healing rites and wards retain their existing timings and observed damage totals',()=>{
 for(const [id,family]of [['thornbinderLivingBriar','petalknight'],['thornbinderThornstorm','petalknight'],['soulSiphon','acolyte'],['oathkeeperHallowedBlades','sinner']])for(const n of [1,16]){
  const b=sample(before,id,family,n),a=sample(after,id,family,n);assert.deepEqual(a.timeline,b.timeline);assert.equal(a.health,b.health);assert.equal(a.recovery,b.recovery);
 }
 const a=tempoFixture('fellhunterThrowingDaggers','bloodhound').a();
 for(const options of [{dot:true},{proc:true},{channelTick:true},{source:'summon'},{oathBlade:true},{sunkenBurn:true}])assert.equal(directHitMultiplier(a,options),1);
});
test('Rose Eruption pushes radially, heavy enemies resist, and bosses hold their ground',()=>{
 const distances=[];
 for(const type of ['normal','elite','boss']){
  const c=tempoFixture('thornbinderThornLash','petalknight',1,type),a=c.a(),e=c.w.enemies[0];
  e.x=c.p.x+a.range+10;e.y=c.p.y;const start=e.x;assert(c.cast());assert(e.hp<e.maxHp);distances.push(e.x-start);
  const wound=getSubclassCombatState(c.p).afflictions.get(e).effects.get('thornWound:'+a.id);assert(wound);near(wound.until-c.now(),2.6);
 }
 assert(distances[0]>30&&distances[1]>0&&distances[1]<distances[0]);near(distances[2],0);
 const c=tempoFixture('thornbinderThornLash','petalknight',2),a=c.a();
 for(const [i,e]of c.w.enemies.entries()){e.x=c.p.x+a.range;e.y=c.p.y+(i?20:-20);}const ys=c.w.enemies.map(e=>e.y);assert(c.cast());assert(c.w.enemies[0].y<ys[0]&&c.w.enemies[1].y>ys[1]);
});
test('rose knockback stops at walls and Rosebite also pushes enemies',()=>{
 const c=tempoFixture('thornbinderThornLash','petalknight'),a=c.a(),e=c.w.enemies[0];
 e.x=c.p.x+a.range+12;e.y=c.p.y;const wall=Math.floor((e.x+20)/32);
 for(const row of c.w.tiles)row[wall].passable=false;assert(c.cast());assert(e.x<wall*32-(e.radius||10));
 const bite=tempoFixture('thornbinderRosebiteBurst','petalknight'),start=bite.w.enemies[0].x;assert(bite.cast());assert(bite.w.enemies[0].x>start);
});
test('faster legacy projectiles hit enemies crossed between frames at 10 FPS',()=>{
 const c=tempoFixture('graveSpark'),e=c.w.enemies[0];e.x=c.p.x+39;e.y=c.p.y-8;
 assert(c.cast());c.tick(.1);assert(c.damage()>0,'a faster bolt skipped the enemy between frame positions');
});
test('faster bolts remain blocked by terrain and retain their intended travel range',()=>{
 const wall=tempoFixture('graveSpark');wall.w.enemies[0].x=500;wall.w.enemies[0].y=392;
 for(const row of wall.w.tiles)row[14].passable=false;assert(wall.cast());wall.tick(.2);assert.equal(wall.damage(),0);
 const far=tempoFixture('graveSpark');far.w.enemies[0].x=far.p.x+far.a().range+80;far.w.enemies[0].y=far.p.y-8;
 assert(far.cast());for(let i=0;i<12;i++)far.tick(.2);assert.equal(far.damage(),0);assert.equal(far.p.abilityProjectiles.length,0);
});
fs.writeFileSync('docs/combat-tempo/after.json',JSON.stringify(after,null,2));
fs.writeFileSync('docs/combat-tempo/verification.json',JSON.stringify({checks,profiles:after.profiles.length,samples:after.samples.length},null,2));
console.log(JSON.stringify({passed:checks.length,profiles:after.profiles.length,samples:after.samples.length}));
