import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass} from '../src/player.js';
import {getSummonMovementSpeed,getPlayerMovementMultiplier,updateSummons,useAbility,updateCombat} from '../src/combat.js';
import {getDashVelocity} from '../src/combatActions.js';
import {resolveSummonMovementSpeed} from '../src/summonMovementSpeed.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';

const world=()=>({mode:'dungeon',width:128,height:24,tiles:Array.from({length:24},()=>Array.from({length:128},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
function owner(){const p=createPlayer('Movement review');chooseClass(p,'gravecaller');Object.assign(p,{id:'movement-review',x:500,y:320,dirX:1,dirY:0});p.equipment.weapon='demonseedScythe';getPlayerMovementMultiplier(p);return p;}
const cases=[
 ['Skeleton','lich',155,'skeletonServant'],['Wolf','wolf',225,'wolf'],['Dire Wolf','wolf',210,'wolf'],
 ['Demon','miniDemon',185,'miniDemon'],['Legendary demon','miniDemon',112,'miniDemon'],
 ['Thornling','thornbeast',200,'thornling'],['Elder Thornbeast','thornbeast',150,'elderThornbeast'],
 ['Fae Thornling','thornbeast',200,'thornling','fae'],['Fae Elder','thornbeast',150,'elderThornbeast','fae'],
 ['Horror','eldritchHorror',165,'lesserHorror'],['Ancient horror','eldritchHorror',165,'oldHorror'],
 ['Lich','greaterLich',150,'lich','base'],
 ['Specter','greaterLich',190,'lich','acolyte'],['Goliath','greaterLich',110,'lich','deathknight'],
 ['Death Echo','lich',155,'skeletonServant']
];
const scenarios={walk(p){},sprint(p){p.actionState.sprinting=true;},haste(p){p.subclassHasteUntil=performance.now()/1000+100;},
 sprintAndBonuses(p){p.actionState.sprinting=true;p.subclassHasteUntil=performance.now()/1000+100;p.skillTree.spent.vampire_predation=1;},
 dash(p){Object.assign(p.actionState,{dashing:true,dashDirX:1,dashDirY:0});},block(p){p.actionState.blocking=true;}};
const results=[];
for(const [name,kind,speed,stage,morph] of cases)for(const [scenario,setup] of Object.entries(scenarios)){
 const p=owner(),w=world();getPlayerMovementMultiplier(p);setup(p);
 const s={id:'movement-summon',kind,x:300,y:320,hp:100,maxHp:100,damage:5,speed,armour:0,attackRate:1,attackRange:34,alive:true,evolutionStage:stage,summonMorph:morph,
  ...(name==='Legendary demon'?{legendaryTemporary:true,expiresAt:performance.now()/1000+100}:{}),...(name==='Death Echo'?{legendaryTemporary:true,techniqueTemporary:true}: {})};p.summons=[s];
 const dash=getDashVelocity(p),ownerSpeed=Math.max(205*getPlayerMovementMultiplier(p),Math.hypot(dash.x,dash.y));
 const effective=getSummonMovementSpeed(s,p);assert.ok(effective>ownerSpeed,`${name}/${scenario}: faster than owner`);
 const gap=p.x-s.x,authored=s.speed,t=performance.now()/1000;
 for(let i=0;i<30;i++){p.x+=ownerSpeed/60;updateSummons(1/60,p,w,()=>{},t+i/60);}
 assert.ok(p.x-s.x<gap,`${name}/${scenario}: falls behind while following`);assert.equal(s.speed,authored,'Authored speed must not ratchet after buffs');
 // Chase uses the same floor, including the combat formation approach.
 w.enemies=[{id:'target',kind:'rat',x:s.x+200,y:s.y,hp:10000,maxHp:10000,radius:12,combatTargetKind:'summon',combatTargetId:s.id}];
 const x=s.x;updateSummons(1/60,p,w,()=>{},t+.6);assert.ok(Math.abs((s.x-x)-effective/60)<1e-6,`${name}/${scenario}: combat chase`);
 results.push({name,scenario,ownerSpeed,effective});
}
{
 const p=owner(),s={speed:450};p.actionState.sprinting=true;p.subclassHasteUntil=performance.now()/1000+100;
 assert.ok(getSummonMovementSpeed(s,p)>=450);p.actionState.sprinting=false;p.subclassHasteUntil=0;assert.equal(getSummonMovementSpeed(s,p),450);
 assert.equal(resolveSummonMovementSpeed(110,1),246);assert.equal(resolveSummonMovementSpeed(NaN,NaN,Infinity),246);
}
{
 const p=owner(),w=world(),id='gravecallerFuneralUrn';p.spiritAwakened=true;for(const skill of Object.values(p.skillState.skills))skill.level=20;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert.ok(selectAbilityMorph(p,id,'acolyte').ok);p.loadout.abilitySlots[0]=id;p.spirit=1000;
 const t=performance.now()/1000;w.enemies=[{id:'spirit-target',kind:'rat',x:800,y:320,hp:10000,maxHp:10000,radius:12}];
 assert.ok(useAbility(0,p,w,()=>{},t,{hasAim:true,combatAimX:1,combatAimY:0}));for(let i=1;i<=20;i++)updateCombat(p,w,{},.02,t+i*.02,()=>{});const s=getSubclassCombatState(p).spirits[0],x=s.x,y=s.y;
 p.actionState.sprinting=true;p.subclassHasteUntil=t+100;const speed=getSummonMovementSpeed({speed:s.a.spiritSpeed},p);updateCombat(p,w,{sprintHeld:true,moveX:1},1/60,t+.4+1/60,()=>{});
 assert.ok(Math.abs(Math.hypot(s.x-x,s.y-y)-speed/60)<1e-6,'Short-lived spirits use the owner-relative movement floor');
}
fs.mkdirSync('docs/lich-summons',{recursive:true});fs.writeFileSync('docs/lich-summons/movement-verification.json',JSON.stringify({pass:true,margin:'20% above owner, minimum 246 units/s',cases:results.length,results,shortLivedSpirits:true,authoredSpeedPreserved:true},null,2)+'\n');
console.log(`PASS: ${results.length} summon movement scenarios; following, combat chase, haste, sprint, dash, legacy actors, and summoned spirits.`);
