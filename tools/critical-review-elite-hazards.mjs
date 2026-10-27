import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {configureEncounterEnemy} from '../src/encounterData.js';
import {updateEliteEncounters,getEliteHazards,getWallerSegments} from '../src/eliteEncounterSystem.js';
import {applyTargetDamage} from '../src/enemyBehaviors.js';
import {updateStaminaActions,getDashVelocity} from '../src/combatActions.js';
import {getPlayerMovementMultiplier,useAbility} from '../src/combat.js';
import {moveActorWithCollision,isActorPositionPassable} from '../src/world.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';

let clock=10;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const report={scope:'Independent scripted play of real elite coordinator, geographic enemy stats, player progression, production damage, baseline stamina/dodge, skill casts and swept collision. This does not substitute for campaign rendering or human controller play.',checks:[],scenarios:[],findings:[]};
function setup(modifiers,options={}){
 clock=10;const level=options.level||40,p=createPlayer('Independent elite review');chooseClass(p,options.classId||'classless');
 p.skillState.combat.level=level;for(const skill of Object.values(p.skillState.skills))skill.level=Math.max(1,Math.floor(level*.35));migratePlayer(p);
 Object.assign(p,{id:'review-player',x:800,y:700,dirX:1,dirY:0});
 if(options.instrumented)Object.assign(p,{hp:10000,maxHp:10000,stamina:1000,maxStamina:1000});
 if(options.noBlock)p.loadout.abilitySlots=p.loadout.abilitySlots.map(id=>id==='block'?null:id);
 const e={id:'independent-elite',kind:'brute',name:'Review elite',x:800-(options.offset||200),y:700,r:14,hp:140,maxHp:140,damage:13,speed:60,isInCombat:true};
 configureEncounterEnemy(e,{id:'review',levels:[level,level]},e.id,{rank:options.rank||'champion'});e.eliteModifiers=modifiers;e.eliteModifier=modifiers[0];
 const w={mode:'dungeon',width:90,height:70,tiles:Array.from({length:70},()=>Array.from({length:90},()=>({passable:true,biome:'grass'}))),enemies:[e],objects:[],effects:[],drops:[]};
 const seen=new Set,events=[],hits=[],initial={hp:p.hp,stamina:p.stamina,spirit:p.spirit,enemyDamage:e.damage};
 let elapsed=0,frozen=false,peak=0;
 const c={w,p,e,events,hits,initial,get elapsed(){return elapsed;},get peak(){return peak;},tick(input={}){
  const dt=1/60;clock+=dt;elapsed+=dt;updateStaminaActions(p,input,dt,clock,()=>{});
  const dash=getDashVelocity(p),move=getPlayerMovementMultiplier(p);
  moveActorWithCollision(p,w,(dash.x+(input.moveX||0)*205*move)*dt,(dash.y+(input.moveY||0)*205*move)*dt,12);
  updateEliteEncounters(w,p,dt,clock,(source,target,amount,world,log,options)=>{
   const previousHp=target.hp,result=applyTargetDamage(source,target,amount,world,log,options);hits.push({elapsed:+elapsed.toFixed(3),kind:options.label,raw:amount,actual:result.hpDamage,healthLost:Math.max(0,previousHp-target.hp),blocked:result.blocked||false,dodged:result.dodged||false,protected:result.protected||false,guardBroken:result.guardBroken||false});return result;
  },()=>{});
  const hazards=getEliteHazards(w);peak=Math.max(peak,hazards.length);
  for(const h of hazards)if(!seen.has(h)){seen.add(h);events.push({elapsed:+elapsed.toFixed(3),kind:h.kind,danger:h.danger,label:h.label||null,wallsActive:w.encounterBarriers.length>0,frozen:p.eliteFrozenUntil>clock});}
  if(p.eliteFrozenUntil>clock&&!frozen)events.push({elapsed:+elapsed.toFixed(3),kind:'frozen'});
  if(!(p.eliteFrozenUntil>clock)&&frozen)events.push({elapsed:+elapsed.toFixed(3),kind:'thawed'});frozen=p.eliteFrozenUntil>clock;
 },run(seconds,policy=()=>({})){for(let i=0;i<seconds*60;i++){this.tick(policy(this));if(p.hp<=0)break;}},until(predicate,seconds=12,policy=()=>({})){for(let i=0;i<seconds*60;i++){this.tick(policy(this));if(predicate())return;}assert.fail('Encounter did not reach expected state');}};
 return c;
}
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const damage=c=>c.hits.reduce((sum,h)=>sum+h.actual,0);
function evasive(c){
 const hazards=getEliteHazards(c.w),wall=hazards.find(h=>h.kind==='waller'&&h.segments),input={};
 if(wall){const d=wall.radius+40,door={x:wall.x+(wall.opening==='east'?d:wall.opening==='west'?-d:0),y:wall.y+(wall.opening==='south'?d:wall.opening==='north'?-d:0)};
  const dx=door.x-c.p.x,dy=door.y-c.p.y,l=Math.hypot(dx,dy);if(l>8){input.moveX=dx/l;input.moveY=dy/l;}}
 const imminent=hazards.some(h=>h.kind!=='waller'&&h.multiplier>0&&h.age<h.warning&&h.warning-h.age<.085);
 if(c.p.eliteFrozenUntil>clock||imminent)input.dashPressed=true;
 return input;
}
function record(c,name,extra={}){report.scenarios.push({name,...c.initial,endingHp:c.p.hp,endingStamina:c.p.stamina,damage:damage(c),healthLost:c.hits.reduce((sum,h)=>sum+h.healthLost,0),peakHazards:c.peak,events:c.events,hits:c.hits,...extra});}

