import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {STAMINA_ACTIONS,updateStaminaActions,ensureActionState,getDashVelocity} from '../src/combatActions.js';
import {updateCombat,useAbility} from '../src/combat.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getHumanAnimationPose} from '../src/playerAnimationController.js';
import {classMovementProfile} from '../src/classMovementProfiles.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {presentClassMobility} from '../src/classMovement.js';
const world=()=>({mode:'dungeon',width:50,height:40,tiles:Array.from({length:40},()=>Array.from({length:50},()=>({biome:'grass',passable:true}))),objects:[],enemies:[],effects:[],drops:[]});
const actor=c=>{const p=createPlayer('Movement '+c);chooseClass(p,c,()=>{});return Object.assign(p,{x:320,y:320,dirX:1,dirY:0,stamina:500,maxStamina:500,spirit:500,maxSpirit:500,hp:500,maxHp:500});};
const classes=['gravecaller','oathkeeper','fellhunter','lightbringer','thornbinder','waverider'];
const ids=['gravecallerGhostwalk','oathkeeperDivineLeap','fellhunterGrapplingHook','lightbringerDawnstep','thornbinderBriarstride','hydromancerRiptideStep'];
for(const c of classes){
 const p=actor(c),w=world(),baseline=JSON.stringify(STAMINA_ACTIONS);updateCombat(p,w,{dashPressed:true,moveX:1,moveY:0},.01,10,()=>{});
 assert(p.actionState.dashing);assert.equal(getDashVelocity(p).y,0,'stationary east-facing dodge drifted diagonally');
 assert.equal(getDashVelocity(p).x,STAMINA_ACTIONS.dash.speed);assert.equal(JSON.stringify(STAMINA_ACTIONS),baseline);
 assert.equal(w.effects.find(f=>f.kind==='classMovement').motif,classMovementProfile(c).motif);
 const pose=getHumanAnimationPose(p,{now:10,direction:{x:1,y:0}});assert.equal(pose.state,'dash');assert.equal(pose.rootScaleX,1);assert.equal(pose.rootScaleY,1);
 updateCombat(p,w,{},.2,10.2,()=>{});assert(w.effects.some(f=>f.kind==='classMovement'&&f.phase==='landing'));
 assert.equal(sanitizeForSave(p).actionState,undefined);
 console.log('PASS '+c+' dodge identity, unchanged motion constants, landing and runtime cleanup');
}
{
 const p=actor('fellhunter'),s=ensureActionState(p);s.dashCooldown=.08;
 updateStaminaActions(p,{dashPressed:true,moveX:0,moveY:-1},.01,20,()=>{});assert(!s.dashing);
 updateStaminaActions(p,{},.08,20.08,()=>{});assert(s.dashing);assert.equal(s.dashDirX,0);assert.equal(s.dashDirY,-1);
 const q=actor('oathkeeper'),a=ensureActionState(q);a.dashCooldown=.3;updateStaminaActions(q,{dashPressed:true},.01,30,()=>{});updateStaminaActions(q,{},.4,30.4,()=>{});assert(!a.dashing,'buffer outlived its 100ms window');
 console.log('PASS short dodge input buffer waits for existing cooldown and expires');
}
for(let i=0;i<classes.length;i++){
 const p=actor(classes[i]),w=world();unlockActiveAbility(p,ids[i]);assignAbilityToSlot(p,0,ids[i]);
 assert(useAbility(0,p,w,()=>{},40,{combatAimX:1,combatAimY:0,hasAim:true}),'mobility did not execute: '+ids[i]);
 assert(w.effects.some(f=>f.kind==='classMovement'),'mobility presentation disconnected: '+ids[i]);
 assert(w.effects.filter(f=>f.kind==='classMovement'&&f.phase==='landing').every(f=>f.dirX===1&&f.dirY===0),'landing did not follow travelled direction');
 const blocked=actor(classes[i]),wall=world();wall.tiles.forEach(row=>row[11].passable=false);unlockActiveAbility(blocked,ids[i]);assignAbilityToSlot(blocked,0,ids[i]);
 useAbility(0,blocked,wall,()=>{},50,{combatAimX:1,combatAimY:0,hasAim:true});assert(blocked.x<352,'mobility crossed solid boundary');
 assert(wall.effects.filter(f=>f.kind==='classMovement').every(f=>f.x<352),'trail crossed untravelled terrain');
 const arena=actor(classes[i]),barrier=world();barrier.arenaBarriers=[{x:352,y:32,w:16,h:1000}];unlockActiveAbility(arena,ids[i]);assignAbilityToSlot(arena,0,ids[i]);
 useAbility(0,arena,barrier,()=>{},55,{combatAimX:1,combatAimY:0,hasAim:true});assert(arena.x<352,'mobility crossed an arena barrier');
 const swimmer=actor(classes[i]),water=world();water.tiles.forEach(row=>row[11]={biome:'water',passable:false});unlockActiveAbility(swimmer,ids[i]);assignAbilityToSlot(swimmer,0,ids[i]);
 useAbility(0,swimmer,water,()=>{},56,{combatAimX:1,combatAimY:0,hasAim:true});assert(swimmer.x<352,'mobility bypassed a deep-water boundary');
 console.log('PASS '+ids[i]+' production execution and collision boundary');
}
{
 const p=actor('waverider'),w=world();unlockActiveAbility(p,'hydromancerRiptideStep');p.abilityMastery.hydromancerRiptideStep={level:20,xp:0};
 for(const morph of ['cryomancer','sunken']){
  p.cooldowns={};p.abilityUseCharges={};assert(selectAbilityMorph(p,'hydromancerRiptideStep',morph,60).ok);w.effects=[];
  presentClassMobility(p,w,{x:p.x-50,y:p.y},{id:'hydromancerRiptideStep'},60);assert.equal(w.effects[0].morph,morph);
 }
 for(let i=0;i<400;i++)presentClassMobility(p,w,{x:p.x-50,y:p.y},{id:'hydromancerRiptideStep'},60);
 assert(w.effects.length<=280);console.log('PASS existing per-skill morph palettes and bounded movement effects');
}
