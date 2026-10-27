import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {useAbility,updateSummons,updateCombat} from '../src/combat.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {abilitySummary,abilityScaling} from '../src/uiInformation.js';

const ids=['thornbinderSummonThornlings','thornbinderSummonElderThornbeast'];
const now=()=>performance.now()/1000;
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const actor=(id,morph='fae')=>{const p=createPlayer('Fae review');chooseClass(p,'thornbinder');
 for(const skill of Object.values(p.skillState.skills))skill.level=20;migratePlayer(p);
 Object.assign(p,{id:'fae-review',x:260,y:320,spiritAwakened:true,maxSpirit:1000,spirit:1000});
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert.ok(assignAbilityToSlot(p,0,id).ok);
 if(morph)assert.ok(selectAbilityMorph(p,id,morph).ok);return p;};
const tick=(p,w,seconds)=>{const t=now();for(let i=1;i<=Math.ceil(seconds*60);i++){updateCombat(p,w,{},1/60,t+i/60,()=>{});updateSummons(1/60,p,w,()=>{},t+i/60);}};
const test=(name,fn)=>{fn();console.log('PASS '+name);};
const spawn=(p,w)=>{assert.ok(useAbility(0,p,w,()=>{},now(),{combatAimX:1,combatAimY:0,hasAim:true}));return p.summons;};
for(const [index,id] of ids.entries()){
 test(`${id}: persistent Fae companions retain original stats, roles and summon controls`,()=>{
  const p=actor(id),q=actor(id,null),w=world(),originalWorld=world();spawn(p,w);spawn(q,originalWorld);
  assert.equal(p.summons.length,index?1:3);assert.equal(p.summons.length,q.summons.length);
  for(let i=0;i<p.summons.length;i++){
   const a=p.summons[i],b=q.summons[i];assert.equal(a.kind,'thornbeast');assert.equal(a.summonMorph,'fae');assert.match(a.displayName,/^Fae /);
   assert.equal(a.evolutionStage,index?'elderThornbeast':'thornling');assert.equal(a.expiresAt,undefined);
   for(const key of ['maxHp','damage','speed','attackRate','attackRange','summonPath','thornlingRole'])assert.equal(a[key],b[key],key);
  }
  tick(p,w,61);assert.equal(p.summons.length,index?1:3);
  const spirit=p.spirit;assert.ok(useAbility(0,p,w,()=>{},now()));assert.equal(p.spirit,spirit);
  tick(p,w,.05);assert.equal(p.summons.length,0);assert.equal(useAbility(0,p,w,()=>{},now()),false);
  const a=resolveSubclassAbility(p,id);assert.equal(a.summonType,'thornbeast');assert.equal(a.cost,getAbilityById(id).cost);
  assert.match(abilitySummary(a,p),/quietly heal you over time/);assert.match(abilityScaling(a),/Summoning.*Warding/);
 });
 test(`${id}: passive healing is owner-only, capped and quiet; it stops when summons end`,()=>{
  const p=actor(id),ally=actor(id),w=world();p.coop={players:[ally]};spawn(p,w);
  const floats=p.floatingTexts?.length||0;p.hp-=Math.min(20,p.maxHp-1);ally.hp-=10;const before=p.hp,allyBefore=ally.hp;
  tick(p,w,5);assert.ok(p.hp>before);assert.equal(ally.hp,allyBefore);assert.equal(p.floatingTexts?.length||0,floats);
  const heals=w.effects.filter(e=>e.geometry==='faeMend');assert.ok(heals.length>0&&heals.length<=2);assert.ok(heals.every(e=>e.ttl<=.3));
  p.hp=p.maxHp;w.effects=[];tick(p,w,5);assert.equal(p.hp,p.maxHp);assert.ok(!w.effects.some(e=>e.geometry==='faeMend'));
  p.hp-=10;p.summons.forEach(s=>{s.hp=0;});const after=p.hp;tick(p,w,5);assert.equal(p.hp,after);assert.equal(p.summons.length,0);
 });
 test(`${id}: real attacks apply Faerie Fire with normal summon damage and boss-safe control`,()=>{
  for(const isBoss of [false,true]){
   const p=actor(id),w=world();spawn(p,w);const lead=p.summons[0];
   const e={id:'target',name:'Target',kind:'rat',x:lead.x+15,y:lead.y,hp:100000,maxHp:100000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:lead.id,isBoss};w.enemies=[e];
   tick(p,w,3);assert.ok(e.hp<e.maxHp);assert.ok(e.subclassWeakenedUntil>now());assert.ok(w.effects.some(f=>f.geometry==='faerieFire'));
   assert.equal(e.verdantWound,undefined);assert.ok(getAbilityMastery(p,id).lifetimeDamage>0);
   assert.ok(getSubclassCombatState(p).afflictions.size<=64);if(isBoss)assert.ok(!e.rootUntil);else assert.ok(e.rootUntil>0);
  }
 });
 test(`${id}: saves retain the Fae body, source skill and passive healing`,()=>{
  const p=actor(id),w=world();spawn(p,w);const loaded=normalizeProfileSave(sanitizeForSave(p));migratePlayer(loaded);
  assert.equal(loaded.summons.length,index?1:3);loaded.summons.forEach(s=>{assert.equal(s.summonMorph,'fae');assert.equal(s.sourceAbilityId,id);});
  loaded.hp-=10;const before=loaded.hp;tick(loaded,world(),5);assert.ok(loaded.hp>before);
 });
}
test('Fae pack and elder identities remain correct when both old evolution nodes are learned',()=>{
 for(const [index,id] of ids.entries()){const p=actor(id);p.skillTree.spent.warding_thornling_grove=1;p.skillTree.spent.warding_elder_beast=1;
  spawn(p,world());assert.equal(p.summons.length,index?1:3);assert.equal(p.summons[0].evolutionStage,index?'elderThornbeast':'thornling');}
});
test('terrain blocks companion damage and Faerie Fire through a wall',()=>{
 const p=actor(ids[1]),w=world();spawn(p,w);const s=p.summons[0];s.x=303;s.y=320;
 for(let y=0;y<w.height;y++)w.tiles[y][10].passable=false;
 const e={id:'wall-target',kind:'rat',x:340,y:320,hp:10000,maxHp:10000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:s.id};w.enemies=[e];tick(p,w,.2);
 assert.equal(e.hp,e.maxHp);assert.equal(e.subclassWeakenedUntil,undefined);
});
console.log('Fae summon verification complete.');
