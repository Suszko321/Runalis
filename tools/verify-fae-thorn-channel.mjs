import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
import {getCombatTechniqueState} from '../src/combatExpansion.js';
import {abilitySummary} from '../src/uiInformation.js';

const id='thornbinderThornLash',hostId='gravecallerMurmuringHost';
const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
const clock=()=>performance.now()/1000+20;
function fixture(host=false){
 const p=createPlayer('Channel test');chooseClass(p,host?'gravecaller':'thornbinder');
 Object.assign(p,{id:host?'host':'fae',x:260,y:320,dirX:1,dirY:0,equipment:{}});
 for(const skill of Object.values(p.skillState.skills))skill.level=15;
 migratePlayer(p);p.spiritAwakened=true;p.spirit=p.maxSpirit=2000;
 const abilityId=host?hostId:id;unlockActiveAbility(p,abilityId,{autoAssignEmpty:false});
 getAbilityMastery(p,abilityId,true).level=20;p.loadout.abilitySlots[0]=abilityId;
 const now=clock();if(!host)assert(selectAbilityMorph(p,id,'fae',now).ok);
 const w={mode:'dungeon',width:40,height:24,tiles:Array.from({length:24},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 updateCombat(p,w,aim,0,now,()=>{});p.spirit=p.maxSpirit;
 return {p,w,now};
}
const foe=(x=420,y=320)=>({id:'target',kind:'rat',name:'Target',x,y,hp:100000,maxHp:100000,radius:12,r:12,attackCooldown:20});
function tick(f,elapsed,input=aim,dt=.05){updateCombat(f.p,f.w,input,dt,f.now+elapsed,()=>{});}
const f=fixture(),resolved=resolveSubclassAbility(f.p,id),host=getAbilityById(hostId);
assert(resolved.channelProfile);assert.equal(resolved.canCharge,false);assert.equal(resolved.noUseCharges,true);
assert(resolved.channelProfile.costPerSecond>host.channelProfile.costPerSecond);
assert(resolved.channelProfile.costPerSecond<21,'Upkeep reduced from the previous version');
assert.equal(resolved.cost,5,'Start cost reduced from six');
assert.match(abilitySummary(resolved),/butterflies.*curve.*Lower damage/);
assert(useAbility(0,f.p,f.w,()=>{},f.now,aim));
tick(f,.05);const first=getSubclassCombatState(f.p).shots[0];assert(first,'No target required to emit');
assert(first.speed>260*2);const start={x:first.x,y:first.y,aim:{...first.aim}};
tick(f,.1);
assert(first.x>start.x);assert.equal(first.y,start.y);assert.deepEqual(first.aim,start.aim,'Untargeted shot continues straight');
const emitted=new Set([first]);
for(let t=.15;t<=.5;t+=.05){tick(f,t);for(const shot of getSubclassCombatState(f.p).shots)emitted.add(shot);}
assert(emitted.size>=2,'Held channel repeatedly emits projectiles; faster shots can leave the arena sooner');
const existing=getSubclassCombatState(f.p).shots.map(shot=>({shot,aim:{...shot.aim}}));
tick(f,.55,{...aim,combatAimX:0,combatAimY:1});
for(const entry of existing)assert.deepEqual(entry.shot.aim,entry.aim,'Steering affects only future shots');
for(let t=.6;t<=1;t+=.05)tick(f,t,{...aim,combatAimX:0,combatAimY:1});
assert(getSubclassCombatState(f.p).shots.some(shot=>shot.aim.y>.5),'New shots follow steered aim');
tick(f,1.05,{...aim,ability0Held:false,ability0Released:true});assert.equal(f.p.activeChannel,null);
for(let t=1.1;t<=3;t+=.05)tick(f,t,{...aim,ability0Held:false});
assert.equal(getSubclassCombatState(f.p).shots.length,0,'Released stream finishes without new shots');
// Off-axis aim assist tracks a moving foe at both common and slower frame rates.
for(const dt of [1/60,.1]){
 const lock=fixture(),target=foe(440,390);lock.w.enemies=[target];
 assert(useAbility(0,lock.p,lock.w,()=>{},lock.now,aim));tick(lock,dt,aim,dt);
 const shot=getSubclassCombatState(lock.p).shots[0];assert.equal(shot.target,target,'Generous cone acquires nearby foe');
 assert(shot.aim.y>0,'Butterfly curves toward the target');
 for(let time=dt*2;time<=1;time+=dt){if(time<.4)target.y+=40*dt;tick(lock,time,aim,dt);}
 assert(target.hp<target.maxHp,'Off-axis moving target receives hits');
}
const selection=fixture(),aligned=foe(480,320),nearby=foe(390,365),behind=foe(150,320);
selection.w.enemies=[nearby,behind,aligned];assert(useAbility(0,selection.p,selection.w,()=>{},selection.now,aim));tick(selection,.05);
assert.equal(getSubclassCombatState(selection.p).shots[0].target,aligned,'Aim alignment takes priority over a closer side target');
aligned.hp=0;tick(selection,.1);assert.equal(getSubclassCombatState(selection.p).shots[0].target,nearby,'Dead target can be replaced by a visible foe ahead');
assert.equal(behind.hp,behind.maxHp,'Enemies behind the player are not selected');
for(const input of [{...aim,dashPressed:true},{...aim,ability1Pressed:true}]){
 const test=fixture();assert(useAbility(0,test.p,test.w,()=>{},test.now,aim));tick(test,.05,input);assert.equal(test.p.activeChannel,null);
}
const low=fixture();low.p.spirit=resolved.cost+1;assert(useAbility(0,low.p,low.w,()=>{},low.now,aim));tick(low,.3);assert.equal(low.p.activeChannel,null,'Spirit exhaustion ends channel');
const blocked=fixture();blocked.w.enemies=[foe(500)];for(const row of blocked.w.tiles)row[12].passable=false;
assert(useAbility(0,blocked.p,blocked.w,()=>{},blocked.now,aim));for(let t=.05;t<=2;t+=.05)tick(blocked,t);
assert.equal(blocked.w.enemies[0].hp,100000,'Walls stop projectiles');
assert(getSubclassCombatState(blocked.p).shots.every(shot=>!shot.target),'Occluded enemies cannot be locked');
const comparisons=[];
for(const isHost of [false,true]){
 const test=fixture(isHost);test.w.enemies=[foe()];const before=test.p.spirit;
 assert(useAbility(0,test.p,test.w,()=>{},test.now,aim));
 for(let step=1;step<=60;step++)tick(test,step*.05);
 comparisons.push({name:isHost?'Murmuring Host':'Fae Thorn Lash',damage:100000-test.w.enemies[0].hp,spirit:before-test.p.spirit});
 if(isHost)assert(getCombatTechniqueState(test.p).projectiles.every(shot=>shot.speed<resolved.projectileSpeed));
 else assert(getSubclassCombatState(test.p).shots.length<=32);
}
assert(comparisons[0].damage>0);assert(comparisons[0].damage<comparisons[1].damage,'Fae does less total damage over the same channel time');
assert(comparisons[0].spirit>comparisons[1].spirit,'Fae costs slightly more over the same channel time');
for(const morph of ['base','petalknight']){const p=fixture().p;assert(selectAbilityMorph(p,id,morph,clock()).ok);assert(!resolveSubclassAbility(p,id).channelProfile,`${morph} retains original casting`);}
console.log(JSON.stringify({pass:true,comparisons,projectileSpeed:resolved.projectileSpeed,spiritPerSecond:resolved.channelProfile.costPerSecond,checks:'sustained empty-air firing, moving off-axis targets at 60/10 FPS, aim priority, retargeting, steering, release, dodge, depletion, walls, reduced cost, lower damage, other forms unchanged'}));
