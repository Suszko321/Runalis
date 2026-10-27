import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility,updateCombat,updateSummons,updateEnemies,applySummonThornRetaliation} from '../src/combat.js';
import {applyTargetDamage,createEnemyArchetype} from '../src/enemyBehaviors.js';
import {beginBasicEnemyAttack,getBasicEnemyAttack} from '../src/enemyAttackPresentation.js';

let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const id='thornbinderSummonElderThornbeast',checks=[];
const test=(name,fn)=>{now+=10;fn();checks.push(name);console.log('PASS '+name);};
function setup(morph='petalknight'){
 const p=createPlayer('Rose companion');chooseClass(p,'thornbinder');p.skillState.combat.level=33;migratePlayer(p);
 Object.assign(p,{x:700,y:700,dirX:1,dirY:0,spiritAwakened:true});
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 updateCombat(p,w,{},0,now,()=>{});p.spirit=p.maxSpirit=10000;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,morph,now).ok);assert(useAbility(id,p,w,()=>{},now));
 const s=p.summons.find(s=>s.sourceAbilityId===id);assert(s);s.x=620;s.y=700;
 const e=createEnemyArchetype('shieldKnight','Test knight',20,20,{id:'thorn-test'});
 Object.assign(e,{x:660,y:700,hp:100000,maxHp:100000,damage:20,dmg:20,armour:0,attackCooldown:99,specialCooldown:99,chargeCooldown:99,aggro:3,awakened:true});w.enemies=[e];return {p,w,s,e};
}
const strike=(s,e,w,damage=20)=>applyTargetDamage(e,s,damage,w,()=>{},{now});
test('advanced melee reflects actual health lost, shows thorns, and preserves mastery',()=>{
 const {p,w,s,e}=setup(),hp=s.hp,mastery=getAbilityMastery(p,id,true),progress={level:mastery.level,xp:mastery.xp};
 strike(s,e,w);assert(s.hp<hp);assert(e.hp<e.maxHp);assert.equal(s.lastHitAt,now);
 const fx=w.effects.find(f=>f.geometry==='roseReflection');assert(fx);assert.equal(fx.x,s.x);assert.equal(fx.endX,e.x);
 const entries=Object.values(e.combatContributors);assert.equal(entries.length,1);assert.equal(entries[0].actor,p);assert(entries[0].abilities[id]>0);assert(entries[0].skills.summoning>0);
 assert.deepEqual({level:mastery.level,xp:mastery.xp},progress);
 const before=e.hp;strike(s,e,w);assert.equal(e.hp,before,'shared .75s cooldown');now+=.76;strike(s,e,w);assert(e.hp<before);
});
test('real production basic attacks retaliate through both old and advanced AI',()=>{
 for(const kind of ['legacyThornTest','shieldKnight']){
  const {p,w,s,e}=setup();e.kind=kind;e.archetype=kind;e.x=s.x+22;
  assert(beginBasicEnemyAttack(e,s,now,40));const hp=s.hp;
  for(let i=0;i<40;i++){now+=1/60;updateEnemies(1/60,p,w,()=>{},now);}
  assert(s.hp<hp,kind+' did not land');assert(e.hp<e.maxHp,kind+' did not retaliate');assert(!getBasicEnemyAttack(e),kind+' did not recover');
 }
});
test('thorns retain their damage cap and do not reflect overkill or corpse damage',()=>{
 const {p,w,s,e}=setup();const value=applySummonThornRetaliation(s,e,w,1000,now,()=>{},p);assert(value<=s.damage*.65);
 now+=1;s.hp=1;const before=e.hp;strike(s,e,w,999);assert.equal(s.hp,0);assert(before-e.hp<=1,'overkill used instead of actual lost health');
 now+=1;const after=e.hp;strike(s,e,w,999);assert.equal(e.hp,after,'corpse retaliated');
});
test('elite hazard impacts reflect against the nearby real caster, not the ground marker',()=>{
 const {w,s,e}=setup();e.eliteModifier='artillery';e.telegraph={kind:'artillery',time:1};
 const origin={...e,x:s.x,y:s.y,combatSource:e};strike(s,origin,w);assert(e.hp<e.maxHp);assert.equal(origin.hp,origin.maxHp);assert(e.telegraph,'thorns interrupted an elite');
 now+=1;e.x=s.x+200;const before=e.hp;strike(s,{...origin,combatSource:e},w);assert.equal(e.hp,before,'distant caster hit by local thorns');
});
test('co-op retaliation credits the companion owner, including loaded companions',()=>{
 const {p,w,s,e}=setup();const host=createPlayer('Host');chooseClass(host,'thornbinder');Object.assign(host,{x:700,y:700});host.coop={players:[p]};
 strike(s,e,w);assert.equal(Object.values(e.combatContributors)[0].actor,p);
 now+=1;const loaded=JSON.parse(JSON.stringify(s));p.summons=[loaded];updateSummons(0,p,w,()=>{},now);
 const before=e.hp;strike(loaded,e,w);assert(e.hp<before);assert.equal(Object.values(e.combatContributors).length,1);assert.equal(Object.values(e.combatContributors)[0].actor,p);
});
test('walls, friendly or dead attackers, and other Elder morphs do not gain unintended thorns',()=>{
 for(const morph of ['base','fae']){const {w,s,e}=setup(morph);strike(s,e,w);assert.equal(e.hp,e.maxHp,morph);}
 for(const flag of ['friendly','dead']){const {w,s,e}=setup();e[flag]=true;assert.equal(applySummonThornRetaliation(s,e,w,20,now),0);assert.equal(e.hp,e.maxHp);}
 const {w,s,e}=setup();e.x=s.x+96;w.tiles[Math.floor(s.y/32)][Math.floor((s.x+e.x)/2/32)].passable=false;
 assert.equal(applySummonThornRetaliation(s,e,w,20,now),0);assert.equal(e.hp,e.maxHp);
});
fs.mkdirSync('docs/summon-thorns',{recursive:true});fs.writeFileSync('docs/summon-thorns/verification.json',JSON.stringify({checks,passed:checks.length},null,2));
console.log(JSON.stringify({passed:checks.length}));
