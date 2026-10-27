import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery,applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat,updateSummons} from '../src/combat.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {getSubclassCombatState,clearAbilityMorphCombatState,clearSubclassCombatState,mitigateSubclassDamage} from '../src/subclassCombat.js';
import {getPetalStorm,restorePetalStormHealth,PETAL_STORM} from '../src/petalStormSustain.js';
import {SKILL_TREE_NODES} from '../src/skillTreeSystem.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const id='thornbinderThornstorm',aim={combatAimX:1,combatAimY:0,hasAim:true},report={checks:[]};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
function setup(){
 now=100;const p=createPlayer('Petal storm review');chooseClass(p,'thornbinder');p.skillState.combat.level=33;for(const v of Object.values(p.skillState.skills))v.level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0});
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};updateCombat(p,w,{},0,now,()=>{});p.spirit=p.maxSpirit=p.stamina=p.maxStamina=10000;p.maxHp=10000;p.hp=5000;
 const learn=(skill,family='petalknight')=>{unlockActiveAbility(p,skill,{autoAssignEmpty:false});getAbilityMastery(p,skill,true).level=20;assert(selectAbilityMorph(p,skill,family,now).ok);};learn(id);p.loadout.abilitySlots=[id,null,null,null,'block'];
 return {p,w,learn,cast(){return useAbility(0,p,w,()=>{},now,aim);},tick(dt=.025){now+=dt;updateCombat(p,w,{},dt,now,()=>{});for(const fx of w.effects)fx.age+=dt;w.effects=w.effects.filter(f=>f.age<f.ttl);},run(seconds){for(let i=0;i<Math.ceil(seconds/.025);i++)this.tick();},foe(x=460,y=400){const e={id:'e'+w.enemies.length,kind:'brute',x,y,radius:12,hp:100000,maxHp:100000,xp:0};w.enemies.push(e);return e;}};
}
test('single press pays once, starts no channel, lasts exactly seven seconds, and has a real cooldown',()=>{
 const c=setup(),a=resolveAbilityMorph(c.p,id,'petalknight'),effective=applyAbilityMastery(c.p,a),before=c.p.spirit,xp=getAbilityMastery(c.p,id).xp;assert(!a.channelProfile&&!a.canCharge&&a.noUseCharges);assert(c.cast());assert.equal(before-c.p.spirit,effective.cost);assert(!c.p.activeChannel);assert(!c.cast());assert.equal(getPetalStorm(c.p).until-now,7);assert.equal(mitigateSubclassDamage(c.p,null,100,now),80);c.run(6.9);assert(getPetalStorm(c.p));assert(c.p.spirit>=before-effective.cost);c.run(.125);assert(!getPetalStorm(c.p));assert.equal(mitigateSubclassDamage(c.p,null,100,now),100);assert(!getSubclassCombatState(c.p).fields.length);assert.equal(getAbilityMastery(c.p,id).xp,xp);
});
test('hits every enemy inside the true radius, blocks terrain and follows the player immediately',()=>{
 const c=setup();for(let i=0;i<24;i++){const a=i*Math.PI*2/24;c.foe(400+Math.cos(a)*110,400+Math.sin(a)*110);}const outside=c.foe(576,400);assert(c.cast());c.run(.3);assert(c.w.enemies.slice(0,24).every(e=>e.hp<e.maxHp));assert.equal(outside.hp,outside.maxHp);
 const old=c.w.enemies[0],health=old.hp;c.p.x+=300;const next=c.foe(c.p.x+60,c.p.y);c.run(.5);assert.equal(old.hp,health);assert(next.hp<next.maxHp);const f=getSubclassCombatState(c.p).fields[0];assert.equal(f.x,c.p.x);assert.equal(f.y,c.p.y);assert.equal(f.stormVisual.owner,c.p);
 const wall=setup(),e=wall.foe();wall.w.encounterBarriers=[{x:425,y:250,w:5,h:250}];assert(wall.cast());wall.run(1.5);assert.equal(e.hp,e.maxHp);
});
test('storm damage heals exactly five percent of actual loss; weapons and summons share the same drain',()=>{
 const c=setup(),e=c.foe(),hp=c.p.hp;assert(c.cast());c.run(.3);assert(Math.abs((c.p.hp-hp)-(e.maxHp-e.hp)*.05)<1e-7);
 c.p.equipment.weapon='oathkeepersMace';e.x=c.p.x+30;e.y=c.p.y;const eh=e.hp,ph=c.p.hp;assert(requestBasicAttack(c.p,c.w,aim,()=>{},now));for(let i=0;c.p.combatState.attacking&&i<200;i++){now+=.01;updateWeaponCombat(c.p,c.w,aim,.01,now,()=>{});}assert(e.hp<eh);assert(Math.abs((c.p.hp-ph)-(eh-e.hp)*.05)<1e-7);
 c.learn('thornbinderSummonThornlings');assert(useAbility('thornbinderSummonThornlings',c.p,c.w,()=>{},now,aim));for(const s of c.p.summons){s.x=e.x-15;s.y=e.y;s.nextAttackAt=0;s.attackCooldown=0;}
 const before=e.hp,health=c.p.hp;for(let i=0;i<20;i++){now+=.025;updateSummons(.025,c.p,c.w,()=>{},now);}assert(e.hp<before);assert(Math.abs((c.p.hp-health)-(before-e.hp)*.05)<1e-7);
});
test('drain is capped, never overheals or resurrects, and does not heal allies or return mitigated damage',()=>{
 const c=setup(),e=c.foe();assert(c.cast());const start=c.p.hp;assert.equal(restorePetalStormHealth(c.p,100000,e,now),200);assert.equal(restorePetalStormHealth(c.p,100000,e,now),0);now+=.5;assert.equal(restorePetalStormHealth(c.p,100000,e,now),100);assert.equal(c.p.hp-start,300);c.p.hp=c.p.maxHp;assert.equal(restorePetalStormHealth(c.p,10000,e,now),0);c.p.hp=0;assert.equal(restorePetalStormHealth(c.p,10000,e,now),0);
 const over=setup(),victim=over.foe();victim.hp=2;assert(over.cast());const hp=over.p.hp;over.run(.3);assert.equal(victim.hp,0);assert(Math.abs(over.p.hp-hp-.1)<1e-7);const ally={hp:40,maxHp:100};over.w.players=[over.p,ally];assert.equal(ally.hp,40);
});
test('Expertise scales damage, protection and drain once without extending seven seconds',()=>{
 const c=setup();c.p.skillTree.spent[expertiseNodeId('thornbinder','petalknight')]=1;const e=c.foe(),hp=c.p.hp;assert(c.cast());assert.equal(getPetalStorm(c.p).until-now,7);assert.equal(mitigateSubclassDamage(c.p,null,100,now),77);c.run(.3);assert(Math.abs((c.p.hp-hp)-(e.maxHp-e.hp)*.0575)<1e-7);
});
test('injured owned summons share twenty percent inside the storm, with no overheal, revival or healing through walls',()=>{
 const c=setup(),e=c.foe();assert(c.cast());const pet=(hp,maxHp,x=c.p.x+25)=>({hp,maxHp,x,y:c.p.y,alive:true});const a=pet(50,100),b=pet(25,150),full=pet(100,100),dead=pet(0,100),far=pet(50,100,c.p.x+200),expired={...pet(50,100),expiresAt:99},blocked=pet(50,100,c.p.x+60);
 c.p.summons=[a,b,a,full,dead,far,expired,blocked];c.w.encounterBarriers=[{x:445,y:250,w:5,h:300}];const hp=c.p.hp;assert.equal(restorePetalStormHealth(c.p,100,e,now),4);assert.equal(c.p.hp-hp,4);assert(Math.abs(a.hp-50-1*50/175)<1e-7);assert(Math.abs(b.hp-25-1*125/175)<1e-7);assert.equal(full.hp,100);assert.equal(dead.hp,0);assert.equal(far.hp,50);assert.equal(expired.hp,50);assert.equal(blocked.hp,50);
 c.p.hp=c.p.maxHp;const before=a.hp+b.hp;restorePetalStormHealth(c.p,100,e,now);assert(Math.abs(a.hp+b.hp-before-1)<1e-7);assert.equal(c.p.hp,c.p.maxHp);
 a.hp=a.maxHp-.1;b.hp=b.maxHp;assert(restorePetalStormHealth(c.p,100,e,now)>=0);assert.equal(a.hp,a.maxHp);assert.equal(b.hp,b.maxHp);
 c.run(7.1);a.hp=50;assert.equal(restorePetalStormHealth(c.p,100,e,now),0);assert.equal(a.hp,50);
});
test('summon count cannot multiply the shared healing cap; real storm damage heals an injured companion',()=>{
 for(const count of [1,3,12]){const c=setup(),e=c.foe();assert(c.cast());c.p.summons=Array.from({length:count},()=>({hp:50,maxHp:1000,x:420,y:400,alive:true}));const before=c.p.hp+count*50;restorePetalStormHealth(c.p,100000,e,now);const total=c.p.hp+c.p.summons.reduce((n,p)=>n+p.hp,0)-before;assert(Math.abs(total-200)<1e-7);assert.equal(restorePetalStormHealth(c.p,100000,e,now),0);}
 const c=setup(),e=c.foe(),pet={hp:50,maxHp:100,x:420,y:400,alive:true};c.p.summons=[pet];const before=c.p.hp;assert(c.cast());c.run(.3);const restored=(e.maxHp-e.hp)*.05;assert(Math.abs(c.p.hp-before-restored*.8)<1e-7);assert(Math.abs(pet.hp-50-restored*.2)<1e-7);
});
test('recast replaces the field; death, inactivity, morph switch, respec and world changes clean up visuals and buffs',()=>{
 for(const reason of ['recast','death','inactive','morph','forget','clear','world']){const c=setup();assert(c.cast());const old=getPetalStorm(c.p);if(reason==='recast'){c.p.cooldowns={};assert(c.cast());assert.notEqual(getPetalStorm(c.p),old);assert.equal(getSubclassCombatState(c.p).fields.length,1);}else{if(reason==='death')c.p.hp=0;if(reason==='inactive')c.p.active=false;if(reason==='morph'){c.p.abilityMorphs[id]='fae';clearAbilityMorphCombatState(c.p,id);}if(reason==='forget'){c.p.knownAbilities=c.p.knownAbilities.filter(a=>a!==id);c.p.unlockedAbilities=c.p.unlockedAbilities.filter(a=>a!==id);c.p.loadout.abilitySlots=c.p.loadout.abilitySlots.map(a=>a===id?null:a);for(const n of Object.values(SKILL_TREE_NODES))if(n.unlocksAbility===id){delete c.p.skillTree.spent[n.id];delete c.p.skillTreeProgress[n.id];}}if(reason==='clear')clearSubclassCombatState(c.p);if(reason==='world')updateCombat(c.p,{...c.w},aim,0,now,()=>{});else c.tick();assert(!getPetalStorm(c.p),reason);}assert.equal(old.active,false,reason);}
 const c=setup();assert(c.cast());c.w.effects=[];c.run(.4);assert.equal(c.w.effects.filter(f=>f.geometry==='petalStorm').length,2);
});
fs.mkdirSync('docs/petalknight-storm',{recursive:true});fs.writeFileSync('docs/petalknight-storm/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,balance:PETAL_STORM}));
