import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery,applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {updateAbilityInput,updateCombat,useAbility} from '../src/combat.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
const id='gravecallerFuneralUrn';let now=100;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now*1000}});
function setup(){
 now=100;const p=createPlayer('Urn input');chooseClass(p,'gravecaller');p.skillState.combat.level=33;migratePlayer(p);p.spiritAwakened=true;p.x=p.y=400;
 for(const skill of [id,'graveSpark','gravecallerMurmuringHost']){unlockActiveAbility(p,skill,{autoAssignEmpty:false});getAbilityMastery(p,skill,true).level=20;if(skill!=='graveSpark')assert(selectAbilityMorph(p,skill,'acolyte',now).ok);}
 p.loadout.abilitySlots=['gravecallerMurmuringHost','graveSpark',id,null,'block'];p.spirit=p.maxSpirit=10000;
 const w={mode:'dungeon',width:40,height:40,tiles:Array.from({length:40},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]},logs=[];
 const input=keys=>({combatAimX:1,combatAimY:0,hasAim:true,...keys});
 return {p,w,logs,press(keys){return updateAbilityInput(p,w,input(keys),.016,now,m=>logs.push(m));},tick(dt=.016){now+=dt;updateCombat(p,w,input({}),dt,now,()=>{});},state:()=>getSubclassCombatState(p)};
}
const check=(name,fn)=>{fn();console.log('PASS',name);};
check('an Urn tap interrupts another held spell charge instead of being discarded',()=>{
 const c=setup();assert(c.press({ability1Pressed:true,ability1Held:true}));assert(c.p.abilityCharge?.active);
 assert(c.press({ability1Held:true,ability2Pressed:true}),JSON.stringify(c.logs));assert.equal(c.state()?.urns.length,1,'Urn press was swallowed by another spell charge');assert.equal(c.p.abilityCharge,null);
});
check('an Urn tap on the frame another spell releases casts the requested Urn once',()=>{
 const c=setup();assert(c.press({ability1Pressed:true,ability1Held:true}));const spirit=c.p.spirit;
 assert(c.press({ability1Released:true,ability2Pressed:true}));assert.equal(c.state()?.urns.length,1);assert(!c.p.cooldowns.graveSpark);assert(c.p.spirit<spirit);
});
check('reassigning a charged slot cannot leave the Urn behind a stale charge',()=>{
 const c=setup();c.p.loadout.abilitySlots[2]='graveSpark';assert(c.press({ability2Pressed:true,ability2Held:true}));c.p.loadout.abilitySlots[2]=id;
 assert(c.press({ability2Pressed:true,ability2Held:true}));assert.equal(c.state()?.urns.length,1);assert.equal(c.p.abilityCharge,null);
});
check('Urn switches cleanly from a held channel, including a reassigned channel slot',()=>{
 for(const reassign of [false,true]){const c=setup();const slot=reassign?2:0;c.p.loadout.abilitySlots[slot]='gravecallerMurmuringHost';assert(c.press({[`ability${slot}Pressed`]:true,[`ability${slot}Held`]:true}));assert(c.p.activeChannel);c.p.loadout.abilitySlots[2]=id;
 assert(c.press({[`ability${slot}Held`]:true,ability2Pressed:true}));assert.equal(c.state()?.urns.length,1);assert.equal(c.p.activeChannel,null);}
});
check('exact mastered resource cost and cooldown remain authoritative over repeated casts',()=>{
 const c=setup(),cost=applyAbilityMastery(c.p,resolveSubclassAbility(c.p,id)).cost;
 for(let i=0;i<120;i++){now+=.86;c.p.spirit=cost;assert(c.press({ability2Pressed:true}),JSON.stringify(c.logs.at(-1)));assert.equal(c.p.spirit,0);assert(!c.press({ability2Pressed:true}));c.tick();}
 now+=.86;c.p.spirit=cost-1;assert(!c.press({ability2Pressed:true}));assert.match(c.logs.at(-1),/spirit/);c.p.spirit=cost;assert(c.press({ability2Pressed:true}));assert(!c.p.activeChannel&&!c.p.abilityCharge);
});
check('ordinary charge release and dodge cancellation keep their existing behavior',()=>{
 const c=setup();assert(c.press({ability1Pressed:true,ability1Held:true}));assert(c.press({ability1Held:true}));assert(c.p.abilityCharge?.active);assert(c.press({ability1Released:true}));assert.equal(c.p.abilityCharge,null);assert.equal(c.p.cooldowns.graveSpark,now);
 const d=setup();assert(d.press({ability1Pressed:true,ability1Held:true}));assert(!d.press({dashPressed:true,ability2Pressed:true}));assert.equal(d.p.abilityCharge,null);assert(!d.p.cooldowns[id]);
});
