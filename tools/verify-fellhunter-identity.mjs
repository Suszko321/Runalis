import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from './benchmark-fellhunter-identity.mjs';
import {getAbilityById,ABILITIES} from '../src/data.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {BLOODHOUND_BALANCE as B} from '../src/fellhunterAilments.js';
import {HELL_BALANCE as H} from '../src/hellstalkerSkills.js';
import {clearAbilityMorphCombatState,clearSubclassCombatState} from '../src/subclassCombat.js';
import {updateCombat,useAbility} from '../src/combat.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {SKILL_TREE_NODES,spendSkillTreeNode,getSpentSkillTreePoints,respecSkillTree} from '../src/skillTreeSystem.js';
const out='docs/fellhunter-identity',report={checks:[],timings:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const advance=(c,t)=>{for(let i=0;i<Math.ceil(t/.025);i++)c.tick();};
const entry=c=>c.state()?.afflictions.get(c.w.enemies[0])?.effects.get(c.a().subclassId);
function learn(c,id,family){unlockActiveAbility(c.p,id,{autoAssignEmpty:false});getAbilityMastery(c.p,id,true).level=20;assert(selectAbilityMorph(c.p,id,family,c.now()).ok);}
test('92 protected morphs remain exact; the later Waverider pass owns its 24 forms',()=>{
 const protectedForms=JSON.parse(fs.readFileSync(out+'/protected-forms.json'));
 let checked=0;for(const [key,a]of Object.entries(protectedForms)){const[id,family]=key.split(':'),classId=getAbilityById(id).classId;if(classId==='waverider')continue;checked++;assert.deepEqual(JSON.parse(JSON.stringify(resolveAbilityMorph({classId},id,family))),a,key);}
 assert.equal(checked,92);
});
test('each of the 30 forms has its own name; both primary morphs are ranged and caster animations use casting poses',()=>{
 for(const f of ['bloodhound','hellstalker']){
  const forms=ABILITIES.filter(a=>a.classId==='fellhunter').map(a=>resolveAbilityMorph({classId:'fellhunter'},a,f));
  assert.equal(new Set(forms.map(a=>a.name)).size,15);assert.equal(forms.find(a=>a.id==='fellhunterPracticalStrike').subclassMode,'bolt');
  if(f==='hellstalker')assert(forms.filter(a=>!a.mobilityProfile).every(a=>a.animationFamily==='cast'));
 }
});
test('single-hit recordings show short high fire ticks versus long low poison and bleed ticks',()=>{
 for(const [id,family,kind,duration]of [['fellhunterThrowingDaggers','hellstalker','fire',H.duration],['fellhunterThrowingDaggers','bloodhound','poison',B.poison.duration],['fellhunterPracticalStrike','bloodhound','bleed',B.bleed.duration]]){
  const c=fixture(id,family);assert(c.cast());const events=[];let hp=c.w.enemies[0].hp;
  for(let i=0;i<640;i++){c.tick();const next=c.w.enemies[0].hp;if(next<hp)events.push({at:+(c.now()-100).toFixed(3),damage:hp-next});hp=next;}
  const ticks=events.slice(1);assert(ticks.length>=5);const direct=events[0],first=ticks[0],last=ticks.at(-1);
  assert(first.at-direct.at>=(kind==='fire'?.275:.95));assert(last.at-direct.at<=duration+.03);assert(last.at-direct.at>=duration-1.05);
  report.timings.push({kind,direct,ticks,lastTick:last.at,meanTick:ticks.reduce((n,e)=>n+e.damage,0)/ticks.length});
 }
 const [fire,poison,bleed]=report.timings;assert(fire.meanTick>poison.meanTick*2&&fire.meanTick>bleed.meanTick*2);
 assert(fire.lastTick<2.1&&bleed.lastTick>9&&poison.lastTick>13);
});
test('bleed and poison coexist, cap separately and cannot be instantly stacked by a simultaneous volley',()=>{
 const c=fixture('fellhunterFlamingArrowVolley','bloodhound');assert(c.cast());assert.equal(c.state().shots.length,5);advance(c,.2);assert.equal(entry(c).bleeds.length,1);
 learn(c,'fellhunterThrowingDaggers','bloodhound');c.p.loadout.abilitySlots[1]='fellhunterThrowingDaggers';
 for(let i=0;i<15;i++){c.refresh();assert(c.cast());assert(use(c,1));advance(c,.45);}
 assert.equal(entry(c).bleeds.length,B.bleed.max);assert.equal(entry(c).venoms.length,B.poison.max);assert.equal(c.state().afflictions.get(c.w.enemies[0]).effects.size,1);
});
function use(c,slot){return useAbility(slot,c.p,c.w,()=>{},c.now(),c.input);}
test('fresh hits do not extend old layers and expired layers leave independently',()=>{
 const c=fixture();c.cast();advance(c,.2);const old=entry(c).venoms[0],expiry=old.until;
 advance(c,1);c.refresh();c.cast();advance(c,.2);assert.equal(entry(c).venoms.length,2);assert.equal(old.until,expiry);
 advance(c,12.8);assert.equal(entry(c).venoms.length,1);advance(c,1.2);assert(!entry(c));
});
test('primary shots fund spenders only after a real damaging hit',()=>{
 for(const family of ['bloodhound','hellstalker']){
  const resource=family==='hellstalker'?'spirit':'stamina';
  const c=fixture('fellhunterPracticalStrike',family);c.p[resource]=100;c.cast();advance(c,.2);const hit=c.p[resource];
  const q=fixture('fellhunterPracticalStrike',family);q.w.encounterBarriers=[{x:430,y:320,w:5,h:160}];q.p[resource]=100;q.cast();advance(q,.2);
  assert(Math.abs(hit-q.p[resource]-6)<.01);assert.equal(q.damage(),0);
 }
});
test('mixed sources keep their own potency and clearing one morph removes only its layers',()=>{
 const c=fixture('fellhunterPracticalStrike','bloodhound');c.cast();advance(c,.2);const old=entry(c).bleeds[0];
 learn(c,'fellhunterMarkedShot','bloodhound');c.p.loadout.abilitySlots[1]='fellhunterMarkedShot';advance(c,.5);use(c,1);advance(c,.2);
 assert.equal(entry(c).bleeds.length,3);assert.equal(entry(c).bleeds[0].power,old.power);
 clearAbilityMorphCombatState(c.p,'fellhunterMarkedShot');assert.equal(entry(c).bleeds.length,1);assert.equal(entry(c).bleeds[0],old);
});
test('real primary bow hits add paced Bleed to an existing quarry without refreshing old wounds',()=>{
 const c=fixture();c.cast();advance(c,.3);const poison=entry(c).venoms[0],expiry=poison.until;
 c.w.enemies[0].x=c.p.x+95;assert(requestBasicAttack(c.p,c.w,c.input,()=>{},c.now()));
 for(let i=0;i<100;i++){c.tick(.01);updateWeaponCombat(c.p,c.w,c.input,.01,c.now(),()=>{});}
 assert(entry(c).bleeds.length>0);assert.equal(poison.until,expiry);
});
test('Patient Predator empowers new layers once and leaves existing snapshots unchanged',()=>{
 const normal=fixture();normal.cast();advance(normal,.2);const power=entry(normal).venoms[0].power;
 const c=fixture('fellhunterExecutionWindow','bloodhound');c.cast();learn(c,'fellhunterThrowingDaggers','bloodhound');c.p.loadout.abilitySlots[1]='fellhunterThrowingDaggers';use(c,1);advance(c,.2);
 assert(Math.abs(entry(c).venoms[0].power/power-1.25)<.03);assert(!c.p.buffs?.defense);
});
test('refreshing a brand preserves its next tick; five spell bolts do not instantly build three Embers',()=>{
 const c=fixture('fellhunterFlamingArrowVolley','hellstalker');c.cast();assert.equal(c.state().shots.length,5);advance(c,.2);assert.equal(entry(c).stacks,1);
 const next=entry(c).nextTick;c.refresh();c.cast();advance(c,.1);assert.equal(entry(c).nextTick,next);
});
test('a prepared caster can Flashover without endlessly stacking separate burns',()=>{
 const c=fixture('fellhunterThrowingDaggers','hellstalker');for(let i=0;i<3;i++){c.refresh();c.cast();advance(c,.5);}assert.equal(entry(c).stacks,3);
 learn(c,'fellhunterMarkedShot','hellstalker');c.p.loadout.abilitySlots[1]='fellhunterMarkedShot';use(c,1);advance(c,.2);assert.equal(entry(c).stacks,1);assert(c.w.effects.some(f=>f.geometry==='flashover'));
 assert.equal(c.state().afflictions.get(c.w.enemies[0]).effects.size,1);
});
test('fast arrows, venom fangs and fire lances cannot skip thin temporary walls',()=>{
 for(const family of ['bloodhound','hellstalker'])for(const id of ['fellhunterPracticalStrike','fellhunterThrowingDaggers','fellhunterFlamingArrowVolley']){
  const c=fixture(id,family);c.w.encounterBarriers=[{x:430,y:200,w:3,h:400}];c.cast();advance(c,1);assert.equal(c.damage(),0,family+' '+id);assert(!entry(c));
 }
});
test('brimstone has a real warning and delayed impact; walls and morph cancellation stop pending casts',()=>{
 const c=fixture('fellhunterBombToss','hellstalker');c.cast();assert.equal(c.damage(),0);assert(c.w.effects.some(f=>f.geometry==='hellWarning'));advance(c,.3);assert.equal(c.damage(),0);advance(c,.1);assert(c.damage()>0);
 for(const reason of ['wall','morph','death','world']){
  const q=fixture('fellhunterBombToss','hellstalker');q.cast();if(reason==='wall')q.w.encounterBarriers=[{x:430,y:320,w:5,h:200}];
  if(reason==='morph')clearAbilityMorphCombatState(q.p,'fellhunterBombToss');if(reason==='death')q.p.hp=0;
  if(reason==='world')updateCombat(q.p,{...q.w,enemies:[]},{},.025,q.now()+.025,()=>{});advance(q,.5);assert.equal(q.damage(),0,reason);
 }
});
test('leaving a fire field permits only the short residual brand; long poison persists after leaving its source',()=>{
 for(const family of ['bloodhound','hellstalker']){
  const c=fixture('fellhunterCaltrops',family);c.cast();const f=c.state().fields[0];Object.assign(c.w.enemies[0],{x:f.x,y:f.y});advance(c,1.1);
  Object.assign(c.w.enemies[0],{x:f.x+400,y:f.y});advance(c,2.1);
  if(family==='hellstalker')assert(!entry(c));else assert(entry(c).venoms.length>0);
 }
});
test('respec, inactive actors, death and state clear cannot retain fields or periodic damage',()=>{
 for(const family of ['bloodhound','hellstalker'])for(const reason of ['respec','inactive','death','clear']){
  const c=fixture('fellhunterCaltrops',family);c.p.skillTree.spent.archery_volley=1;c.p.skillTreeProgress=c.p.skillTree.spent;c.cast();advance(c,.5);
  if(reason==='respec'){c.p.gold=5;assert(respecSkillTree(c.p).ok);}if(reason==='inactive')c.p.active=false;if(reason==='death')c.p.hp=0;if(reason==='clear')clearSubclassCombatState(c.p);
  advance(c,1.2);assert.equal(c.state()?.fields.length||0,0,reason);assert(!entry(c),reason+' periodic damage');
 }
});
test('both doctrines reach mobility and zone control; damage-over-time tree investments are explicit',()=>{
 for(const route of ['archery_focus','archery_trick_arrows']){
  const c=fixture();c.p.skillTree.bloodlineBonusPoints=100;for(const id of ['archery_root',route,'archery_mobility','archery_volley','archery_contract_mark'])assert(spendSkillTreeNode(c.p,id).ok,id);
 }
 assert(SKILL_TREE_NODES.archery_trick_arrows.bonuses.subclassDotPct>0);assert(SKILL_TREE_NODES.archery_rapid_reload.bonuses.subclassDotPct>0);
});
test('save/load preserves mastery, equipment, choices and points without saving encounter layers',()=>{
 const c=fixture();c.cast();advance(c,.3);const points=getSpentSkillTreePoints(c.p),saved=sanitizeForSave(c.p),loaded=normalizeProfileSave(saved);
 assert.equal(getSpentSkillTreePoints(loaded),points);assert.equal(loaded.abilityMastery.fellhunterThrowingDaggers.level,20);assert.equal(loaded.equipment.weapon,'hunterBow');assert.equal(loaded.abilityMorphs.fellhunterThrowingDaggers,'bloodhound');
 assert(!JSON.stringify(saved).includes('bloodhoundAilments'));
});
fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,timings:report.timings.map(r=>({kind:r.kind,lastTick:r.lastTick,meanTick:r.meanTick}))}));
