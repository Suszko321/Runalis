import assert from 'node:assert/strict';
import {createPlayer, chooseClass, gainXp} from '../src/player.js';
import {addCombatXP, addPlayerSkillXP} from '../src/skills.js';
import {getAbilityMastery, grantAbilityMasteryXp} from '../src/abilityMasterySystem.js';
import {recordEnemyCombatContribution, grantSharedCombatKillXp} from '../src/combatProgression.js';
import {recordSupportContribution, recordDefensiveTraining} from '../src/encounterLedger.js';
import {offensiveBonusMultiplier} from '../src/combatPower.js';
import {armourHandling, weaponTraining} from '../src/trainingProfiles.js';
import {ITEMS} from '../src/data.js';
import {XP_CURVES, xpForLevels} from '../src/progressionMath.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';

const ray = 'wayfarerRay', aid = 'wayfarerAid', sweep = 'wayfarerSweep';
const hotbar = [ray, aid, sweep, 'summonWolf', 'block'];
function actor(slot) {
  const p = createPlayer('P' + slot);
  chooseClass(p, 'classless');
  Object.assign(p, {slot, x:260, y:320});
  p.loadout.abilitySlots = [...hotbar];
  return p;
}
const foe = () => ({name:'Target', x:290, y:320, hp:100, maxHp:100, xp:100});
function hit(enemy, player, id) {
  recordEnemyCombatContribution(enemy, player, 'blade', 40, id ? {sourceAbilityId:id} : {source:'weapon'});
}
function total(player, id) {
  const m = getAbilityMastery(player,id);
  return xpForLevels(1,m.level-1,XP_CURVES.mastery) + m.xp;
}
const awards = p => Object.fromEntries(p.lastCombatReward.awards.map(a => [a.skillId,a.amount]));
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-6, a + ' != ' + b);

const idle = actor(4), basic = foe();
addCombatXP(idle,100);
addPlayerSkillXP(idle,'warding',100);
gainXp(idle,'fishing',100);
for (const id of hotbar) close(total(idle,id),0);
hit(basic,idle);
grantSharedCombatKillXp(idle,basic,100);
for (const id of hotbar) close(total(idle,id),.4);

for (let finisher=0; finisher<4; finisher++) {
  const players = [1,2,3,4].map(actor);
  const [first, healer, tank, ranged] = players;
  const enemy = foe();
  hit(enemy,first,sweep);
  recordSupportContribution(healer,[enemy],aid,30);
  recordDefensiveTraining(enemy,tank,'block',25);
  hit(enemy,ranged,ray);
  const final = players[finisher];
  hit(enemy,final);
  grantSharedCombatKillXp(final,enemy,100);
  for (const p of players) {
    const reward = p===final ? 100 : 50;
    close(p.lastCombatReward.combatXP,reward);
    close(Object.values(awards(p)).reduce((a,b)=>a+b,0),reward);
    const used = new Map([[first,sweep],[healer,aid],[ranged,ray]]).get(p);
    for (const id of hotbar) close(total(p,id),reward*.02/5+(used===id?reward*.18:0));
  }
  assert(awards(tank).defence>0);
  const saved = JSON.stringify(players.map(p=>p.abilityMastery));
  grantSharedCombatKillXp(final,enemy,100);
  assert.equal(JSON.stringify(players.map(p=>p.abilityMastery)),saved);
}

const p = actor(1), e = foe();
hit(e,p,ray);
recordSupportContribution(p,[e],aid,10);
p.loadout.abilitySlots = ['summonDemon',null,null,null,null];
recordEnemyCombatContribution(e,p,'summoning',50,{source:'summon',sourceAbilityId:'summonDemon'});
grantSharedCombatKillXp(p,e,100);
close(total(p,ray),14.8);
close(total(p,aid),4);
close(total(p,sweep),.4);
close(total(p,'summonDemon'),0);
for (const flag of ['trainingDummy','friendly','rewardSuppressed','summonedByBoss','summonedBy']) {
  const enemy = {...foe(), [flag]:true};
  hit(enemy,p,ray);
  grantSharedCombatKillXp(p,enemy,100);
  close(total(p,ray),14.8);
}

const plate = Object.values(ITEMS).find(i=>i.type==='armour' && /plate/i.test(i.name));
const cloth = Object.values(ITEMS).find(i=>i.type==='armour' && /robe/i.test(i.name));
assert(plate && cloth);
const malformed = actor(1), malformedFoe = foe();
malformed.loadout.abilitySlots = ['thornLash','vineWhip',null,'invalid','block',ray];
hit(malformedFoe,malformed);
grantSharedCombatKillXp(malformed,malformedFoe,100);
close(total(malformed,'thornbinderThornLash'),1);
close(total(malformed,'block'),1);
close(total(malformed,ray),0);

const armoured = actor(1), training = foe();
armoured.equipment.chest = plate.id;
const heavy = armourHandling(armoured);
armoured.skillState.trainingPriority = 'spirit';
recordEnemyCombatContribution(training,armoured,'grimoire',50,{source:'weapon',weaponType:'grimoire'});
armoured.equipment.chest = cloth.id;
const light = armourHandling(armoured);
grantSharedCombatKillXp(armoured,training,100);
assert(heavy.protection>light.protection && heavy.dodgeCost>light.dodgeCost && heavy.channelCost>light.channelCost);
assert(awards(armoured).heavyArmour>0 && !awards(armoured).lightArmour);
assert(awards(armoured).grimoire>0 && awards(armoured).spirit>awards(armoured).focus);
assert(armoured.lastCombatReward.awards.some(a=>a.skillId==='spirit'&&a.sources.includes('Priority')));
assert(weaponTraining('warding','staff').spirit>0 && weaponTraining('spirit','spiritFocus').focus>0);
assert(weaponTraining('blunt','mace').defence>0 && weaponTraining('scythe','scythe').dexterity>0);
assert.equal(normalizeProfileSave(sanitizeForSave(armoured)).skillState.trainingPriority,'spirit');

for (const level of [10,25,47,75]) {
  const specialist = actor(1), target = {...foe(), xp:xpForLevels(1,level-1,XP_CURVES.combat)};
  hit(target,specialist,ray);
  grantSharedCombatKillXp(specialist,target,target.xp);
  assert.equal(specialist.skillState.combat.level,level);
  if (level===47) assert.equal(getAbilityMastery(specialist,ray).level,29);
  console.log('Combat Level',level,'single-ability Mastery',getAbilityMastery(specialist,ray).level);
}
const veteran = actor(1);
grantAbilityMasteryXp(veteran,ray,xpForLevels(1,69,XP_CURVES.mastery));
assert.equal(getAbilityMastery(normalizeProfileSave(sanitizeForSave(veteran)),ray).level,70);
close(offensiveBonusMultiplier(.1,.15),1.25);
assert(offensiveBonusMultiplier(.4,.4,.4)<1.65);
console.log('PASS four-player rewards, all five hotbar slots, fixed XP, contribution and passive mastery, gear snapshots, priority saves, legacy ranks and diminishing bonuses.');
