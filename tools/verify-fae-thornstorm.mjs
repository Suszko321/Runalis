import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility,resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {getSubclassCombatState,clearAbilityMorphCombatState,clearSubclassCombatState} from '../src/subclassCombat.js';
import {abilitySummary} from '../src/uiInformation.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';

const id='thornbinderThornstorm',aim={combatAimX:1,combatAimY:0,hasAim:true};
const actor=(name='flower-test')=>{const p=createPlayer(name);chooseClass(p,'thornbinder');for(const s of Object.values(p.skillState.skills))s.level=20;migratePlayer(p);Object.assign(p,{id:name,x:400,y:400,spiritAwakened:true});p.spirit=p.maxSpirit;return p;};
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const setup=()=>{const p=actor(),w=world(),t=performance.now()/1000+20;unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert.ok(assignAbilityToSlot(p,0,id).ok);assert.ok(selectAbilityMorph(p,id,'fae',t).ok);p.hp=p.maxHp*.4;return {p,w,t,time:0};};
const step=(f,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++){f.time+=.05;updateCombat(f.p,f.w,{},.05,f.t+f.time,()=>{});for(const fx of f.w.effects)fx.age+=.05;f.w.effects=f.w.effects.filter(fx=>fx.age<fx.ttl);}};
const cast=f=>assert.ok(useAbility(0,f.p,f.w,()=>{},f.t+f.time,aim));
const foe=(x,y,extra={})=>({id:`foe-${x}-${y}`,name:'Target',kind:'rat',x,y,hp:10000,maxHp:10000,radius:12,aggro:3,combatTargetKind:'player',combatTargetId:'flower-test',...extra});
const test=(name,fn)=>{fn();console.log('PASS '+name);};

