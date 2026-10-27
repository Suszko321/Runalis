import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {getSubclassCombatState,mitigateSubclassDamage,clearSubclassCombatState,clearAbilityMorphCombatState} from '../src/subclassCombat.js';
import {abilitySummary} from '../src/uiInformation.js';
const id='gravecallerMurmuringHost',aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},checks=[];
function fixture(morph='acolyte'){
 const p=createPlayer('Host review');chooseClass(p,'gravecaller');Object.assign(p,{id:'host',x:240,y:320,dirX:1,dirY:0,equipment:{},spiritAwakened:true});
 for(const skill of Object.values(p.skillState.skills))skill.level=20;migratePlayer(p);p.maxSpirit=p.spirit=2000;p.maxHp=p.hp=2000;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots[0]=id;
 const now=performance.now()/1000+5;assert(selectAbilityMorph(p,id,morph,now).ok);
 const w={mode:'dungeon',width:40,height:24,tiles:Array.from({length:24},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 updateCombat(p,w,aim,0,now,()=>{});p.spirit=p.maxSpirit;return {p,w,now};
}
const foe=(x,y=320,i=x)=>({id:'foe'+i,kind:'rat',name:'Target',x,y,hp:100000,maxHp:100000,radius:8,r:8,attackCooldown:20});
function cast(f){assert(useAbility(0,f.p,f.w,()=>{},f.now,aim));}
function tick(f,t,dt=.05,input=aim){updateCombat(f.p,f.w,input,dt,f.now+t,()=>{});}
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);}
check('Long range, lower starting cost and upkeep, and description match the new shield and piercing effect',()=>{
 const f=fixture(),a=resolveSubclassAbility(f.p,id);assert.equal(a.range,620);assert.equal(a.cost,2);assert.equal(a.channelProfile.costPerSecond,9);assert.equal(a.maxHits,Infinity);
 assert.match(abilitySummary(a),/every enemy.*shield.*25%/);assert.equal(getAbilityById(id).range,340,'Original stays unchanged');
});
check('Every enemy in a 15-target line is hit, including far targets; off-path, behind, friendly and beyond-range targets are excluded',()=>{
 const f=fixture();f.w.enemies=Array.from({length:15},(_,i)=>foe(275+i*38,320,i));
 const excluded=[foe(800,390),foe(180),foe(1100),{...foe(400),friendly:true}];f.w.enemies.push(...excluded);cast(f);tick(f,.05);
 assert(f.w.enemies.slice(0,15).every(e=>e.hp<e.maxHp));assert(excluded.every(e=>e.hp===e.maxHp));
 assert(f.w.effects.filter(e=>e.geometry==='spectralHostImpact').length<=6,'Bounded impact visuals with uncapped damage');
});
check('Walls stop both the damaging path and its visual endpoint',()=>{
 const f=fixture();for(const row of f.w.tiles)row[16].passable=false;
 const before=foe(450),after=foe(600);f.w.enemies=[before,after];cast(f);tick(f,.05);
 assert(before.hp<before.maxHp);assert.equal(after.hp,after.maxHp);
 assert(f.w.effects.filter(e=>e.geometry==='spectralHost').every(e=>e.range<275));
});
check('Shield immediately reduces damage by 25%, renews while held, expires after release, and protects only its caster',()=>{
 const f=fixture(),ally=fixture().p;ally.id='ally';f.p.coop={players:[ally]};cast(f);
 assert.equal(mitigateSubclassDamage(f.p,null,100,f.now),75);assert.equal(mitigateSubclassDamage(ally,null,100,f.now),100);
 for(let i=1;i<=40;i++)tick(f,i*.05);assert.equal(mitigateSubclassDamage(f.p,null,100,f.now+2),75);
 tick(f,2.05,.05,{...aim,ability0Held:false});assert.equal(f.p.activeChannel,null);
 assert.equal(mitigateSubclassDamage(f.p,null,100,f.now+2.8),100);
});
check('Shield does not alter another defensive buff and clears on morph change, death or world change',()=>{
 const f=fixture();const original={timer:4,reduction:.4};f.p.buffs={defense:original};cast(f);assert.equal(f.p.buffs.defense,original);
 clearAbilityMorphCombatState(f.p,id);assert.equal(mitigateSubclassDamage(f.p,null,100,f.now),100);
 for(const reason of ['death','worldChanged']){const g=fixture();cast(g);clearSubclassCombatState(g.p,reason);assert.equal(mitigateSubclassDamage(g.p,null,100,g.now),100);}
});
check('Three seconds of real channel payments cost less than the previous morph, and exhaustion or dodge stops it',()=>{
 const f=fixture(),before=f.p.spirit;cast(f);for(let i=1;i<=60;i++)tick(f,i*.05);
 assert(before-f.p.spirit<32,'Previous raw upkeep alone cost 36 Spirit');
 const low=fixture();low.p.spirit=2;cast(low);tick(low,.3);assert.equal(low.p.activeChannel,null);
 const dodge=fixture();cast(dodge);tick(dodge,.05,.05,{...aim,dashPressed:true});assert.equal(dodge.p.activeChannel,null);
});
check('Diagonal aiming and steering damage all aligned targets, with no caster shield in other forms',()=>{
 const f=fixture();f.w.enemies=[foe(400,480),foe(600,680),foe(680,760)];
 const input={...aim,combatAimX:Math.SQRT1_2,combatAimY:Math.SQRT1_2};assert(useAbility(0,f.p,f.w,()=>{},f.now,input));tick(f,.05,.05,input);
 assert(f.w.enemies.every(e=>e.hp<e.maxHp));
 const east=foe(650);f.w.enemies.push(east);tick(f,.55,.5,aim);assert(east.hp<east.maxHp,'Channel turns to the new aim and hits the new path');
 for(const form of ['base','deathknight']){const g=fixture(form);cast(g);assert(!getSubclassCombatState(g.p)?.hostWard);}
});
check('Transforming beam gear retains the all-enemy piercing rule',()=>{
 const f=fixture();f.p.equipment={weapon:'blightedStarWeapon',helm:'blightedStarHelm',trinket:'blightedStarTrinket'};
 cast(f);assert.equal(f.p.activeChannel.mythicalMode,'starChain');
 f.w.enemies=Array.from({length:12},(_,i)=>foe(280+i*35,320,i));tick(f,.05);assert(f.w.enemies.every(e=>e.hp<e.maxHp));
});
fs.mkdirSync('docs/acolyte-host',{recursive:true});fs.writeFileSync('docs/acolyte-host/verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');
console.log(`Acolyte Host: ${checks.length} checks passed.`);

