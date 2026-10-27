import assert from 'node:assert/strict';
import fs from 'node:fs';
import {waveFixture,benchmarkWave} from './benchmark-waverider-identity.mjs';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {getSunkenPressureState,applySunkenPressure,updateSunkenPressure,clearSunkenPressureSource,SUNKEN_PRESSURE,isSunkenDamage} from '../src/sunkenPressureSystem.js';
import {setSubclassSupportParty,clearSubclassCombatState,clearAbilityMorphCombatState} from '../src/subclassCombat.js';
import {getAbilityUseChargeProfile} from '../src/abilityChargeSystem.js';
import {getAbilityChargeTime} from '../src/chargeSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {SKILL_TREE_NODES,spendSkillTreeNode,getSkillTreeBonuses,getSpentSkillTreePoints,normalizeSkillTreeState} from '../src/skillTreeSystem.js';
const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const run=(c,seconds)=>{for(let i=0;i<Math.ceil(seconds/.025);i++)c.tick();};
const pressure=c=>getSunkenPressureState(c.p),enemy=c=>c.w.enemies[0];
function build(c,seconds){for(let i=0;i<Math.ceil(seconds/.025);i++){if(i%40===0){c.refresh();assert(c.fire());}c.tick();}c.refresh();assert(c.fire());}
test('122 other morphs, every original active skill and all non-Hydromancy nodes remain exact',()=>{
 const baseline=JSON.parse(fs.readFileSync('docs/waverider-identity/protected.json'));assert.deepEqual(JSON.parse(JSON.stringify(ABILITIES)),baseline.abilities);
 assert.equal(Object.keys(baseline.forms).length,122);
 for(const [key,a]of Object.entries(baseline.forms)){const[id,f]=key.split(':');assert.deepEqual(JSON.parse(JSON.stringify(resolveAbilityMorph({classId:getAbilityById(id).classId},id,f))),a,key);}
 for(const [id,a]of Object.entries(baseline.nodes))assert.deepEqual(JSON.parse(JSON.stringify(SKILL_TREE_NODES[id])),a,id);
});
test('24 authored water/frost forms have unique names and Sunken keeps each original technique',()=>{
 const names=[];
 for(const a of ABILITIES.filter(a=>a.classId==='waverider'))for(const family of ['sunken','cryomancer']){
  const c=waveFixture(a.id,family),form=resolveAbilityMorph(c.p,a,family);names.push(form.name);assert(form.desc.length>60);
  if(family==='sunken')for(const key of ['cost','cd','range','channelProfile','effectProfile','canCharge','maxChargeTime'])assert.deepEqual(form[key],a[key],a.id+' '+key);
 }
 assert.equal(new Set(names).size,24);
});
test('Sunken ramps over twenty seconds; same-frame volleys and its own burn cannot accelerate it',()=>{
 const c=waveFixture();assert(c.fire());for(let i=0;i<25;i++){c.refresh();c.fire();}assert.equal(pressure(c).depth,0);
 run(c,1);assert.equal(pressure(c).depth,0);build(c,10);assert(pressure(c).depth>.5&&pressure(c).depth<.6);
 build(c,10);assert.equal(pressure(c).depth,1);assert.equal(pressure(c).targets.get(enemy(c)).depth,1);
 assert(!isSunkenDamage(c.p,{sourceAbilityId:'hydromancerWaterTorrent',sourceMorph:'sunken',sunkenBurn:true}));
});
test('Depth carries between targets and killing blows; no pressure burn remains on a corpse',()=>{
 const c=waveFixture();build(c,11);const prior=pressure(c).depth;enemy(c).hp=1;c.refresh();assert(c.fire());assert(enemy(c).dead);run(c,.05);assert(!pressure(c).targets.has(enemy(c)));
 c.w.enemies=[{...enemy(c),id:'next',hp:1e7,maxHp:1e7,dead:false}];c.refresh();assert(c.fire());assert(pressure(c).depth>=prior);assert(pressure(c).targets.get(enemy(c)).depth>.5);
});
test('burn stops after its own source expires; Depth gives a five-second pause then resets',()=>{
 const c=waveFixture();build(c,11);run(c,3.2);assert.equal(pressure(c).targets.size,0);assert(pressure(c).depth>.5);
 c.refresh();assert(c.fire());assert(pressure(c).depth>.5);run(c,5.1);assert(!pressure(c));c.refresh();assert(c.fire());assert.equal(pressure(c).depth,0);
});
test('one burn selects live source power; weak hits cannot keep an expired heavy reference alive',()=>{
 const c=waveFixture();c.learn('waveriderPressureSpear');const e=enemy(c),now=c.now();
 applySunkenPressure(c.p,c.w,e,1000,'warding',{sourceAbilityId:'waveriderPressureSpear'},now);
 for(const time of [1,2])applySunkenPressure(c.p,c.w,e,1,'warding',{sourceAbilityId:'hydromancerWaterTorrent'},now+time);
 updateSunkenPressure(c.p,c.w,now+3.1,()=>{},()=>{});const entry=pressure(c).targets.get(e);
 assert.equal(entry.contributions.size,1);assert(entry.power<10);assert.equal(entry.options.sourceAbilityId,'hydromancerWaterTorrent');
 const same=waveFixture(),target=enemy(same),id='hydromancerWaterTorrent';
 applySunkenPressure(same.p,same.w,target,1000,'warding',{sourceAbilityId:id},now);
 applySunkenPressure(same.p,same.w,target,1,'warding',{sourceAbilityId:id},now+2);
 updateSunkenPressure(same.p,same.w,now+2.1,()=>{},()=>{});assert(pressure(same).targets.get(target).power>100,'a tap must not erase a live charged reference');
 updateSunkenPressure(same.p,same.w,now+3.1,()=>{},()=>{});assert(pressure(same).targets.get(target).power<10,'a tap must not extend the charged reference beyond its own expiry');
});
test('removing a morph clears its contribution; death, inactivity, world changes and reset clear pressure',()=>{
 for(const reason of ['morph','death','inactive','world','reset']){
  const c=waveFixture();assert(c.fire());
  if(reason==='morph'){clearAbilityMorphCombatState(c.p,'hydromancerWaterTorrent');assert(!pressure(c));}
  else if(reason==='reset'){clearSubclassCombatState(c.p);assert(!pressure(c));}
  else {if(reason==='death')c.p.hp=0;else if(reason==='inactive')c.p.active=false;else c.w={...c.w,enemies:[]};updateSunkenPressure(c.p,c.w,c.now()+.1,()=>{},()=>{});assert(!pressure(c));}
 }
 const c=waveFixture();c.learn('waveriderPressureSpear');c.fire();applySunkenPressure(c.p,c.w,enemy(c),100,'warding',{sourceAbilityId:'waveriderPressureSpear'},c.now());clearSunkenPressureSource(c.p,'waveriderPressureSpear');assert(pressure(c).targets.get(enemy(c)).contributions.has('hydromancerWaterTorrent'));
});
test('pressure remains bounded and ignores training dummies, summons and healing',()=>{
 const c=waveFixture();for(let i=0;i<100;i++)applySunkenPressure(c.p,c.w,{...enemy(c),id:'extra'+i},20,'warding',{sourceAbilityId:'hydromancerWaterTorrent'},c.now());assert.equal(pressure(c).targets.size,SUNKEN_PRESSURE.cap);
 const clean=waveFixture('hydromancerMendingCurrent');clean.fire();assert(!pressure(clean));applySunkenPressure(clean.p,clean.w,{...enemy(clean),trainingDummy:true},20,'warding',{sourceAbilityId:'hydromancerMendingCurrent'},clean.now());assert(!pressure(clean));
 assert(!isSunkenDamage(c.p,{sourceAbilityId:'hydromancerWaterTorrent',source:'summon',sourceMorph:'sunken'}));
});
test('restorative frost heals/wards and cleans slows/frost from eligible allies, including full-health allies',()=>{
 const c=waveFixture('hydromancerMendingCurrent','cryomancer'),now=c.now();
 const ally=(x,id)=>({id,x,y:400,hp:100,maxHp:100,active:true,buffs:{},slowTimer:3,slowUntil:now+2,eliteFrost:70,eliteFrozenUntil:now+1,burnTimer:4,poisonTimer:5});
 const close=ally(420,'close'),far=ally(650,'far'),covered=ally(500,'covered');for(const row of c.w.tiles)row[14].passable=false;
 setSubclassSupportParty(c.p,[close,far,covered]);const hp=c.p.hp;assert(c.fire());assert(c.p.hp>hp);assert(close.buffs.defense.cryo);
 assert.equal(close.slowTimer,0);assert.equal(close.slowUntil,0);assert.equal(close.eliteFrost,0);assert.equal(close.eliteFrozenUntil,0);assert.equal(close.poisonTimer,5);assert.equal(close.burnTimer,4);
 assert.equal(far.slowTimer,3);assert.equal(covered.slowTimer,3);assert(!c.state().afflictions.get(enemy(c)));
});
test('Glacial Sanctuary pulses restoration without stacking and only cleans allies inside its circle',()=>{
 const c=waveFixture('hydromancerWellspring','cryomancer'),ally={x:430,y:400,hp:50,maxHp:100,buffs:{},slowTimer:2,eliteFrost:40};setSubclassSupportParty(c.p,[ally]);
 assert(c.fire());c.refresh();assert(c.fire());assert.equal(c.state().fields.length,1);c.tick();assert(ally.hp>50);assert.equal(ally.slowTimer,0);assert.equal(ally.eliteFrost,0);
 ally.x=650;ally.slowTimer=2;run(c,1.1);assert.equal(ally.slowTimer,2);
});
test('aimed frost fields land on a nearby visible threat, hit all sixteen foes, and respect their exact border',()=>{
 const c=waveFixture('hydromancerDrowningPressure','cryomancer');assert(c.fire());const f=c.state().fields[0];assert(f.x<550,'field overshot a nearby enemy');
 const template=enemy(c);c.w.enemies=Array.from({length:16},(_,i)=>({...template,id:'ring'+i,x:f.x+Math.cos(i*Math.PI/8)*70,y:f.y+Math.sin(i*Math.PI/8)*70}));
 const outside={...template,id:'outside',x:f.x,y:f.y+f.radius+.01};c.w.enemies.push(outside);c.tick();assert(c.w.enemies.slice(0,16).every(e=>e.hp<e.maxHp));assert.equal(outside.hp,outside.maxHp);
});
test('fast frost shards and lances cannot cross thin temporary walls, even at low update rates',()=>{
 for(const id of ['hydromancerWaterTorrent','hydromancerTidalCut','waveriderPressureSpear'])for(const dt of [1/60,.1]){
  const c=waveFixture(id,'cryomancer');c.w.encounterBarriers=[{x:430,y:200,w:3,h:400}];assert(c.fire());
  for(let t=0;t<1;t+=dt)c.tick(dt);assert.equal(c.damage(),0,id+' '+dt);assert(!c.state().afflictions.get(enemy(c)));
 }
});
test('Hydromancy retains purchases and permits damage, restoration and mobility together',()=>{
 const c=waveFixture();for(const id of ['hydromancy_root','hydromancy_torrent_initiate','hydromancy_flow_discipline','hydromancy_pressure_channel','hydromancy_mending_tide','hydromancy_tideglass_form','hydromancy_riptide_duelist','hydromancy_wellspring_keeper'])assert(spendSkillTreeNode(c.p,id).ok,id);
 const spent=getSpentSkillTreePoints(c.p);normalizeSkillTreeState(c.p);assert.equal(getSpentSkillTreePoints(c.p),spent);assert(c.p.knownAbilities.includes('hydromancerMendingCurrent'));assert(c.p.knownAbilities.includes('hydromancerDrowningPressure'));assert(c.p.knownAbilities.includes('hydromancerRiptideStep'));assert(c.p.knownAbilities.includes('hydromancerWellspring'));
 assert.equal(getSkillTreeBonuses(c.p).abilityRechargePct_hydromancerRiptideStep,16);
});
test('three movement uses, faster direct charging and save/load preserve the preceding tempo pass',()=>{
 for(const family of ['base','sunken','cryomancer']){const c=waveFixture('hydromancerRiptideStep',family);assert.equal(getAbilityUseChargeProfile(c.p,c.a()).maxCharges,3);const saved=normalizeProfileSave(sanitizeForSave(c.p));assert.equal(saved.abilityMorphs?.hydromancerRiptideStep,family==='base'?undefined:family);assert.equal(getAbilityUseChargeProfile(saved,'hydromancerRiptideStep').maxCharges,3);}
 const c=waveFixture(),a=c.a();assert(getAbilityChargeTime(c.p,a)<.6);assert(!JSON.stringify(sanitizeForSave(c.p)).includes('contributions'));
});
const before=JSON.parse(fs.readFileSync('docs/waverider-identity/before.json')),after=benchmarkWave();
test('measured long-fight Sunken damage rises; Cryomancer provides damage/control while bosses resist freeze',()=>{
 for(const old of before.fights.filter(f=>f.family==='base'))assert.deepEqual(after.fights.find(f=>f.family===old.family&&f.rank===old.rank&&f.rotation===old.rotation),old);
 for(const rotation of ['torrent','caster']){const f=after.fights.find(f=>f.family==='sunken'&&f.rank==='boss'&&f.rotation===rotation);assert(f.fiveSecondWindows.at(-1)>f.fiveSecondWindows[0]*1.35);assert.equal(f.depth.at(-1),1);}
 const cryo=after.fights.find(f=>f.family==='cryomancer'&&f.rank==='boss'&&f.rotation==='caster'),sunken=after.fights.find(f=>f.family==='sunken'&&f.rank==='boss'&&f.rotation==='caster');assert.equal(cryo.freezeSeconds,0);assert(cryo.slowSeconds>30);assert(sunken.damage>cryo.damage*1.2);assert(after.fights.some(f=>f.family==='cryomancer'&&f.rank==='normal'&&f.freezeSeconds>5));
});
fs.writeFileSync('docs/waverider-identity/after.json',JSON.stringify(after,null,2));fs.writeFileSync('docs/waverider-identity/verification.json',JSON.stringify({checks,casts:after.casts.length,fights:after.fights.length},null,2));console.log(JSON.stringify({checks:checks.length,casts:after.casts.length,fights:after.fights.length}));
