import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {RUNALIS_CLASSES,TEMPORARILY_UNAVAILABLE_CLASSES} from '../src/classData.js';
import {purchaseSkillScroll,readSkillScroll} from '../src/skillScrollSystem.js';
import {assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {grantSharedCombatKillXp} from '../src/combatProgression.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';

const ids = ['wayfarerSweep','wayfarerRay','wayfarerAid'];
const aim = {combatAimX:1,combatAimY:0,hasAim:true};
const world = () => ({mode:'dungeon',width:40,height:30,tiles:Array.from({length:30},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[]});
const enemy = (x,y) => ({kind:'rat',hp:1000,maxHp:1000,x,y,r:14,radius:14,combatLevel:10,xp:100,aggro:5});
const now = performance.now()/1000;
const classes = Object.keys(RUNALIS_CLASSES).filter(id=>!TEMPORARILY_UNAVAILABLE_CLASSES.includes(id));
for (const [index,classId] of classes.entries()) {
  const p = createPlayer(classId);
  chooseClass(p,classId);
  Object.assign(p,{gold:100,x:260,y:320,dirX:1,dirY:0,stamina:500,maxStamina:500,spirit:500,maxSpirit:500});
  for (const [slot,id] of ids.entries()) {
    const scroll = id+'Scroll';
    assert(purchaseSkillScroll(p,scroll).ok);
    assert(readSkillScroll(p,p.inventory.findIndex(e=>e.id===scroll)).ok,classId+' '+id);
    assert(assignAbilityToSlot(p,slot,id).ok);
  }
  const w = world(), a = enemy(290,320), b = enemy(300,330);
  w.enemies = [a,b];
  assert(useAbility(0,p,w,null,now,aim),classId+' sweep');
  assert(a.hp<1000 && b.hp<1000);
  grantSharedCombatKillXp(p,a,a.xp);
  assert(getAbilityMastery(p,ids[0]).xp>0);
  const target = enemy(310,320), behind = enemy(365,320);
  w.enemies = [target,behind];
  const spirit = p.spirit;
  assert(useAbility(1,p,w,null,now+1,aim),classId+' ray');
  for(let i=1;i<=45;i++)updateCombat(p,w,{...aim,ability1Held:true},1/60,now+1+i/60);
  assert(target.hp<1000 && behind.hp===1000,classId+' ray target');
  assert(p.spirit<spirit);
  updateCombat(p,w,aim,1/60,now+1.8);
  const casterSlot = index % 4;
  const party = Array.from({length:4},(_,i)=>i===casterSlot?p:createPlayer('ally'+i));
  for (const [slot, member] of party.entries()) Object.assign(member,{slot:slot+1,x:p.x+10,y:p.y,maxHp:100,hp:30});
  const host = party[0];
  host.coop={players:party.slice(1)};
  for (const member of party.slice(1)) member.questOwner = host;
  const healingTarget = {...enemy(p.x+25,p.y),combatTargetId:1,combatTargetKind:'player'};
  w.enemies = [healingTarget];
  p.spirit = p.maxSpirit = 500;
  assert(useAbility(2,p,w,console.log,now+2,aim),classId+' aid');
  for (const member of party) assert(member.hp>30 && member.hp<=100);
  grantSharedCombatKillXp(p,healingTarget,healingTarget.xp);
  assert(getAbilityMastery(p,ids[2]).xp>0);
}
console.log('PASS scroll purchase, learning, assignment, sweep, ray and party aid across '+classes.length+' classes.');
