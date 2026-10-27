import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility,updateAbilityInput,updateCombat,updateEnemies,applySummonThornRetaliation} from '../src/combat.js';
import {applyTargetDamage,createEnemyArchetype} from '../src/enemyBehaviors.js';
import {beginBasicEnemyAttack} from '../src/enemyAttackPresentation.js';
import {getSubclassCombatState,clearSubclassCombatState,clearAbilityMorphCombatState,mitigateSubclassDamage} from '../src/subclassCombat.js';
import {getRoseMantle,updateRoseMantle,roseMantleThorns} from '../src/roseMantleSystem.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const id='thornbinderLivingBriar',checks=[],samples=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);},close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(morph='fae'){
 now=100;const p=createPlayer('Rose mantle');chooseClass(p,'thornbinder');p.skillState.combat.level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0});
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};updateCombat(p,w,{},0,now,()=>{});p.spirit=p.maxSpirit=10000;
 for(const skill of ['thornbinderSummonThornlings',id]){unlockActiveAbility(p,skill,{autoAssignEmpty:false});getAbilityMastery(p,skill,true).level=20;assert(selectAbilityMorph(p,skill,skill===id?'petalknight':morph,now).ok);}
 assert(useAbility('thornbinderSummonThornlings',p,w,()=>{},now));p.loadout.abilitySlots=[id,null,null,null,'block'];p.hp=p.maxHp*.2;
 for(const [i,s] of p.summons.entries()){s.x=440+i*20;s.y=400;s.hp=s.maxHp*.2;}
 const e=createEnemyArchetype('shieldKnight','Mantle attacker',15,12,{id:'attacker'});Object.assign(e,{x:470,y:400,hp:100000,maxHp:100000,damage:40,dmg:40,armour:0,attackCooldown:99,chargeCooldown:99,specialCooldown:99,aggro:3,awakened:true,combatTargetKind:'player',combatTargetId:p.id});w.enemies=[e];
 const aim={combatAimX:1,combatAimY:0,hasAim:true};return {p,w,e,aim,cast(){return useAbility(0,p,w,()=>{},now,aim);},charge(seconds){assert(updateAbilityInput(p,w,{...aim,ability0Pressed:true,ability0Held:true},0,now,()=>{}));now+=seconds;assert(updateAbilityInput(p,w,{...aim,ability0Held:true},seconds,now,()=>{}));assert(updateAbilityInput(p,w,{...aim,ability0Released:true},0,now,()=>{}));},advance(seconds){for(let i=0;i<Math.round(seconds/.025);i++){now+=.025;updateCombat(p,w,{},.025,now,()=>{});}}};
}
test('tap and full-charge heal self and every nearby summon once, then regenerate for exactly six seconds',()=>{
 for(const seconds of [.01,1]){const c=setup(),actors=[c.p,...c.p.summons],before=actors.map(a=>a.hp),xp=getAbilityMastery(c.p,id).xp,spirit=c.p.spirit;c.charge(seconds);const m=getRoseMantle(c.p,now,c.w);assert(m);assert.equal(m.members.length,4);assert(!c.p.activeChannel&&!c.p.abilityCharge);assert.equal(m.until-now,6);
  for(const [i,a] of actors.entries()){close(a.hp-before[i],a.maxHp*m.profile.burst);assert.equal(getRoseMantle(a,now,c.w),m);}
  samples.push({...m.profile,cost:spirit-c.p.spirit});assert(!c.cast(),'cooldown permits repeated heal');const hp=actors.map(a=>a.hp);c.advance(6);for(const [i,a] of actors.entries())close(a.hp-hp[i],a.maxHp*m.profile.regen*6);assert(!getRoseMantle(c.p,now+.01,c.w));assert.equal(getAbilityMastery(c.p,id).xp,xp);assert.equal(c.e.hp,c.e.maxHp,'support cast attacked enemies');
 }
 assert(samples[1].burst>samples[0].burst);assert(samples[1].regen>samples[0].regen,JSON.stringify(samples));assert(samples[1].reduction>samples[0].reduction);assert(samples[1].cost>samples[0].cost);
});
test('buff follows recipients after leaving the cast area; far, covered, dead and unrelated actors are excluded',()=>{
 const c=setup(),[s,covered,far]=c.p.summons;s.hp=s.maxHp*.5;covered.y=480;far.x=900;for(let x=0;x<c.w.width;x++)c.w.tiles[14][x].passable=false;
 const ally=createPlayer('Ally');ally.x=410;ally.y=400;ally.hp=20;c.p.coop={players:[ally]};const hp=ally.hp;assert(c.cast());assert(getRoseMantle(s));assert(!getRoseMantle(covered));assert(!getRoseMantle(far));assert(!getRoseMantle(ally));assert.equal(ally.hp,hp);
 const before=s.hp;s.x=900;now+=1;updateRoseMantle(c.p,c.w,now);assert(s.hp>before);assert(getRoseMantle(s));
});
test('real advanced hits reduce player and summon damage and return only small nearby thorns',()=>{
 const c=setup();c.p.summons[0].hp=c.p.summons[0].maxHp*.8;assert(c.cast());const m=getRoseMantle(c.p),s=c.p.summons[0],pHp=c.p.hp,sHp=s.hp;
 const result=applyTargetDamage(c.e,s,40,c.w,()=>{},{now});assert(result.hpDamage<Math.ceil(40*(1-Math.min(.45,s.armour/100))));assert(s.hp<sHp);assert(c.e.hp<c.e.maxHp);
 const petEntry=Object.values(c.e.combatContributors)[0];assert.equal(petEntry.actor,c.p);assert(petEntry.abilities[id]>0);const petDamage=c.e.maxHp-c.e.hp;assert(petDamage<=Math.ceil(result.hpDamage*m.profile.reflect)+1);
 const after=c.e.hp;applyTargetDamage(c.e,s,40,c.w,()=>{},{now});assert.equal(c.e.hp,after,'summon reflection duplicated within cooldown');
 now+=1;applyTargetDamage(c.e,c.p,40,c.w,()=>{},{now});assert(c.p.hp<pHp);assert(getSubclassCombatState(c.p).replies.some(r=>r.mantleReflection));c.advance(.025);assert(c.e.hp<after);assert(!getSubclassCombatState(c.p).roseGuard,'mantle reflection generated offensive Roseguard');
});
test('old and advanced production basic attacks both respect summon protection and thorns',()=>{
 for(const kind of ['legacyMantleTest','shieldKnight']){const c=setup();const s=c.p.summons[0];s.hp=s.maxHp*.8;c.cast();c.e.kind=c.e.archetype=kind;c.e.x=s.x+22;const hp=s.hp;assert(beginBasicEnemyAttack(c.e,s,now,40));for(let i=0;i<40;i++){now+=1/60;updateEnemies(1/60,c.p,c.w,()=>{},now);}assert(s.hp<hp);assert(c.e.hp<c.e.maxHp);assert(hp-s.hp<40);}
});
test('existing rose summon thorns take priority, sharing one cooldown without additive reflection',()=>{
 const c=setup('petalknight');c.cast();const s=c.p.summons[0],m=getRoseMantle(s);assert(m);const value=applySummonThornRetaliation(s,c.e,c.w,10,now,()=>{},c.p);assert(value<=3.5+.001);assert(value>roseMantleThorns(s,10,now,c.w).damage);assert.equal(applySummonThornRetaliation(s,c.e,c.w,10,now,()=>{},c.p),0);
});
test('reflection obeys caster attribution, walls, range and successful dodge immunity',()=>{
 const c=setup();const s=c.p.summons[0];s.hp=s.maxHp*.8;c.cast();c.e.eliteModifier='artillery';c.e.telegraph={kind:'artillery',time:1};const source={...c.e,x:s.x,y:s.y,combatSource:c.e};applyTargetDamage(source,s,40,c.w,()=>{},{now});assert(c.e.hp<c.e.maxHp);assert.equal(source.hp,source.maxHp);assert(c.e.telegraph);
 now+=1;c.e.x=s.x+180;const hp=c.e.hp;applyTargetDamage({...source,combatSource:c.e},s,40,c.w,()=>{},{now});assert.equal(c.e.hp,hp);
 c.p.invulnerableUntil=now+1;const ownHp=c.p.hp;applyTargetDamage(c.e,c.p,40,c.w,()=>{},{now});assert.equal(c.p.hp,ownHp);assert(!getSubclassCombatState(c.p).replies.length);
});
test('healing cannot resurrect, overheal, duplicate at the same time, or persist after dismissal and cleanup',()=>{
 const c=setup();c.p.hp=c.p.maxHp;const [dead,full,dismissed]=c.p.summons;dead.hp=0;full.hp=full.maxHp;dismissed.dismissed=true;const hp=dismissed.hp;c.cast();assert(!getRoseMantle(dead));assert(!getRoseMantle(dismissed));assert.equal(dead.hp,0);assert.equal(full.hp,full.maxHp);now+=1;updateRoseMantle(c.p,c.w,now);assert.equal(c.p.hp,c.p.maxHp);assert.equal(dismissed.hp,hp);const once=full.hp;updateRoseMantle(c.p,c.w,now);assert.equal(full.hp,once);
 for(const reason of ['death','morph','world','dismissal']){const q=setup();q.cast();const s=q.p.summons[0],before=s.hp;if(reason==='death')q.p.hp=0;else if(reason==='morph')clearAbilityMorphCombatState(q.p,id);else if(reason==='world')clearSubclassCombatState(q.p,'worldChanged');else q.p.summons=[];now+=1;updateRoseMantle(q.p,q.w,now);assert.equal(s.hp,before,reason);assert(!getRoseMantle(s));}
});
test('recast replaces rather than stacks and timed state is absent from saves',()=>{
 const c=setup();c.cast();const old=getRoseMantle(c.p);c.p.cooldowns={};c.cast();const fresh=getRoseMantle(c.p);assert.notEqual(old,fresh);assert.equal(old.active,false);assert.equal(fresh.members.length,4);assert(!JSON.stringify(sanitizeForSave(c.p)).includes('mantleVisual'));
});
test('Expertise scales healing and defense once within caps; player and summons can retain other wards',()=>{
 const values=[];for(const spec of [null,'petalknight','fae']){const c=setup();if(spec)c.p.skillTree.spent[expertiseNodeId('thornbinder',spec)]=1;c.cast();values.push(getRoseMantle(c.p).profile);assert(mitigateSubclassDamage(c.p,null,100,now)<100);}
 close(values[1].burst/values[0].burst,1.15);close(values[1].regen/values[0].regen,1.15);close(values[2].reduction/values[0].reduction,.9);
});
fs.mkdirSync('docs/rose-mantle',{recursive:true});fs.writeFileSync('docs/rose-mantle/verification.json',JSON.stringify({checks,samples},null,2));console.log(JSON.stringify({passed:checks.length,samples}));