test('Waller acquisition confines continuous forward walking without changing locked geometry',()=>{
 const c=setup(['waller'],{instrumented:true});let first,lock,atLock;
 c.until(()=>getEliteHazards(c.w).some(h=>h.kind==='waller'));
 first=getEliteHazards(c.w)[0];
 for(let i=0;i<4.5*60;i++){
  c.tick({moveX:1});if(first.locked){if(!lock){lock={x:first.x,y:first.y};atLock=c.p.x;}assert.equal(first.x,lock.x);assert.equal(first.y,lock.y);}
 }
 assert(first.segments?.length);assert(c.p.x<first.x+first.radius);assert(c.p.x-atLock<205*4.5/2,'forward walking escaped confinement');
 assert(c.hits.some(hit=>['Infernal execution','Death blast'].includes(hit.kind)&&hit.actual>100),'Naive forward walking did not suffer the chamber release');
 assert(isActorPositionPassable(c.w,c.p.x,c.p.y,12));record(c,'Waller continuous walk',{opening:first.opening,wallSegments:first.segments.length,locked:lock});
});
test('caster outside enclosure can bombard while its own walls remain active',()=>{
 for(const offset of [150,300]){
  const c=setup(['waller','artillery'],{instrumented:true,offset});c.run(12);
  assert(c.events.some(e=>e.kind==='artillery'&&e.wallsActive));record(c,'Outside-caster Waller + Artillery',{offset});
 }
});
test('frozen artillery is an honest fixed warning and a timely baseline thaw response works',()=>{
 const failed=setup(['freezer','artillery'],{instrumented:true});failed.until(()=>failed.p.eliteFrozenUntil>clock);
 const execution=getEliteHazards(failed.w).find(h=>h.kind==='artillery'&&h.secondary);assert(execution);assert(execution.locked);assert(execution.warning>=1.39);
 const lock={x:execution.x,y:execution.y};failed.run(1.5);assert.equal(execution.x,lock.x);assert.equal(execution.y,lock.y);assert(failed.hits.some(h=>h.kind==='Artillery'&&h.actual>300));record(failed,'Frozen execution ignored');
 const skilled=setup(['freezer','artillery']);skilled.until(()=>skilled.p.eliteFrozenUntil>clock);skilled.tick({dashPressed:true,moveY:1});assert.equal(skilled.p.eliteFrozenUntil,0);skilled.run(2,()=>({moveY:1}));assert(!skilled.hits.some(h=>h.kind==='Artillery'&&h.actual>0));assert(skilled.p.hp>0);record(skilled,'Immediate thaw dodge then retreat');
});
test('real progressed classes survive timed dodge with Block removed and die if execution ignored',()=>{
 for(const classId of ['classless','gravecaller','thornbinder','waverider','lightbringer','oathkeeper','fellhunter','eldritch']){
  const skilled=setup(['artillery'],{classId,noBlock:true});skilled.until(()=>getEliteHazards(skilled.w).length>0);const h=getEliteHazards(skilled.w)[0];
  while(h.warning-h.age>.085)skilled.tick();skilled.tick({dashPressed:true});while(!h.released)skilled.tick();assert.equal(damage(skilled),0);assert(skilled.p.stamina<skilled.initial.stamina);record(skilled,classId+' late dodge without Block');
  const failed=setup(['artillery'],{classId});failed.run(8);assert.equal(failed.p.hp,0);record(failed,classId+' ignored champion execution');
 }
});
test('combined Waller + Freeze + Artillery has actual overlapping confinement and control',()=>{
 const failed=setup(['waller','freezer','artillery'],{instrumented:true});failed.run(18);
 assert(failed.events.some(e=>e.kind==='freezer'&&e.wallsActive));assert(failed.events.some(e=>e.kind==='artillery'&&e.wallsActive&&e.frozen));record(failed,'Triple encounter ignored');
 const skilled=setup(['waller','freezer','artillery']);skilled.run(18,evasive);assert(skilled.p.hp>0,'baseline gap/dodge policy could not survive');record(skilled,'Triple: use legal gap, reserve dodge');
});
test('multiple elites maintain finite control and correct defensive windows for live player',()=>{
 const c=setup(['freezer','artillery'],{instrumented:true});for(let n=1;n<5;n++)c.w.enemies.push({...c.e,id:'review-pack-'+n,x:520+n*22,eliteModifiers:n%2?['waller','artillery']:['freezer','artillery']});
 c.run(32,evasive);assert(c.p.hp>0);assert(c.peak<=24);
 const freezes=c.events.filter(e=>e.kind==='frozen');for(let n=1;n<freezes.length;n++)assert(freezes[n].elapsed-freezes[n-1].elapsed>=6.9);
 assert(c.hits.filter(h=>h.dodged||h.protected).every(h=>h.actual===0));record(c,'Five elites, active counterplay');
});
test('heavy defensive build can stack a real guard skill with Block instead of mobility',()=>{
 const c=setup(['artillery'],{classId:'oathkeeper'});c.p.equipment={chest:'oathplateOfTheLastDawn'};
 unlockActiveAbility(c.p,'oathkeeperBulwarkOfLight');c.until(()=>getEliteHazards(c.w).length>0);const h=getEliteHazards(c.w)[0];
 assert(useAbility('oathkeeperBulwarkOfLight',c.p,c.w,()=>{},clock,{combatAimX:1,combatAimY:0,hasAim:true}));
 while(!h.released&&c.p.hp>0)c.tick({ability4Held:true});record(c,'Oathkeeper skill ward + Block');
 if(c.p.hp<=0)report.findings.push({severity:'design limitation',issue:'A progressed Oathkeeper using Bulwark of Light and Block still dies to champion execution; baseline dodge remains required unless stronger defense/gear or killing the caster is used.',stats:c.initial,hits:c.hits});
});
test('early elites teach ordinary movement and mandatory encounters do not use execution tier',()=>{
 for(const mods of [['artillery'],['waller'],['freezer']]){
  const c=setup(mods,{level:4,rank:'elite'});c.until(()=>getEliteHazards(c.w).length>0);c.run(4,()=>({moveY:1}));assert(c.p.hp>0);assert(c.events.every(e=>e.danger!=='execution'));record(c,'Level4 '+mods[0]+' ordinary retreat');
 }
});

fs.mkdirSync('docs/elite-hazards',{recursive:true});fs.writeFileSync('docs/elite-hazards/critical-review.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.checks.length} independent gameplay review groups passed; ${report.findings.length} design findings.`);
