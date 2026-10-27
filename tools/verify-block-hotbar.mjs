import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer,gainXp} from '../src/player.js';
import {RUNALIS_CLASSES} from '../src/classData.js';
import {normalizeAbilityManagementState,unlockActiveAbility,assignAbilityToSlot,clearAbilitySlot,getAbilityAvailability} from '../src/abilityLoadoutSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {HOTBAR_SLOT_COUNT,hasEquippedBlock} from '../src/hotbarConfig.js';
import {createControllerManager,getControllerInput} from '../src/inputController.js';
import {getKeyboardAbilitySlot,getAbilityBindingLabel} from '../src/abilityBindings.js';
import {updateAbilityInput,updateCombat,useAbility} from '../src/combat.js';
import {isBlocking,applyDefensiveDamage} from '../src/combatActions.js';
import {awardHotbarMasteryXp,getAbilityMastery} from '../src/abilityMasterySystem.js';
import {allocateEncounterXP,recordEnemyCombatContribution,grantSharedCombatKillXp} from '../src/combatProgression.js';
import {affinityMultiplier} from '../src/progressionProfiles.js';

const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const actor=(cls='gravecaller')=>{const p=createPlayer('Block tester');chooseClass(p,cls);Object.assign(p,{id:'block-tester',x:260,y:320,dirX:1,dirY:0,spiritAwakened:true,spirit:100,maxSpirit:100,stamina:200,maxStamina:200});return p;};
const world=()=>({mode:'dungeon',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]});
const aim={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,combatAimX:1,combatAimY:0,aimSource:'rightStick',hasAim:true};
const tick=(p,w,input,t=20,dt=.05)=>{updateAbilityInput(p,w,input,dt,t);updateCombat(p,w,input,dt,t);};

