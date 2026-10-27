import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass} from '../src/player.js';
import {createEnemyArchetype} from '../src/enemyBehaviors.js';
import {updateEnemies,updateCombat,useAbility} from '../src/combat.js';
import {getEnemyAttackProfile} from '../src/animationProfiles.js';
import {ENEMY_KINDS} from '../src/enemyVisualProfiles.js';
import {getHumanoidEnemyActor,ensureHumanoidEnemyEquipment} from '../src/humanoidEnemies.js';
import {getBasicEnemyAttack,getEnemyCharge,sampleEnemyAttackPresentation,beginBasicEnemyAttack} from '../src/enemyAttackPresentation.js';
import {enemyTelegraphGeometry,telegraphContainsPoint} from '../src/enemyTelegraphGeometry.js';
import {recordEnemyHitReaction,sampleEnemyVisualState,recordEnemyContactImpact,recordEnemyDeathVisual} from '../src/combatFeedbackProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {updateEliteEncounters,getEliteHazards} from '../src/eliteEncounterSystem.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';

let clock=10;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const report={checks:[],families:[],phases:[],density:{}};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const player=()=>{const p=createPlayer('Enemy combat review');chooseClass(p,'oathkeeper');Object.assign(p,{id:'hero',x:320,y:320});return p;};
const enemy=(kind='roadlessBandit',extra={})=>{const e=createEnemyArchetype(kind,kind,9.5,10,{id:'combat-'+kind});Object.assign(e,{hp:10000,maxHp:10000,attackCooldown:0,chargeCooldown:99,specialCooldown:99,aggro:3,awakened:true,damage:4,dmg:4,...extra});ensureHumanoidEnemyEquipment(e);return e;};
const tick=(p,w,seconds,step=1/60)=>{for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=step){const dt=Math.min(step,seconds-elapsed);clock+=dt;updateEnemies(dt,p,w,()=>{},clock);for(const f of w.effects)f.age=(f.age||0)+dt;w.effects=w.effects.filter(f=>f.age<f.ttl);}};

