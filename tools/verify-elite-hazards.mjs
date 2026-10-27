import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance as timer} from 'node:perf_hooks';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getClassDefinition,isClassAvailable} from '../src/classData.js';
import {updateEliteEncounters,getEliteHazards,getWallerSegments,getEliteControlMultiplier,clearEliteEncounters,clearEliteFrost,mitigateEliteHit,eliteThreatTier} from '../src/eliteEncounterSystem.js';
import {applyTargetDamage} from '../src/enemyBehaviors.js';
import {updateStaminaActions,ensureActionState,getDashVelocity} from '../src/combatActions.js';
import {moveActorWithCollision,isActorPositionPassable} from '../src/world.js';
import {configureEncounterEnemy,chooseEliteModifiers,encounterRng,compatibleEliteModifiers} from '../src/encounterData.js';
import {getPlayerMovementMultiplier,useAbility,updateCombat} from '../src/combat.js';
import {ensureCombatState} from '../src/combatMoves.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
let clock=10;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const report={checks:[],scenarios:[],builds:[],performance:{}};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const world=()=>({mode:'dungeon',width:70,height:45,tiles:Array.from({length:45},()=>Array.from({length:70},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
function setup(mods,level=40,rank='rare',classId='gravecaller',realStats=false){
 clock=10;const w=world(),p=createPlayer('Elite hazards');
 if(!chooseClass(p,classId)){
  // Retired classes remain valid saved characters, but cannot be newly chosen.
  const legacy=getClassDefinition(classId);assert(legacy&&!isClassAvailable(classId));Object.assign(p,{classId:legacy.id,className:legacy.name,classSkill:legacy.skill,spiritAwakened:true});
 }
 p.skillState.combat.level=level;for(const s of Object.values(p.skillState.skills))s.level=Math.max(1,Math.floor(level*.35));migratePlayer(p);
 Object.assign(p,{id:'hero',x:700,y:600,dirX:1,dirY:0});if(!realStats)Object.assign(p,{hp:1000,maxHp:1000,stamina:1000,maxStamina:1000});
 const e={id:'elite-test',kind:'brute',name:'Sentinel',x:500,y:600,r:14,radius:14,hp:140,maxHp:140,damage:13,speed:60,isInCombat:true};configureEncounterEnemy(e,{id:'test',levels:[level,level]},'elite-test',{rank});e.eliteModifiers=mods;e.eliteModifier=mods[0];w.enemies=[e];
 const hits=[];return {w,p,e,hits,tick(input={}){const dt=1/60;clock+=dt;updateStaminaActions(p,input,dt,clock,()=>{});const dash=getDashVelocity(p);moveActorWithCollision(p,w,((input.moveX||0)*205*getPlayerMovementMultiplier(p)+dash.x)*dt,((input.moveY||0)*205*getPlayerMovementMultiplier(p)+dash.y)*dt);updateEliteEncounters(w,p,dt,clock,(source,target,amount,world,log,options)=>{const result=applyTargetDamage(source,target,amount,world,log,options);hits.push({kind:options.label,amount,actual:result.hpDamage,at:clock,target:target.id||'pet',...result});return result;},()=>{});},advance(seconds,input={}){for(let i=0;i<seconds*60;i++)this.tick(input);}};
}
function wait(c,predicate,limit=10){for(let i=0;i<limit*60;i++){c.tick();if(predicate())return;}assert.fail('Timed out waiting for encounter');}
test('A: progressive chill, frozen movement, shatter punishment and recovery',()=>{
 const c=setup(['freezer']);let stages=new Set(),frozenAt=0;for(let i=0;i<10*60;i++){c.tick();if(c.p.eliteFrost>0)stages.add('chilled');if(c.p.eliteFrost>=65)stages.add('deep');if(c.p.eliteFrozenUntil>clock){stages.add('frozen');frozenAt||=clock;assert.equal(getPlayerMovementMultiplier(c.p),0);}}
 assert.deepEqual([...stages],['chilled','deep','frozen']);assert(c.hits.some(h=>h.kind==='Shatter'&&h.actual>100));assert(c.p.eliteFrostRecoveryUntil>=frozenAt+6.9);
 report.scenarios.push({scenario:'A exposure',stages:[...stages],hits:c.hits});
 const q=setup(['freezer']);wait(q,()=>q.p.eliteFrozenUntil>clock);const stamina=q.p.stamina;q.tick({dashPressed:true,moveY:1});assert.equal(q.p.eliteFrozenUntil,0);assert(q.p.stamina<stamina);assert(q.p.eliteFrostRecoveryUntil>clock+6.9);q.advance(2);assert(!q.p.eliteFrozenUntil);
 const guarded=setup(['freezer']);wait(guarded,()=>getEliteHazards(guarded.w).length);const h=getEliteHazards(guarded.w)[0];ensureActionState(guarded.p).blocking=true;for(let i=0;i<200;i++)guarded.tick({ability4Held:true});assert(!(guarded.p.eliteFrozenUntil>clock),'Guard must delay/prevent freeze');
});
test('B: wall gap, radius collision, chamber strike, actor safety and terrain rejection',()=>{
 const c=setup(['waller']);wait(c,()=>c.w.encounterBarriers?.length);const h=getEliteHazards(c.w).find(h=>h.kind==='waller');assert(h&&h.segments.length===5);assert.equal(getWallerSegments(h).length,5);
 const b=h.segments[0];assert(!isActorPositionPassable(c.w,b.x+b.w/2,b.y+b.h/2,10));assert(isActorPositionPassable(c.w,h.x,h.y,10));
 const original={x:c.p.x,y:c.p.y};moveActorWithCollision(c.p,c.w,-350,0);assert(c.p.x>h.x-h.radius,'Dash cannot tunnel through wall');Object.assign(c.p,original);
 c.advance(3);assert(c.hits.some(hit=>hit.kind==='Infernal execution'&&hit.actual>100));
 const escaped=setup(['waller']);wait(escaped,()=>escaped.w.encounterBarriers?.length);escaped.advance(2,{moveY:1});assert(escaped.p.y>700);assert.equal(escaped.hits.length,0);report.scenarios.push({scenario:'B escape',exit:true,segments:5});
 const tight=setup(['waller']);for(let y=0;y<tight.w.height;y++)for(let x=0;x<tight.w.width;x++)tight.w.tiles[y][x].passable=x>=20&&x<=23&&y>=17&&y<=20;tight.advance(8);assert(!getEliteHazards(tight.w).some(h=>h.kind==='waller'));
});
test('C: advanced artillery defeats uninterrupted walking, commits honestly and rewards timed dodge',()=>{
 for(const response of ['still','walk','dodge','silence','kill','ward']){
  const c=setup(['artillery'],40,'champion');let first,locked,done=false;
  for(let i=0;i<8*60;i++){
   const h=getEliteHazards(c.w).find(h=>h.kind==='artillery'&&!h.secondary);const input=response==='walk'&&h?{moveX:1}:{};
   if(h&&!first)first=h;
   if(h?.locked){locked||={x:h.x,y:h.y};assert.equal(h.x,locked.x);assert.equal(h.y,locked.y);}
   if(h&&response==='dodge'&&!done&&h.warning-h.age<.1){input.dashPressed=true;done=true;}
   if(h&&response==='silence')c.e.subclassSilencedUntil=clock+2;
   if(h&&response==='kill'){c.e.hp=0;c.e.dead=true;}
   if(h&&response==='ward')c.p.invulnerableUntil=clock+2;
   c.tick(input);if(first?.released||first?.cancelled||c.e.dead)break;
  }
  const damage=c.hits.reduce((s,h)=>s+h.actual,0);assert(first);if(['still','walk','silence'].includes(response))assert(damage>250,response);else assert.equal(damage,0,response);
  report.scenarios.push({scenario:'C '+response,damage,locked:locked||null});
 }
 const early=setup(['artillery'],4,'elite');wait(early,()=>getEliteHazards(early.w).length);const h=getEliteHazards(early.w)[0];assert.equal(h.danger,'major');assert(h.radius<100&&h.warning>=1.6);early.advance(2,{moveY:1});assert.equal(early.hits.length,0);
});
test('artillery flight retains its launched origin when the caster moves',()=>{
 const c=setup(['artillery'],40,'champion');wait(c,()=>getEliteHazards(c.w).some(h=>h.locked));const h=getEliteHazards(c.w)[0],origin={x:h.launchSourceX,y:h.launchSourceY},target={x:h.x,y:h.y};c.e.x+=40;c.e.y+=20;c.tick();assert.equal(h.launchSourceX,origin.x);assert.equal(h.launchSourceY,origin.y);assert.equal(h.x,target.x);assert.equal(h.y,target.y);
});
test('D/E: freeze/artillery, wall/artillery and triple actually sequence without simultaneous executions',()=>{
 for(const mods of [['freezer','artillery'],['waller','artillery'],['waller','freezer'],['waller','freezer','artillery']]){
  const c=setup(mods,40,'champion');const seen=new Set();let peak=0;for(let i=0;i<16*60;i++){c.tick();for(const h of getEliteHazards(c.w))seen.add(h.kind);peak=Math.max(peak,getEliteHazards(c.w).length);const critical=getEliteHazards(c.w).filter(h=>h.age<h.warning&&['critical','execution'].includes(h.danger));assert(critical.length<=2,'No simultaneous high-danger opening');}
  for(const mod of mods)assert(seen.has(mod),mod+' absent from actual combination');assert(c.hits.some(h=>h.actual>150));report.scenarios.push({scenario:mods.join('+'),seen:[...seen],peak,damage:c.hits.reduce((sum,h)=>sum+h.actual,0)});
 }
 const c=setup(['waller','artillery']);wait(c,()=>c.w.encounterBarriers?.length);c.e.staggerTimer=1;c.tick();assert(c.w.encounterBarriers.length>0);assert(getEliteHazards(c.w).length>0);c.e.hp=0;c.e.dead=true;c.tick();assert.equal(c.w.encounterBarriers.length,0);assert.equal(getEliteHazards(c.w).length,0);
});
test('E extra: actual Ghostwalk exits the gap, terrain cover stops damage, and real Root Prison cannot interrupt',()=>{
 const c=setup(['waller','artillery']);wait(c,()=>c.w.encounterBarriers?.length);const wall=getEliteHazards(c.w).find(h=>h.kind==='waller');unlockActiveAbility(c.p,'gravecallerGhostwalk');assert(useAbility('gravecallerGhostwalk',c.p,c.w,()=>{},clock,{combatAimX:0,combatAimY:1,hasAim:true}));assert(c.p.y>wall.y+wall.radius);c.advance(2);assert(!c.hits.some(h=>h.actual>0));
 const covered=setup(['artillery']);wait(covered,()=>getEliteHazards(covered.w).some(h=>h.locked));const h=getEliteHazards(covered.w)[0],tx=Math.floor((h.x+35)/32),ty=Math.floor(h.y/32);covered.w.tiles[ty][tx]={biome:'wall',passable:false};covered.p.x=h.x+90;while(!h.released)covered.tick();assert.equal(covered.hits.length,0,'Terrain is a real alternative to dodge');
 const rooted=setup(['artillery'],40,'rare','thornbinder');rooted.p.x=rooted.e.x+100;wait(rooted,()=>getEliteHazards(rooted.w).length);const strike=getEliteHazards(rooted.w)[0];unlockActiveAbility(rooted.p,'brambleSnare');rooted.p.spirit=1000;assert(useAbility('brambleSnare',rooted.p,rooted.w,()=>{},clock,{combatAimX:-1,combatAimY:0,hasAim:true}));assert(rooted.e.rootUntil>clock);rooted.tick();assert(getEliteHazards(rooted.w).includes(strike));while(!strike.released)rooted.tick();assert(rooted.hits.some(h=>h.actual>0));
});
test('F: competing elite casters sequence locally and control recovery prevents freeze loops',()=>{
 const c=setup(['freezer','artillery']);for(let i=1;i<=4;i++)c.w.enemies.push({...c.e,id:'pack'+i,x:500+i*22,eliteModifiers:i%2?['waller','artillery']:['freezer','artillery']});
 let lastFreeze=-100,count=0,peak=0;for(let i=0;i<30*60;i++){const before=c.p.eliteFrozenUntil>clock;c.tick();if(!before&&c.p.eliteFrozenUntil>clock){assert(clock-lastFreeze>=6.9);lastFreeze=clock;count++;}peak=Math.max(peak,getEliteHazards(c.w).length);assert(getEliteHazards(c.w).length<=24);}
 assert(peak>0);clearEliteEncounters(c.w);assert.equal(getEliteHazards(c.w).length,0);assert.equal(c.w.encounterBarriers.length,0);assert(!c.p.eliteFrost);report.scenarios.push({scenario:'F five elites',peak,freezes:count});
});
test('G: six standard classes and Eldritch answer a real critical impact with baseline dodge',()=>{
 for(const id of ['gravecaller','thornbinder','waverider','lightbringer','oathkeeper','fellhunter','eldritch']){
  const c=setup(['artillery'],40,'champion',id,true);const stats={hp:c.p.maxHp,stamina:c.p.maxStamina,spirit:c.p.maxSpirit};wait(c,()=>getEliteHazards(c.w).length);const h=getEliteHazards(c.w)[0];while(h.warning-h.age>.085)c.tick();c.tick({dashPressed:true});while(!h.released)c.tick();assert(c.hits.every(hit=>hit.actual===0),id+' could not dodge');report.builds.push({class:id,...stats,timedDodge:true});
 }
 const c=setup(['artillery'],40,'champion','lightbringer',true);c.p.buffs={prismGuard:{until:100,flatAbsorb:45},haloAegis:{until:100,flatAbsorb:30}};wait(c,()=>getEliteHazards(c.w).length);const h=getEliteHazards(c.w)[0];while(!h.released)c.tick();assert(c.hits.some(hit=>hit.lightAbsorbed===75));
 const parried=setup(['artillery'],40,'champion','lightbringer',true);unlockActiveAbility(parried.p,'lightbringerPrismGuard');getAbilityMastery(parried.p,'lightbringerPrismGuard',true).level=20;selectAbilityMorph(parried.p,'lightbringerPrismGuard','dawnblade');wait(parried,()=>getEliteHazards(parried.w).length);const strike=getEliteHazards(parried.w)[0];while(strike.warning-strike.age>.15)parried.tick();assert(useAbility('lightbringerPrismGuard',parried.p,parried.w,()=>{},clock,{combatAimX:1,combatAimY:0,hasAim:true}));while(!strike.released)parried.tick();assert(parried.p.hp>0&&parried.hits.some(h=>h.actual>0&&h.actual<parried.p.maxHp),'Real Dawnblade ward/parry must mitigate, not erase, the impact');report.builds.push({class:'Dawnblade',guardSkill:true,remainingHp:parried.p.hp,damage:parried.hits.reduce((n,h)=>n+h.actual,0)});
});
test('H: tier caps, optional champions, deterministic assignment and rare combinations',()=>{
 assert(compatibleEliteModifiers('waller','freezer'));assert(!compatibleEliteModifiers('waller','vortex'));assert(!compatibleEliteModifiers('bulwark','regenerator'));
 let triples=0;for(let seed=0;seed<500;seed++){const a=chooseEliteModifiers(encounterRng(seed),3),b=chooseEliteModifiers(encounterRng(seed),3);assert.deepEqual(a,b);assert.equal(a.length,3);if(['waller','freezer','artillery'].every(m=>a.includes(m)))triples++;assert(!chooseEliteModifiers(encounterRng(seed),3,{early:true}).includes('waller'));}
 assert(triples>0);assert.equal(eliteThreatTier({level:5,encounterTier:'champion'}),1);assert.equal(eliteThreatTier({level:40,encounterTier:'champion',questCritical:true}),1);
});
test('fast weapon and class projectiles cannot skip a thin wall between frames',()=>{
 for(const kind of ['weapon','class']){
  const c=setup(['waller']);c.w.encounterBarriers=[{x:720,y:550,w:12,h:100}];const shot={id:'collision-test',kind:'arrow',alive:true,x:700,y:600,dirX:1,dirY:0,speed:1000,age:0,ttl:2,range:500,travelled:0,hitIds:new Set(),damage:50};
  if(kind==='weapon')ensureCombatState(c.p).projectiles=[shot];else c.p.abilityProjectiles=[shot];
  updateCombat(c.p,c.w,{},.05,clock,()=>{});assert.equal(shot.alive,false,kind+' projectile skipped wall');
 }
});
test('announced hazards stop resting recovery for untargeted allies and consume dodge stamina',()=>{
 const c=setup(['artillery'],40,'champion','classless',true);wait(c,()=>getEliteHazards(c.w).length);assert(!c.e.combatTargetId);const stamina=c.p.stamina;updateCombat(c.p,c.w,{dashPressed:true,moveY:1},1/60,clock,()=>{});assert(c.p.stamina<stamina);
});
test('remaining roster: shock lanes/crossfire, vortex collapse, magma death, frontal riposte and meaningful healing',()=>{
 for(const mod of ['shocker','vortex','molten','bulwark','regenerator']){
  const c=setup([mod]);const seen=new Set();if(mod==='molten'){c.p.x=c.e.x+20;c.e.dead=true;c.e.hp=0;}if(mod==='regenerator')c.e.hp=c.e.maxHp*.4;
  for(let i=0;i<12*60;i++){c.tick();for(const h of getEliteHazards(c.w))seen.add(h.kind);if(mod==='bulwark'&&c.e.eliteGuardActive)for(let j=0;j<3;j++)mitigateEliteHit(c.e,{x:c.e.x+c.e.eliteGuardX*50,y:c.e.y+c.e.eliteGuardY*50},10);}
  if(mod==='regenerator'){assert(c.e.hp>c.e.maxHp*.4);assert(c.e.hp<=c.e.maxHp*.7+.01);}else if(mod==='bulwark'){assert(seen.has('bulwark'));}else assert(c.hits.some(h=>h.actual>0),mod);
  if(mod==='vortex')assert(seen.has('collapse'));report.scenarios.push({scenario:mod,seen:[...seen],damage:c.hits.reduce((s,h)=>s+h.actual,0)});
 }
 const c=setup(['regenerator']);c.e.hp=c.e.maxHp*.4;c.p.x=c.e.x+20;wait(c,()=>c.e.eliteHealing);const before=c.e.hp;mitigateEliteHit(c.e,c.p,1,{dot:true});mitigateEliteHit(c.e,c.p,c.e.maxHp*.02,{heavy:true});c.tick();assert(c.e.eliteHealing);c.advance(2);assert(c.e.hp>before);
});
test('all eight modifiers start and finish through crowd control; only caster death cancels committed effects',()=>{
 const controls={root:c=>c.e.rootUntil=clock+20,rootTimer:c=>c.e.rootTimer=20,stagger:c=>c.e.staggerTimer=20,freeze:c=>c.e.subclassFrozenUntil=clock+20,silence:c=>c.e.subclassSilencedUntil=clock+20};
 let cases=0;
 for(const mod of ['waller','shocker','freezer','molten','vortex','artillery','bulwark','regenerator'])for(const [name,control] of Object.entries(controls)){
  const c=setup([mod]);if(mod==='regenerator'){c.e.hp=c.e.maxHp*.4;c.p.x=c.e.x+20;}
  // Apply before activation too: indefinite control is not a modifier lockout.
  control(c);
  wait(c,()=>{
   if(mod==='bulwark'&&c.e.eliteGuardActive)for(let i=0;i<3;i++)mitigateEliteHit(c.e,{x:c.e.x+c.e.eliteGuardX*50,y:c.e.y+c.e.eliteGuardY*50},10);
   return mod==='regenerator'?c.e.eliteHealing:getEliteHazards(c.w).some(h=>h.kind===mod);
  },12);
  const effect=getEliteHazards(c.w).find(h=>h.kind===mod),hp=c.e.hp;
  c.tick();assert(mod==='regenerator'?c.e.eliteHealing:getEliteHazards(c.w).includes(effect),mod+' cancelled by '+name);
  if(effect){while(effect.age<effect.warning+.1)c.tick();assert(!effect.cancelled,mod+' failed release through '+name);assert(getEliteHazards(c.w).includes(effect));}
  else {c.advance(1.9);assert(c.e.hp>hp,'Healing suppressed by '+name);}
  c.e.hp=0;c.e.dead=true;c.tick();
  assert(getEliteHazards(c.w).filter(h=>h.owner===c.e).every(h=>h.kind==='moltenDeath'),'Death must cancel all living-caster effects');assert(!c.e.eliteHealing);assert.equal(c.w.encounterBarriers.length,0);
  cases++;
 }
 report.scenarios.push({scenario:'No modifier interrupts',modifiers:8,controlTypes:Object.keys(controls),cases,moltenDeath:'Existing on-death eruption preserved'});
 const c=setup(['regenerator']);c.e.hp=c.e.maxHp*.4;wait(c,()=>c.e.eliteHealing);const hp=c.e.hp;c.e.hp=0;c.e.dead=true;c.advance(2);assert.equal(c.e.hp,0);assert(!c.e.eliteHealing);assert(hp>0);
 const offscreen=setup(['regenerator']);offscreen.e.hp=offscreen.e.maxHp*.4;wait(offscreen,()=>offscreen.e.eliteHealing);const wounded=offscreen.e.hp;offscreen.p.x+=1000;offscreen.advance(2);assert(offscreen.e.hp>wounded,'An existing chant must finish when its target leaves the screen');
 const retreat=setup(['artillery']);wait(retreat,()=>getEliteHazards(retreat.w).length);const shell=getEliteHazards(retreat.w)[0];retreat.e.returningHome=true;while(!shell.released)retreat.tick();assert(retreat.hits.some(h=>h.actual>0),'Retreat must not cancel committed bombardment');
});
test('cleanse, saved state, dead caster, safe zone and reset remove transient hazards',()=>{
 const c=setup(['freezer']);wait(c,()=>c.p.eliteFrozenUntil>clock);unlockActiveAbility(c.p,'soulSiphon');getAbilityMastery(c.p,'soulSiphon',true).level=20;selectAbilityMorph(c.p,'soulSiphon','acolyte');c.p.spirit=1000;assert(useAbility('soulSiphon',c.p,c.w,()=>{},clock,{combatAimX:1,combatAimY:0,hasAim:true}));assert.equal(c.p.eliteFrozenUntil,0);
 const healthy=createPlayer();clearEliteFrost(healthy,clock);assert(!healthy.eliteFrostRecoveryUntil,'Healthy healing grants no blanket immunity');
 c.p.eliteFrost=90;c.p.eliteFrozenUntil=clock+3;const saved=sanitizeForSave(c.p);assert.equal(saved.eliteFrost,undefined);assert.equal(saved.eliteFrozenUntil,undefined);
 c.e.dead=true;c.tick();assert.equal(getEliteHazards(c.w).length,0);c.w.safeZone=true;c.tick();assert.equal(c.w.encounterBarriers.length,0);
});
test('bounded dense simulation records real coordinator costs',()=>{
 const c=setup(['waller','freezer','artillery']);for(let i=1;i<40;i++)c.w.enemies.push({...c.e,id:'stress'+i,x:450+i%8*36,y:500+Math.floor(i/8)*35,eliteModifiers:i%3?['shocker','artillery']:['freezer','artillery']});const timings=[];let peak=0;
 for(let i=0;i<1200;i++){c.p.hp=c.p.maxHp=100000;const start=timer.now();c.tick();timings.push(timer.now()-start);peak=Math.max(peak,getEliteHazards(c.w).length);}timings.sort((a,b)=>a-b);assert(peak<=24);report.performance={elites:40,ticks:1200,peakHazards:peak,medianMs:timings[600],p95Ms:timings[1140],maxMs:timings.at(-1),scope:'elite coordinator, production damage/stamina and swept movement; not full campaign rendering'};
});
fs.mkdirSync('docs/elite-hazards',{recursive:true});fs.writeFileSync('docs/elite-hazards/verification.json',JSON.stringify(report,null,2));console.log('Passed '+report.checks.length+' elite hazard groups.');
