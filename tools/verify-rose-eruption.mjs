import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateAbilityInput,updateCombat} from '../src/combat.js';
import {getSubclassCombatState,clearSubclassCombatState,clearAbilityMorphCombatState} from '../src/subclassCombat.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const id='thornbinderThornLash',checks=[],samples=[];
const test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
function setup(){
 now=100;const p=createPlayer('Rose eruption');chooseClass(p,'thornbinder');p.skillState.combat.level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0});
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 updateCombat(p,w,{},0,now,()=>{});p.spirit=p.maxSpirit=10000;unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,'petalknight',now).ok);p.loadout.abilitySlots=[id,null,null,null,'block'];
 const e={id:'foe',kind:'brute',x:500,y:400,radius:12,hp:100000,maxHp:100000};w.enemies=[e];
 const aim={combatAimX:1,combatAimY:0,hasAim:true};
 return {p,w,e,aim,advance(seconds){for(let i=0;i<Math.round(seconds/.025);i++){now+=.025;updateCombat(p,w,{},.025,now,()=>{});}},cast(){return useAbility(0,p,w,()=>{},now,aim);},charge(seconds){assert(updateAbilityInput(p,w,{...aim,ability0Pressed:true,ability0Held:true},0,now,()=>{}));assert(p.abilityCharge);now+=seconds;assert(updateAbilityInput(p,w,{...aim,ability0Held:true},seconds,now,()=>{}));const level=p.abilityCharge.level;assert(updateAbilityInput(p,w,{...aim,ability0Released:true},0,now,()=>{}));return level;}};
}
const wound=c=>getSubclassCombatState(c.p)?.afflictions.get(c.e)?.effects.get(`thornWound:${id}`);
test('tap, partial and full hold use the real input path; charge enlarges and strengthens one burst',()=>{
 for(const seconds of [.01,.5,1]){
  const c=setup(),spirit=c.p.spirit,hp=c.e.hp,mastery=getAbilityMastery(c.p,id),xp=mastery.xp,level=c.charge(seconds),fx=c.w.effects.find(f=>f.geometry==='roseEruption');
  assert(fx);assert(!c.p.activeChannel&&!c.p.abilityCharge);assert.equal(c.w.effects.filter(f=>f.geometry==='roseEruption').length,2);
  samples.push({level,damage:hp-c.e.hp,cost:spirit-c.p.spirit,radius:fx.radius,reach:fx.x-c.p.x});assert(wound(c));assert.equal(mastery.xp,xp);assert(!c.cast(),'cooldown did not prevent spam');
 }
 assert.deepEqual(samples.map(s=>s.level),[0,1,2]);assert(samples[1].damage>samples[0].damage&&samples[2].damage>samples[1].damage);
 assert(Math.abs(samples[2].damage/samples[0].damage-1.8)<.05);assert(Math.abs(samples[2].radius/samples[0].radius-1.35)<.001);assert(samples[2].cost>samples[0].cost);
});
test('burst damages every enemy inside the exact visible circle and excludes enemies beyond it',()=>{
 const c=setup();const a=resolveAbilityMorph(c.p,id,'petalknight');
 c.w.enemies=Array.from({length:12},(_,i)=>({...c.e,id:'inside-'+i,x:500+Math.cos(i*Math.PI/6)*50,y:400+Math.sin(i*Math.PI/6)*50}));
 const outside={...c.e,id:'outside',x:500,y:400+a.subclassRadius+30},friendly={...c.e,id:'friendly',friendly:true};c.w.enemies.push(outside,friendly);
 assert(c.cast());const fx=c.w.effects.find(f=>f.geometry==='roseEruption');assert(c.w.enemies.slice(0,12).every(e=>e.hp<e.maxHp));assert.equal(outside.hp,outside.maxHp);assert.equal(friendly.hp,friendly.maxHp);
 const edge=setup();const radius=samples[0].radius;edge.e.x=400+samples[0].reach;edge.e.y=400+radius+.01;assert(edge.cast());assert.equal(edge.e.hp,edge.e.maxHp,'hit beyond visible border via enemy-radius padding');
});
test('wound deals three light ticks, persists after leaving, and cannot refresh itself',()=>{
 const c=setup();assert(c.cast());const impact=c.e.maxHp-c.e.hp;assert(wound(c));c.e.x=900;let hp=c.e.hp;const ticks=[];
 for(const seconds of [.825,.8,.8,.3]){c.advance(seconds);ticks.push(hp-c.e.hp);hp=c.e.hp;}
 assert(ticks.slice(0,3).every(d=>d>0&&d<impact*.12));assert.equal(ticks[3],0);assert(!wound(c));assert(!getSubclassCombatState(c.p).fields.length);
});
test('repeat bursts refresh one wound without overwriting other rose status or stacking DoT sources',()=>{
 const c=setup();assert(c.cast());const old=wound(c);c.advance(2.3);assert(c.cast());assert.equal(wound(c),old);assert.equal([...getSubclassCombatState(c.p).afflictions.get(c.e).effects.keys()].filter(k=>k.startsWith('thornWound')).length,1);
 assert(wound(c).until>now+2.5);assert(getSubclassCombatState(c.p).roseGuard?.stacks>=2);
});
test('terrain clamps eruption placement and blocks damage and wounds through cover',()=>{
 const c=setup();for(let y=0;y<c.w.height;y++)c.w.tiles[y][14].passable=false;c.e.x=500;assert(c.cast());const fx=c.w.effects.find(f=>f.geometry==='roseEruption');assert(fx.x<448);assert.equal(c.e.hp,c.e.maxHp);assert(!wound(c));
});
test('dodge cancels charge without resources, burst, cooldown or mastery XP',()=>{
 const c=setup(),spirit=c.p.spirit;assert(updateAbilityInput(c.p,c.w,{...c.aim,ability0Pressed:true,ability0Held:true},0,now,()=>{}));now+=.3;updateAbilityInput(c.p,c.w,{...c.aim,dashPressed:true},.3,now,()=>{});assert(!c.p.abilityCharge);assert.equal(c.p.spirit,spirit);assert(!c.p.cooldowns[id]);assert(!c.w.effects.some(f=>f.geometry==='roseEruption'));
});
test('Expertise scales burst and wound once; death, morph removal and world cleanup stop wound damage',()=>{
 const values=[];for(const spec of [null,'petalknight','fae']){const c=setup();if(spec)c.p.skillTree.spent[expertiseNodeId('thornbinder',spec)]=1;assert(c.cast());const burst=c.e.maxHp-c.e.hp,hp=c.e.hp,dotPower=wound(c).damage;c.advance(.825);values.push({burst,dot:hp-c.e.hp,dotPower});}
 assert(Math.abs(values[1].burst/values[0].burst-1.15)<.04);assert(Math.abs(values[2].burst/values[0].burst-.9)<.04);assert(Math.abs(values[1].dotPower/values[0].dotPower-1.15)<.04,JSON.stringify(values));assert(Math.abs(values[1].dot-values[0].dot*1.15)<=1,'integer rounding allowance');
 for(const reason of ['death','morph','world']){const c=setup();c.cast();const hp=c.e.hp;if(reason==='death')c.p.hp=0;else if(reason==='morph')clearAbilityMorphCombatState(c.p,id);else clearSubclassCombatState(c.p,'worldChanged');c.advance(1);assert.equal(c.e.hp,hp,reason);}
});
fs.mkdirSync('docs/rose-eruption',{recursive:true});fs.writeFileSync('docs/rose-eruption/verification.json',JSON.stringify({checks,samples},null,2));console.log(JSON.stringify({passed:checks.length,samples}));
