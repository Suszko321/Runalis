// Small deterministic contracts plus explicit defect probes for the initial audit.
// Default: healthy contracts must pass; findings are reported, not blessed as correct.
// --strict additionally exits nonzero while a confirmed defect probe remains open.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ABILITIES,ITEMS} from '../src/data.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {useAbility,updateEnemies} from '../src/combat.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {startAbilityChannel,updateAbilityChannel} from '../src/abilityChannelSystem.js';
import {applyDefensiveDamage,ensureActionState} from '../src/combatActions.js';
import {getSkillTreeBonuses} from '../src/skillTreeSystem.js';
import {getItemSetId,ARMOUR_SETS} from '../src/setBonusSystem.js';
import {recordEnemyCombatContribution,grantSharedCombatKillXp} from '../src/combatProgression.js';
import {configureEncounterEnemy} from '../src/encounterData.js';
import {rebaseCooldownMap} from '../src/cooldownClock.js';
import {sanitizeForSave} from '../src/gameSave.js';

let clock=100;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const originalRandom=Math.random;Math.random=()=>.99;
const aim={combatAimX:1,combatAimY:0,hasAim:true,rightStickActive:true,rightStickAimX:1,rightStickAimY:0};
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
function actor(classId='oathkeeper'){
  const p=createPlayer('Foundation fixture');chooseClass(p,classId);p.id=`fixture-${classId}`;
  migratePlayer(p);Object.assign(p,{x:320,y:320,dirX:1,dirY:0,spiritAwakened:true,spirit:200,maxSpirit:200,stamina:200,maxStamina:200});
  return p;
}
const foe=(extra={})=>({id:'fixture-enemy',name:'Fixture enemy',kind:'rat',x:344,y:320,hp:1000,maxHp:1000,damage:10,dmg:10,r:12,radius:12,xp:100,level:1,aggro:3,...extra});
const report={contracts:[],findings:[],measurements:{}};
const test=(name,fn)=>{fn();report.contracts.push(name);console.log('PASS '+name);};
try {
test('catalogue has unique canonical ability IDs',()=>assert.equal(new Set(ABILITIES.map(a=>a.id)).size,ABILITIES.length));
test('assignment API moves a skill without leaving a duplicate',()=>{
  const p=actor();unlockActiveAbility(p,'oathkeeperLitanyOfIron');
  assert(assignAbilityToSlot(p,3,'oathkeeperLitanyOfIron').ok);
  assert.equal(p.loadout.abilitySlots.filter(id=>id==='oathkeeperLitanyOfIron').length,1);
  assert(useAbility(3,p,world(),()=>{},clock,aim));assert(p.activeChannel);
});
test('channel resource payments stay with their owner',()=>{
  const a=actor('gravecaller'),b=actor('gravecaller');a.coop={players:[b]};b.id='second-fixture';
  const ability=ABILITIES.find(a=>a.id==='gravecallerMurmuringHost');
  startAbilityChannel(a,ability,0,clock,{x:1,y:0});startAbilityChannel(b,ability,0,clock,{x:1,y:0});
  updateAbilityChannel(a,{ability0Held:true},.5,clock+.5);
  assert.equal(a.spirit,191);assert.equal(b.spirit,200);assert.equal(b.activeChannel.nextResourceAt,clock+.25);
});
test('session clock rebasing preserves remaining recovery',()=>{
  assert.deepEqual(rebaseCooldownMap({spell:98},100,3),{spell:1});
});
test('same fixed encounter seed retains its stats across player progression',()=>{
  const profile={id:'fixed-audit',levels:[5,9]},a=foe(),b=foe();
  configureEncounterEnemy(a,profile,'fixed',{rank:'ordinary'});
  const p=actor();p.skillState.combat.level=1000;migratePlayer(p);
  configureEncounterEnemy(b,profile,'fixed',{rank:'ordinary'});
  assert.deepEqual([a.level,a.maxHp,a.damage,a.xp],[b.level,b.maxHp,b.damage,b.xp]);
});
test('duplicate encounter reward callbacks cannot duplicate XP',()=>{
  const p=actor(),e=foe();recordEnemyCombatContribution(e,p,'blunt',10,{source:'weapon'});
  grantSharedCombatKillXp(p,e,100);const xp=p.skillState.combat.xp;
  grantSharedCombatKillXp(p,e,100);assert.equal(p.skillState.combat.xp,xp);assert(xp>0);
});
test('save serialization excludes active channel and charge objects',()=>{
  const p=actor();p.activeChannel={abilityId:'oathkeeperLitanyOfIron'};p.abilityCharge={active:true};
  const saved=sanitizeForSave(p);assert.equal(saved.activeChannel,undefined);assert.equal(saved.abilityCharge,undefined);
});

// Use a real weapon hit, not an isolated arithmetic replica.
{
  const p=actor(),w=world();p.equipment.weapon=Object.values(ITEMS).find(i=>i.legendaryPassive?.type==='lifestealDamage').id;
  migratePlayer(p);p.hp=20;const e=foe({hp:1,maxHp:1});w.enemies=[e];
  const before=p.hp;assert(requestBasicAttack(p,w,aim,()=>{},clock));
  for(let i=1;i<=120;i++){clock+=1/120;updateWeaponCombat(p,w,aim,1/120,clock,()=>{});}
  assert.equal(e.hp,0,'probe must actually land');
  const healing=p.hp-before;report.measurements.overkill={targetHealthLost:1,healing,weapon:p.equipment.weapon,classId:p.classId};
  if(healing>1)report.findings.push({id:'C01',name:'Legendary lifesteal heals from overkill damage',...report.measurements.overkill});
}
{
  const p=actor(),w=world();p.skillTree.spent.blade_living_bastion=1;
  assert.equal(getSkillTreeBonuses(p).blockReflectPct,8,'probe must have actual reflect');
  ensureActionState(p).blocking=true;const e=foe({hp:1,maxHp:1});w.enemies=[e];
  const before=p.skillState.combat.xp;applyDefensiveDamage(p,10,()=>{},e,w,clock);
  assert.equal(e.hp,0,'probe must actually kill');
  updateEnemies(1/60,p,w,()=>{},clock);
  const xp=p.skillState.combat.xp-before;
  report.measurements.reflection={targetHealthLost:1,combatXp:xp,deathHandled:!!e.deathHandled,contributors:Object.keys(e.combatContributors||{}).length};
  if(xp===0)report.findings.push({id:'C02',name:'Block reflection kill has no combat contribution or Combat XP',...report.measurements.reflection});
}
{
  const pieces=Object.values(ITEMS).filter(i=>getItemSetId(i)==='blackbow');
  const compatibleSlots=[...new Set(pieces.map(i=>i.slot))];
  const thresholds=Object.keys(ARMOUR_SETS.blackbow.bonuses).map(Number);
  const unreachable=thresholds.filter(n=>n>compatibleSlots.length);
  report.measurements.blackbow={items:pieces.map(i=>i.id),compatibleSlots,unreachable};
  if(unreachable.length)report.findings.push({id:'C03',name:'Blackbow set thresholds exceed compatible equipment slots',...report.measurements.blackbow});
}
{
  // Same ownership links installed by couchCoop.attachRuntimeOwner: only the
  // host owns coop.players; an ally points back through non-enumerable questOwner.
  const castFrom=slot=>{
    const host=actor('waverider'),ally=actor('waverider'),w=world();ally.id='support-ally';
    host.coop={enabled:true,players:[ally]};Object.defineProperty(ally,'questOwner',{value:host,enumerable:false});
    for(const p of [host,ally]){useAbility('block',p,w,()=>{},clock,aim);unlockActiveAbility(p,'hydromancerMendingCurrent',{autoAssignEmpty:false});p.hp=20;}
    const caster=slot===1?host:ally,logs=[];
    assert(useAbility('hydromancerMendingCurrent',caster,w,m=>logs.push(m),clock,aim),logs.join('; '));
    return {hostHealing:host.hp-20,allyHealing:ally.hp-20};
  };
  const hostCast=castFrom(1),allyCast=castFrom(2);report.measurements.partySupport={hostCast,allyCast};
  assert(hostCast.allyHealing>0&&allyCast.hostHealing>0,'C04 regression: either caster must heal the party');
  report.contracts.push('C04: host and ally party healing reach both owners');
}
// A controlled stale-fixture reproduction: direct duplicate slot mutation is
// normalized at first combat use. The production assignment API above passes.
{
  const p=actor(),w=world();unlockActiveAbility(p,'oathkeeperLitanyOfIron');p.loadout.abilitySlots[3]='oathkeeperLitanyOfIron';
  const messages=[];const used=useAbility(3,p,w,m=>messages.push(m),clock,aim);
  report.measurements.legacyFixture={used,messages,slots:p.loadout.abilitySlots};
}
} finally {Math.random=originalRandom;}
fs.mkdirSync('docs/combat-audit',{recursive:true});
fs.writeFileSync('docs/combat-audit/foundation-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--strict')&&report.findings.length)process.exitCode=1;
