import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {addCombatXP} from '../src/skills.js';
import {XP_CURVES,xpRequired,xpForLevels} from '../src/progressionMath.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {getEarnedSkillTreePoints,getAvailableSkillTreePoints,getSpentSkillTreePoints,normalizeSkillTreeState,spendSkillTreeNode,respecSkillTree,CLASS_SKILL_TREE_LOCKS} from '../src/skillTreeSystem.js';
import {recordEnemyCombatContribution,grantSharedCombatKillXp} from '../src/combatProgression.js';

const classes=['classless','oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch'];
for(const id of classes){
 const p=createPlayer('Level test');assert(chooseClass(p,id));normalizeSkillTreeState(p);
 const initial=getEarnedSkillTreePoints(p);
 for(let level=1;level<12;level++){
  const before=getAvailableSkillTreePoints(p);
  const xp=xpRequired(level,XP_CURVES.combat)-p.skillState.combat.xp;
  const result=addCombatXP(p,xp);
  assert.equal(result.newLevel,level+1);
  assert.equal(getEarnedSkillTreePoints(p),initial+level,`${id}: every level grants a point`);
  assert.equal(getAvailableSkillTreePoints(p),before+1,`${id}: new point is spendable`);
 }
 const before=getAvailableSkillTreePoints(p);
 assert.equal(addCombatXP(p,xpForLevels(12,7,XP_CURVES.combat)).levelsGained,7);
 assert.equal(getAvailableSkillTreePoints(p),before+7,`${id}: multi-level XP counts every level`);
 // Simulate an existing level-five profile using the old point schedule.
 p.skillState.combat={level:5,xp:0};p.combatLevel=1;
 const expected=initial+4,spent=getSpentSkillTreePoints(p);
 let loaded=normalizeProfileSave(JSON.parse(JSON.stringify(p)));
 for(let i=0;i<5;i++){
  assert.equal(getEarnedSkillTreePoints(loaded),expected,`${id}: saved level restores entitlement`);
  assert.equal(getAvailableSkillTreePoints(loaded),Math.max(0,expected-spent));
  loaded=normalizeProfileSave(JSON.parse(JSON.stringify(loaded)));
 }
 if(id!=='classless'){
  const root=CLASS_SKILL_TREE_LOCKS[id]+'_root';
  if(!getSpentSkillTreePoints(loaded))assert(spendSkillTreeNode(loaded,root).ok);
  loaded.gold=10;assert(respecSkillTree(loaded).ok);
  assert.equal(getAvailableSkillTreePoints(loaded),expected,'Respec refunds purchases without extra level points');
  assert(spendSkillTreeNode(loaded,root).ok);
  assert.equal(getAvailableSkillTreePoints(loaded),expected-1,'Point can purchase a real node');
 }
}
// The shared encounter path grants each qualifying player their own level points.
const party=[createPlayer('P1'),createPlayer('P2')];
party.forEach((p,i)=>{p.slot=i+1;p.playerNumber=i+1;chooseClass(p,'thornbinder');normalizeSkillTreeState(p);});
const enemy={id:'level-reward-test',name:'Reward test',x:party[0].x,y:party[0].y,hp:0,maxHp:100};
party.forEach(p=>recordEnemyCombatContribution(enemy,p,'blade',50,{source:'weapon',weaponType:'sword'}));
const initial=party.map(getEarnedSkillTreePoints);
grantSharedCombatKillXp(party[0],enemy,500);
party.forEach((p,i)=>assert.ok(getEarnedSkillTreePoints(p)>=initial[i]+p.combatLevel-1,'Co-op participant receives every level point'));
const balances=party.map(getEarnedSkillTreePoints);
grantSharedCombatKillXp(party[0],enemy,500);
assert.deepEqual(party.map(getEarnedSkillTreePoints),balances,'Duplicate death reward cannot grant again');
console.log('PASS all eight classes: every level, multi-level XP, existing level-five saves, repeated reload, spending/respec and shared combat rewards.');
