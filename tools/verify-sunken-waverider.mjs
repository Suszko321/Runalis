import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {CLASS_SUBCLASSES} from '../src/subclassData.js';
import {getAbilityMorphOptions,selectAbilityMorph,normalizeAbilityMorphs,getSelectedAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getSunkenPressureState,clearSunkenPressure,SUNKEN_PRESSURE,applySunkenPressure} from '../src/sunkenPressureSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const report={checks:[],skills:[],damageWindows:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
function setup(id='hydromancerWaterTorrent',morph='sunken',level=33){
 now=100;const p=createPlayer('Sunken review');chooseClass(p,'waverider');p.skillState.combat.level=level;migratePlayer(p);p.x=400;p.y=400;p.dirX=1;p.dirY=0;p.hp=p.maxHp*.5;p.maxSpirit=p.spirit=10000;p.maxStamina=p.stamina=10000;
 unlockActiveAbility(p,id);getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots=[id,null,null,null,'block'];assert(selectAbilityMorph(p,id,morph,now).ok);
 const e={id:'target',name:'Durable target',kind:'brute',x:500,y:400,hp:100000,maxHp:100000,radius:12,isBoss:true};
 const w={mode:'dungeon',width:50,height:40,tiles:Array.from({length:40},()=>Array.from({length:50},()=>({passable:true,biome:'grass'}))),enemies:[e],objects:[],effects:[],drops:[]};
 const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
 return {p,e,w,input,tick(dt=.05){now+=dt;updateCombat(p,w,input,dt,now,()=>{});for(const fx of w.effects)fx.age+=dt;w.effects=w.effects.filter(f=>f.age<f.ttl);},cast(){return useAbility(0,p,w,()=>{},now,input);}};
}
test('Sunken is Mastery 5 and Cryomancer 10 without swapping their skill behaviors',()=>{
 const c=setup();assert.deepEqual(CLASS_SUBCLASSES.waverider,['sunken','cryomancer']);
 getAbilityMastery(c.p,c.p.loadout.abilitySlots[0]).level=5;
 const options=getAbilityMorphOptions(c.p,c.p.loadout.abilitySlots[0]);assert.deepEqual(options.map(o=>o.id),['base','sunken','cryomancer']);assert.deepEqual(options.map(o=>o.unlocked),[true,true,false]);
 assert.equal(resolveAbilityMorph(c.p,'hydromancerWaterTorrent','cryomancer').subclassMode,'bolt');
});
test('Cryomancer at mastery 10 survives migration, save and repeated normalization',()=>{
 const c=setup('hydromancerWaterTorrent','cryomancer');getAbilityMastery(c.p,'hydromancerWaterTorrent').level=10;c.p.abilityMorphVersion=2;normalizeAbilityMorphs(c.p);assert.equal(getSelectedAbilityMorph(c.p,'hydromancerWaterTorrent'),'cryomancer');
 const saved=normalizeProfileSave(sanitizeForSave(c.p));normalizeAbilityMorphs(saved);assert.equal(getSelectedAbilityMorph(saved,'hydromancerWaterTorrent'),'cryomancer');
 const fresh=setup();getAbilityMastery(fresh.p,'hydromancerWaterTorrent').level=5;normalizeAbilityMorphs(fresh.p);assert(!getAbilityMorphOptions(fresh.p,'hydromancerWaterTorrent')[2].unlocked);
});
test('all twelve Sunken skills retain original costs, shapes, channels, charge and support behavior',()=>{
 for(const base of ABILITIES.filter(a=>a.classId==='waverider')){
  const c=setup(base.id),a=resolveAbilityMorph(c.p,base,'sunken');
  for(const key of ['range','cost','costType','cd','channelProfile','canCharge','maxChargeTime','maxChargeCap','effectProfile'])assert.deepEqual(a[key],base[key],base.id+' changed '+key);
  assert(c.cast(),base.id+' could not cast');assert(c.w.effects.some(f=>f.kind==='sunkenSkill'),'Missing Sunken presentation: '+base.id);for(let i=0;i<35;i++)c.tick();
  if(base.id==='hydromancerBubbleWard')assert(c.p.buffs.bubbleWard?.flatAbsorb>0);
  if(base.id==='waveriderTideMirror')assert(!c.p.buffs?.defense,'Tide Mirror must keep its ranged mitigation, not become a generic ward');
  report.skills.push({id:base.id,channel:!!a.channelProfile,damage:100000-c.e.hp});
 }
});
test('opening damage is lower; sustained single-target pressure grows past standard damage',()=>{
 for(const morph of ['base','sunken']){
  const c=setup('hydromancerWaterTorrent',morph),windows=[],mastery={...getAbilityMastery(c.p,'hydromancerWaterTorrent')},hp=c.p.hp;
  const start=c.e.hp;let prior=start;
  for(let i=0;i<Math.ceil((SUNKEN_PRESSURE.rampSeconds+5)/.05);i++){
   if(i%36===0){c.p.spirit=10000;c.p.cooldowns={};c.p.abilityUseCharges={};assert(c.cast());}
   c.tick();if(i%60===59){windows.push(prior-c.e.hp);prior=c.e.hp;}
  }
  assert.equal(getAbilityMastery(c.p,'hydromancerWaterTorrent').xp,mastery.xp,'Using spells or burn must not award mastery');assert.equal(getAbilityMastery(c.p,'hydromancerWaterTorrent').level,mastery.level);
  report.damageWindows.push({morph,threeSecondWindows:windows,total:start-c.e.hp,healthRestored:c.p.hp-hp});
  if(morph==='sunken'){const entry=getSunkenPressureState(c.p).targets.get(c.e);assert.equal(entry.depth,1);}
 }
 const [base,sunken]=report.damageWindows;assert(sunken.threeSecondWindows[0]<base.threeSecondWindows[0]);assert(sunken.threeSecondWindows.at(-1)>base.threeSecondWindows.at(-1)*1.35);
 assert(sunken.healthRestored<=base.healthRestored+.1,'Sunken damage must not add healing beyond the same passive recovery as the original form');
});
test('Depth is time based, burn does not recursively refresh itself, and disengaging resets it',()=>{
 const c=setup();c.cast();for(let i=0;i<25;i++){c.p.cooldowns={};c.p.abilityUseCharges={};c.cast();}
 assert.equal(getSunkenPressureState(c.p).targets.get(c.e).depth,0,'Same-frame multi-hits cannot ramp Depth');
 for(let i=0;i<Math.ceil((SUNKEN_PRESSURE.encounterGrace+.25)/.05);i++)c.tick();assert(!getSunkenPressureState(c.p)?.targets.size,'Burn and encounter pressure must expire without fresh direct damage');c.p.spirit=10000;c.p.cooldowns={};c.p.abilityUseCharges={};assert(c.cast());assert.equal(getSunkenPressureState(c.p).targets.get(c.e).depth,0);
});
test('Torrent damages nearby targets while Maelstrom covers a larger accurate area and stops on release',()=>{
 const c=setup();c.w.enemies.push({...c.e,id:'side',x:560,y:420},{...c.e,id:'outside',x:560,y:510});c.cast();assert(c.w.enemies[1].hp<100000);assert.equal(c.w.enemies[2].hp,100000);
 const m=setup('waveriderMaelstrom');m.e.x=590;m.w.enemies.push({...m.e,id:'edge-outside',x:700});m.cast();for(let i=0;i<8;i++)m.tick();assert(m.e.hp<100000);assert.equal(m.w.enemies[1].hp,100000);
 const channel=m.p.activeChannel,fx=m.w.effects.find(f=>f.profile==='maelstrom'&&f.phase==='active');assert(channel.range>=205);assert(fx.radius>=channel.range);assert.equal(fx.layer,'behind');
 m.input.ability0Held=false;m.input.ability0Released=true;m.tick();assert.equal(m.p.activeChannel,null);
});
test('Sunken expertise scales direct damage and burn once; other classes, scrolls and normal forms do not build Depth',()=>{
 const opening=[];for(const expertise of [null,'sunken','cryomancer']){
  const c=setup();if(expertise)c.p.skillTree.spent[expertiseNodeId('waverider',expertise)]=1;c.cast();opening.push(100000-c.e.hp);
 }
 assert(Math.abs(opening[1]/opening[0]-1.15)<.04);assert(Math.abs(opening[2]/opening[0]-.9)<.04);
 const c=setup('hydromancerWaterTorrent','base');c.cast();assert(!getSunkenPressureState(c.p));
});
test('pressure state remains bounded and clears after death, removed target or world change',()=>{
 const c=setup();for(let i=0;i<100;i++)applySunkenPressure(c.p,c.w,{...c.e,id:'many'+i},20,'warding',{sourceAbilityId:'hydromancerWaterTorrent'},now);assert(getSunkenPressureState(c.p).targets.size<=SUNKEN_PRESSURE.cap);
 clearSunkenPressure(c.p);c.cast();c.e.dead=true;c.tick();assert.equal(getSunkenPressureState(c.p).targets.size,0);
 c.e.dead=false;c.e.hp=100000;c.p.cooldowns={};c.p.abilityUseCharges={};c.cast();c.w.enemies=[];c.tick();assert.equal(getSunkenPressureState(c.p).targets.size,0);
 c.w.enemies=[c.e];c.p.spirit=10000;c.p.cooldowns={};c.p.abilityUseCharges={};c.cast();c.p.hp=0;c.tick();assert(!getSunkenPressureState(c.p));
 c.p.hp=c.p.maxHp;c.p.spirit=10000;c.p.cooldowns={};c.p.abilityUseCharges={};c.cast();assert(getSunkenPressureState(c.p));updateCombat(c.p,{...c.w,enemies:[]},{},.05,now+.05,()=>{});assert(!getSunkenPressureState(c.p));
});
fs.mkdirSync('docs/waverider-sunken',{recursive:true});fs.writeFileSync('docs/waverider-sunken/verification.json',JSON.stringify(report,null,2));



