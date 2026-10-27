import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility,resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat,updateAbilityInput} from '../src/combat.js';
import {getSubclassCombatState,clearAbilityMorphCombatState} from '../src/subclassCombat.js';
import {abilitySummary} from '../src/uiInformation.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';

const id='soulSiphon',aim={combatAimX:1,combatAimY:0,hasAim:true};
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
const setup=()=>{
 const p=createPlayer('soul-test');chooseClass(p,'gravecaller');for(const s of Object.values(p.skillState.skills))s.level=20;migratePlayer(p);
 Object.assign(p,{id:'soul-test',x:400,y:400,spiritAwakened:true});p.spirit=p.maxSpirit;p.hp=p.maxHp*.4;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert.ok(assignAbilityToSlot(p,0,id).ok);
 const t=performance.now()/1000+20;assert.ok(selectAbilityMorph(p,id,'acolyte',t).ok);return {p,w:world(),t,time:0};
};
const step=(f,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++){f.time+=.05;updateCombat(f.p,f.w,{},.05,f.t+f.time,()=>{});for(const fx of f.w.effects)fx.age+=.05;f.w.effects=f.w.effects.filter(fx=>fx.age<fx.ttl);}};
const cast=f=>assert.ok(useAbility(0,f.p,f.w,()=>{},f.t+f.time,aim));
const foe=(x,y,extra={})=>({id:`foe-${x}-${y}`,name:'Target',kind:'rat',x,y,hp:10000,maxHp:10000,radius:12,aggro:3,combatTargetKind:'player',combatTargetId:'soul-test',...extra});
const burn=(f,e)=>getSubclassCombatState(f.p)?.afflictions.get(e)?.effects.get('soulBurn:soulSiphon');
const test=(name,fn)=>{fn();console.log('PASS '+name);};
test('single tap pays once, heals once, makes a larger stationary circle and cannot be spammed or charged',()=>{
 const f=setup(),before=f.p.spirit,hp=f.p.hp;cast(f);const field=getSubclassCombatState(f.p).fields[0],a=resolveSubclassAbility(f.p,id);
 assert.equal(field.radius,210);assert.equal(field.until-f.t,6);assert.equal(a.cd,12);assert.ok(!f.p.activeChannel);assert.ok(!a.canCharge);assert.ok(a.noUseCharges);assert.equal(a.cost,18);
 assert.ok(f.p.spirit<before);assert.ok(f.p.hp>hp);assert.match(abilitySummary(a,f.p),/five-second Soul Burn/);
 assert.equal(useAbility(0,f.p,f.w,()=>{},f.t+.1,aim),false);f.p.x=720;const spirit=f.p.spirit,pulseHp=f.p.hp;step(f,1);
 assert.equal(field.x,400);assert.equal(field.y,400);assert.equal(f.p.hp,pulseHp);assert.ok(f.p.spirit>=spirit);
 step(f,5.2);assert.equal(useAbility(0,f.p,f.w,()=>{},f.t+f.time,aim),false);step(f,6);f.p.spirit=f.p.maxSpirit;cast(f);
});
test('initial hit and pulses slow all inside, refresh one burn and leave outside/friendly/dead foes untouched',()=>{
 const f=setup(),inside=Array.from({length:80},(_,i)=>foe(420+i%10*8,420+Math.floor(i/10)*8)),edge=foe(610,400),out=foe(611,400),diagonal=foe(555,555),friend=foe(420,400,{friendly:true}),dead=foe(420,400,{hp:0,dead:true}),boss=foe(460,400,{isBoss:true});
 f.w.enemies=[...inside,edge,out,diagonal,friend,dead,boss];cast(f);
 for(const e of [...inside,edge,boss]){assert.ok(e.hp<10000);assert.ok(e.slowTimer>0);assert.ok(burn(f,e)?.dot);}
 assert.ok(boss.slowTimer<inside[0].slowTimer);for(const e of [out,diagonal,friend])assert.equal(e.hp,10000);assert.equal(dead.hp,0);
 const entry=burn(f,inside[0]),until=entry.until;step(f,1.7);assert.equal(burn(f,inside[0]),entry);assert.ok(entry.until>until);assert.equal(entry.stacks,1);
});
test('Soul Burn follows an escaping foe for five seconds, stops on expiry, and cannot overwrite another Acolyte skill',()=>{
 const f=setup(),e=foe(430,400);f.w.enemies=[e];cast(f);e.x=750;const before=e.hp;step(f,1);assert.ok(e.hp<before);
 const entry=burn(f,e),bundle=getSubclassCombatState(f.p).afflictions.get(e);bundle.effects.get('acolyte').ability=resolveAbilityMorph(f.p,'gravecallerMurmuringHost','acolyte');
 assert.equal(entry.ability.id,id);step(f,4.2);assert.ok(!burn(f,e));const hp=e.hp;step(f,1);assert.equal(e.hp,hp);
});
test('solid walls block initial hits and pulses',()=>{
 const f=setup(),e=foe(480,400);f.w.enemies=[e];for(let y=0;y<f.w.height;y++)f.w.tiles[y][14].passable=false;
 cast(f);step(f,2);assert.equal(e.hp,10000);assert.ok(!burn(f,e));
});
test('visual expires with its field; the last burn persists; death/world/morph changes cancel both',()=>{
 const natural=setup(),e=foe(430,400);natural.w.enemies=[e];cast(natural);const visual=getSubclassCombatState(natural.p).fields[0].soulVisual;step(natural,6.1);
 assert.equal(visual.active,false);assert.equal(getSubclassCombatState(natural.p).fields.length,0);assert.ok(burn(natural,e));const hp=e.hp;step(natural,1);assert.ok(e.hp<hp);step(natural,4);assert.ok(!burn(natural,e));
 for(const reason of ['death','world','morph']){
  const f=setup(),target=foe(430,400);f.w.enemies=[target];cast(f);const v=getSubclassCombatState(f.p).fields[0].soulVisual;
  if(reason==='death'){f.p.hp=0;step(f,.1);}if(reason==='world')updateCombat(f.p,world(),{},.05,f.t+.1,()=>{});if(reason==='morph')clearAbilityMorphCombatState(f.p,id);
  assert.equal(v.active,false);assert.ok(!burn(f,target));const hp=target.hp;step(f,1);assert.equal(target.hp,hp);
 }
});
test('casts, hits and burn ticks grant no mastery XP; saves preserve choice without replaying effects',()=>{
 const f=setup();f.w.enemies=[foe(430,400)];const mastery=getAbilityMastery(f.p,id),xp=mastery.xp;cast(f);step(f,3);
 assert.equal(mastery.xp,xp);const loaded=normalizeProfileSave(sanitizeForSave(f.p));assert.equal(loaded.abilityMorphs[id],'acolyte');assert.equal(getSubclassCombatState(loaded),null);assert.ok(!loaded.activeChannel);
});
test('controller press casts immediately; holding or releasing never starts a channel or repeats the cast',()=>{
 const f=setup();assert.ok(updateAbilityInput(f.p,f.w,{...aim,ability0Pressed:true,ability0Held:true},.05,f.t,()=>{}));
 const original=getSubclassCombatState(f.p).fields[0];assert.ok(!f.p.abilityCharge?.active);assert.ok(!f.p.activeChannel);
 step(f,12.2);f.p.spirit=f.p.maxSpirit;
 assert.equal(updateAbilityInput(f.p,f.w,{...aim,ability0Held:true},.05,f.t+f.time,()=>{}),false);
 assert.equal(updateAbilityInput(f.p,f.w,{...aim,ability0Released:true},.05,f.t+f.time,()=>{}),false);
 assert.equal(original.soulVisual.active,false);assert.equal(getSubclassCombatState(f.p).fields.length,0);
 assert.ok(updateAbilityInput(f.p,f.w,{...aim,ability0Pressed:true,ability0Held:true},.05,f.t+f.time,()=>{}));assert.equal(getSubclassCombatState(f.p).fields.length,1);
});
test('original Soul Siphon remains intact and other morphs retain their distinct current controls',()=>{
 const f=setup(),base=getAbilityById(id);assert.equal(base.cd,7.2);assert.ok(!base.soulSiphonField);
 const knight=resolveAbilityMorph(f.p,id,'deathknight');
 assert.equal(knight.subclassMode,'auraChannel');assert.ok(knight.channelProfile);assert.ok(!knight.soulSiphonField);
});
console.log('Acolyte Soul Siphon verification complete.');
