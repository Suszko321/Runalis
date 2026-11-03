import assert from 'node:assert/strict';
import {ABILITIES} from '../src/data.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {COMBAT_SKILL_IDS} from '../src/skills.js';
import {getAbilityMorphOptions} from '../src/abilityMorphSystem.js';
import {renderAbilityMorphChoices} from '../src/abilityMorphUi.js';
import {abilityTrainingLabel} from '../src/uiInformation.js';
import {abilityTraining} from '../src/trainingProfiles.js';
import {recordEnemyCombatContribution,grantSharedCombatKillXp} from '../src/combatProgression.js';

const actors = new Map();
let forms = 0;
for (const ability of ABILITIES) {
  const identity = ability.classId || 'oathkeeper';
  const key = identity + Boolean(ability.vampire);
  if (!actors.has(key)) {
    const player = createPlayer(key);
    chooseClass(player,identity);
    if (ability.vampire) player.bloodline = {id:'vampire'};
    actors.set(key,player);
  }
  const player = actors.get(key);
  const options = getAbilityMorphOptions(player,ability.id);
  const markup = renderAbilityMorphChoices(player,ability.id);
  assert.ok(options.length, ability.id);
  for (const form of options) {
    const weights = Object.entries(abilityTraining(form.ability));
    assert.ok(weights.length,ability.id + ' ' + form.id);
    for (const [id,weight] of weights) assert.ok(COMBAT_SKILL_IDS.includes(id) && weight>0,id);
    assert.ok(Math.abs(weights.reduce((sum,[,weight])=>sum+weight,0)-100)<1e-9);
    const label = abilityTrainingLabel(form.ability);
    assert.ok(label);
    if (options.length>1) assert.ok(markup.includes('Trains '+label),ability.id+' '+form.id);
    if (form.id!=='base') forms++;
  }
}
assert.ok(forms>8,'class and Vampire morphs covered');

const p = createPlayer('Hotbar Training');
chooseClass(p,'oathkeeper');
p.loadout.abilitySlots = ['wayfarerRay',null,null,null,'wayfarerSweep'];
const enemy = {x:p.x,y:p.y,hp:10,maxHp:10,xp:100};
recordEnemyCombatContribution(enemy,p,'blade',10,{source:'weapon',weaponType:'sword'});
p.loadout.abilitySlots = ['summonWolf',null,null,null,null];
grantSharedCombatKillXp(p,enemy,100);
const awards = p.lastCombatReward.awards;
for (const id of ['channeling','closeCombat','areaControl']) {
  assert.deepEqual(awards.find(a=>a.skillId===id)?.sources,['Hotbar']);
}
assert.ok(!awards.some(a=>a.skillId==='summoning'));
assert.ok(Math.abs(awards.reduce((sum,a)=>sum+a.amount,0)-100)<1e-9);
console.log('PASS '+ABILITIES.length+' abilities and '+forms+' morphs, valid training labels and fixed-budget equipped training.');
