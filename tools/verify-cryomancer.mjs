import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById,ABILITIES} from '../src/data.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat,calculateAbilityDamage} from '../src/combat.js';
import {getSubclassCombatState,clearSubclassCombatState,onSubclassDamaged} from '../src/subclassCombat.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {updateEliteEncounters,getEliteHazards} from '../src/eliteEncounterSystem.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
import {CRYO_BALANCE} from '../src/cryomancerSkills.js';
import {getAbilityUseChargeProfile} from '../src/abilityChargeSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const report={checks:[],skills:[],damageComparisons:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
function setup(id='hydromancerWaterTorrent',morph='cryomancer',rank='normal',level=33){
 now=100;const p=createPlayer('Cryomancer review');chooseClass(p,'waverider');p.skillState.combat.level=level;migratePlayer(p);p.x=400;p.y=400;p.dirX=1;p.dirY=0;
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),enemies:[],effects:[],objects:[],drops:[]};
 updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=10000;p.maxStamina=p.stamina=10000;p.hp=p.maxHp*.5;
 const e={id:'target',kind:'brute',name:'Durable foe',x:500,y:400,radius:12,hp:100000,maxHp:100000,...(rank==='boss'?{isBoss:true}:rank==='elite'?{elite:true,isElite:true}:{})};w.enemies=[e];
 function learn(id){unlockActiveAbility(p,id);getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,morph,now).ok);}
 learn(id);p.loadout.abilitySlots=[id,null,null,null,'block'];
 const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
 return {p,w,e,input,learn,tick(dt=.05){now+=dt;updateCombat(p,w,input,dt,now,()=>{});for(const f of w.effects)f.age+=dt;w.effects=w.effects.filter(f=>f.age<f.ttl);},cast(id=p.loadout.abilitySlots[0]){return useAbility(id===p.loadout.abilitySlots[0]?0:id,p,w,()=>{},now,input);},advance(seconds){for(let i=0;i<seconds/.05;i++)this.tick();},refresh(){p.spirit=p.stamina=10000;p.cooldowns={};p.abilityUseCharges={};}};
}
const entry=c=>getSubclassCombatState(c.p)?.afflictions.get(c.e)?.effects.get('cryomancer');
function shard(c){c.refresh();assert(c.cast('hydromancerWaterTorrent'));c.advance(.5);}
test('all twelve frost skills cast with authored descriptions, controls and bounded state',()=>{
 for(const base of ABILITIES.filter(a=>a.classId==='waverider')){
  const c=setup(base.id),a=resolveAbilityMorph(c.p,base,'cryomancer');assert(a.cryoSkill);assert(a.desc.length>30);assert(a.cost>0&&a.cd>0);const before=c.p.spirit+c.p.stamina;assert(c.cast());assert(c.p.spirit+c.p.stamina<before,base.id+" did not pay "+before+" -> "+(c.p.spirit+c.p.stamina));
  const field=getSubclassCombatState(c.p)?.fields[0];if(field){c.e.x=field.x;c.e.y=field.y;}c.advance(2.5);
  const s=getSubclassCombatState(c.p);assert(s.fields.length<=12&&s.shots.length<=32);assert(c.w.effects.some(f=>f.subclassId==='cryomancer')||s.fields.length||c.p.buffs?.defense||c.e.hp<100000);
  report.skills.push({id:base.id,cost:a.cost,cooldown:a.cd,mode:a.subclassMode,radius:a.subclassRadius,damage:100000-c.e.hp});
 }
});
test('three spaced Chill hits freeze normal foes; same-frame casts do not skip the setup',()=>{
 const c=setup();shard(c);assert.equal(entry(c).chill,1);shard(c);assert.equal(entry(c).chill,2);shard(c);assert(c.e.subclassFrozenUntil>now);assert(entry(c).brittleUntil>now);
 const q=setup();for(let i=0;i<3;i++){q.refresh();q.cast();}q.advance(.3);assert.equal(entry(q).chill,1);assert(!(q.e.subclassFrozenUntil>now));
});
test('Brittle is consumed by Shatter; an unprepared spear does not gain the bonus',()=>{
 const c=setup();c.learn('waveriderPressureSpear');shard(c);shard(c);shard(c);const hp=c.e.hp;c.refresh();assert(c.cast('waveriderPressureSpear'));c.advance(.25);const prepared=hp-c.e.hp;assert.equal(entry(c).brittleUntil,0);assert(c.w.effects.some(f=>f.geometry==='shatter'));
 const q=setup('waveriderPressureSpear');const before=q.e.hp;q.cast();q.advance(.25);const unprepared=before-q.e.hp;assert(prepared>unprepared*1.25);report.shatter={prepared,unprepared};
});
test('elite freeze is shorter, bosses retain Brittle without immobilization, and recovery prevents freeze loops',()=>{
 for(const rank of ['normal','elite','boss']){
  const c=setup('hydromancerWaterTorrent','cryomancer',rank);let freezes=0,lastUntil=-100,lastStart=-100;
  for(let i=0;i<400;i++){if(i%10===0){c.refresh();c.cast();}c.tick();if(c.e.subclassFrozenUntil>now&&c.e.subclassFrozenUntil>lastUntil){if(freezes)assert(now>=lastUntil+CRYO_BALANCE.recovery-.05);freezes++;lastUntil=c.e.subclassFrozenUntil;lastStart=now;}}
  if(rank==='boss'){assert.equal(freezes,0);assert(entry(c).brittleUntil>now);assert(c.e.slowTimer>0);}else {assert(freezes>0&&freezes<=4);assert(lastUntil-lastStart<=(rank==='elite'?.65:1.15),rank+' freeze duration '+(lastUntil-lastStart));}
 }
});
test('freeze cannot cancel elite artillery or walls',()=>{
 for(const mod of ['artillery','waller']){
 const c=setup('hydromancerWaterTorrent','cryomancer','elite');c.e.isInCombat=true;c.e.level=c.e.combatLevel=40;c.e.encounterTier='rare';c.e.damage=20;c.e.eliteModifiers=[mod];c.e.eliteModifier=mod;
 for(let i=0;i<400&&!getEliteHazards(c.w).length;i++){now+=.05;updateEliteEncounters(c.w,c.p,.05,now,()=>({hpDamage:0}));}
 const h=getEliteHazards(c.w)[0];assert(h);c.e.subclassFrozenUntil=now+2;updateEliteEncounters(c.w,c.p,.05,now+.05,()=>({hpDamage:0}));assert(getEliteHazards(c.w).includes(h));
 }
});
test('ice fields respect terrain, cadence, duration and replacement; sanctuaries cannot stack heals',()=>{
 const c=setup('waveriderMaelstrom');c.cast();const f=getSubclassCombatState(c.p).fields[0];assert.equal(f.radius,175);c.e.x=f.x;c.e.y=f.y;c.tick();assert(!(c.e.subclassFrozenUntil>now),'First pulse cannot freeze');c.advance(1.8);assert(c.e.subclassFrozenUntil>now);
 c.advance(5);assert.equal(getSubclassCombatState(c.p).fields.length,0);
 const q=setup('hydromancerWellspring');q.cast();q.refresh();q.cast();assert.equal(getSubclassCombatState(q.p).fields.length,1);const hp=q.p.hp;q.advance(2);assert(q.p.hp>hp);
 const wall=setup();wall.w.tiles[Math.floor(400/32)][Math.floor(460/32)]={passable:false,biome:'wall'};wall.cast();wall.advance(1);assert.equal(wall.e.hp,100000);
});
test('wards reduce damage without free offensive freezes, healing is useful, and mirror retaliation builds Chill',()=>{
 const c=setup('hydromancerBubbleWard');c.cast();assert(c.p.buffs.defense.cryo);assert(c.p.buffs.defense.reduction>=.24);assert.equal(c.e.hp,100000);assert(!entry(c));
 const heal=setup('hydromancerMendingCurrent');const hp=heal.p.hp;heal.cast();assert(heal.p.hp>hp);assert(heal.p.buffs.defense.cryo);
 const mirror=setup('waveriderTideMirror');mirror.cast();onSubclassDamaged(mirror.p,20,mirror.e,mirror.w,now);mirror.tick();assert(mirror.e.hp<100000);assert.equal(entry(mirror).chill,1);
});
test('Cryomancer has prepared burst while Sunken wins a sustained single-target fight',()=>{
 for(const level of [1,15,33,60])for(const morph of ['base','cryomancer','sunken']){
  const c=setup('hydromancerWaterTorrent',morph,'boss',level),a=resolveAbilityMorph(c.p,'hydromancerWaterTorrent',morph==='base'?null:morph),cd=a.cd;
  let next=now;const windows=[];let last=c.e.hp;
  for(let i=0;i<600;i++){if(now>=next){c.refresh();assert(c.cast());next=now+cd+.05;}c.tick();if(i%100===99){windows.push(last-c.e.hp);last=c.e.hp;}}
  report.damageComparisons.push({level,morph,fiveSecondWindows:windows,total:100000-c.e.hp});
 }
 for(const level of [1,15,33,60]){const rows=report.damageComparisons.filter(r=>r.level===level),sunken=rows.find(r=>r.morph==='sunken'),cryo=rows.find(r=>r.morph==='cryomancer');assert(sunken.total>cryo.total*1.1,level+' Sunken must retain sustained identity');}
});
test('expertise scales ice once, using frost awards no mastery, and runtime resets cleanly',()=>{
 const damage=[];for(const spec of [null,'cryomancer','sunken']){const c=setup();if(spec)c.p.skillTree.spent[expertiseNodeId('waverider',spec)]=1;const m={...getAbilityMastery(c.p,'hydromancerWaterTorrent')};shard(c);damage.push(100000-c.e.hp);assert.equal(getAbilityMastery(c.p,'hydromancerWaterTorrent').xp,m.xp);assert.equal(getAbilityMastery(c.p,'hydromancerWaterTorrent').level,m.level);clearSubclassCombatState(c.p);assert(!getSubclassCombatState(c.p));}
 assert(Math.abs(damage[1]/damage[0]-1.15)<.06);assert(Math.abs(damage[2]/damage[0]-.9)<.06);
});
test('Hydromancy damage investment and earned extra charges still benefit frost forms',()=>{
 const base=setup();shard(base);const normal=100000-base.e.hp;
 const invested=setup();invested.p.skillTree.spent.hydromancy_torrent_initiate=1;shard(invested);assert(100000-invested.e.hp>normal);
 invested.p.skillTree.spent.hydromancy_deluge_crown=1;const profile=getAbilityUseChargeProfile(invested.p,'hydromancerWaterTorrent');assert(profile.maxCharges>1,'Earned Torrent charge must survive morphing');
});
fs.mkdirSync('docs/waverider-cryomancer',{recursive:true});fs.writeFileSync('docs/waverider-cryomancer/verification.json',JSON.stringify(report,null,2));