test('all 15 live archetypes prepare before dealing damage and recover through production AI',()=>{
 for(const kind of ENEMY_KINDS){
  const p=player(),w=world(),ranged=['archer','cultist','gravePriest'].includes(kind),e=enemy(kind,{x:ranged?190:300,specialCooldown:kind==='stalkerWolf'?0:99});w.enemies=[e];
  const before=p.hp;tick(p,w,.1);assert.equal(p.hp,before,kind+' damaged before its windup');
  assert.ok(e.telegraph||getBasicEnemyAttack(e),kind+' missing preparation');
  tick(p,w,1.3);assert.ok(p.hp<before,kind+' never released a hit');
  report.families.push({kind,damage:before-p.hp,presentation:sampleEnemyAttackPresentation(e,clock)?.technique||'completed'});
 }
});
test('basic melee can miss a committed strike and never duplicates damage during recovery',()=>{
 const p=player(),w=world(),e=enemy();w.enemies=[e];tick(p,w,.1);assert.ok(getBasicEnemyAttack(e));
 p.x=430;const before=p.hp;tick(p,w,.6);assert.equal(p.hp,before);
 const q=player(),v=world(),f=enemy();v.enemies=[f];tick(q,v,.5);const hit=q.hp;assert.ok(hit<q.maxHp);tick(q,v,.2);assert.equal(q.hp,hit);
});
test('advanced attack cooldown decrements exactly once in the real coordinator',()=>{
 const p=player(),w=world(),e=enemy('archer',{x:180,attackCooldown:5});w.enemies=[e];tick(p,w,.25,.25);close(e.attackCooldown,4.75);
});
test('scheduled phase strikes release despite their already-started cooldown',()=>{
 const p=player(),w=world(),e=enemy('wraith',{x:300,attackCooldown:3});const profile=getEnemyAttackProfile('phaseStrike');
 e.telegraph={kind:'phaseStrike',...profile,x:p.x,y:p.y,time:.15,maxTime:.38,radius:48};w.enemies=[e];const before=p.hp;tick(p,w,.2);assert.ok(p.hp<before);
});
test('shared circle, cone, line, annulus and sequential geometry preserves safe areas and zero coordinates',()=>{
 const e={x:0,y:0};let g=enemyTelegraphGeometry(e,{kind:'slam',x:90,y:0,radius:74});assert.equal(g.x,0);assert(telegraphContainsPoint(g,73,0));assert(!telegraphContainsPoint(g,75,0));
 g=enemyTelegraphGeometry(e,{kind:'guardBreak',x:40,y:0,radius:46});assert(telegraphContainsPoint(g,30,0));assert(!telegraphContainsPoint(g,-30,0));assert(!telegraphContainsPoint(g,0,40));
 g=enemyTelegraphGeometry(e,{kind:'infernalRush',sourceX:0,sourceY:0,x:180,y:0,radius:200,chargeTravel:100,chargeWidth:18});assert.equal(g.endX,100);assert(telegraphContainsPoint(g,50,17));assert(!telegraphContainsPoint(g,50,19));
 const ring={shape:'annulus',x:0,y:0,radius:90,innerRadius:60};assert(!telegraphContainsPoint(ring,20,0));assert(telegraphContainsPoint(ring,70,0));
 assert(telegraphContainsPoint({shape:'sequence',zones:[g,ring]},70,30));
});
test('major source-centred strikes do not follow a dodging target during release',()=>{
 const p=player(),w=world(),e=enemy('brute',{x:300,attackCooldown:2});e.telegraph={kind:'slam',time:.1,maxTime:.9,pose:'overhead',x:p.x,y:p.y,radius:74,recovery:.9};w.enemies=[e];
 p.x=400;const before=p.hp;tick(p,w,.15);assert.equal(p.hp,before);
});
test('stagger, freeze, root, silence and death cancel unfinished attacks without lingering poses',()=>{
 for(const control of ['stagger','freeze','root','silence','death']){
  const p=player(),w=world(),e=enemy('cultist',{x:190});w.enemies=[e];e.telegraph={kind:'curseBolt',time:.25,maxTime:.55,x:p.x,y:p.y,radius:200,pose:'channel'};
  if(control==='stagger')e.staggerTimer=1;else if(control==='freeze')e.subclassFrozenUntil=clock+1;
  else if(control==='root')e.rootUntil=clock+1;else if(control==='silence')e.subclassSilencedUntil=clock+1;else e.hp=0;
  const before=p.hp;tick(p,w,.35);assert.equal(p.hp,before,control);assert.equal(e.telegraph,null,control);assert.equal(sampleEnemyAttackPresentation(e,clock),null,control);
 }
});
test('cosmetic reactions preserve eastward direction, human proportions, and combat clocks',()=>{
 const p=player(),w=world(),e=enemy('archer',{x:180,attackCooldown:5});w.enemies=[e];
 recordEnemyHitReaction(e,{dirX:1,dirY:0,heavy:true});clock+=.08;const reaction=sampleEnemyVisualState(e,clock);assert.equal(reaction.y,0);assert.equal(reaction.scaleX,1);assert.equal(reaction.scaleY,1);
 e.hitStopTimer=1;tick(p,w,.25,.25);close(e.attackCooldown,4.75);
});
test('contact effects distinguish materials, are directional, bounded and restrained for sustained damage',()=>{
 const w=world(),e=enemy('gravebound',{x:100,y:100}),origin={x:50,y:100};
 for(const element of ['fire','ice','lightning','poison','necrotic','holy']){clock+=1;const fx=recordEnemyContactImpact(e,origin,w,{element,heavy:true});assert.equal(fx.material,element);assert(fx.x<e.x);assert(fx.y<e.y);assert.equal(fx.dirY,0);}
 const count=w.effects.length;for(let i=0;i<100;i++)recordEnemyContactImpact(e,origin,w,{dot:true});assert.equal(w.effects.length,count);
 clock+=1;const subtle=recordEnemyContactImpact(e,origin,w,{dot:true});assert(subtle.radius<11&&subtle.ttl<.17);
 const spectral=enemy('wraith');recordEnemyDeathVisual(spectral,{heavy:true});assert.equal(spectral.visualDeath.profileId,'magicDissolve');
});
test('all eight boss visuals use warning radii matching their actual phase damage areas',()=>{
 for(const bossType of ['veyrWarden','hollowElk','demonLord','seraphel','zephyrLight','redSealExecutioner','graveMawBear','briarTitan'])for(const phase of [1,2,3]){
  const p=player(),w=world(),e=enemy('brute',{isBoss:true,bossType,x:300});
  e.boss={type:bossType,phase,introShown:true,specialTimer:0};w.enemies=[e];tick(p,w,.02);const pending=e.boss.pendingSpecial;assert.ok(pending,bossType);
  const radius=bossType==='hollowElk'?[84,112,138][phase-1]:bossType==='demonLord'?[92,122,152][phase-1]:bossType==='seraphel'?[86,112,142][phase-1]:bossType==='zephyrLight'?[96,138,178][phase-1]:bossType==='veyrWarden'?[78,104,126][phase-1]:[70,94,118][phase-1];
  assert.equal(pending.radius,radius);assert.equal(pending.shape,'circle');p.x=e.x+radius+1;const before=p.hp;tick(p,w,pending.time+.08);assert.equal(p.hp,before,bossType+' hit outside warning');
  report.phases.push({bossType,phase,radius});
 }
});
test('enemy attacks and visual clocks cannot survive serialization',()=>{
 const p=player(),e=enemy();beginBasicEnemyAttack(e,p,clock,30);e.telegraph={time:.1,kind:'slam'};e.boss={pendingSpecial:{time:.1},phase:2};recordEnemyHitReaction(e);
 const saved=sanitizeForSave(e);assert.equal(saved.telegraph,undefined);assert.equal(saved.boss.pendingSpecial,undefined);assert.equal(saved.visualReaction,undefined);assert.equal(saved.boss.phase,2);assert.equal(sampleEnemyAttackPresentation(saved,clock),null);
});
test('boss special clocks continue during rapid basics and phases still advance',()=>{
 const p=player(),w=world(),e=enemy('basicBeast',{isBoss:true,attackRate:.35,x:300});p.hp=p.maxHp=10000;
 e.boss={type:'hollowElk',phase:1,introShown:true,specialTimer:6};w.enemies=[e];tick(p,w,6.2);
 assert(e.boss.specialTimer<.02||e.boss.pendingSpecial);tick(p,w,.8);assert(e.boss.pendingSpecial||e.boss.recoveryUntil>clock);
 e.hp=e.maxHp*.3;tick(p,w,4);assert.equal(e.boss.phase,3);
});
test('cancellation removes the actual humanoid pose and saved Exploders can restart',()=>{
 const p=player(),w=world(),e=enemy();w.enemies=[e];getHumanoidEnemyActor(e,clock);tick(p,w,.1);assert(getHumanoidEnemyActor(e,clock).combatState?.attacking);
 e.subclassFrozenUntil=clock+1;tick(p,w,.1);const actor=getHumanoidEnemyActor(e,clock);assert(!actor.combatState?.attacking&&!actor.visualAction);
 const f=enemy('exploder',{x:300,exploding:true});w.enemies=[f];tick(p,w,.1);assert.equal(f.telegraph?.kind,'detonate');
});
test('charges travel over frames, hit only once, and a sidestep escapes the locked corridor',()=>{
 for(const dodge of [false,true]){
  const p=player(),w=world(),e=enemy('brute',{x:170,attackCooldown:2});w.enemies=[e];
  e.telegraph={kind:'chargeRush',sourceX:170,sourceY:320,x:320,y:320,chargeTravel:150,chargeWidth:18,time:.1,maxTime:.65,recovery:.8,locked:true};
  tick(p,w,.11);assert(getEnemyCharge(e));close(e.x,170);const before=p.hp;
  if(dodge)p.y+=65;tick(p,w,.08);assert(e.x>170&&e.x<320);assert.equal(p.hp,before,'hit before charge contact');
  tick(p,w,.23);assert(!getEnemyCharge(e));if(dodge)assert.equal(p.hp,before);else assert(p.hp<before);
  const after=p.hp;tick(p,w,.4);assert.equal(p.hp,after,'duplicate charge damage');
 }
});
test('area warnings cover every party member and companion actually struck, with safe allies excluded',()=>{
 const p=player(),ally=player(),safe=player(),w=world(),e=enemy('brute',{x:300,attackCooldown:2});
 Object.assign(ally,{id:'ally',x:330,y:330,active:true,joined:true});Object.assign(safe,{id:'safe',x:410,y:320,active:true,joined:true});
 const summon={id:'companion',kindTag:'summon',displayName:'Bound Servant',alive:true,hp:100,maxHp:100,x:320,y:335};p.summons=[summon];p.coop={players:[ally,safe]};
 e.telegraph={kind:'slam',time:.1,maxTime:.9,pose:'overhead',x:p.x,y:p.y,radius:74,recovery:.9};w.enemies=[e];
 const hp=[p.hp,ally.hp,safe.hp,summon.hp];tick(p,w,.15);assert(p.hp<hp[0]&&ally.hp<hp[1]&&summon.hp<hp[3]);assert.equal(safe.hp,hp[2]);
 const after=[p.hp,ally.hp,summon.hp];tick(p,w,.2);assert.deepEqual([p.hp,ally.hp,summon.hp],after);
});
test('dense mixed encounters keep warnings out of effect queues and have finite presentation',()=>{
 const p=player(),w=world();p.invulnerableUntil=clock+9;
 for(let i=0;i<80;i++){const kind=ENEMY_KINDS[i%ENEMY_KINDS.length],e=enemy(kind,{id:'dense-'+i,x:p.x+Math.cos(i)*100,y:p.y+Math.sin(i)*100});w.enemies.push(e);}
 const start=process.hrtime.bigint();tick(p,w,8);const ms=Number(process.hrtime.bigint()-start)/1e6;
 assert(w.effects.length<220);assert(!w.effects.some(f=>f.kind==='enemyTelegraph'));
 for(const e of w.enemies){const pose=sampleEnemyAttackPresentation(e,clock);if(pose)assert(Number.isFinite(pose.elapsed));}
 report.density={enemies:80,seconds:8,simulationMs:ms,effects:w.effects.length};
});
fs.mkdirSync('docs/enemy-combat',{recursive:true});fs.writeFileSync('docs/enemy-combat/checks.json',JSON.stringify(report,null,2));
console.log(`Passed ${report.checks.length} enemy combat checks.`);
