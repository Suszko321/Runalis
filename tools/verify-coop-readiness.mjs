import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {recordEnemyCombatContribution,grantSharedCombatKillXp} from '../src/combatProgression.js';
import {updateEnemies} from '../src/combat.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {resolveControllerPlayerAssignments} from '../src/inputController.js';
import {partyColor} from '../src/partyIdentity.js';
import {handleActorZeroHpForCoop,processReviveInput,updateCoopReviveTimers} from '../src/coopReviveSystem.js';
const actor=slot=>{const p=createPlayer('P'+slot);chooseClass(p,'oathkeeper');Object.assign(p,{slot,x:300,y:300});return p;};
for(const slot of [1,2]){
 const a=actor(1),b=actor(2),target=slot===1?a:b,reviver=target===a?b:a;a.coop={players:[b]};let wipes=0;
 const g={player:a,world:{},log(){},handlePlayerDefeated(){wipes++;},respawnActorAtNavStone(p){p.x=400;}};
 target.hp=0;handleActorZeroHpForCoop(g,target,10);assert.equal(target.lifeState,'downed');assert(reviver.hp>0);assert.equal(wipes,0);
 processReviveInput(g,reviver,{confirmPressed:true},0,11);
 for(let i=0;i<3;i++){reviver.reviveAction.cursor=reviver.reviveAction.targetCenter;processReviveInput(g,reviver,{confirmPressed:true},0,12+i);}
 assert.equal(target.lifeState,'alive');assert.equal(target.hp,target.maxHp);assert.equal(reviver.reviveAction,null);
 console.log(`PASS P${slot} downing and three-hit revive recover only that actor without wiping the survivor`);
}
{
 const a=actor(1),b=actor(2);a.coop={players:[b]};const g={player:a,world:{},log(){},respawnActorAtNavStone(p){p.x=400;}};
 b.hp=0;handleActorZeroHpForCoop(g,b,10);updateCoopReviveTimers(g,21,31);assert.equal(b.lifeState,'alive');assert(b.hp>0);assert.equal(b.x,400);assert.equal(a.hp,a.maxHp);
 console.log('PASS P2 bleedout respawns at Nav Stone without changing P1 health');
}
for(const killerSlot of [1,2])for(const source of ['weapon','summon','dot']){
 const a=actor(1),b=actor(2),killer=killerSlot===1?a:b,helper=killer===a?b:a;
 const e={id:'xp-check',kind:'rat',name:'Reward target',hp:0,maxHp:50,x:300,y:300,xp:101,combatTargetKind:'player',combatTargetId:killer.slot};
 recordEnemyCombatContribution(e,helper,'blade',10,{source:'weapon'});
 recordEnemyCombatContribution(e,killer,'blade',40,{source:source==='dot'?'ability':source});
 grantSharedCombatKillXp(a,e,101);
 assert.equal(killer.skillState.combat.xp,101);assert.equal(helper.skillState.combat.xp,50.5);
 grantSharedCombatKillXp(a,e,101);assert.equal(killer.skillState.combat.xp,101);assert.equal(helper.skillState.combat.xp,50.5);
 console.log(`PASS P${killerSlot} ${source} attribution: 101 / 50.5 XP, duplicate callback ignored`);
}
{
 const a=actor(1),b=actor(2),idle=actor(3),e={x:300,y:300,xp:100};
 recordEnemyCombatContribution(e,a,'blade',10,{source:'weapon'});recordEnemyCombatContribution(e,b,'blade',10,{source:'weapon'});b.x=1401;
 grantSharedCombatKillXp(a,e,100);assert.equal(a.skillState.combat.xp,50);assert.equal(b.skillState.combat.xp,0);assert.equal(idle.skillState.combat.xp,0);
 console.log('PASS existing contribution and 1000-unit proximity eligibility preserved');
}
{
 const a=actor(1),b=actor(2),w=createDungeonWorld({seed:'coop-reward-check'});a.coop={players:[b]};Object.defineProperty(b,'questOwner',{value:a});
 Object.assign(a,w.spawn);Object.assign(b,w.spawn);const e=w.enemies[0];Object.assign(e,{x:b.x,y:b.y,hp:0,xp:20,baseCombatXp:20});
 recordEnemyCombatContribution(e,b,'blade',20,{source:'weapon'});w.enemies=[e];
 updateEnemies(.016,a,w,()=>{},1);assert.equal(b.skillState.combat.xp,20);assert.equal(a.skillState.combat.xp,0);
 assert(b.skillState.skills.renown.xp>0);assert.equal(a.skillState.skills.renown.xp,0);
 updateEnemies(.016,a,w,()=>{},2);assert.equal(b.skillState.combat.xp,20);
 console.log('PASS real enemy death loop credits P2 combat and renown exactly once');
}
{
 const pads=[{slotIndex:0,connected:true},{slotIndex:1,connected:true}];
 assert.equal(resolveControllerPlayerAssignments(pads).player1.slotIndex,0);
 const disconnected=resolveControllerPlayerAssignments([pads[1]],0);
 assert.equal(disconnected.player1,null);assert.deepEqual(disconnected.additionalPlayers,[pads[1]]);
 assert.equal(resolveControllerPlayerAssignments(pads,0).player1.slotIndex,0);
 assert.equal(resolveControllerPlayerAssignments([{slotIndex:2,connected:true}]).player1.slotIndex,2);
 assert.equal(new Set([1,2,3,4].map(slot=>partyColor({slot}))).size,4);
 console.log('PASS host controller ownership survives unplug/reconnect; all four player colours are distinct');
}

