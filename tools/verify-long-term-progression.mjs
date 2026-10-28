import assert from 'node:assert/strict';
import {XP_CURVES,xpRequired,xpForLevels,advanceProgression} from '../src/progressionMath.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {getAbilityMastery,grantAbilityMasteryXp} from '../src/abilityMasterySystem.js';
import {getCombatLevel,addCombatXP,addPlayerSkillXP,getTotalXPRequiredToReachLevel,getEstimatedLevelFromTotalXP} from '../src/skills.js';
import {getEarnedSkillTreePoints} from '../src/skillTreeSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {enemyXPForLevel} from '../src/enemyProgression.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-12),`${a} != ${b}`);
const baseline=(l,c)=>c.base+c.linear*l+c.quadratic*l*l;
for(const [id,c] of Object.entries(XP_CURVES)){
 for(let l=1;l<=10;l++)assert.equal(xpRequired(l,c),baseline(l,c),id+' preserves early pace');
 assert(xpRequired(11,c)<baseline(11,c)*1.001,'Ramp starts without a cost cliff');
 let last=0;
 for(let l=1;l<=200;l++){const next=xpRequired(l,c);assert(next>last);last=next;}
 for(const [start,count] of [[1,10],[1,20],[9,8],[10,1],[11,1],[12,15],[35,65],[90,20],[200,25]]){
  let sum=0;for(let l=start;l<start+count;l++)sum+=xpRequired(l,c);
  close(xpForLevels(start,count,c),sum);
  const entry={level:start,xp:0},budget=xpForLevels(start,count,c);
  advanceProgression(entry,budget,c);assert.equal(entry.level,start+count);close(entry.xp,0);
 }
 const ratio=xpRequired(106,c)/xpRequired(99,c);assert(Math.abs(ratio-2)<.04);
 const entry={level:1,xp:.25};advanceProgression(entry,1e15,c);
 assert(entry.level>100&&entry.level<500);assert(entry.xp>=0&&entry.xp<xpRequired(entry.level,c));
 close(xpForLevels(1,entry.level-1,c)+entry.xp,1e15+.25);
 for(const level of [1e6,1e12,Number.MAX_SAFE_INTEGER]){
  assert(Number.isFinite(xpRequired(level,c)));assert(Number.isFinite(xpForLevels(level,10,c)));
  const extreme={level,xp:0};advanceProgression(extreme,Number.MAX_VALUE,c);assert.equal(extreme.level,level);assert(Number.isFinite(extreme.xp));
 }
 assert.equal(xpForLevels(1,0,c),0);
 let effort=0;for(const l of [10,20,30,50,75,99]){const next=xpRequired(l,c)/enemyXPForLevel(l);assert(next>effort);effort=next;}
}
const p=createPlayer('Long-term progression');chooseClass(p,'waverider');
addCombatXP(p,xpForLevels(1,29,XP_CURVES.combat)+.5);assert.equal(getCombatLevel(p),30);
assert(getEarnedSkillTreePoints(p)>=29,'Every gained level still grants its point');
addPlayerSkillXP(p,'fishing',getTotalXPRequiredToReachLevel(35)+.25);assert.equal(p.skillState.skills.fishing.level,35);
const xp=getTotalXPRequiredToReachLevel(75)+10.25;const estimate=getEstimatedLevelFromTotalXP(xp);assert.equal(estimate.level,75);close(estimate.xpIntoLevel,10.25);
p.abilityMastery={};grantAbilityMasteryXp(p,'hydromancerWaterTorrent',xpForLevels(1,39,XP_CURVES.mastery)+83.5);assert.equal(getAbilityMastery(p,'hydromancerWaterTorrent').level,40);
const original={combat:{...p.skillState.combat},skill:{...p.skillState.skills.fishing},mastery:{...getAbilityMastery(p,'hydromancerWaterTorrent')},points:getEarnedSkillTreePoints(p)};
let loaded=p;for(let i=0;i<4;i++){
 loaded=normalizeProfileSave(sanitizeForSave(loaded));assert.deepEqual(loaded.skillState.combat,original.combat);assert.deepEqual(loaded.skillState.skills.fishing,original.skill);assert.deepEqual(getAbilityMastery(loaded,'hydromancerWaterTorrent'),original.mastery);assert.equal(getEarnedSkillTreePoints(loaded),original.points);
}
console.log('PASS early levels unchanged, smooth increasing costs, seven-level doubling, closed-form totals, exact level awards, numeric extremes, skill points, mastery and repeated save/load.');
console.table([10,20,30,50,75,99].map(level=>({level,playerOld:baseline(level,XP_CURVES.combat),playerNew:Math.round(xpRequired(level,XP_CURVES.combat)),masteryOld:baseline(level,XP_CURVES.mastery),masteryNew:Math.round(xpRequired(level,XP_CURVES.mastery)),ordinaryVictories:Math.ceil(xpRequired(level,XP_CURVES.combat)/enemyXPForLevel(level))})));

