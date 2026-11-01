import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {useAbility,updateEnemies} from '../src/combat.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {getTauntTarget} from '../src/tankTaunt.js';
import {getLivingPartyMembers} from '../src/partySupport.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const aim={hasAim:true,combatAimX:1,combatAimY:0};
function fixture(cls){
 const party=Array.from({length:4},(_,i)=>{const p=createPlayer('P'+(i+1));chooseClass(p,cls);migratePlayer(p);Object.assign(p,{id:'P'+i,slot:i+1,x:320+i*8,y:320});return p;});
 party[0].coop={enabled:true,players:party.slice(1)};for(const p of party.slice(1))Object.defineProperty(p,'questOwner',{value:party[0],enumerable:false});
 const w={mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]};
 for(const p of party){useAbility('block',p,w,()=>{},now,aim);p.hp=20;p.spirit=p.maxSpirit=1000;p.stamina=p.maxStamina=1000;}
 return {party,w};
}
function cast(p,w,id,morph){unlockActiveAbility(p,id,{autoAssignEmpty:false});if(morph){getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,morph,now).ok);}assert(useAbility(id,p,w,console.log,now,aim),id);}
for(let slot=0;slot<4;slot++)for(const morph of [null,'cryomancer'])for(const id of ['hydromancerMendingCurrent','hydromancerBubbleWard']){
 const {party,w}=fixture('waverider'),p=party[slot],before=party.map(a=>a.spirit);
 cast(p,w,id,morph);
 for(let i=0;i<4;i++){
  if(id==='hydromancerMendingCurrent')assert(party[i].hp>20,`P${slot+1} heal P${i+1}`);
  else assert(morph?party[i].buffs.defense?.timer>0:party[i].buffs.bubbleWard?.until>now,`P${slot+1} buff P${i+1}`);
  if(i!==slot){assert.equal(party[i].spirit,before[i]);assert.equal(party[i].cooldowns[id],undefined);}
 }
 console.log(`PASS P${slot+1} ${morph||'original'} ${id} reaches all four; payer isolated`);
}
for(const excluded of ['range','downed','inactive']){
 const {party,w}=fixture('waverider');if(excluded==='range')party[0].x=900;if(excluded==='downed')party[0].lifeState='downed';if(excluded==='inactive')party[0].active=false;
 cast(party[3],w,'hydromancerMendingCurrent');cast(party[3],w,'hydromancerBubbleWard');assert.equal(party[0].hp,20);assert(!party[0].buffs?.bubbleWard);console.log('PASS support exclusion '+excluded);
}
for(const [cls,id,morph]of [['oathkeeper','oathkeeperBulwarkOfLight',null],['gravecaller','gravecallerFuneralUrn','deathknight'],['thornbinder','thornbinderLivingBriar','petalknight']])for(let slot=0;slot<4;slot++){
 const {party,w}=fixture(cls),p=party[slot];
 const foe=(extra={})=>({id:'foe',kind:'rat',name:'Enemy',x:400,y:320,hp:10000,maxHp:10000,r:12,damage:1,speed:0,aggro:3,attackCooldown:10,...extra});
 const e=foe(),boss=foe({id:'boss',isBoss:true}),far=foe({id:'far',x:900}),friendly=foe({id:'friend',friendly:true});w.enemies=[e,boss,far,friendly];
 cast(p,w,id,morph);if(morph)assert(resolveSubclassAbility(p,id).desc.includes('Taunts visible'),'morph tooltip exposes challenge');assert.equal(getTauntTarget(e,w,now),p);for(const other of [boss,far,friendly])assert.equal(getTauntTarget(other,w,now),null);
 updateEnemies(.01,party[0],w,()=>{},now);assert.equal(e.combatTargetId,p.id,'actual AI selects tank');
 assert.equal(getTauntTarget(e,w,now+4.01),null);console.log(`PASS P${slot+1} ${morph||cls} real cast/AI/expiry and exclusions`);
}
{
 const {party,w}=fixture('oathkeeper'),p=party[0],e={id:'cover',kind:'rat',x:400,y:320,hp:100,maxHp:100};w.enemies=[e];
 for(const row of w.tiles)row[11]={biome:'wall',passable:false};
 cast(p,w,'oathkeeperBulwarkOfLight');assert.equal(getTauntTarget(e,w,now),null);
 for(const row of w.tiles)row[11]={biome:'grass',passable:true};p.cooldowns={};cast(party[1],w,'oathkeeperBulwarkOfLight');assert.equal(getTauntTarget(e,w,now),party[1]);
 e.x=900;assert.equal(getTauntTarget(e,w,now),null);console.log('PASS cover prevents taunt; leaving leash releases it');
}
{
 const {party,w}=fixture('oathkeeper'),e={id:'transfer',kind:'rat',x:400,y:320,hp:100,maxHp:100};w.enemies=[e];
 cast(party[0],w,'oathkeeperBulwarkOfLight');cast(party[3],w,'oathkeeperBulwarkOfLight');assert.equal(getTauntTarget(e,w,now),party[3]);party[3].lifeState='downed';assert.equal(getTauntTarget(e,w,now),null);
 assert.equal(getLivingPartyMembers(party[2]).length,3);console.log('PASS latest tank owns taunt; downing revokes without reviving');
}