test('tap creates a stationary eight-second circle at the caster, pays once and uses a normal cooldown',()=>{
 const f=setup(),hp=f.p.hp,spirit=f.p.spirit;cast(f);const field=getSubclassCombatState(f.p).fields[0],a=resolveSubclassAbility(f.p,id);
 assert.equal(field.x,400);assert.equal(field.y,400);assert.equal(field.radius,180);assert.equal(field.until-f.t,8);assert.ok(!f.p.activeChannel);
 assert.equal(f.p.hp,hp);assert.ok(f.p.spirit<spirit);assert.equal(a.cd,12);assert.match(abilitySummary(a,f.p),/standing inside/);
 assert.equal(useAbility(0,f.p,f.w,()=>{},f.t+.1,aim),false);f.p.x=700;step(f,1);assert.equal(field.x,400);assert.equal(field.y,400);assert.equal(f.p.hp,hp);
});
test('owner and living allies heal on successive pulses, stop outside, and resume on returning',()=>{
 const f=setup(),ally=actor('ally'),outside=actor('outside'),inactive=actor('inactive'),dead=actor('dead');
 Object.assign(ally,{x:470,y:450,hp:10});Object.assign(outside,{x:581,y:400,hp:10});Object.assign(inactive,{active:false,hp:10});dead.hp=0;
 f.p.coop={players:[ally,outside,inactive,dead]};cast(f);const floats=f.p.floatingTexts?.length||0,before=f.p.hp;step(f,1);
 assert.ok(f.p.hp>before);assert.ok(ally.hp>10);assert.equal(outside.hp,10);assert.equal(inactive.hp,10);assert.equal(dead.hp,0);
 const pulseHp=f.p.hp;step(f,1);assert.ok(f.p.hp>pulseHp);const allyHp=ally.hp;ally.x=600;step(f,1);assert.equal(ally.hp,allyHp);
 ally.x=470;step(f,1);assert.ok(ally.hp>allyHp);assert.equal(f.p.floatingTexts?.length||0,floats);
 ally.hp=ally.maxHp;step(f,1);assert.equal(ally.hp,ally.maxHp);
});
test('all enemies inside take Faerie Fire over time; outside, dead, friendly and bosses obey boundaries',()=>{
 const f=setup();f.w.enemies=Array.from({length:14},(_,i)=>foe(420+i*6,420));
 const outside=foe(581,400),diagonal=foe(550,550),friendly=foe(420,400,{friendly:true}),dead=foe(440,400,{hp:0,dead:true}),boss=foe(450,460,{isBoss:true});f.w.enemies.push(outside,diagonal,friendly,dead,boss);
 cast(f);step(f,.9);for(const e of f.w.enemies.slice(0,14))assert.ok(e.hp<e.maxHp);assert.ok(boss.hp<boss.maxHp);assert.ok(f.w.effects.some(fx=>fx.geometry==='faerieFire'));
 const after=f.w.enemies[0].hp;step(f,2.1);assert.ok(f.w.enemies[0].hp<after);assert.ok(f.w.enemies[0].subclassWeakenedUntil>f.t);assert.ok(f.w.enemies[0].rootUntil>f.t);
 for(const e of [outside,diagonal,friendly])assert.equal(e.hp,e.maxHp);assert.equal(dead.hp,0);assert.ok(!boss.rootUntil);
 assert.ok(getAbilityMastery(f.p,id).lifetimeDamage>0);
 const e=f.w.enemies[0];e.x=610;const hp=e.hp;step(f,1);assert.equal(e.hp,hp);
});
test('terrain blocks healing, damage and flower growth beyond walls',()=>{
 const f=setup(),ally=actor('sheltered');ally.hp=10;ally.x=480;f.p.coop={players:[ally]};f.w.enemies=[foe(480,400)];
 for(let y=0;y<f.w.height;y++)f.w.tiles[y][14].passable=false;cast(f);step(f,1);
 assert.equal(ally.hp,10);assert.equal(f.w.enemies[0].hp,10000);const flowers=getSubclassCombatState(f.p).fields[0].flowerVisual.flowers;assert.ok(flowers.length>0&&flowers.length<64);assert.ok(flowers.every(flower=>f.p.x+flower.x<448));
});
test('natural expiry, death, world transition and changing morph stop both gameplay and flowers',()=>{
 for(const reason of ['expiry','death','world','morph']){
  const f=setup();f.w.enemies=[foe(420,400)];cast(f);step(f,1);const visual=getSubclassCombatState(f.p).fields[0].flowerVisual;
  if(reason==='expiry')step(f,7.1);if(reason==='death'){f.p.hp=0;step(f,.1);}if(reason==='world')updateCombat(f.p,world(),{},.05,f.t+1.1,()=>{});if(reason==='morph')clearAbilityMorphCombatState(f.p,id);
  assert.equal(visual.active,false);assert.ok(!getSubclassCombatState(f.p)?.fields.length);const hp=f.w.enemies[0].hp;step(f,.5);assert.equal(f.w.enemies[0].hp,hp);
 }
});
test('recasts replace the old garden; save loading preserves the choice without replaying a field',()=>{
 const f=setup();cast(f);const visual=getSubclassCombatState(f.p).fields[0].flowerVisual;f.p.cooldowns={};f.p.spirit=f.p.maxSpirit;f.p.x=420;cast(f);
 assert.equal(visual.active,false);assert.equal(getSubclassCombatState(f.p).fields.length,1);assert.equal(getSubclassCombatState(f.p).fields[0].x,420);
 const loaded=normalizeProfileSave(sanitizeForSave(f.p));assert.equal(loaded.abilityMorphs[id],'fae');assert.equal(getSubclassCombatState(loaded),null);assert.ok(!loaded.activeChannel);
 clearSubclassCombatState(f.p);assert.equal(getSubclassCombatState(f.p),null);
});
test('Original retains its channel; Petalknight uses its requested single-press storm',()=>{
 const p=actor(),base=getAbilityById(id);assert.ok(base.channelProfile);const rose=resolveAbilityMorph(p,base,'petalknight');assert.equal(rose.channelProfile,undefined);assert.equal(rose.petalStorm,true);assert.equal(rose.duration,7);
 assert.equal(base.faeFlowerField,undefined);assert.equal(base.cd,0);
});
console.log('Fae Thornstorm flower-field verification complete.');
