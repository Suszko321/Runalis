import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {getSubclassCombatState,clearSubclassCombatState,clearAbilityMorphCombatState} from '../src/subclassCombat.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
import {abilitySummary} from '../src/uiInformation.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const id='gravecallerFuneralUrn',checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const foe=(id,x=610,y=400)=>({id,kind:'brute',x,y,radius:12,hp:100000,maxHp:100000});
function setup(){now=100;const p=createPlayer('Urn review');assert(chooseClass(p,'gravecaller'));p.skillState.combat.level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0,spiritAwakened:true});
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[foe('first')],effects:[],drops:[]};updateCombat(p,w,{},0,now,()=>{});p.spirit=p.maxSpirit=10000;p.hp=p.maxHp*.5;unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,'acolyte',now).ok);p.loadout.abilitySlots=[id,null,null,null,'block'];
 const aim={combatAimX:1,combatAimY:0,hasAim:true};return {p,w,cast(){return useAbility(0,p,w,()=>{},now,aim);},advance(seconds,dt=.025){for(let i=0;i<Math.round(seconds/dt);i++){now+=dt;updateCombat(p,w,{},dt,now,()=>{});}},state(){return getSubclassCombatState(p);}};
}
test('one affordable, uncharged throw travels before shattering into exactly three ghosts',()=>{
 const c=setup(),a=resolveAbilityMorph(c.p,id,'acolyte'),spirit=c.p.spirit;assert(a.spectralUrn&&!a.canCharge&&!a.channelProfile);assert.equal(a.cd,.85);assert.equal(a.cost,9);assert.match(abilitySummary(a),/Throw.*three ghosts.*four seconds/);
 assert(c.cast());assert.equal(c.state().urns.length,1);assert.equal(c.state().spirits.length,0);assert(!c.p.activeChannel);assert(c.p.spirit<spirit);assert(!c.cast());c.advance(.2);assert.equal(c.state().spirits.length,0);assert(c.state().urns[0].progress>0&&c.state().urns[0].progress<1);c.advance(.2);assert.equal(c.state().urns.length,0);assert.equal(c.state().spirits.length,3);assert(c.w.effects.some(f=>f.geometry==='urnShatter'));assert.equal(c.w.enemies[0].hp,100000,'damage before the ghosts have attacked');
});
test('additional urns overlap without replacing earlier living spirits and improve damage',()=>{
 const solo=setup();solo.cast();solo.advance(2.2);const one=100000-solo.w.enemies[0].hp;
 const c=setup();c.cast();c.advance(.875);const first=c.state().spirits.map(g=>g);assert.equal(first.length,3);assert(c.cast());c.advance(.4);assert.equal(c.state().spirits.length,6);assert(first.every(g=>c.state().spirits.includes(g)));c.advance(.925);assert(100000-c.w.enemies[0].hp>one,'overlap failed to increase pressure');
});
test('ghosts seek and spread across nearby enemies, weaken them and never attack distant or friendly targets',()=>{
 const c=setup();c.w.enemies=[foe('a',610,400),foe('b',650,440),foe('c',680,365),foe('far',970,400),{...foe('friend',640,400),friendly:true}];c.cast();c.advance(2);assert(c.w.enemies.slice(0,3).every(e=>e.hp<e.maxHp));assert(c.w.enemies.slice(0,3).every(e=>e.subclassWeakenedUntil>now));assert(c.w.enemies.slice(3).every(e=>e.hp===e.maxHp));assert(c.state().spirits.every(g=>g.target&&!g.target.friendly));
 const positions=c.state().spirits.map(g=>`${Math.round(g.x)},${Math.round(g.y)}`);assert(new Set(positions).size>1,'ghosts stacked into one position');
});
test('spirits retarget after a kill; their acquisition stays around the urn rather than following the player forever',()=>{
 const c=setup();c.w.enemies=[foe('a',610),foe('b',710)];c.cast();c.advance(.8);c.w.enemies[0].hp=0;c.w.enemies[0].dead=true;c.advance(.5);assert(c.state().spirits.every(g=>g.target===c.w.enemies[1]));
 c.p.x=1100;c.w.enemies[1].x=1050;const hp=c.w.enemies[1].hp;c.advance(1);assert.equal(c.w.enemies[1].hp,hp);assert(c.state().spirits.every(g=>!g.target));
});
test('terrain clamps the throw and prevents ghost attacks through walls',()=>{
 const c=setup();for(let y=0;y<c.w.height;y++)c.w.tiles[y][16].passable=false;c.cast();assert(c.state().urns[0].endX<512);c.advance(3);assert.equal(c.w.enemies[0].hp,c.w.enemies[0].maxHp);assert(c.state().spirits.every(g=>g.x<512));
 const q=setup();q.cast();q.advance(.2);for(let y=0;y<q.w.height;y++)q.w.tiles[y][18].passable=false;q.advance(1);assert.equal(q.w.enemies[0].hp,q.w.enemies[0].maxHp);assert(q.state().spirits.every(g=>g.anchorX<576),'a newly raised wall was bypassed');
});
test('each ghost has a short lifetime and bounded strike count; stale updates cannot deal expired damage',()=>{
 const c=setup();c.cast();c.advance(.4);const ghosts=[...c.state().spirits];c.advance(4.2);assert.equal(c.state().spirits.length,0);assert(ghosts.every(g=>g.strikes<=4&&g.until<=g.born+4+.001));const hp=c.w.enemies[0].hp;c.advance(2);assert.equal(c.w.enemies[0].hp,hp);
 const q=setup();q.cast();now+=6;updateCombat(q.p,q.w,{},6,now,()=>{});assert.equal(q.state().urns.length,0);assert.equal(q.state().spirits.length,0);assert.equal(q.w.enemies[0].hp,100000);
});
test('damage is attributed to this skill and its owner, with no direct mastery XP or new lifesteal',()=>{
 const c=setup(),xp=getAbilityMastery(c.p,id).xp,hp=c.p.hp;c.cast();c.advance(2);const entries=Object.values(c.w.enemies[0].combatContributors);assert.equal(entries.length,1);assert.equal(entries[0].actor,c.p);assert(entries[0].abilities[id]>0);assert.equal(getAbilityMastery(c.p,id).xp,xp);assert.equal(c.p.hp,hp);
});
test('Expertise changes ghost damage once; death, morph, world and skill cleanup remove urns and ghosts',()=>{
 const damage=[];for(const family of [null,'acolyte','deathknight']){const c=setup();if(family)c.p.skillTree.spent[expertiseNodeId('gravecaller',family)]=1;c.cast();c.advance(2);damage.push(100000-c.w.enemies[0].hp);}assert(Math.abs(damage[1]/damage[0]-1.15)<.1,JSON.stringify(damage));assert(Math.abs(damage[2]/damage[0]-.9)<.1,JSON.stringify(damage));
 for(const reason of ['death','morph','world']){const c=setup();c.cast();c.advance(.875);c.cast();const hp=c.w.enemies[0].hp;if(reason==='death'){c.p.hp=0;c.advance(.025);}else if(reason==='morph')clearAbilityMorphCombatState(c.p,id);else clearSubclassCombatState(c.p,'worldChanged');c.advance(1);assert.equal(c.w.enemies[0].hp,hp);assert(!c.state()||!c.state().urns.length&&!c.state().spirits.length);}
});
test('continuous throwing remains bounded while normal play supports multiple groups',()=>{
 const c=setup();let max=0;for(let i=0;i<80;i++){c.p.cooldowns={};c.cast();c.advance(.05);max=Math.max(max,c.state().spirits.length);assert(c.state().urns.length<=8);assert(c.state().spirits.length<=24);}assert(max>=9);c.advance(5);assert.equal(c.state().spirits.length,0);assert.equal(c.state().urns.length,0);
});
fs.mkdirSync('docs/acolyte-funeral-urn',{recursive:true});fs.writeFileSync('docs/acolyte-funeral-urn/verification.json',JSON.stringify({checks},null,2));console.log(JSON.stringify({passed:checks.length}));