test('every starting class and legacy class alias knows Block in the fifth slot',()=>{
 assert.equal(HOTBAR_SLOT_COUNT,5);
 for(const cls of Object.keys(RUNALIS_CLASSES)){
  const p=actor(cls);assert.equal(p.loadout.abilitySlots.length,5);assert.equal(p.loadout.abilitySlots[4],'block');
  assert(p.knownAbilities.includes('block'));assert(getAbilityAvailability(p,'block').usable);
 }
});
test('old three/four-slot saves preserve assignments and gain Block once',()=>{
 for(const slots of [['graveSpark','summonLich','bloodLance'],['graveSpark','summonLich','bloodLance','soulSiphon']]){
  for(const version of [undefined,2,3]){
   const p=normalizeProfileSave({name:'Legacy',classId:'gravecaller',loadout:{abilitySlots:slots},abilityLayoutVersion:version});
   assert.deepEqual(p.loadout.abilitySlots,[...slots,...(slots.length===3?[null]:[]),'block']);
   assert(p.knownAbilities.includes('block'));assert(p.knownAbilities.includes(slots.at(-1)));
   migratePlayer(p);assert.equal(p.loadout.abilitySlots[4],'block');
  }
 }
});
test('clearing or replacing Block at level one survives normalization and saving',()=>{
 const p=actor();assert(clearAbilitySlot(p,4));migratePlayer(p);
 let loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(loaded.loadout.abilitySlots[4],null);assert(!hasEquippedBlock(loaded));
 assert(loaded.knownAbilities.includes('block'));assert(assignAbilityToSlot(loaded,4,'graveSpark').ok);
 loaded=normalizeProfileSave(sanitizeForSave(loaded));assert.equal(loaded.loadout.abilitySlots[4],'graveSpark');
 assert(!hasEquippedBlock(loaded));assert(assignAbilityToSlot(loaded,2,'block').ok);
 assert(hasEquippedBlock(normalizeProfileSave(sanitizeForSave(loaded))));
 const blank=actor('classless');clearAbilitySlot(blank,4);chooseClass(blank,'oathkeeper');assert.equal(blank.loadout.abilitySlots[4],null);
});
test('all four controllers route LT to fifth ability press/hold/release, preserving menu paging',()=>{
 for(let i=0;i<4;i++){
  const m=createControllerManager(),s=m.slots[i];s.connected=true;s.buttons=Array(16).fill(false);s.prevButtons=Array(16).fill(false);s.buttons[6]=true;
  let input=getControllerInput(m,i);assert(input.ability4Pressed&&input.ability4Held&&input.pageLeftPressed);assert(!input.blockHeld&&!input.attackHeld&&!input.ability0Held);
  const p=actor(),w=world();tick(p,w,input);assert(isBlocking(p));assert(p.stamina<200);
  s.prevButtons=s.buttons;s.buttons=Array(16).fill(false);input=getControllerInput(m,i);assert(input.ability4Released&&!input.ability4Held);tick(p,w,input,20.05);assert(!isBlocking(p));
 }
 assert.equal(getKeyboardAbilitySlot('f'),4);assert.equal(getKeyboardAbilitySlot('5'),4);
 assert.equal(getKeyboardAbilitySlot('z',{inputBindings:{abilityKeys:['q','r','x','4','z']}}),4);
 assert.equal(getAbilityBindingLabel(null,4),'F / LT');
});
test('Block holds in any hotbar slot and keeps stamina drain, mitigation and guard breaks',()=>{
 for(let slot=0;slot<5;slot++){
  const p=actor(),w=world();clearAbilitySlot(p,4);assignAbilityToSlot(p,slot,'block');tick(p,w,{[`ability${slot}Held`]:true,[`ability${slot}Pressed`]:true});
  assert(isBlocking(p));const before=p.stamina,result=applyDefensiveDamage(p,100);
  assert(result.blocked);assert.equal(result.hpDamage,38);assert(p.stamina<before);
  p.stamina=3;const broken=applyDefensiveDamage(p,100);assert(broken.guardBroken);assert(!isBlocking(p));
 }
});
test('LT replacement casts a real spell without blocking; removed Block cannot use the mouse shortcut',()=>{
 const p=actor(),w=world();assignAbilityToSlot(p,4,'graveSpark');
 tick(p,w,{...aim,ability4Pressed:true,ability4Held:true});assert(!isBlocking(p));assert(p.abilityCharge?.active);
 tick(p,w,{...aim,ability4Released:true},20.06);
 assert(p.combatProjectiles?.length>0||w.effects.length>0||p.cooldowns.graveSpark!==undefined);
 tick(p,w,{blockHeld:true},20.1);assert(!isBlocking(p));
 assignAbilityToSlot(p,1,'block');tick(p,w,{...aim,ability4Held:true},20.2);assert(!isBlocking(p));
 tick(p,w,{ability1Held:true},20.3);assert(isBlocking(p));clearAbilitySlot(p,1);assert(!isBlocking(p));
});
test('fifth-slot channels start and release; fifth-slot Block cancels an existing channel',()=>{
 const p=actor(),w=world();unlockActiveAbility(p,'gravecallerMurmuringHost',{autoAssignEmpty:false});assignAbilityToSlot(p,4,'gravecallerMurmuringHost');
 tick(p,w,{...aim,ability4Pressed:true,ability4Held:true});assert.equal(p.activeChannel?.slot,4);
 tick(p,w,{...aim,ability4Released:true},20.1);assert.equal(p.activeChannel,null);
 assignAbilityToSlot(p,3,'gravecallerMurmuringHost');assignAbilityToSlot(p,4,'block');
 tick(p,w,{...aim,ability3Pressed:true,ability3Held:true},20.2);assert(p.activeChannel);
 tick(p,w,{...aim,ability4Pressed:true,ability4Held:true},20.3);assert.equal(p.activeChannel,null);assert(isBlocking(p));
});
test('fifth-slot mastery comes from XP without using Block and duplicate slots do not multiply XP',()=>{
 const p=actor();awardHotbarMasteryXp(p,10);assert.equal(getAbilityMastery(p,'block').xp,10);
 assignAbilityToSlot(p,3,'block');awardHotbarMasteryXp(p,10);assert.equal(getAbilityMastery(p,'block').xp,20);
});
test('keeping Block equipped grants exactly 25% extra direct Defence XP, with class affinity stacking once',()=>{
 for(const cls of ['gravecaller','oathkeeper']){
  const p=actor(cls),q=actor(cls);clearAbilitySlot(q,4);
  gainXp(p,'defence',8);gainXp(q,'defence',8);assert.equal(p.skillState.skills.defence.xp,q.skillState.skills.defence.xp*1.25);
  assert.equal(affinityMultiplier(p,'defence'),cls==='oathkeeper'?1.5625:1.25);
  assert.equal(affinityMultiplier(p,'spirit'),affinityMultiplier(q,'spirit'));
 }
});
test('encounter awards boost Defence while Block is unused, and the bonus is not applied twice',()=>{
 const p=actor(),q=actor();clearAbilitySlot(q,4);
 const contribution={weapons:{scythe:10},damage:10,abilities:{},support:{},hotbar:[]};
 const a=allocateEncounterXP(p,contribution,80),b=allocateEncounterXP(q,contribution,80);
 for(const row of a){const other=b.find(r=>r.skillId===row.skillId);assert.equal(row.amount,other.amount*(row.skillId==='defence'?1.25:1));}
 for(const player of [p,q]){
  const e={id:player===p?'with-block':'without-block',hp:0,maxHp:10,xp:80,level:1,combatTargetKind:'player',combatTargetId:player.id};
  recordEnemyCombatContribution(e,player,'scythe',10,{source:'weapon',weaponType:'scythe'});grantSharedCombatKillXp(player,e,80);
 }
 assert.equal(p.skillState.skills.defence.xp,q.skillState.skills.defence.xp*1.25);
 assert(getAbilityMastery(p,'block').xp>0);
});

fs.mkdirSync('docs/block-hotbar',{recursive:true});
fs.writeFileSync('docs/block-hotbar/verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');
console.log(`${checks.length} Block and fifth-slot checks passed.`);
