import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';import {ABILITIES,getAbilityById} from '../src/data.js';import {SUBCLASSES} from '../src/subclassData.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';import {getAbilityMastery} from '../src/abilityMasterySystem.js';import {selectAbilityMorph} from '../src/abilityMorphSystem.js';import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat} from '../src/combat.js';import {getSubclassCombatState,mitigateSubclassDamage,getSubclassMovementMultiplier,clearSubclassCombatState} from '../src/subclassCombat.js';import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});const report={checks:[],skills:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
function setup(id='fellhunterThrowingDaggers',rank='normal'){
 now=100;const p=createPlayer('Hellstalker review');chooseClass(p,'fellhunter');p.skillState.combat.level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0,spiritAwakened:true});
 const w={mode:'dungeon',width:70,height:50,tiles:Array.from({length:50},()=>Array.from({length:70},()=>({passable:true,biome:'grass'}))),enemies:[],effects:[],objects:[],drops:[]};updateCombat(p,w,{},0,now,()=>{});p.spirit=p.maxSpirit=10000;p.stamina=p.maxStamina=10000;p.hp=p.maxHp*.5;
 const e={id:'target',kind:'brute',name:'Durable foe',x:460,y:400,hp:100000,maxHp:100000,radius:12,...(rank==='boss'?{isBoss:true}:rank==='elite'?{isElite:true,elite:true}:{})};w.enemies=[e];
 // These are deliberately isolated skill tests, not legacy-save unlock migration.
 p.skillTree.respecVersion=1;
 function learn(id){unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,'hellstalker',now).ok);}learn(id);p.loadout.abilitySlots=[id,null,null,null,'block'];const input={combatAimX:1,combatAimY:0,hasAim:true};
 return {p,w,e,input,learn,cast(id=p.loadout.abilitySlots[0]){return useAbility(id===p.loadout.abilitySlots[0]?0:id,p,w,()=>{},now,input);},refresh(){p.spirit=10000;p.cooldowns={};p.abilityUseCharges={};},advance(seconds){for(let i=0;i<Math.ceil(seconds/.025);i++){now+=.025;updateCombat(p,w,input,.025,now,()=>{});}}};
}
const entry=c=>getSubclassCombatState(c.p)?.afflictions.get(c.e)?.effects.get('hellstalker');
test('original catalogue remains exact; authored Hellstalker changes are covered by verify-fellhunter-identity',()=>{
 // Bloodhound are intentionally authored in the subsequent full
 // Fellhunter pass; verify-fellhunter covers their new runtime behavior.
 const saved=JSON.parse(fs.readFileSync('backups/hellstalker-bows-2026-10-13/protected-fellhunter.json','utf8'));for(const v of saved.abilities.filter(v=>v.family==='base'))assert.deepEqual(JSON.parse(JSON.stringify(getAbilityById(v.ability.id))),v.ability);
});
test('all fifteen infernal skills cast, pay Spirit, preserve mastery and bound state',()=>{
 for(const base of ABILITIES.filter(a=>a.classId==='fellhunter')){const c=setup(base.id),a=resolveAbilityMorph(c.p,base,'hellstalker'),xp=getAbilityMastery(c.p,base.id).xp,hp=c.p.hp;assert(a.hellSkill);assert(c.cast(),base.id);assert(c.p.spirit<10000);const f=getSubclassCombatState(c.p)?.fields[0];if(f){c.e.x=f.x;c.e.y=f.y;}c.advance(2);assert.equal(getAbilityMastery(c.p,base.id).xp,xp);assert.equal(c.p.hp,hp,'No hidden healing or health costs');const s=getSubclassCombatState(c.p);assert(s.fields.length<=12&&s.shots.length<=32&&s.afflictions.size<=64);report.skills.push({id:base.id,mode:a.subclassMode,cost:a.cost,cooldown:a.cd,damage:100000-c.e.hp});}
 assert.equal(report.skills.length,15);
});
test('one hit leaves a short hard-ticking burn; spaced hits ramp one brand, not independent burns',()=>{
 const c=setup();c.cast();c.advance(.2);assert.equal(entry(c).stacks,1);const direct=100000-c.e.hp;c.advance(1.3);const burn=100000-c.e.hp-direct;assert(burn>direct*.7);assert.equal(getSubclassCombatState(c.p).afflictions.get(c.e).effects.size,1);c.advance(.6);assert(!entry(c));const ended=c.e.hp;c.advance(2);assert.equal(c.e.hp,ended);report.burn={direct,burn};
 const q=setup();for(let i=0;i<3;i++){q.refresh();q.cast();q.advance(.65);assert.equal(entry(q).stacks,i+1);}assert(entry(q).damage>direct*.25);
});
test('five simultaneous spell bolts share one Ember cadence and prepared casts consume three Embers for Flashover',()=>{
 const c=setup('fellhunterFlamingArrowVolley');c.cast();assert.equal(getSubclassCombatState(c.p).shots.length,5);c.advance(.2);assert.equal(entry(c).stacks,1);
 const q=setup();for(let i=0;i<3;i++){q.refresh();q.cast();q.advance(.65);}q.learn('fellhunterMarkedShot');q.refresh();const before=q.e.hp;q.cast('fellhunterMarkedShot');q.advance(.15);assert.equal(entry(q).stacks,1);assert(q.w.effects.some(f=>f.geometry==='flashover'));assert(q.e.hp<before);
 const r=setup('fellhunterMarkedShot');r.cast();r.advance(.15);assert(!r.w.effects.some(f=>f.geometry==='flashover'));
});
test('Cinder Pace rewards hits; exposure increases real damage, expires and never overrides zero-damage defenses',()=>{
 const c=setup();assert.equal(mitigateSubclassDamage(c.p,null,100,now),100);c.cast();assert.equal(mitigateSubclassDamage(c.p,null,100,now),110);assert.equal(mitigateSubclassDamage(c.p,null,0,now),0);c.advance(.2);assert(getSubclassMovementMultiplier(c.p,now)>1);c.advance(1.4);assert.equal(getSubclassMovementMultiplier(c.p,now),1);c.advance(4);assert.equal(mitigateSubclassDamage(c.p,null,100,now),100);
});
test('mobility travels in the correct direction, leaves real fields or shots and respects solid terrain',()=>{
 for(const id of ['fellhunterGrapplingHook','fellhunterSmokeBomb','fellhunterVaultingShot']){const c=setup(id),x=c.p.x;c.cast();assert(id==='fellhunterGrapplingHook'?c.p.x>x:c.p.x<x);const s=getSubclassCombatState(c.p);assert(id==='fellhunterVaultingShot'?s.shots.length===1:s.fields.length===1);c.advance(.3);if(id==='fellhunterVaultingShot')assert(c.e.hp<100000);}
 const q=setup('fellhunterGrapplingHook');q.p.x=400;for(let y=0;y<q.w.height;y++)q.w.tiles[y][13].passable=false;const spirit=q.p.spirit;q.cast();assert(q.p.x<416);assert.equal(q.p.spirit,spirit);assert(!(getSubclassCombatState(q.p)?.hellExposureUntil>now));
});
test('fields replace themselves, preserve authored duration and root bosses safely; terrain blocks outgoing hits',()=>{
 const c=setup('fellhunterKillZone');c.cast();let s=getSubclassCombatState(c.p);assert.equal(s.fields[0].until-now,7);c.refresh();c.cast();assert.equal(s.fields.length,1);
 for(const rank of ['normal','elite','boss']){const q=setup('fellhunterBearTrap',rank);q.cast();const f=getSubclassCombatState(q.p).fields[0];q.e.x=f.x;q.e.y=f.y;q.advance(.65);if(rank==='boss')assert(!(q.e.rootUntil>now));else assert(q.e.rootUntil>now);}
 const q=setup();for(let y=0;y<q.w.height;y++)q.w.tiles[y][14].passable=false;q.cast();q.advance(.5);assert.equal(q.e.hp,100000);
});
test('Execution Window is offensive only, strengthens brands, and Expertise scales class damage once',()=>{
 const c=setup('fellhunterExecutionWindow');c.learn('fellhunterThrowingDaggers');c.cast();assert(!c.p.buffs?.defense);assert.equal(c.e.hp,100000);c.cast('fellhunterThrowingDaggers');c.advance(.2);const empowered=entry(c).damage;
 const q=setup();q.cast();q.advance(.2);assert(empowered>entry(q).damage*1.15);
 const damage=[];for(const family of [null,'hellstalker','bloodhound']){const r=setup();if(family)r.p.skillTree.spent[expertiseNodeId('fellhunter',family)]=1;r.cast();r.advance(.2);damage.push(100000-r.e.hp);clearSubclassCombatState(r.p);assert(!getSubclassCombatState(r.p));}assert(Math.abs(damage[1]/damage[0]-1.15)<.08);assert(Math.abs(damage[2]/damage[0]-.9)<.08);report.expertise=damage;
});
test('Fellhunter tree investment still strengthens infernal shots and trap setup',()=>{
 const c=setup('fellhunterMarkedShot');c.cast();c.advance(.2);const base=100000-c.e.hp;
 const q=setup('fellhunterMarkedShot');q.p.skillTree.spent.archery_contract_mark=1;q.cast();q.advance(.2);assert(100000-q.e.hp>base*1.1);
 const r=setup('fellhunterBearTrap');r.p.skillTree.spent.archery_root=1;r.cast();assert(getSubclassCombatState(r.p).fields[0].armAt-now<.55);
 const g=setup('fellhunterGrapplingHook');g.p.skillTree.spent.archery_mobility=1;const x=g.p.x;g.cast();assert(g.p.x-x>185);
});
fs.mkdirSync('docs/fellhunter-hellstalker',{recursive:true});fs.writeFileSync('docs/fellhunter-hellstalker/verification.json',JSON.stringify(report,null,2));


